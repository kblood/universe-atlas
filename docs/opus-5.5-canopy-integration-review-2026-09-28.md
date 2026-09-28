# Opus 5.5 canopy integration review

Reviewed prototype source at deb9ca8d342308734d63d4fae57a9b4c926dd599 and the supplied integration proposal.
Genuine model: claude-opus-5-5 (firstParty; see metadata).
This is the original review, before integration fixes. It is not runtime acceptance.

# Review: far-tree proxy at deb9ca8 and the proposed live integration

**Verdict.** Adopt exact per-instance complementary ownership instead of the global readiness radius. The shader is sound for the isolated lab. The items below must be fixed before the proxy is enabled in the game; most are small. The biggest risks are in the pairing contract (bit-exactness, a missing third ownership state, same-frame atomicity), not in the ray-polytope math.

---

## 1. Hard blockers before enabling

### B1. Zero-weight far instances must collapse in the vertex shader

Today every installed slot rasterizes its quad and runs the full crown and trunk test (24 crown planes plus the trunk) before any discard. Under pairing, the ~3.5k near-owned trees still have far slots, and many are 5–50 m away. `forest-impostor.ts` computes:

```glsl
perspective = d / max(.001, d - boundRadius)
```

When `d ≤ boundRadius` (≈0.74h, so 7–16 m), that factor becomes about 1000×d. The quad then covers the screen, and every pixel runs the full shader only to fail the hash. There is no early-Z because of `gl_FragDepth`.

Fix:
- In the vertex stage, compute `qNear` and `qEdge` (see B2) plus the water, life and altitude gates. If `qEdge ≤ qNear` or any gate fails, set `transformed = root` so the quad is degenerate.
- Give the `d ≤ ~1.1·boundRadius` case a defined, bounded behaviour. A far tree that close is only drawn in fault cases, such as near capacity overflow or a near frustum miss. The correct option is a viewport-covering clip-space quad with the ray taken from the inverse projection. The cheaper option is to clamp the factor and accept clipping.
- In either case, add a CPU counter `farForcedClose`: installed, within 2·boundRadius, `qNear < qEdge`. It should read 0 in normal play.

### B2. Complementarity must be bit-exact, not float-equal

A float hash (sin- or fract-based) compiled into two different programs can round differently under FMA contraction. That yields rare pixels that both paths draw, or neither draws. Make the whole contract integer:

- Hash: `uint h = pcg2d(uvec2(gl_FragCoord.xy)).x & 255u`, as one GLSL string shared by all forest materials.
- Coverage is quantised to **257 levels, with full = 256**. If full were 255, a fully near-owned tree would lose 1/256 of its pixels.
  - Recover the level in both shaders with the same expression: `uint q = uint(clamp(c, 0.0, 1.0) * 256.0 + 0.5)`.
  - Quantise identically on the CPU before writing.
- Near draws if `h < qNear`. Far draws if `qNear ≤ h && h < qEdge`.
- Set `alphaHash: false` and use the custom discard on **every** batch that can own a far-slotted tree: lod0, lod1 and canopy. Keep a single hash implementation.

Quantisation also cuts ownership writes, because the value changes only when the step changes.

### B3. Ownership needs a third state: "near says absent"

Right now `z = 0` means "not near-owned, far draws fully". That is ambiguous with "near evaluated this tree and it does not exist".

Two cases hit this ambiguity:
- **Water change.** The installed far geometry is stale (old context) while the near cache is refreshed. Trees the new habitat removes (shore or riparian changes, not only submerged ones) are drawn by far with `qNear = 0`. That includes trees right beside the camera, which then trigger B1.
- **Steady state.** Any presence disagreement between `forestHabitat` (near) and `createForestCensus` (far) causes the same thing.

Fix:
- When the near loop sees `!resident.present` (or the submerged skip) for a cell with an installed far slot, write `qNear = 256`. Far then draws nothing.
- Within near range, near is the authority on existence.
- Add counters:
  - `nearPresentNotInCensus`
  - `nearAbsentInCensus`
  - These must be **0 at steady state** for a fixed water level. Nonzero means the two habitat paths disagree, and that is a correctness bug, not noise.
  - The first case shows up as a tree popping at the footprint edge, because nothing takes it over.

### B4. Same-frame atomicity and slot lifecycle

