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
  climbPet(it) {
    const p = (Game.pets || []).find(p => p.kind === 'cat' && p.data && !p.walking && !p.jump && !p.perchPause && !['eat', 'trick', 'hand', 'inbox', 'zoom'].includes(p.state) && !p.others().some(a => a.on === it || a.target === it.uid || a.climbItem === it));
    if (!p || Game.focusing()) return false;
    p.leaveSpot(() => {
      const spot = p.spots().find(s => s.it === it);
      if (spot) p.goSpot(spot, Math.random() < 0.7 ? 'sleep' : 'sit', 25 + Math.random() * 20);
    });
    return true;
  },
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
    if (F.drawer < 5 && Fun.once('dr' + it.uid) && Math.random() < 0.45) { F.drawer++; Game.reward(1, 0, 'raw'); Room.puff('p_coin', cx, it.y, { vy: -10 }); this.say(it, cx, this.pick('coin', [I18n.s("u_3b521b44a7b0"), I18n.s("u_f0e730a619cf"), I18n.s("u_1943b6a7c1cd")]), 2.4); Game.save(); return; }
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
      const n = new Date(), p2 = v => String(v).padStart(2, '0'), name = I18n.s("u_1305281730b7", [n.getFullYear(), p2(n.getMonth() + 1), p2(n.getDate()), p2(n.getHours()), p2(n.getMinutes())]);
      c.toBlob(b => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }, 'image/png');
      setTimeout(() => this.say(it, cx, this.pick('cam', [I18n.s("u_03f8c7a67952"), I18n.s("u_c356c54c5a18"), I18n.s("u_d902ed4edc5d")]), 2.4), 250);
      const p = this.pet(); if (p && p.state !== 'sleep') setTimeout(() => PetAI.act(p, 'stare', 1.4), 100);
    } catch (e) { this.say(it, cx, I18n.s("u_d952215fd5f8")); }
  },
  // ---------- the hourglass: one minute ----------
  hourglass(it, cx) {
    if (this.sand && this.sand.uid === it.uid) return this.say(it, cx, I18n.s("u_3f0a99f3796b", [Math.max(1, Math.ceil((this.sand.end - Date.now()) / 1000))]));
    this.sand = { uid: it.uid, end: Date.now() + 60e3 }; this.say(it, cx, I18n.s("u_6aecdc788715"));
    clearTimeout(this.sandT); this.sandT = setTimeout(() => { const u = this.sand && Room.uidMap[this.sand.uid]; this.sand = null; if (u) { const cv = Room.itemCanvas(u); Game.bubbleAt(u.x + cv.width / 2, u.y, I18n.s("u_5257e7e9ac7a"), 3); Room.puff('p_spark', u.x + cv.width / 2, u.y, { vy: -6 }); } }, 60e3);
  },
  fortune(it, cx) {
    const d = Life.today(), F = [I18n.s("u_0a8e14d15fbc"), I18n.s("u_4acc546c846d"), I18n.s("u_88483d0f3395"), I18n.s("u_535ffdd2d10c"), I18n.s("u_db20aed3a24b"), I18n.s("u_2eb348c271ef"), I18n.s("u_56a53acfdfeb"), I18n.s("u_673ab1d3da46")];
    let hsh = 0; for (const ch of d + ':' + it.k) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
    this.puff('p_spark', it, cx, 3); this.say(it, cx, I18n.s("u_dabb4124fd56") + F[hsh % F.length], 3.4);
  },
  loom(it, cx) {
    const s = this.st(); s.loom = (s.loom || 0) + 1; it.shake = 0.3;
    if (s.loom >= 20) { s.loom = 0; s.scarves = (s.scarves || 0) + 1; this.puff('p_heart', it, cx, 2); this.say(it, cx, I18n.s("u_ab27d65d535a", [s.scarves]), 3); }
    else this.say(it, cx, I18n.s("u_8fcd11b916ec", [s.loom]), 1.6);
    Game.save();
  },
  cube(it, cx) {
    const s = this.st(); s.cube = (s.cube || 0) + 1;
    if (Math.random() < 0.06) { this.puff('p_spark', it, cx, 5); this.say(it, cx, I18n.s("u_e96d24fd845f"), 3); }
    else this.say(it, cx, this.pick('cube', [I18n.s("u_b6af808377ea"), I18n.s("u_91ddca6197ac"), I18n.s("u_420a052a8d4c"), I18n.s("u_b4f3451b15a8")]));
  },
};
const DRAWER = [I18n.s("u_26b2d783838d"), I18n.s("u_8c9a94b9a0fe"), I18n.s("u_b856ec569861"), I18n.s("u_3db602b2b1de"), I18n.s("u_5a234245fbef"), I18n.s("u_19546fc5a1ca"), I18n.s("u_1865bded112c"), I18n.s("u_e327f4cc80df"), I18n.s("u_37f91afd6209")];

