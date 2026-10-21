"""Generate the Tambour hero build sequence with gpt-image-2.

One finished kitchen is generated; every construction stage is an edit of the
stage after it (same camera), and the blueprint and wireframe are edits of the
finished kitchen. Each call is logged with its prompt, token usage and cost in
output/cabinetry/hero/ledger.json, and no call is made that could take the
total past the approved budget.

    python3 scripts/cabinetry/generate_hero.py finished
    python3 scripts/cabinetry/generate_hero.py cabinetry   # edits finished.png
    ...

Approved budget: $5 (Matthew, 2026-10-19).
"""
import base64, json, os, sys, time, urllib.error, urllib.request
from paths import ROOT, WORK

BUDGET = 5.00
WORST_CASE = 0.40  # never start a call unless this much headroom remains
RATES = {'image_in': 8, 'text_in': 5, 'image_out': 30}  # USD per million tokens, as in api/_lib/roof-render
MODEL = 'gpt-image-2'
SIZE = '1536x1024'
HERO = os.path.join(WORK, 'hero')
LEDGER = os.path.join(HERO, 'ledger.json')
os.makedirs(HERO, exist_ok=True)

LOOK = ('Editorial interiors photograph for a high-end architecture magazine, shot on a full-frame camera with a 24mm '
        'tilt-shift lens, real materials and natural light, subtle film grain. Photorealistic; not a 3D render, '
        'no CGI look. No people, no text, no logos, no watermarks.')
SAME = ('This is the same room photographed from the exact same tripod position: keep the camera, lens, framing, '
        'perspective, room shape, ceiling height, window positions and sizes, the arched opening on the right, and the '
        'locations of the walls exactly as in the reference. Only the construction stage changes.')

STEPS = {
    'finished': (None,
        'A newly completed luxury kitchen in a custom-built home, photographed straight on from the middle of the room '
        'at standing eye level, one-point perspective with perfectly vertical lines. The range wall is centered and fills '
        'the back of the room: in its center a tall, smooth white plaster range hood above a 48-inch professional range and '
        'a honed white marble slab backsplash. On both sides, warm-white painted inset shaker cabinetry runs up to a '
        '10-foot ceiling, with glass-front upper cabinets that have softly lit interiors and unlacquered brass knobs and '
        'pulls. In the foreground center, a long kitchen island painted deep ink navy with a thick honed white marble top '
        'and four woven-seat counter stools. Three large antique-brass and clear-glass lantern pendants hang over the island. '
        'On the left wall, a pair of tall black steel-framed windows with soft daylight. On the right, an arched opening '
        'leading to a butler’s pantry. Wide-plank white oak floor. Calm late-morning light. ' + LOOK),
    'cabinetry': ('finished',
        SAME + ' Stage: about two weeks before completion, during finish carpentry. The painted cabinets and the navy '
        'island base are installed, but: no cabinet hardware yet; the range hood is an unfinished frame of raw plywood and '
        'pine; no range, just an empty opening; no backsplash, bare primed drywall behind; the island has no countertop; '
        'no pendants, only bare electrical wires hanging from the ceiling boxes; no stools and no decor; the floor is '
        'covered in brown rosin paper with taped seams; a stepladder and a tripod LED work light stand by the island. '
        'Realistic jobsite photograph, same daylight. ' + LOOK),
    'drywall': ('cabinetry',
        SAME + ' Stage: earlier, after drywall. Walls and ceiling are hung drywall, primed white, with visible tape and '
        'mud at the seams; round recessed-light cutouts in the ceiling; electrical boxes and capped plumbing stubs in the '
        'walls. Only a few unpainted raw plywood base cabinet boxes are set along the back wall. No upper cabinets, no '
        'hood, no island, no appliances, no hanging wires. Bare plywood subfloor with sawdust, a tripod work light, a '
        'stack of drywall offcuts. Same daylight. ' + LOOK),
    'roughin': ('drywall',
        SAME + ' Stage: earlier still, rough-in. No drywall: the walls are exposed wood studs filled with pink fiberglass '
        'batt insulation, the ceiling shows open wood joists. Yellow electrical cable runs to blue outlet boxes; copper '
        'and red and blue PEX plumbing stubs where the sink and range will go. No cabinets at all. Plywood subfloor. '
        'An orange extension cord and a glowing halogen work light on the floor. Same daylight through the windows. ' + LOOK),
    'framing': ('roughin',
        SAME + ' Stage: the earliest, bare framing. Only the wood structure: exposed studs, headers and ceiling joists '
        'with OSB sheathing visible between the exterior studs. No insulation, no wiring, no plumbing, no cabinets. '
        'Plywood subfloor with pencil marks and sawdust, a framing nailer and a few offcuts on the floor. Warm sunlight '
        'through the windows casting stud shadows. ' + LOOK),
    'blueprint': ('finished',
        'Redraw this kitchen as an architect’s blueprint perspective drawing: crisp, thin white technical linework on '
        'deep cobalt-blue blueprint paper, in exactly the same one-point perspective and proportions as the photograph. '
        'Draw the cabinet door panels, the glass uppers, the range hood, the range, the island with its stools, the three '
        'lantern pendants, the windows and the arched opening. Add a few fine dimension lines and small hand-lettered '
        'annotations. Flat paper only: no shading, no photographic texture, no color other than white lines on blue.'),
    'wireframe': ('finished',
        'Turn this photograph into a precise holographic wireframe overlay: only thin, luminous white lines with a faint '
        'cool-blue glow tracing the outlines of the cabinets and their door panels, the glass uppers, the range hood, the '
        'range, the island and its stools, the three lantern pendants, the windows and the arched opening, each line '
        'exactly where that edge is in the photograph. Pure black background everywhere else. No fills, no textures, no '
        'shading, no floor or wall detail.'),
}

