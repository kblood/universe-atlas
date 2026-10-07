# Test tidy, agent D: spectrum tiers, water-refresh, Luna at the gate (2026-10-07)

Branch `tests/spectrum-water-luna` from main `d08ab6b`. Items O7 (file side), O12 and O6 of
`docs/fable-test-review-2026-10-07.md`, decided by Fable 5.1 on Kasper's instruction. No `src/` change, no pin or
threshold changed, no test title changed, `package.json`, `tests/tiers.json` and `docs/test-policy.md` not touched
(Agent A owns them; see "needs" at the end).

## 1. O7: spectrum test tier mapping (`tests/terrain-structural-spectrum.test.mjs`)

| Tier | Real tiles (kinds) | Synthetic seeds | Alpine charts | Before |
|---|---|---|---|---|
| smoke | 24 (axis, flank, belt-end, outside) | 4 (101-104) | 1 | same |
| work | 24 (same kinds) | 8 (101-108) | 2 | 36 tiles, 8 seeds (fell through to default) |
| default (`npm test`) | 24 (same kinds) | 8 | 2 | 36 tiles (+ face-edge, coast) |
| gate (`test:full`) | 36 (+ face-edge, coast) | 8 | 2 | 36 |

All tiers are written out explicitly in `pick()`. The three real-terrain tests stay INFO (measure-only, no new
assertion); the HARD synthetic tests and their thresholds are untouched. Tile sets still come from
`tests/tier-sets.json` through `samples()`. Coupling to note: `samples()` returns the `work` table at the work tier
once O9 freezes one, so the work tier's tiles will then follow the work set rather than equal default; the tile-count
guard (10..50) still holds. Decide then whether work should keep the smoke table.

