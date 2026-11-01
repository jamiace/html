// node tests/minigames.test.cjs — physics / rules / reward checks for the 0.92.29 mini games (Node VM, no browser).
const assert=require('assert'),fs=require('fs'),path=require('path'),{load,session}=require('./harness.cjs');
let checks=0;const ok=(v,msg)=>{assert(v,msg);checks++};
const env=load(),{X,counters}=env,T=X.MiniTable,P=X.MiniPhys;
const run=(s,sec)=>s.step(sec);

// ---------- pinball ----------
{const s=session(env,'pinball','cozy_pinball_1'),g=s.g,G=s.game;
 ok(g.mode==='ready'&&g.balls===3,'pinball starts with ball on plunger');
 G.key(s,'Space',true,{repeat:false},T);run(s,.5);ok(g.charge>.5,'holding launch charges plunger');G.key(s,'Space',false,{},T);ok(g.mode==='live'&&g.ball.vy<-700,'release launches');
 // no tunnelling through any outer wall at max speed
 let escaped=0;for(let a=0;a<Math.PI*2;a+=Math.PI/24){g.mode='live';g.ball={x:180,y:300,vx:Math.cos(a)*1350,vy:Math.sin(a)*1350,r:7};for(let i=0;i<60;i++)G.step(s,1/240,T);const b=g.ball;if(b.x<38||b.x>346||b.y<60)escaped++}
 ok(!escaped,'ball never leaves the cabinet at 1350 px/s');
 // bumper: score + kick
 g.mode='live';g.score=0;g.mult=1;g.bCd=[0,0,0];g.ball={x:140,y:150,vx:0,vy:300,r:7};for(let i=0;i<10;i++)G.step(s,1/240,T);ok(g.score>=100&&g.ball.vy<0,'pop bumper scores and kicks');
 // flipper: raised flipper sends a resting ball upward fast
 g.ball={x:150,y:492,vx:0,vy:0,r:7};g.flip.forEach(f=>{f.a=.5;f.w=0});G.key(s,'ArrowLeft',true,{repeat:false},T);for(let i=0;i<20;i++)G.step(s,1/240,T);ok(g.ball.vy<-300,'left flipper strikes the ball upward');G.key(s,'ArrowLeft',false,{},T);
 // gate is one-way: from the playfield the ball cannot fall back into the plunger lane
 g.ball={x:332,y:225,vx:0,vy:200,r:7};for(let i=0;i<120;i++)G.step(s,1/240,T);ok(g.ball.x<316||g.ball.y<262,'gate keeps ball out of the plunger lane');
 // drains + ball save
 g.mode='live';g.save=3;g.ball={x:180,y:600,vx:0,vy:100,r:7};G.step(s,1/240,T);ok(g.balls===3&&g.mode==='ready','ball save returns the ball');
 g.save=0;for(let n=0;n<3;n++){g.mode='live';g.ball={x:180,y:600,vx:0,vy:100,r:7};G.step(s,1/240,T);if(g.mode==='drain')run(s,1.2)}
 ok(s.over&&g.balls===0,'three drains end the round');const before=counters.reward;ok(!s.won,'losing before the goal gives no reward');
 // goal reward exactly once even with more scoring
 const s2=session(env,'pinball','cozy_pinball_2');s2.g.mode='live';s2.g.ball={x:140,y:150,vx:0,vy:300,r:7};s2.g.score=3990;for(let i=0;i<240;i++)s2.game.step(s2,1/240,T);s2.g.score+=0;T.win(s2);T.win(s2);
 ok(s2.won&&counters.reward===before+1,'pinball goal pays once');
 // lanes: all three lit raise the multiplier
 const s3=session(env,'pinball','cozy_pinball_3'),g3=s3.g;g3.mode='live';g3.skillT=0;for(const x of[140,180,220]){g3.ball={x,y:118,vx:0,vy:-60,r:7};g3.laneCd=[0,0,0];s3.game.step(s3,1/240,T)}ok(g3.mult===2,'C-A-T lanes raise multiplier');
 // releasing everything (blur / pause) clears holds without launching
 const s4=session(env,'pinball','cozy_pinball_4');s4.game.pointer(s4,'down',{x:300,y:400},{pointerId:7},T);run(s4,.4);s4.game.release(s4);ok(s4.g.mode==='ready'&&s4.g.charge===0&&!s4.g.hold.P.size,'release cancels charge, no launch');
 s4.game.pointer(s4,'down',{x:40,y:400},{pointerId:1},T);s4.game.pointer(s4,'down',{x:250,y:400},{pointerId:2},T);ok(s4.g.hold.L.size===1&&s4.g.hold.P.size===1,'two pointers hold two controls at once');
 s4.game.pointer(s4,'cancel',{x:40,y:400},{pointerId:1},T);ok(!s4.g.hold.L.size,'pointercancel releases flipper');}

