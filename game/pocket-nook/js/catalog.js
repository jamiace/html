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
  { id: 'theme', n: '主題房間' }, { id: 'supply', n: '道具' }, { id: 'furniture', n: '家具' }, { id: 'decor', n: '小物' }, { id: 'plant', n: '植物' }, { id: 'wall', n: '牆面' },
  { id: 'rug', n: '地毯' }, { id: 'wallpaper', n: '壁紙' }, { id: 'floor', n: '地板' }, { id: 'view', n: '窗景' }, { id: 'pet', n: '寵物' },
];
const L = (x, y, r, col = 'warm', k = 1) => ({ x, y, r, col, k });
const ITEMS = {
  // ---- furniture
  desk: { n: '原木書桌', cat: 'furniture', spr: 'desk', price: 80, lvl: 1, layer: 'floor', surface: { x0: 3, x1: 38, y: 4 }, desk: true },
  desk_white: { n: '奶白書桌', cat: 'furniture', spr: 'desk_white', price: 140, lvl: 3, layer: 'floor', surface: { x0: 3, x1: 38, y: 4 }, desk: true },
  chair: { n: '小木椅', cat: 'furniture', spr: 'chair', price: 40, lvl: 1, layer: 'floor', chair: true },
  chair_rose: { n: '玫瑰坐墊椅', cat: 'furniture', spr: 'chair', map: rampMap('blue', 'pink'), price: 60, lvl: 2, layer: 'floor', chair: true },
  bed: { n: '藍格子床', cat: 'furniture', spr: 'bed', price: 120, lvl: 1, layer: 'floor', bed: { x: 14, y: 11 } },
  bed_pink: { n: '草莓牛奶床', cat: 'furniture', spr: 'bed', map: rampMap('blue', 'pink'), price: 160, lvl: 2, layer: 'floor', bed: { x: 14, y: 11 } },
  bed_mint: { n: '薄荷被子床', cat: 'furniture', spr: 'bed', map: rampMap('blue', 'green'), price: 160, lvl: 4, layer: 'floor', bed: { x: 14, y: 11 } },
  bed_lilac: { n: '薰衣草床', cat: 'furniture', spr: 'bed', map: rampMap('blue', 'lilac'), price: 180, lvl: 6, layer: 'floor', bed: { x: 14, y: 11 } },
  bookshelf: { n: '書櫃', cat: 'furniture', spr: 'bookshelf', price: 180, lvl: 2, layer: 'floor', surface: { x0: 2, x1: 25, y: 1 } },
  wardrobe: { n: '雙門衣櫃', cat: 'furniture', spr: 'wardrobe', price: 220, lvl: 5, layer: 'floor', surface: { x0: 2, x1: 33, y: 1 } },
  nightstand: { n: '床頭櫃', cat: 'furniture', spr: 'nightstand', price: 60, lvl: 1, layer: 'floor', surface: { x0: 2, x1: 17, y: 2 } },
  cabinet_low: { n: '矮櫃', cat: 'furniture', spr: 'cabinet_low', price: 120, lvl: 3, layer: 'floor', surface: { x0: 2, x1: 39, y: 2 } },
  sofa: { n: '藍天沙發', cat: 'furniture', spr: 'sofa', price: 260, lvl: 4, layer: 'floor', seat: { x: 27, y: 19 } },
  sofa_pink: { n: '櫻花沙發', cat: 'furniture', spr: 'sofa', map: Object.assign(rampMap('blue', 'pink'), { s: 'w', t: 'x', r: 'v' }), price: 280, lvl: 6, layer: 'floor', seat: { x: 27, y: 19 } },
  sofa_mint: { n: '抹茶沙發', cat: 'furniture', spr: 'sofa', map: rampMap('blue', 'green'), price: 280, lvl: 7, layer: 'floor', seat: { x: 27, y: 19 } },
  beanbag: { n: '懶骨頭', cat: 'furniture', spr: 'beanbag', price: 90, lvl: 2, layer: 'floor', seat: { x: 12, y: 12 }, petSpot: { x: 12, y: 8 } },
  beanbag_sun: { n: '向日葵懶骨頭', cat: 'furniture', spr: 'beanbag', map: rampMap('pink', 'sun'), price: 90, lvl: 3, layer: 'floor', seat: { x: 12, y: 12 }, petSpot: { x: 12, y: 8 } },
  cushion: { n: '圓坐墊', cat: 'furniture', spr: 'cushion', price: 40, lvl: 1, layer: 'floor', petSpot: { x: 11, y: 5 } },
  cat_tree: { n: '貓跳台', cat: 'furniture', spr: 'cat_tree', price: 160, lvl: 3, layer: 'floor', petSpot: { x: 13, y: 9 } },
  lamp_floor: { n: '立燈', cat: 'furniture', spr: 'lamp_floor', onSpr: 'lamp_floor_on', price: 100, lvl: 1, layer: 'floor', light: L(8, 8, 46), toggle: true },
  guitar: { n: '木吉他', cat: 'furniture', spr: 'guitar', price: 140, lvl: 5, layer: 'floor', react: 'notes' },
  // ---- plants
  plant_monstera: { n: '龜背芋', cat: 'plant', spr: 'plant_monstera', price: 120, lvl: 2, layer: 'floor', react: 'rustle' },
  plant_snake: { n: '虎尾蘭', cat: 'plant', spr: 'plant_snake', price: 80, lvl: 1, layer: 'floor', react: 'rustle' },
  plant_fern: { n: '小蕨盆栽', cat: 'plant', spr: 'plant_fern', price: 50, lvl: 1, layer: 'decor', react: 'rustle' },
  plant_succulent: { n: '多肉', cat: 'plant', spr: 'plant_succulent', price: 30, lvl: 1, layer: 'decor', react: 'rustle' },
  cactus: { n: '仙人掌', cat: 'plant', spr: 'cactus', price: 30, lvl: 1, layer: 'decor', react: 'rustle' },
  plant_hanging: { n: '吊掛植物', cat: 'plant', spr: 'plant_hanging', price: 90, lvl: 3, layer: 'wall', react: 'rustle' },
  // ---- rugs
  rug_round: { n: '藍圓地毯', cat: 'rug', spr: 'rug_round', price: 80, lvl: 1, layer: 'rug', petSpot: { x: 29, y: 11 } },
  rug_round_pink: { n: '粉圓地毯', cat: 'rug', spr: 'rug_round', map: rampMap('blue', 'pink'), price: 80, lvl: 2, layer: 'rug', petSpot: { x: 29, y: 11 } },
  rug_round_sage: { n: '綠圓地毯', cat: 'rug', spr: 'rug_round', map: rampMap('blue', 'green'), price: 80, lvl: 3, layer: 'rug', petSpot: { x: 29, y: 11 } },
  rug_rect: { n: '菱紋地毯', cat: 'rug', spr: 'rug_rect', price: 120, lvl: 3, layer: 'rug', petSpot: { x: 31, y: 12 } },
  rug_runner: { n: '小腳墊', cat: 'rug', spr: 'rug_runner', price: 40, lvl: 1, layer: 'rug' },
  // ---- wall
  window: { n: '格子窗', cat: 'wall', spr: 'window', price: 100, lvl: 1, layer: 'wall', window: { x: 6, y: 7, w: 28, h: 28 }, curtains: 'pink' },
  window_blue: { n: '藍窗簾窗戶', cat: 'wall', spr: 'window', price: 100, lvl: 2, layer: 'wall', window: { x: 6, y: 7, w: 28, h: 28 }, curtains: 'blue' },
  window_sage: { n: '綠窗簾窗戶', cat: 'wall', spr: 'window', price: 100, lvl: 4, layer: 'wall', window: { x: 6, y: 7, w: 28, h: 28 }, curtains: 'green' },
  clock: { n: '掛鐘', cat: 'wall', spr: 'clock', price: 50, lvl: 1, layer: 'wall', clock: true, react: 'time' },
  shelf_wall: { n: '牆面層架', cat: 'wall', spr: 'shelf_wall', price: 60, lvl: 1, layer: 'wall', surface: { x0: 2, x1: 31, y: 2 } },
  painting: { n: '山景油畫', cat: 'wall', spr: 'painting', price: 90, lvl: 2, layer: 'wall' },
  poster: { n: '月夜海報', cat: 'wall', spr: 'poster', price: 40, lvl: 1, layer: 'wall' },
  corkboard: { n: '軟木留言板', cat: 'wall', spr: 'corkboard', price: 70, lvl: 2, layer: 'wall' },
  calendar: { n: '月曆', cat: 'wall', spr: 'calendar', price: 30, lvl: 1, layer: 'wall', calendar: true, react: 'date' },
  string_lights: { n: '串燈', cat: 'wall', spr: 'string_lights', onSpr: 'string_lights_on', price: 110, lvl: 2, layer: 'wall', light: L(32, 7, 50, 'warm', 0.8), toggle: true, twinkle: true },
  moon_lamp: { n: '月亮壁燈', cat: 'wall', spr: 'moon_lamp', onSpr: 'moon_lamp_on', price: 90, lvl: 3, layer: 'wall', light: L(8, 8, 34, 'warm', 0.8), toggle: true },
  mirror: { n: '橢圓鏡', cat: 'wall', spr: 'mirror', price: 80, lvl: 2, layer: 'wall' },
  garland: { n: '三角彩旗', cat: 'wall', spr: 'garland', price: 50, lvl: 1, layer: 'wall' },
  neon_heart: { n: '霓虹愛心', cat: 'wall', spr: 'neon_heart', price: 150, lvl: 6, layer: 'wall', light: L(8, 7, 30, 'pink', 0.9), toggle: true, on: true },
  // ---- decor
  laptop: { n: '筆電', cat: 'decor', spr: 'laptop', price: 120, lvl: 1, layer: 'decor', light: L(9, 4, 16, 'cool', 0.5), screen: true },
  monitor: { n: '電腦螢幕', cat: 'decor', spr: 'monitor', price: 180, lvl: 4, layer: 'decor', light: L(12, 7, 22, 'cool', 0.55), screen: true },
  desk_lamp: { n: '檯燈', cat: 'decor', spr: 'desk_lamp', price: 70, lvl: 1, layer: 'decor', light: L(10, 6, 34), toggle: true },
  mug: { n: '馬克杯', cat: 'decor', spr: 'mug', price: 20, lvl: 1, layer: 'decor', steam: true },
  teapot: { n: '茶壺', cat: 'decor', spr: 'teapot', price: 35, lvl: 2, layer: 'decor', steam: true },
  books_stack: { n: '一疊書', cat: 'decor', spr: 'books_stack', price: 25, lvl: 1, layer: 'decor' },
  record_player: { n: '黑膠唱機', cat: 'decor', spr: 'record_player', price: 160, lvl: 4, layer: 'decor', react: 'notes', spin: true, music: true },
  candle: { n: '香氛蠟燭', cat: 'decor', spr: 'candle', price: 25, lvl: 1, layer: 'decor', light: L(3, 2, 22, 'warm', 0.8), toggle: true, flicker: true },
  fishbowl: { n: '金魚缸', cat: 'decor', spr: 'fishbowl', price: 80, lvl: 3, layer: 'decor', fish: true, react: 'bubbles' },
  photo_frame: { n: '相框', cat: 'decor', spr: 'photo_frame', price: 30, lvl: 1, layer: 'decor' },
  globe: { n: '地球儀', cat: 'decor', spr: 'globe', price: 60, lvl: 2, layer: 'decor', react: 'spin' },
  alarm_clock: { n: '鬧鐘', cat: 'decor', spr: 'alarm_clock', price: 30, lvl: 1, layer: 'decor', react: 'time' },
  plush_bear: { n: '小熊玩偶', cat: 'decor', spr: 'plush_bear', price: 50, lvl: 2, layer: 'decor', react: 'hearts' },
  headphones: { n: '耳機', cat: 'decor', spr: 'headphones', price: 40, lvl: 2, layer: 'decor', react: 'notes', music: true },
  tv_retro: { n: '復古電視', cat: 'decor', spr: 'tv_retro', price: 200, lvl: 5, layer: 'decor', light: L(10, 11, 26, 'cool', 0.6), toggle: true, tv: true },
  rubber_duck: { n: '小黃鴨', cat: 'decor', spr: 'rubber_duck', price: 15, lvl: 1, layer: 'decor', react: 'hearts' },
  pet_bowl: { n: '寵物碗', cat: 'furniture', spr: 'pet_bowl', price: 30, lvl: 1, layer: 'floor', bowl: true, comfort: 1 },
  trophy: { n: '學霸獎盃', cat: 'decor', spr: 'trophy', price: 0, lvl: 1, layer: 'decor', special: true, react: 'spin', comfort: 6 },
  diploma: { n: '單字達人獎狀', cat: 'wall', spr: 'diploma', price: 0, lvl: 1, layer: 'wall', special: true, comfort: 6 },
  cake: { n: '小蛋糕', cat: 'decor', spr: 'cake', price: 0, lvl: 1, layer: 'decor', giftOnly: true, react: 'hearts' },
  // ---- seaside
  lifebuoy: { n: '救生圈', cat: 'wall', spr: 'lifebuoy', price: 60, lvl: 2, layer: 'wall' },
  boat_painting: { n: '帆船畫', cat: 'wall', spr: 'boat_painting', price: 80, lvl: 2, layer: 'wall' },
  surfboard: { n: '衝浪板', cat: 'furniture', spr: 'surfboard', price: 120, lvl: 3, layer: 'floor' },
  rattan_chair: { n: '藤編蛋椅', cat: 'furniture', spr: 'rattan_chair', price: 150, lvl: 3, layer: 'floor', seat: { x: 13, y: 17 }, petSpot: { x: 13, y: 13 } },
  shell: { n: '貝殼', cat: 'decor', spr: 'shell', price: 15, lvl: 1, layer: 'decor', react: 'hearts' },
  // ---- forest cabin
  fireplace: { n: '石砌壁爐', cat: 'furniture', spr: 'fireplace', price: 320, lvl: 4, layer: 'floor', surface: { x0: 3, x1: 42, y: 2 }, light: L(23, 26, 72, 'warm', 1), toggle: true, fire: true },
  mushroom_lamp: { n: '蘑菇燈', cat: 'decor', spr: 'mushroom_lamp', onSpr: 'mushroom_lamp_on', price: 60, lvl: 2, layer: 'decor', light: L(7, 5, 24, 'warm', 0.8), toggle: true },
  log_stack: { n: '柴火堆', cat: 'furniture', spr: 'log_stack', price: 40, lvl: 2, layer: 'floor' },
  wreath: { n: '松果花圈', cat: 'wall', spr: 'wreath', price: 60, lvl: 3, layer: 'wall' },
  sofa_maple: { n: '楓紅沙發', cat: 'furniture', spr: 'sofa', map: rampMap('blue', 'clay'), price: 280, lvl: 4, layer: 'floor', seat: { x: 27, y: 19 } },
  // ---- sakura washitsu
  window_round: { n: '圓窗', cat: 'wall', spr: 'window_round', price: 140, lvl: 4, layer: 'wall', window: { x: 5, y: 5, w: 30, h: 30, round: true } },
  chabudai: { n: '圓矮桌', cat: 'furniture', spr: 'chabudai', price: 110, lvl: 3, layer: 'floor', surface: { x0: 6, x1: 35, y: 4 } },
  zabuton: { n: '座布團', cat: 'furniture', spr: 'zabuton', price: 30, lvl: 2, layer: 'floor', petSpot: { x: 10, y: 4 } },
  paper_lantern: { n: '行燈', cat: 'furniture', spr: 'paper_lantern', onSpr: 'paper_lantern_on', price: 120, lvl: 3, layer: 'floor', light: L(8, 11, 46, 'warm', 0.95), toggle: true },
  bonsai: { n: '盆景松', cat: 'plant', spr: 'bonsai', price: 90, lvl: 3, layer: 'decor', react: 'rustle' },
  scroll: { n: '櫻花掛軸', cat: 'wall', spr: 'scroll', price: 70, lvl: 3, layer: 'wall' },
  futon: { n: '櫻花被褥', cat: 'furniture', spr: 'futon', price: 160, lvl: 4, layer: 'floor', bed: { x: 12, y: 4, blanketY: 8 }, petSpot: { x: 38, y: 12 } },
  // ---- snowy attic
  xmas_tree: { n: '聖誕樹', cat: 'furniture', spr: 'xmas_tree', onSpr: 'xmas_tree_on', price: 260, lvl: 5, layer: 'floor', light: L(15, 24, 48, 'warm', 0.85), toggle: true, twinkle: true },
  heater: { n: '復古暖爐', cat: 'furniture', spr: 'heater', price: 140, lvl: 4, layer: 'floor', light: L(11, 13, 40, 'warm', 0.85), toggle: true, glow: true },
  snowman: { n: '雪人擺飾', cat: 'decor', spr: 'snowman', price: 30, lvl: 2, layer: 'decor', react: 'hearts' },
  yarn_basket: { n: '毛線籃', cat: 'furniture', spr: 'yarn_basket', price: 50, lvl: 2, layer: 'floor', petSpot: { x: 10, y: 7 } },
  stocking: { n: '聖誕襪', cat: 'wall', spr: 'stocking', price: 25, lvl: 2, layer: 'wall' },
  // ---- starry studio
  gaming_chair: { n: '電競椅', cat: 'furniture', spr: 'gaming_chair', price: 180, lvl: 5, layer: 'floor', chair: true },
  dual_monitor: { n: '雙螢幕', cat: 'decor', spr: 'dual_monitor', price: 260, lvl: 5, layer: 'decor', light: L(20, 7, 30, 'cool', 0.6) },
  neon_note: { n: '霓虹音符', cat: 'wall', spr: 'neon_note', onSpr: 'neon_note_on', price: 150, lvl: 5, layer: 'wall', light: L(9, 10, 32, 'cool', 0.9), toggle: true },
  vinyl_shelf: { n: '黑膠唱片架', cat: 'wall', spr: 'vinyl_shelf', price: 120, lvl: 4, layer: 'wall', surface: { x0: 2, x1: 33, y: 1 } },
  speaker: { n: '落地喇叭', cat: 'furniture', spr: 'speaker', price: 110, lvl: 4, layer: 'floor', music: true, react: 'notes' },
};
for (const k in ITEMS) ITEMS[k].id = k;

