# Fauna face and eye round: plan and WP1 face contract (2026-10-02)

The machine-readable plan is `docs/fauna-face-eye-round-plan-2026-10-02.json`. This page records what WP1 (the face contract) put in place, so the later packages and any reviewer can check it without reading the code.

The owner asked for three things:

- the trunk becomes a face type;
- eyes get realistic types;
- horns go away from faces where they make no sense.

WP1 is the contract and a digest-neutral shim. It does not add new face geometry or new eye geometry. WP4 adds the eyes; WP5 adds the real proboscis face.

## Versions

| Thing | Value |
|---|---|
| Recipe | `COMPOSER_RECIPE_VERSION = 3`. Text is `v3*...`, and `v1*` and `v2*` still decode. |
| Face rules | `COMPOSER_FACE_VERSION = 'fauna-composer-face-1'` (`src/fauna-composer-face.ts`, pure, no imports) |
| Skin / graph | Unchanged (`fauna-composer-skin-2`, graph-2). The builder is unchanged; the recipe's meaning changed. |
| Encoded keys | Append-only: 26 v1 keys, then 38 v2 keys (`COMPOSER_V2_KEYS`, frozen), then `eyes` and `iris`. `trunk` keeps its encoded position. |

## Face and trunk

- `head` gains a seventh value, `proboscis`, labelled "Proboscis / trunk (elephant, tapir)". The control is labelled "Face".
- `trunk` is derived from the face: `trunk = head === 'proboscis' ? 'trunk' : 'none'`. It is no longer an edit of its own. The Lab removes it from the "Head and neck" group, and labels `trunkLength` "Proboscis length".
- In WP1, `composerSkullOf('proboscis') = 'muzzle'`. The rig and mesh therefore build a proboscis face exactly like a legacy muzzle with a trunk, apart from the horn rules below.
- Legacy migration (v1 and v2 text and objects) uses `migrateLegacyFace`:
  - a muzzle with a trunk becomes `head = 'proboscis'`, with the issue `Trunk: now a face type; this muzzle became Face = Proboscis.`
  - a trunk on any other face is removed and the face is kept, with the issue `Trunk: removed. A trunk is a nose and only grows on a mammal muzzle; this <face> face is kept. Choose Face -> Proboscis for a trunk.`
- A v3 text whose `trunk` field disagrees with its face gets the issue `Trunk follows the Face; trunk field ignored.`
- A v3 (or version-less) object with a stale `trunk:'trunk'` is ignored silently. A Lab edit from proboscis back to muzzle does not re-promote.
- The species key (`composerSpeciesKey`) hashes `composerAnatomyProjection(recipe)`, which maps proboscis to muzzle. Migrated muzzle-plus-trunk links therefore keep their herds. `eyes` and `iris` are species keys, but they are not anatomy, so they are not hashed.

## Headgear rules (`FACE_HEADGEAR[face][horn]`)

The mesh builds `composerHeadgearBuild(recipe).built`, never the raw choice. The chosen value stays in the recipe, so the link keeps it. Whenever built differs from chosen, the constraint list carries exactly one `{part: 'Horns', chosen, effect}`.

| Face | none | nasal | paired | ossicones | crest |
|---|---|---|---|---|---|
| muzzle | none | nasal | paired | ossicones | **not built** (1) |
| proboscis | none | **not built** (2) | paired | **not built** (3) | **not built** (4) |
| jaws | none | nasal | paired | **paired** (5) | crest |
| beak | none | **crest** (6) | **not built** (7) | **not built** (7) | crest (casque) |
| flat-face | none | **not built** (8) | **not built** (8) | **not built** (8) | **not built** (8) |
| blunt | none | **not built** (9) | **not built** (9) | **not built** (9) | **not built** (9) |
| mandibles | none | **not built** (10) | **not built** (10) | **not built** (10) | **not built** (10) |

The effect strings, verbatim:

1. `Not built: mammal skulls carry no bony crest. Choose Paired horns or Ossicones.`
2. `Not built: a trunk face has no nose bones to carry a horn.`
3. `Not built: ossicones grow only on giraffe-like muzzles.`
4. `Not built: mammal skulls carry no bony crest.`
5. `Built as brow horns: ossicones grow only on giraffe-like muzzles.`
6. `Built as a casque: a beak carries a casque, not a nose horn.`
7. `Not built: birds and turtles never grow horns; only a casque (Crest).`
8. `Not built: primate faces carry no horns.`
9. `Not built: a worm head has no skull to carry horns.`
10. `Not built: arthropod heads carry no bony horns.`

Of the 35 cells, 20 are disclosed, and 18 of those build nothing. The Lab labels `horns:crest` "Crest or casque".

The two v2 rules "Trunk" and "Horn" are gone, and `composerFaceConstraints` replaces them.

## Eyes and iris (`resolveComposerEyes`)

