const FAM_NAMES=PurrAssets.catalog.catalog.FAM_NAMES, GEN=PurrAssets.catalog.catalog.GEN;
const Fun = {
  day() { const L = Game.S.life, d = Life.today(); if (!L.fun || L.fun.day !== d) L.fun = { day: d, used: {}, water: 0, best: (L.fun && L.fun.best) || 0 }; return L.fun; },
  once(key) { const F = this.day(); if (F.used[key]) return false; F.used[key] = 1; return true; },
  water(it, d, cx) {
    const F = this.day();
    for (let i = 0; i < 3; i++) Room.puff(i ? 'p_leaf' : 'p_bubble', cx + (Math.random() - 0.5) * 8, it.y + 4, { vx: (Math.random() - 0.5) * 10, vy: -6, grav: 10, wob: 6, max: 1.3 });
    if (this.once('w' + it.uid) && F.water < 10) { F.water++; Game.reward(2, 1, 'raw'); Game.bubbleAt(cx, it.y, I18n.s("u_dac2c01a05c0", [F.water])); Game.save(); }
    else Game.bubbleAt(cx, it.y, I18n.s("u_2eb89e7764a6"));
  },
  word(it, d, cx) {
    const seen = Object.keys(Game.S.vocab || {}), w = seen.length && Math.random() < 0.7 ? seen[Math.floor(Math.random() * seen.length)] : VOCAB[Math.floor(Math.random() * VOCAB.length)].w;
    const v = VOCAB[VIDX[w]]; if (!v) return; Learn.speak(v.w);
    Game.bubbleAt(cx, it.y, `${v.w}  ${v.z.split('；')[0]}`, 3.5);
    if (this.once('word')) { Game.reward(3, 3, 'raw'); }
  },
  gacha(it, d, cx) { return Rewards.gacha(it, cx); },
  feedfish(it, d, cx) {
    for (let i = 0; i < 4; i++) Room.puff('p_dot', cx - 10 + Math.random() * 20, it.y + 3, { vy: 3, grav: 4, max: 1.4 });
    if (this.once('fish' + it.uid)) { Game.reward(4, 3, 'raw'); Game.bubbleAt(cx, it.y, I18n.s("u_377d028a326a")); Game.save(); } else Game.bubbleAt(cx, it.y, I18n.s("u_b5e92429eca2"));
  },
  brew(it, d, cx) {
    for (let i = 0; i < 3; i++) Room.puff('p_steam', cx - 1, it.y - 2, { vy: -6 - i * 2, max: 1.4, alpha: 0.7 });
    if (this.once('brew')) { Life.give('coffee', 1); UI.toast(I18n.s("u_8ec67b7551ca"), 'it_coffee', 3); Game.save(); } else Game.bubbleAt(cx, it.y, I18n.s("u_f85fd7c2cb0f"));
  },
  fridge(it, d, cx) {
    if (this.once('fridge')) { const k = Math.random() < 0.5 ? 'onigiri' : 'fish_snack'; Life.give(k, 1); UI.toast(I18n.s("u_fc177baeb7b2", [SUPPLIES[k].n]), SUPPLIES[k].spr, 3); Game.save(); } else Game.bubbleAt(cx, it.y, I18n.s("u_27603eb9a11a"));
  },
  piano(it, d, cx) {
    for (let i = 0; i < 4; i++) Room.puff('p_note', cx - 8 + i * 5, it.y - 2, { vx: (i - 1.5) * 5, vy: -10 - i, wob: 10, max: 2 });
    const tunes = ['Do Re Mi ♪', I18n.s("u_e03164c0609b"), I18n.s("u_79a8c7bc3e93"), I18n.s("u_ea97d4c7914b"), I18n.s("u_99020dee99a9")]; Game.bubbleAt(cx, it.y, tunes[Math.floor(Math.random() * tunes.length)]);
    if (Game.avatar) Game.avatar.happy = 1.5; if (this.once('piano')) Game.reward(3, 3, 'raw');
  },
  arcade(it, d, cx) {
    const F = this.day(), sc = 100 * (1 + Math.floor(Math.random() * 99));
    let msg = I18n.s("u_faef6ebdcf6d", [sc]); if (sc > (F.best || 0)) { F.best = sc; msg += I18n.s("u_2d38cfb14982"); if (this.once('arcade')) { Game.reward(5, 5, 'raw'); msg += I18n.s("u_10989a6f0f4e"); } }
    Game.bubbleAt(cx, it.y, msg); Room.puff('p_spark', cx, it.y + 10, { vy: -8 }); Game.save();
  },
  cuckoo(it, d, cx) { const n = new Date(); Game.bubbleAt(cx, it.y, I18n.s("u_b648c45165fb", [n.getHours(), String(n.getMinutes()).padStart(2, '0')])); },
};