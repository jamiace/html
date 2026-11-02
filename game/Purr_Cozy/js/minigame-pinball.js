/* 0.92.29 Purr Cozy pinball (cozy_pinball_1..5). Logical table 360×560, fixed step 1/240 s plus adaptive sub-steps.
   Shared: real rotating flippers (surface velocity at the contact point), plunger with charge, one-way lane gate,
   rollover lanes with lane change + multiplier, ball save, skill shot, auto-nudge.
   Every furniture ID is its own TABLE (layout + objective), not only a colour theme:
     1 圓弧 classic    – 3 pop bumpers, slingshots, C-A-T lanes, left 3-target bank (→ centre paw), mouse-hole saucer
     2 雙層 two holes  – 2 big bumpers + centre post, two mouse holes (both = jackpot + paw), kickbacks relit every ball
     3 星形 star       – 5 small bumpers in a star, 5 star rollovers (all lit = bonus + ball save + paw)
     4 格柵 grid       – pachinko peg field, centre bumper, 4 drop targets (all down = bonus + multiplier + kickback)
     5 復古 retro      – no slingshot kick, P-U-R-R lanes light the bumpers (50 → 200), top kick-out hole, fixed centre post
   Rescues on every table: tight outlanes, wall-saver posts, a lit kickback "K" in each outlane, the cat-paw centre post
   (raised for a while by table objectives) and a rotating mission list whose rewards are kickbacks / paw / extra ball.
   Reaching the table's goal within 3 balls rewards once; the ball keeps playing for a high score. */
