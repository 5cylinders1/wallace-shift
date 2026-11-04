"""The question, the website handoff and the press-printed signature."""
from desk import *
import math
import re

def lerp(a,b,p):return a+(b-a)*p

def tracked(g,x,y,text,size,spacing,fill):
    f=font(size)
    for ch in text:
        g.text((x,y),ch,font=f,fill=fill,anchor='lt')
        x+=f.getlength(ch)+spacing

def ring(g,cx,cy,r,width,col):
    g.ellipse((cx-r,cy-r,cx+r,cy+r),outline=col,width=width)

def ticket(text,w,h,bg,fg,size):
    tile=Image.new('RGBA',(w,h))
    d=ImageDraw.Draw(tile)
    d.rectangle((0,0,w,h),fill=bg)
    d.text((w//2,h//2-2),text,font=font(size),fill=fg,anchor='mm')
    return tile

def place(im,asset,cx,cy,angle):
    tile=asset.rotate(angle,Image.Resampling.BICUBIC,expand=True)
    im.paste(tile,(round(cx-tile.width/2),round(cy-tile.height/2)),tile)

@lru_cache(None)
def question_strip():
    return ticket('How do I get started?',1000,184,PAPER,INK,82)

def opening(im,t):
    base(im,BLUE)
    d=ImageDraw.Draw(im)
    for j in range(16):
        x=840+j*28
        d.line((x+34*math.sin(t+j*.12),-40,x-340,790),fill='#4264FF',width=2)
    # Start inside the inked perimeter of an enormous question mark.
    rise=ease(0,1.04,t)
    for j in range(5):
        dx=(1-rise)*245-j*7
        txt(d,815+dx,-163+j*6,'?',685,('#142766','#193199','#2640BA','#7A9CFF',ICE)[j])
    if t<1.59:
        txt(d,63,170+(1-rise)*36,'A lead starts',88,PAPER)
        txt(d,63,284+(1-rise)*36,'with a question.',84,PAPER)
    else:
        k=ease(1.59,2.12,t)
        # Multiple impressions register into one readable strip.
        for j,col in enumerate((INK,PINK,PAPER)):
            cx=lerp(-660-j*65,628+j*3,k)
            cy=383-j*10
            tile=question_strip() if col==PAPER else ticket('',1000,184,col,INK,82)
            place(im,tile,cx,cy,7-(k*2))
        if t>2.25:
            tracked(d,85,551,'A CUSTOMER WANTS TO KNOW',19,2,ICE)
    if t>3.67:
        q=ease(3.67,4,t); d.polygon([(0,720),(1280,720),(1280,720-890*q),(0,865-890*q)],fill=PAPER)

def web(im,t):
    q=t-24
    base(im,PAPER); d=ImageDraw.Draw(im)
    # A page on the press moves into registration, then folds into an enquiry.
    for n in range(12):
        x=32+n*115
        d.line((x,35,x,42 if n%3 else 52),fill=INK,width=2)
    txt(d,61,76,'THE WEBSITE',25,BLUE)
    if q<2.52:
        txt(d,53,167+(1-ease(0,.52,q))*53,'Show what',108,INK)
        txt(d,53,296+(1-ease(.10,.65,q))*53,'you offer.',108,INK)
    else:
        txt(d,53,167+(1-ease(2.52,3.01,q))*53,'Make it easy',88,INK)
        txt(d,53,288+(1-ease(2.65,3.12,q))*53,'to ask.',113,BLUE)
    # The customer's question physically passes through the website.
    zoom=ease(.05,.74,q); x=round(710+610*(1-zoom)); y=156
    snippet=Image.new('RGBA',(464,381),BLUE);g=ImageDraw.Draw(snippet)
    g.line((28,53,436,53),fill=ICE,width=2)
    for j in range(3):g.ellipse((31+j*14,25,36+j*14,30),fill=PAPER)
    txt(g,31,84,'Get in touch',49,PAPER)
    g.rounded_rectangle((30,166,435,253),radius=9,fill=PAPER)
    typed='How do I get started?'
    n=round(len(typed)*ease(.93,2.54,q))
    txt(g,44,193,typed[:n],29,INK,False)
    if q<3.67:
        pos=44+font(29,False).getlength(typed[:n])
        g.line((pos+2,190,pos+2,224),fill=BLUE,width=2)
    g.rounded_rectangle((30,285,269,348),radius=32,fill=PINK if q>3.91 else ICE)
    txt(g,58,304,'Sent' if q>3.91 else 'Send enquiry',26,INK)
    depart=ease(4.32,5.46,q)
    if depart<1:
        w=round(464*(1-depart*.59)); h=max(2,round(381*(1-depart*.93)))
        compressed=snippet.resize((w,h),Image.Resampling.LANCZOS)
        place(im,compressed,x+232+depart*110,y+190-depart*305,depart*24)
    if q>2.6 and q<4.35:
        k=ease(2.60,3.91,q);xx=x+lerp(484,158,k);yy=y+lerp(454,316,k)
        d.polygon([(xx,yy),(xx+7,yy+42),(xx+17,yy+27),(xx+32,yy+25)],fill=INK,outline=PAPER,width=3)
    if q>5.10:
        k=ease(5.1,5.93,q)
        d.rectangle((0,round(H*(1-k)),W,H),fill=INK)
        if k>.42:
            txt(d,68,round(H*(1-k))+53,'One enquiry arrives.',69,PAPER)

def mark_paths():
    path=Path(__file__).resolve().parents[2]/'public/brand/wallace-shift-logo-white.svg'
    shapes=[]
    for outline in re.findall(r'<path d="([^"]+)',path.read_text()):
        x=y=0;pts=[]
        for op,vals in re.findall(r'([MLHVZ])([^MLHVZ]*)',outline):
            nums=[int(n) for n in re.findall(r'-?\d+',vals)]
            if op in ('M','L'):x,y=nums
            if op=='H':x=nums[0]
            if op=='V':y=nums[0]
            if op!='Z':pts.append((x-124,y-291))
        shapes.append(pts)
    return shapes
MARK=mark_paths()
def mark(d,x,y,w,col):
    for pts in MARK:
        d.polygon([(x+u*w/1025,y+v*w/1025) for u,v in pts],fill=col)

def close(im,t):
    q=t-48;base(im,INK);d=ImageDraw.Draw(im)
    if q<2.64:
        k=ease(0,.68,q)
        for j,col in enumerate((BLUE,ICE,PINK)):
            y=186+j*47; dx=(1-k)*(640+j*165)
            d.polygon([(0,y),(365-dx,y),(503-dx,y+94),(1199,y+94),(1199,y+98),(500-dx,y+98),(364-dx,y+4),(0,y+4)],fill=col)
        tile=ticket('Who owns the next reply?',1100,154,PAPER,INK,71)
        place(im,tile,640+(1-k)*460,385,-3+3*k)
    if q>2.31:
        u=ease(2.31,2.91,q);d.polygon([(0,-150),(1280,-150),(1280,-148+900*u),(0,-7+900*u)],fill=BLUE)
        if q>2.69:
            u=ease(2.69,3.31,q)
            mark(d,82,180+(1-u)*40,282,PAPER)
            txt(d,419,183+(1-u)*40,'Wallace Shift',98,PAPER)
            txt(d,425,331+(1-u)*32,'Custom CRMs and AI integration',36,ICE,False)
            d.line((82,463,82+1114*u,463),fill=ICE,width=2)
            if q>3.32:
                txt(d,84,515,'Discuss your system',41,PAPER)
                txt(d,85,606,'wallaceshift.com',28,ICE)
