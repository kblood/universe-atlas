import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createServer} from 'vite';
import {forestTreeDimensions,TREE_ALLOMETRY_VERSION,TREE_ALLOMETRY_IDENTITY_CODE} from '#tree-kit/v1/presentation';
import {unpackForestPresentation} from '#tree-kit/v1/instances';
import {forestMeshBufferFootprint} from '#tree-kit/v1/metrics';

const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {PlanetForest}=await vite.ssrLoadModule('/src/planet-forest.ts');
const {forestTreeCatalogue}=await vite.ssrLoadModule('/src/forest-tree-catalogue.ts');
const {PlanetCanopy}=await vite.ssrLoadModule('/src/planet-canopy.ts');
const {galaxies,refByAddress,system}=await vite.ssrLoadModule('/src/catalog.ts');
const body=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];
after(()=>vite.close());

const species=(id='tree-a',family='branching',heightM=16)=>({id,name:id,lineageId:`lineage-${id}`,parentId:null,
  kind:'tree',family,birthMyr:0,deathMyr:null,
  traits:{heightM,widthRatio:.65,branchCount:8,branchAngle:.7,leafLength:.8,leafWidth:.4,leafDensity:.7,curvature:.2,legRatio:0,bodyLength:0,headRatio:0,tailLength:0,color:'#52743b',woodColor:'#62422d'},
  niche:{minTempK:0,maxTempK:1000,minMoisture:0,maxMoisture:1,maxSlope:90},diet:'producer',dispersal:'land'});

// Oak-like reference measurements; tests/tree-allometry.test.mjs measures the packaged GLBs.
const ALLOMETRY=Object.freeze({version:TREE_ALLOMETRY_VERSION,referenceHeightM:16,crownRadiusM:4.25,cardExtentM:1.3,trunkRadiusM:.31,
  skeletonRadiusM:5.34,skeletonHeightM:14.72,maxLeafOffsetM:1.3,variantScale:1.14,variantLeanFraction:.045,cardScaleMax:2.7});
function familyHarness({reject=false,forestCoverage=true,maxRadiusM=20,presentationEnabled=true,variants=false}={}){
  const families=[],dates=[],batches=[],options=[];
  const loader=async(_a,_b,received)=>{
    options.push(received);
    if(reject)throw new Error('fixture load failure');
    const family={forestCoverage:forestCoverage&&received.forestCoverage,maxRadiusM,
      canopyPresentation:{enabled:presentationEnabled,lod1Profile:{referenceHeightM:16,maxLeafOffsetM:.5,
        bands:Array.from({length:4},(_,i)=>({centerM:[0,i*4+2,0],radiusM:2,halfHeightM:1.5,populated:true,count:4}))},
        conservativeBounds:{radiusM:maxRadiusM},barkLinearRgb:[.1,.08,.06],foliageLinearRgb:[.03,.08,.02],allometry:ALLOMETRY,
        // Like the real loader, adopt the pool the library supplies for this family.
        ...(variants?{structuralVariants:received.structuralVariants,foliageProjectedAreaM2:[0,40,60,20],trunk:{heightM:14,baseRadiusM:.3,topRadiusM:.2}}:{})},
      setDate(date){dates.push(date);},
      createBatch(lod,capacity){
        const batch={lod,capacity,group:new THREE.Group(),instances:new Map(),coverage:new Map(),appearances:new Map(),count:0,cameraCount:0,initialized:0,disposed:0,swaps:0,
          setInstance(i,matrix,heightM,phase,variant=0,allometry={crownRatio:1,trunkRatio:1}){if(i>batch.count)throw new Error(`batch slot gap ${i} > ${batch.count}`);if(i===batch.initialized)batch.initialized++;batch.count=Math.max(batch.count,i+1);batch.instances.set(i,{matrix:matrix.clone(),heightM,phase,variant,allometry:{...allometry}});},
          setAppearance(i,bark,foliage){batch.appearances.set(i,{bark:[...bark],foliage:[...foliage]});},
          setCoverage(i,coverage,seed){batch.coverage.set(i,{coverage,seed});},
          setCount(count){if(count>batch.initialized)throw new Error(`batch count ${count} exceeds initialized slots ${batch.initialized}`);batch.count=count;batch.cameraCount=count;},
          setCameraCount(count){batch.cameraCount=count;},setViewCameras(){},passCounts(){return {camera:batch.cameraCount,shadow:batch.count};},
          swapInstances(a,b){for(const rows of [batch.instances,batch.coverage,batch.appearances]){const value=rows.get(a);rows.set(a,rows.get(b));rows.set(b,value);}batch.swaps++;},
          dispose(){batch.disposed++;batch.group.removeFromParent();}};
        batches.push(batch);return batch;
      },dispose(){family.disposed=(family.disposed||0)+1;}};
    families.push(family);return family;
  };
  return {loader,families,dates,batches,options};
}
function fixture(opts={}){
  const h=familyHarness(opts),f=new PlanetForest(body,h.loader),eye=new THREE.Vector3(0,0,1+20/body.radiusM);
  f.water=0;f.center.set(0,0,1);
  const cells=[
    {id:'canonical/a',direction:[0,0,1],roll:.31,heightM:16,yaw:.2,distanceM:0},
    {id:'canonical/b',direction:[0,0,1],roll:.61,heightM:23,yaw:1.1,distanceM:0},
    {id:'canonical/c',direction:[0,0,1],roll:.81,heightM:15,yaw:2.4,distanceM:0},
  ];
  f.wanted.push(...cells);
  for(const cell of cells)f.cache.set(cell.id,{cell,height:0,present:true,water:0});
  const step=(speciesList=[species()],date=123n,immersive=false)=>f.update(eye,[0,0,1],20,true,0,immersive,[],date,speciesList);
  return {f,h,eye,cells,step};
}
const load=async(f)=>f.loadTreeAssets(new ArrayBuffer(8),new ArrayBuffer(8));

