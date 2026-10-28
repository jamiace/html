/* ============================================================
   Catalog：物品、壁紙、地板、窗景、寵物、主題房間
   ------------------------------------------------------------
   ITEMS 每一筆的欄位：
     n        名稱
     cat      商店分類（furniture 家具 / decor 小物 / plant 植物 / wall 牆面 / rug 地毯）
     spr      像素圖名稱（assets/sprites/<spr>.png）
     map      換色表（例如 rampMap('blue','pink') 把藍色系換成粉紅系），可省略
     price    價格（金幣）    lvl  解鎖等級
     layer    floor 放地板 / wall 掛牆上 / rug 地毯（畫在最底層）/ decor 小物（可以放到有 surface 的家具上）
     surface  {x0,x1,y} 這件家具可以放小物的檯面（相對於圖片左上角的像素座標）
     light    {x,y,r,col,k} 光源位置、半徑、顏色（warm/cool/pink）、強度
     onSpr    開燈時使用的圖     toggle  點擊可以開關
     seat     {x,y} 角色可以坐的位置      chair  書桌椅（專注時角色坐這裡）
     bed      {x,y,blanketY} 枕頭位置與被子從第幾列開始蓋住角色
     petSpot  {x,y} 寵物喜歡待的位置     desk  書桌
     window   {x,y,w,h,round} 窗外景色的範圍
     react    點擊反應：rustle 樹葉 / notes 音符 / hearts 愛心 / bubbles 泡泡 / time 報時 / date 日期 / spin
     music    播放音樂時冒出音符
     comfort  舒適度（省略時依價格計算）  bowl 寵物碗  special 成就獎勵，不在商店販售
   房間座標：後牆 x 30–210、y 12–96；地板 y 96–170（越往下越靠近畫面）。
   ============================================================ */
