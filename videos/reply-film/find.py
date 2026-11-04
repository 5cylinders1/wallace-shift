"""Four ways a customer question reaches the website, joined editorially on action."""
from functools import lru_cache
from math import cos, pi, sin
from PIL import Image, ImageDraw, ImageOps
from desk import W,H,INK,PAPER,BLUE,ICE,PINK,font,txt,ease,base

QUESTION='How do I get started?'

def interpolate(start,end,t):
    return start+(end-start)*t

def typeset(d,x,y,words,size,color,age,delay=0):
    lift=1-ease(delay,delay+.36,age)
    txt(d,x+round(lift*67),y+round(lift*12),words,size,color)

def ray(d,x,y,r,fill):
    for i in range(8):
        a=i*pi/4
        d.line((x+r*.54*cos(a),y+r*.54*sin(a),x+r*cos(a),y+r*sin(a)),fill=fill,width=3)

@lru_cache(None)
def print_sheet(face,ink):
    sheet=Image.new('RGBA',(465,208)); g=ImageDraw.Draw(sheet)
    g.polygon([(0,0),(418,0),(464,46),(464,207),(0,207)],fill=face)
    g.polygon([(418,0),(464,46),(418,46)],fill=ink)
    txt(g,24,34,'A quick guide',44,ink)
    txt(g,24,94,'to getting started',42,ink)
    g.line((26,173,431,173),fill=ink,width=2)
    return sheet

def paper(im,x,y,angle,face,ink):
    asset=print_sheet(face,ink)
    layer=asset.rotate(angle,resample=Image.Resampling.BICUBIC,expand=True)
    im.paste(layer,(round(x-layer.width/2),round(y-layer.height/2)),layer)

def share(im,t):
    base(im,INK); d=ImageDraw.Draw(im)
    # Copies fan from one fingertip into separate feeds.
    spread=ease(.22,1.15,t)
    extra=ease(2.25,3.15,t)
    count=5 if t>=2.25 else 3
    centers=[(739,369,-18,ICE),(824,331,-8,PAPER),(940,293,6,PAPER),
             (626,436,-25,PINK),(1051,249,15,ICE)]
    for n in ([3,4,0,1,2] if count==5 else [0,1,2]):
        x,y,a,c=centers[n]; k=extra if n in (3,4) else spread
        x=interpolate(940,x,k);y=interpolate(293,y,k)
        paper(im,x,y,interpolate(6,a,k)+1.4*sin(t*2.0+n),c,INK)
    if t<2.3:
        typeset(d,62,53,'Organic social',32,ICE,t)
        typeset(d,58,112,'Someone shares your post.',61,PAPER,t)
        txt(d,61,591,'YOUR POST',21,PAPER)
        ray(d,227,601,14,BLUE)
    else:
        typeset(d,62,53,'Paid social',32,ICE,t,2.30)
        typeset(d,58,112,'You pay to reach more feeds.',61,PAPER,t,2.30)
        txt(d,61,591,'PAID DISTRIBUTION',21,PAPER)
        ray(d,315,601,14,BLUE)
    # A single rule grows into multiple copies, maintaining a readable bottom margin.
    x=62+int(1096*ease(.15,2.20,t))
    d.line((62,641,x,641),fill=BLUE,width=3)

def seo(im,t):
    base(im,PAPER); d=ImageDraw.Draw(im)
    txt(d,61,54,'SEO  /  Search engine optimization',28,BLUE)
    typeset(d,59,111,'Help people find your page',65,INK,t)
    typeset(d,59,188,'in unpaid search.',65,INK,t,.07)
    # The query and its matching page snap to the same baseline as type on a press.
    align=ease(.2,1.35,t)
    x=round(interpolate(-320,65,align))
    d.line((62,350,1215,350),fill=INK,width=2)
    txt(d,x,382,'What you offer',61,INK)
    txt(d,66,470,'CUSTOMER’S SEARCH',19,BLUE)
    arrow=round(interpolate(625,727,ease(.72,1.8,t)))
    d.line((660,422,arrow,422),fill=BLUE,width=4)
    d.line((arrow-14,409,arrow,422,arrow-14,435),fill=BLUE,width=4)
    py=round(interpolate(740,376,ease(.44,1.46,t)))
    d.rectangle((771,py,1213,py+181),fill=BLUE)
    d.polygon([(1172,py),(1213,py+41),(1172,py+41)],fill=ICE)
    txt(d,793,py+41,'What we offer',43,PAPER)
    txt(d,795,py+120,'PRODUCT OR SERVICE PAGE',19,PAPER)
    # Re-index the matched phrase from query to title with a drawn underline.
    k=ease(1.2,2.7,t)
    d.line((795,py+100,795+round(335*k),py+100),fill=ICE,width=3)
    d.line((62,603,1215,603),fill=INK,width=2)

