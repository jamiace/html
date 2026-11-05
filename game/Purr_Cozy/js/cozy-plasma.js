/* 0.92.41 Purr Cozy: plasma balls (cozy_plasma_1..5) animate while switched on.
   The catalog has one static "on" sprite per ball. While on, four frames are built from that sprite at run time:
   the rays inside the glass are replaced by the glass shading, then 4-6 wandering filaments are drawn from the
   core to the glass in the ball's own colours. Frames are cached per sprite and drawn over the normal item.
   Item IDs, catalog data and Game.S fields are unchanged. Load after room092.js / cozy-update.js. */
const PlasmaFX={
 FPS:8,FRAMES:4,cache:new Map(),
 lum(p){return p[0]*.299+p[1]*.587+p[2]*.114},
 rnd(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296}},
 // cv: the coloured "on" canvas exactly as the room draws it; cx, cy: core pixel.
 frames(cv,cx,cy,seed=1){
  const W=cv.width,H=cv.height,src=cv.getContext('2d',{willReadFrequently:true}).getImageData(0,0,W,H).data;
  const at=(x,y)=>{const i=(y*W+x)*4;return[src[i],src[i+1],src[i+2],src[i+3]]};
  // glass radius: from the core to the outline above and beside it (the first opaque pixel in that row / column is the outline)
  const opaque=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&at(x,y)[3]>=128;
  let top=0;while(top<cy&&!opaque(cx,top))top++;let left=0;while(left<cx&&!opaque(left,cy))left++;let right=W-1;while(right>cx&&!opaque(right,cy))right--;
  const R=Math.max(3,Math.min(cy-top,cx-left,right-cx)-1.5),ink=new Set([at(cx,top),at(left,cy),at(right,cy)].map(p=>p.join()));
  const inside=[];for(let y=Math.max(0,Math.floor(cy-R));y<=Math.min(H-1,Math.ceil(cy+R));y++)for(let x=Math.max(0,Math.floor(cx-R));x<=Math.min(W-1,Math.ceil(cx+R));x++){const d=Math.hypot(x-cx,y-cy);if(d<=R+.4){const p=at(x,y);if(p[3]>=128&&!ink.has(p.join()))inside.push({x,y,d,p})}}
  if(inside.length<12)return null;
  const L=inside.map(o=>this.lum(o.p)).sort((a,b)=>a-b),median=L[Math.floor(L.length*.5)];
  const isRay=q=>q.d>1.6&&q.d<R-.6&&this.lum(q.p)>median+10,core=inside.filter(o=>o.d<=1.6).sort((a,b)=>this.lum(b.p)-this.lum(a.p));
  const bright=inside.filter(isRay).sort((a,b)=>this.lum(b.p)-this.lum(a.p));
  if(bright.length<3)return null;
  // glass without the drawn rays: every ray pixel takes the colour of the nearest plain glass pixel, so the artist's texture stays
  const plain=inside.filter(q=>q.d>1.6&&!isRay(q)),base=new Map();
  for(const q of inside){if(q.d<=1.6)continue;if(!isRay(q)){base.set(q.x+','+q.y,q.p);continue}let best=null,bd=1e9;for(const g of plain){const dd=(g.x-q.x)**2+(g.y-q.y)**2+Math.abs(g.d-q.d)*.5;if(dd<bd){bd=dd;best=g}}base.set(q.x+','+q.y,best?best.p:q.p)}
  const ray=bright[Math.floor(bright.length*.4)].p,tip=bright[0].p,hot=(core[0]||bright[0]).p;
  const out=[],mask=new Set(inside.map(o=>o.x+','+o.y));
  for(let f=0;f<this.FRAMES;f++){
   const o=document.createElement('canvas');o.width=W;o.height=H;const x=o.getContext('2d'),img=x.createImageData(W,H),d=img.data;
   const put=(px,py,p)=>{px=Math.round(px);py=Math.round(py);if(!mask.has(px+','+py))return false;const i=(py*W+px)*4;d[i]=p[0];d[i+1]=p[1];d[i+2]=p[2];d[i+3]=255;return true};
   // 1. plain glass
   for(const[k,p]of base){const[px,py]=k.split(',').map(Number);put(px,py,p)}
   // 2. filaments: smooth arcs from the core to the glass, turning a little each frame
   const r=this.rnd(seed*7919+f*104729),n=4+(f%2);
   for(let k=0;k<n;k++){let a=(k+.25+r()*.5)/n*Math.PI*2+f*.45,bend=(r()-.5)*.5,lx=cx,ly=cy,dist=1.5,end=null;
    while(dist<R+.2){dist+=.35;a+=bend*.12;const px=cx+Math.cos(a)*dist,py=cy+Math.sin(a)*dist;if(!mask.has(Math.round(px)+','+Math.round(py)))break;
     // fill the step without gaps
     const steps=Math.max(1,Math.ceil(Math.hypot(px-lx,py-ly)));for(let s=1;s<=steps;s++)put(lx+(px-lx)*s/steps,ly+(py-ly)*s/steps,ray);lx=px;ly=py;end=[px,py]}
    if(end)put(end[0],end[1],tip)}
   // 3. core flickers between its own colours
   for(const q of core)put(q.x,q.y,f%2?q.p:hot);
   x.putImageData(img,0,0);out.push(o)}
  return out;
 },
 forItem(it){
  const d=ITEMS[it.k];if(!d||d.cozyType!=='plasma'||!it.on||it.broken)return null;
  const cv=Room.itemCanvas(it),key=it.k+'|'+(it.flip?1:0)+'|'+cv.width+'x'+cv.height;
  if(!this.cache.has(key)){const lx=d.light?d.light.x:Math.floor(cv.width/2),ly=d.light?d.light.y:9;let frames=null;try{frames=this.frames(cv,it.flip?cv.width-1-lx:lx,ly,[...it.k].reduce((s,c)=>s*31+c.charCodeAt(0),7))}catch(e){console.warn('plasma',e)}this.cache.set(key,frames)}
  return this.cache.get(key);
 },
};
(function(){
 if(typeof Room==='undefined'||!Room.drawItem)return;
 const draw=Room.drawItem.bind(Room);
 Room.drawItem=function(c,it){const r=draw(c,it);const frames=PlasmaFX.forItem(it);if(frames){const f=frames[Math.floor((Room.t||0)*PlasmaFX.FPS)%frames.length];c.drawImage(f,Math.round(it.x),Math.round(it.y))}return r};
})();
