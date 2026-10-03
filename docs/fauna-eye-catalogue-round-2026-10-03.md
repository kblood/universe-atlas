# Fauna eye catalogue round (2026-10-03)

This round builds on the face round (`docs/fauna-face-eye-round-2026-10-02.md`). It adds eye catalogue v2: 13 new eye kinds next to the 5 existing ones, an eye-rules epoch in the recipe, rare unusual eyes in the wild generator, Creature Lab eye controls, and a head polish.

| Package | Content | Branch | Status |
|---|---|---|---|
| EC1 | Contract: catalogue module, eyeRules 1/2, recipe v4, generator eye passes | `eye-round/EC1` | merged (5ebaed5) |
| EC2 | Geometry: `fauna-composer-eye-2`, `fauna-composer-skin-4` | `eye-round/EC2` | merged (08a5bc5), honest status in `docs/fauna-eye-round-EC2-status-2026-10-03.md` |
| EC3 | Creature Lab eye controls and eye close-up review | `eye-round/EC3` | merged (01c67ff) |
| EC4 | Head polish: proboscis trunk, blunt mouth check, arms and wings off the face | `eye-round/EC4` | this document; not merged at the time of writing |

Nothing from this round has been pushed or deployed. The deployed preview `fauna-preview-20261002-01` is immutable and still shows the face round.

## Owner decisions (2026-10-03)

These override the design where the two conflict.

1. **Old links use the new eyes.** v1–v3 links upgrade to the eye-catalogue-v2 automatic rules (eyeRules 2). The face-round look is kept as an explicit choice: "Earlier eye rules" (eyeRules 1) can still be selected and rebuilds the face-round eyes exactly. The face-round eye kinds can also still be selected.
2. **Odd combinations are allowed and built**, for example a cuttlefish W pupil on a horse. Large variation is a goal. The wild generator produces unusual eye kinds, but rarely (about 5–10 %). Coherent species stay plausible.
3. **There is no Advanced Eyes panel.** Only named kinds are offered.

## The eye catalogue

In "Auto picks it when", the eyeRules 2 entries are as implemented in `composerAutoEyeType` (`src/fauna-composer-face.ts`). "Flavour" means the coherent generator writes the kind explicitly: a pure hash `composer-species-eyes-1/<stream>` picks it from the archetype's weights in `COMPOSER_SPECIES_EYE_FLAVOUR`, with no stream draw.

| Kind | Real animals | Key visual traits | Auto picks it when (eyeRules 2) |
|---|---|---|---|
| round *(face round)* | songbirds, dog, lion and tiger, elephant, apes | round pupil, almond lid | beak, flat-face, proboscis; pillar-legged or large (body length 0.9 or more) non-hoofed muzzle; jaws that are not sprawled |
| horizontal *(face round)* | goat, sheep, horse, deer, toad, octopus | horizontal bar, counter-rolled to the horizon, lateral | hoofed or unguligrade muzzle |
| vertical-slit *(face round)* | fox, vipers, small lizards | thin slit; the iris fills the opening | sprawled or limbless jaws with body length under 1.0 |
| compound *(face round)* | Scutigera, generic arthropods | facet dome, dark pseudopupil | mandibles on a many-legged body with leg pairs other than 3 and 4 |
| eyespot *(face round)* | flatworms | flush dark disc (reddish tint, EC2) | blunt |
| raptor | eagles, hawks, falcons | large round pupil, yellow/gold/brown/red iris, bony brow shelf over the lid, turned forward | never; flavour: bird 3/10, theropod 1/4 |
| owl | barn owl, eagle-owl, little owl | huge, frontal, round open lid with a dark rim, pale facial-disc plate | never; flavour: bird 2/10 |
| cat | domestic cat, wildcat, sand cat, fox | large forward eye, mid-width slit, upswept almond, radial iris | non-hoofed, non-pillar muzzle with body length under 0.9 |
| gecko | Tokay, helmet and crested geckos | slit beaded into pinholes, lidless glossy spectacle, reticulated iris | never; flavour: sprawler-lizard (jaws) 2/8 |
| frog | bullfrog, toads, leopard frog, red-eyed tree frog | bulging eyes on dorsal bumps, rounded horizontal pupil, gold reticulated iris | never; flavour: sprawler-lizard 1/8, only with a short snout (< 0.6) |
| chameleon | veiled, panther and Jackson's chameleons | cone turret of fused lids with a pinhole; left and right eyes look different ways | never; flavour: sprawler-lizard 1/8 |
| crocodile | crocodiles, alligators, caimans, gharial | slit on raised dorsal orbits, palpebral bump, third eyelid | sprawled jaws with body length 1.0 or more |
| sclera | human, partly bonobo | white sclera on both sides, small iris, wide almond outline | never |
| nocturnal | tarsier, bushbaby, slow loris, kinkajou | enormous, nearly all pupil | never; flavour: primate 1/5 |
| cephalopod | cuttlefish | W-shaped pupil, silvery iris, soft rimless lid, lateral | never; there is no native body plan |
| insect | bee, wasp, fly, dragonfly, mantis | large compound domes and 3 ocelli in a triangle on top | mandibles with 3 leg pairs, or mandibles on a body that is not many-legged |
| spider | jumping, wolf and ogre-faced spiders | 8 glossy black beads, 2 large front-middle eyes, two rows | mandibles on a many-legged body with exactly 4 leg pairs |
| stalk | fiddler and ghost crabs, stalk-eyed fly, land snail | eye on a tapered stalk: a compound bulb on mandibles, a dark bead on a tentacle on blunt | never; flavour: worm 1/4 |

