/* 0.93.7 Purr Cozy: "report a problem".
   A player picks what kind of problem it is, answers a few tap-to-choose questions (a template per kind) and can add their
   own words. The game adds what a tester would otherwise have to type: version, device, language, the window that was open
   and its text, the question on screen, recent script errors, and a small picture of the room (can be turned off).
   The player can also attach a screenshot of their own (shrunk to a JPEG before sending).

   - One Firestore document per report: reports/{reportId}, written with the anonymous learning-log account
     (LearnLog.ready()), so it works without signing in. Rules: firestore.rules, section "問題回報".
   - A report that cannot be sent (offline, Firebase blocked) waits in localStorage and is sent at the next launch.
   - At most 15 reports a day from one browser.
   - The admin page (tools/admin.html, 問題回報) lists them and sets the status; the player sees that status here.
   Text keys: rp.* in i18n/ui.json. */
const REPORT_CATS = [
 ['stuck', '🐞', [['where', 'one'], ['what', 'many', ['frozen', 'noreact', 'reload', 'error', 'lost', 'slow']], ['again', 'one', ['always', 'some', 'once', 'untried']]]],
 ['display', '🖼️', [['where', 'one'], ['what', 'many', ['cut', 'overlap', 'small', 'faint', 'image', 'layout']]]],
 ['text', '✏️', [['textKind', 'many', ['typo', 'unclear', 'wrong', 'lang']], ['wrongText', 'text'], ['fixText', 'text']]],
 ['quiz', '❓', [['item', 'text'], ['quizKind', 'many', ['answer', 'two', 'meaning', 'sound', 'confusing', 'hard']]]],
 ['level', '📈', [['where', 'one'], ['levelHow', 'many', ['hard', 'easy', 'many', 'few', 'time']]]],
 ['money', '💰', [['where', 'one'], ['moneyKind', 'many', ['noreward', 'expensive', 'short', 'missing', 'level', 'number']]]],
 ['idea', '💡', []],
 ['other', '💬', []]];
const REPORT_WHERE = ['load', 'learn', 'story', 'test', 'typo', 'mini', 'shop', 'room', 'pet', 'task', 'social', 'other'];
// option keys → text keys (each question has its own prefix in ui.json)
const REPORT_OPT = { what: { stuck: 's', display: 'd' }, again: 'a', textKind: 't', quizKind: 'k', levelHow: 'l', moneyKind: 'm', where: 'w' };

