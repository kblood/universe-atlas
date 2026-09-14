# Planet generation and validation labs

Research and proposed implementation specification, 2026-09-14.
Code audited at `12645f6`. This document proposes new labs; it does not claim
that they are implemented or that the reported Cerintar defect is fixed.

## Decision

Build a small collection of repeatable generator and traversal labs before
another broad realism pass. Keep the working universe, galaxy and star-system
architecture. Separate planetary content generation from camera-dependent
streaming, and make both observable. A fixed river-bank screenshot is useful
but cannot certify a visitable, detailed planet.

Three Terra research tasks accompany this specification:

- [Terrain, rivers and water validation](research-terrain-river-validation-2026-09-14.md).
- [Vegetation, rocks and ecosystem placement](research-vegetation-rocks-2026-09-14.md).
- [Species, creatures and simulation](research-species-and-simulation-2026-09-14.md).

These documents distinguish source-supported techniques from our proposed
engineering choices. No external asset generation, model downloads or new
runtime dependencies are part of this research pass.

## What the previous tests missed

The last release ran fixed river-bank/lake navigation, walking, cold restore,
shore stability, terrain streaming, orbital/atmospheric navigation and stereo
VR emulation. It did not validate the ecological content encountered during a
multi-biome free-flight journey. `tests/exploration.mjs` contains a short terrain
traversal at 600 m clearance and verifies motion and cache bounds. That is a
control/streaming test, not evidence of forest coverage or natural rivers.

The source audit finds concrete reasons for the user's experience:

| Evidence in current code | Consequence |
|---|---|
| `src/planet-renderer.ts` constructs `RiverEnvironment` only with `body.hydrology` | Ordinary planet visits do not activate a general ecosystem generator. |
| `src/river-environment.ts` requires `bank > .005` for trees, plus water, temperature/type and slope conditions | Suitable ground away from the river bank can have stones but no trees. |
| The environment hides above 1,500 m clearance and uses a local tangent projection gate | No distant forest representation connects ground trees to the view from higher flight. |
| Stones use one deformed dodecahedron and one material, with instance size/rotation changes | Numerical variation does not provide distinct geological forms or colours. |
| Tree, grass and plant instance counts are capped | Counts must be interpreted alongside requested density, streaming backlog and visible coverage. |
| `surface-biomes.ts` computes `forestPotential`, but the tree placement gate uses bank proximity | Material classification and vegetation placement are not one coherent habitat model. |

Grass has separate habitat tests and is not itself restricted by the tree's
bank threshold. The environment's projection gate is not a precise river-region
polygon boundary. Those details matter when designing a replacement.

The supplied Cerintar screenshot shows very coarse-looking terrain, a smooth
oval blue feature and long thin lines. A screenshot alone cannot distinguish
river geometry from orbit guides, depth/LOD faults or an incomplete render.
Capture its URL, body address, coordinates, heading, altitude and build before
assigning a cause. The exact location is an unresolved regression fixture until
that state is recovered. Do not silently substitute the successful Maithea bank.

## One shared contract, several labs

Use three separately versioned stages:

1. **World description:** seed/address/date → climate, geology, hydrology,
   habitat and species definitions. It must not depend on whether someone has
   clicked “Find rivers” or approached from the east.
2. **Canonical content:** world description plus spatial cell → stable feature
   and individual IDs, morphology parameters, position and orientation. Border
   ownership and neighbour influence are explicit; creation order is irrelevant.
3. **Representation:** content plus camera/device → meshes, textures, LODs,
   visible subset and bounded resident resources. Lower quality changes the
   representation, not the planet's identity.

Retain the existing shared ground/water query contract. Give future hydrology,
habitat and species data their own versions rather than embedding all identity
in a renderer version. For temporal evolution, separate stable lineage and
individual IDs from dated states and cosmetic animation.

| Lab | What it does | Evidence it must produce |
|---|---|---|
| Generator census | Samples many seeds, climates, slopes and elevations without rendering | Habitat coverage maps, rejection reasons, feature distributions and deterministic hashes |
| Asset nursery | Shows seeded trees, grass, plants and rock families independently at known scale | Turntables, silhouettes, material views, size distributions, topology/LOD/resource reports |
| Terrain and river flume | Tests controlled valleys plus real generated catchments | Plan views, cross-sections, curvature/width/depth profiles, wetness and continuity errors |
| Flight survey | Pilots the actual app continuously through representative and adversarial routes | Video, physical trajectory, content backlog, visible coverage, clipping and performance timelines |
| Creature habitat | Exercises a small number of constrained body plans in test environments | Rig/locomotion/contact checks, behavior traces, bounded population and replay reports |
| Universe regression | Visits galaxy/star/body views, flies, warps, lands, returns and seeks time | Stable addresses, scale transitions, release of resources and compatibility results |

