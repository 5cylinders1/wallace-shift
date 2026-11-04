"""Render the Wallace Shift short. Run sound.py first to build the score."""
import sys
import subprocess
from pathlib import Path
from PIL import Image
from ends import hook,web,finale
from art import INK

ROOT=Path(__file__).resolve().parents[2]
WORK=Path('/tmp/ws-lead-cut')
DEST=ROOT/'output/lead-cut'/'One Roof Leak.mp4'
FPS=30
BOUNDS=[0,4,24,30,48,54]

def render_shot(index):
    if index==1:
        from channels import draw as scene
    elif index==3:
        from resolve import draw as scene
    else:
        scene={0:hook,2:web,4:finale}[index]
    start,end=BOUNDS[index:index+2]
    cmd=['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24',
         '-s','1280x720','-r',str(FPS),'-i','pipe:0','-an','-c:v','libx264','-threads','3',
         '-preset','fast','-crf','16','-pix_fmt','yuv420p','-video_track_timescale','30000',str(WORK/f'shot-{index}.mp4')]
    proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
    try:
        for frame in range(start*FPS,end*FPS):
            img=Image.new('RGB',(1280,720),INK)
            scene(img,frame/FPS)
            proc.stdin.write(img.tobytes())
    finally:
        proc.stdin.close()
        status=proc.wait()
    if status: raise RuntimeError(f'Encoder failed at shot {index}')

def finish():
    DEST.parent.mkdir(parents=True,exist_ok=True)
    manifest=WORK/'shots.txt'
    manifest.write_text('\n'.join(f"file '{WORK/f'shot-{i}.mp4'}'" for i in range(5)))
    subprocess.run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',str(manifest),
                    '-i',str(WORK/'audio.wav'),'-map','0:v','-map','1:a','-c:v','copy',
                    '-c:a','aac','-b:a','256k','-movflags','+faststart',str(DEST)],check=True)

if __name__=='__main__':
    WORK.mkdir(parents=True,exist_ok=True)
    for job in sys.argv[1:] or ['0','1','2','3','4','finish']:
        if job=='finish':finish()
        else:render_shot(int(job))
