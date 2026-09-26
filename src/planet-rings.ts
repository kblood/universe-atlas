/**
 * Deterministic planetary ring system: existence, physical bounds, gaps,
 * opacity banding, composition, and a transient `[birthNs, deathNs)` life
 * window (rings are not assumed permanent - e.g. a moon-disruption origin).
 *
 * STANDALONE MODULE: `f(seed, bodyAddress, params)` only, no
 * `world-time.ts`/`stellar-evolution.ts` import. `birthNs`/`deathNs` are
 * **elapsed ns since the body's own formation** (the same "caller supplies
 * a consistent zero point" convention `planet-clouds.ts`/`planet-craters.ts`
 * document) - not absolute Big-Bang-relative `Ns`. `params.axialTiltRad` is
 * a plain passthrough of the body's own `SpinState.axialTiltRad`
 * (`stellar-evolution.ts`, once wired in): rings sit in the equatorial
 * plane by physical definition, so this module never derives its own tilt.
 *
 * Physical bounds (contract-independent, this module's own formulas):
 *  - inner edge: `radiusM * 1.15` - clears the body (and any atmosphere)
 *    with a fixed safety margin;
 *  - outer edge: bounded by the FLUID Roche limit,
 *    `d = 2.44 * radiusM * cbrt(planetDensity / ringMaterialDensity)`
 *    (Chandrasekhar's fluid-satellite form; the ~1.26 RIGID-body constant is
 *    not used since ring particles behave as a fluid/granular disk, not a
 *    rigid moon) - `ringMaterialDensity` is 920 kg/m^3 for an icy
 *    composition or 3000 kg/m^3 for rock, chosen from `temperatureK`.
 *
 * `detCbrt`/`detLn` (never `Math.cbrt`/`Math.log`) gate the discrete
 * existence/bounds decisions, so ring existence and bounds ordering are
 * immune to the cross-engine libm drift `det-math.ts` documents.
 */
import * as THREE from 'three';
import { rng } from './catalog.ts';
import { detCbrt, detLn } from './det-math.ts';

export const PLANET_RINGS_VERSION = 'planet-rings-1';

const NS = 1_000_000_000n;
const YEAR_NS = 31_557_600n * NS;
const MYR_NS = 1_000_000n * YEAR_NS;

export type RingComposition = 'ice' | 'rock';
export type RingGap = { innerM: number; outerM: number };
export type RingBand = { innerM: number; outerM: number; opacity: number };

export type RingBodyParams = {
  massKg: number;
  radiusM: number;
  hasRingFlag: boolean;
  starDistanceAu: number;
  temperatureK: number;
  /** The body's own `SpinState.axialTiltRad` (see module doc). Defaults to 0. */
  axialTiltRad?: number;
};

export type RingSystem = {
  innerM: number;
  outerM: number;
  gaps: RingGap[];
  bands: RingBand[];
  composition: RingComposition;
  tiltRad: number;
  /** Elapsed ns since the body's own formation (see module doc). */
  birthNs: bigint;
  /** `null` = no scripted dissolution (present indefinitely once born). */
  deathNs: bigint | null;
};

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function ringComposition(temperatureK: number): RingComposition {
  return temperatureK < 170 ? 'ice' : 'rock';
}

/** Fluid Roche limit (metres) for a ring of the given composition orbiting
 * a body of this mass/radius - see module header for the formula and its
 * justification. Exported so callers/tests can check ring bounds against
 * the same formula this module used to derive them. */
export function rocheLimitM(params: Pick<RingBodyParams, 'massKg' | 'radiusM' | 'temperatureK'>): number {
  const materialDensity = ringComposition(params.temperatureK) === 'ice' ? 920 : 3000;
  const volume = (4 / 3) * Math.PI * (params.radiusM * params.radiusM * params.radiusM);
  const planetDensity = params.massKg / Math.max(1e-9, volume);
  const densityRatio = Math.max(0, planetDensity / materialDensity);
  return 2.44 * params.radiusM * detCbrt(densityRatio);
}

/**
 * Ring system for a body, or `null` if `params.hasRingFlag` is false or no
 * physically valid band exists inside the Roche bound (e.g. an
 * implausibly dense body whose Roche limit falls inside its own safety
 * margin).
 */
