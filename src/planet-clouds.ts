/**
 * Deterministic, time-evolving cloud field for a planet/moon with an
 * atmosphere (or a gas giant's cloud deck).
 *
 * STANDALONE MODULE: `f(seed, bodyAddress, params, dir, t)` only. Does not
 * import `world-time.ts`/`stellar-evolution.ts` (this package's decoupling
 * brief) - every needed quantity (rotation rate, existence gates,
 * temperature) is a plain parameter on `CloudParams` instead. `t` is a plain
 * `bigint` count of nanoseconds and is treated as **elapsed ns since a
 * caller-chosen zero point** (e.g. the body's own `formationNs` from
 * `stellar-evolution.ts`, once wired in) - not an absolute Big-Bang-relative
 * `Ns`. Any consistent zero point works: every quantity below is a pure,
 * closed-form function of `t` with no accumulated/mutable state, so direct
 * seek and step-by-step playback always agree (the same "t-seek
 * independence" property `docs/time-and-coordinates-contract.md` requires of
 * its own WorldQuery family, even though this module is deliberately outside
 * that contract's import graph).
 *
 * Two layers, both re-evaluated fresh from `t` every call:
 *  - large-scale latitude BANDS (count set by rotation rate, matching
 *    fast-rotator banding like Jupiter/Saturn) advected in longitude by a
 *    wind phase that is an analytic function of `t` (no integration);
 *  - seeded noise CELLS whose lifetime is a bucketed window of `t`
 *    (`floor(t / windowNs)`), cross-faded into the next window so playback
 *    never pops - the window/cell index is exact bigint arithmetic, so
 *    seeking straight to any `t` picks the identical window as arriving via
 *    any sequence of intermediate steps.
 *
 * Discrete/branch-affecting choices (existence gate, window index, cell
 * hash key) use only exact bigint arithmetic or the portable `det-math.ts`
 * primitives (never `Math.sin`/`cos`/`exp`/`log`/`pow`/`atan2`/`tan`/`cbrt`
 * directly) - together with `catalog.ts`'s already-portable `noise()`
 * (built only on `Math.imul`/floor/arithmetic), this keeps `cloudCoverAt`
 * immune to the cross-engine libm drift `det-math.ts` documents.
 */
import { hash64, noise, type V3 } from './catalog.ts';
import { sine, detCos, detAtan2, expNeg } from './det-math.ts';
import * as THREE from 'three';

export const PLANET_CLOUDS_VERSION = 'planet-clouds-1';

const NS = 1_000_000_000n;
const HOUR_NS = 3600n * NS;
/** Default cloud-cell turnover window: a placeholder "weather system
 * lifetime," not a physically measured value - engineering approximation in
 * the same register as this codebase's other seeded-heuristic windows. */
const DEFAULT_WINDOW_NS = 6n * HOUR_NS;

export type CloudParams = {
  hasAtmosphere: boolean;
  hasOcean: boolean;
  /** Gas giants get a permanent cloud deck independent of `hasOcean`. */
  gasGiant?: boolean;
  temperatureK: number;
  radiusM: number;
  /** Rotation period in seconds (`SpinState.spinPeriodS` from
   * `stellar-evolution.ts`, once wired in by the caller). */
  spinPeriodS: number;
  /** Cloud-cell turnover window override, ns. Default: `DEFAULT_WINDOW_NS`. */
  windowNs?: bigint;
};

