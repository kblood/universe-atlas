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

The expensive global shoreline candidate pass can now be prepared separately
from its nearest-first resolution. Rock acceptance prepares the same 400,000
samples before taking the GPU lock, through the shared one-token CPU slot.
It resolves the unchanged search from the actual living close-view pose once
that pose exists. The legacy one-shot helper remains available to desktop-perf.
A caller that already holds the GPU lock remains responsible for scheduling
that CPU preparation; the harness does not request a CPU slot under that lock.
Before shoreline refinement, the harness closes its browser and releases its
own GPU holder. Refinement uses the saved living pose through the CPU slot;
the slot is released before reacquiring the GPU lock and opening a fresh shore
browser. The second browser's renderer is checked again. An inherited parent
holder is preserved and refinement then runs without requesting a CPU slot.
An optional progress callback reports global sampling every 25,000 samples,
refinement every 4,096 samples, and the final found/not-found stage. The rock
harness logs these counters with timestamps; the helper is silent by default
and retains its original candidate order and shoreline criteria.

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
The completed diagnostic run exits 0 with `ok: true`, no page/console errors,
and all barren, living, and shore assertions passing. All three exact-date
replays restore identical census and published sets. Shore band rocks change
from 4 at the low sea to 0 at the high sea; minimum observed clearances are
0.951 m and 3.136 m. Nineteen screenshots are preserved. The owned browser,
preview, and GPU lock are released. This is evidence for the renderer diagnosis;
a clean final integration receipt remains the coordinator's next check.

Verification: syntax checks pass for all four changed scripts; TypeScript
passes through the shared one-token test slot. These checks do not certify
the canopy, surface, or render-probe browser runs. Desktop performance needs
a separate quiet-host run; Quest and other device checks remain outstanding.

The search refactor passes an independent comparison against the original
`4711abf` helper on nine analytic coastline cases (three phase offsets and
three start directions), each using the original 400,000 sample count and
shoreline criteria. Every returned site object is exactly equal, including
the candidate count. This verifies the decomposition rather than product
terrain acceptance. Script: `test-results/harness-rerun/shore-identity.mjs`;
receipt: `shore-identity-analytic.log` (exit 0). A duplicate real-terrain
comparison was interrupted to release the CPU slot for allocation verification;
its interrupted result is not an acceptance receipt.
The callback-enabled variant also passes the same nine exact comparisons and
checks global completion/found-event counts (exit 0,
`test-results/harness-rerun/shore-identity-progress.log`). The actual harness
negative case rejects a capture invoked inside a CPU slot before launching a
browser and leaves the live GPU holder unchanged (expected refusal;
`rock-lifecycle-negative.log`).
