# DRAFT: shorter fair cost protocol (O13: F2 sequential stopping, F1 rounds reallocation) — for Kasper's signature

**Status: DRAFT, NOT IN FORCE, NOT IMPLEMENTED.** Drafted by agent C (Opus 5.5) on 2026-10-07 from
`docs/fable-test-review-2026-10-07.md` (O13, "Protocol change: needs Kasper's signed pre-registration") and the audit
findings F1 and F2 (`docs/handoff-2026-10-06/test-time-audit.md`). Until Kasper signs section 6, C1 and the orbit
bake are judged by decisions addendum (6) Q-A exactly as it stands (`docs/mountains-opus-decisions-2026-10-05.md`),
run by the O5 harness (`docs/cost-fair-harness-2026-10-07.md`, addendum (7)). Nothing below may be applied to a run
that has already started, or chosen after looking at any of its records.

## 1. Why

GATE-1 (`docs/quiet-window-2026-10-07.md`) took 127 min for 480 processes. O5 removes the idle waits and the
per-process slot races (~45-55 min) without touching the counted protocol. What is left is the protocol itself:

- **F1.** C1 spends about 90 % of each process on the region passes (8 sites x 385² = 1,185,800 samples, 5 warm rounds
  per arm), while the verdict's spread comes from the outside term: with s = 1.1-2.3 %, `weighted` equals
  `outsideOverhead` to within about 0.1 pp per process, and the outside term is timed over five ~10 ms windows.
- **F2.** A fixed n = 30 runs every world to the end even when its confidence interval cleared the budget at n = 10
  or 20 (retrospective check on the addendum (6) data: C1 cleared at 10-20 on every world).

Expected saving: F1 about -23 min, F2 about -17..-23 min per run; together about 20-45 min per gate (review table).

## 2. Proposed change F1: C1 rounds reallocation (quantity unchanged)

- Same arms, same point sets (`c1-points.mjs`, cached by REF sha), same share s, same statistic
  `weighted = (s·Bin + (1−s)·Bout) / (s·Ain + (1−s)·Aout) − 1` from per-arm medians of rounds.
- **Region:** 1 cold pass (unmeasured warm-up, block-build count recorded) + **2** warm rounds per arm (was 5), arm order
  alternating per round. Sites stay 8 (the 4-site option of the audit is NOT proposed: it changes the point set).
- **Outside:** **200** rounds per arm (was 5), arm order alternating per round, after one unmeasured warm-up pass.
- The "0 rebuilds while warm" assert stays.
- Orbit is unchanged (7 rounds; it is not region-dominated).
- **Admission trial (required before first use, not counted):** one A/A run, 4 worlds x 10 processes, under the new
  allocation. Adopt F1 only if (a) every A/A CI contains 0 and (b) the per-process SD of `weighted` is not larger than
  under the old allocation on the addendum (6) / GATE-1 A/A data. If either fails, F1 is dropped and the old allocation
  stays; the trial result is recorded either way.
- Implementation would be a new script `c1-ab-v2.mjs` (the old one stays for reproducing earlier runs) and a
  `C1_ALLOC=v2` switch in `run.sh` recorded in `protocol.txt`.

## 3. Proposed change F2: pre-registered sequential stopping

- **Looks** after iterations n = 10, 20 and 30 only (all four kinds of a world have exactly n records at a look).
  Maximum n stays 30.
- **Per-look CI:** distribution-free order-statistic CI of the median at two-sided α = 0.05/3 = 0.0167 (Bonferroni over
  the three looks): ranks (1, 10) at n = 10, (5, 16) at n = 20, (9, 22) at n = 30 (achieved α 0.002 / 0.012 / 0.016).
- **Per world and metric** (C1 budget 8 %, orbit 5 %), with AB = the A/B CI, AA = the A/A CI at the same look:
  - **Stop MET** when `upper(AB) + max(0, −lower(AA)) <= budget`. The A/A term conservatively covers a negative A/A
    bias that could be demonstrated later.
  - **Stop NOT MET** when `lower(AB) − max(0, upper(AA)) > budget`.
  - Otherwise continue to the next look. At n = 30 the addendum (6) judging rule applies unchanged (95 % CI, ranks 10
    and 21; A/A correction only if demonstrated), so a run that never stops early is judged exactly as today.
- A world stops only when **both** its metrics have stopped (C1 and orbit share the iteration; a world's four kinds are
  never split). A stopped world drops out of later iterations; the interleaving order of the remaining worlds is kept.
- Every look, its CIs and each world's stop look are recorded in `analysis.json`; all records up to the stop count;
  nothing after a stop is run, so nothing is dropped.
- **Resume interaction:** a look is evaluated only on complete iterations; the O5 resume rule (a finished record is
  never re-run, an interrupted one is re-run at its position, a failed one is not re-run) is unchanged.
- Implementation would be: `analyze.mjs` `ciRanks(n, alpha)`, a `look` mode that writes `OUT/stops.json`, and `run.sh`
  skipping stopped worlds after iterations 10 and 20 when `SEQ=f2` is recorded in `protocol.txt`.

## 4. Risks

- **Ad hoc use is the main risk** (review: "High if ad hoc"). The looks, α and rules are fixed here; changing any of
  them after a run has started voids that run.
- F2 is conservative: it stops less often than the uncorrected rule would (audit: C1 Maithea and Raiva would not stop
  at 10 because of their A/A lower bounds). The saving estimate (17-23 min) already assumes that.
- F1 can change JIT tiering between the outside and region loops; the admission trial is there to catch that. It cannot
  show whether between-process noise (code placement, ASLR) dominates; only the spread of a real run will.
- Combined F1 + F2 is adopted only if F1 passes its admission trial; F2 alone is valid without F1.

## 5. What does NOT change

Budgets (C1 +8 %, orbit +5 %), arms and their preparation, point selection, the A/A control and its interleaving,
alternating first arm, one slot level per batch, the O5 pre-check (flag, never drop), every run counts, and the
n = 30 judging rule when no early stop happens.

## 6. Signature

- [ ] F1 adopted (subject to its admission trial)  - [ ] F2 adopted  - [x] both  - [ ] neither

Signed: Kasper (in chat to the coordinator: "det lyder godt, det er ok", answering "O13 ... kræver din underskrift")  Date: 2026-10-07

Recorded by the coordinator (Opus 5.5). In force for counted runs pre-registered AFTER this commit; F1 still subject to its admission trial. GATE-1, GATE-C1 and GATE-C1b are unaffected.

Until this is signed, nothing in this document is implemented or used.
