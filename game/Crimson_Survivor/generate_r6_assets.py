from PIL import Image, ImageDraw, ImageFilter
import math, os, random
OUT='/mnt/data/crimson_echo_html/assets'
os.makedirs(OUT, exist_ok=True)
random.seed(66)
TAU=math.tau


def save(im,name): im.save(os.path.join(OUT,name))

def glow(im, color, blur=14):
    a=im.getchannel('A').filter(ImageFilter.GaussianBlur(blur))
    g=Image.new('RGBA',im.size,color)
    g.putalpha(a.point(lambda p:int(p*.65)))
    return Image.alpha_composite(g,im)

def shadow_ellipse(d,box,alpha=90): d.ellipse(box,fill=(0,0,0,alpha))

def eyes(d, pts, iris, scale=1):
    for x,y in pts:
        d.ellipse((x-5*scale,y-4*scale,x+5*scale,y+4*scale),fill=(250,245,250,255))
        d.ellipse((x-2.3*scale,y-2.3*scale,x+2.3*scale,y+2.3*scale),fill=iris)

S=160
# Player
im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
d.polygon([(80,8),(120,44),(112,119),(80,151),(48,119),(40,44)],fill=(76,18,44,255),outline=(255,80,126,255),width=4)
d.polygon([(80,24),(102,52),(96,111),(80,126),(64,111),(58,52)],fill=(18,13,25,255),outline=(255,149,178,180),width=3)
d.ellipse((58,38,102,80),fill=(235,224,230,255),outline=(255,250,252,255),width=2)
d.polygon([(60,42),(80,32),(100,42),(94,54),(66,54)],fill=(22,13,25,255))
eyes(d,[(69,59),(91,59)],(255,50,90,255),1)
d.arc((61,58,99,83),15,165,fill=(92,20,46,255),width=3)
d.polygon([(48,48),(26,36),(44,68)],fill=(118,30,58,255),outline=(255,92,130,255))
d.polygon([(112,48),(134,36),(116,68)],fill=(118,30,58,255),outline=(255,92,130,255))
d.line((58,92,80,122,102,92),fill=(255,94,137,255),width=4)
d.line((68,100,80,136,92,100),fill=(255,170,190,190),width=3)
im=glow(im,(255,38,104,110),16); save(im,'player.png')

# rat
im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
d.line((39,101,14,116,9,109,28,95),fill=(210,124,144,255),width=7)
d.ellipse((36,54,121,111),fill=(80,69,82,255),outline=(205,124,145,255),width=4)
d.ellipse((104,61,143,96),fill=(75,62,74,255),outline=(205,124,145,255),width=4)
d.ellipse((105,45,127,66),fill=(110,86,102,255),outline=(205,124,145,255),width=3)
d.ellipse((119,48,143,69),fill=(110,86,102,255),outline=(205,124,145,255),width=3)
d.polygon([(143,77),(154,83),(143,89)],fill=(245,148,162,255))
eyes(d,[(131,75)],(255,67,96,255),.8)
for x in (55,83): d.line((x,103,x-5,121),fill=(58,48,60,255),width=6)
im=glow(im,(255,78,111,80),12); save(im,'enemy_rat.png')

# hound quadruped
im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
d.polygon([(28,75),(40,49),(84,42),(116,58),(134,80),(112,100),(70,105),(38,95)],fill=(55,20,31,255),outline=(252,72,102,255),width=4)
d.polygon([(96,55),(124,38),(131,62),(145,71),(132,83),(105,76)],fill=(67,23,34,255),outline=(252,72,102,255),width=4)
d.polygon([(105,51),(109,22),(126,43)],fill=(66,22,34,255),outline=(252,72,102,255),width=3)
d.polygon([(29,72),(9,55),(25,87)],fill=(82,28,42,255),outline=(252,72,102,255),width=3)
for x,y in [(47,96),(75,101),(106,92)]: d.polygon([(x,y),(x-5,127),(x+10,127),(x+8,y)],fill=(44,15,24,255),outline=(252,72,102,255))
eyes(d,[(126,65)],(255,220,86,255),.8)
d.polygon([(145,72),(157,78),(144,84)],fill=(255,214,92,255))
im=glow(im,(255,48,86,105),14); save(im,'enemy_hound.png')

