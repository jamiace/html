/* ============================================================
   Built-in YouTube playlist (小窩電台)
   - Only new players with no previous selection start from the radio.
     Existing local/library/YouTube selections and positions are retained.
   - its songs are listed in the music window (內建音樂 → 小窩電台); tap one to play it
   - the first tap resumes the previous source; only a new radio session starts randomly
     (browsers never let a page play sound before the first tap); pausing it yourself turns
     this off until you press play again
   ============================================================ */
const NOOK_YT = { id: 'yt_nook', type: 'yt', list: 'PL_77ETNrRb7Ep0Zv3tQNLNxQgwTsTHNrV', title: '小窩電台（YouTube 播放清單）', builtin: true };

const MusicDefault = {
  armed: false, shuffleNext: false, target: null, curVid: '',
  setup() {
    const M = Game.S.music; if (!M) return;
    const oldIndex = M.idx;
    const selected = M.list[oldIndex];
    const fresh = M.ctx !== 'lib' && !selected && !M.last;
    if (!M.list.some(e => e.type === 'yt' && e.list === NOOK_YT.list)) {
      M.list.unshift(Object.assign({}, NOOK_YT));
      if (oldIndex >= 0) M.idx = oldIndex + 1;
    }
    const radio = M.list.find(e => e.type === 'yt' && e.list === NOOK_YT.list);
    radio.id = NOOK_YT.id;
    M.ytDefaultV = 1; M.ytAdded = true;
    if (fresh) { M.ctx = 'list'; M.idx = M.list.indexOf(radio); M.autoOff = false; }
    if (M.ctx === 'list') Music.cur = M.list[M.idx] || null;
    if (UI.mTab == null) UI.mTab = M.ctx === 'lib' || (Music.cur && Music.cur.id === NOOK_YT.id) ? 'lib' : 'list';
    this.armed = M.autoOff !== true;
    if (this.armed && Music.cur && Music.cur.type === 'yt' && window.NOOK_ENV === 'web') Music.loadYTApi().catch(() => { });
  },
  // ---------- the playlist's songs ----------
  tracks() {
    const known = new Map(NOOK_YT_TRACKS.map(r => [r[0], r]));
    let ids = []; try { if (this.isOn() && Music.yt && Music.ytReady && Music.yt.getPlaylist) ids = Music.yt.getPlaylist() || []; } catch (e) { }
    // the player's own list (shuffled order) is used only to add songs that are not listed here yet
    const out = NOOK_YT_TRACKS.map(r => ({ id: r[0], t: r[1], by: r[2], len: r[3] }));
    for (const id of ids) if (!known.has(id)) out.push({ id, t: '', by: '', len: '' });
    return out;
  },
  isOn() { return !!(Music.cur && Music.cur.id === NOOK_YT.id); },
  // play one song of the playlist
  play(vid) {
    const M = Game.S.music, i = M.list.findIndex(e => e.id === NOOK_YT.id);
    if (M.last && M.last.id === NOOK_YT.id) { M.last.vid = vid; M.last.position = 0; } Music._resume = 0;
    if (i < 0) { M.list.unshift(Object.assign({}, NOOK_YT)); if (M.idx >= 0) M.idx++; }
    if (this.isOn() && Music.yt && Music.ytReady) {
      try { const pl = Music.yt.getPlaylist() || [], k = pl.indexOf(vid); if (k >= 0) { Music.yt.playVideoAt(k); return; } } catch (e) { }
    }
    this.target = vid; this.shuffleNext = false; Music.playIdx(M.list.findIndex(e => e.id === NOOK_YT.id));
  },
  // The first gesture resumes the last source; a new radio listener starts randomly.
  first() {
    if (!this.armed) return; this.armed = false;
    if (Music.playing) return;
    if (Game.S.music.autoOff === true) return;
    const last = Game.S.music.last;
    this.shuffleNext = this.isOn() && !(last && last.vid);
    Music.toggle(true);
  },
};

