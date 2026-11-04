"""Render from repository root. Requires macOS say, Pillow, FFmpeg and FFprobe."""
import math, subprocess
from pathlib import Path
from functools import lru_cache
from PIL import Image, ImageDraw, ImageFont
root=Path(__file__).resolve().parents[2]
work=Path('/tmp/ws-lead-film')
work.mkdir(parents=True, exist_ok=True)
out=root/'output/lead-film'
out.mkdir(parents=True,exist_ok=True)
rows=[s.split('|') for s in Path(__file__).with_name('story.txt').read_text().splitlines()]
fps=15
ink='#15191d'; pearl='#f7f6f2'; blue='#1459ef'; ice='#a9c7ff'
@lru_cache(None)
def font(size,bold=False):
    return ImageFont.truetype(str(root/f'videos/contractor-previews/fonts/manrope-{700 if bold else 400}.ttf'),size)
def wrap(draw,s,x,y,width,size,color,bold=False):
    line=''
    for word in s.split():
        trial=(line+' '+word).strip()
        if line and draw.textlength(trial,font=font(size,bold))>width:
            draw.text((x,y),line,font=font(size,bold),fill=color); y+=size+7; line=word
        else: line=trial
    draw.text((x,y),line,font=font(size,bold),fill=color)
labels=[['Ceiling stain','Neighbor','Search'],['Service area','Repair story','Request visit'],['Search phrase','Service page','Enquiry'],['Question','Answer','Evidence'],['Search term','Search ad','Inspection page'],['Feed','Video ad','Enquiry'],['Crew story','Shared post','Message'],['Clip','Search','Form'],['Office inbox','Social inbox','Paper note'],['Photo','Promise','Owner'],['Contact','Enquiry','Next action'],['Raw note','AI draft','Jamie reviews'],['Confirmed','Calendar','Reminder'],['Received','Assigned','Booked'],['One enquiry','Your team','wallaceshift.com']]
receipts=[['Kitchen sink','Blue truck','Roof repair'],['Leak inspections','Local crew','Call me back'],['Roof leak repair','Towns served','Visit requested'],['Replace the roof?','Inspect the leak','Written by the crew'],['Local repair','Leak inspection','Request a visit'],['Nearby homeowner','Inspection clip','Booked visit'],['On site','Sent by neighbor','Photo attached'],['First heard','Found again','Contacted'],['Form received','Photo received','Thursday maybe'],['Missing photo','Tentative time','Jamie'],['Nora','Photo received','Confirm Thursday'],['Thursday PM maybe','Requested','Check calendar'],['Jamie confirms','Create entry','Notify Nora'],['10 enquiries','Who owns each?','Which got a visit?'],['Trace the work','Connect the tools','Discuss your system']]
segments=[]
for i,row in enumerate(rows):
    chapter,beat=divmod(i,3)
    chaptername,title,script=(row if len(row)==3 else [rows[i-beat][0],*row])
    voice=work/f'{i}.aiff'
    if not voice.exists():
        subprocess.run(['say','-v','Samantha','-r','153','-o',str(voice),script],check=True)
    seconds=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(voice)]))
    count=math.ceil(max(6.9,seconds+.85)*fps)
    dark=chapter in (0,7,8,11,14)
    bg,fg=(ink,pearl) if dark else (pearl,ink)
    accent=ice if dark else blue
    base=Image.new('RGB',(960,540),bg); d=ImageDraw.Draw(base)
    d.text((36,24),'WALLACE SHIFT',font=font(18,True),fill=fg)
    d.text((638,28),'FIELD NOTES    /    FICTIONAL ENQUIRY',font=font(13,True),fill=fg)
    d.line((36,64,924,64),fill=fg)
    d.text((37,98),f'{chapter+1:02}   /   {chaptername.upper()}',font=font(15,True),fill=accent)
    wrap(d,title,34,149,465,49,fg,True)
    d.line((36,371,924,371),fill=fg)
    wrap(d,script,36,390,880,23,fg)
    d.text((36,503),'NORA   /   ENQUIRY 001',font=font(12,True),fill=accent)
    for j in range(15):
        x=662+j*18; d.rectangle((x,509,x+12,512),fill=accent if j<=chapter else '#69737d')
    seg=work/f'{i}.mp4'
    cmd=['ffmpeg','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s','960x540','-r',str(fps),'-i','-', '-i',str(voice),'-af','adelay=220,apad','-t',str(count/fps),'-c:a','aac','-ar','48000','-c:v','libx264','-threads','3','-preset','ultrafast','-crf','17','-pix_fmt','yuv420p',str(seg)]
    p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
    for f in range(count):
        img=base.copy(); g=ImageDraw.Draw(img); t=f/fps
        # Three parallel paths follow a single enquiry; at the inbox chapter they diverge.
        for j in range(3):
            y=147+j*76
            shift=int((1-min(1,t/(.48+j*.12)))**3*105)
            sx=550+shift
            col=accent if j==beat else '#828c95'
            g.line((sx,y,913,y),fill=col,width=2)
            g.text((sx,y-24),labels[chapter][j].upper(),font=font(13,True),fill=col)
            g.text((sx+18,y+6),receipts[chapter][j],font=font(22,j==beat),fill=fg if j==beat else col)
            progress=min(1,max(0,(t-.18*j)/2.4))
            dot=int(sx+(913-sx)*(1-(1-progress)**3)) if j==beat else sx
            g.ellipse((dot-5,y-5,dot+5,y+5),fill=col)
        # Moving thread stitches the three entries together, tangling at the broken handoff.
        path=[]
        for k in range(75):
            u=k/74; amp=(40 if chapter==8 else 13 if chapter<10 else 4)
            path.append((525+amp*math.sin(u*math.pi*(7 if chapter==8 else 2)+t*.85)*math.sin(math.pi*u),147+152*u))
        g.line(path,fill=accent,width=3)
        pos=path[int(74*((t*.23)%1))]; x,y=pos; g.ellipse((x-5,y-5,x+5,y+5),fill=accent)
        if chapter in (0,1,2,3,4,5,6,8,10,11,12,14):
            g.rectangle((492,79,959,361), fill=bg)
            if chapter in (0,14):
                # A roofline traced in three offset strokes becomes the routing mark.
                for n in range(9):
                    y=112+n*16
                    pts=[(513,y+50),(650,y-20),(736,y+19),(810,y-21),(922,y+32)]
                    length=min(4,max(0,(t*.95-n*.08)))
                    whole=int(length); portion=length-whole
                    visible=pts[:whole+1]
                    if whole<4:
                        a,b=pts[whole:whole+2]
                        visible.append(tuple(a[k]+portion*(b[k]-a[k]) for k in (0,1)))
                    if len(visible)>1:g.line(visible,fill=accent if n==beat*3 else '#526376',width=4)
                g.text((520,310),receipts[chapter][beat],font=font(26,True),fill=fg)
            elif chapter==8:
                for n,entry in enumerate(receipts[chapter]):
                    y=110+76*n
                    pts=[(505,y),(595,y),(770,292-68*n),(916,292-68*n)]
                    g.line(pts,fill=accent if n==beat else '#59697b',width=3)
                    g.rectangle((506,y-13,720,y+24),fill=bg)
                    g.text((506,y-10),entry,font=font(18,True),fill=fg)
                    u=min(2.99,(t*.7+n*.2)%3); a,b=pts[int(u):int(u)+2]; z=u%1
                    x=a[0]+(b[0]-a[0])*z; yy=a[1]+(b[1]-a[1])*z
                    g.ellipse((x-5,yy-5,x+5,yy+5),fill=accent)
                g.text((505,322),'THREE PLACES TO CHECK',font=font(14,True),fill=accent)
            elif chapter in (5,6):
                # A phone feed advances to the next piece of the customer journey.
                for n in range(3):
                    x=512+n*19; y=121-n*10
                    g.rounded_rectangle((x,y,x+338,y+215),radius=18,fill=bg,outline=accent,width=2)
                x=550; y=101
                g.text((x+23,y+18),'NEIGHBORHOOD   /   FEED',font=font(14,True),fill=accent)
                for n in range(6):
                    xx=x+22+n*31
                    g.line((xx,y+102,xx+54,y+65,xx+90,y+89),fill=blue,width=4)
                g.text((x+23,y+122),receipts[chapter][beat],font=font(24,True),fill=fg)
                g.rectangle((x+23,y+172,x+23+int(285*min(1,t/3)),y+176),fill=accent)
            else:
                x=514+int(34*(1-min(1,t/.6))**3); y=108
                g.rounded_rectangle((x,y,918,324),radius=12,outline=accent,width=3)
                for n in range(3):g.ellipse((x+17+13*n,y+15,x+22+13*n,y+20),fill=accent)
                g.line((x,y+35,918,y+35),fill=accent,width=2)
                g.text((x+20,y+54),labels[chapter][beat].upper(),font=font(15,True),fill=accent)
                wrap(g,receipts[chapter][beat],x+20,y+87,359,32,fg,True)
                g.text((x+20,y+178),('ENQUIRY 001' if chapter>=10 else 'NORA’S JOURNEY')+'     /     '+str(beat+1).zfill(2),font=font(14),fill=fg)
        p.stdin.write(img.tobytes())
    p.stdin.close()
    if p.wait(): raise RuntimeError(seg)
    segments.append(f"file '{seg}'")
(work/'concat.txt').write_text('\n'.join(segments))
subprocess.run(['ffmpeg','-loglevel','error','-y','-f','concat','-safe','0','-i',str(work/'concat.txt'),'-c','copy','-movflags','+faststart',str(out/'Where did the lead go.mp4')],check=True)
