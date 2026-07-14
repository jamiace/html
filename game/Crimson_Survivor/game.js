/* BUILD R32 - PERFORMANCE GRID + RENDER CACHES - 2026-07-14 */
(async () => {
'use strict';

const SCRIPT_URL = document.currentScript?.src || document.baseURI || location.href;
const CONFIG_URL = new URL('game-config.json', SCRIPT_URL).href;
let CFG;
try {
  if (window.GAME_CONFIG) CFG = window.GAME_CONFIG;
  else {
    const response = await fetch(CONFIG_URL, {cache:'no-store'});
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
    CFG = await response.json();
  }
} catch (error) {
  console.error('Unable to load game-config.json', error);
  const shell=document.querySelector('#game-shell')||document.body,box=document.createElement('div'),input=document.createElement('input');
  input.type='file';input.accept='.json,application/json';input.style.display='none';
  Object.assign(box.style,{position:'fixed',inset:'0',display:'grid',placeItems:'center',padding:'24px',background:'#07070d',color:'#fff',fontFamily:'system-ui,sans-serif',zIndex:'99999'});
  box.innerHTML=`<div style="max-width:720px;padding:30px;border:1px solid #553044;border-radius:18px;background:#14101a"><h1 style="margin-top:0">無法載入 game-config.json</h1><p>請確認 game-config.json 與 game.js 位於同一資料夾，並透過 GitHub Pages 或本機 HTTP 伺服器開啟。瀏覽器直接以 file:// 開啟時，可按下方按鈕手動選取 JSON。</p><button type="button" style="padding:12px 18px;border:0;border-radius:10px;background:#b72d5d;color:#fff;font:700 15px system-ui;cursor:pointer">選擇 game-config.json</button><pre style="white-space:pre-wrap;color:#ff9fba">${String(error)}</pre></div>`;
  const button=box.querySelector('button');button.onclick=()=>input.click();
  input.onchange=async()=>{try{const file=input.files?.[0];if(!file)return;window.GAME_CONFIG=JSON.parse(await file.text());box.remove();input.remove();const retry=document.createElement('script');retry.src=SCRIPT_URL+(SCRIPT_URL.includes('?')?'&':'?')+'localConfig='+Date.now();document.body.append(retry)}catch(parseError){box.querySelector('pre').textContent=`JSON 解析失敗：${String(parseError)}`}};
  shell.append(box,input);return;
}

const SYS=CFG.system, PERF=CFG.performance, PLAYER_CFG=CFG.player, PROG=CFG.progression, SCALE=CFG.enemyScaling, SPAWN=CFG.spawn, AI=CFG.enemyAI, BOSS=CFG.boss, BASE=CFG.baseAttack, VIS=CFG.visuals, TEXT=CFG.text, AUDIO=CFG.audio, DROP=CFG.drops, DEBUG_CFG=CFG.debug, ONLINE_SCORE=CFG.onlineScores||{}, SCORE_CFG=CFG.scoring||{}, LAST_RIPPLE=CFG.lastRipple||{}, BOSS_REWARD=CFG.bossReward||{};
const dataEntries=obj=>Object.entries(obj).filter(([key])=>!key.startsWith('_'));
const formatText=(template,values={})=>String(template).replace(/\{(\w+)\}/g,(_,key)=>values[key]??`{${key}}`);
const levelChoice=(level,base,upgraded,threshold)=>level>=threshold?upgraded:base;


const $ = s => document.querySelector(s);
const canvas = $('#game');
const ctx = canvas.getContext('2d', { alpha: false });
const TAU = Math.PI * 2;
const U = SYS.unit;
const BASE_ATTACK_RANGE = BASE.targetSearchRange;
const METEOR_MIN_RANGE = CFG.weapons.meteor.levels[0].minimumRange;
const METEOR_MAX_RANGE = CFG.weapons.meteor.levels[0].maximumRange;
const GRAVITY_MIN_RANGE = CFG.weapons.gravity.levels[0].minimumRange;
const GRAVITY_MAX_RANGE = CFG.weapons.gravity.levels[0].maximumRange;
const METEOR_DASH = CFG.weapons.meteor.levels[0].fallVisual.warningDash;
const METEOR_SOLID_DASH = [];
const METEOR_FIXED_ROTATION = CFG.weapons.meteor.levels[0].fallVisual.fixedRotation;
const DENSE_TARGET_REFRESH = PERF.denseTargetRefreshSeconds;
const DENSE_TARGET_LIMIT = PERF.denseTargetLimit;
const METEOR_WARNING_FRAME_COUNT = PERF.meteorWarningFrameCount;
const METEOR_DEATH_FX_BUDGET = PERF.meteorDeathParticleBudgetPerFrame;
const METEOR_IMPACT_PARTICLES = PERF.meteorImpactParticles;
const GEM_MERGE_CELL = PERF.gemMergeCellSize;
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const rand = (a,b)=>a+Math.random()*(b-a);
const pick = a=>a[(Math.random()*a.length)|0];
const dist2=(a,b)=>{const x=a.x-b.x,y=a.y-b.y;return x*x+y*y};
const fmtTime = seconds => {const value=Math.max(0,seconds),minutes=Math.floor(value/60),secs=Math.floor(value%60);return `${String(minutes).padStart(SYS.timeFormatMinutesPad,'0')}:${String(secs).padStart(SYS.timeFormatSecondsPad,'0')}`};
const fmtHp = value => {const number=Math.max(0,Number(value)||0);return String(number>0?Math.max(1,Math.round(number)):0)};
const SCORE_BOSS_START=Number(SCORE_CFG.bossStartSeconds)||Number(SYS.gameDurationSeconds)||900;
const BOSS_FIGHT_LIMIT_SECONDS=Number(SCORE_CFG.bossFightLimitSeconds)||180;
const SCORE_LEVEL_VALUE=Number(SCORE_CFG.levelPointsPerLevel)||100;
const SCORE_BASE_ADJUSTMENT=Number.isFinite(Number(SCORE_CFG.baseScoreAdjustment))?Number(SCORE_CFG.baseScoreAdjustment):-100;
const SCORE_BOSS_SECOND_VALUE=Number(SCORE_CFG.bossRemainingPointPerSecond)||30;
function bossFightRemainingExact(elapsedSeconds=game?.elapsed||0){
  return Math.max(0,BOSS_FIGHT_LIMIT_SECONDS-Math.max(0,(Number(elapsedSeconds)||0)-SCORE_BOSS_START));
}
function bossFightRemainingSeconds(elapsedSeconds=game?.elapsed||0){
  return Math.max(0,Math.floor(bossFightRemainingExact(elapsedSeconds)+1e-9));
}
function bossFightElapsedSeconds(elapsedSeconds=game?.elapsed||0){
  return Math.max(0,Math.floor(Math.max(0,(Number(elapsedSeconds)||0)-SCORE_BOSS_START)+1e-9));
}
function scoreBreakdown(
  totalExp = game?.totalExp || 0,
  elapsedSeconds = (game?.bossDefeated && Number.isFinite(game?.bossDefeatElapsed)) ? game.bossDefeatElapsed : (game?.elapsed || 0),
  level = game?.level || 1
) {
  const expPoints = Math.max(
    0,
    Math.round(Number(totalExp) || 0)
  );

  const normalizedLevel = Math.max(
    1,
    Math.floor(Number(level) || 1)
  );

  const levelPoints =
    normalizedLevel * SCORE_LEVEL_VALUE +
    SCORE_BASE_ADJUSTMENT;

  const bossStarted =
    (Number(elapsedSeconds) || 0) >= SCORE_BOSS_START ||
    !!game?.bossSpawned;

  const bossRemainingSeconds = bossStarted
    ? bossFightRemainingSeconds(elapsedSeconds)
    : 0;

  const bossTimeBonus =
    bossRemainingSeconds * SCORE_BOSS_SECOND_VALUE;

  const scoreAdjustment =
    Math.round(Number(game?.scoreAdjustment) || 0);

  return {
    totalExp: expPoints,
    expPoints,
    levelPoints,
    baseScoreAdjustment: SCORE_BASE_ADJUSTMENT,
    bossRemainingSeconds,
    bossTimeBonus,
    scoreAdjustment,
    overtimeSeconds: bossFightElapsedSeconds(elapsedSeconds),

    score:
      expPoints +
      levelPoints +
      bossTimeBonus +
      scoreAdjustment
  };
}
const angleDiff=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));

const DOM = {
  hud: $('#hud'), start: $('#start-screen'), level: $('#level-screen'), pause: $('#pause-screen'), end: $('#end-screen'), lastRipple: $('#last-ripple-screen'),
  timer: $('#timer'), timerWrap: $('.timer-wrap'), timerLabel: $('.timer-wrap small'), score: $('#score'), levelText: $('#level'), kills: $('#kills'), hpFill: $('#hp-fill'), hpText: $('#hp-text'), expFill: $('#exp-fill'), expText: $('#exp-text'),
  weaponRack: $('#weapon-rack'), passiveRack: $('#passive-rack'), effectRack: $('#effect-rack'), rewardCards: $('#reward-cards'),
  pauseWeaponsList: $('#pause-weapons-list'), pausePassivesList: $('#pause-passives-list'), pauseWeaponsCount: $('#pause-weapons-count'), pausePassivesCount: $('#pause-passives-count'),
  resultScore: $('#result-score'), resultTime: $('#result-time'), resultLevel: $('#result-level'), resultKills: $('#result-kills'), resultWeapons: $('#result-weapons'),
  endTitle: $('#end-title'), endCopy: $('#end-copy'), endEyebrow: $('#end-eyebrow'), toastLayer: $('#toast-layer'), damageFlash: $('#damage-flash'),
  soundBtn: $('#sound-btn'),
  onlineScorePanel: $('#online-score-panel'), scorePlayerName: $('#score-player-name'),
  submitScoreBtn: $('#submit-score-btn'), scoreSubmitStatus: $('#score-submit-status'),
  leaderboardPanel: $('#leaderboard-panel'), leaderboardBody: $('#leaderboard-body'),
  leaderboardStatus: $('#leaderboard-status'), leaderboardRule: $('#leaderboard-rule'),
  leaderboardRefreshBtn: $('#leaderboard-refresh-btn'),
  lastRippleScore: $('#last-ripple-score'), lastRippleAccept: $('#last-ripple-accept'), lastRippleDecline: $('#last-ripple-decline'),
  phaseBanner: $('#phase-banner'), phaseBannerTitle: $('#phase-banner-title'), phaseBannerTime: $('#phase-banner-time'), phaseBannerCopy: $('#phase-banner-copy')
};

function applyStaticText(){
  document.title=TEXT.documentTitle;
  const set=(selector,value)=>{const node=document.querySelector(selector);if(node)node.textContent=value};
  const html=(selector,value)=>{const node=document.querySelector(selector);if(node)node.innerHTML=value};
  canvas.setAttribute('aria-label',TEXT.canvasAria);
  set('.brand-mark',TEXT.brandMark);set('.brand span:last-child',TEXT.brandName);set('.timer-wrap small',TEXT.timerLabel);
  set('#score-label',TEXT.scoreLabel||'分數');set('#level-label', TEXT.levelPrefix);set('#kills-label', TEXT.killsLabel);
  set('.hp-row > span',TEXT.hpLabel);set('.exp-row > span',TEXT.expLabel);$('#pause-btn')?.setAttribute('aria-label',TEXT.pauseAria);set('#pause-btn',TEXT.pauseSymbol);
  set('#start-screen .eyebrow',TEXT.startEyebrow);set('#start-screen h1',TEXT.startTitle);set('#start-screen .subtitle',TEXT.startSubtitle);set('#start-screen .lead',TEXT.startLead);set('#start-build-note',TEXT.startBuildNote);
  const featureGrid=document.querySelector('.feature-grid');if(featureGrid)featureGrid.innerHTML=TEXT.features.map(item=>`<div><b>${item.value}</b><span>${item.label}</span></div>`).join('');
  html('.controls',TEXT.controlsHtml);set('#start-btn',TEXT.startButton);set('#sound-btn',sound.enabled?TEXT.soundOn:TEXT.soundOff);
  set('#level-screen .eyebrow',TEXT.levelEyebrow);set('#level-screen h2',TEXT.levelTitle);set('#level-screen .key-hint',TEXT.levelKeyHint);const chest=document.querySelector('.chest-stage img');if(chest){chest.src=CFG.assets.chest;chest.alt=TEXT.chestAlt}
  set('#pause-screen .eyebrow',TEXT.pauseEyebrow);set('#pause-screen h2',TEXT.pauseTitle);set('#pause-screen .pause-card > p:not(.eyebrow)',TEXT.pauseCopy);set('#pause-weapons-title',TEXT.pauseWeaponsTitle||'目前武器');set('#pause-passives-title',TEXT.pausePassivesTitle||'永久升級');set('#resume-btn',TEXT.resumeButton);set('#restart-pause-btn',TEXT.restartButton);
  set('#end-eyebrow',TEXT.endLoseEyebrow);set('#end-title',TEXT.endLoseTitle);set('#end-copy',TEXT.endLoseCopy);set('#result-score-label',TEXT.resultScoreLabel||'總分');set('#result-time-label',TEXT.resultTimeLabel);set('#result-level-label',TEXT.resultLevelLabel);set('#result-kills-label',TEXT.resultKillsLabel);set('#result-weapons-label',TEXT.resultWeaponsLabel);set('#restart-btn',TEXT.restartEndButton);
}

const ASSET_PATHS = CFG.assets;
const images={};
function loadImages(){
  return Promise.all(dataEntries(ASSET_PATHS).map(([k,src])=>new Promise(res=>{const im=new Image();im.onload=()=>{images[k]=im;res()};im.onerror=res;im.src=src;})));
}

class Sound {
  constructor(){this.enabled=AUDIO.enabledByDefault;this.ctx=null;this.warmed=false;}
  ensure(){
    if(!this.ctx)this.ctx=new (window.AudioContext||window.webkitAudioContext)();
    if(this.ctx.state==='suspended')this.ctx.resume();
    if(!this.warmed){
      this.warmed=true;
      const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();
      g.gain.setValueAtTime(AUDIO.warmupGain,t);o.connect(g).connect(this.ctx.destination);o.start(t);o.stop(t+AUDIO.warmupDuration);
    }
  }
  tone(freq=440,dur=.08,type='sine',vol=.035,slide=0){
    if(!this.enabled)return;this.ensure();const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(AUDIO.minimumFrequency,freq+slide),t+dur);
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(AUDIO.minimumGain,t+dur);o.connect(g).connect(this.ctx.destination);o.start(t);o.stop(t+dur);
  }
  play(name){const t=AUDIO.tones[name];if(t)this.tone(t.frequency,t.duration,t.wave,t.volume,t.slide||0)}
  shot(){this.play('shot')} hit(){this.play('hit')}
  level(){this.play('level1');setTimeout(()=>this.play('level2'),AUDIO.tones.level2.delayMs)}
  hurt(){this.play('hurt')} boom(){this.play('boom')} pickup(){this.play('pickup')}
}
const sound=new Sound();

const baseWeaponLevelCache=Object.fromEntries(dataEntries(CFG.weapons).map(([key,weapon])=>[key,Array.isArray(weapon.levels)?weapon.levels:[]]));
let activeWeaponLevelCache=Object.create(null),activeWeaponAreaLevel=-1,activeWeaponSizeLevel=-1;
const AREA_SCALE_KEYS=new Set(['range','radius','width','targetSearchRange','targetRange','projectileRange','jumpRange','chainRange','triggerRadius','explosionRadius','wellRadius','orbitRadius','expandRadius','hitRadius','expandHitRadius','maximumRange','minimumSeparation','catchDistance']);
const SIZE_SCALE_KEYS=new Set(['radius','width','projectileRadius','hitRadius','expandHitRadius','bladeSize','spriteSize','visualRadius','explosionRadius','wellRadius','orbitRadius','expandRadius','warningStartRadius','warningEndRadius','startRadius','waveStart']);
const AREA_SCALE_SKIP_PARENTS=new Set(['visual','fallVisual','muzzle','particle']);
const SIZE_SCALE_SKIP_PARENTS=new Set(['muzzle']);
function statMaxLevel(key){return Math.max(1,Number(STATS?.[key]?.maxLevel)||SYS.maxUpgradeLevel)}
function statLevel(key){return Math.max(0,Math.min(statMaxLevel(key),game?.player?.stats?.[key]||0))}
function statLevelValue(key,parameter,level=statLevel(key),fallback=0){
  const values=PROG.statLevelValues?.[key]?.[parameter];
  if(Array.isArray(values)&&values.length&&level>0){const index=Math.max(0,Math.min(values.length,level)-1),value=Number(values[index]);if(Number.isFinite(value))return value}
  const value=typeof fallback==='function'?fallback(level):fallback;
  return Number.isFinite(Number(value))?Number(value):0;
}
function lifestealRate(){return statLevelValue('lifesteal','rate',statLevel('lifesteal'),level=>level*(Number(PROG.lifestealPerLevel)||0))}
function mapDropCooldownMultiplier(){return Math.max(0.05,1-statLevelValue('dropCooldown','reduction',statLevel('dropCooldown'),level=>level*(Number(PROG.mapDropCooldownReductionPerLevel)||0)))}
function permanentWeaponCooldownMultiplier(){return Math.max(0.05,1-statLevelValue('weaponCooldown','reduction',statLevel('weaponCooldown'),level=>level*(Number(PROG.weaponCooldownReductionPerLevel)||0)))}
function weaponAreaMultiplier(){return 1+statLevelValue('weaponArea','bonus',statLevel('weaponArea'),level=>level*(Number(PROG.weaponAreaBonusPerLevel)||0))}
function weaponSizeMultiplier(){return 1+statLevelValue('weaponSize','bonus',statLevel('weaponSize'),level=>level*(Number(PROG.weaponSizeBonusPerLevel)||0))}
function hpRegenInterval(){const level=statLevel('hpRegen');if(level<=0)return Number.POSITIVE_INFINITY;return Math.max(0.2,statLevelValue('hpRegen','interval',level,Math.max(0.2,(Number(PROG.hpRegenBaseInterval)||5)-Math.max(0,level-1)*(Number(PROG.hpRegenIntervalReductionPerLevel)||0))))}
function hpRegenAmount(){const level=statLevel('hpRegen');return level>0?Math.max(0,statLevelValue('hpRegen','heal',level,Number(PROG.hpRegenAmount)||1)):0}
function focusStationaryDelay(){const level=statLevel('focus');return level>0?Math.max(0,statLevelValue('focus','stationaryDelay',level,Number(PROG.stationaryDamageDelay)||3)):Number.POSITIVE_INFINITY}
function stationaryDamageActive(){return statLevel('focus')>0&&(game?.player?.stationaryTime||0)>=focusStationaryDelay()}
function stationaryDamageMultiplier(){const level=statLevel('focus');return stationaryDamageActive()?1+statLevelValue('focus','damageBonus',level,level*(Number(PROG.stationaryDamageBonusPerLevel)||0)):1}
function runExpWarmupSeconds(){const level=statLevel('runExp');return level>0?Math.max(0,statLevelValue('runExp','warmup',level,Number(PROG.runExpWarmup)||2)):Number.POSITIVE_INFINITY}
function runExpInterval(){const level=statLevel('runExp');if(level<=0)return Number.POSITIVE_INFINITY;return Math.max(0.2,statLevelValue('runExp','interval',level,Math.max(0.2,(Number(PROG.runExpBaseInterval)||2)-Math.max(0,level-1)*(Number(PROG.runExpIntervalReductionPerLevel)||0))))}
function runExpAmount(){const level=statLevel('runExp');return level>0?Math.max(0,statLevelValue('runExp','expPerTick',level,Number(PROG.runExpPerTick)||1)):0}
function fullHpCooldownMultiplier(){const level=statLevel('fullHpCooldown');if(level<=0||!game?.player)return 1;const reduction=statLevelValue('fullHpCooldown','reduction',level,level*(Number(PROG.fullHpCooldownReductionPerLevel)||0));return game.player.hp>=game.player.maxHp-1e-6?Math.max(0.05,1-reduction):1}
function reviveScoreCost(){return Math.max(0,statLevelValue('revive','scoreCost',1,Number(PROG.reviveScoreCost)||1000))}
function reviveRestoreRatio(){return Math.max(0,statLevelValue('revive','restoreRatio',1,Number(PROG.reviveRestoreRatio)||0.5))}
function reviveInvulnerabilitySeconds(){return Math.max(0,statLevelValue('revive','invulnerabilitySeconds',1,Number(PROG.reviveInvulnerabilitySeconds)||2.2))}
function scaleWeaponConfigValue(value,areaMultiplier,sizeMultiplier,parentKey=''){
  if(Array.isArray(value))return value.map(entry=>scaleWeaponConfigValue(entry,areaMultiplier,sizeMultiplier,parentKey));
  if(!value||typeof value!=='object')return value;
  const output={};
  for(const [key,entry] of Object.entries(value)){
    if(typeof entry==='number'){
      let scaled=entry;
      if(AREA_SCALE_KEYS.has(key)&&!AREA_SCALE_SKIP_PARENTS.has(parentKey))scaled*=areaMultiplier;
      if(SIZE_SCALE_KEYS.has(key)&&!SIZE_SCALE_SKIP_PARENTS.has(parentKey))scaled*=sizeMultiplier;
      output[key]=scaled;
    }else output[key]=scaleWeaponConfigValue(entry,areaMultiplier,sizeMultiplier,key);
  }
  return output;
}
function rebuildWeaponLevelCache(){
  const areaLevel=statLevel('weaponArea'),sizeLevel=statLevel('weaponSize');
  if(areaLevel===activeWeaponAreaLevel&&sizeLevel===activeWeaponSizeLevel&&Object.keys(activeWeaponLevelCache).length)return;
  const areaMultiplier=weaponAreaMultiplier(),sizeMultiplier=weaponSizeMultiplier(),next=Object.create(null),scaled=areaLevel>0||sizeLevel>0;
  for(const [key,levels] of Object.entries(baseWeaponLevelCache))next[key]=scaled?levels.map(level=>scaleWeaponConfigValue(level,areaMultiplier,sizeMultiplier)):levels;
  activeWeaponLevelCache=next;activeWeaponAreaLevel=areaLevel;activeWeaponSizeLevel=sizeLevel;
}
function invalidateScaledWeaponConfigs(){activeWeaponAreaLevel=-1;activeWeaponSizeLevel=-1;activeWeaponLevelCache=Object.create(null);rebuildWeaponLevelCache()}
function weaponLevelConfig(key,level){
  rebuildWeaponLevelCache();
  const index=Math.max(0,Math.min(SYS.maxUpgradeLevel,level||1)-1),levels=activeWeaponLevelCache[key],config=levels?.[index];
  if(!config)throw new Error(`Missing weapon level config: ${key} Lv.${level}`);
  return config;
}
function weaponMaximumRange(key,config){
  if(!config)return 0;
  const explicit={shotgun:config.range,boomerang:config.range,flame:config.range,lightning:config.range,laser:config.range,drone:config.projectileRange,meteor:config.maximumRange,gravity:config.maximumRange};
  const candidates=[explicit[key],config.maximumRange,config.projectileRange,config.range,config.radius,config.targetRange,config.targetSearchRange];
  let maximum=0;for(const value of candidates){const number=Number(value);if(Number.isFinite(number)&&number>maximum)maximum=number}
  return maximum;
}
function weaponSearchRange(key,config){return Math.max(0,weaponMaximumRange(key,config)*(Number(PERF.weaponSearchRangeMultiplier)||1.1))}
const WEAPONS = Object.fromEntries(dataEntries(CFG.weapons).map(([key,w])=>[key,{...w,desc:w.descriptions}]));

const ITEMS = Object.fromEntries(dataEntries(CFG.items).map(([key,item])=>[key,{...item,desc:item.description}]));

const STATS = Object.fromEntries(dataEntries(CFG.stats).map(([key,item])=>[key,{...item,desc:item.description}]));
const SPEED_MULT = PROG.speedMultipliers;
const PICKUP_RAD = PROG.pickupRadii;

const ENEMIES = Object.fromEntries(dataEntries(CFG.enemies).map(([key,e])=>[key,{img:e.image,hp:e.hp,speed:e.speed,damage:e.damage,exp:e.exp,r:e.radius,cost:e.budgetCost,from:e.from,role:e.role}]));
const ENEMY_INTROS = SPAWN.introductions;
const ENEMY_PHASES = SPAWN.phases;
const ROLE_INTERVALS = SPAWN.roleIntervals;

let state='menu', last=performance.now(), DPR=1, W=0,H=0;
let game=null, debugReturnState='paused', debugUI=null, pauseDebugButton=null, pauseFpsButton=null, pauseProfilerButton=null, fpsUI=null, profilerUI=null, vignetteCache=null, debugSecretBuffer='', debugSecretLast=0;
let leaderboardRequestToken=0;
const keys={}; const touch={x:0,y:0,active:false}; const mouse={active:false,held:false,targetX:0,targetY:0};

// ---------------------------------------------------------------------------
// PERFORMANCE INFRASTRUCTURE
// ---------------------------------------------------------------------------
const MAX_ENEMY_RADIUS = PERF.maxEnemyRadius;
const MAX_PARTICLES = PERF.maxParticles;
const MAX_DAMAGE_TEXTS = PERF.maxDamageTexts;
const SPATIAL_CELL_SIZE = PERF.spatialCellSize;

function compactInPlace(array,keep,onDrop=null){
  let write=0;
  for(let read=0;read<array.length;read++){
    const value=array[read];
    if(keep(value))array[write++]=value;
    else if(onDrop)onDrop(value);
  }
  array.length=write;
  return array;
}

class FixedRingGrid{
  constructor(cellSize=PERF.spatialCellSize,width=PERF.spatialGridWidth||100,height=PERF.spatialGridHeight||100,name='grid'){
    this.cellSize=cellSize;this.width=Math.max(8,width|0);this.height=Math.max(8,height|0);this.name=name;this.size=this.width*this.height;
    this.buckets=Array.from({length:this.size},()=>[]);this.bucketX=new Int32Array(this.size);this.bucketY=new Int32Array(this.size);this.stamps=new Uint32Array(this.size);this.activeIndices=[];this.generation=1;this.count=0;this.maxRadius=0;
  }
  modulo(value,limit){const result=value%limit;return result<0?result+limit:result}
  index(cx,cy){return this.modulo(cx,this.width)+this.modulo(cy,this.height)*this.width}
  clear(){
    for(let i=0;i<this.activeIndices.length;i++)this.buckets[this.activeIndices[i]].length=0;
    this.activeIndices.length=0;this.count=0;this.maxRadius=0;this.generation++;
    if(this.generation===0xffffffff){this.stamps.fill(0);this.generation=1}
  }
  insert(entity){
    const cx=Math.floor(entity.x/this.cellSize),cy=Math.floor(entity.y/this.cellSize),index=this.index(cx,cy);
    if(this.stamps[index]!==this.generation||this.bucketX[index]!==cx||this.bucketY[index]!==cy){
      this.stamps[index]=this.generation;this.bucketX[index]=cx;this.bucketY[index]=cy;this.buckets[index].length=0;this.activeIndices.push(index);
    }
    this.buckets[index].push(entity);this.count++;this.maxRadius=Math.max(this.maxRadius,Number(entity.r)||0);
  }
  getBucket(cx,cy){const index=this.index(cx,cy);return this.stamps[index]===this.generation&&this.bucketX[index]===cx&&this.bucketY[index]===cy?this.buckets[index]:null}
  queryCircle(x,y,r,out){
    out.length=0;profilerCount(`${this.name}Queries`);
    const minX=Math.floor((x-r)/this.cellSize),maxX=Math.floor((x+r)/this.cellSize),minY=Math.floor((y-r)/this.cellSize),maxY=Math.floor((y+r)/this.cellSize);
    for(let cy=minY;cy<=maxY;cy++)for(let cx=minX;cx<=maxX;cx++){
      const bucket=this.getBucket(cx,cy);if(!bucket)continue;profilerCount(`${this.name}Candidates`,bucket.length);
      for(let i=0;i<bucket.length;i++)out.push(bucket[i]);
    }
    return out;
  }
  forEachActiveBucket(callback){for(let i=0;i<this.activeIndices.length;i++)callback(this.buckets[this.activeIndices[i]])}
}

