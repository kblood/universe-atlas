# Opus 5.5 canopy water and selection review

Original review of the supplied working-tree snapshot on base 4c776b8bb59a273ceddbb253fec5fdb12626fe99; exact hashes are in the metadata. Genuine claude-opus-5-5 / firstParty, tools disabled. This is source review, not execution or acceptance. The [assessment](canopy-water-review-assessment-2026-09-28.md) tracks corrections and qualifies unverified statements.

# Review: water-cache and bounded-selection increment

This review covers only the source you supplied. I did not inspect the repository, and I cannot see `river-sample.ts`, `regional-landform.ts`, `planet-landforms.ts`, `forest-patch.ts` or `planet-population.ts`. Anything that depends on those files is listed as a precondition, not a verified fact.

**Verdict:** The interval proof is sound for the supplied census path. Cache and buffer ownership is correct. There are four blockers: one watchdog bug, one body-freshness gap, one reconfiguration storm, and one hole in the selection atomicity.

---

## Blockers

### 1. The watchdog kills healthy workers when the host stops calling `prepare`

`prepare` runs the 10 s timeout check before the `!streaming` early return. `selection.started` is refreshed only by `applySelectionSlice`, and that only runs while streaming. Two ordinary situations trigger the bug:

- A selection reply arrives, and then the user climbs above `forestStreamAltitudeM`, enters immersive mode, or backgrounds the tab.
- The `selectionApply` is left queued for more than 10 s.

On the next `prepare`, `failWorker` fires. The second time this happens you reach `terminalFailure`, and the canopy is off for the rest of the session. The wait being timed is host-owned, not a worker stall.

**Fix:** time only the waits the worker owns.

```ts
this.selection&&!this.selectionApply&&now-this.selection.started>10000
```

`ready` and `request` progress arrive through callbacks without needing frames, so they can keep their timeouts.

### 2. Changing the water level reconfigures with the full body every frame, with no coalescing

Every frame where `water!==this.water`, `configure()` posts the whole `Body`, including river geometry. That structured clone runs on the main thread, outside any 2 ms budget.

On the worker, each queued `configure` runs `canonical` → `JSON.stringify` → `structuredClone` synchronously before its first `await`. The work is superseded afterwards but never skipped.

During a date seek this means:
- the worker backlog grows,
- `ready` never arrives,
- retagging never runs.

In other words, the reuse this increment adds is unreachable in the scenario that motivates it.

**Fix:**
- Keep at most one `configure` in flight.
- Split the water into two fields:
  - `configuredWater`: used for patch validation, retagging and `currentPatch`.
  - `targetWater`: used for the uniforms.
- When `ready` arrives and `targetWater!==configuredWater`, reconfigure once.
- Have the worker cache `{snapshot, family}` per body revision, so that a water-only `configure` sends `{generation, waterLevelM, bodyRevision}` and skips hashing.

One caution: do **not** simply defer `configure` while leaving `this.water` at the new value. `receive` validates `forestWaterIntervalContains(p.waterInterval,this.water)`, so a lagging generation would then throw and trigger `failWorker`.

### 3. The body is not immutable from the host's point of view

The supplied `terrain.ts` doc says `canonicalRivers` is built later by `hydrology-registry` and "attached in place onto the resident Body object". `terrainSampler` also falls back to `body.hydrology` when `canonicalRivers` is absent.

`PlanetCanopy` holds `this.body` and reconfigures only when the water changes. If the census is configured before the registry resolves:
- the snapshot and family describe a river-less body indefinitely;
- `currentPatch` and `canHandoff` report those patches as authoritative;
- "absent in a COMPLETE patch proves absence" becomes false near rivers.

**Fix:** in `prepare`, compare identity (or a registry revision) of `body.canonicalRivers` and `body.hydrology` against the values captured at configure time, and reconfigure with the body when they change. Alternatively, don't start the census until canonical hydrology is ready.

Once this is in place, the claim "snapshot equals the hashed content" holds. `canonical` and `structuredClone` run synchronously on the same received clone, so they are already consistent with each other.

### 4. Selection switch is not atomic against installs during the `retries` phase

The eviction scan uses a live `installed.keys()` iterator. Keys that are re-installed during the `evictions` phase get appended and are still visited, so that phase is fine.

The problem is the `retries` phase, which can span frames. During it, `install()` still admits keys against the **old** `desired`. A key that:
- is outside the new window, and
- is installed after the eviction scan finished

is never evicted.

If the camera then stays still, no new selection is triggered. Those patches remain drawn outside the window, and after a later water change they are never requested again (only retagged when their interval allows), so they can stay stale indefinitely.

