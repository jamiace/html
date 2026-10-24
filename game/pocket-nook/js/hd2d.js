/* HD-2D first playable slice. World coordinates and save rules stay with the game. */
const HD2D = {
  // 保留效能修正版的 2 倍畫布與 CSS 硬體縮放。
  // 光影改用快取遮罩與幾何投影，不提高解析度，也不使用即時模糊。
  scale: 2,
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
  wallSource(it) {
    const side = WallMount.side(it), raw = WallMount.raw(it), back = {...it, wall:'back', x:0, y:0}, d = ITEMS[it.k];
    const dynamic = it.shake || it.broken || d.window || d.clock || d.calendar || d.anim || d.tv || d.screen || d.fish || d.flicker || d.fire || d.glow;
    this.wallFaces = this.wallFaces || new Map();
    const id = it.uid + ':' + it.k, stamp = [dynamic ? Math.floor(Room.t * 10) : 0, !!it.on, !!it.closed, !!it.flip, !!it.broken, !!it.wilt, Math.ceil(it.dust||0), Room.state.view, Math.round(Room.env.h * 60), Room.env.weather].join('|');
    let entry = this.wallFaces.get(id);
    if (!entry || entry.stamp !== stamp || entry.raw !== raw) {
      const front = this.canvas(raw.width * this.scale, raw.height * this.scale), c = front.getContext('2d');
      c.setTransform(this.scale, 0, 0, this.scale, 0, 0); this.drawItem(c, back);
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
          const image=self.itemSources.get(src)||self.detail(src,kind);let args;
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
    const step=Math.max(1,Math.ceil(points.length/120)),outline=points.filter((_,i)=>i%step===0),result={points:outline,bottom:(maxY+1)/S,footX:count?sum/count:w/2,width:Math.max(1,(maxX-minX+1)/S),top:minY/S,mask:cv,alpha:d};map.set(key,result);return result;
  },
  ground(it) { const root=this.root(it),cv=Room.itemCanvas(root),shape=this.shape(this.source(root),cv.width,cv.height);return {x:root.x+shape.footX,y:root.y+shape.bottom,uid:root.uid}; },

  lights() {
    const list=Room.collectLights().map(l=>({...l,type:l.r>=180?'ambient':'point',casts:false,emissive:l.r<180})),used=new Set();
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
  effectiveLight(caster,lights) {
    let sum=0,gx=0,gy=0,z=0,vx=0,vy=0;
    for(const l of lights){if(!l.casts||l.rootUid===caster.rootUid)continue;const dx=caster.x-l.gx,dy=caster.y-l.gy,dist=Math.hypot(dx,dy*1.25),reach=l.reach||l.r;
      if(dist>=reach)continue;const weight=l.k*(1-dist/reach)**2;if(weight<.008)continue;sum+=weight;gx+=l.gx*weight;gy+=l.gy*weight;z+=l.z*weight;const len=Math.hypot(dx,dy)||1;vx+=dx/len*weight;vy+=dy/len*weight;
    }
    if(sum<.012)return null;return {gx:gx/sum,gy:gy/sum,z:z/sum,k:sum,coherence:Math.min(1,Math.hypot(vx,vy)/sum)};
  },
  hull(points) {
    if(points.length<3)return[];const p=points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),lower=[],upper=[];
    for(const q of p){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),q)<=0)lower.pop();lower.push(q)}for(let i=p.length-1;i>=0;i--){const q=p[i];while(upper.length>1&&cross(upper.at(-2),upper.at(-1),q)<=0)upper.pop();upper.push(q)}lower.pop();upper.pop();return lower.concat(upper);
  },
  projectShadow(caster,light) {
    if(!light||light.coherence<.1)return[];const points=[],limit=26*light.coherence;
    // Above-emitter pixels cannot hit the floor. Low lamps must not project an entire standing head.
    for(const [x,y]of caster.points){const receiverY=Number.isFinite(caster.heightLimit)?Math.min(caster.y,y+caster.heightLimit):caster.y,height=receiverY-y,dy=receiverY-light.gy;if(height<-.8||height>=light.z*.92)continue;const factor=Math.min(Math.max(0,height)/(light.z-Math.max(0,height)),limit/Math.max(1,Math.hypot(x-light.gx,dy)));
      const px=x+(x-light.gx)*factor,py=receiverY+dy*factor,depth=Math.max(.5,Math.min(2.2,caster.width*.055))*(1-Math.min(.7,factor*.15));points.push([px,py-depth],[px,py+depth]);}
    return this.hull(points);
  },
  wallProjection(caster,light) {
    const groups={back:[],left:[],right:[]};if(!light||light.coherence<.1)return groups;const slope=(R.wx0-R.fxf0)/(R.fy1-R.wy1);
    for(const [x,y]of caster.points){const gy=Number.isFinite(caster.heightLimit)?Math.min(caster.y,y+caster.heightLimit):caster.y,z=gy-y;if(z<=0)continue;
      const dx=x-light.gx,dy=gy-light.gy,dz=z-light.z,floor=dz<0?-z/dz:Infinity;
      const planes=[['back',R.wy1-gy,dy],['left',R.wx0+slope*R.wy1-x-slope*gy,dx+slope*dy],['right',R.wx1-slope*R.wy1-x+slope*gy,dx-slope*dy]];
      let best=null;for(const [side,n,d]of planes){if(Math.abs(d)<1e-6)continue;const t=n/d;if(t<=.001||t>=floor||(best&&t>=best.t))continue;const px=x+dx*t,py=gy+dy*t,pz=z+dz*t;
        if(pz<0||pz>py-R.wy0||py<R.wy1-.01||py>R.fy1+.01||(side==='back'&&(px<R.wx0||px>R.wx1)))continue;
        if(Math.hypot(px-x,(py-gy)*1.25)>140)continue;best={side,t,point:[px,py-pz]};}
      if(best)groups[best.side].push(best.point);
    }
    for(const side in groups)groups[side]=this.hull(groups[side]);return groups;
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
    return {id:actor.pid!=null?'pet:'+actor.pid:'actor',actor,x:seated?ground.x:actor.x,y:ground.y,width:maxX-minX,points,rootUid:support?.uid,elevation:Math.max(0,ground.y-actor.y),contact:!support,surface:!!on&&!j};
  },
  contact(c,x,y,rx,ry,alpha) {
    if(alpha<=0)return;c.save();c.translate(x,y);c.scale(Math.max(.5,rx),Math.max(.4,ry));const g=c.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,'rgba(17,11,24,'+alpha+')');g.addColorStop(.55,'rgba(17,11,24,'+(alpha*.55)+')');g.addColorStop(1,'rgba(17,11,24,0)');c.fillStyle=g;c.fillRect(-1,-1,2,2);c.restore();
  },
  shadows(c,list,lights) {
    if(!this.shadow){this.shadow=this.canvas(this.cv.width,this.cv.height);this.shadowCtx=this.shadow.getContext('2d')}
    if(!this.wallShadow){this.wallShadow=this.canvas(this.cv.width,this.cv.height);this.wallShadowCtx=this.wallShadow.getContext('2d')}const wctx=this.wallShadowCtx;wctx.setTransform(this.scale,0,0,this.scale,0,0);wctx.clearRect(0,0,RW,RH);
    const q=this.shadowCtx;q.setTransform(this.scale,0,0,this.scale,0,0);q.clearRect(0,0,RW,RH);q.save();this.floorClip(q);const casters=[],roots=new Map();
    for(const e of list)if(e.kind==='item'&&Room.layerOf(e.it)==='floor'&&e.it.p==null){const it=e.it,cv=Room.itemCanvas(it),shape=this.shape(this.source(it),cv.width,cv.height),foot=this.ground(it),caster={id:'item:'+it.uid,x:foot.x,y:foot.y,width:shape.width,rootUid:it.uid,contact:true,heightLimit:this.heightLimit(it,shape),points:shape.points.map(p=>[it.x+p[0],it.y+p[1]])};casters.push(caster);roots.set(it.uid,caster)}
    for(const e of list)if(e.kind==='item'&&e.it.p!=null){const root=this.root(e.it),caster=roots.get(root.uid);if(caster){const it=e.it,cv=Room.itemCanvas(it),shape=this.shape(this.source(it),cv.width,cv.height);caster.points.push(...shape.points.map(p=>[it.x+p[0],it.y+p[1]]))}}
    for(const e of list)if(e.kind==='actor'){const caster=this.actorSupport(e.a,this.frameActors.get(e.a));if(caster)casters.push(caster)}
    this.shadowPlans=[];
    for(const caster of casters){const light=this.effectiveLight(caster,lights),polygon=this.projectShadow(caster,light),walls=this.wallProjection(caster,light);this.shadowPlans.push({walls,id:caster.id,x:caster.x,y:caster.y,contact:caster.contact,surface:!!caster.surface,elevation:caster.elevation||0,light,polygon});
      if(light)for(const side of ['back','left','right']){const p=walls[side];if(p.length<3)continue;wctx.save();this.wallClip(wctx,side);wctx.globalAlpha=Math.min(1,light.k/.22)*light.coherence*.8;wctx.fillStyle='#15101d';wctx.beginPath();p.forEach((v,i)=>wctx[i?'lineTo':'moveTo'](...v));wctx.closePath();wctx.fill();wctx.restore();}
      if(polygon.length>2){const cx=polygon.reduce((v,p)=>v+p[0],0)/polygon.length,cy=polygon.reduce((v,p)=>v+p[1],0)/polygon.length;
        q.globalAlpha=Math.min(1,light.k/.22)*light.coherence;q.fillStyle='rgba(21,16,29,.22)';q.beginPath();polygon.forEach((p,i)=>q[i?'lineTo':'moveTo'](cx+(p[0]-cx)*1.035,cy+(p[1]-cy)*1.035));q.closePath();q.fill();q.fillStyle='#15101d';q.beginPath();polygon.forEach((p,i)=>q[i?'lineTo':'moveTo'](...p));q.closePath();q.fill();
      }
    }
    q.restore();q.globalAlpha=1;c.save();c.globalAlpha=Room.env.dark>.1?.18:.14;c.drawImage(this.wallShadow,0,0,RW,RH);c.restore();c.save();this.floorClip(c);c.globalAlpha=Room.env.dark>.1?.18:.14;c.drawImage(this.shadow,0,0,RW,RH);c.globalAlpha=1;
    for(const a of casters)if(a.contact){const height=a.elevation||0,rx=a.actor?(a.actor.pid!=null?4.2:4.6)*(1+height*.014):Math.max(2,a.width*.36),ry=a.actor?1.3+height*.014:1.5,alpha=(a.actor?.jump?.t!=null?.17*Math.exp(-height/14):.19);this.contact(c,a.x,a.y,rx,ry,alpha)}c.restore();
  },
  wallContact(c,it) {
    const d=ITEMS[it.k];if(d.layer!=='wall')return;const cv=Room.itemCanvas(it),src=this.source(it),side=WallMount.side(it);c.save();c.beginPath();if(side==='left'){c.moveTo(6,12);c.lineTo(30,12);c.lineTo(30,96);c.lineTo(6,170)}else if(side==='right'){c.moveTo(210,12);c.lineTo(234,12);c.lineTo(234,170);c.lineTo(210,96)}else c.rect(30,12,180,84);c.closePath();c.clip();c.globalAlpha=.13;c.drawImage(this.mask(src),it.x+(side==='left'?-.5:.5),it.y+.65,cv.width,cv.height);c.restore();
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

  lighting(c, lights) {
    const env=Room.env,night=env.h>19.3||env.h<6,dusk=!night&&(env.h>17||env.h<7),own=Room.state===Game.S,ambient=own?Math.max(0,Math.min(1,(Game.S.settings.ambient??60)/100)):0.6,dark=own?Math.max(0,Math.min(.95,Lights.dark||0)):0;
    const daylight=night?.66:dusk?.8:.94,gain=Math.min(1,daylight+ambient*.18*(own?Math.max(0,Lights.lamp):1))*(1-dark*.74),tint=night?[1,.94,1]:dusk?[1,.9,.86]:[1,.985,.95];
    c.save();c.globalCompositeOperation='multiply';c.fillStyle='rgb('+tint.map((v,i)=>{const tone=({warm:[1,.96,.89],cool:[.93,.97,1],pink:[1,.91,.96]})[own?Game.S.settings.ambientColor:'warm']||[1,.96,.89],mix=ambient*.35*(own?Lights.lamp:1);return Math.round(v*gain*255*(1-mix+tone[i]*mix))}).join(',')+')';c.fillRect(0,0,RW,RH);c.restore();
    const L=this.lightCtx;L.setTransform(this.scale,0,0,this.scale,0,0);L.clearRect(0,0,RW,RH);const colors={warm:'255,174,80',cool:'122,170,255',pink:'255,126,165'};
    for(const l of lights){if(l.type!=='point')continue;const r=Math.min(150,l.r),g=L.createRadialGradient(l.x,l.y,.5,l.x,l.y,r);g.addColorStop(0,'rgba('+(colors[l.col]||colors.warm)+','+Math.min(.64,(night?.5:.25)*l.k)+')');g.addColorStop(.42,'rgba('+(colors[l.col]||colors.warm)+','+(.12*l.k)+')');g.addColorStop(1,'rgba(0,0,0,0)');L.fillStyle=g;L.fillRect(l.x-r,l.y-r,r*2,r*2)}
    // The floor shadow attenuates direct light, but never darkens an object standing over it.
    L.save();L.globalCompositeOperation='destination-out';L.globalAlpha=.72;L.drawImage(this.shadow,0,0,RW,RH);L.drawImage(this.wallShadow,0,0,RW,RH);L.restore();
    c.save();c.globalCompositeOperation='screen';c.drawImage(this.light,0,0,RW,RH);
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

    const list = Room.drawList();
    for(const e of list)if(e.kind==='item')this.source(e.it);
    this.frameActors=new Map();for(const e of list)if(e.kind==='actor')this.frameActors.set(e.a,this.actorFrame(e.a));
    const lights = this.lights();
    for (const e of list) if (e.kind === 'item' && ITEMS[e.it.k].layer === 'rug') this.drawItem(c, e.it);

    this.windowLight(c,lights);
    this.shadows(c, list, lights);

    for (const e of list) {
      if (e.kind === 'item') {
        if (ITEMS[e.it.k].layer !== 'rug') { this.wallContact(c,e.it); this.drawItem(c,e.it); }
      } else if (e.kind === 'actor') {
        const support=this.actorSupport(e.a,this.frameActors.get(e.a));if(support?.surface)this.contact(c,e.a.x,e.a.y-.3,3.6,.75,.14);
        c.drawImage(this.frameActors.get(e.a).cv,0,0,RW,RH);
      } else Room.drawGift(this.proxy(c, 'prop'), e.g);
    }

    for (const p of Room.particles) {
      const cv = SPR.get(p.spr);
      c.globalAlpha = Math.max(0, (p.alpha || 1) * (1 - p.life / p.max));
      c.drawImage(cv, p.x, p.y, cv.width, cv.height);
    }
    c.globalAlpha = 1;

    this.clearFloorMask(list);
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