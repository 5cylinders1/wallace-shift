"""Shared design tokens and type primitives for the enquiry film."""
from functools import lru_cache
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math

INK='#101423'
PEARL='#F6F3E9'
BLUE='#2354FF'
SKY='#A8CEFF'
LIME='#DCFF60'
FONT_DIR=Path(__file__).resolve().parents[1]/'contractor-previews'/'fonts'

@lru_cache(None)
def font(size,bold=True):
    return ImageFont.truetype(str(FONT_DIR/('manrope-700.ttf' if bold else 'manrope-400.ttf')),max(1,round(size)))

def label(draw,xy,string,size,color,bold=True):
    draw.text(xy,string,font=font(size,bold),fill=color,anchor='lt')

def smooth(x):
    x=max(0,min(1,x))
    return x*x*(3-2*x)
