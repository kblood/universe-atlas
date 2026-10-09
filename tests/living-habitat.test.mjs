import {test} from 'node:test';
import assert from 'node:assert/strict';
import {findLivingHabitat, livingHabitatAt} from '../src/living-habitat.ts';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {parseAddress} from '../src/address.ts';
import {starLifecycle} from '../src/stellar-evolution.ts';
import {biosphereStateAt} from '../src/world-surface.ts';
import {CATALOGUE_EPOCH_NS} from '../src/world-time.ts';
import {CURRENT_VERSIONS} from '../src/time-nav.ts';
import {terrainSampler} from '../src/terrain.ts';
import {biomeClassifier} from '../src/surface-biomes.ts';
import {landingCandidate} from '../src/landing-site.ts';
import {surfaceCellAt} from '../src/surface-cell.ts';
import {faunaHerdAt,toSeconds} from '../src/fauna-runtime.ts';
const seed='LETHRA-001',galaxy=galaxies(seed)[0];
const ids=['G001/C2456,274,-369/0/planet/1','G001/C-715,-331,-495/0/planet/1',
 'G001/C2599,-842,-4183/0/planet/1','G001/C-1040,466,-1331/0/planet/0','G001/C4437,-2411,567/0/planet/1'];
function fixture(id) {
 const systemId=id.split('/planet/')[0],ref=refByAddress(galaxy,systemId),sys=system(ref),body=sys.planets.find(b=>b.id===id);
 const address=parseAddress(ref.id),star=starLifecycle(seed,{...address,slot:'star/0'},sys.stars[0]);
 const life=biosphereStateAt(seed,body.id,body,CATALOGUE_EPOCH_NS,'baseline',CURRENT_VERSIONS,star);
 const faunaGate={stage:'complex',species:life.species.filter(s=>s.creature).map(s=>({id:s.id,creature:s.creature}))};
 const kinds=[...new Set(life.species.filter(s=>s.kind!=='animal').map(s=>s.kind))];
 const floraGate={stage:'complex',availableKinds:[...kinds,'flower']};
 return {body,faunaGate,floraGate,sample:terrainSampler(body),classify:biomeClassifier(body),seaLevelM:0,ceilingM:Infinity,summitM:Infinity};
}
test('two-axis slope matches runtime instead of assuming flat terrain',()=>{
 const radius=6e6,t=Math.tan(35*Math.PI/180),sample=d=>({groundHeightM:500+d[1]*radius*t});
 const classify=(d,h,upDot)=>({weights:[0,1,0,0],forestPotential:false,moisture:.8,ocean:false,slopeDeg:Math.acos(upDot)*180/Math.PI});
 const result=livingHabitatAt([1,0,0],radius,sample,classify);
 assert.ok(Math.abs(result.biome.slopeDeg-35)<1e-7);
});
test('first five actual finder worlds have deterministic confirmed herds and visible-range shrubs',t=>{
 for(const id of ids){
  const f=fixture(id),coarse=terrainSampler(f.body,undefined,undefined,false,0,undefined,false,{lodLevel:0});
  const candidates=[];
  for(let i=0;i<1024;i++){
   const direction=landingCandidate(i,1024),s=coarse(direction);if(s.wet||s.ocean)continue;
   const b=f.classify(direction,s.groundHeightM,1);
   if(b.weights[1]<.35||b.moisture<.2)continue;
   candidates.push({direction,score:b.weights[1]*3+b.moisture+(b.forestPotential?.5:0)});
  }
  const started=performance.now(),site=findLivingHabitat({...f,candidates});
  const elapsedMs=performance.now()-started;
  t.diagnostic(JSON.stringify({id,elapsedMs,site}));
  assert.ok(site,id);assert.ok(site.animalCount>0&&site.shrubCount>0&&site.floraCount>0,id);
  assert.ok(site.checkedCandidates<=12&&site.checkedCells<=12*200);
  assert.ok(site.slopeDeg<26);assert.ok(site.heightM>=0);
  assert.equal(surfaceCellAt(site.direction,f.body.radiusM,32).id,site.herdId);
  const b=livingHabitatAt(site.direction,f.body.radiusM,f.sample,f.classify).biome;
  const herd=faunaHerdAt(f.body.seed,f.body.id,site.direction,b,f.faunaGate,toSeconds(0),site.herdId);
  assert.equal(herd.members.length,site.animalCount);
  assert.deepEqual(findLivingHabitat({...f,candidates}),site);
 }
});
test('steep or empty dated populations never fall back to an unchecked site; work is bounded',()=>{
 const f=fixture(ids[0]),candidates=Array.from({length:100},(_,i)=>({direction:landingCandidate(i,100),score:100-i}));
 const surface={groundHeightM:500},sample=()=>surface;
 const steep=()=>({weights:[0,1,0,0],forestPotential:false,moisture:1,ocean:false,slopeDeg:40});
 let queries=0;
 assert.equal(findLivingHabitat({...f,candidates,sample:d=>{queries++;return sample(d);},classify:steep,maxCandidates:2,maxCells:7}),null);
 assert.ok(queries<=2*7*5);
 assert.equal(findLivingHabitat({...f,candidates,faunaGate:{stage:'complex',species:[]}}),null);
 assert.equal(findLivingHabitat({...f,candidates,floraGate:{stage:'complex',availableKinds:['tree']}}),null);
 assert.equal(findLivingHabitat({...f,candidates,floraGate:{stage:'sterile',availableKinds:[]}}),null);
 assert.throws(()=>findLivingHabitat({...f,candidates,maxCells:201}),/bounds/);
});
