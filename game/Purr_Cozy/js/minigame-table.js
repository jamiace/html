/* 0.92.29 Purr Cozy mini games: host runtime for the canvas table games (pinball / toss / maze).
   Owns the window DOM, the fixed-step loop, pointer + keyboard routing, pausing, results and rewards.
   Each game is a plain object registered with MiniTable.register(mode, game):
     size {w,h} · create(s,host) -> state · step(s,dt,host) · draw(c,s,host) · controls(s,host) -> nodes
     pointer(s,kind,p,e,host) · key(s,code,down,e,host) -> handled · release(s,host) · help(s) -> i18n key */
const MiniHost={
 t(k,a=[]){return I18n.t('mini.'+k,a)},
 record(k){return Game.S.furnPlay?.items?.[k]||{}},
 write(k,fields){const S=Game.S;S.furnPlay??={version:1,items:{}};S.furnPlay.items??={};S.furnPlay.items[k]={...S.furnPlay.items[k],...fields};Game.save()},
 // Stores a personal best; returns true when it is a new record.
 best(k,field,value,lower=false){const old=this.record(k)[field];if(old!=null&&(lower?value>=old:value<=old))return false;this.write(k,{[field]:value});return true},
 // One reward per token. Cozy.complete marks the token, so repeated calls in the same round never pay twice.
 reward(token){if(!token||token.credited)return false;Cozy.complete(token);return true},
 topmost(id){const w=UI.wins[id];if(!w||w.el.hidden)return false;const z=Number(w.el.style.zIndex)||0;return!Object.values(UI.wins).some(v=>v!==w&&!v.el.hidden&&(Number(v.el.style.zIndex)||0)>z)},
 // Usable height inside a window body: limited by .win-b max-height, the window max-height and the visible viewport.
 room(w){const body=w.body,bcs=getComputedStyle(body),wcs=getComputedStyle(w.el),vh=window.visualViewport?.height||innerHeight,num=v=>{const n=parseFloat(v);return isFinite(n)?n:1e9};
  const pad=(parseFloat(bcs.paddingTop)||0)+(parseFloat(bcs.paddingBottom)||0),frame=w.el.offsetHeight-body.offsetHeight;
  return{height:Math.min(num(bcs.maxHeight),num(wcs.maxHeight)-frame,vh-16-frame)-pad,width:body.clientWidth-(parseFloat(bcs.paddingLeft)||0)-(parseFloat(bcs.paddingRight)||0)}},
 typing(e){return e.isComposing||e.ctrlKey||e.metaKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName||'')},
 time(sec){const m=Math.floor(sec/60),s=sec-m*60;return m+':'+(s<10?'0':'')+s.toFixed(1)},
 // Hold-to-press button: multi-touch safe (own pointer capture), releases on cancel / lost capture.
 holdButton(label,cls,on,off){const b=h('button',{class:'chip mg-hold '+cls,type:'button'},label);const ids=new Set(),end=(e,fire)=>{if(!ids.delete(e.pointerId))return;if(!ids.size)off(fire)};
  b.addEventListener('pointerdown',e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch{}if(!ids.size)on();ids.add(e.pointerId);b.classList.add('down')});
  b.addEventListener('pointerup',e=>{end(e,true);if(!ids.size)b.classList.remove('down')});
  for(const t of['pointercancel','lostpointercapture'])b.addEventListener(t,e=>{end(e,false);if(!ids.size)b.classList.remove('down')});
  b.addEventListener('contextmenu',e=>e.preventDefault());
  b.addEventListener('click',e=>{if(e.detail===0){on();off(true)}});// keyboard activation (Enter on focused button)
  return b}
};

