import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  TIME_VERSION, NS, YEAR_NS, CATALOGUE_EPOCH_NS, UNIVERSE_END_NS, tenToThe, phaseFromPeriod,
  yearsToDate, dateYears, parseDate,
} from '../src/world-time.ts';
import {starLifecycle, rotationAngleAt, spinStateFor, dayNightAt} from '../src/stellar-evolution.ts';
import {galaxies, sector, system} from '../src/catalog.ts';

test('TIME_VERSION bumped for the Big-Bang-origin axis', () => {
  assert.equal(TIME_VERSION, 'atlas-time-2');
});

test('tenToThe is exact for huge exponents (no ** / Math.pow float rounding)', () => {
  assert.equal(tenToThe(0), 1n);
  assert.equal(tenToThe(3), 1000n);
  assert.equal(tenToThe(100), BigInt('1' + '0'.repeat(100)));
  assert.equal(UNIVERSE_END_NS, tenToThe(100) * YEAR_NS);
});

test('CATALOGUE_EPOCH_NS is 13.787 Gyr and strictly within [0, UNIVERSE_END_NS)', () => {
  assert.equal(CATALOGUE_EPOCH_NS, 13_787_000_000n * YEAR_NS);
  assert.ok(CATALOGUE_EPOCH_NS > 0n && CATALOGUE_EPOCH_NS < UNIVERSE_END_NS);
});

test('phaseFromPeriod: Euclidean-modulo pattern survives huge magnitudes and negative elapsed time', () => {
  const period = 86_400n * NS; // 1 day
  assert.ok(Math.abs(phaseFromPeriod(0n, period, 0) - 0) < 1e-12);
  assert.ok(Math.abs(phaseFromPeriod(period, period, 0) - 0) < 1e-9);
  assert.ok(Math.abs(phaseFromPeriod(period/2n, period, 0) - Math.PI) < 1e-6);
  // Huge-magnitude elapsed time (comparable to UNIVERSE_END_NS) must not throw or go non-finite.
  const huge = UNIVERSE_END_NS - 1n;
  const phase = phaseFromPeriod(huge, period, 0);
  assert.ok(Number.isFinite(phase) && phase >= 0 && phase < 2*Math.PI);
  // Negative elapsed time wraps the same as phaseAt's existing Euclidean modulo.
  const negPhase = phaseFromPeriod(-1n, period, 0);
  assert.ok(negPhase >= 0 && negPhase < 2*Math.PI);
  assert.equal(phaseFromPeriod(0n, 0n, 1.2345), phaseFromPeriod(0n, -5n, 1.2345), 'non-positive period falls back to phase0');
});

test('rotationAngleAt is deterministic and wraps within [0, 2*PI); day/night is bounded and pure', () => {
  const g = galaxies('LETHRA-001')[0];
  const ref = sector(g, [266, 0, 0]).refs[0];
  const sys = system(ref);
  const star = sys.stars[0], planet = sys.planets[0];
  const starLc = starLifecycle('LETHRA-001', null, star);
  const spin = spinStateFor(planet);
  for (const t of [starLc.formationNs, starLc.formationNs + 1n, starLc.formationNs + 12345678901234n, UNIVERSE_END_NS - 1n]) {
    const a = rotationAngleAt(spin, starLc.formationNs, t);
    const b = rotationAngleAt(spin, starLc.formationNs, t);
    assert.equal(a, b, 'pure function: repeated calls must match');
    assert.ok(a >= 0 && a < 2*Math.PI);
  }
  const surfaceDir = [1, 0, 0], starDir = [0.3, 0.1, 0.9];
  const day = dayNightAt(spin, starLc.formationNs, starLc.formationNs, surfaceDir, starDir);
  assert.ok(day.illumination >= 0 && day.illumination <= 1);
  assert.equal(typeof day.isDay, 'boolean');
  assert.deepEqual(day, dayNightAt(spin, starLc.formationNs, starLc.formationNs, surfaceDir, starDir));
});

// ---------------------------------------------------------------------------
// yearsToDate's navigable-ceiling round trip (bug fix: the old `\d{1,80}`
// cap made UNIVERSE_END_NS itself — the contract's own declared "beginning
// to end of the universe" ceiling, a 101-digit year count — unrepresentable
// through this entry point). See tests/acceptance/version-compat.test.mjs
// for the acceptance-level FINDING this traces back to.
// ---------------------------------------------------------------------------
test('yearsToDate: the exact UNIVERSE_END_NS ceiling (10^100 yr, 101 digits) round-trips exactly, entered directly and via dateYears', () => {
  const yearsString = '1' + '0'.repeat(100);
  assert.equal(yearsString.length, 101);
  assert.equal(yearsToDate(yearsString), UNIVERSE_END_NS);
  // Full round trip through the display formatter too (the literal FINDING scenario).
  assert.equal(yearsToDate(dateYears(UNIVERSE_END_NS)), UNIVERSE_END_NS);
});

