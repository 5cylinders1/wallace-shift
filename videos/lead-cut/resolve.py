"""The loose ends of one enquiry pull into a reviewable record, at 30–48 s."""
import math
from functools import lru_cache
from PIL import Image, ImageDraw
from art import INK, PEARL, BLUE, SKY, LIME, font

W, H = 1280, 720
CHALK = "#fffdf7"
COOL = "#aab6ce"
DARK = "#0c1532"
STEEL = "#2b3957"


def clamp(x):
    return min(1.0, max(0.0, x))


def ease(x):
    x = clamp(x)
    return x*x*(3-2*x)


def mix(a,b,u):
    return a + (b-a)*u


def at(t, a, b):
    return ease((t-a)/(b-a))


def txt(d,x,y,s,size,c,b=True):
    d.text((round(x),round(y)),s,font=font(size,b),fill=c,anchor="lt")


def diamond(d,x,y,r,color):
    d.polygon([(x-r,y),(x,y-r),(x+r,y),(x,y+r)],fill=color)


def slip_shape(d,x,y,w,h,color):
    points=[(x,y),(x+w-17,y),(x+w,y+17),(x+w,y+h-7)]
    for i in range(17,-1,-1):
        points.append((x+(w*i/17), y+h-(i%2)*7))
    points.append((x,y+8))
    d.polygon(points,fill=color)


def ring(d,cx,cy,sx,sy,radius,fill):
    points=[]
    for j in range(161):
        a=j*math.pi/80
        factor=(1+.12*math.sin(3*a+.2)+.09*math.cos(5*a-.8)+.045*math.cos(8*a))
        points.append((cx+radius*sx*math.cos(a)*factor,cy+radius*sy*math.sin(a)*factor))
    d.polygon(points,fill=fill)


@lru_cache(maxsize=3)
def slip(n):
    """Three distinct artifacts. Each has a persistent, indexed identity."""
    canvas=Image.new("RGBA",(384,244))
    p=ImageDraw.Draw(canvas)
    if n==0:
        slip_shape(p,5,9,372,223,"#08112c")
        slip_shape(p,0,0,372,223,CHALK)
        txt(p,23,19,"01   /   WEB FORM",18,BLUE)
        p.line((23,49,346,49),fill=INK,width=2)
        txt(p,22,72,"Nora",48,INK)
        txt(p,24,140,"Roof leak inspection",24,INK,False)
        for j in range(32):
            x=23+j*3
            p.line((x,179,x,196),fill=INK,width=1+int(j%7==0))
        txt(p,295,177,"001",16,INK)
    elif n==1:
        # Instant photo from the message, including the stain Nora reported.
        p.polygon([(8,9),(375,9),(375,235),(8,235)],fill="#08112c")
        p.rectangle((0,0,367,226),fill=PEARL)
        p.rectangle((12,12,355,153),fill="#e5dfce")
        p.line((12,49,355,45),fill="#c5bdab",width=3)
        p.line((288,12,285,153),fill="#cdc7b7",width=2)
        for r,c in [(1,"#bab19a"),(.90,"#d3c6aa"),(.78,"#b8ac90"),(.68,"#d4c8ae"),(.54,"#d8cdb4")]:
            ring(p,175,82,91,37,r,c)
        p.rectangle((18,20,80,43),fill=INK)
        txt(p,24,24,"PHOTO",12,CHALK)
        txt(p,17,164,"02   /   SOCIAL DM",18,BLUE)
        txt(p,17,190,"Stain above sink",23,INK)
    else:
        slip_shape(p,8,8,365,218,"#08112c")
        slip_shape(p,0,0,365,218,LIME)
        txt(p,23,19,"03   /   CALL NOTE",18,INK)
        for j in range(4):
            p.line((0,65+j*37,365,65+j*37),fill="#98ae62",width=1)
        txt(p,22,77,"Thursday",43,INK)
        txt(p,23,130,"maybe.",43,INK)
        p.line((25,178,164,174,184,177),fill=BLUE,width=4)
    return canvas


