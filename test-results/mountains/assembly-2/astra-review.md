1. HIGH — src/mountain-envelope.ts:13, src/mountain-assembly.ts:49–58: The massif cap changes the requested design. U is zero beyond ±48 km, so only strip 0 can ever reach M3. This produces one 96 km-wide carving strip, not fixed-width carving tiled across wide belts. Selawyn’s outer belt retains main’s ridges. MASSIF_IS_ONE_STRIP describes this honestly; attributing it to decisions (e)+(g) does not. Suggested fix: explicitly present the narrowed massif as a design deviation, or implement carving across the intended wide-belt footprint with seam validation.

2. HIGH — scripts/mountain-assembly-summits.mjs:37,58–62,102–105; tests/terrain-mountains-assembly.test.mjs:91–104: R1’s measurement domain and acceptance gate changed. The mask uses the capped massif width, and the final gate explicitly discards axis/flank R1 failures. The recorded Raiva flank density is 7.118, while whole-core density is 8.594. The latter is a legitimate pooled measurement of the narrowed massif core, but does not establish that the earlier flank requirement or original wide-belt core passes. The larger raster also changes prominence censoring at its borders.

   Suggested fix: retain the earlier R1 results as binding until the revised domain/method is explicitly accepted. Raiva is a sensible binding synthetic case because its tau is lowest, but this test uses synthetic seeds, mainTerm=0 and landFactor=1; it is not an assembled-terrain acceptance test.

3. MEDIUM — scripts/mountain-render-envelope.mjs:57, affected by src/mountain-envelope.ts:64: An existing caller still supplies four arguments to the now-five-argument composition function. envelopeM becomes undefined and composed land heights become NaN. I reproduced this with a direct call. This regression exists in the unwired state.

   Suggested fix: insert belt.axisDistanceM before belt.halfWidthM and check the renderer’s composed heights are finite.

4. MEDIUM — scripts/mountain-assembly-cost.mjs:34–53: The weighted resident overhead averages percentage overheads by sample share. That is generally incorrect when main’s inside/outside sample costs differ. Use:
   (share × branchInside + (1−share) × branchOutside) /
   (share × mainInside + (1−share) × mainOutside) − 1.

   The axis-centred regions also do not represent every in-massif location. Fresh samplers do not clear M3’s module-global cache, so subsequent “cold” measurements are not strictly cold; warmRebuilds is reported but never enforced. Suggested fix: correct the weighting, validate residency, separate cold runs into fresh processes, and reject unwired checkouts when measuring assembly overhead.

5. MEDIUM — package.json:10; tests/terrain-mountains-assembly.test.mjs:35–104: The new assembly test is absent from the explicit npm test list. Its identity and R1 checks therefore do not run through the normal full-suite command.

   Suggested fix: register it. First reorder the bound sweep at lines 66–69 to reuse each sampled carving block across parameter combinations; that test alone took 315.8 seconds. The negative controls at lines 84–85 genuinely exercise the forbidden-syntax regex, but there are no corresponding identity or assembly-R1 mutation controls. Add controls demonstrating rejection of changed heights/colours/ocean flags and disabled carving.

6. LOW — tests/lod-consistency.test.mjs:110–113; tests/helpers/lod-frozen-selection.mjs:3–8: Freezing the retention selection extends the literal scope of (e), which specifies the stratified selection. It preserves today’s directions and thresholds, but changes future retention coverage: these fixed points may cease to represent live snow/forest edges.

   Suggested fix: document this extension explicitly, or retain live retention coverage alongside the frozen baseline. It is not a present-day re-pin or threshold loosening.

7. LOW — src/mountain-layout.ts:40–45: The thetaOf accuracy comment is wrong. At u=tan(.45), the reduced argument is approximately .228875, not ≤.12; the error is approximately 1.392e−9 radians, or 8.35 mm at R=6000 km, not below 0.1 mm.

   Suggested fix: correct the stated bound or extend the series. The polynomial is monotone over the supported interval, and the centimetre-scale implementation is otherwise sound.

The remaining checks support these conclusions:

- src/mountain-envelope.ts:35–66 returns main bit-exactly, including signed zero, outside the massif when supplied its matching envelope. For nonnegative main and valid inputs, the composition is nonnegative and bounded by max(main, analytic envelope maximum). It is a convex combination with an effective envelope endpoint, not literally a convex blend with the already-weighted U. Both weight and U vanish continuously at the massif edge and as belt approaches zero. The composition is C1 at the spatial fade boundaries; the envelope alone has C2 support. Decision (f) is respected.
- The cap protects terrain outside the massif, but cannot generally guarantee unchanged snowline/treeline boundaries inside it. The saved wired report records 96/96 LOD cells passing; that supports the sampled contracts, not universal boundary preservation.
- src/mountain-layout.ts:91,215–226 preserves existing calculations. I compared all legacy fields against main at 4,096 directions per world: exact agreement on all four worlds. Keeping orogen-layout-1 is reasonable.
- src/mountain-assembly.ts:28–38 implements the stated strip indexing and deterministic seed mixing correctly. U+C remains nonnegative. With a0≤0 and an artificially positive belt, lines 49–51 return attenuated main, not necessarily unchanged main. Normal layout sampling returns belt=0 there, so this is not a wired coastline defect.
- Both stratified fixtures and all 32 retention directions exactly reproduce main’s picks. No SHIPPED_CEILINGS value changed.
- The identity literals reproduce main and are meaningful regression pins. The recording helper supports baseline generation, although the files alone cannot establish that recording happened “first.” In the unwired state, these tests verify main against its baseline; they do not prove wiring is present.

Deferring wiring is justified. The supplied 335 seconds / 2,314 builds implies roughly 145 ms per build, consistent with M3’s large haloed drainage solve. I did not rerun that benchmark; the available cost.log is empty. Exact precomputed/persisted Float32 blocks, prefetching and batching can preserve values, but larger caches alone cannot make first-touch sparse misses cheap. There is no obvious local shortcut through the globally coupled solve that demonstrably preserves its values.

All 26 permitted tests passed in 323.2 seconds. terrain.ts and the restored version tests have no diff against main. No files were edited.

MERGE-AFTER-FIXES