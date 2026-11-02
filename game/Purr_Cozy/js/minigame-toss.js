/* 0.92.29 Purr Cozy mini hoops (cozy_basket_1..5, mode `toss`). Logical court 360×440, fixed step 1/240 s.
   Slingshot aiming: press anywhere, pull back, release. Only the first part of the arc is previewed, so it stays a skill.
   Rim = two round lips, backboard + pole are solid; a basket only counts when the ball centre drops through the rim
   line from above between the lips. Five shots; the hoop moves after every shot. 3 baskets rewards once.
   Each hoop furniture throws a different ball with its own physics and bonus:
     1 圓弧 basketball  – standard; swish +1
     2 雙層 volleyball  – light and floaty (air drag), lively rim; every rim bounce before the basket +1
     3 星形 tennis ball – small and very bouncy; bank shot (backboard, no rim) +2, swish +1
     4 格柵 shot put    – heavy: strong gravity, dead bounces, the hoop shakes; every basket worth 3
     5 復古 yarn ball   – soft with heavy drag, unrolls a string behind it; swish +1 */
const MiniToss=(()=>{
 const P=MiniPhys,W=360,H=440,FLOOR=412,HALF=23,LIP=3,START={x:78,y:330},STAND=341;
 // r radius · g gravity · drag (1/s) · e* restitution · v0..v1 launch speed range · net = net drag factor · base points
 const BALLS=[
  {id:'basket',r:11,g:720,drag:.05,eFloor:.55,eRim:.5,eBoard:.62,v0:300,v1:920,net:1,base:2,snd:1},
  {id:'volley',r:12,g:600,drag:.42,eFloor:.68,eRim:.66,eBoard:.7,v0:300,v1:1000,net:.8,base:2,snd:.7},
  {id:'tennis',r:7,g:720,drag:.12,eFloor:.8,eRim:.62,eBoard:.75,v0:300,v1:920,net:.7,base:2,snd:.5},
  {id:'shot',r:10,g:1150,drag:0,eFloor:.12,eRim:.2,eBoard:.25,v0:360,v1:1180,net:.25,base:3,snd:1.3},
  {id:'yarn',r:10,g:650,drag:1,eFloor:.25,eRim:.3,eBoard:.35,v0:340,v1:1250,net:1.3,base:2,snd:.3}];
 const HOOPS=[[[258,214],[284,182],[246,158],[300,216],[274,134]],[[250,200],[296,170],[262,232],[236,150],[300,140]],[[270,226],[240,172],[300,190],[256,128],[290,160]],[[244,206],[290,214],[268,150],[302,178],[246,128]],[[262,190],[300,232],[236,176],[288,140],[268,118]]];
 const THEMES=[{wall:['#f6e7cf','#ecd5b2'],stripe:'#e7cfa8',floor:['#c9976a','#a87650'],rug:'#c98da4',accent:'#e98a5b'},{wall:['#e4eef2','#cfdfe6'],stripe:'#c4d6de',floor:['#b9926e','#94704f'],rug:'#7fb3c8',accent:'#5b9dc0'},{wall:['#ebe5f7','#d9cfee'],stripe:'#cfc3e6',floor:['#a98b74','#86684f'],rug:'#b49ae0',accent:'#9a7ad1'},{wall:['#e8f0df','#d4e2c6'],stripe:'#c7d8b5',floor:['#b48c63','#8f6a45'],rug:'#9cc48a',accent:'#6aa25a'},{wall:['#f3dfc8','#e3c4a2'],stripe:'#d8b48c',floor:['#8f5e3d','#6b4229'],rug:'#d0775f',accent:'#c4573f'}];
 const RIM={e:.5,f:.06},BOARD={e:.62,f:.05},SOLID={e:.45,f:.08};
 const t=(k,a)=>MiniHost.t(k,a);
 const hoopAt=(s,i)=>{const[x,y]=HOOPS[s.variant][Math.min(4,i)];return{x,y}};
 const speedOf=(p,B=BALLS[0])=>B.v0+p*(B.v1-B.v0);
 // 0.92.29b: pull sensitivity halved — the same drag distance now gives half the power (full power needs a 260 px pull).
 const PULL=260;
 function solids(g){const x=g.hoop.x,y=g.hoop.y,w=[],B=g.B;
  P.poly(w,[[x+30,y-66],[x+30,y+10]],3,{e:B.eBoard,f:.05},'board');P.poly(w,[[x+HALF,y],[x+30,y]],2,{e:B.eRim,f:.06},'rim');P.poly(w,[[x+36,y+10],[x+36,FLOOR]],3,SOLID,'pole');
  P.poly(w,[[56,FLOOR],[56,343],[100,343],[100,FLOOR]],2,SOLID,'stand');return w}
 function rest(g){g.ball={x:START.x,y:STAND-g.B.r,vx:0,vy:0,r:g.B.r,spin:0};g.phase='aim';g.drag=null;g.touchRim=false;g.touchBoard=false;g.floorHits=0;g.rimHits=0;g.rimCd=0;g.made=false;g.flyT=0;g.trail=[];g.yarn=[]}
 function shoot(s,host,angle,power){const g=s.g;if(g.phase!=='aim'||s.over)return false;const v=speedOf(power,g.B);g.ball.vx=Math.cos(angle)*v;g.ball.vy=Math.sin(angle)*v;g.phase='fly';g.drag=null;g.shotPower=power;MiniAudio.sfx('throw',.4+power*.6);return true}
 function aimFromDrag(g){const d=g.drag;if(!d)return null;const px=d.ox-d.x,py=d.oy-d.y,len=Math.hypot(px,py);if(len<8)return{valid:false,power:0,angle:-1};const angle=Math.atan2(py,px),power=Math.min(1,len/PULL);return{angle,power,valid:py<-6&&px>-20}}
 function finishShot(s,host,kind){const g=s.g;g.results[g.shot]=kind;g.phase='next';g.nextT=kind==='miss'?.7:1;if(kind==='miss'){g.streak=0;host.say(s,t('tossMiss'))}}
 const game={
  size:{w:W,h:H},dt:1/240,help:s=>'tossHelp',
  create(s){const g={B:BALLS[s.variant]||BALLS[0],th:THEMES[s.variant],shot:0,makes:0,score:0,streak:0,results:[],hoop:hoopAt(s,0),from:null,slide:1,kb:{angle:-.95,power:.55,used:false,keys:new Set()},t:0,net:0,best:MiniHost.record(s.k).tossBest||0};g.walls=solids(g);rest(g);return g},
  step(s,dt,host){const g=s.g,b=g.ball;g.t+=dt;g.net=Math.max(0,g.net-dt*2.2);
   if(g.slide<1){g.slide=Math.min(1,g.slide+dt/.55);const k=1-Math.pow(1-g.slide,3);g.hoop={x:g.from.x+(g.to.x-g.from.x)*k,y:g.from.y+(g.to.y-g.from.y)*k};g.walls=solids(g)}
   // keyboard aiming (held arrows change angle / power smoothly)
   const K=g.kb.keys;if(K.size&&g.phase==='aim'){if(K.has('L'))g.kb.angle-=1.1*dt;if(K.has('R'))g.kb.angle+=1.1*dt;if(K.has('U'))g.kb.power+=.35*dt;if(K.has('D'))g.kb.power-=.35*dt;g.kb.angle=P.clamp(g.kb.angle,-1.55,-.1);g.kb.power=P.clamp(g.kb.power,.05,1)}
   if(g.phase==='next'){if((g.nextT-=dt)<=0){g.shot++;if(g.shot>=5){g.phase='over';const best=Math.max(g.best,g.score);host.end(s,{field:'tossBest',value:g.score,lines:[t('tossMakes',[g.makes]),t('scoreLine',[g.score]),t('bestLine',[best])],say:t('tossMakes',[g.makes])});MiniAudio.sfx(g.makes>=3?'win':'over')}else{g.from=g.hoop;g.to=hoopAt(s,g.shot);g.slide=0;rest(g)}}
    if(g.phase==='over')return}
   if(g.phase!=='fly'&&!(g.phase==='next'&&b.vx+b.vy))return;
   const B=g.B,BR=B.r;g.flyT+=dt;g.rimCd-=dt;const n=P.substeps(b,dt,BR*.4),h=dt/n,hx=g.hoop.x,hy=g.hoop.y;
   for(let i=0;i<n;i++){const py=b.y;b.vy+=B.g*h;const dr=1-B.drag*h;b.vx*=dr;b.vy*=dr;b.x+=b.vx*h;b.y+=b.vy*h;
    // net: soft funnel + drag while inside the cords
    if(b.y>hy&&b.y<hy+34&&Math.abs(b.x-hx)<HALF){b.vx=b.vx*(1-6*B.net*h)+(hx-b.x)*14*h;b.vy*=1-2.5*B.net*h}
    for(const w of g.walls){const c=P.capsule(b,w);if(c&&c.impact>25){if(w.tag==='rim'){g.touchRim=true;if(g.rimCd<=0&&!g.made){g.rimHits++;g.rimCd=.12}MiniAudio.sfx('rim',c.impact/500*B.snd);if(B.id==='shot')s.shake=.5}else if(w.tag==='board'){g.touchBoard=true;MiniAudio.sfx('board',c.impact/600*B.snd);if(B.id==='shot'){s.shake=.6;g.net=Math.max(g.net,.6)}}else MiniAudio.sfx('bounce',c.impact/600*B.snd)}}
    for(const lx of[hx-HALF,hx+HALF]){const c=P.circle(b,lx,hy,LIP,{e:B.eRim,f:.06});if(c&&c.impact>15){g.touchRim=true;if(g.rimCd<=0&&!g.made){g.rimHits++;g.rimCd=.12}MiniAudio.sfx('rim',c.impact/500*B.snd);if(B.id==='shot'){s.shake=.5;g.net=Math.max(g.net,.5)}}}
    if(b.y+BR>FLOOR){b.y=FLOOR-BR;if(b.vy>0){if(b.vy>90){MiniAudio.sfx('bounce',b.vy/700*B.snd);if(!g.made)g.floorHits++;if(B.id==='shot'&&b.vy>300)s.shake=.7}b.vy*=-B.eFloor;b.vx*=B.id==='yarn'?.6:.82}}
    if(b.x-BR<0){b.x=BR;b.vx=Math.abs(b.vx)*.6}
    // basket: centre crosses the rim line downward between the lips (never from below)
    if(!g.made&&g.phase==='fly'&&py<hy&&b.y>=hy&&b.vy>0){const x=b.x;if(x>hx-HALF+LIP&&x<hx+HALF-LIP){g.made=true;g.makes++;g.streak++;const swish=!g.touchRim&&!g.touchBoard;let bonus=0,label=null;
      if(B.id==='volley'){if(g.rimHits){bonus=g.rimHits;label=null;host.pop(s,hx,hy-48,t('tossRimN',[g.rimHits]),'#ffd27a',15)}}else if(B.id==='tennis'){if(g.touchBoard&&!g.touchRim){bonus=2;label='tossBank2'}else if(swish){bonus=1;label='tossSwish'}}else if(B.id!=='shot'&&swish){bonus=1;label='tossSwish'}
      if(!label&&!bonus&&g.touchBoard&&!g.touchRim)label='tossBank';
      const pts=B.base+bonus+(g.streak>1?1:0);g.score+=pts;g.net=1;
      MiniAudio.sfx('swish');host.pop(s,hx,hy-26,'+'+pts,'#fff3c4',20);if(label)host.pop(s,hx,hy-48,t(label),'#ffd27a',15);if(g.streak>1)host.pop(s,hx,hy-68,t('tossStreak',[g.streak]),'#ffb3c7',14);
      host.burst(s,hx,hy+20,'#fff1c9',12,120);host.say(s,t('tossMade',[g.makes]));
      if(g.makes>=3&&!s.won){host.win(s);MiniAudio.sfx('goal');host.pop(s,180,120,t('tossGoal'),'#ffe58a',22)}
      finishShot(s,host,bonus?'swish':'make')}}}
   P.cap(b,1400);b.spin+=b.vx*dt/BR;
   if(g.t%0.03<dt){g.trail.push([b.x,b.y]);if(g.trail.length>8)g.trail.shift();if(B.id==='yarn'&&g.yarn.length<160)g.yarn.push([b.x,b.y])}
   if(g.phase==='fly'){const slow=b.y>=FLOOR-BR-1&&Math.hypot(b.vx,b.vy)<(B.id==='tennis'?30:60);if(slow||b.x>W+30||b.x<-40||g.flyT>6)finishShot(s,host,'miss')}},
  pointer(s,kind,p,e,host){const g=s.g;if(g.phase!=='aim')return;
   if(kind==='down'){g.drag={id:e.pointerId,ox:p.x,oy:p.y,x:p.x,y:p.y}}
   else if(kind==='move'&&g.drag?.id===e.pointerId){g.drag.x=p.x;g.drag.y=p.y}
   else if((kind==='up'||kind==='cancel')&&g.drag?.id===e.pointerId){const a=aimFromDrag(g);g.drag=null;if(kind==='up'&&a?.valid&&a.power>.1){g.kb.angle=a.angle;g.kb.power=a.power;shoot(s,host,a.angle,a.power)}}},
  key(s,code,down,e,host){const g=s.g,dir={ArrowLeft:'L',KeyA:'L',ArrowRight:'R',KeyD:'R',ArrowUp:'U',KeyW:'U',ArrowDown:'D',KeyS:'D'}[code];
   if(dir){if(down){g.kb.keys.add(dir);g.kb.used=true}else g.kb.keys.delete(dir);return true}
   if(code==='Space'||code==='Enter'){if(down&&!e.repeat)shoot(s,host,g.kb.angle,g.kb.power);return true}return false},
  release(s){const g=s.g;if(!g)return;g.drag=null;g.kb.keys.clear()},
  controls(s,host){const g=s.g;return[h('button',{class:'chip mg-launch primary',type:'button',onclick:()=>{if(g.phase==='aim')shoot(s,host,g.kb.angle,g.kb.power)}},t('tossShoot')),h('span',{class:'hint mg-keys',text:t('tossKeys')})]},
  // ---------- drawing ----------
  draw(c,s){const g=s.g,th=g.th,b=g.ball,hx=g.hoop.x,hy=g.hoop.y;
   const wg=c.createLinearGradient(0,0,0,FLOOR);wg.addColorStop(0,th.wall[0]);wg.addColorStop(1,th.wall[1]);c.fillStyle=wg;c.fillRect(0,0,W,FLOOR);
   c.fillStyle=th.stripe;for(let x=10;x<W;x+=36)c.fillRect(x,44,12,FLOOR-44-70);c.fillStyle='rgba(120,80,50,.18)';c.fillRect(0,FLOOR-70,W,4);
   // window with night/day sky depending on variant
   c.fillStyle='#fff8ec';MiniTable.round(c,128,70,74,64,6);c.fill();c.fillStyle=s.variant===2?'#3b3a74':'#bfe3f2';MiniTable.round(c,133,75,64,54,4);c.fill();c.fillStyle='#fff8ec';c.fillRect(163,75,4,54);c.fillRect(133,100,64,4);
   const fg=c.createLinearGradient(0,FLOOR,0,H);fg.addColorStop(0,th.floor[0]);fg.addColorStop(1,th.floor[1]);c.fillStyle=fg;c.fillRect(0,FLOOR,W,H-FLOOR);c.strokeStyle='rgba(60,30,10,.25)';c.lineWidth=1;for(let x=0;x<W;x+=48){c.beginPath();c.moveTo(x,FLOOR);c.lineTo(x-14,H);c.stroke()}
   c.fillStyle=th.rug;c.globalAlpha=.75;c.beginPath();c.ellipse(140,FLOOR+14,90,9,0,0,7);c.fill();c.globalAlpha=1;
   // pedestal cushion
   c.fillStyle='rgba(0,0,0,.18)';c.beginPath();c.ellipse(78,FLOOR+3,30,5,0,0,7);c.fill();c.fillStyle=th.accent;MiniTable.round(c,54,341,48,FLOOR-341,8);c.fill();c.fillStyle='rgba(255,255,255,.35)';MiniTable.round(c,58,345,40,8,4);c.fill();
   // pole, board
   c.fillStyle='#7d7486';c.fillRect(hx+33,hy+8,6,FLOOR-hy-8);c.fillStyle='rgba(0,0,0,.2)';c.beginPath();c.ellipse(hx+36,FLOOR+3,16,4,0,0,7);c.fill();
   c.fillStyle='#fffdf7';MiniTable.round(c,hx+26,hy-68,9,82,3);c.fill();c.strokeStyle='#bdb4c6';c.lineWidth=1.5;c.stroke();c.strokeStyle=th.accent;c.lineWidth=2;c.strokeRect(hx+27.5,hy-30,6,22);
   // ball shadow, trail, ball
   const B=g.B,BR=B.r,air=Math.max(0,FLOOR-b.y),sh=Math.max(.25,1-air/360);c.fillStyle=`rgba(40,20,10,${(B.id==='shot'?.4:.28)*sh})`;c.beginPath();c.ellipse(b.x,FLOOR+2,BR*1.3*sh+3,3.5*sh+1,0,0,7);c.fill();
   if(B.id==='yarn'&&g.yarn.length){c.strokeStyle='#e88aa0';c.lineWidth=1.6;c.beginPath();c.moveTo(START.x,STAND-4);g.yarn.forEach(([x,y],i)=>c.lineTo(x+Math.sin(i*.9)*1.5,y+Math.cos(i*.7)*1.5));c.lineTo(b.x,b.y);c.stroke()}
   else if(g.phase==='fly')g.trail.forEach(([x,y],i)=>{c.fillStyle=`rgba(${B.id==='shot'?'90,90,100':'240,150,90'},${i/g.trail.length*.18})`;c.beginPath();c.arc(x,y,BR*(.4+i/g.trail.length*.5),0,7);c.fill()});
   drawBall(c,B,b.x,b.y,b.spin);
   // rim + net in front of the ball
   const sw=Math.sin(g.t*22)*g.net*4;c.strokeStyle='rgba(255,255,255,.9)';c.lineWidth=1.3;for(let i=0;i<=5;i++){const x0=hx-HALF+i*HALF*2/5,x1=hx-13+i*26/5+sw*(i%2?1:-1);c.beginPath();c.moveTo(x0,hy+1);c.quadraticCurveTo((x0+x1)/2+sw,hy+18+g.net*4,x1,hy+32+g.net*5);c.stroke()}
   for(let k=1;k<=3;k++){const y=hy+k*9+g.net*k,wd=HALF-(k*3.4);c.beginPath();c.moveTo(hx-wd+sw,y);c.lineTo(hx+wd+sw,y);c.stroke()}
   c.strokeStyle='#e0603a';c.lineWidth=4;c.lineCap='round';c.beginPath();c.moveTo(hx-HALF,hy);c.lineTo(hx+30,hy);c.stroke();
   // aiming
   if(g.phase==='aim'&&!s.over){const a=g.drag?aimFromDrag(g):g.kb.used||!g.shot?{angle:g.kb.angle,power:g.kb.power,valid:true,kb:true}:null;
    if(g.drag){c.strokeStyle='rgba(90,70,100,.35)';c.lineWidth=2;c.beginPath();c.arc(g.drag.ox,g.drag.oy,14,0,7);c.stroke();c.fillStyle='rgba(90,70,100,.35)';c.beginPath();c.arc(g.drag.x,g.drag.y,7,0,7);c.fill();c.setLineDash([3,4]);c.beginPath();c.moveTo(g.drag.ox,g.drag.oy);c.lineTo(g.drag.x,g.drag.y);c.stroke();c.setLineDash([])}
    if(a&&a.power>0){const ok=a.valid&&a.power>.1,v=speedOf(a.power,B),col=ok?`hsl(${120-a.power*100},65%,45%)`:'rgba(180,60,60,.7)';
     if(ok){let x=b.x,y=b.y,vx=Math.cos(a.angle)*v,vy=Math.sin(a.angle)*v;c.fillStyle='rgba(80,60,90,.55)';for(let i=1;i<=9;i++){const tt=.034,dr=1-B.drag*tt;vx*=dr;vy*=dr;x+=vx*tt;y+=vy*tt;vy+=B.g*tt;c.beginPath();c.arc(x,y,2.6-i*.18,0,7);c.fill()}}
     c.save();c.translate(b.x,b.y);c.rotate(a.angle);c.strokeStyle=col;c.fillStyle=col;c.lineWidth=4;c.lineCap='round';const L=18+a.power*34;c.beginPath();c.moveTo(BR+3,0);c.lineTo(BR+L,0);c.stroke();c.beginPath();c.moveTo(BR+L+7,0);c.lineTo(BR+L-2,-6);c.lineTo(BR+L-2,6);c.fill();c.restore();
     c.strokeStyle=col;c.lineWidth=3;c.beginPath();c.arc(b.x,b.y,BR+6,-Math.PI/2,-Math.PI/2+a.power*Math.PI*2);c.stroke()}
    if(!g.shot&&!g.drag&&!g.kb.used){c.fillStyle='rgba(60,45,70,.8)';c.font='800 17px system-ui,sans-serif';c.textAlign='center';c.fillText(t('tossHint'),180,268);c.font='600 15px system-ui,sans-serif';c.fillText(t('ballTip_'+B.id),180,291)}}
   this.hud(c,s)},
  hud(c,s){const g=s.g;MiniTable.round(c,8,6,344,34,10);c.fillStyle='rgba(40,30,50,.78)';c.fill();
   for(let i=0;i<5;i++){const r=g.results[i],x=24+i*22,cur=i===g.shot&&g.phase!=='over';c.fillStyle=r==='swish'?'#ffd27a':r==='make'?'#8fd39a':r==='miss'?'#6b6074':'#3c3148';c.beginPath();c.arc(x,23,7,0,7);c.fill();if(cur){c.strokeStyle='#fff';c.lineWidth=2;c.stroke()}if(r==='miss'){c.strokeStyle='#bfb3cc';c.lineWidth=1.5;c.beginPath();c.moveTo(x-3,20);c.lineTo(x+3,26);c.moveTo(x+3,20);c.lineTo(x-3,26);c.stroke()}}
   c.textAlign='left';c.fillStyle=s.won?'#8fd39a':'#fff3dc';c.font='800 16px system-ui,sans-serif';c.fillText(s.won?t('tossMakes',[g.makes]):t('tossMadeBar',[g.makes]),134,28);c.fillStyle='#cbbfd8';c.font='700 13px system-ui,sans-serif';c.fillText(t('ball_'+g.B.id),236,28);
   c.textAlign='right';c.fillStyle='#fff3dc';c.fillText(t('scoreShort',[g.score]),342,28)}
 };
 // Classic volleyball face: three seams leave a central junction and bend as they reach the rim; the panel group
 // clockwise of each seam is split into three strips by curves parallel to that seam, which end on the next seam.
 function volley(c,r){const T=Math.PI*2/3,lw=Math.max(1,r*.085),ink='#3b3a46',J=[r*.02,-r*.05],W=r*.31;
  const seam=k=>{const a=k*T-Math.PI/2,b=a+.8,P1=[J[0]+Math.cos(b)*r*.62,J[1]+Math.sin(b)*r*.62],P2=[Math.cos(a)*r,Math.sin(a)*r];
   // quadratic J -> P2 (control P1), sampled and extrapolated past both ends; d offsets it to the clockwise side
   return(d=0,t0=0,t1=1.5)=>{const out=[];for(let i=0;i<=24;i++){const t=t0+(t1-t0)*i/24,u=1-t,x=u*u*J[0]+2*u*t*P1[0]+t*t*P2[0],y=u*u*J[1]+2*u*t*P1[1]+t*t*P2[1],tx=2*(u*(P1[0]-J[0])+t*(P2[0]-P1[0])),ty=2*(u*(P1[1]-J[1])+t*(P2[1]-P1[1])),l=Math.hypot(tx,ty)||1;out.push([x-ty/l*d,y+tx/l*d])}return out}};
  const line=pts=>{c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()};
  c.fillStyle='#fbfaf6';c.beginPath();c.arc(0,0,r,0,7);c.fill();
  c.save();c.beginPath();c.arc(0,0,r,0,7);c.clip();c.strokeStyle=ink;c.lineWidth=lw;c.lineJoin=c.lineCap='round';
  for(let k=0;k<3;k++){const A=seam(k),Bs=seam(k+1),a=k*T-Math.PI/2;
   c.save();c.beginPath();const pa=A(),pb=Bs();pa.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.arc(0,0,r*1.8,Math.atan2(pa[pa.length-1][1],pa[pa.length-1][0]),Math.atan2(pb[pb.length-1][1],pb[pb.length-1][0]));for(let i=pb.length-1;i>=0;i--)c.lineTo(pb[i][0],pb[i][1]);c.closePath();c.clip();
   c.fillStyle=['rgba(110,110,130,.05)','rgba(110,110,130,.12)','rgba(255,255,255,0)'][k];c.fillRect(-r,-r,2*r,2*r);
   for(const d of[W,2*W])line(A(d,-.8,1.6));c.restore()}
  for(let k=0;k<3;k++)line(seam(k)());
  c.restore();const sh=c.createRadialGradient(-r*.35,-r*.4,r*.1,0,0,r);sh.addColorStop(0,'rgba(255,255,255,.35)');sh.addColorStop(.65,'rgba(255,255,255,0)');sh.addColorStop(1,'rgba(40,40,70,.28)');c.fillStyle=sh;c.beginPath();c.arc(0,0,r,0,7);c.fill();
  c.strokeStyle=ink;c.lineWidth=lw*1.25;c.beginPath();c.arc(0,0,r-lw*.6,0,7);c.stroke()}
 function drawBall(c,B,x,y,spin){const r=B.r;c.save();c.translate(x,y);
  if(B.id==='basket'){const g=c.createRadialGradient(-4,-4,2,0,0,r);g.addColorStop(0,'#ffc28a');g.addColorStop(.6,'#ee8a45');g.addColorStop(1,'#b5562a');c.fillStyle=g;c.beginPath();c.arc(0,0,r,0,7);c.fill();c.rotate(spin);c.strokeStyle='#6b3418';c.lineWidth=1.2;c.beginPath();c.moveTo(-r,0);c.lineTo(r,0);c.moveTo(0,-r);c.lineTo(0,r);c.stroke();c.beginPath();c.arc(-r*1.25,0,r*.9,-.8,.8);c.stroke();c.beginPath();c.arc(r*1.25,0,r*.9,Math.PI-.8,Math.PI+.8);c.stroke()}
  else if(B.id==='volley'){c.rotate(spin);volley(c,r);c.rotate(-spin)}
  else if(B.id==='tennis'){const g=c.createRadialGradient(-2,-2,1,0,0,r);g.addColorStop(0,'#f4ff9a');g.addColorStop(1,'#b8d43a');c.fillStyle=g;c.beginPath();c.arc(0,0,r,0,7);c.fill();c.rotate(spin);c.strokeStyle='#fff';c.lineWidth=1.3;c.beginPath();c.arc(-r*1.15,0,r*.95,-.75,.75);c.stroke();c.beginPath();c.arc(r*1.15,0,r*.95,Math.PI-.75,Math.PI+.75);c.stroke()}
  else if(B.id==='shot'){const g=c.createRadialGradient(-3,-4,1,0,0,r);g.addColorStop(0,'#d8d8de');g.addColorStop(.35,'#7c7c88');g.addColorStop(1,'#2e2e36');c.fillStyle=g;c.beginPath();c.arc(0,0,r,0,7);c.fill()}
  else{c.fillStyle='#ef94a8';c.beginPath();c.arc(0,0,r,0,7);c.fill();c.rotate(spin);c.strokeStyle='#c8607a';c.lineWidth=1.2;for(let k=-2;k<=2;k++){c.beginPath();c.ellipse(0,0,r*.95,Math.abs(k)*r*.22+1,k*.5,0,7);c.stroke()}}
  c.restore()}
 MiniTable.register('toss',game);
 return{game,HOOPS,HALF,START,STAND,BALLS,speedOf,FLOOR,PULL,drawBall};
})();