test('yearsToDate: one full year below the ceiling is exact and distinct from the ceiling itself (no Number-precision collapse)', () => {
  // 10^100 and 10^100-1 are NOT distinguishable as IEEE doubles (both round
  // to the same double) — if yearsToDate ever routed this through
  // Number/parseFloat instead of pure BigInt digit parsing, these two would
  // silently collapse to the same result. They must not.
  const ceilingYears = 10n ** 100n;
  const oneBelowYears = ceilingYears - 1n;
  const atCeiling = yearsToDate(ceilingYears.toString());
  const oneBelow = yearsToDate(oneBelowYears.toString());
  assert.equal(atCeiling, UNIVERSE_END_NS);
  assert.equal(oneBelow, oneBelowYears * YEAR_NS);
  assert.notEqual(oneBelow, atCeiling, 'one year below the ceiling must be a genuinely distinct, smaller value');
  assert.equal(atCeiling - oneBelow, YEAR_NS, 'the two must differ by exactly one YEAR_NS, not collapse together');
});

test('yearsToDate: beyond the ceiling is a loud, explicit rejection — never a silent clamp/truncation', () => {
  const oneYearBeyond = (10n ** 100n + 1n).toString(); // 101 digits, well inside the widened 200-digit regex cap
  assert.throws(() => yearsToDate(oneYearBeyond), /out of range/i,
    'must be rejected with a distinct "out of range" message, not silently clamped to the ceiling');
  // A drastically larger magnitude (still under the regex's digit cap) must
  // also be rejected via the explicit range check, not silently accepted or
  // truncated to something in-range.
  const wayBeyond = '1' + '0'.repeat(150);
  assert.throws(() => yearsToDate(wayBeyond), /out of range/i);
  // Sanity: this must be the explicit RANGE rejection, not the "too many
  // digits for the parser at all" rejection — confirm those are distinct
  // failure modes by pushing digit count past the (generous, 200) regex cap
  // itself, which must fail differently (the plain "not a decimal number" parse error).
  const pastDigitCap = '1' + '0'.repeat(205);
  assert.throws(() => yearsToDate(pastDigitCap), /Enter years as a decimal number/);
});

test('yearsToDate: the raw-nanosecond pipeline (parseDate) already carries the ceiling and ceiling-1 exactly, independent of yearsToDate\'s own digit cap', () => {
  assert.equal(parseDate(UNIVERSE_END_NS.toString()), UNIVERSE_END_NS);
  assert.equal(parseDate((UNIVERSE_END_NS - 1n).toString()), UNIVERSE_END_NS - 1n);
});

// ---------------------------------------------------------------------------
// yearsToDate's floor: the navigable range is CLOSED at both ends, §2.1 —
// `t = 0n` (the Big Bang) is legal and must round-trip exactly; anything
// before it is a moment before the universe began and must throw, loudly,
// never silently clamp to 0n. Mirrors the existing ceiling tests above so
// the boundary itself is exercised on both sides, not just values far from it.
// ---------------------------------------------------------------------------
test('yearsToDate: t = 0n (the Big Bang) round-trips exactly', () => {
  assert.equal(yearsToDate('0'), 0n);
  assert.equal(yearsToDate('0.0'), 0n);
  assert.equal(yearsToDate('-0'), 0n, '"-0" years carries no negative magnitude, so it is the Big Bang instant, not a floor violation');
  // Full round trip through the display formatter too, matching the ceiling
  // round-trip test's shape.
  assert.equal(yearsToDate(dateYears(0n)), 0n);
});

test('yearsToDate: one year before the Big Bang throws — the boundary itself, not just a value far from it', () => {
  assert.throws(() => yearsToDate('-1'), /out of range/i,
    'must be rejected as out of range, not silently clamped to 0n');
  // A fractional-year negative (still magnitude-in-range) must also throw:
  // the floor check is on sign, not on being a "round" number of years.
  assert.throws(() => yearsToDate('-0.000000001'), /out of range/i);
});

test('yearsToDate: a large negative magnitude throws — same floor rejection as a small one, not swallowed by the ceiling check', () => {
  // Comfortably within the ceiling's magnitude bound (10^100 yr), so this
  // must fail via the NEW floor check, not the pre-existing ceiling check —
  // both report "out of range", but only the floor check fires here.
  assert.throws(() => yearsToDate('-500000000'), /out of range/i);
  // A negative magnitude that is ALSO beyond the ceiling: still throws (via
  // the ceiling's own sign-agnostic magnitude check, which runs first), so
  // the floor addition doesn't regress that existing "regardless of sign" behaviour.
  const wayBeyondNegative = '-1' + '0'.repeat(150);
  assert.throws(() => yearsToDate(wayBeyondNegative), /out of range/i);
});

test('yearsToDate: existing ceiling behaviour (UNIVERSE_END_NS itself succeeds, one year beyond throws) still holds alongside the new floor check', () => {
  assert.equal(yearsToDate((10n ** 100n).toString()), UNIVERSE_END_NS);
  assert.throws(() => yearsToDate((10n ** 100n + 1n).toString()), /out of range/i);
});
