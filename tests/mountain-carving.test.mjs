// HARD: M3 carving F (mountain-carving-2), synthetic element only. No world, climate, LOD,
// GPU or timing gate. Memo/halo/seam purity: tests/mountain-carving-memo.test.mjs.
// Metric pin: tests/mountain-carving-pin.test.mjs. Rejected rounds 1-5 (A2, B, C, E) are
// frozen in tests/fixtures/mountain-carving-r5-rejected.ts.txt; their numbers are in
// docs/mountain-carving-*-v1.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {stripTypeScriptTypes} from 'node:module';
import {carvingFM,ridgeValleyCarvingM,MOUNTAIN_CARVING as C,MOUNTAIN_CARVING_VERSION,CARVING_BANDS,carvingBuildStats} from '../src/mountain-carving.ts';
import {raster,rasterFromArray,carvingStructure,depressions,depressionPits,MOUNTAIN_THRESHOLDS} from './helpers/mountain-metrics.mjs';
import {buildErodedControl,ERODED_CONTROL,ERODED_CONTROL_VERSION} from './helpers/mountain-eroded-control.mjs';
import {carvingDigest,carvingDigestArgs,CARVING_F_DIGEST} from './helpers/mountain-carving-digest.mjs';
import {R,SITES,rampArgs} from '../scripts/mountain-render-carving.mjs';

const SOURCE=readFileSync(new URL('../src/mountain-carving.ts',import.meta.url),'utf8');
const loadVariant=(edit=s=>s,exports='')=>import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(edit(SOURCE)+'\n'+exports)).toString('base64'));

