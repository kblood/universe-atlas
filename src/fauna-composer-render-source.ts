import type {ComposerGraph} from './fauna-composer-rig.ts';
import type {ComposerSkin, ComposerCoatLayers} from './fauna-composer-mesh.ts';
import {buildComposerLodChain, composerFootLodConstraints, type ComposerLodLevel} from './fauna-composer-lod.ts';

export const FAUNA_COMPOSER_RENDER_VERSION = 'fauna-composer-render-1';
export const FAUNA_COMPOSER_TIERS = ['near', 'middle', 'far'] as const;
export type FaunaComposerTier = typeof FAUNA_COMPOSER_TIERS[number];
export type FaunaComposerRenderSkin = Pick<ComposerSkin, 'positions'|'normals'|'colors'|'skinIndex'|'skinWeight'|'index'|'gloss'|'coatCrisp'|'coatLayers'> & {
  /** Immutable original skin revision, shared by every tier. */
  version: ComposerSkin['version'];
  /** Exact original vertex for every reduced vertex; null for the original mesh. */
  sourceVertex: Uint32Array | null;
};
export interface FaunaComposerSource {graph: ComposerGraph; skin: ComposerSkin}
export interface FaunaComposerBuildJob<D> {
  key: string; definition: D; tiers: readonly FaunaComposerTier[];
  /** Borrowed: a worker provider must COPY these arrays, never detach resident buffers. */
  loadedSource?: FaunaComposerSource;
}
export interface FaunaComposerBuildResult {
  key: string; source: FaunaComposerSource;
  levels: Partial<Record<FaunaComposerTier, FaunaComposerRenderSkin>>;
  buildMs: number;
}
export interface FaunaComposerSourceProvider<D> {
  /** Must return asynchronously (normally a single worker). One request is active at a time. */
  build(job: FaunaComposerBuildJob<D>, signal: AbortSignal): Promise<FaunaComposerBuildResult>;
  dispose?(): void;
}
/** Full definition includes phenotype, IDs and provenance, not merely recipe text. */
export function faunaComposerSourceKey(definition: unknown, sourceVersion: string, presentation = 'realism-1'): string {
  return JSON.stringify([FAUNA_COMPOSER_RENDER_VERSION, sourceVersion, presentation, definition]);
}
export function composerRenderSkin(skin: ComposerSkin): FaunaComposerRenderSkin {
  return {version: skin.version, positions: skin.positions, normals: skin.normals, colors: skin.colors,
    skinIndex: skin.skinIndex, skinWeight: skin.skinWeight, index: skin.index, gloss: skin.gloss,
    coatCrisp: skin.coatCrisp, coatLayers: skin.coatLayers, sourceVertex: null};
}
function take(source: Float32Array, vertex: Uint32Array, width: number): Float32Array {
  const out = new Float32Array(vertex.length * width);
  for (let i = 0; i < vertex.length; i++) for (let k = 0; k < width; k++) out[i * width + k] = source[vertex[i]! * width + k]!;
  return out;
}
export function composerRenderLod(skin: ComposerSkin, level: ComposerLodLevel): FaunaComposerRenderSkin {
  if (!level.normals || !level.gloss) throw new Error('Composer LOD lost normals or gloss');
  const layers = skin.coatLayers;
  const coatLayers: ComposerCoatLayers | null = layers ? {c0: take(layers.c0, level.sourceVertex, 3),
    c1: take(layers.c1, level.sourceVertex, 3), c2: take(layers.c2, level.sourceVertex, 3), sample: take(layers.sample, level.sourceVertex, 4)} : null;
  return {version: skin.version, positions: level.positions, normals: level.normals, colors: level.colors,
    skinIndex: level.skinIndex, skinWeight: level.skinWeight, index: level.index, gloss: level.gloss,
    coatCrisp: skin.coatCrisp, coatLayers, sourceVertex: level.sourceVertex};
}
/** Run off the render thread. Reduction may stop above target to preserve anatomy. */
export function buildFaunaComposerLevels(source: FaunaComposerSource, targets: readonly [number, number] = [4500, 1500]): Record<FaunaComposerTier, FaunaComposerRenderSkin> {
  const chain = buildComposerLodChain(source.skin, targets, composerFootLodConstraints(source.skin));
  return {near: composerRenderSkin(source.skin), middle: composerRenderLod(source.skin, chain.levels[0]!), far: composerRenderLod(source.skin, chain.levels[1]!)};
}
/** Unique backing buffers, including source attributes that geometry does not upload. */
export function composerTypedBytes(value: unknown): number {
  const buffers = new Set<ArrayBufferLike>(), seen = new Set<object>();
  function visit(v: unknown): void {
    if (!v || typeof v !== 'object' || seen.has(v)) return; seen.add(v);
    if (ArrayBuffer.isView(v)) {buffers.add(v.buffer); return;}
    for (const child of Object.values(v)) visit(child);
  }
  visit(value); let bytes = 0; for (const buffer of buffers) bytes += buffer.byteLength; return bytes;
}
export function validateComposerRenderSkin(skin: FaunaComposerRenderSkin, bones: number): void {
  const n = skin.positions.length / 3;
  if (!Number.isInteger(n) || n < 1 || skin.index.length % 3 || !skin.index.length ||
      skin.normals.length !== n * 3 || skin.colors.length !== n * 3 || skin.gloss.length !== n ||
      skin.skinIndex.length !== n * 4 || skin.skinWeight.length !== n * 4 ||
      (skin.sourceVertex !== null && skin.sourceVertex.length !== n)) throw new Error('Invalid Composer render attribute lengths');
  for (const data of [skin.positions, skin.normals, skin.colors, skin.gloss, skin.skinWeight]) for (const x of data) if (!Number.isFinite(x)) throw new Error('Non-finite Composer render attribute');
  for (const index of skin.index) if (index >= n) throw new Error('Composer index exceeds vertices');
  for (let v = 0; v < n; v++) {
    let sum = 0; for (let k = 0; k < 4; k++) {const j = v * 4 + k;
      if (skin.skinIndex[j]! >= bones || skin.skinWeight[j]! < 0) throw new Error('Composer weight references invalid bone'); sum += skin.skinWeight[j]!;}
    if (Math.abs(sum - 1) > 1e-4) throw new Error('Composer skin weights are not normalized');
  }
  if (!!skin.coatCrisp !== !!skin.coatLayers) throw new Error('Composer crisp coat layers missing');
  if (skin.coatLayers) for (const [name, data] of Object.entries(skin.coatLayers)) {
    if (data.length !== n * (name === 'sample' ? 4 : 3) || data.some((x: number) => !Number.isFinite(x))) throw new Error('Invalid Composer crisp coat attribute');
  }
}
/** Proof of identity through reduction: every rendered attribute is an exact
 * surviving original vertex. Positions, joints and appearance cannot come from another animal. */
