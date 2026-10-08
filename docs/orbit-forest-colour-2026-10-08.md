# Forest contrast on the coarse orbital globe

The climate-v2 forest distribution is retained. The previous fully humid
forest colour was only `[37.9, 82.35, 44.5]`, next to humid grassland
`[40, 89, 48]`: a maximum green-channel contrast of 6.65 before grain.

The coarse-globe presentation now uses a forest endpoint `[18, 55, 25]`
at `0.8 * forestSuitability01`. At full suitability this gives
`[22.4, 61.8, 29.6]`, a green-channel contrast of 27.2. The strength remains
continuous, with no new vegetation threshold or forest-placement rule.
This is the coordinator's implementation decision for the previously
authorized orbit-forest task; it can be adjusted after visual review.

`planetSurface` enables this palette for both system-preview and refined
orbital globes. Its sixth argument disables the change for before/after
review. The palette has its own `colourVersion`, `orbit-forest-colour-1`.
Default terrain queries, local tile colours and ground materials keep their
existing terrain/climate versions and colour pins. Consequently the coarse
globe becomes slightly lighter as local terrain takes over during approach;
this presentation difference needs browser/headset review. The change does
not alter terrain heights, shoreline, climate, biome classes or populations.

Validation: TypeScript passes. Two focused tests compare all non-colour
sample fields at 1,024 directions on each of four worlds, then compare
relief, roughness, geometry, land fraction and bounds from before/after
bakes. Ocean bytes, dry-world bytes, treeless, meadow and full-snow
endpoints remain identical. Existing golden queries use the default sampler,
so this task needs no golden re-pin.

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