test('detailed trees partition camera demand while preserving union identities, rows and shadow-only coverage',async()=>{
  const {f,h,eye,cells,step}=fixture({variants:true});
  for(let i=0;i<cells.length;i++){const angle=(i*20+5)/body.radiusM;cells[i].direction=[Math.sin(angle),0,Math.cos(angle)];}
  try{
    await load(f);step();
    const entry=f.assets.entries.get('branching'),pool=entry.pools[0],batch=h.batches[0];
    const row=i=>({instance:batch.instances.get(i),appearance:batch.appearances.get(i),coverage:batch.coverage.get(i)});
    const expected=new Map(pool.items.map((r,i)=>[r.cell.id,structuredClone(row(i))]));
    const wantedIds=pool.items.map(r=>r.cell.id).sort();
    const shadow={intersectsSphere:()=>true},none={intersectsSphere:()=>false};
    const update=frustum=>f.update(eye,[0,0,1],20,true,0,false,[frustum],123n,[species()],shadow);
    for(const select of [x=>x>25/body.radiusM,x=>x<25/body.radiusM,()=>false,()=>true]){
      const view={intersectsSphere:sphere=>select(sphere.center.x)};update(view);
      assert.deepEqual(pool.items.map(r=>r.cell.id).sort(),wantedIds);
      assert.equal(batch.count,3);assert.equal(batch.cameraCount,pool.items.filter(r=>select(r.bx)).length);assert.equal(batch.group.visible,true);
      pool.items.forEach((r,i)=>{assert.equal(r.detailSlots[0],i);assert.equal(select(r.bx),i<batch.cameraCount);assert.deepEqual(structuredClone(row(i)),expected.get(r.cell.id));});
      const swaps=batch.swaps;update(view);assert.equal(batch.swaps,swaps,'unchanged camera produces no row swaps');
      assert.equal(f.presentationCensus().families[0].lods[0].shadowSubmitted,3);
      assert.equal(f.presentationCensus().families[0].lods[0].submitted,batch.cameraCount);
    }
    f.update(eye,[0,0,1],20,true,0,false,[none],123n,[species()],none);
    assert.equal(batch.count,0);assert.equal(batch.group.visible,false);
    step();assert.equal(batch.count,3);assert.equal(batch.cameraCount,3,'empty demand can regrow all initialized rows');
  }finally{f.dispose();}
});

test('a no-sidecar diagnostic family keeps both near and far game presentation on legacy fallback',async()=>{
  const {f,step,cells}=fixture({presentationEnabled:false});
  try{
    await load(f);f.fullCanopy=new PlanetCanopy(body,64);step();
    assert.deepEqual(f.diagnostics().detailedTrees.visible,[0,0]);
    assert.equal(f.fullCanopy.presentationResolve(cells[0].id,16).code,0);
    assert.deepEqual(f.fullCanopy.presentationResolve(cells[0].id,16),f.expectedCanopyPresentation(f.cache.get(cells[0].id)),'far and near agree on legacy dimensions');
    assert.deepEqual(f.diagnostics().detailedTrees.allometry.near.reasons,{'family-not-presented':3});
    assert.ok(f.meshes[0].visible&&f.meshes[0].count>0);
  }finally{f.dispose();}
});

test('near and distant family selection share the dated catalogue and adopted library revision',async()=>{
  const {f,h,cells,step}=fixture();
  try{
    await load(f);
    h.families[0].canopyPresentation={enabled:true,lod1Profile:{referenceHeightM:16,maxLeafOffsetM:.5,
      bands:Array.from({length:4},(_,i)=>({centerM:[0,i*4+2,0],radiusM:2,halfHeightM:1.5,populated:true,count:4}))},
      conservativeBounds:{radiusM:25},barkLinearRgb:[.1,.08,.06],foliageLinearRgb:[.03,.08,.02],allometry:ALLOMETRY};
    f.fullCanopy=new PlanetCanopy(body,64);
    const dated=[species('oak'),species('ash'),species('pine','spire')];step(dated,123n);
    const catalogue=forestTreeCatalogue(dated),key=f.fullCanopy.diagnostics().presentation.key;
    for(const cell of cells){
      // Canonical 23 m on cell b does not gate: the dated species decides.
      const binding=catalogue.resolve(cell.id),far=f.fullCanopy.presentationResolve(cell.id,cell.heightM);
      const decoded=unpackForestPresentation(far.code),supported=binding.recipe.family==='branching';
      assert.equal(decoded.kind,supported?'branching':null);
      assert.deepEqual(far,f.expectedCanopyPresentation(f.cache.get(cell.id)),'far retag equals the near handoff expectation');
      if(supported){
        assert.ok(Math.abs(decoded.bark-binding.appearance.barkBrightness)<.001);
        assert.ok(Math.abs(decoded.foliage-binding.appearance.foliageBrightness)<.001);
      }
    }
    step([...dated].reverse(),123n);assert.equal(f.fullCanopy.diagnostics().presentation.key,key,'enumeration changes preserve the shared presentation revision');
    step([],124n);assert.notEqual(f.fullCanopy.diagnostics().presentation.key,key);
    assert.deepEqual(f.fullCanopy.presentationResolve(cells[0].id,16),{code:0,heightM:16,ratioCode:TREE_ALLOMETRY_IDENTITY_CODE},'unbound trees keep the canonical proxy with identity proportions');
    step(dated,123n);assert.equal(f.fullCanopy.renderer.uniforms.treeFamilyBounds.value.x,25);
    f.clearTreeAssets();step(dated,123n);
    assert.equal(f.fullCanopy.presentationResolve(cells[0].id,16).code,0);
    assert.equal(f.fullCanopy.renderer.uniforms.treeFamilyBounds.value.x,0,'turning basic restores distant fallback immediately');
  }finally{f.dispose();}
});

