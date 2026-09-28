# Full forest census and far representation experiment

This is active stage E design work after the deployed packed-transfer release.
The worker census and isolated individual-tree experiment now exist; neither
is integrated into the game or accepted as a deployed rendering feature.
See the [review fixes](forest-census-review-fixes-2026-09-28.md) and
[representation measurements](forest-impostor-experiment-2026-09-28.md).

## Required outcome

The current 650 m dense footprint fades to a 6.5% sample of the same trees.
Replace the missing distant population with a representation derived from all
canonical cells and the exact shared habitat query. Roots, heights, yaw, roll,
water/hydrology context and dated life gates stay authoritative. Camera position
chooses residency and priority, never tree existence or dimensions.

## First implementation boundary

- Census existing 8×8 canonical patches with the real terrain and biome sampler
  in a browser worker. Initially evaluate every area-accepted candidate exactly;
  do not inflate one sampled dry point into an entire stratum's presence.
- Freeze a body/hydrology snapshot for each context and include terrain, biome,
  habitat, population and water context in its provenance. Context changes
  cancel obsolete work; stale results cannot be installed. Near and distant
  paths must agree for every resolved candidate.
- Bound worker slices, pending requests, resident bytes and transfer sizes.
  Cache completed patches; motion changes priority without repeatedly dropping
  useful work. Unknown, empty and completed patches are different states.
- Share the current tree shape/dimension description with near meshes and
  distant representations. A later asset family supplies its own measured
  alpha coverage, shape and physical envelope.
- Keep readiness attached to stable regions. A distance threshold alone cannot
  remove the last available representation while the replacement is loading.

## Representation comparison to review and measure

1. **Exact individual impostors:** one small view-facing primitive per present
   canonical tree, packed into static spatial chunks. No habitat aggregation
   error or invented forest density. All-instance memory, fragment/alpha cost,
   view-dependent silhouette/depth, lighting and near handoff need measurement.
   An analytical crown proxy is only a prototype; final asset impostors must
   derive from the actual geometry/alpha. Keep position calculations in doubles
   until converting to a stable local chunk origin.
2. **Exact-census aggregated clumps:** the previous Opus proposal groups nearby
   non-representative trees into a bounded canopy representation. Lower instance
   count, but summed projected crown area is not union coverage. Overlap,
   slope/river smearing, silhouette, representative double counting and handoff
   need explicit tests before acceptance.

Both need the full authoritative census, unless a later measured approximation
has a stated error bound and exact treatment of habitat edges. Reusing only
the current sparse representative selection cannot solve the coverage problem.

The prototype must compare the same cleared-weather terrain/forest region
against a full individual-tree reference at multiple camera poses and heights.
Measure cold residency latency, warm traversal, CPU/GPU frame times, transfers,
resident memory, draw calls and projected coverage. Preserve clear-weather
visibility; atmosphere must not hide incomplete occupancy.
