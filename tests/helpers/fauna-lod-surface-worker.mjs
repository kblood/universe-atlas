import {parentPort,workerData} from 'node:worker_threads';
import {buildFaunaSurfaceRefinedLodChain} from '../../src/fauna-lod-surface-refinement.ts';
parentPort.postMessage({started:true});
try {
  const result=buildFaunaSurfaceRefinedLodChain(workerData.source,{cancelFlag:workerData.cancelFlag});
  parentPort.postMessage({complete:true,triangles:result.levels.map(l=>l.triangleCount)});
} catch(error){parentPort.postMessage({error:String(error)});}
