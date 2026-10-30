/* ============================================================
   Weekly travelling merchant
   - six merchants take turns, one per game week (Monday 06:00 to Monday 06:00);
     every player meets the same merchant in the same week
   - each sells six things you can only get from them (2 of each per week, no coupons)
   - each buys three kinds of furniture from your storage box (never what is placed
     in the room) at 40-60 % of the catalogue price, up to 5 per kind per week
   ============================================================ */
const MERCHANT_STOCK = 2, MERCHANT_SELL_MAX = 5;
const MERCHANTS = {
  moss: {
    n: I18n.s("u_b7e702721fff"), tag: I18n.s("u_7b0bc032dc7c"), awn: 'green', hi: I18n.s("u_ed0280caea5c"),
    look: { skin: 'warm', hairFront: 'none', hairBack: 'lowbun', hairColor: 'grey', eyes: 'calm', hat: 'straw', top: 'apron', topColor: 'sage', top2: 'cream', bottom: 'longskirt', bottomColor: 'olive', shoes: 'boots', shoesColor: 'cocoa', glasses: 'round', glassesColor: 'cocoa' },
    buys: [['plant', 0.55], ['flower', 0.5], ['figure', 0.42]],
  },
  clock: {
    n: I18n.s("u_48685ecf6cd8"), tag: I18n.s("u_b8a2a1d36d59"), awn: 'clay', hi: I18n.s("u_75b20671d229"),
    look: { skin: 'fair', hairFront: 'swoop', hairBack: 'short', hairColor: 'platinum', eyes: 'narrow', hat: 'tophat', hatColor: 'choco', top: 'blazer', topColor: 'cocoa', top2: 'cream', neck: 'bowtie', neckColor: 'wine', bottom: 'slacks', bottomColor: 'choco', shoes: 'loafers', shoesColor: 'coal', glasses: 'monocle', glassesColor: 'butter' },
    buys: [['clock', 0.6], ['art', 0.45], ['mirror', 0.52]],
  },
  fluff: {
    n: I18n.s("u_90b12faa89e3"), tag: I18n.s("u_112efe516cbb"), awn: 'pink', hi: I18n.s("u_6e95693a8234"),
    look: { skin: 'peach', hairFront: 'straight', hairBack: 'twintail', hairColor: 'pink', eyes: 'big', cheeks: 'whisker', hat: 'catears', hatColor: 'blush', top: 'hoodie', topColor: 'rose', bottom: 'skirt', bottomColor: 'cream', shoes: 'mary', shoesColor: 'rose' },
    buys: [['plush', 0.55], ['rug', 0.42], ['toy', 0.6]],
  },
  star: {
    n: I18n.s("u_eb1e8b2a7063"), tag: I18n.s("u_dc6a9a054cf7"), awn: 'navy', hi: I18n.s("u_960df81318f6"),
    look: { skin: 'lilac', hairFront: 'center', hairBack: 'xlong', hairColor: 'violet', eyes: 'star', eyeColor: 'gold', hat: 'witch', hatColor: 'navy', top: 'coat', topColor: 'navy', top2: 'lavender', back: 'cape', backColor: 'purple', bottom: 'pants', bottomColor: 'purple', shoes: 'boots', shoesColor: 'coal' },
    buys: [['neon', 0.5], ['lamp', 0.45], ['light', 0.58]],
  },
  cocoa: {
    n: I18n.s("u_bafe359f5ed0"), tag: I18n.s("u_f66f2852b888"), awn: 'sun', hi: I18n.s("u_0e1eb3e1367a"),
    look: { skin: 'tan', hairFront: 'curtain', hairBack: 'bob', hairColor: 'chestnut', eyes: 'smiley', cheeks: 'wide', hat: 'chef', hatColor: 'snow', top: 'apron', topColor: 'coral', top2: 'snow', bottom: 'pants', bottomColor: 'cocoa', shoes: 'sneakers', shoesColor: 'snow' },
    buys: [['tableware', 0.6], ['desk', 0.42], ['misc', 0.46]],
  },
  yarn: {
    n: I18n.s("u_a2285517fa34"), tag: I18n.s("u_d1690baed204"), awn: 'teal', hi: I18n.s("u_baea2552ebd2"),
    look: { skin: 'olive', hairFront: 'sideL', hairBack: 'braid', hairColor: 'auburn', eyes: 'doe', hat: 'beret', hatColor: 'teal', top: 'cardigan', topColor: 'mustard', top2: 'cream', neck: 'scarf', neckColor: 'teal', bottom: 'longskirt', bottomColor: 'teal', shoes: 'flats', shoesColor: 'cocoa', glasses: 'half', glassesColor: 'cocoa' },
    buys: [['rug', 0.5], ['seat', 0.4], ['storage', 0.45]],
  },
};
const MERCHANT_ORDER = ['moss', 'clock', 'fluff', 'star', 'cocoa', 'yarn'];
FAM_NAMES.merchant = I18n.s("u_a924b4e38bc8");

