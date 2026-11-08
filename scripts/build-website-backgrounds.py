"""One-off WebP optimization of the supplied backgrounds (requires Pillow).

Original PNGs are read only. Run again only when changing the supplied artwork;
normal Node production builds use the committed WebP files without Python.
"""
from hashlib import sha256
from pathlib import Path
import json
from PIL import Image, __version__
import argparse

parser = argparse.ArgumentParser(description=__doc__)
group = parser.add_mutually_exclusive_group()
group.add_argument('--subpages', action='store_true', help='Only optimize WEBSITE 2.4 subpage images; leave homepage assets unchanged.')
group.add_argument('--privacy', action='store_true', help='Only compress/resize the full WEBSITE 2.5 privacy image; no cropping or image edits.')
args = parser.parse_args()
subpages, privacy = args.subpages, args.privacy

root = Path(__file__).resolve().parents[1]
target = root / 'public/website'
target.mkdir(parents=True, exist_ok=True)
entries = []
sources = [(7, 'privacy', None)] if privacy else [
    (4, 'services', (940, 80, 1672, 941)),
    (5, 'about', (890, 70, 1672, 941)),
    (6, 'contact', (990, 190, 1672, 941)),
] if subpages else [(index, name, crop) for index, (name, crop) in enumerate([
    ('hero', (1010, 210, 1740, 887)),
    ('company', (0, 110, 1080, 887)),
    ('game', (40, 110, 920, 887)),
], 1)]
for index, name, crop in sources:
    source = root / f'docs/website_bg_{index}.png'
    original = source.read_bytes()
    image = Image.open(source).convert('RGB')
    outputs = []
    variants = [(False, (800, 1200, 1672))] if privacy else [(False, (800, 1200, 1672) if subpages else (960, 1280, 1774)), (True, (480, 720))]
    for mobile, widths in variants:
        variant = image.crop(crop) if mobile else image
        for width in widths:
            scaled = variant.resize((width, round(width * variant.height / variant.width)), Image.Resampling.LANCZOS)
            path = target / f'{name}{"-mobile" if mobile else ""}-{width}.webp'
            scaled.save(path, 'WEBP', quality=84, method=6)
            outputs.append({'path': path.relative_to(root).as_posix(), 'width': scaled.width, 'height': scaled.height, 'bytes': path.stat().st_size})
    assert source.read_bytes() == original
    entries.append({'source': source.relative_to(root).as_posix(), 'sha256': sha256(original).hexdigest(), 'originalBytes': len(original), 'mobileCrop': crop, 'outputs': outputs})
checks = root / ('docs/website25-checks' if privacy else 'docs/website24-checks' if subpages else 'docs/website23-checks')
checks.mkdir(parents=True, exist_ok=True)
(checks / 'background-assets.json').write_text(json.dumps({'tool': f'Pillow {__version__}', 'quality': 84, 'method': 6, 'images': entries}, indent=2) + '\n', encoding='utf8')
print(json.dumps({'webpFiles': sum(len(entry['outputs']) for entry in entries), 'originalBytes': sum(entry['originalBytes'] for entry in entries), 'largestDesktopBytes': sum(entry['outputs'][2]['bytes'] for entry in entries), 'mobile480Bytes': sum(output['bytes'] for entry in entries for output in entry['outputs'] if '-mobile-480' in output['path'])}))
