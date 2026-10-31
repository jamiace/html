/* Occupied furniture layers and persistent household marks. PNGs remain the artwork source. */
const FurnitureLayers={
 asset(it){return PNGArt.meta.items[it.k]},
 data(it){return ITEMS[it.k]?.actorLayers||this.asset(it)?.actorLayers},
 back(it){if(!ITEMS[it.k]?.chair||!Number.isFinite(it.x)||!Number.isFinite(it.y))return false;if(it.uid!=null&&Room.actors?.some(a=>a.seat?.uid===it.uid&&a.state==='work'))return true;const a=this.asset(it),x=it.x+a.size[0]/2;return(Room.state?.items||[]).some(other=>{if(!ITEMS[other.k]?.desk||other.p!=null)return false;const s=this.asset(other).size;return Math.abs(x-other.x-s[0]/2)<=Math.max(6,s[0]*.38)&&it.y>=other.y-2&&it.y<=other.y+s[1]+14})},
 seatPosition(it){const d=ITEMS[it.k],a=this.asset(it);if(d.chair&&this.back(it))return[it.x+a.size[0]/2,it.y-15];const p=d.seat||this.data(it)?.anchors.sit;if(!p)return[it.x+a.size[0]/2,it.y-15];return[it.x+(it.flip?a.size[0]-1-p.x:p.x),it.y+p.y-22]},
 image(it,key){const rel=this.asset(it)?.layers?.[key];if(!rel)return null;const cv=PNGArt.image(rel);return it.flip?PNGArt.flip(cv):cv},
 front(c,it,key){if(it.fallen)return;const cv=this.image(it,key);if(cv)c.drawImage(cv,Math.round(it.x),Math.round(it.y));if(it.soiled&&typeof HouseholdCare!=='undefined')HouseholdCare.drawItemStain(c,it)},
 desk(chair){const a=this.asset(chair),cx=chair.x+a.size[0]/2;return(Room.state.items||[]).filter(it=>{const d=ITEMS[it.k],s=this.asset(it)?.size;return d?.desk&&s&&Math.abs(it.x+s[0]/2-cx)<=Math.max(8,s[0]*.45)&&chair.y>=it.y-2&&chair.y<=it.y+s[1]+14}).sort((x,y)=>Math.abs(x.y-chair.y)-Math.abs(y.y-chair.y))[0]},
 drawAvatar(c,a){
  if(a.state==='sleep'&&a.bed&&Room.uidMap[a.bed.uid]){const it=a.bed,b=ITEMS[it.k].bed,asset=this.asset(it);if(typeof b!=='object')return false;const px=it.flip?asset.size[0]-1-b.x:b.x,head=sleepHeadCanvas(a.cfg),bob=Math.sin(Room.t*1.5)>.6?1:0;c.drawImage(head,Math.round(it.x+px-10),Math.round(it.y+b.y-8-AVA_TOP+bob));this.front(c,it,'sleep_foreground');return true}
  if(!['work','sit'].includes(a.state)||!a.seat||!Room.uidMap[a.seat.uid])return false;
  const it=a.seat,d=ITEMS[it.k],back=d.chair&&this.back(it),[sx,sy]=this.seatPosition(it),reading=!d.chair&&a.idle?.stage==='on'&&a.idle.prop==='book';let frame=reading?'sitread':'sit0',bob=reading?0:Math.floor(Room.t*1.1)%2;
  if(back){frame=a.stretchT>0?'stretch':Math.floor(Room.t*4)%2?'type1':'type0';bob=a.stretchT>0?0:Math.floor(Room.t*1.2)%2}
  const cv=avatarCanvas(frame,a.cfg,back?null:a.eyeState(),bob),dx=Math.round(sx-(frame==='stretch'?12:10)),dy=Math.round(sy)-AVA_TOP-(frame==='stretch'&&a.stretchT<1.6&&a.stretchT>.6?1:0);c.drawImage(cv,dx,dy);
  if(reading&&typeof OwnerIdle!=='undefined')OwnerIdle.drawProp(c,a,a.idle,cv,dx,dy,a.idle.t);
  if(back){const desk=this.desk(it);if(desk)this.front(c,desk,'work_foreground')}
  this.front(c,it,back?'seated_foreground_back':'seated_foreground_front');if(back&&a.state==='work'&&Math.random()<.01)Room.puff('p_note',sx+6,sy+2,{vx:4,vy:-7,max:1.6,alpha:.7});return true
 },
 petFront(c,a){const it=a.on||a.climbItem;if(!it||a.jump||a.toiletScene||it.fallen||!Room.uidMap[it.uid])return;const list=this.data(it)?.petFront;if(!list?.length)return;const localY=a.onOff?.[1]??a.y-it.y,layer=list.slice().sort((x,y)=>Math.abs(x.point.y-localY)-Math.abs(y.point.y-localY))[0];const im=PNGArt.image(layer.image);c.drawImage(it.flip?PNGArt.flip(im):im,Math.round(it.x),Math.round(it.y))},
};
ChairViews.back=it=>FurnitureLayers.back(it);
const layeredItemCanvas=Room.itemCanvas.bind(Room);Room.itemCanvas=function(it){const a=FurnitureLayers.asset(it);if(a?.back&&ITEMS[it.k]?.chair&&!it.fallen&&!it.wilt&&FurnitureLayers.back(it)){const cv=PNGArt.image(a.back);return it.flip?PNGArt.flip(cv):cv}return layeredItemCanvas(it)};
const layeredAvatarDraw=Avatar.prototype.draw;Avatar.prototype.draw=function(c){if(!FurnitureLayers.drawAvatar(c,this))return layeredAvatarDraw.call(this,c)};
const layeredSeatPos=Avatar.prototype.seatPos;Avatar.prototype.seatPos=function(){if(this.seat&&FurnitureLayers.data(this.seat))return FurnitureLayers.seatPosition(this.seat);return layeredSeatPos.call(this)};
ActorVisibility.seated=function(a,it){const [sx,sy]=FurnitureLayers.seatPosition(it),cv=avatarCanvas(ITEMS[it.k].chair&&FurnitureLayers.back(it)?'type0':'sit0',a.cfg,null,0);return{cv,left:Math.round(sx-10),top:Math.round(sy)-AVA_TOP,z:Room.base(it)+.02,own:it}};
ActorVisibility.inBed=function(a,it){const b=ITEMS[it.k].bed,asset=FurnitureLayers.asset(it),cv=sleepHeadCanvas(a.cfg),px=it.flip?asset.size[0]-1-b.x:b.x;return{cv,left:Math.round(it.x+px-10),top:Math.round(it.y+b.y-8-AVA_TOP),z:Room.base(it)+.02,own:it}};
const layeredPetDraw=Pet.prototype.draw;Pet.prototype.draw=function(c){const result=layeredPetDraw.call(this,c);if(!this.scuffle)FurnitureLayers.petFront(c,this);return result};
const layeredToilet=PetCare.drawToilet.bind(PetCare);PetCare.drawToilet=function(c,a){const s=a.toiletScene;if(!s)return false;if(s.phase==='enter'||s.phase==='leave')return layeredToilet(c,a);const it=s.box,[w,h]=itemSize(it),cv=Cozy.action(a,s.phase==='squat'?'squat':'dig',Math.floor(s.t*10)%8);if(!cv)return layeredToilet(c,a);c.save();if(it.k!=='litter_tray'){const clip=FurnitureLayers.data(it)?.anchors.toilet.clip||{x:Math.max(2,Math.round(w*.17)),y:Math.max(2,Math.round(h*.23)),w:Math.max(6,Math.round(w*.66)),h:Math.max(6,Math.round(h*.77))};c.beginPath();c.rect(it.x+clip.x,it.y+clip.y,clip.w,clip.h);c.clip()}c.drawImage(cv,it.x+w/2-14,it.y+h-35);c.restore();FurnitureLayers.front(c,it,'toilet_foreground');return true};
const layeredInteract=Game.interact.bind(Game);Game.interact=function(it){const d=ITEMS[it.k];if(Room.state===this.S&&!Room.edit&&!it.soiled&&!it.fallen&&d?.interactionUI)return UI.openWin(d.interactionUI);return layeredInteract(it)};

