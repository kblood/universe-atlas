// Shared Node fixture for PlanetRenderer terrain streaming tests (not a test
// file itself). Bundles the renderer with esbuild, replaces the tile Worker
// with a synchronous in-process builder, and memoizes buildTile per
// (tile, water level) so repeated fixtures do not rebuild identical tiles.
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {galaxies,refByAddress,system} from '../src/catalog.ts';

const root=fileURLToPath(new URL('..',import.meta.url));
const tileCache=globalThis.__atlasTileFixtureCache??=new Map();

/** Bundle PlanetRenderer. `rendererSource`, when given, replaces the contents
 * of src/planet-renderer.ts (a historical revision) while every other import
 * still resolves to the current tree. */
export async function rendererModule({prefix='atlas-terrain-fixture-',rendererSource=null}={}){
  const directory=await mkdtemp(join(tmpdir(),prefix)),output=join(directory,'renderer.mjs');
  const rendererPath=resolve(root,'src/planet-renderer.ts');
  const plugins=rendererSource===null?[]:[{name:'renderer-revision',setup(b){
    b.onLoad({filter:/planet-renderer\.ts$/},async args=>resolve(args.path)===rendererPath?{contents:rendererSource,loader:'ts',resolveDir:dirname(rendererPath)}:undefined);
  }}];
  await build({bundle:true,platform:'node',format:'esm',outfile:output,logLevel:'silent',plugins,stdin:{resolveDir:root,sourcefile:'terrain-fixture-entry.mjs',contents:`
    import * as THREE from 'three';
    import {buildTile,tileKey} from './src/planet-tiles.ts';
    import {PlanetRenderer} from './src/planet-renderer.ts';
    import {PENDING_TILE_BYTES,TERRAIN_BUDGET_BYTES} from './src/renderer-memory.ts';
    export {THREE,buildTile,tileKey,PlanetRenderer,PENDING_TILE_BYTES,TERRAIN_BUDGET_BYTES};
  `}});
  const module=await import(pathToFileURL(output).href);
  return {module,async cleanup(){
    const target=resolve(directory);
    if(dirname(target)!==resolve(tmpdir())||!basename(target).startsWith(prefix))throw new Error('refusing to remove '+target);
    await rm(target,{recursive:true,force:true});
  }};
}

export function maithea(){return system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];}

/** Constructs a renderer whose Worker is replaced by an in-process builder.
 * `hold(data)` may return true to defer a job; `release()` answers them. */
export function createRenderer(module,body,{hold=()=>false}={}){
  const {THREE,buildTile,PlanetRenderer}=module;
  const held=[],jobs=[];
  const respond=({data,worker})=>{
    const cacheKey=`${body.id}|${data.key}|${data.relief}|${data.waterLevelM??0}`;
    let result=tileCache.get(cacheKey);
    if(!result){result=buildTile(data.body,data.tile,data.relief,data.waterLevelM??0);tileCache.set(cacheKey,result);}
    worker.onmessage?.({data:{key:data.key,result,waterBucket:data.waterBucket}});
  };
  class InlineWorker{
    onmessage=null;onerror=null;
    postMessage(data){const job={data,worker:this};jobs.push(data);if(hold(data)){held.push(job);return;}queueMicrotask(()=>respond(job));}
    terminate(){}
  }
  const SavedWorker=globalThis.Worker;globalThis.Worker=InlineWorker;
  const nativeTextureLoad=THREE.TextureLoader.prototype.load;
  THREE.TextureLoader.prototype.load=function(_url,onLoad){
    const texture=new THREE.DataTexture(new Uint8Array([128,128,128,255]),1,1,THREE.RGBAFormat);
    texture.needsUpdate=true;onLoad?.(texture);return texture;
  };
  const host=new THREE.Mesh(new THREE.SphereGeometry(1,8,8),new THREE.MeshBasicMaterial());
  let renderer;
  try{renderer=new PlanetRenderer(body,host,body.radiusM,1,1);}
  finally{THREE.TextureLoader.prototype.load=nativeTextureLoad;}
  return {renderer,host,jobs,held,
    releaseHeld(){for(const job of held.splice(0))respond(job);},
    dispose(){renderer.dispose();host.geometry.dispose();host.material.dispose();globalThis.Worker=SavedWorker;}};
}

export const nextTurn=()=>new Promise(resolve=>setImmediate(resolve));
export async function readSource(path){return readFile(resolve(root,path),'utf8');}
