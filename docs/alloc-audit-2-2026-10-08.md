# Allocation audit phase 2 — Atlas

Baseline: `f2f2c62`, Node 24.7.0. Owned branch: `perf/alloc-2`.
Backlog task 33 in `C:/LLM/IWSDK/docs/atlas-backlog-2026-10-04.md`.

The niche evaluator, eco-class combined sample path and flora draw wrapper
now pass a GC-counted regression ceiling of **4 bytes per call**. This is a
small-noise ceiling for warmed V8 fixtures, not a universal claim about every
caller or browser. Both no-op controls must measure below **1 byte per call**;
an invalid control fails the check instead of being subtracted away.

| Measured path | Old B/call, three runs | New B/call, three runs | Unit |
| --- | --- | --- | --- |
| compiled niche plants + animals | 130.05–130.28 | 0.098–0.152 | local sample |
| ecoClassOf + life01Of + groundLookOf | 67.993 | 0.003 | sample |
| drawFloraCandidates, 256 candidates | 40.88–40.90 | 0.878–0.895 | frame |

Raw results, event counts, heap growth, no-op controls and identity ledgers:
`alloc-audit-2-2026-10-08-evidence.json`. Values may vary slightly between runs.
The previous audit's eco-class 83 B/sample used an OSR-compiled loop. The
normal per-sample caller fixture measures 68 B/sample before the change.

## Changes and output identity

- The existing `c4779b2` niche fix expands `occupiedSuitability` arithmetic
  directly inside the compiled evaluator. No species, niches, thresholds,
  rounding, producer eligibility or unreachable behavior changes.
- The recovered eco-class edit reduces helper call boundaries: constant
  thresholds, inlined life ramps, and a loop over eight typed ramp tables.
  The old multiply/divide order and constants are preserved. Exported helper
  functions and calibration/version pins remain unchanged.
- Flora counts use a result object allocated with each candidate buffer.
  Numeric counts, owners, matrices and fade values remain identical. The
  returned object is borrowed until the next draw with the same buffer;
  callers retaining counts must copy the numeric fields. Different buffers
  have independent results. The production renderer already inlines the
  wrapper; its rendering loop is unchanged.

The identity scripts compare `Object.is` values against source loaded from
`git show f2f2c62:src/...` without changing a checkout. Eco-class exercises
1.5 million randomized samples, all classes, exact calibration thresholds,
neighboring representable values, NaN/infinities, negative zero, invalid class
indices, and both Float32 and double outputs: **18,187,500 comparisons, zero
differences**. Niche covers 282 living golden-corpus worlds, 564 dated species
sets, range boundaries and unreachable locals: **39,849,128 comparisons,
zero differences**. Flora compares 2,000 frames, including empty buffers,
LOD owner state, count/budget limits, matrices and fade attributes:
**3,773,792 comparisons, zero differences**.

## Measurement and negative controls

`v8.GCProfiler` records bytes freed during the measured loop. The allocation
estimate adds those bytes to nonnegative net heap growth, then divides by
calls. The profiler's statistics and heap-size fields are validated. Warmup,
fixture construction and one throwaway profiler measurement happen before
measurement. Controls run before and after each real measurement. Each
revision/path/round uses a fresh child process and the revision order alternates.

The eco fixture invokes a per-sample body from a megamorphic driver, allowing
normal optimization without inlining that body into an OSR loop. The driver
passes a small integer index; this call boundary introduces no numeric boxes.
The same driver and fixture measure the old and new eco implementations.
Niche also records the stock benchmark's climate-plus-evaluator and
climate-only loops; their array literals allocate independently of the niche
fix and are diagnostic, not the niche regression criterion.

Every baseline invocation exits **1** because its real allocation exceeds
4 B/call while both controls pass. Every optimized invocation exits **0**.
Thus the check demonstrably rejects the old code even when its final heap
growth is small. The baseline eco fixture grew only about 1.78 MB over two
million calls (under the former 4 MiB ceiling) while GCs freed about 134 MB. The replaced eco test measured only final heap growth and
could miss all garbage collected mid-loop. Flora's former test title also
claimed zero net allocation without actually measuring any allocation.

Reproduce all three rounds and the identity ledgers from the repository root:

```powershell
node tests/helpers/test-slot.mjs -- node tests/helpers/alloc-audit/measure.mjs docs/alloc-audit-2-2026-10-08-evidence.json
```

The existing eco-class, habitat-suitability and flora-culling tests each invoke
an isolated GC-counted child check, including under ordinary Node runs without
`--expose-gc`. No new wall-clock budget is introduced.

## Validation and remaining scope

- HARD: direct tests, **28 passed**; TypeScript, **zero errors**.
- HARD: affected graph, **43 files / 364 tests: 362 passed, 0 failed,
  2 existing TODOs**. The TODOs are the SITE_A 60 km eco-class ring and
  FAUNA-NEAR-DROP. Its same three drops remain at frames 150/155/156 and
  distances 89.55842186604993/91.1144033388849/86.55790360146251 m.
- HARD: life guard (`--base main --run`), **2 passed**, including fixed
  pose/date reference identity and hidden-life output.
- CONTRACT: three independent GC rounds per revision/path; all nine old
  invocations fail their allocation ceiling with valid controls, all nine
  optimized invocations pass.

Browser/golden and headset gates belong to the coordinator; they have not
been run on this branch. The full affected graph was run once; the later
season/terrain edits are comments only and do not warrant a broader rerun.

Season and terrain comments now distinguish result reuse from transient
allocation: seasonAt still uses exact-date BigInt arithmetic and bodyPosition
temporaries (~1.1 KB/call in phase 1); terrainSampler constructs its result
directly but upstream helpers also allocate (~3 KB/call in phase 1). Their
executable code is unchanged. The existing season test remains a retained-heap
guard, not a zero-allocation assertion.

The vendored creature-kit coat evaluator, fauna handoff, massif envelope and
remaining phase-1 audit findings remain separate task-33 follow-up.
