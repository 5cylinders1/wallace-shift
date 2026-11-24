"""Generate the LP Construction concept imagery with gpt-image-2.

The hero is one two-story foyer from one tripod position. The finished foyer
is generated first; every other stage is an edit of it, so the timelapse
changes only the carpentry:

    finished -> before   (builder-grade: blank beige walls, carpeted stair, oak spindles)
    before   -> torn     (carpet, spindles and base pulled; panel layout marked)
    finished -> built    (raw MDF and oak, nailed up, nothing filled or painted)
    finished -> primed   (filled, caulked, primed; treads still raw)

The idea tool's sample room is a second scene: a plain living room, then
three edits of it, one per wall style it can show without a live render.

Every call is logged with its prompt, token usage and cost in
output/lp-construction/ledger.json, and no call starts that could take the
total past the approved budget.

    python3.12 -I scripts/lp-construction/generate.py finished
    python3.12 -I scripts/lp-construction/generate.py before primed built
    python3.12 -I scripts/lp-construction/generate.py torn
    python3.12 -I scripts/lp-construction/generate.py room room-frames room-grid room-slats room-wainscot room-geometric

Approved budget: $5 (Matthew, 2026-11-24), shared with live test renders
of the idea tool in local dev.
"""
import base64, json, os, sys, time, urllib.error, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
WORK = os.path.join(ROOT, 'output', 'lp-construction')
LEDGER = os.path.join(WORK, 'ledger.json')
os.makedirs(WORK, exist_ok=True)

BUDGET = 5.00
WORST_CASE = 0.40  # never start a call unless this much headroom remains
RATES = {'image_in': 8, 'text_in': 5, 'image_out': 30}  # USD per million tokens, as in scripts/painting
MODEL = 'gpt-image-2'
HERO_SIZE = '1248x1248'
ROOM_SIZE = '1536x1024'

LOOK = ('Architectural interior photograph for a high-end home magazine, full-frame camera on a tripod, verticals '
        'perfectly straight, natural daylight, true-to-life color, subtle film grain. Photorealistic; not a 3D render, '
        'no CGI look, no HDR. No people, no pets, no text, no logos, no signs, no artwork with writing, no watermarks.')
SAME = ('This is the same foyer photographed from the exact same tripod position in the same daylight: keep the camera, '
        'lens, framing and perspective, the room architecture, the staircase position, size, angle and number of steps, '
        'the balcony landing, the window, the doorway, the floor, the ceiling and the pendant light exactly as in the '
        'reference image.')
ROOM_SAME = ('This is the same living room photographed from the exact same position in the same light: keep the camera, '
             'framing and perspective, the wall size and position, the window, floor, ceiling, sofa, side table, lamp and '
             'light exactly as in the reference image. Change only the wall named below and the trim described.')

