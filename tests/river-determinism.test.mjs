import {test} from 'node:test';
import assert from 'node:assert/strict';
import {galaxies,refByAddress,system,bodyPosition} from '../src/catalog.ts';
import {terrainSampler} from '../src/terrain.ts';
import {riverDirection} from '../src/river-generation.ts';
import {
  buildCanonicalHydrology,
  primeCanonicalHydrologySync,
  ensureCanonicalHydrology,
  rankAutoDestinations,
  canonicalRegionsFor,
  canonicalCatchmentsFor,
  canonicalRegionForCatchment,
  hydrologyReady,
  resetHydrologyRegistry,
} from '../src/hydrology-registry.ts';

// system() is a pure regeneration (per docs/universe-atlas-v1-spec.md §3): a
// fresh call yields a structurally-identical but reference-DISTINCT Body for
// the same address. Used deliberately below to prove the registry — keyed by
// the string body.id, not an object reference — behaves the same for the
// live app's "re-enter a system, get a fresh Body object" pattern.
const freshBody=()=>{
  const sys=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0'));
  return {sys,body:sys.planets[1]};
};
const norm=v=>{const n=Math.hypot(...v);return v.map(x=>x/n);};
const sunAtDays=(sys,body,days)=>{
  const star=sys.stars[0],seconds=days*86400;
  const starPos=bodyPosition(star,sys,seconds),bodyPos=bodyPosition(body,sys,seconds);
  return norm(bodyPos.map((v,i)=>starPos[i]-v));
};
/** A point guaranteed inside a built region's influence: the midpoint of its
 * main channel, not the tangent-frame origin (a dry reference point that can
 * legitimately sit a little off the actual channel/lake geometry). */
const onChannel=region=>{
  const p=region.channels[0].points[Math.floor(region.channels[0].points.length/2)];
  return riverDirection(region,p.x,p.z);
};

// Regression fixture for the measured bug: on Maithea (G001/C2128,0,1/0
// planet 1), "Find rivers" (parentId:'auto') built basin outlet 23165 at
// simulated day 0-90 and a different basin (outlet 2625) at day 135/180,
// because the sun-lit destination ranking was mistaken for river existence
// (and that ranking's sort had no tiebreak); a second-order version of the
// same bug then had close-range terrain/colliders/vegetation reading the
// single UI-mutated body.hydrology field instead of a pre-built, canonical,
// order-independent set (the app-level flow the last test below exercises).
const {sys,body}=freshBody();
const {catchments,regions:feasible}=buildCanonicalHydrology(body);

test('canonical river existence never depends on request date; auto only re-ranks which one to fly to',()=>{
  assert.ok(feasible.length>=2,'fixture has at least two feasible canonical rivers');
  const canonicalIds=catchments.map(c=>c.id).sort();
  const picks=[];
  for(const days of [0,90,135,180,270]){
    // buildCanonicalHydrology takes no date/sun input at all, so recomputing
    // it fresh at each date (not reusing the earlier result) is the
    // strongest possible proof that existence cannot depend on when it is
    // called.
    const fresh=buildCanonicalHydrology(body).catchments.map(c=>c.id).sort();
    assert.deepEqual(fresh,canonicalIds,`canonical set at day ${days} matches the date-independent ranking`);
    const ranked=rankAutoDestinations(catchments,sunAtDays(sys,body,days));
    for(const c of ranked)assert.ok(canonicalIds.includes(c.id),'auto only ever ranks canonical basins');
    picks.push(ranked[0].id);
  }
  // The destination auto would try first is allowed to vary with the date
  // (that is the point of sun-lit ranking) — record it for visibility, but
  // do not assert it stays fixed; only existence (above) must not move.
  console.log('auto top pick by day',Object.fromEntries([0,90,135,180,270].map((d,i)=>[d,picks[i]])));
});

test('auto destination ranking has a strict, input-order-independent tiebreak for an exact score tie',()=>{
  const direction=[0,0,1];// identical, non-polar mouth direction => identical score for any sun, including undefined
  const a={id:'G001/zz-basin',outlet:1,mouth:{direction}},b={id:'G001/aa-basin',outlet:2,mouth:{direction}};
  for(const sun of [undefined,[1,0,0],[0,0,-1]]){
    const forward=rankAutoDestinations([a,b],sun),reversed=rankAutoDestinations([b,a],sun);
    assert.deepEqual(forward.map(c=>c.id),['G001/aa-basin','G001/zz-basin'],'ties resolve by ascending id, not input order');
    assert.deepEqual(forward,reversed,'reversing the input candidate order does not change the ranked output');
  }
});

test('terrain sample at a fixed direction is identical regardless of which canonical rivers are passed and in what order',()=>{
  const [regionA,regionB]=feasible;
  const dirA=onChannel(regionA),dirB=onChannel(regionB);
  const none=terrainSampler(body,[])(dirA);
  const onlyA=terrainSampler(body,[regionA])(dirA);
  const forward=terrainSampler(body,[regionA,regionB])(dirA);
  const reversed=terrainSampler(body,[regionB,regionA])(dirA);
  assert.ok(onlyA.influence>0,'fixture direction is actually inside region A\'s carved corridor');
  assert.deepEqual(forward,reversed,'terrain at a fixed direction does not depend on region build/array order');
  assert.deepEqual(forward,onlyA,'a second, unrelated region does not change this direction\'s result');
  assert.notDeepEqual(none,forward,'an un-carved base differs from a carved canonical river at its own direction');

  const forwardB=terrainSampler(body,[regionA,regionB])(dirB),reversedB=terrainSampler(body,[regionB,regionA])(dirB),onlyB=terrainSampler(body,[regionB])(dirB);
  assert.ok(onlyB.influence>0,'fixture direction is actually inside region B\'s carved corridor');
  assert.deepEqual(forwardB,reversedB,'order independence holds symmetrically at region B\'s own direction');
  assert.deepEqual(forwardB,onlyB);

  assert.deepEqual(terrainSampler(body,[])(dirA),none);
  assert.deepEqual(terrainSampler(body,[regionA])(dirA),onlyA);
});

