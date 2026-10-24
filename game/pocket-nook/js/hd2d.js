/* HD-2D first playable slice. World coordinates and save rules stay with the game. */
const HD2D = {
  // 保留效能修正版的 2 倍畫布與 CSS 硬體縮放。
  // 光影改用快取遮罩與幾何投影，不提高解析度，也不使用即時模糊。
  scale: 2,
  shadowScale: 1/3,
  shadowDistance: 18,
  enabled: true,
  ready: false,
  images: {},
  surfaces: new WeakMap(),
  itemSources: new WeakMap(),
  masks: new WeakMap(),
  frames: 0,
  ms: 0,
  names: ['room-shell','bed','desk','chair','cat_tree','litter_house','rug','lantern','moon_bunny','window'],
  
  canvas(w, h) {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    return cv;
  },

  async load() {
    const results = await Promise.allSettled(this.names.map(name => new Promise((ok, no) => {
      const im = new Image();
      im.onload = () => { this.images[name] = im; ok(); };
      im.onerror = () => no(Error('無法載入 ' + name));
      im.src = 'assets/hd2d/' + name + '.png';
    })));
    this.failed = results.filter(r => r.status === 'rejected').length;
    this.ready = !this.failed;
    return this.ready;
  },

  key(it) {
    const k = it.k, d = ITEMS[k];
    if (k === 'cat_tree') return 'cat_tree';
    if (k === 'litter_house') return 'litter_house';
    if (k === 'moon_bunny') return 'moon_bunny';
    if (k === 'festival_lantern') return 'lantern';
    if (k === 'window_arch') return 'window';
    if (k.startsWith('a92_lantern_night_')) {
      if (d.bed) return 'bed';
      if (d.desk) return 'desk';
      if (d.chair) return 'chair';
      if (d.layer === 'rug') return 'rug';
    }
    return null;
  },

  source(it) {
    if (WallMount.side(it)) return this.wallSource(it);
    const base = Room.itemCanvas(it), key = this.key(it), image = key && this.images[key];
    let src = image || this.detail(base, 'prop');
    if (image && it.flip) {
      this.flips = this.flips || new WeakMap();
      if (!this.flips.has(image)) { const cv = this.canvas(image.width, image.height), c = cv.getContext('2d'); c.translate(cv.width, 0); c.scale(-1, 1); c.drawImage(image, 0, 0); this.flips.set(image, cv); }
      src = this.flips.get(image);
    }
    this.itemSources.set(base, src);
    return src;
  },

  // The side-wall image is warped from the HD face, never from a low-res wall sprite.
  wallSource(it, frameOnly=false) {
    const side = WallMount.side(it), raw = WallMount.raw(it), back = {...it, wall:'back', x:0, y:0}, d = ITEMS[it.k];
    const dynamic = it.shake || it.broken || d.window || d.clock || d.calendar || d.anim || d.tv || d.screen || d.fish || d.flicker || d.fire || d.glow;
    this.wallFaces = this.wallFaces || new Map();
    const id = it.uid + ':' + it.k + (frameOnly?'|frame':''), stamp = [dynamic ? Math.floor(Room.t * 10) : 0, !!it.on, !!it.closed, !!it.flip, !!it.broken, !!it.wilt, Math.ceil(it.dust||0), Room.state.view, Math.round(Room.env.h * 60), Room.env.weather].join('|');
    let entry = this.wallFaces.get(id);
    if (!entry || entry.stamp !== stamp || entry.raw !== raw) {
      const front = this.canvas(raw.width * this.scale, raw.height * this.scale), c = front.getContext('2d');
      c.setTransform(this.scale, 0, 0, this.scale, 0, 0); if(frameOnly)c.drawImage(this.source(back),0,0,raw.width,raw.height);else this.drawItem(c, back);
      entry = { front, stamp, raw, projections:new Map() }; this.wallFaces.set(id, entry);
      if (this.wallFaces.size > 64) this.wallFaces.delete(this.wallFaces.keys().next().value);
    }
    const key = [side,it.x,it.y].join('|');
    let cv = entry.projections.get(key);
    if (!cv) {
      const g = WallMount.geometry(raw, side, it), S = this.scale;
      const face = this.canvas(g.w*S, g.h*S), c = face.getContext('2d'); c.setTransform(S,0,0,S,0,0); c.imageSmoothingEnabled = true;
      // Source intervals cover all columns, preserving thin cords and window frames.
      const count = Math.max(1, Math.ceil(g.inner*S));
      for (let i=0;i<count;i++) { const x=i/count*g.inner, width=g.inner/count, ratio=g.ratio(x+width/2), y=1+g.offset(x+width/2); c.drawImage(entry.front,i/count*entry.front.width,0,entry.front.width/count,entry.front.height,1+x,y,width+.02,raw.height*g.scale*ratio); }
      cv = this.canvas(face.width,face.height); const ink=cv.getContext('2d');
      for (const [x,y] of [[-1,0],[1,0],[0,-1],[0,1]]) ink.drawImage(face,x,y);
      ink.globalCompositeOperation='source-in'; ink.fillStyle='#2e2230'; ink.fillRect(0,0,cv.width,cv.height); ink.globalCompositeOperation='source-over'; ink.drawImage(face,0,0);
      cv.hdWall = {side, hd:true, logicalWidth:g.w, logicalHeight:g.h};
      if(entry.projections.size>24)entry.projections.delete(entry.projections.keys().next().value);entry.projections.set(key,cv);
    }
    this.itemSources.set(Room.itemCanvas(it), cv); return cv;
  },

  detail(src, kind = 'prop') {
    let styles = this.surfaces.get(src);
    if (!styles) { styles = {}; this.surfaces.set(src, styles); }
    if (styles[kind]) return styles[kind];
    if (!src.getContext) return src;
    
    // 紋理細節取樣維持 4 倍預烘焙，此處已自帶快取，維持不變
    const S = 4, w = src.width, h = src.height, cv = this.canvas(w * S, h * S),
          c = cv.getContext('2d'), data = src.getContext('2d').getImageData(0, 0, w, h).data,
          im = c.createImageData(w * S, h * S);
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] > 30;
    
    for (let y = 0; y < h * S; y++) {
      for (let x = 0; x < w * S; x++) {
        const sx = x >> 2, sy = y >> 2, at = (sy * w + sx) * 4, o = (y * w * S + x) * 4;
        if (!data[at + 3]) continue;
        let mul = 1, red = data[at], green = data[at + 1], blue = data[at + 2];
        const ink = red < 70 && green < 62 && blue < 75;
        if (!ink) {
          const nx = (solid(sx - 1, sy) ? 0 : -1) + (solid(sx + 1, sy) ? 0 : 1),
                ny = (solid(sx, sy - 1) ? 0 : -1) + (solid(sx, sy + 1) ? 0 : 1),
                dx = x % 4, dy = y % 4;
          mul = 1 - nx * .11 - ny * .075 + (hsh(x, y, 17) % 13 - 6) * .002;
          if (kind === 'pet' && red > green * 1.1) {
            if ((x + Math.floor(y / 7)) % 7 === 0 && y % 5 < 2) mul += .11;
            if (dx === 3 && solid(sx + 1, sy)) mul -= .025;
          }
          if (kind === 'owner') {
            const hair = red < 150 && red > green * 1.1;
            if (hair && (x + Math.floor(y * .22)) % 6 === 0) mul -= .12;
            else if (!hair && green < 150 && y > h * S * .48 && ((x + y) % 7 === 0)) mul += .07;
          }
        }
        im.data[o] = Math.max(0, Math.min(255, red * mul));
        im.data[o + 1] = Math.max(0, Math.min(255, green * mul));
        im.data[o + 2] = Math.max(0, Math.min(255, blue * mul));
        im.data[o + 3] = data[at + 3];
      }
    }
    c.putImageData(im, 0, 0);
    styles[kind] = cv;
    return cv;
  },

  proxy(ctx, kind) {
    const self=this;
    return new Proxy(ctx,{
      get(t,k){
        // Actors already receive one contact shadow from the HD support-plane pass.
        if(k==='fillRect' && (kind==='pet'||kind==='owner'))return function(x,y,w,h){if(w<=14&&h<=3&&/^rgba\(46,\s*34,\s*48,\s*0\.2/.test(t.fillStyle))return;t.fillRect(x,y,w,h)};
        if(k==='drawImage')return function(src,...a){
          const image=src.nookDynamic?src:(self.itemSources.get(src)||self.detail(src,kind));let args;
          if(a.length===2)args=[a[0],a[1],src.width,src.height];
          else if(a.length===4)args=a;
          else if(a.length===8){const x=image.width/src.width,y=image.height/src.height;args=[a[0]*x,a[1]*y,a[2]*x,a[3]*y,...a.slice(4)]}
          if(!args)return;t.drawImage(image,...args);
          if(self.capture && !self.itemSources.has(src)){
            const m=t.getTransform(),S=self.scale,rect=args.length===4?[0,0,image.width,image.height,...args]:args;
            self.capture.push({src:image,nw:src.width,nh:src.height,rect,m:[m.a/S,m.b/S,m.c/S,m.d/S,m.e/S,m.f/S]});
          }
        };
        const v=t[k];return typeof v==='function'?v.bind(t):v;
      },set(t,k,v){t[k]=v;return true}
    });
  },

  mask(src) {
    let cv = this.masks.get(src);
    if (cv) return cv;
    cv = this.canvas(src.width, src.height);
    const c = cv.getContext('2d');
    c.drawImage(src, 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = '#15101d';
    c.fillRect(0, 0, cv.width, cv.height);
    this.masks.set(src, cv);
    return cv;
  },

  floorClip(c) {
    c.beginPath(); c.moveTo(R.wx0,R.wy1); c.lineTo(R.wx1,R.wy1); c.lineTo(R.fxf1,R.fy1); c.lineTo(R.fxf0,R.fy1); c.closePath(); c.clip();
  },
  wallFloor(x) { return R.wy1 + Math.max(0,R.wx0-x,x-R.wx1)*(R.fy1-R.wy1)/(R.wx0-R.fxf0); },
  root(it) { const seen=new Set();while(it&&it.p!=null&&Room.uidMap[it.p]&&!seen.has(it.uid)){seen.add(it.uid);it=Room.uidMap[it.p]}return it; },
  shape(src,w,h) {
    this.shapes=this.shapes||new WeakMap();let map=this.shapes.get(src);if(!map){map=new Map();this.shapes.set(src,map)}const key=w+'|'+h;if(map.has(key))return map.get(key);
    const S=2,cv=this.canvas(Math.max(1,Math.ceil(w*S)),Math.max(1,Math.ceil(h*S))),c=cv.getContext('2d',{willReadFrequently:true});c.drawImage(src,0,0,cv.width,cv.height);const d=c.getImageData(0,0,cv.width,cv.height).data,W=cv.width,H=cv.height,points=[];
    let minX=W,minY=H,maxX=-1,maxY=-1;const solid=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&d[(y*W+x)*4+3]>48;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(solid(x,y)){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);if(!solid(x-1,y)||!solid(x+1,y)||!solid(x,y-1)||!solid(x,y+1))points.push([(x+.5)/S,(y+.5)/S]);}
    let sum=0,count=0;for(let y=Math.max(0,maxY-2);y<=maxY;y++)for(let x=0;x<W;x++)if(solid(x,y)){sum+=(x+.5)/S;count++}
    const tiles=[];let active=new Map();
    for(let y=0;y<H;y++){const next=new Map();for(let x=0;x<W;){if(!solid(x,y)){x++;continue}const start=x;while(x<W&&solid(x,y))x++;const key=start+':'+x,prior=active.get(key);if(prior&&y/S-prior[1]<2){prior[3]=(y+1)/S;next.set(key,prior)}else{const tile=[start/S,y/S,x/S,(y+1)/S];tiles.push(tile);next.set(key,tile)}}active=next;}
    const step=Math.max(1,Math.ceil(points.length/120)),outline=points.filter((_,i)=>i%step===0),result={tiles,points:outline,bottom:(maxY+1)/S,footX:count?sum/count:w/2,width:Math.max(1,(maxX-minX+1)/S),top:minY/S,mask:cv,alpha:d};map.set(key,result);return result;
  },
  ground(it) { const root=this.root(it),cv=Room.itemCanvas(root),shape=this.shape(this.source(root),cv.width,cv.height);return {x:root.x+shape.footX,y:root.y+shape.bottom,uid:root.uid}; },

  lights() {
    const list=Room.collectLights().map(l=>({...l,gx:l.x,gy:this.wallFloor(l.x),z:Math.max(3,this.wallFloor(l.x)-l.y),type:l.r>=180?'ambient':'point',casts:false,emissive:l.r<180})),used=new Set();
    for(const it of Room.state.items){const d=ITEMS[it.k];if(!d.light||it.broken||(d.toggle&&!it.on))continue;
      const side=WallMount.side(it),raw=side?WallMount.raw(it):Room.itemCanvas(it),q=d.light;let x=it.x+(it.flip?raw.width-1-q.x:q.x),y=it.y+q.y;
      if(side){const pt=WallMount.geometry(raw,side,it).point(it.flip?raw.width-1-q.x:q.x,q.y);x=it.x+pt[0];y=it.y+pt[1]}
      let best=-1,distance=3;for(let i=0;i<list.length;i++){const z=Math.hypot(list[i].x-x,list[i].y-y);if(!used.has(i)&&z<distance){distance=z;best=i}}
      if(best<0)continue;used.add(best);const l=list[best],root=this.root(it),wall=ITEMS[root.k].layer==='wall',foot=wall?{x:l.x,y:this.wallFloor(l.x),uid:root.uid}:this.ground(root);
      l.type='point';l.emissive=true;l.gx=l.x;l.gy=foot.y;l.z=Math.max(3,foot.y-l.y);l.rootUid=foot.uid;l.casts=true;l.reach=l.r*1.25+l.z*.45;
    }
    // Daylight enters from outside a window; it has a receiver direction, not a glowing floor orb.
    const H=Room.env.h,night=H<6||H>19.3,weather=Room.env.rain||['rain','storm','snow','fog'].includes(Room.env.weather),fade=Room.state===Game.S?1-Math.min(.95,Lights.dark||0):1;
    for(const it of Room.state.items){const d=ITEMS[it.k];if(!d.window||it.closed)continue;const cv=Room.itemCanvas(it),side=WallMount.side(it),x=it.x+cv.width/2,y=this.wallFloor(x),shift=Math.sin((H-12)/12*Math.PI)*80;
      list.push({type:'window',emissive:false,casts:true,rootUid:it.uid,window:it,x,y:it.y+cv.height/2,gx:side==='left'?x-240:side==='right'?x+240:x+shift,gy:side?y:y-240,z:240,r:400,reach:520,k:(night?.09:weather?.24:.62)*fade,col:night?'cool':'warm'});
    }
    return list.filter(l=>l.k>.01);
  },
  shadowLights(caster,lights) {
    // Keep each emitter's direction. Averaging positions can cancel right/back shadows.
    return lights.filter(l=>l.casts&&l.rootUid!==caster.rootUid).map(l=>{
      const dist=Math.hypot(caster.x-l.gx,(caster.y-l.gy)*1.25),reach=l.type==='window'?(l.reach||l.r):Math.min(64,l.r*.65);
      const optical=l.reach||l.r,edge=l.type==='window'?.25:Math.min(1,(reach-dist)/Math.max(1,reach*.35));return {...l,weight:dist<reach?l.k*(1-dist/optical)**2*edge:0};
    }).filter(l=>l.weight>.008);
  },
  selfLight(caster,lights) {
    const own=lights.filter(l=>l.type==='point'&&l.emissive&&l.rootUid===caster.rootUid);
    return 1/(1+own.reduce((v,l)=>v+l.k,0)*4);
  },
  sourceId(src) {this.sourceIds=this.sourceIds||new WeakMap();if(!this.sourceIds.has(src))this.sourceIds.set(src,this.nextSourceId=(this.nextSourceId||0)+1);return this.sourceIds.get(src);},
  materialSource(it) {
    const src=this.source(it),win=ITEMS[it.k].window;if(!win)return src;
    const side=WallMount.side(it);if(!it.closed)return side?this.wallSource(it,true):src;if(side)return src;
    // Closed blinds receive light and cast shadows; open glass stays outside the
    // room lighting. Render the closed face so arches and mullions remain exact.
    this.closedFaces=this.closedFaces||new WeakMap();let out=this.closedFaces.get(src);if(out)return out;
    const cv=Room.itemCanvas(it);out=this.canvas(src.width,src.height);const c=out.getContext('2d');c.scale(src.width/cv.width,src.height/cv.height);this.drawItem(c,{...it,x:0,y:0,wall:'back'});this.closedFaces.set(src,out);return out;
  },
  itemSignature(it) {const cv=Room.itemCanvas(it);return [this.sourceId(this.materialSource(it)),it.x,it.y,cv.width,cv.height].join(',');},
  itemTiles(it) {
    this.tileCache=this.tileCache||new WeakMap();const key=this.itemSignature(it),cached=this.tileCache.get(it);if(cached?.key===key)return cached.tiles;
    const cv=Room.itemCanvas(it),shape=this.shape(this.materialSource(it),cv.width,cv.height);
    const tiles=shape.tiles.map(([x,y,r,b])=>[[it.x+x,it.y+y],[it.x+r,it.y+y],[it.x+r,it.y+b],[it.x+x,it.y+b]]);this.tileCache.set(it,{key,tiles});return tiles;
  },
  fragmentTiles(f) {
    const shape=this.shape(f.src,f.nw,f.nh),[sx,sy,sw,sh,dx,dy,dw,dh]=f.rect,[a,b,c,d,e,g]=f.m,tiles=[];
    for(const [x,y,r,bottom] of shape.tiles){const l=Math.max(sx,x/f.nw*f.src.width),t=Math.max(sy,y/f.nh*f.src.height),right=Math.min(sx+sw,r/f.nw*f.src.width),bot=Math.min(sy+sh,bottom/f.nh*f.src.height);if(l>=right||t>=bot)continue;
      tiles.push([[l,t],[right,t],[right,bot],[l,bot]].map(([px,py])=>{const u=dx+(px-sx)/sw*dw,v=dy+(py-sy)/sh*dh;return[a*u+c*v+e,b*u+d*v+g]}));
    }return tiles;
  },
  clip3(poly,fn) {
    if(!poly.length)return poly;const out=[];let a=poly.at(-1),av=fn(a);
    for(const b of poly){const bv=fn(b);if((av>=0)!==(bv>=0)){const t=av/(av-bv);out.push(a.map((v,i)=>v+(b[i]-v)*t))}if(bv>=0)out.push(b);a=b;av=bv}return out;
  },
  receiverPlanes() {
    const slope=(R.wx0-R.fxf0)/(R.fy1-R.wy1);
    return {floor:p=>p[2],back:p=>p[1]-R.wy1,left:p=>p[0]+slope*(p[1]-R.wy1)-R.wx0,right:p=>R.wx1+slope*(p[1]-R.wy1)-p[0]};
  },
  projectTiles(caster,light) {
    const result={floor:[],back:[],left:[],right:[]};if(!light)return result;
    this.projectedMasks=this.projectedMasks||new WeakMap();let cache,key;
    if(caster.cacheOwner){key=[caster.signature,caster.y,caster.heightLimit,caster.wallSide,caster.wallDepth,this.shadowScale,this.shadowDistance,light.gx,light.gy,light.z].join('|');cache=this.projectedMasks.get(caster.cacheOwner);if(cache?.has(key))return cache.get(key);if(!cache){cache=new Map();this.projectedMasks.set(caster.cacheOwner,cache)}}
    const L=[light.gx,light.gy,light.z],planes=this.receiverPlanes(),bounds=[...Object.values(planes),p=>p[1]-p[2]-R.wy0,p=>R.fy1-p[1]];
    for(const tile of caster.tiles||[]){
      // A shallow receiver depth avoids a degenerate line when lamp and feet align.
      const vertices=tile.map(([x,y])=>{const slope=(R.wx0-R.fxf0)/(R.fy1-R.wy1),gy=caster.wallSide?this.wallFloor(x)+(caster.wallDepth||1.2)/(caster.wallSide==='back'?1:slope):Number.isFinite(caster.heightLimit)?Math.min(caster.y,y+caster.heightLimit):caster.y+(y-caster.y)*.08;return[x,gy,Math.max(0,gy-y)]});
      // The stylized floor shadow keeps only one third of the physical ray travel.
      // Clamp each ray to a local footprint; never turn a low lamp into a room-long shadow.
      const floorPoly=this.clip3(vertices,p=>L[2]-p[2]-.001);
      if(floorPoly.length>=3){const floor=floorPoly.map(p=>{const dx=p[0]-L[0],dy=p[1]-L[1],t=Math.min(p[2]/(L[2]-p[2])*this.shadowScale,this.shadowDistance/Math.max(.001,Math.hypot(dx,dy)));return[p[0]+dx*t,p[1]+dy*t]});if(floor.every(p=>p.every(Number.isFinite)))result.floor.push(floor)}
      for(const [side,plane] of Object.entries(planes)){
        if(side==='floor')continue;const fl=plane(L);let poly=vertices;
        // t = plane(P)/(plane(L)-plane(P)); clip BEFORE division, including all
        // room half-spaces. This gives the first valid floor/wall intersection in
        // every direction without a positive-X/Y assumption or a convex hull.
        poly=this.clip3(poly,p=>plane(p));poly=this.clip3(poly,p=>fl-plane(p)-.001);
        poly=this.clip3(poly,p=>this.shadowDistance*(fl-plane(p))-plane(p)*Math.hypot(p[0]-L[0],p[1]-L[1],p[2]-L[2]));
        for(const bound of bounds){const bl=bound(L);poly=this.clip3(poly,p=>bound(p)*fl-bl*plane(p));if(poly.length<3)break;}
        if(poly.length<3)continue;
        const projected=poly.map(p=>{const t=plane(p)/(fl-plane(p));return[p[0]+(p[0]-L[0])*t,p[1]+(p[1]-L[1])*t-(p[2]+(p[2]-L[2])*t)]});
        if(projected.every(p=>p.every(Number.isFinite)))result[side].push(projected);
      }
    }if(cache){if(cache.size>=12)cache.clear();cache.set(key,result)}return result;
  },
  paintTiles(c,tiles,alpha) {
    if(!tiles.length||alpha<=0)return;c.save();c.globalAlpha=alpha;c.fillStyle='#15101d';c.beginPath();
    // One compound path per caster/light: touching alpha cells do not accumulate.
    for(const tile of tiles){const area=tile.reduce((v,p,i)=>{const n=tile[(i+1)%tile.length];return v+p[0]*n[1]-n[0]*p[1]},0),points=area<0?tile.slice().reverse():tile;points.forEach((p,i)=>c[i?'lineTo':'moveTo'](...p));c.closePath()}c.fill();c.restore();
  },
  footprint(c,caster,alpha) {
    if(alpha<=0)return;const bottom=caster.actor?caster.actor.y:caster.y,tiles=[];
    for(const tile of caster.tiles||[]){let p=this.clip3(tile.map(([x,y])=>[x,y,0]),p=>p[1]-(bottom-2));if(p.length<3)continue;tiles.push(p.map(([x,y])=>[x,caster.y+(y-bottom)*.55]));}
    this.paintTiles(c,tiles,alpha);
  },
  washShadows(c,lights,wall=false) {
    c.save();c.globalCompositeOperation='destination-out';
    for(const l of lights){if(l.type!=='point'||!l.emissive)continue;const r=Math.max(5,Math.min(24,l.z*.65)),x=l.gx,y=wall?l.y:l.gy,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(0,0,0,'+Math.min(.9,l.k*.7)+')');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r)}c.restore();
  },
  wallClip(c,side) {
    c.beginPath();if(side==='left'){c.moveTo(R.fxf0,R.wy0);c.lineTo(R.wx0,R.wy0);c.lineTo(R.wx0,R.wy1);c.lineTo(R.fxf0,R.fy1)}else if(side==='right'){c.moveTo(R.wx1,R.wy0);c.lineTo(R.fxf1,R.wy0);c.lineTo(R.fxf1,R.fy1);c.lineTo(R.wx1,R.wy1)}else c.rect(R.wx0,R.wy0,R.wx1-R.wx0,R.wy1-R.wy0);c.closePath();c.clip();
  },
  heightLimit(it,shape) {
    const d=ITEMS[it.k];if(Number.isFinite(d.shadowHeight))return Math.max(1,d.shadowHeight);
    // A sprite includes both vertical height and painted floor depth. Beds and sofas
    // must not turn their entire front-to-back length into a tall vertical caster.
    const factor=d.bed ? .45 : d.chair ? .84 : d.desk ? .78 : d.seat ? .6 : it.k==='cat_tree' ? .96 : d.bowl ? .4 : d.litter ? .76 : .88;
    return Math.max(2,(shape.bottom-shape.top)*factor);
  },
  actorFrame(actor) {
    this.actorLayers=this.actorLayers||new WeakMap();let entry=this.actorLayers.get(actor);if(!entry){const cv=this.canvas(this.cv.width,this.cv.height);entry={cv,ctx:cv.getContext('2d')};this.actorLayers.set(actor,entry)}
    const c=entry.ctx;c.setTransform(this.scale,0,0,this.scale,0,0);c.clearRect(0,0,RW,RH);c.globalAlpha=1;c.globalCompositeOperation='source-over';c.imageSmoothingEnabled=false;entry.fragments=[];this.capture=entry.fragments;
    try{actor.draw(this.proxy(c,actor.pid!=null||actor.p?.sp?'pet':'owner'),Room)}finally{this.capture=null}
    return entry;
  },
  fragmentPoints(f) {
    const shape=this.shape(f.src,f.nw,f.nh),[sx,sy,sw,sh,dx,dy,dw,dh]=f.rect,[a,b,c,d,e,g]=f.m,points=[];
    for(const p of shape.points){const x=p[0]/f.nw*f.src.width,y=p[1]/f.nh*f.src.height;if(x<sx||x>sx+sw||y<sy||y>sy+sh)continue;const u=dx+(x-sx)/sw*dw,v=dy+(y-sy)/sh*dh;points.push([a*u+c*v+e,b*u+d*v+g]);}return points;
  },
  actorSupport(actor,entry) {
    if(actor.state==='sleep'&&actor.bed&&Room.uidMap[actor.bed.uid])return null;
    const seated=['sit','work'].includes(actor.state)&&actor.seat&&Room.uidMap[actor.seat.uid],on=actor.on?Room.uidMap[actor.on.uid]:actor.p?.on?Room.uidMap[actor.p.on]:null,target=actor.climbItem||(actor.jump&&Room.uidMap[actor.target]),support=seated||on||target;
    const j=actor.jump,t=j?Math.max(0,Math.min(1,j.t)):0,ground=support?this.ground(support):{x:actor.x,y:j?j.y0+(j.y1-j.y0)*t:actor.y};
    const points=entry.fragments.flatMap(f=>this.fragmentPoints(f));if(!points.length)return null;const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0]));
    return {id:actor.pid!=null?'pet:'+actor.pid:'actor',actor,cacheOwner:actor,signature:entry.fragments.map(f=>[this.sourceId(f.src),...f.rect,...f.m].join(',')).join(';'),x:seated?ground.x:actor.x,y:ground.y,width:maxX-minX,points,tiles:entry.fragments.flatMap(f=>this.fragmentTiles(f)),rootUid:support?.uid,elevation:Math.max(0,ground.y-actor.y),contact:!support,surface:!!on&&!j};
  },
  shadows(c,list,lights) {
    if(!this.shadow){this.shadow=this.canvas(this.cv.width,this.cv.height);this.shadowCtx=this.shadow.getContext('2d')}
    if(!this.wallShadow){this.wallShadow=this.canvas(this.cv.width,this.cv.height);this.wallShadowCtx=this.wallShadow.getContext('2d')}
    const q=this.shadowCtx,wctx=this.wallShadowCtx;for(const ctx of [q,wctx]){ctx.setTransform(this.scale,0,0,this.scale,0,0);ctx.clearRect(0,0,RW,RH)}
    q.save();this.floorClip(q);const casters=[],roots=new Map();
    for(const e of list)if(e.kind==='item'&&Room.layerOf(e.it)==='floor'&&e.it.p==null){const it=e.it,cv=Room.itemCanvas(it),shape=this.shape(this.source(it),cv.width,cv.height),foot=this.ground(it),caster={id:'item:'+it.uid,x:foot.x,y:foot.y,width:shape.width,rootUid:it.uid,contact:true,heightLimit:this.heightLimit(it,shape),cacheOwner:it,signature:this.itemSignature(it),tiles:[...this.itemTiles(it)]};casters.push(caster);roots.set(it.uid,caster)}
    for(const e of list)if(e.kind==='item'&&ITEMS[e.it.k].layer==='wall'&&e.it.p==null){const it=e.it,cv=Room.itemCanvas(it),side=WallMount.side(it)||'back',caster={id:'wall:'+it.uid,x:it.x+cv.width/2,y:this.wallFloor(it.x+cv.width/2),rootUid:it.uid,wallSide:side,wallDepth:ITEMS[it.k].surface?2.4:1.3,contact:false,cacheOwner:it,signature:this.itemSignature(it),tiles:[...this.itemTiles(it)]};casters.push(caster);roots.set(it.uid,caster)}
    for(const e of list)if(e.kind==='item'&&e.it.p!=null){const caster=roots.get(this.root(e.it).uid);if(caster){caster.tiles.push(...this.itemTiles(e.it));caster.signature+=';'+this.itemSignature(e.it)}}
    for(const e of list)if(e.kind==='actor'){const caster=this.actorSupport(e.a,this.frameActors.get(e.a));if(caster)casters.push(caster)}
    this.shadowPlans=[];
    for(const caster of casters){const sources=this.shadowLights(caster,lights),total=sources.reduce((v,l)=>v+l.weight,0),wash=this.selfLight(caster,lights);let count=0;
      for(const light of sources){const masks=this.projectTiles(caster,light),alpha=Math.min(1,total/.35)*light.weight/Math.max(total,.001)*wash;
        this.paintTiles(q,masks.floor,alpha);for(const side of ['back','left','right']){wctx.save();this.wallClip(wctx,side);this.paintTiles(wctx,masks[side],alpha);wctx.restore()}count+=Object.values(masks).reduce((v,a)=>v+a.length,0);
      }
      if(caster.contact)this.footprint(q,caster,.8*wash*Math.exp(-(caster.elevation||0)/14));
      this.shadowPlans.push({id:caster.id,sources:sources.length,tiles:count,wash,contact:caster.contact,surface:!!caster.surface,elevation:caster.elevation||0});
    }
    q.restore();this.washShadows(q,lights);this.washShadows(wctx,lights,true);
    c.save();c.globalAlpha=Room.env.dark>.1?.18:.14;c.drawImage(this.wallShadow,0,0,RW,RH);c.drawImage(this.shadow,0,0,RW,RH);c.restore();
  },
  windowPane(it) {
    if(!ITEMS[it.k].window||it.closed)return null;const cv=Room.itemCanvas(it),src=this.source(it),frame=this.materialSource(it);this.paneMasks=this.paneMasks||new WeakMap();const owner=WallMount.side(it)?src:frame;let mask=this.paneMasks.get(owner);if(mask)return mask;
    mask=this.canvas(cv.width*this.scale,cv.height*this.scale);const c=mask.getContext('2d');c.scale(this.scale,this.scale);
    if(WallMount.side(it))c.drawImage(src,0,0,cv.width,cv.height);else this.drawItem(c,{...it,x:0,y:0,wall:'back'});
    c.globalCompositeOperation='destination-out';c.drawImage(frame,0,0,cv.width,cv.height);this.paneMasks.set(owner,mask);return mask;
  },
  exteriorMask(list) {
    if(!this.exterior){this.exterior=this.canvas(this.cv.width,this.cv.height);this.exteriorCtx=this.exterior.getContext('2d')}
    const c=this.exteriorCtx;c.setTransform(this.scale,0,0,this.scale,0,0);c.clearRect(0,0,RW,RH);
    // Use scene order, so a person/furniture in front of a window keeps room light.
    for(const e of list){if(e.kind==='item'){const it=e.it,cv=Room.itemCanvas(it),pane=this.windowPane(it);if(pane){c.globalCompositeOperation='source-over';c.drawImage(pane,it.x,it.y,cv.width,cv.height)}c.globalCompositeOperation='destination-out';c.drawImage(this.materialSource(it),it.x,it.y,cv.width,cv.height)}else if(e.kind==='actor'){c.globalCompositeOperation='destination-out';c.drawImage(this.frameActors.get(e.a).cv,0,0,RW,RH)}}c.globalCompositeOperation='source-over';
  },
  clearFloorMask(list) {
    for(const c of [this.shadowCtx,this.wallShadowCtx]){c.save();c.globalCompositeOperation='destination-out';
      for(const e of list){if(e.kind==='item'){const cv=Room.itemCanvas(e.it);c.drawImage(this.source(e.it),e.it.x,e.it.y,cv.width,cv.height);const win=ITEMS[e.it.k].window;if(win&&!WallMount.side(e.it))c.fillRect(e.it.x+win.x,e.it.y+win.y,win.w,win.h)}else if(e.kind==='actor')c.drawImage(this.frameActors.get(e.a).cv,0,0,RW,RH)}c.restore();}
  },

  windowLight(c,lights) {
    const night=Room.env.h<6||Room.env.h>19.3;c.save();this.floorClip(c);c.globalCompositeOperation='screen';
    for(const l of lights){if(l.type!=='window')continue;const it=l.window,side=WallMount.side(it),cv=Room.itemCanvas(it),win=ITEMS[it.k].window;
      for(let i=0;i<2;i++){const x=it.x+(side?cv.width*(.18+i*.35):win.x+i*win.w/2),width=side?cv.width*.28:win.w*.42,start=[x,this.wallFloor(x)],end=[x+width,this.wallFloor(x+width)];
        const ray=p=>{const dx=p[0]-l.gx,dy=p[1]-l.gy,k=76/Math.max(1,Math.hypot(dx,dy));return[p[0]+dx*k,p[1]+dy*k]},a=ray(start),b=ray(end),g=c.createLinearGradient(start[0],start[1],a[0],a[1]);
        g.addColorStop(0,'rgba('+(night?'134,175,255':'255,220,158')+','+Math.min(.2,l.k*.25)+')');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.beginPath();c.moveTo(...start);c.lineTo(...end);c.lineTo(...b);c.lineTo(...a);c.closePath();c.fill();
      }
    }c.restore();
  },

  drawItem(c, it) {
    const key = this.key(it), d = ITEMS[it.k], base = Room.itemCanvas(it);
    if (WallMount.side(it)) { c.drawImage(this.source(it),it.x,it.y,base.width,base.height); return; }
    if (!key) { this.source(it); Room.drawItem(this.proxy(c, 'prop'), it); return; }
    const src = this.source(it), w = base.width, h = base.height;
    c.save();
    if (d.window) {
      const win = d.window;
      c.save();
      c.beginPath();
      c.moveTo(it.x + 4, it.y + h - 5);
      c.lineTo(it.x + 4, it.y + 28);
      c.quadraticCurveTo(it.x + 4, it.y + 4, it.x + w / 2, it.y + 4);
      c.quadraticCurveTo(it.x + w - 4, it.y + 4, it.x + w - 4, it.y + 28);
      c.lineTo(it.x + w - 4, it.y + h - 5);
      c.closePath();
      c.clip();
      Room.drawWindowScene(c, it.x + win.x, it.y + win.y, win.w, win.h);
      if (it.closed) {
        c.fillStyle = '#9b7a60';
        c.fillRect(it.x, it.y, w, h);
        c.strokeStyle = '#644b44';
        c.lineWidth = .5;
        for (let y = it.y + 4; y < it.y + h; y += 3) {
          c.beginPath();
          c.moveTo(it.x, y);
          c.lineTo(it.x + w, y);
          c.stroke();
        }
      }
      c.restore();
    }
    if (d.toggle && (!it.on || it.broken)) c.filter = 'brightness(.44) saturate(.55)';
    c.drawImage(src, it.x, it.y, w, h);
    c.restore();
    if (it.used && d.litter) {
      c.fillStyle = '#74513b';
      for (let n = 0; n < it.used; n++) c.fillRect(it.x + 12 + n * 2, it.y + h - 6, 1, .7);
    }
  },

  normalData(src,w,h) {
    const shape=this.shape(src,w,h);if(shape.normals)return shape;
    const W=shape.mask.width,H=shape.mask.height,d=new Float32Array(W*H),n=new Float32Array(W*H*2),alpha=shape.alpha;
    for(let i=0;i<d.length;i++)d[i]=alpha[i*4+3]>48?Math.min(W,H):0;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;if(!d[i])continue;d[i]=Math.min(d[i],x?d[i-1]+1:1,y?d[i-W]+1:1)}
    for(let y=H-1;y>=0;y--)for(let x=W-1;x>=0;x--){const i=y*W+x;if(!d[i])continue;d[i]=Math.min(d[i],x<W-1?d[i+1]+1:1,y<H-1?d[i+W]+1:1)}
    const at=(x,y)=>x<0||y<0||x>=W||y>=H?0:d[y*W+x];
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;n[i*2]=Math.max(-.8,Math.min(.8,(at(x-2,y)-at(x+2,y))*.22));n[i*2+1]=Math.max(-.7,Math.min(.7,(at(x,y+2)-at(x,y-2))*.22));}
    shape.normals=n;return shape;
  },
  surfaceOverlay(owner,src,w,h,m,info,lights) {
    const shape=this.normalData(src,w,h),W=shape.mask.width,H=shape.mask.height,side=info.side||'',colors={warm:[1,.69,.34],cool:[.47,.7,1],pink:[1,.49,.68]};
    this.surfaceLayers=this.surfaceLayers||new WeakMap();let slots=this.surfaceLayers.get(owner);if(!slots){slots=new Map();this.surfaceLayers.set(owner,slots)}
    const slot=info.slot||'item',key=[this.sourceId(src),...m,info.ground,info.heightLimit,side,info.flat,Room.env.h.toFixed(3),lights.map(l=>[l.type,l.x,l.y,l.gx,l.gy,l.z,l.k.toFixed(3),l.col].join(',')).join(';')].join('|');let entry=slots.get(slot);if(entry?.key===key)return entry.cv;
    if(!entry||entry.cv.width!==W||entry.cv.height!==H){const cv=this.canvas(W,H),ctx=cv.getContext('2d');entry={cv,ctx,im:ctx.createImageData(W,H),glow:this.canvas(W,H),glowIm:ctx.createImageData(W,H)};slots.set(slot,entry)}
    const out=entry.im.data,glow=entry.glowIm.data,[a,b,c,d,tx,ty]=m,normal=shape.normals,scaleX=Math.hypot(a,b)||1,scaleY=Math.hypot(c,d)||1,ambient=lights.filter(l=>l.type==='ambient').reduce((v,l)=>v+l.k,0),base=Math.min(.96,.83+ambient*.15),candidates=lights.filter(l=>(l.type==='point'||l.type==='window')&&[l.gx,l.gy,l.z].every(Number.isFinite));
    // Light vectors vary smoothly: sample them every two logical pixels, while
    // retaining the full half-pixel alpha mask and surface normals at every pixel.
    const G=4,GW=Math.ceil(W/G),GH=Math.ceil(H/G),samples=candidates.map(l=>{
      const values=new Float32Array(GW*GH*4),col=colors[l.col]||colors.warm;
      for(let cy=0;cy<GH;cy++)for(let cx=0;cx<GW;cx++){const u=(cx*G+G/2)/2,v=(cy*G+G/2)/2,wx=a*u+c*v+tx,wy=b*u+d*v+ty;let gy=info.ground;
        if(side)gy=this.wallFloor(wx);else if(Number.isFinite(info.heightLimit))gy=Math.min(gy,wy+info.heightLimit);else gy+=(wy-gy)*.08;
        const z=Math.max(0,gy-wy),dx=l.gx-wx,dy=l.gy-gy,dz=l.z-z,dist=Math.hypot(dx,dy*1.25,dz),reach=l.reach||l.r,at=(cy*GW+cx)*4;if(dist>=reach)continue;const len=Math.hypot(dx,dy,dz)||1;values[at]=dx/len;values[at+1]=dy/len;values[at+2]=dz/len;values[at+3]=l.k*(1-dist/reach)**2*(l.type==='point'?1.9:.68);
      }return {values,col:col.map(v=>.4+.6*v)};
    });
    shape.worldNormals=shape.worldNormals||new Map();const nk=[a,b,c,d,side,info.flat].join(','),normalKey=shape.worldNormals;let worldNormals=normalKey.get(nk);
    if(!worldNormals){worldNormals=new Float32Array(W*H*3);for(let i=0;i<W*H;i++){const edgeX=normal[i*2],edgeZ=normal[i*2+1];let nx=a/scaleX*edgeX-c/scaleY*edgeZ,ny=.85,nz=-b/scaleX*edgeX+d/scaleY*edgeZ+.12;if(side==='left'){nx+=.9;ny=.4}else if(side==='right'){nx-=.9;ny=.4}else if(info.flat){nx=edgeX*.2;ny=.05;nz=1}const nl=Math.hypot(nx,ny,nz);worldNormals[i*3]=nx/nl;worldNormals[i*3+1]=ny/nl;worldNormals[i*3+2]=nz/nl}if(normalKey.size>=12)normalKey.clear();normalKey.set(nk,worldNormals)}
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x,o=i*4,alpha=shape.alpha[o+3];out[o+3]=glow[o+3]=alpha;if(!alpha)continue;
      const ni=i*3,nx=worldNormals[ni],ny=worldNormals[ni+1],nz=worldNormals[ni+2],si=(Math.floor(y/G)*GW+Math.floor(x/G))*4;let red=base,green=base,blue=base;
      for(const sample of samples){const v=sample.values,diffuse=Math.max(0,nx*v[si]+ny*v[si+1]+nz*v[si+2]),direct=Math.min(1.15,v[si+3]*(.3+diffuse*.7)),col=sample.col;red+=direct*col[0];green+=direct*col[1];blue+=direct*col[2];}
      // Multiply preserves material and ink; a separate low-energy screen pass
      // restores the light-facing highlight without tinting transparent pixels.
      const tone=v=>Math.max(.55,v<=.85?v:.85+(v-.85)/(1+(v-.85)/.15));out[o]=Math.round(tone(red)*255);out[o+1]=Math.round(tone(green)*255);out[o+2]=Math.round(tone(blue)*255);
      const ink=Math.max(.12,Math.min(1,(shape.alpha[o]+shape.alpha[o+1]+shape.alpha[o+2])/300)),lift=[red-base,green-base,blue-base],cap=Math.min(1,.48/Math.max(.001,...lift.map(v=>v*.85)));for(let j=0;j<3;j++)glow[o+j]=Math.round(lift[j]*.85*cap*255*ink);
    }
    entry.ctx.putImageData(entry.im,0,0);entry.glow.getContext('2d').putImageData(entry.glowIm,0,0);entry.cv.highlight=entry.glow;entry.key=key;return entry.cv;
  },
  shadeItem(c,it,lights,highlightOnly=false) {
    const cv=Room.itemCanvas(it),src=this.materialSource(it),shape=this.shape(src,cv.width,cv.height),wall=ITEMS[it.k].layer==='wall',m=[1,0,0,1,it.x,it.y],info={ground:wall?this.wallFloor(it.x+cv.width/2):this.ground(it).y,heightLimit:wall?undefined:this.heightLimit(it,shape),side:wall?(WallMount.side(it)||'back'):'',flat:ITEMS[it.k].layer==='rug'};
    const overlay=this.surfaceOverlay(it,src,cv.width,cv.height,m,info,lights);c.save();c.globalCompositeOperation=highlightOnly?'screen':'multiply';c.drawImage(highlightOnly?overlay.highlight:overlay,it.x,it.y,cv.width,cv.height);c.restore();
  },
  shadeActor(c,actor,entry,lights,highlightOnly=false) {
    const support=this.actorSupport(actor,entry),ground=support?.y??actor.y;
    for(let i=0;i<entry.fragments.length;i++){const f=entry.fragments[i],[sx,sy,sw,sh,dx,dy,dw,dh]=f.rect,[a,b,bx,d,x,y]=f.m,ux=f.src.width/f.nw*dw/sw,vy=f.src.height/f.nh*dh/sh,ox=dx-sx*dw/sw,oy=dy-sy*dh/sh,m=[a*ux,b*ux,bx*vy,d*vy,a*ox+bx*oy+x,b*ox+d*oy+y],overlay=this.surfaceOverlay(actor,f.src,f.nw,f.nh,m,{ground,slot:'fragment:'+i},lights);
      c.save();c.setTransform(this.scale*a,this.scale*b,this.scale*bx,this.scale*d,this.scale*x,this.scale*y);const rect=[sx/f.src.width*overlay.width,sy/f.src.height*overlay.height,sw/f.src.width*overlay.width,sh/f.src.height*overlay.height,dx,dy,dw,dh];c.globalCompositeOperation=highlightOnly?'screen':'multiply';c.drawImage(highlightOnly?overlay.highlight:overlay,...rect);c.restore();}
  },

  materialHighlights(list,lights) {
    if(!this.materialLight){this.materialLight=this.canvas(this.cv.width,this.cv.height);this.materialLightCtx=this.materialLight.getContext('2d')}
    const c=this.materialLightCtx;c.setTransform(this.scale,0,0,this.scale,0,0);c.clearRect(0,0,RW,RH);
    for(const e of list){c.globalCompositeOperation='destination-out';if(e.kind==='item'){const cv=Room.itemCanvas(e.it);c.drawImage(this.source(e.it),e.it.x,e.it.y,cv.width,cv.height)}else if(e.kind==='actor')c.drawImage(this.frameActors.get(e.a).cv,0,0,RW,RH);else continue;
      c.globalCompositeOperation='source-over';if(e.kind==='item')this.shadeItem(c,e.it,lights,true);else this.shadeActor(c,e.a,this.frameActors.get(e.a),lights,true);
    }c.globalCompositeOperation='destination-out';c.drawImage(this.exterior,0,0,RW,RH);c.globalCompositeOperation='source-over';
  },
  lighting(c, lights) {
    const env=Room.env,night=env.h>19.3||env.h<6,dusk=!night&&(env.h>17||env.h<7),own=Room.state===Game.S,ambient=own?Math.max(0,Math.min(1,(Game.S.settings.ambient??60)/100)):0.6,dark=own?Math.max(0,Math.min(.95,Lights.dark||0)):0;
    const daylight=night?.66:dusk?.8:.94,gain=Math.min(1,daylight+ambient*.18*(own?Math.max(0,Lights.lamp):1))*(1-dark*.74),tint=night?[1,.94,1]:dusk?[1,.9,.86]:[1,.985,.95];
    if(!this.tintLayer){this.tintLayer=this.canvas(this.cv.width,this.cv.height);this.tintCtx=this.tintLayer.getContext('2d')}const T=this.tintCtx;T.setTransform(this.scale,0,0,this.scale,0,0);T.globalCompositeOperation='source-over';T.fillStyle='rgb('+tint.map((v,i)=>{const tone=({warm:[1,.96,.89],cool:[.93,.97,1],pink:[1,.91,.96]})[own?Game.S.settings.ambientColor:'warm']||[1,.96,.89],mix=ambient*.35*(own?Lights.lamp:1);return Math.round(v*gain*255*(1-mix+tone[i]*mix))}).join(',')+')';T.fillRect(0,0,RW,RH);T.globalCompositeOperation='destination-out';T.drawImage(this.exterior,0,0,RW,RH);T.globalCompositeOperation='source-over';c.save();c.globalCompositeOperation='multiply';c.drawImage(this.tintLayer,0,0,RW,RH);c.restore();
    const L=this.lightCtx;L.setTransform(this.scale,0,0,this.scale,0,0);L.clearRect(0,0,RW,RH);const colors={warm:'255,174,80',cool:'122,170,255',pink:'255,126,165'};
    for(const l of lights){if(l.type!=='point')continue;const r=Math.min(150,l.r),g=L.createRadialGradient(l.x,l.y,.5,l.x,l.y,r);g.addColorStop(0,'rgba('+(colors[l.col]||colors.warm)+','+Math.min(.64,(night?.5:.25)*l.k)+')');g.addColorStop(.42,'rgba('+(colors[l.col]||colors.warm)+','+(.12*l.k)+')');g.addColorStop(1,'rgba(0,0,0,0)');L.fillStyle=g;L.fillRect(l.x-r,l.y-r,r*2,r*2)}
    // The floor shadow attenuates direct light, but never darkens an object standing over it.
    L.save();L.globalCompositeOperation='destination-out';L.globalAlpha=.72;L.drawImage(this.shadow,0,0,RW,RH);L.drawImage(this.wallShadow,0,0,RW,RH);L.globalAlpha=1;L.drawImage(this.exterior,0,0,RW,RH);for(const e of this.surfaceDrawList||[]){if(e.kind==='item'){const cv=Room.itemCanvas(e.it);L.drawImage(this.source(e.it),e.it.x,e.it.y,cv.width,cv.height)}else if(e.kind==='actor')L.drawImage(this.frameActors.get(e.a).cv,0,0,RW,RH)}L.restore();
    c.save();c.globalCompositeOperation='screen';c.drawImage(this.light,0,0,RW,RH);c.drawImage(this.materialLight,0,0,RW,RH);
    for(const l of lights){if(l.type!=='point'||!l.emissive)continue;const r=l.col==='warm'?5:3,g=c.createRadialGradient(l.x,l.y,0,l.x,l.y,r);g.addColorStop(0,'rgba('+(colors[l.col]||colors.warm)+','+Math.min(.32,l.k*.25)+')');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(l.x-r,l.y-r,r*2,r*2)}c.restore();
    const vignette=c.createRadialGradient(120,92,63,120,92,147);vignette.addColorStop(0,'rgba(8,7,17,0)');vignette.addColorStop(1,'rgba(8,7,17,.24)');c.fillStyle=vignette;c.fillRect(0,0,RW,RH);
  },

  render() {
    if (!this.ready || !this.cv || !this.enabled) return;
    const start = performance.now(), c = this.ctx, S = this.scale;
    c.setTransform(S, 0, 0, S, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, RW, RH);
    
    // 保持像素插值平滑或關閉（此處關閉可減少插值計算開銷）
    c.imageSmoothingEnabled = false;

    const th = THEMES.lantern_night, isTheme = Room.state.wp === th.wp && Room.state.fl === th.fl;
    if (isTheme) {
      const img = this.images['room-shell'], seam = .474;
      c.drawImage(img, 0, 0, img.width, img.height * seam, 0, 0, RW, 96);
      c.drawImage(img, 0, img.height * seam, img.width, img.height * (1 - seam), 0, 96, RW, RH - 96);
    } else c.drawImage(Room.bg, 0, 0, RW, RH);

    const list = this.surfaceDrawList = Room.drawList();
    for(const e of list)if(e.kind==='item')this.source(e.it);
    this.frameActors=new Map();for(const e of list)if(e.kind==='actor')this.frameActors.set(e.a,this.actorFrame(e.a));
    const lights = this.frameLights = this.lights();
    for (const e of list) if (e.kind === 'item' && ITEMS[e.it.k].layer === 'rug') {this.drawItem(c,e.it);this.shadeItem(c,e.it,lights);}

    this.windowLight(c,lights);
    this.shadows(c, list, lights);

    for (const e of list) {
      if (e.kind === 'item') {
        if (ITEMS[e.it.k].layer !== 'rug') { this.drawItem(c,e.it); this.shadeItem(c,e.it,lights); }
      } else if (e.kind === 'actor') {
        const support=this.actorSupport(e.a,this.frameActors.get(e.a));if(support?.surface)this.footprint(c,{...support,y:e.a.y-.3},.12*this.selfLight(support,lights));
        c.drawImage(this.frameActors.get(e.a).cv,0,0,RW,RH);this.shadeActor(c,e.a,this.frameActors.get(e.a),lights);
      } else Room.drawGift(this.proxy(c, 'prop'), e.g);
    }

    for (const p of Room.particles) {
      const cv = SPR.get(p.spr);
      c.globalAlpha = Math.max(0, (p.alpha || 1) * (1 - p.life / p.max));
      c.drawImage(cv, p.x, p.y, cv.width, cv.height);
    }
    c.globalAlpha = 1;

    this.clearFloorMask(list);
    this.exteriorMask(list);
    this.materialHighlights(list,lights);
    this.lighting(c, lights);

    if (lights.some(l=>l.type==='point')) {
      c.fillStyle = 'rgba(255,224,166,.35)';
      for (let i = 0; i < 13; i++) {
        const x = 35 + md(i * 31 + Math.sin(Room.t * .22 + i) * 3, 172),
              y = 28 + md(i * 17 + Room.t * (.5 + i % 3 * .18), 118);
        c.fillRect(x, y, .22, .22);
      }
    }

    if (!Room.edit && Room.state === Game.S) {
      Life.drawBubbles(this.proxy(c, 'prop'));
      Social.drawMarks(this.proxy(c, 'prop'));
    }
    if (Room.edit) {
      const it = Room.sel || Room.hover;
      if (it) Room.outline(this.proxy(c, 'prop'), it, Room.sel ? '#ffe3a3' : 'rgba(255,227,163,.6)');
    }

    this.frames++;
    this.ms = this.ms * .95 + (performance.now() - start) * .05;
  },

  toggle() {
    this.enabled = !this.enabled;
    this.sync();
    this.controls();
  },

  sync() {
    if (!this.cv) return;
    this.cv.hidden = !this.enabled || !this.ready;
    Room.cv.style.opacity = this.enabled && this.ready ? '0' : '1';
    document.body.classList.toggle('hd2d-on', this.enabled && this.ready);
  },

  time(mode) {
    Game.S.settings.timeMode = mode;
    Room.computeEnv(Game.S.settings);
    Game.save();
    this.controls();
  },

  controls() {
    if (!this.bar) return;
    this.bar.replaceChildren(
      h('div', { class: 'hd-title' },
        h('b', { text: 'HD-2D · 團圓夜' }),
        h('span', { text: window.NOOK_HD_DEMO ? '體驗進度獨立保存在本機' : '第一階段美術試作' })
      ),
      h('div', { class: 'hd-actions' },
        ...[["day", "日光"], ["dusk", "黃昏"], ["night", "月夜"]].map(([mode, n]) =>
          h('button', {
            class: 'hd-btn' + (Game.S.settings.timeMode === mode ? ' active' : ''),
            onclick: () => this.time(mode)
          }, n)
        ),
        h('button', {
          class: 'hd-btn',
          onclick: () => {
            for (const it of Game.S.items) if (ITEMS[it.k].light && ITEMS[it.k].toggle) it.on = !it.on;
            Game.save();
          }
        }, '切換燈光'),
        h('button', { class: 'hd-btn', onclick: () => UI.openWin('avatar') }, '換裝'),
        h('button', { class: 'hd-btn', onclick: () => UI.setEdit(!Room.edit) }, '佈置'),
        h('button', { class: 'hd-btn', onclick: () => this.toggle() }, this.enabled ? '比較原版' : '返回 HD-2D')
      )
    );
  },

  attach() {
    if(this.cv)return;
    const wrap = Room.cv.parentElement;
    // 依據 scale: 2 初始化畫布大小（480x360）
    this.cv = this.canvas(RW * this.scale, RH * this.scale);
    this.cv.id = 'hd2d-room';
    this.cv.setAttribute('aria-hidden', 'true');
    wrap.insertBefore(this.cv, Room.cv.nextSibling);
    this.ctx = this.cv.getContext('2d');
    this.light = this.canvas(this.cv.width, this.cv.height);
    this.lightCtx = this.light.getContext('2d');
    this.bar = h('section', { class: 'hd-controls' });
    document.querySelector('.stage').append(this.bar);
    this.controls();
    this.sync();
    this.load().then(() => {
      this.sync();
      if (this.failed) UI.toast('HD 素材載入失敗，請重新整理；暫時使用原版畫面', 'i_view', 6);
    });
  }
};

