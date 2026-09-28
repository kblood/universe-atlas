# Genuine Opus 5.5 review: forest work and captured-tree relighting

- Model: claude-opus-5-5
- Provider: firstParty
- Run: e6687fd5-5697-4d2c-9718-63766d3dc15e
- Duration: 561600 ms
- Exact source target: 96997ec2114dc4ccf207fd5f53700dea8823afc7
- Prompt SHA-256: 93d84f325d0afd63cbf1a7d698adb34086a7f8e3c4e521cc9485c6e54c1c3369
- Inputs and all file hashes: inputs.json
- GPU/browser: none used for the review; cited acceptance and capture evidence is preserved separately.

# Review: 96997ec (forest work refresh and captured-tree relight)

I only read source and evidence files. I didn't edit anything, run anything or use the GPU. I cover commit 98d8ff0 separately at the end of Part A, because it came after 96997ec.

The evidence at 96997ec: `test-results/forest-work-refresh-96997ec/focused-tests.log` shows 18 of 18 tests passing. `tsc.log` is empty, which fits a clean compile, but the file doesn't show the exit code.

---

## Part A — Forest work refresh (96997ec)

**Main finding:** I found no way for an acknowledgement or a skip to lose work or leave work waiting forever.

- **Canopy journal** (`src/planet-canopy.ts`, `invalidateCurrentPatchAnswers` / `acknowledgeCurrentPatchChanges`):
  - An acknowledgement only deletes a key if the key's version still matches, so a later edit to the same key survives an older acknowledgement.
  - A global invalidation starts a new epoch and clears the map, and an acknowledgement from an older epoch is ignored.
  - If more than 8192 different keys are waiting, the journal switches to a full reset instead of dropping keys.
  - A key edited again is simply processed again, so nothing waits forever.
  - Taking the snapshot and acknowledging it both happen inside one synchronous `update()`, so the version check is a safety net rather than something that's needed today.
- **Distance thresholds match.** A patch is skipped only if it is at least 670 m from the frozen anchor (the 650 m footprint plus a 20 m margin). The anchor is never more than 20 m from the current eye, so a skipped patch is always at least 650 m from the eye. That is exactly the per-cell cutoff. The per-cell checks inside 650 m (`noteNear`, `own`, `observeClose` at 100 m, and the retained sets) are therefore unaffected.
- **Movement reversal:** local refreshes are measured against the frozen anchor, and the anchor only moves on a full refresh. `tests/planet-forest-worklist.test.mjs:120-132` covers moving +19 m then −19 m with no movement refresh.
- **Fallbacks all stay conservative:**
  - Unresolved or partial groups are never skipped.
  - A water or hydrology change forces a full refresh with an empty skip set, and the list rebuilds from dirty resident updates.
  - Failures and visibility changes invalidate everything.
  - When the canopy is hidden or not drawn, `update()` returns early and the journal stays bounded.
- **Ownership:** newly skipped IDs are removed from the near and middle retained sets. Skipped cells stop calling `own`, so `finish()` sets their far ownership to zero, and `reconcileBatch` drops their slots.
- **Order:** cells keep their original order because the index is sorted and updated with `lowerBound`. Incremental results are checked against a full rebuild in `tests/forest-ordered-work.test.mjs`.

### Findings, in priority order

1. **With no canopy, every frame does a full refresh (low severity; correctness is fine).** In `src/planet-forest.ts`, a null `fullCanopy` gives `currentPatchRevision` a value of `NaN`, and `NaN` never equals the stored epoch. The extra work is small because an empty skip set returns early, but the refresh diagnostics become noise. The four worklist tests at the target don't cover this case.
2. **The broadphase acknowledgement only works because of call order (latent risk).** In `src/forest-patch-broadphase.ts`, the dirty set has no versions, and `acknowledgeDirtyGroups` deletes keys even if they were edited again. It's safe today only because `updateResident` runs before the snapshot inside `update()`. If a resident update ever happens between the snapshot and the acknowledgement, an edit would be silently lost. Adding versions like the canopy journal has would remove that dependency.
3. **Cost can grow badly when many patches change at once.** In `src/forest-ordered-work.ts`, `updateSkippedPatches` does one splice per member (cost grows with members × list length). There's no switch to a full rebuild for large batches.
4. **Removed roots leave bounds looser than needed (safe).** When a root changes to null in `updateResident`, `boundsDirty` isn't set, so old points stay in the bounds. The bounds stay safe but can be looser than they need to be.
5. **Fragile shared vector.** `eyeMeters` is the same object as the scratch vector `this.position`. It's correct with today's call order, but a future reuse of `position` inside the refresh would silently move the eye.
6. **Some metrics mean less than they appear to.**
   - `incrementalUpdateCount` counts calls, not patches, so "72" means 72 calls that changed something.
   - The 879 "visited groups" include canopy keys outside the forest selection; `skipStatesFor` returns false for those.
