/* BUILD R7 - EARLY GAME BALANCE PATCH - 2026-07-11 */
(() => {
'use strict';

const $ = s => document.querySelector(s);
const canvas = $('#game');
const ctx = canvas.getContext('2d', { alpha: false });
const TAU = Math.PI * 2;
const U = 52;
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const rand = (a,b)=>a+Math.random()*(b-a);
const pick = a=>a[(Math.random()*a.length)|0];
const dist2=(a,b)=>{const x=a.x-b.x,y=a.y-b.y;return x*x+y*y};
const fmtTime = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.max(0,Math.floor(s%60))).padStart(2,'0')}`;
const angleDiff=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));

const DOM = {
  hud: $('#hud'), start: $('#start-screen'), level: $('#level-screen'), pause: $('#pause-screen'), end: $('#end-screen'),
  timer: $('#timer'), levelText: $('#level'), kills: $('#kills'), hpFill: $('#hp-fill'), hpText: $('#hp-text'), expFill: $('#exp-fill'), expText: $('#exp-text'),
  weaponRack: $('#weapon-rack'), effectRack: $('#effect-rack'), rewardCards: $('#reward-cards'),
  resultTime: $('#result-time'), resultLevel: $('#result-level'), resultKills: $('#result-kills'), resultWeapons: $('#result-weapons'),
  endTitle: $('#end-title'), endCopy: $('#end-copy'), endEyebrow: $('#end-eyebrow'), toastLayer: $('#toast-layer'), damageFlash: $('#damage-flash'),
  soundBtn: $('#sound-btn')
};

const ASSET_PATHS = {
  arena:'assets/arena_tile.png', player:'assets/player.png', exp:'assets/exp_crystal.png', chest:'assets/chest.png',
  rat:'assets/enemy_rat.png', hound:'assets/enemy_hound.png', shell:'assets/enemy_shell.png', spitter:'assets/enemy_spitter.png',
  bloater:'assets/enemy_bloater.png', shadow:'assets/enemy_shadow.png', golem:'assets/enemy_golem.png', boss:'assets/enemy_boss.png',
  orbitBlade:'assets/fx_orbit_blade.png', frostRing:'assets/fx_frost_ring.png', droneUnit:'assets/fx_drone.png', mineSprite:'assets/fx_mine.png',
  meteorSprite:'assets/fx_meteor.png', gravityOrb:'assets/fx_gravity_orb.png', flameSprite:'assets/fx_flame.png',
  healDrop:'assets/item_heal.png', freezeDrop:'assets/item_freeze.png', magnetDrop:'assets/item_magnet.png'
};
const images={};
function loadImages(){
  return Promise.all(Object.entries(ASSET_PATHS).map(([k,src])=>new Promise(res=>{const im=new Image();im.onload=()=>{images[k]=im;res()};im.onerror=res;im.src=src;})));
}

class Sound {
  constructor(){this.enabled=true;this.ctx=null;}
  ensure(){ if(!this.ctx) this.ctx=new (window.AudioContext||window.webkitAudioContext)(); if(this.ctx.state==='suspended') this.ctx.resume(); }
  tone(freq=440,dur=.08,type='sine',vol=.035,slide=0){
    if(!this.enabled)return; this.ensure(); const t=this.ctx.currentTime; const o=this.ctx.createOscillator(),g=this.ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),t+dur);
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(this.ctx.destination);o.start(t);o.stop(t+dur);
  }
  shot(){this.tone(210,.055,'square',.018,-80)} hit(){this.tone(95,.04,'sawtooth',.012,-35)} level(){this.tone(430,.12,'triangle',.04,430);setTimeout(()=>this.tone(680,.16,'triangle',.03,400),80)}
  hurt(){this.tone(120,.18,'sawtooth',.06,-70)} boom(){this.tone(85,.25,'sawtooth',.05,-45)} pickup(){this.tone(680,.05,'sine',.018,150)}
}
const sound=new Sound();

const WEAPONS = {
  shotgun:{name:'爆裂霰彈', icon:'assets/weapon_shotgun.png', color:'#ff7b62', desc:['5 顆扇形彈丸，每顆造成 9 傷害。','彈丸增加為 7 顆，扇形擴大。','每顆傷害提高並增加擊退。','冷卻縮短、射程提高。','加入穿透核心彈，命中後爆裂。']},
  boomerang:{name:'迴旋斬輪',icon:'assets/weapon_boomerang.png',color:'#ffc069',desc:['投出斬輪，去程與回程皆可命中。','傷害與尺寸提高。','同時投出 2 枚斬輪。','冷卻縮短、穿透提高。','回到玩家時釋放十字斬。']},
  orbit:{name:'衛星刃環',icon:'assets/weapon_orbit.png',color:'#6fe8ff',desc:['2 枚大型刃片環繞玩家。','3 枚刃片，尺寸與命中範圍提高。','4 枚大型刃片，傷害與旋轉速度提高。','6 枚巨刃，擴大軌道並附帶擊退。','8 枚超大型刃片，週期外擴且尺寸同步成長。']},
  flame:{name:'燼火噴流',icon:'assets/weapon_flame.png',color:'#ff7338',desc:['向敵群噴射持續火焰。','持續時間與角度提高。','附加持續燃燒傷害。','冷卻縮短、射程提高。','同時向前後噴射，燃燒可疊加。']},
  lightning:{name:'雷弧鏈',icon:'assets/weapon_lightning.png',color:'#ffe76a',desc:['雷電在 4 名敵人之間跳躍。','增加 2 次跳躍。','傷害提高。','冷卻縮短並微暈眩。','同時產生 2 條起始雷弧。']},
  frost:{name:'寒霜脈衝',icon:'assets/weapon_frost.png',color:'#7edcff',desc:['範圍傷害並緩速敵人。','脈衝半徑提高。','傷害與緩速效果提高。','冷卻縮短、擊退提高。','先凍結敵人，死亡時可能碎裂。']},
  meteor:{name:'天墜隕石',icon:'assets/weapon_meteor.png',color:'#ff6a43',desc:['在敵人密集處降下一顆隕石。','爆炸半徑與傷害提高。','每次降下 2 顆隕石。','留下持續燃燒區。','降下 3 顆，最後一顆為大型隕石。']},
  mine:{name:'腐蝕地雷',icon:'assets/weapon_mine.png',color:'#61e59e',desc:['在腳下布置地雷與腐蝕池。','地雷上限與持續時間提高。','爆炸與腐蝕傷害提高。','冷卻縮短、範圍提高。','地雷可連鎖引爆並緩速。']},
  laser:{name:'貫星光束',icon:'assets/weapon_laser.png',color:'#ed79ff',desc:['發射長直線全穿透光束。','光束寬度提高。','持續時間與傷害提高。','冷卻縮短並可追蹤轉向。','同時向前後發射並追加傷害。']},
  hammer:{name:'震地戰鎚',icon:'assets/weapon_hammer.png',color:'#e0bb78',desc:['近身震擊並強力擊退。','傷害提高。','範圍提高。','冷卻縮短並附加暈眩。','追加第二道大型外環。']},
  drone:{name:'獵殺無人機',icon:'assets/weapon_drone.png',color:'#72cfff',desc:['1 架無人機自動射擊。','無人機增加為 2 架。','傷害提高並穿透。','射擊間隔縮短。','3 架無人機，週期發射飛彈。']},
  gravity:{name:'重力奇點',icon:'assets/weapon_gravity.png',color:'#b278ff',desc:['從玩家位置投射重力核心，抵達後展開奇點。','奇點半徑提高。','持續時間與傷害提高。','冷卻縮短、吸力提高。','同時向不同敵群投射 2 枚重力核心。']}
};

const ITEMS = {
  heal:{name:'血液補劑',icon:'assets/item_heal.png',color:'#ff5579',desc:'立即回復 40 HP。'},
  regen:{name:'再生注射',icon:'assets/item_regen.png',color:'#58e4ad',desc:'8 秒內持續回復生命。'},
  shield:{name:'光盾電池',icon:'assets/item_shield.png',color:'#6cbcff',desc:'5 秒內完全無敵。'},
  magnet:{name:'全域磁極',icon:'assets/item_magnet.png',color:'#5be9ff',desc:'將地圖上全部 EXP 吸向玩家。'},
  freeze:{name:'停滯鐘',icon:'assets/item_freeze.png',color:'#8ddfff',desc:'所有敵人停止動作 6 秒。'},
  doublexp:{name:'雙倍知識',icon:'assets/item_doublexp.png',color:'#ffd963',desc:'20 秒內取得 EXP ×2。'},
  overload:{name:'過載核心',icon:'assets/item_overload.png',color:'#ff76e6',desc:'12 秒內所有武器冷卻縮短 40%。'},
  bomb:{name:'清場炸彈',icon:'assets/item_bomb.png',color:'#ff7359',desc:'重創場上所有敵人。'},
  push:{name:'驅散衝擊',icon:'assets/item_push.png',color:'#baa0ff',desc:'擊退畫面內敵人並暈眩。'},
  vampire:{name:'吸血契約',icon:'assets/item_vampire.png',color:'#f65081',desc:'15 秒內擊殺敵人可回復生命。'}
};

const STATS = {
  hp:{name:'生命強化',icon:'assets/stat_hp.png',color:'#ff6688',desc:'最大 HP +15，並回復 15 HP。'},
  speed:{name:'步伐強化',icon:'assets/stat_speed.png',color:'#69dcff',desc:'提高移動速度。第 5 級達基礎速度 2.5 倍。'},
  pickup:{name:'磁力強化',icon:'assets/stat_pickup.png',color:'#a982ff',desc:'擴大 EXP 與拾取物吸引範圍。'}
};
const SPEED_MULT=[1,1.3,1.6,1.9,2.2,2.5];
const PICKUP_RAD=[83,112,140,169,198,226];

const ENEMIES = {
  rat:{img:'rat',hp:14,speed:112,damage:6,exp:1,r:19,cost:1,from:0,role:'大量弱怪'},
  hound:{img:'hound',hp:32,speed:182,damage:9,exp:2,r:23,cost:2,from:105,role:'快速怪'},
  shell:{img:'shell',hp:115,speed:82,damage:13,exp:4,r:29,cost:5,from:155,role:'厚甲怪'},
  spitter:{img:'spitter',hp:72,speed:84,damage:8,exp:5,r:27,cost:6,from:215,role:'遠程怪'},
  bloater:{img:'bloater',hp:92,speed:103,damage:10,exp:5,r:29,cost:6,from:290,role:'自爆壓力怪'},
  shadow:{img:'shadow',hp:135,speed:168,damage:18,exp:7,r:28,cost:8,from:395,role:'突進控制怪'},
  golem:{img:'golem',hp:690,speed:50,damage:27,exp:22,r:43,cost:24,from:515,role:'高 HP 重型怪'},
  boss:{img:'boss',hp:5200,speed:60,damage:35,exp:120,r:62,cost:999,from:810,role:'終局 Boss'}
};
const ENEMY_INTROS = [
  {type:'hound',time:105,count:2,label:'快速怪：血獵犬加入戰場'},
  {type:'shell',time:155,count:2,label:'厚甲怪：鐵殼守衛加入戰場'},
  {type:'spitter',time:215,count:2,label:'遠程怪：瘟疫噴吐者加入戰場'},
  {type:'bloater',time:290,count:2,label:'壓力怪：膨脹自爆體加入戰場'},
  {type:'shadow',time:395,count:2,label:'突進怪：虛影獵手加入戰場'},
  {type:'golem',time:515,count:1,label:'高HP怪：深岩巨像加入戰場'}
];
const ENEMY_PHASES = [
  {from:0,   to:105, mix:{rat:12}},
  {from:105, to:155, mix:{rat:9,hound:2.2}},
  {from:155, to:215, mix:{rat:7,hound:2.4,shell:2.2}},
  {from:215, to:290, mix:{rat:6,hound:2.5,shell:2.4,spitter:2.8}},
  {from:290, to:395, mix:{rat:5,hound:2.7,shell:2.6,spitter:3,bloater:2.5}},
  {from:395, to:515, mix:{rat:4,hound:2.8,shell:2.8,spitter:3.2,bloater:2.8,shadow:2.8}},
  {from:515, to:660, mix:{rat:3,hound:3,shell:3,spitter:3.4,bloater:3.1,shadow:3.3,golem:1.5}},
  {from:660, to:810, mix:{rat:2.2,hound:3.1,shell:3.3,spitter:3.7,bloater:3.4,shadow:3.8,golem:2.3}},
  {from:810, to:901, mix:{rat:1.6,hound:3.1,shell:3.5,spitter:3.9,bloater:3.7,shadow:4.1,golem:3}}
];
const ROLE_INTERVALS = {
  hound:[17,25], shell:[24,34], spitter:[22,32], bloater:[27,38], shadow:[30,42], golem:[48,66]
};

let state='menu', last=performance.now(), DPR=1, W=0,H=0;
let game=null;
const keys={}; const touch={x:0,y:0,active:false}; const mouse={active:false,held:false,targetX:0,targetY:0};

function resetGame(){
  game={
    elapsed:0,duration:900,level:1,exp:0,need:needXP(1),kills:0,paused:false,ended:false,shake:0,spawnBudget:0,bossSpawned:false,
    player:{x:0,y:0,r:19,hp:100,maxHp:100,baseSpeed:158,invuln:0,angle:0,stats:{hp:0,speed:0,pickup:0},weapons:{},baseTimer:.2},
    enemies:[],projectiles:[],enemyShots:[],gems:[],mapDrops:[],particles:[],texts:[],waves:[],beams:[],meteors:[],gravityOrbs:[],zones:[],mines:[],wells:[],boomerangs:[],lightning:[],drones:[],effects:{regen:0,shield:0,freeze:0,doublexp:0,overload:0,vampire:0},
    pendingLevels:0,rewardChoices:[],camera:{x:0,y:0},pattern:null,globalMagnet:0,nextMapDrop:11,
    introFlags:{},roleTimers:{hound:18,shell:25,spitter:23,bloater:28,shadow:31,golem:50},wavePackTimer:42,spawnCounts:{rat:0,hound:0,shell:0,spitter:0,bloater:0,shadow:0,golem:0,boss:0},openingGrace:3
  };
  if(images.arena) game.pattern=ctx.createPattern(images.arena,'repeat');
  updateHUD(true); buildWeaponRack();
}
function needXP(L){return Math.round(8+2.5*L+.22*L*L)}
function hpMult(t){const m=t/60;return 1+.06*m+.008*m*m}
function dmgMult(t){return 1+.04*(t/60)}
function speedMult(t){return Math.min(1.18,1+.012*(t/60))}

function resize(){DPR=Math.min(2,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;canvas.width=W*DPR;canvas.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);ctx.imageSmoothingEnabled=true;}
window.addEventListener('resize',resize);resize();

function startGame(){
  sound.ensure(); resetGame(); mouse.active=false;mouse.held=false; state='playing'; DOM.start.classList.remove('show');DOM.end.classList.remove('show');DOM.pause.classList.remove('show');DOM.level.classList.remove('show');DOM.hud.classList.remove('hidden');last=performance.now();
  toast('血月升起，撐過 15 分鐘');
}
function endGame(win){
  if(game.ended)return;game.ended=true;state='ended';DOM.hud.classList.add('hidden');DOM.end.classList.add('show');
  DOM.endEyebrow.textContent=win?'SURVIVED':'RUN ENDED';DOM.endTitle.textContent=win?'黎明仍有你的名字':'殘響消散';DOM.endCopy.textContent=win?'你在血月廢墟中活了下來。':'你倒在血月廢墟中，但殘響仍等待下一次甦醒。';
  DOM.resultTime.textContent=fmtTime(Math.min(game.elapsed,game.duration));DOM.resultLevel.textContent=game.level;DOM.resultKills.textContent=game.kills;DOM.resultWeapons.textContent=`${Object.keys(game.player.weapons).length} / 6`;
  sound.tone(win?680:105,.5,win?'triangle':'sawtooth',.06,win?500:-55);
}
function togglePause(force){
  if(state==='level'||state==='menu'||state==='ended')return;
  const on=force!==undefined?force:state!=='paused';state=on?'paused':'playing';DOM.pause.classList.toggle('show',on);game.paused=on;last=performance.now();
}

function update(dt){
  if(state!=='playing'||!game||game.ended)return;
  game.elapsed+=dt;if(game.elapsed>=game.duration){endGame(true);return}
  const p=game.player;
  updateEffects(dt);
  p.invuln=Math.max(0,p.invuln-dt);
  const keyX=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
  const keyY=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0);
  let dx=keyX+touch.x,dy=keyY+touch.y,moveScale=1;
  const manual=Math.hypot(dx,dy)>0.001;
  if(manual){mouse.active=false}
  else if(mouse.active){
    const mx=mouse.targetX-p.x,my=mouse.targetY-p.y,md=Math.hypot(mx,my);
    if(md<9){mouse.active=false;dx=dy=0}
    else{dx=mx/md;dy=my/md;moveScale=clamp(md/55,.28,1)}
  }
  const len=Math.hypot(dx,dy);if(len>0.001){dx/=Math.max(1,len);dy/=Math.max(1,len);p.angle=Math.atan2(dy,dx);}
  const sp=p.baseSpeed*SPEED_MULT[p.stats.speed];p.x+=dx*sp*moveScale*dt;p.y+=dy*sp*moveScale*dt;
  game.camera.x+=(p.x-game.camera.x)*Math.min(1,dt*8);game.camera.y+=(p.y-game.camera.y)*Math.min(1,dt*8);
  updateSpawns(dt);updateEnemies(dt);updateWeapons(dt);updateProjectiles(dt);updateEnemyShots(dt);updateSpecials(dt);updateGems(dt);updateMapDrops(dt);updateParticles(dt);
  updateHUD();
}

function updateEffects(dt){
  const e=game.effects,p=game.player;
  if(e.regen>0){const heal=Math.min(dt*5,p.maxHp*.05*dt);p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.05*dt);e.regen-=dt}
  for(const k of ['shield','freeze','doublexp','overload','vampire']) if(e[k]>0)e[k]=Math.max(0,e[k]-dt);
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
  if(game.elapsed<180)return;
  const phase=currentEnemyPhase(),types=Object.keys(phase.mix).filter(t=>t!=='rat'&&game.elapsed>=ENEMIES[t].from);
  if(!types.length)return;
  const primary=pick(types),secondary=types.length>1?pick(types.filter(t=>t!==primary)):null;
  const countA=primary==='golem'?1:2;
  for(let i=0;i<countA;i++)spawnEnemy(primary,'intro');
  if(secondary)spawnEnemy(secondary,'intro');
}
function spawnRateAt(t){
  if(t<3)return 0;
  if(t<20)return .28;
  if(t<60)return .48+(t-20)/40*.34;
  if(t<120)return .9+(t-60)/60*.48;
  if(t<240)return 1.45+(t-120)/120*.75;
  const m=t/60;
  return Math.min(5.8,2.2+.32*(m-4)+.028*(m-4)*(m-4));
}
function enemyCapAt(t){
  if(t<20)return 8;
  if(t<45)return 14;
  if(t<90)return 24;
  if(t<150)return 38;
  if(t<240)return 62;
  if(t<390)return 95;
  if(t<570)return 135;
  if(t<750)return 180;
  return 230;
}
function updateSpawns(dt){
  runEnemyIntroductions();runGuaranteedRoles(dt);
  game.wavePackTimer-=dt;
  if(game.wavePackTimer<=0){spawnMixedWavePack();game.wavePackTimer=rand(38,55)}
  const cap=enemyCapAt(game.elapsed);
  if(game.enemies.length<cap){
    game.spawnBudget+=dt*spawnRateAt(game.elapsed);
    let guard=0;
    while(game.spawnBudget>=1&&game.enemies.length<cap&&guard++<10){
      const type=chooseEnemyForBudget(game.spawnBudget);
      if(!type)break;
      spawnEnemy(type);game.spawnBudget-=ENEMIES[type].cost;
    }
  }else{
    game.spawnBudget=Math.min(game.spawnBudget,3);
  }
  if(!game.bossSpawned&&game.elapsed>=810){game.bossSpawned=true;spawnEnemy('boss');toast('深淵暴君降臨');sound.boom()}
}
function spawnEnemy(type,near){
  const c=ENEMIES[type],p=game.player;let x,y;
  if(game.spawnCounts)game.spawnCounts[type]=(game.spawnCounts[type]||0)+1;
  if(near){const a=Math.random()*TAU;const r=near==='intro'?rand(390,560):rand(160,280);x=p.x+Math.cos(a)*r;y=p.y+Math.sin(a)*r}else{const a=Math.random()*TAU;const r=Math.max(W,H)*.63+rand(120,260);x=p.x+Math.cos(a)*r;y=p.y+Math.sin(a)*r}
  const mul=type==='boss'?1:hpMult(game.elapsed);
  const trackingLag=type==='hound'||type==='shadow';
  game.enemies.push({type,x,y,r:c.r,hp:c.hp*mul,maxHp:c.hp*mul,speed:c.speed*speedMult(game.elapsed),damage:c.damage*dmgMult(game.elapsed),exp:c.exp,hitFlash:0,slow:0,slowAmt:0,freeze:0,stun:0,burn:0,burnDps:0,acidTick:0,ai:rand(0,3),state:'move',charge:0,shot:rand(.5,2),dash:rand(1.5,3.2),vx:0,vy:0,bossStage:0,variant:Math.random(),flip:Math.random()<.5? -1:1,trackingLag,awareness:trackingLag?rand(.7,1.15):0,retargetTimer:trackingLag?rand(.35,.7):0,targetX:p.x,targetY:p.y,searchPause:0,dead:false});
}
function updateEnemies(dt){
  const p=game.player,freezeAll=game.effects.freeze>0;
  for(const e of game.enemies){
    if(e.dead)continue;e.hitFlash=Math.max(0,e.hitFlash-dt);e.stun=Math.max(0,e.stun-dt);e.freeze=Math.max(0,e.freeze-dt);e.slow=Math.max(0,e.slow-dt);
    if(e.burn>0){e.burn-=dt;e.ai-=dt;if(e.ai<=0){e.ai=.5;damageEnemy(e,e.burnDps*.5,'fire',false)}}
    if(e.dead)continue;
    const playerDx=p.x-e.x,playerDy=p.y-e.y,playerDist=Math.hypot(playerDx,playerDy)||1;
    let moveDx=playerDx,moveDy=playerDy;
    if(e.trackingLag){
      if(e.awareness>0){e.awareness-=dt;continue}
      e.searchPause=Math.max(0,e.searchPause-dt);
      e.retargetTimer-=dt;
      if(e.retargetTimer<=0){
        e.targetX=p.x;e.targetY=p.y;
        e.retargetTimer=e.type==='hound'?rand(.48,.72):rand(.62,.92);
      }
      moveDx=e.targetX-e.x;moveDy=e.targetY-e.y;
      if(Math.hypot(moveDx,moveDy)<22&&e.searchPause<=0){e.searchPause=rand(.16,.3);e.retargetTimer=0}
    }
    const moveDist=Math.hypot(moveDx,moveDy)||1,nx=moveDx/moveDist,ny=moveDy/moveDist;
    const pxn=playerDx/playerDist,pyn=playerDy/playerDist;
    let frozen=freezeAll&&e.type!=='boss';if(e.type==='boss'&&freezeAll) e.slowAmt=Math.max(e.slowAmt,.8),e.slow=.2;
    if(frozen||e.freeze>0||e.stun>0) continue;
    let sp=e.speed*(e.slow>0?1-e.slowAmt:1);
    if(e.type==='spitter'){
      e.shot-=dt;if(playerDist>390){e.x+=pxn*sp*dt;e.y+=pyn*sp*dt}else if(playerDist<235){e.x-=pxn*sp*.75*dt;e.y-=pyn*sp*.75*dt}else{e.x+=-pyn*Math.sin(game.elapsed+e.ai)*sp*.16*dt;e.y+=pxn*Math.sin(game.elapsed+e.ai)*sp*.16*dt}
      if(e.shot<=0&&playerDist<520){e.shot=2.4;spawnEnemyShot(e.x,e.y,pxn,pyn,12*dmgMult(game.elapsed),286,'orb')}
    } else if(e.type==='bloater'){
      if(e.state==='charge'){e.charge-=dt;if(e.charge<=0){enemyExplosion(e,104,22*dmgMult(game.elapsed));killEnemy(e,false);continue}}
      else if(playerDist<110){e.state='charge';e.charge=.8}else{e.x+=pxn*sp*dt;e.y+=pyn*sp*dt}
    } else if(e.type==='shadow'){
      if(e.state==='dash'){e.charge-=dt;e.x+=e.vx*dt;e.y+=e.vy*dt;if(e.charge<=0)e.state='move';}
      else{e.dash-=dt;if(e.dash<=0&&playerDist<520){e.state='wind';e.charge=.55;e.vx=nx*330;e.vy=ny*330;e.dash=3.4;addWave(e.x,e.y,20,170,.5,'rgba(196,94,255,.8)')}
      else if(e.state==='wind'){e.charge-=dt;if(e.charge<=0){e.state='dash';e.charge=.52}}else if(e.searchPause<=0){e.x+=nx*sp*dt;e.y+=ny*sp*dt}}
    } else if(e.type==='hound'){
      if(e.searchPause<=0){e.x+=nx*sp*dt;e.y+=ny*sp*dt}
    } else {e.x+=pxn*sp*dt;e.y+=pyn*sp*dt}
    if(e.type==='boss'){
      e.shot-=dt;if(e.shot<=0){e.shot=4.2;for(let i=-2;i<=2;i++){const a=Math.atan2(playerDy,playerDx)+i*.25;spawnEnemyShot(e.x,e.y,Math.cos(a),Math.sin(a),20,265,'bossBolt')}}
      const lost=1-e.hp/e.maxHp,stage=Math.floor(lost*4);if(stage>e.bossStage){e.bossStage=stage;for(let i=0;i<6;i++)spawnEnemy('rat',true);for(let i=0;i<1;i++)spawnEnemy('hound',true);addWave(e.x,e.y,30,330,.7,'rgba(255,45,105,.85)');sound.boom()}
    }
    const rr=e.r+p.r;if(playerDist<rr){hurtPlayer(e.damage);const push=16;e.x-=pxn*push;e.y-=pyn*push;}
  }
  game.enemies=game.enemies.filter(e=>!e.dead&&Math.abs(e.x-p.x)<2600&&Math.abs(e.y-p.y)<2600);
}

function hurtPlayer(amount){
  const p=game.player;if(p.invuln>0||game.effects.shield>0)return;p.hp-=amount;p.invuln=.75;game.shake=Math.max(game.shake,12);DOM.damageFlash.classList.remove('on');void DOM.damageFlash.offsetWidth;DOM.damageFlash.classList.add('on');sound.hurt();addText(p.x,p.y-30,`-${Math.round(amount)}`,'#ff668b',22);for(let i=0;i<15;i++)particle(p.x,p.y,rand(-180,180),rand(-180,180),rand(.25,.5),'#ff386b',rand(2,5));if(p.hp<=0)endGame(false)}
function damageEnemy(e,amount,kind='normal',text=true,knock=0,sourceX=game.player.x,sourceY=game.player.y){
  if(e.dead)return;
  if(!Number.isFinite(amount)){console.error('Invalid damage amount:', amount, kind);amount=0}
  e.hp-=amount;e.hitFlash=.07;if(text&&Math.random()<.48)addText(e.x+rand(-8,8),e.y-e.r,String(Math.round(amount)),kind==='crit'?'#fff3a4':'#f4edf2',kind==='crit'?19:14);
  if(knock>0&&e.type!=='boss'){const d=Math.hypot(e.x-sourceX,e.y-sourceY)||1;const resist=e.type==='golem'?.1:1;e.x+=(e.x-sourceX)/d*knock*resist;e.y+=(e.y-sourceY)/d*knock*resist}
  if(e.hp<=0)killEnemy(e,true);
}
function killEnemy(e,drop=true){
  if(e.dead)return;e.dead=true;game.kills++;if(drop)spawnGem(e.x,e.y,e.exp);if(game.effects.vampire>0)game.player.hp=Math.min(game.player.maxHp,game.player.hp+game.player.maxHp*.003);
  for(let i=0;i<Math.min(18,6+e.r/3);i++)particle(e.x,e.y,rand(-150,150),rand(-150,150),rand(.3,.7),e.type==='spitter'?'#5ce5b1':'#ff4d7d',rand(2,6));
  if(e.type==='boss')toast('深淵暴君已被擊殺');
}
function enemyExplosion(e,r,damage){addWave(e.x,e.y,15,r,.38,'rgba(255,70,108,.85)');if(Math.hypot(game.player.x-e.x,game.player.y-e.y)<r+game.player.r)hurtPlayer(damage);sound.boom()}

function updateWeapons(dt){
  const p=game.player,cdr=game.effects.overload>0?.6:1;
  p.baseTimer-=dt;if(p.baseTimer<=0){p.baseTimer=.82;const t=nearestEnemy(470);if(t)fireProjectile(p.x,p.y,t.x,t.y,13*(1+Math.min(game.level-1,40)*.02),470,10,'#ff5d8b',0,0,'needle')}
  for(const [key,w] of Object.entries(p.weapons)){
    w.timer=(w.timer||0)-dt;
    if(key==='orbit')continue;if(key==='drone'){updateDronesWeapon(w,dt,cdr);continue}
    if(w.timer<=0){triggerWeapon(key,w.level);w.timer=weaponCooldown(key,w.level)*cdr;}
  }
}
function weaponCooldown(k,l){return ({shotgun:l>=4?.85:1.15,boomerang:l>=4?1.15:1.45,flame:l>=4?3:3.8,lightning:l>=4?1.25:1.6,frost:l>=4?3.1:4,meteor:3.4,mine:l>=4?1.7:2.3,laser:l>=4?2.7:3.5,hammer:l>=4?1.8:2.4,gravity:l>=4?4.2:5.2}[k]||1);}
function triggerWeapon(k,l){
  const p=game.player,target=nearestEnemy(650);if(!target&&k!=='mine'&&k!=='frost'&&k!=='hammer')return;
  const ang=target?Math.atan2(target.y-p.y,target.x-p.x):p.angle;
  if(k==='shotgun'){
    const n=l>=2?7:5,spread=(l>=2?65:55)*Math.PI/180,dmg=l>=3?12:9,range=l>=4?330:300;
    for(let i=0;i<n;i++){const a=ang-spread/2+spread*(i/(n-1||1))+rand(-.025,.025);fireProjectile(p.x,p.y,p.x+Math.cos(a)*100,p.y+Math.sin(a)*100,dmg,520,7,'#ff8a6a',range,0,'pellet',l>=3?12:5)}
    if(l>=5)fireProjectile(p.x,p.y,p.x+Math.cos(ang)*100,p.y+Math.sin(ang)*100,28,610,11,'#fff0a0',380,3,'core',18);
    muzzle(p.x+Math.cos(ang)*28,p.y+Math.sin(ang)*28,'#ff9a66',10);sound.shot();
  } else if(k==='boomerang'){
    const n=l>=3?2:1;for(let i=0;i<n;i++){const a=ang+(i-(n-1)/2)*.35;game.boomerangs.push({x:p.x,y:p.y,vx:Math.cos(a)*420,vy:Math.sin(a)*420,age:0,returning:false,range:312,dmg:l>=2?22:18,r:l>=2?18:15,level:l,hitOut:new Set(),hitBack:new Set(),rot:0})}sound.tone(270,.1,'triangle',.025,180);
  } else if(k==='flame'){
    game.zones.push({type:'flameJet',x:p.x,y:p.y,ang,age:0,duration:l>=2?1.8:1.4,level:l,tick:0});if(l>=5)game.zones.push({type:'flameJet',x:p.x,y:p.y,ang:ang+Math.PI,age:0,duration:1.8,level:l,tick:0});sound.tone(95,.2,'sawtooth',.03,80);
  } else if(k==='lightning'){
    const starts=l>=5?2:1;for(let s=0;s<starts;s++){const first=s===0?nearestEnemy(520):nearestEnemy(520,game.enemies.filter(e=>!e.dead&&e!==target));if(first)chainLightning(first,l,l>=2?6:4,l>=3?40:30)}sound.tone(540,.12,'square',.025,420);
  } else if(k==='frost'){
    const rad=(l>=2?3.7:3)*U,dmg=l>=3?40:28;aoe(p.x,p.y,rad,dmg,e=>{e.slow=Math.max(e.slow,l>=3?3:2);e.slowAmt=Math.max(e.slowAmt,l>=3?.45:.35);if(l>=5)e.freeze=Math.max(e.freeze,e.type==='boss'?.27:e.type==='golem'?.55:1.1)},l>=4?32:18,'frost');addWave(p.x,p.y,20,rad,.45,'rgba(108,220,255,.9)','frost');sound.tone(310,.25,'sine',.035,250);
  } else if(k==='meteor'){
    const n=l>=5?3:l>=3?2:1,spots=getDistinctEnemySpots(n,230);
    spots.forEach((spot,i)=>game.meteors.push({x:spot.x+rand(-38,38),y:spot.y+rand(-38,38),age:-i*.16,duration:l>=5&&i===spots.length-1?1.05:.88,level:l,big:l>=5&&i===spots.length-1,seed:rand(0,TAU)}));
    sound.tone(130,.25,'triangle',.025,-50);
  } else if(k==='mine'){
    const max=l>=2?7:5;game.mines.push({x:p.x,y:p.y,r:l>=4?88:73,level:l,age:0});while(game.mines.length>max)game.mines.shift();
  } else if(k==='laser'){
    game.beams.push({x:p.x,y:p.y,ang,age:0,duration:l>=3?.65:.45,level:l,tick:0});if(l>=5)game.beams.push({x:p.x,y:p.y,ang:ang+Math.PI,age:0,duration:.65,level:l,tick:0});sound.tone(680,.22,'sawtooth',.035,-220);
  } else if(k==='hammer'){
    const rad=(l>=3?2.8:2.2)*U,dmg=l>=2?60:45;aoe(p.x,p.y,rad,dmg,e=>{if(l>=4)e.stun=Math.max(e.stun,.3)},58,'hammer');addWave(p.x,p.y,20,rad,.35,'rgba(238,194,116,.9)');if(l>=5)game.waves.push({x:p.x,y:p.y,r:0,max:4.2*U,age:-.45,dur:.45,color:'rgba(242,208,135,.85)',damage:55,hit:new Set()});sound.boom();
  } else if(k==='gravity'){
    const spots=getDistinctEnemySpots(l>=5?2:1,210);
    for(const spot of spots){
      const tx=spot.x+rand(-22,22),ty=spot.y+rand(-22,22),distance=Math.hypot(tx-p.x,ty-p.y);
      game.gravityOrbs.push({x:p.x,y:p.y,sx:p.x,sy:p.y,tx,ty,age:0,duration:clamp(.42+distance/1400,.52,.9),level:l,spin:rand(0,TAU)})
    }
    sound.tone(115,.35,'sine',.04,-55);
  }
}

function updateDronesWeapon(w,dt,cdr){
  const l=w.level,count=l>=5?3:l>=2?2:1;if(game.drones.length!==count){game.drones=Array.from({length:count},(_,i)=>({angle:i/count*TAU,timer:rand(0,.3),missile:rand(0,2)}))}
  for(const d of game.drones){d.angle+=dt*.9;d.timer-=dt;d.missile-=dt;const x=game.player.x+Math.cos(d.angle)*57,y=game.player.y+Math.sin(d.angle)*57;
    if(d.timer<=0){d.timer=(l>=4?.38:.55)*cdr;const t=nearestEnemy(365);if(t)fireProjectile(x,y,t.x,t.y,l>=3?14:10,590,6,'#73d8ff',0,l>=3?1:0,'drone')}
    if(l>=5&&d.missile<=0){d.missile=3;const t=nearestEnemy(480);if(t)fireProjectile(x,y,t.x,t.y,30,440,10,'#ffcb6e',0,0,'missile')}
  }
}

function fireProjectile(x,y,tx,ty,damage,speed,r,color,maxRange=0,pierce=0,type='normal',knock=0){const a=Math.atan2(ty-y,tx-x);game.projectiles.push({x,y,px:x,py:y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,damage,r,color,age:0,maxRange:maxRange||900,pierce,type,knock,hit:new Set()})}
function updateProjectiles(dt){
  for(const b of game.projectiles){b.px=b.x;b.py=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.age+=Math.hypot(b.vx,b.vy)*dt;
    for(const e of game.enemies){if(e.dead||b.hit.has(e))continue;const rr=e.r+b.r;if((e.x-b.x)**2+(e.y-b.y)**2<rr*rr){b.hit.add(e);damageEnemy(e,b.damage,b.type==='core'?'crit':'normal',true,b.knock,b.x,b.y);hitBurst(b.x,b.y,b.color,5);
        if(b.type==='core'){aoe(b.x,b.y,52,20,null,12,'normal');addWave(b.x,b.y,6,52,.2,'rgba(255,241,154,.8)')}
        if(b.type==='missile'){aoe(b.x,b.y,52,30,null,8,'normal');addWave(b.x,b.y,4,52,.22,'rgba(255,179,80,.85)');b.age=9999;break}
        if(b.pierce>0)b.pierce--;else{b.age=9999;break}
      }}
  }
  game.projectiles=game.projectiles.filter(b=>b.age<b.maxRange&&Math.abs(b.x-game.player.x)<1800&&Math.abs(b.y-game.player.y)<1800);
}

function spawnEnemyShot(x,y,nx,ny,damage,speed,type){
  const r=type==='bossBolt'?16:type==='wave'?12:9;
  game.enemyShots.push({x,y,px:x,py:y,vx:nx*speed,vy:ny*speed,r,damage,age:0,type})
}
function updateEnemyShots(dt){
  const p=game.player;
  for(const b of game.enemyShots){
    b.px=b.x;b.py=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.age+=dt;
    if((b.x-p.x)**2+(b.y-p.y)**2<(b.r+p.r)**2){hurtPlayer(b.damage);b.age=99}
  }
  game.enemyShots=game.enemyShots.filter(b=>b.age<(b.type==='bossBolt'?6:4.5))
}
function orbitSpec(level,expand=0){
  if(level<=1)return {count:2,radius:88,size:48,hit:25};
  if(level===2)return {count:3,radius:101,size:60,hit:31};
  if(level===3)return {count:4,radius:116,size:74,hit:38};
  if(level===4)return {count:6,radius:134,size:92,hit:48};
  return {count:8,radius:150+expand*58,size:112+expand*38,hit:62+expand*20};
}
function updateSpecials(dt){
  const p=game.player;
  // boomerangs
  for(const b of game.boomerangs){b.age+=dt;b.rot+=dt*9;if(!b.returning&&b.age>.65)b.returning=true;if(b.returning){const a=Math.atan2(p.y-b.y,p.x-b.x);b.vx+=(Math.cos(a)*560-b.vx)*Math.min(1,dt*7);b.vy+=(Math.sin(a)*560-b.vy)*Math.min(1,dt*7)}b.x+=b.vx*dt;b.y+=b.vy*dt;
    const set=b.returning?b.hitBack:b.hitOut;for(const e of game.enemies){if(e.dead||set.has(e))continue;if((e.x-b.x)**2+(e.y-b.y)**2<(e.r+b.r)**2){set.add(e);damageEnemy(e,b.dmg,'normal',true,8,b.x,b.y)}}
    if(b.returning&&Math.hypot(p.x-b.x,p.y-b.y)<28){b.done=true;if(b.level>=5){aoe(p.x,p.y,125,35,null,18,'normal');addWave(p.x,p.y,8,125,.28,'rgba(255,188,82,.8)')}}
  } game.boomerangs=game.boomerangs.filter(b=>!b.done&&b.age<3);
  // orbit
  const ow=p.weapons.orbit;if(ow){
    const l=ow.level;game.orbitPhase=(game.orbitPhase||0)+dt*(l>=3?3.05:2.35);
    const expand=l>=5?(Math.sin(game.elapsed*TAU/2.7)*.5+.5):0,spec=orbitSpec(l,expand);
    for(let i=0;i<spec.count;i++){
      const a=game.orbitPhase+i/spec.count*TAU,x=p.x+Math.cos(a)*spec.radius,y=p.y+Math.sin(a)*spec.radius;
      for(const e of game.enemies){
        if(e.dead)continue;const key=`${i}`;e.orbitHits=e.orbitHits||{};
        if((e.orbitHits[key]||0)>game.elapsed)continue;
        if((e.x-x)**2+(e.y-y)**2<(e.r+spec.hit)**2){
          e.orbitHits[key]=game.elapsed+.34;damageEnemy(e,l>=5?27:l>=3?18:12,'normal',false,l>=4?14:4,p.x,p.y)
        }
      }
    }
  }
  // zones: fireJet & burn areas
  for(const z of game.zones){z.age+=dt;z.tick-=dt;if(z.type==='flameJet'){
      z.x=p.x;z.y=p.y;const target=nearestEnemy(400);if(target){const ta=Math.atan2(target.y-p.y,target.x-p.x),max=dt*Math.PI/2;z.ang+=clamp(angleDiff(z.ang,ta),-max,max)}
      if(z.tick<=0){z.tick=.2;const range=(z.level>=4?5.2:4.5)*U,half=(z.level>=2?95:80)*Math.PI/360;for(const e of game.enemies){if(e.dead)continue;const dx=e.x-z.x,dy=e.y-z.y,d=Math.hypot(dx,dy);if(d<range&&Math.abs(angleDiff(z.ang,Math.atan2(dy,dx)))<half){damageEnemy(e,z.level>=3?8:7,'fire',false);if(z.level>=3){e.burn=Math.max(e.burn,3);e.burnDps=z.level>=5?8:4}}}for(let i=0;i<8;i++){const a=z.ang+rand(-half,half),sp=rand(170,360);particle(z.x+Math.cos(a)*24,z.y+Math.sin(a)*24,Math.cos(a)*sp,Math.sin(a)*sp,rand(.18,.4),pick(['#ff562e','#ffad3b','#ffe37a']),rand(3,8))}}
    } else if(z.type==='burn'||z.type==='acid'){if(z.tick<=0){z.tick=1;for(const e of game.enemies){if(e.dead)continue;if((e.x-z.x)**2+(e.y-z.y)**2<(e.r+z.r)**2){damageEnemy(e,z.damage,z.type==='burn'?'fire':'acid',false);if(z.type==='acid'&&z.slow){e.slow=.3;e.slowAmt=.25}}}}}
  } game.zones=game.zones.filter(z=>z.age<z.duration);
  // beams
  for(const b of game.beams){b.age+=dt;b.tick-=dt;b.x=p.x;b.y=p.y;const target=nearestEnemy(700);if(target&&b.level>=4){const ta=Math.atan2(target.y-p.y,target.x-p.x);b.ang+=clamp(angleDiff(b.ang,ta),-dt*1.2,dt*1.2)}if(b.tick<=0){b.tick=.1;const len=520,w=b.level>=2?42:29;for(const e of game.enemies){if(e.dead)continue;if(pointLineDistance(e.x,e.y,b.x,b.y,b.x+Math.cos(b.ang)*len,b.y+Math.sin(b.ang)*len)<e.r+w/2){damageEnemy(e,b.level>=3?13:12,'laser',false);if(b.level>=5){e.laserMark=(e.laserMark||0)+1;if(e.laserMark===5)setTimeout(()=>{if(!e.dead)damageEnemy(e,20,'crit')},500)}}}}}
  game.beams=game.beams.filter(b=>b.age<b.duration);
  // meteors: visible descent from the sky before impact
  for(const m of game.meteors){
    m.age+=dt;
    if(m.age<0||m.hit)continue;
    if(m.age>=m.duration){
      m.hit=true;const r=m.big?145:m.level>=2?112:90,d=m.big?120:m.level>=2?76:64;
      aoe(m.x,m.y,r,d,e=>{if(m.big)e.stun=.45},28,'meteor');addWave(m.x,m.y,8,r,.42,'rgba(255,116,50,.95)');
      for(let i=0;i<38;i++)particle(m.x,m.y,rand(-250,250),rand(-250,250),rand(.35,.9),pick(['#ff3e1f','#ff8f32','#ffd06b','#fff1b0']),rand(3,10));
      if(m.level>=4)game.zones.push({type:'burn',x:m.x,y:m.y,r,age:0,duration:3.4,damage:12,tick:.2});sound.boom()
    }
  }
  game.meteors=game.meteors.filter(m=>!m.hit||m.age<m.duration+.45);
  // mines
  for(const m of game.mines){m.age+=dt;const e=game.enemies.find(e=>!e.dead&&(e.x-m.x)**2+(e.y-m.y)**2<(e.r+18)**2);if(e&&!m.dead)detonateMine(m)}game.mines=game.mines.filter(m=>!m.dead);
  // thrown gravity cores travel from the player to their target
  for(const o of game.gravityOrbs){
    o.age+=dt;o.spin+=dt*8;
    const t=clamp(o.age/o.duration,0,1),ease=1-Math.pow(1-t,3);
    o.x=o.sx+(o.tx-o.sx)*ease;o.y=o.sy+(o.ty-o.sy)*ease-Math.sin(t*Math.PI)*34;
    if(Math.random()<dt*24)particle(o.x,o.y,rand(-45,45),rand(-45,45),rand(.22,.42),pick(['#c58cff','#8b4dff','#ffffff']),rand(2,5));
    if(t>=1&&!o.done){
      o.done=true;game.wells.push({x:o.tx,y:o.ty,r:(o.level>=2?3.2:2.7)*U,age:0,duration:o.level>=3?2.8:2.2,level:o.level,tick:0});
      addWave(o.tx,o.ty,6,58,.28,'rgba(202,142,255,.95)');game.shake=Math.max(game.shake,5)
    }
  }
  game.gravityOrbs=game.gravityOrbs.filter(o=>!o.done);
  // wells
  for(const w of game.wells){w.age+=dt;w.tick-=dt;if(w.tick<=0){w.tick=.25;for(const e of game.enemies){if(e.dead)continue;const dx=w.x-e.x,dy=w.y-e.y,d=Math.hypot(dx,dy)||1;if(d<w.r){const pull=(w.level>=4?110:78)*(e.type==='boss'||e.type==='golem'?.5:1);e.x+=dx/d*pull*.25;e.y+=dy/d*pull*.25;damageEnemy(e,w.level>=3?10:8,'gravity',false)}}}}
  for(const w of game.wells){if(w.age>=w.duration&&!w.boom){w.boom=true;aoe(w.x,w.y,w.r,w.level>=5?60:35,null,12,'gravity');addWave(w.x,w.y,8,w.r,.32,'rgba(179,100,255,.85)')}}game.wells=game.wells.filter(w=>w.age<w.duration+.2);
  // delayed waves with damage
  for(const w of game.waves){w.age+=dt;if(w.age<0)continue;const prev=w.r;w.r=Math.min(w.max,w.max*(w.age/w.dur));if(w.damage){for(const e of game.enemies){if(e.dead||w.hit.has(e))continue;const d=Math.hypot(e.x-w.x,e.y-w.y);if(d>=prev-e.r&&d<=w.r+e.r){w.hit.add(e);damageEnemy(e,w.damage,'hammer',true,20,w.x,w.y)}}}}game.waves=game.waves.filter(w=>w.age<w.dur);
  // lightning visuals
  for(const l of game.lightning)l.age+=dt;game.lightning=game.lightning.filter(l=>l.age<l.duration);
}
function detonateMine(m){m.dead=true;const l=m.level;aoe(m.x,m.y,m.r,l>=3?42:28,null,12,'acid');game.zones.push({type:'acid',x:m.x,y:m.y,r:m.r,age:0,duration:l>=2?4:3,damage:l>=3?9:6,tick:.3,slow:l>=5});addWave(m.x,m.y,7,m.r,.3,'rgba(85,231,149,.85)');if(l>=5){for(const other of game.mines){if(other!==m&&!other.dead&&Math.hypot(other.x-m.x,other.y-m.y)<156)setTimeout(()=>{if(!other.dead)detonateMine(other)},100)}}}

function chainLightning(first,level,maxHits,damage){const used=new Set();let cur=first;const pts=[{x:game.player.x,y:game.player.y}];for(let i=0;i<maxHits&&cur;i++){used.add(cur);pts.push({x:cur.x,y:cur.y});damageEnemy(cur,damage,'lightning',true);if(level>=4)cur.stun=Math.max(cur.stun,.15);let next=null,best=999999;for(const e of game.enemies){if(e.dead||used.has(e))continue;const d=(e.x-cur.x)**2+(e.y-cur.y)**2;if(d<166*166&&d<best){best=d;next=e}}cur=next}game.lightning.push({pts,age:0,duration:.2})}
function aoe(x,y,r,damage,fn,knock=0,kind='normal'){for(const e of game.enemies){if(e.dead)continue;if((e.x-x)**2+(e.y-y)**2<(r+e.r)**2){damageEnemy(e,damage,kind,true,knock,x,y);if(fn&&!e.dead)fn(e)}}}
function pointLineDistance(px,py,x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,l2=dx*dx+dy*dy;if(!l2)return Math.hypot(px-x1,py-y1);const t=clamp(((px-x1)*dx+(py-y1)*dy)/l2,0,1),x=x1+t*dx,y=y1+t*dy;return Math.hypot(px-x,py-y)}

function nearestEnemy(range=99999,list=game.enemies){let best=null,bd=range*range,p=game.player;for(const e of list){if(e.dead)continue;const d=(e.x-p.x)**2+(e.y-p.y)**2;if(d<bd){bd=d;best=e}}return best}
function densestEnemySpot(skip=0,exclude=[]){
  const live=game.enemies.filter(e=>!e.dead&&Math.abs(e.x-game.player.x)<W*.8&&Math.abs(e.y-game.player.y)<H*.8);
  if(!live.length)return null;
  let best=live[skip%live.length],score=-1;
  for(let i=0;i<Math.min(live.length,60);i++){
    const e=live[(i*7+skip)%live.length];
    if(exclude.some(p=>Math.hypot(p.x-e.x,p.y-e.y)<170))continue;
    let s=0;for(const o of live)if((o.x-e.x)**2+(o.y-e.y)**2<185*185)s+=1.2-(Math.min(1,Math.hypot(o.x-e.x,o.y-e.y)/185)*.4);
    if(s>score){score=s;best=e}
  }
  return best;
}
function getDistinctEnemySpots(count,minDist=150){
  const out=[];
  for(let i=0;i<count;i++){
    const spot=densestEnemySpot(i*173,out);
    if(spot&&!out.some(p=>Math.hypot(p.x-spot.x,p.y-spot.y)<minDist)) out.push({x:spot.x,y:spot.y});
  }
  if(!out.length){const t=nearestEnemy(720);if(t)out.push({x:t.x,y:t.y})}
  return out;
}

function spawnGem(x,y,value){game.gems.push({x,y,baseX:x,baseY:y,value,r:value>=20?13:value>=5?10:7,vx:0,vy:0,age:0,spin:rand(0,TAU)})}
function updateGems(dt){const p=game.player,rad=PICKUP_RAD[p.stats.pickup];for(const g of game.gems){g.age+=dt;g.spin+=dt*1.8;const dx=p.x-g.x,dy=p.y-g.y,d=Math.hypot(dx,dy)||1;if(game.globalMagnet>0||d<rad){const force=game.globalMagnet>0?980:clamp(170+(rad-d)*5.5,190,780);g.vx+=(dx/d*force-g.vx)*Math.min(1,dt*9);g.vy+=(dy/d*force-g.vy)*Math.min(1,dt*9);g.x+=g.vx*dt;g.y+=g.vy*dt}else{g.vx*=Math.max(0,1-dt*8);g.vy*=Math.max(0,1-dt*8);g.x+=(g.baseX-g.x)*Math.min(1,dt*7);g.y+=(g.baseY-g.y)*Math.min(1,dt*7)}if(Math.hypot(p.x-g.x,p.y-g.y)<p.r+14){gainExp(g.value);g.dead=true;sound.pickup();}}
  game.globalMagnet=Math.max(0,game.globalMagnet-dt);game.gems=game.gems.filter(g=>!g.dead);
}
function spawnMapDrop(){
  const roll=Math.random();
  const key=roll<.5?'heal':roll<.76?'magnet':'freeze';
  const p=game.player;
  const angle=Math.random()*TAU,dist=Math.max(W,H)*(.28+Math.random()*.22);
  const x=p.x+Math.cos(angle)*dist+rand(-90,90),y=p.y+Math.sin(angle)*dist+rand(-90,90);
  game.mapDrops.push({x,y,key,r:20,age:0,life:26,bob:rand(0,TAU),vx:0,vy:0});
  if(game.mapDrops.length>7)game.mapDrops.shift();
}
function updateMapDrops(dt){
  game.nextMapDrop-=dt;
  if(game.nextMapDrop<=0){spawnMapDrop();game.nextMapDrop=rand(14,22)}
  const p=game.player,rad=PICKUP_RAD[p.stats.pickup]*.95;
  for(const d of game.mapDrops){
    d.age+=dt;d.bob+=dt*2.6;
    const dx=p.x-d.x,dy=p.y-d.y,dist=Math.hypot(dx,dy)||1;
    if(dist<rad){const force=clamp(150+(rad-dist)*4.3,180,620);d.vx+=(dx/dist*force-d.vx)*Math.min(1,dt*7);d.vy+=(dy/dist*force-d.vy)*Math.min(1,dt*7);d.x+=d.vx*dt;d.y+=d.vy*dt}
    if(dist<p.r+d.r-6){applyItem(d.key);d.dead=true;sound.pickup()}
    if(d.age>d.life)d.dead=true;
  }
  game.mapDrops=game.mapDrops.filter(d=>!d.dead);
}
function gainExp(v){game.exp+=v*(game.effects.doublexp>0?2:1);while(game.exp>=game.need){game.exp-=game.need;game.level++;game.need=needXP(game.level);game.pendingLevels++;}if(game.pendingLevels>0&&state==='playing')openLevelUp()}

function openLevelUp(){state='level';sound.level();game.rewardChoices=generateRewards();DOM.rewardCards.innerHTML='';game.rewardChoices.forEach((r,i)=>{const card=document.createElement('button');card.className='reward-card';card.style.setProperty('--accent',r.color);card.style.setProperty('--accent-soft',hexToRgba(r.color,.18));card.innerHTML=`<span class="keycap">${i+1}</span><img src="${r.icon}" alt=""><span class="category">${r.categoryLabel}</span><h3>${r.name}</h3><span class="level-note">${r.levelNote||''}</span><p>${r.desc}</p>`;card.onclick=()=>chooseReward(i);DOM.rewardCards.append(card)});DOM.level.classList.add('show');updateHUD();}
function generateRewards(){
  const p=game.player,candidates=[];
  for(const [k,w] of Object.entries(WEAPONS)){const lv=p.weapons[k]?.level||0;if(lv>=5)continue;if(lv===0&&Object.keys(p.weapons).length>=6)continue;candidates.push({type:'weapon',key:k,name:w.name,icon:w.icon,color:w.color,categoryLabel:'武器',levelNote:lv?`Lv.${lv} → Lv.${lv+1}`:'取得新武器',desc:w.desc[lv]})}
  for(const [k,s] of Object.entries(STATS)){const lv=p.stats[k];if(lv>=5)continue;let desc=s.desc;if(k==='speed')desc=`移動速度由 ${SPEED_MULT[lv].toFixed(1)}× 提高為 ${SPEED_MULT[lv+1].toFixed(1)}×。`;candidates.push({type:'stat',key:k,name:s.name,icon:s.icon,color:s.color,categoryLabel:'提升',levelNote:`Lv.${lv} → Lv.${lv+1}`,desc})}
  for(const [k,it] of Object.entries(ITEMS)){if(k==='heal'&&p.hp>=p.maxHp)continue;if(k==='regen'&&p.hp/p.maxHp>=.9)continue;if(k==='magnet'&&game.gems.length<8)continue;if(k==='doublexp'&&game.duration-game.elapsed<25)continue;candidates.push({type:'item',key:k,name:it.name,icon:it.icon,color:it.color,categoryLabel:'道具',levelNote:'立即生效',desc:it.desc})}
  const out=[];const permanent=candidates.filter(x=>x.type!=='item');if(permanent.length)out.push(pick(permanent));
  const pool=candidates.filter(x=>!out.some(o=>o.type===x.type&&o.key===x.key));while(out.length<3&&pool.length){const idx=(Math.random()*pool.length)|0;out.push(pool.splice(idx,1)[0])}
  return out.sort(()=>Math.random()-.5);
}
function chooseReward(i){if(state!=='level'||!game.rewardChoices[i])return;const r=game.rewardChoices[i],p=game.player;if(r.type==='weapon'){if(!p.weapons[r.key])p.weapons[r.key]={level:1,timer:0};else p.weapons[r.key].level++;triggerWeapon(r.key,p.weapons[r.key].level);toast(`${r.name} Lv.${p.weapons[r.key].level}`)}else if(r.type==='stat'){p.stats[r.key]++;if(r.key==='hp'){p.maxHp+=15;p.hp=Math.min(p.maxHp,p.hp+15)}toast(`${r.name} Lv.${p.stats[r.key]}`)}else applyItem(r.key);
  game.pendingLevels--;DOM.level.classList.remove('show');buildWeaponRack();if(game.pendingLevels>0)setTimeout(openLevelUp,120);else{state='playing';last=performance.now()}}
function applyItem(k){const p=game.player,e=game.effects;if(k==='heal')p.hp=Math.min(p.maxHp,p.hp+40);else if(k==='regen')e.regen=8;else if(k==='shield')e.shield=5;else if(k==='magnet')game.globalMagnet=8;else if(k==='freeze')e.freeze=6;else if(k==='doublexp')e.doublexp=20;else if(k==='overload')e.overload=12;else if(k==='bomb'){for(const en of game.enemies)damageEnemy(en,en.type==='boss'?Math.min(350,en.hp*.08):350,'crit',false)}else if(k==='push'){for(const en of game.enemies){const dx=en.x-p.x,dy=en.y-p.y,d=Math.hypot(dx,dy)||1;if(d<Math.max(W,H)*.75){en.x+=dx/d*180;en.y+=dy/d*180;en.stun=1}}addWave(p.x,p.y,20,Math.max(W,H)*.65,.6,'rgba(191,159,255,.75)')}else if(k==='vampire')e.vampire=15;toast(ITEMS[k].name)}

function buildWeaponRack(){if(!game)return;DOM.weaponRack.innerHTML='';const entries=Object.entries(game.player.weapons);for(let i=0;i<6;i++){const d=document.createElement('div');d.className='weapon-slot'+(i>=entries.length?' empty':'');if(i<entries.length){const [k,w]=entries[i],def=WEAPONS[k];d.innerHTML=`<img src="${def.icon}" alt=""><b>Lv.${w.level}</b>`}else d.innerHTML='<span style="display:grid;place-items:center;height:42px;color:#6d6470">＋</span><b>EMPTY</b>';DOM.weaponRack.append(d)}}
function updateHUD(force=false){if(!game)return;const p=game.player;DOM.timer.textContent=fmtTime(game.duration-game.elapsed);DOM.levelText.textContent=game.level;DOM.kills.textContent=game.kills;DOM.hpFill.style.width=`${clamp(p.hp/p.maxHp*100,0,100)}%`;DOM.hpText.textContent=`${Math.ceil(Math.max(0,p.hp))} / ${p.maxHp}`;DOM.expFill.style.width=`${game.exp/game.need*100}%`;DOM.expText.textContent=`${Math.floor(game.exp)} / ${game.need}`;
  DOM.effectRack.innerHTML='';for(const [k,v] of Object.entries(game.effects)){if(v<=0)continue;const it=ITEMS[k==='regen'?'regen':k==='shield'?'shield':k==='freeze'?'freeze':k==='doublexp'?'doublexp':k==='overload'?'overload':'vampire'];if(!it)continue;const d=document.createElement('div');d.className='effect-pill';d.innerHTML=`<img src="${it.icon}" alt=""><span>${it.name}</span><b>${v.toFixed(1)}s</b>`;DOM.effectRack.append(d)}
}

function particle(x,y,vx,vy,life,color,size){game.particles.push({x,y,vx,vy,life,max:life,color,size})}
function updateParticles(dt){for(const p of game.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.2,dt);p.vy*=Math.pow(.2,dt)}game.particles=game.particles.filter(p=>p.life>0);for(const t of game.texts){t.life-=dt;t.y-=34*dt}game.texts=game.texts.filter(t=>t.life>0)}
function addText(x,y,text,color='#fff',size=14){game.texts.push({x,y,text,color,size,life:.65,max:.65})}
function hitBurst(x,y,color,n=5){for(let i=0;i<n;i++)particle(x,y,rand(-90,90),rand(-90,90),rand(.15,.3),color,rand(2,4))}
function muzzle(x,y,color,n){for(let i=0;i<n;i++)particle(x,y,rand(-130,130),rand(-130,130),rand(.12,.25),color,rand(2,5))}
function addWave(x,y,start,max,dur,color,style='ring'){game.waves.push({x,y,r:start,max,age:0,dur,color,style})}
function toast(text){const d=document.createElement('div');d.className='toast';d.innerHTML=`<b>◆</b> ${text}`;DOM.toastLayer.append(d);setTimeout(()=>d.remove(),2500)}
function hexToRgba(hex,a){const n=parseInt(hex.replace('#',''),16);return `rgba(${n>>16},${n>>8&255},${n&255},${a})`}

function draw(){
  if(!game){ctx.fillStyle='#080810';ctx.fillRect(0,0,W,H);return}
  const shake=game.shake>0?rand(-game.shake,game.shake):0;game.shake=Math.max(0,game.shake-.8);
  const camX=game.camera.x-W/2+shake,camY=game.camera.y-H/2+shake;
  ctx.save();ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#0a0911';ctx.fillRect(0,0,W,H);
  ctx.save();ctx.translate(-((camX%512)+512)%512,-((camY%512)+512)%512);ctx.globalAlpha=.78;if(game.pattern){ctx.fillStyle=game.pattern;ctx.fillRect(-512,-512,W+1024,H+1024)}ctx.restore();
  // world subtle grid/runes
  ctx.save();ctx.translate(-camX,-camY);drawWorld(camX,camY);ctx.restore();
  // lighting and vignette
  const grd=ctx.createRadialGradient(W/2,H/2,70,W/2,H/2,Math.max(W,H)*.72);grd.addColorStop(0,'rgba(255,32,88,.025)');grd.addColorStop(.55,'rgba(5,5,10,.1)');grd.addColorStop(1,'rgba(0,0,0,.62)');ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
  ctx.restore();
}
function drawWorld(camX,camY){
  const p=game.player;
  // zones behind
  for(const z of game.zones){if(z.type==='burn'||z.type==='acid'){ctx.save();ctx.globalAlpha=.18*(1-z.age/z.duration);ctx.fillStyle=z.type==='burn'?'#ff5a2e':'#42db8a';ctx.shadowBlur=30;ctx.shadowColor=ctx.fillStyle;ctx.beginPath();ctx.ellipse(z.x,z.y,z.r,z.r*.75,0,0,TAU);ctx.fill();ctx.restore()}}
  for(const w of game.wells)drawWell(w);
  for(const m of game.mines)drawMine(m);
  for(const g of game.gems)drawImageCentered(images.exp,g.x,g.y,g.r*2.6,g.r*2.6,g.spin||game.elapsed*1.7);
  for(const d of game.mapDrops)drawMapDrop(d);
  drawEnemies();
  for(const o of game.gravityOrbs)drawGravityOrb(o);
  for(const m of game.meteors)drawMeteor(m);
  // bullets behind player
  for(const b of game.enemyShots)drawEnemyShot(b);
  for(const b of game.projectiles)drawProjectile(b);
  for(const b of game.boomerangs)drawBoomerang(b);
  for(const z of game.zones)if(z.type==='flameJet')drawFlameJet(z);
  for(const b of game.beams)drawBeam(b);
  for(const l of game.lightning)drawLightning(l);
  for(const w of game.waves)drawWave(w);
  drawOrbit();drawDrones();drawMouseTarget();drawPlayer();
  for(const q of game.particles){ctx.save();ctx.globalAlpha=q.life/q.max;ctx.fillStyle=q.color;ctx.shadowBlur=8;ctx.shadowColor=q.color;ctx.beginPath();ctx.arc(q.x,q.y,q.size,0,TAU);ctx.fill();ctx.restore()}
  for(const t of game.texts){ctx.save();ctx.globalAlpha=t.life/t.max;ctx.font=`900 ${t.size}px system-ui`;ctx.textAlign='center';ctx.fillStyle=t.color;ctx.shadowColor='#000';ctx.shadowBlur=4;ctx.fillText(t.text,t.x,t.y);ctx.restore()}
}
function drawEnemies(){
  for(const e of game.enemies){
    if(e.dead)continue;
    ctx.save();
    ctx.translate(e.x,e.y);
    let scale=1;
    if(e.type==='bloater'&&e.state==='charge')scale=1+Math.sin((.8-e.charge)*25)*.08+(1-e.charge/.8)*.24;
    if(e.type==='boss')scale=1+Math.sin(game.elapsed*2)*.025;
    ctx.scale(e.flip||1,1);
    ctx.scale(scale,scale);
    ctx.globalAlpha=.24;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(0,e.r*.82,e.r*.9,e.r*.34,0,0,TAU);ctx.fill();
    if(e.freeze>0||game.effects.freeze>0){ctx.shadowBlur=24;ctx.shadowColor='#74ddff'}else{ctx.shadowBlur=e.type==='boss'?28:14;ctx.shadowColor=e.type==='spitter'?'#42e3aa':'#ff426f'}
    ctx.globalAlpha=e.hitFlash>0?.72:1;
    const im=images[ENEMIES[e.type].img];
    if(im)ctx.drawImage(im,-e.r*1.45,-e.r*1.45,e.r*2.9,e.r*2.9);else{ctx.fillStyle='#c43b64';ctx.beginPath();ctx.arc(0,0,e.r,0,TAU);ctx.fill()}
    if(e.freeze>0||game.effects.freeze>0){ctx.globalAlpha=.65;ctx.strokeStyle='rgba(136,227,255,.9)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,e.r+6+Math.sin(game.elapsed*6+e.variant*6)*2,0,TAU);ctx.stroke()}
    if(e.type==='shadow'&&e.state==='wind'){ctx.strokeStyle='rgba(211,109,255,.9)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(e.vx*.65,e.vy*.65);ctx.stroke()}
    if(e.type==='bloater'&&e.state==='charge'){ctx.strokeStyle=`rgba(255,78,121,${.4+Math.sin(game.elapsed*35)*.3})`;ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,55,0,TAU);ctx.stroke()}
    ctx.restore();
    if(e.type==='golem'||e.type==='boss'){const w=e.type==='boss'?120:76,h=7,x=e.x-w/2,y=e.y-e.r-18;ctx.fillStyle='rgba(0,0,0,.65)';roundRect(ctx,x,y,w,h,4);ctx.fill();ctx.fillStyle=e.type==='boss'?'#ff356d':'#d5aa68';roundRect(ctx,x,y,w*clamp(e.hp/e.maxHp,0,1),h,4);ctx.fill()}
  }
}
function drawPlayer(){const p=game.player;ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=.22;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(0,22,22,10,0,0,TAU);ctx.fill();ctx.globalAlpha=1;ctx.shadowBlur=game.effects.shield>0?34:20;ctx.shadowColor=game.effects.shield>0?'#67c9ff':'#ff3c70';if(p.invuln>0&&Math.floor(p.invuln*20)%2)ctx.globalAlpha=.42;ctx.rotate(p.angle+Math.PI/2);ctx.drawImage(images.player,-40,-40,80,80);ctx.restore();if(game.effects.shield>0){ctx.save();ctx.strokeStyle='rgba(104,206,255,.82)';ctx.lineWidth=3;ctx.shadowBlur=20;ctx.shadowColor='#77d8ff';ctx.beginPath();ctx.arc(p.x,p.y,33+Math.sin(game.elapsed*6)*3,0,TAU);ctx.stroke();ctx.restore()}}
function drawProjectile(b){ctx.save();ctx.strokeStyle=b.color;ctx.lineWidth=b.r*.65;ctx.lineCap='round';ctx.shadowBlur=12;ctx.shadowColor=b.color;ctx.beginPath();ctx.moveTo(b.px,b.py);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(b.x,b.y,b.r*.45,0,TAU);ctx.fill();ctx.restore()}
function drawEnemyShot(b){
  ctx.save();
  if(b.type==='bossBolt'){
    ctx.lineCap='round';
    ctx.strokeStyle='rgba(0,0,0,.92)';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(b.px,b.py);ctx.lineTo(b.x,b.y);ctx.stroke();
    ctx.strokeStyle='#4ff3ff';ctx.lineWidth=6;ctx.shadowBlur=28;ctx.shadowColor='#00eaff';ctx.beginPath();ctx.moveTo(b.px,b.py);ctx.lineTo(b.x,b.y);ctx.stroke();
    ctx.translate(b.x,b.y);ctx.rotate(game.elapsed*5);
    ctx.fillStyle='#eaffff';ctx.strokeStyle='#00151b';ctx.lineWidth=4;ctx.beginPath();
    for(let i=0;i<8;i++){const a=i/8*TAU,r=i%2?b.r*.58:b.r;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle='#45efff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,b.r+7+Math.sin(game.elapsed*9)*2,0,TAU);ctx.stroke();ctx.restore();return;
  }
  ctx.translate(b.x,b.y);ctx.rotate(game.elapsed*4);ctx.shadowBlur=18;ctx.shadowColor=b.type==='wave'?'#ffe76a':'#6dffb8';ctx.fillStyle=b.type==='wave'?'#ffe76a':'#5ae8ad';ctx.strokeStyle='rgba(0,0,0,.8)';ctx.lineWidth=3;ctx.beginPath();for(let i=0;i<8;i++){const a=i/8*TAU,r=i%2?b.r*.55:b.r;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()
}
function drawBoomerang(b){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.rot);ctx.strokeStyle='#ffc46d';ctx.lineWidth=8;ctx.shadowBlur=18;ctx.shadowColor='#ff9e38';ctx.beginPath();ctx.arc(0,0,b.r,0.2,5.45);ctx.stroke();ctx.restore()}
function drawOrbit(){
  const ow=game.player.weapons.orbit;if(!ow)return;
  const l=ow.level,expand=l>=5?(Math.sin(game.elapsed*TAU/2.7)*.5+.5):0,spec=orbitSpec(l,expand);
  ctx.save();ctx.globalAlpha=.2;ctx.strokeStyle='rgba(143,231,255,.55)';ctx.lineWidth=l>=4?4:2;ctx.shadowBlur=12;ctx.shadowColor='#5cddff';ctx.beginPath();ctx.arc(game.player.x,game.player.y,spec.radius,0,TAU);ctx.stroke();ctx.restore();
  for(let i=0;i<spec.count;i++){
    const a=(game.orbitPhase||0)+i/spec.count*TAU,x=game.player.x+Math.cos(a)*spec.radius,y=game.player.y+Math.sin(a)*spec.radius;
    ctx.save();ctx.globalAlpha=.25;ctx.strokeStyle='#8deaff';ctx.lineWidth=Math.max(4,spec.size*.11);ctx.beginPath();ctx.arc(game.player.x,game.player.y,spec.radius,a-.16,a);ctx.stroke();ctx.restore();
    drawImageCentered(images.orbitBlade,x,y,spec.size,spec.size,a+game.elapsed*5)
  }
}
function drawDrones(){for(const d of game.drones){const x=game.player.x+Math.cos(d.angle)*57,y=game.player.y+Math.sin(d.angle)*57;ctx.save();ctx.globalAlpha=.16;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(x,y+12,14,6,0,0,TAU);ctx.fill();ctx.restore();drawImageCentered(images.droneUnit,x,y,40,40,d.angle+Math.PI/2)}}
function drawFlameJet(z){
  const life=clamp(1-z.age/z.duration,0,1),range=(z.level>=4?5.6:4.7)*U,half=(z.level>=2?105:88)*Math.PI/360;
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.translate(z.x,z.y);ctx.rotate(z.ang);
  const grad=ctx.createLinearGradient(0,0,range,0);grad.addColorStop(0,'rgba(255,250,205,.78)');grad.addColorStop(.24,'rgba(255,178,48,.65)');grad.addColorStop(.65,'rgba(255,65,20,.34)');grad.addColorStop(1,'rgba(140,12,8,0)');
  ctx.globalAlpha=.78*life;ctx.fillStyle=grad;ctx.shadowBlur=34;ctx.shadowColor='#ff6b22';ctx.beginPath();ctx.moveTo(10,0);ctx.arc(0,0,range,-half,half);ctx.closePath();ctx.fill();
  const count=z.level>=4?28:22;
  for(let i=0;i<count;i++){
    const f=(i+.5)/count,wave=Math.sin(i*2.13+game.elapsed*15+z.age*8),a=wave*half*(.25+.6*f),dist=24+range*f;
    const x=Math.cos(a)*dist,y=Math.sin(a)*dist,sz=(20+58*f)*(1+.18*Math.sin(game.elapsed*18+i));
    ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI/2+wave*.18);ctx.globalAlpha=life*(.82-.38*f);ctx.drawImage(images.flameSprite,-sz*.42,-sz*.62,sz*.84,sz*1.24);ctx.restore();
  }
  ctx.globalAlpha=.95*life;ctx.fillStyle='#fff4c2';ctx.shadowBlur=22;ctx.shadowColor='#fff1a5';ctx.beginPath();ctx.ellipse(22,0,38,10,0,0,TAU);ctx.fill();ctx.restore()
}
function drawBeam(b){const len=520,w=b.level>=2?42:29,alpha=Math.sin(clamp(b.age/b.duration,0,1)*Math.PI);ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.ang);ctx.globalAlpha=.28*alpha;ctx.fillStyle='#ed72ff';ctx.shadowBlur=34;ctx.shadowColor='#d65dff';ctx.fillRect(0,-w/2,len,w);ctx.globalAlpha=.92*alpha;ctx.fillStyle='#fff';ctx.fillRect(0,-w*.12,len,w*.24);ctx.restore()}
function drawLightning(l){ctx.save();ctx.globalAlpha=1-l.age/l.duration;ctx.lineWidth=5;ctx.strokeStyle='#ffec74';ctx.shadowBlur=18;ctx.shadowColor='#ffec74';ctx.beginPath();l.pts.forEach((p,i)=>{if(!i)ctx.moveTo(p.x,p.y);else{const prev=l.pts[i-1];for(let s=1;s<=4;s++){const t=s/4,xx=prev.x+(p.x-prev.x)*t+rand(-6,6),yy=prev.y+(p.y-prev.y)*t+rand(-6,6);ctx.lineTo(xx,yy)}}});ctx.stroke();ctx.restore()}
function drawWave(w){if(w.age<0)return;ctx.save();const alpha=1-clamp(w.age/w.dur,0,1);if(w.style==='frost'&&images.frostRing){ctx.globalAlpha=.85*alpha;drawImageCentered(images.frostRing,w.x,w.y,w.r*2.15,w.r*2.15,game.elapsed*.25);ctx.restore();return}ctx.globalAlpha=alpha;ctx.strokeStyle=w.color;ctx.lineWidth=5;ctx.shadowBlur=16;ctx.shadowColor=w.color;ctx.beginPath();ctx.arc(w.x,w.y,w.r,0,TAU);ctx.stroke();ctx.restore()}
function drawMine(m){drawImageCentered(images.mineSprite,m.x,m.y,46,46,game.elapsed*.8)}
function drawWell(w){const t=game.elapsed*2;ctx.save();ctx.translate(w.x,w.y);ctx.globalAlpha=.78;for(let i=0;i<4;i++){ctx.strokeStyle=`rgba(183,108,255,${.2+i*.12})`;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,w.r*(.3+i*.18),w.r*(.12+i*.08),t+i*.7,0,TAU);ctx.stroke()}ctx.fillStyle='#030308';ctx.shadowBlur=28;ctx.shadowColor='#9d52ff';ctx.beginPath();ctx.arc(0,0,18,0,TAU);ctx.fill();ctx.restore()}
function drawMeteor(m){
  if(m.hit||m.age<0)return;
  const progress=clamp(m.age/m.duration,0,1),ease=1-Math.pow(1-progress,2.2),impactR=m.big?145:m.level>=2?112:90;
  ctx.save();ctx.translate(m.x,m.y);ctx.globalAlpha=.22+.2*progress;ctx.fillStyle='#ff3f20';ctx.strokeStyle='#ffb34f';ctx.lineWidth=4;ctx.setLineDash([10,8]);ctx.beginPath();ctx.arc(0,0,impactR*(1-.22*progress),0,TAU);ctx.fill();ctx.stroke();ctx.setLineDash([]);
  ctx.globalAlpha=.2+.45*progress;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(0,0,impactR*.55*progress+8,impactR*.22*progress+3,0,0,TAU);ctx.fill();ctx.restore();
  const ox=-170*(1-ease),oy=-430*(1-ease),scale=(m.big?1.55:1)*(0.55+.65*ease),rot=m.seed+progress*2.5;
  ctx.save();ctx.translate(m.x+ox,m.y+oy);ctx.rotate(rot);ctx.shadowBlur=36;ctx.shadowColor='#ff5a20';ctx.globalAlpha=.95;const sz=96*scale;ctx.drawImage(images.meteorSprite,-sz/2,-sz/2,sz,sz);ctx.restore();
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle='rgba(255,107,32,.72)';ctx.lineWidth=18*scale;ctx.lineCap='round';ctx.shadowBlur=28;ctx.shadowColor='#ff5b1d';ctx.beginPath();ctx.moveTo(m.x+ox-55,m.y+oy-140);ctx.lineTo(m.x+ox,m.y+oy);ctx.stroke();ctx.restore()
}
function drawGravityOrb(o){
  const t=clamp(o.age/o.duration,0,1),size=32+18*t;ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.spin);ctx.shadowBlur=28;ctx.shadowColor='#b069ff';ctx.drawImage(images.gravityOrb,-size/2,-size/2,size,size);ctx.strokeStyle='rgba(229,202,255,.7)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,size*.72+Math.sin(game.elapsed*10)*3,0,TAU);ctx.stroke();ctx.restore()
}
function drawMouseTarget(){
  if(!mouse.active||state!=='playing')return;ctx.save();ctx.translate(mouse.targetX,mouse.targetY);ctx.globalAlpha=.7;ctx.strokeStyle='#74ebff';ctx.lineWidth=2;ctx.setLineDash([6,5]);ctx.beginPath();ctx.arc(0,0,15+Math.sin(game.elapsed*8)*3,0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(-22,0);ctx.lineTo(-8,0);ctx.moveTo(22,0);ctx.lineTo(8,0);ctx.moveTo(0,-22);ctx.lineTo(0,-8);ctx.moveTo(0,22);ctx.lineTo(0,8);ctx.stroke();ctx.restore()
}
function drawMapDrop(d){const key=d.key==='heal'?'healDrop':d.key==='freeze'?'freezeDrop':'magnetDrop';const bob=Math.sin(d.bob)*6;ctx.save();ctx.globalAlpha=.16;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(d.x,d.y+20,18,7,0,0,TAU);ctx.fill();ctx.restore();ctx.save();ctx.translate(d.x,d.y+bob);ctx.shadowBlur=22;ctx.shadowColor=d.key==='heal'?'#ff5c8b':d.key==='freeze'?'#91e2ff':'#63f0ff';ctx.drawImage(images[key],-18,-18,36,36);ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,22+Math.sin(d.bob*1.4)*2,0,TAU);ctx.stroke();ctx.restore()}
function drawImageCentered(im,x,y,w,h,rot=0){if(!im)return;ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore()}
function roundRect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);return c}

function loop(now){const dt=Math.min(.033,(now-last)/1000||0);last=now;update(dt);draw();requestAnimationFrame(loop)}

// input
function pointerToWorld(e){
  const r=canvas.getBoundingClientRect(),sx=(e.clientX-r.left)/r.width*W,sy=(e.clientY-r.top)/r.height*H;
  return {x:game.camera.x+sx-W/2,y:game.camera.y+sy-H/2}
}
canvas.addEventListener('pointerdown',e=>{
  if(e.button!==0||state!=='playing'||!game)return;
  const p=pointerToWorld(e);mouse.active=true;mouse.held=true;mouse.targetX=p.x;mouse.targetY=p.y;
  try{canvas.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault()
});
canvas.addEventListener('pointermove',e=>{
  if(!mouse.held||state!=='playing'||!game)return;const p=pointerToWorld(e);mouse.active=true;mouse.targetX=p.x;mouse.targetY=p.y;e.preventDefault()
});
canvas.addEventListener('pointerup',e=>{if(e.button===0)mouse.held=false});
canvas.addEventListener('pointercancel',()=>mouse.held=false);
canvas.addEventListener('contextmenu',e=>{e.preventDefault();mouse.active=false;mouse.held=false});
window.addEventListener('keydown',e=>{keys[e.code]=true;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(e.code==='Escape')togglePause();if(state==='level'&&['Digit1','Digit2','Digit3','Numpad1','Numpad2','Numpad3'].includes(e.code)){const n=parseInt(e.code.slice(-1))-1;chooseReward(n)}});
window.addEventListener('keyup',e=>keys[e.code]=false);
$('#start-btn').onclick=startGame;$('#restart-btn').onclick=startGame;$('#restart-pause-btn').onclick=startGame;$('#pause-btn').onclick=()=>togglePause();$('#resume-btn').onclick=()=>togglePause(false);
DOM.soundBtn.onclick=()=>{sound.enabled=!sound.enabled;DOM.soundBtn.textContent=`音效：${sound.enabled?'開啟':'關閉'}`;if(sound.enabled)sound.pickup()};

const joy=$('#joystick-base'),knob=$('#joystick-knob');let joyId=null;
function joyMove(e){const t=[...e.changedTouches].find(x=>x.identifier===joyId);if(!t)return;const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=t.clientX-cx,dy=t.clientY-cy,d=Math.hypot(dx,dy),m=Math.min(44,d),nx=d?dx/d:0,ny=d?dy/d:0;knob.style.transform=`translate(${nx*m}px,${ny*m}px)`;touch.x=nx*Math.min(1,d/44);touch.y=ny*Math.min(1,d/44);touch.active=true;e.preventDefault()}
joy.addEventListener('touchstart',e=>{joyId=e.changedTouches[0].identifier;joyMove(e)},{passive:false});joy.addEventListener('touchmove',joyMove,{passive:false});joy.addEventListener('touchend',e=>{if([...e.changedTouches].some(x=>x.identifier===joyId)){joyId=null;touch.x=touch.y=0;touch.active=false;knob.style.transform='translate(0,0)'}},{passive:false});

window.__CE_TEST__={
  start(){startGame();sound.enabled=false;game.player.hp=999999;game.player.maxHp=999999;game.effects.shield=999999},
  snapshot(){return {elapsed:game?.elapsed,player:game?{x:game.player.x,y:game.player.y}:null,spawnCounts:game?{...game.spawnCounts}:null,enemies:game?.enemies.map(e=>e.type),enemyStates:game?.enemies.slice(0,5).map(e=>({type:e.type,x:+e.x.toFixed(2),y:+e.y.toFixed(2),awareness:+(e.awareness||0).toFixed(2),retarget:+(e.retargetTimer||0).toFixed(2)})),spawnRate:game?spawnRateAt(game.elapsed):0,enemyCap:game?enemyCapAt(game.elapsed):0,meteors:game?.meteors.length,gravityOrbs:game?.gravityOrbs.length,wells:game?.wells.length}},
  simulateDirector(seconds,step=.25){if(!game)this.start();for(let t=0;t<seconds;t+=step){game.elapsed+=step;updateSpawns(step);if(game.enemies.length>220)game.enemies.splice(0,120)}return {...game.spawnCounts}},
  giveWeapon(key,level=5){game.player.weapons[key]={level,timer:999};triggerWeapon(key,level)},
  addEnemy(type,x=game.player.x+260,y=game.player.y){spawnEnemy(type,'intro');const e=game.enemies[game.enemies.length-1];e.x=x;e.y=y;return e.type},
  bossVolley(){for(let i=-2;i<=2;i++){const a=Math.PI/2+i*.25;spawnEnemyShot(game.player.x-170,game.player.y-250,Math.cos(a),Math.sin(a),20,265,'bossBolt')}},
  tickSpecials(seconds,step=.016){for(let t=0;t<seconds;t+=step)updateSpecials(step);return this.snapshot()},
  tickEnemies(seconds,step=.016){for(let t=0;t<seconds;t+=step)updateEnemies(step);return this.snapshot()},
  simulatePlay(seconds,step=.033){if(!game)this.start();let peak=game.enemies.length;for(let t=0;t<seconds;t+=step){if(state==='level')chooseReward(0);if(state!=='playing')state='playing';update(step);peak=Math.max(peak,game.enemies.length)}return {peak,alive:game.enemies.length,kills:game.kills,level:game.level,counts:{...game.spawnCounts}}}

};
loadImages().then(()=>{resetGame();requestAnimationFrame(loop)});
})();
