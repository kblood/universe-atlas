// BIOME2-ECO: the Biome Lab's eco vegetation forms render at exactly the
// queryable footprint (recipeFootprintM) that the coverage grid uses.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ELEMENT_RECIPES, recipeFootprintM} from '../src/biome-ecology.ts';
import {
  ecoFormGeometry, ecoVegetationGeometry, ecoInstanceScale, horizontalRadius, verticalExtent,
  isEcoVegetationForm, renderedFootprintRatio,
} from '../src/eco-lab-forms.ts';

const ecoVegetation=ELEMENT_RECIPES.filter(r=>r.kind!=='rock'&&isEcoVegetationForm(r.form));
const byId=id=>ELEMENT_RECIPES.find(r=>r.id===id);
/** Recipes whose rendered crown radius differs from recipeFootprintM by more than 1 %. */
function footprintMismatches(recipes,geometryOf){
  const bad=[];
  for(const r of recipes){
    const g=geometryOf(r);
    for(const s of [r.minSizeM,(r.minSizeM+r.maxSizeM)/2,r.maxSizeM]){
      const ratio=renderedFootprintRatio(r,g,s);
      if(Math.abs(ratio-1)>.01){bad.push(`${r.id}@${s}: ${ratio.toFixed(3)}`);break;}
    }
  }
  return bad;
}

test('every eco vegetation form renders at its queryable footprint radius',()=>{
  assert.equal(ecoVegetation.length,13,'13 eco vegetation recipes (12 forms; rocks excluded)');
  assert.deepEqual(footprintMismatches(ecoVegetation,ecoVegetationGeometry),[]);
  for(const r of ecoVegetation){
    const g=ecoVegetationGeometry(r);
    assert.ok(Math.abs(horizontalRadius(g)-1)<1e-5,`${r.id} unit radius`);
    assert.ok(Math.abs(verticalExtent(g)-1)<1e-5,`${r.id} unit height`);
    const [sx,sy,sz]=ecoInstanceScale(r,r.maxSizeM);
    assert.equal(sx,recipeFootprintM(r,r.maxSizeM));assert.equal(sz,sx);
    assert.ok(sy>0&&sy<=r.maxSizeM,r.id);
  }
});

test('negative: the raw authored geometry (the pre-fix lab path) is reported as a mismatch',()=>{
  const raw=footprintMismatches(ecoVegetation,ecoFormGeometry);
  for(const id of ['acacia-umbrella','taiga-spruce'])assert.ok(raw.some(m=>m.startsWith(`${id}@`)),`${id} flagged: ${raw.join(', ')}`);
  // The pre-fix lab scaled the raw form by footprint/base with base .25 (umbrella)
  // and .26 (spire): rendered = R/base x footprint, i.e. 2x and 0.5x.
  const old=(id,base)=>horizontalRadius(ecoFormGeometry(byId(id)))/base;
  assert.ok(Math.abs(old('acacia-umbrella',.25)-2)<1e-6);
  assert.ok(Math.abs(old('taiga-spruce',.26)-.5)<1e-6);
});

test('authored crown proportions survive as queryable data, not a geometry squeeze',()=>{
  // Umbrella acacia is wider than half its height; taiga spruce is a narrow spire.
  const crownPerHeight=id=>{const r=byId(id),s=r.maxSizeM,[sx,sy]=ecoInstanceScale(r,s);return sx/sy;};
  assert.ok(crownPerHeight('acacia-umbrella')>=.45,`acacia ${crownPerHeight('acacia-umbrella')}`);
  assert.ok(crownPerHeight('taiga-spruce')<=.15,`spruce ${crownPerHeight('taiga-spruce')}`);
  assert.ok(crownPerHeight('buttress-broadleaf')>crownPerHeight('taiga-spruce'));
  // Original recipes carry no override: their coverage and pinned digests are untouched.
  for(const r of ELEMENT_RECIPES.slice(0,19))assert.equal(r.visibleRadiusScale,undefined,r.id);
});