const enemySpatial=new FixedRingGrid(SPATIAL_CELL_SIZE,PERF.spatialGridWidth,PERF.spatialGridHeight,'enemyGrid');
const projectileSpatial=new FixedRingGrid(SPATIAL_CELL_SIZE,PERF.spatialGridWidth,PERF.spatialGridHeight,'projectileGrid');
const spatialScratch={
  nearest:[],projectile:[],aoe:[],boomerang:[],orbit:[],flame:[],beam:[],mine:[],well:[],wave:[],lightning:[],densityCandidates:[],densityNeighbors:[]
};
const denseCandidatePool=[];
let meteorSpriteCache=null;
const meteorWarningFrames=[];
let burnZoneSpriteCache=null,acidZoneSpriteCache=null,flameCoreCache=null;
const projectileSpriteCache=new Map(),enemyShotSpriteCache=new Map(),trailSpriteCache=new Map(),particleSpriteCache=new Map();
function createCacheCanvas(width,height){
  const w=Math.max(1,Math.ceil(width)),h=Math.max(1,Math.ceil(height));
  if(typeof OffscreenCanvas==='function')return new OffscreenCanvas(w,h);
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;return canvas;
}
function quantized(value,step){const unit=Math.max(0.01,Number(step)||1);return Math.max(unit,Math.round(Number(value||0)/unit)*unit)}
function cacheContext(canvas){return canvas.getContext('2d',{alpha:true})}
function getPlayerProjectileSprite(projectile){
  const visual=VIS.projectile,drawRadius=Math.max(0.5,Number(projectile.visualR??projectile.r)||1),dx=projectile.x-projectile.px,dy=projectile.y-projectile.py,length=quantized(Math.hypot(dx,dy),PERF.bulletTrailLengthQuantization),radius=quantized(drawRadius,0.25),key=`player|${projectile.color}|${radius}|${length}`;
  let sprite=projectileSpriteCache.get(key);if(sprite)return sprite;
  const lineWidth=radius*visual.trailWidthMultiplier,padding=Math.ceil(visual.shadowBlur+radius*2+lineWidth),width=length+padding*2,height=padding*2,canvas=createCacheCanvas(width,height),c=cacheContext(canvas),centerY=height/2,startX=padding,endX=padding+length;
  c.strokeStyle=projectile.color;c.lineWidth=lineWidth;c.lineCap='round';c.shadowBlur=visual.shadowBlur;c.shadowColor=projectile.color;c.beginPath();c.moveTo(startX,centerY);c.lineTo(endX,centerY);c.stroke();c.fillStyle=visual.coreColor;c.beginPath();c.arc(endX,centerY,radius*visual.coreRadiusMultiplier,0,TAU);c.fill();
  sprite={canvas,padding,height,length};projectileSpriteCache.set(key,sprite);return sprite;
}
function getParticleSprite(color,size){
  const visual=VIS.canvasParticle,radius=quantized(size,PERF.particleSizeQuantization),key=`${color}|${radius}`;let sprite=particleSpriteCache.get(key);if(sprite)return sprite;
  const padding=Math.ceil((Number(visual.shadowBlur)||0)+radius*2),dimension=padding*2,canvas=createCacheCanvas(dimension,dimension),c=cacheContext(canvas),center=dimension/2;
  c.fillStyle=color;c.shadowBlur=visual.shadowBlur;c.shadowColor=color;c.beginPath();c.arc(center,center,radius,0,TAU);c.fill();sprite={canvas,center,radius};particleSpriteCache.set(key,sprite);return sprite;
}
function getTrailSprite(key,length,blackColor,blackWidth,color,lineWidth,shadowBlur,shadowColor){
  const quantizedLength=quantized(length,PERF.bulletTrailLengthQuantization),cacheKey=`${key}|${quantizedLength}`;let sprite=trailSpriteCache.get(cacheKey);if(sprite)return sprite;
  const padding=Math.ceil(Math.max(blackWidth,lineWidth,shadowBlur)*1.5+4),width=quantizedLength+padding*2,height=padding*2,canvas=createCacheCanvas(width,height),c=cacheContext(canvas),cy=height/2;
  c.lineCap='round';c.strokeStyle=blackColor;c.lineWidth=blackWidth;c.beginPath();c.moveTo(padding,cy);c.lineTo(padding+quantizedLength,cy);c.stroke();c.strokeStyle=color;c.lineWidth=lineWidth;c.shadowBlur=shadowBlur;c.shadowColor=shadowColor;c.beginPath();c.moveTo(padding,cy);c.lineTo(padding+quantizedLength,cy);c.stroke();sprite={canvas,padding,height,length:quantizedLength};trailSpriteCache.set(cacheKey,sprite);return sprite;
}
function drawCachedTrail(styleKey,x1,y1,x2,y2,style){
  const dx=x2-x1,dy=y2-y1,length=Math.hypot(dx,dy);if(length<=0.01)return;
  const sprite=getTrailSprite(styleKey,length,style.blackColor,style.blackWidth,style.color,style.lineWidth,style.shadowBlur,style.shadowColor);ctx.save();ctx.translate(x1,y1);ctx.rotate(Math.atan2(dy,dx));ctx.drawImage(sprite.canvas,-sprite.padding,-sprite.height/2);ctx.restore();profilerCount('drawImages');
}
function getEnemyShotBodySprite(shot){
  const styles=VIS.enemyShotStyles,type=shot.type,radius=Math.max(1,Number(shot.r)||1),rotationFrames=Math.max(1,PERF.enemyShotRotationFrames|0),pulseFrames=Math.max(1,PERF.enemyShotPulseFrames|0);let rotationFrame=0,pulseFrame=0,styleKey=type;
  if(type==='bossOrb'){rotationFrame=Math.floor((game.elapsed*styles.bossOrb.rotationSpeed/TAU)*rotationFrames)%rotationFrames}
  else if(type==='bossBolt'){rotationFrame=Math.floor((game.elapsed*styles.bossBolt.rotationSpeed/TAU)*rotationFrames)%rotationFrames;pulseFrame=Math.floor((game.elapsed*styles.bossBolt.ringPulseSpeed/TAU)*pulseFrames)%pulseFrames}
  else if(type==='orb'){pulseFrame=Math.floor((game.elapsed*styles.spitterOrb.ringPulseSpeed/TAU)*pulseFrames)%pulseFrames}
  else if(type!=='bossSpear'){rotationFrame=Math.floor((game.elapsed*styles.default.rotationSpeed/TAU)*rotationFrames)%rotationFrames;styleKey=type==='wave'?'wave':'default'}
  const key=`${styleKey}|${radius}|${rotationFrame}|${pulseFrame}`;let sprite=enemyShotSpriteCache.get(key);if(sprite)return sprite;
  let extent=radius+40;if(type==='bossSpear')extent=70;const canvas=createCacheCanvas(extent*2,extent*2),c=cacheContext(canvas),center=extent;c.translate(center,center);
  if(type==='bossSpear'){
    const v=styles.bossSpear;c.lineCap='round';c.strokeStyle=v.blackColor;c.lineWidth=v.blackWidth;c.beginPath();c.moveTo(v.trailStart,0);c.lineTo(v.trailEnd,0);c.stroke();c.strokeStyle=v.color;c.lineWidth=v.lineWidth;c.shadowBlur=v.shadowBlur;c.shadowColor=v.shadowColor;c.beginPath();c.moveTo(v.trailStart,0);c.lineTo(v.trailEnd,0);c.stroke();c.shadowBlur=0;c.fillStyle=v.tipColor;c.beginPath();c.moveTo(v.tipX,0);c.lineTo(v.tipBackX,-v.tipHalfHeight);c.lineTo(v.tipBackX,v.tipHalfHeight);c.closePath();c.fill();
  }else if(type==='bossOrb'){
    const v=styles.bossOrb;c.rotate(rotationFrame/rotationFrames*TAU);c.fillStyle=v.fillColor;c.strokeStyle=v.outlineColor;c.lineWidth=v.outlineWidth;drawStar(c,radius,v.starPoints,v.innerRadiusMultiplier);c.shadowBlur=v.shadowBlur;c.shadowColor=v.shadowColor;c.fill();c.stroke();
  }else if(type==='bossBolt'){
    const v=styles.bossBolt,pulse=Math.sin(pulseFrame/pulseFrames*TAU)*v.ringPulseAmount;c.rotate(rotationFrame/rotationFrames*TAU);c.fillStyle=v.fillColor;c.strokeStyle=v.outlineColor;c.lineWidth=v.outlineWidth;drawStar(c,radius,v.starPoints,v.innerRadiusMultiplier);c.shadowBlur=v.shadowBlur;c.shadowColor=v.shadowColor;c.fill();c.stroke();c.strokeStyle=v.ringColor;c.lineWidth=v.ringWidth;c.beginPath();c.arc(0,0,radius+v.ringPadding+pulse,0,TAU);c.stroke();
  }else if(type==='orb'){
    const v=styles.spitterOrb,pulse=Math.sin(pulseFrame/pulseFrames*TAU)*v.ringPulseAmount;c.fillStyle=v.bodyColor;c.strokeStyle=v.outlineColor;c.lineWidth=v.outlineWidth;c.beginPath();c.arc(0,0,radius+v.bodyRadiusPadding,0,TAU);c.fill();c.stroke();c.fillStyle=v.coreColor;c.shadowBlur=v.coreShadowBlur;c.shadowColor=v.coreShadowColor;c.beginPath();c.arc(v.coreOffsetX,v.coreOffsetY,radius*v.coreRadiusMultiplier,0,TAU);c.fill();c.fillStyle=v.highlightColor;c.beginPath();c.arc(v.highlightOffsetX,v.highlightOffsetY,v.highlightRadius,0,TAU);c.fill();c.strokeStyle=v.ringColor;c.lineWidth=v.ringWidth;c.beginPath();c.arc(0,0,radius+v.ringPadding+pulse,0,TAU);c.stroke();
  }else{
    const v=styles.default;c.rotate(rotationFrame/rotationFrames*TAU);c.shadowBlur=v.shadowBlur;c.shadowColor=type==='wave'?v.waveShadowColor:v.normalShadowColor;c.fillStyle=type==='wave'?v.waveColor:v.normalColor;c.strokeStyle=v.outlineColor;c.lineWidth=v.outlineWidth;drawStar(c,radius,v.starPoints,v.innerRadiusMultiplier);c.fill();c.stroke();
  }
  sprite={canvas,extent};enemyShotSpriteCache.set(key,sprite);return sprite;
}
function buildFlameCoreCache(){
  const v=VIS.flame,padding=Math.ceil((Number(v.coreShadowBlur)||0)+12),minX=Math.min(0,v.coreStartX)-padding,maxX=Math.max(v.coreEndX,v.coreControlX)+padding,minY=-Math.max(v.coreHalfWidth,v.coreStartHalfWidth)-padding,maxY=Math.max(v.coreHalfWidth,v.coreStartHalfWidth)+padding,canvas=createCacheCanvas(maxX-minX,maxY-minY),c=cacheContext(canvas);
  c.translate(-minX,-minY);const gradient=c.createLinearGradient(v.coreGradientStart,0,v.coreGradientEnd,0);for(const [stop,color] of v.coreGradientStops)gradient.addColorStop(stop,color);c.fillStyle=gradient;c.shadowBlur=v.coreShadowBlur;c.shadowColor=v.coreShadowColor;c.beginPath();c.moveTo(v.coreStartX,-v.coreStartHalfWidth);c.quadraticCurveTo(v.coreControlX,-v.coreHalfWidth,v.coreEndX,0);c.quadraticCurveTo(v.coreControlX,v.coreHalfWidth,v.coreStartX,v.coreStartHalfWidth);c.lineTo(v.coreStartX,v.coreStartHalfWidth);c.closePath();c.fill();flameCoreCache={canvas,offsetX:minX,offsetY:minY};
}
function buildLightningPathFrames(points,visual){
  const frameCount=Math.max(1,PERF.lightningPathFrames|0),frames=[];
  for(let frame=0;frame<frameCount;frame++){
    const path=typeof Path2D==='function'?new Path2D():[];
    for(let index=0;index<points.length;index++){
      const point=points[index];if(!index){if(path instanceof Array)path.push([point.x,point.y,true]);else path.moveTo(point.x,point.y);continue}
      const previous=points[index-1];for(let step=1;step<=visual.segmentSteps;step++){const t=step/visual.segmentSteps,xx=previous.x+(point.x-previous.x)*t+rand(-visual.jitter,visual.jitter),yy=previous.y+(point.y-previous.y)*t+rand(-visual.jitter,visual.jitter);if(path instanceof Array)path.push([xx,yy,false]);else path.lineTo(xx,yy)}
    }
    frames.push(path);
  }
  return frames;
}
function rebuildEnemySpatial(){enemySpatial.clear();if(!game)return;for(const e of game.enemies)if(!e.dead)enemySpatial.insert(e)}
function queryEnemies(x,y,r,out){if(enemySpatial.count>0)return enemySpatial.queryCircle(x,y,r,out);out.length=0;if(game)for(const e of game.enemies)if(!e.dead)out.push(e);return out}

const objectPools={particles:[],texts:[],projectiles:[],enemyShots:[],gems:[]};
function recycleParticle(p){if(objectPools.particles.length<MAX_PARTICLES)objectPools.particles.push(p)}
function recycleText(t){if(objectPools.texts.length<MAX_DAMAGE_TEXTS)objectPools.texts.push(t)}
function recycleProjectile(b){if(b.hit)b.hit.clear();if(objectPools.projectiles.length<PERF.projectilePoolLimit)objectPools.projectiles.push(b)}
function recycleEnemyShot(b){if(objectPools.enemyShots.length<PERF.enemyShotPoolLimit)objectPools.enemyShots.push(b)}
function recycleGem(g){if(objectPools.gems.length<PERF.gemPoolLimit)objectPools.gems.push(g)}
function prewarmObjectPools(){
  while(objectPools.particles.length<PERF.prewarm.particles)objectPools.particles.push({});
  while(objectPools.texts.length<PERF.prewarm.texts)objectPools.texts.push({});
  while(objectPools.projectiles.length<PERF.prewarm.projectiles)objectPools.projectiles.push({hit:new Set()});
  while(objectPools.enemyShots.length<PERF.prewarm.enemyShots)objectPools.enemyShots.push({});
  while(objectPools.gems.length<PERF.prewarm.gems)objectPools.gems.push({});
}


const fpsMonitor={visible:false,frames:0,lastSample:performance.now(),value:0};
function ensureFPSUI(){
  if(fpsUI)return;
  const node=document.createElement('div');
  node.id='fps-display';
  Object.assign(node.style,{position:'absolute',display:'none',pointerEvents:'none',textAlign:'center',...VIS.fpsUI});
  node.textContent=TEXT.fpsEmpty;
  document.querySelector('#game-shell').append(node);
  fpsUI=node;
}
function syncFPSVisibility(){
  ensureFPSUI();ensureProfilerUI();
  fpsUI.style.display=fpsMonitor.visible&&state==='playing'?'block':'none';
  profilerUI.style.display=profiler.visible&&state==='playing'?'block':'none';
}
function setFPSVisible(visible){
  fpsMonitor.visible=!!visible;fpsMonitor.frames=0;fpsMonitor.lastSample=performance.now();
  if(pauseFpsButton)pauseFpsButton.textContent=fpsMonitor.visible?TEXT.fpsOn:TEXT.fpsOff;
  syncFPSVisibility();
}
function toggleFPSDisplay(){setFPSVisible(!fpsMonitor.visible)}
function updateFPSDisplay(now){
  if(!fpsMonitor.visible||state!=='playing'){
    if(fpsUI)fpsUI.style.display='none';fpsMonitor.frames=0;fpsMonitor.lastSample=now;return
  }
  if(fpsUI&&fpsUI.style.display==='none')fpsUI.style.display='block';
  fpsMonitor.frames++;
  const elapsed=now-fpsMonitor.lastSample;
  if(elapsed>=PERF.fpsSampleIntervalMs){
    const instant=fpsMonitor.frames*SYS.millisecondsPerSecond/elapsed;
    fpsMonitor.value=fpsMonitor.value?fpsMonitor.value*PERF.fpsSmoothingOld+instant*PERF.fpsSmoothingNew:instant;
    if(fpsUI)fpsUI.textContent=formatText(TEXT.fpsValue,{value:Math.round(fpsMonitor.value)});
    fpsMonitor.frames=0;fpsMonitor.lastSample=now;
  }
}

const profiler={
  enabled:PERF.profilerEnabled!==false,
  visible:!!PERF.profilerVisibleByDefault,
  frameStart:0,
  current:Object.create(null),
  counters:Object.create(null),
  sums:Object.create(null),
  counterSums:Object.create(null),
  frames:0,
  sampleStart:performance.now(),
  last:Object.create(null),
  lastCounters:Object.create(null),
  frameMs:0,
  maxFrameMs:0
};
function profilerActive(){return profiler.enabled&&profiler.visible&&state==='playing'}
function profilerStart(){return profilerActive()?performance.now():0}
function profilerEnd(name,start){if(!start||!profilerActive())return;profiler.current[name]=(profiler.current[name]||0)+(performance.now()-start)}
function profilerCount(name,value=1){if(!profilerActive())return;profiler.counters[name]=(profiler.counters[name]||0)+value}
function profilerBeginFrame(now){
  if(!profilerActive())return;
  profiler.frameStart=now;profiler.current=Object.create(null);profiler.counters=Object.create(null);
}
function profilerEndFrame(now){
  if(!profilerActive())return;
  const frameMs=Math.max(0,now-profiler.frameStart);profiler.frameMs+=frameMs;profiler.maxFrameMs=Math.max(profiler.maxFrameMs,frameMs);profiler.frames++;
  for(const [key,value] of Object.entries(profiler.current))profiler.sums[key]=(profiler.sums[key]||0)+value;
  for(const [key,value] of Object.entries(profiler.counters))profiler.counterSums[key]=(profiler.counterSums[key]||0)+value;
  const interval=Math.max(100,Number(PERF.profilerSampleIntervalMs)||500);
  if(now-profiler.sampleStart<interval)return;
  const divisor=Math.max(1,profiler.frames),last=Object.create(null),lastCounters=Object.create(null);
  for(const [key,value] of Object.entries(profiler.sums))last[key]=value/divisor;
  for(const [key,value] of Object.entries(profiler.counterSums))lastCounters[key]=value/divisor;
  last.frame=profiler.frameMs/divisor;last.frameMax=profiler.maxFrameMs;
  profiler.last=last;profiler.lastCounters=lastCounters;profiler.sums=Object.create(null);profiler.counterSums=Object.create(null);profiler.frames=0;profiler.frameMs=0;profiler.maxFrameMs=0;profiler.sampleStart=now;
  updateProfilerUI();
}
function ensureProfilerUI(){
  if(profilerUI)return;
  const node=document.createElement('pre');node.id='performance-profiler';
  Object.assign(node.style,{position:'absolute',left:'14px',top:'74px',zIndex:'28',display:'none',pointerEvents:'none',margin:'0',minWidth:'310px',maxWidth:'430px',padding:'12px 14px',border:'1px solid rgba(255,255,255,.16)',borderRadius:'12px',background:'rgba(5,7,14,.88)',backdropFilter:'blur(8px)',color:'#dff8ff',font:'700 11px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace',whiteSpace:'pre-wrap',boxShadow:'0 12px 32px rgba(0,0,0,.42)'});
  node.textContent='Profiler waiting…';document.querySelector('#game-shell').append(node);profilerUI=node;
}
function setProfilerVisible(visible){profiler.visible=!!visible;profiler.sums=Object.create(null);profiler.counterSums=Object.create(null);profiler.frames=0;profiler.frameMs=0;profiler.maxFrameMs=0;profiler.sampleStart=performance.now();if(pauseProfilerButton)pauseProfilerButton.textContent=`效能監測：${profiler.visible?'開啟':'關閉'}`;syncFPSVisibility()}
function toggleProfilerDisplay(){setProfilerVisible(!profiler.visible)}
function updateProfilerUI(){
  if(!profilerUI||!profiler.visible)return;
  const t=profiler.last,c=profiler.lastCounters,fmt=value=>Number(value||0).toFixed(2),count=value=>Math.round(Number(value)||0);
  const rows=[
    `FPS ${Math.round(t.frame?1000/t.frame:(fpsMonitor.value||0))} | Frame ${fmt(t.frame)} ms | Max ${fmt(t.frameMax)} ms`,
    `Update ${fmt(t['update.total'])} | Draw ${fmt(t['draw.total'])}`,
    `敵人 ${fmt(t['update.enemies'])} | Enemy Grid ${fmt(t['grid.enemies'])}`,
    `武器 ${fmt(t['update.weapons'])} | 延遲事件 ${fmt(t['update.scheduler'])}`,
    `玩家彈碰撞 ${fmt(t['update.projectiles'])} | 敵方彈 ${fmt(t['update.enemyShots'])}`,
    `特殊武器 ${fmt(t['update.specials'])} | EXP/粒子 ${fmt((t['update.gems']||0)+(t['update.particles']||0))}`,
    `繪製敵人 ${fmt(t['draw.enemies'])} | 玩家彈 ${fmt(t['draw.projectiles'])} | 敵方彈 ${fmt(t['draw.enemyShots'])}`,
    `繪製武器FX ${fmt(t['draw.weaponFx'])} | 粒子/文字 ${fmt(t['draw.particles'])}`,
    `Counts E:${game?.enemies?.length||0} P:${game?.projectiles?.length||0} ES:${game?.enemyShots?.length||0} FX:${game?.particles?.length||0}`,
    `Grid Q enemy:${count(c.enemyGridQueries)} projectile:${count(c.projectileGridQueries)} candidates:${count((c.enemyGridCandidates||0)+(c.projectileGridCandidates||0))}`,
    `DrawImage ${count(c.drawImages)} | Cache P:${particleSpriteCache.size} B:${projectileSpriteCache.size+enemyShotSpriteCache.size+trailSpriteCache.size}`
  ];
  profilerUI.textContent=rows.join('\n');
}
function startScreenShake(amplitude,duration=weaponLevelConfig('meteor',1).impact.shakeDurationNormal){
  if(!game||amplitude<=0||duration<=0)return;
  const shakeCfg=VIS.shake,current=game.shakeRemaining>0?game.shakeAmplitude*Math.pow(game.shakeRemaining/Math.max(shakeCfg.minimumDurationDenominator,game.shakeDuration),shakeCfg.currentEnvelopePower):0;
  game.shakeAmplitude=Math.max(current,amplitude);game.shakeDuration=Math.max(duration,game.shakeRemaining>0?game.shakeRemaining:0);game.shakeRemaining=Math.max(game.shakeRemaining,duration);
}
function updateScreenShake(dt){
  if(!game||game.shakeRemaining<=0){if(game){game.shakeRemaining=0;game.shakeAmplitude=0}return}
  game.shakeRemaining=Math.max(0,game.shakeRemaining-dt);
  game.shakePhase+=dt;
  if(game.shakeRemaining<=0)game.shakeAmplitude=0;
}
const reusableShakeOffset={x:0,y:0};
function screenShakeOffset(){
  if(!game||game.shakeRemaining<=0){reusableShakeOffset.x=0;reusableShakeOffset.y=0;return reusableShakeOffset}
  const c=VIS.shake,envelope=Math.pow(game.shakeRemaining/Math.max(c.minimumDurationDenominator,game.shakeDuration),c.envelopePower),amp=game.shakeAmplitude*envelope,p=game.shakePhase;
  const x=(Math.sin(p*c.xFrequency1)+Math.sin(p*c.xFrequency2+c.xPhase2)*c.xSecondWeight)*amp*c.xWeight;
  const y=(Math.sin(p*c.yFrequency1+c.yPhase1)+Math.sin(p*c.yFrequency2+c.yPhase2)*c.ySecondWeight)*amp*c.yWeight;
  reusableShakeOffset.x=Math.round(x*c.quantizeStepsPerPixel)/c.quantizeStepsPerPixel;reusableShakeOffset.y=Math.round(y*c.quantizeStepsPerPixel)/c.quantizeStepsPerPixel;return reusableShakeOffset;
}

const hudCache=Object.create(null);
const effectNodes=new Map();
function resetHudCache(){for(const key of Object.keys(hudCache))delete hudCache[key]}
function setTextIfChanged(key,node,value){value=String(value);if(hudCache[key]!==value){node.textContent=value;hudCache[key]=value}}
function setStyleIfChanged(key,node,prop,value){if(hudCache[key]!==value){node.style[prop]=value;hudCache[key]=value}}
function ensureEffectNodes(){
  if(effectNodes.size)return;
  const map={regen:'regen',shield:'shield',freeze:'freeze',doublexp:'doublexp',overload:'overload'};
  for(const [effect,itemKey] of Object.entries(map)){
    const item=ITEMS[itemKey],node=document.createElement('div');node.className='effect-pill';node.style.display='none';
    const img=document.createElement('img');img.src=item.icon;img.alt='';const label=document.createElement('span');label.textContent=item.name;const time=document.createElement('b');time.textContent=formatText(TEXT.effectTime,{seconds:(0).toFixed(1)});
    node.append(img,label,time);DOM.effectRack.append(node);effectNodes.set(effect,{node,time,visible:false,lastText:''});
  }
}

function resetGame(){
  game={
    elapsed:0,duration:SYS.gameDurationSeconds,level:PROG.startLevel,exp:PROG.startExp,totalExp:0,need:needXP(PROG.startLevel),kills:0,paused:false,ended:false,won:false,scoreSubmitted:false,scoreRunId:'',scoreAdjustment:0,
    shakeAmplitude:0,shakeRemaining:0,shakeDuration:weaponLevelConfig('meteor',1).impact.shakeDurationNormal,shakePhase:rand(0,TAU),spawnBudget:0,bossSpawned:false,bossFightStartedAt:null,bossTimedOut:false,bossDefeated:false,bossDefeatElapsed:null,
    lastRippleUsed:false,lastRippleActive:false,lastRippleRemaining:0,lastRippleExpired:false,bossRewardPhase:false,bossRewardRemaining:0,
    player:{x:PLAYER_CFG.startX,y:PLAYER_CFG.startY,vx:0,vy:0,r:PLAYER_CFG.radius,hp:PLAYER_CFG.startHP,maxHp:PLAYER_CFG.startHP,baseSpeed:PLAYER_CFG.baseSpeed,invuln:0,angle:0,stats:{hp:0,speed:0,pickup:0,lifesteal:0,dropCooldown:0,weaponCooldown:0,weaponArea:0,weaponSize:0,hpRegen:0,revive:0,focus:0,runExp:0,fullHpCooldown:0},weapons:{},baseTimer:PLAYER_CFG.startBaseAttackDelay,lifestealRemainder:0,regenTimer:Number(PROG.hpRegenBaseInterval)||5,stationaryTime:0,runExpWarmup:0,runExpTimer:Number(PROG.runExpBaseInterval)||2},
    enemies:[],projectiles:[],enemyShots:[],gems:[],mapDrops:[],particles:[],texts:[],waves:[],beams:[],meteors:[],gravityOrbs:[],zones:[],mines:[],wells:[],boomerangs:[],lightning:[],drones:[],delayedCasts:[],effects:{regen:0,shield:0,freeze:0,doublexp:0,overload:0},
    pendingLevels:0,rewardChoices:[],camera:{x:PLAYER_CFG.startX,y:PLAYER_CFG.startY},pattern:null,globalMagnet:0,nextMapDrop:DROP.firstDropDelay*mapDropCooldownMultiplier(),
    introFlags:{},roleTimers:{...SPAWN.roleTimerStarts},wavePackTimer:SPAWN.mixedWaveTimerStart,spawnCounts:{rat:0,hound:0,shell:0,spitter:0,bloater:0,shadow:0,golem:0,boss:0},openingGrace:SPAWN.openingGraceSeconds,hudTimer:0,
    denseTargets:[],denseTargetTimer:0,denseTargetUpdated:-999,frameDeathParticleBudget:PERF.meteorDeathParticleBudgetPerFrame,frameGemMap:new Map(),lastMeteorBoom:-999,debugModes:{godMode:false,effects:{overload:false,doublexp:false,freeze:false,magnet:false}}
  };
  enemySpatial.clear();projectileSpatial.clear();invalidateScaledWeaponConfigs();resetHudCache();ensureEffectNodes();prewarmObjectPools();if(images.arena)game.pattern=ctx.createPattern(images.arena,'repeat');updateHUD(true);buildWeaponRack();
}
function needXP(level){const f=PROG.xpFormula;return Math.round(f.base+f.linear*level+f.quadratic*level*level)}
function hpMult(seconds){const minute=seconds/SYS.secondsPerMinute;return 1+SCALE.hpLinearPerMinute*minute+SCALE.hpQuadraticPerMinuteSquared*minute*minute}
function dmgMult(seconds){return 1+SCALE.damagePerMinute*(seconds/SYS.secondsPerMinute)}
function speedMult(seconds){return Math.min(SCALE.speedMaximumMultiplier,1+SCALE.speedPerMinute*(seconds/SYS.secondsPerMinute))}

function rebuildVignetteCache(){
  const c=document.createElement('canvas');c.width=Math.max(SYS.minimumCanvasDimension,Math.ceil(W));c.height=Math.max(SYS.minimumCanvasDimension,Math.ceil(H));
  const bg=VIS.background,cctx=c.getContext('2d'),g=cctx.createRadialGradient(W/2,H/2,bg.vignetteInnerRadius,W/2,H/2,Math.max(W,H)*bg.vignetteOuterMultiplier);
  for(const [position,color] of bg.vignetteStops)g.addColorStop(position,color);cctx.fillStyle=g;cctx.fillRect(0,0,W,H);vignetteCache=c;
}
function resize(){DPR=Math.min(SYS.maxDevicePixelRatio,window.devicePixelRatio||SYS.defaultDevicePixelRatio);W=innerWidth;H=innerHeight;canvas.width=W*DPR;canvas.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);ctx.imageSmoothingEnabled=true;rebuildVignetteCache();}
window.addEventListener('resize',resize);resize();