test('dated catalogue attaches detailed branching instances while below-envelope and unloaded-family species retain legacy coverage',async()=>{
  const {f,h,cells,step}=fixture();
  try{
    assert.equal(await load(f),true);
    // Cell a binds the 16 m species; b and c bind the 3 m species (below the 4 m family envelope).
    step([species('branch'),species('short','branching',3)],123n);
    const d=f.diagnostics().detailedTrees;
    assert.deepEqual(d.visible,[1,0]);
    assert.deepEqual(d.allometry.near.reasons,{'height-below-family-envelope':2});
    assert.deepEqual(d.allometry.near.representation,{family:1,legacy:2});
    const short=f.dimensions(f.cache.get(cells[1].id));
    assert.equal(short.representation,'legacy');assert.ok(short.heightM>2.5&&short.heightM<3.5,'legacy draw uses the species height, not the 23 m canonical proxy');
    const legacyScale=new THREE.Vector3();new THREE.Matrix4().fromArray(f.meshes[0].instanceMatrix.array,16).decompose(new THREE.Vector3(),new THREE.Quaternion(),legacyScale);
    assert.ok(Math.abs(legacyScale.x*body.radiusM-short.heightM)<1e-3,'legacy matrix carries the rendered height');
    assert.equal(f.meshes[0].geometry.getAttribute('instanceTreeAllometry').getX(1),short.ratioCode-TREE_ALLOMETRY_IDENTITY_CODE);
    assert.equal(d.dateNs,'123');
    assert.equal(d.samples.length,1);
    assert.equal(d.samples[0].id,cells[0].id);
    assert.equal(d.samples[0].speciesId,'branch');
    assert.equal(h.dates.at(-1),123n);
    assert.equal(h.batches[0].count,1,'detailed batch submits only eligible residents');
    assert.equal(h.batches[0].coverage.get(0).coverage>0,true);
    assert.equal(h.batches[0].coverage.has(1),false,'unsupported residents have no detailed GPU slot');
    assert.ok(f.meshes[0].geometry.getAttribute('instanceCoverage').getX(0)===0,'detailed branch suppresses legacy draw');
    assert.ok(f.meshes[0].geometry.getAttribute('instanceCoverage').getX(1)>0,'below-envelope species stays on the legacy path');
    // Only branching is loaded: a spire-bound resident records the missing family.
    step([species('branch'),species('spire','spire')],124n);
    assert.deepEqual(f.diagnostics().detailedTrees.allometry.near.reasons,{'family-not-presented':1});
    assert.deepEqual(f.diagnostics().detailedTrees.visible,[2,0]);
  }finally{f.dispose();}
});

test('reordering retained canonical cells and rebasing preserves species, phase, and appearance',async()=>{
  const {f,h,eye,cells,step}=fixture();
  try{
    await load(f);const trees=[species('oak'),species('ash')];step(trees,7000000001n);
    const stableAppearance=items=>new Map(items.map(({batch,...sample})=>[sample.id,sample]));
    const before=stableAppearance(f.diagnostics().detailedTrees.samples);
    const slotBefore=new Map(h.batches[0].instances);
    f.wanted.reverse();step([...trees].reverse(),7000000001n);
    assert.deepEqual(stableAppearance(f.diagnostics().detailedTrees.samples),before,
      'binding/appearance derive from canonical cell id, not source enumeration or wanted order');
    assert.deepEqual([...h.batches[0].instances].map(([i,v])=>[i,v.heightM,v.phase]),[...slotBefore].map(([i,v])=>[i,v.heightM,v.phase]));
    eye.x=300/body.radiusM;step([...trees].reverse(),7000000001n);
    assert.equal(f.diagnostics().originRebased,true);
    assert.ok(h.batches[0].instances.size>=2);
    assert.equal(h.dates.at(-1),7000000001n);
    step(trees,0n);assert.equal(h.dates.at(-1),0n,'wind/date is updated from the exact world timestamp');
    assert.deepEqual(stableAppearance(f.diagnostics().detailedTrees.samples),before,'dated wind changes do not change identity appearance');
  }finally{f.dispose();}
});

test('empty or non-tree dated catalogue clears detail draw and restores legacy coverage',async()=>{
  const {f,step}=fixture();
  try{
    await load(f);step([species()],1n);assert.equal(f.diagnostics().detailedTrees.visible[0],3);
    step([],2n);assert.deepEqual(f.diagnostics().detailedTrees.visible,[0,0]);
    assert.ok(f.meshes[0].geometry.getAttribute('instanceCoverage').getX(0)>0);
    step([{...species('grass'),kind:'grass',family:'blade'}],3n);
    assert.deepEqual(f.diagnostics().detailedTrees.visible,[0,0]);
    assert.ok(f.meshes[0].geometry.getAttribute('instanceCoverage').getX(0)>0);
  }finally{f.dispose();}
});

test('immersive mode hides detailed batches and restores legacy representation',async()=>{
  const {f,h,step}=fixture();
  try{
    await load(f);step([species()],10n,false);assert.equal(f.diagnostics().detailedTrees.visible[0],3);
    step([species()],10n,true);assert.deepEqual(f.diagnostics().detailedTrees.visible,[0,0]);
    assert.ok(h.batches[0].group.visible===false);
    assert.ok(f.meshes[0].geometry.getAttribute('instanceCoverage').getX(0)>0);
  }finally{f.dispose();}
});

test('clear during a pending load disposes stale family without attaching it',async()=>{
  let resolve;const h=familyHarness();h.loader=()=>new Promise(r=>{resolve=r;});
  const f=new PlanetForest(body,h.loader);
  try{
    const pending=load(f);f.clearTreeAssets();
    const family={forestCoverage:true,maxRadiusM:10,setDate(){},createBatch(){throw new Error('stale family must not create batches');},dispose(){family.disposed=(family.disposed||0)+1;}};
    resolve(family);assert.equal(await pending,false);
    assert.equal(f.diagnostics().detailedTrees.ready,false);assert.equal(family.disposed,1);
  }finally{f.dispose();}
});

