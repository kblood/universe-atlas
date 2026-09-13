import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {sphereGrid,routeDrainage,buildDrainage,drainageBytes} from '../src/drainage.ts';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {terrainSampler} from '../src/terrain.ts';
const body=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];
const digest=d=>createHash('sha256').update(JSON.stringify(d.catchments)).update(Buffer.from(d.receiver.buffer)).update(Buffer.from(d.filled.buffer)).update(Buffer.from(d.accumulated.buffer)).digest('hex');
test('spherical drainage topology joins all seams and sums to the area of a sphere',()=>{
  const n=16,g=sphereGrid(n),count=g.areas.length;
  assert.equal(count,6*n*n+2);
  assert.ok(Math.abs(g.areas.reduce((a,b)=>a+b,0)-4*Math.PI)<1e-12);
  const seen=new Set([0]),queue=[0];
  for(const i of queue)for(const j of g.neighbours.slice(g.offsets[i],g.offsets[i+1])){
    assert.ok(g.neighbours.slice(g.offsets[j],g.offsets[j+1]).includes(i));
    if(!seen.has(j)){seen.add(j);queue.push(j);}
  }
  assert.equal(seen.size,count);
  const vectors=Array.from({length:count},(_,i)=>Array.from(g.directions.slice(i*3,i*3+3)));
  assert.equal(new Set(vectors.map(v=>v.join(','))).size,count);
  assert.ok(vectors.some(v=>v[1]===1));assert.ok(vectors.some(v=>v[1]===-1));
});
test('closed depressions fill only in the conditioning field, with acyclic conservative flow',()=>{
  const g=sphereGrid(8),n=g.areas.length,h=new Float64Array(n),wet=new Uint8Array(n);
  // A northern low basin is separated from a southern ocean by a high belt.
  for(let i=0;i<n;i++){const y=g.directions[i*3+1];h[i]=y<-.4?-10:y>.5?20:100;wet[i]=y<-.4?1:0;}
  const original=h.slice(),d=routeDrainage(g,h,wet);
  assert.deepEqual(h,original);assert.ok(d.filled.some((v,i)=>v>h[i]&&!wet[i]));
  let delivered=0;
  for(let i=0;i<n;i++){
    const r=d.receiver[i];assert.ok(d.filled[i]>=h[i]);
    if(r<0){assert.ok(wet[i]);delivered+=d.accumulated[i];}
    else{assert.ok(d.rank[r]<d.rank[i]);assert.ok(d.filled[r]<=d.filled[i]);assert.ok(d.accumulated[r]>=d.accumulated[i]);}
  }
  assert.ok(Math.abs(delivered-4*Math.PI)<1e-12);
  assert.deepEqual(routeDrainage(g,h,wet),d);
  const dry=routeDrainage(g,h,new Uint8Array(n));assert.equal(dry.roots,1);
  assert.equal([...dry.receiver].filter(v=>v<0).length,1);
});
test('planet catchments retain identities and physical locations independent of requests',()=>{
  const before=terrainSampler(body)([1,0,0]),d=buildDrainage(body),saved=digest(d);
  buildDrainage({...body,seed:'another-world'},16);
  const again=buildDrainage(body);assert.equal(digest(again),saved);
  assert.deepEqual(terrainSampler(body)([1,0,0]),before);
  assert.equal(d.stats.nodes,24578);assert.ok(drainageBytes(d)<4*1024*1024);
  assert.equal(d.catchments.length,12);assert.equal(new Set(d.catchments.map(c=>c.id)).size,12);
  const sample=terrainSampler(body);let dryArea=0;
  for(let i=0;i<d.height.length;i++){
    if(d.wet[i])continue;dryArea+=d.areas[i];
    const r=d.receiver[i];if(r>=0&&!d.wet[r])assert.equal(d.outlet[i],d.outlet[r]);
    assert.ok(d.outlet[i]>=0);
  }
  assert.ok(Math.abs(dryArea*body.radiusM**2/1e6-d.stats.landKm2)<1e-5);
  for(const c of d.catchments){
    assert.ok(c.areaKm2>0);assert.ok(c.depressionKm2<=c.areaKm2);assert.ok(c.lengthKm>0);
    for(const s of [c.headwater,c.mouth]){const p=sample(s.direction);assert.equal(p.elevationM,s.elevationM);assert.equal(p.ocean,false);}
    let i=c.head,steps=0;while(i!==c.outlet&&i>=0){i=d.receiver[i];assert.ok(++steps<d.stats.nodes);}
    assert.equal(i,c.outlet);
  }
  console.log(JSON.stringify({digest:saved,stats:d.stats,bytes:drainageBytes(d),first:d.catchments[0]}));
});
