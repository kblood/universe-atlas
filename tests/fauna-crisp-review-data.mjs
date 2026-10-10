import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {buildFaunaPlanetCrispData} from '../src/fauna-planet-crisp.ts';
import {packFaunaPlanetCrispData} from '../src/fauna-planet-crisp-packed.ts';
const oraclePath=process.env.FAUNA_COAT_ORACLE;if(!oraclePath)throw new Error('FAUNA_COAT_ORACLE built Kit entry required');
const {createQuadrupedBodyPatternSampler}=await import(pathToFileURL(oraclePath).href);
const previous=JSON.parse(await readFile('C:/LLM/IWSDK/Assets/_assetctl/animal-system-20261010/lod-candidates-surface-v2-final/data.json','utf8'));
const decode=l=>({...l,positions:new Float32Array(l.positions),normals:new Float32Array(l.normals),colors:new Uint8Array(l.colors),skinIndex:new Uint8Array(l.skinIndex),skinWeight:new Uint8Array(l.skinWeight),index:new Uint16Array(l.index)});
const pack=d=>({version:d.version,packingScale:d.packingScale,descriptor:d.descriptor,diagnostics:d.diagnostics,resources:d.resources,provenance:d.provenance,
  c0:Array.from(d.c0),c1:Array.from(d.c1),c2:Array.from(d.c2),sample:Array.from(d.sample),clip:Array.from(d.clip),coefficientType:d.c0.constructor.name});
const rows=[];
for(const row of previous.rows.slice(8,10)){
  const source=decode({...row,...row.source}),oracle=createQuadrupedBodyPatternSampler(source,{rawLayers:true}),started=performance.now(),full=buildFaunaPlanetCrispData(source,source,oracle);
  const probes=[];
  if(full.descriptor)for(let v=0;v<source.bodyVertexCount&&probes.length<24;v+=37){if(!full.clip[v])continue;const sample=Array.from(full.sample.subarray(v*4,v*4+4));
    if(sample.slice(0,3).some(x=>{const fraction=x*full.descriptor.cells-Math.floor(x*full.descriptor.cells);return fraction<.1||fraction>.9;}))continue;
    probes.push({vertex:v,sample,c0:Array.from(full.c0.subarray(v*3,v*3+3)),c1:Array.from(full.c1.subarray(v*3,v*3+3)),c2:Array.from(full.c2.subarray(v*3,v*3+3)),clip:full.clip[v],expectedLinearRgbBytes:Array.from(source.colors.subarray(v*3,v*3+3))});}
  const levels=[];for(const level of row.chains.find(c=>c.method==='joint-constrained-qem').levels){const geometry=decode({...level,plan:source.plan,
      bodyVertexCount:level.bodyVertexCount??level.sourceVertex.filter(v=>v<source.bodyVertexCount).length}),start=performance.now(),floating=buildFaunaPlanetCrispData(source,geometry,oracle),packed=packFaunaPlanetCrispData(floating);
    levels.push({...level,crispFloat:pack(floating),crispPacked:pack(packed),coldBuildMs:performance.now()-start});}
  rows.push({...row,crispFull:{...row.source,crisp:pack(full)},crispLevels:levels,probes,coldBuildMs:performance.now()-started});
  console.log(JSON.stringify({id:row.id,full:full.diagnostics,levels:levels.map(l=>({target:l.target,diagnostics:l.crispFloat.diagnostics,packed:l.crispPacked.diagnostics,resources:l.crispPacked.resources}))}));
}
const hashes={};for(const file of ['src/fauna-planet-crisp.ts','src/fauna-planet-crisp-packed.ts',oraclePath])hashes[file]=createHash('sha256').update(await readFile(file)).digest('hex');
const data={oraclePath,hashes,scope:'raw-field indexed appearance prototype; original source geometry/weights unchanged',rows};
await mkdir('test-results/animal-crisp-review',{recursive:true});await writeFile('test-results/animal-crisp-review/data.json',JSON.stringify(data));
const out=process.env.ATLAS_RESULTS||'test-results/animal-crisp-review';await mkdir(out,{recursive:true});await writeFile(out+'/data.json',JSON.stringify(data));
