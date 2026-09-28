# Per-view relighting for captured Oak and Pine

Date: 2026-09-28. Isolated RTX 5090 lab comparison; no game integration or
visual approval.

## Result

The opt-in `captureRelightViews` branch evaluates Three.js's installed physical
lighting chunks separately for each of the three blended capture views, then
blends the resulting direct and indirect diffuse/specular terms. The baseline
single-pass shading remains the default. The report used the runtime's
source-hash-bound foliage sidecars, actual Oak and Pine LOD1, and 16 m capture
families (81 views at 64 px; 7,077,456 bytes of explicit mip data per family).

At the intermediate `[1, 0.3, 1]` direction, the report's alpha-weighted mean
probe-RGB luminance error improved, but remained outside the 10% comparison
gate:

| Family | Existing single-pass | Per-view relighting | Median / p95 view-depth error |
| --- | ---: | ---: | ---: |
| Oak | −35.94% | −21.00% | 1.163 m / 3.216 m |
| Pine | −38.03% | −24.95% | 1.177 m / 2.720 m |

The FloatType probe render targets use Three.js's `LinearSRGBColorSpace` and
`NoToneMapping`. The alpha-weighted luminance values are therefore an
untone-mapped, linear-RGB image-space comparison in arbitrary renderer units,
not calibrated radiometric data. ACES Filmic and exposure 1.2 apply to the
on-screen screenshots only. The lighting toggle does not alter reconstructed
depth: the depth figures match the prior sidecar run. Coverage also remains
unchanged by the lighting option. At the 33 px
intermediate probe, the weighted capture was −6.08% area / 0.874 blurred IoU
for Oak and −6.24% / 0.848 for Pine.
The mesh reference's 528-to-1056 px covered-area change is below 0.7% for Oak
and 3.3–3.6% for Pine; this supports the area comparison but does not make the
rendered mesh a perfect radiometric or per-ray truth reference.

The source mesh's alpha-hash comparison is species-dependent. At 33 px it
brings Oak's area to roughly +2.4–2.8% of the reference, compared with MASK at
−27.2%. Pine instead overfills by roughly +76–78%, compared with MASK at
−49.6%. These are single-frame probes without temporal accumulation; HASH is
not a general fix for both families.

## Metric interpretation and visual limits

The depth probe compares 33 px capture view-depth against a 1056 px source-mesh
render reduced to 33 px. Each source pixel's depth is coverage-weighted across
its 32×32 supersamples; each capture depth is the continuous blend of the
selected view depths. Median and p95 absolute errors are computed only where
both outputs have coverage above 0.1. This is a useful matched image-space
comparison, not exact ray-traced surface truth.

The saved lab screenshots magnify the low-resolution capture. Oak still reads
soft and stippled; Pine is especially sparse and dark against its source mesh.
In these historical screenshots the visible dropdown still says “Legacy,”
because programmatic harness loads did not update the control. The JSON status
records the actual loaded filtering mode; the report and harness record the
`captureRelightViews` value. Use those records as the mode evidence.
The images and scores do not establish ordinary-distance appearance,
transition quality, temporal stability, forest cost, or production readiness.
The per-view branch also uses the proxy's shadow-coordinate varyings; it does
not reconstruct per-view shadow-map coordinates. No performance conclusion
was measured.

The paired [relighting report](../test-results/family-capture/sidecar-relight-v1/report.json)
and [prior sidecar baseline](../test-results/family-capture/sidecar-surface-v1/report.json)
record source hashes, probe rows, errors, and per-view enable state. Inspect the
[Oak source](../test-results/family-capture/sidecar-relight-v1/oak-coverage-weighted-mesh.png)
and [Oak capture](../test-results/family-capture/sidecar-relight-v1/oak-coverage-weighted-capture.png),
or the [Pine source](../test-results/family-capture/sidecar-relight-v1/pine-coverage-weighted-mesh.png)
and [Pine capture](../test-results/family-capture/sidecar-relight-v1/pine-coverage-weighted-capture.png).
