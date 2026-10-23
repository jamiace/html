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
    n: '青苔婆婆', tag: '植物商人', awn: 'green', hi: '孩子，這週我帶了山裡的好植物。家裡多的盆栽、花瓶，也可以賣給我。',
    look: { skin: 'warm', hairFront: 'none', hairBack: 'lowbun', hairColor: 'grey', eyes: 'calm', hat: 'straw', top: 'apron', topColor: 'sage', top2: 'cream', bottom: 'longskirt', bottomColor: 'olive', shoes: 'boots', shoesColor: 'cocoa', glasses: 'round', glassesColor: 'cocoa' },
    buys: [['plant', 0.55], ['flower', 0.5], ['figure', 0.42]],
  },
  clock: {
    n: '老鐘先生', tag: '古董商人', awn: 'clay', hi: '每一件古董都有故事。你有不要的鐘、畫或鏡子嗎？我出好價錢。',
    look: { skin: 'fair', hairFront: 'swoop', hairBack: 'short', hairColor: 'platinum', eyes: 'narrow', hat: 'tophat', hatColor: 'choco', top: 'blazer', topColor: 'cocoa', top2: 'cream', neck: 'bowtie', neckColor: 'wine', bottom: 'slacks', bottomColor: 'choco', shoes: 'loafers', shoesColor: 'coal', glasses: 'monocle', glassesColor: 'butter' },
    buys: [['clock', 0.6], ['art', 0.45], ['mirror', 0.52]],
  },
  fluff: {
    n: '毛球小姐', tag: '寵物用品商', awn: 'pink', hi: '毛孩們好嗎？這週有超舒服的窩！多的玩偶、地毯、玩具我都收喔。',
    look: { skin: 'peach', hairFront: 'straight', hairBack: 'twintail', hairColor: 'pink', eyes: 'big', cheeks: 'whisker', hat: 'catears', hatColor: 'blush', top: 'hoodie', topColor: 'rose', bottom: 'skirt', bottomColor: 'cream', shoes: 'mary', shoesColor: 'rose' },
    buys: [['plush', 0.55], ['rug', 0.42], ['toy', 0.6]],
  },
  star: {
    n: '夜星', tag: '星象商人', awn: 'navy', hi: '星星說，這週你會遇到好東西。我也在收集會發光的燈。',
    look: { skin: 'lilac', hairFront: 'center', hairBack: 'xlong', hairColor: 'violet', eyes: 'star', eyeColor: 'gold', hat: 'witch', hatColor: 'navy', top: 'coat', topColor: 'navy', top2: 'lavender', back: 'cape', backColor: 'purple', bottom: 'pants', bottomColor: 'purple', shoes: 'boots', shoesColor: 'coal' },
    buys: [['neon', 0.5], ['lamp', 0.45], ['light', 0.58]],
  },
  cocoa: {
    n: '可可', tag: '甜點商人', awn: 'sun', hi: '剛出爐的甜點擺飾！你家多的杯子、書桌小物，我拿去布置店裡。',
    look: { skin: 'tan', hairFront: 'curtain', hairBack: 'bob', hairColor: 'chestnut', eyes: 'smiley', cheeks: 'wide', hat: 'chef', hatColor: 'snow', top: 'apron', topColor: 'coral', top2: 'snow', bottom: 'pants', bottomColor: 'cocoa', shoes: 'sneakers', shoesColor: 'snow' },
    buys: [['tableware', 0.6], ['desk', 0.42], ['misc', 0.46]],
  },
  yarn: {
    n: '阿線', tag: '手作商人', awn: 'teal', hi: '這些都是我一針一線做的。家裡用不到的地毯、椅子、櫃子可以賣我改造。',
    look: { skin: 'olive', hairFront: 'sideL', hairBack: 'braid', hairColor: 'auburn', eyes: 'doe', hat: 'beret', hatColor: 'teal', top: 'cardigan', topColor: 'mustard', top2: 'cream', neck: 'scarf', neckColor: 'teal', bottom: 'longskirt', bottomColor: 'teal', shoes: 'flats', shoesColor: 'cocoa', glasses: 'half', glassesColor: 'cocoa' },
    buys: [['rug', 0.5], ['seat', 0.4], ['storage', 0.45]],
  },
};
const MERCHANT_ORDER = ['moss', 'clock', 'fluff', 'star', 'cocoa', 'yarn'];
FAM_NAMES.merchant = '旅行商人';

