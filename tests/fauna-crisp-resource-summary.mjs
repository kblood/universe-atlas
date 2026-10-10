import {readFile,writeFile} from 'node:fs/promises';
import {FaunaLodPoseWriter} from '../src/fauna-lod-pose.ts';
const root='C:/LLM/IWSDK/Assets/_assetctl/animal-system-20261010';
const corpus=JSON.parse(await readFile(root+'/canonical-review-corpus-plus-worlds/corpus.json','utf8'));
function poseBytes(count){const writer=new FaunaLodPoseWriter(),handles=Array.from({length:count},(_,i)=>writer.prepare(corpus.rows[8+i%2].plan,{id:'lab/'+i,orbitRadiusM:4})),seen=new Set();let bytes=0;
 const add=a=>{if(ArrayBuffer.isView(a)&&!seen.has(a.buffer)){seen.add(a.buffer);bytes+=a.buffer.byteLength;}};
 for(const v of Object.values(writer))add(v);for(const h of handles){for(const v of Object.values(h))add(v);for(const v of Object.values(h.rest))add(v);}return {approximatePoseTypedCpuBytes:bytes,callerPalettesCpuBytes:count*22*16*4};}
const pose128=poseBytes(128),pose512=poseBytes(512),baseline=JSON.parse(await readFile(root+'/life-memory-forest-ineligible/report.json','utf8'));
const report={scope:'128 distinct owner keys, repeated two frozen actual genomes; diagnostic addition, no existing representation subtraction or aggregate16MiB acceptance',pose128,actualLabPose512:pose512,candidates:[],scratchLowerBounds:[],exclusions:['JS Maps/Sets/objects and numeric arrays, driver/program storage, worker transport/imports','resource totals estimate typed CPU and GPU ownership; pending geometry allowance is reserve rather than current allocation','cold timing wrapper constructs a baseline control plus constrained chain; not an optimized production worker']};
for(const storage of ['packed','float']){const r=JSON.parse(await readFile(root+`/crisp-compact-gpu-${storage}/report.json`,'utf8')),b=r.rows.find(r=>r.mode==='derived').info.backend;
 const retainedCpuBytes=b.geometryBytes+b.paletteRetainedCpuBytes+b.appearanceMetaCpuBytes+128*7+pose128.approximatePoseTypedCpuBytes+pose128.callerPalettesCpuBytes;
 const gpuEstimateBytes=b.geometryBytes+b.paletteGpuEstimateBytes+b.appearanceMetaCpuBytes;
 report.candidates.push({storage,backend:b,retainedCpuBytes,gpuEstimateBytes,conservativeReservedPoolPlusPoseBytes:b.estimatedCompositeBufferBytes+pose128.approximatePoseTypedCpuBytes+pose128.callerPalettesCpuBytes,
  worlds:baseline.runs.map(run=>({world:run.world,existingCpuBytes:run.memory.lifeRetainedCpuBytes,existingGpuEstimateBytes:run.memory.lifeGpuEstimateBytes,
   afterAdditionCpuBytes:run.memory.lifeRetainedCpuBytes+retainedCpuBytes,afterAdditionGpuEstimateBytes:run.memory.lifeGpuEstimateBytes+gpuEstimateBytes}))});}
for(const row of corpus.rows.slice(8,10)){const [nx,ny,nz]=row.grid,nV=row.vertexCount,nT=row.triangleCount;
 report.scratchLowerBounds.push({id:row.id,grid:row.grid,sourceGridScratchBytes:4*nx*ny*nz+4*(nx-1)*(ny-1)*(nz-1),
  qemFixedTypedWorkspaceUsingMaxDistinctPositionsBytes:164*nV+25*nT+16384,
  scoringAdapterTypedBytes:36*nV,
  scope:'source field+cellVertex exact bytes; QEM formula uses nP=nV upper bound for named fixed arrays, initial heap only. Dynamic heap growth, heap replacement overlap, parts outputs, constraints, JS adjacency and adapter/control concurrency excluded; not a complete peak bound.'});}
await writeFile(root+'/crisp-compact-resource-summary.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
