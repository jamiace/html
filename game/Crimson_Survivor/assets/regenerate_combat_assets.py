from PIL import Image, ImageDraw, ImageFilter
import math, os, random
OUT='/mnt/data/crimson_echo_html/assets'
os.makedirs(OUT, exist_ok=True)
random.seed(42)
TAU=math.tau

def save(img, name):
    img.save(os.path.join(OUT,name))

def glow_layer(size, drawfn, color, blur=12):
    layer=Image.new('RGBA', size, (0,0,0,0))
    d=ImageDraw.Draw(layer)
    drawfn(d)
    g=layer.filter(ImageFilter.GaussianBlur(blur))
    tint=Image.new('RGBA', size, color)
    return Image.composite(tint, Image.new('RGBA', size, (0,0,0,0)), g.getchannel('A'))

def draw_eyes(d, centers, iris=(255,70,100,255), sclera=(250,245,250,255)):
    for x,y in centers:
        d.ellipse((x-5,y-4,x+5,y+4), fill=sclera)
        d.ellipse((x-2,y-2,x+2,y+2), fill=iris)

def finish(img, glow_color=(255,80,120,90)):
    glow=glow_layer(img.size, lambda d: d.ellipse((18,18,110,110), fill=glow_color), glow_color, 14)
    return Image.alpha_composite(glow, img)

# Player: vampire hunter / dark knight silhouette
img=Image.new('RGBA',(128,128),(0,0,0,0))
d=ImageDraw.Draw(img)
d.polygon([(64,8),(92,34),(86,92),(64,118),(42,92),(36,34)], fill=(86,22,48,255), outline=(255,97,136,255))
d.polygon([(64,22),(80,42),(76,86),(64,98),(52,86),(48,42)], fill=(22,16,28,255), outline=(255,160,184,150))
d.ellipse((46,28,82,64), fill=(236,228,232,255), outline=(255,245,248,255))
d.polygon([(50,32),(64,26),(78,32),(74,42),(54,42)], fill=(22,16,28,255))
d.arc((50,44,78,64), 20, 160, fill=(110,35,58,255), width=3)
draw_eyes(d, [(56,46),(72,46)])
d.polygon([(42,38),(28,30),(39,50)], fill=(120,34,60,255), outline=(255,112,145,255))
d.polygon([(86,38),(100,30),(89,50)], fill=(120,34,60,255), outline=(255,112,145,255))
d.line((46,72,64,96,82,72), fill=(255,106,140,255), width=3)
d.line((54,78,64,106,74,78), fill=(255,160,184,180), width=2)
img=finish(img,(255,70,120,110))
save(img,'player.png')

# Enemy 1 rat swarm creature
img=Image.new('RGBA',(128,128),(0,0,0,0)); d=ImageDraw.Draw(img)
d.ellipse((28,46,96,86), fill=(88,76,86,255), outline=(200,120,140,255), width=4)
d.ellipse((12,54,34,72), fill=(88,76,86,255), outline=(200,120,140,255), width=3)
d.ellipse((78,38,98,58), fill=(100,84,96,255), outline=(200,120,140,255), width=3)
d.ellipse((92,50,114,70), fill=(72,62,72,255), outline=(200,120,140,255), width=3)
d.line((28,72,10,58), fill=(200,120,140,255), width=4)
draw_eyes(d, [(92,63)], iris=(255,88,108,255))
img=finish(img,(255,90,120,80)); save(img,'enemy_rat.png')

# Enemy 2 hound
img=Image.new('RGBA',(128,128),(0,0,0,0)); d=ImageDraw.Draw(img)
d.ellipse((24,42,104,90), fill=(55,22,32,255), outline=(250,82,108,255), width=4)
d.polygon([(30,44),(16,16),(44,36)], fill=(60,24,36,255), outline=(250,82,108,255))
d.polygon([(80,36),(108,18),(98,48)], fill=(60,24,36,255), outline=(250,82,108,255))
d.polygon([(94,62),(120,73),(96,80)], fill=(255,97,126,255))
d.polygon([(26,74),(14,92),(32,86)], fill=(45,18,28,255), outline=(250,82,108,255))
draw_eyes(d, [(88,58)], iris=(255,216,100,255))
d.polygon([(82,64),(104,68),(88,76)], fill=(255,214,110,255))
img=finish(img,(255,60,92,100)); save(img,'enemy_hound.png')

