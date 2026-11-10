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
  if (a === 'merchant' && (ses.count.merchant || 0) >= 1 && !today.story) x *= .2;
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
// Opening the game in a fresh browser checks ~7,000 asset files (about 4–6 minutes of CPU on a small machine), so several
// can load at once but not unlimited: --load-conc (default 3) at a time, each allowed --load-timeout minutes (default 30).
// The session's own play time is counted from when the room is on screen, so a slow load never shortens the visit.
const LOAD_CONC = Math.max(1, +arg('load-conc', 3)), LOAD_MS = Math.max(1, +arg('load-timeout', 30)) * 60e3; let loading = 0; const loadQ = [];
async function loadSlot() { if (loading < LOAD_CONC) { loading++; return; } await new Promise(r => loadQ.push(r)); loading++; }
function loadDone() { loading--; const r = loadQ.shift(); if (r) r(); }
let browserP = null;   // sessions that start together share one launch (a race here used to leave extra browsers running, so `once` never exited)
async function launch() { if (!browserP) { const { chromium } = require('playwright'); browserP = chromium.launch(); } return browser = await browserP; }
async function runSession(S, p, s) {
 const st = S.people[p.id], date = S.today.date, today = st.daily[date] || (st.daily[date] = { daily: false, grade: false });
 const share = p.shareDevice && p.id > p.shareDevice ? p.shareDevice : p.id, storeFile = path.join(DIR, 'browser', share + '.json');
 const vp = p.device === 'phone' ? { width: 390, height: 844, isMobile: true, hasTouch: true } : p.device === 'tablet' ? { width: 820, height: 1180, isMobile: true, hasTouch: true } : { width: 1366, height: 860 };
 const b = await launch(), ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, locale: p.lang === 'ja' ? 'ja-JP' : 'zh-TW', timezoneId: 'Asia/Taipei', storageState: !arg('no-store') && fs.existsSync(storeFile) ? storeFile : undefined });
 await ctx.addInitScript(([dev, lang]) => { try { if (!localStorage.getItem('pocketnook.device')) localStorage.setItem('pocketnook.device', dev); localStorage.setItem('purr-cozy.language', lang); } catch (e) { } }, [st.device || ('test-' + share), p.lang || 'zh-TW']);
 if (arg('no-upload')) await ctx.route(/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com/, r => r.abort());   // testing: nothing reaches Firebase, so no test data appears in the admin
 if (!arg('direct')) await ctx.route(u => u.href.startsWith(BASE) && !/version\.json/.test(u.href), async r => { const url = r.request().url(), hit = cache.get(url); if (hit) return r.fulfill(hit); try { const res = await r.fetch(); const body = await res.body(); if (res.status() === 200 && body.length < 30e6) cache.set(url, { status: 200, headers: res.headers(), body }); return r.fulfill({ response: res, body }); } catch (e) { return r.abort(); } });
 const page = await ctx.newPage(), errors = [], netBad = []; page.on('pageerror', e => errors.push(e.message.slice(0, 200)));
 // for diagnosing a load that never finishes: failed requests and HTTP errors while the game opens
 page.on('requestfailed', r => { if (netBad.length < 40) netBad.push('fail ' + r.url().replace(BASE, '').slice(0, 80) + ' ' + ((r.failure() || {}).errorText || '')); });
 page.on('response', r => { if (r.status() >= 400 && netBad.length < 40) netBad.push(r.status() + ' ' + r.url().replace(BASE, '').slice(0, 80)); });
 const ev = (fn, a) => page.evaluate(fn, a), wait = ms => new Promise(r => setTimeout(r, Math.max(0, ms / FAST)));
 const ses = { elapsed: 0, count: {}, mins: {}, ans: 0, right: 0, frustration: 0, rewards: 0, music: false, cut: false, goalDone: false, acts: [] }; let t0 = Date.now(), endAt = Infinity;
 try {
  const q0 = Date.now(); await loadSlot(); s.queued = +((Date.now() - q0) / 60000).toFixed(1);
  try { await page.goto(BASE + 'index.html', { timeout: 180000 });
   await page.waitForFunction(() => !document.getElementById('loading') && typeof Learn !== 'undefined' && Game.S, null, { timeout: LOAD_MS, polling: 2000 });
  } catch (e) {
   // say where it stopped: the loading screen's own text (progress or error), page errors, failed / 4xx-5xx requests
   const screen = await page.evaluate(() => { const el = document.getElementById('loading'); return { text: el ? el.innerText.replace(/\s+/g, ' ').trim().slice(0, 200) : '(沒有載入畫面)', learn: typeof Learn !== 'undefined', game: typeof Game !== 'undefined' && !!Game.S, stats: window.PurrAssets ? PurrAssets.stats : null, ready: document.readyState }; }).catch(x => ({ text: '(讀不到頁面：' + String(x.message || x).slice(0, 80) + ')' }));
   const diag = `載入逾時 ${Math.round((Date.now() - q0) / 60000)} 分｜畫面：${screen.text}｜Learn ${!!screen.learn} Game ${!!screen.game} ${screen.ready || ''}｜素材 ${screen.stats ? JSON.stringify(screen.stats) : '–'}｜頁面錯誤 ${errors.length}：${errors.slice(0, 3).join(' / ')}｜網路問題 ${netBad.length}：${netBad.slice(0, 6).join(' / ')}`;
   console.log('[life] ' + p.id + ' ' + diag);
   throw new Error(diag);
  } finally { loadDone(); }
  const coins0 = await ev(() => Game.S.coins);
  // sign in (the shared tablet switches accounts here)
  const acc = ACCOUNTS[p.id];
  if (acc) { const who = await ev(() => typeof Cloud !== 'undefined' && Cloud.user ? Cloud.user.email : '');
   if (who !== acc.email) { await page.waitForFunction(() => typeof Cloud !== 'undefined' && Cloud.fb, null, { timeout: 60000 }).catch(() => { });
    s.login = await ev(async a => { try { if (Cloud.user) await Cloud.fb.signOut(); await Cloud.fb.signIn(a.email, a.password); return 'ok'; } catch (e) { return (e && e.code) || String(e); } }, acc);
    await page.waitForFunction(e => Cloud.user && Cloud.user.email === e && ['synced', 'saving'].includes(Cloud.status), acc.email, { timeout: 90000 }).catch(() => { s.login += '（同步逾時）'; }); } }
  // name + test flags. The game applies the account's registry seed (name 測試NN, group) a moment after the first sync,
  // which can overwrite what is set here, so it is set again a few seconds later and once more before leaving.
  const fixId = () => ev(([d, nick]) => { const g = typeof Placement !== 'undefined' && Placement.S(); if (g && !g.declared && d) g.declared = d; if (Game.S.avatar && (!Game.S.avatar.name || /^測試\d+$/.test(Game.S.avatar.name) || Game.S.avatar.name === (window.NAME_DEFAULT || ''))) Game.S.avatar.name = nick;
   const f = Game.S.flags || {}; if (f.tester && f.testGroup === 'claude-sim' && Game.S.avatar && Game.S.avatar.name === nick) return; Game.S.flags = Object.assign({}, f, { tester: true, testGroup: 'claude-sim' }); Game.save(); if (typeof UI !== 'undefined' && UI.refresh) try { UI.refresh('profile'); } catch (e) { } }, [p.declared || 0, p.nick]).catch(() => { });
  await fixId(); await new Promise(r => setTimeout(r, 6000)); await fixId();   // test account: its logs are left out of the analysis
  s.load = +((Date.now() - t0) / 1000).toFixed(0); t0 = Date.now(); endAt = t0 + s.len * 60000 / FAST;
  if (RUN_END && endAt > RUN_END) { s.carry = +((endAt - RUN_END) * FAST / 60000).toFixed(1); endAt = RUN_END; }   // the rest continues in the next hourly run   // the visit starts once the room is on screen
  await wait(lognormal(3000 * p.play.pace, .4));
  // first look: popups are closed or read
  await ev(() => { for (const w of Object.keys(UI.wins || {})) if (UI.wins[w] && !UI.wins[w].el.hidden && w !== 'placement') UI.closeWin(w); });
  if (p.play.dislikes.includes('music')) await ev(() => { if (typeof Music !== 'undefined' && Music.playing) Music.toggle(); });
  while (Date.now() < endAt) {
   if (chance(p.play.interrupt * .1)) { ses.cut = true; break; }
   const st2 = await ev(() => ({ daily: !!Game.S.learn.dailyDone, grade: typeof Placement !== 'undefined' && Placement.done() && Placement.todayDone(), claimable: !!(Life.L.daily && Life.L.daily.tasks.some(t => t.prog >= t.need && !t.claimed)) || (typeof Weekly !== 'undefined' && Weekly.readyN() > 0), weekly: typeof Weekly !== 'undefined' ? Weekly.readyN() : 0, mNew: typeof Merchant !== 'undefined' ? !Merchant.S.seen : null, story: typeof Story !== 'undefined' && Story.pending(), ct: (() => { try { const Z = Contest.Z, R = Z.run; return { on: Z.on, over: !!(R && R.over), mid: !!(R && !R.over && R.qs && R.qi > 0), best: Z.top ? Z.top.l : 0 }; } catch (e) { return null; } })() }));
   Object.assign(today, st2);
   const a = nextActivity(p, st, ses, today); ses.count[a] = (ses.count[a] || 0) + 1; ses.acts.push(a);
   const dwell = Math.min(lognormal(DWELL[a] * p.play.pace, .5), (endAt - Date.now()) * FAST / 60000 + .5), aStart = Date.now();
   await act(page, p, st, ses, a, dwell, wait);
   const spent = (Date.now() - aStart) * FAST / 60000; ses.mins[a] = (ses.mins[a] || 0) + spent; ses.elapsed += spent;
   if (p.play.goal && today[p.play.goal] !== undefined) { const done = await ev(g => g === 'daily' ? !!Game.S.learn.dailyDone : g === 'grade' ? (typeof Placement !== 'undefined' && Placement.todayDone()) : false, p.play.goal); if (done) { ses.goalDone = true; if (chance(.8)) break; } }
   if (ses.frustration >= 2 && chance(p.play.frustration)) { ses.cut = true; break; }
  }
  ses.rewards = Math.max(0, (await ev(() => Game.S.coins)) - coins0);
  // leaving: children often just close; adults wait for the save
  await fixId();
  if (p.age >= 13 || chance(.4)) { await ev(() => { dispatchEvent(new Event('pagehide')); Game.save(); }); for (let i = 0; i < 10; i++) { const q = await ev(() => typeof LearnLog !== 'undefined' ? LearnLog.queue().length : 0); if (!q) break; await ev(() => LearnLog.flush()); await new Promise(r => setTimeout(r, 1500)); } }
  s.grade = await ev(() => typeof Placement !== 'undefined' && Placement.done() ? +Placement.S().theta.toFixed(2) : null);
  if (!arg('no-store')) await ctx.storageState({ path: storeFile, indexedDB: true });
 } catch (e) { s.error = String(e && e.message || e).slice(0, 900); }
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
   if (p.play.dislikes.some(d => ['quiz', 'forced_learning', 'learning_tasks'].includes(d))) ses.frustration += .5;
   let wrongRun = 0;
   for (let guard = 0; guard < 300; guard++) {
    const q = await ev(() => { const s = Learn.sess; if (!s) return null; if (s.step === 'review' || s.step === 'pause') { const i = s.words[s.ri]; return { step: s.step, w: VOCAB[i].w, g: VOCAB[i].g }; } if (s.step === 'quiz') { if (s.ans) return { step: 'wait' }; const q = s.qs[s.qi]; return { step: 'quiz', i: q.i, w: VOCAB[q.i].w, g: VOCAB[q.i].g, type: q.type, opts: q.opts }; } return { step: s.step }; });
    if (!q) break; if (q.step === 'result') { await wait(lognormal(3500 * p.play.pace, .4));
     // a breakthrough pulls most people on to the next Level while they still have time
     if (a === 'contest') { const go = await ev(() => { const s = Learn.sess, R = Contest.Z.run; return !!(s && s.result && s.result.pass && R && !R.over); }); if (go && chance(Date.now() < until ? .85 : .35)) { ses.ctUp = (ses.ctUp || 0) + 1; await ev(() => Contest.play()); continue; } }
     await ev(() => UI.closeWin('study')); break; }
    if (q.step === 'wait') { await new Promise(r => setTimeout(r, 300)); continue; }
    if (q.step === 'pause') { if (Date.now() < until || chance(.6)) { await wait(1500); await ev(() => Learn.more()); continue; } break; }
    if (q.step === 'review') { const know = chance(answerChance(p, st, q.w, q.g, 'en2zh')); await wait(lognormal((know ? 2400 : 4500) * p.play.pace, .4)); await ev(k => Learn.review(k), know || chance(.2)); learnWord(p, st, q.w, true); continue; }
    if (Date.now() > until + 120000 / FAST && a !== 'daily' && a !== 'grade' && a !== 'storyq') { if (a === 'contest') { ses.ctPause = true; await ev(() => UI.closeWin('study')); } break; }
    const typed = q.type === 'spell' || q.type === 'listenspell';
    if (typed && p.play.dislikes.includes('spell')) { ses.frustration += .5; if (chance(.5)) { ses.cut = true; break; } }
    const pr = answerChance(p, st, q.w, q.g, q.type), ok = chance(pr);
    await wait(lognormal((typed ? 3500 + 400 * q.w.length : 3000) * p.play.pace * (pr < .5 ? 1.6 : 1), .45));
    const val = typed ? (ok ? q.w : misspell(q.w)) : ok ? q.i : q.opts.filter(o => o !== q.i)[Math.floor(rnd() * 3)];
    const got = await ev(v => { Learn.answer(v); return Learn.sess && Learn.sess.ans ? !!Learn.sess.ans.ok : null; }, val);
    if (got == null) continue; ses.ans++; if (got) { ses.right++; wrongRun = 0; } else if (++wrongRun >= 3 && chance(p.play.frustration)) { ses.frustration++; }
    learnWord(p, st, q.w, got);
    if (got) await new Promise(r => setTimeout(r, 2500)); else { await wait(lognormal(2600 * p.play.pace, .4)); await ev(() => Learn.next()); }
   }
   return;
  }
  if (a === 'music') { await ev(() => { if (typeof Music !== 'undefined' && !Music.playing) Music.toggle(); }); ses.music = true; await wait((until - Date.now()) * FAST); return; }
  if (a === 'focus') { await ev(() => { if (!Game.T().running) Game.start(); }); await wait((until - Date.now()) * FAST); await ev(() => { if (Game.T().running) Game.pause(); }); return; }
  if (a === 'tasks') { await ev(() => { UI.openTasks ? UI.openTasks('daily') : UI.openWin('tasks'); }); await wait(lognormal(4000 * p.play.pace, .4)); await ev(() => { try { Life.L.daily.tasks.forEach((t, i) => { if (t.prog >= t.need && !t.claimed) Life.claimTask(i); }); if (Life.L.daily.tasks.every(t => t.claimed) && !Life.L.daily.bonus) Life.claimBonus(); } catch (e) { } let n = 0; try { if (typeof Weekly !== 'undefined') { UI.openTasks('weekly'); for (const k of Object.keys(WEEKLY_DEFS)) if (Weekly.ready(k)) { Weekly.claim(k); n++; } } } catch (e) { } UI.closeWin('tasks'); return n; }).then(n => { if (n) ses.weekly = (ses.weekly || 0) + n; }); return; }
  if (a === 'social') { await ev(() => UI.openWin('friends')); await wait(lognormal(6000 * p.play.pace, .4)); await ev(() => { if (typeof Social !== 'undefined' && Social.ready && Social.ready()) { UI.frTab = 'board'; Social.loadBoard('lvl'); UI.refresh('friends'); } }); await wait(lognormal(8000, .4)); await ev(() => UI.closeWin('friends')); return; }
  if (a === 'shop') { await ev(() => UI.openWin('shop')); await wait(lognormal(20000 * p.play.pace, .5)); await ev(() => UI.closeWin('shop')); return; }
  if (a === 'look') { await wait(lognormal(25000 * p.play.pace, .5)); return; }
  while (Date.now() < until) {
   if (a === 'cat' || a === 'toys') await ev(k => { const pets = PetPlay.pets(); if (!pets.length) return; const x = pets[Math.floor(Math.random() * pets.length)], d = x.data; PetPlay.trayOpen = true;
     if (k === 'cat' && d && d.hunger < 55 && PetPlay.owned('cat_can')) { PetPlay.pick('cat_can'); PetPlay.down(x.x, x.y - 7); }
     else if (k === 'toys' && (Pets.Z.tools.ball || Pets.Z.tools.yarn || Life.L.bag.catnip)) { const t = Pets.Z.tools.ball && Math.random() < .5 ? 'ball' : Pets.Z.tools.yarn ? 'yarn' : Life.L.bag.catnip ? 'catnip' : 'ball'; PetPlay.pick(t); PetPlay.down(x.x + 22 - Math.random() * 44, Math.max(110, Math.min(160, x.y + 4))); }
     else if (Pets.Z.tools.brush && Math.random() < .5) { PetPlay.pick('brush'); PetPlay.down(x.x, x.y - 7); }
     else { PetPlay.drop(); Game.interact && Room.hit && (() => { const h = Room.hit(x.x, x.y - 6); if (h && h.kind === 'actor' && h.a.poke) h.a.poke(); })(); } }, a);
   else if (a === 'mini') await ev(() => { const it = Game.S.items.find(i => ITEMS[i.k] && ITEMS[i.k].cozyGame) || Game.S.items.find(i => ITEMS[i.k] && ITEMS[i.k].interactionProfile && ITEMS[i.k].interactionProfile !== 'native'); if (it) Game.interact(it); else UI.openWin('catstypo'); });
   else if (a === 'decor') await ev(() => { if (!Room.edit) UI.setEdit(true); const items = Game.S.items.filter(i => ITEMS[i.k] && ITEMS[i.k].layer !== 'wall' && i.p == null), it = items[Math.floor(Math.random() * items.length)]; if (!it) return; Room.sel = it; it.x += Math.round(Math.random() * 16 - 8); Room.clampItem(it); if (Math.random() < .2) it.flip = !it.flip; Game.save(); UI.editToolbar(); });
   await wait(lognormal(a === 'mini' ? 30000 : a === 'decor' ? 9000 : 6000, .5) * p.play.pace);
   await ev(() => { for (const w of ['cozygame', 'furnplay', 'catstypo']) if (UI.wins[w] && !UI.wins[w].el.hidden) UI.closeWin(w); });
  }
  if (a === 'decor') await ev(() => { if (Room.edit) UI.setEdit(false); });
 } catch (e) { ses.error = String(e && e.message || e).slice(0, 160); }
}
// the weekly merchant: say hello, maybe hear today's story chapter (lore card → 4 words → 2 questions → 5-question story quiz), maybe buy something
async function merchantVisit(page, p, st, ses, until, wait) {
 const ev = (fn, x) => page.evaluate(fn, x), P = p.play.prefs, D = p.play.dislikes, reader = !D.some(d => ['reading', 'long_text'].includes(d));
 const info = await ev(() => { if (typeof Merchant === 'undefined') return null; const first = !Merchant.S.seen; Merchant.go(); const has = typeof Story !== 'undefined', St = has ? Story.week() : null, i = has ? Story.next() : -1;
  return { first, id: Merchant.id(), i, needName: i === 4 && St && !St.name, names: (St && St.names) || [], lore: typeof Lore !== 'undefined' && Lore.on() }; });
 if (!info) return; ses.merchant = info.id; await wait(lognormal((info.first ? 9000 : 4000) * p.play.pace, .4));
 const storyLike = (P.story || 0) + .4 * (p.triggers.merchant || 0) + .15;
 if (info.i >= 0 && chance(Math.min(.95, storyLike * (reader ? 1 : .4) * (p.age < 8 ? .5 : 1)))) {
  ses.storyCh = info.i;
  if (info.needName) { await ev(n => Story.choose(n), info.names[Math.floor(rnd() * info.names.length)]); await wait(lognormal(5000 * p.play.pace, .4)); }
  let quiz = true;
  if (info.lore) {
   await ev(i => { UI.closeWin('merchant'); Story.open(); Lore.start(i); }, info.i); ses.lore = (ses.lore || 0) + 1;
   await wait(lognormal((reader ? 30000 : 9000) * p.play.pace * (p.age < 10 ? 1.4 : 1), .5));      // 你知道嗎？ + the English line
   await ev(() => Lore.toWords()); await wait(lognormal(14000 * p.play.pace, .5));                  // 今天的單字
   await ev(() => Lore.toQuiz());
   for (let k = 0; k < 6; k++) {
    const q = await ev(() => { const v = Lore.view; if (!v || v.step !== 'quiz') return null; const c = Lore.C(), a = c.q[v.qi][1]; return { a, opts: v.opts[v.qi], g: typeof VIDX !== 'undefined' && VIDX[a] != null ? VOCAB[VIDX[a]].g : 5 }; });
    if (!q) break; await wait(lognormal(7000 * p.play.pace * (p.age < 10 ? 1.5 : 1), .45));
    const ok = chance(Math.max(.5, answerChance(p, st, q.a, q.g, 'zh2en'))), val = ok ? q.a : q.opts.filter(o => o !== q.a)[Math.floor(rnd() * 3)] || q.a;
    await ev(w => Lore.answer(w), val); ses.loreQ = (ses.loreQ || 0) + 1; if (ok) ses.loreRight = (ses.loreRight || 0) + 1; learnWord(p, st, q.a, ok);
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
   if (got) ses.bought = (ses.bought || []).concat(got);
  }
  await ev(() => UI.closeWin('merchant'));
 } else await ev(() => UI.closeWin('merchant'));
}
async function typoRound(page, p, st, ses, until, wait) {
 const ev = (fn, a) => page.evaluate(fn, a);
 const ok0 = await ev(() => { if (typeof CatsTypo === 'undefined') return false; UI.openWin('catstypo'); CatsTypo.start(); return !!CatsTypo.session; }); if (!ok0) return;
 if (p.play.dislikes.includes('spell')) ses.frustration += .5;
 for (let guard = 0; guard < 40; guard++) {
  const cur = await ev(() => { const S = CatsTypo.session; if (!S) return null; if (S.done) return { done: true }; const v = CatsTypo.current(); return { w: v.w, g: v.g, answered: !!S.answered, at: S.at }; });
  if (!cur) break; if (cur.done) { await wait(2500); await ev(() => UI.closeWin('catstypo')); break; }
  if (cur.answered) { await new Promise(r => setTimeout(r, 2500)); await ev(at => { if (CatsTypo.session && CatsTypo.session.at === at && CatsTypo.session.answered) CatsTypo.advance(); }, cur.at); continue; }
  let solved = false; for (let k = 0; k < 3 && !solved; k++) { const ok = chance(answerChance(p, st, cur.w, cur.g, 'spell') * (k ? .7 : 1)); await wait(lognormal((2500 + 500 * cur.w.length) * p.play.pace, .45));
   solved = await ev(t => { CatsTypo.active = true; CatsTypo.value = t; CatsTypo.submit(); return !!(CatsTypo.session && CatsTypo.session.answered); }, ok ? cur.w.toLowerCase() : misspell(cur.w)); if (!solved && chance(.3)) break; }
  if (!solved) await ev(() => CatsTypo.reveal()); ses.ans++; if (solved) ses.right++; learnWord(p, st, cur.w, solved);
  if (Date.now() > until && chance(.5)) { await ev(() => UI.closeWin('catstypo')); break; }
 }
}
function misspell(word) { const w = String(word).toLowerCase(); if (w.length < 3) return w + 'e'; const i = 1 + Math.floor(rnd() * (w.length - 2)); return chance(.5) ? w.slice(0, i) + w.slice(i + 1) : w.replace(/[aeiou]/, v => 'aeiou'.replace(v, '')[Math.floor(rnd() * 4)]); }

async function runLoop(once) {
 if (once) RUN_END = Date.now() + (+arg('window', 30) + 3) * 60e3;
 let S = loadState();
 if (!S || arg('start')) { const start = String(arg('start', arg('start-if-new', tw(Date.now()).date))); S = { start, days: DAYS, people: Object.fromEntries(PEOPLE.map(p => [p.id, newState(p)])), today: null }; saveState(S); console.log(`[life] 新的兩週：從 ${start} 開始`); }
 const CONC = +arg('concurrency', 6), win = +arg('window', 30) * 60e3, running = new Set();
 for (;;) {
  const T = ensurePlan(S); if (!T) { console.log('[life] 不在模擬期間（' + S.start + ' 起 ' + S.days + ' 天）'); break; }
  const now = Date.now(), due = [];
  for (const p of PEOPLE) for (const s of (T.plans[p.id] || { sessions: [] }).sessions) {
   if (s.status !== 'planned') continue;
   if (!arg('test-now') && s.t < now - 45 * 60e3) { s.status = 'missed'; logLine(T.date, { type: 'missed', id: p.id, sid: s.id }); continue; }   // the computer was off
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
else if (CMD === 'run') runLoop(false);
else if (CMD === 'once') runLoop(true).then(() => process.exit(0), e => { console.error('[life] 失敗：', e && e.message || e); process.exit(1); });   // never hang the hourly run
else if (CMD === 'status') status();
else console.log('用法：node tools/sim/life.cjs preview | run | once | status');
module.exports = { planDay, endDay, newState, PEOPLE };