/* ---------------- the goods (6 per merchant) ---------------- */
const MG = (w, h, fn) => G(w, h, fn);
const MERCHANT_GOODS = {
  moss: {
    m_pine_bonsai: { n: '古松盆景', w: 20, h: 16, cat: 'decor', layer: 'decor', price: 260, lvl: 6, draw(g) { g.rect(2, 12, 16, 3, 'M'); g.hl(2, 12, 16, 'N'); g.hl(3, 14, 14, 'L'); g.pts([[9, 11], [9, 10], [8, 9], [8, 8], [9, 7], [10, 6], [11, 6], [12, 5]], 'b'); g.pts([[10, 10], [10, 9]], 'a'); for (const [x, y, rx] of [[6, 7, 4], [13, 4, 4.5], [9, 3, 3], [15, 8, 3]]) { g.ellipse(x, y, rx, 1.8, 'i'); g.hl(x - rx + 1, y - 1, rx * 2 - 2, 'j'); } g.pts([[12, 3], [5, 6], [14, 7]], 'k'); g.pts([[4, 11], [15, 11], [16, 11]], 'k'); } },
    m_giant_monstera: { n: '巨型龜背芋', w: 28, h: 36, cat: 'plant', layer: 'floor', price: 420, lvl: 10, react: 'water', draw(g) { g.rect(8, 27, 12, 8, 'B'); g.hl(7, 27, 14, 'A'); g.vl(8, 28, 7, 'z'); g.hl(9, 34, 10, 'z'); g.pts([[13, 26], [13, 22], [14, 18], [12, 14], [15, 12], [10, 10]], 'i'); for (const [x, y, rx, ry] of [[7, 12, 6, 5], [20, 10, 6.5, 5.5], [13, 5, 5.5, 4.5], [21, 21, 5.5, 4], [6, 22, 5, 4]]) { g.ellipse(x, y, rx, ry, 'j'); g.ellipse(x - 1, y - 1, rx - 2, ry - 2, 'k'); g.hl(x - rx + 2, y, rx * 2 - 4, 'i'); for (const sx of [-1, 1]) for (let k = 1; k <= 2; k++) { const ex = Math.round(x + sx * (rx - 0.5)), ey = Math.round(y - 2 + k * 2); g.px(ex, ey, '.'); g.px(ex - sx, ey, '.'); } } } },
    m_moss_dome: { n: '玻璃鐘罩苔蘚', w: 14, h: 17, cat: 'decor', layer: 'decor', price: 220, lvl: 5, draw(g) { g.ellipse(7, 8, 6, 7.5, ','); g.rect(1, 14, 12, 3, 'b'); g.hl(1, 14, 12, 'c'); g.ellipse(7, 13, 5, 2, 'j'); g.pts([[4, 12], [6, 11], [9, 12], [10, 11]], 'k'); g.pts([[7, 10], [7, 9], [6, 8]], 'i'); g.px(6, 7, 's'); g.px(7, 0, 'b'); g.ellipse(4, 5, 1, 2, ':'); } },
    m_hanging_ivy: { n: '吊掛常春藤', w: 16, h: 26, cat: 'wall', layer: 'wall', price: 240, lvl: 7, draw(g) { g.pts([[8, 0], [7, 1], [9, 1], [6, 2], [10, 2], [5, 3], [11, 3], [5, 4], [11, 4], [5, 5], [11, 5]], 'g'); g.rect(4, 6, 8, 5, 'M'); g.hl(4, 6, 8, 'N'); g.hl(4, 10, 8, 'L'); for (const [x, len] of [[3, 14], [6, 18], [9, 12], [12, 16]]) for (let y = 0; y < len; y++) { const xx = x + Math.round(Math.sin(y * 0.7) * 1); g.px(xx, 8 + y, y % 3 ? 'j' : 'k'); if (y % 4 === 1) g.px(xx + 1, 8 + y, 'i'); } } },
    m_orchid: { n: '蝴蝶蘭', w: 14, h: 22, cat: 'plant', layer: 'decor', price: 280, lvl: 8, react: 'water', draw(g) { g.rect(3, 16, 8, 6, 'Z'); g.hl(3, 16, 8, 'B'); g.vl(10, 17, 5, 'A'); g.ellipse(7, 16, 5, 1.5, 'j'); g.ellipse(3, 15, 3, 1.2, 'k'); g.pts([[7, 15], [7, 12], [8, 9], [9, 6], [10, 4], [11, 3]], 'i'); for (const [x, y] of [[6, 8], [9, 5], [12, 3], [5, 11]]) { g.pts([[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]], 'H'); g.px(x, y, 'w'); g.px(x - 1, y + 1, 'B'); } } },
    m_cactus_trio: { n: '仙人掌三兄弟', w: 22, h: 15, cat: 'plant', layer: 'decor', price: 180, lvl: 4, react: 'water', draw(g) { for (const [x, h, c] of [[4, 8, 'M'], [11, 11, 'r'], [18, 6, 'J']]) { g.rect(x - 3, 11, 6, 4, c); g.hl(x - 3, 11, 6, c === 'M' ? 'N' : c === 'r' ? 's' : 'K'); g.rect(x - 1, 11 - h, 3, h, 'j'); g.vl(x - 1, 11 - h, h, 'k'); g.px(x, 10 - h, 'j'); if (h > 7) { g.pts([[x + 2, 7], [x + 3, 7], [x + 3, 6], [x + 3, 5]], 'j'); g.pts([[x - 2, 6], [x - 3, 6], [x - 3, 5]], 'j'); } for (let y = 12 - h; y < 11; y += 2) g.px(x + 1, y, 'l'); } g.px(11, 0, 's'); g.px(18, 4, 'w'); } },
  },
  clock: {
    m_grandfather: { n: '落地老爺鐘', w: 16, h: 42, cat: 'furniture', layer: 'floor', price: 560, lvl: 14, clock: { cx: 8, cy: 8 }, react: 'time', draw(g) { g.rect(2, 2, 12, 38, 'b'); g.rect(1, 0, 14, 3, 'a'); g.hl(2, 0, 12, 'c'); g.ellipse(8, 8, 5, 5, 'w'); g.ellipse(8, 8, 4, 4, 'f'); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; g.px(Math.round(8 + Math.sin(a) * 3), Math.round(8 - Math.cos(a) * 3), 'a'); } g.rect(4, 15, 8, 18, 'a'); g.rect(5, 16, 6, 16, ';'); g.vl(8, 16, 12, 'v'); g.ellipse(8, 28.5, 2, 2, 'w'); g.px(8, 28, 'x'); g.rect(1, 36, 14, 4, 'a'); g.hl(1, 36, 14, 'c'); g.vl(13, 3, 33, 'a'); g.vl(2, 3, 33, 'c'); } },
    m_gramophone: { n: '留聲機', w: 18, h: 20, cat: 'decor', layer: 'decor', price: 380, lvl: 11, music: true, draw(g) { g.rect(2, 13, 12, 6, 'b'); g.hl(2, 13, 12, 'c'); g.hl(2, 18, 12, 'a'); g.ellipse(8, 13, 5, 1.2, 'Y'); g.pts([[11, 12], [12, 11], [12, 10], [12, 9]], 'w'); for (let i = 0; i < 8; i++) { const r = 0.7 + i * 0.5; g.ellipse(11.5 + i * 0.7, 9.5 - i * 1.05, r, r, i % 2 ? 'v' : 'w'); } g.ellipse(16.3, 2.2, 3.4, 2.4, 'u'); g.ellipse(16.5, 2.4, 2.2, 1.4, 'a'); g.pts([[13, 4], [14, 3]], 'x'); } },
    m_antique_globe: { n: '古董地球儀', w: 14, h: 18, cat: 'decor', layer: 'decor', price: 300, lvl: 9, draw(g) { g.rect(4, 16, 6, 2, 'b'); g.vl(7, 12, 4, 'a'); g.ellipse(7, 7, 5.5, 5.5, 'h'); g.ellipse(6, 6, 2.5, 2, 'M'); g.ellipse(9, 9, 2, 1.5, 'M'); g.px(8, 4, 'M'); g.ellipse(5, 5, 1, 1, 'g'); for (let a = -2.4; a <= 0.8; a += 0.2) g.px(Math.round(7 + Math.cos(a) * 6.5), Math.round(7 + Math.sin(a) * 6.5), 'v'); g.px(7, 0, 'v'); } },
    m_candelabra: { n: '三叉燭台', w: 16, h: 18, cat: 'decor', layer: 'decor', price: 240, lvl: 8, light: L(8, 3, 26, 'warm', 0.9), toggle: true, draw(g) { g.rect(5, 16, 6, 2, 'u'); g.vl(8, 9, 7, 'v'); g.hl(2, 10, 12, 'v'); g.vl(2, 7, 3, 'v'); g.vl(13, 7, 3, 'v'); g.hl(1, 10, 2, 'u'); g.hl(13, 10, 2, 'u'); for (const x of [2, 8, 13]) { g.rect(x, x === 8 ? 3 : 4, 1, x === 8 ? 6 : 3, 'f'); g.px(x, x === 8 ? 2 : 3, 'X'); g.px(x, x === 8 ? 1 : 2, 'W'); } } },
    m_parchment_map: { n: '羊皮紙地圖', w: 30, h: 20, cat: 'wall', layer: 'wall', price: 320, lvl: 10, draw(g) { g.rect(1, 1, 28, 18, 'g'); g.hl(1, 1, 28, 'f'); g.vl(0, 0, 20, 'b'); g.vl(29, 0, 20, 'b'); g.ellipse(9, 8, 5, 3.5, 'h'); g.ellipse(20, 12, 6, 3, 'h'); g.ellipse(22, 6, 3, 2, 'h'); g.pts([[7, 7], [10, 9], [19, 12], [22, 11]], 'c'); for (let x = 4; x < 26; x += 2) g.px(x, 15 - Math.round(Math.sin(x / 3) * 2), 'r'); g.pts([[25, 3], [24, 4], [26, 4], [25, 5], [25, 2]], 'q'); g.px(25, 4, 'c'); } },
    m_old_trunk: { n: '復古皮箱', w: 26, h: 17, cat: 'furniture', layer: 'floor', price: 340, lvl: 9, surface: { x0: 2, x1: 23, y: 2 }, draw(g) { g.rect(1, 2, 24, 14, 'L'); g.rect(1, 2, 24, 4, 'M'); g.hl(1, 2, 24, 'N'); g.hl(1, 6, 24, 'a'); for (const x of [5, 20]) g.vl(x, 2, 14, 'b'); g.rect(11, 5, 4, 3, 'w'); g.px(12, 6, 'u'); g.hl(1, 15, 24, 'a'); g.pts([[1, 2], [24, 2], [1, 15], [24, 15]], 'v'); } },
  },
  fluff: {
    m_cat_condo: { n: '貓咪別墅', w: 24, h: 42, cat: 'furniture', layer: 'floor', price: 480, lvl: 12, petSpot: { x: 12, y: 3 }, draw(g) { g.rect(2, 38, 20, 4, 'h'); g.hl(2, 38, 20, 'g'); g.rect(10, 12, 4, 26, 'g'); for (let y = 13; y < 38; y += 2) g.hl(10, y, 4, 'h'); g.rect(3, 24, 12, 10, 's'); g.hl(3, 24, 12, 't'); g.ellipse(9, 30, 3, 3, 'q'); g.rect(1, 9, 22, 4, 's'); g.hl(1, 9, 22, 't'); g.hl(1, 12, 22, 'r'); g.rect(13, 19, 10, 3, 's'); g.hl(13, 19, 10, 't'); g.pts([[19, 22], [19, 23], [19, 24]], 'w'); g.ellipse(19, 25.5, 1.4, 1.4, 'r'); g.ellipse(12, 6, 7, 3.5, 't'); g.ellipse(12, 7, 5, 2, 'B'); } },
    m_round_bed: { n: '甜甜圈寵物窩', w: 24, h: 12, cat: 'furniture', layer: 'floor', price: 200, lvl: 4, petSpot: { x: 12, y: 6 }, draw(g) { g.ellipse(12, 6.5, 11.5, 5, 'r'); g.ellipse(12, 5.5, 10.5, 4, 's'); g.ellipse(12, 6.5, 7, 2.6, 't'); g.ellipse(12, 7, 6, 2, 'f'); for (let i = 0; i < 8; i++) g.px(3 + i * 2.6 | 0, 3 + (i % 2), 'Z'); } },
    m_dog_house: { n: '紅屋頂狗屋', w: 28, h: 26, cat: 'furniture', layer: 'floor', price: 380, lvl: 9, petSpot: { x: 14, y: 20 }, draw(g) { g.rect(3, 10, 22, 15, 'd'); for (let y = 12; y < 25; y += 3) g.hl(3, y, 22, 'c'); for (let i = 0; i < 12; i++) { g.hl(13 - i, i, 2 + i * 2, i < 2 ? 'r' : 'q'); g.px(13 - i, i, 'r'); g.px(14 + i, i, 'q'); } g.hl(0, 11, 28, 'q'); g.ellipse(14, 20, 5, 5, 'Y'); g.rect(9, 20, 11, 5, 'Y'); g.rect(10, 6, 8, 3, 'f'); g.pts([[11, 7], [13, 7], [14, 7], [16, 7]], 'b'); } },
    m_scratch_post: { n: '劍麻貓抓柱', w: 12, h: 24, cat: 'furniture', layer: 'floor', price: 160, lvl: 3, draw(g) { g.rect(1, 20, 10, 4, 'b'); g.hl(1, 20, 10, 'c'); g.rect(4, 5, 4, 15, 'h'); for (let y = 6; y < 20; y += 2) g.hl(4, y, 4, 'g'); g.rect(1, 2, 10, 3, 'b'); g.hl(1, 2, 10, 'c'); g.vl(9, 5, 5, 'w'); g.ellipse(9, 11, 1.5, 1.5, 's'); } },
    m_paw_rug: { n: '肉球地毯', w: 34, h: 20, cat: 'rug', layer: 'rug', price: 220, lvl: 5, draw(g) { g.ellipse(17, 13, 11, 6.5, 's'); g.ellipse(17, 13, 9.5, 5.2, 't'); for (const [x, y] of [[5, 5], [12, 2.5], [22, 2.5], [29, 5]]) { g.ellipse(x, y + 1, 3.4, 2.4, 's'); g.ellipse(x, y + 0.6, 2.4, 1.5, 't'); } for (let i = 0; i < 6; i++) g.px(11 + i * 2, 14 + (i % 2), 'Z'); } },
    m_pet_portrait: { n: '毛孩肖像畫', w: 18, h: 22, cat: 'wall', layer: 'wall', price: 260, lvl: 7, draw(g) { g.rect(0, 0, 18, 22, 'v'); g.rect(1, 1, 16, 20, 'u'); g.rect(2, 2, 14, 18, 'p'); g.rect(2, 14, 14, 6, 'o'); g.ellipse(9, 12, 4.5, 4, 'v'); g.pts([[5, 7], [5, 8], [6, 8], [13, 7], [13, 8], [12, 8]], 'v'); g.hl(6, 9, 6, 'w'); g.pts([[7, 11], [11, 11]], 'Y'); g.px(9, 13, 's'); g.ellipse(9, 17, 4, 2.4, 'v'); g.hl(6, 15, 6, 'r'); g.px(9, 16, 'w'); g.pts([[3, 3], [15, 3]], 'x'); } },
  },
  star: {
    m_telescope: { n: '黃銅天文望遠鏡', w: 22, h: 32, cat: 'furniture', layer: 'floor', price: 520, lvl: 13, draw(g) { g.pts([[11, 18], [10, 20], [9, 22], [8, 24], [7, 26], [6, 28], [5, 30]], 'b'); g.pts([[11, 18], [12, 20], [13, 22], [14, 24], [15, 26], [16, 28], [17, 30]], 'b'); g.vl(11, 18, 13, 'a'); for (let i = 0; i < 15; i++) { const x = 2 + i, y = 16 - Math.round(i * 0.75); g.px(x, y, 'v'); g.px(x, y + 1, 'u'); g.px(x, y - 1, 'w'); } g.ellipse(17.5, 4.5, 2.6, 2.6, 'u'); g.ellipse(17.5, 4.5, 1.4, 1.4, ';'); g.rect(9, 15, 4, 3, 'a'); g.pts([[19, 0], [21, 2], [20, 8]], 'X'); } },
    m_moon_lamp: { n: '月球燈', w: 14, h: 16, cat: 'decor', layer: 'decor', price: 280, lvl: 8, light: L(7, 6, 30, 'cool', 0.8), toggle: true, draw(g) { g.rect(4, 13, 6, 3, 'b'); g.hl(4, 13, 6, 'c'); g.ellipse(7, 6.5, 6, 6, 'x'); g.ellipse(8, 7, 5, 5, 'W'); for (const [x, y, r] of [[5, 4, 1.4], [9, 8, 1.8], [5, 9, 1], [10, 4, 0.8]]) g.ellipse(x, y, r, r, 'w'); } },
    m_crystal_ball: { n: '占卜水晶球', w: 12, h: 14, cat: 'decor', layer: 'decor', price: 240, lvl: 7, light: L(6, 5, 18, 'cool', 0.5), draw(g) { g.rect(2, 11, 8, 3, 'F'); g.hl(2, 11, 8, 'G'); g.hl(3, 13, 6, 'v'); g.ellipse(6, 6, 5, 5, 'H'); g.ellipse(6, 6.5, 4, 4, 'G'); g.ellipse(4.5, 4.5, 1.4, 1.4, ':'); g.pts([[7, 7], [8, 6], [6, 8]], 'B'); } },
    m_star_mobile: { n: '星星吊飾', w: 22, h: 22, cat: 'wall', layer: 'wall', price: 200, lvl: 5, draw(g) { g.hl(2, 2, 18, 'c'); g.px(11, 0, 'c'); g.px(11, 1, 'c'); const star = (x, y, c) => g.pts([[x, y - 1], [x - 1, y], [x, y], [x + 1, y], [x, y + 1]], c); for (const [x, len, c] of [[3, 10, 'w'], [8, 15, 'x'], [14, 8, 'B'], [19, 13, 'w']]) { g.vl(x, 3, len, 'h'); star(x, 4 + len, c); } g.ellipse(11, 12, 2.2, 2.2, 'x'); g.ellipse(12, 11.5, 1.6, 1.6, '.'); g.vl(11, 3, 7, 'h'); } },
    m_zodiac_rug: { n: '星座地毯', w: 40, h: 20, cat: 'rug', layer: 'rug', price: 300, lvl: 10, draw(g) { g.ellipse(20, 10, 19.5, 9.5, 'F'); g.ellipse(20, 10, 18, 8.2, 'm'); const pts = [[8, 8], [12, 6], [16, 9], [21, 7], [25, 11], [30, 9], [33, 12]]; for (let i = 0; i < pts.length - 1; i++) { const [a, b] = pts[i], [c, d] = pts[i + 1]; for (let t = 0; t <= 1; t += 0.2) g.px(Math.round(a + (c - a) * t), Math.round(b + (d - b) * t), 'G'); } for (const [x, y] of pts) g.px(x, y, 'x'); for (const [x, y] of [[6, 13], [14, 14], [27, 4], [35, 8], [19, 15]]) g.px(x, y, 'B'); } },
    m_nebula_poster: { n: '星雲海報', w: 16, h: 22, cat: 'wall', layer: 'wall', price: 180, lvl: 4, draw(g) { g.rect(0, 0, 16, 22, 'Y'); g.ellipse(8, 10, 6, 4, 'F'); g.ellipse(9, 10, 4, 2.5, 'G'); g.ellipse(7, 9, 2, 1.2, 's'); g.ellipse(10, 12, 1.6, 1, 'K'); for (const [x, y] of [[2, 3], [13, 2], [4, 17], [12, 18], [14, 7], [1, 12]]) g.px(x, y, 'Z'); g.hl(3, 19, 10, 'z'); } },
  },
  cocoa: {
    m_cake_stand: { n: '三層點心架', w: 16, h: 20, cat: 'decor', layer: 'decor', price: 240, lvl: 7, draw(g) { g.vl(8, 1, 18, 'v'); g.px(8, 0, 'w'); for (const [y, w] of [[5, 8], [11, 11], [17, 14]]) { g.hl(8 - w / 2 | 0, y, w, 'Z'); g.hl((8 - w / 2 | 0) + 1, y + 1, w - 2, 'B'); } for (const [x, y, c] of [[6, 4, 's'], [9, 4, 'k'], [4, 10, 'w'], [7, 10, 'r'], [11, 10, 'c'], [3, 16, 'H'], [6, 16, 's'], [10, 16, 'k'], [13, 16, 'w']]) { g.px(x, y, c); g.px(x + 1, y, c); g.px(x, y - 1, 'f'); } } },
    m_candy_jar: { n: '彩虹糖果罐', w: 12, h: 16, cat: 'decor', layer: 'decor', price: 160, lvl: 3, draw(g) { g.rect(3, 0, 6, 2, 'r'); g.hl(3, 0, 6, 's'); g.rect(1, 3, 10, 12, ','); g.hl(2, 2, 8, ':'); for (let i = 0; i < 18; i++) { const x = 2 + (i * 5) % 8, y = 7 + Math.floor(i / 3) % 7; g.px(x, y, ['r', 'w', 'k', 'o', 'H', 's'][i % 6]); } g.hl(1, 14, 10, 'A'); g.vl(2, 4, 4, ':'); } },
    m_macaron_tower: { n: '馬卡龍塔', w: 14, h: 20, cat: 'decor', layer: 'decor', price: 220, lvl: 6, draw(g) { g.rect(3, 18, 8, 2, 'Z'); const cols = ['s', 'k', 'w', 'H', 'o', 'r']; let i = 0; for (let row = 0; row < 5; row++) { const n = 5 - row, y = 16 - row * 3; for (let k = 0; k < n; k++) { const x = 7 - n + k * 2 + 1; const c = cols[i++ % cols.length]; g.hl(x, y, 2, c); g.hl(x, y + 1, 2, 'f'); } } g.px(7, 1, 'r'); g.px(7, 0, 'k'); } },
    m_donut_pouf: { n: '甜甜圈坐墊', w: 20, h: 12, cat: 'furniture', layer: 'floor', price: 180, lvl: 4, petSpot: { x: 10, y: 4 }, draw(g) { g.ellipse(10, 6.5, 9.5, 5, 'c'); g.ellipse(10, 5.5, 8.5, 4, 's'); g.ellipse(10, 6, 3, 1.5, 'b'); for (const [x, y, c] of [[4, 4, 'w'], [7, 3, 'k'], [13, 3, 'o'], [16, 5, 'Z'], [6, 7, 'H'], [14, 8, 'w']]) g.px(x, y, c); } },
    m_icecream_cart: { n: '冰淇淋推車', w: 28, h: 30, cat: 'furniture', layer: 'floor', price: 460, lvl: 12, surface: { x0: 4, x1: 23, y: 12 }, draw(g) { g.rect(3, 13, 22, 11, 'f'); g.hl(3, 13, 22, 'Z'); for (let x = 3; x < 25; x += 4) g.rect(x, 18, 2, 6, 's'); g.ellipse(7, 27, 3, 3, 'Y'); g.ellipse(21, 27, 3, 3, 'Y'); g.px(7, 27, 'A'); g.px(21, 27, 'A'); g.vl(4, 2, 11, 'A'); g.vl(23, 2, 11, 'A'); for (let x = 1; x < 27; x++) g.px(x, 2 + (x % 4 === 0 ? 1 : 0), x % 8 < 4 ? 's' : 'f'); g.hl(1, 1, 26, 'r'); g.hl(0, 3, 28, 'r'); for (const [x, c] of [[9, 'k'], [14, 's'], [19, 'x']]) { g.ellipse(x, 11, 2, 1.6, c); g.px(x, 12, 'c'); } } },
    m_pudding_plush: { n: '布丁玩偶', w: 14, h: 13, cat: 'decor', layer: 'decor', price: 150, lvl: 3, draw(g) { for (let y = 3; y < 12; y++) { const hw = 3 + Math.floor((y - 3) * 0.5); g.hl(7 - hw, y, hw * 2, y < 5 ? 'b' : 'x'); } g.hl(2, 12, 10, 'w'); g.ellipse(7, 3, 3, 1.5, 'b'); g.pts([[5, 7], [9, 7]], 'Y'); g.pts([[6, 9], [7, 9], [8, 9]], 'q'); g.pts([[4, 8], [10, 8]], 's'); g.px(7, 1, 'r'); g.px(8, 0, 'k'); } },
  },
  yarn: {
    m_quilt_rug: { n: '拼布地毯', w: 38, h: 18, cat: 'rug', layer: 'rug', price: 260, lvl: 8, draw(g) { const cols = ['s', 'K', 'w', 'H', 'o', 'N']; for (let y = 0; y < 18; y++) for (let x = 0; x < 38; x++) { const c = cols[(Math.floor(x / 6) + Math.floor(y / 6) * 2) % cols.length]; g.px(x, y, (x % 6 === 0 || y % 6 === 0) ? 'f' : c); } for (let x = 1; x < 38; x += 2) { g.px(x, 0, 'g'); g.px(x, 17, 'g'); } } },
    m_embroidery: { n: '花朵刺繡框', w: 16, h: 16, cat: 'wall', layer: 'wall', price: 140, lvl: 3, draw(g) { g.ellipse(8, 8, 7.5, 7.5, 'c'); g.ellipse(8, 8, 6.3, 6.3, 'f'); g.px(8, 0, 'b'); for (const [x, y, c] of [[6, 6, 'r'], [10, 7, 'H'], [7, 10, 'w']]) { g.pts([[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]], c); g.px(x, y, 'x'); } g.pts([[8, 11], [8, 12], [9, 13], [6, 12], [10, 11]], 'j'); } },
    m_knit_pouf: { n: '粗針織坐墩', w: 18, h: 13, cat: 'furniture', layer: 'floor', price: 200, lvl: 5, petSpot: { x: 9, y: 3 }, draw(g) { g.ellipse(9, 7, 8.5, 5.5, 'J'); g.ellipse(9, 4, 8, 3, 'K'); for (let x = 2; x < 17; x += 3) for (let y = 5; y < 12; y += 2) { if (g.get(x, y) === 'J') g.px(x, y, 'I'); } for (let x = 3; x < 16; x += 3) g.px(x, 3, 'J'); } },
    m_loom: { n: '小織布機', w: 22, h: 26, cat: 'furniture', layer: 'floor', price: 400, lvl: 11, draw(g) { g.vl(2, 2, 23, 'b'); g.vl(19, 2, 23, 'b'); g.hl(1, 2, 20, 'c'); g.hl(1, 22, 20, 'c'); g.hl(2, 6, 18, 'a'); for (let x = 4; x < 18; x += 2) g.vl(x, 7, 9, 'g'); g.rect(4, 12, 14, 6, 'r'); for (let y = 12; y < 18; y++) g.hl(4, y, 14, y % 2 ? 'r' : 's'); g.rect(4, 14, 14, 2, 'w'); g.hl(3, 18, 16, 'a'); g.pts([[0, 25], [1, 24], [20, 24], [21, 25]], 'a'); } },
    m_yarn_hanging: { n: '流蘇毛線壁掛', w: 18, h: 24, cat: 'wall', layer: 'wall', price: 180, lvl: 4, draw(g) { g.hl(0, 1, 18, 'c'); g.pts([[1, 0], [16, 0]], 'b'); for (let x = 1; x < 17; x++) { const len = 12 + Math.round(Math.abs(8.5 - x) < 4 ? 8 - Math.abs(8.5 - x) : 0); for (let y = 2; y < len; y++) g.px(x, y, y < 6 ? 'w' : y < 10 ? 'N' : y < 14 ? 'K' : 'f'); } for (let x = 2; x < 16; x += 3) g.px(x, 5, 'u'); } },
    m_sewing_machine: { n: '復古縫紉機', w: 18, h: 13, cat: 'decor', layer: 'decor', price: 300, lvl: 9, draw(g) { g.rect(1, 10, 16, 3, 'b'); g.hl(1, 10, 16, 'c'); g.rect(2, 1, 12, 4, 'Y'); g.rect(12, 1, 3, 9, 'Y'); g.hl(2, 1, 12, 'y'); g.rect(2, 5, 2, 5, 'Y'); g.px(3, 8, 'A'); g.hl(5, 3, 6, 'w'); g.ellipse(15, 4, 1.5, 2, 'A'); g.pts([[6, 9], [7, 9]], 'r'); } },
  },
};
(function registerMerchantGoods() {
  for (const mk in MERCHANT_GOODS) for (const id in MERCHANT_GOODS[mk]) {
    const M = MERCHANT_GOODS[mk][id]; SPR.def(id, MG(M.w, M.h, M.draw));
    const props = Object.assign({}, M); delete props.draw; delete props.w; delete props.h;
    ITEMS[id] = Object.assign({ id, spr: id, fam: 'merchant', merchant: mk }, props);
  }
  // stall props: a little cart with an awning in the merchant's colour
  SPR.def('m_stall', G(30, 26, g => {
    g.rect(2, 13, 26, 9, 'c'); g.hl(2, 13, 26, 'd'); g.hl(2, 21, 26, 'a'); for (let x = 4; x < 28; x += 6) g.vl(x, 14, 7, 'b');
    g.vl(3, 4, 9, 'b'); g.vl(26, 4, 9, 'b');
    for (let x = 0; x < 30; x++) { g.px(x, 3, x % 6 < 3 ? 'j' : 'f'); g.px(x, 4, x % 6 < 3 ? 'j' : 'f'); if (x % 3 === 1) g.px(x, 5, x % 6 < 3 ? 'j' : 'f'); }
    g.hl(0, 2, 30, 'i');
    for (const [x, c] of [[6, 'r'], [10, 'w'], [15, 'k'], [20, 's'], [24, 'o']]) { g.ellipse(x, 11, 2, 1.6, c); }
    g.ellipse(7, 23.5, 2.4, 2.4, 'Y'); g.ellipse(23, 23.5, 2.4, 2.4, 'Y'); g.px(7, 23, 'A'); g.px(23, 23, 'A');
  }));
})();

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
    if (this.stockLeft(id) <= 0) return UI.toast('這件這週賣完了', 'i_shop');
    if (S.lvl < (d.lvl || 1)) return UI.toast(`需要 Lv ${d.lvl} 才能買`, 'i_star');
    if (S.coins < d.price) return UI.toast(`金幣不夠，還差 ${d.price - S.coins}`, 'i_coin');
    S.coins -= d.price; this.S.bought[id] = (this.S.bought[id] || 0) + 1; S.inv[id] = (S.inv[id] || 0) + 1;
    Life.track('buy', 1, { kind: 'merchant', id });
    UI.toast(`買下了「${d.n}」，收在收納箱裡`, 'i_box', 3.2, { label: '馬上擺放', fn: () => { UI.closeWin('merchant'); Game.place(id); } });
    UI.hud(true); UI.refresh('merchant'); UI.refresh('storage'); Game.save(); saveSoon();
  },
  sell(id, i) {
    const S = Game.S, d = ITEMS[id], M = this.cur(); if (!d || !M.buys[i] || d.fam !== M.buys[i][0]) return;
    if (!(S.inv[id] > 0)) return UI.toast('收納箱裡沒有這件了', 'i_box');
    if (this.soldLeft(i) <= 0) return UI.toast(`這週「${FAM_NAMES[M.buys[i][0]]}」已經收滿 ${MERCHANT_SELL_MAX} 件了`, 'i_shop');
    const c = this.offer(id, i);
    S.inv[id]--; if (!S.inv[id]) delete S.inv[id]; this.S.sold[M.buys[i][0]] = (this.S.sold[M.buys[i][0]] || 0) + 1;
    Game.reward(c, 0, 'raw'); UI.toast(`把「${d.n}」賣給${M.n}，得到 ${c} 金幣`, 'i_coin', 3);
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
    if (!this.S.met) { this.S.met = true; Game.save(); setTimeout(() => UI.toast(`這週的旅行商人「${MERCHANTS[mk].n}」在你家門外擺攤了！點「旅行商人」就能去逛逛`, 'i_merchant', 5.5, { label: '去看看', fn: () => Merchant.go() }), 2500); }
    UI.badges();
  },
  check() { if (this.shown !== this.id()) this.spawn(); },
  // what the button does: a waiting story chapter first, otherwise the stall
  go() { if (this.S.seen && typeof Story !== 'undefined' && Story.pending()) return Story.open(); this.open(); },
  waiting() { return !this.S.seen || (typeof Story !== 'undefined' && Story.pending()); },
  open() { if (!this.S.seen) { this.S.seen = true; Game.save(); UI.badges(); } UI.openWin('merchant'); },
};