def paste(img, card, x,y,angle,scale=1):
    if scale<.035:return
    if abs(scale-1)>.002:
        card=card.resize((max(1,round(card.width*scale)), max(1,round(card.height*scale))),Image.Resampling.BICUBIC)
    card=card.rotate(angle,Image.Resampling.BICUBIC,expand=True)
    img.paste(card,(round(x-card.width/2),round(y-card.height/2)),card)


def coordinates(t,n):
    starts=[(-210,700),(1430,-160),(1440,830)]
    base=[(260,344),(646,335),(1032,355)]
    toss=[(240,322),(618,374),(1019,304)]
    slant=[5,-4,4]; twist=[-13,10,-16]
    u=at(t,30.0+.53*n,30.76+.53*n)
    v=at(t,33.0,35.5)
    x=mix(starts[n][0],base[n][0],u)+v*(toss[n][0]-base[n][0])+6*v*math.sin(2*t+n)
    y=mix(starts[n][1],base[n][1],u)+v*(toss[n][1]-base[n][1])+6*v*math.cos(2.4*t+n)
    a=mix(slant[n],twist[n],v)+(1-u)*36
    return x,y,a


def spaghetti(d,t,n,progress):
    phase=[.6,2.4,4.8][n]
    colors=[SKY,PEARL,LIME]
    points=[]
    for i in range(181):
        f=i/180
        # One cord per source; knots form as the call, message and form diverge.
        envelope=math.sin(math.pi*f)
        x=-120+1520*f+244*progress*envelope*math.sin(4*math.pi*f+phase+.22*t)
        y=399+(n-1)*31+progress*envelope*(140*math.sin(6*math.pi*f+phase+.19*t)+62*math.sin(12*math.pi*f+.15*t))
        points.append((x,y))
    d.line(points,fill=colors[n],width=3)
    x,y=points[int((.15*t+.21*n)%1*180)]
    diamond(d,x,y,8,colors[n])


def masked_text(img,x,y,text,size,color,p):
    if p<=0:return
    f=font(size,True)
    w=int(f.getlength(text))+5; h=size+18
    text_image=Image.new('RGBA',(w,h))
    txt(ImageDraw.Draw(text_image),0,2,text,size,color)
    m=round(w*clamp(p))
    if m:
        cropped=text_image.crop((0,0,m,h))
        img.paste(cropped,(round(x),round(y)),cropped)


def portrait_record(img,t,opening):
    d=ImageDraw.Draw(img)
    y=145+round(110*(1-opening))
    x=648
    d.polygon([(x+12,y+15),(1194,y+15),(1223,y+44),(1223,y+430),(x+12,y+430)],fill=DARK)
    d.polygon([(x,y),(1182,y),(1211,y+29),(1211,y+415),(x,y+415)],fill=CHALK)
    txt(d,x+30,y+22,"CUSTOM CRM",17,BLUE)
    txt(d,x+400,y+22,"N° 001",18,INK)
    d.line((x+29,y+55,1180,y+55),fill=INK,width=2)
    txt(d,x+28,y+81,"Nora",56,INK)
    txt(d,x+31,y+151,"Roof leak inspection",26,INK,False)
    fields=[("PHOTO","Stain above sink"),("TIME","Thursday requested"),("OWNER","Jamie")]
    for i,(key,value) in enumerate(fields):
        when=at(t,39.1+i*.25,39.7+i*.25)
        if when<=0:continue
        yy=y+218+i*56
        d.line((x+30,yy-12,x+30+round(500*when),yy-12),fill=COOL,width=1)
        txt(d,x+32,yy,key,16,BLUE)
        if when>.44:txt(d,x+145,yy-3,value,24,INK)
    if 41.1<t<44.7:
        prog=at(t,41.1,41.6)
        yy=y+266
        d.rounded_rectangle((x+130,yy-11,x+130+int(358*prog),yy+40),radius=7,fill=LIME)
        if prog>.85:txt(d,x+143,yy+1,"Time unconfirmed",23,INK)


