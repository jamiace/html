/* 0.92.29 Purr Cozy instrument: ONE module for every playable instrument furniture.
   Replaces both the FurnPlay 8-white-key piano (fun_piano, guitars, music box, chime) and the CozyGames 4-note toy
   piano (cozy_piano_1..5). Each furniture keeps its own voice; all share the same keyboard and audio clock.
   - 13 keys per octave view (8 white + 5 black), octave shift C3–C5, sustain (button or hold Space)
   - multi-touch chords and glissando (slide across keys), velocity by press height
   - desktop keys: A S D F G H J K (white) · W E T Y U (black) · Z / X octave
   - modes: free play · melody memory (Simon-style, grows each success) · follow-along songs with demo playback
   Saves: Game.S.furnPlay.items[itemKey].melodyBest (unchanged field), .songsDone, .pianoLabels */
const MiniInstrument={
 owner:null,st:null,dom:null,held:new Map(),ptrs:new Set(),sustained:new Set(),pedal:false,tl:null,raf:0,
 WHITE:[0,2,4,5,7,9,11,12],BLACK:[[1,0],[3,1],[6,3],[8,4],[10,5]],
 KW:['KeyA','KeyS','KeyD','KeyF','KeyG','KeyH','KeyJ','KeyK'],KB:{KeyW:1,KeyE:3,KeyT:6,KeyY:8,KeyU:10},
 // Public-domain melodies (folk / 19th-century or older), all inside C4–C5 so they fit one keyboard view.
 // melody "note:beats" (default 1 beat; b = flat), chords "Chord:beats" (same total), spb = seconds per beat for auto-play.
 SONGS:[
  ['twinkle',.5,'C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2 G4 G4 F4 F4 E4 E4 D4:2 G4 G4 F4 F4 E4 E4 D4:2 C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2','C:4 F:2 C:2 F:2 C:2 G:2 C:2 C:2 F:2 C:2 G:2 C:2 F:2 C:2 G:2 C:4 F:2 C:2 F:2 C:2 G:2 C:2'],
  ['joy',.45,'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4:1.5 D4:.5 D4:2 E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4:1.5 C4:.5 C4:2','C:4 G:4 C:4 G:4 C:4 G:4 C:4 G:2 C:2'],
  ['lamb',.42,'E4 D4 C4 D4 E4 E4 E4:2 D4 D4 D4:2 E4 G4 G4:2 E4 D4 C4 D4 E4 E4 E4 E4 D4 D4 E4 D4 C4:4','C:4 C:4 G:4 C:4 C:4 C:4 G:4 C:4'],
  ['bee',.42,'G4 E4 E4:2 F4 D4 D4:2 C4 D4 E4 F4 G4 G4 G4:2 G4 E4 E4:2 F4 D4 D4:2 C4 E4 G4 G4 E4 E4 E4:2','C:4 G:4 C:4 C:4 C:4 G:4 C:4 C:4'],
  ['bridge',.4,'G4:1.5 A4:.5 G4 F4 E4 F4 G4:2 D4 E4 F4:2 E4 F4 G4:2 G4:1.5 A4:.5 G4 F4 E4 F4 G4:2 D4:2 G4:2 E4 C4:3','C:4 C:4 G:4 C:4 C:4 C:4 G:4 C:4'],
  ['jingle',.3,'E4 E4 E4:2 E4 E4 E4:2 E4 G4 C4:1.5 D4:.5 E4:4 F4 F4 F4:1.5 F4:.5 F4 E4 E4 E4:.5 E4:.5 E4 D4 D4 E4 D4:2 G4:2 E4 E4 E4:2 E4 E4 E4:2 E4 G4 C4:1.5 D4:.5 E4:4 F4 F4 F4:1.5 F4:.5 F4 E4 E4 E4:.5 E4:.5 G4 G4 F4 D4 C4:4','C:4 C:4 C:4 C:4 F:4 C:4 D:4 G:4 C:4 C:4 C:4 C:4 F:4 C:4 G:4 C:4'],
  ['grace',.55,'C4 F4:2 A4:.5 F4:.5 A4:2 G4 F4:2 D4 C4:2 C4 F4:2 A4:.5 F4:.5 A4:2 G4 C5:3 C5:2 A4 C5:1.5 A4:.5 C5:.5 A4:.5 F4:2 C4 D4:1.5 F4:.5 F4:.5 D4:.5 C4:2 C4 F4:2 A4:.5 F4:.5 A4:2 G4 F4:3','C:1 F:3 F:3 Bb:3 F:3 F:3 F:3 C:3 C:3 F:3 F:3 Bb:3 F:3 F:3 C:3 F:3',3],
  ['susanna',.32,'C4:.5 D4:.5 E4 G4 G4:1.5 A4:.5 G4 E4 C4:1.5 D4:.5 E4 E4 D4 C4 D4:3 C4:.5 D4:.5 E4 G4 G4:1.5 A4:.5 G4 E4 C4:1.5 D4:.5 E4 E4 D4 D4 C4:4 F4:2 F4 A4 A4:2 A4 G4 G4:2 E4 C4 D4:3 C4:.5 D4:.5 E4 G4 G4:1.5 A4:.5 G4 E4 C4:1.5 D4:.5 E4 E4 D4 D4 C4:4','C:1 C:4 C:4 C:4 G:4 C:4 C:4 G:4 C:4 F:4 F:4 C:4 G:4 C:4 C:4 G:4 C:4'],
  ['yankee',.3,'F4 F4 G4 A4 F4 A4 G4 C4 F4 F4 G4 A4 F4:2 E4:2 F4 F4 G4 A4 Bb4 A4 G4 F4 E4 C4 D4 E4 F4:2 F4:2','F:4 C:4 F:4 C:2 F:2 F:4 Bb:2 F:2 C:4 F:4'],
  ['westminster',.6,'A4 G4 F4 C4:3 F4 A4 G4 C4:3 F4 G4 A4 F4:3 A4 F4 G4 C4:3 C4 G4 A4 F4:3','F:3 C:3 F:3 C:3 F:6 F:3 C:3 C:3 F:3',3],
  ['rowboat',.5,'C4:1.5 C4:1.5 C4 D4:.5 E4:1.5 E4 D4:.5 E4 F4:.5 G4:3 C5:.5 C5:.5 C5:.5 G4:.5 G4:.5 G4:.5 E4:.5 E4:.5 E4:.5 C4:.5 C4:.5 C4:.5 G4 F4:.5 E4 D4:.5 C4:3','C:3 C:3 C:3 C:3 C:3 C:3 G:3 C:3',3],
  ['hotcross',.45,'E4 D4 C4:2 E4 D4 C4:2 C4:.5 C4:.5 C4:.5 C4:.5 D4:.5 D4:.5 D4:.5 D4:.5 E4 D4 C4:2','C:4 C:4 C:2 G:2 G:2 C:2'],
  ['macdonald',.32,'F4 F4 F4 C4 D4 D4 C4:2 A4 A4 G4 G4 F4:3 C4 F4 F4 F4 C4 D4 D4 C4:2 A4 A4 G4 G4 F4:4','F:4 Bb:2 F:2 F:2 C:2 F:4 F:4 Bb:2 F:2 F:2 C:2 F:4'],
  ['auclair',.42,'G4 G4 G4 A4 B4:2 A4:2 G4 B4 A4 A4 G4:4 G4 G4 G4 A4 B4:2 A4:2 G4 B4 A4 A4 G4:4 A4 A4 A4 A4 E4:2 E4:2 A4 G4 F#4 E4 D4:4 G4 G4 G4 A4 B4:2 A4:2 G4 B4 A4 A4 G4:4','G:4 G:2 D:2 G:2 D:2 G:4 G:4 G:2 D:2 G:2 D:2 G:4 D:4 Am:4 D:4 D:4 G:4 G:2 D:2 G:2 D:2 G:4'],
  ['camptown',.3,'G4:.5 G4:.5 E4:.5 G4:.5 A4:.5 G4:.5 E4 E4:.5 D4:1.5 E4:.5 D4:1.5 G4:.5 G4:.5 E4:.5 G4:.5 A4:.5 G4:.5 E4 D4 E4:.5 D4:.5 C4:2','C:4 C:2 G:2 C:4 G:2 C:2'],
  ['oldman',.35,'G4 E4 G4:2 G4 E4 G4:2 A4 G4 F4 E4 D4 E4 F4:2 E4:.5 F4:.5 G4 C4:.5 C4:.5 C4 C4:.5 D4:.5 E4:.5 F4:.5 G4:2 G4 D4 D4 F4 E4 D4 C4:2','C:4 C:4 F:4 G:4 C:4 C:2 G:2 G:4 G:2 C:2'],
  ['swanee',.45,'E4:1.5 D4:.5 C4 E4 D4 C4 C5 A4 C5 G4:3 E4 C4 D4:2 E4:1.5 D4:.5 C4 E4 D4 C4 C5 A4 C5 G4:3 E4 C4 D4:1.5 D4:.5 C4:4','C:4 C:2 F:2 C:4 G:4 C:4 C:2 F:2 C:4 G:4 C:4'],
  ['clementine',.42,'F4:.5 F4:.5 F4 C4:2 A4:.5 A4:.5 A4 F4:2 F4:.5 A4:.5 C5:1.5 C5:.5 Bb4:.5 A4:.5 G4:3 G4:.5 A4:.5 Bb4:1.5 Bb4:.5 A4:.5 G4:.5 A4 F4:2 F4:.5 A4:.5 G4:1.5 C4:.5 E4:.5 G4:.5 F4:3','F:4 F:4 F:4 C:3 C:4 F:3 C:4 F:3'],
  ['michael',.45,'C4 E4 G4:1.5 E4:.5 G4 A4 G4:2 E4 G4 A4:2 G4:4 E4 G4 G4:1.5 E4:.5 F4 E4 D4:2 C4 D4 E4:1.5 D4:.5 C4:4','C:4 C:4 F:4 C:4 C:4 G:4 C:2 G:2 C:4'],
  ['saints',.32,'C4 E4 F4 G4:5 C4 E4 F4 G4:5 C4 E4 F4 G4:2 E4:2 C4:2 E4:2 D4:5 E4 E4 D4 C4:3 C4 E4 G4:2 G4 F4:4 E4 F4 G4:2 E4:2 C4:2 D4:2 C4:4','C:8 C:8 C:11 G:5 C:8 F:7 C:8 G:2 C:4'],
  ['joyworld',.4,'C5:2 B4:1.5 A4:.5 G4:3 F4 E4:2 D4:2 C4:3 G4 A4:3 A4 B4:3 B4 C5:7 C5 C5 B4 A4 G4 G4:1.5 F4:.5 E4 C5 C5 B4 A4 G4 G4:1.5 F4:.5 E4 E4 E4 E4 E4 E4:.5 F4:.5 G4:3 F4:.5 E4:.5 D4 D4 D4:.5 E4:.5 F4:3 E4:.5 D4:.5 C4 C5:2 A4 G4:1.5 F4:.5 E4 F4 E4:2 D4:2 C4:4','C:7 G:4 C:4 G:8 C:8 C:4 G:2 C:2 C:4 G:2 C:2 C:8 G:7 C:4 F:3 C:4 G:2 C:4'],
  ['deckhalls',.32,'C5:1.5 Bb4:.5 A4 G4 F4 G4 A4 F4 G4:.5 A4:.5 Bb4:.5 G4:.5 A4:1.5 G4:.5 F4 E4 F4:2 C5:1.5 Bb4:.5 A4 G4 F4 G4 A4 F4 G4:.5 A4:.5 Bb4:.5 G4:.5 A4:1.5 G4:.5 F4 E4 F4:2','F:4 F:4 Bb:2 F:2 C:2 F:2 F:4 F:4 Bb:2 F:2 C:2 F:2'],
  ['goinghome',.7,'E4 G4 G4:2 E4 D4 C4:2 D4 E4 G4 E4 D4:4 E4 G4 G4:2 E4 D4 C4:2 D4 E4 D4 C4 C4:4','C:4 F:2 C:2 C:2 G:2 G:4 C:4 F:2 C:2 G:4 C:4'],
  ['morning',.5,'G4:.5 E4:.5 D4:.5 C4:.5 D4:.5 E4:.5 G4:.5 E4:.5 D4:.5 C4:.5 D4:.5 E4:.5 D4:.5 E4:.5 G4:.5 E4:.5 G4:.5 A4:.5 E4:.5 A4:.5 G4:.5 E4:.5 D4:.5 C4:2.5','C:6 C:3 F:1.5 C:3.5',3],
  ['jasmine',.45,'E4 E4:.5 G4:.5 A4:.5 C5:.5 C5:.5 A4:.5 G4 G4:.5 A4:.5 G4:2 E4 E4:.5 G4:.5 A4:.5 C5:.5 C5:.5 A4:.5 G4 G4:.5 A4:.5 G4:2 G4 G4 G4 E4:.5 G4:.5 A4 A4 G4:2 E4 D4:.5 E4:.5 G4 E4:.5 D4:.5 C4 C4:.5 D4:.5 C4:2','C:8 C:8 C:4 F:2 C:2 C:4 G:2 C:2']
 ].map(([id,spb,mel,chords,meter=4])=>{const pc={C:0,D:2,E:4,F:5,G:7,A:9,B:11};let t=0;
  const notes=mel.split(/\s+/).map(tok=>{const[n,b]=tok.split(':'),acc=n[1]==='b'?-1:n[1]==='#'?1:0,m=12*(Number(n.slice(-1))+1)+pc[n[0]]+acc,d=Number(b||1),o={m,t,d};t+=d;return o});
  let c=0;const ch=chords.split(/\s+/).map(tok=>{const[n,b]=tok.split(':'),o={name:n,t:c,d:Number(b)};c+=o.d;return o});
  return{id,spb,notes,chords:ch,meter,beats:t,flat:/b\d/.test(mel)}}),
 // Song book per FURNITURE ITEM: every colour of the same instrument has its own songs (no repeats within a family).
 // Unknown instrument items fall back to the voice's default book.
 BOOKS:{
  fun_piano:['joy','joyworld','goinghome'],sm_musicbox:['twinkle','jasmine','auclair'],fun_chime:['westminster','jingle','joyworld'],
  guitar:['susanna','camptown','swanee'],guitar__pink:['clementine','saints','michael'],guitar__green:['yankee','macdonald','oldman'],
  guitar__lilac:['auclair','morning','jasmine'],guitar__navy:['grace','rowboat','deckhalls'],guitar__mustard:['jingle','bridge','hotcross'],
  cozy_piano_1:['twinkle','lamb','bee'],cozy_piano_2:['bridge','hotcross','rowboat'],cozy_piano_3:['macdonald','oldman','saints'],cozy_piano_4:['jingle','deckhalls','joy'],cozy_piano_5:['michael','clementine','auclair'],
  piano:['joy','grace','goinghome'],guitar_default:['susanna','yankee','bridge'],musicbox:['twinkle','grace','lamb'],chime:['westminster','jingle','twinkle'],toy:['twinkle','bee','lamb']},
 CHORD:{C:[0,4,7],F:[5,9,0],G:[7,11,2],D:[2,6,9],Bb:[10,2,5],Am:[9,0,4]},
 book(){const v=this.st?.voice,ids=this.BOOKS[this.owner?.it?.k]||this.BOOKS[v==='guitar'?'guitar_default':v]||this.BOOKS.piano;return ids.map(id=>this.SONGS.find(s=>s.id===id))},
 // Auto-play accompaniment in the instrument's own style (audio only; it never lights keys).
 accomp(song,voice,spb){const pk0=song.chords[0].d<song.meter?song.chords[0].d:0,out=[],add=(m,t,d,vel=.32)=>out.push({m,t:t*spb,d:d*spb,vel,acc:true});
  for(const ch of song.chords){const[p0,p1,p2]=this.CHORD[ch.name]||this.CHORD.C,root=48+p0,third=48+p1+(p1<p0?12:0),fifth=48+p2+(p2<p0?12:0);
   for(let k=0;k<ch.d;k++){const b=ch.t+k,beatInBar=((Math.round(b-pk0)%song.meter)+song.meter)%song.meter;
    if(voice==='piano'){if(song.meter===3){if(beatInBar===0)add(root-12,b,1,.34);else{add(third,b,1,.24);add(fifth,b,1,.24)}}else add([root,fifth,third,fifth][beatInBar%4],b,1,.3)}
    else if(voice==='guitar'){if(beatInBar===0||(song.meter===4&&beatInBar===2)){[root-12,fifth-12,root,third].forEach((m,j)=>add(m,b+j*.04,1.6,.3))}else add(beatInBar%2?third:fifth,b+.5,.5,.22)}
    else if(voice==='musicbox'){if(beatInBar===0){add(root,b,.5,.24);add(fifth,b+.5,.5,.2)}else if(beatInBar===1&&song.meter===4)add(third,b+.5,.5,.18)}
    else if(voice==='chime'){if(k===0)add(root-12,b,ch.d,.3)}
    else{if(beatInBar%2===0)add(root-12,b,.8,.28);else add(fifth-12,b,.8,.22)}}}
  return out},
 t(k,a){return MiniHost.t(k,a)},
 voiceOf(k){const s=ITEMS[k]?.spr||k;if(/^cozy_piano/.test(k))return'toy';if(/guitar/.test(s))return'guitar';if(/musicbox/.test(s))return'musicbox';if(/chime/.test(s))return'chime';return'piano'},
 active(){const s=FurnPlay.session;return!!(s&&s===this.owner&&this.st&&s.profile==='instrument'&&FurnPlay.visible())},
 base(){return 12*(this.st.octave+1)},
 rec(){return MiniHost.record(this.owner.it.k)},
 ensure(){const s=FurnPlay.session;if(s&&s===this.owner&&this.st)return;this.close();this.owner=s;if(!s)return;
  this.st={mode:'free',octave:4,labels:MiniHost.record(s.it.k).pianoLabels||'solfege',sustain:false,voice:this.voiceOf(s.it.k),locked:false,mem:null,song:this.newSong(0),status:''}},
 newSong(i){return{i,pos:0,miss:0,done:false,demo:-1,auto:false,token:{credited:false}}},
 close(){this.stopPlay();this.releaseAll(true);if(this.owner)MiniAudio.stopAll();this.ptrs.clear();this.owner=null;this.st=null;this.dom=null},
 // ---------------- sound + key state ----------------
 press(src,midi,vel=.8){if(!this.active())return;const st=this.st;if(st.locked){this.wiggle();return}
  this.releaseSrc(src);const hnd=MiniAudio.note(midi,{voice:st.voice,vel});this.held.set(src,{midi,h:hnd});this.light(midi,true,'down');this.float(midi);this.judge(midi)},
 releaseSrc(src){const e=this.held.get(src);if(!e)return;this.held.delete(src);if(e.h){if(this.st&&(this.st.sustain||this.pedal))this.sustained.add(e.h);else MiniAudio.release(e.h)}if(![...this.held.values()].some(v=>v.midi===e.midi))this.light(e.midi,false,'down')},
 releaseAll(now=false){for(const src of[...this.held.keys()])this.releaseSrc(src);this.pedal=false;for(const h of this.sustained)now?MiniAudio.stop(h,.08):MiniAudio.release(h);this.sustained.clear()},
 setSustain(on){this.st.sustain=on;if(!on&&!this.pedal)this.dropSustain();this.syncBar()},
 setPedal(on){this.pedal=on;if(!on&&!this.st?.sustain)this.dropSustain();this.syncBar()},
 dropSustain(){for(const h of this.sustained)MiniAudio.release(h);this.sustained.clear()},
 // ---------------- game logic ----------------
 setMode(m){if(!this.active()||this.st.mode===m&&this.dom)return;this.stopPlay();this.st.locked=false;this.st.mode=m;if(m==='song')this.st.octave=4;if(m==='memory'&&!this.st.mem)this.st.mem={seq:[],idx:0,phase:'idle',token:null};this.st.status='';this.renderAll()},
 nextNote(seq){const b=this.base(),last=seq.length?this.WHITE.indexOf(seq[seq.length-1]-b):-1;if(last<0)return b+this.WHITE[Math.floor(Math.random()*8)];const steps=[-3,-2,-2,-1,-1,1,1,2,2,3,0];let n;do{n=last+steps[Math.floor(Math.random()*steps.length)]}while(n<0||n>7||(n===last&&seq.length>1&&seq[seq.length-2]===seq[seq.length-1]));return b+this.WHITE[n]},
 memStart(kind){const m=this.st.mem;if(kind==='new'||!m.seq.length){m.seq=[];for(let i=0;i<3;i++)m.seq.push(this.nextNote(m.seq))}else if(kind==='next'&&m.seq.length<12)m.seq.push(this.nextNote(m.seq));m.token={credited:false};this.memListen()},
 memListen(){const m=this.st.mem,step=m.seq.length>6?.42:.52;m.phase='listen';m.idx=0;this.st.locked=true;this.st.status=this.t('memListen');this.renderPanel();
  this.play(m.seq.map((n,i)=>({m:n,t:i*step,d:step*.92})),()=>{if(!this.st)return;m.phase='input';this.st.locked=false;this.st.status=this.t('memYourTurn');this.renderPanel()})},
 judge(midi){const st=this.st;
  if(st.mode==='memory'&&st.mem?.phase==='input'){const m=st.mem;if(midi===m.seq[m.idx]){m.idx++;if(m.idx===m.seq.length){m.phase='won';MiniHost.reward(m.token);const rec=MiniHost.best(this.owner.it.k,'melodyBest',m.seq.length);st.status=this.t(rec?'memRecord':'memWin',[m.seq.length]);setTimeout(()=>{if(this.active())MiniAudio.sfx('bonus')},280)}}
   else{m.phase='miss';st.status=this.t('memMiss');MiniAudio.sfx('error');this.flash(m.seq[m.idx],'expect',900)}this.renderPanel();return}
  if(st.mode==='song'){const so=st.song,song=this.book()[so.i];if(so.done||so.auto)return;const want=song.notes[so.pos].m;
   if(midi===want){so.pos++;if(so.pos>=song.notes.length){so.done=true;MiniHost.reward(so.token);const done=new Set(this.rec().songsDone||[]);done.add(song.id);MiniHost.write(this.owner.it.k,{songsDone:[...done]});st.status=this.t(so.miss?'songDone':'songPerfect',[so.miss]);setTimeout(()=>{if(this.active())MiniAudio.sfx('win')},300);this.renderPanel()}else{st.status='';this.syncSong()}}
   else{so.miss++;this.flash(midi,'wrong',320);st.status=this.t('songNext',[this.name(want,song.flat)]);this.syncStatus()}}},
 // Auto-play: the whole song in this instrument's tempo with its own accompaniment; press again to stop.
 songDemo(){const so=this.st.song;if(so.auto){this.stopPlay();so.auto=false;so.demo=-1;this.st.locked=false;this.st.status='';this.renderPanel();return}
  const song=this.book()[so.i],voice=this.st.voice,spb=song.spb*({chime:1.15,musicbox:1.1}[voice]||1);this.st.locked=true;so.auto=true;so.demo=0;this.st.status=this.t('songDemoNow');this.renderPanel();
  this.play(song.notes.map(n=>({m:n.m,t:n.t*spb,d:n.d*spb})),()=>{if(!this.st)return;so.auto=false;so.demo=-1;this.st.locked=false;this.st.status='';this.renderPanel()},i=>{so.demo=i;this.syncSong()},this.accomp(song,voice,spb))},
 songPick(i){this.stopPlay();this.st.locked=false;this.st.song=this.newSong(i);this.st.status='';this.renderPanel()},
 // Plays a list [{m,t,d}] on the audio clock; key lights follow a visual clock so they stay in step even if audio is muted.
 play(list,done,onNote,acc=[]){this.stopPlay();const A=MiniAudio.context(),lead=.15,a0=A?A.currentTime+lead:0,voice=this.st.voice;
  // Notes are scheduled just ahead of time (0.5 s window) so long songs never exceed the voice limit.
  const queue=[...list,...acc].sort((x,y)=>x.t-y.t);let qi=0;
  const tl=this.tl={list,t0:performance.now()/1000+lead,hs:[],done,onNote,lit:new Set(),last:-1};
  const feed=now=>{if(!A)return;while(qi<queue.length&&queue[qi].t<now+.5){const n=queue[qi++],h=MiniAudio.note(n.m,{voice,vel:n.vel??.72,at:a0+n.t,dur:n.d});if(h)tl.hs.push(h)}if(tl.hs.length>64)tl.hs=tl.hs.filter(h=>!h.stopped)};feed(0);
  const end=Math.max(0,...list.map(n=>n.t+n.d),...acc.map(n=>n.t+n.d));
  const tick=()=>{if(this.tl!==tl)return;if(!this.active()){this.stopPlay();return}const now=performance.now()/1000-tl.t0,on=new Set();let cur=-1;feed(now);
   list.forEach((n,i)=>{if(now>=n.t){cur=i;if(now<n.t+n.d*.85)on.add(n.m)}});
   for(const m of tl.lit)if(!on.has(m))this.light(m,false,'demo');for(const m of on)if(!tl.lit.has(m))this.light(m,true,'demo');tl.lit=on;
   if(cur!==tl.last){tl.last=cur;if(cur>=0)onNote?.(cur)}
   if(now>=end+.05){this.stopPlay(false);done?.()}else this.raf=requestAnimationFrame(tick)};
  this.raf=requestAnimationFrame(tick)},
 stopPlay(silence=true){cancelAnimationFrame(this.raf);this.raf=0;const tl=this.tl;if(!tl)return;this.tl=null;if(silence)for(const x of tl.hs)MiniAudio.stop(x);for(const m of tl.lit)this.light(m,false,'demo')},
 pause(){if(!this.st)return;this.stopPlay();this.releaseAll();const st=this.st;st.locked=false;if(st.mem&&st.mem.phase==='listen'){st.mem.phase='input';st.mem.idx=0}st.song.demo=-1;st.song.auto=false;st.status=this.t('paused');if(this.dom)this.renderPanel()},
 // ---------------- names ----------------
 name(midi,flat=false){const pc=((midi%12)+12)%12,wi=this.WHITE.indexOf(pc),sol=this.t('solfege').split(','),let_='CDEFGAB';if(wi<0){const n=flat?this.WHITE.indexOf(pc+1):this.WHITE.indexOf(pc-1);return(this.st.labels==='letter'?let_[n]:sol[n])+(flat?'♭':'♯')}return this.st.labels==='letter'?let_[wi]+Math.floor(midi/12-1):sol[wi]},
 // ---------------- view ----------------
 render(){this.ensure();if(!this.st)return[];if(!this.dom)this.build();this.renderAll();return[this.dom.root]},
 build(){const st=this.st,T=k=>this.t(k);
  const tabs=h('div',{class:'mi-tabs',role:'tablist'},...['free','memory','song'].map(m=>h('button',{class:'mi-tab',type:'button',role:'tab','data-mode':m,onclick:()=>this.setMode(m)},T('mode_'+m))));
  const panel=h('div',{class:'mi-panel'}),floats=h('div',{class:'mi-floats','aria-hidden':'true'});
  const whites=this.WHITE.map((semi,i)=>h('button',{class:'mi-key mi-white',type:'button','data-semi':semi,tabindex:'-1'},h('span',{class:'mi-name'}),h('small',{class:'mi-kbd',text:'ASDFGHJK'[i]})));
  const blacks=this.BLACK.map(([semi,after],j)=>h('button',{class:'mi-key mi-black',type:'button','data-semi':semi,tabindex:'-1',style:`left:calc(${(after+1)*12.5}% - 3.9%)`},h('span',{class:'mi-name'}),h('small',{class:'mi-kbd',text:'WETYU'[j]})));
  const kb=h('div',{class:'mi-kb',role:'group','aria-label':T('keyboard')},h('div',{class:'mi-keys'},...whites,...blacks));
  const oct=h('span',{class:'mi-oct'}),down=h('button',{class:'chip mi-small',type:'button','aria-label':T('octDown'),onclick:()=>this.octave(-1)},'−'),up=h('button',{class:'chip mi-small',type:'button','aria-label':T('octUp'),onclick:()=>this.octave(1)},'+');
  const sus=h('button',{class:'chip mi-small',type:'button',onclick:()=>this.setSustain(!this.st.sustain)},T('sustain'));
  const lab=h('button',{class:'chip mi-small',type:'button',onclick:()=>{const order=['solfege','letter','none'];this.st.labels=order[(order.indexOf(this.st.labels)+1)%3];MiniHost.write(this.owner.it.k,{pianoLabels:this.st.labels});this.syncKeys();this.renderPanel();this.syncBar()}});
  const status=h('p',{class:'mi-status',role:'status','aria-live':'polite'});
  const root=h('div',{class:'mi-root mi-voice-'+st.voice},tabs,panel,h('div',{class:'mi-stage'},floats,kb),h('div',{class:'mi-bar'},h('span',{class:'mi-octgroup'},down,oct,up),sus,lab),status);
  this.dom={root,tabs,panel,kb,floats,oct,down,up,sus,lab,status,keys:[...whites,...blacks]};this.bindKeyboard(kb);this.syncKeys()},
 bindKeyboard(kb){const midiOf=k=>this.base()+Number(k.dataset.semi),keyAt=(x,y)=>{const el=document.elementFromPoint(x,y),k=el?.closest?.('.mi-key');return k&&kb.contains(k)?k:null};
  const vel=(k,e)=>{const r=k.getBoundingClientRect();return Math.max(.4,Math.min(1,.5+.5*((e.clientY-r.top)/(r.height||1))))};
  kb.addEventListener('pointerdown',e=>{if(e.button>0||!this.active())return;e.preventDefault();try{kb.setPointerCapture(e.pointerId)}catch{}this.ptrs.add(e.pointerId);const k=keyAt(e.clientX,e.clientY)||e.target.closest?.('.mi-key');if(k)this.press('p'+e.pointerId,midiOf(k),vel(k,e))});
  kb.addEventListener('pointermove',e=>{if(!this.ptrs.has(e.pointerId))return;const k=keyAt(e.clientX,e.clientY),midi=k?midiOf(k):null,cur=this.held.get('p'+e.pointerId)?.midi??null;if(midi===cur)return;this.releaseSrc('p'+e.pointerId);if(midi!=null)this.press('p'+e.pointerId,midi,.7)});
  const end=e=>{if(!this.ptrs.delete(e.pointerId))return;this.releaseSrc('p'+e.pointerId)};
  for(const t of['pointerup','pointercancel','lostpointercapture'])kb.addEventListener(t,end);
  kb.addEventListener('contextmenu',e=>e.preventDefault());
  kb.addEventListener('click',e=>{const k=e.target.closest?.('.mi-key');if(e.detail===0&&k){this.press('click',midiOf(k),.75);const o=this.owner;setTimeout(()=>{if(this.owner===o)this.releaseSrc('click')},260)}})},
 octave(d){if(!this.active())return;const st=this.st;if(st.mode==='song'||st.locked||st.mem&&st.mode==='memory'&&['input','listen'].includes(st.mem.phase))return;const o=Math.max(3,Math.min(5,st.octave+d));if(o===st.octave)return;this.releaseAll();st.octave=o;if(st.mem&&st.mem.phase!=='idle'){st.mem={seq:[],idx:0,phase:'idle',token:null};this.renderPanel()}this.syncKeys();this.syncBar()},
 renderAll(){if(!this.dom)return;for(const b of this.dom.tabs.children){const on=b.dataset.mode===this.st.mode;b.classList.toggle('on',on);b.setAttribute('aria-selected',String(on))}this.dom.root.dataset.mode=this.st.mode;this.renderPanel();this.syncKeys();this.syncBar()},
 syncKeys(){if(!this.dom)return;for(const k of this.dom.keys){const midi=this.base()+Number(k.dataset.semi),white=k.classList.contains('mi-white');k.dataset.midi=midi;k.setAttribute('aria-label',this.name(midi));k.querySelector('.mi-name').textContent=this.st.labels==='none'||!white?'':this.name(midi)}this.syncSong()},
 syncBar(){if(!this.dom)return;const st=this.st,lock=st.mode==='song'||st.locked||st.mode==='memory'&&['input','listen'].includes(st.mem?.phase);this.dom.oct.textContent='C'+st.octave;this.dom.down.disabled=lock||st.octave<=3;this.dom.up.disabled=lock||st.octave>=5;
  const on=st.sustain||this.pedal;this.dom.sus.classList.toggle('primary',on);this.dom.sus.setAttribute('aria-pressed',String(on));this.dom.lab.textContent=this.t('labels_'+st.labels)},
 syncStatus(){if(this.dom)this.dom.status.textContent=this.st.mode==='memory'?'':this.st.status||''},
 light(midi,on,cls){const k=this.dom?.keys.find(k=>Number(k.dataset.midi)===midi);if(k)k.classList.toggle(cls,on)},
 flash(midi,cls,ms){const k=this.dom?.keys.find(k=>Number(k.dataset.midi)===midi);if(!k)return;k.classList.remove(cls);void k.offsetWidth;k.classList.add(cls);const o=this.owner;setTimeout(()=>{if(this.owner===o)k.classList.remove(cls)},ms)},
 wiggle(){this.dom?.kb.classList.remove('mi-locked-shake');void this.dom?.kb.offsetWidth;this.dom?.kb.classList.add('mi-locked-shake')},
 float(midi){const f=this.dom?.floats,k=this.dom?.keys.find(k=>Number(k.dataset.midi)===midi);if(!f||!k)return;while(f.children.length>14)f.firstChild.remove();const kr=k.getBoundingClientRect(),fr=f.getBoundingClientRect(),x=fr.width?((kr.left+kr.width/2-fr.left)/fr.width*100):50;
  const n=h('span',{class:'mi-float',style:`left:${x}%;--dx:${(Math.random()*24-12).toFixed(0)}px`,text:Math.random()<.5?'♪':'♫'});n.addEventListener('animationend',()=>n.remove());f.append(n)},
 renderPanel(){if(!this.dom)return;const st=this.st,T=(k,a)=>this.t(k,a),btn=(label,fn,cls='',dis=false)=>h('button',{class:'chip '+cls,type:'button',disabled:dis,onclick:()=>{if(this.active())fn()}},label);let out=[];
  if(st.mode==='free')out=[h('p',{class:'hint mi-tip',text:T('freeTip')})];
  if(st.mode==='memory'){const m=st.mem,p=m.phase,len=m.seq.length;
   const dots=h('div',{class:'mi-dots','aria-hidden':'true'},...m.seq.map((_,i)=>h('i',{class:i<m.idx?'ok':p==='miss'&&i===m.idx?'bad':''})));
   const btns=p==='idle'?[btn(T('memStart'),()=>this.memStart('new'),'primary')]:p==='listen'?[btn(T('memListening'),()=>{},'',true)]:p==='input'?[btn(T('memReplay'),()=>this.memListen())]:p==='won'?[btn(T('memNext',[len+1]),()=>this.memStart('next'),'primary',len>=12),btn(T('memNew'),()=>this.memStart('new'))]:[btn(T('memRetry'),()=>this.memListen(),'primary'),btn(T('memNew'),()=>this.memStart('new'))];
   const head=p==='idle'?T('memIntro'):p==='listen'?T('memListen'):p==='input'?T('memYourTurnN',[m.idx,len]):st.status;
   out=[h('p',{role:'status','aria-live':'polite',class:'mi-headline'+(p==='won'?' good':p==='miss'?' bad':''),text:head}),len?dots:null,h('div',{class:'mi-row'},...btns),h('p',{class:'hint',text:T('memBest',[this.rec().melodyBest||0])})]}
  if(st.mode==='song'){const so=st.song,done=new Set(this.rec().songsDone||[]);
   const chips=h('div',{class:'mi-songs'},...this.book().map((s,i)=>h('button',{class:'chip mi-small'+(i===so.i?' primary':''),type:'button','aria-pressed':String(i===so.i),onclick:()=>{if(this.active())this.songPick(i)}},(done.has(s.id)?'✓ ':'')+T('song_'+s.id))));
   const lane=h('div',{class:'mi-lane'});const wrap=h('div',{class:'mi-lane-wrap'},lane);this.dom.lane=lane;this.dom.laneWrap=wrap;
   const song=this.book()[so.i];for(const n of song.notes)lane.append(h('span',{class:'mi-bub',text:this.name(n.m,song.flat)}));
   out=[chips,h('p',{class:'hint mi-tip',text:T('acc_'+st.voice)}),wrap,h('div',{class:'mi-row'},btn(so.auto?T('songStop'):T('songDemo'),()=>this.songDemo(),so.auto?'primary':'',st.locked&&!so.auto),btn(T('songRestart'),()=>this.songPick(so.i),'',so.auto),h('span',{class:'mi-count hint'}))];}
  this.dom.panel.replaceChildren(...out.filter(Boolean));if(st.mode==='song')this.syncSong();this.syncStatus();this.syncBar()},
 syncSong(){const d=this.dom,st=this.st;if(!d)return;for(const k of d.keys)k.classList.remove('hint');if(st.mode!=='song'||!d.lane)return;const so=st.song,song=this.book()[so.i],at=so.demo>=0?so.demo:so.pos;
  [...d.lane.children].forEach((b,i)=>{b.className='mi-bub'+(i<so.pos?' done':'')+(i===at&&!so.done?' now':'');b.textContent=this.name(song.notes[i].m,song.flat)});
  const w=d.laneWrap.clientWidth||300,kids=d.lane.children,step=kids.length>1?(kids[1].offsetLeft-kids[0].offsetLeft)||40:40,half=(kids[0]?.offsetWidth||34)/2;d.lane.style.transform=`translateX(${Math.round(w*.32-at*step-half)}px)`;
  const c=d.panel.querySelector('.mi-count');if(c)c.textContent=`${Math.min(so.pos,song.notes.length)}/${song.notes.length}`;
  if(!so.done&&so.demo<0&&!st.locked)this.light(song.notes[so.pos].m,true,'hint')},
 // ---------------- keyboard ----------------
 key(e,down){if(!this.active()||MiniHost.typing(e))return;if(down&&!MiniHost.topmost('furnplay'))return;const code=e.code;
  let semi=null;const wi=this.KW.indexOf(code);if(wi>=0)semi=this.WHITE[wi];else if(code in this.KB)semi=this.KB[code];
  if(semi!=null){e.preventDefault();e.stopImmediatePropagation();if(down){if(!e.repeat)this.press('k'+code,this.base()+semi,.75)}else this.releaseSrc('k'+code);return}
  if(code==='Space'&&!/^(BUTTON|A|SUMMARY)$/.test(e.target?.tagName||'')){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat||!down)this.setPedal(down);return}
  if(down&&(code==='KeyZ'||code==='KeyX')){e.preventDefault();e.stopImmediatePropagation();this.octave(code==='KeyZ'?-1:1)}}
};
document.addEventListener('keydown',e=>MiniInstrument.key(e,true),true);
document.addEventListener('keyup',e=>MiniInstrument.key(e,false),true);
window.addEventListener('blur',()=>{if(MiniInstrument.st)MiniInstrument.releaseAll()});
document.addEventListener('visibilitychange',()=>{if(document.hidden)MiniInstrument.pause()});
