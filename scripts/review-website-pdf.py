"""Independent local PDF geometry, text, image and rendering checks. Requires PyMuPDF."""
from pathlib import Path
import json
import pymupdf

root = Path(__file__).resolve().parents[1]
checks = root / 'docs/website2-checks'
screens = root / 'docs/website2-screenshots'
screens.mkdir(exist_ok=True)
doc = pymupdf.open(checks / 'long-six-photo-report.pdf')
mm = 72 / 25.4
text = '\n'.join(page.get_text() for page in doc)
for marker in ('Ääkköset', 'yö, ääni, öljy', 'KUVAUKSEN LOPPU', 'JATKOTOIMIEN LOPPU', 'Tarvike 55'):
    assert marker in text, f'Missing Finnish text or truncated content: {marker}'
assert text.count('KUVAUKSEN LOPPU') == 1
violations, photos, logos = [], 0, 0
for number, page in enumerate(doc, 1):
    assert abs(page.rect.width / mm - 210) < .1 and abs(page.rect.height / mm - 297) < .1
    assert f'Sivu {number} / {len(doc)}' in page.get_text()
    for block in page.get_text('dict')['blocks']:
        if 'lines' not in block:
            continue
        for line in block['lines']:
            for span in line['spans']:
                box = pymupdf.Rect(span['bbox'])
                if box.x0 < 15 * mm or box.x1 > 195 * mm or box.y0 < 8 * mm or box.y1 > 294 * mm:
                    violations.append({'page': number, 'text': span['text'], 'bbox': list(box)})
                if box.y0 >= 62 * mm and box.y0 < 276 * mm and box.y1 > 272 * mm:
                    violations.append({'page': number, 'text': span['text'], 'reason': 'body/footer overlap'})
    for image in page.get_image_info():
        rect = pymupdf.Rect(image['bbox'])
        ratio = image['width'] / image['height']
        assert abs(rect.width / rect.height - ratio) < .005, 'Stretched image'
        if image['width'] == 1340 and image['height'] == 424:
            logos += 1
        else:
            photos += 1
            assert rect.y1 < 268 * mm
assert not violations, violations
assert photos == 6 and logos == len(doc)
for index, name in [(0, 'first-page'), (1, 'text-continuation'), (len(doc)-7, 'materials'), (len(doc)-6, 'first-photo'), (len(doc)-1, 'last-photo')]:
    doc[index].get_pixmap(matrix=pymupdf.Matrix(1.3, 1.3)).save(screens / ('pdf-' + name + '.png'))
report = {'renderer': 'PyMuPDF ' + str(pymupdf.VersionBind), 'pages': len(doc), 'a4Pages': True,
          'logos': logos, 'workPhotos': photos, 'finnishTextSearchable': True,
          'lastDescriptionAndFollowupPresent': True, 'allMaterialsPresent': True,
          'pageNumbersCorrect': True, 'imageAspectRatiosPreserved': True,
          'textOutOfBoundsOrFooterOverlap': violations}
(checks / 'pdf-layout.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(report, ensure_ascii=True))
