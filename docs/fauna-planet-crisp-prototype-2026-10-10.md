Indexed planetary crisp-coat prototype
======================================

This method keeps revision-2 constrained-QEM indexed positions, normals, weights,
topology and the actual loaded genome. It shares only the existing library's
COMPOSER_COAT_CRISP_GLSL integer mask mathematics; it does not use a composer
recipe, requested-scale override, frame, colour context or generated body.
The new presentation version is `planet-coat-crisp-context-1`.

Kit `createQuadrupedBodyPatternSampler(source)` supplies exact prepared planetary
coordinates: source-density-clamped coat, phase, signed flank/growth lateral
factor, dorsal normal, region, along coordinate and canonical filtering footprint.
Its three forced-main-mask colour layers share the original anatomical,
stocking/fawn, hoof, armour and colour arithmetic. The old generation path still
matches the frozen twelve-body/genome/pose corpus and every sampled body colour.
In a separate sampled-point check, 548 points reconstructed the original colour
exactly while 37 nonlinear overlay points were explicitly detected.

Atlas creates L0/L1/L2 and a four-component pattern sample per existing vertex.
The fragment evaluates the shared mask and mixes interpolated regional layers.
Filtering takes the larger of canonical source footprint and screen derivatives.
The field matches the source oracle at eligible sample points up to Float32 GPU
rounding; interpolating regional coefficients between coarse vertices is still a
presentation approximation. Full source and LOD must use the same new fragment
control in review. The original vertex-colour material remains a separate control.

Unsupported patterns, nonlinear mask reconstruction and striped/banded/brindle
limb layouts retain original vertex colours in all three layers. Supplemental
parts retain their original colours. Fallback points keep real source coordinates
to avoid pulling nearby eligible pattern coordinates toward zero. These are
explicit fallbacks, not claims of universal coat parity or arbitrary repainting.

Float control storage is 52 additional typed bytes per vertex per CPU/GPU copy.
The composition-only `FaunaPlanetCrispBatch` wraps the existing indexed batch,
adds four attributes and two float texels of parameters per actor, and dispatches
seven library mask variants in one lit draw. Existing poses, roughness, clipping,
depth/distance shadow paths and per-frame geometry behaviour remain intact. No
production renderer/default imports this opt-in experiment.

`cacheMode:'atlas-owned'` supports unique individual geometry keys. It admits one
pending registration, copies geometry and basis into fixed atlas slots, then drops
duplicate CPU caches. Repeated exact keys compare/copy from a live owner; owner
migration and last-owner eviction mirror the base cache lifecycle. Register and
prepare must be interleaved. The default retain-source mode with eight entries is
only a repeated-fixture prototype, not evidence for 128 unique planet animals.

Composite admission counts base atlas/palettes, all basis buffers, appearance
parameters, base row trackers and one pending geometry/basis before allocations.
128 actors/500 vertices/1500 indices with atlas ownership reserves 12,599,516 bytes
(12.02MiB)
typed CPU/GPU storage. This is candidate-only: near rigs, flora, forest, worker
input/output, borrowed source ownership, JS plan/key objects and driver/compiler
resources must be measured and admitted at aggregate game level. A 128-definition
test validates ownership/bounds, not generation time or real 128-body GPU quality.

Focused tests cover indexed identity, coefficient/fallback semantics, shader
parameters, original BRDF, cache alias rejection, slot reuse, no per-frame geometry
uploads, 128 distinct admissions, exact live-owner reuse/migration and pending
cancellation. Actual Daunune/Anitar and adult/juvenile rest/walk/feed images,
30/60/100m filtering, GPU sample parity, compilation and 128 unique field timings
remain acceptance gates. Quest acceptance is unavailable. Packed coefficient
storage is a possible next control, subject to bounds and quantized-oracle parity.

The optional packed control now uses `basisStorage:'packed-delta16'`: three
normalized Uint8 base channels and two signed normalized Int16 delta triplets,
plus unchanged Float32 coordinates. This is 31 bytes per vertex rather than52.
`packFaunaPlanetCrispData` rejects base layers outside0..1 or deltas outside-1..1;
it does not clamp data to force admission. The sum of coefficient quantization
errors bounds every possible mask/patch and convex triangle interpolation by
one channel byte. Float control remains available. The packed presentation
version is `planet-coat-crisp-packed-delta16-1`.

At the same 128/500/1500 atlas-owned configuration, packed composite typed
reservation is 9,901,016 bytes (9.44MiB), including one pending input copy.
Actual genotype coefficient-range checks, GPU pixel parity and near/flora/forest
aggregate accounting remain required; this does not establish game-level life
acceptance. Seven focused checks now cover both formats, including128 independent
definition admissions and no duplicate retained basis/source arrays.
