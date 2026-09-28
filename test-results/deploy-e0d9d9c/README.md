# Live guide publication follow-up: e0d9d9c

The site-only publication fix at `e0d9d9c07509f53fa3a3385afb3e587c9c5b7999`
adds the forest asset-loading README to the Vite release bundle. The exact
live build stamp is clean. The README returns HTTP 200 and its raw live bytes
match the release `dist` SHA-256.

The deployed guide check passed all 9 chapters at 1440, 390, and 320 pixels;
98 internal destinations; JavaScript-disabled reading; era anchors 0, 5, and 9;
and the in-game guide link. `guide/guide-report.json` and screenshots are
preserved. All 18 public forest package files (25,953,387 bytes) match `dist`
byte-for-byte. The ordinary URL probe reports Trees off, lighting preference
on, no detailed forest requests, and no browser errors.

The earlier 8c03f41 live guide run found the README 404; that failure remains
preserved in [`../deploy-8c03f41/guide-initial-failure.json`](../deploy-8c03f41/guide-initial-failure.json).
The corrected follow-up passes. The normal UI lifecycle suite passed against
8c03f41, and e0d9d9c changes no runtime source or package bytes. Detailed-tree
visual acceptance remains open; this follow-up does not approve final forest
realism.