function isScoreEndpointConfigured(){
  const endpoint=String(ONLINE_SCORE.endpoint||'').trim();
  return !!ONLINE_SCORE.enabled && /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:\?.*)?$/i.test(endpoint);
}
function setScoreSubmitStatus(message,type=''){
  if(!DOM.scoreSubmitStatus)return;
  DOM.scoreSubmitStatus.textContent=message;
  DOM.scoreSubmitStatus.className=`score-submit-status${type?` ${type}`:''}`;
}
function setLeaderboardStatus(message,type=''){
  if(!DOM.leaderboardStatus)return;
  DOM.leaderboardStatus.textContent=message;
  DOM.leaderboardStatus.className=`leaderboard-status${type?` ${type}`:''}`;
}
function resetOnlineScoreUI(){
  leaderboardRequestToken++;
  if(DOM.onlineScorePanel)DOM.onlineScorePanel.classList.add('hidden');
  if(DOM.leaderboardPanel)DOM.leaderboardPanel.classList.add('hidden');
  if(DOM.leaderboardBody)DOM.leaderboardBody.replaceChildren();
  if(DOM.leaderboardRule)DOM.leaderboardRule.textContent='';
  if(DOM.leaderboardRefreshBtn)DOM.leaderboardRefreshBtn.disabled=false;
  if(DOM.submitScoreBtn){
    DOM.submitScoreBtn.disabled=false;
    DOM.submitScoreBtn.textContent='送出成績';
  }
  if(DOM.scorePlayerName)DOM.scorePlayerName.disabled=false;
  setScoreSubmitStatus('');
  setLeaderboardStatus('');
}
function prepareOnlineScoreUI(win){
  resetOnlineScoreUI();
  if(!win)return;
  DOM.onlineScorePanel?.classList.remove('hidden');
  DOM.leaderboardPanel?.classList.remove('hidden');
  const savedName=localStorage.getItem(ONLINE_SCORE.storageKey||'crimson-survivor-player-name')||'';
  DOM.scorePlayerName.maxLength=Number(ONLINE_SCORE.playerNameMaxLength)||20;
  DOM.scorePlayerName.value=savedName;
  if(!isScoreEndpointConfigured()){
    DOM.submitScoreBtn.disabled=true;
    DOM.leaderboardRefreshBtn.disabled=true;
    setScoreSubmitStatus('尚未設定 Google Apps Script Web App 網址。請先在 game-config.json 填入 endpoint。','error');
    setLeaderboardStatus('排行榜無法載入：尚未設定 endpoint。','error');
    return;
  }
  refreshLeaderboard({runId:'',retryOwn:false});
}
function makeRunId(){
  if(globalThis.crypto?.randomUUID)return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`;
}
function normalizedWeaponLevel(weaponState,key){
  const definition=CFG.weapons?.[key];
  const maximum=Math.max(1,Number(SYS.maxUpgradeLevel)||5);
  const seen=new Set();

  const readLevel=(value,depth=0)=>{
    if(value==null||depth>6)return NaN;

    if(typeof value==='number'){
      return Number.isFinite(value)?value:NaN;
    }

    if(typeof value==='string'){
      const trimmed=value.trim();
      if(!trimmed)return NaN;
      const direct=Number(trimmed);
      if(Number.isFinite(direct))return direct;
      const matched=trimmed.match(/(?:Lv\.?\s*)?(\d+)/i);
      return matched?Number(matched[1]):NaN;
    }

    if(typeof value!=='object')return NaN;
    if(seen.has(value))return NaN;
    seen.add(value);

    if(Array.isArray(definition?.levels)){
      const configIndex=definition.levels.indexOf(value);
      if(configIndex>=0)return configIndex+1;
    }

    for(const property of ['level','lv','weaponLevel','currentLevel','current','value']){
      if(Object.prototype.hasOwnProperty.call(value,property)){
        const nested=readLevel(value[property],depth+1);
        if(Number.isFinite(nested))return nested;
      }
    }

    return NaN;
  };

  const rawLevel=readLevel(weaponState);
  if(!Number.isFinite(rawLevel))return 0;
  return Math.max(0,Math.min(maximum,Math.round(rawLevel)));
}
function buildScorePayload(playerName){
  if(!game.scoreRunId)game.scoreRunId=makeRunId();

  const weaponDetails=Object.entries(game.player.weapons||{}).map(([key,weaponState])=>{
    const name=CFG.weapons?.[key]?.name||key;
    return {
      key,
      name,
      level:normalizedWeaponLevel(weaponState,key)
    };
  });

  const weaponEntries=weaponDetails.map(
    weapon=>`${weapon.name} Lv.${weapon.level}`
  );
  const finalScore=scoreBreakdown();
  const finalElapsed=game.bossDefeated&&Number.isFinite(game.bossDefeatElapsed)?game.bossDefeatElapsed:game.elapsed;

  return {
    gameId:String(ONLINE_SCORE.gameId||'crimson-survivor'),
    runId:game.scoreRunId,
    playerName,
    result:'victory',
    elapsedSeconds:Math.round(finalElapsed*1000)/1000,
    elapsedText:fmtTime(finalElapsed),
    totalExp:finalScore.totalExp,
    levelPoints:finalScore.levelPoints,
    baseScoreAdjustment:finalScore.baseScoreAdjustment,
    bossRemainingSeconds:finalScore.bossRemainingSeconds,
    bossRemainingText:fmtTime(finalScore.bossRemainingSeconds),
    bossTimeBonus:finalScore.bossTimeBonus,
    bossElapsedSeconds:finalScore.overtimeSeconds,
    overtimeSeconds:finalScore.overtimeSeconds,
    scoreAdjustment:finalScore.scoreAdjustment,
    score:finalScore.score,
    level:game.level,
    kills:game.kills,
    hp:Math.max(0,Math.round(game.player.hp*100)/100),
    maxHp:Math.round(game.player.maxHp*100)/100,
    weaponCount:weaponDetails.length,
    weapons:weaponEntries.join('｜'),
    weaponLevels:JSON.stringify(weaponDetails),
    build:String(CFG.meta?.build||''),
    configVersion:String(CFG.meta?.configVersion||''),
    clientTimestamp:new Date().toISOString(),
    userAgent:navigator.userAgent.slice(0,300)
  };
}
function leaderboardJsonp(runId=''){
  return new Promise((resolve,reject)=>{
    const callbackName=`__crimsonLeaderboard_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script=document.createElement('script');
    const url=new URL(String(ONLINE_SCORE.endpoint).trim());
    const timeoutMs=Number(ONLINE_SCORE.leaderboardTimeoutMs)||12000;
    let timer=0;
    const cleanup=()=>{
      clearTimeout(timer);
      script.remove();
      try{delete globalThis[callbackName]}catch(_){globalThis[callbackName]=undefined}
    };
    globalThis[callbackName]=payload=>{
      cleanup();
      if(payload?.ok)resolve(payload);
      else reject(new Error(payload?.error||'排行榜服務回傳錯誤'));
    };
    script.onerror=()=>{
      cleanup();
      reject(new Error('排行榜連線失敗'));
    };
    url.searchParams.set('action','leaderboard');
    url.searchParams.set('limit',String(Number(ONLINE_SCORE.leaderboardLimit)||50));
    url.searchParams.set('gameId',String(ONLINE_SCORE.gameId||'crimson-survivor'));
    if(runId)url.searchParams.set('runId',runId);
    url.searchParams.set('callback',callbackName);
    url.searchParams.set('_',String(Date.now()));
    script.src=url.toString();
    script.async=true;
    timer=setTimeout(()=>{
      cleanup();
      reject(new Error('排行榜讀取逾時'));
    },timeoutMs);
    document.head.append(script);
  });
}
function appendLeaderboardRow(score,isOwn=false){
  const row=document.createElement('tr');
  if(isOwn)row.classList.add('is-own');
  if(score.weapons)row.title=score.weapons;

  const bossRemainingText=score.bossRemainingText||score.overtimeText||(score.bossRemainingSeconds!==undefined?fmtTime(Number(score.bossRemainingSeconds)||0):'—');
  const values=[
    score.rank??'—',
    Number.isFinite(Number(score.score))?Math.round(Number(score.score)).toLocaleString('zh-TW'):'—',
    `${score.playerName||'匿名'}${isOwn?'（你）':''}`,
    score.kills??'—',
    bossRemainingText,
    score.level??'—'
  ];
  values.forEach((value,index)=>{
    const cell=document.createElement(index===2?'th':'td');
    if(index===2)cell.scope='row';
    cell.textContent=String(value);
    row.append(cell);
  });
  DOM.leaderboardBody.append(row);
}
function renderLeaderboard(payload,runId=''){
  if(!DOM.leaderboardBody)return;
  DOM.leaderboardBody.replaceChildren();
  const entries=Array.isArray(payload.entries)?payload.entries:[];
  if(!entries.length){
    const row=document.createElement('tr');
    row.className='leaderboard-empty-row';
    const cell=document.createElement('td');
    cell.colSpan=6;
    cell.textContent='目前還沒有通關成績。';
    row.append(cell);
    DOM.leaderboardBody.append(row);
  }else{
    for(const entry of entries)appendLeaderboardRow(entry,!!runId&&entry.runId===runId);
  }
  const own=payload.own||null;
  if(own&&!own.inTop){
    const divider=document.createElement('tr');
    divider.className='leaderboard-own-divider';
    const cell=document.createElement('td');
    cell.colSpan=6;
    cell.textContent='你的本局成績';
    divider.append(cell);
    DOM.leaderboardBody.append(divider);
    appendLeaderboardRow(own,true);
  }
  if(DOM.leaderboardRule){
    DOM.leaderboardRule.textContent=payload.rankingRule||'分數較高者優先；同分依最短時間、最多擊殺數、最低等級排序。';
  }
}
const leaderboardDelay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function refreshLeaderboard({runId='',retryOwn=false}={}){
  if(!isScoreEndpointConfigured())return false;
  const requestToken=++leaderboardRequestToken;
  const attempts=retryOwn?Math.max(1,Number(ONLINE_SCORE.leaderboardRetryCount)||5):1;
  const retryDelay=Math.max(250,Number(ONLINE_SCORE.leaderboardRetryDelayMs)||900);
  DOM.leaderboardPanel?.classList.remove('hidden');
  if(DOM.leaderboardRefreshBtn)DOM.leaderboardRefreshBtn.disabled=true;
  setLeaderboardStatus(runId?'正在確認本局名次…':'正在載入 Top 50…');
  let latestPayload=null;
  try{
    for(let attempt=0;attempt<attempts;attempt++){
      latestPayload=await leaderboardJsonp(runId);
      if(requestToken!==leaderboardRequestToken)return false;
      renderLeaderboard(latestPayload,runId);
      if(!runId||latestPayload.own){
        const ownText=latestPayload.own?`你的本局排名：第 ${latestPayload.own.rank} 名。`:'';
        setLeaderboardStatus(`共 ${latestPayload.total||0} 筆通關紀錄。${ownText}`,'success');
        return true;
      }
      if(attempt<attempts-1){
        setLeaderboardStatus(`成績已送出，等待排行榜更新…（${attempt+1}/${attempts}）`);
        await leaderboardDelay(retryDelay*(attempt+1));
      }
    }
    setLeaderboardStatus('尚未在排行榜讀到本局紀錄，請稍後按「重新整理」。','warning');
    return false;
  }catch(error){
    if(requestToken!==leaderboardRequestToken)return false;
    console.error('Leaderboard load failed',error);
    if(latestPayload)renderLeaderboard(latestPayload,runId);
    setLeaderboardStatus(error?.message||'排行榜載入失敗。','error');
    return false;
  }finally{
    if(requestToken===leaderboardRequestToken&&DOM.leaderboardRefreshBtn)DOM.leaderboardRefreshBtn.disabled=false;
  }
}
async function submitOnlineScore(){
  if(!game?.ended||!game?.won){
    setScoreSubmitStatus('只有擊敗 Boss 的勝利紀錄可以送出。','error');return;
  }
  if(game.scoreSubmitted){
    setScoreSubmitStatus('這一局成績已經送出。','success');
    refreshLeaderboard({runId:game.scoreRunId||'',retryOwn:false});
    return;
  }
  if(!isScoreEndpointConfigured()){
    setScoreSubmitStatus('Google Apps Script Web App 網址尚未設定。','error');return;
  }
  const maxLength=Number(ONLINE_SCORE.playerNameMaxLength)||20;
  const playerName=String(DOM.scorePlayerName.value||'').trim().slice(0,maxLength);
  if(!playerName){
    DOM.scorePlayerName.focus();
    setScoreSubmitStatus('請先輸入玩家名稱。','error');return;
  }
  localStorage.setItem(ONLINE_SCORE.storageKey||'crimson-survivor-player-name',playerName);
  DOM.submitScoreBtn.disabled=true;
  DOM.scorePlayerName.disabled=true;
  DOM.submitScoreBtn.textContent='傳送中…';
  setScoreSubmitStatus('正在傳送成績…');
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),Number(ONLINE_SCORE.requestTimeoutMs)||12000);
  try{
    const payload=buildScorePayload(playerName);
    const body=new URLSearchParams();
    Object.entries(payload).forEach(([key,value])=>body.set(key,String(value??'')));
    await fetch(String(ONLINE_SCORE.endpoint).trim(),{
      method:'POST',
      mode:'no-cors',
      headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
      body,
      signal:controller.signal,
      cache:'no-store',
      keepalive:true
    });
    game.scoreSubmitted=true;
    DOM.submitScoreBtn.textContent='已送出';
    setScoreSubmitStatus('成績已送出，正在確認排行榜…','success');
    const confirmed=await refreshLeaderboard({runId:payload.runId,retryOwn:true});
    setScoreSubmitStatus(
      confirmed?'成績已登錄，排行榜已更新。':'成績已送出；若尚未出現，請稍後重新整理排行榜。',
      confirmed?'success':''
    );
  }catch(error){
    console.error('Score submission failed',error);
    DOM.submitScoreBtn.disabled=false;
    DOM.scorePlayerName.disabled=false;
    DOM.submitScoreBtn.textContent='重新送出';
    setScoreSubmitStatus(error?.name==='AbortError'?'傳送逾時。':'傳送失敗，請稍後重試。','error');
  }finally{
    clearTimeout(timeout);
  }
}

function startGame(){
  sound.ensure();ensurePauseDebugButton();ensureFPSUI();resetOnlineScoreUI();resetGame();mouse.active=false;mouse.held=false;state='playing';syncFPSVisibility();DOM.start.classList.remove('show');DOM.end.classList.remove('show');DOM.pause.classList.remove('show');DOM.level.classList.remove('show');DOM.lastRipple?.classList.remove('show');DOM.phaseBanner?.classList.add('hidden');DOM.hud.classList.remove('hidden');
  last = performance.now();
// 遊戲開始後，將開始說明顯示 6 秒
toast(TEXT.startLead, 6000);
}
function endGame(win){
  if(game.ended)return;game.ended=true;game.won=!!win;game.scoreSubmitted=false;state='ended';syncFPSVisibility();DOM.lastRipple?.classList.remove('show');DOM.phaseBanner?.classList.add('hidden');DOM.hud.classList.add('hidden');DOM.end.classList.add('show');
  const timedOut=!win&&game.bossTimedOut, rippleExpired=!win&&game.lastRippleExpired;
  DOM.endEyebrow.textContent=win?TEXT.endWinEyebrow:rippleExpired?(TEXT.lastRippleDefeatEyebrow||'波紋燃盡'):timedOut?TEXT.bossTimeoutEyebrow:TEXT.endLoseEyebrow;DOM.endTitle.textContent=win?TEXT.endWinTitle:rippleExpired?(TEXT.lastRippleDefeatTitle||'最後的波紋消散了'):timedOut?TEXT.bossTimeoutTitle:TEXT.endLoseTitle;DOM.endCopy.textContent=win?TEXT.endWinCopy:rippleExpired?(TEXT.lastRippleDefeatCopy||'十秒已到，Boss 仍未被擊敗。'):timedOut?TEXT.bossTimeoutCopy:TEXT.endLoseCopy;
  DOM.resultScore.textContent=scoreBreakdown().score.toLocaleString('zh-TW');DOM.resultTime.textContent=fmtTime(game.bossDefeated&&Number.isFinite(game.bossDefeatElapsed)?game.bossDefeatElapsed:game.elapsed);DOM.resultLevel.textContent=game.level;DOM.resultKills.textContent=game.kills;DOM.resultWeapons.textContent=`${Object.keys(game.player.weapons).length} / ${SYS.maxWeaponSlots}`;
  prepareOnlineScoreUI(win);sound.play(win?'victory':'defeat');
}
function togglePause(force){
  if(state==='level'||state==='menu'||state==='ended'||state==='debug')return;
  const on=force!==undefined?force:state!=='paused';
  state=on?'paused':'playing';
  DOM.pause.classList.toggle('show',on);
  game.paused=on;
  debugSecretBuffer='';
  debugSecretLast=0;
  last=performance.now();
  syncFPSVisibility();
  if(on)renderPauseLoadout();
  if(!on&&game.pendingLevels>0)setTimeout(()=>{if(state==='playing'&&game.pendingLevels>0)openLevelUp()},0);
}
function ensurePauseDebugButton(){
  const card=DOM.pause?.querySelector('.pause-card');
  if(!card)return;
  let row=card.querySelector('#pause-tools-row');
  if(!row){
    row=document.createElement('div');
    row.id='pause-tools-row';
    Object.assign(row.style,DEBUG_CFG.pauseToolsStyle);
    const restartBtn=$('#restart-pause-btn');
    if(restartBtn)card.insertBefore(row,restartBtn);else card.append(row);
  }
  const oldDebug=row.querySelector('#debug-pause-btn');
  if(oldDebug)oldDebug.remove();
  pauseDebugButton=null;
  if(!pauseFpsButton){
    const btn=document.createElement('button');btn.id='fps-pause-btn';btn.className='secondary-btn';btn.textContent=TEXT.fpsOff;btn.onclick=toggleFPSDisplay;row.append(btn);pauseFpsButton=btn;
  }
  if(!pauseProfilerButton){
    const btn=document.createElement('button');btn.id='profiler-pause-btn';btn.className='secondary-btn';btn.onclick=toggleProfilerDisplay;row.append(btn);pauseProfilerButton=btn;
  }
  pauseFpsButton.textContent=fpsMonitor.visible?TEXT.fpsOn:TEXT.fpsOff;
  pauseProfilerButton.textContent=`效能監測：${profiler.visible?'開啟':'關閉'}`;
}
function makeDebugButton(text,role,style={}){
  const button=document.createElement('button');
  button.type='button';
  if(role)button.dataset.role=role;
  button.textContent=text;
  Object.assign(button.style,{
    padding:'11px 12px',
    border:'1px solid rgba(255,255,255,.16)',
    borderRadius:'11px',
    background:'rgba(255,255,255,.055)',
    color:'#f7fbff',
    font:'inherit',
    fontWeight:'800',
    cursor:'pointer'
  },style);
  return button;
}

function ensureDebugUI(){
  if(debugUI)return;
  const overlay=document.createElement('section');
  overlay.id='debug-upgrade-ui';
  Object.assign(overlay.style,DEBUG_CFG.overlayStyle);

  const panel=document.createElement('div');
  Object.assign(panel.style,DEBUG_CFG.panelStyle);
  panel.innerHTML=`
    <div style="color:#65e7ff;font-size:11px;font-weight:900;letter-spacing:.18em">${TEXT.debug.eyebrow}</div>
    <h2 style="margin:7px 0 6px;font-size:30px">${TEXT.debug.title}</h2>
    <p style="margin:0 0 14px;color:#aebdca;line-height:1.65">${TEXT.debug.copy}</p>
    <div data-role="status" style="min-height:24px;margin:0 0 14px;color:#8eeaff;font-size:13px"></div>

    <section>
      <h3 style="margin:0 0 8px;font-size:15px">${TEXT.debug.weaponSection}</h3>
      <div data-role="weapon-grid"></div>
    </section>

    <section style="margin-top:14px">
      <h3 style="margin:0 0 8px;font-size:15px">${TEXT.debug.statSection}</h3>
      <div data-role="stat-grid"></div>
    </section>

    <section data-role="selection-panel" style="margin-top:18px;padding:16px;border:1px solid rgba(101,231,255,.22);border-radius:16px;background:rgba(5,13,24,.55)">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <img data-role="selected-icon" alt="" style="width:64px;height:64px;object-fit:contain;border-radius:12px;background:rgba(255,255,255,.045)">
        <div style="min-width:220px;flex:1">
          <div data-role="selected-name" style="font-size:20px;font-weight:900"></div>
          <div data-role="selected-level" style="margin-top:4px;color:#8eeaff;font-size:13px"></div>
          <div data-role="selected-effect" style="margin-top:6px;color:#c7d7e3;font-size:12px;line-height:1.55"></div>
        </div>
        <div data-role="level-controls" style="display:flex;gap:8px;flex-wrap:wrap"></div>
      </div>
    </section>

    <section style="margin-top:18px">
      <h3 style="margin:0 0 8px;font-size:15px">${TEXT.debug.quickSection}</h3>
      <div data-role="quick-actions" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:9px"></div>
    </section>

    <section style="margin-top:18px">
      <h3 style="margin:0 0 8px;font-size:15px">${TEXT.debug.effectSection}</h3>
      <div data-role="effect-toggles" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:9px"></div>
    </section>

    <section style="margin-top:18px">
      <h3 style="margin:0 0 5px;font-size:15px">${TEXT.debug.parameterSection}</h3>
      <p style="margin:0 0 10px;color:#92a6b5;font-size:12px;line-height:1.55">${TEXT.debug.parameterHint}</p>
      <div data-role="parameter-editor"></div>
    </section>

    <button data-role="close" style="width:100%;margin-top:18px;padding:13px;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:transparent;color:#c9d3db;font:inherit;cursor:pointer">${TEXT.debug.close}</button>
  `;
  overlay.append(panel);
  document.querySelector('#game-shell').append(overlay);

  debugUI={
    overlay,
    panel,
    status:panel.querySelector('[data-role="status"]'),
    weaponGrid:panel.querySelector('[data-role="weapon-grid"]'),
    statGrid:panel.querySelector('[data-role="stat-grid"]'),
    selectedIcon:panel.querySelector('[data-role="selected-icon"]'),
    selectedName:panel.querySelector('[data-role="selected-name"]'),
    selectedLevel:panel.querySelector('[data-role="selected-level"]'),
    selectedEffect:panel.querySelector('[data-role="selected-effect"]'),
    levelControls:panel.querySelector('[data-role="level-controls"]'),
    quickActions:panel.querySelector('[data-role="quick-actions"]'),
    effectToggles:panel.querySelector('[data-role="effect-toggles"]'),
    parameterEditor:panel.querySelector('[data-role="parameter-editor"]'),
    selectedType:'base',
    selectedKey:'baseAttack'
  };

  panel.querySelector('[data-role="close"]').onclick=closeDebugUI;
  overlay.addEventListener('pointerdown',event=>{if(event.target===overlay)closeDebugUI()});
}

function debugCurrentLevel(type,key){
  if(type==='base')return 1;
  if(type==='weapon')return game.player.weapons[key]?.level||0;
  if(type==='stat')return game.player.stats[key]||0;
  return 0;
}
function debugMaximumLevel(type,key){return type==='stat'?statMaxLevel(key):SYS.maxUpgradeLevel}
function debugLevelText(type,key,level){
  if(type==='base')return TEXT.debug.baseAttackLevel;
  if(type==='stat'&&key==='revive')return level>0?(TEXT.debug.reviveOwned||'已持有一次復活'):(TEXT.debug.reviveNotOwned||TEXT.debug.notOwned);
  return level>0?formatText(TEXT.debug.levelText,{level}):TEXT.debug.notOwned;
}
function debugStatEffectSummary(key,level=debugCurrentLevel('stat',key)){
  if(level<=0)return TEXT.debug.noRuntimeEffect||'目前未啟用；請先提升等級。';
  const percent=value=>`${(Number(value)*100).toFixed(Math.abs(Number(value)*100-Math.round(Number(value)*100))<1e-8?0:1)}%`;
  const compactNumber=value=>{const number=Number(value)||0;return Number.isInteger(number)?String(number):number.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')};
  if(key==='lifesteal')return `造成傷害的 ${percent(statLevelValue(key,'rate',level))} 轉為 HP`;
  if(key==='dropCooldown')return `地圖道具生成冷卻 -${percent(statLevelValue(key,'reduction',level))}`;
  if(key==='weaponCooldown')return `所有武器冷卻 -${percent(statLevelValue(key,'reduction',level))}`;
  if(key==='weaponArea')return `所有武器射程／效果半徑 +${percent(statLevelValue(key,'bonus',level))}`;
  if(key==='weaponSize')return `武器視覺與碰撞判定 +${percent(statLevelValue(key,'bonus',level))}`;
  if(key==='hpRegen')return `每 ${compactNumber(statLevelValue(key,'interval',level))} 秒回復 ${compactNumber(statLevelValue(key,'heal',level))} HP`;
  if(key==='revive')return `死亡時以 ${percent(reviveRestoreRatio())} Max HP 復活；無敵 ${reviveInvulnerabilitySeconds()} 秒；購買 ${Math.round(reviveScoreCost())} 分`;
  if(key==='focus')return `原地 ${statLevelValue(key,'stationaryDelay',level)} 秒後，傷害 +${percent(statLevelValue(key,'damageBonus',level))}`;
  if(key==='runExp')return `跑步 ${statLevelValue(key,'warmup',level)} 秒後，每 ${statLevelValue(key,'interval',level)} 秒 EXP +${statLevelValue(key,'expPerTick',level)}`;
  if(key==='fullHpCooldown')return `滿血時所有武器冷卻 -${percent(statLevelValue(key,'reduction',level))}`;
  if(key==='hp')return `最大 HP ${game.player.maxHp}`;
  if(key==='speed')return `移動速度 ${SPEED_MULT[Math.min(level,SPEED_MULT.length-1)].toFixed(2)}×`;
  if(key==='pickup')return `拾取半徑 ${PICKUP_RAD[Math.min(level,PICKUP_RAD.length-1)]} px`;
  return '';
}

function debugWeaponDefinition(type,key){
  if(type==='base')return {name:BASE.name||TEXT.debug.baseAttackName,icon:BASE.icon||CFG.assets.player,color:'#ff5d8b'};
  if(type==='weapon')return WEAPONS[key];
  if(type==='stat')return STATS[key];
  return null;
}

function debugCard(type,key,definition){
  const button=document.createElement('button');
  button.type='button';
  Object.assign(button.style,DEBUG_CFG.weaponCardStyle);
  const selected=debugUI.selectedType===type&&debugUI.selectedKey===key;
  if(selected)Object.assign(button.style,DEBUG_CFG.weaponCardSelectedStyle);
  const level=debugCurrentLevel(type,key);
  const levelText=debugLevelText(type,key,level);
  button.innerHTML=`
    <img src="${definition.icon||CFG.assets.player}" alt="" style="${Object.entries(DEBUG_CFG.weaponIconStyle).map(([k,v])=>`${k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())}:${v}`).join(';')}">
    <div style="font-size:12px;font-weight:900;line-height:1.25">${definition.name}</div>
    <div style="margin-top:4px;color:${selected?'#8eeaff':'#9eafbd'};font-size:11px">${levelText}</div>
  `;
  button.onclick=()=>{
    debugUI.selectedType=type;
    debugUI.selectedKey=key;
    renderDebugUI(formatText(TEXT.debug.selected,{name:definition.name}));
  };
  return button;
}

function debugSelectedConfig(){
  const type=debugUI.selectedType,key=debugUI.selectedKey;
  if(type==='base')return BASE;
  if(type==='weapon'){
    const current=debugCurrentLevel(type,key);
    return weaponLevelConfig(key,Math.max(1,current));
  }
  if(type==='stat')return PROG.statLevelValues?.[key]||null;
  return null;
}

function collectDebugNumericFields(value,path='',out=[]){
  if(typeof value==='number'&&Number.isFinite(value)){
    const last=path.split('.').pop();
    if(!(DEBUG_CFG.parameterExcludedKeys||[]).includes(last))out.push({path,value});
    return out;
  }
  if(!value||typeof value!=='object')return out;
  if(Array.isArray(value)){
    value.forEach((item,index)=>collectDebugNumericFields(item,path?`${path}.${index}`:String(index),out));
    return out;
  }
  for(const [key,item] of Object.entries(value)){
    if(key.startsWith('_')||(DEBUG_CFG.parameterExcludedKeys||[]).includes(key))continue;
    collectDebugNumericFields(item,path?`${path}.${key}`:key,out);
  }
  return out;
}

function getDebugPath(root,path){
  return path.split('.').reduce((value,key)=>value?.[Array.isArray(value)?Number(key):key],root);
}

function setDebugPath(root,path,value){
  const keys=path.split('.');
  let target=root;
  for(let i=0;i<keys.length-1;i++){
    const key=Array.isArray(target)?Number(keys[i]):keys[i];
    target=target[key];
  }
  const last=Array.isArray(target)?Number(keys[keys.length-1]):keys[keys.length-1];
  target[last]=value;
}

function debugStatParameterKey(path){const parts=path.split('.');return parts.length>1&&/^\d+$/.test(parts[parts.length-1])?parts.slice(0,-1).join('.'):path}
function debugStatParameterFullKey(path){return `${debugUI.selectedKey}.${debugStatParameterKey(path)}`}
function debugStatPercentField(path){return debugUI.selectedType==='stat'&&(DEBUG_CFG.statPercentParameters||[]).includes(debugStatParameterFullKey(path))}
function debugStatIntegerField(path){return debugUI.selectedType==='stat'&&(DEBUG_CFG.statIntegerParameters||[]).includes(debugStatParameterFullKey(path))}
function debugFieldLabel(path){
  const parts=path.split('.'),last=parts[parts.length-1],parameter=/^\d+$/.test(last)?parts.slice(0,-1).join('.'):path,key=parameter.split('.').pop();
  const base=DEBUG_CFG.parameterLabels?.[parameter]||DEBUG_CFG.parameterLabels?.[key]||key.replace(/([a-z0-9])([A-Z])/g,'$1 $2');
  if(debugUI.selectedType==='stat'&&/^\d+$/.test(last))return `${base} · Lv.${Number(last)+1}${debugStatPercentField(path)?'（%）':''}`;
  return base;
}

function debugFieldDescription(path){
  const key=path.split('.').pop();
  if(debugUI.selectedType==='stat')return DEBUG_CFG.statParameterDescriptions?.[debugStatParameterFullKey(path)]||'此數值對應指定等級，修改後會立即套用。';
  const selected=debugUI.selectedType==='weapon'?CFG.weapons[debugUI.selectedKey]:null;
  return selected?._fieldNotes?.[path]||selected?._fieldNotes?.[key]||CFG.weapons._parameterDictionary?.[path]||CFG.weapons._parameterDictionary?.[key]||'執行中的數值參數。';
}

function debugNumberStep(path,value){
  const key=path.split('.').pop().toLowerCase();
  if(/count|hits|pierce|steps|points|particles/.test(key))return 1;
  if(/alpha|multiplier|amount/.test(key))return .01;
  if(/seconds|duration|cooldown|delay|interval|gap|timer/.test(key))return .01;
  if(/radian|rotation|angle|jitter|rate/.test(key))return .01;
  return Math.abs(value)<10?.1:1;
}

function renderDebugParameterEditor(){
  const root=debugSelectedConfig(),host=debugUI.parameterEditor;
  host.innerHTML='';
  if(!root){
    host.textContent=TEXT.debug.noParameters;
    return;
  }
  const fields=collectDebugNumericFields(root);
  if(!fields.length){
    host.textContent=TEXT.debug.noParameters;
    return;
  }
  const groups=new Map();
  for(const field of fields){
    const parts=field.path.split('.');
    const group=parts.length>1?parts[0]:'root';
    if(!groups.has(group))groups.set(group,[]);
    groups.get(group).push(field);
  }
  for(const [group,items] of groups){
    const details=document.createElement('details');
    details.open=debugUI.selectedType==='stat'||group==='root';
    details.style.marginBottom='9px';
    details.style.border='1px solid rgba(255,255,255,.11)';
    details.style.borderRadius='12px';
    details.style.padding='10px 12px';
    const summary=document.createElement('summary');
    summary.textContent=DEBUG_CFG.parameterGroupNames?.[group]||debugFieldLabel(group);
    summary.style.cursor='pointer';
    summary.style.fontWeight='900';
    summary.style.color='#dff8ff';
    details.append(summary);
    const grid=document.createElement('div');
    Object.assign(grid.style,DEBUG_CFG.parameterGridStyle);
    grid.style.marginTop='10px';
    for(const field of items){
      const row=document.createElement('label');
      row.style.display='block';
      row.style.padding='9px';
      row.style.borderRadius='10px';
      row.style.background='rgba(255,255,255,.035)';
      const title=document.createElement('div');
      title.textContent=debugFieldLabel(field.path);
      title.style.fontSize='12px';
      title.style.fontWeight='900';
      const path=document.createElement('div');
      path.textContent=field.path;
      path.style.fontSize='10px';
      path.style.color='#7f95a4';
      path.style.margin='2px 0 6px';
      const input=document.createElement('input');
      input.type='number';
      const percentage=debugStatPercentField(field.path),integer=debugStatIntegerField(field.path);
      input.value=String(percentage?field.value*100:field.value);
      input.step=percentage?'1':(integer?'1':String(debugNumberStep(field.path,field.value)));
      Object.assign(input.style,DEBUG_CFG.parameterInputStyle);
      const lower=field.path.toLowerCase();
      if(lower.includes('alpha')){input.min='0';input.max='1'}
      if(percentage){input.min='0';if(debugStatParameterFullKey(field.path).includes('reduction'))input.max='95'}
      if(/count|hits|pierce|steps|points|particles/.test(lower)||integer)input.step='1';
      input.title=debugFieldDescription(field.path);
      input.onchange=()=>{
        let displayValue=Number(input.value);
        if(!Number.isFinite(displayValue)){const current=getDebugPath(root,field.path);input.value=String(percentage?current*100:current);return}
        let value=percentage?displayValue/100:displayValue;
        if(lower.includes('alpha'))value=clamp(value,0,1);
        if(/count|hits|pierce|steps|points|particles/.test(lower)||integer)value=Math.round(value);
        setDebugPath(root,field.path,value);
        invalidateScaledWeaponConfigs();
        input.value=String(percentage?value*100:value);
        if(debugUI.selectedType==='weapon'){
          const weapon=game.player.weapons[debugUI.selectedKey];
          if(weapon)weapon.timer=0;
        }else if(debugUI.selectedType==='base'){
          game.player.baseTimer=0;
        }else if(debugUI.selectedType==='stat'){
          if(debugUI.selectedKey==='hpRegen')game.player.regenTimer=Math.min(game.player.regenTimer||hpRegenInterval(),hpRegenInterval());
          if(debugUI.selectedKey==='runExp')game.player.runExpTimer=Math.min(game.player.runExpTimer||runExpInterval(),runExpInterval());
          if(debugUI.selectedKey==='dropCooldown')game.nextMapDrop=Math.min(game.nextMapDrop,DROP.nextDropDelayMax*mapDropCooldownMultiplier());
          debugUI.selectedEffect.textContent=formatText(TEXT.debug.runtimeEffect||'目前效果：{effect}',{effect:debugStatEffectSummary(debugUI.selectedKey)});
          updateHUD(true);
        }
        debugUI.status.textContent=formatText(TEXT.debug.parameterChanged,{
          name:debugWeaponDefinition(debugUI.selectedType,debugUI.selectedKey).name,
          path:field.path,
          value:percentage?`${value*100}%`:value
        });
      };
      row.append(title,path,input);
      grid.append(row);
    }
    details.append(grid);
    host.append(details);
  }
}

