# Baked coarse field implementation handoff

Not acceptance-ready: the field-build budget fails on three worlds, and four immutable switch-tile pins conflict with the required new parent mesh. No switch-tile or carved-sampler pin was changed.

Production: src/mountain-layout.ts, src/mountain-envelope.ts, src/terrain.ts. Tests: new tests/mountain-coarse-field.test.mjs and tests/helpers/mountain-coarse-field.mjs; coarse [0] pins in tests/lod-carving-reduction.test.mjs; version pins in tests/mountain-layout.test.mjs, tests/mountain-layout-grid.test.mjs, tests/mountain-envelope.test.mjs, tests/terrain-mountains-assembly.test.mjs. Registered in package.json.

## Design

Half the T1 face resolution (512/1024/256/1024). Sparse 8x8 cell blocks with active-cell masks, conservative block-cap/slab candidate lists, and a 9x9 Float32 signed-distance array per candidate. A block candidate is conservatively a candidate for each active cell of that block; multi-belt counts refer to these stored candidate lists. Maximum over candidate compositions AND the zero-belt/main term keeps candidate-list transitions continuous. Shared nodes use world-axis normalization order. Layout construction uses private bit-identical catalog kernels. The exact core is a separate function literal and copies the caller direction into its own scratch tuple before M1. State false always selects the same field, so existing cache identities remain valid.

Measured delta = 0.16 H, >2x the worst 0.076814443 H. The measurement evaluates 5x5 taps in every active cell, for every stored candidate where |u/U|<1 and |distance|<=1.25H; ~6.59 million relevant taps across four worlds. Endpoint-clamped projections dominate. This is a measured margin, not an analytic proof for untested worlds.

Full field statistics and cold process timings: field-report.jsonl. Error evidence: interpolation-error.jsonl. Dense upper-envelope samples: 56,724/world, zero violations. All active-boundary taps equal main, Object.is on every returned field. Dense ocean comparisons in the new test use the exact uncarved reference, not a full carved truth evaluation of all 226,896 directions; carved ocean comparisons remain in the existing reduction rasters. Thus the literal new-test requirement (e) has not been fully implemented.

main-identity.mjs uses read-only git show 9971c3f:src/terrain.ts. 6,912 samples/world compare identical (default, off, truth, cut, base sampler, crater modes, floor modes), plus one unwired tile/world. Every carved switch tile changes only parents and parentHeight; all other fields/buffers are identical. main-identity.jsonl records the checks. Carved sampler pins are unchanged and pass.

## Re-pins (only index 0)

- Maithea COST_IDENTITY[0]: `05a0aea70e33e2b0c36594f69041d4dbb86bfbd57db25280569ab91a894384af` -> `085218439efd38c5665d61ee7afee713d0f5499bffefa9df912492f669ef44e0`
- Maithea COST_SAMPLER_IDENTITY[0]: `df801672c445213af1e0822a9ab3d678f52a34b416565f5db2099b270f1fe3a6` -> `0c2e6161119ee629e8f14af0c6441b17cac7dbc877071e7df9c6b640ce93d454`
- Selawyn COST_IDENTITY[0]: `565f77b3c215ccc08d22bff6dcadd8988775f63515329e3ed6e98ba1638c321d` -> `b787565e7ba4d8ef34ff61de9454e4113300b262ae618271fa7b611be5f78954`
- Selawyn COST_SAMPLER_IDENTITY[0]: `b335c740d0dd0b80eef5374af73edda3256a91eb052416a3718ad8e2fc5d9f2a` -> `c25d73c602fc381f19337c99f9f9b36e71c083f1d146d64401be12e45128d5ec`
- Raiva COST_IDENTITY[0]: `fc27a747f83127b7ec7ad5c9d8b5d8cc3684906b1232f74f41c88494aa0a474e` -> `498662db0015231e211c67ebd6b1cd8d0e290e56e9e409740d31325e9b88f570`
- Raiva COST_SAMPLER_IDENTITY[0]: `35996b0d9fe42f5f5ef89cd6697135746eab82b66d7e4436c2537de53b58df48` -> `733c1c25bc794a3dd4516b073526f6e6ab3b406bdaf4e361e37bf53a67638778`
- Lethuris COST_IDENTITY[0]: `2640201199c1f4523b0b8a10a7d148104cc37526298e16f1d4412e468b530557` -> `4f79a66f8cd7020438212ef4602fb736701eb863b61583c0b32c03e3c64880b7`
- Lethuris COST_SAMPLER_IDENTITY[0]: `f5218c6fb2d262129d3dd4465851d5fc761b17751042a5c5c9f148b498faa42b` -> `3fa308f5d032e47ce1bec0ae209c57729ad22f0bafd5a89939a549f5fd4fc492`

## Validation

- `npx tsc --noEmit`: exit 0, no diagnostics.
- `node --test tests/mountain-coarse-field.test.mjs tests/lod-carving-reduction.test.mjs tests/sparse-consumer-levels.test.mjs tests/mountain-layout.test.mjs tests/mountain-layout-grid.test.mjs tests/mountain-envelope.test.mjs tests/terrain-mountains-assembly.test.mjs tests/lod-consistency.test.mjs`: see checks-final.tap; failures are the four untouched COST_IDENTITY[world][1] switch-tile pins.
- `node --test tests/mountain-coarse-field.test.mjs`: exit 0, 18/18, about 9.7 seconds before the allocation-only field-builder refinement (also included in the final combined run).
- `node test-results/mountains/t6-baked/field-report.mjs`: exit 0, four fresh child processes, field only timed after layout and T1 construction. Three of four bodies miss 50 ms. No resolution reduction.
- `node test-results/mountains/t6-baked/interpolation-error.mjs`: exit 0, four world measurements.
- `node test-results/mountains/t6-baked/main-identity.mjs`: exit 0, four worlds, 27,648 sample comparisons plus tiles.
- `git diff --check`: exit 0.

The initial combined test run was exit 1, 80 pass / 10 fail: eight expected coarse pins and two source arithmetic audits. The eight allowed coarse pins were updated; the audit issues (JSDoc ** tokens and non-whitelisted Math helpers) were fixed without weakening tests. The subsequent combined run was exit 1, 86 pass / 4 fail, only the immutable switch pins.

No git writes, commit, network, download, browser, GPU, test:full, official benchmark, forbidden source changes, or known-failures edits. Evidence under test-results is ignored by the existing git rules and remains available on disk for coordinator review.
