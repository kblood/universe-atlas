# Forest far-atlas hardware check — 2026-09-28

## Tested revision and setup

- Implementation: `c7e9205` (captured far atlas), with `3cea060` (LOD1 foliage silhouette calibration); acceptance snapshot: clean `4053d7b88983042a907695be30764477b4528849`.
- `npm run build` passed. The implementation's full CPU suite passed 693 tests, with 3 fixture-gated skips; see `test-results/forest-visual-followup-opus/resume-2/cpu/npm-test.log`.
- Browser: local production preview, Chromium on RTX 5090 / D3D11, 1440×1000, `ATLAS_HARDWARE=1`, pinned body `G001/C2128,0,1/0/planet/1`, date offset `435084631200000085954800000` ns.

## Result

The captured atlas was adopted for both Oak (`branching`) and Pine (`spire`): 81 views per family, all 8 structural members, LOD1 source geometry, no capture errors or band fallback. The date replay preserved exact whole-population presentation identity, bounded samples, and selected/eligible/owned/submitted occupancy. The run recorded no page or console errors.

The previous stacked crown discs are absent in the flight frames. The far trees read as separate irregular silhouettes at the tested headings. The close walking frame still shows dark, sparse Pine foliage. Bright angular low plants remain visible; they are existing non-tree shrub flora and were left untouched. The faceted terrain also remains. This validates a far-representation improvement, not overall forest realism completion.

Each family atlas occupies 28,311,768 bytes; both occupy 56,623,536 bytes. The bake used 27 steps per family at 3 views per step, and reported 158.4 ms Oak / 86.2 ms Pine CPU bake time. Scratch storage was released on completion. These are diagnostics, not a GPU bake-time measurement. The later flight profile was p50 20.5 ms and p95 66.7 ms frame interval while unrelated river CPU work could be active; do not treat it as a performance claim.

## Evidence

- Full machine-readable run, including source hashes, atlas diagnostics, date replay and profiles: [`report.json`](../test-results/forest-visual-followup-opus/resume-2/browser/report.json)
- Flight view with both captured families adopted: [`flight-near-ground.png`](../test-results/forest-visual-followup-opus/resume-2/browser/flight-near-ground.png)
- Close walking view: [`walking-close.png`](../test-results/forest-visual-followup-opus/resume-2/browser/walking-close.png)
- Other captures (turned flight, lateral flight, turned walking) remain in the same browser-results directory.

The final integrated acceptance must be repeated on the rivers-disabled candidate. No publication or deployment was performed from this isolated worktree.
