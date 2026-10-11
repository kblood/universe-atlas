import { type CoatGenome, type CoatSample } from './fauna-coat-fields.ts';
/** Sample-layer semantics shared by the historical planet sampler and Composer.
 * No body generator, actor, material or mutable random stream is involved. */
export declare const FAUNA_JUVENILE_COAT_VERSION = "planet-juvenile-coat-1";
export interface FaunaJuvenileCoatStage {
    version: typeof FAUNA_JUVENILE_COAT_VERSION;
    stage: 'adult' | 'juvenile';
    maturity: number;
}
export declare function faunaJuvenileStockingStrength(maturity: number): number;
/** Writes the prepared coat plus the shared planetary stage layers. Caller
 * supplies unwarped body coordinates for the fawn rows, independent of pattern
 * phase/lateral offsets. Forced masks are the Composer's existing crisp layers;
 * applying stage layers to all three keeps them visible through that shader. */
export declare function evaluateFaunaStageCoat(coat: CoatGenome, stage: FaunaJuvenileCoatStage, sample: CoatSample, body: {
    x: number;
    y: number;
    z: number;
    halfH: number;
    halfW: number;
    cell: number;
}, out: Float64Array, mask?: number, patch?: number): void;
/** Linear cream of fawn spots (the WP1 juvenile-spot white). */
export declare const FAWN_CREAM: readonly [0.6, 0.585, 0.55];
export interface FaunaFawnSpotLayout {
    radius: number;
    spacing: number;
    rowGap: number;
    rows: readonly number[];
}
/** Spot layout in torso lengths for a near body whose vertex cell is
 * `cell` torso lengths. */
export declare function faunaFawnSpotLayout(cell: number): FaunaFawnSpotLayout;
export declare function faunaFawnSpotMask(seed: number, x: number, dy: number, z: number, cell: number, halfH: number, halfW: number): number;
