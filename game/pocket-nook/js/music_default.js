/* ============================================================
   Built-in YouTube playlist (小窩電台)
   - added once to everyone's music list (removing it is respected: it is not added back)
   - players who have never picked anything to play start from it; whoever already listens to
     something else keeps their choice
   - the first tap after opening starts a random track of the playlist, then keeps shuffling
     (browsers never let a page play sound before the first tap); pausing it yourself turns
     this off until you press play again
   ============================================================ */
const NOOK_YT = { id: 'yt_nook', type: 'yt', list: 'PL_77ETNrRb7Ep0Zv3tQNLNxQgwTsTHNrV', title: '小窩電台（YouTube 播放清單）', builtin: true };

const MusicDefault = {
  armed: false, shuffleNext: false,
  setup() {
    const M = Game.S.music; if (!M) return;
    if (!M.ytAdded) {
      M.ytAdded = true;
      if (!M.list.some(e => e.type === 'yt' && e.list === NOOK_YT.list)) M.list.unshift(Object.assign({}, NOOK_YT));
      if (M.idx >= 0) M.idx++;
      // never chose anything: the playlist becomes what plays
      if (M.idx < 0 && !(M.lidx >= 0)) { M.ctx = 'list'; M.idx = 0; }
      Game.save();
    }
    const i = M.list.findIndex(e => e.id === NOOK_YT.id);
    if (M.ctx === 'list' && i >= 0 && M.idx === i) Music.cur = M.list[i];
    this.armed = M.autoOff !== true && !!Music.cur && Music.cur.id === NOOK_YT.id;
    // get the player script ready so the first tap can start the music right away
    if (this.armed && window.NOOK_ENV === 'web') Music.loadYTApi().catch(() => { });
  },
  // the first tap anywhere: a random track of the playlist
  first() {
    if (!this.armed) return; this.armed = false;
    if (Music.playing || !Music.cur || Music.cur.id !== NOOK_YT.id) return;
    if (Game.S.music.autoOff === true) return;
    this.shuffleNext = true; Music.playAt(Game.S.music.list.indexOf(Music.cur));
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
    if (e && e.id === NOOK_YT.id && this.yt && (ev.data === 1 || ev.data === 5 || ev.data === -1)) {
      try {
        const pl = this.yt.getPlaylist() || [];
        if (pl.length) {
          this.yt.setShuffle(true); this.yt.setLoop(true);
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
