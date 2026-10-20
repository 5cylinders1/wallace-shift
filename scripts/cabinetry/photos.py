import cv2, numpy as np, json, os, subprocess
from paths import PUBLIC, WORK as SCR
OUT = os.path.join(PUBLIC, 'photos'); os.makedirs(OUT, exist_ok=True)
os.makedirs(f'{SCR}/dl', exist_ok=True)
PHOTOS = {
 # slug: (pexels id, photographer, pexels title)
 'kitchen-anatomy':        (4800189, 'Curtis Adams', 'A Kitchen with an Island'),
 'kitchen-island-brass':   (4800175, 'Curtis Adams', 'A kitchen with an island'),
 'kitchen-range-wall':     (4800177, 'Curtis Adams', 'Kitchen interior'),
 'kitchen-to-family-room': (4800185, 'Curtis Adams', 'Kitchen interior'),
 'kitchen-black-marble':   (6538939, 'Max Vakhtbovych', 'Kitchen interior with chairs near counter and cabinets'),
 'kitchen-warm-oak':       (10153052, 'Jonathan Borba', 'Interior Design of a Kitchen'),
 'kitchen-oak-display':    (10153051, 'Jonathan Borba', 'Modern Kitchen Interior'),
 'kitchen-two-tone':       (19227216, 'Curtis Adams', 'Photo of a Luxury Kitchen'),
 'bath-arabescato':        (7166639, 'Max Vakhtbovych', 'A Bathtub Near the Marble Wall'),
 'bath-walnut-brass':      (19141076, 'Patrick Bohn', 'Photo of a Luxurious Bathroom'),
 'bath-primary-shower':    (4800174, 'Curtis Adams', 'A Beautiful Mediterranean Bathroom Design'),
 'bath-white-marble':      (6587855, 'Max Vakhtbovych', 'Modern bathroom with white walls and contemporary bathtub'),
 'bath-double-vanity':     (15667601, 'Curtis Adams', 'Bathroom Interior'),
 'bath-powder-room':       (10153047, 'Jonathan Borba', 'View of a Modern Bathroom'),
 'builtin-dressing-room':  (6585750, 'Max Vakhtbovych', 'Interior of wardrobe with many shelves'),
 'builtin-closet-oak':     (11701120, 'Max Vakhtbovych', 'Empty Dressing Room'),
 'builtin-library':        (7167083, 'Max Vakhtbovych', 'Interior of room with bookshelves'),
 'builtin-fireplace':      (4800186, 'Curtis Adams', 'A Beautiful and Simple Living Room'),
 'builtin-laundry':        (4800182, 'Curtis Adams', 'Laundry room'),
 'shop-hand-plane':        (7109995, 'Daniel Reche', 'A Person using a Wood Planer'),
 'shop-measure':           (5973894, 'Ono Kosuki', 'Crop woodworker measuring wooden board'),
 'shop-sanding':           (5710754, 'Anna Shvets', 'Crop artisan polishing wooden board'),
 'shop-lumber':            (12278570, 'Mark Stebnicki', 'Pile of Wood Planks inside a Warehouse'),
 'shop-plane-closeup':     (374861, 'Burst', 'Man Hold Wood Planer'),
 'shop-fitting':           (5089178, 'cottonbro studio', 'Person in Black T-shirt Holding Brown Wooden Table'),
 'coffee-station':         (5825346, 'Charlotte May', 'Coffee Machine on a Countertop'),
}
def grade(img, vig=0.10):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
    h, s = hsv[...,0], hsv[...,1]
    orange = np.clip(1 - np.abs(h - 14) / 10, 0, 1) * np.clip((s - 50) / 60, 0, 1)
    hsv[...,1] = s * (1 - 0.12 * orange) * 0.97
    out = cv2.cvtColor(np.clip(hsv, 0, 255).astype(np.uint8), cv2.COLOR_HSV2BGR).astype(np.float32) / 255
    out = out + 0.05 * (out - 0.5) * (1 - np.abs(out - 0.5) * 2)
    H, W = out.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    r = np.sqrt(((xx - W/2) / (W/2))**2 + ((yy - H/2) / (H/2))**2) / np.sqrt(2)
    out = out * (1 - vig * np.power(r, 2.4))[..., None]
    return np.clip(out * 255, 0, 255).astype(np.uint8)
manifest = {}
for slug, (pid, who, title) in PHOTOS.items():
    src = f'{SCR}/dl/{pid}.jpg'
    if not os.path.exists(src):  # kitchen-anatomy uses the 5000 px original copied into dl/
        subprocess.run(['curl', '-sf', '-o', src, f'https://images.pexels.com/photos/{pid}/pexels-photo-{pid}.jpeg?auto=compress&cs=tinysrgb&w=2600'], check=True)
    img = cv2.imread(src); g = grade(img)
    H, W = g.shape[:2]
    for size in (2000, 1000):
        w = min(size, W); h = round(H * w / W)
        r = cv2.resize(g, (w, h), interpolation=cv2.INTER_AREA)
        tmp = f'{SCR}/_p.png'; cv2.imwrite(tmp, r)
        subprocess.run(['cwebp', '-quiet', '-q', '80', '-m', '6', tmp, '-o', f'{OUT}/{slug}-{size}.webp'], check=True)
    manifest[slug] = {'id': pid, 'photographer': who, 'title': title, 'w': W, 'h': H}
    print(slug, W, H, flush=True)
json.dump(manifest, open(f'{SCR}/photos_manifest.json', 'w'), indent=1)
