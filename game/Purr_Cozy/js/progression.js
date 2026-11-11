/* Experience is banked at each level boundary until an English check is passed. */
const LevelGate = {
 cooldown:3600e3,questions:8,pass:6,
 // 0.93.5: the first checks are gentler, so a weaker player is not stuck at Lv 1–3 (where almost nothing can be bought):
 // up to Lv 4: 5 of 8 right, spelling shows the first letter, 10 minutes to retry; Lv 5–8: 6 of 8, first letter, 30 minutes; Lv 9+: as before
 rule(target){return target<=4?{pass:5,cd:10,hint:true}:target<=8?{pass:6,cd:30,hint:true}:{pass:this.pass,cd:60,hint:false}},
 ensure(){const S=Game.S;if(!S)return;S.gates=S.gates||{owner:null,pets:{}};S.gates.pets=S.gates.pets||{};return S.gates},
 subject(kind,pid){return kind==='owner'?Game.S:Pets.get(pid)},
 level(kind,p){return kind==='owner'?p.lvl:p.lv},
 gate(kind,pid,target){const all=this.ensure();if(!all)return null;let g=kind==='owner'?all.owner:all.pets[pid];if(!g||g.target!==target){g={target,retryAt:0,attempt:null,passed:false};if(kind==='owner')all.owner=g;else all.pets[pid]=g}return g},
 pending(kind,pid){const p=this.subject(kind,pid);return !!p&&(kind==='owner'?p.xp>=Game.need(p.lvl):p.lv<PET_LV_MAX&&p.xp>=Pets.xpNeed(p.lv))},
 allowed(kind,pid,target){return !!this.gate(kind,pid,target).passed},
 wait(g){return Math.max(0,Math.ceil(((g&&g.retryAt)||0)-Date.now())/60000)},
 notifyOwner(){if(!this.pending('owner'))return;const g=this.gate('owner',null,Game.S.lvl+1);if(!g.notified){g.notified=true;UI.toast(I18n.s("u_6fc11927b655"),'i_star',5,{label:I18n.s("u_aa7bad4bc428"),fn:()=>UI.openWin('learn')})}},
 notifyPet(p){if(!this.pending('pet',p.id))return;const g=this.gate('pet',p.id,p.lv+1);if(!g.notified){g.notified=true;UI.toast(p.name+I18n.s("u_9bf713458b5b"),'i_paw',5)}},
 start(kind,pid){if(!this.pending(kind,pid))return;const p=this.subject(kind,pid),g=this.gate(kind,pid,this.level(kind,p)+1);if(Date.now()<g.retryAt)return UI.toast(I18n.s("u_689b9f6f9c0b")+Math.ceil(this.wait(g))+I18n.s("u_99ad82985c54"),'i_learn',3);if(Learn.sess&&Learn.sess.kind==='levelgate'&&Learn.sess.step!=='result')this.abandon();
   const token=Date.now()+'-'+Math.random().toString(36).slice(2);g.attempt={token,at:Date.now(),from:this.level(kind,p)};const rule=this.rule(g.target);g.retryAt=Date.now()+rule.cd*60e3;g.passed=false;Game.save();
   const ids=Adaptive.pick(this.questions,null,i=>({type:Challenge.spellable(VOCAB[i])?'spell':'zh2en',noHint:!rule.hint}));if(ids.length<this.questions)for(const v of shuffle(VOCAB.slice())){if(!ids.includes(v.i))ids.push(v.i);if(ids.length===this.questions)break;}
   Learn.start('levelgate',{kind,pid,target:g.target,token,questions:this.hardQs(ids,rule.hint),strict:true});
 },
 hardOptions(v,field){const text=o=>field==='w'?Learn.norm(o.w):Learn.qz(o),pos=v.ps[0];let pool=VOCAB.filter(o=>o.ps.includes(pos)&&!Learn.clash(v,o,field));
   const similarity=o=>(o.t===v.t?8:0)+Math.max(0,5-Math.abs(o.w.length-v.w.length))+(o.w[0]===v.w[0]?3:0);
   pool.sort((a,b)=>similarity(b)-similarity(a));pool=shuffle(pool.slice(0,35));const out=[v],used=new Set([text(v)]);
   const add=o=>{if(out.length<4&&!used.has(text(o))&&!out.some(x=>Learn.clash(x,o,field))){out.push(o);used.add(text(o))}};
   for(const o of pool)add(o);if(out.length<4)for(const o of shuffle(VOCAB.filter(o=>!Learn.clash(v,o,field))))add(o);return shuffle(out).map(o=>o.i);
 },
 hardQs(ids,hint){return ids.map((i,k)=>{const v=VOCAB[i];let type=['en2zh','zh2en','spell','listen','zh2en','spell','en2zh','zh2en'][k%8];if(type==='listen'&&!Learn.canSpeak())type='zh2en';if(type==='spell'&&!Challenge.spellable(v))type='zh2en';return{i,type,noHint:type==='spell'&&!hint,opts:type==='spell'?null:this.hardOptions(v,type==='zh2en'?'w':'z')}})},
 finish(s,R,n){if(s._gateResult)return s._gateResult;const o=s.opts,p=this.subject(o.kind,o.pid),g=p&&this.gate(o.kind,o.pid,o.target);let msg=I18n.s("u_70d578fbbb09");
   if(p&&g.attempt&&g.attempt.token===o.token&&this.level(o.kind,p)+1===o.target&&this.pending(o.kind,o.pid)){
     const rule=this.rule(o.target),pass=R>=rule.pass;g.attempt=null;g.retryAt=pass?0:Date.now()+rule.cd*60e3;g.passed=pass;
     if(pass){const before=this.level(o.kind,p);if(o.kind==='owner')Game.reward(0,0,'raw');else Pets.addXp(p,0);msg=(o.kind==='owner'?I18n.s("u_2eb493edbfcf")+p.lvl+I18n.s("u_08b470622cde"):p.name+I18n.s("u_2eb493edbfcf")+p.lv+I18n.s("u_08b470622cde"));if(this.level(o.kind,p)===before)msg=I18n.s("u_19e1ace6143a");}
     else msg=I18n.t('gate.fail',[R,n,rule.pass,rule.cd]);
   }
   s._gateResult={coins:0,xp:0,items:[],msg};Game.save();UI.refresh('learn');UI.refresh('pet');UI.refresh('settings');return s._gateResult;
 },
 abandon(){const s=Learn.sess;if(!s||s.kind!=='levelgate'||s.step==='result')return;const o=s.opts,p=this.subject(o.kind,o.pid);if(!p)return;const g=this.gate(o.kind,o.pid,o.target);if(g.attempt&&g.attempt.token===o.token){g.attempt=null;g.passed=false;g.retryAt=Date.now()+this.rule(o.target).cd*60e3;s.step='result';s.result={coins:0,xp:0,items:[],msg:I18n.s("u_f63915d2a248")};Game.save();}},
 card(kind,pid){if(!this.pending(kind,pid))return null;const p=this.subject(kind,pid),g=this.gate(kind,pid,this.level(kind,p)+1),wait=this.wait(g);return h('section',{class:'settings-card levelgate-card','data-kind':kind,'data-pid':pid??''},h('b',{text:(kind==='owner'?I18n.s("u_2d6e8b12caeb"):p.name+I18n.s("u_b179cb207292"))+' · Lv '+this.level(kind,p)+' → '+(this.level(kind,p)+1)}),h('p',{class:'hint',text:(r=>I18n.t('gate.rule',[this.questions,r.pass,r.cd]))(this.rule(this.level(kind,p)+1))}),h('button',{class:'chip primary gate-start',disabled:wait>0,onclick:()=>this.start(kind,pid)},wait>0?I18n.s("u_689b9f6f9c0b")+Math.ceil(wait)+I18n.s("u_c38c98ff82d9"):I18n.s("u_0df9666bbb3f")))},
 refresh(){for(const card of document.querySelectorAll('.levelgate-card')){const kind=card.dataset.kind,pid=card.dataset.pid?+card.dataset.pid:null,p=this.subject(kind,pid);if(!p||!this.pending(kind,pid))continue;const wait=this.wait(this.gate(kind,pid,this.level(kind,p)+1)),b=card.querySelector('.gate-start');b.disabled=wait>0;b.textContent=wait>0?I18n.s("u_689b9f6f9c0b")+Math.ceil(wait)+I18n.s("u_c38c98ff82d9"):I18n.s("u_0df9666bbb3f");}},
};
(function(){
 const start=Learn.start.bind(Learn);Learn.start=function(kind,opts){if(this.sess&&this.sess.kind==='levelgate'&&this.sess.step!=='result'&&kind!=='levelgate')LevelGate.abandon();return start(kind,opts)};
 const close=UI.closeWin.bind(UI);UI.closeWin=function(id){if(id==='study')LevelGate.abandon();return close(id)};
 const luck=Feel.luck.bind(Feel);Feel.luck=function(s,q){if(s.kind==='levelgate')return null;return luck(s,q)};
 const study=UI.w_study.bind(UI);UI.w_study=function(){const out=study(),s=Learn.sess;if(s&&s.kind==='levelgate'){const title=out[0]&&out[0].querySelector('b');if(title)title.textContent=s.opts.kind==='owner'?I18n.s("u_aa07570ccecc"):Pets.name(s.opts.pid)+I18n.s("u_b179cb207292");if(s.step==='result')out.push(h('button',{class:'chip primary',onclick:()=>{this.closeWin('study');if(s.opts.kind==='pet')Pets.select(s.opts.pid,'care');else this.openWin('learn')}},s.opts.kind==='pet'?I18n.s("u_b8a85ecdf2d2"):I18n.s("u_cae7b6a2d92c")));}return out};
 for(const id of ['learn','settings']){const original=UI['w_'+id].bind(UI);UI['w_'+id]=function(){return [LevelGate.card('owner'),...original()]};}
 const pet=UI.w_pet.bind(UI);UI.w_pet=function(){const out=pet(),p=Pets.sel();if(p){const card=LevelGate.card('pet',p.id);if(card)out.splice(2,0,card)}return out};
 const hud=UI.hud.bind(UI);UI.hud=function(){const r=hud(...arguments),b=this.el.lvl;if(b){const pending=LevelGate.pending('owner');b.classList.toggle('gate-ready',pending);b.onclick=()=>this.openWin(pending?'learn':'settings');b.setAttribute('aria-label',pending?I18n.s("u_aa07570ccecc"):I18n.s("u_0b12e41f79f6"));if(pending)b.title=I18n.s("u_5f9cd43add1f");}return r};
 // 0.93.5: the story quiz is no longer made harder here (it used to add 2 extra hard questions with unseen words to a
 // chapter whose button says 5 questions, and no-hint spelling every third question)
 const finish=Story.finish.bind(Story);Story.finish=function(s,R){const c=this.week().ch[s.opts.ch];if(c.done)return finish(s,R);const n=s.qs.length,need=Math.max(1,Math.ceil(n*.6));/* 0.93.6: 3 of 5 (was 4 of 5), and the button says so */if(R<need)return{coins:0,xp:0,items:[],msg:I18n.s("u_af0402d95382")+R+'/'+n+I18n.s("u_af43a61737a9")+need+I18n.s("u_31de46656cfb")};return finish(s,R)};
 window.addEventListener('pagehide',()=>LevelGate.abandon());setInterval(()=>LevelGate.refresh(),30000);
})();
