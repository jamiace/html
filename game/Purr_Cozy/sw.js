/* Purr Cozy: fresh code online; exact build files remain available offline. */
const buildReady=fetch(new URL('version.json',self.registration.scope),{cache:'no-store'}).catch(async()=>{const cached=await caches.match(new URL('version.json',self.registration.scope),{ignoreSearch:true});if(!cached)throw Error('version unavailable offline');return cached;}).then(r=>{if(!r.ok)throw Error('version');return r.json();}).then(j=>'purr-cozy-web-'+j.version);
const codeRequest=url=>/\.(?:html|js|css|webmanifest)$/.test(url.pathname)||url.pathname.endsWith('/')||url.pathname.endsWith('/version.json');
self.addEventListener('install',e=>{self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim());});
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',e=>{
  const req=e.request,url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==location.origin||!url.href.startsWith(self.registration.scope)||url.pathname.includes('/music/'))return;
  const request=codeRequest(url)?new Request(req,{cache:'no-store'}):req;
  e.respondWith(fetch(request).then(async response=>{
    if(response.ok){const cache=await caches.open(await buildReady);cache.put(req,response.clone()).catch(()=>{});}
    return response;
  }).catch(async()=>{
    const cache=await caches.open(VERSION);
    const exact=await cache.match(req);
    if(exact)return exact;
    if(req.mode==='navigate')return await cache.match(new URL('index.html',self.registration.scope).href)||Response.error();
    return Response.error();
  }));
});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:'window'}).then(cs=>cs.length?cs[0].focus():self.clients.openWindow('./')));});
