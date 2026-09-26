# Visual continuity across Atlas scales

## What the current renderer does

- The universe view draws each galaxy from `densityOverview` as an enlarged point cloud and core sprite (`main.ts` `drawUniverse`). The galaxy view replaces this with up to 10,000 addressable catalogue systems plus streamed 32 ly chunks (`star-map.ts`, `galaxy-space.ts`). They use the same underlying density function, but the exterior points and interior stars have different positions, sizes and colors. A fade cannot make them correspond one for one.
- `ViewBlend` holds the outgoing image in camera space and fades it over 700 ms. This conceals a camera jump, but a galaxy or star can visibly change shape and location during the dissolve. Flight crossings already transfer a physical camera pose; the render transition does not use that shared pose to align the two views.
- `drawGalacticSky` puts density samples on a sphere of radius 145 around the viewer. `skyAnchor` follows the camera. This gives a useful far field, but its stars have zero parallax during travel. The local chunks have parallax, creating a perceptual seam.
- The galaxy star shader forces close stars into 2–10 pixel additive glows (`closeSize`), with nearly the same size for many nearby stars. That reads as floating particles. The mapped star sizes also inherit density preview weights, which describe the galaxy's light distribution rather than the apparent brightness of a particular star.
- The physical system handoff begins near `systemBoundary(sys)` after a catalogue point has been magnified; the next view draws resolved stellar and planetary geometry. The two representations do not share a dedicated handoff proxy.

## Visual target

From outside, see a continuous galactic disk, bulge and faint dust structure. Approaching it, the same structure should gain depth while individual catalogue stars become resolvable. Inside, most stars should remain subpixel or a few pixels wide, with brightness varying strongly by distance and intrinsic luminosity. Only the brightest should have a restrained halo. The galactic plane should be brighter and patchier than the poles, with dark dust lanes. Nearby stars should show parallax; very distant light can be treated as diffuse background.

This is a perceptual rendering target. Atlas has a procedural catalogue, not measured Gaia photometry or calibrated dust. Do not describe a brightness or extinction proxy as a physical measurement.

## Recommended implementation order

### 1. Star appearance within the galaxy

Give each addressable star a deterministic luminosity proxy keyed by its existing system ID, preferably derived from the generated stellar mass and temperature when that can be obtained cheaply. Feed the same value to anchor and streamed chunk points. In the shader, derive apparent flux from luminosity and distance squared with a soft floor for readability, then apply a bounded exposure curve. Keep a 1–2 pixel core for most stars and a larger faint halo only for the brightest few. Use a consistent color temperature palette with less saturation. Keep picking radius separate from the visible core.

This is the lowest-risk improvement: catalogue IDs, positions and timeline data stay unchanged. It also makes flying past a nearby star feel less like passing a glowing disc.

### 2. Physically aligned galaxy handoff

For flight crossings, transform the outgoing galaxy cloud into the incoming galaxy coordinate frame using the existing galaxy position, rotation and `LY_PER_MPC`/`GalaxySpace.scale` conversion. Both views should be rendered from the transferred camera pose during an overlap interval. Preserve the exterior density cloud as a distant component of the interior scene while fading its resolved points out with distance. Resolve catalogue stars in over a wider distance band. Keep the present camera-space fade as a fallback for menu navigation and reduced-motion mode.

The exterior density samples will never exactly match individual catalogue stars; continuity comes from retaining the broad field and fading in addressed stars. Avoid making the exterior preview samples selectable or changing canonical star positions.

### 3. Replace the camera-locked stellar wallpaper

Use three depth bands: streamed nearby catalogue stars; a mid-distance, camera-relative density field refreshed from the same procedural galaxy model only after the observer moves a substantial physical distance; and a very distant diffuse galactic plane. Cross-fade old and new mid-distance fields when recentered. Distant emission may have effectively no parallax, but individual points in the mid field should move. Add deterministic dust extinction as a low-frequency optical-depth field evaluated by direction and path length, with dark lanes visible across the disk and reduced extinction away from the plane.

Chunk loading must never change a star's ID or position. Recenter fields before floating-point precision degrades. Do not make thousands of separate meshes; retain batched `THREE.Points` draw calls.

### 4. Star-to-system handoff

At the system boundary, render a shared star proxy in both scenes at the same projected location and match its color/brightness. Scale its halo down as the system's actual stellar disk becomes resolvable. Keep the selected star's identity and camera heading through the handoff. Blend orbital bodies in only when their apparent size warrants it; avoid an immediate full-scale planetary tableau.

## Review criteria

- Fly into a spiral galaxy at different angles: the disk, bulge and dust bands stay aligned; no obvious shape jump at the boundary.
- Fly 10, 100 and 1,000 ly inside a galaxy: nearby points show parallax, distant glow stays stable, and chunk loads do not pop conspicuously.
- Approach a warm, white and blue system: visible brightness and color evolve smoothly into the resolved star; its screen position and heading remain continuous.
- Check dense cores, sparse halos, early eras and galaxies with different morphologies. Compare desktop and standalone headset frame time and draw calls before accepting denser fields or postprocessing.
- Keep reduced-motion navigation, picking, seed determinism, epoch existence gates and deep links intact.

## Sources

- [ESA Gaia all-sky color map](https://www.esa.int/ESA_Multimedia/Images/2020/12/Interactive_map_of_the_sky_from_Gaia_s_Early_Data_Release_3): galactic plane, brightness structure, color and dust obscuration.
- [ESA Gaia three-dimensional stellar nurseries](https://www.esa.int/Science_Exploration/Space_Science/Gaia/Fly_through_Gaia_s_3D_map_of_stellar_nurseries): distance-resolved stars and dust/extinction as ingredients of a 3D view.
- [NASA inverse-square brightness example](https://science.nasa.gov/wp-content/uploads/2023/09/Electromagnetic_Math.pdf): apparent brightness falls with distance squared.
- [Three.js LOD documentation](https://threejs.org/docs/pages/LOD.html): distance-based levels with hysteresis; a conceptual guide for smooth scale bands.
- [Three.js guide to batching many objects](https://threejs.org/manual/pages/optimize-lots-of-objects.html): draw-call cost supports batched star fields.
- [Three.js camera guide](https://threejs.org/manual/pages/cameras.html): near/far depth precision constrains astronomical scale changes.

## Implementation update — 2026-09-25

- Addressable star points now use a stable per-ID luminosity display proxy and a distance-dependent optical point profile. The picking targets and catalogue identities are unchanged.
- Automatic flight crossings now retain the outgoing view for a short overlap and place it in the incoming view's physical coordinate frame. Menu navigation keeps its prior camera transition, and immersive mode avoids the extra overlapping draw.
- The galaxy interior retains a batched density field at physical positions. It uses the same deterministic overview sample stream as the exterior galaxy, so the first exterior samples correspond to interior samples. It fades near the observer where catalogue stars take over, and includes a bounded procedural dust attenuation in spiral disks.
- A subpixel stellar point remains visible inside the physical system view until the resolved star disk becomes large enough. Its color moves from the catalogue color toward the current stellar lifecycle color.

These are visual rendering proxies. The luminosity scatter and dust attenuation are not calibrated photometry. A camera-following very distant sky remains in the system view, where travel distances are tiny compared with galactic distances. In-headset visual review and performance comparison remain to be done.
