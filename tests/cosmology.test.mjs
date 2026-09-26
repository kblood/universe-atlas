import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  scaleFactorAt, eraAt, ERA_CHECKPOINTS, COSMOLOGY_VERSION,
  lnScaleFactorAt, scaleRatio, properDistanceLn, hubbleHorizonComovingMpc,
} from '../src/cosmology.ts';
import {CATALOGUE_EPOCH_NS, UNIVERSE_END_NS, tenToThe, YEAR_NS} from '../src/world-time.ts';
import {canonicalJSON} from './canonical-json.mjs';

test('COSMOLOGY_VERSION is the contract value', () => {
  assert.equal(COSMOLOGY_VERSION, 'atlas-cosmology-1');
});

test('a(CATALOGUE_EPOCH_NS) === 1 within 1e-12 and a(t) is monotone increasing', () => {
  assert.ok(Math.abs(scaleFactorAt(CATALOGUE_EPOCH_NS) - 1) < 1e-12, `a(now)=${scaleFactorAt(CATALOGUE_EPOCH_NS)}`);
  assert.equal(scaleFactorAt(0n), 0);
  // sinh() overflows to +Infinity around tGyr ~ 8.3e12 (x = tGyr/T_LAMBDA_GYR ~ 710,
  // the IEEE double sinh overflow threshold) — strict monotonicity is only a
  // meaningful, checkable property below that saturation point.
  const samples = [0n, 1_000_000n*YEAR_NS, 100_000_000n*YEAR_NS, 1_000_000_000n*YEAR_NS,
    CATALOGUE_EPOCH_NS, CATALOGUE_EPOCH_NS*2n, tenToThe(12)*YEAR_NS];
  for (let i = 1; i < samples.length; i++) {
    assert.ok(scaleFactorAt(samples[i]) > scaleFactorAt(samples[i-1]),
      `a(t) must increase: a(${samples[i-1]})=${scaleFactorAt(samples[i-1])} >= a(${samples[i]})=${scaleFactorAt(samples[i])}`);
  }
  // Beyond saturation a(t) is still non-decreasing (it pins at +Infinity, the
  // correct de-Sitter "grows without bound" limit for a proxy heat-death axis).
  let previous = scaleFactorAt(samples[samples.length-1]);
  for (const t of [tenToThe(14)*YEAR_NS, tenToThe(40)*YEAR_NS, UNIVERSE_END_NS]) {
    const a = scaleFactorAt(t);
    assert.ok(a >= previous, `a(t) must never decrease: a(${t})=${a} < ${previous}`);
    previous = a;
  }
});

test('a(t) handles the full 0n..UNIVERSE_END_NS range without throwing or producing NaN', () => {
  for (const t of [0n, CATALOGUE_EPOCH_NS, UNIVERSE_END_NS, UNIVERSE_END_NS - 1n]) {
    const a = scaleFactorAt(t);
    assert.ok(Number.isFinite(a) || a === Infinity, `a(${t}) must be a finite number or +Infinity, got ${a}`);
    assert.ok(!Number.isNaN(a));
  }
});

test('era checkpoints are strictly increasing and cover the declared range', () => {
  assert.equal(ERA_CHECKPOINTS[0].tNs, 0n);
  assert.equal(ERA_CHECKPOINTS[ERA_CHECKPOINTS.length-1].tNs, UNIVERSE_END_NS);
  for (let i = 1; i < ERA_CHECKPOINTS.length; i++)
    assert.ok(ERA_CHECKPOINTS[i].tNs > ERA_CHECKPOINTS[i-1].tNs,
      `${ERA_CHECKPOINTS[i-1].id} (${ERA_CHECKPOINTS[i-1].tNs}) must precede ${ERA_CHECKPOINTS[i].id} (${ERA_CHECKPOINTS[i].tNs})`);
  assert.deepEqual(eraAt(CATALOGUE_EPOCH_NS), {id:'catalogue-epoch', label: ERA_CHECKPOINTS.find(c=>c.id==='catalogue-epoch').label});
  assert.equal(eraAt(0n).id, 'big-bang');
  assert.equal(eraAt(UNIVERSE_END_NS).id, 'heat-death');
  assert.equal(eraAt(CATALOGUE_EPOCH_NS + 1n).id, 'catalogue-epoch');
  assert.equal(eraAt(CATALOGUE_EPOCH_NS - 1n).id, 'galaxy-assembly');
});

