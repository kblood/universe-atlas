import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ForestAssetSource,validateForestBundle} from '../src/forest-asset-source.ts';
import {prepareTreeLODPair} from '#tree-kit/v1/assets';
import {decodeTreeFoliageSidecar} from '#tree-kit/v1/assets';
const root=new URL('../public/assets/forest/desktop-v1/',import.meta.url);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
test('packaged forest retains every declared byte and the upstream notice',async()=>{
  const bytes=await readFile(new URL('forest-bundle-manifest.json',root)),manifest=validateForestBundle(JSON.parse(bytes));
  assert.equal(hash(bytes),'21925ae3e5d5a38aefdde2df0901c1325ed80aae18640254eb62ba39e23545da');
  const resources=new Map();
  function visit(value){if(!value||typeof value!=='object')return;
    if(typeof value.path==='string'&&Number.isInteger(value.bytes)&&typeof value.sha256==='string'){
      const old=resources.get(value.path);if(old){assert.equal(old.bytes,value.bytes);assert.equal(old.sha256,value.sha256);}
      resources.set(value.path,value);
    }
    else for(const child of Object.values(value))visit(child);
  }
  visit(manifest);assert.equal(resources.size,17);let total=0;
  for(const resource of resources.values()){
    const path=new URL(resource.path,root);assert.ok(path.href.startsWith(root.href));
    const data=await readFile(path);assert.equal(data.length,resource.bytes,resource.path);assert.equal(hash(data),resource.sha256,resource.path);total+=data.length;
  }
  assert.equal(total,manifest.delivery.filesBytes);
  assert.equal(manifest.provenance.thirdPartyLicenses[0].expression,'MIT');
  assert.ok(manifest.families.every(family=>family.license.expression==='NOASSERTION'));
});
test('normal bundle loader parses both actual GLB pairs with matching offline foliage data',async()=>{
  const remote=new URL('https://atlas.invalid/assets/forest/desktop-v1/');
  const source=new ForestAssetSource(new URL('forest-bundle-manifest.json',remote),async(url,options)=>{
    assert.equal(options.redirect,'error');assert.ok(String(url).startsWith(remote.href));
    return new Response(await readFile(new URL(String(url).slice(remote.href.length),root)));
  });
  const bundle=await source.load();assert.equal(bundle.bytes,25858788);
  for(const input of bundle.inputs){
    const pair=prepareTreeLODPair(input.lod0,input.lod1);
    const decoded=await decodeTreeFoliageSidecar(input.foliageMipSidecar,pair.foliagePng,.5);
    assert.equal(decoded.maxLevel,7);assert.equal(decoded.payloadBytes,5592064);
  }
  source.clear();assert.equal(source.diagnostics().retainedBytes,0);
});