function renderDebugSelection(){
  const type=debugUI.selectedType,key=debugUI.selectedKey,definition=debugWeaponDefinition(type,key);
  const level=debugCurrentLevel(type,key),max=debugMaximumLevel(type,key);
  debugUI.selectedIcon.src=definition.icon||CFG.assets.player;
  debugUI.selectedName.textContent=definition.name;
  debugUI.selectedLevel.textContent=debugLevelText(type,key,level);
  debugUI.selectedEffect.textContent=type==='stat'?formatText(TEXT.debug.runtimeEffect||'目前效果：{effect}',{effect:debugStatEffectSummary(key,level)}):'';
  debugUI.levelControls.innerHTML='';

  if(type!=='base'){
    const minus=makeDebugButton(TEXT.debug.downgradeOne,'minus');
    minus.onclick=debugDowngrade;
    const plusLabel=type==='stat'&&key==='revive'?(TEXT.debug.grantRevive||'取得復活'):TEXT.debug.upgradeOne;
    const plus=makeDebugButton(plusLabel,'plus',{background:'linear-gradient(135deg,#31c7e8,#157da8)',border:'0'});
    plus.onclick=()=>debugUpgrade(false);
    const maxLabel=max===1?plusLabel:`升至 Lv.${max}`;
    const maxButton=makeDebugButton(maxLabel,'max');
    maxButton.onclick=()=>debugUpgrade(true);
    debugUI.levelControls.append(minus,plus);
    if(max>1)debugUI.levelControls.append(maxButton);
    if(type==='weapon'){
      const remove=makeDebugButton(TEXT.debug.removeWeapon,'remove',{color:'#ffb6ca',borderColor:'rgba(255,80,132,.35)'});
      remove.onclick=debugRemoveSelectedWeapon;
      debugUI.levelControls.append(remove);
    }
    if(type==='stat'&&key==='revive'&&level>0){
      const consume=makeDebugButton(TEXT.debug.consumeRevive||'模擬消耗復活','consume-revive',{color:'#ffd6a0',borderColor:'rgba(255,205,118,.45)'});
      consume.onclick=debugConsumeRevive;
      debugUI.levelControls.append(consume);
    }
  }
  renderDebugParameterEditor();
}

function renderDebugQuickActions(){
  const host=debugUI.quickActions;
  host.innerHTML='';
  const all=makeDebugButton(TEXT.debug.allWeaponsMax,'all',{background:'rgba(49,199,232,.13)',borderColor:'rgba(101,231,255,.42)'});
  all.onclick=debugSetAllWeaponsMax;
  const allStats=makeDebugButton(TEXT.debug.allStatsMax||'一鍵升滿所有永久能力','all-stats',{background:'rgba(110,242,164,.12)',borderColor:'rgba(110,242,164,.42)',color:'#c6ffdd'});
  allStats.onclick=debugSetAllStatsMax;
  const base=makeDebugButton(TEXT.debug.baseOnly,'base-only',{background:'rgba(255,70,116,.1)',borderColor:'rgba(255,98,145,.35)',color:'#ffc0d2'});
  base.onclick=debugResetBaseOnly;
  const time=makeDebugButton(TEXT.debug.advanceMinute,'time');
  time.onclick=debugAdvanceMinute;
  const boss=makeDebugButton(TEXT.debug.enterBoss,'boss',{color:'#ffb1ca'});
  boss.onclick=debugEnterBossStage;
  const score=makeDebugButton(TEXT.debug.scorePlus1000||'分數調整 +1000','score-plus');
  score.onclick=debugAddScore;
  const hpOne=makeDebugButton(TEXT.debug.hpToOne||'HP 設為 1','hp-one');
  hpOne.onclick=()=>{game.player.hp=1;updateHUD(true);renderDebugUI('玩家 HP 已設為 1。')};
  const hpMax=makeDebugButton(TEXT.debug.hpToMax||'HP 補滿','hp-max');
  hpMax.onclick=()=>{game.player.hp=game.player.maxHp;updateHUD(true);renderDebugUI('玩家 HP 已補滿。')};
  const exp=makeDebugButton(TEXT.debug.expPlus100||'EXP +100','exp-plus');
  exp.onclick=()=>{gainExp(100);updateHUD(true);renderDebugUI('已增加 100 EXP。')};
  host.append(all,allStats,base,time,boss,score,hpOne,hpMax,exp);
}

function renderDebugToggles(){
  const host=debugUI.effectToggles;
  host.innerHTML='';
  const states=[
    ['godMode',TEXT.debug.godMode,!!game.debugModes?.godMode],
    ['overload',TEXT.debug.overloadMode,!!game.debugModes?.effects?.overload],
    ['doublexp',TEXT.debug.doubleXpMode,!!game.debugModes?.effects?.doublexp],
    ['freeze',TEXT.debug.freezeMode,!!game.debugModes?.effects?.freeze],
    ['magnet',TEXT.debug.magnetMode,!!game.debugModes?.effects?.magnet]
  ];
  for(const [key,label,on] of states){
    const button=makeDebugButton(`${label}：${on?TEXT.debug.toggleOn:TEXT.debug.toggleOff}`,`toggle-${key}`,on?{
      background:'rgba(76,225,161,.14)',
      borderColor:'rgba(76,225,161,.55)',
      color:'#b8ffdc'
    }:{});
    button.onclick=()=>debugToggleMode(key);
    host.append(button);
  }
}

function renderDebugUI(message=''){
  ensureDebugUI();
  debugUI.weaponGrid.innerHTML='';
  Object.assign(debugUI.weaponGrid.style,DEBUG_CFG.weaponGridStyle);
  debugUI.weaponGrid.append(debugCard('base','baseAttack',debugWeaponDefinition('base','baseAttack')));
  for(const [key,definition] of Object.entries(WEAPONS))debugUI.weaponGrid.append(debugCard('weapon',key,definition));

  debugUI.statGrid.innerHTML='';
  Object.assign(debugUI.statGrid.style,DEBUG_CFG.weaponGridStyle);
  for(const [key,definition] of Object.entries(STATS))debugUI.statGrid.append(debugCard('stat',key,definition));

  renderDebugSelection();
  renderDebugQuickActions();
  renderDebugToggles();
  debugUI.status.textContent=message||TEXT.debug.defaultStatus;
}

function debugUpgrade(toMax=false){
  if(!game||!debugUI)return;
  const type=debugUI.selectedType,key=debugUI.selectedKey,player=game.player,max=debugMaximumLevel(type,key);
  if(type==='base')return;
  if(type==='weapon'){
    const current=player.weapons[key]?.level||0;
    if(current>=max){
      renderDebugUI(formatText(TEXT.debug.alreadyMax,{name:WEAPONS[key].name,max}));
      return;
    }
    if(!player.weapons[key])player.weapons[key]={level:toMax?max:1,timer:0};
    else player.weapons[key].level=toMax?max:Math.min(max,current+1);
    player.weapons[key].timer=0;
    buildWeaponRack();
    renderDebugUI(formatText(TEXT.debug.adjusted,{name:WEAPONS[key].name,level:player.weapons[key].level}));
    return;
  }
  if(type==='stat'){
    const current=player.stats[key]||0;
    if(current>=max){
      renderDebugUI(formatText(TEXT.debug.alreadyMax,{name:STATS[key].name,max}));
      return;
    }
    const target=toMax?max:current+1,delta=target-current;
    player.stats[key]=target;
    if(key==='hp'){
      player.maxHp+=PROG.hpPerUpgrade*delta;
      player.hp=Math.min(player.maxHp,player.hp+PROG.hpPerUpgrade*delta);
    }
    if(key==='dropCooldown'&&delta>0)game.nextMapDrop=Math.min(game.nextMapDrop,DROP.nextDropDelayMax*mapDropCooldownMultiplier());
    if(key==='hpRegen')player.regenTimer=Math.min(player.regenTimer||hpRegenInterval(),hpRegenInterval());
    if(key==='runExp')player.runExpTimer=Math.min(player.runExpTimer||runExpInterval(),runExpInterval());
    invalidateScaledWeaponConfigs();
    buildWeaponRack();
    updateHUD(true);
    renderDebugUI(formatText(TEXT.debug.adjusted,{name:STATS[key].name,level:target}));
  }
}

function debugConsumeRevive(){
  if(!game||debugUI.selectedType!=='stat'||debugUI.selectedKey!=='revive')return;
  game.player.stats.revive=0;
  buildWeaponRack();
  updateHUD(true);
  renderDebugUI(TEXT.debug.reviveConsumed||'復活已模擬消耗。');
}
function debugAddScore(){
  if(!game)return;
  game.scoreAdjustment=(Number(game.scoreAdjustment)||0)+1000;
  updateHUD(true);
  renderDebugUI(formatText(TEXT.debug.scorePlusApplied||'Debug 分數已增加 1000，目前總分為 {score}',{score:scoreBreakdown().score.toLocaleString('zh-TW')}));
}

function debugDowngrade(){
  if(!game||!debugUI)return;
  const type=debugUI.selectedType,key=debugUI.selectedKey,player=game.player;
  if(type==='base')return;
  if(type==='weapon'){
    const current=player.weapons[key]?.level||0;
    if(current<=0)return;
    if(current===1){
      delete player.weapons[key];
      clearWeaponObjects(key);
      buildWeaponRack();
      renderDebugUI(formatText(TEXT.debug.removed,{name:WEAPONS[key].name}));
      return;
    }
    player.weapons[key].level=current-1;
    player.weapons[key].timer=0;
    if(key==='drone')game.drones.length=0;
    buildWeaponRack();
    renderDebugUI(formatText(TEXT.debug.downgraded,{name:WEAPONS[key].name,level:current-1}));
    return;
  }
  if(type==='stat'){
    const current=player.stats[key]||0;
    if(current<=0)return;
    player.stats[key]=current-1;
    if(key==='hp'){
      player.maxHp=Math.max(PLAYER_CFG.startHP,player.maxHp-PROG.hpPerUpgrade);
      player.hp=Math.min(player.hp,player.maxHp);
    }
    invalidateScaledWeaponConfigs();
    buildWeaponRack();
    updateHUD(true);
    renderDebugUI(formatText(TEXT.debug.downgraded,{name:STATS[key].name,level:current-1}));
  }
}

function debugRemoveSelectedWeapon(){
  if(debugUI.selectedType!=='weapon')return;
  const key=debugUI.selectedKey;
  if(!game.player.weapons[key])return;
  delete game.player.weapons[key];
  clearWeaponObjects(key);
  buildWeaponRack();
  renderDebugUI(formatText(TEXT.debug.removed,{name:WEAPONS[key].name}));
}

function clearWeaponObjects(key){
  const projectileTypes={
    shotgun:new Set(['pellet','core']),
    drone:new Set(['drone','missile'])
  };
  const types=projectileTypes[key];
  if(types)compactInPlace(game.projectiles,p=>!types.has(p.type),recycleProjectile);
  if(key==='boomerang')game.boomerangs.length=0;
  if(key==='flame')compactInPlace(game.zones,z=>z.type!=='flameJet');
  if(key==='lightning')game.lightning.length=0;
  if(key==='meteor'){
    game.meteors.length=0;
    compactInPlace(game.zones,z=>z.type!=='burn');
  }
  if(key==='mine'){
    game.mines.length=0;
    compactInPlace(game.zones,z=>z.type!=='acid');
  }
  if(key==='laser')game.beams.length=0;
  if(key==='drone')game.drones.length=0;
  if(key==='gravity'){
    game.gravityOrbs.length=0;
    game.wells.length=0;
  }
  const delayedTypes={lightning:new Set(['lightning']),meteor:new Set(['meteor']),gravity:new Set(['gravity']),laser:new Set(['laserMark']),mine:new Set(['mineChain'])}[key];if(delayedTypes)compactInPlace(game.delayedCasts,cast=>!delayedTypes.has(cast.type));
}

function clearAllSpecialWeaponObjects(){
  compactInPlace(game.projectiles,()=>false,recycleProjectile);
  game.boomerangs.length=0;
  game.beams.length=0;
  game.meteors.length=0;
  game.gravityOrbs.length=0;
  game.mines.length=0;
  game.wells.length=0;
  game.lightning.length=0;
  game.drones.length=0;
  game.delayedCasts.length=0;
  compactInPlace(game.zones,z=>!['flameJet','burn','acid'].includes(z.type));
}

function debugSetAllWeaponsMax(){
  if(!confirm(TEXT.debug.confirmAllWeapons))return;
  let index=0;
  for(const key of Object.keys(WEAPONS)){
    game.player.weapons[key]={level:SYS.maxUpgradeLevel,timer:index*.08};
    index++;
  }
  game.drones.length=0;
  buildWeaponRack();
  renderDebugUI(TEXT.debug.allWeaponsApplied);
}

function debugSetAllStatsMax(){
  if(!game)return;
  if(!confirm(TEXT.debug.confirmAllStats||'確定要把所有永久能力直接升到最高等級？'))return;
  const player=game.player;
  let hpDelta=0;
  for(const key of Object.keys(STATS)){
    const current=Math.max(0,Number(player.stats[key])||0),maximum=statMaxLevel(key);
    if(key==='hp')hpDelta=Math.max(0,maximum-current);
    player.stats[key]=maximum;
  }
  if(hpDelta>0){
    const gainedHp=(Number(PROG.hpPerUpgrade)||0)*hpDelta;
    player.maxHp+=gainedHp;
    player.hp=Math.min(player.maxHp,player.hp+gainedHp);
  }
  player.regenTimer=Math.min(player.regenTimer||hpRegenInterval(),hpRegenInterval());
  player.runExpTimer=Math.min(player.runExpTimer||runExpInterval(),runExpInterval());
  game.nextMapDrop=Math.min(game.nextMapDrop,DROP.nextDropDelayMax*mapDropCooldownMultiplier());
  invalidateScaledWeaponConfigs();
  buildWeaponRack();
  updateHUD(true);
  renderDebugUI(TEXT.debug.allStatsApplied||'所有永久能力皆已升至最高等級。');
}

function debugResetBaseOnly(){
  if(!confirm(TEXT.debug.confirmBaseOnly))return;
  game.player.weapons={};
  clearAllSpecialWeaponObjects();
  buildWeaponRack();
  renderDebugUI(TEXT.debug.baseOnlyApplied);
}

function debugToggleMode(key){
  if(key==='godMode'){
    const on=!game.debugModes.godMode;
    game.debugModes.godMode=on;
    if(on)game.player.hp=game.player.maxHp;
    updateHUD(true);
    renderDebugUI(on?TEXT.debug.godEnabled:TEXT.debug.godDisabled);
    return;
  }
  const on=!game.debugModes.effects[key];
  game.debugModes.effects[key]=on;
  if(key==='magnet')game.globalMagnet=on?Number.POSITIVE_INFINITY:0;
  else game.effects[key]=on?Number.POSITIVE_INFINITY:0;
  updateHUD(true);
  renderDebugUI(formatText(on?TEXT.debug.effectEnabled:TEXT.debug.effectDisabled,{
    name:key==='overload'?CFG.items.overload.name:key==='doublexp'?CFG.items.doublexp.name:key==='freeze'?CFG.items.freeze.name:CFG.items.magnet.name
  }));
}

function debugAdvanceMinute(){
  if(!game)return;
  const before=game.elapsed;
  game.elapsed=Math.min(game.duration,game.elapsed+DEBUG_CFG.advanceSeconds);
  if(game.elapsed>=game.duration)startFinalBossStage(false,true);
  updateHUD(true);
  const advanced=Math.round(game.elapsed-before);
  renderDebugUI(advanced>0?formatText(TEXT.debug.advanced,{seconds:advanced,time:fmtTime(game.elapsed)}):TEXT.debug.alreadyBoss);
}

function debugEnterBossStage(){
  if(!game)return;
  startFinalBossStage(true,true);
  updateHUD(true);
  renderDebugUI(TEXT.debug.enteredBoss);
}

function handleDebugSecretKey(event){
  if(state!=='paused'||event.repeat)return false;
  const sequence=String(DEBUG_CFG.secretSequence||'jami').toLowerCase();
  const key=String(event.key||'').toLowerCase();
  if(key.length!==1)return false;
  const now=performance.now();
  if(now-debugSecretLast>(DEBUG_CFG.secretTimeoutMs||3500))debugSecretBuffer='';
  debugSecretLast=now;
  debugSecretBuffer+=key;
  while(debugSecretBuffer&&!sequence.startsWith(debugSecretBuffer))debugSecretBuffer=debugSecretBuffer.slice(1);
  if(debugSecretBuffer===sequence){
    debugSecretBuffer='';
    openDebugUI();
    return true;
  }
  return false;
}

function openDebugUI(){
  if(!game||state!=='paused')return;
  ensureDebugUI();
  debugReturnState='paused';
  DOM.pause.classList.remove('show');
  state='debug';
  game.paused=true;
  mouse.held=false;
  debugUI.overlay.style.display='flex';syncFPSVisibility();
  renderDebugUI();
}
function closeDebugUI(){
  if(!debugUI||state!=='debug')return;
  debugUI.overlay.style.display='none';
  state='paused';
  game.paused=true;
  DOM.pause.classList.add('show');syncFPSVisibility();
  buildWeaponRack();
  renderPauseLoadout();
  last=performance.now();
}
function toggleDebugUI(){if(state==='debug')closeDebugUI();else if(state==='paused')openDebugUI()}

function bossIsAlive(){return !!game?.enemies?.some(enemy=>enemy.type==='boss'&&!enemy.dead)}
function lastRippleCost(){return Math.max(0,Number(LAST_RIPPLE.scoreCost)||1000)}
function showLastRipplePrompt(){
  if(!game||game.ended||game.lastRippleUsed||!game.bossSpawned||game.bossDefeated||!bossIsAlive())return false;
  const cost=lastRippleCost(),score=scoreBreakdown().score,canAfford=score>=cost;
  game.player.hp=0;state='lastRipplePrompt';mouse.active=false;mouse.held=false;syncFPSVisibility();
  if(DOM.lastRippleScore){DOM.lastRippleScore.textContent=canAfford?`目前分數 ${score.toLocaleString('zh-TW')}，啟動後剩餘 ${(score-cost).toLocaleString('zh-TW')} 分。`:`目前只有 ${score.toLocaleString('zh-TW')} 分，還差 ${(cost-score).toLocaleString('zh-TW')} 分。`;DOM.lastRippleScore.classList.toggle('insufficient',!canAfford)}
  if(DOM.lastRippleAccept)DOM.lastRippleAccept.disabled=!canAfford;
  DOM.lastRipple?.classList.add('show');updateHUD(true);return true;
}
function acceptLastRipple(){
  if(state!=='lastRipplePrompt'||!game||game.ended)return;
  const cost=lastRippleCost(),score=scoreBreakdown().score;if(score<cost){if(DOM.lastRippleAccept)DOM.lastRippleAccept.disabled=true;return}
  game.scoreAdjustment-=cost;game.lastRippleUsed=true;game.lastRippleActive=true;game.lastRippleRemaining=Math.max(0.1,Number(LAST_RIPPLE.durationSeconds)||10);game.lastRippleExpired=false;
  const player=game.player;player.hp=player.maxHp*clamp(Number(LAST_RIPPLE.restoreRatio) || 1,0,1);player.invuln=Math.max(player.invuln,Number(LAST_RIPPLE.invulnerabilitySeconds)||3);player.stationaryTime=0;
  DOM.lastRipple?.classList.remove('show');state='playing';last=performance.now();syncFPSVisibility();toast('最後的波紋！十秒內擊敗 Boss！',5000);updateHUD(true);
}
function declineLastRipple(){if(state!=='lastRipplePrompt'||!game||game.ended)return;DOM.lastRipple?.classList.remove('show');endGame(false)}
function clearBossBattleThreats(keepBossRewardGems=false){
  for(const shot of game.enemyShots)recycleEnemyShot(shot);game.enemyShots.length=0;
  for(const projectile of game.projectiles)recycleProjectile(projectile);game.projectiles.length=0;
  for(const enemy of game.enemies)enemy.dead=true;game.enemies.length=0;enemySpatial.clear();projectileSpatial.clear();
  compactInPlace(game.gems,gem=>keepBossRewardGems&&gem.bossReward===true,recycleGem);
  compactInPlace(game.particles,()=>false,recycleParticle);
  compactInPlace(game.texts,()=>false,recycleText);
  game.delayedCasts.length=0;
  game.beams.length=0;game.lightning.length=0;game.boomerangs.length=0;
  game.meteors.length=0;game.gravityOrbs.length=0;game.zones.length=0;
  game.mines.length=0;game.wells.length=0;game.waves.length=0;game.drones.length=0;
  game.mapDrops.length=0;game.denseTargets.length=0;
  game.globalMagnet=0;game.shakeAmplitude=0;game.shakeRemaining=0;
  for(const key of Object.keys(game.effects))game.effects[key]=0;
  if(game.debugModes?.effects)for(const key of Object.keys(game.debugModes.effects))game.debugModes.effects[key]=false;
  game.player.baseTimer=Number.POSITIVE_INFINITY;game.player.invuln=0;
  mouse.active=false;mouse.held=false;
  DOM.damageFlash?.classList.remove('on');DOM.toastLayer?.replaceChildren();
}
function startBossRewardPhase(x,y){
  game.bossDefeated=true;game.bossDefeatElapsed=game.elapsed;game.lastRippleActive=false;game.lastRippleRemaining=0;game.bossRewardPhase=true;game.bossRewardRemaining=Math.max(0.1,Number(BOSS_REWARD.pickupSeconds)||15);
  clearBossBattleThreats(false);
  const count=Math.max(1,Math.floor(Number(BOSS_REWARD.gemCount)||200)),value=Math.max(1,Number(BOSS_REWARD.expPerGem)||5),rings=Math.max(1,Math.floor(Number(BOSS_REWARD.rings)||10)),perRing=Math.max(1,Math.floor(Number(BOSS_REWARD.gemsPerRing)||20)),minRadius=Number(BOSS_REWARD.spreadRadiusMin)||180,maxRadius=Math.max(minRadius,Number(BOSS_REWARD.spreadRadiusMax)||640),pickupDelay=Math.max(0,Number(BOSS_REWARD.pickupDelaySeconds)||3),radiusJitter=Math.max(0,Number(BOSS_REWARD.radiusJitter)||32),angleJitter=Math.max(0,Number(BOSS_REWARD.angleJitterRadians)||0.08),ejectionSeconds=Math.max(0.2,Number(BOSS_REWARD.ejectionSeconds)||3),flightMin=Math.max(0.15,Number(BOSS_REWARD.flightDurationMin)||0.7),flightMax=Math.max(flightMin,Number(BOSS_REWARD.flightDurationMax)||1.25);
  const targets=[];
  for(let i=0;i<count;i++){const ring=Math.min(rings-1,Math.floor(i/perRing)),slot=i%perRing,baseRadius=rings<=1?minRadius:minRadius+(maxRadius-minRadius)*(ring/(rings-1)),radius=Math.max(minRadius,Math.min(maxRadius,baseRadius+rand(-radiusJitter,radiusJitter))),angle=slot/perRing*TAU+ring*0.31+rand(-angleJitter,angleJitter);targets.push({x:x+Math.cos(angle)*radius,y:y+Math.sin(angle)*radius})}
  for(let i=targets.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[targets[i],targets[j]]=[targets[j],targets[i]]}
  for(let i=0;i<count;i++){const flightDuration=rand(flightMin,flightMax),progress=count<=1?0:i/(count-1),launchDelay=progress*Math.max(0,ejectionSeconds-flightDuration),target=targets[i];spawnBossRewardGem(x,y,target.x,target.y,value,launchDelay,flightDuration,pickupDelay)}
  sound.play('victory');updateHUD(true);
}

function update(dt){
  if(state!=='playing'||!game||game.ended)return;
  const lootPhase=game.bossRewardPhase,p=game.player;
  game.elapsed+=dt;game.frameDeathParticleBudget=PERF.meteorDeathParticleBudgetPerFrame;game.frameGemMap.clear();
  let section=profilerStart();if(!lootPhase)updateEffects(dt);else clearBossBattleThreats(true);profilerEnd('update.effects',section);
  updateScreenShake(dt);p.invuln=Math.max(0,p.invuln-dt);
  const keyX=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0),keyY=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0);
  let dx=keyX+touch.x,dy=keyY+touch.y,moveScale=1;const manual=Math.hypot(dx,dy)>PLAYER_CFG.keyboardMouseDeadZone;if(manual)mouse.active=false;
  else if(mouse.active){const mx=mouse.targetX-p.x,my=mouse.targetY-p.y,md=Math.hypot(mx,my);if(md<PLAYER_CFG.mouseArrivalDistance){mouse.active=false;dx=dy=0}else{dx=mx/md;dy=my/md;moveScale=clamp(md/PLAYER_CFG.mouseSlowDistance,PLAYER_CFG.mouseMinimumMoveScale,1)}}
  const len=Math.hypot(dx,dy),isMoving=len>PLAYER_CFG.keyboardMouseDeadZone;if(isMoving){dx/=Math.max(1,len);dy/=Math.max(1,len);p.angle=Math.atan2(dy,dx)}
  const rippleMove=game.lastRippleActive?(Number(LAST_RIPPLE.moveSpeedMultiplier)||1.25):1,speed=p.baseSpeed*SPEED_MULT[p.stats.speed]*rippleMove;p.vx=dx*speed*moveScale;p.vy=dy*speed*moveScale;p.x+=p.vx*dt;p.y+=p.vy*dt;game.camera.x+=(p.x-game.camera.x)*Math.min(1,dt*PLAYER_CFG.cameraFollowRate);game.camera.y+=(p.y-game.camera.y)*Math.min(1,dt*PLAYER_CFG.cameraFollowRate);
  if(lootPhase){
    game.bossRewardRemaining=Math.max(0,game.bossRewardRemaining-dt);
    section=profilerStart();updateGems(dt,false);profilerEnd('update.gems',section);
    section=profilerStart();updateParticles(dt);profilerEnd('update.particles',section);
    game.hudTimer-=dt;if(game.hudTimer<=0){game.hudTimer=1/PERF.hudUpdatesPerSecond;updateHUD(false)}
    if(game.bossRewardRemaining<=0){game.bossRewardPhase=false;endGame(true)}return;
  }
  updatePassiveBonuses(dt,isMoving);if(game.lastRippleActive)game.lastRippleRemaining=Math.max(0,game.lastRippleRemaining-dt);
  section=profilerStart();updateSpawns(dt);profilerEnd('update.spawns',section);
  if(game.bossSpawned&&bossFightRemainingExact(game.elapsed)<=0){game.bossTimedOut=true;toast(TEXT.bossTimeoutToast);endGame(false);return}
  section=profilerStart();updateEnemies(dt);profilerEnd('update.enemies',section);
  section=profilerStart();rebuildEnemySpatial();profilerEnd('grid.enemies',section);
  game.denseTargetTimer-=dt;if(game.denseTargetTimer<=0){game.denseTargetTimer+=PERF.denseTargetRefreshSeconds;section=profilerStart();refreshDenseTargetCache();profilerEnd('grid.denseTargets',section)}
  section=profilerStart();updateWeapons(dt);profilerEnd('update.weapons',section);
  section=profilerStart();updateDelayedCasts(dt);profilerEnd('update.scheduler',section);
  section=profilerStart();updateProjectiles(dt);profilerEnd('update.projectiles',section);
  section=profilerStart();updateEnemyShots(dt);profilerEnd('update.enemyShots',section);
  section=profilerStart();updateSpecials(dt);profilerEnd('update.specials',section);
  section=profilerStart();updateGems(dt);profilerEnd('update.gems',section);
  section=profilerStart();updateMapDrops(dt);profilerEnd('update.mapDrops',section);
  section=profilerStart();updateParticles(dt);profilerEnd('update.particles',section);
  if(game.bossRewardPhase){clearBossBattleThreats(true);updateHUD(true);return}
  if(game.lastRippleActive&&game.lastRippleRemaining<=0&&!game.bossDefeated){game.lastRippleExpired=true;endGame(false);return}
  game.hudTimer-=dt;if(game.hudTimer<=0){game.hudTimer=1/PERF.hudUpdatesPerSecond;updateHUD(false)}
}

function updateEffects(dt){
  const effects=game.effects,player=game.player,regen=CFG.items.regen,debugModes=game.debugModes;
  if(debugModes?.godMode)player.hp=player.maxHp;
  if(debugModes?.effects){
    for(const key of ['overload','doublexp','freeze'])if(debugModes.effects[key])effects[key]=Number.POSITIVE_INFINITY;
    if(debugModes.effects.magnet)game.globalMagnet=Number.POSITIVE_INFINITY;
  }
  if(effects.regen>0){
    const heal=Math.min(dt*regen.maximumFlatPerSecond,player.maxHp*regen.healPercentPerSecond*dt);
    player.hp=Math.min(player.maxHp,player.hp+heal);
    effects.regen=Math.max(0,effects.regen-dt);
  }
  for(const key of ['shield','freeze','doublexp','overload']){
    if(effects[key]>0&&Number.isFinite(effects[key]))effects[key]=Math.max(0,effects[key]-dt);
  }
}

function updatePassiveBonuses(dt,isMoving){
  const player=game.player;
  if(!player)return;
  const regenLevel=statLevel('hpRegen');
  if(regenLevel>0){
    if(!Number.isFinite(player.regenTimer)||player.regenTimer<=0)player.regenTimer=hpRegenInterval();
    player.regenTimer-=dt;
    while(player.regenTimer<=0){
      player.hp=Math.min(player.maxHp,player.hp+hpRegenAmount());
      player.regenTimer+=hpRegenInterval();
    }
  }else player.regenTimer=Number(PROG.hpRegenBaseInterval)||5;

  if(isMoving){
    player.stationaryTime=0;
    const runLevel=statLevel('runExp');
    if(runLevel>0){
      player.runExpWarmup=(player.runExpWarmup||0)+dt;
      if(player.runExpWarmup>=runExpWarmupSeconds()){
        if(!Number.isFinite(player.runExpTimer)||player.runExpTimer<=0)player.runExpTimer=runExpInterval();
        player.runExpTimer-=dt;
        while(player.runExpTimer<=0){
          gainExp(runExpAmount());
          player.runExpTimer+=runExpInterval();
        }
      }else player.runExpTimer=runExpInterval();
    }else {
      player.runExpWarmup=0;
      player.runExpTimer=Number(PROG.runExpBaseInterval)||2;
    }
  }else{
    player.stationaryTime=(player.stationaryTime||0)+dt;
    player.runExpWarmup=0;
    player.runExpTimer=runExpInterval();
  }
}

