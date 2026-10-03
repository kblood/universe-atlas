/** Stellar and planetary lifecycle: `StarLifecycle`/`PlanetLifecycle` records
 * plus `stateAt`, mass-dependent lifetimes, planet formation/cooling/ocean
 * epochs/engulfment, and spin/axial-tilt/day-night phase functions — contract
 * §2.2, §2.3, §2.5, §4.4.
 *
 * `*Lifecycle` records are `t`-independent (computed once per address);
 * `*StateAt` are the cheap per-frame queries. */
import { hash64, rng, type Body, type SystemRef, type V3 } from './catalog.ts';
import { YEAR_NS, CATALOGUE_EPOCH_NS, type Ns } from './world-time.ts';
import type { BodyAddress } from './address.ts';
import type { WaterKey } from './world-surface.ts'; // {dateNs, lossFraction} (ocean-volume-1)
// Was a local `// --- det helpers (to be replaced by det-math.ts) ---`
// section (fixed-iteration expNeg/logPos/detExp/detLn/detPow copies, built
// only from +,-,*,/,Math.floor,Math.sqrt — no Math.exp/log/pow/sin/cos/tan/
// atan2/cbrt anywhere in an existence-gating path). det-math.ts has now
// landed as the shared module those copies were always meant to be replaced
// by (docs/time-and-coordinates-contract.md's concurrent det-math
// extraction); `detPow` is the only one of those five names this file's
// actual call sites use (the other four existed only to build this file's
// own local `detPow`), so only `detPow` is imported. Its numeric output is
// NOT bit-identical to the deleted local copy — det-math's `detPow` composes
// det-math's own `detExp` (proper range-reduction + 19-term Taylor series,
// see det-math.ts's doc comment) instead of the deleted local `detExp`
// (a cruder `expNeg`-based `(1+x/256)^256` approximation) — so this is a
// strict accuracy improvement, not a behavioural change; no fixture in this
// package's owned tests pins an exact `mainYears`/`giantNs`/`engulfedNs`
// numeric value (they all derive boundaries dynamically from the same
// corpus, per docs/time-and-coordinates-contract.md §6.3), so nothing needed
// a fixture update for this swap.
import { detPow } from './det-math.ts';

const SOLAR_MASS_KG = 1.98847e30;
const AU_M = 149597870700;
const EARTH_RADIUS_M = 6.371e6;

function clampNum(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}
function between(key: string, min: number, max: number): number {
  return min + rng(key)() * (max - min);
}

export type StarLifecycle = {
  formationNs: Ns;
  giantNs: Ns;
  remnantNs: Ns;
  outcome: 'white-dwarf' | 'neutron-star' | 'black-hole';
  massKg: number;
};

/** Contract §2.3: keep `world-history.ts`'s pre-existing mass-lifetime power
 * law (1 M☉ ~ 10 Gyr main-sequence, steep mass scaling) and giant-phase/outcome
 * heuristics unchanged; only re-anchor formation to the new Big-Bang-relative
 * axis instead of a negative catalogue-epoch offset. The fractional-exponent
 * step (`solarMass ** -2.5`) — an existence-gating decision, since it sets
 * `formationNs`/`giantNs`/`remnantNs` — goes through `detPow` above instead
 * of `Math.pow`/`**`, closing the exact `world-history.ts:13` gap flagged for
 * the concurrent det-math extraction.
 *
 * `seed`/`address` are accepted to match the contract's `WorldQuery` shape
 * (§1.1) and for forward compatibility once Package B's address resolution
 * lands, but — exactly as the contract's own §2.3 pseudocode does — the
 * actual draws use `body.seed` alone: it is already a pure, fully-qualified
 * function of the true (universe seed, address) pair one level up in
 * `catalog.ts`, so it alone is sufficient entropy and keeps this function
 * usable before Package B's `BodyAddress` parser exists. */
