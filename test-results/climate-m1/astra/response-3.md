OpenAI Codex v0.161.0
--------
workdir: C:\LLM\IWSDK\universe-atlas-wt\climate-m1
model: gpt-6-astra
provider: openai
approval: never
sandbox: read-only
reasoning effort: medium
reasoning summaries: none
session id: 01a11b2b-435a-73e3-8b3b-f001b5a3614d
--------
user
You are Astra, an independent read-only reviewer. Review ONLY the decision-5 change of package R5-ATLAS-CLIMATE-M1 on
branch climate/m1 in this worktree: `git diff 3ab2eab..HEAD -- src tests docs test-results/climate-m1/timing`
(commits 688129c, 0225e93, e1b2cb6, 0f1b70e). Everything before 3ab2eab was already approved; do not re-review it.
Authoritative record: docs/surface-climate-v2.md section 8 (climate-m1-decision-5, "Opus-decided on Kasper's
instruction, overrulable"). The ruling allowed: in src/surface-climate.ts, inside the surfaceClimate sampler closure
only, hand-inline degreeDaysAbove (both calls), pddKernelG, smooth and clamp01, keeping the exact order of operations
and constants; noise() untouched; exported helpers kept; no CLIMATE_CALIBRATION change, no version bump. And: replace
the heap-growth allocation check in tests/surface-climate.bench.mjs with the v8.GCProfiler bytes-per-call count over
the 15 timed passes plus a no-op control (pass: real <= 20 B/call, control < 1 B/call; control failure invalidates and
fails the bench), delete the wrong ">= 48 MB" comment and explain the scavenge blind spot.

Check, with file:line evidence:
1. Bit-identity by reading: compare the inlined code in src/surface-climate.ts against the helpers it replaces
   (`git show 3ab2eab:src/surface-climate.ts`: clamp01, smooth, kernelAt, pddKernelH, pddKernelG, degreeDaysAbove).
   Same operations in the same order, same associativity (e.g. C.YEAR_D*half*h), same branch conditions (< vs <=,
   1e-9 thresholds, v<=-1 / v>=1, the clamp indices), NaN behaviour, and lazy evaluation where it matters? Any
   expression that could round differently? Is removing the module-private clamp01/smooth consts safe (no other user)?
2. Was anything outside the sampler closure changed in src? Any calibration/version change?
3. The identity proof (test-results/climate-m1/timing/identity.mjs, identity.json): does it actually compare every
   ClimateSample field with Object.is between two different code trees (dirA = an export of 3ab2eab, dirB = the
   worktree)? Is the pinned set as the ruling specified (200k Fibonacci x alloc-diag heights on Maithea, Selawyn,
   Raiva, Lethuris, Earth; first 50 corpus bodies x 8k)? Could it be vacuous? pins.json / golden-compare.json too.
4. The bench (tests/surface-climate.bench.mjs): is the GC count correct (freed-by-GC + net growth over the timed
   passes), is the control a fair same-shape loop that cannot be optimised away differently, are the pass conditions
   and the exit code as ruled, and does the new comment explain the blind spot correctly? Does the counting wrapper
   distort the timing? bench-gate.log: fails on 3ab2eab, passes on the branch?
5. Gates 3-5 evidence (alloc-rounds.log, ab-rounds.log, gate5-*.log) against the numbers in docs section 8 and the
   commit messages: any number claimed but not shown, or misquoted?

Do not run tests or benchmarks (shared host). Output: a verdict line `VERDICT: APPROVE | APPROVE-WITH-FIXES | REJECT`,
then numbered MUST-FIX items (each with file:line and a concrete fix), then SHOULD items, then notes. Be concise.

codex
I’ll review only the decision-5 diff and its recorded evidence, without running tests or benchmarks.
exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -Command "git status --short; git diff --stat 3ab2eab..HEAD -- src tests docs test-results/climate-m1/timing; rg --files -g AGENTS.md -g '*identity*' -g '*pins*' -g '*golden-compare*' -g '*rounds*' -g '*gate5*' -g '*bench-gate*'" in C:\LLM\IWSDK\universe-atlas-wt\climate-m1
 succeeded in 654ms:
 docs/surface-climate-v2.md                         |   77 +-
 src/surface-climate.ts                             |   57 +-
 test-results/climate-m1/timing/ab-harness.mjs      |  105 ++
 test-results/climate-m1/timing/ab-rounds.log       |   18 +
 test-results/climate-m1/timing/ab-rounds.sh        |    5 +
 test-results/climate-m1/timing/alloc-diag.mjs      |   29 +
 test-results/climate-m1/timing/alloc-rounds.log    |   30 +
 test-results/climate-m1/timing/alloc-rounds.sh     |    6 +
 test-results/climate-m1/timing/bench-gate.log      |  246 +++
 test-results/climate-m1/timing/bench-gate.sh       |    8 +
 test-results/climate-m1/timing/digest50k.mjs       |   32 +
 test-results/climate-m1/timing/gate5-affected.log  | 1663 ++++++++++++++++++++
 test-results/climate-m1/timing/gate5-targeted.log  |   68 +
 test-results/climate-m1/timing/golden-compare.json |    1 +
 .../climate-m1/timing/golden-node-after-inline.err |    0
 .../timing/golden-node-after-inline.json           |   42 +
 test-results/climate-m1/timing/identity.json       |  718 +++++++++
 test-results/climate-m1/timing/identity.mjs        |   76 +
 test-results/climate-m1/timing/pins.json           |   36 +
 test-results/climate-m1/timing/stop-run.log        |   23 +
 tests/surface-climate.bench.mjs                    |   49 +-
 21 files changed, 3257 insertions(+), 32 deletions(-)
tests\eco-identity-site.test.mjs
tests\helpers\mountain-assembly-identity.mjs
tests\terrain-elevation-identity.test.mjs
tests\tools\capture-composer-skin4-pins.mjs

exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -Command "git diff 3ab2eab..HEAD -- src tests docs; git show -s --format=fuller 688129c 0225e93 e1b2cb6 0f1b70e; Get-ChildItem -Path C:\\LLM\\AGENTS.md,C:\\LLM\\IWSDK\\AGENTS.md,C:\\LLM\\IWSDK\\universe-atlas-wt\\AGENTS.md,C:\\LLM\\IWSDK\\universe-atlas-wt\\climate-m1\\AGENTS.md -ErrorAction SilentlyContinue | ForEach-Object { "'$_.FullName; Get-Content $_ }' in C:\LLM\IWSDK\universe-atlas-wt\climate-m1
 exited 1 in 600ms:
diff --git a/docs/surface-climate-v2.md b/docs/surface-climate-v2.md
index dd7cfb6..165f0d4 100644
--- a/docs/surface-climate-v2.md
+++ b/docs/surface-climate-v2.md
@@ -22,6 +22,12 @@ and 6b); the package continued from step 8 and **STOPPED at step 8** (section 6c
 (ruling 1) and registered the Earth test (ruling 2, done); ruling 1 then **STOPPED** on its own gate (section 6d). climate-m1-decision-4 shipped the 360-frame change with
 the deviation recorded, and logged the old-site in-exit drop as FAUNA-NEAR-DROP with a `todo` reproducer (section 6d).
 
+The pre-merge timing then **STOPPED** on allocation: 83 B per sample, against 16-17 B on main. The stock bench's
+heap-growth check could not see this. climate-m1-decision-5 restated the gate as ≤ 20 B per sample and no worse than
+main, and had the sampler helpers inlined by hand. Outputs are `Object.is`-identical; the branch now allocates
+0.1-0.2 B per sample and the A/B ratio is 0.76. The bench's allocation check was also replaced with a GC-counted one,
+which fails on 3ab2eab and passes now (section 8).
+
 ## 1. Model (all per sample, no per-sample transcendental)
 
 | Step | Change | Formula |
@@ -97,7 +103,7 @@ d134a87.
 6. **Other merge gates.** Blocking: `scripts/climate-calibration-report.mjs` is fixed in this package (granted); the
    `version-compat:335` pin and the `TERRAIN_VERSION` bump are the coordinator's; the real `npm run test:affected` and
    then `test:full`, including the golden sections climate, biomes, census, placeQuery and terrain (golden re-pins are
-   the coordinator's); `surface-climate.bench` in a quiet window (<= 150 ns per sample, zero allocation, A/B ratio,
+   the coordinator's); `surface-climate.bench` in a quiet window (<= 150 ns per sample, zero allocation [restated by decision-5 as <= 20 B per sample counted from GC events, section 8], A/B ratio,
    cold build) blocks the merge because this is on the hot path of every land sample. Not blocking:
    `planet-geophysics:162` (pre-existing, unrelated), the weaker obliquity assertion (accepted), `eco-identity-site:54`
    (stays `todo`).
@@ -582,11 +588,68 @@ census, placeQuery and terrain. TERRAIN_VERSION bump: coordinator.
 on the live PDD snow field by bisection (onset snowFraction > 0, heavy > 0.6), not on the removed `T_SNOW_K` /
 `SNOW_RAMP_K` isotherms.
 
-## 8. Deferred (no timing measured in this package)
+## 8. Timing and allocation (climate-m1-decision-5)
+
+**The STOP.** The coordinator ran the pre-merge timing on 3ab2eab against main c6526d0
+(`test-results/climate-m1/timing/stop-run.log`; the harnesses `alloc-diag.mjs` and `ab-harness.mjs` are next to it):
+
+- Speed passed. The stock bench best/median was 56.6/57.5 ns per sample on the branch and 92.2/94.6 ns on main.
+- Allocation failed. Counted from GC events (`v8.GCProfiler`, 3M warm calls), the branch allocated **83.1-83.2 B per
+  sample** (118 scavenges) and main allocated **16.0-17.3 B** (22-24 scavenges).
+- The stock bench still reported `zeroHeapGrowth: true` for both. Its heap-growth check is blind: a young-generation
+  scavenge frees short-lived garbage while the loop runs, so the heap grows by less than 1 MB either way.
+- With a larger TurboFan inlining budget (diagnostic only), the branch dropped to 0.78 B per sample. That points at
+  doubles being boxed in helpers V8 did not inline.
+- Cold build was 0.723 ms against main's 0.683 ms per body.
+
+**Decision-5 (Opus-decided on Kasper's instruction, overrulable).**
+
+- **The gate is restated.** It is now "at most 20 B per sample, counted from GC events, and no worse than main"; main
+  allocates 16-17 B on c6526d0. Strict zero stays a written goal, not a gate.
+- **The code fix is limited to the sampler closure.** `degreeDaysAbove` (both calls), `pddKernelG`, `smooth` and
+  `clamp01` are inlined by hand. No change to `CLIMATE_CALIBRATION`, no version bump, `noise()` left as it is.
+- **The bench's allocation check is replaced** with the GC-counted method plus a no-op control.
 
-- Per-sample cost <= 150 ns and zero allocation per sample
-- Interleaved A/B cost ratios against surface-climate-1.1
-- Cold build of `climateForcingFor` (now adds two 513-row `detExp` tables per forcing)
+**What changed (688129c).** In `surfaceClimate`'s closure, the bodies of `degreeDaysAbove` (with its `pddKernelH` /
+`kernelAt` body), `pddKernelG` (with `kernelAt`), `smooth` and `clamp01` are written out in place:
 
-`surface-climate.bench.mjs` was not run. Decision 6 makes this a blocking merge gate (hot path of every land sample);
-the coordinator schedules it in a quiet window.
+- the same operations in the same order, with the same constants (`annual-273.15-0`, `(v+1)*(KERNEL_STEPS/2)`, ...);
+- the exported `degreeDaysAbove`, `pddKernelH` and `pddKernelG` stay for their other users;
+- the module-private `clamp01` and `smooth` consts had no other user and are removed.
+
+**Gates.** All ran on the shared test slot. Evidence is in `test-results/climate-m1/timing/`.
+
+| Gate | Result |
+|---|---|
+| 1. Identity (`identity.mjs` → `identity.json`) | **0 differences.** Pinned sets: 200k Fibonacci directions × the alloc-diag heights on Maithea, Selawyn, Raiva, Lethuris and the Earth reference, plus the first 50 climate-agreement corpus bodies × 8k directions at two height patterns. That is 1.8M samples × 18 fields = 32.4M `Object.is` comparisons against 3ab2eab. Adding extra branch-coverage sets (Earth at obliquity 0 and 70 deg, water 0, 230 K, 330 K, and 50 non-temperate planets) gives 2.4M samples / 43.2M comparisons, still 0 differences. Every inlined branch was reached: half = 0 on 70,825 samples, snow interior on 22,150, heat-ramp interior on 194,609. |
+| 2. Pins (`pins.json`, `golden-compare.json`) | The `CLIMATE_CALIBRATION` sha (f56bf8ab...) and the 10-body × 5000 determinism digest are identical on both trees. The golden `node-run.mjs` output is byte-identical to step 8 in every section, including climate, biomes, census, placeQuery and terrain. |
+| 3. Allocation (`alloc-rounds.log`, 3 alternating rounds, 3M calls) | Branch **0.144 / 0.113 / 0.132 B per call, 0 GCs**. 3ab2eab measured 83.17 / 83.17 / 83.17 and main c6526d0 15.99 / 16.00 / 16.00. The no-op control measured 0.219-0.237 B per call. |
+| 4. Speed (`ab-rounds.log`, 3 processes × 25 interleaved passes, fixed 3ab2eab against fixed 688129c) | Median 59.3 / 59.2 / 58.0 → 45.0 / 44.5 / 44.7 ns per sample. Ratios 0.759 / 0.752 / 0.770, median **0.759** (gate ≤ 1.05). The harness's own allocation check reads 83.22 → 0.16-0.17 B per call, and its negative control (+1 object per call) reads 48.3 B. Cold build per body: 0.709-0.714 → 0.634-0.649 ms. The first cold-JIT call takes 2.63-2.72 ms (gate ≤ 5 ms). |
+| 5. Tests (`gate5-targeted.log`, `gate5-affected.log`) | surface-climate + climate-earth-reference + terrain-climate-colour: 34 tests, 31 pass, 0 fail, 2 skip, 1 todo. `test:affected` (95 files): 771 tests, 755 pass, 1 fail (`version-compat:335`, the expected pin), 11 skip, 4 todo. These are the step-8 counts. |
+
+**The fixed bench check.** `tests/surface-climate.bench.mjs` now counts bytes from GC events over its 15 timed passes,
+plus a no-op control sampler in the same loop shape. Each loop is its own function literal, so each call site stays
+monomorphic.
+
+- It passes when `surfaceClimate` allocates ≤ 20 B per call and the control < 1 B per call. A failing control makes
+  the measurement invalid and fails the bench.
+- The bench exits 1 when any pass entry is false.
+- The old ">= 48 MB" comment is replaced by the scavenge blind-spot explanation.
+- Gate (`bench-gate.log`, 2 alternating rounds): on 3ab2eab it reads **83.04 / 83.00 B per call, `allocation: false`,
+  exit 1**; on the branch it reads **0.221 / 0.139 B per call, exit 0**. Controls read 0.30-0.35 B per call.
+- Reference: main c6526d0 reads 19.82 / 19.80 B per call (14 GCs) in the bench loop. That passes, but only just. The
+  bench's loop runs after the table build, and there main measures about 3.8 B more than in `alloc-diag` (16.0).
+
+**Net.** The outputs are bit-identical to 3ab2eab. The branch now allocates about 0.1-0.2 B per sample, against
+83 before and 16-20 on main. It is about 24 % faster than 3ab2eab (gate 4). In the fixed bench, its best pass is 0.046 µs per sample against 0.099 µs on main.
+
+**For the coordinator (decision-5 section 4).**
+
+- New backlog item **PERF-ALLOC-AUDIT** (next round, medium):
+  - audit every bench that claims "zero allocation" through a heap-growth check: the terrain sampler, the niche
+    evaluator, and any other bench with that pattern;
+  - re-measure each with the GC-counted method and a no-op control, and record the real baseline;
+  - until then, treat the earlier zero-allocation claims as unverified.
+  - Main's own climate sampler sits at 16-20 B per call, probably from `noise()` (shared legacy code, untouched here).
+- Cookbook lesson for the IWSDK `docs/webxr` cookbook: a heap-growth check misses allocations that GC frees mid-loop.
+  Count bytes from GC events against a no-op control.
diff --git a/src/surface-climate.ts b/src/surface-climate.ts
index be40a2d..c18d0a1 100644
--- a/src/surface-climate.ts
+++ b/src/surface-climate.ts
@@ -138,10 +138,6 @@ export function createClimateSample():ClimateSample {
     forestSuitability01:0,climateCode:0};
 }
 
