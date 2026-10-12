import { buildComposerLodChain, composerAnatomyLodConstraints, COMPOSER_ANATOMY_LOD_VERSION, COMPOSER_LOD_CONSTRAINTS_VERSION } from "./fauna-composer-lod.js";
import { canonicalComposerJson } from "./fauna-composer-build-receipt.js";
export const FAUNA_COMPOSER_RENDER_VERSION = 'fauna-composer-render-1';
export const FAUNA_COMPOSER_TIERS = ['near', 'middle', 'far'];
/** Full definition includes phenotype, IDs and provenance, not merely recipe text. */
export function faunaComposerSourceKey(definition, sourceVersion, presentation = 'realism-1') {
    return canonicalComposerJson([FAUNA_COMPOSER_RENDER_VERSION, sourceVersion, 'fauna-composer-graph-4', 'fauna-composer-skin-6', 'fauna-composer-lod-1', COMPOSER_LOD_CONSTRAINTS_VERSION, COMPOSER_ANATOMY_LOD_VERSION, presentation, definition]);
}
export function composerRenderSkin(skin) {
    return { version: skin.version, positions: skin.positions, normals: skin.normals, colors: skin.colors,
        skinIndex: skin.skinIndex, skinWeight: skin.skinWeight, index: skin.index, gloss: skin.gloss,
        coatCrisp: skin.coatCrisp, coatLayers: skin.coatLayers, sourceVertex: null };
}
function take(source, vertex, width) {
    const out = new Float32Array(vertex.length * width);
    for (let i = 0; i < vertex.length; i++)
        for (let k = 0; k < width; k++)
            out[i * width + k] = source[vertex[i] * width + k];
    return out;
}
export function composerRenderLod(skin, level) {
    if (!level.normals || !level.gloss)
        throw new Error('Composer LOD lost normals or gloss');
    const layers = skin.coatLayers;
    const coatLayers = layers ? { c0: take(layers.c0, level.sourceVertex, 3),
        c1: take(layers.c1, level.sourceVertex, 3), c2: take(layers.c2, level.sourceVertex, 3), sample: take(layers.sample, level.sourceVertex, 4) } : null;
    return { version: skin.version, positions: level.positions, normals: level.normals, colors: level.colors,
        skinIndex: level.skinIndex, skinWeight: level.skinWeight, index: level.index, gloss: level.gloss,
        coatCrisp: skin.coatCrisp, coatLayers, sourceVertex: level.sourceVertex };
}
/** Run off the render thread. Reduction may stop above target to preserve anatomy. */
export function buildFaunaComposerLevels(source, targets = [4500, 1500]) {
    const chain = buildComposerLodChain(source.skin, targets, composerAnatomyLodConstraints(source.skin, source.graph));
    return { near: composerRenderSkin(source.skin), middle: composerRenderLod(source.skin, chain.levels[0]), far: composerRenderLod(source.skin, chain.levels[1]) };
}
/** A first coarse job need not allocate/copy an unused middle snapshot. The
 * reducer still starts from the same original skin and anatomic constraints. */
export function buildFaunaComposerRequestedLevels(source, tiers, targets = [4500, 1500]) {
    const levels = {};
    if (tiers.includes('near'))
        levels.near = composerRenderSkin(source.skin);
    const reduced = ['middle', 'far'].filter(tier => tiers.includes(tier));
    if (reduced.length) {
        const chain = buildComposerLodChain(source.skin, reduced.map(tier => targets[tier === 'middle' ? 0 : 1]), composerAnatomyLodConstraints(source.skin, source.graph));
        reduced.forEach((tier, i) => { levels[tier] = composerRenderLod(source.skin, chain.levels[i]); });
    }
    return levels;
}
/** Unique backing buffers, including source attributes that geometry does not upload. */
export function composerTypedBytes(value, externallyOwned = new Set()) {
    const buffers = new Set(), seen = new Set();
    function visit(v) {
        if (!v || typeof v !== 'object' || seen.has(v))
            return;
        seen.add(v);
        if (ArrayBuffer.isView(v)) {
            if (!externallyOwned.has(v.buffer))
                buffers.add(v.buffer);
            return;
        }
        for (const child of Object.values(v))
            visit(child);
    }
    visit(value);
    let bytes = 0;
    for (const buffer of buffers)
        bytes += buffer.byteLength;
    return bytes;
}
export function validateComposerRenderSkin(skin, bones) {
    const n = skin.positions.length / 3;
    if (!Number.isInteger(n) || n < 1 || skin.index.length % 3 || !skin.index.length ||
        skin.normals.length !== n * 3 || skin.colors.length !== n * 3 || skin.gloss.length !== n ||
        skin.skinIndex.length !== n * 4 || skin.skinWeight.length !== n * 4 ||
        (skin.sourceVertex !== null && skin.sourceVertex.length !== n))
        throw new Error('Invalid Composer render attribute lengths');
    for (const data of [skin.positions, skin.normals, skin.colors, skin.gloss, skin.skinWeight])
        for (const x of data)
            if (!Number.isFinite(x))
                throw new Error('Non-finite Composer render attribute');
    for (const index of skin.index)
        if (index >= n)
            throw new Error('Composer index exceeds vertices');
    for (let v = 0; v < n; v++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
            const j = v * 4 + k;
            if (skin.skinIndex[j] >= bones || skin.skinWeight[j] < 0)
                throw new Error('Composer weight references invalid bone');
            sum += skin.skinWeight[j];
        }
        if (Math.abs(sum - 1) > 1e-4)
            throw new Error('Composer skin weights are not normalized');
    }
    if (!!skin.coatCrisp !== !!skin.coatLayers)
        throw new Error('Composer crisp coat layers missing');
    if (skin.coatLayers)
        for (const [name, data] of Object.entries(skin.coatLayers)) {
            if (data.length !== n * (name === 'sample' ? 4 : 3) || data.some((x) => !Number.isFinite(x)))
                throw new Error('Invalid Composer crisp coat attribute');
        }
}
/** Proof of identity through reduction: every rendered attribute is an exact
 * surviving original vertex. Positions, joints and appearance cannot come from another animal. */
export function validateComposerRenderLod(source, level) {
    const n = level.positions.length / 3, original = source.positions.length / 3;
    if (level.sourceVertex === null && n !== original)
        throw new Error('Original Composer tier has a different vertex count');
    const arrays = [
        [source.positions, level.positions, 3], [source.normals, level.normals, 3], [source.colors, level.colors, 3],
        [source.skinIndex, level.skinIndex, 4], [source.skinWeight, level.skinWeight, 4], [source.gloss, level.gloss, 1],
    ];
    if (JSON.stringify(source.coatCrisp) !== JSON.stringify(level.coatCrisp))
        throw new Error('LOD coat parameters changed');
    if (source.coatLayers) {
        if (!level.coatLayers)
            throw new Error('LOD coat layers missing');
        for (const key of ['c0', 'c1', 'c2', 'sample'])
            arrays.push([source.coatLayers[key], level.coatLayers[key], key === 'sample' ? 4 : 3]);
    }
    const comparisons = level.sourceVertex === null ? arrays.filter(([a, b]) => a !== b) : arrays;
    if (!comparisons.length && level.sourceVertex === null)
        return;
    for (let v = 0; v < n; v++) {
        const sv = level.sourceVertex?.[v] ?? v;
        if (sv >= original)
            throw new Error('LOD source vertex outside original animal');
        for (const [a, b, width] of comparisons)
            for (let k = 0; k < width; k++)
                if (!Object.is(a[sv * width + k], b[v * width + k]))
                    throw new Error('LOD attribute differs from original Composer animal');
    }
}