const MiniTable={
 games:{},session:null,raf:0,
 register(mode,game){this.games[mode]=game},
 variant(k){const m=/_(\d+)$/.exec(k||'');return m?(Number(m[1])-1)%5:0},
 valid(){const s=this.session;return!!(s&&s.state===Game.S&&Room.state===Game.S&&!Room.edit&&!Game.outdated&&Cozy.item(s.uid)&&UI.wins.cozygame&&!UI.wins.cozygame.el.hidden)},
 open(it,mode){
  this.close();
  const game=this.games[mode],s=this.session={uid:it.uid,k:it.k,mode,game,state:Game.S,variant:this.variant(it.k),last:0,acc:0,paused:false,pointers:new Map(),fx:[],shake:0};
  this.build(s);this.reset(s);
  UI.openWin('cozygame');this.fitSoon(s);
  this.raf=requestAnimationFrame(t=>this.loop(t));
 },
 reset(s=this.session){if(!s)return;s.game.release?.(s,this);s.pointers.clear();s.token={credited:false};s.won=false;s.over=false;s.result=null;s.time=0;s.acc=0;s.fx=[];s.g=s.game.create(s,this);this.syncControls(s);this.foot(s)},
 close(){cancelAnimationFrame(this.raf);this.raf=0;const s=this.session;if(!s)return;try{s.game.release?.(s,this);s.game.dispose?.(s,this)}catch(e){console.warn(e)}s.ro?.disconnect();this.session=null},
 // ---- DOM (built once per session and re-attached on UI.refresh so the canvas and handlers survive) ----
 build(s){
  const G=s.game,cv=h('canvas',{class:'mg-canvas','aria-label':this.text(s,G.help(s))});
  const stage=h('div',{class:'mg-stage',style:`--ar:${G.size.w}/${G.size.h}`},cv);
  const status=h('p',{class:'mg-sr',role:'status','aria-live':'polite'});
  const controls=h('div',{class:'mg-controls'}),progress=h('span',{class:'mg-progress'}),restore=h('button',{class:'chip mg-small',type:'button',onclick:()=>{Cozy.restoreHelp();this.foot(s)}},Cozy.t('restoreHelp'));
  const restart=h('button',{class:'chip mg-small',type:'button',onclick:()=>{if(this.session===s){this.reset(s);this.say(s,this.text(s,'restarted'))}}},MiniHost.t('restart'));
  const help=h('details',{class:'mg-help'},h('summary',{text:MiniHost.t('howTo')}),h('p',{text:MiniHost.t(G.help(s))}));
  const name=ITEMS[s.k]?.n||'';
  const root=h('div',{class:'mg-root mg-'+s.mode+' mg-v'+s.variant},h('div',{class:'mg-top'},h('b',{class:'mg-name',text:name}),help),stage,controls,h('div',{class:'mg-foot'},progress,restart,restore),status);
  s.dom={root,cv,stage,status,controls,progress,restore};
  s.ctx=cv.getContext('2d');
  const point=e=>{const r=cv.getBoundingClientRect();return{x:(e.clientX-r.left)*G.size.w/(r.width||1),y:(e.clientY-r.top)*G.size.h/(r.height||1)}};
  const live=()=>this.session===s&&this.valid()&&!s.paused;
  cv.addEventListener('pointerdown',e=>{if(!live())return;e.preventDefault();if(s.over){if(performance.now()-s.overAt>600)this.reset(s);return}try{cv.setPointerCapture(e.pointerId)}catch{}const p=point(e);s.pointers.set(e.pointerId,p);G.pointer?.(s,'down',p,e,this)});
  cv.addEventListener('pointermove',e=>{if(this.session!==s)return;const p=point(e);if(s.pointers.has(e.pointerId)){s.pointers.set(e.pointerId,p);G.pointer?.(s,'move',p,e,this)}else if(e.pointerType==='mouse')G.pointer?.(s,'hover',p,e,this)});
  const up=kind=>e=>{if(this.session!==s||!s.pointers.has(e.pointerId))return;s.pointers.delete(e.pointerId);G.pointer?.(s,kind,point(e),e,this)};
  cv.addEventListener('pointerup',up('up'));cv.addEventListener('pointercancel',up('cancel'));cv.addEventListener('lostpointercapture',up('cancel'));
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  if(typeof ResizeObserver!=='undefined'){s.ro=new ResizeObserver(()=>{s.cssW=0});s.ro.observe(cv)}
 },
 syncControls(s=this.session){if(!s?.dom)return;s.dom.controls.replaceChildren(...(s.game.controls?.(s,this)||[]).filter(Boolean));this.fitSoon(s)},
 foot(s=this.session){if(!s?.dom)return;const p=Cozy.progress();s.dom.progress.textContent=Cozy.t('gameProgress',[p.today,p.luck]);s.dom.restore.hidden=s.dom.restore.disabled=p.today<15||p.helpClaimed||Social.helpsToday()<=0},
 render(){const s=this.session;if(!s||!Cozy.item(s.uid))return[h('p',{text:Cozy.t('missing')})];this.foot(s);s.cssW=0;this.fitSoon(s);return[s.dom.root]},
 // Size the canvas to the space the window really has (the game's .win-b max-height, the window's own max-height and the
 // visible viewport), so the board, score and buttons are always visible without scrolling on desktop and phone.
 fitSoon(s){requestAnimationFrame(()=>this.fit(s))},
 fit(s=this.session){const w=UI.wins.cozygame;if(!s?.dom||s!==this.session||!w||w.el.hidden||!s.dom.root.isConnected)return;
  const room=MiniHost.room(w);if(!room)return;const cv=s.dom.cv,G=s.game,other=s.dom.root.offsetHeight-cv.offsetHeight;
  const cw=Math.max(150,Math.floor(Math.min(s.dom.stage.clientWidth||room.width,(room.height-other-2)*G.size.w/G.size.h)));
  if(Math.abs(cv.offsetWidth-cw)>1){cv.style.width=cw+'px';s.cssW=0}UI.placeWin?.(w)},
 text(s,k,a){return MiniHost.t(k,a)},
 say(s,text){if(s?.dom&&text)s.dom.status.textContent=text},
 // ---- round results ----
 win(s){if(s.won)return;s.won=true;MiniHost.reward(s.token);this.foot(s)},
 end(s,result){if(s.over)return;s.over=true;s.overAt=performance.now();s.result=result;if(result.field)result.record=MiniHost.best(s.k,result.field,result.value,!!result.lower);this.syncControls(s);this.say(s,result.say||'')},
 // ---- loop ----
 loop(now){
  this.raf=0;const s=this.session;if(!s)return;
  if(!this.valid()){this.close();if(UI.wins.cozygame&&!UI.wins.cozygame.el.hidden)UI.closeWin('cozygame');return}
  const blocked=document.hidden||!MiniHost.topmost('cozygame'),dt=s.last?Math.min(.05,(now-s.last)/1000):0;s.last=now;
  if(blocked){if(!s.paused){s.paused=true;s.pointers.clear();s.game.release?.(s,this)}}
  else{s.paused=false;const step=s.game.dt||1/240;s.acc+=dt;let n=0;while(s.acc>=step&&n<40){s.game.step(s,step,this);s.acc-=step;n++}if(n>=40)s.acc=0;if(!s.over)s.time+=dt;
   for(const f of s.fx){f.t+=dt;f.x+=(f.vx||0)*dt;f.y+=(f.vy||0)*dt;if(f.g)f.vy+=f.g*dt}s.fx=s.fx.filter(f=>f.t<f.life);s.shake=Math.max(0,s.shake-dt*3)}
  this.draw(s);
  this.raf=requestAnimationFrame(t=>this.loop(t));
 },
 draw(s){
  const cv=s.dom.cv,G=s.game;
  if(!s.cssW){const r=cv.getBoundingClientRect();s.cssW=r.width;s.cssH=r.height}
  if(!s.cssW)return;
  const dpr=Math.min(2.5,window.devicePixelRatio||1),bw=Math.max(1,Math.round(s.cssW*dpr)),bh=Math.max(1,Math.round(s.cssH*dpr));
  if(cv.width!==bw||cv.height!==bh){cv.width=bw;cv.height=bh}
  const c=s.ctx;c.setTransform(bw/G.size.w,0,0,bh/G.size.h,0,0);
  c.save();if(s.shake){c.translate((Math.random()-.5)*s.shake*4,(Math.random()-.5)*s.shake*4)}
  G.draw(c,s,this);this.drawFx(c,s);c.restore();
  if(s.over&&s.result)this.overlay(c,s,MiniHost.t(s.won?'resultWin':'resultEnd'),s.result.lines||[],s.result.record?MiniHost.t('newRecord'):'');
  else if(s.paused)this.overlay(c,s,MiniHost.t('paused'),[]);
 },
 // Particles and floating text shared by all games.
 pop(s,x,y,text,color='#fff3c4',size=16){s.fx.push({kind:'text',x,y,vy:-38,t:0,life:.9,text,color,size})},
 burst(s,x,y,color,n=10,speed=140){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=speed*(.4+Math.random()*.8);s.fx.push({kind:'spark',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,g:220,t:0,life:.35+Math.random()*.35,color,r:1.5+Math.random()*1.8})}},
 drawFx(c,s){for(const f of s.fx){const k=1-f.t/f.life;c.globalAlpha=Math.max(0,Math.min(1,k*1.6));if(f.kind==='text'){c.font=`800 ${f.size}px system-ui,sans-serif`;c.textAlign='center';c.lineWidth=4;c.strokeStyle='rgba(30,22,40,.75)';c.strokeText(f.text,f.x,f.y);c.fillStyle=f.color;c.fillText(f.text,f.x,f.y)}else{c.fillStyle=f.color;c.beginPath();c.arc(f.x,f.y,f.r*k+.3,0,7);c.fill()}}c.globalAlpha=1},
 overlay(c,s,title,lines,badge){const{w,h:H}=s.game.size;c.save();c.fillStyle='rgba(28,22,40,.72)';c.fillRect(0,0,w,H);const bh=96+lines.length*24+(badge?26:0),y=H/2-bh/2;
  c.fillStyle='rgba(255,248,232,.97)';this.round(c,w/2-130,y,260,bh,16);c.fill();c.textAlign='center';c.fillStyle='#4a3a52';c.font='800 22px system-ui,sans-serif';c.fillText(title,w/2,y+38);
  c.font='600 16px system-ui,sans-serif';c.fillStyle='#5d4c62';lines.forEach((t,i)=>c.fillText(t,w/2,y+68+i*24));
  if(badge){c.fillStyle='#d9822b';c.font='800 15px system-ui,sans-serif';c.fillText('★ '+badge+' ★',w/2,y+68+lines.length*24+4)}
  if(s.over){c.fillStyle='#8a7a90';c.font='500 13px system-ui,sans-serif';c.fillText(MiniHost.t('playAgain'),w/2,y+bh-14)}c.restore()},
 round(c,x,y,w,hh,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+hh,r);c.arcTo(x+w,y+hh,x,y+hh,r);c.arcTo(x,y+hh,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()},
 // ---- keyboard (registered once; ignored unless this window is on top) ----
 key(e,down){const s=this.session;if(!s||!this.valid()||MiniHost.typing(e))return;if(down&&!MiniHost.topmost('cozygame'))return;
  if(down&&s.over&&(e.code==='Enter'||e.code==='Space')&&!e.repeat&&e.target?.tagName!=='BUTTON'){e.preventDefault();e.stopImmediatePropagation();this.reset(s);return}
  if(s.game.key?.(s,e.code,down,e,this)){e.preventDefault();e.stopImmediatePropagation()}},
 releaseAll(){const s=this.session;if(s){s.pointers.clear();s.game.release?.(s,this)}}
};
document.addEventListener('keydown',e=>MiniTable.key(e,true),true);
document.addEventListener('keyup',e=>MiniTable.key(e,false),true);
window.addEventListener('blur',()=>MiniTable.releaseAll());
for(const t of[window,window.visualViewport].filter(Boolean))t.addEventListener('resize',()=>{if(MiniTable.session)MiniTable.fitSoon(MiniTable.session);if(typeof MiniInstrument!=='undefined')MiniInstrument.fitSoon?.()});
document.addEventListener('visibilitychange',()=>{if(document.hidden)MiniTable.releaseAll()});
