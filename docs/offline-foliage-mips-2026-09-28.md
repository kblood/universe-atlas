# Offline foliage mip delivery

Implementation decision following the updated Opus review. The offline baker is
in progress; runtime sidecar loading and actual-game acceptance are not done.

## Why this path

The current optional coverage mip builder does synchronous work during asset
loading: 276 ms in one local capture and 322 ms in the corrected lighting run.
The smallest levels also report zero alpha-test coverage. Baking beforehand
removes that generation work from travel, while a bounded chain avoids those
known empty levels. Neither change by itself proves believable distant foliage.

The existing assetctl KTX2 path always generates its own mips from one image and
converts GLB textures to `KHR_texture_basisu`. Atlas's custom tree parser currently
requires four PNG images and uses a GLTFLoader without a KTX2Loader. Converting
the complete asset format is deferred until the existing texture path is accepted.

## Delivery contract

- A named assetctl operation reads a validated brief and a source tree GLB.
  It selects the foliage material's base-colour map; bark and normal maps remain
  untouched. No caller-supplied executable or generator source is accepted.
- Bake straight RGBA lower levels using the existing alpha-weighted linear RGB
  filter and per-atlas-cell alpha-test coverage rule. The original base PNG
  remains embedded in the GLB.
- Emit lower-level pixel payloads plus a manifest recording source hashes,
  algorithm version, cutoff, atlas grid, exact dimensions, per-level coverage,
  output hashes, preserved license state and provenance. Use a fresh output
  directory and preserve the source.
- Trial endpoint: level 7 for a 2048-square, 4-by-4-cell atlas (four pixels per
  cell side). This is a visual trial setting, not an accepted universal policy.
  A full chain remains available as reference.
- Runtime should validate the manifest against the source foliage bytes before
  installing all levels on the shared texture. Colour, depth and distance
  passes must use the same map and alpha threshold. Failure retains the ordinary
  texture path with an explicit diagnostic.

## Renderer compatibility

The installed Three WebGL2 regular-Texture upload path uses the supplied mip
count for `texStorage2D` when generated mips are disabled. Immutable storage
bounds the available mip range to its allocated levels; this supports a short
chain without a separate shader LOD clamp. See the
[WebGL2 specification](https://registry.khronos.org/webgl/specs/latest/2.0/) and
[OpenGL ES 3.0.6 texture storage/completeness rules](https://registry.khronos.org/OpenGL/specs/es/3.0/es_spec_3.0.pdf).
This source/specification inspection is not a browser readback test or visual
acceptance of the chosen endpoint.

Validate the actual shared Texture upload, minimum-size sampling, original
colour/alpha, shadow agreement, close/middle movement and matching far handoff.
Measure payload, decode/upload time and memory as well as total cold loading.
Use the observed in-game date after navigation for all wind and replay checks.
