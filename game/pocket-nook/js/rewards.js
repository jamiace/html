/* ============================================================
   Rewards: coupons, level-up gift boxes, lottery tickets, gacha
   - gift box: 25 % furniture; after 4 boxes in a row without furniture the 5th always has one
   - lottery ticket: 25 % furniture, no pity
   - otherwise 60 % coins (50 + level x 20) / 40 % a coupon (9 / 8 / 7 折 = 60 / 30 / 10)
   - coupon: one per purchase, one per game day (06:00), expires 30 x 24 h after you get it,
     only for COUPON_CATS (not themes, gacha, adoption, consumables, the merchant)
   ============================================================ */
const COUPONS = [{ off: 10, w: 60, n: '9 折' }, { off: 20, w: 30, n: '8 折' }, { off: 30, w: 10, n: '7 折' }];
const COUPON_DAYS = 30, GIFT_ITEM_RATE = 0.25, GIFT_PITY = 4, PRIZE_COIN_SHARE = 0.6, GACHA_COST = 80, GACHA_SELL = 0.3;
const COUPON_CATS = { item: '家具擺飾', wp: '壁紙', fl: '地板', view: '窗景', closet: '角色造型', pettool: '寵物玩具', petacc: '寵物配件' };
const Rewards = {
  get W() { const S = Game.S; if (!S.wallet) S.wallet = { coupons: [], usedDay: '', sel: null, giftMiss: 0, tickets: 0, nid: 1, pend: null }; return S.wallet; },
  today() { return Life.today(); },
  prune() { const W = this.W, now = Date.now(), n = W.coupons.length; W.coupons = W.coupons.filter(c => c.exp > now); if (W.sel && !W.coupons.some(c => c.id === W.sel)) W.sel = null; return n - W.coupons.length; },
  couponName(c) { const t = COUPONS.find(x => x.off === c.off); return t ? t.n : `${(100 - c.off) / 10} 折`; },
  timeLeft(c) { const ms = c.exp - Date.now(); if (ms <= 0) return '已過期'; const d = Math.floor(ms / 86400000), h = Math.floor(ms % 86400000 / 3600e3); return d ? `${d} 天 ${h} 小時` : `${h} 小時 ${Math.max(1, Math.floor(ms % 3600e3 / 60000))} 分`; },
  addCoupon(off) { const W = this.W, now = Date.now(), c = { id: W.nid++, off, got: now, exp: now + COUPON_DAYS * 86400000 }; W.coupons.push(c); W.coupons.sort((a, b) => a.exp - b.exp); return c; },
  rollCoupon() { let r = Math.random() * COUPONS.reduce((a, c) => a + c.w, 0); for (const c of COUPONS) { if ((r -= c.w) < 0) return c.off; } return 10; },
  usedToday() { return this.W.usedDay === this.today(); },
  // the coupon picked for the next purchase in an allowed category
  active(cat) { this.prune(); const W = this.W; if (!COUPON_CATS[cat] || this.usedToday() || !W.sel) return null; const selected = W.coupons.find(c => c.id === W.sel); return selected ? W.coupons.filter(c => c.off === selected.off).sort((a,b) => a.exp-b.exp || a.id-b.id)[0] : null; },
  pay(base, c) { return c ? Math.max(1, Math.floor(base * (100 - c.off) / 100)) : base; },
  price(base, cat) { return this.pay(base, this.active(cat)); },
  // call right after a purchase that charged price(base, cat) succeeded
  consume(base, cat, name) {
    const c = this.active(cat); if (!c) return 0;
    const W = this.W, pay = this.pay(base, c);
    W.coupons = W.coupons.filter(x => x.id !== c.id); W.sel = null; W.usedDay = this.today(); (W.spent = W.spent || []).push(c.got + ':' + c.off); if (W.spent.length > 200) W.spent.splice(0, W.spent.length - 200);
    UI.toast(`${name ? `「${name}」` : ''}原價 ${base}，用${this.couponName(c)}券折 ${base - pay}，實付 ${pay} 金幣（今天的折價券用完了）`, 'i_coupon', 4.5);
    return base - pay;
  },
  groups() {
    this.prune();
    const groups = new Map();
    for (const c of this.W.coupons) {
      let g = groups.get(c.off);
      if (!g) groups.set(c.off, g = { off: c.off, count: 0, first: c });
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
  pityText() { const m = this.W.giftMiss || 0; return m >= GIFT_PITY ? '下一個禮物盒必出家具' : m ? `禮物盒已連續 ${m} 次沒開到家具，再開 ${GIFT_PITY + 1 - m} 次內必出` : `禮物盒有 25% 開出家具，連續 ${GIFT_PITY} 次沒開到，第 ${GIFT_PITY + 1} 次必出`; },
  grant(p) {
    const S = Game.S;
    if (p.type === 'item') S.inv[p.id] = (S.inv[p.id] || 0) + 1;
    else if (p.type === 'coins') Game.reward(p.n, 0, 'raw');
    else if (p.type === 'coupon') p.c = this.addCoupon(p.off);
    UI.hud(true); UI.refresh('storage'); Game.save(); saveSoon();
  },
  openTicket() {
    const W = this.W; if (!(W.tickets > 0)) return UI.toast('沒有抽獎券', 'i_ticket');
    W.tickets--; const p = this.roll({}); this.grant(p); UI.prizeModal(p, '抽獎券'); UI.refresh('friends');
  },
  // ---------- gacha ----------
  owned(id) { const S = Game.S; return { room: S.items.filter(i => i.k === id).length, box: S.inv[id] || 0 }; },
  gachaPool() { const S = Game.S; return Object.values(ITEMS).filter(x => !x.special && !x.giftOnly && !x.fun && !x.merchant && (x.layer === 'decor' || x.layer === 'wall') && x.price >= 40 && x.price <= 240 && x.lvl <= S.lvl + 3); },
  gacha(it, cx) {
    const S = Game.S, W = this.W;
    if (W.pend) return UI.openWin('gacha');   // an earlier result is still waiting for keep / sell
    if (S.coins < GACHA_COST) return Game.bubbleAt(cx, it.y, `扭一次要 ${GACHA_COST} 金幣`);
    const pool = this.gachaPool(), got = pool[Math.floor(Math.random() * pool.length)]; if (!got) return;
    const o = this.owned(got.id);
    S.coins -= GACHA_COST; Life.track('buy', 1, { kind: 'gacha', id: got.id });
    for (let i = 0; i < 4; i++) Room.puff('p_spark', cx - 4 + i * 3, it.y + 18, { vy: -8 - i, max: 0.9 });
    if (o.room + o.box > 0) { W.pend = { id: got.id, at: Date.now() }; UI.openWin('gacha'); }
    else { S.inv[got.id] = (S.inv[got.id] || 0) + 1; UI.toast(`扭到了「${got.n}」！放在收納箱`, 'i_box', 3.5, { label: '馬上擺放', fn: () => Game.place(got.id) }); }
    UI.hud(true); UI.refresh('storage'); Game.save(); saveSoon();
  },
  sellPrice(id) { return Math.floor((ITEMS[id] ? ITEMS[id].price : 0) * GACHA_SELL); },
  gachaKeep(sell) {
    const W = this.W, id = W.pend && W.pend.id, d = ITEMS[id]; W.pend = null; const S = Game.S;
    if (!d) return UI.closeWin('gacha');
    if (sell) { const c = this.sellPrice(id); Game.reward(c, 0, 'raw'); UI.toast(`賣掉「${d.n}」，得到 ${c} 金幣`, 'i_coin', 3); }
    else { S.inv[id] = (S.inv[id] || 0) + 1; UI.toast(`「${d.n}」放進收納箱了`, 'i_box', 2.5); }
    UI.closeWin('gacha'); UI.hud(true); UI.refresh('storage'); Game.save(); saveSoon();
  },
};

/* ---------------- icons ---------------- */
SPR.def('i_coupon', icon(g => { g.rect(1, 4, 14, 8, 'w'); g.cut(1, 4, 14, 8, 1); g.vl(5, 5, 6, 'v'); g.px(5, 6, 'w'); g.px(5, 9, 'w'); g.pts([[9, 6], [12, 9], [9, 9], [12, 6]], 'r'); g.hl(9, 7, 4, 'r'); g.hl(9, 8, 4, 'r'); g.px(1, 8, '.'); g.px(14, 8, '.'); }));
SPR.def('i_ticket', icon(g => { g.rect(1, 3, 14, 10, 'K'); g.cut(1, 3, 14, 10, 1); g.vl(5, 4, 8, 'k'); g.pts([[9, 5], [10, 6], [8, 6], [9, 7], [11, 8], [7, 8], [9, 9], [10, 10], [8, 10]], 'w'); g.px(9, 8, 'x'); g.px(1, 8, '.'); g.px(14, 8, '.'); }));
SPR.def('i_gift', icon(g => { g.rect(2, 6, 12, 8, 'r'); g.rect(1, 4, 14, 3, 's'); g.vl(7, 4, 10, 'w'); g.vl(8, 4, 10, 'w'); g.pts([[5, 2], [6, 3], [10, 2], [9, 3], [4, 3], [11, 3]], 'w'); }));

/* ---------------- windows ---------------- */
Object.assign(UI.WIN, { prize: { t: '打開了！', i: 'i_gift', w: 320, at: ['c', 0], modal: true }, gacha: { t: '扭到重複的了', i: 'i_box', w: 340, at: ['c', 0], modal: true } });
Object.assign(UI, {
  prizeModal(p, from) { this.prizeP = { p, from }; this.openWin('prize'); },
  prizePreview(p) {
    if (p.type === 'item') return sprPreview(Room.itemCanvas({ k: p.id }), 120, 5);
    return h('div', { class: 'prize-ic' }, ico(p.type === 'coins' ? 'i_coin' : 'i_coupon', 72));
  },
  w_prize() {
    const P = this.prizeP; if (!P) return []; const p = P.p;
    const t = p.type === 'item' ? ['收到了「', h('b', { text: ITEMS[p.id].n }), '」'] : p.type === 'coins' ? ['得到 ', h('b', { class: 'num', text: String(p.n) }), ' 金幣'] : ['得到一張', h('b', { text: Rewards.couponName(p) }), '折價券'];
    const hint = (p.type === 'item' ? (p.pity ? '連續 4 次沒開到家具，這次保底送你一件。' : '') + '東西放在收納箱裡。' : p.type === 'coupon' ? `可以用在${Object.values(COUPON_CATS).join('、')}（主題房間、扭蛋、領養、消耗道具、旅行商人不行）。一次購買用一張、一天只能用一張，${COUPON_DAYS} 天後過期。` : '') ;
    const pity = P.from === '禮物盒' ? h('p', { class: 'hint', text: Rewards.pityText() }) : null;
    return [h('div', { class: 'gift' }, h('div', { class: 'gift-pv' }, this.prizePreview(p)), h('p', { class: 'gift-t' }, ...t), hint ? h('p', { class: 'hint', text: hint }) : null, pity),
      h('div', { class: 'row center' }, p.type === 'item' ? h('button', { class: 'chip primary', onclick: () => { this.closeWin('prize'); Game.place(p.id); } }, ico('i_brush', 20), '馬上擺放') : null,
        p.type === 'coupon' ? h('button', { class: 'chip primary', onclick: () => { this.closeWin('prize'); this.openWin('shop'); } }, ico('i_shop', 20), '去商店') : null,
        h('button', { class: 'chip', onclick: () => this.closeWin('prize') }, '收下'))];
  },
  w_gacha() {
    const W = Rewards.W, id = W.pend && W.pend.id, d = ITEMS[id]; if (!d) return [];
    const c = Rewards.sellPrice(id), o = Rewards.owned(id);
    return [h('div', { class: 'gift' }, h('div', { class: 'gift-pv' }, sprPreview(Room.itemCanvas({ k: id }), 120, 5)), h('p', { class: 'gift-t' }, '扭到了「', h('b', { text: d.n }), '」'),
      h('p', { class: 'hint', text: `你已經有這件了（房間裡 ${o.room} 件、收納箱 ${o.box} 件）。原價 ${d.price} 金幣。重複的也能拿來佈置，或是用原價 3 折賣掉。` })),
      h('div', { class: 'row center' }, h('button', { class: 'chip primary', onclick: () => Rewards.gachaKeep(false) }, ico('i_box', 20), '收進收納箱'), h('button', { class: 'chip', onclick: () => Rewards.gachaKeep(true) }, ico('i_coin', 20), `賣掉 +${c}`))];
  },
  // coupon picker used by the shop, the wardrobe and the pet window
  couponBar() {
    const groups = Rewards.groups(), W = Rewards.W;
    if (!groups.length) return null;
    const used = Rewards.usedToday();
    return h('div', { class: 'cpbar', 'aria-label': '折價券' },
      h('span', { class: 'cp-hint hint', text: used ? '今日已用券' : '選券後購買時使用；每天一張' }),
      ...groups.map(g => {
        const selected = W.coupons.some(c => c.id === W.sel && c.off === g.off);
        return h('button', { class: 'chip sm coupon-group' + (selected ? ' on' : ''), disabled: used,
          'aria-pressed': String(selected), title: '優先使用最早到期的一張；' + Rewards.timeLeft(g.first) + '後過期',
          onclick: () => Rewards.select(selected ? W.sel : g.first.id) },
          h('span', { class: 'coupon-kind', text: ((100-g.off)/10) + '折券 x' + g.count }),
          h('span', { class: 'coupon-expiry', text: '剩' + Rewards.daysLeft(g.first) + '天' }));
      }));
  },

  priceTag(base, cat) {
    const p = Rewards.price(base, cat);
    return p === base ? h('b', { class: 'num', text: String(base) }) : h('b', { class: 'num' }, h('s', { class: 'was', text: String(base) }), ' ' + p);
  },
});
