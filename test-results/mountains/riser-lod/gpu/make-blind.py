# Strata step 8 blind pairs (README section 3). For each station label a seeded coin (first byte of sha256(label), low
# bit) decides the side: 1 -> main LEFT (A), branch RIGHT (B); 0 -> branch LEFT (A), main RIGHT (B). Crops x 160-1760,
# y 0-900, scaled 60 %, JPEG 85, side by side with a 16 px gap, then labelled "A" / "B". Rock-off stills are written as
# a separate reference "<label>-c<clear>-REF-carving-only.jpg". The key is NOT written here: print-key mode prints it,
# to be saved as blind-key.json only after the verdict.
#   python make-blind.py <framesDir> <outDir> [--print-key]
import hashlib, json, os, sys
from PIL import Image, ImageDraw
frames, out = sys.argv[1], sys.argv[2]
LABELS = ['maithea-axis', 'raiva-flank', 'straight-flank']
coin = lambda label: hashlib.sha256(label.encode()).digest()[0] & 1
if '--print-key' in sys.argv:
    print(json.dumps({l: {'A': 'main' if coin(l) else 'branch', 'B': 'branch' if coin(l) else 'main'} for l in LABELS}, indent=1))
    sys.exit(0)
os.makedirs(out, exist_ok=True)
def crop(p):
    im = Image.open(p).convert('RGB').crop((160, 0, 1760, 900))
    return im.resize((int(im.width * .6), int(im.height * .6)), Image.LANCZOS)
def tag(im, text):
    d = ImageDraw.Draw(im); d.rectangle((0, 0, 44, 30), fill=(0, 0, 0)); d.text((12, 8), text, fill=(255, 255, 255)); return im
n = 0
for label in LABELS:
    left, right = ('main', 'branch') if coin(label) else ('branch', 'main')
    names = sorted(f for f in os.listdir(frames) if f.startswith(label + '-') and f.endswith('-main.png'))
    for f in names:
        stem = f[:-len('-main.png')]
        a, b = os.path.join(frames, f'{stem}-{left}.png'), os.path.join(frames, f'{stem}-{right}.png')
        if not (os.path.exists(a) and os.path.exists(b)): continue
        A, B = tag(crop(a), 'A'), tag(crop(b), 'B')
        sbs = Image.new('RGB', (A.width * 2 + 16, A.height), (255, 255, 255)); sbs.paste(A, (0, 0)); sbs.paste(B, (A.width + 16, 0))
        sbs.save(os.path.join(out, f'{stem}-AB.jpg'), quality=85); n += 1
        r = os.path.join(frames, f'{stem}-rockoff.png')
        if os.path.exists(r): tag(crop(r), 'REF').save(os.path.join(out, f'{stem}-REF-carving-only.jpg'), quality=85)
print(f'{n} pairs written to {out}')
