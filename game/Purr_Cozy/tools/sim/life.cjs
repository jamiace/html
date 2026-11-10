#!/usr/bin/env node
/* ============================================================
   呼嚕小窩：30 位測試者的「生活模擬」（0.92.48，取代 sim.cjs 的 --testers 擲骰模式）
   每個人是一個會變化的使用者，而不是固定機率：
     - 黏著度：動機 M（每次玩得開不開心會改變）、習慣 H（連續來會累積、不來會流失）、新鮮感 N（隨天數衰退）
       → 當天的投入程度 E = M × (0.4 + 0.6H) + N
     - 一天開幾次：負二項分布（同樣的平均，有人天天穩定、有人時多時少），平均 = 每天基準次數 × E × 週末／事件 × 觸發
       （連續天數快斷了、貓很久沒照顧、好友來拜訪、商人換貨、今天還沒測程度…各人在意的不同）
     - 幾點開：每個人自己的作息曲線（平日／假日不同的高峰），上學、上班、補習、睡覺的時間不會開；開完有機率很快又開一次（短頻多次）
     - 一次多久：對數常態分布 + 偶爾的「馬拉松」；不同類型差很多（3 分鐘的通勤族、3 小時開著音樂的學生）
     - 流失與回流：投入程度連續幾天太低就「休眠」，之後每天有小機率回來（週末、好友邀請時較高）
     - 遊戲裡做什麼：依喜好的馬可夫鏈，會被「今天任務還沒做」「貓餓了」等吸引，討厭的事會讓他提早離開；
       英文作答依每個人的程度（年級 θ）與單字的年級，用三參數邏輯模型決定，會學習、也會忘
   指令：
     node tools/sim/life.cjs preview [--days 14] [--seed 7]       不開瀏覽器，先模擬兩週，看每個人會怎麼玩（寫到 .sim/life/preview.md）
     node tools/sim/life.cjs run [--login] [--start 2026-11-09]    常駐執行兩週：每天 06:00 排當天行程，時間到就開瀏覽器去玩
     node tools/sim/life.cjs once [--window 30] [--login]          只執行接下來 30 分鐘內要開始的場次就結束（給排程任務用）
     node tools/sim/life.cjs status                                今天的行程與進度
     node tools/sim/life.cjs pack --to <資料夾> / unpack --from <資料夾>   把狀態拆成小檔（雲端排程用：每次執行前後存取狀態）
     node tools/sim/life.cjs summary --date 2026-11-09              某一天的統計（JSON）
   雲端排程（每小時一次）：unpack → once --window 60 --login --no-store → pack，場次超過這一小時的部分留到下一次接著玩。
   其他：--only sim01,sim05  --fast 20（等待縮短，測試用）  --test-now（今天的場次立刻開始，測試用）  --base <網址>  --concurrency 6  --direct（不用共用快取）
   狀態：<專案>/.sim/life/（state.json、logs/日期.jsonl、各人的瀏覽器存檔），已在 .gitignore 的 .sim/ 底下。
   ============================================================ */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const argv = process.argv.slice(2), CMD = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'preview';
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
const DIR = path.resolve(arg('state', path.join(ROOT, '.sim', 'life'))); fs.mkdirSync(path.join(DIR, 'logs'), { recursive: true }); fs.mkdirSync(path.join(DIR, 'browser'), { recursive: true });
const PEOPLE = JSON.parse(fs.readFileSync(path.join(__dirname, 'people.json'), 'utf8')).people.filter(p => !arg('only') || String(arg('only')).split(',').includes(p.id));
const DAYS = +arg('days', 14), FAST = +arg('fast', 1) || 1, BASE = String(arg('base', 'https://jamiace.github.io/html/game/Purr_Cozy/'));

