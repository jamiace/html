/* ============================================================
   Lights: the room has its own little day
   - coming back (opening the game, or returning after 10 minutes or more): the lights come on and
     the room reacts to you; how it reacts depends on how long you were away
       10 min – 1 h  the pets look up at you, the owner turns round
       1 – 6 h       the pets were napping: they yawn, stretch and come over; the owner stretches
       6 h or more   the room is dark, the light clicks on, the owner wakes up in bed (morning: curtains open)
   - while you were away the room went on: the pets moved (asleep on the bed, on your chair...),
     paw prints on the floor, a leaf under the plant; now and then a little note says what happened
   - left alone for 30 minutes (never while focusing): the room winds down, lights dim, music softens,
     everyone dozes off; any touch wakes it up again
   - good night: tap the bed at night (or the "good night" row on the phone): everyone goes to sleep,
     the lamps go off one by one; the next visit starts from the dark room
   - another device opened the account: the lights go off here with a "continue here" button
   Nothing here is uploaded: the times live in this device's storage only.
   ============================================================ */
const LIGHTS = { awayMs: 10 * 60e3, napMs: 60 * 60e3, longMs: 6 * 3600e3, idleMs: 30 * 60e3, seenKey: 'pocketnook.seen', nightKey: 'pocketnook.night', noteKey: 'pocketnook.note' };

