// HARD: M3 carving F (mountain-carving-3: 4x4 Catmull-Rom query of the cut fraction, docs/mountain-carving-c1-2026-10-07.md;
// mountain-carving-2 triangle-interpolated retained), synthetic element only. No world, climate, LOD,
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
import {loadTriangleCarving} from './helpers/mountain-carving-triangle.mjs';

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
  // mountain-carving-2 -> -3 (docs/mountain-carving-c1-2026-10-07.md): INTERPOLANT added, every other constant unchanged.
  assert.equal(MOUNTAIN_CARVING_VERSION,'mountain-carving-3');assert.ok(Object.isFrozen(C));
  assert.deepEqual(C,{METHOD:'F',INTERPOLANT:'catmull-rom',ROWS:480,CORE:128,HALO:192,CACHE:32,REFERENCE_M:3000,TILT:1.3,NOISE_AMP_M:400,NOISE_LAMBDA_M:8000,OCTAVES:6,GAIN:0.6,
    HILL_SLOPE:1,FOOT_M:1500,CHANNEL_AREA_M2:600000,K:33,EPSILON_M:0.000001,NORM_DILATE:8,NORM_BLUR_A:4,NORM_BLUR_B:4});
  // The normaliser is evaluated on the stored columns HALO-1 .. HALO+CORE+1: its windows reach one column further.
  assert.ok(C.NORM_BLUR_A+C.NORM_BLUR_B<=C.NORM_DILATE&&C.HALO>=1+C.NORM_DILATE+C.NORM_BLUR_A+C.NORM_BLUR_B);
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

