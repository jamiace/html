#!/usr/bin/env node
/* Simulated students for 呼嚕小窩 (one week).
   Each run is one time slot of one day. For every student it decides — from their persona and history — whether
   they open the game in this slot, and if so plays for real in a browser at human speed: daily review, practice,
   Meow Typo, quitting part-way, getting distracted. Their answers come from a simple memory model (prior knowledge
   from the 115 GSAT English distribution, forgetting, learning from feedback).

   node tools/sim/sim.cjs --slot night            # morning | noon | evening | night (default: from Taipei time)
   node tools/sim/sim.cjs --testers --login       # 0.92.48: the 30 test accounts of tools/sim/testers.json (小一～社會人士),
                                                  # signed in with .sim/accounts.json (downloaded from the back office), 14 days,
                                                  # slots morning | noon | after | evening | night | late; besides learning they
                                                  # also look after the cats, throw toys, play mini games, listen to music,
                                                  # decorate, run the focus timer and visit friends, each by their own taste
   options: --only sim01,sim02   --fast 20 (20x faster waits, for testing)   --state <dir>   --force (play regardless of odds)
            --tag test- (prefix for the device id, so test runs can be told apart from the real week)
   State (browser storage + memory model per student) lives in <repo>/.sim/ — keep that folder out of Git. */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..', '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const STATE = path.resolve(arg('state', path.join(ROOT, process.argv.includes('--testers') ? '.sim/testers' : '.sim')));
const TAG = String(arg('tag', '') || ''), FAST = +arg('fast', 1) || 1, ONLY = arg('only') ? String(arg('only')).split(',') : null, FORCE = !!arg('force');
const TESTERS = !!arg('testers'), LOGIN = !!arg('login');
const P = TESTERS ? testerPersonas() : JSON.parse(fs.readFileSync(path.join(__dirname, 'personas.json'), 'utf8'));
// testers.json -> the same shape as personas.json (one "type" per tester, built from their own slots and habits)
function testerPersonas() {
 const T = JSON.parse(fs.readFileSync(path.join(__dirname, 'testers.json'), 'utf8')), types = {};
 for (const t of T.testers) types[t.id] = { label: t.stage + '・' + t.personality, slot: t.slots, weekend: t.weekend, decay: t.decay, minutes: t.minutes, quit: t.age < 10 ? .15 : .08, days: t.daysPerWeek };
 return { types, students: T.testers.map(t => Object.assign({}, t, { type: t.id, typeLabel: types[t.id].label, cram: false })) };
}
const ACCOUNTS = (() => { const f = path.resolve(arg('accounts', path.join(ROOT, '.sim', 'accounts.json'))); if (!LOGIN) return {}; if (!fs.existsSync(f)) { console.error('[sim] --login needs ' + f + ' (back office → 玩家帳號 → 批次建立測試帳號 → 下載 accounts.json)'); process.exit(1); } const a = JSON.parse(fs.readFileSync(f, 'utf8')); return Object.fromEntries((a.accounts || a).map(x => [x.id, x])); })();
fs.mkdirSync(path.join(STATE, 'students'), { recursive: true }); fs.mkdirSync(path.join(STATE, 'logs'), { recursive: true });
const CFG_FILE = path.join(STATE, 'config.json');
const CFG = Object.assign({ base: 'https://jamiace.github.io/html/game/Purr_Cozy/', start: '', days: TESTERS ? 14 : 7, concurrency: TESTERS ? 4 : 8, maxMinutes: TESTERS ? 60 : 40 }, fs.existsSync(CFG_FILE) ? JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')) : {});

// ---------- time (Asia/Taipei) ----------
const taipei = (d = new Date()) => { const t = new Date(d.getTime() + 8 * 3600e3); return { date: t.toISOString().slice(0, 10), hour: t.getUTCHours() + t.getUTCMinutes() / 60, dow: t.getUTCDay() }; };
const NOW = taipei();
if (!CFG.start) { CFG.start = NOW.date; fs.writeFileSync(CFG_FILE, JSON.stringify(CFG, null, 1)); }
const DAY = Math.round((Date.parse(NOW.date) - Date.parse(CFG.start)) / 864e5);
const SLOT = arg('slot', TESTERS ? (NOW.hour < 3 ? 'late' : NOW.hour < 10 ? 'morning' : NOW.hour < 15 ? 'noon' : NOW.hour < 18 ? 'after' : NOW.hour < 21.5 ? 'evening' : 'night')
 : NOW.hour < 10 ? 'morning' : NOW.hour < 15 ? 'noon' : NOW.hour < 21 ? 'evening' : 'night');
const WEEKEND = NOW.dow === 0 || NOW.dow === 6;

// ---------- randomness ----------
const rnd = Math.random, between = (a, b) => a + (b - a) * rnd(), chance = p => rnd() < p;
const lognormal = (median, sigma = .35) => median * Math.exp(sigma * Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd()));
const sigmoid = x => 1 / (1 + Math.exp(-x));
const sleep = ms => new Promise(r => setTimeout(r, Math.max(0, ms / FAST)));
const realSleep = ms => new Promise(r => setTimeout(r, ms));   // the game's own timers (auto-advance after a right answer) run in real time