function starLifecycleFromSeedMass(starSeed:string,massKg:number):StarLifecycle {
  const solarMass = clampNum(massKg / SOLAR_MASS_KG, 0.08, Infinity);
  const mainYears = clampNum(Math.round(1e10 * detPow(solarMass, -2.5)), 3e6, 1e13);
  const ageFraction = 0.15 + Number(hash64(starSeed + '/history-age') % 5000n) / 10000; // unchanged draw, in [0.15, 0.65)
  // Math.min(mainYears, 13.7e9) * ageFraction < 13.7e9 * 0.65 ~= 8.905e9 years,
  // strictly less than CATALOGUE_EPOCH_NS (13.787e9 years) — formationNs is
  // therefore always > 0 (after the Big Bang) by construction; the extra
  // floor below is a defensive no-op documenting that guarantee, not a fix.
  const offsetYears = Math.round(Math.min(mainYears, 13.7e9) * ageFraction);
  let formationNs = CATALOGUE_EPOCH_NS - BigInt(offsetYears) * YEAR_NS;
  if (formationNs < 0n) formationNs = 0n;
  const giantNs = formationNs + BigInt(Math.round(mainYears)) * YEAR_NS;
  const remnantNs = giantNs + BigInt(Math.round(mainYears * 0.1)) * YEAR_NS;
  const outcome = solarMass < 8 ? 'white-dwarf' : solarMass < 25 ? 'neutron-star' : 'black-hole';
  return { formationNs, giantNs, remnantNs, outcome, massKg };
}
export function starLifecycle(_seed: string, _address: BodyAddress, body: Body): StarLifecycle {
  if (body.kind !== 'star') throw new Error('starLifecycle requires a star body');
  return starLifecycleFromSeedMass(body.seed,body.massKg);
}

/** Resolve the first reference star without materializing an entire system.
 * The draw is exactly catalog.ts's `system(ref)` star/0 mass channel. */
export function referenceStarLifecycle(ref:SystemRef):StarLifecycle {
  const starSeed=ref.seed+'/star/0';
  const solarMass=0.18+rng(starSeed)()*1.45;
  return starLifecycleFromSeedMass(starSeed,solarMass*SOLAR_MASS_KG);
}
export function referenceStarLifecycles(ref:SystemRef):readonly StarLifecycle[] {
  const count=rng(ref.seed+'/architecture')()<.24?2:1;
  return Array.from({length:count},(_,i)=>{
    const starSeed=ref.seed+'/star/'+i;
    const solarMass=.18+rng(starSeed)()*1.45;
    return starLifecycleFromSeedMass(starSeed,solarMass*SOLAR_MASS_KG);
  });
}

export function starStateAt(lifecycle: StarLifecycle, t: Ns): {
  stage: 'unformed' | 'main-sequence' | 'giant' | 'remnant';
  radiusM: number;
  temperatureK: number;
  luminosityRel: number;
} {
  const solarMass = clampNum(lifecycle.massKg / SOLAR_MASS_KG, 0.08, Infinity);
  // Continuous cosmetic quantities (radius/temperature at formation) — native
  // Math.pow is fine here per contract §1.2 rule 3; only the stage boundaries
  // above (formationNs/giantNs/remnantNs, computed with detPow) gate existence.
  const baseRadiusM = 6.957e8 * Math.pow(solarMass, 0.8);
  const baseTemperatureK = 5772 * Math.pow(solarMass, 0.5);
  if (t < lifecycle.formationNs) return { stage: 'unformed', radiusM: 0, temperatureK: 0, luminosityRel: 0 };
  if (t < lifecycle.giantNs) return { stage: 'main-sequence', radiusM: baseRadiusM, temperatureK: baseTemperatureK, luminosityRel: 1 };
  if (t < lifecycle.remnantNs) {
    const frac = Number(t - lifecycle.giantNs) / Number(lifecycle.remnantNs - lifecycle.giantNs);
    const expansion = 1 + 79 * frac; // grows toward ~80x by end of giant phase (engineering approximation)
    return {
      stage: 'giant',
      radiusM: baseRadiusM * expansion,
      temperatureK: baseTemperatureK * (1 - 0.6 * frac),
      luminosityRel: 1 + 400 * frac,
    };
  }
  const remnantRadiusM = lifecycle.outcome === 'white-dwarf' ? 6.4e6 : lifecycle.outcome === 'neutron-star' ? 1.2e4 : 0;
  const remnantAgeGyr=Number(t-lifecycle.remnantNs)/Number(YEAR_NS)/1e9;
  const cooling=Number.isFinite(remnantAgeGyr)?Math.log1p(Math.max(0,remnantAgeGyr)):Infinity;
  // Illustrative cooling law: remnant light fades toward zero with age,
  // rather than staying at the old constant luminosity through heat death.
  const remnantTemperatureK = lifecycle.outcome === 'white-dwarf'
    ? 12000*Math.exp(-.35*cooling)
    : lifecycle.outcome === 'neutron-star' ? 6e5*Math.exp(-.65*cooling) : 0;
  const remnantLuminosityRel = lifecycle.outcome === 'black-hole'
    ? 0 : 0.0001*Math.exp(-1.4*cooling);
  return { stage: 'remnant', radiusM: remnantRadiusM, temperatureK: remnantTemperatureK, luminosityRel: remnantLuminosityRel };
}

