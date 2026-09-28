# Per-animal near-rig diagnostics

The combined `c9ba64f` browser route kept a target animal in `faunaDrawn` at
8, 80 and 100 metres. Its aggregate near-rig count could not establish which
representation that individual used. The new bounded `activeMembers` snapshot
reports each live rig's canonical ID, pose state/phase and solver error against
its ground stencil. These are diagnostic values, not a new population or a
claim of collision with the rendered terrain.

Validation: `node --test tests/fauna-near-rig.test.mjs` passed all 6 tests;
`node node_modules/typescript/bin/tsc --noEmit` and `git diff --check` passed.
The existing capacity/hysteresis test now checks exact active IDs, pose values,
snapshot isolation, retention between 80/95 metres and release past 95 metres.
Browser verification of these new per-ID fields remains pending the next build.
