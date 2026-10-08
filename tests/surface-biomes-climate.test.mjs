// W1-A-CLASSIFIER (docs/biome-climate-increment-1-plan-2026-10-02.json):
// classifier v2 reads the shared surface-climate-1 field.
//
// `legacyClassifier` (tests/helpers/surface-biomes-1-legacy.mjs) is a FROZEN copy of surface-biomes-1's
// biomeClassifier (main a9e3654), kept as the oracle for the invariants v2
// must preserve (moisture bit-identity, the body clause, the airless branch).
// Never edit it to follow the live classifier.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {biomeClassifier,BIOME_VERSION} from '../src/surface-biomes.ts';
import {CLIMATE_VERSION,clearClimateForcingCache,climateForcingFor} from '../src/surface-climate.ts';
import {canonicalJSON} from './canonical-json.mjs';
import {legacyClassifier} from './helpers/surface-biomes-1-legacy.mjs';

export {legacyClassifier};

const g0=galaxies('LETHRA-001')[0];
const sysM=system(refByAddress(g0,'G001/C2128,0,1/0'));
const maithea=sysM.planets[1];
const bodyAt=(sys,id)=>system(refByAddress(g0,sys)).planets.find(b=>b.id===id);
// Two corpus water worlds (temperateHabitat, first 2000 systems of G001):
// Selawyn, drawn tilt 89.8 deg (effective obliquity > 54.7: warm poles), and
// Raes, 305 K, 22.1 deg, an ordinary temperate world.
const selawyn=bodyAt('G001/C2142,3,4/0','G001/C2142,3,4/0/planet/0');
const raes=bodyAt('G001/C2129,3,0/0','G001/C2129,3,0/0/planet/1');
// The six golden bodies: Maithea, its moon, the Ice/Volcanic variants used in
// surface.test.mjs (they share Maithea's seed and temperature), and the two
// corpus worlds.
const GOLDEN_BODIES=()=>[maithea,sysM.moons[0],{...maithea,type:'Ice world',water:0},{...maithea,type:'Volcanic world',water:0},selawyn,raes];
const fib=(i,n)=>{const y=1-2*(i+.5)/n,p=i*2.399963229728653,r=Math.sqrt(1-y*y);return [Math.cos(p)*r,y,Math.sin(p)*r];};
const LABELS=new Set(['Ocean','Ice field','Volcanic rock','Rock escarpment','Regolith plain','Alpine / polar snow','Coastal sand','Dry upland','Mountain meadow','Temperate ground']);

/** Pinned next to its BIOME_VERSION / CLIMATE_VERSION literals: moving either
 * the sha or a version is a deliberate, documented bump (regenerate by
 * printing classifierGolden()). */
// Re-pinned for P4-RELIEF (old: surface-biomes-2-climate / surface-climate-1 /
// 0d2c1c03ae63407ce5295a1b55f485df92ae4ed1a8909285eb3242b766ec809e): the gates and
// the climate datum are relative to the current sea level (the -4500 m rows move)
// and the lapse gravity comes from planet-geophysics.
const GOLDEN={biomeVersion:'surface-biomes-2.1-sea-datum',climateVersion:'surface-climate-2',sha256:'e720df3885524de21ece2290741d1cb34a509f6372000a4b68775255afcbfbc6'};
export function classifierGolden(bodies=GOLDEN_BODIES()){
  const rows=[];
  for(const body of bodies)for(const water of [0,-4500]){
    const classify=biomeClassifier(body,water);
    for(let i=0;i<64;i++){const d=fib(i,64);for(const h of [-200,100,1500,4000,12000])for(const up of [1,.9,.6])rows.push(classify(d,h,up));}
  }
  return {rows:rows.length,sha256:createHash('sha256').update(canonicalJSON(rows)).digest('hex')};
}

test('classifier golden: 6 bodies x 64 directions x 5 heights x 3 upDots x 2 water levels',()=>{
  assert.equal(BIOME_VERSION,GOLDEN.biomeVersion,'BIOME_VERSION moved: regenerate the golden deliberately');
  assert.equal(CLIMATE_VERSION,GOLDEN.climateVersion,'CLIMATE_VERSION moved: regenerate the golden deliberately');
  assert.ok(selawyn&&raes,'corpus bodies resolve');
  assert.ok(climateForcingFor(selawyn).obliquityRad*180/Math.PI>54.7);
  assert.ok(climateForcingFor(raes).obliquityRad*180/Math.PI<30);
  const g=classifierGolden();
  assert.equal(g.rows,6*2*64*5*3);
  assert.equal(g.sha256,GOLDEN.sha256);
});

