"""Widen the hero's view: one gpt-image-2 edit that extends the finished
house's photograph outward, as if taken from further back.

The house filled about 80 percent of the original frame, so a full-bleed hero
could only ever show house. This shrinks the finished frame into the middle
of a new 1536x1024 canvas and has the model fill the border (sky, the full
tree canopies, neighbouring yards, more lawn). The page then draws the
surroundings once and each timelapse frame on top of it at full resolution
(scene.py prepares and exports the plate), so the paint still only ever
changes on the house.

Logged in output/painting/ledger.json with generate.py's calls, under the
same $5 budget. Needs numpy, Pillow and opencv-python-headless:

    <venv>/bin/python scripts/painting/outpaint.py
"""
import base64, io, json, os, sys, time, urllib.error, urllib.request
import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from generate import BUDGET, LOOK, MODEL, SIZE, WORK, WORST_CASE, api_key, cost, ledger, LEDGER  # noqa: E402

# Where the original frame sits in the widened view: scaled to 64 percent and
# centred, so the house spans about half the new frame's width. Keep in step
# with SCENE in src/demos/painting/Hero.tsx (scene.py prints the numbers).
SCALE = 0.64
WIDTH, HEIGHT = 1536, 1024

PROMPT = (
    'The middle of this image is a photograph of a house; the border around it is blank. Fill the border so the '
    'whole image becomes one seamless, wider photograph of the same scene taken from further back down the street, '
    'with the same camera height, lens look, perspective, late-afternoon light from the left, colors and film grain. '
    'Continue what is cut off at the edges: the sky with a few soft clouds above the roof; the full canopies and '
    'trunks of the two mature trees at the left and right; beyond them, neighbouring lawns, clipped hedges and the '
    'partly hidden corners of neighbouring houses set back among the trees; more of the mown front lawn in the '
    'foreground, with the straight concrete walk continuing down to a public sidewalk that runs across the bottom '
    'of the frame. Keep the house, the porch, the walk, the planting and everything in the middle exactly as given. '
    + LOOK
)


def main() -> None:
    spent = sum(entry['cost'] for entry in ledger())
    if spent + WORST_CASE > BUDGET:
        raise SystemExit(f'Budget guard: ${spent:.2f} spent of ${BUDGET:.2f}; not calling.')
    original = cv2.imread(os.path.join(WORK, 'plate', 'finished.png'), cv2.IMREAD_COLOR)
    width, height = round(WIDTH * SCALE), round(HEIGHT * SCALE)
    x, y = (WIDTH - width) // 2, (HEIGHT - height) // 2
    small = cv2.resize(original, (width, height), interpolation=cv2.INTER_AREA)

    # A blurred stretch of the photo behind the blank border, so the model starts from the right colors.
    canvas = cv2.GaussianBlur(cv2.resize(original, (WIDTH, HEIGHT)), (0, 0), 40)
    canvas[y:y + height, x:x + width] = small
    # Opaque where the photo must stay, transparent where the model paints.
    mask = np.zeros((HEIGHT, WIDTH, 4), np.uint8)
    mask[y + 4:y + height - 4, x + 4:x + width - 4, 3] = 255

    def png(array: np.ndarray) -> str:
        buffer = io.BytesIO()
        Image.fromarray(array).save(buffer, 'PNG')
        return 'data:image/png;base64,' + base64.b64encode(buffer.getvalue()).decode()

    body = {
        'model': MODEL, 'prompt': PROMPT, 'size': SIZE, 'quality': 'high', 'n': 1, 'output_format': 'png',
        'images': [{'image_url': png(cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB))}],
        'mask': {'image_url': png(mask)},
    }
    started = time.time()
    request = urllib.request.Request('https://api.openai.com/v1/images/edits', data=json.dumps(body).encode(),
                                     headers={'Authorization': f'Bearer {api_key()}', 'Content-Type': 'application/json'})
    try:
        response = json.load(urllib.request.urlopen(request, timeout=300))
    except urllib.error.HTTPError as error:
        raise SystemExit(f'HTTP {error.code} {error.read().decode()[:600]}')

    version = 1 + sum(1 for entry in ledger() if entry['step'] == 'surround')
    path = os.path.join(WORK, 'surround.png')
    if os.path.exists(path):
        os.replace(path, os.path.join(WORK, f'surround.v{version - 1}.png'))
    with open(path, 'wb') as handle:
        handle.write(base64.b64decode(response['data'][0]['b64_json']))
    usage = response.get('usage') or {}
    entry = {'step': 'surround', 'version': version, 'sources': ['plate/finished.png'], 'endpoint': 'edits+mask',
             'model': MODEL, 'size': SIZE, 'inset': {'x': x, 'y': y, 'width': width, 'height': height},
             'prompt': PROMPT, 'usage': usage, 'cost': round(cost(usage), 4), 'seconds': round(time.time() - started, 1)}
    json.dump(ledger() + [entry], open(LEDGER, 'w'), indent=1)
    total = sum(item['cost'] for item in ledger())
    print(f'surround v{version}: ${entry["cost"]:.3f} ({entry["seconds"]}s); total ${total:.2f} of ${BUDGET:.2f}')
    print(f'inset x={x} y={y} width={width} height={height}')


if __name__ == '__main__':
    main()