7. **Evidence gaps.**
   - The profile covers only local canopy changes while standing still. Movement, flight, water, hydrology and failure transitions were never profiled.
   - During continuous flight faster than 20 m per refresh, every frame does a full scan. Nothing measured shows what that costs.
   - The timings describe what happened; they don't show a speedup caused by this change.
   - Screenshots 02, 02b and 05 show the same pose and the same forest layout. The on-screen p95 frame times are 64, 66 and 75 ms. That fits with no visual regression but doesn't prove it.

### Follow-up commit 98d8ff0 (reviewed separately)

This commit fixes finding 1. With no canopy, the fallback is now a stable `-1`. A canopy that exists but lacks the revision API still returns `NaN`, which conservatively refreshes every frame. `tests/planet-forest-worklist.test.mjs:46-64` covers both cases. I have no issues with the fix.

---

## Part B — Captured-tree relighting

### 1. Relight results can't be tied to the reviewed shader (highest priority)

The relight-v1 report (bd6d96a) and the grid17 report (39d937d) both record the sha256 of `src/tree-captured-impostor.ts` as `57473086…`. At the target the file hashes to `338dc15b…`, and it hasn't changed between the target and HEAD. The other files in the grid17 report (lab, filter, asset, views) do match the target.

So the shader that produced the relight numbers may not be the code I reviewed. Possible causes are uncommitted changes during the runs, or a different hashing input such as line endings. To settle it, compare `git show bd6d96a:src/tree-captured-impostor.ts` (and the same for 39d937d) against the recorded hash. Until then, treat all of section 2 as unconfirmed for this source.

### 2. Relight reduces the error but doesn't fix it

Relative luminance error at the in-between direction `[1,.3,1]`, 33 px:

| Tree / filter | surface-v1 | relight-v1 |
|---|---:|---:|
| Oak legacy | −34.22% | −20.20% |
| Oak weighted | −35.94% | −21.00% |
| Pine legacy | −35.16% | −22.41% |
| Pine weighted | −38.03% | −24.95% |

- **Front view `[0,0,1]` is unchanged:** Oak −5.85% / −6.37%, Pine −8.9% / −7.9%. That's expected, because this direction was captured exactly.
- **All four in-between results still fail the 10% gate.**
- **Depth and coverage are identical between the two runs,** so relight only changes shading.
- **With the 17×17 grid (289 views) and relight on, Oak weighted gets worse:** −32.37%. That's barely better than the 9×9 grid without relight (−35.94%).
- **My reading (an inference, not a proven cause):** most of relight's gain seems to come from blending views that are far apart. When the views are closer together, the gain mostly disappears. So relight offsets the error rather than rebuilding the correct shading. No grid17 run with relight off exists, so this can't be separated yet.

### 3. Gates still failing

- **Depth median is above the 1 m gate:**
  - 9×9 grid: Oak weighted 1.163 m (p95 3.216 m), Pine weighted 1.177 m (p95 2.720 m).
  - 17×17 grid: Oak 1.101 m.
  - The design doc notes that this compares an area-averaged reference against front-most captured depth, so the metric itself isn't an exact ray test.
- **Pine reference isn't converged:** the reference changes by about −21% between 264 px and 528 px (−3.6% from 528 to 1056 px). Pine numbers are therefore less trustworthy than Oak's.
- **Native modes are far off:** MASK is −27% for Oak and −50% for Pine; hash is +2.8% for Oak and +76% for Pine.
- **Visible artefacts:** every capture is still stippled and soft. Pine renders as a dark, noisy cloud with no branch structure.