-const clamp01=(v:number)=>v<0?0:v>1?1:v;
-/** Arithmetic smoothstep (no platform transcendental). */
-const smooth=(x:number,lo:number,hi:number)=>{const t=clamp01((x-lo)/(hi-lo));return t*t*(3-2*t);};
-
 /**
  * surface-climate-2 positive-degree-day kernel. The year is the sinusoid
  * T(t) = mu + A cos(2 pi t) (mu = annual mean, A = seasonal half-range). With
@@ -440,31 +436,64 @@ export function surfaceClimate(forcing:ClimateForcing):(d:V3|readonly [number,nu
     const belt=subsidence[iz]!+(subsidence[iz+1]!-subsidence[iz]!)*tz;
     // surface-climate-2 step 1: snow from positive degree-days (melt), not the
     // annual mean. snowFraction > 0.6 (the 'Alpine / polar snow' label) is PDD < 190.
-    const pdd0=degreeDaysAbove(annual,half,0);
+    //
+    // Hand-inlined below (climate-m1 decision-5): degreeDaysAbove (both calls, with
+    // its pddKernelH / kernelAt body), pddKernelG (with kernelAt), smooth and
+    // clamp01. Calls V8 did not inline returned boxed doubles, ~83 B allocated per
+    // sample. Same operations, same order, same constants as the exported helpers
+    // above, which stay for their other users; results are Object.is-identical
+    // (test-results/climate-m1/timing/identity.json).
+    // degreeDaysAbove(annual,half,0) and degreeDaysAbove(annual,half,30):
+    const ex0=annual-273.15-0,ex30=annual-273.15-30;
+    let pdd0:number,pdd30:number;
+    if(half<1e-9){pdd0=ex0>0?ex0*C.YEAR_D:0;pdd30=ex30>0?ex30*C.YEAR_D:0;}
+    else{
+      const v0=ex0/half,v30=ex30/half;
+      let h0:number,h30:number;
+      if(v0<=-1)h0=0;else if(v0>=1)h0=v0;
+      else{const kf=(v0+1)*(KERNEL_STEPS/2);let k=Math.floor(kf);if(k<0)k=0;else if(k>KERNEL_STEPS-1)k=KERNEL_STEPS-1;h0=H_TAB[k]!+(H_TAB[k+1]!-H_TAB[k]!)*(kf-k);}
+      if(v30<=-1)h30=0;else if(v30>=1)h30=v30;
+      else{const kf=(v30+1)*(KERNEL_STEPS/2);let k=Math.floor(kf);if(k<0)k=0;else if(k>KERNEL_STEPS-1)k=KERNEL_STEPS-1;h30=H_TAB[k]!+(H_TAB[k+1]!-H_TAB[k]!)*(kf-k);}
+      pdd0=C.YEAR_D*half*h0;pdd30=C.YEAR_D*half*h30;
+    }
     // Step 5: effective moisture from a precipitation / PET aridity index.
     // PET from Holdridge biotemperature (mean of the temperature clipped to 0..30 C):
     // biotemp = (PDD above 0 C - PDD above 30 C)/year.
-    const biotemp=(pdd0-degreeDaysAbove(annual,half,30))/C.YEAR_D;
+    const biotemp=(pdd0-pdd30)/C.YEAR_D;
     let pet=C.PET_MM_PER_BIOTEMP_C*biotemp;if(pet<C.PET_MIN_MM)pet=C.PET_MIN_MM;
     let pTemp=1+C.P_TEMP_PER_K*(annual-C.P_TEMP_REF_K);if(pTemp<C.P_TEMP_MIN)pTemp=C.P_TEMP_MIN;
     const precip=pWater*pTemp*zf*(C.P_NOISE_BASE+C.P_NOISE_GAIN*moisture);
     const ai=precip/pet,eff=ai/(ai+C.AI_HALF);
-    const snow=frozen?1:water>0?clamp01((C.PDD_CRIT-pdd0)/C.PDD_RAMP):0;
+    // snow = clamp01((PDD_CRIT - pdd0)/PDD_RAMP) on unfrozen wet bodies.
+    let snow:number;
+    if(frozen)snow=1;else if(water>0){const s=(C.PDD_CRIT-pdd0)/C.PDD_RAMP;snow=s<0?0:s>1?1:s;}else snow=0;
     const warmest=annual+half;
-    const treeline=clamp01((warmest-C.T_TREE_WARMEST_K)/C.TREE_RAMP_K);
-    // Fraction of the year above GROW_K: G((annual - GROW_K)/half), tabulated.
-    const grow=half<=1e-9?(annual>C.GROW_K?1:0):pddKernelG((annual-C.GROW_K)/half);
+    const tl=(warmest-C.T_TREE_WARMEST_K)/C.TREE_RAMP_K,treeline=tl<0?0:tl>1?1:tl;
+    // Fraction of the year above GROW_K: G((annual - GROW_K)/half), tabulated (pddKernelG).
+    let grow:number;
+    if(half<=1e-9)grow=annual>C.GROW_K?1:0;
+    else{
+      const vg=(annual-C.GROW_K)/half;
+      if(vg<=-1)grow=0;else if(vg>=1)grow=1;
+      else{const kf=(vg+1)*(KERNEL_STEPS/2);let k=Math.floor(kf);if(k<0)k=0;else if(k>KERNEL_STEPS-1)k=KERNEL_STEPS-1;grow=G_TAB[k]!+(G_TAB[k+1]!-G_TAB[k]!)*(kf-k);}
+    }
     let tBin=Math.floor((annual-anchor+32)/2);if(tBin<0)tBin=0;else if(tBin>31)tBin=31;
     let mBin=Math.floor(eff*8);if(mBin<0)mBin=0;else if(mBin>7)mBin=7;
     out.insolation01=q;out.insolationHalfRange=qa;
     out.annualMeanTempK=annual;out.seasonalHalfRangeK=half;out.warmestMonthK=warmest;out.coldestMonthK=annual-half;
     out.legacyMoisture=moisture;out.dryBelt01=belt;out.effectiveMoisture=eff;out.precipMm=precip;out.petMm=pet;
-    out.aridity01=clamp01((0.5-eff)*4);
+    const ar=(0.5-eff)*4;
+    out.aridity01=ar<0?0:ar>1?1:ar;
     out.pdd=pdd0;out.snowFraction=snow;out.treeline01=treeline;out.growingSeason01=grow;
     // Step 4: heat cap. Forest fades out between a 305 K and a 316 K warmest month
-    // and is 0 wherever the annual mean reaches 320 K.
-    const heat=annual>=C.HEAT_ANNUAL_MAX_K?0:1-smooth(warmest,C.HEAT_LO_K,C.HEAT_HI_K);
-    out.forestSuitability01=habitat?treeline*clamp01((eff-C.FOREST_MOIST_LO)/C.FOREST_MOIST_RAMP)*clamp01(1-snow/0.2)*heat:0;
+    // and is 0 wherever the annual mean reaches 320 K. 1 - smooth(warmest, HEAT_LO_K, HEAT_HI_K):
+    let heat:number;
+    if(annual>=C.HEAT_ANNUAL_MAX_K)heat=0;
+    else{const hu=(warmest-C.HEAT_LO_K)/(C.HEAT_HI_K-C.HEAT_LO_K),ht=hu<0?0:hu>1?1:hu;heat=1-ht*ht*(3-2*ht);}
+    if(habitat){
+      const fm=(eff-C.FOREST_MOIST_LO)/C.FOREST_MOIST_RAMP,fs=1-snow/0.2;
+      out.forestSuitability01=treeline*(fm<0?0:fm>1?1:fm)*(fs<0?0:fs>1?1:fs)*heat;
+    }else out.forestSuitability01=0;
     out.climateCode=(tBin<<3)|mBin;
     return out;
   };
diff --git a/tests/surface-climate.bench.mjs b/tests/surface-climate.bench.mjs
index 0bcfc5b..869dd19 100644
--- a/tests/surface-climate.bench.mjs
+++ b/tests/surface-climate.bench.mjs
@@ -1,12 +1,18 @@
 // Cost bench for surface-climate-1 / habitat-suitability-1 (NOT part of npm test).
 // Run: node --expose-gc tests/surface-climate.bench.mjs
 // Budgets (docs/biome-climate-increment-1-plan-2026-10-02.json plan.budgets):
-//   surfaceClimate <= 0.15 us/sample warm, zero heap growth; climateForcingFor
-//   table build <= 5 ms/body; niche evaluator <= 1 us/sample for 24 species.
+//   surfaceClimate <= 0.15 us/sample warm; climateForcingFor table build <= 5 ms/body;
+//   niche evaluator <= 1 us/sample for 24 species.
+// Allocation (climate-m1 decision-5, Opus-decided on Kasper's instruction, overrulable;
+// docs/surface-climate-v2.md section 8): surfaceClimate allocates <= 20 B per call,
+// counted from GC events (v8.GCProfiler) over the 15 timed passes, and a no-op control
+// sampler in the same loop shape stays < 1 B per call (else the measurement is invalid).
+// Strict zero stays a goal, not a gate. Exit code 1 when any pass entry is false.
 import {galaxies,refByAddress,sector,system} from '../src/catalog.ts';
 import {generateBiosphere,biosphereAt} from '../src/biosphere-model.ts';
 import {climateForcingFor,clearClimateForcingCache,surfaceClimate,createClimateSample,temperateHabitat} from '../src/surface-climate.ts';
 import {compileNicheEvaluator} from '../src/habitat-suitability.ts';
+import v8 from 'node:v8';
 
 const g=galaxies('LETHRA-001')[0];
 const maithea=system(refByAddress(g,'G001/C2128,0,1/0')).planets[1];
@@ -24,21 +30,38 @@ clearClimateForcingCache();
 const t0=performance.now();for(const b of bodies)climateForcingFor(b);
 results.tableBuildMsPerBody=(performance.now()-t0)/bodies.length;
 
-// 2. surfaceClimate per sample, warm, plus heap growth across the timed loop.
+// 2. surfaceClimate per sample, warm, plus allocation across the timed loop.
 const sample=surfaceClimate(climateForcingFor(maithea)),out=createClimateSample(),d=[0,0,0];
 // Accumulate into a typed array: a captured `let` number would box a HeapNumber per write.
 const acc=new Float64Array(1);
 const run=()=>{for(let i=0;i<N;i++){d[0]=dirs[i*3];d[1]=dirs[i*3+1];d[2]=dirs[i*3+2];acc[0]+=sample(d,heights[i],out).annualMeanTempK;}};
 for(let w=0;w<5;w++)run();
-gc();const heap0=process.memoryUsage().heapUsed;
+// Allocation is counted from GC events, not from heap growth. A heap-growth check
+// (heapUsed after minus before the loop) is blind: a young-generation scavenge frees
+// short-lived garbage while the loop runs, so 3M calls that each box a double (~83 B
+// per call on climate-m1 3ab2eab, 118 scavenges) still end with < 1 MB of growth.
+// The bytes each GC inside the loop freed, plus the net growth, bound what the loop
+// allocated. The no-op control (same loop shape, its own function literal so each
+// call site stays monomorphic) proves the loop itself allocates nothing.
+const allocCount=(fn,passes,times)=>{
+  gc();gc();
+  const heap0=process.memoryUsage().heapUsed,prof=new v8.GCProfiler();prof.start();
+  for(let r=0;r<passes;r++){const t=performance.now();fn();if(times)times.push(performance.now()-t);}
+  const stats=prof.stop()?.statistics??[],heap1=process.memoryUsage().heapUsed;
+  let freed=0;for(const st of stats)freed+=Math.max(0,(st.beforeGC?.heapStatistics?.usedHeapSize??0)-(st.afterGC?.heapStatistics?.usedHeapSize??0));
+  const calls=passes*N;
+  return {calls,gcEvents:stats.length,heapGrowthBytes:heap1-heap0,freedByGcBytes:freed,bytesPerCall:(Math.max(0,heap1-heap0)+freed)/calls};
+};
 // The machine may be shared with other agents: report the best and median of
 // 15 timed passes of 200k samples (the best pass is the uncontended cost).
-const reps=15,times=[];for(let r=0;r<reps;r++){const t=performance.now();run();times.push(performance.now()-t);}
-const heap1=process.memoryUsage().heapUsed;gc();const heap2=process.memoryUsage().heapUsed;
+const reps=15,times=[];
+results.surfaceClimateAlloc=allocCount(run,reps,times);
 const us=t=>t*1000/N,sorted=[...times].sort((a,b)=>a-b);
 results.surfaceClimateUsPerSample=us(sorted[0]);results.surfaceClimateUsPerSampleMedian=us(sorted[reps>>1]);
-results.surfaceClimateHeapGrowthBytesDuringLoop=heap1-heap0;
-results.surfaceClimateHeapGrowthBytesAfterGc=heap2-heap0;
+const control=(dd,h,o)=>{o.annualMeanTempK=dd[0]*h+1.5;o.effectiveMoisture=dd[1]*0.5+0.25;return o;};
+const runControl=()=>{for(let i=0;i<N;i++){d[0]=dirs[i*3];d[1]=dirs[i*3+1];d[2]=dirs[i*3+2];acc[0]+=control(d,heights[i],out).annualMeanTempK;}};
+for(let w=0;w<5;w++)runControl();
+results.controlAlloc=allocCount(runControl,reps,null);
 
 // 3. Niche evaluator, 24 species (plants + animals per sample).
 const world=generateBiosphere('BENCH','temperate',maithea.id),date=Math.max(...world.species.map(s=>s.birthMyr))+1;
@@ -56,12 +79,16 @@ results.speciesEvaluated=ev.plantIds.length+ev.animalIds.length;
 results.nicheEvaluatorUsPerSample=(evTotal-climOnly)*1000/N;
 results.sink=Number.isFinite(acc[0]);
 
-results.budgets={surfaceClimateUs:.15,tableBuildMs:5,nicheEvaluatorUs:1};
+results.budgets={surfaceClimateUs:.15,surfaceClimateBytesPerCall:20,controlBytesPerCall:1,tableBuildMs:5,nicheEvaluatorUs:1};
 results.pass={
   surfaceClimate:results.surfaceClimateUsPerSample<=.15,
-  // 3M warm calls: anything allocating per call would show >= 48 MB here.
-  zeroHeapGrowth:results.surfaceClimateHeapGrowthBytesDuringLoop<=4*1024*1024,
+  // GC-counted bytes per call over the 15 timed passes (3M warm calls); valid only
+  // while the no-op control in the same loop shape stays below 1 B per call.
+  allocation:results.surfaceClimateAlloc.bytesPerCall<=20,
+  allocationControlValid:results.controlAlloc.bytesPerCall<1,
   tableBuild:results.tableBuildMsPerBody<=5,
   nicheEvaluator:results.nicheEvaluatorUsPerSample<=1,
 };
+results.ok=Object.values(results.pass).every(Boolean);
 console.log(JSON.stringify(results,null,2));
+if(!results.ok)process.exitCode=1;
commit 688129c3d225c58349807c1c14099b5539784100
Author:     Kasper <kaspersolesen@gmail.com>
AuthorDate: Thu Oct 8 12:53:03 2026 +0200
Commit:     Kasper <kaspersolesen@gmail.com>
CommitDate: Thu Oct 8 12:53:03 2026 +0200

    climate-m1 decision-5 step 1: hand-inline the sampler helpers, gates 1-3
    
    Decision-5 (Opus-decided on Kasper's instruction, overrulable): inline
    degreeDaysAbove (x2, with its pddKernelH/kernelAt body), pddKernelG, smooth
    and clamp01 in the surfaceClimate sampler closure only. noise() untouched,
    exported helpers kept, CLIMATE_CALIBRATION and CLIMATE_VERSION unchanged.
    The private clamp01/smooth consts had no other user and are removed.
    
    Gate 1 identity (timing/identity.json): pinned sets 1.8M samples x 18
    fields = 32.4M Object.is comparisons vs 3ab2eab, 0 differences (2.4M
    samples / 43.2M with the extra branch-coverage sets, 0 differences).
    Gate 2 pins (timing/pins.json, golden-compare.json): calibration sha
    f56bf8ab... unchanged, 50k digest identical, golden node output
    byte-identical to step 8 (all sections incl. climate/biomes/census/
    placeQuery/terrain).
    Gate 3 alloc (timing/alloc-rounds.log, 3 alternating rounds, 3M calls):
    branch 0.144/0.113/0.132 B/call, 0 GCs (3ab2eab 83.17, main c6526d0
    15.99-16.00); no-op control 0.219-0.237 B/call.
    
    Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_01Efsf7tULoE45x2UeLmHXnm

commit 0225e93fdda0cb50f44d3aa65da5f3adc16d8642
Author:     Kasper <kaspersolesen@gmail.com>
AuthorDate: Thu Oct 8 12:56:53 2026 +0200
Commit:     Kasper <kaspersolesen@gmail.com>
CommitDate: Thu Oct 8 12:56:53 2026 +0200

    climate-m1 decision-5 step 2: gates 4-5 on the inlined sampler
    
    Gate 4 (timing/ab-rounds.log, shared slot): 3 interleaved A/B processes x
    25 passes, fixed 3ab2eab vs fixed 688129c. Median ns/sample 59.34/59.19/
    58.03 -> 45.04/44.48/44.68; median-over-median ratio 0.759/0.752/0.770
    (median 0.759, gate <= 1.05). Harness alloc check: 83.22 -> 0.16-0.17
    B/call, negative control (+1 object/call) 48.26 B/call. Cold build (fresh
    process, 3 alternating): 3ab2eab 0.709-0.714 ms/body, 688129c 0.634-0.649
    ms/body; first cold-JIT call 2.63-2.72 ms (gate <= 5 ms).
    Gate 5: surface-climate + climate-earth-reference + terrain-climate-colour
    34 tests, 31 pass, 0 fail, 2 skip, 1 todo; test:affected (95 files) 771
    tests, 755 pass, 1 fail (version-compat:335, the expected pin), 11 skip,
    4 todo - identical counts to step 8.
    
    Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_01Efsf7tULoE45x2UeLmHXnm

commit e1b2cb665c9b5d2328b50495e55ee3ae40cdd30e
Author:     Kasper <kaspersolesen@gmail.com>
AuthorDate: Thu Oct 8 12:58:24 2026 +0200
Commit:     Kasper <kaspersolesen@gmail.com>
CommitDate: Thu Oct 8 12:58:24 2026 +0200

    climate-m1 decision-5 step 3: GC-counted allocation check in surface-climate.bench
    
    Decision-5 section 3 (Opus-decided on Kasper's instruction, overrulable):
    the heap-growth check (<= 4 MB) is replaced by the v8.GCProfiler count of
    alloc-diag.mjs over the 15 timed passes, plus a no-op control sampler in
    the same loop shape. Pass: surfaceClimate <= 20 B/call and control < 1
    B/call (a failing control invalidates the measurement and fails the
    bench). The wrong ">= 48 MB" comment is replaced by the scavenge
    blind-spot explanation; the bench now exits 1 when any pass entry is false.
    
    Gate (timing/bench-gate.log, 2 alternating rounds via the shared slot):
    3ab2eab 83.04/83.00 B/call, 59 GCs, allocation:false, exit 1;
    branch 0.221/0.139 B/call, 0 GCs, exit 0; controls 0.30-0.35 B/call.
    Reference main c6526d0: 19.82/19.80 B/call, 14 GCs, passes (at the edge).
    
    Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_01Efsf7tULoE45x2UeLmHXnm

commit 0f1b70e6f986b5e2f333da7e2cac3aabb08a6160
Author:     Kasper <kaspersolesen@gmail.com>
AuthorDate: Thu Oct 8 12:59:17 2026 +0200
Commit:     Kasper <kaspersolesen@gmail.com>
CommitDate: Thu Oct 8 12:59:17 2026 +0200

    climate-m1 decision-5 step 4: doc section 8 - timing STOP, restated gate, inline fix, bench fix
    
    surface-climate-v2.md section 8 records the STOP numbers (stop-run.log),
    the restated gate (Opus-decided on Kasper's instruction, overrulable),
    main's 16-17 B per sample on c6526d0, the branch 83 -> 0.1-0.2 B, the
    identity proof, gates 1-5, the bench-check gate, and the coordinator items
    (PERF-ALLOC-AUDIT backlog, cookbook lesson). Status paragraph and the
    decision-1 merge-gate line point at it.
    
    Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_01Efsf7tULoE45x2UeLmHXnm
C:\LLM\IWSDK\AGENTS.md
# IWSDK asset-production guide

This repository contains multiple Meta Immersive Web SDK projects and a shared
asset toolchain. Treat `tools/assetctl` as the contract boundary for generated
or imported assets.

## Start here

- Read `docs/ai-asset-creation-research-2026-07-29.md` for the current model and
  workflow rationale.
- Create an asset brief that validates against
  `schemas/asset-brief/v1.schema.json` before an expensive generation run.
- Put disposable review output under `Assets/_assetctl/`; do not overwrite a
  source `.blend`, `.glb`, texture, or audio file.
- Preserve prompts, seeds, model/checkpoint identifiers, parent assets, source
  consent, and license data. A visually good asset without provenance is not a
  shippable asset.

## Safe commands

Run these from the repository root:

```powershell
node tools/assetctl/assetctl.mjs doctor
node tools/assetctl/assetctl.mjs contract validate asset-brief examples/asset-briefs/static-prop.json
node tools/assetctl/assetctl.mjs providers
node tools/assetctl/assetctl.mjs blender render-sheet --input Assets/model.blend --output Assets/_assetctl/model-review
node tools/assetctl/assetctl.mjs validate Assets/model.glb
node tools/assetctl/assetctl.mjs package Assets/model.glb --brief examples/asset-briefs/static-prop.json
```

The Blender bridge is an allowlist of named operations. Never add arbitrary
Python evaluation, caller-provided scripts, shell command strings, or broad
filesystem access to an agent-facing operation. New mutations must validate
paths, preserve inputs, emit machine-readable results, and get a smoke test.

## Production rules

- Optimize for the actual target in the brief. Quest budgets are validation
  gates, not vague aspirations.
- Prefer glTF/GLB for runtime delivery. Use meters, right-handed Y-up runtime
  coordinates, applied transforms, explicit pivots, UVs, and deterministic
  names.
- Static 3D generation is a proposal stage. Retopology, UV/material cleanup,
  collision, LODs, render-sheet review, and validation remain required.
- Generated characters and creatures are experimental until topology,
  deformation, rig, animation, and in-headset checks pass.
- Local SFX and layered-image pipelines must expose their actual provider,
  checkpoint, seed, and license state. Do not silently fall back to a different
  model.
- Serialize GPU-heavy generators. A job may be queued, but do not launch two
  large local models concurrently on the same GPU.
- Do not download checkpoints, accept gated licenses, upload private assets, or
  publish generated work without explicit user authorization.

## Definition of done

An asset is done only when its brief passes, source and generated artifacts are
preserved, the standardized review set is inspectable, technical validation
passes, provenance is complete, the asset is packaged with a sidecar manifest,
and the target project has been tested on its intended runtime/device.

exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -Command '$files=@('"'test-results/climate-m1/timing/identity.mjs','test-results/climate-m1/timing/pins.json','test-results/climate-m1/timing/golden-compare.json','test-results/climate-m1/timing/alloc-diag.mjs','test-results/climate-m1/timing/ab-harness.mjs','test-results/climate-m1/timing/alloc-rounds.log','test-results/climate-m1/timing/ab-rounds.log','test-results/climate-m1/timing/alloc-rounds.sh','test-results/climate-m1/timing/ab-rounds.sh','test-results/climate-m1/timing/bench-gate.sh'); foreach("'$f in $files){$f;$i=0;Get-Content $f|ForEach-Object {$i++; '"'{0}: {1}' -f "'$i,$_}}; git show 3ab2eab:src/surface-climate.ts | Select-Object -Skip 135 -First 100' in C:\LLM\IWSDK\universe-atlas-wt\climate-m1
 succeeded in 1456ms:
test-results/climate-m1/timing/identity.mjs
1: // climate-m1 decision-5 gate 1: every ClimateSample field Object.is-identical between the fixed
2: // 3ab2eab tree (A) and the hand-inlined tree (B), on the pinned sets:
3: //   - 200k Fibonacci directions x the alloc-diag height pattern ((i*7919)%9000)-500 on Maithea,
4: //     Selawyn, Raiva, Lethuris (tests/landing-site.test.mjs FIXTURE) and the Earth reference;
5: //   - the first 50 bodies of the climate-agreement corpus (temperate planets of the 2000 systems from
6: //     sector x=266) x 8k Fibonacci directions, at the alloc-diag heights and at the
7: //     surface-climate.test digest heights ((i*7919)%12000)-1000;
8: //   - extra branch coverage (not part of the pinned set): Earth at obliquity 0 (half=0 branch) and
9: //     70 deg, a dry (water 0) and a frozen-style forcing, and the first 50 NON-temperate planets
10: //     (habitat false, frozen and dry bodies).
11: // node identity.mjs <dirA> <dirB> <out.json>
12: import {pathToFileURL} from 'node:url';
13: import {createHash} from 'node:crypto';
14: import {writeFileSync} from 'node:fs';
15: const [dirA, dirB, outPath] = process.argv.slice(2);
16: const u = (d, f) => pathToFileURL(`${d}/src/${f}`).href;
17: const A = await import(u(dirA, 'surface-climate.ts')), B = await import(u(dirB, 'surface-climate.ts'));
18: const {galaxies, refByAddress, sector, system} = await import(u(dirB, 'catalog.ts'));
19: const D = Math.PI / 180;
20: const EARTH = {anchorTempK: 288, obliquityRad: 23.44 * D, water: .7, surfaceGravityMS2: 9.81, moistureSeed: 1};
21: const g = galaxies('LETHRA-001')[0];
22: const FIXTURE = {Maithea: ['G001/C2128,0,1/0', 1], Selawyn: ['G001/C2142,3,4/0', 0], Raiva: ['G001/C2143,4,3/0', 1], Lethuris: ['G001/C2142,6,1/1', 1]};
23: const FIELDS = Object.keys(A.createClimateSample());
24: const fib = (i, n) => { const y = 1 - 2 * (i + .5) / n, p = i * 2.399963229728653, r = Math.sqrt(1 - y * y); return [Math.cos(p) * r, y, Math.sin(p) * r]; };
25: const hDiag = i => ((i * 7919) % 9000) - 500, hDigest = i => ((i * 7919) % 12000) - 1000;
26: const res = {dirA, dirB, node: process.version, fields: FIELDS, sets: {}, totalSamples: 0, totalComparisons: 0, differences: 0, firstDifferences: []};
27: // Branch reach of the inlined code, from B's outputs (all sets): proves the rare branches were exercised.
28: const reach = {halfZero: 0, pdd0Zero: 0, growZero: 0, growOne: 0, growInterior: 0, snowZero: 0, snowOne: 0, snowInterior: 0, treelineZero: 0, treelineOne: 0, treelineInterior: 0, aridityZero: 0, aridityOne: 0, aridityInterior: 0, heatRampInterior: 0, forestPositive: 0, forestZero: 0};
29: function tally(o) {
30:   const b3 = (v, z, one, mid) => { if (v === 0) reach[z]++; else if (v === 1) reach[one]++; else reach[mid]++; };
31:   if (o.seasonalHalfRangeK === 0) reach.halfZero++;
32:   if (o.pdd === 0) reach.pdd0Zero++;
33:   b3(o.growingSeason01, 'growZero', 'growOne', 'growInterior'); b3(o.snowFraction, 'snowZero', 'snowOne', 'snowInterior');
34:   b3(o.treeline01, 'treelineZero', 'treelineOne', 'treelineInterior'); b3(o.aridity01, 'aridityZero', 'aridityOne', 'aridityInterior');
35:   if (o.warmestMonthK > 305 && o.warmestMonthK < 316) reach.heatRampInterior++;
36:   if (o.forestSuitability01 > 0) reach.forestPositive++; else reach.forestZero++;
37: }
38: function compare(label, mkA, mkB, n, heightFns) {
39:   const sa = mkA(), sb = mkB(), oa = A.createClimateSample(), ob = B.createClimateSample();
40:   const h = createHash('sha256'); const buf = new Float64Array(FIELDS.length);
41:   let samples = 0, diffs = 0;
42:   for (const hf of heightFns) for (let i = 0; i < n; i++) {
43:     const d = fib(i, n), hm = hf(i);
44:     sa(d, hm, oa); sb(d, hm, ob); samples++;
45:     for (let k = 0; k < FIELDS.length; k++) {
46:       const f = FIELDS[k], va = oa[f], vb = ob[f]; buf[k] = va;
47:       if (!Object.is(va, vb)) { diffs++; if (res.firstDifferences.length < 20) res.firstDifferences.push({label, i, heightM: hm, field: f, a: va, b: vb}); }
48:     }
49:     h.update(Buffer.from(buf.buffer)); tally(ob);
50:   }
51:   res.sets[label] = {samples, comparisons: samples * FIELDS.length, differences: diffs, sha256OfA: h.digest('hex')};
52:   res.totalSamples += samples; res.totalComparisons += samples * FIELDS.length; res.differences += diffs;
53: }
54: // Pinned set 1: the four named worlds and Earth, 200k x alloc-diag heights.
55: for (const [name, [addr, idx]] of Object.entries(FIXTURE)) {
56:   const body = system(refByAddress(g, addr)).planets[idx];
57:   compare(`fixture:${name}`, () => A.surfaceClimate(A.climateForcingFor(body)), () => B.surfaceClimate(B.climateForcingFor(body)), 200000, [hDiag]);
58: }
59: compare('earth-reference', () => A.surfaceClimate(A.climateForcingFromParams(EARTH)), () => B.surfaceClimate(B.climateForcingFromParams(EARTH)), 200000, [hDiag]);
60: // Pinned set 2: first 50 corpus bodies x 8k directions.
61: const corpus = [], other = []; let systems = 0;
62: for (let sx = 266; systems < 2000; sx++) for (const ref of sector(g, [sx, 0, 0]).refs) {
63:   if (systems >= 2000) break; systems++;
64:   for (const b of system(ref).planets) (B.temperateHabitat(b) ? corpus : other).push(b);
65: }
66: for (const b of corpus.slice(0, 50)) compare(`corpus:${b.id}`, () => A.surfaceClimate(A.climateForcingFor(b)), () => B.surfaceClimate(B.climateForcingFor(b)), 8000, [hDiag, hDigest]);
67: const pinned = {samples: res.totalSamples, comparisons: res.totalComparisons, differences: res.differences};
68: // Extra branch coverage.
69: const extras = {'earth-obliquity-0': {...EARTH, obliquityRad: 0}, 'earth-obliquity-70': {...EARTH, obliquityRad: 70 * D}, 'earth-water-0': {...EARTH, water: 0}, 'earth-cold-230K': {...EARTH, anchorTempK: 230}, 'earth-hot-330K': {...EARTH, anchorTempK: 330}};
70: for (const [k, p] of Object.entries(extras)) compare(`extra:${k}`, () => A.surfaceClimate(A.climateForcingFromParams(p)), () => B.surfaceClimate(B.climateForcingFromParams(p)), 20000, [hDiag, hDigest]);
71: for (const b of other.slice(0, 50)) compare(`extra-nontemperate:${b.id}`, () => A.surfaceClimate(A.climateForcingFor(b)), () => B.surfaceClimate(B.climateForcingFor(b)), 4000, [hDiag, hDigest]);
72: res.pinned = pinned; res.corpusSize = corpus.length; res.nonTemperateCount = other.length;
73: res.branchReach = reach;
74: res.pass = res.differences === 0;
75: writeFileSync(outPath, JSON.stringify(res, null, 1));
76: console.log(JSON.stringify({pass: res.pass, branchReach: reach, pinned, totalSamples: res.totalSamples, totalComparisons: res.totalComparisons, differences: res.differences, sets: Object.keys(res.sets).length, firstDifferences: res.firstDifferences.slice(0, 3)}));
test-results/climate-m1/timing/pins.json
1: {
2:  "A_3ab2eab": {
3:   "calibrationSha": "f56bf8ab95a9d0fc965e3ba9a0fc693ca8e1c301e75497e456bb5a103dddce6e",
4:   "version": "surface-climate-2",
5:   "digest50k": {
6:    "G001/C2128,0,1/0/planet/1": "6267ac4b41bfcc13ab5cbb9c632e284efc902e96a23d53859f7aa4f3d5bd0b56",
7:    "G001/C2128,0,3/1/planet/0": "d2220d2f0845e09b81789d78b43161d71961f9bf1d5172a4e1b137850862ebbe",
8:    "G001/C2128,0,4/1/planet/0": "e532a39a83830478c60202b8fef58fedb26a2cb868f5d968fe15685dfec7b5cb",
9:    "G001/C2128,0,5/0/planet/0": "f9df465db9d6d30f14a8e71216f60b20229d08c7dee4c33929770f6200b6953e",
10:    "G001/C2128,0,5/1/planet/0": "5b757aeb2b5d7fe7831b134c9e9c2b0470d1ca27fbefaff11fe5cfa7a58354ee",
11:    "G001/C2128,0,6/0/planet/0": "eb45c23191b90d43cefabec8ced5e89c4c551fde33085f495c0fdca810279d21",
12:    "G001/C2128,0,7/0/planet/1": "6a75fe928dbcf6f28bcda21f3459a7fa8db246be807f7a25d848953833b2f819",
13:    "G001/C2128,1,1/0/planet/0": "24443b7668fd2067f85ab74b520aab52ca86833e347fa95bff3c59ee7a17bb18",
14:    "G001/C2128,1,1/1/planet/1": "5f2df6aa163215edc60837a198d3dbeffff4eecfefb1e223ecedfe9461e29577",
15:    "G001/C2128,1,2/0/planet/1": "beda717684899b8fa50a9cdfd7e3ec0c4b5ecd9cc1575c4f3d6da21d532d0968"
16:   }
17:  },
18:  "B_inlined": {
19:   "calibrationSha": "f56bf8ab95a9d0fc965e3ba9a0fc693ca8e1c301e75497e456bb5a103dddce6e",
20:   "version": "surface-climate-2",
21:   "digest50k": {
22:    "G001/C2128,0,1/0/planet/1": "6267ac4b41bfcc13ab5cbb9c632e284efc902e96a23d53859f7aa4f3d5bd0b56",
23:    "G001/C2128,0,3/1/planet/0": "d2220d2f0845e09b81789d78b43161d71961f9bf1d5172a4e1b137850862ebbe",
24:    "G001/C2128,0,4/1/planet/0": "e532a39a83830478c60202b8fef58fedb26a2cb868f5d968fe15685dfec7b5cb",
25:    "G001/C2128,0,5/0/planet/0": "f9df465db9d6d30f14a8e71216f60b20229d08c7dee4c33929770f6200b6953e",
26:    "G001/C2128,0,5/1/planet/0": "5b757aeb2b5d7fe7831b134c9e9c2b0470d1ca27fbefaff11fe5cfa7a58354ee",
27:    "G001/C2128,0,6/0/planet/0": "eb45c23191b90d43cefabec8ced5e89c4c551fde33085f495c0fdca810279d21",
28:    "G001/C2128,0,7/0/planet/1": "6a75fe928dbcf6f28bcda21f3459a7fa8db246be807f7a25d848953833b2f819",
29:    "G001/C2128,1,1/0/planet/0": "24443b7668fd2067f85ab74b520aab52ca86833e347fa95bff3c59ee7a17bb18",
30:    "G001/C2128,1,1/1/planet/1": "5f2df6aa163215edc60837a198d3dbeffff4eecfefb1e223ecedfe9461e29577",
31:    "G001/C2128,1,2/0/planet/1": "beda717684899b8fa50a9cdfd7e3ec0c4b5ecd9cc1575c4f3d6da21d532d0968"
32:   }
33:  },
34:  "calibrationShaPinned": "f56bf8ab95a9d0fc965e3ba9a0fc693ca8e1c301e75497e456bb5a103dddce6e",
35:  "pass": true
36: }
test-results/climate-m1/timing/golden-compare.json
1: {"wholeOutputIdenticalToStep8":true,"sections":{"galaxies":{"sameAsStep8_3ab2eab":true,"sameAsCommittedGolden":true},"sectors":{"sameAsStep8_3ab2eab":true,"sameAsCommittedGolden":true},"systems":{"sameAsStep8_3ab2eab":true,"sameAsCommittedGolden":true},"terrain":{"sameAsStep8_3ab2eab":true,"sameAsCommittedGolden":true},"history":{"sameAsStep8_3ab2eab":true,"sameAsCommittedGolden":true},"combined":{"sameAsStep8_3ab2eab":true,"sameAsCommittedGolden":true},"hierarchy":{"sameAsStep8_3ab2eab":true,"sameAsCommittedGolden":true},"geophysics":{"sameAsStep8_3ab2eab":true,"sameAsCommittedGolden":true},"climate":{"sameAsStep8_3ab2eab":true,"sameAsCommittedGolden":false},"biomes":{"sameAsStep8_3ab2eab":true,"sameAsCommittedGolden":false},"oceanVolume":{"sameAsStep8_3ab2eab":true,"sameAsCommittedGolden":true},"placeQuery":{"sameAsStep8_3ab2eab":true,"sameAsCommittedGolden":false},"census":{"sameAsStep8_3ab2eab":true,"sameAsCommittedGolden":false},"rocks":{"sameAsStep8_3ab2eab":true,"sameAsCommittedGolden":true},"fauna":{"sameAsStep8_3ab2eab":true,"sameAsCommittedGolden":true},"faunaKnownUnstable":{"sameAsStep8_3ab2eab":true,"sameAsCommittedGolden":true}}}
test-results/climate-m1/timing/alloc-diag.mjs
1: // Allocation diagnostic: the stock bench's exact `run` loop, with the GCs during 15 timed passes (3M calls) counted
2: // by v8.GCProfiler. Control: the same loop shape over a trivial non-allocating sampler writing the same out object.
3: // node --expose-gc alloc-diag.mjs <dir> [control]
4: import {pathToFileURL} from 'node:url';
5: import v8 from 'node:v8';
6: const [dir, which = 'real'] = process.argv.slice(2);
7: const u = f => pathToFileURL(`${dir}/src/${f}`).href;
8: const {galaxies, refByAddress, system} = await import(u('catalog.ts'));
9: const {climateForcingFor, surfaceClimate, createClimateSample} = await import(u('surface-climate.ts'));
10: const g = galaxies('LETHRA-001')[0];
11: const maithea = system(refByAddress(g, 'G001/C2128,0,1/0')).planets[1];
12: const N = 200000;
13: const dirs = new Float64Array(N * 3), heights = new Float64Array(N);
14: for (let i = 0; i < N; i++) { const y = 1 - 2 * (i + .5) / N, p = i * 2.399963229728653, r = Math.sqrt(1 - y * y); dirs[i * 3] = Math.cos(p) * r; dirs[i * 3 + 1] = y; dirs[i * 3 + 2] = Math.sin(p) * r; heights[i] = ((i * 7919) % 9000) - 500; }
15: const real = surfaceClimate(climateForcingFor(maithea)), out = createClimateSample(), d = [0, 0, 0];
16: const trivial = (dd, h, o) => { o.annualMeanTempK = dd[0] * h + 1.5; o.effectiveMoisture = dd[1] * 0.5 + 0.25; return o; };
17: const sample = which === 'control' ? trivial : real;
18: const acc = new Float64Array(1);
19: const run = () => { for (let i = 0; i < N; i++) { d[0] = dirs[i * 3]; d[1] = dirs[i * 3 + 1]; d[2] = dirs[i * 3 + 2]; acc[0] += sample(d, heights[i], out).annualMeanTempK; } };
20: for (let w = 0; w < 5; w++) run();
21: globalThis.gc(); globalThis.gc();
22: const heap0 = process.memoryUsage().heapUsed;
23: const prof = new v8.GCProfiler(); prof.start();
24: for (let r = 0; r < 15; r++) run();
25: const st = prof.stop().statistics;
26: const heap1 = process.memoryUsage().heapUsed;
27: let freed = 0; for (const s of st) freed += Math.max(0, s.beforeGC.heapStatistics.usedHeapSize - s.afterGC.heapStatistics.usedHeapSize);
28: const calls = 15 * N;
29: console.log(JSON.stringify({dir, which, calls, gcEvents: st.length, heapGrowthBytesDuringLoop: heap1 - heap0, freedByGcBytes: freed, bytesPerCallUpperBound: (Math.max(0, heap1 - heap0) + freed) / calls, sink: Number.isFinite(acc[0])}));
test-results/climate-m1/timing/ab-harness.mjs
1: // climate-m1 pre-merge timing harness (coordinator dispatch 2026-10-08).
2: // Modes:
3: //   ab   <mainDir> <branchDir> [rounds]  in-process interleaved A/B of the per-sample cost (+ allocation check)
4: //   cold <dir> <catalogDir> [reps]       fresh-process cold build of climateForcingFor
5: // Run with: node --expose-gc ab-harness.mjs ...
6: // Bodies and directions are the stock tests/surface-climate.bench.mjs set (Maithea + 40 temperate bodies from LETHRA-001).
7: import {pathToFileURL} from 'node:url';
8: import v8 from 'node:v8';
9: 
10: const [mode, dirA, dirB, extra] = process.argv.slice(2);
11: const url = (dir, f) => pathToFileURL(`${dir}/src/${f}`).href;
12: const gc = globalThis.gc ?? (() => { throw new Error('run with --expose-gc'); });
13: const median = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n & 1 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2; };
14: const min = a => Math.min(...a);
15: 
16: async function bodySet(catalogDir) {
17:   const {galaxies, refByAddress, sector, system} = await import(url(catalogDir, 'catalog.ts'));
18:   return {galaxies, refByAddress, sector, system};
19: }
20: function pickBodies(cat, temperateHabitat) {
21:   const {galaxies, refByAddress, sector, system} = cat;
22:   const g = galaxies('LETHRA-001')[0];
23:   const maithea = system(refByAddress(g, 'G001/C2128,0,1/0')).planets[1];
24:   const bodies = [];
25:   for (let sx = 266; bodies.length < 40; sx++) for (const ref of sector(g, [sx, 0, 0]).refs) { for (const b of system(ref).planets) if (temperateHabitat(b)) bodies.push(b); if (bodies.length >= 40) break; }
26:   return {maithea, bodies};
27: }
28: 
29: const N = 200000;
30: const dirs = new Float64Array(N * 3), heights = new Float64Array(N);
31: for (let i = 0; i < N; i++) { const y = 1 - 2 * (i + .5) / N, p = i * 2.399963229728653, r = Math.sqrt(1 - y * y); dirs[i * 3] = Math.cos(p) * r; dirs[i * 3 + 1] = y; dirs[i * 3 + 2] = Math.sin(p) * r; heights[i] = ((i * 7919) % 9000) - 500; }
32: 
33: // One separately compiled loop per version (new Function = its own SharedFunctionInfo and feedback), so the
34: // sample(d,h,out) call site stays monomorphic for each version, as in the stock bench.
35: const LOOP = `return (sample,out)=>{const d=[0,0,0];for(let i=0;i<N;i++){d[0]=dirs[i*3];d[1]=dirs[i*3+1];d[2]=dirs[i*3+2];acc[0]+=sample(d,heights[i],out).annualMeanTempK;}};`;
36: // Negative control: the same loop plus one escaping allocation per sample (must be caught by the GC counter).
37: const LOOP_ALLOC = `return (sample,out)=>{const d=[0,0,0];for(let i=0;i<N;i++){d[0]=dirs[i*3];d[1]=dirs[i*3+1];d[2]=dirs[i*3+2];sink[i&1023]={v:sample(d,heights[i],out).annualMeanTempK};}};`;
38: const acc = new Float64Array(1), sink = new Array(1024).fill(null);
39: const makeLoop = src => new Function('N', 'dirs', 'heights', 'acc', 'sink', src)(N, dirs, heights, acc, sink);
40: 
41: function allocCheck(run, sample, out, passes) {
42:   gc(); gc();
43:   const heap0 = process.memoryUsage().heapUsed;
44:   const prof = new v8.GCProfiler(); prof.start();
45:   for (let p = 0; p < passes; p++) run(sample, out);
46:   const r = prof.stop();
47:   const heap1 = process.memoryUsage().heapUsed;
48:   const stats = r?.statistics ?? [];
49:   const gcs = stats.length, scavenges = stats.filter(s => /scavenge/i.test(s.gcType)).length;
50:   // Bytes freed by the GCs that ran inside the loop + net growth = an upper estimate of what the loop allocated.
51:   let freed = 0; for (const s of stats) freed += Math.max(0, (s.beforeGC?.heapStatistics?.usedHeapSize ?? 0) - (s.afterGC?.heapStatistics?.usedHeapSize ?? 0));
52:   const calls = passes * N;
53:   return {calls, gcEvents: gcs, scavenges, heapGrowthBytes: heap1 - heap0, freedByGcBytes: freed, bytesPerCallUpperBound: (Math.max(0, heap1 - heap0) + freed) / calls, gcTypes: [...new Set(stats.map(s => s.gcType))]};
54: }
55: 
56: if (mode === 'ab') {
57:   const rounds = Number(extra ?? 25);
58:   const cat = await bodySet(dirB);
59:   const A = await import(url(dirA, 'surface-climate.ts')), B = await import(url(dirB, 'surface-climate.ts'));
60:   const {maithea} = pickBodies(cat, B.temperateHabitat);
61:   const ver = {
62:     main: {mod: A, sample: A.surfaceClimate(A.climateForcingFor(maithea)), out: A.createClimateSample(), run: makeLoop(LOOP)},
63:     branch: {mod: B, sample: B.surfaceClimate(B.climateForcingFor(maithea)), out: B.createClimateSample(), run: makeLoop(LOOP)},
64:   };
65:   // Warm both (JIT tier-up), interleaved.
66:   for (let w = 0; w < 8; w++) for (const k of ['main', 'branch']) ver[k].run(ver[k].sample, ver[k].out);
67:   const ns = {main: [], branch: []}, paired = [];
68:   for (let r = 0; r < rounds; r++) {
69:     const order = r & 1 ? ['branch', 'main'] : ['main', 'branch'];
70:     const t = {};
71:     for (const k of order) { const t0 = performance.now(); ver[k].run(ver[k].sample, ver[k].out); t[k] = (performance.now() - t0) * 1e6 / N; ns[k].push(t[k]); }
72:     paired.push(t.branch / t.main);
73:   }
74:   const res = {mode: 'ab', node: process.version, rounds, samplesPerPass: N, nsPerSample: {}, ratio: {}};
75:   for (const k of ['main', 'branch']) res.nsPerSample[k] = {best: min(ns[k]), median: median(ns[k]), passes: ns[k].map(x => +x.toFixed(2))};
76:   res.ratio = {medianOverMedian: res.nsPerSample.branch.median / res.nsPerSample.main.median, bestOverBest: res.nsPerSample.branch.best / res.nsPerSample.main.best, medianOfPaired: median(paired)};
77:   // Allocation: 15 passes x 200k = 3M warm calls per version, GCs counted with v8.GCProfiler.
78:   res.alloc = {};
79:   for (const k of ['main', 'branch']) res.alloc[k] = allocCheck(ver[k].run, ver[k].sample, ver[k].out, 15);
80:   const neg = makeLoop(LOOP_ALLOC); for (let w = 0; w < 3; w++) neg(ver.branch.sample, ver.branch.out);
81:   res.alloc.negativeControlBranchPlusOneObjectPerCall = allocCheck(neg, ver.branch.sample, ver.branch.out, 15);
82:   res.sink = Number.isFinite(acc[0]);
83:   console.log(JSON.stringify(res));
84: } else if (mode === 'cold') {
85:   const reps = Number(extra ?? 9);
86:   const cat = await bodySet(dirB);
87:   let t0 = performance.now();
88:   const M = await import(url(dirA, 'surface-climate.ts'));
89:   const importMs = performance.now() - t0;
90:   const {maithea, bodies} = pickBodies(cat, M.temperateHabitat);
91:   M.clearClimateForcingCache();
92:   t0 = performance.now(); M.climateForcingFor(maithea); const firstCallColdJitMs = performance.now() - t0;
93:   // Second distinct body, still early JIT.
94:   t0 = performance.now(); M.climateForcingFor(bodies[0]); const secondCallMs = performance.now() - t0;
95:   // Stock-bench method: cold cache, warmed JIT, 40 bodies; repeated.
96:   M.clearClimateForcingCache(); for (const b of bodies.slice(0, 5)) M.climateForcingFor(b);
97:   const perBody = [];
98:   for (let r = 0; r < reps; r++) { M.clearClimateForcingCache(); const t = performance.now(); for (const b of bodies) M.climateForcingFor(b); perBody.push((performance.now() - t) / bodies.length); }
99:   const res = {mode: 'cold', dir: dirA, node: process.version, importMs, firstCallColdJitMs, secondCallMs, warmJitColdCacheMsPerBody: {best: min(perBody), median: median(perBody), reps: perBody.map(x => +x.toFixed(4))}};
100:   if (M.zonalTables) {
101:     const z = []; for (let r = 0; r < 200; r++) { const t = performance.now(); M.zonalTables(r % 2 ? 0 : 23.5); z.push(performance.now() - t); }
102:     res.zonalTablesMsWarm = {best: min(z), median: median(z)};
103:   }
104:   console.log(JSON.stringify(res));
105: } else throw new Error('mode ab|cold');
test-results/climate-m1/timing/alloc-rounds.log
1: round 1
2: {"dir":"C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/main-c6526d0","which":"real","calls":3000000,"gcEvents":22,"heapGrowthBytesDuringLoop":1838112,"freedByGcBytes":46131936,"bytesPerCallUpperBound":15.990016,"sink":true}
3: round 1
4: {"dir":"C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-3ab2eab","which":"real","calls":3000000,"gcEvents":118,"heapGrowthBytesDuringLoop":2074096,"freedByGcBytes":247443680,"bytesPerCallUpperBound":83.172592,"sink":true}
5: round 1
6: {"dir":"C:/LLM/IWSDK/universe-atlas-wt/climate-m1","which":"real","calls":3000000,"gcEvents":0,"heapGrowthBytesDuringLoop":432936,"freedByGcBytes":0,"bytesPerCallUpperBound":0.144312,"sink":true}
7: round 1
8: {"dir":"C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/main-c6526d0","which":"control","calls":3000000,"gcEvents":0,"heapGrowthBytesDuringLoop":655656,"freedByGcBytes":0,"bytesPerCallUpperBound":0.218552,"sink":true}
9: round 1
10: {"dir":"C:/LLM/IWSDK/universe-atlas-wt/climate-m1","which":"control","calls":3000000,"gcEvents":0,"heapGrowthBytesDuringLoop":655656,"freedByGcBytes":0,"bytesPerCallUpperBound":0.218552,"sink":true}
11: round 2
12: {"dir":"C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/main-c6526d0","which":"real","calls":3000000,"gcEvents":22,"heapGrowthBytesDuringLoop":1873928,"freedByGcBytes":46131920,"bytesPerCallUpperBound":16.001949333333332,"sink":true}
13: round 2
14: {"dir":"C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-3ab2eab","which":"real","calls":3000000,"gcEvents":118,"heapGrowthBytesDuringLoop":2075888,"freedByGcBytes":247443504,"bytesPerCallUpperBound":83.17313066666667,"sink":true}
15: round 2
16: {"dir":"C:/LLM/IWSDK/universe-atlas-wt/climate-m1","which":"real","calls":3000000,"gcEvents":0,"heapGrowthBytesDuringLoop":338968,"freedByGcBytes":0,"bytesPerCallUpperBound":0.11298933333333333,"sink":true}
17: round 2
18: {"dir":"C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/main-c6526d0","which":"control","calls":3000000,"gcEvents":0,"heapGrowthBytesDuringLoop":711096,"freedByGcBytes":0,"bytesPerCallUpperBound":0.237032,"sink":true}
19: round 2
20: {"dir":"C:/LLM/IWSDK/universe-atlas-wt/climate-m1","which":"control","calls":3000000,"gcEvents":0,"heapGrowthBytesDuringLoop":665104,"freedByGcBytes":0,"bytesPerCallUpperBound":0.22170133333333333,"sink":true}
21: round 3
22: {"dir":"C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/main-c6526d0","which":"real","calls":3000000,"gcEvents":22,"heapGrowthBytesDuringLoop":1878336,"freedByGcBytes":46131984,"bytesPerCallUpperBound":16.00344,"sink":true}
23: round 3
24: {"dir":"C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-3ab2eab","which":"real","calls":3000000,"gcEvents":118,"heapGrowthBytesDuringLoop":2098320,"freedByGcBytes":247412104,"bytesPerCallUpperBound":83.17014133333333,"sink":true}
25: round 3
26: {"dir":"C:/LLM/IWSDK/universe-atlas-wt/climate-m1","which":"real","calls":3000000,"gcEvents":0,"heapGrowthBytesDuringLoop":394520,"freedByGcBytes":0,"bytesPerCallUpperBound":0.13150666666666666,"sink":true}
27: round 3
28: {"dir":"C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/main-c6526d0","which":"control","calls":3000000,"gcEvents":0,"heapGrowthBytesDuringLoop":695680,"freedByGcBytes":0,"bytesPerCallUpperBound":0.23189333333333334,"sink":true}
29: round 3
30: {"dir":"C:/LLM/IWSDK/universe-atlas-wt/climate-m1","which":"control","calls":3000000,"gcEvents":0,"heapGrowthBytesDuringLoop":692504,"freedByGcBytes":0,"bytesPerCallUpperBound":0.23083466666666666,"sink":true}
test-results/climate-m1/timing/ab-rounds.log
1: ab round 1
2: {"mode":"ab","node":"v24.7.0","rounds":25,"samplesPerPass":200000,"nsPerSample":{"main":{"best":57.89700000000039,"median":59.339999999999975,"passes":[61.36,59.34,58.86,61.4,60.33,59.93,62.23,58.88,62.59,60.72,58.9,58.54,58.71,58.61,60.9,59.54,59.62,58.25,59.04,59.99,59.83,59.2,58.52,57.9,58.77]},"branch":{"best":44.32399999999973,"median":45.03699999999981,"passes":[44.52,45.61,45.02,45.09,47.06,45.39,44.68,44.74,44.54,47.92,47.95,45.49,46.05,44.47,45.75,46.53,44.65,46.4,45.04,44.43,44.91,44.98,44.32,45.28,44.52]}},"ratio":{"medianOverMedian":0.7589652847994578,"bestOverBest":0.765566436948364,"medianOfPaired":0.7597951801090365},"alloc":{"main":{"calls":3000000,"gcEvents":118,"scavenges":118,"heapGrowthBytes":2222800,"freedByGcBytes":247441152,"bytesPerCallUpperBound":83.22131733333333,"gcTypes":["Scavenge"]},"branch":{"calls":3000000,"gcEvents":0,"scavenges":0,"heapGrowthBytes":489816,"freedByGcBytes":0,"bytesPerCallUpperBound":0.163272,"gcTypes":[]},"negativeControlBranchPlusOneObjectPerCall":{"calls":3000000,"gcEvents":35,"scavenges":35,"heapGrowthBytes":1050160,"freedByGcBytes":143733472,"bytesPerCallUpperBound":48.26121066666666,"gcTypes":["Scavenge"]}},"sink":true}
3: ab round 2
4: {"mode":"ab","node":"v24.7.0","rounds":25,"samplesPerPass":200000,"nsPerSample":{"main":{"best":56.76300000000026,"median":59.19300000000021,"passes":[57.43,59.59,61.45,60.83,59.55,59.61,57.21,57.16,60.61,60.76,59.25,58.05,56.81,56.76,60.63,60.83,57.73,60.92,59.19,56.76,57.53,58.68,57.4,60.75,59.02]},"branch":{"best":44.021999999999935,"median":44.483999999999924,"passes":[47.84,44.28,45.09,44.02,44.23,45.29,48.46,44.58,46.54,44.11,44.38,44.44,47.02,46.43,46.22,44.06,44.25,46.45,44.28,44.48,45.33,44.26,44.23,46.41,44.08]}},"ratio":{"medianOverMedian":0.7515077796361016,"bestOverBest":0.775540404841177,"medianOfPaired":0.7625058476892422},"alloc":{"main":{"calls":3000000,"gcEvents":118,"scavenges":118,"heapGrowthBytes":2229584,"freedByGcBytes":247441392,"bytesPerCallUpperBound":83.22365866666667,"gcTypes":["Scavenge"]},"branch":{"calls":3000000,"gcEvents":0,"scavenges":0,"heapGrowthBytes":492840,"freedByGcBytes":0,"bytesPerCallUpperBound":0.16428,"gcTypes":[]},"negativeControlBranchPlusOneObjectPerCall":{"calls":3000000,"gcEvents":35,"scavenges":35,"heapGrowthBytes":898056,"freedByGcBytes":143913912,"bytesPerCallUpperBound":48.270656,"gcTypes":["Scavenge"]}},"sink":true}
5: ab round 3
6: {"mode":"ab","node":"v24.7.0","rounds":25,"samplesPerPass":200000,"nsPerSample":{"main":{"best":56.84950000000015,"median":58.02800000000018,"passes":[58.89,61.93,60.23,58.59,57.03,56.92,57.64,58.66,57.7,58.03,56.85,56.92,57.26,58.4,57.63,61.1,57.07,57.01,58.98,58.94,57.88,61.09,59.08,58.34,57.5]},"branch":{"best":44.06300000000016,"median":44.68349999999987,"passes":[45.62,44.06,44.31,44.67,44.12,44.62,44.94,44.36,44.73,44.39,45.91,48.15,46.7,44.48,44.41,46.42,44.68,47.74,47.67,44.3,44.28,46.23,44.1,46.38,46.48]}},"ratio":{"medianOverMedian":0.7700334321362053,"bestOverBest":0.775081575035841,"medianOfPaired":0.7737591077675758},"alloc":{"main":{"calls":3000000,"gcEvents":118,"scavenges":118,"heapGrowthBytes":2222744,"freedByGcBytes":247441152,"bytesPerCallUpperBound":83.22129866666667,"gcTypes":["Scavenge"]},"branch":{"calls":3000000,"gcEvents":0,"scavenges":0,"heapGrowthBytes":516696,"freedByGcBytes":0,"bytesPerCallUpperBound":0.172232,"gcTypes":[]},"negativeControlBranchPlusOneObjectPerCall":{"calls":3000000,"gcEvents":35,"scavenges":35,"heapGrowthBytes":1036816,"freedByGcBytes":143758128,"bytesPerCallUpperBound":48.26498133333333,"gcTypes":["Scavenge"]}},"sink":true}
7: cold round 1
8: {"mode":"cold","dir":"C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-3ab2eab","node":"v24.7.0","importMs":11.083800000000004,"firstCallColdJitMs":2.967100000000002,"secondCallMs":0.004500000000007276,"warmJitColdCacheMsPerBody":{"best":0.7001574999999995,"median":0.7140574999999998,"reps":[0.746,0.7257,0.7002,0.7067,0.7355,0.717,0.7138,0.7141,0.7068]},"zonalTablesMsWarm":{"best":0.04499999999995907,"median":0.0453499999999849}}
9: cold round 1
10: {"mode":"cold","dir":"C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-688129c","node":"v24.7.0","importMs":6.087300000000006,"firstCallColdJitMs":2.7156999999999982,"secondCallMs":0.004800000000003024,"warmJitColdCacheMsPerBody":{"best":0.6378875000000008,"median":0.6485700000000001,"reps":[0.7352,0.6565,0.6486,0.656,0.651,0.6467,0.6379,0.6478,0.6405]},"zonalTablesMsWarm":{"best":0.045000000000015916,"median":0.04550000000000409}}
11: cold round 2
12: {"mode":"cold","dir":"C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-3ab2eab","node":"v24.7.0","importMs":11.432100000000005,"firstCallColdJitMs":3.155000000000001,"secondCallMs":0.005400000000008731,"warmJitColdCacheMsPerBody":{"best":0.687254999999999,"median":0.7124225000000003,"reps":[0.7554,0.7139,0.6986,0.7124,0.7204,0.745,0.6984,0.6873,0.698]},"zonalTablesMsWarm":{"best":0.045099999999990814,"median":0.04734999999999445}}
13: cold round 2
14: {"mode":"cold","dir":"C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-688129c","node":"v24.7.0","importMs":6.069600000000001,"firstCallColdJitMs":2.634999999999991,"secondCallMs":0.003899999999987358,"warmJitColdCacheMsPerBody":{"best":0.6207725000000004,"median":0.6374875000000003,"reps":[0.7277,0.6208,0.6364,0.6508,0.6256,0.6375,0.6507,0.6333,0.6473]},"zonalTablesMsWarm":{"best":0.04499999999995907,"median":0.04529999999999745}}
15: cold round 3
16: {"mode":"cold","dir":"C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-3ab2eab","node":"v24.7.0","importMs":10.758499999999998,"firstCallColdJitMs":3.148600000000002,"secondCallMs":0.003999999999990678,"warmJitColdCacheMsPerBody":{"best":0.6938299999999998,"median":0.7091475000000003,"reps":[0.7916,0.7164,0.7107,0.6953,0.7382,0.7091,0.6938,0.6948,0.7003]},"zonalTablesMsWarm":{"best":0.044899999999984175,"median":0.04529999999999745}}
17: cold round 3
18: {"mode":"cold","dir":"C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-688129c","node":"v24.7.0","importMs":6.404899999999998,"firstCallColdJitMs":2.6581000000000046,"secondCallMs":0.004199999999997317,"warmJitColdCacheMsPerBody":{"best":0.626192499999999,"median":0.6342200000000006,"reps":[0.7192,0.6292,0.6369,0.6434,0.6312,0.637,0.6294,0.6262,0.6342]},"zonalTablesMsWarm":{"best":0.04490000000004102,"median":0.04529999999999745}}
test-results/climate-m1/timing/alloc-rounds.sh
1: # decision-5 gate 3: alloc-diag.mjs, 3 alternating rounds (main c6526d0 / fixed 3ab2eab / inlined branch), real + no-op control.
2: M=/c/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/main-c6526d0; P=/c/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-3ab2eab; B=C:/LLM/IWSDK/universe-atlas-wt/climate-m1; A=C:/LLM/IWSDK/universe-atlas-wt/climate-m1/test-results/climate-m1/timing/alloc-diag.mjs
3: for r in 1 2 3; do
4:  for d in $M $P $B; do echo "round $r"; node --expose-gc $A $d real; done
5:  for d in $M $B; do echo "round $r"; node --expose-gc $A $d control; done
6: done
test-results/climate-m1/timing/ab-rounds.sh
1: # decision-5 gate 4: interleaved A/B, 3 rounds (processes) x 25 interleaved passes; A = fixed 3ab2eab, B = fixed 688129c.
2: # ab-harness labels A "main" and B "branch" in its output. Then cold build (fresh process) of both, 3 each, alternating.
3: P=/c/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-3ab2eab; N=/c/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-688129c; H=C:/LLM/IWSDK/universe-atlas-wt/climate-m1/test-results/climate-m1/timing/ab-harness.mjs
4: for r in 1 2 3; do echo "ab round $r"; node --expose-gc $H ab $P $N 25; done
5: for r in 1 2 3; do for d in $P $N; do echo "cold round $r"; node --expose-gc $H cold $d $N 9; done; done
test-results/climate-m1/timing/bench-gate.sh
1: # decision-5 section 3 gate: the fixed tests/surface-climate.bench.mjs (copied unchanged as tests/surface-climate.bench.fixed.mjs
2: # into the 3ab2eab and main c6526d0 exports) must fail on 3ab2eab and pass on the inlined branch. 2 alternating rounds.
3: S=/c/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad; B=C:/LLM/IWSDK/universe-atlas-wt/climate-m1
4: for r in 1 2; do
5:  echo "== round $r 3ab2eab (fixed bench)"; (cd $S/br-3ab2eab && node --expose-gc tests/surface-climate.bench.fixed.mjs; echo "exit=$?")
6:  echo "== round $r branch (fixed bench)"; (cd $B && node --expose-gc tests/surface-climate.bench.mjs; echo "exit=$?")
7:  echo "== round $r main c6526d0 (fixed bench, reference)"; (cd $S/main-c6526d0 && node --expose-gc tests/surface-climate.bench.fixed.mjs; echo "exit=$?")
8: done
  return {insolation01:0,insolationHalfRange:0,annualMeanTempK:0,seasonalHalfRangeK:0,warmestMonthK:0,coldestMonthK:0,
    legacyMoisture:0,dryBelt01:0,effectiveMoisture:0,aridity01:0,pdd:0,precipMm:0,petMm:0,snowFraction:0,treeline01:0,growingSeason01:0,
    forestSuitability01:0,climateCode:0};
}

const clamp01=(v:number)=>v<0?0:v>1?1:v;
/** Arithmetic smoothstep (no platform transcendental). */
const smooth=(x:number,lo:number,hi:number)=>{const t=clamp01((x-lo)/(hi-lo));return t*t*(3-2*t);};

