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
} from '../src/surface-climate.ts';

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
  // surface-climate-1.1-geo-g (P4-RELIEF E): the lapse gravity source moved to
  // planet-geophysics; CLIMATE_CALIBRATION and its sha are unchanged.
  assert.equal(CLIMATE_VERSION,'surface-climate-1.1-geo-g');
  assert.ok(Object.isFrozen(CLIMATE_CALIBRATION));
  const sha=createHash('sha256').update(JSON.stringify(CLIMATE_CALIBRATION)).digest('hex');
  assert.equal(sha,'7d18c56d825d5a5e9c77403dd029214c6caeeeba60e4eafe462592907d1634c1',`calibration JSON changed (sha ${sha}); bump CLIMATE_VERSION and re-pin`);
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
  assert.ok(s90.seasonalHalfRangeK>pole.seasonalHalfRangeK&&s90.warmestMonthK-s90.coldestMonthK===2*s90.seasonalHalfRangeK);
  // Tilt t and pi-t: bit-identical tables (folding snaps to a power-of-two grid).
  for(let i=0;i<2000;i++){const t=(i+.37)/2000*Math.PI;assert.equal(effectiveObliquityRad(t),effectiveObliquityRad(Math.PI-t),`t=${t}`);}
  for(const t of [.1,.7,1.2,1.5]){assert.ok(same(climateForcingFromParams({anchorTempK:280,obliquityRad:t,water:.4}),climateForcingFromParams({anchorTempK:280,obliquityRad:Math.PI-t,water:.4})));}
  // Catalogue tilt is honoured as drawn (folded).
  const f=climateForcingFor(maithea),tilt=spinStateFor(maithea).axialTiltRad;
  assert.equal(f.obliquityRad,effectiveObliquityRad(tilt));
});

test('Earth reference forcing (288 K, 23.44 deg, water 0.7, 6.5 K/km) has the right shape',()=>{
  const e=climateForcingFromParams({anchorTempK:288,obliquityRad:23.44*D,water:.7,lapseKPerM:.0065});
  const onset=lat=>isothermHeightM(e,Math.sin(lat*D),CLIMATE_CALIBRATION.T_SNOW_K);
  assert.ok(onset(0)>=4300&&onset(0)<=5500,`equatorial snow onset ${onset(0)} m`);
  assert.ok(onset(45)>=1200&&onset(45)<=3000,`45 deg snow onset ${onset(45)} m`);
  const s=surfaceClimate(e),o=createClimateSample();
  for(const lat of [70,75,80,85,90]){s([Math.cos(lat*D),Math.sin(lat*D),0],0,o);assert.ok(o.snowFraction>.6,`lat ${lat}: snow ${o.snowFraction}`);}
  // Area-weighted mean of the datum temperature equals the anchor (sin-lat uniform = area uniform).
  let sum=0;const n=20000;for(let i=0;i<n;i++){const x=(i+.5)/n;s([Math.sqrt(1-x*x),x,0],0,o);sum+=o.annualMeanTempK;}
  assert.ok(Math.abs(sum/n-288)<=.5,`area mean ${sum/n}`);
  // The gravity-derived lapse rate reproduces the same Earth value without an override.
  assert.ok(Math.abs(climateForcingFromParams({anchorTempK:288,obliquityRad:23.44*D,water:.7,surfaceGravityMS2:9.81}).lapseKPerM-.0065)<1e-6);
});