// ---------- student memory model ----------
// prior: chance the student already knows a word of level L (θ from GSAT 級分: 均標 8 -> 0)
const prior = (s, L) => sigmoid(1.6 * s.theta + 3.2 - .95 * L) * (s.english != null && s.english < 3 ? s.english / 3 : 1);   // 小一小二 know almost nothing
function memOf(st, s, w, L) {
 let m = st.mem[w];
 if (!m) { const known = chance(prior(s, L)); m = st.mem[w] = { S: known ? between(20, 60) : 0, last: Date.now(), L }; }
 return m;
}
function recall(st, s, w, L) {
 const m = memOf(st, s, w, L); if (!m.S) return prior(s, L) * .35;   // unknown words: occasional lucky guess / partial knowledge
 const days = (Date.now() - m.last) / 864e5; return Math.max(prior(s, L) * .5, Math.exp(-days / m.S));
}
function learn(st, s, w, ok, retrieval) {
 const m = st.mem[w]; if (!m) return; const days = (Date.now() - m.last) / 864e5;
 if (retrieval && ok) m.S = Math.max(m.S, 1) * (1.6 + .2 * s.theta + Math.min(1.4, days / Math.max(m.S, .5)));
 else if (retrieval && !ok) m.S = m.S ? Math.max(.3, m.S * .4) : (chance(.35 + .08 * s.theta) ? between(.3, .8) : 0);
 else if (!m.S) m.S = chance(.45 + .1 * s.theta) ? between(.4, 1.2) : 0;     // saw the meaning on a card
 m.last = Date.now();
}
function correctChance(st, s, w, L, type) {
 const r = recall(st, s, w, L);
 if (type === 'en2zh' || type === 'zh2en') return r + (1 - r) * .3;
 if (type === 'listen') return r * .92 + (1 - r * .92) * .28;
 if (type === 'spell') return r * s.typing * .88;
 if (type === 'listenspell') return r * s.typing * .75;
 return r;
}
function misspell(word) {
 const w = word.toLowerCase(), ops = [];
 const dbl = w.search(/(.)\1/); if (dbl >= 0) ops.push(() => w.slice(0, dbl) + w.slice(dbl + 1));
 if (/ie|ei/.test(w)) ops.push(() => w.replace(/ie|ei/, m => m === 'ie' ? 'ei' : 'ie'));
 if (w.length > 3) { const i = 1 + Math.floor(rnd() * (w.length - 2)); ops.push(() => w.slice(0, i) + w.slice(i + 1)); ops.push(() => w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2)); }
 ops.push(() => w.replace(/[aeiou]/, v => 'aeiou'.replace(v, '')[Math.floor(rnd() * 4)]));
 if (w.length > 5) ops.push(() => w.slice(0, Math.ceil(w.length * between(.4, .8))));
 ops.push(() => /e$/.test(w) ? w.slice(0, -1) : w + 'e');
 const out = ops[Math.floor(rnd() * ops.length)](); return out === w ? w + w[w.length - 1] : out;
}

