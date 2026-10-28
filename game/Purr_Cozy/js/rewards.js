/* ============================================================
   Rewards: coupons, level-up gift boxes, lottery tickets, gacha
   - gift box: 25 % furniture; after 4 boxes in a row without furniture the 5th always has one
   - lottery ticket: 25 % furniture, no pity
   - otherwise 60 % coins (50 + level x 20) / 40 % a coupon (9 / 8 / 7 折 = 60 / 30 / 10)
   - coupon: one per purchase, one per game day (06:00), expires 30 x 24 h after you get it,
     only for COUPON_CATS (not themes, gacha, adoption, consumables, the merchant)
   ============================================================ */
const COUPONS = [{ off: 10, w: 60, n: I18n.s("u_0c686931a381") }, { off: 20, w: 30, n: I18n.s("u_89489413051e") }, { off: 30, w: 10, n: I18n.s("u_83d2bf758086") }];
const COUPON_DAYS = 30, GIFT_ITEM_RATE = 0.25, GIFT_PITY = 4, PRIZE_COIN_SHARE = 0.6, GACHA_COST = 80, GACHA_SELL = 0.3;
const COUPON_CATS = { item: I18n.s("u_ea23ec0dffea"), wp: I18n.s("u_524746976904"), fl: I18n.s("u_59a6a585ba18"), view: I18n.s("u_5f0d94f3ff27"), closet: I18n.s("u_b77f3fd8ff7e"), pettool: I18n.s("u_ed07fe1f1d03"), petacc: I18n.s("u_2963e1ddbf48") };
const Rewards = {
  get W() { const S = Game.S; if (!S.wallet) S.wallet = { coupons: [], usedDay: '', sel: null, giftMiss: 0, tickets: 0, nid: 1, pend: null }; return S.wallet; },
  today() { return Life.today(); },
  prune() { const W = this.W, now = Date.now(), n = W.coupons.length; W.coupons = W.coupons.filter(c => c.exp > now); if (W.sel && !W.coupons.some(c => c.id === W.sel)) W.sel = null; return n - W.coupons.length; },
  couponName(c) { const t = COUPONS.find(x => x.off === c.off); return t ? t.n : I18n.s("u_44547dec965c", [(100 - c.off) / 10]); },
  timeLeft(c) { const ms = c.exp - Date.now(); if (ms <= 0) return I18n.s("u_9b42a6cda2e5"); const d = Math.floor(ms / 86400000), h = Math.floor(ms % 86400000 / 3600e3); return d ? I18n.s("u_afb68209967c", [d, h]) : I18n.s("u_60dddd8c2d43", [h, Math.max(1, Math.floor(ms % 3600e3 / 60000))]); },
  addCoupon(off) { const W = this.W, now = Date.now(), c = { id: W.nid++, off, got: now, exp: now + COUPON_DAYS * 86400000 }; W.coupons.push(c); W.coupons.sort((a, b) => a.exp - b.exp); return c; },
  rollCoupon() { let r = Math.random() * COUPONS.reduce((a, c) => a + c.w, 0); for (const c of COUPONS) { if ((r -= c.w) < 0) return c.off; } return 10; },
  usedToday() { return this.W.usedDay === this.today(); },
  // the coupon picked for the next purchase in an allowed category
  active(cat) { this.prune(); const W = this.W; if (!COUPON_CATS[cat] || this.usedToday() || !W.sel) return null; const selected = W.coupons.find(c => c.id === W.sel); return selected ? W.coupons.filter(c => Number(c.off) === Number(selected.off)).sort((a,b) => a.exp-b.exp || a.id-b.id)[0] : null; },
  pay(base, c) { return c ? Math.max(1, Math.floor(base * (100 - c.off) / 100)) : base; },
  price(base, cat) { return this.pay(base, this.active(cat)); },
  // call right after a purchase that charged price(base, cat) succeeded
  consume(base, cat, name) {
    const c = this.active(cat); if (!c) return 0;
    const W = this.W, pay = this.pay(base, c);
    W.coupons = W.coupons.filter(x => x.id !== c.id); W.sel = null; W.usedDay = this.today(); (W.spent = W.spent || []).push(c.got + ':' + c.off); if (W.spent.length > 200) W.spent.splice(0, W.spent.length - 200);
    UI.toast(I18n.s("u_7d5c7a42a46c", [name ? `「${name}」` : '', base, this.couponName(c), base - pay, pay]), 'i_coupon', 4.5);
    return base - pay;
  },
  groups() {
    this.prune();
    const groups = new Map();
    for (const c of this.W.coupons) {
      const off = Number(c.off);
      let g = groups.get(off);
      if (!g) groups.set(off, g = { off, count: 0, first: c });
      g.count++; if (c.exp < g.first.exp || (c.exp === g.first.exp && c.id < g.first.id)) g.first = c;
    }
    return [...groups.values()].sort((a,b) => b.off - a.off);
  },
  daysLeft(c) { return Math.max(1, Math.ceil((c.exp - Date.now()) / 86400000)); },
  select(id) { const W = this.W; W.sel = W.sel === id ? null : id; Game.save(); for (const w of ['shop', 'avatar', 'pet']) UI.refresh(w); },
  coinPrize(lvl) { return 50 + (lvl || Game.S.lvl) * 20; },
  itemPrize() {
    const S = Game.S, pool = Object.values(ITEMS).filter(d => d.lvl <= S.lvl && !d.special && !d.fun && !d.merchant && d.price > 0 && (d.layer === 'decor' || d.layer === 'floor' || d.layer === 'wall' || d.layer === 'rug'));
    const owned = (id) => (S.inv[id] || 0) + S.items.filter(i => i.k === id).length;
    let cands = pool.filter(d => owned(d.id) === 0); if (!cands.length) cands = pool;
    // lean towards the pricier things the player can't easily buy yet
    cands.sort((a, b) => b.price - a.price); cands = cands.slice(0, Math.max(12, Math.ceil(cands.length / 2)));
    return cands[Math.floor(Math.random() * cands.length)];
  },
  // opts.pity: gift boxes share one pity counter (W.giftMiss); tickets have none
  roll(opts = {}) {
    const W = this.W; let item = Math.random() < GIFT_ITEM_RATE, pity = false;
    if (opts.pity && !item && (W.giftMiss || 0) >= GIFT_PITY) { item = true; pity = true; }
    let p = null;
    if (item) { const d = this.itemPrize(); if (d) p = { type: 'item', id: d.id, pity }; }
    if (opts.pity) W.giftMiss = p ? 0 : (W.giftMiss || 0) + 1;
    if (!p) p = Math.random() < PRIZE_COIN_SHARE ? { type: 'coins', n: this.coinPrize(opts.lvl) } : { type: 'coupon', off: this.rollCoupon() };
    return p;
  },
  pityText() { const m = this.W.giftMiss || 0; return m >= GIFT_PITY ? I18n.s("u_942924d45975") : m ? I18n.s("u_d12ba9467e54", [m, GIFT_PITY + 1 - m]) : I18n.s("u_e430fa7f02f3", [GIFT_PITY, GIFT_PITY + 1]); },
  grant(p) {
    const S = Game.S;
    if (p.type === 'item') S.inv[p.id] = (S.inv[p.id] || 0) + 1;
    else if (p.type === 'coins') Game.reward(p.n, 0, 'raw');
    else if (p.type === 'coupon') p.c = this.addCoupon(p.off);
    UI.hud(true); UI.refresh('storage'); Game.save(); saveSoon();
  },
  openTicket() {
    const W = this.W; if (!(W.tickets > 0)) return UI.toast(I18n.s("u_de67d613afe2"), 'i_ticket');
    W.tickets--; const p = this.roll({}); this.grant(p); UI.prizeModal(p, I18n.s("u_1cec9a55bdea")); UI.refresh('friends');
  },
  // ---------- gacha ----------
  owned(id) { const S = Game.S; return { room: S.items.filter(i => i.k === id).length, box: S.inv[id] || 0 }; },
  gachaPool() { const S = Game.S; return Object.values(ITEMS).filter(x => !x.special && !x.giftOnly && !x.fun && !x.merchant && (x.layer === 'decor' || x.layer === 'wall') && x.price >= 40 && x.price <= 240 && x.lvl <= S.lvl + 3); },
  gacha(it, cx) {
    const S = Game.S, W = this.W;
    if (W.pend) return UI.openWin('gacha');   // an earlier result is still waiting for keep / sell
    if (S.coins < GACHA_COST) return Game.bubbleAt(cx, it.y, I18n.s("u_c691b22e9bc2", [GACHA_COST]));
    const pool = this.gachaPool(), got = pool[Math.floor(Math.random() * pool.length)]; if (!got) return;
    const o = this.owned(got.id);
    S.coins -= GACHA_COST; Life.track('buy', 1, { kind: 'gacha', id: got.id });
    for (let i = 0; i < 4; i++) Room.puff('p_spark', cx - 4 + i * 3, it.y + 18, { vy: -8 - i, max: 0.9 });
    if (o.room + o.box > 0) { W.pend = { id: got.id, at: Date.now() }; UI.openWin('gacha'); }
    else { S.inv[got.id] = (S.inv[got.id] || 0) + 1; UI.toast(I18n.s("u_dd380b91373f", [got.n]), 'i_box', 3.5, { label: I18n.s("u_6a1f209d5ec4"), fn: () => Game.place(got.id) }); }
    UI.hud(true); UI.refresh('storage'); Game.save(); saveSoon();
  },
  sellPrice(id) { return Math.floor((ITEMS[id] ? ITEMS[id].price : 0) * GACHA_SELL); },
  gachaKeep(sell) {
    const W = this.W, id = W.pend && W.pend.id, d = ITEMS[id]; W.pend = null; const S = Game.S;
    if (!d) return UI.closeWin('gacha');
    if (sell) { const c = this.sellPrice(id); Game.reward(c, 0, 'raw'); UI.toast(I18n.s("u_e8132088319f", [d.n, c]), 'i_coin', 3); }
    else { S.inv[id] = (S.inv[id] || 0) + 1; UI.toast(I18n.s("u_6f3742c0252d", [d.n]), 'i_box', 2.5); }
    UI.closeWin('gacha'); UI.hud(true); UI.refresh('storage'); Game.save(); saveSoon();
  },
};

