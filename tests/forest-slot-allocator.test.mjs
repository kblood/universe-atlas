import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ForestSlotAllocator} from '../src/forest-slot-allocator.ts';

test('deterministic random whole-patch allocations never overlap and fully coalesce on release',()=>{
  const allocator=new ForestSlotAllocator(4096),live=[];let state=0x51a7c0de;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state;};
  for(let i=0;i<5000;i++){
    if(live.length&&random()%3===0){
      const at=random()%live.length,[range]=live.splice(at,1);allocator.free(range);
    }else{
      const count=random()%65,range=allocator.allocate(count);
      if(count===0){assert.ok(range);assert.equal(range.count,0);continue;}
      if(range){
        assert.ok(range.count>0&&range.count<=64);
        assert.ok(range.start>=0&&range.start+range.count<=allocator.capacity);
        for(const other of live)assert.ok(range.start+range.count<=other.start||other.start+other.count<=range.start,'allocations do not overlap');
        live.push(range);
      }
    }
    const d=allocator.diagnostics();assert.equal(d.used,live.reduce((sum,r)=>sum+r.count,0));
    assert.ok(d.used>=0&&d.used<=d.capacity);assert.equal(d.free+d.used,d.capacity);
  }
  const failures=allocator.diagnostics().failures;for(const range of live)allocator.free(range);
  assert.deepEqual(allocator.diagnostics(),{capacity:4096,used:0,free:4096,allocations:0,freeExtents:1,largestFree:4096,failures});
});

test('capacity exhaustion is clean and stale allocation tokens cannot free a reused range',()=>{
  const allocator=new ForestSlotAllocator(130),a=allocator.allocate(64),b=allocator.allocate(64),c=allocator.allocate(2);
  assert.ok(a&&b&&c);assert.equal(allocator.allocate(1),null);assert.equal(allocator.diagnostics().failures,1);
  allocator.free(a);const reused=allocator.allocate(64);assert.equal(reused.start,a.start);assert.notEqual(reused.generation,a.generation);
  assert.throws(()=>allocator.free(a),/Stale forest slot allocation/);assert.equal(allocator.diagnostics().used,130);
  allocator.free(c);allocator.free(b);allocator.free(reused);
  assert.deepEqual(allocator.diagnostics(),{capacity:130,used:0,free:130,allocations:0,freeExtents:1,largestFree:130,failures:1});
});

test('zero-sized patches do not consume capacity and invalid sizes are rejected',()=>{
  const allocator=new ForestSlotAllocator(64),before=allocator.diagnostics(),a=allocator.allocate(0),b=allocator.allocate(0);
  assert.ok(a&&b);assert.notEqual(a.generation,b.generation);allocator.free(a);allocator.free(b);
  assert.deepEqual(allocator.diagnostics(),before);
  for(const count of [-1,1.5,65,Infinity,NaN])assert.throws(()=>allocator.allocate(count));
  for(const capacity of [0,-1,1.5,229377,Infinity])assert.throws(()=>new ForestSlotAllocator(capacity));
});
