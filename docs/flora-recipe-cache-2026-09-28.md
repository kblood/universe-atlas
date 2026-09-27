# Retained flora decisions — 2026-09-28

The RTX 5090 / Ryzen 9 9950X foundation profile measured roughly 5.9 ms in
ground flora preparation in one warmed frame. `drawFlora` rebuilt string keys,
hashes, habitat choices and growth phases for every candidate on every frame.

`prepareFlora` now separates that immutable decision from `floraFromRecipe`,
which evaluates the existing bounded growth pulse at the requested date.
The original `floraAt` API remains a pure composition of these functions.
Canonical life residents own their recipes; packed renderer slots reference
those residents. Changing water/biosphere availability replaces the residents,
and moving beyond the retained working set releases their recipes.

The renderer preserves its original Float32 habitat inputs and Float64
directions before building a recipe. It still performs culling, transforms
and instance submissions each frame. This is neither a new population version
nor the species/asset recipe system in stage D. `floraRecipeBuilds` reports
cache misses in the current flora draw; warmed stationary frames should be zero.

The build and 22 flora tests pass. A 960-result digest captured from the previous
`4c2369d` implementation matches the refactor, including gates, habitats and
four dates. Date evaluation leaves recipes unchanged. Luna's
[hardware comparison](desktop-rendering-validation-2026-09-28.md) reports zero
warmed recipe builds and lower CPU update cost: planet update p95 changed from
18.6 ms to 12.1 ms in separate runs. One warmed flora draw measured 0.4 ms.
These are approximate fixture comparisons, not a controlled benchmark or a
general frame-rate guarantee.
