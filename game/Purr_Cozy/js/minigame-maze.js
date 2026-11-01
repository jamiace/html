/* 0.92.29 Purr Cozy tilt maze (cozy_maze_1..5). Each furniture ID now has its own board:
   1 圓弧 rings · 2 雙層 rings with blocking spokes · 3 星形 rings with holes · 4 格柵 7×7 grid · 5 復古 8×8 labyrinth with holes.
   Walls are capsules (arcs are short capsule chains, so wall ends are rounded and cannot be slipped through).
   Tilt comes from a drag joystick, arrow/WASD keys, or the device orientation sensor (permission, calibration, fallback). */
const MiniMaze=(()=>{
 const P=MiniPhys,W=360,H=400,TOP=40,R=7,WR=3,ACC=560,MAXV=520,D=Math.PI/180;
 const WALL={e:.32,f:.06};
 const t=(k,a)=>MiniHost.t(k,a);
 // ---------- level builders ----------
 function rings(def){const L={shape:'circle',walls:[],paths:[],holes:def.holes||[],goal:{x:180,y:180,r:18},start:def.start,stars:def.stars};
  const ring=(r,gaps=[])=>{if(!gaps.length){const p=P.arc(180,180,r,0,Math.PI*2,.05);L.paths.push(p);P.poly(L.walls,p,WR,WALL);return}
   const g=gaps.map(([c,w])=>[(c*D-w/2+Math.PI*4)%(Math.PI*2),w]).sort((a,b)=>a[0]-b[0]);
   g.forEach(([a0,w],i)=>{const next=g[(i+1)%g.length][0]+(i+1===g.length?Math.PI*2:0),from=a0+w;if(next-from<.02)return;const p=P.arc(180,180,r,from,next,.05);L.paths.push(p);P.poly(L.walls,p,WR,WALL)})};
  ring(150);for(const[r,g]of def.rings)ring(r,g);
  for(const[a,r0,r1]of def.spokes||[]){const p=[[180+r0*Math.cos(a*D),180+r0*Math.sin(a*D)],[180+r1*Math.cos(a*D),180+r1*Math.sin(a*D)]];L.paths.push(p);P.poly(L.walls,p,WR,WALL)}
  L.holes=L.holes.map(([a,r])=>({x:180+r*Math.cos(a*D),y:180+r*Math.sin(a*D),r:9}));return L}
 function grid(n,size,seed,holeCount){const o=(360-n*size)/2,rnd=P.rng(seed),E=[],S=[],seen=[];for(let i=0;i<n*n;i++){E[i]=true;S[i]=true;seen[i]=false}
  const id=(x,y)=>y*n+x,stack=[[0,0]];seen[0]=true;
  while(stack.length){const[x,y]=stack[stack.length-1],nb=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>[x+dx,y+dy]).filter(([a,b])=>a>=0&&b>=0&&a<n&&b<n&&!seen[id(a,b)]);
   if(!nb.length){stack.pop();continue}const[a,b]=nb[Math.floor(rnd()*nb.length)];if(a>x)E[id(x,y)]=false;if(a<x)E[id(a,b)]=false;if(b>y)S[id(x,y)]=false;if(b<y)S[id(a,b)]=false;seen[id(a,b)]=true;stack.push([a,b])}
  const L={shape:'square',walls:[],paths:[],holes:[],box:[o,o,n*size],cells:{n,size,o,E,S}};const add=p=>{L.paths.push(p);P.poly(L.walls,p,WR,WALL)};
  add([[o,o],[o+n*size,o],[o+n*size,o+n*size],[o,o+n*size],[o,o]]);
  // merge wall runs for clean drawing and fewer capsules
  for(let y=0;y<n;y++){let run=null;for(let x=0;x<=n;x++){const wall=x<n&&y<n-1&&S[id(x,y)];if(wall&&run==null)run=x;if(!wall&&run!=null){add([[o+run*size,o+(y+1)*size],[o+x*size,o+(y+1)*size]]);run=null}}}
  for(let x=0;x<n-1;x++){let run=null;for(let y=0;y<=n;y++){const wall=y<n&&E[id(x,y)];if(wall&&run==null)run=y;if(!wall&&run!=null){add([[o+(x+1)*size,o+run*size],[o+(x+1)*size,o+y*size]]);run=null}}}
  const c=(x,y)=>({x:o+(x+.5)*size,y:o+(y+.5)*size});L.start=c(0,0);L.goal={...c(n-1,n-1),r:Math.min(18,size*.38)};
  if(holeCount){// holes go in branch cells next to the solution path, never on it
   const nbrs=i=>{const x=i%n,y=Math.floor(i/n),out=[];if(x<n-1&&!E[i])out.push(i+1);if(x>0&&!E[i-1])out.push(i-1);if(y<n-1&&!S[i])out.push(i+n);if(y>0&&!S[i-n])out.push(i-n);return out};
   const prev=new Map([[0,-1]]),q=[0];while(q.length){const i=q.shift();for(const j of nbrs(i))if(!prev.has(j)){prev.set(j,i);q.push(j)}}
   const path=new Set();for(let i=n*n-1;i>=0;i=prev.get(i))path.add(i);
   const cand=[...Array(n*n).keys()].filter(i=>!path.has(i)&&i!==0&&nbrs(i).some(j=>path.has(j)));
   const pick=cand.sort((a,b)=>((a*7919+seed)%97)-((b*7919+seed)%97)).slice(0,holeCount);
   L.holes=pick.map(i=>({...c(i%n,Math.floor(i/n)),r:11}));L.solution=[...path]}
  return L}
 const LEVELS=[
  ()=>rings({rings:[[118,[[-90,.44]]],[86,[[90,.52]]],[54,[[-90,.64]]]],spokes:[[0,86,118],[180,54,86]],start:{x:314,y:180}}),
  ()=>rings({rings:[[116,[[30,.42],[210,.42]]],[82,[[-60,.5],[200,.5]]],[48,[[90,.72]]]],spokes:[[-90,116,150],[90,116,150],[100,82,116],[30,48,82]],start:{x:313,y:180}}),
  ()=>rings({rings:[[112,[[-90,.46]]],[74,[[90,.62]]]],holes:[[-40,123],[-140,123],[0,101],[180,101],[45,123]],start:{x:311,y:180},stars:true}),
  ()=>grid(7,44,40961,0),
  ()=>grid(8,38,52507,7)];
 const cache=[];const level=v=>cache[v]||(cache[v]=LEVELS[v]());
 const THEMES=[{board:['#9b6b4c','#6e4630'],floor:'#5b3a2a',wall:'#f2d49b',edge:'#7a4f33',goal:'#8ed2b3'},{board:['#8a7a68','#5f5244'],floor:'#4b4036',wall:'#e8e2cf',edge:'#5e5446',goal:'#9fd4e6'},{board:['#4b4677','#2f2b55'],floor:'#241f44',wall:'#f5e3b3',edge:'#2a2550',goal:'#ffd97a'},{board:['#7c9a6a','#55704a'],floor:'#3f5536',wall:'#f3ecd2',edge:'#4a5c3c',goal:'#f6c27a'},{board:['#a0714d','#6b4429'],floor:'#4e2f1b',wall:'#e9c991',edge:'#6b4429',goal:'#9ed0a0'}];
 // ---------- device orientation ----------
 async function motion(s,host){const g=s.g;if(g.motion){stopMotion(s);host.syncControls(s);return}
  try{const D=window.DeviceOrientationEvent;if(!window.isSecureContext||!D)throw Error('unsupported');if(typeof D.requestPermission==='function'&&await D.requestPermission()!=='granted')throw Error('denied');
   if(host.session!==s||!host.valid())return;g.base=null;g.raw={x:0,y:0};
   g.sensor=e=>{if(host.session!==s||!Number.isFinite(e.gamma)||!Number.isFinite(e.beta))return;const a=(screen.orientation?.angle??window.orientation??0)*D2R;if(!g.base)g.base={g:e.gamma,b:e.beta};
    const x=(e.gamma-g.base.g)/18,y=(e.beta-g.base.b)/18,rx=x*Math.cos(a)+y*Math.sin(a),ry=y*Math.cos(a)-x*Math.sin(a),dz=v=>Math.abs(v)<.04?0:v;g.raw={x:P.clamp(dz(rx),-1,1),y:P.clamp(dz(ry),-1,1)};g.seen=true};
   window.addEventListener('deviceorientation',g.sensor);g.motion=true;g.seen=false;host.syncControls(s);host.say(s,t('motionOn'));
   setTimeout(()=>{if(host.session===s&&g.motion&&!g.seen){stopMotion(s);UI.toast(t('noMotion'),'i_sparkle',4);host.syncControls(s)}},2500)}
  catch{UI.toast(t('noMotion'),'i_sparkle',4)}}
 const D2R=Math.PI/180;
 function stopMotion(s){const g=s.g;if(g?.sensor)window.removeEventListener('deviceorientation',g.sensor);if(g){g.sensor=null;g.motion=false;g.raw={x:0,y:0}}}
 function respawn(g){const st=g.L.start;g.ball={x:st.x,y:st.y,vx:0,vy:0,r:R};g.mode='play';g.sink=0;g.appear=.35}
 const game={
  size:{w:W,h:H},dt:1/240,help:()=>'mazeHelp',
  create(s){const L=level(s.variant),g={L,th:THEMES[s.variant],tilt:{x:0,y:0},target:{x:0,y:0},keys:new Set(),joy:null,motion:false,raw:{x:0,y:0},falls:0,time:0,started:false,best:MiniHost.record(s.k).mazeBest,t:0,hitCd:0};respawn(g);g.appear=0;return g},
  dispose(s){stopMotion(s)},
  step(s,dt,host){const g=s.g,b=g.ball;g.t+=dt;g.hitCd-=dt;if(g.appear>0)g.appear-=dt;
   // input -> target tilt -> eased tilt (no instant jumps)
   let tx=0,ty=0;if(g.motion){tx=g.raw.x;ty=g.raw.y}else if(g.joy){tx=g.joy.dx;ty=g.joy.dy}else if(g.keys.size){tx=(g.keys.has('R')?1:0)-(g.keys.has('L')?1:0);ty=(g.keys.has('D')?1:0)-(g.keys.has('U')?1:0);const l=Math.hypot(tx,ty);if(l>1){tx/=l;ty/=l}}
   const k=Math.min(1,dt*(g.motion?14:9));g.tilt.x+=(tx-g.tilt.x)*k;g.tilt.y+=(ty-g.tilt.y)*k;
   if(g.mode==='sink'){g.sink+=dt;const tg=g.sinkTo;b.x+=(tg.x-b.x)*Math.min(1,dt*12);b.y+=(tg.y-b.y)*Math.min(1,dt*12);
    if(g.sink>=.45){if(g.sinkGoal){g.mode='done';const best=g.best==null?g.time:Math.min(g.best,g.time);host.win(s);host.end(s,{field:g.time>0?'mazeBest':null,value:Math.round(g.time*10)/10,lower:true,lines:[t('mazeTime',[MiniHost.time(g.time)]),t('mazeFalls',[g.falls]),t('bestLine',[MiniHost.time(best)])],say:t('mazeWin')});MiniAudio.sfx('win')}else respawn(g)}return}
   if(g.mode!=='play'||s.over)return;
   if(!g.started&&Math.hypot(g.tilt.x,g.tilt.y)>.08)g.started=true;if(g.started)g.time+=dt;
   const n=P.substeps(b,dt,R*.45),h=dt/n;
   for(let i=0;i<n;i++){b.vx+=g.tilt.x*ACC*h;b.vy+=g.tilt.y*ACC*h;const damp=Math.exp(-1.15*h);b.vx*=damp;b.vy*=damp;b.x+=b.vx*h;b.y+=b.vy*h;
    for(const w of g.L.walls){const c=P.capsule(b,w);if(c&&c.impact>70&&g.hitCd<=0){g.hitCd=.06;MiniAudio.sfx('wall',Math.min(1,c.impact/400))}}P.cap(b,MAXV)}
   for(const o of g.L.holes)if(Math.hypot(b.x-o.x,b.y-o.y)<o.r-2){g.mode='sink';g.sink=0;g.sinkTo=o;g.sinkGoal=false;g.falls++;MiniAudio.sfx('hole');host.say(s,t('mazeFell'));s.shake=.4;return}
   const G=g.L.goal;if(Math.hypot(b.x-G.x,b.y-G.y)<G.r-4){g.mode='sink';g.sink=0;g.sinkTo=G;g.sinkGoal=true;MiniAudio.sfx('goal');host.burst(s,G.x,G.y+TOP,'#fff1c9',18,140)}},
  pointer(s,kind,p,e){const g=s.g;if(g.motion)return;
   if(kind==='down')g.joy={id:e.pointerId,ox:p.x,oy:p.y,x:p.x,y:p.y,dx:0,dy:0};
   else if(kind==='move'&&g.joy?.id===e.pointerId){const dx=p.x-g.joy.ox,dy=p.y-g.joy.oy,l=Math.hypot(dx,dy),k=l>56?56/l:1;g.joy.x=g.joy.ox+dx*k;g.joy.y=g.joy.oy+dy*k;g.joy.dx=dx*k/56;g.joy.dy=dy*k/56}
   else if((kind==='up'||kind==='cancel')&&g.joy?.id===e.pointerId)g.joy=null},
  key(s,code,down){const g=s.g,d={ArrowLeft:'L',KeyA:'L',ArrowRight:'R',KeyD:'R',ArrowUp:'U',KeyW:'U',ArrowDown:'D',KeyS:'D'}[code];if(!d)return false;if(down)g.keys.add(d);else g.keys.delete(d);return true},
  release(s){const g=s.g;if(!g)return;g.keys.clear();g.joy=null},
  controls(s,host){const g=s.g,out=[];if('DeviceOrientationEvent'in window){out.push(h('button',{class:'chip'+(g.motion?' primary':''),type:'button','aria-pressed':String(!!g.motion),onclick:()=>motion(s,host)},t(g.motion?'motionOff':'motionStart')));if(g.motion)out.push(h('button',{class:'chip',type:'button',onclick:()=>{g.base=null;host.say(s,t('calibrated'));UI.toast(t('calibrated'),'i_sparkle',2)}},t('calibrate')))}
   out.push(h('span',{class:'hint mg-keys',text:t('mazeKeys')}));return out},
  // ---------- drawing ----------
  draw(c,s){const g=s.g,L=g.L,th=g.th,b=g.ball,tl=g.tilt;
   c.fillStyle=th.floor;c.fillRect(0,0,W,H);c.save();c.translate(0,TOP);
   const shape=()=>{c.beginPath();if(L.shape==='circle')c.arc(180,180,158,0,7);else{const[o,,sz]=L.box;MiniTable.round(c,o-10,o-10,sz+20,sz+20,14)}};
   c.save();c.translate(3+tl.x*3,5+tl.y*3);shape();c.fillStyle='rgba(0,0,0,.35)';c.fill();c.restore();
   const bg=c.createRadialGradient(150-tl.x*30,140-tl.y*30,20,180,180,220);bg.addColorStop(0,th.board[0]);bg.addColorStop(1,th.board[1]);shape();c.fillStyle=bg;c.fill();
   c.save();shape();c.clip();c.globalAlpha=.09;c.strokeStyle='#000';for(let y=-10;y<370;y+=6){c.beginPath();c.moveTo(0,y);c.bezierCurveTo(120,y+4,240,y-4,360,y+2);c.stroke()}c.globalAlpha=1;
   if(L.stars){c.fillStyle='rgba(255,240,190,.25)';const r=P.rng(3);for(let i=0;i<30;i++){const x=30+r()*300,y=30+r()*300,k=2+r()*3;c.beginPath();for(let j=0;j<10;j++){const a=j*Math.PI/5-Math.PI/2,q=j%2?k*.45:k;c.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q)}c.fill()}}c.restore();
   // goal and holes
   const G=L.goal,gl=c.createRadialGradient(G.x,G.y,2,G.x,G.y,G.r+10);gl.addColorStop(0,th.goal);gl.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=gl;c.beginPath();c.arc(G.x,G.y,G.r+10+Math.sin(g.t*3)*2,0,7);c.fill();
   c.fillStyle='#1d1420';c.beginPath();c.arc(G.x,G.y,G.r-3,0,7);c.fill();c.strokeStyle=th.goal;c.lineWidth=3;c.beginPath();c.arc(G.x,G.y,G.r-2,0,7);c.stroke();
   c.fillStyle=th.goal;c.globalAlpha=.9;fish(c,G.x,G.y,G.r*.5);c.globalAlpha=1;
   for(const o of L.holes){const hg=c.createRadialGradient(o.x+tl.x*2,o.y+tl.y*2,1,o.x,o.y,o.r);hg.addColorStop(0,'#000');hg.addColorStop(.75,'#21141a');hg.addColorStop(1,'#5a3b30');c.fillStyle=hg;c.beginPath();c.arc(o.x,o.y,o.r,0,7);c.fill();c.strokeStyle='rgba(255,230,190,.35)';c.lineWidth=1.5;c.beginPath();c.arc(o.x,o.y,o.r+1,Math.PI*.1,Math.PI*.9);c.stroke()}
   // walls: shadow follows tilt for a sense of depth
   const stroke=(col,w,dx=0,dy=0)=>{c.strokeStyle=col;c.lineWidth=w;c.lineCap=c.lineJoin='round';for(const p of L.paths){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x+dx,y+dy):c.moveTo(x+dx,y+dy));c.stroke()}};
   stroke('rgba(0,0,0,.32)',WR*2+2,2-tl.x*2.5,3-tl.y*2.5);stroke(th.edge,WR*2+2);stroke(th.wall,WR*2-1.5);
   // ball
   const sc=g.mode==='sink'?Math.max(.15,1-g.sink/.45):g.appear>0?1-g.appear/.35*.6:1;
   if(g.mode!=='done'){c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.arc(b.x+2-tl.x*2,b.y+3-tl.y*2,R*sc,0,7);c.fill();const bb=c.createRadialGradient(b.x-2.5,b.y-2.5,1,b.x,b.y,R*sc);bb.addColorStop(0,'#fff');bb.addColorStop(.5,'#d9d6e2');bb.addColorStop(1,'#6b6680');c.fillStyle=bb;c.beginPath();c.arc(b.x,b.y,R*sc,0,7);c.fill()}
   if(g.joy){c.strokeStyle='rgba(255,248,230,.55)';c.lineWidth=2;c.beginPath();c.arc(g.joy.ox,g.joy.oy-TOP,56,0,7);c.stroke();c.fillStyle='rgba(255,248,230,.45)';c.beginPath();c.arc(g.joy.x,g.joy.y-TOP,14,0,7);c.fill()}
   c.restore();
   if(!g.started&&!s.over){c.fillStyle='rgba(255,248,232,.85)';c.font='700 13px system-ui,sans-serif';c.textAlign='center';c.fillText(t(g.motion?'motionOn':'mazeHint'),180,H-8)}
   this.hud(c,s)},
  hud(c,s){const g=s.g;MiniTable.round(c,8,5,344,30,10);c.fillStyle='rgba(30,22,36,.8)';c.fill();c.textAlign='left';c.font='800 14px system-ui,sans-serif';c.fillStyle='#fff3dc';c.fillText('⏱ '+MiniHost.time(g.time),20,25);
   c.fillStyle='#cbbfd8';c.font='700 12px system-ui,sans-serif';c.fillText(t('bestShort',[g.best!=null?MiniHost.time(g.best):'—']),108,25);if(g.L.holes.length)c.fillText(t('mazeFallsShort',[g.falls]),210,25);
   // bubble level
   c.strokeStyle='#cbbfd8';c.lineWidth=1.5;c.beginPath();c.arc(326,20,11,0,7);c.stroke();c.beginPath();c.moveTo(320,20);c.lineTo(332,20);c.moveTo(326,14);c.lineTo(326,26);c.globalAlpha=.4;c.stroke();c.globalAlpha=1;c.fillStyle=g.motion?'#9fe0b0':'#ffe58a';c.beginPath();c.arc(326+g.tilt.x*8,20+g.tilt.y*8,3.5,0,7);c.fill()}
 };
 function fish(c,x,y,r){c.beginPath();c.ellipse(x-r*.15,y,r*.75,r*.45,0,0,7);c.fill();c.beginPath();c.moveTo(x+r*.5,y);c.lineTo(x+r,y-r*.4);c.lineTo(x+r,y+r*.4);c.closePath();c.fill()}
 MiniTable.register('maze',game);
 return{game,level,LEVELS,TOP,R};
})();
