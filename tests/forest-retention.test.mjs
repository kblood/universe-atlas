import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {PlanetForest}=await vite.ssrLoadModule('/src/planet-forest.ts');
const {packForestSelection}=await vite.ssrLoadModule('/src/forest-selection-transfer.ts');
const {galaxies,refByAddress,system}=await vite.ssrLoadModule('/src/catalog.ts');
const body=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];
after(()=>vite.close());
function fixture(){
  const f=new PlanetForest(body),eye=new THREE.Vector3(0,0,1+20/body.radiusM);
  f.water=0;f.center.set(0,0,1);
  for(let i=0;i<6;i++){
    const cell={id:'fixture/'+i,direction:new THREE.Vector3((i+1)*8/body.radiusM,0,1).normalize().toArray(),roll:.3,heightM:15,yaw:.3,distanceM:(i+1)*8};
    f.wanted.push(cell);f.cache.set(cell.id,{cell,height:0,present:true,water:0});
  }
  const step=(frusta=[])=>f.update(eye,[0,0,1],20,true,0,false,frusta);
  const upload=()=>{for(const m of [...f.meshes,f.canopy])for(const a of [m.instanceMatrix,m.instanceColor,m.geometry.getAttribute('instanceCoverage')])a.clearUpdateRanges();};
  return {f,eye,step,upload};
}
test('stationary and reordered demand preserve instance slots without matrix or colour writes',()=>{
  const {f,step,upload}=fixture();try{
    step();assert.equal(f.diagnostics().matrixWrites,6);upload();
    const slots=[...f.updates[0].slots];step();
    assert.equal(f.diagnostics().matrixWrites,0);assert.equal(f.diagnostics().colorWrites,0);assert.equal(f.diagnostics().scheduledUploadBytes,0);
    f.wanted.reverse();step();assert.deepEqual([...f.updates[0].slots],slots);assert.equal(f.diagnostics().matrixWrites,0);
  }finally{f.dispose();}
});
test('frustum departure swap-removes one slot instead of rewriting the batch tail',()=>{
  const {f,step,upload}=fixture();try{
    step();upload();step([{intersectsSphere:s=>s.center.x>12/body.radiusM}]);
    assert.equal(f.visibleTrees,5);assert.equal(f.diagnostics().matrixWrites,1);assert.equal(f.diagnostics().colorWrites,1);
    upload();step();assert.equal(f.visibleTrees,6);assert.equal(f.diagnostics().matrixWrites,1);
    assert.equal(new Set(f.updates[0].residents.map(r=>r.cell.id)).size,6);
  }finally{f.dispose();}
});
test('retained origin rebases without changing canonical root placement',()=>{
  const {f,step,eye,upload}=fixture();try{
    step();upload();const origin=f.group.position.clone();eye.x=100/body.radiusM;step();assert.deepEqual(f.group.position.toArray(),origin.toArray());
    eye.x=270/body.radiusM;step();assert.equal(f.diagnostics().originRebased,true);
    for(let batch=0;batch<3;batch++){
      const mesh=batch===2?f.canopy:f.meshes[batch];
      for(let slot=0;slot<mesh.count;slot++){
        const m=new THREE.Matrix4();mesh.getMatrixAt(slot,m);const root=new THREE.Vector3().setFromMatrixPosition(m).add(f.group.position);
        assert.ok(root.distanceTo(new THREE.Vector3(...f.updates[batch].residents[slot].cell.direction))*body.radiusM<.001);
      }
    }
  }finally{f.dispose();}
});
test('water changes do not enqueue additional water-independent selection jobs',()=>{
  const f=new PlanetForest(body);let jobs=0;
  f.worker={postMessage(){jobs++;},terminate(){}};
  try{
    const eye=new THREE.Vector3(0,0,1.00001);
    for(let water=0;water<12;water++)f.update(eye,[0,0,1],50,true,water,false);
    assert.equal(jobs,1);assert.equal(f.diagnostics().selectionJobsInFlight,1);
  }finally{f.dispose();}
});
test('dirty uploads keep separated edits separate and preallocate instance colours',()=>{
  const {f,step,upload}=fixture();try{
    for(const m of [...f.meshes,f.canopy])assert.equal(m.instanceColor.usage,THREE.DynamicDrawUsage);
    step();upload();
    for(const id of ['fixture/0','fixture/5']){const old=f.cache.get(id);f.cache.set(id,{...old,height:.1});}
    step();assert.equal(f.diagnostics().matrixWrites,2);
    assert.equal(f.meshes[0].instanceMatrix.updateRanges.length,2);
    assert.equal(f.meshes[0].instanceMatrix.updateRanges.reduce((n,r)=>n+r.count,0),32);
  }finally{f.dispose();}
});

