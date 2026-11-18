#!/usr/bin/env python3
"""Prepare an actual generated film for deterministic, reversible browser scrubbing."""
import argparse, json, subprocess, tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
p=argparse.ArgumentParser()
p.add_argument('video',type=Path)
p.add_argument('--duration',type=float,default=7.5)
p.add_argument('--width',type=int,default=1280)
p.add_argument('--prefix',default='')
p.add_argument('--job-id',default='ae0bf8fc-6c18-4b53-b89f-22dd245819ff')
p.add_argument('--output',type=Path,default=Path('public/demos/best-tailor/media/cinematic'))
p.add_argument('--review',type=Path,default=Path('docs/review/sues-tailor/assembly'))
a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True);a.review.mkdir(parents=True,exist_ok=True)
# The generated shot unsews the dress. Reversing those exact rendered frames
# makes the same cloth construct the dress; no synthetic image swaps are used.
for previous in a.output.glob('frame-*.webp'):
    previous.unlink()
with tempfile.TemporaryDirectory(prefix='sues-film-') as temporary:
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(a.video),'-an','-vf',f'trim=duration={a.duration},setpts=PTS-STARTPTS,scale={a.width}:-2,fps=24,reverse',str(Path(temporary)/'frame-%04d.png')],check=True)
    for source in sorted(Path(temporary).glob('frame-*.png')):
        Image.open(source).save(a.output/(source.stem+'.webp'),quality=84,method=4)
frames=sorted(a.output.glob('frame-*.webp'))
if not 2<=len(frames)<=500: raise ValueError('Unexpected frame count')
w,h=Image.open(frames[0]).size
manifest={'frameCount':len(frames),'width':w,'height':h,'poster':a.prefix+'poster.webp','frames':[a.prefix+x.name for x in frames],'fps':24,'sourceSecondsUsed':a.duration,'direction':'reversed from the generated unsewing shot','sourceJob':a.job_id,'totalFrameBytes':sum(x.stat().st_size for x in frames)}
(a.output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
font=ImageFont.load_default(size=20)
sheet=Image.new('RGB',(1280,800),'#20191a');d=ImageDraw.Draw(sheet)
for i,pct in enumerate([0,20,40,60,80,100]):
    index=round((len(frames)-1)*pct/100)
    im=Image.open(frames[index]).convert('RGB');im.thumbnail((640,230))
    x=(i%2)*640;y=(i//2)*266
    sheet.paste(im,(x+(640-im.width)//2,y+30))
    d.text((x+18,y+7),f'{pct}% scroll · source frame {index+1}/{len(frames)}',font=font,fill='#f7f3eb')
sheet.save(a.review/'cinematic-motion-contact-sheet.jpg',quality=92)
print(json.dumps({k:v for k,v in manifest.items() if k!='frames'},indent=2))
