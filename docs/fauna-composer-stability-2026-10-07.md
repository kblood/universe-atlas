# Fauna composer stability (2026-10-07)

Task T2 of the 2026-10-07 parallel round (decided by Fable 5.1 on Kasper's instruction). Branch
`fauna/composer-stability` from main 5450d9d. It addresses the two OPEN composer determinism findings in
`README.md` ("Four engines are not all equal" and "The trunked-centipede skin record moves under a 1-ULP nudge").

## Hand-off header

- **Verdict:** the 1-ULP trunked-centipede flip is traced, fixed and committed (byte-identical on every real engine; no
  repin). The WebKit midline-ocellus fix is implemented and verified but **withheld**: it hits the stop condition
  "more than ~5% of skin-4 link fixtures drift" (2 of 28 = 7.1%). It is ready to apply (Appendix A) once Fable or the
  coordinator accepts the drift. Both fixes are in `src/fauna-composer-mesh.ts` only.
  **Update 2026-10-07:** accepted under D2 and applied on `fauna/ocellus-seam`; four engines equal (see "Decision").
- **Commits:** see the final report (`git log main..fauna/composer-stability`).
- **NOT run:** `test:full` (coordinator, on main after merge); `npm test` as a whole (the affected and fauna sets were
  run instead); a cross-engine compare of the committed tip alone (the one permitted compare ran with the withheld
  ocellus package applied, see "Cross-engine compare").
- **needs:** see the end of this document.

## Finding 1: trunked-centipede skin-arrays under a 1-ULP nudge (fixed)

**Reproduction.** A probe drove the golden perturbation worker exactly as `tests/golden/perturbation.test.mjs` does (fresh
worker, every platform section in the same call order) and captured the raw `trunked-centipede` skin. Under the nudge,
49 vertices became **NaN** in positions and colours (294 float components, every one crossing the 1e-6 grid). The
earlier standalone probe missed it because the nudge sign alternates with the global call count: only the golden run's
call order nudged the decisive call upward. Bisecting by function: nudging `Math.pow` alone reproduces it; the
vertices map to the `proboscis ears` part (the rim ring of each ear and the cap over it).

**Root cause.** `proboscisEar` (`src/fauna-composer-mesh.ts`) builds the ear outline from
`Math.pow(Math.sin(Math.PI * x), p)` with fractional `p` (0.6, 0.7, 0.8). For the lower lobe `x = Math.pow(f, 0.75)`, and
at the rim station `f = 1`. Every libm returns `pow(1, 0.75) = 1` exactly and `sin(Math.PI) = +1.22e-16`, so the real
engines all agree. But ECMA-262 21.3.2 leaves `pow(1, y)` implementation-approximated, and the perturbation test
nudges it: one ulp above 1, `Math.PI * x` passes pi, the sine is a hair below 0, and `pow(negative, 0.8)` is NaN. The
factor `max(0, 1 - f^6)` that should zero the term is ~0, and `NaN * 0` is NaN: the rim ring is NaN.

It is a sign test on a transcendental near 0, not a quantisation-grid crossing, which is why the earlier "three midline
vertices at z = +-1e-17" lead went nowhere (those three still move by ~1e-17 and quantise to 0 either way).

**Fix.** The sine is clamped at 0 before the power (`arch(x, p) = pow(max(0, sin(pi x)), p)`) for all three ear
profile terms. Where the sine is not negative the value is bit-identical, so every unperturbed build is byte-identical.

**Impact (Node, main 5450d9d vs the branch, every pinned or listed specimen):**

| Set | Changed |
|---|---|
| `composer-skin4-links.json` (28 texts) | 0 |
| `composer-eye-catalogue-links.json` (30) | 0 |
| `tests/fauna-face-specimens.json` (71) | 0 |
| presets (12) | 0 |
| golden random seeds (4) | 0 |

No seed moved, so no fixture or golden repin is needed and the skin version stays `fauna-composer-skin-4`.

**Proof.** With the `fauna:` entry temporarily removed from `GOLDEN_FLIP_FINDINGS` (uncommitted; `tests/golden/*` is
coordinator-owned): branch `fauna: 625 records, golden flips 0, exact flips 345` and the test passes; the same edit on the
old code fails with `fauna: 625 records, golden flips 1, exact flips 345`. The remaining exact flips are the recorded
EXACT finding (rig and rings use raw Math trig).

**Regression test.** `tests/fauna-composer-mesh-stability.test.mjs` (new; needs registration in `npm test`) drives the
composer in-process, so it does not depend on the golden worker's call order:
- the trunked centipede under six nudge modes (`pow(1, y)` one ulp above / below 1; every transcendental alternating
  from + and from -; all +1 ulp; all -1 ulp): every value finite, every float on the golden 1e-6 grid and every integer
  array identical to the unperturbed build;
- a live-nudge control (the `pow(1, y)` nudge is reached while building the centipede);
- every preset and golden random seed builds finite skins with `pow(1, y)` one ulp off.
On the old code the first and third tests fail (`pow(1, y) one ulp above 1: non-finite skin values`, `positions[8622]`
onward, i.e. vertex 2874).

## Finding 2: the WebKit midline-ocellus seam tie (fix ready, withheld by a stop condition)

**Cause (traced 2026-10-04, re-confirmed here).** The middle of the three insect ocelli has its site and its seating
ray (`up = normalize(0.35, 1, 0)`) in the head's mirror plane z = 0. `nearestExit` then finds two exit hits with the
same `t`, on the two seam triangles (normal z -0.073 / +0.078). Which one wins depends on a 1-ulp difference in the
site: WebKit 26.5 picks the other triangle than Node/Chromium/Firefox, so the lens normal flips by ~0.15 rad and the 8
ocellus vertices move up to 0.42 mm (golden `faunaKnownUnstable`, GOLDEN-FAUNA-2).

**New evidence.** Node reproduces the flip in-process: under the "every transcendental, alternating from +" nudge,
GOLDEN-FAUNA-2's ocellus vertices move (`positions[9812]: -0.0000914767 -> 0.0000975481`). The golden worker's call order
happens not to flip it, which is why the perturbation test never listed it. On main the ocellus is not even
mirror-symmetric in Node: its worst mirror mismatch is 0.435 mm.

**Fix (the trialled patch, evaluated rather than re-invented).** `test-results/round2-2026-10-04/golden-ext/composer-patch-trial/`
held a patch that made all four engines equal before EC4. It is applied as a named helper, `seamNormal`, used only for
the z = 0 ocellus: every exit within 1e-9 of the chosen crossing (`SEAM_TIE`; engine noise on t is ~1e-17, a head
triangle >= ~1e-4) is summed in triangle-index order (not t order, which is what differs between engines) and the
lateral component is dropped. With it the midline ocellus is **exactly** mirror-symmetric (worst mismatch 0, the two
axis vertices at z = 0 exactly) and GOLDEN-FAUNA-2 holds the golden grid under all six nudge modes.

**Impact (Node, main vs main + the package):** only specimens with insect ocelli move, 8 vertices each, positions only
(index, skinIndex, skinWeight, colours and gloss identical):

| Specimen | Set | Max vertex displacement |
|---|---|---|
| `v1*layout_biped*...head_mandibles*...colorSeed_4293` | skin-4 links | 0.750 mm |
| `v1*layout_sprawled*...head_mandibles*...colorSeed_1258` | skin-4 links | 0.266 mm |
| `odd-insect-bird` | eye-catalogue links, face specimens | 0.044 mm |
| `wild-composer-43-mandibles-trunk` | face specimens (not hash-pinned) | 0.386 mm |
| GOLDEN-FAUNA-2 | golden `faunaKnownUnstable` | 0.218 mm |

Presets 0 of 12, the other golden seeds 0 of 3; the golden `fauna` key is unchanged.

**Stop condition.** 2 of 28 skin-4 links drift = 7.1%, above the brief's "~5%" bound, so the package is not committed.
The measured change is the opposite of a look change (8 vertices, at most 0.75 mm, symmetric instead of tilted), and
no recipe or vocabulary change is involved, but the decision belongs to Fable / the coordinator.

**If accepted** (Appendix A applies cleanly on the branch tip):
- `src/fauna-composer-mesh.ts`: `seamNormal` + `SEAM_TIE` (module-private, so the creature-core export snapshot is
  unchanged) and the ocellus call site.
- `tests/fauna-composer-mesh-stability.test.mjs`: the insect under the six nudge modes and the exact mirror-symmetry
  test (both fail on the committed tip).
- `tests/fixtures/composer-skin4-links.json`: repinned in place (skin-4 is unreleased; deployed is
  `fauna-preview-20261002-01`). Each drifted entry keeps every history field, gets `skinPreStability` and a
  `stabilityDrift` record (reason, before/after skin and gloss hashes, vertices moved, max displacement, unchanged
  arrays), and the file gets `repinnedAtStability` (changed 2 of 28).
- Coordinator-owned follow-ups: repin `odd-insect-bird` in `composer-eye-catalogue-links.json`; golden
  `faunaKnownUnstable` repin; remove the WebKit entry from `KNOWN_ENGINE_MISMATCHES` and `FAUNA_KNOWN_UNSTABLE`
  (and fold GOLDEN-FAUNA-2 back into the `fauna` key, which changes that key's digest).

With the package applied, the fauna tests run 184 tests: 183 pass, and the one failure is the `odd-insect-bird` catalogue pin.

## Version recommendation

- **Finding 1:** no version change. The bytes are identical on every engine whose `pow(1, y)` is exact (all of them);
  only an approximating engine changes, and there it changes from NaN to the correct value.
- **Finding 2 (if accepted):** repin skin-4 **in place**, as EC4 did, rather than open skin-5: skin-4 is unreleased, the
  change is 8 vertices per affected creature, and the old pins stay recorded in `stabilityDrift`. Recipe links v1-v4
  decode exactly as before (no recipe or vocabulary change; the vocabulary stays append-only).

## Cross-engine compare

One compare, without `--update`, ran 2026-10-07 18:57-19:04 under the exclusive test slot
(`node tests/helpers/test-slot.mjs -- node tests/golden/run-cross-engine.mjs --report ... --write-node ...`). The runner
takes the GPU lock `C:/LLM/IWSDK/.gpu-browser-lock` itself, one engine per hold (`withGpuLock`, line 215), so the order
was slot -> GPU and no manual `mkdir` was made (a manual one would have blocked the runner's own acquisition). Both
locks were gone afterwards. Exit 1.

**It ran on the branch tip plus the withheld ocellus package (Appendix A), not on the committed tip alone**, because
that is the state whose WebKit behaviour is in question. The committed tip's Node digests were checked separately
with `tests/golden/node-run.mjs`: all 16 keys equal `golden.json`, so the committed tip needs no golden repin.

Result: `fourEngineEqual: true`. Node, Chromium 149, Firefox 151 and WebKit 26.5 all give `fauna`
`6bf5d08562a0d45bcf03d5867f506b3edc7a943a37a94a5873f7ca0bd6973546` (unchanged, equal to `golden.json`) and
`faunaKnownUnstable` `61e258fc611ed6b70e4cf81b4154f824381331d8151524a1b20b0b846183d84d`. Every other key matches the fixture.
The gate prints FAIL only because the fixture still holds the old `faunaKnownUnstable` digest (`ad34e48e...`), which
the package changes on purpose. WebKit, verbatim:

```
webkit (26.5) computed the golden set in 23269 ms (launch included)
webkit: known mismatch faunaKnownUnstable no longer reproduces - remove it from KNOWN_ENGINE_MISMATCHES
webkit vs fixture golden.json MISMATCH:
  faunaKnownUnstable: 61e258fc611ed6b70e4cf81b4154f824381331d8151524a1b20b0b846183d84d != ad34e48eade6aa25fd5ba145a490a8284a42d1c4bb9cba32a054d9b2afdbb6bb (and != the measured known-mismatch digest ed5d56a238409d09929558b2ae7f1e19f097629cd58ac2ff8b08f1b7deabd971: a NEW change on this engine)

GOLDEN CROSS-ENGINE GATE: FAIL
```

## needs:

For the committed branch:
- needs: register `tests/fauna-composer-mesh-stability.test.mjs` in the `package.json` `test` script (the fauna block).
- needs: remove the `fauna:` entry from `GOLDEN_FLIP_FINDINGS` in `tests/golden/perturbation.test.mjs` (line 205). Verified
  locally with an uncommitted edit: `fauna: 625 records, golden flips 0, exact flips 345`, the test passes.
- needs: the README OPEN item "The trunked-centipede skin record moves under a 1-ULP nudge" can be closed (cause:
  `pow(1, y)` in the proboscis ear profile, fixed).
- No golden repin: Node's 16 digests on the branch tip equal `golden.json`.

Only if the ocellus package (Appendix A) is accepted:
- needs: golden `faunaKnownUnstable` repin to `61e258fc611ed6b70e4cf81b4154f824381331d8151524a1b20b0b846183d84d`
  (measured on all four engines), or, as the runner's note says, fold GOLDEN-FAUNA-2 back into the `fauna` key and
  empty `FAUNA_KNOWN_UNSTABLE`; that changes the `fauna` digest too, so it needs a fresh Node + cross-engine run.
- needs: remove the `webkit.faunaKnownUnstable` entry from `KNOWN_ENGINE_MISMATCHES` (`tests/golden/run-cross-engine.mjs`).
- needs: repin `odd-insect-bird` in `tests/fixtures/composer-eye-catalogue-links.json` (skin
  `314d93b3effdadd1b33f126880b354d5528cb8027e7a0e9d6ffc8e4b2dc0268f`; gloss, vertices, triangles and bones unchanged).
- needs: close the README OPEN item "Four engines are not all equal".

## Decision (D2, 2026-10-07): the ocellus package is accepted and applied

Opus-decided on Kasper's instruction (overrulable): accept the in-place skin-4 repin (not a skin-5), repin only
`faunaKnownUnstable` this round, keep GOLDEN-FAUNA-2 in its own key for one more round. The ~5 % stop condition guards
against a change in how creatures look; this is 8 vertices, at most 0.75 mm, and the eye becomes exactly
mirror-symmetric. skin-4 is unreleased (deployed: `fauna-preview-20261002-01`), the recipe and vocabulary are
unchanged (v1-v4 links decode as before), and EC4 set the in-place precedent.

Applied on branch `fauna/ocellus-seam` from main `a9a4893`:

| Step | Result |
|---|---|
| Appendix A (`git apply --check`, then apply) | clean, no context drift |
| `composer-eye-catalogue-links.json` | `odd-insect-bird` only (1 of 30): skin `1d759b27…09d3` -> `314d93b3…268f`, taken from the test; 8 vertices, max 0.0438 mm, positions only. Same history fields as the skin-4 file (`skinPreStability`, `stabilityDrift`, file-level `repinnedAtStability`) |
| `KNOWN_ENGINE_MISMATCHES` (run-cross-engine.mjs) | the `webkit.faunaKnownUnstable` entry is removed; the table is empty |
| `FAUNA_KNOWN_UNSTABLE` (generator.ts) | kept, with its key; comments say four engines equal since the `seamNormal` fix, fold next round |
| `tests/golden/node-run.mjs` | exactly 1 of 16 keys differs from `golden.json`: `faunaKnownUnstable` `ad34e48e…bb6bb` -> `61e258fc…d84d` |
| strict cross-engine run (`test-slot -- run-cross-engine.mjs --strict --update --report …`, exclusive slot; the runner took the GPU lock per engine) | `GOLDEN CROSS-ENGINE GATE: PASS (all four engines equal)`, exit 0. Node, Chromium 149, Firefox 151 and WebKit 26.5 all give `fauna` `6bf5d085…3546` (unchanged) and `faunaKnownUnstable` `61e258fc…d84d` |
| `golden.json` diff | that one digest line only; no other key or metadata moved |
| `tests/golden/perturbation.test.mjs` | 5/5 pass; `fauna` golden flips 0, `faunaKnownUnstable` golden flips 0 |

Evidence: `test-results/round-2026-10-07/golden-ocellus-seam/` (`cross-engine.log`, `cross-engine-report.json`).

**Next routine golden round:** if `--strict` passes again, fold GOLDEN-FAUNA-2 back into the `fauna` key and empty
`FAUNA_KNOWN_UNSTABLE` (that moves the `fauna` digest, so it needs a fresh Node + four-engine run).

## Appendix A: the withheld midline-ocellus package

Apply on the branch tip with `git apply` (save the block below as a file first).

```diff
diff --git a/src/fauna-composer-mesh.ts b/src/fauna-composer-mesh.ts
index 9d5a182..61ea45d 100644
--- a/src/fauna-composer-mesh.ts
+++ b/src/fauna-composer-mesh.ts
@@ -4,7 +4,7 @@ import {COAT_REGIONS, type CoatRegion} from './fauna-coat-vocab.ts';
 import {COAT_CELLS_PER_BODY, applyCoatDrift, coatIndividualDrift, defaultCoatGenome, evaluateCoat, hash3u, valueNoise3, type CoatGenome} from './fauna-coat-fields.ts';
 import {composerIndividualTraits, type ComposerIndividualTraits} from './fauna-composer-individual.ts';
 import {COMPOSER_IRIS_RGB, FACE_EYE_PROFILE, composerEyeProfileId, composerEyeRulesOf, composerHeadgearBuild, composerSkullOf, resolveComposerEyes, type ComposerSkull} from './fauna-composer-face.ts';
-import {EYE_PATCH, EYE_ROLE, OCELLUS, type LiddedEyeType, buildCompoundEye, buildEyePatch, buildEyespot, buildEyespotBead, buildFacetedEye, buildOcellus, buildStalk, catalogueEyeSpec, type CatalogueEyeSpec, eyeBarAxis, eyeGaze, nearestExit, normalize3, outermostExit, raycastFirstHit, type EyePatch, type RayHit, type Vec3 as EyeVec3} from './fauna-composer-eye.ts';
+import {EYE_PATCH, EYE_ROLE, OCELLUS, type LiddedEyeType, buildCompoundEye, buildEyePatch, buildEyespot, buildEyespotBead, buildFacetedEye, buildOcellus, buildStalk, catalogueEyeSpec, type CatalogueEyeSpec, eyeBarAxis, eyeGaze, nearestExit, normalize3, outermostExit, raycastFirstHit, raycastLine, type EyePatch, type RayHit, type Vec3 as EyeVec3} from './fauna-composer-eye.ts';
 import {isFaceRoundEyeKind} from './fauna-composer-eye-catalogue.ts';
 import {PROBOSCIS_FACE, composerFaceTip} from './fauna-composer-face-geometry.ts';
 import {composerFeatherFanSpan, composerWingChord, composerWingThickness, type ComposerBone, type ComposerGraph, type ComposerLimb, type ComposerSection, type Vec3} from './fauna-composer-rig.ts';
@@ -1712,6 +1712,21 @@ export const SPIDER_EYES = Object.freeze([
 ]);
 /** Insect ocelli: site offsets (x head length, x craniumWidth) from the compound eyes' site, on the head top. */
 const INSECT_OCELLI: readonly (readonly [number, number])[] = [[0.1, 0], [-0.05, -0.3], [-0.05, 0.3]];
+/** Tie window (head-local metres) for exits that share one mirror-seam crossing: engine noise on t is ~1e-17, a head
+ * triangle is >= ~1e-4 across. */
+const SEAM_TIE = 1e-9;
+/** The skull normal under a site on the head's mirror plane (z = 0) along a line in that plane (dir z = 0). Such a line
+ * crosses the two seam triangles at the SAME t, and which of them nearestExit keeps is decided by a 1-ulp difference in
+ * the site (WebKit 26.5 kept the other one than Node/Chromium/Firefox: a 0.15 rad lens-normal flip, 0.42 mm on the
+ * midline insect ocellus, golden faunaKnownUnstable). Every exit at the chosen signed crossing is summed in triangle-
+ * index order (not t order, which is what differed) and the lateral component dropped, so the midline normal is
+ * symmetric and independent of the tie order. Trialled 2026-10-04 (golden-ext/composer-patch-trial: four engines equal). */
+function seamNormal(tris: ArrayLike<number>, site: EyeVec3, dir: EyeVec3, hit: RayHit): EyeVec3 {
+  const tied = raycastLine(tris, site, dir).filter(h => h.normal[0] * dir[0] + h.normal[1] * dir[1] + h.normal[2] * dir[2] > 0 && Math.abs(h.t - hit.t) <= SEAM_TIE).sort((a, b) => a.tri - b.tri);
+  let sx = 0, sy = 0;
+  for (const h of tied) { sx += h.normal[0]; sy += h.normal[1]; }
+  return normalize3([sx, sy, 0]);
+}
 /** Every catalogue ring vertex lies within this many er of its centre (facial disc 2.1 er in plane + the closest-point
  * search 2.5 er), so the skull triangles beyond it never affect the patch. */
 const CATALOGUE_PATCH_REACH = 5.2;
@@ -1919,7 +1934,8 @@ function buildCatalogueEyes(e: CatalogueEyeEnv) {
       for (const [dx, z] of INSECT_OCELLI) {
         const site: EyeVec3 = [ox + dx! * H, 0.3 * cH, z! * cW], hit = nearestExit(headTris, site, up);
         if (!hit) ctx.fallbacks++;
-        const n = hit ? normalize3(addV(up, hit.normal, 1)) : up, base = hit ? addV(hit.point, n, -0.25 * rr) : site;
+        const hn = hit ? (z === 0 ? seamNormal(headTris, site, up, hit) : hit.normal) : null;
+        const n = hn ? normalize3(addV(up, hn, 1)) : up, base = hit ? addV(hit.point, n, -0.25 * rr) : site;
         const patch = buildOcellus({r: rr, height: 0.7 * rr, centre: base, normal: n, up: [1, 0, 0], segments: 6, stations: 1});
         const lens = gainC(facet, 1.2);
         emit(patch, [...patch.roles].map(() => lens), 0, 'ocellus', rr, base, n, hit ? hit.point : null);
diff --git a/tests/fauna-composer-mesh-stability.test.mjs b/tests/fauna-composer-mesh-stability.test.mjs
index ce58277..f1b9b63 100644
--- a/tests/fauna-composer-mesh-stability.test.mjs
+++ b/tests/fauna-composer-mesh-stability.test.mjs
@@ -92,6 +92,38 @@ test('trunked-centipede: the skin arrays hold the golden grid under every 1-ULP
   }
 });
 
+// The midline insect ocellus (golden faunaKnownUnstable, GOLDEN-FAUNA-2): its site and seating ray lie in the head's
+// mirror plane and cross the two seam triangles at the same t. Before seamNormal the tie order (a 1-ulp question) picked
+// one seam triangle's normal: WebKit 26.5 picked the other one, and so does Node under the alternating nudge below.
+const MIDLINE_INSECT = 'GOLDEN-FAUNA-2';
+test('midline-ocellus insect: the skin arrays hold the golden grid under every 1-ULP nudge mode (seam tie)', () => {
+  const recipe = randomComposerRecipe(MIDLINE_INSECT), base = build(recipe);
+  for (const [mode, [names, sign, select]] of Object.entries(MODES)) {
+    const skin = withNudge(names, sign, () => build(recipe), select);
+    assert.deepEqual(nonFinite(skin), [], `${mode}: non-finite skin values`);
+    assert.deepEqual(gridDiff(base, skin), [], `${mode}: skin arrays moved on the golden 1e-6 grid (the midline ocellus seam tie)`);
+  }
+});
+
+/** The eye-part vertices near the mirror plane (|z| < 0.1 x the eyes' largest |z|): the midline ocellus. */
+function midlineEyeVertices(skin) {
+  const vs = new Set();
+  for (const p of skin.parts) if (p.part === 'eyes') for (let t = p.firstTriangle; t < p.firstTriangle + p.triangles; t++) for (let k = 0; k < 3; k++) vs.add(skin.index[3 * t + k]);
+  const z = v => skin.positions[3 * v + 2], maxZ = Math.max(...[...vs].map(v => Math.abs(z(v))));
+  return [...vs].filter(v => Math.abs(z(v)) < 0.1 * maxZ);
+}
+test('midline ocellus is exactly mirror-symmetric: its on-seam vertices sit at z = 0 and every vertex has an exact mirror twin', () => {
+  for (const name of [MIDLINE_INSECT]) {
+    const skin = build(randomComposerRecipe(name)), mid = midlineEyeVertices(skin), P = v => [0, 1, 2].map(k => skin.positions[3 * v + k]);
+    assert.equal(mid.length, 8, `${name}: the midline ocellus (6 rim + apex + base vertices)`);
+    assert.ok(mid.filter(v => P(v)[2] === 0).length >= 2, `${name}: the ocellus axis vertices lie on the seam, z exactly 0`);
+    for (const v of mid) {
+      const [x, y, z] = P(v);
+      assert.ok(mid.some(u => { const [a, b, c] = P(u); return a === x && b === y && c === -z; }), `${name}: vertex ${v} (${x}, ${y}, ${z}) has no exact mirror twin`);
+    }
+  }
+});
+
 test('the pow(1, y) nudge reaches the proboscis ear (negative control: the nudge is live)', () => {
   // the ear profile is the only pow(1, y) call site that feeds a fractional power of a sine; the nudge must still reach
   // pow(1, y) in the build, or the test above proves nothing
diff --git a/tests/fixtures/composer-skin4-links.json b/tests/fixtures/composer-skin4-links.json
index 1431a3b..4b19a9b 100644
--- a/tests/fixtures/composer-skin4-links.json
+++ b/tests/fixtures/composer-skin4-links.json
@@ -135,13 +135,34 @@
    "skin3": "e718d853159589727ef3c6c84bffc8033ade5b939cd7d2090f1427c689589385"
   },
   "v1*layout_biped*legPairs_1*bodyLength_1.83*girth_0.85*posture_0.33*torso_deep-chest*neckLength_0.21*head_mandibles*headSize_1.21*snoutLength_0.89*horns_none*legs_unguligrade*legLength_0.41*feet_hoof*arms_grasping*armLength_0.59*hands_pincer*tail_tufted*tailLength_1.31*armor_dome*wings_membrane*wingSpan_2.61*trunk_none*trunkLength_0.41*palette_earth*colorSeed_4293": {
-   "skin": "ac3d2d0bde971b3459780eb3c641b69231d4afc59c7f8610dfadd06e03523bc8",
+   "skin": "812b6779bd1018bab3c3cac01ba73f390c47f26686ea830e18a01827a108f0f0",
    "gloss": "ba5574100c6604015e25296946303d19535e2fea2f72bcd9547e4b3c2d68b6f5",
    "vertices": 7240,
    "triangles": 14332,
    "bones": 34,
    "driftFromSkin3": "fauna-composer-eye-2: eyes rebuilt under the current eye rules",
-   "skin3": "a6c7776780290ccad911bff098683cf91a4329b90c55fa716c1752127a778dc3"
+   "skin3": "a6c7776780290ccad911bff098683cf91a4329b90c55fa716c1752127a778dc3",
+   "stabilityDrift": {
+    "reason": "fauna-composer-stability (2026-10-07): the midline insect ocellus is seated on the head mirror seam with the tie-order-independent seamNormal (sum of the tied seam-triangle exit normals in triangle-index order, lateral component dropped) instead of whichever seam triangle the 1-ulp tie order picked; 8 ocellus vertices move, colours/weights/index unchanged",
+    "before": {
+     "skin": "ac3d2d0bde971b3459780eb3c641b69231d4afc59c7f8610dfadd06e03523bc8",
+     "gloss": "ba5574100c6604015e25296946303d19535e2fea2f72bcd9547e4b3c2d68b6f5"
+    },
+    "after": {
+     "skin": "812b6779bd1018bab3c3cac01ba73f390c47f26686ea830e18a01827a108f0f0",
+     "gloss": "ba5574100c6604015e25296946303d19535e2fea2f72bcd9547e4b3c2d68b6f5"
+    },
+    "verticesMoved": 8,
+    "maxVertexDisplacementM": 0.000749714,
+    "unchanged": [
+     "index",
+     "skinIndex",
+     "skinWeight",
+     "colors",
+     "gloss"
+    ]
+   },
+   "skinPreStability": "ac3d2d0bde971b3459780eb3c641b69231d4afc59c7f8610dfadd06e03523bc8"
   },
   "v1*layout_quadruped*legPairs_2*bodyLength_0.84*girth_0.77*posture_0.43*torso_slim*neckLength_0.3*head_blunt*headSize_0.94*snoutLength_0.87*horns_paired*legs_plantigrade*legLength_0.47*feet_pad*arms_none*armLength_0.86*hands_hand*tail_tufted*tailLength_0.8*armor_none*wings_none*wingSpan_2.33*trunk_none*trunkLength_0.67*palette_slate*colorSeed_7350": {
    "skin": "82d5b843221af5d24e5341c25dcd13d8b64cccb32d5c339772c29866cc040dbe",
@@ -258,13 +279,34 @@
    "skin3": "d5bac2f2322d26b78b91ef4ac07d0b88904691dd36ce1750704746015965ed8e"
   },
   "v1*layout_sprawled*legPairs_2*bodyLength_0.8*girth_1.35*posture_0.75*torso_slim*neckLength_0.13*head_mandibles*headSize_0.87*snoutLength_0.6*horns_crest*legs_arthropod*legLength_0.51*feet_spike*arms_none*armLength_0.49*hands_pincer*tail_feather-fan*tailLength_1.36*armor_bands*wings_feathered*wingSpan_1.98*trunk_none*trunkLength_1.19*palette_slate*colorSeed_1258": {
-   "skin": "2b58e7c512f15379b7c36621c55536d2c77354ed6764305c6fa199b044054fc3",
+   "skin": "30160ba78ab6ae2a14ec56d2f33ab54e76a259bdfcfb6e2a74b3aac63e313ffd",
    "gloss": "7ad7f0b1b409f2fc9ab1996056ae0ef4e83ccd7a0cd6b5da4cd130ab8346f766",
    "vertices": 4738,
    "triangles": 9300,
    "bones": 26,
    "driftFromSkin3": "fauna-composer-eye-2: eyes rebuilt under the current eye rules",
-   "skin3": "d0102b2736adc2de2065f36cae10f87ed95c550ff94848853dde8927a41076be"
+   "skin3": "d0102b2736adc2de2065f36cae10f87ed95c550ff94848853dde8927a41076be",
+   "stabilityDrift": {
+    "reason": "fauna-composer-stability (2026-10-07): the midline insect ocellus is seated on the head mirror seam with the tie-order-independent seamNormal (sum of the tied seam-triangle exit normals in triangle-index order, lateral component dropped) instead of whichever seam triangle the 1-ulp tie order picked; 8 ocellus vertices move, colours/weights/index unchanged",
+    "before": {
+     "skin": "2b58e7c512f15379b7c36621c55536d2c77354ed6764305c6fa199b044054fc3",
+     "gloss": "7ad7f0b1b409f2fc9ab1996056ae0ef4e83ccd7a0cd6b5da4cd130ab8346f766"
+    },
+    "after": {
+     "skin": "30160ba78ab6ae2a14ec56d2f33ab54e76a259bdfcfb6e2a74b3aac63e313ffd",
+     "gloss": "7ad7f0b1b409f2fc9ab1996056ae0ef4e83ccd7a0cd6b5da4cd130ab8346f766"
+    },
+    "verticesMoved": 8,
+    "maxVertexDisplacementM": 0.000266246,
+    "unchanged": [
+     "index",
+     "skinIndex",
+     "skinWeight",
+     "colors",
+     "gloss"
+    ]
+   },
+   "skinPreStability": "2b58e7c512f15379b7c36621c55536d2c77354ed6764305c6fa199b044054fc3"
   },
   "v1*layout_biped*legPairs_1*bodyLength_1.7*girth_1.12*posture_0.33*torso_slim*neckLength_0.19*head_beak*headSize_1.23*snoutLength_0.37*horns_paired*legs_pillar*legLength_1.14*feet_hand*arms_none*armLength_1.19*hands_claw*tail_tufted*tailLength_1.41*armor_none*wings_none*wingSpan_2.22*trunk_none*trunkLength_0.7*palette_plumage*colorSeed_4688": {
    "skin": "225ad56a5510aab003cfb7d25270c94b17ad6826c822e5201981fc32a8705fd9",
@@ -290,5 +332,15 @@
    "EC4 (graph-4): arms of a limbless or many-legged body rest beside and behind the head instead of in front of the face": 1
   },
   "note": "Eye round EC4 (head polish) repin in place: graph-4 / face-geometry-2 rebuilt the proboscis trunk and ears and moved the rest arms of limbless and many-legged bodies off the face. These are not eye rules, so they apply under both eye-rule epochs. Every drifted entry keeps its earlier history, records the replaced pin (skinPreEC4, glossPreEC4, verticesPreEC4, trianglesPreEC4) and says why (ec4Drift). Bone counts are unchanged. The skin version string stays fauna-composer-skin-4 (unreleased in this round); the graph and face-geometry versions carry the change."
+ },
+ "repinnedAtStability": {
+  "branch": "fauna/composer-stability",
+  "replacesPinsAt": "5450d9d",
+  "date": "2026-10-07",
+  "skin": "fauna-composer-skin-4",
+  "changed": 2,
+  "of": 28,
+  "reason": "fauna-composer-stability (2026-10-07): the midline insect ocellus is seated on the head mirror seam with the tie-order-independent seamNormal (sum of the tied seam-triangle exit normals in triangle-index order, lateral component dropped) instead of whichever seam triangle the 1-ulp tie order picked; 8 ocellus vertices move, colours/weights/index unchanged",
+  "note": "Repinned in place (skin-4 is unreleased: the deployed build is fauna-preview-20261002-01). Each drifted entry keeps every earlier history field, records the replaced pin (skinPreStability) and the before/after hashes (stabilityDrift). Ledger: docs/fauna-composer-stability-2026-10-07.md."
  }
 }
```
