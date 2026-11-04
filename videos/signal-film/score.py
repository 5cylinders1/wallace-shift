"""Synthesize the 54-second SIGNAL score. Usage: python score.py [output.wav].

Requires NumPy. Instruments and the granular source material are generated
from analytic oscillators and a fixed random seed. No external audio assets.
"""
import sys
import wave
from pathlib import Path

import numpy as np

RATE = 48000
SECONDS = 54
BPM = 96
PULSE = 60 / BPM
TAU = 2 * np.pi
rng = np.random.default_rng(5508)
master = np.zeros((SECONDS * RATE, 2))


def timebase(duration):
    return np.arange(round(duration * RATE)) / RATE


def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def add(time, source, level, pan=0):
    index = round(time * RATE)
    count = min(len(source), len(master) - index)
    if count < 1:
        return
    angle = np.pi * (pan + 1) / 4
    master[index:index + count, 0] += source[:count] * level * np.cos(angle)
    master[index:index + count, 1] += source[:count] * level * np.sin(angle)


def fade(t, attack, release):
    return np.minimum(1, t / attack) * np.minimum(1, (t[-1] - t) / release)


def wire(time, note, length, level, pan, echoes=True):
    """Strike a wire. Its inharmonic transient relaxes into a clear pitch."""
    t = timebase(length)
    fundamental = TAU * hz(note) * t
    out = np.sin(fundamental + .86 * np.sin(2.015 * fundamental) * np.exp(-t / .082))
    out += .28 * np.sin(3.008 * fundamental) * np.exp(-t / .12)
    out += .07 * np.sin(7.1 * fundamental) * np.exp(-t / .052)
    out *= fade(t, .003, .04) * np.exp(-t / (length * .29))
    add(time, out, level, pan)
    if echoes:
        add(time + PULSE * .75, out, level * .28, -.67 * pan)
        add(time + PULSE * 1.5, out, level * .11, .7 * pan)


def cloud(time, chord, length, level, density):
    """Overlapping grains dart around the chords; there is no static pad loop."""
    for _ in range(round(length * density)):
        duration = rng.uniform(.065, .24)
        t = timebase(duration)
        f = hz(rng.choice(chord) + rng.choice([0, 12], p=[.73, .27]))
        sig = np.sin(TAU * f * t + rng.uniform(-1, 1) * (t / duration) ** 2)
        sig += .17 * np.sin(TAU * f * 3.02 * t)
        window = np.hanning(len(t)) ** 1.3
        at = rng.uniform(0, max(.01, length - duration))
        # Slight swell across each cue instead of constant-height noise.
        add(time + at, sig * window, level * (.55 + .45 * at / length), rng.uniform(-.86, .86))


def low(time, note, length, level):
    t = timebase(length)
    angle = TAU * hz(note) * t
    sound = .85 * np.sin(angle) + .29 * np.sin(2 * angle + .21 * np.sin(3 * angle))
    sound += .13 * np.sin(3 * angle) * np.exp(-t / .17)
    add(time, sound * fade(t, .018, .055) * np.exp(-t / .80), level)


def knock(time, level):
    t = timebase(.37)
    angle = TAU * (48 * t + 3.9 * (1 - np.exp(-t / .028)))
    sound = np.sin(angle) * np.exp(-t / .085)
    sound += .16 * np.sin(TAU * 820 * t) * np.exp(-t / .006)
    add(time, sound * fade(t, .0016, .04), level)


def click(time, level, pan):
    t = timebase(.075)
    burst = rng.normal(0, .32, len(t))
    color = .32 * np.sin(TAU * 1280 * t) + np.diff(burst, prepend=0)
    add(time, color * fade(t, .001, .012) * np.exp(-t / .013), level, pan)


def glow(time, chord, length, level):
    t = timebase(length)
    env = np.sin(np.pi * t / length) ** .7
    for i, note in enumerate(chord):
        angle = TAU * hz(note) * t
        for side in (-1, 1):
            osc = np.sin(angle * (1 + side * .0013)) + .12 * np.sin(2 * angle)
            add(time, osc * env, level, side * (.27 + .12 * i))


def lift(end, level):
    length = .68
    t = timebase(length)
    phase = TAU * (125 * t + 165 * t * t)
    tone = .47 * np.sin(phase) + .20 * np.sin(phase * 3.007)
    grain = np.diff(rng.normal(0, .25, len(t)), prepend=0)
    air = (tone + grain) * (t / length) ** 3 * fade(t, .05, .014)
    add(end - length, air, level, -.34)
    add(end - length + .018, air, level * .64, .59)


