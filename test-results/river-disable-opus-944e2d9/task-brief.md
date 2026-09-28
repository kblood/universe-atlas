# Task: Disable river systems on the published Atlas baseline

You are genuine Claude Code Opus 5.5 implementing in the isolated worktree `C:\LLM\IWSDK\universe-atlas-disable-rivers`.

## Baseline and scope

- Required HEAD before edits: `e0d9d9c07509f53fa3a3385afb3e587c9c5b7999` (published main as of 2026-09-28). Verify this with `git rev-parse HEAD`; do not rebase or switch branches.
- Implement the explicit user-authorized temporary removal of inland rivers.
- Keep ocean water, ocean level/date behavior, baseline rocky terrain, landing/walking, forests/fauna, and unrelated controls working.
- Do not touch another checkout or shared source path. This worktree has physical local `node_modules`; do not run npm install/ci or alter dependencies.
- No browser, WebGL/GPU, Blender, download, deployment, or publication work. Focused Node tests and `npx tsc --noEmit`/build are permitted. Avoid full CPU-heavy acceptance suites.
- Do not delete river source modules or historical tests. Preserve code in Git while ensuring normal application paths cannot generate/use/render rivers or carve river channels/banks.

## Required behavior

1. No canonical or regional river generation when a body is visited; no hydrology worker job on focus/approach.
2. No inland channel/tributary/lake-bowl carving, wet-bed surface sampling, bank palette or bank dressing. Baseline landforms and craters remain unchanged except for a clearly versioned model change; dated oceans keep their existing sampler and renderer.
3. No river or region-lake water mesh/environment/reflection in normal game rendering. Ocean mesh/water remains.
4. No river-dependent landing/contact readiness, fine-contact mode, or walking gate. Contact terrain still refines and supports ordinary dry-ground landing/walking.
5. Remove river/drainage UI/actions (find/build/inspect/export/river sites), river-flight behavior, and navigation routes that cause generation. Old URLs containing `river=` must fail safely into ordinary body navigation and show a concise compatibility message that inland rivers and their associated regional lakes are currently unavailable. Do not leave a silent hang or false “ready” state.
6. Make the changed generated-surface semantics explicit in existing model-version/bookmark compatibility. Inspect `CURRENT_VERSIONS`, `TERRAIN_VERSION`, `SURFACE_VERSION`, `BUILD_VERSION` and compatibility UI. Increment the correct terrain/surface model versions and ensure prior versioned bookmarks surface a clear compatibility notice. Do not invent a separate river field unless the established version contract requires it.
7. Lakes: inspect and establish coupling. Current source suggests lake bowls/water/reflections live only inside `RiverRegion` and are produced by `river-generation.ts`; there is no independent lake catalogue. If confirmed, disable those coupled regional lakes with rivers and say so in UI/docs later; preserve unrelated oceans. If you discover separable standalone lake data, keep that path.

## Known code areas to trace

- `src/hydrology-registry.ts`, `src/river-worker.ts`: canonical generation and worker startup.
- `src/terrain.ts`: `terrainSampler`, regional channel/wet/bank changes.
- `src/planet-tiles.ts`: conservative river bed shaping and any river-specific tile behavior.
- `src/world-surface.ts`: wetness, walkability, physical surface version gates.
- `src/planet-renderer.ts`: `RiverWater`, `RiverEnvironment`, `LakeReflection`, hydrology contact/refinement/readiness.
- `src/main.ts`: auto-generation, `selectRiverDestination`, river deep links/URL persistence, UI and buttons, flight/export state.
- `src/time-nav.ts`: bookmark version contract.

Keep architecture coherent: prefer one explicit feature switch or inactive production adapter at the existing boundary over scattered accidental no-ops. But ensure actual surface results no longer depend on attached `body.hydrology` or `body.canonicalRivers` in normal production queries. A test-only/archival river generator may remain callable.

## Tests and completion

- Add or adapt focused Node tests proving ordinary surface samples are independent of attached river/canonical regions, no inland wetness/carve/bank is produced, and an existing ocean sample remains dated and wet as before.
- Cover the old `?river=` URL path and the new version mismatch/compatibility notice. Add a focused normal contact/landing or renderer regression showing hydrology readiness is not a prerequisite.
- Preserve existing river generator tests as historical algorithm tests; do not weaken them. Update only production expectations affected by the new explicit disablement.
- Run the focused relevant test commands, `npx tsc --noEmit`, and `npm run build` if reasonably bounded; record exact commands and pass/fail. Do not claim browser visual acceptance.
- Before finishing, inspect `git diff --check`, summarize exact changed files and how coupled lakes were handled, and commit only your implementation/test paths with a clear commit message. Do not commit artifacts outside the assigned worktree or modify the baseline `main` checkout.

Do not overfit to old comments that describe rivers as a live feature. Verify every user-facing river path and every surface sampler path before reporting complete.
