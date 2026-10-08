import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {galaxies,refByAddress,sector,system} from '../src/catalog.ts';
import {biomeClassifier} from '../src/surface-biomes.ts';
import {spinStateFor} from '../src/stellar-evolution.ts';
import {
  CLIMATE_VERSION,CLIMATE_CALIBRATION,TABLE_ROWS,temperateHabitat,surfaceGravityMS2,lapseRateForGravity,
  effectiveObliquityRad,insolationTables,climateForcingFromParams,climateForcingFor,clearClimateForcingCache,
  climateForcingCacheSize,surfaceClimate,createClimateSample,decodeClimateCode,isothermHeightM,
  KERNEL_STEPS,pddKernelH,pddKernelG,degreeDaysAbove,warmColumnLapseFactor,warmestMonthCeilingK,
} from '../src/surface-climate.ts';
import {planetGeophysics} from '../src/planet-geophysics.ts';

const D=Math.PI/180;
const g0=galaxies('LETHRA-001')[0];
const maithea=system(refByAddress(g0,'G001/C2128,0,1/0')).planets[1];

/** The first `count` catalogue systems of galaxy G001, sector by sector along +x. */
function catalogueSystems(count){
  const out=[];
  for(let sx=266;out.length<count;sx++)for(const ref of sector(g0,[sx,0,0]).refs){if(out.length>=count)break;out.push(system(ref));}
  return out;
}
const firstSystems=catalogueSystems(2000);
const allBodies=firstSystems.flatMap(s=>[...s.planets,...s.moons]);
const lifeBodies=allBodies.filter(temperateHabitat);
const fib=(i,n)=>{const y=1-2*(i+.5)/n,p=i*2.399963229728653,r=Math.sqrt(1-y*y);return [Math.cos(p)*r,y,Math.sin(p)*r];};
const unit=v=>{const m=Math.hypot(...v);return v.map(x=>x/m);};

test('calibration constants are pinned; any change forces a CLIMATE_VERSION bump',()=>{
  // surface-climate-2 (backlog #9 BIOME2-CLIMATE M1, docs/surface-climate-v2.md). Old pins:
  // surface-climate-1.1-geo-g / 7d18c56d825d5a5e9c77403dd029214c6caeeeba60e4eafe462592907d1634c1.
  assert.equal(CLIMATE_VERSION,'surface-climate-2');
  assert.ok(Object.isFrozen(CLIMATE_CALIBRATION));
  const sha=createHash('sha256').update(JSON.stringify(CLIMATE_CALIBRATION)).digest('hex');
  assert.equal(sha,'f56bf8ab95a9d0fc965e3ba9a0fc693ca8e1c301e75497e456bb5a103dddce6e',`calibration JSON changed (sha ${sha}); bump CLIMATE_VERSION and re-pin`);
});

test('PDD kernel: tabulated H and G match the closed form; degree-days of a sinusoidal year',()=>{
  // Independent platform-math reference of the sinusoidal-year kernel.
  const H=v=>v<=-1?0:v>=1?v:(Math.sqrt(1-v*v)+v*Math.acos(-v))/Math.PI,G=v=>v<=-1?0:v>=1?1:Math.acos(-v)/Math.PI;
  assert.equal(KERNEL_STEPS,512,'513 nodes over [-1, 1]');
  let eH=0,eG=0,prevH=-1,prevG=-1;
  for(let i=0;i<=100000;i++){
    const v=-1.2+2.4*i/100000,h=pddKernelH(v),g=pddKernelG(v);
    eH=Math.max(eH,Math.abs(h-H(v)));eG=Math.max(eG,Math.abs(g-G(v)));
    assert.ok(h>=prevH&&g>=prevG,`kernel is monotone at v=${v}`);prevH=h;prevG=g;
  }
  // Measured: H 1.09e-5 (worst next to v = 1), G 7.0e-3 (the sqrt singularity at +-1).
  assert.ok(eH<2e-5,`H max error ${eH}`);assert.ok(eG<1e-2,`G max error ${eG}`);
  for(const v of [-1,1])assert.equal(pddKernelH(v),H(v));
  assert.equal(pddKernelG(-1),0);assert.equal(pddKernelG(1),1);assert.equal(pddKernelH(0),H(0));
  // Degree-days: a seasonless year, a year entirely above and entirely below the threshold, and the mid case.
  assert.equal(degreeDaysAbove(283.15,0,0),10*365.25);assert.equal(degreeDaysAbove(263.15,0,0),0);
  assert.ok(Math.abs(degreeDaysAbove(293.15,5,0)-20*365.25)<1e-9,'never below 0 C: PDD = annual excess x year');
  assert.equal(degreeDaysAbove(253.15,5,0),0,'never above 0 C');
  assert.ok(Math.abs(degreeDaysAbove(273.15,10,0)-365.25*10/Math.PI)<1e-9,'mean at 0 C: A/pi per day');
  // Against a brute-force integral of max(0, mu + A cos t) over 100k time steps.
  for(const [mu,A,thr] of [[268,12,0],[275,20,0],[290,9,30],[300,18,30],[262,25,0]]){
    let s=0;const n=100000;for(let k=0;k<n;k++){const T=mu-273.15+A*Math.cos(2*Math.PI*(k+.5)/n)-thr;if(T>0)s+=T;}
    const brute=s/n*365.25;
    assert.ok(Math.abs(degreeDaysAbove(mu,A,thr)-brute)<=365.25*A*2e-5+1e-6,`mu ${mu} A ${A} thr ${thr}: ${degreeDaysAbove(mu,A,thr)} vs ${brute}`);
  }
});

