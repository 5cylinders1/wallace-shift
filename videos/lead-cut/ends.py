"""The rain, the website conversion, and the Wallace Shift signature."""
from art import *
from PIL import ImageChops
import random, re

W,H=1280,720
def mix(a,b,u):
    a=a.lstrip('#'); b=b.lstrip('#')
    return tuple(round(int(a[j:j+2],16)*(1-u)+int(b[j:j+2],16)*u) for j in (0,2,4))

def clamp(v): return max(0,min(1,v))

def ellipse(g,x,y,r,fill):
    g.ellipse((x-r,y-r,x+r,y+r),fill=fill)

def settype(g,x,y,text,size,color,serif=False):
    f=serif_font(size) if serif else font(size)
    g.text((x,y),text,fill=color,font=f,anchor='lt',stroke_width=0)

@lru_cache(None)
def serif_font(size):
    return ImageFont.truetype(str(FONT_DIR/'instrument-serif.ttf'),size)

# Use the contours from the actual Wallace Shift brand asset.
svg=(Path(__file__).resolve().parents[2]/'public/brand/wallace-shift-logo-white.svg').read_text()
def contours(path):
    x=y=0; pts=[]
    for op,args in re.findall(r'([MLHVZ])([^MLHVZ]*)',path):
        vals=[int(n) for n in re.findall(r'-?\d+',args)]
        if op in 'ML': x,y=vals
        if op=='H': x=vals[0]
        if op=='V': y=vals[0]
        if op!='Z':pts.append((x-124,y-291))
    return pts
MARK=[contours(path) for path in re.findall(r'<path d="([^"]+)',svg)]
def mark(g,x,y,w,color):
    for pts in MARK:g.polygon([(x+a*w/1025,y+b*w/1025) for a,b in pts],fill=color)

def tile(x,y):
    return (827+x*63+y*34,86-x*29+y*43)

def roof(g,t):
    # Offset overlapping courses of slate, with individual lips catching the rain.
    z=smooth(t/.85); drift=(1-z)*65+8*math.sin(t*.8)
    for row in range(10):
        for col in range(-3,14):
            a=col+(row%2)*.5
            pts=[tile(a+dx,row+dy) for dx,dy in ((0,0),(.98,0),(.98,.93),(.06,.93),(0,.83))]
            pts=[(x+drift,y) for x,y in pts]
            shade=.16+.35*(1+math.sin(col*5.3+row*9.4))*.5+.20*(1+math.cos(row*.6+t*.8))*.5
            g.polygon(pts,fill=mix('#0B172D','#3973BA',shade))
            g.line(pts[2:4],fill=mix('#315580','#8FBCE8',shade),width=2)
    for n in range(52):
        x=(641+n*153.7-t*88)%1480; y=(n*73+t*(380+n%7*19))%830-90
        if x<645:continue
        g.line((x,y,x-9,y+24),fill=mix('#192442',SKY,.19+(n%5)*.08),width=2)
    for n in range(4):
        u=(t*.79+n*.25)%1; x=962+n%2*99; y=254+n*49
        g.ellipse((x-44*u,y-13*u,x+44*u,y+13*u),outline=mix(SKY,'#2D4260',u),width=2)

def hook(img,t):
    g=ImageDraw.Draw(img);g.rectangle((0,0,W,H),fill=INK)
    roof(g,t)
    # A deep ink diagonal gives the type an uninterrupted surface.
    g.polygon([(0,0),(755,0),(565,720),(0,720)],fill=INK)
    mark(g,61,47,65,SKY)
    label(g,(61,143),'A HOMEOWNER’S SEARCH',23,SKY)
    if t<1.95:
        settype(g,54,228+(1-smooth(t/.40))*72,'One roof',121,PEARL)
        settype(g,58,389+(1-smooth((t-.13)/.43))*64,'leak.',171,LIME,True)
    else:
        u=smooth((t-1.95)/.38)
        settype(g,55,218+(1-u)*48,'How does',104,PEARL)
        settype(g,55,342+(1-u)*55,'Nora find',104,PEARL)
        settype(g,55,469+(1-u)*61,'a roofer?',109,LIME,True)
    # Capture the droplet, then swing the camera through its expanding blue iris.
    if t>3.47:
        u=smooth((t-3.47)/.53); x=1027-500*u; y=298+35*u
        ellipse(g,x,y,12+1000*u**2,BLUE)

