/** Exact captured-world resource census. CPU only; the deliberately generous
 * probe ceiling measures requirements and is never a production budget claim. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import * as kit from '#creature-kit/planet';
import {FaunaComposerRenderer} from '../src/fauna-composer-renderer.ts';
import {buildFaunaComposerRequestedLevels,composerTypedBytes} from '../src/fauna-composer-render-source.ts';
import {canonicalComposerJson} from '../src/fauna-composer-build-receipt.ts';
import {faunaGroundHeight} from '../src/fauna-ground.ts';

const input=process.env.COMPOSER_COHORT;
if(!input)throw new Error('COMPOSER_COHORT must identify the preserved actual-world cohort');
const raw=await readFile(input,'utf8'),fixture=JSON.parse(raw),rows=[];
assert.equal(fixture.schema,'actual-planet-composer-cohort-1');
const output=process.env.COMPOSER_PROFILE_OUTPUT??'test-results/composer-cohort-profile';
await mkdir(output,{recursive:true});
const ground=new Map(fixture.groundProfiles.map(p=>{const grid=Float64Array.from(p.rawGrid);return [p.cellId,(x,z)=>faunaGroundHeight(grid,x,z)*p.relief];}));
const candidates=fixture.candidates.map(c=>({...c,matrix:new THREE.Matrix4().fromArray(c.matrix),ground:ground.get(c.groundProfileId),activity:{...c.activity,revolutionS:c.activity.revolutionS==='Infinity'?Infinity:c.activity.revolutionS}}));
assert.ok(candidates.length<=512&&candidates.every(c=>c.ground&&c.distanceM<=600));
const settings={capacity:512,maxSources:512,maxBones:160,maxBytes:Number(process.env.COMPOSER_PROFILE_BYTES??128*1024*1024),
 fullSourceCache:6,middleSourceCache:6,coldJobsBeforeNearUpgrade:8,nearM:35,middleM:140,maxDistanceM:600,
 mergedTiers:{middle:{maxVertices:16000,maxIndices:96000,maxBytes:5*1024*1024,storage:'packed-1'},
  far:{maxVertices:Number(process.env.COMPOSER_PROFILE_VERTICES??300000),maxIndices:Number(process.env.COMPOSER_PROFILE_INDICES??1536000),maxBytes:64*1024*1024,storage:'packed-1'}}};
const provider={async build(job){
 const start=performance.now(),source=job.loadedSource??kit.buildPlanetComposerSource(job.definition),levels=buildFaunaComposerRequestedLevels(source,job.tiers,[4500,1000]);
 rows.push({id:job.definition.phenotype.identity.individualId,tiers:job.tiers,bones:source.graph.bones.length,sourceBytes:composerTypedBytes(source),
  levels:Object.fromEntries(Object.entries(levels).map(([tier,s])=>[tier,{vertices:s.positions.length/3,indices:s.index.length,typedBytes:composerTypedBytes(s)}]))});
 if(rows.length%25===0)console.log(JSON.stringify({jobs:rows.length,latest:rows.at(-1).id}));
 return {key:job.key,source,levels,buildMs:performance.now()-start};
}};
const renderer=new FaunaComposerRenderer({...settings,provider,pose:(graph,c)=>kit.posePlanetComposer(graph,c.member,c.activity,c.ground,c.rigSeconds)});
function snapshot(label){
 const entries=[...renderer.entries.entries()],levels={};let graphBytes=0,strings=0,typed=0,writers=0,retainedIndices=0,retainedSourceMaps=0,extraSourceGraphEquivalent=0;
 for(const [key,e]of entries){
  graphBytes+=e.graphBytes;strings+=(e.definition.length+key.length+e.graphIdentity.length+e.skinIdentity.length)*2;
  typed+=composerTypedBytes({source:e.source,levels:e.levels},renderer.arenaBuffers);writers+=e.writer.ownedBytes;
  if(e.source&&e.source.graph!==e.graph)extraSourceGraphEquivalent+=canonicalComposerJson(e.source.graph).length*2;
  for(const [tier,s]of Object.entries(e.levels)){const state=levels[tier]??={raw:0,packed:0,vertices:0,indices:0};state[s.storage?'packed':'raw']++;state.vertices+=s.positions.length/3;state.indices+=s.index.length;
   retainedIndices+=s.index.byteLength;retainedSourceMaps+=s.sourceVertex?.byteLength??0;}
 }
 const arenas=Object.fromEntries([...renderer.merged].map(([tier,a])=>[tier,{...a.diagnostics(),usedVertices:[...a.records.values()].reduce((n,r)=>n+r.vertices,0),usedIndices:[...a.records.values()].reduce((n,r)=>n+r.indices,0)}]));
 return {label,renderer:renderer.diagnostics(),breakdown:{graphJsonEquivalentBytes:graphBytes,canonicalStringBytes:strings,typedOutsideArenas:typed,writerBytes:writers,
  fullSources:entries.filter(([,e])=>e.source).length,extraFullSourceGraphJsonEquivalentBytes:extraSourceGraphEquivalent,retainedIndices,retainedSourceMaps,levels,arenas}};
}
async function settle(list,label){
 let idle=0,previous='',peak=0;
 for(let frame=0;frame<list.length*12+1000;frame++){
  renderer.update(list);await new Promise(resolve=>setTimeout(resolve,1));const d=renderer.diagnostics();peak=Math.max(peak,d.ownedBytes);
  assert.equal(renderer.desired.size,list.length,'the profile cannot silently cull or drop captured candidates');
  if(d.active===list.length&&!d.running&&!d.stagedSources&&!d.upgradesPending)break;
  const state=[d.builds,d.active,d.pending,d.upgradesPending,d.stagedSources,d.running].join('/');idle=state===previous?idle+1:0;previous=state;
  if(idle>60&&!d.running)break;
 }
 const result=snapshot(label);result.peakOwnedBytes=peak;console.log(JSON.stringify({phase:label,active:result.renderer.active,pending:result.renderer.pending,upgrades:result.renderer.upgradesPending,ownedBytes:result.renderer.ownedBytes}));return result;
}
try{
 const phases=[await settle(candidates,'captured actual distances')];
 if(process.env.COMPOSER_PROFILE_MIXED==='1'){
  const mixed=candidates.map((c,i)=>({...c,distanceM:i<6?10+i:i<12?80+i:Math.max(160,c.distanceM)}));
  phases.push(await settle(mixed,'same complete captured cohort, six-near/six-middle resource stress; tier distances deliberately overridden'));
 }
 await writeFile(output+'/report.json',JSON.stringify({note:'CPU requirements probe; no GPU timing or measured heap. maxBytes may deliberately exceed the production80MiB to expose required capacity.',
  input,sha256:createHash('sha256').update(raw).digest('hex'),sourceBuild:fixture.sourceBuild,kitCommit:fixture.kitCommit,count:candidates.length,settings,rows,phases},null,2));
}finally{renderer.dispose();}
