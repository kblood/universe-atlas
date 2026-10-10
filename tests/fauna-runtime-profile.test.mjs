import test from 'node:test';
import assert from 'node:assert/strict';
import {FaunaRuntimeProfile} from '../src/fauna-runtime-profile.ts';
test('disabled profiling never reads the clock; snapshots cannot mutate counters',()=>{
  const profile=new FaunaRuntimeProfile(false,()=>{throw new Error('disabled timer');});
  profile.end('ground',profile.start());profile.frame();
  assert.equal(profile.snapshot().frames,0);assert.equal(profile.snapshot().phases.ground.calls,0);
});
test('phase totals retain sample counts and timing across frames',()=>{
  let clock=0;const profile=new FaunaRuntimeProfile(true,()=>clock);
  profile.frame();const start=profile.start();clock=3;profile.end('pose',start);
  profile.frame();clock=4;const next=profile.start();clock=6;profile.end('pose',next);
  const snapshot=profile.snapshot();assert.equal(snapshot.frames,2);assert.deepEqual(snapshot.phases.pose,{calls:2,ms:5});
  snapshot.phases.pose.calls=99;assert.equal(profile.snapshot().phases.pose.calls,2);
});