// ---------- random numbers (seeded for preview, so the same seed gives the same two weeks) ----------
let seed = +arg('seed', Date.now() % 2147483647) || 7;
const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
const chance = p => rnd() < p, between = (a, b) => a + (b - a) * rnd();
const normal = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
const lognormal = (median, sigma) => median * Math.exp(sigma * normal());
const gamma = k => { if (k < 1) return gamma(1 + k) * Math.pow(rnd(), 1 / k); const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d); for (;;) { let x, v; do { x = normal(); v = 1 + c * x; } while (v <= 0); v = v * v * v; const u = rnd(); if (u < 1 - .0331 * x ** 4 || Math.log(u) < .5 * x * x + d * (1 - v + Math.log(v))) return d * v; } };
const poisson = m => { if (m <= 0) return 0; if (m > 30) return Math.max(0, Math.round(m + Math.sqrt(m) * normal())); let L = Math.exp(-m), k = 0, p = 1; do { k++; p *= rnd(); } while (p > L); return k - 1; };
const negbin = (mean, k) => poisson(mean * gamma(k) / k);   // same mean, extra day-to-day spread (smaller k = burstier)
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ---------- time in Taiwan (UTC+8, no daylight saving) ----------
const TZ = 8 * 3600e3;
const tw = t => { const d = new Date(t + TZ); return { date: d.toISOString().slice(0, 10), dow: d.getUTCDay(), min: d.getUTCHours() * 60 + d.getUTCMinutes() }; };
const at = (date, minute) => Date.parse(date + 'T00:00:00Z') - TZ + minute * 60e3;
const addDays = (date, n) => new Date(Date.parse(date) + n * 864e5).toISOString().slice(0, 10);
const hm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`;
const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const dayMatch = (spec, dow) => spec === 'all' || (spec === 'wd' && dow >= 1 && dow <= 5) || (spec === 'we' && (dow === 0 || dow === 6)) || spec.split(',').includes(DOW[dow]);
function blocked(p, dow, minute) {
 for (const [days, a, b] of p.life.blocked) { const s = toMin(a), e = toMin(b);
  if (s <= e) { if (dayMatch(days, dow) && minute >= s && minute < e) return true; }
  else { if (dayMatch(days, dow) && minute >= s) return true; if (dayMatch(days, (dow + 6) % 7) && minute < e) return true; } }
 return false;
}
const freeFor = (p, dow, minute, len) => { let m = 0; while (m < len && !blocked(p, dow, (minute + m) % 1440) && minute + m < 1440 + 120) m += 1; return m; };

// ---------- one person's state ----------
function newState(p) { const e = p.engagement; return { device: 'test-' + (p.shareDevice && p.id > p.shareDevice ? p.shareDevice : p.id) + '-' + Math.random().toString(36).slice(2, 8), M: e.M0, H: 0, N: e.N0, dormant: false, low: 0, streak: 0, lastPlay: -99, playedDays: 0, sessions: 0, minutes: 0, sat: [], mem: {}, theta: p.english.grade, grade: null, daily: {}, history: [] }; }
function engagementOf(p, st, day) { const e = p.engagement; st.N = e.N0 * Math.pow(.5, day / e.half); return clamp(st.M * (.4 + .6 * st.H) + st.N, 0, 1.6); }

// ---------- plan one day ----------
function planDay(p, st, day, date) {
 const e = p.engagement, dow = new Date(date + 'T12:00:00Z').getUTCDay(), weekend = dow === 0 || dow === 6;
 const out = { day, date, E: 0, sessions: [], why: [] };
 if (day < p.startDay) { out.why.push('還沒開始玩'); return out; }
 const ev = p.life.events.find(x => x[0] === day + 1); let factor = ev ? ev[1] : 1; if (ev) out.why.push(ev[2]);
 const E = out.E = engagementOf(p, st, day);
 let mean;
 if (day === p.startDay) mean = 1;                                   // install day
 else if (st.dormant) { const back = e.revive * (weekend ? 1.6 : 1) * (1 + (p.triggers.friend || 0) * (chance(.3) ? 1 : 0)); if (!chance(back)) { out.why.push('休眠中'); return out; } st.dormant = false; st.M = Math.max(st.M, .55); st.low = 0; out.why.push('回流'); mean = Math.max(1, e.lam * .6); }
 else {
  mean = e.lam * E * (weekend ? (e.wkend || 1.15) : 1) * factor;
  const T = p.triggers; let pull = 0;
  if (T.streak && st.streak >= 2) pull += .35 * T.streak;                       // 連續天數快斷了
  if (T.pet && day - st.lastPlay >= 1) pull += .3 * T.pet;                       // 貓很久沒照顧
  if (T.task) pull += .15 * T.task;
  if (T.grade) pull += .15 * T.grade;
  if (T.merchant && dow === 1) pull += .3 * T.merchant;                         // 商人週一換貨
  if (T.friend && chance(.35)) pull += .4 * T.friend;                           // 好友來拜訪、團隊進度
  mean += pull * e.lam * Math.min(1, E + .3) * factor;
 }
 let n = day === p.startDay ? 1 : Math.min(14, negbin(mean, e.k));
 const peaks = weekend ? p.life.weekend : p.life.weekday, tot = peaks.reduce((s, x) => s + x[2], 0);
 const pickStart = () => { for (let i = 0; i < 60; i++) { let r = rnd() * tot, pk = peaks[0]; for (const x of peaks) if ((r -= x[2]) <= 0) { pk = x; break; } const m = Math.round(((pk[0] + pk[1] * normal()) * 60 + 1440) % 1440); if (!blocked(p, dow, m)) return m; } return null; };
 const lengthOf = (first) => { let L = chance(e.mara[0]) ? lognormal(e.mara[1], .4) : lognormal(e.sess[0] * (.7 + .5 * Math.min(1.2, E)), e.sess[1]); if (first) L *= 1.5; return clamp(L, 1, 300); };
 const starts = [];
 for (let i = 0; i < n; i++) { const m = pickStart(); if (m == null) continue; if (starts.some(s => Math.abs(s - m) < 20)) { i--; n--; continue; } starts.push(m); }
 starts.sort((a, b) => a - b);
 for (const m of starts) {
  const len = Math.min(lengthOf(day === p.startDay), freeFor(p, dow, m, 300));
  if (len < 1) continue;
  out.sessions.push({ start: m, len: +len.toFixed(1) });
  if (chance(e.burst)) { const m2 = Math.round(m + len + lognormal(e.gap, .5)); if (m2 < 1440 && !blocked(p, dow, m2) && !starts.some(s => Math.abs(s - m2) < 15)) { const l2 = Math.min(lognormal(e.sess[0] * .6, e.sess[1]), freeFor(p, dow, m2, 300)); if (l2 >= 1) out.sessions.push({ start: m2, len: +clamp(l2, 1, 120).toFixed(1), burst: true }); } }
 }
 out.sessions.sort((a, b) => a.start - b.start);
 return out;
}
// after the day: habit, motivation, dormancy
function endDay(p, st, day, played, sats) {
 const e = p.engagement;
 if (played) { st.H += e.gain * (1 - st.H); st.streak = st.lastPlay === day - 1 ? st.streak + 1 : 1; st.lastPlay = day; st.playedDays++; const s = sats.reduce((a, b) => a + b, 0) / sats.length; st.M = clamp((st.M + .2 * (s - .5)) * (e.bore ?? .98), 0, 1.2); }
 else { st.H *= 1 - e.loss; st.M = clamp(st.M - .02, 0, 1.2); if (st.lastPlay !== day - 1) st.streak = 0; }
 const E = engagementOf(p, st, day + 1);
 st.low = E < e.quit ? st.low + 1 : 0; if (st.low >= e.qd && !st.dormant) { st.dormant = true; st.history.push({ day, event: '休眠' }); }
}

// ---------- inside a session: what to do next ----------
const ALIAS = { piano: 'music', photo: 'cat', gacha: 'mini', collect: 'shop', story: 'merchant' };   // 商人故事 = visiting the weekly merchant
const DWELL = { contest: 5, look: .6, daily: 5, practice: 4, typo: 3.5, grade: 3, story: 5, merchant: 6, storyq: 4, cat: 2, toys: 2, mini: 4, music: 12, decor: 6, shop: 2, focus: 25, social: 2, tasks: .6 };
const LEARN = ['daily', 'practice', 'typo', 'grade', 'story', 'storyq', 'contest'];
// 0.92.49 程度挑戰賽: nobody is told to join. People who already like tests (程度小測, practice, spelling) are drawn to it,
// people who dislike quizzes mostly ignore it, pure cat / music players almost never open it.
function contestPull(p) { const P = p.play.prefs; if (P.contest != null) return P.contest; let x = .6 * (P.grade || 0) + .3 * (P.practice || 0) + .2 * (P.typo || 0) + .1 * (P.daily || 0) + .15 * (p.triggers.grade || 0); if (p.play.dislikes.some(d => ['quiz', 'forced_learning', 'learning_tasks'].includes(d))) x *= .2; if (p.play.dislikes.includes('too_easy')) x *= 1.3; return +x.toFixed(3); }
// 0.92.53: weekly merchant (shop + 5 story chapters with lore cards), weekly tasks, daily 程度小測 — nobody is told to do them;
// the pull comes from each person's own tastes, the same way as the contest.
function merchantPull(p) { const P = p.play.prefs, T = p.triggers, D = p.play.dislikes; let x = .05 + (P.story || 0) + .5 * (T.merchant || 0) + .15 * ((P.shop || 0) + (P.collect || 0) + (P.gacha || 0)) + .05 * (P.decor || 0);
 if (D.some(d => ['reading', 'long_text'].includes(d))) x *= .3; if (D.includes('popups') || D.includes('complex_ui')) x *= .5; return +x.toFixed(3); }
function tasksPull(p) { const P = p.play.prefs, T = p.triggers, D = p.play.dislikes; let x = P.tasks != null ? P.tasks : .35 * (T.task || 0) + .15 * (T.streak || 0) + .1 * (T.grade || 0);
 if (D.some(d => ['tasks', 'forced_daily', 'gamification', 'nagging'].includes(d))) x *= .2; return +x.toFixed(3); }
function gradePull(p) { const P = p.play.prefs, T = p.triggers, D = p.play.dislikes; if (P.grade != null) return P.grade; if (D.some(d => ['quiz', 'show_grade', 'forced_learning', 'learning_tasks'].includes(d))) return 0;
 return +(.25 * (T.task || 0) + .15 * (T.streak || 0) + .1 * (P.daily || 0)).toFixed(3); }   // 程度小測 sits in the daily task list
function prefsOf(p) { const w = {}; for (const [k, v] of Object.entries(p.play.prefs)) { const a = ALIAS[k] || k; if (a === 'merchant' || a === 'tasks' || a === 'grade') continue; w[a] = (w[a] || 0) + v; } w.look = w.look || .15;
 const c = contestPull(p); if (c > .02) w.contest = c; const m = merchantPull(p); if (m > .02) w.merchant = m; const t = tasksPull(p); if (t > .02) w.tasks = t; const g = gradePull(p); if (g > .02) w.grade = g; return w; }
function nextActivity(p, st, ses, today) {
 const w = prefsOf(p), T = p.triggers, cand = [];
 for (const [a, v] of Object.entries(w)) {
  let x = v * Math.pow(.45, ses.count[a] || 0);
  if (a === 'daily' && !today.daily) x *= 1 + 3 * Math.max(T.streak || 0, T.task || 0);
  if (a === 'grade' && !today.grade) x *= 1 + 3 * (T.grade || 0);
  if ((a === 'cat' || a === 'toys') && ses.elapsed < 1) x *= 1 + 2 * (T.pet || 0);
  if (a === 'tasks' && today.claimable) x *= 3;
  if (a === 'tasks' && today.weekly) x *= 1.5;
  if (a === 'merchant' && today.mNew != null) { if (today.mNew) x *= 1 + 2 * (T.merchant || 0) + (p.play.prefs.story || 0); else if (today.story) x *= 1.6; else x *= .3; }
  if (a === 'merchant' && (ses.count.merchant || 0) >= 1) x *= today.story ? .35 : .08;
  if (a === 'grade' && today.grade) x *= .05; if (a === 'daily' && today.daily) x *= .15;
  if (a === 'music' && ses.music) x *= .1;
  if (a === 'contest' && today.ct) { const C = today.ct; if (C.mid) x *= 2.5; else if (C.over) x *= C.best >= 6 ? .03 : .3 * (1 - .6 * (p.play.frustration || .5)); }
  cand.push([a, x]);
 }
 const goal = p.play.goal; if (goal && !today[goal] && !ses.count[goal]) return goal;
 let r = rnd() * cand.reduce((s, c) => s + c[1], 0); for (const [a, x] of cand) if ((r -= x) <= 0) return a; return 'look';
}
// the chance this person answers a word right (3-parameter logistic on the grade scale, with memory)
const OFF = { en2zh: 0, zh2en: .4, listen: .3, spell: .7, listenspell: 1 };
function answerChance(p, st, w, g, type) {
 const guess = type === 'spell' || type === 'listenspell' ? 0 : .25, b = (g || 8) + (OFF[type] ?? 0);
 let pr = 1 / (1 + Math.exp(-1.25 * (st.theta - b)));
 const m = st.mem[w]; if (m) pr = Math.max(pr, m.s * Math.exp(-(Date.now() - m.t) / 864e5 / Math.max(.5, m.d)));
 if ((type === 'en2zh' || type === 'zh2en') && p.english.readZh < 1) pr *= p.english.readZh;            // can't read the Chinese yet
 if (type === 'spell' || type === 'listenspell') pr *= p.english.typing;
 return guess + (1 - guess) * clamp(pr, 0, 1);
}
function learnWord(p, st, w, ok) { const m = st.mem[w] || (st.mem[w] = { s: 0, d: .5, t: Date.now() }); const r = p.english.learn * 5; m.s = clamp(m.s + (ok ? .25 : .15) * r * (1 - m.s), 0, 1); m.d = ok ? m.d * 1.8 : Math.max(.5, m.d * .6); m.t = Date.now(); st.theta += p.english.learn * .004 * (ok ? 1 : .5); }
// satisfaction 0..1 from what happened
function satisfaction(p, ses) {
 const liked = Object.entries(ses.mins).reduce((s, [a, m]) => s + m * ((prefsOf(p)[a] || 0) > .5 ? 1 : 0), 0) / Math.max(1, ses.elapsed);
 const acc = ses.ans ? ses.right / ses.ans : null, sweet = p.age < 12 ? .85 : .75;
 const P = prefsOf(p), learnShare = LEARN.reduce((a, k) => a + (P[k] || 0), 0) / Object.values(P).reduce((a, b) => a + b, 0);   // accuracy matters to those who come to learn
 let s = .45 + .3 * liked - .12 * ses.frustration + (acc == null ? 0 : (.2 - Math.abs(acc - sweet) * .6) * (.3 + learnShare)) + Math.min(.15, ses.rewards / 400);
 if (ses.goalDone) s += .1; if (ses.cut) s -= .05;
 return clamp(s, 0, 1);
}

// ---------- offline session (preview, no browser) ----------
const LV_GRADE = { 1: [2, 7], 2: [6, 10], 3: [9, 11], 4: [10, 11.5], 5: [11, 12], 6: [11.5, 12.5] };
function offlineSession(p, st, plan, today) {
 const ses = { elapsed: 0, count: {}, mins: {}, ans: 0, right: 0, frustration: 0, rewards: 0, music: false, cut: false, goalDone: false, acts: [] };
 const levels = (p.levels && p.levels.length) ? p.levels : (p.english.grade < 9.5 ? [1] : p.english.grade < 10.5 ? [1, 2] : [1, 2, 3, 4]);
 while (ses.elapsed < plan.len) {
  if (chance(p.play.interrupt * .1)) { ses.cut = true; break; }
  const a = nextActivity(p, st, ses, today); ses.count[a] = (ses.count[a] || 0) + 1;
  let d = Math.min(lognormal(DWELL[a] * p.play.pace, .5), plan.len - ses.elapsed + .5);
  if (a === 'music') { ses.music = true; }
  if (LEARN.includes(a)) {
   const n = Math.max(1, Math.round(d / (.25 * p.play.pace))); let wrongRun = 0;
   for (let i = 0; i < n; i++) { const L = levels[Math.floor(rnd() * levels.length)], [lo, hi] = LV_GRADE[L], g = between(lo, hi), type = a === 'typo' ? 'spell' : ['en2zh', 'zh2en', 'listen', 'spell'][Math.floor(rnd() * 4)];
    if (type === 'spell' && p.play.dislikes.includes('spell')) { ses.frustration += .5; if (chance(.5)) break; }
    const ok = chance(answerChance(p, st, 'w' + Math.round(g * 10) + '_' + Math.floor(rnd() * 400), g, type)); ses.ans++; if (ok) { ses.right++; wrongRun = 0; } else if (++wrongRun >= 3 && chance(p.play.frustration)) { ses.frustration++; break; } }
   if (a === 'daily') { today.daily = true; ses.rewards += 50; } if (a === 'grade') { today.grade = true; ses.rewards += 10; st.grade = st.theta + normal() * .5; }
   if (p.play.dislikes.includes('quiz') || p.play.dislikes.includes('forced_learning') || p.play.dislikes.includes('learning_tasks')) ses.frustration += .5;
  } else ses.rewards += a === 'mini' ? 15 : a === 'cat' || a === 'toys' ? 5 : 0;
  ses.mins[a] = (ses.mins[a] || 0) + d; ses.elapsed += d; ses.acts.push(a);
  if (p.play.goal && today[p.play.goal]) { ses.goalDone = true; if (chance(.8)) break; }
  if (ses.frustration >= 2 && chance(p.play.frustration)) { ses.cut = true; break; }
 }
 return ses;
}

// ---------- preview: two weeks without a browser ----------
function preview() {
 const start = String(arg('start', tw(Date.now()).date)), rows = [], daily = Array.from({ length: DAYS }, () => ({ users: 0, minutes: 0, sessions: 0 })), lens = [];
 for (const p of PEOPLE) {
  const st = newState(p), cal = [];
  for (let d = 0; d < DAYS; d++) {
   const date = addDays(start, d), plan = planDay(p, st, d, date), today = { daily: false, grade: false }, sats = [];
   for (const s of plan.sessions) { const ses = offlineSession(p, st, s, today); s.real = +ses.elapsed.toFixed(1); s.acts = [...new Set(ses.acts)].slice(0, 5); sats.push(satisfaction(p, ses)); st.sessions++; st.minutes += ses.elapsed; lens.push(ses.elapsed); }
   if (plan.sessions.length) { daily[d].users++; daily[d].minutes += plan.sessions.reduce((a, s) => a + s.real, 0); daily[d].sessions += plan.sessions.length; }
   endDay(p, st, d, plan.sessions.length > 0, sats);
   cal.push({ d, date, n: plan.sessions.length, min: Math.round(plan.sessions.reduce((a, s) => a + s.real, 0)), E: +plan.E.toFixed(2), why: plan.why.join('、'), times: plan.sessions.map(s => `${hm(s.start)}(${Math.round(s.real)}′)`).join(' '), dormant: st.dormant });
  }
  const active = cal.filter(c => c.n).length, ses = cal.reduce((a, c) => a + c.n, 0), mins = cal.reduce((a, c) => a + c.min, 0), lastDay = Math.max(-1, ...cal.filter(c => c.n).map(c => c.d));
  rows.push({ id: p.id, nick: p.nick, stage: p.stage, arch: p.engagement.label, active, sessions: ses, minutes: mins, perSession: ses ? Math.round(mins / ses) : 0, lastDay: lastDay + 1, theta0: p.english.grade, grade: st.grade == null ? null : +st.grade.toFixed(1), cal });
 }
 const sorted = lens.slice().sort((a, b) => a - b), q = f => sorted.length ? sorted[Math.floor(f * (sorted.length - 1))].toFixed(1) : '–';
 const ret = d => rows.filter(r => r.cal.slice(d).some(c => c.n)).length;
 const out = { start, days: DAYS, seed: +arg('seed', 0) || null, people: rows, daily, sessionMinutes: { p10: q(.1), median: q(.5), p90: q(.9), max: q(1) }, retention: { 'D2+': ret(1), 'D7+': ret(6), 'D14': ret(13) } };
 fs.writeFileSync(path.join(DIR, 'preview.json'), JSON.stringify(out, null, 1));
 const md = ['# 兩週生活模擬預覽', '', `開始 ${start}・${DAYS} 天・30 人・亂數種子 ${arg('seed', '（隨機）')}`, '',
  `每場分鐘數：10% ${out.sessionMinutes.p10}・中位數 ${out.sessionMinutes.median}・90% ${out.sessionMinutes.p90}・最長 ${out.sessionMinutes.max}`, '',
  `第 2 天之後還有來的 ${out.retention['D2+']} 人、第 7 天之後 ${out.retention['D7+']} 人、第 14 天 ${out.retention.D14} 人`, '',
  '| 代號 | 暱稱 | 身分 | 類型 | 上線天數 | 場次 | 總分鐘 | 每場 | 最後一天 |', '|---|---|---|---|---|---|---|---|---|',
  ...rows.map(r => `| ${r.id} | ${r.nick} | ${r.stage} | ${r.arch} | ${r.active} | ${r.sessions} | ${r.minutes} | ${r.perSession} | ${r.lastDay || '–'} |`), '',
  '## 每天', '', '| 天 | 日期 | 上線人數 | 場次 | 總分鐘 |', '|---|---|---|---|---|', ...daily.map((x, i) => `| ${i + 1} | ${addDays(start, i)} | ${x.users} | ${x.sessions} | ${Math.round(x.minutes)} |`), '',
  '## 每個人的兩週', '', ...rows.flatMap(r => [`### ${r.id} ${r.nick}（${r.stage}・${r.arch}）`, '', ...r.cal.map(c => `- 第 ${c.d + 1} 天 ${c.date.slice(5)}：${c.n ? c.times : '沒來'}${c.why ? `（${c.why}）` : ''}`), ''])].join('\n');
 fs.writeFileSync(path.join(DIR, 'preview.md'), md);
 console.log(md.split('\n## 每天')[0]);
 return out;
}

