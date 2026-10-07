// Elevation identity gate for W1-B-TERRAIN-COLOUR (terrain-1.7.0-climate-colour,
// docs/biome-climate-increment-1-plan-2026-10-02.json). The colour change may
// move only `color`; the physical surface must stay bit-identical. This file was
// committed FIRST, with its sha256 literal computed on the unmodified
// terrain-1.6.0 code (main a9e3654), before terrain.ts was edited.
//
// Hashed per direction (Float64 bytes, little-endian, plus one ocean byte):
//   baseTerrainSampler(body)(d).elevationM
//   terrainSampler(body)(d).elevationM, .groundHeightM, .ocean
// over 4096 Fibonacci directions on 6 bodies: Maithea (the harness water world)
// and the first 5 non-gas-giant golden-generator planets (tests/golden/
// generator.ts: Volcanic, Rocky, 2 Oceanic, Ice).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {galaxies,sector,system} from '../src/catalog.ts';
import {baseTerrainSampler,terrainSampler,mountainCarvingState} from '../src/terrain.ts';
import {orogenLayout} from '../src/mountain-layout.ts';
import {MASSIF_ENVELOPE,MASSIF_COARSE_MARGIN} from '../src/mountain-envelope.ts';
import {fullOnly} from './helpers/statistic-level.mjs';
import {fib,maithea,goldenTerrainBodies,waterWorlds} from './terrain-climate-fixtures.mjs';

/** BASE (relief round P4 step 0, recorded on the unmodified tree 2c47cc9 before
 * any relief edit): baseTerrainSampler(body)(d).elevationM (Float64 LE) plus the
 * ocean byte, 4096 Fibonacci directions on the same 6 identity bodies. This is
 * the archived drainage/river input field; it is NEVER re-pinned. A change here
 * means the baseline rock the canonical drainage was built on moved. */
export const BASE_ELEVATION_SHA256='322f0eb2bcf8414b74da6fe63fcfb3017c5496e69187c9134f3049d0ca7fb5f7';
export function baseElevationDigest(n=4096){
  const bodies=[maithea(),...goldenTerrainBodies().slice(0,5)];
  const hash=createHash('sha256');
  const f=new Float64Array(1),bytes=new Uint8Array(f.buffer),flag=new Uint8Array(1);
  const ids=[];
  for(const body of bodies){
    ids.push(body.id);hash.update(body.id);
    const base=baseTerrainSampler(body);
    for(let i=0;i<n;i++){const b=base(fib(i,n));f[0]=b.elevationM;hash.update(bytes);flag[0]=b.ocean?1:0;hash.update(flag);}
  }
  return {sha:hash.digest('hex'),ids};
}

/** RELIEF: the terrainSampler surface (re-pinned deliberately, never silently).
 * terrain-1.8.0-relief (P4-RELIEF, docs/terrain-relief-v1.md) re-pins both:
 *   ELEVATION_IDENTITY 4f6021aafa19091ee059b94a6119867d953881d17fe624da758f1764bd7e89f8
 *                   -> 27036fc2a5924d3c54f5dec62b92e5be78c69ebe035b85767801d7f15e4e179e
 *     (R-CAL-1 floor shaping, seabed, dry-world scaling; BASE above is unchanged;
 *     ocean flags at sea 0 unchanged: 0 coastline flips, tests/terrain-relief-hypsometry)
 *   KEPT_PALETTE 06d335ce6a1fbf309a65f5b195098a8a0e1324979de27fdb448b173f73ff84ac
 *             -> 5cf3db02c9f62fc79d85ac46c028353a97e3acdc76c6f3a748601f4d928f3bba
 *     (ONLY the water-world ocean colours move: they shade by depth and the seabed
 *     is deeper; all 10 non-water bodies and the base-sampler colours are
 *     bit-identical, measured diff 0 of 2048 each). */
export const ELEVATION_IDENTITY_SHA256='27036fc2a5924d3c54f5dec62b92e5be78c69ebe035b85767801d7f15e4e179e';
export const KEPT_PALETTE_COLOUR_SHA256='5cf3db02c9f62fc79d85ac46c028353a97e3acdc76c6f3a748601f4d928f3bba';