- `eyes`: `auto`, `round`, `horizontal`, `vertical-slit`, `compound`, `eyespot`.
- `iris`: `auto`, `dark-brown`, `brown`, `amber`, `gold`, `yellow`, `orange`, `red`, `green`, `pale`. The starting linear-RGB values are in `COMPOSER_IRIS_RGB`, and WP4 may tune them and pin them.
- Allowed explicit eye types (`FACE_EYES`):
  - vertebrate faces (muzzle, proboscis, jaws, beak, flat-face): round, horizontal, vertical-slit;
  - mandibles: compound;
  - blunt: eyespot.
- What `auto` builds depends on anatomy only:
  - mandibles: compound;
  - blunt: eyespot;
  - beak, flat-face, proboscis: round;
  - muzzle:
    - hoof feet or unguligrade legs: horizontal;
    - otherwise pillar legs: round;
    - otherwise body under 0.9 m: vertical-slit;
    - otherwise: round;
  - jaws: vertical-slit if sprawled or limbless, otherwise round.
- Iris bands for `auto`. The band is `faceHash('face-eye-v1/<colorSeed>/<face>') % bands`, so colorSeed picks only the band, never the eye type.
  - muzzle: [amber, gold] for a slit pupil, otherwise [dark-brown, brown];
  - proboscis: [dark-brown];
  - jaws: [gold, amber, orange, green];
  - beak: [dark-brown, green] if sprawled, otherwise [yellow, orange, red, dark-brown];
  - flat-face: [dark-brown, brown];
  - compound eyes and eyespots have no iris.
- Placement profile (`FACE_EYE_PROFILE`, as gaze yaw in degrees and k), for WP4:

  | Profile | Gaze yaw (deg) | k |
  |---|---|---|
  | flat-face | 15 | .13 |
  | muzzle-carnivore | 35 | .13 |
  | muzzle-grazer (hoof, unguligrade or pillar) | 65 | .14 |
  | jaws-upright | 45 | .13 |
  | jaws-sprawled | 70 | .13 |
  | proboscis | 70 | .07 |
  | beak | 75 | .16 |
  | mandibles | 90 | 0 |
  | blunt | 20 | 0 |

- Eye disclosures:
  - `Built as compound: arthropod heads have compound eyes.`
  - `Built as eyespot: a worm head has only pigment eyespots.`
  - `Built as <auto>: compound eyes belong to arthropod heads.`
  - `Built as <auto>: eyespots belong to worm heads.`
  - The iris disclosure is `Iris colour has no effect: compound eyes and eyespots have no iris.`
- Pinned preset eyes:

  | Preset | Eyes | Iris |
  |---|---|---|
  | dinosaur | round | gold |
  | turtle | round | green |
  | giraffe | horizontal | dark-brown |
  | bird | round | yellow |
  | ostrich | round | dark-brown |
  | rhinoceros | round | dark-brown |
  | ape | round | dark-brown |
  | worm | eyespot | (none) |
  | centipede | compound | (none) |
  | shelled-giraffe-bird | round | orange |
  | trunked-centipede | round | dark-brown |
  | winged-ape-rhino | round | dark-brown |

## Preset redesign (coordinator decision, reversible)

The coordinator decided that a preset shows what is built. Three hybrid presets would otherwise demonstrate a disclosure, so they were redesigned:

| Preset | v2 | v3 |
|---|---|---|
| shelled-giraffe-bird | beak + ossicones (not built) | beak + **crest** (a casque) |
| trunked-centipede | muzzle + trunk + nasal | **proboscis** + **none** (the face stays readable as a trunk face) |
| winged-ape-rhino | flat-face + nasal (not built) | flat-face + **none** |

Hand-made links and legacy links keep their own choices and get the disclosure instead. A v1 preset link is matched on its legacy v1 values through `composerLegacyPresetId`, so it still names its preset. It adopts the preset's later species values, keeps its legacy horn, and shows the "Horns" disclosure for it.

To reverse the redesign, restore the three `horns` values in `COMPOSER_PRESETS` and empty `LEGACY_PRESET_V1` in `src/fauna-composer-recipe.ts`. The test expectations to revert are in `tests/fauna-composer-face.test.mjs` ("presets", "species keys") and `tests/fauna-composer-individual.test.mjs`. The only species keys this changes are these three, which is a deliberate change from the plan's "all 12 preset keys unchanged":

| Preset | v2 key | v3 key |
|---|---|---|
| shelled-giraffe-bird | 748663b7 | e700c3b3 |
| trunked-centipede | 828cd7f5 | 9be9b54f |
| winged-ape-rhino | 16a054f6 | 8d0da7dd |

The trunked-centipede key changes only because of its horn. With the legacy nasal horn, the proboscis face projects to the old key 828cd7f5, and the test asserts this.

## Generators

- The wild stream draws exactly as before through `drawComposerRandomV1`, which uses the frozen six-face list `COMPOSER_V1_FACES` so that the seventh face does not shift draws. `randomComposerRecipe` then applies a post-pass:
  - a muzzle with a trunk becomes proboscis, and any other trunk becomes none;
  - horns become the built kind;
  - eyes and iris become auto;
  - the recipe is normalized.
