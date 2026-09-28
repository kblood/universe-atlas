// Three.ez MIT reference ca0046a49fef8f8c75745a6e49e52752ef3cf8e3; see adjacent LICENSE and reference-manifest.json.

// tools/assetctl/vendor/three-ez-impostor/src/core/octahedralImpostor.ts
import { Matrix4, Mesh as Mesh3, PlaneGeometry, Sphere as Sphere3 } from "three";

// tools/assetctl/vendor/three-ez-impostor/src/utils/computeObjectBoundingSphere.ts
import { Sphere } from "three";
var sphere = new Sphere();
function computeObjectBoundingSphere(obj, target = new Sphere(), forceComputeBoundingSphere = false) {
  target.makeEmpty();
  traverse(obj);
  return target;
  function traverse(obj2) {
    if (obj2.isMesh) {
      const geometry = obj2.geometry;
      if (forceComputeBoundingSphere || !geometry.boundingSphere) geometry.computeBoundingSphere();
      sphere.copy(geometry.boundingSphere).applyMatrix4(obj2.matrixWorld);
      target.union(sphere);
    }
    for (const child of obj2.children) {
      traverse(child);
    }
  }
}

// tools/assetctl/vendor/three-ez-impostor/src/shaders/impostor/octahedral_impostor_shader_map_fragment.glsl
var octahedral_impostor_shader_map_fragment_default = "//#include <map_fragment>\nfloat spriteSize = 1.0 / spritesPerSide;\n\n// disable it for now\n// vec2 uv1 = parallaxUV(vSpriteUV1, vSprite1, vSpriteViewDir1, spriteSize, vSpritesWeight.x);\n// vec2 uv2 = parallaxUV(vSpriteUV2, vSprite2, vSpriteViewDir2, spriteSize, vSpritesWeight.y);\n// vec2 uv3 = parallaxUV(vSpriteUV3, vSprite3, vSpriteViewDir3, spriteSize, vSpritesWeight.z);\n\n// todo remove if we want parallax\nvec2 uv1 = getUV(vSpriteUV1, vSprite1, spriteSize);\nvec2 uv2 = getUV(vSpriteUV2, vSprite2, spriteSize);\nvec2 uv3 = getUV(vSpriteUV3, vSprite3, spriteSize);\n\nvec4 sprite1, sprite2, sprite3;\nfloat test = 1.0 - alphaClamp;\n\nif (vSpritesWeight.x >=  test) {\n\n  sprite1 = texture(map, uv1);\n  if (sprite1.a <= alphaClamp) discard;\n\n  sprite2 = texture(map, uv2);\n  sprite3 = texture(map, uv3);\n\n} else if (vSpritesWeight.y >=  test) {\n\n  sprite2 = texture(map, uv2);\n  if (sprite2.a <= alphaClamp) discard;\n\n  sprite1 = texture(map, uv1);\n  sprite3 = texture(map, uv3);\n\n} else if (vSpritesWeight.z >=  test) {\n\n  sprite3 = texture(map, uv3);\n  if (sprite3.a <= alphaClamp) discard;\n\n  sprite1 = texture(map, uv1);\n  sprite2 = texture(map, uv2);\n\n} else {\n\n  sprite1 = texture(map, uv1);\n  sprite2 = texture(map, uv2);\n  sprite3 = texture(map, uv3);\n\n}\n\nvec4 blendedColor = sprite1 * vSpritesWeight.x + sprite2 * vSpritesWeight.y + sprite3 * vSpritesWeight.z;\n\nif (blendedColor.a <= alphaClamp) discard;\n\n#ifndef EZ_TRANSPARENT\nblendedColor = vec4(vec3(blendedColor.rgb) / blendedColor.a, 1.0);\n#endif\n\n// diffuseColor *= blendedColor;\n";

// tools/assetctl/vendor/three-ez-impostor/src/shaders/impostor/octahedral_impostor_shader_normal_fragment_begin.glsl
var octahedral_impostor_shader_normal_fragment_begin_default = "// #include <normal_fragment_begin>\nvec3 normal = blendNormals(uv1, uv2, uv3);\nvec3 nonPerturbedNormal = normal;\n";