/**
 * surface-climate-2 positive-degree-day kernel. The year is the sinusoid
 * T(t) = mu + A cos(2 pi t) (mu = annual mean, A = seasonal half-range). With
 * v = (mu - thr)/A, the time-mean of max(0, T - thr) is A*H(v) and the
 * fraction of the year with T > thr is G(v), where
 *   H(v) = (sqrt(1-v^2) + v*acos(-v))/pi,   G(v) = acos(-v)/pi,
 * H(v) = 0 and G(v) = 0 for v <= -1, H(v) = v and G(v) = 1 for v >= 1 (both
 * continuous at +-1). Both are tabulated ONCE at module init on 513 nodes over
 * v in [-1,1] (detAcos only here) and read with linear interpolation, so the
 * per-sample path has no transcendental at all.
 */
export const KERNEL_STEPS=512;
const H_TAB=new Float64Array(KERNEL_STEPS+1),G_TAB=new Float64Array(KERNEL_STEPS+1);
for(let k=0;k<=KERNEL_STEPS;k++){
  const v=-1+2*k/KERNEL_STEPS,a=detAcos(-v);
  H_TAB[k]=(Math.sqrt(Math.max(0,1-v*v))+v*a)/Math.PI;G_TAB[k]=a/Math.PI;
}
// Exact end nodes (H(-1) = G(-1) = 0, H(1) = G(1) = 1), whatever detAcos rounds to.
H_TAB[0]=0;G_TAB[0]=0;H_TAB[KERNEL_STEPS]=1;G_TAB[KERNEL_STEPS]=1;
/** Linear interpolation in a kernel table for v strictly inside (-1, 1). */
function kernelAt(tab:Float64Array,v:number):number {
  const f=(v+1)*(KERNEL_STEPS/2);
  let i=Math.floor(f);if(i<0)i=0;else if(i>KERNEL_STEPS-1)i=KERNEL_STEPS-1;
  return tab[i]!+(tab[i+1]!-tab[i]!)*(f-i);
}
/** The tabulated H(v) (mean positive excess per unit half-range). */
export function pddKernelH(v:number):number {return v<=-1?0:v>=1?v:kernelAt(H_TAB,v);}
/** The tabulated G(v) (fraction of the year above the threshold). */
export function pddKernelG(v:number):number {return v<=-1?0:v>=1?1:kernelAt(G_TAB,v);}
/**
 * Degree-days (C*d per year) above `thresholdC` of a sinusoidal year with annual
 * mean `annualK` (K) and half-range `halfK` (K). A < 1e-9 is a seasonless year.
 */