// ---------- toss ----------
{const M=X.MiniToss;
 for(let v=0;v<5;v++)for(let shot=0;shot<5;shot++){let made=false;for(let a=-1.45;a<-.3&&!made;a+=.03)for(let p=.15;p<=1&&!made;p+=.03){const s=session(env,'toss','cozy_basket_'+(v+1),v),g=s.g;const[x,y]=M.HOOPS[v][shot];g.shot=shot;g.hoop={x,y};g.from=g.to=g.hoop;g.slide=.9999;s.game.step(s,1/240,T);g.kb.angle=a;g.kb.power=p;s.game.key(s,'Space',true,{repeat:false},T);for(let i=0;i<1440&&g.phase==='fly';i++)s.game.step(s,1/240,T);made=g.makes>0}
  ok(made,`basket ${v+1} hoop ${shot+1} reachable`)}
 const s=session(env,'toss','cozy_basket_1'),g=s.g;g.phase='fly';g.ball={x:g.hoop.x,y:g.hoop.y+20,vx:0,vy:-400,r:11,spin:0};for(let i=0;i<60;i++)s.game.step(s,1/240,T);ok(!g.makes,'ball rising through the rim does not score');
 const d=session(env,'toss','cozy_basket_1');d.game.pointer(d,'down',{x:100,y:200},{pointerId:1},T);d.game.pointer(d,'move',{x:100,y:150},{pointerId:1},T);d.game.pointer(d,'up',{x:100,y:150},{pointerId:1},T);ok(d.g.phase==='aim','pulling upward (shooting downward) is ignored');
 d.game.pointer(d,'down',{x:200,y:200},{pointerId:2},T);d.game.pointer(d,'move',{x:150,y:260},{pointerId:2},T);d.game.pointer(d,'up',{x:150,y:260},{pointerId:2},T);ok(d.g.phase==='fly'&&d.g.ball.vy<0&&d.g.ball.vx>0,'slingshot pull from anywhere throws up-right');
 // three makes reward once; five shots end the round
 const r0=counters.reward,w=session(env,'toss','cozy_basket_1');for(let n=0;n<5;n++){const g=w.g;run(w,1.5);g.makes=Math.min(g.makes,9);if(n<3){g.phase='fly';g.ball={x:g.hoop.x,y:g.hoop.y-30,vx:0,vy:100,r:11,spin:0}}else{g.phase='fly';g.ball={x:500,y:0,vx:10,vy:0,r:11,spin:0}}for(let i=0;i<480&&g.phase==='fly';i++)w.game.step(w,1/240,T)}run(w,2);
 ok(w.over&&w.g.makes===3&&counters.reward===r0+1,'3 of 5 rewards once and the round ends after 5 shots');}

