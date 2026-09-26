import sys
from PIL import Image
out=sys.argv[1]; ims=[Image.open(p) for p in sys.argv[2:]]
w=sum(i.width for i in ims); h=max(i.height for i in ims)
c=Image.new('RGB',(w,h),'white'); x=0
for i in ims: c.paste(i,(x,0)); x+=i.width
c.thumbnail((2600,2600)); c.save(out)