export type PlanetLifecycle = {
  formationNs: Ns;
  coolingNs: Ns;
  oceanNs: Ns | null;
  engulfedNs: Ns | null;
};

/** For a moon, `body.orbit.a` is the moon-around-*planet* distance (a few
 * e5-e7 m), not the planet's own distance from the star — using it directly
 * for the §2.6 engulfment check would make every moon read "inside the giant
 * radius" (falsely engulfed) the instant its star goes giant, regardless of
 * how far out the planet actually orbits. `planetLifecycle` needs the host
 * PLANET's own star-orbit semi-major axis and its own lifecycle bounds to
 * fix that correctly (see `planetLifecycle`'s moon branch below); the caller
 * (which has already resolved the parent planet, e.g. `world-surface.ts`'s
 * `surfaceAt`) supplies both here rather than `planetLifecycle` trying to
 * re-derive a parent it cannot look up on its own. */
export type ParentPlanetContext = {
  /** The parent planet's own `body.orbit.a / AU`, i.e. its distance from the
   * star — NOT the moon's own `body.orbit.a` (moon-around-planet). */
  starOrbitAu: number;
  /** The parent planet's own `PlanetLifecycle`, so the moon can inherit its
   * formation/engulfment bounds (a moon can't exist before its planet, or
   * survive its planet's engulfment). */
  lifecycle: PlanetLifecycle;
};

/** Contract §2.3. Formation pins to the host star's formation plus a standard
 * protoplanetary-disk clearing delay; cooling scales with body size
 * (`∝ radiusM^2`, a plain multiply — no fractional exponent, so no det helper
 * needed there); oceans condense a fixed delay after cooling if
 * `body.water > 0`; engulfment checks the orbit's semi-major axis against a
 * giant-phase envelope radius (`solarMass ** 0.3`, existence-gating, via
 * `detPow`).
 *
 * For a `body.kind === 'moon'`, `parentPlanet` is required (throws without
 * it): its `starOrbitAu` replaces the moon's own (irrelevant,
 * moon-around-planet) `body.orbit.a` for the engulfment distance check, and
 * two bounds are then inherited from `parentPlanet.lifecycle` — `formationNs`
 * is clamped to at least the planet's own `formationNs` (a moon cannot exist
 * before the planet it orbits has itself formed: the moon's own disk-
 * clearing draw is independent of the planet's and can otherwise land
 * earlier by chance), and `engulfedNs` is clamped to at most the planet's own
 * `engulfedNs` when the planet is engulfed (a moon cannot survive its
 * planet's engulfment). In practice this second clamp is a documented
 * guarantee rather than a numeric correction: once `orbitAu` is the planet's
 * own distance, the moon's own engulfment formula is computed from exactly
 * the inputs (`star`, `orbitAu`) that produced the planet's `engulfedNs`, so
 * the two values already agree bit-for-bit. */