test('dispose during pending load disposes late family and rejects later loads',async()=>{
  let resolve;const h=familyHarness();h.loader=()=>new Promise(r=>{resolve=r;});
  const f=new PlanetForest(body,h.loader),pending=load(f);f.dispose();
  const family={forestCoverage:true,maxRadiusM:10,setDate(){},createBatch(){throw new Error('disposed forest must not create batches');},dispose(){family.disposed=(family.disposed||0)+1;}};
  resolve(family);assert.equal(await pending,false);assert.equal(family.disposed,1);
  await assert.rejects(load(f),/disposed/);
});

test('loader failure is diagnostic and preserves legacy rendering; invalid family is disposed',async()=>{
  const {f,step}=fixture({reject:true});
  try{
    await assert.rejects(load(f),/fixture load failure/);step([species()],7n);
    assert.match(f.diagnostics().detailedTrees.error,/fixture load failure/);
    assert.equal(f.diagnostics().detailedTrees.ready,false);
    assert.ok(f.meshes[0].geometry.getAttribute('instanceCoverage').getX(0)>0);
  }finally{f.dispose();}
  const bad=fixture({forestCoverage:false});
  try{
    await assert.rejects(load(bad.f),/lacks forest coverage/);
    assert.equal(bad.h.families[0].disposed,1);
    assert.equal(bad.f.diagnostics().detailedTrees.ready,false);
  }finally{bad.f.dispose();}
});

test('successful replacement disposes previous batches/family only after replacement is ready',async()=>{
  const {f,h}=fixture();
  try{
    assert.equal(f.assets.revision,0);
    await load(f);const first=h.families[0],firstBatches=h.batches.slice();assert.equal(f.assets.revision,1);
    let resolve;const loader=async()=>new Promise(r=>{resolve=r;});f.treeLoader=loader;
    const pending=load(f);assert.equal(first.disposed,undefined,'old family remains live while replacement loads');assert.equal(f.assets.revision,1);
    const observations=[];
    const replacement={forestCoverage:true,maxRadiusM:30,setDate(){},createBatch(lod){
      observations.push({pending:f.assets.pendingEntries.size,diagnostic:f.diagnostics().memoryAccounting.pendingFamilyReplacements});
      return {lod,group:new THREE.Group(),setInstance(){},setAppearance(){},setCoverage(){},setCount(){},dispose(){}};
    },dispose(){}};
    resolve(replacement);assert.equal(await pending,true);
    assert.deepEqual(observations,[{pending:1,diagnostic:1},{pending:1,diagnostic:1}],
      'both bounded LOD batches remain visible to memory accounting until atomic adoption');
    assert.equal(f.assets.revision,2);
    assert.equal(first.disposed,1);assert.ok(firstBatches.every(b=>b.disposed===1));
    assert.equal(f.diagnostics().detailedTrees.ready,true);
    assert.equal(f.diagnostics().memoryAccounting.pendingFamilyReplacements,0,'adopted family is no longer counted as staging');
    f.clearTreeAssets();assert.equal(f.assets.revision,3);
    f.clearTreeAssets();assert.equal(f.assets.revision,3,'clearing an empty library does not change presentation');
  }finally{f.dispose();}
});

test('resource accounting includes pending family ownership and releases replaced resources once',async()=>{
  const {f}=fixture(),makeFamily=(onBatch=()=>{})=>{
    const lods=[0,1].map(()=>Array.from({length:2},()=>{
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(9),3));return {geometry};
    }));
    const texture={image:{width:4,height:4},mipmaps:[],generateMipmaps:false,minFilter:THREE.LinearFilter,
      format:THREE.RGBAFormat,type:THREE.UnsignedByteType};
    return {forestCoverage:true,maxRadiusM:10,lods,textures:new Set([texture]),embeddedTextureBytes:13,
      setDate(){},createBatch(lod,capacity){onBatch();const meshes=lods[lod].map(source=>({geometry:source.geometry.clone(),
        instanceMatrix:new THREE.InstancedBufferAttribute(new Float32Array(capacity*16),16),
        instanceColor:new THREE.InstancedBufferAttribute(new Float32Array(capacity*3),3)}));
        return {group:new THREE.Group(),meshes,setInstance(){},setAppearance(){},setCoverage(){},setCount(){},dispose(){for(const mesh of meshes)mesh.geometry.dispose();}};
      },dispose(){for(const lod of lods)for(const mesh of lod)mesh.geometry.dispose();}};
  };
  try{
    f.treeLoader=async()=>makeFamily();await load(f);
    const adopted=f.diagnostics().memoryAccounting;
    assert.ok(adopted.familyBufferCpuBytes>0);assert.equal(adopted.familyTextureCount,1);
    assert.equal(adopted.familyGpuTextureEstimateBytes,64);assert.equal(adopted.embeddedImageFileBytes,13);
    const observations=[];let resolve;
    f.treeLoader=()=>new Promise(r=>{resolve=()=>r(makeFamily(()=>observations.push(f.diagnostics().memoryAccounting)));});
    const pending=load(f);resolve();assert.equal(await pending,true);
    assert.equal(observations.length,2);
    assert.ok(observations.every(value=>value.pendingFamilyReplacements===1),'staging family remains owned while both LOD batches are created');
    assert.ok(observations.every(value=>value.familyBufferCpuBytes>adopted.familyBufferCpuBytes),'old and staged families are both counted during replacement');
    const replaced=f.diagnostics().memoryAccounting;
    assert.equal(replaced.pendingFamilyReplacements,0);assert.equal(replaced.familyBufferCpuBytes,adopted.familyBufferCpuBytes);
    const beforeAtlas=f.diagnostics().allocatedBytes;
    f.farAtlases.set('branching',{diagnostics:()=>({bytes:1000,scratchBytes:100,captureBatchCpuBytes:50,
      captureBatchGpuEstimateBytes:60,buildScratchPeakGpuBytes:300})});
    const withAtlas=f.diagnostics();
    assert.equal(withAtlas.memoryAccounting.farAtlasResidentGpuBytes,1000);
    assert.equal(withAtlas.memoryAccounting.farAtlasScratchGpuBytes,100);
    assert.equal(withAtlas.memoryAccounting.farAtlasCaptureBufferCpuBytes,50);
    assert.equal(withAtlas.allocatedBytes-beforeAtlas,1210,'current total includes resident, scratch and capture buffers once');
    assert.equal(withAtlas.memoryAccounting.estimatedPeakGpuBytes-withAtlas.memoryAccounting.estimatedGpuBytes,140,
      'peak reports the complete transient atlas allocation, not just the current incomplete slice');
    f.farAtlases.delete('branching');assert.equal(f.diagnostics().allocatedBytes,beforeAtlas,'released atlas resources leave the estimate');
    f.clearTreeAssets();
    const cleared=f.diagnostics().memoryAccounting;
    assert.equal(cleared.familyBufferCpuBytes,0);assert.equal(cleared.familyTextureCount,0);
  }finally{f.dispose();}
});

