# Fauna face and eye round, 2026-10-02: WP5 head geometry, trunk face and headgear

Branch `face-round/WP5` (base `179485c`, the WP4 merge). The owner asked for three things:

- make the trunk a face type;
- give the eyes realistic types;
- remove horns where they make no sense.

WP1 to WP4 delivered the rule tables and the eyes. WP5 builds the geometry the rules imply:

- a real proboscis face whose muzzle hands over into the trunk;
- a casque on beaks;
- a seated crest fin on jaws;
- paired horns rooted on the brow;
- ears that survive horns;
- a flat face whose brow no longer closes the eye;
- nostrils and the worm mouth disc seated on their caps.

Nothing here is validated on GPU hardware or in a headset. The close-ups below are desktop Chromium renders (WebGL, under the machine-wide GPU lock) of the CPU-built skin.

## The preset redesign is reversible

Every change is keyed by the recipe's `head` (face) and the built headgear kind. Recipes, presets and the link format are unchanged.

- The per-face numbers live in one pure module, `src/fauna-composer-face-geometry.ts` (`fauna-composer-face-geometry-1`).
- Headgear building lives in one branch of `buildHead` per built kind.

To revert any single decision, edit one of these:

- one entry of `COMPOSER_FACE_GEOMETRY`;
- one cell of WP1's `FACE_HEADGEAR`;
- one headgear branch.

The decisions in question are the shelled-giraffe-bird casque, the winged-ape-rhino losing its nose horn, and the trunked-centipede trunk. Then bump the versions and repin. No recipe migration is needed in either direction.

Hand-made and legacy links keep their chosen `horns` value. When a face does not build it, the UI shows WP1's disclosure ("Not built: …") instead of silently dropping it. Old links keep resolving to the immutable `fauna-preview-20261002-01` package; WP5 changes only what a fresh build of the same link produces.

## Rule table (what each face builds)

| Face | Skull (scale / cranium H / W / snout) | none | nasal | paired | ossicones | crest | Ears |
|---|---|---|---|---|---|---|---|
| muzzle | 1 / .34 / .9 / .62 | - | nose horn | brow horns, root at (.16H, .8cH, .48cW) | ossicones | not built (mammal) | always; low and back beside horns |
| proboscis | 1.05 / .40 / .9 / .62 x .4 | - | not built | brow horns | not built | not built | flap ears |
| jaws | 1.15 / .34 / .95 / .62 | - | nose horn | brow horns | built as brow horns | seated crest fin | none (reptile) |
| beak | .9 / .34 / .9 / .62 | - | built as casque | not built | not built | casque on the culmen | none |
| flat-face | .9 / .42 / .9 / .62 | - | not built | not built | not built | not built | side ears |
| blunt | .6 / .5 / .9 / .62 | - | not built | not built | not built | not built | none |
| mandibles | .7 / .3 / 1.4 / .62 | - | not built | not built | not built | not built | none |

The proboscis trunk is now part of the face:

- the head chain gains 6 trunk bones;
- the trunk root sits on the muzzle's tip station;
- the first trunk ring repeats the last muzzle station.

The coordinator decisions are applied through the presets' existing values and the rule table:

- shelled-giraffe-bird (beak + crest) → casque;
- winged-ape-rhino (flat-face) → no nose horn;
- trunked-centipede → proboscis with a continuous, smooth trunk.

## Before and after

All "after" sheets come from:

```
node tests/fauna-face-closeups.browser.mjs --label after --out <WP5>/after --port 5255 --live-presets
```

The run produced 41 of 41 sheets with 0 errors and a maximum GPU-lock hold of 6.3 s.

- Before (pre-round): `test-results/fauna-face-eye-round-2026-10-02/before/<name>.png`
- Before WP5 (WP4 merge): `test-results/fauna-face-round-2026-10-02/WP4/closeups-live/`
- After: `test-results/fauna-face-round-2026-10-02/WP5/after/<name>.png`, contact sheet `after/contact.png`

The final set is 12 presets plus specimens: the 12 `preset-*`, 9 `wild-composer-*`, 4 `custom-*`, 4 `plausible-*`, and the 12 `eye-*` / `eye-*-juvenile` sheets.

### Per face

**proboscis** (`preset-trunked-centipede`, `plausible-pachyderm-1`, `custom-giraffe-trunk`, `custom-rhinoceros-trunk`)
- Before: a muzzle skull with a separate trunk tube hung under it, with a visible step, a pinched join and no lip.
- After:
  - an elephant-like domed skull;
  - the muzzle eases (quartic) into the trunk with a worst seam angle of about 5 to 6 degrees;
  - one continuous trunk with a rounded tip and two nostril pits;
  - a lower lip;
  - broad flap ears hanging beside the neck.

**beak + crest** (`preset-shelled-giraffe-bird`, `custom-bird-nasal-horns`, `wild-composer-16-beak-trunk-nasal`)
- Before: a horn blade on the bill.
- After: a low, long keratin casque riding the culmen from the forehead onto the bill base, like a cassowary or hornbill. Paired and ossicones horns build nothing on a beak (`wild-composer-8-beak-trunk-paired`).

