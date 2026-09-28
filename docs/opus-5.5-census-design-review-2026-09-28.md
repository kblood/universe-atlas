# Stage E review: full forest census and far representation

Source is limited to what you supplied. I have not seen `terrain.ts`, `surface-biomes.ts`, the worker entry, the renderer setup (log depth, MSAA, Three revision) or where the dated life gates are applied. I state assumptions about these where they matter. Nothing below is measured.

## Verdict

- **Build exact per-tree analytic impostors as the stage E far layer.**
- **Remove aggregate clumps from stage E.** They reduce instance count, but instance count is not the constraint.
- **The new cost is fragments, not triangles.** The far layer will shade about 18× more covered pixels than today's 6.5% layer.
- **The draft is sound but missing three things that change the design:**
  1. The complementary handoff cannot be built on `alphaHash`.
  2. Readiness has to be a computed radius, not a threshold.
  3. The water-bucket invalidation policy is undefined.

## 1. Numbers that decide it

**Correction to the candidate count.** The area gate normalises accepted cells to about 1 per 324 m² everywhere. At a face centre the acceptance is exactly 1.

| Stage | Count within 4.5 km |
|---|---|
| Area-accepted candidates | π·4500²/324 ≈ **196k** |
| After `roll < .76` | **≤ 149k**, reached only in 100% forest |
| Inside the 4 km render radius (`forestRadiusM` is slant distance) | **≤ 118k** at ground level |

Presence at 180k is not reachable without changing the population.

**Triangle and vertex counts:**

| | Current | Proposed |
|---|---|---|
| Far layer | 8192 × 96 tri = 786k tri, 2.36M non-indexed vertices | ≤ 150k × 2 tri = 300k tri, 600k vertices |
| LOD1 mid batch (the same 96-tri detail-0 mesh) | 4096 × 96 = 393k | unchanged, about 3.1k trees at full density within 650 m |

**Fragment estimate.**
- Assumptions: 1440p, 60° vertical FOV, mean h² ≈ 268 m², capsule quad area ≈ 0.91h², full forest.
- Integrated over 650 m to 4 km, that gives about 3M quad fragments, roughly 0.85× the screen.
- About 55% of those fragments hit the crown.
- With log depth or discard there is no early-Z, so all of them are shaded.
- Four ray–ellipsoid tests per fragment should cost under 1 ms on a desktop GPU. This must be measured.

**Clumps solve nothing that matters here.** They add a union-coverage error model, which amounts to invented density. They blur slope and river edges, double-count representatives, and have no one-to-one identity at handoff. Keep them only as a possible XR fallback or for a range beyond 4 km, and only with a stated error bound.

## 2. Far layer: recommended starting representation

### Geometry and draw call

- Use one `Mesh` with an `InstancedBufferGeometry`: one quad (4 vertices, 6 indices), `frustumCulled=false`, one draw call.
- Do **not** use `InstancedMesh`. `attachLocalAerial` injects `instanceMatrix*` under `USE_INSTANCING`. With a plain `Mesh`, `begin_vertex` places the instance into `transformed`, and the aerial code, `project_vertex` and the Lambert path all work unchanged.
- There is no per-frame per-instance CPU work.

### Instance record (48 B, simple f32; pack later for XR)

| Component | Contents |
|---|---|
| A | `offset.xyz` in metres relative to the far-layer origin; `heightM` |
| B | quaternion (up-align + yaw), computed with the same code as `writeInstance` |
| C | `roll`, `groundHeightM`, spare, spare |

- Factor out `treeQuaternion(direction, yaw, out)` so near and far share the tree basis bit-for-bit. Don't re-derive `setFromUnitVectors` in GLSL, because it has a singularity near the pole.
- `mesh.scale = 1/R`, so shader maths is in metres.
- The far origin is rebased only when the eye is more than 8 km away. Offsets then stay under 13 km, giving sub-mm f32 error. A rebase rewrites about 2 MB from a CPU mirror of Float64 positions. It is rare and one frame long; measure the spike.
- Keep `groundHeightM` explicit. Deriving it from |absolute| in f32 has 0.5 m error, and the submerged-hide rule needs to match the near path.

### Allocation