The eyeRules 1 auto table is the face round's, frozen: mandibles compound; blunt eyespot; beak, flat-face and proboscis round; muzzle horizontal for hooves or unguligrade legs, round for pillar legs, otherwise vertical-slit under body length 0.9 and round above; jaws vertical-slit when sprawled, otherwise round.

The design's geometry and budget targets (EC2):
- each lidded eye is a 20-segment, 7-ring patch of 280 triangles;
- the insect set is 276 triangles, the spider set 192 and the stalk pair 152;
- the creature still has one material and one draw call;
- eyeshine is metadata only.

Source references are in the design (`eye-catalogue-v2.md` with its JSON spec). All sizes, yaws and pitches there are design values, tuned in EC2. Only the direction of each (bigger, more frontal, dorsal) comes from the research.

## Rules

- **Auto is anatomy only.** It reads face, layout, leg pairs, legs, feet and body length, plus the rules epoch. It never reads colour or a hash.
- **Epochs.**
  - eyeRules 2 is current.
  - v1–v3 links have no `eyeRules`; they decode to recipe v4 and upgrade to rules 2 (owner decision 1).
  - eyeRules 1 rebuilds the face-round eyes and irises exactly (pinned by `composer-skin3-links.json`).
- **Old explicit kinds keep readable eyes on upgrade.** The EC1 review round 3 fix applies to camera eyes on arthropod and worm heads under eyeRules 2 only:
  - the camera-eye scale k is 0.15 → 0.21 on mandibles and 0.14 → 0.19 on blunt;
  - the iris is an amber or gold band.
- **Rare unusual wild eyes.** `composer-wild-eyes-1/<seed>` is a pure hash post-pass over the wild generator, outside the frozen stream. It applies to `COMPOSER_WILD_UNUSUAL_EYES_PER_MILLE` = 75 per mille and picks any kind other than the auto kind. The measured rate was 6.2 % on wild seeds 0–999 (EC1, 0e02688), inside the owner's 5–10 %.
- **Coherent eyes stay plausible.** They are auto, except for the hash-picked flavours in the table. Species keys ignore eyes, so herds and individuals do not move.
- **Odd combinations are built, not hidden.** The Lab menu labels them by rarity (EC3).
- **Head polish is not an eye rule.** EC4's graph-4 and face-geometry-2 changes apply under both epochs.

## EC4: what changed

### 1. Proboscis head polish (`fauna-composer-face-geometry-2`, `fauna-composer-graph-4`), commit 27aaa91

GPT Luna 6's face-round reading of the trunks:
- "Roughly 1.5–2 head lengths ... the face is small relative to the trunk";
- "its base looks pinched and narrower than the face around it";
- "The tip looks blunt and capped";
- on the rhinoceros: "especially thin and droops far forward".

