import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {buildQuadrupedBody} from '../src/fauna-body-plan.ts';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {parseAddress} from '../src/address.ts';
import {starLifecycle} from '../src/stellar-evolution.ts';
import {biosphereStateAt} from '../src/world-surface.ts';
import {CURRENT_VERSIONS} from '../src/time-nav.ts';
import {CATALOGUE_EPOCH_NS} from '../src/world-time.ts';

test('worker derives transferable LODs without detaching or changing the loaded source',async()=>{
  const seed='LETHRA-001',g=galaxies(seed)[0],ref=refByAddress(g,'G001/C2128,0,1/0'),sys=system(ref),body=sys.planets[1];
  const star=starLifecycle(seed,{...parseAddress(ref.id),slot:'star/0'},sys.stars[0]);
  const bio=biosphereStateAt(seed,body.id,body,CATALOGUE_EPOCH_NS,'baseline',CURRENT_VERSIONS,star);
  const source=buildQuadrupedBody(bio.species.find(s=>s.creature).creature);
  const before=source.positions.slice(),sourceBytes=source.positions.byteLength;
  const clonedSource=structuredClone(source);
  let received,transferCount=0;
  const previous=globalThis.self;
  const scope={postMessage(message,transfers=[]){
    assert.equal(new Set(transfers).size,transfers.length,'every buffer transferred once');
    transferCount=transfers.length;
    received=structuredClone(message,{transfer:transfers});
  }};
  const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
  try{
    globalThis.self=scope;
    await vite.ssrLoadModule('/src/worker.ts');
    scope.onmessage({data:{id:17,kind:'fauna-derived-lods',args:{source:clonedSource,options:{targets:[500]}}}});
    assert.equal(received.id,17);assert.equal(received.error,undefined);
    assert.ok(transferCount>0);assert.equal(received.result.source,undefined);
    const level=received.result.levels[0];
    assert.ok(level.withinBudget&&level.triangleCount<=500&&level.positions.byteLength>0);
    assert.equal(level.plan.bones.length,22);
    assert.equal(source.positions.byteLength,sourceBytes);
    assert.equal(clonedSource.positions.byteLength,sourceBytes,'worker input not included in result transfers');
    assert.deepEqual(source.positions,before);
    scope.onmessage({data:{id:18,kind:'fauna-derived-lods',args:{source:clonedSource,options:{targets:[0]}}}});
    assert.equal(received.id,18);assert.match(received.error,/target/i);
  }finally{
    await vite.close();
    if(previous===undefined)delete globalThis.self;else globalThis.self=previous;
  }
});
