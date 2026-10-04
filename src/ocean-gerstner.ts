/**
 * Deterministic analytic Gerstner ocean waves.
 *
 * Ported from C:\LLM\IWSDK\nms\src\platform\heroOceanSurface.ts and the
 * wave-generation / height-sampling helpers it imports from
 * C:\LLM\IWSDK\nms\shared\heroContent.ts (generateGerstnerWaves,
 * sampleGerstnerHeight, and the rand01/hashU32 PRNG primitives from
 * C:\LLM\IWSDK\nms\shared\density.ts). The wave PHASE math (a sum of planar
 * Gerstner terms, k*dot(dir,xz)+t*speed) is carried over unchanged; what
 * changes is the surface it rides on: nms bends a flat, camera-relative
 * clipmap onto a sphere in the vertex shader, while Universe Atlas already
 * has a real spherical adaptive-quadtree ocean patch (see
 * src/ocean-water-material.ts) shared with the terrain LOD system, so this
 * module only needs to supply height + analytic slope at a metre-space
 * planar position -- the patch/LOD/morph machinery is Atlas's own.
 *
 * Pure module: no Three.js, no app singletons, no accumulated per-frame
 * state. Every export is a pure function of its explicit
 * (seed, position, time) arguments, so seeking time directly is exactly
 * equal to arriving at that time by stepping through arbitrary increments.
 */

export interface GerstnerWave {
  dirX: number;
  dirZ: number;
  amplitudeM: number;
  wavelengthM: number;
  speedMps: number;
}

export interface OceanDisplacement {
  /** Wave height in metres, added along the local "up" (radial) direction. */
  heightM: number;
  /** Analytic d(height)/dx and d(height)/dz (metres per metre), used to build
   * an exact wave normal without extra finite-difference samples. */
  dHdx: number;
  dHdz: number;
}

export const OCEAN_GERSTNER_WAVE_COUNT = 8;

/**
 * Wrap period for the ocean/river time phase (contract §2.6, "the animator
 * is now NAMED"): both the ocean's atlas-scroll coefficients
 * ({0.48, 0.21, 2.1} in ocean-water-material.ts) and the river's
 * ({0.72, 0.31, 2.1} in river-water.ts) require P = 1600*m for an integer m;
 * 86400 = 1600*54. Every wave's angular speed is quantized (see
 * generateOceanWaveField below) to an integer multiple of 2*PI/P so the
 * phase is exactly periodic in P and the wrap seam at t=P cannot pop.
 */
export const OCEAN_TIME_WRAP_PERIOD_S = 86400;
export const OCEAN_TIME_WRAP_PERIOD_NS = 86_400_000_000_000n;
/** Branded seconds-since-wrap-origin value, already reduced into
 * [0, OCEAN_TIME_WRAP_PERIOD_S). Never construct one directly -- always via
 * oceanPhaseSeconds -- so a raw elapsed-seconds number (which would silently
 * disagree with the ocean/river atlas periodicity above) cannot be passed by
 * mistake. */
export type OceanPhaseS = number & { readonly __oceanPhase: unique symbol };

/**
 * Reduces an absolute simulated-time value (nanoseconds since the Big Bang,
 * world-time.ts's Ns axis) into the ocean's wrap period, as a float32 second
 * count safe to feed into the GLSL `oceanTime`/`waterTime` uniforms.
 *
 * BigInt euclidean modulo FIRST, then divide -- same pattern as
 * world-time.ts's `phaseAt` and planet-clouds.ts's `windAngle`. This
 * ordering is mandatory: raw simulated seconds in float32 have a ULP of
 * ~3.44e10 s (~1090 years) at the catalogue epoch, and become `Infinity`
 * past FLT32_MAX at UNIVERSE_END_NS -- reducing into the wrap period first
 * keeps the value small before it ever touches a 32-bit float.
 */
export function oceanPhaseSeconds(worldNs: bigint): OceanPhaseS {
  const wrapped = ((worldNs % OCEAN_TIME_WRAP_PERIOD_NS) + OCEAN_TIME_WRAP_PERIOD_NS) % OCEAN_TIME_WRAP_PERIOD_NS;
  return Math.fround(Number(wrapped) / 1e9) as OceanPhaseS;
}

