import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {terrainSampler,planetSurface,TERRAIN_VERSION} from '../src/terrain.ts';
import {buildTile,directionTile} from '../src/planet-tiles.ts';
import {datedSurfaceSampler,surfaceQuery,SURFACE_VERSION} from '../src/world-surface.ts';
import {starLifecycle,planetLifecycle} from '../src/stellar-evolution.ts';
import {buildCanonicalHydrology,ensureCanonicalHydrology,hydrologyReady,hydrologyStatus,resetHydrologyRegistry} from '../src/hydrology-registry.ts';
import {riverDirection} from '../src/river-generation.ts';
import {
  inlandRiversEnabled,activeRiverRegions,activeRenderedRiverRegion,setArchivedInlandRiversForTesting,
  INLAND_RIVERS_UNAVAILABLE,INLAND_RIVERS_UNAVAILABLE_NOTICE,
} from '../src/inland-rivers.ts';
import {CURRENT_VERSIONS,encodeVersions,writeTimeToUrl,compatibilityNoticeFromUrl} from '../src/time-nav.ts';
import {CATALOGUE_EPOCH_NS} from '../src/world-time.ts';

const SEED='LETHRA-001';
const sys=system(refByAddress(galaxies(SEED)[0],'G001/C2128,0,1/0'));
const maithea=sys.planets[1];
const star=sys.stars.find(s=>s.id===maithea.parentId)||sys.stars[0];
const dummyAddress={clusterCell:[0n,0n,0n],groupCell:[0n,0n,0n],galaxyOrdinal:0,
  sectorCell:[0n,0n,0n],genCell:[0n,0n,0n],systemOrdinal:0,slot:'star/0'};
// The archived generator stays callable; production must ignore its output.
const {regions}=buildCanonicalHydrology(maithea);
const riverBody={...maithea,hydrology:regions[0],canonicalRivers:regions};
const riverDirections=regions.flatMap(region=>[
  ...region.channels.flatMap(channel=>channel.points.map(p=>riverDirection(region,p.x,p.z))),
  ...region.lakes.map(lake=>riverDirection(region,lake.x,lake.z)),
]);
const DRY_FIELDS={wet:false,waterKind:null,channelId:null,bank:0,influence:0,waterHeightM:null,waterDepthM:0};

test('inland rivers are withdrawn by default and the fixture really contains archived river water',()=>{
  assert.equal(inlandRiversEnabled(),false);
  assert.deepEqual(activeRiverRegions(riverBody),[]);
  assert.strictEqual(activeRiverRegions(riverBody),activeRiverRegions(maithea),'disabled lookups reuse a shared immutable empty list');
  assert.equal(Object.isFrozen(activeRiverRegions(riverBody)),true);
  assert.equal(activeRenderedRiverRegion(riverBody),null);
  assert.ok(regions.length>0&&regions.some(r=>r.lakes.length>0),'fixture has canonical rivers and a coupled regional lake');
  // Explicit regions exercise the archived algorithm only; this proves the
  // directions below are genuinely on river/lake water, so the production
  // checks that follow are not vacuous.
  const archived=terrainSampler(maithea,regions);
  const inland=riverDirections.map(d=>archived(d)).filter(s=>!s.ocean&&s.wet);
  assert.ok(inland.some(s=>s.waterKind==='river'),'archived sampler carves river water');
  assert.ok(inland.some(s=>s.waterKind==='lake'),'archived sampler carves regional lake water');
});

test('production terrain samples ignore attached hydrology and canonical rivers: no carve, wetness or bank',()=>{
  const production=terrainSampler(riverBody),plain=terrainSampler(maithea);
  let dry=0;
  for(const d of riverDirections){
    const s=production(d);
    assert.deepEqual(s,plain(d),'attached rivers must not change any surface field');
    if(s.ocean)continue;
    dry++;
    for(const [key,value] of Object.entries(DRY_FIELDS))assert.equal(s[key],value,key);
    assert.equal(s.groundHeightM,s.elevationM);
  }
  assert.ok(dry>0,'river fixture includes inland land samples');
  // The orbit preview (worker 'surface' job) reads the same default sampler.
  const a=planetSurface(riverBody,64,16),b=planetSurface(maithea,64,16);
  assert.deepEqual(a.elevations,b.elevations);assert.deepEqual(a.data,b.data);
  assert.equal(a.version,TERRAIN_VERSION);
});

