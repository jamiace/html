/* ============================================================
   Music player: local files (MP3 / FLAC / M4A / OGG / WAV)
   stored in IndexedDB, YouTube links via the IFrame Player API,
   and bundled tracks listed in music/playlist.json (web build)
   ============================================================ */
const AUDIO_EXT = /\.(mp3|flac|m4a|aac|ogg|oga|opus|wav|webm)$/i;
const Music = {
  audio: null, yt: null, ytReady: false, ytApi: null, playing: false, cur: null, urls: {}, dbp: null, fails: 0,
  get M() { return Game.S.music; },
  init() {
    const a = this.audio = new Audio(); a.preload = 'auto'; a.volume = this.M.vol;
    a.addEventListener('loadedmetadata', () => {
      if (this.cur && this.cur.type !== 'yt' && this._loadedId === this.cur.id && this._resume > 0) {
        try { a.currentTime = Math.min(this._resume, Number.isFinite(a.duration) ? Math.max(0, a.duration - 0.1) : this._resume); this._resume = 0; } catch (e) { }
      }
    });
    a.addEventListener('timeupdate', () => this.remember());
    clearInterval(this._rememberTimer); this._rememberTimer = setInterval(() => this.remember(), 2000);
    if (!this._saveHook) {
      this._saveHook = true; const save = Game.save.bind(Game);
      Game.save = function () { Music.remember(); return save.apply(this, arguments); };
      window.addEventListener('pagehide', () => Music.remember());
    }
    a.addEventListener('ended', () => this.onEnded());
    a.addEventListener('play', () => { this.playing = true; this.changed(); });
    a.addEventListener('pause', () => { if (this.cur && this.cur.type !== 'yt') { this.playing = false; this.changed(); } });
    a.addEventListener('error', () => { if (!this.cur || this.cur.type === 'yt' || !a.src) return; this.playing = false; UI.toast('這首歌無法播放（格式不支援或檔案已失效）', 'i_music', 3.5); this.changed(); });
    const M = this.M; if (M.idx >= 0 && M.list[M.idx]) this.cur = M.list[M.idx];
    if (M.ctx === 'lib') this.cur = M.last && M.last.ctx === 'lib' ? Object.assign({}, M.last) : null;
    this.loadLib(false); MusicCache.init().then(() => UI.refresh('music'));
    try {
      const ms = navigator.mediaSession; if (ms) {
        ms.setActionHandler('play', () => this.toggle(true)); ms.setActionHandler('pause', () => this.toggle(false));
        ms.setActionHandler('nexttrack', () => this.next(true)); ms.setActionHandler('previoustrack', () => this.prev());
      }
    } catch (e) { }
  },
  remember() {
    const e = this.cur, M = this.M; if (!e || !M || this._loadedId !== e.id) return;
    const last = M.last && M.last.id === e.id ? M.last : {};
    let position = this.progress()[0], vid = last.vid || e.vid || '';
    if (e.type === 'yt') {
      try { vid = this.yt.getVideoData().video_id || vid; } catch (error) { }
      if (typeof MusicDefault !== 'undefined' && MusicDefault.target) return;
    }
    M.last = { id: e.id, type: e.type, fid: e.fid || '', src: e.src || '', title: e.title, album: e.album || '', ctx: M.ctx, libAlbum: M.libAlbum || '', position: Math.max(0, position || 0), vid };
  },
  // ---------- IndexedDB blob store ----------
  db() {
    if (!this.dbp) this.dbp = new Promise((res, rej) => { try { const r = indexedDB.open('pocketnook', 1); r.onupgradeneeded = () => r.result.createObjectStore('tracks'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } });
    return this.dbp;
  },
  async idb(mode, fn) { const db = await this.db(); return new Promise((res, rej) => { const tx = db.transaction('tracks', mode); const st = tx.objectStore('tracks'); const r = fn(st); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); }); },
  putBlob(id, blob) { return this.idb('readwrite', st => st.put(blob, id)); },
  getBlob(id) { return this.idb('readonly', st => st.get(id)); },
  delBlob(id) { return this.idb('readwrite', st => st.delete(id)).catch(() => { }); },
  // ---------- adding ----------
  async addFiles(files) {
    const M = this.M; let first = -1, n = 0, unsaved = 0;
    const lrcs = {}; for (const f of files) if (/\.lrc$/i.test(f.name)) lrcs[f.name.replace(/\.lrc$/i, '').toLowerCase()] = f;
    for (const f of files) {
      if (!(f.type && f.type.startsWith('audio/')) && !AUDIO_EXT.test(f.name)) continue;
      if (M.list.length >= 300) { UI.toast('播放清單最多 300 首', 'i_music'); break; }
      const id = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      let stored = true; try { await this.putBlob(id, f); } catch (e) { stored = false; unsaved++; }
      this.urls[id] = URL.createObjectURL(f);
      M.list.push({ id, type: 'file', title: f.name.replace(AUDIO_EXT, '').slice(0, 120), stored });
      const lf = lrcs[f.name.replace(AUDIO_EXT, '').toLowerCase()]; if (lf) { try { MusicCache.small('lrc', 'file:' + id, Lyrics.decode(await lf.arrayBuffer())); } catch (e) { } }
      if (first < 0) first = M.list.length - 1; n++;
    }
    if (!n) { UI.toast(Object.keys(lrcs).length ? '只找到歌詞檔，請和同名的音樂檔一起拖進來' : '沒有找到可以播放的音樂檔（支援 MP3、FLAC、M4A、OGG、WAV）', 'i_music', 4); return; }
    Game.save(); UI.refresh('music');
    UI.toast(`加入了 ${n} 首歌` + (unsaved ? `，其中 ${unsaved} 首太大無法記住，重新整理後要再加一次` : ''), 'i_music', 3.5);
    if (!this.playing) this.playIdx(first);
  },
  parseYT(s) {
    s = String(s || '').trim(); if (!s) return null;
    if (/^[\w-]{11}$/.test(s)) return { vid: s };
    let u; try { u = new URL(s.includes('://') ? s : 'https://' + s); } catch (e) { return null; }
    const host = u.hostname.replace(/^www\.|^m\.|^music\./, '');
    if (!['youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host)) return null;
    let vid = null; const list = u.searchParams.get('list') || null;
    if (host === 'youtu.be') vid = u.pathname.slice(1, 12);
    else if (u.searchParams.get('v')) vid = u.searchParams.get('v');
    else { const m = u.pathname.match(/\/(?:embed|shorts|live|v)\/([\w-]{11})/); if (m) vid = m[1]; }
    if (vid && !/^[\w-]{11}$/.test(vid)) vid = null;
    if (!vid && !list) return null;
    return { vid, list: list && /^[\w-]+$/.test(list) ? list : null };
  },
  addYT(text) {
    const p = this.parseYT(text); if (!p) { UI.toast('看不懂這個連結，請貼上 YouTube 影片或播放清單網址', 'i_video', 3.5); return false; }
    const M = this.M; M.list.push({ id: 'y' + Date.now().toString(36), type: 'yt', vid: p.vid, list: p.list, title: p.list && !p.vid ? 'YouTube 播放清單' : 'YouTube 影片 ' + (p.vid || '') });
    Game.save(); UI.refresh('music'); if (!this.playing) this.playIdx(M.list.length - 1); return true;
  },
  isLib(e) { return e && (e.type === 'drive' || (e.type === 'url' && String(e.id).startsWith('u:'))); },
  remote(e) { return e.type === 'drive' ? Lib.mediaUrl(e.fid) : e.src; },
  async srcFor(e) {
    if (this.isLib(e)) {
      await MusicCache.init();
      const b = await MusicCache.get(e.id); if (b) return this.setLibUrl(URL.createObjectURL(b));
      const got = await this.download(e, false); if (got === 'abort') return 'abort';
      return got ? this.setLibUrl(URL.createObjectURL(got)) : this.remote(e);   // download failed: stream it this time
    }
    if (e.type === 'url') return e.src;
    if (this.urls[e.id]) return this.urls[e.id];
    const b = await this.getBlob(e.id).catch(() => null); if (!b) return null;
    return this.urls[e.id] = URL.createObjectURL(b);
  },
  setLibUrl(u) { if (this.libUrl) URL.revokeObjectURL(this.libUrl); return this.libUrl = u; },
  // whole-file download into the cache, with progress; bg = prefetching the next track
  dl: null,
  async download(e, bg) {
    if (bg && this.dl) return null;
    if (this.dl && this.dl.ctl) this.dl.ctl.abort();
    const ctl = new AbortController(), job = this.dl = { id: e.id, got: 0, total: 0, bg, ctl }; UI.refresh('music');
    try {
      const r = await fetch(this.remote(e), { signal: ctl.signal }); if (!r.ok) throw new Error('HTTP ' + r.status);
      job.total = +r.headers.get('content-length') || 0; const type = r.headers.get('content-type') || 'audio/mpeg';
      let blob;
      if (r.body && r.body.getReader) {
        const rd = r.body.getReader(), parts = []; let lastUi = 0;
        for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); job.got += value.length; if (Date.now() - lastUi > 400) { lastUi = Date.now(); UI.refresh('music'); } }
        blob = new Blob(parts, { type });
      } else blob = await r.blob();
      await MusicCache.put(e.id, blob, { title: e.title, album: e.album });
      return blob;
    } catch (err) { return ctl.signal.aborted ? 'abort' : null; }
    finally { if (this.dl === job) this.dl = null; UI.refresh('music'); }
  },
  // quietly download the track that will play next, so it starts instantly
  prefetch() {
    const Q = this.Q, n = Q.length; if (!n || this.M.ctx !== 'lib') return;
    const i = this.M.shuffle ? this.shufNext : (this.qi + 1) % n, e = Q[i];
    if (!e || !this.isLib(e) || MusicCache.has(e.id) || this.dl) return;
    this.download(e, true);
  },
  // ---------- playback ----------
  get Q() { return this.M.ctx === 'lib' ? Lib.queue(this.M.libAlbum) : this.M.list; },
  get qi() { return this.M.ctx === 'lib' ? (this.M.lidx == null ? -1 : this.M.lidx) : this.M.idx; },
  playIdx(i) { this.remember(); this.M.ctx = 'list'; return this.playAt(i); },
  playLib(i, album) { this.remember(); const M = this.M; M.ctx = 'lib'; M.libAlbum = album || ''; return this.playAt(i); },
  async playAt(i) {
    const M = this.M, Q = this.Q; if (i < 0 || i >= Q.length) return;
    if (M.ctx === 'lib') M.lidx = i; else M.idx = i;
    const e = this.cur = Q[i], last = M.last;
    this._loadedId = null; this._resume = last && last.id === e.id ? last.position || 0 : 0;
    M.last = { id: e.id, type: e.type, fid: e.fid || '', src: e.src || '', title: e.title, album: e.album || '', ctx: M.ctx, libAlbum: M.libAlbum || '', position: this._resume, vid: last && last.id === e.id ? last.vid || e.vid || '' : e.vid || '' };
    Game.save();
    if (e.type === 'yt') { this.audio.pause(); return this.playYT(e); }
    this.stopYT();
    if (this.dl && !this.dl.bg && this.dl.id !== e.id) this.dl.ctl.abort();
    this.audio.pause(); Lyrics.load(e); Covers.get(e, true).then(() => UI.refresh('music'));
    const src = await this.srcFor(e);
    if (this.cur !== e || src === 'abort') return;   // another track was picked while this one downloaded
    if (!src) { e.missing = true; this.changed(); if (++this.fails < Q.length) return this.next(false); this.fails = 0; UI.toast('找不到這首歌的檔案，請重新加入', 'i_music'); return; }
    e.missing = false; this.fails = 0;
    this._loadedId = e.id; this.audio.src = src; this.audio.volume = M.vol;
    if (M.shuffle && Q.length > 1) { let j; do { j = Math.floor(Math.random() * Q.length); } while (j === i); this.shufNext = j; }
    try { await this.audio.play(); } catch (err) { this.playing = false; this.changed(); }
    MusicCache.init().then(() => this.prefetch());
  },
  toggle(force) {
    const M = this.M;
    if (force === false && !this.playing) return;
    if (M.ctx === 'lib' && !this.Q.length) { if (Lib.status === 'loading') return this.loadLib(false).then(() => this.Q.length ? this.toggle(force) : UI.toast('上次播放的曲目目前無法取得，請重新讀取音樂庫', 'i_music')); UI.toast('上次播放的曲目目前無法取得，請重新讀取音樂庫', 'i_music'); return; }
    if (!this.cur) { if (M.ctx === 'lib' && Lib.tracks.length) this.playLib(Math.max(0, Math.min(M.lidx || 0, Lib.queue(M.libAlbum).length - 1)), M.libAlbum); else if (M.list.length) this.playIdx(Math.max(0, M.idx)); else if (Lib.tracks.length) this.playLib(0, ''); else UI.openWin('music'); return; }
    if (this.cur.type === 'yt') {
      if (!this.yt || !this.ytReady) return this.playAt(Math.max(0, this.qi));
      const st = this.yt.getPlayerState(); const want = force != null ? force : st !== 1;
      want ? this.yt.playVideo() : this.yt.pauseVideo(); return;
    }
    if (!this.audio.src) return this.playAt(Math.max(0, this.qi));
    const want = force != null ? force : this.audio.paused;
    if (want) this.audio.play().catch(() => { }); else this.audio.pause();
  },
  next(manual) {
    const M = this.M, n = this.Q.length; if (!n) return;
    if (manual && this.cur && this.cur.type === 'yt' && this.cur.list && this.yt && this.ytReady) { const pl = this.yt.getPlaylist() || []; if (this.yt.getPlaylistIndex() < pl.length - 1) { this.yt.nextVideo(); return; } }
    let i = this.qi + 1;
    if (M.shuffle && n > 1) { i = this.shufNext != null && this.shufNext < n && this.shufNext !== this.qi ? this.shufNext : this.qi; while (i === this.qi) i = Math.floor(Math.random() * n); this.shufNext = null; }
    if (i >= n) { if (M.repeat === 'off' && !manual) { this.stop(); return; } i = 0; }
    this.playAt(i);
  },
  prev() {
    const n = this.Q.length; if (!n) return;
    if (this.cur && this.cur.type !== 'yt' && this.audio.currentTime > 3) { this.audio.currentTime = 0; return; }
    if (this.cur && this.cur.type === 'yt' && this.cur.list && this.yt && this.ytReady && this.yt.getPlaylistIndex() > 0) { this.yt.previousVideo(); return; }
    this.playAt((this.qi - 1 + n) % n);
  },
  stop() { this.audio.pause(); this.stopYT(); this.playing = false; this.changed(); },
  onEnded() { if (this.M.repeat === 'one') { this.audio.currentTime = 0; this.audio.play().catch(() => { }); return; } this.next(false); },
  setVol(v) { const M = this.M; M.vol = Math.max(0, Math.min(1, v)); this.audio.volume = M.vol; if (this.yt && this.ytReady) try { this.yt.setVolume(Math.round(M.vol * 100)); } catch (e) { } clearTimeout(this._vs); this._vs = setTimeout(() => Game.save(), 500); },
  cycleRepeat() { const M = this.M; M.repeat = M.repeat === 'all' ? 'one' : M.repeat === 'one' ? 'off' : 'all'; Game.save(); UI.refresh('music'); },
  toggleShuffle() { this.M.shuffle = !this.M.shuffle; Game.save(); UI.refresh('music'); },
  progress() {
    if (this.cur && this.cur.type === 'yt') { if (this.yt && this.ytReady && this.yt.getDuration) try { return [this.yt.getCurrentTime() || 0, this.yt.getDuration() || 0]; } catch (e) { } return [0, 0]; }
    const a = this.audio; return [a.currentTime || 0, isFinite(a.duration) ? a.duration : 0];
  },
  seek(frac) {
    const [, d] = this.progress(); if (!d) return;
    if (this.cur && this.cur.type === 'yt') { try { this.yt.seekTo(frac * d, true); } catch (e) { } } else this.audio.currentTime = frac * d;
  },
  remove(id) {
    const M = this.M, i = M.list.findIndex(e => e.id === id); if (i < 0) return;
    const e = M.list[i];
    if (this.cur === e) { this.stop(); this.cur = null; this.audio.removeAttribute('src'); }
    M.list.splice(i, 1);
    if (M.idx > i) M.idx--; else if (M.idx === i) M.idx = Math.min(i, M.list.length - 1);
    if (M.ctx === 'lib' && this.cur && this.cur !== e) { Game.save(); return this.changed(); }
    if (this.urls[id]) { URL.revokeObjectURL(this.urls[id]); delete this.urls[id]; }
    if (e.type === 'file') this.delBlob(id);
    Game.save(); this.changed();
  },
  move(id, dir) { const M = this.M, i = M.list.findIndex(e => e.id === id), j = i + dir; if (i < 0 || j < 0 || j >= M.list.length) return; const cur = M.list[M.idx]; [M.list[i], M.list[j]] = [M.list[j], M.list[i]]; M.idx = cur ? M.list.indexOf(cur) : M.idx; Game.save(); UI.refresh('music'); },
  // ---------- YouTube ----------
  loadYTApi() {
    if (this.ytApi) return this.ytApi;
    this.ytApi = new Promise((res, rej) => {
      if (window.YT && window.YT.Player) return res();
      const prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { if (prev) try { prev(); } catch (e) { } res(); };
      const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true; s.onerror = () => rej(new Error('blocked')); document.head.append(s);
      setTimeout(() => rej(new Error('timeout')), 9000);
    });
    this.ytApi.catch(() => { this.ytApi = null; });
    return this.ytApi;
  },
  async playYT(e) {
    UI.ytPanel(true, e, 'loading');
    try { await this.loadYTApi(); if (this.cur !== e) return; } catch (err) { this.playing = false; UI.ytPanel(true, e, 'blocked'); this.changed(); return; }
    UI.ytPanel(true, e, 'ok');
    const saved = this.M.last;
    if (saved && saved.id === e.id && saved.vid && typeof MusicDefault !== 'undefined' && e.id === NOOK_YT.id && !MusicDefault.target && !MusicDefault.shuffleNext) MusicDefault.target = saved.vid;
    const load = () => { try { if (e.list) this.yt.loadPlaylist({ listType: 'playlist', list: e.list, index: 0 }); else this.yt.loadVideoById({ videoId: e.vid, startSeconds: this._resume || 0 }); this.yt.setVolume(Math.round(this.M.vol * 100)); } catch (x) { } };
    if (!this.yt) {
      this.yt = new YT.Player('yt-player', {
        width: '100%', height: '100%', playerVars: { playsinline: 1, rel: 0 },
        events: {
          onReady: () => { this.ytReady = true; if (this.cur && this.cur.type === 'yt') { const c = this.cur; e = c; load(); } },
          onStateChange: (ev) => this.onYTState(ev),
          onError: () => { if (this.cur && this.cur.list && this.yt) { try { const pl = this.yt.getPlaylist() || []; if (pl.length > 1) { setTimeout(() => { try { this.yt.nextVideo(); } catch (x) { } }, 400); return; } } catch (x) { } } UI.toast('這部影片不允許嵌入播放，跳到下一首', 'i_video', 3.5); setTimeout(() => this.next(false), 800); },
        },
      });
    } else if (this.ytReady) load();
  },
  onYTState(ev) {
    // a YouTube player stopping after you switched to another song must not mark the music as stopped
    if (!this.cur || this.cur.type !== 'yt') return;
    const s = ev.data; this.playing = s === 1 || s === 3;
    if (s === 1) {
      this._loadedId = this.cur.id;
      const saved = this.M.last;
      try {
        const vid = this.yt.getVideoData().video_id;
        if (this._resume > 0 && saved && (!saved.vid || saved.vid === vid)) { this.yt.seekTo(this._resume, true); this._resume = 0; }
        else if (saved && saved.vid && vid !== saved.vid) this._resume = 0;
      } catch (e) { }
      this.remember(); Game.save();
    }
    if (s === 1 && this.cur && this.cur.type === 'yt') { try { const d = this.yt.getVideoData(); if (d && d.title && !this.cur.list && this.cur.title !== d.title) { this.cur.title = d.title.slice(0, 120); Game.save(); } } catch (e) { } }
    if (s === 0) {
      if (this.cur && this.cur.list) { try { const pl = this.yt.getPlaylist() || []; if (this.yt.getPlaylistIndex() < pl.length - 1) return; } catch (e) { } }
      if (this.M.repeat === 'one') { this.yt.seekTo(0); this.yt.playVideo(); return; }
      this.next(false);
    }
    this.changed();
  },
  stopYT() { if (this.yt && this.ytReady) try { this.yt.stopVideo(); } catch (e) { } UI.ytPanel(false); },
  closeYT() { if (this.cur && this.cur.type === 'yt') { this.stopYT(); this.playing = false; this.changed(); } else UI.ytPanel(false); },
  ytWatchUrl(e) { return e.vid ? 'https://www.youtube.com/watch?v=' + e.vid + (e.list ? '&list=' + e.list : '') : 'https://www.youtube.com/playlist?list=' + e.list; },
  loadLib(force) {
    return Lib.load(force).then(() => {
      const M = this.M;
      if (M.ctx === 'lib' && (!this.cur || this._loadedId == null)) {
        const Q = Lib.queue(M.libAlbum), last = M.last;
        const index = last && last.ctx === 'lib' ? Q.findIndex(t => t.id === last.id || (last.fid && t.fid === last.fid) || (last.src && t.src === last.src)) : -1;
        if (Q.length) { M.lidx = index >= 0 ? index : Math.max(0, Math.min(M.lidx || 0, Q.length - 1)); this.cur = Q[M.lidx]; }
      }
      UI.refresh('music'); UI.hud(true);
    });
  },
  changed() {
    UI.refresh('music'); UI.hud(true);
    try { if (navigator.mediaSession && this.cur && window.MediaMetadata) { navigator.mediaSession.metadata = new MediaMetadata({ title: this.cur.title, artist: '呼嚕小窩' }); navigator.mediaSession.playbackState = this.playing ? 'playing' : 'paused'; } } catch (e) { }
  },
};

