// 0.93.8 角色權限（roles）與帳號控制（ctrl：封停、踢下線）的安全規則測試。npm run test:rules 會一起執行。
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import test from 'node:test';
const env = await initializeTestEnvironment({ projectId: 'demo-perm-rules', firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 } });
const as = (email) => env.authenticatedContext(email, { email, email_verified: true }).firestore();
const kid = uid => env.authenticatedContext(uid).firestore();
const st = (role, active = true) => ({ role, active, name: '', note: '', createdBy: 'boss@gmail.com', createdAt: new Date(), updatedBy: 'boss@gmail.com', updatedAt: new Date() });
await env.withSecurityRulesDisabled(async c => {
  const d = c.firestore();
  await setDoc(doc(d, 'admins/boss@gmail.com'), { name: '' });
  await setDoc(doc(d, 'roles/support'), { name: '客服', desc: '', p: ['reports.v', 'reports.e', 'players.v', 'pctl.v', 'pctl.e'], updatedBy: 'boss@gmail.com', updatedAt: new Date() });
  await setDoc(doc(d, 'roles/lead'), { name: '組長', desc: '', p: ['reports.v', 'reports.e', 'players.v', 'pctl.v', 'pctl.e', 'accounts.v', 'accounts.e', 'roles.v', 'roles.e'], updatedBy: 'boss@gmail.com', updatedAt: new Date() });
  await setDoc(doc(d, 'staff/mgr@gmail.com'), st('manager')); await setDoc(doc(d, 'staff/ana@gmail.com'), st('analyst'));
  await setDoc(doc(d, 'staff/cs@gmail.com'), st('support')); await setDoc(doc(d, 'staff/lead@gmail.com'), st('lead'));
  await setDoc(doc(d, 'saves/kid1'), { v: 1, schema: 3, rev: 1, savedAt: 1, device: 'd', lvl: 1, coins: 0, email: '', dev: false, sync: {}, data: '{}', updated: new Date() });
  await setDoc(doc(d, 'reports/r1'), { by: 'x', status: 'new', note: '' });
  await setDoc(doc(d, 'learnlog/a1/lsess/s1'), { v: 1 });
});
const ctrl = (by, over = {}) => ({ ban: true, until: 0, reason: '測試', kick: 0, hist: [], by, at: serverTimestamp(), ...over });
const role = (by, p, over = {}) => ({ name: 'x', desc: '', p, updatedBy: by, updatedAt: serverTimestamp(), ...over });
const save = rev => ({ v: 1, schema: 3, rev, savedAt: 2, device: 'd', lvl: 1, coins: 0, email: '', dev: false, sync: {}, data: '{}', updated: serverTimestamp() });

