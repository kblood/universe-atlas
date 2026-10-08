// The shared harness living site stays a robust humid forest on the merged
// terrain (relief round 2026-10-03, P6-HARNESS-REPIN; tests/harness-sites.mjs).
// If a terrain or classifier change breaks this, move the site with the
// search (tests/helpers/harness-site-search.mjs) and record old -> new; never
// retune physics or loosen SITE_RULE to keep the old literal.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SITE_A,SITE_A_M,SITE_A_LEGACY,SITE_A_CLIMATE1_M,SITE_RULE,HARNESS_BODY_ID} from './harness-sites.mjs';
import {harnessWorld,evaluateSite,searchSite,searchSitePlanet,evaluateClassClauses} from './helpers/harness-site-search.mjs';
import {LEGACY_BEHAVIOUR_CLASSES} from '../src/eco-class.ts';

const world=harnessWorld();

test('harness date has the full ocean (sea exactly 0) on the harness body',()=>{
  assert.equal(world.body.id,HARNESS_BODY_ID);
  assert.ok(Object.is(world.sea,0),`dated sea ${world.sea}`);
});

test('SITE_A passes the robustness rule with margin above the forest gate',t=>{
  const s=evaluateSite(world,SITE_A);
  t.diagnostic(JSON.stringify(s));
  assert.equal(s.forestPotential,true,'forest at the centre');
  assert.ok(s.aboveSeaM>=SITE_RULE.minAboveSeaM,`centre ${s.aboveSeaM.toFixed(1)} m above sea`);
  assert.ok(s.effectiveMoisture>=SITE_RULE.minMoisture,`moisture ${s.effectiveMoisture}`);
  assert.ok(s.ringForestShare>=SITE_RULE.minRingForestShare,`ring forest share ${s.ringForestShare}`);
  assert.ok(s.minRingAboveSeaM>=SITE_RULE.minAboveSeaM,`ring minimum ${s.minRingAboveSeaM.toFixed(1)} m above sea`);
  assert.equal(s.pass,true);
});

test('the pre-relief site is recorded as failing the rule (why SITE_A moved)',()=>{
  const s=evaluateSite(world,SITE_A_LEGACY);
  assert.equal(s.pass,false);
  assert.ok(s.aboveSeaM<SITE_RULE.minAboveSeaM,`legacy centre ${s.aboveSeaM.toFixed(1)} m`);
});

test('SITE_A passes the eco-class clauses (classes {4,5,6} live and at +-1 K, 5/10 km rings, ground look zero)',t=>{
  const c=evaluateClassClauses(world,SITE_A,SITE_RULE,undefined,false);
  t.diagnostic(JSON.stringify(c));
  assert.deepEqual(c.failed,[]);
  assert.ok(c.centreClasses.every(k=>LEGACY_BEHAVIOUR_CLASSES.has(k)),`centre classes ${c.centreClasses}`);
  assert.ok(c.tcMarginK>=1,`Tc margin ${c.tcMarginK} K`);
});

test('the surface-climate-1.1 site and the SITE_SEARCH disc no longer pass (why SITE_A moved again)',()=>{
  // climate-m1-decision decision 1: the 100 km disc has no forest under surface-climate-2 (0 of 4096 points with
  // effM >= 0.6), so the disc search finds nothing and the whole-planet search replaces it.
  const unit=v=>{const l=Math.hypot(...v);return v.map(x=>x/l);};
  assert.equal(evaluateSite(world,unit(SITE_A_CLIMATE1_M)).pass,false);
  assert.equal(searchSite(world),null);
});

test('the deterministic search reproduces the SITE_A literal (0.1 m rounding)',()=>{
  const found=searchSitePlanet(world);
  assert.ok(found,'a passing site exists on the planet');
  // The literal is the found direction scaled to the literal's own length and
  // rounded to 0.1 m per axis, so each axis is within 0.05 m.
  const length=Math.hypot(...SITE_A_M),scaled=found.direction.map(v=>v*length);
  assert.deepEqual(scaled.map(v=>Math.round(v*10)/10),SITE_A_M,`search found index ${found.index} at ${scaled}`);
  const apartM=Math.hypot(...scaled.map((v,i)=>v-SITE_A_M[i]));
  assert.ok(apartM<=Math.sqrt(3)*.05,`${apartM.toFixed(4)} m from the literal`);
});
