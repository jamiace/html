/* No release version is duplicated here. version.json owns the build identity. */
self.addEventListener('install',e=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url),base=new URL('./',self.registration.scope);if(r.method!=='GET'||u.origin!==location.origin||!u.href.startsWith(base.href))return;
 const relative=u.pathname.slice(base.pathname.length),shell=['','index.html','version.json','js/bootstrap.js','js/asset-cache.js','js/purr-boot.js'];
 if(shell.includes(relative)){e.respondWith(fetch(new Request(r,{cache:'no-store'})).catch(async()=>{const c=await caches.open('purr-shell-v2');return await c.match(new URL(relative||'index.html',base))||Response.error()}));return}
 e.respondWith((async()=>{try{const idx=await caches.open('purr-index-v2'),active=await idx.match(new URL('.purr-active-build',base));if(active){const b=await active.json(),res=await idx.match(new URL(b.resources.manifest,base).href+'?sha='+b.resources.sha256);if(res){const m=await res.json(),entry=m.files.find(f=>f.path===relative);if(entry){const c=await caches.open('purr-content-v2'),hit=await c.match(new URL('.purr-content/'+entry.sha256,base));if(hit)return hit}}}}catch{}return fetch(r)})())
});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:'window'}).then(cs=>cs.length?cs[0].focus():self.clients.openWindow('./')))});