// what each kind of item does (matched on the item's name; the first match wins)
const FURN_RULES = [
  [/相機/, (it, d, cx) => Furn.photo(it, cx)],
  [/筆電|電腦|螢幕/, (it, d, cx) => {
    if (Game.focusing()) return Furn.say(it, cx, I18n.s("u_4ea5f630da80"));
    if (Math.random() < 0.12) return Furn.say(it, cx, Furn.pick('pc0', [I18n.s("u_915cb55c764e"), I18n.s("u_62d6b94d8d89"), I18n.s("u_d6dced575944"), I18n.s("u_d52b2963e2ff")]));
    const S = Game.S, L = Learn.L, fm = (S.stats && S.stats.fDay && S.stats.fDay.d === Life.today()) ? S.stats.fDay.m : 0;
    Furn.say(it, cx, I18n.s("u_f60656422cb2", [fm, L.dailyDone ? I18n.s("u_c0b3fbff51cc") : (L.reviewed || 0) + '/20', Learn.streakNow()]), 3.4);
  }],
  [/打字機/, (it, d, cx) => { Furn.puff('p_dot', it, cx, 3, { vy: -4 }); Furn.word(it, cx, v => I18n.s("u_c29e50921225", [v.w, v.z.split('；')[0]])); }],
  [/書櫃|書架|一疊書|精裝書|筆記本/, (it, d, cx) => {
    if (Math.random() < 0.15) { Room.puff('p_dot', cx, it.y + 4, { vy: 4, grav: 30, max: 0.8 }); return Furn.say(it, cx, Furn.pick('book0', [I18n.s("u_c09625ac5644"), I18n.s("u_04a22add0398"), I18n.s("u_39dfce765440")])); }
    Furn.word(it, cx, v => I18n.s("u_e92a499763bc", [v.w, v.z.split('；')[0]]));
  }],
  [/留聲機/, (it, d, cx) => { if (!Music.cur && !Game.S.music.list.length) return Furn.say(it, cx, I18n.s("u_3759082231fd")); Music.toggle(); setTimeout(() => Furn.say(it, cx, Music.playing ? I18n.s("u_71271274115f") : I18n.s("u_be1a4a00f5ba")), 400); Furn.puff('p_note', it, cx, 2); }],
  [/唱片架/, (it, d, cx) => { if (!Music.cur) return Furn.say(it, cx, I18n.s("u_aa9f85269c5d")); Music.next(true); Furn.puff('p_note', it, cx, 2); Furn.say(it, cx, I18n.s("u_2d386f4230df")); }],
  [/衣櫃|衣帽架/, (it, d, cx) => { Furn.say(it, cx, Furn.pick('ward', [I18n.s("u_66bf1fe6bfa4"), I18n.s("u_de9dfb78e871"), I18n.s("u_030fb31699ed")])); setTimeout(() => UI.openWin('avatar'), 500); }],
  [/相框/, (it, d, cx) => { const p = Pets.home ? Pets.home()[0] : null; Furn.say(it, cx, Furn.pick('frame', [I18n.s("u_0ad57393dbe4"), p ? I18n.s("u_ab618349e634", [p.name]) : I18n.s("u_c3a8e80eb0b4"), I18n.s("u_2445e2dd64d8"), I18n.s("u_f17b03d7fe2d")])); }],
  [/鏡/, (it, d, cx) => { const A = Game.avatar; if (A) A.happy = 1.5; Furn.puff('p_spark', it, cx, 2); Furn.say(it, cx, Furn.pick('mirror', [I18n.s("u_8696e9bdddc4"), I18n.s("u_0d4efe2dfeef"), I18n.s("u_63015f4ae240"), I18n.s("u_cb6222ac661f"), I18n.s("u_d41cfc9aa823")])); }],
  [/留言板/, (it, d, cx) => { Furn.say(it, cx, I18n.s("u_2bf136cf9f30")); setTimeout(() => UI.openWin('memo'), 400); }],
  [/獎狀/, (it, d, cx) => { const n = Object.keys(Game.S.vocab || {}).length; Furn.puff('p_spark', it, cx, 3); Furn.say(it, cx, I18n.s("u_a82eceea143a", [n]), 3); }],
  [/肖像/, (it, d, cx) => { const p = Pets.home ? Pets.home()[0] : null; Furn.say(it, cx, p ? I18n.s("u_447ffe218172", [p.name]) : I18n.s("u_6a4b20c60393")); }],
  [/雨傘/, (it, d, cx) => Furn.say(it, cx, Room.env && Room.env.rain ? I18n.s("u_63120cc0f718") : Furn.pick('umb', [I18n.s("u_fb6c90415f30"), I18n.s("u_7cfcb4f56e53"), I18n.s("u_3a907b720138")]))],
  [/貓跳台|貓咪別墅/, (it, d, cx) => { if (!Furn.climbPet(it)) Furn.say(it, cx, I18n.s("u_de857703bc3f")); }],
  [/貓抓/, (it, d, cx) => { if (!Furn.callPet(it, 'scratch', I18n.s("u_8cf360cf0d09"))) Furn.say(it, cx, I18n.s("u_de857703bc3f")); }],
  [/寵物窩|狗屋/, (it, d, cx) => { if (!Furn.callPet(it, 'knead', I18n.s("u_b5d7570da46d"))) Furn.say(it, cx, I18n.s("u_5fbbe3c6d4d6")); }],
  [/紙箱/, (it, d, cx) => { if (Math.random() < 0.6 && Furn.callPet(it, 'stare', I18n.s("u_3cd3ccd701b0"))) return; Furn.say(it, cx, Furn.pick('box', [I18n.s("u_b57bc7db4fb2"), I18n.s("u_21d3c3c7c868"), I18n.s("u_cee6c6af7d5a")])); }],
  [/毛線籃/, (it, d, cx) => { Room.puff('p_dot', cx, it.y + 4, { vx: 18, vy: -2, grav: 20, max: 1 }); if (!Furn.callPet(it, 'beg', I18n.s("u_9672d1022225"))) Furn.say(it, cx, I18n.s("u_f99dcdda5f19")); else Furn.say(it, cx, I18n.s("u_3dc853620916")); }],
  [/坐墊|座布團|抱枕|坐墩|大地墊/, (it, d, cx) => { Furn.puff('p_heart', it, cx, 1); if (Math.random() < 0.5 && Furn.callPet(it, 'knead', I18n.s("u_be85f699527a"))) return; Furn.say(it, cx, Furn.pick('cush', [I18n.s("u_0ea409966822"), I18n.s("u_405c8690f029"), I18n.s("u_4faefd09e8d9")])); }],
  [/床頭櫃|五斗櫃|矮櫃|高櫃|格子櫃|餐邊櫃|電視櫃/, (it, d, cx) => Furn.coinFind(it, cx, DRAWER)],
  [/茶几|矮桌|邊几|邊桌/, (it, d, cx) => { Furn.puff('p_spark', it, cx, 2); Furn.say(it, cx, Furn.pick('table', [I18n.s("u_af159ecdec56"), I18n.s("u_bfb36576d848"), I18n.s("u_8c2f925e56b1"), I18n.s("u_615f6d3d2cd3")])); }],
  [/花台/, (it, d, cx) => { Furn.puff('p_leaf', it, cx, 2); Furn.say(it, cx, I18n.s("u_fe40b22f7562")); }],
  [/柴火/, (it, d, cx) => { Furn.puff('p_spark', it, cx, 3, { vy: -10 }); Furn.say(it, cx, Furn.pick('wood', [I18n.s("u_c6475f8492cb"), I18n.s("u_ff3b881c38e9"), I18n.s("u_975069946351")])); }],
  [/衝浪板/, (it, d, cx) => Furn.say(it, cx, Furn.pick('surf', [I18n.s("u_2db3b84bbfc7"), I18n.s("u_e65ffc175f39"), I18n.s("u_e188efbb5348")]))],
  [/洗衣籃/, (it, d, cx) => Furn.say(it, cx, Furn.pick('laun', [I18n.s("u_ca773448b2ea"), I18n.s("u_2ab500e8c71e"), I18n.s("u_d7386be14f6a")]))],
  [/皮箱/, (it, d, cx) => Furn.say(it, cx, I18n.s("u_21568baee840") + Furn.pick('trip', [I18n.s("u_58d07b8a6951"), I18n.s("u_4d68ecd171eb"), I18n.s("u_3f52b57ed83a"), I18n.s("u_089dd4929e65"), I18n.s("u_ad387be994ea"), I18n.s("u_8266f1e95e8c")]) + I18n.s("u_5dd8ea29bdd7"))],
  [/冰淇淋/, (it, d, cx) => { Furn.puff('p_heart', it, cx, 1); Furn.say(it, cx, I18n.s("u_51b9950286df") + Furn.pick('ice', [I18n.s("u_2086cb1986fb"), I18n.s("u_fa67a660d4b7"), I18n.s("u_c76f6a79f6db"), I18n.s("u_a3f19bd8af31"), I18n.s("u_73b9e5c79733"), I18n.s("u_c8f9ad40cd1e")])); }],
  [/望遠鏡/, (it, d, cx) => { const night = Room.env && Room.env.dark > 0.4; if (night) Furn.puff('p_spark', it, cx, 3, { vy: -12 }); Furn.say(it, cx, night ? I18n.s("u_e9c1d165955b") + Furn.pick('star', [I18n.s("u_9105f1643670"), I18n.s("u_62fc864df990"), I18n.s("u_6c9bd18ac481"), I18n.s("u_51e6b435222f")]) : I18n.s("u_b767f3fb8357")); }],
  [/織布機/, (it, d, cx) => Furn.loom(it, cx)],
  [/魔術方塊/, (it, d, cx) => Furn.cube(it, cx)],
  [/沙漏/, (it, d, cx) => Furn.hourglass(it, cx)],
  [/水晶/, (it, d, cx) => Furn.fortune(it, cx)],
  [/地球儀/, (it, d, cx) => { it.shake = 0.6; Furn.say(it, cx, I18n.s("u_68477f125946") + Furn.pick('globe', [I18n.s("u_4d68ecd171eb"), I18n.s("u_7726b81ea662"), I18n.s("u_2966709e8e38"), I18n.s("u_4eafa8df8dbd"), I18n.s("u_c6659d550797"), I18n.s("u_cf2abf0c5be3"), I18n.s("u_6930e3f7dd59")]) + I18n.s("u_6f85954e99b6")); }],
  [/遊戲機/, (it, d, cx) => Furn.say(it, cx, Math.random() < 0.3 ? I18n.s("u_58ab64933f4a") : Furn.pick('game', ['GAME OVER', I18n.s("u_0d496cf99021"), I18n.s("u_94d856f4946f")]))],
  [/火箭/, (it, d, cx) => { Furn.puff('p_steam', it, cx, 3, { vy: -3 }); Furn.say(it, cx, I18n.s("u_7da8a341cabe")); }],
  [/機器人/, (it, d, cx) => Furn.say(it, cx, Furn.pick('robot', [I18n.s("u_9f4c6d99ab25"), I18n.s("u_d2d3e99d39e1"), I18n.s("u_10775860e750")]))],
  [/積木/, (it, d, cx) => Furn.say(it, cx, Furn.pick('blocks', [I18n.s("u_3fd8c0f2c5d4"), I18n.s("u_88531ad2707e"), I18n.s("u_f979fcbc3037")]))],
  [/玩偶/, (it, d, cx) => { Furn.puff('p_heart', it, cx, 1); Furn.say(it, cx, Furn.pick('doll', [I18n.s("u_7f6923adac65"), I18n.s("u_13f210349854"), I18n.s("u_289907090111")])); }],
  [/縫紉機/, (it, d, cx) => Furn.say(it, cx, Furn.pick('sew', [I18n.s("u_ed6ba644f702"), I18n.s("u_de22b32fc364"), I18n.s("u_664d59369738")]))],
  [/香水/, (it, d, cx) => { Furn.puff('p_spark', it, cx, 2); Furn.say(it, cx, I18n.s("u_7287568bf0f6")); }],
  [/筆筒/, (it, d, cx) => Furn.say(it, cx, Furn.pick('pen', [I18n.s("u_838c26d627a3"), I18n.s("u_bad774c331f6"), I18n.s("u_e43c134dfa31")]))],
  [/餅乾罐/, (it, d, cx) => Furn.say(it, cx, Furn.pick('cookie', [I18n.s("u_b1a6eb3c0069"), I18n.s("u_69e5a3d86077"), I18n.s("u_7449575d2347")]))],
  [/糖果/, (it, d, cx) => Furn.say(it, cx, I18n.s("u_005d73215217") + Furn.pick('candy', [I18n.s("u_c76f6a79f6db"), I18n.s("u_5e3cd6bef7d2"), I18n.s("u_ae86f9a1daef"), I18n.s("u_288f23db4f71")]) + I18n.s("u_3d9efa2a77cb"))],
  [/奶茶|咖啡/, (it, d, cx) => { Furn.puff('p_steam', it, cx, 2); Furn.say(it, cx, Furn.pick('drink', [I18n.s("u_15fe7b668f78"), I18n.s("u_1f5479b3a979"), I18n.s("u_17676a87c671")])); }],
  [/蛋糕|甜甜圈|馬卡龍|點心|水果盤|布丁/, (it, d, cx) => { Furn.puff('p_heart', it, cx, 1); if (Math.random() < 0.4 && Furn.callPet(it, 'beg', I18n.s("u_bde2327b74e3"))) return; Furn.say(it, cx, Furn.pick('cake', [I18n.s("u_9c78951dd2cd"), I18n.s("u_f406c2cc95fc"), I18n.s("u_467303546e85")])); }],
  [/盆景|苔蘚|小盆苗|常春藤/, (it, d, cx) => { Furn.puff('p_leaf', it, cx, 2); Furn.say(it, cx, Furn.pick('moss', [I18n.s("u_c23ca38f7709"), I18n.s("u_d9be395f189e"), I18n.s("u_853a820763e9")])); }],
  [/懷錶/, (it, d, cx) => { const n = new Date(); Furn.say(it, cx, I18n.s("u_7042490f8faf", [n.getHours(), String(n.getMinutes()).padStart(2, '0')])); }],
  [/星星球|星雲|星星吊飾/, (it, d, cx) => { Furn.puff('p_spark', it, cx, 4, { vy: -10 }); Furn.say(it, cx, I18n.s("u_754e3db79dad")); }],
  [/圍巾/, (it, d, cx) => Furn.say(it, cx, I18n.s("u_7a602b0d11d9"))],
  [/櫻花/, (it, d, cx) => { Furn.puff('p_heart', it, cx, 2, { vy: 2, grav: 6 }); Furn.say(it, cx, I18n.s("u_cb7525cb68d2")); }],
  [/聖誕襪/, (it, d, cx) => { const dec = new Date().getMonth() === 11; Furn.say(it, cx, dec ? I18n.s("u_d1af9e73ba45") : I18n.s("u_167fcafcb453")); }],
  [/救生圈/, (it, d, cx) => Furn.say(it, cx, I18n.s("u_42b92fe70a14"))],
  [/彩旗/, (it, d, cx) => { it.shake = 0.5; Furn.say(it, cx, I18n.s("u_3b3ef26fd581")); }],
  [/花圈/, (it, d, cx) => { Room.puff('p_dot', cx, it.y + 6, { vy: 4, grav: 30, max: 0.9 }); Furn.say(it, cx, I18n.s("u_ee30f94742a3")); }],
  [/地圖/, (it, d, cx) => Furn.say(it, cx, Furn.pick('map', [I18n.s("u_6cdd87ffb487"), I18n.s("u_20d3b571d51a"), I18n.s("u_5a48260c5c49")]))],
  [/刺繡|壁掛/, (it, d, cx) => { if (Math.random() < 0.5 && Furn.callPet(it, 'beg', I18n.s("u_b24fe47e7577"))) return; Furn.say(it, cx, I18n.s("u_35e9d2904683")); }],
  [/層架|層板|雙層架/, (it, d, cx) => { Room.puff('p_dot', cx, it.y + 2, { vy: 3, grav: 10, max: 1 }); Furn.say(it, cx, Furn.pick('shelf', [I18n.s("u_718c075701fe"), I18n.s("u_3c546c79b9bc"), I18n.s("u_191ebc0dcd8c")])); }],
  [/海報|油畫|畫|（|掛軸|構成|色塊|靜物|標本|夜景|彩虹|檸檬|鯨魚|雪山|夕陽/, (it, d, cx) => { it.shake = 0.3; Furn.say(it, cx, Furn.pick('art', [I18n.s("u_a1a87ef20b8b"), I18n.s("u_ff001f5e28b6"), I18n.s("u_77f1240f154a") + d.n.replace(/[（・].*$/, '').replace(I18n.s("u_a51d68a80407"), '') + '」', I18n.s("u_1f46341c378c")])); }],
  [/肉球/, (it, d, cx) => { if (!Furn.callPet(it, 'belly', I18n.s("u_75976a6b49f4"))) Furn.say(it, cx, I18n.s("u_960bdd4f78c3")); }],
  [/星座/, (it, d, cx) => Furn.say(it, cx, I18n.s("u_30ceeed733af") + Furn.pick('zod', [I18n.s("u_37c1e8566fc4"), I18n.s("u_046090971235"), I18n.s("u_c5688053bf09"), I18n.s("u_58875fd256e2"), I18n.s("u_760c9714ff38")]))],
  [/地毯|腳墊|地墊/, (it, d, cx) => { Room.puff('p_dot', cx, it.y + 2, { vy: -2, grav: 6, max: 0.8 }); if (Math.random() < 0.35 && Furn.callPet(it, 'belly', I18n.s("u_65715148d340"))) return; if (Math.random() < 0.5) Furn.say(it, cx, Furn.pick('rug', [I18n.s("u_559afb28a24e"), I18n.s("u_1e9391b8d8b1"), I18n.s("u_07739aa6f700")])); }],
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
      L.push({ x: it.x + cv.width / 2, y: it.y + cv.height / 2, r: 18, col: Math.floor(this.t / 2.2) % 2 ? 'pink' : 'cool', k });
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
    if (d.calendar) { const n = new Date(); it.shake = 0.25; Game.bubbleAt(cx, it.y, I18n.s("u_d0df094a2d0c", [n.getMonth() + 1, n.getDate(), I18n.s("u_006148fb6253")[n.getDay()], Learn.streakNow()]), 2.6); setTimeout(() => UI.openTasks('daily'), 700); return; }
    // the TV: switching it on lands on a random channel
    if (d.tv) { const r = inter(it); if (it.on) Game.bubbleAt(cx, it.y, Furn.pick('tv', [I18n.s("u_d73cb574ccec"), I18n.s("u_bcfcfbd5a905"), I18n.s("u_7f0caf5ef5cc"), I18n.s("u_4109deb99839"), I18n.s("u_a95bd30e7f1c"), I18n.s("u_213f4327e41e")]), 2.6); return r; }
    // wall clocks: the time and how long until the next 6 a.m. rollover
    if (d.clock && d.react === 'time') { const n = new Date(); let h = (30 - n.getHours()) % 24; if (h === 0 && n.getHours() >= 6) h = 24; it.shake = 0.25; Game.bubbleAt(cx, it.y, I18n.s("u_4dff6e49b5d0", [String(n.getHours()).padStart(2, '0'), String(n.getMinutes()).padStart(2, '0'), h]), 2.6); return; }
    return inter(it);
  };
})();

// cats only: tell the player once which dogs became cats (name, level, bond and tricks are kept)
setInterval(() => { try { const Z = Game.S && Game.S.zoo; if (!Z || !Z.dogsGone || !Z.dogsGone.length) return; const n = Z.dogsGone.slice(0, 3).join('、') + (Z.dogsGone.length > 3 ? I18n.s("u_6afc435521cd", [Z.dogsGone.length]) : ''); delete Z.dogsGone; Game.save(); UI.toast(I18n.s("u_db20f1b57266", [n]), 'i_paw', 6); } catch (e) { } }, 4000);

(function () {
  const interact = Game.interact.bind(Game);
  Game.interact = function (it) { UI.clearBubbles('furniture'); return interact(it); };
})();
