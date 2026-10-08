// W1-B-TERRAIN-COLOUR (terrain-1.7.0-climate-colour): water-world land colour
// comes from the shared annual climate (surface-climate.ts) at the post-landform
// height, so the orbit/tile colour and the classifier read ONE field.
// Kept palettes (ocean, sea ice, Ice/Volcanic/barren/gas giant, baseTerrainSampler)
// are pinned bit-identical in tests/terrain-elevation-identity.test.mjs.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {terrainSampler,baseTerrainSampler,waterWorldLandColour,bodyHeightBoundM,TERRAIN_VERSION,TERRAIN_CLIMATE_VERSION} from '../src/terrain.ts';
import {climateForcingFor,createClimateSample,surfaceClimate,CLIMATE_VERSION,CLIMATE_CALIBRATION} from '../src/surface-climate.ts';
import {biomeClassifier} from '../src/surface-biomes.ts';
import {fib,waterWorlds,goldenTerrainBodies} from './terrain-climate-fixtures.mjs';
// T6 decision 3: the global colour/climate statistics read the level-0 field (tests/helpers/statistic-level.mjs).
import {statisticSampler,fullOnly} from './helpers/statistic-level.mjs';
// The colour identity scan, with the independent copy of the water-land colour grain (seed derivation and constants
// written out, so a drifted src helper is caught rather than reused), is SCANS.colour.
import {scanBodies,inOrder,logScan} from './helpers/body-chunks.mjs';

const N=20000;

test('versions: terrain colour v2 names the climate model it reads',()=>{
  // Re-pinned for P4-RELIEF (terrain-1.8.0-relief, surface-climate-1.1-geo-g),
  // then for mountains step G (terrain-1.8.1-grain: reduced 800 m land grain), then T6 (terrain-1.9.0-mountains).
  assert.equal(TERRAIN_VERSION,'terrain-1.9.1-carving-c1'); // then carving C1 (terrain-1.9.1-carving-c1)
  assert.equal(TERRAIN_CLIMATE_VERSION,CLIMATE_VERSION);
  // Re-pinned for BIOME2-CLIMATE M1 (surface-climate-2, old surface-climate-1.1-geo-g); TERRAIN_VERSION is the
  // coordinator's bump (not changed by the climate package).
  assert.equal(CLIMATE_VERSION,'surface-climate-2');
});

// Pointwise colour identity, run on two samplers: level 0 by default, the carved truth (terrainSampler) in test:full
// (T6 Astra review: a pointwise identity is not only a statistic, so the truth copy is kept). The per-world scan
// (60000 directions, >= N = 20000 land, the independent grain copy and every assert) is SCANS.colour in
// tests/helpers/body-chunks.mjs (O3, docs/truth-scan-chunks-2026-10-07.md): level 0 in-process, the truth one worker
// thread per water world; the first failing world (world order) is reported.
async function colourIdentity(mode,workers){
  const scan=await scanBodies('colour','waterWorlds',mode,{workers});logScan('colour',mode,scan);
  assert.equal(scan.bodies.length,4);
  for(const {body,value} of inOrder(scan))assert.ok(value.land>=N,`${body.name} land samples ${value.land} over the whole sphere`);
}
test('water-world land colour === waterWorldLandColour(climate at post-landform height) x grain, 20k land directions x 4 worlds',()=>colourIdentity('level0',0));
test('water-world land colour identity on the carved truth, 20k land directions x 4 worlds (test:full)',fullOnly('truth colour identity solves M3 blocks'),()=>colourIdentity('truth',4));

function snowIdentity(makeSampler){
  const body=waterWorlds()[0],sample=makeSampler(body),climate=surfaceClimate(climateForcingFor(body)),o=createClimateSample();
  const classify=biomeClassifier(body);
  let checked=0,classifierChecked=0;
  for(let i=0;i<4096;i++){
    const d=fib(i,4096),s=sample(d);if(s.ocean)continue;
    climate(d,s.groundHeightM,o);
    // Snow is the LAST mix, so the colour is exactly lerp(noSnow, white, snowFraction).
    const noSnow=waterWorldLandColour({...o,snowFraction:0},s.groundHeightM);
    const full=waterWorldLandColour({...o,snowFraction:1},s.groundHeightM);
    const got=waterWorldLandColour(o,s.groundHeightM);
    for(let c=0;c<3;c++){
      assert.equal(full[c],[216,228,226][c]);
      assert.equal(got[c],noSnow[c]+(full[c]-noSnow[c])*o.snowFraction);
    }
    checked++;
    // Once the climate classifier (W1-A, surface-biomes-2-climate) is merged it
    // exposes snowFraction; then it must be the very same number.
    const b=classify(d,s.groundHeightM);
    if('snowFraction' in b){assert.equal(b.snowFraction,o.snowFraction);assert.equal(b.weights[3],o.snowFraction);classifierChecked++;}
  }
  assert.ok(checked>1000);
  if(!classifierChecked)console.log('# classifier has no snowFraction field yet (pre-W1-A); colour-side identity checked only');
}
test('the snow in the colour is surfaceClimate.snowFraction at that height (colour and classifier agree by construction)',()=>snowIdentity(statisticSampler));
test('snow colour/classifier identity on the carved truth (test:full)',fullOnly('truth snow identity solves M3 blocks'),()=>snowIdentity(body=>terrainSampler(body)));

test('every non-water body keeps the base colour exactly (no climate path off water worlds)',()=>{
  const dry=goldenTerrainBodies().filter(b=>!(b.water>0));
  assert.ok(dry.length>=3);
  for(const body of dry){
    const base=baseTerrainSampler(body),sample=terrainSampler(body);
    for(let i=0;i<2048;i++){const d=fib(i,2048);assert.deepEqual(sample(d).color,base(d).color);}
  }
});

