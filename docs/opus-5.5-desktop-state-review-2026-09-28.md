_Independent source and screenshot review, 2026-09-28. Snapshot: clean source/live release `8e16776`. Opus was given the plan, implementation records, source, local integration screenshots and the then-unresolved live smoke result. The response below is preserved verbatim; its estimates and recommendations are reviewer judgments, not additional test results. See the [response metadata](opus-5.5-desktop-state-review-2026-09-28.metadata.json) and [implementation assessment](desktop-state-review-assessment-2026-09-28.md)._

# Opus 5.5 review: Atlas desktop realism, current state and direction

I looked at both screenshots myself before writing the visual section. Labels used below: **[O]** means observed in the screenshots or supplied source, **[I]** means my inference, **[U]** means unverified.

## Bottom line

The foundation work is solid: canonical identity, retained origins, stable slots, dated species binding, and canopy census/ownership. But the landscape the user sees has barely changed since the canopy release. The project has been producing well-documented labs faster than it produces visible, shipped improvement. The biggest visual problems now are **lighting** (no shadows, near-black undersides) and **mixing two tree representations** in one scene. Foliage mip filtering matters, but it is not the top blocker. The next deliverable should be one enabled, lit forest vertical slice. It should not be another isolated lab.

## 1. Where we are against the full request

**Shipped (live `8e16776`):**
- The canopy runtime through `98556a7`: complete census patches, near/far ownership, altitude prefetch, and retained date refresh.
- Shared aerial perspective and the diagnostic AA option.
- Forest selection cache and packed transfer.
- A corrected guide, with all 295 PNGs verified.
- Visually, the live forest is still the legacy faceted trees and primitive fauna. **[O, from docs]**

**Proven only locally:**
- The dev-hook EZ-Tree family F in near/mid slots, on one RTX 5090 fixture, with date replay and 316.87 m of movement.
- 58 focused tests. This is not the full suite, which still has four known failures.
- The capture/impostor, MASK/HASH and transmission labs.
- None of these are enabled by default, and none has visual or performance acceptance.

