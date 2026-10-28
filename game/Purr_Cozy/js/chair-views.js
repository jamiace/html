/* Chair direction is shared by pixel and HD modes; saved furniture IDs stay unchanged. */
const ChairViews = {
  ready: null,
  back(it) {
    if (!ITEMS[it.k]?.chair) return false;
    if (Room.actors?.some(a=>a.seat?.uid===it.uid && ['work','sit'].includes(a.state))) return true;
    const raw=WallMount.raw(it), x=it.x+raw.width/2;
    return (Room.state?.items||[]).some(desk=>{
      if(!ITEMS[desk.k]?.desk || desk.p!=null)return false;
      const cv=WallMount.raw(desk);
      return Math.abs(x-desk.x-cv.width/2)<=Math.max(6,cv.width*.38) && it.y>=desk.y-2 && it.y<=desk.y+cv.height+14;
    });
  },
  async load() {
    try {
      const response=await fetch('assets/sprites/chair-backs.json');
      if(!response.ok)return;
      const pack=await response.json();
      for(const [name,entry] of Object.entries(pack.sprites))SPR.def(name,Grid.rows(entry.rows));
    } catch { /* A missing optional pack leaves the original chair available. */ }
  }
};
ChairViews.ready=ChairViews.load();
(function(){
  const original=Room.itemCanvas.bind(Room);
  Room.itemCanvas=function(it){
    const d=ITEMS[it.k], name=d?.spr+'_back';
    if(ChairViews.back(it) && SPR.defs[name]) {
      const map=it.wilt?Object.assign({},d.map,WILT_MAP):d.map;
      return SPR.get(name,map,it.flip,d.id+':back'+(it.wilt?':wilt':''));
    }
    return original(it);
  };
})();

