// Per-tile measured metadata (P3-LOD-CONTRACT (B), docs/lod-ladder-contract-v1.md section 4): 64 bytes that
// buildTile emits from the lattice samples and classifier calls it already makes. Every field is checked
// against an independent recomputation from terrainSampler + biomeClassifier on the same lattice.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as terrain from '../src/terrain.ts';
import {buildTile, readTileMetadata, directionTile, tileDirection, PATCH_SEGMENTS, TILE_META_BYTES, TILE_META_VERSION} from '../src/planet-tiles.ts';
import {biomeClassifier} from '../src/surface-biomes.ts';
import {LOD_LADDER_VERSION, SNOW_LABELS, TILE_CLASS_LABELS, peakCorrectionMaxLevel} from '../src/lod-ladder.ts';
import {waterWorlds} from './terrain-climate-fixtures.mjs';
import {stratifiedEdgeDirections} from '../scripts/lod-consistency-report.mjs';

const n=PATCH_SEGMENTS,stride=n+1;
const bodies=Object.fromEntries(waterWorlds().map(b=>[b.name,b]));
/** Terrain window bound: terrain.ts's own value once P1-GEO-FLOOR lands, else the plan's 2680 m x min(1, R/2000 km). */
const windowMaxM=body=>typeof terrain.terrainWindowMaxM==='function'?terrain.terrainWindowMaxM(body):typeof terrain.terrainWindowMaxM==='number'?terrain.terrainWindowMaxM:2680*Math.min(1,body.radiusM/2e6);

/** The fixture set: for every water world, a coast, a range and a snowline tile at an S0, two S1 (one the
 * last corrected level), an S2 and two S3 levels; plus a raised-sea-level build. */
function fixtures(){
  const out=[];
  for(const name of ['Maithea','Lethuris','Raiva','Selawyn']){
    const body=bodies[name],ts=terrain.terrainSampler(body),picks=stratifiedEdgeDirections(ts,biomeClassifier(body),1),maxL=peakCorrectionMaxLevel(body.radiusM);
    const dirs=[picks.coast[0],picks.range[0],picks.snowline[0]??picks.treeline[0]].filter(Boolean);
    for(const d of dirs)for(const L of [2,6,maxL,maxL+1,14,18])out.push({body,tile:directionTile(d,L),waterLevelM:0});
    out.push({body,tile:directionTile(picks.coast[0],8),waterLevelM:-120});
  }
  return out;
}
const FIXTURES=fixtures();

/** Recomputes what the metadata must say from scratch: one terrain sample and one classifier call per
 * lattice vertex, with the stored (Float32) vertex normal as the slope input. */
function recompute(body,tile,data,waterLevelM){
  const ts=terrain.terrainSampler(body,undefined,undefined,undefined,waterLevelM),cls=biomeClassifier(body,waterLevelM);
  let ocean=0,snow=0,forest=0,snowline=Infinity,treeline=-Infinity,floorMin=Infinity,floorMax=-Infinity,windowMax=-Infinity,floorSeen=false;
  const counts=new Map();
  for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){
    const i=y*stride+x,d=tileDirection(tile,x/n,y/n),s=ts(d),up=d[0]*data.normals[i*3]+d[1]*data.normals[i*3+1]+d[2]*data.normals[i*3+2],c=cls(d,s.groundHeightM,up);
    assert.ok(TILE_CLASS_LABELS.includes(c.name),`classifier label "${c.name}" has a metadata class id`);
    counts.set(c.name,(counts.get(c.name)||0)+1);
    if(c.ocean)ocean++;
    if(!c.ocean&&SNOW_LABELS.includes(c.name)){snow++;snowline=Math.min(snowline,s.groundHeightM);}
    if(c.forestPotential){forest++;treeline=Math.max(treeline,s.groundHeightM);}
    if(typeof s.floorM==='number'&&Number.isFinite(s.floorM)){floorSeen=true;floorMin=Math.min(floorMin,s.floorM);floorMax=Math.max(floorMax,s.floorM);windowMax=Math.max(windowMax,s.groundHeightM-s.floorM);}
  }
  const top=[...counts].map(([name,count])=>({name,count,id:TILE_CLASS_LABELS.indexOf(name)})).sort((a,b)=>b.count-a.count||a.id-b.id).slice(0,4);
  return {ocean,snow,forest,snowline,treeline,top,floorSeen,floorMin,floorMax,windowMax};
}

