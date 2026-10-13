/** Offline CPU/accounting probe; not a render timing or worker heap benchmark.
 * PLANET_COMPOSER_KIT_URL may point at the accepted Kit source before vendoring. */
import * as THREE from 'three';
import {writeFile, mkdir} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {generateCreatureGenome, realisticIndividualCreatureGenome} from '../src/creature-model.ts';
import {MORPHOLOGY_FAMILIES} from '../src/fauna-appearance.ts';
import {poseComposer} from '../src/fauna-composer-rig.ts';
import {FaunaComposerRenderer} from '../src/fauna-composer-renderer.ts';
import {buildFaunaComposerRequestedLevels, composerTypedBytes, faunaComposerSourceKey} from '../src/fauna-composer-render-source.ts';
const kit=await import(process.env.PLANET_COMPOSER_KIT_URL??'#creature-kit/planet');
const count=Number(process.env.COMPOSER_PROFILE_COUNT??24),farTarget=Number(process.env.COMPOSER_PROFILE_FAR??1500),mixed=process.env.COMPOSER_PROFILE_MIXED==='1',rows=[],errors=[];
const capacitySettings={capacity:512,maxSources:512,maxBytes:Number(process.env.COMPOSER_PROFILE_BYTES??32*1024*1024),
 coldJobsBeforeNearUpgrade:process.env.COMPOSER_PROFILE_COLD_INTERVAL?Number(process.env.COMPOSER_PROFILE_COLD_INTERVAL):undefined,
 mergedTiers:{far:{maxVertices:Number(process.env.COMPOSER_PROFILE_VERTICES??32000),maxIndices:Number(process.env.COMPOSER_PROFILE_INDICES??120000),maxBytes:Number(process.env.COMPOSER_PROFILE_ARENA_BYTES??9*1024*1024),storage:process.env.COMPOSER_PROFILE_STORAGE??'float-1'},...(mixed?{middle:{maxVertices:16000,maxIndices:96000,maxBytes:4*1024*1024,storage:process.env.COMPOSER_PROFILE_STORAGE??'float-1'}}:{})}};
const provenanceFiles=['src/fauna-composer-renderer.ts','src/fauna-composer-render-source.ts','src/fauna-composer-merged-batch.ts','src/fauna-composer-storage.ts','src/fauna-composer-lod.ts','src/fauna-composer-rig.ts','src/planet-composer-identity.ts','vendor/creature-kit/creature-kit-manifest.json','vendor/creature-kit/package/dist/fauna-composer-lod.js'];
const hashes=()=>Object.fromEntries(provenanceFiles.map(file=>[file,createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url),'utf8').replace(/\r\n/g,'\n')).digest('hex')]));
const sourceBefore=hashes(),commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const definitions=Array.from({length:count},(_,i)=>{const family=MORPHOLOGY_FAMILIES[i%MORPHOLOGY_FAMILIES.length],g=realisticIndividualCreatureGenome(generateCreatureGenome(`renderer-profile/${i}`,['browser','runner','low-slung','long-neck'][i%4]),`individual/${i}`,i%4,i%3?'adult':'juvenile',family);return kit.planetComposerDefinition(g,{individualId:`id/${i}`,speciesId:`species/${family}`});});
const provider={async build(job){const start=performance.now(),source=job.loadedSource??kit.buildPlanetComposerSource(job.definition),sourceMs=performance.now()-start,lodStart=performance.now(),levels=buildFaunaComposerRequestedLevels(source, job.tiers, [4500,farTarget]);
 rows.push({id:job.definition.phenotype.identity.individualId,requestedTiers:job.tiers,bones:source.graph.bones.length,sourceVertices:source.skin.vertexCount,sourceTriangles:source.skin.triangleCount,sourceTypedBytes:composerTypedBytes(source),farVertices:levels.far?.positions.length/3,farTriangles:levels.far?.index.length/3,farTypedBytes:composerTypedBytes(levels.far),levels:Object.fromEntries(Object.entries(levels).map(([tier,skin])=>[tier,{vertices:skin.positions.length/3,triangles:skin.index.length/3,target:tier==='near'?null:tier==='middle'?4500:farTarget,typedBytes:composerTypedBytes(skin)}])),sourceMs,lodMs:performance.now()-lodStart});
 return {key:job.key,source,levels,buildMs:performance.now()-start};}};
const renderer=new FaunaComposerRenderer({provider,pose:(graph,c)=>poseComposer(graph,'idle',c.rigSeconds),...capacitySettings});
const candidates=definitions.map((definition,i)=>({id:`id/${i}`,sourceKey:process.env.COMPOSER_PROFILE_KIT_IDENTITY==='1'?kit.planetComposerSourceIdentity(definition).key:faunaComposerSourceKey(definition,kit.PLANET_COMPOSER_SOURCE_VERSION??'planet-composer-source-1'),definition,matrix:new THREE.Matrix4().makeTranslation(i,0,0),distanceM:mixed&&i<6?10+i:mixed&&i<12?75+i:300+i,cameraVisible:true,rigSeconds:0,poseKey:'idle0'}));
try{for(let i=0;i<count*12+100;i++){renderer.update(candidates);await new Promise(resolve=>setTimeout(resolve,2));const d=renderer.diagnostics();if(d.active===count&&!d.running&&!d.stagedSources&&!d.upgradesPending)break;}
 const report={note:'Offline single-source CPU build/reduction and renderer accounting; no GPU timing or measured worker peak',commit,sourceBefore,sourceAfter:hashes(),capacitySettings,definitionDigest:createHash('sha256').update(definitions.map(d=>kit.serializePlanetComposerDefinition(d)).join('\n')).digest('hex'),count,farTarget,mixed,storage:process.env.COMPOSER_PROFILE_STORAGE??'float-1',kitIdentity:process.env.COMPOSER_PROFILE_KIT_IDENTITY==='1',sourceVersion:kit.PLANET_COMPOSER_SOURCE_VERSION,kit:process.env.PLANET_COMPOSER_KIT_URL??'#creature-kit/planet',rows,renderer:renderer.diagnostics(),errors};
 const output=process.env.COMPOSER_PROFILE_OUTPUT??'C:/LLM/IWSDK/Assets/_assetctl/planet-composer-merged-20261011';await mkdir(output,{recursive:true});await writeFile(output+'/actual-kit-accounting.json',JSON.stringify(report,null,2));
 const {actors,...summary}=report.renderer;
 console.log(JSON.stringify({count,sourceJobs:rows.length,bones:[Math.min(...rows.map(r=>r.bones)),Math.max(...rows.map(r=>r.bones))],sourceTypedBytes:[Math.min(...rows.map(r=>r.sourceTypedBytes)),Math.max(...rows.map(r=>r.sourceTypedBytes))],farVertices:[Math.min(...rows.filter(r=>Number.isFinite(r.farVertices)).map(r=>r.farVertices)),Math.max(...rows.filter(r=>Number.isFinite(r.farVertices)).map(r=>r.farVertices))],farTriangles:[Math.min(...rows.filter(r=>Number.isFinite(r.farTriangles)).map(r=>r.farTriangles)),Math.max(...rows.filter(r=>Number.isFinite(r.farTriangles)).map(r=>r.farTriangles))],renderer:summary},null,2));
}finally{renderer.dispose();}
