/**
 * Package D (Time-Navigation UI) — pure helpers, no DOM/Three.js/wall-clock.
 * docs/time-and-coordinates-contract.md §3 (navigation), §6.2 (migration),
 * §6.4 (acceptance tests). `src/main.ts` wires these into the page; keeping
 * them here (instead of inline in main.ts) is what makes them unit-testable
 * per the task's own instruction to "extract pure helpers ... rather than
 * testing the DOM".
 *
 * Every function here is a pure function of its arguments: no reads of
 * `Date.now()`/`performance.now()`, no module-level mutable state, so the
 * t-seek-independence property (contract §1.2 rule 2, §6.4 test 3) holds by
 * construction — computing at some `t` directly always agrees with reaching
 * that same `t` through any sequence of `advancePlayback` calls.
 */
import { CATALOGUE_EPOCH_NS, UNIVERSE_END_NS, YEAR_NS, NS, parseDate, advanceDate, type Ns } from './world-time.ts';
import { ERA_CHECKPOINTS, type EraCheckpoint, lnScaleFactorAt, properDistanceLn } from './cosmology.ts';
import { cosmicBackgroundAt } from './cosmic-background.ts';
import { TIME_VERSION } from './world-time.ts';
import { ADDRESS_VERSION, type WorldVersions } from './address.ts';
import { COSMOLOGY_VERSION } from './cosmology.ts';
import { VERSION as CATALOG_VERSION } from './catalog.ts';
import { HISTORY_VERSION } from './world-history.ts';
import { SURFACE_VERSION, BIOSPHERE_QUERY_VERSION } from './world-surface.ts';
import { BACKGROUND_VERSION } from './cosmic-background.ts';
import { PRIMORDIAL_POPULATION_VERSION } from './primordial-population.ts';
import { FUTURE_SCENARIO_VERSION,ALTERNATE_FATE_VERSION } from './future-scenario.ts';
import { OBSERVED_SKY_VERSION } from './observed-sky.ts';
import { STELLAR_COHORT_VERSION } from './stellar-cohorts.ts';
import { CMB_FIELD_VERSION } from './cmb-field.ts';
import { SURFACE_CELL_VERSION } from './surface-cell.ts';
import { TERRAIN_VERSION } from './terrain.ts';
import { BIOSPHERE_VERSION } from './biosphere-model.ts';
import { GALAXY_HISTORY_VERSION } from './galaxy-history.ts';
import { INLAND_RIVERS_UNAVAILABLE, INLAND_RIVERS_UNAVAILABLE_NOTICE } from './inland-rivers.ts';
import { BIOME_VERSION, SURVEY_VERSION } from './surface-biomes.ts';
import { CLIMATE_VERSION } from './surface-climate.ts';
import { HABITAT_SUITABILITY_VERSION } from './habitat-suitability.ts';

/** The build's current WorldVersions bundle (contract §1.3) — threaded
 * through every save/bookmark/URL per requirement 6. */
export const CURRENT_VERSIONS: WorldVersions = {
  time: TIME_VERSION,
  space: ADDRESS_VERSION,
  cosmology: COSMOLOGY_VERSION,
  catalog: CATALOG_VERSION,
  history: HISTORY_VERSION,
  surface: SURFACE_VERSION,
  terrain: TERRAIN_VERSION,
  biosphere: BIOSPHERE_VERSION,
  galaxyHistory: GALAXY_HISTORY_VERSION,
};
/** Data-model identity includes compositions not represented by legacy wv. */
export const MODEL_MANIFEST_ID = [
  ...Object.values(CURRENT_VERSIONS),BACKGROUND_VERSION,
  BIOSPHERE_QUERY_VERSION,PRIMORDIAL_POPULATION_VERSION,STELLAR_COHORT_VERSION,
  FUTURE_SCENARIO_VERSION,ALTERNATE_FATE_VERSION,OBSERVED_SKY_VERSION,CMB_FIELD_VERSION,SURFACE_CELL_VERSION,
  // 2026-10 biome-climate increment: the classifier, its climate field, the
  // habitat evaluation and the survey change what a bookmark lands on.
  BIOME_VERSION,CLIMATE_VERSION,HABITAT_SUITABILITY_VERSION,SURVEY_VERSION,
].join('|');
/** Consumer changes can affect a bookmark without changing generator data.
 * 2026-09-28: river/drainage navigation and rendering withdrawn.
 * 2026-10: climate-driven snow, forest window and labels (biome-climate-1). */
