# Single-draw skinned fauna prototype

Opt-in backend only; production remains unchanged. `FaunaSkinnedBatch` owns
one merged indexed mesh per LOD. Exact worker-built genome geometry is copied
into fixed actor blocks. Per-vertex actor slot IDs select22-bone palettes and
root matrices from float textures. Unique morphologies and baked coat colours
can share a draw without substituting a species-average body.

The geometry key contains the complete genome and LOD/version, not just an
archetype. A reused key is accepted only when plan and every vertex/index/colour/
skin byte agree. Cache and actor limits reject overflow; callers retain the
existing representation for unprepared actors. No geometry builder is called
by frame submission. Empty blocks are GPU-clipped, so reserved triangle work
is reported separately from actual active triangles. Multi-draw extensions
are unnecessary. Directional and point-light shadow materials use the same
skinning and coverage code; the opaque colour pass uses existing coat lighting.

API:

```ts
const batch = new FaunaSkinnedBatch({capacity:512,maxVerticesPerAnimal:500,maxIndicesPerAnimal:1500,maxBufferBytes:64*1024*1024});
batch.registerGeometry(key, workerBuiltLod);
batch.prepareAnimal(member.id,key); // off-frame admission
batch.beginFrame(origin);
batch.submit(member.id,parentMatrix,palette22x16);
batch.endFrame();
scene.add(batch.group);
```

For that capacity/budget, atlas positions/normals/colours/skin/actor IDs reserve
9,472,000bytes and Uint32 indices3,072,000bytes. Bone palettes reserve720,896bytes
and roots40,960bytes. CPU geometry cache is bounded separately and adds only
admitted arrays/plan references, never complete source body/LOD chains. GPU
uploads mirror atlas and palette arrays, so CPU bytes and GPU bytes must both
be counted; diagnostics reports the components rather than claiming a total
includes device overhead. Full palette/root textures upload only when changed;
repeated paused palettes skip uploads. Three concurrent512-actor LOD pools
would multiply reserved resources and are not an approved configuration.

`FaunaBonePaletteWriter.write` matches the detached near skeleton's compose,
world matrix and inverse-bind calculation, including Float32 rounding. Tests
compare every lane against `THREE.Skeleton.update` at four exact canonical
activity dates. `writer.pose` runs the actual `quadrupedPoseAt` and packing,
so benchmarkers can include that solver cost. It allocates as the existing
solver does; palette-only backend timing is not end-to-end animation timing.

Focused tests verify exact palettes, safe cache reuse, admission bounds,
512 stable actor slots in one mesh, unchanged geometry across frames and
zero repeated paused palette uploads. Browser shader compilation, matched
visual quality, cold worker generation, full512-actor locomotion and GPU time
remain required measurements before any production choice. Current source
build/deformation costs cannot be inferred from a small shared fixture cache.

Default reservations are128actors/500vertices/1500indices, with16bit atlas
indices below65536vertices. A16MiB typed-buffer gate counts bothCPU/GPU
atlas/palettes plus the worst-case bounded CPUcache arrays; plans, keys,
worker source and driver metadata remain separate. Larger512-actor measurement
pools require an explicit larger maxBufferBytes and are not production approval.

Matched CPU-stage fixture,512members and exactactivity at bothpaused/moving
dates (exclusive testslot,20warmed measuredframes):

| Path | Pausedp50/p95ms | Movingp50/p95ms |
| --- | --- | --- |
| Currentbody2 proxy |0.333/0.494|1.044/1.784|
| Paletteonly batch |0.288/0.371|0.304/0.548|
| Canonicalpose+palette+batch |7.026/11.084|7.012/10.045|

This fixture deliberately uses3vertex geometry for CPUstage isolation;
worker geometrybuild and GPU costs are excluded. `tests/fauna-skinned-batch.bench.mjs`
reproduces it. The canonical solver dominates and allocates existing vectors,
quaternions and posearrays. The prototype currently **does not outperform**
the proxy end-to-end; palette-only performance must not be cited as a win.

## Explicit approximate LOD pose

`FaunaLodPoseWriter.prepare(plan,member)` caches the actual source plan's22
rest offsets and deterministic member breath phase. `write(handle,activity,
rigSeconds,out)` fills a persistent Float32 palette with cached affineFK and
bounded limb/head/tail motion. No per-frame objects, geometry, fullgrazing or
terrain-stencil IK. Exact source shape/coat, root placement, member identity,
activitygait and datedorbit remain unchanged; **bone pose is an explicitly
approximate presentation**. Six hero rigs retain fullcanonical locomotion.
A common vertical lift keeps the four toe-sphere endpoints above the body's
localgroundplane; this is not a proof that every blended vertex avoids an
uneven terrain stencil. Tests sweep idle/walk transitions and65phases for all
four archetypes, source/activity immutability and seek/repetition determinism.

Repeated unchanged outputs skip recomputation for persistent output arrays.
Call `invalidate(handle)` if another writer modifies that palette, including
switching between canonical and approximate benchmark modes.

Latest matched CPUstage run: body2movingp50/p95=1.061/1.394ms;
approximate pose+pack+batch=0.827/1.079ms. Pausedbody2=0.326/0.428ms,
pausedapproximatecached=0.343/0.637ms. These are descriptive CPUstage timings,
not a completedGPU/visual/device result or approved productionreplacement.
