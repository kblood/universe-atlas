The +10% same-code residual target was not reached. Only the relief-composition split remains in production code. All four final against-main comparisons stay below +10%; see exact per-level results below. These are unofficial, sequential local measurements, not the coordinator's CPU-quiet slot.

Changed production file:

- src/terrain.ts — moves the existing relief block into a separate closure with one private scratch object per core. The caller immediately copies its four numeric fields. Arithmetic, branches, M1/M2/M3 implementations, public outputs, defaults, versions and budgets are unchanged. The retained candidate improves the measured aggregate residual but does not establish a per-level budget pass.

Before = official round-1 files official-residual-vs-staged.json and official-after-contract.json; after = fix-residual.json and fix-vs-main.json. Same contract-build-bench.mjs, five rounds, fresh process per world/comparison. The staging copy was refreshed after each source change before benchmarking. The shell policy rejected forced recursive deletion; normal PowerShell recursive deletion of the verified staging directory succeeded, producing the same fresh source copy. No benchmark protocol or test expectations were edited.

| World | Residual mean before → after | Residual maximum before → after | Against-main maximum after |
|---|---:|---:|---:|
| Maithea | +26.582% → +24.894% | +31.942% → +30.666% | +6.718% |
| Selawyn | +25.743% → +24.004% | +32.554% → +30.099% | +5.260% |
| Raiva | +23.297% → +19.678% | +26.495% → +26.494% | +2.197% |
| Lethuris | +23.029% → +22.436% | +27.219% → +30.448% | +8.638% |

| World | Level | Residual before → after | Against main before → after |
|---|---:|---:|---:|
| Maithea | L0 | +19.482% → +23.041% | +5.480% → -1.571% |
| Maithea | L1 | +26.729% → +29.777% | +1.298% → +6.718% |
| Maithea | L2 | +24.585% → +19.900% | +2.340% → +2.625% |
| Maithea | L3 | +26.671% → +22.133% | -3.362% → +0.300% |
| Maithea | L4 | +31.942% → +23.849% | +0.001% → +2.073% |
| Maithea | L5 | +30.087% → +30.666% | +1.585% → +3.184% |
| Selawyn | L0 | +19.670% → +18.687% | -3.604% → -2.305% |
| Selawyn | L1 | +30.319% → +22.487% | +2.239% → +1.187% |
| Selawyn | L2 | +21.956% → +19.233% | -0.453% → -1.590% |
| Selawyn | L3 | +32.554% → +24.830% | -3.932% → +5.260% |
| Selawyn | L4 | +31.150% → +28.388% | +1.569% → +0.553% |
| Selawyn | L5 | +21.858% → +30.099% | -1.252% → +2.407% |
| Selawyn | L6 | +22.696% → +24.303% | +0.760% → -0.620% |
| Raiva | L0 | +20.003% → +6.833% | -3.505% → -4.549% |
| Raiva | L1 | +26.495% → +22.131% | -2.810% → +2.197% |
| Raiva | L2 | +21.421% → +20.659% | -1.285% → +0.194% |
| Raiva | L3 | +24.565% → +22.274% | -6.227% → -4.594% |
| Raiva | L4 | +24.001% → +26.494% | -1.009% → -2.085% |
| Lethuris | L0 | +16.815% → +17.142% | -0.074% → -4.916% |
| Lethuris | L1 | +25.790% → +19.168% | -0.906% → +7.594% |
| Lethuris | L2 | +21.081% → +22.755% | -6.164% → +6.403% |
| Lethuris | L3 | +24.428% → +21.641% | -4.883% → +7.181% |
| Lethuris | L4 | +25.796% → +30.448% | -5.830% → +8.638% |
| Lethuris | L5 | +27.219% → +21.141% | -5.082% → +5.096% |
| Lethuris | L6 | +20.070% → +24.759% | -7.066% → -0.688% |

JSON artifacts preserve the full-precision means, medians and growth values; tables round percentages to three decimals. The before/after runs have different machine-load conditions, so small differences are not official acceptance evidence.

V8 investigation:

- Node v24.7.0. fix-trace-before.log records the original on-only branch arm; fix-trace-mixed.log records main/off/on. In the on-only trace V8 inlines massifBeltSample into the terrain sample, and sampleWithinWithA0/reset into the mountain wrapper. The mixed trace considers the wrapper but does not inline it into sample. Both traces show warm-up map and call-target deoptimizations; they do not establish a sustained deoptimization loop as the cause.
- The retained split keeps the complete relief calculation in reliefHeight, beyond the inlining size limit, without dummy work or engine-specific production flags. The final trace explicitly refuses to inline reliefHeight (reason 5). It also shows repeated completed TurboFan optimizations for distinct sample closures; the two sample function identities have 3 and 9 recorded completions. This is evidence of differing compilation behavior, not proof of one specific root cause.
- In the retained-code profile, core sample self time is 1,535 ms on versus 641 ms off; macroHeightCode is 539 versus 308 ms, reliefHeight 333 versus 270 ms, and bandTag is 174 ms on. Both graphs reach TurboFan. These totals include warm-up and tracing overhead and must not replace the uninstrumented final timing tables. See fix-final-trace.log and fix-final-profile.txt.
- The experimental isolated-noise profile (fix-noise-profile.txt) still attributed 1,341 ms to the on core sample versus 598 ms off, while noise was 2,018 versus 2,080 ms and reliefHeight 322 versus 271 ms. This profile includes warm-up, including M3, and is diagnostic rather than contract timing. It shows why attributing the remaining gap solely to M1/M2 arithmetic is unsupported. Isolation helped Raiva once but not Maithea and was discarded.
- The exact remaining compiler cause is unresolved. Moving relief reduced some measured overhead, but the on-only core still runs materially more slowly than the same-code off core. Neither blocking the M1 wrapper's inlining, removing internal result allocations, stabilizing numeric fields, nor stabilizing noise closure targets consistently removed the gap. The evidence does not justify claiming the target is solved.

