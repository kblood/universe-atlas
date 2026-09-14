# Planet conditions to distinctive biome assemblages

Research and integration proposal, 2026-09-14. This document specifies a future
canonical ecology layer for Universe Atlas. It does not claim that the present
terrain, river pilot, or biome lab implements global climate, life, or alien
biology. It complements [biome-lab-spec.md](biome-lab-spec.md) and
[research-species-and-simulation-2026-09-14.md](research-species-and-simulation-2026-09-14.md).

## Decision

Generate a planet's ecological assemblages from continuous, versioned condition
fields and a planet-specific species pool. Do **not** assign an Earth biome name
from temperature and rainfall, then scatter its fixed recipe list. Earth-style
labels remain useful optional UI shorthand and controlled lab fixtures, but the
canonical record should say why an organism can occur at a place: its tolerances,
resources, substrate, access to that place, and interactions with other members.

This follows a grounded distinction. Temperature and precipitation organize broad
vegetation patterns, but they collapse meaningful conditions such as seasonality,
water balance, substrate, disturbance, and history. The familiar Whittaker plot
is deliberately a two-variable simplification; recent work documents that it
uses annual mean temperature and precipitation to group major biomes
([Navarro et al., 2025](https://www.nature.com/articles/s41597-025-04387-0)).
It is a good regression diagnostic, not a generative ontology for another
planet. Hydrological observations also show that local slope, aspect and soil
moisture alter vegetation water balance ([Ivanov et al., 2008](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2006WR005595)).

For an Earth-like-fiction profile, liquid surface water, atmosphere, climate and
geology are useful prior conditions, not proof of a biosphere. NASA defines a
star's habitable zone only in terms of the possibility of surface liquid water
([NASA, *Habitable Zone*](https://science.nasa.gov/exoplanets/habitable-zone/));
it does not imply life, forests, oxygen, or an Earth-like ecology. Planetary
water distribution and rotation can change climate regimes in an Earth-like
planet model ([Kodama et al., 2018](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1002/2017je005383)).
These support using physical forcing as a prior and explicitly keeping biological
outcomes fictional.

## A causal, continuous planetary model

Use three layers, each with a separate version and digest. A renderer may sample
and cache them, but may not redefine them.

```text
planet/star/orbit/geology priors
  -> climate forcing fields -> surface water, sediment and disturbance fields
  -> habitat suitability + reachable species pools -> assemblage/population slots
  -> streamed instances, meshes, decals, audio and nearby agents
```

### 1. Planet and climate priors

Introduce a versioned `PlanetEnvironment` adapter, rather than extending the
catalogue `Body` until it falsely looks measured. Today `Body` supplies such
physical facts/proxies as `massKg`, `radiusM`, `temperatureK`, `water` and
`type`; it has no atmospheric, seasonal-climate or biosphere descriptor, and
`temperatureK` is not a regional climate solution. The adapter must preserve
the source of every field as `catalogue`, `derived-heuristic`, `authored-scenario`
or `unknown`, with an assumption flag and a digest.

`PlanetEnvironment` can hold body identity/seed plus stellar spectrum and mean
flux, orbital eccentricity, obliquity, rotation/tidal state, atmospheric
pressure/composition proxy, volatile inventory, ocean fraction/salinity proxy
and tectonic/volcanic activity. Values absent from the catalogue are authorial
scenario parameters, not observations inferred from a generated body name.
Keep this physical/environment record separate from `BiosphereState` (none,
emergent, established, extinct) and from versioned historical events. Thus a
physical "Ice world" does not silently mean either sterile or inhabited, and a
past extinction cannot rewrite its rock type.

Derive a periodic climate atlas on the existing spherical grid. Store monthly or
at least eight seasonal samples for `temperatureK`, precipitation input,
potential evapotranspiration, wind/exposure, radiation, snow/ice fraction and
aridity. A low-cost first model can use latitude, elevation lapse rate, seasonal
insolation, ocean-distance moisture decay and deterministic prevailing-wind
bands. It must advertise `climateModel: heuristic-v1`; it is not a general
circulation model. This is preferable to hiding invented climate behind the
current `surface-biomes-1` `moisture` noise.

Promote to a calibrated lookup/table model only after fixtures establish useful
variation. NASA GISS simulations of Proxima b vary greenhouse gases, ocean depth,
salinity, land-water ratio, spin and orbit, illustrating why no single "distance
from star" number can define regional habitability
([Cohen/NASA GISS, 2020](https://www.giss.nasa.gov/research/features/202002_proxima/)).
The browser must never attempt such a GCM at run time.

### 2. Geology and hydrology as habitat inputs

Retain `terrain-1.2.0` as the authoritative rock field and `surfaceQuery` as the
owner of independent rock, water and visible heights. The planned atlas should
consume, never mutate, `groundHeightM`, slope/normal/aspect, ocean/wet state,
water depth, `waterKind`, `bank`, `channelId`, flow and hydrology-region
versions. The existing drainage code's cube-sphere grid, area weights and
Priority-Flood routing already provide the right seam-safe ownership pattern;
its filled field is analytical conditioning and must not overwrite rock.

Add derived, immutable fields: watershed/catchment ID, contributing area,
distance to permanent/seasonal water, inundation duration, erosion/deposition
class, soil/sediment parent material, depth proxy, texture/drainage proxy,
salinity, nutrient/productivity proxy, rock exposure and a versioned disturbance
history (fire, flood, lava, impact, ice advance). Soil-water state should be a
bounded seasonal reservoir, not fresh random wetness per tile:

`S[t+1] = clamp(S[t] + precipitation + upslopeRunon - ET - runoff - drainage, 0, capacity)`.

This deliberately modest balance makes riparian corridors, rain shadows,
windward slopes and dry uplands arise from shared inputs. It is not a hydrologic
forecast. Measurements in semiarid terrain find evapotranspiration strongly
linked to water and energy conditions, and terrain niche effects tied to slope
and aspect ([Ivanov et al., 2008](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2006WR005595)).

### 3. Assemblages, not named presets

Define an `EcosystemProfile` per life-bearing planet and derive a small,
planet-unique `SpeciesRecord` pool from its stable seed. A record has a clade and
life-form family, tolerance functions, resource requirements, dispersal mode and
range, substrate and disturbance affinity, growth/age classes, competitors and
facilitation links, phenotypic recipe, and provenance/version. Reuse the species
and population identity rules proposed in the companion species research:
`hash(universeSeed, originBodyId, "species", cladeId, speciesOrdinal,
identityVersion)` and stable cell/slot IDs, never an RNG stream or worker order.
`speciesOrdinal` is a canonical, sorted pool index; the key excludes date so a
species remains itself through time. This avoids collapsing every member of a
clade, or species on different origin worlds, to one identity.

At each cell calculate continuous suitability rather than choose a label:

`H_s(x,t) = W_T f_T + W_water f_water + W_soil f_soil + W_light f_light + W_relief f_relief + W_disturb f_disturb`.

Each `f` is a documented 0–1 response curve, commonly trapezoidal or Gaussian;
weights must be non-negative and normalised to sum to one. A separate hard-lethal
gate rejects any candidate outside a declared lethal temperature, solvent,
pressure, salinity or inundation limit before the weighted score is considered.
`H_s` is a fiction-facing engineering score, not a measured fitness. A candidate
may establish only if it is in the planet's pool, passes hard gates, has
`H_s >= 0.55`, reaches the cell, and passes resource/spacing rules. Make `0.55`
a proposed fixture threshold, not a universal ecological constant.

This expresses environmental filtering without pretending it is the sole
mechanism. Field work finds both filtering and dispersal limitation affect
occurrence ([Sydenham et al., 2017](https://esajournals.onlinelibrary.wiley.com/doi/10.1002/ecs2.1650)); experiments and synthesis likewise treat arrival as a
probability distribution, with fewer propagules generally reaching more distant
sites ([Allbee et al., 2023](https://esajournals.onlinelibrary.wiley.com/doi/10.1002/ecy.3859)).

Build each cell's candidate set as
`regionalPool ∩ tolerable(H) ∩ reachable(network, distance, barriers, time)`.
Networks use watershed and coast adjacency for aquatic/riparian life, wind bands
for spores, and terrain cost/sea crossings for walkers; barriers include deep
ocean, ice, active lava, cliffs and hostile chemistry. A species can therefore
appear in several suitable biomes, while a similar suitable valley remains
different because it is isolated or newly disturbed. This prevents the visual
failure where every "wetland" contains the same endemic reeds and tree.

Resolve candidates in trophic/life-form order: substrate modifiers and producers,
then consumers/decomposers only where their required resources exist. Do not
simulate every birth. At coarse history intervals, update occupancy probability,
cover/density class, cohort mix and a compact event log. Apply deterministic
priority hashing for competition and an explicit carrying-capacity budget per
resource layer. Species sharing a niche should coexist only where their overlap
rule permits it; otherwise the stable winner is a deterministic result of
resource share, arrival/history key and species ID. This remains an assembly
heuristic, not a claim that competition can be reduced to one score.

## Ecotones and planet archetypes

An ecotone is a gradient in fields and composition, not a 20 m blend strip
between two labels. Query the same habitat and dispersal fields at every point;
species' differently shaped response curves naturally produce overlap, turnover,
or a narrow transition. Render coverage/density with continuous weights and
correlated, globally addressed noise only after population ownership is fixed.
The biome lab's global X=0 smooth blend is a sound determinism test, but it is
not the planet algorithm. Its current recipes and `densityPerHa` must remain
authored laboratory compositions rather than be reinterpreted as species census
data.

Start every planet with one declared archetype prior, then permit conditions to
override its visual family:

| Archetype | Required conditions / default result | Biological policy |
|---|---|---|
| Airless/regolith | no meaningful atmosphere or stable solvent; mineral, impact and slope fields | sterile; rocks only |
| Ice shell / cryogenic | persistent surface ice, possible subsurface water | surface sterile by default; subsurface life never rendered as terrestrial flora |
| Volcanic/recovering | high disturbance, immature substrate | sterile to sparse pioneer policy; no mature forest shortcut |
| Dry continental | land-dominated water cycle, large water-distance and seasonality | discontinuous productivity corridors, salt/playa and wind dispersal emphasis |
| Temperate ocean-land | stable liquid surface water and moderate seasonal forcing | optional Earth-like-inspired multicellular policy |
| Exotic solvent / alien | declared solvent, chemistry and energy policy | separate fictional clade rules; no borrowed Earth thresholds |

Sterility is a first-class successful outcome. `biospherePolicy: none` must
produce no plants, fauna, soil-organism props or fauna promises, while retaining
geological assemblages. It should not be inferred merely because a region is
cold: NASA notes that icy bodies can host internally heated subsurface oceans
([NASA, 2023](https://www.nasa.gov/science-research/planetary-science/astrobiology/nasa-some-icy-exoplanets-may-have-habitable-oceans-and-geysers/)).
Such a setting warrants an explicit scenario, not visible surface vegetation.

## Contract and integration plan

Add pure, camera-independent modules before changing `biome-ecology.ts`:

```ts
planetEnvironmentAt({ bodyId, cosmicTime, environmentVersion }): PlanetEnvironment
conditionsAt({ bodyId, direction, cosmicTime, conditionVersion }): PlanetConditions
habitatAt({ bodyId, direction, cosmicTime, habitatVersion }): HabitatVector
assemblageAt({ bodyId, surfaceCellId, cosmicTime, ecosystemVersion, branchId }): Assemblage
speciesPoolAt({ bodyId, ecosystemVersion }): readonly SpeciesRecord[]
```

`PlanetConditions` includes physical inputs and confidence/provenance;
`HabitatVector` exposes normalised continuous fields and source versions;
`Assemblage` contains canonical occupancy/density/cohort slots, rejection
reasons, candidate-pool digest and no Three.js values. Renderer queries need a
separate `representationAt` that maps stable slots to LOD instances. Each result
carries universe seed, body/surface address, exact `atlas-time-1` BigInt date,
`baseline` branch, terrain/drainage/river versions, and climate/habitat/ecosystem
versions. Worker completion, camera route, patch extent and LOD must not affect
canonical results.

Integrate incrementally:

1. Freeze today's biome-lab fixtures and `surface-biomes-1` output as legacy
   render/material fixtures. Add no climate inference to existing saves.
2. Implement `conditionsAt` with a sterile airless fixture and a temperate
   heuristic fixture; compare only diagnostics, do not replace terrain colours.
3. Add habitat vectors from real terrain/drainage inputs and prove cube-edge,
   pole and hydrology-region continuity.
4. Generate plant/rock population slots for one landable planet; map current
   lab recipes as temporary phenotype families where suitable.
5. Stream representation with existing global addressing, competition halo and
   resource caps. Animals follow only after the companion phenotype/rig contract.

## Quantitative validation proposal

Use fixed seed/version fixtures, retain golden digests through migrations, and
require an explicit migration fixture when any canonical result changes. Proposed
thresholds are engineering acceptance gates:

| Check | Proposed acceptance |
|---|---|
| Repeatability and request order | byte-identical canonical assemblage digest for 100 repeated/reordered queries |
| Tile/LOD agreement | 100% identical owned slot IDs and values in overlaps; no camera/worker-order dependency |
| Spherical continuity | habitat values differ by at most `1e-6` at cube seams/poles for the same direction; watershed IDs follow the one-owner grid |
| Ecotone continuity | in an authored smooth-gradient fixture, adjacent 1 km samples change every continuous habitat component by no more than 0.15 unless a tagged cliff, shore or disturbance boundary occurs; no label-only hard edge |
| Exclusions | 0 living slots on `biospherePolicy:none`, airless and active-lava sterile fixtures; 0 terrestrial plants below persistent water depth or above species lethal limits |
| Assemblage diversity | each declared complex-life fixture has at least 3 producer forms; no species occurs outside all of its declared tolerance limits; at least one species spans two distinct habitat clusters. Microbial-only fixtures have their own declared checks. |
| Geography effect | paired cells with equal habitat but a declared barrier have different reachable-pool digests; removing the barrier restores the prescribed digest |
| Bounded work | a 256 m representation patch has a fixed candidate cap and completes without unbounded allocation; profile a 10 km regional query separately |
| Historical addressing | seek A→B→A reproduces A digest exactly; checkpoint replay equals direct bounded event replay |

These thresholds validate determinism and declared rules, not ecological realism.
Visual review still needs a forest-to-river-to-slope route, sterile-world route,
and at least one long ecotone traversal. Quest/WebXR performance, memory and
headset acceptance remain separate from an assemblage's correctness.

## Sources, access and limitations

Source landing pages, abstracts and the cited available full-text sections were
checked 2026-09-14; this is not a claim to have exhaustively reviewed every
paper. The planetary and ecological papers support relationships and modelling
cautions; they neither validate generated alien life nor establish the numerical
gates above.

1. Navarro, A., Merino, A., García-Ortega, E., et al. (2025-01-08), [*Uncertainty maps for model-based global climate classification systems*](https://www.nature.com/articles/s41597-025-04387-0). Accessed 2026-09-14. Useful for limits of discrete climate classifications; it is not a planetary ecology model.
2. Kodama, T., Nitta, A., Genda, H., et al. (2018-01-29), [*Dependence of the onset of runaway greenhouse effect on latitudinal surface water distribution*](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1002/2017je005383). Accessed 2026-09-14. Earth-like GCM assumptions; direct simulation cases use zero obliquity, so it does not predict arbitrary exoplanets.
3. Ivanov, V. Y., Bras, R. L., and Vivoni, E. R. (2008-03-29), [*Vegetation-hydrology dynamics in complex terrain*](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2006WR005595). Accessed 2026-09-14. Semiarid Earth model/sites; supports terrain/water inputs, not universal constants.
4. Sydenham, M. A. K., Moe, S. R., Kuhlmann, M., et al. (2017-01-11), [*Disentangling dispersal limitation, ecological drift, and ecological filtering*](https://esajournals.onlinelibrary.wiley.com/doi/10.1002/ecs2.1650). Accessed 2026-09-14. Bee communities, so it motivates mechanism separation rather than parameter transfer.
5. Allbee, S. A., Rogers, H. S., and Sullivan, L. L. (2022-09-01), [*The effects of dispersal, herbivory, and competition on plant community assembly*](https://esajournals.onlinelibrary.wiley.com/doi/10.1002/ecy.3859). Accessed 2026-09-14. Earth tallgrass-restoration experiment; supports probabilistic/effective dispersal and interaction ordering.
6. NASA (n.d.), [*The Habitable Zone*](https://science.nasa.gov/exoplanets/habitable-zone/), accessed 2026-09-14; and Cohen, J./NASA GISS (2020-02-21), [*Simulations Explore Habitability of Nearest Exoplanet*](https://www.giss.nasa.gov/research/features/202002_proxima/), accessed 2026-09-14. Official synthesis/reporting, not evidence that a generated world is inhabited.
7. Steigerwald, W./NASA (2023-12-13), [*Some Icy Exoplanets May Have Habitable Oceans and Geysers*](https://www.nasa.gov/science-research/planetary-science/astrobiology/nasa-some-icy-exoplanets-may-have-habitable-oceans-and-geysers/). Accessed 2026-09-14. Reports model-based habitability discussion; it does not establish observable life.
