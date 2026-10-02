# Blender fauna implementation evidence

**Current priority:** the user clarified that independently combinable parts
across dinosaurs, turtles, giraffes, birds, ostriches, rhinos, apes, worms and
centipedes are the immediate objective. Follow the
[modular composer amendment](fauna-modular-composer-plan-2026-10-02.md).
Opus 5.5 completed the modular implementation. The first desktop preview is
now [deployed and verified](fauna-modular-preview-2026-10-02.md), with realism
work continuing. Deer shoulder028 was stopped and its partial code/review
output preserved; no028 export or deployment was performed. Candidate027
remains the retained authored reference.

The [full plan](fauna-blender-morph-plan-2026-10-02.md) remains active. This log
records actual candidate results; a technical pass is not a visual approval.

## Infrastructure

- Added named `assetctl blender fauna-template` operation and fixed Blender
  authoring module. Full asset-brief validation precedes launch. Argument/path
  checks reject caller code, duplicate options, traversal and existing outputs.
- `assets/briefs/deer-doe-v1.json` passes the v1 asset contract.
- `node --test tools/assetctl/test/contract.test.mjs tools/assetctl/test/fauna-authoring.test.mjs`
  from the IWSDK root: 14 passed, 0 failed.
- New explicit Blender smoke command:
  `node tools/assetctl/test/fauna-authoring.smoke.mjs --output Assets/_assetctl/FRESH-CANDIDATE`.
  It uses the shared GPU lock, validates skin/morph/UV/sidecar transforms,
  reimports the exported GLB for six render views, and verifies input/source
  preservation and rejection of an overwrite.

## Candidate 001

Retained under `C:/LLM/IWSDK/Assets/_assetctl/deer-doe-candidate-001/`:
source `.blend`, GLB, original brief snapshot, coat image, morph/joint sidecar,
authoring manifest, technical validation, smoke report and six-view review.

- Blender 5.1.1; 9,240 triangles, 27 joints, 12 morph targets, three materials.
- Khronos/local validation and Blender reimport passed. Exported joint-local
  transforms match the runtime sidecar. Original files survived review and an
  attempted output-directory reuse unchanged.
- GLB SHA256: `eeef68952166dfde4d4004f7ba560536f9af3e28cf62e9c408accac8e1a529ef`.
- **Visual review: revise.** Neutral proportions are recognizably deer-like,
  but proximal limb roots are pinched, legs are too thin, face and ears remain
  too simplified, and coat/hoof/eye material output requires correction.
- Render-sheet names follow generic Blender axes: its `front.png` is the
  animal's side view because Atlas animals face +X. The generic wire pass also
  includes a review-only bounds sphere; that sphere is not in the GLB.

Candidate 001 was copied into the local lab asset directory for integration
testing. It has not been visually approved, packaged as a release or deployed.
Source files and all previous candidates remain preserved. License state is
still `NOASSERTION` for the review asset; copied CharacterCreator algorithms
carry their separately recorded MIT notice.

## Runtime integration and candidate 002

- Actual GLTFLoader import of candidate 001 verified the multi-material group
  layout, 27 joints and all morph endpoints. Unit tests caught and fixed shared
  inverse-bind matrix objects in Three.js skeleton clones; instances now own
  those matrices as well as their influences and materials.
- Creature Lab has an explicit Blender-reference source, six bounded controls,
  reproducible URLs, neutral/skeleton views and comparison to the procedural
  baseline. It labels the imported asset as a static reference candidate.
- Browser runs for both 001 and 002 passed 11 control extremes, product
  corrective, URL replay, comparison, skeleton, mobile capture and five complete
  unload/reload cycles: resident counts stayed at five geometries/nine textures;
  no page or console errors. These counts are observations, not a six-animal
  performance qualification.
- Full CPU suite at this checkpoint: 889 tests, 885 passed, zero failed,
  four optional skips; receipt `test-results/fauna-blender-2026-10-02/cpu-suite.log`.
- Candidate 002 technical smoke also passed at 9,240 triangles. Proximal limb
  connections improved, but visual acceptance remains **revise**. Its GLB body
  colour accessor was entirely white, despite authored brown colours. The next
  revision explicitly selects the named colour layer in the Blender exporter
  and will verify actual exported values.
- Candidate 002 GLB SHA256:
  `ba99b34f35da5a9d3a765e25160202d414c2b426f927a03955b4b968eaa4af2d`.

## Candidates 003–005: actual motion and deformation

- Candidate 003 fixed the Blender exporter colour selection by explicitly
  exporting `CoatTint`. The author now decodes exported GLB colour accessors
  and checks that the brown/pale body palette survived. Candidate 004 refined
  chest, abdominal tuck, cheek/orbital contours, ears and hoof width.
- Actual GLB audits run 77 neutral morph combinations and 15 morphology
  configurations × 121 walking frames. Candidate 005 has 10,504 triangles,
  27 joints and 12 targets. Its maximum skinned hoof target error is
  `2.6337e-7 m`, maximum stance drift `2.2873e-9 m`, minimum sole height
  `-1.1271e-8 m`, and reach error zero. These are technical contact checks,
  not a claim about the naturalness of the walk.
- The runtime solves elbow/carpus and stifle/hock chains from the actual
  morphed skeleton. It measures skinned sole vertices and all substantially
  foot-weighted vertices, rather than reporting only a rigid foot proxy.
  A deliberately blended-skin fixture checks that distinction.
- Lab walking is a labelled centred inspection; the CPU audit separately
  checks stationary world contacts with a travelling root. Saved links now
  pin the actual GLB SHA-256 and reject revision mismatches explicitly.
- Candidate 005 browser checks pass on both Vite development and the production
  build, including seven walk poses, exact pose seek, morphs, reload/disposal,
  file-load failure and a wrong model-hash link. Reports are in
  `test-results/fauna-blender-2026-10-02/browser-005/` and `production-005/`.
  TypeScript/Vite production build passes with the existing chunk-size warning.