// ---------- should this student play now? ----------
function decide(s, st) {
 const T = P.types[s.type]; if (DAY >= CFG.days) return { play: false, why: 'week over' };
 if (DAY < s.startDay) return { play: false, why: 'not installed yet' };
 if (!st.first) {   // install day: plays once, in the evening or at night
  if (!st.installSlot) st.installSlot = chance(.5) ? 'evening' : 'night';
  return SLOT === st.installSlot || (SLOT === 'night' && !st.first) ? { play: true, first: true } : { play: false, why: 'installs later today' };
 }
 if (st.quit) return { play: false, why: 'gave up' };
 let p = T.slot[SLOT] * st.motivation * (WEEKEND ? (T.weekend || 1.2) : 1) * (s.cram && SLOT === 'evening' && !WEEKEND ? .3 : 1);
 if (st.lastDay === DAY && st.slotsToday >= 1) p *= .35;              // already played today
 return { play: FORCE || chance(Math.min(.95, p)), p: +p.toFixed(3) };
}
function newDay(s, st) {   // motivation drifts once per day
 if (st.today === DAY) return; const T = P.types[s.type];
 if (st.first && st.today != null) { const gone = DAY - st.today; st.motivation *= Math.pow(T.decay, gone); if (st.lastAcc != null) st.motivation *= st.lastAcc < .5 ? .85 : st.lastAcc > .8 ? 1.04 : 1; if (st.motivation < .04) st.quit = true; }
 st.today = DAY; st.slotsToday = 0;
}

// ---------- shared asset cache, so 30 browsers download the game once ----------
const cache = new Map();
async function route(context) {
 await context.route(u => u.href.startsWith(CFG.base), async r => {
  const req = r.request(), url = req.url(); if (req.method() !== 'GET' || /version\.json/.test(url)) return r.continue();
  const hit = cache.get(url); if (hit) return r.fulfill({ status: 200, headers: hit.headers, body: hit.body });
  try { const res = await r.fetch(); const body = await res.body(); if (res.status() === 200 && body.length < 30e6) cache.set(url, { headers: res.headers(), body }); return r.fulfill({ response: res, body }); }
  catch (e) { return r.abort(); }
 });
}

// ---------- one student's visit ----------
async function visit(browser, s, st, plan, log) {
 const phone = s.phone, context = await browser.newContext({
  viewport: phone ? { width: 390, height: 780 } : { width: 1366, height: 820 }, isMobile: phone, hasTouch: phone, locale: 'zh-TW', timezoneId: 'Asia/Taipei',
  storageState: st.storage || undefined, ...(s.device === 'tablet' ? { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true } : {}), userAgent: phone ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : undefined });
 await context.addInitScript(id => { try { if (!localStorage.getItem('pocketnook.device')) localStorage.setItem('pocketnook.device', id + '-' + Math.random().toString(36).slice(2, 10)); } catch (e) { } }, TAG + s.id);
 if (!arg('direct')) await route(context);   // --direct: no shared cache (local test servers)
 const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
 const ev = (fn, a) => page.evaluate(fn, a);
 try {
  await page.goto(CFG.base + 'index.html', { timeout: 120000 });
  await page.waitForFunction(() => !document.getElementById('loading') && typeof Learn !== 'undefined' && Game.S, null, { timeout: 480000, polling: 1000 });
  await sleep(lognormal(4000));
  if (TESTERS) await setupTester(page, s, log);
  await ev(levels => { for (const w of Object.keys(UI.wins || {})) if (UI.wins[w] && !UI.wins[w].el.hidden) UI.closeWin(w); const L = Game.S.learn; if (!L.levels || L.levels.join() !== levels.join()) { L.levels = levels.length === 6 ? [] : levels; Game.save(); } }, s.levels);
  const end = Date.now() + plan.minutes * 60000 / FAST;
  let quitting = false;
  while (Date.now() < end && !quitting) {
   const info = await ev(() => ({ daily: !!Game.S.learn.dailyDone, grade: typeof Placement !== 'undefined' && Placement.done() && Placement.todayDone() }));
   const options = TESTERS ? Object.entries(s.likes).map(([k, w]) => [k, w * (k === 'daily' && info.daily ? .1 : k === 'grade' && info.grade ? .05 : 1)])
    : [['daily', info.daily ? .15 : 1.4], ['practice', .5], ['typo', .5]].map(([k, w]) => [k, w * (s.likes[k] || .3)]);
   const kind = (() => { let r = rnd() * options.reduce((t, x) => t + x[1], 0); for (const [k, w] of options) if ((r -= w) <= 0) return k; return 'practice'; })();
   const res = kind === 'typo' || kind === 'mini' && chance(.2) ? await typo(page, s, st, plan, log) : ['cat', 'mini', 'music', 'decor', 'focus', 'social'].includes(kind) ? await play(page, s, kind, log) : await quiz(page, s, st, plan, log, kind === 'story' ? 'practice' : kind);
   log.activities.push(res); if (res.quit) quitting = true;
   if (!quitting) await sleep(lognormal(9000, .6));   // look around the room, pet the cat...
   if (chance(.25)) quitting = true;                   // "enough for today"
  }
  // leaving: the page goes to the background (pagehide closes an unfinished session), the queue uploads
  await ev(() => { dispatchEvent(new Event('pagehide')); Game.save(); });
  for (let i = 0; i < 20; i++) { const q = await ev(() => (typeof LearnLog !== 'undefined' ? LearnLog.queue().length : 0)); if (!q) break; await ev(() => LearnLog.flush()); await new Promise(r => setTimeout(r, 1500)); }
  log.queueLeft = await ev(() => (typeof LearnLog !== 'undefined' ? LearnLog.queue().length : -1));
  log.lid = await ev(() => (typeof LearnLog !== 'undefined' ? LearnLog.lid : ''));
  st.storage = await context.storageState({ indexedDB: true });
 } catch (e) { log.error = String(e && e.message || e).slice(0, 300); }
 finally { log.pageErrors = errors.slice(0, 5); await context.close(); }
}

