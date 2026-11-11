"""Drain the coloured backdrop glow from a release cover for the hero spotlight.

Each Dialed cover is a rotary phone on a dark backdrop lit in one colour. Under
the spotlight that colour shows as a halo, so the 1200px `-lg` spotlight image
gets the backdrop drained to neutral black. The phone itself is protected and
left untouched. The grid thumbnail always keeps the real cover.

    pip install pillow numpy scipy
    python3 tools/clean-backdrop.py cover-1500.jpg images/release-drx030-lg.jpg \
        --glow r --preview /tmp/compare.jpg

--glow is the backdrop's dominant channel: r (red/orange), g (green) or b (blue).
Always open the preview: the original on the left, the result on the right, both
brightened 2.5x. The backdrop should go to black with no coloured rim left around
the phone, and nothing on the phone should be eaten.
"""
import argparse

import numpy as np
from PIL import Image, ImageEnhance
from scipy import ndimage as ndi

ap = argparse.ArgumentParser()
ap.add_argument('src')
ap.add_argument('out')
ap.add_argument('--glow', choices='rgb', required=True)
ap.add_argument('--preview')
ap.add_argument('--size', type=int, default=1200)
args = ap.parse_args()

im = Image.open(args.src).convert('RGB').resize((args.size, args.size), Image.LANCZOS)
a = np.asarray(im).astype(float)
c = 'rgb'.index(args.glow)
main = a[..., c]
others = np.delete(a, c, axis=2)
lum = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
purity = (main - others.max(axis=2)) / (main + 1)  # 1 = pure backdrop colour


def disk(r):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]
    return x * x + y * y <= r * r


# The phone: anything brightly lit, or anything not in the backdrop colour.
# Closing + hole filling turns that into a solid silhouette (handles the case
# where the phone is the same colour as the glow, like DRX028).
phone = ((purity < 0.25) & (lum > 18)) | (lum > 70)
phone = ndi.binary_opening(phone, disk(2))
phone = ndi.binary_closing(phone, disk(30))
phone = ndi.binary_fill_holes(phone)
phone = ndi.binary_dilation(phone, disk(3))

# Backdrop: dim pixels in the glow colour, outside the phone, connected to the
# frame edge (so dark spots inside the phone are never touched).
cand = (purity > 0.45) & (main < 110) & (lum < 48) & ~phone
lab, _ = ndi.label(cand)
edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
bg = np.isin(lab, list(edge))

w = np.clip(ndi.gaussian_filter(bg.astype(float), 3), 0, 1)[..., None]
neutral = np.clip(np.minimum(lum, others.mean(axis=2) + 2) * 0.7, 0, 255)[..., None]
out = a * (1 - w) + neutral * w
result = Image.fromarray(out.clip(0, 255).astype(np.uint8))
result.save(args.out, quality=88, optimize=True, progressive=True)
print(f'drained {bg.mean():.0%} of the frame -> {args.out}')

if args.preview:
    def bright(x):
        return ImageEnhance.Brightness(x.resize((600, 600))).enhance(2.5)
    pv = Image.new('RGB', (1200, 600))
    pv.paste(bright(im), (0, 0))
    pv.paste(bright(result), (600, 0))
    pv.save(args.preview, quality=85)
    print(f'preview -> {args.preview}')
