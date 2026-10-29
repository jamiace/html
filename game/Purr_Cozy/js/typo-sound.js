/* Short feedback sounds, unlocked by the player's gesture. Words use SpeechSynthesis. */
const TypoSound={
 context:null,buffer:null,decoding:null,lastKey:-1,lastMeow:-1,lastEnter:-1,keyIndex:0,keyBuffers:null,enterBuffer:null,enterVoice:null,
 bytes:fetch('assets/cats-typo/meow.wav?v='+encodeURIComponent(PURR_BUILD.version)).then(r=>{if(!r.ok)throw Error('meow');return r.arrayBuffer()}).catch(()=>null),
 unlock(){
  if(Game.S?.settings?.chime===false||!nookTouched())return null;
  try{
   const A=this.context||(this.context=new(window.AudioContext||window.webkitAudioContext)());
   if(A.state==='suspended')A.resume().catch(()=>{});
   if(!this.keyBuffers){this.keyBuffers=[0,1,2,3].map(v=>this.makeKey(A,v));this.enterBuffer=this.makeEnter(A)}
   if(!this.decoding)this.decoding=this.bytes.then(b=>b?A.decodeAudioData(b.slice(0)):null).then(b=>this.buffer=b).catch(()=>null);
   return A;
  }catch{return null}
 },
 // Reusable original samples: typebar strike, a metallic snap, and a softer key return.
 makeBuffer(A,seconds,sample,seed){
  const rate=A.sampleRate,buffer=A.createBuffer(1,Math.ceil(seconds*rate),rate),data=buffer.getChannelData(0);
  let random=seed>>>0,previous=0,peak=0;
  for(let i=0;i<data.length;i++){
   random=(Math.imul(random,1664525)+1013904223)>>>0;
   const noise=random/2147483648-1,bright=noise-.68*previous;previous=noise;
   const t=i/rate,fade=Math.min(1,t/.0007,(seconds-t)/.006);
   data[i]=sample(t,bright)*Math.max(0,fade);peak=Math.max(peak,Math.abs(data[i]));
  }
  if(peak)for(let i=0;i<data.length;i++)data[i]*=.85/peak;
  data[0]=0;data[data.length-1]=0;return buffer;
 },
 makeKey(A,variant){
  const pitch=[.98,1,1.018,.991][variant];
  return this.makeBuffer(A,.105,(t,n)=>{
   const strike=.64*n*Math.exp(-t*290);
   const metal=(.30*Math.sin(2*Math.PI*2380*pitch*t)+.17*Math.sin(2*Math.PI*3970*pitch*t))*Math.exp(-t*92);
   const body=.19*Math.sin(2*Math.PI*570*pitch*t)*Math.exp(-t*105);
   const u=t-.026,returnKey=u>0?(.34*n+.11*Math.sin(2*Math.PI*1750*u))*Math.exp(-u*210):0;
   return strike+metal+body+returnKey;
  },14711+variant*997);
 },
 makeEnter(A){
  return this.makeBuffer(A,.76,(t,n)=>{
   const bell=(.43*Math.sin(2*Math.PI*1460*t)+.18*Math.sin(2*Math.PI*2964*t)+.06*Math.sin(2*Math.PI*4190*t))*Math.exp(-t*7.5);
   const u=t-.065,rolling=u>0&&u<.235?.24*n*Math.exp(-(u%.013)*720)*Math.sin(Math.PI*u/.235):0;
   const v=t-.30,stop=v>0?(.29*n+.16*Math.sin(2*Math.PI*265*v))*Math.exp(-v*110):0;
   return bell+.13*n*Math.exp(-t*400)+rolling+stop;
  },29211);
 },
 play(A,buffer,volume){
  const source=A.createBufferSource(),gain=A.createGain();source.buffer=buffer;gain.gain.value=volume;
  source.connect(gain);gain.connect(A.destination);source.start();
  source.onended=()=>{source.disconnect();gain.disconnect();if(this.enterVoice?.source===source)this.enterVoice=null};
  return{source,gain};
 },
 key(){
  const A=this.unlock();if(!A||A.currentTime-this.lastKey<.018)return;this.lastKey=A.currentTime;
  this.play(A,this.keyBuffers[this.keyIndex++%this.keyBuffers.length],.32);
 },
 enter(){
  const A=this.unlock();if(!A||A.currentTime-this.lastEnter<.12)return;this.lastEnter=A.currentTime;
  // Repeated submissions replace the old return, avoiding an overlapping bell pileup.
  if(this.enterVoice){const {source,gain}=this.enterVoice;gain.gain.setValueAtTime(gain.gain.value,A.currentTime);gain.gain.linearRampToValueAtTime(0,A.currentTime+.005);source.stop(A.currentTime+.006)}
  this.enterVoice=this.play(A,this.enterBuffer,.33);
 },
 meow(){
  const A=this.unlock();if(!A||A.currentTime-this.lastMeow<.35)return;this.lastMeow=A.currentTime;
  const play=()=>{if(!this.buffer||Game.S?.settings?.chime===false||!CatsTypo.active)return;
   const source=A.createBufferSource(),gain=A.createGain();source.buffer=this.buffer;gain.gain.value=.5;
   source.connect(gain);gain.connect(A.destination);source.start();source.onended=()=>{source.disconnect();gain.disconnect()};
  };if(this.buffer)play();else this.decoding?.then(play);
 }
};