test('resource accounting includes canopy host arrays and canonical far-instance buffers',()=>{
  const {f}=fixture(),canopy=new PlanetCanopy(body,64);f.fullCanopy=canopy;
  try{
    const memory=f.diagnostics().memoryAccounting,canopyBytes=canopy.memoryUsage();
    // Body positions, ground heights, canonical census heights, presentation versions.
    assert.equal(memory.canopyHostPersistentCpuBytes,64*3*8+64*8+64*4+64*4+canopy.renderer.memorySidecarBytes());
    // One Float32 ratio code per legacy slot (near 192, mid 4096, canopy 8192); far ratios reuse an existing float.
    assert.deepEqual(f.diagnostics().detailedTrees.allometry.channelBytes,{legacyRatios:(192+4096+8192)*4,detailedTreeParameters:{},farPacked:0,canopyCanonicalHeights:64*4});
    assert.equal(memory.canopyCurrentScratchCpuBytes,0);
    assert.equal(memory.legacyBufferCpuBytes,forestMeshBufferFootprint([...f.meshes,f.canopy,canopy.renderer.mesh]).totalBytes,
      'far instance attributes are in the same shared-buffer accounting pass');
    assert.deepEqual(memory.allocationCaps.legacyInstanceSlots,[192,4096,8192]);
    assert.equal(canopyBytes.hostScratchPeakCpuBytes,64*3*4);
  }finally{f.dispose();}
});

test('attaching after legacy slots exist initializes only selected detailed slots without gaps',async()=>{
  const {f,h,step,cells}=fixture();
  try{
    step([],40n);assert.equal(f.meshes[0].count,3,'seed retained legacy residents before asset attach');
    await load(f);
    f.wanted.reverse();f.wanted.splice(1,1);
    step([species()],41n);
    const batch=h.batches[0];
    assert.equal(batch.initialized,2,'only the two selected supported slots are initialized');
    assert.equal(batch.count,2);
    assert.deepEqual(f.updates[0].residents.map(r=>r.cell.id),[cells[0].id,cells[2].id]);
    assert.equal(f.diagnostics().detailedTrees.visible[0],2);
  }finally{f.dispose();}
});

test('dated tree catalogue is order independent, filters non-trees, and tracks trait changes',()=>{
  const oak=species('oak'),ash=species('ash'),grass={...species('grass'),kind:'grass',family:'blade'};
  const a=forestTreeCatalogue([oak,grass,ash]),b=forestTreeCatalogue([ash,{...grass,id:'grass-2'},oak]);
  assert.equal(a.signature,b.signature);
  for(const id of ['canonical/a','canonical/b','canonical/c'])assert.deepEqual(a.resolve(id),b.resolve(id));
  const empty=forestTreeCatalogue([]);assert.equal(empty.count,0);assert.equal(empty.resolve('canonical/a'),null);
  assert.throws(()=>forestTreeCatalogue([oak,{...oak,name:'duplicate'}]),/Duplicate dated tree species/);
  const changed={...oak,traits:{...oak.traits,heightM:oak.traits.heightM+1}};
  assert.notEqual(forestTreeCatalogue([changed,ash]).signature,a.signature,'dated recipe traits invalidate the catalogue snapshot');
});

test('partial batch creation failure disposes already-created batches and family',async()=>{
  const {f}=fixture();let firstBatchDisposed=0,familyDisposed=0;
  f.treeLoader=async()=>({forestCoverage:true,maxRadiusM:12,setDate(){},
    createBatch(lod){if(lod===1)throw new Error('second batch construction failed');return {group:new THREE.Group(),dispose(){firstBatchDisposed++;}};},
    dispose(){familyDisposed++;}});
  try{
    await assert.rejects(load(f),/second batch construction failed/);
    assert.equal(firstBatchDisposed,1);assert.equal(familyDisposed,1);
    assert.equal(f.diagnostics().detailedTrees.ready,false);
  }finally{f.dispose();}
});

test('malformed dated catalogue reports error, preserves legacy draw, and recovers on a valid snapshot',async()=>{
  const {f,step}=fixture();
  try{
    await load(f);step([species('valid')],50n);
    const duplicate=species('duplicate');
    assert.doesNotThrow(()=>step([duplicate,{...duplicate,name:'duplicate copy'}],51n));
    assert.match(f.diagnostics().detailedTrees.error,/Duplicate dated tree species/);
    assert.deepEqual(f.diagnostics().detailedTrees.visible,[0,0]);
    assert.ok(f.meshes[0].geometry.getAttribute('instanceCoverage').getX(0)>0,'legacy trees remain visible on invalid catalogue input');
    step([species('recovered')],52n);
    assert.equal(f.diagnostics().detailedTrees.error,'');
    assert.equal(f.diagnostics().detailedTrees.visible[0],3);
  }finally{f.dispose();}
});

