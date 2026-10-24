/* Ambient light, side-wall placement, real room visits and concise UI. */
const WallMount = {
 cache:new WeakMap(),raw:Room.itemCanvas.bind(Room),
 side(it){return ITEMS[it.k]&&ITEMS[it.k].layer==='wall'&&!ITEMS[it.k].surface&&['left','right'].includes(it.wall)?it.wall:null},
 project(src,side){let map=this.cache.get(src);if(!map){map={};this.cache.set(src,map)}if(map[side])return map[side];const w=Math.max(8,Math.min(20,Math.round(src.width*.48))),pad=Math.ceil((w-1)*.45),cv=document.createElement('canvas');cv.width=w;cv.height=src.height+pad;const c=cv.getContext('2d');c.imageSmoothingEnabled=false;for(let x=0;x<w;x++){const sx=Math.min(src.width-1,Math.floor(x/w*src.width)),dy=Math.round((side==='left'?w-1-x:x)*.45);c.drawImage(src,sx,0,1,src.height,x,dy,1,src.height)}cv.alpha=c.getImageData(0,0,cv.width,cv.height).data;return map[side]=cv},
 set(it,side){if(!it||ITEMS[it.k].layer!=='wall'||ITEMS[it.k].surface)return;it.wall=side;if(side==='left'){it.x=7;it.y=38}else if(side==='right'){it.x=212;it.y=38}else{it.x=100;it.y=25}Room.clampItem(it);Room.indexItems();Game.save();UI.editToolbar()},
 buttons(it){return h('div',{class:'wall-mount-controls'},...[['left','左牆'],['back','後牆'],['right','右牆']].map(([id,label])=>h('button',{class:'chip sm'+((it.wall||'back')===id?' on':''),'aria-pressed':String((it.wall||'back')===id),onclick:()=>this.set(it,id)},label)))},
 toolbar(){const it=Room.sel;if(!Room.edit||!it||ITEMS[it.k].layer!=='wall'||ITEMS[it.k].surface)return;const host=Mobile.on?Mobile._edit&&Mobile._edit.querySelector('.medit-acts'):UI._tb;if(!host)return;host.querySelectorAll('.wall-mount-controls').forEach(e=>e.remove());host.append(this.buttons(it));},
};
const Visit = {
 active:null,returnState:null,marks:null,banner:null,helper:null,epoch:0,
 enter(V){if(!V||!V.d||V.loading||V.err)return;this.exit();if(Room.edit)UI.setEdit(false);if(PetPlay.held)PetPlay.drop();const own=Game.S;this.returnState={actors:Room.actors,sel:Room.sel,hover:Room.hover};this.active=V;this.epoch++;
   const d=V.d;Room.state=Object.assign({gifts:[],items:[]},d,{items:d.items.map(it=>Object.assign({},it))});Room.indexItems();Room.actors=(d.pets||[]).map(p=>new VisitCat(p));Room.actors.push(new VisitPerson(d.ava||defaultAvatar(),124,142,false));this.helper=new VisitPerson(own.avatar,115,164,true);Room.actors.push(this.helper);Room.sel=Room.hover=null;Room.buildBg(Room.state.wp,Room.state.fl);UI.closeWin('visit');UI.closeWin('friends');UI.bubbles.forEach(b=>b.el.remove());UI.bubbles=[];
   this.banner=h('div',{class:'visit-banner'},h('span',{text:V.name+'的小屋'}),h('button',{class:'chip sm',onclick:()=>this.exit()},'回自己家'));document.querySelector('.stage').prepend(this.banner);this.refreshMarks();UI.toast('點好友房間裡的泡泡幫忙','i_people',3);
 },
 exit(){if(!this.active)return;this.epoch++;this.active=null;if(this.banner)this.banner.remove();if(this.marks)this.marks.remove();this.banner=this.marks=null;Room.state=Game.S;Room.indexItems();Room.actors=this.returnState?this.returnState.actors:[];Room.sel=Room.hover=null;Room.buildBg(Game.S.wp,Game.S.fl);this.returnState=null;this.helper=null;UI.bubbles.forEach(b=>b.el.remove());UI.bubbles=[];},
 refreshMarks(){if(this.marks)this.marks.remove();if(!this.active)return;const V=this.active,d=V.d;this.marks=h('div',{class:'visit-room-marks'});
  for(const n of d.needs||[]){let x=120,y=120;if(n.pet!=null){const p=(d.pets||[]).find(p=>p.id===n.pet);if(!p)continue;x=p.x;y=p.y-22}else{const it=d.items.find(it=>it.uid===n.target);if(!it||!ITEMS[it.k])continue;x=it.x+Room.itemCanvas(it).width/2;y=it.y-6}const def=HELP_KINDS[NEED_HELP[n.type]];if(!def)continue;this.marks.append(h('button',{class:'vmark',style:`left:${Math.max(5,Math.min(95,x/RW*100))}%;top:${Math.max(10,Math.min(90,y/RH*100))}%;`,onclick:()=>Social.help(V.fid,n)},ico(def.icon,24),h('span',{text:def.n})));}
  UI.overlay.append(this.marks);
 },
 feedback(need){if(!this.active||!this.helper)return;const V=this.active,d=V.d,epoch=this.epoch;let x=120,y=150;if(need.pet!=null){const p=d.pets.find(p=>p.id===need.pet);if(p){x=p.x;y=p.y}}else{const it=d.items.find(it=>it.uid===need.target);if(it){x=it.x+Room.itemCanvas(it).width/2;y=it.y+Room.itemCanvas(it).height}}
  this.helper.walkTo(x+12,Math.min(166,Math.max(104,y+4)),()=>{if(epoch!==this.epoch)return;this.helper.careUntil=Room.t+2.2;for(let i=0;i<5;i++)Room.puff(need.pet!=null?'p_heart':'p_bubble',x+i*2-4,y-9,{vy:-8,max:1.4});Game.bubble(this.helper,need.pet!=null?'吃飽飽～':'照顧好了',2)});this.refreshMarks();
 },
};
class VisitCat {
 constructor(p){this.p=p;this.x=p.x;this.y=p.y;this.flip=!!p.flip}z(){return this.p.on&&Room.uidMap[this.p.on]?Room.base(Room.uidMap[this.p.on])+.03:this.y+.01}update(){}headPos(){return[this.x,this.y-16]}hit(x,y){return Math.abs(x-this.x)<10&&y<this.y&&y>this.y-20}poke(){Game.bubble(this,this.p.name+'：喵～',2)}
 draw(c){const [kind,color]=this.p.sp.split(':'),cv=petCanvas(kind,color,this.p.sleep?'sleep':'sit',Math.floor(Room.t*.9)%2,this.flip,this.p.acc);c.drawImage(cv,Math.round(this.x)-Math.floor(cv.width/2),Math.round(this.y)-canvasBottom(cv))}
}
class VisitPerson extends Walker{
 constructor(cfg,x,y,helper){super();this.cfg=cfg;this.x=x;this.y=y;this.helper=helper;this.speed=30;this.careUntil=0}z(){return this.y}update(dt){this.step(dt)}headPos(){return[this.x,this.y-30]}hit(x,y){return Math.abs(x-this.x)<9&&y<this.y&&y>this.y-30}poke(){Game.bubble(this,this.helper?'來幫忙了':'歡迎來坐坐',2)}
 draw(c){const frame=this.walking?'side'+(Math.floor(this.anim*8)%4):Room.t<this.careUntil?'type0':'front0',cv=avatarCanvas(frame,this.cfg,null,0,this.walking&&this.flip);c.drawImage(cv,Math.round(this.x)-10,Math.round(this.y)-canvasBottom(cv))}
}
(function(){
 const create=Game.newState.bind(Game);Game.newState=function(){const S=create();S.settings.ambient=60;S.settings.ambientColor='warm';S.settings.weatherMode='manual';S.settings.weather=S.settings.rain?'rain':'clear';return S};
 const env=Room.computeEnv.bind(Room);Room.computeEnv=function(st){env(st);const a=Number.isFinite(+st.ambient)?Math.max(0,Math.min(100,+st.ambient)):60;this.env.naturalDark=this.env.dark;this.env.dark*=1-a/100*.8};
 const lights=Room.collectLights.bind(Room);Room.collectLights=function(){const out=lights(),st=Game.S&&Game.S.settings;if(st&&Room.state===Game.S){const amount=Number.isFinite(+st.ambient)?+st.ambient:60;if(amount>0){const col=['warm','cool','pink'].includes(st.ambientColor)?st.ambientColor:'warm';out.push({x:120,y:86,r:225,col,k:amount/100*.45*Lights.lamp})}}
  return out;
 };
 const src=Room.itemCanvas.bind(Room);Room.itemCanvas=function(it){const cv=src(it),side=WallMount.side(it);return side?WallMount.project(cv,side):cv};
 const clamp=Room.clampItem.bind(Room);Room.clampItem=function(it){const def=ITEMS[it.k];if(def.layer!=='wall'||def.surface)return clamp(it);if(this.drag&&this.drag.it===it){it.wall=it.x<23?'left':it.x>206?'right':'back'}const side=WallMount.side(it);if(!side)return clamp(it);const cv=this.itemCanvas(it);it.x=side==='left'?Math.max(7,Math.min(29-cv.width,it.x)):Math.max(211,Math.min(233-cv.width,it.x));const bottom=side==='left'?96+(30-it.x-cv.width)*74/24:96+(it.x-210)*74/24;it.y=Math.max(14,Math.min(bottom-cv.height-2,it.y));};
 const draw=Room.drawItem.bind(Room);let scratch=null;Room.drawItem=function(c,it){const side=WallMount.side(it);if(!side)return draw(c,it);const orig=WallMount.raw(Object.assign({},it,{wall:'back'})),w=Math.max(8,Math.min(20,Math.round(orig.width*.48)));if(!scratch)scratch=document.createElement('canvas');scratch.width=orig.width;scratch.height=orig.height;const sc=scratch.getContext('2d');sc.imageSmoothingEnabled=false;draw(sc,Object.assign({},it,{wall:'back',x:0,y:0}));
  for(let x=0;x<w;x++){const sx=Math.min(orig.width-1,Math.floor(x/w*orig.width)),dy=Math.round((side==='left'?w-1-x:x)*.45);c.drawImage(scratch,sx,0,1,orig.height,Math.round(it.x)+x,Math.round(it.y)+dy,1,orig.height)}
 };
 // Move wall light sources with their projected sprites too.
 const lit=Room.collectLights.bind(Room);Room.collectLights=function(){const out=lit();for(const it of this.state.items){const d=ITEMS[it.k],side=WallMount.side(it);if(!side||!d.light)continue;const raw=WallMount.raw(it),cv=this.itemCanvas(it),oldX=it.x+(it.flip?cv.width-1-d.light.x:d.light.x);const l=out.find(l=>Math.abs(l.x-oldX)<.01&&Math.abs(l.y-(it.y+d.light.y))<.01);if(l){const x=(it.flip?raw.width-1-d.light.x:d.light.x)/raw.width*cv.width;l.x=it.x+x;l.y=it.y+d.light.y+(side==='left'?cv.width-x:x)*.45;}}
  return out;
 };
 const toolbar=UI.editToolbar.bind(UI);UI.editToolbar=function(){const r=toolbar(...arguments);WallMount.toolbar();return r};const edit=Mobile.renderEdit.bind(Mobile);Mobile.renderEdit=function(){const r=edit();WallMount.toolbar();return r};
 const nav=Mobile.measureNav.bind(Mobile);Mobile.measureNav=function(){if(this.on&&Room.edit&&this._edit){document.documentElement.style.setProperty('--mobile-nav-height',Math.ceil(this._edit.getBoundingClientRect().height)+'px')}else nav()};
 const place=Game.place.bind(Game);Game.place=function(id){if(Visit.active)return UI.toast('回自己家再佈置吧','i_people',3);return place(id)};
 const replace=Game.replaceState.bind(Game);Game.replaceState=function(S){Visit.exit();PetCare.ownerBusy=false;return replace(S)};
 const setEdit=UI.setEdit.bind(UI);UI.setEdit=function(on){if(on&&Visit.active)return UI.toast('這是好友的小屋，回家再佈置吧','i_people',3);return setEdit(on)};
 const oldSettings=UI.w_settings.bind(UI);UI.w_settings=function(){const out=oldSettings(),st=Game.S.settings;const range=h('input',{type:'range',min:'0',max:'100',step:'5',value:String(st.ambient??60),'aria-label':'室內環境燈亮度',oninput:e=>{st.ambient=+e.target.value;Room.computeEnv(st);const n=e.target.parentNode.querySelector('output');if(n)n.textContent=e.target.value+'%';},onchange:()=>Game.save()});out.unshift(h('section',{class:'settings-card ambient-card'},h('b',{text:'室內環境燈'}),h('p',{class:'hint',text:'黃昏與夜晚留點亮度，說晚安時會一起關掉。'}),h('label',{class:'ambient-range'},h('span',{text:'亮度'}),range,h('output',{text:(st.ambient??60)+'%'})),h('div',{class:'row wrap'},...[["warm","暖黃"],["cool","月白"],["pink","玫瑰"]].map(([id,label])=>h('button',{class:'chip'+((st.ambientColor||'warm')===id?' on':''),onclick:()=>{st.ambientColor=id;Game.save();UI.refresh('settings')}},label)))));return out};
 // Snapshots preserve wall mounting and perch positions for visitors.
 const preview=Social.roomPreview.bind(Social);Social.roomPreview=function(){const r=preview();for(const it of r.items){const original=Game.S.items.find(x=>x.uid===it.uid);if(original&&original.wall)it.wall=original.wall}return r};
 const snap=Social.snapData.bind(Social);Social.snapData=function(){const r=snap();for(const p of r.pets){const a=Game.pets.find(a=>a.pid===p.id);if(a&&a.on)p.on=a.on.uid}return r};
 Social.visit=async function(fid){
   if(!this.ready())return UI.toast('登入後就能拜訪好友','i_people',3);
   if(this.rel(fid)!=='ok')return UI.toast('先加為好友吧','i_people',3);
   Visit.exit();const epoch=++Visit.epoch;Visit.loading=true;
   this.visitSt={fid,name:this.friendName(fid),loading:true};UI.openWin('visit');
   try{const r=await this.db().get('rooms/'+fid);if(epoch!==Visit.epoch)return;
     if(!r){Visit.loading=false;this.visitSt={fid,name:this.friendName(fid),empty:true};UI.refresh('visit');return;}
     const d=JSON.parse(r.data);if(!Array.isArray(d.items))throw Error('房間資料不完整');d.items=d.items.filter(it=>ITEMS[it.k]);d.pets=d.pets||[];d.needs=d.needs||[];
     this.visitSt={fid,name:r.name||this.friendName(fid),d,at:r.at};Visit.loading=false;
     for(const g of this.Z.guest||[])if(g.uid===fid)g.back=true;
     Game.save();Visit.enter(this.visitSt);
   }catch(e){if(epoch!==Visit.epoch)return;Visit.loading=false;this.visitSt={fid,name:this.friendName(fid),err:cloudErr(e)};UI.refresh('visit');}
 };
 const close=UI.closeWin.bind(UI);UI.closeWin=function(id){if(id==='visit'&&Visit.loading){Visit.loading=false;Visit.epoch++;}return close(id)};
 const snapshot=Social.snapshot.bind(Social);Social.snapshot=function(force){if(Visit.active)return Promise.resolve();return snapshot(force)};
 const can=Social.canHelp.bind(Social);Social.canHelp=function(fid,need){if(!Visit.active||Visit.active.fid!==fid)return '先拜訪好友的小屋，再點房間裡的泡泡';if(!(Visit.active.d.needs||[]).some(n=>n.k===need.k&&n.type===need.type))return '這件事已經處理好了';return can(fid,need)};
 const help=Social.doHelp.bind(Social);Social.doHelp=async function(o){if(this._helpBusy)return;this._helpBusy=true;const count=this.helpsToday();try{await help(o);if(this.helpsToday()>count&&Visit.active&&Visit.active.fid===o.fid)Visit.feedback(o.need)}finally{this._helpBusy=false}};
 // Interactions on the main canvas belong to the visited room while away.
 window.addEventListener('load',()=>{const cv=document.getElementById('room');let down=null;cv.addEventListener('pointerdown',e=>{if(!Visit.active)return;const r=cv.getBoundingClientRect();down=[(e.clientX-r.left)/r.width*RW,(e.clientY-r.top)/r.height*RH];e.stopImmediatePropagation()},true);cv.addEventListener('pointerup',e=>{if(!Visit.active)return;e.stopImmediatePropagation();const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*RW,y=(e.clientY-r.top)/r.height*RH;if(down&&Math.hypot(x-down[0],y-down[1])<4){const hit=Room.hit(x,y);if(hit&&hit.kind==='actor')hit.a.poke();}down=null},true)});
})();

// Theme lists stay available on demand rather than taking over each card.
(function(){const render=UI.render.bind(UI);UI.render=function(id){const r=render(id),w=this.wins[id];if(w)for(const text of w.body.querySelectorAll('.tinc')){if(text.parentNode.classList.contains('theme-includes'))continue;const n=text.textContent.replace(/^含 /,'').split('、').length,details=h('details',{class:'theme-includes'},h('summary',{text:'包含 '+n+' 款家具'}));text.replaceWith(details);details.append(text);}return r};})();

Feel.openPlane = function () { const p=this.plane; if(!p)return; this.plane=null; this.hideTag(); return Social.visit(p.fid); };
