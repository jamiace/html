/* 0.92.24: explicit device states, classified PNG shop, small games and cat events. */
const Cozy={t:(k,a=[])=>I18n.t('cozy.'+k,a),item:uid=>Game.S.items.find(it=>it.uid===uid),
 active:()=>Room.state===Game.S&&!Room.edit&&!document.hidden&&Lights.mode==='on'&&!Lights.busy,
 action(a,name,f=0){if(name==='fight'&&PNGArt.meta.catEffects?.scuffle?.length){const list=PNGArt.meta.catEffects.scuffle;return PNGArt.image(list[Math.abs(Math.floor(f))%list.length]);}const set=PNGArt.meta.cozyActions[a.color]||PNGArt.meta.cozyActions.ginger;const frames=set?.[name];return frames&&PNGArt.image(frames[Math.min(frames.length-1,Math.max(0,f))]);},
 drawAction(c,a,name,f){const cv=this.action(a,name,f);if(!cv)return false;c.save();c.translate(Math.round(a.x),Math.round(a.y));if(a.flip)c.scale(-1,1);c.drawImage(cv,-14,-34);c.restore();return true},
 progress(){const p=Game.S.playProgress||(Game.S.playProgress={});const day=Life.today();if(p.day!==day){p.day=day;p.today=0;p.helpClaimed=false;}p.total=p.total||0;p.luck=p.luck||0;return p;},
 complete(token){if(token.credited)return;token.credited=true;const p=this.progress();p.total++;p.today++;if(p.today%5===0&&p.today<=20)p.luck=Math.min(8,p.luck+2);Game.save();UI.refresh('cozygame');},
 restoreHelp(){const p=this.progress();if(p.helpClaimed||p.today<15||Social.helpsToday()<=0)return;p.helpClaimed=true;p.helpCredit={day:Life.today(),n:1};Game.save();UI.refresh('friends');UI.refresh('cozygame');}
};
const CozyShop={
 classify(d){const k=d.id||'',s=d.spr||'',n=d.n||'';
  if(d.window)return'window';if(d.cozyGroup)return d.cozyGroup;
  if(d.litter||d.bowl||d.petSteps||/cat_|pet_|litter|scrat|catbed|tunnel/.test(k))return'cat';
  if(d.tv||d.screen||/laptop|monitor|console|arcade|speaker|radio|record|turntable|headphone|vr_|controller/.test(s))return'media';
  if(d.desk||d.chair||/desk|chair|stool/.test(s)||/書桌|工作桌|椅子|椅凳/.test(n))return'work';
  if(d.bed||d.seat||/sofa|bed|cushion|beanbag|ottoman/.test(s))return'rest';
  if(d.surface||/shelf|cabinet|wardrobe|rack|drawer|storage|bookcase/.test(s)||/櫃|層架|收納架|衣帽架/.test(n))return'storage';
  if(d.cat==='plant'||d.fish||/plant|fern|bonsai|flower|fishbowl|aquarium/.test(s)||/盆栽|花器|植栽|魚缸/.test(n))return'nature';
  if(d.layer==='rug'||d.cat==='rug')return'fabric';
  if(d.light||/lamp|lantern|candle|light/.test(s)||/燈|燭/.test(n))return'lighting';
  if(d.layer==='wall'||d.cat==='wall')return'wall';
  if(d.cozyGame||d.interactionProfile!=='native'&&d.interactionProfile||/toy|puzzle|snowglobe|musicbox|piano|game/.test(s))return'play';
  return'collect';
 },
 matches(d,tab){if(['furniture','decor','plant','wall','rug'].includes(tab)){if(tab==='wall')return this.classify(d)==='wall';return d.cat===tab;}return this.classify(d)===tab;},
 options(selected){const main=['theme','supply','work','rest','storage','media','lighting','nature','play','collect','cat','wall','fabric','pet'];return [...main.map(id=>h('option',{value:id,selected:id===selected},Cozy.t('category.'+id))),h('optgroup',{label:Cozy.t('category.room')},...['window','wallpaper','floor','view'].map(id=>h('option',{value:id,selected:id===selected},Cozy.t('category.'+id))))];}
};
// Use stable, explicit categories for every existing and new product; preserve IDs in saves.
for(const [id,d]of Object.entries(ITEMS)){d.id=id;const g=CozyShop.classify(d);d.shopGroup=g;d.fam=g;
 if(d.screen||d.tv||['laptop','monitor','dual_monitor'].includes(d.spr)){d.powerDevice=true;d.toggle=true;d.deviceKind=d.tv?'tv':'computer';}
 if((d.surface||d.desk)&&!d.petSpot){const a=PNGArt.meta.items[id];if(a){const s=d.surface||{x0:3,x1:a.size[0]-4,y:2};d.petSpot={x:Math.round((s.x0+s.x1)/2),y:s.y-1}}}
}
for(const id of ['fishbowl'])if(ITEMS[id])ITEMS[id].cozyEffect='fish';
for(const [id,d]of Object.entries(ITEMS)){if(/pendulum/.test(id))d.cozyEffect='pendulum';if(/musicbox/.test(id))d.cozyEffect='musicbox';if(/puzzle/.test(id))d.cozyGame='puzzle';if(/cards|album/.test(id))d.cozyGame='memory';}
if(ITEMS.sm_snowglobe)ITEMS.sm_snowglobe.cozyEffect='snow';if(ITEMS.trophy)ITEMS.trophy.cozyEffect='trophy';
for(const [id,d]of Object.entries(ITEMS)){if(/card|album|postcard|poker|boardgame/.test(id))d.cozyGame='memory';if(d.cozyType==='console')d.cozyGame=['memory','wire','fish','diff','stars'][Number(id.split('_').at(-1))-1];}
UI.shopCategoryOptions=selected=>CozyShop.options(selected);
const cozyShopWindow=UI.w_shop.bind(UI);UI.w_shop=function(){this.shopTab=({furniture:'work',decor:'collect',plant:'nature',rug:'fabric'})[this.shopTab]||this.shopTab;return cozyShopWindow();};
Object.assign(FAM_NAMES,Object.fromEntries(['work','rest','storage','media','lighting','nature','play','collect','cat','wall','fabric','window'].map(k=>[k,Cozy.t('category.'+k)])));
CATS.splice(0,CATS.length,...['theme','supply','work','rest','storage','media','lighting','nature','play','collect','cat','wall','fabric','window','wallpaper','floor','view','pet'].map(id=>({id,n:Cozy.t('category.'+id)})));
// New generic sprite users point at the canonical furniture PNG, not a second exported thumbnail.
const cozyGet=SPR.get.bind(SPR);SPR.get=function(name,map,flip,key){if(name.startsWith('cozy_')&&PNGArt.meta.sprites[name]){const rel='assets/png/furniture/'+name.replace(/_on$/,'__on')+'.png',cv=PNGArt.image(rel);return flip?PNGArt.flip(cv):cv;}return cozyGet(name,map,flip,key)};
const CozyDevice={uid:null,button:null,
 selected(){return Cozy.item(this.uid)},
 power(it,on){if(!it||!ITEMS[it.k]?.powerDevice)return;it.on=!!on;this.uid=it.on?it.uid:null;Game.save();UI.closeWin('device');this.position();},
 open(it){this.uid=it.uid;UI.openWin('device');},
 position(){const it=this.selected();if(!this.button){this.button=h('button',{class:'chip cozy-power',type:'button',onclick:()=>this.power(this.selected(),false)});document.body.append(this.button)}
  const visible=it&&it.on&&Room.uidMap[it.uid]&&Room.state===Game.S&&!Room.edit&&!document.hidden;
  this.button.hidden=!visible;if(!visible)return;this.button.textContent=Cozy.t('powerOff');const r=Room.cv.getBoundingClientRect(),cv=Room.itemCanvas(it);this.button.style.left=Math.max(6,Math.min(innerWidth-100,r.left+(it.x+cv.width/2)/RW*r.width))+'px';this.button.style.top=Math.max(6,r.top+it.y/RH*r.height-32)+'px';},
 render(){const it=this.selected();if(!it)return[h('p',{text:Cozy.t('missing')})];const d=ITEMS[it.k];const out=[h('b',{text:d.n}),sprPreview(Room.itemCanvas(it),120,4,100)];
  if(!it.on)return[...out,h('button',{class:'chip primary',onclick:()=>this.power(it,true)},Cozy.t('open'))];
  if(d.deviceKind==='computer')out.push(h('div',{class:'row wrap'},h('button',{class:'chip',onclick:()=>{UI.closeWin('device');UI.openWin('learn')}},Cozy.t('learn')),h('button',{class:'chip',onclick:()=>{UI.closeWin('device');UI.openWin('timer')}},Cozy.t('focus'))));
  else if(d.cozyGame)out.push(h('button',{class:'chip primary',onclick:()=>{UI.closeWin('device');CozyGames.open(it,d.cozyGame)}},Cozy.t('play')));
  else if(d.deviceKind==='tv')out.push(h('button',{class:'chip',onclick:()=>{it.channel=((it.channel||0)+1)%4;Game.save();UI.refresh('device')}},Cozy.t('channel',[(it.channel||0)+1])));
  else out.push(h('button',{class:'chip',onclick:()=>{UI.closeWin('device');UI.openWin('music')}},Cozy.t('music')));
  out.push(h('button',{class:'chip',onclick:()=>this.power(it,false)},Cozy.t('powerOff')));return out;}
};
UI.WIN.device={t:Cozy.t('device'),i:'i_sparkle',w:300,at:['c',0]};UI.w_device=()=>CozyDevice.render();
const cozyPlace=Game.place.bind(Game);Game.place=function(id){const oldIds=new Set(this.S.items.map(it=>it.uid));const r=cozyPlace(id);if(ITEMS[id]?.cozyType==='pendulum'){for(const it of this.S.items)if(!oldIds.has(it.uid)&&it.k===id)it.artSize29=1;this.save()}if(ITEMS[id]?.powerDevice){for(const it of this.S.items)if(!oldIds.has(it.uid)&&it.k===id)it.on=false;this.save();}return r};
// All electronics have a real dark PNG and no emissive light when off.
const cozyItem=Room.itemCanvas.bind(Room);Room.itemCanvas=function(it){const d=ITEMS[it.k],meta=PNGArt.meta.items[it.k];if(it.fallen&&meta?.fallen){const cv=PNGArt.image(meta.fallen);return it.flip?PNGArt.flip(cv):cv;}if(d?.powerDevice&&!it.on&&meta?.off){const cv=PNGArt.image(meta.off);return it.flip?PNGArt.flip(cv):cv;}if(d?.powerDevice&&!it.on&&meta?.states?.off?.length){let cv=PNGArt.frame(meta.states.off[0]);return it.flip?PNGArt.flip(cv):cv;}return cozyItem(it)};
const CozyGames={session:null,raf:null,
 animate(){const s=this.session;if(!s||!UI.wins.cozygame||UI.wins.cozygame.el.hidden)return;const body=UI.wins.cozygame.body,now=performance.now(),dt=Math.min(.05,Math.max(.001,(now-(s.lastAnim||now))/1000));s.lastAnim=now;if(!document.hidden){const bar=body.querySelector('.cozy-meter i');if(bar)bar.style.left=(45+45*Math.sin((performance.now()-s.began)/1000*(s.mode==='toss'?1.3:1.7)))+'%';if(s.mode==='pinball'&&!s.done){const b=s.ball;b.vy+=110*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.x<2||b.x>94){b.vx=-b.vx;b.x=Math.max(2,Math.min(94,b.x));}if(b.y<1){b.y=1;b.vy=Math.abs(b.vy);}if(b.y>130){b.y=15;b.vy=0;}const node=body.querySelector('.cozy-ball i');if(node){node.style.left=b.x+'%';node.style.top=b.y+'px';}}}this.raf=requestAnimationFrame(()=>this.animate());},
 open(it,mode){this.session={uid:it.uid,mode,began:performance.now(),seed:Math.random(),credited:false,steps:0,done:false};this.reset();UI.openWin('cozygame');cancelAnimationFrame(this.raf);this.animate()},
 reset(){const s=this.session;s.steps=0;s.done=false;s.credited=false;s.began=performance.now();s.first=null;s.lock=false;s.matches=[];s.ball={x:45,y:10,vx:30,vy:0};
  if(s.mode==='memory'){s.cards=shuffle([0,1,2,3,0,1,2,3]);s.flipped=[]}
  if(s.mode==='puzzle'){s.cells=[1,2,3,4,5,6,7,8,0];let at=8;for(let i=0;i<60;i++){const n=[at-3,at+3,at%3?at-1:-1,at%3<2?at+1:-1].filter(x=>x>=0&&x<9);const b=n[Math.floor(Math.random()*n.length)];[s.cells[at],s.cells[b]]=[s.cells[b],s.cells[at]];at=b;}}
  if(s.mode==='instrument'){s.sequence=Array.from({length:3},()=>Math.floor(Math.random()*4));s.input=[];s.listening=false;}
  if(s.mode==='wire')s.cells=Array.from({length:9},()=>Math.floor(Math.random()*4));
  s.maze=[0,0,1,0,0,1,0,1,0,1,0,0,0,0,0,0,1,1,1,0,0,0,0,1,0];s.position=0;s.odd=Math.floor(Math.random()*9);s.target=2+Math.floor(Math.random()*5);s.waitAt=performance.now()+1500+Math.random()*1800;s.car=0;
 },
 finish(){const s=this.session;if(!s||s.done)return;s.done=true;Cozy.complete(s);UI.refresh('cozygame')},
 move(i){const s=this.session;if(s.done||s.lock)return;s.steps++;
  if(s.mode==='memory'){if(s.matches.includes(i)||s.flipped.includes(i))return;s.flipped.push(i);if(s.flipped.length===2){const [a,b]=s.flipped;if(s.cards[a]===s.cards[b]){s.matches.push(a,b);s.flipped=[];if(s.matches.length===8)this.finish()}else{s.lock=true;const ref=s;setTimeout(()=>{if(this.session!==ref)return;s.lock=false;s.flipped=[];UI.refresh('cozygame')},650)}}}
  else if(s.mode==='puzzle'){const z=s.cells.indexOf(0);if(Math.abs(z%3-i%3)+Math.abs(Math.floor(z/3)-Math.floor(i/3))===1)[s.cells[z],s.cells[i]]=[s.cells[i],s.cells[z]];if(s.cells.every((x,j)=>x===(j+1)%9))this.finish()}
  else if(s.mode==='wire'){s.cells[i]=(s.cells[i]+1)%4;if(s.cells.every(n=>n===0))this.finish()}
  else if(s.mode==='instrument'){if(s.listening)return;this.note(i);s.input.push(i);if(i!==s.sequence[s.input.length-1])s.input=[];else if(s.input.length===s.sequence.length)this.finish()}
  else if(s.mode==='diff'){if(i===s.odd)this.finish();}
  else if(s.mode==='stars'){if(i===s.steps-1&&s.steps>=6)this.finish();else if(i!==s.steps-1)s.steps--;}
  UI.refresh('cozygame');
 },
 note(i){const A=TypoSound.unlock();if(!A)return;const o=A.createOscillator(),g=A.createGain(),at=A.currentTime;o.type='triangle';o.frequency.value=[261.63,293.66,329.63,392][i%4];g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(.12,at+.015);g.gain.exponentialRampToValueAtTime(.0001,at+.42);o.connect(g);g.connect(A.destination);o.start(at);o.stop(at+.45)},
 listen(){const s=this.session;if(s.listening)return;s.input=[];s.listening=true;UI.refresh('cozygame');s.sequence.forEach((n,i)=>setTimeout(()=>{if(this.session===s){this.note(n);s.lit=n;UI.refresh('cozygame')}},i*600));setTimeout(()=>{if(this.session===s){s.listening=false;s.lit=null;UI.refresh('cozygame')}},s.sequence.length*600+200)},
 step(delta){const s=this.session;if(s.done)return;if(s.mode==='maze'){const next=s.position+delta;if(next>=0&&next<25&&s.maze[next]===0&&(Math.abs(delta)===5||Math.floor(next/5)===Math.floor(s.position/5)))s.position=next;}else s.position=Math.max(0,Math.min(8,s.position+delta));s.steps++;if(s.mode==='maze'&&s.position===24||s.mode==='parking'&&s.position===8)this.finish();UI.refresh('cozygame')},
 tap(){const s=this.session;if(s.done)return;const elapsed=(performance.now()-s.began)/1000;s.steps++;
  if(['reaction','fish'].includes(s.mode)){if(performance.now()>=s.waitAt)this.finish();else{s.waitAt=performance.now()+1000;s.message='wait'}}
  else if(s.mode==='balance'){if(Math.abs(Math.sin(elapsed*1.7))<.55)s.position++;else s.position=Math.max(0,s.position-1);if(s.position>=5)this.finish()}
  else if(s.mode==='toss'){if(Math.abs(Math.sin(elapsed*1.3))<.65)s.position++;if(s.position>=3)this.finish()}
  else if(s.mode==='pinball'){if(s.ball.y>80){s.ball.vy=-120;s.ball.vx=s.steps%2?35:-35;}if(elapsed>=8&&s.steps>=8)this.finish();else s.position=(s.position+3)%9;}
  UI.refresh('cozygame')},
 render(){const s=this.session,it=s&&Cozy.item(s.uid);if(!it)return[h('p',{text:Cozy.t('missing')})];const d=ITEMS[it.k],p=Cozy.progress(),out=[h('p',{text:d.n}),h('p',{class:'hint',text:Cozy.t('gameHelp.'+s.mode)}),h('p',{class:'hint',text:Cozy.t('gameProgress',[p.today,p.luck])})];
  if(s.done)out.push(h('p',{class:'cozy-result',text:Cozy.t('complete')}));
  else if(s.mode==='memory')out.push(h('div',{class:'cozy-grid cols4'},...s.cards.map((n,i)=>h('button',{class:'cozy-card',disabled:s.lock||s.matches.includes(i)||s.flipped.includes(i),onclick:()=>this.move(i)},s.matches.includes(i)||s.flipped.includes(i)?['★','☀','♬','♡'][n]:'?'))));
  else if(s.mode==='puzzle'||s.mode==='wire')out.push(h('div',{class:'cozy-grid cols3'},...s.cells.map((n,i)=>h('button',{class:'cozy-card',onclick:()=>this.move(i)},s.mode==='wire'?['─','│','┐','└'][n]:n||''))));
  else if(s.mode==='instrument')out.push(h('button',{class:'chip',disabled:s.listening,onclick:()=>this.listen()},Cozy.t('listen')),h('div',{class:'cozy-grid cols4'},...[0,1,2,3].map(n=>h('button',{class:'cozy-card'+(s.lit===n?' lit':''),disabled:s.listening,onclick:()=>this.move(n)},['Do','Re','Mi','Sol'][n]))));
  else if(s.mode==='diff')out.push(h('div',{class:'cozy-grid cols3'},...Array.from({length:9},(_,i)=>h('button',{class:'cozy-card',onclick:()=>this.move(i)},i===s.odd?'✧':'✦'))));
  else if(s.mode==='stars')out.push(h('div',{class:'cozy-grid cols3'},...Array.from({length:9},(_,i)=>h('button',{class:'cozy-card',disabled:i<s.steps,onclick:()=>this.move(i)},i<6?'★ '+(i+1):'·'))));
  else if(s.mode==='maze')out.push(h('div',{class:'cozy-maze'},...s.maze.map((n,i)=>h('span',{class:n?'wall':'',text:i===s.position?'●':i===24?'⚑':''}))),h('div',{class:'cozy-keyrow'},...[["←",-1],["↑",-5],["↓",5],["→",1]].map(([label,n])=>h('button',{class:'chip',onclick:()=>this.step(n)},label))));
  else if(s.mode==='parking')out.push(h('div',{class:'cozy-track'},...Array.from({length:9},(_,i)=>h('span',{text:i===s.position?'●':i===8?'⚑':'·'}))),h('div',{class:'row'},h('button',{class:'chip',onclick:()=>this.step(-1)},'←'),h('button',{class:'chip',onclick:()=>this.step(1)},'→')));
  else if(s.mode==='pinball')out.push(h('div',{class:'cozy-ball'},h('i')),h('div',{class:'cozy-keyrow'},...['←','→'].map(label=>h('button',{class:'chip',onclick:()=>this.tap()},label))));
  else out.push(h('div',{class:'cozy-meter '+s.mode,style:['reaction','fish'].includes(s.mode)?'animation:cozy-ready 0s steps(1) '+Math.max(0,(s.waitAt-performance.now())/1000)+'s forwards':''},h('i')),h('button',{class:'chip primary cozy-big',onclick:()=>this.tap()},Cozy.t('tap')),h('p',{class:'hint',text:Cozy.t('steps',[s.position||s.steps])}));
  out.push(h('button',{class:'chip',onclick:()=>{this.reset();UI.refresh('cozygame')}},Cozy.t('restart')),h('button',{class:'chip',disabled:p.today<15||p.helpClaimed||Social.helpsToday()<=0,onclick:()=>Cozy.restoreHelp()},Cozy.t('restoreHelp')));return out;}
};
UI.WIN.cozygame={t:Cozy.t('game'),i:'i_sparkle',w:380,at:['c',0]};UI.w_cozygame=()=>CozyGames.render();
const cozyClose=UI.closeWin.bind(UI);UI.closeWin=function(id){if(id==='cozygame'){CozyGames.session=null;cancelAnimationFrame(CozyGames.raf);}return cozyClose(id)};
const cozyHelps=Social.helpsToday.bind(Social);Social.helpsToday=function(){const used=cozyHelps(),credit=Game.S.playProgress?.helpCredit;return Math.max(0,used-(credit?.day===Life.today()?credit.n||0:0))};
const cozyLuck=Feel.luck.bind(Feel);Feel.luck=function(s,q){const p=Cozy.progress(),old=FEEL.luck;if(p.luck>0)FEEL.luck=Math.min(.4,old+.08);try{const r=cozyLuck(s,q);if(r&&p.luck>0){p.luck--;Game.save()}return r}finally{FEEL.luck=old}};
const CozyEffects={events:new Map(),play(it,type){const event={type,at:Room.t};this.events.set(it.uid,event);if(type==='musicbox')[0,2,1,3].forEach((note,i)=>setTimeout(()=>{if(Room.state===Game.S&&!document.hidden&&this.events.get(it.uid)===event)CozyGames.note(note)},i*350));if(type==='trophy'){UI.toast(Cozy.t('achievement',[Math.floor(Game.S.stats.focusMin||0),Object.keys(Game.S.vocab||{}).length]),'i_star',5)}},
 draw(c,it){const e=this.events.get(it.uid);if(!e)return;const dt=Room.t-e.at;if(dt>6){this.events.delete(it.uid);return;}const cv=Room.itemCanvas(it);const type=e.type==='fish'?'food':e.type==='snow'?'snow':'spark';const im=PNGArt.image('assets/png/actions/effect_'+type+'.png');c.save();c.beginPath();c.rect(it.x+2,it.y+2,cv.width-4,cv.height-4);c.clip();c.globalAlpha=Math.max(0,1-dt/6);c.drawImage(im,it.x+Math.sin(dt*2)*3,it.y+dt*2);c.restore();}
};
const cozyInteract=Game.interact.bind(Game);Game.interact=function(it){const d=ITEMS[it.k];if(Room.state!==this.S||Room.edit)return cozyInteract(it);if(it.soiled||it.fallen)return CozyCats.clean(it);if(d?.musicShortcut){const need=Life.needOf('item',it.uid);if(need&&NEED_DEFS[need.type]?.item)return cozyInteract(it);UI.clearBubbles('furniture');return UI.openWin('music')}if(d?.powerDevice)return CozyDevice.open(it);if(d?.toggle){const r=cozyInteract(it);if(it.on&&d.cozyEffect)CozyEffects.play(it,d.cozyEffect);return r;}if(d?.cozyGame)return CozyGames.open(it,d.cozyGame);if(d?.cozyEffect){if(d.cozyEffect==='plate'){const v=prompt(Cozy.t('plateText'),it.plateText||'');if(v!==null){it.plateText=String(v).slice(0,12);this.save()}return;}if(d.cozyEffect==='photo')return Furn.photo(it,it.x+Room.itemCanvas(it).width/2);CozyEffects.play(it,d.cozyEffect);return;}return cozyInteract(it)};
const cozyDrawItem=Room.drawItem.bind(Room);Room.drawItem=function(c,it){cozyDrawItem(c,it);CozyEffects.draw(c,it);const cv=this.itemCanvas(it);if(it.soiled){if(typeof HouseholdCare!=='undefined')HouseholdCare.drawItemStain(c,it,cv);else c.drawImage(PNGArt.image('assets/png/actions/effect_urine.png'),it.x+cv.width/2-16,it.y+cv.height-9);}if(it.fallen)c.drawImage(PNGArt.image('assets/png/actions/effect_spill.png'),it.x+cv.width/2-16,it.y+cv.height-5);if(it.plateText){c.save();c.font='4px monospace';c.fillStyle='#332c40';c.fillText(it.plateText,it.x+5,it.y+22,30);c.restore();}};
const cozyRender=Room.render.bind(Room);Room.render=function(dt){const r=cozyRender(dt);CozyDevice.position();return r};
// Household events use active play time; no offline accident backlog.
TRAITS.naughty={n:Cozy.t('naughty'),d:Cozy.t('naughtyHelp')};
const CozyCats={clock:0,next:0,lastFight:-1e9,lastMess:-1e9,catTimes:new Map(),pairTimes:new Map(),
 naughty(p){return p.trait==='naughty'||p.trait==='playful'},
 begin(a,it,kind){if(!PetCare.canAct(a))return false;const state=Game.S,uid=it.uid,target=it.k,token={};a.cozyEvent=token;a.careLock=true;a.state='walk';const end=()=>{if(a.cozyEvent!==token)return;a.cozyEvent=null;a.careLock=false;a.cozyPose=null;if(a.state==='walk'||a.state==='act'){a.state='sit';a.timer=3;}};const perform=()=>{if(Game.S!==state||!Cozy.item(uid)||Cozy.item(uid).k!==target){end();return;}a.state='act';a.cozyPose={name:kind==='urine'?'squat':'swat',until:Room.t+2};setTimeout(()=>{if(Game.S===state&&Room.state===state&&Cozy.item(uid)&&a.cozyEvent===token){const live=Cozy.item(uid);live[kind==='urine'?'soiled':'fallen']=true;if(kind!=='urine'){live.returnSpot={x:live.x,y:live.y};for(const k of ['p','dx','dy'])if(live[k]!=null)live.returnSpot[k]=live[k];delete live.p;delete live.dx;delete live.dy;live.y=Math.min(165,live.y+Room.itemCanvas(live).height+16)-Room.itemCanvas(live).height;Room.clampItem(live);Room.indexItems();}Game.save();UI.toast(Cozy.t(kind==='urine'?'accident':'knocked',[a.data.name,ITEMS[live.k].n]),'i_paw',4)}end();},1600);};const at=()=>{const d=ITEMS[it.k],spot=d.petSpot;if(kind==='urine'&&spot){const w=Room.itemCanvas(it).width;a.startJump(it.x+(it.flip?w-spot.x:spot.x),it.y+spot.y,()=>{a.on=it;a.onOff=[a.x-it.x,a.y-it.y];perform();});}else perform();};const cv=Room.itemCanvas(it),ok=a.walkTo(it.x+cv.width/2,Math.min(166,it.y+cv.height+3),at,true);if(ok===false){end();return false;}setTimeout(end,20000);return true;},
 clean(it){const uid=it.uid;PetCare.ownerAt(it.x+Room.itemCanvas(it).width/2,Math.min(166,it.y+Room.itemCanvas(it).height+3),()=>{const live=Cozy.item(uid);if(!live)return;delete live.soiled;delete live.fallen;delete live.fallPhase;if(live.returnSpot){const old=live.returnSpot;if(old.p!=null&&Room.uidMap[old.p])Object.assign(live,old);else{live.x=old.x;live.y=old.y;delete live.p;delete live.dx;delete live.dy;Room.clampItem(live);}delete live.returnSpot;Room.indexItems();}Game.save();UI.toast(Cozy.t('cleaned'),'i_brush',2)})},
 tick(dt){if(!Cozy.active())return;this.clock+=Math.min(.2,dt);if(this.clock<this.next)return;this.next=this.clock+5;const pets=Pets.home(),busy=Game.S.items.filter(it=>it.soiled||it.fallen).length+(Game.S.homeCare?.messes.length||0);
  for(const p of pets){const a=Pets.actor(p);if(!PetCare.canAct(a))continue;const last=this.catTimes.get(p.id)||-1e6;
   if(this.clock-last>300&&busy<3&&this.clock-this.lastMess>180&&(this.naughty(p)||p.stress>=65)&&Math.random()<5/(this.naughty(p)?1800:1200)){
    const targets=Game.S.items.filter(it=>{const d=ITEMS[it.k];return !it.soiled&&!it.fallen&&(d.bed||d.seat||d.layer==='rug'||/cushion|catbed/.test(d.spr))});if(targets.length&&Math.random()>=.3){const it=targets[Math.floor(Math.random()*targets.length)];if(this.begin(a,it,'urine')){this.catTimes.set(p.id,this.clock);this.lastMess=this.clock;}continue;}else{if(PetCare.accident(a)){this.catTimes.set(p.id,this.clock);this.lastMess=this.clock;}continue;}}
   if(this.naughty(p)&&this.clock-last>600&&busy<3&&this.clock-this.lastMess>180&&Math.random()<5/300){const targets=Game.S.items.filter(it=>{const d=ITEMS[it.k];return !it.fallen&&!it.soiled&&d.layer==='decor'&&!d.powerDevice&&!d.light&&!d.special&&!d.clock&&!d.window&&Math.hypot(it.x-a.x,it.y-a.y)<60});if(targets.length){const it=targets[Math.floor(Math.random()*targets.length)];if(ITEMS[it.k].cozyEffect==='fish'&&Date.now()-(Game.S.homeCare.lastFishSpill||0)<10800000)continue;if(this.begin(a,it,'knock')){this.lastMess=this.clock;this.catTimes.set(p.id,this.clock);if(ITEMS[it.k].cozyEffect==='fish')Game.S.homeCare.lastFishSpill=Date.now();}}}
  }
  for(let i=0;i<pets.length;i++)for(let j=i+1;j<pets.length;j++){const pa=pets[i],pb=pets[j],a=Pets.actor(pa),b=Pets.actor(pb);if(!PetCare.canAct(a)||!PetCare.canAct(b)||PetAI.dist(a,b)>36)continue;const pair=PetCare.pair(pa,pb),key=PetCare.key(pa,pb),last=this.pairTimes.get(key)||-1e6;const friction=pair.score<45||this.naughty(pa)||this.naughty(pb)||pa.stress>55||pb.stress>55;
   if(friction&&this.clock-last>240&&Math.random()<5/480){PetAI.act(a,'look',2);a.cozyPose={name:'hiss',until:Room.t+2};pair.score=Math.max(0,pair.score-2);this.pairTimes.set(key,this.clock);const away=PetAI.away(b,a,22);b.walkTo(...away);}
   if(friction&&this.clock-this.lastFight>900&&Date.now()-(pair.lastFight||0)>1500000&&Math.random()<5/(pair.score<40?1800:5400)){if(PetCare.fight(a,b))this.lastFight=this.clock;}
  }
 }
};
const cozyTick=Life.tick.bind(Life);Life.tick=function(dt){const r=cozyTick(dt);CozyCats.tick(dt);return r};
// Add actual clear perch positions, rejecting tabletops already occupied by decor.
const cozySpots=Pet.prototype.spots;Pet.prototype.spots=function(){return cozySpots.call(this).filter(s=>!Game.S.items.some(it=>it.p===s.it.uid&&Math.abs(it.x+Room.itemCanvas(it).width/2-s.x)<13))};
const cozyPetUpdate=Pet.prototype.update;Pet.prototype.update=function(dt){if(this.cozyEvent){if(!Cozy.active()||(!Game.S.items.length&&!this.cozyEvent.floorUrine)){this.cozyEvent=null;this.careLock=false;this.cozyPose=null;this.state='sit';this.walking=false;this.onArrive=null;return;}if(this.jump){const j=this.jump;j.t+=dt/.6;const k=Math.min(1,j.t);this.x=j.x0+(j.x1-j.x0)*k;this.y=j.y0+(j.y1-j.y0)*k-Math.sin(k*Math.PI)*10;if(k>=1){this.jump=null;this.y=j.y1;j.cb&&j.cb();}}else if(this.walking)Walker.prototype.step.call(this,dt);return;}return cozyPetUpdate.call(this,dt)};
const cozyPetDraw=Pet.prototype.draw;Pet.prototype.draw=function(c){if(this.jump&&this.kind==='cat'){const upward=this.jump.y1<this.jump.y0-4;return Cozy.drawAction(c,this,upward?'jump':'down',Math.floor(Math.min(.999,this.jump.t)*16));}if(this.scuffle){const g=this.scuffle;if(g.a!==this)return;return Cozy.drawAction(c,{color:this.color,x:(g.ax+g.bx)/2,y:(g.ay+g.by)/2,flip:false},'fight',Math.floor(g.t*12)%8);}if(this.cozyPose?.until>Room.t)return Cozy.drawAction(c,this,this.cozyPose.name,Math.floor(Room.t*10)%8);if(this.walking&&this.state==='zoom')return Cozy.drawAction(c,this,'run',Math.floor(Room.t*14)%8);return cozyPetDraw.call(this,c)};
const cozyToilet=PetCare.drawToilet.bind(PetCare);PetCare.drawToilet=function(c,a){const s=a.toiletScene;if(!s)return false;if(s.phase==='enter'||s.phase==='leave')return cozyToilet(c,a);const it=s.box,[w,h]=itemSize(it),cv=Cozy.action(a,s.phase==='squat'?'squat':'dig',Math.floor(s.t*10)%8);if(!cv)return cozyToilet(c,a);c.save();if(it.k!=='litter_tray'){c.beginPath();c.rect(it.x+8,it.y+8,w-16,h-8);c.clip();}c.drawImage(cv,it.x+w/2-14,it.y+h-35);c.restore();const front=PNGArt.meta.items[it.k]?.layers?.toilet_foreground;if(front)c.drawImage(PNGArt.image(front),it.x,it.y);else{const box=Room.itemCanvas(it);c.drawImage(box,0,h-5,w,5,it.x,it.y+h-5,w,5)}return true;};
const cozyLoad=Game.load.bind(Game);Game.load=function(){CozyDevice.uid=null;CozyEffects.events.clear();CozyGames.session=null;CozyCats.clock=0;CozyCats.next=0;CozyCats.lastFight=-1e9;CozyCats.lastMess=-1e9;CozyCats.catTimes.clear();CozyCats.pairTimes.clear();return cozyLoad(...arguments)};
// Avoid focus loss while typing Chinese search terms. Preserve caret and pending account refresh.
document.addEventListener('focusout',e=>{if(e.target.id==='acct-status'||e.target.id==='acct-name')setTimeout(()=>{if(UI._accountRefreshPending&&!/^acct-/.test(document.activeElement?.id||'')){UI._accountRefreshPending=false;UI.refresh('account')}},0)});
const cozyUIRender=UI.render.bind(UI);UI.render=function(id){const el=document.activeElement,cursor=el?.selectionStart,end=el?.selectionEnd,key=el?.id;const r=cozyUIRender(id);if(key?.startsWith('q-')){const live=document.getElementById(key);if(live&&cursor!=null)try{live.setSelectionRange(cursor,end)}catch{}}return r};

