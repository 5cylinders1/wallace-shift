"""Render the original 120 BPM score for the 54-second Wallace Shift film.

Usage: python sound.py [output.wav] (requires NumPy).
All instruments, effects and musical material are synthesized here.
"""
from pathlib import Path
import sys
import wave

import numpy as np

RATE = 48000
DURATION = 54
rng = np.random.default_rng(701)
mix = np.zeros((RATE * DURATION, 2), dtype=np.float64)
tau = 2 * np.pi
beat = 0.5


def clock(duration):
    return np.arange(round(duration * RATE)) / RATE


def pitch(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def place(start, signal, gain, pan=0):
    offset = round(start * RATE)
    count = min(len(signal), len(mix) - offset)
    if count <= 0:
        return
    signal = signal[:count]
    theta = (pan + 1) * np.pi / 4
    mix[offset:offset + count, 0] += gain * np.cos(theta) * signal
    mix[offset:offset + count, 1] += gain * np.sin(theta) * signal


def envelope(t, attack, decay, release=0.025):
    return (1 - np.exp(-t / attack)) * np.exp(-t / decay) * np.clip((t[-1] - t) / release, 0, 1)


def note(start, midi, gain, pan=0, sustain=.20, echo=True):
    t = clock(sustain * 5)
    phase = tau * pitch(midi) * t
    tone = np.sin(phase + (1.8 * np.exp(-t / .08) + .16) * np.sin(phase * 2))
    tone += .18 * np.sin(phase * 2.002)
    tone *= envelope(t, .0045, sustain)
    place(start, tone, gain, pan)
    if echo:
        place(start + .1875, tone, gain * .24, -.65 * pan)
        place(start + .375, tone, gain * .095, pan * .45)


def kick(start, gain):
    t = clock(.42)
    phase = tau * (48 * t + 100 * .036 * (1 - np.exp(-t / .036)))
    body = np.sin(phase) * envelope(t, .002, .105)
    body += .10 * np.sin(tau * 1750 * t) * envelope(t, .0008, .006)
    place(start, body, gain)


def rim(start, gain):
    t = clock(.22)
    noise = rng.normal(0, .35, len(t))
    high = np.diff(noise, prepend=0)
    for i, delay in enumerate([0, .013, .025]):
        click = high * envelope(t, .001, .013 + i * .006)
        place(start + delay, click, gain * (.9 - i * .13), i * .13 - .13)
    wood = (np.sin(tau * 184 * t) + .38 * np.sin(tau * 331 * t)) * envelope(t, .0015, .043)
    place(start, wood, gain * .65)


def hat(start, gain, pan, open_hat=False):
    t = clock(.29 if open_hat else .11)
    noise = rng.normal(0, .25, len(t))
    metal = sum(np.sin(tau * f * t) for f in (6323, 8041, 10411)) * .13
    signal = (np.diff(noise, prepend=0) + metal) * envelope(t, .0015, .065 if open_hat else .023)
    place(start, signal, gain, pan)


def bass(start, midi, length, gain):
    t = clock(length)
    phase = tau * pitch(midi) * t
    s = np.sin(phase + .66 * np.exp(-t / .09) * np.sin(phase * 2))
    s += .21 * np.sin(2 * phase) + .08 * np.sin(3 * phase)
    place(start, s * envelope(t, .015, .43, .034), gain)


def pad(start, chord, length, gain):
    t = clock(length)
    env = np.clip(t / .20, 0, 1) * np.clip((length - t) / .42, 0, 1)
    # Recede around the four-on-the-floor accents.
    em = env * (.66 + .34 * (1 - np.exp(-np.mod(t, beat) / .1)))
    for n, midi in enumerate(chord):
        phase = tau * pitch(midi) * t
        for side in (-1, 1):
            s = np.sin(phase * (1 + side * .0011)) + .24 * np.sin(2 * phase)
            place(start, s * em, gain, side * (.31 + .12 * n))


def sweep(end, length, gain):
    t = clock(length)
    n = rng.normal(0, .22, len(t))
    bright = np.diff(n, prepend=0)
    raised = (t / length) ** 3 * np.minimum(1, (length - t) / .035)
    s = (.38 * bright + np.sin(tau * (130 * t + 150 * t ** 2))) * raised
    place(end - length, s, gain, -.18)
    place(end - length + .012, s, gain * .73, .55)


chords = [
    (38, [53, 57, 60, 64]), (34, [53, 57, 62, 65]),
    (41, [52, 57, 60, 67]), (36, [52, 55, 62, 67]),
]
for bar in range(27):
    start = 2 * bar
    root, chord = chords[(bar - 2) % 4]
    if bar < 2:  # Open on the three-note signature before revealing the beat.
        for offset, midi in [(0, 74), (.375, 77), (1, 81)]:
            note(start + offset, midi, .33 if bar == 0 else .24, -.32 + offset * .43)
        kick(start, .64)
        if bar == 1:
            pad(start, [53, 57, 60, 64], 2, .044)
        continue
    if bar >= 24:  # Landing phrase and a full second of decay before the cut.
        if bar == 24:
            pad(start, [53, 57, 62, 65], 2.08, .052)
            kick(start, .71)
            bass(start + .09, 34, .85, .4)
            note(start + .50, 74, .29, -.35, .31)
            note(start + 1.25, 77, .29, .30, .26)
        elif bar == 25:
            kick(start, .74)
            bass(start + .09, 38, 1.6, .47)
            pad(start, [53, 57, 60, 64], 3.35, .054)
            note(start + .25, 81, .32, -.28, .45)
        else:
            for i, midi in enumerate([74, 77, 81]):
                note(start + .0625 * i, midi, .17, (i - 1) * .45, .30)
        continue
    messy = 15 <= bar < 19
    airy = 12 <= bar < 15
    full = bar >= 19
    pad(start, chord, 1.96, .031 if messy else .047)
    rhythm = [0, 2.5] if messy else [0, 2] if airy else [0, 1, 2, 3]
    for k in rhythm:
        kick(start + k * beat, .78 if k == 0 else .62)
    for k in ([3] if airy or messy else [1, 3]):
        rim(start + k * beat + .009, .39)
    for k in range(8):
        if messy and k in [1, 2, 5]:
            continue
        hat(start + k * .25 + (.009 if k % 2 else .002),
            .195 if k % 2 else .105, (-1) ** k * .36, k == 7)
    for off, degree, length in [(0.10, 0, .31), (.75, 7, .21), (1.08, 0, .31), (1.72, 12, .19)]:
        if airy and degree or (messy and off == 1.08):
            continue
        bass(start + off, root + degree, length, .53 if degree == 0 else .31)
    ticks = [(.125, 2), (.625, 1), (1.375, 3)] if not airy else [(.375, 1), (1.375, 2)]
    if messy:
        ticks = [(.125, 0), (.3125, 0), (.4375, 0), (1.625, 2), (1.75, 2)]
    if full:
        ticks += [(1.75, 1)]
    for i, (off, degree) in enumerate(ticks):
        note(start + off, chord[degree] + 12, .15 if messy else .24,
             [-.52, .33, .44, -.2, .13][i], .07 if messy else .14)
    if bar in (5, 9, 13, 21):
        note(start + 1.50, 81, .17, -.28, .16)
for boundary, length in [(4, .67), (24, .7), (30, .65), (38, 1.00), (48, .74)]:
    sweep(boundary, length, .14)

mix *= np.minimum(1, np.arange(len(mix)) / (RATE * .006))[:, None]
mix *= np.minimum(1, np.arange(len(mix))[::-1] / (RATE * .5))[:, None]
mix = np.tanh(1.18 * mix)
mix *= .85 / np.max(np.abs(mix))
path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('/tmp/ws-lead-cut/audio.wav')
path.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(path), 'wb') as target:
    target.setparams((2, 2, RATE, len(mix), 'NONE', 'not compressed'))
    target.writeframes(np.rint(mix * 32767).astype('<i2').tobytes())
