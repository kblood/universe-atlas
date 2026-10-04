/**
 * Headless GLB export for the modular creature composer (fauna-composer-export-1; backlog task 10, creature-kit phase 3).
 *
 * exportCreatureGlb(recipe) builds the creature exactly as the runtime does (createComposerCreature: normalise, derive
 * the individual, graph, skin, three's vertex normals) and writes a binary glTF 2.0 file directly. three's GLTFExporter
 * is not used: it needs FileReader in Node, and a hand-written writer keeps the bytes fixed (a second export of the same
 * recipe is byte-identical in the same engine).
 *
 * Contents:
 * - one skinned mesh, one primitive, one material (vertex colour, roughness 0.82, metalness 0, as the runtime);
 *   POSITION, NORMAL, COLOR_0 (linear), JOINTS_0, WEIGHTS_0, optionally the application attribute _COMPOSER_GLOSS;
 * - one joint node per graph bone, in graph order, named as the graph names them, all children of the skeleton root
 *   (the composer's flat bone list: every bone carries its creature-space pose);
 * - inverse bind matrices of the rest skeleton;
 * - one animation per motion, sampled from poseComposer(graph, motion, t) at the requested rate. Walk is a treadmill
 *   (the animal stays centred); the clip's travel speed is in its extras and in the report.
 *
 * Axes: metres, +Y up, right-handed. By default the skeleton root turns the composer's +X heading onto +Z, glTF's
 * asset front; forward '+X' keeps the composer frame. The skinned mesh node is a scene root with no transform.
 *
 * This module imports only the composer core and three (no Atlas module, no Node API), so it runs in a browser too.
 */
import * as THREE from 'three';
import {createComposerCreature} from './fauna-composer.ts';
import {COMPOSER_RECIPE_VERSION, decodeComposerRecipe, encodeComposerRecipe, normalizeComposerRecipe, type ComposerRecipe} from './fauna-composer-recipe.ts';
import {COMPOSER_GRAPH_VERSION, COMPOSER_MOTIONS, poseComposer, type ComposerGraph, type ComposerMotion, type ComposerPose} from './fauna-composer-rig.ts';
import {COMPOSER_SKIN_VERSION} from './fauna-composer-mesh.ts';
import {COMPOSER_INDIVIDUAL_VERSION, composerSpeciesKey} from './fauna-composer-individual.ts';
import {COMPOSER_FACE_VERSION} from './fauna-composer-face.ts';
import {COMPOSER_FACE_GEOMETRY_VERSION} from './fauna-composer-face-geometry.ts';
import {COMPOSER_EYE_VERSION} from './fauna-composer-eye.ts';
import {COMPOSER_EYE_CATALOGUE_VERSION} from './fauna-composer-eye-catalogue.ts';
import {COMPOSER_SPECIES_GENERATOR_VERSION} from './fauna-composer-species.ts';
import {FAUNA_COAT_FIELD_VERSION} from './fauna-coat-fields.ts';

export const COMPOSER_EXPORT_VERSION = 'fauna-composer-export-1';
export const COMPOSER_EXPORT_DEFAULT_FPS = 30;
/** glTF application-specific attribute (leading underscore) carrying the runtime gloss channel. */
export const COMPOSER_GLOSS_ATTRIBUTE = '_COMPOSER_GLOSS';
export type ComposerGlossMode = 'attribute' | 'drop';
export type ComposerExportForward = '+Z' | '+X';
/** Default clip windows (seconds). Walk is searched over whole gait periods up to `maxSeconds`; idle and display over a
 * 1/fps grid between `minSeconds` and `maxSeconds` for the smallest seam (their sinusoids are incommensurate, so the
 * seam is usually small but not zero; the report says so). A static motion bakes two identical keys one second apart. */
export const COMPOSER_EXPORT_CLIP_WINDOW = Object.freeze({minSeconds: 4, maxSeconds: 12});
/** A clip loops seamlessly when the pose at its end equals the pose at t=0 within these (metres, radians). */
export const COMPOSER_EXPORT_SEAM_TOLERANCE = Object.freeze({position: 5e-4, angle: 0.25 * Math.PI / 180, scale: 1e-3});

