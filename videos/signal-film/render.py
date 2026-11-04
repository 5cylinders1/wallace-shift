"""Render with Python + Pillow and FFmpeg. Build the score with score.py (NumPy)."""
from pathlib import Path
import subprocess
import sys
from PIL import Image
from journey import hook,site,close
from discover import draw as discover
from gather import draw as gather
from passages import portal, lost

ROOT=Path(__file__).resolve().parents[2]
WORK=Path('/tmp/ws-signal-film')
DEST=ROOT/'output/signal-film'/'Follow the Signal.mp4'
FPS=30
SHOTS=[(0,4,hook),(4,24,discover),(24,29,site),(29,48,gather),(48,54,close)]

def shot(k):
    start,end,draw=SHOTS[k]
    cmd=['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s','1280x720',
         '-r',str(FPS),'-i','pipe:0','-an','-c:v','libx264','-threads','3','-crf','15',
         '-preset','fast','-pix_fmt','yuv420p','-video_track_timescale','30000',str(WORK/f'{k}.mp4')]
    proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
    try:
        for n in range(start*FPS,end*FPS):
            im=Image.new('RGB',(1280,720))
            t=n/FPS
            draw(im,t)
            if k==1:
                for a,b,kind in [(11.95,14,'search'),(16.74,19,'answer'),(21.95,24,'ad')]:
                    if a<=t<b:portal(im,t,a,b,kind)
            if k==3 and 34.38<=t<37.03:lost(im,t)
            proc.stdin.write(im.tobytes())
    finally:
        proc.stdin.close()
        if proc.wait():raise RuntimeError(f'Encoding failed for shot {k}')

def finish():
    manifest=WORK/'manifest.txt'
    manifest.write_text('\n'.join(f"file '{WORK/f'{i}.mp4'}'" for i in range(len(SHOTS))))
    DEST.parent.mkdir(parents=True,exist_ok=True)
    subprocess.run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',str(manifest),
                    '-i',str(WORK/'score.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy',
                    '-c:a','aac','-b:a','256k','-movflags','+faststart',str(DEST)],check=True)

if __name__=='__main__':
    WORK.mkdir(exist_ok=True,parents=True)
    for arg in sys.argv[1:] or ['0','1','2','3','4','finish']:
        if arg=='finish':finish()
        else:shot(int(arg))
