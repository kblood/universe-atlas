import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {buildQuadrupedBody} from '../src/fauna-body-plan.ts';
import {buildFaunaPlanetCrispData} from '../src/fauna-planet-crisp.ts';
import {packFaunaPlanetCrispData} from '../src/fauna-planet-crisp-packed.ts';
const {createQuadrupedBodyPatternSampler}=await import(pathToFileURL(process.env.FAUNA_COAT_ORACLE).href);
const {buildFaunaBodyLodCandidates}=await import(pathToFileURL(process.env.LOD_CANDIDATE_MODULE).href);
const corpus=JSON.parse(await readFile('C:/LLM/IWSDK/Assets/_assetctl/animal-system-20261010/canonical-review-corpus-plus-worlds/corpus.json','utf8'));
const typed=o=>Object.values(o).filter(ArrayBuffer.isView).reduce((sum,a)=>sum+a.byteLength,0),rows=[];
for(const specimen of corpus.rows.slice(8,10)){
  const start=performance.now(),source=buildQuadrupedBody(specimen.genome),bodyDone=performance.now(),chain=buildFaunaBodyLodCandidates(source,{targets:[500],methods:['joint-constrained-qem']}),lod=chain.chains[0].levels[0],lodDone=performance.now();
  const floating=buildFaunaPlanetCrispData(source,lod,createQuadrupedBodyPatternSampler(source,{rawLayers:true})),floatDone=performance.now(),packed=packFaunaPlanetCrispData(floating),packedDone=performance.now();
  rows.push({id:specimen.id,bodyMs:bodyDone-start,lod500Ms:lodDone-bodyDone,rawFieldMs:floatDone-lodDone,packingMs:packedDone-floatDone,totalMs:packedDone-start,
    sourceTypedBytes:typed(source),lodTypedBytes:typed(lod),floatAppearanceBytes:floating.resources.extraCpuBytes,packedAppearanceBytes:packed.resources.extraCpuBytes,
    typedArraysAliveAtReturnBytes:typed(source)+typed(lod)+floating.resources.extraCpuBytes+packed.resources.extraCpuBytes,
    sourceBorrowedByFloatAndPacked:true,rootMetadataAndReducerScratchExcluded:true,
    serializedSameCostCohortEstimateMs:{firstUseful:packedDone-start,camera17:(packedDone-start)*17,camera13:(packedDone-start)*13,camera25:(packedDone-start)*25}});
}
const out=process.env.ATLAS_RESULTS||'test-results/fauna-cold-lod';await mkdir(out,{recursive:true});await writeFile(out+'/report.json',JSON.stringify({node:process.version,
  scope:'fresh process, exclusive CPU slot; real two captured genomes; cohort estimates multiply measured per-source cost and are not observed app arrival latency; reducer scratch/worker transport/JIT imports excluded',rows},null,2));console.log(JSON.stringify(rows,null,2));
