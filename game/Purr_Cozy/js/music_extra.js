/* ============================================================
   Built-in music extras
   - MusicCache: every built-in track you play is downloaded once into this
     browser (IndexedDB) and played from there afterwards; least recently played
     tracks are removed when the cache goes over its limit (default 2 GB)
   - covers: read from the picture embedded in the file (MP3 ID3v2 APIC,
     FLAC PICTURE block, M4A covr); album covers use the first track
   - lyrics: an .lrc file with the same name in the same folder, shown in
     sync at the top of the room
   ============================================================ */
const MCACHE_DB = 'pocketnook-music', MCACHE_LIMITS = [512, 1024, 2048, 5120];
const MusicCache = {
  dbp: null, keys: new Set(), meta: {}, ready: null, total: 0,
  get limitMB() { try { const v = +localStorage.getItem('pocketnook.mcache'); if (MCACHE_LIMITS.includes(v)) return v; } catch (e) { } return 2048; },
  set limitMB(v) { try { localStorage.setItem('pocketnook.mcache', String(v)); } catch (e) { } this.evict(0); },
  db() {
    if (!this.dbp) this.dbp = new Promise((res, rej) => {
      try { const r = indexedDB.open(MCACHE_DB, 1); r.onupgradeneeded = () => { const d = r.result; for (const s of ['blobs', 'meta', 'covers', 'lrc']) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); }
    });
    return this.dbp;
  },
  async tx(store, mode, fn) { const d = await this.db(); return new Promise((res, rej) => { const t = d.transaction(store, mode), st = t.objectStore(store), r = fn(st); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); },
  init() {
    if (!this.ready) this.ready = (async () => {
      try { const all = await this.tx('meta', 'readonly', st => st.getAll()); const ks = await this.tx('meta', 'readonly', st => st.getAllKeys()); (ks || []).forEach((k, i) => { this.meta[k] = all[i]; this.keys.add(k); }); this.sum(); } catch (e) { }
    })();
    return this.ready;
  },
  sum() { this.total = Object.values(this.meta).reduce((n, m) => n + (m.size || 0), 0); return this.total; },
  has(key) { return this.keys.has(key); },
  async get(key) {
    if (!this.has(key)) return null;
    try { const b = await this.tx('blobs', 'readonly', st => st.get(key)); if (!b) { this.drop(key); return null; } this.meta[key].last = Date.now(); this.tx('meta', 'readwrite', st => st.put(this.meta[key], key)).catch(() => { }); return b; } catch (e) { return null; }
  },
  async put(key, blob, info) {
    const size = blob.size || 0; if (size > this.limitMB * 1048576) return false;
    await this.evict(size);
    try { if (navigator.storage && navigator.storage.persist && !this.asked) { this.asked = true; navigator.storage.persist().catch(() => { }); } } catch (e) { }
    try {
      await this.tx('blobs', 'readwrite', st => st.put(blob, key));
      this.meta[key] = Object.assign({ size, last: Date.now(), at: Date.now() }, info || {}); await this.tx('meta', 'readwrite', st => st.put(this.meta[key], key));
      this.keys.add(key); this.sum(); return true;
    } catch (e) { console.warn(I18n.s("u_106399426095"), e); this.drop(key); return false; }
  },
  async drop(key) { this.keys.delete(key); delete this.meta[key]; this.sum(); try { await this.tx('blobs', 'readwrite', st => st.delete(key)); await this.tx('meta', 'readwrite', st => st.delete(key)); } catch (e) { } },
  // remove the least recently played tracks until `need` more bytes fit under the limit
  async evict(need) {
    const lim = this.limitMB * 1048576, cur = Music.cur && Music.cur.id;
    const order = Object.keys(this.meta).filter(k => k !== cur).sort((a, b) => (this.meta[a].last || 0) - (this.meta[b].last || 0));
    while (this.sum() + need > lim && order.length) await this.drop(order.shift());
  },
  async clear() { for (const k of [...this.keys]) await this.drop(k); try { await this.tx('covers', 'readwrite', st => st.clear()); await this.tx('lrc', 'readwrite', st => st.clear()); } catch (e) { } Covers.mem = {}; },
  async small(store, key, val) { try { if (val === undefined) return await this.tx(store, 'readonly', st => st.get(key)); await this.tx(store, 'readwrite', st => st.put(val, key)); } catch (e) { return null; } },
};

/* ---------------- embedded cover art ---------------- */
const Covers = {
  mem: {}, busy: {}, retryAt: {},
  // returns { type, data: Uint8Array } or null; `need` tells how many bytes are needed when the buffer is too short
  parse(buf) {
    const u = new Uint8Array(buf), str = (o, n) => String.fromCharCode(...u.subarray(o, o + n));
    if (u.length < 12) return { need: 65536 };
    if (str(0, 3) === 'ID3') {
      const ver = u[3], ss = (o) => (u[o] & 127) << 21 | (u[o + 1] & 127) << 14 | (u[o + 2] & 127) << 7 | (u[o + 3] & 127);
      const tagEnd = 10 + ss(6); if (u.length < tagEnd) return { need: tagEnd };
      let p = 10; if (u[5] & 0x40 && ver >= 3) p += ver === 4 ? ss(10) : (u[10] << 24 | u[11] << 16 | u[12] << 8 | u[13]) + 4;
      while (p + 10 < tagEnd) {
        let id, size, hdr;
        if (ver === 2) { id = str(p, 3); size = u[p + 3] << 16 | u[p + 4] << 8 | u[p + 5]; hdr = 6; }
        else { id = str(p, 4); size = ver === 4 ? ss(p + 4) : (u[p + 4] << 24 | u[p + 5] << 16 | u[p + 6] << 8 | u[p + 7]) >>> 0; hdr = 10; }
        if (!/^[A-Z0-9]{3,4}$/.test(id) || size <= 0) break;
        const s = p + hdr, e = s + size;
        if (id === 'APIC' || id === 'PIC') {
          const enc = u[s]; let q = s + 1, mime = 'image/jpeg';
          if (id === 'PIC') { mime = str(q, 3).toUpperCase() === 'PNG' ? 'image/png' : 'image/jpeg'; q += 3; }
          else { let m = q; while (m < e && u[m]) m++; mime = str(q, m - q) || 'image/jpeg'; if (!mime.includes('/')) mime = 'image/' + mime.toLowerCase().replace('jpg', 'jpeg'); q = m + 1; }
          q++;   // picture type
          if (enc === 1 || enc === 2) { while (q + 1 < e && (u[q] || u[q + 1])) q += 2; q += 2; } else { while (q < e && u[q]) q++; q++; }
          return { type: mime, data: u.slice(q, e) };
        }
        p = e;
      }
      return null;
    }
    if (str(0, 4) === 'fLaC') {
      let p = 4;
      for (;;) {
        if (p + 4 > u.length) return { need: p + 65536 };
        const last = u[p] & 0x80, type = u[p] & 0x7f, len = u[p + 1] << 16 | u[p + 2] << 8 | u[p + 3], s = p + 4;
        if (type === 6) {
          if (s + len > u.length) return { need: s + len };
          const rd = (o) => (u[o] << 24 | u[o + 1] << 16 | u[o + 2] << 8 | u[o + 3]) >>> 0;
          let q = s + 4; const ml = rd(q); const mime = str(q + 4, ml); q += 4 + ml; const dl = rd(q); q += 4 + dl + 16; const n = rd(q); q += 4;
          return { type: mime || 'image/jpeg', data: u.slice(q, q + n) };
        }
        if (last) return null; p = s + len;
      }
    }
    // MP4 / M4A: look for the covr atom (only found when it sits in the part we have)
    for (let i = 4; i < u.length - 24; i++) if (u[i] === 0x63 && u[i + 1] === 0x6f && u[i + 2] === 0x76 && u[i + 3] === 0x72) {
      const size = (u[i - 4] << 24 | u[i - 3] << 16 | u[i - 2] << 8 | u[i - 1]) >>> 0, d = i + 4;
      if (str(d + 4, 4) !== 'data') continue; const ds = (u[d] << 24 | u[d + 1] << 16 | u[d + 2] << 8 | u[d + 3]) >>> 0, fmt = u[d + 11];
      if (d + ds > u.length) return { need: d + ds };
      return { type: fmt === 14 ? 'image/png' : 'image/jpeg', data: u.slice(d + 16, d + ds) };
    }
    return null;
  },
  // shrink to a small square-ish JPEG so the cache stays light
  async thumb(pic) {
    const url = URL.createObjectURL(new Blob([pic.data], { type: pic.type }));
    try {
      const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
      const s = Math.min(1, 320 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.86);
    } catch (e) { return null; } finally { URL.revokeObjectURL(url); }
  },
  async fromBlob(blob) {
    let need = Math.min(blob.size, 1 << 20), pic = null;
    for (let i = 0; i < 4; i++) { pic = this.parse(await blob.slice(0, need).arrayBuffer()); if (!pic || !pic.need) break; if (pic.need > blob.size || pic.need > 16 << 20) { pic = null; break; } need = pic.need; }
    return pic && pic.data ? this.thumb(pic) : null;
  },
  // only the start of the file, with a Range request (album covers before anything is downloaded)
  async fromUrl(url) {
    let need = 262144, pic = null;
    for (let i = 0; i < 4; i++) {
      const r = await fetch(url, { headers: { Range: `bytes=0-${need - 1}` } }); if (!r.ok) return null;
      const buf = await r.arrayBuffer(); pic = this.parse(buf); if (!pic || !pic.need) break;
      if (r.status === 200 || pic.need > 16 << 20) { pic = null; break; } need = pic.need + 1024;
    }
    return pic && pic.data ? this.thumb(pic) : '';
  },
  key(t) { return 'track:' + t.id; },
  // cover for a track: memory, then IndexedDB, then the cached file, then the network (start of file only)
  async get(t, allowNet) {
    if (!t) return null; const k = this.key(t);
    if (k in this.mem) return this.mem[k];
    if (this.busy[k]) return this.busy[k];
    if (allowNet && this.retryAt[k] > Date.now()) return null;
    return this.busy[k] = (async () => {
      let v = await MusicCache.small('covers', k);
      if (v == null) {
        const blob = t.type === 'file' ? await Music.getBlob(t.id).catch(() => null) : await MusicCache.get(t.id);
        if (blob) v = await this.fromBlob(blob) || '';
        else if (allowNet && t.type !== 'file') { const u = t.type === 'drive' ? Lib.mediaUrl(t.fid) : t.src; v = await this.fromUrl(u).catch(() => null); if (v == null) { this.retryAt[k] = Date.now() + 60000; delete this.busy[k]; return null; } v = v || ''; }
        else { delete this.busy[k]; return null; }
        MusicCache.small('covers', k, v);
      }
      this.mem[k] = v; delete this.retryAt[k]; delete this.busy[k]; return v;
    })();
  },
  // album covers: first track in the album that has a picture, fetched one at a time
  queue: [], running: false,
  wantAlbums() {
    for (const a of Lib.albums) { const t = Lib.queue(a.n)[0]; if (t && !(this.key(t) in this.mem) && !this.busy[this.key(t)] && !(this.retryAt[this.key(t)] > Date.now()) && !this.queue.includes(t)) this.queue.push(t); }
    this.pump();
  },
  async pump() {
    if (this.running) return; this.running = true;
    try {
      while (this.queue.length) { const t = this.queue.shift(); try { await this.get(t, true); } catch (e) { this.retryAt[this.key(t)] = Date.now() + 60000; delete this.busy[this.key(t)]; } UI.refresh('music'); }
    } finally { this.running = false; }
  },
};

/* ---------------- synced lyrics (.lrc) ---------------- */
const Lyrics = {
  lines: null, key: null, off: 0, el: null, last: -2, cache:new Map(),loadGeneration:0,metricsDirty:true,fitFrame:null,
  parse(text) {
    const out = []; let off = 0;
    for (const raw of String(text || '').split(/\r?\n/)) {
      const m = raw.match(/^\s*\[offset:\s*([+-]?\d+)\s*\]/i); if (m) { off = +m[1] / 1000; continue; }
      const stamps = [...raw.matchAll(/\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g)]; if (!stamps.length) continue;
      const txt = raw.replace(/\[[^\]]*\]/g, '').replace(/<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/g, '').trim();
      for (const s of stamps) out.push({ t: +s[1] * 60 + parseFloat(s[2].replace(':', '.')), text: txt });
    }
    out.sort((a, b) => a.t - b.t); return { lines: out, off };
  },
  async textFor(t) {
    if (!t) return null;
    if (t.type === 'file') return MusicCache.small('lrc', 'file:' + t.id);
    if (!t.lrc) return null;
    const k = 'lrc:' + t.id; let v = await MusicCache.small('lrc', k);
    if (v == null) {
      try { const u = t.type === 'drive' ? Lib.mediaUrl(t.lrc) : t.lrc; const r = await fetch(u); if (!r.ok) return null; const buf = await r.arrayBuffer(); v = Lyrics.decode(buf); MusicCache.small('lrc', k, v); } catch (e) { return null; }
    }
    return v;
  },
  // LRC files are usually UTF-8; fall back to Big5 for older Traditional Chinese files
  decode(buf) { try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (e) { try { return new TextDecoder('big5').decode(buf); } catch (e2) { return new TextDecoder().decode(buf); } } },
  async load(t) {
    const key=t&&t.id,generation=++this.loadGeneration;
    const kept=this.key===key&&this.lines?.length?{lines:this.lines,off:this.off}:this.cache.get(key);
    this.key=key;this.lines=kept?.lines||null;this.off=kept?.off||0;this.last=-2;this.render();
    const text=await this.textFor(t);
    if(this.key!==key||generation!==this.loadGeneration)return;
    if(text){const parsed=this.parse(text);if(parsed.lines.length){this.lines=parsed.lines;this.off=parsed.off;this.cache.set(key,parsed);if(this.cache.size>30)this.cache.delete(this.cache.keys().next().value);}}
    this.render();
  },
  on(){return Game.S.settings.lyrics!==false;},
  mount(){
    if(this.el){if(!this.el.isConnected)document.body.append(this.el);return this.el;}
    this.el=h('div',{id:'lyrics',class:'lyrics','aria-live':'off',hidden:true},
      h('div',{class:'ly-cur'},h('span',{class:'ly-text'})),
      h('div',{class:'ly-next'},h('span',{class:'ly-text'})));
    this.rows=[...this.el.children].map(line=>({line,span:line.firstElementChild,animation:null,metrics:null}));
    this.measure=document.createElement('canvas').getContext('2d');
    document.body.append(this.el);
    if(typeof ResizeObserver!=='undefined'){
      let width=-1;
      this.fitObserver=new ResizeObserver(entries=>{const next=entries[0].contentRect.width;if(Math.abs(next-width)>.5){width=next;this.metricsDirty=true;this.scheduleFit();}});
      this.fitObserver.observe(this.el);
    }
    const resized=()=>{this.metricsDirty=true;this.scheduleFit();};
    window.addEventListener('resize',resized);
    window.visualViewport?.addEventListener('resize',resized);
    document.fonts.ready.then(resized);
    this.bindAudio();
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){this.metricsDirty=true;this.render();}});
    return this.el;
  },
  bindAudio(){
    const audio=Music.audio;
    if(!audio||audio===this.boundAudio)return;
    if(this.boundAudio&&this.audioHandlers)for(const [event,handler]of this.audioHandlers)this.boundAudio.removeEventListener(event,handler);
    this.boundAudio=audio;
    this.audioHandlers=[...['timeupdate','playing','pause','ended'].map(event=>[event,()=>this.tick()]),
      ...['seeked','ratechange'].map(event=>[event,()=>this.render()]),
      ...['loadedmetadata','durationchange'].map(event=>[event,()=>this.scheduleFit()])];
    for(const [event,handler]of this.audioHandlers)audio.addEventListener(event,handler);
  },
  scheduleFit(){
    if(this.fitFrame)return;
    this.fitFrame=requestAnimationFrame(()=>{this.fitFrame=null;this.fit();});
  },
  refreshMetrics(){
    for(const row of this.rows){
      const style=getComputedStyle(row.line),size=parseFloat(style.fontSize)||16;
      row.metrics={width:row.line.clientWidth,base:parseFloat(style.getPropertyValue('--ly-base-size'))||size,
        min:parseFloat(style.getPropertyValue('--ly-min-size'))||12,family:style.fontFamily,
        weight:style.fontWeight,fontStyle:style.fontStyle,spacing:(parseFloat(style.letterSpacing)||0)/size};
    }
    this.metricsDirty=false;
  },
  fit(){
    if(!this.el||this.el.hidden||!this.lines)return;
    if(this.metricsDirty||this.rows.some(row=>!row.metrics))this.refreshMetrics();
    const now=(Music.audio?.currentTime||0)+this.off,index=this.last;
    const start=index>=0?this.lines[index]?.t||0:Math.min(0,now),next=this.lines[index+1]?.t;
    const end=Number.isFinite(next)?next:Number.isFinite(Music.audio?.duration)?Music.audio.duration+this.off:now+8;
    const duration=Math.max(.15,end-start),rate=Math.max(.1,Music.audio?.playbackRate||1);
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for(const row of this.rows){
      row.animation?.cancel();row.animation=null;
      const {line,span,metrics:m}=row;
      if(!m||m.width<=0)continue;
      const text=span.textContent||'',chars=[...text].length,available=Math.max(1,m.width-2);
      const widthAt=size=>{this.measure.font=m.fontStyle+' '+m.weight+' '+size+'px '+m.family;return this.measure.measureText(text).width+chars*m.spacing*size;};
      const natural=widthAt(m.base),size=natural>available?Math.max(m.min,Math.floor(m.base*available/natural*10)/10):m.base;
      const width=widthAt(size),overflow=Math.max(0,width-available);
      line.style.fontSize=size+'px';line.style.whiteSpace='nowrap';span.style.whiteSpace='nowrap';span.style.overflowWrap='normal';
      line.style.textAlign=overflow>.5?'left':'center';
      line.dataset.fit=overflow>.5?'scroll':'shrink';
      if(overflow<=.5)continue;
      if(reduced){line.style.whiteSpace='normal';span.style.whiteSpace='normal';span.style.overflowWrap='anywhere';line.dataset.fit='wrap';continue;}
      const head=Math.min(.6,duration*.15),tail=Math.min(.4,duration*.1);
      row.animation=span.animate([
        {transform:'translateX(0)',offset:0},
        {transform:'translateX(0)',offset:head/duration},
        {transform:'translateX(-'+overflow+'px)',offset:1-tail/duration},
        {transform:'translateX(-'+overflow+'px)',offset:1}
      ],{duration:duration/rate*1000,fill:'both',easing:'linear'});
      row.animation.currentTime=Math.max(0,Math.min(duration,now-start))/rate*1000;
    }
  },
  index(t){const L=this.lines;if(!L)return -1;let lo=0,hi=L.length-1,ans=-1;t+=this.off;while(lo<=hi){const m=(lo+hi)>>1;if(L[m].t<=t){ans=m;lo=m+1;}else hi=m-1;}return ans;},
  tick(){
    const el=this.mount(),a=Music.audio;this.bindAudio();
    const sameTrack=Music._loadedId===this.key||(!Music._loadedId&&Music.cur?.id===this.key);
    const playing=a&&!a.paused&&!a.ended;
    const show=this.on()&&this.lines?.length&&playing&&sameTrack&&Music.cur?.type!=='yt'&&!document.body.classList.contains('mini');
    if(!show){if(!el.hidden)el.hidden=true;return;}
    const i=this.index(a.currentTime||0);
    if(el.hidden){el.hidden=false;this.last=-2;this.metricsDirty=true;}
    if(i===this.last)return;
    this.last=i;
    const texts=[i>=0?this.lines[i].text||'♪':'♪',this.lines[i+1]?.text||''];
    this.rows.forEach((row,n)=>{if(row.span.textContent!==texts[n])row.span.textContent=texts[n];});
    this.scheduleFit();
  },
  render(){this.last=-2;this.tick();},
};