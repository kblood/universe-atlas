Implemented lazy field construction. **C1 remains unresolved; Route A is not acceptance-ready.** No commit.

Unofficial medians:

| World | Cold build, n=3 | Materialise all | C1 outside, n=5 | C1 weighted |
|---|---:|---:|---:|---:|
| Maithea | 13.77 ms | 27.00 ms | +6.58% | +9.39% |
| Selawyn | 17.96 ms | 46.31 ms | +12.26% | +13.63% |
| Raiva | 4.97 ms | 7.62 ms | +7.53% | +9.55% |
| Lethuris | 20.26 ms | 50.54 ms | +3.34% | +5.07% |

The field defers projection work until first block access. Only active coarse cells gain a built-flag check. Three truth-path candidates were measured and dropped; the original truth core is restored.

Validation: TypeScript passes; **82/82 tests pass**; snapshots are byte-identical; all **503,165 read nodes** and **101,792 truth samples** match the captured baseline. Forward/reverse materialisation arrays match. `git diff --check` passes.

Versions, pins, and `TERRAIN_MOUNTAINS_WIRED=false` remain unchanged. Official coarse/orbit/C1 revalidation remains with the coordinator.

Saved [the complete handoff](C:/LLM/IWSDK/universe-atlas-wt/baked/test-results/mountains/t6-baked/r2/astra-implement-handoff.md), including per-file changes, candidate measurements, exact commands, exit codes, and the corrected initial comment-audit failure.