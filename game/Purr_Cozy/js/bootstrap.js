/* version.json is the sole release version source. */
(async()=>{
 let ready=false,loadSeen=false;
 const hold=e=>{if(!ready){loadSeen=true;e.stopImmediatePropagation();}};
 window.addEventListener('load',hold,true);
 try {
 const response=await fetch('version.json',{cache:'no-store'});
 if(!response.ok)throw Error('Cannot read version.json. Please reload.');
 const build=await response.json();
 if(!/^\d+\.\d+\.\d+$/.test(build.version))throw Error('Invalid version.json format.');
 window.PURR_BUILD=Object.freeze(build);
 await new Promise((ok,fail)=>{const el=document.createElement("script");el.src="js/i18n.js?v="+encodeURIComponent(build.version);el.onload=ok;el.onerror=()=>fail(Error("Language engine could not be loaded."));document.head.append(el)});
 await I18n.init(build); I18n.attach();
 const languageStyle=document.createElement("link");languageStyle.rel="stylesheet";languageStyle.href="css/i18n.css?v="+encodeURIComponent(build.version);document.head.append(languageStyle);
 const assets=Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
 for(const link of assets){const u=new URL(link.href);u.searchParams.set('v',build.version);link.href=u.href;}
 for(const path of ["js/purr-boot.js","js/config.js","js/firebase-config.js","js/core.js","js/sprites_items.js","js/sprites_chars.js","js/avatar.js","js/sprites_ui.js","js/sprites_themes.js","js/sprites_life.js","js/catalog.js","js/vocab.js","js/engine.js","js/gen_surfaces.js","js/gen_items.js","js/actor_visibility.js","js/actors.js","js/music.js","js/music_extra.js","js/game.js","js/ui.js","js/avatar_ui.js","js/profile.js","js/life.js","js/pets.js","js/pet_ai.js","js/sprites_lean.js","js/tricks.js","js/petplay.js","js/merchant.js","js/learn.js","js/rewards.js","js/cloud.js","js/social.js","js/team.js","js/challenge.js","js/ritual.js","js/starjar.js","js/feel.js","js/story.js","js/mobile.js","js/lights.js","js/interact.js","js/owner_idle.js","js/music_yt_tracks.js","js/music_default.js","js/sprites_092.js","js/weather.js","js/pet_life.js","js/room092.js","js/progression.js","js/cat_behaviors.js","js/version.js","js/dev.js","js/sprite-loader.js","js/chair-views.js","js/purr-ui.js","js/purr-hands.js","js/cats-typo.js","js/i18n-settings.js","js/ui-repair.js","js/main.js"]){
 await new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=path+'?v='+encodeURIComponent(build.version);el.onload=resolve;el.onerror=()=>reject(Error(I18n.s('bootScript',[path])));document.body.append(el);});
 }
 ready=true;window.removeEventListener('load',hold,true);
 if(loadSeen)window.dispatchEvent(new Event('load'));
 }catch(e){console.error(e);document.getElementById('load-status').textContent=e.message;const retry=document.getElementById('load-retry');retry.hidden=false;retry.onclick=()=>location.reload();}
})();
