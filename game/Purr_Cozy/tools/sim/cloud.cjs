#!/usr/bin/env node
/* ============================================================
   呼嚕小窩：兩週生活模擬的雲端執行器（排程每小時呼叫一次，不需要任何人的電腦）
   - 狀態、程式碼、帳號都放在 Firestore 的一個「控制帳號」底下（claude-test00@purrcozy.test，後台「批次建立測試帳號」會一起建立）：
       saves/{控制帳號}                 = 模擬狀態（data 是 JSON 字串，rev 每次 +1）
       saves/{控制帳號}/backups/code-*  = life.cjs、people.json、cloud.cjs
       saves/{控制帳號}/backups/accounts = 30 個測試帳號的登入資料
       saves/{控制帳號}/backups/log-*   = 每一次執行的紀錄、day-* 每天的統計
     這個帳號只是放資料，不會有人用它進遊戲。
   - node cloud.cjs run      下載程式與狀態 → 執行接下來一小時的場次 → 上傳狀態與紀錄（另一個執行中就直接結束）
   - node cloud.cjs setup --controller <帳密.json> --accounts <accounts.json> --start <YYYY-MM-DD>   第一次設定（上傳程式碼與帳號）
   - node cloud.cjs report [--date …]  印出某天或全部的統計
   帳密（依序找）：環境變數 SIM_EMAIL / SIM_PASSWORD → --controller 檔案 → --accounts（或 .sim/accounts.json）裡的 controller 欄位。
   ============================================================ */
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const KEY = 'AIzaSyCZDorIT08dX1oqF4RZ8pTqDStl0pwWR_Q', PROJECT = 'pocket-nook', REF = 'https://jamiace.github.io/';
const DOCS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const argv = process.argv.slice(2), CMD = argv[0] || 'run', arg = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const WORK = path.resolve(arg('work', path.join(process.cwd(), 'purr-sim'))); fs.mkdirSync(path.join(WORK, 'tools', 'sim'), { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function http(url, body, method = 'POST', tok) {
 const h = { 'Content-Type': 'application/json', Referer: REF }; if (tok) h.Authorization = 'Bearer ' + tok;
 for (let i = 0; i < 4; i++) { try { const r = await fetch(url, { method, headers: h, body: body == null ? undefined : JSON.stringify(body) }); const t = await r.text(); const j = t ? JSON.parse(t) : {}; if (!r.ok) { const e = Object.assign(new Error((j.error && j.error.message) || r.status), { status: r.status }); if (r.status >= 500 || r.status === 429) { await sleep(2000 * (i + 1)); continue; } throw e; } return j; } catch (e) { if (e.status && e.status < 500 && e.status !== 429) throw e; if (i === 3) throw e; await sleep(2000 * (i + 1)); } }
}
// ---- Firestore value <-> JS ----
const enc = v => v === null || v === undefined ? { nullValue: null } : typeof v === 'boolean' ? { booleanValue: v } : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }) : typeof v === 'string' ? { stringValue: v } : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
const dec = v => 'stringValue' in v ? v.stringValue : 'integerValue' in v ? +v.integerValue : 'doubleValue' in v ? v.doubleValue : 'booleanValue' in v ? v.booleanValue : 'nullValue' in v ? null : 'timestampValue' in v ? Date.parse(v.timestampValue) : 'mapValue' in v ? Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, dec(x)])) : 'arrayValue' in v ? (v.arrayValue.values || []).map(dec) : null;
const fields = doc => Object.fromEntries(Object.entries(doc.fields || {}).map(([k, v]) => [k, dec(v)]));
let TOK = '', UID = '', EMAIL = '';
async function signIn() {
 let e = process.env.SIM_EMAIL, p = process.env.SIM_PASSWORD; const fromFile = f => { const j = JSON.parse(fs.readFileSync(f, 'utf8')); return j.controller || j; };
 if (!e && arg('controller')) ({ email: e, password: p } = fromFile(arg('controller')));
 if (!e) { const f = arg('accounts', path.join(__dirname, '..', '..', '.sim', 'accounts.json')); if (fs.existsSync(f)) { const c = JSON.parse(fs.readFileSync(f, 'utf8')).controller; if (c) ({ email: e, password: p } = c); } }
 if (!e || !p) throw new Error('需要控制帳號（SIM_EMAIL / SIM_PASSWORD，或 accounts.json 的 controller；後台 → 批次建立測試帳號 → 只建立模擬控制帳號）');
 const r = await http(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`, { email: e, password: p, returnSecureToken: true }); TOK = r.idToken; UID = r.localId; EMAIL = e;
}
const save = {
 async get() { try { return fields(await http(`${DOCS}/saves/${UID}`, null, 'GET', TOK)); } catch (e) { if (e.status === 404) return null; throw e; } },
 async put(stateObj, rev) {
  const d = { v: 1, schema: 1, rev, savedAt: Date.now(), device: 'claude-sim', lvl: 1, coins: 0, email: EMAIL, dev: false, sync: { sim: true }, data: JSON.stringify(stateObj) };
  if (d.data.length > 880000) throw new Error('模擬狀態太大：' + d.data.length);
  await http(`${DOCS}:commit`, { writes: [{ update: { name: `projects/${PROJECT}/databases/(default)/documents/saves/${UID}`, fields: Object.fromEntries(Object.entries(d).map(([k, v]) => [k, enc(v)])) }, updateTransforms: [{ fieldPath: 'updated', setToServerValue: 'REQUEST_TIME' }] }] }, 'POST', TOK);
 },
};
const box = {
 async get(id) { try { const f = fields(await http(`${DOCS}/saves/${UID}/backups/${id}`, null, 'GET', TOK)); return f.data; } catch (e) { if (e.status === 404) return null; throw e; } },
 async put(id, data, reason) {
  try { await http(`${DOCS}/saves/${UID}/backups/${id}`, null, 'DELETE', TOK); } catch (e) { }
  const d = { v: 1, at: Date.now(), reason: String(reason || id).slice(0, 190), device: 'claude-sim', savedAt: Date.now(), lvl: 1, coins: 0, data };
  if (data.length > 880000) throw new Error(id + ' 太大');
  await http(`${DOCS}:commit`, { writes: [{ update: { name: `projects/${PROJECT}/databases/(default)/documents/saves/${UID}/backups/${id}`, fields: Object.fromEntries(Object.entries(d).map(([k, v]) => [k, enc(v)])) }, updateTransforms: [{ fieldPath: 'updated', setToServerValue: 'REQUEST_TIME' }] }] }, 'POST', TOK);
 },
 async list(prefix) { const out = []; let page = ''; for (;;) { const r = await http(`${DOCS}/saves/${UID}/backups?pageSize=300${page ? '&pageToken=' + page : ''}`, null, 'GET', TOK); for (const d of r.documents || []) { const id = d.name.split('/').pop(); if (!prefix || id.startsWith(prefix)) out.push({ id, ...fields(d) }); } if (!r.nextPageToken) break; page = r.nextPageToken; } return out; },
};
const tw = t => new Date(t + 8 * 3600e3).toISOString();
// ---- state <-> the files life.cjs reads ----
function writeState(dir, st) { fs.mkdirSync(path.join(dir, 'people'), { recursive: true }); fs.writeFileSync(path.join(dir, 'main.json'), JSON.stringify({ start: st.start, days: st.days, today: st.today })); for (const [id, p] of Object.entries(st.people || {})) fs.writeFileSync(path.join(dir, 'people', id + '.json'), JSON.stringify(p)); }
function readState(dir) { const m = JSON.parse(fs.readFileSync(path.join(dir, 'main.json'), 'utf8')), people = {}; for (const f of fs.readdirSync(path.join(dir, 'people'))) { const p = JSON.parse(fs.readFileSync(path.join(dir, 'people', f), 'utf8')); const ws = Object.entries(p.mem || {}).sort((a, b) => b[1].t - a[1].t).slice(0, 250); p.mem = Object.fromEntries(ws.map(([w, x]) => [w, { s: +x.s.toFixed(3), d: +x.d.toFixed(2), t: x.t }])); people[f.replace(/\.json$/, '')] = p; } return Object.assign(m, { people }); }
const node = (args, opt = {}) => new Promise(res => { const c = spawn(process.execPath, args, Object.assign({ cwd: WORK, stdio: ['ignore', 'pipe', 'pipe'] }, opt)); let out = ''; c.stdout.on('data', d => { out += d; process.stdout.write(d); }); c.stderr.on('data', d => { out += d; process.stderr.write(d); }); c.on('close', code => res({ code, out })); });

async function setup() {
 await signIn();
 for (const [id, f] of [['code-life', 'life.cjs'], ['code-people', 'people.json'], ['code-cloud', 'cloud.cjs']]) await box.put(id, fs.readFileSync(path.join(__dirname, f), 'utf8'), f);
 if (arg('accounts')) await box.put('accounts', fs.readFileSync(arg('accounts'), 'utf8'), '30 個測試帳號');
 const cur = await save.get();
 if (!cur || arg('reset')) { const st = { start: arg('start'), days: +arg('days', 14), people: {}, today: null, lock: null, runs: 0, created: tw(Date.now()) }; await save.put(st, cur ? (cur.rev || 0) + 1 : 1); console.log('新的模擬狀態，開始日', st.start); }
 console.log('setup ok', UID);
}
async function run() {
 const t0 = Date.now(); await signIn();
 let cur = await save.get(); if (!cur) throw new Error('還沒 setup');
 let S = JSON.parse(cur.data);
 if (S.lock && S.lock.until > Date.now()) { console.log('另一次執行還在進行（到 ' + tw(S.lock.until).slice(11, 16) + '），這次跳過'); return; }
 S.lock = { at: Date.now(), until: Date.now() + 80 * 60e3 }; S.runs = (S.runs || 0) + 1; let rev = (cur.rev || 0) + 1; await save.put(S, rev);
 const SIM = path.join(WORK, 'tools', 'sim'), STATE = path.join(WORK, '.sim', 'life'), PACK = path.join(WORK, 'pack');
 fs.rmSync(STATE, { recursive: true, force: true }); fs.rmSync(PACK, { recursive: true, force: true }); fs.mkdirSync(STATE, { recursive: true });
 for (const [id, f] of [['code-life', 'life.cjs'], ['code-people', 'people.json']]) fs.writeFileSync(path.join(SIM, f), await box.get(id));
 fs.writeFileSync(path.join(WORK, 'accounts.json'), await box.get('accounts'));
 const common = ['--state', STATE, '--accounts', path.join(WORK, 'accounts.json')];
 if (S.today || Object.keys(S.people || {}).length) { writeState(PACK, S); await node([path.join(SIM, 'life.cjs'), 'unpack', '--from', PACK, ...common]); }
 const window = arg('window', '50');   // hourly runs: 50 minutes of starts, so one run never overlaps the next
 const r = await node([path.join(SIM, 'life.cjs'), 'once', '--login', '--no-store', '--window', window, '--concurrency', arg('concurrency', '4'), '--start-if-new', S.start, ...common, ...(arg('only') ? ['--only', arg('only')] : [])]);
 await node([path.join(SIM, 'life.cjs'), 'pack', '--to', PACK, ...common]);
 const fresh = readState(PACK); const logs = fs.existsSync(path.join(STATE, 'logs')) ? fs.readdirSync(path.join(STATE, 'logs')).map(f => fs.readFileSync(path.join(STATE, 'logs', f), 'utf8')).join('') : '';
 // the day that just ended: one summary document
 const prevDay = S.today && fresh.today && S.today.day !== fresh.today.day ? S.today : null;
 cur = await save.get(); rev = (cur.rev || 0) + 1;
 const next = Object.assign({}, S, fresh, { start: S.start, days: S.days, lock: null, last: { at: tw(Date.now()), minutes: +((Date.now() - t0) / 60000).toFixed(1), code: r.code } });
 await save.put(next, rev);
 const id = 'log-' + tw(t0).slice(0, 16).replace(/[:T]/g, '-');
 await box.put(id, JSON.stringify({ at: tw(t0), minutes: next.last.minutes, code: r.code, lines: logs.trim().split('\n').filter(Boolean).map(x => { try { return JSON.parse(x); } catch (e) { return null; } }).filter(Boolean), tail: r.out.slice(-3000) }), '模擬執行紀錄');
 if (prevDay) { const ses = Object.entries(prevDay.plans).flatMap(([pid, pl]) => pl.sessions.map(s => Object.assign({ id: pid }, s)));
  await box.put('day-' + prevDay.date, JSON.stringify({ date: prevDay.date, day: prevDay.day + 1, planned: ses.length, done: ses.filter(s => s.status === 'done').length, missed: ses.filter(s => s.status === 'missed').length, minutes: Math.round(ses.reduce((a, s) => a + (s.real || 0), 0)), people: Object.keys(prevDay.plans).filter(k => prevDay.plans[k].sessions.some(s => s.status === 'done')).length, errors: ses.filter(s => s.error).map(s => ({ id: s.id, error: s.error })) }), '每日統計'); }
 console.log(`[cloud] 完成：${next.last.minutes} 分鐘，狀態 rev ${rev}`);
}
async function report() {
 await signIn(); const cur = await save.get(); const S = cur ? JSON.parse(cur.data) : null;
 const days = await box.list('day-'), logs = await box.list('log-');
 console.log(JSON.stringify({ start: S && S.start, runs: S && S.runs, last: S && S.last, lock: S && S.lock, today: S && S.today && { day: S.today.day + 1, date: S.today.date, sessions: Object.values(S.today.plans).reduce((a, p) => a + p.sessions.length, 0), done: Object.values(S.today.plans).reduce((a, p) => a + p.sessions.filter(s => s.status === 'done').length, 0) }, days: days.map(d => JSON.parse(d.data)), runLogs: logs.length, errors: logs.flatMap(l => { try { return JSON.parse(l.data).lines.filter(x => x.error).map(x => ({ at: x.at, id: x.id, error: x.error })); } catch (e) { return []; } }).slice(-20) }, null, 1));
}
(CMD === 'setup' ? setup() : CMD === 'report' ? report() : run()).catch(e => { console.error('[cloud] 失敗：', e.message); process.exit(1); });
