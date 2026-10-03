// planet-geophysics-1 (relief round 2026-10-03, package P1-GEO-FLOOR).
//
// Per-planet SURFACE PHYSICS derived from the body's seed, kind, type, radius,
// temperature and water: bulk density from a seeded core fraction, surface
// gravity, escape velocity, tectonic vigour, the relief scale `tectonicRelief`,
// air retention (`hasAir`, `airClass`), a heuristic surface pressure and the
// ocean fluid density. Everything here is queryable DERIVED DATA for the world
// layer and for games built on it; what is survivable is a game-layer rule.
//
// Deliberate rules (docs/planet-geophysics-v1.md):
//  - It NEVER reads `massKg`. The catalogue mass stays the ORBITAL mass
//    (orbits, moons, bookmarks, golden `systems` digest are untouched); this
//    module's gravity is for surface physics only and may disagree with
//    G*massKg/R^2 (owner decision 4; masses are reconciled later).
//  - It never reads simulated time `t` or the planet's age.
//  - Arithmetic is + - * / Math.sqrt Math.min Math.max Math.floor only (plus
//    constants), so every value can feed a height, an ocean flag or a class
//    and stay bit-identical across engines (tests/golden/perturbation.test.mjs).
//  - Imports are catalog.ts (and det-math.ts if ever needed) only (boundary test).
import {G, hash64, type Body} from './catalog.ts';

export const GEOPHYSICS_VERSION = 'planet-geophysics-1';

/** Uncompressed mantle (silicate) and core (iron alloy) densities, kg/m^3. */
export const MANTLE_DENSITY_KG_M3 = 3300;
export const CORE_DENSITY_KG_M3 = 8000;
/** Self-compression: rho = rho0 * (1 + K * (R / R_EARTH)^2). */
export const SELF_COMPRESSION_K = 0.35;
export const EARTH_RADIUS_M = 6.371e6;
/** Seeded core MASS fraction range, triangular, mean 0.35. */
export const CORE_FRACTION_MIN = 0.10;
export const CORE_FRACTION_SPAN = 0.50;
/** Vigour saturates at this radius (smaller bodies cool faster). */
export const VIGOUR_FULL_RADIUS_M = 6.4e6;
/** The vigour that `tectonicRelief` normalises to 1 at Earth gravity. The
 * seed-median vigour of an Earth-radius body is (0.35+0.65*0.5)*6.371/6.4 =
 * 0.672, so an Earth twin at the u3 median gets 0.964 (documented). */
export const TECTONIC_REFERENCE_VIGOUR = 0.7;
export const EARTH_GRAVITY_MS2 = 9.81;
export const RELIEF_GRAVITY_FACTOR_MIN = 0.6;
export const RELIEF_GRAVITY_FACTOR_MAX = 2.6;
/** Boltzmann constant (J/K) and the N2 molecular mass (kg). */
export const BOLTZMANN_J_PER_K = 1.380649e-23;
export const N2_MOLECULE_KG = 4.65e-26;
/**
 * Air is retained over geological time when v_esc > AIR_RETENTION_FACTOR *
 * v_rms(N2, T). The literature's Jeans rule of thumb is 6 at the EXOSPHERIC
 * temperature; the catalogue only knows an equilibrium-style T (278/sqrt(a)),
 * and the exosphere is hotter than that, so the factor at catalogue T is
 * larger. Measured on the six analogues at catalogue-convention temperatures
 * (docs/planet-geophysics-v1.md): Moon 4.8, Mercury 6.7 (no air) vs Mars 11.3,
 * Venus 12.3, Titan 13.0, Earth 23 (air). 6 would give Mercury an atmosphere;
 * 8 separates them with margin on both sides.
 */
export const AIR_RETENTION_FACTOR = 8;
/** Dry worlds at or above this catalogue temperature with retained air are
 * Venus-like (runaway greenhouse, thick CO2); below it Mars/Titan-like thin. */
export const THICK_AIR_MIN_TEMPERATURE_K = 300;
/** Sea water (kg/m^3), the fluid of every ocean in this model. */
export const SEA_WATER_DENSITY_KG_M3 = 1025;
/** Gas giants have no solid surface; their conventional "surface" is the
 * 1 bar level. Bulk density is a heuristic (Jupiter 1326, Saturn 687). */
export const GAS_GIANT_DENSITY_KG_M3 = 1300;
export const GAS_GIANT_REFERENCE_PRESSURE_PA = 100000;
/** Mean solar density, heuristic for every star. */
export const STAR_DENSITY_KG_M3 = 1410;

