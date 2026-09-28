# Desktop surface lighting

Implemented and checked in the actual desktop game; final realism and performance
acceptance remain open.
The current deployed build is still `8e16776`.

The normal planet panel now offers **Surface lighting: detailed/basic**. The
choice persists in the URL (`lighting=0` selects basic). Detailed lighting uses
the existing dated stellar sun, ACES exposure, and planetary spin compensation.
An atmospheric hemisphere fill reduces the existing ambient contribution while
adding directional sky and ground light. Fill fades toward orbit and night;
airless worlds receive no atmospheric fill. XR keeps the prior lighting profile.

One 2048² PCF shadow map covers a 320 m square around the observer's ground
projection. Its 1,000 m depth interval and 6 cm normal bias scale with renderer
units. The target snaps to a planet-relative texel grid, preserving its phase
when the renderer rebases. Shadow strength fades between 300 and 700 m altitude
and around sunset. This is a bounded local shadow region, not planetary terrain
occlusion or cascaded shadows. Lateral map-edge transitions still need visual
assessment.

Terrain, nearby legacy/detailed trees, ground flora and instanced fauna cast and
receive shadows. Terrain depth uses the same morph and edge-lock expressions as
its colour pass. Legacy tree depth uses the same canonical coverage mask as its
colour pass, including hidden slots replaced by detailed assets. Detailed trees
retain their existing wind and leaf-alpha depth hooks. The distant census canopy
does not cast local shadows.

The local sun frustum participates in terrain and life retention, so turning
away from a nearby caster does not automatically erase its shadow. Terrain's
standard camera culling uses bounds enclosing both morph endpoints. The same
bounded forest/life instance capacities apply, but retaining off-camera casters
can add CPU work and vertex submissions; a small map alone does not eliminate
those costs. Near/mid tree batches still submit their retained instances to the
shadow pass and clip outside the volume.

The main scene updates the shadow map once per frame, including when clouds
capture that scene. Lake reflections reuse the previous map. Profile scene GPU
times include shadow work; they are not separate shadow-pass measurements.

## Evidence

- [Focused CPU tests](../test-results/surface-lighting/cpu.log): 69 passed,
  including physical scale, rebase, daylight, morph/depth agreement, canonical
  coverage, off-camera forest retention and existing life/forest regressions.
- [Production build](../test-results/surface-lighting/build.log): TypeScript and
  Vite pass; the existing large bundle warning remains.
- Luna's [actual-game record](../test-results/surface-lighting/README.md) covers
  the ordinary Find Life route, same-pose control toggling at 195 m and 11.7 m,
  and a dated seek. Both runs had zero browser/GL errors; close screenshots show
  ground contact shadows. Source hashes match `2f1a6c5`.
- At 11.7 m on the RTX 5090, detailed/basic frame intervals were approximately
  53.1/51.2 ms median and 66.2/61.5 ms p95. Planet-update CPU medians were
  34.4/35.0 ms; instrumented GPU pass-sum medians were 10.81/9.47 ms. These
  short sequential samples include each mode's caster-retention workload.
  They neither isolate shadow cost nor establish a hardware floor or 60 FPS.
- A CPU trace identifies repeated forest/canopy lookup work and unchanged life
  packing as optimization targets. Follow-up work prioritizes camera-visible
  plants/animals before off-camera casters and retains packed life data between
  actual changes. Those revisions require a new browser comparison.

The close view still has faceted crowns, dark undersides and strongly contrasted
shadows. Detailed-family wind/depth integration, foliage mip correction and
lateral map-edge fading still need their combined game check.

The implementation uses Three's existing directional shadow machinery. See
[LightShadow](https://threejs.org/docs/pages/LightShadow.html) for the distinct
normalised depth bias, normal offset, map-size and update controls. The installed
Three source is authoritative for Atlas's pinned runtime version.
