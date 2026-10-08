# October 8 continuation validation

The interrupted four-workstream round is integrated: Atlas allocation fixes,
creature-kit allocation/determinism fixes, browser harness repairs, and stronger
shared forest colours. Creature-kit main is `5e4265f`; Atlas consumes its
47-file SHA-pinned vendor snapshot. Terrain is `terrain-1.10.1-forest-colour`;
climate remains `surface-climate-2`.

## Allocation and identity

| Path | Baseline bytes/call | Optimized bytes/call |
|---|---:|---:|
| Niche | about 130 | 0.098–0.152 |
| Eco-class | about 68 | 0.003 |
| Flora frame | about 41 | 0.878–0.895 |
| Coat | about 1947 | 0.025–0.027 |

The Atlas measurements use three independent rounds with GC accounting and
no-op controls, reject the old implementation, and preserve 61,810,420
`Object.is` comparisons. Coat preserves 2.64 million comparisons and the
lineage-B guard. Flora returns buffer-owned borrowed counts; callers retaining
counts across frames must copy the numeric fields. The season and terrain
comments now describe their actual temporary allocations. Eco's performance
heap bound is explicitly a net-growth check; its allocation proof is the
separate GC-counted functional gate.

## Functional coverage

The complete 265-step full-tier run exercised 1,755 tests: 1,740 passed, five
historical colour-containing LOD references failed, six skipped, four TODO.
The only failing file was then repaired without changing any frozen
`COST_*`/`RISER_*` literal: it verifies legacy palette bytes and separately
compares every production physical field, including tile alpha. All 23 tests
in that file passed a complete full-tier followup (five of five steps).

The executable receipt combiner verifies matching test identities, complete
followup coverage and unchanged production `src/` since `61a198e`. Combined
coverage is **1,745 pass, zero unresolved failures, six skips, four existing
TODOs**, covering every test. This is a complete run plus a focused full-tier
followup, not a claim that the original all-file run exited green.
No physics, morphology, numeric LOD tolerance or performance pin was loosened.
The intentional assembly colour-hash changes are recorded in the test and in
`orbit-forest-colour-2026-10-08.md`; its physical hashes remain frozen.

This receipt was produced before the additional navigation repair below.
Its source set remains unchanged except for the separately tested 100-metre
arrival predicate and its wiring in `main.ts`.

## Browser, golden and performance receipts

- TypeScript and the full application build pass. The clean browser artifact
  used for the initial browser receipts is commit `61a198e`, built
  `2026-10-08T20:48:29.350Z`. The subsequent navigation repair has its own build
  and browser regression receipt.
- Strict golden: Node, Chromium 149, Firefox 151, WebKit 26.5 agree exactly.
  All 655 previous fauna records remain identical, with 61 new records for the
  two regression specimens. Place-query changes are terrain-version strings;
  census changes are cache provenance, with population fields identical.
  See `continuation-golden-2026-10-08.md`.
- General browser and all three rock scenarios pass on RTX 5090 / ANGLE D3D11.
  Rock replay/flooding checks and 19 captures are preserved. Shore searches
  run outside owned GPU leases, with progress and unchanged selection rules.
- Canopy date-seek passes on the same hardware artifact.
- CPU performance gate: 13 pass, zero fail, one skipped strict eco criterion.
  The configured quietness gate observed 17%, 5%, 17% CPU. Eco cost measured
  15.4 ns/call; the explicit strict 25 ns owner check was not invoked. Coat
  measured 0.0262 B/call with a valid control.
- Render-probe completes low100 and groundEye with zero errors. Its short
  1-second windows are diagnostic timings, not desktop/device acceptance.
- Surface detail checks pass, but the original run exposes a pre-existing
  coast arrival bug: 9,112 m residual was accepted by a 0.002-radian gate.
  Navigation now completes within 100 metres on small/large bodies; the
  original 2 km test tolerance is unchanged. Four new regressions and
  TypeScript pass. The landing scan moves outside GPU ownership with its
  unchanged criteria. See `surface-arrival-precision-2026-10-09.md`.
  Affected-code and final browser receipts are recorded on completion.

## Inspectable evidence and remaining acceptance

Evidence is preserved at the IWSDK root under
`Assets/_assetctl/atlas-continuation-2026-10-08/`: CPU logs and per-test receipts,
the functional receipt combiner and summary, four-engine golden report and
record-delta proof, and individual browser reports/captures. Kit identity and
negative-control evidence remains under `Assets/_assetctl/kit-nudge-evidence/`.
Forest before/after review is `Assets/_assetctl/orbit-forest-2026-10-08/`.

Quiet-host desktop performance acceptance and physical Quest/headset checks
remain outstanding. No device acceptance or deployment is claimed. The paused
Chromium build was not resumed. Research/production asset status and the
repository's UNLICENSED provenance remain unchanged.
