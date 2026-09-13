import {test} from 'node:test';
import assert from 'node:assert/strict';
import {oceanPatchCullProof} from '../src/ocean-patch-culling.ts';

const ocean=new Float32Array([-.1,-.1,0,.1,-.1,0,-.1,.1,0]);
const shifted=z=>new Float32Array([-.1,-.1,z,.1,-.1,z,-.1,.1,z]);
const input=(child,parent=child)=>({positions:shifted(child),parents:shifted(parent),oceanPositions:ocean,oceanParents:ocean,baseVertices:3,anchorDir:[0,0,1],radiusM:1000,epsilonM:.002});
test('culls only when the complete child/parent local metre intervals separate',()=>{
  const proof=oceanPatchCullProof(input(.01,.004));assert.equal(proof.canCull,true);assert.equal(proof.reason,'separated');assert.ok(proof.groundMinM>proof.oceanMaxM+2);
  // A dry child cannot justify culling when an unlocked or locked parent
  // endpoint overlaps the ocean interval during the terrain morph.
  const unsafe=oceanPatchCullProof(input(.01,-.001));assert.equal(unsafe.canCull,false);assert.equal(unsafe.reason,'overlap');
});
test('uses only base vertices, never terrain skirt samples',()=>{
  const ground=new Float32Array([-.1,-.1,.01,.1,-.1,.01,-.1,.1,.01,0,0,-10]);
  const proof=oceanPatchCullProof({...input(.01),positions:ground,parents:ground,baseVertices:3});
  assert.equal(proof.canCull,true,'an inward terrain skirt must not prevent ocean-grid culling');
});
