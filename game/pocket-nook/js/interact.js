/* ============================================================
   More things to do with the furniture
   Everything that had no reaction yet gets one, chosen by what the item is:
   - useful: the camera saves a photo of the room, the computer shows today's progress, books and the
     typewriter show an English word, the gramophone plays / pauses, the record rack skips a song,
     wardrobes open the outfit window, the corkboard opens the notes, cat furniture calls a cat over,
     the umbrella stand tells the weather, the certificate counts your words
   - small fun: drawers sometimes hide a coin (a few a day), the crystal ball tells today's fortune,
     the hourglass runs for one minute, the loom weaves a scarf a little at a time
   - a smile / pointless: the rocket never takes off, the cookie jar only has crumbs, the game console says GAME OVER…
   Lines are picked at random; the same line does not come twice in a row.
   ============================================================ */
const Furn = {
  last: {},
  pick(key, list) { const L = list.filter(x => x !== this.last[key]); const v = L[Math.floor(Math.random() * L.length)] || list[0]; this.last[key] = v; return v; },
  say(it, cx, text, secs) { Game.bubbleAt(cx, it.y, text, secs || 2.6); },
  puff(kind, it, cx, n, o) { for (let i = 0; i < n; i++) Room.puff(kind, cx + (Math.random() - 0.5) * 10, it.y + 2, Object.assign({ vx: (Math.random() - 0.5) * 10, vy: -7 - Math.random() * 4, wob: 6, max: 1.3 }, o || {})); },
  st() { const S = Game.S; if (!S.furn) S.furn = { loom: 0, scarves: 0, cube: 0 }; return S.furn; },
  pet() { const ps = (Game.pets || []).filter(p => p.data && !p.walking && !p.jump && !['eat', 'trick', 'hand', 'inbox', 'zoom'].includes(p.state)); return ps.find(p => p.state !== 'sleep') || ps[0] || null; },
  // a cat comes over and does something there
  callPet(it, pose, line) {
    const p = this.pet(); if (!p || Game.focusing()) return false;
    const [w, h] = itemSize(it), tx = Math.max(14, Math.min(226, it.x + w / 2 + (Math.random() < 0.5 ? -10 : 10))), ty = Math.min(166, it.y + h + 2);
    if (p.state === 'sleep') p.state = 'sit';
    p.leaveSpot(() => { p.state = 'walk'; p.walkTo(tx, ty, () => { p.state = 'sit'; p.flip = tx > it.x + w / 2; PetAI.act(p, pose, 2.2); if (line) Game.bubble(p, line, 1.8); }); });
    return true;
  },
  coinFind(it, cx, lines) {
    const F = Fun.day(); F.drawer = F.drawer || 0;
    if (F.drawer < 5 && Fun.once('dr' + it.uid) && Math.random() < 0.45) { F.drawer++; Game.reward(1, 0, 'raw'); Room.puff('p_coin', cx, it.y, { vy: -10 }); this.say(it, cx, this.pick('coin', ['角落裡有 1 枚金幣！', '找到 1 枚掉進去的金幣', '咦，有 1 枚金幣']), 2.4); Game.save(); return; }
    this.say(it, cx, this.pick('dr' + (lines === DRAWER ? '' : 'x'), lines));
  },
  word(it, cx, fmt) {
    const seen = Object.keys(Game.S.vocab || {}), w = seen.length && Math.random() < 0.6 ? seen[Math.floor(Math.random() * seen.length)] : VOCAB[Math.floor(Math.random() * VOCAB.length)].w;
    const v = VOCAB[VIDX[w]]; if (!v) return; Learn.speak(v.w); this.say(it, cx, fmt(v), 3.6);
  },
  // ---------- the camera: a photo of the room ----------
  photo(it, cx) {
    const room = document.getElementById('room'); if (!room) return;
    const wrap = document.querySelector('.room-wrap'); if (wrap) { wrap.classList.remove('flash'); void wrap.offsetWidth; wrap.classList.add('flash'); }
    try {
      const k = 4, c = document.createElement('canvas'); c.width = RW * k; c.height = RH * k; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(room, 0, 0, c.width, c.height);
      const n = new Date(), p2 = v => String(v).padStart(2, '0'), name = `小窩時光-${n.getFullYear()}${p2(n.getMonth() + 1)}${p2(n.getDate())}-${p2(n.getHours())}${p2(n.getMinutes())}.png`;
      c.toBlob(b => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }, 'image/png');
      setTimeout(() => this.say(it, cx, this.pick('cam', ['喀嚓！照片存好了', '喀嚓！這張很好看', '喀嚓！大家都有入鏡嗎？']), 2.4), 250);
      const p = this.pet(); if (p && p.state !== 'sleep') setTimeout(() => PetAI.act(p, 'stare', 1.4), 100);
    } catch (e) { this.say(it, cx, '喀嚓！（這個瀏覽器存不了照片）'); }
  },
  // ---------- the hourglass: one minute ----------
  hourglass(it, cx) {
    if (this.sand && this.sand.uid === it.uid) return this.say(it, cx, `還剩 ${Math.max(1, Math.ceil((this.sand.end - Date.now()) / 1000))} 秒`);
    this.sand = { uid: it.uid, end: Date.now() + 60e3 }; this.say(it, cx, '翻過來了，一分鐘開始');
    clearTimeout(this.sandT); this.sandT = setTimeout(() => { const u = this.sand && Room.uidMap[this.sand.uid]; this.sand = null; if (u) { const cv = Room.itemCanvas(u); Game.bubbleAt(u.x + cv.width / 2, u.y, '沙子流完了，一分鐘到！', 3); Room.puff('p_spark', u.x + cv.width / 2, u.y, { vy: -6 }); } }, 60e3);
  },
  fortune(it, cx) {
    const d = Life.today(), F = ['大吉：今天背的單字會記得特別牢', '中吉：適合整理房間', '小吉：會有人想起你', '吉：喝杯溫的東西會很舒服', '末吉：慢慢來，比較快', '大吉：貓咪今天特別黏你', '中吉：適合專注一輪番茄鐘', '小吉：窗外會有好看的雲'];
    let hsh = 0; for (const ch of d + ':' + it.k) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
    this.puff('p_spark', it, cx, 3); this.say(it, cx, '水晶球說…' + F[hsh % F.length], 3.4);
  },
  loom(it, cx) {
    const s = this.st(); s.loom = (s.loom || 0) + 1; it.shake = 0.3;
    if (s.loom >= 20) { s.loom = 0; s.scarves = (s.scarves || 0) + 1; this.puff('p_heart', it, cx, 2); this.say(it, cx, `織好一條小圍巾！（第 ${s.scarves} 條）`, 3); }
    else this.say(it, cx, `咔噠咔噠…織了 ${s.loom}/20 行`, 1.6);
    Game.save();
  },
  cube(it, cx) {
    const s = this.st(); s.cube = (s.cube || 0) + 1;
    if (Math.random() < 0.06) { this.puff('p_spark', it, cx, 5); this.say(it, cx, '六面都轉好了！……然後又被打亂了', 3); }
    else this.say(it, cx, this.pick('cube', ['轉好一面了', '轉了半天，回到原點', '好像快好了…', '這個顏色到底要去哪裡']));
  },
};
const DRAWER = ['找到一隻襪子，另一隻呢？', '一張很久以前的電影票', '三條橡皮筋', '一顆不知道哪裡來的鈕扣', '寫到一半的明信片', '空空的，很整齊', '一包還沒拆的面紙', '小時候的貼紙', '一把不知道開哪裡的鑰匙'];

