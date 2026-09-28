import type {BufferGeometry} from 'three';

/** Reference skeleton height used by the detailed tree vertex shader. */
export const TREE_CANOPY_REFERENCE_HEIGHT_M = 16;
export const TREE_CANOPY_WIND_MAX_ANGLE_RAD = 0.12;
export const TREE_CANOPY_HEIGHT_RANGE_M = [10, 22] as const;
const LEAF_BRANCH_LEVEL = 3.5;
const BAND_COUNT = 4;

export type CrownBand = {
  /** Mean attachment pivot in the 16 m reference skeleton, in metres. */
  centerM: [number, number, number];
  /** Populated bands expose their actual reference-space vertical extent. */
  minY_M: number;
  maxY_M: number;
  halfHeightM: number;
  populated: boolean;
  /** 90th-percentile pivot radius in XZ at reference scale; visual shape only. */
  radiusM: number;
  count: number;
};
export type TreeCanopyProfile = {
  referenceHeightM: 16;
  bands: [CrownBand, CrownBand, CrownBand, CrownBand];
  /** Maximum source vertex offset from its attachment pivot, kept in metres. */
  maxLeafOffsetM: number;
  radiusStatistic: 'p90-visual-only';
};
export type TreeCullingBounds = {
  /** Origin-centred sphere enclosing all supported scaled and wind-deformed vertices. */
  centerM: [0, 0, 0];
  radiusM: number;
  heightRangeM: [10, 22];
  maxWindAngleRad: number;
};
export type TreeCanopyMetadata = {profile: TreeCanopyProfile; cullingBounds: TreeCullingBounds};

type Attributes = {position: Float32Array; pivot: Float32Array; branch: Float32Array; wind: Float32Array};

function readAttributes(geometries: readonly BufferGeometry[]): Attributes[] {
  if (!Array.isArray(geometries) || geometries.length === 0) throw new Error('At least one tree geometry is required');
  return geometries.map((geometry, index) => {
    if (!geometry || typeof geometry.getAttribute !== 'function') throw new Error(`Invalid tree geometry ${index}`);
    const position = geometry.getAttribute('position'), pivot = geometry.getAttribute('_leaf_pivot');
    const branch = geometry.getAttribute('_branch_level'), wind = geometry.getAttribute('_wind');
    if (!position || position.itemSize !== 3 || !pivot || pivot.itemSize !== 3 || !branch || branch.itemSize !== 1 || !wind || wind.itemSize !== 1 ||
      position.count < 1 || pivot.count !== position.count || branch.count !== position.count || wind.count !== position.count ||
      ![position, pivot, branch, wind].every(a => a.array instanceof Float32Array)) throw new Error(`Tree geometry ${index} is missing valid float vertex attributes`);
    return {position: position.array as Float32Array, pivot: pivot.array as Float32Array,
      branch: branch.array as Float32Array, wind: wind.array as Float32Array};
  });
}

const finite = (x: number) => Number.isFinite(x);
function percentile(values: number[], q: number): number {
  if (!values.length) return 0;
  values.sort((a, b) => a - b);
  return values[Math.max(0, Math.ceil(q * values.length) - 1)];
}
function maxNormAtAngle(px: number, py: number, pz: number, ox: number, oy: number, oz: number, s: number, angle: number): number {
  const c = Math.cos(angle), sn = Math.sin(angle);
  const x = px * s + ox * c - oy * sn;
  const y = py * s + ox * sn + oy * c;
  const z = pz * s + oz;
  return Math.hypot(x, y, z);
}
function maxDeformedVertexRadius(px: number, py: number, pz: number, qx: number, qy: number, qz: number,
  leaf: boolean, wind: number): number {
  if (!leaf) return Math.hypot(px, py, pz) * TREE_CANOPY_HEIGHT_RANGE_M[1] / TREE_CANOPY_REFERENCE_HEIGHT_M;
  const ox = px - qx, oy = py - qy, oz = pz - qz, maxAngle = TREE_CANOPY_WIND_MAX_ANGLE_RAD * wind;
  let maximum = 0;
  // For fixed angle, squared distance is convex in uniform skeleton scale, so
  // its maximum over 10..22 m is at an endpoint. Angular maxima occur at the
  // interval ends or where A cos(theta)+B sin(theta) has a stationary point.
  const A = qx * ox + qy * oy, B = -qx * oy + qy * ox;
  const candidates = [-maxAngle, maxAngle];
  const stationary = Math.atan2(B, A);
  for (let k = -2; k <= 2; k++) {
    const a = stationary + k * Math.PI;
    if (a >= -maxAngle && a <= maxAngle) candidates.push(a);
  }
  for (const height of TREE_CANOPY_HEIGHT_RANGE_M) {
    const s = height / TREE_CANOPY_REFERENCE_HEIGHT_M;
    for (const angle of candidates) maximum = Math.max(maximum, maxNormAtAngle(qx, qy, qz, ox, oy, oz, s, angle));
  }
  return maximum;
}

/** Derive separate shape and culling data from the exact loaded vertex contract.
 * The p90 crown radii are deliberately visual representatives, never bounds. */