test('owned instance attributes clear consumed upload ranges before the next sparse edit',()=>{
  const {f,eye,step}=fixture();
  const moveCellToDistance=(cell,distance)=>{
    const angle=distance/body.radiusM;cell.direction=[Math.sin(angle),0,Math.cos(angle)];cell.distanceM=distance;
  };
  try{
    // Exercise the near, far, and canopy instance batches in one update.
    for(let i=0;i<6;i++)moveCellToDistance(f.wanted[i],i<2?8+i*8:i<5?120+(i-2)*40:600);
    f.wanted[5].canopyRepresentative=true;
    step();
    const owned=[];
    for(const [batch,mesh] of [...f.meshes,f.canopy].entries()){
      const attrs=[
        ['matrix',mesh.instanceMatrix],
        ['color',mesh.instanceColor],
        ['coverage',mesh.geometry.getAttribute('instanceCoverage')],
        ['seed',mesh.geometry.getAttribute('instanceForestSeed')],
      ];
      assert.ok(mesh.count>0,`batch ${batch} has an initialized instance`);
      for(const [name,attribute] of attrs){
        assert.ok(attribute.updateRanges.length>0,`batch ${batch} ${name} has pending initial data`);
        assert.equal(typeof attribute.onUploadCallback,'function',`batch ${batch} ${name} has an upload callback`);
        owned.push({batch,name,attribute});
      }
    }

    // CPU-only simulation of Three's onUpload callback after initial bufferData.
    for(const {batch,name,attribute} of owned){
      const version=attribute.version;
      attribute.onUploadCallback();
      assert.deepEqual(attribute.updateRanges,[],`initial upload clears batch ${batch} ${name}`);
      assert.equal(attribute.version,version,`callback bookkeeping does not schedule a new upload for ${name}`);
    }

    const old=f.cache.get('fixture/0');f.cache.set('fixture/0',{...old,height:old.height+.1});
    step();
    const nearSlot=f.updates[0].slots.get('fixture/0'),rangesFor=(mesh,name)=>{
      const attribute=name==='matrix'?mesh.instanceMatrix:name==='color'?mesh.instanceColor:mesh.geometry.getAttribute(name==='coverage'?'instanceCoverage':'instanceForestSeed');
      return attribute.updateRanges.map(range=>({...range}));
    };
    const near=f.meshes[0];
    assert.deepEqual(rangesFor(near,'matrix'),[{start:nearSlot*16,count:16}]);
    assert.deepEqual(rangesFor(near,'color'),[{start:nearSlot*3,count:3}]);
    assert.deepEqual(rangesFor(near,'seed'),[{start:nearSlot,count:1}]);
    assert.deepEqual(rangesFor(near,'coverage'),[],'unchanged coverage does not get re-uploaded');
    for(const mesh of [f.meshes[1],f.canopy])for(const name of ['matrix','color','coverage','seed'])
      assert.deepEqual(rangesFor(mesh,name),[],`untouched ${name} batch remains clean`);
    assert.equal(f.diagnostics().matrixWrites,1);
    assert.equal(f.diagnostics().colorWrites,1);
    assert.equal(f.diagnostics().coverageWrites,0);
  }finally{f.dispose();}
});

test('selection worker gets one bounded restart and exposes permanent fallback',()=>{
  const OriginalWorker=globalThis.Worker,workers=[];
  globalThis.Worker=class {constructor(){workers.push(this);}terminate(){}postMessage(){}};
  let f;
  try{
    f=new PlanetForest(body);assert.equal(workers.length,1);
    workers[0].onerror({preventDefault(){}});assert.equal(workers.length,2);assert.equal(f.diagnostics().selectionMode,'worker');
    workers[1].onerror({preventDefault(){}});assert.equal(workers.length,2);assert.equal(f.diagnostics().selectionMode,'synchronous-fallback');
    assert.equal(f.diagnostics().workerFailures,2);
    assert.equal(f.diagnostics().workerRestarts,1,'count actual restarts, not rejected restart attempts');
  }finally{f?.dispose();if(OriginalWorker===undefined)delete globalThis.Worker;else globalThis.Worker=OriginalWorker;}
});
test('late canonical hydrology attachment refreshes near habitat at unchanged water',()=>{
  const {f,step}=fixture();f.body={...body};
  try{
    step();const residents=[...f.cache.values()],oldSample=f.sample;
    f.body.canonicalRivers=[];step();
    assert.notEqual(f.sample,oldSample);assert.equal(f.sampledRivers,f.body.canonicalRivers);
    assert.ok(residents.every(r=>Number.isNaN(r.water)),'old resident metadata loses current-water authority');
    assert.ok([...f.cache.values()].some(r=>!residents.includes(r)&&r.water===0),'bounded habitat work replaces old samples');
  }finally{f.dispose();}
});
test('complete distant canopy skips near work while missing or stale water keeps fallback',()=>{
  const {f,step}=fixture();let current=true,notes=0;
  const cell=f.wanted[0],resident=f.cache.get(cell.id);cell.direction=new THREE.Vector3(800/body.radiusM,0,1).normalize().toArray();cell.canopyRepresentative=true;
  f.fullCanopy={group:new THREE.Group(),prepare(){},finish(){},observeClose(){},currentPatch:()=>current,noteNear(){notes++;},canHandoff:()=>false,own(){},diagnostics:()=>({}),dispose(){}};
  try{
    step();assert.equal(f.diagnostics().farOwnedSkipped,1);assert.equal(notes,5);assert.equal(f.canopy.count,0);
    current=false;notes=0;step();assert.equal(f.diagnostics().farOwnedSkipped,0);assert.equal(notes,6);assert.equal(f.canopy.count,1);
    current=true;resident.water=-1;notes=0;step();assert.equal(f.diagnostics().farOwnedSkipped,0);assert.equal(notes,6,'stale water remains on the immediate suppression path');
  }finally{f.dispose();}
});

