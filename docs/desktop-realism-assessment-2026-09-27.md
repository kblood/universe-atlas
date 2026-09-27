# Desktop realism: assessment and revised direction

## Current direction — 2026-09-27

The user accepted the procedural species → cached structural variants → varied instances approach and authorized implementation. The [consolidated implementation plan](desktop-realism-implementation-plan-2026-09-27.md) now owns the agreed scope, sequence and progress. This assessment preserves the reasoning behind that plan.

Original assessment: 2026-09-27, during the planning-only review. Implementation
began afterward and is recorded in the consolidated plan linked above.

## Decision and review provenance

**Desktop realism is the primary visual target.** Quest will have a separate
profile later. Hardware floor remains open; the working proposal is 1440p/60 FPS
on a representative midrange gaming desktop, with higher settings on the 5090.
This is a proposed target, not an achieved result or a confirmed hardware choice.

Claude Code 2.1.283 completed the requested review using **claude-opus-5-5**,
confirmed by returned model usage, with high reasoning effort. The review had
the proposal, current source files and implementation/validation documents.
It had no tools, screenshots or benchmark execution. Preserve the distinction
between its source findings and its engineering opinions:

- [Proposal supplied to Opus](desktop-realism-proposal-2026-09-27.md)
- [Unedited Opus response](opus-5.5-desktop-realism-review-2026-09-27.md)
- [Actual model metadata and input hashes](opus-5.5-desktop-realism-review-2026-09-27.metadata.json)

## Opus's strongest contributions

1. **Rendering consistency comes before tuning assets.** Terrain, foliage and
   clouds currently use different shading/haze treatments. Settle lighting,
   aerial perspective, exposure, shadows and anti-aliasing before judging a
   detailed tree. This is a stronger priority than in the initial proposal.
2. **Forest structure needs explicit treatment.** Better meshes will not repair
   sparse, evenly spaced crowns or a forest that fades away during ascent. A
   continuous canopy representation must preserve coverage into the distance.
3. **Separate prefetch from visible population selection.** `planet-renderer.ts`
   shifts `forestFocus` along the view heading by up to 2.5 km; `planet-forest.ts`
   uses that focus for dense versus sparse coverage. Source confirms heading can
   affect which area is dense. A forward prefetch region is useful, but drawing
   density should follow stable spatial ownership and projected visual need.
4. **Use persistent spatial buffers.** Per-frame transforms and attribute uploads
   should be reduced before substantially increasing forest complexity.
5. **Bind assets to physical dimensions and genomes.** A new animal mesh must
   represent the existing anatomy contract. Tree crown width and trunk diameter
   need explicit dimensions so LOD, canopy coverage and authored assets agree.

## Findings checked after the review

- `main.ts` enables logarithmic depth. The installed Three shader writes
  `gl_FragDepth`. The actual performance effect on target GPUs still needs
  measurement; the review's categorical early-Z conclusion is too broad.
- The cloud scene capture creates an RGBA16F render target with a depth texture
  and does not request MSAA. Canvas MSAA does not supply samples to that capture.
  Evaluate edge stability in the actual composite before choosing MSAA or post
  AA. Include target allocations and depth resolve in that decision.
- The review's statement that there is no exposure model needs qualification:
  `main.ts` already sets ACES filmic tone mapping and fixed exposure 1.2.
  There is no environment-dependent exposure policy in that setup.
- Terrain already uses `MeshStandardMaterial`, triplanar procedural detail,
  roughness variation and bump detail. Build on it rather than treating PBR
  terrain as absent.
- `touchdownM:125` is only declared in `planet-detail.ts` in the current source
  search. It is not evidence that the old flight floor still controls landing.

## Recommendations to adapt rather than adopt literally

**Keep the first milestone small.** Opus puts a shared atmosphere LUT system,
AA/depth experiments, material migration and shadows together in M1. First
establish measurements and one consistent lighting/compositing baseline. A full
atmosphere replacement should be a bounded follow-on experiment if needed.
Blender reference work can proceed once that baseline is stable; it need not
wait for every distant-forest feature.