export interface ComposerClipRequest {motion: ComposerMotion; fps?: number; duration?: number}
export interface ComposerExportOptions {
  /** Motions (or explicit clip windows) to bake; default every COMPOSER_MOTIONS entry. */
  clips?: readonly (ComposerMotion | ComposerClipRequest)[];
  fps?: number;
  gloss?: ComposerGlossMode;
  forward?: ComposerExportForward;
  /** Name of the skeleton root node (default 'composer-creature'). */
  name?: string;
}
export interface ComposerClipWindow {
  duration: number; keys: number;
  /** Largest bone position (m), rotation (rad) and scale difference between the poses at 0 and `duration`. */
  seamPosition: number; seamAngle: number; seamScale: number; seamless: boolean;
  /** How the window was chosen. */
  method: 'static' | 'gait-periods' | 'seam-search' | 'requested';
}
export interface ComposerBakedClipReport extends ComposerClipWindow {
  motion: ComposerMotion; fps: number;
  /** Treadmill speed (m/s) along the exported forward axis; 0 for motions that stay in place. */
  travelSpeed: number;
  channels: {translation: number; rotation: number; scale: number};
}
export interface ComposerExportReport {
  version: typeof COMPOSER_EXPORT_VERSION;
  recipeText: string; speciesKey: string;
  versions: Record<string, string | number>;
  individual: {deltas: string[]; effectiveRecipeText: string};
  axes: {units: 'metres'; up: '+Y'; handedness: 'right'; forward: ComposerExportForward};
  mesh: {vertices: number; triangles: number; bones: number; parts: {part: string; label: string; firstTriangle: number; triangles: number}[];
    restBounds: {min: [number, number, number]; max: [number, number, number]}};
  gloss: ComposerGlossMode;
  /** Vertex rows changed to satisfy glTF: duplicate joints merged, zero-weight joints reset to 0, sums renormalised. */
  repairs: {weightRows: number; maxWeightChange: number; zeroNormals: number};
  clips: ComposerBakedClipReport[];
  glbBytes: number;
}
export interface ComposerExportResult {glb: Uint8Array; report: ComposerExportReport}

const FORWARD_ROOT: Record<ComposerExportForward, [number, number, number, number]> = {
  // rotation by -90 deg about +Y maps +X to +Z
  '+Z': [0, -Math.SQRT1_2, 0, Math.SQRT1_2],
  '+X': [0, 0, 0, 1],
};

/** The versions a GLB depends on, in a fixed order. */
export function composerExportVersions(): Record<string, string | number> {
  return {
    export: COMPOSER_EXPORT_VERSION, recipe: COMPOSER_RECIPE_VERSION, graph: COMPOSER_GRAPH_VERSION, skin: COMPOSER_SKIN_VERSION,
    individual: COMPOSER_INDIVIDUAL_VERSION, face: COMPOSER_FACE_VERSION, faceGeometry: COMPOSER_FACE_GEOMETRY_VERSION,
    eye: COMPOSER_EYE_VERSION, eyeCatalogue: COMPOSER_EYE_CATALOGUE_VERSION, species: COMPOSER_SPECIES_GENERATOR_VERSION,
    coat: FAUNA_COAT_FIELD_VERSION, three: THREE.REVISION,
  };
}

// ------------------------------------------------------------------ clip sampling

/** Largest bone position difference (m), rotation difference (rad) and bone scale difference between two poses. */
export function composerPoseDistance(a: ComposerPose, b: ComposerPose): {position: number; angle: number; scale: number} {
  let position = 0, angle = 0, scale = 0;
  for (let i = 0; i < a.positions.length; i++) position = Math.max(position, Math.abs(a.positions[i]! - b.positions[i]!));
  for (let i = 0; i < a.radialScale.length; i++) scale = Math.max(scale, Math.abs(a.radialScale[i]! - b.radialScale[i]!), Math.abs(a.radialScale[i]! * a.chordScale[i]! - b.radialScale[i]! * b.chordScale[i]!));
  const q = a.quaternions, p = b.quaternions;
  for (let i = 0; i < q.length; i += 4) {
    // relative rotation conj(a) * b; atan2 keeps tiny angles exact (acos of a dot product rounds them to ~3e-8)
    const ax = -q[i]!, ay = -q[i + 1]!, az = -q[i + 2]!, aw = q[i + 3]!, bx = p[i]!, by = p[i + 1]!, bz = p[i + 2]!, bw = p[i + 3]!;
    const rx = aw * bx + ax * bw + ay * bz - az * by, ry = aw * by - ax * bz + ay * bw + az * bx, rz = aw * bz + ax * by - ay * bx + az * bw;
    const rw = aw * bw - ax * bx - ay * by - az * bz;
    angle = Math.max(angle, 2 * Math.atan2(Math.hypot(rx, ry, rz), Math.abs(rw)));
  }
  return {position, angle, scale};
}
type PoseDistance = ReturnType<typeof composerPoseDistance>;
const seamScore = (d: PoseDistance) =>
  Math.max(d.position / COMPOSER_EXPORT_SEAM_TOLERANCE.position, d.angle / COMPOSER_EXPORT_SEAM_TOLERANCE.angle, d.scale / COMPOSER_EXPORT_SEAM_TOLERANCE.scale);