- **Chunk** = 4×4 census patches (32×32 cells). This is the residency and eviction unit.
- **Page** = 16 slots. Each chunk owns a chain of pages. Patches append to their chunk's tail and are never rewritten.
- Chunks rather than per-patch pages, because of face corners. There, the cube Jacobian makes patches cover about 0.19× the area. That means about 5× as many patches, each holding about 12 trees. Per-patch pages would waste up to about 120k slots.
- Unused slots have `heightM=0` and are collapsed in the vertex shader.
- A page returns to the free list when its live count reaches 0.

### Vertex shader

- Build a camera-facing capsule quad:
  - the axis is the tree's up vector projected into the view plane, falling back to camera-right when degenerate (top-down views);
  - the long extent runs from the base (extended below ground by the terrain-LOD error bound) to the crown centre + r;
  - the half-width is r.
- Crown envelope from the shape table: centre (0, .74, −.03)h, r = .40h (lobe-exact maximum of |c−C|+s).
- Apply the perspective factor d/√(d²−r²) so the bound stays conservative at close range.
- Collapse the quad if w = 0 (inside R_in), if beyond the 4 km fade, or if `groundHeightM ≤ water` while stale.

### Fragment shader

- Ray-cast in **object space**: `camObj` is a uniform computed in `onBeforeRender` in doubles relative to the far origin, and the fragment's object position is a varying.
- Intersect the 4 ellipsoids with radii (s, .85s, s), plus the trunk cylinder, from the **same table** as `treeGeometry`.
- The nearest hit supplies:
  - the normal, fed in via `normal_fragment_begin`;
  - the lobe colour `[.16+y·.06, .29+y·.04, .08]` × the roll tint;
  - depth.
- Depth, if log depth is on: replace `logdepthbuf_fragment` with `gl_FragDepth = log2(1.0 - hitView.z) * logDepthBufFC * 0.5`. Early-Z is already lost in that case.
- Depth, with standard depth: start with flat quad depth to keep early depth testing. Treat hit depth as an experiment.
- Aerial perspective: use the quad-plane position. The error is ≤ crown radius (about 9 m) against a 65 km fog scale, which is negligible.

### Calibration (a blocker; see §7)

LOD1 is a flat-shaded detail-0 icosahedron with its vertices on the unit sphere. Its projected area is noticeably below the circumscribing ellipsoid. Without correction, the band shows a density step on the order of 20%.

- Add a `lobeRadiusScale` fitted so that mean projected area matches LOD1 over many view directions.
- Document it as proxy calibration, not a dimension change. Heights, roots and yaw are untouched.

### Adequacy of analytic ellipsoids vs baked multi-angle impostors

- For the current authored tree, the analytic impostor **is** the shape description: four ellipsoids plus a trunk. It is valid at any distance, including when readiness collapses R_out close to the eye. It is also smoother than LOD1.
- It is adequate as the stage E representation, not only a throwaway prototype.
- Baked octahedral or multi-angle impostors are needed only when an alpha-textured asset family arrives. For now, define the interface `TreeShape {lobes, trunk, envelope{r, centre, top, baseExtension}, coverageCalibration}` and build no baking pipeline.

## 3. Census work: extend the existing worker, cooperatively sliced

- Reuse the `ForestSelectionCache` patch store: it already holds the Float64 jittered direction, roll, height and yaw. Expose `patchCells(face,x,y)`.
- Selection messages preempt census between slices.
- Split into a separate worker only if selection latency regresses by more than one slice. That would duplicate the 32 MB population cache.

**Exact short-circuit.**
- `roll ≥ .76` implies absent, with no terrain sample.
- Export the threshold constant from `forest-habitat.ts`, with no behaviour change, and add an equivalence test.
- Absent cells need no height on the render path. `summarizeForestPatch` then needs a presence-only state; keep it for tests and diagnostics only.
- Everything else calls `forestHabitat` unchanged, so the one-axis slope rule and identity are preserved.

**Protocol.**
```
main→worker  census-context {contextId, body, water, versions:{population, habitat, terrain, biome, lifeGates?}}
main→worker  census-focus   {contextId, seq, ground, forward}      // ≤ every 250 ms, or on 100 m / 15°
main→worker  census-ack     {contextId, batchSeq, evicted: Int32Array(face,x,y…)}
worker→main  census-batch   {contextId, batchSeq, buffer}           // transferable
```
- The context key must include whatever feeds the dated life gates. I don't see them in `forestHabitat`.
- `context` drops the queue and clears or keys the worker cache. The in-progress patch finishes (≤ 64 candidates).
- `focus` makes the worker re-enumerate patches within 4.5 km, reusing the bound test in `select`. They are ordered by `distance/(1+0.5·max(0,cos∠forward))`, excluding patches already sent that are not reported evicted. The worker **replaces** its queue but keeps its cache, so resume after a direction change is a cache hit.
- Each batch record carries a patch header `{face,x,y,state: empty|trees,count}` followed, per present tree, by: absolute position (f64×3), quaternion, heightM, roll, groundHeightM and a cell offset byte.
- Main subtracts the far origin in doubles and rejects any `contextId ≠ current`.