- Ownership writes must **never** go through the install budget. Only installs are budgeted.
- Order within `update()`:
  1. Drain the bounded install step.
  2. Run the near loop and ownership writes.
  3. Flush near and far attributes.

  New slots then receive their correct `z` in the same frame they first become drawable. A freshly installed slot with `z = 0` next to a live near tree causes one frame of double coverage.
- Freeing a slot writes `h = 0` and `z = 0`. The "previous near ids" reset must resolve `id → slot` through the current map every frame, never through a cached index. A reused slot must not receive another tree's reset. Key the map entries with an install generation.
- Replacing a patch after a water change removes the old slots and installs the new ones, including their `z` initialisation, in one `update()`.
- Three uploads attributes when the mesh is drawn, so a hidden far mesh defers its upload. That is safe as long as `commit()` preserves pending ranges (it does) and near and far are in the same visible group. Keep it that way.

### B5. Upload granularity

`commit()` unions a single min/max range across all three attributes *and* all pending ranges. A few scattered ownership changes can therefore upload most of the 7 MB. Changes:

- Move ownership into its own `InstancedBufferAttribute`, 1 component, `DynamicDrawUsage`.
- Make position, rotation and parameters `StaticDrawUsage`, written only at install, rebase and free.
- Use fixed 256-slot dirty blocks on the ownership attribute (1 KB per block for float, 256 B for normalised Uint8).
- Allocate each patch's slots contiguously (a first-fit extent allocator, or fixed pages sized to the census max-per-patch). Installs then dirty one or two blocks rather than scattering over free-list holes.

### B6. Depth path guard

The shader branches on `USE_LOGARITHMIC_DEPTH_BUFFER`. Older three and some forks use `USE_LOGDEPTHBUF`. Newer three also has `USE_REVERSED_DEPTH_BUFFER`, which the non-log branch does not handle.

If the installed super-three uses a different define, a log-depth scene silently receives linear NDC depth from the proxy, and every depth comparison is wrong. Add:
- a check at program-compile time (assert the compiled fragment source contains the expected define whenever `renderer.capabilities.logarithmicDepthBuffer` is true);
- an in-game depth readback test (T4).

The lab's 24/64/650/4000 m checks count only if they used the game's depth mode and view-unit scale. `atlasAirMetresPerViewUnit` implies view units may not be metres. With planet-unit views, `log2(1 + w)` quantises around 1.0, and that quantisation step is identical for mesh and proxy only if both use the same formula. Confirm this in the game camera, not the lab camera.

### B7. Colour alpha under alpha-to-coverage

`alphaToCoverage: true` suppresses three's `OPAQUE` define, so the far material writes `diffuseColor.a < 1` into colour alpha. After MSAA resolve, silhouette pixels have alpha < 1. You already saw fringes on the lab's alpha canvas.

The near alphaHash material is `OPAQUE` and writes alpha = 1, so it does not have this problem. Either:
- prove that the game's post chain overwrites alpha, or
- use an opaque context or a final alpha clear.

Gate this with an alpha readback test.

### B8. XR uniform correctness

In the non-multiview path, three calls `onBeforeRender` per `ArrayCamera` sub-camera. It sets the eye viewport first, and it re-uploads material uniforms on camera change. The per-eye `treeCamera`, `treeModelView`, `treeProjection` and `treePixelScale` should therefore work.

It is broken under **multiview** (one draw for both eyes). Either assert that multiview is off or disable far in XR. Also verify that `treeSampleAA` agrees with the real XR framebuffer's sample count; `xr.getRenderTarget().samples` may not reflect it.

### B9. Bounds are hard-coded

`centre (.005,.52,-.03)` and `extent (.38,.54,.31)` are not derived from `LEGACY_TREE_LOBES`. Add a unit test that every crown and trunk hull vertex lies inside the box at `treeRadiusScale = 1`. I checked by hand and it currently passes, with z tight at −0.33 against −0.34. This prevents a silent clip when shapes change.

---

## 2. Per-instance pairing vs global readiness radius

**Pairing is better.** Readiness, capacity, frustum and selection-lag failures all degrade to "far draws fully", which cannot produce holes. It needs no global histogram or spherical readiness proof, and it reuses the existing near loop.

What it still needs is the three contracts above:
- bit-exact thresholds (B2);
- a three-state ownership value (B3);
- same-frame writes (B4).

**Recommended refinement, which lowers risk and churn.** The far proxy is exact to the *detail-0* mesh. That is the LOD1/mid batch and the canopy mesh, not near LOD0, which uses icosahedron detail 1 and 7-sided trunks. For trees in installed patches:

