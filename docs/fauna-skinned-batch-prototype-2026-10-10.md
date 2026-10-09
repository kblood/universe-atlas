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
const batch = new FaunaSkinnedBatch({capacity:512,maxVerticesPerAnimal:500,maxIndicesPerAnimal:1500});
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
