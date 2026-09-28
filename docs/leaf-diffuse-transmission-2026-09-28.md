# Leaf diffuse transmission: implementation note

_Research and implementation proposal, 2026-09-28. No runtime implementation
or visual acceptance is included in this note._

## Current support gap

Atlas foliage uses `MeshPhysicalMaterial` through `super-three@0.181.0`, loaded
with Three.js's `GLTFLoader`. That material supports specular reflection and
glass-like transmission, but the local material and loader sources contain no
`diffuseTransmission` property or `KHR_materials_diffuse_transmission` handler.
The asset pipeline's glTF-Transform 4.4.1 extension package does define and
serialize the extension. That is authoring/transport support; it does not make
the runtime render the effect.

The current visible problem is foliage that stays dark on its backlit side.
Changing exposure or base color globally would also alter bark, ground, sky,
and unlit foliage areas, so it would conceal rather than solve the lighting
gap.

## Recommended next step

Prototype a small, opt-in material shader hook for thin leaves, guided by
`KHR_materials_diffuse_transmission`, while retaining the existing
`MeshPhysicalMaterial` PBR path. The extension models a thin-surface Lambert
diffuse BRDF/BTDF energy split: transmission moves a proportion of the
non-specular diffuse response from reflection on the lit side to diffuse
transmission on the opposite side. Specular reflection and Fresnel weighting
remain intact. This is diffuse light through a thin surface, not refracted
glass transmission.

Keep the first experiment narrowly scoped to foliage material data and the
physical shader's diffuse-light terms. Preserve existing base color, alpha
mask, normal-map, roughness, wind, and shadow behavior. Do not replace the
physical shader with the Three.js example `SubsurfaceScatteringShader`: that
example is a GDC 2011 approximate Phong/additive scattering effect, not the
same energy-conserving PBR contract.

### Concrete adapter shape in the current tree loader

`src/tree-asset.ts` imports each LOD through `GLTFLoader`, shares the LOD0
materials with LOD1 after checking its material and texture identity, then
calls `deform()` on every shared material. The leaf material is named
`MAT_AtlasFoliage`; the adapter can limit the diffuse-transmission hook to that
material. `deform()` currently owns `onBeforeCompile` and sets a fixed
`customProgramCacheKey`, so transmission must compose with this hook rather
than replace it. The hook should preserve the current vertex edits for
`_leaf_pivot`, `_wind`, normal, and tangent. The custom depth and distance
materials should keep the existing deformation and alpha mask only; diffuse
transmission changes color lighting, not depth or shadow silhouettes.

For the color shader, use the pinned `super-three@0.181.0` physical-lighting
chunks as the injection boundary, with fail-closed source checks against the
expected chunk contents:

1. In `lights_physical_pars_fragment`, adapt `RE_Direct_Physical`'s diffuse
   accumulation to split the Lambert term by `T`: front-side irradiance gets
   `(1-T) * baseColor`, and opposite-side irradiance gets `T * transmissionColor`.
   Keep the existing direct specular, clearcoat, and sheen expressions
   unchanged. This is where directional, point, and spot-light shadowing has
   already multiplied the light color, so using the same `directLight.color`
   preserves the shadow result.
2. Extend the indirect-light path to carry irradiance from the opposite
   hemisphere alongside Three's existing irradiance. `lights_fragment_begin`
   evaluates ambient, light-probe, and hemisphere contributions; evaluate
   directional probe/hemisphere terms for `-geometryNormal` as well.
   `lights_fragment_maps` adds light-map and environment terms, so decide and
   test their directional treatment there rather than silently treating all
   of them as front-side light.
3. Split the indirect diffuse accumulation in both
   `RE_IndirectDiffuse_Physical` and the diffuse portion of
   `RE_IndirectSpecular_Physical`. Three accumulates environment-related
   diffuse in the latter after specular multiscattering compensation; changing
   only the direct-light function or `RE_IndirectDiffuse_Physical` would leave
   some diffuse illumination unsplit. Leave its specular radiance and
   multiscatter calculations unchanged.

Use a uniform `diffuseTransmissionFactor` initially, with an optional
transmission color factor. If textures are added, sample a linear scalar from
the extension's alpha channel and sRGB-decode its color texture through the
normal Three texture path. The render hook is an extension-guided prototype;
GLTFLoader currently ignores this extension and the tree adapter rejects any
`extensionsRequired`. Until there is an explicit asset-to-material contract,
feed the opt-in values through a lab-only parameter or loader plugin rather
than implying imported extension values are active. A future parser change
must distinguish optional from required extensions instead of rejecting all
required extensions indiscriminately.