test('packed selection applies once, ignores stale replies and recovers from decode and message errors',()=>{
  const OriginalWorker=globalThis.Worker,workers=[];
  globalThis.Worker=class {constructor(){workers.push(this);}terminate(){}postMessage(){}};
  let f;
  try{
    f=new PlanetForest(body);f.selectionRequest=10;f.selecting=true;f.selectionDirection=[1,0,0];
    const cell={id:'0/2/0/1',direction:[1,0,0],roll:.5,heightM:15,yaw:0,distanceM:0,canopyRepresentative:true};
    workers[0].onmessage({data:{requestId:9,packed:null}});
    assert.equal(f.selecting,true);assert.equal(f.workerFailures,0);
    workers[0].onmessage({data:{requestId:10,direction:[0,1,0],packed:packForestSelection([cell]),selectionMs:3,packMs:1}});
    assert.deepEqual(f.wanted,[cell]);assert.equal(f.selecting,false);
    assert.deepEqual(f.center.toArray(),[1,0,0],'request owns selection centre');
    workers[0].onmessage({data:{requestId:10,packed:null}});assert.equal(f.workerFailures,0,'completed duplicate ignored');
    assert.equal(f.diagnostics().selectionTransfer.bytes,96);
    f.selectionRequest++;f.selecting=true;f.selectionDirection=[1,0,0];
    workers[0].onmessage({data:{requestId:11,packed:{version:99},selectionMs:1,packMs:1}});
    assert.equal(workers.length,2);assert.equal(f.selecting,false);assert.deepEqual(f.wanted,[cell]);
    assert.equal(f.diagnostics().selectionTransfer,null);
    workers[0].onmessage({data:{requestId:f.selectionRequest,packed:null}});
    assert.equal(f.workerFailures,1,'terminated worker cannot affect current state');
    f.selecting=true;workers[1].onmessageerror({});
    assert.equal(f.selecting,false);assert.equal(f.diagnostics().selectionMode,'synchronous-fallback');
    assert.equal(f.workerFailures,2);assert.equal(f.workerRestarts,1);
  }finally{f?.dispose();if(OriginalWorker===undefined)delete globalThis.Worker;else globalThis.Worker=OriginalWorker;}
});

test('malformed response envelope and synchronous post failure cannot leave selection pending',()=>{
  const OriginalWorker=globalThis.Worker,workers=[];
  globalThis.Worker=class {constructor(){workers.push(this);}terminate(){}postMessage(){throw new Error('clone failed');}};
  let f;
  try{
    f=new PlanetForest(body);f.selecting=true;workers[0].onmessage({data:null});
    assert.equal(f.selecting,false);assert.equal(f.workerFailures,1);
    f.update(new THREE.Vector3(0,0,1.00001),[0,0,1],50,true,0,false);
    assert.equal(f.selecting,false);assert.equal(f.workerFailures,2);assert.equal(f.diagnostics().selectionMode,'synchronous-fallback');
  }finally{f?.dispose();if(OriginalWorker===undefined)delete globalThis.Worker;else globalThis.Worker=OriginalWorker;}
});

test('main selection application defects remain visible and do not consume worker recovery',()=>{
  const OriginalWorker=globalThis.Worker,workers=[];
  globalThis.Worker=class {constructor(){workers.push(this);}terminate(){}postMessage(){}};
  let f;
  try{
    f=new PlanetForest(body);f.selecting=true;f.selectionDirection=[1,0,0];
    f.applySelection=()=>{throw new Error('application defect');};
    assert.throws(()=>workers[0].onmessage({data:{requestId:0,packed:packForestSelection([]),selectionMs:1,packMs:0}}),/application defect/);
    assert.equal(f.workerFailures,0);assert.equal(f.workerRestarts,0);
  }finally{f?.dispose();if(OriginalWorker===undefined)delete globalThis.Worker;else globalThis.Worker=OriginalWorker;}
});