**Fix** (in `install`):

```ts
const apply=this.selectionApply;
if(apply&&apply.phase!=='addresses'&&!apply.desired.has(key))return;
```

---

## Interval proof

The proof is sound for the supplied code. These are the water-dependent reads in the census path:

| Read | Status |
|---|---|
| `terrainSampler` ocean: `uncrateredHeightM<waterLevelM` | Observed before the branch. Craters are off because `createForestCensus` passes `includeCraters=false`, and the ocean test uses the pre-crater height anyway. |
| `baseTerrainSampler` ocean | Affects only `color`, `roughness` and `localGrain`. `terrainSampler` recomputes `ocean` itself and never reads `sample.ocean`. `elevationM` is computed before the water level is read. |
| `biomeClassifier` ocean: `height<waterLevelM` on `s.groundHeightM` | Observed through `tracked` for every sample, which is a superset of the centres. |
| `s.wet` | Equals ocean ∨ `river.wet`. |
| Recorded `groundHeightM` and slope probes | Determined by the branch outcome, which is covered by the first row. |

**Induction:** thresholds are water-independent heights, and the query sequence depends only on predicate outcomes. So for any water in `(max lower, min upper]`, the path and the full set of evaluated thresholds are identical. That makes chained inheritance W0→W1→W2 with the original interval valid.

**Boundary semantics:**
- `t<w` false puts `t` in `upper`, which is inclusive.
- `lower<w<=upper` guarantees `lower<upper`, so `validForestWaterInterval` never rejects a valid result.

The `body.water` checks are consistent (truthiness everywhere). A body with no water yields `(-∞,∞)`, which is correct.

**Preconditions I cannot verify:** `planetLandforms`, `regionalLandformHeight`, `sampleRiverRegion`, `forestPatch` and `forestRepresentative` must not read the global sea level. In the river branch, `waterLevelM` is shadowed by the region's own level, which is fine provided `sampleRiverRegion` does not compare against the sea level.

**Node tests to include:**
- Recompute with water equal to a recorded upper threshold → must hit.
- Recompute with water equal to the lower bound → must miss and resample.
- A threshold flipped only at a slope probe.
- A patch on a river region.
- A body with no water.
- A two-hop inheritance.
- An interval-excluded patch, compared record-for-record against a fresh census.

The browser 0→25 fixture only exercises the containing case.

---

## Worker reconfiguration races

These look correct:
- **Superseded configures:** `ownGeneration` discards them, and `previous=census??retainedCensus` keeps the last *ready* cache across a chain of superseded configures.
- **Isolation from the previous census:** `inherit` does not mutate it. Shared `records` buffers live only in the discarded census. Returned patches are `slice()` copies, and only those buffers are transferred.
- **Failures:** a failed create leaves `retainedCensus` intact.
- **Early `select`/`patches`:** during the configure await, they receive "not configured" errors, which the host handles.

## Host old-context ownership and full-cache replacement

These are also correct:
- Stale patches keep drawing until they are replaced.
- Family mismatch disables both `currentPatch` and `canHandoff`.
- The full-cache path removes and then reallocates. If the replacement still doesn't fit, the patch goes missing and near/legacy rendering owns that area.
- Retagging is metadata-only and tolerates `install` delete/re-set during iteration.
- Discarding the old eviction list at the switch is safe, because the new scan re-covers those keys.
- On worker restart, `family` is recomputed deterministically, so retagging still works (assuming Blocker 3 is fixed).

The capacity of 229376 is above the roughly 3.1k-patch × 64 worst case for a 4.5 km window, so pinning should only occur through fragmentation.

---

## Verify before merge

- **Non-finite values anywhere in `Body`.** `canonical` throws on these, which makes configure fail deterministically, then restart, then fail again → terminal. Either confirm `Body` is finite plain data, or hash a projection of only the fields the sampler reads.
- **`renderer.retire` and position W.** Confirm it zeroes W. Otherwise a mid-rebase `remove` zeroes `rebase.positions`, but the cursor later rewrites that slot from `bodyPositions` whenever `getW>0`.

## Optional follow-ups

- Require `waterInterval` on patches whenever `family` is non-null.
- Replace the literal `18` in the ready and selection checks with `FOREST_CELL_M`.
- Hash the effective region set instead of `body.hydrology` when `canonicalRivers` is present. As it stands, changing the cosmetic river selection churns the family.
- Out of scope for this change: `terrainSampler`'s ocean baseline reports `waterHeightM`/`waterLevelM`/`visibleHeightM` as `0` rather than `waterLevelM`. The census doesn't read these fields, but other consumers will be wrong at non-zero sea levels.