function currentEnemyPhase(){return ENEMY_PHASES.find(p=>game.elapsed>=p.from&&game.elapsed<p.to)||ENEMY_PHASES[ENEMY_PHASES.length-1]}
function chooseEnemyForBudget(budget){
  const phase=currentEnemyPhase(),weighted=[];
  for(const [type,w] of Object.entries(phase.mix)){
    const def=ENEMIES[type];
    if(game.elapsed<def.from||def.cost>budget)continue;
    weighted.push([type,w]);
  }
  if(!weighted.length)return null;
  let total=weighted.reduce((sum,x)=>sum+x[1],0),roll=Math.random()*total;
  for(const [type,w] of weighted){roll-=w;if(roll<=0)return type}
  return weighted[weighted.length-1][0];
}
function runEnemyIntroductions(){
  for(const intro of ENEMY_INTROS){
    if(game.introFlags[intro.type]||game.elapsed<intro.time)continue;
    game.introFlags[intro.type]=true;
    for(let i=0;i<intro.count;i++)spawnEnemy(intro.type,'intro');
    toast(intro.label);
  }
}
function runGuaranteedRoles(dt){
  for(const [type,range] of Object.entries(ROLE_INTERVALS)){
    const def=ENEMIES[type];
    if(game.elapsed<def.from)continue;
    game.roleTimers[type]-=dt;
    if(game.roleTimers[type]<=0){
      spawnEnemy(type,'intro');
      game.roleTimers[type]=rand(range[0],range[1]);
    }
  }
}
function spawnMixedWavePack(){
  if(game.elapsed<SPAWN.mixedWaveStartSeconds)return;const phase=currentEnemyPhase(),types=Object.keys(phase.mix).filter(type=>type!=='rat'&&game.elapsed>=ENEMIES[type].from);if(!types.length)return;
  const primary=pick(types),secondary=types.length>1?pick(types.filter(type=>type!==primary)):null,countA=primary==='golem'?1:2;for(let i=0;i<countA;i++)spawnEnemy(primary,'intro');if(secondary)spawnEnemy(secondary,'intro');
}
function spawnRateAt(time){
  let previous=0;
  for(const segment of SPAWN.rateSegments){if(time<segment.until){const startTime=previous,span=Math.max(0.001,segment.until-startTime),t=clamp((time-startTime)/span,0,1),base=segment.start+(segment.end-segment.start)*t;return time<ENEMIES.hound.from?base*SPAWN.preHoundRateMultiplier:base}previous=segment.until}
  const late=SPAWN.lateRate,minute=time/SYS.secondsPerMinute,offset=minute-late.startMinute,base=Math.min(late.maximum,late.base+late.linear*offset+late.quadratic*offset*offset);return time<ENEMIES.hound.from?base*SPAWN.preHoundRateMultiplier:base;
}
function enemyCapAt(time){const segment=SPAWN.capSegments.find(item=>time<item.until)||SPAWN.capSegments[SPAWN.capSegments.length-1],cap=segment.cap;return time<ENEMIES.hound.from?Math.ceil(cap*SPAWN.preHoundCapMultiplier):cap}
function startFinalBossStage(clearField=false,fromDebug=false){
  game.elapsed=Math.max(game.elapsed,game.duration);
  if(game.bossFightStartedAt===null)game.bossFightStartedAt=game.duration;
  game.spawnBudget=0;
  if(clearField){
    game.enemies=game.enemies.filter(e=>e.type==='boss'&&!e.dead);
    game.enemyShots.length=0;
  }
  const livingBoss=game.enemies.some(e=>e.type==='boss'&&!e.dead);
  if(!livingBoss){
    game.bossSpawned=true;
    spawnEnemy('boss');
    toast(fromDebug?TEXT.bossArrivalDebugToast:TEXT.bossArrivalToast);
    sound.boom();
  }else game.bossSpawned=true;
}
function updateSpawns(dt){
  if(game.elapsed>=game.duration){startFinalBossStage(false,false);return}runEnemyIntroductions();runGuaranteedRoles(dt);game.wavePackTimer-=dt;
  if(game.wavePackTimer<=0){spawnMixedWavePack();game.wavePackTimer=rand(SPAWN.mixedWaveIntervalMin,SPAWN.mixedWaveIntervalMax)}
  const cap=enemyCapAt(game.elapsed);if(game.enemies.length<cap){game.spawnBudget+=dt*spawnRateAt(game.elapsed);let guard=0;while(game.spawnBudget>=1&&game.enemies.length<cap&&guard++<SPAWN.budgetLoopGuard){const type=chooseEnemyForBudget(game.spawnBudget);if(!type)break;spawnEnemy(type);game.spawnBudget-=ENEMIES[type].cost}}else game.spawnBudget=Math.min(game.spawnBudget,SPAWN.budgetWhenCapped);
}
function spawnEnemy(type,near){
  const def=ENEMIES[type],player=game.player;let x,y;if(game.spawnCounts)game.spawnCounts[type]=(game.spawnCounts[type]||0)+1;
if(near){
  const angle=Math.random()*TAU;

  let min;
  let max;

  if(near==='intro'){
    min=SPAWN.introSpawnDistanceMin;
    max=SPAWN.introSpawnDistanceMax;
  }else if(near==='boss'){
    min=BOSS.summon.spawnDistanceMin;
    max=BOSS.summon.spawnDistanceMax;
  }else{
    min=SPAWN.nearSpawnDistanceMin;
    max=SPAWN.nearSpawnDistanceMax;
  }

  const distance=rand(min,max);

  x=player.x+Math.cos(angle)*distance;
  y=player.y+Math.sin(angle)*distance;
}
  else{const angle=Math.random()*TAU,distance=Math.max(W,H)*SPAWN.normalSpawnDistanceScreenMultiplier+rand(SPAWN.normalSpawnExtraMin,SPAWN.normalSpawnExtraMax);x=player.x+Math.cos(angle)*distance;y=player.y+Math.sin(angle)*distance}
  const multiplier=type==='boss'?1:hpMult(game.elapsed),trackingLag=type==='hound'||type==='shadow',init=AI.initial,track=AI[type]||AI.hound;
  const enemy={type,x,y,r:def.r,hp:def.hp*multiplier,maxHp:def.hp*multiplier,speed:def.speed*speedMult(game.elapsed),damage:def.damage*dmgMult(game.elapsed),exp:def.exp,hitFlash:0,slow:0,slowAmt:0,freeze:0,stun:0,burn:0,burnDps:0,acidTick:0,ai:rand(init.aiMin,init.aiMax),state:'move',charge:0,shot:type==='boss'?BOSS.initialShotTimer:rand(init.shotMin,init.shotMax),dash:rand(init.dashMin,init.dashMax),vx:0,vy:0,bossSummonTriggered:Object.create(null),bossNovaTimer:type==='boss'?BOSS.initialNovaTimer:0,bossNovaCharge:0,bossBurstTimer:type==='boss'?BOSS.initialBurstTimer:0,bossBurstShots:0,bossBurstGap:0,bossBurstAngle:0,bossRingOffset:rand(0,TAU),variant:Math.random(),flip:Math.random()<init.flipChance?-1:1,trackingLag,awareness:trackingLag?rand(track.awarenessMin,track.awarenessMax):0,retargetTimer:trackingLag?rand(init.retargetMin,init.retargetMax):0,targetX:player.x,targetY:player.y,searchPause:0,dead:false};
  game.enemies.push(enemy);
  if(type==='boss')updateBossSummons(enemy,1,true);
  return enemy;
}

function bossSummonWaves(){
  return Array.isArray(BOSS.summon?.waves)?BOSS.summon.waves:[];
}
function summonBossWave(boss,wave,waveIndex){
  const units=Array.isArray(wave?.units)?wave.units:[];
  let spawned=0;
  for(const unit of units){
    const type=String(unit?.type||'').trim();
    const count=Math.max(0,Math.floor(Number(unit?.count)||0));
    if(!type||type==='boss'||!ENEMIES[type]||count<=0)continue;
    for(let i=0;i<count;i++){spawnEnemy(type,'boss');spawned++}
  }
  if(spawned>0){
    addWave(boss.x,boss.y,BOSS.summon.waveStartRadius,BOSS.summon.waveEndRadius,BOSS.summon.waveDuration,BOSS.summon.waveColor);
    sound.boom();
  }
  return spawned;
}
function updateBossSummons(boss,hpRatio,onSpawn=false){
  if(!boss||boss.dead)return;
  if(!boss.bossSummonTriggered)boss.bossSummonTriggered=Object.create(null);
  const waves=bossSummonWaves();
  for(let index=0;index<waves.length;index++){
    const wave=waves[index]||{};
    const key=String(wave.id||`wave-${index}`);
    if(boss.bossSummonTriggered[key])continue;
    const spawnWave=wave.onSpawn===true;
    const threshold=clamp(Number(wave.triggerHpRatio),0,1);
    const shouldTrigger=spawnWave?onSpawn:(!onSpawn&&hpRatio<=threshold);
    if(!shouldTrigger)continue;
    boss.bossSummonTriggered[key]=true;
    summonBossWave(boss,wave,index);
  }
}
function updateEnemies(dt){
  const p=game.player,freezeAll=game.effects.freeze>0;
  for(const e of game.enemies){
    if(e.dead)continue;e.hitFlash=Math.max(0,e.hitFlash-dt);e.stun=Math.max(0,e.stun-dt);e.freeze=Math.max(0,e.freeze-dt);e.slow=Math.max(0,e.slow-dt);
    if(e.burn>0){e.burn-=dt;e.ai-=dt;if(e.ai<=0){e.ai=AI.burnTickSeconds;damageEnemy(e,e.burnDps*AI.burnTickSeconds,'fire',false)}}if(e.dead)continue;
    const playerDx=p.x-e.x,playerDy=p.y-e.y,playerDist=Math.hypot(playerDx,playerDy)||1;let moveDx=playerDx,moveDy=playerDy;
    if(e.trackingLag){const cfg=AI[e.type];if(e.awareness>0){e.awareness-=dt;continue}e.searchPause=Math.max(0,e.searchPause-dt);e.retargetTimer-=dt;if(e.retargetTimer<=0){e.targetX=p.x;e.targetY=p.y;e.retargetTimer=rand(cfg.retargetMin,cfg.retargetMax)}moveDx=e.targetX-e.x;moveDy=e.targetY-e.y;if(Math.hypot(moveDx,moveDy)<cfg.arrivalDistance&&e.searchPause<=0){e.searchPause=rand(cfg.searchPauseMin,cfg.searchPauseMax);e.retargetTimer=0}}
    const moveDist=Math.hypot(moveDx,moveDy)||1,nx=moveDx/moveDist,ny=moveDy/moveDist,pxn=playerDx/playerDist,pyn=playerDy/playerDist;
    const frozen=freezeAll&&e.type!=='boss';if(e.type==='boss'&&freezeAll){e.slowAmt=Math.max(e.slowAmt,AI.bossFreezeSlowAmount);e.slow=AI.bossFreezeSlowDuration}if(frozen||e.freeze>0||e.stun>0)continue;
    const speed=e.speed*(e.slow>0?1-e.slowAmt:1);
    if(e.type==='spitter'){
      const cfg=AI.spitter;e.shot-=dt;if(playerDist>cfg.approachDistance){e.x+=pxn*speed*dt;e.y+=pyn*speed*dt}else if(playerDist<cfg.retreatDistance){e.x-=pxn*speed*cfg.retreatSpeedMultiplier*dt;e.y-=pyn*speed*cfg.retreatSpeedMultiplier*dt}else{const strafe=Math.sin(game.elapsed+e.ai)*speed*cfg.strafeMultiplier*dt;e.x+=-pyn*strafe;e.y+=pxn*strafe}
      if(e.shot<=0&&playerDist<cfg.attackRange){e.shot=cfg.shotCooldown;spawnEnemyShot(e.x,e.y,pxn,pyn,cfg.shotDamage*dmgMult(game.elapsed),cfg.shotSpeed,'orb')}
    }else if(e.type==='bloater'){
      const cfg=AI.bloater;if(e.state==='charge'){e.charge-=dt;if(e.charge<=0){enemyExplosion(e,cfg.explosionRadius,cfg.explosionDamage*dmgMult(game.elapsed));killEnemy(e,false);continue}}else if(playerDist<cfg.triggerDistance){e.state='charge';e.charge=cfg.chargeSeconds}else{e.x+=pxn*speed*dt;e.y+=pyn*speed*dt}
    }else if(e.type==='shadow'){
      const cfg=AI.shadow;if(e.state==='dash'){e.charge-=dt;e.x+=e.vx*dt;e.y+=e.vy*dt;if(e.charge<=0)e.state='move'}else{e.dash-=dt;if(e.dash<=0&&playerDist<cfg.dashTriggerRange){e.state='wind';e.charge=cfg.windupSeconds;e.vx=nx*cfg.dashSpeed;e.vy=ny*cfg.dashSpeed;e.dash=cfg.dashCooldown;addWave(e.x,e.y,cfg.warningStartRadius,cfg.warningEndRadius,cfg.warningDuration,cfg.warningColor)}else if(e.state==='wind'){e.charge-=dt;if(e.charge<=0){e.state='dash';e.charge=cfg.dashSeconds}}else if(e.searchPause<=0){e.x+=nx*speed*dt;e.y+=ny*speed*dt}}
    }else if(e.type==='hound'){if(e.searchPause<=0){e.x+=nx*speed*dt;e.y+=ny*speed*dt}}else{e.x+=pxn*speed*dt;e.y+=pyn*speed*dt}
    if(e.type==='boss'){
      const hpRatio=clamp(e.hp/e.maxHp,0,1),phase=hpRatio>BOSS.phaseThresholds[0]?1:hpRatio>BOSS.phaseThresholds[1]?2:hpRatio>BOSS.phaseThresholds[2]?3:4,index=phase-1,aim=Math.atan2(playerDy,playerDx),fan=BOSS.fan,burst=BOSS.burst,nova=BOSS.nova;
      e.shot-=dt;if(e.shot<=0){const count=fan.countByPhase[index],step=fan.stepByPhase[index],center=(count-1)/2;for(let i=0;i<count;i++){const angle=aim+(i-center)*step;spawnEnemyShot(e.x,e.y,Math.cos(angle),Math.sin(angle),fan.damageBase+phase*fan.damagePerPhase,fan.speedBase+phase*fan.speedPerPhase,'bossBolt')}e.shot=fan.cooldownByPhase[index]}
if(e.bossBurstShots>0){
  e.bossBurstGap-=dt;

  if(e.bossBurstGap<=0){
    const spearSpeed=
      burst.speedBase+
      phase*burst.speedPerPhase;

    /*
      每一發射出前，重新根據：
      1. 玩家最新座標
      2. 玩家目前移動速度
      3. 長槍飛行速度
      計算攔截點。
    */
    const predictedAngle=predictiveAimAngle(
      e.x,
      e.y,
      p,
      spearSpeed,
      burst.maxLeadSeconds??1.15,
      burst.predictionStrength??0.9
    );

    // 保留原本左右交錯的槍線
    const spread=e.bossBurstShots%2===0
      ? burst.spreadAlternating
      : -burst.spreadAlternating;

    const angle=predictedAngle+spread;

    spawnEnemyShot(
      e.x,
      e.y,
      Math.cos(angle),
      Math.sin(angle),
      burst.damageBase+phase*burst.damagePerPhase,
      spearSpeed,
      'bossSpear'
    );

    e.bossBurstShots--;
    e.bossBurstGap=burst.shotGap;
  }
}else{
  e.bossBurstTimer-=dt;

  if(e.bossBurstTimer<=0){
    e.bossBurstShots=burst.shotsByPhase[index];
    e.bossBurstGap=burst.initialGap;
    e.bossBurstTimer=burst.cooldownByPhase[index];

    addWave(
      e.x,
      e.y,
      burst.warningStartRadius,
      burst.warningEndRadius,
      burst.warningDuration,
      burst.warningColor
    );
  }
}
      if(e.bossNovaCharge>0){e.bossNovaCharge-=dt;if(e.bossNovaCharge<=0){const count=nova.countByPhase[index];e.bossRingOffset+=nova.ringRotationPerCast;for(let i=0;i<count;i++){const angle=e.bossRingOffset+i/count*TAU;spawnEnemyShot(e.x,e.y,Math.cos(angle),Math.sin(angle),nova.damageBase+phase*nova.damagePerPhase,nova.speedBase+phase*nova.speedPerPhase,'bossOrb')}sound.boom()}}
      else{e.bossNovaTimer-=dt;if(e.bossNovaTimer<=0){e.bossNovaCharge=nova.chargeSeconds;e.bossNovaTimer=nova.cooldownByPhase[index];addWave(e.x,e.y,nova.warningStartRadius,nova.warningEndRadius,nova.warningDuration,nova.warningColor)}}
      updateBossSummons(e,hpRatio,false);
    }
    const contact=e.r+p.r;if(playerDist<contact){hurtPlayer(e.damage);e.x-=pxn*PLAYER_CFG.contactPushDistance;e.y-=pyn*PLAYER_CFG.contactPushDistance}
  }
  compactInPlace(game.enemies,e=>!e.dead&&Math.abs(e.x-p.x)<SYS.offscreenDespawnDistance&&Math.abs(e.y-p.y)<SYS.offscreenDespawnDistance);
}

function hurtPlayer(amount){
  const player=game.player;if(game.debugModes?.godMode||player.invuln>0||game.effects.shield>0||game.bossRewardPhase)return;player.hp-=amount;player.invuln=PLAYER_CFG.contactInvulnerabilitySeconds;startScreenShake(PLAYER_CFG.damageShakeAmplitude,PLAYER_CFG.damageShakeDuration);DOM.damageFlash.classList.remove('on');void DOM.damageFlash.offsetWidth;DOM.damageFlash.classList.add('on');sound.hurt();
  addText(player.x,player.y+PLAYER_CFG.damageTextYOffset,`-${Math.round(amount)}`,VIS.damage.playerText,PLAYER_CFG.damageTextSize);
  for(let i=0;i<PLAYER_CFG.damageParticleCount;i++)particle(player.x,player.y,rand(PLAYER_CFG.damageParticleVelocityMin,PLAYER_CFG.damageParticleVelocityMax),rand(PLAYER_CFG.damageParticleVelocityMin,PLAYER_CFG.damageParticleVelocityMax),rand(PLAYER_CFG.damageParticleLifeMin,PLAYER_CFG.damageParticleLifeMax),VIS.damage.playerParticle,rand(PLAYER_CFG.damageParticleSizeMin,PLAYER_CFG.damageParticleSizeMax));
  if(player.hp<=0&&!showLastRipplePrompt())endGame(false);
}
function damageEnemy(enemy,amount,kind='normal',showText=true,knockback=0,sourceX=game.player.x,sourceY=game.player.y){
  if(enemy.dead)return;if(!Number.isFinite(amount)){console.error('Invalid damage amount:',amount,kind);amount=0}
  amount*=stationaryDamageMultiplier();if(game.lastRippleActive)amount*=Number(LAST_RIPPLE.damageMultiplier)||1.5;
  const previousHp=Math.max(0,enemy.hp),actualDamage=Math.max(0,Math.min(previousHp,amount));enemy.hp-=amount;enemy.hitFlash=VIS.damage.hitFlashSeconds;
  const rate=lifestealRate();if(rate>0&&actualDamage>0){const player=game.player;player.lifestealRemainder=(player.lifestealRemainder||0)+actualDamage*rate;const wholeHeal=Math.floor(player.lifestealRemainder+1e-9);if(wholeHeal>=1){player.lifestealRemainder-=wholeHeal;player.hp=Math.min(player.maxHp,player.hp+wholeHeal)}}
  if(showText&&Math.random()<VIS.damage.textChance){const critical=kind==='crit';addText(enemy.x+rand(-VIS.damage.textJitter,VIS.damage.textJitter),enemy.y-enemy.r,String(Math.round(amount)),critical?VIS.damage.textCritical:VIS.damage.textNormal,critical?VIS.damage.criticalTextSize:VIS.damage.normalTextSize)}
  if(knockback>0&&enemy.type!=='boss'){const distance=Math.hypot(enemy.x-sourceX,enemy.y-sourceY)||1,resistance=enemy.type==='golem'?AI.golemKnockbackResistance:1;enemy.x+=(enemy.x-sourceX)/distance*knockback*resistance;enemy.y+=(enemy.y-sourceY)/distance*knockback*resistance}if(enemy.hp<=0)killEnemy(enemy,true);
}
function killEnemy(enemy,drop=true){
  if(enemy.dead)return;enemy.dead=true;game.kills++;
  if(drop&&enemy.type!=='boss')spawnGem(enemy.x,enemy.y,enemy.exp);
  const d=VIS.damage,desired=Math.min(d.deathParticleMaximum,d.deathParticleBase+enemy.r/d.deathParticleRadiusDivisor),allowed=Math.max(0,Math.min(desired,game.frameDeathParticleBudget||0));game.frameDeathParticleBudget=Math.max(0,(game.frameDeathParticleBudget||0)-allowed);
  for(let i=0;i<allowed;i++)particle(enemy.x,enemy.y,rand(-d.deathParticleVelocity,d.deathParticleVelocity),rand(-d.deathParticleVelocity,d.deathParticleVelocity),rand(d.deathParticleLifeMin,d.deathParticleLifeMax),enemy.type==='spitter'?d.spitterParticle:d.enemyParticle,rand(d.deathParticleSizeMin,d.deathParticleSizeMax));
  if(enemy.type==='boss')startBossRewardPhase(enemy.x,enemy.y);
}
function enemyExplosion(enemy,radius,damage){const visual=VIS.enemyExplosion;addWave(enemy.x,enemy.y,visual.waveStart,radius,visual.waveDuration,visual.waveColor);if(Math.hypot(game.player.x-enemy.x,game.player.y-enemy.y)<radius+game.player.r)hurtPlayer(damage);sound.boom()}

function queueDelayedCast(delay,type,data){
  game.delayedCasts.push({delay,type,data,done:false});
}
function launchGravityOrb(spot,level){
  const player=game.player,levelCfg=weaponLevelConfig('gravity',level),cfg=levelCfg.projectile,dx=spot.x-player.x,dy=spot.y-player.y,distance=Math.hypot(dx,dy)||levelCfg.minimumRange;
  game.gravityOrbs.push({x:player.x,y:player.y,sx:player.x,sy:player.y,tx:spot.x,ty:spot.y,age:0,duration:clamp(cfg.durationBase+distance/cfg.distanceDivisor,cfg.durationMin,cfg.durationMax),level,spin:rand(0,TAU)});
}
function spawnMeteorAt(spot,level,big=false){const levelCfg=weaponLevelConfig('meteor',level),duration=big&&levelCfg.largeMeteor?levelCfg.largeMeteor.fallDuration:levelCfg.fallDuration;game.meteors.push({x:spot.x,y:spot.y,age:0,duration,level,big})}
function executeDelayedCast(cast){
  const data=cast.data;
  if(cast.type==='lightning'){
    const cfg=weaponLevelConfig('lightning',data.level),first=nearestEnemy(weaponSearchRange('lightning',cfg),null,data.exclude||null);if(first)chainLightning(first,data.level,data.maxHits,data.damage);
  }else if(cast.type==='meteor')spawnMeteorAt(data.spot,data.level,data.big);
  else if(cast.type==='gravity')launchGravityOrb(data.spot,data.level);
  else if(cast.type==='laserMark'){if(data.enemy&&!data.enemy.dead)damageEnemy(data.enemy,data.damage,'crit')}
  else if(cast.type==='mineChain'){if(data.mine&&!data.mine.dead)detonateMine(data.mine)}
}
function updateDelayedCasts(dt){
  for(const cast of game.delayedCasts){
    cast.delay-=dt;if(cast.delay<=0&&!cast.done){cast.done=true;executeDelayedCast(cast)}
  }
  compactInPlace(game.delayedCasts,cast=>!cast.done);
}

function updateWeapons(dt){
  const player=game.player,temporaryCooldownMultiplier=game.effects.overload>0?CFG.items.overload.cooldownMultiplier:1,rippleCooldownMultiplier=game.lastRippleActive?(Number(LAST_RIPPLE.cooldownMultiplier)||0.7):1,cooldownMultiplier=temporaryCooldownMultiplier*permanentWeaponCooldownMultiplier()*fullHpCooldownMultiplier()*rippleCooldownMultiplier,areaMultiplier=weaponAreaMultiplier(),sizeMultiplier=weaponSizeMultiplier();player.baseTimer-=dt;
  if(player.baseTimer<=0){player.baseTimer=BASE.cooldown*cooldownMultiplier;const target=nearestEnemy(BASE.range*areaMultiplier*(Number(PERF.weaponSearchRangeMultiplier)||1.1));if(target){const damage=BASE.baseDamage*(1+Math.min(game.level-PROG.startLevel,PROG.maxLevelDamageScalingLevel)*PROG.baseAttackDamagePerLevel);fireProjectile(player.x,player.y,target.x,target.y,damage,BASE.projectileSpeed,BASE.projectileRadius*sizeMultiplier,BASE.color,BASE.range*areaMultiplier,0,BASE.type,0,BASE.visualRadius?BASE.visualRadius*sizeMultiplier:undefined)}}
  for(const [key,weapon] of Object.entries(player.weapons)){weapon.timer=(weapon.timer||0)-dt;if(key==='orbit')continue;if(key==='drone'){updateDronesWeapon(weapon,dt,cooldownMultiplier);continue}if(weapon.timer<=0){triggerWeapon(key,weapon.level);weapon.timer=weaponCooldown(key,weapon.level)*cooldownMultiplier}}
}
function weaponCooldown(key,level){return weaponLevelConfig(key,level).cooldown}
function triggerWeapon(key,level){
  const player=game.player,levelCfg=weaponLevelConfig(key,level),needsTarget=!['mine','frost','hammer','meteor','gravity'].includes(key),target=needsTarget?nearestEnemy(weaponSearchRange(key,levelCfg)):null;if(!target&&needsTarget)return;const angle=target?Math.atan2(target.y-player.y,target.x-player.x):player.angle;
  if(key==='shotgun'){
    const c=levelCfg;for(let i=0;i<c.count;i++){const shotAngle=angle-c.spreadDegrees*Math.PI/360+c.spreadDegrees*Math.PI/180*(i/(c.count-1||1))+rand(-c.angleJitterRadians,c.angleJitterRadians);fireProjectile(player.x,player.y,player.x+Math.cos(shotAngle)*c.aimPointDistance,player.y+Math.sin(shotAngle)*c.aimPointDistance,c.damage,c.speed,c.projectileRadius,c.colorProjectile||CFG.weapons.shotgun.color,c.range,0,'pellet',c.knockback)}if(c.core){const core=c.core;fireProjectile(player.x,player.y,player.x+Math.cos(angle)*c.aimPointDistance,player.y+Math.sin(angle)*c.aimPointDistance,core.damage,core.speed,core.radius,core.color,core.range,core.pierce,'core',core.knockback,core.visualRadius??core.radius)}muzzle(player.x+Math.cos(angle)*c.muzzle.offset,player.y+Math.sin(angle)*c.muzzle.offset,c.muzzle.color,c.muzzle.particles);sound.shot();
  }else if(key==='boomerang'){
    const c=levelCfg;for(let i=0;i<c.count;i++){const shotAngle=angle+(i-(c.count-1)/2)*c.spreadRadians;game.boomerangs.push({x:player.x,y:player.y,vx:Math.cos(shotAngle)*c.speed,vy:Math.sin(shotAngle)*c.speed,age:0,returning:false,range:c.range,dmg:c.damage,r:c.radius,level,hitOut:new Set(),hitBack:new Set(),rot:0})}sound.play('boomerang');
  }else if(key==='flame'){
    const c=levelCfg,makeJet=direction=>({type:'flameJet',x:player.x,y:player.y,ang:direction,age:0,duration:c.duration,level,tick:0,emitTimer:0,flames:[]});for(let i=0;i<c.directionCount;i++)game.zones.push(makeJet(angle+i*Math.PI));sound.play('flame');
  }else if(key==='lightning'){
    const c=levelCfg,first=nearestEnemy(weaponSearchRange('lightning',c));if(first)chainLightning(first,level,c.maxHits,c.damage);for(let i=1;i<c.count;i++)queueDelayedCast(c.castSpacingSeconds*i,'lightning',{level,maxHits:c.maxHits,damage:c.damage,exclude:first});sound.play('lightning');
  }else if(key==='frost'){
    const c=levelCfg;aoe(player.x,player.y,c.radius,c.damage,enemy=>{enemy.slow=Math.max(enemy.slow,c.slowDuration);enemy.slowAmt=Math.max(enemy.slowAmt,c.slowAmount);const f=enemy.type==='boss'?c.freezeSeconds.boss:enemy.type==='golem'?c.freezeSeconds.golem:c.freezeSeconds.normal;if(f>0)enemy.freeze=Math.max(enemy.freeze,f)},c.knockback,'frost');addWave(player.x,player.y,c.visual.startRadius,c.radius,c.visual.duration,c.visual.color,'frost');sound.play('frost');
  }else if(key==='meteor'){
    const c=levelCfg,spots=getCachedMeteorSpots(c.count,c.minimumSeparation,c.minimumRange,c.maximumRange);for(let i=0;i<spots.length;i++){const data={spot:spots[i],level,big:!!c.largeMeteor&&i===spots.length-1};if(i===0)spawnMeteorAt(data.spot,data.level,data.big);else queueDelayedCast(c.castSpacingSeconds*i,'meteor',data)}sound.play('meteor');
  }else if(key==='mine'){
    const c=levelCfg;game.mines.push({x:player.x,y:player.y,r:c.radius,level,age:0});while(game.mines.length>c.maximumCount)game.mines.shift();
  }else if(key==='laser'){
    const c=levelCfg;for(let i=0;i<c.directionCount;i++)game.beams.push({x:player.x,y:player.y,ang:angle+i*Math.PI,age:0,duration:c.duration,level,tick:0});sound.play('laser');
  }else if(key==='hammer'){
    const c=levelCfg;aoe(player.x,player.y,c.radius,c.damage,enemy=>{if(c.stunSeconds>0)enemy.stun=Math.max(enemy.stun,c.stunSeconds)},c.knockback,'hammer');addWave(player.x,player.y,c.wave.startRadius,c.radius,c.wave.duration,c.wave.color);if(c.outerWave){const o=c.outerWave;game.waves.push({x:player.x,y:player.y,r:0,max:o.radius,age:-o.delay,dur:o.damageDuration,color:o.damageColor,damage:o.damage,hit:new Set(),hitKnockback:o.hitKnockback});game.waves.push({x:player.x,y:player.y,r:0,max:o.radius,age:-o.delay,dur:o.visualDuration,color:o.visualColor})}sound.boom();
  }else if(key==='gravity'){
    const c=levelCfg,spots=getDistinctEnemySpots(c.count,c.minimumSeparation,c.minimumRange,c.maximumRange);for(let i=0;i<spots.length;i++){if(i===0)launchGravityOrb(spots[i],level);else queueDelayedCast(c.castSpacingSeconds*i,'gravity',{spot:spots[i],level})}sound.play('gravity');
  }
}

function updateDronesWeapon(weapon,dt,cooldownMultiplier){
  const level=weapon.level,c=weaponLevelConfig('drone',level),count=c.count;if(game.drones.length!==count)game.drones=Array.from({length:count},(_,i)=>({angle:i/count*TAU,timer:rand(0,c.startShotTimerMax),missile:rand(0,c.startMissileTimerMax)}));
  for(const drone of game.drones){drone.angle+=dt*c.orbitSpeed;drone.timer-=dt;drone.missile-=dt;const x=game.player.x+Math.cos(drone.angle)*c.orbitRadius,y=game.player.y+Math.sin(drone.angle)*c.orbitRadius;if(drone.timer<=0){drone.timer=c.shotCooldown*cooldownMultiplier;const target=nearestEnemy(weaponSearchRange('drone',c));if(target)fireProjectile(x,y,target.x,target.y,c.damage,c.speed,c.projectileRadius,CFG.weapons.drone.color,c.projectileRange,c.pierce,'drone')}if(c.missile&&drone.missile<=0){const m=c.missile;drone.missile=m.cooldown*cooldownMultiplier;const target=nearestEnemy(Math.max(Number(c.projectileRange)||0,Number(m.targetRange)||0)*(Number(PERF.weaponSearchRangeMultiplier)||1.1));if(target)fireProjectile(x,y,target.x,target.y,m.damage,m.speed,m.radius,m.color,c.projectileRange,0,'missile',0,m.visualRadius??m.radius)}}
}

