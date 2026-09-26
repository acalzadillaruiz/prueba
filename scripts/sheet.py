import sys, json
from PIL import Image, ImageDraw
ids=sys.argv[2:]; out=sys.argv[1]
cols=3; W=800
tiles=[]
for i in ids:
    im=Image.open(f'captures/{i}.jpg')
    if im.width<1000:  # mobile
        im=im.crop((0,0,im.width,min(im.height,1688)))
        im.thumbnail((W//2*1, 900))
    else:
        im=im.crop((0,0,1440,min(im.height,900))); im=im.resize((W,int(W*im.height/1440)))
    tiles.append((i,im))
H=max(t.height for _,t in tiles)+24
rows=(len(tiles)+cols-1)//cols
c=Image.new('RGB',(cols*W,rows*H),'white'); d=ImageDraw.Draw(c)
for k,(i,t) in enumerate(tiles):
    x=(k%cols)*W; y=(k//cols)*H
    c.paste(t,(x,y+24)); d.text((x+6,y+6),i,fill='black')
c.save(out)
