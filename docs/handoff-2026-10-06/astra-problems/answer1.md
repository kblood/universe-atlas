Reviewed main at `1dbf2c2`, read-only. No tests, builds, browsers or network used; the other worktree was ignored. `decisions/mountains` no longer exists as a branch; its merged commit `2b04fb0` contains the same decisions document as HEAD.

1. **Finding:** The element decomposition is useful engineering, but the acceptance criteria increasingly validate the chosen construction rather than mountain realism. Calibration repairs genuine measurement faults; it does not provide independent validation.

   **Evidence:** [Calibration document](/C:/LLM/IWSDK/universe-atlas/docs/mountain-m3-calibration-v1.md:99) admits candidate values were seen before the “pre-registered” rule was written. Its positive controls share the straight-strip/stream-power assumptions of the implementation. I count **8 of 12** steady-state positives above the unchanged 0.05 fill threshold in lines 64–75; line 105 incorrectly says six. The original eroded control also fails four shape rows. F’s parameter search explicitly selected against the same eight seeds and thresholds ([F report, lines 111–127](/C:/LLM/IWSDK/universe-atlas/docs/mountain-carving-f-v1.md:111)). The historical summaries show useful rejection of A/B/C, but repeated rejection and tuning are training evidence, not held-out evidence.

   **Severity:** high

   **Recommended action:** Freeze the current definitions, then reserve unseen seeds, curved belts, belt ends and independently selected terrain examples for validation. Separate immutable correctness checks—determinism, bounds, exclusions—from empirical realism targets. Correct the fill-positive count.

   **Could NOT verify:** Generalisation beyond the reported corpus, or agreement with independently measured real terrain; no comparable DEM validation is supplied.

2. **Finding:** Freezing selection is sound for regression testing; narrowing mountains to avoid the frozen selection is over-fitting. “No pin loosened” conceals a substantial loss of coverage.

   **Evidence:** [Assembly, lines 65–102](/C:/LLM/IWSDK/universe-atlas/docs/mountains-assembly-2026-10-05.md:65) explicitly derives the **48 km** massif cap partly from a protected child tile **58 km** from the axis, with **zero spare cells**. Lines 179–181 state that **no frozen pin tile touches a massif**. I counted **96 rows** in each assembly, step-G and assembly-2 LOD summary; passing them does not establish mountain LOD quality. [Decisions, lines 216–225](/C:/LLM/IWSDK/universe-atlas/docs/mountains-opus-decisions-2026-10-05.md:216) adds mountain tiles only as INFO. The original design instead requires every M1–M4 threshold on the composed field ([lines 554–564](/C:/LLM/IWSDK/universe-atlas/docs/mountains-design-2026-10-04.md:554)).

   **Severity:** high

   **Recommended action:** Keep the frozen regression set, but require a second, geometry-selected massif set to satisfy agreed height, class and transition criteria before wiring merges. Include flanks and ends. Do not choose terrain extent to preserve an unrelated snowline snapshot.

   **Could NOT verify:** Mountain-tile compliance. The reported real-field summit measurements cover **32 on-axis sites**, but do not replace full M1–M4 and production LOD acceptance.

