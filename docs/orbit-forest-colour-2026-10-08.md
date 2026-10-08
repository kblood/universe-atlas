# Shared forest colour contrast

The climate-v2 forest distribution is retained. The previous fully humid
forest colour was only `[37.9, 82.35, 44.5]`, next to humid grassland
`[40, 89, 48]`: a maximum green-channel contrast of 6.65 before grain.

The shared land palette now uses a forest endpoint `[18, 55, 25]`
at `0.8 * forestSuitability01`. At full suitability this gives
`[22.4, 61.8, 29.6]`, a green-channel contrast of 27.2. The strength remains
continuous, with no new vegetation threshold or forest-placement rule.
This is the coordinator's implementation decision for the previously
authorized orbit-forest task; it can be adjusted after visual review.

Orbital bakes, terrain queries, local tile colours and ground materials read
the same palette, preserving the existing orbit/sampler colour contract.
`TERRAIN_VERSION` becomes `terrain-1.10.1-forest-colour`; climate remains
`surface-climate-2`. `planetSurface`'s sixth argument and the sampler's
`orbitForestTint: false` option retain the previous palette for reproducible
before/after review only. The change does not alter terrain heights,
shoreline, climate, biome classes or populations.

Validation: TypeScript passes. Two focused tests compare all non-colour
sample fields at 1,024 directions on each of four worlds, then compare
relief, roughness, geometry, land fraction and bounds from before/after
bakes. Ocean bytes, dry-world bytes, treeless, meadow and full-snow
endpoints remain identical. Version assertions and tier-set input metadata
are updated; tier sample sites are identical. The first affected run caught
the old coarse-globe-only implementation violating orbit/sampler agreement
and a source-pattern check that assumed the level option was the only one.
Both are addressed while retaining those contracts. Golden colour/version
references must be updated by the coordinator after four-engine equality.
The corrected focused run has 28 tests: 24 pass, 0 fail, 3 full-tier skips
and the existing unreachable fell-field TODO. TypeScript passes.

Review artifacts: `Assets/_assetctl/orbit-forest-2026-10-08/` at the IWSDK
root contains `comparison.png`, individual before/after PNGs and
`report.json`. Left is before, right after; rows are Maithea, Selawyn, Raiva,
Lethuris. These are CPU orthographic projections of actual runtime globe
textures under identical lighting, without clouds. They are texture review,
not browser or device acceptance. Maximum byte-channel change is 23, 22,
17 and 23 respectively; land fraction remains identical.

Reproduce from Atlas, passing an explicit disposable review destination:

```powershell
node tests/helpers/test-slot.mjs --shared 2 -- node scripts/orbit-forest-review.mjs --output C:/LLM/IWSDK/Assets/_assetctl/orbit-forest-2026-10-08-review
```