# Three distinct notes introduce the sonic identity in isolation.
cloud(0, [53, 60, 67], 4, .049, 12)
glow(0, [53, 60, 67], 3.6, .053)
for time, note, pan in [(.12, 77, -.55), (.59, 72, .56), (1.44, 79, .02)]:
    wire(time, note, .96, .36, pan)
low(1.57, 41, 1.1, .36)
lift(4, .25)

sequence = [
    (4, 41, [55, 60, 65, 68]), (9, 37, [53, 56, 60, 63]),
    (14, 44, [55, 60, 63, 70]), (19, 39, [55, 58, 62, 65]),
    (24, 41, [56, 60, 63, 67]),
]
for scene, (start, root, chord) in enumerate(sequence):
    glow(start, chord, 5.05, .040)
    cloud(start, chord, 5, .038, 13 + 2 * scene)
    lift(start + 5, .18)
    for pulse in (0, 2.5, 4, 6, 7.5):
        knock(start + pulse * PULSE, .61 if pulse in (0, 4) else .37)
    for pos, interval, length in [(0.13, 0, .47), (1.75, 12, .28), (3, 7, .34),
                                   (4.2, 0, .59), (6, 7, .35), (7.125, 12, .3)]:
        low(start + pos * PULSE, root - 12 + interval, length, .56 if interval == 0 else .41)
    for j, pos in enumerate([1, 1.75, 3, 3.5, 5, 6.5, 7]):
        click(start + pos * PULSE, .27 if j in (0, 2, 4, 6) else .14, (-1) ** j * .43)
    picking = [(0, 3), (.75, 1), (2.25, 2), (4, 3), (5.5, 0), (6.75, 1)]
    for j, (pos, degree) in enumerate(picking):
        wire(start + pos * PULSE, chord[degree] + 12, .67, .22 if j else .31, np.sin(j * 1.5) * .62)

# Interruption. The original wire/pulse fractures into dry echoes and then stops.
for bar in range(3):
    start = 29 + 2.72 * bar
    chord = [56, 60, 63, 67]
    cloud(start, chord, 2.60, .061, 26 + 4 * bar)
    knock(start, .65)
    low(start + .08, 29, .71, .52)
    for j, gap in enumerate([.28, .45, .54, 1.14, 1.77, 1.9, 2.00, 2.07]):
        wire(start + gap, [79, 72, 79, 77][j % 4], .16, .23, (-1) ** j * .73, False)
        click(start + gap + .025, .25, (-1) ** (j + 1) * .38)
lift(38, .36)
# Gather into one broad chord. The motif returns lower and its echoes widen.
for start, root, chord in [(38, 37, [53, 56, 60, 63]), (43, 39, [55, 58, 62, 65])]:
    glow(start, chord, 5.04, .068)
    cloud(start, chord, 5, .035, 16)
    for j in range(8):
        if j % 2 == 0:
            knock(start + j * PULSE, .67 if j == 0 else .51)
        else:
            click(start + j * PULSE, .30, (-1) ** (j // 2) * .31)
    for j, n in enumerate([0, 7, 0, 12]):
        low(start + j * 2 * PULSE + .09, root - 12 + n, .68, .51)
    for j, (p, n) in enumerate([(0, 3), (.75, 1), (2.25, 2), (4.5, 3), (6, 2)]):
        wire(start + p * PULSE, chord[n] + 12, .92, .30, [-.6, .44, .05, .5, -.33][j])
lift(48, .19)
# Brand landing. Let the last consonant shimmer die away before the final frame.
knock(48, .69)
low(48.10, 29, 1.25, .56)
glow(48, [53, 60, 63, 67], 5.48, .067)
cloud(48, [60, 65, 67], 3.3, .028, 12)
for pos, n, pan in [(48.08, 77, -.45), (48.55, 72, .43), (49.40, 79, 0), (50.82, 77, -.22), (50.96, 84, .26)]:
    wire(pos, n, 1.36, .31, pan)

master *= np.minimum(1, np.arange(len(master))[::-1] / (.58 * RATE))[:, None]
master = np.tanh(1.22 * master)
master *= .83 / np.max(np.abs(master))
target = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('/tmp/ws-signal-film/score.wav')
target.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(target), 'wb') as wav:
    wav.setparams((2, 2, RATE, len(master), 'NONE', 'not compressed'))
    wav.writeframes(np.rint(master * 32767).astype('<i2').tobytes())