async function quiz(page, s, st, plan, log, kind) {
 const ev = (fn, a) => page.evaluate(fn, a), out = { kind, answers: 0, right: 0, cards: 0, done: false, quit: false };
 const started = await ev(k => { if (k === 'daily' && Game.S.learn.dailyDone) k = 'practice'; UI.openWin('learn'); Learn.start(k); return !!Learn.sess && Learn.sess.kind; }, kind);
 if (!started) return out; out.kind = started;
 const T = P.types[s.type]; let n = 0;
 for (let guard = 0; guard < 400; guard++) {
  const q = await ev(() => { const s = Learn.sess; if (!s) return null; if (s.step === 'review' || s.step === 'pause') { const i = s.words[s.ri]; return { step: s.step, w: VOCAB[i].w, L: VOCAB[i].t, ri: s.ri, n: s.words.length }; }
   if (s.step === 'quiz') { if (s.ans) return { step: 'wait' }; const q = s.qs[s.qi]; return { step: 'quiz', i: q.i, w: VOCAB[q.i].w, L: VOCAB[q.i].t, type: q.type, opts: q.opts, qi: s.qi }; }
   return { step: s.step, result: !!s.result }; });
  if (!q) break;
  if (q.step === 'result') { out.done = true; await sleep(lognormal(4000)); await ev(() => UI.closeWin('study')); break; }
  if (q.step === 'wait') { await realSleep(300); guard--; continue; }
  if (q.step === 'pause') { if (chance(.88 * Math.min(1, st.motivation + .3))) { await sleep(lognormal(2000)); await ev(() => Learn.more()); continue; } out.quit = true; break; }
  if (q.step === 'review') {
   if (started !== 'daily' && chance(.5)) { await ev(() => Learn.skipReview()); continue; }
   const r = recall(st, s, q.w, q.L), sure = chance(r), knew = sure || !chance(s.honesty);
   await sleep(lognormal((sure ? 2400 : 4800) * s.speed));
   if (chance(s.distract)) await sleep(between(15000, 90000));
   await ev(k => Learn.review(k), knew); learn(st, s, q.w, true, false); out.cards++; continue;
  }
  // quiz question
  if (chance(T.quit / 8)) { out.quit = true; break; }                       // closes the app mid-quiz
  const p = correctChance(st, s, q.w, q.L, q.type), ok = chance(p), typed = q.type === 'spell' || q.type === 'listenspell';
  const think = typed ? 3800 + 420 * q.w.length : 2600;
  await sleep(lognormal(think * s.speed * (p < .6 ? 1.7 : 1) * (1 + .015 * n)));
  if (chance(s.distract)) await sleep(between(15000, 90000));
  let val;
  if (typed) val = ok ? q.w : misspell(q.w);
  else { const wrong = q.opts.filter(o => o !== q.i); val = ok ? q.i : wrong[Math.floor(rnd() * wrong.length)]; }
  const got = await ev(v => { Learn.answer(v); return Learn.sess && Learn.sess.ans ? !!Learn.sess.ans.ok : null; }, val);
  if (got == null) continue;
  out.answers++; n++; if (got) out.right++; learn(st, s, q.w, got, true);
  if (got) { await sleep(1400); await realSleep(1200); } else { await sleep(lognormal(2600 * s.speed)); await ev(() => Learn.next()); }
 }
 return out;
}