test('terrain tiles have no conservative river bed or bank palette while a region is attached',t=>{
  const lake=regions.find(r=>r.lakes.length),body={...maithea,hydrology:lake,canonicalRivers:regions};
  const tile=directionTile(riverDirection(lake,lake.lakes[0].x,lake.lakes[0].z),10);
  const production=buildTile(body,tile),plain=buildTile(maithea,tile);
  for(const key of ['positions','parents','surfaceHeight','normals','materials','color'])
    assert.deepEqual(production[key],plain[key],key);
  // Non-vacuous: the archived pipeline does reshape this same tile.
  setArchivedInlandRiversForTesting(true);t.after(()=>setArchivedInlandRiversForTesting(false));
  const archived=buildTile(body,tile);
  assert.notDeepEqual(archived.positions,plain.positions,'archived river bed carve reaches this tile');
});

test('dated ocean keeps its sampler: wet after formation, absent before, unaffected by attached rivers',()=>{
  const starLc=starLifecycle(SEED,dummyAddress,star),planetLc=planetLifecycle(SEED,dummyAddress,maithea,starLc);
  assert.ok(planetLc.oceanNs!==null&&planetLc.oceanNs<CATALOGUE_EPOCH_NS);
  const plain=terrainSampler(maithea);
  const DIRECTIONS=[[1,0,0],[0,0,1],[-1,0,0],[0,0,-1],[.6,.2,.77],[-.4,-.3,.87],[.3,-.5,-.81],[-.7,.1,-.7]].map(v=>{const n=Math.hypot(...v);return v.map(x=>x/n);});
  const oceanDirection=DIRECTIONS.find(d=>plain(d).elevationM<-1500);
  assert.ok(oceanDirection,'fixture has a deep ocean direction');
  const now=datedSurfaceSampler(riverBody,planetLc,starLc,CATALOGUE_EPOCH_NS);
  const sample=now.sample(oceanDirection);
  assert.equal(now.ocean.globalOceanAvailable,true);
  assert.equal(sample.ocean,true);assert.equal(sample.wet,true);assert.equal(sample.walkable,false);
  assert.equal(sample.waterHeightM,now.ocean.waterLevelM);
  assert.ok(sample.waterDepthM>0);
  assert.equal(sample.version,SURFACE_VERSION);
  assert.equal(sample.regionalGeologyVersion,null);assert.equal(sample.regionalSurfaceVersion,null);
  assert.deepEqual(sample,datedSurfaceSampler(maithea,planetLc,starLc,CATALOGUE_EPOCH_NS).sample(oceanDirection));
  const before=datedSurfaceSampler(riverBody,planetLc,starLc,planetLc.oceanNs-1n);
  assert.equal(before.ocean.globalOceanAvailable,false);
  const early=before.sample(oceanDirection);
  if(early)assert.equal(early.wet,false,'no ocean (and no inland water) before the dated ocean forms');
  // Dry river-corridor ground is ordinary walkable land.
  const query=surfaceQuery(riverBody,[{dateNs:0n,levelM:now.ocean.waterLevelM}]);
  const land=riverDirections.map(d=>query(d)).filter(s=>!s.ocean);
  assert.ok(land.length>0);
  for(const s of land){assert.equal(s.wet,false);assert.equal(s.walkable,true);assert.equal(s.waterKind,null);}
});

test('focusing a water world never starts the hydrology worker and readiness never gates contact',async()=>{
  const SavedWorker=globalThis.Worker;let constructed=0;
  globalThis.Worker=class{constructor(){constructed++;}postMessage(){}terminate(){}};
  try{
    resetHydrologyRegistry();
    const body={...maithea};
    await ensureCanonicalHydrology(body);
    assert.equal(constructed,0,'no river worker is constructed');
    assert.equal(hydrologyStatus(body.id),'idle');
    assert.equal(body.canonicalRivers,undefined,'no canonical rivers are attached');
    assert.equal(hydrologyReady(body),true,'an unbuilt registry never blocks contact');
  }finally{globalThis.Worker=SavedWorker;resetHydrologyRegistry();}
});