const WALLPAPERS = {
  cream_stripe: { n: '奶油條紋', price: 0, lvl: 1 },
  mint_dot: { n: '薄荷圓點', price: 80, lvl: 1 },
  lilac_check: { n: '紫丁香格紋', price: 100, lvl: 2 },
  rose_floral: { n: '玫瑰碎花', price: 120, lvl: 2 },
  sage_panel: { n: '鼠尾草護牆板', price: 140, lvl: 3 },
  night_star: { n: '午夜星空', price: 160, lvl: 4 },
  peach_heart: { n: '蜜桃愛心', price: 120, lvl: 5 },
  wood_wall: { n: '小木屋', price: 180, lvl: 6 },
  sea_stripe: { n: '海風條紋', price: 100, lvl: 2 },
  shoji: { n: '障子紙門', price: 140, lvl: 3 },
  forest_fern: { n: '蕨葉森林', price: 120, lvl: 3 },
  brick: { n: '紅磚牆', price: 140, lvl: 3 },
  winter_knit: { n: '冬日毛線', price: 130, lvl: 4 },
  studio_dark: { n: '深夜錄音室', price: 160, lvl: 5 },
};
const FLOORS = {
  wood_honey: { n: '蜂蜜木地板', price: 0, lvl: 1 },
  wood_birch: { n: '白樺木地板', price: 100, lvl: 2 },
  wood_walnut: { n: '胡桃木地板', price: 120, lvl: 2 },
  checker_rose: { n: '草莓格磁磚', price: 140, lvl: 3 },
  carpet_lilac: { n: '紫色長毛地毯', price: 120, lvl: 4 },
  tatami: { n: '榻榻米', price: 160, lvl: 5 },
  wood_white: { n: '白洗木地板', price: 100, lvl: 2 },
  parquet: { n: '拼花木地板', price: 140, lvl: 3 },
  blue_tile: { n: '藍白花磚', price: 140, lvl: 3 },
  plaid_carpet: { n: '格紋地毯', price: 130, lvl: 4 },
  concrete: { n: '清水模', price: 120, lvl: 5 },
};
const VIEWS = {
  city: { n: '城市街景', price: 0, lvl: 1 },
  sea: { n: '海邊', price: 150, lvl: 2 },
  forest: { n: '森林', price: 150, lvl: 3 },
  sakura: { n: '櫻花', price: 150, lvl: 3 },
  snow: { n: '雪國', price: 150, lvl: 4 },
};