async function typo(page, s, st, plan, log) {
 const ev = (fn, a) => page.evaluate(fn, a), out = { kind: 'typo', words: 0, right: 0, done: false, quit: false };
 const ok0 = await ev(() => { if (typeof CatsTypo === 'undefined') return false; UI.openWin('catstypo'); CatsTypo.start(); return !!CatsTypo.session; });
 if (!ok0) return out;
 for (let guard = 0; guard < 40; guard++) {
  const cur = await ev(() => { const S = CatsTypo.session; if (!S) return null; if (S.done) return { done: true }; const v = CatsTypo.current(); return { w: v.w, L: v.t, answered: !!S.answered, at: S.at }; });
  if (!cur) break; if (cur.done) { out.done = true; await sleep(lognormal(3000)); await ev(() => UI.closeWin('catstypo')); break; }
  if (cur.answered) { await sleep(2500); await realSleep(800); await ev(at => { if (CatsTypo.session && CatsTypo.session.at === at && CatsTypo.session.answered) CatsTypo.advance(); }, cur.at); continue; }
  if (chance(P.types[s.type].quit / 6)) { out.quit = true; break; }
  const r = recall(st, s, cur.w, cur.L); let solved = false;
  for (let attempt = 0; attempt < 3 && !solved; attempt++) {
   const ok = chance(r * s.typing * (attempt ? .7 : 1));
   await sleep(lognormal((2500 + 520 * cur.w.length) * s.speed));
   if (chance(s.distract)) await sleep(between(15000, 60000));
   const text = ok ? cur.w.toLowerCase() : misspell(cur.w);
   solved = await ev(t => { CatsTypo.active = true; CatsTypo.setValue ? CatsTypo.setValue(t) : (CatsTypo.value = t); CatsTypo.value = t; CatsTypo.submit(); return !!(CatsTypo.session && CatsTypo.session.answered); }, text);
   if (!solved && attempt === 2 || (!solved && chance(.25))) break;
   if (!solved) await sleep(lognormal(2000));
  }
  if (!solved) { await sleep(lognormal(2500)); await ev(() => CatsTypo.reveal()); }
  out.words++; if (solved) out.right++; learn(st, s, cur.w, solved, true);
  await sleep(lognormal(2500));
 }
 return out;
}

