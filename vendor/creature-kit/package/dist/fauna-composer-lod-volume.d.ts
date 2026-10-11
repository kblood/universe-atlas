/** Original-vertex volume constraints. No replacement surfaces or moved vertices. */
import type { ComposerLodAnatomyGraph, ComposerLodOptions, ComposerLodSource } from './fauna-composer-lod.ts';
type Constraints = Pick<ComposerLodOptions, 'protectedVertices' | 'vertexImportance' | 'deformationScale'>;
export declare function applyComposerVolumeConstraints(source: ComposerLodSource, graph: ComposerLodAnatomyGraph, base: Constraints): Constraints;
export {};
