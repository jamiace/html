/* window position & size, kept per device (not in the save file) */
const WinLayout = {
  KEY: 'pocketnook.winlayout', d: null,
  all() { if (!this.d) { try { this.d = JSON.parse(localStorage.getItem(this.KEY) || '{}') || {}; } catch (e) { this.d = {}; } } return this.d; },
  get(id) { return this.all()[id] || null; },
  put(w) { const d = this.all(); d[w.id] = { x: w.pos ? Math.round(w.pos[0]) : null, y: w.pos ? Math.round(w.pos[1]) : null, w: w.size ? Math.round(w.size[0]) : null, h: w.size ? Math.round(w.size[1]) : null }; try { localStorage.setItem(this.KEY, JSON.stringify(d)); } catch (e) { } },
};
/* ============================================================
   UI: HUD, dock, windows, overlay
   ============================================================ */
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k]; if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v; else if (k === 'style') el.style.cssText = v;
    else if (k === 'text') el.textContent = v; else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
const ICON = {};
function ico(name, size = 32, cls = 'ico') { if (!ICON[name]) ICON[name] = spriteDataURL(name, 4); return h('img', { class: cls, src: ICON[name], width: size, height: size, alt: '' }); }
function sprPreview(cv, box = 64, maxScale = 4, boxH = box) {
  // whole pixels only, and the whole sprite fits the box (tall plants and big furniture included)
  const s = Math.max(1, Math.min(maxScale, Math.floor(box / cv.width), Math.floor(boxH / cv.height)));
  const c = document.createElement('canvas'); c.width = cv.width * s; c.height = cv.height * s; c.className = 'pv';
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(cv, 0, 0, c.width, c.height); return c;
}
function swatch(fn, kind) {
  const W = 36, H = 26, s = 2; const c = document.createElement('canvas'); c.width = W * s; c.height = H * s; c.className = 'pv';
  const x = c.getContext('2d');
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    let col; if (kind === 'wp') col = fn(i + 20, j + 10); else { const y = 120 + Math.floor(j * 1.4), [xa, xb] = floorX(y), sc = (xb - xa) / 180; col = fn((i * 3 - 54), y, sc); }
    x.fillStyle = col; x.fillRect(i * s, j * s, s, s);
  }
  return c;
}
const THEME_PV = {};
function themePreview(id) {
  let src = THEME_PV[id];
  if (!src) { const th = THEMES[id]; let uid = 1; const st = { wp: th.wp, fl: th.fl, view: th.view, gifts: [], items: Game.buildLayout(th.layout, () => uid++, k => k.split('|')[0]) }; src = THEME_PV[id] = Room.renderStatic(document.createElement('canvas'), st); }
  const c = document.createElement('canvas'); c.width = RW; c.height = RH; c.className = 'pv theme-pv'; c.getContext('2d').drawImage(src, 0, 0); return c;
}
function viewSwatch(id) {
  const c = document.createElement('canvas'); c.width = 30; c.height = 26; c.className = 'pv view-pv'; const x = c.getContext('2d');
  Room.drawWindowScene(x, 0, 0, 30, 26, id); return c;
}
const fmtM = (sec) => { sec = Math.max(0, Math.floor(sec || 0)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); };
const fmt = (sec) => { sec = Math.max(0, Math.round(sec)); return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0'); };

function makeFrames() {
  const S = 3;
  const mk = (w, hh, draw) => { const c = document.createElement('canvas'); c.width = w * S; c.height = hh * S; const x = c.getContext('2d'); draw((px, py, col) => { x.fillStyle = col; x.fillRect(px * S, py * S, S, S); }); return c.toDataURL(); };
  const O = '#2e2230';
  const panel = mk(11, 11, p => {
    for (let i = 0; i < 11; i++) for (let j = 0; j < 11; j++) {
      const r = Math.min(i, j, 10 - i, 10 - j); const corner = (i === 0 || i === 10) && (j === 0 || j === 10); if (corner) continue;
      if (r === 0) p(i, j, O);
      else if (r === 1) p(i, j, (i === 1 && j === 1) || (i === 9 && j === 1) || (i === 1 && j === 9) || (i === 9 && j === 9) ? O : (j === 1 || i === 1) && !(i === 9 || j === 9) ? '#e3ac72' : (j === 9 || i === 9) ? '#8b5a3c' : '#b5794b');
      else if (r === 2) p(i, j, '#b5794b');
      else if (r === 3) p(i, j, '#5e3b2f');
    }
  });
  const btn = (down) => mk(7, 8, p => {
    for (let i = 0; i < 7; i++) for (let j = 0; j < 8; j++) {
      const corner = (i === 0 || i === 6) && (j === 0 || j === 7); if (corner) continue;
      if (i === 0 || i === 6 || j === 0 || j === 7) { p(i, j, O); continue; }
      if (!down) { if (j === 1 && i < 6) p(i, j, 'rgba(255,255,255,0.6)'); else if (i === 1 && j < 5) p(i, j, 'rgba(255,255,255,0.35)'); else if (j >= 5) p(i, j, j === 6 ? 'rgba(46,34,48,0.32)' : 'rgba(46,34,48,0.14)'); else if (i === 5) p(i, j, 'rgba(46,34,48,0.14)'); }
      else { if (j === 1 || j === 2) p(i, j, j === 1 ? 'rgba(46,34,48,0.3)' : 'rgba(46,34,48,0.12)'); }
    }
  });
  const inset = mk(7, 7, p => { for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) { const corner = (i === 0 || i === 6) && (j === 0 || j === 6); if (corner) continue; if (i === 0 || i === 6 || j === 0 || j === 6) p(i, j, O); else if (j === 1) p(i, j, 'rgba(46,34,48,0.18)'); } });
  const st = document.createElement('style');
  st.textContent = `:root{--f-panel:url(${panel});--f-btn:url(${btn(false)});--f-btn-down:url(${btn(true)});--f-inset:url(${inset})}`;
  document.head.append(st);
}