export function deriveTreeCanopyMetadata(geometries: readonly BufferGeometry[]): TreeCanopyMetadata {
  const sources = readAttributes(geometries);
  const samples: {x: number; y: number; z: number; band: number}[] = [];
  let maxLeafOffsetM = 0, cullingRadiusM = 0;
  for (const source of sources) {
    for (let i = 0; i < source.branch.length; i++) {
      const j = i * 3, px = source.position[j], py = source.position[j + 1], pz = source.position[j + 2];
      const qx = source.pivot[j], qy = source.pivot[j + 1], qz = source.pivot[j + 2];
      const branch = source.branch[i], wind = source.wind[i];
      if (![px, py, pz, qx, qy, qz, branch, wind].every(finite) || wind < 0 || wind > 1) throw new Error('Tree vertex contains non-finite data or wind outside [0,1]');
      const leaf = branch > LEAF_BRANCH_LEVEL;
      cullingRadiusM = Math.max(cullingRadiusM, maxDeformedVertexRadius(px, py, pz, qx, qy, qz, leaf, wind));
      if (!leaf) continue;
      const x = qx, y = qy, z = qz;
      const normHeight = y / TREE_CANOPY_REFERENCE_HEIGHT_M;
      const band = Math.max(0, Math.min(BAND_COUNT - 1, Math.floor(normHeight * BAND_COUNT)));
      samples.push({x, y, z, band});
      maxLeafOffsetM = Math.max(maxLeafOffsetM, Math.hypot(px - qx, py - qy, pz - qz));
    }
  }
  if (!samples.length) throw new Error('Tree family contains no foliage pivots');
  const bands = Array.from({length: BAND_COUNT}, (_, i): CrownBand => {
    const members = samples.filter(sample => sample.band === i);
    const centerM: [number, number, number] = members.length
      ? [members.reduce((n, x) => n + x.x, 0) / members.length,
        members.reduce((n, x) => n + x.y, 0) / members.length,
        members.reduce((n, x) => n + x.z, 0) / members.length]
      : [0, (i + .5) * TREE_CANOPY_REFERENCE_HEIGHT_M / BAND_COUNT, 0];
    const radii = members.map(sample => Math.hypot(sample.x - centerM[0], sample.z - centerM[2]));
    const minY_M = members.length ? Math.min(...members.map(sample => sample.y)) : 0;
    const maxY_M = members.length ? Math.max(...members.map(sample => sample.y)) : 0;
    const halfHeightM = members.length ? (maxY_M - minY_M) / 2 : 0;
    if (members.length) centerM[1] = minY_M + halfHeightM;
    return {centerM, minY_M, maxY_M, halfHeightM,
      populated: members.length > 0, radiusM: percentile(radii, .9), count: members.length};
  }) as [CrownBand, CrownBand, CrownBand, CrownBand];
  // Enclose the visible band envelopes too. Each is bounded by a horizontal
  // disk and vertical half-height around its center. Both profile dimensions
  // scale with the skeleton; card offsets remain metric and are added unchanged.
  for (const band of bands) {
    if (!band.populated) continue;
    const envelope = Math.hypot(...band.centerM) * 22 / 16 +
      Math.hypot(band.radiusM, band.halfHeightM) * 22 / 16 + maxLeafOffsetM;
    cullingRadiusM = Math.max(cullingRadiusM, envelope);
  }
  if (!finite(cullingRadiusM) || cullingRadiusM <= 0 || !finite(maxLeafOffsetM)) throw new Error('Invalid derived tree bounds');
  return {
    profile: {referenceHeightM: 16, bands, maxLeafOffsetM, radiusStatistic: 'p90-visual-only'},
    cullingBounds: {centerM: [0, 0, 0], radiusM: cullingRadiusM, heightRangeM: [10, 22], maxWindAngleRad: TREE_CANOPY_WIND_MAX_ANGLE_RAD},
  };
}

const srgbLinearLut = Float64Array.from({length: 256}, (_, byte) => {
  const v = byte / 255;
  return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
});

/** Alpha-weighted mean of straight-alpha sRGB RGBA byte pixels, returned in linear RGB. */
export function alphaWeightedLinearRgbMean(rgba: ArrayLike<number>): {linearRgb: [number, number, number]; alphaWeight: number; pixelCount: number} {
  if (!rgba || !Number.isSafeInteger(rgba.length) || rgba.length === 0 || rgba.length % 4 !== 0) throw new Error('Expected non-empty straight sRGB RGBA pixels');
  let weight = 0, r = 0, g = 0, b = 0;
  const byteArray = rgba instanceof Uint8Array || rgba instanceof Uint8ClampedArray;
  for (let i = 0; i < rgba.length; i += 4) {
    const red = rgba[i], green = rgba[i + 1], blue = rgba[i + 2], alpha = rgba[i + 3];
    if (!byteArray && (!Number.isInteger(red) || red < 0 || red > 255 || !Number.isInteger(green) || green < 0 || green > 255 ||
      !Number.isInteger(blue) || blue < 0 || blue > 255 || !Number.isInteger(alpha) || alpha < 0 || alpha > 255)) throw new Error('RGBA values must be integer bytes');
    const a = alpha / 255;
    weight += a; r += srgbLinearLut[red] * a; g += srgbLinearLut[green] * a; b += srgbLinearLut[blue] * a;
  }
  if (weight <= 0) throw new Error('RGBA pixels have no alpha weight');
  return {linearRgb: [r / weight, g / weight, b / weight], alphaWeight: weight, pixelCount: rgba.length / 4};
}