test('golden is independent of forcing-cache state and body visit order (seed-sharing variants included)',()=>{
  clearClimateForcingCache();
  const cold=classifierGolden();
  // Warm the cache with the variants FIRST. climateForcingFor keys on
  // seed|anchor, so without the classifier's body-input check Maithea would
  // read the Ice variant's (water 0, frozen) forcing here.
  clearClimateForcingCache();
  const b=GOLDEN_BODIES();
  for(const x of [b[2],b[3]])biomeClassifier(x);
  const reordered=classifierGolden([b[2],b[3],b[0],b[1],b[4],b[5]]);
  assert.equal(reordered.rows,cold.rows);
  assert.equal(classifierGolden().sha256,cold.sha256);
  // Per-body bytes do not depend on which bodies were classified before.
  for(let i=0;i<b.length;i++){
    clearClimateForcingCache();const alone=classifierGolden([b[i]]).sha256;
    for(const x of [...b].reverse())biomeClassifier(x);
    assert.equal(classifierGolden([b[i]]).sha256,alone,`body ${i}`);
  }
});

test('weights[3] === snowFraction, weights are a partition, labels stay within the 10 v1 strings',()=>{
  for(const body of GOLDEN_BODIES())for(const water of [0,-4500]){
    const classify=biomeClassifier(body,water);
    for(let i=0;i<2000;i++){
      const d=fib(i,2000),h=((i*7919)%20000)-1000,up=[1,.95,.8,.6,.3][i%5],c=classify(d,h,up);
      assert.equal(c.weights[3],c.snowFraction);
      // Fauna contract: weights[1] already carries (1-snowFraction); consumers must not apply it twice.
      assert.ok(c.weights[0]+c.weights[1]<=1-c.snowFraction+1e-12);
      if(c.snowFraction===1)assert.equal(c.weights[1],0);
      assert.ok(c.weights.every(x=>x>=0&&x<=1));
      assert.ok(Math.abs(c.weights.reduce((a,x)=>a+x,0)-1)<1e-12);
      assert.ok(LABELS.has(c.name),c.name);
      assert.equal(c.climateVersion,CLIMATE_VERSION);assert.equal(c.version,BIOME_VERSION);
      assert.ok(c.forestSuitability01>=0&&c.forestSuitability01<=1);
      if(!c.forestPotential)assert.equal(c.forestSuitability01,0);
      for(const k of ['annualMeanTempK','warmestMonthK','effectiveMoisture','aridity01','treeline01','climateCode'])assert.ok(Number.isFinite(c[k]),k);
    }
  }
});

test('moisture is bit-identical to the legacy classifier on 20k directions; airless and Ice branches unchanged',()=>{
  for(const body of GOLDEN_BODIES()){
    const live=biomeClassifier(body),old=legacyClassifier(body);
    for(let i=0;i<20000;i++){
      const d=fib(i,20000),h=((i*7919)%12000)-500,up=[1,.9,.6][i%3],a=live(d,h,up),b=old(d,h,up);
      assert.equal(a.moisture,b.moisture);assert.equal(a.ocean,b.ocean);assert.equal(a.slopeDeg,b.slopeDeg);
      if(!body.water&&body.type!=='Ice world'){assert.deepEqual(a.weights,b.weights);assert.equal(a.name,b.name);}
      if(body.type==='Ice world'){assert.equal(a.weights[3],1);assert.equal(a.name,b.name);}
    }
  }
});

test('forestPotential is false wherever the legacy body clause is false',()=>{
  const clause=b=>!!b.water&&b.temperatureK>=250&&b.temperatureK<=325&&b.type!=='Volcanic world';
  const variants=[...GOLDEN_BODIES(),{...maithea,temperatureK:600},{...maithea,temperatureK:90},{...maithea,temperatureK:249.9},{...maithea,temperatureK:325.1},
    {...maithea,water:0},{...maithea,type:'Volcanic world'},{...raes,type:'Ice world'}];
  let checked=0,forest=0;
  for(const body of variants){
    const classify=biomeClassifier(body);
    for(let i=0;i<3000;i++){
      const d=fib(i,3000),h=((i*7919)%6000)-300,c=classify(d,h,.97);
      if(!clause(body)){assert.equal(c.forestPotential,false,body.type+' '+body.temperatureK);checked++;}
      if(h<=160||c.ocean||c.snowFraction>=.2||c.slopeDeg>=28)assert.equal(c.forestPotential,false);
      forest+=c.forestPotential;
    }
  }
  assert.ok(checked>=6*3000&&forest>0);
});