const CATS = [
  { id: 'theme', n: I18n.s("u_6beb2bdbe801") }, { id: 'supply', n: I18n.s("u_7483f8ec95d8") }, { id: 'furniture', n: I18n.s("u_62bd927cebc0") }, { id: 'decor', n: I18n.s("u_845476b9e802") }, { id: 'plant', n: I18n.s("u_a745bfdf3005") }, { id: 'wall', n: I18n.s("u_e1527cb05a29") },
  { id: 'rug', n: I18n.s("u_fa737aa9a03c") }, { id: 'wallpaper', n: I18n.s("u_524746976904") }, { id: 'floor', n: I18n.s("u_59a6a585ba18") }, { id: 'view', n: I18n.s("u_5f0d94f3ff27") }, { id: 'pet', n: I18n.s("u_5b825353b534") },
];
const L = (x, y, r, col = 'warm', k = 1) => ({ x, y, r, col, k });
const ITEMS = {
  // ---- furniture
  desk: { n: I18n.s("u_cb309385cf0c"), cat: 'furniture', spr: 'desk', price: 80, lvl: 1, layer: 'floor', surface: { x0: 3, x1: 38, y: 4 }, desk: true },
  desk_white: { n: I18n.s("u_4dfc514878cd"), cat: 'furniture', spr: 'desk_white', price: 140, lvl: 3, layer: 'floor', surface: { x0: 3, x1: 38, y: 4 }, desk: true },
  chair: { n: I18n.s("u_ead1ef0a5c1a"), cat: 'furniture', spr: 'chair', price: 40, lvl: 1, layer: 'floor', chair: true },
  chair_rose: { n: I18n.s("u_9a1e47b0c905"), cat: 'furniture', spr: 'chair', map: rampMap('blue', 'pink'), price: 60, lvl: 2, layer: 'floor', chair: true },
  bed: { n: I18n.s("u_13fec8032742"), cat: 'furniture', spr: 'bed', price: 120, lvl: 1, layer: 'floor', bed: { x: 14, y: 11 } },
  bed_pink: { n: I18n.s("u_ec9d37e19530"), cat: 'furniture', spr: 'bed', map: rampMap('blue', 'pink'), price: 160, lvl: 2, layer: 'floor', bed: { x: 14, y: 11 } },
  bed_mint: { n: I18n.s("u_e1025b994258"), cat: 'furniture', spr: 'bed', map: rampMap('blue', 'green'), price: 160, lvl: 4, layer: 'floor', bed: { x: 14, y: 11 } },
  bed_lilac: { n: I18n.s("u_9a7020040e51"), cat: 'furniture', spr: 'bed', map: rampMap('blue', 'lilac'), price: 180, lvl: 6, layer: 'floor', bed: { x: 14, y: 11 } },
  bookshelf: { n: I18n.s("u_73b38cffc32d"), cat: 'furniture', spr: 'bookshelf', price: 180, lvl: 2, layer: 'floor', surface: { x0: 2, x1: 25, y: 1 } },
  wardrobe: { n: I18n.s("u_ae8d53623ff2"), cat: 'furniture', spr: 'wardrobe', price: 220, lvl: 5, layer: 'floor', surface: { x0: 2, x1: 33, y: 1 } },
  nightstand: { n: I18n.s("u_7af969357621"), cat: 'furniture', spr: 'nightstand', price: 60, lvl: 1, layer: 'floor', surface: { x0: 2, x1: 17, y: 2 } },
  cabinet_low: { n: I18n.s("u_efbf45d50642"), cat: 'furniture', spr: 'cabinet_low', price: 120, lvl: 3, layer: 'floor', surface: { x0: 2, x1: 39, y: 2 } },
  sofa: { n: I18n.s("u_0deb8ec999fb"), cat: 'furniture', spr: 'sofa', price: 260, lvl: 4, layer: 'floor', seat: { x: 27, y: 19 } },
  sofa_pink: { n: I18n.s("u_8a03010bce7c"), cat: 'furniture', spr: 'sofa', map: Object.assign(rampMap('blue', 'pink'), { s: 'w', t: 'x', r: 'v' }), price: 280, lvl: 6, layer: 'floor', seat: { x: 27, y: 19 } },
  sofa_mint: { n: I18n.s("u_5b5d73ddd8d2"), cat: 'furniture', spr: 'sofa', map: rampMap('blue', 'green'), price: 280, lvl: 7, layer: 'floor', seat: { x: 27, y: 19 } },
  beanbag: { n: I18n.s("u_740039f05697"), cat: 'furniture', spr: 'beanbag', price: 90, lvl: 2, layer: 'floor', seat: { x: 12, y: 12 }, petSpot: { x: 12, y: 8 } },
  beanbag_sun: { n: I18n.s("u_5e522dc2576d"), cat: 'furniture', spr: 'beanbag', map: rampMap('pink', 'sun'), price: 90, lvl: 3, layer: 'floor', seat: { x: 12, y: 12 }, petSpot: { x: 12, y: 8 } },
  cushion: { n: I18n.s("u_18b91284a68b"), cat: 'furniture', spr: 'cushion', price: 40, lvl: 1, layer: 'floor', petSpot: { x: 11, y: 5 } },
  cat_tree: { n: I18n.s("u_8761bb920300"), cat: 'furniture', spr: 'cat_tree', price: 160, lvl: 3, layer: 'floor', petSpot: { x: 13, y: 9 }, petSteps: [{ x: 19, y: 27 }, { x: 13, y: 9 }] },
  lamp_floor: { n: I18n.s("u_05bb35824afa"), cat: 'furniture', spr: 'lamp_floor', onSpr: 'lamp_floor_on', price: 100, lvl: 1, layer: 'floor', light: L(8, 8, 46), toggle: true },
  guitar: { n: I18n.s("u_ecc9b366bd2f"), cat: 'furniture', spr: 'guitar', price: 140, lvl: 5, layer: 'floor', react: 'notes' },
  // ---- plants
  plant_monstera: { n: I18n.s("u_8eff6c7f56aa"), cat: 'plant', spr: 'plant_monstera', price: 120, lvl: 2, layer: 'floor', react: 'rustle' },
  plant_snake: { n: I18n.s("u_15ccd571c837"), cat: 'plant', spr: 'plant_snake', price: 80, lvl: 1, layer: 'floor', react: 'rustle' },
  plant_fern: { n: I18n.s("u_3b4bfe6ac16e"), cat: 'plant', spr: 'plant_fern', price: 50, lvl: 1, layer: 'decor', react: 'rustle' },
  plant_succulent: { n: I18n.s("u_c86caa551120"), cat: 'plant', spr: 'plant_succulent', price: 30, lvl: 1, layer: 'decor', react: 'rustle' },
  cactus: { n: I18n.s("u_c576edfb8ff5"), cat: 'plant', spr: 'cactus', price: 30, lvl: 1, layer: 'decor', react: 'rustle' },
  plant_hanging: { n: I18n.s("u_d4bd72dc679e"), cat: 'plant', spr: 'plant_hanging', price: 90, lvl: 3, layer: 'wall', react: 'rustle' },
  // ---- rugs
  rug_round: { n: I18n.s("u_528b204636b8"), cat: 'rug', spr: 'rug_round', price: 80, lvl: 1, layer: 'rug', petSpot: { x: 29, y: 11 } },
  rug_round_pink: { n: I18n.s("u_9662b1b51684"), cat: 'rug', spr: 'rug_round', map: rampMap('blue', 'pink'), price: 80, lvl: 2, layer: 'rug', petSpot: { x: 29, y: 11 } },
  rug_round_sage: { n: I18n.s("u_d9a7d31b9e97"), cat: 'rug', spr: 'rug_round', map: rampMap('blue', 'green'), price: 80, lvl: 3, layer: 'rug', petSpot: { x: 29, y: 11 } },
  rug_rect: { n: I18n.s("u_dc1fbffc2e46"), cat: 'rug', spr: 'rug_rect', price: 120, lvl: 3, layer: 'rug', petSpot: { x: 31, y: 12 } },
  rug_runner: { n: I18n.s("u_2cddc96006c7"), cat: 'rug', spr: 'rug_runner', price: 40, lvl: 1, layer: 'rug' },
  // ---- wall
  window: { n: I18n.s("u_9750e3c16e1d"), cat: 'wall', spr: 'window', price: 100, lvl: 1, layer: 'wall', window: { x: 6, y: 7, w: 28, h: 28 }, curtains: 'pink' },
  window_blue: { n: I18n.s("u_8c142f448ed7"), cat: 'wall', spr: 'window', price: 100, lvl: 2, layer: 'wall', window: { x: 6, y: 7, w: 28, h: 28 }, curtains: 'blue' },
  window_sage: { n: I18n.s("u_197b8813dbd8"), cat: 'wall', spr: 'window', price: 100, lvl: 4, layer: 'wall', window: { x: 6, y: 7, w: 28, h: 28 }, curtains: 'green' },
  clock: { n: I18n.s("u_52090cb27f92"), cat: 'wall', spr: 'clock', price: 50, lvl: 1, layer: 'wall', clock: true, react: 'time' },
  shelf_wall: { n: I18n.s("u_a43ec532934c"), cat: 'wall', spr: 'shelf_wall', price: 60, lvl: 1, layer: 'wall', surface: { x0: 2, x1: 31, y: 2 } },
  painting: { n: I18n.s("u_67c644fb4a7c"), cat: 'wall', spr: 'painting', price: 90, lvl: 2, layer: 'wall' },
  poster: { n: I18n.s("u_936ccf1cecde"), cat: 'wall', spr: 'poster', price: 40, lvl: 1, layer: 'wall' },
  corkboard: { n: I18n.s("u_225f3a33d21a"), cat: 'wall', spr: 'corkboard', price: 70, lvl: 2, layer: 'wall' },
  calendar: { n: I18n.s("u_e790fcb522cb"), cat: 'wall', spr: 'calendar', price: 30, lvl: 1, layer: 'wall', calendar: true, react: 'date' },
  string_lights: { n: I18n.s("u_fda51b68da4d"), cat: 'wall', spr: 'string_lights', onSpr: 'string_lights_on', price: 110, lvl: 2, layer: 'wall', light: L(32, 7, 50, 'warm', 0.8), toggle: true, twinkle: true },
  moon_lamp: { n: I18n.s("u_51fa649f1d55"), cat: 'wall', spr: 'moon_lamp', onSpr: 'moon_lamp_on', price: 90, lvl: 3, layer: 'wall', light: L(8, 8, 34, 'warm', 0.8), toggle: true },
  mirror: { n: I18n.s("u_01ea04112c97"), cat: 'wall', spr: 'mirror', price: 80, lvl: 2, layer: 'wall' },
  garland: { n: I18n.s("u_37031be1694d"), cat: 'wall', spr: 'garland', price: 50, lvl: 1, layer: 'wall' },
  neon_heart: { n: I18n.s("u_5b652b4b185e"), cat: 'wall', spr: 'neon_heart', price: 150, lvl: 6, layer: 'wall', light: L(8, 7, 30, 'pink', 0.9), toggle: true, on: true },
  // ---- decor
  laptop: { n: I18n.s("u_399b47da0fcf"), cat: 'decor', spr: 'laptop', price: 120, lvl: 1, layer: 'decor', light: L(9, 4, 16, 'cool', 0.5), screen: true },
  monitor: { n: I18n.s("u_ce00f0b4d1ee"), cat: 'decor', spr: 'monitor', price: 180, lvl: 4, layer: 'decor', light: L(12, 7, 22, 'cool', 0.55), screen: true },
  desk_lamp: { n: I18n.s("u_54a086da97b4"), cat: 'decor', spr: 'desk_lamp', price: 70, lvl: 1, layer: 'decor', light: L(10, 6, 34), toggle: true },
  mug: { n: I18n.s("u_ff403c3a4869"), cat: 'decor', spr: 'mug', price: 20, lvl: 1, layer: 'decor', steam: true },
  teapot: { n: I18n.s("u_dd9f155e1573"), cat: 'decor', spr: 'teapot', price: 35, lvl: 2, layer: 'decor', steam: true },
  books_stack: { n: I18n.s("u_8e5f30d601fc"), cat: 'decor', spr: 'books_stack', price: 25, lvl: 1, layer: 'decor' },
  record_player: { n: I18n.s("u_d3fbaed10222"), cat: 'decor', spr: 'record_player', price: 160, lvl: 4, layer: 'decor', react: 'notes', spin: true, music: true },
  candle: { n: I18n.s("u_116bbc745eec"), cat: 'decor', spr: 'candle', price: 25, lvl: 1, layer: 'decor', light: L(3, 2, 22, 'warm', 0.8), toggle: true, flicker: true },
  fishbowl: { n: I18n.s("u_dca1a22afa47"), cat: 'decor', spr: 'fishbowl', price: 80, lvl: 3, layer: 'decor', fish: true, react: 'bubbles' },
  photo_frame: { n: I18n.s("u_9facd3750ac5"), cat: 'decor', spr: 'photo_frame', price: 30, lvl: 1, layer: 'decor' },
  globe: { n: I18n.s("u_6440abb6cc5f"), cat: 'decor', spr: 'globe', price: 60, lvl: 2, layer: 'decor', react: 'spin' },
  alarm_clock: { n: I18n.s("u_60143d60a9d5"), cat: 'decor', spr: 'alarm_clock', price: 30, lvl: 1, layer: 'decor', react: 'time' },
  plush_bear: { n: I18n.s("u_ae0b34cdc437"), cat: 'decor', spr: 'plush_bear', price: 50, lvl: 2, layer: 'decor', react: 'hearts' },
  headphones: { n: I18n.s("u_803f6873d372"), cat: 'decor', spr: 'headphones', price: 40, lvl: 2, layer: 'decor', react: 'notes', music: true },
  tv_retro: { n: I18n.s("u_8213fd1a52c9"), cat: 'decor', spr: 'tv_retro', price: 200, lvl: 5, layer: 'decor', light: L(10, 11, 26, 'cool', 0.6), toggle: true, tv: true },
  rubber_duck: { n: I18n.s("u_e1eeaeed8c0b"), cat: 'decor', spr: 'rubber_duck', price: 15, lvl: 1, layer: 'decor', react: 'hearts' },
  pet_bowl: { n: I18n.s("u_832da4f7f802"), cat: 'furniture', spr: 'pet_bowl', price: 30, lvl: 1, layer: 'floor', bowl: true, comfort: 1 },
  trophy: { n: I18n.s("u_614af3b540d4"), cat: 'decor', spr: 'trophy', price: 0, lvl: 1, layer: 'decor', special: true, react: 'spin', comfort: 6 },
  diploma: { n: I18n.s("u_4b69e9e24374"), cat: 'wall', spr: 'diploma', price: 0, lvl: 1, layer: 'wall', special: true, comfort: 6 },
  cake: { n: I18n.s("u_8f780f0ae8b0"), cat: 'decor', spr: 'cake', price: 0, lvl: 1, layer: 'decor', giftOnly: true, react: 'hearts' },
  // ---- seaside
  lifebuoy: { n: I18n.s("u_974ed714206e"), cat: 'wall', spr: 'lifebuoy', price: 60, lvl: 2, layer: 'wall' },
  boat_painting: { n: I18n.s("u_7ded069dde70"), cat: 'wall', spr: 'boat_painting', price: 80, lvl: 2, layer: 'wall' },
  surfboard: { n: I18n.s("u_88a367c29ba5"), cat: 'furniture', spr: 'surfboard', price: 120, lvl: 3, layer: 'floor' },
  rattan_chair: { n: I18n.s("u_efd717ea5d9a"), cat: 'furniture', spr: 'rattan_chair', price: 150, lvl: 3, layer: 'floor', seat: { x: 13, y: 17 }, petSpot: { x: 13, y: 17 } },
  shell: { n: I18n.s("u_306a6bab3de4"), cat: 'decor', spr: 'shell', price: 15, lvl: 1, layer: 'decor', react: 'hearts' },
  // ---- forest cabin
  fireplace: { n: I18n.s("u_c470e9c76971"), cat: 'furniture', spr: 'fireplace', price: 320, lvl: 4, layer: 'floor', surface: { x0: 3, x1: 42, y: 2 }, light: L(23, 26, 72, 'warm', 1), toggle: true, fire: true },
  mushroom_lamp: { n: I18n.s("u_8e4374cf315d"), cat: 'decor', spr: 'mushroom_lamp', onSpr: 'mushroom_lamp_on', price: 60, lvl: 2, layer: 'decor', light: L(7, 5, 24, 'warm', 0.8), toggle: true },
  log_stack: { n: I18n.s("u_d518f764c290"), cat: 'furniture', spr: 'log_stack', price: 40, lvl: 2, layer: 'floor' },
  wreath: { n: I18n.s("u_ee36c1136ae1"), cat: 'wall', spr: 'wreath', price: 60, lvl: 3, layer: 'wall' },
  sofa_maple: { n: I18n.s("u_f5b7b8ea1472"), cat: 'furniture', spr: 'sofa', map: rampMap('blue', 'clay'), price: 280, lvl: 4, layer: 'floor', seat: { x: 27, y: 19 } },
  // ---- sakura washitsu
  window_round: { n: I18n.s("u_743e60304e84"), cat: 'wall', spr: 'window_round', price: 140, lvl: 4, layer: 'wall', window: { x: 5, y: 5, w: 30, h: 30, round: true } },
  chabudai: { n: I18n.s("u_fc81a78326fd"), cat: 'furniture', spr: 'chabudai', price: 110, lvl: 3, layer: 'floor', surface: { x0: 6, x1: 35, y: 4 } },
  zabuton: { n: I18n.s("u_5691e32753c1"), cat: 'furniture', spr: 'zabuton', price: 30, lvl: 2, layer: 'floor', petSpot: { x: 10, y: 4 } },
  paper_lantern: { n: I18n.s("u_48db61283094"), cat: 'furniture', spr: 'paper_lantern', onSpr: 'paper_lantern_on', price: 120, lvl: 3, layer: 'floor', light: L(8, 11, 46, 'warm', 0.95), toggle: true },
  bonsai: { n: I18n.s("u_d996839d7d4d"), cat: 'plant', spr: 'bonsai', price: 90, lvl: 3, layer: 'decor', react: 'rustle' },
  scroll: { n: I18n.s("u_4da1863bc6eb"), cat: 'wall', spr: 'scroll', price: 70, lvl: 3, layer: 'wall' },
  futon: { n: I18n.s("u_8efafcd464ab"), cat: 'furniture', spr: 'futon', price: 160, lvl: 4, layer: 'floor', bed: { x: 12, y: 4, blanketY: 8 }, petSpot: { x: 38, y: 12 } },
  // ---- snowy attic
  xmas_tree: { n: I18n.s("u_0b3eadbc6d6e"), cat: 'furniture', spr: 'xmas_tree', onSpr: 'xmas_tree_on', price: 260, lvl: 5, layer: 'floor', light: L(15, 24, 48, 'warm', 0.85), toggle: true, twinkle: true },
  heater: { n: I18n.s("u_c03a9b61fe9c"), cat: 'furniture', spr: 'heater', price: 140, lvl: 4, layer: 'floor', light: L(11, 13, 40, 'warm', 0.85), toggle: true, glow: true },
  snowman: { n: I18n.s("u_ac36baca4318"), cat: 'decor', spr: 'snowman', price: 30, lvl: 2, layer: 'decor', react: 'hearts' },
  yarn_basket: { n: I18n.s("u_80d94ace849d"), cat: 'furniture', spr: 'yarn_basket', price: 50, lvl: 2, layer: 'floor', petSpot: { x: 10, y: 7 } },
  stocking: { n: I18n.s("u_29d884406f95"), cat: 'wall', spr: 'stocking', price: 25, lvl: 2, layer: 'wall' },
  // ---- starry studio
  gaming_chair: { n: I18n.s("u_3e58f9c5f161"), cat: 'furniture', spr: 'gaming_chair', price: 180, lvl: 5, layer: 'floor', chair: true },
  dual_monitor: { n: I18n.s("u_536b4cb2c7da"), cat: 'decor', spr: 'dual_monitor', price: 260, lvl: 5, layer: 'decor', light: L(20, 7, 30, 'cool', 0.6) },
  neon_note: { n: I18n.s("u_9907d47ec381"), cat: 'wall', spr: 'neon_note', onSpr: 'neon_note_on', price: 150, lvl: 5, layer: 'wall', light: L(9, 10, 32, 'cool', 0.9), toggle: true },
  vinyl_shelf: { n: I18n.s("u_bc9e22471cd3"), cat: 'wall', spr: 'vinyl_shelf', price: 120, lvl: 4, layer: 'wall', surface: { x0: 2, x1: 33, y: 1 } },
  speaker: { n: I18n.s("u_dd60ffa330bf"), cat: 'furniture', spr: 'speaker', price: 110, lvl: 4, layer: 'floor', music: true, react: 'notes' },
};
for (const k in ITEMS) ITEMS[k].id = k;

