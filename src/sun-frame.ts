/**
 * Sun-frame convention module (W0-SEASON, biome-climate increment 1).
 *
 * Pure, three-free restatement of the body-fixed sun direction convention
 * that `main.ts`'s `spinCompensatedSunDirection` (main.ts:2667-2673) applies
 * with THREE: the raw star direction is counter-rotated about +X by
 * -axialTilt and then about +Y by -spinAngle. The unrotated polar axis is +Y
 * (the `dayNightAt` convention in stellar-evolution.ts), so after the X step
 * the y component is the sine of the SUBSOLAR LATITUDE, and the Y (spin) step
 * leaves it unchanged.
 *
 * `spinCompensated` replays THREE's exact operation order
 * (Quaternion.setFromAxisAngle + Vector3.applyQuaternion, three r17x) so it is
 * not merely within tolerance of the renderer but normally bit-identical on
 * the same engine; tests/sun-frame.test.mjs pins it at <= 1e-12 against a real
 * THREE replica over 566 catalogue planets x 64 dates.
 *
 * These are continuous presentation values (contract §1.2 rule 3, second
 * bullet), so platform Math.sin/Math.cos are allowed here. Nothing in this
 * module may feed a discrete presence/kind decision.
 */

export type V3 = [number, number, number];

/** THREE `applyAxisAngle(axis, angle)` for a unit axis, operation for
 * operation: q = (axis*sin(angle/2), cos(angle/2)), then
 * t = 2*cross(q.xyz, v); v' = v + q.w*t + cross(q.xyz, t). Writes into `out`
 * (which may alias `v`). */
function applyAxisAngleInto(out: number[], vx: number, vy: number, vz: number,
  ax: number, ay: number, az: number, angle: number): void {
  const halfAngle = angle / 2, s = Math.sin(halfAngle);
  const qx = ax * s, qy = ay * s, qz = az * s, qw = Math.cos(halfAngle);
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);
  out[0] = vx + qw * tx + qy * tz - qz * ty;
  out[1] = vy + qw * ty + qz * tx - qx * tz;
  out[2] = vz + qw * tz + qx * ty - qy * tx;
}

/** Body-fixed sun direction: rotate `rawSun` about X by -tiltRad, then about
 * Y by -spinAngleRad (the main.ts:2667-2673 convention). Allocates the
 * returned vector unless `out` is supplied. */
export function spinCompensated(rawSun: readonly number[], tiltRad: number, spinAngleRad: number, out?: V3): V3 {
  const o = out ?? ([0, 0, 0] as V3);
  applyAxisAngleInto(o, rawSun[0], rawSun[1], rawSun[2], 1, 0, 0, -tiltRad);
  applyAxisAngleInto(o, o[0], o[1], o[2], 0, 1, 0, -spinAngleRad);
  return o;
}

/** Sine of the subsolar latitude for a unit `rawSun`: the y component after
 * the X rotation by -tilt, i.e. s_y*cos(tilt) + s_z*sin(tilt)
 * (y' = y*cos(-a) - z*sin(-a)). The spin rotation about Y does not change y,
 * so this is independent of the spin angle and of the time of day.
 * Works for any tilt in [0, pi], retrograde included. */
export function subsolarSinLat(rawSun: readonly number[], tiltRad: number): number {
  return rawSun[1] * Math.cos(tiltRad) + rawSun[2] * Math.sin(tiltRad);
}

/** The unit polar (+Y body) axis expressed in the world frame: the inverse of
 * the X(-tilt) counter-rotation applied to (0,1,0), i.e. (0, cos t, sin t).
 * subsolarSinLat(s, t) === dot(s, polarAxisWorld(t)) analytically. */
export function polarAxisWorld(tiltRad: number): V3 {
  return [0, Math.cos(tiltRad), Math.sin(tiltRad)];
}

/** Normalise a raw star-minus-body vector exactly the way THREE's
 * `Vector3.normalize()` does (divideScalar(length || 1) ->
 * multiplyScalar(1 / length)), so a caller reproducing main.ts's
 * `vec(a).sub(vec(b)).normalize()` gets the same bits. */
export function normalizeLikeThree(x: number, y: number, z: number, out: number[]): number[] {
  const len = Math.sqrt(x * x + y * y + z * z) || 1;
  const inv = 1 / len;
  out[0] = x * inv; out[1] = y * inv; out[2] = z * inv;
  return out;
}
