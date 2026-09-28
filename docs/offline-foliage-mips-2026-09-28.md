# Offline foliage mip delivery

Local implementation following the updated Opus review. The offline baker and
runtime sidecar loader have CPU checks; actual-game GPU acceptance is pending.

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
- Runtime validates the manifest against the source foliage bytes before
  installing all levels on the shared texture. Colour, depth and distance
  passes use the same map and alpha threshold. Invalid input rejects the staged
  family replacement and preserves the previously active forest library.

## Local runtime implementation

`TreeAssetOptions.foliageMipSidecar` accepts a manifest and an ArrayBuffer.
Each input to `loadForestTreeFamilies` can supply its own sidecar, since Oak and
Pine have different source PNGs. Choosing both the runtime builder and offline
sidecar is rejected. No sidecar is fetched implicitly by production yet.

The loader validates dimensions, atlas layout, cutoff, contiguous level layout,
coverage metadata and SHA-256 hashes of the embedded source PNG, full payload
and each level. It installs the original base image and straight-RGBA ImageData
lower levels before the first GPU upload. Both LODs and their shadow materials
share the same Texture. Failed validation leaves that texture untouched;
disposal releases the installed image sources along with the family.

The level-7 payload is 5,592,064 bytes per family. This removes pixel generation
from loading, but hashing, ImageData creation and GPU upload still cost time.
The uncompressed foliage chain alone occupies approximately 21.3 MiB on the
GPU; this excludes the other textures, geometry, shadow map and driver overhead.

The [focused CPU log](../test-results/offline-foliage-mips/cpu.log) records 34
passing checks across sidecar validation/lifecycle, mip generation, actual Oak
LOD parsing and family integration. These checks do not establish browser
upload correctness or improved frame time.

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