export function degreeDaysAbove(annualK:number,halfK:number,thresholdC:number):number {
  const excess=annualK-273.15-thresholdC;
  if(halfK<1e-9)return excess>0?excess*C.YEAR_D:0;
  return C.YEAR_D*halfK*pddKernelH(excess/halfK);
}

/**
 * Byte-identical to the renderer's habitat gate (planet-renderer.ts:830) and
 * equivalent to surface-biomes.ts's forestPotential body clause for every
 * non-Ice body (Ice worlds have snow=1, so their forest is false either way).
 */
export function temperateHabitat(body:Body):boolean {
  return body.water>0&&body.temperatureK>=250&&body.temperatureK<=325&&body.type!=='Ice world'&&body.type!=='Volcanic world';
}

/**
 * surface-climate-2 step 2, warm-column lapse correction (a calibration choice,
 * docs/surface-climate-v2.md): the lapse rate applied above the datum is
 * lapse*f(T0), f = clamp(1 - WARM_COL_PER_K*(T0 - WARM_COL_REF_K), 0.8, 1.1),
 * T0 the datum annual mean of the sample's latitude. Warm (moist, tropical)
 * columns cool more slowly with height than the planet's mean lapse rate, cold
 * columns faster. Without it the Earth equatorial snow line is 4302 m, below
 * the 4450 m floor.
 */
export function warmColumnLapseFactor(datumAnnualK:number):number {
  const f=1-C.WARM_COL_PER_K*(datumAnnualK-C.WARM_COL_REF_K);
  return f<C.WARM_COL_MIN?C.WARM_COL_MIN:f>C.WARM_COL_MAX?C.WARM_COL_MAX:f;
}

/**
 * surface-climate-2 step 3, warmest-month ceiling (symmetric): above
 * TW_CEILING_K the raw warmest month TwRaw = annual + half saturates,
 *   Tw' = 320 + e/(1 + e/40), e = TwRaw - 320   (Tw' < 360 K always),
 * and the half-range becomes half' = Tw' - annual, so the coldest month
 * annual - half' rises by the same amount and the annual mean is unchanged.
 * half' is never negative (the warmest month is never below the annual mean);
 * that floor binds only where the annual mean itself exceeds the saturated
 * warmest month (a hot, nearly seasonless column; not a habitat world).
 * PDD, treeline, growing season and the tile colour all read half'.
 */
export function warmestMonthCeilingK(rawWarmestK:number):number {
  const e=rawWarmestK-C.TW_CEILING_K;
  return e>0?C.TW_CEILING_K+e/(1+e/C.TW_CEILING_SCALE_K):rawWarmestK;
}

/** Surface gravity from the catalogue body, g = G*M/R^2 (m/s^2). */
export function surfaceGravityMS2(body:Pick<Body,'massKg'|'radiusM'>):number {
  return G*body.massKg/(body.radiusM*body.radiusM);
}
/** Per-planet environmental lapse rate (K/m) from surface gravity; see CLIMATE_CALIBRATION. */
export function lapseRateForGravity(gMS2:number):number {
  const raw=C.LAPSE_MOIST_FACTOR*gMS2/C.CP_J_PER_KG_K;
  return raw<C.LAPSE_MIN_K_PER_M?C.LAPSE_MIN_K_PER_M:raw>C.LAPSE_MAX_K_PER_M?C.LAPSE_MAX_K_PER_M:raw;
}

