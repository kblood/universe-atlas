import {test} from 'node:test';
import assert from 'node:assert/strict';
import {floraFineDemand,floraFarRepresentative,floraFineCoverage,FLORA_FINE_DEMAND_CAP} from '../src/flora-streaming.ts';
import {surfaceCellAt,surfaceCellsWithin} from '../src/surface-cell.ts';
import {FloraCandidateBuffer,FloraFieldRenderer,drawFloraCandidates,packCullPlane} from '../src/flora-culling.ts';
import * as THREE from 'three';
const radius=6e6,unit=d=>{const n=Math.hypot(...d);return d.map(x=>x/n);};
test('extended demand preserves canonical2m identities and keeps near plants while sampling farcover within fixedbudget',()=>{
 for(const d of [[1,0,0],[0,1,0],unit([1,1,1]),unit([1,.2,1])]){
  const result=floraFineDemand(d,radius),ids=new Set(result.map(c=>c.id));
  assert.ok(result.length<=FLORA_FINE_DEMAND_CAP);
  assert.equal(ids.size,result.length);
  for(const c of result){assert.equal(surfaceCellAt(c.direction,radius,2).id,c.id);if(c.farRepresentative)assert.equal(floraFarRepresentative(c.direction,radius).id,c.id);}
  for(const c of surfaceCellsWithin(d,radius,34,2).slice(0,FLORA_FINE_DEMAND_CAP))assert.ok(ids.has(c.id));
  assert.ok(result.some(c=>Math.hypot(...c.direction.map((v,i)=>v-d[i]))*radius>100));
  assert.deepEqual(floraFineDemand(d,radius),result);
 }
});
test('far representative identity is independent of observer movements; near transition fades smoothly',()=>{
 const a=[1,0,0],b=unit([1,12/radius,0]),first=floraFineDemand(a,radius),second=new Map(floraFineDemand(b,radius).map(c=>[c.id,c]));
 let overlap=0;
 for(const c of first)if(c.farRepresentative&&second.has(c.id)){overlap++;assert.equal(second.get(c.id).farRepresentative,true);assert.deepEqual(second.get(c.id).direction,c.direction);}
 assert.ok(overlap>100);
 assert.equal(floraFineCoverage(false,26),1);assert.equal(floraFineCoverage(false,30),.5);assert.equal(floraFineCoverage(false,34),0);
 assert.equal(floraFineCoverage(true,100),1);
 let last=1;for(let d=26;d<=34;d+=.01){const current=floraFineCoverage(false,d);assert.ok(current<=last&&last-current<.01);last=current;}
});
test('far groundcover actually reaches LOD2 instancing at100m and fades at120m without exceeding bucketcapacity',()=>{
 const renderer=new FloraFieldRenderer(()=>new THREE.BoxGeometry(),()=>new THREE.MeshBasicMaterial());
 const buffer=new FloraCandidateBuffer(4),matrix=new THREE.Matrix4(),planes=new Float32Array(24);
 for(let i=0;i<6;i++)packCullPlane(planes,i,0,0,0,1);
 for(const x of [100,114,120]){matrix.makeTranslation(x,0,0);buffer.push('grass',x,0,0,1,matrix.elements,null,.5);}
 const result=drawFloraCandidates(buffer,renderer,{x:0,y:0,z:0},planes);
 assert.equal(result.drawnCount,3);assert.equal(renderer.bucketFor('grass',2).instanceCount,3);
 const fade=renderer.bucketFor('grass',2).fade.array;
 assert.equal(fade[0],.5);assert.equal(fade[1],.25);assert.equal(fade[2],0);
});