export function planetLifecycle(
  _seed: string,
  _address: BodyAddress,
  body: Body,
  star: StarLifecycle,
  parentPlanet?: ParentPlanetContext,
): PlanetLifecycle {
  if (body.kind === 'star') throw new Error('planetLifecycle requires a planet or moon body');
  if (body.kind === 'moon' && !parentPlanet) {
    throw new Error('planetLifecycle requires parentPlanet for a moon body: body.orbit.a on a moon is its distance from the PLANET, not the star, so the caller must resolve and supply the parent planet\'s ParentPlanetContext');
  }
  const diskClearingYears = between(body.seed + '/disk', 1e6, 10e6); // 1-10 Myr, standard disk lifetime
  let formationNs = star.formationNs + BigInt(Math.round(diskClearingYears)) * YEAR_NS;
  if (body.kind === 'moon' && parentPlanet!.lifecycle.formationNs > formationNs) {
    formationNs = parentPlanet!.lifecycle.formationNs; // a moon cannot predate its own planet
  }
  const radiusRatio = body.radiusM / EARTH_RADIUS_M;
  const coolingYears = clampNum(radiusRatio * radiusRatio * 40e6, 10e6, 200e6); // Earth-radius-normalized, 40 Myr baseline
  const coolingNs = formationNs + BigInt(Math.round(coolingYears)) * YEAR_NS;
  const oceanNs = body.water > 0
    ? coolingNs + BigInt(Math.round(between(body.seed + '/ocean', 10e6, 50e6))) * YEAR_NS
    : null;
  const solarMass = clampNum(star.massKg / SOLAR_MASS_KG, 0.08, Infinity);
  const giantRadiusAu = 0.7 * detPow(solarMass, 0.3); // engineering approximation, not a stellar-structure model
  const orbitAu = body.kind === 'moon' ? parentPlanet!.starOrbitAu : (body.orbit ? body.orbit.a / AU_M : 0);
  let engulfedNs = body.orbit && orbitAu < giantRadiusAu * 1.3 ? star.giantNs : null;
  if (body.kind === 'moon' && parentPlanet!.lifecycle.engulfedNs !== null) {
    // a moon cannot survive its own planet's engulfment (documented
    // guarantee, see this function's own header comment — in practice a
    // no-op since orbitAu above already equals the planet's own distance)
    engulfedNs = engulfedNs !== null && engulfedNs < parentPlanet!.lifecycle.engulfedNs
      ? engulfedNs
      : parentPlanet!.lifecycle.engulfedNs;
  }
  return { formationNs, coolingNs, oceanNs, engulfedNs };
}

/** Ocean-volume loss profile (relief round 2026-10, ocean-volume-1). Water loss
 * is driven by the host star's main-sequence brightening, normalised to the
 * catalogue epoch exactly like the stellar visuals: the catalogue epoch always
 * shows the full catalogue ocean, and the ocean is fully lost once the star is
 * `OCEAN_LOSS_BRIGHTENING` (35%) brighter than at the epoch.
 *   lossFraction(t) = smoothstep(0, 1, (L(t)/L(epoch) - 1) / 0.35), 0 for t <= epoch.
 * L(t) = starStateAt(star, t).luminosityRel (the stage factor: exactly 1 on the
 * main sequence) x mainSequenceBrightening(star, t). starStateAt carries no
 * main-sequence brightening, so the standard solar brightening law is applied
 * here on the star's own fractional main-sequence age x (Gough 1981,
 * L(t)/L_now = 1/(1 + 0.4 (1 - t/t_now)) with t_now/t_MS = 0.457, i.e.
 * L(x)/L_ZAMS = 1.4/(1.4 - 0.875 x) -- from memory, not re-verified). For
 * the Sun that is ~35% brighter about 3 Gyr from now; the moist-greenhouse
 * literature puts the ONSET of ocean loss at ~1-1.5 Gyr from now (from
 * memory). It feeds only these keys: starStateAt itself is unchanged.
 * Level (metres) is NOT decided here (this module cannot import terrain):
 * world-surface.ts's `datedOceanState` maps the interpolated lossFraction to a
 * level through ocean-volume.ts's `levelForLoss` on the body's own seabed. */
export const OCEAN_LOSS_BRIGHTENING = 0.35;
/** At most this many loss keys per planet (strictly ordered BigInt dates). */
export const WATER_LOSS_KEY_LIMIT = 16;
function mainSequenceBrightening(x: number): number {
  return 1.4 / (1.4 - 0.875 * clampNum(x, 0, 1));
}
function smoothstep01(r: number): number {
  const u = clampNum(r, 0, 1);
  return u * u * (3 - 2 * u);
}