/**
 * Fold a drawn axial tilt in [0, pi] (retrograde included, stellar-evolution.ts
 * spinStateFor) to the insolation-relevant obliquity in [0, pi/2]: a spin axis

codex
The inlined expressions preserve the helper arithmetic and branch boundaries by inspection. I’m checking the identity run’s tree provenance and the GC measurement limits, then matching the recorded gate numbers to section 8.
exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -Command '$files=@('"'test-results/climate-m1/timing/identity.json','test-results/climate-m1/timing/bench-gate.log','test-results/climate-m1/timing/gate5-targeted.log'); foreach("'$f in $files){$f;$i=0;Get-Content $f|ForEach-Object {$i++;if($f -notlike '"'*identity.json' -or "'$i -lt 32 -or $i -gt 680){'"'{0}: {1}' -f "'$i,$_}}}; rg -n '"'tests |pass |fail |skip |todo |version-compat|95|335' test-results/climate-m1/timing/gate5-affected.log; rg -n 'corpus|2000|266' tests/climate-agreement*; rg --files --hidden -g AGENTS.md src tests docs test-results; git show 3ab2eab:src/surface-climate.ts | Select-String 'clamp01|smooth'; rg -n 'CLIMATE_VERSION|CLIMATE_CALIBRATION|function kernelAt|function pddKernel|function degreeDays|const C=' src/surface-climate.ts; rg --files --hidden test-results/climate-m1 | Select-String 'golden'" in C:\LLM\IWSDK\universe-atlas-wt\climate-m1
 succeeded in 1023ms:
test-results/climate-m1/timing/identity.json
1: {
2:  "dirA": "C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-3ab2eab",
3:  "dirB": "C:/LLM/IWSDK/universe-atlas-wt/climate-m1",
4:  "node": "v24.7.0",
5:  "fields": [
6:   "insolation01",
7:   "insolationHalfRange",
8:   "annualMeanTempK",
9:   "seasonalHalfRangeK",
10:   "warmestMonthK",
11:   "coldestMonthK",
12:   "legacyMoisture",
13:   "dryBelt01",
14:   "effectiveMoisture",
15:   "aridity01",
16:   "pdd",
17:   "precipMm",
18:   "petMm",
19:   "snowFraction",
20:   "treeline01",
21:   "growingSeason01",
22:   "forestSuitability01",
23:   "climateCode"
24:  ],
25:  "sets": {
26:   "fixture:Maithea": {
27:    "samples": 200000,
28:    "comparisons": 3600000,
29:    "differences": 0,
30:    "sha256OfA": "ad0db86a388926f03e017bd5eebbad2edd211ceb93ae5ff00237a48b46ec9b15"
31:   },
681:    "samples": 8000,
682:    "comparisons": 144000,
683:    "differences": 0,
684:    "sha256OfA": "8a00d2dc59a9e51b86a4d6f215c6bef0c96313645aa4f1aa41e40797e86f807a"
685:   }
686:  },
687:  "totalSamples": 2400000,
688:  "totalComparisons": 43200000,
689:  "differences": 0,
690:  "firstDifferences": [],
691:  "pinned": {
692:   "samples": 1800000,
693:   "comparisons": 32400000,
694:   "differences": 0
695:  },
696:  "corpusSize": 721,
697:  "nonTemperateCount": 11365,
698:  "branchReach": {
699:   "halfZero": 70825,
700:   "pdd0Zero": 1151983,
701:   "growZero": 1254102,
702:   "growOne": 409999,
703:   "growInterior": 735899,
704:   "snowZero": 1437335,
705:   "snowOne": 940515,
706:   "snowInterior": 22150,
707:   "treelineZero": 1360247,
708:   "treelineOne": 916103,
709:   "treelineInterior": 123650,
710:   "aridityZero": 1127068,
711:   "aridityOne": 361308,
712:   "aridityInterior": 911624,
713:   "heatRampInterior": 194609,
714:   "forestPositive": 370468,
715:   "forestZero": 2029532
716:  },
717:  "pass": true
718: }
test-results/climate-m1/timing/bench-gate.log
1: == round 1 3ab2eab (fixed bench)
2: {
3:   "node": "v24.7.0",
4:   "gcExposed": true,
5:   "tableBuildMsPerBody": 0.8396450000000002,
6:   "surfaceClimateAlloc": {
7:     "calls": 3000000,
8:     "gcEvents": 59,
9:     "heapGrowthBytes": 1703080,
10:     "freedByGcBytes": 247412032,
11:     "bytesPerCall": 83.03837066666667
12:   },
13:   "surfaceClimateUsPerSample": 0.06155300000000011,
14:   "surfaceClimateUsPerSampleMedian": 0.06529799999999995,
15:   "controlAlloc": {
16:     "calls": 3000000,
17:     "gcEvents": 0,
18:     "heapGrowthBytes": 987024,
19:     "freedByGcBytes": 0,
20:     "bytesPerCall": 0.329008
21:   },
22:   "speciesEvaluated": 24,
23:   "nicheEvaluatorUsPerSample": 0.19681600000000002,
24:   "sink": true,
25:   "budgets": {
26:     "surfaceClimateUs": 0.15,
27:     "surfaceClimateBytesPerCall": 20,
28:     "controlBytesPerCall": 1,
29:     "tableBuildMs": 5,
30:     "nicheEvaluatorUs": 1
31:   },
32:   "pass": {
33:     "surfaceClimate": true,
34:     "allocation": false,
35:     "allocationControlValid": true,
36:     "tableBuild": true,
37:     "nicheEvaluator": true
38:   },
39:   "ok": false
40: }
41: exit=1
42: == round 1 branch (fixed bench)
43: {
44:   "node": "v24.7.0",
45:   "gcExposed": true,
46:   "tableBuildMsPerBody": 0.7801099999999999,
47:   "surfaceClimateAlloc": {
48:     "calls": 3000000,
49:     "gcEvents": 0,
50:     "heapGrowthBytes": 661520,
51:     "freedByGcBytes": 0,
52:     "bytesPerCall": 0.22050666666666666
53:   },
54:   "surfaceClimateUsPerSample": 0.04587250000000012,
55:   "surfaceClimateUsPerSampleMedian": 0.048049499999999905,
56:   "controlAlloc": {
57:     "calls": 3000000,
58:     "gcEvents": 0,
59:     "heapGrowthBytes": 1015136,
60:     "freedByGcBytes": 0,
61:     "bytesPerCall": 0.33837866666666666
62:   },
63:   "speciesEvaluated": 24,
64:   "nicheEvaluatorUsPerSample": 0.19529550000000087,
65:   "sink": true,
66:   "budgets": {
67:     "surfaceClimateUs": 0.15,
68:     "surfaceClimateBytesPerCall": 20,
69:     "controlBytesPerCall": 1,
70:     "tableBuildMs": 5,
71:     "nicheEvaluatorUs": 1
72:   },
73:   "pass": {
74:     "surfaceClimate": true,
75:     "allocation": true,
76:     "allocationControlValid": true,
77:     "tableBuild": true,
78:     "nicheEvaluator": true
79:   },
80:   "ok": true
81: }
82: exit=0
83: == round 1 main c6526d0 (fixed bench, reference)
84: {
85:   "node": "v24.7.0",
86:   "gcExposed": true,
87:   "tableBuildMsPerBody": 0.9344549999999998,
88:   "surfaceClimateAlloc": {
89:     "calls": 3000000,
90:     "gcEvents": 14,
91:     "heapGrowthBytes": 798704,
92:     "freedByGcBytes": 58648912,
93:     "bytesPerCall": 19.815872
94:   },
95:   "surfaceClimateUsPerSample": 0.09940949999999986,
96:   "surfaceClimateUsPerSampleMedian": 0.10320250000000017,
97:   "controlAlloc": {
98:     "calls": 3000000,
99:     "gcEvents": 0,
100:     "heapGrowthBytes": 1059424,
101:     "freedByGcBytes": 0,
102:     "bytesPerCall": 0.3531413333333333
103:   },
104:   "speciesEvaluated": 24,
105:   "nicheEvaluatorUsPerSample": 0.1952494999999999,
106:   "sink": true,
107:   "budgets": {
108:     "surfaceClimateUs": 0.15,
109:     "surfaceClimateBytesPerCall": 20,
110:     "controlBytesPerCall": 1,
111:     "tableBuildMs": 5,
112:     "nicheEvaluatorUs": 1
113:   },
114:   "pass": {
115:     "surfaceClimate": true,
116:     "allocation": true,
117:     "allocationControlValid": true,
118:     "tableBuild": true,
119:     "nicheEvaluator": true
120:   },
121:   "ok": true
122: }
123: exit=0
124: == round 2 3ab2eab (fixed bench)
125: {
126:   "node": "v24.7.0",
127:   "gcExposed": true,
128:   "tableBuildMsPerBody": 0.8552500000000002,
129:   "surfaceClimateAlloc": {
130:     "calls": 3000000,
131:     "gcEvents": 59,
132:     "heapGrowthBytes": 1584208,
133:     "freedByGcBytes": 247412000,
134:     "bytesPerCall": 82.998736
135:   },
136:   "surfaceClimateUsPerSample": 0.060741000000000156,
137:   "surfaceClimateUsPerSampleMedian": 0.06334400000000016,
138:   "controlAlloc": {
139:     "calls": 3000000,
140:     "gcEvents": 0,
141:     "heapGrowthBytes": 919936,
142:     "freedByGcBytes": 0,
143:     "bytesPerCall": 0.3066453333333333
144:   },
145:   "speciesEvaluated": 24,
146:   "nicheEvaluatorUsPerSample": 0.19827300000000037,
147:   "sink": true,
148:   "budgets": {
149:     "surfaceClimateUs": 0.15,
150:     "surfaceClimateBytesPerCall": 20,
151:     "controlBytesPerCall": 1,
152:     "tableBuildMs": 5,
153:     "nicheEvaluatorUs": 1
154:   },
155:   "pass": {
156:     "surfaceClimate": true,
157:     "allocation": false,
158:     "allocationControlValid": true,
159:     "tableBuild": true,
160:     "nicheEvaluator": true
161:   },
162:   "ok": false
163: }
164: exit=1
165: == round 2 branch (fixed bench)
166: {
167:   "node": "v24.7.0",
168:   "gcExposed": true,
169:   "tableBuildMsPerBody": 0.7496625000000001,
170:   "surfaceClimateAlloc": {
171:     "calls": 3000000,
172:     "gcEvents": 0,
173:     "heapGrowthBytes": 416912,
174:     "freedByGcBytes": 0,
175:     "bytesPerCall": 0.13897066666666666
176:   },
177:   "surfaceClimateUsPerSample": 0.04629750000000002,
178:   "surfaceClimateUsPerSampleMedian": 0.04816550000000006,
179:   "controlAlloc": {
180:     "calls": 3000000,
181:     "gcEvents": 0,
182:     "heapGrowthBytes": 1032272,
183:     "freedByGcBytes": 0,
184:     "bytesPerCall": 0.34409066666666666
185:   },
186:   "speciesEvaluated": 24,
187:   "nicheEvaluatorUsPerSample": 0.20666550000000028,
188:   "sink": true,
189:   "budgets": {
190:     "surfaceClimateUs": 0.15,
191:     "surfaceClimateBytesPerCall": 20,
192:     "controlBytesPerCall": 1,
193:     "tableBuildMs": 5,
194:     "nicheEvaluatorUs": 1
195:   },
196:   "pass": {
197:     "surfaceClimate": true,
198:     "allocation": true,
199:     "allocationControlValid": true,
200:     "tableBuild": true,
201:     "nicheEvaluator": true
202:   },
203:   "ok": true
204: }
205: exit=0
206: == round 2 main c6526d0 (fixed bench, reference)
207: {
208:   "node": "v24.7.0",
209:   "gcExposed": true,
210:   "tableBuildMsPerBody": 0.9221700000000006,
211:   "surfaceClimateAlloc": {
212:     "calls": 3000000,
213:     "gcEvents": 14,
214:     "heapGrowthBytes": 762224,
215:     "freedByGcBytes": 58648392,
216:     "bytesPerCall": 19.803538666666668
217:   },
218:   "surfaceClimateUsPerSample": 0.0987850000000003,
219:   "surfaceClimateUsPerSampleMedian": 0.10582499999999982,
220:   "controlAlloc": {
221:     "calls": 3000000,
222:     "gcEvents": 0,
223:     "heapGrowthBytes": 900424,
224:     "freedByGcBytes": 0,
225:     "bytesPerCall": 0.3001413333333333
226:   },
227:   "speciesEvaluated": 24,
228:   "nicheEvaluatorUsPerSample": 0.20132400000000075,
229:   "sink": true,
230:   "budgets": {
231:     "surfaceClimateUs": 0.15,
232:     "surfaceClimateBytesPerCall": 20,
233:     "controlBytesPerCall": 1,
234:     "tableBuildMs": 5,
235:     "nicheEvaluatorUs": 1
236:   },
237:   "pass": {
238:     "surfaceClimate": true,
239:     "allocation": true,
240:     "allocationControlValid": true,
241:     "tableBuild": true,
242:     "nicheEvaluator": true
243:   },
244:   "ok": true
245: }
246: exit=0
test-results/climate-m1/timing/gate5-targeted.log
1: ✔ Earth reference: the PDD snow line (label) lies in every Earth ELA band (1.24ms)
2: ℹ [{"lat":0,"elaM":4608},{"lat":45,"elaM":3003},{"lat":60,"elaM":1505},{"lat":70,"elaM":719},{"lat":78,"elaM":426}]
3: ✔ negative: the shipped annual-mean rule (surface-climate-1, T_SNOW 268 K, ramp 6 K) fails the 60 deg band (0.1478ms)
4: ✔ warm-column lapse: the factor, its clamps, and why it is mandatory (equator without it < 4450 m) (0.3054ms)
5: ✔ ITCZ: argmax row of the annual insolation table; equator below ~54 deg obliquity, pole above (13.5727ms)
6: ✔ Earth reference zonal targets (calibrated band): P ratios and effective moisture per band (8.3181ms)
7: ℹ {"subOverItcz":0.1987292546137822,"midOverSub":1.2212660084910323,"polOverItcz":0.0718548449929969,"effItcz":0.6265525165796612,"effDry":0.2637125325405898,"effMid":0.6267215275876976}
8: ✔ negative: the uncalibrated starting band (P_REF 1000, a = .9/.6/.55/.4, w = 10/12/9/12) misses the Earth targets (5.3148ms)
9: ✔ high-tilt synthetic world (70 deg): the wettest band is polar and the driest band moves with the ITCZ (8.3325ms)
10: ℹ {"wettestLat":87.5,"driestLat":62.5,"effItcz":0.6802003374756341,"effSub":0.32279361831472586}
11: ✔ Earth reference: share of directions with forestSuitability01 > 0.5 lies in 25-55 % (decision 5) (6.6958ms)
12: ℹ {"forestShare":0.4684333333333333,"n":28106,"N":60000}
13: ✔ calibration constants are pinned; any change forces a CLIMATE_VERSION bump (0.9249ms)
14: ✔ PDD kernel: tabulated H and G match the closed form; degree-days of a sinusoidal year (20.3179ms)
15: ✔ module boundaries: allowed imports only, no platform transcendentals, no locale collation (1.1756ms)
16: ✔ Berger daily-mean insolation: annual tables match an independent platform-math reference (40.4996ms)
17: ✔ obliquity: honour the drawn tilt 0..180 deg, folded, with correct high-tilt physics (13.0437ms)
18: ✔ Earth reference forcing (288 K, 23.44 deg, water 0.7, 6.5 K/km) has the right shape (10.8789ms)
19: ✔ warmest-month ceiling: saturating, symmetric, annual mean unchanged (surface-climate-2 step 3) (11.3065ms)
20: ✔ half-range floor: an annual mean above the saturated ceiling gives a seasonless column (step 3) (1.6536ms)
21: ✔ heat cap: no forest where the warmest month reaches 316 K or the annual mean 320 K (step 4) (21.0219ms)
22: ✔ PET effective moisture: P/PET aridity index, Holdridge PET, thresholds keep their AI meaning (step 5) (13.9889ms)
23: ✔ per-planet lapse rate from surface gravity (owner amendment 1) (117.3932ms)
24: ✔ legacyMoisture is bit-identical to the classifier; temperateHabitat equals the renderer gate (37.283ms)
25: ✔ determinism: 50k samples identical across cold processes, cache states and body order (372.7278ms)
26: ✔ forcing cache: FIFO eviction never changes values (134.7898ms)
27: ✔ continuity: no steps at cube edges, poles, table rows or across the zonal band (10.7666ms)
28: ✔ sample fields: ranges, climate code round-trip, frozen and dry worlds (12.6225ms)
29: ✔ Maithea: snow emerges from its own gravity, and the 18 km equatorial summit is snow (0.32ms)
30: # scan colour:level0 [{"id":"G001/C2128,0,1/0/planet/1","land":32982,"snowy":6752,"forested":6592,"digest":"14b0660b93a0dbe7","ms":154},{"id":"G001/C2142,3,4/0/planet/0","land":23571,"snowy":0,"forested":476,"digest":"e71de2bd817ab131","ms":175},{"id":"G001/C2143,4,3/0/planet/1","land":31372,"snowy":0,"forested":56,"digest":"6674f268de3d74a9","ms":73},{"id":"G001/C2142,6,1/1/planet/1","land":22641,"snowy":2495,"forested":5450,"digest":"b9bc326964d3940e","ms":122}]
31: ✔ versions: terrain colour v2 names the climate model it reads (0.5441ms)
32: ✔ water-world land colour === waterWorldLandColour(climate at post-landform height) x grain, 20k land directions x 4 worlds (532.1181ms)
33: ﹣ water-world land colour identity on the carved truth, 20k land directions x 4 worlds (test:full) (0.0707ms) # test:full only (T6 decision 3): truth colour identity solves M3 blocks
34: ✔ the snow in the colour is surfaceClimate.snowFraction at that height (colour and classifier agree by construction) (6.9652ms)
35: ﹣ snow colour/classifier identity on the carved truth (test:full) (0.0694ms) # test:full only (T6 decision 3): truth snow identity solves M3 blocks
36: ✔ every non-water body keeps the base colour exactly (no climate path off water worlds) (821.5724ms)
37: ✔ climate zones read as distinct colours on Maithea (forest green, alpine meadow olive, snow white, dry tan) (48.0745ms)
38: ✔ PDD invariant: every Maithea land column with a warmest month below 271 K carries snow (decision 4) (51.8293ms)
39: ℹ {"fellThresholdK":271,"columns":22401,"snowFree":0,"minSnow":1,"maxPdd":0}
40: ✖ fell-field / rock colour: neutral grey-brown on snow-free cold columns (49.4413ms) # surface-climate-2 finding (decision 4): under PDD snow no snow-free fell band exists; the climate rock band in waterWorldLandColour is unreachable. Follow-up for the coordinator: retire the rock band, or redefine it on PDD in a later terrain-colour version.
41: ℹ tests 34
42: ℹ suites 0
43: ℹ pass 31
44: ℹ fail 0
45: ℹ cancelled 0
46: ℹ skipped 2
47: ℹ todo 1
48: ℹ duration_ms 1673.0099
49: 
50: ✖ failing tests:
51: 
52: test at tests\terrain-climate-colour.test.mjs:128:1
53: ✖ fell-field / rock colour: neutral grey-brown on snow-free cold columns (49.4413ms) # surface-climate-2 finding (decision 4): under PDD snow no snow-free fell band exists; the climate rock band in waterWorldLandColour is unreachable. Follow-up for the coordinator: retire the rock band, or redefine it on PDD in a later terrain-colour version.
54:   AssertionError [ERR_ASSERTION]: fell zone has 0 snow-free samples
55:       at TestContext.<anonymous> (file:///C:/LLM/IWSDK/universe-atlas-wt/climate-m1/tests/terrain-climate-colour.test.mjs:131:10)
56:       at Test.runInAsyncScope (node:async_hooks:214:14)
57:       at Test.run (node:internal/test_runner/test:1106:25)
58:       at Test.processPendingSubtests (node:internal/test_runner/test:788:18)
59:       at Test.postRun (node:internal/test_runner/test:1235:19)
60:       at Test.run (node:internal/test_runner/test:1163:12)
61:       at async Test.processPendingSubtests (node:internal/test_runner/test:788:7) {
62:     generatedMessage: false,
63:     code: 'ERR_ASSERTION',
64:     actual: false,
65:     expected: true,
66:     operator: '==',
67:     diff: 'simple'
68:   }
169:tests/acceptance/version-compat.test.mjs: tests/acceptance/version-compat.test.mjs -> src/surface-climate.ts
340:129 changed; 95 selected
341:# scan agreement:level0 [{"id":"G001/C2128,0,1/0/planet/1","land":32982,"snowLabel":6752,"forest":9887,"partialSnow":434,"digest":"9c95dbf3343fcf54","ms":319},{"id":"G001/C2142,3,4/0/planet/0","land":23571,"snowLabel":0,"forest":1011,"partialSnow":0,"digest":"d666098d76fef7e2","ms":378},{"id":"G001/C2143,4,3/0/planet/1","land":31372,"snowLabel":0,"forest":3711,"partialSnow":0,"digest":"7ea2f021a3739777","ms":181},{"id":"G001/C2142,6,1/1/planet/1","land":22641,"snowLabel":2495,"forest":8582,"partialSnow":426,"digest":"aaa73a9fe8a7163c","ms":311}]
345:# Lethuris: land 22641, snow-labelled 2495, forestPotential 8582, partial snow 426
349:# Lethuris orbit 256x128: land 12668, snow-labelled 895
354:✔ polar ITCZ: every judged corpus planet is wetter near the ITCZ than 18-35 deg from it (shipped belt fails) (50862.9504ms)
377:✔ WorldVersions bundle round-trips through JSON (the persisted save/bookmark/URL form) byte-for-byte (0.0953ms)
397:✔ ground bookmarks re-snap to the new ground height: main.ts restores ?walk= by direction only (3.0335ms)
404:✔ visit-order independence: biosphereStateAt across a real planet corpus (29.8495ms)
411:✔ overview bodies and rings remain separated during orbital playback; physical scale preserves ratios (253.954ms)
418:✔ galaxy map points are unique real catalogue stars across detail levels (622.9552ms)
424:✔ Earth reference zonal targets (calibrated band): P ratios and effective moisture per band (17.7595ms)
437:ℹ long thin meridian: worst relative error 0.01905356083957188
441:ℹ single equatorial cell: worst relative error 0.0000021120128339546795
443:ℹ Overall worst relative error: 0.01905356083957188
448:{"digest":"84e5defe16c694f0f49a654a8738b54f56d58db58d82fa2e9e12b313a82bffe9","stats":{"nodes":24578,"edges":98304,"oceanNodes":10868,"catchments":1560,"landKm2":186427985.05384487,"meanSpacingKm":117.46526026574753},"bytes":3170454,"first":{"id":"G001/C2128,0,1/0/planet/1/drainage-2/n64/outlet/16162","name":"Eiren Bracken Basin","outlet":16162,"head":15166,"areaKm2":4724304.149420381,"lengthKm":4597.372286115595,"depressionKm2":622997.0812005453,"headwater":{"direction":[0.20606068329331229,-0.9419916950551419,0.26493516423425867],"elevationM":6483.257173679424},"mouth":{"direction":[-0.127184737743948,-0.7816248642694881,0.6106444252105374],"elevationM":12.00000940695727}}}
452:# SITE_A class 4, h 3064.3 m, Ta 285.95 K, Tc 284.51 K, tropical margin 6.643 K
470:✔ group skip agrees with per-cell oracle across movement, patch validity and global cell order (17.0766ms)
474:✔ invalid inputs fail closed and diagnostics report bounds readiness (0.7504ms)
482:✔ stationary and reordered demand preserve instance slots without matrix or colour writes (95.5817ms)
526:✔ platform sections: a coarse nudge flips the raw-Math sections (negative control for the worker harness) (12644.0956ms)
548:✔ SITE_A passes the robustness rule with margin above the forest gate (5.9575ms)
553:✔ the surface-climate-1.1 site and the SITE_SEARCH disc no longer pass (why SITE_A moved again) (606.0129ms)
562:✔ legacy ?river= URLs get a concise unavailable notice and open the ordinary body view (5.3959ms)
563:✔ only tests may re-enable the archived river pipeline (20.1823ms)
581:✔ presentation continuity: receding exits fade past 95 m; the former 95 m candidate cut hard-drops them (negative) (18401.5781ms)
582:✖ presentation continuity: no camera-visible rig is hard-dropped inside the 95 m exit on a 360-frame recede from the pre-M1 site (27649.8102ms) # FAUNA-NEAR-DROP: visible rig hard-dropped inside the 95 m exit (pre-existing on main; see docs/surface-climate-v2.md §6d)
588:✔ completion of a retained herd stencil publishes that herd exactly once (18.9547ms)
595:✔ Selawyn: cost optimisation preserves full sampler outputs at truth and L0..22 (1319.9502ms)
603:✔ Selawyn: below the cut no block solve and an upper envelope; from the cut an upper envelope of the truth (no rock); from the rock level the truth (4163.1953ms)
627:ℹ Selawyn: cut L7, last corrected L10, 45 frame tiles (+6 edge-only); per level [tiles: massif samples of 65x65]: L0 [1: 52] L1 [3: 61,25,129] L2 [3: 114,218,180] L3 [7: 232,416,95,200,98,410,201] L4 [8: 30,783,797,86,461,507,301,376] L5 [6: 1482,1568,164,375,265,1246] L6 [7: 543,2658,2756,1043,1927,2093,6] L7 [2: 4073,3663] L8 [2: 4225,4208] L9 [2: 4225,4225] L10 [2: 4225,4225] L11 [2: 4225,4225]; block solves fine 22; 12.6 s
633:ℹ Maithea L2->3: 7 pairs, parent - child p50 0.0 / p99 1214.4 / max 3926.4 m (2023 points); ROOM 4950 m
662:ℹ Lethuris L1->2: 7 pairs, parent - child p50 0.0 / p99 2603.7 / max 3952.7 m (2023 points); ROOM 4950 m
666:ℹ Lethuris L5->6: 6 pairs, parent - child p50 6.5 / p99 351.4 / max 725.6 m (1734 points); ROOM 950 m
669:ℹ Lethuris L8->9: 2 pairs, parent - child p50 0.0 / p99 307.6 / max 794.3 m (578 points); ROOM 950 m
833:DRAINAGE_SMALL {"P":{"fill10Share":0,"pitsPer1000km2":19.229613604951627,"pits025":0},"N":{"fill10Share":0.22146444292888587,"pitsPer1000km2":1899.8858241692205,"pits025":757.646776035094}}
842:✔ HARD: coast safety and bounds including the zero-envelope margin (807.795ms)
851:✔ HARD: C1 across lattice lines (one-sided slopes agree), including block seams; the triangle reference must fail the same straddle (935.0862ms)
852:✔ HARD: the smoothed carving (M5 rock driver) is C2 across lattice lines incl. block seams; Catmull-Rom must fail the same straddle (8.2148ms)
857:✔ HARD: the truth core's inline voxel prefilter changes no value (Object.is, every field, four worlds) (109254.5953ms)
870:ℹ INFO Selawyn dense interpolation {"max":0.06609035104170952,"count":15045302,"worst":{"belt":21,"face":4,"i":497,"j":527,"u":-0.9999266853076781,"exact":0.014218362643220902,"sd":-0.05187198839848861},"ratio":0.3304517552085476,"interiorMax":0.000226716647867109,"interiorOnlyRatio":33.045175520854755}; 400 .0025-wide bins checked
872:ℹ INFO Selawyn coarse - exact uncarved floor {"count":56724,"violations":0,"oceanDifferences":0,"inactiveDifferences":0,"maxError":0.0074170890519863475,"p50":0,"p99":7.531337030924988,"max":27.03517195712402}
878:ℹ INFO Raiva dense interpolation {"max":0.05176391863107824,"count":1307106,"worst":{"belt":1,"face":5,"i":63,"j":113,"u":-0.9999220505568476,"exact":-0.03585074414342784,"sd":0.015913174487650394},"ratio":0.25881959315539116,"interiorMax":0.00036783711771271044,"interiorOnlyRatio":25.881959315539117}; 400 .0025-wide bins checked
881:ℹ INFO Raiva below old max 813; positive belt directions 9515
886:ℹ INFO Lethuris dense interpolation {"max":0.06771199563383427,"count":15593071,"worst":{"belt":31,"face":3,"i":668,"j":424,"u":0.9999622507681086,"exact":0.09135953365028533,"sd":0.1590715292841196},"ratio":0.3385599781691713,"interiorMax":0.00028291944467362384,"interiorOnlyRatio":33.85599781691714}; 400 .0025-wide bins checked
887:✔ Lethuris: >=50,000 Fibonacci + 4 x 41² rasters, upper floor, inactive identity, ocean flags, mutation (1147.1957ms)
888:ℹ INFO Lethuris coarse - exact uncarved floor {"count":56724,"violations":0,"oceanDifferences":0,"inactiveDifferences":0,"maxError":0.011451772768033525,"p50":0,"p99":9.369666756751712,"max":63.21540662403686}
891:✔ Lethuris: separate plain and mountain cores identical outside massifs, 4096 directions, both floor modes (24.495ms)
892:✔ HARD: baseTerrainCore and mountainTerrainCore are identical outside the setup and ridge-term hunks (0.7956ms)
906:ℹ near field (level >= 9): 639 shared edges (175 2:1), 247 across a 4096 m phase-origin cell, max height jump 6.596e-5 m, max slope jump 2.012e-5, worst {"a":"2/18/157234/123903","b":"2/18/157235/123903","cellA":"247,67","cellB":"247,67","dh":0.00006595950265760042,"ds":0.000004126422058083796}
916:ℹ negative control 'skirt without the chord sag': 1204 edges (332 coarser, 13 at 4:1 or more), 192640 samples, 27754 open > tol (max gap 632.817 m, tol <= 1239.56 mm), 11085 uncovered, min skirt margin -630.959 m, surface samples missing 0
937:WARM {"jobs":8,"workerBuilds":4,"workerMs":1395,"imported":4,"blocks":[1,1,1,1,1,1,1,1]}
956:✔ only structurally complete patches install; validated empty patches remain known (0.6955ms)
1001:✔ resource accounting includes canopy host arrays and canonical far-instance buffers (9.6695ms)
1034:✖ rocky corpus (460): Spearman(g, R) < 0.95 (175.8218ms) # NOT MET by the specified model: measured 0.990 (density spread +-25% cannot decorrelate g from a 4.5x radius span; real rocky solar-system bodies also rank 1.0). An ice-mantle density for Ice worlds would give ~0.84 but changes Ice-world relief; left to the owner/P4.
1039:✔ published outcomes equal a flat per-rock pass for every view and draw budget (795.7137ms)
1048:✔ combined renderer accounting adds rock-owned bytes once, never the shared PBR set twice, and keeps headroom (74.4895ms)
1049:✔ rescatter during a pending job: residents stay capped, the job drops evicted records, pinned rocks are counted once (959.2413ms)
1064:✔ materials reuse the shared rock PBR lease only for near LODs and own no textures (0.9954ms)
1065:✔ renderer and app wiring gate rocks on the solid surface, not on life (13.9512ms)
1105:✔ canonical river existence never depends on request date; auto only re-ranks which one to fly to (1754.0957ms)
1133:✔ temperate dry-bank colour is shared, finite, and leaves wet water unchanged (95.3844ms)
1161:✔ placement is a pure function of body, tier and cell: order, focus and repetition do not matter (50.5495ms)
1197:✔ physics: catalogue crossover — effective obliquity above the ~54 deg crossover gives polar annual mean > equatorial (295.0849ms)
1212:✔ the sparse-global callers pass level 0 (S0) and the dense/truth callers pass no level (1.6512ms)
1231:✔ moisture is bit-identical to the legacy classifier on 20k directions; airless and Ice branches unchanged (58.0956ms)
1238:✔ Berger daily-mean insolation: annual tables match an independent platform-math reference (51.0095ms)
1242:✔ half-range floor: an annual mean above the saturated ceiling gives a seasonless column (step 3) (1.7957ms)
1259:ℹ settled: resident 450 tiles 174316572 B (0.9335 of 186733908), visible 322, splitsBlockedByBytes max 322, refreshReserve 1497624
1264:# scan colour:level0 [{"id":"G001/C2128,0,1/0/planet/1","land":32982,"snowy":6752,"forested":6592,"digest":"14b0660b93a0dbe7","ms":292},{"id":"G001/C2142,3,4/0/planet/0","land":23571,"snowy":0,"forested":476,"digest":"e71de2bd817ab131","ms":247},{"id":"G001/C2143,4,3/0/planet/1","land":31372,"snowy":0,"forested":56,"digest":"6674f268de3d74a9","ms":127},{"id":"G001/C2142,6,1/1/planet/1","land":22641,"snowy":2495,"forested":5450,"digest":"b9bc326964d3940e","ms":188}]
1277:✔ kept palette: ocean, sea-ice, Ice, Volcanic, barren, gas-giant and base-sampler colours are bit-identical to the terrain-1.8.0-relief pin (ocean colours follow the relief depth; old 06d335ce) (4248.3071ms)
1278:✔ T6 identity outside the belts (level 0): bit-identical to the pre-mountains field outside the coarse envelope reach (1.3 H); massifs move (3887.6595ms)
1280:# scan floorWindow:level0 [{"id":"G001/C2128,0,1/0/planet/1","bad":0,"min":0,"max":1911.5229854201607,"bound":2114.746737541759,"type":"Oceanic world","radiusM":5194907,"digest":"a2b6633d78c25eae","ms":190},{"id":"G001/C2142,3,4/0/planet/0","bad":0,"min":0,"max":1363.0327602057168,"bound":1617.0662394140534,"type":"Oceanic world","radiusM":8552056,"digest":"ffa6470da88886c0","ms":152},{"id":"G001/C2143,4,3/0/planet/1","bad":0,"min":0,"max":966.9386093772036,"bound":1222.1483440546274,"type":"Oceanic world","radiusM":2002004,"digest":"3a9238d4f3966b18","ms":64},{"id":"G001/C2142,6,1/1/planet/1","bad":0,"min":0,"max":1872.0773294727906,"bound":2065.749573292352,"type":"Oceanic world","radiusM":8997494,"digest":"675157683587f60e","ms":125},{"id":"G001/C2128,0,7/0/planet/1","bad":0,"min":104.1576992656037,"max":3432.8539310092506,"bound":3685.2535801915046,"type":"Rocky world","radiusM":5514325,"digest":"d62e3b97ed735000","ms":28},{"id":"G001/C2128,0,7/0/planet/1/moon/0","bad":0,"min":18.116312490929282,"max":487.5702586331722,"bound":522.9885438194385,"type":"Airless moon","radiusM":905542,"digest":"46888de3c9da6966","ms":33}]
1301:RAIVA R1 {"tau":0.4560255015129207,"w":90090.17114178278,"count":300,"area":31998.375,"density":9.375476098395621}
1313:# scan coastline:level0 [{"id":"G001/C2128,0,1/0/planet/1","flips":0,"ocean":8988,"digest":"0d815bbaf60a2dab","ms":192},{"id":"G001/C2128,0,7/0/planet/0","flips":0,"ocean":0,"digest":"ac2878215ad33205","ms":48},{"id":"G001/C2128,0,7/0/planet/1","flips":0,"ocean":0,"digest":"ac2878215ad33205","ms":41},{"id":"G001/C2128,0,7/0/planet/2","flips":0,"ocean":8866,"digest":"0ed95b2718dce06a","ms":287},{"id":"G001/C2128,0,7/0/planet/3","flips":0,"ocean":11404,"digest":"f8e36ba711d1890f","ms":109},{"id":"G001/C2128,0,7/0/planet/4","flips":0,"ocean":0,"digest":"ac2878215ad33205","ms":65}]
1314:# Maithea relief {"n":11012,"p10":207.1006198463288,"p50":442.21580198995804,"p90":2812.547214654138,"p99":4378.397320136994,"max":5909.958408795425,"above4km":2.42462767889575,"below500":54.26807119505993,"snow":20.613875771885215,"sand":1.3803123864874682,"lowland":36.16055212495459,"rangeSnow":35.72228443449048,"lowSnow":3.173976030554458}
1315:# seabed {"body":"Maithea","n":7366,"mean":3304.7407246944126,"deepest01":-9913.73941622209,"shelf":9.50312245452077,"reachesSea":0,"detailStd":[[0,668,24.19046184118074],[200,1017,107.09571748343835],[2000,5329,148.026304297763],[6000,352,159.95894984788993]]}
1316:# seabed {"body":"Selawyn","n":9957,"mean":3793.0160157656273,"deepest01":-11209.004300301403,"shelf":7.472130159686652,"reachesSea":0,"detailStd":[[0,719,23.971473570827392],[200,1137,112.5507897275552],[2000,7035,149.85854897922104],[6000,1066,147.82505276116459]]}
1317:# seabed {"body":"Raiva","n":7828,"mean":3686.9294024332885,"deepest01":-11248.96909263583,"shelf":8.405723045477773,"reachesSea":0,"detailStd":[[0,625,24.074311498018652],[200,905,112.88455559789],[2000,5611,149.57239721416013],[6000,687,155.36124195719756]]}
1318:# seabed {"body":"Lethuris","n":10199,"mean":4011.203216405083,"deepest01":-11248.259186766707,"shelf":5.745661339346995,"reachesSea":0,"detailStd":[[0,562,25.414917873275023],[200,993,109.57294998697708],[2000,7458,151.80316493422563],[6000,1186,149.68275864131502]]}
1320:# corpus snow {"n":132,"median":0.05855018587360595,"over90":10,"binMedians":[0.6695491043854231,0.28116710875331563,0.053726169844020795,0.029350104821802937,0]}
1321:# scan hypsWindow:level0 [{"id":"G001/C2128,0,1/0/planet/1","bad":0,"max":1911.5229854201607,"bound":2114.746737541759,"digest":"a2b6633d78c25eae","ms":87},{"id":"G001/C2128,0,7/0/planet/0","bad":0,"max":3484.8663064359753,"bound":3680.207010710069,"digest":"4aa4e5423d39d051","ms":43},{"id":"G001/C2128,0,7/0/planet/1","bad":0,"max":3432.8539310092506,"bound":3685.2535801915046,"digest":"d62e3b97ed735000","ms":35},{"id":"G001/C2128,0,7/0/planet/2","bad":0,"max":1746.7377284254453,"bound":1933.5408969399325,"digest":"776e99940f13d41b","ms":43},{"id":"G001/C2128,0,7/0/planet/3","bad":0,"max":2705.0170876931666,"bound":3073.5826268937703,"digest":"b511dad6811a6dd4","ms":41},{"id":"G001/C2128,0,7/0/planet/4","bad":0,"max":1489.2837309635881,"bound":1569.1361897479653,"digest":"bfd4ace01f50aaa1","ms":42},{"id":"G001/C2142,3,4/0/planet/0","bad":0,"max":1363.0327602057168,"bound":1617.0662394140534,"digest":"ffa6470da88886c0","ms":36},{"id":"G001/C2143,4,3/0/planet/1","bad":0,"max":966.9386093772036,"bound":1222.1483440546274,"digest":"3a9238d4f3966b18","ms":67},{"id":"G001/C2142,6,1/1/planet/1","bad":0,"max":1872.0773294727906,"bound":2065.749573292352,"digest":"675157683587f60e","ms":46}]
1322:# scan heightBound:level0 [{"id":"G001/C2128,0,1/0/planet/1","minM":-11580,"maxM":6628.141599841999,"outside":0,"hMin":-10721.365015076633,"hMax":5909.958408795425,"digest":"44615697a8169b9a","ms":68},{"id":"G001/C2142,3,4/0/planet/0","minM":-11580,"maxM":5175.954474708171,"outside":0,"hMin":-11320.98542822047,"hMax":4363.97606663496,"digest":"e19bdf2c29ae0dee","ms":50},{"id":"G001/C2143,4,3/0/planet/1","minM":-11580,"maxM":4023.61942183104,"outside":0,"hMin":-11380.964811115351,"hMax":3193.523615843697,"digest":"d1d7ebdcd7880f38","ms":40},{"id":"G001/C2142,6,1/1/planet/1","minM":-11580,"maxM":6485.172262367983,"outside":0,"hMin":-11305.19749680002,"hMax":5010.147261378879,"digest":"32a214f2fa9a17cd","ms":36},{"id":"G001/C2128,0,7/0/planet/0","minM":-6591.415541570273,"maxM":11095.549494976625,"outside":0,"hMin":-5374.820967561167,"hMax":10564.191361985406,"digest":"e838628dd577f3da","ms":32},{"id":"G001/C2128,2,6/0/planet/0","minM":-3200,"maxM":5004.550699765674,"outside":0,"hMin":-3015.8295440615025,"hMax":4411.687577818145,"digest":"c7af7966a176b81c","ms":34},{"id":"G001/C2128,3,3/0/planet/0","minM":-4041.9366780580026,"maxM":6803.926741397637,"outside":0,"hMin":-2927.163923449336,"hMax":6432.6266405630995,"digest":"52dd3ce318ce308b","ms":38},{"id":"G001/C2128,3,5/0/planet/0","minM":-3200,"maxM":5172.013674099897,"outside":0,"hMin":-2766.6466996143076,"hMax":4528.784885476181,"digest":"ddd03a43b602d190","ms":47},{"id":"G001/C2128,5,2/0/planet/0","minM":-3887.4894452533945,"maxM":6543.940566176547,"outside":0,"hMin":-3022.9301586002816,"hMax":5760.238150724985,"digest":"ffb9a005bfa8acf2","ms":37},{"id":"G001/C2128,5,3/0/planet/0","minM":-6766.468860269405,"maxM":11390.222581453498,"outside":0,"hMin":-6290.859527540922,"hMax":10278.984109053488,"digest":"6d02ec795c3cbbff","ms":46},{"id":"G001/C2128,7,0/0/planet/0","minM":-4113.780411525384,"maxM":6924.863692734396,"outside":0,"hMin":-2804.2913611987747,"hMax":6599.036114838243,"digest":"dbaa8919e9401875","ms":45},{"id":"G001/C2129,0,3/0/planet/0","minM":-3351.456975467335,"maxM":5641.61924203668,"outside":0,"hMin":-2758.1456956988714,"hMax":4896.523284081722,"digest":"8eb850def0a28ad0","ms":30},{"id":"G001/C2129,1,2/0/planet/0","minM":-3200,"maxM":5065.0474623439795,"outside":0,"hMin":-2497.01111656152,"hMax":4556.778147924579,"digest":"0266d93497e8b93a","ms":50},{"id":"G001/C2129,3,4/1/planet/0","minM":-3200,"maxM":4955.953759706312,"outside":0,"hMin":-3009.4015130883954,"hMax":4446.688626131986,"digest":"8957641bb2c570a7","ms":27},{"id":"G001/C2128,0,7/0/planet/1","minM":-6600.454173477321,"maxM":11110.76452535349,"outside":0,"hMin":-5086.344914941066,"hMax":10028.5409764445,"digest":"c1e444b99cf4c2da","ms":26},{"id":"G001/C2128,1,3/0/planet/1","minM":-3659.188846920809,"maxM":6159.634558983362,"outside":0,"hMin":-2627.9998728549626,"hMax":5643.7631365920915,"digest":"ca64bf6e39d4575c","ms":52},{"id":"G001/C2128,2,4/0/planet/0","minM":-3200,"maxM":5205.233643778918,"outside":0,"hMin":-2726.597134686483,"hMax":4640.340369030781,"digest":"2260a2e77f363fb2","ms":40},{"id":"G001/C2128,2,6/0/planet/2","minM":-5182.179217051663,"maxM":8723.3350153703,"outside":0,"hMin":-4027.1197382765927,"hMax":8128.628829041999,"digest":"0afd39d36f68535c","ms":32},{"id":"G001/C2128,5,3/0/planet/1","minM":-3200,"maxM":5196.393690922699,"outside":0,"hMin":-2753.9035592853097,"hMax":4705.214924480292,"digest":"592d1f3ab0449761","ms":47},{"id":"G001/C2128,5,3/0/planet/2","minM":-4054.7450009365643,"maxM":6825.487418243216,"outside":0,"hMin":-3162.2252861477327,"hMax":5995.78765284413,"digest":"36de61a175346539","ms":31},{"id":"G001/C2129,0,2/0/planet/1","minM":-5839.028800949346,"maxM":9829.031814931399,"outside":0,"hMin":-5189.164912076747,"hMax":8531.317518547221,"digest":"3c772f248ac2c377","ms":39},{"id":"G001/C2129,0,3/0/planet/2","minM":-3200,"maxM":5102.426488559941,"outside":0,"hMin":-2592.652665799234,"hMax":4623.218302635127,"digest":"33ffc9dcf0348937","ms":40},{"id":"G001/C2129,3,4/0/planet/1","minM":-3200,"maxM":4526.73304862366,"outside":0,"hMin":-2835.1948083192674,"hMax":4068.5875679827686,"digest":"4b8924f50df4eb6a","ms":44},{"id":"G001/C2129,5,2/0/planet/2","minM":-7049.797265324798,"maxM":11867.158729963408,"outside":0,"hMin":-6704.991731415706,"hMax":10708.334637836178,"digest":"94d97731458bf8c1","ms":41},{"id":"G001/C2128,0,7/0/planet/2","minM":-11580,"maxM":6099.399184354579,"outside":0,"hMin":-10800.828666732534,"hMax":5314.56406813298,"digest":"112eb7b741996e8e","ms":41},{"id":"G001/C2128,0,7/0/planet/3","minM":-11580,"maxM":9425.93885907063,"outside":0,"hMin":-11394.305595694297,"hMax":7222.899665770076,"digest":"c3be45b2004baf6d","ms":42},{"id":"G001/C2128,1,3/0/planet/0","minM":-11580,"maxM":9457.087013481145,"outside":0,"hMin":-11337.843325591752,"hMax":8388.53357789425,"digest":"b340171edcb85c77","ms":265},{"id":"G001/C2128,2,6/0/planet/1","minM":-11580,"maxM":5101.295849751604,"outside":0,"hMin":-11223.145303682191,"hMax":4280.115307992064,"digest":"782f9dce0943f5f5","ms":298},{"id":"G001/C2128,2,7/0/planet/0","minM":-11580,"maxM":8369.592640956645,"outside":0,"hMin":-11272.872474947439,"hMax":7442.029724193493,"digest":"458cc4fc3c35814e","ms":187},{"id":"G001/C2128,2,7/0/planet/1","minM":-11580,"maxM":8806.492531695485,"outside":0,"hMin":-11308.580341120001,"hMax":7437.534823929857,"digest":"1a5d2eecbda19870","ms":113},{"id":"G001/C2128,2,7/1/planet/0","minM":-11580,"maxM":5795.561483416398,"outside":0,"hMin":-11366.01592978332,"hMax":4855.864665913354,"digest":"8873e7a8175322b9","ms":55},{"id":"G001/C2128,2,7/1/planet/1","minM":-11580,"maxM":6755.258088313556,"outside":0,"hMin":-11222.81290035276,"hMax":5879.557460057839,"digest":"d414523eb1fd2ad0","ms":222},{"id":"G001/C2128,3,0/0/planet/0","minM":-11580,"maxM":9887.440233144336,"outside":0,"hMin":-11320.997580962909,"hMax":8773.09212512514,"digest":"9fa335c35681d269","ms":192},{"id":"G001/C2128,3,3/0/planet/1","minM":-11580,"maxM":8924.095320111348,"outside":0,"hMin":-11226.786136571814,"hMax":7886.857901864544,"digest":"4dc635598d0d5831","ms":110},{"id":"G001/C2128,0,7/0/planet/4","minM":-3200,"maxM":5169.136189747966,"outside":0,"hMin":-2849.6511680867548,"hMax":4583.602079252248,"digest":"65c3cf19b14d9ae6","ms":46},{"id":"G001/C2128,0,7/0/planet/6","minM":-4623.080347489543,"maxM":7782.185251607398,"outside":0,"hMin":-3519.9549361417903,"hMax":6588.620017604495,"digest":"31173154f22fa9b4","ms":50},{"id":"G001/C2128,0,7/0/planet/7","minM":-3200,"maxM":5106.837837400322,"outside":0,"hMin":-2514.549532430623,"hMax":4396.970397880021,"digest":"16fdf8aaaef10671","ms":46},{"id":"G001/C2128,0,7/0/planet/8","minM":-3298.938241064195,"maxM":5553.212705791395,"outside":0,"hMin":-2437.8581129675504,"hMax":5100.476102785973,"digest":"f54d75fe1cc71126","ms":66},{"id":"G001/C2128,1,3/0/planet/4","minM":-3477.778373606252,"maxM":5854.260262237191,"outside":0,"hMin":-3378.351466464297,"hMax":5451.915472715589,"digest":"3eb5cbe473775f50","ms":60},{"id":"G001/C2128,1,3/0/planet/6","minM":-6237.194747189478,"maxM":10499.277824435621,"outside":0,"hMin":-4686.886484688828,"hMax":9837.35163914003,"digest":"95700d0cea45a5be","ms":56},{"id":"G001/C2128,1,3/0/planet/8","minM":-4101.21083951904,"maxM":6903.704913190384,"outside":0,"hMin":-3906.580002790513,"hMax":6551.056315806693,"digest":"b993edf56a5cc3e1","ms":66},{"id":"G001/C2128,1,3/0/planet/9","minM":-5898.988942736737,"maxM":9929.964720273507,"outside":0,"hMin":-4426.648682137011,"hMax":9089.211568248887,"digest":"beb4a3fe5d2e4bde","ms":53},{"id":"G001/C2128,1,3/0/planet/10","minM":-3200,"maxM":5011.675235672782,"outside":0,"hMin":-1805.4292443161246,"hMax":4279.139758825778,"digest":"32fef87607256663","ms":54},{"id":"G001/C2128,2,7/1/planet/3","minM":-4730.899331218814,"maxM":7963.680540885005,"outside":0,"hMin":-3722.304240403977,"hMax":7060.394836030963,"digest":"c07537e3ad8e53fe","ms":62},{"id":"G001/C2128,0,7/0/planet/5","minM":0,"maxM":0,"outside":0,"hMin":0,"hMax":0,"digest":"b9ce164d30e4101b","ms":32},{"id":"G001/C2128,0,7/0/planet/9","minM":0,"maxM":0,"outside":0,"hMin":0,"hMax":0,"digest":"b9ce164d30e4101b","ms":19},{"id":"G001/C2128,1,3/0/planet/2","minM":0,"maxM":0,"outside":0,"hMin":0,"hMax":0,"digest":"b9ce164d30e4101b","ms":23},{"id":"G001/C2128,1,3/0/planet/3","minM":0,"maxM":0,"outside":0,"hMin":0,"hMax":0,"digest":"b9ce164d30e4101b","ms":23},{"id":"G001/C2128,1,3/0/planet/5","minM":0,"maxM":0,"outside":0,"hMin":0,"hMax":0,"digest":"b9ce164d30e4101b","ms":24},{"id":"G001/C2128,1,3/0/planet/7","minM":0,"maxM":0,"outside":0,"hMin":0,"hMax":0,"digest":"b9ce164d30e4101b","ms":22},{"id":"G001/C2128,2,7/1/planet/2","minM":0,"maxM":0,"outside":0,"hMin":0,"hMax":0,"digest":"b9ce164d30e4101b","ms":20},{"id":"G001/C2128,2,7/1/planet/4","minM":0,"maxM":0,"outside":0,"hMin":0,"hMax":0,"digest":"b9ce164d30e4101b","ms":24},{"id":"G001/C2128,2,7/1/planet/6","minM":0,"maxM":0,"outside":0,"hMin":0,"hMax":0,"digest":"b9ce164d30e4101b","ms":24},{"id":"G001/C2128,3,3/0/planet/4","minM":0,"maxM":0,"outside":0,"hMin":0,"hMax":0,"digest":"b9ce164d30e4101b","ms":25},{"id":"G001/C2128,0,7/0/planet/1/moon/0","minM":-1448.8674592226744,"maxM":2152.9644354449474,"outside":0,"hMin":-1214.204429933293,"hMax":1910.1807665801834,"digest":"fe41f9ccb652dcdc","ms":32},{"id":"G001/C2128,0,7/0/planet/2/moon/0","minM":-2907.5965785104067,"maxM":5057.199664578904,"outside":0,"hMin":-2625.5884624337546,"hMax":4829.999187415233,"digest":"905caeab17dcfef6","ms":31},{"id":"G001/C2128,0,7/0/planet/4/moon/0","minM":-1501.6203904151917,"maxM":2434.290655754281,"outside":0,"hMin":-1161.9849478276274,"hMax":2184.2534738465315,"digest":"30fe4c50deb8155c","ms":31},{"id":"G001/C2128,0,7/0/planet/4/moon/1","minM":-1639.1642651706934,"maxM":2722.826178018372,"outside":0,"hMin":-1495.1073758915861,"hMax":2459.2323395948906,"digest":"a868a2866f1fd443","ms":49},{"id":"G001/C2128,0,7/0/planet/5/moon/0","minM":-545.2629210054874,"maxM":748.6147727439544,"outside":0,"hMin":-447.86407020385855,"hMax":702.6396531452857,"digest":"30a0ec7281351735","ms":51},{"id":"G001/C2128,0,7/0/planet/5/moon/1","minM":-966.6600365191698,"maxM":1348.8266051628973,"outside":0,"hMin":-619.0576726321583,"hMax":1211.6892443003633,"digest":"ef2b5acba29becc6","ms":40}]
1329:✔ corpus of 132 habitable water planets: snow share median <= 20%, at most 20 above 90%, colder anchors are snowier (16964.9578ms)
1382:ℹ {"world":"Selawyn","kind":"axis","belt":1,"blockMaxPeakDb":2.93,"blockAt":"block h5","blockCombDb":-0.58,"nominal16kMaxPeakDb":2.34,"nominal16kCombDb":-0.21,"maxLineDb":0.95,"beta1D":2.19,"overSyntheticThreshold":false}
1397:ℹ {"world":"Lethuris","kind":"belt-end","belt":0.79,"blockMaxPeakDb":5.95,"blockAt":"block h12","blockCombDb":0.86,"nominal16kMaxPeakDb":2.62,"nominal16kCombDb":0.12,"maxLineDb":1.34,"beta1D":2.84,"overSyntheticThreshold":false}
1415:ℹ {"world":"Raiva","kind":"belt-end","clean":[5.88,1.24],"sinusoid10pctPeakDb":7.95,"gutter2pctCombDb":1.13}
1420:ℹ {"world":"Lethuris","kind":"belt-end","clean":[5.95,0.86],"sinusoid10pctPeakDb":23.92,"gutter2pctCombDb":4.63}
1430:ℹ {"world":"Selawyn","kind":"axis","massif":true,"latticePeakDb":[4.38,1.62,-1.95,-0.17],"latticeToneRmsM":[0.3,0.1,0,0],"gullyPeakDb":[1.12,3.13],"rmsM":253.65,"coarseCoherence":{"400-800m":0.35,"800-1600m":0.35,"1600-3200m":0.28,"3200-6400m":0.11,"6400-12800m":0.02,"12800-25600m":0.25},"fineCoherence":{"100-200m":0.06,"200-400m":0.16,"400-800m":0.27,"800-1600m":0.2,"1600-3200m":0.36}}
1445:ℹ {"world":"Lethuris","kind":"belt-end","massif":true,"latticePeakDb":[0.52,-4.21,0.56,-2.04],"latticeToneRmsM":[0,0,0,0],"gullyPeakDb":[-2.19,2.27],"rmsM":8.95,"coarseCoherence":{"400-800m":0.37,"800-1600m":0.24,"1600-3200m":0.21,"3200-6400m":0.09,"6400-12800m":0.08,"12800-25600m":0.2},"fineCoherence":{"100-200m":0.66,"200-400m":0.37,"400-800m":0.39,"800-1600m":0.32,"1600-3200m":0.4}}
1446:ℹ {"world":"Lethuris","kind":"outside","massif":false,"latticePeakDb":[-1.49,-3.42,0.74,1.2],"latticeToneRmsM":[0,0,0,0],"gullyPeakDb":[1.95,-1.79],"rmsM":27.78,"coarseCoherence":{"400-800m":0.05,"800-1600m":0.1,"1600-3200m":0.08,"3200-6400m":0.06,"6400-12800m":0.14,"12800-25600m":0.22},"fineCoherence":{"100-200m":0.89,"200-400m":0.66,"400-800m":0.67,"800-1600m":0.89,"1600-3200m":0.81}}
1448:SPECTRUM_ROWS {"tier":"default","thresholds":{"PEAK_DB":8.75,"COMB_DB":2.75,"FINE_COHERENCE":0.24,"FINE_MIN_BINS":1000},"synthetic":{"control":[{"seed":101,"maxPeakDb":1.61,"peakAt":"b16k h1","combDb":-0.54,"maxLineDb":0.59,"beta1D":2.2},{"seed":102,"maxPeakDb":4.46,"peakAt":"b16k h10","combDb":0.26,"maxLineDb":0.61,"beta1D":2.18},{"seed":103,"maxPeakDb":1.91,"peakAt":"b16k h3","combDb":-0.54,"maxLineDb":0.34,"beta1D":2.15},{"seed":104,"maxPeakDb":3.23,"peakAt":"b16k h8","combDb":0.53,"maxLineDb":0.49,"beta1D":2.2},{"seed":105,"maxPeakDb":4.73,"peakAt":"b16k h10","combDb":0.35,"maxLineDb":0.68,"beta1D":2.19},{"seed":106,"maxPeakDb":3.4,"peakAt":"b16k h2","combDb":0.49,"maxLineDb":0.8,"beta1D":2.19},{"seed":107,"maxPeakDb":4.97,"peakAt":"b16k h2","combDb":1,"maxLineDb":0.68,"beta1D":2.15},{"seed":108,"maxPeakDb":2.88,"peakAt":"b16k h5","combDb":-0.16,"maxLineDb":0.76,"beta1D":2.24}],"defects":[{"seed":101,"sinusoid10pctPeakDb":17.78,"sinusoidAt":"b16k h1","gutter2pctCombDb":7.07,"gutter2pctPeakDb":11.04},{"seed":102,"sinusoid10pctPeakDb":12.16,"sinusoidAt":"b16k h1","gutter2pctCombDb":5.48,"gutter2pctPeakDb":9.96},{"seed":103,"sinusoid10pctPeakDb":15.84,"sinusoidAt":"b16k h1","gutter2pctCombDb":4.43,"gutter2pctPeakDb":8.07},{"seed":104,"sinusoid10pctPeakDb":19.21,"sinusoidAt":"b16k h1","gutter2pctCombDb":7.8,"gutter2pctPeakDb":11.93},{"seed":105,"sinusoid10pctPeakDb":12.87,"sinusoidAt":"b16k h1","gutter2pctCombDb":5.93,"gutter2pctPeakDb":10.42},{"seed":106,"sinusoid10pctPeakDb":13.35,"sinusoidAt":"b16k h1","gutter2pctCombDb":5.39,"gutter2pctPeakDb":8.54},{"seed":107,"sinusoid10pctPeakDb":18.92,"sinusoidAt":"b16k h1","gutter2pctCombDb":6.6,"gutter2pctPeakDb":10.2},{"seed":108,"sinusoid10pctPeakDb":16.46,"sinusoidAt":"b16k h1","gutter2pctCombDb":6.3,"gutter2pctPeakDb":10.04}],"limits":{"control":{"perTileMaxPeakDb":[1.61,4.97],"perTileCombDb":[-0.54,1],"firesPerTile":"0/8","pooledMaxPeakDb":1.31,"pooledAt":"b16k h10","pooledCombDb":0.13},"sinusoid1pct":{"perTileMaxPeakDb":[1.91,6.53],"perTileCombDb":[-0.4,1.38],"firesPerTile":"0/8","pooledMaxPeakDb":2.84,"pooledAt":"b16k h1","pooledCombDb":0.34},"sinusoid2pct":{"perTileMaxPeakDb":[3.41,9.17],"perTileCombDb":[-0.05,1.99],"firesPerTile":"1/8","pooledMaxPeakDb":5.5,"pooledAt":"b16k h1","pooledCombDb":0.73},"gutter1pct":{"perTileMaxPeakDb":[5.21,8.57],"perTileCombDb":[1.07,3.92],"firesPerTile":"4/8","pooledMaxPeakDb":4.5,"pooledAt":"b16k h16","pooledCombDb":2.63},"blockScale10pct":{"perTileMaxPeakDb":[2.01,6.04],"perTileCombDb":[-0.28,2.88],"firesPerTile":"1/8","pooledMaxPeakDb":3.15,"pooledAt":"b16k h15","pooledCombDb":1.16}},"stripes":[{"seed":101,"cleanFineMax":0.06,"stripedCoherence":0.32,"stripedAngleDeg":29,"cleanRmsM":22.09},{"seed":102,"cleanFineMax":0.08,"stripedCoherence":0.31,"stripedAngleDeg":30,"cleanRmsM":25.61},{"seed":103,"cleanFineMax":0.04,"stripedCoherence":0.32,"stripedAngleDeg":28,"cleanRmsM":28.68},{"seed":104,"cleanFineMax":0.07,"stripedCoherence":0.31,"stripedAngleDeg":32,"cleanRmsM":31.73},{"seed":105,"cleanFineMax":0.03,"stripedCoherence":0.33,"stripedAngleDeg":31,"cleanRmsM":27.99},{"seed":106,"cleanFineMax":0.06,"stripedCoherence":0.34,"stripedAngleDeg":30,"cleanRmsM":27.4},{"seed":107,"cleanFineMax":0.04,"stripedCoherence":0.3,"stripedAngleDeg":31,"cleanRmsM":18.42},{"seed":108,"cleanFineMax":0.02,"stripedCoherence":0.34,"stripedAngleDeg":30,"cleanRmsM":24.77}],"alpine":[{"d":[1,0,0],"maxPeakDb":13.47,"peakAt":"b16k h8","combDb":4.63,"beta1D":2.06},{"d":[0.6,0.8,0],"maxPeakDb":18.73,"peakAt":"b16k h16","combDb":7.62,"beta1D":2.07}]},"real":{"coarse":{"rows":[{"world":"Maithea","kind":"axis","belt":1,"blockMaxPeakDb":4.2,"blockAt":"block h4","blockCombDb":0.46,"nominal16kMaxPeakDb":4.1,"nominal16kCombDb":0.41,"maxLineDb":1.21,"beta1D":2.28,"overSyntheticThreshold":false},{"world":"Maithea","kind":"axis","belt":1,"blockMaxPeakDb":3.85,"blockAt":"block h6","blockCombDb":-0.58,"nominal16kMaxPeakDb":3.77,"nominal16kCombDb":0.5,"maxLineDb":1.06,"beta1D":2.29,"overSyntheticThreshold":false},{"world":"Maithea","kind":"flank","belt":0.99,"blockMaxPeakDb":2.91,"blockAt":"block h4","blockCombDb":0.42,"nominal16kMaxPeakDb":2,"nominal16kCombDb":-0.88,"maxLineDb":1.42,"beta1D":2.34,"overSyntheticThreshold":false},{"world":"Maithea","kind":"belt-end","belt":0.54,"blockMaxPeakDb":0.9,"blockAt":"block h11","blockCombDb":-1.18,"nominal16kMaxPeakDb":1.05,"nominal16kCombDb":-1.47,"maxLineDb":1.37,"beta1D":2.34,"overSyntheticThreshold":false},{"world":"Maithea","kind":"belt-end","belt":0.54,"blockMaxPeakDb":2.99,"blockAt":"block h12","blockCombDb":-0.83,"nominal16kMaxPeakDb":-0.16,"nominal16kCombDb":-2.34,"maxLineDb":2.02,"beta1D":2.45,"overSyntheticThreshold":false},{"world":"Maithea","kind":"outside","belt":0,"blockMaxPeakDb":8.65,"blockAt":"block h11","blockCombDb":1.86,"nominal16kMaxPeakDb":8.76,"nominal16kCombDb":2.38,"maxLineDb":1.7,"beta1D":3.3,"overSyntheticThreshold":false},{"world":"Selawyn","kind":"axis","belt":0.89,"blockMaxPeakDb":3.07,"blockAt":"block h8","blockCombDb":-0.8,"nominal16kMaxPeakDb":3.07,"nominal16kCombDb":-0.3,"maxLineDb":0.96,"beta1D":2.15,"overSyntheticThreshold":false},{"world":"Selawyn","kind":"axis","belt":1,"blockMaxPeakDb":2.93,"blockAt":"block h5","blockCombDb":-0.58,"nominal16kMaxPeakDb":2.34,"nominal16kCombDb":-0.21,"maxLineDb":0.95,"beta1D":2.19,"overSyntheticThreshold":false},{"world":"Selawyn","kind":"flank","belt":0.89,"blockMaxPeakDb":6.53,"blockAt":"block h1","blockCombDb":-0.16,"nominal16kMaxPeakDb":7.15,"nominal16kCombDb":1.35,"maxLineDb":1.25,"beta1D":2.16,"overSyntheticThreshold":false},{"world":"Selawyn","kind":"belt-end","belt":0.57,"blockMaxPeakDb":3.97,"blockAt":"block h9","blockCombDb":-0.19,"nominal16kMaxPeakDb":3.63,"nominal16kCombDb":-0.19,"maxLineDb":0.87,"beta1D":2.26,"overSyntheticThreshold":false},{"world":"Selawyn","kind":"belt-end","belt":0.51,"blockMaxPeakDb":2.55,"blockAt":"block h10","blockCombDb":0.35,"nominal16kMaxPeakDb":4.4,"nominal16kCombDb":1.32,"maxLineDb":1.63,"beta1D":2.13,"overSyntheticThreshold":false},{"world":"Selawyn","kind":"outside","belt":0,"blockMaxPeakDb":6.81,"blockAt":"block h4","blockCombDb":2.15,"nominal16kMaxPeakDb":6.21,"nominal16kCombDb":2.18,"maxLineDb":0.67,"beta1D":3.52,"overSyntheticThreshold":false},{"world":"Raiva","kind":"axis","belt":1,"blockMaxPeakDb":5.68,"blockAt":"block h2","blockCombDb":0.99,"nominal16kMaxPeakDb":3.41,"nominal16kCombDb":1.5,"maxLineDb":0.54,"beta1D":2.23,"overSyntheticThreshold":false},{"world":"Raiva","kind":"axis","belt":1,"blockMaxPeakDb":6.17,"blockAt":"block h2","blockCombDb":1.34,"nominal16kMaxPeakDb":5.64,"nominal16kCombDb":2.38,"maxLineDb":1.52,"beta1D":2.22,"overSyntheticThreshold":false},{"world":"Raiva","kind":"flank","belt":0.99,"blockMaxPeakDb":5.65,"blockAt":"block h8","blockCombDb":0.04,"nominal16kMaxPeakDb":5.65,"nominal16kCombDb":1.23,"maxLineDb":1.34,"beta1D":2.34,"overSyntheticThreshold":false},{"world":"Raiva","kind":"belt-end","belt":1,"blockMaxPeakDb":1.98,"blockAt":"block h10","blockCombDb":-0.8,"nominal16kMaxPeakDb":0.52,"nominal16kCombDb":-0.84,"maxLineDb":1.62,"beta1D":2.47,"overSyntheticThreshold":false},{"world":"Raiva","kind":"belt-end","belt":0.6,"blockMaxPeakDb":5.88,"blockAt":"block h13","blockCombDb":1.24,"nominal16kMaxPeakDb":6.57,"nominal16kCombDb":1.66,"maxLineDb":0.77,"beta1D":2.33,"overSyntheticThreshold":false},{"world":"Raiva","kind":"outside","belt":0,"blockMaxPeakDb":7.61,"blockAt":"block h1","blockCombDb":3.26,"nominal16kMaxPeakDb":4.34,"nominal16kCombDb":1.24,"maxLineDb":1.02,"beta1D":3.63,"overSyntheticThreshold":true},{"world":"Lethuris","kind":"axis","belt":0.52,"blockMaxPeakDb":4.37,"blockAt":"block h15","blockCombDb":0.38,"nominal16kMaxPeakDb":2.61,"nominal16kCombDb":0.43,"maxLineDb":0.7,"beta1D":2.21,"overSyntheticThreshold":false},{"world":"Lethuris","kind":"axis","belt":1,"blockMaxPeakDb":2.38,"blockAt":"block h12","blockCombDb":-0.57,"nominal16kMaxPeakDb":2.15,"nominal16kCombDb":-1.13,"maxLineDb":0.91,"beta1D":2.27,"overSyntheticThreshold":false},{"world":"Lethuris","kind":"flank","belt":0.52,"blockMaxPeakDb":3.97,"blockAt":"block h6","blockCombDb":0.05,"nominal16kMaxPeakDb":6.2,"nominal16kCombDb":0.86,"maxLineDb":1.05,"beta1D":2.19,"overSyntheticThreshold":false},{"world":"Lethuris","kind":"belt-end","belt":0.62,"blockMaxPeakDb":4.12,"blockAt":"block h10","blockCombDb":0.83,"nominal16kMaxPeakDb":3.32,"nominal16kCombDb":1.4,"maxLineDb":0.91,"beta1D":2.23,"overSyntheticThreshold":false},{"world":"Lethuris","kind":"belt-end","belt":0.79,"blockMaxPeakDb":5.95,"blockAt":"block h12","blockCombDb":0.86,"nominal16kMaxPeakDb":2.62,"nominal16kCombDb":0.12,"maxLineDb":1.34,"beta1D":2.84,"overSyntheticThreshold":false},{"world":"Lethuris","kind":"outside","belt":0,"blockMaxPeakDb":6.31,"blockAt":"block h4","blockCombDb":0.75,"nominal16kMaxPeakDb":2.29,"nominal16kCombDb":-0.23,"maxLineDb":1.13,"beta1D":3.64,"overSyntheticThreshold":false}],"pooledMassif":{"tiles":20,"blockCombDb":0.08,"nominal16kCombDb":0.35,"blockMaxPeakDb":1.11,"blockHarmonicsDb":[-1.03,1.11,0.54,0.46,-0.64,0.07,-0.71,1.04,0.07,0.07,0.46,0.36,-1.44,-1.24,0.87,0.15]}},"injected":{"rows":[{"world":"Maithea","kind":"axis","clean":[4.2,0.46],"sinusoid10pctPeakDb":11.47,"gutter2pctCombDb":0.68},{"world":"Maithea","kind":"axis","clean":[3.85,-0.58],"sinusoid10pctPeakDb":15.49,"gutter2pctCombDb":-0.43},{"world":"Maithea","kind":"flank","clean":[2.91,0.42],"sinusoid10pctPeakDb":6.44,"gutter2pctCombDb":0.96},{"world":"Maithea","kind":"belt-end","clean":[0.9,-1.18],"sinusoid10pctPeakDb":11.27,"gutter2pctCombDb":-0.65},{"world":"Maithea","kind":"belt-end","clean":[2.99,-0.83],"sinusoid10pctPeakDb":18.6,"gutter2pctCombDb":-0.77},{"world":"Selawyn","kind":"axis","clean":[3.07,-0.8],"sinusoid10pctPeakDb":14.66,"gutter2pctCombDb":-0.51},{"world":"Selawyn","kind":"axis","clean":[2.93,-0.58],"sinusoid10pctPeakDb":7.98,"gutter2pctCombDb":-0.14},{"world":"Selawyn","kind":"flank","clean":[6.53,-0.16],"sinusoid10pctPeakDb":20.61,"gutter2pctCombDb":0.28},{"world":"Selawyn","kind":"belt-end","clean":[3.97,-0.19],"sinusoid10pctPeakDb":6.41,"gutter2pctCombDb":-0.45},{"world":"Selawyn","kind":"belt-end","clean":[2.55,0.35],"sinusoid10pctPeakDb":13.46,"gutter2pctCombDb":0.27},{"world":"Raiva","kind":"axis","clean":[5.68,0.99],"sinusoid10pctPeakDb":16.1,"gutter2pctCombDb":1.03},{"world":"Raiva","kind":"axis","clean":[6.17,1.34],"sinusoid10pctPeakDb":18.59,"gutter2pctCombDb":2.07},{"world":"Raiva","kind":"flank","clean":[5.65,0.04],"sinusoid10pctPeakDb":12.93,"gutter2pctCombDb":1.21},{"world":"Raiva","kind":"belt-end","clean":[1.98,-0.8],"sinusoid10pctPeakDb":23.65,"gutter2pctCombDb":4.21},{"world":"Raiva","kind":"belt-end","clean":[5.88,1.24],"sinusoid10pctPeakDb":7.95,"gutter2pctCombDb":1.13},{"world":"Lethuris","kind":"axis","clean":[4.37,0.38],"sinusoid10pctPeakDb":10.01,"gutter2pctCombDb":0.56},{"world":"Lethuris","kind":"axis","clean":[2.38,-0.57],"sinusoid10pctPeakDb":14.42,"gutter2pctCombDb":-0.68},{"world":"Lethuris","kind":"flank","clean":[3.97,0.05],"sinusoid10pctPeakDb":12.47,"gutter2pctCombDb":0.13},{"world":"Lethuris","kind":"belt-end","clean":[4.12,0.83],"sinusoid10pctPeakDb":13.11,"gutter2pctCombDb":1.15},{"world":"Lethuris","kind":"belt-end","clean":[5.95,0.86],"sinusoid10pctPeakDb":23.92,"gutter2pctCombDb":4.63}],"sinusoidFires":"16/20","gutterFires":"2/20"},"fine":{"rows":[{"world":"Maithea","kind":"axis","massif":true,"latticePeakDb":[-1.53,-2.51,-1.65,-1.65],"latticeToneRmsM":[0,0,0,0],"gullyPeakDb":[4.41,-1.24],"rmsM":202.08,"coarseCoherence":{"400-800m":0.3,"800-1600m":0.34,"1600-3200m":0.26,"3200-6400m":0.14,"6400-12800m":0.21,"12800-25600m":0.47},"fineCoherence":{"100-200m":0.15,"200-400m":0.31,"400-800m":0.46,"800-1600m":0.4,"1600-3200m":0.07}},{"world":"Maithea","kind":"axis","massif":true,"latticePeakDb":[-0.18,2.45,-1.21,-0.7],"latticeToneRmsM":[0,0.02,0,0],"gullyPeakDb":[2.31,4.85],"rmsM":153.77,"coarseCoherence":{"400-800m":0.16,"800-1600m":0.35,"1600-3200m":0.28,"3200-6400m":0.1,"6400-12800m":0.11,"12800-25600m":0.2},"fineCoherence":{"100-200m":0.34,"200-400m":0.16,"400-800m":0.17,"800-1600m":0.41,"1600-3200m":0.26}},{"world":"Maithea","kind":"flank","massif":true,"latticePeakDb":[2.35,3.15,-0.52,-8.05],"latticeToneRmsM":[0.01,0.01,0,0],"gullyPeakDb":[-0.91,0.59],"rmsM":85.85,"coarseCoherence":{"400-800m":0.29,"800-1600m":0.32,"1600-3200m":0.28,"3200-6400m":0.3,"6400-12800m":0.21,"12800-25600m":0.63},"fineCoherence":{"100-200m":0.11,"200-400m":0.18,"400-800m":0.24,"800-1600m":0.28,"1600-3200m":0.45}},{"world":"Maithea","kind":"belt-end","massif":true,"latticePeakDb":[3.16,3.7,-2.97,-1.01],"latticeToneRmsM":[0.3,0.2,0,0],"gullyPeakDb":[2.65,0.79],"rmsM":261.48,"coarseCoherence":{"400-800m":0.36,"800-1600m":0.37,"1600-3200m":0.2,"3200-6400m":0.23,"6400-12800m":0.24,"12800-25600m":0.13},"fineCoherence":{"100-200m":0.17,"200-400m":0.23,"400-800m":0.25,"800-1600m":0.4,"1600-3200m":0.27}},{"world":"Maithea","kind":"belt-end","massif":true,"latticePeakDb":[-5.94,-4.13,1.46,1.73],"latticeToneRmsM":[0,0,0,0],"gullyPeakDb":[4.58,0.17],"rmsM":62.9,"coarseCoherence":{"400-800m":0.37,"800-1600m":0.34,"1600-3200m":0.23,"3200-6400m":0.14,"6400-12800m":0.06,"12800-25600m":0.12},"fineCoherence":{"100-200m":0.24,"200-400m":0.25,"400-800m":0.28,"800-1600m":0.41,"1600-3200m":0.11}},{"world":"Maithea","kind":"outside","massif":false,"latticePeakDb":[-1.33,-2.59,-0.4,-0.1],"latticeToneRmsM":[0,0,0,0],"gullyPeakDb":[1.79,0.25],"rmsM":68.53,"coarseCoherence":{"400-800m":0.14,"800-1600m":0.14,"1600-3200m":0.04,"3200-6400m":0.08,"6400-12800m":0.1,"12800-25600m":0.35},"fineCoherence":{"100-200m":0.16,"200-400m":0.1,"400-800m":0.14,"800-1600m":0.15,"1600-3200m":0.3}},{"world":"Selawyn","kind":"axis","massif":true,"latticePeakDb":[3,2.5,2.11,-4.5],"latticeToneRmsM":[0.44,0.23,0.13,0],"gullyPeakDb":[-2.88,0.98],"rmsM":233.15,"coarseCoherence":{"400-800m":0.22,"800-1600m":0.33,"1600-3200m":0.29,"3200-6400m":0.13,"6400-12800m":0.24,"12800-25600m":0.11},"fineCoherence":{"100-200m":0.13,"200-400m":0.14,"400-800m":0.12,"800-1600m":0.23,"1600-3200m":0.07}},{"world":"Selawyn","kind":"axis","massif":true,"latticePeakDb":[4.38,1.62,-1.95,-0.17],"latticeToneRmsM":[0.3,0.1,0,0],"gullyPeakDb":[1.12,3.13],"rmsM":253.65,"coarseCoherence":{"400-800m":0.35,"800-1600m":0.35,"1600-3200m":0.28,"3200-6400m":0.11,"6400-12800m":0.02,"12800-25600m":0.25},"fineCoherence":{"100-200m":0.06,"200-400m":0.16,"400-800m":0.27,"800-1600m":0.2,"1600-3200m":0.36}},{"world":"Selawyn","kind":"flank","massif":true,"latticePeakDb":[-2.82,-0.42,-3.09,-2.04],"latticeToneRmsM":[0,0,0,0],"gullyPeakDb":[1.93,-2.36],"rmsM":82.87,"coarseCoherence":{"400-800m":0.2,"800-1600m":0.35,"1600-3200m":0.35,"3200-6400m":0.27,"6400-12800m":0.28,"12800-25600m":0.52},"fineCoherence":{"100-200m":0.39,"200-400m":0.15,"400-800m":0.16,"800-1600m":0.28,"1600-3200m":0.18}},{"world":"Selawyn","kind":"belt-end","massif":true,"latticePeakDb":[3.54,3.74,-3.3,-1.54],"latticeToneRmsM":[0.32,0.16,0,0],"gullyPeakDb":[0.04,4.08],"rmsM":219.79,"coarseCoherence":{"400-800m":0.42,"800-1600m":0.35,"1600-3200m":0.35,"3200-6400m":0.2,"6400-12800m":0.38,"12800-25600m":0.17},"fineCoherence":{"100-200m":0.13,"200-400m":0.15,"400-800m":0.27,"800-1600m":0.39,"1600-3200m":0.17}},{"world":"Selawyn","kind":"belt-end","massif":true,"latticePeakDb":[5.41,0.67,1.78,2.73],"latticeToneRmsM":[0.51,0.09,0.1,0.14],"gullyPeakDb":[0.49,1.58],"rmsM":314.2,"coarseCoherence":{"400-800m":0.46,"800-1600m":0.37,"1600-3200m":0.3,"3200-6400m":0.26,"6400-12800m":0.17,"12800-25600m":0.28},"fineCoherence":{"100-200m":0.19,"200-400m":0.15,"400-800m":0.26,"800-1600m":0.28,"1600-3200m":0.3}},{"world":"Selawyn","kind":"outside","massif":false,"latticePeakDb":[1.3,-1.58,-1.83,0.48],"latticeToneRmsM":[0,0,0,0],"gullyPeakDb":[0.87,1.23],"rmsM":34.26,"coarseCoherence":{"400-800m":0.14,"800-1600m":0.24,"1600-3200m":0.24,"3200-6400m":0.33,"6400-12800m":0.2,"12800-25600m":0.39},"fineCoherence":{"100-200m":0.42,"200-400m":0.07,"400-800m":0.2,"800-1600m":0.52,"1600-3200m":0.43}},{"world":"Raiva","kind":"axis","massif":true,"latticePeakDb":[1.39,-3.4,3.52,0.08],"latticeToneRmsM":[0,0,0,0],"gullyPeakDb":[1.22,-1.16],"rmsM":75.45,"coarseCoherence":{"400-800m":0.4,"800-1600m":0.39,"1600-3200m":0.28,"3200-6400m":0.23,"6400-12800m":0.32,"12800-25600m":0.2},"fineCoherence":{"100-200m":0.27,"200-400m":0.23,"400-800m":0.44,"800-1600m":0.31,"1600-3200m":0.3}},{"world":"Raiva","kind":"axis","massif":true,"latticePeakDb":[5.37,-4.61,2.63,0.47],"latticeToneRmsM":[0.06,0,0.01,0],"gullyPeakDb":[-2.32,-0.96],"rmsM":108.77,"coarseCoherence":{"400-800m":0.25,"800-1600m":0.31,"1600-3200m":0.25,"3200-6400m":0.21,"6400-12800m":0.37,"12800-25600m":0.3},"fineCoherence":{"100-200m":0.32,"200-400m":0.34,"400-800m":0.36,"800-1600m":0.4,"1600-3200m":0.31}},{"world":"Raiva","kind":"flank","massif":true,"latticePeakDb":[-2.62,-6.01,0.06,0.67],"latticeToneRmsM":[0,0,0,0],"gullyPeakDb":[2.14,4.48],"rmsM":22.65,"coarseCoherence":{"400-800m":0.37,"800-1600m":0.36,"1600-3200m":0.26,"3200-6400m":0.16,"6400-12800m":0.44,"12800-25600m":0.75},"fineCoherence":{"100-200m":0.76,"200-400m":0.37,"400-800m":0.5,"800-1600m":0.64,"1600-3200m":0.44}},{"world":"Raiva","kind":"belt-end","massif":true,"latticePeakDb":[-3.19,-15.68,1.39,-1.58],"latticeToneRmsM":[0,0,0,0],"gullyPeakDb":[-1.34,1.17],"rmsM":19.96,"coarseCoherence":{"400-800m":0.36,"800-1600m":0.34,"1600-3200m":0.28,"3200-6400m":0.16,"6400-12800m":0.08,"12800-25600m":0.46},"fineCoherence":{"100-200m":0.36,"200-400m":0.23,"400-800m":0.34,"800-1600m":0.37,"1600-3200m":0.12}},{"world":"Raiva","kind":"belt-end","massif":true,"latticePeakDb":[2.26,2.44,-2.64,3.36],"latticeToneRmsM":[0.05,0.09,0,0.08],"gullyPeakDb":[3.51,0.81],"rmsM":170.84,"coarseCoherence":{"400-800m":0.31,"800-1600m":0.29,"1600-3200m":0.22,"3200-6400m":0.21,"6400-12800m":0.13,"12800-25600m":0.25},"fineCoherence":{"100-200m":0.24,"200-400m":0.17,"400-800m":0.16,"800-1600m":0.14,"1600-3200m":0.21}},{"world":"Raiva","kind":"outside","massif":false,"latticePeakDb":[-2.53,1.62,-1.54,3.34],"latticeToneRmsM":[0,0,0,0],"gullyPeakDb":[-0.08,-1.27],"rmsM":35.22,"coarseCoherence":{"400-800m":0.12,"800-1600m":0.16,"1600-3200m":0.14,"3200-6400m":0.26,"6400-12800m":0.44,"12800-25600m":0.78},"fineCoherence":{"100-200m":0.23,"200-400m":0.21,"400-800m":0.36,"800-1600m":0.37,"1600-3200m":0.5}},{"world":"Lethuris","kind":"axis","massif":true,"latticePeakDb":[8.02,1.24,-1.7,1.56],"latticeToneRmsM":[0.72,0.06,0,0.09],"gullyPeakDb":[3.88,1.07],"rmsM":325.18,"coarseCoherence":{"400-800m":0.27,"800-1600m":0.31,"1600-3200m":0.24,"3200-6400m":0.22,"6400-12800m":0.15,"12800-25600m":0.17},"fineCoherence":{"100-200m":0.24,"200-400m":0.21,"400-800m":0.3,"800-1600m":0.43,"1600-3200m":0.17}},{"world":"Lethuris","kind":"axis","massif":true,"latticePeakDb":[0.8,-1.92,1.13,-6.3],"latticeToneRmsM":[0.03,0,0.02,0],"gullyPeakDb":[6.11,4.01],"rmsM":164,"coarseCoherence":{"400-800m":0.36,"800-1600m":0.31,"1600-3200m":0.2,"3200-6400m":0.06,"6400-12800m":0.08,"12800-25600m":0.16},"fineCoherence":{"100-200m":0.22,"200-400m":0.26,"400-800m":0.3,"800-1600m":0.43,"1600-3200m":0.07}},{"world":"Lethuris","kind":"flank","massif":true,"latticePeakDb":[0.72,1.04,0.2,-0.61],"latticeToneRmsM":[0.04,0.01,0,0],"gullyPeakDb":[3.5,-0.14],"rmsM":157.98,"coarseCoherence":{"400-800m":0.27,"800-1600m":0.31,"1600-3200m":0.29,"3200-6400m":0.36,"6400-12800m":0.3,"12800-25600m":0.18},"fineCoherence":{"100-200m":0.6,"200-400m":0.5,"400-800m":0.62,"800-1600m":0.72,"1600-3200m":0.5}},{"world":"Lethuris","kind":"belt-end","massif":true,"latticePeakDb":[1.1,-0.54,-0.67,0.35],"latticeToneRmsM":[0.26,0,0,0.02],"gullyPeakDb":[0.7,5.12],"rmsM":263.83,"coarseCoherence":{"400-800m":0.33,"800-1600m":0.33,"1600-3200m":0.23,"3200-6400m":0.28,"6400-12800m":0.28,"12800-25600m":0.2},"fineCoherence":{"100-200m":0.15,"200-400m":0.13,"400-800m":0.36,"800-1600m":0.25,"1600-3200m":0.19}},{"world":"Lethuris","kind":"belt-end","massif":true,"latticePeakDb":[0.52,-4.21,0.56,-2.04],"latticeToneRmsM":[0,0,0,0],"gullyPeakDb":[-2.19,2.27],"rmsM":8.95,"coarseCoherence":{"400-800m":0.37,"800-1600m":0.24,"1600-3200m":0.21,"3200-6400m":0.09,"6400-12800m":0.08,"12800-25600m":0.2},"fineCoherence":{"100-200m":0.66,"200-400m":0.37,"400-800m":0.39,"800-1600m":0.32,"1600-3200m":0.4}},{"world":"Lethuris","kind":"outside","massif":false,"latticePeakDb":[-1.49,-3.42,0.74,1.2],"latticeToneRmsM":[0,0,0,0],"gullyPeakDb":[1.95,-1.79],"rmsM":27.78,"coarseCoherence":{"400-800m":0.05,"800-1600m":0.1,"1600-3200m":0.08,"3200-6400m":0.06,"6400-12800m":0.14,"12800-25600m":0.22},"fineCoherence":{"100-200m":0.89,"200-400m":0.66,"400-800m":0.67,"800-1600m":0.89,"1600-3200m":0.81}}],"pooledMassif":{"lattice-x":1.9,"lattice-y":-0.15,"lattice-d":0.76,"lattice-d2":-0.21,"gully-x":0.85,"gully-y":0.87},"pooledOffBelt":{"lattice-x":-1.12,"lattice-y":-3.13,"lattice-d":-0.66,"lattice-d2":1.58,"gully-x":-0.61,"gully-y":-1.98}},"latticePin":{"class":"HARD","pinDb":4.7,"tiles":20,"truth":{"per":{"lattice-x":1.9,"lattice-y":-0.15,"lattice-d":0.76,"lattice-d2":-0.21},"max":1.9},"triangleControl":{"per":{"lattice-x":7.84,"lattice-y":8.2,"lattice-d":8.83,"lattice-d2":8.88},"max":8.88},"gully":{"per":{"gully-x":1.24,"gully-y":1.05},"max":1.24},"INFO":{"rockOff":{"per":{"lattice-x":2.28,"lattice-y":-0.79,"lattice-d":0.58,"lattice-d2":0.12},"max":2.28},"rockAlone":{"per":{"lattice-x":2.44,"lattice-y":1.82,"lattice-d":1.07,"lattice-d2":-0.31},"max":2.44},"triangleWorkerBuilds":27}}}}
1454:✔ known-failures: valid HARD and CONTRACT entries pass validation (1.2555ms)
1474:✔ HARD: gateOnly / onlyFrom skip below their tier and run from it (fresh processes) (370.6968ms)
1488:✔ fine control: fineFractionToT/tToFineFraction round-trip and stay within era bounds (0.2952ms)
1504:✔ the game family library enables the mip-aware foliage cutoff only for sidecar MASK foliage (1.9583ms)
1522:✔ biosphereStateAt: a remnant star with the planet outside every habitable condition (condition 3) forces extinct even without engulfment (0.9504ms)
1538:✔ precise dates survive huge forward/backward seeks and serialization (1.3952ms)
1542:ℹ tests 771
1544:ℹ pass 755
1545:ℹ fail 1
1548:ℹ todo 4
1553:test at tests\acceptance\version-compat.test.mjs:335:1
1562:      at TestContext.<anonymous> (file:///C:/LLM/IWSDK/universe-atlas-wt/climate-m1/tests/acceptance/version-compat.test.mjs:348:10)
1564:      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7) {
1579:      at Test.processPendingSubtests (node:internal/test_runner/test:788:18)
1582:      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7) {
1592:✖ presentation continuity: no camera-visible rig is hard-dropped inside the 95 m exit on a 360-frame recede from the pre-M1 site (27649.8102ms) # FAUNA-NEAR-DROP: visible rig hard-dropped inside the 95 m exit (pre-existing on main; see docs/surface-climate-v2.md §6d)
1593:  AssertionError [ERR_ASSERTION]: camera-visible rigs hard-dropped inside 95 m
1617:      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7) {
1627:✖ rocky corpus (460): Spearman(g, R) < 0.95 (175.8218ms) # NOT MET by the specified model: measured 0.990 (density spread +-25% cannot decorrelate g from a 4.5x radius span; real rocky solar-system bodies also rank 1.0). An ice-mantle density for Ice worlds would give ~0.84 but changes Ice-world relief; left to the owner/P4.
1630:    assert.ok(spearman(g,c.map(b=>b.radiusM))<0.95)
1635:      at Test.processPendingSubtests (node:internal/test_runner/test:788:18)
1638:      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7) {
1653:      at Test.processPendingSubtests (node:internal/test_runner/test:788:18)
1656:      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7) {
rg: tests/climate-agreement*: IO error for operation on tests/climate-agreement*: Syntaksen i filnavnet, mappen eller diskenhedsnavnet er forkert. (os error 123)

const clamp01=(v:number)=>v<0?0:v>1?1:v;
/** Arithmetic smoothstep (no platform transcendental). */
const smooth=(x:number,lo:number,hi:number)=>{const t=clamp01((x-lo)/(hi-lo));return t*t*(3-2*t);};
    const snow=frozen?1:water>0?clamp01((C.PDD_CRIT-pdd0)/C.PDD_RAMP):0;
    const treeline=clamp01((warmest-C.T_TREE_WARMEST_K)/C.TREE_RAMP_K);
    out.aridity01=clamp01((0.5-eff)*4);
    const heat=annual>=C.HEAT_ANNUAL_MAX_K?0:1-smooth(warmest,C.HEAT_LO_K,C.HEAT_HI_K);
    out.forestSuitability01=habitat?treeline*clamp01((eff-C.FOREST_MOIST_LO)/C.FOREST_MOIST_RAMP)*clamp01(1-snow/0.2)*h
