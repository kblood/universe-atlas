import test from 'node:test';
import assert from 'node:assert/strict';
import {ForestPatchBroadphase,FOREST_PATCH_BROADPHASE_MARGIN_M} from '../src/forest-patch-broadphase.ts';
import {forestCellPatchKey} from '../src/planet-canopy.ts';

const keyFor=forestCellPatchKey;
const cell=(x,y=0,face=0,n=128)=>({id:`${face}/${n}/${x}/${y}`,direction:[1,0,0],roll:.2,heightM:16,yaw:0,distanceM:0});
const roots=(cells,groundHeightM=0,water=0)=>new Map(cells.map(c=>[c.id,{groundHeightM,water}]));
const broad=(cells,resolved,water=0,radius=6371000)=>{const index=new ForestPatchBroadphase(radius,keyFor);index.setSelection(cells,water,c=>resolved.get(c.id));return index;};
const oracle=(cells,resolved,water,eye,current,threshold=650)=>{
  const groups=new Map();for(const c of cells){const key=keyFor(c.id);let g=groups.get(key);if(!g)groups.set(key,g=[]);g.push(c);}
  const out=new Set();for(const [key,members] of groups){if(!current(key))continue;
    const points=[];for(const c of members){const root=resolved.get(c.id);if(!root||root.water!==water){points.length=0;break;}
      const r=6371000+root.groundHeightM;points.push([c.direction[0]*r,c.direction[1]*r,c.direction[2]*r]);}
    if(points.length!==members.length)continue;
    if(points.every(p=>Math.hypot(eye[0]-p[0],eye[1]-p[1],eye[2]-p[2])>=threshold+FOREST_PATCH_BROADPHASE_MARGIN_M))out.add(key);
  }return out;
};
const asSet=x=>[...x].sort();

function fixture(){
  const cells=[];
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){
    const angle=(x<8?0:.002)+(y<8?0:.002);cells.push({...cell(x,y),direction:[Math.cos(angle),Math.sin(angle),0]});
  }
  return cells;
}

test('group skip agrees with per-cell oracle across movement, patch validity and global cell order',()=>{
  const cells=fixture(),resolved=roots(cells),index=broad(cells,resolved),current=key=>key.endsWith('/0/0')||key.endsWith('/1/0');
  for(const eye of [[6371000+1000,0,0],[6371000+400,0,0],[6371000-900,0,0],[0,6371000+1200,0]]){
    const actual=index.skipPatchKeys(eye,0,current),expected=oracle(cells,resolved,0,eye,current);
    assert.deepEqual(asSet(actual),asSet(expected));
    const remaining=cells.filter(c=>!actual.has(keyFor(c.id)));
    assert.deepEqual(remaining.map(c=>c.id),cells.filter(c=>!expected.has(keyFor(c.id))).map(c=>c.id),
      'unskipped cells preserve canonical input iteration order');
  }
});

test('partial, stale-water, invalidated-hydrology and unavailable-census groups always fall back',()=>{
  const cells=fixture(),resolved=roots(cells),eye=[6371000+3000,0,0],all=()=>true;
  for(const kind of ['partial','water','hydrology','census']){
    const values=new Map(resolved),affected=keyFor(cells[0].id);
    if(kind==='partial')for(const c of cells)if(keyFor(c.id)===affected)values.delete(c.id);
    if(kind==='water')for(const c of cells)if(keyFor(c.id)===affected)values.set(c.id,{groundHeightM:0,water:5});
    const index=broad(cells,values,0);if(kind==='hydrology')index.invalidate();
    const current=kind==='census'?()=>false:all;
    const skipped=index.skipPatchKeys(eye,0,current);
    if(kind==='partial'||kind==='water')assert.equal(skipped.has(affected),false,`${kind} patch must retain full per-cell fallback`);
    else assert.equal(skipped.size,0,`${kind} invalidation keeps all patches on fallback`);
    assert.ok(index.diagnostics().lastFullScan.invalidatedGroups>0||kind==='census');
  }
});

