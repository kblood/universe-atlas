/** Fixed local routes only. Adding a family requires an authored registry entry;
 * specimen queries never select an arbitrary URL, filename or directory. */
export const FAUNA_TEMPLATE_ASSETS = Object.freeze({
  'deer-doe-v1': Object.freeze({ id: 'atlas-deer-doe-v1', root: 'assets/fauna/deer-doe-v1/', runtime: 'deer-doe.glb', sidecar: 'fauna-template.json' }),
});
export type FaunaTemplateAssetKey = keyof typeof FAUNA_TEMPLATE_ASSETS;
const digest = (value: string) => /^[a-f0-9]{64}$/i.test(value);
export function faunaTemplateRevisionLocation(key: FaunaTemplateAssetKey, pins: {assetHash: string; sidecarHash: string}) {
  if (!Object.hasOwn(FAUNA_TEMPLATE_ASSETS, key)) throw new Error('Unknown authored fauna asset');
  const asset = FAUNA_TEMPLATE_ASSETS[key];
  for (const hash of [pins.assetHash, pins.sidecarHash]) if (hash && !digest(hash)) throw new Error('Invalid fauna revision hash');
  if (pins.sidecarHash && !pins.assetHash) throw new Error('A sidecar revision requires its GLB revision');
  const retained = Boolean(pins.assetHash && pins.sidecarHash);
  const relativeRoot = asset.root + (retained ? `revisions/${pins.assetHash.toLowerCase()}/${pins.sidecarHash.toLowerCase()}/` : '');
  return { ...asset, retained, relativeRoot, runtimePath: relativeRoot + asset.runtime, sidecarPath: relativeRoot + asset.sidecar };
}
