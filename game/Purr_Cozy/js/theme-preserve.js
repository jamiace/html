/* A theme changes finishes, one window, one desk and one signature piece. */
const ThemeFit={
 signatures:{cozy:'plant_snake',seaside:'surfboard',forest:'fireplace',sakura:'chabudai',snow:'xmas_tree',studio:'vinyl_shelf',lantern_night:'moon_bunny',pumpkin_night:'pumpkin_glow',birthday_room:'balloon_bouquet',aurora_study:'aurora_panel',greenhouse:'plant_monstera',winter_party:'xmas_tree'},
 size(it){const a=PNGArt.meta.items[it.k];return a?.size||[20,20]},
 box(it){const[w,h]=this.size(it),d=ITEMS[it.k];return d.layer==='wall'?{x:it.x,y:it.y,w,h}:{x:it.x+2,y:it.y+h-7,w:Math.max(2,w-4),h:7}},
 overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y},
 blockers(it,ignore=new Set()){const d=ITEMS[it.k],box=this.box(it);return Game.S.items.filter(o=>o.uid!==it.uid&&!ignore.has(o.uid)&&o.p==null&&ITEMS[o.k].layer!=='rug'&&(d.layer==='wall'?ITEMS[o.k].layer==='wall':ITEMS[o.k].layer!=='wall')&&this.overlap(box,this.box(o)))},
 valid(it){const[w,h]=this.size(it);if(ITEMS[it.k].layer==='wall')return it.x>=30&&it.x+w<=210&&it.y>=14&&it.y+h<=94;const by=it.y+h;if(by<105||by>168)return false;const[a,b]=floorX(by);return it.x>=a+2&&it.x+w<=b-2},
 place(it,preferred,ignore=new Set()){const[w,h]=this.size(it),wall=ITEMS[it.k].layer==='wall',spots=[];for(let y=wall?14:Math.max(8,106-h);y<=(wall?94-h:168-h);y+=2)for(let x=wall?30:8;x<=232-w;x+=2){const s={...it,x,y};if(this.valid(s))spots.push(s)}if(this.valid({...it,x:preferred[0],y:preferred[1]}))spots.unshift({...it,x:preferred[0],y:preferred[1]});spots.sort((a,b)=>Math.hypot(a.x-preferred[0],a.y-preferred[1])-Math.hypot(b.x-preferred[0],b.y-preferred[1]));
  // Check every free location before considering displacement.
  let best=null;for(const s of spots){const hits=this.blockers(s,ignore);if(!hits.length){it.x=s.x;it.y=s.y;return []}const score=hits.reduce((n,o)=>n+(ITEMS[o.k].desk||ITEMS[o.k].window||ITEMS[o.k].bed?10:1),0);if(!best||score<best.score)best={s,hits,score}}
  if(!best)return null;it.x=best.s.x;it.y=best.s.y;return best.hits;
 },
 store(it){const S=Game.S;for(const child of S.items.filter(o=>o.p===it.uid))this.store(child);if(!S.items.includes(it))return;S.inv[it.k]=(S.inv[it.k]||0)+1;S.items=S.items.filter(o=>o!==it);for(const a of Room.actors||[])if(a.seat?.uid===it.uid||a.bed?.uid===it.uid)a.stand?.();},
 take(k){const inv=Game.S.inv;if(!(inv[k]>0))return false;if(--inv[k]<=0)delete inv[k];return true},
 choose(key){return key.split('|').find(k=>ITEMS[k]&&((Game.S.inv[k]||0)>0||Game.S.items.some(i=>i.k===k)))},
 replace(it,row,view){if(!it||!row)return;const S=Game.S,k=this.choose(row[0]);if(!k)return;if(k===it.k){if(ITEMS[k].window)it.view=view;return}if(!(S.inv[k]>0))return;
  const old={...it},[ow,oh]=this.size(it),[nw,nh]=this.size({k}),next={...it,k,x:it.x+(ow-nw)/2,y:ITEMS[k].layer==='wall'?it.y:it.y+oh-nh};if(ITEMS[k].window)next.view=view;else delete next.view;
  if(ITEMS[k].toggle)next.on=row[3]?.on!==false;else delete next.on;delete next.closed;delete next._toilet;delete next.used;delete next.broken;delete next.wilt;delete next.dust;
  const kids=S.items.filter(i=>i.p===it.uid),ignore=new Set(kids.map(i=>i.uid)),victims=this.place(next,[next.x,next.y],ignore);if(victims===null)return;
  this.take(k);S.inv[old.k]=(S.inv[old.k]||0)+1;for(const v of victims)this.store(v);Object.assign(it,next);for(const a of Room.actors||[])if(a.seat?.uid===it.uid||a.bed?.uid===it.uid)a.stand?.();
  const surface=ITEMS[k].surface;let cursor=surface?.x0||0;for(const child of kids){const[cw,ch]=this.size(child);if(!surface||cursor+cw-1>surface.x1){this.store(child);continue}child.dx=Math.max(surface.x0,Math.min(surface.x1-cw+1,child.dx??cursor));if(child.dx<cursor)child.dx=cursor;child.dy=surface.y-ch+1;child.x=it.x+child.dx;child.y=it.y+child.dy;cursor=child.dx+cw+1}
 },
 apply(id){const S=Game.S,th=THEMES[id];if(!th||!S.themes.includes(id))return false;S.wp=th.wp;S.fl=th.fl;
  const root=S.items.filter(i=>i.p==null),windowItem=root.find(i=>ITEMS[i.k].window),desk=root.find(i=>ITEMS[i.k].desk),find=flag=>th.layout.find(r=>r[0].split('|').some(k=>ITEMS[k]?.[flag]));
  this.replace(windowItem,find('window'),th.view);this.replace(desk,find('desk'));
  const signature=this.signatures[id],row=th.layout.find(r=>r[0].split('|').includes(signature));if(signature&&row&&!S.items.some(i=>i.k===signature)&&S.inv[signature]>0){const it={uid:S.nextUid,k:signature,x:row[1],y:row[2]};if(ITEMS[signature].toggle)it.on=row[3]?.on!==false;const victims=this.place(it,[row[1],row[2]]);if(victims!==null){for(const v of victims)this.store(v);this.take(signature);S.nextUid++;S.items.push(it)}}
  Room.state=S;Room.indexItems();Room.sel=null;Room.buildBg(S.wp,S.fl);Game.save();UI.refresh('storage');UI.refresh('shop');UI.hud(true);UI.toast(I18n.s('themeKept',[th.n]),'i_theme',4);return true;
 }
};
Game.applyTheme=function(id){return ThemeFit.apply(id)};
const themePurchase=Game.buyTheme.bind(Game);Game.buyTheme=function(id){const had=this.S.themes.includes(id);themePurchase(id);if(!had&&this.S.themes.includes(id))this.applyTheme(id)};
Game.applyView=function(id){this.S.view=id;for(const it of this.S.items)if(ITEMS[it.k].window)delete it.view;this.save();UI.refresh('storage')};
UI.w_themeask=function(){const id=this.themeAsk,th=THEMES[id];if(!th)return [];return [h('div',{class:'gift'},h('div',{class:'tpv big'},themePreview(id)),h('p',{class:'gift-t',text:th.n})),h('p',{class:'hint',text:I18n.s('themeKeepRules')}),h('button',{class:'chip primary',onclick:()=>{this.closeWin('themeask');Game.applyTheme(id)}},ico('i_theme',20),I18n.s('themeApplyKeep')),h('button',{class:'chip',onclick:()=>this.closeWin('themeask')},I18n.s('u_ecddc6cb858d'))]};