The nursery is a development screen with a metre grid, neutral lighting and
orthographic/perspective views, not a separate production world generator.
Every displayed specimen comes from the same functions used in the actual app.

## Measure density at three stages

For each habitat cell report eligible area, attempted candidates, accepted
individuals and rejection categories. Separately report requested, resident,
budget-omitted, distance-culled and visibly contributing content. Count a tree
once by organism ID; branches and crown instances are not additional trees.

Measure trees per hectare and projected canopy coverage, ground-cover fraction,
gap-size and nearest-neighbour distributions, height/diameter distributions,
and family-level shape/material diversity. Evaluate ground cover in physical
quadrats or top-down masks as well as eye-height views. Exclude sky/UI from
screen denominators; report occlusion and distance bands. A visual mask pass is
instrumentation and must be excluded from native performance measurements.

Define expectations per habitat. A lush woodland fixture should fail for an
unexplained empty canopy or bare ground; a desert or airless moon should pass
with zero trees. A universal “at least N trees” check would encourage the wrong
worlds. More random colours, maximum entropy or maximum object count is not a
realism objective. Geological families should constrain rock forms and pigments;
species should constrain branching, leaves and growth-stage proportions.

Initially publish measured distributions and contact sheets. Calibrate density
bands against documented reference environments and intended visual scale,
then version them as acceptance profiles. Do not invent biological constants
or lower expectations to make the existing sparse output pass.

## Continuous flight survey specification

Use the existing Three.js app and Playwright. A route is an ordered sequence of
physical surface directions, clearance/speed bands and look targets. A bounded
pilot steers through the normal flight/controller integration; direct position
assignment is allowed only for fixture setup, never between measured waypoints.
The route runner must record controller inputs, actual positions and missed
waypoints. Tests that teleport to each destination cannot pass as free flight.

Two modes are required. A deterministic stepped mode compares generation and
replays input sequences. A wall-clock native-browser mode measures streaming
and frame time under real frame scheduling. Neither substitutes for the other.

Start with routes that traverse coast → lowland → river → woodland candidate →
upland → coast. Add a barren moon control. Exercise both directions, cold and
warm caches, orbit-to-surface descent, tree-visibility altitude boundaries,
river confluences, lake margins, cube-face seams, poles and floating-origin
rebases. Use ordinary visits without a preinstalled river model as a required
case: finding that the ecology system never starts is itself a failure.

At waypoint stations capture 1.7 m, 20 m, 200 m and 2 km views where physically
safe. These are proposed inspection scales, not runtime requirements. During
travel record continuously; do not hide empty terrain by waiting for readiness
before every capture. Report first useful detail, time-to-contact readiness,
empty-view duration, backlog growth and recovery after stopping.

Keep a small fixed regression corpus plus a seeded, stratified rotating sample.
Sample solid-world types and habitat classes, not just convenient destinations
returned by the generator. Record discovery failures and absent classes. Use
approximately equal-area spherical sampling; uniformly sampling latitude would
overweight the poles. Audit holdout seeds after tuning to the fixed corpus.

## River flume specification

Use a flat test bed, sloping valley, confined steep reach, broad floodplain,
tributary join, lake inlet/outlet and coastal mouth. Pair those controlled
fixtures with actual generated catchments. Examine channel path and valley
shape before water shading. Curved paint on a planar slope is not a river bed.

Measure connectivity, self-intersections, curvature, width, centerline length
relative to valley/end-point distance, longitudinal water level and bed
cross-sections. Condition expectations on channel type: natural rivers can be
straight, meandering or braided. Applying a mandatory sine wave or universal
sinuosity threshold would be another artifact.

Compare canonical wetness with independently intersected rendered triangles
at sampled cross-sections and LOD transitions. Include held-out directions,
not only the vertices used to construct the mesh. Capture object-ID masks to
tell water from orbit lines, terrain skirts and other geometry. Validate that
opaque terrain does not conceal the intended channel at the tested view and
that correcting coverage has not removed dry banks.

Review depth absorption, reflections, flow direction, highlights and local
foam in fixed lighting and in motion. Frozen screenshots detect stationary
instability; moving clips reveal shimmer and transition faults. A pixel-stable
blue strip can be technically stable and visually unacceptable.

## Test oracles and reproducible failure records