(function() {
  const newState = Game.newState.bind(Game);
  Game.newState = function() {
    const s = newState();
    if (!window.NOOK_HD_DEMO) return s;
    const t = THEMES.lantern_night;
    s.themes.push('lantern_night');
    s.wp = t.wp; s.fl = t.fl; s.view = t.view;
    s.items = this.buildLayout(t.layout, () => s.nextUid++, k => k);
    s.ownWP.push(t.wp); s.ownFL.push(t.fl);
    s.settings.timeMode = 'night';
    s.settings.hd2d = true;
    s.seenIntro = true;
    s.coins = 500;
    return s;
  };
  const init = UI.init.bind(UI);
  UI.init = function() {
    const r = init();
    if (window.NOOK_HD_DEMO || Game.S.settings.hd2d) HD2D.attach();
    return r;
  };
  const render = Room.render.bind(Room);
  Room.render = function(dt) {
    if (!HD2D.ready || !HD2D.enabled || !HD2D.cv || this.ctx !== this.cv.getContext('2d')) return render(dt);
    this.t += dt;
    this.syncChildren();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life > p.max) { this.particles.splice(i, 1); continue; }
      p.x += p.vx * dt + (p.wob ? Math.sin(p.life * 6) * p.wob * dt : 0);
      p.y += p.vy * dt;
      p.vy += p.grav * dt;
    }
    HD2D.render();
  };
  const hit=Room.hit.bind(Room);
  Room.hit=function(x,y,opts={}){
    if(!HD2D.ready||!HD2D.enabled)return hit(x,y,opts);
    const original=hit(x,y,opts);if(original&&original.kind==='actor')return original;
    const list=this.drawList();for(let i=list.length-1;i>=0;i--){const e=list[i];if(e.kind==='actor'){if(!opts.itemsOnly&&e.a.hit(x,y))return e;continue}if(e.kind==='gift'){if(original?.kind==='gift')return original;continue}
      const it=e.it,cv=this.itemCanvas(it);if(x<it.x||y<it.y||x>=it.x+cv.width||y>=it.y+cv.height)continue;
      const shape=HD2D.shape(HD2D.source(it),cv.width,cv.height),px=Math.floor((x-it.x)*2),py=Math.floor((y-it.y)*2),a=shape.alpha[(py*shape.mask.width+px)*4+3];
      if(a>48||(ITEMS[it.k].window&&!WallMount.side(it)))return e;
    }
    return Mobile.on&&Mobile.touch?original:null;
  };
  const settings = UI.w_settings.bind(UI);
  UI.w_settings = function() {
    const out = settings();
    out.unshift(h('section', { class: 'settings-card' },
      h('b', { text: 'HD-2D 美術試作' }),
      h('p', { class: 'hint', text: '團圓夜套組支援新的家具與房間材質；所有造型與寵物動作可使用新的材質光照。' }),
      h('button', {
        class: 'chip',
        onclick: () => {
          Game.S.settings.hd2d = !Game.S.settings.hd2d;
          if (!HD2D.cv) HD2D.attach();
          HD2D.enabled = !!Game.S.settings.hd2d;
          HD2D.sync();
          Game.save();
          UI.refresh('settings');
        }
      }, Game.S.settings.hd2d ? '關閉 HD-2D' : '啟用 HD-2D')
    ));
    return out;
  };
  if (window.NOOK_HD_DEMO) {
    Cloud.init = () => Promise.resolve();
    Cowork.init = () => {};
    UI.w_account = () => [h('p', { text: '這是 HD-2D 體驗版，進度只保存在本機，不會讀取或覆寫正式帳號。' })];
  }
})();