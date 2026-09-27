# Atlas desktop rendering validation — 2026-09-28

## Scope and environment

The desktop browser runs use seed `LETHRA-001`, body
`G001/C2128,0,1/0/planet/1` (Maithea), catalogue-reference date
`435084631200000032044300000` with `CURRENT_VERSIONS` in the URL, and a
1440×1000 viewport. The fixture follows **Find living habitat**, descends with
Q until terrain clearance is under 100 m, pauses exploration, waits for forest,
terrain, and fauna work to drain, captures the same pose at cloud sample
requests 0, 2 and 4, then checks a turn in place and records an eight-second
render profile. The 6b87e13 run also resizes to 2560×1440, requests 4 samples,
records allocation diagnostics, restores 0, and captures the restored state.

Hardware rendering was explicitly enabled with `ATLAS_HARDWARE=1`:

- Windows, Chromium through Playwright 1.61.1
- NVIDIA GeForce RTX 5090, ANGLE Direct3D 11
- Vite served each detached checkout from its own directory
- `node_modules` junction targeted `C:\LLM\IWSDK\universe-atlas\node_modules`

The browser script is [desktop-rendering-acceptance.browser.mjs](../tests/desktop-rendering-acceptance.browser.mjs).

## Results

| Source commit | Browser result | Near-ground evidence | Warm flora recipe builds | CPU `planetUpdateMs` p50 / p95 |
| --- | --- | --- | ---: | ---: |
| `4c2369d` | Pass after pinning the date as an absolute time | 99.53 m clearance; 1,897 forest instances; 1,630 flora; 128 fauna drawn | Not exposed by this revision | 15.6 / 18.6 ms |
| `921de57` | Pass; AA left at its 0-sample default | 99.53 m clearance; 2,023 forest instances; 1,627 flora; 128 fauna drawn | 0 | 9.5 / 12.5 ms |
| `6b87e13` | Pass; cloud AA, resize, hook audit, and replay checks | 99.99 m clearance; 2,064 forest instances; 1,611 flora; 128 fauna drawn | 0 | 8.8 / 12.1 ms |

The machine-reported renderer was `ANGLE (NVIDIA, NVIDIA GeForce RTX 5090
(0x00002B85) Direct3D11 vs_5_0 ps_5_0, D3D11)` on all runs. Browser page and
console error arrays were empty. On `6b87e13`, local aerial diagnostics found
19 meshes, 19 attached hooks, and no failures. The paused stationary frame
reported zero `floraRecipeBuilds`; forest matrices and colors had zero writes
on the warm stationary check. Turning in place changed heading while keeping
the observer position fixed.

The profile medians suggest lower CPU update cost after the recipe cache
change, but these are approximate comparisons across separate browser runs.
The run order, frame scheduling, and exact sampled date differed slightly;
these figures are not a controlled performance benchmark. The 6b87e13
stationary profile reported 7.7 ms for `terrainDiagnostics.updateMs`, 2.6 ms
for `lifeMs`, and 0.4 ms for `drawFloraMs`.

## Cloud AA diagnostics

At 1440×1000, all three requested settings were effective and remained at full
scene resolution:

| Request | Effective samples | Estimated allocated bytes | Scene target |
| ---: | ---: | ---: | --- |
| 0 | 0 | 29,813,468 | 1440×1000 |
| 2 | 2 | 64,373,468 | 1440×1000 |
| 4 | 4 | 98,933,468 | 1440×1000 |

The driver reported supported counts `[8, 4, 2, 1]`. After resizing to
2560×1440, a 4-sample request resolved to 2 samples under the 160 MiB target
budget. Its estimate was 163,215,068 bytes (under the 167,772,160-byte budget),
with `sceneResolutionScale: 1` and a 2560×1440 target. Restoring request 0
returned `effectiveSceneSamples` to 0 at the same full-size target.

Screenshots are captured at one paused date and pose for all three sample
settings. The sky and cloud deck are not visually present in this near-ground
composition, so these images do not establish a visible cloud-quality
difference. The diagnostic confirms allocation and fallback behavior only.

## Flora, cloud, and aerial source tests

On `6b87e13`, the following targeted Node tests passed: `local-aerial-perspective`,
`volumetric-clouds`, `flora-field`, `flora-culling`, and `flora-recipe` — 33
tests total, 0 failures. This includes the shared aerial-formula equivalence,
material hook composition, sample budget fallback, and retained recipe replay
tests.

The existing `fauna-closeup.browser.mjs` replay acceptance also passed on
`6b87e13`: it selected one dated individual, reloaded its close-up pose/date,
found the same animal grounded on replay, drew 128 animals in each paused
sample, and preserved all IDs and positions between those samples. Its browser
error array was empty.

## Visual inspection and artifacts

The near-ground screenshots show the forest canopy, terrain, understory plants,
and fauna in the same scene. The image remains strongly faceted and low-poly;
the animals are hard to distinguish at roughly 100 m clearance, so the
separate close-up remains necessary to judge their form. Passing shader and
runtime checks do not by themselves establish naturalistic appearance.

Reports were copied from the detached checkouts into this repository:

- [Stage C baseline `4c2369d`](../test-results/desktop-rendering-stage-c-absolute-date/report.json)
- [CPU cache revision `921de57`](../test-results/desktop-rendering-921de57/report.json)
- [Final reviewed revision `6b87e13`](../test-results/desktop-rendering-6b87e13/report.json)
- [Fauna replay `6b87e13`](../test-results/fauna-closeup-6b87e13/report.json)
- [Near-ground view](../test-results/desktop-rendering-6b87e13/near-ground-warmed.png)
- [Fauna close-up](../test-results/fauna-closeup-6b87e13/01-fauna-closeup.png)

The integrated rendering branch also passes its TypeScript/Vite build and
71 targeted source checks, including three tree-contract cases and two flora
cache ownership source guards. The latter inspect ownership/invalidation code;
they are not a browser test of every habitat transition.

The first exploratory run used the default date and did not find a habitat; the
date was then pinned with the current time-version bundle. A run using that
date without `wv` treated it as a legacy offset and moved past the world’s
engulfment date. The passing runs use `atlas-time-2` and the absolute dated
fixture.