// what each kind of item does (matched on the item's name; the first match wins)
const FURN_RULES = [
  [/相機/, (it, d, cx) => Furn.photo(it, cx)],
  [/筆電|電腦|螢幕/, (it, d, cx) => {
    if (Game.focusing()) return Furn.say(it, cx, '專注中…畫面上只有一個番茄');
    if (Math.random() < 0.12) return Furn.say(it, cx, Furn.pick('pc0', ['正在更新，請勿關機（37%）', '桌布換成了貓咪', '收件匣：0 封，真好', '開了 23 個分頁…先關幾個吧']));
    const S = Game.S, L = Learn.L, fm = (S.stats && S.stats.fDay && S.stats.fDay.d === Life.today()) ? S.stats.fDay.m : 0;
    Furn.say(it, cx, `今天：專注 ${fm} 分鐘・單字 ${L.dailyDone ? '完成' : (L.reviewed || 0) + '/20'}・連續 ${Learn.streakNow()} 天`, 3.4);
  }],
  [/打字機/, (it, d, cx) => { Furn.puff('p_dot', it, cx, 3, { vy: -4 }); Furn.word(it, cx, v => `噠噠噠…「${v.w}」${v.z.split('；')[0]}`); }],
  [/書櫃|書架|一疊書|精裝書|筆記本/, (it, d, cx) => {
    if (Math.random() < 0.15) { Room.puff('p_dot', cx, it.y + 4, { vy: 4, grav: 30, max: 0.8 }); return Furn.say(it, cx, Furn.pick('book0', ['一本書掉下來了…撿回去放好', '這本看到一半，書籤還夾著', '翻開是一張舊照片'])); }
    Furn.word(it, cx, v => `翻開一頁：${v.w}  ${v.z.split('；')[0]}`);
  }],
  [/留聲機/, (it, d, cx) => { if (!Music.cur && !Game.S.music.list.length) return Furn.say(it, cx, '沒有唱片可以放'); Music.toggle(); setTimeout(() => Furn.say(it, cx, Music.playing ? '唱針放下去了♪' : '唱針抬起來了'), 400); Furn.puff('p_note', it, cx, 2); }],
  [/唱片架/, (it, d, cx) => { if (!Music.cur) return Furn.say(it, cx, '挑一張…先打開音樂吧'); Music.next(true); Furn.puff('p_note', it, cx, 2); Furn.say(it, cx, '換一張唱片'); }],
  [/衣櫃|衣帽架/, (it, d, cx) => { Furn.say(it, cx, Furn.pick('ward', ['今天穿什麼好呢', '衣服好像又多了', '打開衣櫃…'])); setTimeout(() => UI.openWin('avatar'), 500); }],
  [/相框/, (it, d, cx) => { const p = Pets.home ? Pets.home()[0] : null; Furn.say(it, cx, Furn.pick('frame', ['第一天搬進來的照片', p ? `${p.name}小時候的照片，好小一隻` : '一張很久以前的合照', '照片裡的天空好藍', '大家都在笑'])); }],
  [/鏡/, (it, d, cx) => { const A = Game.avatar; if (A) A.happy = 1.5; Furn.puff('p_spark', it, cx, 2); Furn.say(it, cx, Furn.pick('mirror', ['今天看起來精神不錯', '頭髮翹起來了一點點', '鏡子裡的人笑了一下', '嗯，可以出門了（但不出門）', '好像有黑眼圈…早點睡'])); }],
  [/留言板/, (it, d, cx) => { Furn.say(it, cx, '寫張便條釘上去'); setTimeout(() => UI.openWin('memo'), 400); }],
  [/獎狀/, (it, d, cx) => { const n = Object.keys(Game.S.vocab || {}).length; Furn.puff('p_spark', it, cx, 3); Furn.say(it, cx, `已經認識 ${n} 個單字了，了不起`, 3); }],
  [/肖像/, (it, d, cx) => { const p = Pets.home ? Pets.home()[0] : null; Furn.say(it, cx, p ? `${p.name}的肖像，畫得比本人嚴肅` : '一幅可愛的肖像'); }],
  [/雨傘/, (it, d, cx) => Furn.say(it, cx, Room.env && Room.env.rain ? '外面在下雨，出門記得帶傘' : Furn.pick('umb', ['今天應該用不到', '傘都乖乖站好了', '有一把是別人忘在這裡的']))],
  [/貓跳台|貓抓|貓咪別墅/, (it, d, cx) => { if (!Furn.callPet(it, 'scratch', '喵！')) Furn.say(it, cx, '貓咪現在沒空'); }],
  [/寵物窩|狗屋/, (it, d, cx) => { if (!Furn.callPet(it, 'knead', '喵～')) Furn.say(it, cx, '軟軟的窩'); }],
  [/紙箱/, (it, d, cx) => { if (Math.random() < 0.6 && Furn.callPet(it, 'stare', '…（盯）')) return; Furn.say(it, cx, Furn.pick('box', ['空的紙箱，貓咪最愛', '裡面好像有什麼在動？', '留著，總有一天會用到'])); }],
  [/毛線籃/, (it, d, cx) => { Room.puff('p_dot', cx, it.y + 4, { vx: 18, vy: -2, grav: 20, max: 1 }); if (!Furn.callPet(it, 'beg', '喵？')) Furn.say(it, cx, '一顆毛線球滾出來了'); else Furn.say(it, cx, '毛線球滾出來了！'); }],
  [/坐墊|座布團|抱枕|坐墩|大地墊/, (it, d, cx) => { Furn.puff('p_heart', it, cx, 1); if (Math.random() < 0.5 && Furn.callPet(it, 'knead', '咕嚕咕嚕')) return; Furn.say(it, cx, Furn.pick('cush', ['拍一拍，蓬蓬的', '坐下去就不想起來', '有貓毛'])); }],
  [/床頭櫃|五斗櫃|矮櫃|高櫃|格子櫃|餐邊櫃|電視櫃/, (it, d, cx) => Furn.coinFind(it, cx, DRAWER)],
  [/茶几|矮桌|邊几|邊桌/, (it, d, cx) => { Furn.puff('p_spark', it, cx, 2); Furn.say(it, cx, Furn.pick('table', ['擦一擦，亮晶晶', '桌上有一圈杯子印', '放杯熱茶剛剛好', '小心桌角'])); }],
  [/花台/, (it, d, cx) => { Furn.puff('p_leaf', it, cx, 2); Furn.say(it, cx, '放盆花上去會很好看'); }],
  [/柴火/, (it, d, cx) => { Furn.puff('p_spark', it, cx, 3, { vy: -10 }); Furn.say(it, cx, Furn.pick('wood', ['劈啪…是冬天的味道', '木頭香香的', '夠燒一整個冬天'])); }],
  [/衝浪板/, (it, d, cx) => Furn.say(it, cx, Furn.pick('surf', ['浪來了！……在房間裡', '上次衝浪是什麼時候了', '先練習在地毯上站穩']))],
  [/洗衣籃/, (it, d, cx) => Furn.say(it, cx, Furn.pick('laun', ['衣服好像越洗越多', '明天再洗（第三天）', '貓咪在裡面睡過']))],
  [/皮箱/, (it, d, cx) => Furn.say(it, cx, '裡面裝著去' + Furn.pick('trip', ['京都', '冰島', '花蓮', '巴黎', '首爾', '墾丁']) + '的回憶')],
  [/冰淇淋/, (it, d, cx) => { Furn.puff('p_heart', it, cx, 1); Furn.say(it, cx, '今天的口味：' + Furn.pick('ice', ['香草', '抹茶', '草莓', '芋頭', '巧克力', '海鹽焦糖'])); }],
  [/望遠鏡/, (it, d, cx) => { const night = Room.env && Room.env.dark > 0.4; if (night) Furn.puff('p_spark', it, cx, 3, { vy: -12 }); Furn.say(it, cx, night ? '看到' + Furn.pick('star', ['獵戶座', '北極星', '一顆流星！', '月亮上的坑']) : '白天只看得到對面的屋頂'); }],
  [/織布機/, (it, d, cx) => Furn.loom(it, cx)],
  [/魔術方塊/, (it, d, cx) => Furn.cube(it, cx)],
  [/沙漏/, (it, d, cx) => Furn.hourglass(it, cx)],
  [/水晶/, (it, d, cx) => Furn.fortune(it, cx)],
  [/地球儀/, (it, d, cx) => { it.shake = 0.6; Furn.say(it, cx, '轉啊轉…停在' + Furn.pick('globe', ['冰島', '紐西蘭', '摩洛哥', '芬蘭', '秘魯', '日本', '加拿大']) + '，下次去那裡吧'); }],
  [/遊戲機/, (it, d, cx) => Furn.say(it, cx, Math.random() < 0.3 ? '破關了！' : Furn.pick('game', ['GAME OVER', '再一局就好', '最高分被貓咪踩掉了']))],
  [/火箭/, (it, d, cx) => { Furn.puff('p_steam', it, cx, 3, { vy: -3 }); Furn.say(it, cx, '3、2、1……發射！（還在原地）'); }],
  [/機器人/, (it, d, cx) => Furn.say(it, cx, Furn.pick('robot', ['嗶嗶，充電中', '嗶，主人好', '嗶嗶…今天也要加油']))],
  [/積木/, (it, d, cx) => Furn.say(it, cx, Furn.pick('blocks', ['疊得好高…倒了', '蓋了一座小城堡', '少了一塊']))],
  [/玩偶/, (it, d, cx) => { Furn.puff('p_heart', it, cx, 1); Furn.say(it, cx, Furn.pick('doll', ['捏一下，啾！', '軟綿綿', '它好像在笑'])); }],
  [/縫紉機/, (it, d, cx) => Furn.say(it, cx, Furn.pick('sew', ['噠噠噠…縫好一顆鈕扣', '線打結了', '幫襪子補了一個洞']))],
  [/香水/, (it, d, cx) => { Furn.puff('p_spark', it, cx, 2); Furn.say(it, cx, '淡淡的花香'); }],
  [/筆筒/, (it, d, cx) => Furn.say(it, cx, Furn.pick('pen', ['鉛筆都削好了', '有一支沒水了', '原子筆總是不見']))],
  [/餅乾罐/, (it, d, cx) => Furn.say(it, cx, Furn.pick('cookie', ['罐子裡只剩碎屑', '最後一塊…還是留著好了', '好像被誰偷吃了']))],
  [/糖果/, (it, d, cx) => Furn.say(it, cx, '拿了一顆' + Furn.pick('candy', ['草莓', '檸檬', '葡萄', '蘇打']) + '口味的')],
  [/奶茶|咖啡/, (it, d, cx) => { Furn.puff('p_steam', it, cx, 2); Furn.say(it, cx, Furn.pick('drink', ['喝一口，好幸福', '冰塊都融化了', '還剩一半'])); }],
  [/蛋糕|甜甜圈|馬卡龍|點心|水果盤|布丁/, (it, d, cx) => { Furn.puff('p_heart', it, cx, 1); if (Math.random() < 0.4 && Furn.callPet(it, 'beg', '喵～（想吃）')) return; Furn.say(it, cx, Furn.pick('cake', ['偷吃一口', '看起來好好吃', '留給等一下的自己'])); }],
  [/盆景|苔蘚|小盆苗|常春藤/, (it, d, cx) => { Furn.puff('p_leaf', it, cx, 2); Furn.say(it, cx, Furn.pick('moss', ['幫它噴了點水', '好像長高了一點點', '綠綠的，看了心情好'])); }],
  [/懷錶/, (it, d, cx) => { const n = new Date(); Furn.say(it, cx, `滴答…現在 ${n.getHours()}:${String(n.getMinutes()).padStart(2, '0')}，老鐘先生的錶很準`); }],
  [/星星球|星雲|星星吊飾/, (it, d, cx) => { Furn.puff('p_spark', it, cx, 4, { vy: -10 }); Furn.say(it, cx, '閃閃發亮'); }],
  [/圍巾/, (it, d, cx) => Furn.say(it, cx, '阿線織的，摸起來好暖')],
  [/櫻花/, (it, d, cx) => { Furn.puff('p_heart', it, cx, 2, { vy: 2, grav: 6 }); Furn.say(it, cx, '花瓣飄下來了'); }],
  [/聖誕襪/, (it, d, cx) => { const dec = new Date().getMonth() === 11; Furn.say(it, cx, dec ? '襪子裡有一顆糖果！' : '還沒到聖誕節，裡面空空的'); }],
  [/救生圈/, (it, d, cx) => Furn.say(it, cx, '房間應該不會淹水吧')],
  [/彩旗/, (it, d, cx) => { it.shake = 0.5; Furn.say(it, cx, '飄啊飄，今天也是好日子'); }],
  [/花圈/, (it, d, cx) => { Room.puff('p_dot', cx, it.y + 6, { vy: 4, grav: 30, max: 0.9 }); Furn.say(it, cx, '一顆松果掉下來了'); }],
  [/地圖/, (it, d, cx) => Furn.say(it, cx, Furn.pick('map', ['X 標記的地方是…冰箱', '這裡寫著「龍」', '有一條路畫歪了']))],
  [/刺繡|壁掛/, (it, d, cx) => { if (Math.random() < 0.5 && Furn.callPet(it, 'beg', '（想抓流蘇）')) return; Furn.say(it, cx, '一針一線都很可愛'); }],
  [/層架|層板|雙層架/, (it, d, cx) => { Room.puff('p_dot', cx, it.y + 2, { vy: 3, grav: 10, max: 1 }); Furn.say(it, cx, Furn.pick('shelf', ['擦掉一點灰塵', '上面可以再放點東西', '有點歪…扶正了'])); }],
  [/海報|油畫|畫|（|掛軸|構成|色塊|靜物|標本|夜景|彩虹|檸檬|鯨魚|雪山|夕陽/, (it, d, cx) => { it.shake = 0.3; Furn.say(it, cx, Furn.pick('art', ['畫歪了一點，扶正了', '越看越喜歡', '這幅畫叫做「' + d.n.replace(/[（・].*$/, '').replace('海報', '') + '」', '看久了好像會動'])); }],
  [/肉球/, (it, d, cx) => { if (!Furn.callPet(it, 'belly', '（翻肚）')) Furn.say(it, cx, '踩起來有肉球的感覺'); }],
  [/星座/, (it, d, cx) => Furn.say(it, cx, '今天的星座：' + Furn.pick('zod', ['獅子座', '雙魚座', '天秤座', '水瓶座', '巨蟹座']))],
  [/地毯|腳墊|地墊/, (it, d, cx) => { Room.puff('p_dot', cx, it.y + 2, { vy: -2, grav: 6, max: 0.8 }); if (Math.random() < 0.35 && Furn.callPet(it, 'belly', '（在地毯上打滾）')) return; if (Math.random() < 0.5) Furn.say(it, cx, Furn.pick('rug', ['踩起來軟軟的', '拍掉一點灰', '赤腳最舒服'])); }],
];

