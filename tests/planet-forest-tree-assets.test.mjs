import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createServer} from 'vite';

const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {PlanetForest}=await vite.ssrLoadModule('/src/planet-forest.ts');
const {forestTreeCatalogue}=await vite.ssrLoadModule('/src/forest-tree-catalogue.ts');
const {PlanetCanopy}=await vite.ssrLoadModule('/src/planet-canopy.ts');
const {unpackForestPresentation}=await vite.ssrLoadModule('/src/forest-presentation.ts');
const {galaxies,refByAddress,system}=await vite.ssrLoadModule('/src/catalog.ts');
const body=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];
after(()=>vite.close());

const species=(id='tree-a',family='branching')=>({id,name:id,lineageId:`lineage-${id}`,parentId:null,
  kind:'tree',family,birthMyr:0,deathMyr:null,
  traits:{heightM:16,widthRatio:.65,branchCount:8,branchAngle:.7,leafLength:.8,leafWidth:.4,leafDensity:.7,curvature:.2,legRatio:0,bodyLength:0,headRatio:0,tailLength:0,color:'#52743b',woodColor:'#62422d'},
  niche:{minTempK:0,maxTempK:1000,minMoisture:0,maxMoisture:1,maxSlope:90},diet:'producer',dispersal:'land'});

function familyHarness({reject=false,forestCoverage=true,maxRadiusM=20,presentationEnabled=true,variants=false}={}){
  const families=[],dates=[],batches=[],options=[];
  const loader=async(_a,_b,received)=>{
    options.push(received);
    if(reject)throw new Error('fixture load failure');
    const family={forestCoverage:forestCoverage&&received.forestCoverage,maxRadiusM,
      canopyPresentation:{enabled:presentationEnabled,lod1Profile:{referenceHeightM:16,maxLeafOffsetM:.5,
        bands:Array.from({length:4},(_,i)=>({centerM:[0,i*4+2,0],radiusM:2,halfHeightM:1.5,populated:true,count:4}))},
        conservativeBounds:{radiusM:maxRadiusM},barkLinearRgb:[.1,.08,.06],foliageLinearRgb:[.03,.08,.02],
        // Like the real loader, adopt the pool the library supplies for this family.
        ...(variants?{structuralVariants:received.structuralVariants,foliageProjectedAreaM2:[0,40,60,20],trunk:{heightM:14,baseRadiusM:.3,topRadiusM:.2}}:{})},
      setDate(date){dates.push(date);},
      createBatch(lod,capacity){
        const batch={lod,capacity,group:new THREE.Group(),instances:new Map(),coverage:new Map(),appearances:new Map(),count:0,initialized:0,disposed:0,
          setInstance(i,matrix,heightM,phase,variant=0){if(i>batch.count)throw new Error(`batch slot gap ${i} > ${batch.count}`);if(i===batch.initialized)batch.initialized++;batch.count=Math.max(batch.count,i+1);batch.instances.set(i,{matrix:matrix.clone(),heightM,phase,variant});},
          setAppearance(i,bark,foliage){batch.appearances.set(i,{bark:[...bark],foliage:[...foliage]});},
          setCoverage(i,coverage,seed){batch.coverage.set(i,{coverage,seed});},
          setCount(count){if(count>batch.initialized)throw new Error(`batch count ${count} exceeds initialized slots ${batch.initialized}`);batch.count=count;},dispose(){batch.disposed++;batch.group.removeFromParent();}};
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

test('a no-sidecar diagnostic family keeps both near and far game presentation on legacy fallback',async()=>{
  const {f,step,cells}=fixture({presentationEnabled:false});
  try{
    await load(f);f.fullCanopy=new PlanetCanopy(body,64);step();
    assert.deepEqual(f.diagnostics().detailedTrees.visible,[0,0]);
    assert.equal(f.fullCanopy.presentationResolve(cells[0].id,16),0);
    assert.equal(f.expectedCanopyPresentation(f.cache.get(cells[0].id)),0);
    assert.ok(f.meshes[0].visible&&f.meshes[0].count>0);
  }finally{f.dispose();}
});

test('near and distant family selection share the dated catalogue and adopted library revision',async()=>{
  const {f,h,cells,step}=fixture();
  try{
    await load(f);
    h.families[0].canopyPresentation={enabled:true,lod1Profile:{referenceHeightM:16,maxLeafOffsetM:.5,
      bands:Array.from({length:4},(_,i)=>({centerM:[0,i*4+2,0],radiusM:2,halfHeightM:1.5,populated:true,count:4}))},
      conservativeBounds:{radiusM:25},barkLinearRgb:[.1,.08,.06],foliageLinearRgb:[.03,.08,.02]};
    f.fullCanopy=new PlanetCanopy(body,64);
    const dated=[species('oak'),species('ash'),species('pine','spire')];step(dated,123n);
    const catalogue=forestTreeCatalogue(dated),key=f.fullCanopy.diagnostics().presentation.key;
    for(const cell of cells){
      const binding=catalogue.resolve(cell.id),code=f.fullCanopy.presentationResolve(cell.id,cell.heightM);
      const decoded=unpackForestPresentation(code),supported=cell.heightM<=22&&binding.recipe.family==='branching';
      assert.equal(decoded.kind,supported?'branching':null);
      if(supported){
        assert.ok(Math.abs(decoded.bark-binding.appearance.barkBrightness)<.001);
        assert.ok(Math.abs(decoded.foliage-binding.appearance.foliageBrightness)<.001);
        assert.equal(code,f.expectedCanopyPresentation(f.cache.get(cell.id)));
      }
    }
    step([...dated].reverse(),123n);assert.equal(f.fullCanopy.diagnostics().presentation.key,key,'enumeration changes preserve the shared presentation revision');
    step([],124n);assert.notEqual(f.fullCanopy.diagnostics().presentation.key,key);
    assert.equal(f.fullCanopy.presentationResolve(cells[0].id,16),0);
    step(dated,123n);assert.equal(f.fullCanopy.renderer.uniforms.treeFamilyBounds.value.x,25);
    f.clearTreeAssets();step(dated,123n);
    assert.equal(f.fullCanopy.presentationResolve(cells[0].id,16),0);
    assert.equal(f.fullCanopy.renderer.uniforms.treeFamilyBounds.value.x,0,'turning basic restores distant fallback immediately');
  }finally{f.dispose();}
});

test('dated catalogue attaches detailed branching instances while spire and unsupported heights retain legacy coverage',async()=>{
  const {f,h,cells,step}=fixture();
  try{
    assert.equal(await load(f),true);
    step([species('branch'),species('spire','spire')],123n);
    const d=f.diagnostics().detailedTrees;
    assert.deepEqual(d.visible,[1,0]);
    assert.equal(d.dateNs,'123');
    assert.equal(d.samples.length,1);
    assert.equal(d.samples[0].id,cells[0].id);
    assert.equal(d.samples[0].speciesId,'branch');
    assert.equal(h.dates.at(-1),123n);
    assert.equal(h.batches[0].count,1,'detailed batch submits only eligible residents');
    assert.equal(h.batches[0].coverage.get(0).coverage>0,true);
    assert.equal(h.batches[0].coverage.has(1),false,'unsupported residents have no detailed GPU slot');
    assert.ok(f.meshes[0].geometry.getAttribute('instanceCoverage').getX(0)===0,'detailed branch suppresses legacy draw');
    assert.ok(f.meshes[0].geometry.getAttribute('instanceCoverage').getX(1)>0,'unsupported height stays on the legacy path');
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
    await load(f);step([species()],1n);assert.equal(f.diagnostics().detailedTrees.visible[0],2);
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
    await load(f);step([species()],10n,false);assert.equal(f.diagnostics().detailedTrees.visible[0],2);
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
    const replacement={forestCoverage:true,maxRadiusM:30,setDate(){},createBatch(lod){return {lod,group:new THREE.Group(),setInstance(){},setAppearance(){},setCoverage(){},setCount(){},dispose(){}};},dispose(){}};
    resolve(replacement);assert.equal(await pending,true);
    assert.equal(f.assets.revision,2);
    assert.equal(first.disposed,1);assert.ok(firstBatches.every(b=>b.disposed===1));
    assert.equal(f.diagnostics().detailedTrees.ready,true);
    f.clearTreeAssets();assert.equal(f.assets.revision,3);
    f.clearTreeAssets();assert.equal(f.assets.revision,3,'clearing an empty library does not change presentation');
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
    assert.equal(f.diagnostics().detailedTrees.visible[0],2);
  }finally{f.dispose();}
});

test('malformed dated catalogue is ignored safely while detail family is absent',()=>{
  const {f,step}=fixture();
  try{
    const duplicate=species('duplicate');
    assert.doesNotThrow(()=>step([duplicate,{...duplicate,name:'duplicate copy'}],60n));
    assert.equal(f.diagnostics().detailedTrees.error,'');
    assert.equal(f.diagnostics().detailedTrees.species,0);
    assert.ok(f.meshes[0].geometry.getAttribute('instanceCoverage').getX(0)>0);
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
    const code=f.expectedCanopyPresentation(resident),decoded=unpackForestPresentation(code);
    assert.equal(decoded.kind,kind);assert.equal(decoded.variant,binding.appearance.variant,`${label}: far code carries the same member`);
    assert.equal(f.fullCanopy.presentationResolve(resident.cell.id,resident.cell.heightM),code,`${label}: far retag equals handoff expectation`);
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
    assert.equal(f.fullCanopy.presentationResolve(cells[0].id,16),0,'no family: far legacy fallback');
  }finally{f.dispose();}
});
test('a family without a structural pool keeps authored structure in near and far paths',async()=>{
  const {f,h,step}=fixture();
  try{
    await load(f);f.fullCanopy=new PlanetCanopy(body,64);step([species('oak')],5n);
    for(const [slot,instance] of h.batches[0].instances){
      assert.equal(instance.variant,0,`slot ${slot} keeps authored structure`);
      const resident=f.assets.entries.get('branching').pools[0].items[slot];
      assert.equal(unpackForestPresentation(f.expectedCanopyPresentation(resident)).variant,0);
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
  step([species()],2n);assert.equal(f.diagnostics().detailedTrees.visible[0],2);
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
 const localAerial={fixture:true};
 try{
  await f.loadTreeFamilies(inputs,{localAerial});
  assert.equal(received[0].foliageMipSidecar,oak);assert.equal(received[1].foliageMipSidecar,pine);
  assert.ok(received.every(x=>x.localAerial===localAerial&&x.forestCoverage===true));
 }finally{f.dispose();}
});
