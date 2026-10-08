// surface-climate-2 Earth reference (backlog #9 BIOME2-CLIMATE M1, plan
// docs/biome-climate-increment-2-plan-v2-2026-10-04.json P1-CLIMATE acceptance 1;
// design and sources: docs/surface-climate-v2.md).
//
// The Earth reference body: 288 K, obliquity 23.44 deg, water 0.7, g 9.81 m/s^2
// (lapse 6.4996 K/km). ELA = the lowest height with snowFraction > 0.6, the
// classifier's 'Alpine / polar snow' label (PDD < 190 C*d under PDD_CRIT 250 /
// PDD_RAMP 100). Bands: equator >= 4450 m, 45 deg 2700-3100 m, 60 deg
// 1200-1700 m, 70 deg 550-1000 m, 78 deg 250-650 m.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {climateForcingFromParams,surfaceClimate,createClimateSample,degreeDaysAbove,warmColumnLapseFactor,itczSinLatOf,insolationTables,ZONAL_ROWS,CLIMATE_CALIBRATION as C} from '../src/surface-climate.ts';

const D=Math.PI/180;
export const EARTH={anchorTempK:288,obliquityRad:23.44*D,water:.7,surfaceGravityMS2:9.81,moistureSeed:1};
export const ELA_BANDS=Object.freeze({0:[4450,Infinity],45:[2700,3100],60:[1200,1700],70:[550,1000],78:[250,650]});

const at=lat=>[Math.cos(lat*D),Math.sin(lat*D),0];
/** Lowest height (m, 0..20 km, bisection to < 1 m) where snowAt(lat, h) holds; 0 if it already holds at the datum. */
export function elaM(snowAt,lat){
  if(snowAt(lat,0))return 0;
  let lo=0,hi=20000;
  if(!snowAt(lat,hi))return Infinity;
  while(hi-lo>.5){const m=(lo+hi)/2;if(snowAt(lat,m))hi=m;else lo=m;}
  return Math.round(hi);
}
const inBand=(lat,h)=>h>=ELA_BANDS[lat][0]&&h<=ELA_BANDS[lat][1];

const forcing=climateForcingFromParams(EARTH),climate=surfaceClimate(forcing),o=createClimateSample();
/** The live rule: the classifier label, snowFraction > 0.6. */
const liveLabel=(lat,h)=>climate(at(lat),h,o).snowFraction>.6;

test('Earth reference: the PDD snow line (label) lies in every Earth ELA band',t=>{
  const rows=Object.keys(ELA_BANDS).map(Number).map(lat=>({lat,elaM:elaM(liveLabel,lat)}));
  t.diagnostic(JSON.stringify(rows));
  // Plan v2 prototype M1 (label): 4608 / 3003 / 1505 / 719 / 426 m.
  for(const {lat,elaM:h} of rows)assert.ok(inBand(lat,h),`lat ${lat}: ELA ${h} m outside ${ELA_BANDS[lat]}`);
  // The label is monotone in height at every tested latitude (no snow below the ELA).
  for(const {lat,elaM:h} of rows)for(let z=0;z<h;z+=97)assert.equal(liveLabel(lat,z),false,`lat ${lat} h ${z}`);
});

test('negative: the shipped annual-mean rule (surface-climate-1, T_SNOW 268 K, ramp 6 K) fails the 60 deg band',()=>{
  // Independent re-statement of the surface-climate-1 snow rule on the same datum column:
  // annual(h) = annual(0) - lapse*h, snow = clamp01((268 - annual)/6).
  const shipped=thr=>(lat,h)=>{climate(at(lat),0,o);const annual=o.annualMeanTempK-forcing.lapseKPerM*h;return Math.max(0,Math.min(1,(268-annual)/6))>thr;};
  const label=elaM(shipped(.6),60),onset=elaM(shipped(0),60);
  // Plan v2 measuredBaseline: 810 m label / 256 m onset.
  assert.ok(Math.abs(label-810)<=2&&Math.abs(onset-256)<=2,`shipped rule ${label} / ${onset} m`);
  assert.ok(!inBand(60,label)&&!inBand(60,onset),'the annual-mean rule must fail the 60 deg band');
});

