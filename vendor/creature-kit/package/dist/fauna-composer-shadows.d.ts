export declare function composerShadowStrength(distance: number, near?: number, far?: number): number;
/** A stable 4x4 shadow-map dither. Strength 1 preserves every original fragment;
 * strength 0 discards all. PCF filtering smooths intermediate coverage. */
export declare function patchComposerShadowFade(shader: {
    vertexShader: string;
    fragmentShader: string;
}, expression: string): void;
