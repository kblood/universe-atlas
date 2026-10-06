Implemented zero-contribution exits and active-corner-only field evaluation. **Identity preserved; G2 still fails on two worlds.**

- **G1 fractions:** active cell 13.67%; distance-margin candidate 8.70%; non-trivial composition 8.54% of 238,155 Maithea L5 samples.
- **Unofficial mean tile timing:** before 21.24 → after 20.57 ms; main 19.89 ms. Growth fell from +6.81% to **+3.42%**.
- **G2 profile:** projections fell 814,374 → 503,165. Node-phase time fell 44.73→28.41 / 70.34→47.46 / 10.05→8.50 / 76.29→51.00 ms.

| World | Fresh build ms | Bytes |
|---|---:|---:|
| Maithea | 38.90 | 822,144 |
| Selawyn | **66.14** | 1,624,130 |
| Raiva | 12.91 | 145,206 |
| Lethuris | **70.07** | 1,726,504 |

`fix-before.json == fix-after.json: true`: 173,120 sampler outputs and eight complete tile digests. All 503,165 read nodes also match bit-for-bit.

Checks:

- `npx tsc --noEmit` — exit 0.
- `node --test tests/mountain-coarse-field.test.mjs tests/mountain-layout.test.mjs tests/mountain-layout-grid.test.mjs tests/mountain-envelope.test.mjs tests/terrain-mountains-assembly.test.mjs` — exit 0, **57 passed**.
- Digest comparison — exit 0.
- `node test-results/mountains/t6-baked/field-report.mjs` — exit 0, four worlds.
- `git diff --check` — exit 0.

No pin/version/resolution changes this round; all G3 constraints retained. No `.git` writes, network, browser, GPU, full suite, slot helper, or official benches.

[Full evidence and exact commands](C:/LLM/IWSDK/universe-atlas-wt/baked/test-results/mountains/t6-baked/fix-handoff.md).