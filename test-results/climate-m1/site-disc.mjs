// R5-ATLAS-CLIMATE-M1 step 8 probe (read-only): what the SITE_SEARCH disc (tests/harness-sites.mjs, 4096
// sunflower points, 100 km around SITE_A_LEGACY) looks like under the LIVE climate of this checkout.
// Per disc point: ground height above the dated sea, classifier forestPotential and effectiveMoisture,
// eco class (src/eco-class.ts ecoClassOf, Tc = coldestMonthK, datumWarmestK = warmest month at the
// climate datum) and the Tc margin min(TROPICAL_COLDEST_K - Tc, Tc - BOREAL_COLDEST_K).
// Reports how many centres pass each SITE_RULE centre clause and the extended clause (class in
// LEGACY_BEHAVIOUR_CLASSES with >= 1 K Tc margin), the effM distribution, and the first index whose
// centre passes every centre clause (the ring clauses are evaluated by the real search, not here).
// Usage: node test-results/climate-m1/site-disc.mjs
import * as SC from '../../src/surface-climate.ts';
import {ecoClassOf,LEGACY_BEHAVIOUR_CLASSES,ECO_CLASS_CALIBRATION as EK} from '../../src/eco-class.ts';
import {harnessWorld,offsetDirection} from '../../tests/helpers/harness-site-search.mjs';
import {SITE_RULE,SITE_SEARCH,SITE_A_LEGACY} from '../../tests/harness-sites.mjs';

const world=harnessWorld(),f=SC.climateForcingFor(world.body),c=SC.surfaceClimate(f),s=SC.createClimateSample(),s0=SC.createClimateSample();
const G=Math.PI*(3-Math.sqrt(5)),D=180/Math.PI;
const q=(a,p)=>{const t=Float64Array.from(a).sort();return t[Math.min(t.length-1,Math.floor(p*(t.length-1)+.5))];};
const k={points:0,land:0,aboveSea:0,forest:0,moist:0,centreRule:0,legacyClass:0,margin1K:0,all:0};
const eff=[],classes={};let first=null,maxEff=-1,maxEffAt=null;
for(let i=0;i<SITE_SEARCH.points;i++){
  const r=SITE_SEARCH.radiusM*Math.sqrt((i+.5)/SITE_SEARCH.points),a=i*G;
  const d=offsetDirection(world,SITE_A_LEGACY,r*Math.cos(a),r*Math.sin(a));
  const h=world.sample(d).groundHeightM,b=world.classify(d,h,1);k.points++;
  if(b.ocean)continue;k.land++;
  c(d,h-world.sea,s);c(d,0,s0);
  const e=ecoClassOf(s.annualMeanTempK,s.warmestMonthK,s.coldestMonthK,s.effectiveMoisture,b.snowFraction,h-world.sea,b.weights[0],s0.warmestMonthK,true);
  const margin=Math.min(EK.TROPICAL_COLDEST_K-s.coldestMonthK,s.coldestMonthK-EK.BOREAL_COLDEST_K);
  classes[e]=(classes[e]||0)+1;eff.push(b.effectiveMoisture);
  if(b.effectiveMoisture>maxEff){maxEff=b.effectiveMoisture;maxEffAt={i,distanceKm:+(r/1000).toFixed(2),latDeg:+(Math.asin(Math.abs(d[1]))*D).toFixed(2),eco:e,forest:b.forestPotential};}
  const above=h-world.sea>=SITE_RULE.minAboveSeaM,moist=b.effectiveMoisture>=SITE_RULE.minMoisture,leg=LEGACY_BEHAVIOUR_CLASSES.has(e),m1=margin>=1;
  k.aboveSea+=above;k.forest+=b.forestPotential;k.moist+=moist;k.centreRule+=above&&moist&&b.forestPotential;k.legacyClass+=leg;k.margin1K+=leg&&m1;
  if(above&&moist&&b.forestPotential&&leg&&m1){k.all++;if(!first)first={i,distanceKm:+(r/1000).toFixed(2),eco:e,effM:+b.effectiveMoisture.toFixed(3),tcMarginK:+margin.toFixed(3)};}
}
console.log(JSON.stringify({climateVersion:SC.CLIMATE_VERSION,search:SITE_SEARCH,rule:SITE_RULE,counts:k,
  effM:{p10:+q(eff,.1).toFixed(3),p50:+q(eff,.5).toFixed(3),p90:+q(eff,.9).toFixed(3),max:+maxEff.toFixed(3),maxAt:maxEffAt},
  ecoClasses:classes,firstCentrePassingAllCentreClauses:first}));
