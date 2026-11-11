// 0.93.7 問題回報（reports）的安全規則測試。npm run test:rules 會一起執行。
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import test from 'node:test';
const env = await initializeTestEnvironment({ projectId: 'demo-report-rules', firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 } });
const as = (email, verified = true, uid = email) => env.authenticatedContext(uid, { email, email_verified: verified }).firestore();
const anon = uid => env.authenticatedContext(uid).firestore();
await env.withSecurityRulesDisabled(async c => {
  const d = c.firestore();
  await setDoc(doc(d, 'admins/boss@gmail.com'), { name: '' });
  const st = role => ({ role, active: true, name: '', note: '', createdBy: 'boss@gmail.com', createdAt: new Date(), updatedBy: 'boss@gmail.com', updatedAt: new Date() });
  await setDoc(doc(d, 'staff/mgr@gmail.com'), st('manager')); await setDoc(doc(d, 'staff/ana@gmail.com'), st('analyst'));
});
const rep = (by, over = {}) => ({ v: 1, by, acct: '', name: '小明', test: false, cat: 'quiz', ans: { item: 'moon', quizKind: 'two' }, text: '兩個都對', ver: '0.93.7', build: 'abcd1234', lang: 'zh-TW',
  dev: { ua: 'x', w: 390, h: 844, dpr: 3, mobile: true }, win: 'study', winText: '...', learn: 'daily · quiz', errs: [], shot: '', img: '', lvl: 2, status: 'new', note: '', t: Date.now(), at: serverTimestamp(), ...over });

test('玩家（匿名帳號）可以送出回報，也能讀回自己的', async () => {
  await assertSucceeds(setDoc(doc(anon('p1'), 'reports/r1'), rep('p1')));
  await assertSucceeds(getDoc(doc(anon('p1'), 'reports/r1')));
  await assertFails(getDoc(doc(anon('p2'), 'reports/r1')));
  await assertFails(getDocs(collection(anon('p1'), 'reports')));
});
test('冒名、格式錯誤、太大、多欄位、未登入都會被拒', async () => {
  await assertFails(setDoc(doc(anon('p1'), 'reports/r2'), rep('p2')));
  await assertFails(setDoc(doc(anon('p1'), 'reports/r3'), rep('p1', { status: 'done' })));
  await assertFails(setDoc(doc(anon('p1'), 'reports/r4'), rep('p1', { cat: 'hack' })));
  await assertFails(setDoc(doc(anon('p1'), 'reports/r5'), rep('p1', { text: 'x'.repeat(2001) })));
  await assertFails(setDoc(doc(anon('p1'), 'reports/r6'), rep('p1', { img: 'x'.repeat(620001) })));
  await assertFails(setDoc(doc(anon('p1'), 'reports/r7'), rep('p1', { extra: 1 })));
  await assertFails(setDoc(doc(anon('p1'), 'reports/r8'), rep('p1', { at: 123 })));
  await assertFails(setDoc(doc(anon('p1'), 'reports/r9'), rep('p1', { note: '我自己寫的備註' })));
  await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'reports/r10'), rep('x')));
  await assertSucceeds(setDoc(doc(anon('p1'), 'reports/r11'), rep('p1', { img: 'x'.repeat(600000), shot: 'y'.repeat(200000) })));
});
test('玩家不能修改或刪除已送出的回報', async () => {
  await assertSucceeds(setDoc(doc(anon('p1'), 'reports/r20'), rep('p1')));
  await assertFails(updateDoc(doc(anon('p1'), 'reports/r20'), { text: '改掉' }));
  await assertFails(deleteDoc(doc(anon('p1'), 'reports/r20')));
});
test('後台：分析者以上可以列出、改狀態；只能改狀態和備註；刪除限管理者', async () => {
  await assertSucceeds(setDoc(doc(anon('p1'), 'reports/r30'), rep('p1')));
  await assertSucceeds(getDocs(collection(as('ana@gmail.com'), 'reports')));
  await assertFails(getDocs(collection(as('nobody@gmail.com'), 'reports')));
  await assertSucceeds(updateDoc(doc(as('ana@gmail.com'), 'reports/r30'), { status: 'doing', note: '看過了', by2: 'ana@gmail.com', at2: serverTimestamp() }));
  await assertFails(updateDoc(doc(as('ana@gmail.com'), 'reports/r30'), { status: 'doing', note: '', by2: 'mgr@gmail.com', at2: serverTimestamp() }));
  await assertFails(updateDoc(doc(as('ana@gmail.com'), 'reports/r30'), { status: 'lost', note: '', by2: 'ana@gmail.com', at2: serverTimestamp() }));
  await assertFails(updateDoc(doc(as('ana@gmail.com'), 'reports/r30'), { text: '改玩家的字', status: 'done', note: '', by2: 'ana@gmail.com', at2: serverTimestamp() }));
  await assertFails(updateDoc(doc(as('nobody@gmail.com'), 'reports/r30'), { status: 'done', note: '', by2: 'nobody@gmail.com', at2: serverTimestamp() }));
  await assertSucceeds(getDoc(doc(anon('p1'), 'reports/r30')));
  await assertFails(deleteDoc(doc(as('ana@gmail.com'), 'reports/r30')));
  await assertSucceeds(deleteDoc(doc(as('mgr@gmail.com'), 'reports/r30')));
});
