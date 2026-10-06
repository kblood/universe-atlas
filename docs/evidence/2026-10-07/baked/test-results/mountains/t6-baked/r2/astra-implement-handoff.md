Cold field construction is below the unofficial target; C1 remains unresolved. Route A is not ready to declare accepted. No commit; HEAD remains 6079ea9.

Retained changes:
- `src/mountain-layout.ts`: lazy independent blocks, built flags, integer-only `materialiseBlock` and `materialiseAll`; retain typed metadata and count persistent private buffers in bytes. Node arithmetic is unchanged; shared corners are recomputed independently.
- `src/terrain.ts`: one built-flag load/branch after the active-cell mask, with materialisation on first touch. Inactive coarse cells gain no instruction. The truth core and terrainSampler are restored verbatim.
- `tests/mountain-coarse-field.test.mjs`: zero-initialisation, forward/reverse array identity, idempotence, and independent projection checks for a read corner per block/candidate. Edge tests materialise before reading. The core-sync test and its hunk definition are unchanged.
- `tests/helpers/mountain-coarse-field.mjs`: materialise before direct distance reads.
- Local evidence: added `r2/field-bench.mjs`, `r2/truth-identity.mjs`, and measurement scripts/results under `r2/astra/`; adapted `fix-node-identity.mjs` to `r2/before-layout.txt` and full materialisation.

Unofficial final medians (sequential fresh processes, no slot). Field construction excludes layout/T1; materialise-all is additional time immediately afterward.

| World | Field n | Cold ms | Materialise-all ms | C1 n | Outside % | Weighted % |
|---|---:|---:|---:|---:|---:|---:|
| Maithea | 3 | 13.77 | 27.00 | 5 | +6.58 | +9.39 |
| Selawyn | 3 | 17.96 | 46.31 | 5 | +12.26 | +13.63 |
| Raiva | 3 | 4.97 | 7.62 | 5 | +7.53 | +9.55 |
| Lethuris | 3 | 20.26 | 50.54 | 5 | +3.34 | +5.07 |

Bytes / active cells: 832782 / 74826; 1642313 / 133763; 146969 / 13112; 1746187 / 145451 (same world order). Median construction-plus-full-materialisation totals: 40.41 / 64.27 / 12.60 / 70.32 ms. This defers projection cost; it does not eliminate it. Coarse tile/orbit first-touch and warm costs need official revalidation.

Kept idea A. No node-arithmetic optimisation B or value change D was retained. Three C1 candidates were dropped. Five interleaved fresh processes per arm/world used the captured before terrain with the same current layout; cells below are outside / weighted percent:

| Arm | Maithea | Raiva |
|---|---:|---:|
| Before truth | +1.73 / +4.53 | +5.69 / +7.78 |
| Plain-core voxel dispatch | +5.09 / +8.30 | +0.81 / +2.83 |
| Early voxel test + ridge helper | +9.44 / +12.40 | +11.30 / +13.32 |

Dispatch improved Raiva but worsened Maithea; early rejection did not help consistently. A final top-level helper containing both voxel rejection and ridge work had one Maithea pilot at +6.9 / +10.01 and was dropped. Initial one-run pilots, excluded from the five-run comparison: dispatch +6.5 / +9.72; early +7.5 / +10.51. Final unchanged-truth runs were a separate reporting batch, not a paired causal comparison.

Supplied slotted staged-before medians (n=5): weighted 13.21 / 11.70 / 5.68 / 7.47%, outside 10.1 / 10.3 / 3.6 / 5.7%. Unslotted results do not establish official acceptance. Final weighted ranges: 6.93..30.59 / -6.11..17.25 / 8.49..10.09 / 2.69..14.72%.

Checks:
- `npx tsc --noEmit`: exit 0, no diagnostics.
- `node --test tests/mountain-coarse-field.test.mjs tests/mountain-layout.test.mjs tests/mountain-layout-grid.test.mjs tests/mountain-envelope.test.mjs tests/terrain-mountains-assembly.test.mjs tests/lod-carving-reduction.test.mjs`: final exit 0, 82 passed, 0 failed/skipped. Initial exit 1, 81/82: the arithmetic source audit rejected a new `/**` comment as `**`; changed it to `/*`, without changing the audit, then reran the exact command. Logs: `astra/tests.log`, `astra/tests-final.log`.
- `node test-results/mountains/t6-baked/fix-identity.mjs r2/after.json`: exit 0; 173120 sampler outputs and eight tile digests.
- `node -e "const fs=require('fs');const p='test-results/mountains/t6-baked/r2/';const equal=fs.readFileSync(p+'before.json').equals(fs.readFileSync(p+'after.json'));console.log('r2/after.json == r2/before.json:',equal);if(!equal)process.exit(1)"`: exit 0; printed `r2/after.json == r2/before.json: true`.
- `node test-results/mountains/t6-baked/fix-node-identity.mjs`: exit 0; all 503165 read nodes Object.is-identical to the captured eager builder, 311209 unread nodes zero. Forward/reverse full array identity also passes in the suite.
- `node test-results/mountains/t6-baked/r2/truth-identity.mjs`: exit 0; 101792 samples, every field Object.is-identical to captured before-terrain, both floor modes, four worlds.
- `node test-results/mountains/t6-baked/r2/field-bench.mjs <world-index>`: 12 fresh processes, all exit 0. C1 staged: 53 processes including pilots/comparisons/final, all exit 0. Exact invocation retained in `astra/compare.mjs` and `astra/final-cost.mjs`; raw JSON/logs and `astra/summary.json` retained.
- `git diff --check`: exit 0.

TERRAIN_MOUNTAINS_WIRED=false, private constructionA0, separate truth literal, fresh direction copy, all versions and pins are unchanged. No caller direction enters layout from the coarse path. No official benchmark, coarse tile/orbit timing, trace profile, full suite, test-slot helper, .git write, download, network, browser, GPU, or commit. No value change D: changing envelope accuracy would not address outside-truth overhead and is unnecessary for lazy cold construction.