/* ---------------- icons ---------------- */
SPR.def('i_coupon', icon(g => { g.rect(1, 4, 14, 8, 'w'); g.cut(1, 4, 14, 8, 1); g.vl(5, 5, 6, 'v'); g.px(5, 6, 'w'); g.px(5, 9, 'w'); g.pts([[9, 6], [12, 9], [9, 9], [12, 6]], 'r'); g.hl(9, 7, 4, 'r'); g.hl(9, 8, 4, 'r'); g.px(1, 8, '.'); g.px(14, 8, '.'); }));
SPR.def('i_ticket', icon(g => { g.rect(1, 3, 14, 10, 'K'); g.cut(1, 3, 14, 10, 1); g.vl(5, 4, 8, 'k'); g.pts([[9, 5], [10, 6], [8, 6], [9, 7], [11, 8], [7, 8], [9, 9], [10, 10], [8, 10]], 'w'); g.px(9, 8, 'x'); g.px(1, 8, '.'); g.px(14, 8, '.'); }));
SPR.def('i_gift', icon(g => { g.rect(2, 6, 12, 8, 'r'); g.rect(1, 4, 14, 3, 's'); g.vl(7, 4, 10, 'w'); g.vl(8, 4, 10, 'w'); g.pts([[5, 2], [6, 3], [10, 2], [9, 3], [4, 3], [11, 3]], 'w'); }));