// ---------- testers (0.92.48): language, sign-in, and the non-learning things they like doing ----------
async function setupTester(page, s, log) {
 const ev = (fn, a) => page.evaluate(fn, a);
 const lang = await ev(l => { let cur = ''; try { cur = localStorage.getItem('purr-cozy.language') || 'zh-TW'; } catch (e) { } if (cur !== l) { try { localStorage.setItem('purr-cozy.language', l); } catch (e) { } return 'reload'; } return cur; }, s.lang || 'zh-TW');
 if (lang === 'reload') { await page.reload({ timeout: 120000 }); await page.waitForFunction(() => !document.getElementById('loading') && typeof Learn !== 'undefined' && Game.S, null, { timeout: 480000, polling: 1000 }); }
 const acc = ACCOUNTS[s.id];
 if (acc) {
  const who = await ev(() => typeof Cloud !== 'undefined' && Cloud.user ? Cloud.user.email : '');
  if (who !== acc.email) {
   await page.waitForFunction(() => typeof Cloud !== 'undefined' && Cloud.fb, null, { timeout: 60000 }).catch(() => { });
   const r = await ev(async a => { try { if (Cloud.user) await Cloud.fb.signOut(); await Cloud.fb.signIn(a.email, a.password); return 'ok'; } catch (e) { return (e && e.code) || String(e); } }, acc);
   log.login = r;
   await page.waitForFunction(e => Cloud.user && Cloud.user.email === e && ['synced', 'saving'].includes(Cloud.status), acc.email, { timeout: 60000 }).catch(() => { log.login += ' (sync timeout)'; });
  } else log.login = 'kept';
  await sleep(1500);
 }
 // the first visit: the placement window asks for the school grade; adults pick 不想說
 await ev(d => { const g = typeof Placement !== 'undefined' && Placement.S(); if (g && !g.declared && d) g.declared = d; for (const w of Object.keys(UI.wins || {})) if (UI.wins[w] && !UI.wins[w].el.hidden) UI.closeWin(w); }, s.declared || 0);
}
async function play(page, s, kind, log) {
 const ev = (fn, a) => page.evaluate(fn, a), out = { kind, steps: 0 }, M = between(...s.minutes) * 60000 * between(.25, .6);
 const end = Date.now() + M / FAST;
 try {
  if (kind === 'music') { out.steps = await ev(() => { if (typeof Music === 'undefined') return 0; if (!Music.playing) Music.toggle(); return 1; }); await sleep(M * (s.likes.music > .8 ? 1.5 : 1)); if (chance(.5)) await ev(() => { if (Music.playing) Music.toggle(); }); return out; }
  if (kind === 'focus') { await ev(() => { if (!Game.T().running) Game.start(); }); await sleep(M); await ev(() => { if (Game.T().running) Game.pause(); }); out.steps = 1; return out; }
  if (kind === 'social') { await ev(() => { UI.openWin('friends'); }); await sleep(lognormal(6000)); await ev(() => { if (typeof Social !== 'undefined' && Social.ready && Social.ready()) { UI.frTab = 'board'; Social.loadBoard('lvl'); UI.refresh('friends'); } }); await sleep(lognormal(8000)); await ev(() => UI.closeWin('friends')); out.steps = 2; return out; }
  while (Date.now() < end) {
   out.steps++;
   if (kind === 'cat') await ev(() => {
    const pets = PetPlay.pets(); if (!pets.length) return; const a = pets[Math.floor(Math.random() * pets.length)], p = a.data, r = Math.random();
    PetPlay.trayOpen = true;
    if (p && p.hunger < 50 && PetPlay.owned('cat_can')) { PetPlay.pick('cat_can'); PetPlay.down(a.x, a.y - 7); }
    else if (r < .45 && (Pets.Z.tools.ball || Pets.Z.tools.yarn || Life.L.bag.catnip)) { const k = Pets.Z.tools.ball ? 'ball' : Pets.Z.tools.yarn ? 'yarn' : 'catnip'; PetPlay.pick(k); PetPlay.down(a.x + 20 - Math.random() * 40, Math.max(110, Math.min(160, a.y + 4))); }
    else if (r < .7 && Pets.Z.tools.brush) { PetPlay.pick('brush'); PetPlay.down(a.x, a.y - 7); }
    else { PetPlay.drop(); if (a.poke) a.poke(); else Game.interact && Game.interact; }
   });
   else if (kind === 'mini') await ev(() => {
    const it = Game.S.items.find(i => ITEMS[i.k] && ITEMS[i.k].cozyGame) || Game.S.items.find(i => ITEMS[i.k] && ITEMS[i.k].interactionProfile && ITEMS[i.k].interactionProfile !== 'native');
    if (it) Game.interact(it); else { UI.openWin('catstypo'); }
   });
   else if (kind === 'decor') await ev(() => {
    if (!Room.edit) UI.setEdit(true); const items = Game.S.items.filter(i => ITEMS[i.k] && ITEMS[i.k].layer !== 'wall' && i.p == null); const it = items[Math.floor(Math.random() * items.length)]; if (!it) return;
    Room.sel = it; it.x += Math.round(Math.random() * 16 - 8); Room.clampItem(it); if (Math.random() < .2) it.flip = !it.flip; Game.save(); UI.editToolbar();
    if (Math.random() < .25) UI.openWin('shop');
   });
   await sleep(lognormal(kind === 'decor' ? 7000 : 5000));
   if (kind === 'mini') await sleep(lognormal(25000));
   await ev(() => { for (const w of ['cozygame', 'furnplay', 'shop', 'catstypo']) if (UI.wins[w] && !UI.wins[w].el.hidden) UI.closeWin(w); });
   if (chance(.15)) break;
  }
  if (kind === 'decor') await ev(() => { if (Room.edit) UI.setEdit(false); });
 } catch (e) { out.error = String(e && e.message || e).slice(0, 160); }
 return out;
}

