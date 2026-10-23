/* ============================================================
   What you (the owner) do when nobody is asking anything
   Between the usual wandering, sitting and looking out of the window the owner now also:
     sweeps the floor (broom)            tidies things up (straightens furniture)
     makes the bed                       pets a cat (the cat purrs or rolls over)
     uses the computer at the desk       takes a book from the shelf and reads (sitting or standing)
     dances / sways to the music         looks out of the window (says something about the weather)
     hums a song                         drinks a cup of tea
     waters a plant (watering can)       dusts the shelves (feather duster)
   New poses (holding with both hands, reaching down, reading while sitting) are drawn into the
   paper doll, so the arms use the shirt and skin colours; the props are pixel sprites.
   Never while focusing, editing, during a trick show, or while the room is dimmed / asleep.
   ============================================================ */

// ---------- new poses in the body template ----------
(function () {
  const base = mannequin;
  // take the arms off; where an arm lay over the body, the shirt shows instead
  const strip = (m) => {
    const lab = m.lab.map(r => r.slice()), sh = m.sh.map(r => r.slice()), side = m.view === 'side';
    const inBody = (x, y) => side ? x >= 6 && x <= 11 && y >= 1 && y <= 6 : x >= 4 && x <= 13 && y >= 2 && y <= 6;
    for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) if (lab[y][x] && 'ufh'.includes(lab[y][x])) {
      if (inBody(x, y)) { lab[y][x] = 't'; sh[y][x] = side ? (x === 6 && y < 6 ? 3 : x === 11 && y >= 2 ? 1 : y === 6 ? 1 : 2) : (x === 13 ? 1 : y === 6 ? 1 : 2); } else { lab[y][x] = ''; sh[y][x] = 0; }
    }
    return Object.assign({}, m, { lab, sh });
  };
  const put = (m, pts) => { for (const [x, y, l, s] of pts) if (x >= 0 && y >= 0 && x < m.W && y < m.H) { m.lab[y][x] = l; m.sh[y][x] = s == null ? 2 : s; } return m; };
  // eslint-disable-next-line no-global-assign
  mannequin = function (view, frame) {
    // front 8: both forearms across the chest, hands together in front (a book, a cup)
    if (view === 'front' && frame === 8) return put(strip(base('front', 0)), [[3, 2, 'u', 3], [3, 3, 'f'], [4, 4, 'f'], [5, 5, 'f'], [6, 5, 'h', 3], [7, 5, 'h', 3], [14, 2, 'u', 1], [14, 3, 'f', 1], [13, 4, 'f', 1], [12, 5, 'f', 1], [11, 5, 'h', 3], [10, 5, 'h', 3]]);
    // side 6 / 7: the near arm reaching forward and down (sweeping, petting, watering, making the bed); 7 reaches a little further
    if (view === 'side' && (frame === 6 || frame === 7)) {
      const k = frame === 7 ? 1 : 0;
      return put(strip(base('side', 0)), [[8, 2, 'u', 1], [9, 2, 'u'], [9, 3, 'u', 1], [10, 4, 'f'], [10, 5, 'f', 1], [11 + k, 6, 'f'], [11, 5, 'f', 1], [12 + k, 7, 'h', 3], [13 + k, 7, 'h', 3], [12 + k, 8, 'h'], [13 + k, 8, 'h', 1]]);
    }
    // sitting, facing you, holding a book up in both hands
    if (view === 'sitfront' && frame === 1) return put(strip(base('sitfront', 0)), [[3, 2, 'u', 3], [3, 3, 'f'], [4, 4, 'f'], [5, 4, 'f'], [6, 4, 'h', 3], [7, 4, 'h', 3], [14, 2, 'u', 1], [14, 3, 'f', 1], [13, 4, 'f', 1], [12, 4, 'f', 1], [11, 4, 'h', 3], [10, 4, 'h', 3]]);
    return base(view, frame);
  };
  Object.assign(AVATAR_FRAMES, { hold0: ['front', 'front', 8], reach0: ['side', 'side', 6], reach1: ['side', 'side', 7], sitread: ['front', 'sitfront', 1] });
})();

