# Opus 5.5 browser tree adapter review

Date: 2026-09-28. Source-only review of the initial prototype; this is not a browser execution report. Input hashes identify the reviewed snapshot. Parent follow-up fixes and independent tests are tracked in the browser implementation record.

**Tree prototype review (Opus 5.5, `claude-opus-5-5`, source only, no tools run)**

## Blockers

**1. Unset instance slots render full-size leaf cards at the batch origin.** See `createBatch` / `setInstance` in `src/tree-asset.ts`.

- `InstancedMesh` fills `instanceMatrix` with identity matrices.
- `instanceTree` starts as zeros.
- `count = max(count, index+1)`, so any gap below the highest index draws an unset slot.
- In an unset slot the bark collapses to a point (`position*0`). Foliage does not: `_leaf_pivot*0 + R*(position-_leaf_pivot)` puts every leaf card, at physical size, around the batch origin.
- There is also no way to remove an instance or lower `count`.

The lab sets indices 0 to 2 in order, so it hides this. Fix options:
- Require `index <= count` and add a `setCount` or `remove` method.
- Or initialise every slot with `makeScale(0,0,0)` and write the same when an instance is cleared. The instance matrix is applied after the shader deform, so this also collapses the leaves.

**2. Lab diagnostics read like performance or memory evidence but aren't.** Relabel them, or keep them out of any recorded results:
- **`textureBytesCompressed`** is PNG container size. GPU cost is width × height × 4 × about 1.33 per texture, because `GLTFLoader` textures generate mipmaps by default. Never quote it as texture memory.
- **`renderer.info.render.triangles` and `calls`** include the shadow pass. They are roughly double the main-pass numbers, so they are not LOD triangle counts.
- **`renderer.info.memory.textures`** includes the shadow map render target.
- **`memory.geometries`** only counts uploaded geometry. The hidden LOD batch doesn't upload until it is first shown, so switching LOD changes the count.
- **`renderCPUms`** measures CPU submission time only. It excludes GPU time and the first-compile spike. Name it that way in the output.
- **`heightsM: [10,16,22]`** is hard-coded, not read back from the instances.
- **`sharedMaterials`** is true by construction. It shows JS identity, not a measured GPU saving.
- The `materials` count leaves out the 8 depth/distance materials per lab (2 batches × 2 meshes × 2).

## Should fix

**3. The LOD pair is only checked for texture identity, not vertex-contract parity.** `prepareTreeLODPair` compares materials, textures, samplers and PNG bytes. Sharing the LOD0 material also depends on the geometry matching:
- **Extra attributes:** if LOD1 carries `COLOR_0` or `TEXCOORD_1` and LOD0 doesn't (or the reverse), `GLTFLoader` gives them different material variants. The shared material then reads a missing attribute, e.g. black foliage from the default `(0,0,0,1)`.
- **Accessor types in `readGLB`:** check type, componentType and `normalized`. You need `_WIND` SCALAR float, `_BRANCH_LEVEL` SCALAR float, and `_LEAF_PIVOT` VEC3 float. A normalized `_BRANCH_LEVEL` silently breaks the `>3.5` leaf test.

Assert that both LODs have identical attribute key sets and accessor formats per primitive.

**4. Foliage shadows depend on alpha mode MASK.** The depth material copies `alphaTest` from the source material. If foliage is exported as BLEND, `alphaTest` is 0 and the shadows become solid 1×1.2 m quads. Assert foliage `alphaTest > 0` at load, or set an explicit cutoff for the depth material.

**5. Depth packing depends on the Three version.** `RGBADepthPacking` must match what the installed Three version's `WebGLShadowMap` expects for directional PCF. Pin or verify this against the actual `three` version in `package.json`.

**6. Wind axis is in object space.** Rotation is about local Z after instance yaw. With random yaw, neighbouring trees sway in different world directions. This is acceptable as leaf flutter, but don't describe it as directional wind. For coherent wind, pass the wind direction into the shader and rotate it by the inverse of the instance yaw.

**7. Each batch duplicates all vertex data.** `geometry.clone()` deep-copies every attribute, so every batch gets its own CPU and GPU vertex buffers. This is fine for the lab, but lab memory numbers don't reflect the intended scaled design. If you later share attribute objects across batches, note that `geometry.dispose()` frees GPU buffers for attributes that other batches still use. Those batches then re-upload on their next draw. Sharing needs ownership handling.

**8. The lab's `load` can dispose the live family.** In `src/tree-asset-lab.ts`, `family=next; batches=nextBatches;` runs inside `try`. If `scene.add`, `setDate` or `setLOD` throws after that, the `catch` disposes the batches and family that are now current. Clear `next` and `nextBatches` right after the swap, or move the swap and its follow-up out of the `try`.

**9. Minor issues:**
- If `parseAsync` rejects partway through LOD0, textures created before the rejection are never collected and leak.
- While animating, `setDate` rewrites the date input every frame, so the user's typed value gets overwritten.
- The date-parse error is stored in `loadError`, which mislabels it and persists until the next load.
- Foliage has `receiveShadow=true` on double-sided alpha cards, which will likely cause self-shadow acne. Check `normalBias` against the 22 m case.

## Checked and correct

- **LOD1 GLB rebuild:** the 28-byte headers, space padding to 4 bytes, preserved binary offsets and total length are all correct.
- **Attribute names:** `GLTFLoader` lowercases unknown attribute names, so `_WIND`, `_BRANCH_LEVEL` and `_LEAF_PIVOT` map to the shader's `_wind`, `_branch_level` and `_leaf_pivot`.
- **Rotation convention:** the shader's `mat3(c,s,0,-s,c,0,0,0,1)` is column-major and equals a +angle rotation about Z. That matches `applyAxisAngle((0,0,1), angle)` in `treeVertexMeters`.
- **Tangent rotation:** it is correctly guarded by `USE_TANGENT`. The depth/distance shaders only contain `beginnormal_vertex` under `USE_DISPLACEMENTMAP`, so that replacement is harmless there.
- **Shared program cache key:** it is safe. `onBeforeCompile` still runs for each material even when a cached program is reused, so each family's `phase` uniform binds correctly.
- **Shadow side:** `side` on the depth material is overwritten by `WebGLShadowMap` from the source material's `side` / `shadowSide`, so passing it has no effect.
- **Wind phase:** the BigInt modulo in `phaseFromPeriod` is exact and loops seamlessly every 7 s. The lab's ms→ns conversion (`delta*1e6`) is correct.
- **Dispose order:** batch-before-family is enforced, `InstancedMesh.dispose()` releases `instanceMatrix`, and closing each `ImageBitmap` is safe even when two textures share one.

## Test suggestions

- **CPU/shader parity:** the CPU reference takes `leaf: boolean` while the shader uses `_branch_level > 3.5`. Derive `leaf` from the same threshold in the tests.
- **Gap slots:** render a batch where only index 2 is set, and assert nothing draws near the batch origin (blocker 1).
- **Attribute mismatch:** build an LOD1 with an extra `COLOR_0` and assert the load rejects it (item 3).
- **Alpha mode:** build a foliage material with alpha mode BLEND and assert the load rejects it or overrides the cutoff (item 4).
- **Swap failure:** simulate a failure after the swap in the lab and assert the old family survives (item 8).
