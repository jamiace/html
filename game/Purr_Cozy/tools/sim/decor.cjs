/* ============================================================
   0.93.12 測試帳號會「佈置房間」：在遊戲頁面裡執行的佈置大腦（life.cjs 把它整段送進頁面執行）。
   以前的「佈置」只是把一件家具往左右挪幾格；現在每個人有自己的品味（people.json 的 decor）：
     - 新買的家具會放到合理的位置：床靠牆角、書桌靠牆、椅子在書桌前、檯燈在書桌或床邊、植物在窗下或角落、
       地毯在沙發前、掛畫在床或書桌上方並對齊、小東西放到桌面和層架上
     - 依個性不同：小小孩亂堆在房間中間和貓旁邊；整齊派會對齊、收掉雜物、左右對稱；主題派會整組換顏色；
       收藏派把層架擺滿；植物派把窗邊種滿；讀書派先顧好書桌那一角
     - 會猶豫：擺上去看一下，不滿意就移回去
     - 晚上開燈、早上關燈；貓弄倒的東西扶起來
   每個動作都用遊戲自己的函式（Game.place、Room.settleDecor、Game.storeItem、Game.applyWP…），
   並記成玩家行為（Life.track('move')），所以後台看到的佈置紀錄和真人一樣。
   ============================================================ */
