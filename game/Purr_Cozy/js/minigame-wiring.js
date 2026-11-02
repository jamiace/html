/* 0.92.29 Purr Cozy mini games: host wiring (0.92.36: memory, puzzle, wire, diff, stars, parking, reaction, fish, balance and
   weave are canvas games too — any CozyGames mode or FurnPlay game profile with a registered MiniTable game opens there). Load after cozy-refine.js / furniture-motion.js and before main.js.
   - cozyGame 'pinball' | 'toss' | 'maze'  -> MiniTable (window `cozygame`)
   - cozyGame 'instrument' (cozy_piano_1..5) and interactionProfile 'instrument' (fun_piano, guitars, music box, chime)
     -> FurnPlay window with the shared MiniInstrument panel
   Item IDs, cozyGame / interactionProfile values and Game.S fields are unchanged. The old TablePhysics block
   (cozy-refine.js) and the legacy CozyGames pinball/toss/maze/instrument branches (cozy-update.js) were removed. */
(function(){
 UI.WIN.cozygame.w=Math.max(UI.WIN.cozygame.w||380,400);
 const legacyOpen=CozyGames.open.bind(CozyGames);
 CozyGames.open=function(it,mode){
  // 0.92.30: the vending machines keep cozyGame 'reaction' in the catalog but get their own game.
  if(mode==='reaction'&&/^cozy_vending_/.test(it.k)&&MiniTable.games.vending)mode='vending';
  if(MiniTable.games[mode]){this.session=null;cancelAnimationFrame(this.raf);return MiniTable.open(it,mode)}
  MiniTable.close();
  if(mode==='instrument'){if(UI.wins.cozygame&&!UI.wins.cozygame.el.hidden)UI.closeWin('cozygame');it.shake=.2;return FurnPlay.open(it,'instrument')}
  return legacyOpen(it,mode)};
 const legacyRender=UI.w_cozygame;UI.w_cozygame=function(){return MiniTable.session?MiniTable.render():legacyRender.apply(this,arguments)};
 const close=UI.closeWin.bind(UI);UI.closeWin=function(id){if(id==='cozygame')MiniTable.close();if(id==='furnplay')MiniInstrument.close();return close(id)};
 const load=Game.load.bind(Game);Game.load=function(){MiniTable.close();MiniInstrument.close();MiniAudio.stopAll();return load(...arguments)};
 FurnPlay.render_instrument=()=>MiniInstrument.render();
 // 0.92.36: the small-item FurnPlay games (sm_console, sm_rubik, sm_blocks, embroidery / loom / sewing machine) open the
 // canvas versions in the mini-game window; every other FurnPlay activity is unchanged.
 const FP_GAMES={reaction:'reaction',puzzle:'puzzle',balance:'balance',weave:'weave'};
 const fpOpen=FurnPlay.open.bind(FurnPlay);
 FurnPlay.open=function(it,profile){const mode=FP_GAMES[profile];if(mode&&MiniTable.games[mode]){this.close();if(UI.wins.furnplay&&!UI.wins.furnplay.el.hidden)UI.closeWin('furnplay');CozyGames.session=null;return MiniTable.open(it,mode)}return fpOpen(it,profile)};
 // Stylesheet: served through the asset cache like css/i18n.css (falls back to a plain link outside the loader).
 (async()=>{const link=document.createElement('link');link.rel='stylesheet';try{link.href=typeof PurrAssets!=='undefined'&&PurrAssets.css?await PurrAssets.css('css/minigames.css'):'css/minigames.css'}catch(e){console.warn('minigames.css',e);link.href='css/minigames.css'}document.head.append(link)})();
})();