**jaws + crest** (`preset-dinosaur`, `plausible-theropod-3`)
- Before: a thin slab floating above the skull.
- After: a fin with real thickness (half-thickness .09 cW) whose base is sunk 0.01 H into the skull along its outline.

**muzzle + paired / ossicones** (`preset-giraffe`, `preset-rhinoceros`, `plausible-ungulate-grazer-2`)
- Before: the ears were deleted when horns were present; horn roots sat behind the cranium.
- After:
  - ears are always built, moved lower, back and outward beside the horn roots;
  - paired roots sit forward on the brow;
  - the giraffe has ears again.

**flat-face** (`preset-ape`, `preset-winged-ape-rhino`, `eye-ape`, `wild-composer-1/31/40`)
- Before:
  - the brow ridge reached down over the upper lid, so the eye read as closed;
  - the winged-ape-rhino had a nose horn.
- After:
  - the brow sits at .32 cH above the eye, and the ape eye macro shows an open eye;
  - a broad low nose and a darker mouth line;
  - no headgear of any kind.

**blunt** (`preset-worm`, `wild-composer-5/26`)
- Before: the mouth disc floated ahead of the cap.
- After: a thin disc draped over the cap, at most .005 H off it. No horns.

**mandibles** (`preset-centipede`, `wild-composer-43/51`)
- Unchanged apart from never building horns (WP1 rule).

**muzzle nostrils**
- Before: buried inside the end cap.
- After: they stand .012 H proud of the cap surface (raycast along the head axis).

## Triangle counts

Counts are per preset: whole skin and head group (head + eyes + mouth + horn + trunk). Base is `179485c`.

| Preset | tris before | tris after | head before | head after | delta | bones |
|---|---|---|---|---|---|---|
| dinosaur | 15872 | 16032 | 2208 | 2368 | +160 | 31 |
| turtle | 12288 | 12288 | 1560 | 1560 | 0 | 21 |
| giraffe | 15116 | 15468 | 2112 | 2464 | +352 (ears restored) | 32 |
| bird | 11900 | 11900 | 1560 | 1560 | 0 | 24 |
| ostrich | 13364 | 13364 | 1560 | 1560 | 0 | 27 |
| rhinoceros | 17684 | 17684 | 2188 | 2188 | 0 | 24 |
| ape | 12024 | 12224 | 1904 | 2104 | +200 (nose, brow) | 20 |
| worm | 6552 | 6492 | 568 | 508 | -60 | 15 |
| centipede | 17636 | 17636 | 1136 | 1136 | 0 | 79 |
| shelled-giraffe-bird | 11752 | 11896 | 1576 | 1720 | +144 (casque 160) | 26 |
| trunked-centipede | 27964 | 27948 | 3072 | 3056 | -16 | 63 |
| winged-ape-rhino | 22088 | 22288 | 1904 | 2104 | +200 | 40 |
| plausible-pachyderm-1 | 12532 | 12636 | 3120 | 3224 | +104 | 30 |
| custom-giraffe-trunk | 16124 | 16204 | 3120 | 3200 | +80 | 38 |
| custom-rhinoceros-trunk | 18616 | 18744 | 3120 | 3248 | +128 | 30 |

Bone counts are unchanged. The proboscis already had 6 trunk bones; WP5 moves them onto the face.

Budgets, all asserted by `tests/fauna-composer-head-geometry.test.mjs`:
- proboscis head group ≤ legacy + 600;
- casque ≤ 160 triangles;
- crest ≤ 200 triangles;
- trunked-centipede < 30000;
- `COMPOSER_BUDGET` over the presets, 256 wild recipes and 256 coherent recipes;
- 48 coherent pachyderms pass `composerStaticBalance`.

`tests/fauna-composer-skin-anatomy.test.mjs` covers the endpoint sweep (70k / 48k worst case).

## Materials and draw calls

The skin is still one geometry with one coloured material (vertex colour plus per-vertex gloss), so one draw call. This is asserted by:

- `tests/fauna-composer-eyes.test.mjs`;
- `tests/fauna-composer-gloss.test.mjs`;
- `tests/fauna-composer-skin-anatomy.test.mjs` (`details().drawCalls === 1`).

## Drift: what changed and what did not

**Versions**
- `COMPOSER_GRAPH_VERSION` is `fauna-composer-graph-3`.
- `fauna-composer-face-geometry-1` is new.
- The skin version string stays `fauna-composer-skin-3`. Every changed skin-3 link fixture entry is repinned in place with its reason instead (see below), as the plan specifies.

**Graph** (`tests/fauna-composer-gait.test.mjs`)
- 17 of the 435 rest digests changed, all of them proboscis recipes. The other 418 are bit-identical.
- New 435 digest: `5bac90d9…55d4a9` (was `3710768d…`).
- Per-preset prefixes: only trunked-centipede changed (`52c8238a70ae7148`). The other 11 are unchanged.
- `HEAD_BONE_COUNTS` are unchanged.

