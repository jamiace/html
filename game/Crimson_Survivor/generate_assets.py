from PIL import Image, ImageDraw, ImageFilter
import math, os, random

OUT='/mnt/data/crimson_echo_html/assets'
os.makedirs(OUT, exist_ok=True)
random.seed(13)
TAU=math.tau

def save(img,name):
    img.save(os.path.join(OUT,name))

def blurred_layer(size, draw_fn, color=(255,255,255,255), blur=12):
    base=Image.new('RGBA', size, (0,0,0,0))
    d=ImageDraw.Draw(base)
    draw_fn(d)
    g=base.filter(ImageFilter.GaussianBlur(blur))
    if color[:3]!=(255,255,255):
        tint=Image.new('RGBA', size, color)
        g=Image.composite(tint, Image.new('RGBA',size,(0,0,0,0)), g.getchannel('A'))
    return g

def gradient_disc(size, inner, outer):
    w,h=size
    img=Image.new('RGBA',size,(0,0,0,0))
    px=img.load()
    cx,cy=w/2,h/2
    mr=min(w,h)/2
    for y in range(h):
        for x in range(w):
            d=((x-cx)**2+(y-cy)**2)**0.5/mr
            if d<=1:
                t=min(1,max(0,d))
                r=int(inner[0]*(1-t)+outer[0]*t)
                g=int(inner[1]*(1-t)+outer[1]*t)
                b=int(inner[2]*(1-t)+outer[2]*t)
                a=int(inner[3]*(1-t)+outer[3]*t)
                px[x,y]=(r,g,b,a)
    return img

def draw_eye(d, x, y, color=(255,70,100,255)):
    d.ellipse((x-4,y-3,x+4,y+3),fill=(255,240,245,255))
    d.ellipse((x-2,y-2,x+2,y+2),fill=color)

def add_highlight(img, box, opacity=50):
    x1,y1,x2,y2=box
    hi=Image.new('RGBA',img.size,(0,0,0,0))
    d=ImageDraw.Draw(hi)
    d.ellipse((x1,y1,x2,y2),fill=(255,255,255,opacity))
    img.alpha_composite(hi.filter(ImageFilter.GaussianBlur(8)))

# ---------- player ----------
img=Image.new('RGBA',(128,128),(0,0,0,0))
body=gradient_disc((80,98),(64,19,39,255),(20,8,18,255))
img.alpha_composite(body,(24,18))
d=ImageDraw.Draw(img)
# cape
cape=[(64,10),(94,39),(86,92),(64,114),(42,92),(34,39)]
d.polygon(cape,fill=(90,22,46,255),outline=(255,88,126,255))
d.polygon([(64,18),(81,40),(77,85),(64,96),(51,85),(47,40)],fill=(32,14,26,255),outline=(255,160,180,180))
# face
face=gradient_disc((34,34),(240,226,232,255),(196,158,175,255))
img.alpha_composite(face,(47,31))
d.arc((48,45,80,69),15,165,fill=(110,36,58,255),width=3)
for ex in (57,71):
    draw_eye(d,ex,49)
# armor trim
for pts in [[(43,71),(64,89),(85,71)],[(52,76),(64,99),(76,76)]]:
    d.line(pts,fill=(255,101,138,220),width=3)
# shoulder spikes
for pts in [[(40,43),(27,35),(39,54)],[(88,43),(101,35),(89,54)]]:
    d.polygon(pts,fill=(125,32,56,255),outline=(255,103,136,255))
# glow and sharpen
img=Image.alpha_composite(blurred_layer(img.size, lambda dd: dd.ellipse((28,22,100,104), fill=(255,60,112,140)), (255,60,112,130), 14), img)
add_highlight(img,(46,28,74,46),60)
save(img,'player.png')

