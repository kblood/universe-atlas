You are Astra, an independent read-only reviewer. Review branch climate/m1 in this worktree:
`git diff 7419733..HEAD -- src tests docs` (commits 6f635b2..HEAD; package R5-ATLAS-CLIMATE-M1, plan
docs/biome-climate-increment-2-plan-v2-2026-10-04.json P1 milestone M1 steps 1-7 plus docs/surface-climate-v2.md).

Check, with file:line evidence:
1. Correctness of src/surface-climate.ts vs the plan formulas (PDD kernel H/G tables, warm-column lapse,
   warmest-month ceiling + half-range floor, heat cap, PET/P/AI effective moisture, ITCZ zonal band tables,
   dryBelt01 = subsidence term). Interpolation/indexing bugs, edge cases (half=0, x=1 row, frozen/dry worlds).
2. Determinism rules: no Math.pow/** /sin/cos/asin/acos/exp/log/localeCompare in surface-climate.ts per sample;
   module-init tables only via det-math; no per-sample allocation.
3. Tests: are the acceptance gates real (not tuned toward the test)? Are the negative tests meaningful
   (shipped annual-mean rule fails 60 deg ELA; shipped fixed belt fails polar-ITCZ)? Any weakened assertion?
   In particular judge the terrain-climate-colour fell-zone change (colour under snow) and the P_REF 1000->650
   calibration recorded as an Opus decision.
4. The SITE_A STOP (doc section 6): is the reasoning sound; is anything retuned to fit a test?
5. Scope: only files_owned touched (src/surface-climate.ts, src/forest-habitat.ts version line,
   tests/surface-climate*, tests/climate-earth-reference*, tests/acceptance/climate-agreement*,
   tests/acceptance/climate-seek-independence*, tests/forest-water-validity*, tests/forest-habitat* pins,
   tests/terrain-climate-colour* pins, tests/harness-sites*, docs/surface-climate-v2.md, test-results/climate-m1/**).

Do not run tests (shared host). Output: a verdict line `VERDICT: APPROVE | APPROVE-WITH-FIXES | REJECT`, then
numbered MUST-FIX items (each with file:line and a concrete fix), then SHOULD items, then notes. Be concise.