# Enemy 3 armored shell/turtle
img=Image.new('RGBA',(128,128),(0,0,0,0)); d=ImageDraw.Draw(img)
d.rounded_rectangle((28,24,104,100), 18, fill=(60,68,84,255), outline=(148,176,200,255), width=5)
for x in (42,58,74,90): d.line((x,28,x-8,96), fill=(130,144,160,150), width=4)
d.rounded_rectangle((46,46,84,72), 10, fill=(18,24,34,255), outline=(148,176,200,255), width=2)
draw_eyes(d, [(58,58),(72,58)], iris=(255,70,95,255))
d.arc((50,54,80,76), 15, 165, fill=(148,176,200,255), width=2)
img=finish(img,(140,180,220,70)); save(img,'enemy_shell.png')

# Enemy 4 spitter plague orb
img=Image.new('RGBA',(128,128),(0,0,0,0)); d=ImageDraw.Draw(img)
d.ellipse((22,18,106,104), fill=(24,74,68,255), outline=(74,238,176,255), width=4)
d.ellipse((36,32,92,84), fill=(12,28,30,255), outline=(74,238,176,170), width=3)
for a in range(0,360,45):
    x=64+44*math.cos(math.radians(a)); y=61+44*math.sin(math.radians(a)); d.ellipse((x-5,y-5,x+5,y+5), fill=(74,238,176,255))
draw_eyes(d, [(50,48),(78,48)], iris=(230,255,116,255))
d.ellipse((46,58,82,86), fill=(8,12,14,255), outline=(74,238,176,255), width=3)
img=finish(img,(74,238,176,90)); save(img,'enemy_spitter.png')

# Enemy 5 bloater bomb carrier
img=Image.new('RGBA',(128,128),(0,0,0,0)); d=ImageDraw.Draw(img)
d.ellipse((16,14,112,110), fill=(92,28,64,255), outline=(255,95,146,255), width=5)
for x,y,r in [(36,40,8),(92,44,7),(52,72,6),(80,78,9),(68,58,5),(42,90,6),(88,88,5)]:
    d.ellipse((x-r,y-r,x+r,y+r), fill=(255,120,166,180))
draw_eyes(d, [(48,52),(80,52)], iris=(255,225,100,255))
d.arc((42,60,86,90), 15, 165, fill=(116,18,42,255), width=3)
img=finish(img,(255,96,146,100)); save(img,'enemy_bloater.png')

# Enemy 6 shadow wraith
img=Image.new('RGBA',(128,128),(0,0,0,0)); d=ImageDraw.Draw(img)
d.polygon([(64,10),(102,38),(94,96),(64,120),(34,96),(26,38)], fill=(30,18,64,255), outline=(170,98,255,255))
d.polygon([(64,24),(82,48),(76,86),(64,96),(52,86),(46,48)], fill=(10,8,20,255), outline=(220,126,255,100))
draw_eyes(d, [(54,52),(74,52)], iris=(255,110,226,255))
d.line((32,44,10,28), fill=(170,98,255,255), width=5)
d.line((96,44,118,28), fill=(170,98,255,255), width=5)
img=finish(img,(170,98,255,100)); save(img,'enemy_shadow.png')

# Enemy 7 golem
img=Image.new('RGBA',(128,128),(0,0,0,0)); d=ImageDraw.Draw(img)
d.rounded_rectangle((18,14,110,114), 20, fill=(68,70,80,255), outline=(226,180,96,255), width=5)
d.rectangle((6,42,28,90), fill=(68,70,80,255), outline=(226,180,96,255), width=4)
d.rectangle((100,42,122,90), fill=(68,70,80,255), outline=(226,180,96,255), width=4)
d.polygon([(64,24),(82,48),(76,82),(52,82),(46,48)], fill=(20,22,26,255), outline=(226,180,96,255), width=3)
draw_eyes(d, [(56,56),(72,56)], iris=(255,88,94,255))
d.line((40,96,88,96), fill=(226,180,96,255), width=4)
img=finish(img,(226,180,96,100)); save(img,'enemy_golem.png')

