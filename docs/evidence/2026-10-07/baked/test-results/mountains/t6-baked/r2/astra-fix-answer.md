Kept **lazy**, as requested when eager misses 40 ms. Shared nodes now copy from built neighbours in all four same-face directions.

Three fresh-process medians, unofficial, milliseconds:

| World | Eager cold | Lazy cold | Materialise all |
|---|---:|---:|---:|
| Maithea | 28.66 | 10.48 | 16.55 |
| Selawyn | 42.96 | 16.86 | 25.05 |
| Raiva | 9.61 | 3.20 | 6.24 |
| Lethuris | 42.71 | 17.55 | 26.49 |

`mountain-layout.ts` now uses grouped active-cell extraction, row-wise dilation, and specialized per-belt distance evaluators with hoisted constants and local noise caches. Arithmetic order and stored values are preserved.

All final checks exited **0**:

- Sampler/tile digest byte-identical.
- **503,165** read nodes Object.is-identical.
- **101,792** truth samples identical.
- TypeScript passes.
- **82/82 tests pass**, including forward/reverse materialisation.
- `git diff --check` passes.

The initial test run rejected `Math.clz32`; restored the existing integer-only helper without changing the audit.

Full cold/second-build phase profiles, per-file changes, commands, exit codes, and evidence are saved in [astra-fix-handoff.md](C:/LLM/IWSDK/universe-atlas-wt/baked/test-results/mountains/t6-baked/r2/astra-fix-handoff.md).

No truth/kernel changes, C1, official benchmarks, prohibited tools, `.git` writes, or commit. The eager target remains unmet on two worlds; official contract acceptance remains unverified.