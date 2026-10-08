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
