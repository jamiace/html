const LEAN_ANCHOR={cat:PurrAssets.catalog.leanAnchor}, LEAN_CACHE={};
function petLeanCanvas(kind,color,flip,n){const key=[color,flip,n].join('|');if(LEAN_CACHE[key])return LEAN_CACHE[key];let g=PNGArt.grid('lean/'+n);const map=PET_COLORS.cat[color];if(map)g=g.recolor(map);if(flip)g=g.flip();const[ax,ay]=LEAN_ANCHOR.cat[n-1];return LEAN_CACHE[key]={cv:g.toCanvas(),ax:flip?g.w-ax:ax,ay}}