// ---------- live run in a browser ----------
const STATE_FILE = path.join(DIR, 'state.json');
const loadState = () => fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : null;
const saveState = S => fs.writeFileSync(STATE_FILE, JSON.stringify(S));
const ACCOUNTS = (() => { if (!arg('login')) return {}; const f = path.resolve(String(arg('accounts', path.join(ROOT, '.sim', 'accounts.json')))); if (!fs.existsSync(f)) { console.error('[life] --login 需要 ' + f + '（後台 → 玩家帳號 → 批次建立測試帳號 → 下載 accounts.json）'); process.exit(1); } const a = JSON.parse(fs.readFileSync(f, 'utf8')); return Object.fromEntries((a.accounts || a).map(x => [x.id, x])); })();
const logLine = (date, o) => fs.appendFileSync(path.join(DIR, 'logs', date + '.jsonl'), JSON.stringify(Object.assign({ at: new Date().toISOString() }, o)) + '\n');
function ensurePlan(S) {
 const now = tw(Date.now()), dayIndex = Math.round((Date.parse(now.date) - Date.parse(S.start)) / 864e5) - (now.min < 360 ? 1 : 0);   // a game day starts at 06:00
 if (dayIndex < 0 || dayIndex >= S.days) return null;
 const date = addDays(S.start, dayIndex);
 if (S.today && S.today.day === dayIndex) return S.today;
 if (S.today) for (const p of PEOPLE) { const st = S.people[p.id], ps = S.today.plans[p.id]; if (!ps) continue; const done = ps.sessions.filter(s => s.status === 'done'); endDay(p, st, S.today.day, done.length > 0, done.map(s => s.sat)); }
 S.today = { day: dayIndex, date, plans: {} };
 for (const p of PEOPLE) { const plan = planDay(p, S.people[p.id], dayIndex, date); plan.sessions.forEach((s, i) => { s.id = `${p.id}-${date}-${i}`; s.status = 'planned'; s.t = at(date, s.start + (s.start < 360 ? 1440 : 0)); }); S.today.plans[p.id] = plan; logLine(date, { type: 'plan', id: p.id, E: +plan.E.toFixed(2), why: plan.why, sessions: plan.sessions.map(s => ({ start: hm(s.start), len: s.len, burst: !!s.burst })) }); }
 saveState(S); return S.today;
}
let browser = null, cache = new Map(), RUN_END = 0;
// ---- what everyone is doing, readable: shown in the window and written to one file per day (all people together) ----
//   .sim/行為紀錄/2026-11-10.txt   e.g. "20:31:05  芯芯（sim04）答題 apple（小三・英翻中）✓"
// Opening a window and closing it again without doing anything is not written.
const TXT = path.resolve(String(arg('textlog', path.join(ROOT, '.sim', '行為紀錄'))));
const GL = ['小一', '小二', '小三', '小四', '小五', '小六', '國一', '國二', '國三', '高一', '高二', '高三'], gname = g => g == null || isNaN(g) ? '' : GL[Math.max(1, Math.min(12, Math.round(g))) - 1];
const QT = { en2zh: '英翻中', zh2en: '中翻英', listen: '聽音選字', spell: '拼字', listenspell: '聽音拼字', cloze: '填空', img: '看圖選字' };
const MINI_BOTS = true;    // canvas minigames are played with a modelled result (see miniRound)
const ACTN = { daily: '每日單字', practice: '自由練習', grade: '程度小測', contest: '程度挑戰賽', storyq: '商人故事測驗', story: '自由練習', typo: 'Meow Typo 打字' };
const DEVN = { phone: '手機', tablet: '平板', pc: '電腦', desktop: '電腦' };
function say(p, msg) {
 const d = new Date(Date.now() + 8 * 3600e3).toISOString(), line = `${d.slice(11, 19)}  ${p.nick}（${p.id}）${msg}`;
 console.log(line); try { fs.mkdirSync(TXT, { recursive: true }); fs.appendFileSync(path.join(TXT, d.slice(0, 10) + '.txt'), line + '\r\n', 'utf8'); } catch (e) { }
}
const FIXED = /[?&](crc|checksum|boot)=|\/build-packs\/[0-9a-f]{8}\.bin/, HC = path.join(DIR, 'httpcache'), inflight = new Map();
async function fixedFile(r) {
 const url = r.request().url(), key = require('crypto').createHash('sha1').update(url).digest('hex'), f = path.join(HC, key);
 try {
  let hit = cache.get(key);
  if (!hit && fs.existsSync(f + '.json')) { hit = { status: 200, headers: JSON.parse(fs.readFileSync(f + '.json', 'utf8')), body: fs.readFileSync(f) }; cache.set(key, hit); }
  if (!hit) {
   if (!inflight.has(key)) inflight.set(key, (async () => {
    const res = await r.fetch(), body = await res.body();
    if (res.status() !== 200) return { status: res.status(), headers: res.headers(), body, temp: true };
    const headers = Object.fromEntries(Object.entries(res.headers()).filter(([k]) => !/^(content-encoding|content-length|transfer-encoding|connection|date|age|set-cookie)$/i.test(k)));
    fs.mkdirSync(HC, { recursive: true }); fs.writeFileSync(f, body); fs.writeFileSync(f + '.json', JSON.stringify(headers));
    const v = { status: 200, headers, body }; if (body.length < 5e6) cache.set(key, v); return v;
   })().finally(() => setTimeout(() => inflight.delete(key), 0)));
   hit = await inflight.get(key);
  }
  return r.fulfill({ status: hit.status, headers: hit.headers, body: hit.body });
 } catch (e) { return r.continue().catch(() => { }); }
}
// Opening the game in a fresh browser checks ~7,000 asset files (about 4–6 minutes of CPU on a small machine), so several
// can load at once but not unlimited: --load-conc (default 3) at a time, each allowed --load-timeout minutes (default 30).
// The session's own play time is counted from when the room is on screen, so a slow load never shortens the visit.
const LOAD_CONC = Math.max(1, +arg('load-conc', 3)), LOAD_MS = Math.max(1, +arg('load-timeout', 30)) * 60e3; let loading = 0; const loadQ = [];
async function loadSlot() { if (loading < LOAD_CONC) { loading++; return; } await new Promise(r => loadQ.push(r)); loading++; }
function loadDone() { loading--; const r = loadQ.shift(); if (r) r(); }
// silent: no sound from music, games or read-aloud words (the computer running this is someone's work machine)
const BROWSER_ARGS = ['--mute-audio', '--autoplay-policy=user-gesture-required'];
let browserP = null;   // sessions that start together share one launch (a race here used to leave extra browsers running, so `once` never exited)
async function launch() { if (!browserP) { const { chromium } = require('playwright'); browserP = chromium.launch({ args: BROWSER_ARGS }); } return browser = await browserP; }
async function runSession(S, p, s) {
 const st = S.people[p.id], date = S.today.date, today = st.daily[date] || (st.daily[date] = { daily: false, grade: false });
 const share = p.shareDevice && p.id > p.shareDevice ? p.shareDevice : p.id, storeFile = path.join(DIR, 'browser', share + '.json');
 const vp = p.device === 'phone' ? { width: 390, height: 844, isMobile: true, hasTouch: true } : p.device === 'tablet' ? { width: 820, height: 1180, isMobile: true, hasTouch: true } : { width: 1366, height: 860 };
 const copts = { viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, locale: p.lang === 'ja' ? 'ja-JP' : 'zh-TW', timezoneId: 'Asia/Taipei' };
 // --profiles: every person keeps a real browser profile (like their own phone/tablet/PC), so the game's asset cache survives
 // between visits and only the very first visit has the slow first load. Used when running on one always-on computer.
 const ctx = arg('profiles') ? await require('playwright').chromium.launchPersistentContext(path.join(DIR, 'profiles', share), Object.assign({ args: BROWSER_ARGS }, copts))
  : await (await launch()).newContext(Object.assign({ storageState: !arg('no-store') && fs.existsSync(storeFile) ? storeFile : undefined }, copts));
 await ctx.addInitScript(() => { try { if (window.speechSynthesis) { speechSynthesis.speak = () => { }; } } catch (e) { } });
 await ctx.addInitScript(() => { window.__simMini = []; const iv = setInterval(() => { try { if (typeof MiniTable === 'undefined' || MiniTable.__sim) return; const end = MiniTable.end.bind(MiniTable);
  MiniTable.end = function (s, result) { try { if (!s.over) { const g = s.g || {}, nums = {}; for (const k in g) if (typeof g[k] === 'number' && isFinite(g[k])) nums[k] = Math.round(g[k] * 100) / 100; const it = typeof Cozy !== 'undefined' && Cozy.item ? Cozy.item(s.uid) : null;
   window.__simMini.push({ mode: s.mode, item: it ? it.k : '', name: it && ITEMS[it.k] ? (ITEMS[it.k].n || ITEMS[it.k].name || it.k) : '', variant: s.variant, won: !!s.won, lines: ((result && result.lines) || []).map(String), nums, at: Date.now() }); } } catch (e) { } return end(s, result); };
  MiniTable.__sim = 1; clearInterval(iv); } catch (e) { } }, 500); });   // read-aloud uses the OS voice, which --mute-audio does not cover
 await ctx.addInitScript(([dev, lang]) => { try { if (!localStorage.getItem('pocketnook.device')) localStorage.setItem('pocketnook.device', dev); localStorage.setItem('purr-cozy.language', lang); } catch (e) { } }, [st.device || ('test-' + share), p.lang || 'zh-TW']);
 if (arg('no-upload')) await ctx.route(/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com/, r => r.abort());   // testing: nothing reaches Firebase, so no test data appears in the admin
 // Game files with a version in the URL (?crc= / ?checksum= / ?boot=) never change, so every file is downloaded from the site
 // only ONCE for all 30 people (kept on disk under the state folder, identical requests share one download). The site
 // (GitHub Pages) answers HTTP 429 when one IP asks for too much; without this each new person re-downloaded ~7,000 files.
 // Everything else (index.html, version.json, Firebase) goes to the network as usual, so game updates are picked up.
 if (!arg('direct')) await ctx.route(u => u.href.startsWith(BASE) && FIXED.test(u.href), r => fixedFile(r));
 const page = await ctx.newPage(), errors = [], netBad = []; let live = null;   // live = ses.say once the session has started
 page.on('pageerror', e => { errors.push(e.message.slice(0, 200)); if (live && errors.length <= 10) live('⚠ 遊戲錯誤：' + e.message.slice(0, 200)); });
 // for diagnosing a load that never finishes: failed requests and HTTP errors while the game opens
 page.on('requestfailed', r => { if (netBad.length < 40) netBad.push('fail ' + r.url().replace(BASE, '').slice(0, 80) + ' ' + ((r.failure() || {}).errorText || '')); });
 const benign = u => /firestore\.googleapis\.com\/google\.firestore\.v1\.Firestore\/(Listen|Write)\/channel/.test(u);   // Firebase's live channel: a session ending with 400/404 is normal, the SDK reconnects
 page.on('response', r => { const u = r.url(), st = r.status(); if (st < 400 || benign(u) || netBad.length >= 40) return; netBad.push(st + ' ' + u.replace(BASE, '').slice(0, 80));
  if (live && netBad.length <= 10) live(u.startsWith(BASE) ? `⚠ 遊戲檔案抓不到（HTTP ${st}）：${u.replace(BASE, '').slice(0, 100)}` : `⚠ 外部服務回應錯誤（HTTP ${st}）：${u.replace(/\?.*$/, '').slice(0, 100)}`); });
 // real Firebase problems show up in the console (permission denied, quota, failed writes)
 page.on('console', m => { if (!live || !['error', 'warning'].includes(m.type())) return; const t = m.text(); if (/permission|PERMISSION_DENIED|quota|RESOURCE_EXHAUSTED|unauthenticated|FirebaseError|Failed to write|write.*fail/i.test(t)) live('⚠ 雲端錯誤：' + t.replace(/\s+/g, ' ').slice(0, 200)); });
 const ev = (fn, a) => page.evaluate(fn, a), wait = ms => new Promise(r => setTimeout(r, Math.max(0, ms / FAST)));
 const ses = { elapsed: 0, count: {}, mins: {}, ans: 0, right: 0, frustration: 0, rewards: 0, music: false, cut: false, goalDone: false, acts: [] }; let t0 = Date.now(), endAt = Infinity;
 ses.say = m => say(p, m); live = ses.say; ses.say(`上線（${DEVN[p.device] || p.device || ''}，打算玩 ${s.len} 分鐘${s.cont ? '，接續上一段' : ''}）`);
 try {
  const q0 = Date.now(); await loadSlot(); s.queued = +((Date.now() - q0) / 60000).toFixed(1);
  try { await page.goto(BASE + 'index.html', { timeout: 180000 });
   await page.waitForFunction(() => !document.getElementById('loading') && typeof Learn !== 'undefined' && Game.S, null, { timeout: LOAD_MS, polling: 2000 });
  } catch (e) {
   // say where it stopped: the loading screen's own text (progress or error), page errors, failed / 4xx-5xx requests
   const screen = await page.evaluate(() => { const el = document.getElementById('loading'); return { text: el ? el.innerText.replace(/\s+/g, ' ').trim().slice(0, 200) : '(沒有載入畫面)', learn: typeof Learn !== 'undefined', game: typeof Game !== 'undefined' && !!Game.S, stats: window.PurrAssets ? PurrAssets.stats : null, ready: document.readyState }; }).catch(x => ({ text: '(讀不到頁面：' + String(x.message || x).slice(0, 80) + ')' }));
   const diag = `載入逾時 ${Math.round((Date.now() - q0) / 60000)} 分｜畫面：${screen.text}｜Learn ${!!screen.learn} Game ${!!screen.game} ${screen.ready || ''}｜素材 ${screen.stats ? JSON.stringify(screen.stats) : '–'}｜頁面錯誤 ${errors.length}：${errors.slice(0, 3).join(' / ')}｜網路問題 ${netBad.length}：${netBad.slice(0, 6).join(' / ')}`;
   ses.say('⚠ ' + diag);
   throw new Error(diag);
  } finally { loadDone(); }
  const coins0 = await ev(() => Game.S.coins);
  // sign in (the shared tablet switches accounts here)
  const acc = ACCOUNTS[p.id];
  if (acc) { const who = await ev(() => typeof Cloud !== 'undefined' && Cloud.user ? Cloud.user.email : '');
   if (who !== acc.email) { await page.waitForFunction(() => typeof Cloud !== 'undefined' && Cloud.fb, null, { timeout: 60000 }).catch(() => { });
    s.login = await ev(async a => { try { if (Cloud.user) await Cloud.fb.signOut(); await Cloud.fb.signIn(a.email, a.password); return 'ok'; } catch (e) { return (e && e.code) || String(e); } }, acc);
    await page.waitForFunction(e => Cloud.user && Cloud.user.email === e && ['synced', 'saving'].includes(Cloud.status), acc.email, { timeout: 90000 }).catch(() => { s.login += '（同步逾時）'; }); }
   ses.say(s.login == null ? '已經是登入狀態' : s.login === 'ok' ? '登入帳號' : '登入失敗：' + s.login); }
  // name + test flags. The game applies the account's registry seed (name 測試NN, group) a moment after the first sync,
  // which can overwrite what is set here, so it is set again a few seconds later and once more before leaving.
  const fixId = () => ev(([d, nick]) => { const g = typeof Placement !== 'undefined' && Placement.S(); if (g && !g.declared && d) g.declared = d; if (Game.S.avatar && (!Game.S.avatar.name || /^測試\d+$/.test(Game.S.avatar.name) || Game.S.avatar.name === (window.NAME_DEFAULT || ''))) Game.S.avatar.name = nick;
   const f = Game.S.flags || {}; if (f.tester && f.testGroup === 'claude-sim' && Game.S.avatar && Game.S.avatar.name === nick) return; Game.S.flags = Object.assign({}, f, { tester: true, testGroup: 'claude-sim' }); Game.save(); if (typeof UI !== 'undefined' && UI.refresh) try { UI.refresh('profile'); } catch (e) { } }, [p.declared || 0, p.nick]).catch(() => { });
  await fixId(); await new Promise(r => setTimeout(r, 6000)); await fixId();
  if (arg('test-give') && arg('no-upload')) await ev(list => { for (const m of list.split(',')) { const k = Object.keys(ITEMS).find(k => ITEMS[k].cozyGame === m || (m === 'vending' && /^cozy_vending_/.test(k))); if (k && !Game.S.items.some(i => i.k === k)) Game.S.items.push({ k, uid: 'test-' + m, x: 60 + 30 * Game.S.items.length % 200, y: 150 }); } }, String(arg('test-give')));   // testing only   // test account: its logs are left out of the analysis
  s.load = +((Date.now() - t0) / 1000).toFixed(0); t0 = Date.now(); endAt = t0 + s.len * 60000 / FAST;
  ses.say(`進入房間（載入 ${s.load} 秒${s.queued ? `，先排隊 ${s.queued} 分鐘` : ''}）`);
  if (RUN_END && endAt > RUN_END) { s.carry = +((endAt - RUN_END) * FAST / 60000).toFixed(1); endAt = RUN_END; }   // the rest continues in the next hourly run   // the visit starts once the room is on screen
  await wait(lognormal(3000 * p.play.pace, .4));
  // first look: popups are closed or read
  await ev(() => { for (const w of Object.keys(UI.wins || {})) if (UI.wins[w] && !UI.wins[w].el.hidden && w !== 'placement') UI.closeWin(w); });
  if (p.play.dislikes.includes('music')) await ev(() => { if (typeof Music !== 'undefined' && Music.playing) Music.toggle(); });
  while (Date.now() < endAt) {
   if (chance(p.play.interrupt * .1)) { ses.cut = true; ses.say('被打斷，先離開'); break; }
   const st2 = await ev(() => ({ daily: !!Game.S.learn.dailyDone, grade: typeof Placement !== 'undefined' && Placement.done() && Placement.todayDone(), claimable: !!(Life.L.daily && Life.L.daily.tasks.some(t => t.prog >= t.need && !t.claimed)) || (typeof Weekly !== 'undefined' && Weekly.readyN() > 0), weekly: typeof Weekly !== 'undefined' ? Weekly.readyN() : 0, mNew: typeof Merchant !== 'undefined' ? !Merchant.S.seen : null, story: typeof Story !== 'undefined' && Story.pending(), ct: (() => { try { const Z = Contest.Z, R = Z.run; return { on: Z.on, over: !!(R && R.over), mid: !!(R && !R.over && R.qs && R.qi > 0), best: Z.top ? Z.top.l : 0 }; } catch (e) { return null; } })() }));
   Object.assign(today, st2);
   const cs = await ev(() => typeof Cloud !== 'undefined' ? { st: Cloud.status, err: Cloud.err || Cloud.error || '' } : null).catch(() => null);
   if (cs && cs.st !== ses.cloudSt) { if (['error', 'offline', 'outdated', 'paused'].includes(cs.st)) ses.say(`⚠ 雲端存檔狀態：${cs.st}${cs.err ? '（' + String(cs.err).slice(0, 120) + '）' : ''}`); else if (['error', 'offline', 'outdated', 'paused'].includes(ses.cloudSt)) ses.say('雲端存檔恢復正常（' + cs.st + '）'); ses.cloudSt = cs.st; }
   const a = nextActivity(p, st, ses, today); ses.count[a] = (ses.count[a] || 0) + 1; ses.acts.push(a);
   const dwell = Math.min(lognormal(DWELL[a] * p.play.pace, .5), (endAt - Date.now()) * FAST / 60000 + .5), aStart = Date.now();
   await act(page, p, st, ses, a, dwell, wait);
   const spent = (Date.now() - aStart) * FAST / 60000; ses.mins[a] = (ses.mins[a] || 0) + spent; ses.elapsed += spent;
   if (p.play.goal && today[p.play.goal] !== undefined) { const done = await ev(g => g === 'daily' ? !!Game.S.learn.dailyDone : g === 'grade' ? (typeof Placement !== 'undefined' && Placement.todayDone()) : false, p.play.goal); if (done) { ses.goalDone = true; if (chance(.8)) { ses.say('今天想做的做完了，離開'); break; } } }
   if (ses.frustration >= 2 && chance(p.play.frustration)) { ses.cut = true; ses.say('玩得不太開心，提早離開'); break; }
  }
  ses.rewards = Math.max(0, (await ev(() => Game.S.coins)) - coins0);
  // leaving: children often just close; adults wait for the save
  await fixId();
  if (p.age >= 13 || chance(.4)) { await ev(() => { dispatchEvent(new Event('pagehide')); Game.save(); }); for (let i = 0; i < 10; i++) { const q = await ev(() => typeof LearnLog !== 'undefined' ? LearnLog.queue().length : 0); if (!q) break; await ev(() => LearnLog.flush()); await new Promise(r => setTimeout(r, 1500)); } }
  s.grade = await ev(() => typeof Placement !== 'undefined' && Placement.done() ? +Placement.S().theta.toFixed(2) : null);
  if (acc) { let cst = ''; for (let i = 0; i < 10; i++) { cst = await ev(() => typeof Cloud !== 'undefined' ? Cloud.status : '').catch(() => ''); if (cst === 'synced') break; await new Promise(r => setTimeout(r, 1500)); } if (cst !== 'synced') ses.say(`⚠ 離開時雲端存檔沒有同步完成（狀態：${cst || '不明'}）`); s.cloud = cst; }
  miniSummary(ses);
  ses.say(`離線：玩了 ${((Date.now() - t0) * FAST / 60000).toFixed(1)} 分鐘、答 ${ses.ans} 題對 ${ses.right} 題、金幣 +${ses.rewards}${s.grade != null ? `、程度約 ${gname(s.grade)}` : ''}${s.carry ? `（還有 ${s.carry} 分鐘下一段接著玩）` : ''}`);
  if (!arg('no-store') && !arg('profiles')) await ctx.storageState({ path: storeFile, indexedDB: true });
 } catch (e) { s.error = String(e && e.message || e).slice(0, 900); ses.say('出錯，這次結束：' + s.error.slice(0, 200)); }
 finally { s.pageErrors = errors.slice(0, 5); await ctx.close().catch(() => { }); }
 s.real = +((Date.now() - t0) * FAST / 60000).toFixed(1); Object.assign(s, { merchant: ses.merchant, storyCh: ses.storyCh, loreQ: ses.loreQ, loreRight: ses.loreRight, bought: ses.bought, weekly: ses.weekly }); s.acts = [...new Set(ses.acts)]; s.ans = ses.ans; s.right = ses.right; s.cut = ses.cut; s.frustration = ses.frustration; s.sat = +satisfaction(p, ses).toFixed(2);
 st.sessions++; st.minutes += s.real; if (s.grade != null) st.grade = s.grade;
}
// one activity in the real game, for about `dwell` minutes
async function act(page, p, st, ses, a, dwell, wait) {
 const ev = (fn, x) => page.evaluate(fn, x), until = Date.now() + dwell * 60000 / FAST;
 try {
  if (a === 'merchant') return await merchantVisit(page, p, st, ses, until, wait);
  if (LEARN.includes(a)) {
   if (a === 'typo') return await typoRound(page, p, st, ses, until, wait);
   const kind = a === 'story' ? 'practice' : a === 'grade' ? 'grade' : a;
   const ok = a === 'storyq' ? await ev(i => { if (typeof Lore !== 'undefined') Lore.view = null; UI.closeWin('merchant'); Story.start(i); return !!(Learn.sess && Learn.sess.kind === 'story'); }, ses.storyCh) : a === 'contest' ? await ev(() => { if (typeof Contest === 'undefined') return false; const Z = Contest.Z; if (!Z.on || (Z.run && Z.run.over)) Contest.join(); Contest.play(); return !!(Learn.sess && Learn.sess.kind === 'contest'); }) : await ev(k => { if (k === 'daily' && Game.S.learn.dailyDone) k = 'practice'; if (k === 'grade' && typeof Placement !== 'undefined' && Placement.done() && Placement.todayDone()) return false; UI.openWin('learn'); Learn.start(k); return !!Learn.sess; }, kind);
   if (!ok) return;
   ses.say('開始「' + (ACTN[a] || a) + '」');
   if (p.play.dislikes.some(d => ['quiz', 'forced_learning', 'learning_tasks'].includes(d))) ses.frustration += .5;
   let wrongRun = 0;
   for (let guard = 0; guard < 300; guard++) {
    const q = await ev(() => { const s = Learn.sess; if (!s) return null; if (s.step === 'review' || s.step === 'pause') { const i = s.words[s.ri]; return { step: s.step, w: VOCAB[i].w, g: VOCAB[i].g }; } if (s.step === 'quiz') { if (s.ans) return { step: 'wait' }; const q = s.qs[s.qi]; return { step: 'quiz', i: q.i, w: VOCAB[q.i].w, g: VOCAB[q.i].g, type: q.type, opts: q.opts }; } return { step: s.step }; });
    if (!q) break; if (q.step === 'result') { await wait(lognormal(3500 * p.play.pace, .4));
     // a breakthrough pulls most people on to the next Level while they still have time
     if (a === 'contest') { const go = await ev(() => { const s = Learn.sess, R = Contest.Z.run; return !!(s && s.result && s.result.pass && R && !R.over); }); if (go && chance(Date.now() < until ? .85 : .35)) { ses.ctUp = (ses.ctUp || 0) + 1; ses.say('挑戰賽突破這一階，繼續下一階'); await ev(() => Contest.play()); continue; } }
     const res = await ev(() => { const s = Learn.sess; return s ? { right: s.right, n: s.qs ? s.qs.length : 0, pass: !!(s.result && s.result.pass) } : null; }).catch(() => null);
     ses.say('完成「' + (ACTN[a] || a) + '」' + (res && res.n ? `（${res.right}/${res.n}）` : '') + (a === 'contest' && res ? (res.pass ? '，突破' : '，沒突破') : ''));
     await ev(() => UI.closeWin('study')); break; }
    if (q.step === 'wait') { await new Promise(r => setTimeout(r, 300)); continue; }
    if (q.step === 'pause') { if (Date.now() < until || chance(.6)) { await wait(1500); ses.say('再來一組'); await ev(() => Learn.more()); continue; } ses.say('停在這裡，不做了'); break; }
    if (q.step === 'review') { const know = chance(answerChance(p, st, q.w, q.g, 'en2zh')), pressed = know || chance(.2); await wait(lognormal((know ? 2400 : 4500) * p.play.pace, .4)); await ev(k => Learn.review(k), pressed); ses.say(`複習卡 ${q.w}（${gname(q.g)}）按「${pressed ? '記得' : '不熟'}」`); learnWord(p, st, q.w, true); continue; }
    if (Date.now() > until + 120000 / FAST && a !== 'daily' && a !== 'grade' && a !== 'storyq') { if (a === 'contest') { ses.ctPause = true; ses.say('挑戰賽時間到先離開（答案已存，下次接著答）'); await ev(() => UI.closeWin('study')); } break; }
    const typed = q.type === 'spell' || q.type === 'listenspell';
    if (typed && p.play.dislikes.includes('spell')) { ses.frustration += .5; if (chance(.5)) { ses.cut = true; ses.say(`看到拼字題 ${q.w} 不想寫，離開`); break; } }
    const pr = answerChance(p, st, q.w, q.g, q.type), ok = chance(pr);
    await wait(lognormal((typed ? 3500 + 400 * q.w.length : 3000) * p.play.pace * (pr < .5 ? 1.6 : 1), .45));
    const val = typed ? (ok ? q.w : misspell(q.w)) : ok ? q.i : q.opts.filter(o => o !== q.i)[Math.floor(rnd() * 3)];
    const got = await ev(v => { Learn.answer(v); return Learn.sess && Learn.sess.ans ? !!Learn.sess.ans.ok : null; }, val);
    if (got == null) continue; ses.say(`答題 ${q.w}（${gname(q.g)}・${QT[q.type] || q.type}）${got ? '✓' : '✗'}`); ses.ans++; if (got) { ses.right++; wrongRun = 0; } else if (++wrongRun >= 3 && chance(p.play.frustration)) { ses.frustration++; }
    learnWord(p, st, q.w, got);
    if (got) await new Promise(r => setTimeout(r, 2500)); else { await wait(lognormal(2600 * p.play.pace, .4)); await ev(() => Learn.next()); }
   }
   return;
  }
  if (a === 'mini') { const has = await ev(() => !!(Game.S.items.find(i => ITEMS[i.k] && ITEMS[i.k].cozyGame) || Game.S.items.find(i => ITEMS[i.k] && ITEMS[i.k].interactionProfile && ITEMS[i.k].interactionProfile !== 'native'))); if (!has || !MINI_BOTS) return await typoRound(page, p, st, ses, until, wait); return await miniRound(page, p, st, ses, until, wait); }
  if (a === 'music') { const was = await ev(() => typeof Music !== 'undefined' && Music.playing); await ev(() => { if (typeof Music !== 'undefined' && !Music.playing) Music.toggle(); }); if (!was) ses.say('開始聽音樂'); ses.music = true; await wait((until - Date.now()) * FAST); return; }
  if (a === 'focus') { const f0 = Date.now(); await ev(() => { if (!Game.T().running) Game.start(); }); ses.say('開始番茄鐘'); await wait((until - Date.now()) * FAST); await ev(() => { if (Game.T().running) Game.pause(); }); ses.say(`暫停番茄鐘（專注 ${((Date.now() - f0) * FAST / 60000).toFixed(0)} 分鐘）`); return; }
  if (a === 'tasks') { await ev(() => { UI.openTasks ? UI.openTasks('daily') : UI.openWin('tasks'); }); await wait(lognormal(4000 * p.play.pace, .4)); await ev(() => { let dn = 0, bonus = false; try { Life.L.daily.tasks.forEach((t, i) => { if (t.prog >= t.need && !t.claimed) { Life.claimTask(i); dn++; } }); if (Life.L.daily.tasks.every(t => t.claimed) && !Life.L.daily.bonus) { Life.claimBonus(); bonus = true; } } catch (e) { } window.__simTask = { dn, bonus }; let n = 0; try { if (typeof Weekly !== 'undefined') { UI.openTasks('weekly'); for (const k of Object.keys(WEEKLY_DEFS)) if (Weekly.ready(k)) { Weekly.claim(k); n++; } } } catch (e) { } UI.closeWin('tasks'); return n; }).then(async n => { if (n) ses.weekly = (ses.weekly || 0) + n; const t = await ev(() => window.__simTask || {}).catch(() => ({})); const parts = [t.dn ? `每日任務 ${t.dn} 個` : '', t.bonus ? '每日全勤獎勵' : '', n ? `每週任務 ${n} 個` : ''].filter(Boolean); if (parts.length) ses.say('領取 ' + parts.join('、')); }); return; }
  if (a === 'social') { await ev(() => UI.openWin('friends')); await wait(lognormal(6000 * p.play.pace, .4)); const sb = await ev(() => { if (typeof Social !== 'undefined' && Social.ready && Social.ready()) { UI.frTab = 'board'; Social.loadBoard('lvl'); UI.refresh('friends'); return true; } return false; }); if (sb) ses.say('看好友排行榜'); await wait(lognormal(8000, .4)); await ev(() => UI.closeWin('friends')); return; }
  if (a === 'shop') { await ev(() => UI.openWin('shop')); await wait(lognormal(20000 * p.play.pace, .5)); await ev(() => UI.closeWin('shop')); return; }
  if (a === 'look') { const l0 = Date.now(); await wait(lognormal(25000 * p.play.pace, .5)); ses.say(`看看房間、陪貓（${Math.max(1, Math.round((Date.now() - l0) * FAST / 1000))} 秒）`); return; }
  while (Date.now() < until) {
   let did = '';
   if (!ses.tally || ses.tally.a !== a) ses.tally = { a, t0: Date.now(), n: {} };
   if (a === 'cat' || a === 'toys') did = await ev(k => { const pets = PetPlay.pets(); if (!pets.length) return ''; const x = pets[Math.floor(Math.random() * pets.length)], d = x.data, nm = (d && (d.name || d.n)) || '貓咪'; PetPlay.trayOpen = true;
     if (k === 'cat' && d && d.hunger < 55 && PetPlay.owned('cat_can')) { PetPlay.pick('cat_can'); PetPlay.down(x.x, x.y - 7); return `餵 ${nm} 吃貓罐頭`; }
     else if (k === 'toys' && (Pets.Z.tools.ball || Pets.Z.tools.yarn || Life.L.bag.catnip)) { const t = Pets.Z.tools.ball && Math.random() < .5 ? 'ball' : Pets.Z.tools.yarn ? 'yarn' : Life.L.bag.catnip ? 'catnip' : 'ball'; PetPlay.pick(t); PetPlay.down(x.x + 22 - Math.random() * 44, Math.max(110, Math.min(160, x.y + 4))); return `丟${({ ball: '球', yarn: '毛線球', catnip: '貓草' })[t]}給 ${nm}`; }
     else if (Pets.Z.tools.brush && Math.random() < .5) { PetPlay.pick('brush'); PetPlay.down(x.x, x.y - 7); return `幫 ${nm} 梳毛`; }
     else { PetPlay.drop(); let ok = false; Game.interact && Room.hit && (() => { const h = Room.hit(x.x, x.y - 6); if (h && h.kind === 'actor' && h.a.poke) { h.a.poke(); ok = true; } })(); return ok ? `摸摸 ${nm}` : ''; } }, a);
   else if (a === 'mini') did = await ev(() => { const it = Game.S.items.find(i => ITEMS[i.k] && ITEMS[i.k].cozyGame) || Game.S.items.find(i => ITEMS[i.k] && ITEMS[i.k].interactionProfile && ITEMS[i.k].interactionProfile !== 'native'); if (it) { Game.interact(it); const I = ITEMS[it.k]; return '玩「' + (I.n || I.name || it.k) + '」'; } UI.openWin('catstypo'); return '玩「Meow Typo」'; });
   else if (a === 'decor') await ev(() => { if (!Room.edit) UI.setEdit(true); const items = Game.S.items.filter(i => ITEMS[i.k] && ITEMS[i.k].layer !== 'wall' && i.p == null), it = items[Math.floor(Math.random() * items.length)]; if (!it) return ''; Room.sel = it; it.x += Math.round(Math.random() * 16 - 8); Room.clampItem(it); const fl = Math.random() < .2; if (fl) it.flip = !it.flip; Game.save(); UI.editToolbar(); const I = ITEMS[it.k]; return '佈置：' + (fl ? '翻轉並移動' : '移動') + '「' + (I.n || I.name || it.k) + '」'; });
   if (did && (a === 'cat' || a === 'toys')) ses.tally.n[did] = (ses.tally.n[did] || 0) + 1; else if (did) ses.say(did);
   await wait(lognormal(a === 'mini' ? 30000 : a === 'decor' ? 9000 : 6000, .5) * p.play.pace);
   await ev(() => { for (const w of ['cozygame', 'furnplay', 'catstypo']) if (UI.wins[w] && !UI.wins[w].el.hidden) UI.closeWin(w); });
  }
  if ((a === 'cat' || a === 'toys') && ses.tally && Object.keys(ses.tally.n).length) { const n = ses.tally.n; ses.say(`和貓咪玩了 ${Math.max(1, Math.round((Date.now() - ses.tally.t0) * FAST / 1000))} 秒：` + Object.entries(n).map(([k, v]) => v > 1 ? `${k} ×${v}` : k).join('、')); ses.tally = null; }
  if (a === 'decor') await ev(() => { if (Room.edit) UI.setEdit(false); });
 } catch (e) { ses.error = String(e && e.message || e).slice(0, 160); }
}
// the weekly merchant: say hello, maybe hear today's story chapter (lore card → 4 words → 2 questions → 5-question story quiz), maybe buy something
async function merchantVisit(page, p, st, ses, until, wait) {
 const ev = (fn, x) => page.evaluate(fn, x), P = p.play.prefs, D = p.play.dislikes, reader = !D.some(d => ['reading', 'long_text'].includes(d));
 const info = await ev(() => { if (typeof Merchant === 'undefined') return null; const first = !Merchant.S.seen; Merchant.go(); const has = typeof Story !== 'undefined', St = has ? Story.week() : null, i = has ? Story.next() : -1;
  return { first, id: Merchant.id(), mname: (MERCHANTS[Merchant.id()] || {}).n || Merchant.id(), i, needName: i === 4 && St && !St.name, names: (St && St.names) || [], lore: typeof Lore !== 'undefined' && Lore.on() }; });
 if (!info) return; ses.merchant = info.id; if (info.first) ses.say(`第一次見到這週的旅行商人「${info.mname}」`);   // later visits are written only when something is done await wait(lognormal((info.first ? 9000 : 4000) * p.play.pace, .4));
 const storyLike = (P.story || 0) + .4 * (p.triggers.merchant || 0) + .15;
 if (info.i >= 0 && chance(Math.min(.95, storyLike * (reader ? 1 : .4) * (p.age < 8 ? .5 : 1)))) {
  ses.storyCh = info.i;
  if (info.needName) { const nm = info.names[Math.floor(rnd() * info.names.length)]; ses.say(`幫商人的故事取名「${nm}」`); await ev(n => Story.choose(n), nm); await wait(lognormal(5000 * p.play.pace, .4)); }
  let quiz = true;
  if (info.lore) {
   await ev(i => { UI.closeWin('merchant'); Story.open(); Lore.start(i); }, info.i); ses.lore = (ses.lore || 0) + 1; ses.say(`聽商人「${info.mname}」第 ${info.i + 1} 章的知識卡`);
   await wait(lognormal((reader ? 30000 : 9000) * p.play.pace * (p.age < 10 ? 1.4 : 1), .5));      // 你知道嗎？ + the English line
   await ev(() => Lore.toWords()); await wait(lognormal(14000 * p.play.pace, .5));                  // 今天的單字
   await ev(() => Lore.toQuiz());
   for (let k = 0; k < 6; k++) {
    const q = await ev(() => { const v = Lore.view; if (!v || v.step !== 'quiz') return null; const c = Lore.C(), a = c.q[v.qi][1]; return { a, opts: v.opts[v.qi], g: typeof VIDX !== 'undefined' && VIDX[a] != null ? VOCAB[VIDX[a]].g : 5 }; });
    if (!q) break; await wait(lognormal(7000 * p.play.pace * (p.age < 10 ? 1.5 : 1), .45));
    const ok = chance(Math.max(.5, answerChance(p, st, q.a, q.g, 'zh2en'))), val = ok ? q.a : q.opts.filter(o => o !== q.a)[Math.floor(rnd() * 3)] || q.a;
    await ev(w => Lore.answer(w), val); ses.say(`商人小問答 ${q.a} ${ok ? '✓' : '✗'}`); ses.loreQ = (ses.loreQ || 0) + 1; if (ok) ses.loreRight = (ses.loreRight || 0) + 1; learnWord(p, st, q.a, ok);
    await new Promise(r => setTimeout(r, 2500)); await ev(() => Lore.nextQ());
   }
   quiz = chance(reader ? .85 : .45);   // some read the card and leave the 5-question story quiz for later
  }
  if (quiz) await act(page, p, st, ses, 'storyq', DWELL.storyq, wait);
  await ev(() => { UI.closeWin('story'); UI.closeWin('study'); });
 }
 // the shop: look around, sometimes buy one of this week's goods
 if (chance(.35 + .4 * ((P.shop || 0) + (P.collect || 0) + (P.gacha || 0)))) {
  await ev(() => Merchant.open()); await wait(lognormal(15000 * p.play.pace, .5));
  if (!D.includes('no_coins') || chance(.3)) if (chance(.1 + .35 * ((P.shop || 0) + (P.collect || 0) + (P.decor || 0) * .5))) {
   const got = await ev(() => { try { const ids = Merchant.goods().filter(id => Merchant.stockLeft(id) > 0 && (ITEMS[id] ? (ITEMS[id].price || 0) : 0) <= Game.S.coins); if (!ids.length) return ''; const id = ids[Math.floor(Math.random() * ids.length)]; const c0 = Game.S.coins; Merchant.buy(id); return Game.S.coins < c0 ? id : ''; } catch (e) { return ''; } });
   if (got) { ses.bought = (ses.bought || []).concat(got); const nm = await ev(id => (ITEMS[id] && (ITEMS[id].n || ITEMS[id].name)) || id, got).catch(() => got); ses.say(`向商人「${info.mname}」買了「${nm}」`); }
  }
  await ev(() => UI.closeWin('merchant'));
 } else await ev(() => UI.closeWin('merchant'));
}
// ---- canvas minigames (投籃、彈珠台、迷宮、販賣機、翻牌…): a round is really opened in the game and really ended through the
// game's own result screen (best scores, win rewards and the behaviour log count it like a real round). What happens in between
// is modelled from the person — skill from age, how much they like minigames and their pace — so scores look like real play:
// a 7-year-old rarely clears the hardest maze, a teenager who loves minigames often does. Each round: one line; leaving: a total.
const MG = {   // typical seconds per round, and how the result is described
 toss: { sec: 55, zh: '投籃' }, pinball: { sec: 95, zh: '彈珠台' }, vending: { sec: 85, zh: '貓咪販賣機' }, maze: { sec: 70, zh: '鋼珠迷宮' },
 memory: { sec: 65, zh: '翻牌配對' }, puzzle: { sec: 110, zh: '滑動拼圖' }, wire: { sec: 80, zh: '接水管通電' }, diff: { sec: 60, zh: '找不同' },
 stars: { sec: 50, zh: '星星順序' }, parking: { sec: 85, zh: '貓咪停車場' }, weave: { sec: 120, zh: '刺繡' }, reaction: { sec: 35, zh: '反應力' },
 fish: { sec: 60, zh: '釣魚' }, balance: { sec: 45, zh: '疊積木' },
};
function miniSkill(p) { const a = p.age, P = p.play.prefs, base = a < 8 ? .25 : a < 11 ? .4 : a < 26 ? .55 : a < 50 ? .45 : .3; return clamp(base + .2 * ((P.mini || 0) + (P.gacha || 0) * .5) + (rnd() - .5) * .3, .05, .95); }
function binom(n, q) { let k = 0; for (let i = 0; i < n; i++) if (chance(q)) k++; return k; }
async function miniRound(page, p, st, ses, until, wait) {
 const ev = (fn, x) => page.evaluate(fn, x);
 const info = await ev(() => { const its = Game.S.items.filter(i => ITEMS[i.k] && (ITEMS[i.k].cozyGame || (ITEMS[i.k].interactionProfile && ITEMS[i.k].interactionProfile !== 'native'))); if (!its.length) return null;
  const it = its[Math.floor(Math.random() * its.length)]; Game.interact(it); const s = typeof MiniTable !== 'undefined' ? MiniTable.session : null, I = ITEMS[it.k];
  if (!s || s.uid !== it.uid) return { other: true, name: I.n || I.name || it.k };
  const g = s.g || {}; return { mode: s.mode, name: I.n || I.name || it.k, variant: s.variant, goal: (g.R && g.R.goal) || (g.L && g.L.goal) || (g.P && g.P.goal) || (g.B && g.B.goal) || g.goal || null, base: g.B && g.B.base, pairs: g.cards ? g.cards.length / 2 : null, diffs: g.diffs ? g.diffs.length : null, min: g.min || null, stars: g.C && g.C.p ? g.C.p.length : null }; });
 if (!info) return await typoRound(page, p, st, ses, until, wait);
 if (info.other) { const t0 = Date.now(); await wait(lognormal(40000 * p.play.pace, .4)); await ev(() => { for (const w of ['cozygame', 'furnplay']) if (UI.wins[w] && !UI.wins[w].el.hidden) UI.closeWin(w); }); ses.say(`玩「${info.name}」${Math.round((Date.now() - t0) * FAST / 1000)} 秒`); return; }
 const M = MG[info.mode] || { sec: 60, zh: info.mode }, k = miniSkill(p), label = `${M.zh}「${info.name}」`;
 ses.mini = ses.mini || {}; const agg = ses.mini[label] = ses.mini[label] || { mode: info.mode, rounds: 0, done: 0, wins: 0, sec: 0, a: 0, b: 0, score: 0 };
 for (let round = 0; round < 8; round++) {
  const sec = Math.max(12, lognormal(M.sec * p.play.pace * (1.35 - .6 * k), .3)), left = (until - Date.now()) * FAST / 1000 + 60;
  if (round) await ev(() => { const s = MiniTable.session; if (s) MiniTable.reset(s); });
  agg.rounds++;
  if (sec > left && chance(.6)) { await wait(left * 1000); await ev(() => UI.closeWin('cozygame')); ses.say(`${label} 第 ${round + 1} 局沒玩完就關掉（${Math.round(left)} 秒）`); agg.sec += left; break; }
  await wait(sec * 1000);
  // the modelled outcome
  const o = { mode: info.mode, sec: Math.round(sec) }; let line = '';
  switch (info.mode) {
   case 'toss': { o.shots = 5; o.makes = binom(5, .15 + .65 * k); let sc = 0, run = 0; for (let i = 0; i < o.makes; i++) { run++; sc += (info.base || 2) + (chance(.3 * k) ? 1 : 0) + (run > 1 ? 1 : 0); } o.score = sc; o.win = o.makes >= 3; line = `投 5 球進 ${o.makes} 球（${o.makes * 20}%），${o.score} 分`; agg.a += o.makes; agg.b += 5; agg.score += o.score; break; }
   case 'pinball': { o.score = Math.round(lognormal((info.goal || 4000) * (.45 + .9 * k), .45) / 10) * 10; o.win = o.score >= (info.goal || 4000); line = `${o.score.toLocaleString()} 分（過關門檻 ${(info.goal || 4000).toLocaleString()}）`; agg.score += o.score; break; }
   case 'vending': { const goal = info.goal || 7; o.served = Math.min(goal + 2, binom(goal + 2, .3 + .65 * k)); let sc = 0; for (let i = 0; i < o.served; i++) sc += 10 * (chance(.4) ? 2 : 1) + Math.round(5 + 15 * k * rnd()) + 2 * i; o.score = sc; o.win = o.served >= goal; line = `完成 ${o.served} 單（目標 ${goal}），${o.score} 分`; agg.a += o.served; agg.b += goal; agg.score += o.score; break; }
   case 'maze': { o.falls = Math.max(0, Math.round(lognormal(1 + 4 * (1 - k), .6) - 1)); o.win = chance(.25 + .7 * k); o.time = Math.round(sec * 10) / 10; line = o.win ? `通關，${o.time} 秒、掉進洞 ${o.falls} 次` : `沒通關（掉進洞 ${o.falls} 次）`; break; }
   case 'memory': { const n = info.pairs || 8; o.win = chance(.55 + .4 * k); o.matched = o.win ? n : Math.floor(n * (.4 + .4 * rnd())); o.flips = Math.round(n * 2 * (1.2 + 1.5 * (1 - k)) * (.85 + .3 * rnd())); line = o.win ? `全部配對，翻了 ${o.flips} 次` : `配對 ${o.matched}/${n} 時間到`; break; }
   case 'puzzle': case 'wire': case 'parking': { o.win = chance(.35 + .6 * k); o.moves = Math.round(lognormal((info.mode === 'puzzle' ? 60 : info.mode === 'wire' ? 25 : 18) * (1.6 - .7 * k), .35)); line = o.win ? `完成，${o.moves} 步` : `放棄（走了 ${o.moves} 步）`; break; }
   case 'diff': { const n = info.diffs || 5; o.win = chance(.4 + .55 * k); o.found = o.win ? n : Math.floor(n * (.3 + .5 * rnd())); line = o.win ? `全部找到` : `找到 ${o.found}/${n} 時間到`; break; }
   case 'stars': { const n = info.stars || 8; o.win = chance(.3 + .6 * k); o.reach = o.win ? n : Math.floor(n * (.3 + .6 * rnd())); line = o.win ? `連完 ${n} 顆星` : `連到第 ${o.reach} 顆`; break; }
   case 'weave': { o.win = chance(.5 + .45 * k); line = o.win ? `完成刺繡` : `沒繡完`; break; }
   case 'reaction': { o.hits = Math.round(lognormal(12 + 18 * k, .25)); o.score = o.hits * 10 + Math.round(30 * k * rnd()) * 5; o.win = o.score >= (info.goal || 150); line = `打中 ${o.hits} 隻，${o.score} 分`; agg.score += o.score; break; }
   case 'fish': { o.n = binom(8, .25 + .6 * k); o.kg = Math.round(o.n * (1.2 + 2 * rnd()) * 10) / 10; o.win = o.n >= (info.goal || 4); line = `釣到 ${o.n} 條、共 ${o.kg} 公斤`; agg.a += o.n; break; }
   case 'balance': { o.score = Math.max(0, Math.round(lognormal(4 + 14 * k, .4))); o.win = o.score >= (info.goal || 10); line = `疊到 ${o.score} 層`; agg.score += o.score; break; }
   default: { o.win = chance(.5); line = o.win ? '過關' : '沒過關'; }
  }
  const okEnd = await ev(o => { const s = MiniTable.session; if (!s || s.over) return false; const g = s.g || {}, T = (k, a) => MiniHost.t(k, a), tm = x => MiniHost.time(x); let r;
   switch (o.mode) {
    case 'toss': g.shot = o.shots; g.makes = o.makes; g.score = o.score; r = { field: 'tossBest', value: o.score, lines: [T('tossMakes', [o.makes]), T('scoreLine', [o.score])] }; break;
    case 'pinball': g.score = o.score; r = { field: 'pinballBest', value: o.score, lines: [T('scoreLine', [o.score])] }; break;
    case 'vending': g.served = o.served; g.score = o.score; r = { field: 'vendingBest', value: o.score, lines: [T('vendResult', [o.served]), T('scoreLine', [o.score])] }; break;
    case 'maze': g.falls = o.falls; g.time = o.time; r = o.win ? { field: 'mazeBest', value: o.time, lower: true, lines: [T('mazeTime', [tm(o.time)]), T('mazeFalls', [o.falls])] } : { lines: [T('mazeFalls', [o.falls])] }; break;
    case 'memory': g.flips = o.flips; g.matched = o.matched; r = o.win ? { field: 'memoryBest', value: o.flips, lower: true, lines: [T('memFlips', [o.flips]), T('timeLine', [tm(o.sec)])] } : { lines: [T('memPairs', [o.matched, (g.cards || []).length / 2 || o.matched])] }; break;
    case 'puzzle': g.moves = o.moves; r = o.win ? { field: 'puzzleBest', value: o.moves, lower: true, lines: [T('puzMoves', [o.moves]), T('timeLine', [tm(o.sec)])] } : { lines: [T('puzMoves', [o.moves])] }; break;
    case 'wire': g.moves = o.moves; r = o.win ? { field: 'wireBest', value: o.moves, lower: true, lines: [T('wireMoves', [o.moves]), T('timeLine', [tm(o.sec)])] } : { lines: [T('wireMoves', [o.moves])] }; break;
    case 'parking': g.moves = o.moves; r = o.win ? { field: 'parkBest', value: o.moves, lower: true, lines: [T('parkMoves', [o.moves])] } : { lines: [T('parkMoves', [o.moves])] }; break;
    case 'diff': r = o.win ? { field: 'diffBest', value: Math.max(1, 60 - o.sec), lines: [T('diffAll'), T('timeLine', [tm(o.sec)])] } : { lines: [T('diffFound', [o.found, (g.diffs || []).length || o.found])] }; break;
    case 'stars': g.len = o.reach || 0; r = { field: 'starsBest', value: o.reach || 0, lines: [T('starsReached', [o.reach || 0])] }; break;
    case 'weave': g.time = o.sec; r = o.win ? { field: 'weaveBest', value: o.sec, lower: true, lines: [T('weaveDone'), T('timeLine', [tm(o.sec)])] } : { lines: [] }; break;
    case 'reaction': g.score = o.score; g.hits = o.hits; r = { field: 'whackBest', value: o.score, lines: [T('scoreLine', [o.score]), T('whackHits', [o.hits])] }; break;
    case 'fish': r = { field: 'fishBest', value: o.kg, lines: [T('fishCount', [o.n]), T('fishWeight', [o.kg])] }; break;
    case 'balance': g.score = o.score; r = { field: 'stackBest', value: o.score, lines: [T('stackHeight', [o.score])] }; break;
    default: r = { lines: [] };
   }
   if (o.win) MiniTable.win(s); MiniTable.end(s, r); return true; }, o).catch(e => 'err:' + (e && e.message || e));
  if (okEnd !== true) { ses.say(`⚠ ${label} 結算失敗：${okEnd}`); break; }
  agg.done++; if (o.win) agg.wins++; agg.sec += o.sec; (agg.list = agg.list || []).push(o);
  ses.say(`${label} 第 ${round + 1} 局：${line}${o.win ? '，過關' : ''}（${o.sec} 秒）`);
  await wait(lognormal(3000 * p.play.pace, .4));
  if (Date.now() > until || !chance(.35 + .4 * ((p.play.prefs.mini || 0) / 1.2) + (o.win ? .1 : -.1))) break;
 }
 await ev(() => { if (UI.wins.cozygame && !UI.wins.cozygame.el.hidden) UI.closeWin('cozygame'); });
}
function miniSummary(ses) {   // one line per game played this visit, when leaving
 for (const [label, g] of Object.entries(ses.mini || {})) { if (!g.rounds) continue; const L = g.list || [], avgSec = g.done ? Math.round(g.sec / g.done) : 0, wins = L.filter(o => o.win);
  let detail = '';
  if (g.mode === 'toss') detail = `共投 ${g.b} 球進 ${g.a} 球，平均命中 ${g.b ? Math.round(g.a / g.b * 100) : 0}%`;
  else if (g.mode === 'maze') detail = `通關 ${wins.length} 盤` + (wins.length ? `，平均 ${Math.round(wins.reduce((a, o) => a + o.time, 0) / wins.length)} 秒通關` : '') + `，掉進洞共 ${L.reduce((a, o) => a + (o.falls || 0), 0)} 次`;
  else if (g.mode === 'vending') detail = `完成目標 ${wins.length} 局，共完成 ${g.a} 單，最高 ${Math.max(0, ...L.map(o => o.score || 0))} 分`;
  else if (g.score) detail = `最高 ${Math.max(0, ...L.map(o => o.score || 0)).toLocaleString()}，平均 ${Math.round(g.score / Math.max(1, g.done)).toLocaleString()}`;
  ses.say(`小遊戲總計｜${label}：玩 ${g.rounds} 局、玩完 ${g.done} 局、過關 ${g.wins} 局${detail ? '，' + detail : ''}${avgSec ? `，每局平均 ${avgSec} 秒` : ''}`); }
}
async function typoRound(page, p, st, ses, until, wait) {
 const ev = (fn, a) => page.evaluate(fn, a);
 const ok0 = await ev(() => { if (typeof CatsTypo === 'undefined') return false; UI.openWin('catstypo'); CatsTypo.start(); return !!CatsTypo.session; }); if (!ok0) return; const tw0 = Date.now(), words = [];
 if (p.play.dislikes.includes('spell')) ses.frustration += .5;
 for (let guard = 0; guard < 40; guard++) {
  const cur = await ev(() => { const S = CatsTypo.session; if (!S) return null; if (S.done) return { done: true }; const v = CatsTypo.current(); return { w: v.w, g: v.g, answered: !!S.answered, at: S.at }; });
  if (!cur) break; if (cur.done) { await wait(2500); await ev(() => UI.closeWin('catstypo')); break; }
  if (cur.answered) { await new Promise(r => setTimeout(r, 2500)); await ev(at => { if (CatsTypo.session && CatsTypo.session.at === at && CatsTypo.session.answered) CatsTypo.advance(); }, cur.at); continue; }
  let solved = false; for (let k = 0; k < 3 && !solved; k++) { const ok = chance(answerChance(p, st, cur.w, cur.g, 'spell') * (k ? .7 : 1)); await wait(lognormal((2500 + 500 * cur.w.length) * p.play.pace, .45));
   solved = await ev(t => { CatsTypo.active = true; CatsTypo.value = t; CatsTypo.submit(); return !!(CatsTypo.session && CatsTypo.session.answered); }, ok ? cur.w.toLowerCase() : misspell(cur.w)); if (!solved && chance(.3)) break; }
  words.push(cur.w + (solved ? '✓' : '✗')); if (!solved) await ev(() => CatsTypo.reveal()); ses.ans++; if (solved) ses.right++; learnWord(p, st, cur.w, solved);
  if (Date.now() > until && chance(.5)) { await ev(() => UI.closeWin('catstypo')); break; }
 }
 if (words.length) { const r = words.filter(w => w.endsWith('✓')).length; ses.say(`玩 Meow Typo 一局：${words.length} 個字打對 ${r} 個（${Math.round(r / words.length * 100)}%），${Math.round((Date.now() - tw0) * FAST / 1000)} 秒｜${words.join(' ')}`); }
}
function misspell(word) { const w = String(word).toLowerCase(); if (w.length < 3) return w + 'e'; const i = 1 + Math.floor(rnd() * (w.length - 2)); return chance(.5) ? w.slice(0, i) + w.slice(i + 1) : w.replace(/[aeiou]/, v => 'aeiou'.replace(v, '')[Math.floor(rnd() * 4)]); }

