# Terrain-method survey for Universe Atlas mountain detail (2026-10-06)

Scope: read-only research. Read first: mountains-design-2026-10-04.md, mountain-carving-f-v1.md, lod-ladder-contract-v1.md (sections 3, 3.1), mountain-carving-v1.md (A2/B verdicts) and the r5-rejected fixture header. Nothing downloaded, nothing run.

## 0. What is already ruled out (do not re-propose)

| Rejected | What it was | Why it failed (from the docs) |
|---|---|---|
| A / A2 | Dendry-style hierarchical channel network (Gaillard et al. 2019): seeded channel segments per cell and level, V-valley by distance to channel | coherence 0.133 < 0.35; comb-like wall grooves, sharp active-cone transitions; 1500 ns target missed |
| B | Gradient-aligned erosion noise (derivative-damped / slope-aligned gully octaves from the coarser band's gradient) | slope p50 19 < 20; fill 0.096 > 0.05; pits 1602 vs <= 50. No drainage guarantee |
| C, D, E | Per-block drainage solves without enough halo | visible rhythm at 16 km block spacing (trunk gutters, notches, raised ribbons) |
| H10 / d3 | Added sub-8 km noise energy everywhere | broke LOD pins, raised pits 1.3-4.5x, coherence collapsed to isotropic |

Current state: F (haloed priority-flood + stream-power solve, 16 km block, 24 km halo, LRU memo) passes all 8 rows; warm 48.7 ns/sample, cold block ~131 ms. Open items: straight main divide (Luna names it), combed/streaky flanks at 125 m, peak density on wide belts (Selawyn), thin margins in M5 (p90 48.25 vs 48.4, R3' 3.28 vs 3.32), Luna fails M5 renders as "stripes / blocky steps".

Two facts that shape every candidate below:

1. **Transcendentals are not bit-exact across engines.** The ECMAScript spec lets `Math.sin/cos/exp/log/pow/atan2` be implementation-approximated; `+ - * / Math.sqrt` are IEEE correctly rounded. (Spec knowledge, not fetched here; the repo already works this way: F writes A^(3/8) as sqrt(sqrt(sqrt(A^3))).) Any candidate that uses sin/cos for its stripe phase must replace them with polynomial/rational waves.
2. **ROOM constraint is naturally met by a bounded negative delta.** The contract already has carving = -envelope*(1-retained) <= 0, so coarse is an upper envelope and the frame test needs no change. A candidate that outputs a delta in [-B, +B] satisfies child <= parent + 0.05 only if we subtract its analytic bound (delta' = delta - B <= 0) or map it to a `retained` in [0,1].

## 1. Ranked candidates

Ranking is for "best fit to our hard constraints + metrics", not for general terrain quality.

### Rank 1. Gradient-aligned gully filter, "erosion noise" (Clay John 2018 -> Fewes 2023 -> Johansen 2026), built from Quilez-style derivative-damped fBm and a phacelle-style directional kernel

- Sources: Rune Skovbo Johansen, "Fast and Gorgeous Erosion Filter" / Advanced Terrain Erosion Filter, blog.runevision.com, March 2026, https://blog.runevision.com/2026/03/ ; "Phacelle - Cheap Directional Noise", https://blog.runevision.com/2026/01/ ; Inigo Quilez, "Value Noise Derivatives", http://iquilezles.org/articles/morenoise/ ; predecessors Clay John "Eroded Terrain Noise" (Shadertoy 2018) and Felix Westin/Fewes (Shadertoy 2023), named in Johansen's post.
- What it gives: branching gullies and ridges laid onto ANY input height function that supplies height and gradient. Stripes (cos/sin pair, interpolated between cell-pivot kernels, then normalised so amplitude is constant) are aligned to the local downhill direction; several octaves, each using the gradient already modified by the previous octave; a fade mask keeps peaks and valleys of the input untouched; also outputs a ridge/drainage map. Output delta goes both up and down; the post says it can be bounded via the fade target.
- Determinism and tile-locality: every point evaluated in isolation, no neighbour dependency ("trivial to generate in chunks"). Hash-by-cell-position seeding (Godot port confirms seeded by cell + noise seed). Bit-exactness in our setting needs the sin/cos replacement above and a fixed, absolute-coordinate gradient of the input (analytic, or central difference with a fixed step; never a tile-lattice difference). Edge match is then automatic.
- Cost class: pointwise, O(octaves x kernel cells). Phacelle is stated as 16 loops/pixel vs 144-400 for Phasor. My estimate (UNVERIFIED, not benchmarked): 4-5 octaves x 16 cell kernels x ~30 flops is on the order of 1-3 microseconds per sample in JS, i.e. 20-60x F's warm 49 ns. At 10% belt land that is ~100-300 ns weighted vs the 8% budget (~38 ns on a 472 ns sampler). So it must be restricted to levels at or below the carving cut and to belt tiles, and probably limited to 2-3 octaves or baked per tile. Cold tile build at 33x33 vertices is a few ms; the 128x128 colour texture is the heavier consumer.
- Where it sits: NOT a replacement for the 2-16 km drainage structure (that is rejected family B, same idea; B's fail rows were pits/fill/slope). It is the strongest candidate for the sub-2 km layer: the M5 slot, which already receives carvedM plus its x/y offsets (a gradient) and must output v <= 0. It replaces M5's 98.5% strata benches (which Luna and the coordinator read as contour striping) and the 1.5% gully kernels.
- Risk: medium. (a) Pits/closed depressions: the author states stripes "cannot consistently produce unbroken lines; a gully just stops halfway down a mountainside". Whether that creates >0.25 km2 closed pits at 125 m is untested; it should not on slopes steeper than the gully depth gradient, but that is a prediction. (b) Parameter tuning is manual (author's own caveat). (c) Straight stripe cells can read as a visible cell lattice if pivots are not jittered enough.
- Licence/IP: the author's code is MPL 2.0 (stated in the post). MPL is file-level copyleft; an independent TypeScript implementation written from the described algorithm is not a derivative, but do not copy lines. Predecessor Shadertoy shaders: Shadertoy's default licence for unlabelled shaders is CC BY-NC-SA 3.0 (from memory, UNVERIFIED), so do not port Clay John / Fewes code at all. Quilez's article states no licence; derivative-damped fBm (a += b*n.x/(1+dot(d,d))) is a published technique. No patent found for any of these (search did not surface one; not a legal clearance).
- Recommendation: build it, as the sub-2 km layer first and as a full-band comparison second; this is the one place where "existing method, not planet-specific, layered on our coarse field" is a genuine fit. Do not expect it to fix peak density, the straight divide, or the 2-16 km drainage.

### Rank 2. Stream-power landscape evolution, steady-state form (Cordonnier 2016; Schott 2023; Tzathas 2024), i.e. what F already is, plus improvements borrowed from the papers

- Sources: Cordonnier et al., "Large Scale Terrain Generation from Tectonic Uplift and Fluvial Erosion", Computer Graphics Forum 2016, https://diglib.eg.org/handle/10.1111/cgf12820 ; Schott, Paris, Fournier, Guerin, Galin, "Large-scale Terrain Authoring through Interactive Erosion Simulation", ACM TOG 42(5), 2023, https://dl.acm.org/doi/full/10.1145/3592787 (code https://github.com/H-Schott/StreamPowerErosion, MIT); Tzathas, Gailleton, Steer, Cordonnier, "Physically-based Analytical Erosion for fast Terrain Generation", CGF 43(2), 2024, https://diglib.eg.org/handle/10.1111/cgf15033 .
- What it gives: the real thing: dendritic valleys, concave channel profiles, hierarchy. F already realises the steady-state stream-power law (m=3/8, n=1) with a haloed block solve. Cordonnier builds a stream graph then blends landform kernels; Schott approximates drainage area and flow routing on GPU with a pit-escape routing and p-parameter multi-flow; Tzathas gives analytic time-dependent solutions via a multigrid-accelerated iterative process plus landslides/hillslope.
- Determinism and tile-locality: all three are global heightmap solvers (iterative, GPU float in Schott). Not usable as published. Only the F-style "per block with a halo" adaptation is OK, and that is what exists. Schott's GPU float path is incompatible with the bit-exact rule.
- Cost: whole-block cost class (F: 131 ms cold per 16 km block).
- Where it sits: it is M3. Ideas worth importing, not code: (1) spatially varying uplift U(x,y) (Cordonnier/Schott's main authoring handle) to cure the straight divide and the "combed" flanks, since F currently routes on a fixed 1.3x ramp plus 400 m fBm; (2) Tzathas' transient solution (time as a parameter) for a "young vs old range" knob; (3) multi-flow routing exponent p to soften single-direction D8 facets (angular facets are in F's recorded issues).
- Risk: low for (1) and (3) as tweaks to F; high for anything bigger. Note the F parameter search already shows thin margins (crest wander passed but thinner).
- Licence: papers are ideas; Schott code is MIT but we may not download it; we do not need it.
- Recommendation: keep F; spend no time re-surveying this family beyond the uplift-variation idea (cheap parameter experiment in the existing harness).

### Rank 3. Derivative-damped / slope-dependent fBm, ridged multifractal, domain warping (Musgrave 1989 / Texturing & Modeling; Quilez 2008+)

- Sources: Quilez link above; Musgrave, Kolb, Mace, "The synthesis and rendering of eroded fractal terrains", SIGGRAPH 1989 (listing at https://history.siggraph.org/?p=119354); Perlin-style ridged multifractal (Musgrave) is standard textbook material.
- Gives: correct spectral slope (the synthetic "alpine control" in the design doc is exactly a ridged multifractal with beta 2.14, and it passes slope/spectrum rows). Fails what the doc already proved: noise can pass spectrum and slope and still fail drainage (alpine control: 31% closed depressions, 2108 pits per 1000 km2, coherence 0.135, "rough noise, not a range").
- Determinism: pure arithmetic with polynomial interpolation: easy (quintic value noise has analytic derivatives, ~5x cost of plain noise per Quilez). Tile-local, pointwise, ~100-400 ns/sample for 6-8 octaves (estimate).
- Where it sits: it is the engine inside Rank 1, and a fallback "retained" modulator. As a standalone M3 replacement it repeats rejected B and the maze of the old ridge term.
- Licence: algorithms from 1989 papers and an unlicensed article; value noise unencumbered. Simplex noise patent (US 6,867,776) expired 2022-01-08 (Google Patents / Wikipedia via search); use value/gradient noise anyway.
- Recommendation: use as a component only.

### Rank 4. Orometry-based synthesis (Argudo, Galin, Paris, Gain, Guerin 2019)

- Source: "Orometry-based terrain analysis and synthesis", ACM TOG (SIGGRAPH Asia 2019), https://pubs.cs.uct.ac.za/id/eprint/1342/ , author page https://perso.liris.cnrs.fr/aparis/public_html/projects/argudo2019_Orometry.html . Note: there is no Argudo 2020 orometry paper that I could find; his 2020 SIGGRAPH Asia paper is "Simulation, Modeling and Authoring of Glaciers" (not applicable, global simulation).
- Gives: starts from a coarse elevation map (exactly our situation), builds a graph of peaks and saddles that obeys a target orometric distribution (peak counts by prominence/isolation), then derives a consistent river network and shapes valley slopes. This targets precisely our M4 weakness: R1 peak density fails on Selawyn (0.05 vs >= 8 per 1000 km2) because F's lattice scales with belt width.
- Determinism/locality: graph construction is over a region (not per-point). A per-cell deterministic peak/saddle seeding (Poisson-disk by hashed cell, as Dendry does) with halo would be local, but that is our design, not the paper's. Exact algorithm details and the code/data licence of the repository were NOT verifiable (page excerpts did not state them).
- Cost: unknown, likely graph + per-block solve similar to F.
- Where it sits: replaces the routing surface of F (the 8 km fBm base) with peak-seeded uplift/drainage seeds, i.e. an upstream change to F, not an alternative to it.
- Risk: high; no per-point formulation exists.
- Recommendation: steal one idea only: let a seeded, belt-width-independent peak/saddle set (rather than belt-width-scaled lattice) set F's routing surface, to get fixed peak density on wide belts (design decision (g)). Defer.

### Rank 5. Hydrology-first terrain (Genevaux et al. 2013) and Dendry (Gaillard et al. 2019)

- Sources: Genevaux, Galin, Guerin, Peytavie, Benes, "Terrain generation using procedural models based on hydrology", ACM TOG 32(4), 2013, https://www.cs.purdue.edu/homes/bbenes/papers/Genevaux13ToG.pdf ; Gaillard et al., "Dendry: a procedural model for dendritic patterns", I3D 2019, https://cs.purdue.edu/cgvlab/www/publications/Gaillard19I3D (code https://github.com/mgaillard/Noise).
- Gives: rivers first (hierarchical drainage graph over a domain, watersheds, river profiles), terrain by blending procedural terrain and river patches with carving operators. Dendry makes this a locally computable function. Per-point evaluation after the graph exists is supported by the paper (summary says local queries are possible; details of graph seeding NOT verified).
- Verdict: Dendry is the family of rejected A/A2 (the design doc names it as candidate A). Genevaux needs a bounded-domain graph; tiling it is its own research problem. Same group, same weakness: chosen channel geometry, not the solved flow, so walls look combed and coherence fails.
- Recommendation: do not retry.

### Rank 6. Minecraft-style continentalness / erosion / peaks-and-valleys splines

- Sources: Minecraft Wiki "Terrain features" https://minecraft.wiki/w/Terrain ; explainers (e.g. https://dawnosaur.substack.com/p/how-minecraft-generates-worlds-you ); Kniberg's talk (not fetched, not verified).
- Gives: control over where flat/rugged terrain sits via spline curves on a few noise fields; "peaks and valleys" is a folded noise (|noise| creases). Fully deterministic arithmetic, very cheap, tile-local.
- Fit: we already have a coarse continental and belt layer (that is what this replaces); the folded crease noise is the ridged-noise maze the design doc diagnoses. No drainage hierarchy.
- Licence: game code is proprietary; the technique (splines over noise) is an idea. Fine to reimplement; nothing to gain.
- Recommendation: skip for mountains.

### Rank 7. Wavelet noise / Gabor noise / Phasor noise as spectrum-and-orientation shaping

- Sources: Cook & DeRose, "Wavelet Noise" (Pixar, https://graphics.pixar.com/library/WaveletNoise); patent US 7,672,476 "Bandlimited noise for computer graphics" is listed as assigned to Pixar and reported as active in the search result (status not independently verified); Lagae et al., "Procedural noise using sparse Gabor convolution", ACM TOG 2009 (no patent surfaced in search); Tricard et al. "Procedural Phasor Noise" 2019 (not fetched; licence/patent status NOT verified).
- Fit: they control band-limits and anisotropy, which we get from the arithmetic design anyway; Gabor/Phasor cost is high (144-400 loops per sample for phasor per the phacelle article). Wavelet noise is patent-encumbered: avoid.
- Recommendation: skip.

### Rank 8. Interactive/GPU erosion sims (Schott 2023 etc.) as a baker for a reference field

Only useful offline to produce a positive control for the metrics (the repo already has an eroded control: `mountain-eroded-control-1`). Not usable at runtime: global, GPU float.

## 2. Summary table

| # | Method | Realism of ridge/valley | Bit-exact | Tile-local | Cost class | Replaces / augments | Risk | Licence |
|---|---|---|---|---|---|---|---|---|
| 1 | Gradient-aligned gully filter (Johansen 2026) | gullies+ridges, no guaranteed drainage | yes after sin/cos replacement | yes, pointwise | ~1-3 us (est.) | augments M5 / sub-2 km; maybe weak M3 | medium | own TS; avoid MPL/CC-NC code |
| 2 | Stream power (F + uplift variation) | best | yes (already) | block+halo | 131 ms/block cold | = M3 (tweak) | low | ideas only |
| 3 | Damped fBm / ridged multifractal | spectrum good, drainage bad | yes | yes | 0.1-0.4 us (est.) | component | low | free |
| 4 | Orometry (Argudo 2019) | peak-controlled | n/a as published | region graph | unknown | seed F's routing | high | code licence UNVERIFIED |
| 5 | Genevaux / Dendry | dendritic but combed | yes | with effort | medium | = rejected A | high | code on GitHub, licence not checked |
| 6 | Minecraft splines | none | yes | yes | tiny | coarse only | low | idea |
| 7 | Wavelet/Gabor/Phasor | spectral only | varies | yes | high | none | medium | Pixar patent on wavelet noise |
| 8 | Sim bakers | n/a | no | no | global | control only | - | MIT |

## 3. Single best route: "steal the idea, write our own TS"

Rune Johansen-style gradient-aligned gully filter, written clean-room in TypeScript, with:

- polynomial (quintic or Chebyshev-style) smooth wave in place of sin/cos; Math.sqrt only for the normalise step; hashing with Math.imul (as existing `hash()`); no pow/exp/atan2;
- input = F's carved height and its gradient (M5 already takes carvedXM/carvedYM at fixed +125 m offsets; keep fixed-step differences in absolute coordinates);
- output as `v <= 0`: delta - B(octaves, fade) where B is an analytic constant, so carved + v stays in [carved/2, carved], exactly the M5 contract, and the ROOM / upper-envelope reduction rules of the LOD contract need no edit;
- declared band: shortest wavelength ~250 m, longest ~2 km, so it drops out at the same levels M5 does (ROCK_DETAIL_MAX_EDGE_M).

Why this one: it is the only surveyed method that is pointwise, non-planet-specific, adds exactly the missing fine ridge/gully structure, and can be bolted onto an existing field with no change to F's drainage rows. Honest limit: it does not give drainage by itself (B proved that for the 2-16 km band), so it complements F; it does not replace it.

## 4. MVP experiment (3 steps, element-test style, fresh gate pool, constants frozen first)

Pool: use new seeds (e.g. 731001-731008) so the burnt pools 730201-08, 730301-08 and 730901-08 are not reused.

Step 1. Kernel element (unit, < 2 s, HARD):
- `src/mountain-gully-filter.ts` skeleton: stripe kernel + hash, no sin/cos, no pow.
- Fixed sample set (e.g. 4096 points at hashed positions): SHA-256 digest forward, reverse, child process; arithmetic audit (same audit as F with the existing negative-control style); analytic bound |delta| <= B holds on all samples; seam test: the same absolute point evaluated from two different origins/tile frames is Object.is-identical.
- Negative controls (must fail): a variant using Math.sin (digest differs under a mutated-rounding stub or flagged by the audit), tile-local coordinates (seam test fails), bound x0.9 (bound test fails), shared hash across octaves (visible lattice rhythm: periodicity peak in the spectrum / autocorrelation at pivot spacing).
- Cost row is INFO only (do not run during measurement runs).

Step 2. Band-alone metrics on the synthetic ramp, reusing the M3 rows (INFO first, gate second):
- Compare four fields on the same 8 seeds, 48 km rasters at 125 m: (a) F alone (positive), (b) F + filter (candidate), (c) filter on the bare tent envelope with no F (tests whether it can stand in for M3), (d) rejected B / isotropic ridged noise (negative; must fail pits025, fill10 and coherence as before).
- Pre-registered hypotheses: H1 pits025 <= 50 and fill10 <= 0.05 for (b) (the main risk: gully stops mid-slope); H2 beta500mTo8km in 2.0-2.6 for (b) and R3' fine beta >= 2.5 (toward alpine 2.617); H3 slope125 p50 >= 20 and p90 <= 48.4 for (b); H4 axis coherence unchanged within the calibrated 0.14-0.64. Report (c) as the answer to "could the filter replace M3": expectation from the B result is NO on pits and fill, which would confirm F is still needed.
- Add the missing visual-control pair: hillshade strip of (b) at 48 km and 192 km, and a D8 flow map, for coordinator inspection (Luna advisory only).

Step 3. LOD / ROOM / M5 rows on the hybrid:
- Re-run the M5 gate (R1e, R2, R3', R4, R5, R6) with the filter in place of benches+gullies; the old M5 as baseline.
- Frame check: the carved child must satisfy parent - ROOM <= child <= parent + 0.05 m on the existing lod-coarse-frame sites; filter is exactly 0 above ROCK_DETAIL_MAX_EDGE_M, so levels above the cut must be bit-identical to now (expect 0 digest changes on coarse levels, negative control: filter enabled at the first uncarved level breaks the frame row).
- Cost row on the CPU-quiet slot: ns per in-massif sample vs the 214 ns M5 budget (M5 today 149.5 ns). If the filter exceeds it, evaluate the cheaper variants (2 octaves; kernel table) before any other change.
- Go/no-go: go only if R1-R6 pass with margins >= today's M5 margins and the cost fits; otherwise stop at step 2 (no wiring).

## 5. Could not verify / caveats

- Per-sample cost numbers for the filter are my estimates, not measurements.
- Johansen's exact octave count, fade formula and amplitude bound were not extractable from the page via the fetch tool; the clean-room implementation will need its own derivation of B. Check the post's source/Shadertoy text when implementing, for algorithm only.
- The MPL 2.0 file-level scope and the Shadertoy default licence (CC BY-NC-SA 3.0) are stated from memory / the post; legal certainty is not claimed. No patent clearance is claimed for any item, only "none surfaced".
- Schott 2023's approximate drainage-area method, Tzathas 2024's exact solver and locality, and Argudo 2019's code licence and per-point formulation could not be read (403 / oversized PDF / summary-only pages).
- Genevaux 2013 per-point locality is from a partial PDF summary.
- Whether the filter creates closed pits at 125 m is a prediction to be tested (step 2, H1).
- The ECMAScript statement about Math.sin etc. is from knowledge of the spec, not fetched.

## Sources

- https://blog.runevision.com/2026/03/ (Fast and Gorgeous / Advanced Terrain Erosion Filter, 2026)
- https://blog.runevision.com/2026/01/ (Phacelle - Cheap Directional Noise, 2026)
- https://forum.godotengine.org/t/fast-and-gorgeous-erosion-filter/136436 (Godot port, 2026)
- http://iquilezles.org/articles/morenoise/ (Value Noise Derivatives, Quilez)
- https://diglib.eg.org/handle/10.1111/cgf15033 (Tzathas et al. 2024)
- https://dl.acm.org/doi/full/10.1145/3592787 and https://github.com/H-Schott/StreamPowerErosion (Schott et al. 2023; MIT)
- https://diglib.eg.org/handle/10.1111/cgf12820 (Cordonnier et al. 2016)
- https://pubs.cs.uct.ac.za/id/eprint/1342/ , https://perso.liris.cnrs.fr/aparis/public_html/projects/argudo2019_Orometry.html (Argudo et al. 2019)
- https://www.cs.purdue.edu/homes/bbenes/papers/Genevaux13ToG.pdf (Genevaux et al. 2013)
- https://cs.purdue.edu/cgvlab/www/publications/Gaillard19I3D , https://github.com/mgaillard/Noise (Dendry 2019)
- https://graphics.pixar.com/library/WaveletNoise , https://www.9235.net/patent/US7672476B2.html (wavelet noise, Pixar patent)
- https://patents.google.com/patent/US6867776 (simplex noise patent, expired 2022-01-08)
- https://minecraft.wiki/w/Terrain , https://history.siggraph.org/?p=119354 (Musgrave et al. 1989)