export function elevationIdentityDigest(n=4096,options={}){
  const bodies=[maithea(),...goldenTerrainBodies().slice(0,5)];
  const hash=createHash('sha256');
  const f=new Float64Array(4),bytes=new Uint8Array(f.buffer),flag=new Uint8Array(1);
  const ids=[];
  for(const body of bodies){
    ids.push(body.id);
    hash.update(body.id);
    const base=baseTerrainSampler(body),sample=terrainSampler(body,undefined,undefined,undefined,0,undefined,false,options);
    for(let i=0;i<n;i++){
      const d=fib(i,n),b=base(d),s=sample(d);
      f[0]=b.elevationM;f[1]=s.elevationM;f[2]=s.groundHeightM;f[3]=0;
      hash.update(bytes);flag[0]=s.ocean?1:0;hash.update(flag);
    }
  }
  return {sha:hash.digest('hex'),ids};
}

/**
 * Colours that W1-B must NOT move, captured on terrain-1.6.0: every sample of
 * every non-water body in the golden systems (2 bodies per type: Volcanic,
 * Rocky, Ice, Airless moon, Gas giant; ocean, sea-ice, Ice-world, Volcanic and
 * barren palettes) plus the ocean samples of 6 water worlds, and
 * baseTerrainSampler's own colour on Maithea (baseTerrainSampler stays
 * byte-for-byte unchanged). Hashes the exact Float64 colour channels.
 */
export function keptPaletteColourDigest(n=2048,options={}){
  const refs=[];
  for(const g of galaxies('LETHRA-GOLDEN-001').slice(0,3))
    for(const c of [[266,0,0],[0,0,0],[-2,-1,-2],[12,-4,7]])refs.push(...sector(g,c).refs);
  const all=refs.slice(0,220).map(system).flatMap(s=>[...s.planets,...s.moons]);
  const dry=[];
  for(const type of ['Volcanic world','Rocky world','Ice world','Airless moon','Gas giant'])
    dry.push(...all.filter(b=>b.type===type&&!(b.water>0)).slice(0,2));
  const wet=[...waterWorlds(),...goldenTerrainBodies().filter(b=>b.water>0)];
  const hash=createHash('sha256');
  const f=new Float64Array(3),bytes=new Uint8Array(f.buffer);
  const put=c=>{f[0]=c[0];f[1]=c[1];f[2]=c[2];hash.update(bytes);};
  const ids=[];let oceanSamples=0;
  for(const body of dry){
    ids.push(body.id);hash.update(body.id);
    const sample=terrainSampler(body);
    for(let i=0;i<n;i++)put(sample(fib(i,n)).color);
  }
  for(const body of wet){
    ids.push(body.id);hash.update(body.id);
    const sample=terrainSampler(body,undefined,undefined,undefined,0,undefined,false,options);
    for(let i=0;i<n;i++){const d=fib(i,n),s=sample(d);if(s.ocean){put(s.color);oceanSamples++;}}
  }
  {const body=maithea(),base=baseTerrainSampler(body);hash.update('base:'+body.id);for(let i=0;i<n;i++)put(base(fib(i,n)).color);}
  return {sha:hash.digest('hex'),ids,oceanSamples};
}

test('BASE: baseTerrainSampler elevation and ocean are bit-identical to the pre-relief tree (never re-pinned)',()=>{
  const {sha,ids}=baseElevationDigest();
  assert.equal(ids.length,6);
  assert.equal(sha,BASE_ELEVATION_SHA256);
});

test('RELIEF: the pre-mountains field ({mountains: false}) is bit-identical to the terrain-1.8.0-relief pin (re-pinned deliberately by P4-RELIEF, old 4f6021aa; unchanged by T6)',()=>{
  const {sha,ids}=elevationIdentityDigest(4096,{mountains:false});
  assert.deepEqual(ids,['G001/C2128,0,1/0/planet/1','G001/C2128,0,7/0/planet/0','G001/C2128,0,7/0/planet/1',
    'G001/C2128,0,7/0/planet/2','G001/C2128,0,7/0/planet/3','G001/C2128,0,7/0/planet/4']);
  assert.equal(sha,ELEVATION_IDENTITY_SHA256);
});

test('kept palette: ocean, sea-ice, Ice, Volcanic, barren, gas-giant and base-sampler colours are bit-identical to the terrain-1.8.0-relief pin (ocean colours follow the relief depth; old 06d335ce)',()=>{
  // T6 decision 3: the ocean-colour statistic reads the wet worlds' level-0 field in npm test (the massifs are land;
  // ocean flags are unchanged by the reduction); the truth is checked in the test:full test below.
  const {sha,ids,oceanSamples}=keptPaletteColourDigest(2048,{lodLevel:0});
  assert.equal(ids.length,16);
  assert.ok(oceanSamples>4000,`ocean samples ${oceanSamples}`);
  assert.equal(sha,KEPT_PALETTE_COLOUR_SHA256);
});

