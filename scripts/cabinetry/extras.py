"""The walnut slat texture for the tambour door, from the Poly Haven walnut veneer scan."""
import cv2, numpy as np, subprocess, os
from paths import PUBLIC, WORK as SCR


def s2l(x): x = x / 255.0; return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)
def l2s(x): x = np.clip(x, 0, 1); return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(x, 1 / 2.4) - 0.055) * 255


im = cv2.imread('ph/american_walnut_veneer.jpg')
lin = s2l(im.astype(np.float32))
lum = (0.0722 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.2126 * lin[..., 2])[..., None]
tint = np.array((1.00, 0.72, 0.50)[::-1])
fin = np.power(lin, 1.45) * tint * 1.08 * 0.85 + np.power(lum, 1.45) * tint * 1.08 * 0.15
slat = cv2.resize(l2s(fin).astype(np.uint8)[0:1024, 0:2048], (1600, 800), interpolation=cv2.INTER_AREA)
cv2.imwrite(f'{SCR}/_x.png', slat)
subprocess.run(['cwebp', '-quiet', '-q', '80', f'{SCR}/_x.png', '-o', os.path.join(PUBLIC, 'tambour-walnut.webp')], check=True)
os.remove(f'{SCR}/_x.png')
print('tambour-walnut.webp')
