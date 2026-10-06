// Staged M5 element. Synthetic fixture only; no other element's tuned constants.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {stripTypeScriptTypes} from 'node:module';
import * as M from '../src/mountain-rock-detail.ts';
import {TUNING,GATE,base,slope,offset,sample,rows,r1,coarseRows,fineSpectrum,bandLimit,zero,loadVariant as fixtureVariant} from './helpers/mountain-rock-detail-fixture.mjs';
import {digest} from './helpers/mountain-rock-detail-digest.mjs';
import {measurePool,speckleEdit} from './helpers/mountain-rock-detail-fixture.mjs';
import {MOUNTAIN_THRESHOLDS,q} from './helpers/mountain-metrics.mjs';
const C=M.MOUNTAIN_ROCK_DETAIL,SOURCE=readFileSync(new URL('../src/mountain-rock-detail.ts',import.meta.url),'utf8');
const loadVariant=(edit,extra='')=>import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(edit(SOURCE)+'\n'+extra)).toString('base64'));
const ROCK_DETAIL_DIGEST="c1cd74f8f82d1b2fb8699337b4736a50bf2770515590eb987045dc4e55b34577";
const report={hard:{},tuning:{},gate:{}};
test.after(()=>console.log('M5_ROWS '+JSON.stringify(report)));

