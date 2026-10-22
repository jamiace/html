// 安全規則測試：npm install 之後執行 npm run test:rules（需要 Java 11+，Firebase 模擬器會自動下載）
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, getDocs, collection, addDoc, deleteDoc, serverTimestamp, query, limit, orderBy, writeBatch } from 'firebase/firestore';

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
// ---------- 名片、好友、拜訪、排行榜 ----------
const carol = () => env.authenticatedContext('carol').firestore();
const now = () => serverTimestamp();
const fr = (s, name = '好友') => ({ s, name, at: now() });
const card = (over = {}) => ({ name: '小明', code: 'ABC234', status: '今天背 40 個字', ava: { skin: 'peach' }, lvl: 3, pets: [{ id: 1, sp: 'cat:ginger', name: '麻糬' }], wk: 'w20261019', wm: 30, tm: 600, room: '{}', dev: false, at: now(), ...over });
const row = (over = {}) => ({ name: '小明', ava: { skin: 'peach' }, lvl: 3, lv: 30000120, coins: 500, tm: 600, w: { w20261019: 30 }, at: now(), ...over });
const room = (over = {}) => ({ name: 'Bob', data: '{}', at: now(), ...over });
const help = (from, need = '12-1792600000000', over = {}) => ({ from, name: '小明', kind: 'water', need, target: '34', tname: '龜背芋', day: '2026-10-22', at: now(), ...over });
// alice invites bob (both copies in one batch), bob accepts (both copies in one batch)
async function befriend() {
  const a = alice(), b1 = writeBatch(a);
  b1.set(doc(a, 'users/alice/friends/bob'), fr('out', 'Bob')); b1.set(doc(a, 'users/bob/friends/alice'), fr('in', 'Alice')); await b1.commit();
  const b = bob(), b2 = writeBatch(b);
  b2.update(doc(b, 'users/bob/friends/alice'), { s: 'ok', at: now() }); b2.update(doc(b, 'users/alice/friends/bob'), { s: 'ok', name: 'Bob', at: now() }); await b2.commit();
}

