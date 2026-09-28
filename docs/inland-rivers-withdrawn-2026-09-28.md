# Inland rivers withdrawn (2026-09-28)

Inland rivers are temporarily removed from the Atlas at the owner's request.
The river source modules and their historical tests remain in the repository.

## What is withdrawn

- Canonical and regional river generation. Focusing or approaching a body no
  longer starts the hydrology worker (`ensureCanonicalHydrology` returns
  immediately), and `hydrologyReady` never gates contact terrain.
- Channel, tributary and lake-bowl carving, inland wet-bed sampling, the
  regional bank palette and the conservative river-bed tile envelope.
- River water, bank dressing and lake reflection meshes.
- The hydrology fine-contact level and regional water refinement floor.
  Landing and walking use ordinary contact terrain.
- **Find rivers and a lake**, the drainage atlas, river sites, river flight,
  river/drainage exports and `?river=` restore.

## Regional lakes

Inland lakes exist only as `RiverRegion.lakes`, built by
`river-generation.ts` for a river's own catchment. There is no independent lake
catalogue, so these lakes are withdrawn together with the rivers. Dated global
oceans come from `world-surface.ts` and are unchanged.

## Boundary

`src/inland-rivers.ts` is the single switch. `terrainSampler` now defaults to
`activeRiverRegions(body)`, which is empty. Tiles, surface queries, the
renderer and the registry read the same module, so a stale `body.hydrology` or
`body.canonicalRivers` has no effect on production results. Passing regions
explicitly to `terrainSampler` still runs the archived algorithm. The archived
river test files call `setArchivedInlandRiversForTesting(true)`; application
code must not call it (`tests/inland-rivers-disabled.test.mjs` enforces this).

## Versions and links

- `TERRAIN_VERSION` `terrain-1.5.0` → `terrain-1.6.0`
- `SURFACE_VERSION` `atlas-surface-6-lifecycle-sampler` →
  `atlas-surface-7-no-inland-rivers`
- `BUILD_VERSION` → `atlas-client-2026-09-28-no-inland-rivers-1`

Terrain without a river region is numerically unchanged. The bumps record that
generated surfaces no longer carry inland water. A bookmark with the older
terrain or surface version shows the existing model-version notice, which now
also states that inland rivers and their regional lakes are unavailable. A link
containing `river=` opens the ordinary body view with a concise notice, and the
parameter is dropped when the URL is next written.

## Validation

`tests/inland-rivers-disabled.test.mjs` covers production sampler, orbit
preview and tile independence from attached rivers, the dated ocean, the
absent hydrology worker, renderer contact without hydrology readiness, and the
compatibility notices. Browser visual acceptance was not run for this change.
