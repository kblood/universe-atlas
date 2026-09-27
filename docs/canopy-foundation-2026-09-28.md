# Canonical forest patches and shared habitat — 2026-09-28

This is the first source increment toward continuous canopy, following the
[Opus 5.5 canopy review](opus-5.5-canopy-review-2026-09-28.md). It preserves the
current visible population. It does not yet draw a continuous distant canopy.

## Implemented

- `populationCellAt` addresses the existing `surface-population-2` field
  directly, with the same area correction, jitter, yaw, roll and height.
  The 18 m address-grid input is now explicitly an identity constant. The
  6.5% far sampling rate has one named presentation constant.
- `forest-patch.ts` partitions each cube face into at most 8×8 existing
  address cells. Partial face-edge patches are clipped. This gives bounded,
  observer-independent work units; it introduces no new placements.
- A census distinguishes unresolved habitat from genuinely empty ground.
  It reports accepted counts and nominal height statistics only. Its key
  identifies the population patch; a future cached habitat/render summary
  must additionally include water, hydrology, habitat and appearance versions.
  Nominal top is ground plus the canonical height parameter, not a measured
  mesh bound or a collision surface.
- Near placement now calls a shared `tree-habitat-1` function. The same
  function can supply worker summaries. It reuses vector scratch storage
  rather than allocating vectors for every slope check.

## Verification

The pre-extraction forest selection SHA-256 remains
`2850d5e0bafefdd39f1469d4b5c2d75d803080dc0a1a6e32be2cb690996624e8`
for the fixed three-centre fixture, including face seams and a cube corner.
Address queries agree with selected cells. Tests exhaustively partition a
small six-face grid without duplicates or omissions, including clipped edges.
Shared habitat matches a frozen copy of the shipped expression across more
than 1,000 terrain/water samples. Empty, unknown, invalid-height and synthetic
slope cases are covered. Eleven focused tests and the build pass.

The one-axis slope rule is intentionally preserved: a steep slope along its
unsampled tangent can still pass. Fixing that changes tree presence and will
be a separate habitat version with a documented before/after comparison.
The Opus review's possible asynchronous hydrology invalidation gap does not
apply to the current replacement path: `selectRiverDestination` rebuilds the
planet renderer and its forest after installing hydrology. Future retained
summary caches still require explicit hydrology invalidation.

## Next increments

Cache canonical patch enumeration in the selection worker, then build bounded
habitat summaries with exact accounting of representative and other trees.
Verify worker/main equality and resource bounds before rendering them. Add
canopy chunks behind a diagnostic switch, with readiness-gated complementary
coverage during near/far handoff. Compare coverage against an all-tree
reference in clear weather before enabling a new representation by default.
The review's sampling estimates and proposed budgets remain hypotheses.
