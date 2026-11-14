'use strict';
const CACHE='roam-tank-lab-v1-2.2.23';
const SHELL=['./','./index.html','./app.js','./data.js','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('roam-tank-lab-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const url=new URL(r.url);if(r.mode==='navigate'){e.respondWith(fetch(r).then(resp=>{if(resp.ok){const clone=resp.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put('./index.html',clone)).catch(()=>{}));}return resp;}).catch(()=>caches.match('./index.html')));return;}if(url.origin===self.location.origin)e.respondWith(caches.match(r).then(hit=>hit||fetch(r)));});
