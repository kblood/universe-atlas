# Ground surface PBR detail v1

**Status: local prototype; visual and runtime acceptance pending.** The normal terrain material now has an opt-in close-range PBR layer for soil and rocky ground. Existing planet palette, biome weights, terrain heights, water, and hydrology remain the base. This increment does not make the whole landscape visually complete.

The source textures are Poly Haven's [Dirt](https://polyhaven.com/a/dirt) by Charlotte Baglioni and [Rock Ground](https://polyhaven.com/a/rock_ground) by Rob Tuytel, both CC0-1.0. Their original files, source URLs, API MD5 values, and SHA-256 hashes are preserved under `assets/ground-materials-v1/source/`. `ground-pbr-v1.brief.json` records the intended use and acceptance conditions. `scripts/pack-ground-materials.py` verifies the pinned originals, downsamples to 512 px, filters albedo in linear sRGB, renormalizes filtered OpenGL tangent normals, and packs roughness into albedo alpha. `ground-pbr-v1.asset.json` is the assetctl-generated package manifest. The older `manifest.json` is an unshipped staging record.

The authored soil tile repeats every 2 m. The rock source tile is 1.5 m and is uniformly scaled to a 2 m runtime repeat so both maps share the existing 4096 m rebase period. Terrain shader coordinates use the existing local-frame anchor and triplanar projection; soil and rock detail follow the current soil/rock biome weights. PBR color, roughness, and normals fade in from 600 m to 1.8 km. Wetness still comes from the terrain sampler and drives the wet roughness target. Four 512 px RGBA8 maps require an estimated 5,592,406 bytes with full mip chains.

The texture set is packaged by the named `assetctl texture-set` operation. It checks the validated texture brief, declared license, bundled file sizes and hashes, and manifest schema. It does not decode images or certify their dimensions; the deterministic packer verifies 1024×1024 source dimensions, and a focused Node check verifies the generated 512×512, 8-bit RGBA PNG headers against the package hashes.

## Validation status

- Source pages, original texture hashes, output map dimensions, channel layout and byte totals are recorded in the asset bundle and manifest; the brief and generated manifest pass assetctl contract validation.
- The package reports content hash `7dfe6cd8471bc0efb51434355b94183842b1b8b4eeb9b78b3b3ea72d0e04af90`. Runtime PNGs total 2,797,613 bytes; source originals total 4,956,046 bytes. They use 2 m runtime repeats; the rock source's 1.5 m tile is rescaled by 4/3.
- Focused wet-roughness and PBR contract tests pass (7/7). They check biome weighting, wet roughness, repeat-period arithmetic, PNG headers and packaged hashes. The production build also passes and emits the four maps as binary assets.
- Shader compile, tile-edge and rebase visual continuity, grounded dry/wet comparison, and WebGL error checks remain pending. Earlier navigation attempts timed out before reaching a grounded view and are retained as failed diagnostics; they are not visual evidence.
- No claim of accepted appearance, performance improvement, or deployment is made.
