# Opus 5.5 source review: family-aware far canopy

- Model: claude-opus-5-5
- Provider: firstParty
- Run: 4fa3b542-3ce8-4ed8-8480-ed03f7fc638b
- Snapshot revision: fbe3c2626ead2eee118661a32a584ce2914aa5eb
- Snapshot working tree: clean
- Prompt SHA-256: 982224240d6d8536491d3c239d87734d5e3ac3c8ff13877b3e908eb5b7114209
- Source hashes: inputs.json
- Scope: source review only; no build, browser or GPU test

# Review: family-aware far-canopy proxy at HEAD fbe3c26

This is a source-only review. I didn't run commands, builds or a browser/GPU check. None of this establishes that near and far silhouettes match, that same-ID handoff works in play, or anything about performance.

**Provenance:** the review follows the embedded snapshot. The working-tree `src/forest-impostor.ts` doesn't match it:
- It has an extra `scalar()` helper at lines 13–14.
- Line 35 emits `${scalar(p[3])}`, where the snapshot emits `${p[3]}`.

I didn't run git, so I can't tell whether that change is committed. Lines cited below for `forest-impostor.ts` are working-tree lines; after line 13 the snapshot is one line lower.

## Findings (ranked)

**1. Blocker in the snapshot: the shader likely fails to compile.** `convexShader` writes each plane distance as a raw JS number. `ConeGeometry(1,2,8)` has a flat bottom cap at y = −1, so its plane distance is exactly ±1. That produces `float numerator=1-dot(n,o)`, which subtracts a float from an integer. GLSL ES 3.00 has no implicit int-to-float conversion, so this is a compile error.
- `treeFamilyCone` is added to `facetedGLSL` unconditionally, so the whole impostor program would fail. That includes the legacy path, not just Pine.
- The icosahedron and trunk planes avoid this only because their distances are non-integer (Float32 rounding noise on the trunk's y=0 cap).
- Three skips degenerate cone faces and omits a zero-radius cap (`node_modules/three/src/geometries/CylinderGeometry.js:83–84, 169–181`), so there's no NaN-plane risk.
- The working-tree `scalar()` fixes this, but no test catches it: the composition test only uses regexes.

**2. Handoff mismatch for families without a sidecar.**
- The far resolver only knows families whose presentation is `enabled` (`planet-forest.ts:214–216`).
- `expectedCanopyPresentation` checks eligibility against every loaded family, `this.assets.entries` (`planet-forest.ts:228`).
- So a loaded family without a sidecar (e.g. Pine with runtime mips) gets a non-zero expected code on the near side and code 0 on the far side. `canHandoff` then never pairs those trees.
- The doc says such families "keep the legacy distant representation", which implies pairing should still work. Instead those trees silently lose the 550/600 m paired band.
- Fix: keep one `families` map and use it for both sides.

**3. Stale family on far-only slots during retag, and possible starvation.**
- `setPresentation` switches the family uniforms at once, but slot codes only change as the bounded retag reaches them (`planet-canopy.ts:72–79, 270–274`).
- After a catalogue change, a far-only slot whose species moved from Oak to Pine keeps drawing with code 1 and the old brightness until retagged. Paired IDs are protected by the on-demand tag in `canHandoff`.
- A retag needs at least `slots/2048` prepare calls; if the 2 ms cap binds first, it needs more.
- Each key change restarts the iterator from the beginning. If keys change faster than one full pass (e.g. date playback across species births and deaths), slots late in the insertion order may never be retagged.
- Disabling or clearing a family is safe: its bound drops to 0 and it falls back to legacy at once.
- The on-demand tag in `canHandoff` runs outside the 2 ms slice. After a key change it is bounded only by the number of near candidates.
- The far resolver calls `catalogue.resolve` without caching (one hash plus `JSON.stringify` per species, plus five appearance hashes). This repeats work the near side already cached per resident. I haven't measured the cost.

**4. Oak loses edge anti-aliasing.** `forest-impostor.ts:206` forces `treeCoverage=1` for Oak, and `treeEllipsoid` computes no coverage at all. The default legacy mode (`treeFaceted=1`) has fwidth-based alpha-to-coverage edges; Pine keeps them through the cone path. Oak edges will be hard and aliased, which is a behaviour change of the existing AA hook.

**5. Low: state changes before validation.** `PlanetCanopy.setPresentation` updates the key and version before `setFamilyPresentation` can throw. If it throws, the retag never starts and the branching/spire uniforms may be half-updated. The next frame's equal key then hides the problem. This is practically unreachable because the derivation already validates, but validating first is cheap.

## Verified at source level

- **Leaf transform:** matches the detailed shader. Pivot × h/16, rotation about Z by `sin(·)·0.12·wind`, and the card offset stays in metres (`tree-asset.ts` `deform`, `treeVertexMeters`).
- **Maximum-deformation search:** exact.
  - For a fixed angle, squared norm is convex in scale, so the maximum is at the 10 m or 22 m endpoint.
  - The angle term is `A cos θ + B sin θ` with a stationary point independent of scale, so taking the product of both candidate sets is exact.
  - The union over both LODs is taken by maximum radius.
- **Band envelope** `|c|·22/16 + hypot(r,hh)·22/16 + L`:
  - Encloses the ellipsoid, since each semi-axis ≤ `hypot(r,hh)·h/16 + L`.
  - Encloses the cone corners: `hypot(a+0.707L, b+0.707L) ≤ hypot(a,b) + L`.
  - `setFamilyPresentation` adds the trunk term `hypot(.031,.64)·22`.
  - Dimensions are consistent everywhere (metres; normalized in the fragment shader via `/h`).
  - The ray shift `dot(-ro,rd) − R/h` is conservative for every primitive at every supported height.
- **LOD profiles and bands:** LOD0 and LOD1 profiles stay separate, and the far path uses LOD1. Empty bands are written as w = −1 and skipped. A populated band of radius 0 draws a card-sized sphere.
- **Packing:**
  - The maximum code is 262,142 < 2²⁴, so it is exact in Float32.
  - GLSL `mod`/`floor` by 4 and 1024 are exact on exact-integer floats under WebGL2 `highp`.
  - Quantization error is ≤ 0.2/255.
  - Float32 tree heights keep the inclusive 10–22 m eligibility identical on both sides.
- **Shader structure:**
  - Dynamic uniform-array indexing is legal in ES 3.00.
  - The `familyIndex` range is guarded by `familyBound > 0`.
  - The band `continue` depends on a uniform and the family code on a flat varying, so `fwidth` sits in quad-uniform control flow.
  - Log depth, hit normals, water, ownership and the aerial hooks are unchanged.
  - The cache key now includes the presentation version.
- **Slot lifecycle:**
  - Install clears `z` and tags the slot.
  - Remove zeroes the slot's version.
  - The live Map iterator skips deleted entries and visits new ones, which are no-ops because they are already tagged.
  - Positions, rotations and ownership are never touched by a retag.
  - Version wrap is correct, though practically unreachable. Version 0 doubles as the initial "current" value, which is harmless because the default resolver returns 0.
- **`canHandoff`:** its `height` argument is terrain/root height matched to the same canonical ground sample. That check alone is not evidence of a root mismatch. The new tree-height check (< 1e-5 against Float32 W) and the post-tag code comparison are sound additions.

## Heuristic or approximate, with no visual conclusion possible

- The p90 radius is used as the drawn radius.
- The band vertical centre is the midpoint of the band's extent.
- A full card margin L is added on every axis.
- Oak is four stacked ellipsoids; Pine is solid cones with a split margin. Solid cones can overfill a sparse Pine.
- The legacy trunk is 0.64·h tall regardless of family.
- The colour mean includes texels below the alpha cutoff, which the detailed renderer discards. It also averages over the whole atlas.
- The proxy uses Lambert shading, while the detailed trees use Standard material with transmission.

The data flow is valid and linear-to-linear. This source cannot establish a visual match; that stays pending until there are new GPU captures.

## Billboard bound: the origin-centred sphere used as a cube

**The current bound is conservative but loose.** `vec3(R)` with the oriented-box projection encloses the sphere and is dimensionally correct. Its costs:
- Projected half-size is up to √3·R.
- Half the quad sits below the root.
- R is fixed at 22 m for every instance.
- The perspective factor and the close-fallback threshold both use `boundRadius = √3·R`.

**Close fallback grows substantially.** The trunk term alone gives R ≥ 14.1 m, so the fallback threshold is at least 1.1·√3·R ≈ 26.8 m. Legacy used 1.1·0.73·h, i.e. 8.0–17.7 m. The fallback radius is therefore at least 1.5–3.3× larger.

Instances that aren't owned inside that radius rasterize a full-screen quad; frustum-culled trees behind the camera are one example. Any cost is unmeasured.

**The parent's AABB proposal does enclose the analytic proxy:**
- The per-band box is `h/16·(c ± (r,hh,r)) ± L`, with the full L also used for cones. Adding the trunk box `[±.031h, 0..0.64h]` and taking the union over populated bands gives exactly the proxy's box.
- Every proxy point lies inside `[−R,R]³`, so the new box sits inside the current cube. Its projected quad and half-diagonal can never exceed the current ones.
- The half-diagonal ball still keeps `D/(D−ρ)` valid.

It doesn't need to enclose the true tree geometry, because the proxy is what gets drawn. Near culling keeps using `maxRadiusM`.

**Requirements if adopted:**
- Pass a per-family normalized centre and half-size plus L as uniforms.
- Rotate the centre offset per instance.
- Keep `max(1, treeRadiusScale)`.
- Mirror the formula exactly in `observeClose`, backed by a CPU/GLSL parity test.
- The sphere ray shift can stay as it is.

**Recommendation:** adopt the AABB rather than keep the sphere, gated on measurement at fixed poses:
- counts of `farForcedClose` and of instances inside the threshold,
- GPU timer for the far draw,
- the fallback-instance count.

## Recommendations

1. Confirm `scalar()` is in the committed tree. Add a test that every emitted literal is a float and every plane is finite, plus a real compile.
2. Use one enabled-families predicate for both near and far.
3. Prefer slots near the camera when retagging, or don't restart the full pass on every key change. Cache far bindings per slot or ID.
4. Give Oak's coverage an fwidth edge, or document the aliasing as accepted.
5. Validate the families before changing canopy state.

## Missing gates (in priority order)

**CPU:**
- Shader literal/compile check, as in recommendation 1.
- Containment: sample the proxy's extreme points (ellipsoid axes, cone vertices, trunk corners) at 10, 16 and 22 m for the actual Oak and Pine LOD1 profiles. Check them against R, the quad/AABB, and the ray shift (shifted versus unshifted hit).
- Near expected code equals far code when `enabled` is false.
- Same ID keeps matching code, height and appearance across a date/catalogue swap while the retag is pending, including key changes every frame.
- Family clear or replacement mid-retag, plus slot removal, reuse and water reconfiguration during iteration.
- Census, water and absence ownership during retag.

**Browser:**
- Real program link with the shader info log and `getError` recorded.
- Same-pose, same-date close/middle/far captures, with per-ID `handoffSamples` across the 550/600 m band.
- GPU timings for sphere versus AABB.

Visual acceptance and silhouette match remain pending, and nothing here supports a 60 fps claim.
