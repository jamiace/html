/* 0.92 art revision: one-pixel ink contours, material shading and themed furnishings. */
(function () {
  const ink='0';
  const edge=g=>g.outline(ink);
  const part=(g,w,h,x,y,paint)=>{const p=new Grid(w,h);paint(p);g.paste(edge(p),x,y);};
  const star=(g,x,y,c='w')=>g.stamp(x,y,['..a..','.aaa.','aaaaa','.aaa.','..a..'].map(r=>r.replaceAll('a',c)));
  const bow=(g,x,y,c='s',hi='t')=>{g.stamp(x,y,['aa...aa','abaaaba','.aaaaa.','..aaa..','.a...a.'].map(r=>r.replaceAll('a',c).replaceAll('b',hi)));};
  const item=(id,n,w,h,paint,opts={})=>{
    SPR.def(id,()=>{const g=new Grid(w,h);paint(g);edge(g);return opts.toggle?g.recolor({W:'g',X:'w',Z:'f'}):g;});
    if(opts.toggle)SPR.def(id+'_on',()=>{const g=new Grid(w,h);paint(g);return edge(g);});
    ITEMS[id]=Object.assign({id,n,spr:id,cat:'decor',layer:'decor',price:100,lvl:1},opts,opts.toggle?{onSpr:id+'_on'}:{});
  };
  const sand=(g,x,y,w)=>{g.rect(x,y,w,3,'h');g.hl(x+1,y,w-2,'g');for(let i=0;i<w-2;i+=3)g.px(x+1+i,y+1+(i%2),'e');g.hl(x,y+3,w,'a');};
  // Three different silhouettes: glazed tray, timber hood, moulded capsule.
  item('litter_tray','開放式貓砂盆',34,18,g=>{
    g.rect(3,6,28,9,'I');g.cut(3,6,28,9,2);g.rect(4,7,26,6,'J');g.hl(5,13,24,'I');
    g.rect(2,4,30,5,'0');g.cut(2,4,30,5,1);g.rect(3,4,28,3,'K');g.hl(5,4,24,'p');sand(g,5,5,23);
    g.hl(6,10,19,'K');g.vl(4,9,3,'K');g.rect(7,14,3,2,'a');g.rect(25,14,3,2,'a');
    part(g,6,11,27,0,p=>{p.rect(2,5,1,5,'b');p.rect(1,1,4,5,'A');p.vl(2,2,3,'y');p.vl(4,2,3,'y');p.hl(1,5,4,'z');});
  },{cat:'furniture',layer:'floor',price:65,litter:true,capacity:3,comfort:2});
  item('litter_house','屋型貓砂盆',34,29,g=>{
    g.rect(4,9,26,16,'c');g.vl(4,10,15,'d');g.vl(29,11,14,'a');
    for(let y=12;y<25;y+=4){g.hl(5,y,24,'b');g.hl(6,y+1,22,'d');}
    for(let y=2;y<12;y++){const k=10-y;g.hl(4+k,y,26-k*2,'I');g.px(4+k,y,'K');g.px(29-k,y,'0');}
    g.hl(3,11,28,'0');g.hl(4,10,26,'K');g.hl(7,7,20,'J');
    g.ellipse(17,18,8,9,'0');g.rect(9,18,16,7,'0');g.ellipse(17,18,6,7,'a');g.rect(11,19,12,6,'a');sand(g,11,23,12);
    g.rect(2,25,30,2,'b');g.hl(3,25,28,'e');g.hl(5,27,24,'a');
    g.rect(14,7,6,3,'w');g.px(16,8,'a');g.px(18,8,'a');
  },{cat:'furniture',layer:'floor',price:120,litter:true,capacity:5,comfort:2});
  item('litter_capsule','奶油膠囊砂盆',34,29,g=>{
    g.ellipse(17,14,15,12,'h');g.rect(3,13,28,11,'h');g.ellipse(15,12,13,10,'g');g.ellipse(14,10,11,7,'f');
    g.hl(9,3,12,'Z');g.hl(5,7,4,'Z');g.vl(3,12,7,'f');g.vl(30,14,9,'h');
    g.ellipse(19,17,9,9,'0');g.ellipse(19,17,7,7,'q');g.rect(12,19,14,6,'q');g.hl(14,11,7,'r');sand(g,13,23,12);
    g.rect(3,25,28,2,'r');g.hl(4,25,26,'s');g.rect(6,27,4,1,'a');g.rect(25,27,4,1,'a');g.px(27,8,'K');g.px(28,8,'I');
    g.hl(6,19,3,'h');g.hl(6,21,3,'h');
  },{cat:'furniture',layer:'floor',price:180,litter:true,capacity:5,comfort:2});
  item('bandage','小繃帶',12,12,g=>{g.rect(1,4,10,4,'h');g.rect(4,1,4,10,'g');g.rect(4,4,4,4,'f');g.px(5,5,'r');g.px(6,6,'r');});delete ITEMS.bandage;
  SUPPLIES.bandage={n:'小繃帶',spr:'bandage',price:25,pet:1,desc:'替受傷的貓咪包紮，接著休息恢復。'};
  item('festival_lantern','流蘇紅燈籠',18,32,g=>{
    g.vl(8,1,3,'0');g.rect(6,3,6,2,'u');g.hl(7,3,4,'x');
    g.ellipse(9,13,7,9,'q');g.ellipse(8,12,6,8,'r');g.ellipse(7,11,3,7,'s');
    for(const x of [5,9,13]){g.vl(x,7,11,'q');g.px(x,6,'w');g.px(x,18,'v');}g.vl(8,8,9,'X');
    g.rect(5,4,8,2,'u');g.hl(5,4,8,'x');g.rect(5,21,8,2,'u');g.hl(6,21,6,'w');
    g.vl(8,23,3,'w');g.rect(6,26,6,2,'q');g.vl(6,27,4,'r');g.vl(9,27,4,'v');g.vl(11,27,4,'r');
  },{cat:'wall',layer:'wall',price:95,toggle:true,light:L(9,12,42,'warm',.8),twinkle:true});
  item('pumpkin_glow','南瓜小夜燈',24,23,g=>{
    g.ellipse(12,20,9,1,'a');g.ellipse(7,13,5,8,'u');g.ellipse(17,13,5,8,'u');g.ellipse(12,13,7,9,'v');
    g.ellipse(10,12,3,8,'w');g.vl(6,7,10,'M');g.vl(17,7,10,'M');g.px(8,5,'x');g.px(9,5,'x');
    g.stamp(5,9,['.00....00.','0000..0000','.WX....XW.']);g.stamp(7,15,['0......0','0WXWWXW0','.000000.']);
    g.rect(11,2,3,4,'i');g.px(13,1,'k');g.px(14,1,'j');g.px(10,4,'j');
  },{price:85,toggle:true,light:L(12,12,35,'warm',.9),flicker:true});
  item('star_curtain','星星光幕',64,22,g=>{
    g.hl(2,2,60,'0');g.hl(3,1,58,'b');g.px(2,1,'w');g.px(61,1,'w');
    for(const [x,y]of [[7,11],[19,16],[31,9],[43,15],[55,10]]){g.vl(x,3,y-3,'0');g.px(x,6,'w');part(g,7,7,x-3,y-3,p=>{star(p,1,1,'w');p.px(3,2,'W');p.px(4,4,'u');});}
  },{cat:'wall',layer:'wall',price:145,toggle:true,light:L(32,12,65,'warm',.75),twinkle:true});
  item('aurora_panel','極光燈畫',48,27,g=>{
    g.rect(1,1,46,25,'a');g.hl(2,1,44,'e');g.vl(1,2,23,'d');g.rect(3,3,42,21,'m');g.hl(3,3,42,'0');
    for(let x=4;x<44;x++){const y=7+Math.round(Math.sin(x*.15)*3);g.vl(x,y,5,'I');g.vl(x,y+3,3,'J');g.px(x,y+4,'K');if(x%3!==0)g.px(x,y+6,'p');}
    for(const [x,y]of [[8,5],[20,6],[35,4],[40,17],[12,16],[28,13]])g.px(x,y,'W');
    for(let x=4;x<44;x++){const top=19+Math.round(Math.sin(x*.32)*2);g.vl(x,top,24-top,'y');}g.hl(4,23,40,'0');g.hl(2,25,44,'b');g.px(2,24,'d');
  },{cat:'wall',layer:'wall',price:210,toggle:true,light:L(24,12,52,'cool',.8),twinkle:true});
  item('neon_cat','貓咪霓虹燈',30,27,g=>{
    g.rect(2,4,26,21,'y');g.cut(2,4,26,21,2);g.rect(3,5,24,18,'m');
    const tube=new Grid(28,25);tube.ellipse(14,14,10,8,'r');tube.ellipse(14,14,8,6,'m');
    tube.stamp(5,2,['s....','ss...','sts..','s.ss.']);tube.stamp(18,2,['....s','...ss','..sts','.ss.s']);tube.hl(7,13,3,'t');tube.hl(18,13,3,'t');tube.stamp(12,17,['s.s','.s.']);tube.hl(2,17,5,'s');tube.hl(21,17,5,'s');
    for(let x=5;x<22;x++)if(tube.get(x,7)==='r')tube.px(x,7,'t');g.paste(tube,1,0);g.rect(12,25,6,1,'a');g.px(4,6,'A');g.px(25,22,'z');
  },{cat:'wall',layer:'wall',price:165,toggle:true,light:L(15,14,42,'pink',.85)});
  item('jelly_lamp','水母氣氛燈',22,33,g=>{
    g.rect(5,29,12,2,'y');g.hl(7,29,8,'A');g.rect(9,19,4,10,'z');g.vl(10,20,8,'B');
    for(const [x,len]of [[4,8],[8,6],[13,9],[17,7]]){g.vl(x,17,len,'0');g.vl(x+1,17,len-1,'H');g.px(x+2,17+len,'s');}
    g.ellipse(11,12,9,10,'I');g.ellipse(10,11,8,8,'J');g.ellipse(9,10,6,6,'K');g.ellipse(8,8,3,3,'p');
    g.hl(3,16,16,'0');g.hl(3,15,16,'H');g.hl(5,14,12,'B');g.px(6,6,'W');g.px(7,5,'W');
  },{cat:'furniture',layer:'floor',price:185,toggle:true,light:L(11,12,47,'cool',.9),twinkle:true});
  item('moon_bunny','月兔燈',24,27,g=>{
    g.ellipse(12,13,10,11,'u');g.ellipse(11,12,9,10,'w');g.ellipse(9,10,7,8,'x');g.ellipse(16,9,6,7,'.');
    g.ellipse(8,7,2,2,'W');g.px(5,12,'u');g.px(6,16,'u');
    part(g,12,20,10,4,p=>{p.ellipse(6,13,5,5,'g');p.ellipse(5,11,4,4,'f');p.rect(3,1,2,9,'f');p.rect(8,2,2,8,'g');p.vl(4,3,5,'t');p.vl(8,4,4,'s');p.px(7,11,'0');p.px(8,13,'r');p.hl(3,16,5,'h');});
    g.rect(3,24,18,2,'b');g.hl(4,24,16,'e');
  },{price:120,toggle:true,light:L(12,13,40,'warm',.8)});
  item('disco_globe','星光舞球',26,32,g=>{
    g.vl(12,1,5,'0');g.px(13,2,'A');g.rect(10,5,6,2,'y');g.ellipse(13,18,11,11,'y');
    for(let y=8;y<28;y++)for(let x=3;x<23;x++){const dx=x+.5-13,dy=y+.5-18;if(dx*dx+dy*dy>99)continue;const seam=(x+1)%4===0||y%4===0;if(seam)g.px(x,y,'z');else g.px(x,y,x+y<24?['B','p','K'][Math.floor(x/4)%3]:['H','A','n'][Math.floor(y/4)%3]);}
    g.hl(8,10,3,'Z');g.hl(8,11,3,'Z');g.px(18,20,'W');g.px(19,21,'W');g.rect(10,29,6,1,'y');
  },{cat:'wall',layer:'wall',price:180,toggle:true,light:L(13,18,58,'pink',.75),twinkle:true});
  item('wall_sconce','黃銅壁燈',16,23,g=>{
    g.ellipse(8,16,4,6,'a');g.ellipse(7,15,3,5,'u');g.vl(7,12,7,'w');g.hl(7,18,5,'w');
    for(let y=3;y<12;y++){const x=4-Math.floor((y-3)/3);g.hl(x,y,16-x*2,'u');g.hl(x+1,y,13-x*2,'w');g.px(x+1,y,'x');}
    g.hl(2,11,12,'0');g.hl(3,12,10,'X');g.px(7,13,'W');g.px(7,3,'W');g.hl(5,21,6,'b');
  },{cat:'wall',layer:'wall',price:75,toggle:true,light:L(8,9,38,'warm',.8)});
  item('balloon_bouquet','生日氣球束',30,46,g=>{
    for(const [x,y,mid,lo,hi]of [[8,13,'s','r','t'],[22,13,'K','J','p'],[15,7,'H','G','B']]){
      line(g,x,y+10,15,40,'a');g.ellipse(x,y,6,9,'0');g.ellipse(x,y-1,5,7,'0');g.ellipse(x,y-1,5,7,lo);g.ellipse(x-1,y-2,4,6,mid);g.ellipse(x-2,y-4,1,2,hi);g.px(x,y+8,lo);g.hl(x-1,y+9,3,lo);
    }g.rect(11,41,8,3,'u');g.hl(12,41,6,'x');g.vl(14,41,3,'w');g.px(13,40,'r');g.px(16,40,'s');
  },{cat:'furniture',layer:'floor',price:95});
  item('gift_tower','緞帶禮物堆',31,29,g=>{
    const box=(x,y,w,h,mid,lo,hi,ribbon)=>part(g,w+2,h+2,x,y,p=>{p.rect(1,1,w,h,mid);p.vl(w-1,2,h-1,lo);p.hl(1,h,w,lo);p.hl(1,1,w,hi);p.hl(2,2,w-2,hi);p.hl(1,4,w,'0');p.rect(Math.floor(w/2),1,3,h,ribbon);p.vl(Math.floor(w/2),2,h-1,'f');for(let i=4;i<w-2;i+=6)p.px(i,h-2,hi);});
    box(1,16,27,10,'r','q','s','w');box(4,7,22,9,'J','I','K','t');box(8,1,15,7,'G','F','H','w');
    bow(g,13,0,'s','t');g.px(24,20,'f');g.px(25,20,'f');g.px(24,21,'h');
  },{cat:'furniture',layer:'floor',price:80});
  item('celebration_banner','派對彩帶',70,20,g=>{
    for(let x=2;x<68;x++)g.px(x,2+Math.round(Math.sin(x/69*Math.PI)*5),'0');
    const colors=[['s','r','t'],['K','J','p'],['H','G','B'],['w','u','x'],['o','n','p'],['r','q','s']];
    for(let i=0;i<6;i++){const x=4+i*10,y=4+Math.round(Math.sin(x/69*Math.PI)*5),[mid,lo,hi]=colors[i];part(g,9,10,x,y,p=>{for(let k=0;k<7;k++)p.hl(1+Math.floor(k/2),1+k,7-2*Math.floor(k/2),mid);p.hl(1,1,7,hi);line(p,7,2,4,7,lo);p.px(3,3,hi);});}g.px(2,3,'w');g.px(67,3,'w');
  },{cat:'wall',layer:'wall',price:65});
  item('wall_planter','壁掛綠意',23,31,g=>{
    line(g,5,18,11,2,'a');line(g,18,18,11,2,'a');g.px(11,1,'w');
    for(const [x,y,len,ang]of [[10,20,15,-1.9],[11,19,13,-1.1],[13,21,11,-.5],[9,21,10,-2.7]]){leaf(g,x,y,len,ang,2.5,['i','j','k','l']);}
    part(g,18,13,3,17,p=>{p.rect(1,1,16,3,'d');p.hl(2,1,14,'e');p.hl(1,3,16,'a');p.rect(3,4,12,7,'c');p.vl(3,4,7,'d');p.vl(14,4,7,'b');p.hl(4,10,10,'a');p.hl(6,6,6,'e');p.hl(6,8,6,'b');});
  },{cat:'wall',layer:'wall',price:85,react:'rustle'});
  item('constellation_clock','星軌時鐘',26,26,g=>{
    g.ellipse(13,13,12,12,'a');g.ellipse(12,12,11,11,'u');g.ellipse(12,12,10,10,'w');g.ellipse(13,13,9,9,'0');g.ellipse(13,13,8,8,'m');
    for(let i=0;i<12;i++){const a=i*Math.PI/6;g.px(Math.round(12.5+Math.sin(a)*7),Math.round(12.5+Math.cos(a)*7),'x');}g.px(7,8,'Z');g.px(18,14,'p');g.px(16,18,'K');line(g,13,13,13,7,'W');line(g,13,13,17,15,'w');g.px(13,13,'r');g.px(5,5,'W');g.px(6,4,'W');
  },{cat:'wall',layer:'wall',price:100});
  // Insets stay exactly aligned with the live outdoor scene and original hit boxes.
  const windowDef=(id,n,w,h,price,arch=false)=>item(id,n,w,h,g=>{
    for(let y=1;y<h-2;y++)for(let x=2;x<w-2;x++){const shape=!arch||y>=w/2||((x-w/2)**2+(y-w/2)**2)<(w/2-2)**2;if(shape)g.px(x,y,'b');}
    for(let y=4;y<h-5;y++)for(let x=4;x<w-4;x++){const hole=!arch||y>=w/2||((x-w/2)**2+(y-w/2)**2)<(w/2-4)**2;if(hole)g.px(x,y,'.');}
    g.vl(2,arch?Math.ceil(w/2):2,h-(arch?Math.ceil(w/2):2)-5,'e');g.vl(w-3,arch?Math.ceil(w/2):2,h-(arch?Math.ceil(w/2):2)-5,'a');
    const cx=w/2|0,cy=Math.round(h*.52);g.vl(cx-1,arch?4:3,h-9,'0');g.vl(cx,arch?4:3,h-9,'e');g.vl(cx+1,arch?4:3,h-9,'b');
    g.hl(4,cy-1,w-8,'0');g.hl(4,cy,w-8,'e');g.hl(4,cy+1,w-8,'a');
    if(id==='window_wide')for(const x of [Math.round(w/4),Math.round(w*3/4)]){g.vl(x,4,h-10,'b');g.vl(x-1,4,h-10,'0');g.vl(x+1,4,h-10,'e');}
    g.rect(1,h-5,w-2,3,'c');g.hl(2,h-5,w-4,'e');g.hl(2,h-2,w-4,'0');g.px(cx-3,cy+4,'w');g.px(cx-3,cy+5,'a');
    // Corner joinery and grain; only painted on solid timber.
    for(const y of [8,h-10]){g.px(3,y,'d');g.px(w-4,y,'a');}if(arch){for(let x=7;x<w-7;x++){const y=Math.round(w/2-Math.sqrt(Math.max(0,(w/2-2)**2-(x-w/2)**2)));if(g.get(x,y+1)!=='.')g.px(x,y+1,'e');}}
  },{cat:'wall',layer:'wall',price,window:{x:4,y:4,w:w-8,h:h-9,custom:true,arch}});
  windowDef('window_small','小方窗',24,28,65);windowDef('window_wide','橫幅景觀窗',72,42,175);windowDef('window_arch','拱形大窗',54,63,210,true);windowDef('window_tall','窄長落地窗',30,66,165);
  // Matching timber, upholstery and woven motifs, with original interaction anchors.
  const sets=[
    {id:'lantern_night',n:'燈籠團圓夜',desc:'朱紅織錦、月兔與胡桃木，留一盞燈等你。',wood:['a','b','c','e'],cloth:['q','r','s','x'],motif:'cloud',wall:['#f3dfc6','#e9c8a4','#b97c57','#653e34'],floor:['#a46e4b','#956043','#684737'],old:['rose_floral','wood_walnut'],view:'city',price:620},
    {id:'pumpkin_night',n:'南瓜魔法屋',desc:'雕花深木、紫絨與南瓜燈，今晚有點神祕。',wood:['Y','F','y','H'],cloth:['F','G','H','w'],motif:'moon',wall:['#57516c','#655e79','#a48aa5','#342d43'],floor:['#76604e','#675243','#443a38'],old:['studio_dark','wood_walnut'],view:'forest',price:640},
    {id:'birthday_room',n:'生日驚喜屋',desc:'奶油木作、緞帶床組與彩紙，今天好好慶祝。',wood:['a','h','g','f'],cloth:['r','s','t','f'],motif:'bow',wall:['#fff0df','#f4e0d2','#e7b8b5','#aa7479'],floor:['#efd7c4','#e2bdbc','#b4938e'],old:['lilac_check','checker_rose'],view:'city',price:580},
    {id:'aurora_study',n:'極光觀測室',desc:'星軌織毯、金屬包角與極光，陪你守候靈感。',wood:['0','m','n','p'],cloth:['I','J','K','p'],motif:'star',wall:['#343f59','#3b4b64','#738b9c','#222b40'],floor:['#657c88','#596d7c','#354557'],old:['studio_dark','concrete'],view:'snow',price:720},
    {id:'greenhouse',n:'陽光植感屋',desc:'藤編床頭、葉紋布料與綠釉花磚，慢慢呼吸。',wood:['a','b','d','e'],cloth:['i','j','k','l'],motif:'leaf',wall:['#f0ead7','#e3e7ce','#a9ba92','#6c8066'],floor:['#d6dec7','#c3cdb2','#7d9783'],old:['mint_dot','wood_birch'],view:'forest',price:600},
    {id:'winter_party',n:'冬日星光派對',desc:'雪花針織、紅綠格毯與燭光，把冬天留在窗外。',wood:['a','b','c','e'],cloth:['i','j','K','f'],motif:'snow',wall:['#e8eadf','#d4dece','#a8b8a0','#6d8075'],floor:['#a67e62','#8b674e','#59473f'],old:['winter_knit','plaid_carpet'],view:'snow',price:680},
  ];
  const mark=(g,x,y,type,c,hi)=>{
    if(type==='star')star(g,x,y,c);
    else if(type==='bow')bow(g,x,y,c,hi);
    else if(type==='leaf'){g.stamp(x,y,['...aa.','..abaa','.abaa.','aba...','a.....'].map(r=>r.replaceAll('a',c).replaceAll('b',hi)));}
    else if(type==='snow'){g.stamp(x,y,['a.a.a','.aaa.','aaaaa','.aaa.','a.a.a'].map(r=>r.replaceAll('a',c)));}
    else if(type==='moon'){g.stamp(x,y,['.aaa.','aa...','aa...','.aa..','..aaa'].map(r=>r.replaceAll('a',c)));}
    else {g.stamp(x,y,['..aa....','.abbaaa.','aaabbbba','.aaaaaa.'].map(r=>r.replaceAll('a',c).replaceAll('b',hi)));}
  };
  function bed(T){const g=new Grid(48,35),[wd,wm,wl,wh]=T.wood,[cd,cm,cl,ch]=T.cloth;
    g.rect(3,3,42,11,wm);g.hl(4,3,40,wh);g.hl(4,4,40,wl);g.rect(7,6,34,6,wd);g.rect(8,7,32,4,wl);
    for(const x of [2,43]){g.rect(x,2,3,14,wm);g.vl(x,3,12,wl);g.rect(x,1,3,2,wh);g.vl(x+2,4,11,wd);}
    if(T.motif==='leaf'){for(let x=9;x<40;x+=4){line(g,x,7,x+3,10,wm);line(g,x,10,x+3,7,wh);}}
    else {mark(g,20,6,T.motif,T.motif==='bow'?'r':T.motif==='moon'?'w':wd,wh);}
    g.rect(2,13,44,16,'h');g.hl(3,13,42,'f');g.vl(45,14,14,'g');
    for(const x of [6,27]){part(g,16,8,x,11,p=>{p.rect(1,1,14,6,'g');p.cut(1,1,14,6,1);p.rect(2,2,11,3,'f');p.hl(3,2,5,'Z');p.hl(3,5,9,'h');p.px(13,3,cl);});}
    g.rect(2,19,44,10,cd);g.rect(3,19,40,7,cm);g.vl(3,20,7,cl);g.hl(3,19,41,ch);g.hl(3,20,41,cl);g.vl(43,20,8,cd);g.hl(3,27,42,cd);g.hl(4,28,40,wd);
    if(T.motif==='snow'){for(let y=22;y<27;y+=2)for(let x=4;x<43;x+=4)g.px(x+(y%4===0?2:0),y,'f');g.hl(4,25,39,'r');}
    else {for(const x of [9,27])mark(g,x,22,T.motif,ch,cl);g.hl(5,26,36,cl);}
    g.rect(2,29,44,3,wm);g.hl(3,29,42,wl);g.hl(3,31,42,wd);g.rect(4,32,3,2,wd);g.rect(41,32,3,2,wd);
    if(T.motif==='moon'){g.px(5,2,'w');g.px(44,2,'w');}return edge(g);
  }
  function desk(T){const g=new Grid(42,26),[wd,wm,wl,wh]=T.wood;
    g.rect(1,1,40,6,wm);g.hl(2,1,38,wh);g.hl(2,2,38,wl);woodgrain(g,2,3,38,3,wd,wm,71,.08);g.hl(1,6,40,wd);
    g.rect(3,8,4,16,wm);g.vl(3,8,16,wl);g.vl(6,8,16,wd);g.hl(7,10,19,wd);g.hl(8,9,17,wl);
    g.rect(26,8,14,16,wm);g.vl(26,8,16,wl);g.vl(39,8,16,wd);
    for(const y of [8,14,20]){g.rect(28,y+1,10,4,wl);g.hl(28,y+1,10,wh);g.hl(28,y+4,10,wm);g.hl(27,y+5,12,'0');g.hl(31,y+2,4,wd);g.px(32,y+1,T.motif==='star'?'K':'w');}
    g.rect(27,24,3,1,wd);g.rect(36,24,3,1,wd);g.hl(3,24,4,wd);
    if(T.motif==='bow'){g.px(28,10,'r');g.px(37,10,'r');}
    if(T.motif==='star'){for(const x of [2,37]){g.rect(x,3,3,2,'z');g.px(x,3,'B');g.px(x+2,4,'0');}}
    if(T.motif==='leaf'){for(let x=29;x<37;x+=2)g.vl(x,16,2,wm);}
    if(T.motif==='moon'){g.hl(29,22,7,'G');g.px(33,22,'w');}return edge(g);
  }
  function chair(T){const g=new Grid(16,25),[wd,wm,wl,wh]=T.wood,[cd,cm,cl,ch]=T.cloth;
    g.rect(2,2,12,11,wm);g.cut(2,2,12,11,1);g.hl(4,2,8,wh);g.vl(2,4,8,wl);g.vl(13,4,8,wd);g.rect(4,4,8,7,cd);g.rect(5,5,6,4,cm);g.hl(5,5,6,cl);g.hl(5,10,6,cd);g.px(7,7,ch);
    if(T.motif==='leaf')for(let x=5;x<11;x+=2)g.vl(x,5,4,cl);
    if(T.motif==='bow'){g.px(6,6,'f');g.px(9,6,'f');g.hl(7,7,2,'f');}
    g.rect(2,13,12,3,cd);g.hl(2,13,12,cl);g.hl(3,14,10,cm);g.hl(2,16,12,'0');
    for(const x of [3,12]){g.vl(x,17,7,wm);g.vl(x+1,17,7,wd);}g.hl(5,21,7,wd);return edge(g);
  }
  function rug(T){const g=new Grid(58,22),[cd,cm,cl,ch]=T.cloth;
    g.ellipse(29,11,27,10,cd);g.ellipse(29,10,25,8,cl);g.ellipse(29,10,23,6,cm);g.ellipse(29,10,20,4,cd);g.ellipse(29,10,18,3,cm);
    for(let x=9;x<49;x+=3){if(g.get(x,4)!=='.')g.px(x,4,ch);if(g.get(x,17)!=='.')g.px(x,17,cl);}
    for(const x of [15,26,37])mark(g,x,7,T.motif,ch,cl);
    for(const x of [4,53])for(let y=8;y<15;y+=2)g.px(x,y,cl);return edge(g);
  }
  const wallPaint=(T,x,y)=>{const [bg,b2,accent,shadow]=T.wall,u=md(x,24),v=md(y,18);
    if(y>=54){if(y===54)return shadow;if(y===55)return accent;if(y===56)return bg;if(u===0||y===76)return shadow;if(u===2||u===21||y===59||y===73)return accent;return b2;}
    if(T.motif==='cloud'){const k=motif(x,y,26,22,['..aa....','.abbaaa.','aaabbbba','.aaaaaa.'],true);return k==='a'?accent:k==='b'?b2:bg;}
    if(T.motif==='moon'){const k=motif(x,y,28,25,['.aaa.','aa...','aa...','.aa..','..aaa'],true);return k?'#d7b779':hsh(x,y,11)%173===0?'#d9cadb':bg;}
    if(T.motif==='bow'){if(u===0)return b2;const k=motif(x,y,24,23,['aa.aa','.aaa.','..a..','.a.a.'],true);return k?accent:bg;}
    if(T.motif==='star'){const k=motif(x,y,32,26,['..a..','.aaa.','aaaaa','..a..','..a..'],true);return k?'#d6c6a2':hsh(x,y,29)%127===0?accent:bg;}
    if(T.motif==='leaf'){if(u===0)return b2;const k=motif(x,y,24,23,['...aa.','..abaa','.abaa.','aba...'],true);return k==='a'?accent:k==='b'?shadow:bg;}
    const k=motif(x,y,20,20,['a.a.a','.aaa.','aaaaa','.aaa.','a.a.a'],true);return k?accent:v===0?b2:bg;
  };
  const floorPaint=(T,x,y)=>{const [base,alt,seam]=T.floor;
    if(T.motif==='leaf'){const a=md(x,18),b=md(y,18);if(a===0||b===0)return seam;if(a===1||b===1)return '#f5efdb';if(Math.abs(a-9)+Math.abs(b-9)<3)return '#8aa58c';return (Math.floor(x/18)+Math.floor(y/18))%2?base:alt;}
    if(T.motif==='bow'){const a=md(x,16),b=md(y,16);if(a===0||b===0)return seam;return (Math.floor(x/16)+Math.floor(y/16))%2?base:alt;}
    const row=Math.floor(y/7),off=row%2*19,u=md(x+off,38),v=md(y,7);if(v===0||u===0)return seam;if(v===1)return base;if(T.motif==='star'&&u===3&&v===3)return '#b7ba9a';return hsh(Math.floor(x/3),row,12)%11===0?alt:base;
  };
  const accents={
    lantern_night:[['festival_lantern',63,21,{on:true}],['festival_lantern',167,21,{on:true}],['moon_bunny',131,111,{on:true}],['star_curtain',5,47,{on:true,wall:'left'}]],
    pumpkin_night:[['pumpkin_glow',134,116,{on:true}],['neon_cat',162,32,{on:true}],['gift_tower',155,140],['wall_sconce',7,55,{on:true,wall:'left'}]],
    birthday_room:[['balloon_bouquet',184,84],['celebration_banner',85,13],['gift_tower',151,143],['disco_globe',60,24,{on:true}],['star_curtain',213,49,{on:true,wall:'right'}]],
    aurora_study:[['aurora_panel',153,27,{on:true}],['jelly_lamp',132,109,{on:true}],['constellation_clock',55,28],['neon_cat',6,59,{on:true,wall:'left'}]],
    greenhouse:[['wall_planter',60,31],['wall_planter',166,30],['plant_monstera',137,103],['wall_planter',214,52,{wall:'right'}],['wall_sconce',7,51,{on:true,wall:'left'}]],
    winter_party:[['xmas_tree',157,53,{on:true}],['star_curtain',86,12,{on:true}],['gift_tower',149,142],['moon_bunny',131,111,{on:true}],['stocking',7,52,{wall:'left'}]],
  };
  for(const T of sets){
    T.keys={};for(const [base,paint]of [['bed',bed],['desk',desk],['chair',chair],['rug_round',rug]]){const id='a92_'+T.id+'_'+base;T.keys[base]=id;SPR.def(id,()=>paint(T));ITEMS[id]=Object.assign({},ITEMS[base],{id,n:T.n+'・'+({bed:'織紋床組',desk:'收納書桌',chair:'軟墊木椅',rug_round:'織花地毯'})[base],spr:id,map:null,lvl:2});}
    const wp='a92_'+T.id+'_wall',fl='a92_'+T.id+'_floor';WALL[wp]=(x,y)=>wallPaint(T,x,y);FLOOR[fl]=(x,y)=>floorPaint(T,x,y);WALLPAPERS[wp]={n:T.n+'・護牆花紋',price:120,lvl:2};FLOORS[fl]={n:T.n+'・地坪',price:120,lvl:2};
    TRIM[wp]={top:[T.wall[3],T.wall[2],T.wall[0]],base:[T.wall[2],T.wall[3],T.wall[3]]};
    const win=T.motif==='leaf'?['window_wide',84,22]:T.motif==='star'?['window_tall',105,18]:['window_arch',90,17];
    const layout=[win,[T.keys.bed,35,99],[T.keys.desk,155,99,{kids:[['laptop',5],['mug',29]]}],[T.keys.chair,167,111],[T.keys.rug_round,89,137],['pet_bowl',77,155],['litter_house',193,135],['cat_tree',86,105],...accents[T.id]];
    const grants=[];for(const [k,,,o={}]of layout){grants.push(k);for(const [ck]of o.kids||[])grants.push(ck);}
    THEMES[T.id]={n:T.n,desc:T.desc,wp,fl,view:T.view,price:T.price,lvl:2,grants,layout};
  }
  // Existing owners receive matching furnishings once; occupied anchors/UIDs are retained.
  const load=Game.load.bind(Game);Game.load=function(snapshot){const r=load(snapshot),S=this.S;if(this.outdated||S.flags.art092Ink)return r;
    const current=sets.find(T=>S.themes.includes(T.id)&&S.wp===T.old[0]&&S.fl===T.old[1]);
    if(current){for(const it of S.items)if(current.keys[it.k])it.k=current.keys[it.k];S.wp=THEMES[current.id].wp;S.fl=THEMES[current.id].fl;}
    for(const T of sets)if(S.themes.includes(T.id)){const th=THEMES[T.id];if(!S.ownWP.includes(th.wp))S.ownWP.push(th.wp);if(!S.ownFL.includes(th.fl))S.ownFL.push(th.fl);for(const k of Object.values(T.keys)){if(!(S.inv[k]>0)&&!S.items.some(it=>it.k===k))S.inv[k]=1;}}
    S.flags.art092Ink=true;return r;
  };
})();