const WALLPAPERS = {
  cream_stripe: { n: I18n.s("u_543b37bb06f3"), price: 0, lvl: 1 },
  mint_dot: { n: I18n.s("u_e01f05131c82"), price: 80, lvl: 1 },
  lilac_check: { n: I18n.s("u_8d552670cef2"), price: 100, lvl: 2 },
  rose_floral: { n: I18n.s("u_6c313ee4a09c"), price: 120, lvl: 2 },
  sage_panel: { n: I18n.s("u_2d0f4ce87b33"), price: 140, lvl: 3 },
  night_star: { n: I18n.s("u_7bd7467a108b"), price: 160, lvl: 4 },
  peach_heart: { n: I18n.s("u_df4f307e8846"), price: 120, lvl: 5 },
  wood_wall: { n: I18n.s("u_a164a5ee6caf"), price: 180, lvl: 6 },
  sea_stripe: { n: I18n.s("u_baa7d83d4849"), price: 100, lvl: 2 },
  shoji: { n: I18n.s("u_4e5f11336b47"), price: 140, lvl: 3 },
  forest_fern: { n: I18n.s("u_47db40276ef9"), price: 120, lvl: 3 },
  brick: { n: I18n.s("u_aa7d0aa13c3b"), price: 140, lvl: 3 },
  winter_knit: { n: I18n.s("u_098e35e42e3c"), price: 130, lvl: 4 },
  studio_dark: { n: I18n.s("u_5e82fd4297e0"), price: 160, lvl: 5 },
};
const FLOORS = {
  wood_honey: { n: I18n.s("u_c3c28bfd00a2"), price: 0, lvl: 1 },
  wood_birch: { n: I18n.s("u_217613fcfcba"), price: 100, lvl: 2 },
  wood_walnut: { n: I18n.s("u_16ffd82eb9b5"), price: 120, lvl: 2 },
  checker_rose: { n: I18n.s("u_5dc1b6bcce58"), price: 140, lvl: 3 },
  carpet_lilac: { n: I18n.s("u_0ba97e6e5b10"), price: 120, lvl: 4 },
  tatami: { n: I18n.s("u_f0e95c2d7371"), price: 160, lvl: 5 },
  wood_white: { n: I18n.s("u_5150ddc45ab8"), price: 100, lvl: 2 },
  parquet: { n: I18n.s("u_22568c604943"), price: 140, lvl: 3 },
  blue_tile: { n: I18n.s("u_73fb3945e35f"), price: 140, lvl: 3 },
  plaid_carpet: { n: I18n.s("u_0675cda9daab"), price: 130, lvl: 4 },
  concrete: { n: I18n.s("u_03b091e0a22b"), price: 120, lvl: 5 },
};
const VIEWS = {
  city: { n: I18n.s("u_ad7558b6577c"), price: 0, lvl: 1 },
  sea: { n: I18n.s("u_77dea1e6fd0b"), price: 150, lvl: 2 },
  forest: { n: I18n.s("u_3bfbf21e2f00"), price: 150, lvl: 3 },
  sakura: { n: I18n.s("u_8ac29c17007f"), price: 150, lvl: 3 },
  snow: { n: I18n.s("u_464ed8f29719"), price: 150, lvl: 4 },
};