# shell beetle/turtle
im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
for y in (58,84,110):
    d.line((38,y,15,y-10),fill=(111,142,171,255),width=8)
    d.line((122,y,145,y-10),fill=(111,142,171,255),width=8)
d.ellipse((36,25,124,135),fill=(55,63,78,255),outline=(151,185,216,255),width=5)
d.line((80,29,80,131),fill=(122,153,181,255),width=5)
d.arc((47,35,113,91),190,350,fill=(122,153,181,180),width=4)
d.arc((47,70,113,126),10,170,fill=(122,153,181,180),width=4)
d.rounded_rectangle((58,52,102,84),10,fill=(16,24,34,255),outline=(151,185,216,255),width=3)
eyes(d,[(70,68),(90,68)],(255,68,98,255),.9)
im=glow(im,(125,176,222,85),14); save(im,'enemy_shell.png')

# spitter plant/alien
im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
for a in range(0,360,45):
    ca,sa=math.cos(math.radians(a)),math.sin(math.radians(a))
    x,y=80+56*ca,80+56*sa
    d.ellipse((x-14,y-8,x+14,y+8),fill=(34,126,95,255),outline=(74,240,175,255),width=3)
d.ellipse((28,27,132,133),fill=(21,77,66,255),outline=(72,238,174,255),width=5)
d.ellipse((48,42,112,112),fill=(8,28,27,255),outline=(72,238,174,180),width=3)
eyes(d,[(64,62),(96,62)],(221,255,93,255),1)
d.ellipse((55,76,105,118),fill=(3,12,12,255),outline=(72,238,174,255),width=4)
for a in range(0,360,60):
    x=80+21*math.cos(math.radians(a));y=97+14*math.sin(math.radians(a));d.ellipse((x-3,y-3,x+3,y+3),fill=(176,255,108,255))
im=glow(im,(55,235,169,95),15); save(im,'enemy_spitter.png')

# bloater
im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
d.ellipse((20,18,140,142),fill=(90,28,65,255),outline=(255,84,143,255),width=5)
for x,y,r in [(48,48,11),(111,51,9),(65,88,8),(103,101,12),(45,116,8),(83,55,6),(120,82,6)]:
    d.ellipse((x-r,y-r,x+r,y+r),fill=(255,114,168,190),outline=(255,176,202,100))
eyes(d,[(61,69),(99,69)],(255,225,88,255),1)
d.arc((52,79,108,119),10,170,fill=(122,15,48,255),width=4)
d.line((80,20,93,5),fill=(255,201,82,255),width=5); d.ellipse((90,1,104,15),fill=(255,241,153,255))
im=glow(im,(255,67,130,105),16); save(im,'enemy_bloater.png')

# shadow wraith
im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
d.polygon([(80,8),(126,45),(117,117),(96,143),(80,132),(64,143),(43,117),(34,45)],fill=(29,17,61,255),outline=(168,91,255,255),width=4)
d.polygon([(80,24),(105,57),(98,109),(80,122),(62,109),(55,57)],fill=(7,7,20,255),outline=(209,116,255,130),width=3)
d.polygon([(43,57),(12,42),(34,76)],fill=(48,23,92,255),outline=(168,91,255,255))
d.polygon([(117,57),(148,42),(126,76)],fill=(48,23,92,255),outline=(168,91,255,255))
eyes(d,[(67,67),(93,67)],(255,92,223,255),1)
d.polygon([(62,89),(80,103),(98,89),(92,117),(80,128),(68,117)],fill=(17,8,36,255))
im=glow(im,(150,73,255,115),16); save(im,'enemy_shadow.png')

# golem humanoid
im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
d.rounded_rectangle((44,20,116,132),16,fill=(66,67,77,255),outline=(222,173,86,255),width=5)
d.rounded_rectangle((8,47,50,119),12,fill=(69,70,80,255),outline=(222,173,86,255),width=4)
d.rounded_rectangle((110,47,152,119),12,fill=(69,70,80,255),outline=(222,173,86,255),width=4)
d.polygon([(80,28),(102,55),(94,99),(66,99),(58,55)],fill=(17,19,25,255),outline=(222,173,86,255),width=3)
eyes(d,[(70,67),(90,67)],(255,74,88,255),1)
d.line((60,111,100,111),fill=(222,173,86,255),width=5)
for p in [((48,34),(65,26)),((112,38),(101,25)),((25,63),(12,48)),((135,67),(150,52))]: d.line((*p[0],*p[1]),fill=(120,107,82,255),width=3)
im=glow(im,(218,168,80,100),16); save(im,'enemy_golem.png')

