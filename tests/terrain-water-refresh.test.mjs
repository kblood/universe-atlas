// A stationary retained nonroot leaf rebuilds for a new water bucket while its old tile stays installed and visible.
// O12 (docs/fable-test-review-2026-10-07.md, docs/test-tidy-d-2026-10-07.md):
// - the renderer comes from the shared fixture (tests/terrain-renderer-fixture.mjs: one esbuild bundle, the in-process
//   tile builder and its per-process tile cache) instead of a private bundle and Worker stub;
// - the hydrology build (drainage, the outlet-3386 region and the canonical set) is cached per process;
// - the water levels are the relief round's P6 lowered-sea pair (tests/helpers/harness-water.mjs, lost-volume fraction
//   0.6 resolved through levelForLoss; Maithea -2425 / -2400 m), replacing the pre-P6 metre literals -4500 / -4475.
// Inland rivers are withdrawn (src/inland-rivers.ts), so the attached hydrology is inert in tiles and the renderer; the
// body still carries it, as before, so the scenario is the one this test always ran.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rendererModule,maithea,createRenderer,nextTurn} from './terrain-renderer-fixture.mjs';
import {loweredSeaLevels,WATER_BUCKET_M} from './helpers/harness-water.mjs';
import {buildDrainage} from '../src/drainage.ts';
import {buildRiverRegion} from '../src/river-generation.ts';
import {buildCanonicalHydrology} from '../src/hydrology-registry.ts';

const OUTLET=3386;
const hydrologyCache=globalThis.__atlasWaterRefreshHydrology??=new Map();
/** Maithea with the outlet-3386 river region as body.hydrology and the canonical set as body.canonicalRivers (the
 * id-sorted regions primeCanonicalHydrologySync's settle() attaches), built once per process. */
function hydrologyBody(){
  const base=maithea();
  let h=hydrologyCache.get(base.id);
  if(!h){
    const catchment=buildDrainage(base).catchments.find(value=>value.outlet===OUTLET);
    assert.ok(catchment,`Maithea has a catchment with outlet ${OUTLET}`);
    const canonical=buildCanonicalHydrology(base).regions;
    h={hydrology:buildRiverRegion(base,catchment),canonicalRivers:[...canonical].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)};
    hydrologyCache.set(base.id,h);
  }
  return {...base,hydrology:h.hydrology,canonicalRivers:h.canonicalRivers};
}

test('stationary retained nonroot terrain leaf refreshes its water bucket while the old tile stays visible',async()=>{
  const {module,cleanup}=await rendererModule({prefix:'atlas-water-refresh-'});
  const body=hydrologyBody(),{lowM,highM}=loweredSeaLevels(body);
  const LOW_BUCKET=lowM/WATER_BUCKET_M,HIGH_BUCKET=highM/WATER_BUCKET_M;
  let targetKey=null;
  const fx=createRenderer(module,body,{hold:data=>data.waterBucket===HIGH_BUCKET&&targetKey===data.key}),{renderer,held}=fx;
  const eye=[1.01,0,0],sun=[1,0,0],frame=async water=>{renderer.update(eye,1080,65,1/60,false,sun,[],undefined,null,water);await nextTurn();};
  try{
    let diagnostics;
    for(let i=0;i<900;i++){
      await frame(lowM);
      diagnostics=renderer.diagnostics();
      if(diagnostics.pending===0&&diagnostics.maxLevel>0&&diagnostics.visible>0)break;
    }
    assert.ok(diagnostics.maxLevel>0,'fixture must retain at least one refined nonroot leaf');
    const leafKey=diagnostics.debug.activeTileIds.find(key=>Number(key.split('/')[1])>0);
    assert.ok(leafKey,'fixture has a nonroot visible leaf');
    const leaf=renderer.patches.get(leafKey);
    assert.ok(leaf,'selected leaf is resident');
    assert.equal(leaf.waterBucket,LOW_BUCKET,`initial tile was built at ${lowM} m`);
    assert.ok(leaf.mesh.visible,'initial leaf is visible');

    targetKey=leafKey;
    let queued=false;
    for(let i=0;i<120;i++){
      await frame(highM);
      diagnostics=renderer.diagnostics();
      if(held.length){queued=true;break;}
    }
    assert.ok(queued,`water change must request retained leaf ${leafKey}; diagnostics=${JSON.stringify({pending:diagnostics.pending,staleWaterPatches:diagnostics.staleWaterPatches,active:diagnostics.debug.activeTileIds})}`);
    assert.equal(held[0].data.waterLevelM,highM,'replacement job carries the new water level, not only a new bucket stamp');
    assert.equal(renderer.patches.get(leafKey)?.waterBucket,LOW_BUCKET,'old resident tile remains installed until replacement completes');
    assert.ok(renderer.patches.get(leafKey)?.mesh.visible,'old tile remains visible while its replacement is pending');

    fx.releaseHeld();
    for(let i=0;i<600&&renderer.diagnostics().staleWaterPatches>0;i++)await frame(highM);
    assert.equal(renderer.patches.get(leafKey)?.waterBucket,HIGH_BUCKET,'replacement echoes and installs the requested water bucket');
    assert.equal(renderer.diagnostics().staleWaterPatches,0,'all visible retained leaves are fresh after their responses drain');
  } finally {
    fx.dispose();
    await cleanup();
  }
});