const isSeamless = (d: PoseDistance) => seamScore(d) <= 1;

/** The clip window for a motion: deterministic, chosen by measuring poseComposer (never by reading its constants). */
export function composerClipWindow(graph: ComposerGraph, motion: ComposerMotion, fps = COMPOSER_EXPORT_DEFAULT_FPS, duration?: number): ComposerClipWindow {
  if (!(fps > 0 && fps <= 240)) throw new Error(`composer export: fps ${fps} outside (0, 240]`);
  const start = poseComposer(graph, motion, 0);
  const scored = new Map<ComposerClipWindow, number>();
  const window = (d: number, method: ComposerClipWindow['method']): ComposerClipWindow => {
    const seam = composerPoseDistance(start, poseComposer(graph, motion, d));
    const w = {duration: d, keys: Math.max(1, Math.round(d * fps)) + 1, seamPosition: seam.position, seamAngle: seam.angle, seamScale: seam.scale, seamless: isSeamless(seam), method};
    scored.set(w, seamScore(seam));
    return w;
  };
  if (duration !== undefined) {
    if (!(duration > 0 && duration <= 120)) throw new Error(`composer export: duration ${duration} outside (0, 120]`);
    return window(duration, 'requested');
  }
  const same = (a: ComposerPose, b: ComposerPose) => (['positions', 'quaternions', 'radialScale', 'chordScale'] as const).every(k => a[k].every((v, i) => v === b[k][i]));
  if ([0.37, 1.13, 2.71].every(t => same(start, poseComposer(graph, motion, t))))
    return {duration: 1, keys: 2, seamPosition: 0, seamAngle: 0, seamScale: 0, seamless: true, method: 'static'};
  const {minSeconds, maxSeconds} = COMPOSER_EXPORT_CLIP_WINDOW;
  let best: ComposerClipWindow | null = null, bestScore = Infinity;
  const consider = (d: number, method: ComposerClipWindow['method']) => {
    const w = window(d, method), s = scored.get(w)!;
    if (s < bestScore - 1e-12) { best = w; bestScore = s; }
    return w.seamless;
  };
  if (motion === 'walk') {
    const period = graph.locomotion.period;
    for (let k = 1; k * period <= Math.max(maxSeconds, period); k++) if (consider(k * period, 'gait-periods')) break;
  } else {
    for (let k = Math.ceil(minSeconds * fps); k <= Math.floor(maxSeconds * fps); k++) consider(k / fps, 'seam-search');
  }
  return best!;
}

/** Samples poseComposer at `window.keys` evenly spaced times over [0, duration] (both ends included). Per bone:
 * keys x 3 translations, keys x 4 rotations, keys x 3 scales (null when the scale never leaves 1). Quaternions are
 * kept in one hemisphere from key to key so slerp playback never takes the long way round. */