test('climate zones read as distinct colours on Maithea (forest green, alpine meadow olive, snow white, dry tan)',()=>{
  const body=waterWorlds()[0],sample=statisticSampler(body),climate=surfaceClimate(climateForcingFor(body)),o=createClimateSample();
  const zones={forest:[],meadow:[],snow:[],dry:[]};
  for(let i=0;i<60000;i++){
    const d=fib(i,60000),s=sample(d);if(s.ocean||s.groundHeightM<200)continue;
    climate(d,s.groundHeightM,o);
    const c=waterWorldLandColour(o,s.groundHeightM);
    if(o.snowFraction>=1)zones.snow.push(c);
    else if(o.snowFraction>0)continue;
    else if(o.forestSuitability01>.8)zones.forest.push(c);
    else if(o.treeline01===0&&o.warmestMonthK>CLIMATE_CALIBRATION.T_TREE_WARMEST_K-CLIMATE_CALIBRATION.TREE_RAMP_K&&o.aridity01<.2)zones.meadow.push(c);
    else if(o.treeline01>=1&&o.aridity01>=1)zones.dry.push(c);
  }
  // The fell-field zone (snow-free, warmest month below T_TREE - 2 x ramp) is no longer reachable under PDD snow:
  // see the PDD invariant and the `todo` fell-colour test below (climate-m1-decision 2026-10-08 decision 4).
  const mean=a=>[0,1,2].map(k=>a.reduce((s,c)=>s+c[k],0)/a.length);
  const m=Object.fromEntries(Object.entries(zones).map(([k,v])=>{assert.ok(v.length>20,`${k} zone has ${v.length} samples`);return [k,mean(v)];}));
  // forest: clearly green-dominant and dark
  assert.ok(m.forest[1]>m.forest[0]+25&&m.forest[1]>m.forest[2]+25,`forest ${m.forest}`);
  // alpine meadow: still green-leaning, lighter than forest, not grey
  assert.ok(m.meadow[1]>m.meadow[0]&&m.meadow[1]>m.meadow[2]+20&&m.meadow[1]>m.forest[1],`meadow ${m.meadow}`);
  // snow: near white
  assert.deepEqual(m.snow.map(Math.round),[216,228,226]);
  // dry: tan (red > green > blue)
  assert.ok(m.dry[0]>m.dry[1]&&m.dry[1]>m.dry[2]+40,`dry ${m.dry}`);
});

// surface-climate-2 PDD invariant (climate-m1-decision 2026-10-08 decision 4; Opus-decided on Kasper's instruction,
// overrulable): a warmest month below T_TREE_WARMEST_K - 2 x TREE_RAMP_K (271 K, -2 C) leaves fewer than
// PDD_CRIT positive degree-days, so the column is permanent snow (Koppen EF). Checked on Maithea's terrain directions
// at their ground height and on climate columns (land directions x 800 m .. bodyHeightBoundM every 250 m).
const FELL_TW_K=CLIMATE_CALIBRATION.T_TREE_WARMEST_K-2*CLIMATE_CALIBRATION.TREE_RAMP_K;
function maitheaFellColumns(){
  const body=waterWorlds()[0],sample=statisticSampler(body),climate=surfaceClimate(climateForcingFor(body)),o=createClimateSample();
  const cols=[];
  const visit=(d,h)=>{climate(d,h,o);if(o.warmestMonthK<FELL_TW_K)cols.push({h,tw:o.warmestMonthK,pdd:o.pdd,snow:o.snowFraction,forest:o.forestSuitability01,colour:waterWorldLandColour(o,h)});};
  for(let i=0;i<60000;i++){const d=fib(i,60000),s=sample(d);if(!s.ocean&&s.groundHeightM>=200)visit(d,s.groundHeightM);}
  const maxM=bodyHeightBoundM(body).maxM;
  for(let i=0;i<4096;i++){const d=fib(i,4096),s=sample(d);if(s.ocean)continue;for(let h=800;h<=maxM;h+=250)visit(d,h);}
  return cols;
}
test('PDD invariant: every Maithea land column with a warmest month below 271 K carries snow (decision 4)',t=>{
  assert.ok(Math.abs(FELL_TW_K-271.15)<.5,`fell threshold ${FELL_TW_K} K`);
  const cols=maitheaFellColumns(),bare=cols.filter(c=>!(c.snow>0));
  t.diagnostic(JSON.stringify({fellThresholdK:FELL_TW_K,columns:cols.length,snowFree:bare.length,minSnow:cols.reduce((m,c)=>Math.min(m,c.snow),1),maxPdd:cols.reduce((m,c)=>Math.max(m,c.pdd),0)}));
  assert.ok(cols.length>20,`only ${cols.length} columns below ${FELL_TW_K} K`);
  assert.equal(bare.length,0,`snow-free columns below ${FELL_TW_K} K: ${JSON.stringify(bare.slice(0,3))}`);
});

test('fell-field / rock colour: neutral grey-brown on snow-free cold columns',
  {todo:'surface-climate-2 finding (decision 4): under PDD snow no snow-free fell band exists; the climate rock band in waterWorldLandColour is unreachable. Follow-up for the coordinator: retire the rock band, or redefine it on PDD in a later terrain-colour version.'},()=>{
  const fell=maitheaFellColumns().filter(c=>c.snow===0&&c.forest<=.8&&c.h>800).map(c=>c.colour);
  assert.ok(fell.length>20,`fell zone has ${fell.length} snow-free samples`);
  const m=[0,1,2].map(k=>fell.reduce((s,c)=>s+c[k],0)/fell.length);
  assert.ok(m[0]>=m[1]&&Math.abs(m[0]-134)<12,`fell ${m}`);
});