function fireProjectile(x,y,targetX,targetY,damage,speed,radius,color,maxRange=BASE.range,pierce=0,type='normal',knockback=0,visualRadius=radius){
  const angle=Math.atan2(targetY-y,targetX-x),projectile=objectPools.projectiles.pop()||{hit:new Set()};
  if(!projectile.hit)projectile.hit=new Set();else projectile.hit.clear();
  Object.assign(projectile,{
    x,y,px:x,py:y,
    vx:Math.cos(angle)*speed,
    vy:Math.sin(angle)*speed,
    travelSpeed:speed,
    damage,
    r:radius,
    visualR:Number.isFinite(visualRadius)?visualRadius:radius,
    color,
    age:0,
    maxRange:maxRange||BASE.range,
    pierce,
    type,
    knock:knockback,dead:false
  });
  game.projectiles.push(projectile);
}
function updateProjectiles(dt){
  const candidates=spatialScratch.projectile,visual=VIS.projectile,player=game.player;
  projectileSpatial.clear();
  for(const projectile of game.projectiles){
    projectile.dead=false;projectile.px=projectile.x;projectile.py=projectile.y;projectile.x+=projectile.vx*dt;projectile.y+=projectile.vy*dt;projectile.age+=(projectile.travelSpeed||Math.hypot(projectile.vx,projectile.vy))*dt;
    if(projectile.age<projectile.maxRange&&Math.abs(projectile.x-player.x)<SYS.projectileDespawnDistance&&Math.abs(projectile.y-player.y)<SYS.projectileDespawnDistance)projectileSpatial.insert(projectile);else projectile.dead=true;
  }
  const maximumProjectileRadius=projectileSpatial.maxRadius+visual.collisionPadding;
  for(const enemy of game.enemies){
    if(game.bossRewardPhase)break;if(enemy.dead)continue;projectileSpatial.queryCircle(enemy.x,enemy.y,enemy.r+maximumProjectileRadius,candidates);
    for(const projectile of candidates){
      if(projectile.dead||projectile.hit.has(enemy))continue;const radius=enemy.r+projectile.r,dx=enemy.x-projectile.x,dy=enemy.y-projectile.y;if(dx*dx+dy*dy>=radius*radius)continue;
      projectile.hit.add(enemy);damageEnemy(enemy,projectile.damage,projectile.type==='core'?'crit':'normal',true,projectile.knock,projectile.x,projectile.y);if(game.bossRewardPhase){projectile.dead=true;break}hitBurst(projectile.x,projectile.y,projectile.color);
      if(projectile.type==='core'){const core=weaponLevelConfig('shotgun',SYS.maxUpgradeLevel).core;aoe(projectile.x,projectile.y,core.explosionRadius,core.explosionDamage,null,core.explosionKnockback,'normal');addWave(projectile.x,projectile.y,core.waveStart,core.explosionRadius,core.waveDuration,core.waveColor)}
      if(projectile.type==='missile'){const missile=weaponLevelConfig('drone',SYS.maxUpgradeLevel).missile;aoe(projectile.x,projectile.y,missile.explosionRadius,missile.explosionDamage,null,missile.explosionKnockback,'normal');addWave(projectile.x,projectile.y,missile.waveStart,missile.explosionRadius,missile.waveDuration,missile.waveColor);projectile.dead=true;break}
      if(projectile.pierce>0)projectile.pierce--;else{projectile.dead=true;break}
    }
  }
  compactInPlace(game.projectiles,projectile=>!projectile.dead&&projectile.age<projectile.maxRange&&Math.abs(projectile.x-player.x)<SYS.projectileDespawnDistance&&Math.abs(projectile.y-player.y)<SYS.projectileDespawnDistance,recycleProjectile);projectileSpatial.clear();
}
function predictiveAimAngle(
  shooterX,
  shooterY,
  target,
  projectileSpeed,
  maxLeadSeconds=1.15,
  predictionStrength=0.9
){
  // 射擊者到玩家的相對位置
  const rx=target.x-shooterX;
  const ry=target.y-shooterY;

  // 玩家目前的實際移動速度
  const vx=Number(target.vx)||0;
  const vy=Number(target.vy)||0;

  const shotSpeed=Math.max(1,projectileSpeed);

  /*
    求解：
    |玩家相對位置 + 玩家速度 × t| = 投射物速度 × t

    展開後為：
    a·t² + b·t + c = 0
  */
  const a=vx*vx+vy*vy-shotSpeed*shotSpeed;
  const b=2*(rx*vx+ry*vy);
  const c=rx*rx+ry*ry;

  let interceptTime=0;

  // 接近一次方程式的特殊情況
  if(Math.abs(a)<0.000001){
    if(Math.abs(b)>0.000001){
      const candidate=-c/b;

      if(candidate>0){
        interceptTime=candidate;
      }
    }
  }else{
    const discriminant=b*b-4*a*c;

    if(discriminant>=0){
      const root=Math.sqrt(discriminant);
      const t1=(-b-root)/(2*a);
      const t2=(-b+root)/(2*a);

      // 只選擇未來時間，不能選負數
      if(t1>0&&t2>0){
        interceptTime=Math.min(t1,t2);
      }else if(t1>0){
        interceptTime=t1;
      }else if(t2>0){
        interceptTime=t2;
      }
    }
  }

  /*
    玩家移動速度高於長槍，而且正在遠離 Boss 時，
    可能不存在真正的攔截解。

    此時改用「目前距離 ÷ 子彈速度」估算。
  */
  if(!Number.isFinite(interceptTime)||interceptTime<=0){
    interceptTime=Math.sqrt(c)/shotSpeed;
  }

  // 避免距離太遠時預測到過於誇張的位置
  interceptTime=Math.min(
    interceptTime,
    Math.max(0,maxLeadSeconds)
  );

  // 允許只套用部分預測，降低 Boss 的必中感
  interceptTime*=clamp(predictionStrength,0,1);

  const predictedX=target.x+vx*interceptTime;
  const predictedY=target.y+vy*interceptTime;

  return Math.atan2(
    predictedY-shooterY,
    predictedX-shooterX
  );
}

function spawnEnemyShot(x,y,nx,ny,damage,speed,type){
  const radii=VIS.enemyShots.radius,radius=type==='bossSpear'?radii.bossSpear:type==='bossBolt'?radii.bossBolt:type==='bossOrb'?radii.bossOrb:type==='orb'?radii.spitterOrb:type==='wave'?radii.wave:radii.default,shot=objectPools.enemyShots.pop()||{};Object.assign(shot,{x,y,px:x,py:y,vx:nx*speed,vy:ny*speed,r:radius,damage,age:0,type});game.enemyShots.push(shot);
}
function updateEnemyShots(dt){
  const player=game.player,life=VIS.enemyShots.life;for(const shot of game.enemyShots){shot.px=shot.x;shot.py=shot.y;shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.age+=dt;if((shot.x-player.x)**2+(shot.y-player.y)**2<(shot.r+player.r)**2){hurtPlayer(shot.damage);shot.age=life.boss+life.default}}
  compactInPlace(game.enemyShots,shot=>shot.age<(shot.type==='bossSpear'?life.bossSpear:(shot.type==='bossBolt'||shot.type==='bossOrb'?life.boss:life.default)),recycleEnemyShot);
}
function orbitSpec(level,expand=0){const c=weaponLevelConfig('orbit',level);return {count:c.count,radius:c.radius+expand*c.expandRadius,size:c.bladeSize+expand*c.expandBladeSize,hit:c.hitRadius+expand*c.expandHitRadius}}
function spawnFlameParticle(zone,halfAngle,range){const cfg=weaponLevelConfig('flame',zone.level).particle,angle=zone.ang+rand(-halfAngle*cfg.spreadMultiplier,halfAngle*cfg.spreadMultiplier),life=rand(cfg.lifeMin,cfg.lifeMax),speed=rand(range*cfg.speedMinMultiplier,range*cfg.speedMaxMultiplier);zone.flames.push({x:zone.x+Math.cos(angle)*cfg.spawnOffset,y:zone.y+Math.sin(angle)*cfg.spawnOffset,vx:Math.cos(angle)*speed+rand(-cfg.velocityJitter,cfg.velocityJitter),vy:Math.sin(angle)*speed+rand(-cfg.velocityJitter,cfg.velocityJitter),life,max:life,size:rand(cfg.sizeMin,cfg.sizeMax),rot:angle+Math.PI/2,spin:rand(cfg.spinMin,cfg.spinMax),tone:Math.random()})}
function updateSpecials(dt){
  const player=game.player;
  const boomCandidates=spatialScratch.boomerang;
  for(const b of game.boomerangs){b.age+=dt;b.rot+=dt*weaponLevelConfig('boomerang',b.level).rotationSpeed;if(!b.returning&&b.age>weaponLevelConfig('boomerang',b.level).returnAfterSeconds)b.returning=true;if(b.returning){const angle=Math.atan2(player.y-b.y,player.x-b.x);b.vx+=(Math.cos(angle)*weaponLevelConfig('boomerang',b.level).returnSpeed-b.vx)*Math.min(1,dt*weaponLevelConfig('boomerang',b.level).returnSteerRate);b.vy+=(Math.sin(angle)*weaponLevelConfig('boomerang',b.level).returnSpeed-b.vy)*Math.min(1,dt*weaponLevelConfig('boomerang',b.level).returnSteerRate)}b.x+=b.vx*dt;b.y+=b.vy*dt;
    const hitSet=b.returning?b.hitBack:b.hitOut;queryEnemies(b.x,b.y,b.r+MAX_ENEMY_RADIUS,boomCandidates);for(const enemy of boomCandidates){if(enemy.dead||hitSet.has(enemy))continue;if((enemy.x-b.x)**2+(enemy.y-b.y)**2<(enemy.r+b.r)**2){hitSet.add(enemy);damageEnemy(enemy,b.dmg,'normal',true,weaponLevelConfig('boomerang',b.level).hitKnockback,b.x,b.y)}}
    if(b.returning&&Math.hypot(player.x-b.x,player.y-b.y)<weaponLevelConfig('boomerang',b.level).catchDistance){b.done=true;if(b.level>=SYS.maxUpgradeLevel){const burst=weaponLevelConfig('boomerang',b.level).returnBurst;aoe(player.x,player.y,burst.radius,burst.damage,null,burst.knockback,'normal');addWave(player.x,player.y,burst.waveStart,burst.radius,burst.waveDuration,burst.waveColor)}}
  }
  compactInPlace(game.boomerangs,b=>!b.done&&b.age<weaponLevelConfig('boomerang',b.level).maximumLife);

  const orbitWeapon=player.weapons.orbit;if(orbitWeapon){const level=orbitWeapon.level,cfg=weaponLevelConfig('orbit',level);game.orbitPhase=(game.orbitPhase||0)+dt*cfg.rotationSpeed;const expand=cfg.expandCycleSeconds>0?(Math.sin(game.elapsed*TAU/cfg.expandCycleSeconds)*0.5+0.5):0,spec=orbitSpec(level,expand),candidates=spatialScratch.orbit;
    for(let i=0;i<spec.count;i++){const angle=game.orbitPhase+i/spec.count*TAU,x=player.x+Math.cos(angle)*spec.radius,y=player.y+Math.sin(angle)*spec.radius;queryEnemies(x,y,spec.hit+MAX_ENEMY_RADIUS,candidates);for(const enemy of candidates){if(enemy.dead)continue;const key=String(i);enemy.orbitHits=enemy.orbitHits||{};if((enemy.orbitHits[key]||0)>game.elapsed)continue;if((enemy.x-x)**2+(enemy.y-y)**2<(enemy.r+spec.hit)**2){enemy.orbitHits[key]=game.elapsed+cfg.hitRepeatDelay;const damage=cfg.damage,knockback=cfg.knockback;damageEnemy(enemy,damage,'normal',false,knockback,player.x,player.y)}}}
  }

  const zoneCandidates=spatialScratch.flame,groundFx=VIS.groundParticles;
  for(const zone of game.zones){zone.age+=dt;zone.tick-=dt;
    if(zone.type==='flameJet'){
      zone.flames=zone.flames||[];zone.emitTimer=(zone.emitTimer??0)-dt;const flameCfg=weaponLevelConfig('flame',zone.level),active=zone.age<zone.duration,range=flameCfg.range,half=flameCfg.halfAngleDegrees*Math.PI/180;
      if(active){zone.x=player.x;zone.y=player.y;const target=nearestEnemy(weaponSearchRange('flame',flameCfg));if(target){const targetAngle=Math.atan2(target.y-player.y,target.x-player.x),maximumTurn=dt*flameCfg.turnRadiansPerSecond;zone.ang+=clamp(angleDiff(zone.ang,targetAngle),-maximumTurn,maximumTurn)}
        if(zone.emitTimer<=0){const particleCfg=flameCfg.particle,level4=zone.level>=4;zone.emitTimer+=level4?particleCfg.emitIntervalLevel4:particleCfg.emitIntervalBase;const count=level4?particleCfg.countLevel4:particleCfg.countBase,cap=level4?particleCfg.capLevel4:particleCfg.capBase;for(let i=0;i<count&&zone.flames.length<cap;i++)spawnFlameParticle(zone,half,range*particleCfg.rangeMultiplier)}
        if(zone.tick<=0){zone.tick=flameCfg.tickSeconds;queryEnemies(zone.x,zone.y,range+MAX_ENEMY_RADIUS,zoneCandidates);for(const enemy of zoneCandidates){if(enemy.dead)continue;const dx=enemy.x-zone.x,dy=enemy.y-zone.y;if(dx*dx+dy*dy>=range*range)continue;if(Math.abs(angleDiff(zone.ang,Math.atan2(dy,dx)))<half){damageEnemy(enemy,flameCfg.damage,'fire',false);if(flameCfg.burnDuration>0){enemy.burn=Math.max(enemy.burn,flameCfg.burnDuration);enemy.burnDps=flameCfg.burnDamagePerSecond}}}}
      }
      for(const flame of zone.flames){flame.life-=dt;flame.x+=flame.vx*dt;flame.y+=flame.vy*dt;flame.rot+=flame.spin*dt;const drag=Math.pow(flameCfg.particle.dragBase,dt);flame.vx*=drag;flame.vy*=drag}compactInPlace(zone.flames,flame=>flame.life>0);
    }else if(zone.type==='burn'||zone.type==='acid'){
      zone.visualTick=(zone.visualTick??0)-dt;const isBurn=zone.type==='burn';if(zone.visualTick<=0){zone.visualTick+=zone.particleInterval;const angle=rand(0,TAU),radius=Math.sqrt(Math.random())*zone.r*groundFx.radiusMultiplier,x=zone.x+Math.cos(angle)*radius,y=zone.y+Math.sin(angle)*radius*groundFx.ellipseYMultiplier;
        if(isBurn)particle(x,y,rand(-groundFx.burnVx,groundFx.burnVx),rand(groundFx.burnVyMin,groundFx.burnVyMax),rand(groundFx.burnLifeMin,groundFx.burnLifeMax),pick(groundFx.burnColors),rand(groundFx.sizeMin,groundFx.sizeMax));else particle(x,y,rand(-groundFx.acidVx,groundFx.acidVx),rand(groundFx.acidVyMin,groundFx.acidVyMax),rand(groundFx.acidLifeMin,groundFx.acidLifeMax),pick(groundFx.acidColors),rand(groundFx.sizeMin,groundFx.sizeMax));
      }
      if(zone.tick<=0){zone.tick=zone.tickSeconds;queryEnemies(zone.x,zone.y,zone.r+MAX_ENEMY_RADIUS,zoneCandidates);for(const enemy of zoneCandidates){if(enemy.dead)continue;if((enemy.x-zone.x)**2+(enemy.y-zone.y)**2<(enemy.r+zone.r)**2){damageEnemy(enemy,zone.damage,isBurn?'fire':'acid',false);if(!isBurn&&zone.slow){enemy.slow=zone.slowDuration;enemy.slowAmt=zone.slowAmount}}}}
    }
  }
  compactInPlace(game.zones,zone=>zone.type==='flameJet'?(zone.age<zone.duration||zone.flames.length>0):zone.age<zone.duration);

  const beamCandidates=spatialScratch.beam;
  for(const beam of game.beams){beam.age+=dt;beam.tick-=dt;beam.x=player.x;beam.y=player.y;const laserCfg=weaponLevelConfig('laser',beam.level),target=nearestEnemy(weaponSearchRange('laser',laserCfg));if(target&&laserCfg.trackingRadiansPerSecond>0){const targetAngle=Math.atan2(target.y-player.y,target.x-player.x);beam.ang+=clamp(angleDiff(beam.ang,targetAngle),-dt*laserCfg.trackingRadiansPerSecond,dt*laserCfg.trackingRadiansPerSecond)}
    if(beam.tick<=0){beam.tick=laserCfg.tickSeconds;const length=laserCfg.range,width=laserCfg.width,endX=beam.x+Math.cos(beam.ang)*length,endY=beam.y+Math.sin(beam.ang)*length,midX=(beam.x+endX)/2,midY=(beam.y+endY)/2;queryEnemies(midX,midY,length/2+width+MAX_ENEMY_RADIUS,beamCandidates);for(const enemy of beamCandidates){if(enemy.dead)continue;if(pointLineDistance(enemy.x,enemy.y,beam.x,beam.y,endX,endY)<enemy.r+width/2){damageEnemy(enemy,laserCfg.damage,'laser',false);if(laserCfg.markCount>0){enemy.laserMark=(enemy.laserMark||0)+1;if(enemy.laserMark===laserCfg.markCount)queueDelayedCast(laserCfg.markDelaySeconds,'laserMark',{enemy,damage:laserCfg.markDamage})}}}}
  }
  compactInPlace(game.beams,beam=>beam.age<beam.duration);

  for(const meteor of game.meteors){const meteorCfg=weaponLevelConfig('meteor',meteor.level);meteor.age+=dt;if(meteor.age<0||meteor.hit)continue;if(meteor.age<meteor.duration)continue;meteor.hit=true;const large=meteor.big&&meteorCfg.largeMeteor,impactRadius=large?large.radius:meteorCfg.radius,damage=large?large.damage:meteorCfg.damage,stunSeconds=large?large.stunSeconds:meteorCfg.stunSeconds;
    aoe(meteor.x,meteor.y,impactRadius,damage,enemy=>{if(stunSeconds>0)enemy.stun=stunSeconds},meteorCfg.knockback,'meteor',false);addWave(meteor.x,meteor.y,meteorCfg.impact.waveStart,impactRadius,meteorCfg.impact.waveDuration,meteorCfg.impact.waveColor);startScreenShake(large?meteorCfg.impact.shakeLarge:meteorCfg.impact.shakeNormal,large?meteorCfg.impact.shakeDurationLarge:meteorCfg.impact.shakeDurationNormal);
    const burstCount=large?PERF.meteorImpactParticles+PERF.meteorLargeExtraParticles:PERF.meteorImpactParticles;for(let i=0;i<burstCount;i++)particle(meteor.x,meteor.y,rand(-meteorCfg.impact.particleVelocity,meteorCfg.impact.particleVelocity),rand(-meteorCfg.impact.particleVelocity,meteorCfg.impact.particleVelocity),rand(meteorCfg.impact.particleLifeMin,meteorCfg.impact.particleLifeMax),pick(meteorCfg.impact.particleColors),rand(meteorCfg.impact.particleSizeMin,meteorCfg.impact.particleSizeMax));
    game.zones.push({type:'burn',x:meteor.x,y:meteor.y,r:impactRadius,age:0,duration:meteorCfg.burnDuration,damage:large?large.burnDamage:meteorCfg.burnDamage,tick:meteorCfg.burnStartTick,tickSeconds:meteorCfg.burnTickSeconds,particleInterval:meteorCfg.burnParticleInterval,visualAlpha:meteorCfg.burnVisualAlpha,visualTick:0});if(game.elapsed-game.lastMeteorBoom>meteorCfg.impact.boomMergeWindow){game.lastMeteorBoom=game.elapsed;sound.boom()};
  }
  compactInPlace(game.meteors,meteor=>{const c=weaponLevelConfig('meteor',meteor.level);return !meteor.hit||meteor.age<meteor.duration+c.impact.waveDuration});

  const mineCandidates=spatialScratch.mine;for(const mine of game.mines){const mineCfg=weaponLevelConfig('mine',mine.level);mine.age+=dt;let trigger=null;queryEnemies(mine.x,mine.y,mineCfg.triggerRadius+MAX_ENEMY_RADIUS,mineCandidates);for(const enemy of mineCandidates){if(!enemy.dead&&(enemy.x-mine.x)**2+(enemy.y-mine.y)**2<(enemy.r+mineCfg.triggerRadius)**2){trigger=enemy;break}}if((trigger||mine.age>=mineCfg.autoDetonateSeconds)&&!mine.dead)detonateMine(mine)}compactInPlace(game.mines,mine=>!mine.dead);

  for(const orb of game.gravityOrbs){const levelCfg=weaponLevelConfig('gravity',orb.level),cfg=levelCfg.projectile;orb.age+=dt;orb.spin+=dt*cfg.spinSpeed;const t=clamp(orb.age/orb.duration,0,1),ease=1-Math.pow(1-t,3);orb.x=orb.sx+(orb.tx-orb.sx)*ease;orb.y=orb.sy+(orb.ty-orb.sy)*ease-Math.sin(t*Math.PI)*cfg.arcHeight;if(Math.random()<dt*cfg.particleRatePerSecond)particle(orb.x,orb.y,rand(-cfg.particleVelocity,cfg.particleVelocity),rand(-cfg.particleVelocity,cfg.particleVelocity),rand(cfg.particleLifeMin,cfg.particleLifeMax),pick(cfg.particleColors),rand(cfg.particleSizeMin,cfg.particleSizeMax));if(t>=1&&!orb.done){orb.done=true;game.wells.push({x:orb.tx,y:orb.ty,r:levelCfg.wellRadius,age:0,duration:levelCfg.wellDuration,level:orb.level,tick:0});addWave(orb.tx,orb.ty,levelCfg.arrival.waveStart,levelCfg.arrival.waveEnd,levelCfg.arrival.waveDuration,levelCfg.arrival.waveColor);startScreenShake(levelCfg.arrival.shakeAmplitude,levelCfg.arrival.shakeDuration)}}compactInPlace(game.gravityOrbs,orb=>!orb.done);

  const wellCandidates=spatialScratch.well;for(const well of game.wells){const wellCfg=weaponLevelConfig('gravity',well.level);well.age+=dt;well.tick-=dt;if(well.tick<=0){well.tick=wellCfg.tickSeconds;queryEnemies(well.x,well.y,well.r+MAX_ENEMY_RADIUS,wellCandidates);for(const enemy of wellCandidates){if(enemy.dead)continue;const dx=well.x-enemy.x,dy=well.y-enemy.y,distance=Math.hypot(dx,dy)||1;if(distance<well.r){const pull=wellCfg.pull*(enemy.type==='boss'||enemy.type==='golem'?wellCfg.heavyPullMultiplier:1);enemy.x+=dx/distance*pull*wellCfg.tickSeconds;enemy.y+=dy/distance*pull*wellCfg.tickSeconds;damageEnemy(enemy,wellCfg.tickDamage,'gravity',false)}}}}
  for(const well of game.wells)if(well.age>=well.duration&&!well.boom){const wellCfg=weaponLevelConfig('gravity',well.level);well.boom=true;aoe(well.x,well.y,well.r,wellCfg.finalDamage,null,wellCfg.finalKnockback,'gravity');addWave(well.x,well.y,wellCfg.finalWave.startRadius,well.r,wellCfg.finalWave.duration,wellCfg.finalWave.color)}compactInPlace(game.wells,well=>{const c=weaponLevelConfig('gravity',well.level);return well.age<well.duration+c.finalWave.duration});

  const waveCandidates=spatialScratch.wave;for(const wave of game.waves){wave.age+=dt;if(wave.age<0)continue;const previous=wave.r;wave.r=Math.min(wave.max,wave.max*(wave.age/wave.dur));if(wave.damage){queryEnemies(wave.x,wave.y,wave.r+MAX_ENEMY_RADIUS,waveCandidates);for(const enemy of waveCandidates){if(enemy.dead||wave.hit.has(enemy))continue;const distance=Math.hypot(enemy.x-wave.x,enemy.y-wave.y);if(distance>=previous-enemy.r&&distance<=wave.r+enemy.r){wave.hit.add(enemy);damageEnemy(enemy,wave.damage,'hammer',true,wave.hitKnockback||0,wave.x,wave.y)}}}}compactInPlace(game.waves,wave=>wave.age<wave.dur);
  for(const lightning of game.lightning)lightning.age+=dt;compactInPlace(game.lightning,lightning=>lightning.age<lightning.duration);
}
function detonateMine(mine){const c=weaponLevelConfig('mine',mine.level);mine.dead=true;aoe(mine.x,mine.y,mine.r,c.explosionDamage,null,c.explosionKnockback,'acid');game.zones.push({type:'acid',x:mine.x,y:mine.y,r:mine.r,age:0,duration:c.acidDuration,damage:c.acidDamage,tick:c.acidStartTick,tickSeconds:c.acidTickSeconds,particleInterval:c.acidParticleInterval,slow:c.acidSlowDuration>0,slowDuration:c.acidSlowDuration,slowAmount:c.acidSlowAmount,visualAlpha:null,visualTick:0});addWave(mine.x,mine.y,c.wave.startRadius,mine.r,c.wave.duration,c.wave.color);if(c.chainRange>0){for(const other of game.mines){if(other!==mine&&!other.dead&&Math.hypot(other.x-mine.x,other.y-mine.y)<c.chainRange)queueDelayedCast(c.chainDelaySeconds,'mineChain',{mine:other})}}}

function chainLightning(first,level,maxHits,damage){const c=weaponLevelConfig('lightning',level),used=new Set(),points=[{x:game.player.x,y:game.player.y}],candidates=spatialScratch.lightning;let current=first;for(let i=0;i<maxHits&&current;i++){used.add(current);points.push({x:current.x,y:current.y});damageEnemy(current,damage,'lightning',true);if(c.stunSeconds>0)current.stun=Math.max(current.stun,c.stunSeconds);let next=null,best=c.jumpRange*c.jumpRange;queryEnemies(current.x,current.y,c.jumpRange+MAX_ENEMY_RADIUS,candidates);for(const enemy of candidates){if(enemy.dead||used.has(enemy))continue;const distance=(enemy.x-current.x)**2+(enemy.y-current.y)**2;if(distance<best){best=distance;next=enemy}}current=next}game.lightning.push({pts:points,paths:buildLightningPathFrames(points,c.visual),age:0,duration:c.visualDuration,level})}
function aoe(x,y,r,damage,fn,knock=0,kind='normal',showText=true){
  const candidates=spatialScratch.aoe;queryEnemies(x,y,r+MAX_ENEMY_RADIUS,candidates);
  for(const e of candidates){if(e.dead)continue;if((e.x-x)**2+(e.y-y)**2<(r+e.r)**2){damageEnemy(e,damage,kind,showText,knock,x,y);if(fn&&!e.dead)fn(e)}}
}
function pointLineDistance(px,py,x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,l2=dx*dx+dy*dy;if(!l2)return Math.hypot(px-x1,py-y1);const t=clamp(((px-x1)*dx+(py-y1)*dy)/l2,0,1),x=x1+t*dx,y=y1+t*dy;return Math.hypot(px-x,py-y)}

function nearestEnemy(range=PERF.fallbackSearchRange,list=game.enemies,exclude=null){const player=game.player;let best=null,bestDistance=range*range,source=list||game.enemies;if((!list||list===game.enemies)&&enemySpatial.count>0&&Number.isFinite(range)&&range<=PERF.nearestSpatialMaximumRange)source=queryEnemies(player.x,player.y,range+MAX_ENEMY_RADIUS,spatialScratch.nearest);for(const enemy of source){if(enemy.dead||enemy===exclude)continue;const distance=(enemy.x-player.x)**2+(enemy.y-player.y)**2;if(distance<bestDistance){bestDistance=distance;best=enemy}}return best}
function clampPointToRange(x,y,minRange,maxRange){const player=game.player,dx=x-player.x,dy=y-player.y,distance=Math.hypot(dx,dy),angle=distance>PERF.pointRangeEpsilon?Math.atan2(dy,dx):(Number.isFinite(player.angle)?player.angle:Math.random()*TAU),clamped=clamp(distance||minRange,minRange,maxRange);return {x:player.x+Math.cos(angle)*clamped,y:player.y+Math.sin(angle)*clamped}}
function recycleDenseCandidate(candidate){if(candidate&&denseCandidatePool.length<PERF.denseCandidatePoolLimit)denseCandidatePool.push(candidate)}
function insertDenseCandidate(cache,candidate){
  let pos=cache.length,displaced=null;
  if(pos>=DENSE_TARGET_LIMIT&&candidate.score<=cache[pos-1].score){recycleDenseCandidate(candidate);return}
  if(pos<DENSE_TARGET_LIMIT)cache.push(candidate);
  else{pos=DENSE_TARGET_LIMIT-1;displaced=cache[pos]}
  while(pos>0&&cache[pos-1].score<candidate.score){cache[pos]=cache[pos-1];pos--}
  cache[pos]=candidate;
  if(displaced)recycleDenseCandidate(displaced);
}
function refreshDenseTargetCache(){if(!game)return;const cache=game.denseTargets;for(const candidate of cache)recycleDenseCandidate(candidate);cache.length=0;if(!enemySpatial.count){game.denseTargetUpdated=game.elapsed;return}const player=game.player,maxRange=weaponLevelConfig('gravity',1).maximumRange+PERF.spatialCellSize*PERF.denseSearchPaddingCells,maxSquared=maxRange*maxRange;
  enemySpatial.forEachActiveBucket(bucket=>{if(!bucket.length)return;let sumX=0,sumY=0;for(const enemy of bucket){sumX+=enemy.x;sumY+=enemy.y}const x=sumX/bucket.length,y=sumY/bucket.length,dx=x-player.x,dy=y-player.y;if(dx*dx+dy*dy>maxSquared)return;const cx=Math.floor(x/enemySpatial.cellSize),cy=Math.floor(y/enemySpatial.cellSize);let score=bucket.length*PERF.denseBucketBaseWeight;
    for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){if(!ox&&!oy)continue;const neighbor=enemySpatial.getBucket(cx+ox,cy+oy);if(neighbor)score+=neighbor.length*((ox===0||oy===0)?PERF.denseAxialNeighborWeight:PERF.denseDiagonalNeighborWeight)}
    const candidate=denseCandidatePool.pop()||{};candidate.x=x;candidate.y=y;candidate.score=score;insertDenseCandidate(cache,candidate)});game.denseTargetUpdated=game.elapsed;
}
function densestEnemySpot(skip=0,exclude=[],minRange=0,maxRange=Infinity){if(!game.denseTargets.length||game.elapsed-game.denseTargetUpdated>PERF.denseTargetRefreshSeconds*PERF.denseCacheStaleMultiplier)refreshDenseTargetCache();const start=game.denseTargets.length?skip%game.denseTargets.length:0,minSeparationSquared=PERF.denseTargetMinimumScoreDistance**2;for(let offset=0;offset<game.denseTargets.length;offset++){const source=game.denseTargets[(start+offset)%game.denseTargets.length],candidate=clampPointToRange(source.x,source.y,minRange,maxRange);let separated=true;for(const point of exclude){const dx=point.x-candidate.x,dy=point.y-candidate.y;if(dx*dx+dy*dy<minSeparationSquared){separated=false;break}}if(separated)return candidate}const target=nearestEnemy(maxRange===Infinity?PERF.fallbackSearchRange:maxRange)||nearestEnemy(PERF.fallbackSearchRange);return target?clampPointToRange(target.x,target.y,minRange,maxRange):null}
function getCachedMeteorSpots(count,minDistance=weaponLevelConfig('meteor',1).minimumSeparation,minRange=weaponLevelConfig('meteor',1).minimumRange,maxRange=weaponLevelConfig('meteor',1).maximumRange){const output=[],minimumSquared=minDistance*minDistance,player=game.player,cache=game.denseTargets;for(let i=0;i<cache.length&&output.length<count;i++){const source=cache[i],dx=source.x-player.x,dy=source.y-player.y,distance=Math.hypot(dx,dy)||minRange,angle=Math.atan2(dy,dx),clamped=clamp(distance,minRange,maxRange),x=player.x+Math.cos(angle)*clamped,y=player.y+Math.sin(angle)*clamped;let separated=true;for(const point of output){const sx=point.x-x,sy=point.y-y;if(sx*sx+sy*sy<minimumSquared){separated=false;break}}if(separated)output.push({x,y})}
  const base=Number.isFinite(player.angle)?player.angle:0,distance=clamp(PERF.meteorFallbackDistance,minRange,maxRange);for(let attempt=0;output.length<count&&attempt<PERF.meteorFallbackAttempts;attempt++){const ring=Math.floor(attempt/2)+1,side=attempt%2?1:-1,angle=base+side*ring*PERF.meteorFallbackAngleStep,x=player.x+Math.cos(angle)*distance,y=player.y+Math.sin(angle)*distance;let separated=true;for(const point of output){const sx=point.x-x,sy=point.y-y;if(sx*sx+sy*sy<minimumSquared){separated=false;break}}if(separated)output.push({x,y})}return output;
}
function getDistinctEnemySpots(count,minDistance=weaponLevelConfig('gravity',1).minimumSeparation,minRange=0,maxRange=Infinity){const output=[],minimumSquared=minDistance*minDistance;for(let i=0;i<count;i++){const spot=densestEnemySpot(i*PERF.distinctSpotSkipMultiplier,output,minRange,maxRange);if(!spot)continue;let separated=true;for(const point of output){const dx=point.x-spot.x,dy=point.y-spot.y;if(dx*dx+dy*dy<minimumSquared){separated=false;break}}if(separated)output.push(spot)}const target=nearestEnemy(maxRange===Infinity?PERF.fallbackSearchRange:maxRange)||nearestEnemy(PERF.fallbackSearchRange);if(target&&!output.length)output.push(clampPointToRange(target.x,target.y,minRange,maxRange));while(target&&output.length<count){const anchor=clampPointToRange(target.x,target.y,minRange,maxRange),baseAngle=Math.atan2(anchor.y-game.player.y,anchor.x-game.player.x),distance=Math.hypot(anchor.x-game.player.x,anchor.y-game.player.y);let placed=false;for(let attempt=1;attempt<=PERF.distinctFallbackAttempts&&!placed;attempt++){const side=attempt%2?1:-1,offset=Math.ceil(attempt/2)*PERF.distinctFallbackAngleStep*side,candidate={x:game.player.x+Math.cos(baseAngle+offset)*distance,y:game.player.y+Math.sin(baseAngle+offset)*distance};let separated=true;for(const point of output){const dx=point.x-candidate.x,dy=point.y-candidate.y;if(dx*dx+dy*dy<minimumSquared){separated=false;break}}if(separated){output.push(candidate);placed=true}}if(!placed)break}return output.slice(0,count)}

