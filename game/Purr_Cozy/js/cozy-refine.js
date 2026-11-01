/* 0.92.27: household hygiene and reachable spills. (Tabletop games moved to minigame-*.js in 0.92.29.) */
const CozyRefine={
 t(k){return I18n.t('refine.'+k)},
 dirt(S=Game.S){return Math.min(4,(S.homeCare?.messes?.length||0)+S.items.filter(it=>it.soiled).length+S.items.filter(it=>ITEMS[it.k]?.litter&&(it.used||0)>=(ITEMS[it.k].capacity||3)).length)},
 spill(it){const im=PNGArt.image('assets/png/actions/effect_spill.png'),cv=Room.itemCanvas(it);return{x:it.x+cv.width/2-16,y:it.y+cv.height-5,w:im.width,h:im.height}},
};
// Extend the hit area to the visible spill; respect nearer actors/items at that pixel.
const refineHit=Room.hit.bind(Room);Room.hit=function(x,y,opts={}){const normal=refineHit(x,y,opts);if(Room.edit||Room.state!==Game.S||opts.itemsOnly||normal?.kind==='actor'&&!normal.a.isMess)return normal;if(normal?.kind==='item'&&(normal.it.fallen||ITEMS[normal.it.k]?.layer!=='rug'))return normal;for(const it of Game.S.items.slice().reverse()){if(!it.fallen)continue;const b=CozyRefine.spill(it);if(x>=b.x-2&&x<b.x+b.w+2&&y>=b.y-2&&y<b.y+b.h+2)return{kind:'item',it}}return normal};
// Scale the existing decay rather than bypassing offline floors and illness rules.
const refinePetsTick=Pets.tick.bind(Pets);Pets.tick=function(mins){const dirt=CozyRefine.dirt(),snap=new Map(this.Z.pets.map(p=>[p,{clean:p.clean,mood:p.mood}]));const result=refinePetsTick(mins);if(!dirt)return result;const factor=1+Math.min(1.5,dirt*.4);for(const p of this.Z.pets){if(!p.home)continue;const old=snap.get(p);if(!old)continue;for(const key of ['clean','mood']){const loss=Math.max(0,old[key]-p[key]);p[key]=clamp100(p[key]-loss*(factor-1));if(mins>2)p[key]=Math.max(Math.min(old[key],15),p[key])}p.stress=clamp100((p.stress||0)+Math.min(mins,120)*dirt*.08)}return result};
CozyDevice.position=function(){if(this.button){this.button.remove();this.button=null}};
CozyDevice.power=function(it,on){if(Room.state!==Game.S||!it||!Game.S.items.includes(it)||!ITEMS[it.k]?.powerDevice)return;it.on=!!on;this.uid=it.uid;Game.save();UI.refresh('device');this.position()};
// Canonical item PNGs drive both shop previews and room rendering.
const refineItemCanvas=Room.itemCanvas.bind(Room);Room.itemCanvas=function(it){const a=PNGArt.meta.items[it.k];if(a?.wallViews){const side=WallMount.side(it),p=(side?a.wallViews.side:a.wallViews.front)[it.on?'on':'off'],cv=PNGArt.image(p);return(side==='right'||!side&&it.flip)?PNGArt.flip(cv):cv}if(it.on&&!it.fallen&&!it.broken&&a?.channels?.length){const cv=PNGArt.image(a.channels[(it.channel||0)%a.channels.length]);return it.flip?PNGArt.flip(cv):cv}return refineItemCanvas(it)};
const refineDraw=Room.drawItem.bind(Room);Room.drawItem=function(c,it){if(!PNGArt.meta.items[it.k]?.wallViews)return refineDraw(c,it);const cv=this.itemCanvas(it);c.drawImage(cv,Math.round(it.x),Math.round(it.y));if(it.dust)Life.drawDust(c,it,it.x,it.y,cv)};
const refineLights=Room.collectLights.bind(Room);Room.collectLights=function(){const out=refineLights();for(const it of this.state.items){if(!PNGArt.meta.items[it.k]?.wallViews||!WallMount.side(it)||!it.on||it.broken)continue;const d=ITEMS[it.k],cv=this.itemCanvas(it),raw=WallMount.raw(it),side=WallMount.side(it),pos=WallMount.geometry(raw,side,it).point(it.flip?raw.width-1-d.light.x:d.light.x,d.light.y),old=out.find(l=>Math.abs(l.x-it.x-pos[0])<.01&&Math.abs(l.y-it.y-pos[1])<.01);if(old){old.x=it.x+(side==='left'?cv.width-4:3);old.y=it.y+15}}return out};

// 0.92.29: the tabletop games (TablePhysics) moved to js/minigame-*.js; their entry is wired in js/minigame-wiring.js.
