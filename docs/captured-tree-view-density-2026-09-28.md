# Captured tree view density comparison

## Decision

Do not adopt the 17 by 17 view grid. This bounded Oak experiment improved the
intermediate silhouette but failed to improve lighting, while multiplying decoded
texture memory by 3.57. No Pine repeat or game replacement follows this result.

The unchanged 16 m Oak LOD1, runtime foliage mip sidecar, 64 px captures from
512 px source and per-view relighting were used for both grids. Both comparison
runs used the RTX 5090 through ANGLE D3D11 with no reported browser or GL errors.
The density brief is `examples/asset-briefs/atlas-family-lod1-capture-density-comparison.json`
in the IWSDK repository (validated and committed at `f31ee4b`). It leaves the
original acceptance thresholds unchanged.

| Coverage-weighted intermediate view `[1,.3,1]` | 81 views | 289 views |
| --- | ---: | ---: |
| Decoded GPU texture bytes | 7,077,456 | 25,251,664 |
| 33 px coverage area error | -6.08% | -2.06% |
| Blurred silhouette IoU | 0.874 | 0.943 |
| Mean linear-RGB luminance error | -21.00% | -32.37% |
| Median view-depth difference | 1.163 m | 1.101 m |

The aligned front view remains identical, including -6.38% luminance error and
0.901 m median depth difference. This is expected because that capture direction
exists in both grids. The intermediate depth metric compares an area-averaged
reference to reconstructed front-depth data; it is not exact ray-intersection
accuracy. Float probes are untone-mapped linear RGB in renderer units.

The larger screenshots are inspection views, not the 33 px quantitative fixture.
The captured crown remains soft and visibly stippled relative to the source mesh.
Matching the silhouette alone does not establish a seamless transition.

## Evidence and reproduction

- [81-view per-view relighting report](../test-results/family-capture/sidecar-relight-v1/report.json)
- [289-view report and four screenshots](../test-results/family-capture/sidecar-grid17-relight-v1/report.json)
- [Capture audit](../test-results/family-capture/sidecar-grid17-audit/capture-audit.json): all 8,092 attachments hashed, finite raw channels, nonzero bark and foliage, unchanged sources and verified sidecar copies.

The retained source capture is
`Assets/_assetctl/atlas-oak-lod1-capture-16m-64-sidecar-grid17-v1`.
Reproduce through the named `assetctl tree-impostor` operation with `--grid 17
--size 64 --supersample 8 --height 16 --lod 1` and the original Oak family and
`tree-foliage-mips-oak-max7-e` sidecar. Use a fresh output directory.

The browser harness selects this fixed fixture with `ATLAS_CAPTURE_GRID=17`,
`ATLAS_CAPTURE_FAMILY=oak`, `ATLAS_CAPTURE_SIDECAR=1` and
`ATLAS_CAPTURE_RELIGHT=1`; set `ATLAS_CAPTURE_REPORT` to a fresh output folder.
The audit uses the same grid and sidecar flags.

## Next investigation

The remaining lighting error may come from collapsing the distribution of leaf
normals into a single normalized mean before lighting. This is a hypothesis,
not established causality. First compare normal averaging against averaging the
lit samples on the same captured surfaces. Avoid another increase in view count.
If the hypothesis is supported, established low-order spherical-harmonic
irradiance filtering is a candidate to evaluate with explicit memory and accuracy
costs; see [Ramamoorthi and Hanrahan's original paper](https://graphics.stanford.edu/papers/envmap/).
It does not by itself solve visibility, specular response, shadows or tree wind.
