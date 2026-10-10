import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {dirname,join} from 'node:path';
import {buildFaunaBodyLodChain} from '../src/fauna-body-lod.ts';
const corpusPath=process.env.LOD_REVIEW_CORPUS||'C:/LLM/IWSDK/Assets/_assetctl/animal-system-20261010/canonical-review-corpus/corpus.json';
const modulePath=process.env.LOD_CANDIDATE_MODULE;
if(!modulePath)throw new Error('LOD_CANDIDATE_MODULE must name a frozen candidate source module');
const {buildFaunaBodyLodCandidates}=await import(pathToFileURL(modulePath).href);
const corpus=JSON.parse(await readFile(corpusPath,'utf8')),targets=[1500,750,500],rows=[];
const dependencies={};for(const file of ['fauna-body-lod-candidates.ts','fauna-body-lod.ts','fauna-composer-lod.ts'])dependencies['candidate/'+file]=createHash('sha256').update(await readFile(join(dirname(modulePath),file))).digest('hex');
for(const file of ['fauna-body-lod.ts','fauna-composer-lod.ts'])dependencies['baseline/'+file]=createHash('sha256').update(await readFile('src/'+file)).digest('hex');
const fields=['positions','normals','colors','skinIndex','skinWeight','index'];
const pack=level=>({...Object.fromEntries(fields.map(f=>[f,Array.from(level[f])])),target:level.target,vertexCount:level.vertexCount,triangleCount:level.triangleCount,
  reached:level.reached,withinBudget:level.withinBudget,droppedFeatures:level.droppedFeatures,appendagesPresent:level.appendagesPresent,stats:level.stats,
  sourceVertex:Array.from(level.sourceVertex),representative:Array.from(level.representative),parts:level.parts});
for(const row of corpus.rows){
  const body={...row,...row.source,positions:new Float32Array(row.source.positions),normals:new Float32Array(row.source.normals),colors:new Uint8Array(row.source.colors),
    skinIndex:new Uint8Array(row.source.skinIndex),skinWeight:new Uint8Array(row.source.skinWeight),index:new Uint32Array(row.source.index)};
  const start=performance.now(),baseline=buildFaunaBodyLodChain(body,{targets}),candidate=buildFaunaBodyLodCandidates(body,{targets,methods:['joint-constrained-qem','skin-coat-adaptive-cluster']});
  rows.push({...row,buildMs:performance.now()-start,chains:[{method:'existing-qem',version:baseline.version,provenance:baseline.provenance,levels:baseline.levels.map(pack)},
    ...candidate.chains.map(c=>({...c,anchorVertices:Array.from(c.anchorVertices),levels:c.levels.map(pack)}))]});
  console.log(JSON.stringify({id:row.id,chains:rows.at(-1).chains.map(c=>({method:c.method,levels:c.levels.map(l=>({target:l.target,reached:l.reached,triangles:l.triangleCount}))}))}));
}
const output={corpusPath,corpusSourceCommit:corpus.sourceCommit,modulePath,moduleDigest:createHash('sha256').update(await readFile(modulePath)).digest('hex'),dependencies,targets,rows};
await mkdir('test-results/animal-lod-review',{recursive:true});await writeFile('test-results/animal-lod-review/data.json',JSON.stringify(output));
const out=process.env.ATLAS_RESULTS||'test-results/animal-lod-review';await mkdir(out,{recursive:true});await writeFile(out+'/data.json',JSON.stringify(output));
