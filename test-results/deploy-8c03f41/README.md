# Live deployment attempt: 8c03f41

This is a recorded live release of commit `8c03f410d4d0a0627f02d2a820dc432bdb73b411`.
The release script completed successfully and the live build stamp returned that
exact SHA with `dirty: false`. The release transcript is `release.log`.

The normal UI fixture passed on the deployed RTX 5090 / ANGLE D3D11 build:
basic forest by default, detailed-package opt-in, date identity return (16/16
matched samples), controlled 503 fallback and retry, 20-request cache reuse on
revisit, and no unexpected browser or WebGL errors. The ordinary URL probe
reported Trees disabled, surface-lighting preference enabled, and no detailed
forest requests. Its screenshot and JSON are in `defaults/`.

All 18 files under `assets/forest/desktop-v1` (25,953,387 bytes) byte-match the
release checkout's `dist`; see `package-byte-audit.json` and its runner.

The initial guide traversal is **not a pass**: it found a live 404 for the
same-origin link to `test-results/forest-asset-loading/README.md`. The source
README exists but was omitted from release `dist`, so the link remains broken.
The failure is preserved in `guide-initial-failure.json`; the three screenshots
captured before the failing link are under `guide-initial/`. Follow-up site-only
packaging work is required before guide validation can pass.

The captured six-second profile is retained in `normal-ui/` for diagnosis, but
this report makes no performance claim. Detailed tree visual acceptance remains
open. Publication is an opt-in asset/forest optimization stage, not approval of
final forest realism.