# Enemy 8 boss demonic overlord
img=Image.new('RGBA',(128,128),(0,0,0,0)); d=ImageDraw.Draw(img)
d.ellipse((16,12,112,110), fill=(72,12,46,255), outline=(255,60,112,255), width=6)
d.polygon([(64,2),(82,25),(112,14),(98,44),(122,60),(98,74),(112,104),(82,90),(64,126),(46,90),(16,104),(30,74),(6,60),(30,44),(16,14),(46,25)], fill=(42,6,30,255), outline=(255,60,112,255))
d.ellipse((40,34,88,78), fill=(10,6,18,255), outline=(255,116,140,255), width=3)
draw_eyes(d, [(50,54),(78,54)], iris=(255,228,94,255))
d.arc((44,58,84,86), 10, 170, fill=(255,98,130,255), width=4)
d.line((54,82,58,94), fill=(255,236,170,255), width=3); d.line((74,82,70,94), fill=(255,236,170,255), width=3)
img=finish(img,(255,60,112,120)); save(img,'enemy_boss.png')

# Orbit blade
img=Image.new('RGBA',(96,96),(0,0,0,0)); d=ImageDraw.Draw(img)
d.polygon([(48,8),(72,44),(58,84),(48,74),(38,84),(24,44)], fill=(116,237,255,255), outline=(242,252,255,255))
d.polygon([(48,18),(60,44),(54,66),(48,60),(42,66),(36,44)], fill=(210,250,255,255))
img=Image.alpha_composite(glow_layer(img.size, lambda dd: dd.polygon([(48,8),(72,44),(58,84),(48,74),(38,84),(24,44)], fill=(116,237,255,160)), (90,227,255,140), 12), img)
save(img,'fx_orbit_blade.png')

# Frost ring
img=Image.new('RGBA',(256,256),(0,0,0,0)); d=ImageDraw.Draw(img)
for r,w,a in [(114,8,120),(94,6,140),(72,4,160)]: d.ellipse((128-r,128-r,128+r,128+r), outline=(123,220,255,a), width=w)
for a in range(0,360,30):
    x1=128+66*math.cos(math.radians(a)); y1=128+66*math.sin(math.radians(a))
    x2=128+120*math.cos(math.radians(a)); y2=128+120*math.sin(math.radians(a))
    d.line((x1,y1,x2,y2), fill=(220,248,255,170), width=4)
img=Image.alpha_composite(glow_layer(img.size, lambda dd: dd.ellipse((12,12,244,244), outline=(114,223,255,180), width=10), (114,223,255,120), 16), img)
save(img,'fx_frost_ring.png')

# Drone
img=Image.new('RGBA',(96,96),(0,0,0,0)); d=ImageDraw.Draw(img)
d.polygon([(48,12),(82,36),(74,72),(48,88),(22,72),(14,36)], fill=(34,48,74,255), outline=(110,223,255,255))
d.ellipse((36,34,60,58), fill=(111,225,255,255), outline=(255,255,255,180))
d.rectangle((44,58,52,78), fill=(160,220,255,255))
d.line((22,44,5,28), fill=(110,223,255,255), width=5)
d.line((74,44,91,28), fill=(110,223,255,255), width=5)
img=Image.alpha_composite(glow_layer(img.size, lambda dd: dd.ellipse((18,18,78,78), fill=(110,223,255,150)), (110,223,255,110), 12), img)
save(img,'fx_drone.png')

# Mine
img=Image.new('RGBA',(96,96),(0,0,0,0)); d=ImageDraw.Draw(img)
pts=[]
for i in range(8):
    a=i/8*TAU; r=30 if i%2==0 else 20; pts.append((48+math.cos(a)*r,48+math.sin(a)*r))
d.polygon(pts, fill=(24,62,51,255), outline=(90,231,155,255))
d.ellipse((33,33,63,63), fill=(70,228,147,255), outline=(220,255,236,180))
d.line((48,18,68,8), fill=(255,228,120,255), width=5)
d.ellipse((65,4,76,15), fill=(255,240,160,255))
img=Image.alpha_composite(glow_layer(img.size, lambda dd: dd.polygon(pts, fill=(90,231,155,150)), (90,231,155,110), 10), img)
save(img,'fx_mine.png')

print('combat assets regenerated')