export function bakeComposerClip(graph: ComposerGraph, motion: ComposerMotion, window: Pick<ComposerClipWindow, 'duration' | 'keys'>): {
  times: Float32Array; translation: Float32Array[]; rotation: Float32Array[]; scale: (Float32Array | null)[]; travelSpeed: number;
} {
  const n = graph.bones.length, keys = window.keys;
  const times = new Float32Array(keys);
  const translation = Array.from({length: n}, () => new Float32Array(keys * 3));
  const rotation = Array.from({length: n}, () => new Float32Array(keys * 4));
  const scaleRaw = Array.from({length: n}, () => new Float32Array(keys * 3));
  const scaleUsed = new Array<boolean>(n).fill(false);
  const prev = new Float64Array(n * 4);
  let travelSpeed = 0;
  for (let k = 0; k < keys; k++) {
    const t = keys === 1 ? 0 : window.duration * k / (keys - 1);
    times[k] = t;
    const pose = poseComposer(graph, motion, t);
    if (k === keys - 1 && t > 0) travelSpeed = pose.travel / t;
    for (let i = 0; i < n; i++) {
      translation[i]!.set([pose.positions[i * 3]!, pose.positions[i * 3 + 1]!, pose.positions[i * 3 + 2]!], k * 3);
      let x = pose.quaternions[i * 4]!, y = pose.quaternions[i * 4 + 1]!, z = pose.quaternions[i * 4 + 2]!, w = pose.quaternions[i * 4 + 3]!;
      const len = Math.hypot(x, y, z, w); x /= len; y /= len; z /= len; w /= len;
      if (k > 0 && x * prev[i * 4]! + y * prev[i * 4 + 1]! + z * prev[i * 4 + 2]! + w * prev[i * 4 + 3]! < 0) { x = -x; y = -y; z = -z; w = -w; }
      prev.set([x, y, z, w], i * 4);
      rotation[i]!.set([x, y, z, w], k * 4);
      const radial = pose.radialScale[i]!, sy = radial, sz = radial * pose.chordScale[i]!;
      scaleRaw[i]!.set([1, sy, sz], k * 3);
      if (Math.fround(sy) !== 1 || Math.fround(sz) !== 1) scaleUsed[i] = true;
    }
  }
  return {times, translation, rotation, scale: scaleRaw.map((s, i) => scaleUsed[i] ? s : null), travelSpeed};
}

// ------------------------------------------------------------------ GLB writer

const GL = Object.freeze({FLOAT: 5126, UNSIGNED_BYTE: 5121, UNSIGNED_SHORT: 5123, UNSIGNED_INT: 5125, ARRAY_BUFFER: 34962, ELEMENT_ARRAY_BUFFER: 34963, TRIANGLES: 4});
type AccessorType = 'SCALAR' | 'VEC3' | 'VEC4' | 'MAT4';
const COMPONENTS: Record<AccessorType, number> = {SCALAR: 1, VEC3: 3, VEC4: 4, MAT4: 16};

class GlbBuilder {
  readonly bufferViews: Record<string, number>[] = [];
  readonly accessors: Record<string, unknown>[] = [];
  private chunks: Uint8Array[] = [];
  private length = 0;
  /** Appends bytes 4-byte aligned; returns the byte offset in the binary chunk. */
  private append(bytes: Uint8Array): number {
    const pad = (4 - (this.length % 4)) % 4;
    if (pad) { this.chunks.push(new Uint8Array(pad)); this.length += pad; }
    const offset = this.length; this.chunks.push(bytes); this.length += bytes.byteLength;
    return offset;
  }
  bufferView(data: ArrayBufferView, target?: number, byteStride?: number): number {
    const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    const view: Record<string, number> = {buffer: 0, byteOffset: this.append(bytes.slice()), byteLength: bytes.byteLength};
    if (byteStride) view.byteStride = byteStride;
    if (target) view.target = target;
    return this.bufferViews.push(view) - 1;
  }
  accessor(view: number, byteOffset: number, componentType: number, count: number, type: AccessorType, extra: {min?: number[]; max?: number[]; normalized?: boolean} = {}): number {
    const a: Record<string, unknown> = {bufferView: view};
    if (byteOffset) a.byteOffset = byteOffset;
    a.componentType = componentType;
    if (extra.normalized) a.normalized = true;
    a.count = count; a.type = type;
    if (extra.min) a.min = extra.min;
    if (extra.max) a.max = extra.max;
    return this.accessors.push(a) - 1;
  }
  /** One tightly packed accessor in its own buffer view. */
  data(array: Float32Array | Uint16Array | Uint32Array | Uint8Array, type: AccessorType, target?: number, withBounds = false): number {
    const componentType = array instanceof Float32Array ? GL.FLOAT : array instanceof Uint16Array ? GL.UNSIGNED_SHORT : array instanceof Uint32Array ? GL.UNSIGNED_INT : GL.UNSIGNED_BYTE;
    const c = COMPONENTS[type], count = array.length / c;
    let bounds: {min?: number[]; max?: number[]} = {};
    if (withBounds) bounds = componentBounds(array, c);
    return this.accessor(this.bufferView(array, target), 0, componentType, count, type, bounds);
  }
  /** Writes the container: `doc` (key order kept) followed by accessors, bufferViews and the one buffer. */
  finish(doc: Record<string, unknown>): Uint8Array {
    const enc = new TextEncoder();
    const binLength = this.length + ((4 - (this.length % 4)) % 4);
    const json = {...doc, accessors: this.accessors, bufferViews: this.bufferViews, buffers: [{byteLength: binLength}]};
    let jsonBytes = enc.encode(JSON.stringify(json));
    const jsonPad = (4 - (jsonBytes.byteLength % 4)) % 4;
    if (jsonPad) { const padded = new Uint8Array(jsonBytes.byteLength + jsonPad).fill(0x20); padded.set(jsonBytes); jsonBytes = padded; }
    const total = 12 + 8 + jsonBytes.byteLength + 8 + binLength;
    const out = new Uint8Array(total), dv = new DataView(out.buffer);
    dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
    dv.setUint32(12, jsonBytes.byteLength, true); dv.setUint32(16, 0x4e4f534a, true); out.set(jsonBytes, 20);
    let o = 20 + jsonBytes.byteLength;
    dv.setUint32(o, binLength, true); dv.setUint32(o + 4, 0x004e4942, true); o += 8;
    let p = 0;
    for (const chunk of this.chunks) { out.set(chunk, o + p); p += chunk.byteLength; }
    return out;
  }
}
function componentBounds(array: ArrayLike<number>, c: number): {min: number[]; max: number[]} {
  const min = new Array<number>(c).fill(Infinity), max = new Array<number>(c).fill(-Infinity);
  for (let i = 0; i < array.length; i++) { const k = i % c, v = array[i]!; if (v < min[k]!) min[k] = v; if (v > max[k]!) max[k] = v; }
  return {min, max};
}

