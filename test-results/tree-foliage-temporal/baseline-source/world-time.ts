/** Dates are signed nanoseconds since the Big Bang (`t = 0n`), per
 * docs/time-and-coordinates-contract.md §2.1. `CATALOGUE_EPOCH_NS` is the
 * named offset that ties the existing static catalogue (and every existing
 * `epoch = 0n` fixture) to this axis: `oldEpoch == 0` now means
 * `t == CATALOGUE_EPOCH_NS`. Decimal serialization is lossless; only bounded
 * orbital remainders become floats. */
export const TIME_VERSION = 'atlas-time-2'; // was 'atlas-time-1': origin moved from catalogue epoch to Big Bang
export const NS = 1_000_000_000n;
export const YEAR_NS = 31_557_600n * NS;
/** Signed nanoseconds since the Big Bang. Alias kept alongside `OrbitTime` for
 * modules that want the contract's exact §1.1 name. */
export type Ns = bigint;
export type OrbitTime = number | bigint;

/** Exact integer power of ten as a BigInt, via repeated multiplication — never
 * `**`/Math.pow, so huge exponents (e.g. `tenToThe(100)`) stay exact and
 * engine-independent. */
export function tenToThe(exponent: number): bigint {
  let v = 1n;
  for (let i = 0; i < exponent; i++) v *= 10n;
  return v;
}

/** 13.787 Gyr, Planck 2018 age estimate — where today's static 32-galaxy
 * catalogue and every existing `epoch = 0n` fixture live. */
export const CATALOGUE_EPOCH_NS = 13_787_000_000n * YEAR_NS;
/** Heat-death proxy, `10^100` years — a declared UI/data ceiling, not a
 * physical prediction (contract §2.1, §3.1). */
export const UNIVERSE_END_NS = tenToThe(100) * YEAR_NS;

export function parseDate(value: string | null): bigint {
  if (!value) return 0n;
  if (!/^-?\d{1,120}$/.test(value)) throw new Error('Invalid date');
  return BigInt(value);
}
/** Digit cap on the integer-years part of a `yearsToDate` input string. Not
 * tuned to today's UNIVERSE_END_NS (10^100 yr = 101 digits) specifically —
 * generous headroom (2x) so a future contract change to UNIVERSE_END_NS
 * doesn't silently reintroduce this same cap bug. The actual range gate is
 * the explicit BigInt comparison below, not this digit count; this only
 * bounds pathological input length (a million-digit string) before it ever
 * reaches BigInt() parsing. */
