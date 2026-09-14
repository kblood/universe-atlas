# Biome system and first lab

Implementation specification, 2026-09-14. Follows
[planet validation labs](planet-validation-labs-2026-09-14.md).

Follow-up: [procedural biospheres and generator labs](procedural-biospheres-next-plan-2026-09-14.md)
specifies the next generation of this lab: procedural species morphology,
planet-specific species pools and habitat ranges shared across biomes. The
fixed recipes documented below remain the implemented baseline.

The companion [Biosphere Lab](../biosphere-lab.html) adds procedural morphology,
generated species pools, habitat membership and a dated lineage inspector.
See its [implementation contract and validation](biosphere-lab-implementation-spec.md).

## Scope and acceptance

Create a reusable deterministic biome/palette/placement module and an actual
Three.js biome lab at `biome-lab.html`. The first lab compares ecological
assemblages on controlled 128 m square terrain, including an ecotone between
two biomes. It is a generator/representation test bench, not evidence that
planet-wide vegetation has already been integrated or that the sample meshes
are production-quality photorealistic assets. Animals are declared future
habitat members and explicitly labelled as unimplemented; do not draw fake
animals or count them as visible content.

The existing universe remains the runtime authority. The new pure module is
camera-independent and usable by future planetary cells. A separate planet
integration must supply real climate/substrate/slope/wetness fields and spherical
cell ownership before the lab becomes a planetary ecosystem implementation.

## Shared TypeScript contract

`src/biome-ecology.ts` exports:

```ts
type BiomeId = 'woodland' | 'conifer' | 'grassland' | 'dry-scrub' |
  'wetland' | 'coast' | 'alpine' | 'volcanic' | 'regolith';
type ElementKind = 'tree' | 'shrub' | 'grass' | 'rock';
type ElementRecipe = {
  id: string; name: string; kind: ElementKind; form: string;
  color: string; minSizeM: number; maxSizeM: number;
};
type BiomeDefinition = {
  id: BiomeId; name: string; description: string; groundColor: string;
  elements: {recipeId: string; densityPerHa: number}[];
  fauna: {name: string; role: string; status: 'planned'}[];
};
type BiomePatchConfig = {
  seed: string; biome: BiomeId; blendBiome?: BiomeId;
  sizeM?: number; originX?: number; originZ?: number;
};
type BiomePlacement = {
  id: string; recipeId: string; kind: ElementKind;
  x: number; z: number; sizeM: number; rotation: number; color: string;
};
type BiomePatch = {
  version: string; config: BiomePatchConfig; placements: BiomePlacement[];
  counts: Record<ElementKind,number>; recipeCounts: Record<string,number>;
  areaHa: number; canopyCoverEstimate: number; groundCoverEstimate: number;
  rejected: {competition:number}; digest: string;
};
const BIOME_DEFINITIONS: readonly BiomeDefinition[];
const ELEMENT_RECIPES: readonly ElementRecipe[];
function generateBiomePatch(config: BiomePatchConfig): BiomePatch;
function biomeBlendAt(config: BiomePatchConfig,x:number,z:number): number;
function recipeFootprintM(recipe: ElementRecipe,sizeM:number): number;
```

Coordinates are absolute X/Z metres in the lab's canonical flat domain. Default
size 128 m; accepted sizes 32–256 m, finite origins and bounded seed length.
Reject malformed inputs. Biome blend uses a stable global boundary at X=0,
with a smooth noisy transition, never the current camera or patch edge. A
single-biome patch has weight zero for the optional second biome.

Use globally addressed candidates with separate recipe/hash channels. Resolve
competition with deterministic priorities and sufficient neighbour halo; a
patch requested separately must agree with the overlap of a larger request.
Constrain candidate counts and work before allocation. Stable IDs belong to
canonical positions/recipe domains, not the requested patch extent or render
order. Include the generator version in digests and exports. These constraints
are more important than fine art quality in the first lab.

Recipes should include distinct broadleaf/conifer trees, bushes/reeds, grasses
and at least angular/slab/rounded rock forms. Density values are controllable
engineering fixtures, not claims about Earth ecological measurements. Coverage
estimates use an explicit deterministic sample grid with documented projected
footprint rules; they are not GPU-visible coverage or ecological truth. Report
actual counts and overlap-aware estimated coverage rather than adding crown
areas blindly. Do not count tree branches as separate organisms.

`densityPerHa` is a candidate intensity before competition, not a guaranteed
accepted population density. Crown cover and understory ground cover are
separate estimates: a tree crown must not count as grass under that tree.
Preserve plausible layer coexistence rather than letting every grass tuft
exclude a tree crown. The sterile control presets have no planned wild fauna.
Grass placement records represent patches of blades, not individual organisms.
`recipeFootprintM` shares the projected envelope with the renderer. The initial
grassland fixture requires at least 20% sampled patch-envelope coverage; this
is an authored composition target, not measured foliage/pixel coverage or a
claim that the resulting scene is lush. Visible-density evaluation remains a
separate visual acceptance step and future diagnostic-mask measurement.

## Lab view

`biome-lab.html` loads `src/biome-lab.ts` and `src/biome-lab.css`. It provides:

- Seed, primary biome, optional second biome and regenerate controls.
- Orbit/rotate, pan and zoom through Three OrbitControls; ground inspection
  and overhead preset buttons; clear scale and navigation hints.
- Instanced representations of recipes with distinct forms and size ranges.
- Actual organism/rock counts by recipe, estimated canopy/ground coverage,
  bytes/draws and a stable digest; list fauna separately as planned.