const Lights = {
  dark: 0, target: 0, lamp: 1, lampTarget: 1, stepAt: 0, mode: 'on', busy: false, lastInput: Date.now(), traces: [],
  store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } },
  seen() { this.store(LIGHTS.seenKey, Date.now()); },
  ready() { return !!(Game.S && Game.avatar && Room.state === Game.S); },
  // ---------- light level: eased for dimming, in three pixel steps for the switch ----------
  setDark(v, snap) { this.target = v; if (snap) this.dark = v; },
  click(on) {
    // a lamp switch: three quick steps, a soft tick
    const from = this.dark, to = on ? 0 : 0.8; this.target = to; this.stepping = { from, to, t: 0 };
    this.lampTarget = on ? 1 : 0; if (on) this.lamp = 1;
    this.tick(); this.sound(on);
  },
  sound(on) {
    if (Game.S.settings.chime === false) return;
    try {
      const A = this.ac || (this.ac = new (window.AudioContext || window.webkitAudioContext)()); if (A.state === 'suspended') A.resume();
      const o = A.createOscillator(), g = A.createGain(), t0 = A.currentTime;
      o.type = 'triangle'; o.frequency.setValueAtTime(on ? 1800 : 1300, t0); o.frequency.exponentialRampToValueAtTime(on ? 900 : 600, t0 + 0.05);
      g.gain.setValueAtTime(0.05, t0); g.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.09); o.connect(g); g.connect(A.destination); o.start(t0); o.stop(t0 + 0.1);
    } catch (e) { }
  },
  frame(dt) {
    if (this.stepping) {
      const s = this.stepping; s.t += dt; const k = Math.min(1, Math.floor(s.t / 0.07) / 3);
      this.dark = s.from + (s.to - s.from) * k; if (k >= 1) this.stepping = null;
    } else {
      const sp = this.mode === 'dim' ? 0.012 : 0.6; const d = this.target - this.dark;
      this.dark += Math.sign(d) * Math.min(Math.abs(d), sp * dt);
    }
    const ld = this.lampTarget - this.lamp; this.lamp += Math.sign(ld) * Math.min(Math.abs(ld), (this.mode === 'dim' ? 0.015 : 1.2) * dt);
    if (this.mode === 'dim' && this.musicK != null) this.music(Math.max(0.35, this.musicK - dt * 0.01));
  },
  tick() { },
  music(k) {
    this.musicK = k; const M = Game.S.music; if (typeof Music === 'undefined' || !M) return;
    try { if (Music.audio) Music.audio.volume = M.vol * k; if (Music.yt && Music.ytReady) Music.yt.setVolume(Math.round(M.vol * k * 100)); } catch (e) { }
  },
  musicBack() { if (this.musicK != null) { this.music(1); this.musicK = null; } },
  // ---------- who is in the room ----------
  pets() { return (Game.pets || []).filter(p => p && p.data); },
  bed() { const beds = itemsWith('bed'); return beds.find(b => ActorVisibility.furnSafe(Game.avatar, b, 'sleep')) || beds[0] || null; },
  canMove() { return this.ready() && !Room.edit && !(typeof TrickShow !== 'undefined' && TrickShow.cur) && !(typeof PetPlay !== 'undefined' && PetPlay.held); },
  // ---------- coming back ----------
  // kind: 'open' | 'return' | 'idle' | 'night' | 'resume'; away in ms
  async wake(kind, away) {
    if (this.busy || this.mode === 'paused') return; this.busy = true;
    try {
      const night = this.store(LIGHTS.nightKey), dimmed = this.mode === 'dim' || this.mode === 'night';
      const tier = kind === 'idle' ? 'idle' : kind === 'night' || night ? 'morning' : away >= LIGHTS.longMs || this.crossed6(away) ? 'morning' : away >= LIGHTS.napMs ? 'nap' : 'peek';
      const startDark = tier === 'morning' || dimmed || kind === 'resume';
      if (startDark) { this.setDark(0.8, true); this.lamp = this.lampTarget = 0; }
      // the newest progress first (a cloud save may still be loading, another device may be handing over)
      await this.cloudSettled();
      if (!this.ready()) { this.setDark(0, true); this.lamp = this.lampTarget = 1; return; }
      const focusing = Game.focusing();
      if (!focusing && !this.first && this.canMove() && (tier === 'nap' || tier === 'morning')) this.leaveTraces(away, tier);
      if (!focusing && this.canMove() && tier === 'morning') this.ownerInBed();
      if (startDark) await this.wait(kind === 'resume' ? 250 : 420);
      this.restoreLamps(); this.mode = 'on'; this.musicBack();
      if (startDark) this.click(true); else { this.setDark(0); this.lamp = this.lampTarget = 1; }
      if (tier === 'morning' && this.morning()) this.openCurtains();
      if (!focusing && this.canMove()) this.react(tier);
      else if (focusing) for (const p of this.pets()) if (p.state !== 'sleep' && !p.walking) PetAI.act(p, 'stare', 1.6);
      if (!this.first && kind !== 'resume' && kind !== 'idle' && away >= LIGHTS.awayMs) setTimeout(() => this.maybeNote(away, tier), tier === 'peek' ? 1400 : 3200);
    } finally { this.busy = false; this.first = false; this.lastInput = Date.now(); }
  },
  wait(ms) { return new Promise(r => setTimeout(r, ms)); },
  async cloudSettled() {
    const t0 = Date.now(); await this.wait(150);
    while (Date.now() - t0 < 4500 && typeof Cloud !== 'undefined' && (Cloud.status === 'loading' || Cloud.resuming)) await this.wait(120);
  },
  crossed6(away) { const now = new Date(), b = new Date(now); b.setHours(6, 0, 0, 0); if (now < b) b.setDate(b.getDate() - 1); return Date.now() - away < b.getTime() && away >= 2 * 3600e3; },
  morning() { const h = new Date().getHours(); return h >= 6 && h < 11; },
  isNight() { const h = new Date().getHours(); return h >= 20 || h < 5; },
  openCurtains() { let n = 0; for (const it of Room.state.items) if (ITEMS[it.k] && ITEMS[it.k].window && it.closed) { it.closed = false; n++; } if (n) Game.save(); },
  ownerInBed() {
    const A = Game.avatar, bed = this.bed(); if (!A || !bed || A.state === 'work' || A.walking) return;
    A.stand(); const [w, h] = itemSize(bed); A.x = bed.x + w / 2; A.y = bed.y + h + 3; A.state = 'sleep'; A.bed = bed; A.timer = 1e6;
  },
  // ---------- the room's reaction ----------
  react(tier) {
    const A = Game.avatar, t = Room.t;
    const hi = this.greet(tier);
    if (A && !A.walking) {
      if (A.state === 'sleep') {
        // wakes up, sits up for a moment, then a big standing stretch
        setTimeout(() => { if (A.state !== 'sleep') return; A.stand(); A.timer = 4; Game.bubble(A, tier === 'morning' && this.morning() ? '嗯…早安！' : '嗯…你回來啦', 2.2); setTimeout(() => this.stretch(A), 900); }, 500);
      } else if (A.state === 'idle') {
        if (tier === 'peek') { A.lp = { at: t, end: t + 1.6, frame: () => 'front0' }; A.happy = 1.4; setTimeout(() => Game.bubble(A, hi, 2.2), 250); }
        else { A.face = 'front'; setTimeout(() => this.stretch(A, hi), 300); }
      } else if (A.state === 'sit') { A.happy = 1.6; setTimeout(() => Game.bubble(A, hi, 2.2), 300); }
    }
    let i = 0;
    for (const p of this.pets()) {
      const d = 250 + (i++) * 380;
      setTimeout(() => {
        if (p.walking || p.jump || ['eat', 'zoom', 'trick', 'hand', 'inbox'].includes(p.state)) return;
        const sleeping = p.state === 'sleep';
        if (tier === 'peek') {
          // a nap stays a nap half of the time: they just lift their head
          if (sleeping && Math.random() < 0.5) { Room.puff('p_z', p.x + 4, p.y - 16, { vx: 3, vy: -5, max: 1.4, alpha: 0.8 }); return; }
          PetAI.act(p, 'stare', 1.8 + Math.random() * 0.6); Room.puff('p_spark', p.x + (p.flip ? -4 : 4), p.y - 20, { vy: -6, max: 0.6 });
          return;
        }
        const come = () => { if (p.walking || p.state !== 'sit') return; const A2 = Game.avatar, tx = A2 ? A2.x + (p.x > A2.x ? 14 : -14) : p.x, ty = Math.min(166, (A2 ? A2.y : p.y) + 4); p.walkTo(tx, ty, () => { p.state = 'sit'; PetAI.act(p, 'stare', 2.2); Room.puff('p_heart', p.x - 2, p.y - 18, { vy: -8 }); if (Math.random() < 0.6) Game.bubble(p, p.kind === 'dog' ? '汪！' : '喵～', 1.6); }); };
        const up = () => PetAI.act(p, 'yawn', 1.4, () => PetAI.act(p, 'stretch', 1.6, () => { if (p.on) p.leaveSpot(come); else come(); }));
        if (sleeping) up(); else PetAI.act(p, 'stare', 1.4, up);
      }, d);
    }
  },
  stretch(A, say) {
    if (!A || A.walking || A.state !== 'idle') return;
    const t = Room.t; A.lp = { at: t, end: t + 2.4, eyes: 'closed', frame: k => k < 0.2 ? 'front0' : k < 1.9 ? (Math.floor(k * 1.6) % 2 ? 'cheer1' : 'cheer0') : 'front0' };
    setTimeout(() => { if (A.state === 'idle') { A.happy = 1.6; if (say) Game.bubble(A, say, 2.2); } }, 2300);
  },
  greet(tier) {
    const h = new Date().getHours(), part = h < 5 ? 'late' : h < 11 ? 'morning' : h < 14 ? 'noon' : h < 18 ? 'after' : h < 22 ? 'eve' : 'late';
    const L = {
      peek: ['你回來啦', '嗨～', '等你好久了', '剛好想到你'],
      nap: ['你回來啦！', '睡了一個好覺', '剛剛好安靜喔', '歡迎回來～'],
      morning: { morning: ['早安！', '今天也慢慢來', '睡飽了嗎？'], noon: ['午安～', '吃飯了嗎？'], after: ['午安，你來了', '下午好'], eve: ['晚上好', '今天辛苦了'], late: ['這麼晚還來看我們', '夜深了，別太累喔'] },
      idle: ['嗯…睡著了', '你還在呀', '剛剛打了個盹'],
    }[tier] || ['你回來啦'];
    const list = Array.isArray(L) ? L : (L[part] || L.morning);
    return list[Math.floor(Math.random() * list.length)];
  },
  // ---------- traces of the time away ----------
  leaveTraces(away, tier) {
    this.traces.forEach(t => t.gone = true); this.traces = [];
    const pets = this.pets();
    for (const p of pets) {
      if (p.walking || p.jump || ['eat', 'trick', 'hand', 'inbox'].includes(p.state)) continue;
      const from = [p.x, p.y]; p.leaveSpot && (p.on = null, p.onOff = null);
      const sp = p.freeSpots(), r = Math.random();
      if (sp.length && r < 0.7) {
        const s = sp[Math.floor(Math.random() * sp.length)];
        p.x = s.x; p.y = s.y + (s.high ? 1 : 2); p.on = s.it; p.onOff = [p.x - s.it.x, p.y - s.it.y];
      } else { const [x, y] = randFloor(14); p.x = x; p.y = y; }
      p.state = 'sleep'; p.timer = 30 + Math.random() * 30; p.walking = false;
      if (Math.random() < 0.6) this.addTrace(new PawTrail(from, [p.on ? Math.min(166, p.on.y + itemSize(p.on)[1] + 3) : p.y, p.x], p));
    }
    // a leaf under one plant, a tuft of fur on a seat
    const plants = Room.state.items.filter(it => ITEMS[it.k] && ITEMS[it.k].react === 'rustle' && ITEMS[it.k].layer === 'floor');
    if (plants.length && Math.random() < 0.55) { const pl = plants[Math.floor(Math.random() * plants.length)], [w, h] = itemSize(pl); this.addTrace(new Leaf(pl.x + w / 2 + (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 6), Math.min(166, pl.y + h + 1))); }
    const seats = itemsWith('chair').concat(itemsWith('bed'));
    if (pets.length && seats.length && Math.random() < 0.45) { const s = seats[Math.floor(Math.random() * seats.length)], [w] = itemSize(s), p = pets[Math.floor(Math.random() * pets.length)]; this.addTrace(new Fur(s, Math.round(w * (0.3 + Math.random() * 0.4)), p)); }
  },
  addTrace(t) { this.traces.push(t); Room.actors.push(t); },
  // ---------- an occasional note ----------
  maybeNote(away, tier) {
    if (!this.ready() || Game.focusing() || this.mode !== 'on') return;
    const last = this.store(LIGHTS.noteKey) || {}, now = Date.now();
    if (last.at && now - last.at < 3 * 3600e3) return;
    const chance = tier === 'peek' ? 0.15 : tier === 'nap' ? 0.4 : 0.55;
    if (Math.random() > chance) return;
    const text = this.noteText(away, tier, last.ids || []); if (!text) return;
    this.store(LIGHTS.noteKey, { at: now, ids: [...(last.ids || []).slice(-14), text.id] });
    this.showNote(text.t);
  },
  noteText(away, tier, used) {
    const pets = Pets.home ? Pets.home() : [], P = pets[Math.floor(Math.random() * pets.length)], P2 = pets.find(x => x !== P);
    const nm = P ? P.name : '', dog = P && P.sp && P.sp.startsWith('dog'), cry = dog ? '汪' : '喵';
    const items = Room.state.items, has = f => items.find(it => ITEMS[it.k] && f(ITEMS[it.k], it)), name = it => it ? ITEMS[it.k].n : '';
    const bed = has(d => d.bed), win = has(d => d.window), plant = has(d => d.react === 'rustle'), rug = has(d => d.layer === 'rug'), bowl = has(d => d.bowl), chair = has(d => d.chair), lamp = has(d => d.toggle && d.light), desk = has(d => d.desk);
    const h = new Date().getHours(), rain = Room.env && Room.env.rain, hrs = away / 3600e3;
    const dur = hrs < 1 ? `${Math.max(10, Math.round(away / 60e3 / 5) * 5)} 分鐘` : hrs < 24 ? `${Math.round(hrs)} 個小時` : `${Math.round(hrs / 24)} 天`;
    const naps = Math.max(1, Math.min(9, Math.round(hrs * 1.5)));
    const T = [
      ['bed1', P && bed, `你不在的時候，${nm}在${name(bed)}上睡了好久，起來還伸了一個大懶腰。`],
      ['win1', P && win, `${nm}在窗邊坐了好一陣子，好像在數經過的雲。`],
      ['win2', P && win && h >= 17, `天色暗下來的時候，${nm}一直望著窗外，大概在等你。`],
      ['rug1', P && rug, `${nm}把${name(rug)}的角踩得皺皺的，然後若無其事地走開了。`],
      ['door1', P, `門外有腳步聲經過，${nm}豎起耳朵聽了好久，發現不是你。`],
      ['bug1', P, `${nm}追著一隻小飛蟲繞了房間好幾圈，最後放棄了。`],
      ['two1', P && P2, `${nm}和${P2 && P2.name}擠在一起睡午覺，誰也不讓誰。`],
      ['two2', P && P2, `${P2 && P2.name}偷偷玩了${nm}的玩具，被發現後假裝在睡覺。`],
      ['chair1', P && chair, `${nm}在你的${name(chair)}上留下了一撮毛，那是牠的位子了。`],
      ['step1', P, `${nm}好像聽得出你的腳步聲，剛剛比你先跑到門口。`],
      ['sun1', P && h >= 6 && h < 12, `早上的陽光照到${nm}的鼻子，牠打了一個小噴嚏。`],
      ['night1', P && (h >= 22 || h < 5), `晚上很安靜，${nm}守著小窩，等你回來。`],
      ['bowl1', P && bowl, `${nm}把${name(bowl)}推到房間中間，好像在提醒什麼。`],
      ['plant1', plant, `${name(plant)}的葉子好像又長大了一點點。`],
      ['plant2', P && plant, `${nm}聞了聞${name(plant)}，打了個噴嚏，就不理它了。`],
      ['rain1', rain, `下了一場小雨，窗上的水珠一顆一顆滑下來。${P ? nm + '看得好專心。' : ''}`],
      ['naps', P && hrs >= 2, `你出門 ${dur}，${nm}大概睡了 ${naps} 覺。`],
      ['desk1', P && desk, `桌上的筆被${nm}撥到地上了，已經偷偷撿回去放好。`],
      ['lamp1', lamp && (h >= 18 || h < 6), `${name(lamp)}一直亮著，房間暖暖的，像在等人回家。`],
      ['dream1', P, `${nm}睡覺的時候腳一直動，好像夢到在追什麼。`],
      ['cry1', P, `剛剛${nm}對著空氣「${cry}」了一聲，然後又若無其事地躺下。`],
      ['clock1', has(d => d.react === 'time'), `時鐘滴答滴答地走，小窩裡的時間過得很慢。`],
      ['quiet1', true, `你不在的這段時間，小窩很安靜。歡迎回來。`],
      ['long1', hrs >= 24, `好久不見！房間裡的東西都還在原來的地方，等你。`],
      ['mail1', P && hrs >= 3, `${nm}把一片葉子叼到門口，好像是要送你的。`],
    ].filter(x => x[1]);
    const fresh = T.filter(x => !used.includes(x[0])), pool = fresh.length ? fresh : T;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return pick ? { id: pick[0], t: pick[2] } : null;
  },
  showNote(text) {
    // a paper note where messages appear, never on top of the furniture for long; a tap puts it away
    // phone: under the room, above the "today" panel; computer: with the other messages
    // computer with room to spare: beside the room, above the hand tray
    const st = document.querySelector('.stage'), mob = document.body.classList.contains('m') && typeof Mobile !== 'undefined' && Mobile.today;
    const side = !mob && document.body.classList.contains('tray-side');
    const wrap = mob ? st : side ? document.querySelector('.room-wrap') : document.getElementById('toasts'); if (!wrap) return;
    if (this.noteEl) this.noteEl.remove();
    const now = new Date(), stamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} 的小窩`;
    const el = this.noteEl = h('button', { class: 'lnote' + (side ? ' side' : ''), title: '點一下收起', onclick: () => this.hideNote() }, h('span', { class: 'lnote-t', text: text }), h('span', { class: 'lnote-s', text: '— ' + stamp }));
    if (mob) st.insertBefore(el, Mobile.today); else if (side) wrap.append(el); else wrap.prepend(el); clearTimeout(this._noteT); this._noteT = setTimeout(() => this.hideNote(), 12000);
  },
  hideNote() { const el = this.noteEl; if (!el) return; this.noteEl = null; el.classList.add('out'); setTimeout(() => el.remove(), 300); },
  // ---------- left alone: the room winds down ----------
  idleCheck() {
    if (this.mode !== 'on' || this.busy || document.hidden || !this.ready()) return;
    if (Game.focusing() || Room.edit || (typeof Learn !== 'undefined' && Learn.sess && UI.wins.study && !UI.wins.study.el.hidden)) { return; }
    if (Date.now() - this.lastInput < LIGHTS.idleMs) return;
    this.mode = 'dim'; this.setDark(0.42); this.lampTarget = 0.55;
    if (typeof Music !== 'undefined' && Music.playing) this.music(1);
    const A = Game.avatar, bed = this.bed();
    if (A && this.canMove() && !A.walking && A.state !== 'sleep') { A.stand(); if (bed) A.goSleep(bed, 1e6); else { A.face = 'front'; A.lp = { at: Room.t, end: Room.t + 1e6, eyes: 'closed', frame: () => 'front0' }; } }
    for (const p of this.pets()) if (p.state !== 'sleep' && !p.walking && !['eat', 'trick', 'hand', 'inbox'].includes(p.state)) p.goNap();
  },
  // ---------- good night ----------
  nightRow() { return this.isNight() && this.mode === 'on' ? ['晚安，關燈休息', '大家一起睡覺，明天見'] : null; },
  async goodnight(bedIt) {
    if (!this.ready() || this.busy || this.mode !== 'on') return;
    if (Game.focusing()) return UI.toast('專注結束再說晚安吧', 'i_moon', 2.4);
    this.busy = true; this.mode = 'night'; this.lastInput = Date.now();
    try {
      for (const id in UI.wins) UI.closeWin(id);
      const A = Game.avatar, bed = bedIt || this.bed();
      if (A && bed && A.state !== 'sleep') { A.stand(); A.goSleep(bed, 1e6); }
      for (const p of this.pets()) if (p.state !== 'sleep' && !['eat', 'trick', 'hand', 'inbox'].includes(p.state)) p.goNap();
      const t0 = Date.now(); while (A && bed && A.state !== 'sleep' && Date.now() - t0 < 7000) await this.wait(150);
      if (A && A.timer) A.timer = 1e6;
      if (A) Game.bubble(A, '晚安', 2);
      await this.wait(700);
      // the lamps go off one by one
      const lit = Room.state.items.filter(it => ITEMS[it.k] && ITEMS[it.k].toggle && ITEMS[it.k].light && it.on);
      for (const it of lit) { it.on = false; const cv = Room.itemCanvas(it); Room.puff('p_spark', it.x + cv.width / 2, it.y, { vy: -4, max: 0.5 }); this.sound(false); this.setDark(Math.min(0.8, this.dark + 0.8 / (lit.length + 1))); await this.wait(420); }
      this.store(LIGHTS.nightKey, { at: Date.now(), lamps: lit.map(it => it.uid) });
      this.click(false);
      if (typeof Music !== 'undefined' && Music.playing) { this.music(1); for (let k = 1; k > 0.05; k -= 0.1) { this.music(k); await this.wait(120); } Music.toggle(false); this.musicK = null; try { Music.audio.volume = Game.S.music.vol; } catch (e) { } }
      const pet = this.pets()[0]; if (pet) setTimeout(() => Game.bubble(pet, pet.kind === 'dog' ? '汪…' : '喵…', 1.6), 400);
      Game.save();
    } finally { this.busy = false; this.lastInput = Date.now(); }
  },
  restoreLamps() {
    const n = this.store(LIGHTS.nightKey); if (!n) return; this.store(LIGHTS.nightKey, null);
    if (!this.ready()) return; let ch = false;
    for (const uid of n.lamps || []) { const it = Room.uidMap[uid]; if (it && !it.on) { it.on = true; ch = true; } }
    if (ch) Game.save();
    const A = Game.avatar; if (A && A.state === 'sleep' && A.timer > 1e5) A.timer = 3;
  },
  // ---------- another device opened the account ----------
  pause() {
    this.mode = 'paused'; this.busy = false; this.click(false); this.musicBack();
    if (typeof Music !== 'undefined' && Music.playing) try { Music.toggle(false); } catch (e) { }
    for (const id in UI.wins) if (!(UI.WIN[id] && UI.WIN[id].modal)) UI.closeWin(id);
    let el = this.pel; if (!el) { el = this.pel = h('div', { class: 'lpause', role: 'dialog', 'aria-modal': 'true', 'aria-label': '這台裝置暫停中' }); document.body.append(el); }
    const btn = h('button', { class: 'chip primary big', onclick: () => Cloud.resume() }, ico('i_lamp', 22), '在這台繼續');
    el.replaceChildren(h('div', { class: 'lpause-card' }, ico('i_moon', 40), h('b', { text: '小窩的燈正在另一台裝置亮著' }),
      h('p', { text: '這台先熄燈休息。剛剛的進度已經存到雲端，在這裡繼續會接著最新的進度。' }), btn, h('p', { class: 'lpause-msg hint', text: '' })));
    el.hidden = false; this.pbtn = btn;
  },
  resuming() { if (this.pbtn) { this.pbtn.disabled = true; this.pbtn.replaceChildren(ico('i_lamp', 22), '開燈中…'); } },
  resumed() { if (this.pel) this.pel.hidden = true; this.mode = 'on'; this.wake('resume', 0); },
  resumeFailed() { if (this.pbtn) { this.pbtn.disabled = false; this.pbtn.replaceChildren(ico('i_lamp', 22), '再試一次'); } const m = this.pel && this.pel.querySelector('.lpause-msg'); if (m) m.textContent = '連不上雲端，檢查一下網路再試一次。'; },
  unpause() { if (this.pel) this.pel.hidden = true; if (this.mode === 'paused') { this.mode = 'on'; this.click(true); } },
  // ---------- input and time ----------
  input() {
    this.lastInput = Date.now();
    if (this.busy || this.mode === 'paused') return;
    if (this.mode === 'dim') { const A = Game.avatar; if (A && A.lp && A.lp.end > Room.t + 1e5) A.lp = null; if (A && A.state === 'sleep' && A.timer > 1e5) A.timer = 0.1; this.wake('idle', 0); }
    else if (this.mode === 'night') { const n = this.store(LIGHTS.nightKey); if (!n || Date.now() - n.at > 1500) { const A = Game.avatar; if (A && A.state === 'sleep') A.timer = 0.1; this.wake('night', 0); } }
  },
  boot() {
    const last = this.store(LIGHTS.seenKey), away = last ? Date.now() - last : LIGHTS.longMs;
    this.seen();
    // the very first visit on this device: the lights come on, but nothing "happened while you were away"
    this.first = !last;
    if (away >= LIGHTS.awayMs || this.store(LIGHTS.nightKey)) this.wake('open', away);
  },
};
// little marks on the floor: drawn just above the floor, gone after a few minutes or when the pets walk over them
class Trace {
  constructor(life) { this.t = 0; this.life = life; this.gone = false; this.isTrace = true; }
  update(dt) { this.t += dt; if (this.t > this.life || this.gone) Room.actors = Room.actors.filter(a => a !== this); }
  alpha() { return Math.max(0, Math.min(1, (this.life - this.t) / 20)); }
  hit() { return false; }
  headPos() { return [0, 0]; }
}
class PawTrail extends Trace {
  constructor(from, to, p) { super(300); const [x0, y0] = from, [y1, x1] = to; this.x = x1; this.pts = []; const n = Math.max(3, Math.min(8, Math.round(Math.hypot(x1 - x0, y1 - y0) / 9))); for (let i = 1; i <= n; i++) { const k = i / (n + 1); this.pts.push([Math.round(x0 + (x1 - x0) * k + (i % 2 ? -2 : 2)), Math.round(y0 + (y1 - y0) * k)]); } this.y = Math.min(...this.pts.map(q => q[1])) - 2; }
  z() { return this.y; }
  draw(c) { c.globalAlpha = 0.35 * this.alpha(); c.fillStyle = '#5a4030'; for (const [x, y] of this.pts) { c.fillRect(x, y, 2, 1); c.fillRect(x - 1, y - 1, 1, 1); c.fillRect(x + 2, y - 1, 1, 1); } c.globalAlpha = 1; }
}
class Leaf extends Trace {
  constructor(x, y) { super(600); this.x = Math.round(x); this.y = Math.round(y); }
  z() { return this.y - 1; }
  draw(c) { c.globalAlpha = this.alpha(); c.fillStyle = '#4f8a4a'; c.fillRect(this.x, this.y, 3, 1); c.fillRect(this.x + 1, this.y - 1, 2, 1); c.fillStyle = '#7cba6a'; c.fillRect(this.x + 1, this.y, 1, 1); c.globalAlpha = 1; }
}
class Fur extends Trace {
  constructor(it, dx, p) { super(600); this.it = it; this.dx = dx; this.x = it.x + dx; this.y = it.y; const pal = PET_COLORS[p.kind] && PET_COLORS[p.kind][p.color]; this.col = PAL[(pal && pal.v) || 'v'] || '#e8a25a'; }
  z() { return Room.base(this.it) + 0.05; }
  draw(c) { const it = this.it; if (!Room.uidMap[it.uid]) return; const d = ITEMS[it.k], top = d.chair ? 12 : (d.bed ? d.bed.y + 2 : 8); c.globalAlpha = this.alpha(); c.fillStyle = this.col; const x = it.x + this.dx, y = it.y + top; c.fillRect(x, y, 2, 1); c.fillRect(x + 1, y - 1, 1, 1); c.globalAlpha = 1; }
}

/* ---------------- hooks ---------------- */
(function () {
  // extra darkness and dimmed lamps on top of the room's own lighting (only for your own room)
  const dl = Room.drawLighting.bind(Room);
  Room.drawLighting = function (c) {
    if (this.state !== Game.S || Lights.dark < 0.005) return dl(c);
    const e = this.env, keep = e.dark; e.dark = Math.min(0.86, keep + Lights.dark * (1 - keep * 0.5));
    try { return dl(c); } finally { e.dark = keep; }
  };
  const cl = Room.collectLights.bind(Room);
  Room.collectLights = function () { const L = cl(); if (this.state !== Game.S || Lights.lamp >= 0.999) return L; return L.map(l => Object.assign({}, l, { k: l.k * Lights.lamp })).filter(l => l.k > 0.02); };
  // the room's clock: light steps and fades
  let last = performance.now();
  const loop = () => { const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now; try { Lights.frame(dt); } catch (e) { } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  // a tap on the bed at night: offer to say good night
  const inter = Game.interact.bind(Game);
  Game.interact = function (it) {
    const d = ITEMS[it.k], r = inter(it);
    if (d && d.bed && !this.focusing() && Lights.isNight() && Lights.mode === 'on' && !Lights.busy) UI.toast('要說晚安、關燈休息了嗎？', 'i_moon', 5, { label: '晚安', fn: () => Lights.goodnight(it) });
    return r;
  };
  // bed tip on a long press mentions it
  const tag = Pets.ownerTag.bind(Pets);
  Pets.ownerTag = function (it) { const t = tag(it); if (t) return t; const d = ITEMS[it.k]; return d && d.bed && Lights.isNight() ? `${d.n}・晚上點一下可以說晚安` : t; };
  // focusing never winds the room down; the end of a focus counts as being here
  const start = Game.start.bind(Game); Game.start = function () { Lights.input(); return start.apply(this, arguments); };
  // input
  for (const ev of ['pointerdown', 'keydown', 'wheel']) document.addEventListener(ev, () => Lights.input(), true);
  // time: a heartbeat while visible, the moment it is hidden, and coming back
  setInterval(() => { if (!document.hidden) Lights.seen(); try { Lights.idleCheck(); } catch (e) { console.warn(e); } }, 20000);
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); Lights.seen(); return; }
    const away = hiddenAt ? Date.now() - hiddenAt : 0; hiddenAt = 0; Lights.seen();
    if (away >= LIGHTS.awayMs && Lights.mode !== 'paused') Lights.wake('return', away);
  });
  window.addEventListener('pagehide', () => Lights.seen());
  const boot = () => { if (!Lights.ready()) return setTimeout(boot, 80); Lights.boot(); };
  window.addEventListener('load', () => setTimeout(boot, 60));
})();
