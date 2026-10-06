"""Read main by git show; write proposed files ONLY in a fresh system temp dir.
No git index, checkout, apply, or other write operation is performed here.
"""
from pathlib import Path
import difflib
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
SCRATCH = Path(tempfile.mkdtemp(prefix='atlas-m5-main-'))
BASE = '9971c3f'
files = ['src/lod-ladder.ts', 'src/mountain-assembly.ts', 'src/terrain.ts',
         'tests/lod-carving-reduction.test.mjs', 'tests/terrain-mountains-assembly.test.mjs',
         'tests/lod-consistency.test.mjs', 'tests/acceptance/version-compat.test.mjs']
original = {p: subprocess.check_output(['git','show',f'{BASE}:{p}'],cwd=ROOT).decode().replace('\r\n','\n') for p in files}
changed = dict(original)
def replace(path, old, new):
    assert old in changed[path], (path,old)
    changed[path] = changed[path].replace(old,new)

p='src/lod-ladder.ts'
replace(p,"export const LOD_LADDER_VERSION = 'lod-ladder-2';", """export const LOD_LADDER_VERSION = 'lod-ladder-3';
import {ROCK_DETAIL_REDUCTION, ROCK_DETAIL_MAX_EDGE_M, ROCK_DETAIL_BANDS} from './mountain-rock-detail.ts';
export {ROCK_DETAIL_REDUCTION};
// A module-load pin prevents a declaration/reduction mismatch, without duplicating constants.
if (ROCK_DETAIL_REDUCTION.longestWavelengthM !== Math.max(...ROCK_DETAIL_BANDS.map(b => b.wavelengthM)))
  throw new Error('M5 band/reduction mismatch');
export function rockDetailFromLevel(radiusM: number): number {
  return firstLevelAtOrBelowEdge(radiusM, ROCK_DETAIL_MAX_EDGE_M);
}
export function rockDetailAtLevel(radiusM: number, lodLevel?: number): boolean {
  return lodLevel === undefined || lodLevel >= rockDetailFromLevel(radiusM);
}""")
p='src/mountain-assembly.ts'
replace(p,"import {ridgeValleyCarvingM} from './mountain-carving.ts';", """import {ridgeValleyCarvingM} from './mountain-carving.ts';
import {MOUNTAIN_ROCK_DETAIL, rockDetailM, rockDetailSeed} from './mountain-rock-detail.ts';""")
replace(p,"export const MOUNTAIN_ASSEMBLY_VERSION = 'mountain-assembly-2';", "export const MOUNTAIN_ASSEMBLY_VERSION = 'mountain-assembly-3';")
replace(p,'  carve = true,','  carve = true, rock = false,')
replace(p,"""  return composed + ridgeValleyCarvingM(o.alongM ?? 0, localM, MOUNTAIN_ASSEMBLY.CARVING_HALF_WIDTH_M, U, o.belt,
    carvingSeed(beltSeeds[o.beltIndex], strip));""", """  const alongM = o.alongM ?? 0, w = MOUNTAIN_ASSEMBLY.CARVING_HALF_WIDTH_M;
  const stripSeed = carvingSeed(beltSeeds[o.beltIndex], strip);
  const C = ridgeValleyCarvingM(alongM, localM, w, U, o.belt, stripSeed);
  if (!rock) return composed + C; // Same operation order as mountain-assembly-2.
  // Envelope U and strip seed held at the sample; offsets use the same local
  // coordinate system and fixed metric step, never tile lattice spacing.
  const S = MOUNTAIN_ROCK_DETAIL.SLOPE_STEP_M;
  const Cx = ridgeValleyCarvingM(alongM + S, localM, w, U, o.belt, stripSeed);
  const Cy = ridgeValleyCarvingM(alongM, localM + S, w, U, o.belt, stripSeed);
  return composed + C + rockDetailM(alongM, localM, U + C, U + Cx, U + Cy, rockDetailSeed(stripSeed));""")