test('module boundaries: allowed imports only, no platform transcendentals, no locale collation',()=>{
  const strip=s=>s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:])\/\/.*$/gm,'$1');
  const climate=readFileSync(new URL('../src/surface-climate.ts',import.meta.url),'utf8');
  const habitat=readFileSync(new URL('../src/habitat-suitability.ts',import.meta.url),'utf8');
  const imports=src=>[...src.matchAll(/^import\s+(type\s+)?[^;]*?from\s+'([^']+)'/gm)].map(m=>(m[1]?'type ':'')+m[2]);
  // planet-geophysics.ts (itself catalog.ts-only) is allowed since surface-climate-1.1-geo-g.
  assert.deepEqual(imports(climate).sort(),['./catalog.ts','./det-math.ts','./planet-geophysics.ts','./stellar-evolution.ts']);
  assert.deepEqual(imports(habitat),['type ./biosphere-model.ts']);
  for(const [name,src] of [['surface-climate.ts',climate],['habitat-suitability.ts',habitat]]){
    const code=strip(src);
    for(const banned of [/Math\.pow\b/,/\*\*/,/Math\.sin\b/,/Math\.cos\b/,/Math\.asin\b/,/Math\.acos\b/,/Math\.exp\b/,/Math\.log\b/,/localeCompare/])
      assert.ok(!banned.test(code),`${name} must not use ${banned}`);
  }
});

test('Berger daily-mean insolation: annual tables match an independent platform-math reference',()=>{
  // Independent reference: Math.asin/acos/tan, 4096 longitudes, analytic global mean S0/4.
  const reference=(eps,x)=>{
    const phi=Math.asin(x);let s=0;
    for(let j=0;j<4096;j++){
      const dec=Math.asin(Math.sin(eps)*Math.sin((j+.5)*2*Math.PI/4096));
      const c=Math.abs(Math.cos(phi))<1e-12?(x*Math.sin(dec)>0?-1:1):-Math.tan(phi)*Math.tan(dec);
      const h0=c>=1?0:c<=-1?Math.PI:Math.acos(c);
      s+=(h0*Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.sin(h0))/Math.PI;
    }
    return s/4096/.25;
  };
  for(const deg of [0,10,23.44,45,60,75,90]){
    const {qMean}=insolationTables(deg*D);
    for(const k of [0,8,16,32,40,48,56,60,63,64])
      assert.ok(Math.abs(qMean[k]-reference(deg*D,k/TABLE_ROWS))<2e-3,`obliquity ${deg} row ${k}: ${qMean[k]} vs ${reference(deg*D,k/TABLE_ROWS)}`);
    // Analytic anchors: polar annual mean is S0 sin(eps)/pi, i.e. 4 sin(eps)/pi of the global mean.
    assert.ok(Math.abs(qMean[TABLE_ROWS]-4*Math.sin(deg*D)/Math.PI)<1e-3);
  }
  assert.ok(Math.abs(insolationTables(0).qMean[0]-4/Math.PI)<1e-3,'zero obliquity: equator receives S0/pi');
  assert.ok(Math.abs(insolationTables(90*D).qMean[0]-8/(Math.PI*Math.PI))<1e-3,'90 deg: equator receives 2 S0/pi^2');
  // The trapezoid area mean is the normalisation: exactly 1 by construction.
  for(const deg of [0,23.44,60,90]){const {qMean}=insolationTables(deg*D);let a=0;for(let k=0;k<TABLE_ROWS;k++)a+=(qMean[k]+qMean[k+1])/2;assert.ok(Math.abs(a/TABLE_ROWS-1)<1e-12);}
});

