/* Experience is banked at each level boundary until an English check is passed. */
const LevelGate = {
 cooldown:3600e3,questions:8,pass:6,
 ensure(){const S=Game.S;if(!S)return;S.gates=S.gates||{owner:null,pets:{}};S.gates.pets=S.gates.pets||{};return S.gates},
 subject(kind,pid){return kind==='owner'?Game.S:Pets.get(pid)},
 level(kind,p){return kind==='owner'?p.lvl:p.lv},
 gate(kind,pid,target){const all=this.ensure();if(!all)return null;let g=kind==='owner'?all.owner:all.pets[pid];if(!g||g.target!==target){g={target,retryAt:0,attempt:null,passed:false};if(kind==='owner')all.owner=g;else all.pets[pid]=g}return g},
 pending(kind,pid){const p=this.subject(kind,pid);return !!p&&(kind==='owner'?p.xp>=Game.need(p.lvl):p.lv<PET_LV_MAX&&p.xp>=Pets.xpNeed(p.lv))},
 allowed(kind,pid,target){return !!this.gate(kind,pid,target).passed},
 wait(g){return Math.max(0,Math.ceil(((g&&g.retryAt)||0)-Date.now())/60000)},
 notifyOwner(){if(!this.pending('owner'))return;const g=this.gate('owner',null,Game.S.lvl+1);if(!g.notified){g.notified=true;UI.toast('經驗夠了，到「學習」通過測驗就能升級','i_star',5,{label:'去看看',fn:()=>UI.openWin('learn')})}},
 notifyPet(p){if(!this.pending('pet',p.id))return;const g=this.gate('pet',p.id,p.lv+1);if(!g.notified){g.notified=true;UI.toast(p.name+'準備長大了，到寵物頁完成升級測驗','i_paw',5)}},
 start(kind,pid){if(!this.pending(kind,pid))return;const p=this.subject(kind,pid),g=this.gate(kind,pid,this.level(kind,p)+1);if(Date.now()<g.retryAt)return UI.toast('再等 '+Math.ceil(this.wait(g))+' 分鐘就能重試','i_learn',3);if(Learn.sess&&Learn.sess.kind==='levelgate'&&Learn.sess.step!=='result')this.abandon();
   const token=Date.now()+'-'+Math.random().toString(36).slice(2);g.attempt={token,at:Date.now(),from:this.level(kind,p)};g.retryAt=Date.now()+this.cooldown;g.passed=false;Game.save();
   const ids=Learn.pick(24).slice(0,this.questions);if(ids.length<this.questions)for(const v of shuffle(VOCAB.slice())){if(!ids.includes(v.i))ids.push(v.i);if(ids.length===this.questions)break;}
   Learn.start('levelgate',{kind,pid,target:g.target,token,questions:this.hardQs(ids),strict:true});
 },
 hardOptions(v,field){const first=v.z.split('；')[0],pos=v.p.split('/')[0],value=v[field];const used=new Set([value]);let pool=VOCAB.filter(o=>o.i!==v.i&&o.p.split('/')[0]===pos&&o[field]!==value&&o.z.split('；')[0]!==first&&o.w.toLowerCase()!==v.w.toLowerCase());
   const similarity=o=>(o.t===v.t?8:0)+Math.max(0,5-Math.abs(o.w.length-v.w.length))+(o.w[0]===v.w[0]?3:0);
   pool.sort((a,b)=>similarity(b)-similarity(a));pool=shuffle(pool.slice(0,35));const out=[v.i];for(const o of pool){if(!used.has(o[field])){out.push(o.i);used.add(o[field])}if(out.length===4)break;}if(out.length<4)for(const o of shuffle(VOCAB.slice())){if(!used.has(o[field])&&o.i!==v.i){out.push(o.i);used.add(o[field])}if(out.length===4)break;}return shuffle(out);
 },
 hardQs(ids){return ids.map((i,k)=>{const v=VOCAB[i];let type=['en2zh','zh2en','spell','listen','zh2en','spell','en2zh','zh2en'][k%8];if(type==='listen'&&!Learn.canSpeak())type='zh2en';if(type==='spell'&&!Challenge.spellable(v))type='zh2en';return{i,type,noHint:type==='spell',opts:type==='spell'?null:this.hardOptions(v,type==='zh2en'?'w':'z')}})},
 finish(s,R,n){if(s._gateResult)return s._gateResult;const o=s.opts,p=this.subject(o.kind,o.pid),g=p&&this.gate(o.kind,o.pid,o.target);let msg='這次測驗已結束，請從升級入口再試。';
   if(p&&g.attempt&&g.attempt.token===o.token&&this.level(o.kind,p)+1===o.target&&this.pending(o.kind,o.pid)){
     const pass=R>=this.pass;g.attempt=null;g.retryAt=pass?0:Date.now()+this.cooldown;g.passed=pass;
     if(pass){const before=this.level(o.kind,p);if(o.kind==='owner')Game.reward(0,0,'raw');else Pets.addXp(p,0);msg=(o.kind==='owner'?'升到 Lv '+p.lvl+' 了！':p.name+'升到 Lv '+p.lv+' 了！');if(this.level(o.kind,p)===before)msg='已通過測驗，經驗還在累積中。';}
     else msg='這次答對 '+R+'/'+n+' 題。經驗會保留，一小時後再試。';
   }
   s._gateResult={coins:0,xp:0,items:[],msg};Game.save();UI.refresh('learn');UI.refresh('pet');UI.refresh('settings');return s._gateResult;
 },
 abandon(){const s=Learn.sess;if(!s||s.kind!=='levelgate'||s.step==='result')return;const o=s.opts,p=this.subject(o.kind,o.pid);if(!p)return;const g=this.gate(o.kind,o.pid,o.target);if(g.attempt&&g.attempt.token===o.token){g.attempt=null;g.passed=false;g.retryAt=Date.now()+this.cooldown;s.step='result';s.result={coins:0,xp:0,items:[],msg:'已離開升級測驗。經驗會保留，一小時後再試。'};Game.save();}},
 card(kind,pid){if(!this.pending(kind,pid))return null;const p=this.subject(kind,pid),g=this.gate(kind,pid,this.level(kind,p)+1),wait=this.wait(g);return h('section',{class:'settings-card levelgate-card','data-kind':kind,'data-pid':pid??''},h('b',{text:(kind==='owner'?'主人升級':p.name+'的成長測驗')+' · Lv '+this.level(kind,p)+' → '+(this.level(kind,p)+1)}),h('p',{class:'hint',text:'8 題答對 6 題就能升級。經驗會保留；未通過或離開，要等一小時再試。'}),h('button',{class:'chip primary gate-start',disabled:wait>0,onclick:()=>this.start(kind,pid)},wait>0?'再等 '+Math.ceil(wait)+' 分鐘':'開始升級測驗'))},
 refresh(){for(const card of document.querySelectorAll('.levelgate-card')){const kind=card.dataset.kind,pid=card.dataset.pid?+card.dataset.pid:null,p=this.subject(kind,pid);if(!p||!this.pending(kind,pid))continue;const wait=this.wait(this.gate(kind,pid,this.level(kind,p)+1)),b=card.querySelector('.gate-start');b.disabled=wait>0;b.textContent=wait>0?'再等 '+Math.ceil(wait)+' 分鐘':'開始升級測驗';}},
};
(function(){
 const start=Learn.start.bind(Learn);Learn.start=function(kind,opts){if(this.sess&&this.sess.kind==='levelgate'&&this.sess.step!=='result'&&kind!=='levelgate')LevelGate.abandon();return start(kind,opts)};
 const close=UI.closeWin.bind(UI);UI.closeWin=function(id){if(id==='study')LevelGate.abandon();return close(id)};
 const luck=Feel.luck.bind(Feel);Feel.luck=function(s,q){if(s.kind==='levelgate')return null;return luck(s,q)};
 const study=UI.w_study.bind(UI);UI.w_study=function(){const out=study(),s=Learn.sess;if(s&&s.kind==='levelgate'){const title=out[0]&&out[0].querySelector('b');if(title)title.textContent=s.opts.kind==='owner'?'主人升級測驗':Pets.name(s.opts.pid)+'的成長測驗';if(s.step==='result')out.push(h('button',{class:'chip primary',onclick:()=>{this.closeWin('study');if(s.opts.kind==='pet')Pets.select(s.opts.pid,'care');else this.openWin('learn')}},s.opts.kind==='pet'?'回到寵物':'回到學習'));}return out};
 for(const id of ['learn','settings']){const original=UI['w_'+id].bind(UI);UI['w_'+id]=function(){return [LevelGate.card('owner'),...original()]};}
 const pet=UI.w_pet.bind(UI);UI.w_pet=function(){const out=pet(),p=Pets.sel();if(p){const card=LevelGate.card('pet',p.id);if(card)out.splice(2,0,card)}return out};
 const hud=UI.hud.bind(UI);UI.hud=function(){const r=hud(...arguments),b=this.el.lvl;if(b){const pending=LevelGate.pending('owner');b.classList.toggle('gate-ready',pending);b.onclick=()=>this.openWin(pending?'learn':'settings');b.setAttribute('aria-label',pending?'主人升級測驗':'等級與統計');if(pending)b.title='經驗夠了，通過測驗就能升級';}return r};
 const pack=Story.pack.bind(Story);Story.pack=function(i){const p=pack(i);if(!p)return p;const have=new Set(p.qs.map(q=>q.i));for(const id of Learn.pick(24)){if(p.qs.length>=7)break;if(have.has(id))continue;have.add(id);p.qs.push(LevelGate.hardQs([id])[0]);}p.qs=p.qs.map((q,k)=>{const v=VOCAB[q.i],next=Object.assign({},q);if(k%3===2&&Challenge.spellable(v)){next.type='spell';next.noHint=true;delete next.hint;next.opts=null;}else if(next.opts)next.opts=LevelGate.hardOptions(v,next.type==='zh2en'?'w':'z');return next});p.ids=p.qs.map(q=>q.i);return p};
 const finish=Story.finish.bind(Story);Story.finish=function(s,R){const c=this.week().ch[s.opts.ch];if(c.done)return finish(s,R);const n=s.qs.length,need=Math.ceil(n*.7);if(R<need)return{coins:0,xp:0,items:[],msg:'答對 '+R+'/'+n+' 題，再複習一下。這章答對 '+need+' 題就能接著看故事。'};return finish(s,R)};
 window.addEventListener('pagehide',()=>LevelGate.abandon());setInterval(()=>LevelGate.refresh(),30000);
})();
