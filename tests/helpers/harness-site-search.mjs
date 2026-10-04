// Deterministic search and robustness evaluation for the shared harness
// living site (tests/harness-sites.mjs). Not a test file; used by
// tests/harness-sites.test.mjs and by whoever has to move SITE_A after a
// terrain change. Reads the merged terrain/classifier at the harness date;
// never tunes either.
import {galaxies,refByAddress,system} from '../../src/catalog.ts';
import {parseAddress} from '../../src/address.ts';
import {starLifecycle,planetLifecycle} from '../../src/stellar-evolution.ts';
import {planetSnapshotAt} from '../../src/world-surface.ts';
import {CURRENT_VERSIONS} from '../../src/time-nav.ts';
import {terrainSampler} from '../../src/terrain.ts';
import {biomeClassifier} from '../../src/surface-biomes.ts';
import {HARNESS_SEED,HARNESS_SYSTEM_ID,HARNESS_BODY_ID,HARNESS_DATE,SITE_RULE,SITE_SEARCH,SITE_A_LEGACY} from '../harness-sites.mjs';

const norm=a=>{const l=Math.hypot(...a);return [a[0]/l,a[1]/l,a[2]/l];};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];

/** The harness body, its dated sea at `t`, and the sampler + classifier at that sea. */
export function harnessWorld(t=HARNESS_DATE){
  const sys=system(refByAddress(galaxies(HARNESS_SEED)[0],HARNESS_SYSTEM_ID));
  const body=[...sys.planets,...sys.moons].find(b=>b.id===HARNESS_BODY_ID);
  const star=sys.stars[0],systemAddress=parseAddress(sys.ref.id);
  const address=value=>({...systemAddress,slot:value.id.slice(sys.ref.id.length+1)});
  const starLc=starLifecycle(HARNESS_SEED,address(star),star),planetLc=planetLifecycle(HARNESS_SEED,address(body),body,starLc);
  const sea=planetSnapshotAt(HARNESS_SEED,body.id,body,planetLc,starLc,t,CURRENT_VERSIONS).ocean.renderWaterLevelM;
  return {body,sea,sample:terrainSampler(body,undefined,undefined,undefined,sea),classify:biomeClassifier(body,sea)};
}

/** Tangent-plane offset (metres east/north) from a unit direction. */
export function offsetDirection(world,centre,eastM,northM){
  const ref=Math.abs(centre[1])>.92?[1,0,0]:[0,1,0],e=norm(cross(ref,centre)),n=cross(centre,e),k=1/world.body.radiusM;
  return norm([0,1,2].map(i=>centre[i]+k*(eastM*e[i]+northM*n[i])));
}

/** Evaluates SITE_RULE at `direction`; returns the measured values and `pass`. */
export function evaluateSite(world,direction,rule=SITE_RULE){
  const at=d=>{const h=world.sample(d).groundHeightM;return {h,c:world.classify(d,h,1)};};
  const centre=at(direction);
  const out={heightM:centre.h,aboveSeaM:centre.h-world.sea,biome:centre.c.name,forestPotential:centre.c.forestPotential,
    effectiveMoisture:centre.c.effectiveMoisture,forestSuitability01:centre.c.forestSuitability01,ringForestShare:0,minRingAboveSeaM:Infinity,minRingMoisture:Infinity,pass:false};
  const centreOk=centre.c.forestPotential&&out.aboveSeaM>=rule.minAboveSeaM&&out.effectiveMoisture>=rule.minMoisture;
  let forest=0,n=0;
  for(const R of rule.ringsM)for(let i=0;i<rule.ringSamples;i++){
    const a=2*Math.PI*i/rule.ringSamples,s=at(offsetDirection(world,direction,R*Math.cos(a),R*Math.sin(a)));
    n++;if(s.c.forestPotential)forest++;
    out.minRingAboveSeaM=Math.min(out.minRingAboveSeaM,s.h-world.sea);out.minRingMoisture=Math.min(out.minRingMoisture,s.c.effectiveMoisture);
  }
  out.ringForestShare=forest/n;
  out.pass=centreOk&&out.ringForestShare>=rule.minRingForestShare&&out.minRingAboveSeaM>=rule.minAboveSeaM;
  return out;
}

/** The nearest passing site on a sunflower disc around `origin` (index order
 * is radius order), or null. Pure function of terrain, classifier and rule. */
export function searchSite(world,origin=SITE_A_LEGACY,search=SITE_SEARCH,rule=SITE_RULE){
  const G=Math.PI*(3-Math.sqrt(5));
  for(let i=0;i<search.points;i++){
    const r=search.radiusM*Math.sqrt((i+.5)/search.points),a=i*G;
    const direction=offsetDirection(world,origin,r*Math.cos(a),r*Math.sin(a));
    const site=evaluateSite(world,direction,rule);
    if(site.pass)return {index:i,direction,distanceM:world.body.radiusM*Math.acos(Math.min(1,direction.reduce((s,v,k)=>s+v*origin[k],0))),...site};
  }
  return null;
}