What changed:
- **Base matches the muzzle.** The muzzle tip section went from 0.5 cH × 0.55 cW to 0.92 cH × 1.02 cW (`PROBOSCIS_FACE`; 0.72 × 0.8 at a9, still "narrow" to Luna on later runs). The trunk's first ring is that section (`PROBOSCIS_TRUNK_BASE` 1), so there is no step.
- **Shorter.** `PROBOSCIS_TRUNK_LENGTH` is 1.45 head lengths per unit `trunkLength` (graph-3: 2.1). The default 0.8 builds 1.16 head lengths and the review specimens build 1.1–1.6.
- **Fast taper.** `composerTrunkRadius` is tip 0.3 + 0.7 × (1 − u)^1.25, replacing the linear cone. The result is a thick base and a slender hand.
- **Hangs, then curls.** `composerTrunkRestAngles` / `composerTrunkRestShape`:
  - the trunk droops from the face toward a hang angle and flicks its last bone forward;
  - a trunk too long for the face height curls into a J: the latest start bone, then the smallest curl found by deterministic bisection, that keeps every bone end above its own section;
  - graph-3's kinked clearance lift (`resolveRestClearance`) is kept only as a fallback, and no review specimen uses it.
- **Skin.**
  - 16 radial segments, up from 12, so there is no octagonal faceting.
  - Shallow wrinkle bands (`TRUNK_WRINKLE`).
  - A join blend that eases orientation, section and centre line from the muzzle axis, so the seam normal stays continuous.
  - Hidden junction discs inset to 0.96 (`HIDDEN_DISC_INSET`).
  - A nostril tip (`buildTrunkTip`): a gentle swelling in the coat colour (a pale pink lip read as "a small, plain-looking cap"), a darkened end face, two dark nostrils and a dorsal finger.
- **Ears.** The proboscis ear is a lofted flap (`proboscisEar`) with a thick root, a hanging lower lobe and an outward bow. It replaces the flat dark disc that Luna read as "flat dark disc ears".
- **Budget.** The head group may exceed the WP4 legacy count by up to 800 triangles. The documented allowance is in `tests/fauna-composer-head-geometry.test.mjs`.

### 2. Arms and wings off the face (`fauna-composer-graph-4`), commit c6067d8

Luna on wild seed 40 in the face round said: "black shapes look like wings or limbs passing in front of and around the head".

- **Cause.** The arms of a long axial body (limbless, many-legged) sit on its front segment, right behind a small head. graph-3 rested them forward, so forearms and hands hid 34–68 % of seed 40's face in the three review views. This is measured by the new CPU occlusion metric described below.
- **Rest pose.** On axial bodies the arm rest target is now out to the side and back: `AXIAL_ARM_REST` = (−0.2, −0.35, 0.75) × reach. Seed 40's face is now 0 % covered in neutral, idle, walk and display.
- **Display pose.** Every arm is now raised up and out, `DISPLAY_ARM_RAISE` = (−0.2, 0.9, 0.5) × reach, instead of straight forward (0.35, 0.55, 0).
  - With the old display the survey of generated animals found 17 face hits, up to 46 %.
  - With the new one, only wild bipeds with wings (seeds 19, 38, 115) keep a side-view hit, at 6 % or less.
- **Occlusion metric.** `tests/helpers/composer-head-occlusion.mjs`:
  - linear blend skinning on the CPU, as the GPU does it;
  - rays from the face vertices (head, eyes, mouth) toward the three review cameras of `tests/fauna-face-closeups.html`;
  - Möller–Trumbore tests against the posed arm, hand, finger and wing triangles.

### 3. Blunt mouth: no change needed

EC2 (76bb72a) had already replaced the blunt mouth disc with a closed-mouth lens under eyeRules 2. EC4 re-rendered the blunt and worm specimens and asked Luna. All four passed (see the verdicts below), so EC4 made no mouth change.

## Version bumps and repins

| Version | Before | After | Why |
|---|---|---|---|
| face geometry | `fauna-composer-face-geometry-1` | `fauna-composer-face-geometry-2` | proboscis muzzle tip, trunk length, taper, rest shape |
| graph | `fauna-composer-graph-3` | `fauna-composer-graph-4` | trunk rest shape and sections; axial arm rest; display arm raise |
| skin | `fauna-composer-skin-4` | `fauna-composer-skin-4` (unchanged string) | skin-4 has not been released yet (EC2 introduced it this round), so it was repinned in place, following the WP5/EC2 precedent |

All repins were made recipe by recipe against d403279, the round's main before EC4:
- **Graph neutral-identity digest (435 recipes)** in `tests/fauna-composer-gait.test.mjs`: 44 of 435 changed and 391 are bit-identical. The 44 are 17 proboscis faces and 30 limbless or many-legged bodies with arms; 3 recipes are both. The `trunked-centipede` preset prefix was repinned. No other preset changed.
- **`tests/fixtures/composer-skin3-links.json` (eyeRules 1) and `composer-skin4-links.json` (eyeRules 2):**
  - 2 of 28 entries were repinned in each: one proboscis and one many-legged `jaws` with grasping arms.
  - Each drifted entry keeps its earlier history, records the replaced pin (`skinPreEC4`, `glossPreEC4`, `verticesPreEC4`, `trianglesPreEC4`, plus `skin3PreEC4` on skin-4) and states its reason (`ec4Drift`).
  - The top-level `repinnedAtEC4` block counts them.
  - Bone counts are unchanged.