// tools/assetctl/vendor/three-ez-impostor/src/shaders/impostor/octahedral_impostor_shader_params_fragment.glsl
var octahedral_impostor_shader_params_fragment_default = "#include <clipping_planes_pars_fragment>\n\nuniform float spritesPerSide;\n// uniform float parallaxScale;\nuniform float alphaClamp;\n\n#ifdef EZ_USE_ORM\nuniform sampler2D ormMap;\n#endif\n\nflat varying vec4 vSpritesWeight;\nflat varying vec2 vSprite1;\nflat varying vec2 vSprite2;\nflat varying vec2 vSprite3;\nvarying vec2 vSpriteUV1;\nvarying vec2 vSpriteUV2;\nvarying vec2 vSpriteUV3;\n// varying vec2 vSpriteViewDir1;\n// varying vec2 vSpriteViewDir2;\n// varying vec2 vSpriteViewDir3;\n\n// #ifdef EZ_USE_NORMAL\n// flat varying vec3 vSpriteNormal1;\n// flat varying vec3 vSpriteNormal2;\n// flat varying vec3 vSpriteNormal3;\n// #endif\n\n#ifdef EZ_USE_NORMAL\nvec3 blendNormals(vec2 uv1, vec2 uv2, vec2 uv3) {\n  vec3 normalDepth1 = unpackRGBToNormal(texture2D(normalMap, uv1).rgb); // we're reading twice if parallax enabled\n  vec3 normalDepth2 = unpackRGBToNormal(texture2D(normalMap, uv2).rgb);\n  vec3 normalDepth3 = unpackRGBToNormal(texture2D(normalMap, uv3).rgb);\n\n  // Fix normal if blended bad\n\n  return normalize(normalDepth1.xyz * vSpritesWeight.x + normalDepth2.xyz * vSpritesWeight.y + normalDepth3.xyz * vSpritesWeight.z);\n}\n#endif\n\n// // temporaly removed\n// vec2 parallaxUV(vec2 uv_f, vec2 frame, vec2 xy_f, float frame_size, float weight) {\n//   // vec2 spriteUv = frame_size * (frame + uv_f);\n//   // float depth = texture(normalMap, spriteUv).a;\n//   // vec2 parallaxOffset = xy_f * depth * parallaxScale; // * weight;\n//   // uv_f = clamp(uv_f + parallaxOffset, vec2(0.0), vec2(1.0));\n//   // return frame_size * (frame + uv_f);\n\n//   uv_f = clamp(uv_f, vec2(0), vec2(1));\n// 	vec2 uv_quad = frame_size * (frame + uv_f);\n//   float n_depth = max(0.0, 0.5 - texture(normalMap, uv_quad).a);\n\n//   uv_f = xy_f * n_depth * parallaxScale * (1.0 - weight) + uv_f;\n// 	uv_f = clamp(uv_f, vec2(0), vec2(1));\n// 	uv_f =  frame_size * (frame + uv_f);\n// 	return clamp(uv_f, vec2(0), vec2(1));\n// }\n\nvec2 getUV(vec2 uv_f, vec2 frame, float frame_size) {\n  uv_f = clamp(uv_f, vec2(0), vec2(1));\n	vec2 uv_quad = frame_size * (frame + uv_f);\n	uv_f =  frame_size * (frame + uv_f);\n	return clamp(uv_f, vec2(0), vec2(1));\n}\n";

