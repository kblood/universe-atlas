import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {SURFACE_SITE_ARRIVAL_M,surfaceSiteReached} from '../src/surface-navigation.ts';

test('named-site arrival has the same 100 m bound on small and large bodies',()=>{
  assert.equal(SURFACE_SITE_ARRIVAL_M,100);
  for(const radiusM of [1000,50000,5194907.072465867,6371000,70000000]){
    for(const distanceM of [0,1,99,100])assert.equal(surfaceSiteReached(distanceM/radiusM,radiusM),true,`${distanceM} m at radius ${radiusM}`);
    for(const distanceM of [100.01,2000,9112,10389])assert.equal(surfaceSiteReached(distanceM/radiusM,radiusM),false,`${distanceM} m at radius ${radiusM}`);
  }
});

test('Gale Shore 9.1 km counterexample no longer counts as arrival',()=>{
  const angle=.0017540867335952646,radius=5194907.072465867;
  assert.ok(angle<.002,'old angular gate incorrectly accepts the observed landing');
  assert.equal(surfaceSiteReached(angle,radius),false);
  assert.equal(surfaceSiteReached(.002,5000),true,'the same angle is only 10 m on a small body');
  assert.equal(surfaceSiteReached(.002,70000000),false,'the same angle is 140 km on a large body');
});

test('existing bounded quaternion stepping converges at the tighter physical arrival bound',()=>{
  const target=new THREE.Vector3(1,0,0);
  for(const radiusM of [1000,5194907.072465867,70000000])for(const dt of [1/120,1/60,.25]){
    const radial=new THREE.Vector3(Math.cos(1.5),Math.sin(1.5),0);
    let frames=0;
    while(!surfaceSiteReached(radial.angleTo(target),radiusM)&&frames++<2000){
      const angle=radial.angleTo(target),rotation=new THREE.Quaternion().setFromUnitVectors(radial,target);
      rotation.slerp(new THREE.Quaternion(),1-Math.min(1,dt*.35/angle));
      radial.applyQuaternion(rotation);
    }
    assert.ok(frames<2000,'no stall near the arrival boundary');
    assert.ok(radial.angleTo(target)*radiusM<=100.001,'final residual is at most 100 m');
  }
});

test('invalid geometry cannot announce arrival and main wires the physical rule to both gates',()=>{
  for(const [angle,radius] of [[NaN,1],[Infinity,1],[-1,1],[0,NaN],[0,0],[0,-1]])assert.equal(surfaceSiteReached(angle,radius),false);
  const source=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
  const journey=source.slice(source.indexOf('if (surfaceJourney && residentSystem)'),source.indexOf('if (planetLook)',source.indexOf('if (surfaceJourney && residentSystem)')));
  assert.match(journey,/surfaceSiteReached\(angle,body\.radiusM\)/);
  assert.match(journey,/radius>body\.radiusM\+30000 && !arrived/);
  assert.match(journey,/if\(arrived && radius>body\.radiusM\+30000\)/);
  assert.doesNotMatch(journey,/\.002/);
});
