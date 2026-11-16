const CACHE='wedding-planner-v18-direct-home-20261116';
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
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 if(req.mode==='navigate'){
  // Show the cached application shell immediately; refresh it silently for the next launch.
  event.respondWith((async()=>{
   const cache=await caches.open(CACHE);
   const cached=await cache.match('./index.html');
   const network=fetch(req).then(async response=>{
    if(response.ok)await cache.put('./index.html',response.clone()).catch(()=>{});
    return response;
   }).catch(()=>null);
   if(cached){event.waitUntil(network);return cached}
   return (await network)||Response.error();
  })());
  return;
 }
 event.respondWith(fetch(req).then(response=>{
  if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,copy)))}
  return response;
 }).catch(()=>caches.match(req)));
});