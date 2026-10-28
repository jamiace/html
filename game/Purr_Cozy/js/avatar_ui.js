/* ============================================================
   Wardrobe window for the paper-doll avatar
   ============================================================ */
UI.WIN.avatar = { t: I18n.s("u_345897933b2d"), i: 'i_shirt', w: 560, at: ['l', 0] };
const AVA_TABS = [
  ['face', I18n.s("u_a0860db58e88"), [['skin', I18n.s("u_de04efb8e03c"), 'sw'], ['cheeks', I18n.s("u_25c73ff62777"), 'grid', 'head']]],
  ['eyes', I18n.s("u_9069cc8f2c62"), [['eyes', I18n.s("u_9069cc8f2c62"), 'grid', 'face'], ['eyeColor', I18n.s("u_a372d451eb99"), 'sw']]],
  ['brow', I18n.s("u_5d55c28331af"), [['brows', I18n.s("u_a25ee7adaa11"), 'grid', 'face'], ['mouth', I18n.s("u_cbb4c198e88c"), 'grid', 'face']]],
  ['hair', I18n.s("u_0c0684148c17"), [['hairFront', I18n.s("u_730efd6f134b"), 'grid', 'head'], ['hairBack', I18n.s("u_f1a5738b5b26"), 'grid', 'headback'], ['hairColor', I18n.s("u_17b1a7da8cc4"), 'sw']]],
  ['top', I18n.s("u_f0ed5fbca379"), [['top', I18n.s("u_f0ed5fbca379"), 'grid', 'torso'], ['topColor', I18n.s("u_11979c5c7acc"), 'sw'], ['top2', I18n.s("u_2ae75e168123"), 'sw']]],
  ['bottom', I18n.s("u_d6af14e8852b"), [['bottom', I18n.s("u_73dd1a03019f"), 'grid', 'legs'], ['bottomColor', I18n.s("u_394ed4a8db28"), 'sw']]],
  ['shoes', I18n.s("u_a00b97bbc47f"), [['shoes', I18n.s("u_a00b97bbc47f"), 'grid', 'feet'], ['shoesColor', I18n.s("u_394ed4a8db28"), 'sw']]],
  ['hat', I18n.s("u_f045b9ca8f63"), [['hat', I18n.s("u_87fd8ca8df78"), 'grid', 'hat'], ['hatColor', I18n.s("u_394ed4a8db28"), 'sw']]],
  ['glasses', I18n.s("u_ed04dc3e7441"), [['glasses', I18n.s("u_48aa98edfe45"), 'grid', 'face'], ['glassesColor', I18n.s("u_147320dd5160"), 'sw'], ['ear', I18n.s("u_699f297f523a"), 'grid', 'head'], ['earColor', I18n.s("u_bf695780df12"), 'sw']]],
  ['acc', I18n.s("u_687820a2cba9"), [['neck', I18n.s("u_7536bd8e6524"), 'grid', 'torso'], ['neckColor', I18n.s("u_394ed4a8db28"), 'sw'], ['back', I18n.s("u_1ffb4b1f3d2c"), 'grid', 'full'], ['backColor', I18n.s("u_394ed4a8db28"), 'sw']]],
  ['sets', I18n.s("u_a4a69b0339d0"), null],
];
// 'full' shows the back (for back items such as wings); saved outfits are shown from the front
const AVA_CROP = { outfit: [0, 0, 20, 36, 'front0'], face: [3, 13, 16, 9, 'front0'], head: [1, 7, 20, 16, 'front0'], headback: [1, 7, 20, 22, 'back0'], torso: [1, 18, 20, 14, 'front0'], legs: [1, 21, 20, 13, 'front0'],
  feet: [2, 28, 18, 8, 'side0'], hat: [1, 0, 20, 16, 'front0'], full: [0, 0, 20, 36, 'back0'] };
