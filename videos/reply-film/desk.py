"""Visual language for The Next Reply."""
from functools import lru_cache
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
W,H=1280,720
INK='#101526'
PAPER='#F6F4EF'
BLUE='#244CFF'
ICE='#BCD7FF'
PINK='#FFABBA'
FONT_DIR=Path(__file__).resolve().parents[1]/'contractor-previews'/'fonts'
@lru_cache(None)
def font(size,bold=True):
    return ImageFont.truetype(str(FONT_DIR/('manrope-700.ttf' if bold else 'manrope-400.ttf')),max(1,round(size)))
def txt(d,x,y,string,size,color,bold=True):
    d.text((x,y),string,font=font(size,bold),fill=color,anchor='lt')
def ease(a,b,t):
    u=max(0,min(1,(t-a)/(b-a)))
    return u*u*(3-2*u)
def base(im,color):
    im.paste(color,(0,0,W,H))
