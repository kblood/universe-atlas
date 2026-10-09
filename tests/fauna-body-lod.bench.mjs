// Prototype construction/quality evidence. Cold construction belongs off-frame.
import {generateCreatureGenome,realisticIndividualCreatureGenome} from '../src/creature-model.ts';
import {buildQuadrupedBody} from '../src/fauna-body-plan.ts';
import {buildFaunaBodyLodChain,faunaBodyLodQuality,FaunaBodyLodCache} from '../src/fauna-body-lod.ts';
import {posedBodyPositions,bodyDiagonal} from './helpers/fauna-body-lod-metrics.mjs';
const families=[['browser','ungulate'],['runner','cursorial'],['low-slung','padded'],['long-neck','long-neck'],['browser','proboscidean'],['runner','winged']];
const rows=[];
for(const [archetype,family] of families)for(const stage of ['adult','juvenile']){
  const g=realisticIndividualCreatureGenome(generateCreatureGenome('LOD-PROBE',archetype),archetype+'/'+family,1,stage,family);
  let start=performance.now();const body=buildQuadrupedBody(g),bodyBuildMs=performance.now()-start;
  start=performance.now();const chain=buildFaunaBodyLodChain(body),lodBuildMs=performance.now()-start;
  const diagonal=bodyDiagonal(body),poses=[['rest',undefined],['walk',posedBodyPositions(body,.38,'alert')],['feed',posedBodyPositions(body,0,'feed')]];
  const levels=chain.levels.map(l=>({target:l.target,triangles:l.triangleCount,vertices:l.vertexCount,withinBudget:l.withinBudget,bytes:l.byteLength,
    appendagesPresent:l.appendagesPresent,droppedFeatures:l.droppedFeatures,relaxation:l.stats.relaxation,
    quality:poses.map(([name,posed])=>({pose:name,...faunaBodyLodQuality(body,l,{posed,stride:32})}))}));
  rows.push({archetype,family,stage,sourceTriangles:body.triangleCount,sourceVertices:body.vertexCount,bodyBuildMs,lodBuildMs,diagonal,levels});
}
const cache=new FaunaBodyLodCache(1),body=buildQuadrupedBody(generateCreatureGenome('CACHE-BENCH','browser'));cache.get(body);
let start=performance.now();for(let i=0;i<100000;i++)cache.get(body);const cacheUsPerHit=(performance.now()-start)*1000/100000;
console.log(JSON.stringify({node:process.version,cacheUsPerHit,cacheAllocatedBytes:cache.allocatedBytes,rows},null,2));
