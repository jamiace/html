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
    a.addEventListener('ended', () => this.onEnded());
    a.addEventListener('play', () => { this.playing = true; this.changed(); });
    a.addEventListener('pause', () => { if (this.cur && this.cur.type !== 'yt') { this.playing = false; this.changed(); } });
    a.addEventListener('error', () => { if (!this.cur || this.cur.type === 'yt' || !a.src) return; this.playing = false; UI.toast('這首歌無法播放（格式不支援或檔案已失效）', 'i_music', 3.5); this.changed(); });
    const M = this.M; if (M.idx >= 0 && M.list[M.idx]) this.cur = M.list[M.idx];
    if (window.NOOK_ENV === 'web') fetch('music/playlist.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : []).then(list => {
      if (!Array.isArray(list)) return; let added = 0;
      for (const t of list) { const src = typeof t === 'string' ? t : t && t.src; if (!src || M.list.some(e => e.type === 'url' && e.src === src)) continue; M.list.push({ id: 'u' + Math.random().toString(36).slice(2, 9), type: 'url', src, title: (t && t.title) || decodeURIComponent(src.split('/').pop().replace(AUDIO_EXT, '')) }); added++; }
      if (added) { Game.save(); UI.refresh('music'); }
    }).catch(() => { });
    try {
      const ms = navigator.mediaSession; if (ms) {
        ms.setActionHandler('play', () => this.toggle(true)); ms.setActionHandler('pause', () => this.toggle(false));
        ms.setActionHandler('nexttrack', () => this.next(true)); ms.setActionHandler('previoustrack', () => this.prev());
      }
    } catch (e) { }
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
    for (const f of files) {
      if (!(f.type && f.type.startsWith('audio/')) && !AUDIO_EXT.test(f.name)) continue;
      if (M.list.length >= 300) { UI.toast('播放清單最多 300 首', 'i_music'); break; }
      const id = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      let stored = true; try { await this.putBlob(id, f); } catch (e) { stored = false; unsaved++; }
      this.urls[id] = URL.createObjectURL(f);
      M.list.push({ id, type: 'file', title: f.name.replace(AUDIO_EXT, '').slice(0, 120), stored });
      if (first < 0) first = M.list.length - 1; n++;
    }
    if (!n) { UI.toast('沒有找到可以播放的音樂檔（支援 MP3、FLAC、M4A、OGG、WAV）', 'i_music', 4); return; }
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
  async srcFor(e) {
    if (e.type === 'url') return e.src;
    if (this.urls[e.id]) return this.urls[e.id];
    const b = await this.getBlob(e.id).catch(() => null); if (!b) return null;
    return this.urls[e.id] = URL.createObjectURL(b);
  },
  // ---------- playback ----------
  async playIdx(i) {
    const M = this.M; if (i < 0 || i >= M.list.length) return;
    M.idx = i; const e = this.cur = M.list[i]; Game.save();
    if (e.type === 'yt') { this.audio.pause(); return this.playYT(e); }
    this.stopYT();
    const src = await this.srcFor(e);
    if (!src) { e.missing = true; this.changed(); if (++this.fails < M.list.length) return this.next(false); this.fails = 0; UI.toast('找不到這首歌的檔案，請重新加入', 'i_music'); return; }
    e.missing = false; this.fails = 0;
    this.audio.src = src; this.audio.volume = M.vol;
    try { await this.audio.play(); } catch (err) { this.playing = false; this.changed(); }
  },
  toggle(force) {
    const M = this.M;
    if (!this.cur) { if (M.list.length) this.playIdx(Math.max(0, M.idx)); else UI.openWin('music'); return; }
    if (this.cur.type === 'yt') {
      if (!this.yt || !this.ytReady) return this.playYT(this.cur);
      const st = this.yt.getPlayerState(); const want = force != null ? force : st !== 1;
      want ? this.yt.playVideo() : this.yt.pauseVideo(); return;
    }
    if (!this.audio.src) return this.playIdx(M.idx);
    const want = force != null ? force : this.audio.paused;
    if (want) this.audio.play().catch(() => { }); else this.audio.pause();
  },
  next(manual) {
    const M = this.M, n = M.list.length; if (!n) return;
    if (manual && this.cur && this.cur.type === 'yt' && this.cur.list && this.yt && this.ytReady) { const pl = this.yt.getPlaylist() || []; if (this.yt.getPlaylistIndex() < pl.length - 1) { this.yt.nextVideo(); return; } }
    let i = M.idx + 1;
    if (M.shuffle && n > 1) { do { i = Math.floor(Math.random() * n); } while (i === M.idx); }
    if (i >= n) { if (M.repeat === 'off' && !manual) { this.stop(); return; } i = 0; }
    this.playIdx(i);
  },
  prev() {
    const M = this.M, n = M.list.length; if (!n) return;
    if (this.cur && this.cur.type !== 'yt' && this.audio.currentTime > 3) { this.audio.currentTime = 0; return; }
    if (this.cur && this.cur.type === 'yt' && this.cur.list && this.yt && this.ytReady && this.yt.getPlaylistIndex() > 0) { this.yt.previousVideo(); return; }
    this.playIdx((M.idx - 1 + n) % n);
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
    if (this.urls[id]) { URL.revokeObjectURL(this.urls[id]); delete this.urls[id]; }
    if (e.type === 'file') this.delBlob(id);
    Game.save(); this.changed();
  },
  move(id, dir) { const M = this.M, i = M.list.findIndex(e => e.id === id), j = i + dir; if (i < 0 || j < 0 || j >= M.list.length) return; const cur = M.list[M.idx]; [M.list[i], M.list[j]] = [M.list[j], M.list[i]]; M.idx = M.list.indexOf(cur); Game.save(); UI.refresh('music'); },
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
    try { await this.loadYTApi(); } catch (err) { this.playing = false; UI.ytPanel(true, e, 'blocked'); this.changed(); return; }
    UI.ytPanel(true, e, 'ok');
    const load = () => { try { if (e.list) this.yt.loadPlaylist({ listType: 'playlist', list: e.list, index: 0 }); else this.yt.loadVideoById(e.vid); this.yt.setVolume(Math.round(this.M.vol * 100)); } catch (x) { } };
    if (!this.yt) {
      this.yt = new YT.Player('yt-player', {
        width: '100%', height: '100%', playerVars: { playsinline: 1, rel: 0 },
        events: {
          onReady: () => { this.ytReady = true; if (this.cur && this.cur.type === 'yt') { const c = this.cur; e = c; load(); } },
          onStateChange: (ev) => this.onYTState(ev),
          onError: () => { UI.toast('這部影片不允許嵌入播放，跳到下一首', 'i_video', 3.5); setTimeout(() => this.next(false), 800); },
        },
      });
    } else if (this.ytReady) load();
  },
  onYTState(ev) {
    const s = ev.data; this.playing = s === 1 || s === 3;
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
  changed() {
    UI.refresh('music'); UI.hud(true);
    try { if (navigator.mediaSession && this.cur && window.MediaMetadata) { navigator.mediaSession.metadata = new MediaMetadata({ title: this.cur.title, artist: '小窩時光' }); navigator.mediaSession.playbackState = this.playing ? 'playing' : 'paused'; } } catch (e) { }
  },
};
