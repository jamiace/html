/* Built-in queue entries are runtime data; only user entries and playback preferences go to the save/cloud. */
const MusicPlaylists={
 builtin(e){return !!(e&&(e.builtin||e.id===NOOK_YT.id))},
 install(M){if(!M||M._splitPlaylists)return;const previous=Array.isArray(M.list)?M.list:[],selected=M.selectedId||previous[M.idx]?.id||'',users=previous.filter(e=>!this.builtin(e));M.list=[Object.assign({},NOOK_YT),...users];M.idx=selected?M.list.findIndex(e=>e.id===selected):-1;
 Object.defineProperty(M,'_splitPlaylists',{value:true});Object.defineProperty(M,'toJSON',{configurable:true,value(){const out={};for(const [k,v]of Object.entries(this))if(k!=='list'&&k!=='selectedId')out[k]=v;out.list=this.list.filter(e=>!MusicPlaylists.builtin(e));out.selectedId=this.list[this.idx]?.id||'';out.idx=out.list.findIndex(e=>e.id===out.selectedId);return out}})
 },
 users(M){return (M?.list||[]).filter(e=>!this.builtin(e))}
};
(function(){const load=Game.load.bind(Game);Game.load=function(){const result=load(...arguments);MusicPlaylists.install(this.S.music);return result};
 const remove=Music.remove.bind(Music);Music.remove=function(id){if(this.M.list.find(e=>e.id===id)?.builtin)return;return remove(id)};
 const move=Music.move.bind(Music);Music.move=function(id,dir){const list=this.M.list,i=list.findIndex(e=>e.id===id),j=i+dir;if(i<0||MusicPlaylists.builtin(list[i])||MusicPlaylists.builtin(list[j]))return;return move(id,dir)};
})();