/* ---------------- windows ---------------- */
Object.assign(UI.WIN, { prize: { t: I18n.s("u_e748fedb5951"), i: 'i_gift', w: 320, at: ['c', 0], modal: true }, gacha: { t: I18n.s("u_849ecc894e2a"), i: 'i_box', w: 340, at: ['c', 0], modal: true } });
Object.assign(UI, {
  prizeModal(p, from) { this.prizeP = { p, from }; this.openWin('prize'); },
  prizePreview(p) {
    if (p.type === 'item') return sprPreview(Room.itemCanvas({ k: p.id }), 120, 5);
    return h('div', { class: 'prize-ic' }, ico(p.type === 'coins' ? 'i_coin' : 'i_coupon', 72));
  },
  w_prize() {
    const P = this.prizeP; if (!P) return []; const p = P.p;
    const t = p.type === 'item' ? [I18n.s("u_9bf524ce3a19"), h('b', { text: ITEMS[p.id].n }), '」'] : p.type === 'coins' ? [I18n.s("u_8ccfd0fc233e"), h('b', { class: 'num', text: String(p.n) }), I18n.s("u_35074813fa04")] : [I18n.s("u_965ec721f455"), h('b', { text: Rewards.couponName(p) }), I18n.s("u_495d7531d276")];
    const hint = (p.type === 'item' ? (p.pity ? I18n.s("u_202b6f6b45b0") : '') + I18n.s("u_14df92276fa7") : p.type === 'coupon' ? I18n.s("u_4781f8ecf5b9", [Object.values(COUPON_CATS).join('、'), COUPON_DAYS]) : '') ;
    const pity = P.from === I18n.s("u_aa3f01d20cb5") ? h('p', { class: 'hint', text: Rewards.pityText() }) : null;
    return [h('div', { class: 'gift' }, h('div', { class: 'gift-pv' }, this.prizePreview(p)), h('p', { class: 'gift-t' }, ...t), hint ? h('p', { class: 'hint', text: hint }) : null, pity),
      h('div', { class: 'row center' }, p.type === 'item' ? h('button', { class: 'chip primary', onclick: () => { this.closeWin('prize'); Game.place(p.id); } }, ico('i_brush', 20), I18n.s("u_6a1f209d5ec4")) : null,
        p.type === 'coupon' ? h('button', { class: 'chip primary', onclick: () => { this.closeWin('prize'); this.openWin('shop'); } }, ico('i_shop', 20), I18n.s("u_0ae148c4b35d")) : null,
        h('button', { class: 'chip', onclick: () => this.closeWin('prize') }, I18n.s("u_52251aeea31a")))];
  },
  w_gacha() {
    const W = Rewards.W, id = W.pend && W.pend.id, d = ITEMS[id]; if (!d) return [];
    const c = Rewards.sellPrice(id), o = Rewards.owned(id);
    return [h('div', { class: 'gift' }, h('div', { class: 'gift-pv' }, sprPreview(Room.itemCanvas({ k: id }), 120, 5)), h('p', { class: 'gift-t' }, I18n.s("u_0bc5d46e088b"), h('b', { text: d.n }), '」'),
      h('p', { class: 'hint', text: I18n.s("u_66075e1e5b56", [o.room, o.box, d.price]) })),
      h('div', { class: 'row center' }, h('button', { class: 'chip primary', onclick: () => Rewards.gachaKeep(false) }, ico('i_box', 20), I18n.s("u_9f13c4fa2af5")), h('button', { class: 'chip', onclick: () => Rewards.gachaKeep(true) }, ico('i_coin', 20), I18n.s("u_0800fa30dfd5", [c])))];
  },
  // coupon picker used by the shop, the wardrobe and the pet window
  couponBar() {
    const groups = Rewards.groups(), W = Rewards.W;
    if (!groups.length) return null;
    const used = Rewards.usedToday();
    return h('div', { class: 'cpbar', 'aria-label': I18n.s("u_495d7531d276") },
      h('span', { class: 'cp-hint hint', text: used ? I18n.s("u_9795f6150d5f") : I18n.s("u_4afe41d0c93d") }),
      ...groups.map(g => {
        const selected = W.coupons.some(c => c.id === W.sel && Number(c.off) === g.off);
        return h('button', { class: 'chip sm coupon-group' + (selected ? ' on' : ''), disabled: used,
          'aria-pressed': String(selected), title: I18n.s("u_e6c2e39fe6fc") + Rewards.timeLeft(g.first) + I18n.s("u_0757dfb8926b"),
          onclick: () => Rewards.select(selected ? W.sel : g.first.id) },
          h('span', { class: 'coupon-stack-label', text: ((100-g.off)/10) + I18n.s("u_3501b8c58bc9") + g.count + I18n.s("u_292b5991046e") + Rewards.daysLeft(g.first) + I18n.s("u_49da61ceeea2") }));
      }));
  },

  priceTag(base, cat) {
    const p = Rewards.price(base, cat);
    return p === base ? h('b', { class: 'num', text: String(base) }) : h('b', { class: 'num' }, h('s', { class: 'was', text: String(base) }), ' ' + p);
  },
});
