import {galaxies,refByAddress,system} from '../../src/catalog.ts';
import {terrainSampler,baseTerrainSampler} from '../../src/terrain.ts';
import {biomeClassifier} from '../../src/surface-biomes.ts';
import {forestHabitat} from '../../src/forest-habitat.ts';
import {forestPatch} from '../../src/forest-patch.ts';
import {FOREST_CELL_M} from '../../src/planet-population.ts';
import {planetLandforms} from '../../src/planet-landforms.ts';
import {Vector3} from 'three';
import {writeFile} from 'node:fs/promises';

const body=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];
const n=Math.ceil(2*body.radiusM/FOREST_CELL_M), current=Number(process.argv[2]??300), fixtureWater=300;
const baseSample=terrainSampler(body,undefined,undefined,false,fixtureWater),baseClassify=biomeClassifier(body,fixtureWater);
const baseTerrain=baseTerrainSampler(body,current),landforms=planetLandforms(body);
let address;
for(let i=0;i<4096&&!address;i++){
  const y=1-2*(i+.5)/4096,phi=i*2.399963229728653,r=Math.sqrt(1-y*y),x=Math.cos(phi)*r,z=Math.sin(phi)*r,d=[x,y,z];
  const s=baseSample(d);if(!baseClassify(d,s.groundHeightM).forestPotential)continue;
  const comps=[x,-x,y,-y,z,-z],axis=Math.max(...comps),face=comps.indexOf(axis);
  const [u,v]=[[-z/axis,y/axis],[z/axis,y/axis],[x/axis,-z/axis],[x/axis,z/axis],[x/axis,y/axis],[-x/axis,y/axis]][face];
  address={face,n,x:Math.floor(Math.min(n-1,Math.floor((u+1)*n/2))/8),y:Math.floor(Math.min(n-1,Math.floor((v+1)*n/2))/8)};
}
if(!address)throw Error('No forest fixture found');
// Prefer a nearby real patch with a candidate that fails the legacy slope
// rule so the report exercises rejected-candidate probe thresholds too.
const fixtureQuery=forestHabitat(baseSample,baseClassify,body.radiusM,true);
let selected={address,patch:forestPatch(body.seed,address),pre:0,rejected:0};
for(let dy=-32;dy<=32;dy++)for(let dx=-32;dx<=32;dx++){
  const a={...address,x:address.x+dx,y:address.y+dy};
  if(a.x<0||a.y<0||a.x>=Math.ceil(n/8)||a.y>=Math.ceil(n/8))continue;
  const p=forestPatch(body.seed,a);let pre=0,rejected=0;
  for(const c of p.cells){const s=baseSample(c.direction),bio=baseClassify(c.direction,s.groundHeightM);
    if(!s.wet&&bio.forestPotential&&c.roll<.76){pre++;if(!fixtureQuery(c).present)rejected++;}}
  if(rejected>selected.rejected)selected={address:a,patch:p,pre,rejected};
  if(rejected>=2)break;
}
address=selected.address;
const patch=selected.patch, radius=body.radiusM;
const d=new Vector3(),right=new Vector3(),a=new Vector3(),b=new Vector3(),up=new Vector3(0,1,0),pole=new Vector3(1,0,0);
const thresholds=[];let preSlope=0, slopeRejected=0, present=0;
for(const cell of patch.cells){
  const s=baseSample(cell.direction),bio=baseClassify(cell.direction,s.groundHeightM);
  // Primary terrain's ocean early-return (H) and biome's ocean predicate (G).
  const H=(dir)=>{const q=baseTerrain(dir).elevationM;return q+landforms(dir,q);};
  thresholds.push({kind:'terrain-ocean-H',value:H(cell.direction),cell:cell.id});
  thresholds.push({kind:'biome-ocean-G',value:s.groundHeightM,cell:cell.id});
  const eligible=!s.wet&&bio.forestPotential&&cell.roll<.76;
  if(!eligible)continue;
  preSlope++;
  d.set(...cell.direction);right.crossVectors(Math.abs(d.y)>.9?pole:up,d).normalize();
  a.copy(d).addScaledVector(right,5/radius).normalize();b.copy(d).addScaledVector(right,-5/radius).normalize();
  const ad=a.toArray(),bd=b.toArray(),as=baseSample(ad),bs=baseSample(bd),ah=as.groundHeightM,bh=bs.groundHeightM;
  // Include all probes forestHabitat actually evaluates, even when the
  // resulting slope rejects the candidate.
  thresholds.push({kind:'slope-probe-H',value:H(ad),cell:cell.id});
  thresholds.push({kind:'slope-probe-H',value:H(bd),cell:cell.id});
  thresholds.push({kind:'slope-probe-G',value:ah,cell:cell.id});
  thresholds.push({kind:'slope-probe-G',value:bh,cell:cell.id});
  const isPresent=Math.abs(ah-bh)/10<.55;
  if(isPresent)present++;else slopeRejected++;
}
const lower=Math.max(...thresholds.filter(t=>t.value<current).map(t=>t.value),-Infinity);
const upper=Math.min(...thresholds.filter(t=>t.value>=current).map(t=>t.value),Infinity);
function signature(water){
  const sample=terrainSampler(body,undefined,undefined,false,water),classify=biomeClassifier(body,water),habitat=forestHabitat(sample,classify,radius,true);
  return patch.cells.map(c=>{const r=habitat(c);return `${r.present?1:0}:${r.groundHeightM}:${r.present?c.id:''}`;});
}
const currentSig=signature(current), checks=[];
for(const water of [current,lower===-Infinity?current:(lower+current)/2,lower===-Infinity?current:lower+Math.max(1e-7,Math.abs(lower)*1e-12),
  upper===Infinity?current:(current+upper)/2,upper===Infinity?current:upper]){
  if(water<=lower||water>upper)continue;
  const sig=signature(water);checks.push({water,identical:JSON.stringify(sig)===JSON.stringify(currentSig)});
}
const predicatesStable=(water)=>thresholds.every(t=>(t.value<current)===(t.value<water));
const lowerEdge=lower===-Infinity?null:predicatesStable(lower);
const upperOutside=upper===Infinity?null:predicatesStable(upper+Math.max(1e-7,Math.abs(upper)*1e-12));
const report={bodyId:body.id,seed:body.seed,radiusM:radius,waterLevelM:current,address,candidates:patch.cells.length,
  testedCells:patch.testedCells,preSlopeEligible:preSlope,slopeRejected,present,
  thresholdCount:thresholds.length,lowerExclusive:Number.isFinite(lower)?lower:'-Infinity',upperInclusive:Number.isFinite(upper)?upper:'Infinity',
  thresholdsByKind:Object.fromEntries([...new Set(thresholds.map(t=>t.kind))].map(k=>[k,thresholds.filter(t=>t.kind===k).length])),
  intervalChecks:checks,allIntervalChecksMatch:checks.every(c=>c.identical),lowerBoundaryPredicatesMatchCurrent:lowerEdge,upperOutsidePredicatesMatchCurrent:upperOutside,
  proof:'Every water-dependent predicate in this patch compares finite H or G with water using strict H/G < water. Fixing each comparison result is sufficient; the intersection is (max(thresholds below current), min(thresholds at/above current)]. H values include all primary samples and every ±5m probe evaluated for each pre-slope-eligible candidate, including candidates rejected by slope.'};
const output=process.argv[3]??'forest-patch-interval.json';
await writeFile(new URL(`./${output}`,import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
