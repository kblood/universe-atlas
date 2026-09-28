import {test} from 'node:test';
import assert from 'node:assert/strict';
import {forestPatchAddresses} from '../src/forest-patch-selection.ts';
import {populationCells,FOREST_CELL_M} from '../src/planet-population.ts';
const key=a=>`${a.face}/${a.n}/${a.x}/${a.y}`;
test('patch selector conservatively covers production cells at face centres, edges, corners and real forest site',()=>{
  for(const radius of [80000,6371000])for(const raw of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],[1,1,0],[1,1,1],[-1,-1,-1],[.7830496262,-.2907992331,.5497900408]]){
    const center=raw.map(v=>v/Math.hypot(...raw)),range=radius===80000?1500:4500;
    const addresses=forestPatchAddresses(center,radius,range),set=new Set(addresses.map(key));
    assert.equal(set.size,addresses.length);assert.ok(set.size>0);
    for(const cell of populationCells('patch-selector-check',center,radius,range,FOREST_CELL_M)){
      const [face,n,x,y]=cell.id.split('/').map(Number);
      assert.ok(set.has(key({face,n,x:Math.floor(x/8),y:Math.floor(y/8)})),`missing ${cell.id}`);
    }
    assert.deepEqual(forestPatchAddresses(center,radius,range),addresses,'deterministic priority');
  }
});
test('patch selector rejects invalid or unbounded work',()=>{
  for(const args of [[[0,0,0],1,0],[[1,0,0],0,1],[[1,0,0],100,11],[[1,0,0],1,NaN],[[1,0,0],1,0,0]])assert.throws(()=>forestPatchAddresses(...args));
  assert.throws(()=>forestPatchAddresses([1,0,0],6371000,4500,1),/residency limit/);
});