// tools/assetctl/vendor/three-ez-impostor/src/shaders/impostor/octahedral_impostor_shader_params_vertex.glsl
var octahedral_impostor_shader_params_vertex_default = "#include <clipping_planes_pars_vertex>\n\nuniform mat4 impostorTransform;\nuniform float spritesPerSide;\n\nflat varying vec4 vSpritesWeight;\nflat varying vec2 vSprite1;\nflat varying vec2 vSprite2;\nflat varying vec2 vSprite3;\nvarying vec2 vSpriteUV1;\nvarying vec2 vSpriteUV2;\nvarying vec2 vSpriteUV3;\n// varying vec2 vSpriteViewDir1;\n// varying vec2 vSpriteViewDir2;\n// varying vec2 vSpriteViewDir3;\n\n// #ifdef EZ_USE_NORMAL\n// flat varying vec3 vSpriteNormal1;\n// flat varying vec3 vSpriteNormal2;\n// flat varying vec3 vSpriteNormal3;\n// #endif\n\nvec2 encodeDirection(vec3 direction) {\n  #ifdef EZ_USE_HEMI_OCTAHEDRON\n\n  vec3 octahedron = direction / dot(direction, sign(direction));\n  return vec2(1.0 + octahedron.x + octahedron.z, 1.0 + octahedron.z - octahedron.x) * 0.5;\n\n  #else\n\n  // TODO: Implement full octahedral encoding\n\n  #endif\n}\n\nvec3 decodeDirection(vec2 gridIndex, vec2 spriteCountMinusOne) {\n  vec2 gridUV = gridIndex / spriteCountMinusOne;\n\n  #ifdef EZ_USE_HEMI_OCTAHEDRON\n\n  vec3 position = vec3(gridUV.x - gridUV.y, 0.0, -1.0 + gridUV.x + gridUV.y);\n  position.y = 1.0 - abs(position.x) - abs(position.z);\n\n  #else\n\n    // TODO: Implement full octahedral decoding\n\n  #endif\n\n  return normalize(position);\n}\n\nvoid computePlaneBasis(vec3 normal, out vec3 tangent, out vec3 bitangent) {\n  vec3 up = vec3(0.0, 1.0, 0.0);\n\n  if(normal.y > 0.999)\n    up = vec3(-1.0, 0.0, 0.0);\n\n  #ifndef EZ_USE_HEMI_OCTAHEDRON\n  if(normal.y < -0.999)\n    up = vec3(1.0, 0.0, 0.0);\n  #endif\n\n  tangent = normalize(cross(up, normal));\n  bitangent = cross(normal, tangent);\n}\n\nvec3 projectVertex(vec3 normal) {\n  vec3 x, y;\n  computePlaneBasis(normal, x, y);\n  return x * position.x + y * position.y;\n}\n\nvoid computeSpritesWeight(vec2 gridFract) {\n  vSpritesWeight = vec4(min(1.0 - gridFract.x, 1.0 - gridFract.y), abs(gridFract.x - gridFract.y), min(gridFract.x, gridFract.y), ceil(gridFract.x - gridFract.y));\n}\n\nvec2 projectToPlaneUV(vec3 normal, vec3 tangent, vec3 bitangent, vec3 cameraPosition, vec3 viewDir) {\n  float denom = dot(viewDir, normal);\n  \n  // // Avoid division by zero when view direction is parallel to plane\n  // if (abs(denom) < 1e-6) {\n  //   return vec2(0.5); // Return center UV as fallback\n  // }\n  \n  float t = -dot(cameraPosition, normal) / denom;\n\n  vec3 hit = cameraPosition + viewDir * t;\n  vec2 uv = vec2(dot(tangent, hit), dot(bitangent, hit));\n  return uv + 0.5;\n}\n\nvec3 projectDirectionToBasis(vec3 dir, vec3 normal, vec3 tangent, vec3 bitangent) {\n  return vec3(dot(dir, tangent), dot(dir, bitangent), dot(dir, normal));\n}\n";

