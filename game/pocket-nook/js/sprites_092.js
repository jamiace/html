/* 0.92 — hand-painted pixel furniture; uses the existing palette and sprite registry. */
(function () {
  const star = (g, x, y, col = 'w') => { g.rect(x + 2, y, 1, 5, col); g.rect(x, y + 2, 5, 1, col); g.px(x + 1, y + 1, col); g.px(x + 3, y + 1, col); };
  const item = (id, n, w, h, draw, opts = {}) => {
    SPR.def(id, () => { const g = new Grid(w, h); draw(g); return g.outline(); });
    ITEMS[id] = Object.assign({ id, n, spr: id, cat: 'decor', layer: 'decor', price: 100, lvl: 1 }, opts);
  };
  for (const [id, n, roof, col, price] of [['litter_tray','開放式貓砂盆',false,'o',65],['litter_house','屋型貓砂盆',true,'K',120],['litter_capsule','奶油膠囊砂盆',true,'t',180]]) {
    item(id,n,34,roof?29:18,g=>{
      if (roof) { g.ellipse(17,13,15,12,col);g.rect(2,13,30,9,col);g.ellipse(18,15,8,9,'y');g.ellipse(18,17,6,7,'B');g.rect(10,18,16,7,'B');g.hl(8,4,16,'f'); }
      const y=roof?21:7;g.ellipse(17,y+3,16,6,col);g.rect(1,y+3,32,5,col);g.hl(4,y+8,26,'y');g.ellipse(17,y+1,13,3,'h');
      for(let x=6;x<29;x+=4)g.px(x,y+(x%3),'f');g.hl(4,y+5,26,'p');g.rect(28,roof?9:2,2,7,'z');g.rect(26,roof?7:0,5,4,'A');
    },{cat:'furniture',layer:'floor',price,litter:true,capacity:roof?5:3,comfort:2});
  }
  item('bandage','小繃帶',12,12,g=>{g.rect(1,4,10,4,'g');g.rect(4,1,4,10,'g');g.rect(4,4,4,4,'f');g.px(5,5,'r');g.px(6,6,'r');},{special:true,price:0});
  delete ITEMS.bandage;
  SUPPLIES.bandage={n:'小繃帶',spr:'bandage',price:25,pet:1,desc:'替受傷的貓咪包紮，接著休息恢復。'};
  item('festival_lantern','流蘇紅燈籠',18,32,g=>{g.rect(7,1,4,2,'w');g.vl(9,0,3,'b');g.ellipse(9,12,8,10,'q');g.ellipse(9,12,6,9,'r');g.ellipse(9,11,3,8,'v');g.vl(9,5,14,'X');g.hl(4,3,10,'w');g.hl(4,21,10,'w');g.vl(9,23,6,'w');g.rect(6,27,6,3,'r');g.vl(7,27,5,'v');g.vl(10,27,5,'v');},{cat:'wall',layer:'wall',price:95,toggle:true,light:L(9,12,42,'warm',.8),twinkle:true});
  item('pumpkin_glow','南瓜小夜燈',24,23,g=>{g.rect(11,1,3,4,'j');g.ellipse(12,13,11,9,'u');g.ellipse(9,12,6,9,'v');g.ellipse(15,12,5,9,'v');g.vl(12,6,13,'u');g.rect(5,9,4,3,'W');g.rect(15,9,4,3,'W');g.hl(7,17,11,'W');g.px(8,16,'W');g.px(16,16,'W');g.px(12,18,'u');},{price:85,toggle:true,light:L(12,12,35,'warm',.9),flicker:true});
  item('star_curtain','星星光幕',64,22,g=>{g.hl(1,1,62,'b');for(let x=5;x<63;x+=10){const y=(x%3)*4+6;g.vl(x,2,y,'h');star(g,x-2,y,'w');g.px(x,y+2,'W');}},{cat:'wall',layer:'wall',price:145,toggle:true,light:L(32,12,65,'warm',.75),twinkle:true});
  item('aurora_panel','極光燈畫',48,27,g=>{g.rect(1,1,46,25,'y');g.rect(3,3,42,21,'m');for(let x=4;x<44;x++){const y=8+Math.round(Math.sin(x*.17)*3);g.vl(x,y,5,'J');g.vl(x,y+4,3,'K');g.px(x,y+7,'H');}for(const [x,y]of[[8,6],[20,19],[35,5],[40,21]])g.px(x,y,'W');g.hl(3,25,42,'z');},{cat:'wall',layer:'wall',price:210,toggle:true,light:L(24,12,52,'cool',.8),twinkle:true});
  item('neon_cat','貓咪霓虹燈',30,27,g=>{g.ellipse(15,15,12,10,'q');g.ellipse(15,15,10,8,'.');g.rect(4,3,2,10,'s');g.rect(6,3,2,2,'t');g.rect(8,5,2,3,'s');g.rect(23,3,2,10,'s');g.rect(21,3,2,2,'t');g.rect(19,5,2,3,'s');g.hl(8,14,4,'t');g.hl(19,14,4,'t');g.pts([[14,18],[15,19],[16,18]],'s');g.hl(2,18,6,'s');g.hl(22,18,6,'s');},{cat:'wall',layer:'wall',price:165,toggle:true,light:L(15,14,42,'pink',.85)});
  item('jelly_lamp','水母氣氛燈',22,33,g=>{g.rect(8,29,7,3,'z');g.vl(11,18,12,'A');g.ellipse(11,12,10,10,'n');g.ellipse(11,11,8,8,'K');g.hl(5,6,8,'p');g.hl(2,17,18,'p');for(let x=4;x<20;x+=4){g.vl(x,18,7+(x%3),'H');g.px(x+1,24,'t');}},{cat:'furniture',layer:'floor',price:185,toggle:true,light:L(11,12,47,'cool',.9),twinkle:true});
  item('moon_bunny','月兔燈',24,27,g=>{g.ellipse(12,14,11,11,'w');g.ellipse(9,11,8,9,'x');g.ellipse(16,18,5,5,'f');g.rect(13,7,3,10,'f');g.rect(18,9,3,9,'f');g.vl(14,9,6,'t');g.vl(19,11,4,'t');g.px(18,18,'y');g.rect(4,25,17,2,'b');},{price:120,toggle:true,light:L(12,13,40,'warm',.8)});
  item('disco_globe','星光舞球',26,32,g=>{g.vl(13,0,8,'z');g.ellipse(13,18,11,11,'y');g.ellipse(13,17,10,10,'A');for(let y=9;y<27;y+=4)for(let x=5;x<23;x+=4)if(g.get(x,y)!=='.')g.rect(x,y,2,2,['p','t','K','H'][(x+y)%4]);g.hl(9,7,8,'B');g.rect(9,28,8,3,'z');},{cat:'wall',layer:'wall',price:180,toggle:true,light:L(13,18,58,'pink',.75),twinkle:true});
  item('wall_sconce','黃銅壁燈',16,23,g=>{g.rect(6,10,4,11,'b');g.rect(4,19,8,3,'u');g.ellipse(8,7,7,6,'w');g.hl(2,11,12,'u');g.hl(4,4,8,'x');g.px(7,13,'W');},{cat:'wall',layer:'wall',price:75,toggle:true,light:L(8,9,38,'warm',.8)});
  item('balloon_bouquet','生日氣球束',30,46,g=>{for(const [x,y,c]of[[8,12,'s'],[21,10,'K'],[15,4,'H']]){g.ellipse(x,y+5,7,9,c);g.px(x-2,y+1,'f');g.px(x,y+14,c);for(let j=0;j<24;j++)g.px(Math.round(x+(15-x)*j/24),y+15+j,'h');}g.rect(11,42,8,3,'w');},{cat:'furniture',layer:'floor',price:95});
  item('gift_tower','緞帶禮物堆',31,29,g=>{g.rect(2,17,27,10,'r');g.rect(5,7,21,10,'K');g.rect(9,1,14,7,'H');g.rect(14,17,3,10,'w');g.rect(14,7,3,10,'f');g.rect(14,1,3,6,'t');g.hl(3,18,25,'s');g.hl(6,8,19,'p');g.ellipse(12,1,3,2,'t');g.ellipse(19,1,3,2,'t');},{cat:'furniture',layer:'floor',price:80});
  item('celebration_banner','派對彩帶',70,20,g=>{for(let x=1;x<69;x++)g.px(x,2+Math.round(Math.sin(x/69*Math.PI)*5),'h');for(let x=4;x<65;x+=10){const y=4+Math.round(Math.sin(x/69*Math.PI)*5);for(let k=0;k<7;k++)g.hl(x+Math.floor(k/2),y+k,7-k,['s','K','H','w','o','r'][(x/10|0)%6]);}},{cat:'wall',layer:'wall',price:65});
  item('wall_planter','壁掛綠意',23,31,g=>{g.rect(5,18,14,10,'b');g.rect(4,17,16,3,'d');for(const [x,y]of[[5,5],[16,3],[10,10],[19,12],[4,13]]){g.vl(x,y,20-y,'j');g.ellipse(x,y,4,3,'k');g.px(x-1,y-1,'l');}g.hl(7,27,10,'a');},{cat:'wall',layer:'wall',price:85,react:'rustle'});
  item('constellation_clock','星軌時鐘',26,26,g=>{g.ellipse(13,13,12,12,'u');g.ellipse(13,13,10,10,'m');for(let i=0;i<12;i++){const a=i*Math.PI/6;g.px(Math.round(13+Math.sin(a)*8),Math.round(13+Math.cos(a)*8),'w');}star(g,10,10,'W');g.hl(13,13,5,'p');g.vl(13,7,7,'p');},{cat:'wall',layer:'wall',price:100});
  const windowDef=(id,n,w,h,price,arch=false)=>{
    item(id,n,w,h,g=>{for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const outer=!arch||y>=w/2||((x-w/2)**2+(y-w/2)**2)<(w/2-1)**2;if(outer)g.px(x,y,'b');}
      for(let y=4;y<h-5;y++)for(let x=4;x<w-4;x++){const inner=!arch||y>=w/2||((x-w/2)**2+(y-w/2)**2)<(w/2-4)**2;if(inner)g.px(x,y,'.');}
      g.rect(2,h-5,w-4,3,'e');g.hl(2,h-2,w-4,'a');g.vl(w/2|0,arch?4:3,h-9,'d');g.hl(4,Math.round(h*.52),w-8,'d');g.px((w/2|0)-2,Math.round(h*.52)+3,'w');
    },{cat:'wall',layer:'wall',price,window:{x:4,y:4,w:w-8,h:h-9,custom:true,arch}});
  };
  windowDef('window_small','小方窗',24,28,65);
  windowDef('window_wide','橫幅景觀窗',72,42,175);
  windowDef('window_arch','拱形大窗',54,63,210,true);
  windowDef('window_tall','窄長落地窗',30,66,165);
  // Six complete rooms: all listed furniture is included once per placement.
  const theme=(id,n,desc,wp,fl,view,price,accent)=>{
    const layout=[['window_arch',91,17],['bed',35,90],['desk',154,94,{kids:[['laptop',5],['mug',29]]}],['chair',165,106],['rug_round',90,129],['pet_bowl',72,153],['litter_house',189,128],['cat_tree',42,108],...accent];
    const grants=[];for(const [k,,,o={}]of layout){grants.push(k);for(const [ck]of o.kids||[])grants.push(ck);}
    THEMES[id]={n,desc,wp,fl,view,price,lvl:2,grants,layout};
  };
  theme('lantern_night','燈籠團圓夜','紅燈籠、月兔與暖光，留一盞燈等你回家。','rose_floral','wood_walnut','city',620,[['festival_lantern',62,23,{on:true}],['festival_lantern',167,23,{on:true}],['moon_bunny',133,103,{on:true}],['star_curtain',5,48,{on:true,wall:'left'}]]);
  theme('pumpkin_night','南瓜魔法屋','南瓜小燈與紫色月夜，今晚有點神祕。','studio_dark','wood_walnut','forest',640,[['pumpkin_glow',136,109,{on:true}],['neon_cat',160,33,{on:true}],['gift_tower',150,139],['wall_sconce',7,57,{on:true,wall:'left'}]]);
  theme('birthday_room','生日驚喜屋','氣球、彩帶和禮物，今天就好好慶祝。','lilac_check','checker_rose','city',580,[['balloon_bouquet',170,79],['celebration_banner',85,14],['gift_tower',146,143],['disco_globe',60,22,{on:true}],['star_curtain',213,53,{on:true,wall:'right'}]]);
  theme('aurora_study','極光觀測室','藍綠極光與星軌，陪你完成深夜的靈感。','studio_dark','concrete','snow',720,[['aurora_panel',153,26,{on:true}],['jelly_lamp',139,92,{on:true}],['constellation_clock',56,28],['neon_cat',6,60,{on:true,wall:'left'}]]);
  theme('greenhouse','陽光植感屋','大窗、木色與一牆綠意，慢慢呼吸。','mint_dot','wood_birch','forest',600,[['wall_planter',60,34],['wall_planter',161,32],['plant_monstera',141,100],['wall_planter',214,55,{wall:'right'}],['wall_sconce',7,53,{on:true,wall:'left'}]]);
  theme('winter_party','冬日星光派對','暖燈、聖誕樹與星星光幕，把冬天留在窗外。','winter_knit','plaid_carpet','snow',680,[['xmas_tree',158,55,{on:true}],['star_curtain',90,13,{on:true}],['gift_tower',147,140],['moon_bunny',132,104,{on:true}],['stocking',7,55,{wall:'left'}]]);
})();