/* Theme rooms. layout entries: [itemKey('a|b' = fallbacks), x, y, { on, flip, closed, kids: [[itemKey, dx], ...] }] */
const THEMES = {
  cozy: {
    n: I18n.s("u_e68296724421"), desc: I18n.s("u_317702d9ec1f"), wp: 'cream_stripe', fl: 'wood_honey', view: 'city', price: 0, lvl: 1, grants: [],
    layout: [['window', 92, 20], ['clock', 58, 30], ['shelf_wall', 154, 54, { kids: [['plant_succulent', 4], ['books_stack', 18]] }], ['poster', 186, 26],
      ['rug_round', 92, 128], ['bed', 36, 89], ['nightstand', 86, 92, { kids: [['alarm_clock', 4]] }], ['desk', 152, 92, { kids: [['laptop', 6], ['mug', 28]] }], ['chair', 164, 104],
      ['plant_snake', 202, 98], ['lamp_floor', 132, 70, { on: true }], ['pet_bowl', 58, 152]],
  },
  seaside: {
    n: I18n.s("u_ec05a3e81eed"), desc: I18n.s("u_2c8a29cfeb9c"), wp: 'sea_stripe', fl: 'wood_white', view: 'sea', price: 420, lvl: 2,
    grants: ['window_blue', 'lifebuoy', 'boat_painting', 'surfboard', 'rattan_chair', 'shell', 'shell'],
    layout: [['window_blue|window', 96, 20], ['lifebuoy', 58, 30], ['boat_painting', 152, 28], ['shelf_wall', 150, 58, { kids: [['shell', 5], ['plant_succulent', 19]] }],
      ['rug_round', 92, 128], ['bed', 36, 89], ['nightstand', 86, 92, { kids: [['shell', 4]] }], ['desk_white|desk', 152, 92, { kids: [['laptop', 6], ['mug', 28]] }], ['chair_rose|chair', 164, 104],
      ['surfboard', 199, 72], ['rattan_chair', 40, 124], ['lamp_floor', 134, 70, { on: true }], ['pet_bowl', 76, 156]],
  },
  forest: {
    n: I18n.s("u_b4758286f0fe"), desc: I18n.s("u_9d078906d854"), wp: 'wood_wall', fl: 'wood_walnut', view: 'forest', price: 520, lvl: 3,
    grants: ['fireplace', 'wreath', 'log_stack', 'mushroom_lamp', 'sofa_maple', 'window_sage', 'rug_rect'],
    layout: [['window_sage|window', 38, 20], ['fireplace', 98, 58, { on: true, kids: [['candle', 7], ['photo_frame', 32]] }], ['wreath', 111, 33], ['log_stack', 144, 89],
      ['desk', 36, 92, { kids: [['laptop', 6], ['mushroom_lamp', 28]] }], ['chair', 48, 104], ['bed', 164, 89], ['rug_rect', 89, 111], ['sofa_maple|sofa', 93, 134], ['pet_bowl', 44, 154]],
  },
  sakura: {
    n: I18n.s("u_e34d72de3927"), desc: I18n.s("u_59e5f9b92468"), wp: 'shoji', fl: 'tatami', view: 'sakura', price: 560, lvl: 3,
    grants: ['window_round', 'scroll', 'futon', 'chabudai', 'zabuton', 'zabuton', 'paper_lantern', 'bonsai', 'teapot'],
    layout: [['window_round', 100, 20], ['scroll', 58, 24], ['futon', 34, 100], ['chabudai', 99, 122, { kids: [['teapot', 7], ['mug', 26]] }], ['zabuton', 80, 140], ['zabuton', 136, 140],
      ['paper_lantern', 146, 84, { on: true }], ['desk', 166, 92, { kids: [['bonsai', 3], ['laptop', 22]] }], ['chair', 178, 104], ['pet_bowl', 52, 150]],
  },
  snow: {
    n: I18n.s("u_921917d95251"), desc: I18n.s("u_0740eb49cc63"), wp: 'winter_knit', fl: 'plaid_carpet', view: 'snow', price: 600, lvl: 4,
    grants: ['xmas_tree', 'heater', 'snowman', 'yarn_basket', 'stocking', 'stocking', 'rug_round_pink'],
    layout: [['window', 92, 20], ['stocking', 62, 40], ['stocking', 75, 44], ['bed_lilac|bed', 36, 89], ['nightstand', 86, 92, { kids: [['snowman', 4]] }], ['xmas_tree', 182, 58, { on: true }],
      ['desk', 140, 92, { kids: [['laptop', 6], ['mug', 28]] }], ['chair', 152, 104], ['rug_round_pink|rug_round', 92, 128], ['heater', 44, 128, { on: true }], ['yarn_basket', 122, 146], ['pet_bowl', 154, 150]],
  },
  studio: {
    n: I18n.s("u_e5f89443a439"), desc: I18n.s("u_bc915fd7a537"), wp: 'studio_dark', fl: 'concrete', view: 'city', price: 680, lvl: 5,
    grants: ['gaming_chair', 'dual_monitor', 'neon_note', 'vinyl_shelf', 'speaker', 'speaker', 'beanbag_sun', 'window_blue'],
    layout: [['window_blue|window', 38, 20], ['neon_note', 104, 30, { on: true }], ['vinyl_shelf', 148, 40], ['poster', 186, 26], ['bed', 36, 89],
      ['desk', 130, 92, { kids: [['dual_monitor', 1]] }], ['gaming_chair', 140, 95], ['speaker', 114, 96], ['speaker', 174, 96], ['beanbag_sun|beanbag', 58, 136], ['lamp_floor', 199, 76, { on: true }], ['rug_runner', 100, 146], ['pet_bowl', 150, 150]],
  },
};
const PETS = {
  'cat:ginger': { n: I18n.s("u_a7dc558d639a"), price: 0, lvl: 1 }, 'cat:grey': { n: I18n.s("u_48155a72b60f"), price: 120, lvl: 2 }, 'cat:snow': { n: I18n.s("u_04736092a412"), price: 120, lvl: 3 },
  'cat:ink': { n: I18n.s("u_be2dcfd0a062"), price: 150, lvl: 4 }, 'cat:cocoa': { n: I18n.s("u_1faa202af4f0"), price: 150, lvl: 5 },
  // v0.91: cats only (dogs in older saves become the cat of the nearest colour, see Pets.migrate)
};

