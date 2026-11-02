/* 0.92.30 Purr Cozy vending machine (cozy_vending_1..5; catalog cozyGame is still 'reaction', routed here by item id).
   You run the machine for 75 seconds. Cat customers queue up and show what they want in a speech bubble; find the item
   behind the glass, punch its code (A–D + 1–3) on the keypad, the coil turns and the item drops into the tray.
   Snacks sometimes get stuck on the shelf edge: tap the glass / press Space to shake the machine — but shake too hard and
   it TILTs for a moment. Serve enough cats to clear (reward once); score = speed + combo.
   Machines differ: 1 drinks · 2 snacks that jam often · 3 cat treats with two-item orders · 4 shelves that reshuffle after
   each sale · 5 retro: impatient cats, bigger tips. */
const MiniVending=(()=>{
 const W=360,H=470,TOP=44,GX=20,GY=56,COLS=3,ROWS=4,CW=224/COLS,RH=56,FLOOR=348,LAND=322,ROUND=75,STOCK=3,LET='ABCD';
 const t=(k,a)=>MiniHost.t(k,a);
 const I=(shape,color,accent)=>({shape,color,accent});
 const SETS=[
  [I('can','#e2554f','#fff'),I('can','#4f86d6','#fff'),I('can','#5bb36a','#fff'),I('can','#f1c043','#a8572b'),I('can','#8a5b3c','#f3d9b0'),I('can','#9b6bd0','#fff'),I('bottle','#8fd0f0','#2f7fb8'),I('bottle','#9ccf7a','#3f7a2f'),I('bottle','#f4a24b','#b35a17'),I('carton','#ffffff','#4f86d6'),I('box','#f6a3bd','#fff'),I('cup','#fff3d6','#f08bb0')],
  [I('bag','#e2554f','#ffd166'),I('bag','#4f86d6','#ffd166'),I('bag','#5bb36a','#fff'),I('bar','#6b3f2a','#e9c48a'),I('bar','#d9a04f','#7a4a20'),I('cookie','#d9a35f','#6b3f2a'),I('onigiri','#ffffff','#2f3a33'),I('donut','#f3c27a','#f08bb0'),I('candy','#f08bb0','#fff'),I('pudding','#f6d36b','#8a5b3c'),I('popcorn','#fff3c4','#e2554f'),I('cupcake','#f6a3bd','#d9a35f')],
  [I('fish','#7fb6e8','#2f5d8a'),I('fish','#f6a3bd','#b34a6c'),I('catcan','#5bb36a','#fff'),I('catcan','#e2554f','#fff'),I('catcan','#4f86d6','#fff'),I('bag','#9b6bd0','#fff'),I('bag','#f4a24b','#fff'),I('carton','#ffffff','#f08bb0'),I('yarn','#f08bb0','#c8607a'),I('yarn','#7fb6e8','#3f6f9a'),I('cookie','#d9a35f','#7fb6e8'),I('mouse','#b8b0c0','#f6a3bd')],
  [I('can','#e2554f','#fff'),I('bag','#e2554f','#ffd166'),I('bottle','#8fd0f0','#2f7fb8'),I('bar','#6b3f2a','#e9c48a'),I('can','#4f86d6','#fff'),I('onigiri','#ffffff','#2f3a33'),I('box','#f6a3bd','#fff'),I('donut','#f3c27a','#f08bb0'),I('can','#5bb36a','#fff'),I('cookie','#d9a35f','#6b3f2a'),I('bottle','#9ccf7a','#3f7a2f'),I('candy','#f08bb0','#fff')],
  [I('can','#c9443f','#f3e2c0'),I('can','#3d6f9e','#f3e2c0'),I('bottle','#6fa86a','#f3e2c0'),I('bar','#5a3324','#d9b37a'),I('carton','#f3e2c0','#c9443f'),I('candy','#d9824f','#f3e2c0'),I('can','#d9a04f','#5a3324'),I('bag','#3d6f9e','#f3e2c0'),I('cookie','#c9934f','#5a3324'),I('bottle','#c9443f','#f3e2c0'),I('cup','#f3e2c0','#3d6f9e'),I('donut','#d9a35f','#c9443f')]];
 const RULES=[{stuck:.15,patience:22,goal:7,pairs:0,shuffle:false,tip:1},{stuck:.4,patience:22,goal:7,pairs:0,shuffle:false,tip:1},{stuck:.2,patience:26,goal:5,pairs:.6,shuffle:false,tip:1},{stuck:.2,patience:22,goal:7,pairs:0,shuffle:true,tip:1},{stuck:.25,patience:15,goal:7,pairs:0,shuffle:false,tip:1.5}];
 const THEMES=[{body:'#e98a5b',dark:'#a8572b',glass:'#2e3a4f',panel:'#f6e2c4',bg:['#f6e7cf','#ecd5b2']},{body:'#5b9dc0',dark:'#2f5d7a',glass:'#263447',panel:'#e4eef2',bg:['#e4eef2','#cfdfe6']},{body:'#9a7ad1',dark:'#5e468a',glass:'#2a2645',panel:'#ece4f7',bg:['#ebe5f7','#d9cfee']},{body:'#6aa25a',dark:'#3f6a33',glass:'#26362a',panel:'#e8f0df',bg:['#e8f0df','#d4e2c6']},{body:'#c4573f',dark:'#7a2f20',glass:'#33241e',panel:'#f3e2c0',bg:['#f3dfc8','#e3c4a2']}];
 const CATS=['#f2b36b','#8a8a96','#f4ead8','#3a3238','#d98a5b','#c9c0b4'];
 const KEYS=[...'ABCD'].map((k,i)=>({k,x:266,y:100+i*48})).concat(['1','2','3','X'].map((k,i)=>({k,x:310,y:100+i*48})));
 const SHK={x:264,y:296,w:84,h:42};
 const slotC=i=>({x:GX+CW*(i%COLS+.5),y:GY+RH*(Math.floor(i/COLS)+.5)-4});
 const code=i=>LET[Math.floor(i/COLS)]+(i%COLS+1);
 function newCat(g){const avail=g.slots.map((s,i)=>s.stock>0?i:-1).filter(i=>i>=0);if(!avail.length){g.cat=null;return}
  const pick=()=>avail.splice(Math.floor(Math.random()*avail.length),1)[0],want=[g.slots[pick()].item];if(g.R.pairs&&Math.random()<g.R.pairs&&avail.length)want.push(g.slots[pick()].item);
  g.cat={want,got:[],color:CATS[Math.floor(Math.random()*CATS.length)],patience:g.R.patience,max:g.R.patience,mood:'wait',t:0,enter:0}}
 function fill(g){g.slots=Array.from({length:12},(_,i)=>({item:g.set[i],stock:STOCK,fade:0}));for(let i=11;i>0;i--){const j=Math.floor(Math.random()*(i+1));[g.slots[i],g.slots[j]]=[g.slots[j],g.slots[i]]}}
 function say(g,key,args=[],life=1.6){g.msg={key,args,t:0,life}}
 function press(s,host,k){const g=s.g;if(s.over||g.lock>0||g.drop){if(g.lock>0)MiniAudio.sfx('error');return}g.flashKey={k,t:.15};
  if(k==='X'){g.entry='';MiniAudio.sfx('sling',.4);return}
  if(LET.includes(k)){g.entry=k;MiniAudio.sfx('lane',.6);return}
  if(!g.entry){MiniAudio.sfx('error');say(g,'vendLetterFirst');return}
  const i=LET.indexOf(g.entry)*COLS+Number(k)-1;g.entry+=k;MiniAudio.sfx('lane',.8);
  if(g.slots[i].stock<=0){say(g,'vendSoldOut');MiniAudio.sfx('error');g.entryT=.5;return}
  g.slots[i].stock--;g.drop={i,item:g.slots[i].item,phase:'push',t:0,x:slotC(i).x,y:slotC(i).y,vy:0,rot:0,stuck:Math.random()<g.R.stuck,shakes:0};g.entryT=.6;MiniAudio.sfx('launch',.25)}
 // ---------- phone shake (DeviceMotion / MEMS accelerometer) ----------
 // On phones the machine is shaken by shaking the phone. Android starts listening when the game opens; iOS needs the
 // permission inside a tap, so the first tap on the canvas (keypad or glass) turns it on there.
 const isPhone=()=>'DeviceMotionEvent'in window&&window.isSecureContext&&(document.body?.classList.contains('m')||matchMedia('(pointer:coarse)').matches);
 function motionStop(g){if(g?.mHandler){window.removeEventListener('devicemotion',g.mHandler);g.mHandler=null}}
 async function motionStart(s,host,ask){const g=s.g,D=window.DeviceMotionEvent;if(!g||g.mHandler||!isPhone())return;g.mWait=false;
  if(typeof D.requestPermission==='function'){let st=null;try{st=await D.requestPermission()}catch{}if(host.session!==s||s.g!==g)return;if(st!=='granted'){g.mWait=!ask;return}}
  let last=0;const grav={x:0,y:0,z:0,ok:false};
  g.mHandler=e=>{if(host.session!==s||s.g!==g)return;const a=e.acceleration,ag=e.accelerationIncludingGravity;let m;
   if(a&&a.x!=null)m=Math.hypot(a.x,a.y||0,a.z||0);
   else if(ag&&ag.x!=null){if(!grav.ok){Object.assign(grav,{x:ag.x,y:ag.y||0,z:ag.z||0,ok:true})}grav.x+=(ag.x-grav.x)*.1;grav.y+=((ag.y||0)-grav.y)*.1;grav.z+=((ag.z||0)-grav.z)*.1;m=Math.hypot(ag.x-grav.x,(ag.y||0)-grav.y,(ag.z||0)-grav.z)}
   else return;
   if(!g.mSeen){g.mSeen=true;say(g,'vendMotionOn',[],2.4)}
   const now=performance.now();if(m>SHAKE_G&&now-last>280){last=now;shake(s,host)}};
  window.addEventListener('devicemotion',g.mHandler)}
 const SHAKE_G=12;// m/s² of linear acceleration that counts as one shake (a tap on the screen stays well below this)
 function shake(s,host){const g=s.g;if(s.over||g.lock>0)return;g.shakeV=1;g.meter+=28;s.shake=.5;MiniAudio.sfx('bounce',.8);
  if(g.meter>100){g.lock=2.5;g.meter=0;say(g,'vendTilt',[],2.2);MiniAudio.sfx('drain');return}
  const d=g.drop;if(d&&d.phase==='stuck'){d.shakes++;if(Math.random()<.35||d.shakes>=4){d.phase='fall';d.vy=60;say(g,'vendFreed',[],1)}}}
 function deliver(s,host,d){const g=s.g,c=g.cat;
  if(!c||c.mood!=='wait'){g.combo=0;say(g,'vendNobody');MiniAudio.sfx('error');return}
  const k=c.want.findIndex((w,j)=>w===d.item&&!c.got[j]);
  if(k<0){c.patience=Math.max(0,c.patience-3);g.combo=0;c.mood='wait';c.huh=1;say(g,'vendWrong');MiniAudio.sfx('error');return}
  c.got[k]=true;MiniAudio.sfx('target');
  if(c.got.filter(Boolean).length===c.want.length){g.combo++;const pts=Math.round((10*c.want.length+Math.ceil(c.patience)+2*(g.combo-1))*g.R.tip);g.score+=pts;g.served++;c.mood='happy';c.t=0;
   host.pop(s,80,372,'+'+pts,'#fff3c4',20);if(g.combo>1)host.pop(s,80,348,t('vendCombo',[g.combo]),'#ffd27a',13);MiniAudio.sfx('bonus');host.say(s,t('vendServed',[g.served,g.R.goal]));
   if(g.served>=g.R.goal&&!s.won){host.win(s);say(g,'vendGoal',[],2.2);MiniAudio.sfx('goal')}
   if(g.R.shuffle){for(let n=0;n<3;n++){const a=Math.floor(Math.random()*12),b=Math.floor(Math.random()*12);[g.slots[a],g.slots[b]]=[g.slots[b],g.slots[a]];g.slots[a].fade=g.slots[b].fade=.6}say(g,'vendShuffle',[],1.6)}}}
 const game={
  size:{w:W,h:H},dt:1/120,help:s=>'vendHelp'+s.variant,
  create(s,host){motionStop(s.g);if(host)setTimeout(()=>{if(host.session===s)motionStart(s,host)},0);const v=s.variant,g={th:THEMES[v],R:RULES[v],set:SETS[v],time:ROUND,score:0,served:0,combo:0,entry:'',entryT:0,drop:null,meter:0,lock:0,shakeV:0,msg:null,t:0,next:.8,queue:[0,1].map(()=>CATS[Math.floor(Math.random()*CATS.length)]),best:MiniHost.record(s.k).vendingBest||0};
   fill(g);g.cat=null;say(g,'vendStart',[],2.6);return g},
  step(s,dt,host){const g=s.g;g.t+=dt;if(g.msg&&(g.msg.t+=dt)>g.msg.life)g.msg=null;if(g.flashKey&&(g.flashKey.t-=dt)<=0)g.flashKey=null;
   g.meter=Math.max(0,g.meter-32*dt);g.shakeV=Math.max(0,g.shakeV-dt*3);if(g.lock>0)g.lock-=dt;for(const sl of g.slots)if(sl.fade>0)sl.fade-=dt;
   if(g.entryT>0&&(g.entryT-=dt)<=0)g.entry='';
   if(s.over)return;
   g.time-=dt;if(g.time<=0){g.time=0;const best=Math.max(g.best,g.score);host.end(s,{field:'vendingBest',value:g.score,lines:[t('vendResult',[g.served]),t('scoreLine',[g.score]),t('bestLine',[best])],say:t('vendResult',[g.served])});MiniAudio.sfx(s.won?'win':'over');return}
   // customers
   const c=g.cat;
   if(!c){if((g.next-=dt)<=0){newCat(g);g.queue.push(CATS[Math.floor(Math.random()*CATS.length)]);g.queue.shift()}}
   else{c.t+=dt;c.enter=Math.min(1,c.enter+dt*3);if(c.huh)c.huh=Math.max(0,c.huh-dt*2);
    if(c.mood==='wait'){c.patience-=dt;if(c.patience<=0){c.mood='sad';c.t=0;g.combo=0;say(g,'vendLeft');MiniAudio.sfx('error')}}
    else if(c.t>1){g.cat=null;g.next=.6}}
   // dispensing
   const d=g.drop;if(d){d.t+=dt;
    if(d.phase==='push'){d.y=slotC(d.i).y+Math.min(1,d.t/.6)*8;if(d.t>=.6){if(d.stuck){d.phase='stuck';d.rot=.45;say(g,'vendStuck',[],2.2);MiniAudio.sfx('error')}else{d.phase='fall';d.vy=80}}}
    else if(d.phase==='stuck'){d.rot=.45+Math.sin(g.t*30)*g.shakeV*.25}
    else if(d.phase==='fall'){d.vy+=1100*dt;d.y+=d.vy*dt;d.rot+=dt*4;if(d.y>=LAND){d.y=LAND;MiniAudio.sfx('board',.7);g.drop=null;deliver(s,host,d)}}}},
  pointer(s,kind,p,e,host){if(kind!=='down')return;const g=s.g;if(g.mWait&&host)motionStart(s,host,true);
   for(const b of KEYS)if(p.x>=b.x&&p.x<=b.x+40&&p.y>=b.y&&p.y<=b.y+44){press(s,host,b.k);return}
   if((p.x>=GX&&p.x<=GX+224&&p.y>=GY&&p.y<=GY+RH*ROWS+54)||(p.x>=SHK.x&&p.x<=SHK.x+SHK.w&&p.y>=SHK.y&&p.y<=SHK.y+SHK.h))shake(s,host)},
  key(s,code,down,e,host){if(!down)return/^(Key[A-D]|Digit[1-3]|Numpad[1-3]|Space|Backspace|Escape)$/.test(code);if(e.repeat)return true;
   const m=/^Key([A-D])$/.exec(code)||/^(?:Digit|Numpad)([1-3])$/.exec(code);if(m){press(s,host,m[1]);return true}
   if(code==='Backspace'||code==='Escape'){press(s,host,'X');return true}if(code==='Space'){shake(s,host);return true}return false},
  release(){},
  dispose(s){motionStop(s.g)},
  controls(s,host){return[h('button',{class:'chip mg-launch primary mg-vend-shake',type:'button',onclick:()=>shake(s,host)},t('vendShakeBtn')),h('span',{class:'hint mg-keys',text:t('vendKeys')})]},
  // ---------- drawing ----------
  draw(c,s){const g=s.g,th=g.th,sx=Math.sin(g.t*40)*g.shakeV*3;
   const bg=c.createLinearGradient(0,0,0,H);bg.addColorStop(0,th.bg[0]);bg.addColorStop(1,th.bg[1]);c.fillStyle=bg;c.fillRect(0,0,W,H);
   c.fillStyle='rgba(120,80,50,.18)';c.fillRect(0,FLOOR,W,4);c.fillStyle='#c9976a';c.fillRect(0,FLOOR+4,W,H-FLOOR-4);
   c.save();c.translate(sx,0);
   // machine body + glass
   c.fillStyle='rgba(0,0,0,.18)';MiniTable.round(c,12,TOP+6,248,302,14);c.fill();
   c.fillStyle=th.body;MiniTable.round(c,8,TOP,248,300,14);c.fill();c.fillStyle=th.dark;MiniTable.round(c,8,TOP,248,8,4);c.fill();
   c.fillStyle=th.glass;MiniTable.round(c,GX-4,GY-4,232,RH*ROWS+8,8);c.fill();
   g.slots.forEach((sl,i)=>{const p=slotC(i);c.globalAlpha=sl.fade>0?1-sl.fade/.6*.8:1;
    c.strokeStyle='rgba(200,200,220,.55)';c.lineWidth=1.5;c.beginPath();for(let k=0;k<5;k++){const x=p.x-22+k*11;c.moveTo(x,p.y+14);c.quadraticCurveTo(x+5.5,p.y+8,x+11,p.y+14)}c.stroke();
    // stock behind the front item: drawn first (back to front), fully opaque, smaller and higher so it reads as depth, not a ghost
    for(let k=Math.min(sl.stock,STOCK)-1;k>=0;k--)drawItem(c,sl.item,p.x+k*5,p.y-k*4,.88-k*.08);c.globalAlpha=1;
    if(sl.stock<=0){c.fillStyle='rgba(30,20,30,.55)';c.fillRect(p.x-CW/2+3,p.y-24,CW-6,40);c.fillStyle='#ffd6d6';c.font='800 14px system-ui,sans-serif';c.textAlign='center';c.fillText(t('vendSoldOutTag'),p.x,p.y+2)}
    c.fillStyle=g.entry&&g.entry[0]===code(i)[0]&&(g.entry.length===1||g.entry===code(i))?'#ffe58a':'#f3ead8';MiniTable.round(c,p.x-18,p.y+15,36,18,5);c.fill();c.fillStyle='#3a2a20';c.font='800 14px system-ui,sans-serif';c.textAlign='center';c.fillText(code(i),p.x,p.y+32)});
   c.fillStyle='rgba(255,255,255,.07)';c.beginPath();c.moveTo(GX,GY);c.lineTo(GX+60,GY);c.lineTo(GX+10,GY+RH*ROWS);c.lineTo(GX-4,GY+RH*ROWS);c.fill();
   // tray
   c.fillStyle='#1c1418';MiniTable.round(c,30,288,204,48,8);c.fill();c.fillStyle=th.dark;MiniTable.round(c,30,288,204,12,6);c.fill();
   // dropping item
   const d=g.drop;if(d){c.save();if(d.phase==='fall'&&d.y>288){c.beginPath();c.rect(30,0,204,336);c.clip()}c.translate(d.x,d.y);c.rotate(d.rot);drawItem(c,d.item,0,0,1.05);c.restore()}
   // keypad panel
   c.fillStyle=th.panel;MiniTable.round(c,258,TOP,96,300,12);c.fill();
   c.fillStyle='#1f2a22';MiniTable.round(c,264,54,84,40,6);c.fill();c.fillStyle=g.lock>0?'#ff8f6b':'#9ff0b0';c.font='800 24px ui-monospace,monospace';c.textAlign='center';c.fillText(g.lock>0?'TILT':(g.entry||'--').padEnd(2,'_'),306,82);
   for(const b of KEYS){const on=g.flashKey?.k===b.k;c.fillStyle=on?'#ffe58a':b.k==='X'?'#e7b3a8':LET.includes(b.k)?'#fffaf0':'#f3e2c0';c.strokeStyle=th.dark;c.lineWidth=2;MiniTable.round(c,b.x,b.y+(on?2:0),40,44,8);c.fill();c.stroke();
    c.fillStyle='#3a2a20';c.font='800 22px system-ui,sans-serif';c.fillText(b.k==='X'?'✕':b.k,b.x+20,b.y+30+(on?2:0))}
   // shake button on the panel (the meter fills inside it); on phones this replaces the separate button below the canvas
   c.fillStyle=g.lock>0?'#e7b3a8':'#fffaf0';c.strokeStyle=th.dark;c.lineWidth=2;MiniTable.round(c,SHK.x,SHK.y,SHK.w,SHK.h,8);c.fill();c.stroke();
   c.fillStyle='#3a2a20';{const lab=t(g.mSeen?'vendShakePhone':'vendShakeBtn');let fs=15;c.font=`800 ${fs}px system-ui,sans-serif`;const w=c.measureText(lab).width;if(w>SHK.w-10){fs=Math.max(10,Math.floor(fs*(SHK.w-10)/w));c.font=`800 ${fs}px system-ui,sans-serif`}c.fillText(lab,306,SHK.y+20)}c.fillStyle='rgba(0,0,0,.15)';MiniTable.round(c,SHK.x+6,SHK.y+29,SHK.w-12,7,3.5);c.fill();c.fillStyle=g.meter>70?'#e2554f':g.meter>40?'#f1c043':'#6aa25a';if(g.meter>1){MiniTable.round(c,SHK.x+6,SHK.y+29,(SHK.w-12)*Math.min(1,g.meter/100),7,3.5);c.fill()}
      c.restore();
   this.customers(c,s);this.hud(c,s)},
  customers(c,s){const g=s.g,cat=g.cat;
   g.queue.forEach((col,i)=>{drawCat(c,300+i*34,428,.5,col,'wait')});
   if(!cat){c.fillStyle='rgba(60,45,70,.5)';c.font='700 15px system-ui,sans-serif';c.textAlign='center';c.fillText(t('vendNext'),130,410);return}
   const x=40+(1-cat.enter)*-60;drawCat(c,x+30,418,.85,cat.color,cat.mood,cat.huh);
   if(cat.mood!=='sad'){const bw=34+cat.want.length*48,bx=x+68,by=360;c.fillStyle='#fffaf0';MiniTable.round(c,bx,by,bw,56,12);c.fill();c.beginPath();c.moveTo(bx+4,by+40);c.lineTo(bx-10,by+50);c.lineTo(bx+14,by+46);c.fill();c.strokeStyle='#d9c6a8';c.lineWidth=2;MiniTable.round(c,bx,by,bw,56,12);c.stroke();
    cat.want.forEach((it,j)=>{c.globalAlpha=cat.got[j]?.35:1;drawItem(c,it,bx+40+j*48,by+28,1);c.globalAlpha=1;if(cat.got[j]){c.strokeStyle='#5bb36a';c.lineWidth=3;c.beginPath();c.moveTo(bx+30+j*48,by+30);c.lineTo(bx+38+j*48,by+38);c.lineTo(bx+52+j*48,by+18);c.stroke()}});
    if(cat.mood==='happy'){c.fillStyle='#e2554f';c.font='800 16px system-ui';c.fillText('♥',bx+bw-10,by+12)}
    const k=Math.max(0,cat.patience/cat.max);c.fillStyle='rgba(0,0,0,.15)';MiniTable.round(c,bx,by+62,bw,9,4.5);c.fill();c.fillStyle=k>.5?'#6aa25a':k>.25?'#f1c043':'#e2554f';MiniTable.round(c,bx,by+62,Math.max(9,bw*k),9,4.5);c.fill()}},
  hud(c,s){const g=s.g;MiniTable.round(c,8,6,344,34,10);c.fillStyle='rgba(40,30,50,.8)';c.fill();
   const k=g.time/ROUND;c.fillStyle='#3c3148';MiniTable.round(c,18,17,90,10,5);c.fill();c.fillStyle=k>.3?'#8fd39a':'#ff8f6b';MiniTable.round(c,18,17,Math.max(10,90*k),10,5);c.fill();
   c.fillStyle='#fff3dc';c.font='800 16px system-ui,sans-serif';c.textAlign='left';c.fillText(Math.ceil(g.time)+'s',114,28);
   c.fillStyle=s.won?'#8fd39a':'#fff3dc';c.fillText(t('vendServedBar',[g.served,g.R.goal]),156,28);c.textAlign='right';c.fillStyle='#fff3dc';c.fillText(t('scoreShort',[g.score]),342,28);
   if(g.msg){const m=g.msg,a=Math.min(1,m.t*6,(m.life-m.t)*3);c.save();c.globalAlpha=Math.max(0,a);const txt=t(m.key,m.args);let fs=22;c.font=`900 ${fs}px system-ui,sans-serif`;const mw=c.measureText(txt).width;if(mw>236){fs=Math.max(15,Math.floor(fs*236/mw));c.font=`900 ${fs}px system-ui,sans-serif`}c.textAlign='center';c.lineWidth=6;c.strokeStyle='rgba(20,14,28,.85)';c.strokeText(txt,132,172);c.fillStyle='#ffe58a';c.fillText(txt,132,172);c.restore()}}
 };
 // ---------- item + cat art ----------
 function drawItem(c,it,x,y,k=1){c.save();c.translate(x,y);c.scale(k,k);const C=it.color,A=it.accent;c.lineWidth=1.5;c.strokeStyle='rgba(40,30,40,.55)';
  const rr=(x0,y0,w,h,r)=>{MiniTable.round(c,x0,y0,w,h,r)};
  switch(it.shape){
   case'can':c.fillStyle=C;rr(-10,-17,20,34,5);c.fill();c.stroke();c.fillStyle=A;c.fillRect(-10,-4,20,8);c.fillStyle='#d8d8de';c.fillRect(-8,-19,16,3);break;
   case'bottle':c.fillStyle=C;c.beginPath();c.moveTo(-8,18);c.lineTo(-8,-4);c.quadraticCurveTo(-8,-10,-3,-13);c.lineTo(-3,-18);c.lineTo(3,-18);c.lineTo(3,-13);c.quadraticCurveTo(8,-10,8,-4);c.lineTo(8,18);c.closePath();c.fill();c.stroke();c.fillStyle=A;c.fillRect(-8,0,16,8);c.fillStyle='#fff';c.fillRect(-3,-21,6,4);break;
   case'carton':c.fillStyle=C;c.fillRect(-10,-10,20,28);c.strokeRect(-10,-10,20,28);c.beginPath();c.moveTo(-10,-10);c.lineTo(0,-19);c.lineTo(10,-10);c.closePath();c.fill();c.stroke();c.fillStyle=A;c.fillRect(-10,2,20,7);break;
   case'box':c.fillStyle=C;rr(-10,-14,20,30,3);c.fill();c.stroke();c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.moveTo(5,-14);c.lineTo(7,-22);c.stroke();c.fillStyle=A;c.beginPath();c.arc(0,3,5,0,7);c.fill();break;
   case'cup':c.fillStyle=C;c.beginPath();c.moveTo(-11,-12);c.lineTo(11,-12);c.lineTo(8,16);c.lineTo(-8,16);c.closePath();c.fill();c.stroke();c.fillStyle=A;c.fillRect(-12,-15,24,5);break;
   case'bag':c.fillStyle=C;c.beginPath();c.moveTo(-12,-16);c.lineTo(12,-16);c.lineTo(10,16);c.lineTo(-10,16);c.closePath();c.fill();c.stroke();c.fillStyle=A;c.beginPath();c.arc(0,1,6,0,7);c.fill();c.strokeStyle='rgba(255,255,255,.6)';for(let x=-10;x<=10;x+=4){c.beginPath();c.moveTo(x,-16);c.lineTo(x+2,-13);c.stroke()}break;
   case'bar':c.rotate(-.35);c.fillStyle=C;rr(-14,-7,28,14,3);c.fill();c.stroke();c.fillStyle=A;c.fillRect(-4,-7,10,14);break;
   case'cookie':c.fillStyle=C;c.beginPath();c.arc(0,0,13,0,7);c.fill();c.stroke();c.fillStyle=A;for(const[a,b]of[[-5,-4],[4,-6],[-2,5],[6,4],[-7,3]]){c.beginPath();c.arc(a,b,2,0,7);c.fill()}break;
   case'onigiri':c.fillStyle=C;c.beginPath();c.moveTo(0,-15);c.quadraticCurveTo(14,8,12,13);c.lineTo(-12,13);c.quadraticCurveTo(-14,8,0,-15);c.fill();c.stroke();c.fillStyle=A;c.fillRect(-7,2,14,11);break;
   case'donut':c.fillStyle=C;c.beginPath();c.arc(0,0,13,0,7);c.fill();c.stroke();c.fillStyle=A;c.beginPath();c.arc(0,-1,11,Math.PI*1.05,Math.PI*1.95);c.arc(0,-1,5,Math.PI*1.95,Math.PI*1.05,true);c.fill();c.fillStyle='#e8d9c0';c.beginPath();c.arc(0,0,4.5,0,7);c.fill();break;
   case'candy':c.fillStyle=C;c.beginPath();c.arc(0,0,8,0,7);c.fill();c.stroke();c.beginPath();c.moveTo(-8,0);c.lineTo(-15,-6);c.lineTo(-15,6);c.closePath();c.moveTo(8,0);c.lineTo(15,-6);c.lineTo(15,6);c.closePath();c.fill();c.strokeStyle=A;c.lineWidth=2;c.beginPath();c.arc(0,0,4,0,5);c.stroke();break;
   case'pudding':c.fillStyle=C;c.beginPath();c.moveTo(-8,-8);c.lineTo(8,-8);c.lineTo(12,12);c.lineTo(-12,12);c.closePath();c.fill();c.stroke();c.fillStyle=A;c.beginPath();c.ellipse(0,-8,8,4,0,0,7);c.fill();break;
   case'popcorn':c.fillStyle='#fff';c.beginPath();c.moveTo(-10,-6);c.lineTo(10,-6);c.lineTo(7,16);c.lineTo(-7,16);c.closePath();c.fill();c.stroke();c.fillStyle=A;c.fillRect(-4,-6,4,22);c.fillStyle=C;for(const[a,b]of[[-6,-9],[0,-12],[6,-9],[-3,-15],[4,-15]]){c.beginPath();c.arc(a,b,4,0,7);c.fill()}break;
   case'cupcake':c.fillStyle=A;c.beginPath();c.moveTo(-10,0);c.lineTo(10,0);c.lineTo(7,14);c.lineTo(-7,14);c.closePath();c.fill();c.stroke();c.fillStyle=C;c.beginPath();c.arc(0,-2,11,Math.PI,0);c.fill();c.fillStyle='#e2554f';c.beginPath();c.arc(0,-13,3,0,7);c.fill();break;
   case'fish':c.fillStyle=C;c.beginPath();c.ellipse(-2,0,12,7,0,0,7);c.fill();c.stroke();c.beginPath();c.moveTo(9,0);c.lineTo(16,-7);c.lineTo(16,7);c.closePath();c.fill();c.stroke();c.fillStyle=A;c.beginPath();c.arc(-8,-2,1.8,0,7);c.fill();break;
   case'catcan':c.fillStyle='#d8d8de';c.beginPath();c.ellipse(0,4,14,10,0,0,7);c.fill();c.stroke();c.fillStyle=C;c.beginPath();c.ellipse(0,2,14,8,0,0,7);c.fill();c.fillStyle=A;c.beginPath();c.arc(0,2,5,0,7);c.fill();c.beginPath();c.moveTo(-5,-1);c.lineTo(-3,-7);c.lineTo(-1,-2);c.moveTo(5,-1);c.lineTo(3,-7);c.lineTo(1,-2);c.fill();break;
   case'yarn':c.fillStyle=C;c.beginPath();c.arc(0,0,12,0,7);c.fill();c.stroke();c.strokeStyle=A;c.lineWidth=1.3;for(let k=-2;k<=2;k++){c.beginPath();c.ellipse(0,0,11,Math.abs(k)*2.5+1,k*.5,0,7);c.stroke()}break;
   case'mouse':c.fillStyle=C;c.beginPath();c.ellipse(0,3,12,8,0,0,7);c.fill();c.stroke();c.fillStyle=A;c.beginPath();c.arc(-8,-4,4,0,7);c.fill();c.strokeStyle='#8a8090';c.beginPath();c.moveTo(12,4);c.quadraticCurveTo(18,0,16,-6);c.stroke();break;
  }c.restore()}
 function drawCat(c,x,y,k,col,mood,huh=0){c.save();c.translate(x,y);c.scale(k,k);c.fillStyle='rgba(0,0,0,.15)';c.beginPath();c.ellipse(0,40,26,6,0,0,7);c.fill();
  c.fillStyle=col;c.beginPath();c.ellipse(0,24,22,18,0,0,7);c.fill();c.beginPath();c.arc(0,-6,20,0,7);c.fill();c.beginPath();c.moveTo(-18,-14);c.lineTo(-14,-32);c.lineTo(-4,-22);c.moveTo(18,-14);c.lineTo(14,-32);c.lineTo(4,-22);c.fill();
  c.fillStyle='#f6a3bd';c.beginPath();c.moveTo(-14,-18);c.lineTo(-13,-27);c.lineTo(-8,-21);c.moveTo(14,-18);c.lineTo(13,-27);c.lineTo(8,-21);c.fill();
  c.strokeStyle='#2e2230';c.fillStyle='#2e2230';c.lineWidth=2;
  if(mood==='happy'){c.beginPath();c.arc(-7,-7,4,Math.PI,0);c.arc(7,-7,4,Math.PI,0);c.stroke()}else if(mood==='sad'){c.beginPath();c.moveTo(-11,-9);c.lineTo(-4,-6);c.moveTo(11,-9);c.lineTo(4,-6);c.stroke()}else{c.beginPath();c.arc(-7,-7,2.6,0,7);c.arc(7,-7,2.6,0,7);c.fill()}
  c.beginPath();if(mood==='sad'){c.arc(0,4,4,Math.PI*1.15,Math.PI*1.85)}else{c.arc(-3,0,3,0,Math.PI);c.arc(3,0,3,0,Math.PI)}c.stroke();
  c.fillStyle='#f08bb0';c.beginPath();c.arc(0,-2,2,0,7);c.fill();
  if(huh){c.fillStyle='#2e2230';c.font='900 18px system-ui';c.textAlign='center';c.globalAlpha=Math.min(1,huh*2);c.fillText('?',24,-26)}c.restore()}
 MiniTable.register('vending',game);
 return{game,SETS,RULES,KEYS,slotC,code,press,shake};
})();
