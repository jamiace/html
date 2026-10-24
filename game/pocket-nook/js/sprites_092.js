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
