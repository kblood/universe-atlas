# Atlas consumes the actual planetary animal core

Current migration branch, 2026-10-11: Kit 0.8 adds the shared Composer definition,
resolved phenotype, source, terrain pose and anatomy LOD contract. Normal planet
rendering now uses that source; the extraction and quadruped inspection history
below remains preserved compatibility documentation. See
`creature-kit-consumption.md` and `planet-composer-migration-acceptance.md` for
current integration and verification scope.

Extraction baseline: Atlas `f96a8c1`. Kit release `0.2.0` owns the existing
canonical core in `src/planet-v1/`: creature-model, fauna-appearance,
fauna-body-plan, fauna-face, fauna-structural-appendages and fauna-locomotion.
Its structural caller contract replaces one Atlas-only type import. All
genotype/geometry/appearance/pose arithmetic and data versions are unchanged.
Atlas retains population, IDs, ancestry, habitats, exact dates and ground inputs.

Atlas's six previous source paths are named compatibility reexports of the
public built planet entry. The private package import `#creature-kit/planet`
resolves inside this clone to `vendor/creature-kit/package/dist/planet-v1/index.js`
(and its declaration entry), matching `creature-kit/planet` in the package's
exports. Production species generation, phenotype, skin construction and
locomotion now execute Kit-owned code. There is no external-checkout runtime
import, npm link or dependency installation. The experimental composer and
authored deer reference still exist; this does not claim their formats have
already become one biological generator.

## Shared inspection in Kit 0.3.0

Atlas's Lab now opens planetary animal inspection when `mode` is omitted. The
explicit gallery/anatomy/arena/ancestry URLs remain available as legacy rig
references; composer remains experimental and the authored deer remains a
reference. `createFaunaSkinInspector` delegates body/skeleton/inspection to
Kit's public `createPlanetAnimalInspector`, supplying Atlas's exact date and
activity callbacks plus its material. No population ID or genome is regenerated.

The canonical skin view offers **Export canonical animal for Kit Lab**. Its
`planet-animal-definition-1` record carries individual ID, species ID and the
exact inspected genome. Kit's independent `apps/creature-lab/planet-skin.html`
accepts that record or a raw current genome without reseeding; incompatible
genome versions require explicit migration. Standalone poses are deliberate
inspection fixtures; the Kit page does not reinterpret world dates.

The **Independent Animal Lab** link opens `/animal-lab/planet-skin.html`.
The same update command builds the committed Kit app into fresh staging and
includes its self-contained HTML/assets in Atlas's `public/animal-lab/`.
`vendor/creature-kit/LAB.json` pins app sources, artifact hashes, Vite version
and the same exact Kit release/commit as the runtime package. Dirty, missing,
failed, stale or malformed app inputs leave both package and app unchanged.
Kit's `npm run lab:dev` and `npm run lab:build` remain independent workflows;
the library package itself does not include the app bundle.

Release 0.3.0 adds shared inspection/definition APIs and UI, with unchanged
canonical genome/body versions. Kit's 65 focused core/inspector/Lab/boundary
checks pass without skips. Atlas's 23 focused checks compare production pooled
and shared-inspector body arrays, skinning matrices and foot diagnostics across
dated/idle/walk/feed poses; legacy URL round trips also pass. Both app builds
and Atlas TypeScript pass. Canonical output pins remain unchanged.

## Update/check

```powershell
npm run update:creature-kit -- --kit C:/LLM/IWSDK/creature-kit
npm run check:creature-kit
```

The first command consumes the configured local checkout's latest committed
HEAD, compiles a fresh isolated package and updates both the existing composer
source receipt and the built runtime package. It does not publish/download a
package or change node_modules. A fresh Atlas checkout needs only its normal
project dependencies: the committed package works without a sibling Kit repo.
To restore a prior version, restore the Atlas update commit and its receipts.

`VENDOR.json` pins the source-owned paths; `creature-kit-manifest.json` pins package version,
commit, license, public entry, compiler, exact source hashes and every artifact.
Checks detect altered/unmanifested artifacts, changed Kit sources/HEAD, wrong
entry/version and incompatible Three peers. Update preflights every source and
fresh built artifact before changing Atlas. Dirty/missing/failed/stale/malformed
inputs preserve the previous vendor byte-for-byte; filesystem write failures
roll back owned files. Previous manifest-owned stale files alone may be removed.

## Evidence and source-hash ledger

- Kit boundary plus frozen `f96a8c1` migration corpus: six checks pass.
- Atlas model/body/locomotion/coat/vendor focused suite: 38 checks pass.
- New built-entry identity and frozen corpus gates pass: unchanged inherited
  genomes, twelve adult/juvenile body-buffer digests, coat and terrain-aware
  walk/feed poses. Source data versions remain creature-genome-1,
  fauna-appearance-2 and quadruped-body-4.
- Update tests exercise an actual committed factory upgrade through the package
  seam and verify full preservation on missing/dirty/failed/stale/malformed
  inputs plus artifact/peer drift. Three checks pass.
- TypeScript and root's fresh-checkout build pass. Actual two-world low-hover
  routes preserve animal IDs, poses, positions and cached body hashes without
  landing. The independent Lab exports/imports definitions unchanged and
  renders the same genotype, geometry counts and 22 bones. Final clean release
  verification remains required before publication. No canonical world or
  geometry pin is re-generated.

Kit `53afe42` includes optional LOD constraints, with unchanged default reducer
output. The planetary extraction moves no composer generator source. CLI source
hashes (computed using the original sorted-path/LF algorithm) are:

| source | v1 generator hash | v2 generator hash |
|---|---|---|
| Kit 5e4265f | a9e1ae028536fd0ef358eda150bcafcba595d42ddbe1cff8d579b06af6e531f0 | 9a571eaefeb261971b59f4b960418fc1647c15b5fea45e8225a2c26cc2677829 |
| Kit 53afe42 | unchanged | 0d0a0f68316a30abfa8d1f29cefdbb1ad379dfdb3c41c901a040e88dc8e992f7 |

The v2 hash change records the LOD tool's additive constraints; it is not a
biology/geometry re-pin. Sidecars naming that tool legitimately report its new
source hash. Default mesh bytes and legacy v1 export pins stay guarded.
Ledger capture is preserved under shared `Assets/_assetctl/planet-core-migration/`.
