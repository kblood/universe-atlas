# Terrain wet-surface roughness

This local terrain increment connects the existing sampler roughness value to
the ground material. The metre-scaled detail atlas, biome roughness, terrain
heights, colour, hydrology, walking surface and tile coordinates are unchanged.

`terrainSampler` currently returns roughness `0.9` for dry ground and `0.28`
for its wet river-surface sample. Tile construction now carries that value as
a per-vertex scalar through the terrain worker and renderer, including skirt
vertices and resident-byte accounting. A continuous response maps the
sampler's existing dry value (`0.9`) to zero wet influence and its wet-channel
value (`0.28`) to full influence. Dry ground therefore keeps its original
sand/soil/rock/snow roughness target, while wet samples transition toward
`0.28`. The existing distance fade still blends this into the underlying
material at range.

Focused CPU checks cover wet/dry sampler values, tile attribute parity,
adjacent-patch continuity, skirt copying and the shader input/combination.
TypeScript passes. This is a targeted material response, not a new damp-soil
model: dry river banks retain their current classified material, and a wet
terrain sample beneath a separate water surface may not be visible. Browser
shader compilation and in-game visual review remain pending; no appearance or
performance acceptance is claimed.
