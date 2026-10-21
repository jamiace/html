// 安全規則測試：npm install 之後執行 npm run test:rules（需要 Java 11+，Firebase 模擬器會自動下載）
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, getDocs, collection, addDoc, deleteDoc, serverTimestamp, query, limit } from 'firebase/firestore';

let env;
const save = (over = {}) => ({ v: 1, schema: 3, rev: 1, savedAt: Date.now(), device: 'test', lvl: 1, coins: 150, email: 'a@b.c', dev: false, sync: {}, data: '{"v":1}', updated: serverTimestamp(), ...over });
const backup = (over = {}) => ({ v: 1, at: Date.now(), reason: 'test', device: 'test', savedAt: Date.now(), lvl: 1, coins: 150, data: '{"v":1}', updated: serverTimestamp(), ...over });

before(async () => { env = await initializeTestEnvironment({ projectId: 'demo-pocket-nook', firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') } }); });
after(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

const alice = () => env.authenticatedContext('alice').firestore();
const bob = () => env.authenticatedContext('bob').firestore();
const guest = () => env.unauthenticatedContext().firestore();

test('玩家可以建立、讀取、更新自己的存檔', async () => {
  await assertSucceeds(setDoc(doc(alice(), 'saves/alice'), save()));
  await assertSucceeds(getDoc(doc(alice(), 'saves/alice')));
  await assertSucceeds(setDoc(doc(alice(), 'saves/alice'), save({ rev: 2, coins: 300 })));
});
test('不同帳號是不同文件，互相讀不到、寫不到', async () => {
  await assertSucceeds(setDoc(doc(alice(), 'saves/alice'), save()));
  await assertSucceeds(setDoc(doc(bob(), 'saves/bob'), save()));
  await assertFails(getDoc(doc(bob(), 'saves/alice')));
  await assertFails(setDoc(doc(bob(), 'saves/alice'), save({ rev: 2 })));
  await assertFails(deleteDoc(doc(bob(), 'saves/alice')));
});
test('未登入者不能讀寫任何存檔', async () => {
  await assertSucceeds(setDoc(doc(alice(), 'saves/alice'), save()));
  await assertFails(getDoc(doc(guest(), 'saves/alice')));
  await assertFails(setDoc(doc(guest(), 'saves/guest'), save()));
});
test('不能列出所有玩家的存檔', async () => {
  await assertFails(getDocs(query(collection(alice(), 'saves'), limit(1))));
});
test('rev 必須連續：同時從兩台裝置寫入，慢的那一台被拒絕', async () => {
  await assertSucceeds(setDoc(doc(alice(), 'saves/alice'), save()));
  await assertSucceeds(setDoc(doc(alice(), 'saves/alice'), save({ rev: 2, device: 'phone' })));
  await assertFails(setDoc(doc(alice(), 'saves/alice'), save({ rev: 2, device: 'laptop' })));
  await assertFails(setDoc(doc(alice(), 'saves/new'), save({ rev: 5 })));
});
test('格式錯誤、太大、多出欄位的存檔被拒絕', async () => {
  await assertFails(setDoc(doc(alice(), 'saves/alice'), save({ data: 123 })));
  await assertFails(setDoc(doc(alice(), 'saves/alice'), save({ admin: true })));
  await assertFails(setDoc(doc(alice(), 'saves/alice'), save({ data: 'x'.repeat(900001) })));
  await assertFails(setDoc(doc(alice(), 'saves/alice'), save({ updated: 1 })));
});
test('測試存檔（dev: true）不能被改回 false', async () => {
  await assertSucceeds(setDoc(doc(alice(), 'saves/alice'), save({ dev: true })));
  await assertFails(setDoc(doc(alice(), 'saves/alice'), save({ rev: 2, dev: false })));
  await assertSucceeds(setDoc(doc(alice(), 'saves/alice'), save({ rev: 2, dev: true })));
});
test('備份只能新增、讀自己的，不能修改', async () => {
  const r = await assertSucceeds(addDoc(collection(alice(), 'saves/alice/backups'), backup()));
  await assertSucceeds(getDocs(collection(alice(), 'saves/alice/backups')));
  await assertFails(updateDoc(doc(alice(), `saves/alice/backups/${r.id}`), { reason: 'changed' }));
  await assertFails(getDocs(collection(bob(), 'saves/alice/backups')));
  await assertFails(addDoc(collection(alice(), 'saves/alice/backups'), { v: 1, probe: true }));
});
test('其他路徑一律拒絕', async () => {
  await assertFails(setDoc(doc(alice(), 'leaderboard/alice'), { score: 1 }));
  await assertFails(getDoc(doc(alice(), 'config/admin')));
});
