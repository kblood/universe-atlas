# Universe Atlas Lab Center

Open [Lab Center](../lab-center.html) for links and short descriptions of the
hosted labs. Atlas's Lab Center button and every field-guide chapter link here.

The center prioritises current production tools, then controlled references and
historical animal interfaces. A development tool is not a certification of the
full planetary renderer. Local tree files remain in the browser; these tools do
not upload them.

## Hosted tools

- Animal Lab: `animal-lab/`, the current creature-kit Composer editor. Its visual
  editor previews full, middle (4,500 target) and far (1,000 target) LODs,
  including same-specimen comparison and actual triangle counts.
- Animal Population Benchmark: `animal-lab/benchmark.html`, repeated or mixed
  animal populations at different distances, live rendering options, CPU/frame
  and optional GPU measurements, paired instancing comparisons and JSON export.
  Uses Atlas's shared instancing code; excludes full planetary rendering.
- Surface Flora Lab: `surface-flora-lab.html`, samples the active Atlas
  `terrainSampler`, `biomeClassifier`, `floraAt` and `buildFloraGeometryData`
  implementations. The equirectangular preview is a finite sample grid, and
  local slope and biosphere stage are explicit controls. It is a focused
  development harness, not a full streamed planet renderer.
- Biome Recipe Lab: `biome-lab.html`, flat `biome-ecology.ts` reference
  composition and recipe counts. This controlled fixture is not the active
  `surface-biomes.ts` planet classifier; planned fauna is not rendered.
- Biosphere Lab: `biosphere-lab.html`, species, habitats, growth and dated
  histories. Its specimen geometry is a simplified reference representation.
- Civilization Lab: `civilization-lab.html`, current scenario and run guide for
  the separate `C:\LLM\IWSDK\civilization-lab` deterministic Node workbench.
  The Atlas page is informational; simulation-to-Atlas data integration and a
  browser UI remain future work. Its authored fixtures are not Atlas planets.
- Cloud Lab: `tests/cloud-comparison.html`, controlled cloud comparisons.
- Tree Asset Lab: `tree-asset-lab.html`, local GLB LOD pairs, populations and wind.
- Tree Capture Comparison: `tree-impostor-lab.html`, meshes and captured impostors.
- Tree Reference Comparison: `tree-reference-lab.html`, Atlas and EZ-Tree.
- Existing Impostor Comparison: `tree-impostor-reference-lab.html`, the pinned
  Three.ez reference, with no wind or shadow acceptance.
- Thin-leaf Lighting: `leaf-transmission-lab.html`, a calibration fixture.

## Archive

`creature-lab.html` is the archived Atlas interface. `animal-lab/planet-skin.html`
is the archived planet quadruped inspector. Both retain links to current Animal
Lab. Their source and historical assets are preserved.

## Local fauna LOD reference

The historical fixture lives at `tests/fauna-body-lod-lab.html` with its renderer
in `tests/fauna-body-lod-lab.mjs`. It uses the previous fauna renderer and expects
historical data at `test-results/body-lod-assets/data.json` (or a `data` query
parameter). It is not included as a hosted interactive page because that data is
not part of the current release. Current animal LOD preview work should use the
shared creature-kit Composer reducer and the actual planet detail-level policy.

## Maintaining the center

`lab-center.html` is the link directory. Hosted HTML entries are registered in
`vite.config.ts`; the reference notes are emitted alongside the build. Keep
current, development and archive labels explicit, and verify the links against
the production build when changing entries.
