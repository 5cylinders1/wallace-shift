"""The water drop, the dimensional website and the strand-built brand signature."""
from signal_art import *
import re
from PIL import ImageFilter

def mix(a,b,u):
    aa=ImageColor.getrgb(a); bb=ImageColor.getrgb(b)
    return tuple(round(a*(1-u)+b*u) for a,b in zip(aa,bb))

def center(g,x,y,text,size,color=PAPER):
    f=font(size)
    g.text((x,y),text,font=f,fill=color,anchor='mm')

@lru_cache(None)
def drop_surface():
    # A transparent cobalt water drop with a calculated curved normal at every pixel.
    w,h=270,416; result=Image.new('RGBA',(w,h)); px=[]
    def radius(v):
        return 123*math.sqrt(max(0,1-(2*v-1)**2))*(.15+.85*v**.73)
    for y in range(h):
        v=(y+.5)/h; rad=radius(v)
        dr=(radius(min(1,v+.001))-radius(max(0,v-.001)))/(.002*h)
        for x in range(w):
            dx=x-(w-1)/2; u=dx/max(.01,rad)
            if abs(u)>=1:px.append((0,0,0,0));continue
            nz=math.sqrt(max(0,1-u*u)); length=math.sqrt(1+dr*dr)
            nx=u/length; ny=-dr/length; nz/=length
            # Reflected strip lights bend around the silhouette.
            rim=(1-nz)**2; rx=2*nz*nx; ry=2*nz*ny
            strip=math.exp(-((rx+.7+.28*ry)/.115)**2)*(.38+.62*v)
            back=math.exp(-((rx-.84+.4*ry)/.15)**2)
            caustic=math.exp(-((ry+.34-.4*rx**2)/.065)**2)*(.55+.45*v)
            pink=math.exp(-((rx-.55)/.11)**2-((v-.57)/.33)**2)
            rgb=(9+91*rim+178*strip+30*back+60*caustic+138*pink,
                 15+113*rim+199*strip+66*back+100*caustic+38*pink,
                 49+155*rim+185*strip+162*back+180*caustic+81*pink)
            alpha=min(255,round((rad-abs(dx))*220))
            px.append(tuple(min(255,int(c)) for c in rgb)+(alpha,))
    result.putdata(px);return result

def drop(im,cx,cy,h):
    h=max(2,round(h)); src=drop_surface()
    tile=src.resize((round(h*src.width/src.height),h),Image.Resampling.LANCZOS)
    im.paste(tile,(round(cx-tile.width/2),round(cy-h/2)),tile)

def hook(im,t):
    base(im,t);g=ImageDraw.Draw(im)
    z=ease(0,.98,t); pull=ease(1.25,2.32,t); launch=ease(2.98,4,t)
    cx=827+(1-z)*155-86*pull-101*launch
    cy=312+(1-z)*34+81*pull-33*launch
    h=(590+(1-z)*470)*(1-.67*pull)*(1-launch)
    # Thin wavefronts locate the droplet on a common plane.
    for j in range(10):
        p=(t*.26+j*.1)%1
        rr=34+540*p
        g.arc((cx-rr,535-rr*.19,cx+rr,535+rr*.19),184,353,
              fill=mix('#334995',INK,p*.93),width=2 if j%3==0 else 1)
    if h>7:drop(im,cx,cy,h)
    if t>2.98:orb(im,cx,cy,max(2,8*launch),BLUE)
    if t<1.65:
        y=285+(1-ease(0,.48,t))*50
        txt(g,(83,y),'One roof',91,PAPER)
        txt(g,(83,y+105),'leak.',98,ICE)
    else:
        u=ease(1.65,2.1,t)
        txt(g,(83,269+(1-u)*32),'How does Nora',68,PAPER)
        txt(g,(83,350+(1-u)*24),'find a roofer?',72,ICE)
    if t>3.46:
        # Sweep the type into the point at the cut.
        u=ease(3.46,3.96,t)
        if u:
            layer=im.resize((max(1,round(W*(1-u*.995))),max(1,round(H*(1-u*.995)))),Image.Resampling.BICUBIC)
            base(im,t)
            im.paste(layer,(round((W-layer.width)/2),round((H-layer.height)/2)))
            orb(im,640,360,7)