/** 32-bit integer hash. Ported from nms/shared/density.ts hashU32. */
function hashU32(value: number, seed: number): number {
  let h = (value | 0) ^ (seed | 0);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}

/** [0,1) pseudo-random value. Ported from nms/shared/heroContent.ts rand01. */
function rand01(seed: number, salt: number): number {
  return (hashU32(salt >>> 0, seed) >>> 0) / 0x1_0000_0000;
}

/**
 * Folds an arbitrary string (a body's catalogue seed and/or address/id) into
 * a 32-bit integer seed via FNV-1a, so callers can turn
 * `body.seed + '/' + body.id` into the numeric seed generateOceanWaveField
 * wants without depending on this module knowing about the Body type (this
 * module stays pure-Three/no-app-types; see the file header).
 */
export function hashSeedString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const fieldCache = new Map<string, GerstnerWave[]>();

/**
 * Deterministic wave field for one body of water. `seed` should combine the
 * body's catalogue seed and address/id (see hashSeedString) so distinct
 * bodies get distinct, stable seas; the same (seed, waveCount) pair always
 * returns a bit-identical (in fact, the very same cached) array. Generation
 * scheme (angle/wavelength/amplitude/speed ranges) ported from nms's
 * generateGerstnerWaves.
 */
// Quantum of angular speed (rad/s) one wrap-period step represents; every
// wave's speedMps (an angular frequency despite the name -- see the phase
// term `k*(...)+t*speedMps` in sampleOceanDisplacement/the GLSL mirror
// below, not a linear metres/second speed; leave the name alone, it would
// touch the GLSL twin) is snapped to an integer multiple of this so the
// wave is exactly periodic in OCEAN_TIME_WRAP_PERIOD_S and neighbouring
// patches/LOD levels never disagree at the wrap seam.
const ANGULAR_FREQUENCY_QUANTUM = (Math.PI * 2) / OCEAN_TIME_WRAP_PERIOD_S; // ~7.2722e-5 rad/s
const SPEED_MIN_STEP = Math.round(0.55 / ANGULAR_FREQUENCY_QUANTUM);
const SPEED_RANGE_STEPS = Math.round(1.45 / ANGULAR_FREQUENCY_QUANTUM);

export function generateOceanWaveField(seed: number, waveCount = OCEAN_GERSTNER_WAVE_COUNT): GerstnerWave[] {
  const key = (seed >>> 0) + '/' + waveCount;
  const cached = fieldCache.get(key);
  if (cached) return cached;
  const waves: GerstnerWave[] = [];
  for (let i = 0; i < waveCount; i++) {
    const theta = rand01(seed, i * 7) * Math.PI * 2;
    const length = 8 + rand01(seed, i * 7 + 1) * 34;
    const step = SPEED_MIN_STEP + Math.round(rand01(seed, i * 7 + 3) * SPEED_RANGE_STEPS);
    waves.push({
      dirX: Math.fround(Math.cos(theta)),
      dirZ: Math.fround(Math.sin(theta)),
      amplitudeM: Math.fround(0.05 + rand01(seed, i * 7 + 2) * 0.28),
      wavelengthM: Math.fround(length),
      speedMps: Math.fround(step * ANGULAR_FREQUENCY_QUANTUM),
    });
  }
  fieldCache.set(key, waves);
  return waves;
}

/** Sum of every wave's amplitude: the largest a crest can rise (or a trough
 * can fall) above sea level. Used both as a shore-continuity tolerance and to
 * size the vertex-shader distance fade. */
export function maxOceanWaveAmplitudeM(waves: GerstnerWave[]): number {
  let sum = 0;
  for (const w of waves) sum += w.amplitudeM;
  return sum;
}

/**
 * Height + analytic slope of the Gerstner sum at a planar (xM, zM) position
 * (metres, in the local tangent-plane frame of one ocean patch) and time
 * tSeconds. Pure function of its arguments: no module-level or closure state
 * advances with time, so sampling at any t -- including "backwards", or after
 * an arbitrarily large jump -- is exact and order-independent.
 */