/* ---------------- the goods (6 per merchant) ---------------- */

const MERCHANT_GOODS={"moss":Object.fromEntries(["m_pine_bonsai","m_giant_monstera","m_moss_dome","m_hanging_ivy","m_orchid","m_cactus_trio"].map(id=>[id,ITEMS[id]])),"clock":Object.fromEntries(["m_grandfather","m_gramophone","m_antique_globe","m_candelabra","m_parchment_map","m_old_trunk"].map(id=>[id,ITEMS[id]])),"fluff":Object.fromEntries(["m_cat_condo","m_round_bed","m_dog_house","m_scratch_post","m_paw_rug","m_pet_portrait"].map(id=>[id,ITEMS[id]])),"star":Object.fromEntries(["m_telescope","m_moon_lamp","m_crystal_ball","m_star_mobile","m_zodiac_rug","m_nebula_poster"].map(id=>[id,ITEMS[id]])),"cocoa":Object.fromEntries(["m_cake_stand","m_candy_jar","m_macaron_tower","m_donut_pouf","m_icecream_cart","m_pudding_plush"].map(id=>[id,ITEMS[id]])),"yarn":Object.fromEntries(["m_quilt_rug","m_embroidery","m_knit_pouf","m_loom","m_yarn_hanging","m_sewing_machine"].map(id=>[id,ITEMS[id]]))};


/* ---------------- schedule & state ---------------- */
const Merchant = {
  get S() { const S = Game.S, wk = weekKey(); if (!S.merchant || S.merchant.wk !== wk) S.merchant = { wk, bought: {}, sold: {}, met: false }; return S.merchant; },
  weekIndex() { const k = weekKey(), d = new Date(k.slice(1) + 'T00:00:00'); return Math.round(d.getTime() / (7 * 86400000)); },
  id() { const n = this.weekIndex(); return MERCHANT_ORDER[((n % MERCHANT_ORDER.length) + MERCHANT_ORDER.length) % MERCHANT_ORDER.length]; },
  cur() { return MERCHANTS[this.id()]; },
  goods(mk) { return Object.keys(MERCHANT_GOODS[mk || this.id()]); },
  // this week's offer for a kind of furniture: the merchant's base rate +-5 %, always within 40-60 %
  rate(i) { const M = this.cur(), [, base] = M.buys[i], n = this.weekIndex(), h = ((n * 7919 + i * 104729) % 11 + 11) % 11 - 5; return Math.max(0.4, Math.min(0.6, Math.round((base + h / 100) * 100) / 100)); },
  offer(id, i) { return Math.max(1, Math.floor((ITEMS[id].price || 0) * this.rate(i))); },
  stockLeft(id) { return MERCHANT_STOCK - (this.S.bought[id] || 0); },
  soldLeft(i) { return MERCHANT_SELL_MAX - (this.S.sold[this.cur().buys[i][0]] || 0); },
  // furniture in the storage box (not in the room) that the merchant would buy for kind i
  sellable(i) { const S = Game.S, fam = this.cur().buys[i][0]; return Object.keys(S.inv).filter(id => S.inv[id] > 0 && ITEMS[id] && ITEMS[id].fam === fam && !ITEMS[id].special && !ITEMS[id].giftOnly && (ITEMS[id].price || 0) > 0).sort((a, b) => ITEMS[b].price - ITEMS[a].price); },
  buy(id) {
    const S = Game.S, d = ITEMS[id]; if (!d || d.merchant !== this.id()) return;
    if (this.stockLeft(id) <= 0) return UI.toast(I18n.s("u_747150d8f15f"), 'i_shop');
    if (S.lvl < (d.lvl || 1)) return UI.toast(I18n.s("u_e995644e3483", [d.lvl]), 'i_star');
    if (S.coins < d.price) return UI.toast(I18n.s("u_55ac75b47b82", [d.price - S.coins]), 'i_coin');
    S.coins -= d.price; this.S.bought[id] = (this.S.bought[id] || 0) + 1; S.inv[id] = (S.inv[id] || 0) + 1;
    Life.track('buy', 1, { kind: 'merchant', id });
    UI.toast(I18n.s("u_da6f656c455b", [d.n]), 'i_box', 3.2, { label: I18n.s("u_6a1f209d5ec4"), fn: () => { UI.closeWin('merchant'); Game.place(id); } });
    UI.hud(true); UI.refresh('merchant'); UI.refresh('storage'); Game.save(); saveSoon();
  },
  sell(id, i) {
    const S = Game.S, d = ITEMS[id], M = this.cur(); if (!d || !M.buys[i] || d.fam !== M.buys[i][0]) return;
    if (!(S.inv[id] > 0)) return UI.toast(I18n.s("u_faab36dbd4a6"), 'i_box');
    if (this.soldLeft(i) <= 0) return UI.toast(I18n.s("u_b6db1ac01443", [FAM_NAMES[M.buys[i][0]], MERCHANT_SELL_MAX]), 'i_shop');
    const c = this.offer(id, i);
    S.inv[id]--; if (!S.inv[id]) delete S.inv[id]; this.S.sold[M.buys[i][0]] = (this.S.sold[M.buys[i][0]] || 0) + 1;
    Game.reward(c, 0, 'raw'); UI.toast(I18n.s("u_9c28c4d6bc50", [d.n, M.n, c]), 'i_coin', 3);
    UI.hud(true); UI.refresh('merchant'); UI.refresh('storage'); Game.save(); saveSoon();
  },
  // ---------- the merchant sets up outside your door ----------
  // the way to the stall is a button outside the room (the dock on a computer, the bar under the room on a phone),
  // so nothing stands in front of your furniture
  actor: null, shown: '',
  spawn() { try { this._spawn(); } catch (e) { console.warn('[merchant]', e); } },
  _spawn() {
    if (!Game.S) return;
    const mk = this.id(); if (this.shown === mk) return; this.shown = mk;
    if (Room.actors) Room.actors = Room.actors.filter(a => !(a instanceof MerchantSign));
    if (!this.S.met) { this.S.met = true; Game.save(); setTimeout(() => UI.toast(I18n.s("u_b7698aebf390", [MERCHANTS[mk].n]), 'i_merchant', 5.5, { label: I18n.s("u_aa7bad4bc428"), fn: () => Merchant.go() }), 2500); }
    UI.badges();
  },
  check() { if (this.shown !== this.id()) this.spawn(); },
  // what the button does: a waiting story chapter first, otherwise the stall
  go() { if (this.S.seen && typeof Story !== 'undefined' && Story.pending()) return Story.open(); this.open(); },
  waiting() { return !this.S.seen || (typeof Story !== 'undefined' && Story.pending()); },
  open() { if (!this.S.seen) { this.S.seen = true; Game.save(); UI.badges(); } UI.openWin('merchant'); },
};

