// Module load hook for tests only (mountains cost plan T4): loads src/terrain.ts with TERRAIN_MOUNTAINS_WIRED = true,
// so a child process can exercise the callers that use the default (staged, unwired) sampler exactly as the T6 wiring
// will run them. Registered by tests/helpers/wire-mountains.mjs via `node --import`. Throws if the constant's
// declaration is missing, so a renamed constant cannot silently leave the child unwired. Once the wiring lands (the
// constant is true in the source) the hook is a no-op.
const FROM = 'export const TERRAIN_MOUNTAINS_WIRED = false;', TO = 'export const TERRAIN_MOUNTAINS_WIRED = true;';
export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);
  if (!/\/src\/terrain\.ts$/.test(url)) return result;
  const source = String(result.source);
  if (source.includes(TO)) return result;
  if (!source.includes(FROM)) throw new Error(`wire-mountains-hook: ${url} has no "${FROM}" declaration`);
  return {...result, source: source.replace(FROM, TO)};
}