# boss demon
im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
d.polygon([(44,52),(8,25),(26,68),(6,98),(48,91)],fill=(73,10,40,255),outline=(255,50,108,255),width=4)
d.polygon([(116,52),(152,25),(134,68),(154,98),(112,91)],fill=(73,10,40,255),outline=(255,50,108,255),width=4)
d.ellipse((28,24,132,139),fill=(70,10,45,255),outline=(255,52,110,255),width=6)
d.polygon([(52,40),(37,5),(70,28)],fill=(94,14,51,255),outline=(255,75,120,255),width=4)
d.polygon([(108,40),(123,5),(90,28)],fill=(94,14,51,255),outline=(255,75,120,255),width=4)
d.ellipse((49,45,111,102),fill=(9,5,18,255),outline=(255,104,137,255),width=3)
eyes(d,[(65,68),(95,68)],(255,229,81,255),1.1)
d.arc((55,75,105,113),10,170,fill=(255,83,126,255),width=5)
d.polygon([(61,102),(67,122),(72,104)],fill=(255,239,186,255));d.polygon([(88,104),(93,122),(99,102)],fill=(255,239,186,255))
im=glow(im,(255,31,100,130),18); save(im,'enemy_boss.png')

# meteor with flame tail included
im=Image.new('RGBA',(128,128),(0,0,0,0)); d=ImageDraw.Draw(im)
d.polygon([(64,7),(84,45),(76,75),(64,113),(52,75),(44,45)],fill=(255,78,22,220))
d.polygon([(64,18),(76,49),(70,69),(64,93),(58,69),(52,49)],fill=(255,225,94,255))
d.ellipse((35,48,93,106),fill=(95,34,26,255),outline=(255,143,64,255),width=5)
for x,y,r in [(52,65,7),(75,69,6),(63,88,8)]:d.ellipse((x-r,y-r,x+r,y+r),fill=(45,25,24,255),outline=(180,69,42,255),width=2)
im=glow(im,(255,75,20,145),16); save(im,'fx_meteor.png')

# gravity orb
im=Image.new('RGBA',(96,96),(0,0,0,0)); d=ImageDraw.Draw(im)
for r,a,w in [(36,110,5),(27,150,4),(18,190,3)]: d.ellipse((48-r,48-r,48+r,48+r),outline=(183,106,255,a),width=w)
d.ellipse((31,31,65,65),fill=(2,2,10,255),outline=(233,208,255,255),width=3)
d.ellipse((41,40,49,48),fill=(255,255,255,210))
im=glow(im,(166,79,255,140),14); save(im,'fx_gravity_orb.png')

# flame sprite
im=Image.new('RGBA',(96,128),(0,0,0,0)); d=ImageDraw.Draw(im)
d.polygon([(48,3),(70,37),(79,70),(66,116),(48,126),(29,113),(16,70),(29,34)],fill=(255,55,12,215))
d.polygon([(48,24),(61,53),(65,83),(55,110),(43,112),(32,87),(35,56)],fill=(255,153,29,235))
d.polygon([(48,46),(56,66),(55,91),(48,103),(41,91),(40,68)],fill=(255,249,176,255))
im=glow(im,(255,73,16,135),12); save(im,'fx_flame.png')

# orbit blade bigger, bolder
im=Image.new('RGBA',(128,128),(0,0,0,0)); d=ImageDraw.Draw(im)
d.polygon([(64,6),(96,56),(77,117),(64,100),(51,117),(32,56)],fill=(87,220,255,255),outline=(236,252,255,255),width=4)
d.polygon([(64,22),(80,58),(70,91),(64,82),(58,91),(48,58)],fill=(220,251,255,255))
d.line((64,12,64,106),fill=(255,255,255,180),width=3)
im=glow(im,(73,216,255,135),15); save(im,'fx_orbit_blade.png')
print('R6 assets generated')
