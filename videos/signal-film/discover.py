"""One travelling light crosses four discovery channels in a continuous field."""
from math import cos, sin, pi
from PIL import ImageDraw, ImageColor
from signal_art import *

TAU=2*pi
ROUTES=13

def mix(a,b,f):
    return a+(b-a)*f

def point(a,b,f):
    return mix(a[0],b[0],f),mix(a[1],b[1],f)

def rgb(c):
    return ImageColor.getrgb(c) if isinstance(c,str) else c

def tint(a,b,f):
    return tuple(round(mix(x,y,f)) for x,y in zip(rgb(a),rgb(b)))

def phase(a,b,t):
    return s((t-a)/(b-a))

def social(u,j,t):
    # One shared post fans outward. Node depth controls the spacing of each feed.
    v=(j-(ROUTES-1)/2)/((ROUTES-1)/2)
    source=(610,375)
    end=(1150-83*v*v,344+255*v)
    x,y=point(source,end,u)
    return (x+82*sin(u*pi)*(1-abs(v)*.62),
            y+86*sin(u*TAU+.4*v)*sin(u*pi)*(.55+abs(v))+
            sin(pi*u)*v*42)

def organic(u,j,t):
    # Filaments converge to form a tilted, volumetric optical lens.
    v=(j-(ROUTES-1)/2)/((ROUTES-1)/2)
    a=u*TAU-.65
    depth=.7+.3*cos(v*pi*.5)
    px=157*depth*cos(a)
    py=182*depth*sin(a)
    rot=-.43+.05*sin(t*.55)
    return (912+px*cos(rot)-py*sin(rot)+v*36,
            330+px*sin(rot)+py*cos(rot)-v*24)

def answers(u,j,t):
    # A pair of waves cross between question and answer.
    v=(j-(ROUTES-1)/2)/((ROUTES-1)/2)
    return (76+483*u+16*sin(pi*u)*v,
            369-109*sin(TAU*u+.2)*sin(pi*u)+
            70*sin(TAU*u+v*pi*.68)*sin(pi*u)+v*91*cos(pi*u))

def bought(u,j,t):
    # Search rays enter across the field, then bend toward the active query.
    v=(j-(ROUTES-1)/2)/((ROUTES-1)/2)
    return (645+553*u,
            348+v*209*(1-phase(.15,.94,u))+104*sin(pi*u)*v-
            43*sin(TAU*u)*sin(pi*u))

def sculpture(t):
    elapsed=t-4
    scene=min(3,int(elapsed/5))
    age=elapsed-scene*5
    shapes=(social,organic,answers,bought)
    transformation=phase(0,1.12,age) if scene else 1
    paths=[]
    for j in range(ROUTES):
        current=[]
        for k in range(65):
            u=k/64
            p=shapes[scene](u,j,t)
            if scene and transformation<1:
                p=point(shapes[scene-1](u,j,t),p,transformation)
            if elapsed<.68:
                p=point((640,360),p,phase(0,.67,elapsed))
            if elapsed>19.46:
                p=point(p,(640,360),phase(19.46,20,elapsed))
            current.append(p)
        paths.append(current)
    return paths,scene,age

def travel(paths,t):
    # A continuous tip moves forward, then back across the same filament.
    u=(1-cos((t-4)*pi/2.55))/2
    n=min(63,int(u*64))
    return point(paths[6][n],paths[6][n+1],u*64-n)

def display(draw,t,start,end,lines,xy,size,color=PAPER):
    """Resolve each line out of its own baseline, then lift it off together."""
    for i,line in enumerate(lines):
        incoming=phase(start+i*.065,start+.42+i*.065,t)
        outgoing=phase(end-.29,end,t)
        opacity=incoming*(1-outgoing)
        if opacity<.015: continue
        x,y=xy
        txt(draw,(x+int(16*(1-incoming)),y+i*(size+6)+
                  int((1-incoming)*18-outgoing*13)),line,size,tint(INK,color,opacity))

