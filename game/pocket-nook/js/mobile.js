/* ============================================================
   Phone (portrait) version
   The game switches by screen shape: a portrait screen up to 900 px wide gets the phone
   layout (body.m), everything else keeps the desktop layout exactly as it was.
   Phone layout, top to bottom:
     HUD (one row) / the room, as wide as the screen / "today" panel (what you can do right
     now: timer, today's words, the merchant's story, needs, team, paper plane, the hand
     tray) / a bottom bar with 5 tools (learn, tasks, pets, music, more)
   Windows become sheets from the bottom (half height when the room should stay visible,
   full height for quizzes and shops), closed by swiping down.
   Touch: bigger targets, long press instead of hover, things you drag float just above the
   finger, a fixed edit toolbar with nudge buttons, the keyboard never squashes the room.
   Also: sound unlocked on the first touch (iPhone), less drawing when nothing happens,
   double tap or the magnifier zooms the room 2x, focus-end notification, home screen app.
   ============================================================ */
// magnifier with + / - (zoom the room in and out) and a chevron for the "today" rows
const magn = (minus) => icon(g => { const W = palAdd('#fff6ec'), D = palAdd('#4b4560'), B = palAdd('#cfe6ee'); g.ellipse(6.5, 6.5, 5, 5, D); g.ellipse(6.5, 6.5, 3.8, 3.8, B); g.hl(4, 6, 6, D); if (!minus) g.vl(6, 4, 6, D); g.px(4, 4, W); for (let i = 0; i < 4; i++) { g.px(10 + i, 11 + i, D); g.px(11 + i, 11 + i, D); g.px(11 + i, 10 + i, D); } });
SPR.def('i_zoomin', magn(false)); SPR.def('i_zoomout', magn(true));
SPR.def('i_chev', icon(g => { const D = palAdd('#7a6f8c'); for (let i = 0; i < 4; i++) { g.px(6 + i, 4 + i, D); g.px(7 + i, 4 + i, D); g.px(6 + i, 11 - i, D); g.px(7 + i, 11 - i, D); } }));
const MOBILE = { maxW: 900, idleMs: 20000, longMs: 450, zoom: 2 };
const HALF_WINS = new Set(['need', 'timer', 'todo', 'memo', 'account', 'cowork', 'visit', 'gacha']);
const FULL_WINS = new Set(['study', 'shop', 'avatar', 'words', 'storage', 'merchant', 'story', 'learn', 'tasks', 'friends', 'music', 'settings', 'dev', 'more']);