test('obliquity: honour the drawn tilt 0..180 deg, folded, with correct high-tilt physics',()=>{
  const tables=deg=>climateForcingFromParams({anchorTempK:288,obliquityRad:deg*D,water:.5});
  const same=(a,b)=>Buffer.from(a.qMean.buffer).equals(Buffer.from(b.qMean.buffer))&&Buffer.from(a.qAmp.buffer).equals(Buffer.from(b.qAmp.buffer));
  const t0=tables(0),t23=tables(23.4),t60=tables(60),t90=tables(90),t120=tables(120),t180=tables(180);
  assert.ok(same(t120,t60),'120 deg (retrograde) == 60 deg folded, bit-identical');
  assert.ok(same(t180,t0),'180 deg == 0 deg folded, bit-identical');
  assert.equal(t120.obliquityRad,t60.obliquityRad);assert.equal(t180.obliquityRad,0);
  // 0 deg: no seasons anywhere, dark poles.
  assert.ok(t0.qAmp.every(v=>v===0));assert.equal(t0.qMean[TABLE_ROWS],0);
  // Earth-like: equator > pole. >~54 deg: poles receive more annual insolation than the equator.
  assert.ok(t23.qMean[0]>t23.qMean[TABLE_ROWS]);
  assert.ok(tables(50).qMean[0]>tables(50).qMean[TABLE_ROWS]);
  assert.ok(tables(58).qMean[0]<tables(58).qMean[TABLE_ROWS]);
  assert.ok(t60.qMean[TABLE_ROWS]>t60.qMean[0]&&t90.qMean[TABLE_ROWS]>t90.qMean[0]);
  // Seasonal half-range: polar seasons grow with tilt (polar half-range = 2 sin(eps) of the mean).
  for(const [f,deg] of [[t23,23.4],[t60,60],[t90,90]])assert.ok(Math.abs(f.qAmp[TABLE_ROWS]-2*Math.sin(deg*D))<1e-3);
  assert.ok(t0.qAmp[TABLE_ROWS]<t23.qAmp[TABLE_ROWS]&&t23.qAmp[TABLE_ROWS]<t60.qAmp[TABLE_ROWS]&&t60.qAmp[TABLE_ROWS]<t90.qAmp[TABLE_ROWS]);
  // Climate: at 60 deg the polar annual mean is warmer than the equator, and the pole's
  // seasonal half-range dwarfs the equator's (extreme polar seasons).
  const s=surfaceClimate(t60),pole=s([0,1,0],0,createClimateSample()),eq=s([1,0,0],0,createClimateSample());
  assert.ok(pole.annualMeanTempK>eq.annualMeanTempK,`60 deg: pole ${pole.annualMeanTempK} > equator ${eq.annualMeanTempK}`);
  assert.ok(pole.seasonalHalfRangeK>3*eq.seasonalHalfRangeK);
  const s90=surfaceClimate(t90)([0,1,0],0,createClimateSample());
  // surface-climate-2: the insolation half-range still grows with tilt; the temperature half-range
  // is saturated by the warmest-month ceiling at both poles (old: s90.seasonalHalfRangeK > pole's).
  assert.ok(s90.insolationHalfRange>pole.insolationHalfRange&&s90.warmestMonthK-s90.coldestMonthK===2*s90.seasonalHalfRangeK);
  assert.ok(s90.warmestMonthK<360&&pole.warmestMonthK<360,'warmest month saturates below 360 K');
  // Tilt t and pi-t: bit-identical tables (folding snaps to a power-of-two grid).
  for(let i=0;i<2000;i++){const t=(i+.37)/2000*Math.PI;assert.equal(effectiveObliquityRad(t),effectiveObliquityRad(Math.PI-t),`t=${t}`);}
  for(const t of [.1,.7,1.2,1.5]){assert.ok(same(climateForcingFromParams({anchorTempK:280,obliquityRad:t,water:.4}),climateForcingFromParams({anchorTempK:280,obliquityRad:Math.PI-t,water:.4})));}
  // Catalogue tilt is honoured as drawn (folded).
  const f=climateForcingFor(maithea),tilt=spinStateFor(maithea).axialTiltRad;
  assert.equal(f.obliquityRad,effectiveObliquityRad(tilt));
});

test('Earth reference forcing (288 K, 23.44 deg, water 0.7, 6.5 K/km) has the right shape',()=>{
  // surface-climate-2: the snow-line anchors (old: annual-mean isotherm onset 5120 m at the
  // equator, 2172 m at 45 deg, snow > 0.88 at sea level from 70 deg) moved to the PDD
  // equilibrium-line bands of tests/climate-earth-reference.test.mjs.
  const e=climateForcingFromParams({anchorTempK:288,obliquityRad:23.44*D,water:.7,lapseKPerM:.0065});
  const s=surfaceClimate(e),o=createClimateSample();
  // isothermHeightM reports the annual-mean isotherm of the datum column, warm-column lapse included.
  s([1,0,0],0,o);const T0=o.annualMeanTempK,iso=isothermHeightM(e,0,273.15);
  assert.ok(Math.abs(iso-(T0-273.15)/(.0065*warmColumnLapseFactor(T0)))<1e-6);
  s([1,0,0],iso,o);assert.ok(Math.abs(o.annualMeanTempK-273.15)<1e-9,'the column is at the threshold there');
  // Area-weighted mean of the datum temperature equals the anchor (sin-lat uniform = area uniform).
  let sum=0;const n=20000;for(let i=0;i<n;i++){const x=(i+.5)/n;s([Math.sqrt(1-x*x),x,0],0,o);sum+=o.annualMeanTempK;}
  assert.ok(Math.abs(sum/n-288)<=.5,`area mean ${sum/n}`);
  // The gravity-derived lapse rate reproduces the same Earth value without an override.
  assert.ok(Math.abs(climateForcingFromParams({anchorTempK:288,obliquityRad:23.44*D,water:.7,surfaceGravityMS2:9.81}).lapseKPerM-.0065)<1e-6);
});