export function ringSystemFor(seed: string, bodyAddress: string, params: RingBodyParams): RingSystem | null {
  if (!params.hasRingFlag) return null;
  const composition = ringComposition(params.temperatureK);
  const maxOuterM = rocheLimitM(params);
  const innerM = params.radiusM * 1.15;
  if (!(innerM < maxOuterM)) return null;

  const r = rng(JSON.stringify([seed, bodyAddress, 'ring-v1']));
  const span = maxOuterM - innerM;
  const outerM = innerM + span * (0.35 + r() * 0.55); // strictly < maxOuterM by construction

  const gapRoll = r();
  const gapCount = gapRoll < 0.15 ? 0 : gapRoll < 0.55 ? 1 : gapRoll < 0.85 ? 2 : 3;
  const gaps: RingGap[] = [];
  for (let i = 0; i < gapCount; i++) {
    const at = innerM + (outerM - innerM) * (0.15 + r() * 0.7);
    const width = (outerM - innerM) * (0.015 + r() * 0.05);
    gaps.push({ innerM: Math.max(innerM, at - width / 2), outerM: Math.min(outerM, at + width / 2) });
  }
  gaps.sort((a, b) => a.innerM - b.innerM);

  const bandCount = 3 + Math.floor(r() * 4);
  const bands: RingBand[] = [];
  const bandSpan = (outerM - innerM) / bandCount;
  let cursor = innerM;
  for (let i = 0; i < bandCount; i++) {
    const bInner = cursor,
      bOuter = Math.min(outerM, cursor + bandSpan);
    bands.push({ innerM: bInner, outerM: bOuter, opacity: clamp01(0.2 + r() * 0.75) });
    cursor = bOuter;
  }

  // Transience: a close-in orbit is more likely tidally disrupted (a
  // moon-breakup origin), so `starDistanceAu` shifts the transient
  // probability - an engineering heuristic, not an orbital-dynamics model.
  const tidalStress = clamp01(2 / Math.max(0.05, params.starDistanceAu));
  const transient = r() < 0.15 + 0.5 * tidalStress;
  const birthFraction = r();
  const birthNs = BigInt(Math.round(birthFraction * 4000)) * MYR_NS; // seeded within [0,4) Gyr of body formation
  // Exponential-distributed lifetime (mean ~120 Myr) via the portable detLn.
  const lifetimeMyr = -detLn(Math.max(1e-9, 1 - r())) * 120;
  const deathNs = transient ? birthNs + BigInt(Math.max(1, Math.round(lifetimeMyr))) * MYR_NS : null;

  return { innerM, outerM, gaps, bands, composition, tiltRad: params.axialTiltRad ?? 0, birthNs, deathNs };
}

/** `true` iff the ring exists at `elapsedNsSinceFormation` (elapsed ns since
 * the body's own formation - see module doc). */
export function ringActiveAt(ring: RingSystem, elapsedNsSinceFormation: bigint): boolean {
  if (elapsedNsSinceFormation < ring.birthNs) return false;
  if (ring.deathNs !== null && elapsedNsSinceFormation >= ring.deathNs) return false;
  return true;
}

// --- mesh builder --------------------------------------------------------
// GPU approximation: a radial-band alpha DataTexture is authored directly
// from `ring.gaps`/`ring.bands` (the same data `ringSystemFor` returns), so
// there is no separately-derived shading logic to drift from the
// authoritative ring description above.

function ringAlphaAt(ring: RingSystem, radiusM: number): number {
  for (const gap of ring.gaps) if (radiusM >= gap.innerM && radiusM <= gap.outerM) return 0.04;
  for (const band of ring.bands) if (radiusM >= band.innerM && radiusM < band.outerM) return band.opacity;
  return 0.04;
}

function ringTexture(ring: RingSystem, resolution = 256): THREE.DataTexture {
  const data = new Uint8Array(resolution * 4);
  const tint = ring.composition === 'ice' ? [222, 232, 238] : [176, 150, 120];
  for (let x = 0; x < resolution; x++) {
    const t = (x + 0.5) / resolution;
    const radiusM = ring.innerM + t * (ring.outerM - ring.innerM);
    const alpha = ringAlphaAt(ring, radiusM);
    const i = x * 4;
    data[i] = tint[0];
    data[i + 1] = tint[1];
    data[i + 2] = tint[2];
    data[i + 3] = Math.round(clamp01(alpha) * 255);
  }
  const texture = new THREE.DataTexture(data, resolution, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** Builds geometry/material/mesh objects only - no WebGL context needed.
 * The mesh's plane normal is +Y before `ring.tiltRad` is applied (baked via
 * `geometry.rotateX(-PI/2)`), then `mesh.rotation.x = ring.tiltRad` tilts it
 * about the world X axis - the same axis `stellar-evolution.ts`'s
 * `dayNightAt` applies `axialTiltRad` about (`rotateX` after `rotateY`
 * spin), so a caller that also applies the body's own tilt/spin keeps this
 * ring's plane aligned with the body's actual equator without this module
 * needing to duplicate that rotation composition itself. */
export function createRingMesh(ring: RingSystem): THREE.Mesh {
  const geometry = new THREE.RingGeometry(ring.innerM, ring.outerM, 128, 1);
  geometry.rotateX(-Math.PI / 2);
  const texture = ringTexture(ring);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    alphaMap: texture,
    transparent: true,
    side: THREE.DoubleSide,
    roughness: 0.9,
    metalness: 0,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Planet ring system';
  mesh.rotation.x = ring.tiltRad;
  return mesh;
}
