# Surface Flora location replay

Open `surface-flora-lab.html` or use **Inspect this location in Surface Flora
Lab** in an Atlas planet inspector. The link carries the universe seed, full
body address, exact world date and the current body-fixed viewing direction.
An ordinary Atlas bookmark can also be pasted into the lab: a saved `walk`
position supplies its surface direction; otherwise the direction control is
explicit. The lab respects Atlas' legacy time-URL conversion and shows model
compatibility notices when a bookmark uses older versions.

Select 24 m candidates for the shrub field or 2 m candidates for fine ground
cover. The local map shows at most 80 real cubemap lattice cells, nearest
first, around the entered direction. Clicking a cell selects it. Its ground,
biome, two-axis slope, dated life stage, body age and instance seed are shown.
Absent, unformed, sterile and extinct sites remain absent; no random living
plant is substituted. The life-stage conversion and species-kind selection
are shared with Atlas. Terrain uses the same 25 m dated sea bucket as the
renderer, with ±1 m slope probes for fine cells and ±4 m for coarse cells.
Flora recipes use the renderer's Float32 habitat lanes and Float64 canonical
directions, with age from `planetAgeMyr`.

**Selected living candidate** previews its actual scale and rotation across
the near/middle/far geometry LODs, together or separately. Atlas batches one
geometry seed per body and kind; the lab and renderer share that seed helper.
The individual instance seed shown in the site card controls the candidate's
identity and placement and is distinct from the shared geometry seed. All
LOD panels use the same geometry seed and scale. Triangle/vertex/byte totals
are geometry metrics, not full renderer performance measurements.

**Copy replay link** captures the selected cell and exact date for reopening
or sharing. **Open body in Atlas** opens that body's inspector at the same
date; it does not relocate the Atlas camera onto the selected plant. Atlas
bookmarks only restore a precise surface camera when they contain `walk`.

This map inspects presence before culling, distance coverage and instance
budgets. Atlas' continuous `PlanetForest` owns trees at every altitude and
suppresses tree candidates in the flora field. The lab reports that routing
instead of presenting a flora-field tree archetype as the forest's actual
runtime mesh. Use the existing Tree LOD / capture labs for forest assets.
**Kind template experiment** can inspect any flora-field archetype, including
its historical tree template, even when the selected cell has no living flora.

**Synthetic experiment** retains the former equirectangular sample grid with
manual planet profile, body seed, slope, biosphere stage and Myr controls.
These controls intentionally override the dated production environment and
are not an Atlas location replay.

**Verification (2026-10-13):** `npm run build` passed and
`node --test tests/surface-flora-replay.test.mjs` passed all 7 tests. The
initial build caught an `unknown`-to-string type error in replay input
validation; the input guard was corrected before the passing build and tests.