// a little market stall: the icon of the "travelling merchant" button
SPR.def('i_merchant', icon(g => {
  const R = palAdd('#e8607a'), C = palAdd('#fff3df'), W = palAdd('#9a6a44'), Wd = palAdd('#6e4a30'), Y = palAdd('#f6c75a');
  for (let x = 1; x < 15; x++) { const c = Math.floor((x - 1) / 2) % 2 ? C : R; g.px(x, 2, c); g.px(x, 3, c); g.px(x, 4, c); }
  for (let x = 1; x < 15; x += 2) g.px(x, 5, Math.floor((x - 1) / 2) % 2 ? C : R);
  g.vl(2, 6, 8, W); g.vl(13, 6, 8, W);
  g.rect(1, 10, 14, 3, W); g.hl(1, 10, 14, Y); g.hl(1, 12, 14, Wd);
  g.rect(5, 7, 2, 3, Y); g.rect(8, 8, 3, 2, R); g.px(9, 7, R);
}));
// the sign: a little A-frame board in the merchant's colours (no longer stands in the room; kept for older references)
SPR.def('m_sign', G(16, 21, g => {
  g.pts([[3, 17], [3, 18], [2, 19], [2, 20], [12, 17], [12, 18], [13, 19], [13, 20]], 'a');
  g.rect(2, 4, 12, 13, 'c'); g.hl(2, 4, 12, 'd'); g.hl(2, 16, 12, 'b'); g.vl(2, 5, 11, 'd'); g.vl(13, 5, 11, 'b');
  g.hl(1, 1, 14, 'i'); for (let x = 1; x < 15; x++) { const c = x % 4 < 2 ? 'j' : 'f'; g.px(x, 2, c); g.px(x, 3, c); }
  g.rect(5, 7, 6, 6, 'f'); g.hl(5, 7, 6, 'Z'); g.hl(5, 12, 6, 'g');
  g.ellipse(8, 10, 2.2, 2.2, 'w'); g.vl(8, 9, 2, 'v'); g.hl(4, 14, 8, 'b');
}));
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
function merchantScene(mk) {
  const W = 168, H = 78, M = MERCHANTS[mk], cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  const env = Room.env || { h: 12, dark: 0 }, night = env.dark > 0.55, dusk = !night && env.h >= 17 && env.h < 19.5;
  const px = (x, y, col) => { c.fillStyle = col; c.fillRect(x, y, 1, 1); }, rect = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const disc = (cx, cy, rx, ry, col) => { c.fillStyle = col; for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry; if (dx * dx + dy * dy <= 1) c.fillRect(x, y, 1, 1); } };
  const hash = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
  // sky in dithered bands
  const sky = night ? ['#1d2148', '#262b5a', '#30366a', '#3c4378', '#4a4f86'] : dusk ? ['#7b6fb0', '#c487a8', '#ec9f8f', '#f7c08f', '#fbe0a8'] : ['#6fb6e6', '#86c6ee', '#9fd4f3', '#b9e2f7', '#d4eefa'];
  for (let y = 0; y < 44; y++) { const t = y / 44 * (sky.length - 1), i = Math.floor(t), f = t - i; for (let x = 0; x < W; x++) px(x, y, sky[Math.min(sky.length - 1, i + (f > ((x + y * 2) % 4) / 4 + .12 ? 1 : 0))]); }
  if (night) { for (let i = 0; i < 40; i++) { const x = (i * 37) % W, y = (i * 23) % 34; px(x, y, i % 5 ? '#c9c4e8' : '#fff7c2'); } disc(146, 11, 6, 6, '#fff3c4'); disc(149, 9, 5, 5, sky[0]); }
  else { disc(146, 11, 9, 9, dusk ? 'rgba(255,214,150,0.35)' : 'rgba(255,250,210,0.35)'); disc(146, 11, 6, 6, dusk ? '#ffd38a' : '#fff6c8'); disc(146, 11, 4, 4, '#fffbe6'); }
  // pixel clouds: soft lumps with a lit top and a shaded belly
  const cloud = (x, y, w) => { const lit = night ? '#5a5f96' : dusk ? '#ffe6cc' : '#ffffff', mid = night ? '#4a4f86' : dusk ? '#f6c7b5' : '#eef7fd', sh = night ? '#3c4378' : dusk ? '#e3a3a3' : '#cfe6f5'; for (let i = 0; i < w; i += 5) disc(x + i, y - (i % 10 ? 1 : 3), 4.5, 3.2, mid); disc(x + w * .4, y - 4, 6, 4, mid); for (let i = 0; i < w; i += 5) disc(x + i, y - (i % 10 ? 2 : 4), 3, 1.6, lit); rect(x - 3, y + 1, w + 5, 2, sh); };
  cloud(14, 12, 26); cloud(70, 20, 18); cloud(118, 30, 14);
  if (!night) for (const [bx, by] of [[96, 9], [102, 6], [107, 10]]) { px(bx - 1, by, '#3b4a63'); px(bx + 1, by, '#3b4a63'); px(bx, by + 1, '#3b4a63'); }
  // far hills, then a row of round trees
  const hill1 = night ? '#3a4f6e' : dusk ? '#9a86b8' : '#9bc3d9', hill2 = night ? '#2f5248' : dusk ? '#7c8f86' : '#7fb88a';
  for (let x = 0; x < W; x++) { const h1 = 8 + Math.round(Math.sin(x / 19) * 3 + Math.sin(x / 7) * 1); rect(x, 44 - h1, 1, h1, hill1); const h2 = 5 + Math.round(Math.sin(x / 13 + 2) * 2); rect(x, 47 - h2, 1, h2 + 2, hill2); }
  const treeC = night ? ['#1f3d33', '#2c5244', '#3b6a55'] : ['#3e7f4a', '#58a35a', '#7fc46c'];
  for (let i = 0; i < 9; i++) { const tx = 56 + i * 13 + (i % 2) * 4, ty = 41 + (i % 3), r = 5 + (i % 2); rect(tx, ty + r - 1, 2, 4, night ? '#3a2b2b' : '#7a5236'); disc(tx + 1, ty, r, r - .5, treeC[0]); disc(tx, ty - 1, r - 1.5, r - 2, treeC[1]); disc(tx - 1, ty - 2, r - 3.2, r - 3.5, treeC[2]); }
  // meadow with flowers
  rect(0, 47, W, 9, night ? '#2f5a45' : '#8fcf74'); for (let x = 0; x < W; x++) if (hash(x, 3) > .55) px(x, 47 + Math.floor(hash(x, 9) * 3), night ? '#3f7058' : '#a9de8a');
  for (let i = 0; i < 26; i++) { const x = 60 + Math.floor(hash(i, 1) * 106), y = 49 + Math.floor(hash(i, 2) * 6); px(x, y, ['#f6a8c0', '#fff1a8', '#ffffff', '#c9b2f2'][i % 4]); px(x, y + 1, night ? '#2a4a3a' : '#5ea055'); }
  // picket fence behind the stall
  for (let x = 58; x < W; x += 6) { rect(x, 45, 3, 10, night ? '#a99fb8' : '#fff4e2'); px(x + 1, 44, night ? '#a99fb8' : '#fff4e2'); rect(x + 2, 46, 1, 9, night ? '#7d748c' : '#e2cfb3'); }
  rect(56, 48, W - 56, 2, night ? '#8f87a0' : '#f3e4cc'); rect(56, 52, W - 56, 1, night ? '#7d748c' : '#e2cfb3');
  // cobblestone lane
  rect(0, 56, W, H - 56, night ? '#5b5468' : '#d9c6a4');
  for (let row = 0; row < 6; row++) for (let x = -(row % 2) * 5; x < W; x += 10) {
    const y = 57 + row * 4, w2 = 7 + Math.floor(hash(x, row) * 3), base = night ? ['#7a7188', '#6e667c'][(x + row) & 1] : ['#efe0c4', '#e6d3b2', '#f4e8d2'][Math.floor(hash(row, x) * 3)];
    rect(x + 1, y, w2, 3, base); rect(x + 2, y - 1 + 1, w2 - 2, 1, night ? '#8a829a' : '#fbf3e4'); rect(x + 1, y + 3, w2, 1, night ? '#4a4456' : '#bfa985');
  }
  rect(0, 56, W, 1, night ? '#4a4456' : '#c4ae8a');
  // your house: shingle roof edge, plank wall, window with a flower box, door with a wreath, lantern, potted plant
  const wall = night ? ['#7a5a4c', '#6a4c40', '#5a4036'] : ['#e8c39a', '#d9ae84', '#c79a70'];
  rect(0, 6, 50, 52, wall[0]); for (let y = 9; y < 58; y += 4) { rect(0, y, 50, 1, wall[2]); for (let x = (y % 8 ? 6 : 16); x < 50; x += 22) px(x, y + 1, wall[1]); }
  rect(50, 6, 2, 52, wall[2]);
  for (let x = -2; x < 56; x += 4) { rect(x, 0, 4, 4, night ? '#6b3a3a' : '#c4604c'); rect(x, 3, 4, 1, night ? '#4e2a2a' : '#8f4230'); px(x + 1, 0, night ? '#84504a' : '#e58a6e'); }
  rect(0, 4, 54, 3, night ? '#4e2a2a' : '#8f4230');
  // window
  rect(30, 17, 16, 14, '#fff4e2'); rect(31, 18, 14, 12, night ? '#ffd27a' : '#bfe3f5'); rect(37, 18, 2, 12, '#fff4e2'); rect(31, 23, 14, 2, '#fff4e2');
  if (!night) { px(33, 19, '#ffffff'); px(34, 19, '#ffffff'); px(33, 20, '#ffffff'); } rect(31, 18, 3, 12, night ? '#e9a14f' : '#f5a8b6'); rect(42, 18, 3, 12, night ? '#e9a14f' : '#f5a8b6');
  rect(29, 31, 18, 4, '#9b6a44'); rect(29, 31, 18, 1, '#c48a5a'); for (let x = 30; x < 46; x += 2) { px(x, 30, ['#f06478', '#ffd36a', '#ffffff', '#c9b2f2'][(x / 2) % 4]); px(x + 1, 30, '#5ea055'); }
  // door
  rect(9, 26, 16, 31, '#6b4130'); rect(10, 27, 14, 30, '#9b6038'); rect(12, 29, 4, 11, '#b5794b'); rect(18, 29, 4, 11, '#b5794b'); rect(12, 43, 4, 11, '#b5794b'); rect(18, 43, 4, 11, '#b5794b');
  rect(21, 41, 2, 2, '#f6c75a'); disc(17, 23, 4, 4, '#4f9a45'); disc(17, 23, 2, 2, wall[0]); px(17, 19, '#f06478'); px(14, 21, '#f06478'); px(20, 21, '#f06478');
  rect(6, 57, 22, 2, '#a85060'); rect(7, 57, 20, 1, '#c86a78');
  // lantern
  rect(27, 30, 1, 3, '#4b4560'); rect(26, 33, 3, 4, night ? '#ffe07a' : '#fff4c4'); rect(26, 33, 3, 1, '#4b4560'); rect(26, 37, 3, 1, '#4b4560');
  // potted plant by the door
  rect(1, 51, 7, 6, '#c46a48'); rect(1, 51, 7, 1, '#e59a72'); disc(4.5, 47, 4, 4, '#4f9a45'); disc(3.5, 46, 2.4, 2.4, '#7fc46c');
  // the stall and the merchant, at the same pixel size as the room
  const map = M.awn === 'green' ? null : rampMap('green', M.awn), st = SPR.get('m_stall', map, false, 'stall_' + M.awn), ava = avatarCanvas('front0', sanitizeAvatar(Object.assign(defaultAvatar(), M.look)), null, 0, false);
  const sx = 96, sBase = 71, ax = 86, aBase = 72;
  c.fillStyle = 'rgba(46,34,48,0.25)'; c.fillRect(sx + 2, sBase - 1, st.width - 4, 2); c.fillRect(ax - 6, aBase - 1, 12, 2);
  c.drawImage(st, sx, sBase - st.height + 1);
  c.drawImage(ava, ax - 10, aBase - canvasBottom(ava));
  if (night) { const g = c.createRadialGradient(111, 56, 2, 111, 56, 30); g.addColorStop(0, 'rgba(255,224,122,0.22)'); g.addColorStop(1, 'rgba(255,224,122,0)'); c.fillStyle = g; c.fillRect(80, 26, 62, 52); }
  const S = 3, big = document.createElement('canvas'); big.width = W * S; big.height = H * S; big.className = 'mscene';
  const bc = big.getContext('2d'); bc.imageSmoothingEnabled = false; bc.drawImage(cv, 0, 0, W * S, H * S);
  return big;
}