test('warmest-month ceiling: saturating, symmetric, annual mean unchanged (surface-climate-2 step 3)',()=>{
  const Cc=CLIMATE_CALIBRATION;
  assert.equal(warmestMonthCeilingK(300),300);assert.equal(warmestMonthCeilingK(320),320);
  assert.equal(warmestMonthCeilingK(330),320+10/(1+10/40));
  let prev=-Infinity;for(let k=0;k<4000;k++){const t=250+k*.1,c=warmestMonthCeilingK(t);assert.ok(c>prev&&c<=t&&c<360);prev=c;}
  assert.ok(warmestMonthCeilingK(1e6)<360);
  // Live: on a hot, high-tilt water world the warmest month is the saturated raw one, the coldest
  // month moves by the same amount, and the annual mean is the uncapped one.
  const hot=climateForcingFromParams({anchorTempK:320,obliquityRad:89.8*D,water:.4,moistureSeed:7}),s=surfaceClimate(hot),o=createClimateSample();
  let capped=0;
  for(let i=0;i<20000;i++){
    const d=fib(i,20000),h=((i*7919)%3000);s(d,h,o);
    const halfRaw=Cc.SEASON_K*o.insolationHalfRange*(1-Cc.MARITIME*hot.water);
    const tw=Math.max(o.annualMeanTempK,warmestMonthCeilingK(o.annualMeanTempK+halfRaw));
    assert.ok(Math.abs(o.warmestMonthK-tw)<1e-9,`warmest ${o.warmestMonthK} vs ${tw}`);
    assert.ok(Math.abs((o.warmestMonthK-o.annualMeanTempK)-(o.annualMeanTempK-o.coldestMonthK))<1e-9);
    assert.ok(o.seasonalHalfRangeK>=0&&o.warmestMonthK<360);
    capped+=o.annualMeanTempK+halfRaw>Cc.TW_CEILING_K;
  }
  assert.ok(capped>5000,`the ceiling binds on this world (${capped}/20000)`);
});

test('heat cap: no forest where the warmest month reaches 316 K or the annual mean 320 K (step 4)',()=>{
  const Cc=CLIMATE_CALIBRATION,smooth=(x,lo,hi)=>{const t=Math.max(0,Math.min(1,(x-lo)/(hi-lo)));return t*t*(3-2*t);};
  let hot=0,mid=0,cool=0;
  for(const anchor of [290,300,310,320]){
    const f=climateForcingFromParams({anchorTempK:anchor,obliquityRad:(anchor-280)*1.5*D,water:.6,moistureSeed:anchor}),s=surfaceClimate(f),o=createClimateSample();
    for(let i=0;i<20000;i++){
      s(fib(i,20000),(i*7919)%2500,o);
      const heat=o.annualMeanTempK>=Cc.HEAT_ANNUAL_MAX_K?0:1-smooth(o.warmestMonthK,Cc.HEAT_LO_K,Cc.HEAT_HI_K);
      const noHeat=o.treeline01*Math.max(0,Math.min(1,(o.effectiveMoisture-Cc.FOREST_MOIST_LO)/Cc.FOREST_MOIST_RAMP))*Math.max(0,Math.min(1,1-o.snowFraction/.2));
      assert.equal(o.forestSuitability01,noHeat*heat);
      if(o.warmestMonthK>=316){assert.equal(o.forestSuitability01,0,`Tw ${o.warmestMonthK}`);hot++;}
      else if(o.warmestMonthK>305){mid+=o.forestSuitability01>0;}
      else cool+=o.forestSuitability01>0;
    }
  }
  assert.ok(hot>1000&&mid>100&&cool>1000,`non-vacuous: hot ${hot}, ramp with forest ${mid}, cool with forest ${cool}`);
});