// ---------- props ----------
(function () {
  const C = (hex) => palAdd(hex);
  const R = C('#c4566e'), Rd = C('#8f3a52'), Pg = C('#fff7ea'), Pg2 = C('#e8d8bc'), Ln = C('#b7a58c');
  SPR.def('prop_book', () => { const g = new Grid(9, 5); g.rect(0, 0, 9, 5, R); g.rect(1, 0, 3, 4, Pg); g.rect(5, 0, 3, 4, Pg); g.hl(1, 3, 3, Pg2); g.hl(5, 3, 3, Pg2); g.px(4, 0, Rd); g.px(4, 1, Rd); g.px(4, 2, Rd); g.px(4, 3, Rd); g.hl(1, 1, 2, Ln); g.hl(5, 1, 3, Ln); g.hl(6, 2, 2, Ln); g.hl(1, 4, 8, Rd); return g.outline(); });
  const M1 = C('#fff3df'), M2 = C('#e3cfb4'), Ms = C('#7ea6dc'), Tea = C('#9a6249');
  SPR.def('prop_mug', () => { const g = new Grid(6, 5); g.rect(0, 0, 4, 5, M1); g.vl(3, 0, 5, M2); g.hl(0, 2, 4, Ms); g.hl(0, 0, 4, Tea); g.px(4, 1, M1); g.px(5, 2, M1); g.px(4, 3, M1); return g.outline(); });
  const G1 = C('#5ea055'), G2 = C('#3e7f4a'), G3 = C('#8cc068');
  SPR.def('prop_can', () => { const g = new Grid(9, 6); g.rect(2, 1, 5, 5, G1); g.hl(2, 1, 5, G3); g.vl(6, 1, 5, G2); g.px(1, 2, G2); g.px(0, 2, G2); g.px(1, 3, G2); g.px(7, 2, G1); g.px(8, 1, G1); g.px(8, 0, G3); g.hl(3, 0, 2, G2); return g.outline(); });
  const F1 = C('#f6a8c0'), F2 = C('#ee8fa0'), Wd = C('#9a6a44');
  SPR.def('prop_duster', () => { const g = new Grid(5, 10); g.rect(0, 0, 5, 4, F1); g.px(0, 0, '.'); g.px(4, 0, '.'); g.hl(1, 3, 3, F2); g.px(2, 1, F2); g.vl(2, 4, 6, Wd); return g.outline(); });
})();
const BROOM = { stick: '#a06a3c', stickD: '#6e4a30', straw: '#e8c46a', strawD: '#c49a3c', band: '#c4566e' };