/* ---------------- window ---------------- */
UI.WIN.merchant = { t: '旅行商人', i: 'i_shop', w: 560, at: ['c', 0] };
Object.assign(UI, {
  merchTab: 'sell',
  w_merchant() {
    const S = Game.S, mk = Merchant.id(), M = MERCHANTS[mk], ws = weekStart(), we = weekEnd();
    const fmt = (d) => `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const head = h('div', { class: 'mstage' }, merchantScene(mk),
      h('div', { class: 'msay' }, h('div', { class: 'mname' }, h('b', { text: M.n }), h('span', { class: 'ptag', text: M.tag })), h('p', { text: `「${M.hi}」` })));
    const when = h('p', { class: 'hint', text: `在你家門外擺攤：${fmt(ws)} 到 ${fmt(we)}，之後換下一位商人。「旅行商人」按鈕隨時都能打開這裡。` });
    const tabs = h('div', { class: 'tabs' }, h('button', { class: 'tab' + (this.merchTab === 'sell' ? ' on' : ''), onclick: () => { this.merchTab = 'sell'; this.refresh('merchant'); } }, '他在賣'), h('button', { class: 'tab' + (this.merchTab === 'buy' ? ' on' : ''), onclick: () => { this.merchTab = 'buy'; this.refresh('merchant'); } }, '他想收購'));
    const wallet = h('span', { class: 'wallet' }, ico('i_coin', 20), h('b', { class: 'num', text: String(S.coins) }));
    const body = [];
    if (this.merchTab === 'sell') {
      body.push(h('p', { class: 'hint', text: `只有${M.n}才有的東西，每件這週最多買 ${MERCHANT_STOCK} 件。旅行商人不收折價券。` }));
      body.push(h('div', { class: 'scroll grid' }, ...Merchant.goods(mk).map(id => {
        const d = ITEMS[id], left = Merchant.stockLeft(id), locked = S.lvl < d.lvl, own = (S.inv[id] || 0) + S.items.filter(i => i.k === id).length;
        return h('div', { class: 'card' + (locked ? ' locked' : '') }, h('div', { class: 'pvbox' }, sprPreview(SPR.get(id), 100, 3)), h('div', { class: 'cn', text: d.n }),
          h('p', { class: 'cdesc', text: left > 0 ? `這週還有 ${left} 件` + (own ? `（你有 ${own} 件）` : '') : '這週賣完了' }),
          h('div', { class: 'cfoot' }, locked ? h('span', { class: 'lock', text: `Lv ${d.lvl} 解鎖` }) : h('span', { class: 'price' }, ico('i_coin', 18), h('b', { class: 'num', text: String(d.price) })),
            h('button', { class: 'chip sm', disabled: locked || left <= 0 || S.coins < d.price, onclick: () => Merchant.buy(id) }, '購買')));
      })));
    } else {
      body.push(h('p', { class: 'hint', text: `只收收納箱裡的東西（擺在房間裡的不會被賣掉）。每一類這週最多收 ${MERCHANT_SELL_MAX} 件，價格是原價的 4～6 成，每週不一樣。` }));
      M.buys.forEach(([fam], i) => {
        const list = Merchant.sellable(i), left = Merchant.soldLeft(i);
        body.push(h('div', { class: 'sub', text: `${FAM_NAMES[fam] || fam}：原價 ${Math.round(Merchant.rate(i) * 100)}%，這週還收 ${left} 件` }));
        if (!list.length) { body.push(h('p', { class: 'hint', text: '收納箱裡沒有這類東西。' })); return; }
        body.push(h('div', { class: 'mlist2' }, ...list.slice(0, 30).map(id => h('div', { class: 'mrow' }, sprPreview(SPR.get(ITEMS[id].spr, ITEMS[id].map, false, id), 40, 2),
          h('span', { class: 'grow', text: `${ITEMS[id].n}  ×${S.inv[id]}` }), h('span', { class: 'price' }, ico('i_coin', 16), h('b', { class: 'num', text: String(Merchant.offer(id, i)) })),
          h('button', { class: 'chip sm', disabled: left <= 0, onclick: () => Merchant.sell(id, i) }, '賣 1 件')))));
      });
    }
    return [head, when, h('div', { class: 'row between' }, tabs, wallet), ...body];
  },
});
