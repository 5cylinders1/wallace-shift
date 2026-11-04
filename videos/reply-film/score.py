"""An original press-room groove for The Next Reply. Render with Python and NumPy."""
from pathlib import Path
import sys
import wave

import numpy as np

sr = 48000
length = 54
beat = .625  # 96 BPM, two bars per channel
rng = np.random.default_rng(1931)
mix = np.zeros((sr * length, 2))
tau = 2 * np.pi


def axis(seconds):
    return np.arange(round(seconds * sr)) / sr


def insert(at, signal, gain=1, pan=0):
    offset = round(at * sr)
    count = min(len(signal), len(mix) - offset)
    if count <= 0:
        return
    angle = (pan + 1) * np.pi / 4
    mix[offset:offset + count, 0] += gain * np.cos(angle) * signal[:count]
    mix[offset:offset + count, 1] += gain * np.sin(angle) * signal[:count]


def envelope(t, attack=.002, release=.02):
    return np.minimum(1, t / attack) * np.minimum(1, (t[-1] - t) / release)


def pitch(n):
    return 440 * 2 ** ((n - 69) / 12)


def room(at, sig, gain, pan):
    insert(at, sig, gain, pan)
    for delay, level, loc in [(.021, .10, -.31), (.038, .07, .47), (.068, .045, -.61), (.107, .031, .41)]:
        insert(at + delay, sig, gain * level, loc)


def mallet(at, midi, gain=.4, pan=0, damp=.40):
    # Bending modes of a wooden bar have inharmonic upper partials.
    t = axis(damp * 3.6)
    a = tau * pitch(midi) * t
    sig = np.sin(a) * np.exp(-t / damp)
    sig += .41 * np.sin(3.99 * a) * np.exp(-t / .071)
    sig += .14 * np.sin(9.72 * a) * np.exp(-t / .028)
    room(at, sig * envelope(t, .0032, .045), gain, pan)


def pluck(at, midi, duration, gain=.59):
    t = axis(duration)
    a = tau * pitch(midi) * t + .13 * (1 - np.exp(-t / .045))
    sig = np.sin(a) + .55 * np.sin(2 * a) * np.exp(-t / .24)
    sig += .29 * np.sin(3 * a + .16) * np.exp(-t / .18)
    sig += .20 * np.sin(4 * a) * np.exp(-t / .081)
    sig += rng.normal(0, .06, len(t)) * np.exp(-t / .013)
    insert(at, sig * envelope(t, .006, .065) * np.exp(-t / .52), gain, -.10)


def press(at, force=.7):
    t = axis(.39)
    angle = tau * (61 * t + 1.95 * (1 - np.exp(-t / .031)))
    sig = np.sin(angle) * np.exp(-t / .094)
    sig += .39 * np.sin(tau * 143 * t) * np.exp(-t / .042)
    sig += .12 * np.sin(tau * 673 * t) * np.exp(-t / .013)
    insert(at, sig * envelope(t), force)


def snap(at, gain, pan=.32):
    # A sheet whipping off the roller has several irregular, brief crackles.
    t = axis(.103)
    cloud = rng.normal(0, .32, len(t))
    diff = np.diff(cloud, prepend=0)
    bursts = np.zeros_like(t)
    for start, height in [(0, .77), (.008, .39), (.021, .67), (.038, .32)]:
        bursts += height * np.exp(-np.abs(t - start) / .006)
    sig = (.63 * cloud + .36 * diff) * bursts
    room(at, sig * envelope(t, .0006, .013), gain, pan)


def roller(at, length, gain, pan):
    # Paper advances with a dry repeating fiber texture and a soft friction bed.
    t = axis(length)
    raw = rng.normal(0, .31, len(t))
    teeth = (.55 + .45 * np.sin(tau * (24 * t - 4 * t * t) + .3)) ** 2
    sig = (.29 * np.diff(raw, prepend=0) + .71 * raw) * teeth
    insert(at, sig * np.hanning(len(t)) ** .68, gain, pan)


def clack(at, gain, pan):
    t = axis(.083)
    sig = sum(level * np.sin(tau * freq * t) for level, freq in [(1, 937), (.62, 1493), (.21, 2840)])
    room(at, sig * np.exp(-t / .012) * envelope(t, .0011, .015), gain, pan)


def voicing(at, notes, duration, gain):
    # Felted chord with a small hand-played spread across its voicing.
    for i, n in enumerate(notes):
        mallet(at + i * .018, n, gain, -.44 + .29 * i, duration)