/* ------------------------------------------------------------
   Built-in library: music/playlist.json (bundled files) plus a
   public Google Drive folder read with the Drive API v3 and an
   API key (config: NOOK_DRIVE_FOLDER / NOOK_DRIVE_API_KEY).
   Kept out of the save file; only the play position is saved.
   ------------------------------------------------------------ */
const Lib = {
  tracks: [], albums: [], status: 'idle', err: '', root: '', at: 0, busy: null,
  CACHE: 'pocketnook.lib.v2', TTL: 12 * 3600e3, MAX_TRACKS: 3000, MAX_FOLDERS: 200,
  get key() { return (window.NOOK_DRIVE_API_KEY || '').trim(); },
  get folder() { const f = (window.NOOK_DRIVE_FOLDER || '').trim(); const m = f.match(/folders\/([\w-]+)/); return m ? m[1] : f; },
  enabled() { return window.NOOK_ENV !== 'artifact'; },
  driveOn() { return this.enabled() && !!this.key && !!this.folder; },
  mediaUrl(fid) { return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fid)}?alt=media&key=${encodeURIComponent(this.key)}`; },
  queue(album) { return album ? this.tracks.filter(t => t.album === album) : this.tracks; },
  sort(list) { const c = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }); return list.sort((a, b) => c.compare(a.album, b.album) || c.compare(a.title, b.title)); },
  finish(list) {
    const seen = new Set(), out = [];
    for (const t of list) { const k = t.fid ? 'd:' + t.fid : 'u:' + t.src; if (seen.has(k)) continue; seen.add(k); if (t.fid && t.type === 'url') seen.add('d:' + t.fid); out.push(t); }
    // bundled copies of a Drive file win over streaming it
    this.tracks = this.sort(out.filter(t => !(t.type === 'drive' && out.some(o => o.type === 'url' && o.fid === t.fid))));
    const al = {}; for (const t of this.tracks) al[t.album] = (al[t.album] || 0) + 1;
    this.albums = Object.keys(al).map(n => ({ n, c: al[n] }));
  },
  load(force) {
    if (!this.enabled()) { this.status = 'off'; return Promise.resolve(); }
    if (this.busy) return this.busy;
    this.status = 'loading'; this.err = ''; UI.refresh('music');
    return this.busy = (async () => {
      const bundled = await this.loadBundled();
      let drive = [];
      if (this.driveOn()) {
        try { drive = await this.loadDrive(force); }
        catch (e) { this.err = String(e && e.message || e); }
      }
      this.finish(bundled.concat(drive));
      this.status = this.err && !this.tracks.length ? 'err' : 'ok';
    })().finally(() => { this.busy = null; });
  },
  async loadBundled() {
    try {
      const r = await fetch('music/playlist.json', { cache: 'no-cache' }); if (!r.ok) return [];
      const list = await r.json(); if (!Array.isArray(list)) return [];
      return list.map((t, i) => { const src = typeof t === 'string' ? t : t && t.src; if (!src) return null;
        return { id: 'u:' + src, type: 'url', src, fid: t.drive || '', lrc: (t && t.lrc) || '', album: (t && t.album) || '內建', title: (t && t.title) || decodeURIComponent(src.split('/').pop().replace(AUDIO_EXT, '')) }; }).filter(Boolean);
    } catch (e) { return []; }
  },
  async api(path, params) {
    const u = new URL('https://www.googleapis.com/drive/v3/' + path); for (const k in params) u.searchParams.set(k, params[k]); u.searchParams.set('key', this.key);
    const r = await fetch(u.toString()); const j = await r.json().catch(() => ({}));
    if (!r.ok) { const m = (j.error && j.error.message) || ('HTTP ' + r.status); throw new Error(r.status === 403 ? '金鑰沒有權限或 Drive API 沒有啟用：' + m : r.status === 404 ? '找不到資料夾，請確認已設成「知道連結的人都能檢視」' : m); }
    return j;
  },
  async loadDrive(force) {
    const root = this.folder;
    if (!force) try { const c = JSON.parse(localStorage.getItem(this.CACHE) || 'null'); if (c && c.folder === root && Date.now() - c.at < this.TTL && Array.isArray(c.tracks)) { this.root = c.root || ''; this.at = c.at; return c.tracks; } } catch (e) { }
    const meta = await this.api('files/' + encodeURIComponent(root), { fields: 'name', supportsAllDrives: 'true' }).catch(() => ({}));
    this.root = meta.name || '雲端資料夾';
    const out = [], todo = [{ id: root, path: '' }], done = new Set();
    while (todo.length && done.size < this.MAX_FOLDERS && out.length < this.MAX_TRACKS) {
      const f = todo.shift(); if (done.has(f.id)) continue; done.add(f.id);
      let pageToken = ''; const lrc = {}, here = [];
      do {
        const j = await this.api('files', { q: `'${f.id}' in parents and trashed=false`, fields: 'nextPageToken,files(id,name,mimeType,shortcutDetails)', pageSize: '1000', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true', orderBy: 'name', ...(pageToken ? { pageToken } : {}) });
        for (const x of j.files || []) {
          let id = x.id, mt = x.mimeType;
          if (mt === 'application/vnd.google-apps.shortcut' && x.shortcutDetails) { id = x.shortcutDetails.targetId; mt = x.shortcutDetails.targetMimeType; }
          if (mt === 'application/vnd.google-apps.folder') todo.push({ id, path: f.path ? f.path + ' / ' + x.name : x.name });
          else if (/\.lrc$/i.test(x.name)) lrc[x.name.replace(/\.lrc$/i, '').toLowerCase()] = id;
          else if ((mt || '').startsWith('audio/') || AUDIO_EXT.test(x.name)) { const t = { id: 'd:' + id, type: 'drive', fid: id, album: f.path || this.root, title: x.name.replace(AUDIO_EXT, '') }; out.push(t); here.push(t); }
        }
        pageToken = j.nextPageToken || '';
      } while (pageToken && out.length < this.MAX_TRACKS);
      for (const t of here) { const l = lrc[t.title.toLowerCase()]; if (l) t.lrc = l; }
    }
    this.at = Date.now();
    try { localStorage.setItem(this.CACHE, JSON.stringify({ folder: root, root: this.root, at: this.at, tracks: out })); } catch (e) { }
    return out;
  },
};
