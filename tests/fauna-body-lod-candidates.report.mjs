// Disposable evidence from a supplied, frozen corpus. Does not rebuild genomes.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildFaunaBodyLodCandidates} from '../src/fauna-body-lod-candidates.ts';
const [input,output]=process.argv.slice(2);if(!input||!output)throw new Error('usage: node report.mjs corpus.json output.json');
const corpus=JSON.parse(readFileSync(input,'utf8'));
const rows=[];
for(const row of corpus.rows){
  const source={...row,...row.source,plan:row.plan};
  for(const k of ['positions','normals'])source[k]=Float32Array.from(row.source[k]);
  for(const k of ['colors','skinIndex','skinWeight'])source[k]=Uint8Array.from(row.source[k]);
  source.index=Uint32Array.from(row.source.index);
  const start=performance.now(),result=buildFaunaBodyLodCandidates(source),wallMs=performance.now()-start;
  const levels=[{method:'baseline-qem',levels:result.baseline.levels,anchorVertices:result.chains[0].anchorVertices},...result.chains].flatMap(chain=>chain.levels.map(level=>{
    const positions=new Set(Array.from(level.sourceVertex,v=>source.positions.slice(v*3,v*3+3).join('/')));
    const anchorsRetained=Array.from(chain.anchorVertices).filter(v=>positions.has(source.positions.slice(v*3,v*3+3).join('/'))).length;
    const h=createHash('sha256');for(const k of ['positions','normals','colors','skinIndex','skinWeight','index'])h.update(new Uint8Array(level[k].buffer,level[k].byteOffset,level[k].byteLength));
    return {method:chain.method,target:level.target,triangles:level.triangleCount,vertices:level.vertexCount,reached:level.reached,withinBudget:level.withinBudget,anchors:chain.anchorVertices.length,anchorsRetained,droppedFeatures:level.droppedFeatures,appendagesPresent:level.appendagesPresent,derivedBytes:level.byteLength,geometrySha256:h.digest('hex')};
  }));
  rows.push({id:row.id,sourceDigest:row.sourceDigest,wallMs,wallTiming:'diagnostic only; not isolated performance acceptance',options:result.chains.map(c=>({method:c.method,version:c.version,optionsHash:c.optionsHash,provenance:c.provenance})),levels});
}
writeFileSync(output,JSON.stringify({input,corpusSourceCommit:corpus.sourceCommit,productionDefault:false,qualityAccepted:false,desktopGpu:'separate paired harness evidence required',quest:'unavailable',rows},null,2)+'\n');
console.log(JSON.stringify(rows.map(r=>({id:r.id,wallMs:r.wallMs,levels:r.levels.map(l=>[l.method,l.target,l.triangles,l.vertices,l.anchorsRetained,l.anchors,l.droppedFeatures.length])}))));
