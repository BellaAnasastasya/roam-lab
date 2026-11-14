'use strict';
const DATA=window.ROAM_DATA;
const heroMap=new Map(DATA.heroes.map(h=>[h.name,h]));
const state={hero:'Belerick',enemy:[],ally:[]};
const $=x=>document.getElementById(x);
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=s=>s.toLowerCase().replace(/[.'’]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const heroImages=n=>[
 `https://raw.githubusercontent.com/Ceplin03/database-mlbb.Mobile-Legends-Bang-Bang/master/images-hero/${({'Chang\'e':'chang27e','Lapu-Lapu':'lapu-lapu','Yi Sun-shin':'yi_sun-shin'}[n]||slug(n).replaceAll('-','_'))}.png`,
 `https://mlbbhub.com/images/heroes/${slug(n)}.png`
];
function avatar(name,urls,extra=''){
 const encoded=encodeURIComponent(JSON.stringify(urls));
 return `<span class="avatar ${extra}">${safe(name.slice(0,2).toUpperCase())}<img src="${safe(urls[0])}" alt="" data-urls="${safe(encoded)}" data-next="1" onerror="tryNext(this)" loading="lazy"></span>`;
}
window.tryNext=img=>{
 try{const u=JSON.parse(decodeURIComponent(img.dataset.urls));const n=+img.dataset.next;if(n<u.length){img.dataset.next=String(n+1);img.src=u[n];}else{img.onerror=null;img.remove();}}catch{img.remove();}
};
function renderTeam(t){
 const names=state[t],max=t==='enemy'?5:4;
 $(t+'Count').textContent=`${names.length}/${max}`;
 $(t+'Slots').innerHTML=Array.from({length:max},(_,i)=>{
 const n=names[i];return n?`<button type="button" class="slot set" data-idx="${i}" title="Hapus ${safe(n)}">${avatar(n,heroImages(n))}<small>${safe(n)}</small><span class="remove">×</span></button>`:`<span class="slot">+</span>`;
 }).join('');
 $(t+'Slots').querySelectorAll('button').forEach(b=>b.onclick=()=>{names.splice(+b.dataset.idx,1);renderAll();});
 const inp=$(t+'Search');inp.style.display=names.length>=max?'none':'';
 const q=inp.value.trim().toLowerCase();
 const available=DATA.heroes.filter(h=>h.name!==state.hero&&!state.enemy.includes(h.name)&&!state.ally.includes(h.name));
 const matches=q?available.filter(h=>h.name.toLowerCase().includes(q)).sort((a,b)=>a.name.localeCompare(b.name)).slice(0,14):[];
 const area=$(t+'Matches');area.innerHTML=matches.map(h=>`<button class="match" data-name="${safe(h.name)}">${avatar(h.name,heroImages(h.name))}<span>${safe(h.name)}</span></button>`).join('');
 area.querySelectorAll('button').forEach(b=>b.onclick=()=>{names.push(b.dataset.name);inp.value='';renderAll();});
}
function currentHero(){return state.hero;}
const add=(o,k,v)=>o[k]=(o[k]||0)+v;
function signal(team){
 const sig={heal:0,regen:0,vamp:0,shield:0,basic:0,attackSpeed:0,skillPhysical:0,magicBurst:0,magicDot:0,dive:0,hardCC:0,engage:0,antiEngage:0,tank:0,front:0};
 for(const n of team){
  const h=heroMap.get(n);if(!h)continue;
  const m=DATA.mechanics[n]||{};
  for(const [k,v] of Object.entries(m))if(k in sig)add(sig,k,v);
  sig.tank+=(h.traits.T||0);sig.front+=(h.traits.F||0);
 }
 return sig;
}
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
function analyze(){
 const en=signal(state.enemy),al=signal(state.ally),isBel=currentHero()==='Belerick';
 const healNeed=en.heal*1.8+en.regen*.95+en.vamp*1.2;
 const basicThreat=en.basic+en.attackSpeed*.55;
 const physicalThreat=en.skillPhysical+en.basic*.48;
 const magicalThreat=en.magicBurst+en.magicDot*.85;
 const burstMagic=en.magicBurst;
 const dotMagic=en.magicDot;
 const allyProtection=al.tank*.45+al.front*.2+al.hardCC*.22;
 const engageRisk=Math.max(0,en.hardCC*.6+en.engage*.75+en.dive*.4-allyProtection*.15);
 const tankPressure=en.tank*.8+en.front*.25;
 const score={
  dominance:17+healNeed*7+en.attackSpeed*3+(healNeed>=4?20:0),
  antique:18+en.skillPhysical*6.5+(en.skillPhysical>=5?15:0),
  blade:(isBel?38:18)+basicThreat*(isBel?7.5:5)+(isBel&&basicThreat>=4?10:0)-(isBel&&basicThreat<2&&magicalThreat>physicalThreat?25:0),
  athena:16+burstMagic*8+(burstMagic>=5?13:0),
  radiant:15+dotMagic*8+(dotMagic>=5?13:0),
  immortality:isBel?30:44,
  guardian:isBel?42+tankPressure*2:12,
  oracle:isBel?29:14,
  thunder:isBel?36:22,
  brute:isBel?17:24+engageRisk*2,
  cursed:isBel?18:10,
  chastise:10+en.attackSpeed*5, // reduced attack-speed suppression efficacy in patch 2.2.23
  queen:8
 };
 // One boot + five distinct defensive items. Do not over-pick physical armor into predominantly magic comps.
 const boots=(en.hardCC>=4||magicalThreat>physicalThreat*1.12)?'tough':'warrior';
 const reasons=[];
 const hardHeal=healNeed>=4;
 const hardBasic=basicThreat>=4;
 const hardPhys=en.skillPhysical>=4;
 const hardBurst=burstMagic>=3;
 const hardDot=dotMagic>=3;
 const locked=[];
 // High urgency counters are guaranteed when signals are strong, within five available slots.
 const essentials=[
  [hardHeal,'dominance',healNeed],
  [hardPhys,'antique',en.skillPhysical],
  [hardBurst,'athena',burstMagic],
  [hardDot,'radiant',dotMagic],
  [hardBasic,'blade',basicThreat]
 ].filter(a=>a[0]).sort((a,b)=>b[2]-a[2]);
 for(const [,id] of essentials)if(locked.length<4&&!locked.includes(id))locked.push(id);
 const core=isBel?(basicThreat>=2||physicalThreat>=magicalThreat*.55?'blade':'guardian'):'immortality';
 // Keep individual hero identity, except when excessively counter-heavy.
 if(!locked.includes(core)&&locked.length<5)locked.push(core);
 // Guarantee magic protection on clearly magic-heavy drafts, physical on physical-heavy drafts.
 if(magicalThreat>=5&&!locked.some(id=>id==='athena'||id==='radiant')&&locked.length<5)locked.push(burstMagic>=dotMagic?'athena':'radiant');
 if(physicalThreat>=5&&!locked.some(id=>['antique','blade'].includes(id))&&locked.length<5)locked.push(en.skillPhysical>=en.basic?'antique':'blade');
 const sorted=Object.keys(score).sort((a,b)=>score[b]-score[a]||a.localeCompare(b));
 for(const id of sorted)if(locked.length<5&&!locked.includes(id))locked.push(id);
 // Arrange purchases by early counter urgency, then item score; Tigreal reserves late Immortality when possible.
 const weighted=id=>score[id]+(id==='dominance'&&hardHeal?22:0)+(id==='antique'&&hardPhys?15:0)+(id==='athena'&&hardBurst?14:0)+(id==='radiant'&&hardDot?14:0);
 const flex=locked.sort((a,b)=>weighted(b)-weighted(a));
 if(!isBel&&flex.includes('immortality')&&flex.length>1){flex.splice(flex.indexOf('immortality'),1);flex.push('immortality');}
 const order=[boots,...flex];
 const spell=isBel?'Vengeance':'Flicker';
 const blessing=isBel?(basicThreat+en.engage>=7?'Encourage':'Conceal'):'Conceal';
 const emblem=isBel?['Tank Emblem','Vitality','Tenacity','Concussive Blast (opsi umum)']:['Tank Emblem','Vitality','Tenacity','Brave Smite (sustain saat CC)'];
 const tips=isBel?[
  'Belerick: manfaatkan HP dan durability untuk memancing basic attack, memicu Deadly Thorns. Blade Armor membantu menghadapi marksman, tapi jangan dipaksa saat mayoritas ancaman magic.',
  'Ancient Seed serta ultimate dipakai untuk taunt/paksa posisi lawan. Vengeance aktif ketika benar-benar menerima damage, bukan hanya saat masuk semak.',
  'Jangan mengejar marksman jarak jauh sendirian: serangan pasif Belerick memiliki batas jangkauan.'
 ]:[
  'Tigreal: prioritaskan posisi dan jarak follow-up teman. Flicker + Implosion cocok untuk mengejutkan backline; jangan buka war ketika damage dealer tim masih jauh.',
  'Sacred Hammer dapat mendorong target lalu diikuti knockup. Arah dorongan penting: jangan sampai justru menyelamatkan musuh.',
  'Waspadai Diggie, Purify dan CC yang memotong awal channel Implosion. Tunggu cooldown anti-engage lawan sebelum all-in.'
 ];
 return {order,spell,blessing,emblem,score,en,al,signals:{healNeed,basicThreat,physicalThreat,magicalThreat,burstMagic,dotMagic,engageRisk,tankPressure},tips};
}
function itemReason(id,a){
 const e=a.en,s=a.signals;
 const why={
  tough:'Tahan tekanan magic/CC agar tetap hidup saat menjaga vision dan buka war.',warrior:'Physical defense awal lebih relevan terhadap komposisi musuh.',
  dominance:`Tekanan heal/regen/vamp ${s.healNeed.toFixed(1)}; aura antiheal membantu saat berada dekat musuh.`,
  antique:`Ancaman physical skill ${e.skillPhysical}; pasifnya cocok melawan damage dari skill fisik.`,
  blade:`Tekanan basic attack ${s.basicThreat.toFixed(1)}; memantulkan serangan, sangat selaras dengan Belerick.`,
  athena:`Magic burst ${s.burstMagic}; mitigasi untuk kombo magic besar dalam waktu singkat.`,
  radiant:`Magic berulang ${s.dotMagic}; lebih relevan untuk damage magic beruntun daripada burst tunggal.`,
  immortality:'Second life memberi peluang tim menyambung setup saat inisiasi berisiko.',
  guardian:'Menambah HP dan regen, membantu Belerick menyerap damage dan melakukan reset fight.',
  oracle:'Memperkuat pemulihan/shield yang diterima, bagus pada pertarungan berkepanjangan.',
  thunder:'Kontrol jarak dekat dan akumulasi defense dari pertarungan.',
  brute:'Mobilitas dan ketahanan untuk bergerak di depan tim.',
  cursed:'Tambahan burn area saat bertahan di tengah lawan.',
  chastise:'Menekan basic attack, tetapi kekuatannya terhadap attack speed dikurangi di patch ini.',
  queen:'Mitigasi saat HP turun, bersifat situasional.'
 };return why[id]||DATA.items[id]?.why||'';
}
function drawResult(){
 const r=$('result');if(!state.enemy.length&&!state.ally.length){r.innerHTML='<div class="fine">Isi hero musuh/teman untuk memulai analisis. Build kosong akan memakai profil dasar.</div>';return;}
 const a=analyze(),isBel=currentHero()==='Belerick';
 const cards=a.order.map((id,i)=>{const itm=DATA.items[id];return `<div class="item ${i===0||(isBel&&id==='blade')||(!isBel&&id==='immortality')?'core':''}"><span class="n">${i+1}</span>${avatar(itm.name,[itm.img,`https://mlbbhub.com/images/items/${id==='tough'?'tough-boots':id==='warrior'?'warrior-boots':id.replaceAll('_','-')}.png`])}<b>${safe(itm.name)}</b><small>${safe(itm.desc)}</small></div>`;}).join('');
 const s=a.signals;
 const priorities=[['Antiheal',s.healNeed],['Basic attack',s.basicThreat],['Skill physical',a.en.skillPhysical],['Magic burst',s.burstMagic],['Magic berulang',s.dotMagic],['Hard CC',a.en.hardCC]].filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,4);
 r.innerHTML=`<h2>🧱 Build ${state.hero} — Roam Tank</h2><div class="fine">${isBel?'Prioritas: refleksi serangan • HP • taunt • bertahan lama':'Prioritas: setup • inisiasi aman • CC • survive setelah masuk'}</div><div class="itemgrid">${cards}</div><div class="chips"><span class="chip">Spell: ${a.spell}</span><span class="chip">Roam: ${a.blessing}</span><span class="chip">Tank Emblem</span></div><div class="line"><b>Emblem:</b> ${a.emblem.slice(1).join(' · ')}<br><b>Ancaman utama:</b> ${priorities.length?priorities.map(p=>`${p[0]} ${p[1].toFixed(1)}`).join(' · '):'belum ada sinyal besar'}</div><h2>Kenapa item ini?</h2>${a.order.map((id,i)=>`<div class="why"><strong>${i+1}. ${safe(DATA.items[id].name)}</strong><br>${safe(itemReason(id,a))}</div>`).join('')}<details><summary>💡 Cara memainkan ${state.hero}</summary>${a.tips.map(t=>`<p class="fine">${safe(t)}</p>`).join('')}</details><details><summary>🔍 Profil musuh terpilih & asumsi analisis</summary><p class="fine">Skor dihitung dari kit hero & trait draft, bukan dari item atau emblem yang sedang dibeli lawan. Nilai adalah bobot internal (bukan persentase win rate).</p>${state.enemy.map(n=>{const h=heroMap.get(n),m=DATA.mechanics[n]||{};return `<div class="why"><b>${safe(n)}</b><br><span class="muted">${safe(h.kit)}</span><br><span class="fine">${safe(Object.entries(m).map(([k,v])=>`${k}: ${v}`).join(' · '))}</span></div>`;}).join('')}</details>`;
}
function renderAll(){
 ['enemy','ally'].forEach(renderTeam);
 for(const name of ['Belerick','Tigreal']){const active=state.hero===name;$('pick'+name).classList.toggle('active',active);$('pick'+name).setAttribute('aria-pressed',String(active));}
 $('heroInfo').textContent=state.hero==='Belerick'?'Belerick: Deadly Thorns dari damage yang diterima, taunt S1/ultimate, Vengeance untuk adu badan.':'Tigreal: Fearless meredam basic attack, Sacred Hammer mendorong + knockup, Implosion menarik + stun. Flicker untuk setup.';
 drawResult();
}
for(const t of ['enemy','ally'])$(t+'Search').addEventListener('input',()=>renderTeam(t));
for(const n of ['Belerick','Tigreal'])$('pick'+n).onclick=()=>{state.hero=n;state.enemy=state.enemy.filter(x=>x!==n);state.ally=state.ally.filter(x=>x!==n);renderAll();};
$('buildBtn').onclick=drawResult;
$('resetBtn').onclick=()=>{state.enemy=[];state.ally=[];$('enemySearch').value='';$('allySearch').value='';renderAll();};
// Portrait optional. Hero/item initials remain if external image hosts are unavailable.
for(const n of ['Belerick','Tigreal'])$('face'+n).innerHTML=avatar(n,heroImages(n));
renderAll();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