test('自訂角色：只拿得到勾選的權限', async () => {
  const cs = as('cs@gmail.com');
  await assertSucceeds(getDocs(collection(cs, 'reports')));
  await assertSucceeds(updateDoc(doc(cs, 'reports/r1'), { status: 'doing', note: '', by2: 'cs@gmail.com', at2: serverTimestamp() }));
  await assertFails(deleteDoc(doc(cs, 'reports/r1')));               // 刪除回報還需要「資料與匯出」修改
  await assertSucceeds(getDoc(doc(cs, 'saves/kid1')));                // 玩家帳號：查詢
  await assertFails(setDoc(doc(cs, 'saves/kid1'), { ...save(2), sync: { admin: 'cs@gmail.com' } }));   // 沒有修改存檔
  await assertFails(getDocs(collection(cs, 'staff')));                 // 沒有後台帳號
  await assertFails(getDoc(doc(cs, 'learnlog/a1/lsess/s1')));          // 沒有任何分析頁 → 讀不到學習紀錄
  await assertSucceeds(getDocs(collection(cs, 'roles')));              // 角色清單：後台帳號都能讀
  await assertFails(getDocs(collection(kid('kid1'), 'roles')));
});
test('封停與踢下線：有 pctl 修改權限才能寫；玩家讀得到自己的', async () => {
  await assertSucceeds(setDoc(doc(as('cs@gmail.com'), 'ctrl/kid1'), ctrl('cs@gmail.com', { until: Date.now() + 864e5 })));
  await assertFails(setDoc(doc(as('ana@gmail.com'), 'ctrl/kid2'), ctrl('ana@gmail.com')));
  await assertFails(setDoc(doc(as('cs@gmail.com'), 'ctrl/kid2'), ctrl('boss@gmail.com')));
  await assertFails(setDoc(doc(as('cs@gmail.com'), 'ctrl/kid2'), { ...ctrl('cs@gmail.com'), extra: 1 }));
  await assertSucceeds(getDoc(doc(kid('kid1'), 'ctrl/kid1')));
  await assertFails(getDoc(doc(kid('kid2'), 'ctrl/kid1')));
  await assertFails(setDoc(doc(kid('kid1'), 'ctrl/kid1'), ctrl('kid1', { ban: false })));   // 玩家不能自己解封
  await assertSucceeds(getDocs(collection(as('mgr@gmail.com'), 'ctrl')));
  await assertFails(getDocs(collection(as('ana@gmail.com'), 'ctrl')));
});
test('封停中不能寫存檔、名片、排行榜；到期或解除後可以', async () => {
  const k = kid('kid1');
  await assertFails(setDoc(doc(k, 'saves/kid1'), save(2)));
  await assertFails(setDoc(doc(k, 'board/kid1'), { name: 'a', ava: {}, lvl: 1, lv: 1, coins: 0, tm: 0, w: {}, at: serverTimestamp() }));
  await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'ctrl/kid1'), { ban: true, until: Date.now() - 1000, reason: '', kick: 0, hist: [], by: 'x', at: new Date() }));
  await assertSucceeds(setDoc(doc(k, 'saves/kid1'), save(2)));       // 已到期
  await assertSucceeds(setDoc(doc(as('cs@gmail.com'), 'ctrl/kid1'), ctrl('cs@gmail.com', { ban: false, kick: Date.now() })));
  await assertSucceeds(setDoc(doc(k, 'saves/kid1'), save(3)));
  await assertSucceeds(setDoc(doc(kid('kid5'), 'saves/kid5'), save(1)));   // 沒有 ctrl 文件的玩家照常
});
test('角色：只有最高管理者能改內建角色；其他人只能建立不超過自己權限的角色', async () => {
  const boss = as('boss@gmail.com'), lead = as('lead@gmail.com'), mgr = as('mgr@gmail.com');
  await assertSucceeds(setDoc(doc(boss, 'roles/viewer'), role('boss@gmail.com', ['dashboard.v'])));
  await assertSucceeds(setDoc(doc(boss, 'roles/analyst'), role('boss@gmail.com', ['dashboard.v', 'analysis.v'])));
  await assertFails(setDoc(doc(lead, 'roles/analyst'), role('lead@gmail.com', ['reports.v'])));          // 內建角色
  await assertSucceeds(setDoc(doc(lead, 'roles/helper'), role('lead@gmail.com', ['reports.v', 'pctl.v'])));
  await assertFails(setDoc(doc(lead, 'roles/helper2'), role('lead@gmail.com', ['reports.v', 'data.e'])));  // 超過自己
  await assertFails(setDoc(doc(lead, 'roles/lead'), role('lead@gmail.com', ['reports.v'])));              // 自己的角色
  await assertFails(setDoc(doc(mgr, 'roles/helper3'), role('mgr@gmail.com', ['reports.v'])));             // 管理者沒有角色修改權限
  await assertFails(setDoc(doc(boss, 'roles/Bad'), role('boss@gmail.com', ['reports.v'])));
  await assertFails(setDoc(doc(boss, 'roles/x1'), role('boss@gmail.com', 'reports.v')));
  await assertSucceeds(deleteDoc(doc(lead, 'roles/helper')));
  await assertFails(deleteDoc(doc(lead, 'roles/lead')));      // 自己的角色
  await assertFails(deleteDoc(doc(lead, 'roles/manager')));   // 內建角色
});
test('後台帳號：只能指派不超過自己權限、不是自己角色的角色', async () => {
  const lead = as('lead@gmail.com'), boss = as('boss@gmail.com');
  const staff = (by, r) => ({ role: r, active: true, name: '', note: '', createdBy: by, createdAt: serverTimestamp(), updatedBy: by, updatedAt: serverTimestamp() });
  await assertSucceeds(setDoc(doc(lead, 'staff/n1@gmail.com'), staff('lead@gmail.com', 'support')));
  await assertFails(setDoc(doc(lead, 'staff/n2@gmail.com'), staff('lead@gmail.com', 'lead')));
  await assertFails(setDoc(doc(lead, 'staff/n3@gmail.com'), staff('lead@gmail.com', 'manager')));
  await assertFails(setDoc(doc(lead, 'staff/n4@gmail.com'), staff('lead@gmail.com', 'nope')));
  await assertFails(updateDoc(doc(lead, 'staff/mgr@gmail.com'), { active: false, updatedBy: 'lead@gmail.com', updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(doc(lead, 'staff/n1@gmail.com'), { active: false, updatedBy: 'lead@gmail.com', updatedAt: serverTimestamp() }));
  await assertSucceeds(setDoc(doc(boss, 'staff/n5@gmail.com'), staff('boss@gmail.com', 'lead')));
  await assertSucceeds(getDocs(collection(lead, 'staff')));
});
test.after(() => env.cleanup());
