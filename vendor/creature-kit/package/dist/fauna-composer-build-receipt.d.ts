import { type FaunaComposerBuildJob, type FaunaComposerBuildResult } from './fauna-composer-render-source.ts';
/** Stable JSON identity independent of insertion order. Definitions are plain
 * replay data; non-finite numbers and cycles are rejected, never normalized. */
export declare function canonicalComposerJson(value: unknown): string;
export declare function freezeComposerDefinition(value: unknown): void;
/** Each native digest is asynchronous. No all-buffer concatenation or vertex
 * scan happens on the render thread. Typed view boundaries/types are hashed too. */
export declare function composerContentDigest(value: unknown): Promise<string>;
export interface FaunaComposerBuildReceipt {
    schema: 'composer-source-verification-1';
    key: string;
    definitionDigest: string;
    payloadDigest: string;
    graphDigest: string;
    skinDigest: string;
    sourceVersion: string;
    graphVersion: string;
    skinVersion: string;
    byteLength: number;
    vertices: number;
    bones: number;
}
/** Worker-only strict source/LOD checks followed by a receipt bound to the
 * actual transferred arrays, complete definition, source and render versions. */
export declare function createComposerBuildReceipt<D>(job: FaunaComposerBuildJob<D>, result: FaunaComposerBuildResult): Promise<FaunaComposerBuildReceipt>;
/** Main-side integrity check. A matching string/tag alone never authorizes
 * adoption: both the real definition and all returned data are rehashed. */
export declare function verifyComposerBuildReceipt<D>(job: FaunaComposerBuildJob<D>, result: FaunaComposerBuildResult): Promise<void>;
export declare function isVerifiedComposerBuild(result: FaunaComposerBuildResult): boolean;