- **Whole-body deformation is still failing.** An independent audit set its
  limits before looking at candidate results: edge stretch at most 1.8,
  compression at least 0.45, central belly motion p95/max at most 3%/5% of
  hip-to-shoulder span, and abdominal section area within ±15% of neutral.
  These are engineering review limits, not biological measurements.
- Candidate 003 failed at 4.868× edge stretch, 0.139× compression and 12.45%
  maximum central belly displacement. Height-based weighting had incorrectly
  attached all 87 audited central belly vertices to limbs.
- Candidate 005 replaces that rule with explicit body/limb regions carried
  through subdivision. Central belly limb weighting and displacement both
  fall to zero; section areas stay at 0.999–1.046 of neutral. However proximal
  limb collars still fail at 3.7225× stretch and 0.055× compression. The same
  thresholds remain in place while the collar weights are revised.
- Failure evidence is retained in `test-results/fauna-template-003-deformation.json`
  and `test-results/fauna-template-005-deformation.json`. Foot contact passing
  does not override these failures. No new fauna release has been deployed.

## Candidates 006–007: corrected weights and remaining topology defect

- Candidate 006 feathers proximal limb ownership across four loops and removes
  distal-joint influence from the upper limb mass. It passes the unchanged
  whole-body gates across 15 morphology configurations × 24 poses: maximum
  edge stretch 1.59793, minimum edge ratio 0.59633, central belly displacement
  zero, and abdominal section areas 0.99787–1.04579 of neutral.
- Candidate 006 also passes all 77 morph cases and 15 × 121 motion frames.
  Reports: `test-results/fauna-blender-2026-10-02/asset-006.json`, `motion-006.json`
  and `test-results/fauna-template-006-deformation-all-controls.json`.
- Starting at 006, every candidate contains the exact authoring Python source
  snapshot as well as its hash and editable Blender scene.
- Candidate 007 adds a more deliberate nasal pad/nostrils and eyelid surfaces;
  it has 11,028 triangles. Browser checks including delayed-load cancellation
  pass. Its close-up still needs naturalness review; facial additions are not
  automatically an improvement just because more geometry was authored.
- Isolated CPU benchmark on Ryzen 9 9950X / Node 24.7.0 / Three 181: one-animal
  walking p50/p95/p99 = 0.158/0.168/0.234 ms; six-animal aggregate =
  0.917/0.959/1.114 ms. Shared geometry/morph buffers total 2,787,876 bytes,
  including 2,252,448 morph bytes. Fifty-five instance lifecycle checks pass.
  Receipt: `test-results/fauna-template-007-performance.json`. Texture uploads,
  rendering, JS overhead and the planetary scene are excluded; this does not
  qualify a device frame rate.
- **Visual gate remains open.** Neutral-material walking images still show
  sharp strips/chevrons around the upper legs. Read-only authoring inspection
  found that projecting a torso opening into angles generated non-monotonic,
  sometimes self-crossed limb cross-sections. The next revision replaces them
  with ordered convex cross-sections and adds a direct topology check. Passing
  relative deformation tests could not detect this malformed rest geometry.

## Candidate 008: ordered limb sections

- The author now builds ordered eight-sector leg rings and measures the actual
  cage points for positive signed area, convex turns and nonadjacent edge
  intersections. All 44 sections pass; per-section evidence is preserved in
  `Assets/_assetctl/deer-doe-candidate-008/authoring-manifest.json` in the parent
  workspace. This check is scoped to cage sections, not a whole-surface
  intersection guarantee.
- GLB SHA-256: `d9a4f27931164f71dfc0a6da16b39dd160b5604ba6df80c4a523de9da3480f9f`.
  Export/reimport and all 77 actual morph cases pass. Fifteen configurations ×
  121 walking frames pass with maximum contact error 0.000000264 m and zero
  reach error. Whole-body deformation passes unchanged limits across 15 × 24
  cases: edge ratios 0.66280–1.53891, no central belly motion, and abdominal
  section area ratios 0.99870–1.08688.
- Reports: `test-results/fauna-template-008-cpu.json`,
  `fauna-template-008-motion.json`, `fauna-template-008-deformation-all-controls.json`
  and `test-results/fauna-blender-2026-10-02/browser-008/report.json`.
- Browser images confirm the long inner-leg strips are removed. Concave root
  transitions still create small triangular grooves, and facial naturalness
  remains inadequate. Candidate 009 isolates a face refinement; collar topology
  requires a separate controlled change. No new release is deployed.

## Static surface intersection gate and candidate 009

- The independent `tests/fauna-template-topology-asset.mjs` now tests actual
  exported triangles in the largest connected skin component. Separate eyes,
  eyelids, hooves and other shells are enumerated and excluded explicitly.
  It reports winding, degeneracy, boundary/nonmanifold edges and proper triangle
  crossings. Known geometric fixtures exercise the intersection algorithm.
- Candidate 007 fails with 409 crossing pairs; 008 and 009 each fail with 205.
  Every reported crossing is also confirmed with an independent Three.js ray /
  triangle algorithm, with zero disagreements. Most remaining crossings occur
  where upper legs pass through intact torso undersides. This is a release gate;
  the earlier relative deformation passes remain valid within their scope.
- Reports: `test-results/fauna-template-007-topology.json`,
  `fauna-template-008-topology.json` and `fauna-template-009-topology.json`.
- Candidate 009 shortens the nasal pad and shapes almond-like eyelids. Browser
  and export checks pass, but visual review found that lowering the forehead
  exposed an ear-root gap and a small detached lip segment. Candidate 010 is
  addressing these regressions alongside the collar topology.
- Render-sheet review now excludes actual bone custom-shape objects from
  framing and wire overlays, based on pose-bone references rather than names.
  The 009 smoke test verifies that reviewed surface triangles match the GLB.

