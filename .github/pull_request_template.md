<!-- One task per PR. Title: "[T??] KEY: summary". Fill every section; write "not run" rather than delete a line. -->

Refs #<issue> (task `T??`) <!-- use "Closes" only when ALL acceptance, including visual/device items, is met -->

**Branch / base:** `work/<id>-<slug>` from `<base sha>`; head `<sha>`
**Owner agent / session / machine:** 
**Files changed outside the issue's owned files:** none / list and why

## Tests run (exact command -> exit code, on head sha)
- [ ] `npx tsc --noEmit` -> 
- [ ] minimal test: `node --test <file>` -> 
- [ ] hand-off: `npm run test:affected -- --base <base>` (or listed files) -> 
- [ ] digest(s) covering touched files -> 
- [ ] `npm run test:full` once, NEW failures vs `tests/known-failures.json`: 

## Tests NOT run (and why)
- golden / perf / browser / walking / VR / headset: 

## Result classes
- HARD (tests, tsc, digests, goldens) NEW failures: none / list
- CONTRACT (pinned LOD / lod-consistency, other pins) misses: none / list + owner-decision issue (pins are owner-only)

## Visual evidence (VISUAL-ADVISORY: recorded, never blocks the merge by itself)
- Elements and their deterministic metric tests + single-element render checks:
- ONE assembled sheet: `node scripts/luna-vote.mjs --json <out> ...` -> per image PASS / FAIL / UNSTABLE with counts (`pass/fail/unclear of N`, N >= 3), or **"visual check NOT done"** (exit 2 = Luna unavailable)
- Diagnosis for each FAIL/UNSTABLE: most common element, reason, expected, confidence, flags (disagreement / ambiguous question)
- Calibration per question (`--controls tests/visual-controls/<feature>.json`): CALIBRATED / UNCALIBRATED / INSENSITIVE / NOT-CHECKED; an UNCALIBRATED FAIL is not cited as a failure
- Captures: path under `test-results/...` (`--only` set, full hand-off set)

## Merger items (the merger applies these, not this PR)
- [ ] version bumps needed: `TERRAIN_VERSION` / `BUILD_VERSION` / `MODEL_MANIFEST_ID` / other: none
- [ ] golden / digest repins needed (old -> new pair): none
- [ ] `package.json` test registration: none
- [ ] `known-failures.json` changes: none
- [ ] README entry text: 

## Open owner items
- none / links to `type:owner-decision` issues (still OPEN; nothing labelled passed)

## Review
- [ ] Assigned reviewer's verdict (ready / fix-required; Astra by default) and blocker fixes linked
- [ ] Claims in this PR checked against the diff
