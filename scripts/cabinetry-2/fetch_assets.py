"""Download the CC0 materials and HDRI for the cabinetry demo 02 Blender scene.

Everything is CC0 (Poly Haven, ambientCG): no attribution required, credited
anyway in output/cabinetry-2/assets/credits.json. Files land in the ignored
output/cabinetry-2/assets/ folder. Re-running skips files already present.
"""
import io, json, os, subprocess, urllib.request, zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
OUT = os.path.join(ROOT, 'output', 'cabinetry-2', 'assets')
UA = {'User-Agent': 'WallaceShift-demo-build/1.0'}

POLYHAVEN_TEXTURES = {  # id: (resolution, maps)
    'oak_veneer_05': ('2k', ['Diffuse', 'Rough', 'nor_gl']),
    'herringbone_parquet': ('2k', ['Diffuse', 'Rough', 'nor_gl']),
    'beige_wall_001': ('2k', ['Diffuse', 'Rough', 'nor_gl']),
}
POLYHAVEN_HDRIS = {'borghese_gardens': '4k'}
AMBIENTCG = {'Marble014': '4K-JPG'}


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        return r.read()


def save(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as f:
        f.write(data)


def main():
    credits = []
    for tid, (res, maps) in POLYHAVEN_TEXTURES.items():
        files = json.loads(get(f'https://api.polyhaven.com/files/{tid}'))
        for m in maps:
            entry = files[m][res]['jpg' if m != 'nor_gl' else 'jpg']
            path = os.path.join(OUT, tid, f'{tid}_{m}_{res}.jpg')
            if not os.path.exists(path):
                save(path, get(entry['url']))
            print(path, os.path.getsize(path) // 1024, 'KB')
        credits.append({'asset': tid, 'source': f'https://polyhaven.com/a/{tid}', 'licence': 'CC0'})
    for hid, res in POLYHAVEN_HDRIS.items():
        files = json.loads(get(f'https://api.polyhaven.com/files/{hid}'))
        path = os.path.join(OUT, 'hdri', f'{hid}_{res}.hdr')
        if not os.path.exists(path):
            save(path, get(files['hdri'][res]['hdr']['url']))
        print(path, os.path.getsize(path) // 1024, 'KB')
        credits.append({'asset': hid, 'source': f'https://polyhaven.com/a/{hid}', 'licence': 'CC0'})
    for aid, variant in AMBIENTCG.items():
        folder = os.path.join(OUT, aid)
        if not os.path.isdir(folder):
            z = zipfile.ZipFile(io.BytesIO(get(f'https://ambientcg.com/get?file={aid}_{variant}.zip')))
            z.extractall(folder)
        print(folder, sorted(os.listdir(folder)))
        credits.append({'asset': aid, 'source': f'https://ambientcg.com/view?id={aid}', 'licence': 'CC0'})
    # Vertical-grain copies of the oak maps: box projection can't rotate a
    # texture per face, so doors use a pre-rotated image (macOS sips, 90° CCW).
    for m in ('Diffuse', 'Rough'):
        src = os.path.join(OUT, 'oak_veneer_05', f'oak_veneer_05_{m}_2k.jpg')
        dst = os.path.join(OUT, 'oak_veneer_05', f'oak_veneer_05_rot_{m}_2k.jpg')
        if not os.path.exists(dst):
            subprocess.run(['sips', '-r', '270', src, '--out', dst], check=True, capture_output=True)
    json.dump(credits, open(os.path.join(OUT, 'credits.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
