# Review: Atlas desktop realism (`desktop-rendering-stage-c`)

## Verdict

**No proven blocker in the default path** (`sceneSamples=0`, not XR), assuming the invariants you stated hold:

- **Terrain:** the extracted formula is textually identical to the old one, so terrain output is unchanged.

**The vegetation haze can still diverge from terrain.** It reads its enable flag and eye height from different sources than the terrain does. That is the one risk on the default path, and it needs a repo check (H3).

**The MSAA experiment has two proven design defects.** Its results should not be used to make an anti-aliasing decision until H1 is fixed and H2 is accepted as a limitation.

Tags used below:
- **[Proven]**: shown by code reading or arithmetic.
- **[Repo]**: depends on code not included here.
- **[Browser]**: needs runtime validation.

## High

### H1 [Proven] MSAA silently trades scene resolution for samples

`VolumetricClouds.render` picks the sample count first and then fits it into the budget. Bytes per pixel are `12+12s+8`. The usable budget is 160 MiB − 2 MiB = 165.7 MB.

| Drawing buffer | 0× | 2× | 4× |
|---|---|---|---|
| 1080p | 1.0 | 1.0 | 1.0 |
| 1440p | 1.0 | 1.0 | **0.81** |
| 4K | 0.9994 | **0.67** | **0.54** |

4× MSAA at 4K renders about 2083×1172 and upsamples it bilinearly. That will look worse than no MSAA, and the only sign of it is `sceneResolutionScale` in diagnostics.

**Repair:** only allow a sample count that does not lower the scale below the no-MSAA scale.

```ts
const scaleFor=(s:number)=>Math.min(1,Math.sqrt((this.targetBudgetBytes-2*1024*1024)/(cloudTargetBytesPerPixel(s,quality.resolution)*Math.max(1,nativePixels))));
const baseScale=scaleFor(0);
this.effectiveSceneSamples=this.supportedSceneSamples.find(n=>n<=this.sceneSamples&&scaleFor(n)>=baseScale)??0;
this.sceneResolutionScale=scaleFor(this.effectiveSceneSamples);
```

Also report a reason in diagnostics, for example `sampleLimit:'budget'|'format'|'xr'`.

### H2 [Proven structurally; severity needs Browser] MSAA cannot anti-alias edges against clouds

**What happens at an edge pixel:**
- The colour resolve averages the samples.
- The `blitFramebuffer` depth resolve keeps one sample, usually sample 0 (the choice is implementation-defined).
- The cloud march limit, the cloud-shadow reprojection and the depth-aware upsample all use that one depth.

A canopy edge against an overcast sky therefore gets the full cloud treatment applied, or none of it, over a colour that is a 50/50 blend. Expect a 1-px fringe.

**Why it can't be fixed here:** WebGL2 has no `sampler2DMS`, so this compositor has no per-sample fix.

**Two more limits on what MSAA buys:**
- It resolves linear HDR before tone mapping, which weakens AA on high-contrast edges against the sky.
- Alpha-tested foliage gets no AA unless the materials set `alphaToCoverage`, and that should only be on when effective samples > 0 because it triggers a recompile.

**Recommendation:** keep MSAA diagnostic-only. Put a post-composite LDR AA pass (SMAA or FXAA after the resolve/tonemap) into the same comparison before investing more here. It covers cloud edges and costs far less memory.

### H3 [Repo] The vegetation haze inputs are not the terrain's inputs

- **Enable flag.** `!!this.atmosphere` (`src/planet-renderer.ts:519`) is a boolean snapshot taken at construction. Terrain uses the `atlasAir` uniform. The two diverge if:
  - `atlasAir` is ever not exactly 0/1;
  - it changes at runtime; or
  - `this.atmosphere` is assigned after line 518.
- **Eye height.** `(eye.length()-1)*radiusM` (`src/local-aerial-perspective.ts:66`) is measured from the datum. If the terrain's `atlasEyeHeightM` is measured above ground level, or is computed differently, trees and the terrain directly behind them get different haze density. That is the artefact this change exists to remove.

**Repair:** pass the ground's actual uniform objects by reference, for example `attachLocalAerial(mesh, planet, radiusM, {sun, air: groundAirUniform})`. Keep the per-mesh eye height only if the terrain's is also datum-relative and computed per camera. Otherwise share that uniform too.

## Medium

### M1 [Proven latent] Shader injection can silently do nothing

`src/local-aerial-perspective.ts:41,51` call `.replace()` without checking the token exists. Two ways this goes wrong:
- If an existing batch `onBeforeCompile` replaced `#include <project_vertex>` entirely (a common way to add wind sway), the vertex injection does nothing. The fragment shader then reads varyings that are never written. That gives undefined values, possibly NaN, in the RGBA16F capture, and the resolve's bilinear taps spread them.
- If the fragment injection is skipped (a ShaderMaterial without `opaque_fragment`), there is simply no haze.

**Repair:**
- Check both tokens before changing either shader. On failure, leave the shader untouched and set `userData.localAerialVersion='failed:<token>'`.
- Don't throw: `onBeforeCompile` runs inside `getProgram`, mid-render.
- Add a Node test that runs each real batch material's existing `onBeforeCompile` against `THREE.ShaderLib[type]` sources, then asserts both injections landed.

### M2 [Repo] Only meshes that exist at construction are attached

