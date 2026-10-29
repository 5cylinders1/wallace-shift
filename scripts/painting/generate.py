"""Generate the Complete Painting concept imagery with gpt-image-2.

The hero is one house from one tripod position. The finished house is
generated first; every earlier stage is an edit, so the timelapse changes
only the paint and the prep around it:

    finished   -> weathered   (old faded paint, peeling trim, rot)
    weathered  -> prepped     (washed, scraped, masked, drop cloths)
    prepped    -> primed      (rot replaced, trim and bare spots primed)
    finished + primed -> painted (new colors, masking still on)

Every call is logged with its prompt, token usage and cost in
output/painting/ledger.json, and no call starts that could take the total
past the approved budget.

    python3 scripts/painting/generate.py finished
    python3 scripts/painting/generate.py weathered prepped primed painted
    python3 scripts/painting/generate.py interior cabinets carpentry commercial

Approved budget: $5 (Matthew, 2026-10-29), shared with the visualizer's
prepared sample previews (scripts/painting/prepare-samples.mjs).
"""
import base64, json, os, sys, time, urllib.error, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
WORK = os.path.join(ROOT, 'output', 'painting')
LEDGER = os.path.join(WORK, 'ledger.json')
os.makedirs(WORK, exist_ok=True)

BUDGET = 5.00
WORST_CASE = 0.40  # never start a call unless this much headroom remains
RATES = {'image_in': 8, 'text_in': 5, 'image_out': 30}  # USD per million tokens, as in scripts/lawn
MODEL = 'gpt-image-2'
SIZE = '1536x1024'

LOOK = ('Architectural exterior photograph for a high-end home magazine, full-frame camera, 50mm lens on a tripod, '
        'verticals perfectly straight, natural light, true-to-life color, subtle film grain. Photorealistic; not a 3D '
        'render, no CGI look, no HDR. No people, no vehicles, no animals, no ladders, no text, no logos, no house '
        'numbers, no signs, no watermarks.')
DETAIL = ('Editorial interior or detail photograph for a high-end home magazine, full-frame camera, natural light, '
          'true-to-life color, subtle film grain. Photorealistic; not a 3D render, no CGI look. No people, no text, '
          'no logos, no brand names, no watermarks.')
SAME = ('This is the same house photographed from the exact same tripod position in the same light: keep the camera, '
        'lens, framing, perspective, the house shape and every architectural detail, the windows, roof, porch, lawn, '
        'planting, walk, trees and sky exactly as in the reference.')

STEPS = {
    'finished': ([],
        'A handsome two-story traditional family home in an established Kansas City suburb, photographed almost '
        'straight-on from the far side of its front lawn, camera level at standing eye height, so the facade reads '
        'nearly as a flat elevation. The house is centered and spans roughly the middle 60 percent of the frame width, '
        'with sky above it and a mature tree at each edge of the frame. The whole facade, both stories and the front '
        'gable, is clad in horizontal lap siding freshly painted a deep, rich blue-green (a dark evergreen teal) with a '
        'soft satin sheen. Crisp warm-white trim: wide corner boards, window casings and sills, fascia, soffits, gable '
        'trim, a covered front porch across the left two-thirds of the facade with square white columns and a white '
        'railing. Black window sashes, a front door painted a saturated golden ochre with a brass handle, two black '
        'lanterns, a dark charcoal shingle roof, white gutters. A neatly mown lawn fills the lower fifth of the frame, '
        'with a straight concrete walk to the porch steps and simple clipped boxwoods along the foundation. Bright, '
        'soft late-afternoon light from the left, gentle shadows, a clear pale blue sky with a few soft clouds. ' + LOOK),
    'weathered': (['finished'],
        SAME + ' Only the paint changes, to how the house looked before it was repainted, many years after its last '
        'paint job: the lap siding is an old, dated, faded and chalky pale butter-yellow, sun-bleached and blotchy, '
        'with gray mildew and dirt streaks running down beneath the eaves and the window sills, and cracked, peeling '
        'paint on the lower boards. The trim is a dingy yellowed off-white, alligatored and flaking, with bare gray '
        'weathered wood showing on the fascia, the window sills and the porch railing; the fascia board at the right '
        'end of the lower roof and the base of the rightmost porch column are visibly rotted, soft and split. The '
        'front door is a faded, sun-worn dull brick red with peeling paint; the gutters are dingy and stained. The '
        'roof, the window glass, the lawn, planting, walk, trees, sky and light are unchanged. ' + LOOK),
    'prepped': (['weathered'],
        SAME + ' Keep the old faded butter-yellow siding color, the dingy trim color, the rotted fascia and column '
        'base and the faded red door exactly as in the reference, with one change: a professional painting crew has '
        'prepared the house. The siding and trim are power-washed clean, with no mildew or dirt streaks left; loose '
        'and peeling paint has been scraped and sanded away, leaving feathered sanded edges and small scattered '
        'patches of bare gray wood; every window and the front door are masked with clear plastic sheeting and blue '
        "painter's tape, the lanterns are bagged in plastic, and canvas drop cloths cover the foundation beds and the "
        'porch floor. Everything else is unchanged. ' + LOOK),
    'primed': (['prepped'],
        SAME + ' Keep the masking plastic, the blue tape and the canvas drop cloths exactly as in the reference, with '
        'one change, the next stage of the job: the rotted fascia board and the rotted column base have been replaced '
        'with new straight boards; all of the trim (corner boards, window casings and sills, fascia, soffits, gable '
        'trim, porch columns and railing) and the new boards are coated in flat bright-white primer; the sanded and '
        'bare spots on the siding are spot-primed with irregular patches of flat white primer, so the old faded '
        'yellow siding shows between them. The door is still the old faded red. Everything else is unchanged. ' + LOOK),
    # v1 was an edit of `primed` toward the finished colors; it drifted to navy.
    # v2 starts from the finished house and only adds the masking back.
    'painted': (['finished', 'primed'],
        'Both images show the same house from the same tripod position. Produce the first image exactly as it is, '
        'keeping its deep blue-green lap siding, warm-white trim, colors, sheen, light and every detail identical, '
        "with one change: add the job's masking exactly as it appears in the second image: clear plastic sheeting "
        "taped with blue painter's tape over every window and over the front door, the two lanterns bagged in "
        'clear plastic, and canvas drop cloths covering the foundation beds, the porch floor and the porch steps. '
        'Do not change the paint colors. Keep the camera, framing and every building detail identical to the first '
        'image. ' + LOOK),
    'interior': ([],
        'A calm, freshly painted living room in a Kansas family home: walls in a soft warm greige with a smooth even '
        'finish, crisp white painted crown molding, baseboards and window casings, a sharp clean line where the wall '
        'meets the white ceiling, a large window with soft afternoon light, a linen sofa, an oak floor, a single '
        'potted olive tree. Wide view, 28mm lens, straight verticals. ' + DETAIL),
    'cabinets': ([],
        'A kitchen with freshly refinished painted shaker cabinets in a deep muted sage green with a smooth, '
        'factory-like satin finish and no brush marks, unlacquered brass pulls, white quartz counters, a white zellige '
        'tile backsplash, soft morning light from a window at the side. Three-quarter view of the cabinet run, 35mm '
        'lens. ' + DETAIL),
    'carpentry': ([],
        'A close detail of an exterior house corner during repair: a new, straight, primed white fascia board and '
        'corner trim replacing rotted wood, crisp caulked joints, beside deep blue-green painted lap siding with a '
        'satin sheen, warm late-afternoon light raking across the boards, shallow depth of field, 85mm lens. ' + DETAIL),
    'commercial': ([],
        'A small single-story brick and stucco commercial storefront on a quiet Kansas main street, freshly painted: '
        'smooth warm off-white stucco, deep charcoal window frames and door, a dark blue-green awning trim band, clean '
        'sidewalk, bright soft morning light, photographed straight-on, 35mm lens. No signage text at all; blank sign '
        'band. ' + LOOK),
}