3. **Finding:** **39 summits/1,000 km² is suspiciously dense relative to your controls, but the evidence does not establish that it is physically impossible.** Calling the lower-bound pass a realism success is unjustified.

   **Evidence:** [M4 raw report](/C:/LLM/IWSDK/universe-atlas/test-results/mountains/M4/report.json:7358) records **626 peaks / 16,025.625 km² = 39.062**. That is approximately one qualifying summit per **25.6 km²**, or a **5.1 km square-spacing equivalent**, not measured nearest-neighbour spacing. The eroded controls yield **1.727–10.147**, making the fixture **3.85–22.6 times** denser; the proposed ceiling of **25** remains unenforced ([summit document, lines 218–254](/C:/LLM/IWSDK/universe-atlas/docs/mountain-summits-v1.md:218)). The actual assembled on-axis samples remain dense: **44.80, 35.78, 20.08, 29.20**, so this is not solely a fixture artefact.

   Real-world figures I recall, without verification: the Alps’ standard UIAA list has **82 four-thousanders**—high confidence—and the conventional Pyrenean list has **212 three-thousand-metre summits**, including secondary summits—moderate confidence. **Neither is a P300 inventory**, and neither divided by whole-range area is comparable to this selected massif-core statistic. I do not know a defensible, matched P300 density for those ranges from memory. A sceptic should reject an invented “Earth normal” number as firmly as the present realism claim.

   **Severity:** medium

   **Recommended action:** Compare prominence survival curves—counts above 100, 300, 600 and 1,000 m—plus spacing distributions on identically sampled, identically masked real and generated terrain. Use padded rasters with an interior scoring area to limit border-censoring bias. Do not simply activate the arbitrary 25 ceiling.

   **Could NOT verify:** Real-world P300 densities, catalogue completeness or matched-resolution comparisons under the no-network constraint.

4. **Finding:** T1/T2 address genuine waste, but rejecting precomputation wholesale is unsupported. A coarse, regenerable belt/uplift field deserves comparison. **Cold streaming is the first major headset risk.**

   **Evidence:** [Assembly cost table](/C:/LLM/IWSDK/universe-atlas/docs/mountains-assembly-2026-10-05.md:223) reports **+108–156% warm overhead** and **335–461 seconds** for Maithea’s six L0 tiles versus **192 ms**. T1 alone is projected to leave **+15.6%**, so T2 is necessary under that design ([decisions, lines 103–111](/C:/LLM/IWSDK/universe-atlas/docs/mountains-opus-decisions-2026-10-05.md:103)). However, the rejected bake is **72–91 MB of full-resolution drainage blocks per major belt**, not a coarse uplift field.

   For comparison, calculated storage for a six-face **512²** map is **3 MiB per uint16 channel**, or **6 MiB per Float32 channel**; T1’s bitset alone is **192 KiB**. These are storage calculations, not measured performance. At Maithea’s radius, nominal face-centre spacing is roughly **20 km**, suitable only for broad structure, not 200 m carving.

   **Severity:** high

   **Recommended action:** Compare the planned solver with a CPU-resident macrofield cache plus deterministic local detail. Generate fixed global samples from seed and version; define quantisation, interpolation and face-edge ownership explicitly. Cache eviction must affect cost only. Keep an exact analytic boundary guard where outside-massif identity matters. Measure cold construction, lookup cost, memory per worker and travelling-cache misses before choosing.

   This satisfies seed/position regenerability if the bake is a reproducible cache rather than external authoritative data. It changes terrain values if interpolated, so requires a versioned change. It also does **not** eliminate M3’s cold solves by itself.

   **Could NOT verify:** Either design’s headset performance, achievable bake resolution, or T1/T2 speedups. Existing timings were not all CPU-quiet. A two-second worker tile limit is not evidence of acceptable visible streaming latency.