// tools/assetctl/vendor/three-ez-impostor/src/shaders/impostor/octahedral_impostor_shader_vertex.glsl
var octahedral_impostor_shader_vertex_default = "// #include <project_vertex>\n\nvec2 spritesMinusOne = vec2(spritesPerSide - 1.0);\n\n#if defined USE_INSTANCING || defined USE_INSTANCING_INDIRECT\nmat4 transformedInstanceMatrix = instanceMatrix * impostorTransform;\nvec3 cameraPosLocal = (inverse(transformedInstanceMatrix * modelMatrix) * vec4(cameraPosition, 1.0)).xyz;\n#else\nvec3 cameraPosLocal = (inverse(impostorTransform * modelMatrix) * vec4(cameraPosition, 1.0)).xyz;\n#endif\n\nvec3 cameraDir = normalize(cameraPosLocal);\n\nvec3 projectedVertex = projectVertex(cameraDir);\nvec3 viewDirLocal = normalize(projectedVertex - cameraPosLocal);\n\nvec2 grid = encodeDirection(cameraDir) * spritesMinusOne;\nvec2 gridFloor = min(floor(grid), spritesMinusOne);\n\nvec2 gridFract = fract(grid);\n\ncomputeSpritesWeight(gridFract);\n\nvSprite1 = gridFloor;\nvSprite2 = min(vSprite1 + mix(vec2(0.0, 1.0), vec2(1.0, 0.0), vSpritesWeight.w), spritesMinusOne);\nvSprite3 = min(vSprite1 + vec2(1.0), spritesMinusOne);\n\nvec3 spriteNormal1 = decodeDirection(vSprite1, spritesMinusOne);\nvec3 spriteNormal2 = decodeDirection(vSprite2, spritesMinusOne);\nvec3 spriteNormal3 = decodeDirection(vSprite3, spritesMinusOne);\n\n// #ifdef EZ_USE_NORMAL\n// vSpriteNormal1 = spriteNormal1;\n// vSpriteNormal2 = spriteNormal2;\n// vSpriteNormal3 = spriteNormal3;\n// #endif\n\nvec3 planeX1, planeY1, planeX2, planeY2, planeX3, planeY3;\ncomputePlaneBasis(spriteNormal1, planeX1, planeY1);\ncomputePlaneBasis(spriteNormal2, planeX2, planeY2);\ncomputePlaneBasis(spriteNormal3, planeX3, planeY3);\n\nvSpriteUV1 = projectToPlaneUV(spriteNormal1, planeX1, planeY1, cameraPosLocal, viewDirLocal);\nvSpriteUV2 = projectToPlaneUV(spriteNormal2, planeX2, planeY2, cameraPosLocal, viewDirLocal);\nvSpriteUV3 = projectToPlaneUV(spriteNormal3, planeX3, planeY3, cameraPosLocal, viewDirLocal);\n\n// vSpriteViewDir1 = projectDirectionToBasis(-viewDirLocal, spriteNormal1, planeX1, planeY1).xy;\n// vSpriteViewDir2 = projectDirectionToBasis(-viewDirLocal, spriteNormal2, planeX2, planeY2).xy;\n// vSpriteViewDir3 = projectDirectionToBasis(-viewDirLocal, spriteNormal3, planeX3, planeY3).xy;\n\nvec4 mvPosition = vec4(projectedVertex, 1.0);\n\n#if defined USE_INSTANCING || defined USE_INSTANCING_INDIRECT\n    mvPosition = transformedInstanceMatrix * mvPosition;\n# else\n    mvPosition = impostorTransform * mvPosition;\n#endif\n\nmvPosition = modelViewMatrix * mvPosition;\n\ngl_Position = projectionMatrix * mvPosition;\n";

// tools/assetctl/vendor/three-ez-impostor/src/utils/createTextureAtlas.ts
import { GLSL3, LinearFilter, LinearMipmapLinearFilter, LinearSRGBColorSpace, NearestFilter, NearestMipMapNearestFilter, ObjectSpaceNormalMap, OrthographicCamera, ShaderMaterial, Sphere as Sphere2, TangentSpaceNormalMap, UnsignedByteType, Vector2 as Vector22, Vector4, WebGLRenderTarget } from "three";

// tools/assetctl/vendor/three-ez-impostor/src/utils/octahedronUtils.ts
import { Vector2, Vector3 } from "three";
var absolute = new Vector3();
var octant = new Vector3();
var octahedron = new Vector3();
function hemiOctaGridToDir(grid, target = new Vector3()) {
  target.set(grid.x - grid.y, 0, -1 + grid.x + grid.y);
  target.y = 1 - Math.abs(target.x) - Math.abs(target.z);
  return target;
}
function octaGridToDir(grid, target = new Vector3()) {
  target.set(2 * (grid.x - 0.5), 0, 2 * (grid.y - 0.5));
  absolute.set(Math.abs(target.x), 0, Math.abs(target.z));
  target.y = 1 - absolute.x - absolute.z;
  if (target.y < 0) {
    target.x = Math.sign(target.x) * (1 - absolute.z);
    target.z = Math.sign(target.z) * (1 - absolute.x);
  }
  return target;
}

