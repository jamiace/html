/* 0.92.29 Purr Cozy mini games: host wiring. Load after cozy-refine.js / furniture-motion.js and before main.js.
   - cozyGame 'pinball' | 'toss' | 'maze'  -> MiniTable (window `cozygame`)
   - cozyGame 'instrument' (cozy_piano_1..5) and interactionProfile 'instrument' (fun_piano, guitars, music box, chime)
     -> FurnPlay window with the shared MiniInstrument panel
   Item IDs, cozyGame / interactionProfile values and Game.S fields are unchanged. The old TablePhysics block
   (cozy-refine.js) and the legacy CozyGames pinball/toss/maze/instrument branches (cozy-update.js) were removed. */
(function(){
 UI.WIN.cozygame.w=Math.max(UI.WIN.cozygame.w||380,400);
 const legacyOpen=CozyGames.open.bind(CozyGames);
 CozyGames.open=function(it,mode){
  if(MiniTable.games[mode]){this.session=null;cancelAnimationFrame(this.raf);return MiniTable.open(it,mode)}
  MiniTable.close();
  if(mode==='instrument'){if(UI.wins.cozygame&&!UI.wins.cozygame.el.hidden)UI.closeWin('cozygame');it.shake=.2;return FurnPlay.open(it,'instrument')}
  return legacyOpen(it,mode)};
 const legacyRender=UI.w_cozygame;UI.w_cozygame=function(){return MiniTable.session?MiniTable.render():legacyRender.apply(this,arguments)};
 const close=UI.closeWin.bind(UI);UI.closeWin=function(id){if(id==='cozygame')MiniTable.close();if(id==='furnplay')MiniInstrument.close();return close(id)};
 const load=Game.load.bind(Game);Game.load=function(){MiniTable.close();MiniInstrument.close();MiniAudio.stopAll();return load(...arguments)};
 FurnPlay.render_instrument=()=>MiniInstrument.render();
 // Stylesheet: served through the asset cache like css/i18n.css (falls back to a plain link outside the loader).
 (async()=>{const link=document.createElement('link');link.rel='stylesheet';try{link.href=typeof PurrAssets!=='undefined'&&PurrAssets.css?await PurrAssets.css('css/minigames.css'):'css/minigames.css'}catch(e){console.warn('minigames.css',e);link.href='css/minigames.css'}document.head.append(link)})();
})();
