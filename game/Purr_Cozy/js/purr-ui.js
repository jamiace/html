/* Purr Cozy: compact shop, semantic timer wrapping and visible viewport sizing. */
(function () {
  UI.timerWords = function (text) {
    const words = text.startsWith(I18n.s("u_04f46f8ed7b7")) ? [I18n.s("u_04f46f8ed7b7"), text.slice(2)] : [text];
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
        const select = h('select', { class: 'shop-family', 'aria-label': I18n.s("u_0a49f5421d8d"),
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
      h('summary', { class: 'chip sm', text: selected ? ((100-selected.off)/10) + I18n.s("u_7cd2c70e1e74") : active ? I18n.s("u_8bb9022e1bca") : I18n.s("u_f683e24888a2") }),
      h('div', { class: 'shop-options-panel' }, ...options.length ? options : [h('p', { class: 'hint', text: I18n.s("u_a2eeb890aea6") })]));
    const sidebar = h('aside', { class: 'shop-sidebar', 'aria-label': I18n.s("u_444f8c7b18c0") }, header, detail);
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
    delete Game.S.settings.hd2d;
    Mobile.render();
    return r;
  };
})();
