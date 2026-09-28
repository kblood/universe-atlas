import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';

const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {PlanetCanopy}=await vite.ssrLoadModule('/src/planet-canopy.ts');
const {galaxies,refByAddress,system}=await vite.ssrLoadModule('/src/catalog.ts');
const body=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];
after(()=>vite.close());

test('patch invalidation snapshots acknowledge only versions actually consumed',()=>{
  const canopy=new PlanetCanopy(body);
  try{
    canopy.invalidateCurrentPatchAnswers('0/128/0/0');
    const first=canopy.currentPatchChanges();
    assert.deepEqual(first.keys.map(([key])=>key),['0/128/0/0']);
    canopy.invalidateCurrentPatchAnswers('0/128/0/0');
    canopy.acknowledgeCurrentPatchChanges(first);
    const newer=canopy.currentPatchChanges();
    assert.equal(newer.keys.length,1,'a later edit of the same key survives the older acknowledgement');
    assert.ok(newer.keys[0][1]>first.keys[0][1]);
    canopy.acknowledgeCurrentPatchChanges(newer);
    assert.deepEqual(canopy.currentPatchChanges().keys,[]);
  }finally{canopy.dispose();}
});

test('global invalidation advances the epoch and supersedes pending local keys',()=>{
  const canopy=new PlanetCanopy(body);
  try{
    canopy.invalidateCurrentPatchAnswers('0/128/0/0');
    const old=canopy.currentPatchChanges();
    canopy.invalidateCurrentPatchAnswers();
    canopy.invalidateCurrentPatchAnswers('1/128/0/0');
    canopy.acknowledgeCurrentPatchChanges(old);
    const current=canopy.currentPatchChanges();
    assert.ok(current.globalRevision>old.globalRevision);
    assert.deepEqual(current.keys.map(([key])=>key),['1/128/0/0']);
  }finally{canopy.dispose();}
});

test('an unconsumed local-key journal is bounded by escalating to a full-reset epoch',()=>{
  const canopy=new PlanetCanopy(body);
  try{
    const initial=canopy.currentPatchChanges().globalRevision;
    for(let i=0;i<8193;i++)canopy.invalidateCurrentPatchAnswers(`0/128/${i}/0`);
    const overflow=canopy.currentPatchChanges();
    assert.ok(overflow.globalRevision>initial,'overflow requests a safe global refresh');
    assert.equal(overflow.keys.length,0,'the global reset replaces an unbounded per-key backlog');
    assert.equal(overflow.revision,8193);
  }finally{canopy.dispose();}
});
