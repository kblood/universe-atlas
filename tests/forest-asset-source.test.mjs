import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ForestAssetSource,validateForestBundle} from '../src/forest-asset-source.ts';

const url=new URL('https://atlas.invalid/assets/forest/bundle.json');
function fixture(){
  const files=new Map(),families=['branching','spire'].map(kind=>{
    const family={kind};
    for(const role of ['lod0','lod1','mipManifest','mipPayload']){
      const data=Buffer.from(role==='mipManifest'?JSON.stringify({family:kind}):`${kind}/${role}`),path=`${kind}/${role}`;
      files.set(new URL(path,url).href,data);
      family[role]={path,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')};
    }
    return family;
  });
  const manifest={schemaVersion:1,version:'fixture-1',families},requests=[];
  const fetcher=async(input,options)=>{
    requests.push({url:String(input),options});
    return new Response(String(input)===url.href?JSON.stringify(manifest):files.get(String(input)),{status:200});
  };
  return {manifest,files,requests,fetcher};
}
test('bundle validates bounded local resources and requires both distinct families',()=>{
  const {manifest}=fixture();assert.equal(validateForestBundle(manifest),manifest);
  for(const path of ['../other','/absolute','https://elsewhere/a','a//b','a/./b','a%2fb','a?query','a#fragment','a\\b']){
    const changed=structuredClone(manifest);changed.families[0].lod0.path=path;
    assert.throws(()=>validateForestBundle(changed),/resource/);
  }
  for(const mutate of [m=>m.families.pop(),m=>m.families[1].kind='branching',m=>m.families[1].kind='other',
    m=>m.families[0].lod0.bytes=Infinity,m=>m.families[0].lod0.sha256='bad',
    m=>m.families[0].lod0.path=m.families[0].lod1.path,m=>m.families[0].mipManifest.bytes=1048577,
    m=>{for(const f of m.families){f.lod0.bytes=32*1024*1024;f.lod1.bytes=32*1024*1024;}}]){
    const changed=structuredClone(manifest);mutate(changed);assert.throws(()=>validateForestBundle(changed));
  }
});
test('one shared load verifies all resources and caches only a complete family pair',async()=>{
  const f=fixture(),source=new ForestAssetSource(url,f.fetcher),first=source.load(),second=source.load();
  assert.equal(first,second);assert.equal(source.diagnostics().loading,true);
  const bundle=await first;assert.equal(await source.load(),bundle);assert.equal(f.requests.length,9);
  assert.deepEqual(bundle.inputs.map(x=>x.kind),['branching','spire']);
  assert.deepEqual(bundle.inputs[1].foliageMipSidecar.manifest,{family:'spire'});
  assert.equal(source.diagnostics().retainedBytes,bundle.bytes);
  assert.ok(f.requests.every(x=>x.options.redirect==='error'));
  source.clear();assert.equal(source.diagnostics().retainedBytes,0);
  await source.load();assert.equal(f.requests.length,18);
});
test('integrity or size failures retain no partial bundle and a later load can retry',async()=>{
  for(const mode of ['hash','short','long']){
    const f=fixture(),key=new URL(f.manifest.families[0].lod0.path,url).href,original=f.files.get(key);
    const data=mode==='hash'?Buffer.from(original):mode==='short'?Buffer.from('corrupt'):Buffer.alloc(200);
    if(mode==='hash')data[0]^=1;
    f.files.set(key,data);const source=new ForestAssetSource(url,f.fetcher);
    await assert.rejects(source.load(),/integrity|byte limit/);
    assert.equal(source.diagnostics().ready,false);assert.equal(source.diagnostics().loading,false);
    assert.equal(source.diagnostics().retainedBytes,0);
    f.files.set(key,original);await source.load();assert.equal(source.diagnostics().error,'');
  }
});
test('clear aborts in-flight work and stale completion cannot replace a subsequent load',async()=>{
  const f=fixture();let release,initial=true,signal;
  const source=new ForestAssetSource(url,async(input,options)=>{
    if(initial){initial=false;signal=options.signal;await new Promise(resolve=>{release=resolve;});}
    return f.fetcher(input,options);
  });
  const stale=source.load(),rejected=assert.rejects(stale,/abort|cancel/i);
  source.clear();assert.equal(signal.aborted,true);
  const current=await source.load();release();await rejected;
  assert.equal(await source.load(),current);assert.equal(source.diagnostics().ready,true);
});
test('HTTP errors and oversized streamed manifests fail without caching',async()=>{
  for(const response of [new Response('missing',{status:404}),new Response('x'.repeat(1048577))]){
    const source=new ForestAssetSource(url,async()=>response);
    await assert.rejects(source.load(),/HTTP 404|byte limit/);
    assert.equal(source.diagnostics().retainedBytes,0);
  }
});