def site(im,t):
    base(im,t);g=ImageDraw.Draw(im); q=t-24
    unroll=ease(0,1.03,q); send=ease(3.58,4.78,q)
    cx=640+188*unroll*(1-send)
    cy=360+26*unroll*(1-send)
    sw=363*unroll*(1-send); sh=196*unroll*(1-send)
    # A bundle of optical fibres is drawn through the website aperture.
    for i in range(17):
        frac=i/16; src=(-65,-68+frac*880)
        pts=bez(src,(230+35*math.cos(i),src[1]+112*math.sin(i*.41+q*.38)),
                (398,329+48*math.sin(i*.66+q*.31)),(cx,cy))
        wire(g,pts,1,mix('#17244D','#536DB8',(.5+.5*math.cos(i*.64+q*.5))*.75),1)
        j=int(80*((q*.38+i*.14)%1))
        if i%4==0:
            wire(g,pts[max(0,j-6):j+1],1,ICE,2)
    if sw>2 and sh>2:
        pane=Image.new('RGB',(726,392),'#0B122D')
        pg=ImageDraw.Draw(pane)
        pg.rectangle((0,0,725,391),outline='#829AFF',width=2)
        pg.line((0,49,726,49),fill='#364674',width=1)
        for j in range(3):pg.ellipse((41+j*14,22,46+j*14,27),fill=ICE)
        txt(pg,(41,79),'Roof leak inspections',48,PAPER)
        txt(pg,(41,154),'Nora   /   Ceiling stain above sink',26,ICE,False)
        pg.rounded_rectangle((41,230,685,321),radius=42,fill=BLUE)
        center(pg,363,275,'Request a visit' if q<3.28 else 'Enquiry sent',34)
        tile=pane.resize((max(1,round(sw*2)),max(1,round(sh*2))),Image.Resampling.LANCZOS)
        im.paste(tile,(round(cx-sw),round(cy-sh)))
    if q<3.75:
        # These two lines are anchored in the open area beside the incoming rays.
        u=ease(0,.5,q)
        txt(g,(52,76+(1-u)*39),'Your website',52,PAPER)
        txt(g,(52,143+(1-u)*39),'gives interest',47,ICE)
        txt(g,(52,205+(1-u)*39),'a next step.',47,ICE)
    v=ease(.9,3.28,q)
    entry=ease(0,.9,q)
    px=640+(172-640)*entry; py=360+(568-360)*entry
    px=px+(cx-sw+224-px)*v; py=py+(cy-sh+277-py)*v
    if send>.01:px=cx;py=cy
    if q<3.58:
        orb(im,px,py,7)
        if 3.24<q<3.58:
            rr=8+130*ease(3.24,3.58,q)
            g.ellipse((px-rr,py-rr,px+rr,py+rr),outline=ICE,width=2)
    else:orb(im,cx,cy,8)

def mark_paths():
    svg=(Path(__file__).resolve().parents[2]/'public/brand/wallace-shift-logo-white.svg').read_text()
    paths=[]
    for raw in re.findall(r'<path d="([^"]+)',svg):
        x=y=0; pts=[]
        for op,args in re.findall(r'([MLHVZ])([^MLHVZ]*)',raw):
            vals=list(map(int,re.findall(r'-?\d+',args)))
            if op in 'ML':x,y=vals
            if op=='H':x=vals[0]
            if op=='V':y=vals[0]
            if op!='Z':pts.append((x-124,y-291))
        paths.append(pts)
    return paths
MARK=mark_paths()

def close(im,t):
    base(im,t);g=ImageDraw.Draw(im);q=t-48
    u=ease(.15,1.58,q)
    # The now-resolved thread writes the authentic mark at the end of its run.
    for j in range(12):
        y=106+j*46; pts=bez((80,y),(515,-67+j*95),(798,582-j*46),(640,360))
        tail=round(80*ease(0,1.65,q))
        wire(g,pts[tail:],1,mix('#253568','#9BB9FF',j%4*.17),2 if j%3==0 else 1)
    if q<1.7:orb(im,640,360,7)
    if q<2.53:
        center(g,640,205-(1-u)*42,'One clear next step.',67,PAPER)
    emerge=ease(2.12,3.28,q)
    if emerge:
        g=ImageDraw.Draw(im)
        xx=80+(1-emerge)*510; yy=234+(1-emerge)*117;w=325
        for path in MARK:
            pts=[(xx+x*w/1025,yy+y*w/1025) for x,y in path]
            g.polygon(pts,fill=mix('#152248',BLUE,emerge))
            wire(g,pts+[pts[0]],emerge,ICE,2)
        if q>2.65:
            x=448+80*(1-ease(2.65,3.55,q))
            txt(g,(x,233),'Wallace Shift',92,PAPER)
            txt(g,(x+4,359),'Custom CRMs and AI integration',32,ICE,False)
        if q>3.55:
            txt(g,(451,467+(1-ease(3.55,4.18,q))*18),'wallaceshift.com',28,ICE)