const Mobile = {
  on: false, lastInput: performance.now(), zoomed: false, zx: 0, zy: 0,
  detect() { return window.innerHeight > window.innerWidth && window.innerWidth <= MOBILE.maxW; },
  apply() {
    const m = this.detect();
    if (m !== this.on) {
      this.on = m; document.body.classList.toggle('m', m);
      if (!m) this.unzoom();
      if (m && document.body.classList.contains('mini')) UI.setMini(false);
      for (const id in UI.wins) if (!UI.wins[id].el.hidden) UI.placeWin(UI.wins[id]);
      if (typeof PetPlay !== 'undefined' && PetPlay._tray) { PetPlay._tray.remove(); PetPlay._tray = null; PetPlay.renderTray(); }
      // the YouTube player: under the "today" panel on a phone (never over the room), floating on a computer
      const yp = document.getElementById('ytpanel'), st = document.querySelector('.stage');
      if (yp && st) { if (m && yp.parentNode !== st) st.insertBefore(yp, this.today && this.today.parentNode === st ? this.today.nextSibling : null); else if (!m && yp.parentNode === st) document.body.insertBefore(yp, document.getElementById('toasts')); }
      this.render();
    }
    // Layout must not force cross-site redirect authentication. Cloud uses a user-triggered popup.
    return m;
  },
  standalone() { return window.matchMedia && window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; },
  typing() { const a = document.activeElement; return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA') && a.type !== 'range'; },
  // ---------- build the phone parts once ----------
  build() {
    const stage = document.querySelector('.stage');
    this.today = h('section', { class: 'mtoday', 'aria-label': '今天' }); stage.insertBefore(this.today, stage.querySelector('.ytpanel'));
    this.nav = h('nav', { class: 'mnav', 'aria-label': '分頁' }); document.getElementById('app').append(this.nav);
    const tabs = [['learn', 'i_learn', '學習'], ['tasks', 'i_task', '任務'], ['pet', 'i_paw', '寵物'], ['music', 'i_music', '音樂'], ['more', 'i_gear', '更多']];
    this.tabs = {};
    for (const [id, ic, label] of tabs) {
      const b = h('button', { class: 'mtab', type: 'button', 'data-id': id, 'aria-pressed': 'false', onclick: () => this.tab(id) }, ico(ic, 28), h('span', { text: label }));
      this.tabs[id] = b; this.nav.append(b);
    }
    if (typeof ResizeObserver !== 'undefined') { this.navObserver = new ResizeObserver(() => this.measureNav()); this.navObserver.observe(this.nav); }
    this.measureNav();
    // zoom button: in the bar under the room, never on top of the furniture
    this.zbtn = h('button', { class: 'chip mzoom', 'aria-label': '放大房間', title: '放大房間（也可以點兩下地板）', onclick: () => this.zoomed ? this.unzoom() : this.zoomAt(RW / 2, RH * 0.62) }, ico('i_zoomin', 22));
  },
  measureNav() {
    if (this.nav && this.on) {
      const height = Math.ceil(this.nav.getBoundingClientRect().height);
      if (height > 0) document.documentElement.style.setProperty('--mobile-nav-height', height + 'px');
    }
  },
  tab(id) {
    // A save-migration decision with no close button must be completed before switching tools.
    if (Object.values(UI.wins).some(w => !w.el.hidden && w.conf.noclose)) return;
    if (id === 'room') { for (const k in UI.wins) UI.closeWin(k); if (Room.edit) UI.setEdit(false); return this.sync(); }
    if (!this.tabs[id]) return;
    if (id === 'pet') UI.petTab = UI.petTab || 'care';
    const current = UI.wins[id];
    if (current && !current.el.hidden) UI.closeWin(id);
    else {
      for (const k in UI.wins) if (!UI.wins[k].el.hidden) UI.closeWin(k);
      if (Room.edit) UI.setEdit(false);
      UI.openWin(id);
    }
    this.sync();
  },
  sync() {
    if (!this.nav) return;
    const visible = Object.values(UI.wins).filter(w => !w.el.hidden).sort((a, b) => (+b.el.style.zIndex || 0) - (+a.el.style.zIndex || 0));
    const open = visible.length ? visible[0].id : null;
    const blocking = visible.some(w => w.conf.noclose);
    const group = !open ? null : ['learn', 'study', 'words'].includes(open) ? 'learn' : this.tabs[open] ? open : 'more';
    document.body.classList.toggle('m-win', !!open);
    if (this.on) document.getElementById('scrim').hidden = !visible.some(w => w.conf.modal);
    this.nav.setAttribute('aria-disabled', String(blocking));
    for (const id in this.tabs) {
      const on = group === id;
      this.tabs[id].classList.toggle('on', on);
      this.tabs[id].setAttribute('aria-pressed', String(on));
      this.tabs[id].disabled = blocking;
      this.tabs[id].title = on && open === id ? '再點一次收合，回到房間' : this.tabs[id].textContent.replace(/\d+/g, '').trim();
      const src = UI.dockBtns && UI.dockBtns[id] && UI.dockBtns[id].querySelector('.badge-dot'); let el = this.tabs[id].querySelector('.badge-dot');
      if (src) { if (!el) { el = src.cloneNode(true); this.tabs[id].append(el); } else el.textContent = src.textContent; el.className = src.className; } else if (el) el.remove();
    }
    this.measureNav();
    if (typeof YTMiniPlace !== 'undefined') YTMiniPlace.apply();
  },
  // ---------- "today" panel: what you can do right now, one tap each ----------
  rows() {
    const out = [], S = Game.S, t = S.timer, L = Learn.L;
    const row = (icon, title, sub, fn, cls) => out.push(h('button', { class: 'mrow' + (cls ? ' ' + cls : ''), onclick: fn }, ico(icon, 26), h('span', { class: 'mrow-t' }, h('b', { text: title }), sub ? h('span', { class: 'hint', text: sub }) : null), ico('i_chev', 16)));
    // plane, team, story: someone needs you
    if (typeof Feel !== 'undefined' && Feel.plane && Feel.plane.t >= 1) row(Feel.plane.kind.icon, Feel.plane.text, '去幫忙', () => Feel.openPlane(), 'need');
    if (typeof Feel !== 'undefined') for (const type of ['d', 'w']) { const n = Feel.near[type]; if (n) row('i_people', `${TEAM_TYPES[type].n}團隊只差 ${n.left} ${n.unit}`, n.quiz ? '一起完成' : '看看團隊', () => Feel.finishTeam(type), 'need'); }
    if (typeof Story !== 'undefined' && Story.pending()) { const St = Story.week(), i = Story.next(); row('i_shop', `${MERCHANTS[St.mk].n}的故事 · 第 ${i + 1} 章`, i === 0 ? Story.M().arcs[St.arc].open[0] : '有一章新的故事在等你', () => Story.open(), 'need'); }
    for (const n of Life.L.needs.slice(0, 2)) { const def = NEED_DEFS[n.type], sup = def.item && SUPPLIES[def.item]; row(sup ? sup.spr : def.icon, def.t(n), '處理', () => UI.needCard(n.id)); }
    // today's words
    Learn.ensureDaily(); const rev = Math.min(20, L.reviewed);
    if (!L.dailyDone) row('i_learn', rev >= 20 ? '今日單字：小測驗' : rev ? `今日單字：再 5 個（${rev}/20）` : '今日單字：先做 5 個', `連續 ${Learn.streakNow()} 天`, () => Learn.start('daily'));
    const claim = Life.claimable(); if (claim) row('i_task', `${claim} 個任務可以領獎勵`, '領取', () => UI.openTasks('daily'));
    return out;
  },
  timerCard() {
    const S = Game.S, t = S.timer, rem = t.running ? (t.endsAt - Date.now()) / 1000 : t.remain, focus = t.mode === 'focus';
    return h('div', { class: 'mtimer' + (t.running ? ' running' : '') + (focus ? '' : ' brk') },
      h('button', { class: 'mtimer-main', onclick: () => UI.openWin('timer') }, ico('i_tomato', 28), h('b', { class: 'num mt-time', text: fmt(rem) }), h('span', { class: 'mt-mode', text: t.running ? (focus ? '專注中' : '休息中') : (t.remain < Game.modeLen(t.mode) ? '暫停' : focus ? '準備專注' : '準備休息') })),
      h('button', { class: 'chip big ' + (t.running ? '' : 'primary'), onclick: () => t.running ? Game.pause() : Game.start() }, ico(t.running ? 'i_pause' : 'i_play', 22), t.running ? '暫停' : '開始'),
      Music.cur ? h('button', { class: 'chip icon-only' + (Music.playing ? ' on' : ''), 'aria-label': '音樂', onclick: () => Music.toggle() }, ico('i_music', 22)) : null);
  },
  render() {
    if (!this.today) return;
    if (!this.on) { this.today.hidden = true; return; }
    this.today.hidden = false;
    const focusing = Game.focusing();
    const mw = typeof Merchant !== 'undefined' && Game.S ? [MERCHANTS[Merchant.id()].n, Merchant.waiting()] : null;
    const key = JSON.stringify([focusing, Game.S.timer.running, Game.S.timer.mode, !!Music.cur, Music.playing, mw, this.rows().map(r => r.textContent), typeof Lights !== 'undefined' && Lights.nightRow()]);
    if (key !== this._key) {
      this._key = key;
      const tray = this.today.querySelector('.handtray');
      // the bar under the room: the hand tray on the left; the travelling merchant and the zoom on the right
      const mbtn = mw ? h('button', { class: 'chip mmerch', onclick: () => Merchant.go(), 'aria-label': '旅行商人' + mw[0] }, ico('i_merchant', 22), h('span', { text: mw[0] }), mw[1] ? h('span', { class: 'badge-dot' }) : null) : null;
      const rows = this.rows(); if (!focusing && typeof Lights !== 'undefined') { const nr = Lights.nightRow(); if (nr) rows.push(h('button', { class: 'mrow', onclick: () => Lights.goodnight() }, ico('i_moon', 26), h('span', { class: 'mrow-t' }, h('b', { text: nr[0] }), h('span', { class: 'hint', text: nr[1] })), ico('i_chev', 16))); }
      this.today.replaceChildren(h('div', { class: 'mbar' }, h('div', { class: 'mtray-slot' }), h('div', { class: 'mbar-r' }, mbtn, this.zbtn)), this.timerCard(), focusing ? h('p', { class: 'hint center', text: '專注中，其他的事等休息時間再說～' }) : h('div', { class: 'mrows' }, ...rows));
      if (tray) this.today.querySelector('.mtray-slot').append(tray);
    }
    const tm = this.today.querySelector('.mt-time'); if (tm) { const t = Game.S.timer; tm.textContent = fmt(t.running ? (t.endsAt - Date.now()) / 1000 : t.remain); }
    if (typeof PetPlay !== 'undefined') { const slot = this.today.querySelector('.mtray-slot'); if (!PetPlay._tray) PetPlay.renderTray(); else if (slot && PetPlay._tray.parentNode !== slot) { slot.append(PetPlay._tray); PetPlay.renderTray(); } }
  },
  // ---------- room size: as wide as the screen, sharp pixels ----------
  layout() {
    const stage = document.querySelector('.stage'), cv = document.getElementById('room'), wrap = document.querySelector('.room-wrap');
    const W = stage.getBoundingClientRect().width, H = window.innerHeight, dpr = window.devicePixelRatio || 1;
    let s = Math.min(W / RW, (H * 0.5) / RH);
    const crisp = Math.floor(s * dpr) / dpr; s = crisp >= s * 0.86 ? Math.max(1 / dpr, crisp) : Math.max(1, Math.floor(s * 8) / 8);
    Game.scale = s; cv.style.width = RW * s + 'px'; cv.style.height = RH * s + 'px'; wrap.style.width = RW * s + 'px'; wrap.style.height = RH * s + 'px';
    this.applyZoom();
  },
  // ---------- zoom: 2x around a point, the room box stays the same ----------
  zoomAt(x, y) {
    const z = MOBILE.zoom; this.zoomed = true;
    this.zx = Math.max(0, Math.min(RW - RW / z, x - RW / z / 2)); this.zy = Math.max(0, Math.min(RH - RH / z, y - RH / z / 2));
    this.applyZoom(); this.zbtn.classList.add('on'); this.zbtn.replaceChildren(ico('i_zoomout', 22)); this.zbtn.setAttribute('aria-label', '還原大小');
  },
  unzoom() { this.zoomed = false; this.applyZoom(); if (this.zbtn) { this.zbtn.classList.remove('on'); this.zbtn.replaceChildren(ico('i_zoomin', 22)); this.zbtn.setAttribute('aria-label', '放大房間'); } },
  applyZoom() {
    const wrap = document.querySelector('.room-wrap'); if (!wrap) return;
    const s = Game.scale, z = this.zoomed ? MOBILE.zoom : 1;
    wrap.style.setProperty('--zt', this.zoomed ? `translate(${-this.zx * s * z}px, ${-this.zy * s * z}px) scale(${z})` : 'none');
    wrap.classList.toggle('zoomed', this.zoomed);
  },
  // ---------- edit mode: one panel at the bottom ----------
  // header: what is selected (or a short how-to), storage box, done
  // body:   the actions on the left in a 2x2 grid, a cross of arrows on the right (hold to keep moving)
  renderEdit() {
    let el = this._edit; if (!el) { el = this._edit = h('div', { class: 'medit', role: 'toolbar', 'aria-label': '佈置' }); document.body.append(el); }
    if (!Room.edit) { el.replaceChildren(); return; }
    const it = Room.sel && Room.uidMap[Room.sel.uid] ? Room.sel : null, d = it && ITEMS[it.k];
    const done = h('button', { class: 'chip primary', onclick: () => UI.setEdit(false) }, '完成'), box = h('button', { class: 'chip', onclick: () => UI.openWin('storage') }, ico('i_box', 18), '收納箱');
    if (!it) {
      el.replaceChildren(h('div', { class: 'medit-h' }, h('div', { class: 'grow' }, ico('i_brush', 22), h('b', { text: '佈置模式' })), box, done),
        h('p', { class: 'medit-tip', text: '點選家具後拖曳；小物靠近桌面會自動放好。' }));
      return;
    }
    const pv = h('span', { class: 'medit-pv' }, sprPreview(Room.itemCanvas(it), 30, 1));
    const act = (icon, label, fn) => h('button', { class: 'chip', onclick: fn }, icon ? ico(icon, 18) : null, label);
    const acts = [
      act('i_flip', '翻轉', () => { it.flip = !it.flip; if (it.p != null) Room.settleDecor(it); for (const c of Game.S.items) if (c.p === it.uid) { const cv = Room.itemCanvas(it), ccv = Room.itemCanvas(c); c.dx = cv.width - c.dx - ccv.width; } Room.clampItem(it); Game.save(); this.renderEdit(); }),
      d.toggle ? act('i_lamp', it.on ? '關燈' : '開燈', () => { it.on = !it.on; Game.save(); this.renderEdit(); }) : null,
      d.window ? act(null, it.closed ? '拉開窗簾' : '拉上窗簾', () => { it.closed = !it.closed; Game.save(); this.renderEdit(); }) : null,
      act('i_box', '收起', () => Game.storeItem(it)),
      act(null, '取消選取', () => { Room.sel = null; UI.editToolbar(); }),
    ].filter(Boolean);
    const nudge = (dx, dy) => { if (it.p != null && dx) { delete it.p; delete it.dx; delete it.dy; } it.x += dx; it.y += dy; if (d.layer === 'decor') Room.settleDecor(it); else Room.clampItem(it); Room.indexItems(); };
    const arrow = (cls, label, txt, dx, dy) => {
      const b = h('button', { class: 'chip ' + cls, 'aria-label': label }, txt); let rep = null, delay = null;
      const stop = () => { clearTimeout(delay); clearInterval(rep); delay = rep = null; Game.save(); };
      b.addEventListener('pointerdown', e => { e.preventDefault(); nudge(dx, dy); delay = setTimeout(() => { rep = setInterval(() => nudge(dx, dy), 60); }, 350); });
      for (const t of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(t, stop);
      return b;
    };
    el.replaceChildren(
      h('div', { class: 'medit-h' }, h('div', { class: 'grow' }, pv, h('b', { text: d.n })), box, done),
      h('div', { class: 'medit-b' }, h('div', { class: 'medit-acts' }, ...acts),
        h('div', { class: 'medit-pad' }, arrow('up', '往上', '↑', 0, -1), arrow('left', '往左', '←', -1, 0), arrow('down', '往下', '↓', 0, 1), arrow('right', '往右', '→', 1, 0))));
  },
  // ---------- long press: what is this? ----------
  tip(x, y) {
    const hh = Room.hit(x, y); if (!hh) return false;
    let text = '', ax = x, ay = y;
    if (hh.kind === 'actor' && hh.a instanceof Pet) { const p = hh.a.data; if (!p) return false; text = `${p.name}・飽足 ${Math.round(p.hunger)}・心情 ${Math.round(p.mood)}・清潔 ${Math.round(p.clean)}・精力 ${Math.round(p.energy)}`; const hp = hh.a.headPos ? hh.a.headPos() : [hh.a.x, hh.a.y - 16]; ax = hp[0]; ay = hp[1] - 8; }
    else if (hh.kind === 'actor' && hh.a === Game.avatar) { text = Game.S.avatar.name || '我'; ax = hh.a.x; ay = hh.a.y - 34; }
    else if (hh.kind === 'item') { const it = hh.it, d = ITEMS[it.k]; text = Pets.ownerTag(it) || d.n; const cv = Room.itemCanvas(it); ax = it.x + cv.width / 2; ay = it.y - 2; }
    else return false;
    let el = this._tip; if (!el) { el = this._tip = h('div', { class: 'tag owner-tip mtip' }); UI.overlay.append(el); }
    el.textContent = text; el.hidden = false; const s = Game.scale;
    // keep the note inside the room: centred over what you pressed, pushed in at the edges, below it when there is no room above
    el.style.transform = 'none'; const w = el.offsetWidth, th = el.offsetHeight, roomW = RW * s;
    const left = Math.max(4, Math.min(roomW - w - 4, ax * s - w / 2)); let top = ay * s - th - 4; if (top < 4) top = (ay + 22) * s;
    el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
    clearTimeout(this._tipT); this._tipT = setTimeout(() => { el.hidden = true; }, 2600);
    if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) { }
    return true;
  },
  // ---------- sound on iPhone needs a first touch ----------
  unlockAudio() {
    if (this._audio) return; this._audio = true;
    const mk = () => { try { return new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } };
    for (const o of [typeof Ritual !== 'undefined' ? Ritual : null, typeof Feel !== 'undefined' ? Feel : null]) {
      if (!o) continue; if (!o.ac) o.ac = mk(); const A = o.ac; if (!A) continue;
      try { if (A.state === 'suspended') A.resume(); const b = A.createBuffer(1, 1, 22050), src = A.createBufferSource(); src.buffer = b; src.connect(A.destination); src.start(0); } catch (e) { }
    }
  },
  // ---------- notification when a focus ends while the page is in the background ----------
  notify(text) {
    if (!Game.S.settings.notify || !('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) return;
    const opt = { body: text, icon: 'apple-touch-icon.png', tag: 'pocketnook-timer' };
    if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(r => r.showNotification('小窩時光', opt)).catch(() => { });
    else try { new Notification('小窩時光', opt); } catch (e) { }
  },
  async askNotify(on) {
    const st = Game.S.settings;
    if (!on) { st.notify = false; Game.save(); UI.refresh('settings'); return; }
    if (!('Notification' in window)) { UI.toast('這個瀏覽器不支援通知（iPhone 要先「加入主畫面」）', 'i_bell', 4); return; }
    const p = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    st.notify = p === 'granted'; Game.save(); UI.refresh('settings');
    if (p !== 'granted') UI.toast('沒有拿到通知權限，可以到瀏覽器設定裡打開', 'i_bell', 4);
  },
};

/* ---------------- the "more" sheet ---------------- */
UI.WIN.more = { t: '更多', i: 'i_gear', w: 420, at: ['c', 0] };
UI.w_more = function () {
  const items = [['timer', 'i_tomato', '番茄鐘'], ['todo', 'i_list', '待辦'], ['memo', 'i_note', '便條'], ['shop', 'i_shop', '商店'], ['storage', 'i_box', '收納'], ['edit', 'i_brush', '佈置'], ['avatar', 'i_shirt', '造型'],
    ...(typeof SOCIAL_ON !== 'undefined' && SOCIAL_ON && window.NOOK_ENV === 'web' ? [['friends', 'i_people', '好友']] : []), ...(window.NOOK_ENV !== 'web' ? [['cowork', 'i_people', '一起專注']] : []),
    ['merchant', 'i_shop', '旅行商人'], ['account', 'i_cloud', '帳號'], ['settings', 'i_gear', '設定'], ...(typeof Dev !== 'undefined' && Dev.on ? [['dev', 'i_dev', '開發者']] : [])];
  return [h('div', { class: 'mmore' }, ...items.map(([id, ic, label]) => h('button', { class: 'dock-btn', onclick: () => { this.closeWin('more'); if (id === 'edit') this.setEdit(true); else if (id === 'merchant') Merchant.open(); else this.openWin(id); } }, ico(ic, 32), h('span', { text: label }))))];
};

/* ---------------- hooks ---------------- */
(function () {
  // layout: the phone computes its own room size; the keyboard never squashes the room
  const layout = UI.layout.bind(UI);
  UI.layout = function () {
    const m = Mobile.apply();
    if (m) { if (Mobile.typing() && Mobile._laidOut) return; Mobile._laidOut = true; return Mobile.layout(); }
    return layout();
  };
  const narrow = UI.narrow.bind(UI); UI.narrow = function () { return Mobile.on || narrow(); };
  // sheets: half or full height on the phone
  const place = UI.placeWin.bind(UI);
  UI.placeWin = function (w) {
    w.el.classList.toggle('half', Mobile.on && HALF_WINS.has(w.id)); w.el.classList.toggle('full', Mobile.on && FULL_WINS.has(w.id));
    if (Mobile.on) { w.el.style.left = ''; w.el.style.top = ''; w.el.style.height = ''; w.el.style.width = ''; w.el.style.transform = ''; return; }
    return place(w);
  };
  const open = UI.openWin.bind(UI); UI.openWin = function (id) { const r = open(id); const w = this.wins[id]; if (w && Mobile.on) this.placeWin(w); Mobile.sync(); return r; };
  const close = UI.closeWin.bind(UI); UI.closeWin = function (id) { const r = close(id); Mobile.sync(); return r; };
  const sync = UI.syncDock.bind(UI); UI.syncDock = function () { sync(); Mobile.sync(); };
  const badges = UI.badges.bind(UI); UI.badges = function () { badges(); Mobile.sync(); };
  // the hand tray lives in the "today" panel on the phone
  const tray = PetPlay.renderTray.bind(PetPlay);
  PetPlay.renderTray = function () {
    if (Mobile.on && Mobile.today) {
      const slot = Mobile.today.querySelector('.mtray-slot'); if (!slot) return;
      if (!this._tray) { this._tray = h('div', { class: 'handtray' }); slot.append(this._tray); this.trayOpen = this.trayOpen || false; }
      else if (this._tray.parentNode !== slot) slot.append(this._tray);
    }
    return tray();
  };
  // touch: a pet or person near the finger wins over the rug or wall under it; small things get a bigger target
  const hit = Room.hit.bind(Room), RING = [[0, -4], [4, 0], [-4, 0], [0, 4], [3, -3], [-3, -3], [3, 3], [-3, 3], [0, -7], [6, 0], [-6, 0], [0, 6]];
  Room.hit = function (x, y, opts = {}) {
    const r = hit(x, y, opts); if (!Mobile.on || !Mobile.touch) return r;
    if (r && r.kind !== 'item') return r;
    if (!opts.itemsOnly) for (const [dx, dy] of RING) { const q = hit(x + dx, y + dy, opts); if (q && q.kind === 'actor') return q; }
    const weak = (q) => !q || q.kind !== 'item' || ['rug', 'wall'].includes(ITEMS[q.it.k].layer) || ITEMS[q.it.k].window;
    if (!weak(r)) return r;
    for (const [dx, dy] of RING) { const q = hit(x + dx, y + dy, opts); if (q && !weak(q)) return q; }
    return r;
  };
  // the wand's feather and dragged furniture float just above the finger
  const move = PetPlay.move.bind(PetPlay);
  PetPlay.move = function (x, y) { if (Mobile.on && Mobile.touch && HAND[this.held] === 'wand') y -= 9; return move(x, y); };
  // the sound of a finished focus, and a notification when the page is hidden
  const complete = Game.complete.bind(Game);
  Game.complete = function (skipped) { const was = this.T().mode; const r = complete(skipped); if (!skipped) Mobile.notify(was === 'focus' ? '專注完成！休息一下吧' : '休息結束，準備好就再開始吧'); return r; };
  // settings: notification switch
  const ws = UI.w_settings;
  if (ws) UI.w_settings = function () {
    const out = ws.call(this), st = Game.S.settings;
    if (Array.isArray(out)) out.push(h('div', { class: 'row' }, h('button', { class: 'chip' + (st.notify ? ' on' : ''), 'aria-pressed': st.notify ? 'true' : 'false', onclick: () => Mobile.askNotify(!st.notify) }, st.notify ? '休息通知：開' : '休息通知：關'), h('span', { class: 'hint', text: '遊戲在背景時提醒；iPhone 請先加入主畫面。' })));
    return out;
  };
  // drawing: when nothing is happening on a phone, draw every other frame (half the battery)
  const render = Room.render.bind(Room); let skip = false;
  Room.render = function (dt) {
    if (Mobile.on && performance.now() - Mobile.lastInput > MOBILE.idleMs && !Game.focusing() && !(TrickShow.cur) && !(PetPlay.held)) { skip = !skip; if (skip) return; }
    return render(dt);
  };
})();

/* ---------------- input ---------------- */
(function () {
  const cv = () => document.getElementById('room');
  const toRoom = (e) => { const r = cv().getBoundingClientRect(); return [(e.clientX - r.left) / r.width * RW, (e.clientY - r.top) / r.height * RH]; };
  let lp = null, lastTap = null;
  document.addEventListener('pointerdown', e => { Mobile.lastInput = performance.now(); Mobile.touch = e.pointerType === 'touch' || e.pointerType === 'pen'; Mobile.unlockAudio(); }, true);
  document.addEventListener('pointermove', () => { Mobile.lastInput = performance.now(); }, true);
  window.addEventListener('load', () => {
    const c = cv(); if (!c) return;
    c.addEventListener('pointerdown', e => {
      if (!Mobile.on || Room.edit || (typeof PetPlay !== 'undefined' && PetPlay.held)) return;
      const [x, y] = toRoom(e); clearTimeout(lp && lp.t);
      lp = { x, y, cx: e.clientX, cy: e.clientY, done: false, t: setTimeout(() => { if (lp && Mobile.tip(lp.x, lp.y)) { lp.done = true; UI.lpDone = true; } }, MOBILE.longMs) };
    });
    c.addEventListener('pointermove', e => { if (lp && Math.hypot(e.clientX - lp.cx, e.clientY - lp.cy) > 8) { clearTimeout(lp.t); lp = null; } });
    const end = (e) => {
      if (!lp) return; clearTimeout(lp.t); const was = lp; lp = null; if (was.done) return;
      // double tap on an empty spot (nothing but floor, rug or wall under the finger): zoom in / out there
      const hh = Room.hit(was.x, was.y), empty = !hh || (hh.kind === 'item' && ['rug', 'wall'].includes(ITEMS[hh.it.k].layer) && !ITEMS[hh.it.k].act && !ITEMS[hh.it.k].toggle);
      const now = performance.now();
      if (empty && lastTap && now - lastTap.t < 320 && Math.hypot(was.cx - lastTap.cx, was.cy - lastTap.cy) < 30) { lastTap = null; if (Mobile.zoomed) Mobile.unzoom(); else Mobile.zoomAt(was.x, was.y); return; }
      lastTap = empty ? { t: now, cx: was.cx, cy: was.cy } : null;
    };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', () => { if (lp) clearTimeout(lp.t); lp = null; });
  });
  // swipe a sheet down by its title bar to close it
  document.addEventListener('pointerdown', e => {
    if (!Mobile.on) return; const hd = e.target.closest && e.target.closest('.win-h'); if (!hd || e.target.closest('button')) return;
    const win = hd.closest('.win'), id = win && win.dataset.id; if (!id) return;
    const y0 = e.clientY; let dy = 0; hd.setPointerCapture(e.pointerId);
    const mv = ev => { dy = Math.max(0, ev.clientY - y0); win.style.transform = dy ? `translateY(${dy}px)` : ''; };
    const up = () => { hd.removeEventListener('pointermove', mv); hd.removeEventListener('pointerup', up); hd.removeEventListener('pointercancel', up); win.style.transform = ''; if (dy > 80 && !(UI.WIN[id] && UI.WIN[id].noclose)) UI.closeWin(id); };
    hd.addEventListener('pointermove', mv); hd.addEventListener('pointerup', up); hd.addEventListener('pointercancel', up);
  });
  // keyboard on a phone: sheets sit above it
  const vv = window.visualViewport;
  if (vv) { const kb = () => { const k = Math.max(0, window.innerHeight - vv.height - vv.offsetTop); document.documentElement.style.setProperty('--kb', (Mobile.on ? k : 0) + 'px'); document.body.classList.toggle('kb', Mobile.on && k > 80); if (typeof YTMiniPlace !== 'undefined') YTMiniPlace.apply(); }; vv.addEventListener('resize', kb); vv.addEventListener('scroll', kb); }
  document.addEventListener('focusout', () => { if (Mobile.on) setTimeout(() => { if (!Mobile.typing()) UI.layout(); }, 250); });
})();

/* ---------------- start ---------------- */
(function () {
  const start = () => {
    if (!document.querySelector('.stage') || !Game.S) return setTimeout(start, 50);
    Mobile.build(); UI.layout(); Mobile.render();
    setInterval(() => { try { Mobile.render(); } catch (e) { console.warn(e); } }, 1000);
  };
  window.addEventListener('load', start);
  // home screen app (works offline after the first visit); not on file:// or in previews
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && window.NOOK_ENV === 'web') window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
})();

// computer: the hand tray goes in the free space to the right of the room, so it never covers furniture
// (a window too narrow for that keeps it in the room's corner, as before)
(function () {
  const place = () => {
    const wrap = document.querySelector('.room-wrap'); if (!wrap) return;
    const r = wrap.getBoundingClientRect(), g = document.body.classList.contains('m') ? 0 : window.innerWidth - r.right;
    document.body.classList.toggle('tray-side', g >= 168); document.body.classList.toggle('tray-3', g >= 168 && g < 214);
  };
  window.addEventListener('resize', place); window.addEventListener('load', () => { place(); setTimeout(place, 600); });
  setInterval(place, 3000);
})();

// scrollbars: shown while scrolling, faded out 1 s after the scrolling stops (phone and computer)
(function () {
  const timers = new WeakMap();
  document.addEventListener('scroll', e => {
    const el = e.target; if (!el || !el.classList || el === document) return;
    el.classList.add('sbx', 'sb-on'); clearTimeout(timers.get(el));
    timers.set(el, setTimeout(() => el.classList.remove('sb-on'), 1000));
  }, true);
})();

// phone: the back gesture / back button closes the open window instead of leaving the game
// (while a window is open there is one extra history step; the game never goes back by itself, so it can never leave the page)
(function () {
  const ours = () => !!(history.state && history.state.nookWin);
  const anyOpen = () => Object.keys(UI.wins).find(k => !UI.wins[k].el.hidden);
  const ow = UI.openWin.bind(UI);
  UI.openWin = function (id) {
    const r = ow.apply(this, arguments);
    if (document.body.classList.contains('m') && !ours()) { try { history.pushState({ nookWin: 1 }, ''); } catch (e) { } }
    return r;
  };
  window.addEventListener('popstate', () => {
    const id = anyOpen(); if (!id) return;
    // a window that must be answered (no close button) stays: put the step back
    if (UI.WIN[id] && UI.WIN[id].noclose) { try { history.pushState({ nookWin: 1 }, ''); } catch (e) { } return; }
    for (const k in UI.wins) if (!UI.wins[k].el.hidden) UI.closeWin(k);
    if (typeof Mobile !== 'undefined') Mobile.sync();
  });
})();