const OwnerIdle = {
  last: '', lastAt: 0,
  ok(A) { return !Game.focusing() && !Room.edit && !(typeof TrickShow !== 'undefined' && TrickShow.cur) && !(typeof Lights !== 'undefined' && Lights.mode !== 'on') && A.state === 'idle' && !A.walking; },
  items(f) { return Room.state.items.filter(it => it.p == null && ITEMS[it.k] && f(ITEMS[it.k], it)); },
  pick(a) { return a[Math.floor(Math.random() * a.length)]; },
  // body-template point (x, y) → room pixel, for the canvas drawn at (dx, top)
  pt(A, cv, dx, top, x, y) { const flip = A.idle && A.idle.flip; return [dx + (flip ? cv.width - 1 - (1 + x) : 1 + x), top + 15 + AVA_TOP + y]; },
  // ---------- the activities ----------
  acts: {
    sweep: { w: 3, can: () => true, start(A) { const [x, y] = randFloor(16); return { at: [x, y], dur: 5 + Math.random() * 2.5, face: 'side', flip: Math.random() < 0.5, pose: t => Math.floor(t * 3) % 2 ? 'reach1' : 'reach0', prop: 'broom', say: ['掃一掃～', '地板亮晶晶', '貓毛好多…'], tick: (A, I, t, dt) => { if (Math.random() < dt * 2.5) { const p = I.tip; if (p) Room.puff('p_dot', p[0], p[1], { vx: (I.flip ? -1 : 1) * 8, vy: -3, grav: 12, max: 0.6 }); } } }; } },
    tidy: { w: 2, can: () => OwnerIdle.items(d => d.layer === 'floor' && !d.bed).length > 0, start(A) {
      const it = OwnerIdle.pick(OwnerIdle.items(d => d.layer === 'floor' && !d.bed)), [w, h] = itemSize(it), left = Math.random() < 0.5, x = left ? it.x - 9 : it.x + w + 9;
      return { at: [x, Math.min(166, it.y + h + 2)], dur: 2.6 + Math.random(), face: 'side', flip: !left, pose: t => t < 1.3 ? 'reach0' : 'reach1', say: ['擺正一點', '這個放這裡比較好', '嗯，整齊多了'],
        begin: () => { it.shake = 0.4; }, end: () => { const cv = Room.itemCanvas(it); Room.puff('p_spark', it.x + cv.width / 2, it.y + 2, { vy: -6 }); } }; } },
    makebed: { w: 2, can: () => itemsWith('bed').length > 0, start(A) {
      const bed = OwnerIdle.pick(itemsWith('bed')), [w, h] = itemSize(bed), left = Math.random() < 0.5;
      return { at: [left ? bed.x - 6 : bed.x + w + 6, Math.min(166, bed.y + h - 2)], dur: 4.2, face: 'side', flip: !left, pose: t => Math.floor(t * 1.6) % 2 ? 'reach1' : 'reach0', say: ['床鋪好了', '棉被拍一拍', '今晚會睡得很好'],
        tick: (A, I, t, dt) => { if (Math.random() < dt * 3) Room.puff('p_spark', bed.x + 4 + Math.random() * (w - 8), bed.y + 6 + Math.random() * 6, { vy: -4, max: 0.5 }); } }; } },
    petcat: { w: 3, can: () => (Game.pets || []).some(p => !p.on && !p.walking && ['sit', 'sleep', 'act'].includes(p.state) && p.x > 26 && p.x < 214), start(A) {
      const p = OwnerIdle.pick((Game.pets || []).filter(p => !p.on && !p.walking && ['sit', 'sleep', 'act'].includes(p.state) && p.x > 26 && p.x < 214)); if (!p) return null; const left = p.x > 120;
      return { at: [p.x + (left ? -13 : 13), Math.min(166, p.y + 1)], dur: 4, face: 'side', flip: left ? false : true, pose: t => Math.floor(t * 2.2) % 2 ? 'reach1' : 'reach0', say: [`${(p.data && p.data.name) || '貓咪'}乖～`, '摸摸頭', '軟綿綿的'],
        begin: () => { if (p.walking || p.on) return; if (p.state === 'sleep') p.state = 'sit'; p.flip = !left; PetAI.act(p, Math.random() < 0.35 ? 'belly' : 'knead', 3.6); },
        tick: (A, I, t, dt) => { if (Math.random() < dt * 1.2) Room.puff('p_heart', p.x - 2, p.y - 16, { vy: -8, max: 1 }); } }; } },
    computer: { w: 2, can: () => itemsWith('desk').length > 0 && itemsWith('chair').length > 0, start(A) { return { seat: true, dur: 9 + Math.random() * 7, say: ['看一下天氣', '回個訊息', '查一個單字', '看看新聞'] }; } },
    read: { w: 3, can: () => OwnerIdle.items(d => /書櫃|書架/.test(d.n || '')).length > 0 || OwnerIdle.items(d => d.seat).length > 0, start(A) {
      const shelf = OwnerIdle.items(d => /書櫃|書架/.test(d.n || ''))[0], seats = itemsWith('seat').filter(it => ActorVisibility.furnSafe(A, it, 'sit'));
      const I = { dur: 10 + Math.random() * 5, say: ['這本好看', '再一頁就好', '（翻頁）'], prop: 'book', eyes: null };
      if (shelf) { const [w, h] = itemSize(shelf); I.pre = { at: [shelf.x + w / 2, Math.min(166, shelf.y + h + 3)], dur: 1.4, face: 'back' }; }
      if (seats.length && Math.random() < 0.7) I.sitOn = OwnerIdle.pick(seats); else { I.at = randFloor(20); I.face = 'front'; I.pose = () => 'hold0'; }
      return I; } },
    music: { w: 2, can: () => typeof Music !== 'undefined' && Music.playing, start(A) {
      const dance = Math.random() < 0.5;
      return dance ? { dur: 4.5, face: 'front', pose: t => Math.floor(t * 4) % 2 ? 'cheer1' : 'cheer0', wide: true, say: ['♪～', '跳起來！'], tick: (A, I, t, dt) => { if (Math.random() < dt * 2) Room.puff('p_note', A.x + (Math.random() - 0.5) * 16, A.y - 30, { vy: -8, wob: 8, max: 1.4 }); } }
        : { dur: 6, face: 'front', pose: () => 'front0', eyes: 'closed', sway: true, say: ['這首好好聽', '♪'], tick: (A, I, t, dt) => { if (Math.random() < dt * 1.3) Room.puff('p_note', A.x + 6, A.y - 30, { vx: 4, vy: -7, wob: 6, max: 1.6 }); } };
    } },
    window: { w: 2, can: () => OwnerIdle.items(d => d.window).length > 0 || Room.state.items.some(it => ITEMS[it.k] && ITEMS[it.k].window), start(A) {
      const w = OwnerIdle.pick(Room.state.items.filter(it => ITEMS[it.k] && ITEMS[it.k].window)), env = Room.env || {}, hr = env.h || 12;
      const line = env.rain ? ['下雨了…', '雨聲好好聽'] : env.dark > 0.55 ? ['星星好亮', '月亮出來了'] : hr >= 17 && hr < 19.5 ? ['夕陽好美', '天空變成橘色了'] : ['天氣真好', '那朵雲像一隻貓', '有小鳥飛過去'];
      return { at: [w.x + itemSize(w)[0] / 2, 106], dur: 5 + Math.random() * 2, face: 'back', pose: () => 'back0', say: line }; } },
    sing: { w: 2, can: () => true, start(A) { return { dur: 4, face: 'front', pose: () => 'front0', eyes: 'happy', sway: true, say: ['♪ 啦啦啦～', '♪ 嗯嗯～嗯～', '♪～'], tick: (A, I, t, dt) => { if (Math.random() < dt * 1.8) Room.puff('p_note', A.x + (Math.random() < 0.5 ? -6 : 6), A.y - 30, { vy: -8, wob: 8, max: 1.5 }); } }; } },
    tea: { w: 2, can: () => true, start(A) { return { at: randFloor(20), dur: 5, face: 'front', pose: () => 'hold0', prop: 'mug', say: ['呼～好喝', '暖暖的', '休息一下'], tick: (A, I, t, dt) => { if (Math.random() < dt * 1.6 && I.cup) Room.puff('p_steam', I.cup[0], I.cup[1] - 2, { vy: -5, vx: (Math.random() - 0.5) * 2, max: 1.2, alpha: 0.7 }); } }; } },
    water: { w: 2, can: () => OwnerIdle.items(d => d.react === 'water' || d.react === 'rustle').length > 0, start(A) {
      const pl = OwnerIdle.pick(OwnerIdle.items(d => d.react === 'water' || d.react === 'rustle')), [w, h] = itemSize(pl), left = Math.random() < 0.5;
      return { at: [left ? pl.x - 10 : pl.x + w + 10, Math.min(166, pl.y + h + 2)], dur: 3.6, face: 'side', flip: !left, pose: () => 'reach0', prop: 'can', say: ['喝水囉', '快快長大', '葉子好綠'],
        tick: (A, I, t, dt) => { if (I.spout && Math.random() < dt * 8) Room.puff('p_dot', I.spout[0], I.spout[1], { vx: (I.flip ? -1 : 1) * 6, vy: 2, grav: 40, max: 0.5 }); if (Math.random() < dt) Room.puff('p_leaf', pl.x + w / 2, pl.y + 4, { vy: -5, max: 0.8 }); } }; } },
    dust: { w: 2, can: () => OwnerIdle.items(d => /櫃|架/.test(d.n || '') && d.layer === 'floor').length > 0, start(A) {
      const it = OwnerIdle.pick(OwnerIdle.items(d => /櫃|架/.test(d.n || '') && d.layer === 'floor')), [w, h] = itemSize(it), left = Math.random() < 0.5;
      return { at: [left ? it.x - 8 : it.x + w + 8, Math.min(166, it.y + h + 2)], dur: 4, face: 'side', flip: !left, pose: t => Math.floor(t * 4) % 2 ? 'hand1' : 'hand0', prop: 'duster', say: ['灰塵掰掰', '擦一擦', '哈啾！'],
        tick: (A, I, t, dt) => { if (I.fluff && Math.random() < dt * 4) Room.puff('p_dot', I.fluff[0], I.fluff[1], { vx: (Math.random() - 0.5) * 10, vy: -4, grav: 6, max: 0.8 }); } }; } },
    stretch: { w: 1, can: () => typeof Lights !== 'undefined', start(A) { return { dur: 2.6, custom: () => Lights.stretch(A, Math.random() < 0.5 ? '嗯～伸個懶腰' : null) }; } },
  },
  choose(A) {
    const list = Object.entries(this.acts).filter(([k, a]) => k !== this.last && a.can(A)); if (!list.length) return null;
    let sum = list.reduce((n, [, a]) => n + a.w, 0), r = Math.random() * sum;
    for (const [k, a] of list) { r -= a.w; if (r <= 0) return k; }
    return list[0][0];
  },
  begin(A) {
    const kind = this.choose(A); if (!kind) return false;
    let I = null; try { I = this.acts[kind].start(A); } catch (e) { console.warn('[owner]', e); } if (!I) return false;
    this.last = kind; I.kind = kind; I.t = 0;
    if (I.custom) { A.idle = null; I.custom(); A.timer = I.dur; return true; }
    A.idle = I; A.stand();
    if (I.seat) return this.toChair(A, I);
    if (I.pre) { const pre = I.pre; A.state = 'walk'; A.walkTo(pre.at[0], pre.at[1], () => { if (A.idle !== I) return; A.state = 'idle'; A.face = pre.face; I.stage = 'pre'; I.t = 0; A.timer = pre.dur; I.after = () => this.main(A, I); }); return true; }
    this.main(A, I); return true;
  },
  main(A, I) {
    I.stage = null; I.after = null;
    if (I.sitOn) return this.toSeat(A, I);
    const go = () => { if (A.idle !== I) return; A.state = 'idle'; A.face = I.face || 'front'; A.flip = !!I.flip; I.stage = 'on'; I.t = 0; A.timer = I.dur; if (I.begin) I.begin(); if (Math.random() < 0.55) setTimeout(() => { if (A.idle === I) Game.bubble(A, this.pick(I.say), 2); }, 700); };
    if (I.at) { A.state = 'walk'; A.walkTo(I.at[0], I.at[1], go); } else go();
  },
  toSeat(A, I) {
    const s = I.sitOn, [w, h] = itemSize(s), sp = ITEMS[s.k].seat, sx = s.flip ? w - sp.x : sp.x;
    A.state = 'walk'; A.walkTo(s.x + sx, s.y + h + 3, () => { if (A.idle !== I) return; if (!Room.uidMap[s.uid] || !ActorVisibility.furnSafe(A, s, 'sit')) { A.idle = null; A.state = 'idle'; A.timer = 1; return; }
      A.state = 'sit'; A.seat = s; I.stage = 'on'; I.t = 0; A.timer = I.dur; if (Math.random() < 0.5) setTimeout(() => { if (A.idle === I) Game.bubble(A, this.pick(I.say), 2); }, 1200); });
    return true;
  },
  toChair(A, I) {
    const ch = itemsWith('chair')[0], [w, h] = itemSize(ch);
    A.state = 'walk'; A.walkTo(ch.x + w / 2, ch.y + h + 3, () => { if (A.idle !== I) return; if (!Room.uidMap[ch.uid] || Game.focusing()) { A.idle = null; A.state = 'idle'; A.timer = 1; return; }
      A.state = 'sit'; A.seat = ch; I.stage = 'on'; I.t = 0; A.timer = I.dur; if (Math.random() < 0.6) setTimeout(() => { if (A.idle === I) Game.bubble(A, this.pick(I.say), 2); }, 1500); }, true);
    return true;
  },
  end(A) { const I = A.idle; A.idle = null; if (I && I.end) try { I.end(); } catch (e) { } },
  // ---------- drawing the props ----------
  drawProp(c, A, I, cv, dx, top, t) {
    const P = (x, y) => this.pt(A, cv, dx, top, x, y), f = I.flip ? -1 : 1;
    if (I.prop === 'broom') {
      // the stick through the hand, from the shoulder down to the floor in front; the straw sweeps from side to side
      const k = Math.floor(t * 3) % 2, [hx, hy] = P(12.5 + k, 7.5), feet = top + 15 + AVA_TOP + 11;
      const x0 = hx - f * 5, y0 = hy - 9, x1 = hx + f * (3 + k), y1 = feet - 2;
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); c.fillStyle = '#2e2230'; c.fillRect(x - 1, y, 1, 1); c.fillRect(x + 1, y, 1, 1); c.fillStyle = i % 4 === 0 ? BROOM.stickD : BROOM.stick; c.fillRect(x, y, 1, 1); }
      const bx = Math.round(x1), by = Math.round(y1);
      c.fillStyle = '#2e2230'; c.fillRect(bx - 4, by - 1, 9, 5);
      c.fillStyle = BROOM.band; c.fillRect(bx - 2, by, 5, 1);
      c.fillStyle = BROOM.straw; c.fillRect(bx - 3, by + 1, 7, 2); c.fillStyle = BROOM.strawD; for (let i = -3; i <= 3; i += 2) c.fillRect(bx + i, by + 2, 1, 1);
      I.tip = [bx + f * 3, by + 3];
    } else if (I.prop === 'book' || I.prop === 'mug') {
      const sp = SPR.get(I.prop === 'book' ? 'prop_book' : 'prop_mug'), sit = A.state === 'sit';
      const [cx, cy] = P(8.5, sit ? 3 : 4);
      const x = Math.round(cx - sp.width / 2), y = Math.round(cy - (I.prop === 'book' ? 2 : 3)) + (I.prop === 'book' && Math.floor(t * 0.33) % 3 === 2 && t % 3 < 0.25 ? -1 : 0);
      c.drawImage(sp, x, y);
      // the hands in front of the cover
      if (I.prop === 'book') { const skin = PAL[colorMap(A.cfg).C] || '#e8b48e'; c.fillStyle = skin; const [lx, ly] = P(6, sit ? 4 : 5), [rx] = P(11, sit ? 4 : 5); c.fillRect(Math.min(lx, rx) - 0, ly, 1, 1); c.fillRect(Math.max(lx, rx), ly, 1, 1); }
      if (I.prop === 'mug') I.cup = [x + 2, y];
    } else if (I.prop === 'can') {
      const sp = SPR.get('prop_can'), [hx, hy] = P(13, 7);
      if (I.flip) { c.save(); c.translate(hx, 0); c.scale(-1, 1); c.drawImage(sp, -2, hy - 2); c.restore(); } else c.drawImage(sp, hx - 2, hy - 2);
      I.spout = [hx + f * 7, hy - 1];
    } else if (I.prop === 'duster') {
      const sp = SPR.get('prop_duster'), k = Math.floor(t * 4) % 2, [hx, hy] = P(13.5, k ? 5 : 4);
      c.drawImage(sp, Math.round(hx - 2 + f * 1), Math.round(hy - 9));
      I.fluff = [hx + f, hy - 8];
    }
  },
};