module.exports = function DECOR(o) {
  const S = Game.S, I = k => ITEMS[k] || {}, out = [], rnd = Math.random;
  const care = o.care == null ? .5 : o.care, style = o.style || 'cozy';
  const name = it => I(it.k).n || it.k;
  const cv = it => Room.itemCanvas(it), W = it => cv(it).width, H = it => cv(it).height;
  const yb = it => it.y + H(it);                       // where an item stands on the floor
  const free = it => it.p == null;
  const color = k => (k.split('__')[1] || '');
  const noise = n => Math.round((rnd() * 2 - 1) * n * (1.15 - care));   // careless people place things roughly
  const hash = (uid, salt) => { let h = (uid * 2654435761 + salt * 40503) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; return (h % 1000) / 1000; };   // the same item always gets the same idea of where it belongs
  const recent = new Set(o.recent || []);
  const kindOf = it => { const d = I(it.k);
    if (d.window) return 'window';
    if (d.layer === 'wall') return d.surface ? 'wshelf' : d.clock ? 'clock' : 'art';
    if (d.layer === 'rug') return 'rug';
    if (d.layer === 'decor') return 'small';
    if (d.bed) return 'bed'; if (d.desk) return 'desk'; if (d.chair) return 'chair'; if (d.seat) return 'seat';
    if (d.fam === 'cat') return d.capacity || d.litter ? 'litter' : 'pet';
    if (d.fam === 'nature') return 'plant'; if (d.fam === 'lighting') return 'lamp';
    if (d.surface) return H(it) > 28 ? 'storage' : W(it) <= 24 ? 'side' : 'table';
    if (d.fam === 'storage') return 'storage'; if (d.fam === 'media') return 'media';
    return 'toy'; };
  const items = () => S.items.filter(it => I(it.k).layer);
  const floorOnes = () => items().filter(it => free(it) && I(it.k).layer === 'floor');
  const first = k => items().find(it => free(it) && kindOf(it) === k);
  const snap = it => ({ uid: it.uid, x: it.x, y: it.y, flip: !!it.flip, p: it.p, dx: it.dx, dy: it.dy });
  const done = (it, line, before) => { Room.indexItems(); if (Room.syncChildren) Room.syncChildren(); try { Life.track('move', 1); } catch (e) { } Game.save(); out.push({ line, uid: it.uid, before }); };
  // ---- floor geometry: the floor is a trapezoid; y = the line an item stands on (99 at the back wall … 168 at the front) ----
  const edge = y => floorX(y);
  const dep = it => Math.max(8, Math.min(24, Math.round(H(it) * .45)));   // how deep an item is on the floor
  const hits = (it, x, y) => floorOnes().some(o => o !== it && o.p == null && x < o.x + W(o) - 2 && x + W(it) > o.x + 2 && y - dep(it) < yb(o) - 1 && yb(o) - dep(o) < y - 1);
  const standAt = (it, x, y, tries = 40) => {   // nearest free spot along the same line, then a little forward
    for (let dy = 0; dy <= 24; dy += 8) for (let i = 0; i <= tries; i++) {
      const xx = x + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 5, yy = Math.min(168, y + dy), [a, b] = edge(yy);
      const cx = Math.max(Math.ceil(a) + 1, Math.min(Math.floor(b) - W(it) - 1, xx));
      if (!hits(it, cx, yy)) { it.x = Math.round(cx); it.y = Math.round(yy - H(it)); Room.clampItem(it); return true; } }
    it.x = Math.round(x); it.y = Math.round(y - H(it)); Room.clampItem(it); return false; };
  const wallAt = (it, x, y) => { const others = items().filter(o => o !== it && free(o) && I(o.k).layer === 'wall');
    for (let i = 0; i <= 20; i++) { const xx = Math.round(x + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 4);
      if (!others.some(o => xx < o.x + W(o) + 2 && xx + W(it) + 2 > o.x && y < o.y + H(o) + 2 && y + H(it) + 2 > o.y)) { it.x = xx; it.y = y; Room.clampItem(it); return true; } }
    it.x = Math.round(x); it.y = y; Room.clampItem(it); return false; };
  const side = it => (it.x + W(it) / 2 < 120 ? 'left' : 'right');
  const corner = (it, where, y) => { const [a, b] = edge(y); return where === 'left' ? a + 2 : b - W(it) - 2; };
  // ---- where each kind of thing belongs, for this person ----
  const bedSide = () => { const b = first('bed'); return b ? side(b) : (o.bedSide || 'left'); };
  const other = s => (s === 'left' ? 'right' : 'left');
  const ideal = it => {
    const k = kindOf(it), w = W(it), cx = 120 - w / 2;
    if (style === 'pile' && ['toy', 'pet', 'small', 'plant', 'seat'].includes(k)) { const c = (typeof Pets !== 'undefined' && Pets.list && Pets.list()[0]) || null; const px = c && c.x != null ? c.x : 120; return { x: px - w / 2 + noise(30), y: 130 + noise(20) }; }
    switch (k) {
      case 'bed': { const s = o.bedSide || bedSide(); return { x: corner(it, s, 102), y: 103, flip: s === 'right' }; }
      case 'side': { const b = first('bed'); if (b) { const s = side(b); return { x: s === 'left' ? b.x + W(b) + 1 : b.x - w - 1, y: yb(b) + 1 }; } return { x: corner(it, other(bedSide()), 104), y: 104 }; }
      case 'desk': { const s = other(bedSide()); return { x: corner(it, s, 101) + (s === 'left' ? 6 : -6), y: 101, flip: s === 'right' && rnd() < .5 }; }
      case 'chair': { const d = first('desk'); if (d) return { x: d.x + W(d) / 2 - w / 2, y: yb(d) + 10 }; const t = first('table'); return t ? { x: t.x - w - 2, y: yb(t) } : { x: cx, y: 130 }; }
      case 'seat': { const s0 = items().find(t => t !== it && free(t) && kindOf(t) === 'seat'); if (s0 && s0.uid < it.uid) return { x: s0.x + W(s0) + 12, y: yb(s0) - 18 }; const tv = items().find(t => I(t.k).tv); if (tv && free(tv)) return { x: tv.x + W(tv) / 2 - w / 2, y: 152 }; const r = first('rug'); if (r) return { x: r.x + W(r) / 2 - w / 2, y: r.y + H(r) / 2 + 4 }; return { x: cx, y: 104 }; }
      case 'table': { const s = first('seat'); if (s) return { x: s.x + W(s) / 2 - w / 2, y: yb(s) + 14 }; const r = first('rug'); if (r) return { x: r.x + W(r) / 2 - w / 2, y: r.y + H(r) / 2 + 2 }; return { x: cx, y: 136 }; }
      case 'storage': { const s = W(it) >= 36 ? other(bedSide()) : (hash(it.uid, 1) < .5 ? 'left' : 'right'); return { x: corner(it, s, 101), y: 101 }; }
      case 'lamp': { const near = (style === 'study' && first('desk')) || first('seat') || first('bed') || first('desk'); if (near) { const s = side(near); return { x: s === 'left' ? near.x + W(near) + 2 : near.x - w - 2, y: yb(near) - 1 }; } return { x: corner(it, 'left', 104), y: 104 }; }
      case 'plant': { const win = first('window'), h1 = hash(it.uid, 2); if ((style === 'green' || h1 < .5) && win) return { x: win.x + W(win) / 2 - w / 2 + (hash(it.uid, 3) < .5 ? -22 : 22), y: 104 }; const s = h1 < .75 ? 'left' : 'right'; return { x: corner(it, s, 164), y: 164 }; }
      case 'litter': { const s = other(bedSide()); return { x: corner(it, s, 166), y: 166 }; }
      case 'pet': { const s = other(bedSide()); return { x: corner(it, s, 150) + (s === 'left' ? 30 : -30), y: 156 }; }
      case 'media': { const n = first('desk') || first('seat'); return n ? { x: n.x - w - 3, y: yb(n) } : { x: corner(it, 'right', 104), y: 104 }; }
      case 'rug': { const s = first('seat'); if (s) return { x: s.x + W(s) / 2 - w / 2, y: yb(s) - H(it) / 2 + 10, rug: true }; return { x: cx, y: 132 - H(it) / 2, rug: true }; }
      case 'toy': if (['minimal', 'study', 'parent'].includes(style)) return { x: corner(it, hash(it.uid, 6) < .5 ? 'left' : 'right', 112), y: 112 }; return { x: 120 - w / 2 + Math.round((hash(it.uid, 4) - .5) * 80), y: 140 + Math.round((hash(it.uid, 5) - .5) * 30) };
      default: return null; } };
  const moveTo = (it, why) => { const g = ideal(it); if (!g) return false; const before = snap(it), d = I(it.k);
    if (d.layer === 'rug') { it.x = Math.round(g.x + noise(6)); it.y = Math.round(g.y); Room.clampItem(it); }
    else standAt(it, g.x + noise(10), Math.max(99, Math.min(168, g.y + noise(4))));
    if (g.flip != null && style !== 'pile') it.flip = g.flip; else if (style === 'pile' && rnd() < .25) it.flip = !it.flip;
    if (before.x === it.x && before.y === it.y && before.flip === !!it.flip) return false;
    done(it, `${why}「${name(it)}」`, before); return true; };
  // wall art: above the bed, desk or sofa, all on one line (careful people) or wherever (careless)
  const hang = (it, why) => { const before = snap(it), k = kindOf(it); if (k === 'window') return false;
    const anchors = ['bed', 'desk', 'seat', 'storage'].map(first).filter(Boolean), used = items().filter(o => o !== it && free(o) && I(o.k).layer === 'wall');
    const a = anchors.find(a => !used.some(u => Math.abs(u.x + W(u) / 2 - (a.x + W(a) / 2)) < 16)) || anchors[0];
    const row = used.filter(u => kindOf(u) === 'art').map(u => u.y).sort((p, q) => p - q), lineY = care >= .6 && row.length ? row[Math.floor(row.length / 2)] : 30 + noise(10);
    const x = a ? a.x + W(a) / 2 - W(it) / 2 : 60 + rnd() * 120, y = k === 'wshelf' ? Math.max(lineY + 18, 50) : k === 'clock' ? 24 + noise(6) : lineY;
    if (!wallAt(it, Math.round(x + noise(8)), Math.round(y)) && !wallAt(it, Math.round(x), Math.round(y + 26))) { Object.assign(it, before); Room.clampItem(it); return false; }   // no room there: leave it where it was
    if (before.x === it.x && before.y === it.y) return false; done(it, `${why}「${name(it)}」`, before); return true; };
  // small things go on a desk, nightstand, shelf or table that still has room
  const surfaces = () => items().filter(s => free(s) && I(s.k).surface).map(s => { const f = Room.surfaceOf(s), on = items().filter(c => c.p === s.uid); return { s, f, room: (f.x1 - f.x0) - on.reduce((t, c) => t + W(c) + 1, 0), on }; });
  const putOn = (it, why) => { const want = { lighting: ['desk', 'side'], media: ['desk', 'table'], work: ['desk'], collect: ['wshelf', 'storage', 'table'], nature: ['wshelf', 'side', 'table'], play: style === 'pile' ? [] : ['storage', 'wshelf', 'table'], cat: ['table', 'side'], rest: ['side', 'table'] }[I(it.k).fam] || ['table', 'side', 'wshelf', 'desk'];
    const all = surfaces().filter(x => x.s !== it && x.room > W(it) + 1 && (kindOf(x.s) !== 'wshelf' || (W(it) <= 22 && H(it) <= 18 && !I(it.k).tv))); if (!all.length) return false;
    const pick = all.find(x => want.includes(kindOf(x.s))) || (style === 'collector' ? all.find(x => kindOf(x.s) === 'wshelf') : null) || all[Math.floor(rnd() * all.length)];
    const before = snap(it), used = pick.on.reduce((t, c) => Math.max(t, c.x + W(c)), pick.f.x0);
    it.x = Math.round(care >= .6 ? Math.max(pick.f.x0, used + 1) : pick.f.x0 + rnd() * Math.max(1, pick.f.x1 - pick.f.x0 - W(it))); it.y = pick.f.y - H(it) + 1; Room.settleDecor(it);
    if (it.p !== pick.s.uid) { Object.assign(it, before); Room.clampItem(it); return false; }
    done(it, `${why}「${name(it)}」放到「${name(pick.s)}」上`, before); return true; };
  const arrange = (it, why) => { const k = kindOf(it); if (k === 'window') return false; if (I(it.k).layer === 'wall') return hang(it, why); if (k === 'small') return free(it) ? putOn(it, why) : false; return moveTo(it, why); };
  // how far something is from where this person thinks it belongs (picks what to fix first)
  const off = it => { const k = kindOf(it); if (k === 'window') return 0; if (k === 'small') return free(it) ? 30 : 0;
    if (recent.has(it.uid)) return 0; if (I(it.k).layer === 'wall') return kindOf(it) === 'art' && care >= .6 ? 8 : 0; const g = ideal(it); if (!g) return 0; const dd = Math.abs(it.x - g.x) + Math.abs(yb(it) - g.y) * 1.5; return dd > 20 ? dd : 0; };
  const theme = o.color || '';
  const act = o.act;
  if (act === 'placeNew') {   // everything waiting in the storage box goes into the room, to a sensible place
    const ids = Object.keys(S.inv || {}).filter(k => S.inv[k] > 0 && ITEMS[k]).slice(0, o.max || 2);
    for (const k of ids) { Game.place(k); const it = S.items[S.items.length - 1]; if (it && it.k === k) { arrange(it, '擺好新買的') || out.push({ line: `擺上新買的「${name(it)}」`, uid: it.uid }); } }
  } else if (act === 'fixOne' || act === 'makeover') {
    const n = act === 'makeover' ? 4 + Math.floor(rnd() * 3) : 1, list = items().filter(free).map(it => [off(it) * (.6 + rnd() * .8), it]).filter(x => x[0] > 6).sort((a, b) => b[0] - a[0]);
    for (const [, it] of list.slice(0, n)) arrange(it, act === 'makeover' ? '重新佈置：移動' : '調整');
  } else if (act === 'surface') { const loose = items().filter(it => free(it) && I(it.k).layer === 'decor'); if (loose.length) putOn(loose[Math.floor(rnd() * loose.length)], '把'); }
  else if (act === 'wallLine') { const art = items().filter(it => free(it) && kindOf(it) === 'art'); if (art.length >= 2) { const y = art.map(a => a.y).sort((p, q) => p - q)[Math.floor(art.length / 2)]; for (const a of art) if (Math.abs(a.y - y) > 2) { const b = snap(a); a.y = y; Room.clampItem(a); done(a, `把掛畫「${name(a)}」對齊同一高度`, b); } } }
  else if (act === 'pair') {   // careful people: the two lamps or plants on both sides of the bed or sofa, mirrored
    const mid = first('bed') || first('seat') || first('desk'), two = ['lamp', 'plant', 'side'].map(k => items().filter(it => free(it) && kindOf(it) === k)).find(l => l.length >= 2);
    const already = mid && two && Math.abs(two[0].x + W(two[0]) + 2 - mid.x) < 4 && Math.abs(two[1].x - mid.x - W(mid) - 2) < 4;
    if (mid && two && !already) { const [a, b] = two, ya = yb(mid); const ba = snap(a), bb = snap(b);
      standAt(a, mid.x - W(a) - 2, ya); standAt(b, mid.x + W(mid) + 2, ya); a.flip = false; b.flip = true; done(a, `把「${name(a)}」和「${name(b)}」擺在「${name(mid)}」兩邊`, ba); out[out.length - 1].before2 = bb; } }
  else if (act === 'pile') {   // a small child: toys and things end up in the middle, next to the cat
    const pool = items().filter(it => free(it) && ['toy', 'pet', 'plant', 'small', 'seat'].includes(kindOf(it)) && I(it.k).layer !== 'wall');
    for (let i = 0; i < 1 + Math.floor(rnd() * 2) && pool.length; i++) { const it = pool.splice(Math.floor(rnd() * pool.length), 1)[0]; moveTo(it, '把'); if (out.length) out[out.length - 1].line = out[out.length - 1].line.replace(/^把「(.+)」$/, '把「$1」拖到房間中間'); } }
  else if (act === 'tidy') {   // tidy people: things lying on the floor go back into the storage box; fallen things are set upright
    for (const it of items()) if (it.fallen || it.soiled) { try { CozyCats.clean(it); out.push({ line: `把被貓弄倒的「${name(it)}」扶好`, uid: it.uid }); } catch (e) { } }
    const loose = items().filter(it => free(it) && I(it.k).layer === 'decor'), keep = style === 'minimal' ? 1 : 3;
    for (const it of loose.slice(keep)) { const n = name(it); Game.storeItem(it); out.push({ line: `把散在地上的「${n}」收進收納箱` }); }
  } else if (act === 'swap') {   // themed people: one thing that does not match goes away, something in their colour comes out
    const has = items().filter(it => free(it) && theme && color(it.k) && color(it.k) !== theme && I(it.k).layer !== 'wall');
    if (has.length) { const it = has[0], n = name(it); Game.storeItem(it); out.push({ line: `「${n}」顏色不搭，先收起來` }); }
    const inv = Object.keys(S.inv || {}).filter(k => S.inv[k] > 0 && ITEMS[k] && (!theme || color(k) === theme));
    if (inv.length) { const k = inv[0]; Game.place(k); const it = S.items[S.items.length - 1]; if (it) arrange(it, '換上'); }
  } else if (act === 'lights') {
    const h = new Date().getHours(), night = h >= 18 || h < 6;
    for (const it of items()) { const d = I(it.k); if (d.toggle && d.light && d.fam === 'lighting' && !!it.on !== night && rnd() < .8) { try { Game.interact(it); } catch (e) { it.on = night; } out.push({ line: `${night ? '打開' : '關掉'}「${name(it)}」`, uid: it.uid }); } }
  } else if (act === 'wallpaper') {
    const own = (S.ownWP || []).filter(id => id !== S.wp), fl = (S.ownFL || []).filter(id => id !== S.fl);
    if (own.length && rnd() < .6) { const id = own[Math.floor(rnd() * own.length)]; Game.applyWP(id); out.push({ line: `換了壁紙「${WALLPAPERS[id] ? WALLPAPERS[id].n : id}」` }); }
    else if (fl.length) { const id = fl[Math.floor(rnd() * fl.length)]; Game.applyFL(id); out.push({ line: `換了地板「${FLOORS[id] ? FLOORS[id].n : id}」` }); }
    else if (o.allowBuy) { const can = Object.entries(WALLPAPERS).filter(([id, d]) => !(S.ownWP || []).includes(id) && (d.lvl || 1) <= S.lvl && Rewards.price(d.price, 'wp') <= S.coins * .5);
      if (can.length) { const [id, d] = can[Math.floor(rnd() * can.length)], c0 = S.coins; Game.buy('wp', id); if (S.coins < c0) out.push({ line: `買了壁紙「${d.n}」換上`, bought: d.n }); } }
  } else if (act === 'undo') {   // stepped back, did not like it, moved it back
    for (const b of o.before || []) { const it = S.items.find(x => x.uid === b.uid); if (!it) continue; it.x = b.x; it.y = b.y; it.flip = b.flip; if (b.p != null) { it.p = b.p; it.dx = b.dx; it.dy = b.dy; } else { delete it.p; delete it.dx; delete it.dy; } Room.clampItem(it); }
    Room.indexItems(); if (Room.syncChildren) Room.syncChildren(); Game.save();
  }
  return out;
};