export const BUILD_VERSION = 'atlas-client-2026-10-biome-climate-1';

// ---------------------------------------------------------------------------
// §3.2 playback tiers.
// ---------------------------------------------------------------------------

export type TierId = 'realtime' | 'orbital' | 'historical' | 'geological' | 'cosmic';
const YEAR_S = 31_557_600; // matches world-time.ts's YEAR_NS (Julian year)
export const PLAYBACK_TIERS: { id: TierId; label: string; rate: number; hint: string }[] = [
  { id: 'realtime', label: 'Realtime', rate: 1, hint: 'spin & day-night' },
  { id: 'orbital', label: 'Orbital', rate: 86400 * 30, hint: 'in-system orbits' },
  { id: 'historical', label: 'Historical', rate: 1e6 * YEAR_S, hint: 'planet cooling, speciation' },
  { id: 'geological', label: 'Geological', rate: 1e9 * YEAR_S, hint: 'galaxy formation & mergers' },
  { id: 'cosmic', label: 'Cosmic', rate: 1e21, hint: 'toward the degenerate & black-hole eras' },
];
export function tierRate(tier: TierId): number {
  return PLAYBACK_TIERS.find((t) => t.id === tier)?.rate ?? PLAYBACK_TIERS[1].rate;
}

/** `advanceDate` wrapped with the §3.2 saturation guard: a `dt*rate` product
 * that would compute `Infinity` (e.g. a huge `dt` after a backgrounded tab at
 * the Cosmic tier) saturates to the declared ceiling instead of throwing.
 * Result is always clamped into the declared navigable range `[0n,
 * UNIVERSE_END_NS)` (contract §2.1). */
export function advancePlayback(t: Ns, dtSeconds: number, tier: TierId): Ns {
  const rate = tierRate(tier);
  const boundedSeconds = Number.isFinite(dtSeconds) ? Math.max(0, dtSeconds) : 0;
  const product = boundedSeconds * rate;
  let next: Ns;
  if (!Number.isFinite(product)) {
    next = t >= 0n ? UNIVERSE_END_NS : t; // saturate forward only; never throw
  } else {
    next = advanceDate(t, boundedSeconds, rate);
  }
  if (next > UNIVERSE_END_NS) next = UNIVERSE_END_NS;
  if (next < 0n) next = 0n;
  return next;
}

// ---------------------------------------------------------------------------
// §3.1 coarse era selector.
// ---------------------------------------------------------------------------

/** Index of the largest checkpoint with `tNs <= t` (mirrors `eraAt`, but
 * returns the index so callers can find neighbours for the fine control). */
export function eraIndexAt(t: Ns): number {
  let idx = 0;
  for (let i = 0; i < ERA_CHECKPOINTS.length; i++) {
    if (t >= ERA_CHECKPOINTS[i].tNs) idx = i;
    else break;
  }
  return idx;
}
export function eraCheckpoint(idx: number): EraCheckpoint {
  return ERA_CHECKPOINTS[Math.max(0, Math.min(ERA_CHECKPOINTS.length - 1, idx))];
}
export function nextEraCheckpoint(t: Ns): EraCheckpoint {
  return eraCheckpoint(eraIndexAt(t) + 1);
}
export function prevEraCheckpoint(t: Ns): EraCheckpoint {
  const idx = eraIndexAt(t);
  // Already past the current era's own checkpoint: "back" returns to its
  // start rather than skipping a whole era on one press.
  return t > ERA_CHECKPOINTS[idx].tNs ? ERA_CHECKPOINTS[idx] : eraCheckpoint(idx - 1);
}

