"""Four discovery beats. The mark moves from a social share to a paid search click."""
from functools import lru_cache
from math import ceil, sin, pi
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps
from art import *

ASSETS = Path(__file__).resolve().parents[2] / 'public/demos/roofers-5'
W,H=1280,720

def ease(t):
    return 1-(1-min(1,max(0,t)))**4

def cover(im,color):
    ImageDraw.Draw(im).rectangle((0,0,W,H),fill=color)

def dot(g,x,y,r,color=BLUE,ring=None):
    if ring: g.ellipse((x-r-4,y-r-4,x+r+4,y+r+4),fill=ring)
    g.ellipse((x-r,y-r,x+r,y+r),fill=color)

def tape(g,x,y,text,fill=INK,col=PEARL):
    width=g.textlength(text,font=font(19))+34
    g.rectangle((x,y,x+width,y+39),fill=fill)
    label(g,(x+16,y+11),text,19,col)

@lru_cache(None)
def still(name):
    return Image.open(ASSETS/name).convert('RGB')

def photo(im,box,name,zoom=1,center=(.5,.5)):
    x,y,w,h=map(int,box)
    src=still(name)
    # Scale the crop into the shot directly, avoiding repeated full-source resize.
    z=max(w/src.width,h/src.height)*zoom
    bw,bh=w/z,h/z
    sx=(src.width-bw)*center[0]; sy=(src.height-bh)*center[1]
    im.paste(src.resize((w,h),Image.Resampling.BILINEAR,box=(sx,sy,sx+bw,sy+bh)),(x,y))

def social(im,t):
    cover(im,INK); g=ImageDraw.Draw(im)
    # A single large frame becomes one cell in a film strip beside other feeds.
    split=ease((t-2.30)/.75)
    width=round(1160-510*split); height=330
    x=round(60-93*split); y=56
    photo(im,(x,y,width,height),'project-progress.jpg',1.07+.024*t,(.22,.44))
    if split>0:
        for j,name in enumerate(['project-progress.jpg','project-progress.jpg']):
            photo(im,(x+(j+1)*(width+20),y,width,height),name,1.17+.05*j,(.62,.4))
    for i in range(0,1280,54):
        g.rounded_rectangle((i-10,36,i+9,44),radius=3,fill='#596171')
        g.rounded_rectangle((i-10,397,i+9,405),radius=3,fill='#596171')
    if t<2.45:
        tape(g,60,445,'SOCIAL CONTENT',LIME,INK)
        label(g,(57+int((1-ease(t/.36))*92),505),'A neighbor shares',76,PEARL)
        label(g,(57+int((1-ease((t-.12)/.48))*92),589),'your repair clip.',76,PEARL)
    else:
        tape(g,60,445,'PAID SOCIAL',LIME,INK)
        label(g,(57+int((1-ease((t-2.45)/.45))*110),505),'An ad puts that clip',76,PEARL)
        label(g,(57,589),'in nearby feeds.',76,PEARL)
    # The flying send symbol turns the post into a share.
    u=ease(t/1.25) if t<2.45 else smooth((t-2.45)/2)
    cx=(200+820*u if t<2.45 else 1000-350*u); cy=291-25*sin(t*pi/2)
    dot(g,cx,cy,40,BLUE,PEARL)
    g.polygon([(cx-18,cy-2),(cx+19,cy-16),(cx+6,cy+19),(cx-2,cy+4)],fill=PEARL)

def search(im,t):
    cover(im,PEARL); g=ImageDraw.Draw(im)
    # Local typographic map: street grid and line patterns continue past the frame.
    for j in range(-4,13):
        x=680+j*76+int(18*sin(.5*t))
        g.line((x,0,x+245,720),fill='#dce1de',width=2)
    for j in range(12):
        y=-126+j*84; g.line((690,y,1280,y-225),fill='#dce1de',width=2)
    g.rectangle((0,0,626,720),fill=PEARL)
    tape(g,61,68,'SEO   /   ORGANIC SEARCH',INK,PEARL)
    for j,line in enumerate(['Match your','service page','to the search.']):
        label(g,(55+int((1-ease((t-j*.12)/.55))*60),172+j*102),line,82,INK)
    # A query physically travels into its matching service page.
    v=ease(t/.65); qx=round(663+200*(1-v)); qy=142
    g.rounded_rectangle((qx,qy,qx+544,qy+88),radius=44,fill=INK)
    g.ellipse((qx+32,qy+28,qx+55,qy+51),outline=PEARL,width=4);g.line((qx+52,qy+48,qx+62,qy+58),fill=PEARL,width=4)
    label(g,(qx+83,qy+25),'roof leak repair near me',32,PEARL)
    x=806; y0=231; y1=356
    g.line((x,y0,x,y1),fill=BLUE,width=5)
    u=smooth((t-.35)/1.25); dot(g,x,y0+(y1-y0)*u,10)
    y=round(360+84*(1-ease((t-.6)/.7)))
    g.rectangle((678,y+13,1177,y+201),fill=SKY)
    g.rectangle((664,y,1163,y+188),fill=PEARL,outline=INK,width=3)
    label(g,(692,y+24),'SERVICE PAGE',20,BLUE)
    label(g,(690,y+65),'Roof leak repair',46,INK)
    g.line((692,y+126,1118,y+126),fill='#bfc1ba',width=2)
    label(g,(692,y+145),'Inspections in Kansas City',25,INK,False)