STEPS = {
    'finished': ([], HERO_SIZE,
        'A bright two-story entry foyer in a newly finished upscale Kansas City suburban home, photographed from just '
        'inside the front door at standing eye height with a 24mm lens, camera level. A straight staircase rises from the '
        'right half of the frame toward the back, along the right wall, to an open balcony landing at the top. The stair '
        'has white oak treads with a warm natural stain, risers painted crisp white, a painted white skirt board, slim '
        'square black iron balusters, a stained white oak handrail and a square painted white box newel post with a '
        'simple flat cap. The tall wall on the left, two stories high and facing the stair, has full-height picture-frame '
        'wall molding: crisp rectangular panel moldings in a clean, evenly spaced grid, painted the same soft warm white '
        'as the wall in a satin finish. A deep painted crown molding where the walls meet the white ceiling, tall painted '
        'baseboards, wide flat painted casing around a doorway at the back of the foyer. Light wide-plank oak floor. One '
        'small round modern pendant light. Minimal styling: a slim wooden bench against the left wall and one potted olive '
        'tree. Soft daylight from a tall window on the upper landing, gentle shadows. The staircase and the paneled wall '
        'both sit within the central two-thirds of the frame. ' + LOOK),
    'before': (['finished'], HERO_SIZE,
        SAME + ' Show how this foyer looked before any finish carpentry, as a plain builder-grade foyer: the tall left '
        'wall is completely flat, blank drywall painted a dated, slightly dingy beige, with no moldings or panels at all; '
        'the other walls are the same beige; there is no crown molding, only a plain corner where wall meets ceiling; '
        'short, plain 3-inch builder baseboards; thin, plain door casing. The staircase has exactly the same position and '
        'shape, but every tread and riser is covered in worn beige wall-to-wall carpet, with thin turned golden-oak '
        'spindles, a golden-oak handrail and a plain turned golden-oak newel post. No bench and no plant. ' + LOOK),
    'torn': (['before'], HERO_SIZE,
        SAME + ' Keep the beige blank walls, the plain ceiling corner and the doorway exactly as in the reference, and '
        'show the next stage of the job: the carpet and its padding have been pulled off the staircase, exposing rough '
        'pale pine treads and risers with staple holes; the old golden-oak spindles, handrail and newel post have been '
        'removed; the old short baseboards have been pulled off, leaving a bare strip at the bottom of the walls. On the '
        'blank left wall, thin pencil layout lines and one faint red laser level line mark out a grid of rectangular '
        "panels, with blue painter's tape on a few corners. Brown rosin paper covers the floor, and a neat stack of new "
        'white MDF boards lies along the base of the left wall. ' + LOOK),
    'built': (['finished'], HERO_SIZE,
        SAME + ' Show the same finish carpentry the day it was installed, before any filling, caulking or paint: the '
        'picture-frame moldings on the left wall are bare, light gray-brown MDF strips nailed to a plain primed drywall '
        'wall, with visible nail holes and hairline open joints; the crown molding and tall baseboards are new '
        'factory-primed MDF with unfilled seams; the door casing is bare MDF; the stair risers, skirt board and box newel '
        'are raw poplar and MDF; the treads and handrail are raw, unstained pale white oak. The black iron balusters are '
        'installed. Brown rosin paper covers the floor; a few short offcuts lie at the foot of the stair. No bench and no '
        'plant. ' + LOOK),
    'primed': (['finished'], HERO_SIZE,
        SAME + ' Show the same finish carpentry one day before painting: every piece of trim and paneling is installed, '
        'filled and caulked, and coated in flat bright-white primer with no sheen: the picture-frame moldings and the wall '
        'behind them, the crown, the baseboards, the door casing, the stair risers, the skirt board and the box newel. '
        'Thin fresh caulk lines and sanded filler spots show at joints and nail holes. The treads and handrail are raw, '
        'unstained pale white oak, and the treads are covered with brown protective paper taped at the edges. The black '
        'iron balusters are installed. Brown rosin paper covers the floor. No bench and no plant. ' + LOOK),
    'room': ([], ROOM_SIZE,
        'A plain, recently painted living room in a Kansas City family home, photographed nearly straight-on toward one '
        'large blank wall from across the room, camera at standing chest height, 28mm lens, verticals straight. The wall '
        'fills most of the frame: smooth flat drywall painted a soft warm white, a plain 3-inch baseboard, no crown '
        'molding, a window on the right edge of the frame with simple white casing. A low linen sofa sits against the '
        'middle of the blank wall, with a round wooden side table and a simple ceramic lamp beside it. Light oak floor, '
        'soft afternoon daylight from the window. ' + LOOK),
    'room-frames': (['room'], ROOM_SIZE,
        ROOM_SAME + ' On the large blank wall behind the sofa, add full-height picture-frame wall molding: crisp '
        'rectangular panel moldings in an evenly spaced grid, painted the same soft warm white as the wall in a satin '
        'finish. Replace the plain baseboard with a tall painted baseboard and add a painted crown molding along the top '
        'of the wall. ' + LOOK),
    'room-grid': (['room'], ROOM_SIZE,
        ROOM_SAME + ' On the large blank wall behind the sofa, add a board-and-batten grid accent wall: flat painted '
        'battens forming a square grid over the whole wall, the battens and wall painted one deep muted green-gray in a '
        'satin finish. Replace the plain baseboard with a tall baseboard painted to match. ' + LOOK),
    'room-slats': (['room'], ROOM_SIZE,
        ROOM_SAME + ' On the large blank wall behind the sofa, add a modern vertical slat wall: closely spaced vertical '
        'wood slats in a warm natural white oak finish over a dark charcoal backing, running floor to ceiling across the '
        'whole wall. Keep the plain baseboard on the other walls. ' + LOOK),
    'room-wainscot': (['room'], ROOM_SIZE,
        ROOM_SAME + ' On the large blank wall behind the sofa, add raised-panel style wainscoting on the lower third of '
        'the wall: evenly spaced rectangular panel moldings below a painted chair rail, with a tall baseboard below, all '
        'painted the same soft warm white as the wall in a satin finish. Keep the upper two-thirds of the wall plain. '
        + LOOK),
    'room-geometric': (['room'], ROOM_SIZE,
        ROOM_SAME + ' On the large blank wall behind the sofa, add a custom geometric panel design: thin flat moldings '
        'laid out as large diamonds and diagonals across the whole wall, symmetrical about the center of the wall, with '
        'a small diamond at the center, painted the same soft warm white as the wall in a satin finish. Replace the '
        'plain baseboard with a tall painted baseboard. ' + LOOK),
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
    sources, size, prompt = STEPS[step]
    spent = sum(entry['cost'] for entry in ledger())
    if spent + WORST_CASE > BUDGET:
        raise SystemExit(f'Budget guard: ${spent:.2f} spent of ${BUDGET:.2f}; not calling.')
    body = {'model': MODEL, 'prompt': prompt, 'size': size, 'quality': 'high', 'n': 1, 'output_format': 'png'}
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
    entry = {'step': step, 'version': version, 'sources': sources, 'endpoint': endpoint, 'model': MODEL, 'size': size,
             'input_fidelity': body.get('input_fidelity'), 'prompt': prompt, 'usage': usage,
             'cost': round(cost(usage), 4), 'seconds': round(time.time() - started, 1)}
    json.dump(ledger() + [entry], open(LEDGER, 'w'), indent=1)
    total = sum(item['cost'] for item in ledger())
    print(f'{step} v{version}: ${entry["cost"]:.3f} ({entry["seconds"]}s); total ${total:.2f} of ${BUDGET:.2f}')


if __name__ == '__main__':
    for name in sys.argv[1:]:
        call(name)