const END = arg('end') ? Date.parse(String(arg('end'))) : 0;
const SELF_MTIME = fs.statSync(__filename).mtimeMs; let RESTART = false;   // run mode: a newer life.cjs on disk is picked up between sessions   // e.g. --end 2026-11-24T00:00:00+08:00
async function runLoop(once) {
 if (once) RUN_END = Date.now() + (+arg('window', 30) + 3) * 60e3;
 let S = loadState();
 if (!S || arg('start')) { const start = String(arg('start', arg('start-if-new', tw(Date.now()).date))); S = { start, days: DAYS, people: Object.fromEntries(PEOPLE.map(p => [p.id, newState(p)])), today: null }; saveState(S); console.log(`[life] 新的兩週：從 ${start} 開始`); }
 const CONC = +arg('concurrency', 6), win = +arg('window', 30) * 60e3, running = new Set();
 for (;;) {
  if (!once && !running.size) { let m = SELF_MTIME; try { m = fs.statSync(__filename).mtimeMs; } catch (e) { } if (m !== SELF_MTIME) { console.log('[life] 模擬程式有新版本，現在沒人在線上，重新啟動套用（進度不會遺失）'); RESTART = true; break; } }
  if (END && Date.now() >= END) { console.log('[life] 模擬已到結束時間 ' + arg('end') + '，不再開始新的場次'); break; }
  const T = ensurePlan(S); if (!T) { console.log('[life] 不在模擬期間（' + S.start + ' 起 ' + S.days + ' 天）'); break; }
  const now = Date.now(), due = [];
  for (const p of PEOPLE) for (const s of (T.plans[p.id] || { sessions: [] }).sessions) {
   if (s.status !== 'planned') continue;
   if (!arg('test-now') && s.t < now - 45 * 60e3) { s.status = 'missed'; logLine(T.date, { type: 'missed', id: p.id, sid: s.id }); continue; }   // the computer was off
   if (END && s.t >= END) continue;
   if (s.t <= now || (once && s.t <= now + win) || arg('test-now')) due.push([p, s]);   // --test-now: play today's sessions right away (testing)
  }
  for (const [p, s] of due) {
   if (running.size >= CONC || [...running].some(r => r.pid === p.id || (p.shareDevice && r.pid === p.shareDevice))) continue;
   s.status = 'running'; saveState(S);
   const job = { pid: p.id }; running.add(job);
   (async () => { if (once && !arg('test-now') && s.t > Date.now()) await new Promise(r => setTimeout(r, s.t - Date.now()));
    console.log(`[life] ${hm(tw(Date.now()).min)} ${p.id} ${p.nick} 開始（預計 ${s.len} 分鐘）`);
    await runSession(S, p, s); s.status = 'done';
    if (s.carry >= 1) { const m = tw(RUN_END).min; T.plans[p.id].sessions.push({ id: s.id + 'c', start: m, len: s.carry, cont: true, status: 'planned', t: RUN_END }); }
    saveState(S);
    logLine(T.date, { type: 'session', id: p.id, sid: s.id, start: hm(s.start), planned: s.len, real: s.real, load: s.load, queued: s.queued, carry: s.carry || 0, cont: !!s.cont, acts: s.acts, ans: s.ans, right: s.right, merchant: s.merchant, story: s.storyCh, lore: s.loreQ ? [s.loreRight || 0, s.loreQ] : undefined, bought: s.bought, weekly: s.weekly, cut: s.cut, sat: s.sat, grade: s.grade, login: s.login, error: s.error, pageErrors: s.pageErrors });
    console.log(`[life] ${p.id} 結束：${s.real} 分鐘、${s.acts.join('/')}、答 ${s.ans} 對 ${s.right}${s.error ? '、錯誤 ' + s.error : ''}`);
   })().finally(() => running.delete(job));
  }
  saveState(S);
  if (once && !running.size && !due.some(([, s]) => s.status === 'planned')) break;
  await new Promise(r => setTimeout(r, 20000 / Math.min(FAST, 10)));
  if (once && !running.size && !due.length) break;
 }
 while (running.size) await new Promise(r => setTimeout(r, 2000));
 if (browser) await browser.close();
}
function status() {
 const S = loadState(); if (!S) return console.log('還沒開始（先執行 run 或 once）');
 const T = S.today; console.log(`開始 ${S.start}，今天是第 ${T ? T.day + 1 : '?'} 天（${T ? T.date : ''}）`);
 if (T) for (const p of PEOPLE) { const pl = T.plans[p.id], st = S.people[p.id]; console.log(`${p.id} ${p.nick.padEnd(4, '　')} E=${pl ? pl.E.toFixed(2) : '–'} ${st.dormant ? '休眠 ' : ''}連續${st.streak}天｜${pl && pl.sessions.length ? pl.sessions.map(s => `${hm(s.start)} ${s.len}′ ${s.status}`).join('、') : '今天不來' + (pl && pl.why.length ? '（' + pl.why.join('、') + '）' : '')}`); }
}
function pack() { const to = path.resolve(String(arg('to'))), S = loadState(); if (!S) return console.log('沒有狀態'); fs.mkdirSync(path.join(to, 'people'), { recursive: true });
 fs.writeFileSync(path.join(to, 'main.json'), JSON.stringify({ start: S.start, days: S.days, today: S.today }));
 for (const id in S.people) { const st = S.people[id]; for (const w in st.mem) if (Date.now() - st.mem[w].t > 20 * 864e5) delete st.mem[w]; fs.writeFileSync(path.join(to, 'people', id + '.json'), JSON.stringify(st)); }
 console.log('packed', Object.keys(S.people).length); }