## Deterministic individual recipes and trait locks

- `deer-individual-1` is an opt-in, versioned recipe for restrained correlated
  variation within the deer template. It keys adult proportions by seed,
  profile, species grouping and individual index; juvenile growth retains
  those proportions and applies the authored juvenile morph.
- Individual and seed changes preserve locked traits. Manual slider edits
  retain locks and return to manual mode. Reset clears shape, locks and recipe.
  Saved URLs include recipe, locks, exact numeric values and the GLB hash;
  numeric values remain authoritative when loading a saved specimen.
- Eight CPU tests pass, including 2,048 deterministic specimens and a version
  golden. Independent browser checks pass for recipe application, locked body
  condition across individual changes, adult/juvenile identity, exact saved URL
  replay, manual editing and reset. Receipt:
  `test-results/fauna-blender-2026-10-02/browser-009-variation/report.json`.

## Open acceptance gates

### Rendered desktop measurement

`tests/fauna-template-performance.browser.mjs` now runs a dedicated Vite-served
scene with the real loader, decoded 1024×1024 coat texture, morphs, animation,
floor and 1024×1024 shadows. Candidate 011 was measured on hardware ANGLE/D3D11,
specifically the AMD Radeon integrated adapter, at 1440×900 and pixel ratio 1.
This fixture does not include the planetary scene and did not measure GPU
elapsed time.

For six walking animals, CPU update plus render submission p50/p95/p99 was
2.1/2.8/3.1 ms. The renderer recorded 37 calls and 159,026 triangles including
the shadow pass. Six create/dispose cycles kept identical live resource counts
(four geometries, 24 textures, four programs) and empty counts (four/six/two).
Owned instance resources were disposed exactly once.

RAF cadence p50/p95/p99 was 16.7/16.7/216.7 ms, with a 233.4 ms maximum. Therefore
smooth 60 Hz is **not established**, despite low measured CPU costs. The report
distinguishes successful measurement/resource checks from frame-rate acceptance.
Receipt: `test-results/fauna-template-011-render-performance/report.json`;
the same directory contains one- and six-animal captures.

### Remaining geometry and quality work

Latest complete code regression: 895 tests, 891 passed, zero failed, four optional
skips. Production build passes with the existing bundle-size warning. Receipts:
`test-results/fauna-blender-2026-10-02/cpu-suite-latest.log` and `build-latest.log`.

Candidate 010 widens the sewn torso openings and turns collar sections gradually.
Its 13,252 triangles remain within budget, and export, browser recipes/replay,
morphs, contacts and deformation pass. The independent static audit confirms
that both foreleg collars are clear, but 96 hind-collar crossings remain.
`test-results/fauna-template-010-topology.json` is the active failure receipt.
Visual review confirms the 009 ear-root and detached-lip regressions are repaired.
Candidate 011 preserves the curved rear collar boundary, reducing the confirmed
crossing count to 90, but still fails. Candidate 012 expands the rear opening to
cover the forward thigh mass and lowers the inner collar below the belly.

Candidate 012 passes main-skin topology in all 15 neutral morph configurations,
with zero crossings, degeneracy, winding or nonmanifold-edge defects. Its 13,988
triangles remain within budget. Production-browser recipe/replay/contact and
resource checks pass (`production-012/report.json` under the dated test folder).
However the expanded independent checks expose two remaining animation defects:
hind-groin edge ratios 0.3150–2.6258 fail the unchanged 0.45–1.8 limits, and three
of eight sampled adult walking phases have fore-axilla crossings. Reports are
`test-results/fauna-template-012-deformation-all-controls.json`,
`fauna-template-012-topology-all-controls.json`, and `fauna-template-012-topology-walk.json`.
Candidate 013 targets weights only, preserving the now-clean neutral geometry.

Candidate 013 confirms exact exported bind and all twelve morph-position
triangle equivalence with 012 (`test-results/fauna-template-012-013-geometry.json`).
All fifteen neutral morph topology cases and eight sampled adult walking phases
now pass without connected-skin crossings. Morph and hoof-contact checks pass.
Hind-groin deformation still fails at edge ratios 0.3157–2.6365: total hip/axial
ownership changes too quickly across short edges even after distal-joint pull
was capped. Candidate 014 is addressing that spatial weight gradient while
preserving the mesh and the corrected forelimb weights. Visual acceptance,
coat realism, combined morph/walk checks and deployment remain open.

The topology audit now accepts `--all-controls` and `--walk`. Connectivity is
derived from original bind positions, so posed collisions cannot accidentally
be classified as shared topology. These options retain the same intersection
tolerances and explicit exclusion of separate detail shells.

Neutral anatomical/appearance refinement, interacting morph extremes, rig
deformation and grounded movement, family expansion, lower-detail rendering,
runtime resource/replay tests, final provenance/package and accepted deployment
remain required. Desktop evidence cannot establish headset qualification.

### Candidates 014–018: deformation and exported coat maps

Candidate 014 exposed a weight-audit gap: polygon edges omitted triangulation
diagonals, and retaining four influences changed the intended ownership gradient.
Candidate 015 audits the actual triangulated graph and preserves axial/limb
shares during influence selection. Its exported hind ownership gradients are
5.000006 and 5.000002 per metre. The unchanged deformation limits now pass:
edge ratios 0.598923–1.796111. Neutral morph topology and hoof contacts also pass.
However eight confirmed right-groin crossings remain at adult walk phase 0.375.
The thin patch loses area and turns through the surface; a passing edge-length
test alone is insufficient. Temporary stifle-to-hip weight transfer removes the
crossings while making the patch thinner, so it is not accepted as a repair.
The next repair is a bounded mirrored hip-flexion corrective, tested for area,
orientation and crossings as well as edge strain. The gait remains unchanged.

