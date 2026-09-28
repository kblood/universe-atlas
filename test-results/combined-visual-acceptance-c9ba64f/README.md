# Combined forest/fauna/ground smoke — c9ba64f

Tested the clean preview at `http://127.0.0.1:5217/`, source `c9ba64f98a7112a2ddaba50c05d48a90dbd3d321`, build-info `dirty:false`. Hardware path: Chromium headless with `ATLAS_HARDWARE=1` (`--use-angle=d3d11 --enable-gpu` on Windows). No page, console, or GL errors were observed.

## Results

- Maithea (`G001/C2128,0,1/0/planet/1`), seed `LETHRA-001`, saved epoch `435084631200000040194500000`; walking remained grounded. Canonical target `...:fauna:562ff898` was present after aiming at its body center. At 8.1m its full body and feet fit in frame; side-view screenshot is `persistent-session/side-body.png`. The 3D model is visible, though its dark shading and understory/tree occlusion still limit visual review.
- The `framed-followup` run used the normal Trees button and loaded detailed forest (`candidate-1`, 25,858,788 retained bytes / 67,108,864-byte limit). This confirms the opt-in package path on this preview. The separate persistent-session date replay used the default basic trees.
- Ground detail on/off screenshots (`framed-followup/02-ground-detail-on.png`, `03-ground-detail-toggled.png`) held the same walker position, exact date, and detailed surface-lighting diagnostics. The on image shows brown textured ground; off shows a flat green fallback. This is a visible material/detail change, not complete ground realism acceptance.
- With time paused, walking moved the target from 8.0m to 80.4m and 100.8m; its canonical ID stayed in `faunaDrawn`, and aggregate near-rig slots were 3 then 6/6. At the longer distances screenshots did not clearly show the animal, and diagnostics are not per-ID rig membership, so this does not verify the 80/95m handoff visually.
- At the same settled camera pose, `advance(5000ms)` advanced the world epoch by 6.8012s. 57 of 66 shared drawn fauna roots moved over 0.1m (maximum 5.93m); the selected target root stayed fixed. Reloading the saved walk URL restored the exact original date and target; walker position differed by 0.000984m. Side images are `persistent-session/side-body.png`, `plus-1_75s-side.png`, `plus-about-50s-side.png`, and `exact-date-return.png` (the `plus-about-50s` filename is historical; its actual delta is 6.8012s).

## Limits and retained failures

`combined-visual-acceptance-c9ba64f/aimed-canvas.png` is the initial, incorrectly framed rear/root aim. The direct-address attempt `framed-followup/failed-target-absent-before-aim.json` records a target absent from the frustum-filtered list before aiming; it reappeared after aiming. `date-motion-followup/failure.json` records that `__atlas.seek()` exits walking mode; it is not an identity failure. The persistent helper’s `advance()` path was used for the successful date movement sample.

The preview exposes aggregate near-rig counts only. The individual’s skinned bone pose and ID-specific 80/95m enter/exit transition were not measured; parent is adding per-member diagnostics for the next build. These captures do not establish final fauna, forest, or landscape visual acceptance.
