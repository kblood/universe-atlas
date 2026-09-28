import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {packForestSelection:pack,unpackForestSelection:unpack,FOREST_TRANSFER_MAX_CELLS:max}=await vite.ssrLoadModule('/src/forest-selection-transfer.ts');
const {ForestSelectionCache}=await vite.ssrLoadModule('/src/forest-selection-cache.ts');
after(()=>vite.close());
test('transfer preserves every double, identity, order and representative flag at seams and corners',()=>{
  const cache=new ForestSelectionCache('TRANSFER',6000000,18);
  for(const v of [[0,0,1],[1,1,0],[1,1,1]]){
    const direction=v.map(x=>x/Math.hypot(...v)),cells=cache.select(direction,750,4500);
    const packet=pack(cells),bytes=packet.buffer.byteLength;
    const moved=structuredClone(packet,{transfer:[packet.buffer]});
    assert.equal(packet.buffer.byteLength,0,'sender releases response buffer');
    assert.equal(bytes,cells.length*96);
    assert.deepEqual(unpack(moved),cells);
    assert.equal(JSON.stringify(unpack(moved)),JSON.stringify(cells));
    assert.deepEqual(cache.select(direction,750,4500),cells,'transfer does not detach resident patch cache');
  }
});
test('empty and optional representative fields survive round trips',()=>{
  assert.deepEqual(unpack(pack([])),[]);
  const cell={id:'0/2/0/1',direction:[1,0,0],roll:.5,heightM:15,yaw:0,distanceM:0};
  assert.deepEqual(unpack(pack([cell])),[cell]);
  assert.throws(()=>pack([{...cell,id:'0/02/0/1'}]));
  assert.throws(()=>pack([{...cell,direction:[1,0]}]));
  const signedZero={...cell,direction:[1,-0,0],yaw:-0,distanceM:-0};
  assert.deepEqual(unpack(pack([signedZero])),[signedZero],'strict equality preserves negative zero');
});
test('malformed, excessive and detached buffers reject without yielding a partial selection',()=>{
  const cell={id:'0/2/0/1',direction:[1,0,0],roll:.5,heightM:15,yaw:0,distanceM:0,canopyRepresentative:false};
  for(const p of [null,{}, {...pack([cell]),version:2},{...pack([cell]),count:-1},
    {...pack([cell]),count:max+1},{...pack([cell]),count:.5},{...pack([cell]),buffer:new ArrayBuffer(8)}])assert.throws(()=>unpack(p));
  for(const [slot,value] of [[0,6],[1,1.2],[2,-1],[3,2],[4,NaN],[5,Infinity],[6,1],[7,1],[8,-2],[9,NaN],[10,-1],[11,2]]){
    const p=pack([cell]);new Float64Array(p.buffer)[slot]=value;assert.throws(()=>unpack(p),`slot ${slot}`);
  }
  const detached=pack([cell]);structuredClone(detached,{transfer:[detached.buffer]});assert.throws(()=>unpack(detached));
  assert.throws(()=>pack(Array(max+1).fill(cell)));
});
