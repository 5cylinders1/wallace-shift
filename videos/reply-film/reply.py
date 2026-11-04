"""A single question moves through three message channels and one reviewed reply."""
from math import sin, pi
from PIL import Image, ImageDraw
from desk import W,H,INK,PAPER,BLUE,ICE,PINK,font,txt,ease,base


def lerp(a,b,k):
    return a+(b-a)*k


def line(d,x,y,string,size,col,bold=True):
    txt(d,round(x),round(y),string,size,col,bold)


def reveal(im,x,y,words,size,col,u,bold=True):
    if u<=0:return
    face=font(size,bold)
    w=round(face.getlength(words))+6
    tile=Image.new('RGBA',(w,size*2))
    line(ImageDraw.Draw(tile),0,0,words,size,col,bold)
    text=tile.crop((0,0,max(1,round(w*u)),tile.height))
    im.paste(text,(round(x),round(y)),text)


COLORS=lambda: [ICE,PINK,PAPER]
TYPES=["WEB FORM","EMAIL REPLY","DIRECT MESSAGE"]
MESSAGES=["How do I get started?","Here's our first step.","Did my request arrive?"]


def ribbon(im,t,n,x,y,angle,scale=1):
    """Overrunning strips retain their own color and registration mark while folded."""
    w,h=1550,135
    layer=Image.new('RGBA',(w,h))
    p=ImageDraw.Draw(layer)
    p.rectangle((0,0,w,h),fill=COLORS()[n])
    p.rectangle((0,5,w-1,7),fill=INK)
    p.rectangle((0,h-7,w-1,h-6),fill=INK)
    # Marks hold the viewer's place as other ink shifts across the frame.
    for j in range(24):
        mark=j*67+7
        p.line((mark,h-16,mark,h-8),fill=INK,width=1)
    line(p,202,15,TYPES[n],17,INK)
    line(p,201,48,MESSAGES[n],49,INK)
    line(p,1210,44,'0'+str(n+1),49,INK)
    if scale!=1:
        layer=layer.resize((round(w*scale),round(h*scale)),Image.Resampling.BICUBIC)
    layer=layer.rotate(angle,Image.Resampling.BICUBIC,expand=True)
    im.paste(layer,(round(x-layer.width/2),round(y-layer.height/2)),layer)


def draw(im,t):
    base(im,INK)
    d=ImageDraw.Draw(im)
    if t<37.8:
        # The question runs across a single oversize sheet. Three copies cut into its body.
        u=ease(30,30.37,t)
        d.polygon([(0,0),(W,0),(W,685),(1217,720),(0,720)],fill=PAPER)
        line(d,66,59,'INCOMING  /  001',21,BLUE)
        reveal(im,57,148,'How do I',118,INK,u)
        reveal(im,57,299,'get started?',130,BLUE,ease(30.15,30.53,t))
        for n in range(3):
            k=ease(31.55+n*.36,32.55+n*.36,t)
            if not k:continue
            spun=ease(33.35,35.15,t)
            flat=ease(36.85,37.8,t)
            drift=sin(t*1.1+n*2)
            x=lerp(lerp(-820 if n%2==0 else 2100,635+25*drift,k),635,flat)
            y0=[171,356,510][n]
            y=lerp(y0,y0+[18,-45,-40][n]*spun,1-flat)
            angle=lerp([4,-6,3][n]+spun*[-5,12,-7][n],0,flat)
            ribbon(im,t,n,x,y,angle)
        # Overprint a single urgent consequence across the occupied desk.
        over=ease(34.65,35.15,t)*(1-ease(36.92,37.65,t))
        if over:
            h=round(142*over)
            d.rectangle((0,563,1280,563+h),fill=INK)
            if over>.5:
                reveal(im,48,601,'Two people reply. One DM waits.',65,PAPER,over)
        return
    # The three strips line up over an ink-blue field, then fold into one CRM record.
    base(im,BLUE)
    d=ImageDraw.Draw(im)
    merge=ease(37.8,39.65,t)
    for n in range(3):
        u=ease(37.8+n*.13,39.45+n*.10,t)
        if u>=1:continue
        x=lerp(635,1038,u); y=lerp([171,356,510][n],555,u)
        ribbon(im,t,n,x,y,0,1-.96*u)
    if t<40.2:
        u=ease(37.94,38.56,t)
        # Camera rides over the flat strip edges as the team checks correspondence.
        if u:
            panel=round(545*u)
            d.rectangle((0,0,1280,panel),fill=BLUE)
            reveal(im,54,133,'Team links the',83,PAPER,u)
            reveal(im,54,235,'three messages.',88,PAPER,ease(38.18,38.73,t))
            line(d,62,435,'ONE ENQUIRY   /   SOURCES CHECKED',21,ICE)
    if 39.65<=t<43.35:
        # The CRM's typeset note is printed directly from the source ribbons.
        u=ease(39.65,40.35,t)
        left=round(1280*(1-u))
        d.rectangle((left,0,1280,720),fill=PAPER)
        if u>0:
            line(d,left+60,62,'CUSTOMER RECORD   /   CRM',23,BLUE)
            line(d,left+59,177,'AI summary',89,INK)
            line(d,left+61,314,'UNANSWERED QUESTION',23,BLUE)
            reveal(im,left+58,374,'Wants next steps.',66,INK,ease(40.06,40.65,t))
            reveal(im,left+58,467,'DM still unanswered.',62,INK,ease(40.44,41.04,t))
            line(d,left+61,614,'FROM THE FORM, EMAIL AND DM',22,BLUE)
        return
    if t<39.65:return
    # A fold turns the summary over; the other side carries the reply draft.
    u=ease(43.35,43.83,t)
    base(im,PAPER)
    d=ImageDraw.Draw(im)
    edge=round(1280*u)
    d.polygon([(0,0),(edge,0),(max(0,edge-38+38*u),720),(0,720)],fill=INK)
    if 0<u<1:
        d.polygon([(edge,0),(min(W,edge+55),0),(edge+12,720),(max(0,edge-38+38*u),720)],fill=ICE)
    if u>.05:
        reveal(im,60,67,'AI REPLY DRAFT',24,ICE,u)
        reveal(im,55,188,'Yes, we got your request.',72,PAPER,u)
        reveal(im,55,301,'I’ll send the next steps here.',69,PAPER,u)
    # A human checks and takes ownership; the text remains readable through the cut.
    check=ease(45.14,45.75,t)
    if check:
        d.rectangle((0,513,round(1280*check),720),fill=ICE)
        reveal(im,60,550,'One person checks the draft',48,INK,check)
        reveal(im,60,623,'and follows up.',39,INK,ease(45.34,46.05,t))
