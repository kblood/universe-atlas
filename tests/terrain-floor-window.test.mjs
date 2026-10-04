// R0 (relief round 2026-10-03, package P1-GEO-FLOOR): the floor/window split
// that terrain-1.7.0 already has implicitly is exposed, purely additively, by
// terrainFloorSampler (terrainSampler + SurfaceSample.floorM / windowM /
// continentalM); the plain terrainSampler keeps its historical field set.
//  - No numeric change: tests/terrain-elevation-identity.test.mjs (run
//    untouched) keeps ELEVATION_IDENTITY_SHA256 4f6021aa... and
//    KEPT_PALETTE_COLOUR_SHA256 06d335ce...; this file re-checks the window
//    invariant and the coast coordinate.
//  - Invariant: 0 <= groundHeight - floorM <= terrainWindowMaxM(body) over
//    6 bodies x 20000 directions (crater-free default sampler, no regions).
//  - continentalM >= 0 exactly where the sea-level-0 sampler says land.
// terrain-1.8.0-relief (P4-RELIEF): the digests above were re-pinned by P4 (see
// docs/terrain-relief-v1.md); the window became tau x the unit window and the
// descriptive window-usage checks are tau-aware (old/new values inline below).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {galaxies,sector,system} from '../src/catalog.ts';
import {baseTerrainSampler,terrainFloorSampler,terrainSampler,terrainWindowMaxM,terrainUnitWindowMaxM,tectonicReliefOf,TERRAIN_DETAIL_WINDOW_M,TERRAIN_LANDFORM_WINDOW_M} from '../src/terrain.ts';
import {fib,goldenTerrainBodies,waterWorlds} from './terrain-climate-fixtures.mjs';

const N=20000;
function goldenAll(){
  const refs=[];
  for(const g of galaxies('LETHRA-GOLDEN-001').slice(0,3))
    for(const c of [[266,0,0],[0,0,0],[-2,-1,-2],[12,-4,7]])refs.push(...sector(g,c).refs);
  return refs.slice(0,220).map(system).flatMap(s=>[...s.planets,...s.moons]);
}
/** Maithea, Selawyn, Raiva, Lethuris (water), one dry Rocky world, and one
 * small Airless moon (R < 2000 km, where the hill layer is not radius-scaled). */
function windowBodies(){
  const all=goldenAll();
  const dry=all.find(b=>b.kind==='planet'&&b.type==='Rocky world'&&!(b.water>0));
  const moon=all.find(b=>b.type==='Airless moon'&&b.radiusM<1e6);
  return [...waterWorlds(),dry,moon];
}

test('window bound constant: 772 m detail + 1908 m landforms x min(1, R/2e6); 2680 m from R = 2000 km up; 0 on gas giants',()=>{
  assert.equal(TERRAIN_DETAIL_WINDOW_M,772);
  assert.equal(TERRAIN_LANDFORM_WINDOW_M,1908);
  assert.equal(terrainWindowMaxM({kind:'planet',type:'Oceanic world',radiusM:6.371e6}),2680);
  assert.equal(terrainWindowMaxM({kind:'planet',type:'Rocky world',radiusM:2e6}),2680);
  assert.equal(terrainWindowMaxM({kind:'moon',type:'Airless moon',radiusM:1e6}),772+954);
  assert.equal(terrainWindowMaxM({kind:'planet',type:'Gas giant',radiusM:7e7}),0);
  assert.equal(terrainWindowMaxM({kind:'star',type:'G',radiusM:7e8}),0);
});

