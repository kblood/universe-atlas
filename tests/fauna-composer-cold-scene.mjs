import * as THREE from 'three';
import {generateCreatureGenome, realisticIndividualCreatureGenome} from '../src/creature-model.ts';
import {MORPHOLOGY_FAMILIES} from '../src/fauna-appearance.ts';
import {poseComposer} from '../src/fauna-composer-rig.ts';
import {FaunaComposerRenderer} from '../src/fauna-composer-renderer.ts';
import {faunaComposerSourceKey} from '../src/fauna-composer-render-source.ts';
import {createFaunaComposerWorkerProvider} from '../src/fauna-composer-worker-provider.ts';
const kitUrl = new URL(location.href).searchParams.get('kit');
const kit = await import(/* @vite-ignore */ kitUrl);
const longTasks=[]; new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});
window.__composerCold={ready:true, async run(count=24,maxJobsPerWorker=1){
  const progress=[],jobs=[],updates=[],samples=[];
  const definitions=Array.from({length:count},(_,i)=>{const family=MORPHOLOGY_FAMILIES[i%MORPHOLOGY_FAMILIES.length],g=realisticIndividualCreatureGenome(generateCreatureGenome(`renderer-profile/${i}`,['browser','runner','low-slung','long-neck'][i%4]),`individual/${i}`,i%4,i%3?'adult':'juvenile',family);return kit.planetComposerDefinition(g,{individualId:`id/${i}`,speciesId:`species/${family}`});});
  const url=new URL('./fauna-composer-cold-worker.ts',import.meta.url);url.searchParams.set('kit',kitUrl);
  const workerProvider=createFaunaComposerWorkerProvider(()=>new Worker(url,{type:'module',name:'composer-cold-measurement'}),30000,{maxJobsPerWorker,onProgress:p=>progress.push({...p,at:performance.now()})});
  const provider={async build(job,signal){const start=performance.now(); const result=await workerProvider.build(job,signal);jobs.push({id:job.definition.phenotype.identity.individualId,wallMs:performance.now()-start,buildMs:result.buildMs,bytes:result.receipt.byteLength,bones:result.receipt.bones});return result;},dispose:()=>workerProvider.dispose()};
  const renderer=new FaunaComposerRenderer({provider,pose:(g,c)=>poseComposer(g,'idle',c.rigSeconds),capacity:512,maxSources:512,maxBytes:32*1024*1024,mergedTiers:{far:{maxVertices:32000,maxIndices:120000,maxBytes:9*1024*1024}}});
  const candidates=definitions.map((definition,i)=>({id:`id/${i}`,sourceKey:faunaComposerSourceKey(definition,'planet-composer-source-1'),definition,matrix:new THREE.Matrix4().makeTranslation(i,0,0),distanceM:300+i,cameraVisible:true,rigSeconds:0,poseKey:'idle0'}));
  const start=performance.now(); let firstVisibleMs=null;
  try{while(performance.now()-start<120000){const at=performance.now();renderer.update(candidates);updates.push(performance.now()-at);const d=renderer.diagnostics();window.__composerCold.live={active:d.active,builds:d.builds,running:!!d.running,failures:d.failures,lastError:d.lastError,progress:progress.at(-1)};
    if(d.active&&firstVisibleMs===null)firstVisibleMs=performance.now()-start;
    samples.push({ms:performance.now()-start,active:d.active,adoptionMs:d.adoptionMs,geometryCopyMs:d.geometryCopyMs,ownedBytes:d.ownedBytes,pendingResultBytes:d.pendingResultBytes});
    if(d.active===count&&!d.running)break;await new Promise(resolve=>setTimeout(resolve,16));}
    const {actors,running,...diagnostics}=renderer.diagnostics();
    // Keep the persistent worker alive for an explicit final CDP heap sample.
    window.__composerCold.dispose=()=>renderer.dispose();
    return {count,maxJobsPerWorker,kitUrl,firstVisibleMs,allVisibleMs:performance.now()-start,jobs,progress,updates,samples,longTasks:longTasks.filter(t=>t.start>=start),diagnostics};
  }catch(error){renderer.dispose();throw error;}
}};