Candidates 016/017 introduced original CPU-baked base-color, normal and roughness
maps. The bake rejected real UV overlap between inner groin and outer thigh.
Candidate 017 retains its pre-bake Blender source and overlap evidence.
Candidate 018 reduces Smart Project's angle from 66 to 40 degrees and passes
the overlap check and Blender/export/re-import smoke. Its bind geometry and all
twelve morph-position triangle sets exactly match 015, independent of UV splits.
It retains 13,988 triangles and 27 bones. GLB SHA-256:
`86f1a84d750528e836ca1e6612c3acca7df557a4c72b0c95b5a212233bc20ebf`.

The actual embedded maps pass `fauna-template-018-coat.json`: 2048-square
base-color and normal maps, 1024-square ORM, zero metallic channel, nonconstant
roughness, valid decoded normals, and a shared RGBA8 mip estimate of 50,331,644
bytes (within the 48 MiB brief gate). The decoded-map audit is now part of future
authoring smoke runs. Seven browser lighting/frame/morph captures establish
that these maps are decoded, correctly bound and affect rendered pixels.
General browser regression also passes, with resource counts unchanged after
repeated replacement (`fauna-blender-2026-10-02/browser-018`). Candidate 018's
contact and deformation checks pass at the same values as 015.

**Coat visual acceptance fails.** The body/head captures show periodic bands and
a foam-like surface. Bake statistics show only 15.55% interior atlas coverage,
398 triangles without a pixel centre, and incomplete seam sample coverage.
Median density is 469.8 pixels/metre, too low to reliably resolve the requested
1.5–2.2 mm fine detail. Shader/channel checks do not establish realistic fur.
UV packing, filtering and seam evidence remain required. Review captures:
`test-results/fauna-template-018-coat-browser/`.

### Candidate 019: actual joint-driven corrective morphs

Candidate 019 adds two bounded groin targets, bringing the exported count to
fourteen. They have zero default influence and zero joint offsets. Optional
`poseCorrectives` sidecar recipes measure actual hip-to-stifle sagittal flexion
relative to the morphed rest skeleton, cancelling parent/root placement. A
smoothstep activates between 0.04 and 0.15 radians. Reset/reapply clears these
weights, and gait evaluation is independent of prior frame order.

Blender/export/re-import smoke and embedded-map checks pass. Exact comparison
confirms that the neutral mesh and original twelve morph-position triangle
sets remain unchanged from 018; the two explicitly declared pose targets are
the only permitted additions. Map bytes also match 018 exactly. Candidate hash:
`bbc2527ba78ab81985104f9d3555a2b8629af373f1f2ba26fe7acf89a08e795e`.
Morph checks pass for 77 configurations; hoof contacts pass for fifteen control
configurations across 121 times each.
The general browser suite passes eleven specimens, source switching, manual and
recipe replay, loading errors and stable resource counts. The expected target
count is now explicitly fourteen, including the two named hip correctives.
Receipt: `test-results/fauna-blender-2026-10-02/browser-019/report.json`.

**The corrective is not accepted yet.** The full topology matrix passes 134 of
135 cases, including all sampled adult phases. The remaining case is juvenile
1, leg length -1 and neck length 1 at walk phase 0.5, with five crossings.
The full deformation matrix fails the unchanged edge gates: maximum ratio
2.687670 and minimum 0.382286 (allowed 1.8 and 0.45). Even the default adult has
ratios 1.967027 and 0.446289. The original local probe missed differential motion
on a neighboring left-groin edge and the fixed-size offset is too large for
some smaller morphs. The next CPU probe must cover both sides and the complete
control/frame matrix, preserving area and orientation as well as edge length.

Required-input receipts:
`test-results/fauna-template-018-019-geometry.json`,
`fauna-template-019-cpu.json`, `fauna-template-019-motion.json`,
`fauna-template-019-topology-all-controls-walk.json`, and
`fauna-template-019-deformation-all-controls.json` (all under `test-results/`).

Candidate 019 is staged only in the local lab's public assets. It has not been
deployed or accepted for the planetary runtime. The full multi-family goal
remains active; coat/face realism and family expansion are still open.

The isolated hardware browser benchmark for 019 completed with bounded resource
counts and exactly-once instance disposal. Six walking animals use 37 draw calls
and 167,858 rendered triangles including shadow passes. CPU motion plus render
submission p95 is 13.4 ms (motion alone 13.0 ms), versus 2.8 ms for the earlier
011 fixture; 019 updates full skinned bounds when pose weights change. This is
a performance regression requiring optimization. Background CPU activity and
the different candidate limit an exact causal comparison, but the split timer
locates most measured cost in motion. RAF p99 is 383.3 ms, so no smooth-frame
qualification is implied. Receipt:
`test-results/fauna-template-019-render-performance/report.json`.

### Conservative bounds, UV coverage and CharacterCreator packing

The runtime now constructs per-bone conservative bounds after morphology edits,
including the full bounded pose-corrective envelope. Per-frame updates transform
and union those boxes instead of scanning all skinned vertices. An independent
actual-019 audit checked 1,498,500 posed vertices across 135 samples, including
root transforms: zero box/sphere escapes and zero full bounding-box scans.
Six walking animals in the same hardware fixture improve from 13.4 to 4.1 ms
CPU p95 (motion alone 13.0 to 3.2 ms). Resource counts remain stable. RAF stalls
remain substantial, so this does not establish smooth 60 Hz or XR performance.
Receipts: `test-results/fauna-template-019-bounds.json` and
`fauna-template-019-render-performance-bounds/report.json`.

Candidate 020 tests anatomical UV charts and filtered original coat fields.
Seam coverage/continuity improve, but the bake rejects only 10.54% interior
atlas occupancy against its unchanged 40% gate. Hundreds of small islands
indicate a chart/packing issue. The source, maps and failure report are preserved;
020 has no accepted GLB. The helper is being repaired before another run.

