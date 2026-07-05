(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const qs = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => [...root.querySelectorAll(sel)];
  let CONFIG = null, VOCAB = [], GAME_POOL = [], currentMusic = null, timer = null, state = null;
  const LS = { recent: 'ai_battle_recent_scores_v2' };
  function rand(min, max){ return Math.random() * (max - min) + min; }
  function randInt(min, max){ return Math.floor(rand(min, max + 1)); }
  function sample(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
  function asset(kind, keyOrName){ const base=CONFIG.assets.basePath||'Resource/'; if(kind==='head') return base+CONFIG.assets.images.heads[keyOrName-1]; if(kind==='image') return base+CONFIG.assets.images[keyOrName]; if(kind==='music') return base+CONFIG.assets.music[keyOrName]; if(kind==='sound') return base+CONFIG.assets.sounds[keyOrName]; return base+keyOrName; }
  function setImg(el, src){ el.classList.remove('asset-missing'); el.src=src; el.onerror=()=>{el.classList.add('asset-missing'); el.onerror=null;}; }
  function playSound(key){ try{ const a=new Audio(asset('sound',key)); a.volume=.75; a.play().catch(()=>{}); }catch(e){} }
  function stopMusic(){ if(currentMusic){ try{ currentMusic.pause(); currentMusic.currentTime=0; }catch(e){} } currentMusic=null; }
  function playMusic(key, loop=false){ stopMusic(); try{ currentMusic=new Audio(asset('music',key)); currentMusic.loop=loop; currentMusic.volume=.42; currentMusic.play().catch(()=>{}); }catch(e){} }
  async function fetchJson(path){ const res=await fetch(path,{cache:'no-store'}); if(!res.ok) throw new Error(`${path} HTTP ${res.status}`); return res.json(); }
  function readFileJson(file){ return new Promise((resolve,reject)=>{ if(!file) return reject(new Error('未選擇檔案')); const r=new FileReader(); r.onload=()=>{try{resolve(JSON.parse(r.result));}catch(e){reject(e)}}; r.onerror=()=>reject(r.error); r.readAsText(file,'utf-8'); }); }
  function cloudConfig(){ return (CONFIG && CONFIG.googleSheets) ? CONFIG.googleSheets : {}; }
  function cloudEnabled(){ const c=cloudConfig(); return !!(c.enabled && c.webAppUrl); }
  function delay(ms){ return new Promise(resolve=>setTimeout(resolve,ms)); }
  function makeEntryId(){
    try{ if(window.crypto && crypto.randomUUID) return crypto.randomUUID(); }catch(e){}
    return 'entry-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10);
  }
  function buildQuery(params){
    const usp = new URLSearchParams();
    Object.entries(params||{}).forEach(([k,v])=>{ if(v!==undefined && v!==null) usp.set(k,String(v)); });
    return usp.toString();
  }
  function jsonpRequest(url, params={}, timeoutMs=8000){
    return new Promise((resolve,reject)=>{
      const cb = '__aiBattleTop100_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      const script = document.createElement('script');
      const done = (fn, value) => {
        clearTimeout(to);
        delete window[cb];
        script.remove();
        fn(value);
      };
      window[cb] = (data) => done(resolve, data);
      const sep = url.includes('?') ? '&' : '?';
      script.src = url + sep + buildQuery({...params, callback: cb, _: Date.now()});
      script.onerror = () => done(reject, new Error('雲端排行榜讀取失敗'));
      const to = setTimeout(()=>done(reject, new Error('雲端排行榜讀取逾時')), timeoutMs);
      document.body.appendChild(script);
    });
  }
  function setRankingStatus(text, isError=false){
    const el = $('rankStatus');
    if(!el) return;
    el.textContent = text || '';
    el.classList.toggle('error', !!isError);
  }
  function cleanDisplayTitle(value){
    const s = String(value ?? '').trim();
    if(!s) return '';
    const bases = (CONFIG && CONFIG.stageBaseTitles) ? CONFIG.stageBaseTitles : [];
    for(const base of bases){
      if(s === base || s === `${base}2` || s === `${base}3`) return base;
    }
    return s;
  }
  function stageBaseTitle(stage){ return cleanDisplayTitle((CONFIG.stageBaseTitles||[])[stage-1] || `Stage ${stage}`); }
  function normalizeRankingRow(row){
    const rawName = row.playerName || row.name || row.title || '匿名玩家';
    return {
      entryId: row.entryId || row.id || '',
      score: Number(row.score || 0),
      name: cleanDisplayTitle(rawName) || '匿名玩家',
      stage: Number(row.stage || row.level || 1),
      aiName: cleanDisplayTitle(row.aiName || ''),
      result: row.result || '',
      comboMax: Number(row.comboMax || 0),
      at: row.timestamp || row.at || ''
    };
  }
  async function fetchCloudRanking(me){
    const c = cloudConfig();
    if(!cloudEnabled()) return null;
    const params = {
      action: c.topAction || 'top100',
      apiKey: c.apiKey || '',
      limit: 100,
      entryId: me && me.entryId ? me.entryId : ''
    };
    let data;
    if(c.useJsonpForTop100 !== false){
      data = await jsonpRequest(c.webAppUrl, params, c.timeoutMs || 8000);
    } else {
      const url = c.webAppUrl + (c.webAppUrl.includes('?') ? '&' : '?') + buildQuery({...params, _: Date.now()});
      const res = await fetch(url, {cache:'no-store'});
      if(!res.ok) throw new Error('雲端排行榜 HTTP ' + res.status);
      data = await res.json();
    }
    if(!data || data.ok === false) throw new Error((data && data.error) || '雲端排行榜回傳錯誤');
    const topRows = (data.data || data.rows || [])
      .map(normalizeRankingRow)
      .sort((a,b)=>b.score-a.score)
      .slice(0,100);
    const meRow = data.meRow ? normalizeRankingRow(data.meRow) : null;
    return {
      topRows,
      meRank: Number(data.meRank || 0),
      meRow,
      total: Number(data.total || topRows.length)
    };
  }
  async function submitCloudScore(payload){
    const c = cloudConfig();
    if(!cloudEnabled()) return false;
    const body = {...payload, action: c.submitAction || 'submit', apiKey: c.apiKey || ''};
    await fetch(c.webAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-store',
      headers: {'Content-Type':'text/plain;charset=utf-8'},
      body: JSON.stringify(body)
    });
    return true;
  }
  function buildScorePayload(result){
    const totalQuestions = CONFIG.settings.totalQuestions;
    const totalTime = state.questions.reduce((sum,q)=>sum + (CONFIG.settings.secondsPerQuestion - Number(q.userRemain || 0)), 0);
    return {
      entryId: state.entryId,
      timestampIso: new Date().toISOString(),
      playerName: state.playerName,
      playerProfile: state.playerProfile ? state.playerProfile.label : '',
      score: Math.round(state.userScore || 0),
      scoreBeforeWinBonus: Math.round(state.scoreBeforeWinBonus ?? state.userScore ?? 0),
      winBonus: Math.round(state.winBonus || 0),
      correctCount: state.userRightCount || 0,
      totalQuestions,
      accuracy: totalQuestions ? Math.round((state.userRightCount || 0) / totalQuestions * 100) : 0,
      totalTime: Math.round(totalTime * 10) / 10,
      aiName: stageBaseTitle(state.stage),
      aiScore: Math.round(state.aiScore || 0),
      stage: state.stage,
      result,
      comboMax: state.maxCombo || 0
    };
  }

  async function loadDataAuto(){ CONFIG=await fetchJson('data/game-config.json'); VOCAB=await fetchJson('data/vocab.json'); afterDataLoaded(); }
  async function loadDataManual(){ try{ CONFIG=await readFileJson($('configFile').files[0]); VOCAB=await readFileJson($('vocabFile').files[0]); afterDataLoaded(); }catch(e){ $('loadMsg').textContent='JSON 載入失敗：'+e.message; } }
  function afterDataLoaded(){ GAME_POOL=VOCAB.filter(w=>w.sourceRow>=CONFIG.settings.questionSourceRowMin&&w.sourceRow<=CONFIG.settings.questionSourceRowMax&&isValidQuestionWord(w)); if(GAME_POOL.length<100) throw new Error('可用題庫太少，請確認 vocab.json'); $('loading').classList.add('hidden'); $('gameRoot').classList.remove('hidden'); buildLevelScreen(); }
  function isValidQuestionWord(item){ const w=String(item.word||''); return w.length>=4&&!(/[/.\s-]/.test(w))&&item.meaning; }
  function isValidWrongWord(item){ const w=String(item.word||''); return w.length>=4&&!(/[/.]/.test(w))&&item.meaning; }
  function hasFuzzyOverlap(a,b,len){ a=String(a||'').toLowerCase(); b=String(b||'').toLowerCase(); if(!a||!b||len<=0) return false; if(a.length<len||b.length<len) return a===b; const seen=new Set(); for(let i=0;i<=a.length-len;i++) seen.add(a.slice(i,i+len)); for(let i=0;i<=b.length-len;i++) if(seen.has(b.slice(i,i+len))) return true; return false; }
  function comboMultiplierTier(combo){ return Math.min(Math.max(Number(combo)||0,0), Number(CONFIG.settings.comboMultiplierCap||CONFIG.settings.comboCap||3)); }
  function comboMultiplier(combo){ const tier=comboMultiplierTier(combo); if(tier===2) return CONFIG.settings.combo2Multiplier; if(tier>=3) return CONFIG.settings.combo3Multiplier; return 1; }
  function winBonusForStage(stage){
    const list = CONFIG.settings.winBonusByStage || [];
    return Math.max(0, Number(list[(Number(stage)||1)-1] || 0));
  }
  function scoreFromRemain(sec){
    const total=Number(CONFIG.settings.secondsPerQuestion||10);
    const table=CONFIG.settings.scoreByRemainSecond||[];
    sec=clamp(Number(sec)||0,0,total);
    const low=Math.floor(sec);
    const high=Math.min(low+1,table.length-1,total);
    const frac=sec-low;
    const lowScore=Number(table[low]||0);
    const highScore=Number(table[high]!==undefined?table[high]:lowScore);
    return lowScore + (highScore-lowScore)*frac;
  }
  function parseScoreArray(raw){
    try{
      const arr=JSON.parse(raw||'[]');
      return Array.isArray(arr) ? arr.map(Number).filter(Number.isFinite).slice(-3) : [];
    }catch(e){ return []; }
  }
  function recentScores(){
    const arr=parseScoreArray(localStorage.getItem(LS.recent));
    if(arr.length) return arr;
    return (CONFIG.recentScoresSeed||[]).map(Number).filter(Number.isFinite).slice(-3);
  }
  function saveRecent(score){ const arr=recentScores(); arr.push(Number(score)||0); localStorage.setItem(LS.recent,JSON.stringify(arr.slice(-3))); }
  function matchedStage(){
    const arr=recentScores();
    if(!arr.length) return 1;
    const avg=Math.floor(arr.reduce((s,n)=>s+n,0)/arr.length);
    let stage=1;
    (CONFIG.settings.theoreticalMax||[]).forEach((threshold,idx)=>{ if(avg>Number(threshold||0)) stage=idx+2; });
    return clamp(stage,1,10);
  }
  function randomAiTitle(stage){ return stageBaseTitle(stage); }
  function switchScreen(id){ qsa('.screen').forEach(el=>el.classList.remove('active')); $(id).classList.add('active'); }
  function playerNameValue(){ return ($('playerName') ? $('playerName').value.trim() : ''); }
  function playerProfileValue(){ return $('playerProfile') ? $('playerProfile').value : ''; }
  function selectedProfile(){ return CONFIG.playerProfiles.find(p=>p.id===playerProfileValue()) || CONFIG.playerProfiles[0]; }
  function setSetupMessage(text='', isError=false){ const el=$('playerSetupMsg'); if(!el) return; el.textContent=text; el.classList.toggle('error', !!isError); }
  function validatePlayerSetup(showMessage=false){
    const name=playerNameValue();
    const profile=selectedProfile();
    const ok=!!(name && profile);
    const start=$('startBtn');
    if(start) start.disabled=!ok;
    const grid=$('levelGrid');
    if(grid) grid.classList.toggle('player-locked', !ok);
    if(showMessage){
      setSetupMessage(ok ? '可以選擇對手並開始遊戲。' : '請先輸入名字，並選擇頭像/身分。', !ok);
      if(!ok && $('playerName')) $('playerName').focus();
    } else if(ok) {
      setSetupMessage('可以選擇對手並開始遊戲。');
    } else {
      setSetupMessage('請輸入名字後，再選擇對手。', true);
    }
    return ok;
  }
  function setStageSelection(stage){
    state=state||{};
    state.stage=clamp(Number(stage)||1,1,10);
    qsa('.level-card').forEach(c=>c.classList.toggle('selected',Number(c.dataset.stage)===state.stage));
  }
  function buildLevelScreen(){
    const nameInput=$('playerName');
    if(nameInput){
      nameInput.value='';
      nameInput.placeholder='請輸入名字';
      nameInput.setAttribute('required','required');
      nameInput.oninput=()=>validatePlayerSetup(false);
    }
    const profileSelect=$('playerProfile');
    profileSelect.innerHTML=CONFIG.playerProfiles.map(p=>`<option value="${p.id}">${p.label}</option>`).join('');
    profileSelect.setAttribute('required','required');
    const def=CONFIG.playerProfiles.find(p=>p.label===CONFIG.defaultPlayer.gender)||CONFIG.playerProfiles[1]||CONFIG.playerProfiles[0];
    profileSelect.value=def.id;
    profileSelect.onchange=()=>validatePlayerSetup(false);
    $('rules').innerHTML=CONFIG.rules.map(r=>`・${escapeHtml(r)}`).join('<br>');
    const recommended=matchedStage();
    $('levelGrid').innerHTML='';
    for(let stage=1;stage<=10;stage++){
      const card=document.createElement('div');
      card.className='level-card'+(stage===recommended?' selected':'');
      card.dataset.stage=stage;
      const acc=Math.round(CONFIG.settings.aiAccuracy[stage-1]*100);
      card.innerHTML=`<div class="stage">Stage ${stage}</div><img alt="AI Head"><div class="lv-title">${escapeHtml(CONFIG.stageBaseTitles[stage-1])}</div><div class="lv-meta">答對率 ${acc}%<br>作答 ${CONFIG.settings.aiMinCost[stage-1]}–${CONFIG.settings.aiMaxCost[stage-1]} 秒</div><button class="over">Stage ${stage}</button>`;
      setImg(qs('img',card),asset('head',stage));
      card.addEventListener('click',()=>selectStage(stage));
      $('levelGrid').appendChild(card);
    }
    setStageSelection(recommended);
    validatePlayerSetup(false);
  }
  function selectStage(stage){
    if(!validatePlayerSetup(true)) return false;
    setStageSelection(stage);
    return true;
  }
  function startGame(){
    if(!validatePlayerSetup(true)) return;
    const profile=selectedProfile();
    const stage=(state&&state.stage)||matchedStage();
    state={entryId:makeEntryId(),stage,playerName:playerNameValue(),playerProfile:profile,aiTitle:randomAiTitle(stage),userScore:0,aiScore:0,userCombo:0,aiCombo:0,maxCombo:0,userRightCount:0,aiRightCount:0,questionIndex:0,questions:[],locked:false,current:null,userLastGain:0,aiLastGain:0};
    state.questions=createQuestions(CONFIG.settings.totalQuestions);
    setupBattleFrame();
    switchScreen('screenBattle');
    playMusic('battle',true);
    nextQuestion();
  }
  function setupBattleFrame(){ $('userTitle').textContent=state.playerName; $('aiTitle').textContent=state.aiTitle; setImg($('userHead'),asset('image',state.playerProfile.imageKey)); setImg($('aiHead'),asset('head',state.stage)); setImg($('timerImg'),asset('image','timer1')); setImg($('bombImg'),asset('image','bomb')); setImg($('sparkImg'),asset('image','spark')); updateScores(); }
  function createQuestions(n){ const used=new Set(), questions=[]; let guard=0; while(questions.length<n&&guard<5000){ guard++; const item=sample(GAME_POOL); if(used.has(item.sourceRow)) continue; used.add(item.sourceRow); const mode=questions.length<5?'CN_TO_EN':'EN_TO_CN'; questions.push(createQuestion(item,mode)); } return questions; }
  function createQuestion(item,mode){ const isCN=mode==='CN_TO_EN'; const questionText=isCN?item.meaning:item.word; const rightText=isCN?item.word:item.meaning; const filterLen=isCN?CONFIG.settings.chineseFilterLen:CONFIG.settings.englishFilterLen; const answerField=isCN?'word':'meaning'; const wrongs=[]; let guard=0; while(wrongs.length<3&&guard<8000){ guard++; const cand=sample(VOCAB); if(cand.sourceRow===item.sourceRow||!isValidWrongWord(cand)) continue; const text=cand[answerField]; if(!text||text===rightText||wrongs.includes(text)) continue; if(hasFuzzyOverlap(rightText,text,filterLen)) continue; wrongs.push(text); } while(wrongs.length<3){ wrongs.push(sample(VOCAB)[answerField]); } const rightIndex=randInt(0,3); const answers=wrongs.slice(0,3); answers.splice(rightIndex,0,rightText); return {item,mode,questionText,rightText,rightIndex,answers}; }
  function createAiReaction(q){ const stage=state.stage; const min=CONFIG.settings.aiMinCost[stage-1], max=CONFIG.settings.aiMaxCost[stage-1]; const cost=rand(min,max); const remain=CONFIG.settings.secondsPerQuestion-cost; const correct=randInt(1,100)<=CONFIG.settings.aiAccuracy[stage-1]*100; let choice=q.rightIndex; if(!correct){ do{choice=randInt(0,3)}while(choice===q.rightIndex); } return {cost,remain,correct,choice,lineIndex:randInt(0,29),hasAnswered:false}; }
  function nextQuestion(){ clearInterval(timer); timer=null; if(state.questionIndex>=CONFIG.settings.totalQuestions) return showResult(); const q=state.questions[state.questionIndex]; q.ai=createAiReaction(q); q.userChoice=null; q.userRemain=CONFIG.settings.secondsPerQuestion; q.remaining=CONFIG.settings.secondsPerQuestion; q.resolved=false; state.current=q; state.locked=true; renderQuestionIntro(); setTimeout(()=>{ if(state.current!==q||q.resolved) return; renderQuestionActive(); state.locked=false; startTimer(); },800); }
  function renderQuestionIntro(){ const qno=state.questionIndex+1; $('questionLabel').textContent=`第${qno}題`; $('questionLabel').classList.remove('active'); $('questionMain').textContent=`第${qno}題`; $('phonetic').textContent=''; $('answers').innerHTML=''; $('aiSpeech').textContent=''; $('timerNumber').textContent=CONFIG.settings.secondsPerQuestion; $('timerNumber').classList.remove('big'); setImg($('timerImg'),asset('image','timer1')); setImg($('bombImg'),asset('image','bomb')); setImg($('sparkImg'),asset('image','spark')); $('bombBar').className='bomb-bar'; $('bombBar').style.width='100%'; updateScores(); }
  function renderQuestionActive(){ const q=state.current; const qno=state.questionIndex+1; $('questionLabel').textContent=`第${qno}題`; $('questionLabel').classList.add('active'); $('questionMain').textContent=q.questionText; $('phonetic').textContent=q.mode==='EN_TO_CN'?`${q.item.phonetic}　${q.item.partOfSpeech}`:''; $('answers').innerHTML=q.answers.map((ans,idx)=>`<button class="answer-btn" data-idx="${idx}"><span class="answer-key">${idx+1}</span><span>${escapeHtml(ans)}</span><span class="answer-marks"></span></button>`).join(''); qsa('.answer-btn',$('answers')).forEach(btn=>btn.addEventListener('click',()=>chooseAnswer(Number(btn.dataset.idx)))); speakQuestion(q.questionText); }
  function startTimer(){ const start=performance.now(); const total=CONFIG.settings.secondsPerQuestion; timer=setInterval(()=>{ const elapsed=(performance.now()-start)/1000; const remain=clamp(total-elapsed,0,total); const q=state.current; if(!q||q.resolved){clearInterval(timer);return;} q.remaining=remain; renderTimer(remain); if(!q.ai.hasAnswered&&remain<=q.ai.remain){ q.ai.hasAnswered=true; $('aiSpeech').textContent='你還要多久?'; } if(remain<=0.05){ q.userRemain=0; setImg($('bombImg'),asset('image','explosion')); resolveQuestion(); } },80); }
  function renderTimer(remain){ const total=CONFIG.settings.secondsPerQuestion; $('timerNumber').textContent=Math.max(0,Math.round(remain)); const pct=clamp(remain/total*100,0,100); $('bombBar').style.width=pct+'%'; $('sparkImg').style.left=(44+(150*pct/100))+'px'; $('bombBar').className='bomb-bar'+(remain<3.5?' low':remain<6.5?' mid':''); if(remain<3.5){ $('timerNumber').classList.add('big'); setImg($('timerImg'),asset('image','timer2')); } else { $('timerNumber').classList.remove('big'); setImg($('timerImg'),asset('image','timer1')); } }
  function chooseAnswer(idx){ const q=state.current; if(!q||q.resolved||state.locked) return; state.locked=true; q.userChoice=idx; q.userRemain=q.remaining; if(q.userRemain>q.ai.remain){ const elapsed=CONFIG.settings.secondsPerQuestion-q.userRemain; const newCost=rand(elapsed+.1,q.ai.cost); q.ai.cost=newCost; q.ai.remain=CONFIG.settings.secondsPerQuestion-newCost; } resolveQuestion(); }
  function resolveQuestion(){ const q=state.current; if(!q||q.resolved) return; q.resolved=true; clearInterval(timer); timer=null; qsa('.answer-btn').forEach(btn=>btn.classList.add('locked')); const userRight=q.userChoice===q.rightIndex; const aiRight=q.ai.choice===q.rightIndex; const rightBtn=qs(`.answer-btn[data-idx="${q.rightIndex}"]`); if(rightBtn) rightBtn.classList.add('correct'); if(q.userChoice!==null&&q.userChoice!==q.rightIndex){ const userBtn=qs(`.answer-btn[data-idx="${q.userChoice}"]`); if(userBtn) userBtn.classList.add('wrong'); } markAnswer(q.userChoice,userRight,'USER'); markAnswer(q.ai.choice,aiRight,'AI'); if(userRight){ state.userCombo=state.userCombo+1; state.maxCombo=Math.max(state.maxCombo,state.userCombo); state.userRightCount++; state.userLastGain=Math.floor(scoreFromRemain(q.userRemain)*comboMultiplier(state.userCombo)); state.userScore+=state.userLastGain; playSound('right'); } else { state.userCombo=0; state.userLastGain=CONFIG.settings.wrongPenalty>0?-CONFIG.settings.wrongPenalty:0; state.userScore=Math.max(0,state.userScore-CONFIG.settings.wrongPenalty); playSound('wrong'); } if(aiRight){ state.aiCombo=state.aiCombo+1; state.aiRightCount++; state.aiLastGain=Math.floor(scoreFromRemain(q.ai.remain)*comboMultiplier(state.aiCombo)); state.aiScore+=state.aiLastGain; $('aiSpeech').textContent=CONFIG.aiLinesRight[q.ai.lineIndex]||''; } else { state.aiCombo=0; state.aiLastGain=CONFIG.settings.wrongPenalty>0?-CONFIG.settings.wrongPenalty:0; state.aiScore=Math.max(0,state.aiScore-CONFIG.settings.wrongPenalty); $('aiSpeech').textContent=CONFIG.aiLinesWrong[q.ai.lineIndex]||''; } updateScores(); state.questionIndex++; setTimeout(nextQuestion,1300); }
  function markAnswer(idx,good,who){
    if(idx===null||idx===undefined) return;
    const btn=qs(`.answer-btn[data-idx="${idx}"]`);
    if(!btn) return;
    const wrap=qs('.answer-marks',btn);
    const mark=document.createElement('span');
    const role=String(who||'').toUpperCase()==='AI'?'AI':'USER';
    mark.className='answer-mark '+(role==='AI'?'ai':'user');
    const label=document.createElement('span');
    label.textContent=role;
    const img=document.createElement('img');
    img.alt=`${role} ${good?'Right':'Wrong'}`;
    img.src=asset('image',good?'right':'wrong');
    img.onerror=()=>{
      const span=document.createElement('span');
      span.className='fallback-mark';
      span.textContent=good?'O':'X';
      img.replaceWith(span);
    };
    mark.appendChild(label);
    mark.appendChild(img);
    wrap.appendChild(mark);
  }
  function updateScores(){ $('userScore').textContent=Math.round(state.userScore||0); $('aiScore').textContent=Math.round(state.aiScore||0); $('userGain').textContent=state.userLastGain?`${state.userLastGain>0?'+':''}${state.userLastGain}`:''; $('aiGain').textContent=state.aiLastGain?`${state.aiLastGain>0?'+':''}${state.aiLastGain}`:''; $('userCombo').textContent=state.userCombo>1?`${state.userCombo} Combo`:''; $('aiCombo').textContent=state.aiCombo>1?`${state.aiCombo} Combo`:''; const max=CONFIG.settings.maxTotalScore||14200; $('userScoreFill').style.height=clamp(state.userScore/max*100,0,100)+'%'; $('aiScoreFill').style.height=clamp(state.aiScore/max*100,0,100)+'%'; }
  function speakQuestion(text){ if(!('speechSynthesis' in window)) return; try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); u.lang=/[a-zA-Z]/.test(text)?'en-US':'zh-TW'; u.rate=.95; speechSynthesis.speak(u); }catch(e){} }
  function showResult(){
    clearInterval(timer);
    timer=null;
    stopMusic();

    // 先套用答對率結算分。這是玩家與 AI 都會取得的結算加分。
    const bonusUser=Math.floor((state.userRightCount/CONFIG.settings.totalQuestions)*100*10);
    const bonusAi=Math.floor((state.aiRightCount/CONFIG.settings.totalQuestions)*100*10);
    state.userScore=Math.round(state.userScore+bonusUser);
    state.aiScore=Math.round(state.aiScore+bonusAi);

    // 勝負先用「題目分 + 答對率結算分」判定。
    // 勝利獎勵只給玩家，且只在玩家打贏目前 AI 對手時加上；加完才送排行榜。
    let resultKey='gameOver',userIcon='dumb',aiIcon='dumb',music='draw',resultText='draw';
    state.winBonus=0;
    state.scoreBeforeWinBonus=Math.round(state.userScore||0);
    if(state.userScore>state.aiScore){
      resultKey='win';
      userIcon='happy';
      aiIcon='cry';
      music='win';
      resultText='win';
      state.winBonus=winBonusForStage(state.stage);
      state.userScore=Math.round(state.userScore+state.winBonus);
    } else if(state.userScore<state.aiScore){
      resultKey='lose';
      userIcon='cry';
      aiIcon='happy';
      music='lose';
      resultText='lose';
    }

    saveRecent(state.userScore);
    playMusic(music,false);
    setImg($('resultBanner'),asset('image',resultKey));
    setImg($('resultUserHead'),asset('image',state.playerProfile.imageKey));
    setImg($('resultAiHead'),asset('head',state.stage));
    setImg($('resultUserIcon'),asset('image',userIcon));
    setImg($('resultAiIcon'),asset('image',aiIcon));
    $('resultUserTitle').textContent=state.playerName;
    $('resultAiTitle').textContent=state.aiTitle;
    $('resultUserScore').textContent=state.userScore;
    $('resultAiScore').textContent=state.aiScore;
    $('rateMetric').textContent=Math.round(state.userRightCount/CONFIG.settings.totalQuestions*100)+'%';
    $('comboMetric').textContent=state.maxCombo<2?'No Combo':state.maxCombo+' Combo';
    $('stageMetric').textContent=state.winBonus?('Stage '+state.stage+' / 勝利 +'+state.winBonus):('Stage '+state.stage);
    switchScreen('screenResult');
    renderRanking(buildScorePayload(resultText));
  }
  function renderRankingTableRows(rows){
    $('rankBody').innerHTML = rows.map(item=>{
      if(item.separator){
        return `<tr><td colspan="4">${escapeHtml(item.label || '...')}</td></tr>`;
      }
      const r = item.row;
      return `<tr class="${item.isMe?'me':''}"><td>${item.rank}</td><td>${Math.round(r.score||0)}</td><td>${escapeHtml(r.name)}</td><td>Stage ${r.stage||1}</td></tr>`;
    }).join('');
  }
  function renderCloudRanking(result, me){
    const topRows = (result && result.topRows) ? result.topRows : [];
    const meRank = Number(result && result.meRank || 0);
    const meRow = (result && result.meRow) ? result.meRow : null;
    if(!topRows.length){
      $('rankBody').innerHTML = `<tr><td colspan="4">雲端排行榜目前沒有資料</td></tr>`;
      return;
    }
    const tableRows = [];
    if(meRank > 100 && meRow){
      const tail = topRows.slice(-5);
      const startRank = Math.max(1, topRows.length - tail.length + 1);
      tail.forEach((row, idx)=>tableRows.push({rank:startRank+idx, row, isMe:false}));
      tableRows.push({separator:true, label:`你的排名：第 ${meRank} 名`});
      tableRows.push({rank:meRank, row:meRow, isMe:true});
    } else {
      topRows.forEach((row, idx)=>{
        const isMe = !!(me && row.entryId && row.entryId === me.entryId);
        tableRows.push({rank:idx+1, row, isMe});
      });
    }
    renderRankingTableRows(tableRows);
  }
  async function renderRanking(scorePayload){
    const me = normalizeRankingRow({ ...scorePayload, playerName: scorePayload.playerName, name: scorePayload.playerName });
    $('rankBody').innerHTML = `<tr><td colspan="4">正在連線雲端排行榜...</td></tr>`;
    if(!cloudEnabled()){
      setRankingStatus('未啟用 Google Sheets 雲端排行榜，無法顯示排名。', true);
      $('rankBody').innerHTML = `<tr><td colspan="4">未啟用雲端排行榜</td></tr>`;
      return;
    }
    try{
      setRankingStatus('正在送出分數到 Google Sheets...');
      await submitCloudScore(scorePayload);
      await delay(cloudConfig().postReadDelayMs || 1200);
      setRankingStatus('正在讀取雲端 Top 100...');
      const cloudResult = await fetchCloudRanking(me);
      renderCloudRanking(cloudResult, me);
      const meRank = Number(cloudResult && cloudResult.meRank || 0);
      if(meRank > 100){
        setRankingStatus(`已同步 Google Sheets。你目前是第 ${meRank} 名，未進入 Top 100。`);
      } else if(meRank > 0){
        setRankingStatus(`已同步 Google Sheets 雲端排行榜。你目前是第 ${meRank} 名。`);
      } else {
        setRankingStatus('已同步 Google Sheets 雲端 Top 100。');
      }
    }catch(err){
      console.warn(err);
      setRankingStatus('Google Sheets 同步失敗，無法顯示雲端排行榜：' + err.message, true);
      $('rankBody').innerHTML = `<tr><td colspan="4">雲端排行榜讀取失敗</td></tr>`;
    }
  }
  function forceEnd(){ if(!state||!state.current) return; state.questionIndex=CONFIG.settings.totalQuestions; showResult(); }
  function escapeHtml(str){ return String(str??'').replace(/[&<>"]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s])); }
  document.addEventListener('keydown',e=>{ if($('screenBattle').classList.contains('active')&&/^[1-4]$/.test(e.key)) chooseAnswer(Number(e.key)-1); });
  window.addEventListener('DOMContentLoaded',()=>{ $('manualLoad').addEventListener('click',loadDataManual); $('startBtn').addEventListener('click',startGame); $('forceEnd').addEventListener('click',forceEnd); $('backLevel').addEventListener('click',()=>{stopMusic();switchScreen('screenLevel');buildLevelScreen();}); $('againSame').addEventListener('click',()=>{const lastStage=state&&state.stage; stopMusic(); switchScreen('screenLevel'); buildLevelScreen(); if(lastStage) setStageSelection(lastStage); validatePlayerSetup(false);}); loadDataAuto().catch(err=>{$('loadMsg').textContent='自動讀取失敗：'+err.message;}); });
})();