# The press starts by hand. Introduce the four-note hook against empty space.
press(.09, .80)
roller(.22, .46, .64, -.58)
for pos, midi, pan in [(.65, 76, -.4), (.98, 79, .28), (1.45, 73, -.19), (2.17, 74, .37)]:
    mallet(pos, midi, .43, pan, .48)
pluck(2.46, 40, .8, .62)
snap(3.23, .81, -.36)
roller(3.57, .41, .81, .42)

# Two bars per channel, on borrowed major-seventh harmony.
parts = [(4, 40, [55, 59, 62, 66]), (9, 45, [54, 59, 61, 64]),
         (14, 48, [55, 59, 62, 64]), (19, 47, [54, 57, 61, 64]),
         (24, 40, [55, 59, 62, 66])]
for j, (start, root, chord) in enumerate(parts):
    for k in (0, 1.65, 3.5, 4, 6.65):
        press(start + k * beat, .67 if k in (0, 4) else .37)
    for k in (1, 3, 5, 7):
        snap(start + k * beat + .016, .83 if k in (1, 5) else .62)
    for k in (.65, 2.65, 4.65, 5.65, 7.65):
        clack(start + k * beat, .15 if k == 7.65 else .12, -.49)
    for k, n, d in [(0, 0, .62), (1.65, 7, .24), (2.65, 12, .28), (4, 0, .61), (5.65, 7, .25), (7, 2, .39)]:
        pluck(start + k * beat + .023, root + n, d, .50 if n == 0 else .40)
    voicing(start + .67 * beat, chord, .34, .135)
    voicing(start + 4.67 * beat, chord, .43, .13)
    for k, index in [(0, 2), (.65, 3), (2, 0), (3.65, 1), (5.34, 2), (6.65, 1)]:
        mallet(start + k * beat, chord[index] + 12, .29, -.26 if index % 2 else .44, .30)
    roller(start + 4.61, .38, .69, .49 if j % 2 else -.53)
# The paper feed overruns. Separate mechanical voices fall out of register.
roller(29, .98, .9, -.5)
snap(29.68, .92, .32)
for j in range(15):
    start = 30 + .51 * j
    clack(start, .23, -.6 + .24 * (j % 6))
    snap(start + (.11 if j % 3 else .03), .51, .65 - .31 * (j % 4))
    if j % 3 == 0:
        press(start, .78)
        pluck(start + .06, 40 if j % 2 else 35, .32, .48)
    if j % 4 == 0:
        roller(start + .15, .31, .64, -.56)
    mallet(start + .22, [76, 73, 74, 71][j % 4], .23, .47 if j % 2 else -.55, .13)
roller(37.51, .46, 1.02, .25)

# Return to slower, wider upright-bass figures and the complete hook.
for start, root, chord in [(38, 45, [54, 59, 61, 64]), (43, 47, [54, 57, 61, 64])]:
    for k in (0, 2.65, 4, 6.65):
        press(start + k * beat, .74 if k in (0, 4) else .45)
    for k in (1, 3, 5, 7):
        snap(start + k * beat, .78, .23)
    for k, n in [(0, 0), (2.65, 7), (4, 0), (6.65, 12)]:
        pluck(start + .025 + k * beat, root + n, .60, .53)
    voicing(start, chord, .67, .166)
    voicing(start + 4 * beat, chord, .56, .14)
    for k, n in [(0, 76), (.65, 79), (2.0, 73), (3.65, 74), (5.34, 76), (6.65, 71)]:
        mallet(start + k * beat, n, .33, np.cos(k) * .43, .41)
    roller(start + 4.53, .43, .68, -.57)

# Cadence on E minor ninth. Press stops first; the wood is allowed to ring.
press(48, .79)
pluck(48.03, 40, 1.2, .62)
voicing(48.08, [55, 59, 62, 66], .73, .18)
for k, n in [(0, 76), (.65, 79), (2, 73), (3.65, 74), (5.2, 76)]:
    mallet(48.15 + k * beat, n, .37, np.cos(k) * .37, .60)
roller(49.22, .42, .66, -.40)
snap(50.35, .61)
pluck(51.24, 40, 1.18, .46)
voicing(51.36, [55, 59, 66, 71], .68, .165)

mix *= np.minimum(1, np.arange(len(mix))[::-1] / (.37 * sr))[:, None]
mix = np.tanh(1.11 * mix)
mix *= .83 / np.max(np.abs(mix))
target = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('/tmp/ws-reply-film/score.wav')
target.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(target), 'wb') as wav:
    wav.setparams((2, 2, sr, len(mix), 'NONE', 'not compressed'))
    wav.writeframes(np.rint(mix * 32767).astype('<i2').tobytes())
