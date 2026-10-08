// R5-ATLAS-CLIMATE-M1 resume step 7 (climate-m1-decision 2026-10-08 decision 2): measure every row that
// tests/lod-consistency.test.mjs asserts, on this checkout (main with riser-lod merged + surface-climate-2), with the
// same frozen tiles, sampler, classifier and summaries as the test, and judge each row against the test's own limits
// (plan tolerance, or SHIPPED_CEILINGS where present). Read-only; prints one JSON object.
// Usage: node test-results/climate-m1/resume/lod-measure.mjs
import * as tiles from '../../../src/planet-tiles.ts';
import {terrainSampler} from '../../../src/terrain.ts';
import {biomeClassifier} from '../../../src/surface-biomes.ts';
import {CLIMATE_VERSION} from '../../../src/surface-climate.ts';
import {waterWorlds} from '../../../tests/terrain-climate-fixtures.mjs';
import {LOD_TOLERANCES,tileEdgeM} from '../../../src/lod-ladder.ts';
import {crossPair,newCrossAcc,summariseCross,retentionTile,newRetentionAcc,summariseRetention} from '../../../scripts/lod-consistency-report.mjs';
import {FROZEN_STRATIFIED,FROZEN_MAITHEA_RETENTION_EDGES} from '../../../tests/helpers/lod-frozen-selection.mjs';

const m={...tiles,terrainSampler,biomeClassifier,waterWorlds};
const PAIRS=[6,8,10,12,14];
// The ceilings as committed in tests/lod-consistency.test.mjs before this step (main 290472d).
const SHIPPED_CEILINGS={Maithea:{6:{rgbP99:26.3,snow:1.3,name:3.2,carriedName:3.5},8:{name:.8,carriedName:1.2}},
  Lethuris:{6:{rgbP99:39.2,snow:2.2,forest:1.8,name:7.0,carriedName:8.2},8:{rgbP99:11.1,snow:1.0,forest:2.2,name:1.9,carriedName:1.7},10:{forest:.7}}};
const bodies=Object.fromEntries(waterWorlds().map(b=>[b.name,b])),tol=LOD_TOLERANCES,r2=x=>+x.toFixed(3);
const out={climateVersion:CLIMATE_VERSION,cross:{},retention:null};
for(const name of ['Maithea','Lethuris']){
  const body=bodies[name],ts=terrainSampler(body),cls=biomeClassifier(body),dirs=Object.values(FROZEN_STRATIFIED[name]).flat();
  out.cross[name]={};
  for(const L of PAIRS){
    const acc=newCrossAcc(true);for(const d of dirs)crossPair(m,body,ts,cls,d,L,acc);
    const s=summariseCross(acc),edge=tileEdgeM(body.radiusM,L),cap=SHIPPED_CEILINGS[name][L]||{};
    const limit=(key,plan)=>Math.max(plan,cap[key]??plan),rows={};
    const row=(key,value,lim,le=true)=>{rows[key]={value:r2(value),limit:r2(lim),pass:le?value<=lim:value===lim};};
    row('heightP99M',s.p99,tol.heightP99M(edge));row('heightMaxM',s.max,tol.heightMaxM(edge));
    row('sharedOceanMismatch',s.sharedOceanMismatch,0,false);row('ocean',s.ocean,100*tol.classDisagreement);
    row('rgbP99',s.rgbP99,limit('rgbP99',tol.colourP99(L)));
    for(const key of ['snow','forest','name','carriedName'])row(key,s[key],limit(key,100*tol.classDisagreement));
    out.cross[name][L]=rows;
  }
}
{
  const body=bodies.Maithea,ts=terrainSampler(body),cls=biomeClassifier(body),keeps=LOD_TOLERANCES.coarseKeeps;
  const at=L=>{const a=newRetentionAcc();for(const d of FROZEN_MAITHEA_RETENTION_EDGES)retentionTile(m,body,ts,cls,d,L,a);return summariseRetention(a);};
  const l6=at(6),l8=at(8);
  out.retention={l6:Object.fromEntries(Object.entries(l6).map(([k,v])=>[k,typeof v==='number'?r2(v):v])),l8:Object.fromEntries(Object.entries(l8).map(([k,v])=>[k,typeof v==='number'?r2(v):v])),
    keeps,checks:{peakL6:l6.peakKept>=100*keeps.peakAreaL6,peakL8:l8.peakKept>=100*keeps.peakAreaL8,summit:l6.summitP50<=120&&l6.summitMax<=400,
      meta:l6.metaSummitP50<=l6.summitP50&&l6.metaSummitMax<=l6.summitMax,snowL6:l6.snowKept>=100*keeps.snowL6,forestL6:l6.forestKept>=100*keeps.forestL6}};
}
out.failingRows=[];
for(const [name,levels] of Object.entries(out.cross))for(const [L,rows] of Object.entries(levels))for(const [k,r] of Object.entries(rows))if(!r.pass)out.failingRows.push(`${name} L${L} ${k} ${r.value} > ${r.limit}`);
for(const [k,v] of Object.entries(out.retention.checks))if(!v)out.failingRows.push(`retention ${k}`);
console.log(JSON.stringify(out,null,1));