// tools/assetctl/vendor/three-ez-impostor/src/shaders/atlas_texture/octahedral_atlas_fragment.glsl
var octahedral_atlas_fragment_default = "#define NORMAL\nuniform vec3 diffuse;\nuniform float opacity;\n#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )\n	varying vec3 vViewPosition;\n#endif\n#include <packing>\n#include <normal_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <common>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\nvarying vec2 vHighPrecisionZW;\n\nlayout(location = 0) out vec4 gAlbedo;\nlayout(location = 1) out vec4 gNormalDepth;\n\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n\n	if (diffuseColor.a <= 0.2) { // TODO custom code\n		discard;\n	}\n\n	// #include <opaque_fragment>\n    #ifdef OPAQUE\n		diffuseColor.a = 1.0;\n	#endif\n	#ifdef USE_TRANSMISSION\n		diffuseColor.a *= material.transmissionAlpha;\n	#endif\n	gAlbedo = diffuseColor;\n\n	// // #include <colorspace_fragment>\n	gAlbedo = linearToOutputTexel( gAlbedo );\n\n	// // #include <premultiplied_alpha_fragment>\n    #ifdef PREMULTIPLIED_ALPHA\n		gAlbedo.rgb *= gAlbedo.a;\n	#endif\n\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n\n	float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;\n	gNormalDepth = vec4( packNormalToRGB( normal ), 1.0 - fragCoordZ );\n}";

// tools/assetctl/vendor/three-ez-impostor/src/shaders/atlas_texture/octahedral_atlas_vertex.glsl
var octahedral_atlas_vertex_default = "// got by merging basic, normal, depth material \n#define NORMAL\n#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )\n	varying vec3 vViewPosition;\n#endif\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex> \n#include <normal_pars_vertex> \n#include <color_pars_vertex>\n// #include <morphtarget_pars_vertex>\n// #include <skinning_pars_vertex>\nvarying vec2 vHighPrecisionZW;\n\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n// 	#include <morphinstance_vertex>\n// 	#include <morphcolor_vertex>\n// 	#include <morphnormal_vertex>\n// 	#include <skinbase_vertex>\n// 	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n    #include <normal_vertex>\n	#include <begin_vertex>\n// 	#include <morphtarget_vertex>\n// 	#include <skinning_vertex>\n    #include <displacementmap_vertex>\n	#include <project_vertex>\n	\n    vHighPrecisionZW = gl_Position.zw;\n\n#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )\n	vViewPosition = - mvPosition.xyz;\n#endif\n}";

