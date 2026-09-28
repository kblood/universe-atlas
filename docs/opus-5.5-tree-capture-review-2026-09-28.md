# Opus 5.5 tree capture review — 2026-09-28

Archived returned review. It is source/design review only: the reviewer executed nothing and read no generated capture artifacts; raw artifact audit remained pending. The snapshot was dirty, so the revision below is its base commit. The returned model, scope and reviewed-input hashes are preserved in the [metadata](opus-5.5-tree-capture-review-2026-09-28.metadata.json).

## Returned review
# Atlas tree capture: source-only review

This covers only the pasted source. I ran nothing and read no artifacts. The raw artifact audit is still pending.

## Correctness findings and fixes, by severity

**1. A shader-patch failure can pass every check.**
- **Problem:** `String.replace` does nothing if `#include <opaque_fragment>` is missing. That happens if the previous `onBeforeCompile` already consumed or renamed the include, or after a Three upgrade.
  - The lit output would still have alpha 1.
  - Its RGB could fall inside the data-pass range checks, so the capture would "succeed".
- **Related gaps:**
  - The leaf class is keyed on the literal `'MAT_AtlasFoliage'`.
  - Only `family.lods[0]` materials are patched, but `batch.group` is what renders.
- **Fix:**
  - Throw if the include string is missing before replacement.
  - Throw if no material matched the foliage name.
  - Assert that every mesh in `batch.group` uses a patched material.
  - Add a pass-sentinel self-test, e.g. pass 2 writes a constant and you verify one covered texel.
  - Record per-view leaf fraction greater than 0.

**2. `customProgramCacheKey` is overwritten, not composed.**
- **Problem:** If the runtime deformation patch varies by its own key, capture variants could share a program.
- **Fix:** Use `` `${prevKey?.call(material)??''}/${TREE_CAPTURE_VERSION}/${material.name}` ``.

**3. Baked-state assumptions are asserted in the manifest rather than derived.**
- **Wind:** `setDate(0n)` is only "at rest" if wind phase and amplitude are zero at t=0.
  - `windMargin` hides displacement in the bounds but not in the pixels.
  - Force a zero-wind uniform, or assert that rendered depth matches `treeVertexMeters` at rest.
- **Tint:** `setInstance(...,heightM,0)` must be the identity tint. Otherwise the runtime applies the tint twice. Record the tint as neutral in the manifest.
- **Root:** `root:[0,0,0]` is hard-coded. Derive it from the trunk base, or assert `bounds.min.y≈0` and trunk XZ≈0.

**4. The octahedral encoding has a fold, and runtime filtering will cross it.**
- **Problem:** Mip reduction handles normals correctly (decode, average, encode). But hardware bilinear filtering of object-space oct values across the y<0 fold produces wrong normals, and leaf undersides land there.
- **Fix (preferred):** Store normals as hemi-octahedral in each view's stored basis. Double-sided normals face the camera, so there is no fold and precision improves. Rotate by the per-view basis at runtime.
- **Alternative:** Fetch four nearest texels and decode each before blending.

**5. Liveness and fallback.**
- `page.evaluate` has no timeout. Wrap the capture in an overall deadline.
- Headless Chromium can silently fall back to SwiftShader. Reject SwiftShader/llvmpipe adapters unless an explicit option allows them.

**6. Provenance gaps.**
- `hostCodeSha256` omits `path-policy.mjs` and `contract.mjs`.
- The manifest does not record:
  - the esbuild version, or `metafile` input paths and hashes (you compute the metafile and discard it);
  - the Playwright version and `browser.version()`.
- Per-frame `coverage` is returned but not stored.

**7. Output handling.**
- **Path check:** After `mkdir(output)`, `realpath(output)` and re-check it against the approved roots. This closes the gap where a junction is swapped between the parent check and creation.
- **Failure file:** Write `capture-failure.json` with `{flag:'wx'}` and wrap it in `try` so it cannot mask the original error.

**8. Validation asymmetry.**
- The host rejects colour above 1.00001, but the browser does not check colour range. Mirror the check in the browser so it fails with a view and pass index.
- The unguarded `Math.max(...points.map(...))` spread risks a stack overflow on much larger meshes. Use a loop.

## Frontmost-depth tradeoff

The choice is sound at mip 0 with 4× supersampling, where footprint depth spread is small. It gets worse down the mip chain.

Costs of frontmost depth:
- **Forward bias:** Depth bias toward the camera grows with footprint, up to roughly radius at the coarsest mips. Impostors writing fragment depth will over-occlude neighbours and terrain inside or behind the canopy.
- **Attribute mismatch:** The averaged normal, colour and leaf fraction describe the whole footprint, but they are placed at the front surface. Lighting sees a blended normal at a biased position.
- **Parallax:** Frontmost is stable against empty-space surfaces, but it is not more consistent across the three blended views than a front-cluster mean would be.

Suggested refinement:
- For each output texel, average depth only over covered subsamples within δ of the frontmost. δ could be about 0.5 m/radius, or scale with mip.
- Keep the current behaviour when the cluster is a single subsample.
- This keeps rejection of disconnected surfaces and removes most of the mip bias.

If a channel frees up, a "thickness" (max − min covered depth) would let the renderer choose occlusion behaviour. For example, move the leaf fraction to 8 bits alongside the albedo.

## Format consequences

- **Review data size:** RGBA32F colour plus data is about 54 MiB per 9×9/128 class with mips. That is acceptable as review data only.
- **RGBA16F data:** Normalized depth ×radius (~10 m) gives about 5 mm steps near ±1, which is fine. With the current full-sphere octahedral encoding, precision is uneven near the fold, which is another reason for view-space hemi-oct.
- **Leaf fraction** is fine at 8 bits.
- **Missing material channels:** Roughness, specular, AO and foliage translucency are not captured. Runtime shading will use constants, so "same light response as close meshes" needs a stated tolerance or an extra channel.
- **Frame efficiency:** A common enclosing-sphere frame wastes a large fraction of texels on side views of a tall crown. That is acceptable per the design, but include it in the 9×9/128 vs 17×17/64 comparison.
- **Padding:** Four-texel padding is sufficient here because views are separate files. If you move to an atlas, padding must be at least 2^(mips sampled) texels at the finest atlased level, or use a texture array.

## Checked and consistent

- **Depth:** `(distance − vViewPosition.z)/radius = dot(s−center, toward)/radius`, so "max = nearest" is correct.
- **Oct parity:** The GLSL `captureOct` and JS `encodeTreeView` agree, including sign-at-zero.
- **Frustum:** Orthographic near 0.5 and far 2r+1.5 at distance r+1 enclose the sphere.
- **Coverage:** Coverage-weighted linear RGB averaging of unassociated colour is correct.
- **Reduction and padding:** Reduce-then-pad without alpha growth is correct, and the unpadded chain feeds the next mip.
- **Host framing:**
  - Exact-length checks, the Host-header check, the token on POST, `wx` writes and in-memory input bytes all hold up.
  - Float32 views over `Buffer.concat` are safe because Node's pool is 8-byte aligned.

**Priority before rendering reconstructed impostors:** findings 1, 3 and 4.