async function rendererModule(){
  const directory=await mkdtemp(join(tmpdir(),'atlas-inland-rivers-')),output=join(directory,'renderer.mjs');
  await build({bundle:true,platform:'node',format:'esm',outfile:output,logLevel:'silent',stdin:{resolveDir:fileURLToPath(new URL('..',import.meta.url)),sourcefile:'inland-rivers-entry.mjs',contents:`
    import * as THREE from 'three';
    import {buildTile} from './src/planet-tiles.ts';
    import {terrainSampler} from './src/terrain.ts';
    import {PlanetRenderer} from './src/planet-renderer.ts';
    export {THREE,buildTile,terrainSampler,PlanetRenderer};
  `}});
  return {module:await import(pathToFileURL(output).href),directory};
}

test('renderer: stale river attachments add no river water/reflection and dry-ground contact refines without hydrology',async()=>{
  const {module,directory}=await rendererModule(),{THREE,buildTile,terrainSampler:sampler,PlanetRenderer}=module;
  // A 1000 km synthetic water world keeps contact streaming cheap (a much
  // smaller body cannot fit the 28 m contact ring at the L14 floor). The river
  // region attached to it would previously have required a hydrology build
  // (never started here) and a sub-metre fine-contact level.
  const radiusM=1e6;
  const lake=regions.find(r=>r.lakes.length);
  const base={id:'inland-river-test',name:'Test',seed:'inland-rivers-disabled',kind:'planet',type:'Terrestrial world',parentId:'star',massKg:1e20,radiusM,temperatureK:288,color:'#3985ae',orbit:null,water:.6,rings:false};
  const region={...lake,bodyId:base.id,bodySeed:base.seed,radiusM};
  const body={...base,hydrology:region,canonicalRivers:[region]};
  const plain=sampler(base);
  let direction=null;
  for(let i=0;i<400&&!direction;i++){
    const a=i*2.399963,y=.6-(i/400)*1.2,r=Math.sqrt(1-y*y),d=[Math.cos(a)*r,y,Math.sin(a)*r];
    if(!plain(d).ocean&&plain(d).elevationM>2)direction=d;
  }
  assert.ok(direction,'synthetic world has dry land');
  const ground=plain(direction).groundHeightM,point=direction.map(v=>v*(radiusM+ground+.92));
  const host=new THREE.Mesh(new THREE.SphereGeometry(1,8,8),new THREE.MeshBasicMaterial());
  const SavedWorker=globalThis.Worker;
  globalThis.Worker=class{
    onmessage=null;onerror=null;
    postMessage(data){queueMicrotask(()=>{
      try{this.onmessage?.({data:{key:data.key,result:buildTile(data.body,data.tile,data.relief,data.waterLevelM??0),waterBucket:data.waterBucket}});}
      catch(error){this.onmessage?.({data:{key:data.key,error:String(error),waterBucket:data.waterBucket}});}
    });}
    terminate(){}
  };
  // The renderer leases browser image textures during construction. This CPU
  // test only checks dry-ground contact, so provide inert image elements and
  // leave the asynchronous texture loads pending instead of requiring DOM.
  const savedDocument=globalThis.document;
  globalThis.document={createElementNS:()=>({addEventListener(){},removeEventListener(){},set src(_value){}})};
  let renderer;
  try{renderer=new PlanetRenderer(body,host,radiusM,1,1);}
  finally{if(savedDocument===undefined)delete globalThis.document;else globalThis.document=savedDocument;}
  try{
    const diagnostics=renderer.diagnostics();
    assert.equal(diagnostics.river,null,'no river water mesh');
    assert.equal(diagnostics.reflection,null,'no regional lake reflection');
    assert.equal(diagnostics.environment,null,'no river bank environment');
    assert.equal(renderer.fineContactLevel,renderer.contactLevel,'no hydrology fine-contact level');
    assert.equal(renderer.minimumWaterLevel,null,'no regional water refinement floor');
    renderer.setContactFocus(point);
    const eye=direction.map(v=>v*(1+(ground+2)/radiusM));
    let patches=null;
    for(let i=0;i<3000&&!patches;i++){
      renderer.update(eye,1080,65,1/60,false,[1,0,0],[],undefined,null,0);
      await new Promise(resolve=>setImmediate(resolve));
      patches=renderer.contactPatches(point,point);
    }
    assert.ok(patches&&patches.length>0,'ordinary dry-ground contact terrain becomes available');
    assert.equal(renderer.diagnostics().contactLevel,renderer.contactLevel,'contact uses the ordinary level');
    renderer.selectionDirty=false;
    renderer.setContactFocus(point);
    assert.equal(renderer.selectionDirty,false,'repeating the selected contact point does not rebuild the frontier');
    const radial=new THREE.Vector3(...direction),tangent=new THREE.Vector3(0,1,0).cross(radial).normalize();
    const settled=.6,accumulated=1.2;
    renderer.setContactFocus(radial.clone().multiplyScalar(radiusM+ground+.92).addScaledVector(tangent,settled).toArray());
    assert.equal(renderer.selectionDirty,false,'sub-metre capsule settling stays below the focus deadband');
    renderer.setContactFocus(radial.clone().multiplyScalar(radiusM+ground+.92).addScaledVector(tangent,accumulated).toArray());
    assert.equal(renderer.selectionDirty,true,'small focus movements accumulate against the last selected point');
    renderer.selectionDirty=false;
    renderer.setContactFocus(null);
    assert.equal(renderer.selectionDirty,true,'nonnull-to-null focus transition invalidates the frontier');
    renderer.selectionDirty=false;
    renderer.setContactFocus(null);
    assert.equal(renderer.selectionDirty,false,'repeated null focus does not invalidate each flight frame');
    const movedDirection=radial.clone().addScaledVector(tangent,160/radiusM).normalize().toArray();
    const movedSurface=surfaceQuery(base)(movedDirection);
    assert.equal(movedSurface.ocean,false,'the moved focus remains on dry ground');
    assert.equal(movedSurface.walkable,true,'the moved focus is walkable');
    const movedPoint=movedDirection.map(v=>v*(radiusM+movedSurface.groundHeightM+.92));
    renderer.setContactFocus(movedPoint);
    assert.equal(renderer.selectionDirty,true,'a 160 m grounded retarget invalidates the selected terrain frontier');
    let movedPatches=null,retargetFrames=0;
    for(;retargetFrames<600&&!movedPatches;retargetFrames++){
      renderer.update(eye,1080,65,1/60,false,[1,0,0],[],undefined,null,0);
      await new Promise(resolve=>setImmediate(resolve));
      movedPatches=renderer.contactPatches(movedPoint,movedPoint);
    }
    const movedDiagnostics=renderer.diagnostics();
    assert.ok(movedPatches&&movedPatches.length>0,
      `ordinary moved contact settles within the bounded 600-frame window; ${JSON.stringify(movedDiagnostics.contactReadiness)}`);
    assert.equal(movedDiagnostics.contactReadiness?.reason,'ready');
  }finally{
    renderer.dispose();host.geometry.dispose();host.material.dispose();globalThis.Worker=SavedWorker;
    const target=resolve(directory);
    assert.equal(dirname(target),resolve(tmpdir()));
    assert.ok(basename(target).startsWith('atlas-inland-rivers-'));
    await rm(target,{recursive:true,force:true});
  }
});