// ---------- mountain-carving-3: the Catmull-Rom query (docs/fable-decision-carving-lattice-2026-10-07.md) ----------
const SC=C.CORE+3,NRS=(C.ROWS+1)*SC;
const synthBlock=(m,id,fill)=>{const cut=new Float32Array(NRS);fill(cut);return {version:m.MOUNTAIN_CARVING_VERSION,seed:730201,w:30000,id,cut,capped:0,positive:0};};
test('HARD: exact +0 wherever no tap of the 4x4 stencil is cut (imported synthetic blocks, no solve)',async()=>{
  const m=await loadVariant(s=>s,''),d=2*30000/C.ROWS;
  // Block 0 all uncut; block 1 one cut tap at block-local column 59, row 240 (stored index 240*SC + 60).
  assert.equal(m.importCarvingBlock(synthBlock(m,0,()=>{})),true);
  assert.equal(m.importCarvingBlock(synthBlock(m,1,c=>{c[240*SC+60]=.5;})),true);
  let zero=0,inStencil=0,nonzero=0;
  for(let k=0;k<4000;k++){
    const col=(k*7919)%C.CORE,row=(k*104729)%C.ROWS,u=((k*37)%100)/100,t=((k*61)%100)/100;
    // Block 0: nothing is cut anywhere, so every query is a literal +0.
    const v0=m.carvingFM((col+u)*d,-30000+(row+t)*d,30000,3000,1,730201);
    assert.ok(Object.is(v0,0),'uncut block at '+col+','+row+': '+v0);zero++;
    // Block 1: only cells whose stencil (columns col-1..col+2, rows row-1..row+2) holds the tap can be non-zero.
    const c1=col,r1=Math.min(C.ROWS-1,row),holds=59>=c1-1&&59<=c1+2&&240>=r1-1&&240<=r1+2;
    const v1=m.carvingFM((C.CORE+c1+u)*d,-30000+(r1+t)*d,30000,3000,1,730201);
    if(holds){inStencil++;assert.ok(v1<=0&&v1>=-3000*.5*1.5);if(v1<0)nonzero++;}
    else assert.ok(Object.is(v1,0),'outside the stencil at '+c1+','+r1+': '+v1);
  }
  // Points aimed at the tap's 16 cells: carved where the Catmull-Rom weight is positive (+0 by the clamp elsewhere).
  for(let c=57;c<=60;c++)for(let r=238;r<=241;r++)for(const [u,t] of [[.5,.5],[.1,.9],[.9,.1]]){
    const v=m.carvingFM((C.CORE+c+u)*d,-30000+(r+t)*d,30000,3000,1,730201);inStencil++;assert.ok(v<=0);if(v<0)nonzero++;}
  assert.ok(nonzero>=16,'the single cut tap is seen: '+nonzero);
  // At the tap's own vertex the interpolant reproduces the stored value exactly: -3000 x 0.5.
  assert.equal(m.carvingFM((C.CORE+59)*d,-30000+240*d,30000,3000,1,730201),-1500);
  assert.equal(m.carvingBuildStats.count,0,'imported blocks only');
  console.log('EXACT_ZERO '+JSON.stringify({uncutQueries:zero,stencilQueries:inStencil,carved:nonzero}));
});
test('HARD: lattice vertices reproduce the stored cut exactly (both blocks of a seam vertex)',async()=>{
  const m=await loadVariant(s=>s,'export {block};'),w=30000,d=2*w/C.ROWS;let n=0;
  for(const id of [-1,0])for(let k=0;k<300;k++){
    const L=(k*31)%(C.CORE+1),row=1+(k*17)%(C.ROWS-1),cut=m.block(730201,w,id).cut[row*SC+L+1];
    const v=m.carvingFM((id*C.CORE+L)*d,-w+row*d,w,3000,1,730201);
    assert.equal(v,cut===0?0:-3000*cut,'vertex '+(id*C.CORE+L)+','+row);n++;
  }
  console.log('VERTICES '+JSON.stringify({checked:n}));
});
test('HARD: C1 across lattice lines (one-sided slopes agree), including block seams; the triangle reference must fail the same straddle',async()=>{
  // Straddle: the one-sided difference quotients over h = 1 mm on both sides of a lattice line. A C1 field changes
  // its slope by about f'' x h (< 1e-3 here); a gradient kink (the triangle interpolant) by its full kink. Constant
  // envelope (3000 m), so only the cut interpolant is measured; lines at y = 0 (the tent envelope's kink) are avoided.
  const w=30000,d=2*w/C.ROWS,hm=1e-3,JUMP=.01,tri=await loadTriangleCarving();
  const lines=[];
  for(let k=0;k<600;k++){
    const col=-160+(k*7919)%320,row=8+(k*104729)%464,f=.1+((k*37)%100)/125;
    if(row===C.ROWS/2)continue;
    lines.push([col*d,-w+(row+f)*d,1,0],[(col+f)*d,-w+row*d,0,1]);
  }
  for(const col of [-C.CORE,0,C.CORE])for(let row=8;row<472;row+=29)lines.push([col*d,-w+(row+.37)*d,1,0]); // block seams
  const straddle=fn=>{let kinks=0,carved=0,maxJump=0;
    for(const [x,y,dx,dy] of lines){const f=s=>fn(x+s*hm*dx,y+s*hm*dy,w,3000,1,730201);
      const f0=f(0),jump=Math.abs((f(1)-f0)-(f0-f(-1)))/hm;if(f0<0)carved++;if(jump>JUMP)kinks++;if(jump>maxJump)maxJump=jump;}
    return {lines:lines.length,carved,kinks,maxJump:+maxJump.toPrecision(3)};};
  const cr=straddle(carvingFM),tr=straddle(tri.carvingFM);
  console.log('STRADDLE '+JSON.stringify({catmullRom:cr,triangle:tr,jumpLimit:JUMP,hM:hm}));
  assert.ok(cr.carved>lines.length*.9,'the straddle lines are carved: '+cr.carved);
  assert.equal(cr.kinks,0,'Catmull-Rom has no slope jump on a lattice line');
  assert.ok(tr.kinks>=lines.length/2,'negative control: the triangle reference kinks on most lattice lines ('+tr.kinks+'/'+lines.length+')');
});