5. **Finding:** T3’s spectral justification is wrong, and its implementation plan omits a critical parent-sampling detail. **LOD transitions and seams are the second major headset risk.**

   **Evidence:** [Decisions, lines 79–101](/C:/LLM/IWSDK/universe-atlas/docs/mountains-opus-decisions-2026-10-05.md:79) treats **16 km** as carving’s longest wavelength and switches carving completely off above the cut. But [`CARVING_BANDS`](/C:/LLM/IWSDK/universe-atlas/src/mountain-carving.ts:51) is inherited metadata; source search finds no use in F’s solve. The actual correction is **−U × (1−retained)**. Its negative mean and envelope modulation introduce broad components; it is not a zero-mean, band-limited detail layer.

   Also, [`buildTile`](/C:/LLM/IWSDK/universe-atlas/src/planet-tiles.ts:130) currently uses one sampler for child and parent reconstruction, with caches shared when no river is active. Lines 245–254 reconstruct parent vertices through that sampler. Merely passing `tile.level`, as T3 specifies, would evaluate the parent using the child’s carving policy at the cut. Finally, F’s seam claim rests on **0/280** observed disagreements at halo 192, explicitly **not a proof** ([F report, lines 51–68](/C:/LLM/IWSDK/universe-atlas/docs/mountain-carving-f-v1.md:51)).

   **Severity:** high

   **Recommended action:** Make parent sampling use the parent’s level and separate cache identities accordingly. Gate parent-endpoint equality and cut-level transition error on actual massif tiles. Measure carving’s mean and long-wave spectrum; consider a cheap coarse mean-carve field instead of erasing all carving. Distinguish same-level block seams from cross-LOD seams.

   **Could NOT verify:** T3 is not implemented on reviewed main. Pointwise uncarved ≥ carved does not prove that the interpolated coarse mesh bounds the fine surface everywhere, or that transition displacement is acceptable.

6. **Finding:** Making Luna advisory is correct; the current system still lacks an independent appearance judgement. “Physically eroded” does not automatically mean “known-good image.” **Unconvincing appearance is the third major headset risk.**

   **Evidence:** [Calibration result](/C:/LLM/IWSDK/universe-atlas/test-results/mountains/luna-calibration/calibration-result.json:1) reports **3/6 positives passed**, **6/6 negatives rejected**, **7/12 unanimous**, unsigned labels and no app-path calibration. [F’s visual evidence](/C:/LLM/IWSDK/universe-atlas/docs/mountain-carving-f-v1.md:156) shows that rewording increased positive passes **2/4 → 3/4** while negative rejection fell **5/5 → 1/5**. Worse, lines 175–178 establish that the straight divide survives the smooth M2 envelope: **17/20 stations** have their highest point within **375 m** of the axis. That contradicts the earlier explanation blaming the tent kink. The latest wired assembly has **no app capture** ([assembly, lines 259–266](/C:/LLM/IWSDK/universe-atlas/docs/mountains-assembly-2026-10-05.md:259)).

   **Severity:** high

   **Recommended action:** Keep Luna as a diagnostic aid and use blinded, human-labelled A/B pairs at matched scale, lighting and camera pose. Add a small complementary measurement set:

   - Directional spectra and autocorrelation for combing and periodic structure; spectral slope alone already admits rough noise.
   - Basin hypsometric integral and elevation distributions, interpreted by terrain type rather than one universal target.
   - Flow-accumulation distributions, drainage density, branching and slope–area relationships.
   - Geomorphon class proportions at several physical radii for excessive ridges, spurs or pits.
   - Detrended height/normal patch correlation or SSIM across offsets for repetition; identical lighting alone must not trigger failure.

   Calibrate these on held-out human-labelled examples, not another sweep over F. Make one wired orbit-to-ground sequence reviewable before treating appearance as settled.

   **Could NOT verify:** Human preference, headset readability, motion artefacts, snow/rock contrast or haze interaction. Repeated calls to the same LLM do not supply independent ground truth.

**VERDICT:**

VERDICT (a): The decomposition is sound, but the present thresholds and protected sampling locations are over-fitted; 39 P300 summits/1,000 km² remains an unexplained density, not validated realism.

VERDICT (b): T1/T2/T4 are sensible, but a regenerable coarse macrofield deserves comparison and T3 needs a defensible reduction plus correct parent-level sampling.

VERDICT (c): Visual-advisory policy is adequate containment for an unreliable judge, but inadequate appearance validation without human-labelled comparisons and independent structural metrics.

VERDICT (d): The three biggest risks are cold-streaming stalls, incorrect or conspicuous LOD transitions, and mountains that pass synthetic metrics yet still look artificial in the headset.