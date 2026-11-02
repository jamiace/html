/* 0.92.36 Purr Cozy: canvas arcade games replacing the old one-button "tap when ready" panels.
   reaction (cozy_handheld_1..5, cozy_controller_1..5, cozy_joystick_1..5, sm_console) -> "Pounce!" whack-a-mole
   fish (cozy_console_3) -> pond fishing with a reel tension bar
   balance (cozy_blocks_1..5, sm_blocks) -> block tower (drop on the beat, overhang is trimmed) */
const MiniArcade=(()=>{
 const K=MiniKit,t=(k,a)=>MiniHost.t(k,a),W=360,H=460,fmt=s=>MiniHost.time(s);
 // ======================================================================== reaction: Pounce!
 const THEME={handheld:{bg:['#cfe9b8','#8cc068'],hole:'#5a3b2a',rim:'#7a5a3a',target:'mouse',deco:'flower'},
  controller:{bg:['#bfe6f2','#5aa7cf'],hole:'#2f6f96',rim:'#e8f4f8',target:'fish',deco:'leaf'},
  joystick:{bg:['#2b2650','#5a4a8a'],hole:'#191536',rim:'#8f84c4',target:'star',deco:'moon'}};
 const PACE=[{up:1.15,gap:.75,goal:60,time:40},{up:1,gap:.65,goal:70,time:40},{up:.9,gap:.55,goal:80,time:40},{up:.8,gap:.5,goal:85,time:40},{up:.7,gap:.42,goal:90,time:40}];
 const reaction={size:{w:W,h:H},dt:1/60,help:s=>'whackHelp',
  create(s){const fam=/controller/.test(s.k)?'controller':/joystick/.test(s.k)?'joystick':'handheld',P=PACE[s.variant],holes=[];
   for(let r=0;r<3;r++)for(let c=0;c<3;c++)holes.push({x:70+c*110,y:150+r*105,pop:null});return{fam,T:THEME[fam],P,holes,score:0,combo:0,time:P.time,next:.8,hits:0,misses:0,bonk:[],best:MiniHost.record(s.k).whackBest||0,started:false}},
  spawn(g){const free=g.holes.filter(h=>!h.pop);if(!free.length)return;const h=free[Math.floor(Math.random()*free.length)],r=Math.random();
   const kind=r<.12?'gold':r<.26?'cucumber':'normal';h.pop={kind,t:0,life:g.P.up*(kind==='gold'?.75:1)*(1-.25*(1-g.time/g.P.time)),hit:0}},
  step(s,dt,host){const g=s.g;g.bonk=g.bonk.filter(b=>(b.t-=dt)>0);if(s.over)return;if(!g.started)return;g.time-=dt;
   if(g.time<=0){g.time=0;const won=g.score>=g.P.goal;if(won)host.win(s);host.end(s,{field:'whackBest',value:g.score,lines:[t('scoreLine',[g.score]),t('whackHits',[g.hits]),t('bestLine',[Math.max(g.best,g.score)])],say:t('scoreLine',[g.score])});K.sfx(won?'win':'over');return}
   if((g.next-=dt)<=0){this.spawn(g);if(Math.random()<.35)this.spawn(g);g.next=g.P.gap*(.7+Math.random()*.6)}
   for(const h of g.holes){const p=h.pop;if(!p)continue;p.t+=dt;if(p.hit){p.hit+=dt;if(p.hit>.3)h.pop=null;continue}if(p.t>p.life+.25){if(p.kind!=='cucumber'){g.combo=0;g.misses++}h.pop=null}}},
  whack(s,host,i){const g=s.g;if(s.over)return;if(!g.started){g.started=true}const h=g.holes[i],p=h.pop;g.bonk.push({x:h.x,y:h.y-10,t:.15});
   if(!p||p.hit||p.t>p.life+.2){K.sfx('flipper',.4);return}
   p.hit=.001;if(p.kind==='cucumber'){g.score=Math.max(0,g.score-3);g.combo=0;s.shake=.5;K.sfx('error');host.pop(s,h.x,h.y-50,t('whackCucumber'),'#bdf0a0',16);return}
   g.combo++;g.hits++;const pts=(p.kind==='gold'?3:1)+(g.combo>=5?1:0);g.score+=pts;K.sfx(p.kind==='gold'?'bonus':'bumper',.7);host.burst(s,h.x,h.y-30,p.kind==='gold'?'#ffe58a':'#fff3c4',p.kind==='gold'?16:8,150);host.pop(s,h.x,h.y-56,'+'+pts+(g.combo>=5?' ×':''),'#fff3c4',18);
   if(g.score>=g.P.goal&&!s.won){host.win(s);host.say(s,t('whackGoal'))}},
  pointer(s,kind,p,e,host){if(kind!=='down')return;const g=s.g;let best=-1,bd=60;g.holes.forEach((h,i)=>{const d=Math.hypot(p.x-h.x,(p.y-h.y+20)*.8);if(d<bd){bd=d;best=i}});if(best>=0)this.whack(s,host,best)},
  key(s,code,down,e,host){const m=/^(?:Digit|Numpad)([1-9])$/.exec(code);if(!m)return false;if(down&&!e.repeat){const n=Number(m[1])-1,row=code.startsWith('Numpad')?2-Math.floor(n/3):Math.floor(n/3);this.whack(s,host,row*3+n%3)}return true},
  controls(){return[h('span',{class:'hint mg-keys',text:t('whackKeys')})]},
  draw(c,s){const g=s.g,T=g.T;K.bg(c,W,H,T.bg[0],T.bg[1]);
   if(g.fam==='joystick'){for(let i=0;i<40;i++){c.fillStyle='rgba(255,255,255,.5)';c.fillRect((i*83)%W,50+(i*47)%(H-60),2,2)}}else for(let i=0;i<8;i++)K.ICONS[T.deco](c,20+(i*97)%330,70+(i*61)%370,18);
   for(const h of g.holes){c.fillStyle='rgba(0,0,0,.18)';c.beginPath();c.ellipse(h.x,h.y+6,46,17,0,0,7);c.fill();c.fillStyle=T.hole;c.beginPath();c.ellipse(h.x,h.y,42,15,0,0,7);c.fill();
    const p=h.pop;if(p){const up=p.hit?Math.max(0,1-p.hit*4):Math.min(1,p.t/.12,Math.max(0,(p.life+.25-p.t)/.2)),y=h.y-up*40;c.save();c.beginPath();c.rect(h.x-50,h.y-90,100,90);c.ellipse(h.x,h.y,42,15,0,0,Math.PI);c.clip();
     if(p.kind==='cucumber'){c.fillStyle='#5bb36a';K.round(c,h.x-12,y-30,24,60,12);c.fill();c.fillStyle='#8fd17f';for(let k=0;k<4;k++){c.beginPath();c.arc(h.x-4+(k%2)*8,y-18+k*12,2.5,0,7);c.fill()}}
     else if(g.fam==='controller')K.fish(c,h.x,y-6,62,p.kind==='gold'?'#ffd66b':'#f4a24b',{flip:true});
     else if(g.fam==='joystick'){K.star(c,h.x,y-8,30);c.fillStyle=p.kind==='gold'?'#ffd66b':'#fff3c4';c.fill();c.fillStyle='#2e2230';c.beginPath();c.arc(h.x-7,y-10,2.6,0,7);c.arc(h.x+7,y-10,2.6,0,7);c.fill()}
     else K.mouse(c,h.x,y-6,56,p.kind==='gold'?'#ffd66b':'#b9b0c4');
     if(p.hit&&p.kind!=='cucumber')K.text(c,'✶',h.x+22,y-34,{size:20,color:'#ffe58a'});c.restore()}
    c.strokeStyle=T.rim;c.lineWidth=4;c.beginPath();c.ellipse(h.x,h.y,42,15,0,0,Math.PI);c.stroke()}
   for(const b of g.bonk){K.paw(c,b.x+18,b.y-30,40,'rgba(255,255,255,.85)')}
   K.hud(c,W,fmt(g.time),t('scoreShort',[g.score]),t('whackGoalBar',[g.P.goal]),g.time/g.P.time);
   if(g.combo>=3)K.text(c,t('combo',[g.combo]),W/2,62,{size:17,color:'#ffe58a',stroke:'rgba(30,20,40,.7)'});
   if(!g.started)K.text(c,t('whackStart'),W/2,H-14,{size:17,color:'#fff',stroke:'rgba(30,20,40,.75)',maxW:W-20});
   else K.text(c,t('whackAvoid'),W/2,H-14,{size:15,color:g.fam==='joystick'?'#d8d0f4':'#2e3a22',maxW:W-20})}
 };
 // ======================================================================== fish: pond fishing
 const SPECIES=[{id:'carp',col:'#f4a24b',p:.38,size:[20,40],diff:.6},{id:'blue',col:'#7fb6e8',p:.3,size:[15,30],diff:.8},{id:'koi',col:'#ffffff',p:.17,size:[30,55],diff:1.05},{id:'gold',col:'#ffd66b',p:.1,size:[10,22],diff:1.3},{id:'boot',col:'#7a5a4a',p:.05,size:[25,25],diff:.3}];
 const fish={size:{w:W,h:H},dt:1/120,help:()=>'fishHelp',
  create(s){return{phase:'ready',t:0,time:120,caught:[],goal:5,bob:{x:220,y:300},wait:0,bite:0,reel:null,hold:false,best:MiniHost.record(s.k).fishBest||0,msg:null,ripples:[],power:0}},
  pick(){let r=Math.random();for(const sp of SPECIES){if((r-=sp.p)<=0)return sp}return SPECIES[0]},
  step(s,dt,host){const g=s.g;g.t+=dt;g.ripples=g.ripples.filter(r=>(r.t+=dt)<1.2);if(g.msg&&(g.msg.t-=dt)<=0)g.msg=null;if(s.over)return;
   if(g.phase!=='ready')g.time-=dt;if(g.time<=0){g.time=0;this.finish(s,host);return}
   if(g.phase==='charge'){g.power=Math.min(1,g.power+dt*1.2)}
   if(g.phase==='wait'){if((g.wait-=dt)<=0){g.phase='bite';g.bite=.9;g.sp=this.pick();K.sfx('bounce',.7);g.ripples.push({x:g.bob.x,y:g.bob.y,t:0})}else if(Math.random()<dt*1.2)g.ripples.push({x:g.bob.x,y:g.bob.y,t:.4})}
   else if(g.phase==='bite'){if((g.bite-=dt)<=0){g.phase='wait';g.wait=1+Math.random()*2.5;this.say(g,'fishMissed')}}
   else if(g.phase==='reel'){const R=g.reel,sp=g.sp;R.ft-=dt;if(R.ft<=0){R.target=Math.random();R.ft=.4+Math.random()*(1.4-sp.diff*.6)}R.fv+=(R.target-R.f)*dt*6*sp.diff-R.fv*dt*2.5;R.f=Math.max(0,Math.min(1,R.f+R.fv*dt));
    R.zv+=(g.hold?2.6:-2.2)*dt;R.zv*=Math.pow(.25,dt);R.z+=R.zv*dt;if(R.z<0){R.z=0;R.zv=Math.max(0,-R.zv*.3)}if(R.z>1-R.zh){R.z=1-R.zh;R.zv=Math.min(0,-R.zv*.3)}
    const inside=R.f>=R.z&&R.f<=R.z+R.zh;R.p+=(inside?.32:-.22)*dt;if(inside&&Math.random()<dt*8)K.sfx('lane',.15);
    if(R.p>=1){const kg=Math.round(sp.size[0]+Math.random()*(sp.size[1]-sp.size[0]));g.caught.push({sp,kg});g.phase='show';g.showT=1.6;K.sfx(sp.id==='boot'?'drain':'bonus');host.burst(s,180,200,'#bfe6f2',16,160);this.say(g,sp.id==='boot'?'fishBoot':'fishGot',[t('fish_'+sp.id),kg]);
     if(g.caught.filter(c=>c.sp.id!=='boot').length>=g.goal&&!s.won){host.win(s);host.say(s,t('fishGoal'))}}
    else if(R.p<=0){g.phase='ready';K.sfx('drain');this.say(g,'fishLost')}}
   else if(g.phase==='show'){if((g.showT-=dt)<=0)g.phase='ready'}
   else if(g.phase==='cast'){g.castT+=dt*2.2;if(g.castT>=1){g.phase='wait';g.wait=1.2+Math.random()*3;g.ripples.push({x:g.bob.x,y:g.bob.y,t:0});K.sfx('swish',.5)}}},
  say(g,k,a){g.msg={k,a,t:1.6}},
  finish(s,host){const g=s.g,real=g.caught.filter(c=>c.sp.id!=='boot'),score=real.reduce((a,c)=>a+c.kg,0);host.end(s,{field:'fishBest',value:score,lines:[t('fishCount',[real.length]),t('fishWeight',[score]),t('bestLine',[Math.max(g.best,score)])],say:t('fishCount',[real.length])});K.sfx(s.won?'win':'over')},
  press(s,host,down){const g=s.g;if(s.over)return;
   if(down){if(g.phase==='ready'){g.phase='charge';g.power=0}else if(g.phase==='bite'){g.phase='reel';g.reel={f:.5,fv:0,target:.5,ft:.3,z:.35,zv:0,zh:.28-.06*g.sp.diff,p:.3};g.hold=true;K.sfx('target')}else if(g.phase==='wait'){g.wait+=.6;this.say(g,'fishTooSoon')}else if(g.phase==='reel')g.hold=true}
   else{if(g.phase==='charge'){g.phase='cast';g.castT=0;g.bob={x:150+g.power*170,y:270+g.power*-40+Math.random()*30}}g.hold=false}},
  pointer(s,kind,p,e,host){if(kind==='down')this.press(s,host,true);else if(kind==='up'||kind==='cancel')this.press(s,host,false)},
  key(s,code,down,e,host){if(code!=='Space'&&code!=='Enter')return false;if(!e.repeat||!down)this.press(s,host,down);return true},
  release(s){if(s.g)s.g.hold=false},
  controls(){return[h('span',{class:'hint mg-keys',text:t('fishKeys')})]},
  draw(c,s){const g=s.g;const sky=c.createLinearGradient(0,0,0,190);sky.addColorStop(0,'#ffd9a8');sky.addColorStop(1,'#ffeccd');c.fillStyle=sky;c.fillRect(0,0,W,190);
   c.fillStyle='#ffd66b';c.beginPath();c.arc(280,110,30,0,7);c.fill();c.fillStyle='#8cc068';c.beginPath();c.moveTo(0,190);c.quadraticCurveTo(90,150,190,180);c.quadraticCurveTo(280,160,360,185);c.lineTo(360,200);c.lineTo(0,200);c.fill();
   const water=c.createLinearGradient(0,190,0,H);water.addColorStop(0,'#5aa7cf');water.addColorStop(1,'#2f6f96');c.fillStyle=water;c.fillRect(0,190,W,H-190);
   c.strokeStyle='rgba(255,255,255,.25)';c.lineWidth=2;for(let i=0;i<7;i++){const y=215+i*34,o=Math.sin(g.t*.8+i)*20;c.beginPath();c.moveTo(20+o,y);c.lineTo(80+o,y);c.moveTo(200-o,y+12);c.lineTo(250-o,y+12);c.stroke()}
   for(const r of g.ripples){c.strokeStyle=`rgba(255,255,255,${.7*(1-r.t/1.2)})`;c.beginPath();c.ellipse(r.x,r.y,8+r.t*30,3+r.t*10,0,0,7);c.stroke()}
   // dock + cat
   c.fillStyle='#8a5b3c';c.fillRect(0,330,110,20);c.fillStyle='#6b4429';for(let x=8;x<110;x+=26)c.fillRect(x,350,8,60);K.catFace(c,60,300,56,'#f0a24f',{happy:g.phase==='show'});c.fillStyle='#f0a24f';c.beginPath();c.ellipse(60,335,26,12,0,0,7);c.fill();
   // rod and line
   const tipX=120,tipY=232;c.strokeStyle='#5a3b2a';c.lineWidth=4;c.beginPath();c.moveTo(70,320);c.lineTo(tipX,tipY);c.stroke();
   if(g.phase!=='ready'&&g.phase!=='charge'){let bx=g.bob.x,by=g.bob.y;if(g.phase==='cast'){const k=g.castT;bx=tipX+(g.bob.x-tipX)*k;by=tipY+(g.bob.y-tipY)*k-Math.sin(k*Math.PI)*90}
    const dip=g.phase==='bite'?6+Math.sin(g.t*30)*3:g.phase==='reel'?4:Math.sin(g.t*3)*1.5;c.strokeStyle='rgba(255,255,255,.8)';c.lineWidth=1.2;c.beginPath();c.moveTo(tipX,tipY);c.quadraticCurveTo((tipX+bx)/2,Math.max(tipY,by)-10,bx,by+dip);c.stroke();
    c.fillStyle='#e2554f';c.beginPath();c.arc(bx,by+dip-4,6,Math.PI,0);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(bx,by+dip-4,6,0,Math.PI);c.fill();
    if(g.phase==='bite')K.text(c,'!',bx,by-14,{size:30,color:'#ffe58a',stroke:'#2e2230',lw:5})}
   if(g.phase==='charge'){K.panel(c,110,380,140,18,9,'rgba(36,27,46,.8)');c.fillStyle='#ffd66b';K.round(c,114,384,132*g.power,10,5);c.fill();K.text(c,t('fishPower'),180,372,{size:15,color:'#fff',stroke:'rgba(30,20,40,.7)'})}
   if(g.phase==='reel'){const R=g.reel,bx=300,by=210,bh=220;K.panel(c,bx-4,by-4,44,bh+8,10,'#3a2a20');c.fillStyle='#5aa7cf';c.fillRect(bx,by,36,bh);
    c.fillStyle='rgba(143,211,154,.85)';c.fillRect(bx,by+(1-R.z-R.zh)*bh,36,R.zh*bh);K.fish(c,bx+18,by+(1-R.f)*bh,24,g.sp.col);
    c.fillStyle='#3a2a20';c.fillRect(bx-16,by,10,bh);c.fillStyle=R.p>.6?'#8fd39a':R.p>.3?'#f1c043':'#e2554f';c.fillRect(bx-14,by+bh*(1-R.p),6,bh*R.p);
    K.text(c,t('fishHold'),170,410,{size:16,color:'#fff',stroke:'rgba(30,20,40,.7)'})}
   if(g.phase==='show'){const L=g.caught[g.caught.length-1];K.panel(c,90,215,180,90,16,'rgba(255,250,240,.95)','#d9c6a8');if(L.sp.id==='boot'){c.fillStyle=L.sp.col;K.round(c,160,232,34,40,6);c.fill();c.fillRect(160,262,50,12)}else K.fish(c,180,252,70,L.sp.col);K.text(c,t('fish_'+L.sp.id)+' · '+t('fishKg',[L.kg]),180,295,{size:15,color:'#4a3a52',maxW:170})}
   const real=g.caught.filter(c=>c.sp.id!=='boot').length;K.hud(c,W,fmt(g.time),t('fishBar',[real,g.goal]),t('bestShort',[g.best]),g.time/120);
   // caught row
   g.caught.slice(-8).forEach((f,i)=>{if(f.sp.id!=='boot')K.fish(c,24+i*26,58,20,f.sp.col)});
   const tip={ready:'fishCastTip',charge:'fishRelease',wait:'fishWait',bite:'fishBite',reel:'',show:'',cast:''}[g.phase];
   if(g.msg)K.text(c,t(g.msg.k,g.msg.a),W/2,175,{size:17,color:'#fff',stroke:'rgba(30,20,40,.75)',maxW:W-20});
   if(tip)K.text(c,t(tip),W/2,H-14,{size:16,color:'#fff',stroke:'rgba(30,20,40,.75)',maxW:W-20})}
 };
 // ======================================================================== balance: block tower
 const BLOCKS=[{cols:['#e2554f','#f1c043','#4f86d6','#5bb36a'],speed:120,goal:12},{cols:['#f6a3bd','#fff3c4','#9ccf7a','#8fd0f0'],speed:140,goal:14},{cols:['#9b6bd0','#f08bb0','#ffd66b','#7fb6e8'],speed:160,goal:15},{cols:['#8a5b3c','#c98a5b','#e9c48a','#6b4429'],speed:175,goal:16},{cols:['#3d6f9e','#c9443f','#f3e2c0','#d9a04f'],speed:190,goal:18}];
 const BH=26,BASE_W=150;
 const balance={size:{w:W,h:H},dt:1/120,help:()=>'stackHelp',
  create(s){const B=BLOCKS[s.variant],tower=[{x:W/2-BASE_W/2,w:BASE_W,col:'#7a5a4a'}];return{B,tower,mov:{x:0,w:BASE_W,dir:1},cam:0,falling:[],perfect:0,score:0,best:MiniHost.record(s.k).stackBest||0,flash:0,started:false}},
  step(s,dt,host){const g=s.g;g.falling=g.falling.filter(f=>{f.vy+=900*dt;f.sy+=f.vy*dt;f.r+=f.vr*dt;return f.sy+g.cam<H+80});if(g.flash>0)g.flash-=dt;
   const target=Math.max(0,(g.tower.length-8)*BH);g.cam+=(target-g.cam)*Math.min(1,dt*5);if(s.over)return;
   const m=g.mov,sp=g.B.speed*(1+g.tower.length*.025);m.x+=m.dir*sp*dt;if(m.x<10){m.x=10;m.dir=1}if(m.x+m.w>W-10){m.x=W-10-m.w;m.dir=-1}},
  drop(s,host){const g=s.g;if(s.over)return;g.started=true;const top=g.tower[g.tower.length-1],m=g.mov,a=Math.max(m.x,top.x),b=Math.min(m.x+m.w,top.x+top.w),ov=b-a,y=this.yOf(g,g.tower.length);
   if(ov<=2){g.falling.push({x:m.x,sy:H-96-y,w:m.w,vy:0,r:0,vr:(m.dir)*2,col:g.B.cols[g.tower.length%4]});K.sfx('drain');this.finish(s,host);return}
   let nx=a,nw=ov;const off=Math.abs(m.x-top.x);if(off<=4){nx=top.x;nw=top.w;g.perfect++;if(g.perfect>=3)nw=Math.min(BASE_W,nw+8),nx=Math.max(10,nx-4);g.flash=.25;K.sfx('target');host.pop(s,nx+nw/2,H-96-y+g.cam-14,t('stackPerfect'),'#ffe58a',17)}
   else{g.perfect=0;K.sfx('board');const cut=m.x<top.x?{x:m.x,w:top.x-m.x}:{x:top.x+top.w,w:m.x+m.w-(top.x+top.w)};g.falling.push({...cut,sy:H-96-y,vy:0,r:0,vr:m.x<top.x?-3:3,col:g.B.cols[g.tower.length%4]})}
   g.tower.push({x:nx,w:nw,col:g.B.cols[g.tower.length%4]});g.score=g.tower.length-1;g.mov={x:m.dir>0?10:W-10-nw,w:nw,dir:m.dir>0?1:-1};
   if(g.score>=g.B.goal&&!s.won){host.win(s);K.sfx('bonus');host.say(s,t('stackGoal'))}},
  yOf(g,i){return i*BH},
  finish(s,host){const g=s.g;host.end(s,{field:'stackBest',value:g.score,lines:[t('stackHeight',[g.score]),t('bestLine',[Math.max(g.best,g.score)])],say:t('stackHeight',[g.score])});K.sfx(s.won?'win':'over')},
  pointer(s,kind,p,e,host){if(kind==='down')this.drop(s,host)},
  key(s,code,down,e,host){if(code!=='Space'&&code!=='Enter')return false;if(down&&!e.repeat)this.drop(s,host);return true},
  controls(){return[h('span',{class:'hint mg-keys',text:t('stackKeys')})]},
  draw(c,s){const g=s.g,base=H-96;const sky=c.createLinearGradient(0,0,0,H);const k=Math.min(1,g.cam/600);sky.addColorStop(0,k>.5?'#2b2650':'#bfe3f5');sky.addColorStop(1,k>.5?'#7a6aa8':'#fdf3e2');c.fillStyle=sky;c.fillRect(0,0,W,H);
   for(let i=0;i<6;i++){const y=(i*130+g.cam*.4)%(H+60)-30;c.fillStyle='rgba(255,255,255,.6)';c.beginPath();c.arc((i*91)%W,y,16,0,7);c.arc((i*91)%W+18,y-6,20,0,7);c.arc((i*91)%W+36,y,14,0,7);c.fill()}
   c.save();c.translate(0,g.cam);c.fillStyle='#8cc068';c.fillRect(0,base+BH,W,300);c.fillStyle='#6aa25a';c.fillRect(0,base+BH,W,6);for(let i=0;i<9;i++)K.flower(c,20+i*40,base+BH+30+(i%2)*14,16,['#f08bb0','#fff','#ffd66b'][i%3]);
   const drawBlock=(x,y,w,col,glow)=>{c.fillStyle='rgba(0,0,0,.15)';c.fillRect(x+3,y+3,w,BH);c.fillStyle=col;K.round(c,x,y,w,BH,5);c.fill();c.fillStyle='rgba(255,255,255,.3)';c.fillRect(x+3,y+3,w-6,5);if(w>30)K.paw(c,x+w/2,y+BH/2+1,14,'rgba(255,255,255,.45)');if(glow){c.strokeStyle='#ffe58a';c.lineWidth=3;K.round(c,x,y,w,BH,5);c.stroke()}};
   g.tower.forEach((b,i)=>drawBlock(b.x,base-i*BH,b.w,b.col,i===g.tower.length-1&&g.flash>0));
   if(!s.over){const y=base-g.tower.length*BH,m=g.mov;c.strokeStyle='rgba(60,45,70,.5)';c.lineWidth=2;c.beginPath();c.moveTo(m.x+m.w/2,y-g.cam-200);c.lineTo(m.x+m.w/2,y);c.stroke();drawBlock(m.x,y,m.w,g.B.cols[g.tower.length%4])}
   for(const f of g.falling){c.save();c.translate(f.x+f.w/2,f.sy+BH/2);c.rotate(f.r);c.fillStyle=f.col;c.globalAlpha=.85;K.round(c,-f.w/2,-BH/2,f.w,BH,5);c.fill();c.restore()}
   const top=g.tower[g.tower.length-1];K.catFace(c,top.x+top.w/2,base-(g.tower.length-1)*BH-14,26,'#f0a24f',{happy:g.flash>0});c.restore();
   K.hud(c,W,t('stackFloors',[g.score]),t('stackGoalBar',[g.B.goal]),t('bestShort',[g.best]));
   K.text(c,t(g.started?(g.perfect>=2?'stackStreak':'stackTip'):'stackStart',[g.perfect]),W/2,H-12,{size:16,color:'#3a2a20',stroke:'rgba(255,250,240,.85)',maxW:W-20})}
 };
 for(const[k,v]of Object.entries({reaction,fish,balance}))MiniTable.register(k,v);
 return{reaction,fish,balance,SPECIES,BLOCKS};
})();
