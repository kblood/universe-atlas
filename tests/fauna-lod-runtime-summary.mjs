import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {buildQuadrupedBody} from '../src/fauna-body-plan.ts';
import {compareFaunaRuntimeIdentity,auditFaunaCoverage} from './helpers/fauna-runtime-identity.mjs';
const root='C:/LLM/IWSDK/Assets/_assetctl/animal-system-20261010',controlPath=process.env.LOD_RUNTIME_CONTROL||root+'/lod-runtime-default-fixed/report.json',out=process.env.ATLAS_RESULTS;
if(!out)throw new Error('ATLAS_RESULTS candidate receipt directory required');
const control=JSON.parse(await readFile(controlPath,'utf8')),candidate=JSON.parse(await readFile(out+'/report.json','utf8'));assert(control.ok&&candidate.ok);assert.deepEqual(candidate.errors,[]);
const browserSources=JSON.parse(await readFile(out+'/source-identity-browser.json','utf8'));assert(browserSources.ok);const sourceMap=new Map(browserSources.rows.map(row=>[row.genomeDigest,row]));
const summary={controlBuild:control.build,candidateBuild:candidate.build,scope:'matched paused dated runtime scenes; actual route/no-land acceptance separate; sources compared to original generator',scenes:[],sources:[]},checked=new Set();let poolCameraActors=0;
for(const world of candidate.worlds){const old=control.worlds.find(w=>w.index===world.index);assert(old);
 for(const [label,state,baseline] of [['arrival80',world.arrival,old.arrival],...world.views.map(v=>['hover'+v.clearance,v.state,old.views.find(x=>x.clearance===v.clearance).state])]){
  const identity=compareFaunaRuntimeIdentity(baseline,state),rows=state.faunaLod?.ownership;assert(rows?.length,'actual prototype ownership trace required');
  const ids=state.tiles.faunaDrawn.map(x=>x.id),coverage=auditFaunaCoverage(rows,ids),visible=new Set(state.faunaTrace.individuals.filter(x=>x.cameraVisible).map(x=>x.id)),counts={};
  for(const row of rows){if(!(row.high>row.low))continue;counts[row.tier]??={total:0,cameraVisible:0};counts[row.tier].total++;if(visible.has(row.id)){counts[row.tier].cameraVisible++;if(row.tier.startsWith('lod'))poolCameraActors++;}
   if(!row.tier.startsWith('lod'))continue;assert(row.genomeKey.includes(row.id),'pool key includes individual identity');assert(row.sourceDigest,'actual worker source digest required');
   const animal=state.tiles.faunaDrawn.find(x=>x.id===row.id),key=JSON.stringify(animal.genome);if(checked.has(key))continue;checked.add(key);const source=sourceMap.get(createHash('sha256').update(key).digest('hex'));assert(source?.oldSourceExact);assert.equal(source.digest,row.sourceDigest,`${state.body.name} ${label} ${row.id} same-browser original source SHA`);summary.sources.push({id:row.id,sourceDigest:source.digest,originalSourceExact:true,sourceEngine:'same Chromium as runtime worker'});}
  const lod=state.faunaLod.lod;assert(lod.adapterOwnedBytes+lod.adapterTransientBytes<=lod.maxResidentBytes);assert(lod.workerReservedBytes<=lod.maxWorkerBytes);
  summary.scenes.push({world:state.body.id,label,identity,coverage,counts,resources:lod,life:state.tiles.faunaLodMemory});
 }
}
assert(poolCameraActors>0,'actual camera-visible animals use derived pool');summary.poolCameraActorsAcrossScenes=poolCameraActors;summary.ok=true;
await writeFile(out+'/summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify({ok:true,scenes:summary.scenes.length,sourceBodiesCompared:summary.sources.length,poolCameraActors}));
