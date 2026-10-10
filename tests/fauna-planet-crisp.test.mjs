import test from 'node:test';
import assert from 'node:assert/strict';
import {FaunaPlanetCrispBatch} from '../src/fauna-planet-crisp-batch.ts';
import {generateCreatureGenome,realisticIndividualCreatureGenome} from '../src/creature-model.ts';
import {buildQuadrupedBody} from '../src/fauna-body-plan.ts';
import {buildFaunaBodyLodChain} from '../src/fauna-body-lod.ts';
import * as THREE from 'three';
import {buildFaunaPlanetCrispData,createFaunaPlanetCrispGeometry,createFaunaPlanetCrispMaterial,FAUNA_PLANET_CRISP_GLSL} from '../src/fauna-planet-crisp.ts';
function fixture(){
  const source={plan:{version:'test'},positions:new Float32Array([0,0,0,1,0,0,0,1,0,2,0,0]),normals:new Float32Array([0,1,0,0,1,0,0,1,0,0,1,0]),colors:new Uint8Array(12).fill(128),skinIndex:new Uint8Array(16),skinWeight:new Uint8Array(16),index:new Uint16Array([0,1,2]),vertexCount:4,triangleCount:1,bodyVertexCount:3};
  const coat={pattern:'spots',seed:15,scale:.5,threshold:.1,warp:.2,bellyLine:.3},oracle={version:'quadruped-body-pattern-sampler-1',source,sampleInto(x,y,z,ny,layers,context){layers.set([.2,.3,.4,.4,.5,.6,.4,.5,.6]);Object.assign(context,{x,y,z,dorsal:ny,footprint:.04,along:0,region:'torso'});return {coat,region:'torso',mask:.5,patch:0,affineError:0};}};
  return {source,oracle};
}
test('indexed crisp geometry leaves source/topology intact and budgets exactly52 extra bytes pervertex percopy',()=>{
  const {source,oracle}=fixture(),before=source.positions.slice(),data=buildFaunaPlanetCrispData(source,source,oracle),geometry=createFaunaPlanetCrispGeometry(data);assert.deepEqual(source.positions,before);assert.equal(geometry.index.array,source.index);assert.equal(geometry.getAttribute('position').array,source.positions);assert.equal(geometry.getAttribute('skinIndex').array,source.skinIndex);
  assert.equal(data.resources.extraCpuBytes,4*52);assert.equal(data.resources.extraGpuBytes,4*52);assert.equal(data.diagnostics.eligible,3);assert.ok(data.diagnostics.maxPackedPointError<1e-7);
  for(const layer of [data.c0,data.c1,data.c2])for(let c=0;c<3;c++)assert.equal(layer[9+c],Math.fround(128/255));geometry.dispose();
});
test('nonlinear/unsupported/limb fallbacks preserve original colours and keep prepared coordinates',()=>{
  const {source,oracle}=fixture(),nonlinear=buildFaunaPlanetCrispData(source,source,{...oracle,sampleInto(...args){const result=oracle.sampleInto(...args);return {...result,affineError:.05};}});assert.equal(nonlinear.diagnostics.nonlinear,3);assert.equal(nonlinear.descriptor,undefined);assert.equal(nonlinear.sample[4],1);
  for(const layer of [nonlinear.c0,nonlinear.c1,nonlinear.c2])assert.ok(layer.every(v=>v===Math.fround(128/255)));
  const limb=buildFaunaPlanetCrispData(source,source,{...oracle,sampleInto(...args){const r=oracle.sampleInto(...args);return {...r,coat:{...r.coat,pattern:'stripes'},region:'limb-upper'};}});assert.equal(limb.diagnostics.limbFallback,3);
});
test('material shares existing mask with canonical footprintfloor and original opaque BRDF',()=>{
  const {source,oracle}=fixture(),data=buildFaunaPlanetCrispData(source,source,oracle),material=createFaunaPlanetCrispMaterial(data),shader={uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>'};material.onBeforeCompile(shader);
  assert.equal(material.roughness,.86);assert.equal(material.metalness,0);assert.equal(material.transparent,false);assert.equal(shader.uniforms.coatCanonicalFootprint.value,.04);assert.equal(shader.uniforms.coatCells.value,data.descriptor.cells);assert.match(shader.fragmentShader,/COAT_PATTERN 1/);assert.match(FAUNA_PLANET_CRISP_GLSL,/max\(coatCanonicalFootprint/);material.dispose();
});

test('pooled indexedappearance respects128compositebudget, cacheidentity and actor-slot reuse with no perframegeometry upload',()=>{
 const defaultBatch=new FaunaPlanetCrispBatch();assert.ok(defaultBatch.estimatedBufferBytes<=16*1024*1024);assert.equal(defaultBatch.diagnostics().basisAtlasCpuBytes,128*500*52);defaultBatch.dispose();
 assert.throws(()=>new FaunaPlanetCrispBatch({maxGeometryEntries:128}),/composite typed budget/);
 const source=buildQuadrupedBody(realisticIndividualCreatureGenome(generateCreatureGenome('CRISP-BATCH','browser'),'body',1,'adult','ungulate')),lod=buildFaunaBodyLodChain(source,{targets:[500]}).levels[0],testOracle=fixture().oracle;
 const data=buildFaunaPlanetCrispData(source,lod,{...testOracle,source}),batch=new FaunaPlanetCrispBatch({capacity:2,maxVerticesPerAnimal:400,maxGeometryEntries:2});
 try{
  assert.equal(batch.registerGeometry('source/500/crisp',data),true);assert.equal(batch.prepareAnimal('a','source/500/crisp'),true);assert.equal(batch.prepareAnimal('b','source/500/crisp'),true);assert.equal(batch.prepareAnimal('c','source/500/crisp'),false);
  const shader={uniforms:{},vertexShader:'#include <common>\nvoid main() {\n#include <beginnormal_vertex>\n#include <begin_vertex>\n}',fragmentShader:'#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <clipping_planes_fragment>'};batch.mesh.material.onBeforeCompile(shader);
  assert.match(shader.fragmentShader,/planetBatchedCoat/);assert.match(shader.vertexShader,/uint\(pc0.x\)/);assert.match(shader.vertexShader,/skinned\+=b0/);assert.ok(shader.uniforms.faunaBones);assert.ok(shader.uniforms.planetCoatParams);assert.equal(shader.uniforms.planetCoatParams.value.image.data[7],1);assert.equal(shader.uniforms.planetCoatParams.value.image.data[15],1);
  const original=data.c0[0];data.c0[0]=original+.01;assert.equal(batch.registerGeometry('source/500/crisp',data),false);data.c0[0]=original;
  const palette=new Float32Array(22*16);for(let b=0;b<22;b++)for(const k of [0,5,10,15])palette[b*16+k]=1;
  const uploads=batch.diagnostics().geometryUploads;batch.beginFrame(new THREE.Vector3());assert.equal(batch.submit('a',new THREE.Matrix4(),palette),true);batch.endFrame();assert.equal(batch.diagnostics().geometryUploads,uploads);
  batch.releaseAnimal('a');assert.equal(batch.prepareAnimal('c','source/500/crisp'),true);assert.equal(batch.releaseGeometry('source/500/crisp'),false);batch.releaseAnimal('b');batch.releaseAnimal('c');assert.equal(batch.releaseGeometry('source/500/crisp'),true);
 }finally{batch.dispose();}
});

test('atlas-owned appearance prepares128 unique definitions without retained source/basis copies, then migrates exact live owners',()=>{
 const template=buildQuadrupedBody(realisticIndividualCreatureGenome(generateCreatureGenome('CRISP-OWNERSHIP','browser'),'owner',1,'adult','ungulate')),lod=buildFaunaBodyLodChain(template,{targets:[500]}).levels[0],mock=fixture().oracle,batch=new FaunaPlanetCrispBatch({cacheMode:'atlas-owned'});
 const datasets=[];
 try{
  for(let i=0;i<128;i++){
   // Distinct valid genotype definitions + distinct real indexed layout bytes;
   // this admission test is not a128-body generation/GPUperformance fixture.
   const plan={...template.plan,genome:{...template.plan.genome,color:`#${(0x334400+i).toString(16)}`}},source={...template,plan},positions=lod.positions.slice();positions[0]+=i*.0001;const geometry={...lod,plan,positions},data=buildFaunaPlanetCrispData(source,geometry,{...mock,source});datasets.push(data);
   assert.equal(batch.registerGeometry(`unique/${i}`,data),true);assert.equal(batch.prepareAnimal(`member/${i}`,`unique/${i}`),true);assert.equal(batch.diagnostics().basisCacheBytes,0);assert.equal(batch.diagnostics().cacheBytes,0);
  }
  assert.equal(batch.diagnostics().geometryEntries,128);assert.ok(batch.estimatedBufferBytes<16*1024*1024);assert.equal(batch.diagnostics().pendingAppearanceGeometry,false);
  batch.releaseAnimal('member/127');assert.equal(batch.registerGeometry('unique/0',datasets[0]),true);assert.equal(batch.prepareAnimal('alias','unique/0'),true);batch.releaseAnimal('member/0');assert.equal(batch.registerGeometry('unique/0',datasets[0]),true);
  const changed={...datasets[0],c1:datasets[0].c1.slice()};changed.c1[0]+=.02;assert.equal(batch.registerGeometry('unique/0',changed),false);
  batch.releaseAnimal('alias');assert.equal(batch.geometryFor('unique/0'),null);
  assert.equal(batch.registerGeometry('pending',datasets[0]),true);assert.equal(batch.registerGeometry('blocked',datasets[1]),false);assert.equal(batch.releaseGeometry('pending'),true);assert.equal(batch.diagnostics().pendingAppearanceGeometry,false);
 }finally{batch.dispose();}
});