// a little market stall: the icon of the "travelling merchant" button
;
// the sign: a little A-frame board in the merchant's colours (no longer stands in the room; kept for older references)
;
class MerchantSign {
  constructor(mk) { this.mk = mk; this.x = 22; this.y = 163; this.t = Math.random() * 6; this.hop = 0; }
  z() { return this.y; }
  headPos() { return [this.x, this.y - 22]; }
  update(dt) { this.t += dt; if (this.hop > 0) this.hop -= dt; }
  spr() { const M = MERCHANTS[this.mk], map = M.awn === 'green' ? null : rampMap('green', M.awn); return SPR.get('m_sign', map, false, 'sign_' + M.awn); }
  draw(c) {
    const sp = this.spr(), jump = this.hop > 0 ? Math.round(Math.sin(this.hop / 0.35 * Math.PI) * 3) : 0;
    const x = Math.round(this.x - sp.width / 2), y = Math.round(this.y - sp.height) - jump;
    c.fillStyle = 'rgba(46,34,48,0.18)'; c.fillRect(x + 2, Math.round(this.y) - 1, sp.width - 4, 2);
    c.drawImage(sp, x, y);
    // "!" bubble until you have looked this week, then a small bobbing coin
    const b = Math.round(Math.sin(this.t * 3) * 1.5), bx = Math.round(this.x) - 4, by = y - 11 + b;
    if (!Merchant.S.seen) {
      c.fillStyle = '#2e2230'; c.fillRect(bx, by, 9, 9); c.fillRect(bx + 3, by + 9, 3, 2);
      c.fillStyle = '#fff4e0'; c.fillRect(bx + 1, by + 1, 7, 7); c.fillRect(bx + 4, by + 8, 1, 1);
      c.fillStyle = '#c4566e'; c.fillRect(bx + 4, by + 2, 1, 3); c.fillRect(bx + 4, by + 6, 1, 1);
    } else if (Math.sin(this.t * 0.9) > 0.55) c.drawImage(SPR.get('p_spark'), Math.round(this.x) + 4, y - 2 + b);
  }
  hit(x, y) { const sp = this.spr(); return Math.abs(x - this.x) <= sp.width / 2 + 1 && y > this.y - sp.height - 12 && y < this.y + 2; }
  poke() { this.hop = 0.35; Merchant.open(); }
}

