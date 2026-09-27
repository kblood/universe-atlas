# Biosphere generator lab implementation

## Current rendering direction — 2026-09-28

The [desktop realism plan](desktop-realism-implementation-plan-2026-09-27.md)
will reuse the existing dated species and lineage catalogue for plant recipes,
bounded structural variants and individual instance parameters. Binding canonical
planetary forest cells to those recipes is still planned. Lab specimen detail
does not imply that the planetary renderer already supports those assets.

Follow-up: [Creature Lab](creature-lab-implementation-spec.md) expands the
catalogue to `biosphere-lab-2`, with 12 plants and 12 animals. It adds separate
articulated anatomy, walk/run and full ancestor-chain displays. The original
Biosphere Lab still renders static community specimens and links the selected
animal to its matching Creature Lab identity. The implementation and measurements
below describe the original v1 baseline unless explicitly updated.

This increment implements the procedural-biospheres research as an inspectable
lab, not full planetary climate, ecology or calibrated evolutionary simulation.
Preserve the existing biome lab and its deterministic fixtures. Link the new
`biosphere-lab.html` from it and from the main app. Both pages stay available.

## Shared contract

Own files: data agent `src/biosphere-model.ts`; phenotype agent
`src/biosphere-geometry.ts`; viewer agent `biosphere-lab.html`,
`src/biosphere-lab.ts`, `src/biosphere-lab.css`. Root owns tests, links, build and
documentation. New exports below are the integration boundary; communicate
changes before making them.

```ts
export type PlanetProfile = 'temperate' | 'arid' | 'cold' | 'airless';
export type SpeciesKind = 'tree' | 'shrub' | 'grass' | 'animal';
export type PlantFamily = 'branching' | 'spire' | 'bush' | 'blade';
export type Family = PlantFamily | 'quadruped';
export type Traits = {
  heightM:number; widthRatio:number; branchCount:number; branchAngle:number;
  leafLength:number; leafWidth:number; leafDensity:number; curvature:number;
  legRatio:number; bodyLength:number; headRatio:number; tailLength:number;
  color:string; woodColor:string;
};
export type Species = {
  id:string; name:string; lineageId:string; parentId:string|null;
  kind:SpeciesKind; family:Family; birthMyr:number; deathMyr:number|null;
  traits:Traits; niche:{minTempK:number;maxTempK:number;minMoisture:number;
    maxMoisture:number;maxSlope:number};
  diet:'producer'|'browser'|'grazer'; dispersal:'land';
};
export type Habitat = {
  id:string; name:string; temperatureK:number; moisture:number; slope:number;
  reachable:boolean; groundColor:string;
};
export type RockFamily = {
  id:string; name:string; form:'angular'|'layered'|'rounded'; color:string;
  scaleM:number; elongation:number; layers:number; roughness:number;
};
export type HistoryEvent = {id:string;dateMyr:number;kind:string;label:string;speciesId?:string};
export type BiosphereWorld = {
  version:string;seed:string;planetId:string;name:string;profile:PlanetProfile;
  formationMyr:number;surfaceMyr:number;microbialMyr:number|null;
  species:Species[];habitats:Habitat[];rocks:RockFamily[];
  events:HistoryEvent[];digest:string;
};
export type Membership = {speciesId:string;suitability:number;occupied:boolean;reasons:string[]};
export type DatedBiosphere = {
  dateMyr:number;dateNs:string;stage:'unformed'|'forming'|'sterile'|'microbial'|'complex';
  surfaceAvailable:boolean;species:Species[];digest:string;
};
export type Placement = {
  id:string;speciesId:string|null;rockId:string|null;variant:number;
  x:number;z:number;rotation:number;scale:number;
};
export function generateBiosphere(seed:string, profile:PlanetProfile):BiosphereWorld;
export function biosphereAt(world:BiosphereWorld,dateMyr:number):DatedBiosphere;
export function habitatMembership(world:BiosphereWorld,species:Species,habitat:Habitat,dateMyr:number):Membership;
export function communityPlacements(world:BiosphereWorld,habitatId:string,dateMyr:number):Placement[];
export function specimenTraits(species:Species,variant:number,stage?:'juvenile'|'adult'):Traits;
```

`dateMyr` is a finite integer million-year offset from the existing catalogue
reference date, limited to [-20000,20000]. It is an intentionally coarse lab
control, converted exactly to `atlas-time-1` decimal nanoseconds using YEAR_NS.
It is not elapsed planet age or age since the Big Bang. All dates and life events
use half-open existence intervals [birth, death). Unknown physics must not be
presented as a scientifically predicted world history.

