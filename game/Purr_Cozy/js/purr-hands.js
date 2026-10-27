/* Visible handheld tools for touch, independent of either room renderer. */
const PurrHands = {
  timer: null, panel: null, visual: null,
  touch() { return Mobile.on || Mobile.touch; },
  roomPoint(e,pt) {
    if (!Room.edit && PetPlay.held && HAND[PetPlay.held]==='wand' && (e.pointerType==='touch'||e.pointerType==='pen')) {
      const r=Room.cv.getBoundingClientRect();
      return [pt[0],Math.max(8,pt[1]-48/r.height*RH)];
    }
    return pt;
  },
  graphic() {
    if(this.visual)return this.visual;
    const el=this.visual=h('div',{class:'purr-touch-tool','aria-hidden':'true'},
      h('div',{class:'purr-tool-graphic'}),h('span',{class:'purr-tool-line'}),h('span',{class:'purr-tool-target'}));
    el.hidden=true;document.body.append(el);return el;
  },
  show(pt,parked=false) {
    if(!parked)clearTimeout(this.timer);
    const id=PetPlay.held,el=this.graphic();
    if(!id||!pt||document.body.classList.contains('purr-loading')||Room.edit) { el.hidden=true;return; }
    if(Object.values(UI.wins).some(w=>!w.el.hidden)){el.hidden=true;return;}
    const touch=this.touch(),wand=HAND[id]==='wand';
    const r=Room.cv.getBoundingClientRect();
    const x=r.left+pt[0]/RW*r.width,y=r.top+pt[1]/RH*r.height;
    if(x<0||x>innerWidth||y<r.top||y>r.bottom||r.bottom<0){el.hidden=true;return;}
    if(el.dataset.id!==id) {
      el.dataset.id=id;
      el.querySelector('.purr-tool-graphic').replaceChildren(ico(PetPlay.spr(id),touch?48:32));
      el.querySelector('.purr-tool-target').replaceChildren(...wand?[ico('toy_feather',22)]:[]);
    }
    el.classList.toggle('wand',wand);el.classList.toggle('parked',parked);
    el.classList.toggle('touch',touch);
    el.style.left=Math.max(30,Math.min(innerWidth-30,x))+'px';
    el.classList.toggle('below',y<Math.max(90,r.top+70));
    el.style.top=y+'px';
    el.hidden=false;
    if(Room.cv)Room.cv.style.cursor='none';
  },
  park() {
    clearTimeout(this.timer);
    if(!PetPlay.held||!this.touch())return;
    this.show([RW*.78,RH*.85],true);
  },
  end() {
    clearTimeout(this.timer);
    this.timer=setTimeout(()=>this.park(),700);
  },
  syncPanel() {
    if(!Mobile.on||!PetPlay.held) { this.panel?.remove();return; }
    const id=PetPlay.held;
    if(!this.panel)this.panel=h('div',{class:'purr-hand-panel'});
    if(this.panel.dataset.id!==id) {
      this.panel.dataset.id=id;
      this.panel.replaceChildren(ico(PetPlay.spr(id),34),
        h('div',{class:'purr-hand-text'},
          h('b',{text:PetPlay.name(id)}),
          h('span',{text:HAND[id]==='wand'?'在房間拖曳，羽毛會浮在手指上方':HAND[id]==='brush'?'按住寵物來回刷；圖示浮在手指上方':'點寵物或食盆使用；圖示浮在手指上方'})),
        h('button',{class:'chip sm',onclick:()=>PetPlay.drop()},'放下'));
    }
    if(Mobile.today&&this.panel.parentNode!==Mobile.today)Mobile.today.prepend(this.panel);
    if(PetPlay._hint)PetPlay._hint.hidden=true;
  }
};
(function(){
  const cursor=PetPlay.cursor.bind(PetPlay);
  PetPlay.cursor=function(pt) {
    if(!this.held||!pt) { if(PurrHands.visual)PurrHands.visual.hidden=true;return cursor(pt); }
    if(PurrHands.touch()||(HD2D.enabled&&HAND[this.held]==='wand')) {
      if(this._cur)this._cur.hidden=true;
      PurrHands.show(pt);return;
    }
    return cursor(pt);
  };
  const hint=PetPlay.showHint.bind(PetPlay);
  PetPlay.showHint=function() {
    if(Mobile.on){PurrHands.syncPanel();return;}
    PurrHands.panel?.remove();return hint();
  };
  const pick=PetPlay.pick.bind(PetPlay);
  PetPlay.pick=function(...args){const r=pick(...args);if(r){PurrHands.syncPanel();PurrHands.park();}return r;};
  const drop=PetPlay.drop.bind(PetPlay);
  PetPlay.drop=function(){clearTimeout(PurrHands.timer);drop();PurrHands.panel?.remove();if(PurrHands.visual)PurrHands.visual.hidden=true;};
  const leave=PetPlay.leave.bind(PetPlay);
  PetPlay.leave=function(){if(PurrHands.touch()&&this.held){this.ptrIn=false;this.up();PurrHands.end();return;}return leave();};
  const up=PetPlay.up.bind(PetPlay);
  PetPlay.up=function(){up();if(PurrHands.touch())PurrHands.end();};
  const render=Mobile.render.bind(Mobile);
  Mobile.render=function(...args){const r=render(...args);PurrHands.syncPanel();return r;};
  const open=UI.openWin.bind(UI);
  UI.openWin=function(...args){const r=open(...args);if(PurrHands.visual)PurrHands.visual.hidden=true;return r;};
  const close=UI.closeWin.bind(UI);
  UI.closeWin=function(...args){const r=close(...args);PurrHands.park();return r;};
  window.addEventListener('resize',()=>{PurrHands.syncPanel();PurrHands.park();});
  window.addEventListener('scroll',()=>{if(PetPlay.held&&PurrHands.touch())PurrHands.park();},true);
})();
