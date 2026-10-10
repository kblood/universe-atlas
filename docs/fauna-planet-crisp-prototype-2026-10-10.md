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

Raw-basis correction
--------------------

The actual Daunune reticulated coat exposed a nonlinearity in the library's
final channel clamp: already-clipped forced-mask endpoint colours cannot be
linearly interpolated when contrast pushes an endpoint beyond the clamp.
The additive kit raw sampler (`{rawLayers:true}`) exposes affine colour before
that clamp and validates reconstruction against the original colour oracle.
Default evaluator/generator outputs remain frozen. Daunune's500-triangle
eligible count increases from130 to202 of216 body vertices; the remaining14
foot vertices retain original colour. Reconstruction error is below2.3e-16.

The raw presentation version is `planet-coat-crisp-raw-clamp-1`. A per-vertex
clip flag applies the original0.002..1 clamp after mask mixing at raw body points,
while supplemental/unsupported colours preserve their original0..1 range.
Foot/armour and nonlinear overlays are explicit fallbacks. Both full source and
LOD controls must use this identical clamp stage.

`basisStorage:'packed-snorm16'` handles raw coefficients with a validated
per-source Float32 scale, storing base and both deltas as normalized Int16.
It never clamps coefficients to force a packing domain. Original Float32
coordinates and the clip byte are retained;35 bytes/vertex replace53 float-control
bytes. Scale is rounded upward to include true extremes, and an analytic error
bound across every mask/patch/convex interpolation must remain<=1/255 before the
source clamp. The packed version is `planet-coat-crisp-raw-scaled-snorm16-1`.
The frozen ten-source500-triangle report accepts all sources, with maximum error
bound0.0000435. This is CPU coefficient parity, not GPU/perceptual acceptance.

Updated128/500/1500 owned-atlas reservations include clip buffers and a third
appearance-parameter texel: float12,732,112 bytes; endpoint packed10,033,612 bytes;
raw scaled packed10,419,112 bytes. Near/flora/forest aggregate accounting remains
a separate acceptance gate.32-bit shader seeds are split into exact low/high16
Float32 lanes and reconstructed with uint shifts; tests cover values above2^24
and UINT32_MAX. Eight focused tests plus ten base-batch tests pass.


Serialized worker bridge (prototype only)
----------------------------------------

`createFaunaPackedWorkerAdapter(provider)` accepts the controller's exact
individual/context/genome, optional borrowed loaded source, and 1500/750/500
triangle target. It builds the actual provider genome when no source is loaded,
yielding between the resumable Kit builder phases. Close results admit at most
900 vertices; middle results at most 500. The default pending result ceiling is
512 KiB. The returned payload owns only reduced geometry, packed basis, context
and source plan; its transfer list excludes every borrowed dense-source buffer.
It discards dense correspondence maps and temporary float coefficients before
returning. The controller must serialize jobs and terminate the worker to cancel
during a synchronous reducer phase; AbortSignal is checked between phases.

This bridge does not declare a whole-worker memory ceiling. It reports actual
source/result typed bytes and float basis bytes. The Kit scalar field and cell
lookup grids are bounded to 200,000 points each (1.6 MB combined). Caller and
worker source clones, reducer typed scratch, reducer JavaScript adjacency/heap
objects, original builder JavaScript arrays, and plan metadata still require
separate accounting. The current comparison helper also builds its baseline
control; its temporary memory and cold cost must be counted. A controller's
32 MiB cold reserve is an admission policy, not a measured heap bound.

The Kit public shared shader export is proposed in d0b87bf, following the raw
context API chain. Its string is byte-identical to the prior composer shader,
SHA256 9c49a372ba3ad46e66496e5cd27d69bb93dee5287f0a62ba8c4d1b08ec060253.
The prototype retains the legacy Atlas import until the accepted Kit package
update provides this export; production consumption must use the Kit planet
entry and preserve its inspector exports.


Kit 0.4 integrated candidate
---------------------------

The isolated integration pins Kit 0.4.0 at 40dc4b31776b, preserves its canonical
inspector exports, and consumes the shared mask through `#creature-kit/planet`.
`basisStorage: 'float32' | 'packed-snorm16'` selects the serialized worker output;
float uses the same raw-layer clamp appearance with unquantized coefficients.
Both modes use the actual supplied planetary genome and the same reducer control.

With one staging slot per tier, 17 close slots (900 vertices/4500 indices) plus
113 middle slots (500 vertices/2250 indices) reserve 14,797,470 typed CPU/GPU
bytes in float mode, or 12,187,470 in packed mode. These are pool-only ceilings.
The matching full-source raw field material adds 53 bytes per vertex per CPU/GPU
copy in float mode, or 35 in raw packed mode. Pending transport, plans, source
clones, builder/reducer scratch and existing scene life still require accounting.
Packed's stable paused GPU cost regression remains unresolved; its smaller memory
footprint is not proof of better runtime performance. Runtime rollout remains off.


Runtime-only reduction
----------------------

The worker now calls the constrained reducer directly after the same source
validation. Its geometry, attributes, correspondence, semantic ranges and stats
byte-match the revision-2 review chain at1500/750/500. This omits the unused
baseline comparison build; paired review generation retains that control. The
162.56-second actual128 admission receipt predates this optimization and remains
frozen. Its observed worker heap86.48MB and typed buffers13.04MB are not hard peak
bounds; no whole-worker32MiB claim follows from the pool's typed reservation.