(function () {
  const init = Music.init.bind(Music);
  Music.init = function () { const r = init(); try { MusicDefault.setup(); } catch (e) { console.warn('[music]', e); } return r; };
  // a pause you chose yourself turns the automatic start off; pressing play turns it back on
  const tog = Music.toggle.bind(Music);
  Music.toggle = function (force) {
    if (force === undefined && Game.S && Game.S.music) { const M = Game.S.music, off = !!Music.playing; if (M.autoOff !== off) { M.autoOff = off; Game.save(); } MusicDefault.armed = false; }
    return tog(force);
  };
  const pa = Music.playAt.bind(Music);
  Music.playAt = function (i) { MusicDefault.armed = false; if (Game.S && Game.S.music && Game.S.music.autoOff) { Game.S.music.autoOff = false; } return pa(i); };
  // the built-in playlist starts on a random track and keeps shuffling
  const st = Music.onYTState.bind(Music);
  Music.onYTState = function (ev) {
    const e = this.cur;
    // which song is on: highlighted in the list
    if (e && e.id === NOOK_YT.id && ev.data === 1) { try { const v = (this.yt.getVideoData() || {}).video_id || ''; if (v !== MusicDefault.curVid) { MusicDefault.curVid = v; UI.refresh('music'); const r = NOOK_YT_TRACKS.find(x => x[0] === v), tt = document.querySelector('#ytpanel .yt-title'), nm = r ? r[1] : ((this.yt.getVideoData() || {}).title || ''); if (tt && nm) tt.textContent = '小窩電台 · ' + nm; } } catch (x) { } }
    if (e && e.id === NOOK_YT.id && this.yt && (ev.data === 1 || ev.data === 5 || ev.data === -1)) {
      try {
        const pl = this.yt.getPlaylist() || [];
        if (pl.length) {
          this.yt.setShuffle(true); this.yt.setLoop(true);
          if (MusicDefault.target) { const k = pl.indexOf(MusicDefault.target); MusicDefault.target = null; if (k >= 0 && k !== this.yt.getPlaylistIndex()) { this.yt.playVideoAt(k); return; } }
          if (MusicDefault.shuffleNext) { MusicDefault.shuffleNext = false; const k = Math.floor(Math.random() * pl.length); if (k !== this.yt.getPlaylistIndex()) { this.yt.playVideoAt(k); return; } }
        }
      } catch (x) { }
    }
    return st(ev);
  };
  // (a first tap on a play button is left to that button)
  for (const ev of ['pointerdown', 'keydown']) document.addEventListener(ev, e => { try { if (e.target && e.target.closest && e.target.closest('.musicchip, #ytpanel, [aria-label*="音樂"], [aria-label="播放"], [aria-label="暫停"]')) { MusicDefault.armed = false; return; } MusicDefault.first(); } catch (x) { } }, true);
})();

// computer: the YouTube player goes in the free space beside the room, never over the furniture
// (dragged by its title bar, it stays where you put it; a narrow window keeps the old corner)
const YTPlace = {
  apply() {
    const yp = document.getElementById('ytpanel'), wrap = document.querySelector('.room-wrap');
    if (!yp || yp.hidden || !wrap || document.body.classList.contains('m') || yp.dataset.moved) return;
    const r = wrap.getBoundingClientRect(), gl = r.left, gr = window.innerWidth - r.right, gap = Math.max(gl, gr) - 12;
    // YouTube needs at least 200 × 200 px for its player: a slim frame fits from 204 px of free space
    if (gap < 204) { yp.classList.remove('yt-side'); yp.style.width = ''; yp.style.left = ''; yp.style.right = ''; yp.style.top = ''; yp.style.bottom = ''; return; }
    yp.classList.add('yt-side');
    const w = Math.min(372, gap), hgt = yp.offsetHeight || 230, top = Math.max(8, Math.min(window.innerHeight - hgt - 8, r.bottom - hgt));
    yp.style.width = w + 'px'; yp.style.top = top + 'px'; yp.style.bottom = 'auto';
    // the left side first (the hand tray uses the right side)
    if (gl - 12 >= 204 || gl >= gr) { yp.style.left = Math.max(8, (gl - w) / 2) + 'px'; yp.style.right = 'auto'; }
    else { yp.style.left = Math.round(r.right + (gr - w) / 2) + 'px'; yp.style.right = 'auto'; }
  },
};
(function () {
  const show = UI.ytPanel.bind(UI);
  UI.ytPanel = function (on) { const r = show.apply(this, arguments); if (on) requestAnimationFrame(() => YTPlace.apply()); return r; };
  window.addEventListener('resize', () => YTPlace.apply());
  window.addEventListener('load', () => { const yh = document.querySelector('#ytpanel .yt-h'); if (yh) yh.addEventListener('pointerdown', e => { if (!e.target.closest('button') && !document.body.classList.contains('m')) document.getElementById('ytpanel').dataset.moved = '1'; }); });
})();

