/* Furniture-aware little scenes. Player care, hunger and climb rests take precedence. */
const CatScenes = {
 defs:[],
 items(match){return Room.state.items.filter(it=>it.p==null&&match(ITEMS[it.k],it))},
 say(a,text){if(Room.t-(a.sceneSaidAt||-100)>35&&Math.random()<.35){a.sceneSaidAt=Room.t;Game.bubble(a,text,1.8)}},
 run(a,id,it,fn){if(!PetCare.canAct(a))return false;a.sceneHistory=a.sceneHistory||[];a.sceneHistory.push(id);a.sceneHistory=a.sceneHistory.slice(-3);a.sceneNext=Room.t+18+Math.random()*20;const [w,h]=itemSize(it),x=it.x+w/2,y=Math.min(165,Math.max(105,it.y+h+3));a.state='walk';a.walkTo(x+(Math.random()<.5?-7:7),y,()=>{if(!Room.uidMap[it.uid]){a.state='sit';a.timer=3;return;}a.flip=it.x+w/2<a.x;fn(a,it)});return true;},
 pause(a,pose,seconds,next){PetAI.act(a,pose,seconds,()=>{a.state='sit';a.timer=3;if(next)next()})},
 choose(a){const p=a.data;if(!p||p.injury||p.hunger<35||p.energy<25||p.bladder>=85||!PetCare.canAct(a)||Room.state!==Game.S||Lights.mode!=='on'||Room.edit||a.sceneNext>Room.t)return false;
   const options=[];for(const def of this.defs){if((a.sceneHistory||[]).includes(def.id))continue;const items=this.items(def.match);if(!items.length)continue;const weight=def.weight?def.weight(a):1;for(let i=0;i<weight;i++)options.push({def,it:items[Math.floor(Math.random()*items.length)]});}
   if(!options.length){a.sceneHistory=[];return false;}const {def,it}=options[Math.floor(Math.random()*options.length)];return this.run(a,def.id,it,def.act);
 },
 friend(a){const ready=c=>PetCare.canAct(c)&&!c.data.injury&&c.data.hunger>=35&&c.data.energy>=25&&c.data.bladder<85;if(!ready(a)||a.sceneNext>Room.t)return false;const b=a.others().find(b=>ready(b)&&PetCare.pair(a.data,b.data).score>=65&&Date.now()-(PetCare.pair(a.data,b.data).lastFriendly||0)>90000&&PetAI.dist(a,b)<70);if(!b)return false;
   const r=PetCare.pair(a.data,b.data);r.lastFriendly=Date.now();a.sceneNext=Room.t+35;a.state='walk';a.walkTo(b.x+(b.x>120?-13:13),b.y,()=>{if(!PetCare.canAct(b)){a.state='sit';a.timer=4;return;}PetCare.changePair(a.data,b.data,.6);a.data.stress=Math.max(0,a.data.stress-2);b.data.stress=Math.max(0,b.data.stress-2);this.pause(a,'groom',4);this.pause(b,'look',4);Room.puff('p_heart',(a.x+b.x)/2,a.y-18,{vy:-5,max:1.5});});return true;
 },
};
(function(){
 const C=CatScenes,def=(id,match,act,weight)=>C.defs.push({id,match,act,weight});
 def('window_watch',d=>!!d.window,(a,it)=>{C.pause(a,'look',7,()=>C.pause(a,'beg',1.6,()=>C.pause(a,'look',5)));C.say(a,Room.env.rain?I18n.s("u_194e49cd88e6"):I18n.s("u_692cf7299412"))},a=>Room.env.rain||PetAI.has(a,'H12')?3:1);
 def('warm_nap',(d,it)=>!!d.light&&(!d.toggle||it.on),(a,it)=>{C.pause(a,'stretch',2,()=>{a.state='sleep';a.timer=24+Math.random()*16;PetAI.sleepSpin(a)});C.say(a,I18n.s("u_348a8af6faff"))},a=>PetAI.has(a,'H13')?3:1);
 def('rug_knead',d=>d.layer==='rug',(a,it)=>{C.pause(a,'knead',5,()=>{a.state='sleep';a.timer=22;PetAI.sleepSpin(a)});C.say(a,I18n.s("u_12bddeacb27c"))},a=>PetAI.has(a,'H09')?3:1);
 def('leaf_sniff',d=>!!d.react&&d.react==='rustle',(a,it)=>{C.pause(a,'look',3,()=>{it.shake=.4;C.pause(a,'beg',2,()=>C.pause(a,'groom',3))});C.say(a,I18n.s("u_3a93302a4199"))});
 def('gift_ribbon',(d,it)=>/gift_tower|yarn_basket/.test(it.k),(a,it)=>{C.pause(a,'look',2,()=>{it.shake=.5;C.pause(a,'scratch',3,()=>C.pause(a,'look',4))});C.say(a,I18n.s("u_da14bec663ae"))});
 def('balloon_reach',(d,it)=>it.k==='balloon_bouquet',(a,it)=>{C.pause(a,'look',4,()=>C.pause(a,'beg',2,()=>{it.shake=.5;C.pause(a,'stare',4)}));C.say(a,I18n.s("u_6d24d8425684"))});
 def('desk_inspect',d=>!!d.desk,(a,it)=>{C.pause(a,'look',4,()=>C.pause(a,'groom',3,()=>C.pause(a,'lie',8)));C.say(a,Game.focusing()?I18n.s("u_6c12cbc69aff"):I18n.s("u_42322a691106"))},a=>PetAI.has(a,'H14')?3:1);
 def('litter_inspect',d=>!!d.litter,(a,it)=>{C.pause(a,'look',3,()=>C.pause(a,'knead',2));C.say(a,it.used?I18n.s("u_17b4685a2334"):I18n.s("u_615571e818d1"))});
 def('clock_listen',d=>!!d.clock||d.id==='constellation_clock',(a,it)=>{C.pause(a,'look',5,()=>{a.flip=!a.flip;C.pause(a,'stare',3)});C.say(a,I18n.s("u_ac2417a9a24d"))});
 def('music_sway',d=>!!d.music,(a,it)=>{C.pause(a,'look',4,()=>C.pause(a,'stretch',2,()=>C.pause(a,'lie',7)));if(Music.playing)Room.puff('p_note',a.x+5,a.y-18,{vy:-5});C.say(a,I18n.s("u_f612dd506789"))},()=>Music.playing?3:0);
 const think=Pet.prototype.think;Pet.prototype.think=function(){if(this.careLock)return;if(Room.state===Game.S&&Lights.mode==='on'&&!Room.edit&&Math.random()<.5){if(Math.random()<.3&&CatScenes.friend(this))return;if(CatScenes.choose(this))return;}return think.call(this)};
 const load=Game.load.bind(Game);Game.load=function(snapshot){const r=load(snapshot);if(this.S.gates){for(const g of [this.S.gates.owner,...Object.values(this.S.gates.pets||{})])if(g&&g.attempt){g.retryAt=Math.max(g.retryAt||0,g.attempt.at+LevelGate.cooldown);g.attempt=null;g.passed=false;}}return r};
})();