export function sampleOceanDisplacement(waves: GerstnerWave[], xM: number, zM: number, tSeconds: number, spacingM = 0): OceanDisplacement {
  let height = 0, dHdx = 0, dHdz = 0;
  for (const w of waves) {
    const k = (Math.PI * 2) / w.wavelengthM;
    const phase = k * (w.dirX * xM + w.dirZ * zM) + tSeconds * w.speedMps;
    const s = Math.sin(phase), c = Math.cos(phase), a = w.amplitudeM * oceanWaveFade(w.wavelengthM, spacingM);
    height += s * a;
    const dPhase = k * a * c;
    dHdx += dPhase * w.dirX;
    dHdz += dPhase * w.dirZ;
  }
  return { heightM: height, dHdx, dHdz };
}

/** Convenience height-only sample (no slope), mirroring nms's
 * sampleGerstnerHeight for callers that only need the scalar. */
export function sampleOceanHeight(waves: GerstnerWave[], xM: number, zM: number, tSeconds: number, spacingM = 0): number {
  let height = 0;
  for (const w of waves) {
    const k = (Math.PI * 2) / w.wavelengthM;
    const phase = k * (w.dirX * xM + w.dirZ * zM) + tSeconds * w.speedMps;
    height += Math.sin(phase) * w.amplitudeM * oceanWaveFade(w.wavelengthM, spacingM);
  }
  return height;
}

/** Wavelength range generateOceanWaveField draws from (8 + [0, 34) m). */
export const OCEAN_WAVE_WAVELENGTH_RANGE_M = [8, 42] as const;
/** Version of the wave distance fade (OCEAN-PRESENT, 2026-10-04). */
export const OCEAN_WAVE_FADE_VERSION = 'ocean-wave-fade-1';

/**
 * Anti-aliasing fade of one Gerstner wave on a vertex grid of `spacingM`.
 * A wave is fully kept while the grid has at least four vertices per
 * wavelength and gone at the Nyquist limit (two per wavelength), where vertex
 * displacement can only alias into a false, larger pattern. Pure smoothstep,
 * mirrored exactly by the GLSL below (float32 wave number -> wavelength).
 */
export function oceanWaveFade(wavelengthM: number, spacingM: number): number {
  const e0 = wavelengthM * 0.25, e1 = wavelengthM * 0.5;
  const t = Math.min(1, Math.max(0, (spacingM - e0) / (e1 - e0)));
  return 1 - t * t * (3 - 2 * t);
}

/**
 * Conservative ocean-grid vertex spacing at `distanceM` from the eye. The
 * terrain/ocean quadtree keeps a leaf only while span*pixels/near <= the split
 * score, so a leaf's vertex spacing is at most `spacingPerM * near` with
 * spacingPerM = splitScore / (pixels * PATCH_SEGMENTS); `floorM` is the
 * spacing at the deepest level the current mode may select (the grid is never
 * finer). The distance is a continuous function of world position, so every
 * patch, of any level, fades the same world point identically (no seam).
 */
export function oceanWaveSpacingM(distanceM: number, spacingPerM: number, floorM = 0): number {
  return Math.max(Math.max(0, distanceM) * spacingPerM, floorM);
}

/**
 * Smallest spacing-per-metre the renderer may pass: it makes the longest
 * wave reach its Nyquist limit no farther than `fadeEndM` from the eye. The
 * renderer passes OCEAN_SURFACE_DETAIL_M, the distance inside which ocean
 * tiles are guaranteed to refine by their own surface distance (beyond it
 * they refine by the seabed and may be coarser than the estimate above).
 */
export function oceanWaveMinSpacingPerM(fadeEndM: number): number {
  return OCEAN_WAVE_WAVELENGTH_RANGE_M[1] * 0.5 / fadeEndM;
}

/**
 * GLSL mirror of sampleOceanDisplacement, for embedding directly into
 * ocean-water-material.ts's vertex shader (kept in this one place, alongside
 * its JS twin above, so the two never drift). `waveCount` must match the
 * length of the `waves` array whose uniforms are bound alongside this code.
 */
