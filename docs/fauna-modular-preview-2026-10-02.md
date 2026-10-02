# Modular Creature Lab: deployed desktop preview

Published 2 October 2026. Status: **experimental procedural prototype**.

[Open Creature Lab](https://dionysus.dk/webxr/IWSDK/universe-atlas/fauna-preview-20261002-01/creature-lab.html?mode=composer).

## What is available

Opus 5.5 implemented nine editable starting points inspired by dinosaurs,
turtles, giraffes, birds, ostriches, rhinoceroses, apes, worms and centipedes.
Three additional presets demonstrate cross-family hybrids. The composer uses
distinct limbless, biped, quadruped, sprawled and many-legged skeletons.

Body shape, head, neck, horns, legs, feet, arms, hands, tail, armor, wings and
trunk can be selected independently. Proportions and colour can also be edited.
Applied compatibility adjustments are shown in the panel. Grounded motion,
repeatable random recipes, comparison and exact recipe/pose links are included.
The earlier Planet skin and Blender reference modes remain available.

## Try it

1. Choose a preset in the Modular composer panel.
2. Edit parts under Body, Head and neck, Legs and arms, or Wings and tail.
   For example, add a shell and wings to a long-necked animal.
3. Use the seed controls for repeatable random combinations.
4. Enable comparison and choose First or Second to edit each animal separately.
   Both are shown at a shared metre scale.
5. Choose a motion, pause it, and set a time or scrub within the cycle.
   Skeleton and neutral-material views help inspect the result.
6. Use **Copy specimen link**. Reopening it restores both recipes and opens
   paused at the shared pose. A visible link field is offered if clipboard
   access is unavailable.

## Release identity

| Item | Value |
| --- | --- |
| Application source | `9d3b84cd58f3e84640ab337c429d7b91597758e8` on `main`, clean at build |
| Shared IWSDK tooling checkpoint | `0106675` |
| Build timestamp | `2026-10-02T16:13:51.817Z` |
| Upload completed | `2026-10-02T16:16:21.997Z` |
| Deployment directory | `universe-atlas/fauna-preview-20261002-01/` |
| Packaged content | 52 files, 25,416,232 bytes, plus the preview manifest |
| Manifest SHA-256 | `c007e36dc3916c8c9cdec36a3c2e25dbea77f71ea4ac7d2a69e0e28182e075af` |

The [live build stamp](https://dionysus.dk/webxr/IWSDK/universe-atlas/fauna-preview-20261002-01/build-info.json)
and [preview manifest](https://dionysus.dk/webxr/IWSDK/universe-atlas/fauna-preview-20261002-01/preview-manifest.json)
identify the source and exact served bytes. Documentation commits after the
release do not change its application build identity.

The preview contains Creature Lab and its built dependencies in a dedicated
static directory. Navigation returns to the existing Atlas and other labs.
Its Blender reference defaults to preserved candidate027; immutable021 and027
archives remain available for pinned replay. The source repository's default
reference remains021. No new Blender asset was generated for this deployment.

## Verification performed

- `npm run build`: TypeScript and production build passed. Vite retained its
  existing large-chunk warning for the shared physics bundle.
- Final `npm test`: **955 tests, 951 passed, four skipped, zero failed**. This
  includes the newly registered composer and independent recipe/rig/geometry
  suites after Opus's final repairs.
- The existing independent UI browser suite passed against both the packaged
  static output and the public HTTPS URL. Coverage includes all 12 presets,
  independent edits, visible constraints, seeded replay, two-animal comparison,
  exact shared recipe/pose replay, playback, invalid-link recovery, resource
  cycles, gallery return and a mobile viewport capture. No page errors occurred.
- Every public packaged file matched its local size and SHA-256 over HTTPS.
  Apache's protected `.htaccess` was verified by SSH SHA-256. The live manifest
  also matched exactly.
- The final specimen sheet and packaged comparison screenshot were inspected.
  Shapes and mixed parts are readable; the surfaces remain stylised. Browser
  checks use headless Chromium with software rendering and do not qualify
  hardware frame rate or headset performance.

Evidence is retained locally under
`test-results/fauna-opus-modular-001/`: `deploy-build.log`,
`deploy-cpu-suite.log`, `preview-static-browser-002/`, `preview-live-browser/`,
`live-byte-verification.json`, `deploy-receipt.json`, and
`independent-visual-opus-final/`. The earlier run named `preview-static-browser/`
used an already occupied port and is not the packaged-output acceptance record.

## Deployment procedure and retained artifacts

The prepared scripts in that evidence directory were executed in this order:

```powershell
npm run build
npm test
node test-results/fauna-opus-modular-001/build-preview.mjs
# Run the browser suite against the packaged site using ATLAS_URL/ATLAS_RESULTS.
node test-results/fauna-opus-modular-001/deploy-preview.mjs --publish
node test-results/fauna-opus-modular-001/verify-live-preview.mjs
# Run tests/fauna-composer-ui.browser.mjs against the public preview URL.
```

The immutable package is retained at
`C:/LLM/IWSDK/Assets/_assetctl/fauna-modular-preview-001/site` with its upload
archive alongside it. The uploader uses a fresh staging directory, validates
the package manifest, and promotes to an absent preview destination. Future
releases need a new package directory and preview slug; these scripts deliberately
refuse to overwrite this checkpoint. Previous application URLs remain usable.

## Remaining work

- More realistic anatomy, surfaces, proximal limb masses and part transitions.
  The current parts are procedural lofts with vertex colours.
- Improved folded wings and armor edges: a small rear armor-band lip remains.
  Wings articulate while grounded; flight is not simulated.
- Broader collision and deformation qualification. Sampled floor checks are
  not continuous collision proofs or guarantees for every possible recipe.
- Authored reusable modules, growth beyond simple size changes in composer
  mode, and eventual runtime/device qualification. No headset test is claimed.

This publication completes the first modular preview milestone in the
[composer plan](fauna-modular-composer-plan-2026-10-02.md). The broader
[fauna realism plan](fauna-blender-morph-plan-2026-10-02.md) remains active.