test('per-planet lapse rate from surface gravity (owner amendment 1)',()=>{
  assert.ok(Math.abs(lapseRateForGravity(9.81)-.0065)<1e-6);
  assert.equal(lapseRateForGravity(0),CLIMATE_CALIBRATION.LAPSE_MIN_K_PER_M);
  assert.equal(lapseRateForGravity(1000),CLIMATE_CALIBRATION.LAPSE_MAX_K_PER_M);
  const rocky=allBodies.filter(b=>b.kind==='planet'&&b.type!=='Gas giant');
  assert.ok(rocky.length>500);
  for(const b of rocky.slice(0,120)){
    const g=surfaceGravityMS2(b),f=climateForcingFor(b);
    assert.equal(f.surfaceGravityMS2,g);assert.equal(f.lapseKPerM,lapseRateForGravity(g));
    assert.equal(f.provenance.lapseKPerM,'derived-heuristic');
  }
  const lapse=rocky.map(b=>({r:b.radiusM,l:lapseRateForGravity(surfaceGravityMS2(b))})).sort((a,b)=>a.r-b.r);
  const min=lapse[0].l,max=lapse[lapse.length-1].l;
  // Fixed 4800 kg/m^3 bulk density => g proportional to radius => a real spread, never clamped.
  assert.ok(min>.0015&&min<.0025&&max>.007&&max<.0085,`lapse range ${min}..${max}`);
  for(let i=1;i<lapse.length;i++)assert.ok(lapse[i].l>=lapse[i-1].l);
  const m=climateForcingFor(maithea);
  assert.ok(m.lapseKPerM>.004&&m.lapseKPerM<.005,`Maithea lapse ${m.lapseKPerM}`);
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
    const s=SC.surfaceClimate(SC.climateForcingFor(b)),o=SC.createClimateSample(),buf=new Float64Array(perBody*15);
    for(let i=0;i<perBody;i++){
      const y=1-2*(i+.5)/perBody,p=i*2.399963229728653,r=Math.sqrt(1-y*y),h=((i*7919)%12000)-1000;
      s([Math.cos(p)*r,y,Math.sin(p)*r],h,o);
      const v=[o.insolation01,o.insolationHalfRange,o.annualMeanTempK,o.seasonalHalfRangeK,o.warmestMonthK,o.coldestMonthK,o.legacyMoisture,o.dryBelt01,o.effectiveMoisture,o.aridity01,o.snowFraction,o.treeline01,o.growingSeason01,o.forestSuitability01,o.climateCode];
      buf.set(v,i*15);
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

test('continuity: no steps at cube edges, poles or the dry-belt edges',()=>{
  const forcings=[climateForcingFor(maithea),climateForcingFromParams({anchorTempK:288,obliquityRad:70*D,water:.5,moistureSeed:12345})];
  const fields=['insolation01','insolationHalfRange','annualMeanTempK','seasonalHalfRangeK','warmestMonthK','legacyMoisture','dryBelt01','effectiveMoisture','aridity01','snowFraction','treeline01','growingSeason01','forestSuitability01'];
  const C=CLIMATE_CALIBRATION;
  const atX=(x,lon)=>{const r=Math.sqrt(1-x*x);return [Math.cos(lon)*r,x,Math.sin(lon)*r];};
  const probes=[unit([1,1,.3]),unit([1,.2,1]),unit([.4,1,1]),unit([1,1,1]),unit([-1,1,-1]),[0,1,0],[0,-1,0],unit([1e-7,1,0])];
  for(const x of [C.BELT_LO,C.BELT_HI,C.BELT_LO-C.BELT_EDGE,C.BELT_LO+C.BELT_EDGE,C.BELT_HI-C.BELT_EDGE,C.BELT_HI+C.BELT_EDGE])for(const lon of [.3,2.1,4.4])probes.push(atX(x,lon),atX(-x,lon));
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
    }
  }
  assert.ok(checked>5000);
  // The legacy hard step at sin-lat 0.18/0.52 is gone: the belt ramps smoothly.
  const belt=x=>surfaceClimate(forcings[0])(atX(x,1),0,createClimateSample()).dryBelt01;
  assert.ok(belt(.18)>.4&&belt(.18)<.6&&belt(.52)>.4&&belt(.52)<.6&&belt(.35)===1&&belt(.1)===0&&belt(.6)===0);
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