### 4. What is implemented versus what is assumed

**Implemented and consistent:**
- Coverage-weighted packing uses the quantized alpha byte (`src/tree-impostor-filter.ts`), and the shader divides by sampled alpha.
- The log-depth write `log2(1.-z)*logDepthBufFC*.5` matches Three's `1+w` form; orthographic cameras use clip depth.
- The three nearest views are blended with alpha-scaled weights.
- Per-view relighting runs three full PBR evaluations built from Three's shader chunks.

**Experimental assumptions:**
- **One normalized normal per texel is enough for lighting.** `reduceCapture` in `src/tree-impostor-capture.ts` normalizes the alpha-weighted mean normal and throws away its length. The loader enforces this with the contract string `'object-normal-xyz-normalized-frontmost-depth'`, and the capture test asserts unit length.
- **Leaf normals are flipped toward the viewer with a hard `leaf>.5` threshold.**
- **Shadows come from the proxy's shadow inputs,** not rebuilt per view. No `castShadow` or `receiveShadow` is set.
- **No fog or aerial perspective:** `fog=false` and there is no aerial hook.
- **Discard uses screen-space noise** (`captureNoise(gl_FragCoord)`) with nothing blending it over time. This is where the stippling comes from.
- **The lab lighting setup is limited:** sun at (−30, 55, 25), a hemisphere light, and ACES exposure 1.2 on screen only. It has no shadow map and no leaf transmission (`src/tree-impostor-lab.ts`).

### 5. Memory, per-frame cost and cleanup (`src/tree-captured-impostor.ts`)

- **Memory:** 5461 texels × 16 bytes per view gives 7,077,456 bytes for 81 views and 25,251,664 bytes for 289 views (3.57×).
- **CPU copies are kept:** the CPU-side mip arrays stay referenced by the textures, and `dispose` only frees GPU textures.
- **Wasted class storage:** the class texture is RGBA8 but only R is used, so 3/16 of all texture bytes are wasted.
- **Per-frame allocations:** `onBeforeRender` creates new `Matrix4` and `Vector3` objects and queries `MAX_ARRAY_TEXTURE_LAYERS` every frame.
- **Not instanced:** the view is chosen per tree on the CPU.
- **Early depth rejection is lost:** `gl_FragDepth` is always written, which turns it off.
- These are cost risks read from the source; none of them was measured.

### 6. Screenshot caveats

- The screenshots use a pose close to the front view, not the in-between test direction, so they can't confirm the luminance numbers.
- Oak surface-v1 and relight-v1 look only slightly different (relight's mid-greens are a little lighter).
- The grid17 silhouette is closer to the mesh's pointed crown.
- The relight-v1 and surface-v1 screenshots show the dropdown set to "Legacy", while the status JSON says coverage-weighted. It's unclear which setting was actually used for each image.

### 7. The 17×17 grid and the normal-distribution hypothesis

**The trade-off with 17×17:**
- Silhouette improves: area error −6.08% → −2.06%, blurred IoU 0.874 → 0.943.
- Luminance gets worse: −21.00% → −32.37%.
- Legacy depth p95 gets worse: 2.765 m → 3.153 m.
- Memory grows 3.57×.
- There's no Pine repeat and no run with relight off.

**Another density step isn't justified.** A 33×33 grid would be about 1089 views, roughly 95 MB per tree type per height, with no sign it would fix the lighting.

**The hypothesis holds up as a hypothesis.** Averaging the lighting over a spread of leaf normals, E[max(N·L,0)], is always at least the lighting of the averaged normal, max(E[N]·L,0). The gap is largest when the averaged normal is lit at a grazing angle. With the lab sun, the averaged normal is lit at about N·L ≈ 0.37 in the front view and only about 0.12 in the in-between view. That matches where the error is small and where it is large. This fits the hypothesis but doesn't prove it.

**Suggested tests before any other change:**
1. Compare averaging normals against averaging the lit samples on the same capture, as the doc proposes.
2. Keep the length of the averaged normal (the Toksvig approach). The unused G, B and A channels of the class texture could hold it without extra memory.
3. Repeat the probes with several sun directions, and at 128 px.
4. Run grid17 with relight off to separate the two effects.

I'm making no production-adoption conclusion for either area.