test('malformed dated catalogue is reported safely while detail family is absent and legacy keeps canonical proxy',()=>{
  const {f,step,cells}=fixture();
  try{
    const duplicate=species('duplicate');
    assert.doesNotThrow(()=>step([duplicate,{...duplicate,name:'duplicate copy'}],60n));
    assert.match(f.diagnostics().detailedTrees.error,/Duplicate dated tree species/);
    assert.equal(f.diagnostics().detailedTrees.species,0);
    assert.deepEqual(f.diagnostics().detailedTrees.allometry.near.reasons,{'no-dated-species':3});
    assert.ok(f.meshes[0].geometry.getAttribute('instanceCoverage').getX(0)>0);
    const drawn=()=>Array.from({length:f.meshes[0].count},(_,i)=>{const scale=new THREE.Vector3();
      new THREE.Matrix4().fromArray(f.meshes[0].instanceMatrix.array,i*16).decompose(new THREE.Vector3(),new THREE.Quaternion(),scale);
      return Math.round(scale.x*body.radiusM*1e3)/1e3;}).sort((a,b)=>a-b);
    assert.deepEqual(drawn(),cells.map(c=>c.heightM).sort((a,b)=>a-b),'unbound trees keep the canonical proxy height');
    // Without any family, a valid dated catalogue still sizes the legacy forest by species.
    step([species('valid',undefined,12)],61n);
    const species12=cells.map(c=>Math.round(f.dimensions(f.cache.get(c.id)).heightM*1e3)/1e3).sort((a,b)=>a-b);
    assert.ok(species12.every(h=>h>11&&h<13));assert.deepEqual(drawn(),species12);
    assert.deepEqual(f.diagnostics().detailedTrees.allometry.near.reasons,{'family-not-presented':3});
  }finally{f.dispose();}
});

test('overlapping family loads are newest-wins and dispose the stale result exactly once',async()=>{
  const {f}=fixture(),pending=[];
  f.treeLoader=()=>new Promise(resolve=>pending.push(resolve));
  try{
    const firstLoad=load(f),secondLoad=load(f);assert.equal(pending.length,2);
    let staleCreates=0,staleDisposes=0;
    pending[0]({forestCoverage:true,maxRadiusM:10,setDate(){},createBatch(){staleCreates++;throw new Error('stale family must not create batches');},dispose(){staleDisposes++;}});
    assert.equal(await firstLoad,false);assert.equal(staleCreates,0);assert.equal(staleDisposes,1);
    const current={forestCoverage:true,maxRadiusM:10,setDate(){},createBatch(lod){return {lod,group:new THREE.Group(),setInstance(){},setAppearance(){},setCoverage(){},setCount(){},dispose(){}};},dispose(){}};
    pending[1](current);assert.equal(await secondLoad,true);
    assert.equal(f.diagnostics().detailedTrees.ready,true);
    assert.equal(f.diagnostics().detailedTrees.loading,false);
    assert.equal(f.diagnostics().detailedTrees.error,'');
  }finally{f.dispose();}
});

const bothFamilies=()=>['branching','spire'].map(kind=>({kind,lod0:new ArrayBuffer(8),lod1:new ArrayBuffer(8)}));

