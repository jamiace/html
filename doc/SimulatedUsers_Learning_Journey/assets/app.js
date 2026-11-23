
(()=>{
  const basename=location.pathname.split('/').pop()||'index.html';
  document.querySelectorAll('.nav a').forEach(a=>{ if(a.getAttribute('href')===basename){a.classList.add('active');a.setAttribute('aria-current','page')} });
  // shared interaction handlers
  const $=(sel,scope=document)=>scope.querySelector(sel);
  const $$=(sel,scope=document)=>[...scope.querySelectorAll(sel)];
  async function copyText(t,button){
    let ok=false;
    if(navigator.clipboard&&window.isSecureContext){try{await navigator.clipboard.writeText(t);ok=true}catch(_){}}
    if(!ok){const ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.left='-9999px';document.body.appendChild(ta);ta.select();try{ok=document.execCommand('copy')}catch(_){}ta.remove()}
    if(button){let label=button.textContent;button.textContent=ok?'已複製':'請選取下方文字複製';setTimeout(()=>button.textContent=label,1800)}return ok;
  }
  $$('.copy-target').forEach(b=>b.addEventListener('click',()=>{const target=document.getElementById(b.dataset.target);if(target)copyText(target.value??target.textContent,b)}));

  // Open-ended workshop: no roles or capability caps
  const knowledge=$('#knowledge');
  if(knowledge){
    const problem=$('#problem'),product=$('#product'),extra=$('#extra'),result=$('#prompt-result');
    function generate(){
      const k=knowledge.value.trim(),p=problem.value.trim(),s=product.value.trim(),x=extra.value.trim();
      if(!k){knowledge.focus();result.textContent='先寫下一件你已經很熟悉的事。可以是工作、生活、興趣或一種觀察。';return}
      let mode=$('#test-mode').value,days=$('#duration').value,count=$('#persona-count').value;
      let modeText=mode==='both'?'分開設計 coverage（指定流程）與 behavior（可拒絕／不操作）的兩組測試，禁止混用數據':mode==='coverage'?'只測功能與例外路徑，不得推論留存或自然動機':'只根據明示假設推演自然選擇；允許角色不出現、不操作、離開與回流，不可強制補量';
      result.textContent=`你是「跨領域探索與模擬使用者實驗夥伴」。你的任務是協助我把已經熟悉的知識重新組合，發現以往沒有考慮的用途；不是替我撰寫制式企劃，也不是依照職稱限制我的能力。\n\n我已經熟悉的事情：${k}\n我好奇的問題：${p||'暫無明確題目，先從已知經驗出發探索'}\n我想試的場景／產品：${s||'不限；請跨三個差異明顯的場景提出'}\n額外限制或意外：${x||'無'}\n\n請完成：\n1. 先把我熟悉的經驗抽成 2–3 條可移植的原理，說明為什麼能跨領域使用。\n2. 提出至少 5 個『原來還可以這樣』的不同用途：包含一個非常貼近日常的、一個能在 15 分鐘動手試的、一個跳脫常見領域但有合理連結的、一個可能失敗但有趣的，以及一個你認為我不容易想到的。不要只是改寫原問題。\n3. 幫我挑 2 個有意思的方向，分別設計 ${count} 位差異化的假設使用者。人物的差異應反映目標、處境、能力、偏好、時間限制與變動狀態；不要硬套工作職稱。\n4. 在 ${days} 天的情境內，用『狀態 → 觸發 → 候選動作 → 選擇 → 回饋 → 更新狀態』建立可說明的行為路徑。\n5. 測試模式：${modeText}。特別安排一個人物不照預期使用產品，另一個人選擇不參與。\n6. 為每個方向設計『今天就能動手』的最小實驗：要準備什麼、要操作什麼、應該記錄什麼、什麼結果會讓我們改變想法。\n7. 最後提出 3 個能引發我繼續探索的問題，讓我自己決定下一步。\n\n要求：\n- 清楚區分已驗證事實、假設、模擬觀察與未驗證推論。\n- 不得將合成留存、付費、學習成效當作真人證據。\n- 不得聲稱已操作真實網站或系統，除非有授權及實際工具證據。\n- 不必特別稱讚想法；把有趣之處與其成立條件說清楚。\n- 不要設計成需要交件或被打分數的員工任務。`;
      $('#prompt-actions').hidden=false;
    }
    $('#generate-prompt')?.addEventListener('click',generate);
    $('#sample-prompt')?.addEventListener('click',()=>{knowledge.value='我很熟悉人們在時間壓力下，會跳過說明、直接做眼前最容易完成的事。';problem.value='如果他有權不使用，我要怎麼讓這件事自己變得值得做？';product.value='一個原本被當作例行工作的流程或數位工具';extra.value='有人只有 90 秒；其中一個人根本不想參與。';generate()});
    $('#copy-prompt')?.addEventListener('click',()=>copyText(result.textContent,$('#copy-prompt')));
    $('#download-prompt')?.addEventListener('click',()=>{if(!result.textContent.trim())return;const blob=new Blob([result.textContent],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Exploration_Experiment_Prompt.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
  }
  $$('.send-challenge').forEach(btn=>btn.addEventListener('click',()=>{
    const payload=[btn.dataset.name,btn.dataset.intro,btn.dataset.try].join('\n');
    if(document.querySelector('[data-view]')){location.hash='workshop.html';const a=$('#knowledge');if(a)a.value=btn.dataset.intro;const p=$('#problem');if(p)p.value=btn.dataset.name;const x=$('#extra');if(x)x.value=btn.dataset.try;}
    else{ const q=new URL('workshop.html',location.href);q.searchParams.set('idea',payload);location.href=q.href }
  }));
  // A local link from an experiment can prefill the workshop without a server.
  if(knowledge){const u=new URL(location.href);let idea=u.searchParams.get('idea');if(idea){const [title,description,how]=idea.split('\n');knowledge.value=description||'';problem.value=title||'';extra.value=how||''}}
  const caseTabs=$$('.case-btn');
  if(caseTabs.length){const outs=[{who:'快進快出的使用者',goal:'想在 3 分鐘內做完一件事',action:'一看到長篇說明就離開，連主要功能都沒碰到',insight:'問題不一定在功能本身；可能是入口太慢、文字太多或缺少跳過選項。'},
    {who:'第一次接觸的使用者',goal:'想完成，但不熟悉專用詞',action:'反覆找不到下一步，可能停在第一關',insight:'測試的是「流程是否仰賴老手才懂的隱性知識」。'},
    {who:'熟練的使用者',goal:'想快速核對結果',action:'跳過說明、直接找差異；若資料版本錯就無法判斷',insight:'同樣介面對老手也可能不友善，因為資訊密度與追溯能力不足。'}];
    let out=$('#case-output');function show(i){caseTabs.forEach((b,j)=>{b.classList.toggle('active',i===j);b.setAttribute('aria-pressed',String(i===j))});const v=outs[i];out.innerHTML='';[['span','情境推演，不是真人測試'],['h3',v.who],['p',`這個人要什麼：${v.goal}`],['p',`可能做什麼：${v.action}`],['p',`你能從中想什麼：${v.insight}`]].forEach(([tag,txt])=>{let el=document.createElement(tag);el.textContent=txt;if(tag==='span')el.className='tag';out.appendChild(el)})}
    caseTabs.forEach((b,i)=>b.addEventListener('click',()=>show(i)));show(0);
  }
  const roleFilter=$('#roster-filter');
  if(roleFilter){roleFilter.addEventListener('input',()=>{let val=roleFilter.value.trim().toLowerCase();let shown=0;$$('[data-roster-row]').forEach(r=>{let okay=r.textContent.toLowerCase().includes(val);r.hidden=!okay;if(okay)shown++});$('#roster-count').textContent=`顯示 ${shown} / 30 位`})}
})();