const Report = {
 V: 1, KEY_Q: 'purr-cozy.reports.q', KEY_MINE: 'purr-cozy.reports.mine', DAY_MAX: 15,
 errs: [], view: null, ctx: null, busy: false,

 // ---------- what the game adds by itself ----------
 noteError(msg) { const m = String(msg || '').replace(/\s+/g, ' ').slice(0, 300); if (!m) return; this.errs.push(new Date().toTimeString().slice(0, 8) + ' ' + m); this.errs = this.errs.slice(-10);
  // the first error in a session offers a report (once)
  if (!this._offered && typeof UI !== 'undefined' && UI.toast && typeof Game !== 'undefined' && Game.S && !document.body.classList.contains('purr-loading')) { this._offered = true; setTimeout(() => UI.toast(I18n.t('rp.crash'), 'i_mail', 8, { label: I18n.t('rp.crashBtn'), fn: () => this.open('stuck') }), 400); } },
 learnNow() {
  try { const s = Learn.sess; if (!s) return ''; const q = s.qs && s.qs[s.qi], i = q ? q.i : s.words && s.words[s.ri], v = VOCAB[i]; if (!v) return s.kind;
   const opts = q && q.opts ? q.opts.map(o => typeof o === 'number' ? (VOCAB[o] ? VOCAB[o].w : o) : (o && o.w) || o).join(' / ') : '';
   return [s.kind, s.step, v.w + '（' + (v.z || '') + '）', q ? q.type : '', opts].filter(Boolean).join(' · ').slice(0, 400); } catch (e) { return ''; } },
 learnWord() { try { const s = Learn.sess; if (!s) return ''; const q = s.qs && s.qs[s.qi], i = q ? q.i : s.words && s.words[s.ri]; return VOCAB[i] ? VOCAB[i].w : ''; } catch (e) { return ''; } },
 topWin() {
  const vis = Object.values(UI.wins || {}).filter(w => !w.el.hidden && w.id !== 'report' && w.id !== 'more' && w.id !== 'settings').sort((a, b) => (+b.el.style.zIndex || 0) - (+a.el.style.zIndex || 0));
  const w = vis[0]; return w ? { id: w.id, text: w.el.innerText.replace(/\s+/g, ' ').slice(0, 800) } : { id: '', text: '' };
 },
 jpeg(src, maxSide, maxLen) {
  const s = Math.min(1, maxSide / Math.max(src.width || 1, src.height || 1)), c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(src.width * s)); c.height = Math.max(1, Math.round(src.height * s)); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(src, 0, 0, c.width, c.height);
  for (const q of [.72, .6, .48, .36]) { const d = c.toDataURL('image/jpeg', q); if (d.length <= maxLen) return d; }
  return c.width > 200 ? this.jpeg(c, Math.round(maxSide * .7), maxLen) : '';
 },
 roomShot() { try { const cv = document.getElementById('room'); return cv && cv.width ? this.jpeg(cv, 800, 200000) : ''; } catch (e) { return ''; } },
 snapshot() { const w = this.topWin(); return { win: w.id, winText: w.text, learn: this.learnNow(), word: this.learnWord(), shot: this.roomShot() }; },
 device() {
  const n = navigator, ua = n.userAgent || '';
  return { ua: ua.slice(0, 300), w: innerWidth | 0, h: innerHeight | 0, dpr: Math.round((devicePixelRatio || 1) * 100) / 100, mobile: typeof Mobile !== 'undefined' && !!Mobile.on,
   touch: 'ontouchstart' in window, dark: !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches), standalone: typeof Mobile !== 'undefined' && Mobile.standalone ? !!Mobile.standalone() : false,
   online: n.onLine !== false, mem: n.deviceMemory || 0, tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || '').slice(0, 40) };
 },

 // ---------- local lists ----------
 load(k) { try { const v = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } },
 keep(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
 today() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); },
 sentToday() { const t = this.today(); return this.load(this.KEY_MINE).filter(r => r.day === t).length; },
 id() { const a = new Uint8Array(6); crypto.getRandomValues(a); return Date.now().toString(36) + '-' + [...a].map(x => x.toString(36).padStart(2, '0')).join('').slice(0, 10); },
 short(id) { return String(id).slice(-6).toUpperCase(); },

 // ---------- sending ----------
 build(cat, ans, text, ctx, img, withShot) {
  const S = Game.S, B = window.PURR_BUILD || window.PURR_EARLY_BUILD || {};
  return { v: this.V, acct: typeof LearnLog !== 'undefined' ? LearnLog.acct() : '', name: String(S.name || '').slice(0, 40), test: !!(S.flags && S.flags.tester),
   cat, ans, text: String(text || '').slice(0, 2000), ver: String(B.version || '').slice(0, 16), build: String((B.resources && B.resources.checksum) || '').slice(0, 16),
   lang: String(I18n.lang || '').slice(0, 8), dev: this.device(), win: String(ctx.win || '').slice(0, 40), winText: String(ctx.winText || '').slice(0, 800), learn: String(ctx.learn || '').slice(0, 400),
   errs: this.errs.slice(-10), shot: withShot ? ctx.shot || '' : '', img: img || '', lvl: S.lvl | 0, status: 'new', note: '', t: Date.now() };
 },
 async put(id, rec) {
  if (typeof LearnLog === 'undefined' || !(await LearnLog.ready())) throw Error('no firebase');
  const F = LearnLog.F, db = LearnLog.db;
  await F.setDoc(F.doc(db, 'reports', id), Object.assign({}, rec, { by: LearnLog.lid, at: F.serverTimestamp() }));
 },
 async send(rec) {
  const id = this.id(), mine = this.load(this.KEY_MINE);
  mine.unshift({ id, t: rec.t, cat: rec.cat, day: this.today(), sent: false }); this.keep(this.KEY_MINE, mine.slice(0, 30));
  try { await this.put(id, rec); this.mark(id); return { id, ok: true }; }
  catch (e) {
   // refused (e.g. the new firestore.rules are not published yet) is kept too: it goes out once the rules allow it
   if (e && e.code === 'permission-denied') console.warn('[report] refused, kept for later', e);
   const q = this.load(this.KEY_Q); q.push({ id, rec }); if (!this.keep(this.KEY_Q, q.slice(-10))) { rec.img = ''; rec.shot = ''; q[q.length - 1] = { id, rec }; this.keep(this.KEY_Q, q.slice(-10)); }
   return { id, ok: false };
  }
 },
 mark(id) { const mine = this.load(this.KEY_MINE); for (const r of mine) if (r.id === id) r.sent = true; this.keep(this.KEY_MINE, mine); },
 drop(id) { this.keep(this.KEY_MINE, this.load(this.KEY_MINE).filter(r => r.id !== id)); },
 async flush() {
  if (this.busy || navigator.onLine === false) return; const q = this.load(this.KEY_Q); if (!q.length) return; this.busy = true;
  try { const left = []; for (const it of q) { try { await this.put(it.id, it.rec); this.mark(it.id); } catch (e) { left.push(it); } } this.keep(this.KEY_Q, left); }
  finally { this.busy = false; }
 },
 async status() {
  const mine = this.load(this.KEY_MINE).slice(0, 8); if (!mine.length || typeof LearnLog === 'undefined') return;
  try { if (!(await LearnLog.ready())) return; const F = LearnLog.F, db = LearnLog.db;
   await Promise.all(mine.filter(r => r.sent).map(async r => { try { const d = await F.getDoc(F.doc(db, 'reports', r.id)); if (d.exists()) r.status = d.data().status; } catch (e) { } }));
   const all = this.load(this.KEY_MINE); for (const r of all) { const m = mine.find(x => x.id === r.id); if (m && m.status) r.status = m.status; } this.keep(this.KEY_MINE, all);
   if (this.view && this.view.step !== 'form') UI.refresh('report');
  } catch (e) { }
 },

 // ---------- window ----------
 open(cat) {
  this.ctx = this.snapshot();   // before the report window covers anything
  this.view = { step: cat ? 'form' : 'pick', cat: cat || '', ans: {}, text: '', img: '', shot: true, msg: '', res: null };
  if (cat === 'quiz' && this.ctx.word) this.view.ans.item = this.ctx.word;
  UI.openWin('report'); UI.refresh('report'); this.status();
 },
 pick(cat) { const v = this.view; v.step = 'form'; v.cat = cat; v.ans = {}; v.msg = ''; if (cat === 'quiz' && this.ctx && this.ctx.word) v.ans.item = this.ctx.word; UI.refresh('report'); },
 optText(q, cat, o) { const p = REPORT_OPT[q]; return I18n.t('rp.' + (typeof p === 'object' ? p[cat] : p) + '.' + o); },
 filled() { const v = this.view, def = REPORT_CATS.find(c => c[0] === v.cat); if (!def) return false; if (v.text.trim().length >= 2) return true; if (!def[2].length) return false;
  return Object.values(v.ans).some(a => Array.isArray(a) ? a.length : String(a || '').trim().length); },
 async submit() {
  const v = this.view; if (this.busy) return;
  if (!this.filled()) { v.msg = I18n.t('rp.need'); UI.refresh('report'); return; }
  if (this.sentToday() >= this.DAY_MAX) { v.msg = I18n.t('rp.limit'); UI.refresh('report'); return; }
  const def = REPORT_CATS.find(c => c[0] === v.cat), ans = {};
  for (const [q] of def[2]) { const a = v.ans[q]; if (a == null || (Array.isArray(a) && !a.length) || a === '') continue; ans[q] = (Array.isArray(a) ? a.join(',') : String(a)).slice(0, 300); }
  v.step = 'sending'; UI.refresh('report');
  const res = await this.send(this.build(v.cat, ans, v.text, this.ctx || this.snapshot(), v.img, v.shot));
  v.step = 'done'; v.res = res; UI.refresh('report'); this.status();
 },
 addImg(file) {
  if (!file || !/^image\//.test(file.type)) return; const url = URL.createObjectURL(file), im = new Image();
  im.onload = () => { try { this.view.img = this.jpeg(im, 1280, 600000); } catch (e) { } URL.revokeObjectURL(url); UI.refresh('report'); };
  im.onerror = () => URL.revokeObjectURL(url); im.src = url;
 },
 render() {
  const v = this.view || (this.view = { step: 'pick', ans: {}, text: '', shot: true }), out = [];
  if (v.step === 'pick') {
   out.push(h('p', { class: 'hint', text: I18n.t('rp.intro') }),
    h('div', { class: 'rp-cats' }, ...REPORT_CATS.map(([id, em]) => h('button', { class: 'rp-cat', type: 'button', onclick: () => this.pick(id) }, h('span', { class: 'rp-em', text: em }), h('span', { class: 'rp-ct' }, h('b', { text: I18n.t('rp.c.' + id) }), h('span', { class: 'hint', text: I18n.t('rp.h.' + id) }))))));
   out.push(...this.history());
   return out;
  }
  if (v.step === 'sending') return [h('p', { class: 'rp-wait', text: I18n.t('rp.sending') })];
  if (v.step === 'done') {
   const r = v.res || {};
   return [h('div', { class: 'rp-done' }, h('p', { class: 'rp-big', text: r.ok ? I18n.t('rp.thanks') : I18n.t('rp.queued') }), r.id ? h('p', { class: 'hint', text: I18n.t('rp.no', [this.short(r.id)]) }) : null,
    h('div', { class: 'row center wrap' }, h('button', { class: 'chip', onclick: () => this.open() }, I18n.t('rp.another')), h('button', { class: 'chip primary', onclick: () => UI.closeWin('report') }, I18n.t('rp.close')))), ...this.history()];
  }
  // the form
  const def = REPORT_CATS.find(c => c[0] === v.cat) || REPORT_CATS[7];
  out.push(h('div', { class: 'rp-head' }, h('span', { class: 'rp-em', text: def[1] }), h('b', { text: I18n.t('rp.c.' + def[0]) })));
  for (const [q, kind, opts] of def[2]) {
   const box = h('div', { class: 'rp-q' }, h('div', { class: 'rp-ql', text: I18n.t('rp.q.' + q) }));
   if (kind === 'text') {
    const inp = h('input', { type: 'text', class: 'rp-in', maxlength: 300, value: v.ans[q] || '' }); inp.addEventListener('input', () => { v.ans[q] = inp.value; });
    box.append(inp); if (q === 'item' && this.ctx && this.ctx.learn) box.append(h('div', { class: 'hint', text: I18n.t('rp.q.itemNow', [this.ctx.learn]) }));
   } else {
    const list = opts || REPORT_WHERE, many = kind === 'many', cur = v.ans[q] || (many ? [] : '');
    box.append(h('div', { class: 'rp-chips' }, ...list.map(o => { const on = many ? cur.includes(o) : cur === o;
     return h('button', { class: 'chip sm' + (on ? ' on' : ''), type: 'button', 'aria-pressed': on ? 'true' : 'false', onclick: () => { if (many) { const a = v.ans[q] || (v.ans[q] = []); const i = a.indexOf(o); if (i >= 0) a.splice(i, 1); else a.push(o); } else v.ans[q] = v.ans[q] === o ? '' : o; v.msg = ''; UI.refresh('report'); } }, this.optText(q, def[0], o)); })));
   }
   out.push(box);
  }
  const free = !def[2].length, ta = h('textarea', { class: 'rp-text', rows: free ? 5 : 3, maxlength: 2000, placeholder: I18n.t('rp.ph.more') }); ta.value = v.text; ta.addEventListener('input', () => { v.text = ta.value; });
  out.push(h('div', { class: 'rp-q' }, h('div', { class: 'rp-ql', text: I18n.t(free ? 'rp.q.tell' : 'rp.q.more') }), ta));
  // pictures
  const file = h('input', { type: 'file', accept: 'image/*', hidden: true }); file.addEventListener('change', () => this.addImg(file.files && file.files[0]));
  const shot = h('input', { type: 'checkbox' }); shot.checked = v.shot !== false; shot.addEventListener('change', () => { v.shot = shot.checked; });
  out.push(h('div', { class: 'rp-att' },
   this.ctx && this.ctx.shot ? h('label', { class: 'rp-shot' }, shot, h('img', { src: this.ctx.shot, alt: '' }), h('span', { text: I18n.t('rp.shot') })) : null,
   v.img ? h('div', { class: 'rp-shot' }, h('img', { src: v.img, alt: '' }), h('span', { text: I18n.t('rp.imgOn') }), h('button', { class: 'chip sm', type: 'button', onclick: () => { v.img = ''; UI.refresh('report'); } }, I18n.t('rp.imgDel')))
    : h('button', { class: 'chip', type: 'button', onclick: () => file.click() }, ico('i_box', 18), I18n.t('rp.addImg')), file),
   h('p', { class: 'hint rp-note', text: I18n.t('rp.attach') }));
  if (v.msg) out.push(h('p', { class: 'rp-msg', role: 'alert', text: v.msg }));
  out.push(h('div', { class: 'row center wrap rp-act' }, h('button', { class: 'chip', type: 'button', onclick: () => { v.step = 'pick'; v.msg = ''; UI.refresh('report'); } }, I18n.t('rp.back')), h('button', { class: 'chip big primary', type: 'button', onclick: () => this.submit() }, ico('i_mail', 20), I18n.t('rp.send'))));
  return out;
 },
 history() {
  const mine = this.load(this.KEY_MINE).slice(0, 8); if (!mine.length) return [];
  return [h('div', { class: 'sub', text: I18n.t('rp.mine') }), h('ul', { class: 'rp-mine' }, ...mine.map(r => { const d = new Date(r.t || 0);
   return h('li', null, h('span', { class: 'num', text: (d.getMonth() + 1) + '/' + d.getDate() }), h('span', { class: 'rp-mc', text: I18n.t('rp.c.' + r.cat) }), h('span', { class: 'hint num', text: '#' + this.short(r.id) }), h('b', { class: 'rp-st rp-st-' + (r.sent ? r.status || 'unknown' : 'wait'), text: I18n.t('rp.st.' + (r.sent ? r.status || 'unknown' : 'wait')) })); }))];
 },
};