(function () {
  const inter = Game.interact.bind(Game);
  // the original handlers first; only items without any reaction come here
  const handled = (it, d) => !!(d.act || d.bowl || d.toggle || d.window || d.bed || d.seat || d.desk || d.chair || d.react || d.steam || it.k === 'guestbook' || Life.needOf('item', it.uid));
  Game.interact = function (it) {
    const d = ITEMS[it.k]; if (!d || handled(it, d)) return inter(it);
    it.shake = 0.25;
    const cv = Room.itemCanvas(it), cx = it.x + cv.width / 2, name = d.n || '';
    for (const [re, fn] of FURN_RULES) if (re.test(name)) { try { fn(it, d, cx); } catch (e) { console.warn('[furn]', e); } return; }
    return inter(it);
  };
})();

// ---------- music furniture while music plays: a small beat, little level bars, a coloured glow at night ----------
(function () {
  const beat = () => typeof Music !== 'undefined' && Music.playing;
  const di = Room.drawItem.bind(Room);
  Room.drawItem = function (c, it) {
    const d = ITEMS[it.k];
    if (!d || !d.music || !beat() || this.state !== Game.S) return di(c, it);
    // the whole speaker gives a 1-pixel bounce on the beat (about 112 bpm)
    const ph = (this.t * 1.87 + (it.uid || 0) * 0.13) % 1, up = ph < 0.18;
    if (up) { c.save(); c.translate(0, -1); }
    try { di(c, it); } finally { if (up) c.restore(); }
    // level bars above it, in pixel steps
    const cv = this.itemCanvas(it), x0 = Math.round(it.x + cv.width / 2 - 4), y0 = Math.round(it.y - 2);
    const cols = ['#f6c75a', '#ee8fa0', '#8cc068', '#7ea6dc'];
    for (let i = 0; i < 4; i++) {
      const hgt = 1 + Math.floor((Math.sin(this.t * (5.1 + i * 1.7) + i * 2 + (it.uid || 0)) * 0.5 + 0.5) * 3.99);
      c.fillStyle = cols[i]; c.fillRect(x0 + i * 2, y0 - hgt, 1, hgt);
    }
  };
  const cl = Room.collectLights.bind(Room);
  Room.collectLights = function () {
    const L = cl(); if (!beat() || this.state !== Game.S) return L;
    for (const it of this.state.items) {
      const d = ITEMS[it.k]; if (!d || !d.music) continue;
      const cv = this.itemCanvas(it), k = 0.35 + Math.max(0, Math.sin(this.t * 11.7)) * 0.25;
      L.push({ x: it.x + cv.width / 2, y: it.y + cv.height / 2, r: 18, col: Math.floor(this.t / 2.2) % 2 ? '#ee8fa0' : '#7ea6dc', k });
    }
    return L;
  };
  // tapping music furniture: the music window (and a few notes); the gramophone and record rack keep their own actions
  const inter = Game.interact.bind(Game);
  Game.interact = function (it) {
    const d = ITEMS[it.k];
    if (d && d.music && !/留聲機|唱片架/.test(d.n || '') && !d.act && !Life.needOf('item', it.uid)) {
      const cv = Room.itemCanvas(it), cx = it.x + cv.width / 2; it.shake = 0.25;
      for (let i = 0; i < 3; i++) Room.puff('p_note', cx - 2 + i * 3, it.y - 2, { vx: (i - 1) * 6, vy: -10 - i * 2, wob: 10, max: 1.8 });
      UI.openWin('music'); return;
    }
    return inter(it);
  };
})();

