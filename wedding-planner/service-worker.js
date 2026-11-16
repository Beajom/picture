const CACHE='wedding-planner-v17-chrome-pink-20261116';
const CORE=['./','./index.html','./wedding-cloud.js','./manifest.webmanifest?v=pink-20261116','./icon.svg','./icon-pink.svg?v=pink-20261116'];
const ICONS=['./icon-heart-192.png?v=pink-20261116','./icon-heart-512.png?v=pink-20261116'];
self.addEventListener('install',event=>{
 event.waitUntil(
  caches.open(CACHE).then(async cache=>{
   await cache.addAll(CORE);
   await Promise.all(ICONS.map(url=>cache.add(url).catch(()=>{})));
  }).then(()=>self.skipWaiting())
 );
});
self.addEventListener('activate',event=>{
 event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('wedding-planner-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())
 );
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 event.respondWith(fetch(request).then(response=>{
  if(response.ok){const clone=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,clone)))}
  return response;
 }).catch(async()=>await caches.match(request)||(request.mode==='navigate'?await caches.match('./index.html'):Response.error())));
});
