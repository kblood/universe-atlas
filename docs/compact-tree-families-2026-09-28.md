# Compact tree family integration

Local implementation; not yet the default published forest.

The forest now supports a branching and a spire asset family together. Each
family has separate near/middle instance batches, sharing its two-LOD geometry
and materials. Canonical selection still owns the overall near/middle limits;
adding a family does not multiply the number of selected trees.

Each detailed batch contains only supported residents. A departure fills its
slot from the tail; surviving slots retain their identity across enumeration
changes. There are no hidden detailed placeholders for unsupported species or
heights. Transforms and colours are rewritten only after a resident, catalogue,
slot or retained origin changes. Coverage still follows canonical canopy
ownership in both colour and depth passes.

Legacy mixed batches still have hidden detailed slots; when all their selected
residents have supported detailed families the entire legacy batch is hidden.
This removes its vertex submissions. Distant census crowns are still legacy
shapes and need matching family presentation.

## Loading and fallback

`loadForestTreeFamilies([{kind, lod0, lod1}, ...], options)` is a development
integration seam, like the earlier single-family loader. It accepts at most one
branching and one spire entry. The earlier loader remains a branching-only
wrapper. Both use the same atmosphere, dated wind, coverage and physical leaf
contracts. The local [normal Trees control](forest-asset-loading-2026-09-28.md) now fetches the packaged pair when enabled; it is still awaiting browser acceptance and publication.

Replacement is atomic: all families and their batches are prepared before the
current library is released. Failed or cancelled loads dispose staged resources
and preserve the existing renderer. The latest request wins. Clearing or
disposing the forest also invalidates pending loads.

The current height envelope remains the canonical 10–22 m proxy. This change
does not implement the full species allometry, structural variants, matching
far crowns or accepted default asset packaging.

## Evidence and next checks

38 focused tests pass across compact slots, integrated forest assets, retained
forest placement and coverage. New cases cover both families, exact aggregate
submission counts, hidden legacy batches, family reassignment, empty/regrown
slots, partial replacement failure, duplicate inputs and cancellation between
family parses. The fake GPU writer enforces the real loader's contiguous
initialization rule. These are CPU checks, not measured frame-rate gains.

The subsequent [actual-game browser run](../test-results/compact-tree-families/README.md)
loaded both Oak and Pine with detailed lighting. Their submitted instance counts
matched the visible supported counts: 95 near and 651 middle trees combined.
The Oak date-return check preserved all 16 sampled identities, recipes, heights
and wind offsets. Its 24.8 m movement did not cross an origin rebase.

The Oak profile still measured 52.6/66.9 ms frame p50/p95 on the RTX 5090 fixture,
with 33.2/41.7 ms planet CPU time. The geometry and population differ between
legacy, Oak and combined captures, so their triangle/frame differences do not
prove a compaction speedup. CPU samples still concentrate in forest selection
and canopy checks. Pine looks thin and the far canopy remains visibly different.

Next: [offline foliage mips](offline-foliage-mips-2026-09-28.md), fewer repeated
far-candidate checks and matching far crowns. Loading/settings, believable
appearance and measured performance remain required before default acceptance.
