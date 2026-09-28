# Retained forest work list — 2026-09-28

## Current local implementation

The source profile that motivated this change showed repeated `currentPatch`
and `noteNear` work inside `PlanetForest.update`. The update now reuses the
existing conservative patch-bounds helper and a retained ordered list of
canonical cell indices. A complete, current census patch is omitted as a unit
only when its nearest root is beyond 670.1 m from the saved observer position.
The list refreshes when census ownership, selection/habitat inputs, or the
observer reference changes. A 20 m movement allowance keeps every omitted
patch at least 650 m away; the existing per-cell 650 m gate remains active for
work that stays on the list.

Active indices retain their original selection order, so near/mid capacity
winners and near/mid hysteresis do not depend on the culling pass. Missing,
stale-water, invalidated, or unavailable census patches stay on the fallback
path. Date changes do not rebuild the spatial list. `PlanetCanopy` exposes a
revision counter for changes that affect `currentPatch`; habitat and selection
updates also invalidate the retained decision.

Implementation: [forest update](../src/planet-forest.ts),
[ordered work index](../src/forest-ordered-work.ts),
[conservative patch bounds](../src/forest-patch-broadphase.ts), and
[canopy ownership revision](../src/planet-canopy.ts).

## Verification and limits

The [verification record](../test-results/forest-worklist-v1/README.md) captures
the focused 77-test CPU run, TypeScript check, and production build. The tests
compare active indices and capacity winners against canonical input order,
exercise moves within and beyond the 20 m cache window, and cover census loss,
water invalidation, and dated updates. See the [work-list test](../tests/planet-forest-worklist.test.mjs),
[ordered-index test](../tests/forest-ordered-work.test.mjs),
[canopy revision test](../tests/planet-canopy.test.mjs), and
[existing patch-bounds oracle](../tests/forest-patch-broadphase.test.mjs).

This is a source-level candidate only. No before/after game CPU profile or
frame-time improvement has been measured, and it has not passed browser
acceptance or been deployed. The behavior tests establish ordering and
fallback equivalence for their fixtures, not general runtime performance.