def api_key() -> str:
    with open(os.path.join(ROOT, '.env.local')) as handle:
        for line in handle:
            if line.startswith('OPENAI_API_KEY='):
                return line.split('=', 1)[1].strip().strip('"\'')
    raise SystemExit('OPENAI_API_KEY is not set in .env.local')


def ledger() -> list:
    return json.load(open(LEDGER)) if os.path.exists(LEDGER) else []


def cost(usage: dict) -> float:
    details = usage.get('input_tokens_details') or {}
    return (details.get('image_tokens', 0) * RATES['image_in'] + details.get('text_tokens', 0) * RATES['text_in']
            + usage.get('output_tokens', 0) * RATES['image_out']) / 1_000_000


def call(step: str) -> None:
    sources, prompt = STEPS[step]
    spent = sum(entry['cost'] for entry in ledger())
    if spent + WORST_CASE > BUDGET:
        raise SystemExit(f'Budget guard: ${spent:.2f} spent of ${BUDGET:.2f}; not calling.')
    body = {'model': MODEL, 'prompt': prompt, 'size': SIZE, 'quality': 'high', 'n': 1, 'output_format': 'png'}
    endpoint = 'generations'
    if sources:
        body['images'] = []
        for source in sources:
            with open(os.path.join(WORK, f'{source}.png'), 'rb') as handle:
                body['images'].append({'image_url': 'data:image/png;base64,' + base64.b64encode(handle.read()).decode()})
        body['input_fidelity'] = 'high'
        endpoint = 'edits'
    started = time.time()

    def post(payload):
        req = urllib.request.Request(f'https://api.openai.com/v1/images/{endpoint}', data=json.dumps(payload).encode(),
                                     headers={'Authorization': f'Bearer {api_key()}', 'Content-Type': 'application/json'})
        return json.load(urllib.request.urlopen(req, timeout=300))

    try:
        try:
            response = post(body)
        except urllib.error.HTTPError as error:
            message = error.read().decode()
            if error.code == 400 and 'input_fidelity' in message:
                body.pop('input_fidelity')
                response = post(body)
            else:
                raise SystemExit(f'{step}: HTTP {error.code} {message[:400]}')
    except urllib.error.HTTPError as error:
        raise SystemExit(f'{step}: HTTP {error.code} {error.read().decode()[:400]}')
    image = base64.b64decode(response['data'][0]['b64_json'])
    version = 1 + sum(1 for entry in ledger() if entry['step'] == step)
    path = os.path.join(WORK, f'{step}.png')
    if os.path.exists(path):
        os.replace(path, os.path.join(WORK, f'{step}.v{version - 1}.png'))
    with open(path, 'wb') as handle:
        handle.write(image)
    usage = response.get('usage') or {}
    entry = {'step': step, 'version': version, 'sources': sources, 'endpoint': endpoint, 'model': MODEL, 'size': SIZE,
             'input_fidelity': body.get('input_fidelity'), 'prompt': prompt, 'usage': usage,
             'cost': round(cost(usage), 4), 'seconds': round(time.time() - started, 1)}
    json.dump(ledger() + [entry], open(LEDGER, 'w'), indent=1)
    total = sum(item['cost'] for item in ledger())
    print(f'{step} v{version}: ${entry["cost"]:.3f} ({entry["seconds"]}s); total ${total:.2f} of ${BUDGET:.2f}')


if __name__ == '__main__':
    for name in sys.argv[1:]:
        call(name)