- Export the complete configuration, version, digest and metrics to JSON.
- A link back to Universe Atlas and a visible statement that this is controlled
  lab terrain and not a completed planetary environment.

Keep cameras, renderer and geometry resident between regeneration where safe;
dispose replaced geometries/materials explicitly. Cap geometry/instances and
account typed-array buffers. Avoid per-frame generation, transparent blended
crowns and unbounded shadows. The controlled bed can be flat to isolate biome
composition; include metre scale cues and biome ground-colour transition.

For automation expose read-only `window.__biomeLab` diagnostics with ready,
config, counts, recipeCounts, digest, coverage, renderer calls/triangles and
accounted bytes. Do not expose a second mutable generator implementation.

## Verification

Pure tests: same configuration repeatability; different seeds change output;
finite bounds; stable IDs; overlap/request-order independence; valid recipe
references; woodland/conifer/grassland differ; regolith/volcanic no living
elements; fauna explicitly planned; smooth blend values and both sides
represented; invalid/oversized requests rejected; coverage bounded 0–1.

Browser tests: load all biome presets, change seed and blend, regenerate,
inspect at ground/overhead views, verify counts/digests update, perform real
OrbitControls interaction, export JSON and inspect screenshots for coverage
and distinct silhouettes. No runtime exceptions, bounded draw/resource use,
repeat regeneration without resource growth. Include desktop and narrow layout.
Passing these tests establishes a functioning lab, not a natural-looking planet.

Publish the lab alongside the app, with a discoverable entry from its controls.
Document measured results and remaining work in this file. Keep source
references in the linked research documents and disclose recipe approximations.

## Review findings during construction

The initial implementation draft exposed deficiencies that passing basic
repeatability/count tests would miss. Grass density could be numerically nonzero
but visually negligible. Piecewise random blend offsets could jump at grid
boundaries. Greedy competition against previously accepted candidates could
propagate dependencies beyond a fixed halo. Those are acceptance failures,
not intended biome properties. Coverage, blend continuity and overlapping
requests therefore receive dedicated checks before release.

The viewer must also share the blend field, use actual metre dimensions, put
its patch on the displayed bed and dispose instance buffers on regeneration.
Its simple specimen meshes demonstrate assemblage differences; their botanical
and geological realism remains a separate nursery/art review task.

## Implemented first lab and validation

The lab is implemented at `biome-lab.html` with nine biome presets, 19 element
recipes, repeatable seeds, optional two-biome transitions, ground/overhead views,
OrbitControls and JSON exports. Universe Atlas has a Biome lab link beside its
view controls. No ecosystem is installed on a planet by opening this lab.

The final unit suite passes 119 tests, including eight new ecology cases.
Those exercise repeatability, multiple overlapping patch requests, finite
coordinate bounds, explicit recipe membership, smooth blend boundaries,
sterile controls and independent shrub/grass footprint sampling. The browser
lab test visits every preset, regenerates seeds/blends, changes camera pose
through actual controls, exports and checks JSON, repeats regeneration and
checks a narrow viewport. All 19 recipe geometries are checked for finite
positions/normals, valid triangles and nondegenerate faces. Type checking and
the production build pass. The pre-existing large Rapier chunk advisory remains.

The normal universe browser regression also passes galaxy, system and planet
navigation plus its mobile layout. The lab runs on the desktop browser; no new
physical-headset acceptance or native performance benchmark is claimed.

Representative `LETHRA-BIOME-01`, 128 m square results:

| Preset | Trees | Grass patches | Rocks | Estimated canopy footprint | Estimated ground patch footprint |
|---|---:|---:|---:|---:|---:|
| Woodland | 95 | 239 | 26 | 9.2% | 17.4% |
| Conifer forest | 109 | 102 | 26 | 14.7% | 7.3% |
| Grassland | 0 | 405 | 37 | 0% | 27.6% |
| Wetland | 42 | 550 | 13 | 2.4% | 67.0% |
| Volcanic | 0 | 0 | 376 | 0% | 0% |
| Regolith | 0 | 0 | 245 | 0% | 0% |

These numbers describe the authored fixtures, not real-world census data.
Shrubs are counted separately in the UI/export. A grass record is one patch
of blades, not one organism. Footprints are unions of sampled projected
envelopes and can be much larger than actual visible leaf/blade coverage.

The all-preset browser run uses 4–7 draws for individual presets and 10 for
the woodland/scrub transition. After warming all recipes it retains 21 Three.js
geometries and two textures; the transition accounts 632,750 bytes of geometry,
instance and ground-texture buffers. This estimate includes CPU/GPU copies and
the mipmapped ground map, not all JavaScript/driver/framebuffer memory. Repeated
regeneration does not increase those measured resource counts. Captures and
reports are preserved under ignored `test-results/biome-lab-accepted`.

Visual review rejected an earlier malformed grass primitive and a broadleaf
trunk/crown gap; both were corrected before release. The accepted compositions
still use simple specimen meshes, sparse visible blades and flat reference
ground. They are suitable for examining recipe membership, placement and
transitions, not for certifying realistic forests. The next stages are visible
coverage masks and density controls, improved specimen families, planetary
habitat queries and continuous flight through those generated habitats.

Run `npm test`, `npm run build`, then serve the build and run
`npm run test:biomes`. Set `ATLAS_HARDWARE=1` to request hardware rendering;
`ATLAS_URL` may specify the complete biome-lab URL and `ATLAS_RESULTS` the
artifact directory. Serialize browser/GPU runs and keep builds outside them.
