/* 0.92.36 Purr Cozy: canvas puzzle games that replace the plain button grids of the old CozyGames / FurnPlay panels.
   memory (cozy_cards_1..5, cozy_console_1) · puzzle (cozy_puzzle_1..5, sm_rubik) · wire (cozy_console_2)
   diff (cozy_console_4) · stars (cozy_console_5, cozy_vr_1..5) · parking (cozy_wheel_1..5) · weave (m_embroidery, m_loom, m_sewing_machine)
   Item IDs and catalog cozyGame / interactionProfile values are unchanged; minigame-wiring.js routes them here. */
const MiniCards=(()=>{
 const K=MiniKit,t=(k,a)=>MiniHost.t(k,a),W=360,H=460;
 const fmt=s=>MiniHost.time(s);
 // ======================================================================== memory
 const MEM={sets:[['fish','yarn','paw','mouse','heart','star','moon','flower','cup','bell','crown','leaf'],['ginger','grey','ink','snow','fish','yarn','paw','heart','star','moon','bell','crown']],
  rules:[{cols:4,rows:4,peek:0,swap:false,limit:0},{cols:4,rows:4,peek:2.2,swap:false,limit:0},{cols:4,rows:5,peek:0,swap:false,limit:0},{cols:4,rows:4,peek:0,swap:true,limit:0},{cols:4,rows:6,peek:1.5,swap:false,limit:150}],
  backs:['#e98a5b','#5b9dc0','#9a7ad1','#6aa25a','#c9443f']};
 const memory={size:{w:W,h:H},dt:1/60,help:s=>'memHelp'+s.variant,
  create(s){const v=s.variant,R=MEM.rules[v],n=R.cols*R.rows/2,set=MEM.sets[v%2],icons=K.shuffle(set).slice(0,n),deck=K.shuffle([...icons,...icons]);
   const cw=Math.min(78,(W-24)/R.cols-8),ch=Math.min(cw*1.25,(H-74)/R.rows-8),gx=(W-R.cols*(cw+8)+8)/2,gy=56+(H-60-R.rows*(ch+8)+8)/2;
   const cards=deck.map((ic,i)=>({ic,i,x:gx+(i%R.cols)*(cw+8),y:gy+Math.floor(i/R.cols)*(ch+8),w:cw,h:ch,up:v===1||v===4?1:0,want:v===1||v===4?1:0,done:false,glow:0,shake:0}));
   return{R,cards,open:[],lock:0,flips:0,misses:0,combo:0,peek:R.peek,cur:0,matched:0,time:0,best:MiniHost.record(s.k).memoryBest}},
  step(s,dt,host){const g=s.g;for(const c of g.cards){c.up+=(c.want-c.up)*Math.min(1,dt*14);if(c.glow>0)c.glow-=dt;if(c.shake>0)c.shake-=dt;if(c.slide){c.slide.t+=dt*2.2;if(c.slide.t>=1){c.x=c.slide.x1;c.y=c.slide.y1;c.slide=null}}}
   if(s.over)return;if(g.peek>0){g.peek-=dt;if(g.peek<=0)for(const c of g.cards)c.want=0;return}g.time+=dt;
   if(g.R.limit&&g.time>=g.R.limit){host.end(s,{lines:[t('memPairs',[g.matched,g.cards.length/2])],say:t('timeUp')});K.sfx('over');return}
   if(g.lock>0&&(g.lock-=dt)<=0){const[a,b]=g.open;a.want=b.want=0;g.open=[];if(g.R.swap&&g.misses%2===0)this.swap(s)}},
  swap(s){const g=s.g,down=g.cards.filter(c=>!c.done&&!c.want);if(down.length<2)return;const[a,b]=K.shuffle(down).slice(0,2);
   const ia=g.cards.indexOf(a),ib=g.cards.indexOf(b);a.slide={x0:a.x,y0:a.y,x1:b.x,y1:b.y,t:0};b.slide={x0:b.x,y0:b.y,x1:a.x,y1:a.y,t:0};g.cards[ia]=b;g.cards[ib]=a;g.swapMsg=1.2;K.sfx('sling',.6)},
  flip(s,host,c){const g=s.g;if(s.over||g.peek>0||g.lock>0||c.done||c.want||c.slide)return;c.want=1;g.flips++;K.sfx('lane',.5);g.open.push(c);
   if(g.open.length<2)return;const[a,b]=g.open;
   if(a.ic===b.ic){a.done=b.done=true;a.glow=b.glow=.8;g.open=[];g.matched++;g.combo++;K.sfx('target');host.burst(s,b.x+b.w/2,b.y+b.h/2,'#ffe58a',12,150);if(g.combo>1)host.pop(s,b.x+b.w/2,b.y,t('combo',[g.combo]),'#ffd27a',16);
    if(g.matched===g.cards.length/2){host.win(s);const best=g.best==null?g.flips:Math.min(g.best,g.flips);host.end(s,{field:'memoryBest',value:g.flips,lower:true,lines:[t('memFlips',[g.flips]),t('timeLine',[fmt(g.time)]),t('bestLine',[best])],say:t('memWin')});K.sfx('win')}}
   else{g.combo=0;g.misses++;g.lock=.75;a.shake=b.shake=.3;K.sfx('error',.5)}},
  pointer(s,kind,p,e,host){if(kind!=='down')return;const c=s.g.cards.find(c=>K.hit(p,c.x,c.y,c.w,c.h));if(c){s.g.cur=s.g.cards.indexOf(c);this.flip(s,host,c)}},
  key(s,code,down,e,host){if(!down)return/^Arrow|Enter|Space/.test(code);const g=s.g,C=g.R.cols,n=g.cards.length;const m={ArrowLeft:-1,ArrowRight:1,ArrowUp:-C,ArrowDown:C}[code];
   if(m!=null){g.cur=(g.cur+m+n)%n;g.kb=1;return true}if(code==='Enter'||code==='Space'){if(!e.repeat)this.flip(s,host,g.cards[g.cur]);g.kb=1;return true}return false},
  controls(){return[h('span',{class:'hint mg-keys',text:t('memKeys')})]},
  draw(c,s){const g=s.g,v=s.variant;K.bg(c,W,H,['#fdf3e2','#e8f1f4','#f1ebf8','#eef6e6','#f8ece6'][v],['#f1dcbc','#cfe1e8','#ddd2ee','#d6e8cb','#edd2c4'][v],'rgba(120,90,70,.07)');
   for(const cd of g.cards){let x=cd.x,y=cd.y;if(cd.slide){const k=K.ease.inOut(Math.min(1,cd.slide.t));x=cd.slide.x0+(cd.slide.x1-cd.slide.x0)*k;y=cd.slide.y0+(cd.slide.y1-cd.slide.y0)*k-Math.sin(k*Math.PI)*16}
    const sx=Math.abs(Math.cos(cd.up*Math.PI)),face=cd.up>.5,jx=cd.shake>0?Math.sin(cd.shake*60)*3:0;c.save();c.translate(x+cd.w/2+jx,y+cd.h/2);c.scale(Math.max(.02,sx),1);
    if(cd.glow>0){c.shadowColor='#ffd66b';c.shadowBlur=18*cd.glow}
    K.panel(c,-cd.w/2,-cd.h/2,cd.w,cd.h,10,face?(cd.done?'#fff7dc':'#fffaf0'):MEM.backs[v],face?'#d9c6a8':'rgba(255,255,255,.6)');c.shadowBlur=0;
    if(face){K.ICONS[cd.ic](c,0,0,Math.min(cd.w,cd.h)*.62);if(cd.done){c.fillStyle='#6aa25a';c.beginPath();c.arc(cd.w/2-10,-cd.h/2+10,6,0,7);c.fill()}}
    else{c.fillStyle='rgba(255,255,255,.22)';for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)K.paw(c,i*cd.w*.3,j*cd.h*.3,cd.w*.22,'rgba(255,255,255,.25)');K.catFace(c,0,0,cd.w*.42,'rgba(255,255,255,.85)',{eye:MEM.backs[v],inner:'rgba(255,255,255,.9)'})}
    c.restore();if(g.kb&&g.cards[g.cur]===cd&&!s.over){c.strokeStyle='#ff9b3d';c.lineWidth=3;K.round(c,x-3,y-3,cd.w+6,cd.h+6,12);c.stroke()}}
   const rem=g.R.limit?Math.max(0,g.R.limit-g.time):null;
   if(g.swapMsg>0)g.swapMsg-=1/60;
   const mid=g.peek>0?t('memPeek',[Math.ceil(g.peek)]):g.swapMsg>0?t('memSwap'):t('memPairsBar',[g.matched,g.cards.length/2]);
   K.hud(c,W,g.R.limit?fmt(rem):'⏱ '+fmt(g.time),mid,t('memFlipsBar',[g.flips]),g.R.limit?rem/g.R.limit:null)}
 };
 // ======================================================================== sliding picture puzzle
 const PUZ={n:[3,3,4,4,4],scenes:['sunny','night','yarn','fish','garden']};
 function drawScene(c,kind,S){const g=c.createLinearGradient(0,0,0,S);
  if(kind==='night'){g.addColorStop(0,'#232046');g.addColorStop(1,'#4b3f7a')}else if(kind==='fish'){g.addColorStop(0,'#bfe6f2');g.addColorStop(1,'#4f9fc8')}else{g.addColorStop(0,['#ffe9c2','#000','#fbe1ea','#000','#e3f4d9'][['sunny','night','yarn','fish','garden'].indexOf(kind)]||'#ffe9c2');g.addColorStop(1,kind==='garden'?'#9ccf7a':kind==='yarn'?'#e7b8d4':'#f4c27a')}
  c.fillStyle=g;c.fillRect(0,0,S,S);const u=S/300;
  if(kind==='sunny'){c.fillStyle='#ffd66b';c.beginPath();c.arc(235*u,62*u,34*u,0,7);c.fill();c.fillStyle='#e9a35a';c.beginPath();c.moveTo(0,230*u);c.quadraticCurveTo(90*u,170*u,180*u,215*u);c.quadraticCurveTo(250*u,240*u,300*u,200*u);c.lineTo(300*u,300*u);c.lineTo(0,300*u);c.fill();K.catFace(c,110*u,170*u,150*u,'#f0a24f',{happy:true});K.flower(c,235*u,250*u,40*u,'#f08bb0');K.flower(c,40*u,265*u,30*u,'#fff');K.cup(c,215*u,175*u,46*u,'#5b9dc0')}
  if(kind==='night'){for(let i=0;i<40;i++){const x=(i*73%300)*u,y=(i*131%170)*u;K.star(c,x,y,(1.5+i%3)*u);c.fillStyle='#fff3c4';c.fill()}K.moon(c,230*u,70*u,70*u,'#f6d77a','#2c2752');c.fillStyle='#2b2650';c.fillRect(0,230*u,300*u,70*u);K.catFace(c,120*u,190*u,140*u,'#9a96ab',{eye:'#f1c043'});K.star(c,60*u,80*u,18*u);c.fillStyle='#ffe58a';c.fill()}
  if(kind==='yarn'){c.fillStyle='rgba(255,255,255,.35)';for(let i=0;i<6;i++){c.fillRect(0,(30+i*50)*u,300*u,14*u)}K.yarn(c,80*u,220*u,110*u,'#9a7ad1');K.yarn(c,225*u,240*u,80*u,'#f08bb0');K.catFace(c,190*u,120*u,140*u,'#3a3238',{eye:'#f1c043'});K.heart(c,60*u,70*u,40*u);c.fillStyle='#e2554f';c.fill()}
  if(kind==='fish'){c.fillStyle='rgba(255,255,255,.3)';for(let i=0;i<8;i++){c.beginPath();c.arc((30+i*37)*u,(40+(i%3)*60)*u,(6+i%4*3)*u,0,7);c.fill()}K.fish(c,85*u,95*u,90*u,'#f4a24b');K.fish(c,215*u,70*u,60*u,'#e2554f',{flip:true});c.fillStyle='#e7d7b4';c.fillRect(0,250*u,300*u,50*u);K.catFace(c,170*u,195*u,150*u,'#f4ead8');K.leaf(c,40*u,240*u,50*u,'#3f7a2f')}
  if(kind==='garden'){c.fillStyle='#bfe3f5';c.fillRect(0,0,300*u,120*u);c.fillStyle='#fff';for(const[x,y]of[[60,40],[200,55]]){c.beginPath();c.arc(x*u,y*u,18*u,0,7);c.arc((x+20)*u,(y-6)*u,22*u,0,7);c.arc((x+42)*u,y*u,16*u,0,7);c.fill()}
   for(let i=0;i<7;i++)K.flower(c,(25+i*42)*u,(250+(i%2)*22)*u,34*u,['#f08bb0','#ffd66b','#b98ae0','#fff'][i%4]);K.catFace(c,150*u,165*u,140*u,'#f0a24f');K.paw(c,250*u,140*u,40*u,'#6b4429')}
  c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=6*u;c.strokeRect(3*u,3*u,294*u,294*u)}
 const puzzle={size:{w:W,h:H},dt:1/60,help:s=>'puzHelp',
  create(s){const v=s.variant,n=PUZ.n[v],S=312,img=document.createElement('canvas');img.width=img.height=S*2;const ic=img.getContext('2d');ic.scale(2,2);drawScene(ic,PUZ.scenes[v],S);
   const cells=[...Array(n*n).keys()].map(i=>(i+1)%(n*n));let z=n*n-1,prev=-1;const rnd=Math.random;for(let k=0;k<n*n*40;k++){const zr=Math.floor(z/n),zc=z%n,nb=[[zr-1,zc],[zr+1,zc],[zr,zc-1],[zr,zc+1]].filter(([r,c])=>r>=0&&c>=0&&r<n&&c<n).map(([r,c])=>r*n+c).filter(i=>i!==prev);const b=nb[Math.floor(rnd()*nb.length)];[cells[z],cells[b]]=[cells[b],cells[z]];prev=z;z=b}
   if(cells.every((x,i)=>x===(i+1)%(n*n)))[cells[0],cells[1]]=[cells[1],cells[0]],[cells[n],cells[n+1]]=[cells[n+1],cells[n]];
   const tile=S/n,ox=(W-S)/2,oy=60;return{n,S,img,cells,tile,ox,oy,moves:0,time:0,anim:new Map(),peek:false,nums:v>=2,best:MiniHost.record(s.k).puzzleBest,done:0}},
  step(s,dt){const g=s.g;for(const[k,a]of g.anim){a.t+=dt*9;if(a.t>=1)g.anim.delete(k)}if(g.done)g.done+=dt;if(!s.over&&g.moves)g.time+=dt},
  slideAt(s,host,i){const g=s.g,n=g.n,z=g.cells.indexOf(0),zr=Math.floor(z/n),zc=z%n,r=Math.floor(i/n),c=i%n;if(s.over||(r!==zr&&c!==zc)||i===z)return false;
   const dr=Math.sign(r-zr),dc=Math.sign(c-zc);let cur=z;while(cur!==i){const nx=cur+dr*n+dc;g.anim.set(g.cells[nx],{fr:nx,t:0});g.cells[cur]=g.cells[nx];g.cells[nx]=0;cur=nx;g.moves++}K.sfx('flipper');
   if(g.cells.every((x,j)=>x===(j+1)%(n*n))){g.done=.001;host.win(s);const best=g.best==null?g.moves:Math.min(g.best,g.moves);K.sfx('win');host.burst(s,W/2,g.oy+g.S/2,'#ffe58a',24,200);
    setTimeout(()=>{if(MiniTable.session===s)host.end(s,{field:'puzzleBest',value:g.moves,lower:true,lines:[t('puzMoves',[g.moves]),t('timeLine',[fmt(g.time)]),t('bestLine',[best])],say:t('puzWin')})},900)}return true},
  pointer(s,kind,p,e,host){if(kind!=='down')return;const g=s.g;if(!K.hit(p,g.ox,g.oy,g.S,g.S))return;const i=Math.floor((p.y-g.oy)/g.tile)*g.n+Math.floor((p.x-g.ox)/g.tile);this.slideAt(s,host,i)},
  key(s,code,down,e,host){const g=s.g,n=g.n,z=g.cells.indexOf(0),d={ArrowLeft:1,ArrowRight:-1,ArrowUp:n,ArrowDown:-n}[code];if(d==null)return false;if(!down)return true;const i=z+d;
   if(i<0||i>=n*n||(Math.abs(d)===1&&Math.floor(i/n)!==Math.floor(z/n)))return true;this.slideAt(s,host,i);return true},
  controls(s,host){const g=s.g;return[h('button',{class:'chip',type:'button','aria-pressed':String(g.peek),onclick:()=>{g.peek=!g.peek;host.syncControls(s)}},t(g.peek?'puzHide':'puzPeek')),h('button',{class:'chip',type:'button','aria-pressed':String(g.nums),onclick:()=>{g.nums=!g.nums;host.syncControls(s)}},t(g.nums?'puzNumsOff':'puzNums')),h('span',{class:'hint mg-keys',text:t('puzKeys')})]},
  draw(c,s){const g=s.g,n=g.n;K.bg(c,W,H,'#f6ecdf','#e3cfb6','rgba(120,90,70,.08)');K.panel(c,g.ox-8,g.oy-8,g.S+16,g.S+16,14,'#8a5b3c','#5a3a26');
   c.fillStyle='#4a3428';c.fillRect(g.ox,g.oy,g.S,g.S);
   if(g.peek||g.done){c.globalAlpha=g.done?Math.min(1,g.done*2):.35;c.drawImage(g.img,g.ox,g.oy,g.S,g.S);c.globalAlpha=1}
   if(!g.done||g.done<.5)g.cells.forEach((v,i)=>{if(!v)return;const src=v-1,sr=Math.floor(src/n),sc=src%n;let r=Math.floor(i/n),cc=i%n;const a=g.anim.get(v);if(a){const k=K.ease.out(Math.min(1,a.t)),fr=Math.floor(a.fr/n),fc=a.fr%n;r=fr+(r-fr)*k;cc=fc+(cc-fc)*k}
    const x=g.ox+cc*g.tile,y=g.oy+r*g.tile,ts=g.tile;c.save();if(g.done)c.globalAlpha=1-g.done*2;K.round(c,x+1.5,y+1.5,ts-3,ts-3,6);c.clip();c.drawImage(g.img,sc*ts*2,sr*ts*2,ts*2,ts*2,x,y,ts,ts);c.restore();
    c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=2;K.round(c,x+1.5,y+1.5,ts-3,ts-3,6);c.stroke();
    if(g.nums){c.fillStyle='rgba(36,27,46,.72)';K.round(c,x+5,y+5,24,20,6);c.fill();K.text(c,String(v),x+17,y+20,{size:14})}});
   K.hud(c,W,'⏱ '+fmt(g.time),t('puzMovesBar',[g.moves]),t('bestShort',[g.best??'—']));
   const by=g.oy+g.S+18;K.text(c,t(g.peek?'puzPeeking':'puzTip'),W/2,Math.min(H-10,by+12),{size:15,color:'#5d4c62',maxW:W-20})}
 };
 // ======================================================================== wire (rotate pipes)
 // pipe = bitmask of open sides: 1 up, 2 right, 4 down, 8 left
 const rot=m=>((m<<1)|(m>>3))&15;
 function wireLevel(N,rnd){const cell=(r,c)=>r*N+c,start=Math.floor(N/2),goalR=Math.floor(rnd()*N),mask=new Array(N*N).fill(0),seen=new Set([cell(start,0)]);
  // random walk from (start,0) to column N-1 row goalR, depth-first with bias to the right
  const path=[[start,0]];const dfs=(r,c)=>{if(c===N-1&&r===goalR)return true;const opts=K.shuffle([[0,1],[0,1],[1,0],[-1,0],[0,-1]],rnd);for(const[dr,dc]of opts){const R=r+dr,C=c+dc;if(R<0||C<0||R>=N||C>=N||seen.has(cell(R,C)))continue;seen.add(cell(R,C));path.push([R,C]);if(dfs(R,C))return true;path.pop()}return false};dfs(start,0);
  const dir=(a,b)=>b[0]<a[0]?1:b[1]>a[1]?2:b[0]>a[0]?4:8,opp={1:4,2:8,4:1,8:2};
  path.forEach((p,i)=>{let m=0;if(i===0)m|=8;else m|=opp[dir(path[i-1],p)];if(i===path.length-1)m|=2;else m|=dir(p,path[i+1]);mask[cell(...p)]=m});
  const fill=[3,5,6,7,11,13,14];for(let i=0;i<N*N;i++)if(!mask[i])mask[i]=fill[Math.floor(rnd()*fill.length)];
  const solved=mask.slice(),cur=mask.map(m=>{let x=m;const k=Math.floor(rnd()*4);for(let j=0;j<k;j++)x=rot(x);return x});
  if(cur.every((m,i)=>m===solved[i]))cur[cell(start,0)]=rot(cur[cell(start,0)]);return{N,start,goalR,cur,onPath:new Set(path.map(p=>cell(...p)))}}
 function powered(L){const N=L.N,on=new Set(),q=[];const s=L.start*N;if(L.cur[s]&8){on.add(s);q.push(s)}
  while(q.length){const i=q.shift(),r=Math.floor(i/N),c=i%N,m=L.cur[i];for(const[b,dr,dc,o]of[[1,-1,0,4],[2,0,1,8],[4,1,0,1],[8,0,-1,2]]){if(!(m&b))continue;const R=r+dr,C=c+dc;if(R<0||C<0||R>=N||C>=N)continue;const j=R*N+C;if(!on.has(j)&&(L.cur[j]&o)){on.add(j);q.push(j)}}}return on}
 const wire={size:{w:W,h:H},dt:1/60,help:()=>'wireHelp',
  create(s){const g={round:0,rounds:3,moves:0,time:0,best:MiniHost.record(s.k).wireBest};this.level(g);return g},
  level(g){const N=[5,6,7][g.round];g.L=wireLevel(N,Math.random);g.on=powered(g.L);g.spin=new Map();g.cs=Math.min(46,312/N);g.ox=(W-g.cs*N)/2;g.oy=70+(330-g.cs*N)/2;g.lit=0},
  step(s,dt){const g=s.g;for(const[k,a]of g.spin){a.t+=dt*8;if(a.t>=1)g.spin.delete(k)}if(!s.over&&!g.lit)g.time+=dt;if(g.lit>0&&!s.over){g.lit+=dt;if(g.lit>1.2){g.round++;if(g.round<g.rounds)this.level(g)}}},
  rotateAt(s,host,i){const g=s.g;if(s.over||g.lit)return;g.L.cur[i]=rot(g.L.cur[i]);g.spin.set(i,{t:0});g.moves++;K.sfx('flipper',.6);const before=g.on.size;g.on=powered(g.L);
   if(g.on.size>before)K.sfx('lane',.5);const goal=g.L.goalR*g.L.N+g.L.N-1;
   if(g.on.has(goal)&&(g.L.cur[goal]&2)){g.lit=.001;K.sfx('bonus');host.burst(s,g.ox+g.cs*g.L.N+12,g.oy+g.cs*(g.L.goalR+.5),'#ffe58a',20,180);
    if(g.round===g.rounds-1){host.win(s);const best=g.best==null?g.moves:Math.min(g.best,g.moves);setTimeout(()=>{if(MiniTable.session===s)host.end(s,{field:'wireBest',value:g.moves,lower:true,lines:[t('wireMoves',[g.moves]),t('timeLine',[fmt(g.time)]),t('bestLine',[best])],say:t('wireWin')})},900)}else host.pop(s,W/2,g.oy-14,t('wireNext'),'#fff3c4',18)}},
  pointer(s,kind,p,e,host){if(kind!=='down')return;const g=s.g,N=g.L.N;if(!K.hit(p,g.ox,g.oy,g.cs*N,g.cs*N))return;this.rotateAt(s,host,Math.floor((p.y-g.oy)/g.cs)*N+Math.floor((p.x-g.ox)/g.cs))},
  key(s,code,down,e,host){const g=s.g,N=g.L.N;g.cur??=g.L.start*N;const d={ArrowLeft:[0,-1],ArrowRight:[0,1],ArrowUp:[-1,0],ArrowDown:[1,0]}[code];
   if(d){if(down){const r=Math.min(N-1,Math.max(0,Math.floor(g.cur/N)+d[0])),c=Math.min(N-1,Math.max(0,g.cur%N+d[1]));g.cur=r*N+c;g.kb=1}return true}
   if(code==='Enter'||code==='Space'){if(down&&!e.repeat){g.kb=1;this.rotateAt(s,host,g.cur)}return true}return false},
  controls(){return[h('span',{class:'hint mg-keys',text:t('wireKeys')})]},
  draw(c,s){const g=s.g,L=g.L,N=L.N,cs=g.cs;K.bg(c,W,H,'#1f2a33','#2d3d47');
   c.fillStyle='rgba(255,255,255,.04)';for(let x=0;x<W;x+=20)c.fillRect(x,0,1,H);
   K.panel(c,g.ox-10,g.oy-10,cs*N+20,cs*N+20,14,'#33454f','#1a252c');
   for(let i=0;i<N*N;i++){const r=Math.floor(i/N),cc=i%N,x=g.ox+cc*cs,y=g.oy+r*cs,on=g.on.has(i);c.fillStyle=(r+cc)%2?'#3b505b':'#405764';c.fillRect(x+1,y+1,cs-2,cs-2);
    const sp=g.spin.get(i),ang=sp?(-Math.PI/2)*(1-K.ease.out(Math.min(1,sp.t))):0;c.save();c.translate(x+cs/2,y+cs/2);c.rotate(ang);
    const m=L.cur[i],lw=cs*.34;c.lineCap='round';for(const pass of[0,1]){c.strokeStyle=pass?(on?(g.lit?'#fff3a0':'#ffd66b'):'#c3d2d9'):'#1b252c';c.lineWidth=pass?lw*.62:lw;c.beginPath();
     for(const[b,dx,dy]of[[1,0,-1],[2,1,0],[4,0,1],[8,-1,0]])if(m&b){c.moveTo(0,0);c.lineTo(dx*cs/2,dy*cs/2)}c.stroke()}
    c.fillStyle=on?'#ffd66b':'#c3d2d9';c.beginPath();c.arc(0,0,lw*.42,0,7);c.fill();if(on){c.globalAlpha=.25;c.fillStyle='#ffe58a';c.beginPath();c.arc(0,0,cs*.42,0,7);c.fill();c.globalAlpha=1}c.restore();
    if(g.kb&&g.cur===i){c.strokeStyle='#ff9b3d';c.lineWidth=3;c.strokeRect(x+2,y+2,cs-4,cs-4)}}
   // battery (left) and lamp (right)
   const sy=g.oy+cs*(L.start+.5);K.panel(c,g.ox-38,sy-22,30,44,7,'#3f7a2f','#1f3d1a',false);c.fillStyle='#2f5d2a';c.fillRect(g.ox-28,sy-27,10,6);K.text(c,'+',g.ox-23,sy+7,{size:20});
   const gy=g.oy+cs*(L.goalR+.5),lit=g.lit>0;c.fillStyle=lit?'rgba(255,230,120,.35)':'transparent';c.beginPath();c.arc(g.ox+cs*N+24,gy,24,0,7);c.fill();K.bell(c,g.ox+cs*N+24,gy,32,lit?'#ffe58a':'#d5e0e6');
   if(lit){c.save();c.globalAlpha=.6;K.catFace(c,g.ox+cs*N+24,gy-2,14,'#f0a24f',{happy:true});c.restore()}
   K.hud(c,W,'⏱ '+fmt(g.time),t('wireRound',[Math.min(g.round+1,g.rounds),g.rounds]),t('wireMovesBar',[g.moves]));
   K.text(c,t('wireTip'),W/2,H-12,{size:15,color:'#cfe0e8',maxW:W-20})}
 };
 // ======================================================================== diff (spot the difference)
 const DIFF_THINGS=['cat','plant','lamp','frame','cup','yarn','clock','books','fish','flower','ball','bowl'];
 function diffScene(rnd){const slots=K.shuffle([[40,40],[100,30],[165,40],[230,32],[290,42],[55,95],[125,100],[200,95],[275,100],[85,140],[165,145],[250,145]],rnd);
  const cols=['#e2554f','#4f86d6','#5bb36a','#f1c043','#9b6bd0','#f08bb0','#e98a5b'];
  const objs=K.shuffle(DIFF_THINGS,rnd).slice(0,9).map((k,i)=>({k,x:slots[i][0],y:slots[i][1],s:30+Math.floor(rnd()*8),col:cols[Math.floor(rnd()*cols.length)],flip:rnd()<.5,on:true}));
  const free=slots.slice(9);const B=objs.map(o=>({...o}));const kinds=K.shuffle(['color','remove','add','move','size','flip','color'],rnd).slice(0,5);const diffs=[];
  kinds.forEach((kind,n)=>{let o;if(kind==='add'){const sl=free.pop();if(!sl)kind='color';else{const extra={k:K.shuffle(DIFF_THINGS,rnd)[0],x:sl[0],y:sl[1],s:30,col:cols[n%cols.length],flip:false,on:false};objs.push(extra);const b={...extra,on:true};B.push(b);diffs.push({x:sl[0],y:sl[1],r:24});return}}
   const pool=objs.filter((_,i)=>i<9&&!diffs.some(d=>d.i===i));o=pool[Math.floor(rnd()*pool.length)];const i=objs.indexOf(o),b=B[i];
   if(kind==='color')b.col=cols[(cols.indexOf(o.col)+2+Math.floor(rnd()*3))%cols.length];else if(kind==='remove')b.on=false;else if(kind==='move'){b.x+=(o.x>160?-22:22);}else if(kind==='size')b.s=o.s*1.4;else b.flip=!o.flip;diffs.push({x:(o.x+b.x)/2,y:o.y,r:24,i})});
  return{A:objs,B,diffs}}
 function drawThing(c,o,x,y){const s=o.s;c.save();c.translate(x,y);if(o.flip)c.scale(-1,1);switch(o.k){
  case'cat':K.catFace(c,0,0,s*1.1,o.col==='#4f86d6'?'#9a96ab':o.col==='#9b6bd0'?'#3a3238':o.col==='#5bb36a'?'#f4ead8':'#f0a24f');break;
  case'plant':c.fillStyle='#a8572b';c.fillRect(-s*.3,s*.05,s*.6,s*.4);K.leaf(c,-s*.2,-s*.15,s*.6,o.col==='#e2554f'?'#3f7a2f':'#5bb36a');K.leaf(c,s*.2,-s*.25,s*.5,'#6aa25a');break;
  case'lamp':c.fillStyle='#7a5a4a';c.fillRect(-2,-s*.1,4,s*.5);c.fillStyle=o.col;c.beginPath();c.moveTo(-s*.4,-s*.05);c.lineTo(s*.4,-s*.05);c.lineTo(s*.22,-s*.5);c.lineTo(-s*.22,-s*.5);c.fill();break;
  case'frame':c.fillStyle='#8a5b3c';c.fillRect(-s*.45,-s*.38,s*.9,s*.76);c.fillStyle=o.col;c.fillRect(-s*.35,-s*.28,s*.7,s*.56);c.fillStyle='rgba(255,255,255,.6)';c.beginPath();c.arc(s*.12,-s*.08,s*.1,0,7);c.fill();break;
  case'cup':K.cup(c,0,0,s,o.col);break;case'yarn':K.yarn(c,0,0,s,o.col);break;
  case'clock':c.fillStyle=o.col;c.beginPath();c.arc(0,0,s*.45,0,7);c.fill();c.fillStyle='#fffaf0';c.beginPath();c.arc(0,0,s*.35,0,7);c.fill();c.strokeStyle='#2e2230';c.lineWidth=2;c.beginPath();c.moveTo(0,0);c.lineTo(0,-s*.25);c.moveTo(0,0);c.lineTo(s*.18,0);c.stroke();break;
  case'books':['#e2554f','#4f86d6',o.col].forEach((cl,i)=>{c.fillStyle=cl;c.fillRect(-s*.4+i*s*.28,-s*.4+(i%2)*4,s*.24,s*.8-(i%2)*4)});break;
  case'fish':K.fish(c,0,0,s,o.col);break;case'flower':c.fillStyle='#6aa25a';c.fillRect(-1.5,0,3,s*.45);K.flower(c,0,-s*.05,s*.7,o.col);break;
  case'ball':c.fillStyle=o.col;c.beginPath();c.arc(0,0,s*.36,0,7);c.fill();c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=2;c.beginPath();c.arc(0,0,s*.36,-.6,.6);c.stroke();break;
  case'bowl':c.fillStyle=o.col;c.beginPath();c.moveTo(-s*.45,-s*.05);c.lineTo(s*.45,-s*.05);c.quadraticCurveTo(s*.4,s*.35,0,s*.35);c.quadraticCurveTo(-s*.4,s*.35,-s*.45,-s*.05);c.fill();K.fish(c,0,-s*.12,s*.4,'#c9c0b4');break}c.restore()}
 const diff={size:{w:W,h:H},dt:1/60,help:()=>'diffHelp',
  create(s){const sc=diffScene(Math.random);return{...sc,found:new Set(),miss:[],time:0,limit:120,lives:3,ph:[{x:15,y:52,w:330,h:186},{x:15,y:250,w:330,h:186}],best:MiniHost.record(s.k).diffBest}},
  step(s,dt,host){const g=s.g;g.miss=g.miss.filter(m=>(m.t-=dt)>0);if(s.over)return;g.time+=dt;if(g.time>=g.limit){host.end(s,{lines:[t('diffFound',[g.found.size,g.diffs.length])],say:t('timeUp')});K.sfx('over')}},
  pointer(s,kind,p,e,host){if(kind!=='down'||s.over)return;const g=s.g,P=g.ph.find(q=>K.hit(p,q.x,q.y,q.w,q.h));if(!P)return;const lx=(p.x-P.x)*330/P.w,ly=(p.y-P.y)*186/P.h;
   const i=g.diffs.findIndex((d,j)=>!g.found.has(j)&&Math.hypot(lx-d.x,ly-d.y)<d.r+6);
   if(i>=0){g.found.add(i);K.sfx('target');for(const q of g.ph)host.burst(s,q.x+g.diffs[i].x*q.w/330,q.y+g.diffs[i].y*q.h/186,'#ffe58a',8,110);
    if(g.found.size===g.diffs.length){host.win(s);const left=Math.round(g.limit-g.time);const best=Math.max(g.best||0,left);host.end(s,{field:'diffBest',value:left,lines:[t('diffAll'),t('timeLine',[fmt(g.time)]),t('bestLine',[t('secs',[best])])],say:t('diffAll')});K.sfx('win')}}
   else{g.miss.push({x:p.x,y:p.y,t:.6});g.time+=8;s.shake=.3;K.sfx('error');host.pop(s,p.x,p.y-10,t('diffPenalty'),'#ff9b8a',15)}},
  draw(c,s){const g=s.g;K.bg(c,W,H,'#f3e7d6','#e2cfb6');
   g.ph.forEach((P,pi)=>{K.panel(c,P.x-3,P.y-3,P.w+6,P.h+6,12,'#fffaf0','#c9b496');c.save();K.round(c,P.x,P.y,P.w,P.h,10);c.clip();
    const wg=c.createLinearGradient(0,P.y,0,P.y+P.h);wg.addColorStop(0,'#f8e7c9');wg.addColorStop(.72,'#f1d7ad');wg.addColorStop(.72,'#c99a6a');wg.addColorStop(1,'#b5875a');c.fillStyle=wg;c.fillRect(P.x,P.y,P.w,P.h);
    c.fillStyle='rgba(255,255,255,.35)';c.fillRect(P.x+250,P.y+14,60,50);c.strokeStyle='#c9a77a';c.lineWidth=3;c.strokeRect(P.x+250,P.y+14,60,50);
    const list=pi?g.B:g.A;for(const o of list)if(o.on)drawThing(c,o,P.x+o.x*P.w/330,P.y+o.y*P.h/186);c.restore();
    g.diffs.forEach((d,j)=>{if(!g.found.has(j))return;c.strokeStyle='#e2554f';c.lineWidth=3;c.beginPath();c.arc(P.x+d.x*P.w/330,P.y+d.y*P.h/186,d.r,0,7);c.stroke()})});
   for(const m of g.miss){c.strokeStyle=`rgba(226,85,79,${m.t/.6})`;c.lineWidth=4;c.beginPath();c.moveTo(m.x-10,m.y-10);c.lineTo(m.x+10,m.y+10);c.moveTo(m.x+10,m.y-10);c.lineTo(m.x-10,m.y+10);c.stroke()}
   const rem=Math.max(0,g.limit-g.time);K.hud(c,W,fmt(rem),t('diffFoundBar',[g.found.size,g.diffs.length]),'',rem/g.limit);
   K.text(c,t('diffTip'),W/2,H-6,{size:14,color:'#5d4c62',maxW:W-20})}
 };
 // ======================================================================== stars (constellation memory)
 const SKY=[// constellation points (360x340 board) and edges
  {n:'cat',p:[[110,90],[140,150],[220,150],[250,90],[265,190],[230,250],[180,270],[130,250],[95,190]],e:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,0]]},
  {n:'fish',p:[[70,180],[120,130],[190,115],[250,145],[290,180],[250,215],[190,245],[120,230],[300,120],[300,240]],e:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[4,8],[4,9]]},
  {n:'paw',p:[[180,230],[130,200],[230,200],[180,170],[90,140],[140,95],[220,95],[270,140]],e:[[0,1],[1,3],[3,2],[2,0],[4,5],[6,7]]},
  {n:'moon',p:[[200,70],[145,100],[120,160],[135,220],[190,260],[250,245],[205,215],[185,160],[205,105]],e:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,0]]},
  {n:'yarn',p:[[180,90],[240,115],[265,175],[240,235],[180,260],[120,235],[95,175],[120,115],[180,175],[300,270]],e:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[0,8],[8,4],[4,9]]}];
 const stars={size:{w:W,h:H},dt:1/60,help:()=>'starsHelp',
  create(s){const C=SKY[s.variant%SKY.length],order=K.shuffle([...C.p.keys()]);return{C,order,len:3,seq:[],pos:0,phase:'show',t:-.6,flash:new Map(),lives:3,shown:0,round:0,tw:Math.random()*10,best:MiniHost.record(s.k).starsBest||0,bgStars:Array.from({length:60},(_,i)=>[(i*97)%360,48+(i*53)%380,(i%3)+1])}},
  tone(i){try{MiniAudio.note([60,62,64,67,69,72,74,76,79,81][i%10],{voice:'musicbox',vel:.6,dur:.5})}catch{}},
  step(s,dt,host){const g=s.g;g.tw+=dt;for(const[k,v]of g.flash){if((v.t-=dt)<=0)g.flash.delete(k)}if(s.over)return;
   if(g.phase==='show'){g.t+=dt;const k=Math.floor(g.t/.62);if(g.t>=0&&k<g.len&&k>=g.shown){const st=g.order[k];g.flash.set(st,{t:.45,c:'#ffe58a'});this.tone(st);g.shown=k+1}if(k>=g.len&&g.t>g.len*.62+.2){g.phase='input';g.pos=0}}},
  tapStar(s,host,i){const g=s.g;if(s.over||g.phase!=='input')return;this.tone(i);const want=g.order[g.pos];
   if(i===want){g.flash.set(i,{t:.3,c:'#9ff0b0'});g.pos++;if(g.pos===g.len){g.round++;K.sfx('target');const p=g.C.p[i];host.pop(s,p[0],p[1]+40,t('starsGood'),'#fff3c4',17);
     if(g.len>=g.C.p.length){host.win(s);const best=Math.max(g.best,g.len);host.end(s,{field:'starsBest',value:g.len,lines:[t('starsDone',[t('sky_'+g.C.n)]),t('bestLine',[best])],say:t('starsDone',[t('sky_'+g.C.n)])});K.sfx('win');return}
     g.len++;g.phase='show';g.t=-.7;g.shown=0}}
   else{g.flash.set(i,{t:.4,c:'#ff8f6b'});g.lives--;s.shake=.3;K.sfx('error');if(g.lives<=0){host.end(s,{field:'starsBest',value:g.len-1,lines:[t('starsReached',[g.len-1]),t('bestLine',[Math.max(g.best,g.len-1)])],say:t('starsReached',[g.len-1])});K.sfx('over');return}host.pop(s,W/2,H-60,t('starsAgain'),'#ffb8a8',16);g.phase='show';g.t=-.6;g.shown=0}},
  pointer(s,kind,p,e,host){if(kind!=='down')return;const g=s.g;let best=-1,bd=34;g.C.p.forEach((q,i)=>{const d=Math.hypot(p.x-q[0],p.y-(q[1]+50));if(d<bd){bd=d;best=i}});if(best>=0)this.tapStar(s,host,best)},
  key(s,code,down,e,host){const m=/^(?:Digit|Numpad)(\d)$/.exec(code);if(!m)return false;if(down&&!e.repeat){const i=(Number(m[1])+9)%10;if(i<s.g.C.p.length)this.tapStar(s,host,i)}return true},
  controls(){return[h('span',{class:'hint mg-keys',text:t('starsKeys')})]},
  draw(c,s){const g=s.g,C=g.C;K.bg(c,W,H,'#141433','#3b2f66');for(const[x,y,r]of g.bgStars){c.globalAlpha=.35+.3*Math.sin(g.tw*2+x);c.fillStyle='#fff';c.fillRect(x,y,r*.8,r*.8)}c.globalAlpha=1;
   // revealed edges: those whose both ends are within the first `len-1` shown stars
   const known=new Set(g.order.slice(0,g.round+2));c.strokeStyle='rgba(255,230,150,.5)';c.lineWidth=2;c.setLineDash([4,5]);for(const[a,b]of C.e)if(known.has(a)&&known.has(b)){c.beginPath();c.moveTo(C.p[a][0],C.p[a][1]+50);c.lineTo(C.p[b][0],C.p[b][1]+50);c.stroke()}c.setLineDash([]);
   C.p.forEach((q,i)=>{const f=g.flash.get(i),x=q[0],y=q[1]+50,r=11+(f?6*f.t/.45:0)+Math.sin(g.tw*3+i)*1;if(f){c.fillStyle=f.c;c.globalAlpha=.35;c.beginPath();c.arc(x,y,r*2.1,0,7);c.fill();c.globalAlpha=1}
    K.star(c,x,y,r,.45);c.fillStyle=f?f.c:'#fff3c4';c.fill();K.text(c,String((i+1)%10),x,y+r+16,{size:13,color:'#efeaff',stroke:'rgba(20,14,40,.8)',lw:3})});
   const hearts='♥'.repeat(g.lives)+'♡'.repeat(3-g.lives);K.hud(c,W,hearts,t('starsLen',[g.len]),t('bestShort',[g.best]));
   K.text(c,t(g.phase==='show'?'starsWatch':'starsYour',[g.pos,g.len]),W/2,H-12,{size:17,color:g.phase==='show'?'#ffe58a':'#9ff0b0',stroke:'rgba(20,14,40,.8)'})}
 };
 // ======================================================================== parking (slide the cars, let the cat car out)
 // 6x6, each car [row,col,len,horizontal]; car 0 is the cat car on row 2, exit on the right. Generated + verified offline (min moves noted).
 const LOTS=[[[[2,2,2,1],[1,4,2,0],[5,3,2,1],[1,0,2,0],[3,2,3,0],[3,0,2,0],[2,1,2,0],[1,2,2,1],[5,0,2,1],[0,1,2,1],[0,4,2,1],[3,3,3,1],[4,3,2,1]],[[2,1,2,1],[0,1,3,1],[3,4,2,0],[2,3,2,0],[5,4,2,1],[1,2,3,1],[1,5,2,0],[0,4,2,1],[3,0,2,0],[3,2,2,0]],[[2,0,2,1],[0,3,2,0],[5,1,2,1],[5,3,2,1],[0,1,2,0],[0,5,3,0],[2,3,2,0],[0,4,2,0],[0,0,2,0],[2,4,2,0]]],[[[2,0,2,1],[1,0,3,1],[3,4,2,1],[5,1,2,1],[1,4,2,0],[0,2,3,1],[3,1,2,1],[3,3,2,0],[0,5,3,0]],[[2,2,2,1],[5,4,2,1],[0,3,2,1],[0,0,2,1],[0,5,3,0],[2,1,2,0],[3,4,2,1],[4,0,3,1],[1,0,2,0],[5,2,2,1],[3,2,2,1],[4,3,2,1],[1,2,3,1]],[[2,0,2,1],[1,0,3,1],[3,4,2,1],[5,1,2,1],[1,4,2,0],[0,2,3,1],[3,1,2,1],[3,3,2,0],[0,5,3,0]]],[[[2,0,2,1],[5,3,2,1],[0,4,2,1],[4,0,3,1],[3,2,2,1],[2,5,3,0],[0,0,2,0],[1,2,2,0],[0,2,2,1]],[[2,0,2,1],[5,3,2,1],[0,4,2,1],[4,0,3,1],[3,2,2,1],[2,5,3,0],[0,0,2,0],[1,2,2,0],[0,2,2,1]],[[2,0,2,1],[5,3,2,1],[0,4,2,1],[4,0,3,1],[3,2,2,1],[2,5,3,0],[0,0,2,0],[1,2,2,0],[0,2,2,1]]],[[[2,0,2,1],[2,5,3,0],[0,2,3,0],[3,1,3,1],[5,4,2,1],[1,4,2,0],[3,0,2,0],[0,0,2,0],[5,0,2,1],[0,3,2,1]]],[[[2,0,2,1],[1,2,2,1],[3,3,3,0],[3,4,2,0],[2,5,2,0],[4,5,2,0],[0,4,2,0],[2,2,2,0],[3,0,2,1],[4,0,2,0],[4,1,2,1],[0,1,2,0]],[[2,0,2,1],[1,2,2,1],[3,3,3,0],[3,4,2,0],[2,5,2,0],[4,5,2,0],[0,4,2,0],[2,2,2,0],[3,0,2,1],[4,0,2,0],[4,1,2,1],[0,1,2,0]]]];
 function lotValid(cars){const occ=new Set();for(const[r,c,l,hz]of cars)for(let k=0;k<l;k++){const R=r+(hz?0:k),C=c+(hz?k:0);if(R>5||C>5||occ.has(R*6+C))return false;occ.add(R*6+C)}return true}
 function solveLot(cars,cap=60000){const key=cs=>cs.map(c=>c[0]*6+c[1]).join(','),start=cars.map(c=>c.slice()),seen=new Map([[key(start),0]]),q=[start];
  while(q.length){const cs=q.shift(),d=seen.get(key(cs));if(cs[0][1]+cs[0][2]===6)return d;if(seen.size>cap)return-1;const occ=new Set();cs.forEach(([r,c,l,hz])=>{for(let k=0;k<l;k++)occ.add((r+(hz?0:k))*6+c+(hz?k:0))});
   cs.forEach(([r,c,l,hz],i)=>{for(const dir of[-1,1])for(let st=1;st<6;st++){const nr=r+(hz?0:dir*st),nc=c+(hz?dir*st:0),cell=dir<0?(hz?r*6+nc:nr*6+c):(hz?r*6+nc+l-1:(nr+l-1)*6+c);if(nr<0||nc<0||(hz?nc+l>6:nr+l>6)||occ.has(cell))break;const ns=cs.map(x=>x.slice());ns[i][0]=nr;ns[i][1]=nc;const k=key(ns);if(!seen.has(k)){seen.set(k,d+1);q.push(ns)}}})}return-1}
 const CARCOL=['#f0a24f','#4f86d6','#5bb36a','#9b6bd0','#e2554f','#f1c043','#5b9dc0','#c98a5b','#6aa25a','#d97aa5','#7a8a96','#b5875a'];
 const parking={size:{w:W,h:H},dt:1/60,help:()=>'parkHelp',
  create(s){const v=s.variant,list=LOTS[v],cars=list[Math.floor(Math.random()*list.length)].map((c,i)=>({r:c[0],c:c[1],l:c[2],hz:!!c[3],x:0,y:0,col:CARCOL[i%CARCOL.length]}));
   const cs=50,ox=(W-cs*6)/2-12,oy=78;const g={cars,cs,ox,oy,moves:0,time:0,drag:null,exit:0,min:solveLot(cars.map(c=>[c.r,c.c,c.l,c.hz?1:0])),best:MiniHost.record(s.k).parkBest};cars.forEach(c=>{c.x=c.c;c.y=c.r});return g},
  occ(g,skip){const o=new Set();g.cars.forEach((c,i)=>{if(i===skip)return;for(let k=0;k<c.l;k++)o.add((c.r+(c.hz?0:k))*6+c.c+(c.hz?k:0))});return o},
  range(g,i){const c=g.cars[i],o=this.occ(g,i);let lo=c.hz?c.c:c.r,hi=lo;const free=p=>c.hz?!o.has(c.r*6+p)&&p>=0&&p<6:!o.has(p*6+c.c)&&p>=0&&p<6;
   while(free(lo-1))lo--;while(free(hi+c.l))hi++;if(i===0&&hi+c.l===6)hi=6;return[lo,hi]},
  step(s,dt,host){const g=s.g;for(const c of g.cars){c.x+=(c.c-c.x)*Math.min(1,dt*18);c.y+=(c.r-c.y)*Math.min(1,dt*18)}if(g.exit>0){g.exit+=dt;g.cars[0].x+=dt*9;if(g.exit>.9&&!s.over){host.win(s);const best=g.best==null?g.moves:Math.min(g.best,g.moves);host.end(s,{field:'parkBest',value:g.moves,lower:true,lines:[t('parkMoves',[g.moves]),t('parkMin',[g.min]),t('bestLine',[best])],say:t('parkWin')})}return}if(!s.over&&g.moves)g.time+=dt},
  pointer(s,kind,p,e,host){const g=s.g;if(g.exit)return;
   if(kind==='down'){const gx=(p.x-g.ox)/g.cs,gy=(p.y-g.oy)/g.cs;const i=g.cars.findIndex(c=>gx>=c.c&&gx<c.c+(c.hz?c.l:1)&&gy>=c.r&&gy<c.r+(c.hz?1:c.l));if(i<0)return;const c=g.cars[i];g.drag={i,id:e.pointerId,start:c.hz?c.c:c.r,p0:c.hz?p.x:p.y,range:this.range(g,i)};K.sfx('flipper',.4);return}
   if(!g.drag||g.drag.id!==e.pointerId)return;const d=g.drag,c=g.cars[d.i];
   if(kind==='move'){const pos=Math.round(Math.max(d.range[0],Math.min(d.range[1],d.start+((c.hz?p.x:p.y)-d.p0)/g.cs)));if(c.hz)c.c=Math.min(pos,6-c.l+(d.i===0?2:0));else c.r=pos;
    if(d.i===0&&c.c+c.l>6){c.c=6;g.drag=null;g.moves++;g.exit=.001;K.sfx('bonus');host.burst(s,g.ox+g.cs*6,g.oy+g.cs*2.5,'#ffe58a',20,180)}}
   else{const now=c.hz?c.c:c.r;if(now!==d.start){g.moves++;K.sfx('board',.6)}g.drag=null}},
  draw(c,s){const g=s.g,cs=g.cs;K.bg(c,W,H,'#e9e4da','#cfc6b6');
   K.panel(c,g.ox-12,g.oy-12,cs*6+24,cs*6+24,16,'#6f7378','#4b4f55');c.fillStyle='#5d6166';c.fillRect(g.ox,g.oy,cs*6,cs*6);
   c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=1;for(let i=1;i<6;i++){c.beginPath();c.moveTo(g.ox+i*cs,g.oy);c.lineTo(g.ox+i*cs,g.oy+cs*6);c.moveTo(g.ox,g.oy+i*cs);c.lineTo(g.ox+cs*6,g.oy+i*cs);c.stroke()}
   // exit gate
   c.fillStyle='#f1c043';c.fillRect(g.ox+cs*6+2,g.oy+cs*2+4,10,cs-8);K.text(c,'▶',g.ox+cs*6+22,g.oy+cs*2.5+6,{size:16,color:'#8a4108'});K.text(c,t('parkExit'),g.ox+cs*6+20,g.oy+cs*2-2,{size:13,color:'#4a3a52',maxW:34});
   c.save();c.beginPath();c.rect(g.ox-12,g.oy-12,W,cs*6+24);c.clip();
   g.cars.forEach((car,i)=>{const x=g.ox+car.x*cs+4,y=g.oy+car.y*cs+4,w=(car.hz?car.l:1)*cs-8,hh=(car.hz?1:car.l)*cs-8;c.fillStyle='rgba(0,0,0,.25)';K.round(c,x+2,y+4,w,hh,12);c.fill();
    c.fillStyle=car.col;K.round(c,x,y,w,hh,12);c.fill();c.fillStyle='rgba(255,255,255,.35)';if(car.hz)K.round(c,x+w*.3,y+6,w*.4,hh-12,6);else K.round(c,x+6,y+hh*.3,w-12,hh*.4,6);c.fill();
    c.fillStyle='#2e2230';for(const[a,b]of car.hz?[[x+10,y-2],[x+w-18,y-2],[x+10,y+hh-4],[x+w-18,y+hh-4]]:[[x-2,y+10],[x-2,y+hh-18],[x+w-4,y+10],[x+w-4,y+hh-18]])c.fillRect(a,b,car.hz?8:6,car.hz?6:8);
    if(i===0)K.catFace(c,x+w*.62,y+hh/2,hh*.72,'#f4ead8',{happy:g.exit>0})});c.restore();
   K.hud(c,W,'⏱ '+fmt(g.time),t('parkMovesBar',[g.moves]),t('parkMinBar',[g.min]));
   K.text(c,t('parkTip'),W/2,H-14,{size:15,color:'#4a3a52',maxW:W-20})}
 };
 // ======================================================================== weave (stitch by numbers)
 const PATTERNS={embroidery:['..1111..','.122221.','12233221','12333321','12333321','12233221','.122221.','..1111..'],
  loom:['33....33','313..313','.31111..','.120021.','.111111.','..1331..','.111111.','11....11'],
  sewing:['....1...','...121..','..12221.','.1222221','11222211','..1221..','..1..1..','.11..11.']};
 const THREADS={embroidery:['#f6e7cf','#e2554f','#f08bb0','#ffd66b'],loom:['#f6e7cf','#3a3238','#f1c043','#e2554f'],sewing:['#f6e7cf','#4f86d6','#7fb6e8','#ffd66b']};
 const weave={size:{w:W,h:H},dt:1/60,help:()=>'weaveHelp',
  create(s){const kind=/loom/.test(s.k)?'loom':/sewing/.test(s.k)?'sewing':'embroidery',P=PATTERNS[kind].map(r=>[...r].map(ch=>ch==='.'?0:Number(ch))),N=8,cs=36;
   return{kind,P,N,cs,ox:(W-N*cs)/2,oy:62,cur:P.map(r=>r.map(v=>v?-1:0)),pick:1,time:0,mistakes:0,painting:false,pop:new Map(),best:MiniHost.record(s.k).weaveBest,done:false}},
  step(s,dt){const g=s.g;for(const[k,v]of g.pop){if((v.t-=dt)<=0)g.pop.delete(k)}if(!s.over&&!g.done)g.time+=dt},
  paint(s,host,r,c){const g=s.g;if(g.done||r<0||c<0||r>=g.N||c>=g.N)return;const want=g.P[r][c];if(g.cur[r][c]===want)return;
   if(g.pick===want){g.cur[r][c]=want;g.pop.set(r*8+c,{t:.25});K.sfx('lane',.25);
    if(g.cur.every((row,i)=>row.every((v,j)=>v===g.P[i][j]))){g.done=true;host.win(s);K.sfx('win');host.burst(s,W/2,g.oy+g.N*g.cs/2,'#ffe58a',26,200);const best=g.best==null?g.time:Math.min(g.best,g.time);setTimeout(()=>{if(MiniTable.session===s)host.end(s,{field:'weaveBest',value:Math.round(g.time*10)/10,lower:true,lines:[t('weaveDone'),t('timeLine',[fmt(g.time)]),t('bestLine',[fmt(best)])],say:t('weaveDone')})},700)}}
   else if(!g.warn||g.warn<performance.now()){g.mistakes++;g.warn=performance.now()+400;g.wrong={r,c,t:.5};K.sfx('error',.4)}},
  cell(g,p){return[Math.floor((p.y-g.oy)/g.cs),Math.floor((p.x-g.ox)/g.cs)]},
  pointer(s,kind,p,e,host){const g=s.g;
   if(kind==='down'){const py=g.oy+g.N*g.cs+24;for(let i=1;i<4;i++){const x=W/2-1.5*64+(i-1)*64+7;if(K.hit(p,x,py,50,50)){g.pick=i;K.sfx('flipper',.4);return}}if(K.hit(p,g.ox,g.oy,g.N*g.cs,g.N*g.cs)){g.painting=e.pointerId;this.paint(s,host,...this.cell(g,p))}return}
   if(kind==='move'&&g.painting===e.pointerId&&K.hit(p,g.ox,g.oy,g.N*g.cs,g.N*g.cs))this.paint(s,host,...this.cell(g,p));
   if(kind==='up'||kind==='cancel')g.painting=false},
  key(s,code,down){const m=/^(?:Digit|Numpad)([1-3])$/.exec(code);if(!m)return false;if(down)s.g.pick=Number(m[1]);return true},
  controls(){return[h('span',{class:'hint mg-keys',text:t('weaveKeys')})]},
  draw(c,s){const g=s.g,T=THREADS[g.kind],cs=g.cs;K.bg(c,W,H,'#f4eadb','#e6d3bb','rgba(140,100,70,.08)');
   K.panel(c,g.ox-10,g.oy-10,g.N*cs+20,g.N*cs+20,12,'#fffaf0','#c9b496');
   for(let r=0;r<g.N;r++)for(let cc=0;cc<g.N;cc++){const x=g.ox+cc*cs,y=g.oy+r*cs,v=g.cur[r][cc],want=g.P[r][cc],pp=g.pop.get(r*8+cc);
    c.fillStyle=(r+cc)%2?'#f3ead9':'#efe3cf';c.fillRect(x,y,cs,cs);c.fillStyle='rgba(160,130,100,.25)';for(const[a,b]of[[.25,.25],[.75,.25],[.25,.75],[.75,.75]])c.fillRect(x+a*cs-1,y+b*cs-1,2,2);
    if(v>=0){const k=pp?1+pp.t:1;c.save();c.translate(x+cs/2,y+cs/2);c.scale(k,k);c.strokeStyle=T[v];c.lineWidth=cs*.2;c.lineCap='round';c.beginPath();c.moveTo(-cs*.3,-cs*.3);c.lineTo(cs*.3,cs*.3);c.moveTo(cs*.3,-cs*.3);c.lineTo(-cs*.3,cs*.3);c.stroke();c.strokeStyle='rgba(0,0,0,.15)';c.lineWidth=1;c.stroke();c.restore()}
    else K.text(c,String(want),x+cs/2,y+cs/2+6,{size:15,color:want===g.pick?'#a2470e':'#6b5648'})}
   if(g.wrong&&(g.wrong.t-=1/60)>0){c.strokeStyle='#e2554f';c.lineWidth=3;c.strokeRect(g.ox+g.wrong.c*cs+2,g.oy+g.wrong.r*cs+2,cs-4,cs-4)}
   const py=g.oy+g.N*cs+24;for(let i=1;i<4;i++){const x=W/2-1.5*64+(i-1)*64+7,sel=g.pick===i;K.panel(c,x,py-(sel?4:0),50,50,12,sel?'#fff3c4':'#fffaf0',sel?'#d9822b':'#c9b496');c.fillStyle=T[i];c.beginPath();c.arc(x+25,py+21-(sel?4:0),14,0,7);c.fill();c.strokeStyle='rgba(0,0,0,.2)';c.lineWidth=1.5;c.stroke();K.text(c,String(i),x+25,py+46-(sel?4:0),{size:13,color:'#5d4c62'})}
   const left=g.cur.flat().filter((v,i)=>v!==g.P[Math.floor(i/8)][i%8]).length;K.hud(c,W,'⏱ '+fmt(g.time),t('weaveLeft',[left]),t('weaveMiss',[g.mistakes]))}
 };
 for(const[k,v]of Object.entries({memory,puzzle,wire,diff,stars,parking,weave}))MiniTable.register(k,v);
 return{memory,puzzle,wire,diff,stars,parking,weave,LOTS,solveLot,lotValid,wireLevel,powered,diffScene,SKY,PATTERNS};
})();
