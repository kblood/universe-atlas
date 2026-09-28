# Detailed forest integration run

This is a narrow hardware integration check for the experimental Atlas EZ-Tree family F in the actual planet renderer on the local development server. The run used the normal LETHRA-001 → Maithea Find Life route, then loaded the preserved LOD0/LOD1 GLBs through `window.__atlas.loadForestTreeAssets` with forest coverage enabled by the game and leaf transmission factor `0.35`.

## Verified run

- [Final report](hardware-family-f-verified/report.json) and [provenance receipt](hardware-family-f-verified/provenance.json)
- Screenshots: [installed family](hardware-family-f-verified/detailed-forest-initial.png), [one-year seek](hardware-family-f-verified/detailed-forest-date-shift.png), [date return](hardware-family-f-verified/detailed-forest-date-return.png), and [after movement](hardware-family-f-verified/detailed-forest-after-movement.png)
- Hardware: NVIDIA RTX 5090 through ANGLE/D3D11. The report records `glError: 0`, no page or console errors, and local aerial hook diagnostics `24/24 attached`, with no failures.
- Detailed resident counts were `[0, 206]` initially and `[10, 159]` after 316.87 m of keyboard movement. The renderer's forest origin threshold is 256 m; origin version advanced from 13 to 15 during that movement.
- The dated catalogue contained five tree species. Eight bounded diagnostic samples had identical canonical IDs, species IDs, recipe fingerprints, physical heights, and deterministic `windPhase01` values after a one-year date seek and return.

The screenshots show that the family renders in the actual scene and both LOD batches acquire residents. The far legacy fallback crowns remain visibly faceted; the close detailed foliage looks sparse and dark in this scene. This check does not establish visual realism, performance, shadow-pass coverage, or a controlled comparison of coverage values 0, 0.5, and 1. The date replay compares catalogue/presentation diagnostics; it does not prove pixel-identical animated wind. No image pixel-difference claim is made.

## Preserved attempts

- `hardware-family-f/` preserves the first failed harness attempt. It reached the populated scene, then closed while Playwright serialized both GLB buffers as `page.evaluate` arguments.
- `hardware-family-f-upload/` preserves the file-input retry. It completed the installation and date checks but failed on a Playwright key-name typo (`shift`).
- `hardware-family-f-final/` preserves another successful date/local-aerial pass that failed on the same key-name typo in the key release.
- `hardware-family-f-verified/` is the successful run after switching to browser file inputs and the valid `Shift` key name.

The runner now hashes all seven integration source files, both GLBs, and itself before and after a run, and fails if those inputs change during execution. The final GPU run preceded commit `474c944`; that commit contained the same bytes for the five runtime files captured during the run. The report's base worktree was dirty because parent-owned integration work was in progress. `provenance.json` records the tested base, post-run commit, raw and LF-normalized hashes for the five run-snapshotted runtime files, current-only hashes for `src/main.ts` and `src/forest-tree-catalogue.ts`, asset hashes, report and screenshot hashes.
