import { type PlanetComposerDefinition } from './planet-composer.ts';
import { type ComposerSkinPresentation } from './fauna-composer-mesh.ts';
export declare const PLANET_COMPOSER_IDENTITY_VERSION = "planet-composer-identity-1";
export interface PlanetComposerSourceIdentityOptions {
    presentation?: ComposerSkinPresentation; /** Caller release commit/build pin; defaults to the explicit source contract revision. */
    codePin?: string;
}
export interface PlanetComposerSourceIdentity {
    readonly key: string;
    readonly digest: string;
    readonly canonical: string;
    readonly versions: Readonly<{
        source: string;
        graph: string;
        skin: string;
        lod: string;
        constraints: string;
        footLod: string;
        anatomyLod: string;
        presentation: ComposerSkinPresentation;
        codePin: string;
    }>;
}
/** Compute once per immutable member/definition and carry key through frames.
 * Calls on an already deeply frozen definition return the same token; mutable
 * debug inputs are revalidated and never gain a stale identity cache. */
export declare function planetComposerSourceIdentity(definition: PlanetComposerDefinition, options?: PlanetComposerSourceIdentityOptions): PlanetComposerSourceIdentity;
/** Validate the canonical payload as well as its compact key when admitting a
 * cached or worker-built source. Per-frame dispatch may then compare only key. */
export declare function assertPlanetComposerSourceIdentity(expected: Pick<PlanetComposerSourceIdentity, 'key' | 'canonical'>, actual: Pick<PlanetComposerSourceIdentity, 'key' | 'canonical'>): void;