The pinned MIT CharacterCreator GLB packer is now vendored with attribution and
exposed through `assetctl fauna-compact`. Quantization is disabled. Independent
decoded signatures and Khronos validation protect all referenced geometry,
skin, image and scene data; unit fixtures include sparse/zero/shared targets,
large deltas, rejected semantic changes and unsupported extensions. On actual
019 it saves only 33,988 bytes (5,932,812 to 5,898,824), because Blender already
uses sparse morph storage. Three's actual loader confirms exact base/all-fourteen
morph geometry, 77 morph samples and fifteen contact configurations after packing.
Parent source remains unchanged. This is a technical export step, not deployment
or visual approval. Artifact: `Assets/_assetctl/deer-doe-019-compact-001/` in the
workspace root; receipts: `test-results/fauna-template-019-compact-*.json`.

Independent code review tightened the compaction wrapper: embedded-only checks
now run before general GLB loaders, and buffer/view metadata that upstream might
discard is explicitly rejected. Six unit cases pass, including those negative
controls. `deer-doe-019-compact-002` reproduces the same output hash after these
changes. The vendored source remains unmodified with the exact MIT notice.

The complete code suite after the bounds change has 900 tests: 896 pass, zero
failures, four optional skips. Production build passes with its existing large
chunk warning; the production-browser suite passes eleven specimens and stable
resource counts. Receipts under `test-results/fauna-blender-2026-10-02/`:
`cpu-suite-019-bounds.log`, `build-019-bounds.log`, and
`production-019-bounds/report.json`.

The attempted broader pose-corrective fields improve several numerical metrics
but do not reliably preserve the entire groin patch. The next anatomical change
will redistribute the underlying rear-collar topology instead of requiring more
complicated pose drivers to compensate for thin rest triangles. Preserving the
015 bind mesh was an isolation step, not a restriction on final anatomical work.
Original candidates remain intact. UV diagnosis also identifies the closed
eyelid ribbons as consuming disproportionate atlas space; the next helper
revision cuts those charts and normalizes their surface-area scale.

### Candidate 021: UV repair verified; isolate shadow artifacts

Candidate 021 passes Blender/export/re-import and embedded-map validation.
Its bind geometry and all fourteen morph-position triangle sets exactly match
019. The UV repair changes only surface mapping/material bake: 38 coat islands,
45.5097% interior coverage, zero interior overlaps, and median 805.57 pixels/metre.
All seam reads are covered; decoded normal disagreement is 0.5433 degrees p95
and 1.2752 degrees maximum. Conservative edge samples remain separately counted;
136 tiny triangles have no pixel centre and are not misreported as interior hits.
GLB SHA-256: `23233caf7427587e88ce74a25a347297d8e67da0fd6b0fa7c811b0c544d5a6b3`.

Nine actual browser material/frame/morph/diagnostic captures pass. They also
correct an earlier causal assumption: the conspicuous broad bands remain when
normal/roughness detail is disabled, but disappear when shadows are disabled.
These bands are self-shadow artifacts in the review fixture, not evidence that
coat texel aliasing caused them. The prior low coverage/seam defects were real
and are repaired; this separate lighting defect must also be corrected. Captures:
`test-results/fauna-template-021-coat-browser-diagnostic/`, especially
`grazing-head-detail-off.png` and `grazing-head-no-shadows-coat.png`.
The general browser suite passes eleven specimens and stable resource counts;
actual 021 morph (77 configurations) and contact (15 configurations) checks
also pass. Receipts: `fauna-blender-2026-10-02/browser-021/report.json`,
`fauna-template-021-cpu.json` and `fauna-template-021-motion.json` under
`test-results/`. These do not change the known 019-equivalent groin failure.

Neutral-material and unshadowed views still show an overly smooth conical head,
gold-outlined eyelid and insufficient mandibular/cheek anatomy. UV/channel passes
are not realistic-animal acceptance. Candidate 021 is now the local public lab
asset; production `dist` remains the verified 019 bounds build. Nothing new has
been deployed. Candidate 022 is planned to repair proximal hind-ring topology
and evaluate the base without the optional hip-corrective pair; the twelve
identity targets and the general runtime corrective framework remain.

### Candidate 022 and an authorized Opus implementation run

Candidate022 redistributes the proximal hind collars around the anatomical
femoral centreline. It has 14,500 triangles, 27 bones and twelve identity morphs;
the unsuccessful optional hip pose pair is absent. Blender/export/re-import,
77 morph configurations, fifteen contact configurations and all 135 actual
topology samples pass. Two audit defects were corrected with retained positive
and negative regression fixtures; numerical limits remain unchanged. See
[the audit scope record](fauna-deformation-audit-scope-2026-10-02.md).
Actual deformation still fails minimum edge compression (0.306611; limit 0.45).
This is a sharp hip/stifle weight mixture rather than a rest topology crossing.
GLB SHA-256: `6baf9c95195f547f89a37905825b919776961714b0a266016453afe50598533b`.

At the user's explicit request, real Claude Code 2.1.287 was launched with
`--model claude-opus-5-5`, high effort, and enabled/allowed `Read`, `Edit`,
`Write`, `Bash`, `Glob` and `Grep` tools. This is a local implementation run
with explicit tool permissions and `dontAsk`, without changing global settings.
The session's init event confirms the requested model and tool set. Opus owns
the weight repair, new candidate023 authoring and actual exported-asset tests;
the earlier anatomy agent supplied its reproducible diagnostic and froze source.
Root separately checks preservation and acceptance. Run evidence, the exact
brief, before/after source snapshots and streamed tool events are retained in
`test-results/fauna-opus-implementation-023/`. The run is currently in progress;
launching it alone establishes no test or visual acceptance.

### Review lighting repair