- **Part diff** (`tests/tools/composer-part-diff.mjs`, base = d403279 worktree):

| Set | Recipes changed | Changed parts |
|---|---|---|
| specimens (71) | 5 | head 8, mouth 4, eyes 4, trunk 4, arm 2, hand 2 |
| graph435 | 44 | head 34, mouth 17, eyes 17, trunk 17, arm 60, hand 60 |
| skin2 (28) | 2 | head 2, mouth 1, eyes 1, trunk 1, arm 2, hand 2 |

  - The eyes and mouth parts change only on proboscis heads (17 = 17 in graph435), whose face geometry changed; no eye kind or eye rule changed.
  - No limbless or many-legged recipe outside the axial-arms set changed.
  - No `wing` part changed. On seed 40 the shapes covering the face were its arms and hands: moving the arm rest alone took its covered fraction to 0 in every motion (the metric counts wings too).

Not touched: LIFE_FILES (`tests/life-cpu-digest.test.mjs` still passes), terrain, surface, climate, season, forest, planet-renderer and eco.

## Tests

New, for the coordinator to register (EC4 does not edit `package.json`):
- `tests/fauna-composer-head-occlusion.test.mjs`, with helper `tests/helpers/composer-head-occlusion.mjs`:
  - seed 40 is at 0 % in 7 poses, and its rest hands sit behind the head root and out beside it;
  - a negative test: the graph-3 rest hands hide more than 25 % of seed 40's face;
  - the review specimens stay at or under 2 % (6 % in display);
  - 64 wild plus 64 coherent animals stay at or under 3 % (8 % in display).

Extended:
- `tests/fauna-composer-head-geometry.test.mjs`: the trunk length in head lengths, a base of at least 0.7 cW, a rest chain with every bone end above its section, a forward-turned tip, nostril and lip vertices, the seam disc inset and the budget.
- The ec4Drift checks in `tests/fauna-composer-individual.test.mjs` and `tests/fauna-composer-skin4-links.test.mjs`.

## Odd-combination rarity

The wild unusual-eye rate is 75 per mille by construction. EC1 measured 6.2 % on seeds 0–999, within the owner's 5–10 %. EC4 changes no eye rule and no generator, so the rate is unchanged.

## Luna verdicts (GPT Luna 6)

Every verdict below is Luna's. A comment of mine is labelled as my reading.

### EC4 (this package)

Evidence root: `C:/LLM/IWSDK/universe-atlas/test-results/fauna-eye-round-2026-10-03/EC4/`. The prompts are in `luna/q-*.txt` and the outputs in `luna/*.txt`.

| Run | Images | Result | Luna's words |
|---|---|---|---|
| before-trunk (baseline) | `before/` rhinoceros, pachyderm, centipede, giraffe | FAIL ×4 | the face-round trunk faults quoted above |
| a3, a5, a7 | `a3/`, `a5/`, `a7/` | rhinoceros and pachyderm PASS; centipede and giraffe FAIL | giraffe (a5): "several head lengths", and the patterned neck was read as the trunk |
| a4 | `a4/` | FAIL ×4 | stepped bands, "flat dark disc ears", an abrupt join |
| **a9 trunk** (`luna/a9-trunk.txt`, prompt `q-trunk-v2.txt`) | `a9/` | **PASS ×4** | reservations: faceting and "stepped bands" are still visible; the centipede and giraffe nostrils: "cannot tell" at this size |
| after (`luna/after-trunk.txt`), sheets byte-identical to a9 | `after/` (stale for trunks) | rhinoceros, pachyderm PASS; centipede, giraffe FAIL | "the narrow, visibly joined base and plain tip make it read more like an attached tube" -- the a9 PASS did not reproduce |
| a12 r1 / r2 | `a12/` (base 0.8 × 0.89, pale lip removed) | r1: 1 PASS 3 FAIL; r2: 4 FAIL | "narrow, tube-like base does not read as a natural continuation of the muzzle" |
| **a13 r1 / r2** (`luna/a13-trunk-r1.txt`, `-r2.txt`) | `a13/` (base 0.92 × 1.02, taper power 1.25) | **PASS ×4 in both runs** | "the trunk reads as a nose growing from the face"; reservations: faceting, centipede tip "capped or blunt from the side" |
| **a10 seed 40** (`luna/a10-seed40.txt`) | `before/` vs `a10/` wild-composer-40 | before **FAIL**, after **PASS** | before: "several broad black wing or limb shapes cross in front of the eyes and upper face"; after: "In the front panel, the broad side projections sit behind the head ... In the three-quarter panel, no limb visibly crosses the face." "PASS — no wing or limb visibly covers the face." |
| **a10 blunt** (`luna/a10-blunt.txt`) | `a10/` wild-5-blunt-paired, wild-26-blunt-trunk, preset-worm, odd-sclera-worm | **PASS ×4** | e.g. "It reads as a closed mouth: a narrow line with a lighter lip edge." |