test('PET effective moisture: P/PET aridity index, Holdridge PET, thresholds keep their AI meaning (step 5)',()=>{
  const Cc=CLIMATE_CALIBRATION,cl=(v,a,b)=>v<a?a:v>b?b:v;
  // The 0.43 / 0.44 / 0.52 effective-moisture thresholds are aridity indices 0.45 / 0.47 / 0.65.
  for(const [e,ai] of [[.43,.4526],[.44,.4714],[.52,.65]])assert.ok(Math.abs(e*Cc.AI_HALF/(1-e)-ai)<1e-3);
  const bodies=[climateForcingFor(maithea),climateForcingFromParams({anchorTempK:300,obliquityRad:70*D,water:.3,moistureSeed:99}),climateForcingFromParams({anchorTempK:255,obliquityRad:10*D,water:1.4,moistureSeed:5})];
  let n=0;
  for(const f of bodies){
    const s=surfaceClimate(f),o=createClimateSample();
    for(let i=0;i<20000;i++){
      s(fib(i,20000),((i*7919)%7000)-300,o);
      const biotemp=(degreeDaysAbove(o.annualMeanTempK,o.seasonalHalfRangeK,0)-degreeDaysAbove(o.annualMeanTempK,o.seasonalHalfRangeK,30))/Cc.YEAR_D;
      const pet=Math.max(Cc.PET_MIN_MM,Cc.PET_MM_PER_BIOTEMP_C*biotemp);
      assert.equal(o.petMm,pet);assert.ok(o.petMm>=Cc.PET_MIN_MM&&o.precipMm>0);
      const ai=o.precipMm/o.petMm;
      assert.equal(o.effectiveMoisture,ai/(ai+Cc.AI_HALF));
      assert.ok(o.effectiveMoisture>0&&o.effectiveMoisture<1);
      assert.equal(o.aridity01,cl((.5-o.effectiveMoisture)*4,0,1));
      // The precipitation index scales with the legacy noise: base + gain x legacyMoisture.
      const base=o.precipMm/(Cc.P_NOISE_BASE+Cc.P_NOISE_GAIN*o.legacyMoisture);
      assert.ok(Number.isFinite(base)&&base>0);
      n++;
    }
  }
  assert.equal(n,60000);
  // Wetter noise means more precipitation and higher effective moisture at the same climate.
  const f=climateForcingFromParams({anchorTempK:288,obliquityRad:23.44*D,water:.7,moistureSeed:1}),s=surfaceClimate(f),a=createClimateSample();
  let lo={m:2},hi={m:-1};
  for(let i=0;i<4000;i++){const d=[Math.cos(i),0.3,Math.sin(i)];s(d,0,a);if(a.legacyMoisture<lo.m)lo={m:a.legacyMoisture,e:a.effectiveMoisture};if(a.legacyMoisture>hi.m)hi={m:a.legacyMoisture,e:a.effectiveMoisture};}
  assert.ok(hi.e>lo.e);
});

test('per-planet lapse rate from surface gravity (owner amendment 1)',()=>{
  assert.ok(Math.abs(lapseRateForGravity(9.81)-.0065)<1e-6);
  assert.equal(lapseRateForGravity(0),CLIMATE_CALIBRATION.LAPSE_MIN_K_PER_M);
  assert.equal(lapseRateForGravity(1000),CLIMATE_CALIBRATION.LAPSE_MAX_K_PER_M);
  const rocky=allBodies.filter(b=>b.kind==='planet'&&b.type!=='Gas giant');
  assert.ok(rocky.length>500);
  // surface-climate-1.1-geo-g (owner decision 3): the lapse gravity is the surface
  // physics gravity planetGeophysics(b).surfaceGravityMS2, provenance 'geophysics',
  // never the catalogue orbital mass G*M/R^2 (owner decision 4: they may disagree).
  let differsFromCatalogue=0;
  for(const b of rocky.slice(0,120)){
    const g=planetGeophysics(b).surfaceGravityMS2,f=climateForcingFor(b);
    assert.equal(f.surfaceGravityMS2,g);assert.equal(f.lapseKPerM,lapseRateForGravity(g));
    assert.equal(f.provenance.surfaceGravityMS2,'geophysics');
    assert.equal(f.provenance.lapseKPerM,'derived-heuristic');
    if(g!==surfaceGravityMS2(b))differsFromCatalogue++;
  }
  assert.ok(differsFromCatalogue>100,`geophysics g must actually replace catalogue g (${differsFromCatalogue}/120 differ)`);
  // Range and ordering are derived from geophysics g, not radius: planet-geophysics-1
  // has a per-kind density, so g (and the lapse) is no longer monotone in radius.
  // Re-derived 2026-10-03 over 7622 rocky planets. OLD (catalogue g, surface-climate-1):
  // g 2.68..12.08 m/s^2, lapse 1.78..8.00 K/km, never clamped, monotone in radius.
  // NEW (geophysics g): g 2.103..21.33 m/s^2, lapse 1.393 K/km .. the 9.8 K/km clamp,
  // reached by 1001 planets (13.1%).
  const lapse=rocky.map(b=>{const g=planetGeophysics(b).surfaceGravityMS2;return {g,l:lapseRateForGravity(g)};}).sort((a,b)=>a.g-b.g);
  const min=lapse[0].l,max=lapse[lapse.length-1].l;
  assert.ok(min>.0013&&min<.0015,`lapse min ${min} (measured 0.001393)`);
  assert.equal(max,CLIMATE_CALIBRATION.LAPSE_MAX_K_PER_M,`lapse max ${max}: the high-g tail reaches the dry-adiabat clamp`);
  const clamped=lapse.filter(x=>x.l===CLIMATE_CALIBRATION.LAPSE_MAX_K_PER_M).length/lapse.length;
  assert.ok(clamped>.11&&clamped<.15,`share at the 9.8 K/km clamp ${clamped} (measured 0.131)`);
  assert.ok(lapse.every(x=>x.l>CLIMATE_CALIBRATION.LAPSE_MIN_K_PER_M),'no rocky planet reaches the 1 K/km floor');
  for(let i=1;i<lapse.length;i++)assert.ok(lapse[i].l>=lapse[i-1].l,'lapse is non-decreasing in geophysics g');
  // Maithea: OLD catalogue g 6.9713 m/s^2 -> lapse 4.6188 K/km (old band 4..5 K/km);
  // NEW geophysics g 6.8242 m/s^2 -> lapse 4.5214 K/km. The new band excludes the old value.
  const m=climateForcingFor(maithea);
  assert.equal(m.surfaceGravityMS2,planetGeophysics(maithea).surfaceGravityMS2);
  assert.ok(m.lapseKPerM>.0044&&m.lapseKPerM<.0046,`Maithea lapse ${m.lapseKPerM} (measured 0.0045214)`);
  assert.ok(!(lapseRateForGravity(surfaceGravityMS2(maithea))<.0046),'the old catalogue-g lapse (0.0046188) lies outside the new band');
  // Override is for calibration studies only and is tagged as such.
  assert.equal(climateForcingFor(maithea,{lapseKPerM:.0065}).provenance.lapseKPerM,'override');
});