def small(draw,t,a,b,text,x,y):
    display(draw,t,a,b,[text],(x,y),25,ICE)

def copy(draw,t):
    # Examples are integrated into the signal, separate from the film's main verb.
    display(draw,t,4.00,6.43,['A neighbor shares','your roof repair clip.'],(62,239),58)
    small(draw,t,4.20,6.43,'Organic social',65,185)
    display(draw,t,6.43,9.00,['Paid social puts it','in nearby feeds.'],(62,239),61)
    display(draw,t,9.03,14.00,['SEO helps people','find your service','in search.'],(63,203),61)
    small(draw,t,10.15,14,'“Roof leak repair near me”',65,465)
    display(draw,t,14.02,19.00,['AEO gives answer','engines a source','they can cite.'],(659,203),56)
    small(draw,t,14.9,16.97,'“Does a ceiling stain mean a new roof?”',660,463)
    small(draw,t,16.97,19.00,'A stain alone can’t tell you.',660,463)
    display(draw,t,19.02,24.00,['SEM places an ad','where someone','is looking.'],(63,203),60)
    small(draw,t,19.80,24.00,'Paid search  /  “Roof inspection near me”',65,465)

def draw(im,t):
    base(im,t)
    d=ImageDraw.Draw(im)
    paths,scene,age=sculpture(t)
    # The disappearing coordinates follow different depth planes.
    for n,word in enumerate(('xy [ 0, 1 ]','0010','λ  ·  0.84','v[2]','10.011')):
        x=(168+n*283+t*(5+n*1.8))%W
        y=(70+n*151+14*sin(t*.42+n))%H
        txt(d,(x,y),word,13+n%3,tint(INK,ICE,.12+.04*(1+cos(t*.63+n))),False)
    for j,p in enumerate(paths):
        center=abs(j-6)
        color=tint(INK,ICE,.24+.39*(1-center/6))
        d.line(p,fill=color,width=2 if j%4==0 else 1)
        # A second, high-intensity streak moves over each existing route.
        k=int(((t*.19+j*.073)%1)*61)
        d.line(p[k:k+4],fill=tint(color,ICE,.5),width=1)
    # The highlighted route persists through each topology change.
    d.line(paths[6],fill=tint(INK,ICE,.56),width=2)
    if scene==0:
        visibility=phase(4.5,5.5,t)*(1-phase(8.7,9,t))
        for j in (0,3,6,9,12):
            x,y=paths[j][-1]; r=3.5+1.2*cos(t*2+j)
            d.ellipse((x-r,y-r,x+r,y+r),fill=tint(INK,PAPER,visibility*.8))
    if scene==1:
        # Extending the lens handle transforms the wires into a search icon.
        vis=phase(.56,1.45,age)*(1-phase(4.48,5,age))
        d.line((1032,459,1032+91*vis,459+82*vis),fill=tint(INK,ICE,vis*.8),width=4)
    if scene==2:
        vis=phase(.75,1.15,age)*(1-phase(4.48,5,age))
        for i,p in enumerate([paths[6][0],paths[6][-1]]):
            if i==0:
                txt(d,(p[0]-13,p[1]-73),'?',39,tint(INK,ICE,.84*vis))
            else:
                x,y=p; co=tint(INK,ICE,.84*vis)
                d.line((x-12,y-43,x+12,y-67,x+12,y-50),fill=co,width=3)
                d.line((x-5,y-67,x+12,y-67),fill=co,width=3)
    if scene==3:
        # The ad location becomes a target on the converged search rays.
        vis=phase(.55,1.25,age)*(1-phase(4.35,4.68,age))
        cx,cy=paths[6][-1]
        for n in range(3):
            r=11+n*11+5*sin(t*2)
            d.arc((cx-r,cy-r,cx+r,cy+r),-83+n*23,189+n*23,
                  fill=tint(INK,ICE,vis*(.8-n*.2)),width=2)
    x,y=travel(paths,t)
    orb(im,x,y,7,BLUE)
    copy(ImageDraw.Draw(im),t)
