/* Purr Cozy: compact shop, semantic timer wrapping and visible viewport sizing. */
(function () {
  UI.timerWords = function (text) {
    const words = text.startsWith('準備') ? ['準備', text.slice(2)] : [text];
    return words.flatMap((word, i) => [i ? h('wbr') : null, h('span', { class: 'status-word', text: word })]).filter(Boolean);
  };
  const shop = UI.w_shop.bind(UI);
  UI.w_shop = function () {
    const nodes = shop().filter(Boolean), header = nodes.shift();
    header.classList.add('shop-toolbar');
    const grid = nodes.find(n => n.classList.contains('grid'));
    const rest = nodes.filter(n => n !== grid);
    const foot = rest.find(n => n.classList.contains('pnav') || n.matches('p.hint.center'));
    const options = rest.filter(n => n !== foot);
    const filter = options.find(n => n.classList.contains('fbar'));
    if (filter) {
      const families = filter.querySelector('.ffams');
      if (families) {
        const buttons = [...families.querySelectorAll('button')];
        const select = h('select', { class: 'shop-family', 'aria-label': '商品系列',
          onchange: e => buttons[Number(e.target.value)].click() },
          ...buttons.map((b,i) => h('option', { value: String(i), selected: b.classList.contains('on') }, b.textContent)));
        families.replaceWith(select);
      }
    }
    const selected = Rewards.W.coupons.find(c => c.id === Rewards.W.sel);
    const F = UI.flt['shop:' + UI.shopTab];
    const active = F && (F.q || F.fam || F.avail);
    const detail = h('details', { class: 'shop-options', open: window.innerWidth >= 760 || !!UI.shopOptionsOpen,
      ontoggle: e => { if (window.innerWidth < 760) UI.shopOptionsOpen = e.target.open; } },
      h('summary', { class: 'chip sm', text: selected ? ((100-selected.off)/10) + '折券・篩選' : active ? '篩選中・券' : '篩選・券' }),
      h('div', { class: 'shop-options-panel' }, ...options.length ? options : [h('p', { class: 'hint', text: '此分類沒有額外篩選。' })]));
    const sidebar = h('aside', { class: 'shop-sidebar', 'aria-label': '商店工具' }, header, detail);
    return [h('div', { class: 'shop-shell' }, sidebar,
      h('div', { class: 'shop-content' }, grid, foot ? h('div', { class: 'shop-pagination' }, foot) : null))];
  };
  let lastCompact = window.innerWidth < 760;
  const viewport = () => {
    const v = window.visualViewport, style = document.documentElement.style;
    const compact = window.innerWidth < 760;
    if (compact !== lastCompact) { lastCompact = compact; if (UI.wins.shop) UI.refresh('shop'); }
    style.setProperty('--purr-vh', Math.round(v ? v.height : window.innerHeight) + 'px');
    style.setProperty('--purr-vw', Math.round(v ? v.width : window.innerWidth) + 'px');
    style.setProperty('--purr-top', Math.round(v ? v.offsetTop : 0) + 'px');
  };
  viewport();
  window.addEventListener('resize', viewport);
  window.visualViewport?.addEventListener('resize', viewport);
  window.visualViewport?.addEventListener('scroll', viewport);
  const replace = Game.replaceState.bind(Game);
  Game.replaceState = function (S) {
    const r = replace(S);
    if (Game.S.settings.hd2d || window.NOOK_HD_DEMO) HD2D.attach();
    HD2D.enabled = !!(Game.S.settings.hd2d || window.NOOK_HD_DEMO);
    HD2D.sync();
    Mobile.render();
    return r;
  };
})();
