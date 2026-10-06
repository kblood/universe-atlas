No BLOCKER or MAJOR finding for the **staged, unwired element**. The proposed wiring still needs its own integration acceptance.

Read-only verification reproduced **17 passed, 1 skipped, 1.468 s**. No files were changed.

1. **MINOR — integration evidence evaluates a different slope field.**  
   [integration-m3.mjs:22](C:/LLM/IWSDK/universe-atlas-wt/m5-rock/test-results/mountains/m5/integration-m3.mjs:22) and [render-m3.mjs:11](C:/LLM/IWSDK/universe-atlas-wt/m5-rock/test-results/mountains/m5/render-m3.mjs:11) vary U at the offsets; the patch holds centre U fixed. On an envelope flank, this changes the inferred slope, weight and gully orientation, potentially changing drainage results. The report explicitly discloses this, and the original brief permits it, so it does not block staging. These results cannot establish that the wired field preserves drainage.

2. **MINOR — the reported bench derivative bound needs a constant-depth qualification.**  
   [report.md:32](C:/LLM/IWSDK/universe-atlas-wt/m5-rock/test-results/mountains/m5/report.md:32) states a bench-only derivative ≥0.613036. With the height cap active, that particular bound is false: at `(x,y,seed)=(0,0,0)`, `h=100`, and fixed gradient `(1,0)`, I measured derivative **0.296429**. The subsequent cap-inclusive inequality correctly handles this and still establishes positive derivative. This is a wording defect, not a monotonicity failure.

3. **MINOR — shared-vertex identity provides limited independent coverage.**  
   [mountain-rock-detail.test.mjs:87](C:/LLM/IWSDK/universe-atlas-wt/m5-rock/tests/mountain-rock-detail.test.mjs:87) evaluates identical tuples at coincident vertices. An arbitrary deterministic discontinuous function can pass; the speckle variant actually reports **zero shared-vertex mismatches**. The separate straddle test rejects that variant, so HARD 7 as a whole has teeth. The edge helper alone does not validate assembled tile seams or interpolation.

4. **MINOR — R5 has no demonstrated failing control.**  
   [mountain-rock-detail.test.mjs:141](C:/LLM/IWSDK/universe-atlas-wt/m5-rock/tests/mountain-rock-detail.test.mjs:141): forced weight and reversed benches both remain within R5 thresholds. A drainage regression resembling those controls can therefore pass R5. This is explicitly accepted by round-4 decision D4; R6 supplies a failing drainage control: **4.923153 new pits/km²**, versus the limit of 1. Thus “every required control fails” is accurate, but “every ROW has a failing control” is not.

5. **MINOR — benchmark exit status does not enforce its budget.**  
   [cost-bench.mjs:18](C:/LLM/IWSDK/universe-atlas-wt/m5-rock/test-results/mountains/m5/cost-bench.mjs:18) records `addonBudgetPass` but only throws for extra builds. A future 250 ns result could exit 0. Consumers must inspect the result field. Your official **149.5 ns** measurement passes with **64.5 ns headroom**.

6. **MINOR — stale patch status.**  
   [m5-wiring.patch:3](C:/LLM/IWSDK/universe-atlas-wt/m5-rock/test-results/mountains/m5/m5-wiring.patch:3) still says “T6 remains BLOCKED on cost.” That contradicts the supplied official measurement. The report’s older “not run” statements should likewise be understood as the implementer’s historical record.

The remaining checks support staging:

- **Contract and determinism:** exclusions return literal `+0`; the final zero normalization removes `-0`. Nonnegative weight/depth/shape and their caps establish the sign and magnitude bounds. The whole-module arithmetic audit covers the actual source; I found no forbidden Math operation, exponentiation, Number conversion or imported arithmetic.
- **Large and negative coordinates:** floor-based cells and integer hashing behave correctly. A CPU probe comparing the 3×3 search against a 9×9 variant at **20,000 samples near ±20 million metres** found **zero bit mismatches**. A `10⁻⁷ m` coordinate displacement produced at most approximately `1.1×10⁻⁹ m` output change.
- **Continuity:** for fixed integer seed and finite terrain-domain inputs, bench corners/wraps, kernel support boundaries, maxima, weight thresholds and depth minima preserve continuity. Corners need not preserve derivatives. The support radius **210.297 m** is safely below the nearest omitted-centre bound **337.5 m**.
- **HARD 7:** `L_MAX=11.343070` is a conservative upper bound for this analytic fixture. It includes orientation, weight, slope-depth, height-cap and both bench slopes. It is not a universal bound for arbitrary input surfaces.
- **Drainage:** HARD 6 computes its **0.400821**, cap-inclusive **0.900821**, inequalities from frozen constants. The rising tread is the dangerous derivative; the falling riser increases the composed height derivative. The complete module is not globally height-monotone when slope and weight vary, and the report correctly acknowledges that.
- **Test discipline:** `measurePool(GATE)` occurs once in the registered test. HARD checks also intentionally use gate seeds; “once” does not mean each seed appears only once. No gate-driven parameter selection or M1–M4 implementation imports were visible. Runtime has **0.532 s headroom**, sufficient locally but not a guarantee under contention.
- **Wiring:** centre U, strip seed and coordinates are held consistently; rock requires carving and positive U; `rock=false` preserves arithmetic order. Strict state comparison distinguishes `'rock'` from `true` in the parent sampler/cache paths. The cap preserves nonnegative `U+C+v`; rock enters the floor calculation before the detail window, preserving the coastline and floor/window reasoning. The nine supplied patch-test failures remain future wiring acceptance work.

**Gully design:** [mountain-rock-detail.ts:86](C:/LLM/IWSDK/universe-atlas-wt/m5-rock/src/mountain-rock-detail.ts:86) performs nine kernel searches for at most **0.825 m** of incision. Its measured benefit looks weak. An in-memory, tuning-only ablation setting `gully=0`, with all constants unchanged, gave:

| Metric | Current | Gully removed |
|---|---:|---:|
| R1e ratio | 3.699760 | 3.699240 |
| Fine beta | 2.481541 | 2.481541 |
| New fine pits | 7 | 4 |
| Unofficial rock-only cost | 84.1 ns | 35.5 ns |

That favors a separately evaluated simplification unless visual evidence demonstrates a worthwhile benefit. It does not justify changing this frozen candidate after gate evaluation.

**MERGE-STAGED-OK — BLOCKER/MAJOR items: none.**