Creature Lab and the material fixture now share a light-space shadow fit over
full animal bounds and projected ground shadows, independent of the head/body
viewer crop. The desktop review preset uses a 2048-square map, requested 3 mm
depth bias and 2 mm normal bias, with size-dependent caps. This replaces broad
fixed shadow volumes; a cached envelope avoids unnecessary fits each frame.
Seven lighting tests and TypeScript checks pass. Nine candidate021 material
captures with the new preset pass and visual inspection shows the broad/fine
self-shadow bands substantially reduced while retaining ground shadows.
Receipts: `test-results/fauna-template-021-coat-browser-shadowfit-2k/`.

Doubling each shadow-map dimension quadruples its texel count. Hardware timing
and a main Creature Lab browser review of this final integration remain to be
run; prior 1024-square performance receipts do not qualify this preset.
The unrealistic face/eye/chest details remain separate asset work. Public local
asset is still021, no new deployment or headset qualification has occurred.

### Review default-morph defect and next structural face work

Independent review found that all twelve022 GLB default morph weights are1;
the saved Blender source also has every KeyBlock.curval at1. Thus the imported
Blender review sheet combines juvenile, both ends of bipolar traits and the
product target. It is **not a neutral adult anatomy reference**. Its imported
height1.1546464m differs from the neutral raw geometry's topY1.6642258m.
Creature Lab explicitly resets/applies its controls, so its recorded controls0
runtime captures remain the appropriate current adult visual evidence.

The new raw-document `auditFaunaNeutralDefaults` checks mesh and node override
defaults before a runtime reset can hide this defect. Four regression fixtures
pass; actual022 is retained as the expected failing control in
`test-results/fauna-template-022-neutral-defaults.json`. Source zero-default
repair, a fresh export and integrating that assertion into authoring remain
required before accepting a neutral Blender render sheet.

[The head refinement handoff](fauna-deer-head-refinement-2026-10-02.md) uses the
valid runtime captures and attributed red deer/skull references. It prioritizes
cranial/mandibular shape, orbital framing and integrated nose transitions,
followed by neck/chest insertion. These are anatomical asset changes; lighting
or material-detail improvements alone do not satisfy the realism gate.

Opus has authored candidate023 and its existing Blender smoke passes, with
GLB SHA-256 `5c8aace9f20a36fd191b30a23699433938d27bb4579012b9193dc6c900dc3add`.
Fourteen focused weight tests pass. Actual morph/motion/topology/deformation
and independent preservation comparisons are in progress; the default-morph
defect remains a separate required follow-up. The updated TypeScript/build
checks pass, and the pre-registration main suite reports896pass/0fail/4skip.
Seven lighting cases pass separately and are now included in `npm test`.
The latest `dist` is the021 asset with repaired review lighting; no deployment.

### Candidate 023 structural result and independent follow-up

Real Opus 5.5 completed the weight implementation and actual exported-asset
tests. Its first-party model identity is recorded in the CLI result, not merely
in the requested model flag. All 77 morph configurations, fifteen contact
configurations, 135 topology samples and all-controls deformation pass.
Compression improves from 0.306611 to 0.598923 (minimum 0.45); maximum stretch
remains 1.796111 (maximum 1.8). Central abdomen area remains 1.0 and displacement 0.
Exactly 93 exported vertices change their hind-limb weight mixture.

The independent **raw-accessor** preservation comparison confirms identical
nonweight geometry attributes, UVs, all morph channels, rig/binds, sidecar,
materials/images, coat helper and original 022 files. Hind ownership changes
by at most 1.353e-7, within the explicit 2e-7 float-storage limit. A strict axial
bit-equality check fails by one float32 ULP (7.45e-9); source mutation/audits prove
axial weights remain bitwise unchanged before export, and exporter normalization
introduces that rounding. The strict failed report is preserved. A separate
explicit one-ULP export-only comparison passes, with unchanged nonhind bone
keys and no added/dropped slots. No physical deformation limit was changed.
Receipts: `fauna-template-022-023-weight-preservation-raw.json` and
`fauna-template-022-023-weight-preservation-raw-ulp.json` in `test-results/`.

Opus also exposed a runtime bounds regression shared by 022 and 023: templates
without pose-corrective targets skipped per-bone bounds construction/update.
The independent runtime fix now handles both absent and empty pose drivers.
A new test fails before the fix and passes after; seventeen core/motion tests
pass. Actual 023 checks 135 samples / 1,212,165 vertices with zero box or sphere
escapes and no per-pose skin-vertex scans. Receipt:
`test-results/fauna-template-023-bounds-fixed.json`.

Two first-run Opus tool permissions were denied for report operations. The
`test-results` junction resolves onto D:, outside the initial Claude working
directory. The resumed Opus run explicitly adds that real report directory;
its report Write now succeeds without global permission changes. It is working
on fresh 024 neutral defaults followed by 025 structural head refinement. Source
and assets from 023 remain preserved. Logs and exact briefs are under
`test-results/fauna-opus-implementation-023/` and
`test-results/fauna-opus-realism-024-025/`.

The final 2048-square review lighting integration passes the main Creature Lab
browser checks (eleven specimens; geometry/texture counts unchanged after
switching). The actual 021 isolated hardware fixture on AMD integrated graphics
records CPU p95 of 1.1 ms for one walking animal and 2.9 ms for six; six-animal
render submission p95 is 0.7 ms. GPU elapsed time is not measured and RAF p99
still reaches 233.3 ms, so no smooth 60 Hz or device qualification follows.
Receipts: `fauna-template-021-browser-shadowfit-2k/report.json` and
`fauna-template-021-performance-shadowfit-2k/report.json` in `test-results/`.
Realistic head/chest/eyes, neutral Blender sheet acceptance, further families
and production deployment remain open.

### Candidate 024: valid neutral export and review baseline

Opus now sets each shape-key value to zero and verifies the saved/exported
neutral state. Raw GLB mesh defaults contain twelve zeros. The authoring smoke
integrates the independent neutral-default audit before its render review;
reimported bounds match neutral raw geometry within 5.96e-7 metres.
Candidate 024 GLB SHA-256:
`86eb338f882160a56c0dcdae80ad11496c2ecefcb22b391dd859714772d69b59`.

