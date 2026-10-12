import test from 'node:test';
import assert from 'node:assert/strict';
import {faunaFlightActivityAtWorldNs} from '../src/fauna-runtime.ts';

const member={id:'flight-test',anchorOffsetX:2,anchorOffsetZ:-3,orbitRadiusM:5,orbitAngularSpeed:.15,orbitPhase:.2,gaitPeriodS:1};
test('airborne paths move continuously and remain exact-date seek independent',()=>{
  const date=123456789012345678901234567890n;
  const a=faunaFlightActivityAtWorldNs(member,date),b=faunaFlightActivityAtWorldNs(member,date+100000000n);
  assert.notDeepEqual(a.pose,b.pose);
  assert.equal(a.pose.gait,'walk');
  assert.ok(Math.abs(Math.hypot(a.pose.x-2,a.pose.z+3)-5)<1e-12);
  faunaFlightActivityAtWorldNs(member,-date);
  assert.deepEqual(faunaFlightActivityAtWorldNs(member,date),a);
  for(const d of [-date,date,0n]){
    const p=faunaFlightActivityAtWorldNs(member,d);
    assert.ok(p.travel>=0&&p.travel<1);
    assert.ok(Object.values(p.pose).filter(x=>typeof x==='number').every(Number.isFinite));
  }
});