The adapter must use the final `geometryNormal` after
`normal_fragment_begin` and `normal_fragment_maps`. Three flips that normal
for `DoubleSide` using `gl_FrontFacing` and adjusts tangent-frame direction
before applying tangent-space maps. Atlas's wind deformation also rotates the
leaf normal and tangent in `beginnormal_vertex`. Computing the light-side test
from the undeformed attribute normal, the geometric face orientation, or a
separate unflipped normal would give incorrect results on back faces or moving
leaves. The transmission term should therefore be inserted in the lighting
functions, after the normal map has been applied, and use the same
view-facing shading normal as the existing BRDF.

Three's rectangle-area-light diffuse term is accumulated through
`RE_Direct_RectArea_Physical`, separately from `RE_Direct_Physical`; a
directional-light-only patch is not full support. Indirect lightmaps also do
not expose the original incident direction. The first controlled experiment
can either implement and validate those paths or explicitly limit its claim to
the light types and indirect sources it handles. Do not claim extension
conformance until all supported direct and indirect paths, including Fresnel
and specular preservation, have been checked.

The glTF extension is currently marked **Release Candidate**. A runtime hook
should therefore be described as an implementation guided by the extension,
not claimed conformant until its complete required behavior is verified. Do
not upgrade Three.js solely in expectation of support; first verify a released
version's material and loader implementation and test it with Atlas's runtime.

## Validation before adoption

Use one neutral leaf fixture and one current tree fixture with fixed exposure,
environment, sun, and camera. Compare front lit, back lit, grazing, and
shadowed leaves while changing only diffuse-transmission inputs. Confirm:

- diffuse reflection and diffuse transmission exchange energy without
  increasing the combined diffuse response;
- front and back direct-light cases for directional, point, spot, and area
  lights, plus the implemented indirect/environment sources, preserve the
  expected energy split;
- Fresnel/specular response is numerically unchanged as transmission varies,
  while direct shadows still attenuate the transmitted diffuse term;
- the standard glTF tangent-space normal convention (+Y) remains correct, and
  `DoubleSide` does not invert the transmission side or break normal mapping;
- base color, alpha coverage, wind motion, and ordinary non-leaf PBR materials
  match the baseline when transmission is zero;
- the effect improves the dark backlit foliage case without changing global
  exposure or brightening unlit surfaces.

Check shader replacement counts and program-cache keys as part of the adapter
tests. A missing or changed Three shader anchor should fail the prototype
closed rather than silently compiling an unmodified or partially modified
shader. Test zero transmission against the current baseline, then increase the
factor in controlled steps on both sides of a thin plane before testing the
tree fixture. Include a wind pose and both face orientations to catch normal
and tangent sign errors.

Keep transmission opt-in and disabled by default until these checks pass.
Measure shader cost on the target desktop profile before extending the path to
Quest. A plain RGB leaf asset can use a material factor first; texture-driven
factor/color inputs should wait until the runtime and asset round trip are
verified.

## Sources

- Khronos [`KHR_materials_diffuse_transmission` specification](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_diffuse_transmission/README.md) — status, thin-surface model, energy split, and texture channels.
- Three.js [`MeshPhysicalMaterial` reference](https://threejs.org/docs/pages/MeshPhysicalMaterial.html) — documented built-in physical material features; physically based `transmission` is a glass-like effect.
- Local Three.js [`lights_physical_pars_fragment`](../node_modules/three/src/renderers/shaders/ShaderChunk/lights_physical_pars_fragment.glsl.js), [`lights_fragment_begin`](../node_modules/three/src/renderers/shaders/ShaderChunk/lights_fragment_begin.glsl.js), [`lights_fragment_maps`](../node_modules/three/src/renderers/shaders/ShaderChunk/lights_fragment_maps.glsl.js), and [`normal_fragment_maps`](../node_modules/three/src/renderers/shaders/ShaderChunk/normal_fragment_maps.glsl.js) at the app's pinned `super-three@0.181.0` — current direct/indirect lighting and post-normal-map insertion points.
- Local [`tree-asset.ts`](../src/tree-asset.ts) — current imported foliage material, deformation hook, and custom depth/distance material behavior.
- Three.js [`SubsurfaceScatteringShader` source](https://github.com/mrdoob/three.js/blob/r181/examples/jsm/shaders/SubsurfaceScatteringShader.js) — example shader and its GDC 2011 approximation basis.
- glTF-Transform [`KHRMaterialsDiffuseTransmission` extension source](https://github.com/donmccurdy/glTF-Transform/blob/v4.4.1/packages/extensions/src/khr-materials-diffuse-transmission/extension.ts) — local pipeline's serialization support; this does not imply runtime shading support.
