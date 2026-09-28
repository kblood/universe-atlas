import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PlanetCanopy} from '../src/planet-canopy.ts';
import {LEGACY_TREE_BOUND} from '../src/tree-shape.ts';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {PLANET_DETAIL} from '../src/planet-detail.ts';

const body=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];
const ground=[1,0,0],eye=new THREE.Vector3(1,0,0),nearOrigin=new THREE.Vector3();
const contextA='a'.repeat(64),contextB='b'.repeat(64);

class MockWorker{
  static instances=[];
  onmessage=null;onerror=null;onmessageerror=null;sent=[];terminated=false;
  constructor(url,options){this.url=url;this.options=options;MockWorker.instances.push(this);}
  postMessage(message){this.sent.push(message);}
  emit(data){this.onmessage?.({data});}
  error(){this.onerror?.({preventDefault(){}});}
  terminate(){this.terminated=true;}
}

function address(i=0,n=Math.ceil(2*body.radiusM/18)){
  return {face:0,n,x:1000+i,y:1000};
}
function recordBuffer(count){
  const out=new Float64Array(count*9);
  for(let i=0;i<count;i++)out.set([i,1,0,0,.25,16,.5,120,0],i*9);
  return out;
}
function patch(a,{present=1,candidates=64,testedCells=64,context=contextA,records=recordBuffer(present)}={}){
  return {context,address:{...a},testedCells,candidates,present,representatives:0,records};
}
function begin(capacity=256,canopyBody=body){
  const previousWorker=globalThis.Worker;MockWorker.instances=[];globalThis.Worker=MockWorker;
  const host=new PlanetCanopy(canopyBody,capacity);host.prepare(eye,ground,100,0,true,false,nearOrigin);
  const worker=MockWorker.instances[0],configure=worker.sent.find(m=>m.type==='configure');
  assert.ok(worker&&configure,'prepare starts and configures a census worker');
  const generation=configure.generation,n=configure.body?Math.ceil(2*configure.body.radiusM/18):Math.ceil(2*body.radiusM/18);
  worker.emit({type:'ready',generation,context:contextA,n});
  host.prepare(eye,ground,100,0,true,false,nearOrigin);
  const select=worker.sent.findLast(m=>m.type==='select');assert.ok(select,'ready host requests a patch selection');
  return {host,worker,generation,n,select,context:contextA,restore(){host.dispose();globalThis.Worker=previousWorker;}};
}
function selectAndRequest(h,addresses){
  h.worker.emit({type:'selection',generation:h.generation,requestId:h.select.requestId,context:h.context,
    packed:Float64Array.from(addresses.flatMap(a=>[a.face,a.n,a.x,a.y])),selectionMs:1});
  h.host.prepare(eye,ground,100,0,true,false,nearOrigin);
  const request=h.worker.sent.findLast(m=>m.type==='patches');assert.ok(request,'selection response starts a bounded patch request');
  return request;
}
function sendPatchResponse(h,request,patches,done=true){
  h.worker.emit({type:'patches',generation:h.generation,requestId:request.requestId,context:h.context,patches,done});
}

test('selection requests and queued census results stay bounded and installs are frame budgeted',()=>{
  const h=begin(4096),addresses=Array.from({length:70},(_,i)=>address(i,h.n));
  try{
    const request=selectAndRequest(h,addresses);
    assert.equal(request.addresses.length,64,'host requests at most 64 whole patches');
    for(let batch=0;batch<8;batch++){
      const patches=request.addresses.slice(batch*8,batch*8+8).map(a=>patch(a,{present:64}));
      sendPatchResponse(h,request,patches,batch===7);
      assert.ok(h.host.pending.length<=64);
    }
    assert.equal(h.host.pending.length,64,'incomplete/queued batches retain at most 64 complete patches');
    assert.equal(h.host.installed.size,0,'message receipt alone never installs a patch');
    let frames=0;
    while(h.host.pending.length&&frames++<20){
      h.host.prepare(eye,ground,100,0,true,false,nearOrigin);
      assert.ok(h.host.installedThisFrame<=512,'installation respects the per-frame tree budget');
      assert.ok(h.host.pending.length<=64);
    }
    assert.equal(h.host.pending.length,0);assert.equal(h.host.slots.size,4096);
    assert.equal(h.host.installed.size,64);
    const nextRequest=h.worker.sent.findLast(m=>m.type==='patches');
    assert.equal(nextRequest.addresses.length,6,'the remaining selection is requested only after the first bounded batch drains');
  }finally{h.restore();}
});

