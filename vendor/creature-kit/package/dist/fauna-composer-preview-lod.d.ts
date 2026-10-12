import type { ComposerSkin } from './fauna-composer-mesh.ts';
import type { ComposerGraph } from './fauna-composer-rig.ts';
/** Same original-vertex reduction as Atlas. A single requested tier is built
 * directly from the source, as in Atlas's requested-tier worker jobs. */
export declare function composerPreviewLod(skin: ComposerSkin, graph: ComposerGraph, target: number): ComposerSkin;
