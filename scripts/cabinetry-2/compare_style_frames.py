"""Reference vs our style frames, side by side at the same framing.

Reference: rectified reel frames (viewport only, y 88-900 of 1440x900) at the
empty-room hero (frame 80) and the finished room (frame 380). Ours: the
Blender style frames. Writes output/cabinetry-2/renders/style-vs-reference.jpg.
"""
import os
import cv2
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'output', 'cabinetry-2')
W = 960


def ref(frame):
    im = cv2.imread(os.path.join(ROOT, 'ref', 'rect', f'r_{frame:04d}.jpg'))[88:900]
    return cv2.resize(im, (W, int(W * im.shape[0] / im.shape[1])), interpolation=cv2.INTER_AREA)


def ours(name, h):
    im = cv2.imread(os.path.join(ROOT, 'renders', name))
    im = cv2.resize(im, (W, int(W * im.shape[0] / im.shape[1])), interpolation=cv2.INTER_AREA)
    pad = h - im.shape[0]  # 16:9 render vs 1440x812 viewport: centre it
    if pad > 0:
        im = cv2.copyMakeBorder(im, pad // 2, pad - pad // 2, 0, 0, cv2.BORDER_CONSTANT, value=(20, 20, 20))
    return im[:h]


def label(im, text):
    out = im.copy()
    cv2.rectangle(out, (0, 0), (out.shape[1], 30), (16, 16, 16), -1)
    cv2.putText(out, text, (10, 21), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1, cv2.LINE_AA)
    return out


def main():
    r0, r1 = ref(80), ref(380)
    h = r0.shape[0]
    o0, o1 = ours('style_empty_day.png', h), ours('style_kitchen_dusk.png', h)
    grid = np.vstack([np.hstack([label(r0, 'Reference: empty room (camera colour cast)'), label(o0, 'Ours: empty room, late afternoon')]),
                      np.hstack([label(r1, 'Reference: finished, "Supper at eight"'), label(o1, 'Ours: finished, dusk')])])
    out = os.path.join(ROOT, 'renders', 'style-vs-reference.jpg')
    cv2.imwrite(out, grid, [cv2.IMWRITE_JPEG_QUALITY, 90])
    print('wrote', os.path.abspath(out))


if __name__ == '__main__':
    main()
