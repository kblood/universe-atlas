import {readFile,writeFile} from 'node:fs/promises';
import {FaunaLodPoseWriter} from '../src/fauna-lod-pose.ts';
const out=process.env.ATLAS_RESULTS||'test-results/body-lod-gpu',report=JSON.parse(await readFile(out+'/report.json','utf8'));
const corpus=JSON.parse(await readFile('C:/LLM/IWSDK/Assets/_assetctl/animal-system-20261010/canonical-review-corpus/corpus.json','utf8'));
function poseTypedBytes(count){
  const writer=new FaunaLodPoseWriter(),handles=Array.from({length:count},(_,i)=>writer.prepare(corpus.rows[i%corpus.rows.length].plan,{id:'lab/'+i,orbitRadiusM:4}));
  const buffers=new Set();let bytes=0;
  const add=array=>{if(ArrayBuffer.isView(array)&&!buffers.has(array.buffer)){buffers.add(array.buffer);bytes+=array.buffer.byteLength;}};
  for(const value of Object.values(writer))add(value);
  for(const handle of handles){for(const value of Object.values(handle))add(value);for(const value of Object.values(handle.rest))add(value);}
  return {approximatePoseCpuBytes:bytes,callerPaletteCpuBytes:count*22*16*4};
}
const intended128=poseTypedBytes(128),actualLab512=poseTypedBytes(512);
const summary={hardware:report.renderer,errors:report.errors,scope:'instrumented standalone field with canonical activity and approximate pose; no uneven-ground IK, no production integration or Quest gate',
  rows:report.rows.map(r=>({method:r.method||r.mode,paused:r.paused,updateCPU:r.cpu,renderCPU:r.renderCpu,GPU:r.gpu,draw:r.info.render,backend:r.info.backend})),
  intended128,actualLab512,
  exclusions:['lab prepares 512 pose handles/caller palettes even when rendering128; CPU loop and measured backend capacity are128',
    'pool estimate excludes JS objects, loaded source workers/assets, renderer programs and driver padding',
    'standalone pool fit cannot establish aggregate planetary budget fit']};
const b=report.rows.find(r=>r.method==='joint-constrained-qem').info.backend;
summary.candidate128={retainedCpuBytes:b.geometryBytes+b.paletteBytes+b.cacheBytes+128*4+intended128.approximatePoseCpuBytes+intended128.callerPaletteCpuBytes,
  gpuEstimateBytes:b.geometryBytes+b.paletteBytes,
  conservativeTypedPoolPlusPoseEstimateBytes:b.estimatedBufferBytes+128*4+intended128.approximatePoseCpuBytes+intended128.callerPaletteCpuBytes,
  additionalSeenCpuBytes:128*4,scope:'adding one candidate pool; existing representations not subtracted'};
await writeFile(out+'/summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