(function () {
  const think = Avatar.prototype.think;
  Avatar.prototype.think = function () {
    const I = this.idle;
    if (I) {
      if (I.after && !Game.focusing()) { const f = I.after; I.after = null; return f(); }   // the first part (taking a book) is done
      OwnerIdle.end(this);
      if (this.state === 'sit' && this.seat) { this.stand(); this.timer = 1 + Math.random() * 2; return; }
      this.state = 'idle'; this.timer = 1 + Math.random() * 2; return;
    }
    // most of the time when free: one of the little activities instead of just wandering
    if (!Game.focusing() && this.state === 'idle' && OwnerIdle.ok(this) && Math.random() < 0.55 && OwnerIdle.begin(this)) return;
    return think.call(this);
  };
  const upd = Avatar.prototype.update;
  Avatar.prototype.update = function (dt) {
    const r = upd.call(this, dt), I = this.idle;
    if (I) {
      // something else took over (focus, a trick show, a poke that sent it elsewhere): drop the activity
      if (Game.focusing() || this.state === 'show' || this.state === 'work' || this.state === 'goingWork' || this.state === 'sleep' || Room.edit) { OwnerIdle.end(this); return r; }
      if (!this.walking && I.stage === 'on') { I.t += dt; if (I.tick) try { I.tick(this, I, I.t, dt); } catch (e) { } }
    }
    return r;
  };
  const poke = Avatar.prototype.poke;
  Avatar.prototype.poke = function () { if (this.idle && this.idle.stage === 'on' && this.state === 'idle') { this.happy = 1.4; Game.bubble(this, '嗯？', 1.2); return; } return poke.call(this); };
  const draw = Avatar.prototype.draw;
  Avatar.prototype.draw = function (c) {
    const I = this.idle, t = Room.t;
    // reading on the sofa: the sitting frame with the book held up
    if (I && I.stage === 'on' && I.prop === 'book' && this.state === 'sit' && this.seat && Room.uidMap[this.seat.uid] && !ITEMS[this.seat.k].chair) {
      const [sx, sy] = this.seatPos(), cv = avatarCanvas('sitread', this.cfg, this.eyeState(), 0, false), dx = Math.round(sx - 10), top = Math.round(sy) - AVA_TOP;
      c.drawImage(cv, dx, top); OwnerIdle.drawProp(c, this, I, cv, dx, top, I.t); return;
    }
    if (!I || I.stage !== 'on' || this.walking || this.state !== 'idle' || !I.pose) return draw.call(this, c);
    const x = Math.round(this.x), y = Math.round(this.y);
    c.fillStyle = 'rgba(46,34,48,0.22)'; c.fillRect(x - 5, y - 1, 10, 2); c.fillRect(x - 3, y + 1, 6, 1);
    const frame = I.pose(I.t), side = /^(side|reach|hand)/.test(frame), flip = side && !!I.flip;
    const bob = I.sway ? Math.floor(t * 2.4) % 2 : 0, eyes = I.eyes || this.eyeState();
    const cv = avatarCanvas(frame, this.cfg, eyes, bob, flip), top = y - canvasBottom(cv) - this.hopOff(), dx = x - (cv.width > 20 ? 12 : 10);
    const sx = I.sway && Math.floor(t * 1.2) % 2 ? 1 : 0;
    // the broom stands behind the body (the hand is in front of the stick); everything else is held in front
    if (I.prop === 'broom') OwnerIdle.drawProp(c, this, I, cv, dx + sx, top, I.t);
    c.drawImage(cv, dx + sx, top);
    if (I.prop && I.prop !== 'broom') OwnerIdle.drawProp(c, this, I, cv, dx + sx, top, I.t);
  };
})();
