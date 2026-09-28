import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const root='C:/LLM/IWSDK',sidecar=process.env.ATLAS_CAPTURE_SIDECAR==='1',dense=process.env.ATLAS_CAPTURE_GRID==='17',transfer=process.env.ATLAS_CAPTURE_TRANSFER==='1';
if(dense&&!sidecar)throw new Error('Dense fixture requires runtime sidecars');
if(transfer&&(!sidecar||dense))throw new Error('Transfer fixture requires the 81-view runtime sidecar inputs');
const out='test-results/family-capture'+(transfer?'/sidecar-transfer-audit':dense?'/sidecar-grid17-audit':sidecar?'/sidecar-audit':'');await mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex'),results=[];
for(const name of dense||transfer?['oak']:['oak','pine']){
  const dir=join(root,`Assets/_assetctl/atlas-${name}-lod1-capture-16m-64${sidecar?'-sidecar':''}${dense?'-grid17':transfer?'-transfer':''}-v1`),raw=await readFile(join(dir,'capture-manifest.json')),m=JSON.parse(raw);
  assert.equal(m.options.lod,1);assert.equal(m.options.heightM,16);assert.equal(m.views.length,dense?289:81);assert.equal(m.artifacts.length,(dense?289:81)*(transfer?35:28));assert.deepEqual(m.errors,[]);
  const baseline=transfer?JSON.parse(await readFile(join(root,`Assets/_assetctl/atlas-${name}-lod1-capture-16m-64-sidecar-v1/capture-manifest.json`))):null;
  const baselineFiles=new Map(baseline?.artifacts.map(r=>[r.path,r.sha256])??[]);let unchangedAttachments=0,transferValues=0;
  for(const [path,hash] of Object.entries(m.input.files))assert.equal(sha(await readFile(join(root,m.input.directory,path))),hash);
  assert.equal(sha(await readFile(join(dir,m.sourceManifest.path))),m.sourceManifest.sha256);
  assert.equal(sha(await readFile(join(dir,m.upstreamNotice.path))),m.upstreamNotice.sha256);
  if(sidecar){assert.equal(m.foliageSampling,'offline-sidecar');for(const r of Object.values(m.foliageMipSource))assert.equal(sha(await readFile(join(dir,r.path))),r.sha256);}
  let covered=0,leaf=0,bark=0,area=0;
  for(const r of m.artifacts){
    const bytes=await readFile(join(dir,r.path));assert.equal(bytes.length,r.bytes);assert.equal(sha(bytes),r.sha256);
    if(baselineFiles.has(r.path)){assert.equal(r.sha256,baselineFiles.get(r.path),'base capture changed when adding transfer');unchangedAttachments++;}
    if(!r.path.endsWith('.f32'))continue;
    const values=new Float32Array(bytes.buffer,bytes.byteOffset,bytes.length/4);assert.ok(values.every(Number.isFinite));
    if(r.path.endsWith('.diffuse-transfer.f32')){
      assert.equal(values.length,r.size*r.size*27);assert.ok(values.every(v=>Math.abs(v)<=1.00001));transferValues+=values.length;
      const cbytes=await readFile(join(dir,r.path.replace('.diffuse-transfer.f32','.colour.f32'))),colour=new Float32Array(cbytes.buffer,cbytes.byteOffset,cbytes.length/4);
      for(let p=0;p<r.size*r.size;p++)for(let channel=0;channel<3;channel++)assert.ok(Math.abs(values[p*27+channel]-colour[p*4+channel]*colour[p*4+3])<2e-5,'RGB zeroth moment matches area-associated albedo');
    }
    if(r.path.endsWith('.colour.f32')){
      assert.ok(values.every(v=>v>=0&&v<=1.00001));
      const cbytes=await readFile(join(dir,r.path.replace('.colour.f32','.classification.f32'))),classes=new Float32Array(cbytes.buffer,cbytes.byteOffset,cbytes.length/4);
      for(let i=3;i<values.length;i+=4)if(values[i]>0){covered++;if(classes[(i-3)/4]>.99)leaf++;if(classes[(i-3)/4]<.01)bark++;if(r.mip===0)area+=values[i];}
    }
  }
  assert.ok(leaf>0&&bark>0);assert.ok(Math.abs(area-m.coverageSum)<.01);
  if(transfer){assert.equal(unchangedAttachments,2268);assert.ok(transferValues>0);}
  await writeFile(join(out,`${name}-capture-manifest.json`),raw);
  results.push({family:name,directory:dir,manifestSha256:sha(raw),artifacts:m.artifacts.length,covered,leaf,bark,area,unchangedAttachments,transferValues,adapter:m.adapter});
}
const briefPath=transfer?'examples/asset-briefs/atlas-family-lod1-diffuse-transfer.json':`examples/asset-briefs/atlas-family-lod1-capture-${dense?'density-':''}comparison.json`;
await writeFile(join(out,'capture-audit.json'),JSON.stringify({brief:{path:briefPath,sha256:sha(await readFile(join(root,briefPath)))},results},null,2)+'\n');
console.log(JSON.stringify(results));