/* Theme rooms. layout entries: [itemKey('a|b' = fallbacks), x, y, { on, flip, closed, kids: [[itemKey, dx], ...] }] */
const THEMES = {
  cozy: {
    n: '溫馨小窩', desc: '奶油條紋牆配蜂蜜木地板，一切開始的地方。', wp: 'cream_stripe', fl: 'wood_honey', view: 'city', price: 0, lvl: 1, grants: [],
    layout: [['window', 92, 20], ['clock', 58, 30], ['shelf_wall', 154, 54, { kids: [['plant_succulent', 4], ['books_stack', 18]] }], ['poster', 186, 26],
      ['rug_round', 92, 128], ['bed', 36, 89], ['nightstand', 86, 92, { kids: [['alarm_clock', 4]] }], ['desk', 152, 92, { kids: [['laptop', 6], ['mug', 28]] }], ['chair', 164, 104],
      ['plant_snake', 202, 98], ['lamp_floor', 132, 70, { on: true }], ['pet_bowl', 58, 152]],
  },
  seaside: {
    n: '海邊小屋', desc: '白洗木地板、藍色窗簾和海風條紋，窗外是會發光的海。', wp: 'sea_stripe', fl: 'wood_white', view: 'sea', price: 420, lvl: 2,
    grants: ['window_blue', 'lifebuoy', 'boat_painting', 'surfboard', 'rattan_chair', 'shell', 'shell'],
    layout: [['window_blue|window', 96, 20], ['lifebuoy', 58, 30], ['boat_painting', 152, 28], ['shelf_wall', 150, 58, { kids: [['shell', 5], ['plant_succulent', 19]] }],
      ['rug_round', 92, 128], ['bed', 36, 89], ['nightstand', 86, 92, { kids: [['shell', 4]] }], ['desk_white|desk', 152, 92, { kids: [['laptop', 6], ['mug', 28]] }], ['chair_rose|chair', 164, 104],
      ['surfboard', 199, 72], ['rattan_chair', 40, 124], ['lamp_floor', 134, 70, { on: true }], ['pet_bowl', 76, 156]],
  },
  forest: {
    n: '森林木屋', desc: '木牆、胡桃木地板和會劈啪作響的石砌壁爐，窗外有螢火蟲。', wp: 'wood_wall', fl: 'wood_walnut', view: 'forest', price: 520, lvl: 3,
    grants: ['fireplace', 'wreath', 'log_stack', 'mushroom_lamp', 'sofa_maple', 'window_sage', 'rug_rect'],
    layout: [['window_sage|window', 38, 20], ['fireplace', 98, 58, { on: true, kids: [['candle', 7], ['photo_frame', 32]] }], ['wreath', 111, 33], ['log_stack', 144, 89],
      ['desk', 36, 92, { kids: [['laptop', 6], ['mushroom_lamp', 28]] }], ['chair', 48, 104], ['bed', 164, 89], ['rug_rect', 89, 111], ['sofa_maple|sofa', 93, 134], ['pet_bowl', 44, 154]],
  },
  sakura: {
    n: '櫻花和室', desc: '障子紙門、榻榻米和圓窗，窗外櫻花飄落。', wp: 'shoji', fl: 'tatami', view: 'sakura', price: 560, lvl: 3,
    grants: ['window_round', 'scroll', 'futon', 'chabudai', 'zabuton', 'zabuton', 'paper_lantern', 'bonsai', 'teapot'],
    layout: [['window_round', 100, 20], ['scroll', 58, 24], ['futon', 34, 100], ['chabudai', 99, 122, { kids: [['teapot', 7], ['mug', 26]] }], ['zabuton', 80, 140], ['zabuton', 136, 140],
      ['paper_lantern', 146, 84, { on: true }], ['desk', 166, 92, { kids: [['bonsai', 3], ['laptop', 22]] }], ['chair', 178, 104], ['pet_bowl', 52, 150]],
  },
  snow: {
    n: '雪國閣樓', desc: '紅白毛線牆和格紋地毯，暖爐、聖誕樹，窗外下著雪。', wp: 'winter_knit', fl: 'plaid_carpet', view: 'snow', price: 600, lvl: 4,
    grants: ['xmas_tree', 'heater', 'snowman', 'yarn_basket', 'stocking', 'stocking', 'rug_round_pink'],
    layout: [['window', 92, 20], ['stocking', 62, 40], ['stocking', 75, 44], ['bed_lilac|bed', 36, 89], ['nightstand', 86, 92, { kids: [['snowman', 4]] }], ['xmas_tree', 182, 58, { on: true }],
      ['desk', 140, 92, { kids: [['laptop', 6], ['mug', 28]] }], ['chair', 152, 104], ['rug_round_pink|rug_round', 92, 128], ['heater', 44, 128, { on: true }], ['yarn_basket', 122, 146], ['pet_bowl', 154, 150]],
  },
  studio: {
    n: '星空工作室', desc: '深色吸音牆、清水模地板、雙螢幕和霓虹燈，適合深夜專注。', wp: 'studio_dark', fl: 'concrete', view: 'city', price: 680, lvl: 5,
    grants: ['gaming_chair', 'dual_monitor', 'neon_note', 'vinyl_shelf', 'speaker', 'speaker', 'beanbag_sun', 'window_blue'],
    layout: [['window_blue|window', 38, 20], ['neon_note', 104, 30, { on: true }], ['vinyl_shelf', 148, 40], ['poster', 186, 26], ['bed', 36, 89],
      ['desk', 130, 92, { kids: [['dual_monitor', 1]] }], ['gaming_chair', 140, 95], ['speaker', 114, 96], ['speaker', 174, 96], ['beanbag_sun|beanbag', 58, 136], ['lamp_floor', 199, 76, { on: true }], ['rug_runner', 100, 146], ['pet_bowl', 150, 150]],
  },
};
const PETS = {
  'cat:ginger': { n: '橘貓', price: 0, lvl: 1 }, 'cat:grey': { n: '灰貓', price: 120, lvl: 2 }, 'cat:snow': { n: '白貓', price: 120, lvl: 3 },
  'cat:ink': { n: '黑貓', price: 150, lvl: 4 }, 'cat:cocoa': { n: '可可貓', price: 150, lvl: 5 },
  'dog:shiba': { n: '柴犬', price: 300, lvl: 3 }, 'dog:sesame': { n: '黑芝麻柴', price: 320, lvl: 5 }, 'dog:cream': { n: '奶油柴', price: 320, lvl: 6 }, 'dog:coal': { n: '黑柴', price: 340, lvl: 7 },
};