function unpack() { const from = path.resolve(String(arg('from'))), m = JSON.parse(fs.readFileSync(path.join(from, 'main.json'), 'utf8')), people = {};
 for (const f of fs.readdirSync(path.join(from, 'people'))) people[f.replace(/\.json$/, '')] = JSON.parse(fs.readFileSync(path.join(from, 'people', f), 'utf8'));
 for (const p of PEOPLE) if (!people[p.id]) people[p.id] = newState(p);
 saveState(Object.assign(m, { people })); console.log('unpacked', Object.keys(people).length); }
function summary() { const date = String(arg('date', tw(Date.now() - 6 * 3600e3).date)), f = path.join(DIR, 'logs', date + '.jsonl'); const L = fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map(x => JSON.parse(x)) : [];
 const ses = L.filter(x => x.type === 'session'), by = {}; for (const x of ses) { const b = by[x.id] || (by[x.id] = { n: 0, min: 0, ans: 0, right: 0, errors: 0 }); b.n++; b.min += x.real || 0; b.ans += x.ans || 0; b.right += x.right || 0; if (x.error) b.errors++; }
 console.log(JSON.stringify({ date, sessions: ses.length, people: Object.keys(by).length, minutes: Math.round(ses.reduce((a, x) => a + (x.real || 0), 0)), errors: ses.filter(x => x.error).map(x => ({ id: x.id, error: x.error })), missed: L.filter(x => x.type === 'missed').length, by }, null, 1)); }
if (CMD === 'pack') pack(); else if (CMD === 'unpack') unpack(); else if (CMD === 'summary') summary(); else
if (CMD === 'preview') preview();
else if (CMD === 'run') runLoop(false).then(() => process.exit(RESTART ? 3 : 0), e => { console.error('[life] 失敗：', e && e.message || e); process.exit(1); });
else if (CMD === 'once') runLoop(true).then(() => process.exit(0), e => { console.error('[life] 失敗：', e && e.message || e); process.exit(1); });   // never hang the hourly run
else if (CMD === 'status') status();
else console.log('用法：node tools/sim/life.cjs preview | run | once | status');
module.exports = { planDay, endDay, newState, PEOPLE };