export type AirClass = 'none' | 'thin' | 'earthlike' | 'thick';
export type GeophysicsModel = 'rocky' | 'gas-giant' | 'star';
export type TectonicClass = 'quiet' | 'moderate' | 'active' | 'none';
export type PressureProvenance = 'heuristic' | 'convention-1bar' | 'none';

export type PlanetGeophysics = Readonly<{
  version: string;
  model: GeophysicsModel;
  /** True for every rocky/icy body (seabed and dry ground are solid). */
  solidSurface: boolean;
  /** Core MASS fraction (0 for gas giants and stars). */
  coreFraction: number;
  densityKgM3: number;
  surfaceGravityMS2: number;
  escapeVelocityMS: number;
  /** Seeded static class strength, 0..1 (scaled down below 6400 km radius). */
  tectonicVigour01: number;
  /** A label of the seeded vigour draw; it does not read the planet's age. */
  tectonicClass: TectonicClass;
  /** Relief scale: clamp(9.81/g, 0.6, 2.6) * vigour / 0.7. 0 for gas giants and stars. */
  tectonicRelief: number;
  /** v_esc / v_rms(N2, T); the hasAir decision compares it with AIR_RETENTION_FACTOR. */
  airRetentionRatio: number;
  hasAir: boolean;
  airClass: AirClass;
  /** Heuristic mean surface pressure (Pa); see `surfacePressureProvenance`. */
  surfacePressurePa: number;
  surfacePressureProvenance: PressureProvenance;
  /** Ocean fluid density (kg/m^3); 0 on a dry body. */
  fluidDensityKgM3: number;
  fluidKind: 'sea-water' | null;
}>;

/** The inputs this module reads from a Body; nothing else (never massKg, never t). */
export type GeophysicsBody = Pick<Body, 'seed' | 'kind' | 'type' | 'radiusM' | 'temperatureK' | 'water'>;

/** Explicit parameters, for analogues and tests: the seeded draws are given. */
export type GeophysicsParams = {
  kind: Body['kind'];
  type: string;
  radiusM: number;
  temperatureK: number;
  water: number;
  coreFraction: number;
  /** The u3 lane in [0,1]: vigour = (0.35 + 0.65*u3) * min(1, R/6.4e6). */
  vigourDraw01: number;
};

const clampRange = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** The three 16-bit seeded lanes of hash64(seed + '/geophysics-1'), each in [0,1]. */
export function geophysicsDraws(seed: string): {u1: number; u2: number; u3: number} {
  const h = hash64(seed + '/geophysics-1');
  return {
    u1: Number(h & 0xffffn) / 65535,
    u2: Number((h >> 16n) & 0xffffn) / 65535,
    u3: Number((h >> 32n) & 0xffffn) / 65535,
  };
}

/** Bulk density of a differentiated rocky body (kg/m^3). */
export function rockyDensityKgM3(coreFraction: number, radiusM: number): number {
  const uncompressed = 1 / ((1 - coreFraction) / MANTLE_DENSITY_KG_M3 + coreFraction / CORE_DENSITY_KG_M3);
  const x = radiusM / EARTH_RADIUS_M;
  return uncompressed * (1 + SELF_COMPRESSION_K * x * x);
}

/** g = 4/3 * pi * G * rho * R (uniform-sphere surface gravity). */
export function gravityFromDensity(densityKgM3: number, radiusM: number): number {
  return (4 / 3) * Math.PI * G * densityKgM3 * radiusM;
}

/** Relief scale from gravity and vigour (0.6..2.6 gravity factor, vigour/0.7). */
export function tectonicReliefFor(gravityMS2: number, vigour01: number): number {
  return clampRange(EARTH_GRAVITY_MS2 / gravityMS2, RELIEF_GRAVITY_FACTOR_MIN, RELIEF_GRAVITY_FACTOR_MAX) * vigour01 / TECTONIC_REFERENCE_VIGOUR;
}

/** Root-mean-square N2 molecular speed at temperature T (m/s). */
export function n2RmsSpeedMS(temperatureK: number): number {
  return Math.sqrt(3 * BOLTZMANN_J_PER_K * (temperatureK > 0 ? temperatureK : 0) / N2_MOLECULE_KG);
}

/**
 * Hydrostatic pressure at a depth below an ocean surface (Pa):
 * P = P_surface + rho_fluid * g * depth. Derived data only; whether a place
 * is survivable is a game rule. depth < 0 (above the water) is clamped to 0.
 */
export function pressureAtDepthPa(geo: PlanetGeophysics, depthM: number): number {
  return geo.surfacePressurePa + geo.fluidDensityKgM3 * geo.surfaceGravityMS2 * (depthM > 0 ? depthM : 0);
}