KEEP_WINDOW = (' Keep the window, its black steel frame and grille, the arched niche around it and the window seat opening '
               'exactly the same size, shape and position as in the reference, and keep every cabinet bay, shelf line and the '
               'width of the wall exactly where they are. ')
BATH = ('A newly completed primary bathroom in a custom-built home, photographed straight on from the doorway at standing eye '
        'level, one-point perspective with perfectly vertical lines. Centered on the back wall, a tall black steel-framed '
        'window with soft daylight, and in front of it a freestanding white stone bathtub with a brass floor-mounted filler. '
        'Along the left wall, a long floating double vanity in rift-sawn white oak with a thick honed white marble top, two '
        'sinks, unlacquered brass faucets, two arched mirrors and brass wall sconces. On the right, a frameless glass shower '
        'lined in honed marble slab with a brass rain head, and a tall rift-oak linen cabinet. Warm white plaster walls, '
        'large-format honed marble floor, a soft plaster cove at the ceiling. Calm morning light. ' + LOOK)
LIBRARY = ('A newly completed home library and study in a custom-built home, photographed straight on at standing eye level, '
           'one-point perspective with perfectly vertical lines. The whole back wall is floor-to-ceiling built-in cabinetry '
           'painted deep forest green: inset-door base cabinets with unlacquered brass knobs, open shelves above lined with '
           'books and a few objects, a brass picture light over each bay, and a centered arched niche framing a black '
           'steel-framed window with a cushioned window seat. A brass library ladder on a rail spans the shelves. In the '
           'foreground, a walnut writing desk with a cognac leather chair. Wide-plank white oak floor, a plaster ceiling with '
           'one painted beam. Calm daylight. ' + LOOK)
