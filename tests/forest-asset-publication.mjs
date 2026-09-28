// HTTP bytes and build identity; browser tests own rendering/lifecycle acceptance.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {validateForestBundle} from '../src/forest-asset-source.ts';

const expected=process.env.ATLAS_EXPECT_COMMIT;
if(!expected||!/^[a-f0-9]{40}$/.test(expected))throw new Error('ATLAS_EXPECT_COMMIT must name the complete committed revision');
const base=new URL(process.env.ATLAS_URL??'http://127.0.0.1:5186/');
if(!['http:','https:'].includes(base.protocol)||!base.pathname.endsWith('/'))throw new Error('ATLAS_URL must be an HTTP(S) directory URL');
const out=resolve(process.env.ATLAS_RESULTS??'test-results/forest-asset-publication');
const manifestPath='assets/forest/desktop-v1/forest-bundle-manifest.json';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const requests=[];
async function get(path){
  const url=new URL(path,base),response=await fetch(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(60000)});
  assert.equal(response.status,200,`${path}: HTTP ${response.status}`);
  const bytes=new Uint8Array(await response.arrayBuffer());
  requests.push({path,bytes:bytes.length,sha256:hash(bytes),contentType:response.headers.get('content-type')});return bytes;
}
const report={base:base.href,expectedCommit:expected,startedAt:new Date().toISOString(),scope:'HTTP package byte identity and clean build revision; no rendering test',requests};
try{
  const build=JSON.parse(new TextDecoder().decode(await get('build-info.json')));report.build=build;
  assert.equal(build.commit,expected,'Deployed commit differs from the expected revision');assert.equal(build.dirty,false,'Deployed source was dirty');
  const local=await readFile(new URL('../public/'+manifestPath,import.meta.url)),remote=await get(manifestPath);
  assert.equal(hash(remote),hash(local),'Published package manifest differs from the local committed package');
  const manifest=validateForestBundle(JSON.parse(new TextDecoder().decode(remote))),resources=new Map();
  function visit(value){
    if(!value||typeof value!=='object')return;
    if(typeof value.path==='string'&&Number.isSafeInteger(value.bytes)&&typeof value.sha256==='string'){
      const old=resources.get(value.path);if(old){assert.equal(old.bytes,value.bytes);assert.equal(old.sha256,value.sha256);}
      resources.set(value.path,value);
    }else for(const child of Object.values(value))visit(child);
  }
  visit(manifest);assert.equal(resources.size,manifest.delivery.resourceCount);
  let total=0;
  for(const resource of resources.values()){
    assert.ok(/^[-a-zA-Z0-9_./]+$/.test(resource.path)&&!resource.path.split('/').some(part=>!part||part==='.'||part==='..'));
    const bytes=await get('assets/forest/desktop-v1/'+resource.path);
    assert.equal(bytes.length,resource.bytes,resource.path);assert.equal(hash(bytes),resource.sha256,resource.path);total+=bytes.length;
  }
  assert.equal(total,manifest.delivery.filesBytes);report.packageBytes=total;report.resourceCount=resources.size;report.ok=true;
}catch(error){report.ok=false;report.error=String(error);process.exitCode=1;}
report.finishedAt=new Date().toISOString();await mkdir(out,{recursive:true});await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({ok:report.ok,commit:report.build?.commit,resources:report.resourceCount,out,error:report.error}));