/** `sign(t) * log10(1 + years(t))`-style track position for placing the era
 * ticks along a single visual scrubber (contract §3.1's description of how
 * the era selector is laid out) — monotonically increasing in `t`, used only
 * for tick placement/visual proportion, never for seeking directly (seeking
 * always goes through a checkpoint's own `tNs` or the fine control below). */
export function eraTrackFraction(t: Ns): number {
  const totalYears = Number(UNIVERSE_END_NS / YEAR_NS);
  const years = Math.max(0, Number(t / YEAR_NS));
  const logSpan = Math.log10(1 + totalYears);
  return logSpan <= 0 ? 0 : Math.min(1, Math.log10(1 + years) / logSpan);
}

// ---------------------------------------------------------------------------
// §3.1 fine linear control within the selected era.
// ---------------------------------------------------------------------------

const FOURTEEN_GYR_NS = 14_000_000_000n * YEAR_NS;
export type FineUnit = 'year' | 'log';
export type FineRange = { lo: Ns; hi: Ns; unit: FineUnit };

/** The fine-control bounds for era `idx`. Ordinary eras get a plain linear
 * window `[checkpoint, nextCheckpoint)`; the catalogue-epoch era (where most
 * exploration happens) instead gets the contract's explicit "life-sized band"
 * override, a linear ±14 Gyr window around `CATALOGUE_EPOCH_NS`, clamped to
 * its neighbouring checkpoints so it never overlaps them; the one
 * astronomically-wide final era (black-hole -> heat-death, 1e40 -> 1e100 yr)
 * is deliberately logarithmic — a linear slider across 60 orders of magnitude
 * is not a usable control, and the contract itself treats that whole band as
 * an "explanatory placeholder", so log resolution there costs nothing real. */
export function fineRangeForEra(idx: number): FineRange {
  const cp = eraCheckpoint(idx);
  const next = eraCheckpoint(idx + 1);
  const prev = eraCheckpoint(idx - 1);
  if (cp.id === 'catalogue-epoch') {
    const lo = cp.tNs - FOURTEEN_GYR_NS > prev.tNs ? cp.tNs - FOURTEEN_GYR_NS : prev.tNs;
    const hi = cp.tNs + FOURTEEN_GYR_NS < next.tNs ? cp.tNs + FOURTEEN_GYR_NS : next.tNs;
    return { lo, hi, unit: 'year' };
  }
  if (cp.id === 'black-hole-era') return { lo: cp.tNs, hi: next.tNs, unit: 'log' };
  return { lo: cp.tNs, hi: idx === ERA_CHECKPOINTS.length - 1 ? cp.tNs : next.tNs, unit: 'year' };
}
export function fineFractionToT(idx: number, fraction: number): Ns {
  const { lo, hi, unit } = fineRangeForEra(idx);
  const f = Math.max(0, Math.min(1, fraction));
  if (hi <= lo || f <= 0) return lo;
  if (f >= 1) return hi; // exact endpoints — avoids float round-trip drift past `hi`
  if (unit === 'log') {
    const lnLo = Math.log(Number(lo) / Number(YEAR_NS));
    const lnHi = Math.log(Number(hi) / Number(YEAR_NS));
    const years = Math.exp(lnLo + (lnHi - lnLo) * f);
    const t = BigInt(Math.round(years)) * YEAR_NS;
    return t > hi ? hi : t < lo ? lo : t;
  }
  const span = hi - lo;
  const t = lo + BigInt(Math.round(Number(span) * f));
  return t > hi ? hi : t < lo ? lo : t; // clamp: Number(span) is lossy for a multi-Gyr-in-ns BigInt
}
export function tToFineFraction(idx: number, t: Ns): number {
  const { lo, hi, unit } = fineRangeForEra(idx);
  if (t <= lo) return 0;
  if (t >= hi) return 1;
  if (unit === 'log') {
    const lnLo = Math.log(Number(lo) / Number(YEAR_NS));
    const lnHi = Math.log(Number(hi) / Number(YEAR_NS));
    const lnT = Math.log(Number(t) / Number(YEAR_NS));
    return lnHi <= lnLo ? 0 : (lnT - lnLo) / (lnHi - lnLo);
  }
  return Number(t - lo) / Number(hi - lo);
}

