import cv2, numpy as np, os, subprocess
from paths import PUBLIC, WORK
OUT = os.path.join(PUBLIC, 'materials'); os.makedirs(OUT, exist_ok=True)
def s2l(x): x = x/255.0; return np.where(x <= 0.04045, x/12.92, ((x+0.055)/1.055)**2.4)
def l2s(x): x = np.clip(x, 0, 1); return np.where(x <= 0.0031308, x*12.92, 1.055*np.power(x, 1/2.4) - 0.055)*255
# (source, rotate90, gamma deepen, tint RGB, gain) -> an oil / matte finish over the raw scan
WOODS = {
 'walnut':       ('american_walnut_veneer', True,  1.45, (1.00, 0.72, 0.50), 1.08),
 'rift-oak':     ('white_oak_veneer',       False, 0.98, (1.00, 0.94, 0.84), 1.12),
 'figured-oak':  ('oak_veneer_01',          False, 1.08, (1.00, 0.95, 0.86), 0.98),
 'cherry':       ('cherry_veneer',          True,  1.5, (1.00, 0.70, 0.56), 0.82),
 'maple':        ('white_maple_veneer',     True,  1.05, (1.00, 0.98, 0.94), 1.00),
 'smoked-walnut':('smoked_walnut_veneer',   True,  1.30, (1.00, 0.86, 0.74), 0.92),
}
for slug, (src, rot, gam, tint, gain) in WOODS.items():
    im = cv2.imread(f'ph/{src}.jpg')
    if rot: im = cv2.rotate(im, cv2.ROTATE_90_CLOCKWISE)   # grain runs vertically, as on a door
    lin = s2l(im.astype(np.float32))
    lum = (0.0722*lin[...,0] + 0.7152*lin[...,1] + 0.2126*lin[...,2])[...,None]
    fin = np.power(lin, gam) * np.array(tint[::-1]) * gain
    mix = 0.45 if slug == 'cherry' else 0.15
    fin = fin * (1 - mix) + np.power(lum, gam) * np.array(tint[::-1]) * gain * mix
    out = l2s(fin).astype(np.uint8)
    c = out[200:1800, 400:1600]                           # portrait door-like crop
    c = cv2.resize(c, (480, 640), interpolation=cv2.INTER_AREA)
    cv2.imwrite(WORK + '/_sw.png', c)
    subprocess.run(['cwebp', '-quiet', '-q', '82', WORK + '/_sw.png', '-o', f'{OUT}/wood-{slug}.webp'], check=True)
# stones and metals cropped from the licensed photographs (real surfaces)
P = os.path.join(PUBLIC, 'photos')
def from_webp(path):
    tmp = WORK + '/_dec.png'
    subprocess.run(['dwebp', '-quiet', path, '-o', tmp], check=True); return cv2.imread(tmp)
stones = {
 'arabescato': (from_webp(f'{P}/bath-arabescato-2000.webp'), (560, 120, 1060, 787)),
 'nero-marquina': (from_webp(f'{P}/kitchen-black-marble-2000.webp'), (1600, 470, 1850, 803)),
}
stones['calacatta'] = (cv2.imread('orig/4800189.jpg'), (2520, 1906, 2854, 2351))
for slug, (img, (x0, y0, x1, y1)) in stones.items():
    c = cv2.resize(img[y0:y1, x0:x1], (480, 640), interpolation=cv2.INTER_AREA)
    cv2.imwrite(WORK + '/_sw.png', c)
    subprocess.run(['cwebp', '-quiet', '-q', '82', WORK + '/_sw.png', '-o', f'{OUT}/stone-{slug}.webp'], check=True)
print('ok')
