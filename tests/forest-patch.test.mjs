import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {populationCellAt,forestPopulationCells} from '../src/planet-population.ts';
import {forestPatch,summarizeForestPatch,FOREST_PATCH_SIDE} from '../src/forest-patch.ts';

test('address extraction preserves the previous forest selection digest',()=>{
  const cells=[[0,0,1],[1,1,0],[1,1,1]].map(v=>{
    const l=Math.hypot(...v);return forestPopulationCells('PATCH-BASELINE',v.map(x=>x/l),3200,250,700,18);
  });
  assert.equal(createHash('sha256').update(JSON.stringify(cells)).digest('hex'),'2850d5e0bafefdd39f1469d4b5c2d75d803080dc0a1a6e32be2cb690996624e8');
  for(const group of cells)for(const cell of group){
    const [face,n,x,y]=cell.id.split('/').map(Number),direct=populationCellAt('PATCH-BASELINE',face,n,x,y);
    assert.deepEqual({...cell,distanceM:0,canopyRepresentative:undefined},{...direct,canopyRepresentative:undefined});
  }
});

test('bounded patches partition all six faces exactly including clipped edge patches',()=>{
  const seed='PATCH',n=19,ids=new Set();let tested=0;
  for(let face=0;face<6;face++)for(let y=0;y<Math.ceil(n/FOREST_PATCH_SIDE);y++)for(let x=0;x<Math.ceil(n/FOREST_PATCH_SIDE);x++){
    const p=forestPatch(seed,{face,n,x,y});assert.ok(p.testedCells<=64);tested+=p.testedCells;
    assert.deepEqual(p,forestPatch(seed,{y,x,n,face}));
    for(const c of p.cells){assert.ok(!ids.has(c.id));ids.add(c.id);}
  }
  assert.equal(tested,6*n*n);
  const expected=new Set();
  for(let face=0;face<6;face++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const c=populationCellAt(seed,face,n,x,y);if(c)expected.add(c.id);
  }
  assert.deepEqual(ids,expected);
  assert.throws(()=>forestPatch(seed,{face:6,n,x:0,y:0}));
  assert.throws(()=>forestPatch(seed,{face:0,n,x:3,y:0}));
});

test('summary distinguishes unknown habitat from empty land and preserves height datum',()=>{
  const p=forestPatch('PATCH',{face:0,n:80,x:5,y:5}),samples=new Map();
  assert.ok(p.cells.length>0);
  assert.equal(summarizeForestPatch(p,samples).complete,false);
  for(const cell of p.cells)samples.set(cell.id,{present:false,groundHeightM:100});
  assert.deepEqual(summarizeForestPatch(p,samples),{key:p.key,complete:true,candidates:p.cells.length,resolved:p.cells.length,trees:0,minGroundM:null,maxNominalTopM:null,meanTreeHeightM:null});
  const c=p.cells[0];samples.set(c.id,{present:true,groundHeightM:120});
  const s=summarizeForestPatch(p,samples);assert.equal(s.trees,1);assert.equal(s.minGroundM,120);assert.equal(s.maxNominalTopM,120+c.heightM);
  assert.equal(s.meanTreeHeightM,c.heightM);
  assert.deepEqual(s,summarizeForestPatch(p,new Map([...samples].reverse())));
  assert.notEqual(p.key,forestPatch('OTHER',p.address).key);
  samples.set(c.id,{present:true,groundHeightM:NaN});assert.throws(()=>summarizeForestPatch(p,samples));
});
