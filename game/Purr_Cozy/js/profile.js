/* ============================================================
   Player name: one name for the whole game (account window, co-focus,
   and later the name card, friends and the leaderboard).
   Capacity 14 units: CJK / kana / hangul / full-width / emoji count 2, everything else 1,
   so it fits 7 Chinese characters or 14 English letters. Counted per grapheme, so a
   character is never cut in half. Shown as plain text only; no word filter.
   ============================================================ */
const NAME_UNITS = 14, NAME_DEFAULT = I18n.s("u_1b5a5abc14d1");
const WIDE_RE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]|[\u{1f000}-\u{1faff}\u{20000}-\u{3fffd}]|\p{Extended_Pictographic}/u;
function graphemes(s) { s = String(s || ''); try { if (typeof Intl !== 'undefined' && Intl.Segmenter) return [...new Intl.Segmenter('zh-Hant', { granularity: 'grapheme' }).segment(s)].map(x => x.segment); } catch (e) { } return [...s]; }
function nameWidth(s) { let w = 0; for (const g of graphemes(s)) w += WIDE_RE.test(g) ? 2 : 1; return w; }
// strips control / invisible characters, collapses spaces and cuts at the capacity
const NAME_JUNK = (() => { const r = (a, b) => String.fromCharCode(a) + '-' + String.fromCharCode(b); return new RegExp('[' + [r(0, 31), r(127, 159), r(0x200b, 0x200f), r(0x2028, 0x202e), r(0x2060, 0x206f), String.fromCharCode(0xfeff)].join('') + ']', 'g'); })();
function cleanName(s) { return String(s || '').replace(NAME_JUNK, '').replace(/\s+/g, ' ').trim(); }
function clipName(s) { let out = '', w = 0; for (const g of graphemes(cleanName(s))) { const c = WIDE_RE.test(g) ? 2 : 1; if (w + c > NAME_UNITS) break; out += g; w += c; } return out.trim(); }
function playerName() { return clipName((Game.S.avatar && Game.S.avatar.name) || '') || NAME_DEFAULT; }
UI.nameField = function () {
  const profileState=Game.S;
  const msg = h('span', { class: 'hint' });
  const show = (v) => { const w = nameWidth(cleanName(v)), left = NAME_UNITS - w; msg.textContent = left >= 0 ? I18n.s("u_986df2b09ab7", [left]) : I18n.s("u_c76866d40b8f", [-left]); msg.classList.toggle('warn', left < 0); };
  let composing = false;
  const commit = (inp) => { if(Game.S!==profileState)return;
    const v = clipName(inp.value);
    if (!v) { inp.value = Game.S.avatar.name || ''; show(inp.value); return UI.toast(I18n.s("u_0e897c6f7572"), 'i_people', 2); }
    inp.value = v; show(v); if (v === (Game.S.avatar.name || '')) return;
    Game.S.avatar.name = v; Game.save(); saveSoon(); if (typeof Cowork !== 'undefined' && Cowork.push) Cowork.push(); UI.refresh('avatar');
    if (typeof Social !== 'undefined' && Social.ready()) Social.publish(true).catch(() => UI.toast(I18n.t('cozy.syncRetry'),'i_cloud',3));
    UI.toast(I18n.s("u_3adbb97125e4", [v]), 'i_people', 2);
  };
  const inp = h('input', { id: 'acct-name', type: 'text', value: Game.S.avatar.name || '', placeholder: NAME_DEFAULT, autocomplete: 'nickname', 'aria-describedby': 'acct-name-hint',
    oncompositionstart: () => { composing = true; }, oncompositionend: e => { composing = false; show(e.target.value); },
    oninput: e => { if (!composing) show(e.target.value); },
    onchange: e => { if (!composing) commit(e.target); }, onblur:e=>{if(!composing)commit(e.target)},
    onkeydown: e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); commit(e.target); } } });
  msg.id = 'acct-name-hint'; show(inp.value);
  return h('label', { class: 'field' }, h('span', { text: I18n.s("u_6773310492a9") }), h('div', { class: 'inset grow' }, inp), h('button',{type:'button',class:'chip cozy-field-save',onclick:()=>{if(!composing)commit(inp)}},I18n.t('cozy.save')), msg);
};

// short status line on the name card (20 units, same counting as the name, no word filter)
UI.statusField = function () {
  const profileState=Game.S;
  const msg = h('span', { class: 'hint' }); let composing = false;
  const show = (v) => { const left = 20 - nameWidth(cleanName(v)); msg.textContent = left >= 0 ? I18n.s("u_d2c01dbd5ff0", [left]) : I18n.s("u_c76866d40b8f", [-left]); msg.classList.toggle('warn', left < 0); };
  const commit = (inp) => { if(Game.S!==profileState)return; const v = clipStatus(inp.value); inp.value = v; show(v); if (v === (Social.Z.status || '')) return; Social.Z.status = v; Social.Z.statusEditedAt=Date.now(); Game.save(); saveSoon(); if (Social.ready()) Social.publish(true).catch(() => UI.toast(I18n.t('cozy.syncRetry'),'i_cloud',3)); UI.toast(I18n.t('cozy.profileSaved'), 'i_people', 2); };
  const inp = h('input', { id: 'acct-status', type: 'text', value: Social.Z.status || '', placeholder: I18n.s("u_7fb71b3d76c2"), autocomplete: 'off',
    oncompositionstart: () => { composing = true; }, oncompositionend: e => { composing = false; show(e.target.value); },
    oninput: e => { if (!composing) show(e.target.value); }, onchange: e => { if (!composing) commit(e.target); }, onblur:e=>{if(!composing)commit(e.target)},
    onkeydown: e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); commit(e.target); } } });
  show(inp.value);
  return h('label', { class: 'field' }, h('span', { text: I18n.s("u_e01b94ddd5d5") }), h('div', { class: 'inset grow' }, inp), h('button',{type:'button',class:'chip cozy-field-save',onclick:()=>{if(!composing)commit(inp)}},I18n.t('cozy.save')), msg);
};
