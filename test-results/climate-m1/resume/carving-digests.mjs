// R5-ATLAS-CLIMATE-M1 resume (climate-m1-decision-2 (b), granted moved pins): compute every digest that
// tests/lod-carving-reduction.test.mjs pins (COST_IDENTITY tile buffers at L(cut-1)/L(cut), sampler outputs at the truth
// and L0..22) with the test's own digest function and inputs, plus a per-field digest of each object, so a re-pin can
// show which fields moved. Run once with main's src/surface-climate.ts swapped in and once on the branch; compare.
// Read-only apart from stdout. Usage: node test-results/climate-m1/resume/carving-digests.mjs > out.json
import {createHash} from 'node:crypto';
import * as tiles from '../../../src/planet-tiles.ts';
import {terrainSampler} from '../../../src/terrain.ts';
import {CLIMATE_VERSION} from '../../../src/surface-climate.ts';
import {riserSharpFromLevel} from '../../../src/lod-ladder.ts';
import {waterWorlds,fib} from '../../../tests/terrain-climate-fixtures.mjs';
import {buildOn,axisSites} from '../../../tests/helpers/mountain-coarse-tiles.mjs';

const CUT={Maithea:6,Selawyn:7,Raiva:5,Lethuris:7};
function costIdentityDigest(value){ // verbatim from tests/lod-carving-reduction.test.mjs
  const h=createHash('sha256');
  function add(v){
    if(ArrayBuffer.isView(v)){h.update(v.constructor.name);h.update(new Uint8Array(v.buffer,v.byteOffset,v.byteLength));}
    else if(typeof v==='number'){const b=Buffer.alloc(8);b.writeDoubleLE(v);h.update(b);}
    else if(v&&typeof v==='object'){for(const k of Object.keys(v).sort()){h.update(k);add(v[k]);}}
    else h.update(String(v));
  }
  add(value);return h.digest('hex');
}
const short=x=>x.slice(0,16);
const fieldsOfTile=t=>Object.fromEntries(Object.keys(t).sort().map(k=>[k,short(costIdentityDigest(t[k]))]));
const fieldsOfSamples=arr=>{const keys=[...new Set(arr.flatMap(o=>Object.keys(o)))].sort();return Object.fromEntries(keys.map(k=>[k,short(costIdentityDigest(arr.map(o=>o[k])))]));};
const out={climateVersion:CLIMATE_VERSION,bodies:{}};
for(const body of waterWorlds()){
  const name=body.name,cut=CUT[name],d=axisSites(body,{count:3})[0].d,r={tiles:{},samplers:{}};
  for(const L of [cut-1,cut]){const t=buildOn(body,tiles.directionTile(d,L));r.tiles[L]={digest:costIdentityDigest(t),fields:fieldsOfTile(t)};}
  const dirs=[...axisSites(body,{count:3}).map(s=>s.d),...Array.from({length:256},(_,i)=>fib(i,256))];
  for(const lodLevel of [undefined,...Array.from({length:23},(_,i)=>i)]){
    const sample=terrainSampler(body,undefined,undefined,undefined,0,undefined,true,{mountains:true,lodLevel});
    const values=dirs.map(x=>sample(x));
    r.samplers[lodLevel===undefined?'truth':`L${lodLevel}`]={digest:costIdentityDigest(values),fields:fieldsOfSamples(values)};
  }
  r.riserSharp=riserSharpFromLevel(body.radiusM);
  out.bodies[name]=r;
}
console.log(JSON.stringify(out));
