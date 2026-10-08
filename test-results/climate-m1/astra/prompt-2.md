You are Astra, an independent read-only reviewer. Review the RESUME of package R5-ATLAS-CLIMATE-M1 on branch climate/m1
in this worktree: everything since d134a87, i.e. `git diff d134a87..HEAD -- src tests scripts docs package.json`
(merges of main 290472d and c6526d0 are in that range; ignore their main-side content and review the climate/m1 side).
Authoritative records: docs/surface-climate-v2.md sections 2a, 2b, 6, 6b, 6c, 6d and 7 (four Opus decisions,
climate-m1-decision 1-4, each "Opus-decided on Kasper's instruction, overrulable"). Evidence: test-results/climate-m1/resume/
and test-results/climate-m1/step8/.

Check, with file:line evidence:
1. SITE_A move (tests/harness-sites.mjs, tests/helpers/harness-site-search.mjs, tests/harness-sites.test.mjs): is the
   whole-planet nearest-first search deterministic and is the class rule (SITE_CLASS_RULE) applied as recorded, with no
   constraint added after seeing the result? Is the tangent ring basis consistent with tests/eco-identity-site.test.mjs?
2. Re-pins: tests/lod-consistency.test.mjs (SHIPPED_CEILINGS, SHIPPED_RETENTION; LOD_TOLERANCES must be unchanged),
   tests/terrain-mountains-assembly.test.mjs (HARD heights+ocean must still equal main; colour split into a PIN; the
   mutation test still targets the right digest), tests/lod-carving-reduction.test.mjs (31 digests). Is every moved
   value backed by the ledger and the bisect (test-results/climate-m1/resume/lod-bisect.json, carving-repin.json)? Is
   any limit loosened beyond "measured value rounded up to 0.1"? Is the retention assertion's Math.min form correct?
3. tests/life-continuity-scenario.test.mjs: the 360-frame recede (only the frame count and its comment changed?) and the
   new FAUNA-NEAR-DROP todo test (frozen SITE_A_PRE_M1_M; start pose rebuilt from digestPoses()[SLICE[0]] — is that
   rebuild equal to what main computes at that site?; no existing assertion changed).
4. tests/terrain-climate-colour.test.mjs (fell colour todo + PDD invariant), tests/climate-earth-reference.test.mjs
   (Earth forest share band 25-55 %, pre-registered before measuring?), scripts/climate-calibration-report.mjs snowline
   bisection, package.json/tests/tier-estimates.json registration of climate-earth-reference.
5. Docs: are the records accurate against the code and evidence (numbers, causes, gates)? Anything claimed but not shown?
6. Anything retuned to fit a test, or any weakened assertion outside the granted re-pins.

Do not run tests (shared host). Output: a verdict line `VERDICT: APPROVE | APPROVE-WITH-FIXES | REJECT`, then
numbered MUST-FIX items (each with file:line and a concrete fix), then SHOULD items, then notes. Be concise.