eat:0;
21: * G*massKg/R^2. CLIMATE_CALIBRATION is unchanged (its sha is unchanged).
33:export const CLIMATE_VERSION='surface-climate-2';
36: * Heuristic-v1 constants. A test pins sha256(JSON.stringify(CLIMATE_CALIBRATION)),
37: * so changing any value forces a CLIMATE_VERSION bump.
60:export const CLIMATE_CALIBRATION=Object.freeze({
80:const C=CLIMATE_CALIBRATION;
91:  version:typeof CLIMATE_VERSION;
161:function kernelAt(tab:Float64Array,v:number):number {
167:export function pddKernelH(v:number):number {return v<=-1?0:v>=1?v:kernelAt(H_TAB,v);}
169:export function pddKernelG(v:number):number {return v<=-1?0:v>=1?1:kernelAt(G_TAB,v);}
174:export function degreeDaysAbove(annualK:number,halfK:number,thresholdC:number):number {
223:/** Per-planet environmental lapse rate (K/m) from surface gravity; see CLIMATE_CALIBRATION. */
321:  return Object.freeze({version:CLIMATE_VERSION,anchorTempK:p.anchorTempK,obliquityRad,water:p.water,
test-results/climate-m1\full\golden-node.err
test-results/climate-m1\full\golden-node.json
test-results/climate-m1\timing\golden-node-after-inline.json
test-results/climate-m1\timing\golden-node-after-inline.err
test-results/climate-m1\timing\golden-compare.json


exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -Command '$j=Get-Content test-results/climate-m1/timing/identity.json -Raw|ConvertFrom-Json; Test-Path $j.dirA; if(Test-Path $j.dirA){git hash-object "$($j.dirA)/src/surface-climate.ts"; git rev-parse 3ab2eab:src/surface-climate.ts; git diff --no-index --stat "$($j.dirA)/src" src}; Get-FileHash test-results/climate-m1/full/golden-node.json,test-results/climate-m1/timing/golden-node-after-inline.json; rg -n --max-columns 200 '"'2000|266|corpus' scripts/climate-agreement-report.mjs; Get-Content test-results/climate-m1/timing/gate5-affected.log -TotalCount 8; "'$i=0;Get-Content test-results/climate-m1/timing/gate5-affected.log|ForEach-Object{$i++;if($i -ge 1542 -and $i -le 1556){'"'{0}: {1}' -f "'$i,$_}}; $i=0;Get-Content test-results/climate-m1/timing/gate5-targeted.log|ForEach-Object{$i++;if($i -ge 34 -and $i -le 48){'"'{0}: {1}' -f "'$i,$_}}; $i=0;Get-Content docs/surface-climate-v2.md|ForEach-Object{$i++;if($i -ge 625 -and $i -le 649){'"'{0}: {1}' -f "'$i,$_}}' in C:\LLM\IWSDK\universe-atlas-wt\climate-m1
 succeeded in 4638ms:
True
be40a2df70b77c69744303d9eb41b5f45d9e2497
be40a2df70b77c69744303d9eb41b5f45d9e2497
warning: in the working copy of 'src/forest-habitat.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-3ab2eab/src/instance-update-ranges.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-3ab2eab/src/leaf-transmission-lab.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/surface-climate.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-3ab2eab/src/tree-asset-lab.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-3ab2eab/src/tree-impostor-reference-lab.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-3ab2eab/src/tree-impostor-reference-shader.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-3ab2eab/src/tree-leaf-transmission.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-3ab2eab/src/tree-reference-lab.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-3ab2eab/src/vendor/three-ez-impostor/LICENSE', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-3ab2eab/src/vendor/three-ez-impostor/impostor-reference.d.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-3ab2eab/src/vendor/three-ez-impostor/impostor-reference.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-3ab2eab/src/vendor/three-ez-impostor/reference-manifest.json', LF will be replaced by CRLF the next time Git touches it
 .../br-3ab2eab/src => src}/surface-climate.ts      |   57 +-
 .../br-3ab2eab/src => src}/tree-asset.ts           | 1160 ++++++++++----------
 2 files changed, 623 insertions(+), 594 deletions(-)

Algorithm       Hash                                                                   Path
---------       ----                                                                   ----
SHA256          0B78CF7A5967F9C558486A906EAE47B370D9DADB59C30396E53A23537DB16E8D       C:\LLM\IWSDK\universe-atlas-wt\…
SHA256          0B78CF7A5967F9C558486A906EAE47B370D9DADB59C30396E53A23537DB16E8D       C:\LLM\IWSDK\universe-atlas-wt\…
rg: scripts/climate-agreement-report.mjs: IO error for operation on scripts/climate-agreement-report.mjs: Den angivne fil blev ikke fundet. (os error 2)
package.json: no forced full run (scripts.test appended 1 path(s))
Changed vs main:
docs/owner-decisions-2026-10-04.md
docs/surface-climate-v2.md
package.json
scripts/climate-calibration-report.mjs
src/forest-habitat.ts
src/surface-climate.ts
1542: ℹ tests 771
1543: ℹ suites 0
1544: ℹ pass 755
1545: ℹ fail 1
1546: ℹ cancelled 0
1547: ℹ skipped 11
1548: ℹ todo 4
1549: ℹ duration_ms 171440.9487
1550: 
1551: ✖ failing tests:
1552: 
1553: test at tests\acceptance\version-compat.test.mjs:335:1
1554: ✖ biome-climate model versions are pinned and part of the model manifest (4.986ms)
1555:   AssertionError [ERR_ASSERTION]: was surface-climate-1 (per-planet annual climate field); lapse gravity now from planet-geophysics
1556:   + actual - expected
34: ✔ the snow in the colour is surfaceClimate.snowFraction at that height (colour and classifier agree by construction) (6.9652ms)
35: ﹣ snow colour/classifier identity on the carved truth (test:full) (0.0694ms) # test:full only (T6 decision 3): truth snow identity solves M3 blocks
36: ✔ every non-water body keeps the base colour exactly (no climate path off water worlds) (821.5724ms)
37: ✔ climate zones read as distinct colours on Maithea (forest green, alpine meadow olive, snow white, dry tan) (48.0745ms)
38: ✔ PDD invariant: every Maithea land column with a warmest month below 271 K carries snow (decision 4) (51.8293ms)
39: ℹ {"fellThresholdK":271,"columns":22401,"snowFree":0,"minSnow":1,"maxPdd":0}
40: ✖ fell-field / rock colour: neutral grey-brown on snow-free cold columns (49.4413ms) # surface-climate-2 finding (decision 4): under PDD snow no snow-free fell band exists; the climate rock band in waterWorldLandColour is unreachable. Follow-up for the coordinator: retire the rock band, or redefine it on PDD in a later terrain-colour version.
41: ℹ tests 34
42: ℹ suites 0
43: ℹ pass 31
44: ℹ fail 0
45: ℹ cancelled 0
46: ℹ skipped 2
47: ℹ todo 1
48: ℹ duration_ms 1673.0099
625: | 2. Pins (`pins.json`, `golden-compare.json`) | The `CLIMATE_CALIBRATION` sha (f56bf8ab...) and the 10-body × 5000 determinism digest are identical on both trees. The golden `node-run.mjs` output is byte-identical to step 8 in every section, including climate, biomes, census, placeQuery and terrain. |
626: | 3. Allocation (`alloc-rounds.log`, 3 alternating rounds, 3M calls) | Branch **0.144 / 0.113 / 0.132 B per call, 0 GCs**. 3ab2eab measured 83.17 / 83.17 / 83.17 and main c6526d0 15.99 / 16.00 / 16.00. The no-op control measured 0.219-0.237 B per call. |
627: | 4. Speed (`ab-rounds.log`, 3 processes × 25 interleaved passes, fixed 3ab2eab against fixed 688129c) | Median 59.3 / 59.2 / 58.0 → 45.0 / 44.5 / 44.7 ns per sample. Ratios 0.759 / 0.752 / 0.770, median **0.759** (gate ≤ 1.05). The harness's own allocation check reads 83.22 → 0.16-0.17 B per call, and its negative control (+1 object per call) reads 48.3 B. Cold build per body: 0.709-0.714 → 0.634-0.649 ms. The first cold-JIT call takes 2.63-2.72 ms (gate ≤ 5 ms). |
628: | 5. Tests (`gate5-targeted.log`, `gate5-affected.log`) | surface-climate + climate-earth-reference + terrain-climate-colour: 34 tests, 31 pass, 0 fail, 2 skip, 1 todo. `test:affected` (95 files): 771 tests, 755 pass, 1 fail (`version-compat:335`, the expected pin), 11 skip, 4 todo. These are the step-8 counts. |
629: 
630: **The fixed bench check.** `tests/surface-climate.bench.mjs` now counts bytes from GC events over its 15 timed passes,
631: plus a no-op control sampler in the same loop shape. Each loop is its own function literal, so each call site stays
632: monomorphic.
633: 
634: - It passes when `surfaceClimate` allocates ≤ 20 B per call and the control < 1 B per call. A failing control makes
635:   the measurement invalid and fails the bench.
636: - The bench exits 1 when any pass entry is false.
637: - The old ">= 48 MB" comment is replaced by the scavenge blind-spot explanation.
638: - Gate (`bench-gate.log`, 2 alternating rounds): on 3ab2eab it reads **83.04 / 83.00 B per call, `allocation: false`,
639:   exit 1**; on the branch it reads **0.221 / 0.139 B per call, exit 0**. Controls read 0.30-0.35 B per call.
640: - Reference: main c6526d0 reads 19.82 / 19.80 B per call (14 GCs) in the bench loop. That passes, but only just. The
641:   bench's loop runs after the table build, and there main measures about 3.8 B more than in `alloc-diag` (16.0).
642: 
643: **Net.** The outputs are bit-identical to 3ab2eab. The branch now allocates about 0.1-0.2 B per sample, against
644: 83 before and 16-20 on main. It is about 24 % faster than 3ab2eab (gate 4). In the fixed bench, its best pass is 0.046 µs per sample against 0.099 µs on main.
645: 
646: **For the coordinator (decision-5 section 4).**
647: 
648: - New backlog item **PERF-ALLOC-AUDIT** (next round, medium):
649:   - audit every bench that claims "zero allocation" through a heap-growth check: the terrain sampler, the niche


exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -Command "rg --files scripts tests | Select-String 'climate-agreement'; rg -n --max-columns 200 '95|selected' test-results/climate-m1/timing/gate5-affected.log | Select-Object -First 4; "'$i=0;Get-Content src/surface-climate.ts|ForEach-Object{$i++;if(($i -ge 105 -and $i -le 140) -or ($i -ge 447 -and $i -le 500)){'"'{0}: {1}' -f "'$i,$_}}; Get-Content test-results/climate-m1/timing/stop-run.log -TotalCount 6; Get-Content test-results/climate-m1/timing/digest50k.mjs -TotalCount 36; git status --short' in C:\LLM\IWSDK\universe-atlas-wt\climate-m1
 succeeded in 1004ms:

tests\acceptance\climate-agreement.test.mjs
340:129 changed; 95 selected
341:[Omitted long matching line]
345:# Lethuris: land 22641, snow-labelled 2495, forestPotential 8582, partial snow 426
349:# Lethuris orbit 256x128: land 12668, snow-labelled 895
105:    * ZONAL_ROWS+1 rows. Do not mutate. */
106:   zonal:Float64Array; subsidence:Float64Array;
107:   provenance:ClimateProvenance;
108: }>;
109: 
110: export type ClimateSample={
111:   /** Annual-mean daily insolation relative to the planet's area mean (1 = global mean). */
112:   insolation01:number;
113:   /** Seasonal half-range of daily insolation, same units as insolation01. */
114:   insolationHalfRange:number;
115:   annualMeanTempK:number;
116:   seasonalHalfRangeK:number;
117:   warmestMonthK:number;
118:   coldestMonthK:number;
119:   legacyMoisture:number;
120:   dryBelt01:number;
121:   effectiveMoisture:number;
122:   aridity01:number;
123:   /** Positive degree-days above 0 C (C*d per year) of the sinusoidal year (surface-climate-2). */
124:   pdd:number;
125:   /** Annual precipitation index (mm/yr, surface-climate-2 heuristic; the climate grid multiplies it in M2). */
126:   precipMm:number;
127:   /** Potential evapotranspiration (mm/yr, Holdridge biotemperature x 58.93, floored at PET_MIN_MM). */
128:   petMm:number;
129:   snowFraction:number;
130:   treeline01:number;
131:   growingSeason01:number;
132:   forestSuitability01:number;
133:   climateCode:number;
134: };
135: export function createClimateSample():ClimateSample {
136:   return {insolation01:0,insolationHalfRange:0,annualMeanTempK:0,seasonalHalfRangeK:0,warmestMonthK:0,coldestMonthK:0,
137:     legacyMoisture:0,dryBelt01:0,effectiveMoisture:0,aridity01:0,pdd:0,precipMm:0,petMm:0,snowFraction:0,treeline01:0,growingSeason01:0,
138:     forestSuitability01:0,climateCode:0};
139: }
140: 
447:     const ex0=annual-273.15-0,ex30=annual-273.15-30;
448:     let pdd0:number,pdd30:number;
449:     if(half<1e-9){pdd0=ex0>0?ex0*C.YEAR_D:0;pdd30=ex30>0?ex30*C.YEAR_D:0;}
450:     else{
451:       const v0=ex0/half,v30=ex30/half;
452:       let h0:number,h30:number;
453:       if(v0<=-1)h0=0;else if(v0>=1)h0=v0;
454:       else{const kf=(v0+1)*(KERNEL_STEPS/2);let k=Math.floor(kf);if(k<0)k=0;else if(k>KERNEL_STEPS-1)k=KERNEL_STEPS-1;h0=H_TAB[k]!+(H_TAB[k+1]!-H_TAB[k]!)*(kf-k);}
455:       if(v30<=-1)h30=0;else if(v30>=1)h30=v30;
456:       else{const kf=(v30+1)*(KERNEL_STEPS/2);let k=Math.floor(kf);if(k<0)k=0;else if(k>KERNEL_STEPS-1)k=KERNEL_STEPS-1;h30=H_TAB[k]!+(H_TAB[k+1]!-H_TAB[k]!)*(kf-k);}
457:       pdd0=C.YEAR_D*half*h0;pdd30=C.YEAR_D*half*h30;
458:     }
459:     // Step 5: effective moisture from a precipitation / PET aridity index.
460:     // PET from Holdridge biotemperature (mean of the temperature clipped to 0..30 C):
461:     // biotemp = (PDD above 0 C - PDD above 30 C)/year.
462:     const biotemp=(pdd0-pdd30)/C.YEAR_D;
463:     let pet=C.PET_MM_PER_BIOTEMP_C*biotemp;if(pet<C.PET_MIN_MM)pet=C.PET_MIN_MM;
464:     let pTemp=1+C.P_TEMP_PER_K*(annual-C.P_TEMP_REF_K);if(pTemp<C.P_TEMP_MIN)pTemp=C.P_TEMP_MIN;
465:     const precip=pWater*pTemp*zf*(C.P_NOISE_BASE+C.P_NOISE_GAIN*moisture);
466:     const ai=precip/pet,eff=ai/(ai+C.AI_HALF);
467:     // snow = clamp01((PDD_CRIT - pdd0)/PDD_RAMP) on unfrozen wet bodies.
468:     let snow:number;
469:     if(frozen)snow=1;else if(water>0){const s=(C.PDD_CRIT-pdd0)/C.PDD_RAMP;snow=s<0?0:s>1?1:s;}else snow=0;
470:     const warmest=annual+half;
471:     const tl=(warmest-C.T_TREE_WARMEST_K)/C.TREE_RAMP_K,treeline=tl<0?0:tl>1?1:tl;
472:     // Fraction of the year above GROW_K: G((annual - GROW_K)/half), tabulated (pddKernelG).
473:     let grow:number;
474:     if(half<=1e-9)grow=annual>C.GROW_K?1:0;
475:     else{
476:       const vg=(annual-C.GROW_K)/half;
477:       if(vg<=-1)grow=0;else if(vg>=1)grow=1;
478:       else{const kf=(vg+1)*(KERNEL_STEPS/2);let k=Math.floor(kf);if(k<0)k=0;else if(k>KERNEL_STEPS-1)k=KERNEL_STEPS-1;grow=G_TAB[k]!+(G_TAB[k+1]!-G_TAB[k]!)*(kf-k);}
479:     }
480:     let tBin=Math.floor((annual-anchor+32)/2);if(tBin<0)tBin=0;else if(tBin>31)tBin=31;
481:     let mBin=Math.floor(eff*8);if(mBin<0)mBin=0;else if(mBin>7)mBin=7;
482:     out.insolation01=q;out.insolationHalfRange=qa;
483:     out.annualMeanTempK=annual;out.seasonalHalfRangeK=half;out.warmestMonthK=warmest;out.coldestMonthK=annual-half;
484:     out.legacyMoisture=moisture;out.dryBelt01=belt;out.effectiveMoisture=eff;out.precipMm=precip;out.petMm=pet;
485:     const ar=(0.5-eff)*4;
486:     out.aridity01=ar<0?0:ar>1?1:ar;
487:     out.pdd=pdd0;out.snowFraction=snow;out.treeline01=treeline;out.growingSeason01=grow;
488:     // Step 4: heat cap. Forest fades out between a 305 K and a 316 K warmest month
489:     // and is 0 wherever the annual mean reaches 320 K. 1 - smooth(warmest, HEAT_LO_K, HEAT_HI_K):
490:     let heat:number;
491:     if(annual>=C.HEAT_ANNUAL_MAX_K)heat=0;
492:     else{const hu=(warmest-C.HEAT_LO_K)/(C.HEAT_HI_K-C.HEAT_LO_K),ht=hu<0?0:hu>1?1:hu;heat=1-ht*ht*(3-2*ht);}
493:     if(habitat){
494:       const fm=(eff-C.FOREST_MOIST_LO)/C.FOREST_MOIST_RAMP,fs=1-snow/0.2;
495:       out.forestSuitability01=treeline*(fm<0?0:fm>1?1:fm)*(fs<0?0:fs>1?1:fs)*heat;
496:     }else out.forestSuitability01=0;
497:     out.climateCode=(tBin<<3)|mBin;
498:     return out;
499:   };
500: }
== stock bench, alternating main/branch, 3 rounds
-- round 1 main c6526d0
{"best":0.0922165000000001,"median":0.09463950000000011,"heapDuringLoop":563832,"heapAfterGc":1192,"tableBuildMsPerBody":0.6723599999999997,"niche":0.18969150000000012,"pass":{"surfaceClimate":true,"zeroHeapGrowth":true,"tableBuild":true,"nicheEvaluator":true}}
-- round 1 branch 3ab2eab
{"best":0.056554500000000014,"median":0.05752200000000016,"heapDuringLoop":884184,"heapAfterGc":888,"tableBuildMsPerBody":0.7645650000000004,"niche":0.18647899999999937,"pass":{"surfaceClimate":true,"zeroHeapGrowth":true,"tableBuild":true,"nicheEvaluator":true}}
-- round 2 main c6526d0
// decision-5 gate 2: the surface-climate.test 50k-sample determinism digest (10 bodies x 5000, DIGEST_SRC copied
// verbatim) and the CLIMATE_CALIBRATION sha, on the fixed 3ab2eab tree (A) and the inlined tree (B).
// node digest50k.mjs <dirA> <dirB>
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const [dirA, dirB] = process.argv.slice(2);
const u = (d, f) => pathToFileURL(`${d}/src/${f}`).href;
function climateDigest(SC,bodies,perBody){
  const out={};
  for(const b of bodies){
    const s=SC.surfaceClimate(SC.climateForcingFor(b)),o=SC.createClimateSample(),buf=new Float64Array(perBody*18);
    for(let i=0;i<perBody;i++){
      const y=1-2*(i+.5)/perBody,p=i*2.399963229728653,r=Math.sqrt(1-y*y),h=((i*7919)%12000)-1000;
      s([Math.cos(p)*r,y,Math.sin(p)*r],h,o);
      const v=[o.insolation01,o.insolationHalfRange,o.annualMeanTempK,o.seasonalHalfRangeK,o.warmestMonthK,o.coldestMonthK,o.legacyMoisture,o.dryBelt01,o.effectiveMoisture,o.aridity01,o.snowFraction,o.treeline01,o.growingSeason01,o.forestSuitability01,o.climateCode,o.pdd,o.precipMm,o.petMm];
      buf.set(v,i*18);
    }
    out[b.id]=createHash('sha256').update(Buffer.from(buf.buffer)).digest('hex');
  }
  return out;
}
const res = {};
for (const [k, dir] of [['A_3ab2eab', dirA], ['B_inlined', dirB]]) {
  const SC = await import(u(dir, 'surface-climate.ts'));
  const {galaxies, refByAddress, sector, system} = await import(u(dir, 'catalog.ts'));
  const g = galaxies('LETHRA-001')[0], bodies = [system(refByAddress(g, 'G001/C2128,0,1/0')).planets[1]];
  for (const ref of sector(g, [266, 0, 0]).refs) { for (const b of system(ref).planets) if (SC.temperateHabitat(b) && bodies.length < 10 && !bodies.some(x => x.id === b.id)) bodies.push(b); if (bodies.length >= 10) break; }
  res[k] = {calibrationSha: createHash('sha256').update(JSON.stringify(SC.CLIMATE_CALIBRATION)).digest('hex'), version: SC.CLIMATE_VERSION, digest50k: climateDigest(SC, bodies, 5000)};
}
res.calibrationShaPinned = 'f56bf8ab95a9d0fc965e3ba9a0fc693ca8e1c301e75497e456bb5a103dddce6e';
res.pass = res.A_3ab2eab.calibrationSha === res.calibrationShaPinned && res.B_inlined.calibrationSha === res.calibrationShaPinned && res.A_3ab2eab.version === res.B_inlined.version && JSON.stringify(res.A_3ab2eab.digest50k) === JSON.stringify(res.B_inlined.digest50k);
console.log(JSON.stringify(res, null, 1));


exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -Command "rg -n '2000|266|temperateHabitat|corpus|systems' tests/acceptance/climate-agreement.test.mjs | Select-Object -First 24; git diff --name-only 3ab2eab..HEAD -- src; rg -n 'halfZero|Every inlined branch' docs/surface-climate-v2.md; git branch --show-current" in C:\LLM\IWSDK\universe-atlas-wt\climate-m1
 succeeded in 1693ms:
20:import { climateForcingFor, createClimateSample, surfaceClimate, temperateHabitat, CLIMATE_VERSION } from '../../src/surface-climate.ts';
29:const N = 20000;
94:// W0-CLIMATE definition (temperate-habitat bodies of the first 2000 systems from sector x = 266 of LETHRA-001,
100:test('polar ITCZ: every judged corpus planet is wetter near the ITCZ than 18-35 deg from it (shipped belt fails)', t => {
105:  const corpus = []; let systems = 0;
106:  for (let sx = 266; systems < 2000; sx++) for (const ref of sector(g0, [sx, 0, 0]).refs) {
107:    if (systems >= 2000) break; systems++;
108:    for (const b of system(ref).planets) if (temperateHabitat(b)) corpus.push(b);
111:  for (const b of corpus) {
131:  t.diagnostic(JSON.stringify({ corpus: corpus.length, selected, judged, fails: fails.length, shippedFails }));
src/surface-climate.ts
624:| 1. Identity (`identity.mjs` → `identity.json`) | **0 differences.** Pinned sets: 200k Fibonacci directions × the alloc-diag heights on Maithea, Selawyn, Raiva, Lethuris and the Earth reference, plus the first 50 climate-agreement corpus bodies × 8k directions at two height patterns. That is 1.8M samples × 18 fields = 32.4M `Object.is` comparisons against 3ab2eab. Adding extra branch-coverage sets (Earth at obliquity 0 and 70 deg, water 0, 230 K, 330 K, and 50 non-temperate planets) gives 2.4M samples / 43.2M comparisons, still 0 differences. Every inlined branch was reached: half = 0 on 70,825 samples, snow interior on 22,150, heat-ramp interior on 194,609. |
climate/m1

codex
VERDICT: APPROVE

MUST-FIX: None.

SHOULD:

1. `docs/surface-climate-v2.md:624`: Replace “Every inlined branch was reached” with “The recorded output categories were exercised.” `identity.mjs:29–36` tallies outputs, not executed branches; it does not establish coverage of index clamps, exact thresholds, or NaN paths.
2. `test-results/climate-m1/timing/identity.mjs:15–23,74`: Harden future runs by rejecting identical resolved module paths, recording source hashes, asserting both field sets and expected sample counts, and exiting nonzero on differences. The recorded run is non-vacuous, but the harness does not enforce that.
3. `tests/surface-climate.bench.mjs:43–52`: Describe the measurement as a conservative allocation estimate, and replace “proves … allocates nothing” with “checks loop overhead stays below 1 B/call.” Clamping negative growth and including profiler/report overhead makes this an upper estimate; the control does not prove identical optimization.

Notes:

- **Bit identity:** `src/surface-climate.ts:447–457,469–495` matches the baseline helpers, retained at current lines 161–178. It preserves left-associated `C.YEAR_D*half*h`, interpolation arithmetic, `<1e-9` versus `<=1e-9`, endpoint comparisons, index clamps, smoothstep grouping, NaN propagation and signed-zero behavior. Snow, heat and habitat branches retain relevant lazy evaluation. Independent pure calculations are interleaved differently, without changing rounding or observable results.
- **Scope:** The only source change outside the sampler is removal of private `clamp01`/`smooth` definitions (baseline lines 141–143). All their callers were replaced. Exported helpers, `noise()`, calibration and version remain unchanged.
- **Identity evidence:** `identity.mjs:38–67` compares all 18 fields with `Object.is`, using separate samplers and outputs and the specified pinned sets. `identity.json:2–3` identifies different trees; I independently verified the exported A sampler’s Git blob equals `3ab2eab`. Lines 687–694 record 43.2M total / 32.4M pinned comparisons, zero differences. `pins.json:2–35` agrees across both trees. The two saved golden outputs also have identical SHA-256 hashes; `golden-compare.json:1` correctly distinguishes unchanged step-8 output from outstanding committed-golden differences.
- **Bench:** `tests/surface-climate.bench.mjs:45–64` counts GC-freed bytes plus nonnegative net growth over 3M calls. The separate warmed control loop retains observable accumulation; its simpler sampler can optimize differently, but this does not invalidate the overhead check. Profiler startup/stop lie outside individual timers; GC profiling during passes can add overhead. Independent unprofiled A/B timing exists at `ab-harness.mjs:68–79`. Thresholds and failing-control exit behavior are correct at bench lines 82–94. The scavenge explanation is sound.
- **Recorded gates:** `bench-gate.log:11,41,52,82,134,164,175,205` confirms baseline allocation failure/exit 1 and branch success/exit 0 twice. Gates 3–5 numbers match section 8: `alloc-rounds.log:2–30`, `ab-rounds.log:2–18`, `gate5-targeted.log:41–47`, and `gate5-affected.log:340,1542–1554`. The 2.63–2.72 ms cold-JIT range refers to the branch. Commit `0225e93`’s 48.26 B negative-control figure represents one round; the three values span 48.261–48.271, immaterial to the gate.

No tests or benchmarks were run; no files were changed.
tokens used
67.999
VERDICT: APPROVE

MUST-FIX: None.

SHOULD:

1. `docs/surface-climate-v2.md:624`: Replace “Every inlined branch was reached” with “The recorded output categories were exercised.” `identity.mjs:29–36` tallies outputs, not executed branches; it does not establish coverage of index clamps, exact thresholds, or NaN paths.
2. `test-results/climate-m1/timing/identity.mjs:15–23,74`: Harden future runs by rejecting identical resolved module paths, recording source hashes, asserting both field sets and expected sample counts, and exiting nonzero on differences. The recorded run is non-vacuous, but the harness does not enforce that.
3. `tests/surface-climate.bench.mjs:43–52`: Describe the measurement as a conservative allocation estimate, and replace “proves … allocates nothing” with “checks loop overhead stays below 1 B/call.” Clamping negative growth and including profiler/report overhead makes this an upper estimate; the control does not prove identical optimization.

Notes:

- **Bit identity:** `src/surface-climate.ts:447–457,469–495` matches the baseline helpers, retained at current lines 161–178. It preserves left-associated `C.YEAR_D*half*h`, interpolation arithmetic, `<1e-9` versus `<=1e-9`, endpoint comparisons, index clamps, smoothstep grouping, NaN propagation and signed-zero behavior. Snow, heat and habitat branches retain relevant lazy evaluation. Independent pure calculations are interleaved differently, without changing rounding or observable results.
- **Scope:** The only source change outside the sampler is removal of private `clamp01`/`smooth` definitions (baseline lines 141–143). All their callers were replaced. Exported helpers, `noise()`, calibration and version remain unchanged.
- **Identity evidence:** `identity.mjs:38–67` compares all 18 fields with `Object.is`, using separate samplers and outputs and the specified pinned sets. `identity.json:2–3` identifies different trees; I independently verified the exported A sampler’s Git blob equals `3ab2eab`. Lines 687–694 record 43.2M total / 32.4M pinned comparisons, zero differences. `pins.json:2–35` agrees across both trees. The two saved golden outputs also have identical SHA-256 hashes; `golden-compare.json:1` correctly distinguishes unchanged step-8 output from outstanding committed-golden differences.
- **Bench:** `tests/surface-climate.bench.mjs:45–64` counts GC-freed bytes plus nonnegative net growth over 3M calls. The separate warmed control loop retains observable accumulation; its simpler sampler can optimize differently, but this does not invalidate the overhead check. Profiler startup/stop lie outside individual timers; GC profiling during passes can add overhead. Independent unprofiled A/B timing exists at `ab-harness.mjs:68–79`. Thresholds and failing-control exit behavior are correct at bench lines 82–94. The scavenge explanation is sound.
- **Recorded gates:** `bench-gate.log:11,41,52,82,134,164,175,205` confirms baseline allocation failure/exit 1 and branch success/exit 0 twice. Gates 3–5 numbers match section 8: `alloc-rounds.log:2–30`, `ab-rounds.log:2–18`, `gate5-targeted.log:41–47`, and `gate5-affected.log:340,1542–1554`. The 2.63–2.72 ms cold-JIT range refers to the branch. Commit `0225e93`’s 48.26 B negative-control figure represents one round; the three values span 48.261–48.271, immaterial to the gate.

No tests or benchmarks were run; no files were changed.