The a9 prompt adds one fact: on the giraffe, the patterned diagonal shape is the neck.

### EC1–EC3 (from the round's commits and evidence; EC4 did not re-judge them)

**EC1** (`EC1/luna/`):
- v1 regression: PASS ×2.
- v5 cat fix and v6 crocodile fix: PASS.
- v10 upgraded centipede (r3): readable PASS, not-worse PASS. This reverses the v9 FAIL ("too tiny and dark").
- v11 odd camera (r3): PASS ×4.
- Earlier FAILs:
  - v2 odd seated (giraffe eyespots read as "specks", dinosaur stalk, centipede cat);
  - v3 odd more (rhinoceros owl eyes are "tiny orange dots", bird compound eyes read as "lumps");
  - v4 named kinds (raptor, owl, gecko, spider);
  - v7 upgraded giraffe A ("tiny specks").
- These were carried to EC2 as geometry work. EC1 was approved by review with them deferred.

**EC2** (`docs/fauna-eye-round-EC2-status-2026-10-03.md`, `EC2/luna/`):
- cat-cat-carnivore is **contested**: 2 PASS, 2 dedicated FAIL.
- FAIL at merge: owl facial disc, odd-owl-rhino, odd-cat-centipede, raptor (too lateral, no brow shelf), gecko (too small), cephalopod (W unclear), crocodile (a head-crest artefact).
- eye-cat-juvenile is not a clean pass.

**EC3** (`EC3-review/head/`):
- r1 close-up frame: 1 PASS, 3 FAIL.
- r2 and r3 menu: FAIL. An iris swatch showed for "Automatic (no iris)", and the panel bottom was clipped.
- Fixes followed in 178d8de, 3c817d5 and the merged EC3 (01c67ff). 3c817d5 records the close-up side views passing after the 30° obliquity cap.

## Evidence paths

All paths are under `C:/LLM/IWSDK/universe-atlas/test-results/fauna-eye-round-2026-10-03/EC4/`:
- `before/`: BEFORE close-up sheets at d403279. Trunks, seed 40, blunt and worm specimens, and `contact.png`.
- `a3/` … `a10/`: iteration sheets.
- `a13/`: the final trunk sheets (current HEAD). `after/`: AFTER sheets rendered before a13; their trunk sheets are stale, the seed-40, blunt and worm sheets are current (a13 changed only proboscis). Trunks, seed 40, blunt and worm specimens, and the preset rhinoceros as a non-proboscis control.
- `luna/`: prompts and outputs.
- `part-diff/specimens.json`, `part-diff/graph435.json`, `part-diff/skin2.json`.

## Deferred

- **A dotted light line at some part seams** (the trunk junction, behind the eye, head to neck).
  - It is visible in the BEFORE sheets too.
  - The seam vertices are bitwise identical, with identical weights, so it is not a geometry crack.
  - Insetting the hidden junction discs did not remove it.
  - My reading: it is renderer-level, not mesh-level; the cause is unknown.
- **Luna's a9 reservations.** Faceting and "stepped bands" are still visible on the trunk at close range, and the centipede and giraffe nostrils cannot be told apart at normal size.
- **Wild bipeds with wings (seeds 19, 38, 115):** up to 6 % of the face is covered in the side view during the display motion only. No specimen is affected.
- **Carried from EC2:** the contested cat, owl disc, raptor, gecko, W pupil, small dark eyes on dark coats, the compound, spider and stalk legibility.
- **Not done in EC4:** an in-headset check. The definition of done in `AGENTS.md` requires the target runtime; a new web preview needs the owner's explicit OK.
