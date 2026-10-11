/** Offline CPU/accounting probe; not a render timing or worker heap benchmark.
 * PLANET_COMPOSER_KIT_URL may point at the accepted Kit source before vendoring. */
import * as THREE from 'three';
import {writeFile, mkdir} from 'node:fs/promises';
import {generateCreatureGenome, realisticIndividualCreatureGenome} from '../src/creature-model.ts';
import {MORPHOLOGY_FAMILIES} from '../src/fauna-appearance.ts';
import {poseComposer} from '../src/fauna-composer-rig.ts';
import {FaunaComposerRenderer} from '../src/fauna-composer-renderer.ts';
import {buildFaunaComposerLevels, composerTypedBytes, faunaComposerSourceKey} from '../src/fauna-composer-render-source.ts';
const kit=await import(process.env.PLANET_COMPOSER_KIT_URL??'#creature-kit/planet');
const count=Number(process.env.COMPOSER_PROFILE_COUNT??24),rows=[],errors=[];
const definitions=Array.from({length:count},(_,i)=>{const family=MORPHOLOGY_FAMILIES[i%MORPHOLOGY_FAMILIES.length],g=realisticIndividualCreatureGenome(generateCreatureGenome(`renderer-profile/${i}`,['browser','runner','low-slung','long-neck'][i%4]),`individual/${i}`,i%4,i%3?'adult':'juvenile',family);return kit.planetComposerDefinition(g,{individualId:`id/${i}`,speciesId:`species/${family}`});});
const provider={async build(job){const start=performance.now(),source=job.loadedSource??kit.buildPlanetComposerSource(job.definition),sourceMs=performance.now()-start,lodStart=performance.now(),levels=buildFaunaComposerLevels(source);
 rows.push({id:job.definition.phenotype.identity.individualId,bones:source.graph.bones.length,sourceTriangles:source.skin.triangleCount,sourceTypedBytes:composerTypedBytes(source),middleVertices:levels.middle.positions.length/3,middleTriangles:levels.middle.index.length/3,farVertices:levels.far.positions.length/3,farTriangles:levels.far.index.length/3,middleTypedBytes:composerTypedBytes(levels.middle),farTypedBytes:composerTypedBytes(levels.far),sourceMs,lodMs:performance.now()-lodStart});
 return {key:job.key,source,levels,buildMs:performance.now()-start};}};
const renderer=new FaunaComposerRenderer({provider,pose:(graph,c)=>poseComposer(graph,'idle',c.rigSeconds),capacity:512,maxSources:64,maxBytes:32*1024*1024,mergedTiers:{far:{maxVertices:32000,maxIndices:120000,maxBytes:9*1024*1024}}});
const candidates=definitions.map((definition,i)=>({id:`id/${i}`,sourceKey:faunaComposerSourceKey(definition,'planet-composer-source-1'),definition,matrix:new THREE.Matrix4().makeTranslation(i,0,0),distanceM:300+i,cameraVisible:true,rigSeconds:0,poseKey:'idle0'}));
try{for(let i=0;i<count+2;i++){renderer.update(candidates);await new Promise(resolve=>setImmediate(resolve));}
 const report={note:'Offline single-source CPU build/reduction and renderer accounting; no GPU timing or measured worker peak',count,kit:process.env.PLANET_COMPOSER_KIT_URL??'#creature-kit/planet',rows,renderer:renderer.diagnostics(),errors};
 const output=process.env.COMPOSER_PROFILE_OUTPUT??'C:/LLM/IWSDK/Assets/_assetctl/planet-composer-merged-20261011';await mkdir(output,{recursive:true});await writeFile(output+'/actual-kit-accounting.json',JSON.stringify(report,null,2));
 const {actors,...summary}=report.renderer;
 console.log(JSON.stringify({count,sourceJobs:rows.length,bones:[Math.min(...rows.map(r=>r.bones)),Math.max(...rows.map(r=>r.bones))],sourceTypedBytes:[Math.min(...rows.map(r=>r.sourceTypedBytes)),Math.max(...rows.map(r=>r.sourceTypedBytes))],farVertices:[Math.min(...rows.map(r=>r.farVertices)),Math.max(...rows.map(r=>r.farVertices))],farTriangles:[Math.min(...rows.map(r=>r.farTriangles)),Math.max(...rows.map(r=>r.farTriangles))],renderer:summary},null,2));
}finally{renderer.dispose();}
