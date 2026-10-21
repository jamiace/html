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
const AVA_CROP = { face: [3, 13, 16, 9, 'front0'], head: [1, 7, 20, 16, 'front0'], headback: [1, 7, 20, 22, 'back0'], torso: [1, 18, 20, 14, 'front0'], legs: [1, 21, 20, 13, 'front0'],
  feet: [2, 28, 18, 8, 'side0'], hat: [1, 0, 20, 16, 'front0'], full: [0, 0, 20, 36, 'back0'] };
function avaThumb(cfg, crop) {
  const [x, y, w, h, frame] = AVA_CROP[crop] || AVA_CROP.full, src = avatarCanvas(frame, cfg, null, 0, false);
  const s = Math.max(2, Math.min(4, Math.floor(56 / Math.max(w, h)))), c = document.createElement('canvas'); c.width = w * s; c.height = h * s; c.className = 'pv';
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, x, y, w, h, 0, 0, w * s, h * s); return c;
}
const AVA_RANDOM_SKIP = { hat: 0.55, glasses: 0.7, ear: 0.6, neck: 0.6, back: 0.8 };
Object.assign(UI, {
  avaView: 0, avaTab: 'face',
  avaOwned(cat, id) { return !partPrice(cat, id) || !!(Game.S.closet || {})[cat + ':' + id]; },
  avaSet(cat, id) {
    const S = Game.S, a = S.avatar, price = partPrice(cat, id);
    if (price && !this.avaOwned(cat, id)) {
      if (S.coins < price) return UI.toast(`這個要 ${price} 金幣，還差 ${price - S.coins}`, 'i_coin');
      S.coins -= price; (S.closet || (S.closet = {}))[cat + ':' + id] = 1; UI.toast(`買下了「${AVA_PARTS[cat][id].n}」`, 'i_shirt'); UI.hud(true); Life.track('buy', 1, { kind: 'closet', id }); saveSoon();
    }
    a[cat] = id; if (Game.avatar) Game.avatar.happy = 1; Game.save(); Cowork.push(); this.refresh('avatar');
  },
  avaRandom() {
    const a = Game.S.avatar, pick = (o) => { const ks = Object.keys(o); return ks[Math.floor(Math.random() * ks.length)]; };
    for (const cat in AVA_PARTS) {
      if (AVA_RANDOM_SKIP[cat] && Math.random() < AVA_RANDOM_SKIP[cat]) { a[cat] = 'none'; continue; }
      const free = Object.keys(AVA_PARTS[cat]).filter(id => this.avaOwned(cat, id)); a[cat] = free[Math.floor(Math.random() * free.length)] || pick(AVA_PARTS[cat]);
    }
    if (Math.random() < 0.6) a.eyes = ['round', 'shiny', 'big', 'doe', 'dot', 'lashes', 'smiley'][Math.floor(Math.random() * 7)];
    if (Math.random() < 0.6) a.mouth = ['smile', 'happy', 'cat', 'grin', 'smirk'][Math.floor(Math.random() * 5)];
    if (Math.random() < 0.7) a.skin = ['porcelain', 'fair', 'peach', 'warm', 'tan', 'olive', 'caramel', 'brown', 'deep', 'ebony'][Math.floor(Math.random() * 10)];
    Game.save(); Cowork.push(); this.refresh('avatar');
  },
  w_avatar() {
    const S = Game.S, a = S.avatar; S.closet = S.closet || {}; S.outfits = S.outfits || [];
    const views = ['front0', 'side0', 'back0'];
    const walk = Math.floor(Date.now() / 250) % 3;
    const pv = sprPreview(avatarCanvas(views[this.avaView], a, null, 0, this.avaView === 1 && false), 170, 5); pv.classList.add('ava-pv');
    const tabs = h('div', { class: 'tabs wrap avatabs' }, ...AVA_TABS.map(([k, l]) => h('button', { class: 'tab sm' + (this.avaTab === k ? ' on' : ''), onclick: () => { this.avaTab = k; this.refresh('avatar'); } }, l)));
    const body = [];
    const tab = AVA_TABS.find(t => t[0] === this.avaTab) || AVA_TABS[0];
    if (tab[2]) {
      for (const [cat, label, kind, crop] of tab[2]) {
        const P = AVA_PARTS[cat], ids = Object.keys(P);
        body.push(h('div', { class: 'sub', text: `${label}（${ids.length}）` }));
        if (kind === 'sw') {
          const hexOf = (id) => { const v = P[id]; return Array.isArray(v) ? v[cat === 'eyeColor' ? 1 : Math.min(1, v.length - 1)] : '#ccc'; };
          const nameOf = (id) => { const v = P[id]; return cat === 'eyeColor' ? EYEC_N[id] : Array.isArray(v) ? v[3] || id : id; };
          body.push(h('div', { class: 'sws avasw' }, ...ids.map(id => h('button', { class: 'sw' + (a[cat] === id ? ' on' : ''), style: `--c:${hexOf(id)}`, title: nameOf(id), 'aria-label': `${label} ${nameOf(id)}`, onclick: () => this.avaSet(cat, id) }))));
        } else {
          body.push(h('div', { class: 'avagrid' }, ...ids.map(id => {
            const v = Object.assign({}, a, { [cat]: id }), owned = this.avaOwned(cat, id), price = partPrice(cat, id);
            return h('button', { class: 'avaopt' + (a[cat] === id ? ' on' : '') + (owned ? '' : ' paid'), title: P[id].n + (owned ? '' : `（${price} 金幣）`), onclick: () => this.avaSet(cat, id) }, avaThumb(v, crop), h('span', { text: P[id].n }), owned ? null : h('em', { class: 'num', text: price }));
          })));
        }
      }
    } else {
      body.push(h('p', { class: 'hint', text: '把現在的造型存起來，之後一鍵換回來（最多 8 套）。' }));
      body.push(h('div', { class: 'row' }, h('button', { class: 'chip primary', disabled: S.outfits.length >= 8, onclick: () => { S.outfits.push({ n: `套裝 ${S.outfits.length + 1}`, a: sanitizeAvatar(a) }); Game.save(); this.refresh('avatar'); } }, ico('i_plus', 18), '存成新套裝')));
      body.push(h('div', { class: 'avagrid sets' }, ...S.outfits.map((o, i) => h('div', { class: 'avaopt set' }, avaThumb(Object.assign({}, a, o.a), 'full'), h('span', { text: o.n }),
        h('div', { class: 'row center' }, h('button', { class: 'chip sm primary', onclick: () => { Object.assign(a, o.a); Game.save(); Cowork.push(); this.refresh('avatar'); } }, '換上'), h('button', { class: 'chip sm', 'aria-label': '刪除', onclick: () => { S.outfits.splice(i, 1); Game.save(); this.refresh('avatar'); } }, ico('i_trash', 14)))))));
    }
    const owned = Object.keys(S.closet).length;
    return [h('div', { class: 'ava-row' },
      h('div', { class: 'ava-stage' }, pv, h('div', { class: 'row center' }, h('button', { class: 'chip sm', onclick: () => { this.avaView = (this.avaView + 1) % 3; this.refresh('avatar'); } }, ico('i_flip', 18), '轉一圈'), h('button', { class: 'chip sm', onclick: () => this.avaRandom() }, ico('i_sparkle', 18), '隨機'))),
      h('div', { class: 'ava-opts' },
        h('label', { class: 'field' }, h('span', { text: '名字' }), h('div', { class: 'inset' }, h('input', { id: 'ava-name', type: 'text', maxlength: '16', value: a.name || '', placeholder: '一起專注時顯示', onchange: e => { a.name = e.target.value.trim().slice(0, 16); Game.save(); Cowork.push(); } }))),
        h('p', { class: 'hint', text: `五官、髮型、服裝、鞋子、配件都可以自由搭配，顏色也能分開換。標價的款式買一次就能一直穿（已收藏 ${owned} 件）。` }), tabs)),
      h('div', { class: 'scroll avabody' }, ...body)];
  },
});
