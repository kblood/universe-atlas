# Background hydrology flight regression

Source baseline: `37f0e89c695f592bd3a7a995e90ff80a5760498c`.
Fixed parent checkout: `eb06755e7ce5ec241793dc3d48f37658e8705972`, containing runtime commits `cb68144` and `cb03169`.

The Playwright fixture intercepts only a main-thread worker request whose message is `kind: "surface"` and whose body includes hydrology. It holds that job response (job ID 4 in both runs), allows other workers and startup messages through, starts user travel, releases the held response, and then tests explicit river inspection.

- **Baseline, expected failure:** `Find Life` established active flight and `surfaceJourney` while the worker was held. After release, river status became `ready` but `travel.active` and `surfaceJourney` were both false. The expected preservation assertion failed. No browser page or console errors occurred.
- **Fixed, `ATLAS_ACTION=life`:** after release, river status was `ready`, active flight remained true, and `surfaceJourney` remained true. Clicking `#river-find` then intentionally ended flight and cleared the prior journey. No browser errors.
- **Fixed, `ATLAS_ACTION=land`:** the `Land and walk` command also remained active with its `surfaceJourney` after the held completion. The run ended through the same explicit river override check; it did not wait for touchdown.

All browser runs used Playwright with SwiftShader, so they did not consume discrete GPU time. Vite ports 5195 and 5196 have been stopped.

## Artifacts

- `background-hydrology-flight.browser.mjs` — standalone regression fixture.
- `baseline-37f0e89-failure.json` / `.png` — captured expected regression.
- `fixed-cb03169-life-report.json` — passing Find Life and explicit override sequence.
- `fixed-cb03169-land-report.json` — passing Land approach preservation and explicit override sequence.