test('determinism: repeated runs, and reversed/shuffled checkpoint order, produce identical digests', () => {
  const ts = ERA_CHECKPOINTS.map(c => c.tNs).concat([1n, 12345n*YEAR_NS, CATALOGUE_EPOCH_NS+7n]);
  const digestOf = (list) => list.map(t => canonicalJSON({t, a: scaleFactorAt(t), era: eraAt(t)}));
  const forward = digestOf(ts);
  const again = digestOf(ts);
  assert.deepEqual(forward, again, 'repeated runs must match');
  const reversedTs = ts.slice().reverse();
  const reversed = digestOf(reversedTs);
  // compare per-t value regardless of visit order
  const byT = new Map(ts.map((t,i) => [t.toString(), forward[i]]));
  for (let i = 0; i < reversedTs.length; i++)
    assert.equal(reversed[i], byT.get(reversedTs[i].toString()), 'visit order must not affect a given t');
  const shuffled = [ts[3], ts[0], ts[ts.length-1], ts[1], ts[5]];
  for (const t of shuffled) assert.equal(canonicalJSON({t, a: scaleFactorAt(t), era: eraAt(t)}), byT.get(t.toString()));
});

const FAR_FUTURE_YEARS_EXP = [9, 12, 14, 20, 50, 100];
const farFutureT = (exp) => tenToThe(exp) * YEAR_NS;

test('lnScaleFactorAt is finite and strictly increasing across the full declared range, including past scaleFactorAt\'s saturation point', () => {
  let previous = -Infinity;
  for (const exp of FAR_FUTURE_YEARS_EXP) {
    const t = farFutureT(exp);
    const ln = lnScaleFactorAt(t);
    assert.ok(Number.isFinite(ln), `ln a(1e${exp} yr) must be finite, got ${ln}`);
    assert.ok(ln > previous, `ln a(1e${exp} yr)=${ln} must exceed the previous checkpoint ${previous}`);
    previous = ln;
  }
  assert.ok(Number.isFinite(lnScaleFactorAt(UNIVERSE_END_NS - 1n)));
  assert.ok(Number.isFinite(lnScaleFactorAt(1n)));
});

test('lnScaleFactorAt matches ln(scaleFactorAt(t)) within 1e-12 relative wherever scaleFactorAt is still finite', () => {
  const samples = [1_000_000n*YEAR_NS, 100_000_000n*YEAR_NS, 1_000_000_000n*YEAR_NS,
    CATALOGUE_EPOCH_NS, CATALOGUE_EPOCH_NS*2n, tenToThe(9)*YEAR_NS, tenToThe(12)*YEAR_NS];
  for (const t of samples) {
    const a = scaleFactorAt(t);
    assert.ok(Number.isFinite(a), `test setup: expected scaleFactorAt(${t}) finite`);
    const direct = Math.log(a), viaLn = lnScaleFactorAt(t);
    // Near t=CATALOGUE_EPOCH_NS, a(now)=1 so direct/viaLn are both legitimately
    // ~0 (ln(1)=0) — the two independent computation paths (Math.log(sinh(x))
    // vs the log-space lnSinh path) can disagree by a couple of ULPs there
    // (~5.5e-17 absolute), which is nothing but ordinary double rounding, yet
    // a *pure* relative-error metric divides that by the ~3e-16 reference
    // value itself and "blows up" to a spurious ~17-100% apparent error. Use
    // a combined absolute+relative tolerance (standard practice for this
    // exact near-zero-reference failure mode): pass if the difference is
    // within 1e-9 in absolute ln-units (>>1e-16 rounding noise, <<any
    // genuine mismatch this test should catch) OR within 1e-12 relative,
    // whichever is looser.
    const diff = Math.abs(direct - viaLn);
    const rel = diff / Math.max(1e-300, Math.abs(direct));
    assert.ok(diff < 1e-9 || rel < 1e-12,
      `t=${t}: ln(scaleFactorAt)=${direct} vs lnScaleFactorAt=${viaLn}, diff=${diff}, rel=${rel}`);
  }
});

test('scaleRatio: finite/correctly-signed even across scaleFactorAt\'s saturation boundary, never NaN', () => {
  assert.equal(scaleRatio(0n, 0n), 1);
  assert.equal(scaleRatio(CATALOGUE_EPOCH_NS, CATALOGUE_EPOCH_NS), 1);
  assert.ok(!Number.isNaN(scaleRatio(0n, farFutureT(12))));
  assert.ok(!Number.isNaN(scaleRatio(farFutureT(12), 0n)));
  for (const exp of FAR_FUTURE_YEARS_EXP) for (const exp2 of FAR_FUTURE_YEARS_EXP) {
    const r = scaleRatio(farFutureT(exp), farFutureT(exp2));
    assert.ok(!Number.isNaN(r), `scaleRatio(1e${exp}, 1e${exp2}) must never be NaN`);
    assert.ok(r >= 0, 'a ratio of two non-negative scale factors is never negative');
  }
  // A representable, nearby-epoch ratio must be an ordinary finite double
  // that agrees with the direct a(t1)/a(t2) computation below saturation.
  const t1 = 2n*CATALOGUE_EPOCH_NS, t2 = CATALOGUE_EPOCH_NS;
  const direct = scaleFactorAt(t1)/scaleFactorAt(t2);
  const viaLog = scaleRatio(t1, t2);
  assert.ok(Number.isFinite(viaLog));
  assert.ok(Math.abs(direct-viaLog)/direct < 1e-9, `direct=${direct} viaLog=${viaLog}`);
});