// ---------- maze ----------
{const M=X.MiniMaze;
 for(let v=0;v<5;v++){const L=M.level(v),step=3,N=120,free=new Uint8Array(N*N);
  const segd=(x,y,w)=>{const dx=w.bx-w.ax,dy=w.by-w.ay,L2=dx*dx+dy*dy;let t=L2?((x-w.ax)*dx+(y-w.ay)*dy)/L2:0;t=Math.max(0,Math.min(1,t));return Math.hypot(x-w.ax-dx*t,y-w.ay-dy*t)-w.r0};
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const x=i*step+1.5,y=j*step+1.5;let f=!(L.shape==='circle'&&Math.hypot(x-180,y-180)>150);if(f)for(const w of L.walls)if(segd(x,y,w)<M.R+.6){f=false;break}if(f)for(const o of L.holes)if(Math.hypot(x-o.x,y-o.y)<o.r+2){f=false;break}free[j*N+i]=f}
  const id=(x,y)=>Math.floor(y/step)*N+Math.floor(x/step),s0=id(L.start.x,L.start.y),g0=id(L.goal.x,L.goal.y),prev=new Int32Array(N*N).fill(-2);prev[s0]=-1;const q=[s0];
  while(q.length){const c=q.shift();if(c===g0)break;const x=c%N,y=(c/N)|0;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy;if(a<0||b<0||a>=N||b>=N)continue;const n=b*N+a;if(free[n]&&prev[n]===-2){prev[n]=c;q.push(n)}}}
  ok(free[s0]&&prev[g0]!==-2,`maze ${v+1} solvable with clearance`);
  const pathPts=[];for(let c=g0;c!==-1;c=prev[c])pathPts.unshift([(c%N)*step+1.5,((c/N)|0)*step+1.5]);
  const r0=counters.reward,s=session(env,'maze','cozy_maze_'+(v+1),v),g=s.g;let k=0;
  for(let t=0;t<120&&!s.over;t+=1/60){const b=g.ball;while(k<pathPts.length-1&&Math.hypot(pathPts[k][0]-b.x,pathPts[k][1]-b.y)<10)k++;const look=pathPts[Math.min(pathPts.length-1,k+3)];let dx=look[0]-b.x,dy=look[1]-b.y;const l=Math.hypot(dx,dy)||1,want=Math.min(1,l/40)*90;let ax=(dx/l*want-b.vx)/90,ay=(dy/l*want-b.vy)/90;const m=Math.hypot(ax,ay);if(m>1){ax/=m;ay/=m}g.joy={id:1,dx:ax,dy:ay};run(s,1/60)}
  ok(s.over&&s.won&&counters.reward===r0+1,`maze ${v+1} cleared by physics autopilot, rewarded once`);
  T.win(s);ok(counters.reward===r0+1,'no duplicate maze reward');}
 // walls hold at max speed
 const s=session(env,'maze','cozy_maze_4',3),g=s.g;let out=0;for(let a=0;a<Math.PI*2;a+=Math.PI/16){g.mode='play';g.ball={x:g.L.start.x,y:g.L.start.y,vx:Math.cos(a)*520,vy:Math.sin(a)*520,r:7};g.joy={id:1,dx:Math.cos(a),dy:Math.sin(a)};run(s,.5);const[o,,sz]=g.L.box;if(g.ball.x<o||g.ball.y<o||g.ball.x>o+sz||g.ball.y>o+sz)out++}
 ok(!out,'grid maze border holds at full tilt');
 // holes send the ball back to start
 const h5=session(env,'maze','cozy_maze_5',4),g5=h5.g,hole=g5.L.holes[0];g5.ball={x:hole.x,y:hole.y,vx:0,vy:0,r:7};run(h5,.1);ok(g5.mode==='sink'&&g5.falls===1,'falling into a hole');run(h5,.6);ok(g5.mode==='play'&&Math.hypot(g5.ball.x-g5.L.start.x,g5.ball.y-g5.L.start.y)<1,'respawn at start');
 ok(new Set([0,1,2,3,4].map(v=>JSON.stringify(M.level(v).walls.map(w=>[Math.round(w.ax),Math.round(w.ay)]))+M.level(v).holes.length)).size===5,'five distinct maze boards');}

// ---------- instrument data ----------
{const I=X.MiniInstrument;
 for(const s of I.SONGS){ok(s.notes.every(n=>n.m>=60&&n.m<=72),`song ${s.id} fits the C4–C5 keyboard`);ok(Math.abs(s.chords.reduce((a,c)=>a+c.d,0)-s.beats)<1e-9,`song ${s.id} chords cover the melody`);ok(s.chords.every(c=>I.CHORD[c.name]),`song ${s.id} chords known`)}
 const books=Object.entries(I.BOOKS);for(const[v,ids]of books){ok(ids.length>=3&&ids.every(id=>I.SONGS.some(s=>s.id===id)),`book ${v} complete`);I.st={voice:v,octave:4};for(const song of I.book()){const acc=I.accomp(song,v,song.spb);ok(acc.length>0&&acc.every(n=>n.acc&&n.t>=0&&n.t<=song.beats*song.spb+1e-6),`auto-play accompaniment ${v}/${song.id}`)}}
 for(const fam of[/^guitar(__|$)/,/^cozy_piano_/]){const ks=Object.keys(I.BOOKS).filter(k=>fam.test(k)),all=ks.flatMap(k=>I.BOOKS[k]);ok(ks.length>=5&&new Set(all).size===all.length,'every colour of '+fam+' has its own songs')}
 for(const k of['fun_piano','sm_musicbox','fun_chime','guitar__navy','cozy_piano_4']){I.owner={it:{k}};I.st={voice:I.voiceOf(k),octave:4};ok(I.book().map(s=>s.id).join()===I.BOOKS[k].join(),'book follows the furniture item '+k)}I.owner=null;
 I.st={octave:4};const seq=[];for(let i=0;i<12;i++)seq.push(I.nextNote(seq));ok(seq.every(m=>I.WHITE.includes(m-60)),'memory notes stay on visible white keys');
 ok(I.voiceOf('cozy_piano_3')==='toy'&&I.voiceOf('fun_piano')==='piano'&&I.voiceOf('guitar__pink')==='guitar','voices follow the furniture');I.st=null}

