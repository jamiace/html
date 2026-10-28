/* Canonical source text stays separate from presentation, so names and rules retain stable identities. */
window.I18n={
 lang:'zh-TW',ui:null,vocab:null,origins:new Map(),cache:new Map(),nodeState:new WeakMap(),attrState:new WeakMap(),observer:null,
 format(text,args=[]){return String(text).replace(/\{(\d+)\}/g,(_,n)=>args[n]??'')},
 s(id,args=[]){const source=this.ui.messages[id]?.source;if(source==null)throw Error('Missing localization key: '+id);const text=this.format(source,args);if(args.length){this.origins.set(text,{id,args});this.cache.delete(text);this.register(text,{id,args})}return text},
 t(id,args=[]){const entry=this.ui.messages[id];return this.format(entry?.[this.lang]??entry?.['zh-TW']??id,args.map(x=>typeof x==='string'?this.render(x):x))},
 named(source,args={}){const id=this.sourceIndex.get(source),entry=id?this.ui.messages[id]:null;const template=entry?.[this.lang]??source;const text=template.replace(/\{(\w+)\}/g,(m,k)=>args[k]!=null?this.render(String(args[k])):m);if(text!==source)this.localizedOutputs.add(text);return text},
 meaning(word){const key=this.vocab.runtime[word],e=this.vocab.meanings[key];const value=e?.[this.lang]??e?.['zh-TW']??'';this.localizedOutputs?.add(value);for(const part of value.split(/[；;]/))this.localizedOutputs?.add(part.trim());return value},

 register(text,descriptor){if(!text||!/[\p{Script=Han}]/u.test(text))return;let node=this.trie;for(const ch of text){if(!node.next)node.next=new Map();if(!node.next.has(ch))node.next.set(ch,{});node=node.next.get(ch)}node.entry=descriptor;},
 resolve(descriptor,depth){const e=this.ui.messages[descriptor.id];if(!e)return '';return this.format(e[this.lang]??e['zh-TW']??e.source,(descriptor.args||[]).map(v=>typeof v==='string'?this.render(v,depth+1):v))},
 render(value,depth=0){
  if(typeof value!=='string'||!value||depth>12)return value;
  if(this.localizedOutputs?.has(value))return value;
  if(typeof Music!=='undefined'&&Music.cur?.title){const title=Music.cur.title;if(title===value)return value;if(/\p{Script=Han}/u.test(title)&&value.includes(title))return value.split(title).map(part=>this.render(part,depth+1)).join(title)}
  if(typeof Game!=='undefined'&&Game.S){const S=Game.S;if(value===S.name||value===S.profile?.name||(S.zoo?.pets||[]).some(p=>p.name===value))return value}
  if(this.cache.has(value))return this.cache.get(value);
  let result=value;const origin=this.origins.get(value),exact=this.sourceIndex.get(value);
  if(origin)result=this.resolve(origin,depth);else if(exact)result=this.resolve({id:exact},depth);
  else{
   // Translate whole registered phrases, including adjacent dynamic messages and generated furniture names.
   let staged=value;for(const pattern of this.numberPatterns||[])staged=staged.replace(pattern.regex,(...matches)=>{const args=[];pattern.indices.forEach((n,i)=>args[n]=matches[i+1]);return this.resolve({id:pattern.id,args},depth)});const chars=Array.from(staged),parts=[];let i=0;
   while(i<chars.length){let node=this.trie,last=null;for(let j=i;j<chars.length;j++){node=node.next?.get(chars[j]);if(!node)break;if(node.entry)last={entry:node.entry,end:j+1}}if(last){parts.push(this.resolve(last.entry,depth));i=last.end}else parts.push(chars[i++])}
   result=parts.join('');
   // Long, anchored historical templates can also be displayed from older saved logs.
   if(result===value)for(const pattern of this.patterns||[]){if(pattern.fixed<6)continue;const match=pattern.regex.exec(value);if(!match)continue;const args=[];pattern.indices.forEach((n,i)=>args[n]=match[i+1]);result=this.resolve({id:pattern.id,args},depth);break}
  }
  if(this.cache.size>18000)this.cache.clear();this.cache.set(value,result);if(result!==value)this.localizedOutputs.add(result);return result;
 },
 async init(build){let saved;try{saved=localStorage.getItem('purr-cozy.language')}catch{}this.lang=['zh-TW','zh-CN','ja'].includes(saved)?saved:'zh-TW';
  const load=async p=>{const r=await fetch(p+'?v='+encodeURIComponent(build.version),{cache:'no-cache'});if(!r.ok)throw Error('Language resources could not be loaded. Please retry.');return r.json()};
  [this.ui,this.vocab]=await Promise.all([load('i18n/ui.json'),load('i18n/vocab.json')]);
  this.trie={};this.localizedOutputs=new Set();this.sourceIndex=new Map(Object.entries(this.ui.messages).map(([id,e])=>[e.source,id]));
  for(const [source,id] of this.sourceIndex)if(!/\{\d+\}/.test(source))this.register(source,{id});
  const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const fragments=[...this.sourceIndex.keys()].filter(s=>s.length>=2&&!/\{\d+\}/.test(s)).sort((a,b)=>b.length-a.length);
  this.fragments=new RegExp(fragments.map(esc).join('|')||'(?!)','g');document.documentElement.lang=this.lang;
  this.patterns=Object.entries(this.ui.messages).filter(([,e])=>/\{\d+\}/.test(e.source)).sort((a,b)=>b[1].source.length-a[1].source.length).map(([id,e])=>{const indices=[];let expression='',at=0;for(const m of e.source.matchAll(/\{(\d+)\}/g)){expression+=esc(e.source.slice(at,m.index))+'(.*?)';indices.push(Number(m[1]));at=m.index+m[0].length}expression+=esc(e.source.slice(at));return{id,indices,fixed:e.source.replace(/\{\d+\}/g,'').length,regex:new RegExp('^'+expression+'$','s')}});
  this.numberPatterns=this.patterns.filter(p=>p.fixed>=2).map(p=>({...p,regex:new RegExp(p.regex.source.slice(1,-1).replaceAll('(.*?)','([-+]?\\d[\\d,.]*)'),'g')}));
 },
 excluded(node){return !node.parentElement||!!node.parentElement.closest('script,style,textarea,input,[contenteditable="true"],[data-i18n-skip],.lyrics,.yt-title')},
 text(node){if(this.excluded(node))return;const current=node.nodeValue,prev=this.nodeState.get(node);if(prev&&current===prev.output)return;const output=this.render(current);this.nodeState.set(node,{source:current,output});if(output!==current)node.nodeValue=output},
 attrs(el){for(const name of ['title','placeholder','aria-label','alt']){if(!el.hasAttribute(name))continue;let state=this.attrState.get(el);if(!state)this.attrState.set(el,state={});const val=el.getAttribute(name);if(state[name]?.output===val)continue;const output=this.render(val);state[name]={source:val,output};if(output!==val)el.setAttribute(name,output)}},
 scan(root){if(root.nodeType===3){this.text(root);return}if(root.nodeType!==1)return;this.attrs(root);const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walker.nextNode())this.text(walker.currentNode);root.querySelectorAll('[title],[placeholder],[aria-label],[alt]').forEach(el=>this.attrs(el))},
 attach(){this.scan(document.documentElement);this.observer=new MutationObserver(records=>{for(const rec of records){if(rec.type==='characterData')this.text(rec.target);else if(rec.type==='attributes')this.attrs(rec.target);else for(const n of rec.addedNodes)this.scan(n)}});this.observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','placeholder','aria-label','alt']});
  for(const method of ['fillText','strokeText']){const original=CanvasRenderingContext2D.prototype[method];CanvasRenderingContext2D.prototype[method]=function(text,...args){return original.call(this,I18n.render(text),...args)}}
  for(const method of ['alert','confirm','prompt']){const original=window[method].bind(window);window[method]=(text,...args)=>original(I18n.render(text),...args)}
  const options=o=>o?{...o,body:this.render(o.body)}:o;
  if(typeof ServiceWorkerRegistration!=='undefined'&&ServiceWorkerRegistration.prototype.showNotification){const original=ServiceWorkerRegistration.prototype.showNotification;ServiceWorkerRegistration.prototype.showNotification=function(title,o){return original.call(this,I18n.render(title),options(o))}}
  if(typeof window.Notification==='function'){const Original=window.Notification;window.Notification=new Proxy(Original,{construct(Target,args){return Reflect.construct(Target,[I18n.render(args[0]),options(args[1])])}})}
  const download=Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype,'download');if(download?.set&&download.configurable)Object.defineProperty(HTMLAnchorElement.prototype,'download',{...download,set(value){download.set.call(this,I18n.render(value))}});
 },
 installSettings(){const original=UI.w_settings.bind(UI);UI.w_settings=function(){const select=h('select',{'aria-label':I18n.s('chooseLanguage')},...Object.entries(I18n.ui.languageNames).map(([value,label])=>h('option',{value,selected:I18n.lang===value,'data-i18n-skip':true},label)));select.dataset.i18nSkip='';const button=h('button',{class:'chip primary',onclick:async()=>{if(select.value===I18n.lang)return;button.disabled=true;try{Game.save();if(typeof Cloud!=='undefined'&&Cloud.flush)await Promise.race([Cloud.flush(),new Promise(r=>setTimeout(r,2000))]);localStorage.setItem('purr-cozy.language',select.value);location.reload()}catch(e){button.disabled=false;UI.toast(I18n.s('languageFail'),'i_cloud',4)}}},I18n.s('languageReload'));return[h('section',{class:'settings-card language-settings'},h('b',{text:I18n.s('language')}),h('label',{},h('span',{text:I18n.s('chooseLanguage')}),select),h('p',{class:'hint',text:I18n.s('languageNote')}),button),...original()]};},
};
