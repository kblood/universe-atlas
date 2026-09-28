import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createServer} from 'vite';

const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {InstanceUpdateRanges}=await vite.ssrLoadModule('/src/instance-update-ranges.ts');
after(()=>vite.close());

const attribute=(Type=Float32Array,itemSize=1,count=2048)=>new THREE.BufferAttribute(new Type(count*itemSize),itemSize);
const cloneRanges=attr=>attr.updateRanges.map(range=>({...range}));

test('keeps separated component intervals separate and sorts them',()=>{
  const ranges=new InstanceUpdateRanges(),attr=attribute(Float32Array,2);
  ranges.include(8,2);ranges.include(1,2);
  assert.equal(ranges.flush(attr),16);
  assert.deepEqual(cloneRanges(attr),[{start:2,count:2},{start:16,count:2}]);
  assert.equal(attr.version,1);
});

test('deduplicates duplicate, overlapping, and adjacent slot updates',()=>{
  const ranges=new InstanceUpdateRanges(),attr=attribute(Float32Array,4);
  ranges.include(2,4);ranges.include(1,4);ranges.include(2,4);ranges.include(3,4);
  assert.equal(ranges.flush(attr),48);
  assert.deepEqual(cloneRanges(attr),[{start:4,count:12}]);
});

test('caps at eight ranges by merging the smallest gap without dropping updates',()=>{
  const ranges=new InstanceUpdateRanges(),attr=attribute(Float32Array,1);
  const slots=[500,41,200,0,400,10,300,100,25];
  for(const slot of slots)ranges.include(slot,1);
  const bytes=ranges.flush(attr),actual=cloneRanges(attr);
  assert.equal(actual.length,8);
  assert.deepEqual(actual,[
    {start:0,count:11},{start:25,count:1},{start:41,count:1},{start:100,count:1},
    {start:200,count:1},{start:300,count:1},{start:400,count:1},{start:500,count:1},
  ]);
  for(const slot of slots)assert.ok(actual.some(range=>slot>=range.start&&slot<range.start+range.count),`slot ${slot} remains covered`);
  assert.equal(bytes,18*Float32Array.BYTES_PER_ELEMENT);
});

test('pending attribute ranges survive hidden frames and merge when visible again',()=>{
  const ranges=new InstanceUpdateRanges(),attr=attribute(Float32Array,2);
  attr.addUpdateRange(20,2);const beforeHidden=cloneRanges(attr);
  ranges.include(1,2); // hidden frame: no flush or GPU submission
  assert.deepEqual(cloneRanges(attr),beforeHidden);
  ranges.include(3,2); // another hidden frame; pending helper work is retained
  assert.deepEqual(cloneRanges(attr),beforeHidden);
  assert.equal(ranges.flush(attr),24);
  assert.deepEqual(cloneRanges(attr),[{start:2,count:2},{start:6,count:2},{start:20,count:2}]);
  assert.equal(attr.version,1);
});

test('a simulated GPU consumption clears submitted ranges but preserves later edits',()=>{
  const ranges=new InstanceUpdateRanges(),attr=attribute(Float32Array,3);
  ranges.include(2,3);assert.equal(ranges.flush(attr),12);assert.deepEqual(cloneRanges(attr),[{start:6,count:3}]);
  // Three clears BufferAttribute.updateRanges after consuming the upload.
  attr.clearUpdateRanges();assert.deepEqual(cloneRanges(attr),[]);
  ranges.include(7,3);assert.equal(ranges.flush(attr),12);assert.deepEqual(cloneRanges(attr),[{start:21,count:3}]);
  assert.equal(attr.version,2);
});

test('zero-work flush preserves old pending ranges and does not increment version',()=>{
  const ranges=new InstanceUpdateRanges(),attr=attribute(Uint16Array,4);
  attr.addUpdateRange(8,4);const version=attr.version,existing=cloneRanges(attr);
  assert.equal(ranges.flush(attr),0);
  assert.equal(attr.version,version);
  assert.deepEqual(cloneRanges(attr),existing);
});

test('upload byte counts use the typed array element size',()=>{
  const f32=attribute(Float32Array,16),u16=attribute(Uint16Array,4);
  const f32Ranges=new InstanceUpdateRanges(),u16Ranges=new InstanceUpdateRanges();
  f32Ranges.include(3,16);assert.equal(f32Ranges.flush(f32),16*4);
  u16Ranges.include(5,4);u16Ranges.include(6,4);assert.equal(u16Ranges.flush(u16),8*2);
  assert.deepEqual(cloneRanges(f32),[{start:48,count:16}]);
  assert.deepEqual(cloneRanges(u16),[{start:20,count:8}]);
});

test('deterministic sparse edits all remain covered after bounded coalescing',()=>{
  const ranges=new InstanceUpdateRanges(),attr=attribute(Float32Array,3,4096);
  let state=0x5eed1234;const slots=new Set();
  for(let i=0;i<160;i++){
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    const slot=state%4096;slots.add(slot);ranges.include(slot,3);
    if(i%7===0)ranges.include(slot,3); // deterministic duplicates
  }
  const bytes=ranges.flush(attr),actual=cloneRanges(attr);
  assert.ok(actual.length<=8);
  assert.deepEqual(actual,[...actual].sort((a,b)=>a.start-b.start));
  for(let i=1;i<actual.length;i++)assert.ok(actual[i-1].start+actual[i-1].count<actual[i].start,'output ranges are separated');
  for(const slot of slots){
    const start=slot*3;
    assert.ok(actual.some(range=>start>=range.start&&start+3<=range.start+range.count),`slot ${slot} keeps all three components`);
  }
  assert.equal(bytes,actual.reduce((sum,range)=>sum+range.count,0)*Float32Array.BYTES_PER_ELEMENT);
  assert.equal(attr.version,1);
});