// tools/assetctl/vendor/three-ez-impostor/src/utils/createTextureAtlas.ts
var camera = new OrthographicCamera();
var bSphere = new Sphere2();
var oldScissor = new Vector4();
var oldViewport = new Vector4();
var coords = new Vector22();
var userDataMaterialKey = "ez_originalMaterial";
function createTextureAtlas(params) {
  const { renderer, target, useHemiOctahedron } = params;
  if (!renderer) throw new Error('"renderer" is mandatory.');
  if (!target) throw new Error('"target" is mandatory.');
  if (useHemiOctahedron == null) throw new Error('"useHemiOctahedron" is mandatory.');
  const atlasSize = params.textureSize ?? 2048;
  const countPerSide = params.spritesPerSide ?? 16;
  const countPerSideMinusOne = countPerSide - 1;
  const spriteSize = atlasSize / countPerSide;
  computeObjectBoundingSphere(target, bSphere, true);
  const cameraFactor = params.cameraFactor ?? 1;
  updateCamera();
  const { renderTarget, oldPixelRatio, oldScissorTest, oldClearAlpha } = setupRenderer();
  overrideTargetMaterial(target);
  for (let row = 0; row < countPerSide; row++) {
    for (let col = 0; col < countPerSide; col++) {
      renderView(col, row);
    }
  }
  restoreRenderer();
  restoreTargetMaterial(target);
  return {
    renderTarget,
    albedo: renderTarget.textures[0],
    normalDepth: renderTarget.textures[1]
  };
  function overrideTargetMaterial(target2) {
    target2.traverse((mesh) => {
      if (mesh.material) {
        const material = mesh.material;
        mesh.userData[userDataMaterialKey] = material;
        const overrideMaterial = Array.isArray(material) ? material.map((mat) => createMaterial(mat)) : createMaterial(material);
        mesh.material = overrideMaterial;
      }
    });
  }
  function createMaterial(material) {
    const hasMap = !!material.map;
    const hasAlphaMap = !!material.alphaMap;
    const hasNormalMap = !!material.normalMap;
    const hasBumpMap = !!material.bumpMap;
    const hasDisplacementMap = !!material.displacementMap;
    const hasAlphaTest = material.alphaTest > 0;
    const uniforms = {
      diffuse: { value: material.color },
      opacity: { value: material.opacity }
    };
    if (hasAlphaTest) {
      uniforms["alphaTest"] = { value: material.alphaTest };
    }
    if (hasMap) {
      uniforms["map"] = { value: material.map };
      uniforms["mapTransform"] = { value: material.map.matrix };
    }
    if (hasAlphaMap) {
      uniforms["alphaMap"] = { value: material.alphaMap };
      uniforms["alphaMapTransform"] = { value: material.alphaMap.matrix };
    }
    if (hasNormalMap) {
      uniforms["normalMap"] = { value: material.normalMap };
      uniforms["normalScale"] = { value: material.normalScale };
      uniforms["normalMapTransform"] = { value: material.normalMap.matrix };
    }
    if (hasBumpMap) {
      uniforms["bumpMap"] = { value: material.bumpMap };
      uniforms["bumpScale"] = { value: material.bumpScale };
      uniforms["bumpMapTransform"] = { value: material.bumpMap.matrix };
    }
    if (hasDisplacementMap) {
      uniforms["displacementMap"] = { value: material.displacementMap };
      uniforms["displacementScale"] = { value: material.displacementScale };
      uniforms["displacementBias"] = { value: material.displacementBias };
      uniforms["displacementMapTransform"] = { value: material.displacementMap.matrix };
    }
    const defines = {};
    if (hasMap || hasAlphaMap || hasNormalMap || hasBumpMap || hasDisplacementMap) {
      defines["USE_UV"] = "";
    }
    const shaderMaterial = new ShaderMaterial({
      uniforms,
      defines,
      vertexShader: octahedral_atlas_vertex_default,
      fragmentShader: octahedral_atlas_fragment_default,
      glslVersion: GLSL3,
      transparent: material.transparent,
      side: material.side,
      alphaHash: material.alphaHash,
      depthFunc: material.depthFunc,
      depthWrite: material.depthWrite,
      depthTest: material.depthTest,
      blending: material.blending,
      blendSrc: material.blendSrc,
      blendDst: material.blendDst,
      blendEquation: material.blendEquation,
      blendSrcAlpha: material.blendSrcAlpha,
      blendDstAlpha: material.blendDstAlpha,
      blendEquationAlpha: material.blendEquationAlpha,
      premultipliedAlpha: material.premultipliedAlpha,
      alphaToCoverage: material.alphaToCoverage,
      blendAlpha: material.blendAlpha,
      blendColor: material.blendColor,
      colorWrite: material.colorWrite,
      forceSinglePass: material.forceSinglePass,
      vertexColors: material.vertexColors,
      precision: material.precision,
      visible: material.visible
    });
    shaderMaterial.onBeforeCompile = (shader) => {
      if (hasMap) {
        shader.map = true;
        shader.mapUv = "uv";
      }
      if (hasAlphaMap) {
        shader.alphaMap = true;
        shader.alphaMapUv = "uv";
      }
      if (hasNormalMap) {
        shader.normalMap = true;
        shader.normalMapUv = "uv";
        shader.normalMapTangentSpace = material.normalMapType === TangentSpaceNormalMap;
        shader.normalMapObjectSpace = material.normalMapType === ObjectSpaceNormalMap;
      }
      if (hasBumpMap) {
        shader.bumpMap = true;
        shader.bumpMapUv = "uv";
      }
      if (hasDisplacementMap) {
        shader.displacementMap = true;
        shader.displacementMapUv = "uv";
      }
      shader.flatShading = material.flatShading;
      shader.alphaTest = hasAlphaTest;
    };
    return shaderMaterial;
  }
  function restoreTargetMaterial(target2) {
    target2.traverse((mesh) => {
      if (mesh.userData[userDataMaterialKey]) {
        mesh.material = mesh.userData[userDataMaterialKey];
        delete mesh.userData[userDataMaterialKey];
      }
    });
  }
  function renderView(col, row) {
    coords.set(col / countPerSideMinusOne, row / countPerSideMinusOne);
    if (useHemiOctahedron) hemiOctaGridToDir(coords, camera.position);
    else octaGridToDir(coords, camera.position);
    camera.position.setLength(bSphere.radius * cameraFactor).add(bSphere.center);
    camera.lookAt(bSphere.center);
    const xOffset = col / countPerSide * atlasSize;
    const yOffset = row / countPerSide * atlasSize;
    renderer.setViewport(xOffset, yOffset, spriteSize, spriteSize);
    renderer.setScissor(xOffset, yOffset, spriteSize, spriteSize);
    renderer.render(target, camera);
  }
  function updateCamera() {
    camera.left = -bSphere.radius;
    camera.right = bSphere.radius;
    camera.top = bSphere.radius;
    camera.bottom = -bSphere.radius;
    camera.zoom = cameraFactor;
    camera.near = 1e-3;
    camera.far = bSphere.radius * 2 + 1e-3;
    camera.updateProjectionMatrix();
  }
  function setupRenderer() {
    const oldPixelRatio2 = renderer.getPixelRatio();
    const oldScissorTest2 = renderer.getScissorTest();
    const oldClearAlpha2 = renderer.getClearAlpha();
    renderer.getScissor(oldScissor);
    renderer.getViewport(oldViewport);
    const renderTarget2 = new WebGLRenderTarget(atlasSize, atlasSize, { count: 2, generateMipmaps: true });
    const albedo = 0;
    const normalDepth = 1;
    renderTarget2.textures[albedo].minFilter = LinearMipmapLinearFilter;
    renderTarget2.textures[albedo].magFilter = LinearFilter;
    renderTarget2.textures[albedo].type = UnsignedByteType;
    renderTarget2.textures[albedo].colorSpace = LinearSRGBColorSpace;
    renderTarget2.textures[normalDepth].minFilter = NearestMipMapNearestFilter;
    renderTarget2.textures[normalDepth].magFilter = NearestFilter;
    renderTarget2.textures[normalDepth].type = UnsignedByteType;
    renderTarget2.textures[normalDepth].colorSpace = LinearSRGBColorSpace;
    renderer.setRenderTarget(renderTarget2);
    renderer.setScissorTest(true);
    renderer.setPixelRatio(1);
    renderer.setClearAlpha(0);
    return { renderTarget: renderTarget2, oldPixelRatio: oldPixelRatio2, oldScissorTest: oldScissorTest2, oldClearAlpha: oldClearAlpha2 };
  }
  function restoreRenderer() {
    renderer.setRenderTarget(null);
    renderer.setScissorTest(oldScissorTest);
    renderer.setViewport(oldViewport.x, oldViewport.y, oldViewport.z, oldViewport.w);
    renderer.setScissor(oldScissor.x, oldScissor.y, oldScissor.z, oldScissor.w);
    renderer.setPixelRatio(oldPixelRatio);
    renderer.setClearAlpha(oldClearAlpha);
  }
}

