import test from 'node:test';
import assert from 'node:assert/strict';
import {FaunaLodTierSelection} from '../src/fauna-lod-tier-selection.ts';
const ordered=rows=>rows.slice().sort((a,b)=>a.distanceM-b.distanceM||a.id.localeCompare(b.id));
const closeIds=tiers=>[...tiers].filter(([,tier])=>tier==='close').map(([id])=>id).sort();
const context={planetId:'Anitar',lifeSignature:'dated-herd',dateVersion:'body4/date-later',appearanceVersion:'raw1'};

test('a crowded near cohort retains16 close owners through boundary jitter, but admits a substantially closer animal',()=>{
  const selection=new FaunaLodTierSelection(),rows=Array.from({length:17},(_,i)=>({id:`actor/${String(i).padStart(2,'0')}`,distanceM:45+i}));
  selection.setContext(context);const initial=closeIds(selection.select(ordered(rows))),border=rows[16];
  for(let frame=0;frame<100;frame++){border.distanceM=rows[15].distanceM+(frame%2?-.01:.01);assert.deepEqual(closeIds(selection.select(ordered(rows))),initial,'rank16/17 jitter must not trigger alternating cold body builds');}
  border.distanceM=40;const promoted=selection.select(ordered(rows));assert.equal(promoted.get(border.id),'close');assert.equal(promoted.get(rows[15].id),'middle');assert.equal(selection.reasonOf(border.id),'rank');
  selection.select(ordered(rows));assert.equal(selection.reasonOf(border.id),'rank','cause persists while a cold job is queued');
});

test('camera loss, distance exit and explicit context/hidden reset free slots without retaining old owners',()=>{
  const selection=new FaunaLodTierSelection(),rows=Array.from({length:17},(_,i)=>({id:`animal/${String(i).padStart(2,'0')}`,distanceM:60}));
  selection.setContext(context);assert.deepEqual(closeIds(selection.select(rows)),rows.slice(0,16).map(row=>row.id));
  rows[0].distanceM=96;const moved=selection.select(ordered(rows));assert.equal(moved.get(rows[0].id),'middle');assert.equal(moved.get(rows[16].id),'close');assert.equal(selection.reasonOf(rows[0].id),'distance');
  assert.equal(selection.select(rows.slice(1)).has(rows[0].id),false,'offscreen actor does not pin close selection');
  const at80=rows.slice(1).map(row=>({...row,distanceM:80}));assert.equal(closeIds(selection.select(at80)).length,16);
  selection.setContext({...context,dateVersion:'body4/date-earlier'});assert.equal(closeIds(selection.select(at80)).length,0,'reversed date context starts without stale ownership');
  selection.select(rows);selection.clear();assert.equal(closeIds(selection.select(at80)).length,0,'hidden/XR clear starts without stale ownership');
});

test('large camera census leaves input/order intact and remains bounded16close+112middle',()=>{
  const selection=new FaunaLodTierSelection(),rows=Array.from({length:400},(_,i)=>({id:`id/${i}`,distanceM:i<20?50:120})),before=rows.map(row=>({...row}));
  const assigned=selection.select(rows);assert.equal(assigned.size,128);assert.equal(closeIds(assigned).length,16);assert.deepEqual(rows,before);
  const far=Array.from({length:128},(_,i)=>({id:`far/${i}`,distanceM:150}));const other=selection.select(far);assert.equal(other.size,112);assert.equal(closeIds(other).length,0);assert.equal(other.has('id/0'),false);
});

test('128 slightly closer middle animals cannot expel retained close owners without the20percent advantage',()=>{
  const selection=new FaunaLodTierSelection(),owners=Array.from({length:16},(_,i)=>({id:`retained/${i}`,distanceM:60}));selection.select(owners);
  const crowded=[...Array.from({length:128},(_,i)=>({id:`new/${i}`,distanceM:80})),...owners.map(row=>({...row,distanceM:85}))];
  const assigned=selection.select(crowded);assert.equal(assigned.size,128);for(const owner of owners)assert.equal(assigned.get(owner.id),'close');
});
