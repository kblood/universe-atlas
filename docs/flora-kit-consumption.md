# Flora Kit consumption

Atlas pins [Flora Kit](https://github.com/kblood/flora-kit) v0.1.0 as the
`external/flora-kit` Git submodule. Clone with `git clone --recurse-submodules`.
`npm ci`, dev, build and the normal test lifecycle prepare both Creature Kit
and Flora Kit. Flora preparation checks the clean source/provenance and v1
boundary; it generates no editable copies and downloads no Kit dependencies.
The source's Three imports resolve to Atlas's existing pinned Three dependency.

`#flora-kit/v1/field` and `#flora-kit/v1/culling` are the import boundary. The
legacy `src/flora-field.ts` and `src/flora-culling.ts` only re-export those APIs.
The four original focused test paths forward to Kit tests, preserving their
names, replay checks and allocation gate. Kit's deterministic math snapshot
is private; Atlas's shared deterministic math remains Atlas-owned.

Run `npm run check:flora-kit` to verify the exact indexed pin, clean checkout,
provenance hashes and import boundary. `npm run prepare:flora-kit` checks the
selected checkout and permits a pending intentional pin update. Run
`npm run update:flora-kit` to fetch Kit main and prepare it, then review the
focused tests/build and commit the changed submodule pointer. Edit canonical
flora implementations and focused tests in Flora Kit and commit there first.

Atlas retains `flora-life-gate`, `flora-geometry-seed`, `flora-streaming`, the
Surface Flora Lab/replay, and terrain/habitat/water/world-time adapters. The
Kit's tree archetypes are preview geometry. Actual `PlanetForest`, GLB tree
assets, canopy and impostor runtime remain in Atlas.

The Kit remains private for npm and `UNLICENSED` (all rights reserved).
Public repository visibility does not grant a reuse license. The initial
extraction is local until the Kit commit is published. Publishing must push
Flora Kit first, then Atlas, so its public recursive clone can fetch the pin.