def answer(im,t):
    cover(im,BLUE); g=ImageDraw.Draw(im)
    # Overscale typographic punctuation serves as the scene's architecture.
    g.text((947+round(9*sin(t*1.25)),-105+round(10*sin(t*.7))),'?',font=font(780),fill='#1C47E2',anchor='lt')
    tape(g,60,62,'AEO   /   ANSWER ENGINES',LIME,INK)
    label(g,(60,164),'Answer engines can cite your page.',53,PEARL)
    start=round(34*(1-ease(t/.48)))
    label(g,(57+start,279),'“Does a ceiling stain',75,PEARL)
    label(g,(57+start,365),'mean a new roof?”',75,PEARL)
    y=round(509+175*(1-ease((t-.65)/.6)))
    g.rectangle((61,y,1198,y+136),fill=LIME)
    label(g,(87,y+20),'YOUR SITE’S ANSWER',19,INK)
    label(g,(85,y+63),'A stain alone can’t tell you. Inspect the source.',42,INK)
    # A source bracket traces the specific answer being picked up.
    u=ease((t-1.65)/.8)
    g.line((61,y+139,61+1137*u,y+139),fill=PEARL,width=4)
    dot(g,61+1137*u,y+139,7,PEARL)

def paid(im,t):
    cover(im,LIME); g=ImageDraw.Draw(im)
    # A search auction becomes a physical ticket, inserted into a stack of results.
    tape(g,59,59,'SEM   /   PAID SEARCH',INK,PEARL)
    label(g,(56,135),'Buy a spot',89,INK)
    label(g,(56,232),'in the search.',89,INK)
    label(g,(60,373),'Show an inspection ad',36,INK,False)
    label(g,(60,418),'when someone searches.',36,INK,False)
    x,y=686,116
    g.rectangle((x,y,x+536,y+500),fill=PEARL)
    g.rectangle((x+26,y+28,x+510,y+100),outline=INK,width=2)
    label(g,(x+47,y+50),'roof inspection near me',30,INK)
    k=ease((t-.40)/.72)
    for n in range(2):
        yy=y+146+n*88+105*k
        g.line((x+37,yy,x+430,yy),fill='#A6AAA6',width=8)
        g.line((x+37,yy+26,x+308,yy+26),fill='#CCD0C7',width=5)
    xx=x+round(631*(1-k)); yy=y+132
    g.rectangle((xx,yy,xx+535,yy+115),fill=BLUE)
    label(g,(xx+36,yy+16),'SPONSORED',19,PEARL)
    label(g,(xx+34,yy+51),'Book a roof inspection',39,PEARL)
    # The click glides in on a curved track before the site takes over.
    v=ease((t-.9)/1.8); cx=1248-141*v;cy=610-285*v
    g.polygon([(cx,cy),(cx+9,cy+49),(cx+21,cy+35),(cx+40,cy+34)],fill=INK,outline=PEARL,width=2)
    if t>2.8:
        pulse=min(1,(t-2.8)/.75)
        if pulse<1:g.ellipse((cx-47*pulse,cy-47*pulse,cx+47*pulse,cy+47*pulse),outline=PEARL,width=3)

def detail(im,age,i):
    # A virtual camera follows the search result, then the paid placement.
    # Both frames are given a clean reading hold before punching into the object.
    if i not in (1,3):
        return
    amount=smooth((age-(2.72 if i==1 else 3.0))/.86)
    if not amount:
        return
    if i==1:
        window=(646,267,1222,591)
    else:
        window=(655,132,1263,474)
    x,y,r,b=window
    frame=(x*amount,y*amount,W-(W-r)*amount,H-(H-b)*amount)
    im.paste(im.resize(im.size,Image.Resampling.BICUBIC,box=frame))

SCENES=(social,search,answer,paid)
def draw(img,t):
    local=max(0,min(19.999,t-4))
    i=int(local//5); age=local%5
    SCENES[i](img,age)
    detail(img,age,i)
    if i<3 and age>4.46:
        # The incoming scene overtakes the previous scene on a moving diagonal.
        nxt=Image.new('RGB',img.size); SCENES[i+1](nxt,0)
        x=-W*.26+(W*1.52)*smooth((age-4.46)/.54)
        poly=[(-400,0),(x+160,0),(x-120,H),(-400,H)]
        mask=Image.new('L',img.size); ImageDraw.Draw(mask).polygon(poly,fill=255)
        img.paste(nxt,(0,0),mask)
        g=ImageDraw.Draw(img); g.line([(x+160,0),(x-120,H)],fill=BLUE,width=15)
