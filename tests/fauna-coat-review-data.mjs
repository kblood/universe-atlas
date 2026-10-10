import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {buildFaunaBodyCoatAtlas} from '../src/fauna-body-coat-atlas.ts';
const oraclePath=process.env.FAUNA_COAT_ORACLE;if(!oraclePath)throw new Error('FAUNA_COAT_ORACLE built Kit entry required');
const {createQuadrupedBodyColourSampler}=await import(pathToFileURL(oraclePath).href);
const previous=JSON.parse(await readFile('C:/LLM/IWSDK/Assets/_assetctl/animal-system-20261010/lod-candidates-surface-v2-final/data.json','utf8'));
const fields=['positions','normals','colors','skinIndex','skinWeight','coatUv','coatMask'];
const decode=l=>({...l,positions:new Float32Array(l.positions),normals:new Float32Array(l.normals),colors:new Uint8Array(l.colors),skinIndex:new Uint8Array(l.skinIndex),skinWeight:new Uint8Array(l.skinWeight),index:new Uint16Array(l.index)});
const pack=a=>({vertexCount:a.vertexCount,triangleCount:a.triangleCount,...Object.fromEntries(fields.map(f=>[f,Array.from(a[f])])),resources:a.resources,provenance:a.provenance,
  texture:{...a.texture,data:undefined,base64:Buffer.from(a.texture.data).toString('base64')}});
const rows=[];
for(const row of previous.rows.slice(8,10)){
  const source=decode({...row,...row.source}),oracle=createQuadrupedBodyColourSampler(source),out=new Float64Array(3);let mismatchedVertices=0,maxChannelDifference=0;
  for(let v=0;v<source.bodyVertexCount;v++){oracle.sampleInto(...source.positions.subarray(v*3,v*3+3),source.normals[v*3+1],out);let mismatch=false;for(let ch=0;ch<3;ch++){const d=Math.abs(Math.round(out[ch]*255)-source.colors[v*3+ch]);maxChannelDifference=Math.max(maxChannelDifference,d);mismatch||=d!==0;}if(mismatch)mismatchedVertices++;}
  const start=performance.now(),full=buildFaunaBodyCoatAtlas(source,source,oracle,{samplesPerEdge:4}),fullMs=performance.now()-start;
  const levels=[];for(const l of row.chains.find(c=>c.method==='joint-constrained-qem').levels){const start=performance.now(),atlas=buildFaunaBodyCoatAtlas(source,decode({...l,bodyTriangleCount:l.bodyTriangleCount??l.parts[0].triangles,plan:source.plan}),oracle,{samplesPerEdge:16});levels.push({...pack(atlas),target:l.target,coldBakeMs:performance.now()-start});}
  rows.push({...row,colourOracleCheck:{bodyVertices:source.bodyVertexCount,mismatchedVertices,maxChannelDifference},coatFull:{...pack(full),coldBakeMs:fullMs},coatLevels:levels});
  console.log(JSON.stringify({id:row.id,colourOracleCheck:rows.at(-1).colourOracleCheck,fullMs,full:full.resources,levels:levels.map(l=>({target:l.target,ms:l.coldBakeMs,resources:l.resources}))}));
}
const hashes={};for(const file of ['src/fauna-body-coat-atlas.ts','src/fauna-body-coat-material.ts',oraclePath])hashes[file]=createHash('sha256').update(await readFile(file)).digest('hex');
const data={oraclePath,hashes,scope:'single-actor triangle texture appearance prototype; no128actor budget approval',rows};
await mkdir('test-results/animal-coat-review',{recursive:true});await writeFile('test-results/animal-coat-review/data.json',JSON.stringify(data));
const out=process.env.ATLAS_RESULTS||'test-results/animal-coat-review';await mkdir(out,{recursive:true});await writeFile(out+'/data.json',JSON.stringify(data));
