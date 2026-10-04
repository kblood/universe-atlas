// The shared harness living site stays a robust humid forest on the merged
// terrain (relief round 2026-10-03, P6-HARNESS-REPIN; tests/harness-sites.mjs).
// If a terrain or classifier change breaks this, move the site with the
// search (tests/helpers/harness-site-search.mjs) and record old -> new; never
// retune physics or loosen SITE_RULE to keep the old literal.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SITE_A,SITE_A_M,SITE_A_LEGACY,SITE_RULE,HARNESS_BODY_ID} from './harness-sites.mjs';
import {harnessWorld,evaluateSite,searchSite} from './helpers/harness-site-search.mjs';

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

test('the deterministic search reproduces the SITE_A literal (0.1 m rounding)',()=>{
  const found=searchSite(world);
  assert.ok(found,'a passing site exists within the search disc');
  const literal=SITE_A_M.map(v=>v/world.body.radiusM);
  const apartM=world.body.radiusM*Math.hypot(...found.direction.map((v,i)=>v*Math.hypot(...literal)-literal[i]));
  assert.ok(apartM<1,`search found index ${found.index} at ${found.direction}, ${apartM.toFixed(3)} m from the literal`);
});
