import { composerTypedBytes, validateComposerRenderSkin, validateComposerRenderLod } from "./fauna-composer-render-source.js";
const verified = new WeakSet();
/** Stable JSON identity independent of insertion order. Definitions are plain
 * replay data; non-finite numbers and cycles are rejected, never normalized. */
export function canonicalComposerJson(value) {
    const seen = new Set();
    function sort(v) {
        if (typeof v === 'number' && !Number.isFinite(v))
            throw new Error('Non-finite Composer identity');
        if (!v || typeof v !== 'object')
            return v;
        if (seen.has(v))
            throw new Error('Cyclic Composer identity');
        seen.add(v);
        let out;
        if (Array.isArray(v))
            out = v.map(sort);
        else {
            const entries = [];
            for (const key of Object.keys(v).sort())
                entries.push([key, sort(v[key])]);
            out = Object.fromEntries(entries);
        }
        seen.delete(v);
        return out;
    }
    return JSON.stringify(sort(value));
}
export function freezeComposerDefinition(value) {
    if (!value || typeof value !== 'object')
        return;
    for (const v of Object.values(value))
        freezeComposerDefinition(v);
    Object.freeze(value);
}
const hex = (array) => [...new Uint8Array(array)].map(x => x.toString(16).padStart(2, '0')).join('');
async function sha(bytes) { return hex(await crypto.subtle.digest('SHA-256', bytes)); }
const encoder = new TextEncoder();
/** Each native digest is asynchronous. No all-buffer concatenation or vertex
 * scan happens on the render thread. Typed view boundaries/types are hashed too. */
export async function composerContentDigest(value) {
    const seen = new Set();
    async function describe(v) {
        if (!v || typeof v !== 'object')
            return v;
        if (ArrayBuffer.isView(v))
            return { typed: v.constructor.name, bytes: v.byteLength,
                sha256: await sha(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)) };
        if (seen.has(v))
            throw new Error('Cyclic Composer payload');
        seen.add(v);
        let result;
        if (Array.isArray(v)) {
            const out = [];
            for (const x of v)
                out.push(await describe(x));
            result = out;
        }
        else {
            const out = {};
            for (const key of Object.keys(v).sort())
                out[key] = await describe(v[key]);
            result = out;
        }
        seen.delete(v);
        return result;
    }
    return sha(encoder.encode(canonicalComposerJson(await describe(value))));
}
function payload(result) { return { key: result.key, source: result.source, levels: result.levels }; }
/** Worker-only strict source/LOD checks followed by a receipt bound to the
 * actual transferred arrays, complete definition, source and render versions. */
export async function createComposerBuildReceipt(job, result) {
    const source = result.source, bones = source.graph.bones.length;
    validateComposerRenderSkin({ ...source.skin, sourceVertex: null }, bones);
    for (const level of Object.values(result.levels)) {
        validateComposerRenderSkin(level, bones);
        validateComposerRenderLod(source.skin, level);
    }
    return { schema: 'composer-source-verification-1', key: job.key, definitionDigest: await composerContentDigest(job.definition),
        payloadDigest: await composerContentDigest(payload(result)), graphDigest: await composerContentDigest(source.graph), skinDigest: await composerContentDigest(source.skin), sourceVersion: source.sourceVersion ?? `${source.graph.version}/${source.skin.version}`,
        graphVersion: source.graph.version, skinVersion: source.skin.version, byteLength: composerTypedBytes(result), vertices: source.skin.positions.length / 3, bones };
}
/** Main-side integrity check. A matching string/tag alone never authorizes
 * adoption: both the real definition and all returned data are rehashed. */
export async function verifyComposerBuildReceipt(job, result) {
    const r = result.receipt;
    if (!r || r.schema !== 'composer-source-verification-1' || r.key !== job.key || result.key !== job.key ||
        r.skinVersion !== result.source.skin.version || r.graphVersion !== result.source.graph.version ||
        r.sourceVersion !== (result.source.sourceVersion ?? `${result.source.graph.version}/${result.source.skin.version}`) ||
        r.byteLength !== composerTypedBytes(result) || r.bones !== result.source.graph.bones.length || r.vertices !== result.source.skin.positions.length / 3)
        throw new Error('Composer verification receipt metadata mismatch');
    if (await composerContentDigest(job.definition) !== r.definitionDigest || await composerContentDigest(payload(result)) !== r.payloadDigest || await composerContentDigest(result.source.graph) !== r.graphDigest || await composerContentDigest(result.source.skin) !== r.skinDigest)
        throw new Error('Composer verification receipt digest mismatch');
    verified.add(result);
}
export function isVerifiedComposerBuild(result) { return verified.has(result); }