test('HARD 1: literal +0 exclusions and finite outputs',()=>{
  let count=0;
  for(const x of [-2e7,-125,0,125,2e7])for(const y of [-2e7,0,2e7])for(const seed of [0,730501,0xffffffff]){
    for(const s of [0,.1,C.SLOPE_ZERO_TAN]){assert.ok(Object.is(M.rockDetailM(x,y,0.25,0.25+125*s,.25,seed),0));count++;}
    for(const h of [-Infinity,-1,-0,0,NaN,Infinity]){assert.ok(Object.is(M.rockDetailM(x,y,h,4000,3000,seed),0));count++;}
    for(const bad of [-Infinity,Infinity,NaN])for(const a of [[bad,y,3000,4000,3000],[x,bad,3000,4000,3000],[x,y,3000,bad,3000],[x,y,3000,4000,bad]]){assert.ok(Object.is(M.rockDetailM(...a,seed),0));count++;}
  }report.hard.exclusions=count;
});
test('HARD 2: bounds, upper envelope and non-vacuity on 65536 fixture samples',()=>{
  for(const [label,seeds] of [['tuning',TUNING],['gate',GATE]]){let count=0,steep=0,negative=0,violations=0;
    for(const seed of seeds)for(let j=0;j<64;j++)for(let i=0;i<64;i++){const x=-20000+i*634.62,y=-19500+j*614.14,h=base(x,y,seed),s=slope(x,y,seed),v=M.rockDetailM(x+offset(seed),y,h,base(x+125,y,seed),base(x,y+125,seed),M.rockDetailSeed(seed));
      count++;if(s>C.SLOPE_FULL_TAN){steep++;negative+=v<0;}if(!(v<=0&&v>=-Math.min(C.MAX_DEPTH_M,C.CAP_FRACTION*h)&&h+v>=0&&h+v<=h)||Object.is(v,-0))violations++;}
    report[label].bounds={count,violations,steep,negative,negativeShare:negative/steep};assert.equal(violations,0);assert.ok(negative/steep>.3);}
});
test('HARD 3: smoothstep endpoints, monotonicity and continuity',()=>{
  let prev=0;for(let i=0;i<=10000;i++){const s=C.SLOPE_ZERO_TAN+(C.SLOPE_FULL_TAN-C.SLOPE_ZERO_TAN)*i/10000,w=M.rockSlopeWeight(s);assert.ok(w>=prev&&w>=0&&w<=1);prev=w;}
  for(const s of [-Infinity,-1,0,C.SLOPE_ZERO_TAN,NaN])assert.ok(Object.is(M.rockSlopeWeight(s),0));
  for(const s of [C.SLOPE_FULL_TAN,1,Infinity])assert.equal(M.rockSlopeWeight(s),1);
  for(const s of [C.SLOPE_ZERO_TAN,C.SLOPE_FULL_TAN])assert.ok(Math.abs(M.rockSlopeWeight(s+1e-12)-M.rockSlopeWeight(s-1e-12))<1e-10);
  assert.equal(M.carvedSlopeTan(10,385,510),5);report.hard.weightPoints=10001;
});
test('HARD 4: pinned forward, reverse and child determinism',()=>{
  const d=digest(M.rockDetailM);report.hard.digest=d;assert.equal(d,ROCK_DETAIL_DIGEST);assert.equal(digest(M.rockDetailM,true),d);
  const child=spawnSync(process.execPath,['--input-type=module'],{cwd:new URL('..',import.meta.url),encoding:'utf8',input:"import {rockDetailM} from './src/mountain-rock-detail.ts'; import {digest} from './tests/helpers/mountain-rock-detail-digest.mjs'; process.stdout.write(digest(rockDetailM));"});
  assert.equal(child.status,0,child.stderr);assert.equal(child.stdout,d);
});
function audit(source){
  assert.doesNotMatch(source,/\bMath\s*\[|\*\*|\b(?:Number|BigInt|parseFloat|parseInt|isFinite|isNaN|Date|eval|Function)\b|\.\s*(?:toFixed|toPrecision|toExponential)\b/);
  for(const m of source.matchAll(/\bMath\s*\.\s*(\w+)/g))assert.ok(['floor','sqrt','imul','min','max','abs'].includes(m[1]),m[0]);
  assert.doesNotMatch(source.replace(/\bMath\s*\.\s*(?:floor|sqrt|imul|min|max|abs)\b/g,''),/\bMath\b/);
  assert.doesNotMatch(source,/\bimport\b|\bfrom\s*['"]|\brequire\s*\(/);
}
test('HARD 5: arithmetic audit and negative controls',()=>{
  audit(SOURCE);const bad=['Math.sin(x)','Math.cos(x)','Math.exp(x)','Math.log(x)','Math.pow(x,2)','Math.atan(x)','Math.atan2(y,x)','Math.hypot(x,y)','Math.cbrt(x)','Math.SQRT2','x ** 3',"Math['abs'](x)",'Math.random()','const alias=Math','Number(x)','parseFloat(x)','x.toFixed(2)',"import {x} from './terrain.ts';","import('./catalog.ts')",'Date.now()'];
  for(const s of bad)assert.throws(()=>audit(SOURCE+'\n'+s),assert.AssertionError);report.hard.auditNegatives=bad.length;
});
test('HARD 6: frozen constants, bands and monotone strata budget',()=>{
  assert.equal(M.MOUNTAIN_ROCK_DETAIL_VERSION,'mountain-rock-detail-1');for(const o of [C,M.ROCK_DETAIL_BANDS,M.ROCK_DETAIL_REDUCTION,...M.ROCK_DETAIL_BANDS])assert.ok(Object.isFrozen(o));
  assert.equal(Math.max(...M.ROCK_DETAIL_BANDS.map(b=>b.wavelengthM)),1000);for(const b of M.ROCK_DETAIL_BANDS)assert.ok(b.wavelengthM<=1000);
  assert.equal(M.ROCK_DETAIL_MAX_EDGE_M,1000/2*32/2);assert.deepEqual(M.ROCK_DETAIL_REDUCTION,{longestWavelengthM:1000,latticeSegments:32});
  assert.equal(C.SLOPE_ZERO_TAN,.17632698070846498);assert.equal(C.SLOPE_FULL_TAN,.5773502691896257);assert.equal(C.SLOPE_STEP_M,125);assert.ok(C.MAX_DEPTH_M<=200);assert.equal(C.CAP_FRACTION,.5);
  assert.equal(C.STRATA_WEIGHT+C.RIB_WEIGHT,1);
  const benchBound=C.STRATA_WEIGHT*C.MAX_DEPTH_M/(C.STRATA_PERIOD_M*C.BENCH_RISE);
  const bound=C.KAPPA*C.PROFILE_MAX_SLOPE*C.RIB_WEIGHT+benchBound;
  assert.ok(benchBound<.8);assert.ok(bound<=.6);assert.ok(bound+C.CAP_FRACTION<1);assert.equal(C.PROFILE_MAX_SLOPE,8/(3*Math.sqrt(3)));
  assert.ok(C.BENCH_RISE>0&&C.BENCH_FALL>0&&C.BENCH_RISE+C.BENCH_FALL<=1);
  assert.ok(C.GULLY_JITTER>=0&&C.GULLY_JITTER<=.3);
  assert.ok(Math.hypot(C.GULLY_HALF_LENGTH_M,C.GULLY_HALF_WIDTH_M)<=(1.5-C.GULLY_JITTER)*C.GULLY_CELL_M);
  // A spatially constant jitter has exactly zero gradient. Random seed only shifts phase.
  assert.match(SOURCE,/const jitter = C.JITTER_M \* \(seed >>> 0\) \/ 4294967295/);
  report.hard.constants={bound,benchBound,heightCapBound:bound+C.CAP_FRACTION,supportRadius:Math.hypot(C.GULLY_HALF_LENGTH_M,C.GULLY_HALF_WIDTH_M)};
});
// Analytic global fixture bound: |grad base| <= 1.03 (triangle slope <=
// 3000*.55*2/(4000*.81)=1.019, warp' <= .03, E' <= .1).
// Fixed forward slope is Lipschitz <= 2*sqrt(2)*1.03/125.
// max weight' = 1.5/(tan30-tan10). Normalised gradient derivative <= gradL/tan10.
// For active kernels |d| <= radius; each du,dw derivative gains <= radius*eL.
// |P'| <= B. Max preserves the common Lipschitz bound; finite search has no seams
// because omitted supports are zero (HARD 6). J has no spatial derivative.
// min depth uses the sum of individual cap/slope bounds, conservative but finite.
const gradL=2*Math.SQRT2*1.03/125,eL=gradL/C.SLOPE_ZERO_TAN;
const kernelL=C.PROFILE_MAX_SLOPE*(1/C.GULLY_HALF_LENGTH_M+1/C.GULLY_HALF_WIDTH_M)*(1+Math.hypot(C.GULLY_HALF_LENGTH_M,C.GULLY_HALF_WIDTH_M)*eL);
const L_MAX=.515+C.KAPPA*C.GULLY_HALF_LENGTH_M*gradL+C.MAX_DEPTH_M*(1.5/(C.SLOPE_FULL_TAN-C.SLOPE_ZERO_TAN)*gradL+C.STRATA_WEIGHT*Math.max(1/C.BENCH_RISE,1/C.BENCH_FALL)/C.STRATA_PERIOD_M*1.03+C.RIB_WEIGHT*kernelL);
function straddle(fn,seeds=TUNING){let max=0;for(let i=0;i<6000;i++){const seed=seeds[i%8],a=i*2.399963229728653,dx=.01*Math.cos(a),dy=.01*Math.sin(a);let x=(i*7919%400000)-200000,y=(i*3571%39000)-19500;
  // Deliberately cross every octave's integer lattice, including negative cells.
  if(i%3===0){const cell=i%2?C.GULLY_CELL_M:31.25;x=Math.round((x+offset(seed))/cell)*cell-offset(seed)-dx/2;}
  // Cross the analytic ridge apex and valley-floor kink.
  if(i%7===0){const t=i%2?.5:.095;x=4000*(Math.floor((x+offset(seed))/4000)+t)-offset(seed)-180*Math.sin(y/6000+(seed-730500)*.7)-dx/2;}
  const v=(xx,yy)=>fn(xx+offset(seed),yy,base(xx,yy,seed),base(xx+125,yy,seed),base(xx,yy+125,seed),M.rockDetailSeed(seed));max=Math.max(max,Math.abs(v(x+dx,y+dy)-v(x,y)));}return max;}
function edges(module,seed=730901){let mismatch=0,max=0;
  const at=(x,y,step)=>{const h=base(x,y,seed);return h+module.rockDetailM(x+offset(seed),y,h,base(x+step,y,seed),base(x,y+step,seed),M.rockDetailSeed(seed))+(sample(x,y,seed,zero)-h);};
  for(let e=0;e<3;e++){const x=-5000+e*1000,coarse=Array.from({length:101},(_,i)=>at(x,-10000+i*200,125)),fine=Array.from({length:201},(_,i)=>at(x,-10000+i*100,125));
    for(let i=0;i<101;i++)mismatch+=!Object.is(coarse[i],fine[i*2]);for(let i=0;i<100;i++)max=Math.max(max,Math.abs(fine[2*i+1]-(coarse[i]+coarse[i+1])/2));}return {mismatch,max};}
test('HARD 7: continuity, shared edges, speckle and level-dependent negatives',async()=>{
  let max=straddle(M.rockDetailM);const edge=edges(M);
  let wraps=0,thresholds=0;
  // Locate pre-registered strata height wraps and both weight thresholds in
  // the continuous fixture by bracketed roots, then straddle at +/- .005 m.
  const checkRoot=(f,target,x0,x1,y,seed)=>{
    let a=x0,b=x1,fa=f(a)-target;if(fa*(f(b)-target)>0)return false;
    for(let k=0;k<45;k++){const mid=(a+b)/2,fm=f(mid)-target;if(fa*fm<=0)b=mid;else{a=mid;fa=fm;}}
    const x=(a+b)/2,v=xx=>M.rockDetailM(xx+offset(seed),y,base(xx,y,seed),base(xx+125,y,seed),base(xx,y+125,seed),M.rockDetailSeed(seed));
    max=Math.max(max,Math.abs(v(x+.005)-v(x-.005)));return true;
  };
  for(const seed of TUNING)for(const y of [-15000,-5000,5000,15000])for(let x=-6000;x<6000;x+=125){
    for(const threshold of [C.SLOPE_ZERO_TAN,C.SLOPE_FULL_TAN])thresholds+=checkRoot(xx=>slope(xx,y,seed),threshold,x,x+125,y,seed);
    const jitter=C.JITTER_M*M.rockDetailSeed(seed)/4294967295,lo=Math.min(base(x,y,seed),base(x+125,y,seed))+jitter,hi=Math.max(base(x,y,seed),base(x+125,y,seed))+jitter;
    for(const phase of [0,C.BENCH_RISE,C.BENCH_RISE+C.BENCH_FALL])
      for(let k=Math.ceil(lo/C.STRATA_PERIOD_M-phase);(k+phase)*C.STRATA_PERIOD_M<=hi;k++)
        wraps+=checkRoot(xx=>base(xx,y,seed)+jitter,(k+phase)*C.STRATA_PERIOD_M,x,x+125,y,seed);
  }
  assert.ok(wraps>0&&thresholds>0);
  const speckle=await loadVariant(speckleEdit);
  const badMax=straddle(speckle.rockDetailM),heldMax=straddle(M.rockDetailM,GATE),heldBadMax=straddle(speckle.rockDetailM,GATE),tuningEdge=edges(M,730501);
  // Source variant incorrectly uses tile spacing instead of fixed 125 m.
  const level=await loadVariant(s=>s.replace('carvedYM: number, seed: number): number','carvedYM: number, seed: number, step: number = 125): number').replaceAll('/ C.SLOPE_STEP_M','/ step'));
  let levelMismatch=0;for(let i=0;i<201;i++){const x=i*200-20000,y=7000,h=base(x,y,730901),v=step=>level.rockDetailM(x,y,h,base(x+step,y,730901),base(x,y+step,730901),1,step);levelMismatch+=!Object.is(v(100),v(200));}
  report.hard.continuity={pairs:6000,wraps,thresholds,L_MAX,max,edge,speckleEdge:edges(speckle),speckleMax:badMax,levelMismatch,tuningEdge,gate:{pairs:6000,max:heldMax,speckleMax:heldBadMax,edge}};
  assert.ok(max<=L_MAX*.01);assert.ok(heldMax<=L_MAX*.01);assert.ok(heldBadMax>L_MAX*.01);assert.equal(tuningEdge.mismatch,0);assert.equal(edge.mismatch,0);assert.ok(badMax>L_MAX*.01);assert.ok(levelMismatch>0);
});

// Only the pre-registered gate pool is evaluated for ROW acceptance. All controls
// use its first four seeds; no-rock baseline uses all eight.
let actual,without,controls;
test('ROW gate: measure all rows and controls',async()=>{
  const result=await measurePool(GATE);({actual,without,controls}=result);Object.assign(report.gate,result);
});
test('ROW gate: base fixture classes and drainage',()=>{const b=actual.R2_R5.base;assert.ok(b.flatShare>=.15);assert.ok(b.steepShare>=.25);for(const id of ['fill10ShareP50','pits025Per1000km2P50'])assert.ok(b[id]<=MOUNTAIN_THRESHOLDS.find(r=>r.id===id).value);});
test('ROW gate: R1e contrast (R1 and R1d INFO)',()=>assert.ok(actual.R1e.ratio>=2,JSON.stringify(actual.R1e)));
test('ROW gate: R1e negative controls',()=>{assert.ok(without.R1e.ratio<2);assert.ok(controls.shallowR1.R1e.ratio<2,JSON.stringify(controls.shallowR1.R1e));});
test('ROW gate: R2 slope band and depth/KAPPA x4 control',()=>{assert.ok(actual.R2_R5.p50>=without.R2_R5.p50-.5);assert.ok(actual.R2_R5.p50>=20);assert.ok(actual.R2_R5.p90<=48.4);assert.ok(controls.depth4R2.p90>48.4||controls.depth4R2.p50<without.R2_R5.p50-.5);});
// Fixed reference: syntheticSampler(R=5194907,'alpine'), four sites,
// harness fine octaves 125 m - 2 km: beta = 2.617 (coordinator measurement).
const ALPINE_FINE_BETA=2.617;
test("ROW gate: R3' fine spectrum and no-rock control",()=>{
  const limit=without.R3.beta-(without.R3.beta-ALPINE_FINE_BETA)/3;
  report.gate.R3prime={alpineFineBeta:ALPINE_FINE_BETA,limit,beta:actual.R3.beta};
  assert.ok(without.R3.beta>limit);assert.ok(actual.R3.beta>=2&&actual.R3.beta<=limit,`${actual.R3.beta} <= ${limit}`);
});
test('ROW gate: R3 speckle x4 negative (equal gains INFO)',()=>assert.ok(controls.speckleR3.beta<2,`${controls.speckleR3.beta}`));
test('ROW gate: R4 band limit and long-octave control',()=>{assert.ok(actual.R4<=.2,`${actual.R4}`);assert.ok(controls.longR4>.2,`${controls.longR4}`);});
test('ROW gate: R6 new strict pits and round-2 negative',()=>{assert.ok(actual.R6.newPitsPerKm2<=1,JSON.stringify(actual.R6));assert.ok(controls.round2R6.newPitsPerKm2>1);});

test('ROW gate: R5 drainage (forced weight and reversed strata reported)',()=>{for(const id of ['fill10ShareP50','pits025Per1000km2P50'])assert.ok(actual.R2_R5[id]<=MOUNTAIN_THRESHOLDS.find(r=>r.id===id).value);});

test('ROW COST: warm synthetic add-on <= 214 ns (opt-in benchmark)',{skip:process.env.ATLAS_M5_BENCH!=='1'},()=>{
  const inputs=Array.from({length:4096},(_,i)=>{const x=i*17,y=i%313*125-19500,s=730501;return [x,y,base(x,y,s),base(x+125,y,s),base(x,y+125,s),s];});let sink=0;
  // Three barycentric-style height reads, with integer triangle selection, stand
  // in for the already warm M3 lookup; no drainage solve or M3 module dependency.
  const synthetic=(x,y)=>{const gx=x/125,gy=y/125,i=Math.floor(gx),j=Math.floor(gy),u=gx-i,v=gy-j,a=base(i*125,j*125,730501),b=base((i+1)*125,j*125,730501),c=base(i*125,(j+1)*125,730501);return a+(b-a)*u+(c-a)*v;};
  const bench=full=>{const rounds=[];for(let r=-2;r<7;r++){const start=process.hrtime.bigint();for(let i=0;i<1000000;i++){const a=inputs[i&4095];sink+=M.rockDetailM(a[0],a[1],a[2],full?synthetic(a[0]+125,a[1]):a[3],full?synthetic(a[0],a[1]+125):a[4],a[5]);}if(r>=0)rounds.push(Number(process.hrtime.bigint()-start)/1000000);}return {medianNs:q(rounds,.5),rounds};};
  const cost={rock:bench(false),addon:bench(true),sink};console.log('M5_COST '+JSON.stringify(cost));assert.ok(cost.addon.medianNs<=214);
});

// Frozen round-2 negative-control source, never production code.
const ROUND2_SOURCE = String.raw`// M5, staged: continuous rock relief on the carved surface, in pre-radius-scale metres.
// No runtime connection to terrain. Removing this non-positive term is an upper envelope.
export const MOUNTAIN_ROCK_DETAIL_VERSION = 'mountain-rock-detail-1';
export const MOUNTAIN_ROCK_DETAIL = Object.freeze({
  SLOPE_ZERO_TAN: 0.17632698070846498,
  SLOPE_FULL_TAN: 0.5773502691896257,
  SLOPE_STEP_M: 125,
  MAX_DEPTH_M: 120,
  CAP_FRACTION: 0.5,
  CELL_M: 250,
  OCTAVES: 2,
  GAIN: 0.5,
  RIB_NOISE_SCALE: 0.8,
  STRATA_PERIOD_M: 160,
  STRATA_WEIGHT: 0.2,
  RIB_WEIGHT: 0.8,
  JITTER_M: 30,
  SEED_SALT: 0x68bc21eb,
});
export const ROCK_DETAIL_BANDS = Object.freeze([
  Object.freeze({octave: 0, wavelengthM: 1000}),
  Object.freeze({octave: 1, wavelengthM: 500}),
  Object.freeze({octave: 2, wavelengthM: 250}),
  Object.freeze({octave: 3, wavelengthM: 125}),
]);
export const ROCK_DETAIL_REDUCTION = Object.freeze({longestWavelengthM: 1000, latticeSegments: 32});
export const ROCK_DETAIL_MAX_EDGE_M = ROCK_DETAIL_REDUCTION.longestWavelengthM / 2
  * ROCK_DETAIL_REDUCTION.latticeSegments / 2;
const C = MOUNTAIN_ROCK_DETAIL;

export function rockSlopeWeight(slopeTan: number): number {
  if (!(slopeTan > C.SLOPE_ZERO_TAN)) return 0;
  if (slopeTan >= C.SLOPE_FULL_TAN) return 1;
  const t = (slopeTan - C.SLOPE_ZERO_TAN) / (C.SLOPE_FULL_TAN - C.SLOPE_ZERO_TAN);
  return t * t * (3 - 2 * t);
}
export function carvedSlopeTan(hC: number, hX: number, hY: number): number {
  const x = (hX - hC) / C.SLOPE_STEP_M, y = (hY - hC) / C.SLOPE_STEP_M;
  return Math.sqrt(x * x + y * y);
}
export function rockDetailSeed(carvingSeed: number): number {
  let h = Math.imul(carvingSeed ^ C.SEED_SALT, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}
function hash(x: number, y: number, octave: number, seed: number): number {
  let h = Math.imul(x, 0x9e3779b1) ^ Math.imul(y, 0x85ebca77)
    ^ Math.imul(octave, 0xc2b2ae3d) ^ seed;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  return (h ^ (h >>> 16)) >>> 0;
}
// Coordinate primes plus one avalanche multiply mix lattice bits; the final
// xor folds high bits into the two gradient-selection bits.
// Four unit diagonal directions. Dot products are blended, never lattice values.
function gradient(h: number, x: number, y: number): number {
  return ((h & 1 ? -x : x) + (h & 2 ? -y : y)) * 0.7071067811865475;
}
function noise(x: number, y: number, octave: number, seed: number): number {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = gradient(hash(i, j, octave, seed), fx, fy);
  const b = gradient(hash(i + 1, j, octave, seed), fx - 1, fy);
  const c = gradient(hash(i, j + 1, octave, seed), fx, fy - 1);
  const d = gradient(hash(i + 1, j + 1, octave, seed), fx - 1, fy - 1);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}
function ribs(g0: number, g1: number, alongM: number, acrossM: number, seed: number): number {
  const r0 = Math.max(0, 1 - Math.abs(C.RIB_NOISE_SCALE * g0));
  const r1 = Math.max(0, 1 - Math.abs(C.RIB_NOISE_SCALE * g1));
  return (r0 * r0 + C.GAIN * r1 * r1) / (1 + C.GAIN);
}
export function rockDetailM(alongM: number, acrossM: number, carvedM: number,
  slopeTan: number, seed: number): number {
  const weight = rockSlopeWeight(slopeTan);
  if (weight === 0 || !(carvedM > 0) || carvedM - carvedM !== 0
    || alongM - alongM !== 0 || acrossM - acrossM !== 0) return 0;
  const depth = Math.min(C.MAX_DEPTH_M, C.CAP_FRACTION * carvedM);
  const g0 = noise(alongM / C.CELL_M, acrossM / C.CELL_M, 0, seed);
  const g1 = noise(alongM / (C.CELL_M / 2), acrossM / (C.CELL_M / 2), 1, seed);
  const jitter = C.JITTER_M * g0;
  const phase = (carvedM + jitter) / C.STRATA_PERIOD_M, t = phase - Math.floor(phase);
  // depth * STRATA_WEIGHT <= 0.3849 * period: 24 <= 61.584.
  // The largest positive derivative of t-t*t*t is 1, so height stays monotone.
  const strata = (t - t * t * t) / 0.3849001794597505;
  const shape = Math.max(0, Math.min(1, C.STRATA_WEIGHT * strata + C.RIB_WEIGHT * ribs(g0, g1, alongM, acrossM, seed)));
  const result = -weight * depth * shape;
  return result === 0 ? 0 : result;
}
`;
