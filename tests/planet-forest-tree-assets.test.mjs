import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createServer} from 'vite';

const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {PlanetForest}=await vite.ssrLoadModule('/src/planet-forest.ts');
const {forestTreeCatalogue}=await vite.ssrLoadModule('/src/forest-tree-catalogue.ts');
const {galaxies,refByAddress,system}=await vite.ssrLoadModule('/src/catalog.ts');
const body=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];
after(()=>vite.close());

const species=(id='tree-a',family='branching')=>({id,name:id,lineageId:`lineage-${id}`,parentId:null,
  kind:'tree',family,birthMyr:0,deathMyr:null,
  traits:{heightM:16,widthRatio:.65,branchCount:8,branchAngle:.7,leafLength:.8,leafWidth:.4,leafDensity:.7,curvature:.2,legRatio:0,bodyLength:0,headRatio:0,tailLength:0,color:'#52743b',woodColor:'#62422d'},
  niche:{minTempK:0,maxTempK:1000,minMoisture:0,maxMoisture:1,maxSlope:90},diet:'producer',dispersal:'land'});

function familyHarness({reject=false,forestCoverage=true,maxRadiusM=20}={}){
  const families=[],dates=[],batches=[];
  const loader=async(_a,_b,options)=>{
    if(reject)throw new Error('fixture load failure');
    const family={forestCoverage:forestCoverage&&options.forestCoverage,maxRadiusM,
      setDate(date){dates.push(date);},
      createBatch(lod,capacity){
        const batch={lod,capacity,group:new THREE.Group(),instances:new Map(),coverage:new Map(),appearances:new Map(),count:0,initialized:0,disposed:0,
          setInstance(i,matrix,heightM,phase){if(i>batch.initialized)throw new Error(`batch slot gap ${i} > ${batch.initialized}`);if(i===batch.initialized)batch.initialized++;batch.instances.set(i,{matrix:matrix.clone(),heightM,phase});},
          setAppearance(i,bark,foliage){batch.appearances.set(i,{bark:[...bark],foliage:[...foliage]});},
          setCoverage(i,coverage,seed){batch.coverage.set(i,{coverage,seed});},
          setCount(count){if(count>batch.initialized)throw new Error(`batch count ${count} exceeds initialized slots ${batch.initialized}`);batch.count=count;},dispose(){batch.disposed++;batch.group.removeFromParent();}};
        batches.push(batch);return batch;
      },dispose(){family.disposed=(family.disposed||0)+1;}};
    families.push(family);return family;
  };
  return {loader,families,dates,batches};
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
    assert.equal(h.batches[0].count,3,'detailed batch retains stable slots for eligible, spire, and unsupported residents');
    assert.equal(h.batches[0].coverage.get(0).coverage>0,true);
    assert.equal(h.batches[0].coverage.get(1).coverage,0,'height 23m is placeholder geometry and cannot draw detailed coverage');
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
    await load(f);const first=h.families[0],firstBatches=h.batches.slice();
    let resolve;const loader=async()=>new Promise(r=>{resolve=r;});f.treeLoader=loader;
    const pending=load(f);assert.equal(first.disposed,undefined,'old family remains live while replacement loads');
    const replacement={forestCoverage:true,maxRadiusM:30,setDate(){},createBatch(lod){return {lod,group:new THREE.Group(),setInstance(){},setAppearance(){},setCoverage(){},setCount(){},dispose(){}};},dispose(){}};
    resolve(replacement);assert.equal(await pending,true);
    assert.equal(first.disposed,1);assert.ok(firstBatches.every(b=>b.disposed===1));
    assert.equal(f.diagnostics().detailedTrees.ready,true);
  }finally{f.dispose();}
});

test('attaching after legacy slots exist initializes in order before reorder and interior removal',async()=>{
  const {f,h,step,cells}=fixture();
  try{
    step([],40n);assert.equal(f.meshes[0].count,3,'seed retained legacy residents before asset attach');
    await load(f);
    f.wanted.reverse();f.wanted.splice(1,1);
    step([species()],41n);
    const batch=h.batches[0];
    assert.equal(batch.initialized,3,'all extant slots were initialized in sequential order before compaction');
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
