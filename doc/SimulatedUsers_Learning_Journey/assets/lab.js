
(()=>{
  const $=s=>document.querySelector(s);
  if(!$('#lab-run'))return;
  const labels=['週末才有空','喜歡先看看','時間零碎','好奇但易膩','只完成必要','遇錯就離開'];
  const personas=Array.from({length:30},(_,i)=>({id:i+1,type:i%labels.length,name:labels[i%labels.length],base:[.2,.5,.65,.7,.55,.43][i%labels.length],interest:[.52,.64,.55,.82,.61,.51][i%labels.length],habit:[.2,.37,.55,.19,.6,.28][i%labels.length],fatigue:0,visits:0}));
  function rng(seed){let t=(seed|0)>>>0;return ()=>{t+=0x6D2B79F5;let x=t;x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);return ((x^(x>>>14))>>>0)/4294967296}}
  function simulate(mode,seed,friction,autonomy){
    const r=rng(seed);let states=personas.map(p=>({...p})), days=[];let log=[];
    for(let d=1;d<=7;d++){
      let arrived=0;
      for(let p of states){
        const hasTime=r()<(p.type===0?(d>=6?.9:.12):p.type===2?.77:.76);
        const prob=Math.max(.015,Math.min(.96,p.base*.56+p.interest*.33+p.habit*.2-friction*.19-p.fatigue*.18+autonomy*.17));
        const natural=hasTime&&r()<prob;
        const come=mode==='coverage'?true:natural;
        if(come){arrived++;p.visits++;const e=r();let wasFun=e < (.6-friction*.28+autonomy*.2);p.interest=Math.min(1,Math.max(.06,p.interest+(wasFun?.025:-.055)));p.fatigue=Math.min(1,p.fatigue+(wasFun?.018:.09));p.habit=Math.min(1,p.habit+.025);
          if([1,4,9].includes(p.id))log.push(`Day ${d}｜${p.name} ${mode==='coverage'&&!natural?'被排程要求上線':'自行決定上線'}；${wasFun?'體驗不錯':'遇到一些挫折'}`);
        }else{p.habit=Math.max(0,p.habit-.025);p.fatigue=Math.max(0,p.fatigue-.045);p.interest=Math.max(.06,p.interest-.018);
          if([1,4,9].includes(p.id))log.push(`Day ${d}｜${p.name} 沒有來（這也是行為資料）`);
        }
      }
      days.push(arrived)
    }
    return {mode,days,total:days.reduce((a,b)=>a+b,0),weekEnd:days[6],unique:states.filter(s=>s.visits>0).length,forced:mode==='coverage',log:log.slice(-11)}
  }
  function number(id){return Number($(id).value)}
  function opts(){return [Math.max(1,number('#lab-seed')||1),number('#lab-friction')/100,number('#lab-autonomy')/100]}
  function bars(s){return s.days.map((v,i)=>`<span>第 ${i+1} 天</span><div class="lab-track"><div class="lab-fill" style="width:${100*v/30}%"></div></div><b>${v} / 30</b>`).join('')}
  function output(s){return `<div class="lab-stat"><div><div class="value">${s.weekEnd}/30</div><span>第七天有出現（合成）</span></div><div><div class="value">${s.total}</div><span>七天總人次（合成）</span></div><div><div class="value">${s.unique}/30</div><span>七天內至少出現一次</span></div></div><div class="lab-bars">${bars(s)}</div><div class="lab-persona-path"><b>少數人物路徑節錄</b><p>${s.log.slice(-6).map(v=>v.replaceAll('<','&lt;')).join('<br>')}</p></div>`}
  function run(dual){let [seed,friction,autonomy]=opts();const out=$('#lab-results');
    if(dual){const b=simulate('behavior',seed,friction,autonomy),c=simulate('coverage',seed,friction,autonomy);
      out.innerHTML=`<div class="lab-compare"><div><span class="tag">自由選擇</span>${output(b)}</div><div><span class="tag ember">強制覆蓋</span>${output(c)}</div></div><p><b>你剛剛改變的不是玩家的喜好，而是測試規則。</b>強制模式讓每天都有人出現，並不能證明產品比較吸引人。</p>`;
    }else{const mode=$('#lab-mode').value,s=simulate(mode,seed,friction,autonomy);out.innerHTML=`<span class="tag">${mode==='coverage'?'功能覆蓋｜強制出現':'行為推演｜可自行選擇'}</span>${output(s)}<p><b>${mode==='coverage'?'每人每天都來，是因為測試指定他要來。':'有人沒有出現，才讓「自發」成為可觀察的可能。'}</b></p>`;}
  }
  ['friction','autonomy'].forEach(n=>$('#lab-'+n)?.addEventListener('input',e=>$('#lab-'+n+'-val').textContent=e.target.value));
  $('#lab-run').addEventListener('click',()=>run(false));$('#lab-compare').addEventListener('click',()=>run(true));
})();