const UI = {
  wins: {}, z: 20, tags: new Map(), bubbles: [], floats: [],
  init() {
    makeFrames();
    this.app = document.getElementById('app'); this.overlay = document.getElementById('overlay'); this.layer = document.getElementById('windows');
    this.buildHud(); this.buildDock(); this.buildMini();
    window.addEventListener('resize', () => this.layout()); this.layout();
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { if (Room.edit) return this.setEdit(false); const top = Object.values(this.wins).filter(w => !w.el.hidden).sort((a, b) => b.el.style.zIndex - a.el.style.zIndex)[0]; if (top && !top.conf.noclose) this.closeWin(top.id); }
    });
    this.renderPins();
    const yp = document.getElementById('ytpanel');
    document.getElementById('yt-close').addEventListener('click', () => Music.closeYT());
    const yh = yp.querySelector('.yt-h');
    yh.addEventListener('pointerdown', e => { if (this.narrow() || e.target.closest('button')) return; const r = yp.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top; yh.setPointerCapture(e.pointerId);
      const mv = ev => { yp.style.left = Math.max(0, Math.min(window.innerWidth - r.width, ev.clientX - ox)) + 'px'; yp.style.top = Math.max(0, Math.min(window.innerHeight - 60, ev.clientY - oy)) + 'px'; yp.style.bottom = 'auto'; };
      const up = () => { yh.removeEventListener('pointermove', mv); yh.removeEventListener('pointerup', up); }; yh.addEventListener('pointermove', mv); yh.addEventListener('pointerup', up); });
    const hasFiles = e => e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files');
    document.addEventListener('dragover', e => { if (hasFiles(e)) { e.preventDefault(); document.body.classList.add('dropping'); } });
    document.addEventListener('dragleave', e => { if (e.target === document.documentElement || !e.relatedTarget) document.body.classList.remove('dropping'); });
    document.addEventListener('drop', e => { if (!hasFiles(e)) return; e.preventDefault(); document.body.classList.remove('dropping'); const files = [...e.dataTransfer.files]; if (files.length) { this.openWin('music'); Music.addFiles(files); } });
    setTimeout(() => { if (Game.S.wallet && Game.S.wallet.pend) this.openWin('gacha'); }, 900);   // a gacha result waiting for keep / sell
    if (!Game.S.seenIntro) { Game.S.seenIntro = true; setTimeout(() => this.toast('歡迎！每天到「學習」複習 20 個單字，房間冒出泡泡時點它看看需要什麼', 'i_sparkle', 6), 600); if (window.innerWidth >= 900) { this.openWin('learn'); this.openWin('tasks'); } }
  },
  // ---------------- layout ----------------
  narrow() { return window.innerWidth < 760; },
  layout() {
    const mini = document.body.classList.contains('mini');
    const stage = document.querySelector('.stage'), cv = document.getElementById('room'), wrap = document.querySelector('.room-wrap');
    const r = stage.getBoundingClientRect();
    const availW = Math.max(200, r.width - (this.narrow() ? 0 : 24)), availH = Math.max(160, r.height - 16);
    const dpr = window.devicePixelRatio || 1;
    let s = Math.min(availW / RW, availH / RH);
    if (mini) s = Math.min(s, 2);
    const crisp = Math.floor(s * dpr) / dpr;
    s = crisp >= s * 0.86 ? Math.max(1 / dpr, crisp) : Math.max(1, Math.floor(s * 8) / 8);
    Game.scale = s; cv.style.width = RW * s + 'px'; cv.style.height = RH * s + 'px'; wrap.style.width = RW * s + 'px'; wrap.style.height = RH * s + 'px';
    for (const id in this.wins) this.placeWin(this.wins[id]);
  },
  // ---------------- HUD ----------------
  buildHud() {
    const hud = document.querySelector('.hud');
    this.el = {};
    hud.append(
      h('div', { class: 'brand' }, ico('i_heart', 22), h('span', { class: 'brand-name', text: '小窩時光' }), h('span', { class: 'brand-sub', text: 'Pocket Nook' })),
      h('div', { class: 'hud-mid' },
        this.el.lvl = h('button', { class: 'chip lvlchip', 'aria-label': '等級與統計', onclick: () => this.openWin('settings') }, ico('i_star', 22), h('span', { class: 'lv' }), h('span', { class: 'xpbar' }, h('i'))),
        this.el.coins = h('button', { class: 'chip coinchip', 'aria-label': '金幣，打開商店', onclick: () => this.openWin('shop') }, ico('i_coin', 22), h('b', { class: 'num' })),
        this.el.timer = h('button', { class: 'chip timerchip', 'aria-label': '番茄鐘', onclick: () => this.openWin('timer') }, ico('i_tomato', 22), h('b', { class: 'num' }), h('span', { class: 'tm-mode' })),
        this.el.music = h('button', { class: 'chip musicchip', 'aria-label': '音樂', onclick: () => this.openWin('music') }, ico('i_music', 22), h('span', { class: 'mt' }))),
      h('div', { class: 'hud-right' },
        this.el.cloud = h('button', { class: 'chip cloudchip', 'data-st': 'off', onclick: () => this.toggleWin('account') }, ico('i_cloud', 24), h('span', { class: 'cl-t' })),
        h('button', { class: 'chip icon-only', title: '迷你模式', 'aria-label': '迷你模式', onclick: () => this.setMini(true) }, ico('i_mini', 24)),
        h('button', { class: 'chip icon-only', title: '設定', 'aria-label': '設定', onclick: () => this.toggleWin('settings') }, ico('i_gear', 24))),
    );
    this.hud(true);
  },
  hud(force) {
    const S = Game.S, t = S.timer;
    this.el.lvl.querySelector('.lv').textContent = 'Lv ' + S.lvl;
    this.el.lvl.querySelector('.xpbar i').style.width = Math.round(S.xp / Game.need(S.lvl) * 100) + '%';
    this.el.lvl.title = `經驗 ${S.xp} / ${Game.need(S.lvl)}`;
    this.el.coins.querySelector('.num').textContent = S.coins;
    const rem = t.running ? (t.endsAt - Date.now()) / 1000 : t.remain;
    this.el.timer.querySelector('.num').textContent = fmt(rem);
    this.el.timer.querySelector('.tm-mode').textContent = t.running ? (t.mode === 'focus' ? '專注中' : '休息中') : (t.remain < Game.modeLen(t.mode) ? '暫停' : (t.mode === 'focus' ? '準備專注' : '準備休息'));
    this.el.timer.classList.toggle('running', t.running); this.el.timer.classList.toggle('brk', t.mode !== 'focus');
    const mini = this.el.miniTime; if (mini) { mini.textContent = fmt(rem); this.el.miniMode.textContent = t.mode === 'focus' ? '專注' : '休息'; this.el.miniPlay.replaceChildren(ico(t.running ? 'i_pause' : 'i_play', 24)); }
    if (!this.titleFlash) document.title = t.running ? `${fmt(rem)} ${t.mode === 'focus' ? '專注中' : '休息中'} · 小窩時光` : '小窩時光';
    if (this.wins.timer && !this.wins.timer.el.hidden) this.tickTimerWin();
    const mc = this.el.music; if (mc) { const cur = Music.cur; mc.hidden = !cur; if (cur) { const tt = (Music.playing ? '' : '暫停 · ') + cur.title; if (mc.lastTitle !== tt) { mc.lastTitle = tt; mc.querySelector('.mt').textContent = tt; mc.title = cur.title; } mc.classList.toggle('playing', Music.playing); } }
    if (this.wins.music && !this.wins.music.el.hidden) this.tickMusic();
    Lyrics.tick();
    if (this.el.miniMusic) this.el.miniMusic.classList.toggle('on', Music.playing);
    if (this.wins.cowork && !this.wins.cowork.el.hidden && Cowork.peers.length) this.tickCowork();
  },
  flashTitle(txt) { this.titleFlash = true; document.title = txt + ' · 小窩時光'; clearTimeout(this._tf); this._tf = setTimeout(() => { this.titleFlash = false; }, 6000); },
  // ---------------- dock ----------------
  buildDock() {
    const dock = document.querySelector('.dock-inner');
    const items = [['timer', 'i_tomato', '番茄鐘'], ['learn', 'i_learn', '學習'], ['tasks', 'i_task', '任務'], ['todo', 'i_list', '待辦'], ['memo', 'i_note', '便條'], ['music', 'i_music', '音樂'], ['shop', 'i_shop', '商店'], ['storage', 'i_box', '收納'], ['edit', 'i_brush', '佈置'], ['avatar', 'i_shirt', '造型'], ['pet', 'i_paw', '寵物'], ['cowork', 'i_people', '一起專注'], ['friends', 'i_people', '好友']];
    this.dockBtns = {};
    for (const [id, ic, label] of items) {
      if (id === 'cowork' && window.NOOK_ENV === 'web') continue;
      if (id === 'friends' && (!SOCIAL_ON || window.NOOK_ENV !== 'web')) continue;
      const b = h('button', { class: 'dock-btn', 'data-id': id, onclick: () => id === 'edit' ? this.setEdit(!Room.edit) : this.toggleWin(id) }, ico(ic, 32), h('span', { text: label }));
      this.dockBtns[id] = b; dock.append(b);
      // the travelling merchant sits next to the shop (outside the room, so nothing covers the furniture)
      if (id === 'shop') { const m = h('button', { class: 'dock-btn', 'data-id': 'merchant', onclick: () => this.wins.merchant && !this.wins.merchant.el.hidden ? this.closeWin('merchant') : Merchant.go() }, ico('i_merchant', 32), h('span', { text: '旅行商人' })); this.dockBtns.merchant = m; dock.append(m); }
    }
  },
  syncDock() { for (const id in this.dockBtns) { const on = id === 'edit' ? Room.edit : (this.wins[id] && !this.wins[id].el.hidden); this.dockBtns[id].classList.toggle('on', !!on); this.dockBtns[id].setAttribute('aria-pressed', on ? 'true' : 'false'); } },
  // ---------------- mini mode ----------------
  buildMini() {
    const bar = document.getElementById('minibar');
    bar.append(
      h('div', { class: 'mini-time' }, ico('i_tomato', 24), this.el.miniTime = h('b', { class: 'num' }), this.el.miniMode = h('span')),
      this.el.miniPlay = h('button', { class: 'chip icon-only', 'aria-label': '開始或暫停', onclick: () => Game.T().running ? Game.pause() : Game.start() }),
      h('button', { class: 'chip icon-only', 'aria-label': '重設', onclick: () => Game.resetTimer() }, ico('i_reset', 24)),
      this.el.miniMusic = h('button', { class: 'chip icon-only', 'aria-label': '播放或暫停音樂', title: '音樂', onclick: () => Music.toggle() }, ico('i_music', 24)),
      h('button', { class: 'chip icon-only', 'aria-label': '回到完整模式', title: '回到完整模式', onclick: () => this.setMini(false) }, ico('i_expand', 24)),
    );
  },
  setMini(on) { document.body.classList.toggle('mini', on); if (on) this.setEdit(false); document.getElementById('minibar').hidden = !on; this.layout(); this.hud(true); },
  // ---------------- edit mode ----------------
  setEdit(on) {
    Room.edit = on; Room.sel = null; Room.drag = null; Room.hover = null;
    if (typeof PetPlay !== 'undefined') { if (on && PetPlay.held) PetPlay.drop(); PetPlay.renderTray(); }
    document.getElementById('editbar').hidden = !on; document.body.classList.toggle('editing', on);
    this.editToolbar(); this.syncDock();
  },
  editToolbar(hide) {
    let tb = this._tb; if (!tb) { tb = this._tb = h('div', { class: 'etool' }); this.overlay.append(tb); }
    if (typeof Mobile !== 'undefined' && Mobile.on) { tb.hidden = true; return Mobile.renderEdit(); }   // the phone has its own edit panel
    const it = Room.sel; if (!it || !Room.edit || hide || !Room.uidMap[it.uid]) { tb.hidden = true; return; }
    const d = ITEMS[it.k]; tb.replaceChildren(...[
      h('span', { class: 'et-name', text: d.n }),
      h('button', { class: 'chip sm', onclick: () => { it.flip = !it.flip; if (it.p != null) Room.settleDecor(it); for (const c of Game.S.items) if (c.p === it.uid) { const cv = Room.itemCanvas(it), ccv = Room.itemCanvas(c); c.dx = cv.width - c.dx - ccv.width; } Room.clampItem(it); Game.save(); this.editToolbar(); } }, ico('i_flip', 20), '翻轉'),
      d.toggle ? h('button', { class: 'chip sm', onclick: () => { it.on = !it.on; Game.save(); } }, ico('i_lamp', 20), '開關') : null,
      d.window ? h('button', { class: 'chip sm', onclick: () => { it.closed = !it.closed; Game.save(); } }, '窗簾') : null,
      h('button', { class: 'chip sm', onclick: () => Game.storeItem(it) }, ico('i_box', 20), '收起'),
    ].filter(Boolean));
    tb.hidden = false; this.posToolbar();
  },
  posToolbar() {
    const it = Room.sel, tb = this._tb; if (!tb || tb.hidden || !it) return; const cv = Room.itemCanvas(it), s = Game.scale;
    let x = (it.x + cv.width / 2) * s, y = it.y * s - 8;
    tb.style.left = Math.max(0, x) + 'px'; tb.style.top = Math.max(0, y) + 'px';
  },
  // ---------------- overlay: bubbles, tags, floats ----------------
  bubble(target, text, secs) {
    this.clearBubbles(target.actor || 'furniture');
    const el = h('div', { class: 'bubble', text }); this.overlay.append(el);
    this.bubbles.push({ el, target, until: performance.now() + secs * 1000 });
  },
  clearBubbles(channel) {
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      if (channel === 'furniture' ? !b.target.actor : b.target.actor === channel) {
        b.el.remove(); this.bubbles.splice(i, 1);
      }
    }
  },
  floatText(txt, x, y) { const el = h('div', { class: 'floattext', text: txt }); this.overlay.append(el); this.floats.push({ el, x, y, t: 0 }); },
  dropTag(v) { const el = this.tags.get(v); if (el) { el.remove(); this.tags.delete(v); } },
  tickOverlay(dt) {
    const s = Game.scale, now = performance.now();
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      if (now > b.until || (b.target.actor && !Room.actors.includes(b.target.actor))) { b.el.remove(); this.bubbles.splice(i, 1); continue; }
      let x, y; if (b.target.actor) [x, y] = b.target.actor.headPos(); else { x = b.target.x; y = b.target.y; }
      const width = this.overlay.clientWidth || RW * s;
      b.el.style.maxWidth = Math.max(40, Math.min(380, width - 16)) + 'px';
      const half = b.el.offsetWidth / 2;
      const px = Math.max(half + 6, Math.min(width - half - 6, x * s));
      const py = Math.max(b.el.offsetHeight + 10, (y - 3) * s);
      b.el.style.setProperty('--tail-x', Math.max(10, Math.min(b.el.offsetWidth - 10, x * s - px + half)) + 'px');
      b.el.style.transform = `translate(${Math.round(px)}px, ${Math.round(py)}px) translate(-50%, -100%)`;
    }
    for (let i = this.floats.length - 1; i >= 0; i--) { const f = this.floats[i]; f.t += dt; if (f.t > 1.2) { f.el.remove(); this.floats.splice(i, 1); continue; } f.el.style.transform = `translate(${Math.round(f.x * s)}px, ${Math.round((f.y - f.t * 14) * s)}px) translate(-50%,-100%)`; f.el.style.opacity = String(1 - Math.max(0, f.t - 0.7) / 0.5); }
    for (const v of Object.values(Game.visitors)) {
      let el = this.tags.get(v); if (!el) { el = h('div', { class: 'tag' }); this.overlay.append(el); this.tags.set(v, el); }
      const st = v.st === 'focus' ? '專注中' : v.st === 'break' ? '休息中' : ''; const rem = v.end ? fmt((v.end - Date.now()) / 1000) : '';
      const txt = (v.nick || '訪客') + (st ? ` · ${st}${v.st !== 'idle' && rem ? ' ' + rem : ''}` : '');
      if (el.textContent !== txt) el.textContent = txt; el.classList.toggle('focus', v.st === 'focus');
      const [x, y] = v.headPos(); el.style.transform = `translate(${Math.round(x * s)}px, ${Math.round((y + 31) * s)}px) translate(-50%, 0)`;
    }
    this.posToolbar(); this.posOwnerTip(); this.posPetAsk();
  },
  // "pet me" hint: the pet waits where it is with a bobbing heart until you pet it in the room (3 pats) or 30 s pass
  askPet(pid, needId) {
    const p = Pets.get(pid), a = p && Pets.actor(p); if (!a) return;
    if (!['eat', 'zoom', 'trick'].includes(a.state)) { a.leaveSpot(() => { }); a.walking = false; a.state = 'sit'; a.timer = 30; }
    Game.bubble(a, a.kind === 'dog' ? '汪～摸摸我！' : '喵～摸摸我', 2.6);
    this.petAsk = { pid, needId, until: performance.now() + 30000 };
  },
  posPetAsk() {
    const q = this.petAsk; let el = this._askEl;
    const a = q && Pets.actor(Pets.get(q.pid)), open = q && Life.L.needs.some(n => n.id === q.needId);
    if (!q || !a || !open || performance.now() > q.until || Room.edit) { if (el) el.hidden = true; if (q && (!open || performance.now() > q.until)) this.petAsk = null; return; }
    if (!el) { el = this._askEl = h('div', { class: 'pet-ask' }, ico('n_heart', 22), h('span', { text: '點牠摸摸' })); this.overlay.append(el); }
    if (a.state === 'sit' && !a.walking) a.timer = Math.max(a.timer || 0, 2);   // keeps waiting for you instead of wandering off
    el.hidden = false; const s = Game.scale, [x, y] = a.headPos(), bob = Math.round(Math.sin(performance.now() / 220) * 3);
    el.style.transform = `translate(${Math.round(x * s)}px, ${Math.round((y - 26) * s) + bob}px) translate(-50%, -100%)`;
  },
  // whose item this is, under the item: while arranging (hover, drag, selected) and on hover in normal play
  posOwnerTip() {
    const it = Room.edit ? ((Room.drag && Room.drag.it) || Room.hover || Room.sel) : this.hoverIt;
    const txt = it && Room.uidMap[it.uid] && typeof Pets !== 'undefined' ? Pets.ownerTag(it) : null;
    let el = this._ownTip;
    if (!txt) { if (el) el.hidden = true; return; }
    if (!el) { el = this._ownTip = h('div', { class: 'tag owner-tip' }); this.overlay.append(el); }
    if (el.textContent !== txt) el.textContent = txt; el.hidden = false;
    const cv = Room.itemCanvas(it), s = Game.scale;
    el.style.transform = `translate(${Math.round((it.x + cv.width / 2) * s)}px, ${Math.round((it.y + cv.height + 2) * s)}px) translate(-50%, 0)`;
  },
  // ---------------- toasts ----------------
  toast(text, icon, secs = 3, action) {
    const box = document.getElementById('toasts');
    const el = h('div', { class: 'toast', role: 'status' }, icon ? ico(icon, 24) : null, h('span', { text }), action ? h('button', { class: 'chip sm', onclick: () => { action.fn(); el.remove(); } }, action.label) : null);
    box.append(el); while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, secs * 1000);
  },
  // ---------------- windows ----------------
  WIN: {
    timer: { t: '番茄鐘', i: 'i_tomato', w: 320, at: ['r', 0] }, todo: { t: '待辦清單', i: 'i_list', w: 330, at: ['l', 0] }, memo: { t: '便條紙', i: 'i_note', w: 380, at: ['l', 1] },
    shop: { t: '商店', i: 'i_shop', w: 600, at: ['c', 0] }, storage: { t: '收納箱', i: 'i_box', w: 560, at: ['c', 0] }, avatar: { t: '造型', i: 'i_shirt', w: 400, at: ['l', 0] },
    pet: { t: '寵物', i: 'i_paw', w: 360, at: ['l', 0] }, cowork: { t: '一起專注', i: 'i_people', w: 360, at: ['r', 1] }, settings: { t: '設定與紀錄', i: 'i_gear', w: 400, at: ['c', 0] },
    gift: { t: '禮物', i: 'i_star', w: 320, at: ['c', 0], modal: true },
    themeask: { t: '套用主題', i: 'i_theme', w: 380, at: ['c', 0], modal: true },
    music: { t: '音樂', i: 'i_music', w: 460, at: ['r', 1], resize: { minW: 360, minH: 420, h: 720 } },
  },
  getWin(id) {
    let w = this.wins[id]; if (w) return w;
    const conf = this.WIN[id];
    const body = h('div', { class: 'win-b' });
    const head = h('header', { class: 'win-h' }, ico(conf.i, 28), h('h2', { text: conf.t }), conf.noclose ? null : h('button', { class: 'xbtn', 'aria-label': '關閉', onclick: () => this.closeWin(id) }, ico('i_close', 22)));
    const el = h('section', { class: 'win', 'data-id': id, role: 'dialog', 'aria-label': conf.t, style: `width:${conf.w}px` }, head, body);
    el.hidden = true; this.layer.append(el);
    const saved = WinLayout.get(id);
    w = this.wins[id] = { id, el, body, conf, pos: saved && saved.x != null ? [saved.x, saved.y] : null, size: conf.resize && saved && saved.w ? [saved.w, saved.h] : conf.resize ? [conf.w, conf.resize.h] : null };
    if (conf.resize) {
      el.classList.add('resizable');
      const grip = h('div', { class: 'win-grip', title: '拖曳調整大小', 'aria-hidden': 'true' }); el.append(grip);
      grip.addEventListener('pointerdown', e => {
        if (this.narrow()) return; e.preventDefault(); e.stopPropagation(); grip.setPointerCapture(e.pointerId);
        const r = el.getBoundingClientRect(), sx = e.clientX, sy = e.clientY;
        const mv = (ev) => { w.size = [Math.max(conf.resize.minW, r.width + ev.clientX - sx), Math.max(conf.resize.minH, r.height + ev.clientY - sy)]; this.placeWin(w); };
        const up = () => { grip.removeEventListener('pointermove', mv); grip.removeEventListener('pointerup', up); WinLayout.put(w); };
        grip.addEventListener('pointermove', mv); grip.addEventListener('pointerup', up);
      });
    }
    el.addEventListener('pointerdown', () => this.raise(w));
    head.addEventListener('pointerdown', e => {
      if (this.narrow() || e.target.closest('button')) return; const r = el.getBoundingClientRect(); const ox = e.clientX - r.left, oy = e.clientY - r.top;
      head.setPointerCapture(e.pointerId);
      const mv = (ev) => { w.pos = [ev.clientX - ox, ev.clientY - oy]; this.placeWin(w); };
      const up = () => { head.removeEventListener('pointermove', mv); head.removeEventListener('pointerup', up); WinLayout.put(w); };
      head.addEventListener('pointermove', mv); head.addEventListener('pointerup', up);
    });
    return w;
  },
  placeWin(w) {
    const el = w.el; if (this.narrow()) { el.style.left = ''; el.style.top = ''; el.style.height = ''; return; }
    const W = window.innerWidth, H = window.innerHeight, ww = Math.min(w.size ? w.size[0] : w.conf.w, W - 32);
    el.style.width = ww + 'px';
    if (w.size) el.style.height = Math.min(w.size[1], H - 24) + 'px';
    const hh = el.offsetHeight || 300;
    if (!w.pos) { const [side, slot] = w.conf.at; const top = 76 + slot * 40; w.pos = side === 'r' ? [W - ww - 24, top] : side === 'l' ? [24, top] : [(W - ww) / 2, Math.max(60, (H - hh) / 2 - 20)]; }
    const x = Math.max(8, Math.min(W - ww - 8, w.pos[0])), y = Math.max(8, Math.min(H - Math.min(hh, H - 16) - 8, w.pos[1]));   // keep the whole window on screen
    el.style.left = x + 'px'; el.style.top = y + 'px';
  },
  raise(w) { w.el.style.zIndex = ++this.z; },
  openWin(id) {
    if (document.body.classList.contains('mini')) this.setMini(false);
    const w = this.getWin(id);
    if (this.narrow()) for (const o of Object.values(this.wins)) if (o !== w) o.el.hidden = true;
    this.render(id); w.el.hidden = false; this.raise(w); this.placeWin(w); this.syncDock();
    if (this.WIN[id].modal) document.getElementById('scrim').hidden = false;
  },
  closeWin(id) { const w = this.wins[id]; if (!w) return; w.el.hidden = true; this.syncDock(); if (this.WIN[id].modal) document.getElementById('scrim').hidden = !Object.values(this.wins).some(o => !o.el.hidden && o.conf.modal); },
  toggleWin(id) { const w = this.wins[id]; if (w && !w.el.hidden) this.closeWin(id); else this.openWin(id); },
  refresh(id) { if (id === 'music' && this._musicResize) { this._musicRefreshPending = true; return; } const w = this.wins[id]; if (w && !w.el.hidden) this.render(id); if (id === 'memo') this.renderPins(); },
  refreshAll() { for (const id in this.wins) this.refresh(id); this.hud(true); this.renderPins(); },
  render(id) {
    const w = this.getWin(id), b = w.body;
    const keepScroll = [...b.querySelectorAll('.scroll')].map(e => e.scrollTop);
    const active = document.activeElement && b.contains(document.activeElement) ? document.activeElement.id : null;
    b.replaceChildren(...[].concat(this['w_' + id]() || []).filter(Boolean));
    if (id === 'music') requestAnimationFrame(() => this.layoutMusicPanels());
    b.querySelectorAll('.scroll').forEach((e, i) => { if (keepScroll[i]) e.scrollTop = keepScroll[i]; });
    if (!w.el.hidden && !this.narrow()) this.placeWin(w);
    if (active) { const el = document.getElementById(active); if (el) { el.focus(); if (el.setSelectionRange && el.value != null) try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) { } } }
  },
  // ---------- timer window ----------
  w_timer() {
    const S = Game.S, t = S.timer;
    const tabs = h('div', { class: 'tabs' }, ...[['focus', '專注'], ['short', '短休息'], ['long', '長休息']].map(([m, l]) => h('button', { class: 'tab' + (t.mode === m ? ' on' : ''), onclick: () => Game.setMode(m) }, l)));
    this.el.tBig = h('div', { class: 'big-time num', 'aria-live': 'off' });
    this.el.tBar = h('div', { class: 'seg' }); for (let i = 0; i < 20; i++) this.el.tBar.append(h('i'));
    const dots = h('div', { class: 'rounds', title: '每 4 輪專注後是長休息' }, ...[0, 1, 2, 3].map(i => h('span', { class: 'rd' + (i < t.round % 4 ? ' on' : '') }, ico('i_tomato', 20))));
    const open = S.todos.filter(x => !x.done && !x.ex);
    const sel = h('select', { id: 'focus-task', 'aria-label': '這輪要做的事', onchange: e => { S.focusTask = e.target.value; Game.save(); } }, h('option', { value: '' }, open.length ? '選一件要專心的事（可不選）' : '待辦清單是空的'), ...open.map(x => h('option', { value: String(x.id), selected: String(x.id) === String(S.focusTask) }, x.t)));
    const ctl = h('div', { class: 'row ctl' },
      h('button', { class: 'chip big primary', onclick: () => t.running ? Game.pause() : Game.start() }, ico(t.running ? 'i_pause' : 'i_play', 24), t.running ? '暫停' : (t.remain < Game.modeLen(t.mode) ? '繼續' : '開始')),
      h('button', { class: 'chip', onclick: () => Game.resetTimer(), 'aria-label': '重設' }, ico('i_reset', 22), '重設'),
      h('button', { class: 'chip', onclick: () => Game.skip() }, '跳過'));
    const note = h('p', { class: 'hint' }, t.mode === 'focus' ? `專注時每分鐘 +2 金幣、+4 經驗，完成一輪再加 ${Math.round(t.focus * 0.4)} 金幣。` : '休息時間，伸伸懶腰、摸摸寵物吧。');
    this.tickTimerWin(); return [tabs, this.el.tBig, this.el.tBar, dots, h('label', { class: 'field' }, h('span', { text: '這一輪' }), sel), ctl, note];
  },
  tickTimerWin() {
    const t = Game.S.timer, big = this.el.tBig, bar = this.el.tBar; if (!big) return;
    const rem = t.running ? (t.endsAt - Date.now()) / 1000 : t.remain; big.textContent = fmt(rem);
    big.classList.toggle('brk', t.mode !== 'focus');
    const p = 1 - rem / Game.modeLen(t.mode); const n = Math.round(p * 20); [...bar.children].forEach((c, i) => c.classList.toggle('on', i < n)); bar.classList.toggle('brk', t.mode !== 'focus');
  },
  // ---------- todo window ----------
  w_todo() {
    const S = Game.S;
    const inp = h('input', { id: 'todo-in', type: 'text', maxlength: '140', placeholder: '新增一件事，按 Enter', autocomplete: 'off', onkeydown: e => { if (e.key === 'Enter' && !e.isComposing) { Game.addTodo(e.target.value); e.target.value = ''; } } });
    const add = h('button', { class: 'chip', 'aria-label': '新增', onclick: () => { Game.addTodo(inp.value); inp.value = ''; inp.focus(); } }, ico('i_plus', 20));
    const open = S.todos.filter(x => !x.done), done = S.todos.filter(x => x.done);
    const row = (x) => h('li', { class: 'todo' + (x.done ? ' done' : '') },
      h('button', { class: 'cb' + (x.done ? ' on' : ''), role: 'checkbox', 'aria-checked': x.done ? 'true' : 'false', 'aria-label': (x.done ? '取消完成：' : '完成：') + x.t, title: x.done ? '取消完成' : '打勾完成', onclick: () => Game.toggleTodo(x.id) }, ico('i_check', 18)),
      h('span', { class: 'tt', text: x.t, title: x.done ? '點一下取消完成' : '點一下完成', onclick: () => Game.toggleTodo(x.id) }), x.ex ? h('em', { class: 'ex', text: '範例' }) : null,
      h('button', { class: 'del', 'aria-label': '刪除', onclick: () => Game.delTodo(x.id) }, ico('i_trash', 18)));
    const today = gameDate().toDateString(); const left = 15 - (S.stats.todoDay === today ? S.stats.todoToday : 0);
    return [h('div', { class: 'row' }, h('div', { class: 'inset grow' }, inp), add),
      h('div', { class: 'scroll' }, h('ul', { class: 'todos' }, ...open.map(row)), done.length ? h('div', { class: 'sub', text: `已完成 ${done.length}` }) : null, h('ul', { class: 'todos' }, ...done.map(row))),
      h('p', { class: 'hint' }, `點左邊方框或文字就能打勾完成。完成一件 +3 金幣、+5 經驗（今天還能領 ${Math.max(0, left)} 次）`)];
  },
  // ---------- memo window ----------
  w_memo() {
    const S = Game.S;
    const card = (m) => h('div', { class: 'memo c-' + m.color },
      h('textarea', { id: 'memo-' + m.id, maxlength: '2000', 'aria-label': '便條內容', placeholder: '寫點什麼…', oninput: e => { m.text = e.target.value; this.syncPin(m); this._ms = clearTimeout(this._ms) || setTimeout(() => Game.save(), 600); } }, m.text),
      h('div', { class: 'memo-f' },
        ...['butter', 'rose', 'mint', 'sky', 'lilac'].map(c => h('button', { class: 'dot c-' + c + (m.color === c ? ' on' : ''), 'aria-label': '顏色', onclick: () => { m.color = c; Game.save(); this.refresh('memo'); } })),
        this.narrow() ? null : h('button', { class: 'chip sm' + (m.pin ? ' on' : ''), onclick: () => { m.pin = !m.pin; Game.save(); this.refresh('memo'); } }, m.pin ? '取消釘選' : '釘在桌面'),
        h('button', { class: 'del', 'aria-label': '刪除便條', onclick: () => { S.memos = S.memos.filter(x => x !== m); Game.save(); this.refresh('memo'); } }, ico('i_trash', 18))));
    return [h('div', { class: 'row' }, h('button', { class: 'chip', onclick: () => Game.addMemo() }, ico('i_plus', 20), '新便條'), h('span', { class: 'hint', text: this.narrow() ? '' : '釘在桌面的便條可以拖著走' })),
      h('div', { class: 'scroll memos' }, ...S.memos.map(card))];
  },
  renderPins() {
    const layer = document.getElementById('pins'); if (!layer || !Game.S) return;
    const want = this.narrow() ? [] : Game.S.memos.filter(m => m.pin);
    const have = new Map([...layer.children].map(el => [el.dataset.id, el]));
    for (const m of want) {
      let el = have.get(String(m.id));
      if (!el) {
        const ta = h('textarea', { maxlength: '2000', 'aria-label': '便條', oninput: e => { m.text = e.target.value; clearTimeout(this._ms); this._ms = setTimeout(() => Game.save(), 600); } }, m.text);
        const grip = h('div', { class: 'pin-grip' }, h('span', { text: '便條' }), h('button', { class: 'del', 'aria-label': '取消釘選', onclick: () => { m.pin = false; Game.save(); this.renderPins(); this.refresh('memo'); } }, ico('i_close', 16)));
        el = h('div', { class: 'pin c-' + m.color, 'data-id': String(m.id) }, grip, ta); layer.append(el);
        grip.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; const r = el.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top; grip.setPointerCapture(e.pointerId);
          const mv = ev => { m.x = Math.max(0, Math.min(window.innerWidth - 180, ev.clientX - ox)); m.y = Math.max(0, Math.min(window.innerHeight - 60, ev.clientY - oy)); el.style.left = m.x + 'px'; el.style.top = m.y + 'px'; };
          const up = () => { grip.removeEventListener('pointermove', mv); grip.removeEventListener('pointerup', up); Game.save(); }; grip.addEventListener('pointermove', mv); grip.addEventListener('pointerup', up); });
      }
      el.className = 'pin c-' + m.color; el.style.left = Math.min(window.innerWidth - 190, m.x) + 'px'; el.style.top = Math.min(window.innerHeight - 80, m.y) + 'px'; have.delete(String(m.id));
    }
    for (const el of have.values()) el.remove();
  },
  syncPin(m) { const el = document.querySelector(`#pins [data-id="${m.id}"] textarea`); if (el && el.value !== m.text) el.value = m.text; },
  // ---------- shop ----------
  shopTab: 'furniture',
  w_shop() {
    const S = Game.S, tab = this.shopTab;
    const tabs = h('div', { class: 'tabs wrap' }, ...CATS.map(c => h('button', { class: 'tab' + (tab === c.id ? ' on' : ''), onclick: () => { this.shopTab = c.id; this.refresh('shop'); } }, c.n)));
    const cards = [];
    const owned = (id) => (S.inv[id] || 0) + S.items.filter(i => i.k === id).length;
    const card = (pv, name, d, has, onBuy, extra, cat) => {
      const locked = S.lvl < d.lvl;
      return h('div', { class: 'card' + (locked ? ' locked' : '') }, h('div', { class: 'pvbox' }, pv), h('div', { class: 'cn', text: name }),
        h('div', { class: 'cfoot' }, locked ? h('span', { class: 'lock', text: `Lv ${d.lvl} 解鎖` }) : h('span', { class: 'price' }, ico('i_coin', 18), this.priceTag(d.price, cat)),
          has === true ? h('span', { class: 'own', text: '已擁有' }) : h('button', { class: 'chip sm', disabled: locked || S.coins < Rewards.price(d.price, cat), onclick: onBuy }, extra || '購買')),
        typeof has === 'number' && has > 0 ? h('span', { class: 'badge', text: '×' + has }) : null);
    };
    if (tab === 'theme') {
      for (const id in THEMES) {
        const th = THEMES[id], own = S.themes.includes(id), locked = S.lvl < th.lvl;
        cards.push(h('div', { class: 'card theme' + (locked ? ' locked' : '') }, h('div', { class: 'tpv' }, themePreview(id)),
          h('div', { class: 'tinfo' }, h('div', { class: 'tn', text: th.n }), h('p', { class: 'hint', text: th.desc }),
            th.grants.length ? h('p', { class: 'tinc', text: '含 ' + [...new Set(th.grants)].map(g => ITEMS[g].n).join('、') }) : null,
            h('div', { class: 'cfoot' }, own ? h('span', { class: 'own', text: '已擁有' }) : locked ? h('span', { class: 'lock', text: `Lv ${th.lvl} 解鎖` }) : h('span', { class: 'price' }, ico('i_coin', 18), h('b', { class: 'num', text: String(th.price) })),
              own ? h('button', { class: 'chip sm', onclick: () => this.themeConfirm(id) }, ico('i_theme', 18), '套用') : h('button', { class: 'chip sm primary', disabled: locked || S.coins < th.price, onclick: () => Game.buyTheme(id) }, '購買')))));
      }
      return [h('div', { class: 'row between' }, tabs, h('span', { class: 'wallet' }, ico('i_coin', 20), h('b', { class: 'num', text: String(S.coins) }))), h('div', { class: 'scroll grid themes' }, ...cards)];
    }
    if (tab === 'supply') {
      for (const id in SUPPLIES) {
        const d = SUPPLIES[id], have = Life.L.bag[id] || 0;
        cards.push(h('div', { class: 'card' }, h('div', { class: 'pvbox' }, sprPreview(SPR.get(d.spr), 60, 5, 80)), h('div', { class: 'cn', text: d.n }), h('p', { class: 'cdesc', text: d.desc }),
          h('div', { class: 'cfoot' }, h('span', { class: 'price' }, ico('i_coin', 18), h('b', { class: 'num', text: String(d.price) })), h('button', { class: 'chip sm', disabled: S.coins < d.price, onclick: () => Life.buySupply(id, 1) }, '購買')),
          have ? h('span', { class: 'badge', text: '×' + have }) : null));
      }
      return [h('div', { class: 'row between' }, tabs, h('span', { class: 'wallet' }, ico('i_coin', 20), h('b', { class: 'num', text: String(S.coins) }))), h('p', { class: 'hint', text: '道具也可以在「學習」複習 5 個單字免費換到。' }), h('div', { class: 'scroll grid' }, ...cards)];
    }
    if (tab === 'view') for (const id in VIEWS) { const d = VIEWS[id]; cards.push(card(viewSwatch(id), d.n, d, S.ownViews.includes(id), () => Game.buy('view', id), null, 'view')); }
    else if (tab === 'wallpaper' || tab === 'floor') {
      const cat = tab === 'wallpaper' ? WALLPAPERS : FLOORS, own = tab === 'wallpaper' ? S.ownWP : S.ownFL;
      const list = this.filterList('shop:' + tab, Object.keys(cat).map(id => ({ id, d: cat[id], own: own.includes(id) })));
      for (const e of list.page) cards.push(card(swatch(tab === 'wallpaper' ? WALL[e.id] : FLOOR[e.id], tab === 'wallpaper' ? 'wp' : 'fl'), e.d.n, e.d, e.own, () => Game.buy(tab === 'wallpaper' ? 'wp' : 'fl', e.id), null, tab === 'wallpaper' ? 'wp' : 'fl'));
      return [h('div', { class: 'row between' }, tabs, h('span', { class: 'wallet' }, ico('i_coin', 20), h('b', { class: 'num', text: String(S.coins) }))), this.couponBar(), list.bar, h('div', { class: 'scroll grid' }, ...cards), list.nav];
    }
    else if (tab === 'pet') {
      const n = Pets.list().length, full = n >= PET_MAX;
      for (const id in PETS) { const d = PETS[id], [k, c] = id.split(':'), cnt = Pets.list().filter(p => p.sp === id).length; const el = card(sprPreview(petCanvas(k, c, 'sit', 0, false), 60, 3), d.n, Object.assign({}, d, { price: Pets.adoptPrice(id) }), full ? true : cnt, () => Game.buy('pet', id), '領養'); if (full) el.querySelector('.own').textContent = '已滿'; cards.push(el); }
      return [h('div', { class: 'row between' }, tabs, h('span', { class: 'wallet' }, ico('i_coin', 20), h('b', { class: 'num', text: String(S.coins) }))), h('p', { class: 'hint', text: `已經養了 ${n}/${PET_MAX} 隻，房間裡最多同時 ${PET_ROOM_MAX} 隻。每多養一隻，領養費會多一點。每隻都有自己的個性和喜好。` }), h('div', { class: 'scroll grid' }, ...cards)];
    }
    else {
      const all = Object.keys(ITEMS).filter(id => { const d = ITEMS[id]; return d.cat === tab && !d.giftOnly && !d.merchant && !d.special; }).map(id => ({ id, d: ITEMS[id] }));
      const list = this.filterList('shop:' + tab, all, this.shopFocus);
      for (const e of list.page) { const d = e.d, el = card(sprPreview(SPR.get(d.spr, d.map, false, d.id), 100, 3, 80), d.n, d, owned(e.id), () => Game.buy('item', e.id), null, 'item'); if (d.fun) el.classList.add('fun'); if (this.shopFocus === e.id) { el.classList.add('focus'); setTimeout(() => el.scrollIntoView({ block: 'center' }), 50); } cards.push(el); }
      this.shopFocus = null;
      return [h('div', { class: 'row between' }, tabs, h('span', { class: 'wallet' }, ico('i_coin', 20), h('b', { class: 'num', text: String(S.coins) }))), this.couponBar(), list.bar, h('div', { class: 'scroll grid' }, ...cards), list.nav];
    }
    this.shopFocus = null;
    return [h('div', { class: 'row between' }, tabs, h('span', { class: 'wallet' }, ico('i_coin', 20), h('b', { class: 'num', text: String(S.coins) }))), this.couponBar(), h('div', { class: 'scroll grid' }, ...cards)];
  },
  // ---------- filter / search / pages for long lists ----------
  flt: {},
  filterList(key, entries, focusId, compact) {
    const F = this.flt[key] || (this.flt[key] = { fam: '', q: '', page: 0, sort: 'lvl', avail: false }), S = Game.S;
    const fams = [...new Set(entries.map(e => e.d.fam).filter(Boolean))];
    let list = entries.filter(e => (!F.fam || e.d.fam === F.fam) && (!F.q || e.d.n.includes(F.q.trim())) && (!F.avail || ((e.d.lvl || 1) <= S.lvl && (e.d.price || 0) <= S.coins)));
    const sorts = { lvl: (a, b) => (a.d.lvl || 1) - (b.d.lvl || 1) || (a.d.price || 0) - (b.d.price || 0), price: (a, b) => (a.d.price || 0) - (b.d.price || 0), name: (a, b) => a.d.n.localeCompare(b.d.n, 'zh-Hant') };
    if (!compact) list.sort(sorts[F.sort] || sorts.lvl);
    const PER = 30, pages = Math.max(1, Math.ceil(list.length / PER));
    if (focusId) { F.fam = ''; F.q = ''; const i = list.findIndex(e => e.id === focusId); if (i >= 0) F.page = Math.floor(i / PER); }
    F.page = Math.min(F.page, pages - 1);
    const set = (k, v) => { F[k] = v; if (k !== 'page') F.page = 0; this.refresh(key.startsWith('shop') ? 'shop' : 'storage'); };
    const bar = h('div', { class: 'fbar' },
      fams.length > 1 ? h('div', { class: 'tabs wrap ffams' }, h('button', { class: 'tab sm' + (!F.fam ? ' on' : ''), onclick: () => set('fam', '') }, '全部'), ...fams.map(f => h('button', { class: 'tab sm' + (F.fam === f ? ' on' : ''), onclick: () => set('fam', f) }, FAM_NAMES[f] || f))) : null,
      h('div', { class: 'row fctl' }, h('div', { class: 'inset grow' }, h('input', { id: 'q-' + key, type: 'search', value: F.q, placeholder: `搜尋（共 ${entries.length} 件）`, oninput: e => { F.q = e.target.value; F.page = 0; this.refresh(key.startsWith('shop') ? 'shop' : 'storage'); } })),
        compact ? null : h('select', { 'aria-label': '排序', onchange: e => set('sort', e.target.value) }, ...[['lvl', '依等級'], ['price', '依價格'], ['name', '依名稱']].map(([v, l]) => h('option', { value: v, selected: F.sort === v }, l))),
        compact ? null : h('button', { class: 'chip sm' + (F.avail ? ' on' : ''), onclick: () => set('avail', !F.avail) }, '買得起')));
    const nav = pages > 1 ? h('div', { class: 'row center pnav' }, h('button', { class: 'chip sm', disabled: F.page <= 0, onclick: () => set('page', F.page - 1) }, '上一頁'), h('span', { class: 'num hint', text: `${F.page + 1} / ${pages}（${list.length} 件）` }), h('button', { class: 'chip sm', disabled: F.page >= pages - 1, onclick: () => set('page', F.page + 1) }, '下一頁')) : h('p', { class: 'hint center', text: `${list.length} 件` });
    return { page: list.slice(F.page * PER, F.page * PER + PER), bar, nav, total: list.length };
  },
  // ---------- storage ----------
  stoTab: 'items',
  w_storage() {
    const S = Game.S, tab = this.stoTab;
    const tabs = h('div', { class: 'tabs' }, ...[['theme', '主題'], ['items', '物品'], ['bag', '道具'], ['wp', '壁紙'], ['fl', '地板'], ['view', '窗景']].map(([k, l]) => h('button', { class: 'tab' + (tab === k ? ' on' : ''), onclick: () => { this.stoTab = k; this.refresh('storage'); } }, l)));
    const cards = [];
    if (tab === 'theme') {
      for (const id of S.themes) { const th = THEMES[id]; cards.push(h('div', { class: 'card theme' }, h('div', { class: 'tpv' }, themePreview(id)), h('div', { class: 'tinfo' }, h('div', { class: 'tn', text: th.n }), h('p', { class: 'hint', text: th.desc }), h('div', { class: 'cfoot' }, h('span'), h('button', { class: 'chip sm primary', onclick: () => this.themeConfirm(id) }, ico('i_theme', 18), '套用'))))); }
      cards.push(h('div', { class: 'empty' }, h('p', { text: '更多主題房間在商店的「主題房間」。' }), h('button', { class: 'chip', onclick: () => { this.shopTab = 'theme'; this.openWin('shop'); } }, ico('i_shop', 20), '看看主題')));
      return [h('div', { class: 'row between' }, tabs), h('div', { class: 'scroll grid themes' }, ...cards)];
    }
    if (tab === 'bag') {
      const ids = Object.keys(SUPPLIES).filter(k => (Life.L.bag[k] || 0) > 0);
      for (const id of ids) { const d = SUPPLIES[id]; cards.push(h('div', { class: 'card' }, h('div', { class: 'pvbox' }, sprPreview(SPR.get(d.spr), 60, 5, 80)), h('div', { class: 'cn', text: d.n }), h('p', { class: 'cdesc', text: d.desc }), h('div', { class: 'cfoot' }, h('span', { class: 'own', text: '×' + Life.L.bag[id] }), h('button', { class: 'chip sm', onclick: () => Life.use(id) }, '使用')))); }
      if (!ids.length) cards.push(h('div', { class: 'empty' }, ico('i_bag', 48), h('p', { text: '道具用完了。到「學習」複習單字就能換，商店也有賣。' }), h('button', { class: 'chip', onclick: () => this.openWin('learn') }, ico('i_learn', 20), '去學習')));
      return [h('div', { class: 'row between' }, tabs), h('div', { class: 'scroll grid' }, ...cards)];
    }
    if (tab === 'view') {
      for (const id of S.ownViews) cards.push(h('div', { class: 'card' + (S.view === id ? ' cur' : '') }, h('div', { class: 'pvbox' }, viewSwatch(id)), h('div', { class: 'cn', text: VIEWS[id].n }), h('div', { class: 'cfoot' }, S.view === id ? h('span', { class: 'own', text: '使用中' }) : h('button', { class: 'chip sm', onclick: () => Game.applyView(id) }, '套用'))));
    } else if (tab === 'items') {
      const idsAll = Object.keys(S.inv).filter(k => S.inv[k] > 0 && ITEMS[k]);
      const list = this.filterList('sto:items', idsAll.map(id => ({ id, d: ITEMS[id] })), null, true); const ids = list.page.map(e => e.id);
      if (idsAll.length) cards.push(list.bar);
      for (const id of ids) { const d = ITEMS[id]; cards.push(h('div', { class: 'card' }, h('div', { class: 'pvbox' }, sprPreview(SPR.get(d.spr, d.map, false, d.id), 100, 3, 80)), h('div', { class: 'cn', text: d.n }), h('div', { class: 'cfoot' }, h('span', { class: 'own', text: '×' + S.inv[id] }), h('button', { class: 'chip sm', onclick: () => Game.place(id) }, '擺放')))); }
      if (!idsAll.length) cards.push(h('div', { class: 'empty' }, ico('i_box', 48), h('p', { text: '收納箱是空的。到商店買新家具，或在佈置模式把東西收起來。' }), h('button', { class: 'chip', onclick: () => this.openWin('shop') }, ico('i_shop', 20), '去商店')));
      if (idsAll.length) cards.push(list.nav);
    } else {
      const own = tab === 'wp' ? S.ownWP : S.ownFL, cat = tab === 'wp' ? WALLPAPERS : FLOORS, cur = tab === 'wp' ? S.wp : S.fl;
      const pl = this.filterList('sto:' + tab, own.filter(id => cat[id]).map(id => ({ id, d: cat[id] })), cur, true); if (own.length > 12) cards.push(pl.bar);
      for (const { id } of pl.page) cards.push(h('div', { class: 'card' + (cur === id ? ' cur' : '') }, h('div', { class: 'pvbox' }, swatch(tab === 'wp' ? WALL[id] : FLOOR[id], tab)), h('div', { class: 'cn', text: cat[id].n }), h('div', { class: 'cfoot' }, cur === id ? h('span', { class: 'own', text: '使用中' }) : h('button', { class: 'chip sm', onclick: () => tab === 'wp' ? Game.applyWP(id) : Game.applyFL(id) }, '套用'))));
      if (own.length > 12) cards.push(pl.nav);
    }
    return [h('div', { class: 'row between' }, tabs, h('button', { class: 'chip', onclick: () => { this.closeWin('storage'); this.setEdit(true); } }, ico('i_brush', 20), '佈置房間')), h('div', { class: 'scroll grid' }, ...cards)];
  },
  // ---------- avatar ----------
  // ---------- cowork ----------
  w_cowork() {
    const st = Cowork.status;
    if (st !== 'on') return [h('div', { class: 'empty' }, ico('i_people', 48), h('p', { text: st === 'loading' ? '連線中…' : '一起專注需要在 Claude 裡登入並打開這個頁面。和同一個組織的朋友同時開著時，大家的角色會走進你的房間，顯示正在專注還是休息。' }))];
    const list = h('ul', { class: 'peers' });
    this.el.peerList = list; this.tickCowork();
    const inp = h('input', { id: 'say-in', type: 'text', maxlength: '60', placeholder: '說點什麼，會出現在你的角色頭上', onkeydown: e => { if (e.key === 'Enter' && !e.isComposing) { Cowork.say(e.target.value); e.target.value = ''; } } });
    return [h('p', { class: 'hint', text: Cowork.connected ? '同時開著這個頁面的人會出現在你的房間裡。' : '正在連線…' }),
      h('div', { class: 'sub', text: `房間裡的人（${Cowork.peers.length + 1}）` }), list,
      h('div', { class: 'row' }, h('div', { class: 'inset grow' }, inp), h('button', { class: 'chip', onclick: () => { Cowork.say(inp.value); inp.value = ''; } }, ico('i_chat', 20))),
      h('div', { class: 'row wrap' }, ...['加油！', '我先去專注了', '休息一下～', '我回來了', '辛苦了'].map(t => h('button', { class: 'chip sm', onclick: () => Cowork.say(t) }, t)))];
  },
  tickCowork() {
    const list = this.el.peerList; if (!list) return; const S = Game.S, t = S.timer;
    const row = (name, st, end, me) => h('li', { class: st === 'focus' ? 'focus' : '' }, ico(st === 'focus' ? 'i_tomato' : st === 'break' ? 'i_heart' : 'i_moon', 20), h('span', { class: 'pn', text: name + (me ? '（你）' : '') }), h('span', { class: 'ps', text: st === 'focus' ? '專注中 ' + fmt((end - Date.now()) / 1000) : st === 'break' ? '休息中' : '閒晃中' }));
    list.replaceChildren(row(S.avatar.name || '我', t.running ? (t.mode === 'focus' ? 'focus' : 'break') : 'idle', t.endsAt, true),
      ...Cowork.peers.map(p => { const pr = p.presence || {}; return row(typeof pr.nick === 'string' && pr.nick ? pr.nick.slice(0, 16) : '訪客', pr.st, typeof pr.end === 'number' ? pr.end : 0, false); }));
  },
  // ---------- settings ----------
  resetArm: false,
  w_settings() {
    const S = Game.S, st = S.settings, t = S.timer;
    const seg = (key, opts) => h('div', { class: 'tabs' }, ...opts.map(([v, l, ic]) => h('button', { class: 'tab' + (st[key] === v ? ' on' : ''), onclick: () => { st[key] = v; Room.computeEnv(st); Game.save(); this.refresh('settings'); } }, ic ? ico(ic, 18) : null, l)));
    const stepper = (label, key, min, max) => h('div', { class: 'stepper' }, h('span', { text: label }), h('button', { class: 'chip sm', 'aria-label': '減少', onclick: () => { t[key] = Math.max(min, t[key] - (key === 'focus' ? 5 : 1)); if (!t.running) t.remain = Game.modeLen(t.mode); Game.save(); this.refresh('settings'); this.refresh('timer'); } }, '−'), h('b', { class: 'num', text: t[key] + ' 分' }), h('button', { class: 'chip sm', 'aria-label': '增加', onclick: () => { t[key] = Math.min(max, t[key] + (key === 'focus' ? 5 : 1)); if (!t.running) t.remain = Game.modeLen(t.mode); Game.save(); this.refresh('settings'); this.refresh('timer'); } }, '+'));
    const stats = h('dl', { class: 'stats' }, h('dt', { text: '等級' }), h('dd', { class: 'num', text: `Lv ${S.lvl}（${S.xp}/${Game.need(S.lvl)}）` }), h('dt', { text: '累積專注' }), h('dd', { class: 'num', text: `${Math.floor(S.stats.focusMin / 60)} 小時 ${S.stats.focusMin % 60} 分` }), h('dt', { text: '完成輪數' }), h('dd', { class: 'num', text: String(S.stats.sessions) }), h('dt', { text: '完成待辦' }), h('dd', { class: 'num', text: String(S.stats.todos) }));
    return [h('div', { class: 'sub', text: '窗外時間' }), seg('timeMode', [['auto', '跟著現在'], ['day', '白天', 'i_sun'], ['dusk', '黃昏'], ['night', '夜晚', 'i_moon']]),
      h('div', { class: 'row' }, h('button', { class: 'chip' + (st.rain ? ' on' : ''), 'aria-pressed': st.rain ? 'true' : 'false', onclick: () => { st.rain = !st.rain; Room.computeEnv(st); Game.save(); this.refresh('settings'); } }, ico('i_rain', 20), st.rain ? '下雨中' : '下點雨')),
      h('div', { class: 'sub', text: '番茄鐘長度' }), stepper('專注', 'focus', 10, 60), stepper('短休息', 'short', 1, 15), stepper('長休息', 'long', 5, 30),
      h('div', { class: 'row' }, h('button', { class: 'chip' + (st.autoBreak ? ' on' : ''), 'aria-pressed': st.autoBreak ? 'true' : 'false', onclick: () => { st.autoBreak = !st.autoBreak; Game.save(); this.refresh('settings'); } }, st.autoBreak ? '專注結束自動開始休息：開' : '專注結束自動開始休息：關')),
      h('div', { class: 'row' }, h('button', { class: 'chip' + (st.chime !== false ? ' on' : ''), 'aria-pressed': st.chime !== false ? 'true' : 'false', onclick: () => { st.chime = st.chime === false; Game.save(); this.refresh('settings'); } }, st.chime !== false ? '專注開始和結束的提示音：開' : '專注開始和結束的提示音：關')),
      h('div', { class: 'sub', text: '紀錄' }), stats,
      h('div', { class: 'row' }, this.resetArm ? h('button', { class: 'chip danger', onclick: () => { this.resetArm = false; try { localStorage.removeItem(SAVE_KEY); } catch (e) { } Game.replaceState(Game.newState()); Game.S.seenIntro = true; this.toast('已重新開始', 'i_sparkle'); } }, '確定清除所有進度') : h('button', { class: 'chip', onclick: () => { this.resetArm = true; this.refresh('settings'); setTimeout(() => { this.resetArm = false; this.refresh('settings'); }, 5000); } }, '重新開始…')),
      h('p', { class: 'hint', text: '房間裡的每一件家具、角色和圖示都是用程式一格一格畫出來的像素圖。' })];
  },
  // ---------- music ----------
  w_music() {
    const M = Game.S.music, cur = Music.cur, playing = Music.playing;
    const src = cur ? (cur.type === 'yt' ? (cur.list ? 'YouTube 播放清單' : 'YouTube') : cur.type === 'drive' ? '內建音樂 · ' + cur.album : cur.type === 'url' ? '內建曲目' + (cur.album ? ' · ' + cur.album : '') : '本機檔案') : '聽內建音樂、加入本機音樂檔，或貼上 YouTube 連結';
    const cover = cur && cur.type !== 'yt' ? Covers.mem[Covers.key(cur)] : null;
    const dl = Music.dl, dlTxt = dl && cur && dl.id === cur.id ? `下載到這台裝置 ${dl.total ? Math.round(dl.got / dl.total * 100) + '%' : Math.round(dl.got / 1048576) + ' MB'}（之後就不用再下載）` : cur && Music.isLib(cur) && MusicCache.has(cur.id) ? '已存在這台裝置' : '';
    const now = h('div', { class: 'now' }, cover ? h('img', { class: 'mcover', src: cover, alt: '專輯封面' }) : h('div', { class: 'disc' + (playing ? ' spin' : '') }, ico('i_music', 36)),
      h('div', { class: 'now-t' }, h('div', { class: 'now-title', text: cur ? cur.title : '還沒有播放音樂' }), h('div', { class: 'hint', text: src }), dlTxt ? h('div', { class: 'hint', text: dlTxt }) : null));
    this.el.mProg = h('input', { type: 'range', id: 'm-prog', min: '0', max: '1000', value: '0', 'aria-label': '播放進度', oninput: e => Music.seek(e.target.value / 1000) });
    this.el.mT = h('span', { text: '0:00' }); this.el.mD = h('span', { text: '0:00' });
    const rep = M.repeat;
    const ctl = h('div', { class: 'row center mctl' },
      h('button', { class: 'chip' + (M.shuffle ? ' on' : ''), 'aria-label': '隨機播放', 'aria-pressed': M.shuffle ? 'true' : 'false', title: '隨機播放', onclick: () => Music.toggleShuffle() }, ico('i_shuffle', 22)),
      h('button', { class: 'chip', 'aria-label': '上一首', onclick: () => Music.prev() }, ico('i_prev', 22)),
      h('button', { class: 'chip big primary', 'aria-label': playing ? '暫停' : '播放', onclick: () => Music.toggle() }, ico(playing ? 'i_pause' : 'i_play', 24)),
      h('button', { class: 'chip', 'aria-label': '下一首', onclick: () => Music.next(true) }, ico('i_next', 22)),
      h('button', { class: 'chip' + (rep !== 'off' ? ' on' : ''), 'aria-label': '重複模式', title: rep === 'all' ? '重複全部' : rep === 'one' ? '單曲重複' : '不重複', onclick: () => Music.cycleRepeat() }, ico(rep === 'one' ? 'i_repeat1' : 'i_repeat', 22)));
    const vol = h('div', { class: 'row' }, ico('i_vol', 22), h('input', { type: 'range', id: 'm-vol', min: '0', max: '100', value: String(Math.round(M.vol * 100)), 'aria-label': '音量', oninput: e => Music.setVol(e.target.value / 100) }));
    const file = h('input', { type: 'file', id: 'm-file', accept: 'audio/*,.mp3,.flac,.m4a,.aac,.ogg,.opus,.wav', multiple: true, hidden: true, onchange: e => { Music.addFiles([...e.target.files]); e.target.value = ''; } });
    const yt = h('input', { id: 'm-yt', type: 'text', placeholder: '貼上 YouTube 影片或播放清單網址', autocomplete: 'off', onkeydown: e => { if (e.key === 'Enter' && !e.isComposing) { if (Music.addYT(e.target.value)) e.target.value = ''; } } });
    const list = h('ol', { class: 'mlist' }, ...M.list.map((e, i) => h('li', { class: (i === M.idx ? 'cur ' : '') + (e.missing ? 'missing' : '') },
      h('button', { class: 'mplay', onclick: () => Music.playIdx(i), title: e.title }, h('span', { class: 'mi num', text: String(i + 1) }), h('span', { class: 'mn', text: e.title }), h('em', { class: 'mb', text: e.type === 'yt' ? 'YT' : e.type === 'url' ? '內建' : e.missing ? '需重新加入' : (e.stored === false ? '本次' : '本機') })),
      h('button', { class: 'del', 'aria-label': '上移', onclick: () => Music.move(e.id, -1) }, '▲'),
      h('button', { class: 'del', 'aria-label': '從清單移除', onclick: () => Music.remove(e.id) }, ico('i_trash', 18)))));
    const ytNote = window.NOOK_ENV === 'artifact' ? h('p', { class: 'hint', text: '這個頁面不能嵌入 YouTube，播放時會提供連結到 YouTube 開啟；GitHub 版可以直接在小視窗播放。' }) : null;
    this.tickMusic();
    const tab = this.mTab || (Lib.enabled() && !M.list.length ? 'lib' : 'list');
    const tabs = h('div', { class: 'tabs' }, h('button', { class: 'tab' + (tab === 'lib' ? ' on' : ''), onclick: () => { this.mTab = 'lib'; this.refresh('music'); } }, ico('i_music', 18), '內建音樂'),
      h('button', { class: 'tab' + (tab === 'list' ? ' on' : ''), onclick: () => { this.mTab = 'list'; this.refresh('music'); } }, ico('i_folder', 18), `我的清單（${M.list.length}）`));
    vol.classList.add('mvol'); ctl.append(vol);
    const head = [now, h('div', { class: 'mprog' }, this.el.mProg, h('div', { class: 'mtimes num' }, this.el.mT, this.el.mD)), ctl, tabs];
    const auto = h('div', { class: 'row' }, h('button', { class: 'chip sm' + (Game.S.settings.autoMusic ? ' on' : ''), 'aria-pressed': Game.S.settings.autoMusic ? 'true' : 'false', onclick: () => { Game.S.settings.autoMusic = !Game.S.settings.autoMusic; Game.save(); this.refresh('music'); }, title: '開始專注時自動播放音樂' }, ico('i_tomato', 16), Game.S.settings.autoMusic ? '專注自動播放：開' : '專注自動播放：關'));
    auto.append(h('button', { class: 'chip sm' + (Game.S.settings.lyrics !== false ? ' on' : ''), 'aria-pressed': Game.S.settings.lyrics !== false ? 'true' : 'false', title: '有同名 .lrc 歌詞檔的歌，播放時在畫面上方顯示歌詞', onclick: () => { Game.S.settings.lyrics = Game.S.settings.lyrics === false; Game.save(); Lyrics.render(); this.refresh('music'); } }, Game.S.settings.lyrics !== false ? '歌詞：開' : '歌詞：關'));
    auto.classList.add('wrap', 'mfoot');
    if (tab === 'lib') return [...head, ...this.musicLib(), auto];
    return [...head,
      h('div', { class: 'row wrap' }, h('label', { class: 'chip', for: 'm-file' }, ico('i_folder', 20), '加入本機音樂'), file, h('span', { class: 'hint', text: 'MP3、FLAC、M4A、OGG、WAV，也可以直接拖進來' })),
      h('div', { class: 'row' }, h('div', { class: 'inset grow' }, yt), h('button', { class: 'chip', 'aria-label': '加入 YouTube', onclick: () => { if (Music.addYT(yt.value)) yt.value = ''; } }, ico('i_video', 20), '加入')), ytNote,
      M.list.length ? h('div', { class: 'scroll mtracks' }, list) : h('div', { class: 'empty' }, ico('i_music', 40), h('p', { text: '清單是空的。加入你自己的 lo-fi 音樂，專注時一起聽。' })), auto];
  },
  layoutMusicPanels() {
    const w = this.wins.music; if (!w || w.el.hidden) return;
    let sizes = {}; try { sizes = JSON.parse(localStorage.getItem('pocketnook.music.panels') || '{}') || {}; } catch (e) { }
    for (const [cls, label, min, fallback] of [['malbum-scroll', '專輯', 70, 0], ['mtracks', '歌曲清單', 108, 216]]) {
      const panel = w.body.querySelector('.' + cls); if (!panel || panel.dataset.sized) continue;
      panel.dataset.sized = '1'; panel.id = 'music-panel-' + cls;
      // Default to complete album cards (up to 486px), even when the whole window is shorter.
      const natural = () => cls === 'malbum-scroll' ? Math.max(min, Math.min(486, panel.firstElementChild.scrollHeight + 8)) : fallback;
      const initial = Number(sizes[cls]);
      const grip = h('div', { class: 'music-panel-grip', tabindex: '0', role: 'separator', 'aria-orientation': 'horizontal', 'aria-controls': panel.id,
        'aria-label': '調整' + label + '高度', title: '上下拖曳調整' + label + '高度；雙擊恢復預設' }, h('span', { text: label + '高度 ↕' }));
      panel.after(grip);
      const apply = value => { const height = Math.round(Math.max(min, Math.min(1200, value))); panel.style.height = height + 'px'; grip.setAttribute('aria-valuenow', String(height)); return height; };
      grip.setAttribute('aria-valuemin', String(min)); grip.setAttribute('aria-valuemax', '1200');
      apply(Number.isFinite(initial) && initial >= min ? initial : natural());
      const save = () => { try { localStorage.setItem('pocketnook.music.panels', JSON.stringify(sizes)); } catch (e) { } };
      grip.addEventListener('dblclick', () => { delete sizes[cls]; apply(natural()); save(); });
      grip.addEventListener('keydown', e => {
        if (!['ArrowUp', 'ArrowDown', 'Home'].includes(e.key)) return; e.preventDefault();
        if (e.key === 'Home') { delete sizes[cls]; apply(natural()); }
        else sizes[cls] = apply(panel.offsetHeight + (e.key === 'ArrowUp' ? -16 : 16)); save();
      });
      grip.addEventListener('pointerdown', e => {
        if (e.button !== 0) return; e.preventDefault(); e.stopPropagation();
        this._musicResize = true; grip.setPointerCapture(e.pointerId);
        const start = e.clientY, height = panel.offsetHeight;
        const move = ev => { sizes[cls] = apply(height + ev.clientY - start); };
        const end = () => {
          grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', end); grip.removeEventListener('pointercancel', end); grip.removeEventListener('lostpointercapture', end);
          this._musicResize = false; save();
          if (this._musicRefreshPending) { this._musicRefreshPending = false; this.refresh('music'); }
        };
        grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end); grip.addEventListener('lostpointercapture', end);
      });
    }
  },
  // album covers on/off, kept per device
  mCovers(v) { try { if (v != null) localStorage.setItem('pocketnook.mcovers', v ? '1' : '0'); return localStorage.getItem('pocketnook.mcovers') !== '0'; } catch (e) { return v != null ? v : true; } },
  musicLib() {
    const M = Game.S.music;
    if (!Lib.enabled()) return [h('div', { class: 'empty' }, ico('i_music', 40), h('p', { text: '內建音樂要從網站版（GitHub Pages）播放：這個預覽頁面不能連到 Google 雲端硬碟。你仍然可以在「我的清單」加入本機音樂檔。' }))];
    if (Lib.status === 'loading' || Lib.status === 'idle') return [h('p', { class: 'hint center', text: Lib.driveOn() ? '正在讀取雲端資料夾裡的歌曲…' : '正在讀取內建音樂…' })];
    const al = this.mAlbum != null ? this.mAlbum : (M.ctx === 'lib' ? M.libAlbum : '');
    const Q = Lib.queue(al), playingHere = M.ctx === 'lib' && (M.libAlbum || '') === al;
    const out = [];
    if (Lib.err) out.push(h('p', { class: 'hint warn', text: '雲端資料夾讀取失敗：' + Lib.err }));
    if (!Lib.tracks.length) {
      out.push(h('div', { class: 'empty' }, ico('i_music', 40), h('p', { text: Lib.driveOn() ? '資料夾裡沒有找到音樂檔（MP3、FLAC、M4A、OGG、WAV）。' : '還沒有內建音樂。網站管理者把音樂檔放進 music/ 資料夾（子資料夾就是分類），執行 node tools/make-playlist.mjs 產生清單後推上 GitHub 就會出現（說明見 music/README.md）。' })));
      if (Lib.driveOn()) out.push(h('div', { class: 'row center' }, h('button', { class: 'chip sm', onclick: () => Music.loadLib(true) }, ico('i_reset', 16), '重新讀取')));
      return out;
    }
    Covers.wantAlbums();
    const card = (name, label, count, t) => {
      const c = t ? Covers.mem[Covers.key(t)] : null, all = !t ? Lib.albums.map(a => Covers.mem[Covers.key(Lib.queue(a.n)[0])]).filter(Boolean).slice(0, 4) : [];
      const art = c ? h('img', { src: c, alt: '' }) : all.length ? h('div', { class: 'mal-mosaic n' + all.length }, ...all.map(u => h('img', { src: u, alt: '' }))) : h('div', { class: 'mal-ph' }, ico('i_music', 36));
      return h('button', { class: 'malbum' + (al === name ? ' on' : ''), title: name || '全部', onclick: () => { this.mAlbum = name; this.refresh('music'); } },
        art, h('b', { text: label }), h('span', { class: 'hint', text: `${count} 首` })); };
    const showCov = this.mCovers();
    out.push(h('div', { class: 'row between' }, h('span', { class: 'sub', text: `專輯（${Lib.albums.length}）` }),
      h('button', { class: 'chip sm' + (showCov ? ' on' : ''), 'aria-pressed': showCov ? 'true' : 'false', onclick: () => { this.mCovers(!showCov); this.refresh('music'); } }, showCov ? '封面：開' : '封面：關')));
    if (showCov) out.push(h('div', { class: 'scroll malbum-scroll' }, h('div', { class: 'malbums' }, card('', '全部', Lib.tracks.length, null), ...Lib.albums.map(a => card(a.n, a.n.split(' / ').pop(), a.c, Lib.queue(a.n)[0])))));
    else out.push(h('div', { class: 'scroll mlib-al-scroll' }, h('div', { class: 'tabs wrap mlib-al' }, h('button', { class: 'tab sm' + (!al ? ' on' : ''), onclick: () => { this.mAlbum = ''; this.refresh('music'); } }, `全部 ${Lib.tracks.length}`),
      ...Lib.albums.map(a => h('button', { class: 'tab sm' + (al === a.n ? ' on' : ''), title: a.n, onclick: () => { this.mAlbum = a.n; this.refresh('music'); } }, `${a.n.split(' / ').pop()} ${a.c}`)))));
    out.push(h('div', { class: 'row' }, h('button', { class: 'chip primary sm', onclick: () => Music.playLib(M.shuffle ? Math.floor(Math.random() * Q.length) : 0, al) }, ico('i_play', 16), al ? `播放「${al.split(' / ').pop()}」` : '全部播放'),
      h('span', { class: 'hint grow', text: Lib.driveOn() ? `來自雲端資料夾「${Lib.root || '…'}」` : '網站內建' }),
      Lib.driveOn() ? h('button', { class: 'chip sm', 'aria-label': '重新讀取資料夾', title: '重新讀取資料夾', onclick: () => Music.loadLib(true) }, ico('i_reset', 16)) : null));
    const curI = playingHere ? M.lidx : -1, dl = Music.dl;
    out.push(h('div', { class: 'scroll mtracks' }, h('ol', { class: 'mlist' }, ...Q.map((e, i) => h('li', { class: (i === curI ? 'cur ' : '') + (e.missing ? 'missing' : '') },
      h('button', { class: 'mplay', onclick: () => Music.playLib(i, al), title: e.title }, h('span', { class: 'mi num', text: String(i + 1) }), h('span', { class: 'mn', text: e.title }),
        e.lrc ? h('em', { class: 'mb', title: '有歌詞', text: '詞' }) : null,
        dl && dl.id === e.id ? h('em', { class: 'mb', text: dl.total ? Math.round(dl.got / dl.total * 100) + '%' : '下載中' }) : MusicCache.has(e.id) ? h('em', { class: 'mb ok ic', title: '已下載到這台裝置', 'aria-label': '已下載' }, ico('i_check', 14)) : null,
        al ? null : h('em', { class: 'mb al', title: e.album, text: e.album.split(' / ').pop() })))))));
    const used = MusicCache.total, lim = MusicCache.limitMB;
    const sz = (v) => v < 1073741824 ? Math.round(v / 1048576) + ' MB' : (v / 1073741824).toFixed(2) + ' GB';
    out.push(h('details', { class: 'mcache', open: this.mCacheOpen ? '' : null, ontoggle: e => { this.mCacheOpen = e.target.open; } },
      h('summary', { class: 'hint', text: `這台裝置上的音樂：${sz(used)}／${lim >= 1024 ? lim / 1024 + ' GB' : lim + ' MB'}` }),
      h('div', { class: 'row wrap' }, h('span', { class: 'hint grow', text: '播過的歌會存在這台裝置，下次不用再下載；超過上限時刪掉最久沒聽的。' }),
        h('select', { 'aria-label': '本機快取上限', onchange: e => { MusicCache.limitMB = +e.target.value; this.refresh('music'); } }, ...MCACHE_LIMITS.map(v => h('option', { value: String(v), selected: v === lim ? '' : null }, v >= 1024 ? v / 1024 + ' GB' : v + ' MB'))),
        h('button', { class: 'chip sm', onclick: async () => { await MusicCache.clear(); UI.toast('已清除這台裝置上的音樂快取', 'i_trash', 2.5); this.refresh('music'); } }, ico('i_trash', 16), '清除'))));
    return out;
  },
  tickMusic() {
    const p = this.el.mProg; if (!p) return; const [t, d] = Music.progress();
    if (document.activeElement !== p) p.value = d ? String(Math.round(t / d * 1000)) : '0';
    this.el.mT.textContent = fmtM(t); this.el.mD.textContent = fmtM(d);
  },
  ytPanel(show, e, st) {
    const p = document.getElementById('ytpanel'); if (!p) return;
    if (!show) { p.hidden = true; return; }
    p.hidden = false; p.querySelector('.yt-title').textContent = e ? e.title : 'YouTube';
    const msg = p.querySelector('.yt-msg'), box = p.querySelector('#yt-player');
    if (st === 'blocked') {
      msg.hidden = false; msg.replaceChildren(h('p', { text: '這個環境不能嵌入 YouTube 播放器。' }), h('a', { class: 'chip sm primary', href: Music.ytWatchUrl(e), target: '_blank', rel: 'noopener' }, ico('i_video', 18), '到 YouTube 開啟'));
      if (box) box.style.visibility = 'hidden';
    } else if (st === 'loading') { msg.hidden = false; msg.replaceChildren(h('p', { text: '載入 YouTube 播放器…' })); }
    else { msg.hidden = true; if (box) box.style.visibility = ''; }
  },
  // ---------- theme confirm ----------
  themeAsk: null,
  themeConfirm(id) { this.themeAsk = id; this.closeWin('shop'); this.closeWin('storage'); this.openWin('themeask'); },
  w_themeask() {
    const id = this.themeAsk, th = THEMES[id]; if (!th) return [];
    return [h('div', { class: 'gift' }, h('div', { class: 'tpv big' }, themePreview(id)), h('p', { class: 'gift-t', text: th.n })),
      h('button', { class: 'chip primary', onclick: () => { this.closeWin('themeask'); Game.applyTheme(id, 'full'); } }, ico('i_theme', 20), '整套佈置（目前家具收進收納箱）'),
      h('button', { class: 'chip', onclick: () => { this.closeWin('themeask'); Game.applyTheme(id, 'look'); } }, ico('i_wall', 20), '只換牆面、地板和窗景'),
      h('button', { class: 'chip', onclick: () => this.closeWin('themeask') }, '先不要')];
  },
  // ---------- gift ----------
  giftItem: null,
  giftModal(item, coins, sup) { this.giftItem = { item, coins, sup: sup || [] }; this.openWin('gift'); },
  w_gift() {
    const g = this.giftItem; if (!g) return [];
    const pv = sprPreview(SPR.get(g.item.spr, g.item.map, false, g.item.id), 120, 5);
    return [h('div', { class: 'gift' }, h('div', { class: 'gift-pv' }, pv), h('p', { class: 'gift-t' }, '收到了「', h('b', { text: g.item.n }), '」'), h('p', { class: 'hint', text: `還有 ${g.coins} 金幣` + (g.sup.length ? '和 ' + g.sup.map(k => SUPPLIES[k].n).join('、') : '') + '。東西放在收納箱裡。' }),
        g.sup.length ? h('div', { class: 'rw big' }, ...g.sup.map(k => h('span', { class: 'rwc' }, ico(SUPPLIES[k].spr, 28)))) : null),
      h('div', { class: 'row center' }, h('button', { class: 'chip primary', onclick: () => { this.closeWin('gift'); Game.place(g.item.id); } }, ico('i_brush', 20), '馬上擺放'), h('button', { class: 'chip', onclick: () => this.closeWin('gift') }, '收下'))];
  },
};
