/* Layout and pinned memo controls shared by all supported languages. */
(function(){
 UI.WIN.timer.w=360;
 const originalPins=UI.renderPins.bind(UI);
 UI.renderPins=function(){
  if(this._pinState!==Game.S){document.getElementById('pins').replaceChildren();this._pinState=Game.S}
  originalPins();
  for(const el of document.querySelectorAll('#pins .pin')){
   const memo=Game.S.memos.find(m=>String(m.id)===el.dataset.id);if(!memo)continue;
   const width=Number.isFinite(memo.w)?memo.w:210,height=Number.isFinite(memo.h)?memo.h:160;
   const apply=(w,h)=>{memo.w=Math.round(Math.max(160,Math.min(innerWidth-16,w)));memo.h=Math.round(Math.max(110,Math.min(innerHeight-16,h)));memo.x=Math.max(0,Math.min(memo.x,innerWidth-memo.w-8));memo.y=Math.max(0,Math.min(memo.y,innerHeight-memo.h-8));el.style.width=memo.w+'px';el.style.height=memo.h+'px';el.style.left=memo.x+'px';el.style.top=memo.y+'px';};
   apply(width,height);
   if(el.dataset.resizeReady)continue;el.dataset.resizeReady='true';
   for(const edge of ['x','y','xy']){
    const handle=h('button',{type:'button',class:'pin-resize pin-resize-'+edge,'aria-label':I18n.t('memo.resize'+(edge==='xy'?'XY':edge.toUpperCase()))});
    if(edge==='xy')handle.textContent='◢';
    handle.addEventListener('pointerdown',e=>{
     e.preventDefault();e.stopPropagation();const x=e.clientX,y=e.clientY,w=el.offsetWidth,he=el.offsetHeight;handle.setPointerCapture(e.pointerId);
     const move=ev=>apply(w+(edge.includes('x')?ev.clientX-x:0),he+(edge.includes('y')?ev.clientY-y:0));
     const up=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up);handle.removeEventListener('pointercancel',up);Game.save()};
     handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);handle.addEventListener('pointercancel',up);
    });
    handle.addEventListener('keydown',e=>{if(!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'].includes(e.key))return;e.preventDefault();const n=e.shiftKey?30:10;apply(el.offsetWidth+(edge.includes('x')?(e.key==='ArrowRight'?n:e.key==='ArrowLeft'?-n:0):0),el.offsetHeight+(edge.includes('y')?(e.key==='ArrowDown'?n:e.key==='ArrowUp'?-n:0):0));Game.save()});
    el.append(handle);
   }
  }
 };
 let pending=false;window.addEventListener('resize',()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;if(Game.S)UI.renderPins()})});
})();