Actual morph, contact, deformation, topology and bounds audits pass. Geometry
comparison against 023 and the weight-mixture preservation audit pass. The
runtime bounds fix is separately verified on unchanged 019, 022 and 023, so its
improvement is not misattributed to the neutral-default export repair.
Receipts are the `*-024.json` and `geometry-compare-023-024.json` files under
`test-results/fauna-opus-realism-024-025/`.

Root and the independent visual reviewer inspected the actual neutral hero and
front/side views. The default repair is accepted; anatomical realism remains
**revise**. The cone-shaped head lacks cheek/orbital/jaw definition, the eyes
remain small lateral dots, the nose reads as an attached cap, and the lower
neck/chest remains inflated. Candidate 024 is the valid neutral baseline for
the ongoing 025 head refinement. The pale Blender sheet is not proof of runtime
coat albedo. No source image pixels enter the runtime asset.

The full current main test suite passes: 908 tests, 904 passed, zero failures,
four optional skips (`test-results/fauna-blender-2026-10-02/cpu-suite-023-bounds-lighting.log`).
Public local asset and existing build still contain 021; no new deployment.

### Sidecar revisions and work beyond neutral standing

New authored specimen links now pin both the GLB and the exact sidecar bytes
with replay version 2. GLB-only legacy links remain compatible and newly copied
links capture both current revisions. Invalid, unavailable or changed metadata
leaves the scene empty; sharing is disabled while loading or failed. SourceHash
keeps its previous GLB-only meaning. Twenty-three focused CPU checks and
TypeScript pass. The actual browser run also passes all six metadata failure
cases, legacy upgrade, eleven specimen configurations and stable resources.
See [the replay contract](fauna-specimen-replay-2026-10-02.md) and
`test-results/fauna-template-sidecar-replay-021/report.json`.

Opus is implementing the head's cranial and mandibular shape against the
retained living-hind and female-skull references. A separate motion task is
implementing a deterministic browsing pose based on measured morphed neck/head
lengths and a muzzle point, while preserving grounded hoof contacts. Neither
the new head nor browsing movement is visually accepted yet.

The pale Blender sheet remains under investigation. Review code retains the
actual textured materials; a CPU disk-light model supports excess illumination
as a hypothesis, but it cannot establish actual imported bindings or exposure.
A metadata-only patch and an independent grey-reference calibration proposal
are preserved under `Assets/_assetctl/fauna-review-lighting-proposal/` in the
workspace root. The live review code is frozen until matched 024/025 shape
images exist, so a lighting change will not be mistaken for a shape improvement.

The browsing prototype now exists in `src/fauna-template-browse.ts`. It measures
the morphed neck/head chain and an anterior head-weighted muzzle vertex, uses a
bounded, time-only rotation profile, reports requested versus reachable foliage
height, and leaves the idle hoof contacts planted. Five focused tests pass and
are included in the main test command. Actual 024 testing covers fifteen control
cases and 49 times: hoof movement is zero and muzzle residual is below 4.25e-8 m,
but **skin deformation fails** (maximum stretch 3.9533; minimum compression
0.08232). No lab control exposes this motion yet.

The failures identify discontinuous chest/neck ownership at the author's hard
X/Y classification boundaries. A separate in-memory prototype replaces those
transitions with continuous weights from measured axial segments, preserving
limb influences and the central abdomen. Its initial strain, walk and contact
checks pass without reducing browse angles; topology and actual 025 comparison
are still being checked. This is a diagnostic on unchanged asset bytes, not an
authored repair or accepted movement. The next source change must reproduce it
in a fresh Blender export and pass the same tests and visual review.

### Candidate025 recovery and next neck repair

Opus authored025 with cranial/mandibular planes, orbital framing and integrated
nose details. Its CLI session exited with a background smoke task still alive;
the CLI killed that task after export. Root verified the recorded owner and
related Blender/Node processes were absent before removing the abandoned GPU
lock. Existing source/export files are preserved. Review recovery uses a fresh
output directory, without regenerating025.

Root's independent025 CPU checks pass for morphs, walking contacts, full-body
deformation, topology and conservative bounds. Actual GLB SHA-256 is
`9459a4b5a82dafaaad4746412f742b540325297bcc23408f09c5018bb2f360b3`.
The head-profile audit passes attachment checks across morph extremes; one
authored art target remains below its minimum: preorbital relief3.97mm versus
4mm. This numerical target is not a biological measurement. Visual acceptance
was reviewed in matched024/025 images after recovery. All14candidatefiles stayed
byte-identical and the imported neutral bounds match within5.96e-7m. The nose
cap is integrated and the jaw has more shape, but the overall model still looks
smooth and toy-like, with inflated paired shoulder masses. Decision: retain
the improvement, **REVISE realism**. No default switch or deployment.

The temporary continuous-neck override now passes the full browse, walk,
contact and135-pose browse topology checks on both024 and025. It preserves
base/morph buffers and all3232 limb-bearing and74 central-belly vertices
exactly. Opus has been resumed to implement and CPU-test that source repair;
root will perform the next fresh Blender export. No browsing UI or production
acceptance is implied by the temporary override.

Public021 has been retained through the named append-only `fauna-revision
stage` operation after validation and dry run. Both GLB and exact sidecar bytes
are addressed by hashes. Its old default files remain unchanged, and its known
historical all-one morph defaults are recorded as a limitation. This archive
allows future default upgrades to preserve already shared version2 specimen
links; it does not constitute asset approval or deployment.

Latest application validation: `npm test` reports916tests,912passes,0failures,
4skips; `npm run build` passes with the existing bundle-size warning. These
results do not include the separate failing025 head-profile art target above.
The immutable-replay browser regression passes, including retained old links
after a mocked valid default upgrade, unavailable-revision rejection without
fallback, hash tampering, resource stability and eleven morph specimens.
Receipts: `test-results/fauna-blender-2026-10-02/cpu-suite-025-replay-browse.log`,
`build-025-runtime-replay-browse.log`, and
`test-results/fauna-template-immutable-replay-021/report.json`.

