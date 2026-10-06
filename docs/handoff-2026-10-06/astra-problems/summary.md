# Astra review of open problems (2026-10-05)

Codex `gpt-6-astra`, read-only, ephemeral. Three reviews ran in parallel (about 4 minutes each).
Inputs were `prompt1..3.txt` and outputs are `answer1..3.md` in this folder. Astra reviewed
universe-atlas at `1dbf2c2`. No repo was edited and no tests, browser or locks were used.
I spot-checked four claims (see the last section).

## Astra verdict lines (verbatim)

**Review 1: mountains (universe-atlas)**
- VERDICT (a): The decomposition is sound, but the present thresholds and protected sampling locations are over-fitted; 39 P300 summits/1,000 km² remains an unexplained density, not validated realism.
- VERDICT (b): T1/T2/T4 are sensible, but a regenerable coarse macrofield deserves comparison and T3 needs a defensible reduction plus correct parent-level sampling.
- VERDICT (c): Visual-advisory policy is adequate containment for an unreliable judge, but inadequate appearance validation without human-labelled comparisons and independent structural metrics.
- VERDICT (d): The three biggest risks are cold-streaming stalls, incorrect or conspicuous LOD transitions, and mountains that pass synthetic metrics yet still look artificial in the headset.

**Review 2: process and test discipline (universe-atlas)**
- VERDICT (1): Agents still drown in contradictory full-suite requirements, selector overreach, and calibration churn; the files prove repetition, but not a current wasted-hours percentage.
- VERDICT (2): Element isolation and negative controls worked, while premature assembled judging, synthetic-only cost assumptions, and mountain-free frozen coverage failed.
- VERDICT (3): VISUAL-ADVISORY behavior is implemented, but the HARD/CONTRACT authority distinction and mandatory merge gate remain largely procedural.
- VERDICT (4): Automate acceptance/decision validation first, verification reuse second, and durable evidence indexing third.
- VERDICT (5): Opus's decisions are understandable but not adequately auditable end to end because source authority, preserved evidence, and superseding clarifications are incomplete.

**Review 3: Civilization Lab after M4**
- VERDICT (1): M4 produces stone-to-space histories, but static productive capability, weak launch decisions, artificial colony maintenance and repetitive collapse still undermine their plausibility.
- VERDICT (2): No M4 numerical fabrication masquerading as research was demonstrated; mechanism attribution in the research synthesis is materially less honest than the parameter labels.
- VERDICT (3): The core looks carefully deterministic, but cross-engine and Node 22/24 identity are unverified, and the exponentiation/lint/quantisation gaps should be closed.
- VERDICT (4): Minimum M5 is a small causal economy, sustainable colony maintenance, informed targeting, meaningful recovery and controlled validation before any Atlas integration.

## My ranking: top 8 actions across all three reviews

