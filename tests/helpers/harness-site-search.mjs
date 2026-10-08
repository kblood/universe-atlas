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
import {climateForcingFor} from '../../src/surface-climate.ts';
import {LEGACY_BEHAVIOUR_CLASSES,ECO_CLASS_CALIBRATION as EK,ecoClassOf,groundLookOf} from '../../src/eco-class.ts';
import {HARNESS_SEED,HARNESS_SYSTEM_ID,HARNESS_BODY_ID,HARNESS_DATE,SITE_RULE,SITE_SEARCH,SITE_A_LEGACY,SITE_CLASS_RULE,SITE_PLANET_SEARCH} from '../harness-sites.mjs';

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

// ---------------- surface-climate-2: eco-class clauses and the whole-planet search ----------------
// climate-m1-decision 2026-10-08 decision 1 (Opus-decided on Kasper's instruction, overrulable).

/** Ring of `n` directions at `radiusM` around `centre`, in the tangent basis of tests/eco-identity-site.test.mjs
 * (u = axis x centre with axis y unless |centre.y| >= 0.9, v = centre x u; point k at angle 2 pi k / n). */
export function ecoRing(world,centre,radiusM,n){
  const nrm=a=>{const l=Math.hypot(...a);return a.map(x=>x/l);};
  const ax=Math.abs(centre[1])<.9?[0,1,0]:[1,0,0],u=nrm(cross(ax,centre)),v=cross(centre,u),s=radiusM/world.body.radiusM,out=[];
  for(let k=0;k<n;k++){const a=k*2*Math.PI/n;out.push(nrm(centre.map((x,i)=>x+(u[i]*Math.cos(a)+v[i]*Math.sin(a))*s)));}
  return out;
}

/** Eco classes of one direction at the live values and with the half-range shifted (Ta fixed):
 * [live, Tw-shift / Tc+shift, Tw+shift / Tc-shift]; -1 over ocean. Same inputs as ecoClassOfBiomeSample. */
export function ecoClassesShifted(world,direction,shiftK,lapse){
  const h=world.sample(direction).groundHeightM,r=world.classify(direction,h,1);
  if(r.ocean)return {h,r,classes:[-1,-1,-1]};
  const ta=r.annualMeanTempK,tw=r.warmestMonthK,hs=h-world.sea,dw=tw+lapse*(hs>0?hs:0);
  const cls=dt=>ecoClassOf(ta,tw+dt,2*ta-tw-dt,r.effectiveMoisture,r.snowFraction,hs,r.weights[0]??0,dw+dt,true);
  return {h,r,classes:[cls(0),cls(-shiftK),cls(shiftK)]};
}

/** Evaluates SITE_CLASS_RULE clauses 2-4 at `direction`; `failed` lists the failing clause names (all of them when
 * stopEarly is false). tcMarginK = min(TROPICAL_COLDEST_K - Tc, Tc - BOREAL_COLDEST_K) at the centre. */
export function evaluateClassClauses(world,direction,rule=SITE_RULE,classRule=SITE_CLASS_RULE,stopEarly=true){
  const lapse=world.lapse??(world.lapse=climateForcingFor(world.body).lapseKPerM),failed=[];
  const ok=c=>c.every(k=>LEGACY_BEHAVIOUR_CLASSES.has(k));
  const centre=ecoClassesShifted(world,direction,classRule.halfShiftK,lapse);
  const out={centreClasses:centre.classes,tcMarginK:null,groundLook:null,failed};
  if(!centre.r.ocean){
    const r=centre.r,ta=r.annualMeanTempK,tw=r.warmestMonthK,tc=2*ta-tw;
    out.tcMarginK=Math.min(EK.TROPICAL_COLDEST_K-tc,tc-EK.BOREAL_COLDEST_K);
    // clause 4: ground look at the centre, exactly as tests/eco-identity-site.test.mjs computes it.
    out.groundLook=[...groundLookOf(tw,ta,tc,r.effectiveMoisture,r.treeline01,r.slopeDeg,new Float32Array(4))];
  }
  if(!out.groundLook||out.groundLook.some(x=>x!==0))failed.push('4:groundLook');
  if(stopEarly&&failed.length)return out;
  // clause 2: centre and SITE_RULE rings, live and +-shift.
  let c2=ok(centre.classes);
  for(const R of rule.ringsM){
    if(stopEarly&&!c2)break;
    for(const d of ecoRing(world,direction,R,rule.ringSamples))if(!ok(ecoClassesShifted(world,d,classRule.halfShiftK,lapse).classes)){c2=false;break;}
  }
  if(!c2)failed.push('2:classes+-1K');
  if(stopEarly&&failed.length)return out;
  // clause 3: 5 km and 10 km rings, live values.
  let c3=true;
  for(const R of classRule.extraRingsM){
    if(stopEarly&&!c3)break;
    for(const d of ecoRing(world,direction,R,classRule.extraRingSamples))if(!ok([ecoClassesShifted(world,d,0,lapse).classes[0]])){c3=false;break;}
  }
  if(!c3)failed.push('3:rings5-10km');
  return out;
}

/** Directions of the whole-planet search: Fibonacci index i of N (y = 1 - 2(i+0.5)/N, golden-angle longitude), and
 * the visiting order by great-circle distance from `origin` (descending dot product), ties by index. */
export function planetSearchOrder(origin=SITE_A_LEGACY,search=SITE_PLANET_SEARCH){
  const N=search.points,G=Math.PI*(3-Math.sqrt(5)),dirs=new Array(N),dot=new Float64Array(N),order=Array.from({length:N},(_,i)=>i);
  for(let i=0;i<N;i++){const y=1-2*(i+.5)/N,r=Math.sqrt(1-y*y),p=i*G;dirs[i]=[Math.cos(p)*r,y,Math.sin(p)*r];dot[i]=dirs[i][0]*origin[0]+dirs[i][1]*origin[1]+dirs[i][2]*origin[2];}
  order.sort((a,b)=>dot[b]-dot[a]||a-b);
  return {dirs,dot,order};
}

/** The nearest whole-planet direction passing SITE_RULE (clause 1) and SITE_CLASS_RULE (clauses 2-4), or null.
 * Pure function of terrain, classifier, eco classes and the two rules. `onReject(entry)` sees every rejected land
 * point in visiting order with the first failing clause (for near-miss reports). */
export function searchSitePlanet(world,origin=SITE_A_LEGACY,search=SITE_PLANET_SEARCH,rule=SITE_RULE,classRule=SITE_CLASS_RULE,onReject=null){
  const {dirs,dot,order}=planetSearchOrder(origin,search);
  for(let rank=0;rank<order.length;rank++){
    const i=order[rank],direction=dirs[i],distanceM=world.body.radiusM*Math.acos(Math.min(1,dot[i]));
    // Cheap centre gate first (the same centre clauses evaluateSite checks).
    const h=world.sample(direction).groundHeightM,c=world.classify(direction,h,1);
    if(c.ocean)continue;
    const site=c.forestPotential&&h-world.sea>=rule.minAboveSeaM&&c.effectiveMoisture>=rule.minMoisture?evaluateSite(world,direction,rule):null;
    if(!site||!site.pass){onReject?.({rank,index:i,direction,distanceM,failed:['1:SITE_RULE'],site});continue;}
    const cls=evaluateClassClauses(world,direction,rule,classRule);
    if(cls.failed.length){onReject?.({rank,index:i,direction,distanceM,failed:cls.failed,site,cls});continue;}
    return {rank,index:i,direction,distanceM,...site,...cls};
  }
  return null;
}
