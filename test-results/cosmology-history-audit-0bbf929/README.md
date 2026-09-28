# Cosmology and history baseline audit

Audit checkout: detached `0bbf9292bb21a1ef52bd673713f17fdf1937bff6` in `C:\LLM\IWSDK\universe-atlas-cosmology-audit`.

## Reproduction and result

Command:

```text
node --test tests/acceptance/t-seek-independence.test.mjs tests/acceptance/version-compat.test.mjs tests/cosmology.test.mjs tests/time-nav.test.mjs
```

Before alignment, this reproduced the four previously reported failures: the
scale-factor adapter was expected to overflow, the history/cosmology pins were
outdated, and 10 Mpc was incorrectly treated as beyond a collapsing
late-time horizon. The version assertion also masked an obsolete surface
version pin, which appeared once the earlier pin was corrected.

After alignment, the focused command passed **58/58**. No runtime algorithm,
world identity, date, or migration behavior changed.

## Findings

- `scaleFactorAt` is intentionally capped at `exp(600)`; `lnScaleFactorAt`
  continues increasing. The previous test and contract described an obsolete
  `sinh` overflow near `8.3e12` years.
- `galaxyVisibility` gates on the comoving particle horizon, not the comoving
  Hubble radius. In the current constant-dark-energy approximation, its late
  horizon approaches approximately 19,514 Mpc; 10 Mpc remains inside it.
- The current identifiers are `atlas-history-3-remnant-cooling`,
  `atlas-cosmology-2-radiation`, and `atlas-surface-6-lifecycle-sampler`.
  `git blame` places these literals in checkpoint `75eb074`; source headers
  describe remnant cooling and the radiation + matter + dark-energy model.
  The planned older identifiers were stale contract/test expectations.
- Version metadata does not implement historical algorithm execution or
  reseeding. Legacy time-axis URL handling is separate. Reproducing old
  algorithm outputs requires their historical implementation; this change
  makes no backward-compatibility claim.

The existing test finding about `TERRAIN_VERSION` remains unchanged and is not
part of these four failures. The full suite result will be appended after the
post-commit run.

## Full suite on the aligned revision

On commit `16f9e2fd8f09d2d9c6fc7d1b1534b1f77c88dff5`, `npm test` exited 0:
**664 tests, 661 passed, 0 failed, 3 skipped** (54.2 seconds). The three
skips are optional retained-tree GLB checks that require `ATLAS_TREE_CANDIDATE`
or explicit LOD paths. No dependency or environment failures occurred.

Version-field handling is not a compatibility migration: fields other than
`time` are not compared or dispatched. Old bookmarks may be evaluated by the
current generator and differ; reproducing historical output requires running
the corresponding historical implementation.