**Flow control.**
- At most 2 unacked batches; each batch ≤ 64 patches or ≤ 256 KB.
- A slice is ≤ 8 ms or at least one patch. Yield via `MessageChannel`.

**Main-side patch states:** `unknown | installed(ctx) | empty(ctx) | stale-installed`. Unknown ≠ empty. Only unknown patches fall back to representatives.

**Water-bucket context change.**
- Installed patches become stale but stay drawn.
- The shader hides `ground ≤ water` immediately, matching the near rule.
- A new-context patch appends to its chunk and zeroes its old slots in the same frame.
- Cap transitioning chunks at 32 and reserve 32k slots for them.
- Carrying results forward for patches far above water needs a proof from `terrain.ts`. That is an experiment.

## 4. Readiness-gated handoff

**Complementary mask.** The mask must be screen-space and shared, salted per tree:

```glsl
float atlasForestHash(float salt){return fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))+salt*.7548776662));}
// near: discard if hash(roll) >= 1-w      far: discard if hash(roll) < 1-w
```
- Global fades (altitude, the 4 km edge) use a second, independent hash in **both** materials, so the union is preserved.
- This replaces `alphaHash` in `forestMaterial`. Its object-space hash cannot be complementary between two different primitives.

**Distance metric.** w is a function of the chord between the tree's ground anchor and a handoff anchor point.
- Near: CPU doubles written into `instanceCoverage`.
- Far: GPU f32 from local offsets and a uniform.
- The mismatch is at mm level, on the order of 1e-5 of pixels in the band.

**Readiness radius.** Computed once per frame, before emitting, in a pre-pass over `this.wanted` (≤ ~12k cells):
- `R_sel = 750 − |ground − C_selection|·R − 20`. This covers selection lag during fast flight.
- `R_unres` = the minimum horizontal distance of any wanted cell that is missing, or cached under a different water bucket.
- `R_cap` comes from a 10 m-bin histogram of present, in-frustum trees. It is the largest radius whose cumulative count fits the near+mid capacity. XR's `[64,1024]` then shrinks it naturally.
- `R_out = clamp(min(650, R_sel, R_unres − 10, R_cap), 0, 650)`, `R_in = max(0, R_out − 60)`.

**Per-tree ownership:**

| Condition | Owner |
|---|---|
| Far patch installed, h ≥ R_out | far only |
| Far patch installed, h in the band | near 1−w / far w |
| Far patch not installed, h < R_out | near at coverage 1 |
| Far patch not installed, h ≥ R_out | existing representative batch, today's fallback |

- This removes the `canopyRepresentative && horizontal > 550` path once the far layer is present.
- Invariant: a tree that has been drawn is never undrawn, except by true absence or submergence.

## 5. Order of work (each step visibly closes coverage)

1. Extract the shared shape table and `treeQuaternion`. Build the far material. Census one fixed region synchronously in a debug path and compare it against a full individual-mesh reference render. This gives a visible result immediately.
2. Add worker census, chunk and page allocation, and patch states. Gate the representative fallback per patch. Use a provisional fixed band so full coverage is on screen.
3. Replace the band with the complementary hash and the readiness radius, and add the calibration.
4. Add the measurement harness and tune the budgets.
5. Build the XR profile separately.

## 6. Starting desktop budgets (unmeasured; rescale once sampler cost C_s is known)

| Item | Budget |
|---|---|
| Far slots | 196,608 + 32,768 transition reserve × 48 B ≈ 11 MB GPU, plus a Float64 CPU mirror of about 5 MB |
| Worker census cache | ≤ 16 MB / 40k patches; population cache stays at 32 MB, shared |
| Residency | install and demand to 4.5 km; evict chunks beyond 4.8 km, farthest first; never evict inside 4 km |
| Main install | ≤ 1 ms and ≤ 256 KB upload per frame; far per-frame CPU ≤ 0.2 ms (uniforms only) |
| GPU far layer | ≤ 1.5 ms at 1440p on the reference desktop GPU (timer queries) |
| Cold residency | ≤ 1 s to complete 1 km and ≤ 8 s to complete 4.5 km from context-ready, if C_s ≈ 10 µs |
| Warm traversal | zero unknown patches inside 3.5 km at 150 m/s steady state; report 300 m/s |
| Selection latency | p95 regression ≤ one slice |

