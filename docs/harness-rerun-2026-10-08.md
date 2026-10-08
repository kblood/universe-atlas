# Browser harness repairs, 2026-10-08

Rock acceptance now requests hardware rendering by default. The shared browser
options previously selected SwiftShader unless `ATLAS_HARDWARE` was set. The
October 8 merge-prep runs timed out during screenshots, grounding, and Find
life; the hardware rerun reaches these same steps without changing the app,
fixtures, waits, or acceptance assertions. `ROCK_SOFTWARE=1` explicitly selects
software rendering and the report records both launch arguments and renderer.
A requested hardware run fails if the renderer reports software rendering.

The rock harness can serve `dist` on a free port, checks preview ownership, and
holds the machine-wide GPU lock. `ATLAS_URL` can supply an existing server.
Timeouts name the current step and save page state; other failures also save
the step and state. Launch and page setup are covered by cleanup, including
failures before a page exists. Browser close failure does not prevent lock
release or preview shutdown.

The canopy-water-date-seek and surface harnesses also now take the GPU lock
(or inherit an existing holder), reject captures inside the CPU test slot,
and cover browser/page initialization with cleanup. Their renderer options,
external server configuration, fixtures, and assertions are unchanged.
Render-probe already owned its lock and preview lifecycle; `--shots` now marks
the lock acquisition as a capture, enforcing the same CPU-slot restriction.

Run rock acceptance from this checkout, outside the CPU test slot:

```powershell
$env:ATLAS_RESULTS='test-results/harness-rerun/rock-hardware-reviewed'
$env:ROCK_CONTENTION='contended host; serialized GPU browser only, no desktop-perf acceptance'
node tests/rock-acceptance.browser.mjs
```

The application artifact used for this run is clean commit `f2f2c62`, built at
`2026-10-08T19:30:51.548Z`. The harness contained the prior session's uncommitted
repairs when the run began; the startup cleanup and broader failure-state
recording were completed during that run. No product code changed.
The receipt and screenshots remain under the results path above.

Verification: syntax checks pass for all four changed scripts; TypeScript
passes through the shared one-token test slot. These checks do not certify
the canopy, surface, or render-probe browser runs. Desktop performance needs
a separate quiet-host run; Quest and other device checks remain outstanding.