function tectonicClassFor(u3: number): TectonicClass {
  return u3 < 1 / 3 ? 'quiet' : u3 < 2 / 3 ? 'moderate' : 'active';
}

/** Pure geophysics from explicit parameters (no seed, no cache). */
export function geophysicsFromParams(p: GeophysicsParams): PlanetGeophysics {
  const water = p.water > 0;
  const fluidDensityKgM3 = water ? SEA_WATER_DENSITY_KG_M3 : 0;
  const fluidKind = water ? 'sea-water' as const : null;
  if (p.kind === 'star' || p.type === 'Gas giant') {
    const star = p.kind === 'star';
    const densityKgM3 = star ? STAR_DENSITY_KG_M3 : GAS_GIANT_DENSITY_KG_M3;
    const g = gravityFromDensity(densityKgM3, p.radiusM);
    const vEsc = Math.sqrt(2 * g * p.radiusM);
    return Object.freeze({
      version: GEOPHYSICS_VERSION,
      model: star ? 'star' as const : 'gas-giant' as const,
      solidSurface: false,
      coreFraction: 0,
      densityKgM3,
      surfaceGravityMS2: g,
      escapeVelocityMS: vEsc,
      tectonicVigour01: 0,
      tectonicClass: 'none' as const,
      tectonicRelief: 0,
      airRetentionRatio: vEsc / n2RmsSpeedMS(p.temperatureK),
      hasAir: !star,
      airClass: star ? 'none' as const : 'thick' as const,
      surfacePressurePa: star ? 0 : GAS_GIANT_REFERENCE_PRESSURE_PA,
      surfacePressureProvenance: star ? 'none' as const : 'convention-1bar' as const,
      fluidDensityKgM3: 0,
      fluidKind: null,
    });
  }
  const coreFraction = p.coreFraction;
  const densityKgM3 = rockyDensityKgM3(coreFraction, p.radiusM);
  const g = gravityFromDensity(densityKgM3, p.radiusM);
  const vEsc = Math.sqrt(2 * g * p.radiusM);
  const vigour = (0.35 + 0.65 * p.vigourDraw01) * Math.min(1, p.radiusM / VIGOUR_FULL_RADIUS_M);
  const vRms = n2RmsSpeedMS(p.temperatureK);
  const ratio = vRms > 0 ? vEsc / vRms : Number.MAX_VALUE;
  const retains = vEsc > AIR_RETENTION_FACTOR * vRms;
  const hasAir = water || retains;
  const airClass: AirClass = !hasAir ? 'none' : water ? 'earthlike'
    : p.temperatureK >= THICK_AIR_MIN_TEMPERATURE_K ? 'thick' : 'thin';
  const surfacePressurePa = airClass === 'none' ? 0
    : airClass === 'thin' ? 600 * g / 3.7
    : airClass === 'earthlike' ? 101325 * (g / 9.81)
    : 9.2e6 * g / 8.87;
  return Object.freeze({
    version: GEOPHYSICS_VERSION,
    model: 'rocky' as const,
    solidSurface: true,
    coreFraction,
    densityKgM3,
    surfaceGravityMS2: g,
    escapeVelocityMS: vEsc,
    tectonicVigour01: vigour,
    tectonicClass: tectonicClassFor(p.vigourDraw01),
    tectonicRelief: tectonicReliefFor(g, vigour),
    airRetentionRatio: ratio,
    hasAir,
    airClass,
    surfacePressurePa,
    surfacePressureProvenance: airClass === 'none' ? 'none' as const : 'heuristic' as const,
    fluidDensityKgM3,
    fluidKind,
  });
}

const CACHE_LIMIT = 1024;
const cache = new Map<string, PlanetGeophysics>();

/**
 * Geophysics of a catalogue body: a pure function of (seed, kind, type,
 * radiusM, temperatureK, water), FIFO-cached by exactly that key. Never reads
 * massKg or time.
 */
export function planetGeophysics(body: GeophysicsBody): PlanetGeophysics {
  const key = body.seed + '|' + body.kind + '|' + body.type + '|' + body.radiusM + '|' + body.temperatureK + '|' + body.water;
  const hit = cache.get(key);
  if (hit) return hit;
  const {u1, u2, u3} = geophysicsDraws(body.seed);
  const geo = geophysicsFromParams({
    kind: body.kind,
    type: body.type,
    radiusM: body.radiusM,
    temperatureK: body.temperatureK,
    water: body.water,
    coreFraction: CORE_FRACTION_MIN + CORE_FRACTION_SPAN * ((u1 + u2) / 2),
    vigourDraw01: u3,
  });
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  cache.set(key, geo);
  return geo;
}
