/* Short feedback sounds, unlocked by the player's gesture. Words use SpeechSynthesis. */
const TypoSound={
 context:null,buffer:null,decoding:null,lastKey:-1,lastMeow:-1,
 bytes:fetch('assets/cats-typo/meow.wav?v='+encodeURIComponent(PURR_BUILD.version)).then(r=>{if(!r.ok)throw Error('meow');return r.arrayBuffer()}).catch(()=>null),
 unlock(){
  if(Game.S?.settings?.chime===false||!nookTouched())return null;
  try{
   const A=this.context||(this.context=new(window.AudioContext||window.webkitAudioContext)());
   if(A.state==='suspended')A.resume().catch(()=>{});
   if(!this.decoding)this.decoding=this.bytes.then(b=>b?A.decodeAudioData(b.slice(0)):null).then(b=>this.buffer=b).catch(()=>null);
   return A;
  }catch{return null}
 },
 key(){
  const A=this.unlock();if(!A||A.currentTime-this.lastKey<.018)return;this.lastKey=A.currentTime;
  const t=A.currentTime,o=A.createOscillator(),g=A.createGain();o.type='triangle';
  o.frequency.setValueAtTime(820,t);o.frequency.exponentialRampToValueAtTime(190,t+.045);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.055,t+.003);g.gain.exponentialRampToValueAtTime(.0001,t+.048);
  o.connect(g);g.connect(A.destination);o.start(t);o.stop(t+.05);o.onended=()=>{o.disconnect();g.disconnect()};
 },
 meow(){
  const A=this.unlock();if(!A||A.currentTime-this.lastMeow<.35)return;this.lastMeow=A.currentTime;
  const play=()=>{if(!this.buffer||Game.S?.settings?.chime===false||!CatsTypo.active)return;
   const source=A.createBufferSource(),gain=A.createGain();source.buffer=this.buffer;gain.gain.value=.5;
   source.connect(gain);gain.connect(A.destination);source.start();source.onended=()=>{source.disconnect();gain.disconnect()};
  };if(this.buffer)play();else this.decoding?.then(play);
 }
};
