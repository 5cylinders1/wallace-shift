"""One enquiry separates into three strands of evidence, then coheres into a record."""
from math import sin, cos, pi
from PIL import Image, ImageDraw, ImageFilter, ImageColor
from signal_art import W,H,INK,PAPER,BLUE,ICE,PINK,font,s,ease,orb,base

O=(640.,360.)
ENDPOINTS=[(920.,160.),(985.,385.),(823.,570.)]
RECORD=[(682.,245.),(682.,328.),(682.,411.)]
FAMILY=[ICE,BLUE,PINK]


def mix(a,b,u):
    return a+(b-a)*u


def lerp(a,b,u):
    return tuple(mix(x,y,u) for x,y in zip(a,b))


def clamp(a):
    return min(1,max(0,a))


def rgb(c):
    return ImageColor.getrgb(c) if isinstance(c,str) else c[:3]


def light(c,k):
    return tuple(round(mix(a,b,clamp(k))) for a,b in zip(rgb(INK),rgb(c)))


def phrase(d,x,y,string,size,alpha=1,color=PAPER,bold=False):
    if alpha>.003:
        d.text((round(x),round(y)),string,font=font(size,bold),fill=light(color,alpha),anchor='lt')


def horizon(t,n):
    # Destinations drift apart on different depth planes. Keep their labels in frame.
    angle=(t-29)*.37+n*2.11
    x,y=ENDPOINTS[n]
    return x+24*sin(angle),y+14*cos(angle*.82)


def knot_point(t,n,f,layer):
    """Perspective projection of three helical splines with displaced endpoints."""
    spread=ease(29.12,31.35,t)
    twist=ease(31.2,35.2,t)*(1-ease(36.8,39.9,t))
    gather=ease(37.0,40.4,t)
    close=ease(46.55,47.96,t)
    start=lerp(O,(572.,330.),spread)
    start=lerp(start,(585.,328.),gather)
    dest=lerp(horizon(t,n),RECORD[n],gather)
    a=n*2*pi/3
    envelope=sin(pi*f)
    time=t-29
    # A low frequency sweep splits the light beam; a six-axis braid grows within it.
    theta=pi*(1.55+2.6*twist)*f+a+.38*time
    theta+=(layer-3)*.081
    rad=(54+135*twist)*(1-gather)*envelope
    depth=sin(theta+.42)
    px=mix(start[0],dest[0],f)+rad*(.78*cos(theta)+.28*cos(1.8*theta)) + sin(pi*f)*(layer-3)*1.6
    py=mix(start[1],dest[1],f)+rad*(sin(theta)+.22*sin(2.1*theta))
    # Sweep the fiber webs toward the appointment draft, then release one point.
    px,py=lerp(start,(px,py),spread)
    # A conical fan rolls into the question, then changes into the review mark.
    draft=ease(42.48,43.55,t)
    if draft:
        review=ease(44.35,45.5,t)
        a=(n-1)*.2+layer*.019+(t-43)*.18
        if f<.70:
            g=f/.70
            ang=pi+g*pi*1.64
            xx=905+83*cos(ang); yy=283+80*sin(ang)
        else:
            g=(f-.70)/.30
            sx=905+83*cos(pi*2.64); sy=283+80*sin(pi*2.64)
            xx=mix(sx,895,g)+9*sin(pi*g); yy=mix(sy,409,g)
        xx+=sin(pi*f)*17*cos(a+5*f)
        yy+=sin(pi*f)*13*sin(a+5*f)
        if f<.34:
            g=f/.34
            cx=mix(775,864,g); cy=mix(335,413,g)
        else:
            g=(f-.34)/.66
            cx=mix(864,1071,g); cy=mix(413,211,g)
        cx+=6*(n-1)+sin(pi*f)*(layer-3)*2.2
        cy+=7*(n-1)+cos(pi*f)*(layer-3)*1.8
        xx,yy=lerp((xx,yy),(cx,cy),review)
        px,py=lerp((px,py),(xx,yy),draft)
    px,py=lerp((px,py),O,close)
    return px,py,depth