const HouseholdCare={
 rawAccident:PetCare.accident.bind(PetCare),
 drawItemStain(c,it,cv=Room.itemCanvas(it)){const d=ITEMS[it.k],im=PNGArt.image(PNGArt.meta.catEffects?.urine||'assets/png/actions/effect_urine.png'),p=d.bed?{x:d.bed.x,y:d.bed.blanketY+3}:d.seat||d.petSpot||{x:cv.width/2,y:cv.height-5},w=Math.max(7,Math.min(im.width,Math.round(cv.width*.65))),h=Math.max(3,Math.round(w*im.height/im.width)),x=it.x+Math.max(0,Math.min(cv.width-w,p.x-w/2)),y=it.y+Math.max(0,Math.min(cv.height-h,p.y));c.save();c.imageSmoothingEnabled=false;c.drawImage(im,0,0,im.width,im.height,Math.round(x),Math.round(y),w,h);c.restore()},
 finish(a,token){if(a.cozyEvent!==token)return;a.cozyEvent=null;a.cozyPose=null;a.careLock=false;if(a.state==='act'||a.state==='walk'){a.state='sit';a.timer=3}},
 floorAccident(a){if(!Cozy.active()||!PetCare.canAct(a))return false;PetCare.ensure();if(Game.S.homeCare.messes.length+Game.S.items.filter(it=>it.soiled||it.fallen).length>=3)return false;
  const state=Game.S,token={floorUrine:true};a.cozyEvent=token;a.careLock=true;const perform=()=>{if(Game.S!==state||Room.state!==state||Room.edit||a.cozyEvent!==token){this.finish(a,token);return}a.state='act';a.cozyPose={name:'squat',until:Room.t+2};setTimeout(()=>{if(Game.S===state&&Room.state===state&&!Room.edit&&a.cozyEvent===token){this.rawAccident(a);state.homeCare.messUpdatedAt=Date.now();Game.save()}this.finish(a,token)},1600)};
  const clear=(x,y)=>!state.items.some(it=>{const d=ITEMS[it.k];if(d.layer==='wall'||d.layer==='rug'||it.p!=null)return false;const cv=Room.itemCanvas(it);return x>it.x-8&&x<it.x+cv.width+8&&y>it.y-2&&y<it.y+cv.height+5});
  const pos=ActorVisibility.find(a,a.x,a.y,{pose:'sit',clear});if(!pos){this.finish(a,token);return false}if(Math.hypot(pos[0]-a.x,pos[1]-a.y)>3){a.state='walk';if(a.walkTo(pos[0],pos[1],perform,true)===false){this.finish(a,token);return false}}else perform();setTimeout(()=>this.finish(a,token),20000);return true
 },
};
PetCare.accident=a=>HouseholdCare.floorAccident(a);
const syncFloorMarks=PetCare.syncMesses.bind(PetCare);PetCare.syncMesses=function(){if(Room.state!==Game.S){Room.actors=Room.actors.filter(a=>!a.isMess);return}return syncFloorMarks()};
CatMess.prototype.draw=function(c){const im=PNGArt.image(PNGArt.meta.catEffects?.urine||'assets/png/actions/effect_urine.png');c.drawImage(im,Math.round(this.x)-Math.floor(im.width/2),Math.round(this.y)-Math.floor(im.height/2))};
CatMess.prototype.z=function(){return this.y-2.1};
CatMess.prototype.hit=function(x,y){return Math.abs(x-this.x)<=17&&Math.abs(y-this.y)<=8};