def draw(img,t):
    d=ImageDraw.Draw(img)
    d.rectangle((0,0,W,H),fill=INK if t<38 else BLUE)
    if t<38:
        # Registration crosses and ruled marginalia connect the print artifacts.
        for x in range(44,W,84):
            d.line((x,690,x+7,690),fill=STEEL,width=1)
        txt(d,57,52,"AFTER THE ENQUIRY",18,SKY)
        headline="One customer." if t<32.45 else "Three loose ends."
        enter=at(t,30 if t<32.45 else 32.45,30.45 if t<32.45 else 32.85)
        masked_text(img,55,91,headline,77,PEARL,enter)
        for n in range(3):spaghetti(d,t,n,at(t,30.3,35.2))
        for n in range(3):
            x,y,a=coordinates(t,n)
            paste(img,slip(n),x,y,a)
        if t>34.95:
            masked_text(img,57,579,"Who calls Nora back?",65,LIME,at(t,34.95,35.68))
        return
    # A blue print sweeps over the tangle; the original artifacts feed the record.
    merge=at(t,38,39.9)
    record=at(t,38.65,39.65)
    if t<39:
        d.rectangle((round(W*at(t,38,39)),0,W,H),fill=INK)
    if t<39.5:
        # Knots flatten and compress toward the record as each scrap is filed.
        for n in range(3):
            tx,ty,_=coordinates(t,n)
            points=[]
            for i in range(101):
                f=i/100
                amp=(1-merge)*math.sin(math.pi*f)
                px=mix(tx,782,f)+124*amp*math.sin(f*4*math.pi+n)
                py=mix(ty,376+31*n,f)+95*amp*math.sin(f*6*math.pi+n+.2*t)
                points.append((mix(px,782,merge),mix(py,376+31*n,merge)))
            d.line(points,fill=[SKY,CHALK,LIME][n],width=3)
    if record:portrait_record(img,t,record)
    if t<40:
        for n in range(3):
            x,y,a=coordinates(t,n)
            u=at(t,38+.18*n,39.48+.16*n)
            x=mix(x,756+n*46,u); y=mix(y,367+n*36,u)-math.sin(math.pi*u)*95
            paste(img,slip(n),x,y,mix(a,0,u),1-.99*u)
    if t<44.55:
        s=at(t,38.60,39.22)
        masked_text(img,56,148,"AI gathers",70,CHALK,s)
        masked_text(img,56,226,"the pieces.",70,CHALK,at(t,38.85,39.42))
        if t>40.85:
            masked_text(img,59,380,"A requested time",33,CHALK,at(t,40.85,41.4))
            masked_text(img,59,425,"still needs a person",33,CHALK,at(t,41.04,41.6))
            masked_text(img,59,470,"to confirm it.",33,LIME,at(t,41.24,41.8))
        return
    # The reviewed draft replaces the file in the same locus.
    u=at(t,44.55,45.08)
    d.rectangle((0,0,W,H),fill=BLUE)
    masked_text(img,58,114,"AI drafts.",74,CHALK,u)
    masked_text(img,58,210,"Jamie checks.",74,LIME,at(t,44.85,45.43))
    y=345+round(130*(1-u))
    d.rounded_rectangle((160,y,1180,y+231),radius=24,fill=CHALK)
    d.polygon([(225,y+220),(225,y+254),(274,y+220)],fill=CHALK)
    txt(d,195,y+32,"REPLY DRAFT     /     FOR NORA",18,BLUE)
    txt(d,195,y+85,"Does Thursday afternoon",48,INK)
    txt(d,195,y+144,"still work for you?",48,INK)
    stamp=at(t,46.3,46.9)
    if stamp:
        # A hand-reviewed stamp is the last operation; nothing auto-sends.
        seal=Image.new('RGBA',(290,60))
        sc=ImageDraw.Draw(seal)
        sc.rounded_rectangle((1,1,288,57),radius=8,fill=LIME,outline=INK,width=3)
        txt(sc,20,16,"JAMIE REVIEWED",23,INK)
        paste(img,seal,983,595,-4,1+.3*(1-stamp))