# ---------- enemies ----------
def make_enemy(name, kind):
    img=Image.new('RGBA',(128,128),(0,0,0,0))
    d=ImageDraw.Draw(img)
    if kind=='rat':
        d.polygon([(26,81),(10,93),(24,97)],fill=(210,112,134,255))
        d.ellipse((24,42,98,88),fill=(78,67,80,255),outline=(194,112,136,255),width=4)
        d.ellipse((13,50,39,72),fill=(78,67,80,255),outline=(194,112,136,255),width=3)
        d.ellipse((76,33,99,56),fill=(92,76,92,255),outline=(194,112,136,255),width=3)
        d.ellipse((85,48,112,72),fill=(70,58,70,255),outline=(194,112,136,255),width=3)
        d.line((29,69,10,56),fill=(194,112,136,255),width=4)
        draw_eye(d,91,63,(255,83,102,255))
    elif kind=='hound':
        d.ellipse((25,39,103,90),fill=(54,22,34,255),outline=(245,78,104,255),width=4)
        d.polygon([(30,41),(18,15),(43,34)],fill=(58,24,38,255),outline=(245,78,104,255))
        d.polygon([(78,35),(108,18),(99,47)],fill=(58,24,38,255),outline=(245,78,104,255))
        d.polygon([(94,61),(120,72),(96,79)],fill=(255,89,112,255))
        d.polygon([(22,70),(11,89),(30,82)],fill=(42,18,28,255),outline=(245,78,104,255))
        draw_eye(d,86,58,(255,215,90,255))
    elif kind=='shell':
        d.rounded_rectangle((28,21,101,100),18,fill=(58,64,80,255),outline=(145,170,195,255),width=5)
        for x in (42,59,76,92):
            d.line((x,25,x-7,96),fill=(118,136,160,160),width=4)
        d.rounded_rectangle((45,42,83,70),9,fill=(18,24,34,255),outline=(145,170,195,255),width=2)
        draw_eye(d,57,56); draw_eye(d,73,56)
        d.arc((49,51,80,74),10,170,fill=(145,170,195,255),width=2)
    elif kind=='spitter':
        d.ellipse((23,20,104,103),fill=(22,70,66,255),outline=(72,239,177,255),width=4)
        d.ellipse((36,30,91,82),fill=(13,31,34,255),outline=(72,239,177,160),width=3)
        for a in range(0,360,45):
            x=64+44*math.cos(math.radians(a)); y=62+44*math.sin(math.radians(a));
            d.ellipse((x-5,y-5,x+5,y+5),fill=(72,239,177,255))
        draw_eye(d,50,48,(239,255,118,255)); draw_eye(d,78,48,(239,255,118,255))
        d.ellipse((46,58,82,86),fill=(5,12,14,255),outline=(72,239,177,255),width=3)
    elif kind=='bloater':
        d.ellipse((18,14,110,108),fill=(86,30,66,255),outline=(255,90,145,255),width=5)
        for _ in range(12):
            x=random.randint(34,94); y=random.randint(30,92); r=random.randint(4,8)
            d.ellipse((x-r,y-r,x+r,y+r),fill=(255,116,167,180))
        draw_eye(d,48,49,(255,230,100,255)); draw_eye(d,80,49,(255,230,100,255))
        d.arc((42,58,86,88),15,165,fill=(110,15,40,255),width=3)
    elif kind=='shadow':
        d.polygon([(64,8),(102,36),(93,96),(64,118),(35,96),(26,37)],fill=(28,18,60,255),outline=(169,98,255,255))
        d.polygon([(64,22),(83,46),(76,85),(64,95),(52,85),(45,46)],fill=(8,8,20,255),outline=(210,118,255,100))
        draw_eye(d,54,50,(255,108,226,255)); draw_eye(d,75,50,(255,108,226,255))
        d.line((31,42,10,26),fill=(169,98,255,255),width=5)
        d.line((96,42,118,26),fill=(169,98,255,255),width=5)
    elif kind=='golem':
        d.rounded_rectangle((20,14,108,112),20,fill=(67,69,79,255),outline=(224,178,95,255),width=5)
        d.rectangle((6,40,27,88),fill=(67,69,79,255),outline=(224,178,95,255),width=4)
        d.rectangle((101,40,122,88),fill=(67,69,79,255),outline=(224,178,95,255),width=4)
        d.polygon([(64,22),(82,44),(76,80),(52,80),(46,44)],fill=(19,20,26,255),outline=(224,178,95,255),width=3)
        draw_eye(d,55,55,(255,88,94,255)); draw_eye(d,73,55,(255,88,94,255))
        d.line((40,92,88,92),fill=(224,178,95,255),width=4)
    elif kind=='boss':
        d.ellipse((16,12,112,108),fill=(71,12,46,255),outline=(255,60,111,255),width=6)
        d.polygon([(64,2),(82,25),(112,14),(98,44),(122,60),(97,72),(110,101),(82,88),(64,124),(46,88),(18,101),(31,72),(6,60),(30,44),(16,14),(46,25)],fill=(40,5,28,255),outline=(255,60,111,255))
        d.ellipse((40,33,88,77),fill=(11,5,18,255),outline=(255,114,136,255),width=3)
        draw_eye(d,50,52,(255,226,90,255)); draw_eye(d,78,52,(255,226,90,255))
        d.arc((44,58,84,86),5,175,fill=(255,98,130,255),width=4)
    add_highlight(img,(32,22,90,48),55)
    glow_colors={
        'rat':(255,84,122,95),'hound':(255,58,92,105),'shell':(140,184,220,90),'spitter':(70,239,177,95),
        'bloater':(255,94,148,95),'shadow':(167,92,255,100),'golem':(224,178,95,100),'boss':(255,54,112,120)
    }
    glow=blurred_layer(img.size, lambda dd: dd.ellipse((18,18,110,110), fill=glow_colors[kind]), glow_colors[kind], 14)
    img=Image.alpha_composite(glow,img)
    save(img,name)