// ---------- a few items that only showed a bubble: now they also lead somewhere ----------
(function () {
  const inter = Game.interact.bind(Game);
  Game.interact = function (it) {
    const d = ITEMS[it.k]; if (!d || Life.needOf('item', it.uid)) return inter(it);
    const cv = Room.itemCanvas(it), cx = it.x + cv.width / 2;
    // the alarm clock: the time, and the pomodoro timer
    if (it.k === 'alarm_clock') { inter(it); setTimeout(() => UI.openWin('timer'), 600); return; }
    // the calendar: the date, how many days the streak is, then today's tasks
    if (d.calendar) { const n = new Date(); it.shake = 0.25; Game.bubbleAt(cx, it.y, `${n.getMonth() + 1} 月 ${n.getDate()} 日 星期${'日一二三四五六'[n.getDay()]}・單字連續 ${Learn.streakNow()} 天`, 2.6); setTimeout(() => UI.openTasks('daily'), 700); return; }
    // the TV: switching it on lands on a random channel
    if (d.tv) { const r = inter(it); if (it.on) Game.bubbleAt(cx, it.y, Furn.pick('tv', ['氣象：明天晴，適合曬棉被', '貓咪紀錄片', '料理節目在做鬆餅', '重播的老卡通', '深夜的英文廣播', '購物台在賣吸塵器']), 2.6); return r; }
    // wall clocks: the time and how long until the next 6 a.m. rollover
    if (d.clock && d.react === 'time') { const n = new Date(); let h = (30 - n.getHours()) % 24; if (h === 0 && n.getHours() >= 6) h = 24; it.shake = 0.25; Game.bubbleAt(cx, it.y, `現在 ${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}・離換日還有約 ${h} 小時`, 2.6); return; }
    return inter(it);
  };
})();

// cats only: tell the player once which dogs became cats (name, level, bond and tricks are kept)
setInterval(() => { try { const Z = Game.S && Game.S.zoo; if (!Z || !Z.dogsGone || !Z.dogsGone.length) return; const n = Z.dogsGone.slice(0, 3).join('、') + (Z.dogsGone.length > 3 ? ` 等 ${Z.dogsGone.length} 隻` : ''); delete Z.dogsGone; Game.save(); UI.toast(`小窩現在只住貓咪：${n}變成了貓咪，名字、等級和感情都還在`, 'i_paw', 6); } catch (e) { } }, 4000);
