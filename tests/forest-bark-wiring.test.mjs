import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {lifeRendererModule,createRenderer,body} from './life-scenario.mjs';
import {ForestAssetSource} from '../src/forest-asset-source.ts';
import {ForestAssetAttachment} from '../src/forest-asset-attachment.ts';
import {faunaPresentationOptions} from '../src/fauna-presentation-options.ts';

test('actual packaged source→attachment→PlanetRenderer→forest loader shares six maps before GPU upload',async()=>{
  // Only image decoding/statistics are a Node stand-in. GLB parsing, verified
  // packaged bytes, target construction, pool injection and leases are real.
  // Pixel/material equivalence remains the independent browser acceptance.
  const saved={self:globalThis.self,createImageBitmap:globalThis.createImageBitmap,ImageBitmap:globalThis.ImageBitmap,ImageData:globalThis.ImageData,OffscreenCanvas:globalThis.OffscreenCanvas};
  class Bitmap{constructor(width,height){this.width=width;this.height=height;this.closed=false;}close(){this.closed=true;}}
  globalThis.self=globalThis;globalThis.ImageBitmap=Bitmap;
  globalThis.ImageData=class{constructor(data,width,height){this.data=data;this.width=width;this.height=height;}};
  globalThis.createImageBitmap=async input=>{if(input instanceof globalThis.ImageData)return new Bitmap(input.width,input.height);const bytes=new DataView(await input.arrayBuffer());return new Bitmap(bytes.getUint32(16),bytes.getUint32(20));};
  globalThis.OffscreenCanvas=class{constructor(w,h){this.width=w;this.height=h;}getContext(){let image;return {drawImage(value){image=value;},getImageData(){return {data:new Uint8ClampedArray(image.width*image.height*4).fill(255)};}};}};
  const fixture=await lifeRendererModule({prefix:'forest-bark-wiring-'}),target=createRenderer(fixture.module,body,{rendererOptions:{forestBarkSharing:faunaPresentationOptions('').forestBarkSharing}});
  const directory=new URL('../public/assets/forest/desktop-v1/',import.meta.url),base=new URL('https://fixture.invalid/forest/');
  const source=new ForestAssetSource(new URL('forest-bundle-manifest.json',base),async url=>{
    const name=new URL(url).pathname.slice(base.pathname.length),bytes=readFileSync(new URL(name,directory));return new Response(bytes,{status:200,headers:{'content-length':String(bytes.byteLength)}});
  });
  let done,fail;const finished=new Promise((resolve,reject)=>{done=resolve;fail=reject;}),attachment=new ForestAssetAttachment(source,()=>{const d=attachment.diagnostics();if(d.ready)done();else if(d.error)fail(new Error(d.error));});
  let timeout;try{
    attachment.update(target.renderer,true);await Promise.race([finished,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error(JSON.stringify({source:source.diagnostics(),attachment:attachment.diagnostics()}))),10000);})]);
    const forest=target.renderer.forest,d=forest.diagnostics(),textures=new Set([...forest.assets.entries.values()].flatMap(entry=>[...entry.family.textures]));
    assert.equal(d.barkTextures.entries,2);assert.equal(d.barkTextures.leases,4);assert.equal(d.barkTextures.duplicatesDisposed,2);assert.equal(textures.size,6);
    const families=[...forest.assets.entries.values()].map(entry=>entry.family),a=families[0].lods[0][0].material,b=families[1].lods[0][0].material;
    assert.equal(a.map,b.map);assert.equal(a.normalMap,b.normalMap);assert.notEqual(a,b,'family materials remain independently owned');
    assert.ok([...textures].every(texture=>texture.image&&!texture.image.closed));assert.equal(d.memoryAccounting.familyTextureCount,6);
    attachment.dispose();assert.equal(forest.diagnostics().barkTextures.entries,0);assert.equal(forest.diagnostics().barkTextures.leases,0);
  }finally{clearTimeout(timeout);attachment.dispose();target.dispose();await fixture.cleanup();for(const [key,value] of Object.entries(saved)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
