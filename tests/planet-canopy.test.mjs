import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PlanetCanopy} from '../src/planet-canopy.ts';
import {galaxies,refByAddress,system} from '../src/catalog.ts';

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
function begin(capacity=256){
  const previousWorker=globalThis.Worker;MockWorker.instances=[];globalThis.Worker=MockWorker;
  const host=new PlanetCanopy(body,capacity);host.prepare(eye,ground,100,0,true,false,nearOrigin);
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

test('worker failure retries once and leaves near rendering available after the retry fails',()=>{
  const h=begin(64);
  try{
    h.worker.error();assert.equal(h.worker.terminated,true);assert.equal(h.host.workerRestarts,1);
    const retry=MockWorker.instances.at(-1);assert.notEqual(retry,h.worker);retry.error();
    assert.equal(retry.terminated,true);assert.equal(h.host.workerRestarts,1);assert.equal(h.host.failures,2);
    const count=MockWorker.instances.length;assert.equal(h.host.prepare(eye,ground,100,0,true,false,nearOrigin),true);
    assert.equal(MockWorker.instances.length,count,'restart limit is bounded');assert.equal(h.host.canHandoff('missing/0/0/0',12),false);
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
    h.host.prepare(distantEye,ground,100,0,true,false,nearOrigin);
    assert.equal(h.host.diagnostics().rebasePending,false);assert.notDeepEqual(h.host.origin.toArray(),origin.toArray());
    assert.ok(Math.abs(h.host.renderer.positions.getX(slot)-(h.host.bodyPositions[slot*3]-h.host.origin.x))<.01);
    assert.ok(Math.abs(h.host.renderer.positions.getY(slot)-(h.host.bodyPositions[slot*3+1]-h.host.origin.y))<.01);
  }finally{h.restore();}
});