test('legacyMoisture is bit-identical to the classifier; temperateHabitat equals the renderer gate',()=>{
  const bodies=[maithea,...lifeBodies.slice(0,3),allBodies.find(b=>b.type==='Ice world'),allBodies.find(b=>b.type==='Rocky world')];
  assert.equal(bodies.length,6);
  for(const body of bodies){
    const classify=biomeClassifier(body),climate=surfaceClimate(climateForcingFor(body)),o=createClimateSample();
    for(let i=0;i<20000;i++){
      const d=fib(i,20000),h=((i*7919)%9000)-500;
      assert.equal(climate(d,h,o).legacyMoisture,classify(d,h).moisture);
    }
  }
  const renderer=readFileSync(new URL('../src/planet-renderer.ts',import.meta.url),'utf8');
  // W1-D moved the inline renderer gate to temperateHabitat(this.body); the value
  // parity of that function with the old inline gate is asserted just below.
  assert.ok(renderer.includes("groundHabitat={value:temperateHabitat(this.body)?1:0}"),'renderer gate moved; re-check parity');
  const gate=b=>b.water>0&&b.temperatureK>=250&&b.temperatureK<=325&&b.type!=='Ice world'&&b.type!=='Volcanic world';
  assert.equal(firstSystems.length,2000);
  for(const b of allBodies)assert.equal(temperateHabitat(b),gate(b),b.id);
  assert.ok(lifeBodies.length>=200);
});

const DIGEST_SRC=`
import {createHash} from 'node:crypto';
export function climateDigest(SC,bodies,perBody){
  const out={};
  for(const b of bodies){
    const s=SC.surfaceClimate(SC.climateForcingFor(b)),o=SC.createClimateSample(),buf=new Float64Array(perBody*18);
    for(let i=0;i<perBody;i++){
      const y=1-2*(i+.5)/perBody,p=i*2.399963229728653,r=Math.sqrt(1-y*y),h=((i*7919)%12000)-1000;
      s([Math.cos(p)*r,y,Math.sin(p)*r],h,o);
      const v=[o.insolation01,o.insolationHalfRange,o.annualMeanTempK,o.seasonalHalfRangeK,o.warmestMonthK,o.coldestMonthK,o.legacyMoisture,o.dryBelt01,o.effectiveMoisture,o.aridity01,o.snowFraction,o.treeline01,o.growingSeason01,o.forestSuitability01,o.climateCode,o.pdd,o.precipMm,o.petMm];
      buf.set(v,i*18);
    }
    out[b.id]=createHash('sha256').update(Buffer.from(buf.buffer)).digest('hex');
  }
  return out;
}`;

