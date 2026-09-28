import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {terrainSampler} from '../src/terrain.ts';
import {biomeClassifier} from '../src/surface-biomes.ts';
import {generateBiosphere,profileFromPhysicalProperties} from '../src/biosphere-model.ts';
import {ROCK_TIERS,ROCK_MAX_ALTITUDE_M} from '../src/rock-field.ts';
import {
  PlanetRocks,ROCK_LOD_CAPS,ROCK_BATCH_CAPACITY,ROCK_CELLS_PER_FRAME,ROCK_SAMPLES_PER_FRAME,
  ROCK_WORST_CASE_BYTES,ROCK_BUDGET_BYTES,ROCK_ORIGIN_REBASE_M,ROCK_COLLISION_NOTE,createRockMaterial,
} from '../src/planet-rocks.ts';

const SEED='LETHRA-001';
const sys=system(refByAddress(galaxies(SEED)[0],'G001/C2128,0,1/0'));
const oceanWorld=sys.planets[1],moon=sys.moons[0];
const familiesFor=body=>generateBiosphere(SEED,profileFromPhysicalProperties(body,'main-sequence'),body.id).rocks;
const unit=v=>{const l=Math.hypot(...v);return v.map(x=>x/l);};
const frustum=constant=>new THREE.Frustum(...Array.from({length:6},()=>new THREE.Plane(new THREE.Vector3(1,0,0),constant)));
const ALL=frustum(10),NONE=frustum(-10);
// A single rock cell can cost up to slots x 3 terrain samples beyond the frame limit check.
const MAX_CELL_SAMPLES=Math.max(...ROCK_TIERS.map(t=>t.slots*3));

function rig(body,waterLevelM=-1e6){
  const sample=terrainSampler(body,undefined,undefined,undefined,waterLevelM),classify=biomeClassifier(body,waterLevelM);
  const attached=[];
  const rocks=new PlanetRocks({body,sample:()=>sample,classify:()=>classify,attach:m=>attached.push(m)});
  const gate={surfaceSolid:true,families:familiesFor(body)};
  const view=(raw,altitudeM=2)=>{
    const d=unit(raw),h=sample(d).groundHeightM,g=1+(Math.max(h,waterLevelM)+altitudeM)/body.radiusM;
    return {eye:new THREE.Vector3(d[0]*g,d[1]*g,d[2]*g),focus:new THREE.Vector3(...d),altitudeM};
  };
  const input=(v,extra={})=>({...v,gate,relief:1,waterLevelM,frusta:[ALL],shadowFrustum:null,...extra});
  const settle=(v,extra={},frames=4000)=>{
    for(let i=0;i<frames;i++){
      rocks.update(input(v,extra));
      const d=rocks.diagnostics();
      assert.ok(d.work.cells<=ROCK_CELLS_PER_FRAME,`cells per frame ${d.work.cells}`);
      assert.ok(d.work.samples<ROCK_SAMPLES_PER_FRAME+MAX_CELL_SAMPLES,`samples per frame ${d.work.samples}`);
      if(d.tiers.every(t=>t.wanted>0&&t.pending===0&&t.resident>=t.wanted))return {frames:i+1,diagnostics:d};
    }
    assert.fail('rock field did not settle');
  };
  return {rocks,gate,attached,view,input,settle,sample};
}
const counts=rocks=>rocks.census().tiers.map(t=>t.count);

test('the streamed census is independent of approach path, view and frame budget',()=>{
  const target=[.3,.8,.52];
  const a=rig(moon);a.settle(a.view(target));
  const b=rig(moon);b.settle(b.view([.3002,.7995,.521]));b.settle(b.view(target),{frusta:[NONE]});
  const ca=a.rocks.census(),cb=b.rocks.census();
  assert.equal(ca.reason,'ok');
  assert.deepEqual(cb.tiers,ca.tiers);assert.deepEqual(cb.total,ca.total);
  assert.ok(ca.total.count>200,`barren moon rock count ${ca.total.count}`);
  for(const t of ca.tiers)assert.equal(t.resolvedCells,t.wantedCells);
  a.rocks.dispose();b.rocks.dispose();
});