for fn,kind in [
    ('enemy_rat.png','rat'),('enemy_hound.png','hound'),('enemy_shell.png','shell'),('enemy_spitter.png','spitter'),
    ('enemy_bloater.png','bloater'),('enemy_shadow.png','shadow'),('enemy_golem.png','golem'),('enemy_boss.png','boss')]:
    make_enemy(fn,kind)

# orbit blade
img=Image.new('RGBA',(96,96),(0,0,0,0))
d=ImageDraw.Draw(img)
d.polygon([(48,10),(69,42),(57,78),(48,69),(39,78),(27,42)],fill=(116,237,255,255),outline=(241,252,255,255))
d.polygon([(48,18),(60,42),(53,64),(48,60),(43,64),(36,42)],fill=(215,252,255,255))
img=Image.alpha_composite(blurred_layer(img.size, lambda dd: dd.polygon([(48,10),(69,42),(57,78),(48,69),(39,78),(27,42)], fill=(116,237,255,160)), (90,227,255,130), 12), img)
save(img,'fx_orbit_blade.png')

# frost ring
img=Image.new('RGBA',(256,256),(0,0,0,0))
d=ImageDraw.Draw(img)
for r,w,a in [(114,8,120),(94,6,140),(72,4,160)]:
    d.ellipse((128-r,128-r,128+r,128+r),outline=(123,220,255,a),width=w)
for a in range(0,360,30):
    x1=128+64*math.cos(math.radians(a)); y1=128+64*math.sin(math.radians(a))
    x2=128+118*math.cos(math.radians(a)); y2=128+118*math.sin(math.radians(a))
    d.line((x1,y1,x2,y2),fill=(210,246,255,170),width=4)
    tx=128+126*math.cos(math.radians(a)); ty=128+126*math.sin(math.radians(a))
    d.polygon([(tx,ty),(tx-8,ty-4),(tx-4,ty-12)],fill=(230,250,255,180))
img=Image.alpha_composite(blurred_layer(img.size, lambda dd: dd.ellipse((12,12,244,244), outline=(114,223,255,180), width=10), (114,223,255,120), 16), img)
save(img,'fx_frost_ring.png')

# drone
img=Image.new('RGBA',(96,96),(0,0,0,0))
d=ImageDraw.Draw(img)
d.polygon([(48,12),(82,36),(74,72),(48,88),(22,72),(14,36)],fill=(34,48,74,255),outline=(110,223,255,255))
d.ellipse((36,34,60,58),fill=(111,225,255,255),outline=(255,255,255,180))
d.rectangle((44,58,52,78),fill=(160,220,255,255))
d.line((22,44,5,28),fill=(110,223,255,255),width=5)
d.line((74,44,91,28),fill=(110,223,255,255),width=5)
img=Image.alpha_composite(blurred_layer(img.size, lambda dd: dd.ellipse((18,18,78,78), fill=(110,223,255,150)), (110,223,255,110), 12), img)
save(img,'fx_drone.png')

# mine
img=Image.new('RGBA',(96,96),(0,0,0,0))
d=ImageDraw.Draw(img)
pts=[]
for i in range(8):
    a=i/8*TAU
    r=30 if i%2==0 else 20
    pts.append((48+math.cos(a)*r,48+math.sin(a)*r))
d.polygon(pts,fill=(24,62,51,255),outline=(90,231,155,255))
d.ellipse((33,33,63,63),fill=(70,228,147,255),outline=(220,255,236,180))
d.line((48,18,68,8),fill=(255,228,120,255),width=5)
d.ellipse((65,4,76,15),fill=(255,240,160,255))
img=Image.alpha_composite(blurred_layer(img.size, lambda dd: dd.polygon(pts, fill=(90,231,155,150)), (90,231,155,110), 10), img)
save(img,'fx_mine.png')

print('Assets regenerated in',OUT)