- The coherent species generator keeps every draw. It applies the same trunk rule and sets horns to the built kind.
- Verified against `tests/fixtures/composer-baseline-v2.json`, which was captured from the unmodified v2 code at a9e3654:
  - all 256 wild and 256 coherent seeds are equal in every field except head, trunk, horns, eyes and iris;
  - 1000 wild plus 1000 coherent seeds produce 0 headgear or trunk violations.

## Legacy counts (asserted)

- Over the 420 unique legacy v1 texts:
  - 0 errors;
  - 16 muzzle-plus-trunk texts become proboscis;
  - exactly 78 trunks are removed;
  - chosen horns are kept verbatim.
- Over the 28 skin-2 texts: 1 becomes proboscis and 2 trunks are removed.
- Species keys equal the baseline for every text except the 80 dropped-trunk texts.

## Repins (each with its cause)

- **Skin-2 links** (`tests/fixtures/composer-skin2-links.json`): exactly 13 of 28 were repinned. Each entry carries `driftFromV2` and its `previous` pin. The other 15 are bit-identical.

  | Preset link | Layout | Face | Horn chosen -> built | Trunk | Triangles | Bones | Cause |
  |---|---|---|---|---|---|---|---|
  | shelled-giraffe-bird | biped | beak | ossicones -> none | - | 12168 -> 11528 | 26 | horn not built |
  | trunked-centipede | many-legged | muzzle (becomes proboscis) | nasal -> none | kept | 28168 -> 27804 | 63 | horn not built |
  | winged-ape-rhino | quadruped | flat-face | nasal -> none | - | 22244 -> 21880 | 40 | horn not built |
  | - | biped | jaws | crest -> crest | dropped | 15260 -> 13964 | 38 -> 32 | trunk dropped |
  | - | quadruped | blunt | paired -> none | - | 12352 -> 11956 | 24 | horn not built |
  | - | biped | flat-face | crest -> none | - | 10656 -> 10640 | 22 | horn not built |
  | - | quadruped | beak | nasal -> crest | - | 14668 -> 14320 | 27 | horn built as casque |
  | - | limbless | muzzle | crest -> none | - | 9692 -> 9676 | 26 | horn not built |
  | - | quadruped | blunt | ossicones -> none | - | 10568 -> 9928 | 26 | horn not built |
  | - | biped | blunt | none | dropped | 14020 -> 12724 | 35 -> 29 | trunk dropped |
  | - | many-legged | jaws | ossicones -> paired | - | 27784 -> 27540 | 104 | horn built as brow horns |
  | - | sprawled | mandibles | crest -> none | - | 9280 -> 9264 | 26 | horn not built |
  | - | biped | beak | paired -> none | - | 11704 -> 11308 | 18 | horn not built |

- **Graph rest digest** of the 435 neutral recipes (`tests/fauna-composer-gait.test.mjs`): `616ab685...` became `3710768d...`.
  - Recipe by recipe against a9e3654, 81 digests changed, and all 81 are dropped trunks (78 legacy texts and 3 random draws).
  - The per-preset digest prefixes are unchanged.
- **Bone counts** (`tests/fauna-composer-rig-independent.test.mjs`): mixed-0, mixed-1 and mixed-2 each lose 6 trunk bones (42 to 36, 40 to 34, 38 to 32).
  - The boundary cases now choose `head: 'proboscis'`, so the worst case keeps its trunk and its 142 bones.

## Deviations from the JSON plan (for integration)

- **Ear gate.** In `mesh.ts` the ear gate reads the built headgear, not `r.horns`. Without this, proboscis + ossicones (omitted) would hide the ears and would not be bit-identical to `none`.
- **Rig `primateLike`.** (`rig.ts`, the quadruped fore-limb phase order) still reads `recipe.horns`, the chosen value. A flat-face quadruped with a chosen but omitted horn (for example a legacy winged-ape-rhino link) therefore keeps the non-primate walk phase it had in v2. Its rest skeleton and skin are not affected. Switching to the built horn would change the motion of those links, so the decision is left to WP5, which owns `rig.ts` next.
- **"Bit-identical to none" holds at variability 0.**
  - An omitted horn is still part of the species identity, by the plan's design that herds never re-roll. With variability above 0 the species key seeds the individual draw, so an ape + nasal individual differs from an ape + none individual of the same seed.
  - At variability 0 (the type specimen), every skin array is identical, and the structure test asserts this for all 18 omitted cells.
  - At the preset variability, the test asserts only that no horn part is built.
- **`tests/creature-lab-state.test.mjs:130`** (owned by WP6) still expects `/^v2\*/`. A re-shared link is now `v3*`, so the one-line fix is `/^v3\*/`. This is the only failing composer fast-loop test.
- **`tests/fauna-composer-face.test.mjs`** must be registered in `package.json` by the coordinator.
