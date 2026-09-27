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
  const directory=await mkdtemp(join(tmpdir(),'atlas-streaming-')),output=join(directory,'renderer.mjs');
  await build({bundle:true,platform:'node',format:'esm',outfile:output,logLevel:'silent',stdin:{resolveDir:fileURLToPath(new URL('..',import.meta.url)),sourcefile:'terrain-streaming-entry.mjs',contents:`
    import * as THREE from 'three';
    import {buildTile,tileNeighbour} from './src/planet-tiles.ts';
    import {PlanetRenderer} from './src/planet-renderer.ts';
    import {surfaceQuery} from './src/world-surface.ts';
    import {primeCanonicalHydrologySync} from './src/hydrology-registry.ts';
    export {THREE,buildTile,tileNeighbour,PlanetRenderer,surfaceQuery,primeCanonicalHydrologySync};
  `}});
  return {module:await import(pathToFileURL(output).href),directory};
}

async function removeReviewDirectory(directory){
  const target=resolve(directory);
  assert.equal(dirname(target),resolve(tmpdir()),'cleanup stays in the temporary directory');
  assert.ok(basename(target).startsWith('atlas-streaming-'),'cleanup targets this test only');
  await rm(target,{recursive:true,force:true});
}

for(const cloudMiB of [0,21,96,160])test(`hydrology keeps 2:1 contact support with ${cloudMiB||'actual'} MiB cloud allocation`,async()=>{
  const {module,directory}=await rendererModule(),{THREE,buildTile,tileNeighbour,PlanetRenderer,surfaceQuery,primeCanonicalHydrologySync}=module;
  const maithea=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1],catchment=buildDrainage(maithea).catchments.find(value=>value.outlet===3386);
  assert.ok(catchment);const regional=buildRiverRegion(maithea,catchment),body={...maithea,hydrology:regional};
  primeCanonicalHydrologySync(body);
  const site=regional.sites.find(s=>s.kind==='river-bank');
  // Move four metres toward the channel from the current authored dry bank.
  const d=new THREE.Vector3(...site.direction),toward=new THREE.Vector3(...site.lookDirection).sub(d).normalize();
  const direction=d.addScaledVector(toward,4/body.radiusM).normalize().toArray(),surface=surfaceQuery(body)(direction),radius=body.radiusM;
  assert.equal(surface.wet,false,'fine contact fixture stays on the dry bank');
  const contact=new THREE.Vector3(...direction).multiplyScalar(radius+surface.groundHeightM+.92),eye=new THREE.Vector3(...direction).multiplyScalar(radius+surface.groundHeightM+12).divideScalar(radius),host=new THREE.Mesh(new THREE.SphereGeometry(1,8,8),new THREE.MeshBasicMaterial());
  const SavedWorker=globalThis.Worker;
  class InlineWorker { onmessage=null; onerror=null; postMessage(data){queueMicrotask(()=>{try{this.onmessage?.({data:{key:data.key,result:buildTile(data.body,data.tile,data.relief)}});}catch(error){this.onmessage?.({data:{key:data.key,error:String(error)}});}});} terminate(){} }
  globalThis.Worker=InlineWorker;
  const renderer=new PlanetRenderer(body,host,radius,1,1);renderer.setContactFocus(contact.toArray());
  if(cloudMiB){
    assert.ok(renderer.clouds,'the fixture includes atmospheric clouds');
    Object.defineProperty(renderer.clouds,'allocatedBytes',{get:()=>cloudMiB*1024*1024});
  }
  try{
    let patches=null;let frames=0;const updateTimes=[];
    for(let frame=0;frame<600&&!patches;frame++){frames=frame+1;
      renderer.update(eye.toArray(),1080,65,1/60,false,[1,0,0],[]);
      updateTimes.push(renderer.diagnostics().updateMs);
      await new Promise(resolve=>setImmediate(resolve));
      patches=renderer.contactPatches(contact.toArray(),contact.toArray());
    }
    const settled=renderer.diagnostics();
    const sorted=updateTimes.slice().sort((a,b)=>a-b);
    console.log(JSON.stringify({cloudMiB,frames,contactReady:!!patches?.length,resident:settled.resident,visible:settled.visible,
      maxLevel:settled.maxLevel,combinedMiB:settled.reservedCombinedBytes/1024**2,budgetMiB:settled.budgetBytes/1024**2,
      updateP95Ms:sorted[Math.floor(sorted.length*.95)],updateMaxMs:Math.max(...updateTimes)}));
    assert.ok(patches&&patches.length>0,'fine capsule support settles');
    assert.equal(settled.contactLevel,22);assert.equal(settled.baseContactLevel,18);
    assert.equal(settled.minimumWaterLevel,10,'coarse wet-bed envelope has a bounded target');
    assert.equal(settled.waterRegionActive,true,'near-bank water region is large enough to schedule');
    for(let frame=0;frame<90;frame++){renderer.update(eye.toArray(),1080,65,1/60,false,[1,0,0],[]);await new Promise(resolve=>setImmediate(resolve));assert.ok(renderer.contactPatches(contact.toArray(),contact.toArray()),'settled contact support remains valid');}
    const diagnostics=renderer.diagnostics(),leaves=new Map(diagnostics.debug.activeTileIds.map(key=>[key,key.split('/').map(Number)]));
    for(const [key,[face,level,x,y]] of leaves)for(let edge=0;edge<4;edge++){
      let neighbour=tileNeighbour({face,level,x,y},edge),other=leaves.get(`${neighbour.face}/${neighbour.level}/${neighbour.x}/${neighbour.y}`);
      while(!other&&neighbour.level>0){neighbour={face:neighbour.face,level:neighbour.level-1,x:Math.floor(neighbour.x/2),y:Math.floor(neighbour.y/2)};other=leaves.get(`${neighbour.face}/${neighbour.level}/${neighbour.x}/${neighbour.y}`);}
      if(other)assert.ok(level-neighbour.level<=1,`active 2:1 closure at ${key} edge ${edge}`);
    }
    assert.ok(diagnostics.underresolvedWaterTiles<=settled.underresolvedWaterTiles,'best-effort water floor does not regress after contact settles');
    assert.ok(diagnostics.visible<=450,'walking leaf cap remains fixed');
    assert.equal(diagnostics.coreBudgetBytes,256*1024*1024);
    assert.equal(diagnostics.budgetBytes,(256+160)*1024*1024,'desktop clouds have their own bounded headroom');
    assert.ok(diagnostics.reservedCombinedBytes<=diagnostics.budgetBytes,'fine support stays inside the combined reserve');
  } finally {renderer.dispose();host.geometry.dispose();host.material.dispose();globalThis.Worker=SavedWorker;await removeReviewDirectory(directory);}
});