export function oceanGerstnerVertexGLSL(waveCount = OCEAN_GERSTNER_WAVE_COUNT): string {
  return `#define OCEAN_WAVE_COUNT ${waveCount}
uniform vec2 oceanWaveDir[OCEAN_WAVE_COUNT];
uniform float oceanWaveAmplitudeM[OCEAN_WAVE_COUNT];
uniform float oceanWaveNumber[OCEAN_WAVE_COUNT];
uniform float oceanWaveSpeed[OCEAN_WAVE_COUNT];
uniform float oceanWavePhase[OCEAN_WAVE_COUNT];
// Vertex grid spacing (m) at the sampled point, set by the caller before
// oceanGerstner (oceanWaveSpacingM's GLSL twin); 0 keeps every wave.
float oceanGerstnerSpacingM=0.0;
void oceanGerstner(in vec2 posM,in float t,out float heightM,out vec2 slope){
  heightM=0.0;slope=vec2(0.0);
  for(int i=0;i<OCEAN_WAVE_COUNT;i++){
    float k=oceanWaveNumber[i];
    float phase=k*dot(oceanWaveDir[i],posM)+oceanWavePhase[i]+t*oceanWaveSpeed[i];
    float lambda=6.283185307179586/k;
    float amplitude=oceanWaveAmplitudeM[i]*(1.0-smoothstep(lambda*.25,lambda*.5,oceanGerstnerSpacingM));
    heightM+=sin(phase)*amplitude;
    slope+=(k*amplitude*cos(phase))*oceanWaveDir[i];
  }
}`;
}

/**
 * Per-wave phase offsets (radians, in [0, 2*PI)) that let a patch evaluate
 * the Gerstner sum at a WRAPPED planar origin and still land on the one
 * global wave field.
 *
 * Ocean patches phase their waves at `posM = local + wrappedOrigin`, where
 * wrappedOrigin is the patch anchor in metres reduced modulo a period
 * (ground-material.ts's DETAIL_PERIOD_M, 4096 m) so float32 keeps
 * millimetre precision. The normal-atlas ripples repeat exactly at that
 * period, but the Gerstner wavelengths (8-42 m, arbitrary) do not, so
 * without a correction two neighbouring patches whose anchors fall in
 * different 4096 m cells disagree on every wave's phase along their shared
 * edge: a visible straight seam (docs/ocean-seam-2026-09-29.md).
 *
 * For each wave this returns `k * dot(dir, shift) mod 2*PI` with
 * `shift = exactOrigin - wrappedOrigin` (x/z metres), computed in float64
 * from the float32 wave number and direction the shader actually uses, so
 * `k*dot(dir, local + wrappedOrigin) + offset` equals the phase at the exact
 * world position modulo 2*PI. The shift is a multiple of the wrap period, so
 * the reduced offset is exact to ~1e-9 rad even at planetary radii.
 */
export function oceanWavePhaseOffsets(waves: GerstnerWave[], shiftXM: number, shiftZM: number): number[] {
  const tau = Math.PI * 2;
  return waves.map((w) => {
    const k = Math.fround(tau / w.wavelengthM);
    const phase = (k * Math.fround(w.dirX)) * shiftXM + (k * Math.fround(w.dirZ)) * shiftZM;
    const wrapped = phase - Math.floor(phase / tau) * tau;
    return wrapped >= tau ? 0 : wrapped;
  });
}

/** Builds the four parallel-array uniform values oceanGerstnerVertexGLSL's
 * declarations expect, from a GerstnerWave[]. Kept as plain arrays (not
 * THREE.Vector2, to avoid a hard three.js dependency in this pure module);
 * ocean-water-material.ts wraps oceanWaveDir in THREE.Vector2 at the uniform
 * boundary. */
export function oceanWaveUniformArrays(waves: GerstnerWave[]) {
  return {
    dir: waves.map((w) => [w.dirX, w.dirZ] as [number, number]),
    amplitudeM: waves.map((w) => w.amplitudeM),
    waveNumber: waves.map((w) => (Math.PI * 2) / w.wavelengthM),
    speedMps: waves.map((w) => w.speedMps),
  };
}
