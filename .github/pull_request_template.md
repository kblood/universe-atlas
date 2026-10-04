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

## Visual evidence
- Luna: question(s), image set, verdict per frame (2 of 3 majority), or **"visual check NOT done"** (exit 2 = Luna unavailable)
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
