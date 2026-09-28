import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {buildDrainage} from '../src/drainage.ts';
import {buildRiverRegion} from '../src/river-generation.ts';

async function rendererModule(){
  const directory=await mkdtemp(join(tmpdir(),'atlas-water-refresh-')),output=join(directory,'renderer.mjs');
  await build({bundle:true,platform:'node',format:'esm',outfile:output,logLevel:'silent',stdin:{resolveDir:fileURLToPath(new URL('..',import.meta.url)),sourcefile:'terrain-water-refresh-entry.mjs',contents:`
    import * as THREE from 'three';
    import {buildTile} from './src/planet-tiles.ts';
    import {PlanetRenderer} from './src/planet-renderer.ts';
    import {primeCanonicalHydrologySync} from './src/hydrology-registry.ts';
    export {THREE,buildTile,PlanetRenderer,primeCanonicalHydrologySync};
  `}});
  return {module:await import(pathToFileURL(output).href),directory};
}

test('stationary retained nonroot terrain leaf refreshes its water bucket while the old tile stays visible',async()=>{
  const {module,directory}=await rendererModule(),{THREE,buildTile,PlanetRenderer,primeCanonicalHydrologySync}=module;
  const maithea=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];
  const catchment=buildDrainage(maithea).catchments.find(value=>value.outlet===3386);
  assert.ok(catchment);
  const body={...maithea,hydrology:buildRiverRegion(maithea,catchment)};
  primeCanonicalHydrologySync(body);
  const host=new THREE.Mesh(new THREE.SphereGeometry(1,8,8),new THREE.MeshBasicMaterial());
  const held=[];
  const SavedWorker=globalThis.Worker;
  class ControlledWorker {
    onmessage=null; onerror=null;
    postMessage(data){
      const job={data,worker:this};
      if(data.waterBucket===-179&&held.targetKey===data.key){held.push(job);return;}
      queueMicrotask(()=>respond(job));
    }
    terminate(){}
  }
  function respond(job){
    const {data,worker}=job;
    try{worker.onmessage?.({data:{key:data.key,result:buildTile(data.body,data.tile,data.relief,data.waterLevelM??0),waterBucket:data.waterBucket}});}
    catch(error){worker.onmessage?.({data:{key:data.key,error:String(error),waterBucket:data.waterBucket}});}
  }
  globalThis.Worker=ControlledWorker;
  // PlanetRenderer acquires browser PNG textures in its constructor. This CPU
  // tile-refresh fixture never renders them, so return tiny uploadable textures
  // instead of allowing Three.ImageLoader to reference `document` in Node.
  const nativeTextureLoad=THREE.TextureLoader.prototype.load;
  THREE.TextureLoader.prototype.load=function(_url,onLoad){
    const texture=new THREE.DataTexture(new Uint8Array([128,128,128,255]),1,1,THREE.RGBAFormat);
    texture.needsUpdate=true;onLoad?.(texture);return texture;
  };
  let renderer;
  try{renderer=new PlanetRenderer(body,host,maithea.radiusM,1,1);}
  finally{THREE.TextureLoader.prototype.load=nativeTextureLoad;}
  const eye=[1.01,0,0],sun=[1,0,0],frame=async water=>{renderer.update(eye,1080,65,1/60,false,sun,[],undefined,null,water);await new Promise(resolve=>setImmediate(resolve));};
  try{
    let diagnostics;
    for(let i=0;i<900;i++){
      await frame(-4500);
      diagnostics=renderer.diagnostics();
      if(diagnostics.pending===0&&diagnostics.maxLevel>0&&diagnostics.visible>0)break;
    }
    assert.ok(diagnostics.maxLevel>0,'fixture must retain at least one refined nonroot leaf');
    const leafKey=diagnostics.debug.activeTileIds.find(key=>Number(key.split('/')[1])>0);
    assert.ok(leafKey,'fixture has a nonroot visible leaf');
    const leaf=renderer.patches.get(leafKey);
    assert.ok(leaf,'selected leaf is resident');
    assert.equal(leaf.waterBucket,-180,'initial tile was built at -4500 m');
    assert.ok(leaf.mesh.visible,'initial leaf is visible');

    held.targetKey=leafKey;
    let queued=false;
    for(let i=0;i<120;i++){
      await frame(-4475);
      diagnostics=renderer.diagnostics();
      if(held.length){queued=true;break;}
    }
    assert.ok(queued,`water change must request retained leaf ${leafKey}; diagnostics=${JSON.stringify({pending:diagnostics.pending,staleWaterPatches:diagnostics.staleWaterPatches,active:diagnostics.debug.activeTileIds})}`);
    assert.equal(held[0].data.waterLevelM,-4475,'replacement job carries the new water level, not only a new bucket stamp');
    assert.equal(renderer.patches.get(leafKey)?.waterBucket,-180,'old resident tile remains installed until replacement completes');
    assert.ok(renderer.patches.get(leafKey)?.mesh.visible,'old tile remains visible while its replacement is pending');

    for(const job of held.splice(0))respond(job);
    for(let i=0;i<600&&renderer.diagnostics().staleWaterPatches>0;i++)await frame(-4475);
    assert.equal(renderer.patches.get(leafKey)?.waterBucket,-179,'replacement echoes and installs the requested water bucket');
    assert.equal(renderer.diagnostics().staleWaterPatches,0,'all visible retained leaves are fresh after their responses drain');
  } finally {
    renderer?.dispose();host.geometry.dispose();host.material.dispose();globalThis.Worker=SavedWorker;
    const target=resolve(directory);
    assert.equal(dirname(target),resolve(tmpdir()));
    assert.ok(basename(target).startsWith('atlas-water-refresh-'));
    await rm(target,{recursive:true,force:true});
  }
});