test('tile metadata: 64 bytes, versioned, deterministic, carried by every tile',()=>{
  assert.equal(TILE_META_BYTES,64);assert.equal(TILE_META_VERSION,1);
  for(const {body,tile,waterLevelM} of FIXTURES.slice(0,8)){
    const a=buildTile(body,tile,1,waterLevelM),b=buildTile(body,tile,1,waterLevelM);
    assert.ok(a.meta instanceof Uint8Array);assert.equal(a.meta.byteLength,TILE_META_BYTES);
    assert.deepEqual(a.meta,b.meta,'bit-identical metadata on rebuild');
    const m=readTileMetadata(tile,a.meta);
    assert.equal(m.version,TILE_META_VERSION);assert.equal(m.ladderVersion,LOD_LADDER_VERSION);
    assert.equal(m.peakCorrected,tile.level<=peakCorrectionMaxLevel(body.radiusM));
    assert.equal(a.meta[62],0);assert.equal(a.meta[63],0);
  }
  assert.throws(()=>readTileMetadata(FIXTURES[0].tile,new Uint8Array(63)));
});

test('tile metadata: height bounds, summit, snowline/treeline, ocean/snow/forest counts and class histogram match the lattice exactly',()=>{
  let checked=0,corrected=0;
  for(const {body,tile,waterLevelM} of FIXTURES){
    const data=buildTile(body,tile,1,waterLevelM),m=readTileMetadata(tile,data.meta),r=recompute(body,tile,data,waterLevelM),where=`${body.name} ${tile.face}/${tile.level}/${tile.x}/${tile.y} sea ${waterLevelM}`;
    const h=data.surfaceHeight;let lo=Infinity,hi=-Infinity;for(const v of h){lo=Math.min(lo,v);hi=Math.max(hi,v);}
    // minH <= every stored vertex height <= maxH (Float32 rounding is monotonic, so this is exact).
    assert.equal(m.minH,lo,`${where}: minH is the lowest stored vertex`);
    assert.ok(m.maxH>=hi,`${where}: maxH bounds every stored vertex`);
    if(m.peakCorrected){corrected++;
      // Coarse tiles also see their cell centres: maxH is the summit of vertices and centres together.
      const [u,v]=m.peakUV,c=terrain.terrainSampler(body,undefined,undefined,undefined,waterLevelM)(tileDirection(tile,u,v)).groundHeightM;
      assert.ok(m.maxH===hi||m.maxH===Math.fround(c),`${where}: maxH is a vertex or a sampled cell centre`);
    }else assert.equal(m.maxH,hi,`${where}: point-sampled tile summit is its highest vertex`);
    const [pu,pv]=m.peakUV;assert.deepEqual(m.peakDir,tileDirection(tile,pu,pv));
    if(Number.isInteger(pu*n)&&Number.isInteger(pv*n)&&m.maxH===hi)assert.equal(h[Math.round(pv*n)*stride+Math.round(pu*n)],m.maxH,`${where}: peakDir points at maxH`);
    assert.equal(m.waterLevelM,waterLevelM);
    assert.equal(m.latticeCount,stride*stride);
    assert.equal(m.oceanCount,r.ocean,`${where}: ocean count`);
    assert.equal(m.snowCount,r.snow,`${where}: snow count`);
    assert.equal(m.forestCount,r.forest,`${where}: forest count`);
    assert.equal(m.snowShare,r.snow/(stride*stride));assert.equal(m.forestShare,r.forest/(stride*stride));assert.equal(m.oceanShare,r.ocean/(stride*stride));
    if(r.snow)assert.equal(m.snowlineM,Math.fround(r.snowline),`${where}: snowline = lowest snowy land vertex`);else assert.ok(Number.isNaN(m.snowlineM));
    if(r.forest)assert.equal(m.treelineM,Math.fround(r.treeline),`${where}: treeline = highest forest-potential vertex`);else assert.ok(Number.isNaN(m.treelineM));
    assert.deepEqual(m.classHistogram.map(e=>[e.name,e.count]),r.top.map(e=>[e.name,e.count]),`${where}: top-4 class histogram`);
    // Floor fields arrive with P1-GEO-FLOOR (terrain floorM). Until then they are NaN and flagged absent.
    assert.equal(m.floorPresent,r.floorSeen);
    if(r.floorSeen){
      assert.ok(m.floorMin<=Math.fround(r.floorMin)&&m.floorMax===Math.fround(r.floorMax),`${where}: floorMin <= every vertex floorM`);
      assert.ok(m.maxH-m.floorMax<=windowMaxM(body)+1,`${where}: maxH - floorMax <= terrain window ${windowMaxM(body).toFixed(0)} m`);
    }else for(const k of ['floorMin','floorMax','windowMax'])assert.ok(Number.isNaN(m[k]),`${where}: ${k} NaN without floorM`);
    checked++;
  }
  assert.ok(checked>=60&&corrected>=20,`${checked} tiles checked, ${corrected} peak-corrected`);
});
