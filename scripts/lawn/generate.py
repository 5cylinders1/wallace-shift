"""Generate the Trawsome Lawn Care concept imagery with gpt-image-2.

One finished front yard is generated first. The overgrown stage is an edit of
it (same camera), and the half-done stage is an edit given both: the overgrown
beds and debris with the finished lawn's stripes, so each scroll transition
changes only one thing. Every call is logged with its prompt, token usage and
cost in output/lawn/ledger.json, and no call starts that could take the total
past the approved budget.

    python3 scripts/lawn/generate.py finished
    python3 scripts/lawn/generate.py overgrown mowed
    python3 scripts/lawn/generate.py edge beds leaves

Approved budget: $4 (Matthew, 2026-10-29).
"""
import base64, json, os, sys, time, urllib.error, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
WORK = os.path.join(ROOT, 'output', 'lawn')
LEDGER = os.path.join(WORK, 'ledger.json')
os.makedirs(WORK, exist_ok=True)

BUDGET = 4.00
WORST_CASE = 0.40  # never start a call unless this much headroom remains
RATES = {'image_in': 8, 'text_in': 5, 'image_out': 30}  # USD per million tokens, as in scripts/cabinetry
MODEL = 'gpt-image-2'
SIZE = '1536x1024'

LOOK = ('Architectural exterior photograph for a high-end home and garden magazine, full-frame camera, 35mm lens, '
        'natural light, true-to-life color, subtle film grain. Photorealistic; not a 3D render, no CGI look, no HDR. '
        'No people, no vehicles, no animals, no text, no logos, no house numbers, no signs, no watermarks.')
DETAIL = ('Editorial detail photograph for a high-end home and garden magazine, full-frame camera, 85mm lens, shallow '
          'depth of field, natural light, true-to-life color, subtle film grain. Photorealistic; not a 3D render, no CGI '
          'look. No people, no tools, no text, no logos, no watermarks.')
SAME = ('This is the same house photographed from the exact same tripod position at the same moment: keep the camera, '
        'lens, framing, perspective, the house and every architectural detail, the trees, the sky and the golden evening '
        'light exactly as in the reference. Only the condition of the yard changes.')

STEPS = {
    'finished': ([],
        'A handsome two-story Craftsman-style family home in a quiet Johnson County, Kansas neighborhood, photographed from '
        'the far edge of its front lawn with the camera level at chest height, so the lawn fills the lower third of the frame. '
        'The house is centered and spans roughly the middle half of the frame width, with open sky and mature trees on '
        'either side. Deep green-black painted lap siding, natural tan limestone wainscot and porch columns, crisp white '
        'trim, a covered front porch with two lanterns, a dark charcoal shingle roof. A broad, perfectly maintained front '
        'lawn of dense, deep-green tall fescue mowed in crisp alternating diagonal stripes, every edge razor-sharp along a '
        'clean light-gray concrete driveway on the right and a straight front walk leading to the porch steps. Neatly '
        'clipped boxwoods and rounded shrubs in fresh dark-brown mulch beds with a clean spade-cut edge along the '
        'foundation; a mature oak on the left, a maple on the right. Early evening golden hour: low warm sun from the left '
        'raking across the stripes, long soft shadows, a clear pale blue sky warming toward the horizon. ' + LOOK),
    'overgrown': (['finished'],
        SAME + ' Condition: the yard has been neglected for about two months of summer. The lawn is shaggy, uneven and '
        'shin-to-knee high, gone to seed with tall seed heads, clumps of crabgrass, dandelions and clover, with no stripes '
        'at all; the grass flops over the edges of the driveway and the front walk, and weeds grow from the cracks and '
        'joints of the concrete. The shrubs are overgrown and shapeless with long leggy shoots, the beds are choked with '
        'weeds and the mulch has faded gray and mostly gone. Fallen leaves, small sticks and two fallen tree limbs lie on '
        'the lawn and the driveway. The house, trees, sky and light are unchanged. ' + LOOK),
    'mowed': (['overgrown', 'finished'],
        'Both images show the same house from the same tripod position. Produce the first image exactly as it is (the '
        'house, the overgrown shapeless shrubs, the weedy beds with faded gray mulch, the weeds in the driveway joints, '
        'the ragged grass creeping over the edges of the driveway and walk, the leaves and sticks on the driveway, the '
        'trees, sky and light) with one change: the lawn itself has just been mowed, and it is now short, dense and '
        'striped exactly like the lawn in the second image, with the same diagonal stripe pattern in the same places. The '
        'fallen limbs and debris that were on the lawn are gone; the debris on the driveway and walk remains. Keep the '
        'camera, framing and every building detail identical to the first image. ' + LOOK),
    'edge': ([],
        'A low-angle detail of a freshly edged front lawn: a razor-straight vertical cut line where dense, deep-green tall '
        'fescue mowed in stripes meets a clean light-gray concrete front walk, the concrete swept spotless, golden evening '
        'light raking low across the grass blades, the stripes receding softly out of focus toward a dark green-painted '
        'Craftsman porch with tan limestone columns. ' + DETAIL),
    'beds': ([],
        'Neatly clipped rounded boxwoods in a fresh dark-brown shredded mulch bed with a crisp spade-cut edge against a '
        'striped deep-green lawn, in front of a natural tan limestone wainscot under dark green-black lap siding, soft '
        'golden evening light. ' + DETAIL),
    'leaves': ([],
        'A Kansas front lawn in mid-autumn, seen at a low angle: the far half is still covered in a thick blanket of fallen '
        'orange, yellow and brown oak and maple leaves and a few small fallen sticks, the near half has been cleared to '
        'clean, freshly mowed deep-green stripes, with a clean line between them; a mature oak trunk at one side, late '
        'afternoon golden light. ' + DETAIL),
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