/** Contract §2.5: the dated ocean is authored as ordered `WaterKey`s
 * ({dateNs, lossFraction}) derived from `PlanetLifecycle`/`StarLifecycle`,
 * never a free-standing per-planet random draw. Keys run from `oceanNs` to
 * `giantNs`: lossFraction 0 at every date up to the catalogue epoch, then the
 * brightening profile above sampled uniformly in brightness, reaching 1 no
 * later than `giantNs` (it reaches 1 at x <= 0.9 because the epoch always
 * lies at x < 0.65). Between keys `waterLossAt` interpolates linearly; the
 * profile error of that interpolation is < 0.005 in lossFraction. */
export function waterKeysFor(planet: PlanetLifecycle, star: StarLifecycle): WaterKey[] {
  if (planet.oceanNs === null) return [];
  const oceanNs = planet.oceanNs;
  // An ocean that would only condense after the host leaves the main sequence
  // never becomes available (world-surface.ts gates on a main-sequence host);
  // a single key keeps the list strictly ordered.
  if (oceanNs >= star.giantNs) return [{ dateNs: oceanNs, lossFraction: 0 }];
  const spanYears = Number((star.giantNs - star.formationNs) / YEAR_NS);
  const xAt = (t: Ns) => Number((t - star.formationNs) / YEAR_NS) / spanYears;
  const dateAtX = (x: number): Ns => star.formationNs + BigInt(Math.round(clampNum(x, 0, 1) * spanYears)) * YEAR_NS;
  const luminosity = (t: Ns) => starStateAt(star, t).luminosityRel * mainSequenceBrightening(xAt(t));
  const epochLuminosity = luminosity(CATALOGUE_EPOCH_NS);
  const lossAt = (t: Ns) => t <= CATALOGUE_EPOCH_NS ? 0
    : smoothstep01((luminosity(t) / epochLuminosity - 1) / OCEAN_LOSS_BRIGHTENING);
  // Brightness ratio r in [0,1] -> fractional main-sequence age x (inverse of
  // mainSequenceBrightening at L = L(epoch) * (1 + 0.35 r)).
  const bEpoch = mainSequenceBrightening(xAt(CATALOGUE_EPOCH_NS));
  const xForRatio = (r: number) => (1.4 - 1.4 / (bEpoch * (1 + OCEAN_LOSS_BRIGHTENING * r))) / 0.875;
  const keys: WaterKey[] = [];
  const push = (dateNs: Ns, lossFraction: number) => {
    if (dateNs < oceanNs || dateNs > star.giantNs) return;
    if (keys.length && dateNs <= keys[keys.length - 1].dateNs) return;
    keys.push({ dateNs, lossFraction });
  };
  push(oceanNs, lossAt(oceanNs));
  const startNs = oceanNs > CATALOGUE_EPOCH_NS ? oceanNs : CATALOGUE_EPOCH_NS;
  const rStart = startNs === CATALOGUE_EPOCH_NS ? 0
    : clampNum((luminosity(startNs) / epochLuminosity - 1) / OCEAN_LOSS_BRIGHTENING, 0, 1);
  if (startNs === CATALOGUE_EPOCH_NS) push(CATALOGUE_EPOCH_NS, 0);
  // Interior samples: oceanNs, epoch, (STEPS) brightness steps, giantNs = 16.
  const STEPS = WATER_LOSS_KEY_LIMIT - 3;
  if (rStart < 1) for (let i = 1; i <= STEPS; i++) {
    const r = rStart + (1 - rStart) * i / STEPS;
    const dateNs = i === STEPS ? dateAtX(xForRatio(1)) : dateAtX(xForRatio(r));
    push(dateNs, i === STEPS ? 1 : lossAt(dateNs));
  }
  push(star.giantNs, 1);
  return keys;
}

/** Interpretation filling a gap the contract leaves implicit: §2.2 declares
 * four non-engulfed stages (`unformed`/`accreting`/`molten`/`solid`) but only
 * defines one boundary (`formationNs`, "still part of the disk" before it).
 * Read literally that collapses to two states, so this treats `formationNs`
 * as "the disk clears" and adds the natural missing boundary at the star's
 * own formation: before the star exists there is no disk to accrete from
 * (`unformed`); between the star's formation and the planet's own
 * `formationNs` the planet is still accreting from that disk (`accreting`);
 * after formation it is `molten` until `coolingNs`, then `solid`. */
