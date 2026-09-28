import test from 'node:test';
import assert from 'node:assert/strict';
import {forestPresentationFamily,packForestPresentation,unpackForestPresentation} from '../src/forest-presentation.ts';

test('presentation eligibility uses the supplied dated binding and loaded family set',()=>{
  const branching={recipe:{family:'branching'}},spire={recipe:{family:'spire'}},empty=new Set(),oak=new Set(['branching']),both=new Set(['branching','spire']);
  for(const height of [10,16,22]){
    assert.equal(forestPresentationFamily(branching,height,oak),'branching');assert.equal(forestPresentationFamily(spire,height,oak),null);
    assert.equal(forestPresentationFamily(spire,height,both),'spire');assert.equal(forestPresentationFamily(branching,height,empty),null);
    assert.equal(forestPresentationFamily(null,height,both),null);
  }
  for(const height of [NaN,Infinity,-1,9.99,22.01])assert.equal(forestPresentationFamily(branching,height,both),null);
});
test('family brightness codes survive float storage and decode within one quantization half-step',()=>{
  assert.deepEqual(unpackForestPresentation(0),{kind:null,bark:1,foliage:1,variant:0});
  for(const kind of ['branching','spire'])for(let i=0;i<=1000;i++){
    const bark=.8+.4*i/1000,foliage=.8+.4*(1000-i)/1000,code=packForestPresentation(kind,bark,foliage);
    assert.equal(Math.fround(code),code);const value=unpackForestPresentation(code);
    assert.equal(value.kind,kind);assert.ok(Math.abs(value.bark-bark)<=.2/255+1e-12);assert.ok(Math.abs(value.foliage-foliage)<=.2/255+1e-12);
    // Same decode expressions used by GLSL, evaluated with float precision.
    assert.equal(code%4,kind==='branching'?1:2);
    assert.ok(Math.abs(Math.fround(.8+Math.floor(code/1024)*(.4/255))-value.bark)<1e-6);
  }
});
test('malformed packed data and out-of-contract tint ranges are rejected',()=>{
  for(const code of [-1,.5,3,4,262143,262144*8+1,NaN,Infinity])assert.throws(()=>unpackForestPresentation(code));
  for(const args of [['other',1,1],['branching',0,1],['spire',1,2],['spire',NaN,1],['spire',1,1,8],['spire',1,1,-1],['spire',1,1,.5]])assert.throws(()=>packForestPresentation(...args));
});
test('structural variant bits decode independently of family and brightness',()=>{
  for(const kind of ['branching','spire'])for(let variant=0;variant<8;variant++)for(const [bark,foliage] of [[.8,1.2],[1.2,.8],[1,1]]){
    const code=packForestPresentation(kind,bark,foliage,variant),value=unpackForestPresentation(code);
    assert.equal(Math.fround(code),code);assert.ok(code<2**21);
    assert.equal(value.kind,kind);assert.equal(value.variant,variant);
    assert.ok(Math.abs(value.bark-bark)<=.2/255+1e-12);assert.ok(Math.abs(value.foliage-foliage)<=.2/255+1e-12);
    // GLSL decode expressions in float precision.
    const f=Math.fround(code);
    assert.equal(Math.floor(f/262144),variant);assert.equal(f%4,kind==='branching'?1:2);
    assert.ok(Math.abs(.8+(Math.floor(f/1024)%256)*(.4/255)-value.bark)<1e-6);
  }
});
