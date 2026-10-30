/* HD furniture pilot: original world geometry, alpha hit testing and pixel actors are retained. */
const HDFurniture={enabled:new URL(location.href).searchParams.get('hdFurniture')!=='0',cache:new Map(),spec:{"desk":[32,264,890,456],"nightstand":[1120,302,352,418],"plant_snake":[1674,114,248,606]},
 image(it){const key=it.k+'|'+!!it.flip;if(this.cache.has(key))return this.cache.get(key);const a=this.spec[it.k];if(!a)return null;const image=PurrAssets.images.get('assets/png/hd/default-furniture-atlas.png');if(!image)return null;
 const high=document.createElement('canvas');high.width=a[2];high.height=a[3];const hc=high.getContext('2d');if(it.flip){hc.translate(high.width,0);hc.scale(-1,1)}hc.drawImage(image,...a,0,0,a[2],a[3]);
 const size=PNGArt.meta.items[it.k].size,low=document.createElement('canvas');low.width=size[0];low.height=size[1];const lc=low.getContext('2d',{willReadFrequently:true});lc.drawImage(high,0,0,...size);low.alpha=lc.getImageData(0,0,...size).data;low.hdImage=high;this.cache.set(key,low);return low},
 patch(c){if(c._purrHD)return;c._purrHD=true;const draw=c.drawImage.bind(c);c.drawImage=function(im,...args){if(!im?.hdImage)return draw(im,...args);const hi=im.hdImage,sx=hi.width/im.width,sy=hi.height/im.height;this.save();this.imageSmoothingEnabled=true;this.imageSmoothingQuality='high';try{if(args.length===2)return draw(hi,...args,im.width,im.height);if(args.length===4)return draw(hi,...args);if(args.length===8)return draw(hi,args[0]*sx,args[1]*sy,args[2]*sx,args[3]*sy,...args.slice(4));return draw(im,...args)}finally{this.restore()}}}
};
(function(){const item=Room.itemCanvas.bind(Room);Room.itemCanvas=function(it){return HDFurniture.enabled&&HDFurniture.image(it)||item(it)};
// Measure untransformed layout dimensions only. Zoom transforms must never feed back into backing-store size.
const render=Room.render.bind(Room);Room.render=function(dt){const c=this.ctx;HDFurniture.patch(c);if(c.canvas===this.cv){const ratio=window.devicePixelRatio||1,scale=Number.isFinite(Game.scale)&&Game.scale>0?Game.scale:1,zoom=typeof Mobile!=='undefined'&&Mobile.zoomed?MOBILE.zoom:1;
 const backing=Math.min(16,Math.max(1,Math.ceil(scale*ratio*zoom))),w=RW*backing,h=RH*backing;
 if(this.cv.width!==w||this.cv.height!==h){this.cv.width=w;this.cv.height=h}c.setTransform(backing,0,0,backing,0,0);c.imageSmoothingEnabled=false;this.cv.style.imageRendering='auto'}return render(dt)};
})();