test('invariant 0 <= h - floorM <= terrainWindowMaxM(body) over 6 bodies x 20000 directions (0 violations)',()=>{
  const bodies=windowBodies();
  assert.equal(bodies.length,6);
  const report=[];let violations=0;
  for(const body of bodies){
    const s=terrainFloorSampler(body),bound=terrainWindowMaxM(body);
    let max=0,min=Infinity,bad=0;
    for(let i=0;i<N;i++){
      const x=s(fib(i,N));
      const w=x.groundHeightM-x.floorM;
      // windowM is that same difference, carried on the sample.
      if(x.windowM!==w)bad++;
      if(!(w>=0&&w<=bound))bad++;
      if(w>max)max=w;if(w<min)min=w;
    }
    violations+=bad;
    report.push({id:body.id,type:body.type,radiusM:Math.round(body.radiusM),bound,min,max:Math.round(max)});
  }
  assert.equal(violations,0,JSON.stringify(report));
  // terrain-1.8.0-relief (P4-RELIEF r2): the window is tau-scaled,
  // terrainWindowMaxM(body) = tau x terrainUnitWindowMaxM(body), tau =
  // planetGeophysics(body).tectonicRelief. The two descriptive checks below keep
  // their meaning with the shorthand and the 2680 m window both scaled by tau.
  // OLD (terrain-1.7.0, unit window): moon max 1213 < 1617 m; full-size max
  // 1500 < max <= 2680 m (audit 2606 m). NEW (measured 2026-10-03): moon tau
  // 0.3197, max 487.6 m > tau x shorthand 387.9 m (bound 523.0); full-size
  // max/bound 0.904 / 0.843 / 0.791 / 0.906 / 0.932 (Maithea, Selawyn, Raiva,
  // Lethuris, the dry Rocky world; bounds 2115 / 1617 / 1222 / 2066 / 3685 m).
  for(let i=0;i<bodies.length;i++){
    const tau=tectonicReliefOf(bodies[i]);
    assert.ok(tau>0,`${report[i].id} tau ${tau}`);
    assert.equal(report[i].bound,tau*terrainUnitWindowMaxM(bodies[i]),`${report[i].id}: bound = tau x unit window`);
  }
  // The small moon really uses its unscaled hill layer: its window exceeds
  // tau x the plan's 2680*min(1,R/2e6) shorthand, which would have been violated.
  const moon=report[5];
  assert.ok(moon.max>tectonicReliefOf(bodies[5])*2680*Math.min(1,bodies[5].radiusM/2e6),JSON.stringify(moon));
  // Full-size bodies use most of their (tau x 2680 m) window: the same
  // 1500/2680 fraction as the unit-window assertion, never loosened.
  assert.ok(report.slice(0,5).every(r=>r.max>(1500/2680)*r.bound&&r.max<=r.bound),JSON.stringify(report));
});

test('continentalM >= 0 exactly where the sea-level-0 sampler reports land, on the four water worlds',()=>{
  for(const body of waterWorlds()){
    const s=terrainFloorSampler(body);let mismatch=0,land=0;
    for(let i=0;i<N;i++){
      const x=s(fib(i,N));
      if((x.continentalM>=0)!==!x.ocean)mismatch++;
      if(!x.ocean)land++;
    }
    assert.equal(mismatch,0,body.name);
    assert.ok(land>0.2*N&&land<0.9*N,body.name+' land '+land);
  }
});

test('floorM is the clamped base field: water-world seabed and gas giants equal elevationM; floor never exceeds ground',()=>{
  const bodies=[...waterWorlds(),...goldenTerrainBodies().slice(0,5)];
  const gas=goldenAll().find(b=>b.type==='Gas giant');
  for(const body of bodies){
    const s=terrainFloorSampler(body),n=4096;
    for(let i=0;i<n;i++){
      const x=s(fib(i,n));
      assert.ok(x.floorM<=x.groundHeightM);
      // Below sea level on a water world there is no hill/landform layer.
      if(body.water>0&&x.ocean)assert.equal(x.floorM,x.groundHeightM);
      assert.ok(Math.abs(x.floorM)<=18000);
    }
  }
  const s=terrainFloorSampler(gas);
  for(let i=0;i<64;i++){const x=s(fib(i,64));assert.equal(x.floorM,0);assert.equal(x.windowM,0);assert.equal(x.continentalM,0);}
});

test('terrainFloorSampler = terrainSampler plus exactly floorM/windowM/continentalM; plain shapes unchanged',()=>{
  const KEYS=['bank','channelId','color','elevationM','flow','groundHeightM','influence','ocean','rockHeightM','roughness','visibleHeightM','waterDepthM','waterHeightM','waterKind','waterLevelM','wet'];
  for(const body of [...waterWorlds(),...goldenTerrainBodies().slice(0,3)]){
    const plain=terrainSampler(body),floor=terrainFloorSampler(body);
    for(let i=0;i<512;i++){
      const d=fib(i,512),p=plain(d),f=floor(d);
      assert.deepEqual(Object.keys(p).sort(),KEYS);
      const {floorM,windowM,continentalM,...rest}=f;
      assert.ok(Number.isFinite(floorM)&&Number.isFinite(windowM)&&Number.isFinite(continentalM));
      assert.deepEqual(rest,p);
    }
  }
});

test('baseTerrainSampler keeps its historical four-field shape',()=>{
  const b=baseTerrainSampler(waterWorlds()[0])(fib(3,10));
  assert.deepEqual(Object.keys(b).sort(),['color','elevationM','ocean','roughness']);
});