const YEARS_INPUT_DIGIT_CAP = 200;
export function yearsToDate(value: string): bigint {
  const re = new RegExp(`^([+-]?)(\\d{1,${YEARS_INPUT_DIGIT_CAP}})(?:\\.(\\d{1,20}))?$`);
  const m = re.exec(value.trim());
  if (!m) throw new Error('Enter years as a decimal number');
  const fraction = (m[3] || '').padEnd(20, '0');
  // Everything here is BigInt end-to-end (m[2]/fraction are decimal-digit
  // strings fed straight to BigInt()) — never Number/parseFloat — so a
  // 101-digit year count is exact, not a lossy double approximation.
  const fractionScale = tenToThe(20);
  const magnitudeNs = BigInt(m[2]) * YEAR_NS + (BigInt(fraction) * YEAR_NS + fractionScale / 2n) / fractionScale;
  // §2.1's declared navigable ceiling, which is CLOSED: `[0n, UNIVERSE_END_NS]`.
  // §3.1 calls UNIVERSE_END_NS the "scrubber ceiling" you travel TO, so the
  // ceiling itself must be enterable and round-trippable, not excluded — the
  // whole point of the project is being able to reach the end of the universe.
  // Anything of greater magnitude is rejected loudly — never a silent
  // clamp/truncation — regardless of sign, since a magnitude beyond the
  // declared end of the universe is out of range whether it was entered as a
  // positive or a negative year count.
  if (magnitudeNs > UNIVERSE_END_NS) {
    throw new Error(`Years value out of range: ${value.trim()} yr exceeds the navigable ceiling of ${dateYears(UNIVERSE_END_NS)} yr (UNIVERSE_END_NS)`);
  }
  const t = (m[1] === '-' ? -1n : 1n) * magnitudeNs;
  // Symmetric floor check: §2.1's declared navigable range is closed at BOTH
  // ends, `[0n, UNIVERSE_END_NS]`. `t = 0n` (the Big Bang itself) is a legal,
  // addressable instant — the check above only ever rejects a *magnitude*
  // beyond the ceiling, so a small negative magnitude (e.g. "-1" year) would
  // otherwise sail through as a valid, negative `t`: an instant before the
  // universe began. Rejected loudly here — never a silent clamp/truncation —
  // matching the ceiling check's own wording and style.
  if (t < 0n) {
    throw new Error(`Years value out of range: ${value.trim()} yr precedes the navigable floor of 0 yr (the Big Bang)`);
  }
  return t;
}
export function dateYears(date: bigint): string {
  const sign=date<0n?'-':''; const n=date<0n?-date:date;
  const scale=tenToThe(20);
  const rounded=((n%YEAR_NS)*scale+YEAR_NS/2n)/YEAR_NS;
  const carry=rounded===scale?1n:0n;
  const fraction=(carry?0n:rounded).toString().padStart(20,'0').replace(/0+$/,'');
  return sign+(n/YEAR_NS+carry).toString()+(fraction?'.'+fraction:'');
}
// `reference` names the axis origin `offsetNs` is measured FROM — under
// atlas-time-2 (see TIME_VERSION above) that origin is the Big Bang (`t =
// 0n`), matching cosmology.ts's own `ERA_CHECKPOINTS` id for the same
// instant ('big-bang'). It was 'catalogue' under atlas-time-1, when the axis
// origin genuinely was CATALOGUE_EPOCH_NS; left un-updated across the
// atlas-time-2 migration it became a false label on a correct, unchanged
// value — `offsetNs` has always been the raw absolute epoch, never an offset
// from the catalogue. No consumer branches on this string (grepped: only
// `.offsetNs` is read back by parseDate/round-trip tests and bookmark URLs);
// it is diagnostic/display only, so relabelling it carries no migration risk
// and does not warrant a TIME_VERSION bump — the algorithm and the value are
// both unchanged, only this description of them is corrected.
export function dateRecord(date: bigint) { return {version:TIME_VERSION, reference:'big-bang', offsetNs:date.toString(), branchId:'baseline'}; }
export function phaseAt(time: OrbitTime, angularSpeed: number): number {
  if (typeof time === 'number') return angularSpeed * time;
  if (!Number.isFinite(angularSpeed) || angularSpeed <= 0) return 0;
  const period=BigInt(Math.max(1,Math.round(2*Math.PI/angularSpeed*1e9)));
  const remainder=((time%period)+period)%period;
  return Number(remainder)/Number(period)*2*Math.PI;
}
/** Same Euclidean-modulo pattern as `phaseAt`, with the period supplied
 * directly instead of derived from an angular speed (contract §4.4) — used
 * by spin/day-night, which are seeded with a period, not a speed. */
export function phaseFromPeriod(elapsedNs: Ns, periodNs: bigint, phase0 = 0): number {
  const twoPi = 2 * Math.PI;
  if (periodNs <= 0n) return ((phase0 % twoPi) + twoPi) % twoPi;
  const remainder = ((elapsedNs % periodNs) + periodNs) % periodNs;
  const raw = Number(remainder) / Number(periodNs) * twoPi + phase0;
  return ((raw % twoPi) + twoPi) % twoPi;
}
export function advanceDate(date: bigint, seconds: number, rate=1): bigint {
  if (!Number.isFinite(seconds*rate)) throw new Error('Invalid clock increment');
  return date+BigInt(Math.round(seconds*rate*1e9));
}
