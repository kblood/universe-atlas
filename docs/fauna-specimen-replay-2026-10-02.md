# Authored specimen replay revisions

New Creature Lab links for a successfully loaded Blender reference use
`replayVersion=2`, `assetHash=<64 hex>` and `sidecarHash=<64 hex>`.

- `assetHash` retains its existing meaning: SHA-256 of downloaded GLB bytes.
- `sidecarHash` is SHA-256 of the exact downloaded sidecar bytes, before JSON
  parsing. Whitespace/reformatting therefore changes the revision too.
- Morph values, recipe version, locks, specimen identity, growth, view and pose
  state keep their existing meanings. No morphology or lighting change is
  implied by this URL extension.

The Lab validates requested pins, compares both revisions before creating
actors and leaves the scene empty on failure. A missing, malformed, unavailable
or mismatched sidecar cannot silently select a current candidate or procedural
fallback. Copying a link is disabled while the specimen is loading or failed.
Explicitly changing Source clears the requested revision, as before.

## Compatibility

URLs without a replay version are treated as version 1. Existing GLB-only
`assetHash` links continue checking that GLB hash; they make **no claim** to pin
historical morph/joint metadata. Legacy links without hashes remain unpinned.
Opening a legacy link and copying a new link records both hashes of the files
actually loaded. It cannot recover a previously unrecorded sidecar hash.

Malformed hash strings, repeated pin parameters, unknown replay versions and
version 2 Blender links missing either hash are rejected by the display guard.
The general state parser remains tolerant for existing callers; the Lab runs
the explicit replay-input guard before loading the reference. CPU-created
template fixtures have null hashes unless genuine metadata is supplied; no
sidecar hash is fabricated from a parsed object.

## Immutable retained revisions

Complete hash pairs resolve through an authored local registry to:

```text
assets/fauna/deer-doe-v1/revisions/<assetHash>/<sidecarHash>/deer-doe.glb
assets/fauna/deer-doe-v1/revisions/<assetHash>/<sidecarHash>/fauna-template.json
```

Only registered templates, fixed filenames and 64 hexadecimal hashes are
accepted. Queries cannot provide an arbitrary path or URL. The Lab hashes the
downloaded retained files again and checks both pins. Missing or modified
retained files fail with an empty scene; they never fall back to defaults.
GLB-only legacy links still use the default location and their existing GLB
check: a missing historical sidecar identity cannot be inferred safely.

Before replacing default files, archive both the outgoing and incoming pairs
using the named operation from the workspace root:

```powershell
node tools/assetctl/assetctl.mjs fauna-revision stage --template deer-doe-v1 --input universe-atlas/public/assets/fauna/deer-doe-v1 --dry-run
node tools/assetctl/assetctl.mjs fauna-revision stage --template deer-doe-v1 --input universe-atlas/public/assets/fauna/deer-doe-v1
node tools/assetctl/assetctl.mjs fauna-revision stage --template deer-doe-v1 --input Assets/_assetctl/deer-doe-candidate-024
```

The last command illustrates staging a candidate; it does not promote it or
approve its quality. Default replacement and deployment remain separate work.
Deploy the retained directories with the default asset and never delete a
published revision while links to it must remain supported. The fixed local
registry has only the actual deer template; it supports later authored entries
without advertising unbuilt families.

Staging validates Khronos glTF, embedded resources, the sidecar, morph names and
the matching neutral rig. It copies exact bytes, preserves an available
authoring manifest, writes hashes and validation scope into `revision.json`,
and publishes the new directory atomically. Existing identical revisions are
idempotent; differing or incomplete revisions are rejected without overwrite.
It neither switches defaults nor grants licenses or visual/device acceptance.

Current public candidate 021 is retained with GLB hash
`23233caf7427587e88ce74a25a347297d8e67da0fd6b0fa7c811b0c544d5a6b3`
and sidecar hash
`5d4caf2e1e7ba6faef5b36b1f450ae6caf0520063666f00fa371919ca5a19b60`.
Its known raw GLB all-one morph defaults are recorded as a historical review
limitation. The archive preserves those original bytes; it is not neutral
authoring approval. Actual staging receipts:
`test-results/fauna-template-021-revision-dry-run.json` and
`test-results/fauna-template-021-revision-stage.json`.

This pins the two asset files, not the entire application implementation,
Three.js version, renderer, shaders or browser/GPU. Preserving historical
appearance and motion across future application revisions still requires an
application/recipe revision policy. A link cannot recover a revision that was
never retained and deployed.

## Verification

Focused CPU tests cover byte hashing (including JSON formatting changes with
unchanged GLB), invalid JSON, missing synthetic metadata, state round trips,
uppercase normalization, duplicate/malformed/incomplete pins, both mismatches
and explicit legacy behavior. Browser assertions cover sidecar hash mismatch,
valid sidecar joint-delta tampering with unchanged GLB, HTTP failure, malformed
JSON, malformed/missing pins, empty failure scenes and legacy-link upgrade.
The coordinated browser run now passes on actual candidate 021, including all
six failure cases, legacy upgrade, eleven specimen configurations, recipe replay
and stable resource counts. Receipt:
`test-results/fauna-template-sidecar-replay-021/report.json`.
That earlier receipt proves the hash guards and current-file replay. New CPU
tests additionally pass fixed-route validation, prototype/path rejection,
byte-preserving dry-run/staging, idempotence, separate sidecar revisions,
corrupt/incomplete archive rejection, rig/morph mismatch, embedded-resource
enforcement and redirected-directory rejection. TypeScript compilation passes.
Browser assertions now also simulate a valid default GLB/sidecar upgrade, open
the old v2 link from its actual retained directory, and reject a missing
revision without fetching defaults. The parent agent's serialized browser run
passed these cases on actual retained 021:
`test-results/fauna-template-immutable-replay-021/report.json`.
This verifies retained asset-byte replay, not creature visual acceptance.
