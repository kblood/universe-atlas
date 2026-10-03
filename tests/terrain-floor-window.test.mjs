// R0 (relief round 2026-10-03, package P1-GEO-FLOOR): the floor/window split
// that terrain-1.7.0 already has implicitly is now exposed on terrainSampler's
// SurfaceSample as floorM / windowM / continentalM, purely additively.
//  - No numeric change: tests/terrain-elevation-identity.test.mjs (run
//    untouched) keeps ELEVATION_IDENTITY_SHA256 4f6021aa... and
//    KEPT_PALETTE_COLOUR_SHA256 06d335ce...; this file re-checks the window
//    invariant and the coast coordinate.
//  - Invariant: 0 <= groundHeight - floorM <= terrainWindowMaxM(body) over
//    6 bodies x 20000 directions (crater-free default sampler, no regions).
//  - continentalM >= 0 exactly where the sea-level-0 sampler says land.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {galaxies,sector,system} from '../src/catalog.ts';
import {baseTerrainSampler,terrainSampler,terrainWindowMaxM,TERRAIN_DETAIL_WINDOW_M,TERRAIN_LANDFORM_WINDOW_M} from '../src/terrain.ts';
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
    const s=terrainSampler(body),bound=terrainWindowMaxM(body);
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
  // The small moon really uses its unscaled hill layer: its window exceeds
  // the plan's 2680*min(1,R/2e6) shorthand, which would have been violated.
  const moon=report[5];
  assert.ok(moon.max>2680*Math.min(1,bodies[5].radiusM/2e6),JSON.stringify(moon));
  // Full-size bodies use most of the 2680 m window (audit: max 2606 m).
  assert.ok(report.slice(0,5).every(r=>r.max>1500&&r.max<=2680),JSON.stringify(report));
});

test('continentalM >= 0 exactly where the sea-level-0 sampler reports land, on the four water worlds',()=>{
  for(const body of waterWorlds()){
    const s=terrainSampler(body);let mismatch=0,land=0;
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
    const s=terrainSampler(body),n=4096;
    for(let i=0;i<n;i++){
      const x=s(fib(i,n));
      assert.ok(x.floorM<=x.groundHeightM);
      // Below sea level on a water world there is no hill/landform layer.
      if(body.water>0&&x.ocean)assert.equal(x.floorM,x.groundHeightM);
      assert.ok(Math.abs(x.floorM)<=18000);
    }
  }
  const s=terrainSampler(gas);
  for(let i=0;i<64;i++){const x=s(fib(i,64));assert.equal(x.floorM,0);assert.equal(x.windowM,0);assert.equal(x.continentalM,0);}
});

test('baseTerrainSampler keeps its historical four-field shape',()=>{
  const b=baseTerrainSampler(waterWorlds()[0])(fib(3,10));
  assert.deepEqual(Object.keys(b).sort(),['color','elevationM','ocean','roughness']);
});
