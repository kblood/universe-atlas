// HARD: synthetic element only. No world, climate, LOD, GPU or timing gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {stripTypeScriptTypes} from 'node:module';
import {carvingAM,carvingBM,ridgeValleyCarvingM,MOUNTAIN_CARVING as C,MOUNTAIN_CARVING_VERSION,CARVING_BANDS} from '../src/mountain-carving.ts';
import {raster,rasterFromArray,carvingStructure,measureSites,judgeM3,depressions,MOUNTAIN_THRESHOLDS} from './helpers/mountain-metrics.mjs';
import {buildErodedControl,ERODED_CONTROL,ERODED_CONTROL_VERSION} from './helpers/mountain-eroded-control.mjs';
import {R,SITES,rampArgs,rampSampler} from '../scripts/mountain-render-carving.mjs';

test('HARD: literal positive zero at exclusions, both candidates',()=>{
  for(const fn of [carvingAM,carvingBM])for(const x of [-1e7,-125,0,125,1e7])for(const y of [-48000,0,48000])for(const seed of [0,730201,0xffffffff]){
    assert.ok(Object.is(fn(x,y,30000,3000,0,seed),0));
    for(const h of [-100,-0,0])assert.ok(Object.is(fn(x,y,30000,h,1,seed),0));
  }
});
test('HARD: pure carving coast safety including zero-envelope margin',()=>{
  for(const fn of [carvingAM,carvingBM]){
    let violations=0;
    raster(d=>{const a=rampArgs(d),v=fn(...a);if(!(a[3]+v>=0&&v<=0&&v>=-a[3]))violations++;
      if(a[4]===0&&!Object.is(v,0))violations++;return {groundHeightM:a[3]+v,ocean:false};},SITES[0].d,R,193,500);
    assert.equal(violations,0);
  }
});
function digest(reverse=false){const v=new Float64Array(8192);
  for(let j=0;j<4096;j++){const i=reverse?4095-j:j,a=[(i-2048)*1093,(i%193-96)*500,30000,3000*Math.max(0,1-Math.abs(i%193-96)/60),i%193>=36&&i%193<=156?1:0,(730201+i)>>>0];
    v[2*i]=carvingAM(...a);v[2*i+1]=carvingBM(...a);}
  return createHash('sha256').update(Buffer.from(v.buffer)).digest('hex');
}
test('HARD: forward, reverse and child SHA-256 agree',()=>{
  const sha=digest();assert.equal(digest(true),sha);
  assert.equal(sha,'31f7dfacfb12123041b9f1b6cf110052b35123863c74aff53adbf4a3d43a39ec');
  const child=spawnSync(process.execPath,['--input-type=module','-e',`
    import {createHash} from 'node:crypto';
    import {carvingAM,carvingBM} from './src/mountain-carving.ts';
    ${digest.toString()}
    process.stdout.write(digest());
  `],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
  assert.equal(child.status,0,child.stderr);assert.equal(child.stdout,sha);console.log('DIGEST '+sha);
});
function audit(source){
  assert.doesNotMatch(source,/\bMath\s*\[|\*\*|\b(?:Number|BigInt|parseFloat|parseInt|isFinite|isNaN|Date|eval|Function)\b|\.\s*(?:toFixed|toPrecision|toExponential)\b/);
  for(const m of source.matchAll(/\bMath\s*\.\s*(\w+)/g))assert.ok(['floor','sqrt','imul','min','max','abs'].includes(m[1]),m[0]);
  assert.doesNotMatch(source.replace(/\bMath\s*\.\s*(?:floor|sqrt|imul|min|max|abs)\b/g,''),/\bMath\b/);
  const imports=/\bimport\s*\{[^}]*\}\s*from\s*['"](?:\.\/det-math\.ts|\.\/catalog\.ts)['"];?/g;
  assert.doesNotMatch(source.replace(imports,''),/\bimport\b|\bfrom\s*['"]|\brequire\s*\(/);
}
test('HARD: arithmetic audit with negative controls',()=>{
  const source=readFileSync(new URL('../src/mountain-carving.ts',import.meta.url),'utf8');audit(source);
  for(const bad of ['Math.sin(x)','Math.cos(x)','Math.exp(x)','Math.log(x)','Math.pow(x,2)','Math.atan(x)','Math.atan2(y,x)','Math.hypot(x,y)','Math.cbrt(x)','x ** 3',"Math['abs'](x)",'Math.random()','const alias=Math','Number(x)','parseFloat(x)','x.toFixed(2)',"import {x} from './terrain.ts';","import('./catalog.ts')",'Date.now()'])assert.throws(()=>audit(source+'\n'+bad),bad);
});
test('HARD: frozen versioned constants and level bands',()=>{
  assert.equal(MOUNTAIN_CARVING_VERSION,'mountain-carving-1');assert.ok(Object.isFrozen(C));
  assert.deepEqual(C,{"METHOD":"A","JITTER":0.45,"WALL_SLOPE":0.65,"WALL_GAIN":2.2,"WALL_CURVE_M":1500,"WALL_LINEAR_SHARE":0.35,"CHANNEL_HALF_WIDTH_M":62.5,"FLOOR_BASE":0.025,"FLOOR_RISE":0.12,"HEAD_RISE":0.3,"FLOOR_EPSILON":0.002,"TRUNK_DIAGONAL_SHARE":0.08,"DETAIL_2KM":0.5,"DETAIL_1KM":0.3,"DETAIL_CAP_M":20000,"B_GAIN":2.2,"B_DECAY":0.44,"B_DAMP":0.02,"B_WIDTH":0.25,"B_LENGTH":1.4});
  assert.ok(Object.isFrozen(CARVING_BANDS));assert.equal(CARVING_BANDS.length,5);
  for(const [level,b] of CARVING_BANDS.entries()){
    assert.ok(Object.isFrozen(b));assert.deepEqual(b,{level,wavelengthM:16000/2**level});assert.ok(b.wavelengthM>=1000&&b.wavelengthM<=16000);
  }
  assert.equal(ERODED_CONTROL_VERSION,'mountain-eroded-control-1');assert.ok(Object.isFrozen(ERODED_CONTROL));
  assert.deepEqual(ERODED_CONTROL,{radiusM:5194907,n:1025,stepM:125,cropN:385,steps:3,kDt:.8,m:.5,nExponent:1,diffusion:0});
});
test('HARD: reduced 129-square ramp metric pin for the winner',()=>{
  const metrics=measureSites(rampSampler(),SITES.slice(0,1),R,{n:129});
  const actual=Object.fromEntries(judgeM3(metrics).map(r=>[r.id,r.actual]));
  console.log('METRIC_PIN '+JSON.stringify(actual));
  assert.deepEqual(actual,{"slope125Over30":44.5,"slope125P50":27.4,"flank500mP50":22.1,"relief8kmP50":2739,"beta500mTo8km":2.04,"fill10ShareP50":0.003,"pitsPer1000km2P50":11.5,"coherence40kmWindowP50":0.174});
  for(let i=0;i<100;i++){const a=[i*173,-i*91,30000,2500,1,730201];assert.equal(ridgeValleyCarvingM(...a),carvingAM(...a));}
});
test('HARD: fixed dependency patches have no seams on the synthetic ramp',()=>{
  for(const scale of [1000,2000,4000,8000,16000])for(let cell=-3;cell<=3;cell++)for(const y of [-24000,-8000,0,1000,8000,16000,24000,29000]){
    const e=3000*(1-Math.abs(y)/30000),x=cell*scale;
    const left=carvingAM(x-1e-6,y,30000,e,1,730201),right=carvingAM(x+1e-6,y,30000,e,1,730201);
    assert.ok(Math.abs(left-right)<1e-3);
  }
});
test('HARD: dense active-wall derivative bound, with an over-carving negative control',async()=>{
  // Test the actual private production helpers without extending the public API.
  const source=readFileSync(new URL('../src/mountain-carving.ts',import.meta.url),'utf8');
  const m=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(
    source+'\nexport {wallProfile,wallDetail,gullyProfile,scratch};')).toString('base64'));
  let samples=0,minDerivative=Infinity,maxRatio=0;
  for(let i=0;i<=10000;i++){
    const p=m.gullyProfile(i/10000);assert.ok(p>=0&&p<=1);
  }
  for(let level=0,wall=C.WALL_SLOPE;level<3;level++,wall*=C.WALL_GAIN){
    const maxFloor=C.FLOOR_BASE+C.FLOOR_RISE+C.HEAD_RISE*level;
    for(let i=0;i<=512;i++){
      const d=.01+i*32,w=wall*m.wallProfile(d),c=C.WALL_CURVE_M;
      const derivative=wall*(C.WALL_LINEAR_SHARE+(1-C.WALL_LINEAR_SHARE)*d*(d+2*c)/((d+c)*(d+c)));
      const ratio=(C.DETAIL_2KM+C.DETAIL_1KM)*C.DETAIL_CAP_M*C.DETAIL_CAP_M/((C.DETAIL_CAP_M+w)*(C.DETAIL_CAP_M+w));
      assert.ok(ratio<1);maxRatio=Math.max(maxRatio,ratio);
      // Also reserve the worst envelope derivative on the specified 3 km / 30 km ramp.
      assert.ok((1-ratio)*derivative-.1*maxFloor>0);
      for(let phase=0;phase<=128;phase++){
        const arc=phase*2000/128,e=.001;
        const left=wall*m.wallProfile(d-e),right=wall*m.wallProfile(d+e);
        const h0=left+m.wallDetail(left,arc,291,173),h1=right+m.wallDetail(right,arc,291,173);
        const actual=(h1-h0)/(2*e)-.1*maxFloor;
        assert.ok(actual>0);minDerivative=Math.min(minDerivative,actual);samples++;
      }
    }
    assert.ok(Object.is(m.wallDetail(0,913,291,173),-0));
  }
  // Coincident gully maxima and doubled weights reverse the near-floor wall slope.
  const badHeight=d=>{const w=C.WALL_SLOPE*m.wallProfile(d);return w+2*m.wallDetail(w,0,1000,500);};
  const badDerivative=(badHeight(1.001)-badHeight(.999))/.002;
  assert.ok(badDerivative<0);
  // Poison every scratch entry between calls; no output can depend on the last call.
  for(let i=0;i<257;i++){
    const a=[(i-128)*937,(i%61-30)*991,30000,3000,1,(730201+i)>>>0];
    const expected=carvingAM(...a);m.scratch.fill(NaN);assert.equal(m.carvingAM(...a),expected);
  }
  console.log('WALL_DERIVATIVE '+JSON.stringify({samples,maxRatio,minDerivative,badDerivative,poisonCalls:257}));
});
test('HARD: drainage teeth and eroded builder determinism on a small fixture',()=>{
  const {original,eroded}=buildErodedControl(0,129),again=buildErodedControl(0,129);
  assert.deepEqual(eroded.h,again.eroded.h);assert.deepEqual(original.h,again.original.h);
  const P=depressions(eroded),N=depressions(original);
  for(const [metric,row] of [['fill10Share','fill10ShareP50'],['pitsPer1000km2','pitsPer1000km2P50']]){
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

// Only the new C fixtures reduce the lattice. Existing A2/B tests above are
// unchanged. Two full-size neighbouring blocks additionally validate the mesh.
const cSource=readFileSync(new URL('../src/mountain-carving.ts',import.meta.url),'utf8');
function cModuleSource(small){return stripTypeScriptTypes((small?cSource.replace('ROWS: 480, COLS: 120, CACHE: 32','ROWS: 48, COLS: 12, CACHE: 2'):cSource)+
  '\nexport {cBuild,cCache,cGet,cBoundaryAt,cInterpolate};');}
const cSmall=await import('data:text/javascript;base64,'+Buffer.from(cModuleSource(true)).toString('base64'));
function cDigest(m,reverse=false){
  const values=new Float64Array(128);
  for(let j=0;j<values.length;j++){
    const i=reverse?values.length-1-j:j,x=2000+(i%16)*550,y=-29000+Math.floor(i/16)*8000,e=3000*(1-Math.abs(y)/30000);
    values[i]=m.carvingCM(x,y,30000,e,1,730201);
  }
  return createHash('sha256').update(Buffer.from(values.buffer)).digest('hex');
}
test('C: exclusions, bounds, frozen constants and exact cache keys',()=>{
  const m=cSmall,fn=m.carvingCM;
  assert.ok(Object.isFrozen(m.MOUNTAIN_CARVING_C));assert.equal(m.CARVING_C_VERSION,'mountain-carving-c-1');
  m.cCache.fill(undefined);
  for(const a of [[0,0,30000,3000,0,1],[0,0,30000,0,1,1],[0,0,30000,-10,1,1],[0,30000,30000,3000,1,1],[0,-31000,30000,3000,1,1]])assert.ok(Object.is(fn(...a),0));
  assert.ok(m.cCache.every(v=>v===undefined));
  for(const w of [30,30000,30000.00000001,3e6])for(const seed of [730201,730202]){
    const a=[w*.2,w*.27,w,777,1,seed];m.cCache.fill(undefined);const cold=fn(...a);
    fn(w*.2,w*.27,w+1e-8,777,1,seed^1);assert.equal(fn(...a),cold);
    for(const e of [1e-9,777,1e8]){const d=fn(a[0],a[1],w,e,1,seed);assert.ok(d>=-e&&d<=0);}
  }
  const first=m.cGet(730201,30000,0),near=m.cGet(730201,30000.00000001,0);
  assert.notEqual(first,near);assert.equal(near.w,30000.00000001);
  assert.deepEqual(m.cGet(730201,30000,0).h,first.h);
  const other=m.cGet(730203,30000,0); // Same direct-mapped slot, different seed.
  assert.equal(other.seed,730203);assert.notDeepEqual(other.h,first.h);
  assert.deepEqual(m.cGet(730201,30000,0).h,first.h);
});
test('C: forward/reverse/cold/warm/evicted/child digest',()=>{
  cSmall.cCache.fill(undefined);const sha=cDigest(cSmall);
  assert.equal(cDigest(cSmall),sha);assert.equal(cDigest(cSmall,true),sha);
  cSmall.cCache.fill(undefined);assert.equal(cDigest(cSmall,true),sha);
  for(let id=4;id<8;id++)cSmall.cGet(730201,30000,id);
  assert.equal(cDigest(cSmall),sha);
  const child=spawnSync(process.execPath,['--input-type=module','-e',`
    import {createHash} from 'node:crypto';
    const m=await import('data:text/javascript;base64,${Buffer.from(cModuleSource(true)).toString('base64')}');
    ${cDigest.toString()}
    process.stdout.write(cDigest(m));
  `],{encoding:'utf8'});
  assert.equal(child.status,0,child.stderr);assert.equal(child.stdout,sha);
  assert.equal(sha,'e40c2a40fa6437176b8e58517ec811be1759ddba346afc06eb14f4a2ec5ddf06');
  console.log('C_DIGEST '+sha);
});
function undrained(b,h=b.h){
  const {fixed,degree,nb}=b.mesh,out=[];
  for(let k=0;k<h.length;k++)if(!fixed[k]&&h[k]>0){
    let lower=false;for(let a=k*8;a<k*8+degree[k];a++)if(h[nb[a]]<h[k])lower=true;
    if(!lower)out.push(k);
  }
  return out;
}
test('C: production mesh drainage, conservation, shared vertices and seam continuity',async()=>{
  const m=await import('data:text/javascript;base64,'+Buffer.from(cModuleSource(false)).toString('base64'));
  const a=m.cBuild(730201,30000,0),b=m.cBuild(730201,30000,1),{ROWS,COLS}=m.MOUNTAIN_CARVING_C;
  const sha=cDigest(m);assert.equal(cDigest(m,true),sha);
  assert.equal(sha,'cc97b80ffec00b6f028bbddee57b4c0c196cb0cba575ed2722f4bb7cf3f85416');
  m.cCache.fill(undefined);assert.equal(cDigest(m,true),sha);
  m.cGet(730201,30000,32);assert.equal(cDigest(m),sha);
  const child=spawnSync(process.execPath,['--input-type=module','-e',`
    import {createHash} from 'node:crypto';
    import * as m from './src/mountain-carving.ts';
    ${cDigest.toString()}
    process.stdout.write(cDigest(m));
  `],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
  assert.equal(child.status,0,child.stderr);assert.equal(child.stdout,sha);
  assert.deepEqual(m.MOUNTAIN_CARVING_C,{ROWS:480,COLS:120,CACHE:32,TILT:1.3,NOISE_AMP:400,
    SC:.9,FOOT:1500,AC:300000,M:.375,K:37.552365026127084,HACK_C:2.56,HEAD_GUARD_M:125,
    REROUTE:0,EPSILON:.000001,REFERENCE_M:3000});
  console.log('C_PRODUCTION_DIGEST '+sha);
  for(const block of [a,b]){
    assert.deepEqual(undrained(block),[]);
    let initial=0,outflow=0;const {mesh,receiver,acc,h}=block;
    for(let k=0;k<h.length;k++){
      initial+=mesh.area[k];assert.ok(mesh.area[k]>0);assert.ok(mesh.degree[k]<=8);
      if(receiver[k]<0)outflow+=acc[k];else{
        assert.ok(Array.from(mesh.nb.subarray(k*8,k*8+mesh.degree[k])).includes(receiver[k]));
        assert.ok(acc[receiver[k]]>acc[k]);
      }
    }
    assert.ok(Math.abs(initial-outflow)/initial<1e-12);
    // Raise the sole lower neighbour of an interior vertex: the resulting
    // local sink must be found, demonstrating that the drainage check has teeth.
    let caught=false;
    for(let k=0;k<h.length&&!caught;k++)if(!mesh.fixed[k]&&h[k]>0){
      const lower=Array.from(mesh.nb.subarray(k*8,k*8+mesh.degree[k])).filter(r=>h[r]<h[k]);
      if(lower.length===1){const bad=h.slice();bad[lower[0]]=1e6;caught=undrained(block,bad).includes(k);}
    }
    assert.ok(caught,'raised-vertex negative control');
  }
  for(let row=0;row<=ROWS;row++){
    assert.equal(a.right[row],b.left[row]);assert.equal(a.h[row*(COLS+1)+COLS],b.h[row*(COLS+1)]);
  }
  for(const row of [3,119,239,240,317,477])for(const t of [0,.37,.99]){
    const x=m.cBoundaryAt(1,row,t,30000,730201),y=-30000+(row+t)*125,e=3000*(1-Math.abs(y)/30000);
    const differences=[1,.01,.0001].map(eps=>Math.abs(m.carvingCM(x-eps,y,30000,e,1,730201)-m.carvingCM(x+eps,y,30000,e,1,730201)));
    assert.ok(differences[1]<differences[0]*.011+1e-10);assert.ok(differences[2]<differences[1]*.011+1e-10);
    assert.ok(differences[2]<.001);
  }
  // Query interpolation reproduces every tested vertex and stays within the
  // four quad corner heights even when the quad is skewed.
  for(let row=0;row<ROWS;row+=19)for(let col=0;col<COLS;col+=7){
    const x=a.left[row]+(a.right[row]-a.left[row])*col/COLS,k=row*(COLS+1)+col;
    assert.ok(Math.abs(m.cInterpolate(a,x,row,0)-a.h[k])<1e-8);
    const t=.43,l=a.left[row]*(1-t)+a.left[row+1]*t,r=a.right[row]*(1-t)+a.right[row+1]*t;
    const h=m.cInterpolate(a,l+(r-l)*(col+.61)/COLS,row,t),corners=[a.h[k],a.h[k+1],a.h[k+COLS+1],a.h[k+COLS+2]];
    assert.ok(h>=Math.min(...corners)-1e-8&&h<=Math.max(...corners)+1e-8);
  }
});