// music window: 小窩電台 is the first album of 內建音樂, with every song of the playlist
(function () {
  const RADIO = '__yt';
  const lib = UI.musicLib.bind(UI);
  const card = (on) => h('button', { class: 'malbum radio' + (on ? ' on' : ''), title: '小窩電台（YouTube 播放清單）', onclick: () => { UI.mAlbum = RADIO; UI.refresh('music'); } },
    h('div', { class: 'mal-ph radio' }, ico('i_video', 36)), h('b', { text: '小窩電台' }), h('span', { class: 'hint', text: `YouTube · ${MusicDefault.tracks().length} 首` }));
  const tab = (on) => h('button', { class: 'tab sm' + (on ? ' on' : ''), onclick: () => { UI.mAlbum = RADIO; UI.refresh('music'); } }, `小窩電台 ${MusicDefault.tracks().length}`);
  UI.musicLib = function () {
    // the radio is what plays and nothing else was picked here yet: open on its songs
    if (this.mAlbum == null && MusicDefault.isOn()) this.mAlbum = RADIO;
    const radio = this.mAlbum === RADIO, keep = this.mAlbum;
    if (radio) this.mAlbum = '';            // let the library draw its album row as for "全部"
    let out; try { out = lib(); } finally { this.mAlbum = keep; }
    const wrap = h('div', {}, ...out);
    const cards = wrap.querySelector('.malbums'), tabs = wrap.querySelector('.mlib-al');
    if (cards) { if (radio) cards.querySelectorAll('.malbum.on').forEach(b => b.classList.remove('on')); cards.prepend(card(radio)); }
    else if (tabs) { if (radio) tabs.querySelectorAll('.tab.on').forEach(b => b.classList.remove('on')); tabs.prepend(tab(radio)); }
    let items = [...wrap.children];
    if (!cards && !tabs) items.unshift(h('div', { class: 'row' }, h('div', { class: 'tabs wrap mlib-al' }, tab(radio))));
    if (!radio) return items;
    // the radio's own songs instead of the library's play row and track list
    const T = MusicDefault.tracks(), on = MusicDefault.isOn(), cur = on ? MusicDefault.curVid : '';
    const head = h('div', { class: 'row' }, h('button', { class: 'chip primary sm', onclick: () => MusicDefault.play(T[Math.floor(Math.random() * T.length)].id) }, ico('i_shuffle', 16), '隨機播放'),
      h('span', { class: 'hint grow', text: 'YouTube 播放清單 · 點一首就從那首開始，之後隨機播放' }));
    const list = h('div', { class: 'scroll mtracks' }, h('ol', { class: 'mlist' }, ...T.map((r, i) => h('li', { class: r.id === cur ? 'cur' : '' },
      h('button', { class: 'mplay', title: r.t ? `${r.t}${r.by ? ' · ' + r.by : ''}` : `第 ${i + 1} 首`, onclick: () => MusicDefault.play(r.id) },
        h('span', { class: 'mi num', text: String(i + 1) }), h('span', { class: 'mn', text: r.t || `第 ${i + 1} 首` }), r.len ? h('em', { class: 'mb num', text: r.len }) : null)))));
    const playRow = items.findIndex(el => el.matches && el.matches('.row') && el.querySelector('.chip.primary'));
    const trk = items.findIndex(el => el.matches && el.matches('.mtracks'));
    items = items.filter((el, k) => k !== playRow && k !== trk && !(el.matches && el.matches('.mcache, .empty, .hint.center')));
    items.push(head, list);
    return items;
  };
})();

