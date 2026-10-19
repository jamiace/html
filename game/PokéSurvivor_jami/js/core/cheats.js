/* ============ cheats.js — 繁體中文獨立單機測試工具 ============
 * 隱藏輸入 JAMI（不區分大小寫）開啟。僅在主選單／單人遊戲的暫停畫面接受。
 * 已取消 F9 快捷鍵，僅供 LOCAL 存檔單人模式使用。
 * 不開發/上傳排行榜，不讀寫 Firebase，遊戲每回合的作弊會被 clean() 標記。
 * 本檔不覆寫玩家原有方法，所有倍率以原始計算結果為基礎即時作用。
 */
G.Cheats = (() => {
  const MULT = { damage: 1, move: 1, cooldown: 1, xp: 1 };
  const vals = { ...MULT, god: false };
  let opened = false, usedThisRun = false;
  let secretBuffer = '', lastSecretKeyAt = 0, lastSecretScreen = null;
  let dialog, status;
  const backedUp = new Set();

  const $ = id => document.getElementById('ps-cheat-' + id);
  const safe = () => !!(G.DB && G.DB.mode === 'local' && G.DB.save && !G.DB.guest && G.Game && !G.Coop.active);
  const live = () => safe() && ['playing', 'paused', 'levelup', 'choice', 'held'].includes(G.Game.state) && !!G.Game.player;
  const say = (message, error = false) => {
    if (status) { status.textContent = message; status.classList.toggle('err', error); }
  };
  const taint = () => { if (G.Game && G.Game.state !== 'ui') usedThisRun = true; };
  const num = (id, max) => {
    const input = $(id), text = (input?.value || '').trim();
    if (!/^\d+$/.test(text)) throw Error('請輸入非負整數。');
    const n = Number(text);
    if (!Number.isSafeInteger(n) || n > max) throw Error('最大允許數量為 ' + max.toLocaleString('en-US') + '。');
    return n;
  };
  const backup = () => {
    const id = G.DB.user || "";
    if (backedUp.has(id)) return;
    // 備份記憶體內目前的存檔，避免既有資料被意外更改。
    // 依月份/秒生成獨立備份鍵，不會覆寫其他玩家 ps.save.*。
    const s = G.DB.save;
    const k = 'ps.cheat.backup.' + Date.now() + '.' + String(s.name || 'player').replace(/[^a-z\d_-]/gi, '');
    try {
      localStorage.setItem(k, JSON.stringify(s));
      backedUp.add(id);
    } catch (e) { throw Error('無法備份存檔，可能是儲存空間不足。已停止修改。'); }
  };
  const save = () => {
    if (!G.DB.commit(true)) throw Error('寫入本地存檔失敗，請確認不是遊客模式。');
    G.UI.refreshCoins();
  };
  const close = () => {
    if (!opened) return;
    opened = false;
    dialog.hidden = true;
  };
  const open = () => {
    if (!safe()) {
      if (G.UI) G.UI.toast('作弊工具只支援本地單機帳號。');
      return;
    }
    opened = true;
    $('coins').value = G.DB.save.coins;
    $('t1').value = G.DB.save.tickets?.t1 || 0;
    $('t10').value = G.DB.save.tickets?.t10 || 0;
    $('god').checked = vals.god;
    for (const k of ['damage', 'move', 'cooldown', 'xp']) $(k).value = String(vals[k]);
    syncRunAvailability();
    say('目前帳號：' + G.DB.user + '｜僅修改本地存檔，不連接排行榜。');
    dialog.hidden = false;
  };
  const syncRunAvailability = () => {
    const running = live();
    dialog.querySelectorAll('[data-run-only]').forEach(el => { el.disabled = !running; });
    $('run-msg').textContent = running ? '戰鬥中的設定只影響本回合。' : '開始單人戰鬥後可使用戰鬥作弊。';
  };
  // 主選單／暫停面板之外一律不監聽密碼，包括戰鬥、升級、抽卡及設定等畫面。
  const secretScreen = () => {
    if (!G.Game || !G.UI) return null;
    // 避免主選單被另一層畫面覆蓋時（例如設定或抽卡）意外觸發。
    const front = [...document.querySelectorAll('section.scr:not(.hidden)')];
    if (G.Game.state === 'ui' && front.length === 1 && front[0].id === 'scr-menu') return 'title';
    if (G.Game.state === 'paused' && front.length === 1 && front[0].id === 'scr-pause' && !G.Coop.active) return 'pause';
    return null;
  };
  const resetSecret = () => { secretBuffer = ''; lastSecretKeyAt = 0; lastSecretScreen = null; };

  function secretKeydown(e) {
    if (opened) {
      // 關閉時用 Esc，作弊面板內的文字欄位仍可正常輸入。
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); resetSecret(); return; }
      if (!['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target?.tagName) && !e.target?.isContentEditable) e.stopPropagation();
      return;
    }
    const screen = secretScreen();
    if (!screen || e.repeat || e.isComposing || e.ctrlKey || e.altKey || e.metaKey ||
        ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target?.tagName) || e.target?.isContentEditable) {
      resetSecret();
      return;
    }
    // 不限定 Shift/CapsLock；每個字母間隔超過 2.5 秒就從頭輸入。
    const now = performance.now();
    if (screen !== lastSecretScreen || now - lastSecretKeyAt > 2500) secretBuffer = '';
    lastSecretScreen = screen;
    lastSecretKeyAt = now;
    const key = (e.key || '').toLowerCase();
    if (!/^[a-z]$/.test(key)) { secretBuffer = ''; return; }
    secretBuffer = (secretBuffer + key).slice(-4);
    if (secretBuffer === 'jami') {
      e.preventDefault();
      e.stopImmediatePropagation();
      resetSecret();
      open();
    }
  }
  const change = (what, next) => {
    if (!live()) throw Error('請先開始一場單人戰鬥。');
    vals[what] = next;
    taint();
    say('已套用：' + ({god:'無敵',damage:'傷害',move:'移動速度',cooldown:'技能冷卻',xp:'經驗值'}[what]) + (what==='god' ? (next ? '開' : '關') : ' ×' + next));
  };
  function action(name) {
    if (!safe()) throw Error('僅允許本地單機存檔使用，已中止操作。');
    const s = G.DB.save;
    if (name === 'coins' || name === 't1' || name === 't10') {
      const n = num(name, 999999999);
      backup();
      if (name === 'coins') s.coins = n;
      else { s.tickets = s.tickets || { t1: 0, t10: 0 }; s.tickets[name] = n; }
      save();
      say('已儲存 ' + (name === 'coins' ? '金幣' : name === 't1' ? '一般抽卡券' : '十連抽卡券') + '：' + n.toLocaleString('zh-TW'));
    } else if (name === 'all' || name === 'shiny') {
      backup();
      let count = 0;
      for (const mon of G.DEX) {
        const id = mon.dex;
        if (name === 'shiny') {
          if (!G.Sprites.hasShiny(id)) continue;
          if (!s.shiny[id]) { G.DB.grantShiny(id, 'cheat-local'); count++; }
        } else if (!G.DB.owns(id)) { G.DB.grant(id, 'cheat-local'); count++; }
      }
      save();
      say('完成：新增 ' + count + (name === 'shiny' ? ' 隻異色寶可夢' : ' 隻寶可夢') + '。返回收藏畫面重新開啟即可刷新。');
    } else if (name === 'upgrades') {
      if (!s.partner) throw Error('請先選擇一隻夥伴寶可夢。');
      backup();
      const u = G.DB.upgradesOf(s.partner);
      for (const def of G.Upgrades.LIST) u[def.id] = def.max;
      save();
      say('已將目前夥伴的永久升級全部提升至上限，下次開局生效。');
    } else if (name === 'heal') {
      if (!live()) throw Error('請先開始一場單人戰鬥。');
      const p = G.Game.player;
      if (p.dead) throw Error('角色已倒下，請重新開始戰鬥。');
      p.hp = p.maxHp;
      taint(); say('已回復全部生命值。');
    } else if (name === 'level') {
      if (!live() || !['playing','paused'].includes(G.Game.state)) throw Error('請在戰鬥或暫停畫面使用立即升級。');
      G.Game.debugLevelUp(); taint();
      close();
      // 暫停時先回到戰鬥，下一個畫格才會顯示升級卡片。
      if (G.Game.state === 'paused') G.Game.togglePause();
      say('已提升 1 級，關閉面板後進行卡片選擇。');
    } else if (name === 'shiny-spawn') {
      if (!live() || !['playing','paused'].includes(G.Game.state)) throw Error('請在戰鬥或暫停畫面操作。');
      taint(); G.Spawner.debugForceShiny(10); G.Spawner.burst(10); close();
    } else if (name === 'boss') {
      if (!live() || !['playing','paused'].includes(G.Game.state)) throw Error('請在戰鬥或暫停畫面操作。');
      if (!G.Spawner.debugSpawnBoss()) throw Error('目前狀態不允許召喚 Boss。');
      taint(); close();
    } else if (name === 'save-backup') {
      // 手動備份，不改動存檔；輸出的檔案可以給使用者人工比對或還原。
      const blob = new Blob([JSON.stringify(s, null, 2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'pokesurvivor-' + String(s.name || 'local').replace(/[^a-z0-9_-]/gi, '') + '-backup.json';
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      say('已匯出目前遊戲存檔。');
    }
  }

  function init() {
    if (dialog) return;
    dialog = document.createElement('div');
    dialog.id = 'ps-cheat-overlay';
    dialog.hidden = true;
    dialog.innerHTML = `
      <div class="ps-cheat-window" role="dialog" aria-modal="true" aria-label="單機作弊工具">
        <header class="ps-cheat-head"><div><strong>PokéSurvivor · 單機作弊工具</strong><small>在主選單或暫停畫面輸入 JAMI 開啟 · 僅限本機存檔</small></div><button type="button" id="ps-cheat-close" aria-label="關閉">×</button></header>
        <div class="ps-cheat-body">
          <section><h3>資源與收藏</h3><div class="ps-cheat-grid">
            <label>金幣<input id="ps-cheat-coins" type="number" min="0" max="999999999" step="1"></label><button type="button" data-act="coins">設定金幣</button>
            <label>一般抽卡券<input id="ps-cheat-t1" type="number" min="0" max="999999999" step="1"></label><button type="button" data-act="t1">設定一般券</button>
            <label>十連抽卡券<input id="ps-cheat-t10" type="number" min="0" max="999999999" step="1"></label><button type="button" data-act="t10">設定十連券</button>
          </div><div class="ps-cheat-actions"><button type="button" data-act="all">取得全部寶可夢</button><button type="button" data-act="shiny">取得全部可用異色</button><button type="button" data-act="upgrades">目前夥伴升級全滿</button></div></section>
          <section><h3>戰鬥設定</h3><p class="ps-cheat-hint" id="ps-cheat-run-msg"></p>
            <label class="ps-cheat-check"><input type="checkbox" id="ps-cheat-god" data-run-only>無敵模式（不受傷害）</label>
            <div class="ps-cheat-multipliers">
              <label>傷害倍率<select id="ps-cheat-damage" data-run-only><option value="1">×1</option><option value="2">×2</option><option value="5">×5</option><option value="10">×10</option></select></label>
              <label>移動速度<select id="ps-cheat-move" data-run-only><option value="1">×1</option><option value="1.5">×1.5</option><option value="2">×2</option></select></label>
              <label>技能冷卻<select id="ps-cheat-cooldown" data-run-only><option value="1">正常</option><option value="0.5">時間減半</option><option value="0.25">時間四分之一</option></select></label>
              <label>經驗值倍率<select id="ps-cheat-xp" data-run-only><option value="1">×1</option><option value="2">×2</option><option value="5">×5</option><option value="10">×10</option></select></label>
            </div><div class="ps-cheat-actions"><button type="button" data-run-only data-act="heal">生命值全滿</button><button type="button" data-run-only data-act="level">立即升級 1 級</button></div>
          </section>
          <section><h3>戰鬥測試</h3><div class="ps-cheat-actions"><button type="button" data-run-only data-act="shiny-spawn">立即產生異色敵人（最多 10 隻）</button><button type="button" data-run-only data-act="boss">立即召喚 Boss</button><button type="button" data-act="save-backup">下載本地存檔備份</button></div></section>
          <p id="ps-cheat-status" class="ps-cheat-status" role="status"></p>
          <p class="ps-cheat-hint">本地資源與收藏會儲存；戰鬥倍率只作用於目前這一局。作弊回合不提交排行榜。原有資料在第一次修改前會另存本地備份。</p>
        </div><footer><button type="button" id="ps-cheat-dismiss">關閉面板 · Esc</button></footer>
      </div>`;
    document.body.appendChild(dialog);
    status = $('status');
    $('close').addEventListener('click', close);
    $('dismiss').addEventListener('click', close);
    dialog.addEventListener('pointerdown', e => { if (e.target === dialog) close(); });
    dialog.querySelectorAll('[data-act]').forEach(btn => btn.addEventListener('click', () => {
      try { action(btn.dataset.act); } catch (e) { say(e.message || String(e), true); console.warn('[單機作弊]', e); }
    }));
    $('god').addEventListener('change', e => { try { change('god', e.target.checked); } catch (err) { say(err.message, true); e.target.checked = false; } });
    for (const k of ['damage','move','cooldown','xp']) {
      $(k).addEventListener('change', e => { try { change(k, Number(e.target.value)); } catch (err) { say(err.message, true); } });
    }
    // 捕獲鍵盤輸入：F9 已完全取消；密碼只在指定畫面接受。
    window.addEventListener('keydown', secretKeydown, true);
    // 開發入口，僅供本地版。發行版 G 仍可保持 private。
  }

  return {
    init, isOpen: () => opened, close, resetRun() {
      usedThisRun = false;
      for (const k of Object.keys(MULT)) vals[k] = MULT[k];
      vals.god = false;
      if (opened) close();
    },
    get usedThisRun() { return usedThisRun; },
    invincible: () => safe() && live() && vals.god,
    damageMul: () => safe() && live() ? vals.damage : 1,
    moveMul: () => safe() && live() ? vals.move : 1,
    cooldownMul: () => safe() && live() ? vals.cooldown : 1,
    xpMul: () => safe() && live() ? vals.xp : 1
  };
})();