test('warm-column lapse: the factor, its clamps, and why it is mandatory (equator without it < 4450 m)',()=>{
  assert.equal(warmColumnLapseFactor(288),1);
  assert.ok(Math.abs(warmColumnLapseFactor(308)-.9)<1e-12&&Math.abs(warmColumnLapseFactor(268)-1.1)<1e-12);
  assert.equal(warmColumnLapseFactor(400),C.WARM_COL_MIN);assert.equal(warmColumnLapseFactor(150),C.WARM_COL_MAX);
  // The live column: annual(h) = annual(0) - lapse*f(annual(0))*h, half unchanged with height.
  climate(at(0),0,o);const T0=o.annualMeanTempK,half=o.seasonalHalfRangeK;
  climate(at(0),3000,o);assert.ok(Math.abs(o.annualMeanTempK-(T0-forcing.lapseKPerM*warmColumnLapseFactor(T0)*3000))<1e-9);
  // Negative: the same PDD rule with the plain lapse (factor 1) puts the equatorial label at 4302 m (plan v2 R8).
  const plain=(lat,h)=>{climate(at(lat),0,o);return degreeDaysAbove(o.annualMeanTempK-forcing.lapseKPerM*h,o.seasonalHalfRangeK,0)<C.PDD_CRIT-.6*C.PDD_RAMP;};
  const eq=elaM(plain,0);
  assert.ok(Math.abs(eq-4302)<=2,`no warm column: ${eq} m`);
  assert.ok(!inBand(0,eq),'without the warm-column factor the equator fails the >= 4450 m band');
  assert.ok(half>0);
});

// ---------------- step 6: the ITCZ zonal band ----------------
const fib=(i,n)=>{const y=1-2*(i+.5)/n,p=i*2.399963229728653,r=Math.sqrt(1-y*y);return [Math.cos(p)*r,y,Math.sin(p)*r];};
/** Zonal means relative to the ITCZ over N Fibonacci directions at the datum (the reference has no terrain). */
export function zonalBands(f,N=20000,effOf=null){
  const c=surfaceClimate(f),s=createClimateSample(),B={itcz:[0,10],sub:[15,35],dry:[18,32],mid:[45,60],pol:[75,90.1]},acc={};
  for(const k in B)acc[k]={n:0,P:0,eff:0};
  const bins=Array.from({length:18},()=>({n:0,P:0,eff:0}));
  for(let i=0;i<N;i++){
    const d=fib(i,N);c(d,0,s);
    const lat=Math.asin(Math.abs(d[1]))/D,dI=Math.abs(lat-f.itczLatDeg),eff=effOf?effOf(s,lat):s.effectiveMoisture;
    for(const k in B)if(dI>=B[k][0]&&dI<B[k][1]){acc[k].n++;acc[k].P+=s.precipMm;acc[k].eff+=eff;}
    const b=bins[Math.min(17,Math.floor(lat/5))];b.n++;b.P+=s.precipMm;b.eff+=eff;
  }
  const m=k=>({P:acc[k].P/acc[k].n,eff:acc[k].eff/acc[k].n});
  return {itcz:m('itcz'),sub:m('sub'),dry:m('dry'),mid:m('mid'),pol:m('pol'),bins:bins.map((b,k)=>({lat:k*5+2.5,P:b.P/b.n,eff:b.eff/b.n}))};
}

test('ITCZ: argmax row of the annual insolation table; equator below ~54 deg obliquity, pole above',()=>{
  assert.equal(ZONAL_ROWS,512);
  for(const [deg,itcz] of [[0,0],[23.44,0],[45,0],[53,0],[56,1],[61.4,1],[70,1],[89.8,1]])
    assert.equal(itczSinLatOf(insolationTables(deg*D).qMean),itcz,`obliquity ${deg}`);
  assert.equal(forcing.itczSinLat,0);assert.equal(forcing.itczLatDeg,0);assert.equal(forcing.hadleyEdgeDeg,30);
  const f70=climateForcingFromParams({...EARTH,obliquityRad:70*D});
  assert.equal(f70.itczSinLat,1);assert.equal(f70.itczLatDeg,90);
});

