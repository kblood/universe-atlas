# INFO P99 on GPU stills (step 5): converts each matched still to the 8-bit grey+alpha, filter-0 PNG that metric.mjs
# reads (grey = PIL "L" luminance, alpha 255 everywhere: the whole screenshot is covered) and writes metric groups
# {id, v1: main, off: rock-off, branch} for the stills that have a rock-off reference.
#   python to-grey.py <pairs-key.json> <outDir> <groups.json>
import json, os, struct, sys, zlib
from PIL import Image
keyf, out, groupsf = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
def write_la(src, dst):
    im = Image.open(src).convert('L'); W, H = im.size; px = im.tobytes()
    raw = b''.join(b'\x00' + bytes(v for g in px[y * W:(y + 1) * W] for v in (g, 255)) for y in range(H))
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    open(dst, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 4, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 6)) + chunk(b'IEND', b''))
key = json.load(open(keyf)); groups = []
for pid, p in sorted(key['pairs'].items()):
    if not p.get('ref'): continue
    g = {'id': f"{p['station']}-{p['pose']}-{pid}"}
    for arm, src in (('v1', p['main']), ('off', p['ref']), ('branch', p['branch'])):
        dst = os.path.join(out, f'{pid}-{arm}.png'); write_la(src, dst); g[arm] = dst
    groups.append(g)
json.dump(groups, open(groupsf, 'w'), indent=1); print(len(groups), 'groups')
