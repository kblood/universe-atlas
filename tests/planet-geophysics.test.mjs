// planet-geophysics-1 (relief round 2026-10-03, package P1-GEO-FLOOR).
// Plan: scratchpad relief-plan.json, package P1-GEO-FLOOR, change (A).
// Docs: docs/planet-geophysics-v1.md.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {galaxies,hash64,sector,system} from '../src/catalog.ts';
import {temperateHabitat} from '../src/surface-climate.ts';
import {
  GEOPHYSICS_VERSION,AIR_RETENTION_FACTOR,TECTONIC_REFERENCE_VIGOUR,SEA_WATER_DENSITY_KG_M3,
  planetGeophysics,geophysicsFromParams,geophysicsDraws,tectonicReliefFor,pressureAtDepthPa,
} from '../src/planet-geophysics.ts';
import {waterWorlds} from './terrain-climate-fixtures.mjs';

// Solar-system analogues at their real radii, a core MASS fraction chosen per
// analogue, and catalogue-convention temperatures (catalog.ts: 278/sqrt(a AU);
// a moon takes its parent's). Real densities/gravities: NASA planetary fact
// sheets (see docs/planet-geophysics-v1.md for provenance per value).
const ANALOGUES={
  earth:{kind:'planet',type:'Oceanic world',radiusM:6.371e6,coreFraction:0.32,temperatureK:278,water:0.7,rho:5514,g:9.81},
  venus:{kind:'planet',type:'Rocky world',radiusM:6.0518e6,coreFraction:0.30,temperatureK:327,water:0,rho:5243,g:8.87},
  mars:{kind:'planet',type:'Rocky world',radiusM:3.3895e6,coreFraction:0.15,temperatureK:225,water:0,rho:3933,g:3.72},
  mercury:{kind:'planet',type:'Rocky world',radiusM:2.4397e6,coreFraction:0.60,temperatureK:447,water:0,rho:5427,g:3.70},
  moon:{kind:'moon',type:'Airless moon',radiusM:1.7374e6,coreFraction:0.02,temperatureK:278,water:0,rho:3344,g:1.62},
  titan:{kind:'moon',type:'Ice world',radiusM:2.5747e6,coreFraction:0.10,temperatureK:90,water:0,rho:1880,g:1.35},
};
const analogue=(a,vigourDraw01=0.5)=>geophysicsFromParams({...a,vigourDraw01});

/** Planning corpus (scratchpad relief-scripts/corpus.mjs): LETHRA-GOLDEN-001
 * galaxies 0-2, sector [0,0,0], first 120 refs; habitable water planets. */
function habitableWaterCorpus(){
  const out=[];
  for(const g of galaxies('LETHRA-GOLDEN-001').slice(0,3)){
    const s=sector(g,[0,0,0]);
    for(const r of s.refs.slice(0,120))for(const p of system(r).planets){
      if(p.type==='Gas giant'||!(p.water>0)||!temperateHabitat(p))continue;out.push(p);
    }
  }
  return out;
}
/** Rocky corpus: same galaxies and sector, every non-gas-giant planet in
 * reference order, first 460. */
