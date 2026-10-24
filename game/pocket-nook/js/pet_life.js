/* Persistent cat relationships, litter routines, occasional conflicts and owner care. */
const PetCare = {
  clock:0,lastCheck:0,ownerBusy:false,
  ensure(S=Game.S){if(!S||!S.zoo)return;S.homeCare=S.homeCare||{messes:[],log:[],lastFight:0};S.homeCare.messes=S.homeCare.messes||[];S.homeCare.log=S.homeCare.log||[];S.zoo.pairs=S.zoo.pairs||{};
    for(const p of S.zoo.pets){if(!Number.isFinite(p.stress))p.stress=15;if(!Number.isFinite(p.bladder))p.bladder=25;if(!Number.isFinite(p.injury))p.injury=0;if(!Number.isFinite(p.bandaged))p.bandaged=0;}
  },
  key(a,b){return [a.id,b.id].sort((x,y)=>x-y).join(':')},
  pair(a,b){this.ensure();const key=this.key(a,b),pairs=Pets.Z.pairs;if(!pairs[key]){const old=[...(a.rel&&a.rel.list||[]),...(b.rel&&b.rel.list||[])];const negative=old.some(r=>(r.t===a.id||r.t===b.id)&&RELS[r.r]&&!RELS[r.r].good);pairs[key]={ids:[a.id,b.id],score:negative?32:52,familiar:0,conflicts:0,lastFight:0};}return pairs[key]},
  label(pair){return pair.score>=80?'形影不離':pair.score>=65?'相處融洽':pair.score>=45?'慢慢熟悉':pair.score>=28?'有點緊張':'需要磨合'},
  log(text){const C=Game.S.homeCare;C.log.unshift({at:Date.now(),text});C.log=C.log.slice(0,30)},
  boxes(){return Game.S.items.filter(it=>ITEMS[it.k]&&ITEMS[it.k].litter)},
  boxFree(it){return (it.used||0)<(ITEMS[it.k].capacity||3)&&!it._toilet},
  canAct(a){return a&&a.data&&a.data.home&&!a.walking&&!a.jump&&!a.on&&!a.climbItem&&!a.perchPause&&['sit','act'].includes(a.state)&&!a.careLock&&!a.hp},
  changePair(a,b,n){const r=this.pair(a,b);r.score=clamp100(r.score+n);return r},
  tick(dt){if(!Game.S||Room.state!==Game.S)return;this.ensure();this.clock+=Math.min(.2,dt);this.syncMesses();if(Room.edit||Lights.busy||document.hidden)return;
    if(this.clock-this.lastCheck<5)return;const seconds=Math.min(10,this.clock-this.lastCheck);this.lastCheck=this.clock;const mins=seconds/60,home=Pets.home();
    for(const p of home){const a=Pets.actor(p);if(Lights.mode==='on'){p.bladder=clamp100(p.bladder+mins*(p.hunger>20?1.25:.65));const low=PetAI.low(p),dirty=this.boxes().length&&this.boxes().every(it=>!this.boxFree(it));p.stress=clamp100(p.stress+mins*(low?1.8:dirty?.6:-.8));}
      if(p.bandaged>0&&a&&a.state==='sleep'){p.injury=Math.max(0,p.injury-mins*1.5);if(!p.injury){p.bandaged=0;this.log(p.name+'的傷好了');UI.toast(p.name+'恢復精神了','i_heart',3);Game.save();}}
      if(Lights.mode==='on'&&p.bladder>=90&&this.canAct(a)){const box=this.boxes().filter(it=>this.boxFree(it)).sort((x,y)=>Math.hypot(x.x-a.x,x.y-a.y)-Math.hypot(y.x-a.x,y.y-a.y))[0];if(box)this.toilet(a,box);else if(p.bladder>=100)this.accident(a);}
    }
    if(Lights.mode!=='on')return;
    for(let i=0;i<home.length;i++)for(let j=i+1;j<home.length;j++){const a=Pets.actor(home[i]),b=Pets.actor(home[j]);if(!a||!b)continue;const r=this.pair(home[i],home[j]);
      if(PetAI.dist(a,b)<36&&home[i].stress<45&&home[j].stress<45){r.familiar+=seconds;r.score=clamp100(r.score+mins*.12);}
      const unsettled=PetAI.low(home[i])||PetAI.low(home[j])||home[i].stress>65||home[j].stress>65;
      if(r.score<40&&unsettled&&PetAI.dist(a,b)<22&&this.canAct(a)&&this.canAct(b)&&Date.now()-(r.lastFight||0)>8*60000&&Date.now()-(Game.S.homeCare.lastFight||0)>3*60000&&Math.random()<.08){this.fight(a,b);return;}
    }
  },
  fight(a,b){if(!this.canAct(a)||!this.canAct(b)||PetAI.dist(a,b)>28)return false;const pa=a.data,pb=b.data,r=this.pair(pa,pb),now=Date.now();r.lastFight=now;r.conflicts++;r.score=Math.max(0,r.score-9);Game.S.homeCare.lastFight=now;
    const group={t:0,a,b,ax:a.x,ay:a.y,bx:b.x,by:b.y,finished:false};for(const p of [pa,pb]){p.stress=clamp100(p.stress+18);p.mood=clamp100(p.mood-12);p.energy=clamp100(p.energy-8);}
    for(const p of [a,b]){p.state='scuffle';p.scuffle=group;p.walking=false;p.actCb=null;p.timer=3;p.careLock=true;}
    this.log(pa.name+'和'+pb.name+'起了爭執');Game.bubble(a,'嘶——！',1.5);Game.bubble(b,'喵！',1.5);UI.toast('貓咪吵起來了，點牠們分開','i_paw',4);Game.save();return true;
  },
  endFight(g,early=false){if(g.finished)return;g.finished=true;for(const a of [g.a,g.b]){const p=a.data;if(p&&!early&&Math.random()<.55)p.injury=Math.max(p.injury,20+Math.floor(Math.random()*16));a.scuffle=null;a.careLock=false;a.state='sit';a.timer=6;a.x=a===g.a?g.ax:g.bx;a.y=a===g.a?g.ay:g.by;if(p){p.stress=Math.max(0,p.stress-(early?20:5));const other=a===g.a?g.b:g.a;const pos=PetAI.away(a,other,22);a.state='walk';a.walkTo(pos[0],pos[1],()=>{a.state='sit';a.timer=8});}}
    UI.toast(early?'先分開冷靜一下':'吵完了，看看牠們有沒有受傷','i_paw',3);UI.refresh('pet');Game.save();
  },
  accident(a){const p=a.data;if(!p||Game.S.homeCare.messes.length>=8)return false;const m={id:Date.now()+'-'+p.id,x:Math.round(a.x),y:Math.round(a.y),pet:p.id,at:Date.now()};Game.S.homeCare.messes.push(m);p.bladder=8;p.clean=clamp100(p.clean-8);p.stress=clamp100(p.stress+5);this.log(p.name+'尿在地上了');Game.bubble(a,'喵…',2);UI.toast(p.name+'尿在地上了，點尿漬清理','it_spray',4);this.syncMesses();Game.save();return true;},
  toilet(a,it){if(!this.canAct(a)||!this.boxFree(it))return false;it._toilet=a.pid;a.careLock=true;const token={};a.toiletToken=token;const [w,h]=itemSize(it);a.state='walk';const ok=a.walkTo(it.x+w/2,Math.min(166,it.y+h-2),()=>{
    if(a.toiletToken!==token)return;if(!Room.uidMap[it.uid]||!this.boxFree(Object.assign({},it,{_toilet:null}))){this.releaseToilet(a,it);return;}
    PetAI.act(a,'knead',4,()=>{if(a.toiletToken!==token)return;it.used=(it.used||0)+1;if(a.data){a.data.bladder=5;a.data.clean=clamp100(a.data.clean-1);a.data.stress=Math.max(0,a.data.stress-5);}this.releaseToilet(a,it);a.state='sit';a.timer=4;Game.bubble(a,'沙沙…',1.5);Game.save();UI.refresh('pet');});
  },true);if(ok===false){this.releaseToilet(a,it);return false;}a.toiletStarted=Date.now();return true;},
  releaseToilet(a,it){if(it&&it._toilet===a.pid)delete it._toilet;a.careLock=false;a.toiletToken=null;},
  syncMesses(){const C=Game.S.homeCare;if(!C)return;const alive=new Set(C.messes.map(m=>m.id));Room.actors=Room.actors.filter(a=>!a.isMess||alive.has(a.id));for(const m of C.messes)if(!Room.actors.some(a=>a.isMess&&a.id===m.id))Room.actors.push(new CatMess(m));},
  ownerAt(x,y,done){if(Room.state!==Game.S)return UI.toast('回自己家再照顧牠吧','i_people',2);if(this.ownerBusy)return UI.toast('先把手上的事做完','i_paw',2);if(Room.edit||Lights.mode!=='on')return UI.toast('先開燈、結束佈置再來吧','i_paw',2);if(Game.focusing())return UI.toast('先完成這輪專注，再來照顧牠','i_paw',3);
    const A=Game.avatar;if(!A)return;this.ownerBusy=true;const state=Game.S;A.stand();A.state='walk';const finish=()=>{if(Game.S!==state){this.ownerBusy=false;return;}A.state='idle';A.timer=2;A.lp={at:Room.t,end:Room.t+1.5,frame:()=> 'type0'};setTimeout(()=>{this.ownerBusy=false;if(Game.S===state){done();UI.refresh('pet');Game.save();}},1000)};
    const ok=A.walkTo(x,y,finish);if(ok===false){this.ownerBusy=false;UI.toast('這裡有點擠，移開附近家具再試','i_brush',3);return;}const until=setTimeout(()=>{if(this.ownerBusy){this.ownerBusy=false;if(A.onArrive===finish){A.onArrive=null;A.walking=false;A.state='idle';}UI.toast('走不到那裡，移開附近家具再試','i_brush',3)}},20000);const callback=A.onArrive;A.onArrive=()=>{clearTimeout(until);callback&&callback()};
  },
  cleanMess(id){const m=Game.S.homeCare.messes.find(x=>x.id===id);if(!m)return;this.ownerAt(m.x+12,Math.min(166,m.y+3),()=>{Game.S.homeCare.messes=Game.S.homeCare.messes.filter(x=>x.id!==id);this.syncMesses();this.log('清理了地上的尿漬');Room.puff('p_spark',m.x,m.y-3,{vy:-7});UI.toast('擦乾淨了','i_brush',2);});},
  cleanBox(uid){const it=Room.uidMap[uid];if(!it||!ITEMS[it.k].litter)return;if(it._toilet!=null)return UI.toast('等牠用完再清理','i_paw',2);if(!(it.used>0))return UI.toast('貓砂還很乾淨','i_sparkle',2);const [w,h]=itemSize(it);this.ownerAt(it.x+w/2+12,Math.min(166,it.y+h+3),()=>{if(!Room.uidMap[uid])return;it.used=0;for(const p of Pets.home())p.stress=Math.max(0,p.stress-4);this.log('清乾淨貓砂盆');UI.toast('貓砂清乾淨了','i_sparkle',2)});},
  bandage(pid){const p=Pets.get(pid);if(!p||!p.injury)return;if(!Life.has('bandage'))return UI.toast('先到商店買小繃帶','bandage',3);const a=Pets.actor(p);if(!a)return UI.toast('先接牠回房間','i_paw',2);if(a.scuffle)this.endFight(a.scuffle,true);this.ownerAt(a.x+12,a.y+4,()=>{if(!Life.has('bandage')||!p.injury)return;Life.L.bag.bandage--;p.bandaged=Date.now();p.injury=Math.max(0,p.injury-12);p.stress=Math.max(0,p.stress-15);p.mood=clamp100(p.mood+5);this.log('替'+p.name+'包紮');a.goNap();UI.toast('包紮好了，睡一覺慢慢恢復','bandage',3)});},
  soothe(pid){const p=Pets.get(pid),a=Pets.actor(p);if(!p||!a)return;if(a.scuffle)this.endFight(a.scuffle,true);const now=Date.now();if(now-(p.soothedAt||0)<60000)return UI.toast('讓牠安靜一下吧','i_paw',2);p.soothedAt=now;p.stress=Math.max(0,p.stress-18);p.mood=clamp100(p.mood+5);for(const q of Pets.home())if(q!==p)this.changePair(p,q,1);Pets.pet(pid);Game.save();UI.refresh('pet');},
  panel(p){this.ensure();const others=Pets.list().filter(q=>q.id!==p.id);const boxes=this.boxes(),C=Game.S.homeCare;
    return h('section',{class:'settings-card pet-life'},h('b',{text:'小貓日常'}),h('div',{class:'row wrap'},h('span',{class:'ptag',text:p.injury?(p.bandaged?'已包紮 · 休息恢復中':'受傷了'):'沒有受傷'}),h('span',{class:'ptag',text:p.stress>=65?'有點焦躁':p.stress>=35?'想安靜一下':'心情放鬆'}),h('button',{class:'chip sm',onclick:()=>this.soothe(p.id)},'安撫')),p.injury?h('div',{class:'row wrap'},h('button',{class:'chip',disabled:p.bandaged>0,onclick:()=>this.bandage(p.id)},ico('bandage',18),p.bandaged?'休息恢復中':'替牠包紮'),!Life.has('bandage')?h('button',{class:'chip sm',onclick:()=>{Life.buySupply('bandage',1);UI.refresh('pet')}},'買繃帶 · 25 金'):null):null,
      h('div',{class:'sub',text:'貓砂與清潔'}),...boxes.map(it=>h('div',{class:'care-line'},h('span',{text:ITEMS[it.k].n+' · '+((it.used||0)>=ITEMS[it.k].capacity?'該清了':(it.used||0)?'用過了':'乾淨')}),h('button',{class:'chip sm',disabled:!(it.used>0)||it._toilet!=null,onclick:()=>this.cleanBox(it.uid)},'清貓砂'))),!boxes.length?h('div',{class:'care-line'},h('span',{text:'放一個貓砂盆，牠會自己去用。'}),h('button',{class:'chip sm',onclick:()=>{UI.shopTab='furniture';UI.openWin('shop')}},'買貓砂盆')):null,
      ...C.messes.map(m=>h('div',{class:'care-line'},h('span',{text:(Pets.get(m.pet)||{name:'小貓'}).name+'留下的尿漬'}),h('button',{class:'chip sm',onclick:()=>this.cleanMess(m.id)},'清理'))),
      h('div',{class:'sub',text:'和同伴的關係'}),...others.map(q=>{const r=this.pair(p,q);return h('div',{class:'care-line'},h('span',{text:q.name}),h('span',{class:'ptag',text:this.label(r)}),h('span',{class:'hint num',text:Math.round(r.score)+'/100'}))}),!others.length?h('p',{class:'hint',text:'有新同伴後，會慢慢熟悉彼此。'}):null,
      h('details',{},h('summary',{text:'最近發生的事'}),...C.log.slice(0,8).map(x=>h('p',{class:'hint',text:new Date(x.at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+' '+x.text}))))
  },
};
class CatMess{
 constructor(m){Object.assign(this,m);this.isMess=true;}z(){return this.y-.2}headPos(){return[this.x,this.y-3]}update(){}hit(x,y){return Math.abs(x-this.x)<8&&Math.abs(y-this.y)<4}poke(){PetCare.cleanMess(this.id)}
 draw(c){c.save();c.fillStyle='rgba(151,120,37,.7)';c.fillRect(this.x-6,this.y-1,12,3);c.fillRect(this.x-4,this.y-2,8,5);c.fillStyle='rgba(236,207,84,.8)';c.fillRect(this.x-4,this.y-1,8,2);c.fillStyle='#fff1aa';c.fillRect(this.x-2,this.y-1,3,1);c.restore()}
}
(function(){
 const migrate=Pets.migrate.bind(Pets);Pets.migrate=function(S){const r=migrate(S);PetCare.ensure(S);for(const it of S.items)delete it._toilet;return r};
 const tick=Life.tick.bind(Life);Life.tick=function(dt){const r=tick(dt);PetCare.tick(dt);return r};
 const after=Pets.after.bind(Pets);Pets.after=function(p,ev){if(['play','pet','groom','care','fed','feed'].includes(ev)){PetCare.ensure();p.stress=Math.max(0,p.stress-3)}return after(p,ev)};
 // Relationships are persistent; weekly hidden behaviours are selected from that shared history.
 PetAI.relsOf=function(p){if(!p)return[];PetCare.ensure();const out=[];for(const q of Pets.home()){if(q.id===p.id)continue;const pair=PetCare.pair(p,q);const ids=pair.score>=65?['R02','R03','R10']:pair.score>=45?['R04','R07','R08']:['R11','R15','R20'];for(const r of ids)out.push({r,t:q.id})}return out};
 const update=Pet.prototype.update;Pet.prototype.update=function(dt){if(this.scuffle){const g=this.scuffle;if(g.a===this)g.t+=dt;if(g.t>=3){PetCare.endFight(g);return;}this.x=(g.a===this?g.ax:g.bx)+Math.sin(g.t*35+(g.a===this?0:Math.PI))*2;this.flip=g.a===this;return;}if(this.toiletToken&&(Date.now()-this.toiletStarted>25000||!Game.S.items.some(i=>i._toilet===this.pid))){for(const it of Game.S.items)if(it._toilet===this.pid)delete it._toilet;this.careLock=false;this.toiletToken=null;}if(this.careLock&&this.toiletToken){if(this.walking)Walker.prototype.step.call(this,dt);else if(this.state==='act')PetAI.update(this,dt);return;}return update.call(this,dt)};
 const draw=Pet.prototype.draw;Pet.prototype.draw=function(c){if(this.scuffle){const g=this.scuffle;c.save();c.fillStyle='#dcd6e8';for(let i=0;i<5;i++){const x=(g.ax+g.bx)/2+Math.sin(g.t*9+i)*9,y=(g.ay+g.by)/2-7+Math.cos(g.t*11+i)*4;c.fillRect(Math.round(x)-4,Math.round(y)-3,8,6);}c.fillStyle='#f6c75a';c.fillRect(Math.round(this.x),Math.round(this.y)-20,3,1);c.restore();return;}draw.call(this,c);const p=this.data;if(p&&p.injury){c.save();c.fillStyle=p.bandaged?'#fff4e0':'#d988a3';c.fillRect(Math.round(this.x)+(this.flip?-4:3),Math.round(this.y)-11,4,2);c.restore()}};
 const poke=Pet.prototype.poke;Pet.prototype.poke=function(){if(this.scuffle){PetCare.endFight(this.scuffle,true);return;}if(this.data&&this.data.injury){Pets.select(this.pid,'care');return;}return poke.call(this)};
 const why=Pets.why.bind(Pets);Pets.why=function(p,act){if(p&&p.injury&&['play','train'].includes(act))return p.name+'受傷了，先包紮休息';return why(p,act)};
 const interact=Game.interact.bind(Game);Game.interact=function(it){if(ITEMS[it.k]&&ITEMS[it.k].litter){PetCare.cleanBox(it.uid);return;}return interact(it)};
 const item=Room.drawItem.bind(Room);Room.drawItem=function(c,it){item(c,it);if(ITEMS[it.k].litter&&it.used){const cv=this.itemCanvas(it);c.fillStyle='#8b6a4a';for(let i=0;i<Math.min(5,it.used);i++)c.fillRect(it.x+9+i*3,it.y+cv.height-8+(i%2),2,1);}};
 const petUI=UI.w_pet.bind(UI);UI.w_pet=function(){const out=petUI();const p=Pets.sel();if(p&&this.petTab==='care')out.splice(4,0,PetCare.panel(p));return out};
 const rows=Mobile.rows.bind(Mobile);Mobile.rows=function(){const out=rows();if(Game.S.homeCare&&Game.S.homeCare.messes.length)out.unshift(h('button',{class:'mrow need',onclick:()=>{UI.petTab='care';UI.openWin('pet')}},ico('it_spray',26),h('span',{class:'mrow-t'},h('b',{text:'地上有尿漬，來清理一下'}))));return out};
})();