// the YouTube player can shrink to its title bar and keep playing (a phone has no room for the video);
// remembered on this device, a phone starts shrunk
const YTMini = {
  key: 'pocketnook.ytmin',
  get() { try { const v = localStorage.getItem(this.key); if (v != null) return v === '1'; } catch (e) { } return document.body.classList.contains('m'); },
  set(v) { try { localStorage.setItem(this.key, v ? '1' : '0'); } catch (e) { } this.apply(); },
  apply() {
    const yp = document.getElementById('ytpanel'); if (!yp) return;
    const on = this.get(); yp.classList.toggle('min', on);
    if (this.btn) { this.btn.replaceChildren(ico(on ? 'i_zoomin' : 'i_zoomout', 16)); this.btn.setAttribute('aria-label', on ? '展開影片' : '縮小（繼續播放）'); this.btn.title = on ? '展開影片' : '縮小成一條（繼續播放）'; }
    if (this.pp) this.pp.replaceChildren(ico(Music.playing ? 'i_pause' : 'i_play', 16));
    requestAnimationFrame(() => YTPlace.apply());
  },
  build() {
    const yp = document.getElementById('ytpanel'), hd = yp && yp.querySelector('.yt-h'), x = document.getElementById('yt-close'); if (!hd || this.btn) return;
    this.pp = h('button', { class: 'xbtn yt-pp', type: 'button', 'aria-label': '播放或暫停', onclick: () => { Music.toggle(); setTimeout(() => this.apply(), 300); } });
    this.btn = h('button', { class: 'xbtn yt-min', type: 'button', onclick: () => this.set(!this.get()) });
    hd.insertBefore(this.pp, x); hd.insertBefore(this.btn, x); this.apply();
  },
};
(function () {
  window.addEventListener('load', () => YTMini.build());
  const ch = Music.changed ? Music.changed.bind(Music) : null;
  if (ch) Music.changed = function () { const r = ch.apply(this, arguments); try { YTMini.apply(); } catch (e) { } return r; };
})();

// phone: lyrics sit just under the room (in the page), never on top of it
(function () {
  const tick = Lyrics.tick.bind(Lyrics);
  Lyrics.tick = function () {
    const el = this.mount(), m = document.body.classList.contains('m'), st = document.querySelector('.stage'), wrap = document.querySelector('.room-wrap');
    if (m && st && wrap && el.parentNode !== st) st.insertBefore(el, wrap.nextSibling);
    else if (!m && el.parentNode !== document.body) document.body.append(el);
    return tick();
  };
})();

// a word being read aloud: the music steps back to a quarter of its volume, then comes back
// (the browser's voice is already at full volume, so the music makes room for it)
const Duck = {
  k: 1, t: null,
  vol(k) {
    this.k = k; const M = Game.S && Game.S.music; if (!M) return;
    const dim = (typeof Lights !== 'undefined' && Lights.musicK != null) ? Lights.musicK : 1, v = M.vol * dim * k;
    try { if (Music.audio) Music.audio.volume = v; if (Music.yt && Music.ytReady) Music.yt.setVolume(Math.round(v * 100)); } catch (e) { }
  },
  start(ms) { if (!Music.playing) return; clearTimeout(this.t); this.vol(0.25); this.t = setTimeout(() => this.end(), ms || 4000); },
  end() { clearTimeout(this.t); this.t = null; if (this.k !== 1) this.vol(1); },
};
(function () {
  const say = Learn.say.bind(Learn);
  Learn.say = function (w) {
    if (this.tts && this.tts() && Music.playing) {
      Duck.start(2500 + String(w).length * 120);
      // end the ducking when the voice finishes
      try { const done = () => setTimeout(() => Duck.end(), 250); const poll = setInterval(() => { if (!speechSynthesis.speaking && !speechSynthesis.pending) { clearInterval(poll); done(); } }, 200); setTimeout(() => clearInterval(poll), 8000); } catch (e) { }
    }
    return say(w);
  };
  const sp = Learn.speak.bind(Learn);
  Learn.speak = function (w) {
    const r = sp(w);
    try { const a = this.audio; if (a && window.NOOK_AUDIO_BASE && Music.playing) { Duck.start(4000); a.volume = 1; a.addEventListener('ended', () => setTimeout(() => Duck.end(), 200), { once: true }); a.addEventListener('error', () => Duck.end(), { once: true }); } } catch (e) { }
    return r;
  };
  // the volume slider while ducked: keep the duck
  const sv = Music.setVol.bind(Music); Music.setVol = function (v) { const r = sv(v); if (Duck.k !== 1) Duck.vol(Duck.k); return r; };
})();