**Skin-3 links** (`tests/fixtures/composer-skin3-links.json`, repinned from the `179485c` pins)
- 19 of 28 entries changed. Each keeps its old pins (`skinWP4`, `glossWP4`) and adds a `faceGeometryDrift` reason.

| Reason | Entries |
|---|---|
| jaws seated crest | 3 |
| muzzle proud nostrils / ears beside horns | 5 |
| flat-face brow, nose, mouth line | 3 |
| blunt draped mouth disc | 5 |
| proboscis | 1 |
| beak casque | 1 |
| jaws paired roots | 1 |

- The 9 unchanged entries are beak, mandibles and jaws-nasal links where nothing new is built.

**Part-diff against the WP4 merge**
- Tool: `tests/tools/composer-part-diff.mjs`. Texts: specimens, graph435 and skin2. Output: `WP5/part-diff.json`.
- 504 recipes, 316 changed, 188 bit-identical, 0 errors.

Recipes with changes, by part:

| Part | Recipes |
|---|---|
| head | 245 |
| eyes | 106 |
| mouth | 92 |
| horn | 86 |
| trunk | 22 |
| torso | 22 |
| leg | 18 |
| arm | 9 |

- **Bit-identical everywhere:** tail, wing, armor, foot and hand.
- **Bones:** they change in 22 recipes, all of them proboscis.
- **Non-proboscis recipes:** they change only in head, eyes, mouth and horn.
- **Proboscis-only torso, leg and arm changes:** these are the neck-junction blend.
  - The proboscis head bone and its neck bones move (new skull proportions), so torso vertices weighted to `neck_*` / `head` follow them. In trunked-centipede, 639 of 2532 torso vertices move, max 17.6 mm, all weighted to head / neck / front torso.
  - The front legs' hip ring is welded to that torso segment. In trunked-centipede leg 7L, 32 of 370 vertices move, max 0.5 mm.
  - The coat colour follows those positions.

## Deviations from the plan text

The trunk deviations below were driven by the seam metrics and the close-ups.

**Trunk root and seam**
- The trunk root is exactly at the tip station centre `(tip.x, tip.y)`, not `(tip.x - .02H, tip.y + .2 tip.h)`. The raised root put the seam off the station and broke the normal-angle gate.
- The muzzle stations are square, with no droop, and ease quartically into the tip section.
- Trunk bone 0 leaves along the head axis rather than at -0.45 rad.
- `PROBOSCIS_TRUNK_BASE = 1`: the base radius equals `min(tip.w, tip.h)`, not 0.9 x. The radius jump at the junction is 0 instead of 10%, and the worst seam normal angle dropped from about 85 to about 5 degrees.
- The muzzle loft keeps a hidden flat disc at the join; it is excluded from the seam check. The trunk keeps the head's 22 radial segments for its first 0.5 join radii, then zips down to 12.

**Trunk frame fix**
- Trunk bones use the frame up reference `(-dir.y, dir.x, 0)`, which keeps their lateral axis on the head's +Z as the trunk curls past vertical.
- The UP-referenced frame flipped there and folded a band of the trunk skin into a "plug" near the tip.
- A test asserts lateral · head-z > .99 for every trunk bone. It was negative-tested by reverting the fix.

**Flap ears**
- Half-axes .21 H x .25 H x .015 H, set out from the cranium and flared 30 degrees back.
- At the planned size (.35 H tall, 20 degrees) they sat inside the neck and were invisible in every view.

**Lower lip**
- Sits at `tip.y - tip.h + .02 cH` so it shows under the trunk base.

**Gloss**
- Gloss stays 0 outside the eyes. The planned .3 gloss on the nostrils and casque was not applied, because the WP3 gloss contract pins non-eye gloss at 0.

**Casque**
- It is lower and wider than the plan (height x .32 instead of .6, half-width .24 to .3 cW), so it reads as a helmet rather than a blade on the bill.
- Colour is `mix(horn, accent, .25)`.

**Unchanged**
- `primateLike` and WP4's eye placement are unchanged.

**Headgear identity test**
- It holds the individual traits fixed (it builds with the 'none' twin's traits).
- `composerIndividualTraits` hashes the whole species recipe, horns included, so coat colours legitimately differ between horn variants.

## Known limitations (deferred)

- **Tight-bend crease:** `resolveRestClearance` (legacy, unchanged) lifts a ground-touching last trunk bone. With long trunks (`trunkLength` 1.4, the pachyderm) this makes a tight bend of about 100 degrees that creases the inner side, and a short trunk lies on the ground with an elbow. A pose-level fix (curling the trunk tip instead of lifting the last bone) is out of WP5 scope.
- **Hardware:** no GPU-hardware or headset validation. The close-ups are desktop renders.

## Tests

- `npm test`: 1143 tests, 1139 pass, 0 fail, 4 skipped.
- `npm run build`: `tsc --noEmit` and `vite build` are green.
- Fast loop, `node --test tests/fauna-composer*.test.mjs tests/creature-lab-state.test.mjs`: 126 of 126 pass.
- `tests/life-cpu-digest.test.mjs`: pass.