test('date seeks that remove the solid surface clear residents; returning reproduces the census',()=>{
  const r=rig(moon),v=r.view([-.4,.2,.9]);r.settle(v);
  const before=r.rocks.census();
  for(const gate of [{surfaceSolid:false,families:[]},null,{surfaceSolid:true,families:[]}]){
    r.rocks.update(r.input(v,{gate}));
    const d=r.rocks.diagnostics();
    assert.equal(d.enabled,false);assert.equal(d.bytes.residentCells,0);assert.equal(d.drawn.total,0);assert.equal(r.rocks.group.visible,false);
  }
  assert.deepEqual(r.rocks.diagnostics().reason,'no-families');
  r.settle(v);
  assert.deepEqual(r.rocks.census(),before);
  r.rocks.dispose();
});

test('altitude and relief gates hide rocks without discarding canonical residents',()=>{
  const r=rig(moon),v=r.view([.1,.9,-.4]);r.settle(v);
  const resident=r.rocks.ownedBytes().residentRocks;
  r.rocks.update(r.input(r.view([.1,.9,-.4],ROCK_MAX_ALTITUDE_M+1)));
  assert.equal(r.rocks.diagnostics().reason,'altitude');assert.equal(r.rocks.group.visible,false);
  assert.equal(r.rocks.ownedBytes().residentRocks,resident);
  r.rocks.update(r.input(v,{relief:0}));
  assert.equal(r.rocks.diagnostics().reason,'relief');assert.equal(r.rocks.group.visible,false);
  assert.ok(r.rocks.group.children.every(m=>!m.visible&&m.count===0));
  r.rocks.update(r.input(v));assert.equal(r.rocks.diagnostics().reason,'ok');assert.equal(r.rocks.group.visible,true);
  r.rocks.dispose();
});

test('a drowned ocean world hosts no rocks while the gate stays open',()=>{
  const r=rig(oceanWorld,1e5);r.settle(r.view([.3,.8,.52]));
  const c=r.rocks.census();
  assert.equal(c.reason,'ok');assert.equal(c.total.count,0);assert.equal(r.rocks.diagnostics().draws,0);
  r.rocks.dispose();
});

test('origin rebasing preserves absolute rock positions',()=>{
  const r=rig(moon),target=[.6,-.3,.74];
  const absolute=()=>{const out=[];r.rocks.group.updateMatrixWorld(true);
    for(const mesh of r.rocks.group.children)for(let i=0;i<mesh.count;i++){
      const m=new THREE.Matrix4().fromArray(mesh.instanceMatrix.array,i*16);
      out.push(new THREE.Vector3().setFromMatrixPosition(m).add(r.rocks.group.position).multiplyScalar(moon.radiusM));
    }return out;};
  r.settle(r.view(target));
  const version=r.rocks.diagnostics().originVersion,before=absolute();
  // Move ~300 m: past the rebase threshold, within the outcrop and boulder ranges.
  const d=unit(target),east=unit([-d[1],d[0],0]),step=(ROCK_ORIGIN_REBASE_M+44)/moon.radiusM;
  r.settle(r.view(d.map((x,i)=>x+east[i]*step)));
  const diagnostics=r.rocks.diagnostics();
  assert.ok(diagnostics.originVersion>version);
  assert.ok(r.rocks.group.position.distanceTo(new THREE.Vector3(...d))*moon.radiusM>ROCK_ORIGIN_REBASE_M);
  const after=absolute();let matched=0;
  for(const p of after)if(before.some(q=>q.distanceToSquared(p)<1e-4))matched++;
  assert.ok(matched>50&&matched>.3*Math.min(before.length,after.length),`matched ${matched} of ${before.length}/${after.length}`);
  r.rocks.dispose();
});