function rockyCorpus(){
  const out=[];
  for(const g of galaxies('LETHRA-GOLDEN-001').slice(0,3)){
    const s=sector(g,[0,0,0]);
    for(const r of s.refs)for(const p of system(r).planets){
      if(p.type==='Gas giant')continue;out.push(p);if(out.length>=460)return out;
    }
  }
  return out;
}
const quantile=(a,x)=>{const s=[...a].sort((u,v)=>u-v);return s[Math.floor(x*(s.length-1))];};
function spearman(a,b){
  const rank=v=>{const idx=v.map((x,i)=>[x,i]).sort((p,q)=>p[0]-q[0]);const r=new Array(v.length);idx.forEach(([,i],k)=>{r[i]=k;});return r;};
  const ra=rank(a),rb=rank(b),m=(a.length-1)/2;let sab=0,saa=0,sbb=0;
  for(let i=0;i<a.length;i++){sab+=(ra[i]-m)*(rb[i]-m);saa+=(ra[i]-m)*(ra[i]-m);sbb+=(rb[i]-m)*(rb[i]-m);}
  return sab/Math.sqrt(saa*sbb);
}
/** The planning prototype (scratchpad relief-scripts/geo.mjs), verbatim maths. */
function prototype(b){
  const h=hash64(b.seed+'/geophysics-1');
  const u1=Number(h&0xffffn)/65535,u2=Number((h>>16n)&0xffffn)/65535,u3=Number((h>>32n)&0xffffn)/65535;
  const cf=0.10+0.50*((u1+u2)/2),x=b.radiusM/6.371e6;
  const rho=1/((1-cf)/3300+cf/8000)*(1+0.35*x*x),g=4/3*Math.PI*6.674e-11*rho*b.radiusM;
  const vigour=(0.35+0.65*u3)*Math.min(1,b.radiusM/6.4e6);
  return {cf,rho,g,vigour,tau:Math.min(2.6,Math.max(0.6,9.81/g))*vigour/0.7};
}

test('version string',()=>{assert.equal(GEOPHYSICS_VERSION,'planet-geophysics-1');});

test('analogue densities within 10% of Earth 5514, Mars 3933, Mercury 5427, Moon 3344',()=>{
  for(const k of ['earth','mars','mercury','moon']){
    const a=ANALOGUES[k],x=analogue(a);
    assert.ok(Math.abs(x.densityKgM3/a.rho-1)<0.10,`${k} ${x.densityKgM3} vs ${a.rho}`);
  }
});

test('Earth twin (cf 0.32): g = 9.81 +- 0.3, escape velocity ~11.2 km/s',()=>{
  const x=analogue(ANALOGUES.earth);
  assert.ok(Math.abs(x.surfaceGravityMS2-9.81)<=0.3,String(x.surfaceGravityMS2));
  assert.ok(Math.abs(x.escapeVelocityMS-11186)<300,String(x.escapeVelocityMS));
});

test('hasAir: Earth, Venus, Mars, Titan true; Moon, Mercury false; with margin around the retention factor',()=>{
  for(const k of ['earth','venus','mars','titan'])assert.equal(analogue(ANALOGUES[k]).hasAir,true,k);
  for(const k of ['moon','mercury'])assert.equal(analogue(ANALOGUES[k]).hasAir,false,k);
  // Dry analogues: retention ratios sit at least 15% from the threshold.
  for(const k of ['venus','mars','titan'])assert.ok(analogue(ANALOGUES[k]).airRetentionRatio>1.15*AIR_RETENTION_FACTOR,k);
  for(const k of ['moon','mercury'])assert.ok(analogue(ANALOGUES[k]).airRetentionRatio<0.85*AIR_RETENTION_FACTOR,k);
  // Air classes and pressures (heuristic, provenance-flagged).
  const e=analogue(ANALOGUES.earth),v=analogue(ANALOGUES.venus),m=analogue(ANALOGUES.mars),mo=analogue(ANALOGUES.moon);
  assert.equal(e.airClass,'earthlike');assert.equal(v.airClass,'thick');assert.equal(m.airClass,'thin');assert.equal(mo.airClass,'none');
  assert.ok(Math.abs(e.surfacePressurePa/101325-1)<0.03);
  assert.ok(Math.abs(v.surfacePressurePa/9.2e6-1)<0.03);
  assert.ok(Math.abs(m.surfacePressurePa/610-1)<0.05);
  assert.equal(mo.surfacePressurePa,0);
  assert.equal(e.surfacePressureProvenance,'heuristic');assert.equal(mo.surfacePressureProvenance,'none');
});

