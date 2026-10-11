import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {forestModule,createForestScene,forestDigest,gitSource} from './forest-frame-fixture.mjs';
const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {PlanetForest}=await vite.ssrLoadModule('/src/planet-forest.ts');
const {galaxies,refByAddress,system}=await vite.ssrLoadModule('/src/catalog.ts');
const {forestBodyEligible}=await vite.ssrLoadModule('/src/surface-biomes.ts');
const body=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];
after(()=>vite.close());

test('physically ineligible production forest owns no draw buffers/canopy/workers across dates, disposal and revisit',async()=>{
  const previous=globalThis.Worker;let workers=0,loads=0;
  globalThis.Worker=class{constructor(){workers++;throw new Error('ineligible body must not create a worker');}};
  try{
    for(const patch of [{water:0},{temperatureK:249},{temperatureK:326},{type:'Volcanic world'}])for(let visit=0;visit<2;visit++){
      const source={...body,...patch};assert.equal(forestBodyEligible(source),false);
      const forest=new PlanetForest(source,async()=>{loads++;throw new Error('must not load');},{skipIneligibleResources:true});
      try{
        assert.deepEqual(forest.group.children,[],'no placeholder meshes');
        for(const date of [-1n,0n,9_000_000_000_000_000n]){
          forest.update({x:0,y:0,z:1},[0,0,1],20,true,0,false,[],date,[]);
          const d=forest.diagnostics();assert.equal(d.resourceState,'body-ineligible');assert.equal(d.allocatedBytes,0);
          assert.equal(d.memoryAccounting.retainedCpuBytes,0);assert.equal(d.memoryAccounting.estimatedGpuBytes,0);assert.equal(d.fullCanopy,null);assert.equal(d.selectionWorker,false);assert.equal(d.visible,0);assert.equal(d.candidateCells,0);
          for(const tier of ['forestNear','forestMiddle','forestFar'])assert.deepEqual(forest.profilingObjects(tier),[]);
          assert.equal(forest.backlog().forestFarTrees,0);forest.setDebug({hideColour:true});forest.setDebug({hideColour:false});
        }
        assert.equal(await forest.loadTreeAssets(new ArrayBuffer(0),new ArrayBuffer(0)),false);
        assert.throws(()=>forest.update({},[0,0,1],20,false,NaN,false),/finite/);
      }finally{forest.dispose();forest.dispose();}
      await assert.rejects(forest.loadTreeAssets(new ArrayBuffer(0),new ArrayBuffer(0)),/disposed/);
    }
    assert.equal(workers,0);assert.equal(loads,0);
  }finally{globalThis.Worker=previous;}
});

test('standalone fixtures retain eager legacy allocations unless production gate is requested',()=>{
  const forest=new PlanetForest({...body,water:0});try{assert.equal(forest.group.children.length,3);assert.ok(forest.diagnostics().allocatedBytes>1_000_000);}finally{forest.dispose();}
});

test('eligible dated enable, near/far movement and replay preserve historical forest instance/population digests',async()=>{
  assert.equal(forestBodyEligible(body),true);
  const poses=[{clearanceM:20},{clearanceM:350,bearingDeg:80},{clearanceM:900,eastM:80},{clearanceM:20},{clearanceM:20}];
  async function collect(production){
    const sources=production?{}:{'src/planet-forest.ts':gitSource('ca3a92b','src/planet-forest.ts')};
    const {module:m,cleanup}=await forestModule({prefix:'forest-allocation-parity-',sources});
    const active=production?{...m,PlanetForest:class extends m.PlanetForest{constructor(body,loader){super(body,loader,{skipIneligibleResources:true});}}}:m;
    const scene=await createForestScene(active,{censusRangeM:700});
    try{
      const f=scene.frame(poses[0]);scene.forest.update(f.eye,f.groundDirection,f.altitudeM,false,f.water,false,f.frusta,f.date,[],f.shadow);
      assert.equal(scene.forest.group.visible,false);assert.ok(scene.forest.diagnostics().allocatedBytes>20_000_000,'eligible resources remain ready for dated enable');
      await scene.settle(poses[0],160);const digests=[];
      for(const pose of poses){await scene.step(pose);digests.push(forestDigest(scene.forest,scene.batches,{canonicalDetailed:true}));}
      assert.ok(scene.forest.diagnostics().visible>0,'actual eligible scene draws trees');return digests;
    }finally{scene.dispose();await cleanup();}
  }
  assert.deepEqual(await collect(true),await collect(false));
});