function spawnGem(x,y,value,forceSeparate=false,pickupDelay=0,bossReward=false){
  const cfg=DROP.exp,cx=Math.floor(x/PERF.gemMergeCellSize),cy=Math.floor(y/PERF.gemMergeCellSize),key=(cx+PERF.spatialKeyOffset)*PERF.spatialKeyMultiplier+(cy+PERF.spatialKeyOffset),allowMerge=PERF.gemMergeEnabled&&!forceSeparate,existing=allowMerge?game.frameGemMap.get(key):null,radiusFor=v=>v>=cfg.largeValue?cfg.radiusLarge:v>=cfg.mediumValue?cfg.radiusMedium:cfg.radiusSmall;
  if(existing&&!existing.dead){existing.value+=value;existing.r=radiusFor(existing.value);return existing}
  const gem=objectPools.gems.pop()||{};
  Object.assign(gem,{x,y,baseX:x,baseY:y,value,r:radiusFor(value),vx:0,vy:0,age:0,spin:rand(0,TAU),dead:false,pickupDelay:Math.max(0,Number(pickupDelay)||0),bossReward:bossReward===true,ballistic:false,launched:true,airborne:false,height:0,flightDelay:0,flightDuration:0,flightAge:0,flightGravity:0,flightVx:0,flightVy:0,flightVz:0,launchX:x,launchY:y,groundX:x,groundY:y});
  game.gems.push(gem);if(allowMerge)game.frameGemMap.set(key,gem);return gem
}
function spawnBossRewardGem(originX,originY,targetX,targetY,value,launchDelay,flightDuration,pickupDelay){
  const gem=spawnGem(originX,originY,value,true,pickupDelay,true),duration=Math.max(0.15,Number(flightDuration)||0.8),gravity=Math.max(1,Number(BOSS_REWARD.gravity)||920),originJitter=Math.max(0,Number(BOSS_REWARD.launchOriginJitter)||16),launchX=originX+rand(-originJitter,originJitter),launchY=originY+rand(-originJitter,originJitter);
  Object.assign(gem,{x:launchX,y:launchY,baseX:targetX,baseY:targetY,groundX:targetX,groundY:targetY,launchX,launchY,ballistic:true,launched:false,airborne:true,height:0,flightDelay:Math.max(0,Number(launchDelay)||0),flightDuration:duration,flightAge:0,flightGravity:gravity,flightVx:(targetX-launchX)/duration,flightVy:(targetY-launchY)/duration,flightVz:gravity*duration*0.5});
  return gem
}
function updateGems(dt,openReward=true){
  const player=game.player,radius=PICKUP_RAD[player.stats.pickup],cfg=DROP.exp;
  for(const gem of game.gems){
    gem.age+=dt;gem.spin+=dt*cfg.spinSpeed;
    if(gem.ballistic){
      if(!gem.launched){
        if(gem.age<gem.flightDelay)continue;
        gem.launched=true;gem.flightAge=Math.max(0,gem.age-gem.flightDelay);
      }else if(gem.airborne)gem.flightAge+=dt;
      if(gem.airborne){
        const flightTime=Math.min(gem.flightAge,gem.flightDuration);
        gem.x=gem.launchX+gem.flightVx*flightTime;
        gem.y=gem.launchY+gem.flightVy*flightTime;
        gem.height=Math.max(0,gem.flightVz*flightTime-0.5*gem.flightGravity*flightTime*flightTime);
        if(gem.flightAge>=gem.flightDuration){gem.airborne=false;gem.height=0;gem.x=gem.groundX;gem.y=gem.groundY;gem.baseX=gem.groundX;gem.baseY=gem.groundY;gem.vx=0;gem.vy=0}
        else continue;
      }
    }
    if(gem.age<gem.pickupDelay){gem.vx=0;gem.vy=0;if(!gem.ballistic){gem.x=gem.baseX;gem.y=gem.baseY}continue}
    const dx=player.x-gem.x,dy=player.y-gem.y,distance=Math.hypot(dx,dy)||1;
    if(game.globalMagnet>0||distance<radius){
      const force=game.globalMagnet>0?cfg.globalMagnetForce:clamp(cfg.localForceBase+(radius-distance)*cfg.localForcePerPixel,cfg.localForceMin,cfg.localForceMax);
      gem.vx+=(dx/distance*force-gem.vx)*Math.min(1,dt*cfg.velocityLerpRate);gem.vy+=(dy/distance*force-gem.vy)*Math.min(1,dt*cfg.velocityLerpRate);gem.x+=gem.vx*dt;gem.y+=gem.vy*dt
    }else{
      gem.vx*=Math.max(0,1-dt*cfg.idleDragRate);gem.vy*=Math.max(0,1-dt*cfg.idleDragRate);gem.x+=(gem.baseX-gem.x)*Math.min(1,dt*cfg.returnRate);gem.y+=(gem.baseY-gem.y)*Math.min(1,dt*cfg.returnRate)
    }
    if(Math.hypot(player.x-gem.x,player.y-gem.y)<player.r+cfg.pickupExtraRadius){gainExp(gem.value,openReward);gem.dead=true;sound.pickup()}
  }
  game.globalMagnet=Math.max(0,game.globalMagnet-dt);compactInPlace(game.gems,gem=>!gem.dead,recycleGem)
}
function randomMapDropKey(){const entries=Object.entries(DROP.mapItemWeights||{}).filter(([key,weight])=>ITEMS[key]&&Number(weight)>0);if(!entries.length)return 'heal';const total=entries.reduce((sum,[,weight])=>sum+Number(weight),0);let roll=Math.random()*total;for(const [key,weight] of entries){roll-=Number(weight);if(roll<=0)return key}return entries[entries.length-1][0]}
function spawnMapDrop(){const key=randomMapDropKey(),player=game.player,angle=Math.random()*TAU,distance=Math.max(W,H)*(DROP.mapDistanceScreenBase+Math.random()*DROP.mapDistanceScreenRandom),x=player.x+Math.cos(angle)*distance+rand(-DROP.mapPositionJitter,DROP.mapPositionJitter),y=player.y+Math.sin(angle)*distance+rand(-DROP.mapPositionJitter,DROP.mapPositionJitter);game.mapDrops.push({x,y,key,r:DROP.mapRadius,age:0,life:DROP.mapLifetime,bob:rand(0,TAU),vx:0,vy:0});while(game.mapDrops.length>DROP.mapMaximumCount)game.mapDrops.shift()}
function updateMapDrops(dt){game.nextMapDrop-=dt;if(game.nextMapDrop<=0){spawnMapDrop();game.nextMapDrop=rand(DROP.nextDropDelayMin,DROP.nextDropDelayMax)*mapDropCooldownMultiplier()}const player=game.player,radius=PICKUP_RAD[player.stats.pickup]*DROP.mapPickupRadiusMultiplier;for(const drop of game.mapDrops){drop.age+=dt;drop.bob+=dt*DROP.mapBobSpeed;const dx=player.x-drop.x,dy=player.y-drop.y,distance=Math.hypot(dx,dy)||1;if(distance<radius){const force=clamp(DROP.mapAttractForceBase+(radius-distance)*DROP.mapAttractForcePerPixel,DROP.mapAttractForceMin,DROP.mapAttractForceMax);drop.vx+=(dx/distance*force-drop.vx)*Math.min(1,dt*DROP.mapVelocityLerpRate);drop.vy+=(dy/distance*force-drop.vy)*Math.min(1,dt*DROP.mapVelocityLerpRate);drop.x+=drop.vx*dt;drop.y+=drop.vy*dt}if(distance<player.r+drop.r-DROP.mapPickupOverlapReduction){applyItem(drop.key);drop.dead=true;sound.pickup()}if(drop.age>drop.life)drop.dead=true}compactInPlace(game.mapDrops,drop=>!drop.dead)}
function gainExp(value,openReward=true){const gained=value*(game.effects.doublexp>0?CFG.items.doublexp.multiplier:1);game.totalExp+=gained;game.exp+=gained;while(game.exp>=game.need){game.exp-=game.need;game.level++;game.need=needXP(game.level);game.pendingLevels++}if(openReward&&game.pendingLevels>0&&state==='playing')openLevelUp()}

function openLevelUp(){
  if(!game || game.ended)return;

  // 先產生選項，不要先進入升級狀態
  const choices=generateRewards();

  // 所有項目都已升滿，或目前沒有可選項目
  if(!choices.length){
    game.rewardChoices=[];
    game.pendingLevels=0;

    DOM.rewardCards.innerHTML='';
    DOM.level.classList.remove('show');

    state='playing';
    last=performance.now();

    toast('所有武器與永久升級皆已達上限');
    updateHUD(true);
    return;
  }

  state='level';
  sound.level();

  game.rewardChoices=choices;
  DOM.rewardCards.innerHTML='';

  game.rewardChoices.forEach((reward,index)=>{
    const card=document.createElement('button');

    card.className='reward-card';
    card.style.setProperty('--accent',reward.color);
    card.style.setProperty(
      '--accent-soft',
      hexToRgba(reward.color,PROG.rewardCardAccentAlpha)
    );

    card.innerHTML=`
      <span class="keycap">${index+1}</span>
      <img src="${reward.icon}" alt="">
      <span class="category">${reward.categoryLabel}</span>
      <h3>${reward.name}</h3>
      <span class="level-note">${reward.levelNote||''}</span>
      <p>${reward.desc}</p>
    `;

    card.onclick=()=>chooseReward(index);
    DOM.rewardCards.append(card);
  });

  DOM.level.classList.add('show');
  updateHUD(true);
}
function generateRewards(){const player=game.player,candidates=[];for(const [key,weapon] of Object.entries(WEAPONS)){const level=player.weapons[key]?.level||0;if(level>=SYS.maxUpgradeLevel)continue;if(level===0&&Object.keys(player.weapons).length>=SYS.maxWeaponSlots)continue;candidates.push({type:'weapon',key,name:weapon.name,icon:weapon.icon,color:weapon.color,categoryLabel:TEXT.rewardCategoryWeapon,levelNote:level?formatText(TEXT.rewardLevelTransition,{from:level,to:level+1}):TEXT.rewardNewWeapon,desc:weapon.desc[level]})}
  for(const [key,stat] of Object.entries(STATS)){
    if(key==='revive')continue;
    const level=player.stats[key]||0,maxLevel=Number(stat.maxLevel)||SYS.maxUpgradeLevel;
    if(level>=maxLevel)continue;
    let description=stat.desc,levelNote=formatText(TEXT.rewardLevelTransition,{from:level,to:Math.min(level+1,maxLevel)});
    if(key==='speed')description=formatText(PROG.speedDescriptionTemplate,{from:SPEED_MULT[level].toFixed(1),to:SPEED_MULT[level+1].toFixed(1)});
    candidates.push({type:'stat',key,name:stat.name,icon:stat.icon,color:stat.color,categoryLabel:TEXT.rewardCategoryBoost,levelNote,desc:description,maxLevel});
  }
  const output=[];if(candidates.length)output.push(pick(candidates));const pool=candidates.filter(entry=>!output.some(existing=>existing.type===entry.type&&existing.key===entry.key));while(output.length<SYS.rewardChoiceCount&&pool.length){const index=(Math.random()*pool.length)|0;output.push(pool.splice(index,1)[0])}return output.sort(()=>Math.random()-0.5)}
function chooseReward(index){if(state!=='level'||!game.rewardChoices[index])return;const reward=game.rewardChoices[index],player=game.player;if(reward.type==='weapon'){if(!player.weapons[reward.key])player.weapons[reward.key]={level:1,timer:0};else player.weapons[reward.key].level++;triggerWeapon(reward.key,player.weapons[reward.key].level);toast(formatText(TEXT.rewardToast,{name:reward.name,level:player.weapons[reward.key].level}))}else if(reward.type==='stat'){player.stats[reward.key]++;if(reward.key==='hp'){player.maxHp+=PROG.hpPerUpgrade;player.hp=Math.min(player.maxHp,player.hp+PROG.hpPerUpgrade)}if(reward.key==='dropCooldown')game.nextMapDrop*=Math.max(0.05,1-(Number(PROG.mapDropCooldownReductionPerLevel)||0));if(reward.key==='hpRegen')player.regenTimer=Math.min(player.regenTimer||hpRegenInterval(),hpRegenInterval());invalidateScaledWeaponConfigs();toast(formatText(TEXT.rewardToast,{name:reward.name,level:player.stats[reward.key]}))}game.pendingLevels--;DOM.level.classList.remove('show');buildWeaponRack();updateHUD(true);if(game.pendingLevels>0)setTimeout(openLevelUp,PROG.nextLevelDelayMs);else{state='playing';last=performance.now()}}
function applyItem(key){const player=game.player,effects=game.effects,item=CFG.items[key];if(key==='heal')player.hp=Math.min(player.maxHp,player.hp+item.heal);else if(key==='regen')effects.regen=item.duration;else if(key==='shield')effects.shield=item.duration;else if(key==='magnet')game.globalMagnet=item.duration;else if(key==='freeze')effects.freeze=item.duration;else if(key==='doublexp')effects.doublexp=item.duration;else if(key==='overload')effects.overload=item.duration;else if(key==='bomb'){for(const enemy of game.enemies)damageEnemy(enemy,enemy.type==='boss'?Math.min(item.bossMaximumDamage,enemy.hp*item.bossHPPercent):item.normalDamage,'crit',false)}else if(key==='push'){for(const enemy of game.enemies){const dx=enemy.x-player.x,dy=enemy.y-player.y,distance=Math.hypot(dx,dy)||1;if(distance<Math.max(W,H)*item.screenRangeMultiplier){enemy.x+=dx/distance*item.pushDistance;enemy.y+=dy/distance*item.pushDistance;enemy.stun=item.stunSeconds}}const visual=VIS.itemPushWave;addWave(player.x,player.y,visual.startRadius,Math.max(W,H)*item.waveRangeMultiplier,item.waveDuration,visual.color)}toast(ITEMS[key].name)}

function passiveLevelLabel(level){return formatText(TEXT.pauseLevel||TEXT.weaponLevel||'Lv.{level}',{level})}
function ownedPermanentStats(){
  if(!game)return [];
  return Object.entries(game.player.stats).filter(([key,level])=>Number(level)>0&&STATS[key]);
}
function buildPassiveRack(){
  if(!game||!DOM.passiveRack)return;
  const entries=ownedPermanentStats();
  DOM.passiveRack.innerHTML='';
  DOM.passiveRack.classList.toggle('hidden',entries.length===0);
  for(const [key,rawLevel] of entries){
    const level=Math.max(1,Number(rawLevel)||1),definition=STATS[key],slot=document.createElement('div');
    slot.className='weapon-slot passive-slot';
    slot.style.setProperty('--passive-accent',definition.color||'#ffffff');
    slot.title=`${definition.name} ${passiveLevelLabel(level)}`;
    slot.innerHTML=`<img src="${definition.icon}" alt="${definition.name}"><b>${passiveLevelLabel(level)}</b>`;
    DOM.passiveRack.append(slot);
  }
}
function makePauseLoadoutItem({name,icon,color,level,description}){
  const item=document.createElement('article');
  item.className='pause-loadout-item';
  item.style.setProperty('--item-accent',color||'#ffffff');
  const image=document.createElement('img');image.src=icon;image.alt=name;
  const copy=document.createElement('div');copy.className='pause-loadout-item-copy';
  const title=document.createElement('div');title.className='pause-loadout-item-title';
  const heading=document.createElement('h4');heading.textContent=name;
  const badge=document.createElement('span');badge.className='pause-loadout-level';badge.textContent=passiveLevelLabel(level);
  const desc=document.createElement('p');desc.textContent=description||'';
  title.append(heading,badge);copy.append(title,desc);item.append(image,copy);
  return item;
}
function renderPauseLoadout(){
  if(!game||!DOM.pauseWeaponsList||!DOM.pausePassivesList)return;
  const weapons=Object.entries(game.player.weapons);
  const passives=ownedPermanentStats();
  DOM.pauseWeaponsList.innerHTML='';DOM.pausePassivesList.innerHTML='';
  DOM.pauseWeaponsCount.textContent=formatText(TEXT.pauseWeaponsCount||'{count} / {max}',{count:weapons.length,max:SYS.maxWeaponSlots});
  DOM.pausePassivesCount.textContent=formatText(TEXT.pausePassivesCount||'已取得 {count} 項',{count:passives.length});
  if(!weapons.length){
    const empty=document.createElement('div');empty.className='pause-loadout-empty';empty.textContent=TEXT.pauseEmptyWeapons||'尚未取得額外武器。';DOM.pauseWeaponsList.append(empty);
  }else{
    for(const [key,weapon] of weapons){
      const definition=WEAPONS[key],level=Math.max(1,weapon.level||1),descriptions=definition.desc||[],description=descriptions[Math.min(descriptions.length-1,level-1)]||definition.name;
      DOM.pauseWeaponsList.append(makePauseLoadoutItem({name:definition.name,icon:definition.icon,color:definition.color,level,description}));
    }
  }
  if(!passives.length){
    const empty=document.createElement('div');empty.className='pause-loadout-empty';empty.textContent=TEXT.pauseEmptyPassives||'尚未取得永久升級。';DOM.pausePassivesList.append(empty);
  }else{
    for(const [key,rawLevel] of passives){
      const definition=STATS[key],level=Math.max(1,Number(rawLevel)||1);
      DOM.pausePassivesList.append(makePauseLoadoutItem({name:definition.name,icon:definition.icon,color:definition.color,level,description:definition.desc}));
    }
  }
}
function buildWeaponRack(){
  if(!game)return;
  DOM.weaponRack.innerHTML='';
  const entries=Object.entries(game.player.weapons),visual=VIS.weaponRack;
  const slotCount=Math.max(SYS.maxWeaponSlots,entries.length);
  DOM.weaponRack.style.flexWrap=entries.length>SYS.maxWeaponSlots?'wrap':'nowrap';
  DOM.weaponRack.style.justifyContent='flex-end';
  DOM.weaponRack.style.maxWidth=entries.length>SYS.maxWeaponSlots?`${Math.min(6,slotCount)*(visual.slotWidth||58)+Math.min(5,slotCount-1)*8}px`:'';
  for(let i=0;i<slotCount;i++){
    const slot=document.createElement('div');
    slot.className='weapon-slot'+(i>=entries.length?' empty':'');
    if(i<entries.length){
      const [key,weapon]=entries[i],definition=WEAPONS[key];
      slot.innerHTML=`<img src="${definition.icon}" alt=""><b>${formatText(TEXT.weaponLevel,{level:weapon.level})}</b>`;
    }else{
      slot.innerHTML=`<span style="display:grid;place-items:center;height:${visual.emptyIconHeight}px;color:${visual.emptyIconColor}">${visual.emptySymbol}</span><b>${TEXT.emptyWeaponSlot}</b>`;
    }
    DOM.weaponRack.append(slot);
  }
  buildPassiveRack();
  if(state==='paused')renderPauseLoadout();
}
function updateHUD(force=false){if(!game)return;ensureEffectNodes();const player=game.player,bossStage=game.bossSpawned||game.elapsed>=game.duration,loot=game.bossRewardPhase,ripple=game.lastRippleActive,remaining=fmtTime(bossStage?bossFightRemainingExact(game.elapsed):game.duration-game.elapsed),hpPct=`${clamp(player.hp/player.maxHp*100,0,100).toFixed(2)}%`,hpText=formatText(TEXT.hudHp,{current:fmtHp(player.hp),max:fmtHp(player.maxHp)}),expPct=`${clamp(game.exp/game.need*100,0,100).toFixed(2)}%`,expText=formatText(TEXT.hudExp,{current:Math.floor(game.exp),need:game.need});DOM.timerWrap?.classList.toggle('hidden',loot);setTextIfChanged('timer',DOM.timer,remaining);setTextIfChanged('timerLabel',DOM.timerLabel,bossStage?(TEXT.bossTimerLabel||'BOSS 戰鬥倒數'):TEXT.timerLabel);setTextIfChanged('score',DOM.score,scoreBreakdown().score.toLocaleString('zh-TW'));setTextIfChanged('level',DOM.levelText,game.level);setTextIfChanged('kills',DOM.kills,game.kills);setStyleIfChanged('hpPct',DOM.hpFill,'width',hpPct);setTextIfChanged('hpText',DOM.hpText,hpText);setStyleIfChanged('expPct',DOM.expFill,'width',expPct);setTextIfChanged('expText',DOM.expText,expText);
  if(DOM.phaseBanner){const visible=loot||ripple;DOM.phaseBanner.classList.toggle('hidden',!visible);DOM.phaseBanner.classList.toggle('loot',loot);if(visible){if(loot){DOM.phaseBannerTitle.textContent=`${Math.max(0,Math.ceil(game.bossRewardRemaining))}秒後進行遊戲結算`;DOM.phaseBannerTime.textContent='';DOM.phaseBannerCopy.textContent=''}else{DOM.phaseBannerTitle.textContent='最後的波紋';DOM.phaseBannerTime.textContent=game.lastRippleRemaining.toFixed(1);DOM.phaseBannerCopy.textContent='傷害 +50%｜移速 +25%｜冷卻 -30%｜擊敗 Boss 即解除死亡倒數。'}}}
  for(const [key,value] of Object.entries(game.effects)){const item=effectNodes.get(key);if(!item)continue;const active=value>0;if(item.visible!==active){item.visible=active;item.node.style.display=active?'flex':'none'}if(active){const timeText=formatText(TEXT.effectTime,{seconds:Number.isFinite(value)?value.toFixed(1):'∞'});if(item.lastText!==timeText){item.time.textContent=timeText;item.lastText=timeText}}}}

function particle(x,y,vx,vy,life,color,size){
  if(game.particles.length>=MAX_PARTICLES)return;
  const p=objectPools.particles.pop()||{};Object.assign(p,{x,y,vx,vy,life,max:life,color,size});game.particles.push(p);
}
function updateParticles(dt){const cfg=VIS.particles;for(const particle of game.particles){particle.life-=dt;particle.x+=particle.vx*dt;particle.y+=particle.vy*dt;particle.vx*=Math.pow(cfg.velocityDragBase,dt);particle.vy*=Math.pow(cfg.velocityDragBase,dt)}compactInPlace(game.particles,particle=>particle.life>0,recycleParticle);for(const text of game.texts){text.life-=dt;text.y-=cfg.damageTextRiseSpeed*dt}compactInPlace(game.texts,text=>text.life>0,recycleText)}
function addText(x,y,text,color=VIS.damage.textNormal,size=VIS.damage.normalTextSize){if(game.texts.length>=MAX_DAMAGE_TEXTS)return;const item=objectPools.texts.pop()||{},life=VIS.particles.damageTextLife;Object.assign(item,{x,y,text,color,size,life,max:life});game.texts.push(item)}
function hitBurst(x,y,color,count=5){const cfg=VIS.particles;for(let i=0;i<count;i++)particle(x,y,rand(-cfg.hitBurstVelocity,cfg.hitBurstVelocity),rand(-cfg.hitBurstVelocity,cfg.hitBurstVelocity),rand(cfg.hitBurstLifeMin,cfg.hitBurstLifeMax),color,rand(cfg.hitBurstSizeMin,cfg.hitBurstSizeMax))}
function muzzle(x,y,color,count){const cfg=VIS.particles;for(let i=0;i<count;i++)particle(x,y,rand(-cfg.muzzleVelocity,cfg.muzzleVelocity),rand(-cfg.muzzleVelocity,cfg.muzzleVelocity),rand(cfg.muzzleLifeMin,cfg.muzzleLifeMax),color,rand(cfg.muzzleSizeMin,cfg.muzzleSizeMax))}
function addWave(x,y,start,max,dur,color,style='ring'){game.waves.push({x,y,r:start,max,age:0,dur,color,style})}
function toast(text, durationMs = TEXT.toastDurationMs) {
  const node = document.createElement('div');
  const fadeDurationMs = 250;
  const fadeStartMs = Math.max(0, durationMs - fadeDurationMs);

  node.className = 'toast';
  node.innerHTML = `<b>${TEXT.toastSymbol}</b> ${text}`;

  // 覆蓋 CSS 原本固定在 2.2 秒後淡出的設定
  node.style.animation =
    `toastIn .25s ease, toastOut .25s ease ${fadeStartMs}ms forwards`;

  DOM.toastLayer.append(node);

  setTimeout(() => node.remove(), durationMs);
}
function hexToRgba(hex,a){const n=parseInt(hex.replace('#',''),16);return `rgba(${n>>16},${n>>8&255},${n&255},${a})`}

function isVisibleWorld(x,y,radius=0){return Math.abs(x-game.camera.x)<=W/2+radius+SYS.worldCullMargin&&Math.abs(y-game.camera.y)<=H/2+radius+SYS.worldCullMargin}
function draw(){
  if(!game){ctx.fillStyle=VIS.fallbackCanvasFill;ctx.fillRect(0,0,W,H);return}
  const shake=screenShakeOffset(),background=VIS.background,camX=game.camera.x-W/2+shake.x,camY=game.camera.y-H/2+shake.y;
  let section=profilerStart();ctx.save();ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle=background.fill;ctx.fillRect(0,0,W,H);
  ctx.save();const tile=background.patternTile,overscan=background.patternOverscan;ctx.translate(-((camX%tile)+tile)%tile,-((camY%tile)+tile)%tile);ctx.globalAlpha=background.patternAlpha;if(game.pattern){ctx.fillStyle=game.pattern;ctx.fillRect(-tile,-tile,W+overscan,H+overscan)}ctx.restore();profilerEnd('draw.background',section);
  section=profilerStart();ctx.save();ctx.translate(-camX,-camY);drawWorld(camX,camY);ctx.restore();profilerEnd('draw.world',section);
  section=profilerStart();if(vignetteCache){ctx.drawImage(vignetteCache,0,0,W,H);profilerCount('drawImages')}ctx.restore();profilerEnd('draw.vignette',section);
}
function drawGemSprite(gem){
  if(gem.ballistic&&!gem.launched)return;
  const height=Math.max(0,Number(gem.height)||0),size=gem.r*VIS.gem.spriteScale,drawY=gem.y-height;
  if(height>0){
    const apex=Math.max(1,gem.flightGravity*gem.flightDuration*gem.flightDuration/8),heightRatio=clamp(height/apex,0,1),shadowMin=clamp(Number(BOSS_REWARD.shadowScaleMin)||0.35,0.05,1),shadowMax=clamp(Number(BOSS_REWARD.shadowScaleMax)||0.9,shadowMin,1),shadowScale=shadowMax-(shadowMax-shadowMin)*heightRatio;
    ctx.save();ctx.globalAlpha=clamp(Number(BOSS_REWARD.shadowAlpha)||0.22,0,1)*(1-heightRatio*0.55);ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(gem.x,gem.y,size*0.42*shadowScale,size*0.2*shadowScale,0,0,TAU);ctx.fill();ctx.restore();
  }
  drawImageCentered(images.exp,gem.x,drawY,size*(1+Math.min(0.18,height/900)),size*(1+Math.min(0.18,height/900)),gem.spin||game.elapsed*VIS.gem.rotationSpeed);
}
function drawWorld(camX,camY){
  const cull=VIS.culling,zoneVisual=VIS.groundZones;let section;
  if(game.bossRewardPhase){
    section=profilerStart();for(const gem of game.gems)if(gem.bossReward&&gem.launched&&isVisibleWorld(gem.x,gem.y-(gem.height||0),gem.r+cull.gemExtra+(gem.height||0)))drawGemSprite(gem);drawPlayer();profilerEnd('draw.weaponFx',section);return;
  }
  section=profilerStart();
  for(const zone of game.zones)if((zone.type==='burn'||zone.type==='acid')&&isVisibleWorld(zone.x,zone.y,zone.r+cull.zoneExtra)){
    const burn=zone.type==='burn',sprite=burn?burnZoneSpriteCache:acidZoneSpriteCache,baseAlpha=zone.visualAlpha??(burn?zoneVisual.burnDrawAlpha:zoneVisual.acidDrawAlpha),alpha=baseAlpha*(1-zone.age/zone.duration);
    if(sprite){ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(sprite,zone.x-zone.r*1.1,zone.y-zone.r*.82,zone.r*2.2,zone.r*1.64);ctx.restore();profilerCount('drawImages')}
    else{ctx.save();ctx.globalAlpha=(zone.visualAlpha??(burn?zoneVisual.fallbackBurnAlpha:zoneVisual.fallbackAcidAlpha))*(1-zone.age/zone.duration);ctx.fillStyle=burn?zoneVisual.burnColors[1]:zoneVisual.acidColors[1];ctx.beginPath();ctx.ellipse(zone.x,zone.y,zone.r,zone.r*zoneVisual.ellipseYMultiplier,0,0,TAU);ctx.fill();ctx.restore()}
  }
  for(const well of game.wells)if(isVisibleWorld(well.x,well.y,well.r+cull.wellExtra))drawWell(well);
  for(const mine of game.mines)if(isVisibleWorld(mine.x,mine.y,cull.mineExtra))drawMine(mine);
  for(const gem of game.gems)if((!gem.ballistic||gem.launched)&&isVisibleWorld(gem.x,gem.y-(gem.height||0),gem.r+cull.gemExtra+(gem.height||0)))drawGemSprite(gem);
  for(const drop of game.mapDrops)if(isVisibleWorld(drop.x,drop.y,cull.mapDropExtra))drawMapDrop(drop);profilerEnd('draw.groundFx',section);
  section=profilerStart();drawEnemies();profilerEnd('draw.enemies',section);
  section=profilerStart();for(const orb of game.gravityOrbs)if(isVisibleWorld(orb.x,orb.y,cull.gravityOrbExtra))drawGravityOrb(orb);for(const meteor of game.meteors)if(isVisibleWorld(meteor.x,meteor.y,cull.meteorExtra))drawMeteor(meteor);profilerEnd('draw.heavyFx',section);
  section=profilerStart();for(const shot of game.enemyShots)if(isVisibleWorld(shot.x,shot.y,cull.enemyShotExtra))drawEnemyShot(shot);profilerEnd('draw.enemyShots',section);
  section=profilerStart();for(const projectile of game.projectiles)if(isVisibleWorld(projectile.x,projectile.y,cull.projectileExtra))drawProjectile(projectile);profilerEnd('draw.projectiles',section);
  section=profilerStart();
  for(const boomerang of game.boomerangs)if(isVisibleWorld(boomerang.x,boomerang.y,boomerang.r+cull.boomerangExtra))drawBoomerang(boomerang);
  for(const zone of game.zones)if(zone.type==='flameJet')drawFlameJet(zone);
  for(const beam of game.beams)drawBeam(beam);
  for(const lightning of game.lightning)drawLightning(lightning);
  for(const wave of game.waves)if(isVisibleWorld(wave.x,wave.y,wave.r+cull.waveExtra))drawWave(wave);
  drawOrbit();drawDrones();drawMouseTarget();drawPlayer();profilerEnd('draw.weaponFx',section);
  section=profilerStart();
  for(const particleItem of game.particles)if(isVisibleWorld(particleItem.x,particleItem.y,particleItem.size+cull.particleExtra)){const sprite=getParticleSprite(particleItem.color,particleItem.size);ctx.save();ctx.globalAlpha=particleItem.life/particleItem.max;ctx.drawImage(sprite.canvas,particleItem.x-sprite.center,particleItem.y-sprite.center);ctx.restore();profilerCount('drawImages')}
  for(const textItem of game.texts)if(isVisibleWorld(textItem.x,textItem.y,cull.textExtra)){ctx.save();ctx.globalAlpha=textItem.life/textItem.max;ctx.font=`${VIS.damageText.fontWeight} ${textItem.size}px ${VIS.damageText.fontFamily}`;ctx.textAlign='center';ctx.fillStyle=textItem.color;ctx.shadowColor=VIS.damageText.shadowColor;ctx.shadowBlur=VIS.damageText.shadowBlur;ctx.fillText(textItem.text,textItem.x,textItem.y);ctx.restore()}profilerEnd('draw.particles',section);
}