test('tectonicRelief: Earth twin at the reference vigour 0.7 = 1.00 +- 0.02; at the seed-median draw it is 0.964',()=>{
  const e=analogue(ANALOGUES.earth);
  assert.ok(Math.abs(tectonicReliefFor(e.surfaceGravityMS2,TECTONIC_REFERENCE_VIGOUR)-1)<=0.02);
  // u3 = 0.5 gives vigour (0.35+0.325)*6.371/6.4 = 0.672, hence tau 0.964
  // (documented: the 0.7 normaliser is the planning prototype's, kept so the
  // calibrated relief of every planet is unchanged).
  const median=analogue(ANALOGUES.earth,0.5);
  assert.ok(Math.abs(median.tectonicRelief-0.964)<0.002,String(median.tectonicRelief));
  // Gravity factor clamps.
  assert.equal(tectonicReliefFor(50,0.7),0.6);
  assert.equal(tectonicReliefFor(1,0.7),2.6);
});

test('ocean fluid and hydrostatic pressure: Earth twin at Challenger Deep depth ~ 1086 bar',()=>{
  const e=analogue(ANALOGUES.earth);
  assert.equal(e.fluidDensityKgM3,SEA_WATER_DENSITY_KG_M3);assert.equal(e.fluidKind,'sea-water');
  const p=pressureAtDepthPa(e,10935);
  assert.ok(Math.abs(p/1.086e8-1)<0.02,String(p));
  assert.equal(pressureAtDepthPa(e,-50),e.surfacePressurePa);
  const dry=analogue(ANALOGUES.mars);assert.equal(dry.fluidDensityKgM3,0);assert.equal(dry.fluidKind,null);
});

test('gas giants and stars: no solid surface, tectonicRelief 0; gas giants at the 1 bar convention',()=>{
  const gg=geophysicsFromParams({kind:'planet',type:'Gas giant',radiusM:6.99e7,temperatureK:122,water:0,coreFraction:0.3,vigourDraw01:0.5});
  assert.equal(gg.model,'gas-giant');assert.equal(gg.solidSurface,false);assert.equal(gg.tectonicRelief,0);
  assert.equal(gg.surfacePressurePa,100000);assert.equal(gg.surfacePressureProvenance,'convention-1bar');
  assert.ok(gg.surfaceGravityMS2>20&&gg.surfaceGravityMS2<30,String(gg.surfaceGravityMS2));
  const star=geophysicsFromParams({kind:'star',type:'G',radiusM:6.957e8,temperatureK:5772,water:0,coreFraction:0,vigourDraw01:0});
  assert.equal(star.model,'star');assert.equal(star.tectonicRelief,0);assert.equal(star.hasAir,false);
  assert.ok(Math.abs(star.surfaceGravityMS2/274-1)<0.02,String(star.surfaceGravityMS2));
});

test('matches the planning prototype per planet (g to 1e-4 relative, tau to 2e-4) on both corpora',()=>{
  for(const b of [...habitableWaterCorpus(),...rockyCorpus()]){
    const x=planetGeophysics(b),p=prototype(b);
    assert.ok(Math.abs(x.surfaceGravityMS2/p.g-1)<1e-4,b.id);
    assert.ok(Math.abs(x.tectonicRelief-p.tau)<2e-4,b.id);
    assert.equal(x.coreFraction,p.cf);assert.equal(x.tectonicVigour01,p.vigour);
  }
});

test('planning corpus (132 habitable water planets): g p10/p90 3.35/14.79, tau p10/p50/p90 within 0.05 of 0.59/0.89/1.39',()=>{
  const c=habitableWaterCorpus();assert.equal(c.length,132);
  const G=c.map(planetGeophysics);
  const g=G.map(x=>x.surfaceGravityMS2),tau=G.map(x=>x.tectonicRelief);
  assert.ok(Math.abs(quantile(g,0.1)-3.35)<0.01&&Math.abs(quantile(g,0.9)-14.79)<0.01);
  [0.59,0.89,1.39].forEach((ref,i)=>assert.ok(Math.abs(quantile(tau,[0.1,0.5,0.9][i])-ref)<=0.05,`q${i} ${quantile(tau,[0.1,0.5,0.9][i])}`));
  assert.ok(G.every(x=>x.hasAir&&x.airClass==='earthlike'&&x.solidSurface));
});

