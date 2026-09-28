# Opus 5.5 live canopy implementation review

Reviewed the supplied working-tree snapshot on base 0074a5976e249e571587277cdd1d9e8dd75d177f; input hashes are in the metadata. Genuine claude-opus-5-5 / firstParty. This is an original review, not acceptance. The CLI was invoked with tools disabled; the review's reference to greps must not be interpreted as an independent repository inspection. Files not supplied were not verified. Several findings need assessment against current code and existing invariants.

# Live canopy review — base 0074a59 + working tree

I audited the supplied source. My greps of `planet-detail.ts` and `planet-renderer.ts` returned nothing, so two things are unverified:
- whether `B.forestPrepareAltitudeM` equals 3500;
- whether the renderer actually passes `mesh.userData.localAerialSurfaceHit` into `attachLocalAerial`.

Check both before the browser retest.

## Correctness blockers

**1. Every water-bucket change re-censuses and reinstalls the whole canopy.**
`prepare()` calls `configure()` whenever `water!==this.water`. That bumps the generation and clears pending work. Every installed patch then fails `installed.get(key)?.water===water`, so all ~6690 patches are requested again. Reinstalling is capped at 512 trees per frame, which means at least ~300 frames (≥5 s) of churn per bucket, plus full attribute uploads. During that window:
- `canHandoff` returns false for every slot (`waters[index]!==this.water`), so the whole near band stops pairing. Near draws out to the footprint again and legacy representatives reappear. That is a mass ownership/reconcile transition at the start and another at the end.
- Rising water is covered, because the shader tests `treeData.y<=treeWater`. Falling water leaves newly exposed land bare until re-census. Biome changes from water are stale beyond near range.
- During time-lapse playback the canopy may never converge.

Fix, in order of value:
- The census returns a per-patch water-validity interval: the lowest water level at which any cell's habitat or height result would change, and the highest level below which nothing changes. On reconfigure, patches whose interval contains the new level are marked current with no worker work and no GPU writes. Only shoreline patches get re-censused.
- For re-censused patches, diff records against the installed ones and skip slot rewrites when they are identical.
- Relax `canHandoff` to ignore water. Keep the height check and rely on `noteNear` absence suppression, which already works on stale slots. The pairing band then survives bucket changes.

**2. `water` is compared with `!==` against an initial `NaN`.**
If any body ever passes `NaN` (no ocean), `configure()` runs every frame forever. Use `Object.is`, and add a test with a waterless body. `PlanetForest.update` has the same pattern, where it would rebuild samplers every frame.

**3. Streaming starts only once the canopy is visible.**
`prepare()` returns before starting the worker, selecting or installing whenever `altitudeM>=3500`. `PlanetForest.update` also returns early above `forestPrepareAltitudeM`. On descent from orbit, or on spawn, the 153k-tree fill begins as coverage starts ramping at 3500 m. At 512 trees per frame that takes ≥5 s, and patches pop in whole.

Fix: separate `streaming` from `visible`. Stream below roughly 5000 m, or with a lead based on descent rate, and draw below 3500 m. `PlanetForest` must call `prepare` in that band too.

**4. A terminal worker failure leaves a frozen canopy that still claims handoff.**
After the one restart is used, installed patches stay drawn and `canHandoff` stays true, so near stops at 550 m for them. Nothing evicts or refreshes those patches. Neighbouring patches fall back to sparse legacy representatives, producing a permanent density seam.

On a terminal failure, set `disabled`: hide the group and return false from `canHandoff`/`currentPatch`, so near and legacy own everything cleanly.

**5. A request has no watchdog.**
If the worker stops replying without an error (a hung census step, or a message dropped across a restart race), `this.request` never clears. All further patch requests stop, with no error.

Fix: record the send time and treat about 10 s without progress as a request error. That path already reschedules the keys through retries.

**6. The pending limit throws instead of applying back-pressure.**
`pending.length+patches>64` throws, which kills the worker. It is safe today only because requests are strictly serial. Any pipelining change turns it into a crash. Make it a gate on issuing requests, not a validation failure.

**7. The handoff equality check covers height only.**
Near and far must match nominal height (`r[5]` vs `cell.heightM`), yaw (`r[6]` vs `cell.yaw`) and the roll-derived seed. A seed mismatch breaks hash complementarity: the tree shows holes or doubled pixels while in the band.

Store the census height, yaw and roll per slot in a compact Float32 array. Check them in `canHandoff` in dev/diagnostic builds and count mismatches, the way you already count presence disagreements. Zero presence disagreements does not prove the transforms match.

**8. The selection handler does real work inside the message callback.**
This breaks the class's own "message callbacks only queue work" contract. Validating, building up to 32768 string keys, filtering evictions and pruning retries all run in `onmessage`, outside the frame budget. That is the likely source of your 7 ms spike.

Also confirm which spike you measured. `PlanetForest.applySelection` has its own `selectionApplyMs` and its own `wanted.filter` over string maps.

