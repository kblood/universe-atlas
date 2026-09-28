# Compact detailed tree families: browser verification

## Run and inputs

`browser-run-2/report.json` records the passing local run on `2026-09-28` against the development app at `http://127.0.0.1:5197/`, using Playwright with `ATLAS_HARDWARE=1`. Renderer: NVIDIA GeForce RTX 5090, ANGLE D3D11. The checkout was `4848f5a`; report `sourceHashes` and `sourceIntegrity` bind the runtime inputs, runner, and GLB files. The Oak GLBs were `atlas-ez-family-f` (SHA-256 `4a18a187…c0068` / `cd6a2f08…b61fa9`). The Pine GLBs were `atlas-ez-conifer-family-13977-16m-v1e` (`58ead364…1c06e3d` / `126cc179…f8d884b`). Full hashes are in the report.

The test used the LETHRA-001 body, paused at roughly 11.74 m clearance with detailed lighting active. Find Life changed the query date; the harness recorded the observed game date `435084631200000074160300000` and derived the +3.5 s seek and return from that value.

## Results

- Oak-only instance submissions matched visible detailed-tree counts by LOD: `[33, 295]`. Capacities were `[192, 4096]`. Diagnostics reported one branching family and `instanceSlots: compact-per-family`.
- Returning to the observed date preserved all 16 compared sample IDs' species, recipe, physical height, and per-instance wind offset. A 1.8 s movement produced 24.8 m of travel; origin version stayed 14, so this run did **not** test a rebase.
- Oak plus Pine loaded atomically. Aggregate submissions matched visible counts `[95, 651]`, split between branching `[42, 275]` and spire `[53, 376]`; both used `[192, 4096]` slot capacities.
- The baseline frame reported 289 draws / 1,274,896 triangles. Oak-only reported 297 / 5,066,440, and Oak plus Pine 295 / 8,928,438. These are descriptive counts across different tree geometry and family populations; they do not establish a compaction cost change or performance gain.
- The 8 s Oak-only profile (2 s warmup) reported CPU `planetUpdateMs` p50/p95 33.2/41.7 ms and instrumented GPU pass sum 6.55/17.42 ms. In a separate 5 s CDP profile, leading self-sample counts were `PlanetForest.update` 757, `PlanetCanopy.currentPatch` 350, `PlanetCanopy.noteNear` 152, `PlanetRenderer.update` 122, and `PlanetRenderer.settled` 68. These profiles are local samples, not device-wide performance claims.
- Page/console errors were empty and WebGL `getError()` was 0. Runtime, runner, and asset hashes were unchanged during the successful capture.

The [legacy baseline](browser-run-2/legacy-close-baseline.png), [Oak-only](browser-run-2/oak-only-close.png), and [Oak plus Pine](browser-run-2/oak-plus-pine-close.png) canvases show the actual scene. Rounded legacy-looking canopy forms remain visible alongside detailed trees, so these captures do not demonstrate a finished visual transition or realism approval.

## Preserved harness failure

`browser-run/failure.json` and `failure-page.png` preserve the first attempt, which stopped at Oak verification because the page wait predicate referenced the Node-side `label` without passing it into the page. This was a harness error, not an Atlas error. The corrected runner in `integration.browser.mjs` passes the expected family count as a page-function argument; its successful run is separate under `browser-run-2/`.

## Reproduction

The local Vite server must already be running. Keep the source/GLB paths from the report available, then run:

```powershell
$env:ATLAS_HARDWARE='1'
$env:ATLAS_RESULTS='test-results/compact-tree-families/replay'
node test-results/compact-tree-families/integration.browser.mjs
```

The runner saves full diagnostics, scene captures, and the separate Oak CDP profile in the output directory.
