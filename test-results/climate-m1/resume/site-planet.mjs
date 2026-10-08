// R5-ATLAS-CLIMATE-M1 resume step 4 (climate-m1-decision 2026-10-08 decision 1; Opus-decided on Kasper's
// instruction, overrulable): run the whole-planet nearest-first SITE_A search (tests/helpers/harness-site-search.mjs
// searchSitePlanet) on the live climate, and record old -> new (distance, latitude, height, effM, class, margins).
// If no direction passes, report the 10 nearest near-misses (rejected land points whose centre passed the SITE_RULE
// centre clauses) with every clause each one fails. Read-only; prints one JSON object.
// Usage: node test-results/climate-m1/resume/site-planet.mjs
import * as SC from '../../../src/surface-climate.ts';
import {harnessWorld,evaluateSite,evaluateClassClauses,searchSitePlanet} from '../../../tests/helpers/harness-site-search.mjs';
import {SITE_A,SITE_A_M,SITE_A_LEGACY,SITE_RULE,SITE_CLASS_RULE,SITE_PLANET_SEARCH} from '../../../tests/harness-sites.mjs';

const world=harnessWorld(),D=180/Math.PI;
const latOf=d=>+(Math.asin(d[1])*D).toFixed(3),lonOf=d=>+(Math.atan2(d[2],d[0])*D).toFixed(3);
const distM=(a,b)=>world.body.radiusM*Math.acos(Math.min(1,a[0]*b[0]+a[1]*b[1]+a[2]*b[2]));
function describe(d){
  const site=evaluateSite(world,d),cls=evaluateClassClauses(world,d,SITE_RULE,SITE_CLASS_RULE,false);
  return {latDeg:latOf(d),lonDeg:lonOf(d),distanceFromLegacyKm:+(distM(d,SITE_A_LEGACY)/1000).toFixed(3),
    heightM:+site.heightM.toFixed(1),aboveSeaM:+site.aboveSeaM.toFixed(1),biome:site.biome,forestPotential:site.forestPotential,
    effM:+site.effectiveMoisture.toFixed(4),forestSuitability01:+site.forestSuitability01.toFixed(4),ringForestShare:site.ringForestShare,
    minRingAboveSeaM:+site.minRingAboveSeaM.toFixed(1),minRingMoisture:+site.minRingMoisture.toFixed(4),siteRulePass:site.pass,
    centreClasses:cls.centreClasses,tcMarginK:cls.tcMarginK==null?null:+cls.tcMarginK.toFixed(3),groundLook:cls.groundLook,
    failed:[...(site.pass?[]:['1:SITE_RULE']),...cls.failed]};
}
const t0=Date.now(),near=[];let rejected=0;
const found=searchSitePlanet(world,SITE_A_LEGACY,SITE_PLANET_SEARCH,SITE_RULE,SITE_CLASS_RULE,e=>{rejected++;if(near.length<10&&e.site)near.push(e);});
const out={climateVersion:SC.CLIMATE_VERSION,search:SITE_PLANET_SEARCH,rule:SITE_RULE,classRule:SITE_CLASS_RULE,ms:Date.now()-t0,rejectedLand:rejected,
  old:{literalM:SITE_A_M,...describe(SITE_A)}};
if(found){
  const L=Math.hypot(...SITE_A_M),R=world.body.radiusM+found.heightM;
  out.new={rank:found.rank,index:found.index,distanceKm:+(found.distanceM/1000).toFixed(3),bodyRadiusM:world.body.radiusM,
    literalM:found.direction.map(v=>Math.round(v*R*10)/10),...describe(found.direction)};
  out.oldToNewKm=+(distM(SITE_A,found.direction)/1000).toFixed(3);
}else out.nearMisses=near.map(e=>({rank:e.rank,index:e.index,distanceKm:+(e.distanceM/1000).toFixed(3),...describe(e.direction)}));
console.log(JSON.stringify(out,null,1));