Use complementary checks rather than one “realism score”:

- Exact CPU identity tests for canonical IDs and versioned deterministic data.
- Tolerance-based numerical checks for geometry and independently computed
  surface intersections; do not require cross-device GPU pixel equality.
- Metamorphic checks: reverse route, evict/reload, alter request order, rebase
  origin and reduce visual quality. Content identity and physical geography
  should survive; visible detail can change according to the LOD contract.
- Distribution/coverage checks across a corpus, with per-habitat results.
- Controlled visual comparison plus explicit human review of randomly selected,
  worst-scoring and representative cases. Never auto-accept new baselines.

Each failure bundle should contain build/hash, generator versions, universe
seed, body/region/cell IDs, universal date, physical camera/heading, input log,
device/driver/browser, quality settings, resource limits, metric timeline,
screenshots/video and a replay manifest. Store a short failure description and
the independent assertion that detected it. Shrink a failing journey to its
shortest useful route without discarding the cold-cache or boundary condition.

Proposed artifacts are `manifest.json`, `trajectory.jsonl`, `metrics.json`,
`review.html` and captures under an ignored review directory. Keep compact
fixture definitions and approved expectations in Git. These filenames and lab
commands are specifications; no new executable lab commands exist yet.

## Implementation order and acceptance

1. **Instrument and expose current failure.** Add placement rejection reasons,
   per-stage counts and a two-route survey with one fertile and one barren
   fixture. Expect the uninitialized ecosystem and bank-only forest cases to
   be reported as failures, not filtered out as unsupported visits.
2. **Extract planet-wide habitat placement.** Make ordinary visits stream
   canonical biome cells independently of river discovery. Keep river moisture
   as an influence, not the only tree permission. Add distant canopy/ground
   representations and validate cells across seams and reloads.
3. **Improve generator families in the nursery.** Review several constrained
   tree forms, grasses, shrubs and geological rock families. Add species and
   individual variation while preserving habitat coherence and measured costs.
4. **Rebuild channel morphology against flume cases.** Couple catchment and
   valley constraints to suitable river forms, then improve water materials.
5. **Introduce one animated animal family.** Prove rigging, contact, motion,
   habitat and deterministic state before expanding to alien/humanoid species.

Keep the existing 256 MiB surface reservation as a current application gate.
Report CPU/GPU allocations and pending work, draw calls, triangles, alpha
overdraw, frame p50/p95/p99 and cold-start latency. Targets depend on device and
quality preset; RTX 5090 results do not certify Quest. Serialize GPU captures,
and run native performance separately from video, readback and mask passes.
Do not increase budgets just to conceal missing LOD or inefficient placement.

The first lab increment is accepted when it reliably detects the present
ecological coverage gap and preserves an inspectable replay. A subsequent
realism increment requires improved ordinary traversal footage as well as
passing geometry and resource checks. New ecosystem features must also pass
the unchanged universe/navigation regression suite.

## Research supporting the evaluation design

- Adam Summerville, **Expanding Expressive Range: Evaluation Methodologies for
  Procedural Content Generation**, AIIDE 2018 ([publisher PDF](https://cdn.aaai.org/ojs/13012/13012-52-16529-1-2-20201228.pdf)).
  Supports evaluating the distribution of outputs and reducing showcase
  selection bias. Its examples concern game levels, not planetary ecosystems;
  the coverage and visual sampling design here is our adaptation.
- Suren Deepak Rajasekaran et al., **PTRM: Perceived Terrain Realism Metrics**,
  2019 preprint ([author manuscript record](https://arxiv.org/abs/1909.04610)).
  Relates terrain landform features to perceived realism. It supports evaluating
  more than noise/detail frequency, but does not certify water, vegetation,
  traversal or arbitrary alien landscapes.
- **fast-check: Model based testing** ([official documentation](https://fast-check.dev/docs/advanced/model-based-testing/)).
  Supports command-sequence testing, simplified independent models and replay
  of reduced failures. It is a candidate development dependency; not installed
  by this research. The route and invariant design is project-specific.
- **Playwright: Visual comparisons** ([official documentation](https://playwright.dev/docs/test-snapshots)).
  Supports controlled screenshot regressions and records environment-dependent
  rendering differences. Our WebGL simulation clock must also be controlled;
  disabling browser animations alone is insufficient. Screenshot equality
  detects change, not natural appearance.

Sources accessed 2026-09-14. Existing code, tests and the supplied screenshot are
the evidence for the implementation audit; external papers support the proposed
methods, not claims that this application already implements them.