**Preserve geography and population initially.** Derive the first aggregate
canopy from the existing population rules. A new clustered, multi-tree-per-cell
generator may be worthwhile, but changes world content and needs an explicit
version/migration decision. Arbitrarily increasing cover in the far layer
would recreate an approach mismatch. Statistical coverage and actual local
occupancy must agree, with bounded regional summaries where needed.

**Keep canopy height separate from ground.** The suggested canopy offset must
not displace collision terrain or alter mountain silhouettes as if trees were
solid ground. Consider a separate bounded aggregate layer or shading treatment;
evaluate parallax and overlap rather than assuming baked colour alone suffices.

**Treat shadow and instance costs separately.** Cascades add GPU drawing work;
they do not inherently multiply the application's CPU matrix rebuilding. Fix
both measured costs. Shadow casters also need their own visibility selection:
an off-camera tree may cast a visible shadow.

**Constrain time-dependent ecology.** Opus's closed-form generation indices are
a useful proposal, but tree generations/seasons must respect body lifecycle,
species existence and signed BigInt dates. Independent regional fire hashes
would not by themselves define a causally consistent disturbance history.
Defer this until the existing time contract and version failures are understood.

**Waypoint checks are insufficient obstacle avoidance.** Clear endpoints can
still have a blocked segment between them. Future fauna paths need bounded
segment/corridor checks, deterministic fallback and continuity at interval
boundaries. Two-bone IK also requires reach limits and slope constraints.

**Use qualified determinism gates.** World identity and physical state must be
independent of cache/order/worker scheduling. Pixel equality is a narrower
same-build, same-device, settled-residency diagnostic. An evolving renderer,
different drivers, temporal AA and asynchronous streaming complicate pixels
without necessarily breaking the world contract.

**Ratify budgets after hardware selection.** Opus's suggested pass budgets use
the whole 14 ms GPU allowance before explicitly reserving fauna, water, UI and
margin. Its 100,000-instance WebGPU trigger is a heuristic, not a measured API
limit. Use actual bottlenecks and integrated frame measurements for decisions.
Keep current full-resolution clouds as the baseline; investigate the earlier
checker artifact before adopting reduced resolution or temporal reconstruction.

## Revised sequence

| Stage | Deliverable | Decision it enables |
| --- | --- | --- |
| 1. Baseline | Fixed in-game valley, reference photos/poses/routes, full-game timings, AA/depth audit, consistent sun/sky/shadows | Which pipeline and hardware budgets support the target? |
| 2. Forest continuity | Stable chunk buffers, visible coverage independent of heading, aggregate canopy from current rules | Does the same forest remain convincing from orbit to ground? |
| 3. Ground realism | One Blender tree family, bark/leaves, rocks, soil/wetness and dense ground cover | Does walking through the scene look believable? |
| 4. Animal realism | One genome-compatible rig, believable movement and foot contact | Can existing animals look and move coherently at close range? |
| 5. Breadth | Second biome, additional species, optional ecology changes and separate Quest profile | Does the approach generalize within measured budgets? |

Each stage should include low flight and descent, not merely a walking showcase.
Use ordinary clear weather as well as clouds. Preserve canonical object identity
across representations. Keep simple physical-size markers in evaluation views
so an unfamiliar animal is not the only scale reference.

## Verified technical references

- Three.js provides a WebGL [cascaded shadow addon](https://threejs.org/docs/pages/CSM.html).
  It is a candidate, not proof it integrates unchanged with Atlas's patched materials.
- [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) reduces draw
  calls and exposes explicitly updated instance attributes. Persistent chunks
  are an Atlas design proposal layered on that capability.
- Bruneton's [atmospheric scattering implementation](https://ebruneton.github.io/precomputed_atmospheric_scattering/)
  includes a WebGL2 demo and configurable density profiles. It is a useful
  reference for unified atmospheric treatment, not a validated Atlas dependency.

No implementation tests were run in this planning turn. Existing validation
numbers are historical evidence linked in the proposal. Assetctl capability
discovery confirmed the local Blender/export tools are available; no assets were
generated, imported or published.