The cold-residency model is ≈ 149k × (3·C_s + C_biome) for full forest, which is about 5 s at 10 µs. Nearest-first ordering completes 1 km in about 5% of that.

## 7. Blockers vs experiments

**Blockers.** Without these the result is wrong, not just slow.
1. The complementary screen-space hash in near **and** far materials. `alphaHash` cannot do it.
2. The readiness radius plus per-patch far-installed gating. Otherwise there are holes during selection lag or capacity overflow, or double density.
3. The water-context policy: stale-installed, shader submerge-hide, per-patch replacement. Also needed: the real bucket cadence against census completion time.
4. The shared shape table and projected-area calibration against the LOD1 facets.
5. The far layer as a plain `Mesh` with placement in `transformed`, for aerial correctness. If log depth is on, hit depth must go through the `logdepthbuf_fragment` override.
6. The sampler cost you are measuring now. It gates the budget numbers, not the design.

**Must-measure acceptance risks.**
- Terrain-LOD vertical error at 1–4 km. At full density, floating or buried crowns on ridges become obvious. Extending the trunk below the base handles floating trees; buried trees are not handled.
- The hard outer edge of dense forest at 4 km against bare terrain. Terrain albedo will probably need a canopy tint later; that is out of stage E scope.

**Experiments (not blocking):**
- alpha-to-coverage vs hash for sub-4-px shimmer;
- hit depth vs flat depth under standard depth;
- facet-snapped normals to match LOD1;
- impostors taking over from about 250 m to retire most of LOD1;
- multiple census workers;
- water carry-forward with a proof;
- install fade-in;
- per-tree stochastic whole-tree switching for XR (screen dither differs per eye) and as a desktop fallback if dither swims;
- packed 24 B records for XR;
- baked impostors when a textured asset family arrives;
- clumps only for XR or beyond 4 km.

## 8. Tests

1. **Census equivalence.** For random patches, including face seams and corners: census presence and ground height equal `forestHabitat` on the main path in the same context. The roll short-circuit gives identical presence bits.
2. **Completeness.** The union of demanded patches contains every candidate from `populationCells(..., 4500 m)` with no `farSubset`.
3. **Context.** Stale `contextId` batches are rejected. A water change cancels within one slice. Re-focus returns cached patches with zero sampler calls.
4. **Bounds.** Under a random walk and teleport script, the queue, unacked batches, cache bytes, free pages and transitioning chunks all stay within their caps.
5. **Ownership invariant.** In a frame simulation, every present on-screen tree within 4 km has exactly one owner (or the documented complementary pair), and a drawn tree never becomes undrawn.
6. **Hash complementarity.** A JS reference of the shader functions shows that the near+far masks partition the pixels. A GPU band render matches the full-near and full-far references within ε in coverage.
7. **Precision.** Reconstructed positions and quaternions against doubles: < 1 mm, and bit-equal quaternions against `writeInstance`.
8. **Shape.** Projected area of impostor vs LOD1 within ±3% over 64 directions. No ray hit falls outside the quad (render with the quad inflated 2× and compare).
9. **Reference comparison.** Clear weather, fixed poses and heights. Compare per-screen-tile canopy coverage and luminance of full individual meshes (offline, about 14M tri) against the impostor layer.
10. **Performance harness.** Cold latency; warm traversal at 50, 150 and 300 m/s; CPU and GPU frame times; transfers; resident bytes; draw calls.

## 9. Draft doc edits

- State the count correction: ≤ 149k present within 4.5 km and ≤ 118k inside the 4 km render radius.
- Name the render units: census patch (8×8), residency chunk (4×4 patches), allocation page (16 slots).
- Add the `stale-installed` state.
- Replace "readiness attached to stable regions" with the explicit R_out rule and the per-patch far gate.
- Specify that the complementary mask is screen-space and shared across both materials.
- Record the roll short-circuit as exact.
- Note the 4.5 km selection vs 4 km slant render radius. Today about 20% of the selected representatives are never drawn, which wastes main-thread habitat work.