test('名片：登入的人可以看單一份，不能列出全部；只能寫自己的', async () => {
  await assertSucceeds(setDoc(doc(alice(), 'profiles/alice'), card()));
  await assertSucceeds(getDoc(doc(bob(), 'profiles/alice')));
  await assertFails(getDoc(doc(guest(), 'profiles/alice')));
  await assertFails(getDocs(query(collection(bob(), 'profiles'), limit(1))));
  await assertFails(setDoc(doc(bob(), 'profiles/alice'), card()));
  await assertFails(setDoc(doc(alice(), 'profiles/alice'), card({ coins: 999 })));
  await assertFails(setDoc(doc(alice(), 'profiles/alice'), card({ name: '' })));
});
test('好友代碼：只能用自己的 UID 建立，不能改、不能搶別人的', async () => {
  await assertSucceeds(setDoc(doc(alice(), 'codes/ABC234'), { uid: 'alice', at: now() }));
  await assertSucceeds(getDoc(doc(bob(), 'codes/ABC234')));
  await assertFails(setDoc(doc(bob(), 'codes/ABC234'), { uid: 'bob', at: now() }));
  await assertFails(setDoc(doc(bob(), 'codes/XYZ999'), { uid: 'alice', at: now() }));
  await assertFails(setDoc(doc(bob(), 'codes/bad'), { uid: 'bob', at: now() }));
  await assertFails(deleteDoc(doc(bob(), 'codes/ABC234')));
});
test('排行榜：一次最多讀 30 筆；只能寫自己的一列', async () => {
  await assertSucceeds(setDoc(doc(alice(), 'board/alice'), row()));
  await assertSucceeds(getDocs(query(collection(bob(), 'board'), orderBy('lv', 'desc'), limit(30))));
  await assertSucceeds(getDocs(query(collection(bob(), 'board'), orderBy('w.w20261019', 'desc'), limit(30))));
  await assertFails(getDocs(query(collection(bob(), 'board'), orderBy('lv', 'desc'), limit(31))));
  await assertFails(getDocs(query(collection(guest(), 'board'), limit(5))));
  await assertFails(setDoc(doc(bob(), 'board/alice'), row()));
  await assertFails(setDoc(doc(alice(), 'board/alice'), row({ coins: -1 })));
  await assertFails(setDoc(doc(alice(), 'board/alice'), row({ w: { a: 1, b: 2 } })));
  await assertSucceeds(deleteDoc(doc(alice(), 'board/alice')));
});
test('好友：要對方接受才算；不能替別人假造成好友', async () => {
  await assertSucceeds(setDoc(doc(alice(), 'users/alice/friends/bob'), fr('out', 'Bob')));
  await assertSucceeds(setDoc(doc(alice(), 'users/bob/friends/alice'), fr('in', 'Alice')));
  await assertFails(setDoc(doc(alice(), 'users/alice/friends/carol'), fr('ok', 'Carol')));     // can't make yourself friends
  await assertFails(setDoc(doc(carol(), 'users/bob/friends/alice'), fr('in', 'Alice')));       // can't invite on someone else's behalf
  await assertFails(updateDoc(doc(alice(), 'users/bob/friends/alice'), { s: 'ok', at: now() }));  // can't accept your own invite
  await assertFails(getDocs(collection(alice(), 'users/bob/friends')));
  await assertFails(setDoc(doc(alice(), 'users/alice/friends/alice'), fr('out', 'me')));
  await assertSucceeds(updateDoc(doc(bob(), 'users/bob/friends/alice'), { s: 'ok', at: now() }));
  await assertSucceeds(updateDoc(doc(bob(), 'users/alice/friends/bob'), { s: 'ok', name: 'Bob', at: now() }));
  await assertSucceeds(deleteDoc(doc(alice(), 'users/bob/friends/alice')));
  await assertSucceeds(deleteDoc(doc(alice(), 'users/alice/friends/bob')));
});
test('房間：只有本人和好友看得到；只有好友能留幫忙紀錄，每個需求只有一位先到的人能留', async () => {
  await assertSucceeds(setDoc(doc(bob(), 'rooms/bob'), room()));
  await assertFails(getDoc(doc(alice(), 'rooms/bob')));
  await assertFails(setDoc(doc(alice(), 'rooms/bob/help/12-1792600000000'), help('alice')));
  await befriend();
  await assertSucceeds(getDoc(doc(alice(), 'rooms/bob')));
  await assertFails(getDoc(doc(carol(), 'rooms/bob')));
  await assertFails(setDoc(doc(alice(), 'rooms/bob'), room()));
  await assertSucceeds(setDoc(doc(alice(), 'rooms/bob/help/12-1792600000000'), help('alice')));
  await assertFails(setDoc(doc(alice(), 'rooms/bob/help/12-1792600000000'), help('alice')));          // already taken
  await assertFails(setDoc(doc(alice(), 'rooms/bob/help/13-1792600000000'), help('carol', '13-1792600000000')));   // pretending to be someone else
  await assertFails(setDoc(doc(alice(), 'rooms/bob/help/14-1792600000000'), help('alice', '99-1')));      // id must match the need
  await assertFails(setDoc(doc(alice(), 'rooms/bob/help/15-1792600000000'), help('alice', '15-1792600000000', { kind: 'coins' })));
  await assertFails(setDoc(doc(carol(), 'rooms/bob/help/16-1792600000000'), help('carol', '16-1792600000000')));
  await assertFails(getDocs(collection(alice(), 'rooms/bob/help')));
  await assertSucceeds(getDocs(collection(bob(), 'rooms/bob/help')));
  await assertSucceeds(deleteDoc(doc(bob(), 'rooms/bob/help/12-1792600000000')));
});

