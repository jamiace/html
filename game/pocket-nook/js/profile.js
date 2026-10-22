/* ============================================================
   Player name: one name for the whole game (account window, co-focus,
   and later the name card, friends and the leaderboard).
   Capacity 14 units: CJK / kana / hangul / full-width / emoji count 2, everything else 1,
   so it fits 7 Chinese characters or 14 English letters. Counted per grapheme, so a
   character is never cut in half. Shown as plain text only; no word filter.
   ============================================================ */
const NAME_UNITS = 14, NAME_DEFAULT = '小窩住民';
const WIDE_RE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]|[\u{1f000}-\u{1faff}\u{20000}-\u{3fffd}]|\p{Extended_Pictographic}/u;
function graphemes(s) { s = String(s || ''); try { if (typeof Intl !== 'undefined' && Intl.Segmenter) return [...new Intl.Segmenter('zh-Hant', { granularity: 'grapheme' }).segment(s)].map(x => x.segment); } catch (e) { } return [...s]; }
function nameWidth(s) { let w = 0; for (const g of graphemes(s)) w += WIDE_RE.test(g) ? 2 : 1; return w; }
// strips control / invisible characters, collapses spaces and cuts at the capacity
const NAME_JUNK = (() => { const r = (a, b) => String.fromCharCode(a) + '-' + String.fromCharCode(b); return new RegExp('[' + [r(0, 31), r(127, 159), r(0x200b, 0x200f), r(0x2028, 0x202e), r(0x2060, 0x206f), String.fromCharCode(0xfeff)].join('') + ']', 'g'); })();
function cleanName(s) { return String(s || '').replace(NAME_JUNK, '').replace(/\s+/g, ' ').trim(); }
function clipName(s) { let out = '', w = 0; for (const g of graphemes(cleanName(s))) { const c = WIDE_RE.test(g) ? 2 : 1; if (w + c > NAME_UNITS) break; out += g; w += c; } return out.trim(); }
function playerName() { return clipName((Game.S.avatar && Game.S.avatar.name) || '') || NAME_DEFAULT; }
UI.nameField = function () {
  const a = Game.S.avatar, msg = h('span', { class: 'hint' });
  const show = (v) => { const w = nameWidth(cleanName(v)), left = NAME_UNITS - w; msg.textContent = left >= 0 ? `還可以輸入 ${left} 格（中文字 2 格、英文字 1 格，最多 7 個中文字或 14 個英文字）` : `超過 ${-left} 格，存檔時會從後面剪掉`; msg.classList.toggle('warn', left < 0); };
  let composing = false;
  const commit = (inp) => {
    const v = clipName(inp.value);
    if (!v) { inp.value = a.name || ''; show(inp.value); return UI.toast('名字不能是空白', 'i_people', 2); }
    inp.value = v; show(v); if (v === (a.name || '')) return;
    a.name = v; Game.save(); saveSoon(); if (typeof Cowork !== 'undefined' && Cowork.push) Cowork.push(); UI.refresh('avatar');
    if (typeof Social !== 'undefined' && Social.ready()) Social.publish(true).catch(() => { });
    UI.toast(`名字改成「${v}」`, 'i_people', 2);
  };
  const inp = h('input', { id: 'acct-name', type: 'text', value: a.name || '', placeholder: NAME_DEFAULT, autocomplete: 'nickname', 'aria-describedby': 'acct-name-hint',
    oncompositionstart: () => { composing = true; }, oncompositionend: e => { composing = false; show(e.target.value); },
    oninput: e => { if (!composing) show(e.target.value); },
    onchange: e => { if (!composing) commit(e.target); },
    onkeydown: e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); commit(e.target); } } });
  msg.id = 'acct-name-hint'; show(inp.value);
  return h('label', { class: 'field' }, h('span', { text: '名字' }), h('div', { class: 'inset grow' }, inp), msg);
};

// short status line on the name card (20 units, same counting as the name, no word filter)
UI.statusField = function () {
  const Z = Social.Z, msg = h('span', { class: 'hint' }); let composing = false;
  const show = (v) => { const left = 20 - nameWidth(cleanName(v)); msg.textContent = left >= 0 ? `名片上的一句話，還可以輸入 ${left} 格` : `超過 ${-left} 格，存檔時會從後面剪掉`; msg.classList.toggle('warn', left < 0); };
  const commit = (inp) => { const v = clipStatus(inp.value); inp.value = v; show(v); if (v === (Z.status || '')) return; Z.status = v; Game.save(); saveSoon(); if (Social.ready()) Social.publish(true).catch(() => { }); UI.toast(v ? '狀態更新了' : '已清除狀態', 'i_people', 2); };
  const inp = h('input', { id: 'acct-status', type: 'text', value: Z.status || '', placeholder: '例如：今天要背 40 個單字！', autocomplete: 'off',
    oncompositionstart: () => { composing = true; }, oncompositionend: e => { composing = false; show(e.target.value); },
    oninput: e => { if (!composing) show(e.target.value); }, onchange: e => { if (!composing) commit(e.target); },
    onkeydown: e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); commit(e.target); } } });
  show(inp.value);
  return h('label', { class: 'field' }, h('span', { text: '狀態' }), h('div', { class: 'inset grow' }, inp), msg);
};
