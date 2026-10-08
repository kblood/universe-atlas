# Riser LOD step 5 blind pairs (docs/mountain-riser-lod-2026-10-07.md, step 5 registration).
# For every MATCHED still / descent frame (main and branch at the same station-tile targetLevel) one pair:
#   pairs/Pnn-A.jpg, pairs/Pnn-B.jpg  full 1920 x 1080 frames, JPEG 92 (no crop, no scaling: notch rows are small)
#   pairs/Pnn-REF.jpg                 the rock-off ("carving only") still at the same pose, when one exists
# A/B per pair from secrets.randbits (not reproducible on purpose); pair numbers are shuffled too, so a pair id says
# nothing about station or pose. The key (pair -> station, pose, which side is main) is written to <key> and must be
# committed BEFORE the judge starts. Unmatched frames are listed in the key as excluded and get no pair.
#   python make-pairs.py <framesDir> <outDir> <key.json>
import json, os, secrets, sys
from PIL import Image
frames, out, keyf = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True)
items, excluded = [], []
for label in ['riser-maithea0', 'riser-lethuris0']:
    pm, pb = [json.load(open(os.path.join(frames, f'probe-{label}-{t}.json'))) for t in ('main', 'branch')]
    pr = os.path.join(frames, f'probe-{label}-rockoff.json')
    ro = json.load(open(pr)) if os.path.exists(pr) else None
    for sm in pm['stills']:
        sb = next(s for s in pb['stills'] if s['clearanceM'] == sm['clearanceM'])
        sr = next((s for s in ro['stills'] if s['clearanceM'] == sm['clearanceM']), None) if ro else None
        rec = {'station': label, 'pose': f"c{sm['clearanceM']}", 'mainLevel': sm['targetLevel'], 'branchLevel': sb['targetLevel'],
               'mainMax': sm['maxLevel'], 'branchMax': sb['maxLevel'], 'main': sm['file'], 'branch': sb['file'],
               'ref': sr['file'] if sr else None, 'refLevel': sr['targetLevel'] if sr else None,
               'activeSetEqual': sm.get('activeSetSha') == sb.get('activeSetSha')}
        if sm['targetLevel'] != sb['targetLevel']: rec['excludedFor'] = 'level mismatch'
        (items if sm['targetLevel'] == sb['targetLevel'] else excluded).append(rec)
    for dm in pm['descent']:
        db = next((d for d in pb['descent'] if d['k'] == dm['k']), None)
        rec = {'station': label, 'pose': f"descent-{dm['k']:02d}", 'mainLevel': dm['targetLevel'], 'branchLevel': db and db['targetLevel'],
               'mainMax': dm['maxLevel'], 'branchMax': db and db['maxLevel'], 'main': dm['file'], 'branch': db and db['file'], 'ref': None,
               'mainClearanceM': dm['appClearanceM'], 'branchClearanceM': db and db['appClearanceM'],
               'mainPending': dm['terrainPending'], 'branchPending': db and db['terrainPending'],
               'activeSetEqual': db is not None and dm.get('activeSetSha') == db.get('activeSetSha')}
        # Post-capture addition (disclosed in the doc): a descent frame is a pair only when both arms are at the same pose
        # (app clearance within 5 %); the branch replay ran ahead of main's timing, so most k do not match.
        poseOk = db is not None and abs(dm['appClearanceM'] - db['appClearanceM']) <= .05 * max(dm['appClearanceM'], db['appClearanceM'])
        if db is not None and not poseOk: rec['excludedFor'] = 'pose mismatch (descent timing)'
        elif db is not None and dm['targetLevel'] != db['targetLevel']: rec['excludedFor'] = 'level mismatch'
        (items if poseOk and dm['targetLevel'] == db['targetLevel'] else excluded).append(rec)
order = list(range(len(items)))
for i in range(len(order) - 1, 0, -1):
    j = secrets.randbelow(i + 1); order[i], order[j] = order[j], order[i]
key = {'pairs': {}, 'excluded': excluded}
for n, idx in enumerate(order, 1):
    it, pid = items[idx], f'P{n:02d}'
    mainLeft = secrets.randbits(1) == 1
    a, b = (it['main'], it['branch']) if mainLeft else (it['branch'], it['main'])
    Image.open(a).convert('RGB').save(os.path.join(out, f'{pid}-A.jpg'), quality=92)
    Image.open(b).convert('RGB').save(os.path.join(out, f'{pid}-B.jpg'), quality=92)
    if it['ref']: Image.open(it['ref']).convert('RGB').save(os.path.join(out, f'{pid}-REF.jpg'), quality=92)
    key['pairs'][pid] = {**it, 'A': 'main' if mainLeft else 'branch', 'B': 'branch' if mainLeft else 'main'}
json.dump(key, open(keyf, 'w'), indent=1)
print(f'{len(items)} pairs, {len(excluded)} excluded -> {out}; key {keyf}')