p='src/terrain.ts'
replace(p,"import {carvingAtLevel} from './lod-ladder.ts';", "import {carvingAtLevel, rockDetailAtLevel} from './lod-ladder.ts';")
replace(p,'mountains: {carve: boolean} | null = null','mountains: {carve: boolean; rock: boolean} | null = null')
replace(p,'  const carve = mountains ? mountains.carve : true;', '  const carve = mountains ? mountains.carve : true;\n  const rock = mountains ? mountains.rock : false;')
replace(p,'tau, beltCarvingSeeds, carve);','tau, beltCarvingSeeds, carve, rock);')
replace(p,'): boolean | null {\n  if (!(options.mountains', "): boolean | 'rock' | null {\n  if (!(options.mountains")
replace(p,'  return carvingAtLevel(body.radiusM, options.lodLevel);', """  if (!carvingAtLevel(body.radiusM, options.lodLevel)) return false;
  // Primitive cache state: strict equality also catches the M5 switch level
  // in planet-tiles' existing split-parent path, without editing that module.
  return rockDetailAtLevel(body.radiusM, options.lodLevel) ? 'rock' : true;""")
replace(p,'carving === null ? null : {carve: carving}', "carving === null ? null : {carve: carving !== false, rock: carving === 'rock'}")
replace(p,' * carving is on. Two samplers with equal states return identical fields; tile caches key on it.', " * carving is on (true), both carving and rock are on ('rock'), or neither is on (false).\n * Two samplers with equal states return identical fields; tile caches key on it.")

# Self-consistency updates belong only to the unapplied patch.
for p in files[3:]:
    changed[p]=changed[p].replace("'lod-ladder-2'", "'lod-ladder-3'").replace("'mountain-assembly-2'", "'mountain-assembly-3'")
replace('tests/lod-carving-reduction.test.mjs','assert.equal(mountainCarvingState(body, ON), true);', "assert.equal(mountainCarvingState(body, ON), 'rock');")

header='''M5 proposed T6 wiring against main 9971c3f. NOT APPLIED on main or this worktree.
Requires the separately staged round-4 bench-led mountain-rock-detail.ts module.
Six-argument API: centre and fixed +125 m carved heights; benches plus secondary gullies. T6 remains BLOCKED on cost.
TERRAIN_MOUNTAINS_WIRED stays false; TERRAIN_VERSION and all terrain goldens stay unchanged.
Opted-in truth changes: MOUNTAIN_ASSEMBLY_VERSION -> mountain-assembly-3;
LOD_LADDER_VERSION -> lod-ladder-3. Default mountainRidgeTermM rock=false is bit-identical.
Primitive mountainCarvingState adds 'rock', preserving tile-cache and switch-parent distinctions.
Version-string pins updated ONLY in this patch:
 tests/lod-carving-reduction.test.mjs (both versions; truth state now 'rock')
 tests/terrain-mountains-assembly.test.mjs (assembly version)
 tests/lod-consistency.test.mjs (ladder version)
 tests/acceptance/version-compat.test.mjs (ladder version)
Existing opted-in truth identity evidence must be re-measured by T6; no golden is repinned here.

'''
parts=[header]
for p in files:
    target=SCRATCH/p
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(original[p],encoding='utf8',newline='\n')
    proposed=SCRATCH/'proposed'/p
    proposed.parent.mkdir(parents=True,exist_ok=True)
    proposed.write_text(changed[p],encoding='utf8',newline='\n')
    parts.append(f'diff --git a/{p} b/{p}\n')
    parts.extend(difflib.unified_diff(original[p].splitlines(keepends=True),changed[p].splitlines(keepends=True),fromfile='a/'+p,tofile='b/'+p))
(OUT/'m5-wiring.patch').write_text(''.join(parts),encoding='utf8',newline='\n')
(OUT/'patch-scratch.txt').write_text(str(SCRATCH)+'\n',encoding='utf8')
print(SCRATCH)
