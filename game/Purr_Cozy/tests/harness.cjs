// Loads the real mini-game scripts into a Node VM with small host stand-ins (no browser, no rendering).
const fs=require('fs'),vm=require('vm'),path=require('path');
const ROOT=path.join(__dirname,'..');
function load(files=['minigame-audio.js','minigame-physics.js','minigame-table.js','minigame-pinball.js','minigame-toss.js','minigame-maze.js','minigame-vending.js','minigame-instrument.js']){
 const noop=()=>{},listeners={};
 const el=()=>{const e={style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},children:[],dataset:{},append(...c){e.children.push(...c)},replaceChildren(...c){e.children=c},addEventListener:noop,removeEventListener:noop,setAttribute:noop,querySelector:()=>null,querySelectorAll:()=>[],getBoundingClientRect:()=>({left:0,top:0,width:360,height:560}),getContext:()=>new Proxy({},{get:(t,k)=>k==='createRadialGradient'||k==='createLinearGradient'?()=>({addColorStop:noop}):noop}),remove:noop,setPointerCapture:noop,textContent:''};return e};
 const counters={reward:0,saved:0,refresh:0,opened:[],closed:[]};
 const item={uid:1,k:'cozy_pinball_1',x:0,y:0};
 const S={items:[item],settings:{chime:false},furnPlay:{version:1,items:{}},playProgress:{}};
 const ctx={console,Math,Map,Set,Date,JSON,Object,Array,Number,String,Promise,Error,performance:{now:()=>Date.now()},
  requestAnimationFrame:()=>1,cancelAnimationFrame:noop,setTimeout:(f)=>0,clearTimeout:noop,
  window:{addEventListener:(t,f)=>{(listeners['w'+t]??=[]).push(f)},devicePixelRatio:1},
  document:{hidden:false,addEventListener:(t,f)=>{(listeners[t]??=[]).push(f)},createElement:el,head:{append:noop},elementFromPoint:()=>null},
  h:(tag,attrs,...kids)=>{const e=el();e.tag=tag;Object.assign(e,attrs||{});e.kids=kids.flat();return e},
  ico:()=>el(),sprPreview:()=>el(),
  I18n:{t:(k,a=[])=>k+(a.length?'('+a.join(',')+')':''),s:(k)=>k},
  ITEMS:{cozy_pinball_1:{n:'Pinball'},cozy_basket_1:{n:'Basket'},cozy_maze_1:{n:'Maze'},fun_piano:{n:'Piano',spr:'fun_piano'},cozy_piano_1:{n:'Toy',spr:'cozy_piano_1'}},
  Game:{S,save(){counters.saved++},outdated:false},
  Room:{edit:false},
  Cozy:{item:uid=>S.items.find(i=>i.uid===uid),complete(tok){if(tok.credited)return;tok.credited=true;counters.reward++},progress:()=>({today:0,luck:0}),t:k=>k,restoreHelp:noop},
  Social:{helpsToday:()=>0},
  UI:{wins:{cozygame:{el:{hidden:false,style:{zIndex:'5'}},body:el()},furnplay:{el:{hidden:false,style:{zIndex:'4'}},body:el()}},openWin(id){counters.opened.push(id)},closeWin(id){counters.closed.push(id)},refresh(){counters.refresh++},toast:noop},
  ResizeObserver:undefined};
 ctx.Room.state=S;ctx.globalThis=ctx;vm.createContext(ctx);
 for(const f of files)vm.runInContext(fs.readFileSync(path.join(ROOT,'js',f),'utf8'),ctx,{filename:f});
 vm.runInContext('globalThis.X={MiniAudio,MiniPhys,MiniHost,MiniTable,'+['MiniPinball','MiniToss','MiniMaze','MiniVending','MiniInstrument'].map(n=>`${n}:typeof ${n}!=='undefined'?${n}:null`).join(',')+'}',ctx);
 return{ctx,X:ctx.X,S,item,counters,listeners};
}
// Builds a table session without the DOM loop; step() advances fixed steps.
function session(env,mode,k,variant=0){const{X,S}=env;const it={uid:S.items.length+1,k,x:0,y:0};S.items.push(it);const T=X.MiniTable,game=T.games[mode];
 const s={uid:it.uid,k,mode,game,state:S,variant,pointers:new Map(),fx:[],shake:0,time:0,dom:{status:{},controls:{replaceChildren(){}},progress:{},restore:{}}};
 s.token={credited:false};s.won=false;s.over=false;s.g=game.create(s,T);T.session=s;
 s.step=(sec)=>{const n=Math.round(sec/game.dt);for(let i=0;i<n;i++){game.step(s,game.dt,T);if(!s.over)s.time+=game.dt}};
 return s}
module.exports={load,session};