- Hand off **mid→far as a binary switch** (`qNear ∈ {0, qEdge}`) at a fixed distance, using the existing retained hysteresis band. There is no footprint dither band.
  - Silhouettes and colours are identical.
  - The only differences are trunk normals (sub-pixel at those ranges) and per-vertex versus per-fragment aerial perspective (negligible).
  - Verify with T5.
- This removes the ~1000 per-frame fade writes. Only tens of boundary crossings per frame remain.
- It also removes the screen-door "shower-door" swimming. A screen-fixed pattern slides relative to moving trees, which is a visual regression from today's object-space hash.
- Keep the fractional path for:
  - uninstalled patches (legacy, as today);
  - the outer and altitude fades;
  - any case where the handoff falls inside `forestNearM`. Place the handoff distance beyond `forestNearM + 12` so LOD0↔far never pairs.

Also fix the near frustum bound. It is centred at the root with radius h, but crown tops reach 1.026h and the corners about 1.09h. Near currently culls some trees whose crowns are visible at the frame edge. Pairing makes that harmless, since far takes over, but it feeds B1's close-far fault path. Centre the bound at 0.52h with a radius derived from the hull.

---

## 3. Host plan: agree, with these corrections

- **Job flow.** One 64-patch job, atomic patch install, ≤512 instances per 2 ms, and no new request until the install queue is drained: agreed. Discard results whose generation or request is stale, and send nothing before `ready`.
- **Partial failure.** On error the worker flushes completed patches and then reports the failing address. Install the successes. Mark the failed address with bounded retry and backoff; it stays legacy, so there is no hole. Never retry it in a tight loop.
- **Capacity overflow.** The patch stays legacy and a counter increments. Never install partially.
- **Eviction.** Use each patch's *nearest* distance (centre distance minus bound) against 4.5 km, not its centre. Otherwise partially visible patches get evicted and swap back to sparse legacy representatives inside the edge fade. Draw uses slant ≤ 4 km, which implies horizontal ≤ 4 km, so a horizontal-chord residency of 4.5 km is sufficient.
- **Legacy suppression lookups.** For each canopy representative, the near loop needs an O(1) "patch complete" lookup. Derive the patch from numeric cell face/x/y, not by parsing string ids 3.5k times per frame. Suppressing a representative simply means it is not wanted, so `z = 0` and far draws it fully. Mid→canopy→far is then identical-silhouette.
- **Visible installs.** Cold start, teleport, or flight that outruns the 4.5 km shell produces density pops at patch borders (sparse representatives → full density). Count patches first made drawable inside the draw radius. If that is common in the flight tests, add a static per-slot install-time attribute and fade in over about 0.5 s. That is a follow-up, not a blocker.
- **`forestPatchAddresses` every 150 m.** Its face windows are 3× the angular span, so the candidate squares are large. Measure p99 on the main thread; it is probably under 1 ms, but record it.
- **Far origin at about 8 km.** Float32 half-ulp at 8 km is about 0.5 mm, plus the same again from `treeCamera` rounding. The "submillimetre" claim is therefore marginal. Accept on a pixel criterion instead: ≤0.25 px at the nearest handoff distance.
  - Rebase procedure: fill a shadow `Float32Array` in ≤2 ms slices, then in one frame change the child `position` and set `needsUpdate` on the full 2.4 MB position attribute. Three uploads at draw, so the swap is atomic.
  - Alternative that removes rebase entirely: store positions as a relative-to-eye high/low pair (+16 B per slot).
- **Aerial perspective at the hit.** Worth doing, but not a blocker. The quad-versus-hit distance error is at most about the bound radius (~16 m) against a 65 km extinction scale. The existing hook already works without `USE_INSTANCING`, since the plain Mesh plus `matrixWorld` scale yields correct planet positions.
- **Lighting and material compatibility.** `vViewPosition`, fog depth and shadow coordinates all come from the quad plane.
  - This is correct for a directional sun under Lambert.
  - It is wrong for point or spot lights, `scene.fog`, and `receiveShadow`.
  - Assert those are absent, or replace `geometryPosition` and fog depth with `treeHitView`.
- **Gating.** Gate far behind the dated-life, prepare-altitude and XR profiles. Start with far **off in XR** until B8 and the XR performance rows pass.

---

## 4. Measured follow-ups (not blockers)