def curve(g,points,u,color,width):
    a,b,c,d=points; path=[]
    for i in range(66):
        t=i/65*u; v=1-t
        path.append(tuple(v**3*a[j]+3*v*v*t*b[j]+3*v*t*t*c[j]+t**3*d[j] for j in (0,1)))
    g.line(path,fill=color,width=width)
    return path[-1]

def web(img,t):
    g=ImageDraw.Draw(img);g.rectangle((0,0,W,H),fill=PEARL)
    t-=24
    # Media paths physically run into the inspection form.
    for i,(name,y,col) in enumerate([('SOCIAL',130,BLUE),('SEARCH',278,INK),('ANSWERS',425,BLUE),('ADS',580,INK)]):
        u=smooth((t-i*.095)/.85)
        end=curve(g,[(-35,y),(240,y),(378,454+i*9),(610,454+i*9)],u,col,4)
        label(g,(47,y-47),name,25,col)
        if u:
            dot=curve(g,[(-35,y),(240,y),(378,454+i*9),(610,454+i*9)],(t*.46+i*.22)%1,col,1)
            ellipse(g,*dot,8,BLUE)
    x=int(524+800*(1-smooth(t/.67)))
    g.rounded_rectangle((x+16,67,x+690,655),radius=25,fill=SKY)
    g.rounded_rectangle((x,52,x+674,636),radius=25,fill=INK)
    label(g,(x+38,87),'THE WEBSITE',25,SKY)
    g.line((x+38,138,x+636,138),fill='#405067',width=2)
    settype(g,x+34,170,'Turn interest',78,PEARL)
    settype(g,x+34,264,'into an enquiry.',77,LIME,True)
    label(g,(x+39,377),'Roof leak inspections',30,PEARL)
    label(g,(x+40,425),'Share a photo. Ask for a visit.',24,SKY,False)
    hit=smooth((t-3.87)/.3); btn=mix(BLUE,LIME,hit)
    g.rounded_rectangle((x+37,500,x+637,585),radius=43,fill=btn)
    label(g,(x+74,526),'Enquiry sent' if hit>.65 else 'Request an inspection',33,INK if hit>.65 else PEARL)
    if hit>.65:
        g.line([(x+557,543),(x+566,552),(x+584,530)],fill=INK,width=5)
    else:
        g.line([(x+556,553),(x+578,531),(x+560,531)],fill=PEARL,width=4)
        g.line((x+578,531,x+578,550),fill=PEARL,width=4)
    if t>2:
        p=smooth((t-2)/1.95); px=1120-82*p; py=733-174*p
        g.polygon([(px,py),(px+4,py+46),(px+16,py+33),(px+32,py+31)],fill=PEARL,outline=INK,width=3)
        if 3.91<t<4.68:
            r=(t-3.91)*90+8;g.ellipse((px-r,py-r,px+r,py+r),outline=PEARL,width=3)
    if t>5.61:
        u=smooth((t-5.61)/.39);g.polygon([(0,720),(1280,720),(1280,720-880*u),(0,870-880*u)],fill=BLUE)

def finale(img,t):
    t-=48;g=ImageDraw.Draw(img);g.rectangle((0,0,W,H),fill=BLUE)
    # The rails share a single destination, then become the real monogram.
    if t<2.7:
        for i in range(9):
            end=(1165,369+i*3)
            pts=[(-80,180+i*84),(604,810-i*64),(708,159+i*35),end]
            curve(g,pts,smooth((t+.1-i*.035)/1.2),mix(BLUE,SKY,.34),4)
            p=curve(g,pts,clamp((t*.63-i*.041)),mix(BLUE,SKY,.60),3)
            ellipse(g,*p,7,LIME)
        g.rectangle((45,74,786,358),fill=BLUE)
        label(g,(63,87),'ONE ENQUIRY. ONE OWNER.',26,LIME)
        settype(g,58,149,'One clear',97,PEARL)
        settype(g,57,263,'next step.',108,PEARL,True)
    else:
        u=smooth((t-2.7)/.62)
        for n in range(6,0,-1):
            slide=(1-u)*n*65
            mark(g,75+slide,192,288,mix(BLUE,SKY,(1-u)*.8))
        mark(g,75+(1-u)*520,192,288,LIME)
        label(g,(423,190),'WALLACE',87,PEARL)
        label(g,(423,287),'SHIFT',87,PEARL)
        g.line((77,438,1195,438),fill=SKY,width=2)
        label(g,(79,480),'Custom CRMs and AI integration',39,PEARL)
        label(g,(80,580),'wallaceshift.com',31,LIME)
