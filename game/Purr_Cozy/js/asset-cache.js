/* A verified build is committed only after every listed local resource is available. */
window.PurrAssets={
 schema:4,
 base:new URL('./',location.href), entries:new Map(), images:new Map(), masks:new Map(), urls:new Map(), stats:{downloaded:0,reused:0,bytes:0,recovered:0},
 crc32(bytes){let c=0xffffffff;for(const b of new Uint8Array(bytes)){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}return ((c^0xffffffff)>>>0).toString(16).padStart(8,'0')},
 canonical(e,bytes){if(!e.text)return bytes;const src=new Uint8Array(bytes),out=new Uint8Array(src.length);let n=0;for(let i=0;i<src.length;i++){if(src[i]===13&&src[i+1]===10)continue;out[n++]=src[i]}return out.slice(0,n).buffer},
 /* 0.93.6: GitHub Pages answers HTTP 429 when a whole class loads from one school IP. Waits follow Retry-After (or grow
    with random jitter so 30 computers do not retry in step), and files that are named by their CRC (manifest, packs) can
    also come from the jsDelivr copy of the same GitHub repo. Every byte is still checked against its CRC32 afterwards. */
 mirror(url){try{const u=new URL(url,this.base),m=/^([a-z0-9-]+)\.github\.io$/i.exec(u.hostname),p=u.pathname.split('/').filter(Boolean);if(!m||u.origin!==this.base.origin||p.length<2)return null;return 'https://cdn.jsdelivr.net/gh/'+m[1]+'/'+p[0]+'@main/'+p.slice(1).join('/')}catch{return null}},
 async network(url,ms=15000,alt=null){const sleep=t=>new Promise(r=>setTimeout(r,t)),get=async u=>{const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),ms);try{const r=await fetch(u,{cache:'no-store',signal:ctrl.signal});if(!r.ok){const ra=Number(r.headers.get('Retry-After'));throw Object.assign(Error(PurrBoot.text('bootResourceHTTP',[r.status])),{status:r.status,retryAfter:ra>0?ra:0,permanent:r.status<500&&r.status!==429&&r.status!==408})}return await r.arrayBuffer()}finally{clearTimeout(timer)}};
  let error;for(let attempt=0;attempt<6;attempt++){const order=alt?(this.useMirror?[alt,url]:[url,alt]):[url];let permanent=true,retryAfter=0;
   for(const u of order){try{const data=await get(u);if(u===alt)this.stats.mirror=(this.stats.mirror||0)+1;return data}catch(e){error=e;if(!e.permanent)permanent=false;if(e.retryAfter)retryAfter=Math.max(retryAfter,e.retryAfter);if(u!==alt&&e.status===429&&alt)this.useMirror=true}}
   if(permanent||attempt===5)throw error;if(attempt===0&&window.PurrBoot)PurrBoot.message(PurrBoot.text('bootResourceBusy'));
   await sleep(retryAfter?Math.min(retryAfter*1000,30000):Math.min(15000,600*2**attempt)*(.6+Math.random()*.8))}throw error},
 async prepare(build){
  if(!isSecureContext||!window.caches)throw Error(PurrBoot.text('bootResourceSecure'));
  this.cache=await caches.open('purr-content-v2');this.index=await caches.open('purr-index-v2');
  const manifestURL=new URL(build.resources.manifest,this.base);manifestURL.searchParams.set('checksum',build.resources.checksum);
  let data;const stored=await this.index.match(manifestURL);if(stored)data=await stored.arrayBuffer();else data=await this.network(manifestURL,15000,this.mirror(manifestURL));
  if(this.crc32(data)!==build.resources.checksum)throw Error(PurrBoot.text('bootResourceManifest'));
  const manifest=JSON.parse(new TextDecoder().decode(data));if(manifest.schema!==4)throw Error('Resource list format mismatch; upload resources.json and all update files.');
  let complete=0,failed=null;const files=manifest.files,progress=()=>{PurrBoot.set('pixel',.8*complete/files.length);PurrBoot.message(PurrBoot.text('bootResourceProgress',[Math.floor(complete/files.length*100)]))};
  const pool=async(list,n,fn)=>{let at=0;await Promise.all(Array.from({length:Math.min(n,list.length)},async()=>{while(!failed&&at<list.length)await fn(list[at++])}))};
  // 1. what is already cached (nothing is downloaded for those)
  const missing=[];
  await pool(files,12,async e=>{e.key=new URL('.purr-crc/'+e.crc32+'/'+e.path,this.base).href;this.entries.set(new URL(e.path,this.base).href,e);
   if(await this.cache.match(e.key)){this.stats.reused++;complete++;if(complete%60===0)progress()}else missing.push(e)});
  // 2. packs: a first visit is a few dozen requests instead of one per file (GitHub Pages answers HTTP 429 to thousands
  //    of requests from one IP, e.g. a school). Every file is still checked against its own CRC32; anything a pack
  //    cannot provide (pack missing, damaged, older loader data) is fetched on its own in step 3.
  const single=[];
  if(Array.isArray(manifest.packs)&&missing.length){const byPack=new Map();for(const e of missing){if(!Array.isArray(e.pk)||!manifest.packs[e.pk[0]]){single.push(e);continue}const k=e.pk[0];if(!byPack.has(k))byPack.set(k,[]);byPack.get(k).push(e)}
   await pool([...byPack.keys()],4,async k=>{const want=byPack.get(k),pack=manifest.packs[k];let data=null;
    try{data=await this.network(new URL(pack.path,this.base),90000,this.mirror(new URL(pack.path,this.base)));if(data.byteLength!==pack.bytes)data=null}catch(error){console.warn('[assets] pack',pack.path,error)}
    if(!data){single.push(...want);return}this.stats.packs=(this.stats.packs||0)+1;
    for(const e of want){if(failed)return;const bytes=data.slice(e.pk[1],e.pk[1]+e.bytes);
     if(bytes.byteLength!==e.bytes||this.crc32(bytes)!==e.crc32){single.push(e);continue}
     await this.cache.put(e.key,new Response(bytes,{headers:{'Content-Type':e.mime}}));this.stats.downloaded++;this.stats.bytes+=bytes.byteLength;complete++;if(complete%60===0)progress()}})}
  else single.push(...missing);
  // 3. one file at a time (no packs in this build, or a pack could not provide the file)
  await pool(single,12,async e=>{try{
   const url=new URL(e.path,this.base);url.searchParams.set('crc',e.crc32);
   let bytes;for(let attempt=0;attempt<3;attempt++){if(attempt){url.searchParams.set('retry',String(Date.now()));await new Promise(resolve=>setTimeout(resolve,500*attempt))}bytes=this.canonical(e,await this.network(url));if(bytes.byteLength===e.bytes&&this.crc32(bytes)===e.crc32)break;if(attempt===2)throw Error(PurrBoot.text('bootResourceFile',[e.path]))}await this.cache.put(e.key,new Response(bytes,{headers:{'Content-Type':e.mime}}));this.stats.downloaded++;this.stats.single=(this.stats.single||0)+1;this.stats.bytes+=bytes.byteLength
   if(failed)return;complete++;progress();
   }catch(error){if(!failed){error.message+=' ['+e.path+']';failed=error;PurrBoot.fail(error.message)}throw error}
  });
  if(failed)throw failed;progress();
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
 async decode(){const paths=[...this.entries.values()].map(e=>e.path).filter(p=>p.endsWith('.png')&&!/^assets\/png\/(avatar\/body|avatars|atlases)\//.test(p));let i=0;for(const path of paths){const im=await this.image(path);if(path.startsWith('assets/png/masks/')){const cv=document.createElement('canvas');cv.width=im.naturalWidth;cv.height=im.naturalHeight;const x=cv.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0);const d=x.getImageData(0,0,cv.width,cv.height).data,a=new Uint16Array(cv.width*cv.height);for(let j=0;j<a.length;j++)a[j]=d[j*4+3]?d[j*4]*256+d[j*4+1]:0;this.masks.set(path,{width:cv.width,height:cv.height,data:a});this.images.delete(path);URL.revokeObjectURL(this.urls.get(path));this.urls.delete(path)}i++;if(i%30===0){PurrBoot.set('pixel',.8+.1*i/paths.length);PurrBoot.message(PurrBoot.text('bootResourceDecode',[Math.floor(i/paths.length*100)]));await new Promise(requestAnimationFrame)}}PurrBoot.set('pixel',.9)}
};
PurrAssets.cssURLs=new Map();
PurrAssets.css=async function(path){if(this.cssURLs.has(path))return this.cssURLs.get(path);let text=await (await this.blob(path)).text();const parts=[...text.matchAll(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g)];for(const m of parts){const raw=m[2];if(/^(?:data:|https?:|blob:|#)/.test(raw))continue;const u=new URL(raw,new URL(path,this.base));const rel=decodeURIComponent(u.pathname.slice(this.base.pathname.length));const target=rel.endsWith('.css')?await this.css(rel):await this.url(rel);text=text.split(m[0]).join('url("'+target+'")')}const url=URL.createObjectURL(new Blob([text],{type:'text/css'}));this.cssURLs.set(path,url);return url};
PurrAssets.cachedURL=function(value){try{const u=new URL(value,this.base);if(u.origin!==this.base.origin)return value;const path=decodeURIComponent(u.pathname.slice(this.base.pathname.length));return this.urls.get(path)||value}catch{return value}};