The traversal at `src/planet-renderer.ts:518-520` runs once. The hook is silently lost when:
- fauna meshes are spawned later;
- LOD or material swaps happen;
- a batch renderer reassigns `mesh.onBeforeRender`.

The uniforms then keep their initial values (metres per view unit = 1, identity matrix), which gives almost no fog, so trees render bright.

Two related problems:
- `material.clone()` copies the `userData` flag but not the hook, so attaching to a clone throws "already attached".
- A shared material throws during construction, and the planet fails to load.

**Repair:**
- Attach at mesh creation inside each batch renderer.
- Expose an attached-mesh count in diagnostics.
- Add a test that every `Mesh` under the three groups has the flag.

## Low

- **L1 [Proven latent] Cache key is snapshotted** (`src/local-aerial-perspective.ts:37`). It freezes any original key that changes over time. A naive lazy fix would be worse: the default key is `this.onBeforeCompile.toString()`, which would then return *our* wrapper's source for every material. Correct version:
  ```ts
  const inherited=material.customProgramCacheKey===THREE.Material.prototype.customProgramCacheKey
    ?()=>compile.toString():material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey=()=>inherited()+'/'+LOCAL_AERIAL_VERSION;
  ```
- **L2 BatchedMesh.** The planet-position path mirrors `USE_INSTANCING` but not `USE_BATCHING`. Add it if any batch is a `BatchedMesh`.
- **L3 Sample-format query can throw.** If `getInternalformatParameter` returns `null`, `Array.from(null)` throws out of `render()` before the `try`. Because `samplesContext` is already set, it is never retried. Use `?? []`.
- **L4 [Proven arithmetic; probably predates this branch] 4K at 0× renders 3838×2159,** because 20 B/px × 8.29 Mpx exceeds 158 MiB by 0.1%. That means a full-frame bilinear resample, a slight blur everywhere. Fix by raising the budget to at least 162 MiB, or by snapping the scale to 1 when it is ≥ 0.99.

## XR (existing code, needs Browser validation)

- **XR is correctly forced to 0 samples.** The `!presenting` guard plus the recreate-on-sample-mismatch cover it. Expect one reallocation hitch on session enter and exit.
- **X1: the capture may drop the camera rig transform.** Captures run with `xr.enabled=false`. `render()` then calls `updateMatrixWorld()` on the XR sub-cameras, because their `parent===null`. That resets `matrixWorld` to the reference-space pose and drops the transform of the user camera's parent. It is harmless only if the app camera has no parent. **Guard:** set `view.matrixWorldAutoUpdate=false` during the capture and restore it afterwards.
- **X2: eye lookup silently falls back to the left eye.** `Math.max(0,findIndex(...))` maps an unknown camera to eye 0. With multiview, the ArrayCamera would give the right eye the left eye's textures. Make it fail loudly instead.

## Checked and OK

- **Terrain GLSL parity.** The operations are identical. Note that the unit test only compares the TS reference against a hand-written formula, not against the GLSL.
- **`onBeforeRender` timing.** It is called in `renderObject` before the `modelViewMatrix` update and before `setProgram`. `_currentMaterialId` resets on every `render()`, and each material is unique, so the uniforms upload on every draw, including once per XR sub-camera.
- **Metres per view unit.** `radiusM/planetScale` is correct.
- **Precision.** float32 planet coordinates quantise height to about 0.4 m at Earth radius, which doesn't matter against a 14 km scale height.
- **MSAA formats.**
  - The RGBA16F renderbuffer matches the RGBA16F texture storage.
  - `getInternalDepthFormat(UnsignedIntType)` gives DEPTH_COMPONENT24 on both sides, so the depth blit is legal.
  - The resolve runs at the end of `render()`, before cloud integration samples the textures.
  - `dispose()` frees the depth texture and the renderbuffers.
  - The byte estimate matches the actual allocation.
- **Profiler.** The MSAA blit is counted inside the `sceneCapture` GPU timer.

## Acceptance matrix

| # | Config | Check | Pass |
|---|---|---|---|
| A1 | 0×, 1080p and 4K | Terrain-only frames vs `main`, same seed/time/camera | ≤ 1/255 after tonemap |
| A2 | 0× | Tree vs terrain directly behind it at 1/10/40/65 km; day, terminator, night; airless body | Luminance ratio within tolerance; airless body unchanged |
| A3 | Shaders | Every batch mesh flagged, both injections present, `checkShaderErrors` on | No failures, no NaN pixels |
| A4 | 0/2/4 × 1080p/1440p/4K × Chrome-Win (ANGLE D3D11), Chrome/Safari-mac, Firefox | `effectiveSceneSamples`, `sceneResolutionScale`, `gl.getError()` after first MSAA frame, `gpu/sceneCaptureMs` p95 | Scale ≥ the 0× scale; no GL errors; cost recorded |
| A5 | Toggle 4→0→4 ×10, plus resize | `renderer.info.memory`, `allocatedBytes` | Return to baseline |
| A6 | Canopy vs overcast sky and horizon | Visual: MSAA vs 0× vs post-composite AA | Decide whether MSAA is worth keeping |
| A7 | Quest, and a parented camera if the app uses one | Effective 0×, 2 eyes, stereo-correct captures | Frame time ≤ `main` |
| A8 | Context loss and restore at 4× | Recovery | No throw, targets rebuilt |