test('only structurally complete patches install; validated empty patches remain known',()=>{
  const h=begin(64),a=address(0,h.n);
  try{
    const request=selectAndRequest(h,[a]);
    sendPatchResponse(h,request,[patch(a,{present:1,records:new Float64Array(0)})]);
    assert.equal(h.worker.terminated,true,'malformed partial result fails the worker');
    assert.equal(h.host.pending.length,0);assert.equal(h.host.installed.size,0);assert.equal(h.host.slots.size,0);
    const replacement=MockWorker.instances.at(-1);assert.notEqual(replacement,h.worker);assert.ok(replacement.sent.some(m=>m.type==='configure'));
  }finally{h.restore();}

  const e=begin(64),emptyAddress=address(1,e.n);
  try{
    const request=selectAndRequest(e,[emptyAddress]);
    sendPatchResponse(e,request,[patch(emptyAddress,{present:0,candidates:32,testedCells:64})]);
    e.host.prepare(eye,ground,100,0,true,false,nearOrigin);
    const key=`${emptyAddress.face}/${emptyAddress.n}/${emptyAddress.x}/${emptyAddress.y}`;
    assert.equal(e.host.currentPatch(key),true,'a complete empty result is known, not pending or absent');
    assert.equal(e.host.installed.size,1);assert.equal(e.host.slots.size,0);
  }finally{e.restore();}
});

test('patch address coverage metadata rejects a partial edge/interior result before installation',()=>{
  const h=begin(64),a=address(0,h.n);
  try{
    const request=selectAndRequest(h,[a]);
    sendPatchResponse(h,request,[patch(a,{present:0,candidates:0,testedCells:0})]);
    assert.equal(h.worker.terminated,true,'tested-cell count must match the addressed patch extent');
    assert.equal(h.host.installed.size,0);assert.equal(h.host.pending.length,0);assert.equal(h.host.slots.size,0);
  }finally{h.restore();}
});

test('near ownership, absence suppression, and reused-slot previous IDs resolve in one frame',()=>{
  const h=begin(1),a=address(0,h.n),b=address(1,h.n),keyA=`${a.face}/${a.n}/${a.x}/${a.y}`;
  try{
    const request=selectAndRequest(h,[a]);sendPatchResponse(h,request,[patch(a)]);
    h.host.prepare(eye,ground,100,0,true,false,nearOrigin);
    const idA=`${a.face}/${a.n}/${a.x*8}/${a.y*8}`,slotA=h.host.slots.get(idA);
    assert.equal(slotA,0);assert.equal(h.host.currentPatch(keyA),true);assert.equal(h.host.canHandoff(idA,120),true);
    h.host.own(idA,.5);h.host.finish();assert.equal(h.host.renderer.ownership.array[slotA],128,'near and far ownership commit in the same frame');

    h.host.prepare(eye,ground,100,0,true,false,nearOrigin);
    h.host.noteNear(idA,keyA,false,0);h.host.finish();
    assert.equal(h.host.renderer.ownership.array[slotA],256,'near absence suppresses stale far presence');

    const keyB=`${b.face}/${b.n}/${b.x}/${b.y}`,idB=`${b.face}/${b.n}/${b.x*8}/${b.y*8}`;
    h.host.desired.set(keyB,b);h.host.remove(keyA);h.host.pending.push(patch(b));
    h.host.prepare(eye,ground,100,0,true,false,nearOrigin);
    const slotB=h.host.slots.get(idB);assert.equal(slotB,slotA,'released storage is reused');
    assert.equal(h.host.renderer.ownership.array[slotB],0,'reused slot clears stale ownership');
    h.host.own(idB,200/256);h.host.finish();
    assert.equal(h.host.renderer.ownership.array[slotB],200,'the previous frame ID cannot reset ownership of a reused slot');
  }finally{h.restore();}
});