def contour(d,glow,coords,c,width=1):
    # Light falls away on the back-facing portions of each filament.
    for start in range(0,len(coords)-1,6):
        group=coords[start:start+7]
        line=[(round(x),round(y)) for x,y,z in group]
        dep=.52+.46*(group[len(group)//2][2]+1)/2
        d.line(line,fill=light(c,dep*width/2),width=width)
    if width==2:
        small=[(round(x/3),round(y/3)) for x,y,z in coords]
        glow.line(small,fill=light(c,.42),width=2)


def draw(im,t):
    base(im,t)
    d=ImageDraw.Draw(im)
    halo=Image.new('RGB',(W//3,H//3),rgb(INK))
    low=ImageDraw.Draw(halo)
    collapse=ease(46.55,47.96,t)
    exitlines=ease(44,46.45,t)
    strands=[]
    for n in range(3):
        launch=clamp((t-29-n*.14)/1.28)
        if launch<=0:continue
        for k in range(7):
            coords=[knot_point(t,n,launch*j/78,k) for j in range(79)]
            strands.append((n,k,coords))
            if k==3:
                low.line([(round(x/3),round(y/3)) for x,y,z in coords],fill=light(FAMILY[n],.50*(1-exitlines*.48)),width=4)
    # Screen the small blurred layer over the undisturbed star field.
    halo=halo.filter(ImageFilter.GaussianBlur(3))
    from PIL import ImageChops
    halo=ImageChops.subtract(halo,Image.new('RGB',halo.size,rgb(INK))).resize((W,H),Image.Resampling.BILINEAR)
    im.paste(ImageChops.screen(im,halo));d=ImageDraw.Draw(im)
    for n,k,coords in strands:
        contour(d,low,coords,light(FAMILY[n],(1-exitlines*.12)*(1-.5*abs(k-3)/3)),2 if k==3 else 1)
        if k==3:
            # Two traveling packets per source make the missing handoffs visible.
            for i in range(2):
                f=(t*.28+i*.48+n*.3)%1
                j=min(len(coords)-1,round(f*(len(coords)-1)))
                x,y,z=coords[j]
                r=3+1.4*z
                d.ellipse((x-r,y-r,x+r,y+r),fill=light(FAMILY[n],.85-exitlines*.4))
    # Source copy is attached to each real endpoint, independent of the argument.
    first=ease(29.65,30.25,t)*(1-ease(32.50,32.95,t))
    phrase(d,66,233,"One",87,first)
    phrase(d,66,330,"enquiry.",87,first,PAPER,True)
    chaos=ease(32.65,33.28,t)*(1-ease(36.45,37.05,t))
    phrase(d,66,225,"Three",88,chaos)
    phrase(d,66,328,"loose ends.",80,chaos,PAPER,True)
    for n,(cap,value) in enumerate([("WEB FORM","Roof inspection"),("SOCIAL DM","Ceiling photo"),("CALL NOTE","Thursday maybe")]):
        u=ease(29.74+n*.55,30.4+n*.55,t)*(1-ease(36.65,37.6,t))
        if u<=0:continue
        x,y=horizon(t,n)
        x+=12*(1-u)
        d.line((x+2,y,x+39,y),fill=light(FAMILY[n],u*.85),width=1)
        phrase(d,x+5,y-48,cap,15,u,FAMILY[n],True)
        phrase(d,x+5,y-19,value,26,u,PAPER,True)
    # Absorb the same three source packets into one named CRM record.
    owned=ease(37.0,37.7,t)*(1-ease(42.45,43.12,t))
    phrase(d,68,213,"AI gathers",69,owned)
    phrase(d,68,300,"the pieces.",74,owned,PAPER,True)
    record=ease(38.35,39.22,t)*(1-ease(42.60,43.28,t))
    if record>0:
        phrase(d,699,150,"ONE CRM RECORD",17,record,ICE,True)
        for n,(k,v) in enumerate([("NORA","Roof inspection"),("ATTACHMENT","Ceiling photo"),("REQUESTED TIME","Thursday, unconfirmed")]):
            r=record*ease(38.48+n*.48,39.1+n*.48,t)
            x,y=RECORD[n]
            phrase(d,x+17,y-20,k,15,r,FAMILY[n],True)
            phrase(d,x+17,y+6,v,32,r,PAPER,n==0)
    # Reply is sentence-sized, with a person visibly owning the last action.
    draft=ease(42.65,43.3,t)*(1-ease(46.65,47.55,t))
    if draft>0:
        # Curl the fibers behind the reply down into one clear baseline.
        phrase(d,69,159,"AI DRAFT",17,draft,ICE,True)
        phrase(d,68,219,"Does Thursday",65,draft)
        phrase(d,68,305,"work for you?",68,draft,PAPER,True)
        dot=ease(42.65,43.5,t)*(1-ease(44.35,45.5,t))
        if dot>.01:orb(im,895,445,r=6*dot,color=ICE)
        approved=ease(44.4,45.15,t)*draft
        phrase(d,72,476,"Jamie reviews before sending.",30,approved,ICE,True)
    # One persistent light artifact carries the cut into and out of the segment.
    if t<30.6:
        x,y=lerp(O,(572,330),ease(29.12,31.35,t))
        orb(im,x,y,r=6,color=ICE)
    if t>=46.55:
        x,y=lerp((585,328),O,collapse)
        orb(im,x,y,r=6,color=ICE)