Generate 4 plant lineages (branching tree, spire tree, bush, blade), each a founder
plus 2 descendant species, and one quadruped lineage with 3 species. Derive actual
traits from planet+lineage identity and inherit bounded changes at branching;
individual variants must preserve recognizable species structure. Include one
extinct founder and a budding parent that remains alive. Airless world has no
biological species/events. All worlds have 3 generated geological families.
Three living profiles and different seeds must produce different morphology,
habitat descriptors and names, not only IDs or placement colours. 5 habitat
descriptors: sheltered upland, river corridor, dry slope, cold ridge, isolated
island. Names and conditions generated per world. Island is suitable for some
species but unoccupied without a land dispersal route. Suitability is a bounded
heuristic, separated from occupancy, dates and resource eligibility. Generalist
fixture should occur in 2 habitats, specialist excluded from dry/cold extremes.

Community placement uses globally keyed stable candidate slots in a fixed 64 m
square test plot, capped at 700 total representations, 4 variants per species.
Do not sample population membership from camera state. Rock IDs persist through
dates; animals are morphology specimens, not animated population simulations.
Plants absent before origin, rocks absent before surface, all surface absent
before formation. No forced decorative plants on sterile or microbial controls.

## Geometry boundary

```ts
import type {BufferGeometry} from 'three';
import type {Species,RockFamily} from './biosphere-model.ts';
export function createSpeciesGeometry(species:Species,variant:number,stage?:'juvenile'|'adult'):BufferGeometry;
export function createRockGeometry(rock:RockFamily,variant:number):BufferGeometry;
```

Return metre-sized, Y-up, grounded meshes with position, normal and vertex colour.
Renderer uses a white vertex-colour standard material; do not multiply albedo
twice. Species geometry contains real procedural branching and leaf/blade
structure, not old single-blob crowns. Quadrupeds have 4 grounded legs, torso,
head and tail with inherited proportions; label as static morphology prototypes.
Rocks vary fracture silhouette/layering/rounding within a geological family.
Bound generated triangles and branch recursion, validate finite nondegenerate
geometry. Geometry is CPU-generated code with seeds/version provenance; no
external asset downloads. Cache bounded prototypes and dispose instance buffers
on every view change; old seed's resources must be released.

## Viewer and diagnostics

New lab default is nursery, with modes nursery/community/lineage; planet seed,
profile, global date input/preset eras, habitat and selected species controls.
Nursery shows 4 distinct individual variants of selected species at fixed metre
scale plus geological specimens (or rock-only nursery for sterile worlds).
Allow juvenile/adult and neutral-colour toggle to inspect structure independently
of colour. Show selected species traits, parent, dates and habitat range table.
Lineage mode displays an actual dated branching graph/timeline with ancestor
selection and readable extinct/unborn/living status. A future species may be
inspected as a labelled archive specimen but cannot populate an earlier
community. Formation/microbial views state why no plants are present.
Community mode renders generated members, with requested counts and reasons for
absence; no claim of grass pixel coverage or validated real animal populations.
The viewer is a 64 m flat reference bed, not a terrain flight simulator.

Provide orbit/pan/zoom, ground/overhead, species focus, JSON download of complete
world/date/memberships/placements/digests/metrics, old lab and main app links.
Desktop and narrow viewport must retain controls. Expose `window.__biosphereLab`
read-only getters: `ready`, `error`, `world`, `dated`, `mode`, `selectedSpeciesId`,
`habitatId`, `placements`, `memberships`, `renderer` (calls/triangles/memory),
`accountedBytes`, `camera` and `geometryValidation` ({checked,failures}). Values
are copies. Use selector IDs biosphere-seed, planet-profile, lab-mode, date-myr,
habitat-select, species-select, regenerate, export-json, ground-view, overhead-view,
growth-stage, neutral-material. UI changes apply immediately except text seed
which uses regenerate/Enter. Show busy/error state truthfully.

## Acceptance

Pure tests cover replay, inherited traits and variation, different-world structure,
formation/origin/extinction exact boundaries, shared species IDs across compatible
habitats, island exclusion, sterile worlds, bounded placement, invalid inputs and
lossless coarse dates. Geometry tests inspect actual arrays/bounds/triangles for
all families and variants, shape differences without colours, ground placement
and repeatability. Browser tests use real controls across modes/dates/profiles,
select ancestors, export JSON, verify empty early communities, repeated seed
switch memory bounds, mobile layout, screenshots and console errors. Retain old
biome and universe tests. Visual review is separate from numeric validity.

This lab does not install species on planets, implement a climate simulator,
enable formation-gated main-app flight, animate fauna or certify photorealism.
Those remain explicit next stages in the research plan.

## Implemented model and limitations

The model generates 15 biological species for each living-profile fixture: four
plant lineages and one quadruped lineage, with a founder and two descendants
each. One founder becomes extinct; other ancestors persist after budding.
Three geological families and five habitat descriptors accompany each world.
Airless fixtures have physical habitats and rocks but no biological species.
The reference date has 14 extant species; habitat/resource/dispersal rules can
exclude many of them from a particular plot. Every planet is a fictional lab
fixture, not a generated catalogue body with calibrated climatic or life dates.