/* Full asset audit: handcrafted material passes and family redraws, all native pixels. */
const ArtPolish={changed:new Set(),surfaces:new Set(),protected:n=>/^(body_|head_|cat_(?!tree$)|dog_)/.test(n)};
(function(){
 const A=ArtPolish,ink='0',prevLeaf=leaf;
 const register=(name,paint)=>{if(A.protected(name)||!SPR.defs[name])return;const old=SPR.grid(name),w=old.w,h=old.h;SPR.def(name,()=>{const g=new Grid(w,h);paint(g,w,h);return g.outline(ink)});A.changed.add(name);for(const key in SPR.cache)if(key.startsWith(name+'|'))delete SPR.cache[key];};
 const patch=(name,paint)=>{if(A.protected(name)||!SPR.defs[name])return;const old=SPR.grid(name).clone();register(name,(g,w,h)=>{g.paste(old,0,0);paint(g,w,h)});};
 const part=(g,w,h,x,y,fn)=>{const p=new Grid(w,h);fn(p);g.paste(p.outline(ink),x,y)};
 const bevel=(g,x,y,w,h,fill='c',hi='d',shadow='a')=>{g.rect(x,y,w,h,fill);g.hl(x,y,w,hi);g.vl(x,y,h,hi);g.hl(x,y+h-1,w,shadow);g.vl(x+w-1,y,h,shadow)};
 const grain=(g,x,y,w,h,fill='c',shade='b',light='d',seed=17)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)if(g.get(i,j)===fill){const q=hsh(Math.floor(i/5),j,seed);if(q%19===0&&i%5!==4)g.px(i,j,shade);else if(q%47===0&&i%5<3)g.px(i,j,light);}};
 const drawer=(g,x,y,w,h,metal='w')=>{bevel(g,x,y,w,h,'c','d','a');g.hl(x+2,y+1,w-4,'e');if(h>=6)g.hl(x+1,y+h-2,w-2,'b');const cx=x+(w/2|0);g.hl(cx-2,y+(h/2|0),4,'a');g.px(cx-1,y+(h/2|0)-1,metal);};
 const stitch=(g,x,y,w,h,mid='n',hi='o')=>{for(let i=x+2;i<x+w-2;i+=3){if(g.get(i,y)!=='.')g.px(i,y,hi);if(g.get(i,y+h-1)!=='.')g.px(i,y+h-1,mid);}};
 const round=(g,x,y,w,h,mid,lo,hi)=>{g.rect(x,y,w,h,mid);g.cut(x,y,w,h,1);g.hl(x+1,y,w-2,hi);g.vl(x,y+1,h-2,hi);g.hl(x+1,y+h-1,w-2,lo);g.vl(x+w-1,y+1,h-2,lo);};
 // Individual leaves overlap as layered pieces; pots get glazed rims, soil and curvature.
 const polishedLeaf=function(g,x,y,len,angle,width,ramp,opts={}){const p=new Grid(g.w,g.h);prevLeaf(p,x,y,len,angle,width,ramp,opts);if(len>=7){for(let t=.28;t<.82;t+=.24){const bx=x+Math.cos(angle)*len*t,by=y+Math.sin(angle)*len*t;for(const side of [-1,1]){const ex=Math.round(bx+Math.cos(angle+side*.9)*width),ey=Math.round(by+Math.sin(angle+side*.9)*width);if(p.get(ex,ey)!=='.')p.px(ex,ey,ramp[2]);}}}g.paste(p,0,0);};
 potIn=function(g,cx,top,w,h,P){const [lo,mid,hi,shine]=P.r,x=Math.round(cx-w/2),bottom=top+h-1;g.ellipse(cx,bottom,w*.38,1,lo);
   for(let y=top+2;y<bottom;y++){const inset=1+Math.floor((y-top-2)*1.5/Math.max(1,h-3)),left=x+inset,right=x+w-inset-1;g.hl(left,y,right-left+1,mid);g.px(left,y,hi);g.px(right,y,lo);if(right-left>5)g.px(left+1,y,hi);if(P.weave)for(let xx=left+2;xx<right;xx++)if((xx+y*2)%4===0)g.px(xx,y,lo);}
   g.ellipse(cx,top+1,w/2,2,lo);g.ellipse(cx,top,w/2-1,1,hi);g.hl(x+2,top+1,w-4,mid);g.hl(x+3,top+1,w-6,'a');g.px(x+2,top,shine);g.px(x+3,top,shine);g.hl(x+3,bottom,w-6,lo);
 };
 for(const name of Object.keys(SPR.defs))if(name.startsWith('pl_')){const match=/^pl_(.+)_([^_]+)$/.exec(name),plant=match&&PLANTS[match[1]],pot=match&&POTS[match[2]];if(plant&&pot)register(name,g=>{const saved=leaf;leaf=polishedLeaf;try{plant.draw(g,pot)}finally{leaf=saved}});}
 for(const name of Object.keys(SPR.defs))if(name.startsWith('fv_')){const m=/^fv_(.+)_(bud|jar|bottle)$/.exec(name);if(!m)continue;register(name,g=>{
   const type=m[1],vase=m[2],r=vase==='jar'?['m','n','o','p']:['h','g','f','Z'];
   line(g,6,14,4,5,'i');line(g,6,13,9,3,'j');line(g,6,13,6,2,'i');g.px(4,10,'k');g.px(8,8,'k');
   const head=(x,y)=>{if(type==='euca'){g.ellipse(x,y,2,1.4,'J');g.px(x-1,y-1,'K');}
    else if(type==='lav'){g.vl(x,y,5,'G');g.px(x-1,y+1,'H');g.px(x+1,y+3,'B');}
    else if(type==='rose'){g.stamp(x-2,y-2,['.rr.','rstr','rqsr','.qq.']);}
    else if(type==='sun'){g.stamp(x-2,y-2,['.ww.','wabw','waaw','.vv.']);}
    else if(type==='tulipY'){g.stamp(x-2,y-2,['w.w.','wxww','.vv.']);}
    else if(type==='gyp'){g.stamp(x-2,y-2,['f.f..','.f.f.','f.f.f','...f.']);}
    else if(type==='sakura'){g.stamp(x-2,y-2,['.t.t.','tssst','.tst.','..t..']);}
    else {g.stamp(x-2,y-2,['..f..','.fgf.','ffwff','.fgf.','..f..']);}};
   for(const [x,y]of [[4,6],[9,4],[6,3]])head(x,y);
   if(vase==='bottle'){g.rect(5,12,3,3,'I');g.hl(5,12,3,'K');round(g,4,15,5,6,'K','J','p');g.vl(5,16,3,'f');g.hl(5,19,3,'J');}
   else {g.rect(5,12,3,2,r[0]);g.hl(5,12,3,r[2]);g.ellipse(6.5,17,vase==='jar'?4.5:3,3.4,r[0]);g.ellipse(6,16,vase==='jar'?3.5:2,2.5,r[1]);g.vl(vase==='jar'?3:4,15,3,r[2]);g.px(5,15,r[3]);g.hl(4,20,5,r[0]);}
  });}
 // Upholstery has rolled edges, inset cushions, piping and tufting, not flat slabs.
 for(const [name,cfg]of Object.entries({ac_club:{seat:12},ac_wing:{seat:17},ac_pouf:{seat:3},sf_love:{seat:10},sf_chester:{seat:10}}))register(name,(g,w,h)=>{
   if(name==='ac_pouf'){g.ellipse(w/2,7,w/2-1,5,'m');g.ellipse(w/2,5,w/2-2,3,'n');g.ellipse(w/2-1,4,w/2-4,2,'o');for(let x=4;x<w-2;x+=4){g.vl(x,7,3,'m');g.px(x,5,'p');}return;}
   const sy=cfg.seat;round(g,3,1,w-6,sy+1,'n','m','o');g.hl(5,2,w-10,'p');g.hl(5,sy-1,w-10,'m');
   const seats=w>35?2:1,inner=w-12,sw=Math.floor(inner/seats);for(let i=0;i<seats;i++){part(g,sw+1,7,6+i*sw,sy-1,p=>{round(p,1,1,sw-1,5,'o','m','p');p.hl(3,2,Math.max(1,sw-6),'p');p.hl(3,5,Math.max(1,sw-5),'n');});}
   for(let x=8;x<w-6;x+=6){g.px(x,5,'m');g.px(x+1,4,'o');if(name==='sf_chester')g.px(x+2,7,'m');}
   part(g,7,h-sy+3,0,sy-3,p=>{round(p,1,1,5,h-sy-2,'n','m','o');p.hl(2,2,3,'p');});part(g,7,h-sy+3,w-7,sy-3,p=>{round(p,1,1,5,h-sy-2,'n','m','o');p.hl(2,2,3,'o');});
   g.rect(2,h-5,w-4,2,'m');g.hl(3,h-5,w-6,'n');g.rect(3,h-3,2,2,'a');g.rect(w-5,h-3,2,2,'a');
 });
 for(const name of ['beanbag','cushion','zabuton','sm_floor_pillow','sm_cushion_heart','m_donut_pouf','m_knit_pouf','m_round_bed'])patch(name,(g,w,h)=>{const c=g.get(w/2|0,h/2|0);stitch(g,1,2,w-2,h-4,'q',c==='.'?'t':'f');for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++)if(['s','o','r','n'].includes(g.get(x,y))&&hsh(x,y,6)%43===0)g.px(x,y,['s','r'].includes(g.get(x,y))?'t':'p');});
 for(const [key,C]of Object.entries(CHAIRS))register('ch_'+key,(g,w,h)=>{C.draw(g);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const k=g.get(x,y);if(k==='c'&&g.get(x-1,y)==='0')g.px(x,y,'d');if(k==='y'&&g.get(x-1,y)==='.')g.px(x,y,'A');}if(key==='shell'){g.vl(7,6,5,'n');g.vl(11,6,5,'n');}if(!['stool','bar'].includes(key)){g.px(5,2,'e');g.px(w-5,2,'e');}g.hl(3,C.seatY+2,w-6,'m');});
 // Full furniture joinery: recessed drawers, brass pulls, leg shadows and grain.
 for(const [key,T]of Object.entries(TABLES))register('tb_'+key,(g,w,h)=>{T.draw(g);grain(g,2,2,w-4,Math.min(5,h-2),'d','c','e',12);if(key==='writing'){drawer(g,27,6,10,4);drawer(g,27,10,10,3);}if(key==='square_side')drawer(g,3,5,12,6);if(key==='pedestal'){g.vl(5,6,h-9,'e');g.vl(8,7,h-11,'b');}for(let y=5;y<h-1;y++)for(let x=1;x<w-1;x++)if(g.get(x,y)==='c'&&g.get(x-1,y)==='.')g.px(x,y,'d');});
 for(const [key,T]of Object.entries(STORAGE))register('st_'+key,(g,w,h)=>{T.draw(g);grain(g,2,2,w-4,h-4);if(key!=='ladder'){g.hl(2,1,w-4,'e');g.hl(2,3,w-4,'0');}
  if(key==='dresser'){for(const y of [5,10,15,20])drawer(g,4,y,w-8,4);}
  if(key==='tall'){for(const x of [4,12]){bevel(g,x,6,6,21,'c','d','b');g.px(x+3,17,'w');}drawer(g,4,30,14,5);drawer(g,4,37,14,4);}
  if(key==='tv_stand'){for(const x of [4,32]){bevel(g,x,5,10,7,'c','d','a');g.px(x+5,8,'w');}}
  if(key==='cube'){bevel(g,17,5,9,8,'c','d','a');g.px(21,8,'w');g.hl(3,15,24,'0');}
  if(key==='sideboard')for(const x of [4,17,30]){g.px(x+4,7,'a');g.px(x+4,6,'w');}
 });
 for(const name of ['nightstand','cabinet_low','wardrobe','shelf_wall','bookshelf','vinyl_shelf','m_old_trunk'])patch(name,(g,w,h)=>{grain(g,2,2,w-4,h-4);if(name==='nightstand'){drawer(g,4,6,12,6);drawer(g,4,13,12,6);}if(name==='cabinet_low')for(const x of [4,17,30]){bevel(g,x,7,9,9,'c','d','a');g.px(x+5,11,'w');}if(name==='wardrobe')for(const x of [4,19]){bevel(g,x,6,13,h-12,'c','d','a');g.vl(x+3,9,h-19,'b');g.px(x+9,27,'w');}if(name==='m_old_trunk'){g.rect(3,4,2,h-7,'u');g.rect(w-6,4,2,h-7,'u');g.hl(3,4,2,'w');g.hl(w-6,4,2,'w');g.rect(w/2-2,7,4,5,'a');g.px(w/2,8,'w');}});
 for(const [key,T]of Object.entries(BEDS))register('bd_'+key,(g,w,h)=>{T.draw(g);grain(g,1,1,w-2,h-2);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++)if(g.get(x,y)==='o'&&x>18&&y%3===0&&x%5===0)g.px(x,y,'p');if(key==='canopy'){for(const x of [2,47]){g.vl(x,4,24,'q');g.vl(x+1,5,21,'s');g.px(x+1,19,'w');}g.hl(2,1,w-4,'e');}if(key==='bunk'){g.hl(2,15,w-4,'d');g.hl(2,16,w-4,'a');g.vl(3,2,h-4,'d');}if(key==='single'){g.rect(2,3,5,16,'b');g.vl(3,4,13,'e');g.hl(2,4,5,'d');}g.hl(3,h-5,w-6,'d');});
 register('cat_tree',(g,w,h)=>{g.rect(2,43,22,3,'y');g.hl(3,43,20,'H');g.hl(3,45,20,'0');g.rect(8,10,5,32,'h');g.vl(8,11,30,'f');g.vl(12,11,30,'a');for(let y=13;y<42;y+=3)g.hl(9,y,3,'c');
  part(g,19,7,4,3,p=>{p.ellipse(9,3,8,2,'G');p.hl(3,2,12,'H');p.hl(4,3,10,'B');p.hl(2,5,14,'F');});
  part(g,15,6,11,24,p=>{p.rect(1,1,13,3,'G');p.hl(2,1,11,'H');p.hl(3,2,9,'B');p.hl(2,4,11,'F');});g.rect(19,29,3,13,'h');g.vl(21,29,13,'b');for(let y=31;y<42;y+=3)g.hl(19,y,2,'c');g.vl(17,11,7,'a');g.ellipse(17,19,2,2,'r');g.px(16,18,'t');});
 // Rewoven rugs with consistent borders, embroidery and separate fringe pixels.
 for(const name of Object.keys(SPR.defs))if(/^rg_/.test(name)){const m=/^rg_(.+)_([^_]+)$/.exec(name);if(!m||!RUG_SHAPES[m[1]])continue;register(name,(g,w,h)=>{const S=RUG_SHAPES[m[1]],pk=m[2],inside=(x,y)=>S.inside(x,y,w,h);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){if(!inside(x,y))continue;let d=4;for(let k=1;k<5;k++)if(!inside(x-k,y)||!inside(x+k,y)||!inside(x,y-k)||!inside(x,y+k)){d=k;break;}let c=d===1?'m':d===2?'p':'o';
   if(d>=3){if(pk==='checker')c=(Math.floor(x/4)+Math.floor(y/3))%2?'o':'n';else if(pk==='diamond'){const v=Math.abs(md(x-2,12)-6)+Math.abs(md(y,8)-4)*1.5;c=v<2?'p':v<3?'m':'o';}else if(pk==='rings'){const v=((x-w/2)/(w/2))**2+((y-h/2)/(h/2))**2;c=v<.15?'n':v<.3?'p':'o';}else if(pk==='stripe')c=Math.floor(x/4)%2?'o':'n';else c=(md(x+y,10)===0||md(x-y,10)===0)?'n':'o';}
   if(d===2&&(x+y)%3===0)c='f';g.px(x,y,c);}
   if(pk==='fringe')for(let y=2;y<h-2;y+=2){g.hl(0,y,2,'f');g.hl(w-2,y,2,'h');}
  });}
 const picture=(g,kind,x,y,w,h)=>{const px=(a,b,c)=>g.px(x+Math.round(a),y+Math.round(b),c),rect=(a,b,ww,hh,c)=>g.rect(x+Math.round(a),y+Math.round(b),Math.round(ww),Math.round(hh),c);
  rect(0,0,w,h,'f');
  if(kind==='sunset'){for(let j=0;j<h;j++)rect(0,j,w,1,j<h*.2?'G':j<h*.4?'s':j<h*.58?'v':j<h*.68?'u':'n');g.ellipse(x+Math.floor(w*.63),y+Math.floor(h*.52),3,3,'x');for(let j=Math.ceil(h*.65);j<h;j+=2)for(let i=1;i<w-1;i+=5){rect(i+(j%3),j,3,1,'o');}for(let j=Math.ceil(h*.7);j<h-1;j+=2)rect(w*.6-2+(j%2),j,4,1,'w');}
  else if(kind==='mountain'){rect(0,0,w,h,'p');for(let i=0;i<w;i++){const y1=Math.round(h*.25+Math.abs(i-w*.3)*.9),y2=Math.round(h*.45+Math.abs(i-w*.72)*.7);if(y1<h){rect(i,y1,1,h-y1,i<w*.3?'z':'y');rect(i,y1,1,2,'Z');}if(y2<h){rect(i,y2,1,h-y2,i<w*.72?'A':'z');rect(i,y2,1,2,'f');}}for(let i=0;i<w;i++)rect(i,h-3+Math.round(Math.sin(i*.5)),1,3,i%3?'i':'j');}
  else if(kind==='city'){rect(0,0,w,h,'m');for(let i=0;i<w;i+=4){const bh=5+hsh(i,2)%Math.max(6,h-5);rect(i,h-bh,3,bh,'y');rect(i,h-bh,3,1,'z');for(let j=h-bh+2;j<h-2;j+=3)px(i+1,j,hsh(i,j)%3?'w':'n');}g.ellipse(x+5,y+4,2,2,'x');rect(0,h-2,w,2,'0');for(let i=1;i<w;i+=4)px(i,h-1,'r');}
  else if(kind==='catmoon'){rect(0,0,w,h,'m');g.ellipse(x+w-6,y+6,4,4,'w');g.ellipse(x+w-4,y+5,3,3,'m');for(const [a,b]of [[3,3],[8,5],[w-3,12],[5,9]])px(a,b,'p');g.stamp(x+3,y+h-10,['Y...Y','YY.YY','YYYYY','YYYYY','.YYYY','.YYYYYY','..YYYYY.Y']);rect(0,h-2,w,2,'Y');px(4,h-9,'z');}
  else if(kind==='rainbow'){rect(0,0,w,h,'p');for(let i=0;i<6;i++)for(let k=0;k<65;k++){const a=k*Math.PI/64,r=w*.42-i;px(w/2+Math.cos(a)*r,h-3-Math.sin(a)*r*.75,['r','v','w','k','o','G'][i]);}for(const cx of [4,w-4]){g.ellipse(x+cx,y+h-4,4,2,'g');g.ellipse(x+cx-1,y+h-5,3,2,'Z');}}
  else if(kind==='leaf'){rect(0,0,w,h,'g');leaf(g,x+(w/2|0),y+h-3,h-5,-1.57,Math.max(2,w*.24),GREEN);for(let i=3;i<w-3;i++)if(i%3===0)px(i,h-2,'h');}
  else if(kind==='lemon'){rect(0,0,w,h,'K');g.ellipse(x+w/2,y+h*.56,6,5,'u');g.ellipse(x+w/2-1,y+h*.52,5,4,'w');g.ellipse(x+w/2-2,y+h*.45,2,1.2,'x');leaf(g,x+w/2,y+h*.33,6,-.55,1.8,GREEN);px(w/2+5,h*.6,'v');}
  else if(kind==='sakura'){rect(0,0,w,h,'g');line(g,x+2,y+h-2,x+w-3,y+3,'a');line(g,x+6,y+h/2,x+2,y+6,'b');for(const [dx,dy]of [[w-4,3],[w-6,7],[3,6],[5,10],[w-7,12],[8,15]])g.stamp(x+dx-1,y+dy-1,['.t.','tst','.r.']);}
  else if(kind==='whale'){rect(0,0,w,h,'p');for(let j=(h*.63|0);j<h;j++)for(let i=0;i<w;i++)px(i,j,j%3===0?'n':(i+j)%8<2?'p':'o');g.ellipse(x+w*.43,y+h*.5,7,3.2,'m');g.ellipse(x+w*.4,y+h*.45,6,2,'n');g.stamp(x+(w*.43|0)+6,y+(h*.5|0)-3,['m.m','.mm']);px(w*.43-4,h*.5-1,'Z');rect(w*.43-4,h*.5+2,7,1,'p');px(w*.43-1,h*.5-5,'n');px(w*.43,h*.5-6,'n');}
  else if(kind==='still'){rect(0,0,w,h,'g');rect(0,h-6,w,6,'c');rect(0,h-6,w,1,'a');g.ellipse(x+w/2+1,y+h-4,5,1,'b');g.ellipse(x+w/2,y+h-9,4,4,'m');g.ellipse(x+w/2-1,y+h-10,3,3,'o');rect(w/2-2,h-13,4,2,'p');for(const [dx,dy,c]of [[-4,6,'r'],[0,4,'w'],[4,7,'s'],[-2,9,'G']]){line(g,x+w/2,y+h-13,x+w/2+dx,y+dy,'i');g.ellipse(x+w/2+dx,y+dy,2,2,c);px(w/2+dx-1,dy-1,'t');}}
  else if(kind==='geo'){rect(0,0,w,h,'g');g.ellipse(x+w-5,y+5,3,3,'w');for(let j=0;j<9;j++)rect(w*.5-j*.65,5+j,j*1.3+1,1,j%2?'M':'N');rect(2,h-8,w-4,6,'n');rect(2,h-8,w-4,1,'o');for(let i=3;i<w-3;i+=5)rect(i,h-5,3,1,'p');}
  else {rect(0,0,w,h,'f');g.ellipse(x+w*.34,y+h*.35,5,5,'r');g.ellipse(x+w*.34-1,y+h*.35-1,4,4,'s');g.ellipse(x+w*.64,y+h*.63,6,5,'u');g.ellipse(x+w*.64-1,y+h*.63-1,5,4,'w');g.ellipse(x+w*.28,y+h*.78,3,3,'J');rect(w*.57,3,4,6,'n');rect(w*.57,3,4,1,'o');}
 };
 for(const [ak,T]of Object.entries(ART)){
  for(const fk of Object.keys(FRAMES))register('art_'+ak+'_'+fk,(g,w,h)=>{const [hi,mid,lo]=FRAMES[fk].c;g.rect(0,0,w,h,'0');g.rect(1,1,w-2,h-2,mid);g.hl(1,1,w-2,hi);g.vl(1,1,h-2,hi);g.hl(1,h-2,w-2,lo);g.vl(w-2,1,h-2,lo);picture(g,ak,2,2,w-4,h-4);g.px(1,1,'f');g.px(w-2,h-2,lo);});
  register('poster_'+ak,(g,w,h)=>{g.rect(0,0,w,h,'h');g.hl(1,0,w-2,'f');picture(g,ak,1,1,w-2,h-2);g.px(0,0,'b');g.px(w-1,0,'b');g.px(w-1,h-1,'g');});
 }
 for(const [name,r]of Object.entries({clk_black:['Y','y','z'],clk_mint:['i','j','l'],clk_pink:['q','r','t'],clk_white:['A','B','Z'],clk_wood:['a','c','e']}))register(name,g=>{g.ellipse(8.5,8.5,8,8,r[0]);g.ellipse(8,8,7,7,r[1]);g.ellipse(8.5,8.5,6,6,'h');g.ellipse(8,8,5,5,'f');g.px(3,3,r[2]);g.px(4,2,r[2]);for(let k=0;k<12;k++){const a=k*Math.PI/6;g.px(Math.round(8+Math.sin(a)*4.8),Math.round(8-Math.cos(a)*4.8),k%3?'h':'a');}});
 for(const name of Object.keys(SPR.defs))if(/^mr_/.test(name))patch(name,(g,w,h)=>{const gold=name.endsWith('gold');for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const k=g.get(x,y);if(k==='g'&&x+y<Math.max(w,h))g.px(x,y,'p');if(k==='f'&&x+y<Math.max(w,h)-2)g.px(x,y,'Z');}g.px(Math.floor(w*.35),Math.floor(h*.35),'Z');if(gold)g.px(3,3,'x');});
 // Lamp heads are redrawn as volumes; stems retain the live light's original anchor.
 const shade=(g,cx,top,w,h,style,on)=>{const hi=on?'W':'f',mid=on?'X':'g',lo=on?'w':'h';for(let y=0;y<h;y++){const span=style==='drum'?w/2:style==='dome'?Math.sqrt(Math.max(0,1-((h-y)/h)**2))*w/2:Math.min(w/2,w*.22+y*w*.28/h),left=Math.round(cx-span),right=Math.round(cx+span);g.hl(left,top+y,right-left+1,mid);g.px(left,top+y,hi);g.px(right,top+y,lo);if(style!=='dome'&&y>1)for(let x=left+3;x<right-1;x+=4)g.px(x,top+y,lo);}g.hl(Math.round(cx-w/2),top+h,w+1,'0');g.hl(Math.round(cx-w/2)+1,top+h+1,w-1,lo);};
 for(const [kind,T]of Object.entries(FLOOR_LAMPS))for(const on of [false,true])register('lf_'+kind+(on?'_on':''),(g,w,h)=>{const cx=w/2|0;
  if(kind==='arc'){g.rect(2,h-5,9,3,'y');g.hl(3,h-5,7,'A');g.rect(5,16,2,h-21,'y');g.vl(5,18,h-24,'A');line(g,6,16,11,6,'A');line(g,11,6,20,4,'A');g.hl(13,4,8,'z');shade(g,21,6,9,5,'dome',on);}
  else {if(kind==='tripod'){line(g,cx,13,3,h-3,'b');line(g,cx,13,w-4,h-3,'b');line(g,cx+1,15,cx+1,h-4,'a');}else{g.rect(cx-1,12,2,h-18,'b');g.vl(cx-1,13,h-20,'w');g.ellipse(cx,h-4,5,1.5,'y');g.hl(cx-3,h-5,6,'A');}
   if(kind==='globe'){g.ellipse(cx,6,5,5,on?'w':'h');g.ellipse(cx-1,5,4,4,on?'X':'g');g.ellipse(cx-2,3,2,1,on?'W':'f');}
   else shade(g,cx,2,w-5,8,kind==='drum'?'drum':'bell',on);}
 });
 for(const [kind,T]of Object.entries(TABLE_LAMPS))for(const on of [false,true])register('lt_'+kind+(on?'_on':''),(g,w,h)=>{
  const cx=w/2|0;g.ellipse(cx,h-3,Math.min(4,cx-1),1.5,'a');g.hl(cx-2,h-4,4,'d');g.rect(cx-1,8,2,h-11,'u');g.vl(cx-1,9,h-13,'w');
  if(kind==='ball'){g.ellipse(cx,6,5,5,on?'w':'h');g.ellipse(cx-1,5,4,4,on?'X':'g');g.ellipse(cx-2,3,1.6,1.4,on?'W':'f');}
  else if(kind==='tiffany'){for(let y=2;y<9;y++){const hw=2+(y-2);for(let x=Math.max(1,cx-hw);x<Math.min(w-1,cx+hw);x++)g.px(x,y,x%4===0||y%3===0?'a':['r','w','J','n'][Math.floor(x/3)%4]);}g.hl(2,9,w-4,'u');g.px(7,2,'w');}
  else {shade(g,cx,2,w-5,kind==='cyl'?6:5,kind==='cyl'?'drum':kind==='dome'?'dome':'bell',on);if(kind==='cyl'){g.ellipse(cx,12,3,3,'n');g.ellipse(cx-1,11,2,2,'o');g.px(cx-1,10,'p');}}
 });
 for(const [kind,T]of Object.entries(SCONCES))for(const on of [false,true])register('ls_'+kind+(on?'_on':''),(g,w,h)=>{T.draw(g);const map=on?{g:'X',f:'W',h:'w'}:{};const p=g.recolor(map);g.a=p.a;if(kind==='brass'){g.hl(3,13,4,'w');g.px(4,3,on?'W':'Z');}if(kind==='flower')g.px(7,6,'w');if(kind==='shell')for(let x=3;x<w-2;x+=2)g.px(x,8,'u');});
 for(const name of ['lamp_floor','lamp_floor_on','desk_lamp','paper_lantern','paper_lantern_on','m_moon_lamp','moon_lamp','moon_lamp_on','m_candelabra','m_star_mobile'])patch(name,(g,w,h)=>{if(name.startsWith('lamp_floor')){g.rect(0,0,w,15,'.');shade(g,w/2|0,2,w-5,8,'bell',name.endsWith('_on'));g.px(7,37,'w');}else if(name.startsWith('paper_lantern')){g.vl(4,4,h-10,'e');for(let y=6;y<h-4;y+=5)g.hl(5,y,w-10,'b');g.hl(3,h-4,w-6,'a');}else if(name==='desk_lamp'){g.px(4,6,'K');g.hl(3,h-3,6,'J');}else if(name.includes('moon_lamp')){g.px(4,4,'W');g.px(3,8,'u');g.hl(4,h-3,Math.max(2,w-9),'u');}});
 // Appliances and toys: distinct controls, glass glints, seams and grounded bases.
 register('fun_fridge',(g,w,h)=>{round(g,2,1,w-4,h-3,'J','I','K');bevel(g,3,2,w-7,9,'K','p','J');g.hl(3,12,w-7,'0');g.rect(3,14,w-7,h-18,'K');g.vl(w-4,15,h-20,'J');g.rect(w-8,4,2,5,'I');g.px(w-8,4,'p');g.rect(w-8,17,2,7,'I');g.px(w-8,17,'p');g.rect(5,4,4,3,'f');g.px(6,5,'r');g.rect(4,h-3,3,1,'0');g.rect(w-7,h-3,3,1,'0');});
 register('fun_coffee_machine',(g,w,h)=>{bevel(g,1,1,w-2,h-2,'y','A','0');g.hl(2,2,w-4,'B');g.rect(3,4,8,6,'0');g.rect(4,4,5,2,'b');g.px(10,3,'K');g.rect(5,9,4,3,'f');g.px(9,10,'g');g.hl(3,13,8,'z');g.px(4,13,'B');g.px(7,13,'B');g.hl(3,14,8,'0');});
 register('fun_arcade',(g,w,h)=>{bevel(g,2,1,w-4,h-2,'G','H','F');g.rect(4,3,w-8,4,'m');g.hl(6,4,w-12,'w');g.rect(4,9,w-8,14,'0');g.rect(5,10,w-10,11,'m');g.px(7,12,'W');g.px(12,14,'w');g.hl(7,18,6,'o');g.rect(3,23,w-6,5,'y');g.hl(4,23,w-8,'z');g.rect(5,24,2,2,'r');g.px(12,25,'w');g.px(15,25,'K');g.rect(8,32,7,4,'0');g.hl(9,33,4,'z');g.hl(3,h-3,w-6,'0');});
 for(const name of ['fun_aquarium','fishbowl','sm_snowglobe','sm_terrarium','m_moss_dome','sm_perfume','sm_diffuser','sm_candle_jar','m_candy_jar'])patch(name,(g,w,h)=>{for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){const k=g.get(x,y);if((k==='B'||k==='A'||k==='p'||k===',')&&x===3&&y<Math.min(h-4,9))g.px(x,y,'Z');}if(name==='fun_aquarium'){g.hl(3,2,w-6,'B');g.hl(3,h-9,w-6,'a');g.vl(3,4,h-15,'p');g.rect(6,6,1,3,'Z');g.hl(3,h-3,w-6,'a');g.px(6,h-5,'w');g.px(w-7,h-5,'w');}});
 for(const name of ['fun_piano','m_gramophone','m_sewing_machine','sm_typewriter','m_loom','m_telescope','m_stall','m_icecream_cart','m_cat_condo','m_dog_house','m_scratch_post','m_cake_stand','m_macaron_tower','guestbook','sm_musicbox','sm_radio','sm_camera','sm_console','tv_retro','heater'])patch(name,(g,w,h)=>{grain(g,1,1,w-2,h-2);for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){const c=g.get(x,y);if(c==='y'&&g.get(x-1,y)==='.')g.px(x,y,'A');if(c==='f'&&g.get(x,y+1)==='g')g.px(x,y,'Z');}if(name==='fun_piano'){g.hl(3,2,w-6,'d');g.hl(3,14,w-6,'a');for(let x=4;x<w-4;x+=5)g.px(x,5,'e');}if(name==='sm_radio'){g.rect(3,3,6,3,'y');g.hl(4,3,4,'K');for(let y=5;y<9;y+=2)g.hl(11,y,3,'a');}if(name==='tv_retro'){g.vl(4,5,9,'o');g.px(w-4,7,'w');g.px(w-4,11,'e');}if(name==='sm_camera')g.px(5,3,'p');if(name==='m_stall'){g.hl(2,h-6,w-4,'a');g.px(6,h-3,'w');g.px(w-7,h-3,'w');}});
 for(const name of ['plush_bear','m_pudding_plush','sm_donut','sm_cake_slice','m_cake_stand','cake','sm_boba','sm_latte','sm_teacups','sm_fruit_bowl','teapot','mug','headphones','speaker','record_player','guitar','lava_lamp','sm_notebook','sm_pencil_cup','sm_hourglass','m_antique_globe','globe'])patch(name,(g,w,h)=>{if(name.includes('cake')){for(let x=3;x<w-3;x+=3)if(g.get(x,h-4)!=='.')g.px(x,h-4,'f');}if(['sm_boba','sm_latte','mug'].includes(name)){g.vl(3,3,Math.max(1,h-7),'f');g.hl(3,h-3,w-6,'h');}if(name==='speaker'){g.px(4,5,'A');g.px(5,4,'B');g.px(4,13,'A');}if(name==='sm_notebook'){g.vl(3,3,h-6,'b');g.hl(5,4,w-8,'f');}if(name==='record_player'){g.hl(2,9,w-4,'e');g.px(w-4,8,'w');g.px(6,3,'B');}if(name==='guitar'){g.px(6,22,'e');g.px(9,28,'a');}if(name==='lava_lamp'){g.px(3,4,'p');g.px(3,10,'W');g.px(5,8,'s');}});
 // Tiny figurines already read well; ceramic bases gain a polished bevel only.
 for(const name of Object.keys(SPR.defs))if(name.startsWith('fig_'))patch(name,(g,w,h)=>{g.hl(2,h-2,w-4,'e');g.hl(1,h-1,w-2,'a');g.px(3,h-2,'w');});

 register('fun_fountain',(g,w,h)=>{g.ellipse(8,12,7,1.8,'m');g.ellipse(8,11,6,1.6,'o');g.hl(3,10,10,'p');g.rect(6,5,4,6,'z');g.vl(6,6,4,'B');g.ellipse(8,5,4,1.8,'y');g.ellipse(8,4,3,1,'p');g.vl(8,2,2,'p');g.px(7,2,'Z');g.hl(4,12,8,'n');});
 register('sm_perfume',(g,w,h)=>{g.rect(3,1,2,2,'u');g.px(3,1,'x');g.hl(2,3,4,'w');round(g,1,4,6,7,'t','r','f');g.rect(3,6,3,3,'g');g.px(4,7,'r');g.px(2,5,'Z');});
 register('sm_diffuser',(g,w,h)=>{g.ellipse(5,6,4,3,'h');g.ellipse(4,5,3,2,'f');g.hl(3,8,4,'J');g.px(4,3,'A');g.px(3,4,'Z');});
 patch('sm_candle_jar',(g,w,h)=>{g.hl(2,3,4,'A');g.vl(2,5,3,'p');g.hl(2,8,4,'h');g.px(3,6,'f');g.px(4,4,'a');});
 patch('sm_cookie_jar',(g,w,h)=>{g.hl(2,2,6,'p');g.vl(2,4,7,'p');g.px(3,3,'Z');g.hl(2,h-2,6,'h');});
 patch('sm_coat_rack',(g,w,h)=>{g.vl(7,13,25,'d');g.vl(2,10,7,'t');g.hl(2,17,4,'q');g.px(11,7,'x');g.hl(10,9,4,'u');});
 patch('sm_umbrella',(g,w,h)=>{g.vl(3,16,7,'A');g.hl(2,14,w-4,'B');g.vl(w-3,16,7,'y');g.px(5,17,'B');});
 patch('sm_floor_mirror',(g,w,h)=>{g.hl(4,2,8,'e');g.vl(3,4,h-9,'d');g.vl(w-3,5,h-8,'a');g.hl(4,h-5,8,'a');});
 patch('sm_robot',(g,w,h)=>{g.px(3,3,'B');g.px(6,3,'B');g.hl(3,7,5,'y');g.px(5,8,'s');g.px(3,11,'A');});
 patch('sm_globe_lamp',(g,w,h)=>{g.px(3,4,'p');g.px(3,5,'p');g.hl(4,11,4,'A');g.hl(4,12,4,'0');});
 patch('m_nebula_poster',(g,w,h)=>{g.px(4,7,'H');g.px(5,8,'s');g.px(10,9,'p');g.px(11,10,'K');g.px(7,11,'H');g.px(6,12,'G');g.hl(3,20,10,'0');});
 patch('m_pet_portrait',(g,w,h)=>{g.hl(1,0,w-2,'0');g.vl(0,1,h-2,'0');g.vl(w-1,1,h-2,'0');g.hl(1,h-1,w-2,'0');g.px(1,1,'x');g.px(w-2,h-2,'a');});
 register('m_gramophone',(g,w,h)=>{bevel(g,1,13,w-2,6,'c','e','a');g.hl(3,15,w-6,'b');g.px(4,16,'w');g.ellipse(6,13,4,1,'y');line(g,9,13,10,8,'u');line(g,10,8,14,5,'v');for(let y=2;y<8;y++){const d=Math.abs(y-4);g.hl(10+d,y,7-d*2,'u');g.px(10+d,y,'w');}g.ellipse(14,3,3,2,'w');g.ellipse(15,3,2,1,'a');g.px(13,2,'x');});

 // Surfaces: real joinery, long grain and glazed tile edges, kept quieter than the furniture.
 const blendCache=new Map(),blend=(a,b,t)=>{const key=a+b+t;if(blendCache.has(key))return blendCache.get(key);const aa=parseInt(a.slice(1),16),bb=parseInt(b.slice(1),16),v=[16,8,0].map(s=>Math.round(((aa>>s)&255)*(1-t)+((bb>>s)&255)*t));const out='#'+v.map(n=>n.toString(16).padStart(2,'0')).join('');blendCache.set(key,out);return out;};
 const woods=Object.assign({},FL_WOOD,{honey:{base:'#d89b5d',alt:'#d09257',seam:'#8f5d3e',grain:'#c4874e',hl:'#e6b075'},birch:{base:'#ecd5ab',alt:'#e4ca9d',seam:'#b49069',grain:'#dbbf91',hl:'#f6e4c2'},walnut:{base:'#8c5c3d',alt:'#825437',seam:'#4a2f25',grain:'#744a31',hl:'#a06b48'},white:{base:'#efe6d8',alt:'#e7dccb',seam:'#bfae96',grain:'#ded0bc',hl:'#faf4ea'}});
 for(const id of Object.keys(FLOOR)){
  const m=/^(?:wood_|fl_)([a-z]+)(?:_(short|wide|basket))?$/.exec(id);if(m&&woods[m[1]]){const P=woods[m[1]],style=m[2]||'normal';FLOOR[id]=(u,y,s=1)=>{
    if(style==='basket'){const v=persV(y),cx=Math.floor((u+4000)/16),cy=Math.floor(v/16),xx=md(u+4000,16),yy=md(v,16),horizontal=(cx+cy)%2===0,k=horizontal?yy:xx,along=horizontal?xx:yy;if(k<1||along<.7/s)return P.seam;if(md(k,4)<.7)return P.hl;return hsh(cx,cy,Math.floor(k/4))%2?P.base:P.alt;}
    const rows=style==='short'?ROWS_NARROW:style==='wide'?ROWS_WIDE:ROWS_PLANK,[row,py,ph]=rowAt(rows,y),len=style==='short'?28:style==='wide'?64:46,off=row*17,local=md(u+off+4000,len),prev=md(u-1/s+off+4000,len);
    if(py===ph-1||local<prev)return P.seam;if(py===0)return P.hl;const board=Math.floor((u+off+4000)/len),base=hsh(board,row,3)%3===0?P.alt:P.base;
    const gy=Math.round((ph-2)*.5+Math.sin(local*.12+board)*1.1);if(py===gy&&md(local+board*9,23)<14)return P.grain;if(py===gy+1&&md(local+board*7,37)<9)return blend(base,P.hl,.3);return base;
   };A.surfaces.add('floor_'+id);continue;}
  if(/^fl_tile_/.test(id)){const mt=/^fl_tile_([^_]+)_(.+)$/.exec(id),P=mt&&TILE_PALS[mt[1]],kind=mt&&mt[2];if(P){FLOOR[id]=(u,y,s=1)=>{const [ri,py,ph]=rowAt(ROWS_TILE,y),lu=md(u+4000,18)/18,lv=py/ph,cx=Math.abs(lu-.5)*2,cy=Math.abs(lv-.5)*2;if(py===ph-1||Math.floor((u+4000)/18)!==Math.floor((u-1/s+4000)/18))return P.grout;if(py===0)return '#ffffff';if(lu<.08||lu>.92||lv>.84)return blend(P.bg,P.b,.3);if(kind==='ring'){const r=Math.hypot(cx,cy);return Math.abs(r-.56)<.12?P.a:r<.16?P.b:P.bg;}if(kind==='star')return cx+cy<.55?P.a:cx+cy<.7?P.b:cx>.8&&cy>.8?P.a:P.bg;if(kind==='cross')return cx<.15||cy<.15?P.a:cx+cy>1.6?P.b:P.bg;return Math.hypot(lu,lv)<.54?P.a:Math.hypot(1-lu,1-lv)<.54?P.b:P.bg;};A.surfaces.add('floor_'+id);}}
  if(id.startsWith('fl_stone_')){const old=FLOOR[id];FLOOR[id]=(u,y,s=1)=>{const c=old(u,y,s),[r,py,ph]=rowAt(ROWS_MAT,y);return py===0?blend(c,'#fff4e0',.15):py===ph-2?blend(c,'#2e2230',.1):c;};A.surfaces.add('floor_'+id);}
 }
 for(const id of Object.keys(WALL)){const d=WALLPAPERS[id],P=d&&WP_PAL[d.pal];if(!P)continue;const pid=d.gen,old=WALL[id];
  if(pid==='wainscot'){WALL[id]=(x,y)=>{if(y<48)return md(x,12)===0?P.b2:P.bg;if(y===48||y===52)return P.f2;if(y===49)return P.hl;if(y<52)return P.fg;const u=md(x,24);if(u===0||y===77)return P.f2;if(u===3||u===20||y===57||y===73)return P.b2;if(u===4||y===58)return blend(P.fg,P.hl,.4);return P.fg;};}
  else if(pid==='clouds'){WALL[id]=(x,y)=>{const k=motif(x,y,28,22,['....aaa......','..aaaaaaa.aa.','.aaaaaaaaaaaa','aaaaaaaaaaaaa','.bbbbbbbbbbb.','..ccccccccc..'],true);return k==='a'?P.hl:k==='b'?P.b2:k==='c'?blend(P.b2,P.fg,.3):P.bg;};}
  else if(pid==='stone'||pid==='subway'){WALL[id]=(x,y)=>{const step=pid==='stone'?8:5,row=Math.floor(y/step),u=md(x+row*7,16),v=md(y,step);if(u===15||v===step-1)return P.f2;if(v===0||u===0)return P.hl;return hsh(Math.floor((x+row*7)/16),row)%3===0?P.b2:P.bg;};}
  else if(pid==='leaves'){WALL[id]=(x,y)=>{const k=motif(x,y,16,17,['...aa.','..abaa','.abaa.','aba...','b.....'],true);return k==='a'?P.fg:k==='b'?P.f2:P.bg;};}
  else if(pid==='rain'){WALL[id]=(x,y)=>{const k=motif(x,y,14,18,['..a..','.aaa.','aabaa','aaaaa','.aaa.'],true);return k==='b'?P.hl:k==='a'?P.fg:P.bg;};}
  else if(pid==='vplank'){WALL[id]=(x,y)=>{const u=md(x,12);if(u===0)return P.f2;if(u===1)return P.hl;return md(y+Math.floor(x/12)*7,19)<10&&u===4?P.b2:P.bg;};}
  else continue;A.surfaces.add('wallpaper_'+id);
 }
 // Index consumed by QA/export, not a new save or gameplay system.
 window.NOOK_ART_POLISH=A;
})();
