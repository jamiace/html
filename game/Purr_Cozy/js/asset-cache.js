/* A verified build is committed only after every listed local resource is available. */
window.PurrAssets={
 base:new URL('./',location.href), entries:new Map(), images:new Map(), masks:new Map(), urls:new Map(), stats:{downloaded:0,reused:0,bytes:0,recovered:0},
 async network(url){const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),90000);try{const r=await fetch(url,{cache:'no-store',signal:ctrl.signal});if(!r.ok)throw Error(PurrBoot.text('bootResourceHTTP',[r.status]));return await r.arrayBuffer()}finally{clearTimeout(timer)}},
 async prepare(build){
  if(!isSecureContext||!window.caches)throw Error(PurrBoot.text('bootResourceSecure'));
  this.cache=await caches.open('purr-content-v2');this.index=await caches.open('purr-index-v2');
  const manifestURL=new URL(build.resources.manifest,this.base);manifestURL.searchParams.set('v',build.version);
  let data;try{data=await this.network(manifestURL)}catch(error){const hit=await this.index.match(manifestURL);if(!hit)throw error;data=await hit.arrayBuffer()}const manifest=JSON.parse(new TextDecoder().decode(data));
  if(manifest.version!==build.version)throw Error(PurrBoot.text('bootResourceVersion'));
  let complete=0,at=0;const files=manifest.files;
  await Promise.all(Array.from({length:12},async()=>{while(at<files.length){const e=files[at++];
   e.key=new URL('.purr-files/'+build.version+'/'+e.path,this.base).href;this.entries.set(new URL(e.path,this.base).href,e);
   const url=new URL(e.path,this.base);url.searchParams.set('purrVersion',build.version);
   let res;try{res=new Response(await this.network(url),{headers:{'Content-Type':e.mime}});await this.cache.put(e.key,res.clone());this.stats.downloaded++}
   catch(error){res=await this.cache.match(e.key);if(!res)throw error;this.stats.reused++}
   complete++;PurrBoot.set('pixel',.9*complete/files.length);PurrBoot.message(PurrBoot.text('bootResourceProgress',[Math.floor(complete/files.length*100)]));
  }}));
  const nativeFetch=window.fetch.bind(window);this.nativeFetch=nativeFetch;
  window.fetch=async(input,opts)=>{const u=new URL(input instanceof Request?input.url:input,this.base);u.search='';const e=this.entries.get(u.href);if(e&&(!opts?.method||opts.method==='GET')&&(!(input instanceof Request)||input.method==='GET')){const res=await this.cache.match(e.key);if(!res)throw Error(PurrBoot.text('bootResourceMissing',[e.path]));return res}return nativeFetch(input,opts)};
  this.catalog=await (await fetch('assets/png/catalog.json')).json();
  await this.index.put(manifestURL,new Response(data));this.pendingBuild=build;
 },
 async commit(){const build=this.pendingBuild;if(!build)return;
  await this.index.put(new URL('.purr-active-build',this.base),new Response(JSON.stringify(build)));localStorage.setItem('purr-cozy.cached-build',JSON.stringify(build));
  // Offline shell is stored only after the resource transaction has completed.
  const shell=await caches.open('purr-shell-v2');for(const name of ['index.html','js/bootstrap.js','js/asset-cache.js','js/purr-boot.js']){const e=this.entries.get(new URL(name,this.base).href);if(e)await shell.put(new URL(name,this.base),await this.cache.match(e.key))}await shell.put(new URL('version.json',this.base),new Response(JSON.stringify(build),{headers:{'Content-Type':'application/json'}}));
  this.pendingBuild=null;
 },
 async blob(path){const u=new URL(path,this.base);u.search='';const e=this.entries.get(u.href);if(!e)throw Error(PurrBoot.text('bootResourceUnlisted',[path]));const r=await this.cache.match(e.key);if(!r)throw Error(PurrBoot.text('bootResourceMissing',[path]));return r.blob()},
 async url(path){if(!this.urls.has(path))this.urls.set(path,URL.createObjectURL(await this.blob(path)));return this.urls.get(path)},
 async image(path){if(!this.images.has(path)){const im=new Image();im.src=await this.url(path);await im.decode();this.images.set(path,im)}return this.images.get(path)},
 async decode(){const paths=[...this.entries.values()].map(e=>e.path).filter(p=>p.endsWith('.png')&&!/^assets\/png\/(avatar\/body|avatars|atlases)\//.test(p));let i=0;for(const path of paths){const im=await this.image(path);if(path.startsWith('assets/png/masks/')){const cv=document.createElement('canvas');cv.width=im.naturalWidth;cv.height=im.naturalHeight;const x=cv.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0);const d=x.getImageData(0,0,cv.width,cv.height).data,a=new Uint16Array(cv.width*cv.height);for(let j=0;j<a.length;j++)a[j]=d[j*4+3]?d[j*4]*256+d[j*4+1]:0;this.masks.set(path,{width:cv.width,height:cv.height,data:a});this.images.delete(path);URL.revokeObjectURL(this.urls.get(path));this.urls.delete(path)}i++;if(i%30===0){PurrBoot.set('pixel',.9+.1*i/paths.length);await new Promise(requestAnimationFrame)}}PurrBoot.set('pixel',1)}
};
PurrAssets.cssURLs=new Map();
PurrAssets.css=async function(path){if(this.cssURLs.has(path))return this.cssURLs.get(path);let text=await (await this.blob(path)).text();const parts=[...text.matchAll(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g)];for(const m of parts){const raw=m[2];if(/^(?:data:|https?:|blob:|#)/.test(raw))continue;const u=new URL(raw,new URL(path,this.base));const rel=decodeURIComponent(u.pathname.slice(this.base.pathname.length));const target=rel.endsWith('.css')?await this.css(rel):await this.url(rel);text=text.split(m[0]).join('url("'+target+'")')}const url=URL.createObjectURL(new Blob([text],{type:'text/css'}));this.cssURLs.set(path,url);return url};
PurrAssets.cachedURL=function(value){try{const u=new URL(value,this.base);if(u.origin!==this.base.origin)return value;const path=decodeURIComponent(u.pathname.slice(this.base.pathname.length));return this.urls.get(path)||value}catch{return value}};
