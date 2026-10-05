// HARD. Synthetic metrics: 256x128 area map, 193x193/2km tensors at two sites.
// Full 1024x512, eight-site, 4-world + 60-corpus-body CONTRACT acceptance lives in the CLI.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {noise} from '../src/catalog.ts';
import {buildOrogenLayout,orogenLayout,continentalA0} from '../src/mountain-layout.ts';
import {fib,maithea,waterWorlds} from './terrain-climate-fixtures.mjs';
import {layoutMap,layoutCoherence,strictCoherence,layoutDistanceAccuracy,layoutCurvature,coastSafety,judgeLayout} from './helpers/mountain-layout-metrics.mjs';

const body=maithea(),R=body.radiusM,layout=orogenLayout(body),a0=continentalA0(body);
const opts={w:256,h:128},linearOpts={siteCount:2,probeCount:4096};
const dot=(a,b)=>a.reduce((sum,v,j)=>sum+v*b[j],0);
const offset=(b,u)=>b.bendM*(u/b.uLimit)**2+b.amplitudeM*(2*noise(u*2/b.wavelength+13,37,19,b.noiseSeed)-1);
function transverse(b,d){
  const z=dot(d,b.centre),x=dot(d,b.tangent),r=Math.sqrt(x*x+z*z),u=x/(r+z),h=.00001;
  const slope=(offset(b,u+h)-offset(b,u-h))/(2*h*R);
  const ambient=b.pole.map((p,j)=>p-slope*(z*b.tangent[j]-x*b.centre[j])/(r*(r+z)));
  const radial=dot(ambient,d),g=Math.hypot(...ambient.map((v,j)=>v-radial*d[j]));
    const F=R*dot(d,b.pole)-offset(b,u);
  if(Math.abs(F/g)>1.2*b.halfWidthM)return {g,F,distance:F/g};
  const chord=v=>{const y=offset(b,v)/R,r=Math.sqrt(1-y*y),den=1+v*v;
    return b.centre.reduce((sum,c,j)=>sum+(c*r*(1-v*v)/den+b.tangent[j]*r*2*v/den+b.pole[j]*y-d[j])**2,0);};
  let lo=Math.max(-b.uLimit,u-.06),hi=Math.min(b.uLimit,u+.06);
  for(let i=0;i<40;i++){const a=lo+(hi-lo)/3,c=hi-(hi-lo)/3;if(chord(a)<chord(c))hi=c;else lo=a;}
  return {g,F,distance:Math.sign(F)*2*R*Math.asin(Math.sqrt(chord((lo+hi)/2))/2)};
}
test('HARD: real hierarchy exercises elongation and curved-axis derivative',()=>{
  const majors=layout.belts.filter(b=>b.rank==='major');
  assert.ok(majors.length>=1&&majors.length<=3);
  assert.ok(layout.belts.some(b=>b.rank==='minor'));
  assert.ok(majors.some(b=>Math.abs(b.bendM)>b.halfWidthM));
  const map=layoutMap(d=>layout.sample(d).belt,a0,opts);
  assert.ok(map.components.length>0,'Maithea must exercise the real elongation gate');
  assert.ok(map.components.every(c=>c.aspect>=4));
  assert.ok(map.informativeComponents.length>=map.components.length);
  for(let i=0;i<2048;i++){
    const d=fib(i,2048),s=layout.sample(d);if(a0(d)<=0){assert.equal(s.belt,0);continue;}
    let footprints=0;
    for(const b of layout.belts){
      const z=dot(d,b.centre),x=dot(d,b.tangent),r=Math.sqrt(x*x+z*z),u=x/(r+z),v=u/b.uLimit;
      if(z<.5||Math.abs(v)>=1)continue;
      const {F,g,distance}=transverse(b,d);
      assert.ok(g<=b.gradientMax,'analytic upper bound covers the actual projected gradient');
      if(Math.abs(distance)<b.halfWidthM)footprints++;
    }
    assert.ok(footprints<=1,'conservative tubes keep displaced footprints separate');
    assert.equal(s.belt>0,footprints===1,'pre-check preserves every normalised footprint inside the gate');
    if(s.belt<=0)continue;
    assert.equal(footprints,1,'exactly one footprint per positive sample');
    const {distance}=transverse(layout.belts[s.beltIndex],d);
    // Independent ternary minimization checks the fixed-step projection;
    // the separate 2000-sample gate also performs a global dense search.
    assert.ok(Math.abs(s.axisDistanceM-distance)<1e-6*s.halfWidthM,'mask and output use the same nearest-centreline distance');
    const h=1e-6,shift=sign=>{const p=d.map((v,j)=>v+sign*h*s.axis[j]),n=Math.hypot(...p);return p.map(v=>v/n);};
    const plus=layout.sample(shift(1)),minus=layout.sample(shift(-1));
    if(plus.beltIndex!==s.beltIndex||minus.beltIndex!==s.beltIndex)continue;
    assert.ok(Math.abs((plus.axisDistanceM-minus.axisDistanceM)/(2*h*R))<1e-5,'axis follows nearest centreline tangent');
    assert.ok(Math.abs(s.axisDistanceM)<s.halfWidthM);
  }
});
test('HARD: metric teeth: straight band passes, disks fail aspect, isotropic mask fails coherence',()=>{
  const straight=d=>Math.max(0,1-Math.abs(d[1])/.08)*Math.max(0,Math.min(1,(d[0]-.3)/.2));
  const map=layoutMap(straight,()=>1,opts);
  assert.ok(map.components.length>0,'positive control must exercise a large component');
  assert.ok(map.components.every(c=>c.aspect>=4));
  assert.ok(layoutCoherence(straight,2e6,linearOpts).p50>=.45);
  const disks=d=>Math.max(0,1-(1-Math.abs(d[0]))/.12);
  const round=layoutMap(disks,()=>1,opts);
  assert.equal(round.components.length,2);
  assert.ok(round.components.every(c=>c.aspect<4));
  const isotropic=d=>noise(d[0]*250+13,d[1]*250+37,d[2]*250+19,123);
  assert.ok(layoutCoherence(isotropic,2e6,linearOpts).p50<.45);
});