test('model versions record the withdrawal and old bookmarks explain it',()=>{
  // Re-pinned for terrain-1.8.0-relief (P4-RELIEF, docs/terrain-relief-v1.md)
  // and atlas-surface-8-ocean-volume (P2-OCEAN-QUERY; re-pinned here by P6,
  // was atlas-surface-7-no-inland-rivers): version strings only; the river
  // withdrawal itself is unchanged and surface-8 keeps it.
  assert.equal(TERRAIN_VERSION,'terrain-1.8.0-relief');
  assert.equal(SURFACE_VERSION,'atlas-surface-8-ocean-volume');
  assert.equal(CURRENT_VERSIONS.terrain,TERRAIN_VERSION);
  assert.equal(CURRENT_VERSIONS.surface,SURFACE_VERSION);
  const current=new URLSearchParams({seed:SEED});writeTimeToUrl(current,CATALOGUE_EPOCH_NS);
  assert.equal(compatibilityNoticeFromUrl(current),null,'a current bookmark needs no notice');
  const old=new URLSearchParams(current);
  old.set('wv',encodeVersions({...CURRENT_VERSIONS,terrain:'terrain-1.5.0',surface:'atlas-surface-6-lifecycle-sampler'}));
  const notice=compatibilityNoticeFromUrl(old);
  assert.match(notice,/older surface, terrain model versions/);
  assert.ok(notice.includes(INLAND_RIVERS_UNAVAILABLE),'old surface/terrain bookmark explains the withdrawal');
  const preTerrain=new URLSearchParams(current);
  preTerrain.set('wv',encodeVersions({...CURRENT_VERSIONS,terrain:'terrain-1.5.0'}));
  assert.ok(compatibilityNoticeFromUrl(preTerrain).includes(INLAND_RIVERS_UNAVAILABLE),'a pre-1.6.0 terrain bookmark explains the withdrawal');
  // terrain-1.6.0 had already withdrawn rivers; its only difference is the 1.7.0 climate colour.
  const postWithdrawal=new URLSearchParams(current);
  postWithdrawal.set('wv',encodeVersions({...CURRENT_VERSIONS,terrain:'terrain-1.6.0'}));
  const postNotice=compatibilityNoticeFromUrl(postWithdrawal);
  assert.match(postNotice,/older terrain model versions/);
  assert.ok(!postNotice.includes(INLAND_RIVERS_UNAVAILABLE),'a terrain-1.6.0 bookmark never showed rivers');
  // A surface-7 bookmark (rivers already withdrawn) differs only by the
  // surface-8 ocean-volume bump: no river sentence (relief round P6).
  const surface7=new URLSearchParams(current);
  surface7.set('wv',encodeVersions({...CURRENT_VERSIONS,terrain:'terrain-1.7.0-climate-colour',surface:'atlas-surface-7-no-inland-rivers'}));
  const surface7Notice=compatibilityNoticeFromUrl(surface7);
  assert.match(surface7Notice,/older surface, terrain model versions/);
  assert.ok(!surface7Notice.includes(INLAND_RIVERS_UNAVAILABLE),'a surface-7 bookmark never showed rivers');
});