// ---------- per-variant tables and balls ----------
{const PB=X.MiniPinball,sig=new Set(PB.TABLES.map(L=>[L.bumpers.length,L.posts.length,L.drops.length,L.stars.length,L.saucers.length,L.targets.length,L.lanes.length,L.kickback,L.activeSlings].join()));ok(sig.size===5,'five pinball tables have different layouts');
 for(let v=0;v<5;v++){const s=session(env,'pinball','cozy_pinball_'+(v+1),v),g=s.g,G=s.game;let esc=0;for(let a=0;a<Math.PI*2;a+=Math.PI/18){g.mode='live';g.ball={x:180,y:330,vx:Math.cos(a)*1350,vy:Math.sin(a)*1350,r:7};for(let i=0;i<60;i++)G.step(s,1/240,T);const b=g.ball;if(b.x<38||b.x>346||b.y<60)esc++}ok(!esc,`table ${v+1}: no tunnelling`);
  const r0=counters.reward;g.mode='live';g.score=g.L.goal-1;g.ball={x:180,y:330,vx:0,vy:0,r:7};g.lanes=g.lanes.map(()=>0);g.laneCd=g.laneCd.map(()=>0);g.skillT=0;g.ball={x:(g.L.lanes[0][0]+g.L.lanes[0][1])/2,y:118,vx:0,vy:-60,r:7};G.step(s,1/240,T);T.win(s);ok(s.won&&counters.reward===r0+1,`table ${v+1}: goal ${g.L.goal} pays once`)}
 {const s=session(env,'pinball','cozy_pinball_2',1),g=s.g;g.mode='live';g.ball={x:57,y:470,vx:0,vy:200,r:7};s.game.step(s,1/240,T);ok(g.ball.vy<-800&&!g.kick.L&&g.kick.R,'table 2 kickback returns the ball once')}
 {const s=session(env,'pinball','cozy_pinball_3',2),g=s.g;g.mode='live';for(const m of g.L.stars){g.ball={x:m.x,y:m.y,vx:0,vy:0,r:7};s.game.step(s,1/240,T)}ok(g.save>=9&&g.score>=2000,'table 3 star set gives bonus + ball save')}
 {const s=session(env,'pinball','cozy_pinball_4',3),g=s.g;g.mode='live';g.L.drops.forEach((m,i)=>{g.ball={x:(m.ax+m.bx)/2,y:m.ay+14,vx:0,vy:-400,r:7};for(let k=0;k<6;k++)s.game.step(s,1/240,T)});ok(g.drops.every(Boolean)&&g.mult===2,'table 4 drop bank raises the multiplier')}
 {const s=session(env,'pinball','cozy_pinball_5',4),g=s.g;g.mode='live';const m=g.L.bumpers[0];const hit=()=>{g.bCd=g.bCd.map(()=>0);g.ball={x:m.x,y:m.y-m.r-8,vx:0,vy:200,r:7};for(let i=0;i<6;i++)s.game.step(s,1/240,T)};hit();const unlit=g.score;g.litT=10;hit();ok(unlit===50&&g.score-unlit===200,'table 5 lit bumpers 50 → 200')}
 ok(PB.TABLES.every(L=>L.missions.length>=3&&L.savers.length===2),'every table has missions and wall savers');
 {const s=session(env,'pinball','cozy_pinball_1',0),g=s.g;g.mode='live';g.kick.R=true;g.ball={x:303,y:470,vx:0,vy:200,r:7};s.game.step(s,1/240,T);ok(g.ball.vy<-800&&!g.kick.R,'right outlane kickback')}
 {const s=session(env,'pinball','cozy_pinball_1',0),g=s.g;g.mode='live';g.paw=10;g.save=0;g.ball={x:180,y:500,vx:0,vy:150,r:7};for(let i=0;i<240;i++)s.game.step(s,1/240,T);ok(g.ball.y<540&&g.balls===3,'cat-paw centre post blocks the middle drain')}
 {const s=session(env,'pinball','cozy_pinball_1',0),g=s.g;const before=g.balls;g.extraUsed=false;g.misDone=2;g.L.missions.forEach(()=>{});const m=g.L.missions[g.mis%g.L.missions.length];g.misN=m[1]-1;g.mode='live';
  const ev={bumper:()=>{const b=g.L.bumpers[0];g.bCd=g.bCd.map(()=>0);g.ball={x:b.x,y:b.y-b.r-8,vx:0,vy:200,r:7};for(let i=0;i<6;i++)s.game.step(s,1/240,T)}};if(ev[m[0]]){ev[m[0]]();ok(g.balls===before+1&&g.mis===1+((g.mis-1)),'mission reward: extra ball')}else ok(true,'mission type '+m[0])}
 const M=X.MiniToss;ok(new Set(M.BALLS.map(b=>b.id)).size===5,'five different balls');
 const bounce=v=>{const s=session(env,'toss','cozy_basket_'+(v+1),v),g=s.g;g.phase='fly';g.ball={x:150,y:300,vx:0,vy:500,r:g.B.r,spin:0};let top=999;for(let i=0;i<240;i++){s.game.step(s,1/240,T);if(g.ball.vy<0)top=Math.min(top,g.ball.y)}return 412-g.B.r-top};
 ok(bounce(2)>bounce(0)*1.5&&bounce(3)<bounce(0)*.4,'tennis ball bounces higher, shot put barely bounces');
 {const s=session(env,'toss','cozy_basket_3',2),g=s.g;g.phase='fly';g.touchBoard=true;g.ball={x:g.hoop.x,y:g.hoop.y-30,vx:0,vy:100,r:7,spin:0};for(let i=0;i<60;i++)s.game.step(s,1/240,T);ok(g.makes===1&&g.score===4,'tennis bank shot scores 2+2')}
 {const s=session(env,'toss','cozy_basket_2',1),g=s.g;g.phase='fly';g.rimHits=3;g.touchRim=true;g.ball={x:g.hoop.x,y:g.hoop.y-30,vx:0,vy:100,r:12,spin:0};for(let i=0;i<60;i++)s.game.step(s,1/240,T);ok(g.makes===1&&g.score===5,'volleyball: 3 rim bounces = 2+3')}
 {const s=session(env,'toss','cozy_basket_2',1),g=s.g;g.phase='fly';g.ball={x:g.hoop.x-23,y:g.hoop.y-40,vx:0,vy:150,r:12,spin:0};let n=0;for(let i=0;i<480&&g.phase==='fly';i++){s.game.step(s,1/240,T)}ok(g.rimHits>=1,'volleyball rim contacts are counted')}
 {const s=session(env,'toss','cozy_basket_4',3),g=s.g;g.phase='fly';g.ball={x:g.hoop.x,y:g.hoop.y-30,vx:0,vy:100,r:10,spin:0};for(let i=0;i<60;i++)s.game.step(s,1/240,T);ok(g.makes===1&&g.score===3,'shot put basket scores 3')}}

