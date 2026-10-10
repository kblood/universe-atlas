/** Independent acceptance checks for dated canonical runtime receipts. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export function compareFaunaRuntimeIdentity(control,candidate){
 assert.equal(candidate.body.id,control.body.id);assert.equal(candidate.date.offsetNs,control.date.offsetNs);
 assert.deepEqual(candidate.bodyRelativeM,control.bodyRelativeM,'matched body-relative camera');assert.deepEqual(candidate.heading,control.heading,'matched camera orientation');
 const a=new Map(control.faunaTrace.individuals.map(x=>[x.id,x])),b=new Map(candidate.faunaTrace.individuals.map(x=>[x.id,x]));
 assert.deepEqual([...b.keys()].sort(),[...a.keys()].sort(),'canonical population draw census');
 let cameraVisible=0,shadowVisible=0;
 for(const [id,x] of a){const y=b.get(id);assert.deepEqual(y.position,x.position,`${id} canonical position`);assert.deepEqual(y.pose,x.pose,`${id} canonical dated pose`);
  assert.deepEqual(y.census.member,x.census.member,`${id} canonical individual`);if(x.cameraVisible)cameraVisible++;if(x.shadowVisible)shadowVisible++;}
 const genomes=control.tiles.faunaDrawn.filter(x=>a.get(x.id)?.cameraVisible).map(x=>createHash('sha256').update(JSON.stringify(x.genome)).digest('hex'));
 return {canonicalIds:a.size,positionsExact:true,datedPosesExact:true,censusExact:true,controlCameraVisible:cameraVisible,controlShadowVisible:shadowVisible,visibleDistinctGenomes:new Set(genomes).size,
  scope:'canonical identity only; representation ownership and actual pixel drawing require separate checks'};
}
export function auditFaunaCoverage(rows,expectedIds){
 const byId=new Map();for(const row of rows){assert(expectedIds.includes(row.id),'representation belongs to a canonical submitted individual');assert(Number.isFinite(row.low)&&Number.isFinite(row.high)&&row.low>=0&&row.high<=1&&row.high>=row.low);
  if(row.high===row.low)continue;const list=byId.get(row.id)??[];list.push(row);byId.set(row.id,list);}
 const tiers={};let overlappingTransitions=0;
 for(const id of expectedIds){const list=byId.get(id);assert(list?.length,`${id} has an active representation`);list.sort((a,b)=>a.low-b.low);let end=0;
  for(const row of list){assert.equal(row.low,end,`${id} half-open coverage has no overlap or hole`);end=row.high;tiers[row.tier]=(tiers[row.tier]??0)+1;}assert.equal(end,1,`${id} total coverage is complete`);if(list.length>1)overlappingTransitions++;}
 return {represented:byId.size,tiers,overlappingTransitions,coverageComplete:true,scope:'half-open screen-hash intervals; actual same-geometry GPU mask proof required separately'};
}