test('water reconfiguration ignores stale generation replies and accepts the new context',()=>{
  const h=begin(64),a=address(0,h.n);
  try{
    const request=selectAndRequest(h,[a]);
    h.host.prepare(eye,ground,100,10,true,false,nearOrigin);
    const config2=h.worker.sent.findLast(m=>m.type==='configure');assert.equal(config2.generation,h.generation+1);
    h.worker.emit({type:'patches',generation:h.generation,requestId:request.requestId,context:h.context,patches:[patch(a)],done:true});
    assert.equal(h.host.pending.length,0);assert.equal(h.host.installed.size,0);
    h.worker.emit({type:'ready',generation:config2.generation,context:contextB,n:h.n});
    h.host.prepare(eye,ground,100,10,true,false,nearOrigin);
    const selection2=h.worker.sent.findLast(m=>m.type==='select');assert.equal(selection2.generation,config2.generation);
    const previousOrder=h.host.order.slice();
    h.worker.emit({type:'selection',generation:h.generation,requestId:selection2.requestId,context:contextA,packed:new Float64Array(),selectionMs:0});
    assert.deepEqual(h.host.order,previousOrder,'stale selection data cannot replace current-water patches');
    assert.equal(h.host.diagnostics().selectionPending,true);
  }finally{h.restore();}
});

test('close canonical crowns require same-frame ownership; holes and submerged trees do not count as forced closes',()=>{
  const h=begin(64),a=address(0,h.n),key=`${a.face}/${a.n}/${a.x}/${a.y}`;
  try{
    const request=selectAndRequest(h,[a]);sendPatchResponse(h,request,[patch(a)]);h.host.prepare(eye,ground,100,0,true,false,nearOrigin);
    const id=`${a.face}/${a.n}/${a.x*8}/${a.y*8}`,slot=h.host.slots.get(id);assert.equal(slot,0);
    const root=new THREE.Vector3().fromArray(h.host.bodyPositions,slot*3),rotation=new THREE.Quaternion().fromArray(h.host.renderer.rotations.array,slot*4);
    const localBound=new THREE.Vector3(...LEGACY_TREE_BOUND.center).multiplyScalar(16).applyQuaternion(rotation);
    const closeEye=root.add(localBound).multiplyScalar(1/body.radiusM);

    h.host.prepare(closeEye,ground,100,0,true,false,nearOrigin);h.host.observeClose(id,closeEye);h.host.finish();
    assert.equal(h.host.diagnostics().farForcedClose,1,'an unowned close crown is counted');
    h.host.prepare(closeEye,ground,100,0,true,false,nearOrigin);h.host.observeClose(id,closeEye);h.host.own(id,1);h.host.finish();
    assert.equal(h.host.diagnostics().farForcedClose,0,'near ownership applied in this frame prevents a forced far close');
    h.host.prepare(closeEye,ground,100,0,true,false,nearOrigin);h.host.observeClose(id,closeEye);h.host.noteNear(id,key,false,0);h.host.finish();
    assert.equal(h.host.diagnostics().nearAbsentInCensus,1);assert.equal(h.host.diagnostics().farForcedClose,0,'near absence suppresses the far copy');
    assert.ok(body.water>0,'fixture needs a water-bearing body for submerged filtering');
    h.host.prepare(closeEye,ground,100,200,true,false,nearOrigin);h.host.observeClose(id,closeEye);h.host.finish();
    assert.equal(h.host.diagnostics().farForcedClose,0,'submerged roots are excluded from close checks');
  }finally{h.restore();}
});

test('worker failure retries once then disables the full canopy for legacy near rendering',()=>{
  const h=begin(64);
  try{
    h.worker.error();assert.equal(h.worker.terminated,true);assert.equal(h.host.workerRestarts,1);
    const retry=MockWorker.instances.at(-1);assert.notEqual(retry,h.worker);retry.error();
    assert.equal(retry.terminated,true);assert.equal(h.host.workerRestarts,1);assert.equal(h.host.failures,2);
    const count=MockWorker.instances.length;assert.equal(h.host.prepare(eye,ground,100,0,true,false,nearOrigin),false);
    assert.equal(MockWorker.instances.length,count,'restart limit is bounded');assert.equal(h.host.diagnostics().terminalFailure,true);
    assert.equal(h.host.group.visible,false,'the failed far canopy stays hidden');assert.equal(h.host.canHandoff('missing/0/0/0',12),false);
  }finally{h.restore();}
});