// The same lucky-answer bonus also applies to Meow Typo without changing word difficulty.
const cozyTypoSubmit=CatsTypo.submit.bind(CatsTypo);CatsTypo.submit=function(){const s=this.session,before=s?.correct||0,r=cozyTypoSubmit();if(s&&s===this.session&&s.correct>before){const proxy=s.cozyLuck||(s.cozyLuck={qs:s.words,wrong:[],luckyN:0});proxy.qi=s.at;const lucky=Feel.luck(proxy,{type:'spell'});if(lucky)UI.toast(lucky.text,lucky.icon,3);}return r};
document.addEventListener('compositionstart',e=>{if(e.target.id?.startsWith('q-'))UI._cozySearchIME=true;},true);document.addEventListener('compositionend',e=>{if(e.target.id?.startsWith('q-')){UI._cozySearchIME=false;UI.refresh(UI.wins.shop?.body?.contains(e.target)?'shop':'storage');}},true);
const cozyRefresh=UI.refresh.bind(UI);UI.refresh=function(id){if(UI._cozySearchIME&&(id==='shop'||id==='storage'))return;return cozyRefresh(id);};

CatMess.prototype.draw=function(c){c.drawImage(PNGArt.image('assets/png/actions/effect_urine.png'),Math.round(this.x)-16,Math.round(this.y)-7)};CatMess.prototype.hit=function(x,y){return Math.abs(x-this.x)<17&&Math.abs(y-this.y)<8};
document.addEventListener('keydown',e=>{const w=UI.wins.cozygame,s=CozyGames.session;if(!s||!w||w.el.hidden||e.isComposing||e.ctrlKey||e.altKey||e.metaKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;const z=Number(w.el.style.zIndex)||0;if(Object.values(UI.wins).some(o=>o!==w&&!o.el.hidden&&(Number(o.el.style.zIndex)||0)>z))return;const arrows={ArrowLeft:-1,ArrowRight:1,ArrowUp:-5,ArrowDown:5};if(['maze','parking'].includes(s.mode)&&arrows[e.key]!=null){e.preventDefault();CozyGames.step(arrows[e.key]);}else if(e.code==='Space'&&!e.repeat&&['balance','reaction','toss','pinball','fish'].includes(s.mode)){e.preventDefault();CozyGames.tap();}});

if(typeof FurnPlay!=='undefined'){const refresh=FurnPlay.refresh.bind(FurnPlay);FurnPlay.refresh=function(){const s=this.session;if(s){if(s.phase==='won'&&!s._cozyWon){s._cozyWon=true;Cozy.complete({credited:false,began:0});}else if(s.phase!=='won')s._cozyWon=false;}return refresh();};}