### Real026 neck export and strict preservation failure

Opus finished the continuous axial field source with write/run/test permissions
and no permission denials. Root authored fresh026 through the named Blender
smoke; technical, coat, neutral defaults and imported-review checks pass.
Actual browsing across fifteen morph cases and49times now passes unchanged
strain limits: maximum stretch1.319319, minimum compression0.619496, hoof
displacement0, joint translation0 and muzzle residual below4e-8m. Morphs,
walking contacts, deformation, walk topology and bounds also pass.

Independent raw preservation found a real scope error:15 vertices in the
material2 muzzle cap lost small positive neck2 weights. Coat limb and abdomen
weights were exact, and geometry/morph/UV/rig/maps/sidecar data stayed exact.
This is not an export-roundoff exception.026 is preserved as a rejected
preservation checkpoint; Opus is correcting component/material selection for
fresh027, including source vertices shared between coat and the keratin cap.

Independent grey-reference render measurement explains the pale Blender
review: a .18 Lambertian card under the old lamps produced scene-linear1.976,
about3.456stops above the independent .18 target. Actual imported coat bindings
are intact. A versioned calibrated preset is being tested from that measured
reference; default lighting and old review outputs remain unchanged. This is
a review correction, not an anatomy or asset-material change.

### Candidate027: neck repair checkpoint passes

Opus repaired the scope using the largest connected coat component, excluding
every source vertex shared with another material. Root's fresh027 export passes
the strict025-to027 comparator:1030 coat vertices changed, all protected weights
exact with zero ULP difference, and all geometry/morph/UV/rig/map/sidecar data
unchanged. Both eye and keratin primitives are unchanged. Actual morphs,
walking/browsing deformation, contacts, bounds and both135-sample topology
matrices pass. GLB SHA-256:
`757f6c47b7cd769c86b5e1159637119a567bd66a8af2a4f173a5af1dda5c30b6`.

Browser review preserves90main images plus30widened-throat images with source
hashes unchanged. No gross neck collapse is apparent, but overall realism is
still REVISE. The shoulder/lower-neck forms remain inflated, and the nose rim
shows speckled/occluded-looking detail under close inspection. Opus is now
implementing the substantive shoulder plan; nose overlap diagnosis is separate.
The head-profile3.97mm art-target failure remains disclosed and unchanged.

Latest application suite after adding preservation regressions:920tests,
916passes,0failures,4skips. Receipt:
`test-results/fauna-blender-2026-10-02/cpu-suite-027-neck-preservation.log`.
Full checkpoint evidence:
`test-results/fauna-opus-neck-027/root-export-review.md`.

## Modular composer implementation checkpoint (2 October)

The real `claude-opus-5-5` CLI session is implementing the modular composer
with Read/Edit/Write/Bash/Glob/Grep permissions. Recipe, graph, mesh and actor
modules now exist. Native agents own independent tests and visual review;
Opus owns production changes. The current priority remains the modular plan,
including all nine requested animal families and freely editable hybrids.

Independent recipe checks now pass all nine tests after Opus repairs.
The original five rig suites pass across 34 recipes. A sixth test of actual
skinned vertices found floor penetration up to 30.7 mm; this remains open.
The first browser review rendered 48 views of all twelve presets with stable
source hashes and no browser errors. Structural variety is clearly visible,
but membrane deformation and a neck attachment gap require repairs.
These are procedural prototype surfaces, not finished realistic assets.

Evidence and Opus's API/DOM contract are under
`test-results/fauna-opus-modular-001/`. An isolated preview packager and
publisher are prepared there. No modular preview has been published at this
checkpoint; final build, browser acceptance and live verification are pending.

## Opus modular composer completed; publication pending

The real `claude-opus-5-5` session completed successfully with no permission
denials. Its final report is
`test-results/fauna-opus-modular-001/opus-repair-report.md`. Opus reports a
clean TypeScript check, 36 passing focused CPU tests, its browser acceptance
and both independent browser suites rerun into fresh evidence directories.
It repaired skin-floor support, wing folding, front armor-band overlap,
trunk-tip shape and reusable proximal limb/shoulder geometry. Its broader
sampled floor probe covers 12 presets and 450 random recipes with a 1 mm
limit; this is distinct from the permanent independent preset floor test.
No claim of continuous collision freedom or realistic anatomy is made.

The user requested regular commits/pushes, then requested that root conserve
usage and await Opus instead of starting further work. Root waited for Opus
and is saving the completed checkpoint. The full existing suite passed
921/925 (four skipped) before these final repairs; Opus's final focused suite
passed 36/36. No final full-suite rerun or production build was performed.
The modular preview remains unpublished. Continue with build, the prepared
isolated preview package, live byte verification and browser acceptance when
work resumes. Keep the broader realism goal open.

The shared assetctl source also retains the interrupted experimental028
shoulder work. Candidate027 remains the retained verified export; the current
Blender authoring source is not a newly accepted export checkpoint.

## First modular preview deployed and verified

The user resumed work with explicit deployment, documentation, commit and push
instructions. The clean application checkpoint `9d3b84c` was built and published
as `fauna-preview-20261002-01`. The full final suite passed 951 tests with four
skipped and no failures (955 total). The independent UI suite passed on both
the packaged static site and the public HTTPS URL. All 52 packaged files and
the preview manifest matched the local bytes; protected Apache configuration
was checked over SSH. Root inspected the packaged and live comparison images.

See [the deployment record and usage guide](fauna-modular-preview-2026-10-02.md)
for the direct link, source/build identity, evidence locations, retained package
and remaining limitations. This supersedes the earlier publication-pending
checkpoint. Realistic surfaces, wider collision qualification and headset
acceptance remain open.
