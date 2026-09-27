# Tree species and asset contract — 2026-09-28

The first stage-D source contract is `src/tree-species-recipe.ts`. It consumes
existing biosphere `Species` records; it creates no new species catalogue.
Callers supply dated, habitat-eligible species. Rendezvous hashing binds a
canonical cell to one of those trees independently of list order. An empty
eligible set returns no binding. Species additions/extinctions can change an
assignment; cell identity and location remain a separate population contract.

Recipes expose the catalogue's height, crown proportion, branching, leaves and
colours. Trunk diameter currently uses a documented art heuristic: 2.6% of tree
height for spires, 3.4% for broad branching families. Eight structural variants
adjust height/crown/branching within narrow bounds. Leaf dimensions remain
species-sized. Separate per-instance bark/leaf brightness, texture variant and
wind phase reuse those structural variants. Geometry cache keys include recipe,
source-trait fingerprint, asset version, species, structural variant and LOD.

The [first tree component brief](../assets/briefs/temperate-branching-tree-v1.json)
passes the repository's asset-brief-v1 validator. It specifies a reference
16 m tree, connected tapered branches, physically sized leaves, separate
bark/leaf materials, 18k/5k/900 triangle LOD ceilings, root pivots, UVs, wind
attributes, review views and provenance. These are proposed per-asset limits;
full-scene profiling must determine how many detailed trees can be visible.

This contract is not wired into the forest renderer yet. The current rendered
population still uses its existing 10–22 m primitive silhouettes and canonical
placement. Activating species geometry, physical envelopes and habitat binding
requires an explicit appearance/population migration decision and a consistent
canopy implementation. Runtime variant resource eviction, the named Blender
authoring operation, source `.blend`, textures, GLBs and technical/visual asset
acceptance remain unfinished. No generated assets have been published.

Three source tests cover ordering/dated eligibility, physical envelopes,
repeatable structural variation, bounded geometry keys and version changes.
They do not establish artistic quality or performance.