test('Earth reference zonal targets (calibrated band): P ratios and effective moisture per band',t=>{
  const z=zonalBands(forcing);
  const r={subOverItcz:z.sub.P/z.itcz.P,midOverSub:z.mid.P/z.sub.P,polOverItcz:z.pol.P/z.itcz.P,effItcz:z.itcz.eff,effDry:z.dry.eff,effMid:z.mid.eff};
  t.diagnostic(JSON.stringify(r));
  assert.ok(r.subOverItcz<=.55,`P(15-35) / P(0-10) = ${r.subOverItcz}`);
  assert.ok(r.midOverSub>=1.2,`P(45-60) / P(15-35) = ${r.midOverSub}`);
  assert.ok(r.polOverItcz<.35,`P(>75) / P(0-10) = ${r.polOverItcz}`);
  assert.ok(r.effItcz>=.6,`effM(0-10) = ${r.effItcz}`);
  assert.ok(r.effDry<=.4,`effM(18-32) = ${r.effDry}`);
  assert.ok(r.effMid>=.45&&r.effMid<=.65,`effM(45-60) = ${r.effMid}`);
});

test('negative: the uncalibrated starting band (P_REF 1000, a = .9/.6/.55/.4, w = 10/12/9/12) misses the Earth targets',()=>{
  // Re-statement of plan v1's starting band on the live temperature field: effM = AI/(AI+0.6),
  // AI = P/max(120, 58.93 biotemp), P = 1000 x pTemp x Z0 x (0.4 + 1.2 noise).
  const g=(x,w)=>Math.exp(-(x/w)*(x/w)),Z0=dI=>1+.9*g(dI,10)+.6*g(dI-50,12)-.55*g(dI-28,9)-.4*g(dI-88,12);
  const z=zonalBands(forcing,20000,(s,lat)=>{
    const pet=Math.max(120,58.93*(degreeDaysAbove(s.annualMeanTempK,s.seasonalHalfRangeK,0)-degreeDaysAbove(s.annualMeanTempK,s.seasonalHalfRangeK,30))/365.25);
    const P=1000*Math.max(.2,1+.025*(s.annualMeanTempK-288))*Z0(lat)*(.4+1.2*s.legacyMoisture),ai=P/pet;return ai/(ai+.6);});
  // Measured: effM(18-32) 0.472 (> 0.40), effM(45-60) 0.799 (> 0.65).
  assert.ok(z.dry.eff>.4&&z.mid.eff>.65,`uncalibrated: dry ${z.dry.eff}, mid ${z.mid.eff}`);
});

test('high-tilt synthetic world (70 deg): the wettest band is polar and the driest band moves with the ITCZ',t=>{
  const f70=climateForcingFromParams({...EARTH,obliquityRad:70*D});
  const z=zonalBands(f70);
  const wettest=z.bins.reduce((a,b)=>b.P>a.P?b:a),driest=z.bins.reduce((a,b)=>b.eff<a.eff?b:a);
  t.diagnostic(JSON.stringify({wettestLat:wettest.lat,driestLat:driest.lat,effItcz:z.itcz.eff,effSub:z.sub.eff}));
  assert.ok(wettest.lat>=75,`wettest 5 deg band at ${wettest.lat}`);
  const dI=90-driest.lat;assert.ok(dI>=18&&dI<=35,`driest band ${dI} deg from the ITCZ`);
  assert.ok(z.itcz.eff>z.sub.eff,'near the ITCZ wetter than 15-35 deg from it');
  // The shipped fixed belt's negative is the corpus polar-ITCZ test (tests/acceptance/climate-agreement.test.mjs):
  // on this synthetic world its belt deficit (0.0425) is below the legacy noise, so a band minimum does not locate it.
});
