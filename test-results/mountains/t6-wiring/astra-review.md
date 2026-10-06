MERGE AFTER MUST FIXES

1. **MUST — `tests/terrain-climate-colour.test.mjs:39`, `tests/acceptance/climate-agreement.test.mjs:51`: pointwise truth checks were replaced by level-0 checks.** These tests assert exact colour equality and classifier agreement at each sampled height; they are not global statistics. Neither file retains a truth counterpart through `fullOnly()`. A regression that computes mountain colour from the pre-carving height could escape these checks while level-0 agreement remains perfect. **Smallest fix:** retain the original truth-based identity/agreement tests under `fullOnly()`; keep level-0 checks separately. Update the decision-3 ledger accordingly.

2. **MUST — `tests/terrain-relief-hypsometry.test.mjs:173`, `tests/terrain-floor-window.test.mjs:107`: additional pointwise invariants lose truth coverage.** The analytic height-bound test now checks only the coarse field. The continental-sign and floor assertions also move entirely to level 0. The new full-only window test checks `windowM` and its bounds, but does not restore these other assertions or the original catalogue coverage. For example, excessive carving could put truth below the analytic minimum while the coarse upper envelope remains inside both bounds. **Smallest fix:** preserve the original invariant scans, with their original assertions and bodies, under `fullOnly()`. Only aggregate statistics should move exclusively to level 0.

3. **MUST — `src/terrain.ts:125`, `docs/mountains-t6-wiring-2026-10-06.md:230`: the required golden update is missing.** The diff changes the terrain version and default field but leaves `tests/golden/golden.json` unchanged; the golden ledger remains `@@GOLDEN@@`. This has a concrete consequence even independently of sampled mountain heights: `place-query.ts` includes `TERRAIN_VERSION` in returned versions, which the golden generator serializes; census context also includes it. The cross-engine runner compares these digests against the old fixture and rejects mismatches. **Smallest fix:** complete the authorized single golden re-pin and record old/new digests. Complete the remaining required T6 gate evidence, currently represented by placeholders, before merging.

Checked and found correct, by static inspection:

- Existing ROOM pins, SHIPPED_CEILINGS, LOD tolerances and budgets remain unchanged. All 37 UP_ROOM pins match the recorded maxima × 1.25 rounded upward to 50 m; negative controls exercise the same predicates.
- U1 samples the child’s own level directly, before peak correction, at all 289 shared vertices of every measured pair. U2 checks stored heights; the existing point-child and section-5 checks remain.
- Landing candidates and summit percentiles use level 0. Landing placement and walking retain the truth.
- Both terrain cores receive matching signature changes; other edits stay within the permitted hunks. The textual identity test still compares everything outside those hunks. The reference needle disables both carving and rock.
- The canopy fix disables clock cutoffs for quota tests and uses an injected clock for the deadline test.
- The 1.3 H coarse exclusion is conservative under the documented interpolation-error bound: `1 + 0.2 + 0.1`. Truth identity retains 1 H and runs through `test:full`.
- Carving tests retain existing coarse/carved digests, add rock digests, check upper envelopes below ROCK, and check truth identity from ROCK onward.
- Mountain selection uses M1 inputs, includes flank/end points, and validates massif samples. Tile metadata uses each tile’s level; forest selection confirms on truth; place-query and render-bound consumers retain the appropriate samplers.

Static review only; runtime results were not independently reproduced.