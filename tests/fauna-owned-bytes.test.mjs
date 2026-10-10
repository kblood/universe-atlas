import test from 'node:test';
import assert from 'node:assert/strict';
import {createQuadrupedPlan,generateCreatureGenome} from '#creature-kit/planet';
import {buildFaunaPlanetCrispData} from '../src/fauna-planet-crisp.ts';
import {packFaunaPlanetCrispData} from '../src/fauna-planet-crisp-packed.ts';
import {FaunaPlanetCrispBatch} from '../src/fauna-planet-crisp-batch.ts';

const plan=createQuadrupedPlan(generateCreatureGenome('OWNERSHIP-COUNTERS','browser'));
const source={plan,positions:new Float32Array([0,0,0,1,0,0,0,1,0]),normals:new Float32Array([0,1,0,0,1,0,0,1,0]),colors:new Uint8Array(9).fill(128),skinIndex:new Uint8Array(12),skinWeight:new Uint8Array([255,0,0,0,255,0,0,0,255,0,0,0]),index:new Uint16Array([0,1,2]),vertexCount:3,triangleCount:1,bodyVertexCount:3};
const oracle={version:'quadruped-body-pattern-sampler-raw-1',source,sampleInto(x,y,z,ny,layers,context){layers.set([.2,.3,.4,.4,.5,.6,.4,.5,.6]);Object.assign(context,{x,y,z,dorsal:ny,footprint:.04,along:0,region:'torso'});return {coat:{pattern:'spots',seed:15,scale:.5,threshold:.1,warp:.2,bellyLine:.3},region:'torso',mask:.5,patch:0,affineError:0,rawLayers:true};}};
const raw=buildFaunaPlanetCrispData(source,source,oracle);
test('scalar ownership exactly matches diagnostic accounting through admission, release and palette ring modes',()=>{
  for(const basisStorage of ['float32','packed-snorm16'])for(const cacheMode of ['retain-source','atlas-owned'])for(const paletteRingSize of [1,2,3]){
    const batch=new FaunaPlanetCrispBatch({capacity:2,maxVerticesPerAnimal:3,maxIndicesPerAnimal:3,maxGeometryEntries:3,basisStorage,cacheMode,paletteRingSize});
    const report=batch.diagnostics.bind(batch);
    const check=()=>{const d=report(),expected=2*d.geometryBytes+d.paletteRetainedCpuBytes+d.paletteGpuEstimateBytes+d.cacheBytes+d.basisCacheBytes+d.appearanceMetaCpuBytes*2+2*7;
      assert.equal(batch.ownedBytes,expected);assert.equal(batch.preparedCount,d.prepared);};
    try{check();assert.equal(batch.registerGeometry('body',basisStorage==='float32'?raw:packFaunaPlanetCrispData(raw)),true);check();
      assert.equal(batch.prepareAnimal('individual','body'),true);check();batch.releaseAnimal('individual');check();assert.equal(batch.releaseGeometry('body'),cacheMode==='retain-source');check();
      batch.diagnostics=()=>{throw new Error('scalar access must not build a report');};assert.ok(batch.ownedBytes>0);assert.equal(batch.preparedCount,0);
    }finally{batch.dispose();}
  }
});
