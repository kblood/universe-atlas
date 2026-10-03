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
import {baseTerrainSampler,terrainSampler} from '../src/terrain.ts';
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

/** RELIEF: the terrainSampler surface (re-pinned deliberately, never silently). */
export const ELEVATION_IDENTITY_SHA256='4f6021aafa19091ee059b94a6119867d953881d17fe624da758f1764bd7e89f8';
export const KEPT_PALETTE_COLOUR_SHA256='06d335ce6a1fbf309a65f5b195098a8a0e1324979de27fdb448b173f73ff84ac';

export function elevationIdentityDigest(n=4096){
  const bodies=[maithea(),...goldenTerrainBodies().slice(0,5)];
  const hash=createHash('sha256');
  const f=new Float64Array(4),bytes=new Uint8Array(f.buffer),flag=new Uint8Array(1);
  const ids=[];
  for(const body of bodies){
    ids.push(body.id);
    hash.update(body.id);
    const base=baseTerrainSampler(body),sample=terrainSampler(body);
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
export function keptPaletteColourDigest(n=2048){
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
    const sample=terrainSampler(body);
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

test('elevation, groundHeight and ocean are bit-identical to terrain-1.6.0 (pre-colour-v2 capture)',()=>{
  const {sha,ids}=elevationIdentityDigest();
  assert.deepEqual(ids,['G001/C2128,0,1/0/planet/1','G001/C2128,0,7/0/planet/0','G001/C2128,0,7/0/planet/1',
    'G001/C2128,0,7/0/planet/2','G001/C2128,0,7/0/planet/3','G001/C2128,0,7/0/planet/4']);
  assert.equal(sha,ELEVATION_IDENTITY_SHA256);
});

test('ocean, sea-ice, Ice, Volcanic, barren, gas-giant and base-sampler colours are bit-identical to terrain-1.6.0',()=>{
  const {sha,ids,oceanSamples}=keptPaletteColourDigest();
  assert.equal(ids.length,16);
  assert.ok(oceanSamples>4000,`ocean samples ${oceanSamples}`);
  assert.equal(sha,KEPT_PALETTE_COLOUR_SHA256);
});
