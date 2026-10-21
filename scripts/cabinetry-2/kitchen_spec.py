"""The cabinetry demo 02 kitchen: one source of truth for the Blender scene
(blender_build.py) and the dimensioned plan and elevation (draw_plan.py).

Units are inches. Plan origin: x = 0 at the window wall's inner face, running
right along the back wall; y = 0 at the back wall's face, running into the
room toward the camera; z = 0 at the finished floor.

The configuration and scale follow the measured reference camera: a level
camera 42" off the floor, about 292" from the back wall, ~61 degree horizontal
field of view. That gives a run of about 282", an island of 120" whose front
face is about 117" from the back wall, a ~125" ceiling, a hood bottom near 66"
and wall cabinets from about 58". Cabinet sizes use 3" module increments.
"""

CEILING = 125.0
WALL_T = 8.0

# --- back-wall run --------------------------------------------------------
TOE_H, TOE_D = 4.5, 3.0          # toe kick height and recess
BOX_TOP = 34.5                   # cabinet box top (toe kick included)
COUNTER_T = 1.5                  # mitred stone edge
COUNTER_TOP = BOX_TOP + COUNTER_T  # 36"
BASE_D = 24.0                    # carcass depth
FRAME_T = 0.75                   # face frame / door thickness (inset: flush)
COUNTER_D = BASE_D + FRAME_T + 0.75  # 25.5": 3/4" overhang past the face
FRAME_W = 1.5                    # stiles and rails
REVEAL = 0.125                   # inset door gap

# Each module: (code, width, kind). Kinds:
#   D3 three drawers, D2 two drawers, SINK false front over a door pair,
#   DW integrated dishwasher styled as two drawers, COOK two deep drawers,
#   DOOR drawer over a door pair, FILL scribe filler.
RUN = [
    ('F1', 3, 'FILL'),
    ('B1', 30, 'D3'),
    ('B2', 36, 'SINK'),
    ('B3', 24, 'DW'),
    ('B4', 30, 'D2'),
    ('B5', 36, 'COOK'),
    ('B6', 30, 'D2'),
    ('B7', 30, 'D3'),
    ('B8', 30, 'DOOR'),
    ('B9', 30, 'DOOR'),
    ('F2', 3, 'FILL'),
]
RUN_LEN = sum(w for _, w, _ in RUN)  # 282


# Fronts from the top rail down: (opening height, kind), with a FRAME_W rail
# between openings and at top and bottom (30" of face frame per base box).
OPENINGS = {
    'D3': [(6, 'drawer'), (9, 'drawer'), (9, 'drawer')],
    'D2': [(12.75, 'drawer'), (12.75, 'drawer')],
    'DW': [(12.75, 'panel'), (12.75, 'panel')],
    'SINK': [(6, 'false'), (19.5, 'doors')],
    'COOK': [(9, 'drawer'), (16.5, 'drawer')],
    'DOOR': [(6, 'drawer'), (19.5, 'doors')],
}


def run_modules():
    """(code, x0, x1, kind) along the run."""
    out, x = [], 0.0
    for code, w, kind in RUN:
        out.append((code, x, x + w, kind))
        x += w
    return out


SINK = {'x_center': 51.0, 'w': 30.0, 'd': 18.0, 'y_back': 3.0}   # undermount, in B2
COOKTOP = {'x_center': 141.0, 'w': 36.0, 'd': 21.0, 'y_back': 2.0}  # induction, flush, in B5
FAUCET = {'x': 51.0, 'y': 1.75, 'h': 16.0}

BACKSPLASH = {'z0': COUNTER_TOP, 'z1': 58.0, 't': 0.75, 'slabs': 2}  # book-matched on the hood centre line

# --- wall cabinets over B8-B9 ----------------------------------------------
UPPER = {'x0': 219.0, 'x1': 279.0, 'z0': 58.0, 'z1': 94.0, 'd': 13.0, 'boxes': 2}
STACKER = {'z0': 94.0, 'z1': 106.0}   # glass-front stackers above the uppers
CROWN = {'z0': 106.0, 'z1': 107.5}

# --- hood (plaster, part of the architecture) -------------------------------
HOOD = {'x_center': 141.0, 'z_bottom': 66.0, 'w_bottom': 42.0, 'd_bottom': 24.0,
        'w_top': 34.0, 'd_top': 18.0, 'band_h': 4.0}

# --- island -------------------------------------------------------------------
AISLE = 48.0
ISLAND = {'x_center': 141.0, 'len': 120.0, 'depth': 44.0, 'top_t': 2.0, 'end_t': 2.0,
          'y_back': COUNTER_D + AISLE}       # 73.5; front face at 117.5
ISLAND['x0'] = ISLAND['x_center'] - ISLAND['len'] / 2
ISLAND['x1'] = ISLAND['x_center'] + ISLAND['len'] / 2
ISLAND['y_front'] = ISLAND['y_back'] + ISLAND['depth']
FLUTE_W = 1.25                     # half-round flutes on the camera side
FRIDGE_DRAWERS = {'x0': 96.0, 'x1': 123.0}  # refrigerator drawers, run-facing side

# --- pendants ----------------------------------------------------------------
PENDANTS = {'xs': [111.0, 141.0, 171.0], 'y': (ISLAND['y_back'] + ISLAND['y_front']) / 2,
            'globe_d': 11.0, 'bottom_z': 72.0}

# --- architecture ----------------------------------------------------------------
WINDOW = {'y0': 10.0, 'y1': 100.0, 'z0': 20.0, 'z1': 112.0, 'cols': 3, 'rows': 4, 'frame': 2.0, 'mullion': 1.25}
PILLAR = {'x0': RUN_LEN, 'x1': RUN_LEN + 28.0, 'y1': 30.0}
ROOM = {'x1': 420.0, 'y1': 360.0}
OUTLETS = [(18.0, 46.0), (99.0, 46.0), (183.0, 46.0), (264.0, 46.0)]  # (x, z) on the backsplash

# --- camera (matches the measured reference) ----------------------------------------
CAMERA = {'x': 141.0, 'y': 292.0, 'z': 42.0, 'sensor_w_mm': 36.0, 'focal_mm': 30.5}
# Phone: same eye, portrait, a ~43 degree horizontal view that still holds the whole island;
# level (verticals stay straight), with ceiling and floor bands for the captions.
PHONE_CAMERA = {'x': 141.0, 'y': 292.0, 'z': 42.0, 'sensor_w_mm': 36.0, 'focal_mm': 46.0, 'shift_y': 0.02}

# --- refrigeration (outside the frame) ----------------------------------------------
# Full-height fridge and freezer columns stand on the pantry wall right of the
# pillar; the island's refrigerator drawers serve the sink and cooktop.
