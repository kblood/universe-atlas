/** Synthetic appearance controls on one frozen real body; never new production animals. */
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {buildFaunaPlanetCrispData,FAUNA_PLANET_CRISP_PATTERNS} from '../src/fauna-planet-crisp.ts';
import {coatSeedMix} from '../src/fauna-coat-fields.ts';
const {createQuadrupedBodyPatternSampler,createQuadrupedBodyColourSampler}=await import(pathToFileURL(process.env.FAUNA_COAT_ORACLE).href);
const path='test-results/animal-crisp-review/data.json',data=JSON.parse(await readFile(path,'utf8')),row=data.rows[0];
const decode=l=>({...l,positions:new Float32Array(l.positions),normals:new Float32Array(l.normals),colors:new Uint8Array(l.colors),skinIndex:new Uint8Array(l.skinIndex),skinWeight:new Uint8Array(l.skinWeight),index:new Uint16Array(l.index)});
const inverseOdd=a=>{let x=a;for(let i=0;i<5;i++)x=Math.imul(x,2-Math.imul(a,x));return x;};
const unmix=y=>{let x=(y^(y>>>16));x=Math.imul(x,inverseOdd(0x846ca68b));x=x^(x>>>15)^(x>>>30);x=Math.imul(x,inverseOdd(0x7feb352d));return ((x^(x>>>16))^0x9e3779b9)>>>0;};
const extremeSeed=unmix(0xffffffff);if((coatSeedMix(extremeSeed)>>>0)!==0xffffffff)throw new Error('Extreme mixed-seed inversion failed');
data.patternProbes=[];
for(const pattern of FAUNA_PLANET_CRISP_PATTERNS)for(const contrast of ['normal','dark-clamp']){
 const plan=structuredClone(row.plan),coat=plan.genome.appearance.coat;coat.pattern=pattern;coat.seed=extremeSeed;
 if(contrast==='dark-clamp'){coat.colours.base=[.002,.004,.008];coat.colours.accent=[1,.9,.7];coat.colours.belly=[1,1,1];coat.contrast=1.5;}
 const source=decode({...row,...row.source,plan}),level=row.crispLevels.find(l=>l.target===500),geometry=decode({...level,plan,bodyVertexCount:level.bodyVertexCount??level.sourceVertex.filter(v=>v<source.bodyVertexCount).length}),oracle=createQuadrupedBodyPatternSampler(source,{rawLayers:true}),prepared=buildFaunaPlanetCrispData(source,geometry,oracle),rgbOracle=createQuadrupedBodyColourSampler(source),rgb=new Float64Array(3),probes=[];
 for(let v=0;v<geometry.bodyVertexCount&&probes.length<24;v++){
  if(!prepared.clip[v]||!prepared.descriptor)continue;
  const sample=Array.from(prepared.sample.subarray(v*4,v*4+4));
  if(sample.slice(0,3).some(x=>{const f=x*prepared.descriptor.cells-Math.floor(x*prepared.descriptor.cells);return f<.1||f>.9;}))continue;
  rgbOracle.sampleInto(...geometry.positions.subarray(v*3,v*3+3),geometry.normals[v*3+1],rgb);
  probes.push({vertex:v,sample,c0:Array.from(prepared.c0.subarray(v*3,v*3+3)),c1:Array.from(prepared.c1.subarray(v*3,v*3+3)),c2:Array.from(prepared.c2.subarray(v*3,v*3+3)),clip:prepared.clip[v],expectedLinearRgbBytes:Array.from(rgb,x=>Math.round(Math.max(0,Math.min(1,x))*255))});
 }
 if(probes.length<8)throw new Error('Insufficient eligible probes '+pattern);
 data.patternProbes.push({id:`synthetic/${pattern}/${contrast}/mixed-seed-ffffffff`,descriptor:prepared.descriptor,diagnostics:prepared.diagnostics,probes});
}
data.patternProbeScope='Appearance-only synthetic controls; same frozen real body/source context, seven supported patterns, mixed UINT32_MAX seed, normal and dark clamp contrast; CPU oracle newly evaluated at each selected point.';
await writeFile(path,JSON.stringify(data));console.log(JSON.stringify(data.patternProbes.map(r=>({id:r.id,seed:r.descriptor.seed,probes:r.probes.length}))));