**Not started or only planned, against the full objective:**
- Species-specific dimensions and structural variants (the recipe contract exists but the renderer doesn't use it).
- Spire/conifer trees on the new path.
- A far representation derived from the new tree.
- Shadows and final lighting.
- Rocks, ground cover and grass.
- Rigged, grounded fauna.
- Orbit-to-ground cloud and atmosphere continuity work.
- Midrange hardware measurement.
- Quest.

By vertical user value, I'd put the objective at roughly 25–30% done: mostly infrastructure, with very little of the perceived realism. **[I]**

**Live smoke is unresolved [U].** On `8e16776`, Find Life was clicked and `terrainCruise` stayed null for 60 s. Two candidate causes are plausible and neither is proven:
- The game was driven at a 320 px guide viewport, which could change layout or gating.
- A real runtime regression on the main user path.

Also relevant: both screenshots show a "This bookmark predates the current combined model" banner **[O]**. Bookmark/version gating is therefore active on this route, and it is a candidate to check. This is priority zero because it is the primary user path.

## 2. Visual assessment

These two views are a local, mixed-representation integration fixture. They cover one temperate hillside at midday-ish sun. They do **not** cover orbit, clouds, water, other biomes, grazing light or overcast.

**Initial view (elevated oblique):**
- **[O]** Most trees are legacy faceted "umbrella" crowns: lit tops, dark lower facets. The EZ-Tree instances show up as small, spindly, nearly leafless twig skeletons. At this distance they read as dead scrub next to the heavy legacy crowns.
- **[O]** Spacing is very even. There is no clustering, gaps, understory or visible size hierarchy. The terrain is a smooth green surface with low-frequency blotches and no rocks or ground cover.
- **[I]** The skeletal look at a few hundred metres matches the measured roughly 13% alpha coverage retention at 32 px. Minification loss is real and visible here.

**After-movement view (near ground):**
- **[O]** The one close detailed tree (centre-right) is honestly the most believable object in the frame: branching structure, textured leaves, reasonable mid-green. At close range, family F is not "dark". Its problem is crown mass and density relative to its neighbours.
- **[O]** The legacy crowns overhead have almost black undersides, and the trunks are black. Stub branches poke out below the crowns. **Nothing casts a shadow**: not the trees, not the animals.
- **[O]** The animals are thin, stilt-legged dark silhouettes with no contact shadow. They read as placeholders.
- **[O]** At walking height the ground is a blurred painted plane.

**HUD readout [O]:** "220 draws · p95 38 ms" in the first view and "173 draws · p95 45 ms" in the second, on the RTX 5090. I don't know the measurement window. It may include asset load or rebase hitches **[U]**. It is consistent with the earlier canopy fixture's frame interval p95 of 27 ms and CPU planet update p95 of about 20 ms. The whole game is already under 60 fps on the best hardware. **[I]** The GPU pass sum was 4–7 ms, so the limit appears to be the main-thread CPU, not the GPU.

**Overall believability:** low. Scale is roughly right, but three things break the image: no shadows or sky fill, two incompatible tree styles side by side, and uniform placement. Fixing foliage mips alone would not change that verdict.

## 3. Architecture and prioritisation

**Sound:**
- Keeping the population canonical and making presentation a replaceable layer.
- Rendezvous species binding that is independent of catalogue order.
- Height applied in the shader so leaves keep their physical size.
- Per-instance tints without per-tree materials.
- Switching to pinned EZ-Tree after admitting custom authoring was reinventing it. That was the right correction.

**Concerns:**
- **Far representation is a design gap, not polish.** Detailed near/mid trees hand off at 550–600 m to legacy faceted crowns, so the silhouette changes category at that distance. An enabled family needs a matched far form.
- **Mixed batches keep drawing hidden legacy slots.** Coverage 0 means the legacy vertex work is still paid for detailed cells, while `mesh.visible=false` only applies when every slot is detailed. `planet-forest.ts` also carries both regimes inline, and it is getting harder to reason about.
- **The recipe contract is unused.** Crown width, trunk diameter, leaf density and 8 variants are computed but never reach geometry. That is fine for a prototype, but it shouldn't keep growing tests.
- **No spire/conifer path.** Any mixed-species forest will stay two-style until one exists.
- **Effort balance [I].** v1–v7 authoring, capture v2, the Three.ez comparison, MASK/HASH temporal and isolated probes, SwiftShader edge thresholds, and an Opus review per increment are each individually defensible. Together they are stalled vertical progress. Each stage has also grown the plan document with long status prose, which now reads as a changelog. Documentation cost is competing with implementation.

## 4. Next deliverable and ordered path

**I challenge the proposed order.** Coverage-preserving alpha mips are cheap, established (Castaño), and visible in shot 1, so do them. But do them as one sub-task of the slice below, computed at load time from the embedded PNG in JavaScript. Don't run a new measurement matrix for it. **Defer the MSAA alpha-to-coverage trial.** The cloud scene capture defaults to 0 samples, so A2C would not help on the default path, and it doesn't address the dominant problems.

**Next deliverable: an enabled desktop "forest slice v1" behind a user-facing quality toggle, not a console hook.**
1. **Fix or explain the live smoke first.** Rerun it with a desktop viewport and the new failure capture.
2. **Lighting baseline for all vegetation, legacy and new.** Add a hemisphere/sky fill so crown undersides stop going black. Add one bounded sun shadow region around the camera (about 150–300 m, tuned by measurement), covering trees, animals and terrain. Use existing Three.js shadow maps; don't jump to CSM yet.
3. **Replace, don't mix.** Give branching species family F plus alpha-coverage mips. Generate a second EZ-Tree conifer preset family for spire species through the same adapter. Legacy trees then only remain as a load-failure fallback.
4. **Matched far form.** Refit the existing far proxy's crown envelope and colour to each family's measured bounds and mean albedo, so the 550–600 m handoff keeps its silhouette category. Integrate the Three.ez or capture impostor only if the refit clearly isn't enough.
5. **Wire recipe height and crown width into the instance scale.** Variants stay at 1 for now.

**Then, in order:**
- Ground cover near the camera (GPU grass plus a rock scatter from the existing habitat query) and terrain micro-detail.
- Placement clustering and gaps under an explicit population version.
- A CPU frame budget pass on planet update, in parallel, because it is already the ceiling.
- Clouds and orbit-descent continuity review.
- One rigged fauna body plan.
- 2–4 structural variants per family.
- Breadth, then Quest.

**Stop or defer:**
- Further Blender custom tree authoring.
- MASK/HASH studies.
- The A2C trial.
- SwiftShader threshold work.
- Exact-individual proxy refinements.
- The atmosphere LUT.
- WebGPU.
- XR.
- Per-increment Opus reviews for small labs: review slices instead.
- Rewriting the plan's status prose each step: add a short dated changelog entry instead.

## 5. Validation sufficient to enable a realistic tree family

- **Normal user paths on the deployed build, no dev hooks, desktop viewport:**
  - Orbit → Find living habitat → fly → Land and walk.
  - Plus a surface bookmark.
  - At two dates, one of them historical or negative, where the species set differs.
  - Pass: zero console/GL errors; assets load through the normal packaging; forced asset failure falls back to legacy trees.
- **Fixed pose set from plan §8:** ground, low flight, 300 m, 3 km, including a grazing-sun pose. Capture family-on and family-off screenshots and have a human judge them against written criteria:
  - no mixed styles at the handoff;
  - canopy coverage at 300 m and 3 km no sparser than legacy;
  - no black undersides;
  - shadows present and matching the geometry, including wind.
- **Full-game on/off comparison on the same machine and route:**
  - frame interval p50/p95/p99, hitch count above 50 ms, CPU planet update, GPU pass sum including the shadow pass, draws, triangles, estimated GPU memory;
  - cold versus warm, with first-use shader compile measured (pre-warm with `compileAsync`).
  - Run it on the 5090 **and at least one clearly weaker available device**, and report the relative regression. That means no invented absolute budgets for a hardware floor nobody has specified yet.
- **Identity:** keep the existing date replay and A→B→A checks.

If all of this passes, you can say the family is enabled on desktop. That is still not the same as "production realism", and the release notes should say so.
