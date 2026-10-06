// HARD: synthetic geometry only. No world, terrain, climate, LOD or M1 dependency.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {massifEnvelopeM as U,maxEnvelopeM,composeRidgeTermM,envelopeBlendWeight,massifBlendWeight,massifHalfWidthM,MASSIF_ENVELOPE as C,MASSIF_ENVELOPE_VERSION} from '../src/mountain-envelope.ts';
import {bandPowers,raster} from './helpers/mountain-metrics.mjs';

const R=6e6,W=C.MIN_HALF_WIDTH_M;
const synthetic=(d,w=W)=>{const distance=R*Math.asin(d[1]);return U(Math.abs(distance)<w?1:0,distance,w,1000,1,1,'water');};
function share(w,oblique=false,profile=null){
  const values=Float64Array.from({length:8192},(_,i)=>{
    const t=(i-4096)*250/R;
    const distance=oblique?R*Math.asin(Math.sin(t)*Math.SQRT1_2):(i-4096)*250;
    return profile?profile(distance,w):U(1,distance,w,1000,1,1,'water');
  });
  const p=bandPowers(values,250,{window:'none',detrend:false});
  return Math.sqrt(p.octave(0,32000)/p.total);
}
test('HARD: dense width sweep and oblique compact transect; narrow and box controls fail',()=>{
  const widths=[...Array.from({length:(80000-W)/1000+1},(_,i)=>W+i*1000),100000,150000,220000];
  const sweep=widths.map(w=>({halfWidthM:w,share:share(w)}));
  for(const r of sweep)assert.ok(r.share<.05,JSON.stringify(r));
  const oblique=share(W,true);assert.ok(oblique<.05);
  const bypass=(x,w)=>{const s=Math.abs(x)/w,p=1-s*s;return s<1?p*p*p:0;};
  const narrow=share(12000,false,bypass),box=share(W,false,(x,w)=>Math.abs(x)<w?1:0);
  assert.ok(narrow>.05);assert.ok(box>.05);
  console.log('BAND '+JSON.stringify({sweep,oblique,narrow,box}));
});
test('HARD: analytic maximum on dense parameter grid and great-circle raster',()=>{
  let count=0;
  for(const cls of ['water','dry'])for(let ti=0;ti<=20;ti++)for(let si=0;si<=120;si++)
    for(let bi=0;bi<=10;bi++)for(let li=0;li<=10;li++){
      const tau=ti/10,h=U(bi/10,W*si/100,W,1000,li/10,tau,cls);
      assert.ok(h>=0&&h<=maxEnvelopeM(tau,cls));count++;
    }
  const r=raster(d=>({groundHeightM:synthetic(d),ocean:false}),[1,0,0],R,193,2000);
  for(const h of r.h)assert.ok(h>=0&&h<=maxEnvelopeM(1,'water'));
  console.log('BOUND '+JSON.stringify({gridSamples:count,rasterSamples:r.h.length,violations:0}));
});
test('HARD: literal positive zero at every exclusion, and dry amplitude ignores tau',()=>{
  for(const d of [-1e9,-W,-W/2,0,W/2,W,1e9])for(const w of [0,12000,W,220000])
    for(const l of [0,.1,1])for(const tau of [0,.3,1,2])for(const cls of ['water','dry']){
      assert.ok(Object.is(U(0,d,w,1000,l,tau,cls),0));
      for(const a0 of [-1000,-0,0])assert.ok(Object.is(U(1,d,w,a0,l,tau,cls),0));
      if(w<W||Math.abs(d)>=w)assert.ok(Object.is(U(1,d,w,1000,l,tau,cls),0));
    }
  assert.ok(Object.is(U(1,0,W-1,1000,1,1,'water'),0));
  for(const tau of [0,.5,1,2])assert.equal(maxEnvelopeM(tau,'dry'),C.GAIN*1800);
});
test('HARD: outside composition preserves main bits; interior composition stays convex',()=>{
  let roundedAbove=0,maxRoundingM=0;
  for(const main of [0,-0,Number.MIN_VALUE,-Number.MIN_VALUE,1e-300,1/3,Number.MAX_VALUE,-Number.MAX_VALUE])
    {assert.ok(Object.is(composeRidgeTermM(main,0,0,W,0),main));
      // A width-gated belt carries no envelope and keeps main's bits at any belt value.
      for(const b of [1e-9,.3,1])for(const w of [0,12000,W-1])assert.ok(Object.is(composeRidgeTermM(main,b,0,w,U(b,0,w,1000,1,1,'water')),main));
      // massif-envelope-2: at or beyond the massif half-width (any belt width) main's bits are kept.
      for(const b of [1e-9,.3,1])for(const w of [W,C.MAX_HALF_WIDTH_M,100000,220000])for(const f of [1,1.5,4])
        for(const sign of [1,-1]){const x=sign*f*massifHalfWidthM(w);assert.ok(Object.is(composeRidgeTermM(main,b,x,w,U(b,x,w,1000,1,1,'water')),main));}}
  // Interior: (1 - w) main + U never exceeds max(main, the analytic maximum) and never goes negative, on
  // narrow, capped and wide belts, through the core and the edge fade (p^3 <= fade on s in [.65, 1]).
  for(const cls of ['water','dry'])for(const tau of [0,.1,.5,1,2])for(let b=0;b<=100;b+=5)for(const w of [W,40000,C.MAX_HALF_WIDTH_M,220000])
    for(const main of [0,1,100,1800,3640,7280])for(let si=0;si<=100;si++){
      const x=si/100*massifHalfWidthM(w),h=composeRidgeTermM(main,b/100,x,w,U(b/100,x,w,1000,1,tau,cls));
      const bound=Math.max(main,maxEnvelopeM(tau,cls));assert.ok(h>=0);
      if(h>bound){
        // The mandated literal blend can round one ULP above equal endpoints.
        assert.equal(main,maxEnvelopeM(tau,cls));
        assert.ok(h-bound<=2*Number.EPSILON*bound);roundedAbove++;maxRoundingM=Math.max(maxRoundingM,h-bound);
      }
    }
  console.log('CONVEX '+JSON.stringify({roundedAbove,maxRoundingM}));
});
test('HARD: massif-envelope-2 cap: one fixed-width massif on a wide belt; the weight fades to 0 at its edge',()=>{
  assert.equal(massifHalfWidthM(220000),C.MAX_HALF_WIDTH_M);assert.equal(massifHalfWidthM(40000),40000);
  for(const w of [100000,220000]){
    // Same profile as a belt exactly as wide as the cap, zero from the cap outward.
    for(let i=0;i<=300;i++){const x=i*1000;
      assert.equal(U(1,x,w,1000,1,1,'water'),U(1,x,C.MAX_HALF_WIDTH_M,1000,1,1,'water'));
      if(x>=C.MAX_HALF_WIDTH_M){assert.ok(Object.is(U(1,x,w,1000,1,1,'water'),0));assert.equal(massifBlendWeight(1,x,w),0);}}
  }
  // Weight: 1 through the core, monotone fade to 0 over [EDGE_FADE_START, 1) of the massif half-width.
  let last=1;for(let i=0;i<=1000;i++){const s=i/1000,v=massifBlendWeight(1,s*C.MAX_HALF_WIDTH_M,220000);
    if(s<=C.EDGE_FADE_START)assert.equal(v,1);assert.ok(v<=last);last=v;}
  assert.equal(massifBlendWeight(1,C.MAX_HALF_WIDTH_M,220000),0);assert.equal(massifBlendWeight(.25,0,220000),envelopeBlendWeight(.25));
  // Negative control: the v1 rule (profile over the whole belt half-width) is non-zero 120 km out on a 220 km belt.
  const v1=(x,w)=>{const s=Math.abs(x)/w,p=1-s*s;return s<1?3640*p*p*p:0;};
  assert.ok(v1(120000,220000)>0);assert.ok(Object.is(U(1,120000,220000,1000,1,1,'water'),0));
});
test('HARD: symmetric monotone profile, exact crown, C2 support and blend endpoints',()=>{
  for(const cls of ['water','dry']){
    let last=Infinity;
    for(let i=0;i<=2000;i++){
      const d=i*W/1000,h=U(1,d,W,1000,1,1,cls);
      assert.equal(h,U(1,-d,W,1000,1,1,cls));assert.ok(h<=last);last=h;
    }
    assert.equal(U(1,0,W,1000,1,1,cls),maxEnvelopeM(1,cls));
    // At the boundary, shrinking one-sided differences converge to zero.
    for(const e of [1e-3,1e-4,1e-5]){
      const v=U(1,W*(1-e),W,1000,1,1,cls)/maxEnvelopeM(1,cls);
      assert.ok(v/e<8*e*e&&v/(e*e)<8*e);
    }
  }
  assert.equal(envelopeBlendWeight(0),0);assert.equal(envelopeBlendWeight(.5),1);
  assert.equal(envelopeBlendWeight(1),1);
});
test('HARD: forward/reverse/child SHA256 agrees',()=>{
  function digest(reverse=false){const v=new Float64Array(4096);for(let j=0;j<v.length;j++){
    const i=reverse?v.length-1-j:j;v[i]=U(i%101/100,(i%301-150)*1000,80000,1000,i%11/10,i%21/10,i%2?'water':'dry');
  }return createHash('sha256').update(Buffer.from(v.buffer)).digest('hex');}
  const sha=digest();assert.equal(digest(true),sha);
  const child=spawnSync(process.execPath,['--input-type=module','-e',`
    import {createHash} from 'node:crypto';import {massifEnvelopeM as U} from './src/mountain-envelope.ts';
    const v=Float64Array.from({length:4096},(_,i)=>U(i%101/100,(i%301-150)*1000,80000,1000,i%11/10,i%21/10,i%2?'water':'dry'));
    process.stdout.write(createHash('sha256').update(Buffer.from(v.buffer)).digest('hex'));
  `],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
  assert.equal(child.status,0,child.stderr);assert.equal(child.stdout,sha);console.log('DIGEST '+sha);
});
function auditArithmetic(source){
  assert.doesNotMatch(source,/\bMath\s*\[|\*\*|\b(?:Number|BigInt|parseFloat|parseInt|isFinite|isNaN)\b|\.\s*(?:toFixed|toPrecision|toExponential)\b/);
  for(const m of source.matchAll(/\bMath\s*\.\s*(\w+)/g))assert.ok(['min','max','abs'].includes(m[1]),m[0]);
  assert.doesNotMatch(source.replace(/\bMath\s*\.\s*(?:min|max|abs)\b/g,''),/\bMath\b/);
}
test('HARD: arithmetic audit with negative controls, no imports, frozen versioned constants',()=>{
  const source=readFileSync(new URL('../src/mountain-envelope.ts',import.meta.url),'utf8');auditArithmetic(source);
  for(const bad of ['Math.sin(x)','Math.sqrt(x)','Math.pow(x,3)','x ** 3',"Math['abs'](x)",'Math.random()',
    'const alias=Math','Number.parseFloat(x)','parseFloat(x)','x.toFixed(2)'])assert.throws(()=>auditArithmetic(source+'\n'+bad),bad);
  assert.doesNotMatch(source,/\bimport\b|\bfrom\s*['"]/);
  assert.equal(MASSIF_ENVELOPE_VERSION,'massif-envelope-4');assert.ok(Object.isFrozen(C));
  assert.deepEqual(C,{GAIN:1,MIN_HALF_WIDTH_M:32000,MAX_HALF_WIDTH_M:48000,EDGE_FADE_START:.65,RIDGE_EQUIVALENT_WATER_M:3640,RIDGE_EQUIVALENT_DRY_M:1800,BLEND_BELT_FULL:.5,MIN_FEATURE_WAVELENGTH_M:32000});
});
