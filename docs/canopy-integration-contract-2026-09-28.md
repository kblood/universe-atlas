# Proposed live canopy integration contract

Draft for the next implementation stage. The census worker and renderer lab
are committed, but this host/renderer connection is still being implemented.
The [completed Opus review](opus-5.5-canopy-integration-review-2026-09-28.md)
supports per-instance ownership and requires the corrections below.

## Review decisions

- Quantize coverage to 257 levels (0..256); use the identical unsigned integer
  screen hash in every owning shader. A per-tree seed decorrelates different
  trees while remaining identical for both representations of one tree.
- Use a separate dynamic Uint16 ownership attribute (256-slot / 512-byte dirty
  blocks), with static transform attributes. Full=256 suppresses far rendering
  both for a near owner and for a current near query proving absence.
- Allocate each complete patch contiguously with generation-checked tokens.
  Installs, near ownership and GPU flush occur in that order in one update.
- Prefer a binary middle-mesh/far-proxy handoff beyond the close LOD range,
  with hysteresis. Keep fractional coverage for outer/altitude fades and the
  existing fallback. Verify image differences in the game before acceptance.
- Collapse zero-weight quads in the vertex shader. Close fault cases need a
  bounded full-viewport ray path and a `farForcedClose` counter.
- Verify actual game depth mode, canvas/postprocess alpha and lighting hooks.
  Far canopy remains off in XR until stereo and multiview acceptance.
- Move patch-window enumeration into the census worker, leaving only bounded
  request/response decoding and installation on the main thread.

The review's illustrative upload totals must be replaced with actual capacity
accounting: a 229,376-slot vec4 position buffer is 3,670,016 bytes. The original
crown has 20 planes per lobe; the review's plane-count shorthand is inaccurate.

## Exact ownership during approach

Each installed far slot belongs to one canonical tree ID. The existing near
loop already determines which resident trees actually obtain a draw slot.
For each admitted tree with a compatible installed far record, transfer its
near coverage to that slot's parameter attribute. A missing near draw uses
zero near coverage, whether caused by pending placement, capacity or culling.

Let `E` be the common outer-distance/altitude coverage, `N` the admitted near
coverage, and `H` a shared screen-space hash in `[0,1)`, with `0 ≤ N ≤ E ≤ 1`:

- Near mesh draws where `H < N`.
- Far proxy draws where `N ≤ H < E`.

This partitions coverage without a global spherical readiness threshold.
Object-space alpha hashing cannot provide this pairing because two different
representations sample different object positions. Surface antialiasing still
needs separate validation. The distant proxy matches the middle mesh's
faceted shape; the existing close-tree LOD change at approximately 110 m is a
separate transition to revisit with the authored species assets.

Known complete, pending, failed and absent patches remain distinct. Suppress
the legacy sparse far sample only for installed complete patches. Missing
patches retain the existing representation. A near/far pair must agree on
context, root height and identity; coverage alone cannot repair different
water/hydrology snapshots. Current census results may refresh near-cache
decisions so both representations use the same authoritative answer.

## Bounded host work

- One worker request in flight, at most 64 patches. Drain its bounded install
  queue before requesting another batch. Ignore old generation/request/context
  replies. Retain valid completed patches if another patch fails.
- Install whole patches atomically within a candidate 512-instance/2 ms frame
  budget. A partial allocation is never advertised as ready. Measure actual
  cold fill time and movement throughput before choosing final budgets.
- Candidate capacity: 196,608 resident tree slots plus 32,768 transition slots,
  bounded ID/patch maps and explicit eviction. Separate CPU retained bytes,
  GPU attribute bytes and worker-cache estimates in diagnostics.
- Re-evaluate conservative 4.5 km patch residency after approximately 150 m
  of motion, prioritizing inner patches. Measure this enumeration on the main
  thread; move it to a worker if it causes a spike. Ordinary movement finishes
  the small current request rather than continuously cancelling its work.
- Keep overlap. Evict only beyond the residency shell, with the actual draw
  radius still 4 km. Fast travel and missed deadlines must retain useful
  fallback geometry and report incomplete coverage.

## Precision, updates and dated state

Use metres relative to a retained far origin; subtract in doubles before
Float32 upload. The existing near group can rebase independently. An 8 km far
origin threshold is a starting proposal, not an accepted precision bound.
Prepare a replacement origin snapshot before switching; never mix two origins
inside one installed batch. Prove near/far agreement through rebases and seams.

Near ownership changes must update only parameter data, with bounded dirty
blocks/ranges. They must not trigger full position/quaternion uploads. No
per-frame CPU scan over the entire distant population is permitted.

Existing life eligibility and preparation-altitude gates apply to both paths.
Water changes invalidate census context. Retain explicitly stale installed
geometry while work catches up, hide submerged roots immediately, and replace
each patch atomically. Canonical hydrology changes must create a new snapshot.
The XR profile remains separate until measured.

Shared aerial perspective must use the ray hit position/depth instead of the
billboard plane. Shader callbacks need the actual rendered camera, including
stereo eyes. Use the existing material-hook composition rather than replacing
the other hooks. Error fallback and disposal must release workers, queues,
attributes and retained maps.

## Acceptance before enabling

Cold and warm 50/150/300 m/s traversals; stationary turns; partial residency;
worker rejection/restart; water and dated life changes; capacity exhaustion;
rebases; face seams; clearance from descent through landing. Verify occupancy
and paired coverage as well as visible screenshots. Test game MSAA 0/2/4,
depth, lighting and aerial perspective in the actual postprocess pipeline.
Report CPU/GPU timings, upload bytes, queue bounds and missing coverage.
An isolated RTX 5090 result is insufficient to establish a desktop floor.