// Maithea sites, copied as literals from test-results/biome-plan-2026-10-02/sites.json
// (direction, legacy ground height, slope in degrees).
const SITES={
  equatorLowland:{d:[0.823489606008632,-0.17756666666666665,0.5388273820850579],h:303.24955029626767,slope:4.895929126896941},
  midLatForest:{d:[0.769211347528793,-0.5823133333333332,0.2631066032146682],h:1555.5035896199242,slope:13.937121373319108},
  dryUpland:{d:[0.8730463406926187,-0.3999933333333334,0.2789183039746887],h:259.1803911416989,slope:2.1608782603458185},
  highMountain:{d:[0.7040483064066647,0.029326666666666612,0.7095462838096817],h:18065.57578707872,slope:13.714195258437476},
  midLatSnowMountain:{d:[0.5231706598848948,-0.8075000000000001,0.2724632280429847],h:3975.100446910822,slope:12.834885986609027},
  polar:{d:[0.34535062107191883,-0.9275800000000001,0.14257731981363617],h:688.3077559521448,slope:5.0329000165413555},
  coast:{d:[0.804750833710838,-0.25150000000000006,0.5377023764516121],h:92.6497795489498,slope:1.7348700887854251},
};
test('Maithea sites: the 18 km equatorial summit is snow, the pole is snow, both forest sites keep forest',()=>{
  const classify=biomeClassifier(maithea),at=k=>{const s=SITES[k];return classify(s.d,s.h,Math.cos(s.slope*Math.PI/180));};
  const high=at('highMountain');
  assert.ok(high.weights[3]>.9,`highMountain snow ${high.weights[3]}`);assert.equal(high.name,'Alpine / polar snow');assert.equal(high.forestPotential,false);
  const polar=at('polar');assert.ok(polar.snowFraction>.9,`polar snow ${polar.snowFraction}`);assert.equal(polar.name,'Alpine / polar snow');
  for(const k of ['equatorLowland','midLatForest']){const c=at(k);assert.equal(c.forestPotential,true,k);assert.ok(c.forestSuitability01>0,k);assert.equal(c.name,'Temperate ground',k);}
  assert.equal(at('dryUpland').name,'Dry upland');
  assert.equal(at('coast').name,'Coastal sand');
  // 54 deg, 3975 m: snow-capped under Maithea's 4.62 K/km lapse (legacy: snow 0.54, 'Mountain meadow').
  assert.equal(at('midLatSnowMountain').name,'Alpine / polar snow');
});

/** Runtime import closure of src/<roots> (type-only imports are erased). */
function importClosure(roots){
  const seen=new Set(),stack=[...roots],bare=new Set();
  while(stack.length){
    const file=stack.pop();if(seen.has(file))continue;seen.add(file);
    const src=readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
    for(const m of src.matchAll(/^\s*import\s+(?!type\b)[^;]*?from\s+['"]([^'"]+)['"]/gm)){
      const spec=m[1];
      if(spec.startsWith('./'))stack.push(spec.slice(2));else bare.add(spec);
    }
  }
  return {seen,bare};
}
test('the manifest version imports pull in neither three nor a cycle back to time-nav',()=>{
  // The four versions time-nav.ts now folds into MODEL_MANIFEST_ID come from
  // three leaf-ish modules (SURVEY_VERSION is declared in surface-biomes.ts so
  // the survey's planet-tiles graph is not imported).
  const added=importClosure(['surface-biomes.ts','surface-climate.ts','habitat-suitability.ts']);
  assert.deepEqual([...added.bare],[],`new bare imports: ${[...added.bare].join(', ')}`);
  assert.ok(!added.seen.has('time-nav.ts'),'cycle back to time-nav.ts');
  const nav=readFileSync(new URL('../src/time-nav.ts',import.meta.url),'utf8');
  assert.ok(!/from '\.\/surface-survey\.ts'/.test(nav),'time-nav must not import the survey module');
  // time-nav's own external imports are unchanged from main (three is already
  // reachable there via terrain.ts -> river-sample.ts -> ... -> river-surface.ts).
  const all=importClosure(['time-nav.ts']);
  assert.deepEqual([...all.bare].sort(),['polygon-clipping','three']);
  for(const f of all.seen)if(f!=='time-nav.ts'){
    const src=readFileSync(new URL('../src/'+f,import.meta.url),'utf8');
    assert.ok(!/^\s*import\s+(?!type\b)[^;]*?from\s+['"]\.\/time-nav\.ts['"]/m.test(src),`${f} imports time-nav.ts (cycle)`);
  }
});