const MiniPinball=(()=>{
 const P=MiniPhys,W=360,H=560,R=7,GRAV=620,MAXV=1350,REST=.5,UP=-.48,FL=54;
 const WALL={e:.42,f:.01},POST={e:.55,f:.01},RUBBER={e:.6,f:.02},KICKER={e:.6,f:.02},DEAD={e:.5,f:.02};
 const mirror=pts=>pts.map(([x,y])=>[W-x,y]);
 const outline=[[44,568],...P.arc(192,218,148,Math.PI,Math.PI*2,Math.PI/40),[340,568]];
 const gate={ax:340,ay:238,bx:316,by:262,r0:3,r1:3,mat:WALL};
 const slingL=[[96,388],[96,436],[132,462]];
 // ---------- tables ----------
 function build(v){
  const L={v,walls:[],kickers:[],slings:[slingL,mirror(slingL)],activeSlings:v!==4,bumpers:[],posts:[],targets:[],drops:[],saucers:[],stars:[],lanes:[],letters:'CAT',lanePosts:[120,160,200,240],kickback:false,goal:4000};
  P.poly(L.walls,outline,5,WALL,'outer');P.poly(L.walls,[[316,262],[316,568]],4,WALL,'lane');
  if(v===4){L.lanePosts=[112,148,184,220,256];L.letters='PURR'}
  for(const x of L.lanePosts)P.poly(L.walls,[[x,98],[x,122]],3,POST,'post');
  for(let i=1;i<L.lanePosts.length;i++)L.lanes.push([L.lanePosts[i-1],L.lanePosts[i]]);
  // Inlane guides: x sets the outlane width (66 ≈ only just wide enough for the ball; 70 = classic width).
  const gx=[67,70,67,67,70][v];L.guide=[[gx,392],[gx,448],[114,480]];L.gx=gx;
  P.poly(L.walls,L.guide,3,WALL,'guide');P.poly(L.walls,mirror(L.guide),3,WALL,'guide');
  for(const t of L.slings){P.poly(L.walls,[t[0],t[1],t[2]],3,RUBBER,'slingBody');const k={ax:t[0][0],ay:t[0][1],bx:t[2][0],by:t[2][1],r0:3,mat:L.activeSlings?KICKER:DEAD};if(L.activeSlings)L.kickers.push(k);else L.walls.push(k)}
  // Wall savers on every table: rubber posts on the side walls push balls that slide down a wall back toward the inlanes.
  L.savers=[{x:51,y:352,r:6},{x:309,y:352,r:6}];
  if(v===0){L.bumpers=[{x:140,y:182,r:17},{x:220,y:182,r:17},{x:180,y:242,r:17}];L.targets=[[262,280],[292,308],[322,336]].map(([a,b])=>({ax:50,ay:a,bx:50,by:b,r0:5,mat:{e:.45,f:.02}}));L.saucers=[{x:286,y:318,r:11,ej:[-1,-1]}];L.goal=12000}
  if(v===1){L.bumpers=[{x:132,y:192,r:19},{x:228,y:192,r:19}];L.posts=[{x:180,y:262,r:7,score:10}];L.saucers=[{x:74,y:300,r:11,ej:[1,-1]},{x:286,y:300,r:11,ej:[-1,-1]}];L.kickback=true;L.goal=15000}
  if(v===2){for(let k=0;k<5;k++){const a=-Math.PI/2+k*Math.PI*2/5;L.bumpers.push({x:180+52*Math.cos(a),y:236+52*Math.sin(a),r:12,score:60})}L.stars=[[106,340],[140,372],[180,384],[220,372],[254,340]].map(([x,y])=>({x,y,r:10}));L.goal=12000}
  if(v===3){for(const[row,y]of[[0,160],[1,188],[2,216]])for(let x=104+(row%2)*15;x<=262;x+=30)L.posts.push({x,y,r:4,score:5,peg:true});L.bumpers=[{x:180,y:262,r:15}];L.drops=[[134,152],[158,176],[184,202],[208,226]].map(([a,b])=>({ax:a,ay:330,bx:b,by:330,r0:3,mat:{e:.4,f:.02}}));L.goal=25000}
  if(v===4){L.bumpers=[{x:138,y:214,r:20,retro:true},{x:222,y:214,r:20,retro:true},{x:180,y:282,r:14,retro:true}];L.saucers=[{x:180,y:168,r:11,ej:[0,1]}];L.centerPost=true;L.goal=1500}
  // Rotating missions: each table has its own list; finishing one pays 750 and a rescue (kickbacks / centre paw / extra ball).
  L.missions=[[['bumper',12],['lanes',1],['set',1],['hole',2],['sling',8]],[['hole',3],['bumper',10],['lanes',1],['post',5],['sling',8]],[['bumper',20],['set',1],['lanes',1],['sling',8]],[['peg',25],['set',1],['bumper',6],['lanes',1]],[['bumper',10],['lanes',1],['hole',2]]][v];
  return L}
 const PAW={x:180,y:524,r:6},REWARDS=['kick','paw','extra','points'];
 const TABLES=[0,1,2,3,4].map(build);
 const THEMES=[
  {field:['#3d3160','#211b38'],rail:'#f0dfbd',edge:'#7d5f4c',accent:'#f4c75c',bump:'#ec8fab',cap:'#ffe3ec',sling:'#86d0bd',lit:'#ffe58a',dim:'#5d4f80',wood:['#7a5040','#4e3127'],deco:'arc'},
  {field:['#2b5166','#152d3b'],rail:'#e9e6d4',edge:'#5c6b70',accent:'#9fe0d8',bump:'#7cc6e8',cap:'#e3f6ff',sling:'#f3b26b',lit:'#fff1a6',dim:'#3b6176',wood:['#5f6f78','#36444b'],deco:'double'},
  {field:['#28285e','#121236'],rail:'#f3e3c3',edge:'#7a6aa0',accent:'#ffd76b',bump:'#b896ff',cap:'#efe4ff',sling:'#ff9fb8',lit:'#fff6b8',dim:'#42407a',wood:['#5a4a84','#33295a'],deco:'star'},
  {field:['#30513c','#1a2f22'],rail:'#eadfbe',edge:'#6b7552',accent:'#c8e38b',bump:'#f2a65e',cap:'#fff0db',sling:'#e8d36b',lit:'#fff3a0',dim:'#40664c',wood:['#6e5a3e','#463822'],deco:'grid'},
  {field:['#5c3a2a','#341f16'],rail:'#f6e2b0',edge:'#8a5a3a',accent:'#f0a74a',bump:'#e2604f',cap:'#ffe2c4',sling:'#7fb6a4',lit:'#ffd98a',dim:'#714a36',wood:['#8b5a3c','#5a3524'],deco:'retro'}];
 const t=(k,a)=>MiniHost.t(k,a);
 // ---------- helpers ----------
 const flipSeg=f=>({ax:f.px,ay:f.py,bx:f.px+f.dir*FL*Math.cos(f.a),by:f.py+FL*Math.sin(f.a),r0:9,r1:5});
 const say=(g,key,args=[],life=1.8)=>{g.msg={key,args,t:0,life}};
 const zeros=n=>Array(n).fill(0);
 function add(s,host,n,x,y){const g=s.g,v=n*g.mult;g.score+=v;if(x!=null)host.pop(s,x,y,'+'+v,g.th.lit,13+Math.min(6,v/200));
  if(!g.goal&&g.score>=g.L.goal){g.goal=true;host.win(s);say(g,'pinGoal',[],2.4);MiniAudio.sfx('goal');host.burst(s,180,300,g.th.lit,26,220);host.say(s,t('pinGoal'))}}
 function serve(g){g.mode='ready';g.ball={x:328,y:518,vx:0,vy:0,r:R};g.charge=0;g.skill=Math.floor(Math.random()*g.L.lanes.length);g.trail=[];g.still=0;g.sauHit=zeros(g.L.saucers.length)}
 function launch(s,host){const g=s.g;if(g.mode!=='ready')return;if(g.charge<.08){g.charge=0;return}
  const ch=g.charge;g.ball.vx=0;g.ball.vy=-(700+ch*640)*(.98+Math.random()*.04);g.mode='live';g.save=7;g.skillT=4.5;g.charge=0;MiniAudio.sfx('launch',.5+ch*.6);say(g,'pinSkill',[g.L.letters[g.skill]],2)}
 function setHold(s,host,side,src,on,fire=true){const g=s.g,set=g.hold[side],was=set.size>0;if(on)set.add(src);else set.delete(src);const now=set.size>0;if(was===now)return;
  if(side==='P'){if(!now&&fire)launch(s,host);else if(!now)g.charge=0;return}
  if(now&&!s.over){MiniAudio.sfx('flipper');if(!g.lanes.every(Boolean)&&g.mode!=='ready'){const a=g.lanes;g.lanes=side==='L'?[...a.slice(1),a[0]]:[a[a.length-1],...a.slice(0,-1)]}}}
 function moveFlippers(g,dt,over){for(const[i,f]of g.flip.entries()){const on=!over&&g.hold[i?'R':'L'].size>0,target=on?UP:REST,sp=on?26:15,old=f.a;f.a=old<target?Math.min(target,old+sp*dt):Math.max(target,old-sp*dt);f.w=(f.a-old)/dt}}
 function collide(s,host){const g=s.g,L=g.L,b=g.ball;
  for(const w of L.walls)P.capsule(b,w);
  {const nx=-(gate.by-gate.ay),ny=gate.bx-gate.ax,l=Math.hypot(nx,ny);if(((b.x-gate.ax)*nx+(b.y-gate.ay)*ny)/l>=0)P.capsule(b,gate)}
  L.kickers.forEach((k,i)=>{const c=P.capsule(b,k);if(c&&c.impact>80&&c.t>.15&&c.t<.85&&g.sCd[i]<=0&&g.chain<4){g.chain++;P.kick(b,c,300);g.sCd[i]=.12;g.flash.s[i]=.2;add(s,host,10);event(s,host,'sling');MiniAudio.sfx('sling',c.impact/600)}});
  L.bumpers.forEach((m,i)=>{const c=P.circle(b,m.x,m.y,m.r,RUBBER);if(c&&g.bCd[i]<=0){g.chain=0;P.kick(b,c,m.r<14?380:430);g.bCd[i]=.08;g.flash.b[i]=.25;const pts=m.retro?(g.litT>0?200:50):m.score||100;add(s,host,pts,m.x,m.y-m.r-7);event(s,host,'bumper');MiniAudio.sfx('bumper',.5+Math.min(.6,c.impact/900));host.burst(s,b.x-c.nx*R,b.y-c.ny*R,g.th.cap,7,120)}});
  L.posts.forEach((m,i)=>{const c=P.circle(b,m.x,m.y,m.r,POST);if(c&&c.impact>60&&g.pCd[i]<=0){g.pCd[i]=.15;g.flash.p[i]=.2;add(s,host,m.score||5);event(s,host,m.peg?'peg':'post');if(m.peg)MiniAudio.sfx('wall',Math.min(1,c.impact/600));else MiniAudio.sfx('target',.5)}});
  L.savers.forEach((m,i)=>{const c=P.circle(b,m.x,m.y,m.r,RUBBER);if(c&&c.impact>60&&g.svCd[i]<=0){g.svCd[i]=.2;g.flash.sv[i]=.25;add(s,host,10);MiniAudio.sfx('target',.4)}});
  if(g.paw>0||L.centerPost){const c=P.circle(b,PAW.x,PAW.y,PAW.r,RUBBER);if(c&&c.impact>40){g.flash.paw=.25;MiniAudio.sfx('target',.5)}}
  L.targets.forEach((m,i)=>{const c=P.capsule(b,m);if(c&&c.impact>40&&!g.targets[i]){g.targets[i]=1;add(s,host,150,70,m.ay+9);MiniAudio.sfx('target');
   if(g.targets.every(Boolean)){add(s,host,1000,120,300);g.save=Math.max(g.save,10);g.paw=Math.max(g.paw,15);g.tReset=1;say(g,'pinTargets');MiniAudio.sfx('bonus');event(s,host,'set')}}});
  L.drops.forEach((m,i)=>{if(g.drops[i])return;const c=P.capsule(b,m);if(c&&c.impact>30){g.drops[i]=1;add(s,host,100,(m.ax+m.bx)/2,m.ay-14);MiniAudio.sfx('target');s.shake=.25;
   if(g.drops.every(Boolean)){add(s,host,800,180,300);g.mult=Math.min(5,g.mult+1);lightKick(g);g.dReset=4;say(g,'pinDrops',[g.mult]);MiniAudio.sfx('bonus');event(s,host,'set')}}});
  for(const f of g.flip){const w=flipSeg(f),dx=w.bx-w.ax,dy=w.by-w.ay;let u=((b.x-w.ax)*dx+(b.y-w.ay)*dy)/(dx*dx+dy*dy);u=u<0?0:u>1?1:u;
   const off=u*FL,svx=-f.dir*off*Math.sin(f.a)*f.w,svy=off*Math.cos(f.a)*f.w;if(P.capsule(b,w,{e:.28,f:.03,svx,svy}))g.chain=0}}
 function lightKick(g,side){if(side){g.kick[side]=true;return}const k=!g.kick.L?'L':!g.kick.R?'R':null;if(k)g.kick[k]=true}
 function rescue(s,host,kind){const g=s.g;
  if(kind==='extra'&&g.extraUsed)kind='paw';
  if(kind==='kick'){g.kick.L=g.kick.R=true;say(g,'prew_kick',[],2.2)}
  else if(kind==='paw'){g.paw=Math.max(g.paw,20);say(g,'prew_paw',[],2.2)}
  else if(kind==='extra'){g.extraUsed=true;g.balls++;say(g,'prew_extra',[],2.4)}
  else{add(s,host,1500,180,330);say(g,'prew_points',[],2)}
  MiniAudio.sfx('save')}
 function event(s,host,type,n=1){const g=s.g,m=g.L.missions[g.mis%g.L.missions.length];if(!m||m[0]!==type)return;g.misN+=n;
  if(g.misN>=m[1]){g.misN=0;g.mis++;add(s,host,750);rescue(s,host,REWARDS[g.misDone++%REWARDS.length]);host.say(s,t('pinMissionDone'))}}
 function lanesComplete(s,host){const g=s.g;g.mult=Math.min(5,g.mult+1);g.lanesDone=1.2;add(s,host,300);MiniAudio.sfx('bonus');
  event(s,host,'lanes');if(g.L.v===4){g.litT=20;lightKick(g);say(g,'pinRetroLit',[g.mult])}else{lightKick(g);say(g,'pinKickLit',[g.mult])}}
 const game={
  size:{w:W,h:H},dt:1/240,help:s=>['pinHelp0','pinHelp1','pinHelp2','pinHelp3','pinHelp4'][s.variant]||'pinHelp0',
  create(s){const L=TABLES[s.variant]||TABLES[0],g={t:0,L,th:THEMES[s.variant],flip:[{px:120,py:492,dir:1,a:REST,w:0},{px:240,py:492,dir:-1,a:REST,w:0}],hold:{L:new Set(),R:new Set(),P:new Set()},ptr:new Map(),
   balls:3,score:0,mult:1,lanes:zeros(L.lanes.length),laneCd:zeros(L.lanes.length),lanesDone:0,targets:zeros(L.targets.length),tReset:0,drops:zeros(L.drops.length),dReset:0,stars:zeros(L.stars.length),stReset:0,litT:0,kick:{L:!!L.kickback,R:!!L.kickback},kickFlash:0,paw:0,mis:Math.floor(Math.random()*L.missions.length),misN:0,misDone:0,extraUsed:false,svCd:[0,0],
   save:0,skillT:0,saucerT:0,saucerCd:0,sauIdx:0,drainT:0,msg:null,flash:{b:zeros(L.bumpers.length),s:[0,0],p:zeros(L.posts.length),sv:[0,0],sau:0,paw:0},bCd:zeros(L.bumpers.length),sCd:[0,0],pCd:zeros(L.posts.length),goal:false,still:0,chain:0,best:MiniHost.record(s.k).pinballBest||0,stepN:0};
   serve(g);say(g,'pinReady',[],3);return g},
  step(s,dt,host){const g=s.g,L=g.L,b=g.ball;g.t+=dt;g.stepN++;
   if(g.msg&&(g.msg.t+=dt)>g.msg.life)g.msg=null;
   for(const k of['b','s','p','sv'])g.flash[k]=g.flash[k].map(v=>Math.max(0,v-dt));g.flash.sau=Math.max(0,g.flash.sau-dt);g.flash.paw=Math.max(0,g.flash.paw-dt);g.svCd=g.svCd.map(v=>v-dt);g.kickFlash=Math.max(0,g.kickFlash-dt);
   g.bCd=g.bCd.map(v=>v-dt);g.sCd=g.sCd.map(v=>v-dt);g.pCd=g.pCd.map(v=>v-dt);g.laneCd=g.laneCd.map(v=>v-dt);g.saucerCd-=dt;if(g.litT>0)g.litT-=dt;
   if(g.lanesDone>0&&(g.lanesDone-=dt)<=0)g.lanes=zeros(L.lanes.length);
   if(g.tReset>0&&(g.tReset-=dt)<=0)g.targets=zeros(L.targets.length);
   if(g.dReset>0&&(g.dReset-=dt)<=0)g.drops=zeros(L.drops.length);
   if(g.stReset>0&&(g.stReset-=dt)<=0)g.stars=zeros(L.stars.length);
   if(g.mode!=='live'){moveFlippers(g,dt,s.over);
    if(g.mode==='ready'){if(g.hold.P.size)g.charge=Math.min(1,g.charge+dt/.85);b.x=328;b.y=518+g.charge*12}
    else if(g.mode==='saucer'){if((g.saucerT-=dt)<=0){const sc=L.saucers[g.sauIdx];g.mode='live';g.saucerCd=.7;
      if(sc.ej[1]>0){b.vx=(Math.random()<.5?-1:1)*(240+Math.random()*80);b.vy=-120-Math.random()*80}else{b.vx=sc.ej[0]*(230+Math.random()*90);b.vy=-200-Math.random()*90}MiniAudio.sfx('launch',.4)}}
    else if(g.mode==='drain'){if((g.drainT-=dt)<=0)serve(g)}
    return}
   const n=P.substeps(b,dt,2.4),h=dt/n;
   for(let i=0;i<n;i++){moveFlippers(g,h,s.over);b.vy+=GRAV*h;b.x+=b.vx*h;b.y+=b.vy*h;collide(s,host);P.cap(b,MAXV)}
   b.vx*=1-.03*dt;b.vy*=1-.03*dt;
   if(g.stepN%3===0){g.trail.push([b.x,b.y]);if(g.trail.length>9)g.trail.shift()}
   if(g.save>0)g.save-=dt;if(g.skillT>0)g.skillT-=dt;
   // rollover lanes
   if(b.y>100&&b.y<124)L.lanes.forEach(([x0,x1],i)=>{if(b.x>x0&&b.x<x1&&g.laneCd[i]<=0){g.laneCd[i]=.45;
    if(g.skillT>0&&i===g.skill){g.skillT=0;add(s,host,500,(x0+x1)/2,140);say(g,'pinSkillHit');MiniAudio.sfx('bonus')}
    if(!g.lanes[i]&&g.lanesDone<=0){g.lanes[i]=1;add(s,host,50,(x0+x1)/2,140);MiniAudio.sfx('lane');if(g.lanes.every(Boolean))lanesComplete(s,host)}else add(s,host,10)}});
   // star rollovers (table 3)
   L.stars.forEach((m,i)=>{if(!g.stars[i]&&g.stReset<=0&&Math.hypot(b.x-m.x,b.y-m.y)<m.r){g.stars[i]=1;add(s,host,100,m.x,m.y-16);MiniAudio.sfx('lane');
    if(g.stars.every(Boolean)){add(s,host,1500,180,300);g.save=Math.max(g.save,10);g.paw=Math.max(g.paw,15);g.stReset=1.2;say(g,'pinStars');MiniAudio.sfx('bonus');event(s,host,'set')}}});
   // left-outlane kickback (table 2)
   if(g.paw>0)g.paw-=dt;
   // outlane kickbacks (both sides): a lit kickback fires the ball back up its outlane once
   for(const[side,x0,x1,x]of[['L',44,L.gx,(44+L.gx)/2+2],['R',W-L.gx,316,(W-L.gx+316)/2-2]])if(g.kick[side]&&b.x>x0&&b.x<x1&&b.y>450&&b.vy>0){g.kick[side]=false;g.kickFlash=.6;g.kickAt=side;b.x=x;b.vx=side==='L'?25:-25;b.vy=-1000;MiniAudio.sfx('launch',.8);say(g,'pinKick',[],1.4);s.shake=.4}
   // kick-out holes
   for(const[i,sc]of L.saucers.entries())if(g.saucerCd<=0&&Math.hypot(b.x-sc.x,b.y-sc.y)<9&&Math.hypot(b.vx,b.vy)<700){g.mode='saucer';g.sauIdx=i;g.saucerT=1.1;b.x=sc.x;b.y=sc.y;b.vx=b.vy=0;g.flash.sau=1.1;MiniAudio.sfx('saucer');
    event(s,host,'hole');if(L.v===4){add(s,host,1000,sc.x,sc.y-20);say(g,'pinTopHole')}
    else{add(s,host,500,sc.x,sc.y-20);g.sauHit[i]=1;if(L.saucers.length>1&&g.sauHit.every(Boolean)){g.sauHit=zeros(L.saucers.length);add(s,host,1000,180,300);g.paw=Math.max(g.paw,15);say(g,'pinDoubleMouse');MiniAudio.sfx('bonus')}else say(g,'pinMouse')}
    return}
   // stuck ball: gentle automatic nudge (never while the player cradles it on a raised flipper)
   if(Math.hypot(b.vx,b.vy)<8&&!g.hold.L.size&&!g.hold.R.size){if((g.still+=dt)>2.5){g.still=0;b.vy=-320;b.vx=(Math.random()-.5)*300;s.shake=.6;say(g,'pinNudge',[],1.2)}}else g.still=0;
   // drain
   if(b.y>H+14||b.x<0||b.x>W){g.trail=[];
    if(g.save>0){say(g,'pinSaved');MiniAudio.sfx('save');serve(g);return}
    g.balls--;MiniAudio.sfx('drain');
    if(g.balls<=0){g.mode='over';const best=Math.max(g.best,g.score);host.end(s,{field:'pinballBest',value:g.score,lines:[t('scoreLine',[g.score]),t('bestLine',[best])],say:t('scoreLine',[g.score])});MiniAudio.sfx('over')}
    else{g.mode='drain';g.drainT=1.1;g.mult=1;if(L.kickback)g.kick.L=g.kick.R=true;say(g,'pinBallLost',[g.balls]);host.say(s,t('pinBallLost',[g.balls]))}}},
  pointer(s,kind,p,e,host){const g=s.g,id='p'+e.pointerId;
   if(kind==='down'){const side=p.x<W/2?'L':g.mode==='ready'?'P':'R';g.ptr.set(id,side);setHold(s,host,side,id,true)}
   else if(kind==='up'||kind==='cancel'){const side=g.ptr.get(id);if(side){g.ptr.delete(id);setHold(s,host,side,id,false,kind==='up')}}},
  key(s,code,down,e,host){const side={ArrowLeft:'L',KeyZ:'L',ShiftLeft:'L',KeyA:'L',ArrowRight:'R',Slash:'R',ShiftRight:'R',KeyL:'R',Space:'P',ArrowDown:'P',Enter:'P'}[code];if(!side)return false;if(down&&e.repeat)return true;setHold(s,host,side,'k'+code,down);return true},
  release(s){const g=s.g;if(!g)return;for(const k of['L','R','P'])g.hold[k].clear();g.ptr.clear();if(g.mode==='ready')g.charge=0},
  controls(s,host){const hold=(side,label,cls)=>MiniHost.holdButton(label,cls,()=>setHold(s,host,side,'b'+side,true),fire=>setHold(s,host,side,'b'+side,false,fire));
   return[hold('L','◀ '+t('flipLeft'),'mg-left'),hold('P',t('launch'),'mg-launch primary'),hold('R',t('flipRight')+' ▶','mg-right')]},
  // ---------- drawing ----------
  draw(c,s){const g=s.g,th=g.th,L=g.L,blink=Math.floor(g.t*8)%2;
   if(!g.bg||g.bgTheme!==th)this.paintStatic(g);c.drawImage(g.bg,0,0,W,H);
   c.textAlign='center';
   L.lanes.forEach(([x0,x1],i)=>{const lit=g.lanes[i]||(g.lanesDone>0&&blink),cx=(x0+x1)/2;c.fillStyle=lit?th.lit:th.dim;c.beginPath();c.arc(cx,140,8,0,7);c.fill();
    c.fillStyle=lit?'#3a2a20':'#cfc3e0';c.font='800 11px system-ui,sans-serif';c.fillText(L.letters[i],cx,143.5);
    if(g.skillT>0&&i===g.skill&&Math.floor(g.t*6)%2){c.strokeStyle=th.lit;c.lineWidth=2;c.beginPath();c.arc(cx,140,12,0,7);c.stroke()}});
   L.targets.forEach((m,i)=>{c.lineCap='round';c.lineWidth=8;c.strokeStyle=g.targets[i]?th.lit:th.accent;c.beginPath();c.moveTo(m.ax+1,m.ay);c.lineTo(m.bx+1,m.by);c.stroke();c.fillStyle=g.targets[i]?th.lit:th.dim;c.beginPath();c.arc(72,(m.ay+m.by)/2,4,0,7);c.fill()});
   L.drops.forEach((m,i)=>{c.lineCap='round';if(g.drops[i]){c.strokeStyle='rgba(0,0,0,.35)';c.lineWidth=4}else{c.strokeStyle=th.accent;c.lineWidth=8}c.beginPath();c.moveTo(m.ax,m.ay);c.lineTo(m.bx,m.by);c.stroke();c.fillStyle=g.drops[i]?th.lit:th.dim;c.beginPath();c.arc((m.ax+m.bx)/2,m.ay+16,4,0,7);c.fill()});
   L.stars.forEach((m,i)=>{c.fillStyle=g.stars[i]||(g.stReset>0&&blink)?th.lit:th.dim;star(c,m.x,m.y,m.r);});
   L.saucers.forEach((sc,i)=>{c.fillStyle='#120e18';c.beginPath();c.arc(sc.x,sc.y,sc.r,0,7);c.fill();const on=(g.flash.sau>0&&g.sauIdx===i&&blink)||g.sauHit?.[i];c.strokeStyle=on?th.lit:th.rail;c.lineWidth=3;c.beginPath();if(sc.ej[1]>0)c.arc(sc.x,sc.y,sc.r+1,-Math.PI*.05,Math.PI*1.05,true);else c.arc(sc.x,sc.y,sc.r+1,Math.PI*.95,Math.PI*2.05);c.stroke()});
   L.posts.forEach((m,i)=>{const f=g.flash.p[i]>0;c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.arc(m.x+1.5,m.y+2,m.r,0,7);c.fill();c.fillStyle=f?'#fff':m.peg?th.rail:th.accent;c.beginPath();c.arc(m.x,m.y,m.r,0,7);c.fill();if(!m.peg){c.strokeStyle=th.edge;c.lineWidth=2;c.stroke()}});
   for(const[side,x]of[['L',(44+L.gx)/2+2],['R',(W-L.gx+316)/2-2]]){const on=g.kick[side];c.fillStyle=on?(g.kickFlash>0&&g.kickAt===side&&blink?'#fff':th.lit):th.dim;c.beginPath();c.moveTo(x,420);c.lineTo(x-6,432);c.lineTo(x+6,432);c.closePath();c.fill();c.font='800 11px system-ui,sans-serif';c.fillText('K',x,445)}
   L.savers.forEach((m,i)=>{c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.arc(m.x+1.5,m.y+2,m.r,0,7);c.fill();c.fillStyle=g.flash.sv[i]>0?'#fff':th.sling;c.beginPath();c.arc(m.x,m.y,m.r,0,7);c.fill();c.strokeStyle=th.edge;c.lineWidth=1.5;c.stroke()});
   if(g.paw>0||L.centerPost){const warn=!L.centerPost&&g.paw<3&&blink;c.globalAlpha=warn?.4:1;c.fillStyle=g.flash.paw>0?'#fff':th.lit;c.beginPath();c.arc(PAW.x,PAW.y,PAW.r,0,7);c.fill();c.strokeStyle=th.edge;c.lineWidth=1.5;c.stroke();c.fillStyle=th.edge;paw(c,PAW.x,PAW.y,2.6,true);c.globalAlpha=1}
   c.fillStyle=g.save>0&&(g.save>2||Math.floor(g.t*6)%2)?th.lit:th.dim;c.font='800 11px system-ui,sans-serif';c.beginPath();c.arc(180,470,7,0,7);c.fill();c.fillStyle=g.save>0?'#3a2a20':'#a99cbc';c.fillText('S',180,474);
   for(let i=2;i<=5;i++){const on=g.mult>=i,x=150+(i-2)*20;c.fillStyle=on?th.accent:th.dim;c.beginPath();c.arc(x,412,7,0,7);c.fill();c.fillStyle=on?'#3a2a20':'#a99cbc';c.font='800 10px system-ui,sans-serif';c.fillText('×'+i,x,415)}
   if(L.activeSlings)L.slings.forEach((tri,i)=>{const f=g.flash.s[i]>0;c.strokeStyle=f?'#fff':th.sling;c.lineWidth=f?6:5;c.lineCap='round';const bend=f?4*(i?-1:1):0;c.beginPath();c.moveTo(tri[0][0],tri[0][1]);c.quadraticCurveTo((tri[0][0]+tri[2][0])/2+bend,(tri[0][1]+tri[2][1])/2-Math.abs(bend),tri[2][0],tri[2][1]);c.stroke()});
   L.bumpers.forEach((m,i)=>{const f=g.flash.b[i],k=1+f*.5,lit=!m.retro||g.litT>0;if(f>0||(m.retro&&g.litT>0)){const gl=c.createRadialGradient(m.x,m.y,m.r,m.x,m.y,m.r+(f>0?20:10));gl.addColorStop(0,'rgba(255,240,190,.55)');gl.addColorStop(1,'rgba(255,240,190,0)');c.fillStyle=gl;c.beginPath();c.arc(m.x,m.y,m.r+20,0,7);c.fill()}
    c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.arc(m.x+2,m.y+3,m.r,0,7);c.fill();c.fillStyle=th.edge;c.beginPath();c.arc(m.x,m.y,m.r*k,0,7);c.fill();c.fillStyle=f>0?'#fff':lit?th.bump:th.dim;c.beginPath();c.arc(m.x,m.y,(m.r-3)*k,0,7);c.fill();c.fillStyle=lit?th.cap:'#a99cbc';c.beginPath();c.arc(m.x,m.y-1,(m.r-(m.r<14?6:8))*k,0,7);c.fill();
    if(m.retro){c.fillStyle='#3a2a20';c.font=`800 ${m.r<16?9:11}px system-ui,sans-serif`;c.fillText(g.litT>0?'200':'50',m.x,m.y+3)}else paw(c,m.x,m.y,(m.r<14?3:4.5)*k)});
   const py=528+g.charge*12;c.fillStyle='#2a2030';c.fillRect(320,py,16,560-py);c.strokeStyle='#bfb3cf';c.lineWidth=1.5;c.beginPath();for(let y=py+4;y<558;y+=5-g.charge*2){c.moveTo(321,y);c.lineTo(335,y+2)}c.stroke();c.fillStyle=th.accent;c.fillRect(319,py-3,18,5);
   if(g.mode==='ready'){const k=(Math.sin(g.t*6)+1)/2;c.fillStyle=`rgba(255,240,180,${.35+.5*k})`;c.beginPath();c.moveTo(328,470-k*6);c.lineTo(320,484-k*6);c.lineTo(336,484-k*6);c.fill();
    if(g.charge>0){c.fillStyle='rgba(0,0,0,.4)';c.fillRect(300,400,8,100);c.fillStyle=g.charge>.9?'#ff8f6b':th.lit;c.fillRect(300,500-g.charge*100,8,g.charge*100)}}
   for(const f of g.flip)drawFlipper(c,flipSeg(f),th);
   const b=g.ball;if(g.mode!=='drain'&&g.mode!=='over'){g.trail.forEach(([x,y],i)=>{c.fillStyle=`rgba(255,250,235,${i/g.trail.length*.22})`;c.beginPath();c.arc(x,y,R*(.5+i/g.trail.length*.5),0,7);c.fill()});
    c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.arc(b.x+2.5,b.y+3,R,0,7);c.fill();const bg=c.createRadialGradient(b.x-2.5,b.y-2.5,1,b.x,b.y,R);bg.addColorStop(0,'#ffffff');bg.addColorStop(.45,'#dcd8e6');bg.addColorStop(1,'#6f6884');c.fillStyle=bg;c.beginPath();c.arc(b.x,b.y,R,0,7);c.fill()}
   this.hud(c,s)},
  hud(c,s){const g=s.g,th=g.th,GOAL=g.L.goal;
   MiniTable.round(c,8,6,344,52,12);c.fillStyle='rgba(18,13,26,.82)';c.fill();c.strokeStyle=th.accent;c.lineWidth=1.5;c.stroke();
   c.textAlign='left';c.fillStyle='#bcb0cf';c.font='700 12px system-ui,sans-serif';c.fillText(t('score').toUpperCase(),20,22);c.fillStyle='#fff6dc';c.font='800 26px system-ui,sans-serif';c.fillText(String(g.score),20,48);
   const bx=150,bw=110,k=Math.min(1,g.score/GOAL);c.fillStyle='#bcb0cf';c.font='700 12px system-ui,sans-serif';c.fillText(g.goal?t('pinGoalDone'):t('pinGoalBar',[GOAL]),bx,24);
   c.fillStyle='#3a3048';MiniTable.round(c,bx,32,bw,9,4.5);c.fill();c.fillStyle=g.goal?'#8fd39a':th.accent;if(k>0){MiniTable.round(c,bx,32,Math.max(9,bw*k),9,4.5);c.fill()}
   if(g.mult>1){c.fillStyle=th.lit;c.font='800 16px system-ui,sans-serif';c.fillText('×'+g.mult,bx+bw-26,53)}
   const spare=g.balls-(g.mode==='live'||g.mode==='saucer'?1:0),slots=Math.max(3,spare),gap=slots>3?15:20;for(let i=0;i<slots;i++){c.fillStyle=i<spare?'#e8e4f0':'#4a405a';c.beginPath();c.arc(330-(slots-1-i)*gap,24,6,0,7);c.fill()}
   c.fillStyle='#bcb0cf';c.font='700 12px system-ui,sans-serif';c.textAlign='center';c.fillText(t('bestShort',[Math.max(g.best,g.score)]),310,50);
   if(g.msg){const m=g.msg,a=Math.min(1,m.t*6,(m.life-m.t)*3),sc=1+Math.max(0,.25-m.t)*1.4;c.save();c.globalAlpha=Math.max(0,a);c.translate(180,350);c.scale(sc,sc);c.font='900 24px system-ui,sans-serif';c.textAlign='center';c.lineWidth=6;c.strokeStyle='rgba(20,14,28,.85)';const txt=t(m.key,m.args);c.strokeText(txt,0,0);c.fillStyle=th.lit;c.fillText(txt,0,0);c.restore()}
   {const m=g.L.missions[g.mis%g.L.missions.length];if(m&&!s.over){const txt=t('pmis_'+m[0],[Math.min(g.misN,m[1]),m[1]]);c.font='700 14px system-ui,sans-serif';c.textAlign='center';const w=c.measureText(txt).width+18;c.fillStyle='rgba(18,13,26,.72)';MiniTable.round(c,180-w/2,537,w,18,9);c.fill();c.fillStyle=th.lit;c.fillText(txt,180,550)}}
   c.globalAlpha=.55;c.fillStyle='#fff';c.font='700 14px system-ui,sans-serif';c.textAlign='center';c.fillText('◀',26,548);c.fillText(g.mode==='ready'?'▲':'▶',300,548);c.globalAlpha=1},
  paintStatic(g){const th=g.th,L=g.L,cv=document.createElement('canvas');cv.width=W*2;cv.height=H*2;const c=cv.getContext('2d');c.scale(2,2);
   const wg=c.createLinearGradient(0,0,W,H);wg.addColorStop(0,th.wood[0]);wg.addColorStop(1,th.wood[1]);c.fillStyle=wg;c.fillRect(0,0,W,H);
   c.globalAlpha=.08;c.strokeStyle='#000';for(let y=4;y<H;y+=7){c.beginPath();c.moveTo(0,y);c.bezierCurveTo(120,y+3,240,y-3,W,y+1);c.stroke()}c.globalAlpha=1;
   c.save();c.beginPath();c.moveTo(outline[0][0],outline[0][1]);for(const p of outline)c.lineTo(p[0],p[1]);c.closePath();c.clip();
   const fg=c.createLinearGradient(0,60,0,H);fg.addColorStop(0,th.field[0]);fg.addColorStop(1,th.field[1]);c.fillStyle=fg;c.fillRect(0,0,W,H);
   c.globalAlpha=.13;c.strokeStyle=th.cap;c.fillStyle=th.cap;const r=MiniPhys.rng(77+th.deco.length);
   if(th.deco==='arc')for(let k=40;k<360;k+=26){c.lineWidth=2;c.beginPath();c.arc(180,330,k,0,7);c.stroke()}
   if(th.deco==='double')for(let x=-560;x<W;x+=34){c.lineWidth=3;c.beginPath();c.moveTo(x,560);c.lineTo(x+560,0);c.stroke();c.beginPath();c.moveTo(x+9,560);c.lineTo(x+569,0);c.stroke()}
   if(th.deco==='star')for(let i=0;i<46;i++)star(c,40+r()*290,70+r()*480,1.5+r()*3.5);
   if(th.deco==='grid'){c.lineWidth=1;for(let x=44;x<W;x+=22){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke()}for(let y=60;y<H;y+=22){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke()}}
   if(th.deco==='retro'){for(let a=0;a<24;a++){c.beginPath();c.moveTo(180,330);c.arc(180,330,400,a*Math.PI/12,a*Math.PI/12+Math.PI/24);c.fill()}}
   c.globalAlpha=.16;c.fillStyle=th.cap;paw(c,180,380,22,true);c.globalAlpha=1;
   c.fillStyle='rgba(0,0,0,.22)';c.fillRect(316,0,30,H);c.restore();
   const rail=(pts,r)=>{c.lineCap=c.lineJoin='round';c.strokeStyle='rgba(0,0,0,.35)';c.lineWidth=r*2+3;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0]+1.5,p[1]+2):c.moveTo(p[0]+1.5,p[1]+2));c.stroke();c.strokeStyle=th.edge;c.lineWidth=r*2+2;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke();c.strokeStyle=th.rail;c.lineWidth=r*2-1;c.stroke()};
   rail(outline,5);rail([[316,262],[316,566]],4);rail([[gate.ax,gate.ay],[gate.bx,gate.by]],2.5);for(const x of L.lanePosts)rail([[x,98],[x,122]],3);rail(L.guide,3);rail(mirror(L.guide),3);
   for(const tri of L.slings){c.fillStyle=th.edge;c.beginPath();tri.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.fill();c.fillStyle=L.activeSlings?th.dim:th.wood[1];c.beginPath();const cx=(tri[0][0]+tri[1][0]+tri[2][0])/3,cy=(tri[0][1]+tri[1][1]+tri[2][1])/3;tri.forEach((p,i)=>{const x=cx+(p[0]-cx)*.6,y=cy+(p[1]-cy)*.6;i?c.lineTo(x,y):c.moveTo(x,y)});c.closePath();c.fill();rail(tri.concat([tri[0]]),2.5)}
   if(L.targets.length){c.fillStyle=th.edge;c.fillRect(34,262,12,76)}
   g.bg=cv;g.bgTheme=th}
 };
 function drawFlipper(c,w,th){const dx=w.bx-w.ax,dy=w.by-w.ay,l=Math.hypot(dx,dy),nx=-dy/l,ny=dx/l,path=()=>{c.beginPath();c.moveTo(w.ax+nx*w.r0,w.ay+ny*w.r0);c.lineTo(w.bx+nx*w.r1,w.by+ny*w.r1);c.arc(w.bx,w.by,w.r1,Math.atan2(ny,nx),Math.atan2(-ny,-nx));c.lineTo(w.ax-nx*w.r0,w.ay-ny*w.r0);c.arc(w.ax,w.ay,w.r0,Math.atan2(-ny,-nx),Math.atan2(ny,nx));c.closePath()};
  c.save();c.translate(2,3);path();c.fillStyle='rgba(0,0,0,.35)';c.fill();c.restore();path();c.fillStyle='#fbf3e3';c.fill();c.strokeStyle='#d9544f';c.lineWidth=2.5;c.stroke();c.fillStyle=th.edge;c.beginPath();c.arc(w.ax,w.ay,3,0,7);c.fill()}
 function paw(c,x,y,r,filled){c.save();c.fillStyle=filled?c.fillStyle:'rgba(60,40,60,.45)';c.beginPath();c.ellipse(x,y+r*.35,r*.75,r*.6,0,0,7);c.fill();for(const[a,d]of[[-.95,1],[-.35,1.08],[.35,1.08],[.95,1]]){c.beginPath();c.arc(x+Math.sin(a)*r*d,y-Math.cos(a)*r*d*.75,r*.3,0,7);c.fill()}c.restore()}
 function star(c,x,y,r){c.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,k=i%2?r*.45:r;c.lineTo(x+Math.cos(a)*k,y+Math.sin(a)*k)}c.closePath();c.fill()}
 MiniTable.register('pinball',game);
 return{game,TABLES,flipSeg,gate};
})();
