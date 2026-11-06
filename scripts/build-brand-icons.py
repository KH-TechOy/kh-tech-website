"""Recreate PWA icons from the supplied original, preserving its full aspect ratio.

Only needed when replacing the supplied icon. Requires Pillow; not part of the Node build.
"""
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[1]
source = Image.open(root / 'docs/favicon-kh-tech.png').convert('RGBA')
for size in (192, 512):
    canvas = Image.new('RGBA', (size, size), 'white')
    scaled = ImageOps.contain(source, (round(size * .86), round(size * .86)), Image.Resampling.LANCZOS)
    canvas.alpha_composite(scaled, ((size-scaled.width)//2, (size-scaled.height)//2))
    canvas.convert('RGB').save(root / f'public/brand/icon-{size}.png', optimize=True)
print('PWA icons written; supplied PNG unchanged.')
