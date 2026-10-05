import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import * as T from '../../../src/planet-tiles.ts';
import * as S from '../../../src/terrain.ts';
import * as MT from 'file:///C:/LLM/IWSDK/universe-atlas/src/planet-tiles.ts';
import * as MS from 'file:///C:/LLM/IWSDK/universe-atlas/src/terrain.ts';
import {waterWorlds,fib} from '../../../tests/terrain-climate-fixtures.mjs';
import {axisSites} from '../../../tests/helpers/mountain-coarse-tiles.mjs';
import {carvingFromLevel} from '../../../src/lod-ladder.ts';
function digest(v) {
  const h=createHash('sha256');
  function add(v) {
    if(ArrayBuffer.isView(v)) {h.update(v.constructor.name);h.update(new Uint8Array(v.buffer,v.byteOffset,v.byteLength));}
    else if(typeof v==='number') {const b=Buffer.alloc(8);b.writeDoubleLE(v);h.update(b);}
    else if(v&&typeof v==='object') for(const k of Object.keys(v).sort()) {h.update(k);add(v[k]);}
    else h.update(String(v));
  }
  add(v);return h.digest('hex');
}
const result={};
for(const b of waterWorlds()) {
  const sites=axisSites(b,{count:3}),dirs=[...sites.map(s=>s.d),...Array.from({length:256},(_,i)=>fib(i,256))];
  let samplerComparisons=0;
  for(const exposeFloor of [false,true]) for(const lodLevel of [undefined,...Array.from({length:23},(_,i)=>i)]) {
    const a=S.terrainSampler(b,undefined,undefined,undefined,0,undefined,exposeFloor,{lodLevel});
    const m=MS.terrainSampler(b,undefined,undefined,undefined,0,undefined,exposeFloor,{lodLevel});
    for(const d of dirs) {assert.deepStrictEqual(a(d),m(d));samplerComparisons++;}
  }
  const tileDigests=[];
  for(let L=0;L<=carvingFromLevel(b.radiusM)+2;L++) {
    const t=T.directionTile(sites[0].d,L),a=digest(T.buildTile(b,t)),m=digest(MT.buildTile(b,t));
    assert.equal(a,m,`${b.name} L${L}`);tileDigests.push({level:L,digest:a});
  }
  result[b.name]={samplerComparisons,tileDigests};console.log(b.name,'default outputs equal main',samplerComparisons,'samples',tileDigests.length,'tiles');
}
writeFileSync('test-results/mountains/t3/fix-default-identity.json',JSON.stringify(result,null,2)+'\n');