test('hung configure, selection, and request each restart once then disable far ownership',()=>{
  const cases=['configure','selection','request'];
  for(const phase of cases){
    const h=begin(64),a=address(0,h.n),b=address(1,h.n),keyA=`${a.face}/${a.n}/${a.x}/${a.y}`;
    try{
      let handoffId='missing/0/0/0',height=12;
      if(phase==='configure'){
        h.host.ready=false;h.host.selection=null;h.host.configuredAt=performance.now()-10001;
      }else if(phase==='selection'){
        h.host.selection.started=performance.now()-10001;
      }else{
        const request=selectAndRequest(h,[a,b]);
        h.worker.emit({type:'patches',generation:h.generation,requestId:request.requestId,context:h.context,
          patches:[patch(a)],done:false});
        h.host.prepare(eye,ground,100,0,true,false,nearOrigin);
        const id=`${a.face}/${a.n}/${a.x*8}/${a.y*8}`;handoffId=id;
        height=h.host.heights[h.host.slots.get(id)];assert.equal(h.host.currentPatch(keyA),true);
        h.host.request.progressAt=performance.now()-10001;
      }
      h.host.prepare(eye,ground,100,0,true,false,nearOrigin);
      assert.equal(MockWorker.instances.length,2,`${phase}: first timeout restarts the worker once`);
      assert.equal(h.host.workerRestarts,1);assert.equal(h.host.terminalFailure,false);
      const restarted=MockWorker.instances.at(-1);assert.ok(restarted.sent.some(m=>m.type==='configure'));
      h.host.configuredAt=performance.now()-10001;
      h.host.prepare(eye,ground,100,0,true,false,nearOrigin);
      assert.equal(MockWorker.instances.length,2,`${phase}: second timeout is terminal, without another restart`);
      assert.equal(h.host.timeouts,2);assert.equal(h.host.diagnostics().terminalFailure,true);
      assert.equal(h.host.group.visible,false,'terminal failure disables old far instances');
      assert.equal(h.host.prepare(eye,ground,100,0,true,false,nearOrigin),false,'caller keeps the legacy near path');
      assert.equal(h.host.currentPatch(keyA),false);assert.equal(h.host.canHandoff(handoffId,height),false,'terminal far state cannot take near ownership');
    }finally{h.restore();}
  }
});

test('valid partial patch progress refreshes the request watchdog timestamp',()=>{
  const h=begin(64),a=address(0,h.n),b=address(1,h.n);
  try{
    const request=selectAndRequest(h,[a,b]),old=performance.now()-10001;
    h.host.request.progressAt=old;
    h.worker.emit({type:'patches',generation:h.generation,requestId:request.requestId,context:h.context,patches:[patch(a)],done:false});
    assert.ok(h.host.request.progressAt>old);assert.ok(performance.now()-h.host.request.progressAt<1000);
    assert.equal(h.host.request.keys.size,1,'the response made valid partial progress');
  }finally{h.restore();}
});

test('nonfinite water is rejected before host state changes and zero stays stable for waterless bodies',()=>{
  const h=begin(64);
  try{
    const generation=h.host.generation,sent=h.worker.sent.length,water=h.host.water,visible=h.host.group.visible;
    assert.throws(()=>h.host.prepare(eye,ground,100,Number.NaN,false,false,nearOrigin),/water level must be finite/);
    assert.equal(h.host.generation,generation);assert.equal(h.worker.sent.length,sent);
    assert.equal(h.host.water,water);assert.equal(h.host.group.visible,visible);
  }finally{h.restore();}

  const dry=begin(64,{...body,water:0});
  try{
    const generation=dry.host.generation,configures=dry.worker.sent.filter(m=>m.type==='configure').length;
    for(let i=0;i<4;i++)assert.equal(dry.host.prepare(eye,ground,100,0,true,false,nearOrigin),true);
    assert.equal(dry.host.generation,generation);assert.equal(dry.worker.sent.filter(m=>m.type==='configure').length,configures);
  }finally{dry.restore();}
});