Experiments (all measurements use the unchanged contract harness; ranges cover all coarse levels tested):

| Experiment | Maithea residual range | Raiva residual range |
|---|---:|---:|
| Small mountain helper | +21.133% to +23.800% | not run |
| Separate shared base-height calculation | +22.574% to +31.856% | not run |
| Merge band rejection and flagged solve | +22.953% to +27.627% | +16.357% to +27.648% |
| Dedicated uncarved M2 evaluator | +22.955% to +28.772% | +21.293% to +25.977% |
| Isolated copy of noise kernels plus relief split | +15.327% to +24.857% | -0.481% to +7.310% |
| Force numeric CoreSample field representations | +21.105% to +27.815% | +17.232% to +23.821% |
| Memoize seeded noise closures | +19.952% to +28.679% | +21.497% to +25.630% |
| Explicit terrain-core context | +22.530% to +31.849% | +19.325% to +26.491% |
| Reuse internal CoreSample and snapshot caller fields | +19.834% to +35.326% | +15.062% to +24.121% |
| Retained relief split, initial candidate run | +16.853% to +24.616% | +12.518% to +18.143% |

Every rejected production edit and its source-rewriting helper was removed. M2 helpers allocate no objects in the existing code; M1 reset/finish already mutate a scratch sample. Carving-strip objects are on the carved path, so removing them would not improve the measured coarse path. The separate coarse evaluator showed no win and was removed. No per-block rejection change was retained.

Checks (exact requested commands):

```text
npx tsc --noEmit -p .
node --test tests/lod-carving-reduction.test.mjs tests/mountain-layout.test.mjs tests/mountain-layout-grid.test.mjs tests/mountain-envelope.test.mjs tests/mountain-carving.test.mjs tests/mountain-carving-pin.test.mjs tests/terrain-mountains-assembly.test.mjs tests/terrain-elevation-identity.test.mjs tests/lod-consistency.test.mjs tests/planet.test.mjs
node test-results/mountains/t3/opt-identity.mjs test-results/mountains/t3/fix-identity-after.json
```

All three exited 0; 91/91 tests passed, including unchanged COST_IDENTITY and COST_SAMPLER_IDENTITY guards and M1/M2/M3 pins. The before/after identity JSON files are byte-identical, SHA-256 04a771608ab373a6a764110433e8ef20a76113785cde985ddd2c1664e05df3af. fix-default-identity.mjs additionally compares default sampler outputs at truth and L0–L22 (with/without exposed floor), and complete default tile digests through cut+2, directly against read-only main. See fix-default-identity.json/log.

Recorded exit codes:

```text
tsc=0
tests=0
identity=0
residual Maithea=0
vs-main Maithea=0
residual Raiva=0
vs-main Raiva=0
residual Selawyn=0
vs-main Selawyn=0
residual Lethuris=0
vs-main Lethuris=0
default-identity=0
final-profile=0
```

Not run: official coordinator CPU-quiet measurements, browser/headset validation, or the full repository test suite. No requested check was skipped. No installs, downloads, network access, commits, .git writes, or main-checkout writes. The disposable staged-off directory was deleted at completion.

New evidence files (all under test-results/mountains/t3; ignored by the existing test-results ignore rule, not staged):

- fix-base.json
- fix-check-exits.log
- fix-coarse.json
- fix-context.json
- fix-default-identity.json
- fix-default-identity.log
- fix-default-identity.mjs
- fix-double.json
- fix-final-benches.ps1
- fix-final-profile.json
- fix-final-profile.txt
- fix-final-trace.log
- fix-final.cpuprofile
- fix-helper.json
- fix-identity-after.json
- fix-identity-after.log
- fix-identity-equality.log
- fix-layout.json
- fix-noise-profile.json
- fix-noise-profile.txt
- fix-noise-trace.log
- fix-noise.cpuprofile
- fix-noise.json
- fix-profile-summary.mjs
- fix-relief.json
- fix-report.mjs
- fix-residual-Lethuris.log
- fix-residual-Maithea.log
- fix-residual-Raiva.log
- fix-residual-Selawyn.log
- fix-residual.json
- fix-scratch.json
- fix-stable-noise.json
- fix-tables.log
- fix-tests.log
- fix-trace-before.log
- fix-trace-mixed.log
- fix-tsc.log
- fix-vs-main-Lethuris.log
- fix-vs-main-Maithea.log
- fix-vs-main-Raiva.log
- fix-vs-main-Selawyn.log
- fix-vs-main.json
- fix-report.md — this report.