Fix:
- Queue the packed buffer and apply it inside `prepare` in budgeted slices.
- Switch to numeric patch keys: `(face*P + y)*P + x` with `P=ceil(n/8)` stays under 2^53.
- Better still, have the worker send an add/remove delta against its previous selection. It already knows that selection.

**9. Mask mode is fogged.**
The aerial hook replaces `#include <opaque_fragment>` after the impostor's own `treeMaskOnly` line, so masks are no longer 1.0 when aerial is attached. Gate the aerial with `treeMaskOnly`, or apply the mask after the aerial.

## Performance bottlenecks

**A. CPU is the frame limiter (planetUpdate 14.1 ms p50 vs GPU 4.66 ms), and the hot loop runs on string hashing.**
Per wanted cell, per frame, `PlanetForest.update` performs:
- `cache.get`
- `noteNear` → `currentPatch` (Map) → `slots.has` ×2 → `own` → `slots.get` + `seen.add`
- `retainedNear` add/delete
- `canHandoff` (Map)
- `retainedMiddle` add/delete
- `wantInstance` → `own` again

That is about 10 string-keyed hash operations per cell across the full canopy-footprint candidate set. `finish()` then iterates a string Set.

Fix:
- Cache on each `Resident` a `canopySlot` plus a `canopyEpoch`. `PlanetCanopy` bumps the epoch on any install or remove of that id.
- Replace `seen`/`previous` with a `Uint32Array ownedFrame[slot]=frameId` and an `Int32Array` list of the previous frame's owned slots.
- Replace `retainedNear`/`retainedMiddle` with booleans on `Resident`.
- Early-out cells beyond the 600 m band whose patch is current, before the frustum test. For paired cells beyond 600 m, all you need is "not owned".

Before changing anything, get a breakdown: `forest.updateMs` vs `canopy.installMs` vs terrain. I can't place the rest of the 14 ms from the supplied code.

**B. Impostor dirty tracking uploads one span `[dirtyStart, dirtyEnd)` for all three static attributes.**
First-fit allocation means one frame can remove slot 100 and install at slot 200000. That uploads roughly 3 × 3.2 MB in a single frame, and it will happen constantly in flight. "Zero stationary uploads" does not measure this case.

Fix:
- Use block dirty bits, as `commitOwnership` already does (e.g. 64-slot blocks), and emit multiple update ranges.
- `remove()` should write only `positions.w=0`, plus ownership. The shader already rejects `h<=0`, so rotations and parameters don't need rewriting.
- Report flight p95 `uploadBytes`.

**C. The install path allocates per tree.**
- `write()` builds `[...position.toArray(),...rotation.toArray(),…]` for validation.
- `install()` builds an array for `rebase.positions.set([...])`.
- Receive validation calls `Array.from(r).every(...)` per record, which is 153k small arrays on the main thread in message callbacks.

Replace all three with scalar checks and direct typed-array writes. The 512-tree/2 ms budget is probably bounded by this; after the change, allow roughly 2–4k trees/frame for cold fill.

**D. Rebase allocates and uploads the full buffer.**
Each rebase allocates a new `Float32Array(capacity*4)` (3.7 MB of GC), then `replacePositions` copies and uploads the whole capacity.
- Keep one persistent scratch buffer.
- Limit the upload to `instanceCount*4`.
- If `installed` is empty or fully evicted, rebase immediately with no copy. This matters after returning from altitude, where the origin can be hundreds of km stale.

**E. Requests are fully serial.**
One ≤64-patch job must be received and drained from `pending` before the next is sent. A 150 m move adds roughly 65 patches (a 4500 m × 150 m × 2 annulus over 144 m patches). Slack before visible pop-in is about 350 m (4500 selection − 4000 draw − 150 reselect). Sustained speed is therefore bounded by census latency plus drain time.

Allow one request in flight while `pending ≤ 32`, with the back-pressure fix from item 6. The selection gate `!this.selection` also blocks requests during every selection round-trip. Drop it for requests, because keys not in the current `desired` are ignored at install anyway.

**F. Memory.**
- `heights`/`waters` are Float64. `waters` duplicates `installed.water`; drop it. Heights can be Float32 relative to the body radius, or re-read from a Float32 attribute.
- `slots: Map<string,number>` and per-patch `ids: string[]` hold about 153k strings. Derive ids from address + offset and key by numeric cell id `(face*n + y)*n + x`, which also stays under 2^53 at your n.
- `instanceCount` never shrinks. Track the high-water mark and lower it when the tail frees up. This also shortens rebase scans.

## Shader math