test('canopy prefetches while hidden between prepare and streaming altitude thresholds',()=>{
  const h=begin(64);
  const a=address(0,h.n),key=`${a.face}/${a.n}/${a.x}/${a.y}`,id=`${a.face}/${a.n}/${a.x*8}/${a.y*8}`;
  try{
    const high=PLANET_DETAIL.forestPrepareAltitudeM+1000;
    assert.ok(high<PLANET_DETAIL.forestStreamAltitudeM);
    assert.equal(h.host.prepare(eye,ground,high,0,true,false,nearOrigin),false,'prefetch stays visually hidden');
    assert.equal(h.host.diagnostics().streaming,true);assert.equal(h.host.group.visible,false);
    h.worker.emit({type:'ready',generation:h.generation,context:contextA,n:h.n});
    h.host.prepare(eye,ground,high,0,true,false,nearOrigin);
    const selection=h.worker.sent.findLast(m=>m.type==='select');assert.ok(selection);
    h.worker.emit({type:'selection',generation:h.generation,requestId:selection.requestId,context:contextA,
      packed:Float64Array.from([a.face,a.n,a.x,a.y]),selectionMs:0});
    h.host.prepare(eye,ground,high,0,true,false,nearOrigin);
    const request=h.worker.sent.findLast(m=>m.type==='patches');assert.ok(request);
    sendPatchResponse(h,request,[patch(a)]);h.host.prepare(eye,ground,high,0,true,false,nearOrigin);
    assert.equal(h.host.installed.has(key),true,'prefetch installs the complete patch while hidden');
    assert.equal(h.host.canHandoff(id,120),false,'hidden prefetch cannot take visible near ownership');
    assert.equal(h.host.prepare(eye,ground,PLANET_DETAIL.forestPrepareAltitudeM-100,0,true,false,nearOrigin),true);
    assert.equal(h.host.currentPatch(key),true);assert.equal(h.host.canHandoff(id,120),true,'the prepared patch becomes available when revealed');
  }finally{h.restore();}
});

test('canopy does not start or keep streaming above its altitude band',()=>{
  const previousWorker=globalThis.Worker;MockWorker.instances=[];globalThis.Worker=MockWorker;
  const host=new PlanetCanopy(body,64);
  try{
    assert.equal(host.prepare(eye,ground,PLANET_DETAIL.forestStreamAltitudeM+1,0,true,false,nearOrigin),false);
    assert.equal(host.diagnostics().streaming,false);assert.equal(MockWorker.instances.length,0,'high altitude does not launch background census work');
    assert.equal(host.prepare(eye,ground,PLANET_DETAIL.forestStreamAltitudeM-1,0,true,false,nearOrigin),false);
    assert.equal(host.diagnostics().streaming,true);assert.equal(MockWorker.instances.length,1,'worker starts on entering the prefetch band');
  }finally{host.dispose();globalThis.Worker=previousWorker;}
});

test('patch failures stop retrying after three attempts and an infinite wake does not spin',()=>{
  const h=begin(64),a=address(0,h.n),key=`${a.face}/${a.n}/${a.x}/${a.y}`;
  try{
    let request=selectAndRequest(h,[a]);
    h.worker.emit({type:'error',phase:'request',generation:h.generation,requestId:request.requestId,context:h.context,error:'injected failure 1'});
    assert.equal(h.host.retries.get(key).attempts,1);
    h.host.retries.set(key,{attempts:2,after:0});h.host.retryWakeAt=0;
    h.host.prepare(eye,ground,100,0,true,false,nearOrigin);
    request=h.worker.sent.findLast(m=>m.type==='patches');assert.notEqual(request.requestId,undefined);
    h.worker.emit({type:'error',phase:'request',generation:h.generation,requestId:request.requestId,context:h.context,error:'injected failure 3'});
    assert.equal(h.host.retries.get(key).attempts,3);assert.equal(h.host.retries.get(key).after,Infinity);
    const count=h.worker.sent.filter(m=>m.type==='patches').length;
    h.host.prepare(eye,ground,100,0,true,false,nearOrigin);
    assert.equal(h.worker.sent.filter(m=>m.type==='patches').length,count,'a permanently backed-off patch does not spin');
  }finally{h.restore();}
});