/* ---------------- hooks ---------------- */
window.addEventListener('error', e => { if (e && e.message) Report.noteError(e.message + (e.filename ? ' @' + String(e.filename).split('/').pop().split('?')[0] + ':' + e.lineno : '')); });
window.addEventListener('unhandledrejection', e => { const r = e && e.reason; const m = r && (r.message || r.code || String(r)); if (m && !/firestore|firebase|network|Failed to fetch|permission-denied|unavailable/i.test(String(m))) Report.noteError('promise: ' + m); });
(function () {
 UI.WIN.report = { t: I18n.t('rp.title'), i: 'i_mail', w: 540, at: ['c', 0] };
 UI.w_report = () => Report.render();
 if (typeof FULL_WINS !== 'undefined') FULL_WINS.add('report');
 // entry points: settings (every device) and the phone's "more" sheet
 const ws = UI.w_settings.bind(UI);
 UI.w_settings = function () { const out = ws(); const list = Array.isArray(out) ? out : [out]; list.push(h('div', { class: 'sub', text: I18n.t('rp.title') }), h('div', { class: 'row' }, h('button', { class: 'chip', onclick: () => Report.open() }, ico('i_mail', 20), I18n.t('rp.open')))); return list; };
 if (UI.w_more) { const wm = UI.w_more; UI.w_more = function () { const out = wm.call(this); const grid = out && out[0]; if (grid && grid.append) grid.append(h('button', { class: 'dock-btn', onclick: () => { this.closeWin('more'); Report.open(); } }, ico('i_mail', 32), h('span', { text: I18n.t('rp.open') }))); return out; }; }
 const css = document.createElement('style'); css.textContent = `
.rp-cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin:8px 0 12px}
.rp-cat{display:flex;gap:10px;align-items:center;text-align:left;padding:10px 12px;min-height:56px;border-radius:12px;border:2px solid var(--line,#d9cbb8);background:var(--paper-2,#fff8ee);color:inherit;cursor:pointer;font:inherit}
.rp-cat:hover,.rp-cat:focus-visible{border-color:var(--rose,#d77a7a)}
.rp-em{font-size:24px;line-height:1}.rp-ct{display:flex;flex-direction:column;gap:2px}.rp-ct .hint{font-size:12px}
.rp-head{display:flex;gap:8px;align-items:center;font-size:17px;margin:4px 0 8px}
.rp-q{margin:10px 0}.rp-ql{font-weight:700;margin-bottom:6px}.rp-chips{display:flex;flex-wrap:wrap;gap:6px}
.rp-in,.rp-text{width:100%;box-sizing:border-box;font:inherit;padding:8px 10px;border-radius:10px;border:2px solid var(--line,#d9cbb8);background:var(--well,#fff);color:var(--well-ink,inherit)}
.rp-text{resize:vertical;min-height:72px}
.rp-att{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:8px}
.rp-shot{display:flex;gap:8px;align-items:center;cursor:pointer}.rp-shot img{width:96px;height:auto;border-radius:6px;border:1px solid var(--line,#d9cbb8)}
.rp-shot input{width:22px;height:22px}.rp-note{font-size:12px;margin:6px 0 0}
.rp-msg{color:var(--rose,#c0504d);font-weight:700}.rp-act{margin-top:12px}.rp-wait{text-align:center;padding:30px 0}
.rp-done{text-align:center;padding:12px 0}.rp-big{font-size:18px;font-weight:700}
.rp-mine{list-style:none;padding:0;margin:6px 0}.rp-mine li{display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px dashed var(--line,#d9cbb8)}.rp-mine li .rp-mc{flex:1}
.rp-st{font-size:12px;padding:2px 8px;border-radius:999px;background:var(--chip,#efe3d3)}.rp-st-done{background:#cfe9cf;color:#24502a}.rp-st-doing{background:#fde7b5;color:#5d4200}.rp-st-wait{background:#f3d3d3;color:#6a2a2a}
body.m .rp-cats{grid-template-columns:1fr}body.m .rp-cat{min-height:60px}`;
 document.head.append(css);
 setTimeout(() => Report.flush(), 8000); window.addEventListener('online', () => Report.flush());
})();