test('HARD: synthetic spherical-cap continent satisfies all M1 thresholds',()=>{
  const R=2e6,a0=d=>R*(d[0]-.94);
  const l=buildOrogenLayout({seed:'synthetic-cap',radiusM:R,a0});
  const sample=d=>l.sample(d).belt,map=layoutMap(sample,a0,opts);
  assert.ok(map.components.length>0,'synthetic builder must exercise elongation');
  const linear=layoutCoherence(sample,R,linearOpts);
  const metrics={...map,coherenceP50:linear.p50,coherenceStrictP50:linear.strictP50,coastViolations:coastSafety(sample,a0,4096)};
  assert.deepEqual(judgeLayout(metrics),[],JSON.stringify({share:map.beltShare,components:map.components,coherence:metrics.coherenceP50}));
});

test('HARD: coast, caller coordinate, bounds and tangent frame',()=>{
  // The a0 = terrain continentalM identity pin runs in scripts/mountain-render.mjs (no terrain import here).
  let positive=0;
  for(let i=0;i<4096;i++){
    const d=fib(i,4096),s=layout.sample(d),alt=a0(d);
    assert.deepEqual(s,layout.sampleWithA0(d,alt));
    const out={belt:5,axis:[9,9,9],axisDistanceM:9,halfWidthM:9,beltIndex:9};
    assert.equal(layout.sample(d,out),out);assert.deepEqual(out,s);
    assert.ok(s.belt>=0&&s.belt<=1);
    if(alt<=0)assert.equal(s.belt,0);
    if(s.belt>0){positive++;assert.ok(Math.abs(Math.hypot(...s.axis)-1)<1e-12);
      assert.ok(Math.abs(s.axis[0]*d[0]+s.axis[1]*d[1]+s.axis[2]*d[2])<1e-12);
      assert.ok(s.halfWidthM>0&&s.halfWidthM<=layout.maxHalfWidthM);assert.ok(s.beltIndex>=0);
    }else{assert.deepEqual(s.axis,[0,0,0]);assert.equal(s.axisDistanceM,0);assert.equal(s.beltIndex,-1);assert.equal(s.halfWidthM,0);}
  }
  assert.ok(positive>0);assert.equal(orogenLayout({...body}),layout);
  assert.ok(Object.isFrozen(layout.belts)&&layout.belts.every(b=>Object.isFrozen(b)&&Object.isFrozen(b.centre)));
});

test('HARD: gas giants and stars are zero, including sampleWithA0',()=>{
  for(const b of [{...body,type:'Gas giant'},{...body,kind:'star'}]){
    const l=orogenLayout(b);assert.equal(l.belts.length,0);
    for(let i=0;i<2048;i++){const d=fib(i,2048);assert.equal(l.sample(d).belt,0);assert.equal(l.sampleWithA0(d,1000).belt,0);}
  }
});