test('draw work respects LOD caps, batch capacity, culling and change detection',()=>{
  const r=rig(moon),v=r.view([.3,.8,.52]);r.settle(v);
  let d=r.rocks.diagnostics();
  assert.equal(d.batches,27);assert.equal(r.attached.length,27);
  [d.drawn.lod0,d.drawn.lod1,d.drawn.lod2].forEach((n,lod)=>assert.ok(n<=ROCK_LOD_CAPS[lod]));
  assert.ok(d.drawn.total>0&&d.draws>0&&d.draws<=27);
  let triangles=0;
  for(const mesh of r.rocks.group.children){
    const lod=Number(mesh.name.slice(-1));
    assert.ok(mesh.count<=ROCK_BATCH_CAPACITY[lod]&&mesh.instanceMatrix.count===ROCK_BATCH_CAPACITY[lod]);
    assert.equal(mesh.castShadow,lod<2);
    triangles+=mesh.count*mesh.geometry.attributes.position.count/3;
    if(mesh.count)assert.equal(mesh.instanceMatrix.updateRanges[0].count,mesh.count*16);
  }
  assert.equal(d.triangles,triangles);
  // Identical view: no rebuild. Identical families (new array): no new meshes.
  const rebuilds=d.work.rebuilds;
  r.rocks.update(r.input(v,{gate:{surfaceSolid:true,families:structuredClone(r.gate.families)}}));
  assert.equal(r.rocks.diagnostics().work.rebuilds,rebuilds);assert.equal(r.attached.length,27);
  // Everything outside the camera frustum: nothing drawn.
  r.rocks.update(r.input(v,{frusta:[NONE]}));d=r.rocks.diagnostics();
  assert.equal(d.drawn.total,0);assert.ok(d.cameraCulled>0);assert.equal(d.draws,0);
  // Shadow frustum keeps only near LODs as shadow casters.
  r.rocks.update(r.input(v,{frusta:[NONE],shadowFrustum:ALL}));d=r.rocks.diagnostics();
  assert.equal(d.drawn.lod2,0);assert.equal(d.shadowOnly,d.drawn.lod0+d.drawn.lod1);
  r.rocks.dispose();
});

test('owned bytes stay within the declared worst case and budget, and diagnostics state the collision limit',()=>{
  assert.ok(ROCK_WORST_CASE_BYTES<=ROCK_BUDGET_BYTES,`worst case ${ROCK_WORST_CASE_BYTES}`);
  const r=rig(moon);r.settle(r.view([.3,.8,.52]));
  const d=r.rocks.diagnostics();
  assert.ok(d.bytes.total>0&&d.bytes.total<=ROCK_WORST_CASE_BYTES);assert.equal(d.bytes.textures,0);
  for(const [i,t] of d.tiers.entries())assert.ok(t.resident<=ROCK_TIERS[i].residentCap+t.wanted);
  assert.equal(d.collision,ROCK_COLLISION_NOTE);assert.match(d.collision,/^none/);
  r.rocks.dispose();
});

test('dispose releases every mesh, geometry and material and makes updates inert',()=>{
  const r=rig(moon),parent=new THREE.Group();parent.add(r.rocks.group);r.settle(r.view([.3,.8,.52]));
  let disposed=0;
  for(const mesh of r.rocks.group.children){mesh.geometry.addEventListener('dispose',()=>disposed++);mesh.material.addEventListener('dispose',()=>disposed++);}
  const meshes=r.rocks.group.children.length;
  r.rocks.dispose();
  assert.equal(disposed,2*meshes);assert.equal(r.rocks.group.children.length,0);assert.equal(r.rocks.group.parent,null);
  assert.equal(r.rocks.ownedBytes().total,0);
  r.rocks.update(r.input(r.view([.3,.8,.52])));
  assert.equal(r.rocks.group.children.length,0);assert.equal(r.rocks.ownedBytes().residentRocks,0);
  r.rocks.dispose();
});

test('materials reuse the shared rock PBR lease only for near LODs and own no textures',()=>{
  const family=familiesFor(moon)[0],texture=new THREE.Texture();
  const lease={ready:{value:1},rockColor:texture,rockNormal:texture};
  const program=m=>m.customProgramCacheKey();
  assert.match(program(createRockMaterial(family,0,lease)),/\/pbr$/);
  assert.match(program(createRockMaterial(family,2,lease)),/\/plain$/);
  assert.match(program(createRockMaterial(family,0,null)),/\/plain$/);
  const shader={vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>',uniforms:{}};
  createRockMaterial(family,1,lease).onBeforeCompile(shader);
  assert.equal(shader.uniforms.rockColorMap.value,texture);assert.equal(shader.uniforms.rockPbrReady,lease.ready);
  assert.match(shader.fragmentShader,/textureLod\(rockColorMap/);
});

test('renderer and app wiring gate rocks on the solid surface, not on life',()=>{
  const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
  assert.match(main,/rocks:\s*st\.stage\s*===\s*'solid'/);
  const renderer=readFileSync(new URL('../src/planet-renderer.ts',import.meta.url),'utf8');
  assert.match(renderer,/this\.rocks\.update\(\{/);assert.match(renderer,/this\.rocks\.dispose\(\)/);
  assert.match(renderer,/rocks:this\.rocks\.diagnostics\(\)/);
  // The barren moon's rock-bearing biosphere has no species at all.
  assert.equal(generateBiosphere(SEED,'airless',moon.id).species.length,0);
});