// ---------------------------------------------------------------------------
// §6.2 compatibility requirement 3: URL migration shim.
// ---------------------------------------------------------------------------

const VERSION_FIELDS: (keyof WorldVersions)[] = [
  'time', 'space', 'cosmology', 'catalog', 'history', 'surface', 'terrain', 'biosphere', 'galaxyHistory',
];
/** Field order used before `galaxyHistory` was added to `WorldVersions`
 * (contract §1.3). A `wv` string written by a build prior to that change has
 * exactly this many comma-separated fields, in this order. Kept so
 * `decodeVersions` can still recognize such a string as a *current*
 * (`atlas-time-2`-era) bundle that is simply missing the new slot, rather
 * than failing to parse and falling through to `resolveTimeFromUrl`'s
 * pre-`atlas-time-2` legacy branch — which would silently re-offset an
 * already-absolute `date` value against `CATALOGUE_EPOCH_NS` a second time. */
const VERSION_FIELDS_PRE_GALAXY_HISTORY: (keyof WorldVersions)[] = [
  'time', 'space', 'cosmology', 'catalog', 'history', 'surface', 'terrain', 'biosphere',
];
/** Compact, order-preserving encoding of a `WorldVersions` bundle for a URL
 * query param. `URLSearchParams` already percent-encodes the whole value, so
 * no per-field escaping is needed as long as no version string itself
 * contains the `,` delimiter (true of every version constant in this
 * codebase today). */
export function encodeVersions(v: WorldVersions): string {
  return VERSION_FIELDS.map((k) => v[k]).join(',');
}
export function decodeVersions(s: string): WorldVersions | null {
  const parts = s.split(',');
  if (parts.length === VERSION_FIELDS.length) {
    const out = {} as WorldVersions;
    VERSION_FIELDS.forEach((k, i) => { out[k] = parts[i]; });
    return out;
  }
  if (parts.length === VERSION_FIELDS_PRE_GALAXY_HISTORY.length) {
    const out = {} as WorldVersions;
    VERSION_FIELDS_PRE_GALAXY_HISTORY.forEach((k, i) => { out[k] = parts[i]; });
    out.galaxyHistory = ''; // unknown — this bundle predates the slot, not a value to guess at
    return out;
  }
  return null;
}

/**
 * Contract §6.2 requirement 3, adapted to this codebase's actual URL key
 * (which has always been `date`, carrying what the contract calls
 * "`epoch=<n>`" — an offset from the catalogue reference date under the old,
 * catalogue-epoch-origin clock): `date=<n>` is migrated to `t =
 * CATALOGUE_EPOCH_NS + n` whenever the URL's `WorldVersions.time` is absent
 * or `atlas-time-1`; a URL already carrying `wv=...,atlas-time-2,...` (this
 * module's own `time` field, written by `persist`) is parsed as an absolute
 * `t` with no offset. An absent `date` altogether (every pre-4D-contract URL
 * that never visited a non-default date) resolves to `CATALOGUE_EPOCH_NS`,
 * the declared default landing point, under both interpretations at once.
 */