test('determinism: 50k samples identical across cold processes, cache states and body order',()=>{
  const dir=mkdtempSync(join(tmpdir(),'surface-climate-')),helper=join(dir,'digest.mjs'),runner=join(dir,'run.mjs');
  writeFileSync(helper,DIGEST_SRC);
  const src=u=>new URL(u,import.meta.url).href;
  writeFileSync(runner,`import * as SC from '${src('../src/surface-climate.ts')}';
import {galaxies,refByAddress,sector,system} from '${src('../src/catalog.ts')}';
import {climateDigest} from './digest.mjs';
const g=galaxies('LETHRA-001')[0],bodies=[system(refByAddress(g,'G001/C2128,0,1/0')).planets[1]];
for(const ref of sector(g,[266,0,0]).refs){for(const b of system(ref).planets)if(SC.temperateHabitat(b)&&bodies.length<10&&!bodies.some(x=>x.id===b.id))bodies.push(b);if(bodies.length>=10)break;}
console.log(JSON.stringify(climateDigest(SC,bodies,5000)));`);
  const cold1=execFileSync(process.execPath,[runner],{encoding:'utf8'}).trim(),cold2=execFileSync(process.execPath,[runner],{encoding:'utf8'}).trim();
  assert.equal(cold1,cold2,'two cold processes');
  const expected=JSON.parse(cold1);
  assert.equal(Object.keys(expected).length,10);
  return import(pathToFileURL(helper).href).then(async ({climateDigest})=>{
    const SC=await import('../src/surface-climate.ts');
    const bodies=[maithea,...lifeBodies.filter(b=>b.id!==maithea.id)].filter(b=>b.id in expected);
    clearClimateForcingCache();
    assert.deepEqual(climateDigest(SC,bodies,5000),expected,'in-process cold cache');
    assert.deepEqual(climateDigest(SC,bodies,5000),expected,'warm cache');
    const shuffled=[...bodies].reverse();shuffled.push(shuffled.shift());
    // Evict everything (FIFO cap 64) between passes, in shuffled order.
    for(const b of lifeBodies.slice(0,80))climateForcingFor(b);
    assert.equal(climateForcingCacheSize(),64);
    assert.deepEqual(climateDigest(SC,shuffled,5000),expected,'evicted cache, shuffled body order');
  });
});

test('forcing cache: FIFO eviction never changes values',()=>{
  clearClimateForcingCache();
  const cold=lifeBodies.slice(0,100).map(b=>climateForcingFor(b));
  assert.equal(climateForcingCacheSize(),64);
  const warm=lifeBodies.slice(0,100).map(b=>climateForcingFor(b));
  for(let i=0;i<100;i++){
    assert.deepEqual({...warm[i],qMean:[...warm[i].qMean],qAmp:[...warm[i].qAmp]},{...cold[i],qMean:[...cold[i].qMean],qAmp:[...cold[i].qAmp]});
  }
  assert.equal(climateForcingFor(lifeBodies[99]),climateForcingFor(lifeBodies[99]),'hit returns the cached object');
  // Anchor override is part of the key.
  assert.notEqual(climateForcingFor(maithea,{anchorTempK:300}).anchorTempK,climateForcingFor(maithea).anchorTempK);
  assert.equal(climateForcingFor(maithea,{anchorTempK:300}).provenance.anchorTempK,'override');
});

test('continuity: no steps at cube edges, poles, table rows or across the zonal band',()=>{
  const forcings=[climateForcingFor(maithea),climateForcingFromParams({anchorTempK:288,obliquityRad:70*D,water:.5,moistureSeed:12345})];
  const fields=['insolation01','insolationHalfRange','annualMeanTempK','seasonalHalfRangeK','warmestMonthK','legacyMoisture','dryBelt01','effectiveMoisture','aridity01','snowFraction','treeline01','growingSeason01','forestSuitability01'];
  const atX=(x,lon)=>{const r=Math.sqrt(1-x*x);return [Math.cos(lon)*r,x,Math.sin(lon)*r];};
  const probes=[unit([1,1,.3]),unit([1,.2,1]),unit([.4,1,1]),unit([1,1,1]),unit([-1,1,-1]),[0,1,0],[0,-1,0],unit([1e-7,1,0])];
  // surface-climate-2: the fixed dry-belt edges are gone; probe the zonal band's features (ITCZ, the
  // subsidence centre and its flanks, the storm track, the polar term) for both ITCZ positions, plus
  // insolation and zonal table row boundaries.
  const latsDeg=[10,16,28,40,50,62,74,80,88];
  for(const lat of latsDeg)for(const lon of [.3,2.1,4.4]){const x=Math.sin(lat*D);probes.push(atX(x,lon),atX(-x,lon));}
  for(const x of [3/64,17/64,40/64,61/64,101/512,333/512,509/512])probes.push(atX(x,1.3),atX(-x,5.1));
  const rot=(d,axis,a)=>{ // Rodrigues rotation by a tiny angle
    const c=Math.cos(a),s=Math.sin(a),k=unit(axis),dot=k[0]*d[0]+k[1]*d[1]+k[2]*d[2];
    const cr=[k[1]*d[2]-k[2]*d[1],k[2]*d[0]-k[0]*d[2],k[0]*d[1]-k[1]*d[0]];
    return d.map((v,i)=>v*c+cr[i]*s+k[i]*dot*(1-c));
  };
  let checked=0;
  for(const f of forcings){
    const s=surfaceClimate(f),a=createClimateSample(),b=createClimateSample();
    for(const d of probes)for(const axis of [[1,0,0],[0,0,1],[1,1,0],[0,1,1]])for(const h of [0,800,2500]){
      s(d,h,a);s(rot(d,axis,1e-6),h,b);
      for(const k of fields){assert.ok(Math.abs(a[k]-b[k])<=1e-3,`${k} jumps ${a[k]}->${b[k]} at ${d} h=${h}`);checked++;}
      // Degree-days, precipitation and PET are in C*d and mm: 0.1 of either moves snowFraction / effM by < 1e-3.
      for(const k of ['pdd','precipMm','petMm'])assert.ok(Math.abs(a[k]-b[k])<=.1,`${k} jumps ${a[k]}->${b[k]} at ${d} h=${h}`);
    }
  }
  assert.ok(checked>5000);
  // The subsidence diagnostic is the zonal band's Hadley term e^-((dI-28)/12)^2, centred 28 deg from the ITCZ.
  const belt=(f,lat)=>surfaceClimate(f)(atX(Math.sin(lat*D),1),0,createClimateSample()).dryBelt01;
  const g=x=>Math.exp(-x*x);
  for(const lat of [0,10,20,28,35,45,60]){
    assert.ok(Math.abs(belt(forcings[0],lat)-g((lat-28)/12))<2e-3,`ITCZ at the equator, lat ${lat}`);
    assert.ok(Math.abs(belt(forcings[1],lat)-g((90-lat-28)/12))<2e-2,`ITCZ at the pole, lat ${lat}`);
  }
});

