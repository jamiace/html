/* 0.92.36 Purr Cozy mini games: shared drawing kit for the canvas games (cards, puzzles, arcade).
   Pure drawing helpers — no game state. Every game draws on a 360-wide logical canvas; MiniTable scales it to the window. */
const MiniKit=(()=>{
 const F='system-ui,-apple-system,"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
 const font=(size,weight=800)=>`${weight} ${size}px ${F}`;
 const round=(c,x,y,w,h,r)=>MiniTable.round(c,x,y,w,h,Math.max(0,Math.min(r,w/2,h/2)));
 const ease={out:t=>1-(1-t)*(1-t),inOut:t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,back:t=>{const k=1.70158;return 1+(k+1)*Math.pow(t-1,3)+k*Math.pow(t-1,2)}};
 // text with an optional dark outline; shrinks to fit maxW
 function text(c,str,x,y,o={}){const size=o.size||16,weight=o.weight||800;let fs=size;c.font=font(fs,weight);
  if(o.maxW){const w=c.measureText(str).width;if(w>o.maxW){fs=Math.max(10,Math.floor(size*o.maxW/w));c.font=font(fs,weight)}}
  c.textAlign=o.align||'center';c.textBaseline=o.base||'alphabetic';
  if(o.stroke){c.lineJoin='round';c.lineWidth=o.lw||4;c.strokeStyle=o.stroke;c.strokeText(str,x,y)}
  c.fillStyle=o.color||'#fff3dc';c.fillText(str,x,y);c.textBaseline='alphabetic'}
 function bg(c,w,h,top,bottom,dots){const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,top);g.addColorStop(1,bottom);c.fillStyle=g;c.fillRect(0,0,w,h);
  if(dots){c.fillStyle=dots;for(let y=14;y<h;y+=26)for(let x=(y/26%2)*13+8;x<w;x+=26){c.beginPath();c.arc(x,y,1.6,0,7);c.fill()}}}
 // top bar: left / centre / right strings, optional progress 0..1 (timer)
 function hud(c,w,left,center,right,prog,progCol){round(c,8,6,w-16,36,11);c.fillStyle='rgba(36,27,46,.86)';c.fill();
  let lx=20;if(prog!=null){c.fillStyle='#3c3148';round(c,18,19,74,10,5);c.fill();c.fillStyle=progCol||(prog>.3?'#8fd39a':'#ff8f6b');round(c,18,19,Math.max(10,74*Math.max(0,Math.min(1,prog))),10,5);c.fill();lx=100}
  if(left)text(c,left,lx,30,{size:16,align:'left',maxW:110});if(center)text(c,center,w/2+(prog!=null?18:0),30,{size:16,maxW:120});if(right)text(c,right,w-20,30,{size:16,align:'right',maxW:110})}
 function panel(c,x,y,w,h,r,fill,stroke,shadow=true){if(shadow){c.fillStyle='rgba(30,20,40,.18)';round(c,x+2,y+4,w,h,r);c.fill()}c.fillStyle=fill;round(c,x,y,w,h,r);c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;round(c,x,y,w,h,r);c.stroke()}}
 function button(c,x,y,w,h,label,o={}){const down=o.down?2:0;c.fillStyle=o.shade||'rgba(40,28,40,.28)';round(c,x,y+3,w,h,o.r||10);c.fill();c.fillStyle=o.fill||'#fffaf0';round(c,x,y+down,w,h,o.r||10);c.fill();c.strokeStyle=o.edge||'#7a5a4a';c.lineWidth=2;round(c,x,y+down,w,h,o.r||10);c.stroke();
  if(label)text(c,label,x+w/2,y+down+h/2+(o.size||16)*.36,{size:o.size||16,color:o.color||'#3a2a20',maxW:w-8})}
 const hit=(p,x,y,w,h)=>p.x>=x&&p.x<=x+w&&p.y>=y&&p.y<=y+h;
 // ---- icons (centred at x,y, size = approx. diameter) ----
 function star(c,x,y,r,inner=.45,n=5,rot=-Math.PI/2){c.beginPath();for(let i=0;i<n*2;i++){const a=rot+i*Math.PI/n,q=i%2?r*inner:r;c.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q)}c.closePath()}
 function heart(c,x,y,s){c.beginPath();c.moveTo(x,y+s*.35);c.bezierCurveTo(x-s*.6,y-s*.05,x-s*.35,y-s*.55,x,y-s*.2);c.bezierCurveTo(x+s*.35,y-s*.55,x+s*.6,y-s*.05,x,y+s*.35);c.closePath()}
 function catFace(c,x,y,s,col,o={}){const r=s/2;c.save();c.translate(x,y);c.fillStyle=col;
  c.beginPath();c.moveTo(-r*.92,-r*.2);c.lineTo(-r*.78,-r*1.05);c.lineTo(-r*.25,-r*.62);c.lineTo(r*.25,-r*.62);c.lineTo(r*.78,-r*1.05);c.lineTo(r*.92,-r*.2);c.quadraticCurveTo(r,r*.75,0,r*.78);c.quadraticCurveTo(-r,r*.75,-r*.92,-r*.2);c.fill();
  c.fillStyle=o.inner||'#f6a3bd';c.beginPath();c.moveTo(-r*.7,-r*.45);c.lineTo(-r*.66,-r*.86);c.lineTo(-r*.38,-r*.58);c.fill();c.beginPath();c.moveTo(r*.7,-r*.45);c.lineTo(r*.66,-r*.86);c.lineTo(r*.38,-r*.58);c.fill();
  c.fillStyle=o.eye||'#2e2230';if(o.happy){c.strokeStyle=o.eye||'#2e2230';c.lineWidth=Math.max(1.2,r*.1);c.beginPath();c.arc(-r*.36,-r*.02,r*.16,Math.PI*1.1,Math.PI*1.9);c.stroke();c.beginPath();c.arc(r*.36,-r*.02,r*.16,Math.PI*1.1,Math.PI*1.9);c.stroke()}
  else{c.beginPath();c.ellipse(-r*.36,-r*.05,r*.11,r*.17,0,0,7);c.ellipse(r*.36,-r*.05,r*.11,r*.17,0,0,7);c.fill()}
  c.fillStyle='#f08bb0';c.beginPath();c.moveTo(-r*.1,r*.16);c.lineTo(r*.1,r*.16);c.lineTo(0,r*.28);c.fill();
  c.strokeStyle=o.eye||'#2e2230';c.lineWidth=Math.max(1,r*.07);c.beginPath();c.moveTo(0,r*.28);c.quadraticCurveTo(-r*.14,r*.42,-r*.26,r*.32);c.moveTo(0,r*.28);c.quadraticCurveTo(r*.14,r*.42,r*.26,r*.32);c.stroke();c.restore()}
 function fish(c,x,y,s,col,o={}){const r=s/2;c.save();c.translate(x,y);if(o.flip)c.scale(-1,1);c.fillStyle=col;c.beginPath();c.ellipse(-r*.1,0,r*.72,r*.45,0,0,7);c.fill();c.beginPath();c.moveTo(r*.5,0);c.lineTo(r,-r*.42);c.lineTo(r,r*.42);c.closePath();c.fill();
  c.fillStyle=o.belly||'rgba(255,255,255,.35)';c.beginPath();c.ellipse(-r*.15,r*.16,r*.45,r*.16,0,0,7);c.fill();c.fillStyle='#2e2230';c.beginPath();c.arc(-r*.5,-r*.1,Math.max(1.2,r*.09),0,7);c.fill();c.restore()}
 function mouse(c,x,y,s,col='#b9b0c4'){const r=s/2;c.save();c.translate(x,y);c.fillStyle=col;c.beginPath();c.ellipse(0,r*.15,r*.62,r*.55,0,0,7);c.fill();c.beginPath();c.arc(-r*.45,-r*.38,r*.3,0,7);c.arc(r*.45,-r*.38,r*.3,0,7);c.fill();c.fillStyle='#f6a3bd';c.beginPath();c.arc(-r*.45,-r*.38,r*.17,0,7);c.arc(r*.45,-r*.38,r*.17,0,7);c.fill();
  c.fillStyle='#2e2230';c.beginPath();c.arc(-r*.2,r*.05,r*.08,0,7);c.arc(r*.2,r*.05,r*.08,0,7);c.fill();c.fillStyle='#f08bb0';c.beginPath();c.arc(0,r*.3,r*.09,0,7);c.fill();c.restore()}
 function yarn(c,x,y,s,col){const r=s/2;c.save();c.fillStyle=col;c.beginPath();c.arc(x,y,r*.8,0,7);c.fill();c.strokeStyle='rgba(255,255,255,.45)';c.lineWidth=Math.max(1,r*.09);for(let i=-2;i<=2;i++){c.beginPath();c.ellipse(x,y,r*.78,r*.22+Math.abs(i)*r*.08,i*.55,0,7);c.stroke()}c.strokeStyle=col;c.lineWidth=Math.max(1,r*.1);c.beginPath();c.moveTo(x+r*.6,y+r*.5);c.quadraticCurveTo(x+r,y+r,x+r*.7,y+r*.95);c.stroke();c.restore()}
 function paw(c,x,y,s,col){const r=s/2;c.fillStyle=col;c.beginPath();c.ellipse(x,y+r*.25,r*.48,r*.4,0,0,7);c.fill();for(const[dx,dy]of[[-.5,-.25],[-.18,-.55],[.18,-.55],[.5,-.25]]){c.beginPath();c.ellipse(x+dx*r,y+dy*r,r*.18,r*.22,0,0,7);c.fill()}}
 function moon(c,x,y,s,col,bg){const r=s/2;c.fillStyle=col;c.beginPath();c.arc(x,y,r*.8,0,7);c.fill();c.fillStyle=bg;c.beginPath();c.arc(x+r*.35,y-r*.2,r*.68,0,7);c.fill()}
 function flower(c,x,y,s,col,mid='#ffd66b'){const r=s/2;c.fillStyle=col;for(let i=0;i<5;i++){const a=i*Math.PI*2/5-Math.PI/2;c.beginPath();c.arc(x+Math.cos(a)*r*.45,y+Math.sin(a)*r*.45,r*.36,0,7);c.fill()}c.fillStyle=mid;c.beginPath();c.arc(x,y,r*.28,0,7);c.fill()}
 function cup(c,x,y,s,col){const r=s/2;c.fillStyle=col;round(c,x-r*.6,y-r*.45,r*1.1,r*1.05,r*.2);c.fill();c.strokeStyle=col;c.lineWidth=r*.16;c.beginPath();c.arc(x+r*.55,y+r*.05,r*.28,-1.3,1.3);c.stroke();c.fillStyle='rgba(255,255,255,.55)';c.fillRect(x-r*.5,y-r*.42,r*.9,r*.16);c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=r*.08;for(const d of[-.2,.15]){c.beginPath();c.moveTo(x+d*r,y-r*.6);c.quadraticCurveTo(x+(d+.12)*r,y-r*.8,x+d*r,y-r*.98);c.stroke()}}
 function bell(c,x,y,s,col){const r=s/2;c.fillStyle=col;c.beginPath();c.moveTo(x-r*.7,y+r*.45);c.quadraticCurveTo(x-r*.65,y-r*.75,x,y-r*.75);c.quadraticCurveTo(x+r*.65,y-r*.75,x+r*.7,y+r*.45);c.closePath();c.fill();c.fillStyle='#2e2230';c.beginPath();c.arc(x,y+r*.52,r*.16,0,7);c.fill();c.fillStyle='rgba(255,255,255,.45)';c.beginPath();c.ellipse(x-r*.25,y-r*.2,r*.1,r*.3,.3,0,7);c.fill()}
 function crown(c,x,y,s,col){const r=s/2;c.fillStyle=col;c.beginPath();c.moveTo(x-r*.8,y+r*.45);c.lineTo(x-r*.8,y-r*.4);c.lineTo(x-r*.4,y);c.lineTo(x,y-r*.6);c.lineTo(x+r*.4,y);c.lineTo(x+r*.8,y-r*.4);c.lineTo(x+r*.8,y+r*.45);c.closePath();c.fill();c.fillStyle='#e2554f';c.beginPath();c.arc(x,y+r*.15,r*.13,0,7);c.fill()}
 function leaf(c,x,y,s,col){const r=s/2;c.fillStyle=col;c.beginPath();c.moveTo(x-r*.7,y+r*.6);c.quadraticCurveTo(x-r*.7,y-r*.7,x+r*.7,y-r*.7);c.quadraticCurveTo(x+r*.7,y+r*.6,x-r*.7,y+r*.6);c.fill();c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=Math.max(1,r*.08);c.beginPath();c.moveTo(x-r*.6,y+r*.5);c.lineTo(x+r*.5,y-r*.5);c.stroke()}
 const ICONS={fish:(c,x,y,s)=>fish(c,x,y,s,'#7fb6e8'),yarn:(c,x,y,s)=>yarn(c,x,y,s,'#f08bb0'),paw:(c,x,y,s)=>paw(c,x,y,s,'#a8724a'),mouse:(c,x,y,s)=>mouse(c,x,y,s),heart:(c,x,y,s)=>{heart(c,x,y,s);c.fillStyle='#e2554f';c.fill()},
  star:(c,x,y,s)=>{star(c,x,y,s*.48);c.fillStyle='#f1c043';c.fill()},moon:(c,x,y,s)=>moon(c,x,y,s,'#f6d77a','#fffaf0'),flower:(c,x,y,s)=>flower(c,x,y,s,'#b98ae0'),cup:(c,x,y,s)=>cup(c,x,y,s,'#e98a5b'),bell:(c,x,y,s)=>bell(c,x,y,s,'#f1c043'),crown:(c,x,y,s)=>crown(c,x,y,s,'#f1c043'),
  leaf:(c,x,y,s)=>leaf(c,x,y,s,'#6aa25a'),ginger:(c,x,y,s)=>catFace(c,x,y,s,'#f0a24f'),grey:(c,x,y,s)=>catFace(c,x,y,s,'#9a96ab'),ink:(c,x,y,s)=>catFace(c,x,y,s,'#3a3238',{eye:'#f1c043'}),snow:(c,x,y,s)=>catFace(c,x,y,s,'#f4ead8')};
 const shuffle=(a,rnd=Math.random)=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
 const sfx=(n,v)=>{try{MiniAudio.sfx(n,v)}catch{}};
 return{F,font,round,ease,text,bg,hud,panel,button,hit,star,heart,catFace,fish,mouse,yarn,paw,moon,flower,cup,bell,crown,leaf,ICONS,shuffle,sfx};
})();