Runs, each `node tests/helpers/test-slot.mjs -- node --test tests/terrain-structural-spectrum.test.mjs` (the after
runs in one slot hold, 07:26:55-07:30:18Z; walls are node's `duration_ms`, slot otherwise quiet):

| Run | Tiles (massif) | Result | Wall | Real coarse step |
|---|---|---|---|---|
| before, smoke | 24 (20) | 10/10 pass | 28.0 s | 23.6 s |
| before, default | 36 (28) | 10/10 pass | 41.7 s | 34.3 s |
| after, smoke | 24 (20) | 10/10 pass | 30.8 s | 26.4 s |
| after, work | 24 (20) | 10/10 pass | 31.4 s | 24.9 s |
| after, default | 24 (20) | 10/10 pass | 31.3 s | 24.8 s |
| after, gate (`ATLAS_TEST_TIER=gate`) | 36 (28) | 10/10 pass | 41.2 s | 33.4 s |

Identity checks on the `SPECTRUM_ROWS` json (tier label removed): smoke after == smoke before; gate after == default
before (so the 36-tile numbers of `docs/terrain-structural-spectrum-2026-10-07.md` section 3 are now the gate's);
default after real-terrain block == smoke real-terrain block; default synthetic after == before (8 seeds). Default
pooled massif: block comb 0.08 dB, largest harmonic 1.19 dB, injected 16/20 and 2/20; gate: 0.06 dB, 0.95 dB, 23/28,
4/28. `npm test`-equivalent wall of this file: 41.7 -> 31.3 s.

## 2. O12: `tests/terrain-water-refresh.test.mjs`

Changes, title unchanged:
- **Shared renderer fixture.** The private esbuild bundle, Worker stub and texture-loader stub are replaced by
  `tests/terrain-renderer-fixture.mjs` (`rendererModule`, `createRenderer` with a `hold` predicate,
  `releaseHeld`, `nextTurn`); its per-process tile cache `globalThis.__atlasTileFixtureCache` (key
  `body.id|tile|relief|water`) now serves this test. The hold predicate is the old one (the new high bucket and the
  selected leaf key).
- **Hydrology cached per process** (`globalThis.__atlasWaterRefreshHydrology`): drainage, the outlet-3386 region
  (`body.hydrology`) and the canonical set (`body.canonicalRivers`). The canonical set is now built with the pure
  `buildCanonicalHydrology` (the one implementation `primeCanonicalHydrologySync` calls) and id-sorted exactly as its
  `settle()` does, instead of `primeCanonicalHydrologySync` from the private bundle, because the shared bundle does
  not export the registry. Behaviour is the same: inland rivers are withdrawn (`src/inland-rivers.ts`), so
  `hydrologyReady` is true without a registry entry, `activeRiverRegions` is empty for tiles, and the renderer's
  hydrology paths are gated on `inlandRiversEnabled()`.
- Small difference: the old stub caught a `buildTile` exception and answered with `{error}`; the fixture lets it throw.
  On a passing run nothing differs; on a broken `buildTile` the test now fails with the exception instead of a
  stalled-pending assertion.

**P6 repin ledger.** The docs show the P6 values are the decided current ones: `docs/relief-round-2026-10-03.md`
section 1 ("Harness lowered sea: -4500 / -4475 m -> 60% volume lost: Maithea -2425 / -2400 m via `levelForLoss`") and
rule 5 ("Harness seas state a lost-volume fraction, not metres"; `HARNESS_OCEAN_LOSS = 0.6`), implemented in
`tests/helpers/harness-water.mjs` and already used by `ocean-seam-continuity`, `terrain-budget-starvation` and
`terrain-leaf-scenario`. This test predates P6 (last touched `a46bccf`, 2026-09-28) and was missed by the P6 commits.

| Literal | Old (pre-P6 metre ramp) | New (P6, `loweredSeaLevels(body)`) |
|---|---|---|
| initial water level | -4500 m | -2425 m (`lowM`) |
| changed water level | -4475 m | -2400 m (`highM`) |
| initial bucket asserted | -180 | -97 (`lowM / 25`) |
| held / installed bucket | -179 | -96 (`highM / 25`) |

Every assertion is otherwise the same (refined nonroot leaf retained, replacement carries the new level, old tile
installed and visible while pending, new bucket installed, 0 stale patches).

| Run (`test-slot -- node --test tests/terrain-water-refresh.test.mjs`) | Result | Wall |
|---|---|---|
| before (`d08ab6b`) | 1/1 pass | 12.6 s |
| after, run 1 / run 2 | 1/1 pass | 12.8 s / 12.3 s |
| after, in ONE process after `terrain-budget-starvation` (`--test-isolation=none`, both files) | 3/3 pass | water-refresh 5.3 s (budget-starvation 49.7 s) |

**Honest saving: about 0 s when the file runs alone.** A profile (scratch script, under the slot) shows where the
time goes: 355 `buildTile` calls (200 at the low level, 155 after the change), about 11.5 s, with **no repeated
key**, so a per-process cache cannot help a lone run; the private bundle, drainage, region and canonical builds
together cost under 0.6 s. The review's 36 s was the loaded smoke wall. The cache does pay once the file shares a
process with another Maithea renderer test: the P6 repin puts this test on the same `lowM/highM` buckets as
`terrain-budget-starvation`, and the cache then answers 7 of its 12 s (12.1 -> 5.3 s). The old -4500/-4475 levels
could never share a tile with those tests.

## 3. O6: Luna at the gate

Policy in `docs/luna-gate-policy-2026-10-07.md`: at a gate Luna is capture only (build, capture, archive, hashes), no
vote, until a question is CALIBRATED on `tests/visual-controls/<feature>.json` with >= 2 good and >= 2 bad controls;
an explicit `LUNA_VOTE=1` may still vote, advisory. `scripts/luna-capture/luna-capture-massif.sh` implements it
(default: no Luna call; `$OUT/archive/` with reports, logs, exits, window and `luna-sheet-png.sha256`;
`ARCHIVE_ONLY=1`; `LUNA_VOTE=1 LUNA_PROMPT_FILE=...` with a `gate-bar met / NOT met` line; fail-closed flag
checks). `scripts/luna-capture/README.md` updated; `luna-capture.sh`, the capture scripts and `scripts/luna-vote.mjs`
unchanged. Verified with stub slot/capture/vote scripts in a scratch repo (no browser, no GPU, no Luna call): default
run (4 hashes, "vote skipped"), archive-only, vote with calibration (bar met for 2/2, not met for 1/1, other prompt,
unknown question), vote without calibration (NOT-CHECKED), `LUNA_VOTE=yes` (exit 64), calibration without question
(exit 64), vote without prompt file (exit 1).

## 4. Needs (Agent A)

- needs: `package.json` `scripts.test`: register `tests/terrain-structural-spectrum.test.mjs`. Reason: O7; at
  default it is now 24 tiles (see section 1 for its wall).
- needs: `tests/tiers.json`: the spectrum test in smoke and work with two shards, `^INFO: real` (the three
  real-terrain tests share the in-process tile rasters, keep them in one step) and `#rest` (synthetic). Reason: O7.
- needs: `docs/test-policy.md`, VISUAL-ADVISORY rules: one bullet "At a gate Luna is capture only until the question
  meets the gate bar (CALIBRATED, >= 2 good and >= 2 bad controls): `docs/luna-gate-policy-2026-10-07.md`". Reason:
  O6.
- needs: nothing for `terrain-water-refresh` in `tiers.json` beyond O4 (title and file unchanged).
- needs (optional, for O2 / a later shard design, not a decision): to realise O12's saving, run
  `terrain-budget-starvation` and `terrain-water-refresh` in ONE process (`--test-isolation=none`, measured 3/3 pass,
  water-refresh 12.1 -> 5.3 s). Risk: shared globals (`globalThis.Worker`, texture-loader patch) between files; the
  fixture restores them in `dispose()`, but only these two files were tried together. Reason: the per-process tile
  cache only pays across files.

## 5. Files

- `tests/terrain-structural-spectrum.test.mjs` (tier mapping, header comment)
- `tests/terrain-water-refresh.test.mjs` (shared fixture, hydrology cache, P6 levels)
- `scripts/luna-capture/luna-capture-massif.sh`, `scripts/luna-capture/README.md`
- `docs/luna-gate-policy-2026-10-07.md` (new), this document (new)

Run logs are in the session scratchpad only (not evidence of record); the numbers above are copied from them.