function drawEnemies(){
  const visual=VIS.enemy,hpVisual=visual.hpBar;
  for(const enemy of game.enemies){
    if(enemy.dead||!isVisibleWorld(enemy.x,enemy.y,enemy.r+VIS.culling.enemyExtra))continue;
    ctx.save();ctx.translate(enemy.x,enemy.y);let scale=1;
    if(enemy.type==='bloater'&&enemy.state==='charge')scale=1+Math.sin((visual.bloaterChargeReferenceSeconds-enemy.charge)*visual.bloaterChargePulseSpeed)*visual.bloaterChargePulseAmount+(1-enemy.charge/visual.bloaterChargeReferenceSeconds)*visual.bloaterChargeGrowth;
    if(enemy.type==='boss')scale=1+Math.sin(game.elapsed*visual.bossPulseSpeed)*visual.bossPulseAmount;
    ctx.scale(enemy.flip||1,1);ctx.scale(scale,scale);ctx.globalAlpha=enemy.hitFlash>0?visual.hitFlashAlpha:1;const image=images[ENEMIES[enemy.type].img];
    if(image){ctx.drawImage(image,-enemy.r*visual.spriteScale/2,-enemy.r*visual.spriteScale/2,enemy.r*visual.spriteScale,enemy.r*visual.spriteScale);profilerCount('drawImages')}else{ctx.fillStyle=visual.fallbackColor;ctx.beginPath();ctx.arc(0,0,enemy.r,0,TAU);ctx.fill()}
    if(enemy.freeze>0||game.effects.freeze>0){ctx.globalAlpha=visual.freezeRingAlpha;ctx.strokeStyle=visual.freezeRingColor;ctx.lineWidth=visual.freezeRingWidth;ctx.beginPath();ctx.arc(0,0,enemy.r+visual.freezeRingPadding+Math.sin(game.elapsed*visual.freezeRingPulseSpeed+enemy.variant*visual.freezeRingPulsePhaseScale)*visual.freezeRingPulseAmount,0,TAU);ctx.stroke()}
    if(enemy.type==='shadow'&&enemy.state==='wind'){ctx.strokeStyle=visual.shadowWindColor;ctx.lineWidth=visual.shadowWindLineWidth;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(enemy.vx*visual.shadowWindVectorMultiplier,enemy.vy*visual.shadowWindVectorMultiplier);ctx.stroke()}
    if(enemy.type==='bloater'&&enemy.state==='charge'){const alpha=visual.bloaterChargeRingAlphaBase+Math.sin(game.elapsed*visual.bloaterChargeRingPulseSpeed)*visual.bloaterChargeRingAlphaPulse;ctx.strokeStyle=`rgba(${visual.bloaterChargeRingColorRgb},${alpha})`;ctx.lineWidth=visual.bloaterChargeRingWidth;ctx.beginPath();ctx.arc(0,0,visual.bloaterChargeRingRadius,0,TAU);ctx.stroke()}
    ctx.restore();
    if(enemy.type==='golem'||enemy.type==='boss'){const width=enemy.type==='boss'?hpVisual.bossWidth:hpVisual.golemWidth,height=hpVisual.height,x=enemy.x-width/2,y=enemy.y-enemy.r-hpVisual.offsetY;ctx.fillStyle=hpVisual.background;roundRect(ctx,x,y,width,height,hpVisual.cornerRadius);ctx.fill();ctx.fillStyle=enemy.type==='boss'?hpVisual.bossColor:hpVisual.golemColor;roundRect(ctx,x,y,width*clamp(enemy.hp/enemy.maxHp,0,1),height,hpVisual.cornerRadius);ctx.fill()}
  }
}

function drawPlayer(){
  const player=game.player,visual=VIS.player;ctx.save();ctx.translate(player.x,player.y);ctx.globalAlpha=visual.shadowAlpha;ctx.fillStyle=visual.shadowColor;ctx.beginPath();ctx.ellipse(0,visual.shadowOffsetY,visual.shadowRadiusX,visual.shadowRadiusY,0,0,TAU);ctx.fill();ctx.globalAlpha=1;ctx.shadowBlur=game.effects.shield>0?visual.shieldShadowBlur:visual.normalShadowBlur;ctx.shadowColor=game.effects.shield>0?visual.shieldShadowColor:visual.normalShadowColor;if(player.invuln>0&&Math.floor(player.invuln*visual.invulnerabilityBlinkRate)%2)ctx.globalAlpha=visual.invulnerabilityAlpha;ctx.rotate(player.angle+visual.spriteRotationOffset);ctx.drawImage(images.player,-visual.spriteSize/2,-visual.spriteSize/2,visual.spriteSize,visual.spriteSize);ctx.restore();
  if(game.effects.shield>0){ctx.save();ctx.strokeStyle=visual.shieldRingColor;ctx.lineWidth=visual.shieldRingWidth;ctx.shadowBlur=visual.shieldRingShadowBlur;ctx.shadowColor=visual.shieldRingShadowColor;ctx.beginPath();ctx.arc(player.x,player.y,visual.shieldRingRadius+Math.sin(game.elapsed*visual.shieldRingPulseSpeed)*visual.shieldRingPulseAmount,0,TAU);ctx.stroke();ctx.restore()}
}
function drawProjectile(projectile){
  const dx=projectile.x-projectile.px,dy=projectile.y-projectile.py,sprite=getPlayerProjectileSprite(projectile);ctx.save();ctx.translate(projectile.px,projectile.py);ctx.rotate(Math.atan2(dy,dx));ctx.drawImage(sprite.canvas,-sprite.padding,-sprite.height/2);ctx.restore();profilerCount('drawImages');
}

function drawStar(ctx,radius,points,innerMultiplier){ctx.beginPath();for(let i=0;i<points;i++){const angle=i/points*TAU,r=i%2?radius*innerMultiplier:radius,x=Math.cos(angle)*r,y=Math.sin(angle)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath()}
function drawEnemyShot(shot){
  const styles=VIS.enemyShotStyles;
  if(shot.type==='bossSpear'){const sprite=getEnemyShotBodySprite(shot);ctx.save();ctx.translate(shot.x,shot.y);ctx.rotate(Math.atan2(shot.vy,shot.vx));ctx.drawImage(sprite.canvas,-sprite.extent,-sprite.extent);ctx.restore();profilerCount('drawImages');return}
  if(shot.type==='bossOrb')drawCachedTrail('bossOrb',shot.px,shot.py,shot.x,shot.y,styles.bossOrb);
  else if(shot.type==='bossBolt')drawCachedTrail('bossBolt',shot.px,shot.py,shot.x,shot.y,styles.bossBolt);
  else if(shot.type==='orb')drawCachedTrail('spitterOrb',shot.px,shot.py,shot.x,shot.y,styles.spitterOrb);
  const sprite=getEnemyShotBodySprite(shot);ctx.drawImage(sprite.canvas,shot.x-sprite.extent,shot.y-sprite.extent);profilerCount('drawImages');
}

function drawBoomerang(boomerang){const visual=VIS.boomerang;ctx.save();ctx.translate(boomerang.x,boomerang.y);ctx.rotate(boomerang.rot);ctx.strokeStyle=visual.color||CFG.weapons.boomerang.color;ctx.lineWidth=visual.lineWidth;ctx.shadowBlur=visual.shadowBlur;ctx.shadowColor=visual.shadowColor||CFG.weapons.boomerang.color;ctx.beginPath();ctx.arc(0,0,boomerang.r,visual.arcStart,visual.arcEnd);ctx.stroke();ctx.restore()}
function drawOrbit(){const weapon=game.player.weapons.orbit;if(!weapon)return;const level=weapon.level,levelCfg=weaponLevelConfig('orbit',level),visual=VIS.orbit,expand=levelCfg.expandCycleSeconds>0?(Math.sin(game.elapsed*TAU/levelCfg.expandCycleSeconds)*visual.expandPhaseMultiplier+visual.expandPhaseOffset):0,spec=orbitSpec(level,expand);ctx.save();ctx.globalAlpha=visual.ringAlpha;ctx.strokeStyle=visual.ringColor;ctx.lineWidth=level>=4?visual.ringWidthLevel4:visual.ringWidthBase;ctx.shadowBlur=visual.ringShadowBlur;ctx.shadowColor=visual.ringShadowColor;ctx.beginPath();ctx.arc(game.player.x,game.player.y,spec.radius,0,TAU);ctx.stroke();ctx.restore();for(let i=0;i<spec.count;i++){const angle=(game.orbitPhase||0)+i/spec.count*TAU,x=game.player.x+Math.cos(angle)*spec.radius,y=game.player.y+Math.sin(angle)*spec.radius;ctx.save();ctx.globalAlpha=visual.trailAlpha;ctx.strokeStyle=visual.trailColor;ctx.lineWidth=Math.max(visual.trailMinimumWidth,spec.size*visual.trailWidthMultiplier);ctx.beginPath();ctx.arc(game.player.x,game.player.y,spec.radius,angle-visual.trailArcLength,angle);ctx.stroke();ctx.restore();drawImageCentered(images.orbitBlade,x,y,spec.size,spec.size,angle+game.elapsed*visual.bladeRotationSpeed)}}
function drawDrones(){const weapon=game.player.weapons.drone,config=weaponLevelConfig('drone',weapon?weapon.level:1),visual=VIS.drone;for(const drone of game.drones){const x=game.player.x+Math.cos(drone.angle)*config.orbitRadius,y=game.player.y+Math.sin(drone.angle)*config.orbitRadius;ctx.save();ctx.globalAlpha=visual.shadowAlpha;ctx.fillStyle=visual.shadowColor;ctx.beginPath();ctx.ellipse(x,y+visual.shadowOffsetY,visual.shadowRadiusX,visual.shadowRadiusY,0,0,TAU);ctx.fill();ctx.restore();drawImageCentered(images.droneUnit,x,y,visual.spriteSize,visual.spriteSize,drone.angle+Math.PI/2)}}
function drawFlameJet(zone){const visual=VIS.flame,active=zone.age<zone.duration,envelope=active?clamp(Math.min(zone.age/visual.fadeInSeconds,(zone.duration-zone.age)/visual.fadeOutSeconds),0,1):0;if(envelope>0&&flameCoreCache){ctx.save();ctx.translate(zone.x,zone.y);ctx.rotate(zone.ang);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=visual.coreAlpha*envelope;ctx.drawImage(flameCoreCache.canvas,flameCoreCache.offsetX,flameCoreCache.offsetY);ctx.restore();profilerCount('drawImages')}for(const flame of zone.flames||[]){const remain=clamp(flame.life/flame.max,0,1),progress=1-remain,fadeIn=clamp(progress/visual.particleFadeInProgress,0,1),alpha=fadeIn*Math.pow(remain,visual.particleFadePower)*visual.particleAlpha,size=flame.size*(visual.particleScaleStart+progress*visual.particleScaleGrowth);ctx.save();ctx.translate(flame.x,flame.y);ctx.rotate(flame.rot);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=alpha;ctx.shadowBlur=visual.particleShadowBlur;ctx.shadowColor=flame.tone>visual.particleHotThreshold?visual.particleHotShadowColor:visual.particleCoolShadowColor;ctx.drawImage(images.flameSprite,-size*visual.particleDrawXMultiplier,-size*visual.particleDrawYMultiplier,size*visual.particleWidthMultiplier,size*visual.particleHeightMultiplier);ctx.restore();profilerCount('drawImages')}}
function drawBeam(beam){const config=weaponLevelConfig('laser',beam.level),visual=config.visual,length=config.range,width=config.width,alpha=Math.sin(clamp(beam.age/beam.duration,0,1)*Math.PI);ctx.save();ctx.translate(beam.x,beam.y);ctx.rotate(beam.ang);ctx.globalAlpha=visual.bodyAlpha*alpha;ctx.fillStyle=visual.bodyColor;ctx.shadowBlur=visual.shadowBlur;ctx.shadowColor=visual.shadowColor;ctx.fillRect(0,-width/2,length,width);ctx.globalAlpha=visual.coreAlpha*alpha;ctx.fillStyle=visual.coreColor;ctx.fillRect(0,-width*visual.coreWidthMultiplier/2,length,width*visual.coreWidthMultiplier);ctx.restore()}
function drawLightning(lightning){const visual=weaponLevelConfig('lightning',lightning.level||1).visual,paths=lightning.paths||[],frame=paths.length?paths[Math.floor(lightning.age*(Number(PERF.lightningPathFrameRate)||30))%paths.length]:null;ctx.save();ctx.globalAlpha=1-lightning.age/lightning.duration;ctx.lineWidth=visual.lineWidth;ctx.strokeStyle=visual.color;ctx.shadowBlur=visual.shadowBlur;ctx.shadowColor=visual.color;if(frame instanceof Array){ctx.beginPath();for(const [x,y,move] of frame){if(move)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke()}else if(frame)ctx.stroke(frame);ctx.restore()}
function drawWave(wave){if(wave.age<0)return;const visual=VIS.wave,alpha=1-clamp(wave.age/wave.dur,0,1);ctx.save();if(wave.style==='frost'&&images.frostRing){const frost=weaponLevelConfig('frost',game.player.weapons.frost?.level||1).visual;ctx.globalAlpha=frost.alpha*alpha;drawImageCentered(images.frostRing,wave.x,wave.y,wave.r*frost.scale,wave.r*frost.scale,game.elapsed*frost.rotationSpeed);ctx.restore();return}ctx.globalAlpha=alpha;ctx.strokeStyle=wave.color;ctx.lineWidth=visual.lineWidth;ctx.shadowBlur=visual.shadowBlur;ctx.shadowColor=wave.color;ctx.beginPath();ctx.arc(wave.x,wave.y,wave.r,0,TAU);ctx.stroke();ctx.restore()}
function drawMine(mine){drawImageCentered(images.mineSprite,mine.x,mine.y,VIS.mine.spriteSize,VIS.mine.spriteSize,game.elapsed*VIS.mine.rotationSpeed)}
function drawWell(well){const visual=VIS.well,time=game.elapsed*visual.rotationSpeed;ctx.save();ctx.translate(well.x,well.y);ctx.globalAlpha=visual.alpha;for(let i=0;i<visual.ringCount;i++){ctx.strokeStyle=`rgba(${visual.ringColorRgb},${visual.ringBaseAlpha+i*visual.ringAlphaStep})`;ctx.lineWidth=visual.lineWidth;ctx.beginPath();ctx.ellipse(0,0,well.r*(visual.ringRadiusBaseX+i*visual.ringRadiusStepX),well.r*(visual.ringRadiusBaseY+i*visual.ringRadiusStepY),time+i*visual.ringRotationStep,0,TAU);ctx.stroke()}ctx.fillStyle=visual.coreColor;ctx.shadowBlur=visual.shadowBlur;ctx.shadowColor=visual.coreShadowColor;ctx.beginPath();ctx.arc(0,0,visual.coreRadius,0,TAU);ctx.fill();ctx.restore()}
function buildMeteorSpriteCache(){if(!images.meteorSprite)return;const cache=VIS.meteorCache,ground=VIS.groundZones,size=cache.spriteCacheSize,canvasCache=document.createElement('canvas');canvasCache.width=canvasCache.height=size;const cacheCtx=canvasCache.getContext('2d');cacheCtx.translate(size/2,size/2);cacheCtx.shadowBlur=cache.spriteShadowBlur;cacheCtx.shadowColor=cache.spriteShadowColor;cacheCtx.globalAlpha=cache.spriteAlpha;cacheCtx.drawImage(images.meteorSprite,-cache.spriteSourceSize/2,-cache.spriteSourceSize/2,cache.spriteSourceSize,cache.spriteSourceSize);meteorSpriteCache=canvasCache;meteorWarningFrames.length=0;const warningSize=cache.warningSize,center=warningSize/2;for(let i=0;i<METEOR_WARNING_FRAME_COUNT;i++){const progress=i/(METEOR_WARNING_FRAME_COUNT-1),frame=document.createElement('canvas');frame.width=frame.height=warningSize;const frameCtx=frame.getContext('2d');frameCtx.translate(center,center);frameCtx.globalAlpha=cache.warningAlphaBase+cache.warningAlphaGrowth*progress;frameCtx.fillStyle=cache.warningFillColor;frameCtx.strokeStyle=cache.warningStrokeColor;frameCtx.lineWidth=cache.warningLineWidth;frameCtx.setLineDash(METEOR_DASH);frameCtx.beginPath();frameCtx.arc(0,0,cache.warningBaseRadius*(1-cache.warningRadiusShrink*progress),0,TAU);frameCtx.fill();frameCtx.stroke();meteorWarningFrames.push(frame)}const buildZoneSprite=colors=>{const cacheCanvas=document.createElement('canvas');cacheCanvas.width=ground.cacheWidth;cacheCanvas.height=ground.cacheHeight;const zoneCtx=cacheCanvas.getContext('2d'),gradient=zoneCtx.createRadialGradient(ground.centerX,ground.centerY,ground.innerRadius,ground.centerX,ground.centerY,ground.outerRadius);gradient.addColorStop(0,colors[0]);gradient.addColorStop(cache.zoneGradientMiddleStop,colors[1]);gradient.addColorStop(1,colors[2]);zoneCtx.fillStyle=gradient;zoneCtx.beginPath();zoneCtx.ellipse(ground.centerX,ground.centerY,ground.ellipseRadiusX,ground.ellipseRadiusY,0,0,TAU);zoneCtx.fill();return cacheCanvas};burnZoneSpriteCache=buildZoneSprite(ground.burnColors);acidZoneSpriteCache=buildZoneSprite(ground.acidColors)}
function drawMeteor(meteor){if(meteor.hit||meteor.age<0)return;const config=weaponLevelConfig('meteor',meteor.level),visual=config.fallVisual,cache=VIS.meteorCache,progress=clamp(meteor.age/meteor.duration,0,1),ease=1-Math.pow(1-progress,visual.easingPower),impactRadius=meteor.big&&config.largeMeteor?config.largeMeteor.radius:config.radius,frameIndex=Math.min(METEOR_WARNING_FRAME_COUNT-1,(progress*METEOR_WARNING_FRAME_COUNT)|0),warning=meteorWarningFrames[frameIndex];if(warning){const scale=impactRadius/cache.warningBaseRadius,size=cache.warningSize*scale;ctx.drawImage(warning,meteor.x-size/2,meteor.y-size/2,size,size)}ctx.save();ctx.translate(meteor.x,meteor.y);ctx.globalAlpha=visual.shadowAlphaBase+visual.shadowAlphaGrowth*progress;ctx.fillStyle=VIS.meteor.shadowColor;ctx.beginPath();ctx.ellipse(0,0,impactRadius*visual.shadowWidthMultiplier*progress+visual.shadowBaseWidth,impactRadius*visual.shadowHeightMultiplier*progress+visual.shadowBaseHeight,0,0,TAU);ctx.fill();ctx.restore();const offsetX=visual.offsetX*(1-ease),offsetY=visual.offsetY*(1-ease),scale=(meteor.big?visual.largeScale:1)*(visual.scaleStart+visual.scaleGrowth*ease),spriteSize=visual.spriteSize*scale,x=meteor.x+offsetX,y=meteor.y+offsetY;ctx.save();ctx.translate(x,y);ctx.rotate(METEOR_FIXED_ROTATION);ctx.globalAlpha=visual.spriteAlpha;if(meteorSpriteCache){const cacheSize=spriteSize*visual.cacheScale;ctx.drawImage(meteorSpriteCache,-cacheSize/2,-cacheSize/2,cacheSize,cacheSize)}else ctx.drawImage(images.meteorSprite,-spriteSize/2,-spriteSize/2,spriteSize,spriteSize);ctx.restore()}
function drawGravityOrb(orb){const visual=VIS.gravityOrb,t=clamp(orb.age/orb.duration,0,1),size=visual.sizeStart+visual.sizeGrowth*t;ctx.save();ctx.translate(orb.x,orb.y);ctx.rotate(orb.spin);ctx.shadowBlur=visual.shadowBlur;ctx.shadowColor=visual.shadowColor;ctx.drawImage(images.gravityOrb,-size/2,-size/2,size,size);ctx.strokeStyle=visual.ringColor;ctx.lineWidth=visual.lineWidth;ctx.beginPath();ctx.arc(0,0,size*visual.ringRadiusMultiplier+Math.sin(game.elapsed*visual.ringPulseSpeed)*visual.ringPulse,0,TAU);ctx.stroke();ctx.restore()}
function drawMouseTarget(){if(!mouse.active||state!=='playing')return;const visual=VIS.mouseTarget;ctx.save();ctx.translate(mouse.targetX,mouse.targetY);ctx.globalAlpha=visual.alpha;ctx.strokeStyle=visual.color;ctx.lineWidth=visual.lineWidth;ctx.setLineDash(visual.dash);ctx.beginPath();ctx.arc(0,0,visual.radius+Math.sin(game.elapsed*visual.pulseSpeed)*visual.pulse,0,TAU);ctx.stroke();ctx.setLineDash(METEOR_SOLID_DASH);ctx.beginPath();ctx.moveTo(-visual.lineOuter,0);ctx.lineTo(-visual.lineInner,0);ctx.moveTo(visual.lineOuter,0);ctx.lineTo(visual.lineInner,0);ctx.moveTo(0,-visual.lineOuter);ctx.lineTo(0,-visual.lineInner);ctx.moveTo(0,visual.lineOuter);ctx.lineTo(0,visual.lineInner);ctx.stroke();ctx.restore()}
function drawMapDrop(drop){const visual=VIS.mapDrop,assetKeys={heal:'healDrop',regen:'regenDrop',shield:'shieldDrop',magnet:'magnetDrop',freeze:'freezeDrop',doublexp:'doublexpDrop',overload:'overloadDrop',bomb:'bombDrop',push:'pushDrop'},key=assetKeys[drop.key]||'healDrop',item=ITEMS[drop.key]||ITEMS.heal,bob=Math.sin(drop.bob)*visual.bobAmount;ctx.save();ctx.globalAlpha=visual.shadowAlpha;ctx.fillStyle=visual.shadowColor;ctx.beginPath();ctx.ellipse(drop.x,drop.y+visual.shadowOffsetY,visual.shadowRadiusX,visual.shadowRadiusY,0,0,TAU);ctx.fill();ctx.restore();ctx.save();ctx.translate(drop.x,drop.y+bob);ctx.shadowBlur=visual.shadowBlur;ctx.shadowColor=item.color||visual.magnetGlow;if(images[key])ctx.drawImage(images[key],-visual.spriteSize/2,-visual.spriteSize/2,visual.spriteSize,visual.spriteSize);ctx.strokeStyle=item.color||visual.ringColor;ctx.lineWidth=visual.lineWidth;ctx.beginPath();ctx.arc(0,0,visual.ringRadius+Math.sin(drop.bob*visual.ringPulseSpeed)*visual.ringPulse,0,TAU);ctx.stroke();ctx.restore()}
function drawImageCentered(image,x,y,width,height,rotation=0){if(!image)return;ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.drawImage(image,-width/2,-height/2,width,height);ctx.restore();profilerCount('drawImages')}
function roundRect(context,x,y,width,height,radius){context.beginPath();context.roundRect(x,y,width,height,radius);return context}

function loop(now){
  const dt=Math.min(SYS.maxDeltaSeconds,(now-last)/1000||0);last=now;profilerBeginFrame(performance.now());let section=profilerStart();update(dt);profilerEnd('update.total',section);section=profilerStart();draw();profilerEnd('draw.total',section);updateFPSDisplay(now);profilerEndFrame(performance.now());requestAnimationFrame(loop);
}

// input
function pointerToWorld(e){
  const r=canvas.getBoundingClientRect(),sx=(e.clientX-r.left)/r.width*W,sy=(e.clientY-r.top)/r.height*H;
  return {x:game.camera.x+sx-W/2,y:game.camera.y+sy-H/2}
}
canvas.addEventListener('pointerdown',e=>{
  if(e.button!==SYS.primaryPointerButton||state!=='playing'||!game)return;
  const p=pointerToWorld(e);mouse.active=true;mouse.held=true;mouse.targetX=p.x;mouse.targetY=p.y;
  try{canvas.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault()
});
canvas.addEventListener('pointermove',e=>{
  if(!mouse.held||state!=='playing'||!game)return;const p=pointerToWorld(e);mouse.active=true;mouse.targetX=p.x;mouse.targetY=p.y;e.preventDefault()
});
canvas.addEventListener('pointerup',e=>{if(e.button===SYS.primaryPointerButton)mouse.held=false});
canvas.addEventListener('pointercancel',()=>mouse.held=false);
canvas.addEventListener('contextmenu',e=>{e.preventDefault();mouse.active=false;mouse.held=false});
window.addEventListener('keydown',e=>{
  keys[e.code]=true;
  if(SYS.preventDefaultKeys.includes(e.code))e.preventDefault();
  if(e.code==='Escape'){
    e.preventDefault();
    if(state==='lastRipplePrompt'){declineLastRipple();return}else if(state==='debug')closeDebugUI();else togglePause();
    return;
  }
  if(state==='paused'&&handleDebugSecretKey(e)){
    e.preventDefault();
    return;
  }
  if(state==='level'&&SYS.keyboardRewardKeys.includes(e.code)){
    const n=parseInt(e.code.slice(-1))-SYS.rewardNumberBase;
    chooseReward(n);
  }
});
window.addEventListener('keyup',e=>keys[e.code]=false);
$('#start-btn').onclick=startGame;$('#restart-btn').onclick=startGame;$('#restart-pause-btn').onclick=startGame;$('#pause-btn').onclick=()=>togglePause();$('#resume-btn').onclick=()=>togglePause(false);if(DOM.lastRippleAccept)DOM.lastRippleAccept.onclick=acceptLastRipple;if(DOM.lastRippleDecline)DOM.lastRippleDecline.onclick=declineLastRipple;if(DOM.submitScoreBtn)DOM.submitScoreBtn.onclick=submitOnlineScore;if(DOM.scorePlayerName)DOM.scorePlayerName.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();submitOnlineScore()}});if(DOM.leaderboardRefreshBtn)DOM.leaderboardRefreshBtn.onclick=()=>refreshLeaderboard({runId:game?.scoreRunId||'',retryOwn:false});
DOM.soundBtn.onclick=()=>{sound.enabled=!sound.enabled;DOM.soundBtn.textContent=sound.enabled?TEXT.soundOn:TEXT.soundOff;if(sound.enabled)sound.pickup()};

const joy=$('#joystick-base'),knob=$('#joystick-knob');let joyId=null;
function joyMove(e){const point=[...e.changedTouches].find(item=>item.identifier===joyId);if(!point)return;const rect=joy.getBoundingClientRect(),centerX=rect.left+rect.width/2,centerY=rect.top+rect.height/2,dx=point.clientX-centerX,dy=point.clientY-centerY,distance=Math.hypot(dx,dy),radius=VIS.input.joystickRadius,magnitude=Math.min(radius,distance),nx=distance?dx/distance:0,ny=distance?dy/distance:0;knob.style.transform=`translate(${nx*magnitude}px,${ny*magnitude}px)`;touch.x=nx*Math.min(SYS.joystickTouchScale,distance/radius);touch.y=ny*Math.min(SYS.joystickTouchScale,distance/radius);touch.active=true;e.preventDefault()}
joy.addEventListener('touchstart',e=>{joyId=e.changedTouches[0].identifier;joyMove(e)},{passive:false});joy.addEventListener('touchmove',joyMove,{passive:false});joy.addEventListener('touchend',e=>{if([...e.changedTouches].some(x=>x.identifier===joyId)){joyId=null;touch.x=touch.y=0;touch.active=false;knob.style.transform=SYS.touchEndTransform}},{passive:false});

applyStaticText();ensurePauseDebugButton();ensureFPSUI();ensureProfilerUI();
loadImages().then(()=>{buildMeteorSpriteCache();buildFlameCoreCache();resetGame();setProfilerVisible(!!PERF.profilerVisibleByDefault);requestAnimationFrame(loop)});
})();
