"""Render The Next Reply from this folder with Pillow and FFmpeg. score.py builds the original WAV."""
from pathlib import Path
import subprocess
import sys
from PIL import Image
from bookends import opening,web,close

ROOT=Path(__file__).resolve().parents[2]
WORK=Path('/tmp/ws-reply-film')
DEST=ROOT/'output/reply-film'/'The Next Reply.mp4'
FPS=30
TIMES=[0,4,24,30,48,54]

def render(k):
    if k==1:
        from find import draw
    elif k==3:
        from reply import draw
    else:
        draw={0:opening,2:web,4:close}[k]
    cmd=['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s','1280x720',
         '-r',str(FPS),'-i','pipe:0','-an','-c:v','libx264','-threads','3','-crf','16',
         '-preset','fast','-pix_fmt','yuv420p','-video_track_timescale','30000',str(WORK/f'{k}.mp4')]
    proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
    try:
        for frame in range(TIMES[k]*FPS,TIMES[k+1]*FPS):
            im=Image.new('RGB',(1280,720))
            draw(im,frame/FPS)
            proc.stdin.write(im.tobytes())
    finally:
        proc.stdin.close()
        if proc.wait():raise RuntimeError(f'Encoding failed for section {k}')

def finish():
    DEST.parent.mkdir(parents=True,exist_ok=True)
    manifest=WORK/'manifest.txt'
    manifest.write_text('\n'.join(f"file '{WORK/f'{i}.mp4'}'" for i in range(5)))
    subprocess.run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',str(manifest),
                    '-i',str(WORK/'score.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy',
                    '-c:a','aac','-b:a','256k','-movflags','+faststart',str(DEST)],check=True)

if __name__=='__main__':
    WORK.mkdir(parents=True,exist_ok=True)
    for arg in sys.argv[1:] or ['0','1','2','3','4','finish']:
        if arg=='finish':finish()
        else:render(int(arg))