test('legacy ?river= URLs get a concise unavailable notice and open the ordinary body view',()=>{
  const current=new URLSearchParams({seed:SEED,g:'G001',system:'G001/C2128,0,1/0',body:maithea.id,river:'G001/C2128,0,1/0/planet/1/drainage-2/n64/outlet/16162'});
  writeTimeToUrl(current,CATALOGUE_EPOCH_NS);
  assert.equal(compatibilityNoticeFromUrl(current),INLAND_RIVERS_UNAVAILABLE_NOTICE);
  assert.match(INLAND_RIVERS_UNAVAILABLE_NOTICE,/Inland rivers and their regional lakes are currently unavailable\./);
  const old=new URLSearchParams(current);
  old.set('wv',encodeVersions({...CURRENT_VERSIONS,terrain:'terrain-1.5.0',surface:'atlas-surface-6-lifecycle-sampler'}));
  const oldNotice=compatibilityNoticeFromUrl(old);
  assert.ok(oldNotice.startsWith(INLAND_RIVERS_UNAVAILABLE_NOTICE),'river notice leads');
  assert.equal(oldNotice.split(INLAND_RIVERS_UNAVAILABLE).length,2,'the unavailable sentence is not repeated');
  const unversioned=new URLSearchParams({seed:SEED,river:'x'});
  assert.equal(compatibilityNoticeFromUrl(unversioned),INLAND_RIVERS_UNAVAILABLE_NOTICE);
  // main.ts is DOM-bound; guard its URL handling and generation paths statically.
  const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
  assert.doesNotMatch(main,/\.get\(['"]river['"]\)/,'boot never restores a river address');
  assert.doesNotMatch(main,/\.set\(['"]river['"]/,'persist never writes a river address');
  assert.match(main,/compatibilityNoticeFromUrl\(q\)/,'boot shows the compatibility notice');
  for(const forbidden of ['hydrology-registry','drainage-map','river-types','river-generation','ensureCanonicalHydrology','selectRiverDestination','DrainageMap','riverFlight','river-find','drainage-build'])
    assert.ok(!main.includes(forbidden),`main.ts no longer references ${forbidden}`);
});

test('only tests may re-enable the archived river pipeline',()=>{
  const src=new URL('../src/',import.meta.url);
  for(const name of readdirSync(src).filter(n=>n.endsWith('.ts'))){
    const text=readFileSync(new URL(name,src),'utf8');
    if(name!=='inland-rivers.ts')assert.ok(!text.includes('setArchivedInlandRiversForTesting'),`${name} must not enable archived rivers`);
    if(name!=='hydrology-registry.ts')assert.ok(!/ensureCanonicalHydrology\(/.test(text),`${name} must not start canonical hydrology`);
  }
});
