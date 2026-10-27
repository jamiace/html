/* ============================================================
   Wardrobe window for the paper-doll avatar
   ============================================================ */
UI.WIN.avatar = { t: '造型', i: 'i_shirt', w: 560, at: ['l', 0] };
const AVA_TABS = [
  ['face', '臉', [['skin', '膚色', 'sw'], ['cheeks', '臉頰', 'grid', 'head']]],
  ['eyes', '眼睛', [['eyes', '眼睛', 'grid', 'face'], ['eyeColor', '眼睛顏色', 'sw']]],
  ['brow', '眉毛嘴巴', [['brows', '眉毛', 'grid', 'face'], ['mouth', '嘴巴', 'grid', 'face']]],
  ['hair', '髮型', [['hairFront', '瀏海', 'grid', 'head'], ['hairBack', '後髮', 'grid', 'headback'], ['hairColor', '髮色', 'sw']]],
  ['top', '上衣', [['top', '上衣', 'grid', 'torso'], ['topColor', '主色', 'sw'], ['top2', '配色', 'sw']]],
  ['bottom', '下身', [['bottom', '褲子裙子', 'grid', 'legs'], ['bottomColor', '顏色', 'sw']]],
  ['shoes', '鞋子', [['shoes', '鞋子', 'grid', 'feet'], ['shoesColor', '顏色', 'sw']]],
  ['hat', '帽子', [['hat', '帽子頭飾', 'grid', 'hat'], ['hatColor', '顏色', 'sw']]],
  ['glasses', '眼鏡耳飾', [['glasses', '眼鏡', 'grid', 'face'], ['glassesColor', '鏡框顏色', 'sw'], ['ear', '耳飾', 'grid', 'head'], ['earColor', '耳飾顏色', 'sw']]],
  ['acc', '頸部背部', [['neck', '頸部', 'grid', 'torso'], ['neckColor', '顏色', 'sw'], ['back', '背部', 'grid', 'full'], ['backColor', '顏色', 'sw']]],
  ['sets', '套裝', null],
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
    if (S.lvl < lvl) return UI.toast(`升到 Lv ${lvl} 才能買`, 'i_star');
    if (S.coins < price) return UI.toast(`這個要 ${price} 金幣，還差 ${price - S.coins}`, 'i_coin');
    S.coins -= price; Rewards.consume(base, 'closet', this.avaName(t.cat, t.id)); S.closet[closetKey(t.cat, t.id)] = 1;
    UI.toast(`買下了「${this.avaName(t.cat, t.id)}」${AVA_DYE[t.cat] ? '（所有衣服都能用這個顏色）' : ''}`, 'i_shirt');
    Life.track('buy', 1, { kind: 'closet', id: t.cat + ':' + t.id }); UI.hud(true); saveSoon();
    this.avaWear(t.cat, t.id);
  },
  avaName(cat, id) { const v = AVA_PARTS[cat][id]; return cat === 'eyeColor' ? EYEC_N[id] + '色眼睛' : Array.isArray(v) ? (v[3] || id) + (AVA_DYE[cat] ? '染料' : cat === 'hairColor' ? '髮色' : '') : v.n; },
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
        body.push(h('div', { class: 'sub', text: `${label}（已擁有 ${own} / ${ids.length}）` }));
        if (kind === 'sw') {
          const hexOf = (id) => { const v = P[id]; return Array.isArray(v) ? v[1] : '#ccc'; };
          body.push(h('div', { class: 'sws avasw' }, ...ids.map(id => { const owned = this.avaOwned(cat, id), nm = this.avaName(cat, id), lv = partLvl(cat, id);
            return h('button', { class: 'sw' + (view[cat] === id ? ' on' : '') + (owned ? '' : ' paid') + (t && t.cat === cat && t.id === id ? ' try' : ''), style: `--c:${hexOf(id)}`, title: nm + (owned ? '' : S.lvl < lv ? `（Lv ${lv}、${partPrice(cat, id)} 金幣）` : `（${partPrice(cat, id)} 金幣）`), 'aria-label': `${label} ${nm}${owned ? '' : '，未擁有'}`, onclick: () => this.avaSet(cat, id) }); })));
        } else {
          body.push(h('div', { class: 'avagrid' }, ...ids.map(id => {
            const v = Object.assign({}, a, { [cat]: id }), owned = this.avaOwned(cat, id), lv = partLvl(cat, id);
            return h('button', { class: 'avaopt' + (a[cat] === id ? ' on' : '') + (owned ? '' : ' paid') + (owned || S.lvl >= lv ? '' : ' locked') + (t && t.cat === cat && t.id === id ? ' try' : ''), title: P[id].n + (owned ? '' : `（Lv ${lv}、${partPrice(cat, id)} 金幣）`), onclick: () => this.avaSet(cat, id) }, avaThumb(v, crop), h('span', { text: P[id].n }), this.avaBadge(cat, id));
          })));
        }
      }
    } else {
      body.push(h('p', { class: 'hint', text: '把現在的造型存起來，之後一鍵換回來（最多 8 套）。' }));
      body.push(h('div', { class: 'row' }, h('button', { class: 'chip primary', disabled: S.outfits.length >= 8, onclick: () => { S.outfits.push({ n: `套裝 ${S.outfits.length + 1}`, a: sanitizeAvatar(a) }); Game.save(); this.refresh('avatar'); } }, ico('i_plus', 18), '存成新套裝')));
      body.push(h('div', { class: 'avagrid sets' }, ...S.outfits.map((o, i) => h('div', { class: 'avaopt set' }, avaThumb(Object.assign({}, a, o.a), 'outfit'), h('span', { text: o.n }),
        h('div', { class: 'row center' }, h('button', { class: 'chip sm primary', onclick: () => { for (const c in o.a) if (c in AVA_PARTS && this.avaOwned(c, o.a[c])) a[c] = o.a[c]; this.avaTry = null; Game.save(); Cowork.push(); this.refresh('avatar'); } }, '換上'), h('button', { class: 'chip sm', 'aria-label': '刪除', onclick: () => { S.outfits.splice(i, 1); Game.save(); this.refresh('avatar'); } }, ico('i_trash', 14)))))));
    }
    let tryBar = null;
    if (t) {
      const base = partPrice(t.cat, t.id), price = Rewards.price(base, 'closet'), lv = partLvl(t.cat, t.id), short = Math.max(0, price - S.coins), lowLv = S.lvl < lv;
      tryBar = h('div', { class: 'avatry' }, h('div', { class: 'hint', text: `試穿中：${this.avaName(t.cat, t.id)}` }),
        h('div', { class: 'row center' },
          h('button', { class: 'chip sm primary', disabled: lowLv || short > 0, onclick: () => this.avaBuy() }, ico('i_coin', 16), lowLv ? `Lv ${lv} 解鎖` : short ? `還差 ${short}` : price < base ? `${price}（原 ${base}）買下` : `${price} 買下`),
          h('button', { class: 'chip sm', onclick: () => { this.avaTry = null; this.refresh('avatar'); } }, '脫掉')));
    }
    const paidN = Object.keys(S.closet).length;
    return [h('div', { class: 'ava-row' },
      h('div', { class: 'ava-stage' }, pv, tryBar, h('div', { class: 'row center' }, h('button', { class: 'chip sm', onclick: () => { this.avaView = (this.avaView + 1) % 3; this.refresh('avatar'); } }, ico('i_flip', 18), '轉一圈'), h('button', { class: 'chip sm', title: '用已經擁有的款式隨機搭配', onclick: () => this.avaRandom() }, ico('i_sparkle', 18), '隨機'))),
      h('div', { class: 'ava-opts' },
        h('div', { class: 'row' }, h('span', { text: '名字：' }), h('b', { class: 'grow', text: a.name || '（還沒設定）' }), h('button', { class: 'chip sm', onclick: () => this.openWin('account') }, '到帳號設定')),
        h('p', { class: 'hint', text: `每一項都有幾款免費的基本款，其他款式用金幣購買，等級越高能買的越多。點沒有的款式可以先試穿，衣服顏色買一次所有衣服都能用（已收藏 ${paidN} 件）。` }), tabs)),
      h('div', { class: 'scroll avabody' }, this.couponBar(), ...body)];
  },
});