def aeo(im,t):
    base(im,BLUE); d=ImageDraw.Draw(im)
    txt(d,61,54,'AEO  /  Answer engine optimization',28,ICE)
    typeset(d,58,111,'Answer engines can cite',64,PAPER,t)
    typeset(d,58,189,'your website’s answer.',64,PAPER,t,.07)
    # A sentence physically lifts off the page toward an oversized opening quotation.
    curve=ease(.13,1.14,t)
    baseline=round(interpolate(567,431,curve))
    for j in range(5):
        y=565+j*12
        d.line((123+(j*3),y,1096-j*36,y),fill='#90A7FF',width=1)
    txt(d,64,baseline-126,'“',190,ICE)
    txt(d,176,baseline-51,'Send us a note about',59,PAPER)
    txt(d,176,baseline+21,'what you need.',59,PAPER)
    d.line((179,baseline+95,179+int(660*ease(.78,1.64,t)),baseline+95),fill=ICE,width=3)
    txt(d,65,644,QUESTION,28,ICE)

def sem(im,t):
    base(im,INK);d=ImageDraw.Draw(im)
    txt(d,61,54,'SEM  /  Search engine marketing',28,ICE)
    typeset(d,57,112,'Buy ad placement for',66,PAPER,t)
    typeset(d,57,190,'a matching search.',66,PAPER,t,.06)
    x=round(interpolate(-500,67,ease(0,.88,t)))
    txt(d,x,343,'A search for what you sell',59,PAPER)
    # The sponsored result slots into a page of type, pushing the other lines down.
    power=ease(.45,1.34,t)
    for j in range(3):
        y=448+47*j+round(82*power)
        d.line((64,y,1197-j*70,y),fill='#68728F',width=2)
    bx=round(interpolate(W+50,63,power));by=432
    d.polygon([(bx,by),(bx+1106,by),(bx+1154,by+43),(bx+1106,by+86),(bx,by+86)],fill=PINK)
    txt(d,bx+20,by+29,'SPONSORED',23,INK)
    d.line((bx+208,by+17,bx+208,by+68),fill=INK,width=2)
    txt(d,bx+234,by+22,'Get started with us',38,INK)
    # Aim the searcher's pointer at the sponsored response before the click.
    reach=ease(1.28,2.63,t)
    cx=round(interpolate(1350,995,reach))
    cy=round(interpolate(730,488,reach))
    d.polygon([(cx,cy),(cx+9,cy+50),(cx+21,cy+35),(cx+42,cy+34)],fill=PAPER,outline=INK,width=2)
    pulse=ease(2.63,3.14,t)
    if 0<pulse<1:
        r=round(41*pulse)
        d.ellipse((cx-r,cy-r,cx+r,cy+r),outline=PAPER,width=2)

SCENES=(share,seo,aeo,sem)
def draw(im,t):
    elapsed=min(max(t-4,0),19.9999)
    scene=int(elapsed//5); local=elapsed%5
    SCENES[scene](im,local)
    if scene<3 and local>4.38:
        # The back of the outgoing printed sheet curls toward the camera.
        next_page=Image.new('RGB',(W,H))
        SCENES[scene+1](next_page,0)
        progress=ease(4.38,5,local)
        fold=round((W+220)*progress)-110
        bend=round(108*sin(pi*progress))
        if bend>0:
            flipped=ImageOps.mirror(im)
            top=max(0,min(W-1,W-fold-bend))
            back=flipped.crop((top,0,min(W,top+bend),H)).resize((bend,H))
            wash=Image.new('RGB',back.size,PAPER)
            back=Image.blend(back,wash,.63)
            for x in range(bend):
                value=round(46*(1-cos(pi*x/bend))*.5)
                wash.paste((value,value,value),(x,0,x+1,H))
            from PIL import ImageChops
            back=ImageChops.subtract(back,wash)
        # A shallow diagonal keeps the trailing edge visible as it moves off screen.
        mask=Image.new('L',(W,H))
        painter=ImageDraw.Draw(mask)
        painter.polygon([(-200,0),(fold+88,0),(fold-88,H),(-200,H)],fill=255)
        im.paste(next_page,(0,0),mask)
        if bend>0:
            for y in range(0,H,4):
                offset=round(fold+88-176*y/H)
                im.paste(back.crop((0,y,bend,min(H,y+4))),(offset,y))