// tools/assetctl/vendor/three-ez-impostor/src/core/octahedralImpostorMaterial.ts
function createOctahedralImpostorMaterial(parameters) {
  if (!parameters) throw new Error("createOctahedralImpostorMaterial: parameters is required.");
  if (!parameters.baseType) throw new Error("createOctahedralImpostorMaterial: baseType is required.");
  if (!parameters.useHemiOctahedron) throw new Error("createOctahedralImpostorMaterial: useHemiOctahedron is required.");
  const { albedo, normalDepth } = createTextureAtlas(parameters);
  const material = new parameters.baseType();
  material.isOctahedralImpostorMaterial = true;
  material.transparent = parameters.transparent ?? false;
  material.map = albedo;
  material.normalMap = normalDepth;
  material.ezImpostorDefines = {};
  if (parameters.useHemiOctahedron) material.ezImpostorDefines.EZ_USE_HEMI_OCTAHEDRON = true;
  if (parameters.transparent) material.ezImpostorDefines.EZ_TRANSPARENT = true;
  material.ezImpostorDefines.EZ_USE_NORMAL = true;
  const { transform, spritesPerSide, alphaClamp } = parameters;
  material.ezImpostorUniforms = {
    spritesPerSide: { value: spritesPerSide ?? 16 },
    // TODO config default value
    // ormMap: { value: null },
    // parallaxScale: { value: parallaxScale ?? 0 },
    alphaClamp: { value: alphaClamp ?? 0.4 },
    impostorTransform: { value: transform }
  };
  overrideMaterialCompilation(material);
  return material;
}
function overrideMaterialCompilation(material) {
  const onBeforeCompileBase = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    shader.defines = { ...shader.defines, ...material.ezImpostorDefines };
    shader.uniforms = { ...shader.uniforms, ...material.ezImpostorUniforms };
    shader.vertexShader = shader.vertexShader.replace("#include <clipping_planes_pars_vertex>", octahedral_impostor_shader_params_vertex_default).replace("#include <project_vertex>", octahedral_impostor_shader_vertex_default);
    shader.fragmentShader = shader.fragmentShader.replace("vec4 diffuseColor = vec4( diffuse, opacity );", `${octahedral_impostor_shader_map_fragment_default}
 vec4 diffuseColor = vec4( diffuse, opacity );`).replace("#include <clipping_planes_pars_fragment>", octahedral_impostor_shader_params_fragment_default).replace("#include <normal_fragment_begin>", octahedral_impostor_shader_normal_fragment_begin_default).replace("#include <normal_fragment_maps>", "// #include <normal_fragment_maps>").replace("#include <map_fragment>", "diffuseColor *= blendedColor;");
    onBeforeCompileBase?.call(material, shader, renderer);
  };
  const customProgramCacheKeyBase = material.customProgramCacheKey;
  material.customProgramCacheKey = () => {
    const hemiOcta = !!material.ezImpostorDefines.EZ_USE_HEMI_OCTAHEDRON;
    const useNormal = !!material.ezImpostorDefines.EZ_USE_NORMAL;
    const useOrm = !!material.ezImpostorDefines.EZ_USE_ORM;
    const transparent = !!material.transparent;
    return `ez_${hemiOcta}_${transparent}_${useNormal}_${useOrm}_${customProgramCacheKeyBase.call(material)}`;
  };
}

// tools/assetctl/vendor/three-ez-impostor/src/core/octahedralImpostor.ts
var OctahedralImpostor = class _OctahedralImpostor extends Mesh3 {
  constructor(materialOrParams) {
    super(new PlaneGeometry(), null);
    if (!materialOrParams.isOctahedralImpostorMaterial) {
      const mesh = materialOrParams.target;
      const sphere2 = computeObjectBoundingSphere(mesh, new Sphere3(), true);
      const scale = sphere2.radius * 2;
      const translation = sphere2.center.clone();
      materialOrParams.transform = new Matrix4().makeScale(scale, scale, scale).setPosition(translation);
      materialOrParams = createOctahedralImpostorMaterial(materialOrParams);
    }
    this.material = materialOrParams;
  }
  clone() {
    const impostor = new _OctahedralImpostor(this.material);
    impostor.scale.copy(this.scale);
    impostor.position.copy(this.position);
    return impostor;
  }
};
export {
  OctahedralImpostor
};
