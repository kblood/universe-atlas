import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {buildQuadrupedBody} from '../src/fauna-body-plan.ts';
import {buildFaunaBodyLodChain,faunaBodyLodQuality} from '../src/fauna-body-lod.ts';
const source=JSON.parse(await readFile('test-results/fauna-body-lod-baseline/report.json','utf8'));
const rows=[];
for(const s of source.samples){const body=buildQuadrupedBody(s.genome),start=performance.now();
  const chain=buildFaunaBodyLodChain(body,{targets:[1500,500,200]});
  rows.push({name:s.name,genome:s.genome,buildLodMs:performance.now()-start,levels:chain.levels.map(l=>({
    target:l.target,triangles:l.triangleCount,vertices:l.vertexCount,quality:faunaBodyLodQuality(body,l,{stride:32}),
    plan:l.plan,positions:Array.from(l.positions),normals:Array.from(l.normals),colors:Array.from(l.colors),
    skinIndex:Array.from(l.skinIndex),skinWeight:Array.from(l.skinWeight),index:Array.from(l.index)}))});
}
await mkdir('test-results/body-lod-assets',{recursive:true});
await writeFile('test-results/body-lod-assets/data.json',JSON.stringify({source:'f3e7697 canonical samples; provisional modules6814835/22547fd',rows}));
console.log(JSON.stringify(rows.map(r=>({name:r.name,buildLodMs:r.buildLodMs,levels:r.levels.map(l=>({target:l.target,triangles:l.triangles,vertices:l.vertices,quality:l.quality}))})),null,2));