/** Parses a GLB container (header, JSON chunk, BIN chunk). Throws on a malformed file. */
export function readComposerGlb(bytes: Uint8Array): {json: any; bin: Uint8Array} {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 20 || dv.getUint32(0, true) !== 0x46546c67) throw new Error('GLB: bad magic');
  if (dv.getUint32(4, true) !== 2) throw new Error('GLB: not version 2');
  if (dv.getUint32(8, true) !== bytes.byteLength) throw new Error('GLB: header length does not match the file');
  const jsonLength = dv.getUint32(12, true);
  if (dv.getUint32(16, true) !== 0x4e4f534a || jsonLength % 4) throw new Error('GLB: first chunk is not an aligned JSON chunk');
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength)));
  const o = 20 + jsonLength;
  if (o === bytes.byteLength) return {json, bin: new Uint8Array(0)};
  const binLength = dv.getUint32(o, true);
  if (dv.getUint32(o + 4, true) !== 0x004e4942 || binLength % 4 || o + 8 + binLength !== bytes.byteLength) throw new Error('GLB: second chunk is not an aligned BIN chunk ending the file');
  return {json, bin: bytes.subarray(o + 8, o + 8 + binLength)};
}

/** glTF requires every weight row to sum to 1 and a joint to appear at most once with a non-zero weight; unused slots
 * point at joint 0. The composer's rows already sum to 1 within float rounding; this merges duplicates and renormalises. */
function gltfSkinRows(skinIndex: Uint16Array, skinWeight: Float32Array): {joints: Uint16Array; weights: Float32Array; rows: number; maxChange: number} {
  const joints = new Uint16Array(skinIndex.length), weights = new Float32Array(skinWeight.length);
  let rows = 0, maxChange = 0;
  for (let v = 0; v < skinIndex.length; v += 4) {
    const j: number[] = [], w: number[] = [];
    for (let k = 0; k < 4; k++) {
      const wk = skinWeight[v + k]!, jk = skinIndex[v + k]!;
      if (!(wk > 0)) continue;
      const at = j.indexOf(jk);
      if (at >= 0) w[at] += wk; else { j.push(jk); w.push(wk); }
    }
    const sum = w.reduce((s, x) => s + x, 0);
    if (!(sum > 0)) throw new Error(`composer export: vertex ${v / 4} has no skin weight`);
    for (let k = 0; k < 4; k++) { joints[v + k] = k < j.length ? j[k]! : 0; weights[v + k] = k < j.length ? Math.fround(w[k]! / sum) : 0; }
    // float32 residual goes onto the largest weight so the stored row sums to 1 as closely as float32 allows
    let big = 0; for (let k = 1; k < j.length; k++) if (weights[v + k]! > weights[v + big]!) big = k;
    let stored = 0; for (let k = 0; k < 4; k++) stored += weights[v + k]!;
    weights[v + big] = Math.fround(weights[v + big]! + (1 - stored));
    let changed = false;
    for (let k = 0; k < 4; k++) {
      if (joints[v + k] !== skinIndex[v + k] && weights[v + k]! > 0) changed = true;
      const d = Math.abs(weights[v + k]! - (skinWeight[v + k]! > 0 ? skinWeight[v + k]! : 0));
      if (joints[v + k] === skinIndex[v + k]) maxChange = Math.max(maxChange, d);
      if (d > 0) changed = true;
    }
    if (changed) rows++;
  }
  return {joints, weights, rows, maxChange};
}