1. **Fringe shading.** Each lobe's AA fringe (alpha > 0, gap < 0) competes for `best` depth, colour and normal. A fringe in front of another lobe's interior can shade a fully covered pixel with the wrong lobe. Only accept hits for `best` when alpha ≥ 0.5, or when gap ≥ 0.
2. **Trunk normals.** Reproduce the mesh's interpolated normals by blending the two edge-vertex normals across each face, instead of using face normals.
3. **Tiny crowns and temporal stability.** Measure shimmer on 1–2 px crowns at 0/2/4× MSAA during slow pans, as a per-pixel temporal variance metric.
4. **Hash decorrelation.** One shared screen hash correlates fades across trees: see-through is 1 − c instead of (1 − c)ⁿ. For the fractional paths, consider `h' = (h + roll8) & 255` with the same `roll8` on near and far. It stays complementary.
5. **Worst-case overdraw.** With no early-Z, every far fragment runs its shader. Measure at eye height 2 m, looking horizontally, in the densest fixture, and declare a mid-range hardware floor.
6. **Dead slots.** Draws include dead slots up to `instanceCount`. That costs vertex work only, but record it; compaction can come later.
7. **Stereo.** The screen hash differs between eyes in XR. Check for binocular shimmer.

---

## 5. First integration test matrix

### Static and unit tests (CI, no game)

| # | Test | Pass criterion |
|---|---|---|
| T1 | Complementarity: one tree drawn with a detail-0 mesh and the proxy, stencil-increment with depth test off, `qNear ∈ {0,1,128,255,256}`, `qEdge ∈ {256,128}`, MSAA 0/4 | Inside the silhouette, stencil==2 count = 0 and stencil==0 count = 0. Tolerated only at the ≤1 px boundary |
| T2 | Ownership state machine, headless: enter near; LOD swap; capacity overflow; frustum drop; near-absent; patch install under an active near tree; eviction with an active near tree; slot reuse; water replacement; group hide/show | After every step, each installed slot's `q` equals the owner's quantised value, or 256 for near-absent, or 0. No write to a freed or reused slot |
| T3 | Upload accounting: 1000 scattered ownership changes; 64-patch install; rebase | Bytes ≤ blocks × 1 KB; install touches ≤ 2 blocks per patch; rebase = one 2.4 MB upload |
| T9 | Bounds hull test (B9); log-depth define and reversed-depth assertion (B6) | Pass |

### In-game renders (game camera, game depth mode, post chain)

| # | Test | Pass criterion |
|---|---|---|
| T4 | Depth parity, detail-0 mesh vs proxy, at 24/150/650/4000 m, poles, cube seam, including trunk–terrain contact | Same occlusion against terrain; depth delta ≤ mesh-vs-mesh self-noise |
| T5 | Mid→far binary handoff image diff at the handoff distance, sun high and low | Mean ΔE and 99th-percentile ΔE under your threshold; no silhouette change |
| T6 | Alpha readback at tree edges, MSAA 0/2/4 | alpha == 1 everywhere (B7) |
| T7 | Ownership mask per frame. Render near+far as flat ID/mask. Reference is every tree drawn as a mesh with the same LOD assignment | Interior mismatch = 0 outside known LOD0 detail differences |

### Scripted flights

Record for every frame: T7 mismatch, `farForcedClose`, disagreement counters, visible installs, CPU `update` ms p50/p95/p99, install ms, `forestPatchAddresses` ms, upload bytes, GPU p50/p95.

- Walk at 2 m/s through the densest forest
- 30 m above ground at 50 m/s
- 500 m above ground at 300 m/s
- 180° turn in 0.5 s
- Climb through the prepare altitude and descend again
- Teleport / cold start
- Water bucket change mid-flight
- Cube edge and cube corner crossings
- Group rebase (256 m) and far rebase (~8 km) crossings

### Fault injection

- Worker throws mid-batch
- Worker terminated
- Late messages from the previous generation
- Capacity set to 20k to force overflow

Expected result: no T7 interior holes. Legacy fallback is visible and counted.

### XR (after desktop passes)

- WebXR emulator and one device
- Per-eye mask and T1 per eye
- Multiview off asserted
- Frame time at the XR refresh rate with far enabled versus disabled

Enable far by default only when T1–T7 pass, the flight suite shows zero interior holes, `farForcedClose` and the disagreement counters are 0 at steady state, and you have recorded the mid-range floor. Legacy proxies remain until the authored-asset stage; nothing here assesses realistic assets.
