# Tree asset performance baseline — 2026-10-14

This is an isolated asset-lab baseline before Tree Kit extraction. The two
shipped family bundles were tested serially in the same browser and view using
`tests/tree-asset.browser.mjs`, at 2560×1440, device scale 1, with WebGL2
`EXT_disjoint_timer_query_webgl2`. The GPU was an NVIDIA RTX 5090 through ANGLE
D3D11; each run confirmed the timer query was available and had no browser or
request errors. The lab rendered 3, 64 and 192 instances at each detailed LOD.
It uses instanced meshes, so the renderer reported six calls at every tested
population. At 192 instances:

| Family | LOD | Triangles | GPU p50 / p95 (ms) | CPU submission p50 / p95 (ms) |
| --- | ---: | ---: | ---: | ---: |
| Branching oak | 0 | 5,301,506 | 4.07 / 4.09 | 0.09 / 0.18 |
| Branching oak | 1 | 1,868,546 | 1.66 / 2.79 | 0.11 / 0.22 |
| Spire conifer | 0 | 5,056,514 | 3.31 / 3.78 | 0.09 / 0.20 |
| Spire conifer | 1 | 1,334,786 | 1.33 / 1.88 | 0.13 / 0.23 |

LOD1 reduced measured triangles by 64.8% for oak and 73.6% for conifer; GPU
p50 fell by 59.2% and 59.8%, respectively. This validates the existing
reduced-detail assets as a useful per-family optimization. It is a before/after
LOD comparison, not a newly implemented Kit optimization. Results came from
individual runs, so use the percentages as this machine's baseline rather than
a cross-device guarantee.

Each family loaded four textures. The browser estimated 55,924,048 bytes of
RGBA8 texture storage including mip levels. Embedded PNG bytes were 1,958,073
for branching and 2,907,343 for spire. These are per-family lab values; they
do not include cross-family bark sharing. Atlas already enables that sharing
by default and the accepted Anitar30 result is recorded in
`fauna-lod-runtime-controller-2026-10-10.md`.

The isolated lab's renderer totals include its ground, grid and shadow work;
its GPU pass is `trees-and-ground`, not tree-only. The population uses one
selected LOD for all instances. This test therefore does not establish a mixed
near/middle/far result, captured-impostor cost, upload bytes, cold decode peak,
or dispose memory. Its frame interval is display scheduling data, not a tree
frame-time claim. Those are the remaining measurements for the Tree Kit gate;
Atlas fixed-pose parity and tree-only draw classification must be captured
separately.

The raw lab reports and screenshots are in the ignored local directories
`test-results/tree-baseline-branching/` and
`test-results/tree-baseline-spire/`. To reproduce, start Vite in one terminal
from the repository root:

```powershell
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5196 --strictPort
```

Then run one family at a time in another terminal, changing the asset directory
and the two GLB names for the second family:

```powershell
$env:ATLAS_HARDWARE='1'
$env:ATLAS_TREE_CANDIDATE=(Resolve-Path 'public/assets/forest/desktop-v1/branching').Path
$env:ATLAS_TREE_LOD0=(Resolve-Path 'public/assets/forest/desktop-v1/branching/oak-lod0.glb').Path
$env:ATLAS_TREE_LOD1=(Resolve-Path 'public/assets/forest/desktop-v1/branching/oak-lod1.glb').Path
$env:ATLAS_URL='http://127.0.0.1:5196/'
$env:ATLAS_RESULTS='test-results/tree-baseline-branching'
node tests/tree-asset.browser.mjs
```

For spire, use `public/assets/forest/desktop-v1/spire`,
`conifer-lod0.glb`, `conifer-lod1.glb`, and a distinct results directory. The
browser runner acquires the shared GPU lock before launch.

## Texture-free LOD1 parser storage candidate

`prepareTreeLODPair` creates a parser-only GLB for LOD1 because LOD0 owns the
shared decoded textures. Before the change, that temporary GLB retained the
entire LOD1 binary chunk, including its unused embedded PNG views. The Kit now
checks whether every image view is an embedded, zero-padded suffix after all
geometry views, verifies that no surviving glTF reference targets a removed
view, remaps remaining view references, and copies only the aligned geometry
prefix. Unusual or interleaved layouts fall back to the original full binary.
The source GLBs and LOD0 textures are unchanged.

The same headless Chromium session compared the pinned Kit baseline module and
the candidate module over seven alternating baseline/candidate pairs per
family on identical shipped GLBs. The host was Windows 11, Ryzen 9 9950X3D,
Node 24.7.0; this CPU-only test did not use a renderer or GPU. LOD1 parser
binary size changed from 2,599,120 to 641,036 bytes for branching oak (saves
1,958,084 bytes) and from 3,300,776 to 393,416 bytes for spire conifer (saves
2,907,360 bytes). Preparation CPU p50 was 9.88 ms baseline / 10.00 ms
candidate for oak and 14.41 / 14.26 ms for conifer. The paired CPU timings
overlap and do not establish a repeatable speedup. The supported claim is the
smaller temporary parser binary and copy, not a frame-time or GPU-memory gain.

The raw paired reports are retained locally (ignored by Git) under
`test-results/tree-instance-api-paired-branching-2026-10-14/` and
`test-results/tree-instance-api-paired-spire-2026-10-14/`. The runner is
`tests/tree-instance-api.bench.mjs`; it uses a temporary baseline source module
from the pinned Kit commit and removes that module after the run. Kit tests
cover compaction/remapping and unsafe-layout fallback. The separate quiet-host
mixed-distance Atlas GPU capture remains required for the Tree Kit runtime
gate.