/** Every detailed slot and its far code carry the resident's dated canonical variant. */
function assertVariantAgreement(f,label){
  let checked=0;
  for(const [kind,entry] of f.assets.entries)for(const [lod,pool] of entry.pools.entries())pool.items.forEach((resident,slot)=>{
    const binding=f.binding(resident),instance=entry.batches[lod].instances.get(slot);
    assert.equal(binding.recipe.family,kind);
    assert.equal(instance.variant,binding.appearance.variant+1,`${label}: near slot ${slot} uses its resident's pool member`);
    const expected=f.expectedCanopyPresentation(resident),decoded=unpackForestPresentation(expected.code);
    assert.equal(decoded.kind,kind);assert.equal(decoded.variant,binding.appearance.variant,`${label}: far code carries the same member`);
    assert.deepEqual(f.fullCanopy.presentationResolve(resident.cell.id,resident.cell.heightM),expected,`${label}: far retag equals handoff expectation`);
    // Exact near parameters equal the far height/ratio channel.
    const d=forestTreeDimensions(binding,resident.cell.heightM,f.presentedFamilies);
    assert.equal(instance.heightM,d.heightM);assert.equal(expected.heightM,d.heightM);assert.equal(expected.ratioCode,d.ratioCode);
    assert.deepEqual(instance.allometry,{crownRatio:d.crownRatio,trunkRatio:d.trunkRatio},`${label}: near ratios`);
    checked++;
  });
  return checked;
}
test('near slots and far codes share one canonical structural variant across dates, catalogues and slot reuse',async()=>{
  const {f,h,cells,step}=fixture({variants:true});cells[1].heightM=16;
  try{
    await f.loadTreeFamilies(bothFamilies());f.fullCanopy=new PlanetCanopy(body,64);
    assert.deepEqual(h.options.map(o=>o.structuralVariants.map(v=>v.kind)[0]),['branching','spire'],'library supplies each family its own pool');
    assert.ok(h.options.every(o=>o.structuralVariants.length===8&&o.areaPreservingLod===true&&o.silhouetteMatchedLod===true&&o.cardCompensation.maxScale>1));
    const dated=[species('oak'),species('pine','spire')];step(dated,200n);
    assert.equal(assertVariantAgreement(f,'initial'),3);
    const d=f.diagnostics().detailedTrees;
    assert.equal(d.structuralVariantVersion,'forest-structural-variant-1');
    assert.ok(d.samples.every(s=>s.structuralVariant===s.variant),'diagnostic sample reports the applied member');
    assert.equal(d.families.reduce((n,x)=>n+Object.values(x.variantHistogram).reduce((a,b)=>a+b,0),0),3);
    const before=new Map(d.samples.map(s=>[s.id,s.structuralVariant]));
    // Date replay: same catalogue and date reproduce identical members.
    step(dated,201n);step(dated,200n);
    assert.deepEqual(new Map(f.diagnostics().detailedTrees.samples.map(s=>[s.id,s.structuralVariant])),before);
    // A new dated catalogue rebinds species; members follow the new binding.
    const renamed=[species('oak-b'),species('pine-b','spire'),species('ash-b')];step(renamed,300n);
    assertVariantAgreement(f,'catalogue change');
    const after=new Map(f.diagnostics().detailedTrees.samples.map(s=>[s.id,s.structuralVariant]));
    assert.ok([...after].some(([id,v])=>before.get(id)!==v),'fixture covers a member change');
    // Slot reuse: removing one resident moves the tail into its slot with the tail's member.
    f.wanted.splice(0,1);step(renamed,300n);
    assert.equal(assertVariantAgreement(f,'slot reuse'),2);
    // Family unload: far falls back to the legacy code immediately.
    f.clearTreeAssets();step(renamed,300n);
    assert.equal(f.fullCanopy.presentationResolve(cells[0].id,16).code,0,'no family: far legacy fallback');
  }finally{f.dispose();}
});
test('a family without a structural pool keeps authored structure in near and far paths',async()=>{
  const {f,h,step}=fixture();
  try{
    await load(f);f.fullCanopy=new PlanetCanopy(body,64);step([species('oak')],5n);
    for(const [slot,instance] of h.batches[0].instances){
      assert.equal(instance.variant,0,`slot ${slot} keeps authored structure`);
      const resident=f.assets.entries.get('branching').pools[0].items[slot];
      assert.equal(unpackForestPresentation(f.expectedCanopyPresentation(resident).code).variant,0);
    }
  }finally{f.dispose();}
});
test('branching and spire use separate compact pools and suppress all supported legacy draws',async()=>{
 const {f,h,step,cells}=fixture();cells[1].heightM=16;
 try{
  await f.loadTreeFamilies(bothFamilies());step([species('branch'),species('spire','spire')],100n);
  const d=f.diagnostics().detailedTrees;
  assert.equal(d.families.length,2);assert.equal(d.visible[0],3);
  assert.equal(h.batches.reduce((n,b)=>n+b.count,0),3,'aggregate submissions equal selected supported trees');
  assert.ok(d.families.every(x=>x.submitted[0]>0),'fixture covers both families');
  assert.equal(f.meshes[0].visible,false,'no legacy vertex submission when both families cover every slot');
  assert.equal(new Set(d.samples.map(x=>x.id)).size,3);assert.equal(h.dates.at(-1),100n);
  const before=new Map(d.samples.map(x=>[x.id,x]));f.wanted.reverse();step([species('spire','spire'),species('branch')],100n);
  for(const sample of f.diagnostics().detailedTrees.samples)assert.deepEqual(sample,before.get(sample.id));
 }finally{f.dispose();}
 assert.ok(h.families.every(x=>x.disposed===1));assert.ok(h.batches.every(x=>x.disposed===1));
});
test('family reassignment and empty demand regrow initialized compact slots without gaps',async()=>{
 const {f,h,step,cells}=fixture();cells[1].heightM=16;
 try{
  await f.loadTreeFamilies(bothFamilies());step([species('all-branch')],1n);
  assert.deepEqual(h.batches.map(x=>x.count),[3,0,0,0]);
  step([species('all-spire','spire')],2n);assert.deepEqual(h.batches.map(x=>x.count),[0,0,3,0]);
  step([],3n);assert.ok(h.batches.every(x=>x.count===0));
  step([species('all-branch')],4n);assert.deepEqual(h.batches.map(x=>x.count),[3,0,0,0]);
  assert.equal(f.meshes[0].visible,false);
 }finally{f.dispose();}
});
test('failure in second family preserves active library and disposes partial replacement',async()=>{
 const {f,h,step}=fixture();
 try{
  await load(f);step([species()],1n);const old=h.families[0],original=f.treeLoader;let calls=0;
  f.treeLoader=async(...args)=>{if(++calls===2)throw new Error('pine load failed');return original(...args);};
  await assert.rejects(f.loadTreeFamilies(bothFamilies()),/pine load failed/);
  assert.equal(f.assets.revision,1,'failed replacement preserves the adopted presentation revision');
  assert.equal(old.disposed,undefined);assert.equal(h.families[1].disposed,1);
  assert.ok(h.batches.slice(2).every(x=>x.disposed===1));
  step([species()],2n);assert.equal(f.diagnostics().detailedTrees.visible[0],3);
  assert.equal(f.diagnostics().detailedTrees.families.length,1);
 }finally{f.dispose();}
});
test('duplicate family requests are rejected without replacing or cancelling active state',async()=>{
 const {f,h}=fixture();
 try{
  await load(f);const first=bothFamilies()[0];
  await assert.rejects(f.loadTreeFamilies([first,first]),/unique/);
  assert.equal(h.families.length,1);assert.equal(h.families[0].disposed,undefined);
  assert.equal(f.diagnostics().detailedTrees.ready,true);
 }finally{f.dispose();}
});
test('cancelling between family parses releases all staged assets and keeps latest request authoritative',async()=>{
 const {f,h}=fixture();let resolve;const original=f.treeLoader;let calls=0;
 f.treeLoader=(...args)=>++calls===2?new Promise(r=>{resolve=r;}):original(...args);
 try{
  const pending=f.loadTreeFamilies(bothFamilies());
  while(!resolve)await new Promise(r=>setImmediate(r));
  f.clearTreeAssets();let disposed=0,creates=0;
  resolve({dispose(){disposed++;},createBatch(){creates++;}});
  assert.equal(await pending,false);assert.equal(disposed,1);assert.equal(creates,0);
  assert.equal(h.families[0].disposed,1);assert.ok(h.batches.every(x=>x.disposed===1));
  assert.equal(f.diagnostics().detailedTrees.ready,false);
 }finally{f.dispose();}
});

test('each family receives its own offline mip sidecar while sharing atmosphere options',async()=>{
 const {f}=fixture(),original=f.treeLoader,received=[];
 f.treeLoader=(a,b,options)=>{received.push(options);return original(a,b,options);};
 const inputs=bothFamilies(),oak={manifest:{family:'oak'},data:new ArrayBuffer(4)},pine={manifest:{family:'pine'},data:new ArrayBuffer(8)};
 inputs[0].foliageMipSidecar=oak;inputs[1].foliageMipSidecar=pine;
 const attachLocalAerial=()=>{};
 try{
  await f.loadTreeFamilies(inputs,{attachLocalAerial});
  assert.equal(received[0].foliageMipSidecar,oak);assert.equal(received[1].foliageMipSidecar,pine);
  assert.ok(received.every(x=>x.attachLocalAerial===attachLocalAerial&&x.forestCoverage===true));
 }finally{f.dispose();}
});