// ---------- run one slot ----------
(async () => {
 const students = P.students.filter(s => !ONLY || ONLY.includes(s.id)), plans = [];
 const states = {};
 for (const s of students) {
  const f = path.join(STATE, 'students', s.id + '.json');
  const st = states[s.id] = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { mem: {}, motivation: 1, history: [] };
  newDay(s, st);
  const d = decide(s, st);
  if (d.play) { const T = P.types[s.type]; let m = between(...T.minutes) * (d.first ? 1.4 : 1) * (WEEKEND ? 1.2 : 1); if (chance(.07)) m *= 2.5; plans.push({ s, st, minutes: Math.min(CFG.maxMinutes, +m.toFixed(1)), first: !!d.first, p: d.p }); }
  else st.history.push({ day: DAY, date: NOW.date, slot: SLOT, played: false, why: d.why || 'p=' + d.p });
 }
 console.log(`[sim] ${NOW.date} day ${DAY + 1}/${CFG.days} slot ${SLOT}${WEEKEND ? ' (weekend)' : ''}: ${plans.length}/${students.length} students play` + (FAST > 1 ? ` (fast x${FAST})` : ''));
 const browser = plans.length ? await chromium.launch() : null, logs = [];
 let at = 0; const worker = async () => { while (at < plans.length) { const pl = plans[at++]; const log = { id: pl.s.id, nick: pl.s.nick, type: pl.s.typeLabel, minutes: pl.minutes, first: pl.first, activities: [] }; const t0 = Date.now();
   await visit(browser, pl.s, pl.st, pl, log); log.realMinutes = +((Date.now() - t0) / 60000).toFixed(1);
   const ans = log.activities.reduce((a, x) => a + (x.answers || 0) + (x.words || 0), 0), right = log.activities.reduce((a, x) => a + (x.right || 0), 0);
   pl.st.first = pl.st.first || NOW.date; pl.st.lastDay = DAY; pl.st.slotsToday = (pl.st.slotsToday || 0) + 1; if (ans) pl.st.lastAcc = right / ans;
   pl.st.history.push({ day: DAY, date: NOW.date, slot: SLOT, played: true, minutes: log.realMinutes, answers: ans, right, error: log.error || undefined });
   logs.push(log); console.log(`[sim] ${pl.s.id} ${pl.s.nick} (${pl.s.typeLabel}) ${log.realMinutes} min, ${ans} answers, ${right} right${log.error ? ' ERROR ' + log.error : ''}${log.queueLeft ? ' queue ' + log.queueLeft : ''}`);
   fs.writeFileSync(path.join(STATE, 'students', pl.s.id + '.json'), JSON.stringify(pl.st)); } };
 await Promise.all(Array.from({ length: Math.min(CFG.concurrency, plans.length) }, worker));
 if (browser) await browser.close();
 for (const s of students) if (!plans.find(p => p.s === s)) fs.writeFileSync(path.join(STATE, 'students', s.id + '.json'), JSON.stringify(states[s.id]));
 fs.writeFileSync(path.join(STATE, 'logs', `${NOW.date}-${SLOT}.json`), JSON.stringify({ date: NOW.date, day: DAY, slot: SLOT, weekend: WEEKEND, played: logs }, null, 1));
 console.log('[sim] done');
})();