// T6 (terrain-1.9.0-mountains, docs/mountains-t6-wiring-2026-10-06.md): the wired field. Old = the RELIEF pin above
// (27036fc2..., still the {mountains: false} field). New: the wired level-0 field (default npm test) and the wired truth
// (test:full only, decision 3: 6 bodies x 4096 directions on the carved truth cost ~50 s). Identity outside the belts:
// every direction that is not within H = min(halfWidth, 48 km) of a massif-width belt axis (level 0: 1.3 H, the coarse
// envelope's reach) is bit-identical to the
// pre-mountains field (the whole sample object), and the massifs do move the field (negative control).
export const MOUNTAINS_LEVEL0_SHA256='81b7bdd57562012304414995a4cb4ee1e81b2b719ad6bdcf79f579c84038f7bb';
// Carving C1 (terrain-1.9.1-carving-c1): the truth re-pinned, was 7de7c8f7d73fe535435522f2d158bccc654f833eee81c1e9b6acb286f79fb3cd;
// level 0 (uncarved) unchanged.
export const MOUNTAINS_TRUTH_SHA256='46ecb662891719725b26eb98a1e600f769efd99f71a41ed08f3227028832a5cd';
// The truth: the massif is |axis| < H = min(halfWidth, 48 km). Level 0 reads the baked coarse field (massif-envelope-3),
// a conservative upper envelope whose candidate is skipped only when |sd| - margin >= 1 (sd bilinear in Float32,
// error <= 0.5 x margin, measured, docs/mountains-t6-baked-coarse-2026-10-06.md section 9): outside 1 + 1.5 x END_H.
const reachH=options=>options.lodLevel===0?1+1.5*MASSIF_COARSE_MARGIN.END_H:1;
const onMassif=(o,k=1)=>o.belt!==0&&o.halfWidthM>=MASSIF_ENVELOPE.MIN_HALF_WIDTH_M&&Math.abs(o.axisDistanceM)<k*Math.min(o.halfWidthM,MASSIF_ENVELOPE.MAX_HALF_WIDTH_M);
function outsideBeltIdentity(options,n=4096){
  const out=[];
  for(const body of [maithea(),...goldenTerrainBodies().slice(0,5)]){
    const off=terrainSampler(body,undefined,undefined,undefined,0,undefined,false,{mountains:false}),on=terrainSampler(body,undefined,undefined,undefined,0,undefined,false,options);
    const wired=mountainCarvingState(body,options)!==null,lay=wired?orogenLayout(body):null;let outside=0,inside=0,moved=0,bad=0;
    for(let i=0;i<n;i++){
      const d=fib(i,n),a=on(d),b=off(d);
      if(lay&&onMassif(lay.sample(d),reachH(options))){inside++;try{assert.deepStrictEqual(a,b);}catch{moved++;}continue;}
      outside++;try{assert.deepStrictEqual(a,b);}catch{bad++;}
    }
    out.push({body:body.name??body.id,wired,outside,inside,moved,bad});
  }
  return out;
}
test('T6 identity outside the belts (level 0): bit-identical to the pre-mountains field outside the coarse envelope reach (1.3 H); massifs move',()=>{
  const rows=outsideBeltIdentity({lodLevel:0});
  for(const r of rows)assert.equal(r.bad,0,JSON.stringify(r));
  assert.ok(rows.some(r=>r.moved>0),`the massifs move the level-0 field: ${JSON.stringify(rows)}`);
  const {sha}=elevationIdentityDigest(4096,{lodLevel:0});
  assert.equal(sha,MOUNTAINS_LEVEL0_SHA256);
});
test('T6 identity outside the belts (truth) and the wired truth digest',fullOnly('the carved truth on 6 bodies x 4096 directions'),()=>{
  const rows=outsideBeltIdentity({});
  for(const r of rows)assert.equal(r.bad,0,JSON.stringify(r));
  assert.ok(rows.some(r=>r.moved>0),`the massifs move the truth: ${JSON.stringify(rows)}`);
  const {sha}=elevationIdentityDigest();
  assert.equal(sha,MOUNTAINS_TRUTH_SHA256);
  assert.equal(keptPaletteColourDigest().sha,KEPT_PALETTE_COLOUR_SHA256,'kept palette on the truth');
});