export function resolveTimeFromUrl(params: URLSearchParams): Ns {
  const raw = params.get('date');
  if (raw == null) return CATALOGUE_EPOCH_NS;
  let value: Ns;
  try {
    value = parseDate(raw);
  } catch {
    return CATALOGUE_EPOCH_NS;
  }
  const wv = params.get('wv');
  const decoded = wv ? decodeVersions(wv) : null;
  const legacy = !decoded || !decoded.time || decoded.time === 'atlas-time-1';
  let t = legacy ? CATALOGUE_EPOCH_NS + value : value;
  if (t > UNIVERSE_END_NS) t = UNIVERSE_END_NS;
  if (t < 0n) t = 0n;
  return t;
}
/** Writes the current `t` and the full `WorldVersions` bundle into `params`
 * (mutates in place), matching `resolveTimeFromUrl`'s own encoding so a
 * freshly-written URL always round-trips to the same instant. Only omits
 * `date` when `t` is exactly the default landing point, to keep the common
 * "at the reference date" URL uncluttered (matches the pre-existing
 * behaviour of never writing `date` for the default). */
export function writeTimeToUrl(params: URLSearchParams, t: Ns): void {
  if (t !== CATALOGUE_EPOCH_NS) params.set('date', t.toString());
  else params.delete('date');
  params.set('wv', encodeVersions(CURRENT_VERSIONS));
  params.set('mv', MODEL_MANIFEST_ID);
  params.set('bv', BUILD_VERSION);
}

/** A legacy `river=` parameter (written by builds that rendered inland
 * rivers) is never restored: the body opens in its ordinary view and the
 * river notice leads, followed by any model-version notice. */
export function compatibilityNoticeFromUrl(params:URLSearchParams):string|null {
  const model=modelCompatibilityNotice(params,!params.has('river'));
  if(!params.has('river'))return model;
  return model?`${INLAND_RIVERS_UNAVAILABLE_NOTICE} ${model}`:INLAND_RIVERS_UNAVAILABLE_NOTICE;
}
function modelCompatibilityNotice(params:URLSearchParams,explainRivers:boolean):string|null {
  const oldBundle=params.get('wv');
  if(!oldBundle)return null;
  const decoded=decodeVersions(oldBundle);
  if(!decoded)return 'This bookmark has an unrecognized world-version record. Its scenery may differ from the saved view.';
  const differences=(Object.keys(CURRENT_VERSIONS) as (keyof WorldVersions)[])
    .filter(key=>decoded[key]!==CURRENT_VERSIONS[key]);
  // terrain-1.6.0/atlas-surface-7 withdrew inland rivers and their lakes.
  const riverNote=explainRivers&&(differences.includes('terrain')||differences.includes('surface'))?` ${INLAND_RIVERS_UNAVAILABLE}`:'';
  if(differences.length)return `This bookmark uses older ${differences.join(', ')} model versions.${riverNote} Its world may look different.`;
  if(params.get('mv')!==MODEL_MANIFEST_ID)return 'This bookmark predates the current combined model. Planet and life details may differ.';
  if(params.get('bv')!==BUILD_VERSION)return 'This bookmark was viewed with a different Atlas build. Presentation may differ.';
  return null;
}

// ---------------------------------------------------------------------------
// §3.3 grounded seek policy.
// ---------------------------------------------------------------------------

export type GroundedSeekContext = {
  galaxyExists: boolean;
  starExists: boolean;
  /** True once the planet/moon itself is not gone (not `engulfed`); a body
   * that is merely `unformed`/`accreting`/`molten` still counts as "exists"
   * here in the sense of "has an address worth showing" — `planetWalkable`
   * is what actually decides whether to offer landing. */
  planetExists: boolean;
  planetWalkable: boolean;
  engulfed: boolean;
};
export type GroundedSeekResult = {
  scope: 'body' | 'system' | 'galaxy' | 'universe';
  hover: boolean;
  announce: string;
};
/** Pure decision function for contract §3.3: seeking while grounded always
 * drops to observation hover first (the caller's job, unconditional); this
 * decides which scope is actually still valid to show at the new `t`, and
 * the message to announce. Falls back to the nearest still-existing
 * ancestor scope rather than ever hovering over nothing. */