// the scene at the top of the merchant window: your front door, the lane and the stall.
// Painted at 1 px = 1 game pixel (same size as the room), then enlarged without smoothing so it stays crisp.
function merchantScene(mk) {const env=Room.env,time=env.dark>.55?'night':env.h>=17&&env.h<19.5?'dusk':'day',im=PNGArt.image(PNGArt.meta.scenes[mk+'/'+time]),cv=document.createElement('canvas');cv.width=im.width*3;cv.height=im.height*3;cv.className='mscene';const c=cv.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(im,0,0,cv.width,cv.height);return cv;}

/* ---------------- window ---------------- */
UI.WIN.merchant = { t: I18n.s("u_a924b4e38bc8"), i: 'i_shop', w: 560, at: ['c', 0] };
Object.assign(UI, {
  merchTab: 'sell',
  w_merchant() {
    const S = Game.S, mk = Merchant.id(), M = MERCHANTS[mk], ws = weekStart(), we = weekEnd();
    const fmt = (d) => `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const head = h('div', { class: 'mstage' }, merchantScene(mk),
      h('div', { class: 'msay' }, h('div', { class: 'mname' }, h('b', { text: M.n }), h('span', { class: 'ptag', text: M.tag })), h('p', { text: `「${M.hi}」` })));
    const when = h('p', { class: 'hint', text: I18n.s("u_462b2804f993", [fmt(ws), fmt(we)]) });
    const tabs = h('div', { class: 'tabs' }, h('button', { class: 'tab' + (this.merchTab === 'sell' ? ' on' : ''), onclick: () => { this.merchTab = 'sell'; this.refresh('merchant'); } }, I18n.s("u_d728474bcf89")), h('button', { class: 'tab' + (this.merchTab === 'buy' ? ' on' : ''), onclick: () => { this.merchTab = 'buy'; this.refresh('merchant'); } }, I18n.s("u_cb18362f4930")));
    const wallet = h('span', { class: 'wallet' }, ico('i_coin', 20), h('b', { class: 'num', text: String(S.coins) }));
    const body = [];
    if (this.merchTab === 'sell') {
      body.push(h('p', { class: 'hint', text: I18n.s("u_4f5d85bac0b7", [M.n, MERCHANT_STOCK]) }));
      body.push(h('div', { class: 'grid' }, ...Merchant.goods(mk).map(id => {
        const d = ITEMS[id], left = Merchant.stockLeft(id), locked = S.lvl < d.lvl, own = (S.inv[id] || 0) + S.items.filter(i => i.k === id).length;
        return h('div', { class: 'card' + (locked ? ' locked' : '') }, h('div', { class: 'pvbox' }, sprPreview(SPR.get(id), 100, 3, 80)), h('div', { class: 'cn', text: d.n }),
          h('p', { class: 'cdesc', text: left > 0 ? I18n.t('merchant.stock',[left,own]) : I18n.s("u_801173176707") }),
          h('div', { class: 'cfoot' }, locked ? h('span', { class: 'lock', text: I18n.s("u_5aa48649ffcf", [d.lvl]) }) : h('span', { class: 'price' }, ico('i_coin', 18), h('b', { class: 'num', text: String(d.price) })),
            h('button', { class: 'chip sm', disabled: locked || left <= 0 || S.coins < d.price, onclick: () => Merchant.buy(id) }, I18n.s("u_d781b1f88f12"))));
      })));
    } else {
      body.push(h('p', { class: 'hint', text: I18n.s("u_b2be32470107", [MERCHANT_SELL_MAX]) }));
      M.buys.forEach(([fam], i) => {
        const list = Merchant.sellable(i), left = Merchant.soldLeft(i);
        body.push(h('div', { class: 'sub', text: I18n.s("u_db6afc9d2b67", [FAM_NAMES[fam] || fam, Math.round(Merchant.rate(i) * 100), left]) }));
        if (!list.length) { body.push(h('p', { class: 'hint', text: I18n.s("u_595ccb220e02") })); return; }
        body.push(h('div', { class: 'mlist2' }, ...list.slice(0, 30).map(id => h('div', { class: 'mrow' }, sprPreview(SPR.get(ITEMS[id].spr, ITEMS[id].map, false, id), 40, 2),
          h('span', { class: 'grow', text: `${ITEMS[id].n}  ×${S.inv[id]}` }), h('span', { class: 'price' }, ico('i_coin', 16), h('b', { class: 'num', text: String(Merchant.offer(id, i)) })),
          h('button', { class: 'chip sm', disabled: left <= 0, onclick: () => Merchant.sell(id, i) }, I18n.s("u_290ca6baa47b"))))));
      });
    }
    return [head, when, h('div', { class: 'row between' }, tabs, wallet), ...body];
  },
});
