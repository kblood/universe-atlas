# Independent review: desktop realism proposal (Atlas, baseline `27e89c8`)

Reviewer: Claude Opus 5.5. This is planning only. I ran no tests, did no browsing, and saw no screenshots. Tags used below:

- **[Code]**: observed in the supplied source, with the file named.
- **[Judgment]**: my engineering opinion.
- **[Unverified]**: a technical claim that needs checking before anyone relies on it.

Cost figures are marked *speculative*.

## Verdict

The direction is right. The proposal is also appropriately modest: it names a hardware floor, a representative scene, identity checks, and says "no promise of every tree to the horizon." I disagree with its **ordering**, and with two things it underweights.

1. **Pipeline first.** The render pipeline under any new asset is not yet coherent. Lighting models differ per subsystem, anti-aliasing is likely lost in the cloud capture path, and depth handling may penalise foliage. Tree or animal assets tuned on top of this would need retuning later. Pipeline correctness should come before Blender work, not beside it.
2. **The forest is mostly absent.** From most flight altitudes the forest does not exist visually. Where it does exist, its structure reads as sparse, gridded parkland. That is a generator and representation problem, and better tree meshes will not fix it.

WebGL2 is sufficient for the first landscape. The binding constraints are CPU-side instance churn and pipeline decisions, not the API.

**The three changes that buy the most realism [Judgment]:**

1. One atmosphere and lighting model applied to every surface, with working AA.
2. A continuous canopy field, with correct forest structure near the viewer and an aggregate canopy layer to the horizon.
3. Dense GPU-generated ground cover plus terrain meso-detail at walking scale.

Authored assets are the fourth lever.

---

## Five highest-priority findings

### 1. Lighting and aerial perspective are incoherent across subsystems

**[Code]**
- Terrain patches use `MeshStandardMaterial`. Their own haze is injected before `opaque_fragment`, with a sky colour of `(.23,.43,.64)` and a 65 km scale (`src/planet-renderer.ts`, `install`).
- Forest (`src/planet-forest.ts`, `forestMaterial`), flora (`src/planet-renderer.ts` constructor) and fauna (`src/fauna-field-renderer.ts`) use `MeshLambertMaterial`, with no equivalent haze term in the supplied source.
- Clouds use a third haze with different constants: `(.24,.36,.55)`, `exp(-t*.0015)` (`src/volumetric-clouds.ts`).
- The cloud ground-shadow multiplies total scene colour, and the code says so.
- No shadow casting is configured for trees or animals.
- There is no exposure model. Tone mapping happens only in the cloud resolve.

**[Unverified]** Whether `main.ts` sets `scene.fog` or other lights that make vegetation haze match terrain. If it doesn't, trees at 3–4 km will read darker and more contrasty than the ground beneath them. That is the classic "pasted-on" look.

**[Judgment]** This matters more than mesh quality. Simple geometry under consistent sky ambient, aerial perspective and contact shadowing reads as real much sooner than detailed geometry under mismatched shading.

### 2. AA and depth policy are unresolved, and they constrain foliage technique

**[Code]** `VolumetricClouds.render` draws the whole scene into a `WebGLRenderTarget` with `HalfFloatType` and a depth texture, but no `samples` (`src/volumetric-clouds.ts`). On every world with clouds, the final image is therefore built from a non-multisampled capture. Canvas-level MSAA does not help it. Thin trunks, branches, grass and shorelines will alias and shimmer.

**[Unverified]**
- Whether the logarithmic depth buffer (queried via `renderer.capabilities.logarithmicDepthBuffer`) is enabled in the game.
- Whether, in this Three.js fork, it writes `gl_FragDepth`. If so, that defeats early-Z. Alpha-hashed or alpha-tested foliage and dense grass then pay full fragment cost on every overdrawn layer.

**[Judgment]** Decide the following before authoring leaf cards. Alpha-to-coverage needs MSAA. Alpha-hash without temporal AA is noisy. The depth choice feeds directly into cloud depth reconstruction.

- **AA:** MSAA capture versus a post AA.
- **Depth:** log depth versus reversed-Z versus a separate local/background pass.

*Speculative cost:* 4× MSAA on a 1440p half-float target with depth is roughly 100–180 MB. That collides with the 160 MiB cloud cap, so the AA decision also means rebalancing memory.

### 3. The forest reads as sparse gridded woodland, and vanishes beyond 4 km

