# Terrain v2: first implementation slice

Proposed 2026-09-13. Read [research and evidence](terrain-research-2026-09-13.md)
first. This is a ready implementation brief, not a description of shipped work.
The resulting changes and acceptance evidence are maintained separately in
[physical ground and stable shores](stable-shores.md).

## Outcome

A person standing on the bank must see stable ground meeting water while turning,
walking and changing terrain LOD. The first slice establishes a correct surface
boundary. It does not add more foliage to conceal the defect, replace the whole
universe, or claim to finish the erosion/biome system.

## Reproduction and diagnosis

Start from `5088e7d`, seed `LETHRA-001`, body
`G001/C2128,0,1/0/planet/1`, river parent catchment
`G001/C2128,0,1/0/planet/1/drainage-1/n64/outlet/23165`.
Use both the named bank and lake-shore destinations. Add a simple synthetic
sloping shore fixture so projection/LOD behaviour can be isolated from hydrology.
Also include an ordinary ocean coast, an airless moon and a cube-face edge.

Add development-only views/toggles, not production UI clutter:

- Ground-only and water-only, constant colours and depth views.
- Tile ID, LOD, triangle edges and explicit skirt identification.
- Freeze water time, lighting, terrain morph and detail normals independently.
- Log active/pending/evicted tile IDs, camera/body origin and local coordinate
  ranges alongside a short camera recording.

Record an untouched baseline first. Distinguish duplicate fragments, an uncovered
gap, material aliasing and geometry popping before selecting a fix. Avoid raising
water or changing alpha thresholds as an unmeasured general remedy.

## Surface contract

Use explicit fields, with metres relative to the planet's reference surface:

```ts
type SurfaceSample = {
  groundHeightM: number;
  waterHeightM: number | null;
  waterDepthM: number;
  materialWeights: [number, number, number, number];
  geologyVersion: string;
  waterFeatureId: string | null;
};
```

The authoritative ground query includes bedrock/soil beneath water. Terrain
geometry uses it directly. The water renderer owns the water surface, and the
walking rule separately rejects submerged positions. Keep a compatibility adapter
for callers that need the previous `visibleHeightM` semantics during migration;
do not silently reinterpret them globally.

Use the same geometric boundary/depth data for terrain, water and collision
queries. Filtered colour alpha cannot define physical wetness. Coarse and fine
water/ground transitions must have an explicit non-overlapping coverage rule.
Represent the bed even though swimming/diving remains disabled.

Keep small vertex, eye and height differences local before converting to GPU
float32. Do not compute centimetre quantities by reconstructing a unit-radius
planet position and subtracting another such position. Preserve real planetary
curvature and canonical coordinates at poles and cube seams.

The first fix may retain the current quadtree. Require identical shared boundary
positions and stable morph endpoints; measure skirt use and dimensions. Do not
delete all skirts without verifying neighbour coverage. Evaluate depth-buffer
changes only after removing duplicate surfaces, with extension and XR checks.

## Validation gates

1. At a wet point, terrain geometry is the actual bed; there is only one water
   surface owner. At dry points, visual ground and collision agree within 2 cm
   near the player after settling.
2. With water/time/material animation frozen and camera stationary after tile
   settlement, capture 120 consecutive frames. There must be no unexplained
   changes in the shore region. Record the comparison tolerance and renderer;
   do not count animated UI as terrain flicker.
3. Record a repeatable 10 m walk, a slow pan, approach to the water boundary and
   a forced LOD/rebase transition. Inspect the video for holes, stripes, depth
   fighting and normal shimmer. A single screenshot does not pass this gate.
4. A depth/coverage diagnostic must find no exposed background along the synthetic
   shore and no finite-area coplanar water-level terrain. Add numeric border and
   depth assertions independent of the shader implementation.
5. Verify walking refusal, saved-pose restore, date seek, takeoff and explicit
   breadcrumb exits. Collision must not morph under a grounded player.
6. Report CPU/GPU and memory figures on the same baseline hardware and view.
   Preserve the current 256 MiB combined budget. A navigation pass alone cannot
   replace visual acceptance; physical-headset testing is separately identified.
7. Repeat generation in reversed tile order and compare canonical output hashes.
   Preserve existing catalogue IDs. Any required geology migration is versioned
   and documented with its actual effect on saved positions.

## Subsequent generation experiment

Once the stable shore slice passes, create one bounded watershed with two fields:
the existing noise baseline and a new drainage/erosion-informed model. Use common
outlets, ridge constraints, camera paths and lighting. Keep regional boundary
conditions fixed so neighbouring tiles agree; cache the result before rendering.
Generate smaller residual details from the same regional model, with a 0.5–2 m
near-field sampling target, rather than new unconstrained noise at each LOD.

Compare drainage connectivity, plausible valley/ridge structure, preserved coarse
silhouettes, grounded close-up appearance and cold generation latency. The next
renderer experiment uses reusable GPU grid patches and height pages. Freeze the
feature set while comparing it against the current renderer at equal resolution.

## Ready-to-use implementation prompt

> Implement only the stable-shore slice described in this specification. First
> reproduce and record the defect using flat material, water-only, ground-only,
> tile/skirt and depth views. State the verified cause before changing rendering.
> Separate physical ground from the water surface; preserve a real bed beneath
> water while retaining the no-swimming rule. Use camera-relative metre data for
> precision-sensitive shaders and a shared coverage/boundary contract across LOD.
> Preserve the catalogue and navigation behaviour. Do not claim success from
> passing numerical tests alone: provide before/after motion evidence, the stated
> coverage checks, collision agreement, deterministic hashes, generation latency
> and resource measurements. Document remaining defects plainly. Use Terra
> subagents for bounded implementation tasks after assigning interfaces and file
> ownership; keep browser/GPU validation serialized and integration review with
> the root agent. Do not add a planet-wide voxel engine, diffusion model or new
> renderer backend in this slice.

Suggested future ownership: one Terra agent for the ground/water data contract,
one for render coverage/precision, one for the reproduction harness and numeric
invariants. Assign actual file boundaries after inspecting the current code;
do not let two agents edit `planet-renderer.ts` concurrently. Root owns visual
acceptance and coordinates any required interface changes.