The core math checks out:
- **Billboard bound.** `d/(d−R)` ≥ the tangent-cone factor `d/√(d²−R²)` for R ≤ d, and it bounds depth-displaced box corners (`x·d/(d−z)` with |z| ≤ R). The OBB projection onto `right`/`vertical` is conservative for the legacy bound, which I rechecked: lobes and trunk fit within `center ± extent`.
- **Ray setup.** The ray-origin shift, the `(ro−c)/radii` scaling with non-normalized `d`, and the recovery of `treeHit` from the shifted `ro` are consistent.
- **Normals.** Scaled normals use `n/radii` (inverse transpose). `treeNormalMatrix` from the scaled modelView is fine for uniform scale.
- **Depth.** Log depth `log2(1−viewZ)·FC·0.5` matches Three's `vFragDepth = 1 + gl_Position.w`.
- **Aerial hook.** `treeHit`/`treeHitView` sit at `main()` scope, since `logdepthbuf_fragment` is top-level in Lambert, so the hook's references resolve. `atlasAirObjectToPlanet*treeHit` gives planet units correctly.
- **Hash split.** Near draws hash < near, far draws [near, edge), same per-pixel hash and seed derivation, level 256 = all. The split is correct.

Needed changes:

1. **Derivatives after a non-uniform discard.** `fwidth(gap)` runs after the per-pixel hash `discard`, which varies within a 2×2 quad by design. That is undefined in GLSL ES 3.0. D3D11/ANGLE on your RTX 5090 keeps discarded lanes alive as helpers, so it works there. On Vulkan, Metal or mobile drivers, discard may terminate the lane and AA edges become garbage.
   Fix: compute the hash but defer the `discard` until after intersection, or fold it in as `coverage=0` with a single final discard. Then verify on a non-ANGLE-D3D backend.
2. **Use `flat` on per-instance varyings.** `treeRootHeight`, `treeQ`, `treeData`, `treeNearLevel` and `treeEdgeLevel` are constant per quad. Perspective interpolation of equal values is not exact in f32. The `+.5` rounding saves the levels, but `flat` is free, exact, and cuts interpolant cost. Three's macro path turns `flat varying` into `flat out`/`flat in`.
3. **Cost of every fragment.** 4 lobes × 20 planes + 6 trunk planes is about 86 plane tests per fragment over the whole quad. `gl_FragDepth` also disables early-Z for 153k quads. Add a cheap per-lobe ray/sphere (or slab) reject before the plane loop. That is the main GPU lever once real assets and weaker GPUs arrive; 4.66 ms total on a 5090 will not hold on mid-range parts.
4. **Top-down basis flip.** At 3000–3500 m looking straight down, `cross(axisY,facing)` passes near zero and switches to the `axisZ` fallback, so the quad basis rotates abruptly. The bound stays conservative, so there is no visual error, but the switch also changes `pixelMargin` orientation. Consider building the basis from the view `up` when `|dot(axisY,facing)|>0.99`.
5. **Close fallback.** The NDC z=0 full-screen quad is correct as a guard. However, several unowned trees within 1.1 × boundRadius each shade the full screen through 86-plane loops. Keep `farForcedClose` counting it, and treat any nonzero value in flight as a bug, not only a diagnostic.
6. **Coverage AA mixes two mechanisms.** With MSAA, alpha-to-coverage edge AA applies inside the screen-door hash on the far side, while the near mesh relies on geometric MSAA. That is acceptable, but the "final alpha/depth at game-unit scale" test should compare the two at the 550–600 m band, not only at distance.

## Ownership/frame transaction

The ordering is right: prepare (install/rebase) → near loop (own/noteNear) → finish (reset previously owned, commit), all before render. Reused-slot clearing via `write→setOwnership(0)` is tested. Remaining gaps:
- **Frustum-gated ownership.** Near trees outside the frusta don't claim ownership, so the far draws them off-screen. That is harmless visually but churns ownership uploads while rotating. Confirm `frusta` includes every view that renders the far mesh.
- **Paired status flips.** When a patch installs mid-flight, trees inside 550 m flip from unpaired to paired in the same frame. That is correct, but for near trees between `footprint−130` and the footprint, fade coverage jumps to 1 and they are cut at 600 m. Include this in the moving-flight image tests.

## Tests to add (mocked host)

1. Water change with installed patches: water-independent patches stay current with no request (after fix 1); stale slots keep handoff; submerged slots are suppressed.
2. Request error after a partial flush: completed patches install, remaining keys back off, and a later selection clears retries for keys no longer desired.
3. Rebase interleaved with an install and a remove of the same key mid-slice.
4. Selection change while evictions are pending and capacity is near full, verifying no capacity miss that eviction work was about to resolve.
5. A worker that never replies triggers the watchdog (after fix 5).
6. A waterless body and a `NaN` water value do not reconfigure every frame.
7. Near/far parameter equality (height, yaw, seed) for the live selector vs the census across a real patch, as a node test using the actual census rather than the mock.

## Priority order

1 (water re-census), A (CPU string hashing), B (upload span), 8 (selection apply in callback), 3 (prefetch above 3500 m), shader item 1 (derivatives after discard), then 4–7, C–F, and the remaining shader items.