test('HARD: literal positive zero at exclusions',()=>{
  const before=carvingBuildStats.count;
  for(const fn of [carvingFM,ridgeValleyCarvingM])for(const x of [-1e7,-125,0,125,1e7])for(const seed of [0,730201,0xffffffff]){
    for(const y of [-48000,0,48000])assert.ok(Object.is(fn(x,y,30000,3000,0,seed),0));
    for(const y of [-30000,30000,-30000.5,45000])assert.ok(Object.is(fn(x,y,30000,3000,1,seed),0));
    for(const h of [-100,-0,0])assert.ok(Object.is(fn(x,0,30000,h,1,seed),0));
    for(const bad of [[x,NaN,30000,3000],[x,0,NaN,3000],[x,0,30000,NaN],[NaN,0,30000,3000],[Infinity,0,30000,3000],[x,0,-5,3000]])assert.ok(Object.is(fn(...bad,1,seed),0));
  }
  assert.equal(carvingBuildStats.count,before,'exclusions never solve a block');
});
test('HARD: coast safety and bounds including the zero-envelope margin',()=>{
  let violations=0,samples=0,carved=0;
  raster(d=>{const a=rampArgs(d),v=ridgeValleyCarvingM(...a);samples++;if(v<0)carved++;
    if(!(v<=0&&a[3]+v>=0&&v>=-a[3]))violations++;
    if(a[4]===0&&!Object.is(v,0))violations++;
    return {groundHeightM:a[3]+v,ocean:false};},SITES[0].d,R,129,500);
  assert.equal(violations,0);assert.ok(carved>samples/2,'the belt is actually carved');
});
test('HARD: cold, warm, reverse and child-process SHA-256 agree with the pin',()=>{
  const before=carvingBuildStats.count,cold=carvingDigest(carvingFM),built=carvingBuildStats.count-before;
  const warm=carvingDigest(carvingFM),reverse=carvingDigest(carvingFM,carvingDigestArgs().map((_,i)=>4095-i));
  assert.equal(carvingBuildStats.count-before,built,'warm and reverse passes hit the memo');
  assert.equal(cold,CARVING_F_DIGEST);assert.equal(warm,cold);assert.equal(reverse,cold);
  const child=spawnSync(process.execPath,['--input-type=module'],{cwd:new URL('..',import.meta.url),encoding:'utf8',input:`
    import {carvingFM} from './src/mountain-carving.ts';
    import {carvingDigest} from './tests/helpers/mountain-carving-digest.mjs';
    process.stdout.write(carvingDigest(carvingFM));`});
  assert.equal(child.status,0,child.stderr);assert.equal(child.stdout,cold);
  for(let i=0;i<100;i++){const a=[i*173,-i*91,30000,2500,1,730201];assert.equal(ridgeValleyCarvingM(...a),carvingFM(...a));}
  console.log('DIGEST '+JSON.stringify({sha256:cold,builds:built}));
});
function audit(source){
  assert.doesNotMatch(source,/\bMath\s*\[|\*\*|\b(?:Number|BigInt|parseFloat|parseInt|isFinite|isNaN|Date|eval|Function)\b|\.\s*(?:toFixed|toPrecision|toExponential)\b/);
  for(const m of source.matchAll(/\bMath\s*\.\s*(\w+)/g))assert.ok(['floor','sqrt','imul','min','max','abs'].includes(m[1]),m[0]);
  assert.doesNotMatch(source.replace(/\bMath\s*\.\s*(?:floor|sqrt|imul|min|max|abs)\b/g,''),/\bMath\b/);
  const imports=/\bimport\s*\{[^}]*\}\s*from\s*['"](?:\.\/det-math\.ts|\.\/catalog\.ts)['"];?/g;
  assert.doesNotMatch(source.replace(imports,''),/\bimport\b|\bfrom\s*['"]|\brequire\s*\(/);
}
test('HARD: arithmetic audit with negative controls',()=>{
  audit(SOURCE);
  for(const bad of ['Math.sin(x)','Math.cos(x)','Math.exp(x)','Math.log(x)','Math.pow(x,2)','Math.atan(x)','Math.atan2(y,x)','Math.hypot(x,y)','Math.cbrt(x)','Math.SQRT2','x ** 3',"Math['abs'](x)",'Math.random()','const alias=Math','Number(x)','parseFloat(x)','x.toFixed(2)',"import {x} from './terrain.ts';","import('./catalog.ts')",'Date.now()'])assert.throws(()=>audit(SOURCE+'\n'+bad),assert.AssertionError,'audit misses '+bad);
});
test('HARD: frozen versioned constants and level bands',()=>{
  assert.equal(MOUNTAIN_CARVING_VERSION,'mountain-carving-2');assert.ok(Object.isFrozen(C));
  assert.deepEqual(C,{METHOD:'F',ROWS:480,CORE:128,HALO:192,CACHE:32,REFERENCE_M:3000,TILT:1.3,NOISE_AMP_M:400,NOISE_LAMBDA_M:8000,OCTAVES:6,GAIN:0.6,
    HILL_SLOPE:1,FOOT_M:1500,CHANNEL_AREA_M2:600000,K:33,EPSILON_M:0.000001,NORM_DILATE:8,NORM_BLUR_A:4,NORM_BLUR_B:4});
  assert.ok(C.NORM_BLUR_A+C.NORM_BLUR_B<=C.NORM_DILATE&&C.HALO>=C.NORM_DILATE+C.NORM_BLUR_A+C.NORM_BLUR_B);
  assert.ok(Object.isFrozen(CARVING_BANDS));assert.equal(CARVING_BANDS.length,5);
  for(const [level,b] of CARVING_BANDS.entries()){assert.ok(Object.isFrozen(b));assert.deepEqual(b,{level,wavelengthM:16000/2**level});}
  assert.equal(ERODED_CONTROL_VERSION,'mountain-eroded-control-1');assert.ok(Object.isFrozen(ERODED_CONTROL));
  assert.deepEqual(ERODED_CONTROL,{radiusM:5194907,n:1025,stepM:125,cropN:385,steps:3,kDt:.8,m:.5,nExponent:1,diffusion:0});
});
test('HARD: every interior core construction vertex drains (solved heights), lowered-vertex control',async()=>{
  const m=await loadVariant(s=>s,'export {solve,diagonal};');
  const {ROWS,CORE,HALO}=C,NC=CORE+2*HALO+1;
  for(const [seed,id] of [[730201,0],[730206,-7]]){
    const h=m.solve(seed,30000,id).h,cs=id*CORE-HALO;
    // Triangulated neighbours (same mesh as production: hashed diagonal per global cell).
    const lower=(h,k)=>{const i=k%NC,j=(k-i)/NC,c=cs+i,n=[k-1,k+1,k-NC,k+NC];
      if(m.diagonal(c,j,seed))n.push(k+NC+1);if(m.diagonal(c-1,j-1,seed))n.push(k-NC-1);
      if(!m.diagonal(c,j-1,seed))n.push(k-NC+1);if(!m.diagonal(c-1,j,seed))n.push(k+NC-1);
      return n.some(r=>h[r]<h[k]);};
    const pits=h=>{let p=0;for(let j=1;j<ROWS;j++)for(let i=HALO;i<=HALO+CORE;i++)if(!lower(h,j*NC+i))p++;return p;};
    assert.equal(pits(h),0);
    const k=200*NC+HALO+40,bad=Float64Array.from(h);bad[k]=-1;assert.equal(pits(bad),1,'a lowered vertex is a pit');
  }
});
test('HARD: drainage teeth and eroded builder determinism on a small fixture',()=>{
  const {original,eroded}=buildErodedControl(0,129),again=buildErodedControl(0,129);
  assert.deepEqual(eroded.h,again.eroded.h);assert.deepEqual(original.h,again.original.h);
  const P={...depressions(eroded),pits025:depressionPits(eroded).pitsPer1000km2},N={...depressions(original),pits025:depressionPits(original).pitsPer1000km2};
  for(const [metric,row] of [['fill10Share','fill10ShareP50'],['pits025','pits025Per1000km2P50']]){
    const bound=MOUNTAIN_THRESHOLDS.find(r=>r.id===row).value;
    assert.ok(P[metric]<=bound);assert.ok(N[metric]>bound);
  }
  console.log('DRAINAGE_SMALL '+JSON.stringify({P,N}));
});
// Diagnostic definitions, not candidate acceptance thresholds.
test('HARD: structure helper counts known plane channels and raw correlation',()=>{
  const r=rasterFromArray(Array.from({length:25},(_,i)=>10-Math.floor(i/5)),5,250);
  const delta=Float64Array.from({length:25},(_,i)=>i),mirror=delta.map(v=>-v),core=new Uint8Array(25).fill(1);
  const actual=carvingStructure(r,delta,mirror,core);
  assert.equal(actual.thresholdCells,4);assert.equal(actual.heads,5);assert.equal(actual.confluences,0);
  assert.equal(actual.headsPer1000km2,3200);assert.equal(actual.mirrorCorrelation,-1);
  assert.equal(actual.uncarvedSharePct,4);assert.equal(actual.coreSamples,25);
});