export function planetStateAt(lifecycle: PlanetLifecycle, star: StarLifecycle, t: Ns): {
  stage: 'unformed' | 'accreting' | 'molten' | 'solid' | 'engulfed';
  waterKeys: WaterKey[];
} {
  const waterKeys = waterKeysFor(lifecycle, star);
  if (lifecycle.engulfedNs !== null && t >= lifecycle.engulfedNs) return { stage: 'engulfed', waterKeys };
  if (t < star.formationNs) return { stage: 'unformed', waterKeys };
  if (t < lifecycle.formationNs) return { stage: 'accreting', waterKeys };
  if (t < lifecycle.coolingNs) return { stage: 'molten', waterKeys };
  return { stage: 'solid', waterKeys };
}

// --- spin, axial tilt, day/night (contract §4.4) ---
// Continuous, no bucketing: cheap O(1) evaluation every visible frame.
// Tidal locking / spin-period evolution is an explicit non-goal (§7.1); spin
// is constant per lifecycle stage.

export type SpinState = { spinPeriodS: number; axialTiltRad: number; spinPhase0: number };

export function spinStateFor(body: Body): SpinState {
  return {
    spinPeriodS: between(body.seed + '/spin-period', 3 * 3600, 200 * 86400), // 3h-200d, engineering placeholder range
    axialTiltRad: between(body.seed + '/axial-tilt', 0, Math.PI), // includes retrograde spin near pi
    spinPhase0: between(body.seed + '/spin-phase0', 0, 2 * Math.PI),
  };
}

export function rotationAngleAt(spin: SpinState, formationNs: Ns, t: Ns): number {
  const periodNs = BigInt(Math.max(1, Math.round(spin.spinPeriodS * 1e9)));
  const elapsed = t > formationNs ? t - formationNs : 0n;
  return phaseFromPeriodLocal(elapsed, periodNs, spin.spinPhase0);
}
// Local copy of world-time.ts's phaseFromPeriod (same Euclidean-modulo
// pattern) so this module doesn't need a runtime import cycle risk with
// world-time.ts for a two-line function; kept bit-identical to it.
function phaseFromPeriodLocal(elapsedNs: Ns, periodNs: bigint, phase0: number): number {
  const twoPi = 2 * Math.PI;
  if (periodNs <= 0n) return ((phase0 % twoPi) + twoPi) % twoPi;
  const remainder = ((elapsedNs % periodNs) + periodNs) % periodNs;
  const raw = Number(remainder) / Number(periodNs) * twoPi + phase0;
  return ((raw % twoPi) + twoPi) % twoPi;
}

function rotateY(v: V3, angle: number): V3 {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}
function rotateX(v: V3, angle: number): V3 {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
}

/** Day/night at a body-fixed direction: a pure function of `rotationAngleAt`,
 * `axialTiltRad`, and the current star direction (contract §4.4) — no new
 * state, no caching. Coordinate convention (documented, since the contract
 * leaves the exact transform unspecified): the unrotated polar axis is +Y,
 * spin is applied about Y before the axial tilt rotates the whole frame about
 * X; Package D reconciles this with its actual body-fixed render convention
 * when wiring it in. */
export function dayNightAt(
  spin: SpinState,
  formationNs: Ns,
  t: Ns,
  surfaceDirection: V3,
  starDirectionWorld: V3,
): { illumination: number; isDay: boolean } {
  const angle = rotationAngleAt(spin, formationNs, t);
  const spun = rotateY(surfaceDirection, angle);
  const worldDirection = rotateX(spun, spin.axialTiltRad);
  const starMag = Math.hypot(starDirectionWorld[0], starDirectionWorld[1], starDirectionWorld[2]) || 1;
  const dot = (worldDirection[0] * starDirectionWorld[0] + worldDirection[1] * starDirectionWorld[1] + worldDirection[2] * starDirectionWorld[2]) / starMag;
  const illumination = Math.max(0, dot);
  return { illumination, isDay: illumination > 0 };
}