function avaThumb(cfg, crop) {
  const [x, y, w, h, frame] = AVA_CROP[crop] || AVA_CROP.full, src = avatarCanvas(frame, cfg, null, 0, false);
  const s = Math.max(2, Math.min(4, Math.floor(56 / Math.max(w, h)))), c = document.createElement('canvas'); c.width = w * s; c.height = h * s; c.className = 'pv';
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, x, y, w, h, 0, 0, w * s, h * s); return c;
}
const AVA_RANDOM_SKIP = { hat: 0.55, glasses: 0.7, ear: 0.6, neck: 0.6, back: 0.8 };
Object.assign(UI, {
  avaView: 0, avaTab: 'face', avaTry: null,
  avaOwned(cat, id) { return partOwned(Game.S.closet, cat, id); },
  avaWear(cat, id) { const a = Game.S.avatar; a[cat] = id; this.avaTry = null; if (Game.avatar) Game.avatar.happy = 1; Game.save(); Cowork.push(); this.refresh('avatar'); },
  avaSet(cat, id) {
    if (this.avaOwned(cat, id)) return this.avaWear(cat, id);
    this.avaTry = (this.avaTry && this.avaTry.cat === cat && this.avaTry.id === id) ? null : { cat, id }; this.refresh('avatar');
  },
  avaBuy() {
    const S = Game.S, t = this.avaTry; if (!t) return;
    const base = partPrice(t.cat, t.id), price = Rewards.price(base, 'closet'), lvl = partLvl(t.cat, t.id);
    if (S.lvl < lvl) return UI.toast(I18n.s("u_5a2fe1146a15", [lvl]), 'i_star');
    if (S.coins < price) return UI.toast(I18n.s("u_b83938a441b6", [price, price - S.coins]), 'i_coin');
    S.coins -= price; Rewards.consume(base, 'closet', this.avaName(t.cat, t.id)); S.closet[closetKey(t.cat, t.id)] = 1;
    UI.toast(I18n.s("u_ef0927d7ec69", [this.avaName(t.cat, t.id), AVA_DYE[t.cat] ? I18n.s("u_786239391b7f") : '']), 'i_shirt');
    Life.track('buy', 1, { kind: 'closet', id: t.cat + ':' + t.id }); UI.hud(true); saveSoon();
    this.avaWear(t.cat, t.id);
  },
  avaName(cat, id) { const v = AVA_PARTS[cat][id]; return cat === 'eyeColor' ? EYEC_N[id] + I18n.s("u_4fac18f6209b") : Array.isArray(v) ? (v[3] || id) + (AVA_DYE[cat] ? I18n.s("u_45f21de3b2ac") : cat === 'hairColor' ? I18n.s("u_17b1a7da8cc4") : '') : v.n; },
  avaRandom() {
    const a = Game.S.avatar;
    for (const cat in AVA_PARTS) {
      if (AVA_RANDOM_SKIP[cat] && Math.random() < AVA_RANDOM_SKIP[cat]) { a[cat] = 'none'; continue; }
      const own = Object.keys(AVA_PARTS[cat]).filter(id => this.avaOwned(cat, id)); if (own.length) a[cat] = own[Math.floor(Math.random() * own.length)];
    }
    this.avaTry = null; Game.save(); Cowork.push(); this.refresh('avatar');
  },
  avaBadge(cat, id) {
    if (this.avaOwned(cat, id)) return null;
    const lv = partLvl(cat, id), locked = Game.S.lvl < lv;
    return h('em', { class: 'num' + (locked ? ' lock' : ''), text: locked ? `Lv${lv}` : partPrice(cat, id) });
  },
  w_avatar() {
    const S = Game.S, a = S.avatar; S.closet = S.closet || {}; S.outfits = S.outfits || [];
    const t = this.avaTry && AVA_PARTS[this.avaTry.cat] && AVA_PARTS[this.avaTry.cat][this.avaTry.id] ? this.avaTry : (this.avaTry = null);
    const view = t ? Object.assign({}, a, { [t.cat]: t.id }) : a;
    const views = ['front0', 'side0', 'back0'];
    const pv = sprPreview(avatarCanvas(views[this.avaView], view, null, 0, false), 170, 5); pv.classList.add('ava-pv');
    const tabs = h('div', { class: 'tabs wrap avatabs' }, ...AVA_TABS.map(([k, l]) => h('button', { class: 'tab sm' + (this.avaTab === k ? ' on' : ''), onclick: () => { this.avaTab = k; this.avaTry = null; this.refresh('avatar'); } }, l)));
    const body = [];
    const tab = AVA_TABS.find(x => x[0] === this.avaTab) || AVA_TABS[0];
    const order = (cat, ids) => ids.map((id, i) => [id, i]).sort((x, y) => (this.avaOwned(cat, y[0]) - this.avaOwned(cat, x[0])) || (partLvl(cat, x[0]) - partLvl(cat, y[0])) || (partPrice(cat, x[0]) - partPrice(cat, y[0])) || x[1] - y[1]).map(x => x[0]);
    if (tab[2]) {
      for (const [cat, label, kind, crop] of tab[2]) {
        const P = AVA_PARTS[cat], ids = order(cat, Object.keys(P)), own = ids.filter(id => this.avaOwned(cat, id)).length;
        body.push(h('div', { class: 'sub', text: I18n.s("u_e5bd73c0d774", [label, own, ids.length]) }));
        if (kind === 'sw') {
          const hexOf = (id) => { const v = P[id]; return Array.isArray(v) ? v[1] : '#ccc'; };
          body.push(h('div', { class: 'sws avasw' }, ...ids.map(id => { const owned = this.avaOwned(cat, id), nm = this.avaName(cat, id), lv = partLvl(cat, id);
            return h('button', { class: 'sw' + (view[cat] === id ? ' on' : '') + (owned ? '' : ' paid') + (t && t.cat === cat && t.id === id ? ' try' : ''), style: `--c:${hexOf(id)}`, title: nm + (owned ? '' : S.lvl < lv ? I18n.s("u_57a8bfd6b862", [lv, partPrice(cat, id)]) : I18n.s("u_3424e190351f", [partPrice(cat, id)])), 'aria-label': `${label} ${nm}${owned ? '' : I18n.s("u_70b6d36b4054")}`, onclick: () => this.avaSet(cat, id) }); })));
        } else {
          body.push(h('div', { class: 'avagrid' }, ...ids.map(id => {
            const v = Object.assign({}, a, { [cat]: id }), owned = this.avaOwned(cat, id), lv = partLvl(cat, id);
            return h('button', { class: 'avaopt' + (a[cat] === id ? ' on' : '') + (owned ? '' : ' paid') + (owned || S.lvl >= lv ? '' : ' locked') + (t && t.cat === cat && t.id === id ? ' try' : ''), title: P[id].n + (owned ? '' : I18n.s("u_57a8bfd6b862", [lv, partPrice(cat, id)])), onclick: () => this.avaSet(cat, id) }, avaThumb(v, crop), h('span', { text: P[id].n }), this.avaBadge(cat, id));
          })));
        }
      }
    } else {
      body.push(h('p', { class: 'hint', text: I18n.s("u_a3880d699ec2") }));
      body.push(h('div', { class: 'row' }, h('button', { class: 'chip primary', disabled: S.outfits.length >= 8, onclick: () => { S.outfits.push({ n: I18n.s("u_b23189acdb79", [S.outfits.length + 1]), a: sanitizeAvatar(a) }); Game.save(); this.refresh('avatar'); } }, ico('i_plus', 18), I18n.s("u_1326e6d460ea"))));
      body.push(h('div', { class: 'avagrid sets' }, ...S.outfits.map((o, i) => h('div', { class: 'avaopt set' }, avaThumb(Object.assign({}, a, o.a), 'outfit'), h('span', { text: o.n }),
        h('div', { class: 'row center' }, h('button', { class: 'chip sm primary', onclick: () => { for (const c in o.a) if (c in AVA_PARTS && this.avaOwned(c, o.a[c])) a[c] = o.a[c]; this.avaTry = null; Game.save(); Cowork.push(); this.refresh('avatar'); } }, I18n.s("u_2a56668cb258")), h('button', { class: 'chip sm', 'aria-label': I18n.s("u_3c8f5b363ab3"), onclick: () => { S.outfits.splice(i, 1); Game.save(); this.refresh('avatar'); } }, ico('i_trash', 14)))))));
    }
    let tryBar = null;
    if (t) {
      const base = partPrice(t.cat, t.id), price = Rewards.price(base, 'closet'), lv = partLvl(t.cat, t.id), short = Math.max(0, price - S.coins), lowLv = S.lvl < lv;
      tryBar = h('div', { class: 'avatry' }, h('div', { class: 'hint', text: I18n.s("u_96787af907b6", [this.avaName(t.cat, t.id)]) }),
        h('div', { class: 'row center' },
          h('button', { class: 'chip sm primary', disabled: lowLv || short > 0, onclick: () => this.avaBuy() }, ico('i_coin', 16), lowLv ? I18n.s("u_5aa48649ffcf", [lv]) : short ? I18n.s("u_f5ad3db2e3a4", [short]) : price < base ? I18n.s("u_2a76f2433f80", [price, base]) : I18n.s("u_75fb1333bc41", [price])),
          h('button', { class: 'chip sm', onclick: () => { this.avaTry = null; this.refresh('avatar'); } }, I18n.s("u_99b9ee94fea2"))));
    }
    const paidN = Object.keys(S.closet).length;
    return [h('div', { class: 'ava-row' },
      h('div', { class: 'ava-stage' }, pv, tryBar, h('div', { class: 'row center' }, h('button', { class: 'chip sm', onclick: () => { this.avaView = (this.avaView + 1) % 3; this.refresh('avatar'); } }, ico('i_flip', 18), I18n.s("u_f9513258c18d")), h('button', { class: 'chip sm', title: I18n.s("u_cd7202fd2731"), onclick: () => this.avaRandom() }, ico('i_sparkle', 18), I18n.s("u_3941bb44df5c")))),
      h('div', { class: 'ava-opts' },
        h('div', { class: 'row' }, h('span', { text: I18n.s("u_8f4c47bf1b49") }), h('b', { class: 'grow', text: a.name || I18n.s("u_3c581b6a26b4") }), h('button', { class: 'chip sm', onclick: () => this.openWin('account') }, I18n.s("u_339999c3a9eb"))),
        h('p', { class: 'hint', text: I18n.s("u_a039b191f159", [paidN]) }), tabs)),
      h('div', { class: 'scroll avabody' }, this.couponBar(), ...body)];
  },
});
