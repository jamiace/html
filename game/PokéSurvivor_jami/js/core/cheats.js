/* JAMI CONTROL — player sandbox / training suite v3.1
 * Compatible with the separate-script build (index.html). No external dependencies.
 * Type JAMI, case-insensitive, on ANY game screen. F9 deliberately unused.
 */
G.Cheats = (() => {
  const defaults = Object.freeze({ damage:1, move:1, cooldown:1, xp:1, god:false });
  const vals = { ...defaults };
  const PRESETS = 'ps.jami.control.presets.v3';
  let overlay = null, opened = false, usedThisRun = false, buffer = '', keyAt = 0;
  let tab = 'home', experiment = false, selectedMon = 25, selectedMove = '', selectedItem = '';
  let notice = '', noticeError = false;
  const $ = (id) => overlay?.querySelector('#jc-' + id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = n => Number(n || 0).toLocaleString('zh-TW');
  const session = () => G.Game && G.Game.player && !['ui','over'].includes(G.Game.state);
  const solo = () => !G.Coop?.active;
  const pl = () => session() ? G.Game.player : null;
  const saveData = () => G.DB?.save;
  const owned = () => !!(saveData() && !G.DB.guest && (G.DB.mode === 'local' || (G.DB.mode === 'cloud' && G.DB.online)));
  const requireRun = () => { if (!solo() || !pl() || pl().dead) throw Error('此操作需要單人戰鬥中、尚未倒下的角色。'); return pl(); };
  const requireAccount = () => { if (!owned()) throw Error('請先登入有效的本地或 Firebase 帳號。遊客無法修改永久存檔。'); return G.DB.save; };
  const numeric = (value,min,max,integer=false) => { const n=Number(value); if (value==null || String(value).trim()==='' || !Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n))) throw Error(`請輸入 ${min}～${max} 的有效數字。`); return n; };
  // Validate the complete form before mutating player state, and identify invalid fields.
  const checkedNumber = (id,label,min,max,integer=false) => {
    const element=$(id);
    try {
      const value=numeric(element?.value,min,max,integer);
      element?.classList.remove('jc-invalid');
      element?.removeAttribute('aria-invalid');
      return value;
    } catch (_) {
      element?.classList.add('jc-invalid');
      element?.setAttribute('aria-invalid','true');
      element?.focus();
      throw Error(`${label}：請輸入 ${min}～${max} 的${integer?'整數':'有效數值'}。`);
    }
  };
  const val = id => $(id)?.value;
  const check = id => !!$(id)?.checked;
  const saveNow = () => {
    if (!G.DB.commit(true)) throw Error('無法保存，請確認是否已登入帳號。');
    G.UI?.refreshCoins?.();
    if (G.DB.mode === 'cloud') Promise.resolve().then(() => G.DB.flush()).catch(e => console.warn('[JAMI Control] 雲端等待重新同步',e));
  };
  const backupBefore = () => {
    const s = requireAccount();
    const k = 'ps.jami.snapshot.' + (G.DB.fb?.uid || G.DB.user || 'player') + '.' + Date.now();
    try { localStorage.setItem(k, JSON.stringify(s)); } catch(e) { throw Error('無法自動備份原存檔，請清理本地儲存空間後重試。'); }
  };
  function status(message,error=false){notice=message;noticeError=error;const el=$('status');if(el){el.textContent=message;el.classList.toggle('bad',error);}}
  function mark(){ if (session()) usedThisRun=true; }
  function close(){if(!opened)return;opened=false;overlay.hidden=true;buffer='';}
  function open(){
    if(!overlay) init();
    opened=true;
    overlay.hidden=false;
    overlay.querySelector('.jc-dialog')?.focus();
    render(tab);
    status('已開啟 JAMI CONTROL。戰鬥調整僅影響本局；永久資料將寫入目前登入帳號。');
  }
  function keydown(e){
    if(opened){
      if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();G.Input?.endFrame?.();close();return;}
      return;
    }
    if(e.repeat||e.isComposing||e.ctrlKey||e.metaKey||e.altKey||['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName)||e.target?.isContentEditable){buffer='';return;}
    const c=(e.key||'').toLowerCase();
    const now=performance.now();
    if(now-keyAt>2500)buffer='';
    keyAt=now;
    if(!/^[a-z]$/.test(c)){buffer='';return;}
    buffer=(buffer+c).slice(-4);
    if(buffer==='jami'){
      buffer=''; e.preventDefault(); e.stopImmediatePropagation();G.Input?.endFrame?.(); open();
    }
  }
  const NAV=[['home','概覽','◈'],['trainer','寶可夢','◆'],['moves','技能配置','✦'],['gear','裝備實驗室','◇'],['battle','戰鬥數值','⚔'],['world','世界控制','✧'],['account','資源與收藏','▣'],['presets','預設與備份','▤']];
  const monName = m => m ? `${m.dex} · ${m.name || m.en || 'Pokémon'}` : '未選擇';
  const chooseMon = () => G.DEX_BY[Number(selectedMon)] || G.DEX_BY[25] || G.DEX[0];
  const pickDex = (selected) => `<div class="jc-row"><label class="jc-grow">寶可夢圖鑑（可搜尋）<input id="jc-dex-search" type="search" placeholder="輸入編號或名稱篩選…" autocomplete="off"></label><label class="jc-grow">選擇寶可夢<select id="jc-dex" size="1">${G.DEX.map(m=>`<option value="${m.dex}" ${Number(selected)===m.dex?'selected':''}>${esc(monName(m))}</option>`).join('')}</select></label></div>`;
  const moveOptions = (selected) => `<option value="">— 空欄位 —</option>${G.Moves.ALL.map(m=>`<option value="${esc(m.id)}" ${selected===m.id?'selected':''}>${esc((G.U.TYPE_NAME?.[m.type]||m.type)+' · '+m.name)}</option>`).join('')}`;
  const groupLabel = (g,i) => `欄位 ${i+1}｜${g.map(m=>m.name||G.Moves.BY_ID[m.id]?.name||m.id).join(' ＋ ')}`;
  const itemOptions = selected => `<option value="">— 無裝備 —</option>${G.Items.LIST.map(it=>`<option value="${it.id}" ${it.id===selected?'selected':''}>${esc(it.name)}</option>`).join('')}`;
  const section = (title,content,note='') => `<section class="jc-card"><div class="jc-cardtop"><h3>${title}</h3>${note?`<span>${note}</span>`:''}</div>${content}</section>`;
  const b=(label,act,kind='')=>`<button type="button" class="jc-btn ${kind}" data-action="${act}">${label}</button>`;
  const field=(id,label,value,type='number',min=0,max=999999999,step='any')=>`<label>${label}<input id="jc-${id}" type="${type}" value="${esc(value)}" ${type==='number'?`min="${min}" max="${max}" step="${step}"`:''}></label>`;
  const select = (id,label,arr,selected) => `<label>${label}<select id="jc-${id}">${arr.map(([v,n])=>`<option value="${esc(v)}" ${String(v)===String(selected)?'selected':''}>${esc(n)}</option>`).join('')}</select></label>`;
  const numControls = (ids) => ids.map(([id,label,v,min,max,step])=>field(id,label,v,'number',min,max,step)).join('');
  function content(name){
    const p=pl(),s=saveData();
    if(name==='home')return `<div class="jc-hero"><div class="jc-eyebrow">YOUR GAME · YOUR RULES</div><h2>無限可能，<br><em>由你定義。</em></h2><p>在任何畫面輸入 JAMI 即可開啟。控制角色、技能、裝備、世界與存檔；關閉後繼續冒險。</p><div class="jc-badges"><span>版本 3.1</span><span>${solo()?'單人遊戲':'多人連線：編輯鎖定'}</span><span>${s?(G.DB.mode==='cloud'?'Firebase 帳號':'本地帳號'):'未登入／遊客'}</span></div></div>
      <div class="jc-metrics"><div><span>當前狀態</span><strong>${esc(G.Game?.state||'未知')}</strong></div><div><span>寶可夢</span><strong>${esc(p?.mon?.name|| (s?.partner ? G.DEX_BY[s.partner]?.name : '未選擇')||'未選擇')}</strong></div><div><span>等級</span><strong>${p?'Lv. '+p.level:'—'}</strong></div><div><span>持有金幣</span><strong>${fmt(s?.coins)}</strong></div></div>
      ${section('立即操作',`<div class="jc-actions">${b('回滿生命','heal','primary')}${b('升級一次','level')}${b('無敵切換','god-toggle')}${b('清除敵人','clear-enemies')}${b('下載存檔','backup')}</div><p class="jc-desc">正在戰鬥才能使用角色相關功能。多人連線時禁止修改遊戲狀態，避免影響其他人。</p>`)}
      ${section('兩種模式',`<label class="jc-switch"><input id="jc-experiment" type="checkbox" ${experiment?'checked':''}><span><b>實驗模式</b><small>允許額外裝備效果、突破四技能欄位及擴張測試數值。關閉後仍保留本局已套用的實驗配置。</small></span></label>`)}
      `;
    if(name==='trainer')return `${section('指定寶可夢',`${pickDex(selectedMon)}<div class="jc-actions">${b('立即切換目前角色','swap-mon','primary')}${b('設為下次開局夥伴','partner')}${b('取得這隻寶可夢','grant-one')}${b('取得這隻異色','shiny-one')}</div><label class="jc-switch"><input id="jc-shiny" type="checkbox" ${p?.shiny?'checked':''}><span><b>使用異色外觀</b><small>需要該寶可夢有異色素材</small></span></label>`,'切換角色保留本局技能與位置')}
      ${section('生命與角色成長',`<div class="jc-grid">${numControls([['level-value','當前等級',p?.level||1,1,999,1],['maxhp','最大生命',Math.round(p?.maxHp||100),1,9999999,1],['hp','目前生命',Math.round(p?.hp||100),0,9999999,1],['baseatk','基礎攻擊',p?.baseAtk??1,0.01,999999,'any'],['basespd','基礎速度',p?.baseSpd??1,0.01,10000,'any'],['crit','暴擊率（%）',Math.round((p?.critChance||0)*100),0,100,1],['regen','每秒恢復',p?.regenFlat??0,0,10000,'any'],['magnet','吸取半徑',p?.magnet??78,1,5000,'any']])}</div><div class="jc-actions">${b('套用角色數值','player-stats','primary')}${b('生命值全滿','heal')}${b('等級 +1','level')}</div><p class="jc-desc">基礎攻擊、基礎速度與吸取半徑可以輸入小數；所有欄位檢查通過後才會一次套用。這些變更僅影響本局。</p>`)}
      `;
    if(name==='moves'){
      const slots=p?.slots||[];
      const maxSlots=experiment?8:4;
      return `${section('當局技能欄',`<p class="jc-desc">選擇要編輯的欄位，再選擇招式與等級。替換時保留其他欄位；可以任意使用所有屬性的技能。</p><div class="jc-moves">${Array.from({length:maxSlots},(_,i)=>{const m=slots[i]?.[0];return `<div class="jc-slot"><div class="jc-slothead"><b>欄位 ${i+1}</b><small>${m?`Lv.${m.lvl}${m.evolved?' · 已進化':''}`:'空欄'}</small></div><select id="jc-move-${i}">${moveOptions(m?.id||'')}</select><div class="jc-row">${field('mvlevel-'+i,'技能等級',m?.lvl||1,'number',1,5,1)}<div class="jc-slotbuttons">${b('套用','slot-set-'+i,'primary')}${b('啟用','slot-active-'+i)}${b('清除','slot-del-'+i)}</div></div><div class="jc-groupmoves">${slots[i]?.length?slots[i].map((skill,j)=>`<span class="jc-movechip">${j?'＋ ':''}${esc(skill.name||G.Moves.BY_ID[skill.id]?.name||skill.id)} <small>Lv.${skill.lvl}</small></span>`).join(''):'<span class="jc-empty">尚未裝配技能</span>'}</div>${slots[i]?.length>1?'<p class="jc-bondhint">羈絆已啟動：切到此欄時，上述招式會一起發動</p>':''}</div>`;}).join('')}</div><div class="jc-actions">${b('全部升到最高級','all-max','primary')}${b('進化可進化的技能','evolve-all')}${b('重新整理彈幕','clear-orbs')}</div>`,'標準四欄／實驗八欄')}
       ${section('羈絆合成',`<div class="jc-bondguide"><strong>什麼是羈絆？</strong><p>把兩個技能欄位合成一組。戰鬥中切換到這一組，就能讓組內所有技能<b>同時自動攻擊</b>，不需要輪流切招。</p><div class="jc-bondexample"><span>欄位 1：火花</span><b>＋</b><span>欄位 2：泡沫</span><b>→</b><span class="jc-result">欄位 1：火花 ＋ 泡沫</span></div><p>原本的欄位 2 會騰出位置。這裡是作弊編輯器，不消耗擊敗傳說寶可夢獲得的羈絆次數。</p></div><div class="jc-grid">${select('bond-to','① 主欄位（合併後保留）',slots.map((g,i)=>[i,groupLabel(g,i)]),0)}${select('bond-from','② 要併進去的欄位',slots.map((g,i)=>[i,groupLabel(g,i)]),Math.min(1,slots.length-1))}</div><div class="jc-bondpreview" id="jc-bond-preview" aria-live="polite"></div><div class="jc-actions">${b('將②合併進①','bond','primary')}${b('拆開①所選的羈絆','bond-break')}${b('拆開所有羈絆','unbond')}</div><p class="jc-desc">普通模式：一組最多四招；實驗模式：一組最多八招。合併後，到上方技能欄位按「啟用」即可立即使用該羈絆。</p>`)}
       ${section('單獨調整技能參數',`<div class="jc-grid">${select('editmove','當前技能',p?.moves?.map(m=>[m.id,m.name+' · Lv.'+m.lvl])||[],p?.moves?.[0]?.id)}${select('move-field','調整參數',[['dmg','傷害'],['cd','冷卻（秒）'],['count','攻擊數量'],['radius','攻擊範圍'],['speed','彈體速度'],['pierce','穿透次數'],['dur','持續時間']], 'dmg')}${field('move-value','新的數值',20,'number',0,100000,0.1)}</div><div class="jc-actions">${b('套用技能參數','move-param','primary')}</div><p class="jc-desc">修改的是技能實例，不會更改其他玩家或原始技能資料。</p>`)}
       `;
    }
    if(name==='gear')return `${section('裝備配置',`<div class="jc-grid">${select('item','單裝備欄位',G.Items.LIST.map(i=>[i.id,i.name]).concat([['','— 無裝備 —']]),p?.item||'')}${select('extra-item','額外裝備（實驗）',G.Items.LIST.map(i=>[i.id,i.name]),selectedItem||'leftovers')}</div><div class="jc-actions">${b('立即換裝','equip','primary')}${b('卸下主裝備','unequip')}${b('增加額外裝備','extra-add')}${b('移除額外裝備','extra-remove')}${b('清除額外裝備','extra-clear')}</div><p class="jc-desc">主裝備：${esc(G.Items.BY[p?.item]?.name||'無')}　｜　額外裝備：${esc([...p?._jamiExtraItems||[]].map(id=>G.Items.BY[id]?.name||id).join('、')||'無')}</p><p class="jc-desc">額外裝備只有在實驗模式開啟時才能新增；同一件裝備不會重複疊加，卸下時會撤銷對應屬性效果。</p>`)}
      ${section('裝備圖鑑',`<div class="jc-itemlist">${G.Items.LIST.map(i=>`<div><b>${esc(i.name)}</b><span>${esc(i.desc)}</span></div>`).join('')}</div><div class="jc-actions">${b('解鎖所有裝備發現紀錄','items-discovered')}</div>`)}
      `;
    if(name==='battle')return `${section('即時戰鬥倍率',`<div class="jc-grid">${numControls([['damage','傷害倍率',vals.damage,0,1000,0.1],['move','移動速度倍率',vals.move,0.05,20,0.05],['cooldown','技能冷卻倍率',vals.cooldown,0.01,10,0.01],['xp','經驗值倍率',vals.xp,0,1000,0.1]])}</div><div class="jc-actions">${b('套用倍率','multipliers','primary')}${b('恢復正常倍率','multipliers-reset')}</div><label class="jc-switch"><input type="checkbox" id="jc-god" ${vals.god?'checked':''}><span><b>無敵模式</b><small>阻擋受到的傷害，不影響原有攻擊邏輯</small></span></label>`)}
      ${section('即時角色操作',`<div class="jc-actions">${b('生命全滿','heal','primary')}${b('立即升級','level')}${b('升 10 級','level-ten')}${b('吸收全地圖掉落物','magnet-all')}${b('擊殺畫面中敵人','kill-visible')}</div>`)}
      `;
    if(name==='world')return `${section('地圖與時間',`<div class="jc-grid">${select('biome','生態區',[[0,'森林'],[1,'水晶洞窟'],[2,'火山']],0)}${select('weather','天氣', [['','無天氣'],...Object.entries(G.Weather.KINDS).map(([k,v])=>[k,v.name])],'')}${field('weather-dur','天氣持續（秒）',120,'number',5,3600,1)}${field('time','遊戲時間（秒）',Math.round(G.Game.st.time),'number',0,1800,1)}${field('speed','遊戲速度倍率',1,'number',0.1,4,0.1)}</div><div class="jc-actions">${b('套用生態區','biome-set','primary')}${b('套用天氣','weather-set')}${b('設定遊戲時間','time-set')}${b('設定遊戲速度','speed-set')}</div><p class="jc-desc">遊戲時間超過 30 分鐘可能觸發原版最終事件，測試時請留意。</p>`)}
      ${section('敵潮與世界事件',`<div class="jc-grid">${field('enemy-count','立即產生數量',10,'number',1,64,1)}${select('boss-choice','選擇本局 Boss',G.Enemies.BOSSES.map((b,i)=>[i,(i+1)+' · '+b.name]),0)}${select('event','事件', [['horde','屬性敵潮'],['gold','黃金時間'],['lost','迷路的寶可夢']], 'gold')}</div><div class="jc-actions">${b('召喚敵人','spawn','primary')}${b('召喚異色敵人','spawn-shiny')}${b('立即召喚 Boss','boss')}${b('清除全部敵人','clear-enemies')}${b('觸發特殊事件','event')}${b('召喚寶藏敵人','thief')}</div>`)}
      ${section('異空間裂縫',`<div class="jc-grid">${select('rift-type','指定屬性',Object.keys(G.U.TYPE_NAME).map(k=>[k,G.U.TYPE_NAME[k]]),'fire')}</div><div class="jc-actions">${b('立即開啟裂縫','rift-open','primary')}${b('指定下一個裂縫屬性','rift-type')}${b('立即進入屬性競技場','rift-arena')}</div><p class="jc-desc">直接進入競技場會啟動原本的傳說對戰流程。</p>`)}
      `;
    if(name==='account')return `${section('資源帳本',`<div class="jc-grid">${numControls([['coins','金幣',s?.coins||0,0,999999999,1],['t1','一般抽卡券',s?.tickets?.t1||0,0,999999999,1],['t10','十連抽卡券',s?.tickets?.t10||0,0,999999999,1]])}</div><div class="jc-actions">${b('儲存金幣與抽卡券','resources','primary')}${b('資源全部歸零','resources-zero','danger')}</div><p class="jc-desc">帳號資料會先保留本機備份，再提交到 Firebase。跨裝置合併仍依遊戲原本的帳本規則進行。</p>`)}
      ${section('收藏與養成',`${pickDex(selectedMon)}<div class="jc-actions">${b('取得指定寶可夢','grant-one','primary')}${b('取得指定異色','shiny-one')}${b('全部寶可夢解鎖','grant-all')}${b('全部可用異色解鎖','grant-all-shiny')}${b('指定寶可夢永久升級全滿','upgrade-one')}${b('目前夥伴永久升級全滿','upgrade-partner')}${b('全裝備發現紀錄','items-discovered')}</div>`)}
      ${section('分區抽卡保底',`<div class="jc-grid">${select('pity-key','抽卡地區',[[1,'關都'],[2,'城都'],[3,'豐緣'],[4,'神奧'],[5,'合眾'],[6,'卡洛斯'],[7,'阿羅拉'],[8,'伽勒爾'],[9,'帕底亞']],1)}${field('pity-count','累積保底次數',0,'number',0,70,1)}</div><div class="jc-actions">${b('設定保底值','pity')}${b('下一抽必出傳說','pity-next')}</div><div class="jc-row" style="margin-top:14px">${field('shiny-pulls','接下來幾抽必出異色',1,'number',1,100,1)}${b('套用異色測試','gacha-shiny','primary')}</div><p class="jc-desc">使用遊戲原生的 1～9 地區代碼及保底機制。指定異色僅影響目前分頁中的抽卡測試，不直接解鎖收藏。</p>`)}
      `;
    if(name==='presets')return `${section('快速配置',`<div class="jc-grid">${field('preset-name','配置名稱','我的測試配置','text')}${select('preset-pick','已儲存的配置',Object.keys(readPresets()).map(k=>[k,k]),Object.keys(readPresets())[0]||'')}</div><div class="jc-actions">${b('儲存目前角色配置','preset-save','primary')}${b('套用已選配置','preset-load')}${b('刪除此配置','preset-delete','danger')}${b('匯出配置 JSON','preset-export')}</div><p class="jc-desc">配置儲存在目前瀏覽器，內容包含寶可夢、技能與欄位組合、裝備、額外裝備、數值及作弊倍率。配置不會自動寫入 Firebase。</p>`)}
      ${section('安全備份',`<div class="jc-actions">${b('下載目前帳號存檔 JSON','backup','primary')}${b('匯出全部測試配置','preset-export')}${b('重置本局作弊倍率','multipliers-reset')}</div><p class="jc-desc">每次修改永久存檔時會自動建立本機快照。下載的 JSON 僅作備份用途，本版不提供直接覆蓋雲端存檔的危險還原按鈕。</p>`)}
      `;
    return '';
  }
  function render(next=tab){
    if(!overlay)return;
    const previousTab=tab, previousScroll=$('pane')?.scrollTop || 0;
    if(next==='trainer' && tab!==next) selectedMon=pl()?.dex || saveData()?.partner || selectedMon;
    tab=next;
    const p=pl();
    $('nav').innerHTML=NAV.map(([id,label,icon])=>`<button type="button" class="jc-navitem ${id===tab?'active':''}" data-tab="${id}"><i>${icon}</i><span>${label}</span></button>`).join('');
    $('heading').textContent=NAV.find(([id])=>id===tab)?.[1]||'概覽';
    $('pane').innerHTML=content(tab);
    $('pane').scrollTop=next===previousTab?previousScroll:0;
    if(tab==='home'){$('experiment')?.addEventListener('change',e=>{experiment=e.target.checked;status(experiment?'實驗模式已啟用。':'已關閉實驗模式。');});}
    // Combo filter runs entirely in the browser; do not destroy game input listeners.
    $('dex-search')?.addEventListener('input',e=>{
      const q=e.target.value.trim().toLowerCase(),select=$('dex');
      for(const option of select.options){option.hidden=!option.textContent.toLowerCase().includes(q);}
      const first=[...select.options].find(o=>!o.hidden);
      if(first&&!([...select.selectedOptions].some(o=>!o.hidden)))select.value=first.value;
    });
    $('dex')?.addEventListener('change',e=>{selectedMon=+e.target.value;});
    $('extra-item')?.addEventListener('change',e=>{selectedItem=e.target.value;});
    if(tab==='moves'){
      $('bond-to')?.addEventListener('change',updateBondPreview);
      $('bond-from')?.addEventListener('change',updateBondPreview);
      updateBondPreview();
    }
    for(const input of $('pane').querySelectorAll('.jc-invalid'))input.classList.remove('jc-invalid');
    $('god')?.addEventListener('change',e=>{if(!solo()){e.target.checked=vals.god;return status('多人模式不可使用作弊。',true);}vals.god=e.target.checked;mark();status('無敵模式 '+(vals.god?'已啟用':'已關閉'));});
    status(notice||'準備就緒',noticeError);
  }
  function readPresets(){try { const p=JSON.parse(localStorage.getItem(PRESETS)||'{}');return p&&typeof p==='object'&&!Array.isArray(p)?p:{}; }catch(e){return {};}}
  function storePresets(d){localStorage.setItem(PRESETS,JSON.stringify(d));}
  function download(name,data){
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const link=document.createElement('a'); const url=URL.createObjectURL(blob);
    link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function syncMoves(p){p.moves=p.slots.flat();p.maxMoves=Math.max(p.maxMoves,experiment?8:4);p.active=Math.max(0,Math.min(p.active,p.slots.length-1));G.Projectiles.clearOrbs(p);}
  function switchMon(id,shiny){
    const p=requireRun(),m=G.DEX_BY[id];if(!m)throw Error('無效的寶可夢編號。');
    const before=p.maxHp,ratio=p.hp/Math.max(1,before);
    const hpBonus=before-p.mon.hp;
    p.mon=m;p.dex=m.dex;p.shiny=!!shiny&&G.Sprites.hasShiny(m.dex);
    G.Sprites.preload?.([m.dex]);
    p.anim=new G.Sprites.Animator(m.dex,1,p.shiny);
    p.r=G.Sprites.bodyRadius(m.dex);p.bodyH=G.Sprites.bodyHeight(m.dex);
    p.maxHp=Math.max(1,m.hp+hpBonus);p.hp=Math.max(1,Math.min(p.maxHp,p.maxHp*ratio));
    p.baseAtk=m.atk;p.baseSpd=m.spd;G.Projectiles.clearOrbs(p);mark();
  }
  function extraChange(id,add){
    const p=requireRun();if(!experiment&&add)throw Error('請先在概覽開啟實驗模式。');
    const item=G.Items.BY[id];if(!item)throw Error('裝備不存在。');
    p._jamiExtraItems=p._jamiExtraItems||new Set();
    if(id===p.item)throw Error('此裝備已在主裝備欄中。');
    if(add&&!p._jamiExtraItems.has(id)){item.on(p);p._jamiExtraItems.add(id);}
    else if(!add&&p._jamiExtraItems.has(id)){item.off(p);p._jamiExtraItems.delete(id);}
    mark();
  }
  function clearExtras(p){if(!p?._jamiExtraItems)return;for(const id of [...p._jamiExtraItems]){G.Items.BY[id]?.off(p);p._jamiExtraItems.delete(id);}}
  function moveSlot(index){
    const p=requireRun(),id=val('move-'+index),lv=numeric(val('mvlevel-'+index),1,5,true);
    if(index>= (experiment?8:4))throw Error('請先開啟實驗模式擴張欄位。');
    if(!id){removeSlot(index);return;}
    if(!G.Moves.BY_ID[id])throw Error('技能不存在。');
    // Track the actual group object: removing a duplicate from an earlier slot must
    // not shift the selected target and overwrite an unrelated bonded group.
    const fresh=G.Moves.instance(id,lv);
    const target=p.slots[index] || [];
    if(!p.slots.includes(target))p.slots.push(target);
    target[0]=fresh; // Keep all other skills in the bond.
    for(let i=p.slots.length-1;i>=0;i--){
      const group=p.slots[i];
      for(let j=group.length-1;j>=0;j--){
        if(group===target && j===0)continue;
        if(group[j].id===id)group.splice(j,1);
      }
      if(!group.length)p.slots.splice(i,1);
    }
    syncMoves(p);p.active=p.slots.indexOf(target);mark();
  }
  function removeSlot(i){const p=requireRun();if(p.slots.length<=1)throw Error('至少需要保留一個技能欄位。');p.slots.splice(i,1);syncMoves(p);mark();}
  function doBond(){const p=requireRun(),to=+val('bond-to'),from=+val('bond-from');
    if(to===from||!p.slots[to]||!p.slots[from])throw Error('請選擇兩個不同的有效欄位。');
    if(p.slots[to].length+p.slots[from].length>(experiment?8:4))throw Error('羈絆組合超過目前允許的技能數量。');
    const target=p.slots[to];target.push(...p.slots[from]);p.slots.splice(from,1);
    p.active=p.slots.indexOf(target);syncMoves(p);mark();}
  function breakBond(){
    const p=requireRun(),idx=+val('bond-to'),group=p.slots[idx];
    if(!group||group.length<2)throw Error('主欄位尚未合成羈絆；請選擇有兩招以上的欄位。');
    if(p.slots.length+group.length-1>(experiment?8:4))throw Error('拆開後欄位將超過目前容量。請先啟用實驗模式。');
    const singles=group.map(m=>[m]);p.slots.splice(idx,1,...singles);p.active=idx;syncMoves(p);mark();
  }
  function unblockBond(){const p=requireRun();const singles=p.moves.map(m=>[m]);if(singles.length>(experiment?8:4))throw Error('拆開後會超過欄位容量，請先開啟實驗模式。');p.slots=singles;p.active=0;syncMoves(p);mark();}
  function updateBondPreview(){
    const p=pl(),el=$('bond-preview');if(!el)return;
    const to=+val('bond-to'),from=+val('bond-from'),a=p?.slots?.[to],b=p?.slots?.[from];
    const button=overlay.querySelector('[data-action="bond"]');
    const ok=!!(a&&b&&to!==from&&a.length+b.length<=(experiment?8:4));
    if(button)button.disabled=!ok;
    if(!a||!b){el.textContent='請先進入單人戰鬥，並至少裝備兩個技能欄位。';return;}
    if(to===from){el.textContent='請分別選擇不同的主欄位與來源欄位。';return;}
    if(!ok){el.textContent=`兩組合計 ${a.length+b.length} 招，超過單組上限 ${experiment?8:4} 招。`;return;}
    el.innerHTML=`<small>合併後預覽 · 主欄位 ${to+1} · ${a.length+b.length} 招同時施放</small><div class="jc-combochips">${[...a,...b].map(m=>`<span>${esc(m.name||G.Moves.BY_ID[m.id]?.name||m.id)} <small>Lv.${m.lvl}</small></span>`).join('<b>＋</b>')}</div>`;
  }
  function accountAction(action){const s=requireAccount();backupBefore();const m=chooseMon();
    if(action==='resources'||action==='resources-zero'){
      const zero=action==='resources-zero';
      s.coins=zero?0:numeric(val('coins'),0,999999999,true);
      s.tickets=s.tickets||{t1:0,t10:0};
      s.tickets.t1=zero?0:numeric(val('t1'),0,999999999,true);
      s.tickets.t10=zero?0:numeric(val('t10'),0,999999999,true);
    }else if(action==='grant-one'){G.DB.grant(m.dex,'jami-control');}
    else if(action==='shiny-one'){if(!G.Sprites.hasShiny(m.dex))throw Error('此寶可夢沒有異色素材。');G.DB.grantShiny(m.dex,'jami-control');}
    else if(action==='grant-all'||action==='grant-all-shiny'){
      for(const mon of G.DEX){if(action==='grant-all')G.DB.grant(mon.dex,'jami-control');else if(G.Sprites.hasShiny(mon.dex))G.DB.grantShiny(mon.dex,'jami-control');}
    }else if(action==='partner'){
      G.DB.grant(m.dex,'jami-control');s.partner=m.dex;s.partnerShiny=check('shiny')&&!!G.DB.ownsShiny(m.dex);
    }else if(action==='upgrade-one'||action==='upgrade-partner'){
      const id=action==='upgrade-partner'?s.partner:m.dex;if(!id)throw Error('尚未選擇夥伴。');
      G.DB.grant(id,'jami-control');const data=G.DB.upgradesOf(id);for(const d of G.Upgrades.LIST)data[d.id]=d.max;
    }else if(action==='items-discovered'){
      s.itemsFound=s.itemsFound||{};for(const item of G.Items.LIST)s.itemsFound[item.id]=Date.now();
    }else if(action==='pity'||action==='pity-next'){
      s.pity=s.pity||{};s.pity[Number(val('pity-key'))]=action==='pity-next'?69:numeric(val('pity-count'),0,70,true);
    }
    saveNow();
    status('已修改帳號資料並提交儲存。雲端帳號請等待同步完成。');
  }
  function getPreset(){const p=requireRun();return {version:3,mon:p.dex,shiny:p.shiny,level:p.level,maxHp:p.maxHp,hp:p.hp,baseAtk:p.baseAtk,baseSpd:p.baseSpd,critChance:p.critChance,regenFlat:p.regenFlat,magnet:p.magnet,item:p.item,extras:[...p._jamiExtraItems||[]],slots:p.slots.map(g=>g.map(m=>({id:m.id,lvl:m.lvl,evolved:!!m.evolved}))),active:p.active,vals:{...vals}};}
  function applyPreset(cfg){const p=requireRun();if(!cfg||cfg.version!==3||!Array.isArray(cfg.slots)||cfg.slots.length<1||cfg.slots.length>8)throw Error('配置格式不正確。');
    if(cfg.slots.length>4)experiment=true;
    switchMon(+cfg.mon,!!cfg.shiny);
    const next=cfg.slots.map(g=>{
      if(!Array.isArray(g)||g.length<1||g.length>8)throw Error('技能組合不合法。');
      return g.map(m=>{if(!G.Moves.BY_ID[m.id])throw Error('無效技能：'+m.id);const instance=G.Moves.instance(m.id,numeric(m.lvl,1,5,true));if(m.evolved)G.Moves.evolve(instance);return instance;});
    });
    if(new Set(next.flat().map(m=>m.id)).size!==next.flat().length)throw Error('技能配置包含重複的技能。');
    clearExtras(p);p.equip(null);p.slots=next;p.active=Math.min(Math.max(0,cfg.active||0),next.length-1);syncMoves(p);
    for(const k of ['level','maxHp','hp','baseAtk','baseSpd','critChance','regenFlat','magnet'])if(cfg[k]!=null)p[k]=numeric(cfg[k],0,10000000);
    p.xpNext=G.Player.xpFor(p.level);p.hp=Math.min(p.hp,p.maxHp);
    if(cfg.item&&G.Items.BY[cfg.item])p.equip(cfg.item);
    if(Array.isArray(cfg.extras))for(const id of cfg.extras){if(id!==p.item&&G.Items.BY[id]){experiment=true;extraChange(id,true);}}
    for(const k of ['damage','move','cooldown','xp'])vals[k]=numeric(cfg.vals?.[k]??1,0,1000);
    vals.god=!!cfg.vals?.god;mark();
  }
  function dispatch(a){
    if(!solo()&&!['backup','preset-export'].includes(a))throw Error('多人連線期間不能修改遊戲狀態或玩家數值。');
    if(['resources','resources-zero','grant-one','shiny-one','grant-all','grant-all-shiny','partner','upgrade-one','upgrade-partner','items-discovered','pity','pity-next'].includes(a)){accountAction(a);return;}
    if(a==='gacha-shiny'){G.Gacha.debugForceShiny(numeric(val('shiny-pulls'),1,100,true));return status('已安排後續抽卡的異色測試。');}
    if(a==='backup'){download('pokesurvivor-jami-backup-'+Date.now()+'.json',requireAccount());return status('存檔已下載。');}
    if(a==='preset-export'){download('jami-control-presets.json',readPresets());return status('測試配置已匯出。');}
    if(a==='preset-save'){const name=(val('preset-name')||'').trim();if(!name||name.length>36)throw Error('配置名稱需在 1～36 個字元內。');const data=readPresets();data[name]=getPreset();storePresets(data);render('presets');return status('已保存配置：'+name);}
    if(a==='preset-delete'){const name=val('preset-pick'),data=readPresets();if(!name||!data[name])throw Error('請選擇配置。');delete data[name];storePresets(data);render('presets');return status('已刪除配置。');}
    if(a==='preset-load'){const data=readPresets(),name=val('preset-pick');if(!data[name])throw Error('請先儲存配置。');applyPreset(data[name]);render('presets');return status('已套用配置：'+name);}
    if(a==='god-toggle'){requireRun();vals.god=!vals.god;mark();return status('無敵：'+(vals.god?'開啟':'關閉'));}
    if(a==='multipliers'||a==='multipliers-reset'){requireRun();for(const k of ['damage','move','cooldown','xp'])vals[k]=a==='multipliers-reset'?1:numeric(val(k),k==='move'?0.05:k==='cooldown'?0.01:0,k==='move'?20:k==='cooldown'?10:1000);mark();render(tab);return status('戰鬥倍率已套用。');}
    if(a==='swap-mon'){switchMon(+val('dex'),check('shiny'));render('trainer');return status('目前角色已即時切換。');}
    if(a==='player-stats'){
      const p=requireRun();
      const level=checkedNumber('level-value','當前等級',1,999,true);
      const maxHp=checkedNumber('maxhp','最大生命',1,9999999,true);
      const hp=checkedNumber('hp','目前生命',0,maxHp,true);
      const baseAtk=checkedNumber('baseatk','基礎攻擊',0.01,999999);
      const baseSpd=checkedNumber('basespd','基礎速度',0.01,10000);
      const critChance=checkedNumber('crit','暴擊率',0,100)/100;
      const regenFlat=checkedNumber('regen','每秒恢復',0,10000);
      const magnet=checkedNumber('magnet','吸取半徑',1,5000);
      Object.assign(p,{level,maxHp,hp,baseAtk,baseSpd,critChance,regenFlat,magnet});
      p.xpNext=G.Player.xpFor(p.level);mark();
      render('trainer');return status('全部八項角色數值已成功套用（僅限本局）。');
    }
    if(a==='heal'){const p=requireRun();p.hp=p.maxHp;mark();return status('生命值已回滿。');}
    if(a==='level'||a==='level-ten'){const p=requireRun(),count=a==='level-ten'?10:1;p.level+=count;p.xpNext=G.Player.xpFor(p.level);mark();return status('等級已提升 '+count+' 級（不觸發選卡）。');}
    if(a.startsWith('slot-set-')){moveSlot(+a.slice(9));render('moves');return status('技能欄位已更新。');}
    if(a.startsWith('slot-del-')){removeSlot(+a.slice(9));render('moves');return status('技能欄位已移除。');}
    if(a.startsWith('slot-active-')){const p=requireRun(),idx=+a.slice(12);if(!p.slots[idx])throw Error('欄位為空。');p.active=idx;G.Projectiles.clearOrbs(p);mark();return status('目前作用技能：欄位 '+(idx+1));}
    if(a==='all-max'){const p=requireRun();for(const m of p.moves)while(G.Moves.levelUp(m)){};mark();render('moves');return status('目前技能全部升到最高。');}
    if(a==='evolve-all'){const p=requireRun();let n=0;for(const m of p.moves)if(G.Moves.evolve(m))n++;mark();render('moves');return status('已進化 '+n+' 個可進化技能。');}
    if(a==='bond'){doBond();render('moves');return status('羈絆合成成功！現在啟用該欄位，就能同時施放組內所有招式。');}
    if(a==='bond-break'){breakBond();render('moves');return status('已拆開指定羈絆，每個技能恢復獨立欄位。');}
    if(a==='unbond'){unblockBond();render('moves');return status('已拆開全部羈絆。');}
    if(a==='move-param'){const p=requireRun(),m=p.moves.find(m=>m.id===val('editmove')),key=val('move-field');if(!m||!['dmg','cd','count','radius','speed','pierce','dur'].includes(key))throw Error('請指定有效的技能和參數。');m[key]=numeric(val('move-value'),key==='cd'?0.01:0,100000);mark();return status(m.name+' 的 '+key+' 已調整為 '+m[key]);}
    if(a==='clear-orbs'){const p=requireRun();G.Projectiles.clearOrbs(p);mark();return status('彈幕已重置。');}
    if(a==='equip'||a==='unequip'){const p=requireRun(),id=a==='unequip'?null:val('item');if(id&&!G.Items.BY[id])throw Error('裝備不存在。');if(p._jamiExtraItems?.has(id)){G.Items.BY[id].off(p);p._jamiExtraItems.delete(id);}p.equip(id);mark();render('gear');return status('主裝備已更新。');}
    if(a==='extra-add'||a==='extra-remove'){extraChange(val('extra-item'),a==='extra-add');render('gear');return status('額外裝備已更新。');}
    if(a==='extra-clear'){clearExtras(requireRun());mark();render('gear');return status('額外裝備已清除。');}
    if(a==='biome-set'){requireRun();G.World.setBiome(+val('biome'));mark();return status('生態區已切換（下次原版輪替仍可能覆蓋）。');}
    if(a==='weather-set'){requireRun();const k=val('weather');if(!k)G.Weather.clear();else G.Weather.debugStart(k,numeric(val('weather-dur'),5,3600,true));mark();return status('天氣已更新。');}
    if(a==='time-set'){requireRun();G.Game.debugTime(numeric(val('time'),0,1800,true));mark();return status('遊戲時間已設定。');}
    if(a==='speed-set'){requireRun();G.Game.debugSpeed(numeric(val('speed'),0.1,4));mark();return status('遊戲速度已設定。');}
    if(a==='spawn'||a==='spawn-shiny'){requireRun();const n=numeric(val('enemy-count'),1,64,true);if(a==='spawn-shiny')G.Spawner.debugForceShiny(n);G.Spawner.burst(n);mark();return status('已觸發敵群生成。');}
    if(a==='boss'){requireRun();if(!G.Spawner.debugSpawnBoss(Number(val('boss-choice'))))throw Error('目前不允許召喚 Boss。');mark();return status('Boss 已召喚。');}
    if(a==='clear-enemies'){requireRun();G.EnemyMgr.clear();mark();return status('敵人已清除。');}
    if(a==='kill-visible'){const p=requireRun();let n=0;for(const e of [...G.EnemyMgr.all()])if(G.Camera.sees(e.x,e.y,30)){e.hurt(1e9,'#ffce65',0,0,0);n++;}mark();return status('已攻擊畫面中 '+n+' 個敵人。');}
    if(a==='magnet-all'){requireRun();G.Pickups.pullAll();mark();return status('已吸引地圖掉落物。');}
    if(a==='event'){requireRun();G.Events.debugStart(val('event'));mark();return status('特殊事件已觸發。');}
    if(a==='thief'){requireRun();G.Events.debugThief();mark();return status('寶藏敵人已召喚。');}
    if(a==='rift-open'){requireRun();G.Rift.debugOpen();mark();return status('裂縫已開啟。');}
    if(a==='rift-type'){requireRun();G.Rift.debugNextType(val('rift-type'));mark();return status('已指定下一個裂縫屬性。');}
    if(a==='rift-arena'){requireRun();G.Rift.debugArena(val('rift-type'));mark();return status('已進入指定屬性競技場。');}
    throw Error('尚未支援的操作：'+a);
  }
  function init(){if(overlay)return;
    overlay=document.createElement('div');overlay.id='jc-overlay';overlay.hidden=true;
    overlay.innerHTML=`<div class="jc-dialog" role="dialog" aria-modal="true" aria-label="JAMI CONTROL 遊戲控制台" tabindex="-1"><header class="jc-header"><div class="jc-brand"><span class="jc-glyph">✦</span><div><div class="jc-brandline">JAMI <b>CONTROL</b></div><small>POKÉSURVIVOR / PLAYER SANDBOX</small></div></div><div class="jc-headright"><span class="jc-hotkey">輸入 <kbd>J</kbd><kbd>A</kbd><kbd>M</kbd><kbd>I</kbd> 開啟</span><button class="jc-x" data-action="close" aria-label="關閉面板">×</button></div></header><div class="jc-layout"><nav class="jc-sidebar" id="jc-nav"></nav><main class="jc-main"><div class="jc-pagehead"><div><small>CONTROL CENTER</small><h1 id="jc-heading"></h1></div><span class="jc-live"><i></i> LIVE EDITOR</span></div><div id="jc-pane" class="jc-pane"></div></main></div><footer class="jc-footer"><div id="jc-status" role="status"></div><button data-action="close" class="jc-btn jc-close">關閉 <kbd>Esc</kbd></button></footer></div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click',e=>{if(e.target===overlay){close();return;}const button=e.target.closest('[data-tab],[data-action]');if(!button)return;
      if(button.dataset.tab){render(button.dataset.tab);return;}
      const a=button.dataset.action;if(a==='close'){close();return;}
      try{dispatch(a);}catch(err){console.warn('[JAMI Control]',err);status(err.message||String(err),true);}
    });
    window.addEventListener('keydown',keydown,true);
    G.DB?.onSync?.(state=>{if(opened&&G.DB.mode==='cloud'&&state==='ok')status('☁ Firebase 雲端同步完成。');});
  }
  return { init, isOpen:()=>opened, close, resetRun(){usedThisRun=false;Object.assign(vals,defaults);close();}, get usedThisRun(){return usedThisRun;},invincible:()=>solo()&&session()&&vals.god,damageMul:()=>solo()&&session()?vals.damage:1,moveMul:()=>solo()&&session()?vals.move:1,cooldownMul:()=>solo()&&session()?vals.cooldown:1,xpMul:()=>solo()&&session()?vals.xp:1 };
})();