function resolveRecipe(input: ComposerRecipe | string): ComposerRecipe {
  if (typeof input === 'string') {
    const decoded = decodeComposerRecipe(input);
    if (!decoded.recipe) throw new Error(`composer export: ${decoded.error}`);
    return decoded.recipe;
  }
  return normalizeComposerRecipe(input).recipe;
}

/** Builds the creature for `recipe` (a recipe object or its shared text) and returns the GLB bytes and a report. */
export function exportCreatureGlb(input: ComposerRecipe | string, options: ComposerExportOptions = {}): ComposerExportResult {
  const recipe = resolveRecipe(input);
  const fps = options.fps ?? COMPOSER_EXPORT_DEFAULT_FPS;
  const gloss = options.gloss ?? 'attribute', forward = options.forward ?? '+Z';
  if (gloss !== 'attribute' && gloss !== 'drop') throw new Error(`composer export: unknown gloss mode ${String(gloss)}`);
  if (!Object.hasOwn(FORWARD_ROOT, forward)) throw new Error(`composer export: unknown forward axis ${String(forward)}`);
  const requests: ComposerClipRequest[] = (options.clips ?? COMPOSER_MOTIONS).map(c => typeof c === 'string' ? {motion: c} : {...c});
  for (const r of requests) if (!(COMPOSER_MOTIONS as readonly string[]).includes(r.motion)) throw new Error(`composer export: unknown motion ${String(r.motion)}`);
  if (new Set(requests.map(r => r.motion)).size !== requests.length) throw new Error('composer export: a motion is listed twice');

  const creature = createComposerCreature(recipe);
  try {
    const {graph, skin} = creature;
    const geometry = creature.mesh.geometry;
    const normals = (geometry.getAttribute('normal') as THREE.BufferAttribute).array as Float32Array;
    const normalOut = new Float32Array(normals);
    let zeroNormals = 0;
    for (let i = 0; i < normalOut.length; i += 3) {
      const l = Math.hypot(normalOut[i]!, normalOut[i + 1]!, normalOut[i + 2]!);
      if (!(l > 0.5)) { normalOut.set([0, 1, 0], i); zeroNormals++; }
    }
    const rows = gltfSkinRows(skin.skinIndex, skin.skinWeight);
    const b = new GlbBuilder();
    const rootName = options.name ?? 'composer-creature';
    const recipeText = encodeComposerRecipe(recipe);
    const effectiveRecipeText = encodeComposerRecipe(creature.individual.effectiveRecipe);
    const versions = composerExportVersions();

    // ---- mesh
    const attributes: Record<string, number> = {
      POSITION: b.data(skin.positions, 'VEC3', GL.ARRAY_BUFFER, true),
      NORMAL: b.data(normalOut, 'VEC3', GL.ARRAY_BUFFER),
      COLOR_0: b.data(skin.colors, 'VEC3', GL.ARRAY_BUFFER),
      JOINTS_0: b.data(rows.joints, 'VEC4', GL.ARRAY_BUFFER),
      WEIGHTS_0: b.data(rows.weights, 'VEC4', GL.ARRAY_BUFFER),
    };
    if (gloss === 'attribute') attributes[COMPOSER_GLOSS_ATTRIBUTE] = b.data(skin.gloss, 'SCALAR', GL.ARRAY_BUFFER);
    const index = skin.vertexCount <= 0xffff ? Uint16Array.from(skin.index) : skin.index;
    const indices = b.data(index, 'SCALAR', GL.ELEMENT_ARRAY_BUFFER);
    const parts = skin.parts.map(p => ({part: p.part, label: p.label, firstTriangle: p.firstTriangle, triangles: p.triangles}));

    // ---- skeleton
    const n = graph.bones.length;
    const ibm = new Float32Array(n * 16), m = new THREE.Matrix4();
    graph.bones.forEach((bone, i) => {
      m.compose(new THREE.Vector3().fromArray(bone.restPosition), new THREE.Quaternion().fromArray(bone.restQuaternion), new THREE.Vector3(1, 1, 1)).invert();
      ibm.set(m.elements, i * 16);
    });
    const ibmAccessor = b.data(ibm, 'MAT4');
    const SKIN_NODE = 0, ROOT_NODE = 1, FIRST_JOINT = 2;
    const nodes: Record<string, unknown>[] = [
      {name: 'composer-skin', mesh: 0, skin: 0},
      {name: rootName, ...(forward === '+X' ? {} : {rotation: FORWARD_ROOT[forward]}), children: graph.bones.map((_, i) => FIRST_JOINT + i)},
      ...graph.bones.map(bone => {
        const q = new THREE.Quaternion().fromArray(bone.restQuaternion).normalize();
        return {name: bone.name, rotation: [q.x, q.y, q.z, q.w], translation: [...bone.restPosition]};
      }),
    ];

    // ---- animations
    const clipReports: ComposerBakedClipReport[] = [];
    const animations: Record<string, unknown>[] = [];
    for (const request of requests) {
      const clipFps = request.fps ?? fps;
      const window = composerClipWindow(graph, request.motion, clipFps, request.duration);
      const baked = bakeComposerClip(graph, request.motion, window);
      const input = b.data(baked.times, 'SCALAR', undefined, true);
      const samplers: Record<string, unknown>[] = [], channels: Record<string, unknown>[] = [];
      const counts = {translation: 0, rotation: 0, scale: 0};
      const channel = (bone: number, path: 'translation' | 'rotation' | 'scale', data: Float32Array, type: AccessorType) => {
        const output = b.data(data, type);
        channels.push({sampler: samplers.push({input, interpolation: 'LINEAR', output}) - 1, target: {node: FIRST_JOINT + bone, path}});
        counts[path]++;
      };
      for (let i = 0; i < n; i++) {
        channel(i, 'translation', baked.translation[i]!, 'VEC3');
        channel(i, 'rotation', baked.rotation[i]!, 'VEC4');
        if (baked.scale[i]) channel(i, 'scale', baked.scale[i]!, 'VEC3');
      }
      const travelSpeed = baked.travelSpeed;
      const report: ComposerBakedClipReport = {motion: request.motion, fps: clipFps, ...window, travelSpeed, channels: counts};
      clipReports.push(report);
      animations.push({name: request.motion, channels, samplers, extras: {composer: {travelSpeed, seamless: window.seamless, seamPosition: window.seamPosition, seamAngle: window.seamAngle, seamScale: window.seamScale}}});
    }

    const restBounds = componentBounds(skin.positions, 3) as {min: [number, number, number]; max: [number, number, number]};
    const glb = b.finish({
      asset: {version: '2.0', generator: `universe-atlas ${COMPOSER_EXPORT_VERSION}`, extras: {composer: {recipeText, speciesKey: composerSpeciesKey(recipe), versions}}},
      scene: 0,
      scenes: [{name: rootName, nodes: [SKIN_NODE, ROOT_NODE]}],
      nodes,
      meshes: [{name: 'composer-skin', primitives: [{attributes, indices, material: 0, mode: GL.TRIANGLES}], extras: {composer: {parts}}}],
      materials: [{name: 'composer-coloured', pbrMetallicRoughness: {baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.82}}],
      skins: [{name: 'composer-skeleton', inverseBindMatrices: ibmAccessor, skeleton: ROOT_NODE, joints: graph.bones.map((_, i) => FIRST_JOINT + i)}],
      ...(animations.length ? {animations} : {}),
    });
    const report: ComposerExportReport = {
      version: COMPOSER_EXPORT_VERSION, recipeText, speciesKey: composerSpeciesKey(recipe), versions,
      individual: {deltas: creature.individual.deltas, effectiveRecipeText},
      axes: {units: 'metres', up: '+Y', handedness: 'right', forward},
      mesh: {vertices: skin.vertexCount, triangles: skin.triangleCount, bones: n, parts, restBounds},
      gloss, repairs: {weightRows: rows.rows, maxWeightChange: rows.maxChange, zeroNormals}, clips: clipReports, glbBytes: glb.byteLength,
    };
    return {glb, report};
  } finally {
    creature.dispose();
  }
}