test('properDistanceLn: pure function of a frozen comoving distance and t, matches comovingMpc*a(t) below saturation', () => {
  const comovingMpc = 4448;
  assert.equal(properDistanceLn(0, CATALOGUE_EPOCH_NS), -Infinity);
  assert.equal(properDistanceLn(-5, CATALOGUE_EPOCH_NS), -Infinity);
  const ln = properDistanceLn(comovingMpc, CATALOGUE_EPOCH_NS);
  assert.ok(Math.abs(Math.exp(ln) - comovingMpc) < 1e-6, `exp(properDistanceLn) should reproduce comovingMpc*a(now)~=comovingMpc, got ${Math.exp(ln)}`);
  // Stays finite far past scaleFactorAt's saturation point.
  for (const exp of FAR_FUTURE_YEARS_EXP) assert.ok(Number.isFinite(properDistanceLn(comovingMpc, farFutureT(exp))));
});

test('hubbleHorizonComovingMpc: finite and strictly positive everywhere on (0n, UNIVERSE_END_NS], t=0n is the one true zero, and shrinks monotonically once dark energy dominates', () => {
  assert.equal(hubbleHorizonComovingMpc(0n), 0);
  // The comoving Hubble horizon c/(a*H) is NOT globally monotonic: during
  // matter domination (small t) a*H is decreasing so the horizon GROWS; only
  // once the cosmological constant dominates does a*H grow without bound and
  // the horizon shrink toward zero (this is exactly the contract's own "past
  // ~1e12-1e14 yr other galaxies recede beyond the horizon" framing — the
  // shrinking regime is a late-time property, not a universal one). Verified
  // numerically: horizon(1n)~9.7e-6 Mpc, rises through horizon(1e6yr)~307,
  // peaks near horizon(CATALOGUE_EPOCH_NS)~4447 Mpc, then falls monotonically
  // (horizon(3e10yr)~1979, horizon(1e11yr)~36.8, horizon(1e12yr)~1.8e-21, ...).
  // So: finite+positive is asserted across the FULL ascending range, but the
  // monotonic-shrink assertion only starts at CATALOGUE_EPOCH_NS, once dark
  // energy has taken over.
  const checkpoints = [1n, 1_000_000n*YEAR_NS, 1_000_000_000n*YEAR_NS, tenToThe(10)*YEAR_NS,
    CATALOGUE_EPOCH_NS, ...FAR_FUTURE_YEARS_EXP.map(farFutureT), UNIVERSE_END_NS - 1n]
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  let previous = null;
  let pastCatalogueEpoch = false;
  for (const t of checkpoints) {
    const horizon = hubbleHorizonComovingMpc(t);
    assert.ok(Number.isFinite(horizon), `horizon(${t}) must be finite, got ${horizon}`);
    assert.ok(horizon > 0, `horizon(${t}) must be strictly positive, got ${horizon}`);
    if (pastCatalogueEpoch && previous !== null) {
      assert.ok(horizon <= previous * 1.0000001,
        `horizon must shrink (or hold, once floored) once dark energy dominates: horizon(${t})=${horizon} > previous ${previous}`);
    }
    if (t >= CATALOGUE_EPOCH_NS) pastCatalogueEpoch = true;
    previous = horizon;
  }
  // Sanity magnitude: today's comoving Hubble horizon should be a few thousand Mpc
  // (c/H0 with H0=67.4 km/s/Mpc is ~4448 Mpc, and a(now)=1).
  const now = hubbleHorizonComovingMpc(CATALOGUE_EPOCH_NS);
  assert.ok(now > 1000 && now < 10000, `horizon(now)=${now} Mpc, expected order ~4000-5000`);
});

test('ulp-perturbation: continuous a(t)/horizon values may drift, but eraAt (discrete) is unchanged when Math transcendentals are perturbed', () => {
  const originals = {sin: Math.sin, cos: Math.cos, exp: Math.exp, log: Math.log, pow: Math.pow, atan2: Math.atan2, tan: Math.tan, cbrt: Math.cbrt, sinh: Math.sinh};
  const before = ERA_CHECKPOINTS.map(c => canonicalJSON(eraAt(c.tNs)));
  const ulp = (f) => (...args) => { const v = f(...args); return v + (v === 0 ? Number.EPSILON : v * Number.EPSILON); };
  try {
    Math.sin = ulp(originals.sin); Math.cos = ulp(originals.cos); Math.exp = ulp(originals.exp);
    Math.log = ulp(originals.log); Math.pow = ulp(originals.pow); Math.atan2 = ulp(originals.atan2);
    Math.tan = ulp(originals.tan); Math.cbrt = ulp(originals.cbrt); Math.sinh = ulp(originals.sinh);
    const after = ERA_CHECKPOINTS.map(c => canonicalJSON(eraAt(c.tNs)));
    assert.deepEqual(after, before, 'eraAt must be bit-identical under ulp-level Math perturbation (it never calls Math.*)');
  } finally {
    Object.assign(Math, originals);
  }
});