STEPS.update({
    'bath/finished': (None, BATH),
    'bath/vanity': ('finished', SAME + ' Stage: about two weeks before completion. The marble slab walls and floor tile are '
        'installed and the oak vanity cabinet is hung, but it has no countertop, sinks or faucets yet; no mirrors, sconces '
        'or shower glass, only capped wires in wall boxes; the tub is in place wrapped in protective film; protective board '
        'on part of the floor; a tripod LED work light. Realistic jobsite photograph, same daylight. ' + LOOK),
    'bath/drywall': ('vanity', SAME + ' Stage: earlier. Walls are primed drywall and cement backer board with taped seams; '
        'the shower walls are coated in blue-green liquid waterproofing membrane; a mortar bed slopes to the shower drain. '
        'No tile, no stone, no vanity, no tub; capped supply stubs and a drain where the vanity, tub and shower will go. '
        'Bare plywood subfloor with dust, a tripod work light. Same daylight. ' + LOOK),
    'bath/roughin': ('drywall', SAME + ' Stage: rough plumbing. No drywall: exposed wood studs; red and blue PEX supply '
        'lines and copper fittings to the vanity and the shower valve, the rain-head riser strapped in the framing; black '
        'drain pipes and the tub drain stub in the subfloor; blue electrical boxes for the sconces. Plywood subfloor. Same '
        'daylight through the window. ' + LOOK),
    'bath/framing': ('roughin', SAME + ' Stage: the earliest, bare framing. Only the wood structure: studs, headers and '
        'joists with OSB sheathing visible on the exterior wall. No plumbing, no wiring, no drywall. Plywood subfloor with '
        'sawdust and a few offcuts. Warm sunlight through the window casting stud shadows. ' + LOOK),
    'bath/evening': ('finished', 'Show this exact photograph at dusk, same camera and everything in place: deep blue twilight '
        'outside the window, the brass sconces and a hidden LED cove at the ceiling glowing warm, soft warm reflections on '
        'the marble, the room otherwise unchanged. Photorealistic. ' + LOOK),
    'bath/wireframe': ('finished', STEPS['wireframe'][1].replace('cabinets and their door panels, the glass uppers, the range hood, the range, the island and its stools, the three lantern pendants', 'vanity and its drawers, the marble top and sinks, the mirrors and sconces, the bathtub, the shower glass and rain head, the linen cabinet')),
    'bath/blueprint': ('finished', STEPS['blueprint'][1].replace('the cabinet door panels, the glass uppers, the range hood, the range, the island with its stools, the three lantern pendants', 'the vanity with its drawers and mirrors, the sconces, the bathtub, the shower with its glass and rain head, the linen cabinet')),
    'library/finished': (None, LIBRARY),
    'library/cabinetry': ('finished', SAME + ' Stage: about two weeks before completion. The green cabinetry and shelves '
        'are installed and painted, but the shelves are empty with no books or objects, the brass hardware is not fitted, '
        'the picture lights are not installed (wires capped), the window seat has no cushion, there is no ladder, desk or '
        'chair; drop cloths on the floor, a pair of sawhorses and a tripod work light. Same daylight. ' + LOOK),
    'library/boxes': ('cabinetry', SAME + KEEP_WINDOW + ' Stage: earlier. Raw unpainted maple plywood cabinet carcasses and face frames '
        'are being set against the back wall; no doors, no shelves, no paint; the arched niche is framed in raw wood. Walls '
        'and ceiling are primed drywall. Plywood subfloor with sawdust, clamps and a level on the floor. Same daylight. ' + LOOK),
    'library/drywall': ('boxes', SAME + KEEP_WINDOW.replace(', and keep every cabinet bay, shelf line and the width of the wall exactly where they are', '') + ' Stage: earlier still. An empty room of primed drywall with taped seams and '
        'electrical boxes along the back wall where the picture lights will go; the arched opening around the window is '
        'framed and drywalled; no cabinetry at all. Bare plywood subfloor, a tripod work light. Same daylight. ' + LOOK),
    'library/framing': ('drywall', SAME + KEEP_WINDOW.replace(', and keep every cabinet bay, shelf line and the width of the wall exactly where they are', '') + ' Stage: the earliest, bare framing. Only the wood structure: studs, headers, '
        'the framed arch and ceiling joists, OSB sheathing on the exterior wall. No drywall, no wiring. Plywood subfloor '
        'with sawdust. Warm sunlight through the window casting stud shadows. ' + LOOK),
    'library/evening': ('finished', 'Show this exact photograph in the evening, same camera and everything in place: '
        'dark blue night outside the window, every brass picture light glowing warm on the books, a desk lamp lit, warm '
        'pools of light on the green cabinetry, the room otherwise unchanged. Photorealistic. ' + LOOK),
    'library/wireframe': ('finished', STEPS['wireframe'][1].replace('cabinets and their door panels, the glass uppers, the range hood, the range, the island and its stools, the three lantern pendants', 'built-in cabinets and their door panels, the shelves, the arched niche and window seat, the library ladder and rail, the picture lights, the desk and chair')),
    'library/blueprint': ('finished', STEPS['blueprint'][1].replace('the cabinet door panels, the glass uppers, the range hood, the range, the island with its stools, the three lantern pendants', 'the built-in cabinets with their doors, the shelves, the arched niche and window seat, the library ladder, the picture lights, the desk')),
})


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
    source, prompt = STEPS[step]
    room = os.path.dirname(step)
    folder = os.path.join(HERO, room)
    os.makedirs(folder, exist_ok=True)
    name = os.path.basename(step)
    spent = sum(entry['cost'] for entry in ledger())
    if spent + WORST_CASE > BUDGET:
        raise SystemExit(f'Budget guard: ${spent:.2f} spent of ${BUDGET:.2f}; not calling.')
    body = {'model': MODEL, 'prompt': prompt, 'size': SIZE, 'quality': 'high', 'n': 1, 'output_format': 'png'}
    endpoint = 'generations'
    if source:
        with open(os.path.join(folder, f'{source}.png'), 'rb') as handle:
            body['images'] = [{'image_url': 'data:image/png;base64,' + base64.b64encode(handle.read()).decode()}]
        endpoint = 'edits'
    started = time.time()
    if source:
        body['input_fidelity'] = 'high'
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
                body.pop('input_fidelity'); response = post(body)
            else:
                raise SystemExit(f'{step}: HTTP {error.code} {message[:400]}')
    except urllib.error.HTTPError as error:
        raise SystemExit(f'{step}: HTTP {error.code} {error.read().decode()[:400]}')
    image = base64.b64decode(response['data'][0]['b64_json'])
    version = 1 + sum(1 for entry in ledger() if entry['step'] == step)
    path = os.path.join(folder, f'{name}.png')
    if os.path.exists(path):
        os.replace(path, os.path.join(folder, f'{name}.v{version - 1}.png'))
    with open(path, 'wb') as handle:
        handle.write(image)
    usage = response.get('usage') or {}
    entry = {'step': step, 'version': version, 'source': source, 'endpoint': endpoint, 'model': MODEL, 'size': SIZE, 'input_fidelity': body.get('input_fidelity'),
             'prompt': prompt, 'usage': usage, 'cost': round(cost(usage), 4), 'seconds': round(time.time() - started, 1)}
    json.dump(ledger() + [entry], open(LEDGER, 'w'), indent=1)
    total = sum(item['cost'] for item in ledger())
    print(f'{step} v{version}: ${entry["cost"]:.3f} ({entry["seconds"]}s); total ${total:.2f} of ${BUDGET:.2f}')


if __name__ == '__main__':
    for name in sys.argv[1:]:
        call(name)
