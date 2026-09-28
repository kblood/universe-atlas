# Live tree forest release verification

**Release:** `8e16776b20effaa1e2bd89a6de4b47654a1cae5e`, clean (`dirty=false`), verified 2026-09-28 at [the production Atlas URL](https://dionysus.dk/webxr/IWSDK/universe-atlas/). The live build stamp and 470 published resources matched the release checkout `dist`; the audit included all 295 PNGs and verified their PNG signatures. All 24 production JavaScript chunks matched `dist`. This verifies the published stage; it does not compare those chunks with an earlier release.

## Passing checks

- The guide passed across nine chapters at 1440, 390, and 320 px; 92 internal destinations, no-JavaScript navigation, era anchors 0/5/9, the mobile history disclosure, and the in-game guide link were checked.
- A separate 1440×1000 desktop browser smoke ran on an NVIDIA GeForce RTX 5090 using ANGLE/D3D11. Find Life, a 600 m terrain cruise, and warmed legacy forest rendering completed. It recorded 362 visible legacy forest instances, a 156,275-tree far-canopy census, zero canopy failures, zero GL errors, and no page errors.
- The production guard rejected explicit experimental tree-family loading (`Experimental forest assets require a development build`); no candidate family GLB requests occurred and the detailed family remained unloaded. The smoke therefore validates the shipped legacy forest path, not experimental detailed-tree rendering.

## Navigation coverage and failed attempts

The successful gameplay smoke was desktop-only. The guide passed at 320 px, but gameplay navigation at the narrow viewport did not pass and remains unverified. Three earlier browser attempts are retained: an initial Find Life selector timeout without state capture; a 60-second terrain-cruise timeout after the control was clicked, without diagnostic capture; and a later route timeout with Find Life visible, a settled body camera, no browser errors, and no experimental asset requests. That last capture did not include travel state, and its referenced screenshot was not present, so the cause is unresolved. A later independent desktop run passed. These failed attempts are harness/navigation evidence, not a confirmed production defect.

No XR or headset check was performed. No detailed-tree visual acceptance is claimed.

## Evidence

- [Full live publication receipt](live-publication-receipt.json)
- [Reproducible live verifier](verification.mjs)
- [Desktop production smoke runner](game-smoke-diagnostic.mjs), [compact phase report](game-smoke/report.json), and [before](game-smoke/before-find-life.png) / [after](game-smoke/after-find-life-1.5s.png) screenshots
- [Guide report](live-guide/guide-report.json) and [responsive / era screenshots](live-guide/)
- [Preserved first](first-run-failure.json), [second](second-run-failure.json), and [third](failure.json) failed-attempt records
- [Supplemental local PNG publication audit](png-publication.json): this is a source-to-rendering-worktree audit; the live receipt is authoritative for production byte matching.
