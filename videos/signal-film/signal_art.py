"""Type, atmospheric light and curve drawing for the Signal film."""
from functools import lru_cache
from pathlib import Path
import math
import random
from PIL import Image, ImageColor, ImageDraw, ImageFont

W,H=1280,720
INK='#070914'
PAPER='#F4F5F8'
BLUE='#4867FF'
ICE='#BBCFFF'
PINK='#DF96CA'
FONT_DIR=Path(__file__).resolve().parents[1]/'contractor-previews'/'fonts'

@lru_cache(None)
def font(size,bold=True):
    return ImageFont.truetype(str(FONT_DIR/('manrope-700.ttf' if bold else 'manrope-400.ttf')),max(1,round(size)))

def txt(draw,xy,string,size,color,bold=True):
    draw.text(xy,string,font=font(size,bold),fill=color,anchor='lt')

def s(x):
    x=max(0,min(1,x))
    return x*x*(3-2*x)

def ease(a,b,t):
    return s((t-a)/(b-a))

def bez(p0,p1,p2,p3,n=80):
    pts=[]
    for i in range(n+1):
        u=i/n; v=1-u
        pts.append(tuple(v**3*p0[k]+3*v*v*u*p1[k]+3*v*u*u*p2[k]+u**3*p3[k] for k in (0,1)))
    return pts

def wire(draw,points,progress=1,color=ICE,width=2):
    if progress<=0 or len(points)<2:return
    end=min(len(points)-1,progress*(len(points)-1))
    j=int(end); pts=list(points[:j+1])
    if j<len(points)-1:
        pts.append(tuple(a+(b-a)*(end-j) for a,b in zip(points[j],points[j+1])))
    if len(pts)>1:draw.line(pts,fill=color,width=max(1,round(width)),joint='curve')

@lru_cache(maxsize=160)
def bloom(r,color):
    d=r*14+1; c=d//2
    rgb=ImageColor.getrgb(color) if isinstance(color,str) else color
    im=Image.new('RGBA',(d,d))
    px=[]
    for y in range(d):
        for x in range(d):
            v=math.hypot(x-c,y-c)/r
            opacity=round(114*math.exp(-v*.72)+110*math.exp(-v*v*1.3))
            px.append((*rgb,opacity))
    im.putdata(px)
    return im

def orb(im,x,y,r=6,color=BLUE):
    r=max(1,round(r)); tile=bloom(r,color)
    im.paste(tile,(round(x-tile.width//2),round(y-tile.height//2)),tile)
    g=ImageDraw.Draw(im)
    g.ellipse((x-r,y-r,x+r,y+r),fill=color)
    rr=max(1,r*.48)
    g.ellipse((x-rr,y-rr,x+rr,y+rr),fill=PAPER)

@lru_cache(None)
def field():
    img=Image.new('RGB',(320,180))
    px=[]
    for y in range(180):
        for x in range(320):
            cool=math.exp(-((x-43)/110)**2-((y-126)/92)**2)
            violet=math.exp(-((x-251)/93)**2-((y-18)/75)**2)
            px.append((int(6+4*cool+9*violet),int(7+8*cool+4*violet),int(16+23*cool+14*violet)))
    img.putdata(px)
    return img.resize((W,H),Image.Resampling.BICUBIC)

rng=random.Random(953)
DUST=[(rng.randrange(W),rng.randrange(H),rng.uniform(.15,1),rng.random()*6) for _ in range(110)]

def base(im,t):
    im.paste(field())
    g=ImageDraw.Draw(im)
    for x,y,z,a in DUST:
        v=int(21+23*z*(1+math.cos(t*.65+a))*.5)
        pos=((x+t*z*5)%W,y+4*math.sin(t*.3+a))
        g.point(pos,fill=(v,v+4,v+14))
