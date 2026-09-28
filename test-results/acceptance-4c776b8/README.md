# 4c776b8 desktop canopy acceptance

This is local production-preview evidence for immutable commit `4c776b8bb59a273ceddbb253fec5fdb12626fe99`. The build stamp in `canopy-flight-final/report.json` records that commit with `dirty:false`; the report also includes hashes for the 22 JavaScript assets produced by that build. The acceptance harness was locally extended for handoff counts, so its own `sourceWorkingTreeDirty` field is true even though the built application snapshot is clean.

## Checks

- `npm run build` passed (`tsc --noEmit` and Vite production build). Vite emitted its existing large-chunk advisory for Rapier.
- Focused canopy/forest/rendering host suite: 60 passed, 0 failed.
- Full `npm test`: 4 unrelated existing failures: scale-factor saturation boundary, version-compat expected `atlas-history-2` but got `atlas-history-3-remnant-cooling`, cosmology expected `atlas-cosmology-1` but got `atlas-cosmology-2-radiation`, and late-time horizon gating expected false but got true.
- Preview links: all 9 guide pages and 277 local HTML links passed; all 190 Vite-allowlisted documents/results and 217 relative Markdown links returned successfully.
- Browser: NVIDIA GeForce RTX 5090 via ANGLE / Direct3D11, viewport 1440×1000. The full flight and ground-walk traversal each moved over 320 m, with `systemUnit:1`; the tree handoff diagnostic skipped 13,954 near-cache candidates for current canonical canopy ownership at settle. Final census had 153,518 trees / 6,689 patches, zero queued patches/jobs, failures, capacity misses, or near/far disagreement. Browser errors: none.
- Default-framebuffer alpha readback was 255 for all 1,440,000 pixels at MSAA 0, 2, and 4.
- The separate steady profile ran for about 8 seconds: 456 CPU frame samples and 454 completed GPU frame samples. GPU timing was available with 0 skipped, disjoint, or expired queries. `cpu/planetUpdateMs` p50/p95/p99/max was 11.5/17.3/19.2/26.9 ms; `cpu/frameWorkMs` was 15.3/23.5/25/32.5 ms; `gpu/framePassSumMs` was 4.36/6.46/7.68/8.53 ms. These are diagnostic samples, not an FPS claim.

## Sampled upload counters

The canopy browser harness samples `fullCanopy.uploadBytes` every 100 ms. These are current-frame counters at sampling instants, not a byte total for each interval.

| Phase | e32d8d7 p95 / max bytes | 4c776b8 p95 / max bytes |
| --- | ---: | ---: |
| Flight | 2,048 / 153,296 | 2,048 / 63,488 |
| Walking | 1,024 / 696,768 | 1,024 / 89,088 |

Both runs used the same RTX 5090 host and sampling method, but they were separate runs rather than a controlled benchmark with identical system load and dates. Read the differences as observations, not a guaranteed performance gain.

## Artifacts

- Full flight, turns, walking, census, upload trace, handoff count, alpha histograms, build stamp, and JS bundle hashes: [canopy flight report](canopy-flight-final/report.json).
- Flight screenshots: `canopy-flight-final/flight-near-ground.png`, `flight-lateral.png`, `flight-turned.png`, `walking-close.png`, `walking-turned.png`, `walking-lateral-300m.png`, and `settled.png`.
- 8-second profile, 2560×1440 resize, and MSAA screenshots: [desktop profile report](desktop-rendering-profile/report.json), with related PNGs beside it.
- Earlier diagnostic attempts remain in sibling directories; `canopy-flight-final` is the corrected run used for these results.

This validates traversal, cache/census agreement, handoff, framebuffer alpha, and diagnostic plumbing for the tested snapshot. It is not a visual realism signoff for the current tree shapes, an XR acceptance, or a cloud-edge comparison. No deployment was performed.
