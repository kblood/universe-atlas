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
import {carvingFM,carvingSmoothFM,ridgeValleyCarvingM,ridgeValleyCarvingSmoothM,MOUNTAIN_CARVING as C,MOUNTAIN_CARVING_VERSION,CARVING_BANDS,carvingBuildStats} from '../src/mountain-carving.ts';
import {raster,rasterFromArray,carvingStructure,depressions,depressionPits,MOUNTAIN_THRESHOLDS} from './helpers/mountain-metrics.mjs';
import {buildErodedControl,ERODED_CONTROL,ERODED_CONTROL_VERSION} from './helpers/mountain-eroded-control.mjs';
import {carvingDigest,carvingDigestArgs,CARVING_F_DIGEST,CARVING_S_DIGEST} from './helpers/mountain-carving-digest.mjs';
import {R,SITES,rampArgs} from '../scripts/mountain-render-carving.mjs';
import {loadTriangleCarving} from './helpers/mountain-carving-triangle.mjs';

const SOURCE=readFileSync(new URL('../src/mountain-carving.ts',import.meta.url),'utf8');
const loadVariant=(edit=s=>s,exports='')=>import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(edit(SOURCE)+'\n'+exports)).toString('base64'));

test('HARD: literal positive zero at exclusions',()=>{
  const before=carvingBuildStats.count;
  for(const fn of [carvingFM,ridgeValleyCarvingM,carvingSmoothFM,ridgeValleyCarvingSmoothM])for(const x of [-1e7,-125,0,125,1e7])for(const seed of [0,730201,0xffffffff]){
    for(const y of [-48000,0,48000])assert.ok(Object.is(fn(x,y,30000,3000,0,seed),0));
    for(const y of [-30000,30000,-30000.5,45000])assert.ok(Object.is(fn(x,y,30000,3000,1,seed),0));
    for(const h of [-100,-0,0])assert.ok(Object.is(fn(x,0,30000,h,1,seed),0));
    for(const bad of [[x,NaN,30000,3000],[x,0,NaN,3000],[x,0,30000,NaN],[NaN,0,30000,3000],[Infinity,0,30000,3000],[x,0,-5,3000]])assert.ok(Object.is(fn(...bad,1,seed),0));
  }
  assert.equal(carvingBuildStats.count,before,'exclusions never solve a block');
});
test('HARD: coast safety and bounds including the zero-envelope margin',()=>{
  // mountain-carving-3: also the smoothed carving Cb (the M5 rock driver): Cb <= 0 and U + Cb >= 0.
  let violations=0,samples=0,carved=0,smoothCarved=0;
  raster(d=>{const a=rampArgs(d),v=ridgeValleyCarvingM(...a),vb=ridgeValleyCarvingSmoothM(...a);samples++;if(v<0)carved++;if(vb<0)smoothCarved++;
    if(!(v<=0&&a[3]+v>=0&&v>=-a[3]))violations++;
    if(!(vb<=0&&a[3]+vb>=0&&vb>=-a[3]))violations++;
    if(a[4]===0&&!(Object.is(v,0)&&Object.is(vb,0)))violations++;
    return {groundHeightM:a[3]+v,ocean:false};},SITES[0].d,R,129,500);
  assert.equal(violations,0);assert.ok(carved>samples/2&&smoothCarved>samples/2,'the belt is actually carved');
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
  for(let i=0;i<100;i++){const a=[i*173,-i*91,30000,2500,1,730201];assert.equal(ridgeValleyCarvingM(...a),carvingFM(...a));
    assert.equal(ridgeValleyCarvingSmoothM(...a),carvingSmoothFM(...a));}
  // The smoothed carving (mountain-carving-3): same fixture through carvingSmoothFM, in-process and in a child process.
  const sCold=carvingDigest(carvingSmoothFM),sRev=carvingDigest(carvingSmoothFM,carvingDigestArgs().map((_,i)=>4095-i));
  assert.equal(sCold,CARVING_S_DIGEST);assert.equal(sRev,sCold);assert.notEqual(sCold,cold);
  const sChild=spawnSync(process.execPath,['--input-type=module'],{cwd:new URL('..',import.meta.url),encoding:'utf8',input:`
    import {carvingSmoothFM} from './src/mountain-carving.ts';
    import {carvingDigest} from './tests/helpers/mountain-carving-digest.mjs';
    process.stdout.write(carvingDigest(carvingSmoothFM));`});
  assert.equal(sChild.status,0,sChild.stderr);assert.equal(sChild.stdout,sCold);
  console.log('DIGEST '+JSON.stringify({sha256:cold,smoothSha256:sCold,builds:built}));
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
    const v0=m.carvingFM((col+u)*d,-30000+(row+t)*d,30000,3000,1,730201),s0=m.carvingSmoothFM((col+u)*d,-30000+(row+t)*d,30000,3000,1,730201);
    assert.ok(Object.is(v0,0)&&Object.is(s0,0),'uncut block at '+col+','+row+': '+v0+' / '+s0);zero++;
    // Block 1: only cells whose stencil (columns col-1..col+2, rows row-1..row+2) holds the tap can be non-zero.
    const c1=col,r1=Math.min(C.ROWS-1,row),holds=59>=c1-1&&59<=c1+2&&240>=r1-1&&240<=r1+2;
    const v1=m.carvingFM((C.CORE+c1+u)*d,-30000+(r1+t)*d,30000,3000,1,730201),s1=m.carvingSmoothFM((C.CORE+c1+u)*d,-30000+(r1+t)*d,30000,3000,1,730201);
    if(holds){inStencil++;assert.ok(v1<=0&&v1>=-3000*.5*1.5&&s1<=0&&s1>=-3000*.5);if(v1<0)nonzero++;}
    else assert.ok(Object.is(v1,0)&&Object.is(s1,0),'outside the stencil at '+c1+','+r1+': '+v1+' / '+s1);
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

test('HARD: the smoothed carving (M5 rock driver) is C2 across lattice lines incl. block seams; Catmull-Rom must fail the same straddle',()=>{
  // mountain-assembly-4 (docs/fable-decision-carving-lattice-2026-10-07.md section 2b): M5 rock reads the slope of the
  // smoothed carving, so the slope must not kink AND its curvature must not jump on a lattice line. Second differences
  // over h = 1 mm on both sides of a lattice line: a C2 field changes them by about (third derivative) x h, a C1 field (Catmull-Rom)
  // by its full curvature jump. Constant envelope (3000 m), lines at y = 0 (the tent envelope's kink) avoided.
  const w=30000,d=2*w/C.ROWS,hm=1e-3,JUMP=.01,lines=[];
  for(let k=0;k<600;k++){
    const col=-160+(k*7919)%320,row=8+(k*104729)%464,f=.1+((k*37)%100)/125;
    if(row===C.ROWS/2)continue;
    lines.push([col*d,-w+(row+f)*d,1,0],[(col+f)*d,-w+row*d,0,1]);
  }
  for(const col of [-C.CORE,0,C.CORE])for(let row=8;row<472;row+=29)lines.push([col*d,-w+(row+.37)*d,1,0]); // block seams
  // Curvature (1/m) on each side from three points at 0, s, 2s (s = +-h): (f(2s) - 2 f(s) + f(0)) / h^2, compared
  // as the jump of slope differences (one-sided second differences x h), so the limit is in the same units as the C1 test.
  const straddle=fn=>{let jumps=0,carved=0,maxJump=0;
    for(const [x,y,dx,dy] of lines){const f=s=>fn(x+s*hm*dx,y+s*hm*dy,w,3000,1,730201);
      const f0=f(0),right=(f(2)-2*f(1)+f0)/hm,left=(f0-2*f(-1)+f(-2))/hm,jump=Math.abs(right-left)/hm*d;
      if(f0<0)carved++;if(jump>JUMP)jumps++;if(jump>maxJump)maxJump=jump;}
    return {lines:lines.length,carved,jumps,maxJump:+maxJump.toPrecision(3)};};
  const sm=straddle(carvingSmoothFM),cr=straddle(carvingFM);
  console.log('C2_STRADDLE '+JSON.stringify({smooth:sm,catmullRom:cr,jumpLimit:JUMP,hM:hm}));
  assert.ok(sm.carved>lines.length*.9,'the straddle lines are carved: '+sm.carved);
  assert.equal(sm.jumps,0,'the smoothed carving has no curvature jump on a lattice line');
  assert.ok(cr.jumps>=lines.length/2,'negative control: Catmull-Rom jumps in curvature on most lattice lines ('+cr.jumps+'/'+lines.length+')');
});
test('HARD: fused rock-path lookup (carvingRockFM) is bit-identical to the four separate calls, with the same block calls, LRU order and point-memo traffic',async()=>{
  // docs/fable-decision-carving-lattice-2026-10-07.md section 2d: the fused lookup must not move any value or any memo
  // state. Two fresh module instances: A makes carvingFM + three carvingSmoothFM calls (the mountain-assembly-4 order),
  // B makes one carvingRockFM call. Imported random synthetic blocks only (no solve), lattice and block seams, every gate.
  const A=await loadVariant(s=>s,'//fused-A'),B=await loadVariant(s=>s,'//fused-B'),w=30000,d=2*w/C.ROWS;
  let rnd=0x9e3779b9;const r=()=>{rnd=Math.imul(rnd^(rnd>>>15),0x2c1b3c6d)+0x6d2b79f5|0;return (rnd>>>0)/4294967296;};
  const fill=id=>c=>{for(let k=0;k<c.length;k++){const x=r();c[k]=x<.3?0:x>.9?1:Math.fround((x-.3)/.6);}};
  for(const id of [-1,0,1,2]){const f=fill(id),a=synthBlock(A,id,()=>{}),b=synthBlock(B,id,()=>{});f(a.cut);b.cut.set(a.cut);
    assert.equal(A.importCarvingBlock(a),true);assert.equal(B.importCarvingBlock(b),true);}
  const pts=[];
  for(let k=0;k<6000;k++)pts.push([(-C.CORE+r()*3*C.CORE)*d,(r()*2.1-1.05)*w,[125,37.25,0,-125][k&3]]);
  for(const id of [0,1,2])for(let k=0;k<200;k++)pts.push([id*C.CORE*d-r()*130,(r()*2-1)*w,125]); // Cbx crosses into block id
  for(let k=0;k<200;k++)pts.push([r()*C.CORE*d,w-r()*130,125],[r()*C.CORE*d,-w-r()*130+1,125]); // Cby / base gates at +-w
  for(let k=0;k<200;k++)pts.push([Math.floor(r()*C.CORE)*d,(Math.floor(r()*C.ROWS)*d)-w,125]); // exact lattice vertices
  const odd=[[NaN,0,125],[Infinity,0,125],[0,NaN,125],[100,w,125],[100,-w,125],[100,w-125,125],[100,-w-125,125]];
  const run=(m,fused,x,y,s,env,belt,out)=>{if(fused){const c=m.carvingRockFM(x,y,w,env,belt,730201,s,out);return [c,out[0],out[1],out[2]];}
    return [m.carvingFM(x,y,w,env,belt,730201),m.carvingSmoothFM(x,y,w,env,belt,730201),m.carvingSmoothFM(x+s,y,w,env,belt,730201),m.carvingSmoothFM(x,y+s,w,env,belt,730201)];};
  const out=new Float64Array(3);let n=0,carved=0;
  const cmp=(x,y,s,env,belt)=>{const a=run(A,false,x,y,s,env,belt),b=run(B,true,x,y,s,env,belt,out);n++;if(a[0]<0||a[1]<0)carved++;
    for(let i=0;i<4;i++)assert.ok(Object.is(a[i],b[i]),`(${x}, ${y}, step ${s}, env ${env}, belt ${belt}) value ${i}: ${a[i]} vs ${b[i]}`);};
  const {blocks:ta}=A.traceCarvingBlocks(()=>0),{blocks:tb}=B.traceCarvingBlocks(()=>0);assert.deepEqual(ta,tb);
  const tr=[];
  for(const [x,y,s] of pts){
    const ka=A.traceCarvingBlocks(()=>run(A,false,x,y,s,3000,1)).blocks,kb=B.traceCarvingBlocks(()=>run(B,true,x,y,s,3000,1,out)).blocks;
    assert.deepEqual(kb,ka);tr.push(ka.length);cmp(x,y,s,3000,1);}
  for(const [x,y,s] of [...odd,...pts.slice(0,200)])for(const [env,belt] of [[3000,1],[3000,0],[0,1],[-1,1],[NaN,1],[1e-300,-1]])cmp(x,y,s,env,belt);
  // Point-query mode: the fused call makes the four separate calls, so values and memo traffic agree.
  A.enterCarvingPointQuery();B.enterCarvingPointQuery();
  for(const [x,y,s] of pts.slice(0,3000))cmp(x,y,s,3000,1);
  A.exitCarvingPointQuery();B.exitCarvingPointQuery();
  assert.deepEqual({...B.carvingPointMemoStats},{...A.carvingPointMemoStats});
  assert.ok(A.carvingPointMemoStats.hits>0&&A.carvingPointMemoStats.stores>0);
  // LRU order: after a seam query whose Cbx reads block 1 and whose Cby reads block 0 again, block 0 must be the most
  // recently used. Fill the cache with new blocks until exactly one of {0, 1} is evicted: it must be block 1 in both.
  const seam=[C.CORE*d-60,0,125];
  for(const [m,fused] of [[A,false],[B,true]]){
    run(m,fused,...seam,3000,1,out);
    for(let id=3;id<3+C.CACHE-1;id++)assert.equal(m.importCarvingBlock(synthBlock(m,id,()=>{})),true);
    assert.equal(m.importCarvingBlock(synthBlock(m,0,()=>{})),false,(fused?'fused':'separate')+': block 0 (most recent) is resident');
    assert.equal(m.importCarvingBlock(synthBlock(m,1,()=>{})),true,(fused?'fused':'separate')+': block 1 was evicted first');
  }
  // Negative control: a fused variant that reads Cby's block without touching the LRU (same values) must fail this.
  const NEEDLE='const v=cur!==null&&lastId===id?cur:block(s,halfWidthM,id).cut;';assert.ok(SOURCE.includes(NEEDLE));
  const P=await loadVariant(src=>src.replace(NEEDLE,'const v=cur!==null&&lastId===id?cur:(cache.find(b=>b.seed===s&&b.w===halfWidthM&&b.id===id)??block(s,halfWidthM,id)).cut;'),'//fused-P');
  for(const id of [0,1])assert.equal(P.importCarvingBlock(synthBlock(P,id,()=>{})),true);
  P.carvingRockFM(...seam.slice(0,2),w,3000,1,730201,125,out);
  for(let id=3;id<3+C.CACHE-1;id++)P.importCarvingBlock(synthBlock(P,id,()=>{}));
  assert.equal(P.importCarvingBlock(synthBlock(P,0,()=>{})),true,'negative control: without the LRU touch block 0 is evicted first');
  assert.equal(B.carvingBuildStats.count,A.carvingBuildStats.count,'same solves (a step of -125 m reaches block -2 from the left edge)');
  console.log('FUSED_IDENTITY '+JSON.stringify({queries:n,carved,crossBlockTraces:tr.filter(k=>k>1).length,builds:B.carvingBuildStats.count,pointMemo:{...B.carvingPointMemoStats}}));
});
