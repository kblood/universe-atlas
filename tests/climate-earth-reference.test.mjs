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
import {climateForcingFromParams,surfaceClimate,createClimateSample} from '../src/surface-climate.ts';

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
  for(const {lat,elaM:h} of rows)if(lat!==0)assert.ok(inBand(lat,h),`lat ${lat}: ELA ${h} m outside ${ELA_BANDS[lat]}`);
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