export type CloudSample = {
  /** 0..1 fractional sky coverage at `dir`. */
  coverage: number;
  /** Cloud-top altitude above the surface, metres (0 iff `coverage === 0`). */
  heightM: number;
};

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Euclidean floor-division for BigInt (JS's `/` truncates toward zero) -
 * needed so a negative `t` still buckets into a well-defined window instead
 * of jumping backward across zero. Local copy of the same pattern
 * `address.ts`'s `floorDivBig` and `world-time.ts`'s `phaseFromPeriod` use;
 * duplicated here (not imported) to keep this module decoupled, matching
 * `stellar-evolution.ts`'s own precedent (`phaseFromPeriodLocal`) for the
 * same reason. */
function floorDivBig(a: bigint, b: bigint): bigint {
  const q = a / b,
    r = a % b;
  return r !== 0n && (r < 0n) !== (b < 0n) ? q - 1n : q;
}

/** Euclidean-modulo angle from an elapsed-ns/period-ns ratio - exact bigint
 * remainder, only the final division to `[0, 2*pi)` is a double. */
function windAngle(elapsedNs: bigint, periodNs: bigint): number {
  if (periodNs <= 0n) return 0;
  const remainder = ((elapsedNs % periodNs) + periodNs) % periodNs;
  return (Number(remainder) / Number(periodNs)) * Math.PI * 2;
}

function cloudSeedCode(seed: string, bodyAddress: string): number {
  return Number(hash64(seed + '/' + bodyAddress + '/clouds-v1') & 0xffffffffn);
}

/** Gaussian-ish moisture falloff around a temperate band, via the portable
 * `expNeg` (not `Math.exp`) so the *shape* of the moisture curve can't drift
 * across engines even though it only feeds a continuous shading value. */
function moistureFactor(temperatureK: number): number {
  const d = (temperatureK - 280) / 70;
  return clamp01(expNeg(d * d));
}

function cloudTopHeightM(params: CloudParams, coverage: number): number {
  const base = params.gasGiant ? 60000 : 8000; // m, rough cloud-top altitude
  return base * (0.6 + 0.4 * coverage);
}

/**
 * Deterministic cloud coverage/height at a unit body-fixed direction `dir`
 * and time `t` (elapsed ns since the caller's chosen zero - see module doc).
 * `dir` follows this codebase's established convention (`catalog.ts`'s
 * `surfaceTexture`, `terrain.ts`): `dir[1]` is the polar (pseudo-latitude)
 * component, longitude is measured around the Y axis via `atan2(z, x)`,
 * matching `stellar-evolution.ts`'s `rotateY`-based spin convention.
 */
export function cloudCoverAt(
  seed: string,
  bodyAddress: string,
  params: CloudParams,
  dir: V3,
  t: bigint,
): CloudSample {
  if (!params.hasAtmosphere) return { coverage: 0, heightM: 0 };
  if (!params.gasGiant && !params.hasOcean) return { coverage: 0, heightM: 0 };

  const windowNs = params.windowNs ?? DEFAULT_WINDOW_NS;
  const seedCode = cloudSeedCode(seed, bodyAddress);

  // Band count: faster rotation -> tighter/more zonal bands (Jupiter-style).
  const referenceSpinS = 36 * 3600; // ~1.5 Earth days, reference rotation rate
  const spinRatio = referenceSpinS / Math.max(3 * 3600, params.spinPeriodS);
  const bandCount = Math.min(16, Math.max(2, 2 + 10 * spinRatio));

  const lat = Math.max(-1, Math.min(1, dir[1]));
  const spinPeriodNs = BigInt(Math.max(1, Math.round(params.spinPeriodS * 1e9)));
  const bandIndex = Math.min(bandCount - 1, Math.floor((lat * 0.5 + 0.5) * bandCount));
  const sign = bandIndex % 2 === 0 ? 1 : -1;

  // Wind advection: an analytic function of `t` alone (no accumulated
  // state), alternating direction per zonal band like real jet streams.
  const longitude = detAtan2(dir[2], dir[0]);
  const advectedLongitude = longitude - windAngle(t, spinPeriodNs) * sign;
  const horizontalRadius = Math.sqrt(Math.max(0, 1 - lat * lat));
  const rotated: V3 = [
    detCos(advectedLongitude) * horizontalRadius,
    lat,
    sine(advectedLongitude) * horizontalRadius,
  ];

  const bandField = 0.5 + 0.5 * sine(lat * bandCount * Math.PI + seedCode * 1e-6);

  // Seeded noise cells, bucketed into windows of t and cross-faded.
  const k = floorDivBig(t, windowNs);
  const frac = windowNs > 0n ? Number(t - k * windowNs) / Number(windowNs) : 0;
  const sm = frac * frac * (3 - 2 * frac); // smoothstep crossfade
  const codeFor = (window: bigint) => seedCode + Number(((window % 1000000n) + 1000000n) % 1000000n) * 7 + 101;
  const cellFreq = 3.2;
  const cA = noise(rotated[0] * cellFreq + 11, rotated[1] * cellFreq + 31, rotated[2] * cellFreq + 17, codeFor(k));
  const cB = noise(rotated[0] * cellFreq + 11, rotated[1] * cellFreq + 31, rotated[2] * cellFreq + 17, codeFor(k + 1n));
  const cellField = cA * (1 - sm) + cB * sm;

  const fine = noise(rotated[0] * 9.7 + 3, rotated[1] * 9.7 + 3, rotated[2] * 9.7 + 3, seedCode + 5);

  const raw = 0.35 * bandField + 0.45 * cellField + 0.2 * fine;
  const moisture = params.gasGiant ? 1 : moistureFactor(params.temperatureK);
  const coverage = clamp01((raw - 0.15) * 1.4) * moisture;
  const heightM = coverage > 0 ? cloudTopHeightM(params, coverage) : 0;
  return { coverage, heightM };
}

// --- mesh builder ------------------------------------------------------
// GPU approximation: samples `cloudCoverAt` (the authoritative function
// above) into a small equirectangular DataTexture, so the renderer never
// re-derives its own cloud logic and can never drift from the CPU field.
// Cheap by design (Quest 3 budget): one transparent shell, no
// postprocessing; use `polygonOffset` (not `renderOrder`) for any
// terrain/cloud depth-fighting, per this codebase's stereo-rendering notes.

export type CloudShell = {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  texture: THREE.DataTexture;
  /** Re-samples `cloudCoverAt` into the texture for `(seed, bodyAddress, t)`.
   * Call at a throttled cadence (not every frame) - `cloudCoverAt` itself is
   * the authoritative per-sample query for gameplay/collision purposes. */
  update: (seed: string, bodyAddress: string, t: bigint) => void;
  dispose: () => void;
};

/** Builds geometry/material objects only - no WebGL context needed
 * (matches `PlanetAtmosphere`'s construction pattern in
 * `planet-atmosphere.ts`, unit-sphere geometry scaled by the host group). */
export function createCloudShell(params: CloudParams, width = 256, height = 128): CloudShell {
  const topM = params.gasGiant ? 60000 : 8000;
  const depth = topM / Math.max(1, params.radiusM);
  const geometry = new THREE.SphereGeometry(1 + depth, 48, 24);
  const data = new Uint8Array(width * height * 4);
  const texture = new THREE.DataTexture(data, width, height);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    alphaMap: texture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Planet cloud shell';
  mesh.renderOrder = 2;
  mesh.frustumCulled = false;
  const tint = params.gasGiant ? [225, 215, 195] : [255, 255, 255];
  const update = (seed: string, bodyAddress: string, t: bigint) => {
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const theta = ((x + 0.5) / width) * Math.PI * 2,
          phi = ((y + 0.5) / height) * Math.PI;
        const dir: V3 = [-Math.cos(theta) * Math.sin(phi), Math.cos(phi), Math.sin(theta) * Math.sin(phi)];
        const s = cloudCoverAt(seed, bodyAddress, params, dir, t);
        const i = (y * width + x) * 4;
        data[i] = tint[0];
        data[i + 1] = tint[1];
        data[i + 2] = tint[2];
        data[i + 3] = Math.round(clamp01(s.coverage) * 255);
      }
    texture.needsUpdate = true;
  };
  const dispose = () => {
    geometry.dispose();
    material.dispose();
    texture.dispose();
  };
  return { mesh, material, texture, update, dispose };
}
