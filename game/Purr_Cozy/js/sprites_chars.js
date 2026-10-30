const PET_COLORS=PurrAssets.catalog.catalog.PET_COLORS;
const PET_CACHE={};
function petCanvas(kind,color,pose,f,flip,acc){const neck=acc?.neck||'',head=acc?.head||'',key=[color,pose,f,flip,neck,head].join('|');if(PET_CACHE[key])return PET_CACHE[key];const id='cat/'+pose+'/'+f+'/'+neck+'/'+head;let g=PNGArt.grid(id),map=PET_COLORS.cat[color];if(map)g=g.recolor(map);if(flip)g=g.flip();return PET_CACHE[key]=g.toCanvas()}