**[Code]**
- One candidate tree per 18 m cell, with jitter confined to 0.2–0.8 of the cell (`src/planet-population.ts`). The minimum spacing is about 7 m, which gives a quasi-lattice that is visible from above.
- Heights are uniform on 10–22 m and independent of site or neighbours. Presence is `roll<.76`.
- The slope check samples only along the `right` axis (`src/planet-forest.ts`), so slopes along the other axis pass.
- Far trees are a 6.5% subset.
- Drawing ends at 4 km, and everything fades out above 3.5 km altitude.
- At 3 km altitude the geometric horizon is roughly 200 km away (from the design doc's formula), so the forest is a small disc under the aircraft.

**[Judgment, rough estimate]** From the crown sphere constants in `treeGeometry`, maximum canopy cover works out on the order of 15–25%. Closed forest is typically far denser. This looks like parkland. **[Unverified]** Confirm by rendering a top-down canopy mask.

**[Code]** During flight above 40 m, the dense-forest footprint is centred on a look-ahead point up to 2.5 km ahead of the camera (`src/planet-renderer.ts`, the `forestFocus` shift). Both the 650 m footprint and `horizontal` in `src/planet-forest.ts` are measured from that point. So the visible density of a fixed patch depends on camera heading, and turning re-triggers selection. This is a continuity defect, not only a cost choice.

### 4. Per-frame instance churn blocks shadows and the CPU budget

**[Code]**
- `PlanetForest.update` sets `origin = eye` every frame.
- It recomposes a matrix for every resident tree: up to about 4,300 near/mid trees plus 8,192 canopy instances.
- It unconditionally marks all matrix, colour and coverage buffers `needsUpdate`.
- `faunaGroundedTransform` allocates several `Vector3`, `Quaternion` and `Matrix4` objects per animal per frame (`src/fauna-runtime.ts`). The "no allocations" comment in `drawFauna` is therefore inaccurate.
- The terrain eviction sorts all patches every frame (`src/planet-renderer.ts`).

**[Judgment]** Shadow cascades re-submit the same instances, so this churn multiplies once shadows arrive. Measured terrain p95 of 28–74 ms already shows the main thread is the risk. The design doc's own rule, "chunk vertices relative to stable chunk origins", should apply to vegetation too:

- static per-chunk instance buffers;
- a double-precision chunk-to-camera offset passed as a uniform;
- rewrites only on origin shift or residency change.

### 5. Time, scale and version contracts are missing where assets will attach

**[Code]**
- `PlanetForest` takes no date. Trees never grow, die, or change season, and identity is `(seed, POPULATION_VERSION, cell)`.
- Tree dimensions are defined only by height. Crown width is implied by the authored geometry, not owned by the generator.
- Fauna anatomy is procedural per genome (`src/fauna-field-renderer.ts`). A single Blender-rigged animal, as the proposal describes, cannot express `torsoLength`, `legLength`, `neckRise` and so on without a parametric rig.
- The header of `src/fauna-runtime.ts` still describes a 280 m skinned/VAT/impostor ladder that `planet-renderer.ts` no longer uses. That is stale documentation.
- The validation report lists a pre-existing **history-version-compatibility** test failure. Adding generator, asset and representation version axes on top of a failing version-compat test is risky.

---

## Independent architecture (my design, separate from the author's)

### A. One atmosphere service
Evaluate a single parameterised atmosphere per body. Hillaire-style transmittance and sky-view LUTs plus a low-resolution aerial-perspective volume are candidates. Expose three GLSL functions via a shared chunk:

- `transmittance(p, dir)`
- `inscatter(eye, p)`
- `skyIrradiance(normal, p)` (SH or a small cube)

Terrain, forest, flora, fauna, water and clouds all call these. Delete the three hand-tuned haze constants.

Exposure is a deterministic function of sun elevation, altitude and cloud cover at the eye. It is not adaptive history, so fixed-date pixel replay stays exact.

**[Unverified]** Rendering to 3D-texture slices in WebGL2 through this Three fork. The fallback is a 2D-atlased froxel volume.

### B. One material model
Move vegetation and fauna to the same physically based model as terrain. Add a cheap foliage transmission term for back-lit leaves. Use the existing detail-atlas idea for bark and ground.

### C. Shadowing in three tiers
1. **Near:** a sun shadow map, or two to three cascades, over roughly 150–300 m, covering trees, animals and terrain.
2. **Mid:** per-tile terrain horizon angles baked in the terrain worker. These give deterministic self-shadowing at any date because they depend only on sun direction.
3. **Far:** canopy darkening from the aggregate field (D).

*Speculative cost:* each cascade re-renders near foliage vertices. Budget about 2–3 ms GPU on the floor hardware and measure it.

### D. Canopy field as the canonical aggregate
Define a deterministic field `C(x)` holding:

- expected crown cover;
- mean top height and its spread;
- leaf type;
- phenology colour.

It is computed from the same classifier inputs as the trees, never by counting instantiated trees. Individual trees become a clustered point process conditioned on `C`: cells can hold zero to several trees, sizes follow allometry, and the per-cell expected cover matches `C`.

| Range | Representation |
| --- | --- |
| Near (< ~200 m) | Full meshes |
| Mid (~200 m – 2 km) | **All** trees as octahedral impostors or low meshes from static chunk buffers, not a 6.5% subset |
| Far (to horizon) and orbit | Canopy baked into terrain tile data: albedo, roughness, a crown-bump normal and a small canopy-height offset on the tile vertices |

Blends are coverage-conserving. Shell cover in a region is reduced by the fraction already drawn as individual trees, which avoids double-darkening. The orbital tile colour must come from the same `C`.

**[Unverified]** Whether `planet-worker.ts` can run `biomeClassifier`. *Speculative memory:* packing canopy into existing tile texels rather than adding a map avoids about +50–70 MB at 768 resident tiles.

### E. GPU ground cover
Instanced grass-patch meshes whose blades are placed in the vertex shader by hashing world-cell integers relative to the chunk anchor. Heights come from tile height textures. Density comes from a biome texture. There is no per-blade CPU work, and the result is deterministic.

The current 2 m grass cells to 34 m (`add(34,2,'flora')`) cannot produce a meadow.

### F. Time contracts (closed-form, random-access)
- **Trees:** each cell has a generation index `k = floor((t − offset_cell)/L_species)`. Tree identity includes `k`, and age is the remainder. Phenology is a function of date, latitude and axial tilt. Disturbance events (fire, windthrow) are deferred, but when they come they must be hashed per region-epoch, not simulated.
- **Animal paths:** replace circular orbits with piecewise segments between hashed waypoints inside a home range, indexed by `floor(t/T)`. Waypoints are rejected against the canonical tree field, which gives deterministic obstacle avoidance with no history.
- **Foot contact:** with a closed-form body path and gait phase, the last footfall time for each leg is computable. The planted foot is pinned at the body pose at that time plus the stance offset, followed by two-bone IK against the herd terrain stencil. It is exact at any date.

### G. Scale and version contracts
- **Generator owns the physical envelope.** Each species has an allometry (height → crown radius → trunk diameter). Genomes own animal proportions.
- **Assets conform to it.** They are authored in metres with the pivot at the root collar or ground contact, and LODs must preserve silhouette area within a stated tolerance.
- **Animal assets are parametric.** Bone-length parameters plus blendshapes, driven by the genome.
- **Two version groups.**
  - *Identity manifest* (generator + population): governs IDs, positions, dimensions and existence.
  - *Appearance manifest* (asset library hash + material version + renderer version): governs pixels only.
- **Pixel baselines** are keyed on both groups. Deep links carry both.

### H. API
Stay on WebGL2 for milestones 1–4.

**Migration trigger:** a measured need for GPU-driven culling or LOD of more than roughly 10⁵ instances, or compute-based cloud or atmosphere work that cannot fit fragment passes.

**Cost that argues for waiting:** every `onBeforeCompile` string-patched material (terrain, forest, and more) would need rewriting for a node-based pipeline. That is the dominant migration cost. **[Unverified]** How far `WebGPURenderer`'s WebGL2 fallback would reduce it.

---

## Where I disagree with the author

1. **Order.** The proposal pairs the lighting baseline with "one validated tree family" in milestone 2. I put pipeline correctness alone first, then the forest field, then assets.
2. **Asset versus structure.** One tree family cannot make a forest believable. Beyond about 100 m, realism comes from closure, clustering, and size and age distribution, which are generator properties.
3. **Animal as scale cue.** An alien animal of unknown size is a weak scale cue. Scale reads from grass, rocks, trunks and aerial perspective. Use non-shipping evaluation markers (a 1.8 m figure, a 10 m pole) in the reference scene from milestone 1, and do animation work later.
4. **"One coherent animal body plan."** This must be parametric over the existing genome, or it forks the creature system.
5. **Full-resolution clouds.** They were adopted on an RTX 5090. The cloud lab measured 2.85–6.03 ms there (lab only). *Speculative:* a midrange GPU could be several times slower. The unexplained half-resolution checker artefact therefore remains a live risk for the hardware floor and needs root-causing, not just avoiding.

I agree with the proposal on: a fixed representative scene; projected-error LOD with hysteresis; separate cold and warm measurements; no performance claims from draw counts; and treating WebGPU as a separate, evidence-driven decision.

---

## Revised milestone order

### M1: Pipeline baseline (the concrete first milestone)
Deliberately no new assets.

1. Freeze the valley fixture:
   - body, seed and exact date;
   - camera poses at 1.64 m (forest edge), 30 m, 300 m, 3 km, 15 km and orbit;
   - noon, grazing sun and overcast;
   - one scripted descent route and one scripted low-flight route.
2. Add per-pass GPU timer queries for the full game (terrain, forest, flora, fauna, water, cloud capture, cloud integration, resolve) and CPU breakdown timers. Run on the development 5090 and on one floor-class machine.
3. Decide AA and depth:
   - measure MSAA capture versus post AA;
   - measure log depth versus the alternatives on a foliage-overdraw stress view.
4. Implement the shared atmosphere functions (A) and the common material model (B). Apply them to the existing primitive trees and animals.
5. Add a near sun shadow with one cascade, and measure its cost.
6. Add scale markers for evaluation only.

**Exit:** recorded numbers, before/after captures, and a written decision on AA, depth and exposure.

### M2: Forest field
- Canopy field `C`.
- Clustered, allometric population (generator version bump).
- Remove the view-dependent focus.
- Static chunk instance buffers.
- Mid-range impostors for all trees.
- Canopy baked into terrain tiles from orbit down to impostor range.

### M3: Near-ground realism
- One Blender tree family conforming to the allometry.
- GPU grass.
- Terrain meso-detail and wetness blending at the water edge.
- Rocks.

### M4: Animal
- Parametric rig bound to the genome.
- Waypoint paths.
- Closed-form footfalls.
- Profile scaling from 128 animals upward only if needed.

### M5: Breadth
- A second biome and species.
- Seasonal phenology.
- Quest profile measurement.

---

## Acceptance gates

The thresholds below are **assumptions** to be ratified, not measured results.

### Hardware floor
Assumption: an RTX 3060 / RX 6600-class GPU with a 6-core desktop CPU, at 1440p. Integrated graphics is out of scope for desktop-realism gates.

### Warm traversal (floor machine, scripted routes)
| Metric | Assumed threshold |
| --- | --- |
| GPU p95 | ≤ 14 ms |
| Main-thread CPU p95 | ≤ 9 ms |
| Frame interval p99 | ≤ 25 ms |
| Frames > 50 ms | ≤ 1 per minute |
| Buffer and texture upload p95 | ≤ 4 MB/frame |

### Cold entry
Reported separately:
- time to contact support;
- time to canopy complete within 2 km;
- worst frame.

### Per-pass budgets (speculative starting split)
| Pass | Budget |
| --- | --- |
| Terrain | 3 ms |
| Vegetation | 4 ms |
| Shadows | 2.5 ms |
| Clouds and resolve | 3.5 ms |
| Atmosphere and post | 1 ms |

### Memory
- Accounted GPU memory within the cap.
- JS heap growth under 50 MB across a 10-minute route, with no monotonic trend.

### Canopy consistency
- Rendered forest-mask cover at 300 m, 3 km and 15 km must match `C`'s expected cover over the same area within ±10% (absolute).
- In steady flight, the per-frame change in screen-space canopy coverage within a fixed ground region must stay below a stated threshold. This is the popping metric.

### Determinism
With fixed renderer, driver and assets:
- pixel-identical results at a fixed date;
- A→B→A equality;
- the same checks under forced cache eviction and alternative worker counts;
- tree identities include the generation index.

### Visual review
- Pick reference photographs before implementation.
- Run pairwise side-by-side reviews on the fixed poses.
- Record "reads as a forest" and "haze matches terrain" judgments.

Don't claim photorealism from these, only improvement against a recorded rubric.

---

## Defer

- WebGPU migration.
- TAA, and temporal cloud reconstruction, until a determinism policy (reset on seek, excluded from pixel baselines) is written.
- Full multiple-scattering atmosphere beyond LUTs.
- Voxel or fluid clouds.
- Branch-level wind physics.
- Global illumination.
- Disturbance ecology.
- More than one biome.
- Animal crowds larger than 128.
- Quest tuning.

## Claims needing verification

1. Scene fog and lights in `main.ts`, and whether vegetation receives haze today.
2. Whether log depth is enabled, and whether it writes `gl_FragDepth` in this Three fork.
3. Multisampled render targets with depth-texture resolve in Three 0.181.
4. Reversed-Z support via `EXT_clip_control` in the target browsers.
5. The 15–25% canopy cover estimate.
6. Whether terrain tile colour currently encodes forest potential.
7. Classifier availability inside `planet-worker.ts`.
8. Midrange scaling of cloud cost.
9. The `assetctl` contract, which was not provided.
10. Root cause of the half-resolution cloud checker artefact.
11. Whether `PLANET_DETAIL.touchdownM` (125) is still read anywhere, given the design doc says the 125 m trigger was replaced.