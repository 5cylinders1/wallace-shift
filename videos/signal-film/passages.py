"""Camera inserts inside the signal. Each payload is a customer-facing example."""
from signal_art import *
from PIL import ImageChops

def tint(a,b,u):
    a=ImageColor.getrgb(a); b=ImageColor.getrgb(b)
    return tuple(int(i*(1-u)+j*u) for i,j in zip(a,b))

def center(g,y,text,size,color,bold=True,x=640):
    g.text((x,y),text,font=font(size,bold),fill=color,anchor='mm')

def portal(im,t,start,end,kind):
    age=t-start
    blend=ease(start,start+.24,t)*(1-ease(end-.28,end,t))
    if blend<.001:return
    layer=Image.new('RGB',(W,H));base(layer,t);d=ImageDraw.Draw(layer)
    vp=(640,355)
    # The camera rides through hollow apertures. Closer filaments accelerate
    # and spread apart by perspective while the payload stays in focus.
    for n in range(14):
        depth=(n/14+age*.34)%1
        scale=(.015+1/(1.24-depth)-.80)
        rw=scale*310; rh=scale*122
        if rw<7:continue
        x,y=vp
        col=tint('#151C37','#657FC0',.08+depth*.57)
        d.arc((x-rw,y-rh,x+rw,y+rh),199,326,fill=col,width=1+int(depth>.93))
        d.arc((x-rw,y-rh,x+rw,y+rh),23,151,fill=col,width=1)
    veil=Image.new('RGBA',(W,240))
    for y in range(240):
        opacity=int(205*math.sin(math.pi*y/240)**.5)
        ImageDraw.Draw(veil).line((0,y,W,y),fill=(8,11,24,opacity))
    layer.paste(veil,(0,234),veil)
    d=ImageDraw.Draw(layer)
    slide=(1-ease(0,.31,age))*38
    if kind=='search':
        center(d,258,'NORA SEARCHES',20,ICE)
        center(d,351+slide,'“Roof leak repair near me”',65,PAPER)
        x=328+int(625*ease(.18,.91,age));d.line((328,407,x,407),fill=BLUE,width=3)
        if age>.53:
            center(d,460,'Service page    /    Local roof inspections',30,ICE,False)
    elif kind=='answer':
        center(d,254,'FROM THE ROOFER’S ANSWER',21,ICE)
        center(d,340+slide,'A stain alone can’t tell you.',61,PAPER)
        center(d,426,'An inspection finds the source.',41,ICE,False)
    else:
        center(d,251,'PAID SEARCH    /    SPONSORED',21,ICE)
        center(d,350+slide,'Book a roof inspection',73,PAPER)
        center(d,434,'For homeowners searching nearby',35,ICE,False)
    orb(layer,640,516,5)
    im.paste(Image.blend(im,layer,blend))

def lost(im,t):
    strength=ease(34.38,34.98,t)*(1-ease(36.55,37.03,t))
    if strength<.001:return
    layer=Image.new('RGB',(W,H));base(layer,t);g=ImageDraw.Draw(layer)
    # Follow three source fragments on different depth planes, into the tangle.
    for n in range(25):
        hue=[ICE,PINK,BLUE][n%3]; phase=n*.48+t*.57
        pts=[]
        for j in range(88):
            f=j/87; x=93+f*1110+73*math.sin(f*9+phase)
            y=352+math.sin(f*6.8+phase)*117+math.sin(f*13+n*.19)*64
            pts.append((x,y))
        wire(g,pts,1,tint(INK,hue,.13 if n%4 else .42),1 if n%4 else 2)
    center(g,147,'FORM    /    PHOTO    /    CALL NOTE',22,ICE)
    # Large foreground type deliberately eclipses the strands.
    text='Who calls Nora back?'
    ft=font(85); box=g.textbbox((640,352),text,font=ft,anchor='mm')
    g.rectangle((box[0]-24,box[1]-11,box[2]+24,box[3]+11),fill='#0A0D1B')
    center(g,352,text,85,PAPER)
    for j,words in enumerate(['roof inspection','ceiling photo','Thursday maybe']):
        center(g,530+j%2*55,words,25,ICE,False,250+390*j+16*math.sin(t*.85+j))
    im.paste(Image.blend(im,layer,strength))