export function validateComposerRenderLod(source: ComposerSkin, level: FaunaComposerRenderSkin): void {
  const n = level.positions.length / 3, original = source.positions.length / 3;
  if (level.sourceVertex === null && n !== original) throw new Error('Original Composer tier has a different vertex count');
  const arrays: [Float32Array | Uint16Array, Float32Array | Uint16Array, number][] = [
    [source.positions, level.positions, 3], [source.normals, level.normals, 3], [source.colors, level.colors, 3],
    [source.skinIndex, level.skinIndex, 4], [source.skinWeight, level.skinWeight, 4], [source.gloss, level.gloss, 1],
  ];
  if (JSON.stringify(source.coatCrisp) !== JSON.stringify(level.coatCrisp)) throw new Error('LOD coat parameters changed');
  if (source.coatLayers) {
    if (!level.coatLayers) throw new Error('LOD coat layers missing');
    for (const key of ['c0', 'c1', 'c2', 'sample'] as const) arrays.push([source.coatLayers[key], level.coatLayers[key], key === 'sample' ? 4 : 3]);
  }
  for (let v = 0; v < n; v++) {
    const sv = level.sourceVertex?.[v] ?? v; if (sv >= original) throw new Error('LOD source vertex outside original animal');
    for (const [a, b, width] of arrays) for (let k = 0; k < width; k++) if (!Object.is(a[sv * width + k], b[v * width + k])) throw new Error('LOD attribute differs from original Composer animal');
  }
}