// ---------- 團隊任務 ----------
const team = (by, over = {}) => ({ type: 'd', period: '2026-10-22', task: 'focus', goal: 90, max: 3, members: [by], names: { [by]: by }, prog: { [by]: 0 }, open: false, full: false, doneAt: 0, roster: [], by, at: now(), ...over });
const joinAs = (uid, tm) => ({ members: [...tm.members, uid], names: { ...tm.names, [uid]: uid }, prog: { ...tm.prog, [uid]: 0 }, full: tm.members.length + 1 >= tm.max, at: now() });
test('團隊：開放配對才能被陌生人加入，不能超過人數上限', async () => {
  const t1 = team('alice', { open: true });
  await assertSucceeds(setDoc(doc(alice(), 'teams/t1'), t1));
  await assertFails(setDoc(doc(bob(), 'teams/t2'), team('alice')));                       // can't create a team for someone else
  await assertSucceeds(getDocs(query(collection(bob(), 'teams'), limit(20))));
  await assertFails(getDocs(query(collection(bob(), 'teams'), limit(21))));
  await assertSucceeds(updateDoc(doc(bob(), 'teams/t1'), joinAs('bob', t1)));
  const t1b = { ...t1, ...joinAs('bob', t1) };
  await assertSucceeds(updateDoc(doc(carol(), 'teams/t1'), joinAs('carol', t1b)));
  const t1c = { ...t1b, ...joinAs('carol', t1b) };
  await assertFails(updateDoc(doc(env.authenticatedContext('dave').firestore(), 'teams/t1'), joinAs('dave', t1c)));   // full
  // closed team: only with an invitation from a friend
  await assertSucceeds(setDoc(doc(alice(), 'teams/t3'), team('alice')));
  await assertFails(updateDoc(doc(bob(), 'teams/t3'), joinAs('bob', team('alice'))));
});
test('團隊：只能改自己的進度，而且只能變多；任務內容不能改', async () => {
  await assertSucceeds(setDoc(doc(alice(), 'teams/t1'), team('alice', { open: true })));
  await assertSucceeds(updateDoc(doc(bob(), 'teams/t1'), joinAs('bob', team('alice', { open: true }))));
  await assertSucceeds(updateDoc(doc(bob(), 'teams/t1'), { 'prog.bob': 30, at: now() }));
  await assertFails(updateDoc(doc(bob(), 'teams/t1'), { 'prog.bob': 10, at: now() }));
  await assertFails(updateDoc(doc(bob(), 'teams/t1'), { 'prog.alice': 50, at: now() }));
  await assertFails(updateDoc(doc(bob(), 'teams/t1'), { goal: 1, at: now() }));
  await assertFails(updateDoc(doc(carol(), 'teams/t1'), { 'prog.carol': 5, at: now() }));   // not a member
});
test('團隊：達成時名單固定，名單上的人（包含零貢獻）各領一次', async () => {
  await assertSucceeds(setDoc(doc(alice(), 'teams/t1'), team('alice', { open: true })));
  await assertSucceeds(updateDoc(doc(bob(), 'teams/t1'), joinAs('bob', team('alice', { open: true }))));
  await assertSucceeds(updateDoc(doc(alice(), 'teams/t1'), { 'prog.alice': 90, at: now() }));
  await assertFails(updateDoc(doc(alice(), 'teams/t1'), { doneAt: now(), roster: ['alice'], open: false, full: true, at: now() }));   // roster must be everyone
  await assertSucceeds(updateDoc(doc(alice(), 'teams/t1'), { doneAt: now(), roster: ['alice', 'bob'], open: false, full: true, at: now() }));
  await assertFails(updateDoc(doc(carol(), 'teams/t1'), { members: ['alice', 'bob', 'carol'], names: { alice: 'alice', bob: 'bob', carol: 'carol' }, prog: { alice: 90, bob: 0, carol: 0 }, full: true, at: now() }));
  await assertFails(updateDoc(doc(bob(), 'teams/t1'), { members: ['alice'], names: { alice: 'alice' }, prog: { alice: 90 }, full: false, open: false, at: now() }));   // can't leave after
  await assertSucceeds(setDoc(doc(bob(), 'teams/t1/claims/bob'), { at: now() }));        // bob did nothing and still gets it
  await assertFails(setDoc(doc(bob(), 'teams/t1/claims/bob'), { at: now() }));           // only once
  await assertFails(setDoc(doc(carol(), 'teams/t1/claims/carol'), { at: now() }));       // not on the roster
});
test('團隊：組隊倒數只能歸零、不能延長；離開後可以再加入；換隊時離開舊隊和加入新隊一起送出', async () => {
  const t1 = team('alice', { mAt: 1792600000000 });
  await assertSucceeds(setDoc(doc(alice(), 'teams/t1'), t1));
  await assertFails(updateDoc(doc(alice(), 'teams/t1'), { mAt: 1792600999999, at: now() }));        // can't extend the lobby
  await assertFails(updateDoc(doc(bob(), 'teams/t1'), { open: true, mAt: 0, at: now() }));          // not a member
  await assertSucceeds(updateDoc(doc(alice(), 'teams/t1'), { open: true, mAt: 0, at: now() }));     // match now / auto match
  const open1 = { ...t1, open: true, mAt: 0 };
  await assertSucceeds(updateDoc(doc(bob(), 'teams/t1'), joinAs('bob', open1)));
  await assertSucceeds(updateDoc(doc(bob(), 'teams/t1'), { members: ['alice'], names: { alice: 'alice' }, prog: { alice: 0 }, full: false, open: true, at: now() }));   // leave
  await assertSucceeds(updateDoc(doc(bob(), 'teams/t1'), joinAs('bob', open1)));                   // and come back
  // bob moves from t1 to carol's open team in one batch
  const t2 = team('carol', { open: true });
  await assertSucceeds(setDoc(doc(carol(), 'teams/t2'), t2));
  const b = writeBatch(bob());
  b.update(doc(bob(), 'teams/t1'), { members: ['alice'], names: { alice: 'alice' }, prog: { alice: 0 }, full: false, open: true, at: now() });
  b.update(doc(bob(), 'teams/t2'), joinAs('bob', t2));
  await assertSucceeds(b.commit());
  await assertFails(setDoc(doc(alice(), 'teams/t9'), team('alice', { mAt: 'soon' })));
});
test('排行榜：開發者存檔可以選擇列入（dev 標記）', async () => {
  const row = { name: 'a', ava: {}, lvl: 3, lv: 30000000, coins: 10, tm: 5, w: { w20261019: 5 }, at: now() };
  await assertSucceeds(setDoc(doc(alice(), 'board/alice'), { ...row, dev: true }));
  await assertFails(setDoc(doc(alice(), 'board/alice'), { ...row, dev: 'yes' }));
});
test('團隊邀請：只有好友能寄', async () => {
  const inv = (from) => ({ from, name: from, type: 'd', period: '2026-10-22', task: 'focus', at: now() });
  await assertFails(setDoc(doc(carol(), 'tinv/bob/list/t1'), inv('carol')));
  await befriend();
  await assertSucceeds(setDoc(doc(alice(), 'tinv/bob/list/t1'), inv('alice')));
  await assertFails(setDoc(doc(alice(), 'tinv/bob/list/t2'), inv('carol')));
  await assertSucceeds(getDocs(collection(bob(), 'tinv/bob/list')));
  await assertFails(getDocs(collection(carol(), 'tinv/bob/list')));
  await assertSucceeds(deleteDoc(doc(bob(), 'tinv/bob/list/t1')));
});

test('其他路徑一律拒絕', async () => {
  await assertFails(setDoc(doc(alice(), 'leaderboard/alice'), { score: 1 }));
  await assertFails(getDoc(doc(alice(), 'config/admin')));
});