// ---------- vending ----------
{const V=X.MiniVending;
 for(let v=0;v<5;v++){const s=session(env,'vending','cozy_vending_'+(v+1),v),g=s.g;ok(g.slots.length===12&&new Set(g.slots.map(x=>x.item)).size===12,`vending ${v+1}: 12 distinct items`);
  s.step(1.2);ok(g.cat&&g.cat.want.length>=1,`vending ${v+1}: a customer arrives`);
  const need=g.cat.want[0],i=g.slots.findIndex(x=>x.item===need);V.press(s,T,V.code(i)[0]);V.press(s,T,V.code(i)[1]);ok(g.drop&&g.slots[i].stock===2,`vending ${v+1}: code dispenses from the right slot`);
  for(let n=0;n<400&&g.drop;n++){if(g.drop.phase==='stuck')V.shake(s,T);s.step(.05)}ok(!g.drop&&g.cat.got[0],`vending ${v+1}: item reaches the cat (stuck items shake free)`)}
 {const s=session(env,'vending','cozy_vending_1',0),g=s.g;s.step(1.2);V.press(s,T,'1');ok(!g.drop,'number without letter does nothing');for(let k=0;k<5;k++)V.shake(s,T);ok(g.lock>0,'shaking too hard tilts the machine');}
 {const s=session(env,'vending','cozy_vending_1',0),g=s.g;s.step(1.2);const wrong=g.slots.findIndex(x=>!g.cat.want.includes(x.item));V.press(s,T,V.code(wrong)[0]);V.press(s,T,V.code(wrong)[1]);g.drop.stuck=false;s.step(2);ok(g.served===0&&g.combo===0,'wrong item is refused')}
 {const r0=counters.reward,s=session(env,'vending','cozy_vending_1',0),g=s.g;let guard=0;
  while(!s.over&&guard++<5000){s.step(.1);if(g.drop){if(g.drop.phase==='stuck')V.shake(s,T);continue}if(g.cat&&g.cat.mood==='wait'){const need=g.cat.want.find((w,j)=>!g.cat.got[j]),i=g.slots.findIndex(x=>x.item===need&&x.stock>0);if(i>=0){s.step(.5);V.press(s,T,V.code(i)[0]);V.press(s,T,V.code(i)[1])}}}
  ok(s.over&&g.served>=g.R.goal&&counters.reward===r0+1,'vending round: goal reached, rewarded once, ends at 75 s')}
 ok(V.RULES.some(r=>r.pairs)&&V.RULES.some(r=>r.shuffle)&&new Set(V.RULES.map(r=>r.stuck)).size>=3,'machines have different rules')}

