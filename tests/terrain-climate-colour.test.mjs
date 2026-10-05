// W1-B-TERRAIN-COLOUR (terrain-1.7.0-climate-colour): water-world land colour
// comes from the shared annual climate (surface-climate.ts) at the post-landform
// height, so the orbit/tile colour and the classifier read ONE field.
// Kept palettes (ocean, sea ice, Ice/Volcanic/barren/gas giant, baseTerrainSampler)
// are pinned bit-identical in tests/terrain-elevation-identity.test.mjs.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hash64,noise} from '../src/catalog.ts';
import {terrainSampler,baseTerrainSampler,waterWorldLandColour,bodyHeightBoundM,TERRAIN_VERSION,TERRAIN_CLIMATE_VERSION} from '../src/terrain.ts';
import {climateForcingFor,createClimateSample,surfaceClimate,CLIMATE_VERSION,CLIMATE_CALIBRATION} from '../src/surface-climate.ts';
import {biomeClassifier} from '../src/surface-biomes.ts';
import {fib,waterWorlds,goldenTerrainBodies} from './terrain-climate-fixtures.mjs';

const N=20000;
/** Independent copy of the water-land colour grain (seed derivation and constants
 * written out here on purpose, so a drifted shared helper is caught rather than
 * reused). terrain-1.8.1-grain (mountains step G, owner decision (b)): the 800 m
 * local grain of water-world LAND colour is .952 + n x .096 (was .88 + n x .24,
 * which every other palette still uses); the 115 grain is unchanged. */
function grainOf(body){
  const code=Number(hash64(body.seed+'/macro-v1')&0xffffffffn);
  const n=(d,f,seed)=>noise(d[0]*f+13,d[1]*f+37,d[2]*f+19,code+seed);
  return d=>[0.91+n(d,115,35)*0.18,.952+n(d,body.radiusM/800,74)*.096];
}
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));

test('versions: terrain colour v2 names the climate model it reads',()=>{
  // Re-pinned for P4-RELIEF (terrain-1.8.0-relief, surface-climate-1.1-geo-g),
  // then for mountains step G (terrain-1.8.1-grain: reduced 800 m land grain).
  assert.equal(TERRAIN_VERSION,'terrain-1.8.1-grain');
  assert.equal(TERRAIN_CLIMATE_VERSION,CLIMATE_VERSION);
  assert.equal(CLIMATE_VERSION,'surface-climate-1.1-geo-g');
});

test('water-world land colour === waterWorldLandColour(climate at post-landform height) x grain, 20k land directions x 4 worlds',()=>{
  for(const body of waterWorlds()){
    const sample=terrainSampler(body),climate=surfaceClimate(climateForcingFor(body)),o=createClimateSample(),grain=grainOf(body);
    let land=0,snowy=0,forested=0;
    for(let i=0;i<N*3;i++){
      const d=fib(i,N*3),s=sample(d);
      if(s.ocean)continue;
      land++;
      // includeCraters defaults to false, so groundHeightM IS the post-landform,
      // pre-crater height the colour is evaluated at.
      climate(d,s.groundHeightM,o);
      const [g,l]=grain(d);
      const expected=waterWorldLandColour(o,s.groundHeightM).map(v=>clamp(v*g*l,0,255));
      if(s.color[0]!==expected[0]||s.color[1]!==expected[1]||s.color[2]!==expected[2])
        assert.fail(`${body.name} ${d}: ${s.color} !== ${expected}`);
      snowy+=o.snowFraction>.6;forested+=o.forestSuitability01>.5;
    }
    assert.ok(land>=N,`${body.name} land samples ${land} over the whole sphere`);
    assert.ok(snowy>0||forested>0,`${body.name} exercises the climate colour`);
  }
});

test('the snow in the colour is surfaceClimate.snowFraction at that height (colour and classifier agree by construction)',()=>{
  const body=waterWorlds()[0],sample=terrainSampler(body),climate=surfaceClimate(climateForcingFor(body)),o=createClimateSample();
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
});

test('every non-water body keeps the base colour exactly (no climate path off water worlds)',()=>{
  const dry=goldenTerrainBodies().filter(b=>!(b.water>0));
  assert.ok(dry.length>=3);
  for(const body of dry){
    const base=baseTerrainSampler(body),sample=terrainSampler(body);
    for(let i=0;i<2048;i++){const d=fib(i,2048);assert.deepEqual(sample(d).color,base(d).color);}
  }
});