test('a pending patch job cannot install results from the previous selection after a long move',()=>{
  const h=begin(64),a=address(0,h.n),b=address(1,h.n);
  try{
    const first=selectAndRequest(h,[a]);
    const turn=5000/body.radiusM,newGround=[Math.cos(turn),Math.sin(turn),0],newEye=new THREE.Vector3(...newGround);
    h.host.prepare(newEye,newGround,100,0,true,false,nearOrigin);
    const secondSelection=h.worker.sent.findLast(m=>m.type==='select');assert.ok(secondSelection.requestId>h.select.requestId);
    h.worker.emit({type:'selection',generation:h.generation,requestId:secondSelection.requestId,context:h.context,
      packed:Float64Array.from([b.face,b.n,b.x,b.y]),selectionMs:1});
    h.host.prepare(newEye,newGround,100,0,true,false,nearOrigin);
    assert.deepEqual([...h.host.desired.keys()],[`${b.face}/${b.n}/${b.x}/${b.y}`]);
    h.worker.emit({type:'patches',generation:h.generation,requestId:first.requestId,context:h.context,patches:[patch(a)],done:true});
    h.host.prepare(newEye,newGround,100,0,true,false,nearOrigin);
    assert.equal(h.host.installed.has(`${a.face}/${a.n}/${a.x}/${a.y}`),false);
    const latest=h.worker.sent.findLast(m=>m.type==='patches');
    assert.ok(latest.requestId>first.requestId);assert.deepEqual(latest.addresses,[b]);
  }finally{h.restore();}
});

test('water change during pending selection invalidates its reply before requesting the new context',()=>{
  const h=begin(64);
  try{
    const oldSelection=h.select;
    h.host.prepare(eye,ground,100,10,true,false,nearOrigin);
    const configure=h.worker.sent.findLast(m=>m.type==='configure');assert.equal(configure.generation,h.generation+1);
    h.worker.emit({type:'selection',generation:h.generation,requestId:oldSelection.requestId,context:h.context,
      packed:new Float64Array(),selectionMs:1});
    h.worker.emit({type:'ready',generation:configure.generation,context:contextB,n:h.n});
    h.host.prepare(eye,ground,100,10,true,false,nearOrigin);
    const current=h.worker.sent.findLast(m=>m.type==='select');assert.equal(current.generation,configure.generation);
    assert.equal(h.host.diagnostics().selectionPending,true);
    assert.equal(h.host.context,contextB);
  }finally{h.restore();}
});

test('capacity overflow rejects a whole patch without a partial slot allocation',()=>{
  const h=begin(1),a=address(0,h.n);
  try{
    const request=selectAndRequest(h,[a]);sendPatchResponse(h,request,[patch(a,{present:2,candidates:64})]);
    h.host.prepare(eye,ground,100,0,true,false,nearOrigin);
    assert.equal(h.host.capacityMisses,1);assert.equal(h.host.slots.size,0);assert.equal(h.host.installed.size,0);
    assert.equal(h.host.allocator.diagnostics().used,0);assert.equal(h.host.renderer.mesh.geometry.instanceCount,0);
  }finally{h.restore();}
});

test('water refresh can replace a resident patch using its old slots',()=>{
  const h=begin(2),a=address(0,h.n),key=`${a.face}/${a.n}/${a.x}/${a.y}`;
  try{
    const first=selectAndRequest(h,[a]);sendPatchResponse(h,first,[patch(a)]);h.host.prepare(eye,ground,100,0,true,false,nearOrigin);
    assert.equal(h.host.slots.size,1);assert.equal(h.host.currentPatch(key),true);
    h.host.prepare(eye,ground,100,10,true,false,nearOrigin);
    const configure=h.worker.sent.findLast(m=>m.type==='configure');assert.equal(configure.generation,h.generation+1);
    h.worker.emit({type:'ready',generation:configure.generation,context:contextB,n:h.n});
    h.host.prepare(eye,ground,100,10,true,false,nearOrigin);
    const selection=h.worker.sent.findLast(m=>m.type==='select');
    h.worker.emit({type:'selection',generation:configure.generation,requestId:selection.requestId,context:contextB,
      packed:Float64Array.from([a.face,a.n,a.x,a.y]),selectionMs:0});
    h.host.prepare(eye,ground,100,10,true,false,nearOrigin);
    const replacement=h.worker.sent.findLast(m=>m.type==='patches');
    assert.ok(replacement&&replacement.generation===configure.generation);
    h.worker.emit({type:'patches',generation:configure.generation,requestId:replacement.requestId,context:contextB,
      patches:[patch(a,{present:2,candidates:64,context:contextB})],done:true});
    h.host.prepare(eye,ground,100,10,true,false,nearOrigin);
    assert.equal(h.host.slots.size,2,'the old one-tree allocation plus one free slot can hold the two-tree replacement');
    assert.equal(h.host.currentPatch(key),true);
  }finally{h.restore();}
});