test('app-level flow through the registry: terrain at fixed directions is identical with no UI action, after Find rivers at day 0, and at day 180',()=>{
  resetHydrologyRegistry();
  const fixtureDirections=feasible.slice(0,2).map(onChannel);
  assert.ok(fixtureDirections.length>=2,'fixture has at least two feasible canonical rivers to sample on');

  // (a) NO UI ACTION: only ensureCanonicalHydrology-equivalent proactive
  // priming has happened (simulating focusBody's automatic trigger) — no
  // "Find rivers" click, no explicit catchment selection, body.hydrology
  // never touched. Every consumer of terrainSampler(body) (planet-tiles,
  // GroundWalker/world-surface, surface-survey — all called with the
  // default parameter in the live app) must already see the full canonical
  // carve here.
  const {body:bodyNone}=freshBody();
  primeCanonicalHydrologySync(bodyNone);
  assert.equal(hydrologyReady(bodyNone),true,'registry has settled after priming');
  assert.ok(!bodyNone.hydrology,'no UI action taken means no detail-selected region either');
  assert.ok(canonicalRegionsFor(bodyNone.id).length>=2,'the registry independently reports the same canonical set');
  const noneSamples=fixtureDirections.map(d=>terrainSampler(bodyNone)(d));
  noneSamples.forEach((s,i)=>assert.ok(s.influence>0,`fixture direction ${i} is inside a canonical carved corridor even with no UI action`));

  // (b) "Find rivers" at day 0: rank canonical catchments by the day-0 sun
  // (exactly what main.ts's selectRiverDestination does with 'auto') and set
  // body.hydrology to the chosen destination — the cosmetic single-region
  // detail-render selector. This must not move ANY fixed-direction terrain
  // sample, canonical or not, because terrainSampler's default no longer
  // reads body.hydrology once canonicalRivers is populated.
  const {sys:sys0,body:bodyDay0}=freshBody();
  primeCanonicalHydrologySync(bodyDay0);
  // Not every canonical catchment is geometrically feasible (buildRiverRegion
  // can throw — see buildCanonicalHydrology); mirror main.ts's
  // selectRiverDestination, which walks the ranking for the first candidate
  // that actually resolves to a built region, rather than assuming rank 0 is
  // always buildable.
  const ranked0=rankAutoDestinations(canonicalCatchmentsFor(bodyDay0.id),sunAtDays(sys0,bodyDay0,0));
  const destination0=ranked0.find(c=>canonicalRegionForCatchment(bodyDay0.id,c.id));
  assert.ok(destination0,'day 0 has a rankable, feasible canonical destination');
  bodyDay0.hydrology=canonicalRegionForCatchment(bodyDay0.id,destination0.id);
  assert.ok(bodyDay0.hydrology,'the selected destination resolves to a built canonical region');
  const day0Samples=fixtureDirections.map(d=>terrainSampler(bodyDay0)(d));
  assert.deepEqual(day0Samples,noneSamples,'terrain at fixed directions is unchanged after Find rivers at day 0');

  // (c) At day 180: a different sun angle may legitimately rank a different
  // destination (the entire point of sun-lit ranking — recorded below for
  // visibility) — but the same fixed-direction terrain samples must still be
  // bit-for-bit identical to (a) and (b): WHICH region got the cosmetic
  // detail treatment never leaks into terrain height/collision/existence.
  const {sys:sys180,body:bodyDay180}=freshBody();
  primeCanonicalHydrologySync(bodyDay180);
  const ranked180=rankAutoDestinations(canonicalCatchmentsFor(bodyDay180.id),sunAtDays(sys180,bodyDay180,180));
  const destination180=ranked180.find(c=>canonicalRegionForCatchment(bodyDay180.id,c.id));
  assert.ok(destination180,'day 180 has a rankable, feasible canonical destination');
  bodyDay180.hydrology=canonicalRegionForCatchment(bodyDay180.id,destination180.id);
  const day180Samples=fixtureDirections.map(d=>terrainSampler(bodyDay180)(d));
  assert.deepEqual(day180Samples,noneSamples,'terrain at fixed directions is unchanged after Find rivers at day 180, even if a different destination was selected');
  console.log('Find rivers destination by day',{0:destination0.id,180:destination180.id});

  // ensureCanonicalHydrology (the real, async production entry point) must
  // resolve immediately for an id the registry already settled, and attach
  // the same canonical set onto a brand-new Body object reference for that
  // same address — the "re-enter a system" case, since system() never
  // returns the same object twice.
  const {body:bodyRevisit}=freshBody();
  return ensureCanonicalHydrology(bodyRevisit).then(()=>{
    assert.deepEqual(bodyRevisit.canonicalRivers.map(r=>r.id).sort(),canonicalRegionsFor(bodyDay180.id).map(r=>r.id).sort(),'a fresh Body object for the same address picks up the identical already-settled canonical set');
  });
});