1. **Fix T3 parent sampling before implementing it** (R1 #5, high).
   - Problem: `buildTile` (`src/planet-tiles.ts:131`) builds one sampler, and `parentPoint` (lines 245-254) reconstructs the parent through it. If the plan only passes `tile.level`, the parent at the cut is evaluated with the child's carving policy.
   - Action: amend T3 so that parent vertices use level L-1 and have their own cache identity.
   - Also gate cut-level parent/child endpoint equality on massif tiles.
   - This is a concrete defect in my own plan and cheap to fix now.
2. **Make the massif tile set a gate before T6, not INFO** (R1 #2, R2 #4, high).
   - None of the frozen pin tiles touches a massif, so "96/96 cells" says nothing about mountain LOD.
   - Setting ceilings is Kasper's A3 call. What can be done without him is to send A3 to him now, with the massif-set numbers, as the one blocking question before the wiring merges.
3. **Classify acceptance results by machine** (R2 #5/#8, high).
   - Problem: `tests/helpers/test-runner.mjs` accepts any allowlisted failure by title and file. A CONTRACT failure could be exempted through the same path as a perf flake.
   - Action: add a `class` field to known-failures entries and reject CONTRACT entries that have no decision-record reference.
4. **Hold out data for mountain validation** (R1 #1, high).
   - Freeze the current rows.
   - Validate on unseen seeds, curved belts and belt ends that F was never tuned on.
   - Correct the calibration doc: **8 of 12** steady-state positives exceed fill 0.05, not six (I verified lines 64-75 of `docs/mountain-m3-calibration-v1.md`).
5. **Visual validation from humans and structural metrics, not more Luna** (R1 #6, high).
   - Build a small blinded, human-labelled A/B set with matched pose and lighting.
   - Add structural metrics: directional spectrum/autocorrelation for combing, Geomorphon proportions, and flow-accumulation and slope-area statistics.
   - Address the straight-divide finding (17/20 stations crest within 375 m of the axis) before the headset. It is Kasper's open crest-wander item.
6. **Civ-lab M5 core: a productive-capacity stock and failure-aware targeting** (R3 #1/#2/#10, high).
   - Energy is pop × a fixed per-era constant (`src/tech.mjs:27`), so the far future is static.
   - In lonely-earthlike, 82% of launches go to previously failed targets.
   - Retry rules must depend on the failure reason and on delivered knowledge.
7. **Replace the colony-maintenance cliff** (R3 #4/#5, high).
   - Problems: the 1,000-year reserve and the 300-year freshness are both hard cutoffs, 10% of the *whole* arc population counts as teachers, and turned-away passengers all die.
   - Action: make support domain-qualified and use a depleting, replenishable reserve.
8. **Write the decision ledger honestly and keep its evidence** (R2 #7, high).
   - Amend `mountains-opus-decisions-2026-10-05.md` so the ledger lists the **scope** changes: M0 no longer blocks, the 48 km cap narrows the massifs, and axis/flank rows become INFO.
   - Record the preview-ban interpretation. The README says the ban covers deployed previews only.
   - Before `mountains/m0c` is ever deleted, preserve its tracked M0-v3 evidence by merging an evidence-only commit or recording hashes.

Next tier, not in the top 8:
- Remove the full-suite requirement from hand-off templates.
- Stop `package.json` registration edits from selecting all 197 files.
- Move the eco-class 100 ns wall-clock gate to the perf tier.
- Civ-lab: replace `2**(count-1)` with constants, tighten the lint, and run an actual Node 22 vs 24 digest comparison.

## Where I disagree with Astra

- **The macrofield bake (R1 #4).** Astra rates "compare a regenerable coarse macrofield" as high.
  - The cold disaster (335-461 s for six L0 tiles) is M3 block solves at levels that cannot hold carving. Astra itself concedes a macrofield "does not eliminate M3's cold solves"; T3 does.
  - The warm M1 cost is addressed by T1+T2 without changing values. An interpolated macrofield changes terrain values and forces a version move.
  - I keep the macrofield as the fallback if T2 misses <= 1,700 ns, not as a parallel study now.
- **"T3's spectral justification is wrong."** Half right.
  - `CARVING_BANDS` is indeed dead metadata. The only hit in `src/` is its definition at `mountain-carving.ts:52`.
  - Carving also has a negative mean, so the Nyquist argument is weak.
  - But T3's legality rests on the upper-envelope argument (carving <= 0, so uncarved >= carved), and that argument stands under contract §3.
  - The real issue is a visible mean-height step at the cut level. That is a transition-quality risk to measure, not a contract error. A cheap coarse mean-carve term is the right mitigation if the step is visible.
- **"Cited M0-v3 evidence is absent."** It is absent from main but exists, tracked, on branch `mountains/m0c`, which is currently checked out in a worktree.
  - `test-results/` is gitignored by policy, so "590 of 609 untracked" is by design, not neglect.
  - The real risk is narrower: evidence lives on an unmerged branch that the worktree-cleanup rule could delete.
- **The 39 summits/1,000 km² density (R1 #3).** I agree with Astra's restraint. It refused to invent a real P300 density, and neither the Alps 4000er list nor the Pyrenees 3000er list is comparable. A matched real-DEM comparison needs Kasper's download authorisation, which is already an open item.
- **What Astra missed in civ-lab.** Three of six scenarios (crowded-domain, doomed-star, high-perils) start at E3: their E0->E1 rows are 30/30 left-censored.
  - So the stone-age-to-space arc is exercised only by forager-future (6/30 reach E7) and lonely-earthlike (1 reaches E7; 10 pending, 4 no-lineage).
  - The plausibility tool also exited 1 (13/180 compiles over 30 s).
  - Minimum M5 should therefore include an E0-start panel of N >= 30 per profile. Astra's item 5 implies this but does not state it.
- **The cooldown power `2**(count-1)`.** Astra rates it medium together with the lint gap. In practice the exponents are 0-3 and every engine computes these exactly. The lint gap (`**` uncaught, `fixed.mjs` exempt) is the part worth fixing. Low.

## Claims I checked

- Fill-positive count: confirmed, 8 of 12 exceed 0.05.
- `CARVING_BANDS` unused: confirmed.
- Single sampler in `buildTile` with parent reconstruction through it: confirmed.
- `2**(count-1)` at `civilization-lab/src/planet.mjs:572`: confirmed.

Not checked: Astra's git and artifact counts (640 commits, 609 files, 300+91 Luna answers) and its civ-lab line references beyond `tech.mjs` and `planet.mjs:572`.
