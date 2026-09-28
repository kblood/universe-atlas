# Opus 5.5 paired 390 m evidence follow-up

Model: claude-opus-5-5
Provider: firstParty
Review run ID: f1c85d0d-d114-4127-942f-d2289b0cf34c

# Follow-up: paired 390 m default vs offline-mip capture

**Bottom line:** the core of my earlier recommendation still stands. Mip choice changes only the middle trees and leaves the far proxy untouched, so mips alone can't close the mismatch. The evidence does make me correct two parts of the design and one earlier statement.

## Provenance and scope (observed)

- **Same pose and date.** Both mid states have date `…086296300000`, `positionDeltaM: 0`, `headingDelta` about 7e-16, `dateEqual: true`, clearance 390.58 m and both lighting states active. The close capture in the same report is at a different date (`…073667100000`).
- **Same counts, not the same IDs.** Both states submitted branching `[0,250]` and spire `[0,369]`, visible `[0,619]`. Batch 0 is 0 in both, so every middle tree is LOD1. `samplesDefault` and `samplesOffline` list different IDs, so the report proves equal counts, not identical ID sets.
- **Mips.** Default has `foliageMipmaps: null` for both families. Offline uses sidecars for both: 5,592,064 B each, with base coverage Oak 0.190 and Pine 0.046.
- **Source hashes.** `planet-forest.ts` is `f877…` and `planet-canopy.ts` is `4920…`. These match the earlier report, not the `d9fa…`/`9c10…` snapshots I reviewed. `tree-asset.ts` `7427…` matches.
  - `forest-impostor.ts`, `forest-tree-catalogue.ts` and `tree-species-recipe.ts` are not hashed, so the far renderer's source is not pinned by this report.
  - `sourceIntegrity.unchanged: true`, `glError: 0`, no errors, RTX 5090 over ANGLE D3D11.
  - I found no git revision field. Two multi-MB lines (816 and 1553) were too large to read, and I did not hash the PNGs.

## What the images show (observed)

- **Upper half.** The two frames look identical there: bright yellow-green, bulky, rounded legacy lollipops. The report's pixel diff agrees: only 1.8% of pixels changed by more than 3 (max 160).
- **Lower middle ring, default.** Almost every tree is a bare grey-brown twig figure.
- **Lower middle ring, offline.** Many trees now have small, dark-green, open crowns, but a large share are still bare sticks.
- **Boundary.** It is sharp and curves toward the camera at the left and right edges. Far crowns just beyond it look roughly 2–3× wider and much brighter than the middle crowns just inside it.

The acceptance agent's description is accurate, with one qualification: the offline mips restore foliage on only part of the middle population.

## What this proves, and what it doesn't

- **Proven for this pose:** default mips lose most middle-tree foliage at 390 m, and the offline sidecars recover a visible amount. The mip change has no effect on the far proxy. So the remaining contrast in size, brightness and opaque rounded form is between the legacy proxy and LOD1 families, whichever mip path is used.
- **Inference:** the trees that stay bare are probably mostly Pine, because of their 4.6% coverage and the 369:250 ratio. I can't assign family per tree from pixels.
- **Not proven:** how much of the gap is geometry versus colour, the per-ID continuity at the 550–600 m handoff, or crown-size numbers. No near/far pair of the same ID appears in the frame.

## Corrections to my earlier review

1. **Old 390 m capture.** That frame faced the horizon and showed only far proxies; no middle-ring boundary was in view. Calling it "input evidence of the mismatch" overstated it. It showed only what the far proxy looks like.
2. **LOD choice.** At these distances the near side is LOD1. Profile extraction should read the LOD1 GLB, or assert that LOD0 and LOD1 foliage envelopes agree.
3. **Envelope size.** I proposed one conservative 90th-percentile envelope as both the drawn shape and the bound. That would produce exactly the oversized, opaque crowns seen here. Keep the conservative envelope for the quad, `observeClose` and culling. Size the drawn lobes and cones so their projected opaque area matches family foliage coverage.

## Changes to the minimal recommendation

- **Keep:** the shared `farPresentation` predicate, the `parameters.z` code, bounded retagging and the `canHandoff` version and height checks.
- **Add:** family codes are emitted only when that family's offline sidecar is loaded. Without it, the LOD1 near side is bare, and a fitted far crown would mismatch it.
- **Test 9:** run it with offline mips on, at the same pose/date, and include the handoff band with per-ID pairs and hashed `forest-impostor.ts` source.
- **Pine:** it remains the weakest case. A solid cone against a 4.6%-coverage LOD1 crown will still read denser. This is still unproven.