test('the far canopy bakes each adopted family atlas outside XR, adopts it, and drops it with its family',async()=>{
 const {f,step}=fixture({variants:true}),original=f.treeLoader,captures=[];
 let failBake=false;
 f.treeLoader=async(a,b,options)=>{
  const family=await original(a,b,options),geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,0,16,0,2,9,1],3));
  geometry.setAttribute('_leaf_pivot',new THREE.Float32BufferAttribute([0,0,0,0,16,0,1.8,9,.8],3));
  geometry.setAttribute('_branch_level',new THREE.Float32BufferAttribute([0,0,4],1));
  Object.assign(family,{lods:[[],[{geometry},{geometry}]],lod1CardScale:1.3,createCaptureBatch(lod,count){
   const batch={lod,count,group:new THREE.Group(),pass:{value:0},frame:{value:new THREE.Vector2()},disposed:0,
    setMember(){if(failBake)throw new Error('capture failed');},dispose(){batch.disposed++;}};captures.push(batch);return batch;}});
  return family;
 };
 let target=null;
 const renderer={xr:{enabled:false},shadowMap:{autoUpdate:false},autoClear:true,renders:0,getRenderTarget:()=>target,getActiveCubeFace:()=>0,getActiveMipmapLevel:()=>0,
  getClearColor:c=>c.set(0),getClearAlpha:()=>1,setClearColor(){},setRenderTarget(t){target=t;},clear(){},render(){renderer.renders++;}};
 try{
  await f.loadTreeFamilies(bothFamilies());f.fullCanopy=new PlanetCanopy(body,64);step();
  let far=f.diagnostics().detailedTrees;
  assert.equal(far.farRepresentation,'analytic-band-fallback','bands draw until a bake completes');
  f.renderFarAtlases(renderer,true);
  assert.equal(renderer.renders,0,'no offscreen bake during XR');
  assert.equal(captures.length,2,'one capture batch per adopted family');assert.ok(captures.every(c=>c.lod===1));
  for(let frame=0;frame<27;frame++)f.renderFarAtlases(renderer);
  far=f.diagnostics().detailedTrees;
  assert.equal(far.farRepresentation,'partial-atlas-with-band-fallback','families bake one after another');
  assert.deepEqual(far.farAtlas.adopted,['branching']);
  for(let frame=0;frame<27;frame++)f.renderFarAtlases(renderer);
  far=f.diagnostics().detailedTrees;
  assert.equal(far.farRepresentation,'captured-hemi-octahedral-atlas');assert.equal(far.farAtlas.error,'');
  assert.deepEqual(far.farAtlas.families.map(x=>[x.kind,x.state,x.views,x.scratchBytes]),[['branching','ready',81,0],['spire','ready',81,0]]);
  assert.ok(captures.every(c=>c.disposed===1),'capture batches are temporary');
  const rendersAfterBake=renderer.renders;f.renderFarAtlases(renderer);assert.equal(renderer.renders,rendersAfterBake,'a ready atlas costs no further renders');
  // Replacing the families releases their atlases before their geometry; the
  // new families draw bands until rebaked, and a failed bake stays on bands.
  failBake=true;await f.loadTreeFamilies(bothFamilies());step();
  assert.equal(f.fullCanopy.renderer.familyAtlas('branching'),null);
  f.renderFarAtlases(renderer);
  far=f.diagnostics().detailedTrees;
  assert.equal(far.farRepresentation,'analytic-band-fallback');assert.match(far.farAtlas.error,/branching: .*capture failed/);
  assert.equal(far.farAtlas.families.find(x=>x.kind==='branching').state,'failed');
 }finally{f.dispose();}
 assert.ok(captures.every(c=>c.disposed===1));
});
test('whole-population presentation census covers every retained slot and replays exactly after a catalogue change',async()=>{
 const {f,step,cells}=fixture();cells[1].heightM=16;
 for(let i=0;i<21;i++){const cell={id:`canonical/extra-${i}`,direction:[0,0,1],roll:i/21,heightM:10+i%12,yaw:i*.3,distanceM:0};f.wanted.push(cell);f.cache.set(cell.id,{cell,height:0,present:true,water:0});}
 const dated=[species('branch'),species('spire','spire')];
 try{
  await f.loadTreeFamilies(bothFamilies());step(dated,100n);
  const census=f.presentationCensus(),samples=f.diagnostics().detailedTrees.samples;
  assert.equal(census.selected,24);assert.equal(census.eligible,24);
  const owned=census.families.reduce((n,x)=>n+x.lods.reduce((a,l)=>a+l.owned,0),0);
  assert.equal(owned,24,'census counts every retained detailed slot');assert.ok(samples.length<owned,'the HUD sample is bounded, the census is not');
  assert.ok(census.families.every(x=>x.lods.every(l=>l.unbound===0&&l.submitted===l.owned)));
  assert.equal(census.families.reduce((n,x)=>n+Object.values(x.lods[0].variantHistogram).reduce((a,b)=>a+b,0),0),24);
  const digests=c=>c.families.map(x=>[x.kind,x.lods.map(l=>l.digest)]);
  f.wanted.reverse();step([...dated].reverse(),100n);
  assert.deepEqual(digests(f.presentationCensus()),digests(census),'order independent');
  step([species('other'),species('spire','spire')],200n);
  assert.notDeepEqual(digests(f.presentationCensus()),digests(census),'a changed dated catalogue changes the recorded presentation');
  step(dated,100n);
  const replay=f.presentationCensus();
  assert.deepEqual(digests(replay),digests(census),'same ids, species, recipes, heights, variants, wind and tint reappear');
  assert.deepEqual({...replay,catalogueVersion:0},{...census,catalogueVersion:0});
 }finally{f.dispose();}
});