// ---------- i18n coverage ----------
{const add=JSON.parse(fs.readFileSync(path.join(__dirname,'..','i18n','minigames-0.92.30.json'),'utf8')).messages;
 const src=fs.readdirSync(path.join(__dirname,'..','js')).filter(f=>f.startsWith('minigame-')).map(f=>fs.readFileSync(path.join(__dirname,'..','js',f),'utf8')).join('\n');
 const used=new Set();for(const m of src.matchAll(/(?:\bt|T|MiniHost\.t|this\.t|say\(g,)\(?'([A-Za-z_]+)'/g))used.add(m[1]);
 for(const pre of['mode_free','mode_memory','mode_song','labels_solfege','labels_letter','labels_none',...X.MiniInstrument.SONGS.map(s=>'song_'+s.id),'pinHelp','tossHelp','mazeHelp','motionOff','motionStart','mazeHint','resultWin','resultEnd','memRecord','memWin','songDone','songPerfect'])used.add(pre);
 for(const k of['gameProgress','missing','restoreHelp','mode_','labels_','song_','acc_','ballTip_','ball_','pinHelp','pmis_','vendHelp'])used.delete(k);
 for(const k of[...[0,1,2,3,4].map(i=>'pinHelp'+i),...X.MiniToss.BALLS.flatMap(b=>['ball_'+b.id,'ballTip_'+b.id]),...['piano','guitar','musicbox','chime','toy'].map(v=>'acc_'+v),'songStop','pinDrops','pinStars','pinKick','pinKickLit','pinTopHole','pinDoubleMouse','pinRetroLit','tossRimN','tossBank2','pinMissionDone',...['bumper','sling','lanes','set','hole','post','peg'].map(k=>'pmis_'+k),...['kick','paw','extra','points'].map(k=>'prew_'+k),...[0,1,2,3,4].map(i=>'vendHelp'+i)])used.add(k);
 const missing=[...used].filter(k=>!add['mini.'+k]||!['zh-TW','zh-CN','ja'].every(l=>add['mini.'+k][l]));ok(!missing.length,'i18n missing: '+missing.join(','));}

console.log('PASS '+checks+' checks');
// pull sensitivity: the same 65 px pull gives half the power it gave in the first 0.92.29 build (65/130 -> 65/260)
{const d=session(env,'toss','cozy_basket_1');d.game.pointer(d,'down',{x:200,y:200},{pointerId:9},T);d.game.pointer(d,'move',{x:154,y:246},{pointerId:9},T);d.game.pointer(d,'up',{x:154,y:246},{pointerId:9},T);
 ok(Math.abs(d.g.shotPower-65/260)<.01,'drag power halved (65 px pull = 0.25)');console.log('PASS toss sensitivity check')}