test('sample fields: ranges, climate code round-trip, frozen and dry worlds',()=>{
  for(let code=0;code<256;code++){
    const {deltaTempK,moisture}=decodeClimateCode(code);
    const tBin=Math.floor((deltaTempK+32)/2),mBin=Math.floor(moisture*8);
    assert.equal((tBin<<3)|mBin,code);
  }
  const s=surfaceClimate(climateForcingFor(maithea)),o=createClimateSample();
  for(let i=0;i<20000;i++){
    s(fib(i,20000),((i*104729)%20000)-1000,o);
    for(const k of ['dryBelt01','aridity01','snowFraction','treeline01','growingSeason01','forestSuitability01'])assert.ok(o[k]>=0&&o[k]<=1,`${k}=${o[k]}`);
    assert.ok(Number.isInteger(o.climateCode)&&o.climateCode>=0&&o.climateCode<256);
    assert.ok(o.seasonalHalfRangeK>=0&&o.warmestMonthK>=o.annualMeanTempK);
    assert.ok(Number.isFinite(o.pdd)&&o.pdd>=0,`pdd=${o.pdd}`);
    // The snow rule: clamp01((PDD_CRIT - pdd)/PDD_RAMP) on a water world.
    assert.equal(o.snowFraction,Math.max(0,Math.min(1,(CLIMATE_CALIBRATION.PDD_CRIT-o.pdd)/CLIMATE_CALIBRATION.PDD_RAMP)));
    const {deltaTempK}=decodeClimateCode(o.climateCode);
    if(o.annualMeanTempK-maithea.temperatureK>-31&&o.annualMeanTempK-maithea.temperatureK<31)assert.ok(Math.abs(deltaTempK-(o.annualMeanTempK-maithea.temperatureK))<=1);
  }
  const ice=allBodies.find(b=>b.type==='Ice world'),dry=allBodies.find(b=>b.type==='Rocky world'&&!b.water);
  const si=surfaceClimate(climateForcingFor(ice))([1,0,0],0,createClimateSample()),sd=surfaceClimate(climateForcingFor(dry))([0,1,0],9000,createClimateSample());
  assert.equal(si.snowFraction,1);assert.equal(si.forestSuitability01,0);
  assert.equal(sd.snowFraction,0);assert.equal(sd.forestSuitability01,0);
});

test('Maithea: snow emerges from its own gravity, and the 18 km equatorial summit is snow',()=>{
  const f=climateForcingFor(maithea),s=surfaceClimate(f),o=createClimateSample();
  const sites=[
    // test-results/biome-plan-2026-10-02/sites.json (resolved with the shipped classifier)
    {d:[0.7040483064066647,0.029326666666666612,0.7095462838096817],h:18065.6,snow:true}, // highMountain (legacy: brown soil)
    {d:[0.823489606008632,-0.17756666666666665,0.5388273820850579],h:303.2,snow:false}, // equatorLowland
    {d:[0.34535062107191883,-0.9275800000000001,0.14257731981363617],h:688.3,snow:true}, // polar
  ];
  for(const site of sites){s(site.d,site.h,o);assert.equal(o.snowFraction>.6,site.snow,JSON.stringify({...site,snow:o.snowFraction,T:o.annualMeanTempK}));}
});