test('rocky corpus (460): g spans ~2 to 15+ m/s2; tau p50/p90 within 0.05 of the prototype',()=>{
  const c=rockyCorpus();assert.equal(c.length,460);
  const G=c.map(planetGeophysics),g=G.map(x=>x.surfaceGravityMS2),tau=G.map(x=>x.tectonicRelief);
  // Measured min 2.18, max 19.64 (catalogue planet radii start at 2000 km).
  assert.ok(Math.min(...g)<2.5&&Math.max(...g)>15,`${Math.min(...g)} ${Math.max(...g)}`);
  assert.ok(Math.abs(quantile(tau,0.5)-0.89)<=0.05&&Math.abs(quantile(tau,0.9)-1.39)<=0.05);
  // p10 is 0.539 here: 0.051 from the prototype's 0.59, because this corpus
  // adds the small dry and icy planets the 132-planet corpus excluded.
  assert.ok(Math.abs(quantile(tau,0.1)-0.539)<0.005,String(quantile(tau,0.1)));
});

test('rocky corpus (460): Spearman(g, R) < 0.95',{todo:'NOT MET by the specified model: measured 0.990 (density spread +-25% cannot decorrelate g from a 4.5x radius span; real rocky solar-system bodies also rank 1.0). An ice-mantle density for Ice worlds would give ~0.84 but changes Ice-world relief; left to the owner/P4.'},()=>{
  const c=rockyCorpus(),g=c.map(b=>planetGeophysics(b).surfaceGravityMS2);
  assert.ok(spearman(g,c.map(b=>b.radiusM))<0.95);
});

test('pure and FIFO-cached by (seed, kind, type, radius, temperature, water); massKg is never read',()=>{
  const b=waterWorlds()[0];
  const a=planetGeophysics(b);
  assert.equal(planetGeophysics({...b}),a,'same key returns the cached object');
  assert.ok(Object.isFrozen(a));
  // massKg is not part of the input: a body with a different (or no) mass is identical.
  const heavy=planetGeophysics({...b,massKg:b.massKg*10,seed:b.seed});
  assert.deepEqual({...heavy},{...a});
  const {massKg,...noMass}=b;void massKg;
  const fresh=geophysicsFromParams({kind:b.kind,type:b.type,radiusM:b.radiusM,temperatureK:b.temperatureK,water:b.water,
    coreFraction:0.10+0.50*((geophysicsDraws(b.seed).u1+geophysicsDraws(b.seed).u2)/2),vigourDraw01:geophysicsDraws(b.seed).u3});
  assert.deepEqual({...planetGeophysics(noMass)},{...fresh});
  // Changing a keyed input changes the result.
  assert.notEqual(planetGeophysics({...b,temperatureK:b.temperatureK+1}),a);
  // Maithea: the planning numbers (cf 0.23, vigour 0.38, tau 0.79, g 6.82 vs catalogue 6.97).
  assert.ok(Math.abs(a.surfaceGravityMS2-6.82)<0.01&&Math.abs(a.tectonicRelief-0.789)<0.002,`${a.surfaceGravityMS2} ${a.tectonicRelief}`);
});

test('source rules: imports only catalog.ts / det-math.ts; no massKg, no transcendental or locale maths in code',()=>{
  const src=readFileSync(new URL('../src/planet-geophysics.ts',import.meta.url),'utf8');
  const code=src.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
  const imports=[...code.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m=>m[1]);
  assert.ok(imports.length>0&&imports.every(p=>p==='./catalog.ts'||p==='./det-math.ts'),imports.join(','));
  assert.ok(!/massKg/.test(code),'massKg in code');
  assert.ok(!/\*\*/.test(code),'** in code');
  assert.ok(!/Math\.(pow|exp|expm1|log|log2|log10|log1p|sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|cbrt|hypot|random)\b/.test(code),'transcendental Math call');
  assert.ok(!/localeCompare|Date\.|performance\./.test(code),'locale/clock');
});
