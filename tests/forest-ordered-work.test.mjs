import test from 'node:test';
import assert from 'node:assert/strict';
import {ForestOrderedWorkIndex} from '../src/forest-ordered-work.ts';

const cell=(x,y=0)=>({id:`0/128/${x}/${y}`});
const patch=id=>{const [face,n,x,y]=id.split('/').map(Number);return `${face}/${n}/${Math.floor(x/8)}/${Math.floor(y/8)}`;};

test('active indices retain the original canonical order as distant patches become owned',()=>{
  const cells=[cell(0),cell(8),cell(1),cell(9),cell(16),cell(2),cell(17),cell(10)];
  const index=new ForestOrderedWorkIndex(patch);index.setSelection(cells);
  assert.deepEqual(index.updateSkipped(new Set()),cells.map((_,i)=>i));
  const first=index.diagnostics().rebuilds;
  const active=index.updateSkipped(new Set([patch(cells[1].id),patch(cells[4].id)]));
  assert.deepEqual(active,[0,2,5]);
  assert.deepEqual(active.map(i=>cells[i].id),[cells[0].id,cells[2].id,cells[5].id]);
  assert.deepEqual(index.newlySkippedIds(),[cells[1].id,cells[3].id,cells[7].id,cells[4].id,cells[6].id]);
  index.updateSkipped(new Set([patch(cells[1].id),patch(cells[4].id)]));
  assert.equal(index.diagnostics().rebuilds,first+1,'unchanged census readiness reuses the ordered list');
  assert.deepEqual(index.newlySkippedIds(),[]);
});

test('a census fallback reintroduces whole patches without changing source order',()=>{
  const cells=[cell(0),cell(8),cell(1),cell(9),cell(2)],index=new ForestOrderedWorkIndex(patch);
  index.setSelection(cells);
  index.updateSkipped(new Set([patch(cells[1].id)]));
  assert.deepEqual(index.updateSkipped(new Set()),[0,1,2,3,4]);
  assert.deepEqual(index.newlySkippedIds(),[],'a formerly skipped patch becoming unavailable does not clear unrelated state');
  assert.deepEqual(index.updateSkipped(new Set()),[0,1,2,3,4]);
  assert.equal(index.diagnostics().skippedCells,0);
});

test('selection replacement resets retained work and stale skip keys',()=>{
  const index=new ForestOrderedWorkIndex(patch);index.setSelection([cell(0),cell(8)]);
  index.updateSkipped(new Set([patch(cell(8).id)]));
  index.setSelection([cell(16),cell(1),cell(17)]);
  assert.deepEqual(index.updateSkipped(new Set()),[0,1,2]);
  assert.deepEqual(index.newlySkippedIds(),[]);
  assert.equal(index.diagnostics().skippedGroups,0);
});
