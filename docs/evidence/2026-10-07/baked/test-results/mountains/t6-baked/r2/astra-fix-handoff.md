Bounded fix round complete on mountains/baked-coarse, HEAD 6079ea9; no commit. Kept LAZY: the optimized eager variant still exceeds the requested 40 ms threshold on Selawyn and Lethuris. This is the requested fallback, not a claim that the contract budget now passes.

Phase profiles, ms, cold / second build in the same fresh process. Layout and T1 excluded; before is r2/before-layout.txt (eager). After is the final lazy builder with all blocks materialised. Float32 column measures allocation; per-node conversions/stores are included in node time. Candidate time includes scalar/evaluator setup; other includes block metadata and final packaging. Instrumented profiles are single runs, unofficial.

| State/world | Active + dilation | Candidates | Float32 allocation | Nodes + stores | Other |
|---|---:|---:|---:|---:|---:|
| Before Maithea | 8.22 / 7.78 | 3.20 / 4.07 | 0.11 / 0.09 | 24.51 / 21.64 | 0.10 / 0.07 |
| Before Selawyn | 12.66 / 11.55 | 3.60 / 8.07 | 0.02 / 0.02 | 41.23 / 35.69 | 0.14 / 0.08 |
| Before Raiva | 4.41 / 4.02 | 0.52 / 0.48 | 0.03 / 0.03 | 7.61 / 3.61 | 0.06 / 0.02 |
| Before Lethuris | 11.48 / 11.29 | 6.66 / 9.79 | 0.02 / 0.12 | 42.01 / 39.39 | 0.12 / 0.08 |
| After Maithea | 5.48 / 2.61 | 4.34 / 1.49 | 0.11 / 0.10 | 17.13 / 13.82 | 0.95 / 0.18 |
| After Selawyn | 11.52 / 7.04 | 5.00 / 1.88 | 0.02 / 0.01 | 24.90 / 21.73 | 2.47 / 0.53 |
| After Raiva | 2.57 / 1.20 | 0.89 / 0.23 | 0.07 / 0.04 | 6.22 / 3.88 | 0.26 / 0.05 |
| After Lethuris | 7.65 / 7.34 | 6.46 / 2.40 | 0.02 / 0.01 | 26.47 / 24.08 | 2.31 / 2.23 |

Fresh-process medians, three runs/world/variant, sequential, unofficial, ms. Eager uses the saved optimized eager source with the restored integer-only bit helper. Lazy total is the median of each run's cold + materialise-all, not a sum of medians.

| World | Eager cold | Lazy cold | Materialise all | Lazy total | Retained typed-array bytes | Active cells |
|---|---:|---:|---:|---:|---:|---:|
| Maithea | 28.66 | 10.48 | 16.55 | 27.13 | 870,996 | 74,826 |
| Selawyn | 42.96 | 16.86 | 25.05 | 41.86 | 1,707,689 | 133,763 |
| Raiva | 9.61 | 3.20 | 6.24 | 9.64 | 153,233 | 13,112 |
| Lethuris | 42.71 | 17.55 | 26.49 | 44.05 | 1,816,963 | 145,451 |

Changes by file:

- `src/mountain-layout.ts`: collapse covered T1 2×2 groups before iteration; dilate rows with bit operations while retaining canonical face-edge mapping. Builder-only per-belt distance closures hoist belt constants and retain independent noise caches, inline node direction, preserve division and transverse operation order, and omit unused gradients. Typed-array materialiser inputs; copy shared read nodes from built left/below/right/above neighbours. Account for retained row masks in bytes. Candidate selection remains unchanged.
- `src/terrain.ts`, `tests/helpers/mountain-coarse-field.mjs`, `tests/mountain-coarse-field.test.mjs`: retained implement-round lazy branch, helper materialisation, and forward/reverse byte-identity/idempotence/reference-node structure checks; no new edits this fix round.
- `fix-node-identity.mjs`: optional materialise-all call supports both eager trials and final lazy field.
- `r2/fix-phase-profile.mjs`, `fix-eager-bench.mjs`, source snapshots and JSONL/log files: reproducible local profiling and evidence. `r2/field-bench.mjs` unchanged: existing API and one-JSON-line schema still apply.

Measured and dropped: the large inline projection loop had eager cold about 36/58/18/50 ms; splitting it into per-belt evaluators improved cold compilation. `Math.clz32` failed the arithmetic-source allowlist, so restored the existing integer-only helper. Offset's division and transverse's reciprocal multiplication were deliberately not conflated.

Checks:

- `node test-results/mountains/t6-baked/fix-identity.mjs r2/after.json`: exit 0; byte comparison with `r2/before.json`: exit 0, true (173,120 sampler outputs and eight tile digests).
- `node test-results/mountains/t6-baked/fix-node-identity.mjs`: exit 0; all 503,165 read nodes Object.is-identical; 311,209 unread nodes remain zero; metadata arrays identical.
- `node test-results/mountains/t6-baked/r2/truth-identity.mjs`: exit 0; 25,448 samples/world, 101,792 total, every field identical.
- `npx tsc --noEmit`: exit 0.
- `node --test tests/mountain-coarse-field.test.mjs tests/mountain-layout.test.mjs tests/mountain-layout-grid.test.mjs tests/mountain-envelope.test.mjs tests/terrain-mountains-assembly.test.mjs tests/lod-carving-reduction.test.mjs`: final exit 0, 82 passed, zero failed/skipped. Initial run exit 1 (81 passed; Math.clz32 audit failure), fixed without changing the audit.
- `git diff --check`: exit 0.
- Phase profiles and all sequential field/eager bench processes: exit 0.

No truth-path, terrainSampler, kernels, constructionA0, envelope, version, pin or wiring changes. No C1, official contract/orbit bench, .git writes, test-slot helper, npm test/test:full, network/downloads, browser, GPU or commit. The existing active-cell lazy branch remains in the coarse hot path, and node work still occurs during tile builds; official contract acceptance remains for the coordinator.