export function groundedSeekFallback(ctx: GroundedSeekContext): GroundedSeekResult {
  if (!ctx.galaxyExists) {
    return { scope: 'universe', hover: false, announce: 'This galaxy has not formed yet at this date — showing the universe.' };
  }
  if (!ctx.starExists) {
    return { scope: 'galaxy', hover: false, announce: "This system's star has not formed yet at this date — showing the galaxy." };
  }
  if (ctx.engulfed) {
    return { scope: 'system', hover: false, announce: 'This world has been engulfed by its star at this date — showing the system.' };
  }
  if (!ctx.planetExists) {
    return { scope: 'system', hover: false, announce: 'This world has not formed yet at this date — showing the system.' };
  }
  if (!ctx.planetWalkable) {
    return { scope: 'body', hover: true, announce: 'This world is not yet solid ground at this date — hovering in orbit.' };
  }
  return { scope: 'body', hover: true, announce: 'Date changed in observation hover. Land again when ready.' };
}

// ---------------------------------------------------------------------------
// §2.6 / §4.1: horizon-safe scale factor and galaxy visibility gating.
// ---------------------------------------------------------------------------

/** `exp(lnScaleFactorAt(t))`, i.e. `scaleFactorAt(t)` computed via the
 * saturation-free log-space path (contract §4.1's own guidance: any renderer
 * transform MUST go through `lnScaleFactorAt`/`scaleRatio`/`properDistanceLn`
 * at very late dates. Clamps well below double overflow so ordinary
 * Mpc-to-meter conversion also remains finite. This is a render adapter;
 * physical late distances must be read in logarithmic form. */
export function safeScaleFactorAt(t: Ns): number {
  const ln = lnScaleFactorAt(t);
  if (!Number.isFinite(ln)) return ln === -Infinity ? 0 : 1; // t=0n: a(0)=0 exactly
  return Math.exp(Math.min(ln, 600));
}

export type GalaxyVisibility = { visible: boolean; aFactor: number; properDistanceMpc: number };
/** Particle-horizon membership for an optional observational mode. This is
 * deliberately separate from the main simultaneous-date catalogue view and
 * still does not calculate a past light cone or observed brightness. */
export function galaxyVisibility(comovingDistanceMpc: number, t: Ns): GalaxyVisibility {
  const aFactor = safeScaleFactorAt(t);
  if (!(comovingDistanceMpc >= 0) || !Number.isFinite(comovingDistanceMpc)) {
    return { visible: false, aFactor, properDistanceMpc: 0 };
  }
  if (comovingDistanceMpc === 0) return { visible: true, aFactor, properDistanceMpc: 0 };
  const horizon = cosmicBackgroundAt(t).comovingParticleHorizonMpc;
  const lnProper = properDistanceLn(comovingDistanceMpc, t);
  const visible = comovingDistanceMpc <= horizon;
  return { visible, aFactor, properDistanceMpc: visible ? Math.exp(Math.min(lnProper,600)) : Infinity };
}

// ---------------------------------------------------------------------------
// §6.4 acceptance-test support: canonical digest.
// ---------------------------------------------------------------------------

/** BigInt-safe canonical JSON (matches tests/canonical-json.mjs's shape,
 * duplicated here in ~10 lines rather than shared, since this module ships
 * to the browser and tests/ does not): sorts object keys so field order can
 * never affect the digest. Used both by tests here and by `main.ts`'s
 * `window.__atlas.existenceDigest` live diagnostic, so the exact same digest
 * function backs the unit test and the running app. */
export function canonicalDigest(value: unknown): string {
  const sortKeys = (v: unknown): unknown => {
    if (typeof v === 'bigint') return v.toString() + 'n';
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>).sort()) out[k] = sortKeys((v as Record<string, unknown>)[k]);
      return out;
    }
    return v;
  };
  return JSON.stringify(sortKeys(value));
}

export { NS };