test('climate zones read as distinct colours on Maithea (forest green, alpine meadow olive, fell-field grey, snow white, dry tan)',()=>{
  const body=waterWorlds()[0],sample=terrainSampler(body),climate=surfaceClimate(climateForcingFor(body)),o=createClimateSample();
  const zones={forest:[],meadow:[],fell:[],snow:[],dry:[]};
  for(let i=0;i<60000;i++){
    const d=fib(i,60000),s=sample(d);if(s.ocean||s.groundHeightM<200)continue;
    climate(d,s.groundHeightM,o);
    const c=waterWorldLandColour(o,s.groundHeightM);
    if(o.snowFraction>=1)zones.snow.push(c);
    else if(o.snowFraction>0)continue;
    else if(o.forestSuitability01>.8)zones.forest.push(c);
    else if(o.treeline01===0&&o.warmestMonthK>CLIMATE_CALIBRATION.T_TREE_WARMEST_K-CLIMATE_CALIBRATION.TREE_RAMP_K&&o.aridity01<.2)zones.meadow.push(c);
    else if(o.warmestMonthK<CLIMATE_CALIBRATION.T_TREE_WARMEST_K-2*CLIMATE_CALIBRATION.TREE_RAMP_K&&s.groundHeightM>800)zones.fell.push(c);
    else if(o.treeline01>=1&&o.aridity01>=1)zones.dry.push(c);
  }
  // terrain-1.8.0-relief: Maithea's relief summits (max ~5.9 km) no longer reach
  // the snow-free cold band the fell colour paints (it sat at ~6.5 km on the
  // terrain-1.7 field); measured 0 fell samples at 60k, 240k and 600k terrain
  // directions. The fell colour is therefore also exercised on climate columns:
  // land directions x heights 800 m .. bodyHeightBoundM(Maithea).maxM every
  // 250 m (heights the relief field can reach). Thresholds are unchanged.
  if(zones.fell.length<=20){
    const maxM=bodyHeightBoundM(body).maxM;
    for(let i=0;i<4096;i++){
      const d=fib(i,4096),s=sample(d);if(s.ocean)continue;
      for(let h=800;h<=maxM;h+=250){
        climate(d,h,o);
        if(o.snowFraction>0||o.forestSuitability01>.8)continue;
        if(o.treeline01===0&&o.warmestMonthK>CLIMATE_CALIBRATION.T_TREE_WARMEST_K-CLIMATE_CALIBRATION.TREE_RAMP_K&&o.aridity01<.2)continue;
        if(o.warmestMonthK<CLIMATE_CALIBRATION.T_TREE_WARMEST_K-2*CLIMATE_CALIBRATION.TREE_RAMP_K)zones.fell.push(waterWorldLandColour(o,h));
      }
    }
  }
  const mean=a=>[0,1,2].map(k=>a.reduce((s,c)=>s+c[k],0)/a.length);
  const m=Object.fromEntries(Object.entries(zones).map(([k,v])=>{assert.ok(v.length>20,`${k} zone has ${v.length} samples`);return [k,mean(v)];}));
  // forest: clearly green-dominant and dark
  assert.ok(m.forest[1]>m.forest[0]+25&&m.forest[1]>m.forest[2]+25,`forest ${m.forest}`);
  // alpine meadow: still green-leaning, lighter than forest, not grey
  assert.ok(m.meadow[1]>m.meadow[0]&&m.meadow[1]>m.meadow[2]+20&&m.meadow[1]>m.forest[1],`meadow ${m.meadow}`);
  // fell-field / rock: neutral grey-brown (no green dominance)
  assert.ok(m.fell[0]>=m.fell[1]&&Math.abs(m.fell[0]-134)<12,`fell ${m.fell}`);
  // snow: near white
  assert.deepEqual(m.snow.map(Math.round),[216,228,226]);
  // dry: tan (red > green > blue)
  assert.ok(m.dry[0]>m.dry[1]&&m.dry[1]>m.dry[2]+40,`dry ${m.dry}`);
});
