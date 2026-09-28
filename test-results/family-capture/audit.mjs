import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const root='C:/LLM/IWSDK',sidecar=process.env.ATLAS_CAPTURE_SIDECAR==='1',dense=process.env.ATLAS_CAPTURE_GRID==='17';
if(dense&&!sidecar)throw new Error('Dense fixture requires runtime sidecars');
const out='test-results/family-capture'+(dense?'/sidecar-grid17-audit':sidecar?'/sidecar-audit':'');await mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex'),results=[];
for(const name of dense?['oak']:['oak','pine']){
  const dir=join(root,`Assets/_assetctl/atlas-${name}-lod1-capture-16m-64${sidecar?'-sidecar':''}${dense?'-grid17':''}-v1`),raw=await readFile(join(dir,'capture-manifest.json')),m=JSON.parse(raw);
  assert.equal(m.options.lod,1);assert.equal(m.options.heightM,16);assert.equal(m.views.length,dense?289:81);assert.equal(m.artifacts.length,(dense?289:81)*28);assert.deepEqual(m.errors,[]);
  for(const [path,hash] of Object.entries(m.input.files))assert.equal(sha(await readFile(join(root,m.input.directory,path))),hash);
  assert.equal(sha(await readFile(join(dir,m.sourceManifest.path))),m.sourceManifest.sha256);
  assert.equal(sha(await readFile(join(dir,m.upstreamNotice.path))),m.upstreamNotice.sha256);
  if(sidecar){assert.equal(m.foliageSampling,'offline-sidecar');for(const r of Object.values(m.foliageMipSource))assert.equal(sha(await readFile(join(dir,r.path))),r.sha256);}
  let covered=0,leaf=0,bark=0,area=0;
  for(const r of m.artifacts){
    const bytes=await readFile(join(dir,r.path));assert.equal(bytes.length,r.bytes);assert.equal(sha(bytes),r.sha256);
    if(!r.path.endsWith('.f32'))continue;
    const values=new Float32Array(bytes.buffer,bytes.byteOffset,bytes.length/4);assert.ok(values.every(Number.isFinite));
    if(r.path.endsWith('.colour.f32')){
      assert.ok(values.every(v=>v>=0&&v<=1.00001));
      const cbytes=await readFile(join(dir,r.path.replace('.colour.f32','.classification.f32'))),classes=new Float32Array(cbytes.buffer,cbytes.byteOffset,cbytes.length/4);
      for(let i=3;i<values.length;i+=4)if(values[i]>0){covered++;if(classes[(i-3)/4]>.99)leaf++;if(classes[(i-3)/4]<.01)bark++;if(r.mip===0)area+=values[i];}
    }
  }
  assert.ok(leaf>0&&bark>0);assert.ok(Math.abs(area-m.coverageSum)<.01);
  await writeFile(join(out,`${name}-capture-manifest.json`),raw);
  results.push({family:name,directory:dir,manifestSha256:sha(raw),artifacts:m.artifacts.length,covered,leaf,bark,area,adapter:m.adapter});
}
const briefPath=`examples/asset-briefs/atlas-family-lod1-capture-${dense?'density-':''}comparison.json`;
await writeFile(join(out,'capture-audit.json'),JSON.stringify({brief:{path:briefPath,sha256:sha(await readFile(join(root,briefPath)))},results},null,2)+'\n');
console.log(JSON.stringify(results));