test('water changes, habitat replacements, and later arrivals rebuild conservative bounds before skipping',()=>{
  const cells=fixture(),values=roots(cells),index=broad(cells,values),eye=[6371000+3000,0,0],all=()=>true;
  assert.ok(index.skipPatchKeys(eye,0,all).size>0);
  index.setWater(10);assert.equal(index.skipPatchKeys(eye,10,all).size,0);
  for(const c of cells)index.updateResident(c.id,{groundHeightM:0,water:10});
  assert.deepEqual(asSet(index.skipPatchKeys(eye,10,all)),asSet(oracle(cells,roots(cells,0,10),10,eye,all)));
  // Moving one root outward forces a conservative bound rebuild; it may expand
  // but can never produce an unsafe skip. Returning it restores exact oracle.
  index.updateResident(cells[0].id,{groundHeightM:2500,water:10});
  const moved=new Map(roots(cells,0,10));moved.set(cells[0].id,{groundHeightM:2500,water:10});
  assert.deepEqual(asSet(index.skipPatchKeys(eye,10,all)),asSet(oracle(cells,moved,10,eye,all)));
  index.invalidate();assert.equal(index.skipPatchKeys(eye,10,all).size,0);
  for(const c of cells)index.updateResident(c.id,{groundHeightM:0,water:10});
  assert.ok(index.skipPatchKeys(eye,10,all).size>0,'a fully refreshed group can be skipped again');
});

test('selection replacement drops old keys and a census arriving after a miss enables only fresh skips',()=>{
  const cells=fixture(),values=roots(cells),index=broad(cells,values),eye=[6371000+2000,0,0];
  assert.equal(index.skipPatchKeys(eye,0,()=>false).size,0);
  assert.ok(index.skipPatchKeys(eye,0,()=>true).size>0,'late current census makes an otherwise-ready group skippable');
  const replacement=cells.filter(c=>Number(c.id.split('/')[2])>=8);
  index.setSelection(replacement,0,c=>values.get(c.id));
  const current=index.skipPatchKeys(eye,0,()=>true);
  assert.ok(current.size>0);assert.ok([...current].every(key=>replacement.some(c=>keyFor(c.id)===key)));
  assert.equal(index.patchKeyForCell(cells[0].id),undefined);
});

test('invalid inputs fail closed and diagnostics report bounds readiness',()=>{
  assert.throws(()=>new ForestPatchBroadphase(NaN,keyFor));
  const cells=fixture(),values=roots(cells),index=broad(cells,values),eye=[6371000+2000,0,0];
  assert.throws(()=>index.skipPatchKeys([NaN,0,0],0,()=>true));
  assert.throws(()=>index.skipPatchKeys(eye,0,()=>true,-1));
  const keys=index.skipPatchKeys(eye,0,()=>true);assert.ok(keys.size>0);
  const stats=index.diagnostics();assert.equal(stats.lastFullScan.readyGroups,stats.groups);assert.equal(stats.lastFullScan.skippedGroups,keys.size);assert.ok(stats.lastFullScan.skippedCells>0);
});

test('distance boundary uses the conservative margin and never skips an inside group',()=>{
  const c=cell(0),index=broad([c],roots([c])),current=()=>true,radius=6371000;
  const inside=[radius+650+FOREST_PATCH_BROADPHASE_MARGIN_M-.01,0,0];
  const outside=[radius+650+FOREST_PATCH_BROADPHASE_MARGIN_M+.01,0,0];
  assert.equal(index.skipPatchKeys(inside,0,current).size,0);
  assert.equal(index.skipPatchKeys(outside,0,current).size,1);
});

test('local resident edits re-evaluate only their patch and stale roots become non-skippable',()=>{
  const cells=fixture(),values=roots(cells),index=broad(cells,values),eye=[6371000+3000,0,0],all=()=>true;
  const before=index.skipPatchKeys(eye,0,all),affected=keyFor(cells[0].id);
  assert.ok(before.has(affected));
  index.updateResident(cells[0].id,{groundHeightM:3000,water:0});values.set(cells[0].id,{groundHeightM:3000,water:0});
  const dirty=index.dirtyGroups();assert.deepEqual(dirty,[affected]);
  const states=index.skipStatesFor(dirty,eye,0,all);
  assert.deepEqual([...states.keys()],[affected]);assert.equal(states.get(affected),false);
  const after=new Set(before);for(const [key,skip] of states)skip?after.add(key):after.delete(key);
  assert.deepEqual(asSet(after),asSet(oracle(cells,values,0,eye,all)));
  index.acknowledgeDirtyGroups(dirty);assert.deepEqual(index.dirtyGroups(),[]);

  index.updateResident(cells[0].id,null);
  const unresolved=index.skipStatesFor(index.dirtyGroups(),eye,0,all);
  assert.equal(unresolved.get(affected),false,'a missing root immediately restores per-cell fallback');
  index.setWater(5);
  assert.equal(index.skipStatesFor([affected],eye,5,all).get(affected),false,'stale-water roots never skip');
});
