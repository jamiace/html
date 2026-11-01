/* 0.92.29 Purr Cozy mini games: small 2D contact helpers shared by pinball, toss and maze.
   Ball = {x,y,vx,vy,r}. Walls are capsules (segment + radius, radius may taper). Moving parts pass a
   surface velocity so a swinging flipper transfers its real speed at the contact point. */
const MiniPhys={
 clamp:(v,a,b)=>v<a?a:v>b?b:v,
 // Number of sub-steps so the ball never moves more than `maxMove` per sub-step (continuous-enough collision).
 substeps(b,dt,maxMove){return Math.min(24,Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/maxMove)))},
 // Separate the ball from a contact and apply restitution e, tangential friction f, optional outward kick.
 resolve(b,nx,ny,pen,m={}){
  b.x+=nx*pen;b.y+=ny*pen;
  const svx=m.svx||0,svy=m.svy||0,rvx=b.vx-svx,rvy=b.vy-svy,vn=rvx*nx+rvy*ny;
  if(vn>=0)return{nx,ny,impact:0};
  const e=m.e??.5,f=m.f??.02,tx=rvx-vn*nx,ty=rvy-vn*ny;
  b.vx=svx+tx*(1-f)-e*vn*nx;b.vy=svy+ty*(1-f)-e*vn*ny;
  return{nx,ny,impact:-vn};
 },
 capsule(b,w,m=w.mat){
  const dx=w.bx-w.ax,dy=w.by-w.ay,L2=dx*dx+dy*dy;
  let t=L2>1e-9?((b.x-w.ax)*dx+(b.y-w.ay)*dy)/L2:0;t=t<0?0:t>1?1:t;
  const px=w.ax+dx*t,py=w.ay+dy*t,rad=w.r0+((w.r1??w.r0)-w.r0)*t;
  let nx=b.x-px,ny=b.y-py;const d=Math.hypot(nx,ny),min=b.r+rad;
  if(d>=min)return null;
  if(d<1e-6){const l=Math.sqrt(L2)||1;nx=-dy/l;ny=dx/l;if(!L2){nx=0;ny=-1}}else{nx/=d;ny/=d}
  const c=this.resolve(b,nx,ny,min-d,m);c.t=t;c.px=px;c.py=py;return c;
 },
 circle(b,cx,cy,r,m){let nx=b.x-cx,ny=b.y-cy;const d=Math.hypot(nx,ny),min=b.r+r;if(d>=min)return null;if(d<1e-6){nx=0;ny=-1}else{nx/=d;ny/=d}return this.resolve(b,nx,ny,min-d,m)},
 // Guarantee an outward speed after a contact (pop bumpers, slingshots).
 kick(b,c,speed){const vn=b.vx*c.nx+b.vy*c.ny;if(vn<speed){b.vx+=c.nx*(speed-vn);b.vy+=c.ny*(speed-vn)}},
 cap(b,max){const s=Math.hypot(b.vx,b.vy);if(s>max){b.vx*=max/s;b.vy*=max/s}},
 // Geometry builders: polyline -> capsules; arc -> point list.
 poly(out,pts,r,mat,tag){for(let i=1;i<pts.length;i++){const[a,c]=[pts[i-1],pts[i]];if(Math.hypot(c[0]-a[0],c[1]-a[1])<.01)continue;out.push({ax:a[0],ay:a[1],bx:c[0],by:c[1],r0:r,r1:r,mat,tag})}return out},
 arc(cx,cy,r,a0,a1,step=.06){const n=Math.max(1,Math.ceil(Math.abs(a1-a0)/step)),p=[];for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n;p.push([cx+r*Math.cos(a),cy+r*Math.sin(a)])}return p},
 // Seeded random (same algorithm as core.js rng) so generated mazes are stable across releases.
 rng(seed){let a=seed>>>0;return()=>{a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
};