The global date is an integer Myr offset converted to the existing exact time
format. A finite event ledger records formation, surface availability, microbial
origin, lineage births and an extinction. This is direct evaluation of a small
history fixture; it does not yet implement population checkpoints, selection,
gene flow, civilizational histories or a full evolution simulation.

Plant geometry is generated from connected stems/branches and explicit leaves
or curved blades. Species and individual traits drive these structures; neutral
material inspection separates shape from colour. The quadruped family generates
static four-legged specimens with inherited proportions. It has no rigged gait,
behaviour, reproduction or collision acceptance. Geological meshes use angular,
layered and rounded forms, still simplified process-inspired specimens.

The fixed 64 m community plot is a bounded placement fixture. It does not yet
solve inter-organism spacing, canopy competition, geographic migration or a
continuous planetary biome field. It uses five generated habitat descriptors
and a deliberately unreachable island control. Resource checks count eligible
producer species and diet compatibility; they do not compute food biomass or
actual carrying capacity. Formation and life exclusion apply inside this lab;
the main universe's clock still changes orbital positions only.

The review corrected raw-hash X/Z correlation, cross-profile identity aliasing,
food eligibility that ignored lethal environmental limits, missing sterile-world
habitats, mismatched specimen traits and geometry, a foliage-density range error,
accumulating grass-segment coordinates, and instance-buffer disposal/accounting.
Those faults illustrate why a successful deterministic hash test alone cannot
validate an ecosystem or a procedural asset.

## Review workflow

1. Open `biosphere-lab.html`. In Nursery, choose each species family and compare
   the four individual variants, then switch juvenile/adult and neutral material.
   Orbit and zoom to inspect branch connections, silhouettes and leg proportions.
2. Keep the seed and change the planet profile. Compare inherited dimensions and
   generated habitat conditions; changing only colour is not sufficient evidence
   of structural variation. Export JSON to preserve the exact case.
3. In Community, compare sheltered upland, river corridor, dry slope and cold
   ridge. Read the selected species' habitat reasons. The isolated island is a
   dispersal exclusion control even when environmental conditions are suitable.
4. In Lineage, select ancestors and descendants. Change the global date to a
   species' birth and death boundaries, then return to the reference date. The
   same date/seed must reproduce the same community regardless of visit order.
5. Use Formation and Microbial, and the Airless profile, to verify intentional
   absence. A missing tree here is correct; a missing eligible tree in a complex
   community is a defect to investigate with the exported membership record.

The prototype crowns remain sparse and animal anatomy deliberately simple. The
lab makes those shortcomings reproducible and inspectable; its existence does
not mean these organisms meet the intended realistic planet art target.

## Validation record — 2026-09-14

- `npm test`: 133 tests pass, including 14 new biosphere model/geometry tests.
- `npm run build`: TypeScript and production multi-page build pass. Vite retains
  the existing large shared-chunk warning; this is not a claim of optimized
  startup delivery or Quest performance.
- `npm run test:biosphere`: real browser controls across all five organism
  families, three modes, four profile cases, formation/microbial dates, exact
  lineage boundaries, keyboard ancestor selection, JSON export, repeated seed
  changes and narrow layouts. No console or page errors in the recorded pass.
- Default community: 287 representations, 63 draw calls, 378,745 triangles and
  19,632,104 accounted buffer bytes. Seven nursery seed changes retain nine
  geometries and one texture; accounted buffers vary with generated structure.
  Accounting includes geometry and instance buffers on CPU/GPU, not total
  browser, driver, framebuffer or JavaScript memory.
- Existing `test:biomes` passes all nine fixture presets. Existing `test:browser`
  passes universe/galaxy/system/planet navigation and narrow layout, with
  66 retained geometries, two textures and no requests or console failures.

Browser evidence was collected with Chromium on NVIDIA RTX 5090 via ANGLE
Direct3D11. Screenshots and JSON reports are local review artifacts under
`test-results/biosphere-review`, `biosphere-old-biome-regression` and
`biosphere-universe-regression`. This is desktop validation, not headset or
low-end device acceptance. Visual review exposed and corrected double colour
conversion, excessive lab fog, hidden nursery specimens and clipped/non-clickable
lineage rows. Sparse crowns, simplified fauna and overlapping community
placements remain documented prototype limits.

## Research and provenance

Design follows the [biospheres plan](procedural-biospheres-next-plan-2026-09-14.md)
and its four cited Terra research reports. The current compiler uses bounded
parametric structural rules, not a claimed full implementation of space
colonization, self-organizing tree growth, genetic simulation or scientific
mechanical weathering. Source code, seeds, exact date, generation versions,
traits, event records and diagnostics are available in the lab's JSON export.
No external assets, textures, checkpoints or model providers were used.
