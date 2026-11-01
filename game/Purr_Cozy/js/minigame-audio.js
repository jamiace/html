/* 0.92.29 Purr Cozy mini games: one shared Web Audio graph for every instrument and table-game sound.
   Synthesised in the browser (no samples). Instruments return a handle so held keys can be damped on release. */
const MiniAudio={
 ctx:null,bus:null,live:new Set(),noiseBuf:null,ksCache:new Map(),lastSfx:Object.create(null),
 allowed(){return Game.S?.settings?.chime!==false&&(typeof nookTouched!=='function'||nookTouched())},
 context(){
  if(!this.allowed())return null;
  try{
   if(!this.ctx){
    // Reuse an existing context (Meow Typo / FurnPlay) so the page never holds several AudioContexts.
    let A=(typeof TypoSound!=='undefined'&&TypoSound.context)||(typeof FurnPlay!=='undefined'&&FurnPlay.audio)||null;
    if(!A){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;A=new C()}
    this.ctx=A;
    if(typeof TypoSound!=='undefined'&&!TypoSound.context)TypoSound.context=A;
    if(typeof FurnPlay!=='undefined')FurnPlay.audio=A;
    const comp=A.createDynamicsCompressor();comp.threshold.value=-16;comp.knee.value=12;comp.ratio.value=4;comp.attack.value=.003;comp.release.value=.18;
    const g=A.createGain();g.gain.value=.85;g.connect(comp);comp.connect(A.destination);this.bus=g;
   }
   if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
   return this.ctx;
  }catch{return null}
 },
 freq:m=>440*Math.pow(2,(m-69)/12),
 noise(A){if(!this.noiseBuf){const b=A.createBuffer(1,A.sampleRate,A.sampleRate),d=b.getChannelData(0);let r=22501;for(let i=0;i<d.length;i++){r=(Math.imul(r,1664525)+1013904223)>>>0;d[i]=r/2147483648-1}this.noiseBuf=b}return this.noiseBuf},
 // One partial: sine/triangle with a two-stage (strike, then ring) exponential decay.
 partial(A,h,dest,type,f,peak,at,tau1,tau2,split=.22){const o=A.createOscillator(),g=A.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(peak,at+.004);g.gain.setTargetAtTime(peak*split,at+.004,tau1);g.gain.setTargetAtTime(0,at+.004+tau1*2.2,tau2);o.connect(g);g.connect(dest);o.start(at);h.src.push(o)},
 build:{
  piano(A,h,f,v,at){const lp=A.createBiquadFilter();lp.type='lowpass';lp.frequency.value=Math.min(15000,f*(3+9*v));lp.Q.value=.4;lp.connect(h.out);h.nodes.push(lp);
   const ring=Math.min(3.4,Math.max(.6,2.6*Math.sqrt(262/f))),amp=.15*v*Math.min(1.35,Math.pow(262/f,.25));
   [[1,1],[2,.46],[3,.24],[4,.13],[5,.075],[6,.04],[7,.022]].forEach(([n,a])=>{const fn=f*n*Math.sqrt(1+.00035*n*n);if(fn<14000)MiniAudio.partial(A,h,lp,'sine',fn,amp*a,at,.05/n+.02,ring/(1+.55*(n-1)),.4)});
   const s=A.createBufferSource(),bp=A.createBiquadFilter(),g=A.createGain();s.buffer=MiniAudio.noise(A);bp.type='bandpass';bp.frequency.value=Math.min(9000,f*5);bp.Q.value=1.2;g.gain.setValueAtTime(.05*v,at);g.gain.setTargetAtTime(0,at,.012);s.connect(bp);bp.connect(g);g.connect(h.out);s.start(at,Math.random()*.5);h.src.push(s);
   h.end=at+ring*3.4;h.damp=.06},
  toy(A,h,f,v,at){const a=.16*v;MiniAudio.partial(A,h,h.out,'sine',f,a,at,.09,.42,.55);MiniAudio.partial(A,h,h.out,'triangle',f,a*.32,at,.05,.16,.4);MiniAudio.partial(A,h,h.out,'sine',f*4.07,a*.3,at,.012,.05,.2);h.end=at+1.7;h.damp=.08},
  musicbox(A,h,f,v,at){const a=.14*v;MiniAudio.partial(A,h,h.out,'sine',f,a,at,.15,.7,.6);MiniAudio.partial(A,h,h.out,'sine',f*2,a*.22,at,.06,.3,.4);MiniAudio.partial(A,h,h.out,'sine',f*5.2,a*.12,at,.01,.05,.2);h.end=at+2.6;h.damp=.35},
  chime(A,h,f,v,at){const a=.11*v;[[1,1,1.3],[2.76,.45,.7],[5.4,.22,.32],[8.93,.1,.16]].forEach(([r,k,t])=>MiniAudio.partial(A,h,h.out,'sine',f*r,a*k,at,t*.25,t,.7));h.end=at+5;h.damp=.8},
  guitar(A,h,f,v,at){const buf=MiniAudio.pluck(A,f),s=A.createBufferSource(),lp=A.createBiquadFilter(),g=A.createGain();s.buffer=buf.b;s.playbackRate.value=buf.rate;lp.type='lowpass';lp.frequency.value=1800+4200*v;g.gain.value=.55*v;s.connect(lp);lp.connect(g);g.connect(h.out);s.start(at);h.src.push(s);h.nodes.push(lp,g);h.end=at+buf.b.duration/buf.rate;h.damp=.09}
 },
 // Karplus-Strong string, cached per pitch. Period N+0.5 is corrected with playbackRate for exact tuning.
 pluck(A,f){const sr=A.sampleRate,N=Math.max(8,Math.floor(sr/f-.5)),key=N;let b=this.ksCache.get(key);if(!b){const len=Math.floor(sr*2.2),buf=A.createBuffer(1,len,sr),d=buf.getChannelData(0);let r=9871+N,prev=0,peak=0;for(let i=0;i<N;i++){r=(Math.imul(r,1664525)+1013904223)>>>0;const n=r/2147483648-1;d[i]=prev=.6*n+.4*prev}for(let i=N;i<len;i++)d[i]=.4985*(d[i-N]+d[i-N-1]);for(let i=0;i<len;i++)peak=Math.max(peak,Math.abs(d[i]));if(peak)for(let i=0;i<len;i++)d[i]/=peak;b=buf;this.ksCache.set(key,b)}return{b,rate:(N+.5)/(sr/f)}},
 // Instrument note. opt: {voice, vel, at (audio time), dur (auto-release after seconds)}.
 note(midi,opt={}){
  const A=this.context();if(!A||!this.bus)return null;
  try{
   const voice=this.build[opt.voice]?opt.voice:'piano',v=Math.max(.05,Math.min(1,opt.vel??.8)),at=Math.max(A.currentTime,opt.at||0);
   const out=A.createGain();out.gain.value=1;out.connect(this.bus);
   const h={out,src:[],nodes:[],at,voice,end:at+3,damp:.08,stopped:false};
   this.build[voice](A,h,this.freq(midi+(voice==='chime'?12:0)),v,at);
   for(const s of h.src)s.stop(h.end);
   h.src[0].onended=()=>this.cleanup(h);
   this.live.add(h);this.trim(A);
   if(opt.dur!=null)this.release(h,at+opt.dur);
   return h;
  }catch{return null}
 },
 release(h,when){if(!h||h.stopped||!this.ctx)return;const A=this.ctx,t=Math.max(A.currentTime,when??A.currentTime);if(t+h.damp*7>=h.end)return;try{h.out.gain.setTargetAtTime(0,t,h.damp);h.end=t+h.damp*7;for(const s of h.src)s.stop(h.end)}catch{}},
 stop(h,fade=.03){if(!h||h.stopped||!this.ctx)return;const A=this.ctx,t=A.currentTime;try{h.out.gain.cancelScheduledValues(t);h.out.gain.setValueAtTime(h.out.gain.value,t);h.out.gain.linearRampToValueAtTime(0,t+fade);for(const s of h.src)s.stop(t+fade+.01)}catch{}h.stopped=true;if(h.at>t)this.cleanup(h)},
 cleanup(h){if(!this.live.has(h))return;this.live.delete(h);h.stopped=true;try{h.out.disconnect();for(const n of[...h.src,...h.nodes])n.disconnect()}catch{}},
 // Voice limit: fade the oldest notes that are already sounding; never cut notes scheduled for later.
 trim(){if(this.live.size<=28)return;const now=this.ctx?.currentTime??0,old=[...this.live].filter(h=>h.at<=now&&!h.stopped).sort((a,b)=>a.at-b.at).slice(0,this.live.size-28);for(const h of old)this.stop(h,.05)},
 stopAll(){for(const h of[...this.live])this.stop(h,.04)},
 // Short effects for table games. amp ~ impact strength 0..1.
 sfx(name,amp=1){
  const A=this.context();if(!A||!this.bus)return;const now=A.currentTime;if(now-(this.lastSfx[name]??-1)<.035)return;this.lastSfx[name]=now;amp=Math.max(.05,Math.min(1.2,amp));
  const out=this.bus;
  const tone=(type,f0,f1,dur,gain,at=now,tau=dur/4)=>{try{const o=A.createOscillator(),g=A.createGain();o.type=type;o.frequency.setValueAtTime(f0,at);if(f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,at+dur*.8);g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(gain,at+.004);g.gain.setTargetAtTime(0,at+.004,tau);o.connect(g);g.connect(out);o.start(at);o.stop(at+dur+.05);o.onended=()=>{o.disconnect();g.disconnect()}}catch{}};
  const hiss=(dur,gain,type,f,q=1,at=now)=>{try{const s=A.createBufferSource(),fl=A.createBiquadFilter(),g=A.createGain();s.buffer=this.noise(A);fl.type=type;fl.frequency.value=f;fl.Q.value=q;g.gain.setValueAtTime(gain,at);g.gain.setTargetAtTime(0,at,dur/4);s.connect(fl);fl.connect(g);g.connect(out);s.start(at,Math.random()*.5);s.stop(at+dur+.05);s.onended=()=>{s.disconnect();fl.disconnect();g.disconnect()}}catch{}};
  const a=amp;
  switch(name){
   case'bumper':tone('triangle',990,700,.16,.13*a);tone('sine',1480,1320,.1,.05*a);hiss(.03,.08*a,'highpass',3000);break;
   case'sling':tone('square',420,300,.06,.04*a);hiss(.04,.08*a,'bandpass',1800,2);break;
   case'flipper':hiss(.05,.12,'lowpass',500);tone('sine',140,90,.06,.08);break;
   case'lane':tone('sine',1320,1320,.12,.07*a);tone('sine',1980,1980,.1,.03*a,now+.05);break;
   case'target':tone('triangle',760,760,.12,.09*a);hiss(.02,.05,'highpass',2500);break;
   case'saucer':tone('sine',330,660,.3,.1);tone('sine',495,990,.3,.06,now+.06);break;
   case'launch':hiss(.35,.14*a,'bandpass',900,.7);tone('sine',90,60,.15,.1*a);break;
   case'drain':tone('triangle',440,130,.6,.1);break;
   case'save':[0,4,7].forEach((n,i)=>tone('sine',523.25*Math.pow(2,n/12),523.25*Math.pow(2,n/12),.18,.07,now+i*.07));break;
   case'bonus':[0,4,7,12].forEach((n,i)=>tone('triangle',659.25*Math.pow(2,n/12),659.25*Math.pow(2,n/12),.22,.08,now+i*.08));break;
   case'rim':[1240,1867,2650].forEach((f,i)=>tone('sine',f,f*.99,.35,(.07-.018*i)*a,now,.07));hiss(.03,.06*a,'highpass',2000);break;
   case'board':tone('sine',160,110,.12,.14*a);hiss(.06,.1*a,'lowpass',700);break;
   case'bounce':tone('sine',120,70,.12,.16*a);hiss(.05,.06*a,'lowpass',400);break;
   case'swish':hiss(.28,.11,'bandpass',2200,.8);hiss(.2,.05,'bandpass',900,.8,now+.08);break;
   case'throw':hiss(.12,.07*a,'bandpass',600,.6);break;
   case'wall':tone('sine',560+200*a,380,.06,.1*a,now,.015);hiss(.02,.05*a,'bandpass',2400,2);break;
   case'hole':tone('sine',620,140,.5,.11);break;
   case'goal':case'win':[0,4,7,12,16].forEach((n,i)=>tone('triangle',523.25*Math.pow(2,n/12),523.25*Math.pow(2,n/12),.28,.08,now+i*.09));break;
   case'over':[7,4,0].forEach((n,i)=>tone('sine',392*Math.pow(2,n/12),392*Math.pow(2,n/12),.25,.07,now+i*.12));break;
   case'error':tone('square',220,180,.12,.035);break;
  }
 }
};