test('replacement that still exceeds capacity retires the stale patch without a partial resident',()=>{
  const h=begin(1),a=address(0,h.n),key=`${a.face}/${a.n}/${a.x}/${a.y}`;
  try{
    const first=selectAndRequest(h,[a]);sendPatchResponse(h,first,[patch(a)]);h.host.prepare(eye,ground,100,0,true,false,nearOrigin);
    assert.equal(h.host.slots.size,1);
    h.host.prepare(eye,ground,100,10,true,false,nearOrigin);
    const configure=h.worker.sent.findLast(m=>m.type==='configure');
    h.worker.emit({type:'ready',generation:configure.generation,context:contextB,n:h.n});h.host.prepare(eye,ground,100,10,true,false,nearOrigin);
    const selection=h.worker.sent.findLast(m=>m.type==='select');
    h.worker.emit({type:'selection',generation:configure.generation,requestId:selection.requestId,context:contextB,
      packed:Float64Array.from([a.face,a.n,a.x,a.y]),selectionMs:0});h.host.prepare(eye,ground,100,10,true,false,nearOrigin);
    const replacement=h.worker.sent.findLast(m=>m.type==='patches');
    h.worker.emit({type:'patches',generation:configure.generation,requestId:replacement.requestId,context:contextB,
      patches:[patch(a,{present:2,candidates:64,context:contextB})],done:true});h.host.prepare(eye,ground,100,10,true,false,nearOrigin);
    assert.equal(h.host.installed.has(key),false);assert.equal(h.host.currentPatch(key),false);
    assert.equal(h.host.slots.size,0);assert.equal(h.host.allocator.diagnostics().used,0);assert.equal(h.host.capacityMisses,1);
    assert.equal(h.host.prepare(eye,ground,100,10,true,false,nearOrigin),true,'near legacy rendering remains enabled without the oversized far patch');
  }finally{h.restore();}
});

test('origin rebasing retains positions until the replacement buffer is complete',()=>{
  const h=begin(64),a=address(0,h.n);
  try{
    const request=selectAndRequest(h,[a]);sendPatchResponse(h,request,[patch(a)]);h.host.prepare(eye,ground,100,0,true,false,nearOrigin);
    const id=`${a.face}/${a.n}/${a.x*8}/${a.y*8}`,slot=h.host.slots.get(id);assert.equal(slot,0);
    const before=Array.from(h.host.renderer.positions.array.slice(0,4)),origin=h.host.origin.clone();
    h.host.renderer.mesh.geometry.instanceCount=3000;
    const distantEye=new THREE.Vector3(1,9000/body.radiusM,0);
    h.host.prepare(distantEye,ground,100,0,true,false,nearOrigin);
    assert.equal(h.host.diagnostics().rebasePending,true);assert.deepEqual(Array.from(h.host.renderer.positions.array.slice(0,4)),before);
    assert.deepEqual(h.host.origin.toArray(),origin.toArray(),'origin stays put during sliced preparation');
    for(let slice=0;slice<128&&h.host.diagnostics().rebasePending;slice++){
      h.host.prepare(distantEye,ground,100,0,true,false,nearOrigin);
      if(h.host.diagnostics().rebasePending){
        assert.deepEqual(Array.from(h.host.renderer.positions.array.slice(0,4)),before);
        assert.deepEqual(h.host.origin.toArray(),origin.toArray(),'origin stays put until all replacement positions are ready');
      }
    }
    assert.equal(h.host.diagnostics().rebasePending,false);assert.notDeepEqual(h.host.origin.toArray(),origin.toArray());
    assert.ok(Math.abs(h.host.renderer.positions.getX(slot)-(h.host.bodyPositions[slot*3]-h.host.origin.x))<.01);
    assert.ok(Math.abs(h.host.renderer.positions.getY(slot)-(h.host.bodyPositions[slot*3+1]-h.host.origin.y))<.01);
  }finally{h.restore();}
});