function digest(l,reverse=false){
  const values=new Array(4096);
  for(let j=0;j<4096;j++){const i=reverse?4095-j:j;values[i]=l.sample(fib(i,4096));}
  return createHash('sha256').update(JSON.stringify(values)).digest('hex');
}
test('HARD: forward, reverse and child-process sample digests agree',()=>{
  const forward=digest(layout);console.log('DIGEST '+forward);assert.equal(digest(layout,true),forward);
  // Literal pin (orogen-layout-1 with alongM; the band grid of 2026-10-05 must not move it).
  assert.equal(forward,'0aa3d59b9ed979c85da729386c3531e732bb3f94dbf3b1961db2292be60ec7b2');
  const child=spawnSync(process.execPath,['--input-type=module','-e',`
    import {createHash} from 'node:crypto';
    import {orogenLayout} from './src/mountain-layout.ts';
    import {fib,maithea,waterWorlds} from './tests/terrain-climate-fixtures.mjs';
    const l=orogenLayout(maithea()),samples=Array.from({length:4096},(_,i)=>l.sample(fib(i,4096)));
    process.stdout.write(createHash('sha256').update(JSON.stringify(samples)).digest('hex'));
  `],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
  assert.equal(child.status,0,child.stderr);assert.equal(child.stdout,forward);
});

function auditArithmetic(source){
  const allowed=new Set(['sqrt','floor','abs','min','max','imul']);
  assert.doesNotMatch(source,/\bMath\s*\[|\*\*/);
  for(const match of source.matchAll(/\bMath\s*\.\s*(\w+)/g))assert.ok(allowed.has(match[1]),`Math.${match[1]} is not allowed`);
  assert.doesNotMatch(source.replace(/\bMath\s*\.\s*(?:sqrt|floor|abs|min|max|imul)\b/g,''),/\bMath\b/);
  // Number's sole permitted use is the hash's explicit bigint-to-number
  // conversion in continentalA0; no numeric globals enter the value path.
  const rest=source.replace("Number(hash64(body.seed+'/macro-v1') & 0xffffffffn)",'HASH_CODE');
  assert.doesNotMatch(rest,/\b(?:Number|BigInt|parseFloat|parseInt|isFinite|isNaN)\b|\.\s*(?:toFixed|toPrecision|toExponential)\b/);
}
test('HARD: arithmetic-only layout and no terrain/climate/colour/LOD import',()=>{
  const source=readFileSync(new URL('../src/mountain-layout.ts',import.meta.url),'utf8');
  auditArithmetic(source);
  for(const bad of ['Math.log2(x)','Math.expm1(x)','Math.tanh(x)',"Math['sin'](x)",'x ** 2','Math.random()',
    'Number.parseFloat(x)','parseFloat(x)','x.toFixed(2)'])assert.throws(()=>auditArithmetic(source+'\n'+bad),bad);
  const imports=[...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m=>m[1]);
  assert.deepEqual(imports,['./catalog.ts','./det-math.ts']);
});

test('HARD: strict coherence counts all positive centres including zero tensors',()=>{
  const r={h:new Float64Array(193*193).fill(1),n:193,step:2000};
  const flat=strictCoherence(r);assert.equal(flat.windows.length,324);assert.equal(flat.zeroTraceCount,324);
  assert.ok(flat.windows.every(v=>v===0));
  for(let y=0;y<193;y++)for(let x=0;x<193;x++)r.h[y*193+x]=x+1;
  const band=strictCoherence(r);assert.equal(band.windows.length,324);assert.equal(band.zeroTraceCount,0);
  assert.ok(band.windows.every(v=>v===1));
});

test('HARD: 2000 positive Maithea distances agree with dense displaced-centreline search',()=>{
  const accuracy=layoutDistanceAccuracy(layout,R);
  console.log(`DISTANCE ${JSON.stringify(accuracy)}`);
  assert.equal(accuracy.count,2000);
  assert.ok(accuracy.pass,`max error ${accuracy.maxErrorWidth*100}% of half width`);
});



test('HARD: dense Maithea/Lethuris spatial curvature times W stays below .2',()=>{
  for(const world of [body,waterWorlds()[3]]){
    const l=orogenLayout(world),result=layoutCurvature(l,world.radiusM);
    console.log(`CURVATURE ${world.name} ${JSON.stringify(result)}`);
    assert.ok(result.max<=.2);assert.ok(result.boundMax<=.2);
    for(const b of l.belts){assert.ok(b.wavelength*world.radiusM/(1+b.uLimit*b.uLimit)>=16*b.halfWidthM-1e-8);assert.ok(b.amplitudeM<=.6*b.halfWidthM);}
  }
});

test('HARD: alongM (assembly addition) is the base-circle arc R x 2 atan(u) of the foot point, 0 off-belt',()=>{
  // Along each belt's displaced centreline, consecutive samples 0.002 in u apart: alongM differences match
  // R x 2 (atan(u1) - atan(u0)) (Math.atan here is the reference, never the production path) to 1 cm (the foot-point solve).
  let checked=0;
  for(const [i,b] of layout.belts.entries()){
    let last=null;
    for(let k=-90;k<=90;k++){
      const u=k/100*b.uLimit,v=u/b.uLimit,y=(b.bendM*v*v+b.amplitudeM*(2*noise(u*2/b.wavelength+13,37,19,b.noiseSeed)-1))/R,r=Math.sqrt(1-y*y),den=1+u*u;
      const d=[0,1,2].map(j=>b.centre[j]*r*(1-u*u)/den+b.tangent[j]*r*2*u/den+b.pole[j]*y);
      const s=layout.sample(d);if(s.beltIndex!==i)continue;
      const ref=R*2*Math.atan(u);assert.ok(Math.abs(s.alongM-ref)<.01,`${i} ${k}: ${s.alongM} vs ${ref}`);
      if(last!==null)assert.ok(s.alongM>last);last=s.alongM;checked++;
    }
  }
  assert.ok(checked>500,`${checked} centreline samples`);
  for(let i=0;i<4096;i++){const s=layout.sample(fib(i,4096));if(s.belt===0)assert.equal(s.alongM,0);}
});
