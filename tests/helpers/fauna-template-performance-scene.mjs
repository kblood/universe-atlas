// Vite-served browser fixture. Uses the real loader and image decoder; no stubs.
import * as THREE from 'three';
import {loadFaunaTemplate} from '../../src/fauna-template.ts';
import {createFaunaTemplateMotion} from '../../src/fauna-template-motion.ts';
import {createFaunaTemplateBrowse} from '../../src/fauna-template-browse.ts';
import {deerIndividualMorphs} from '../../src/fauna-template-phenotype.ts';
import {fitFaunaReviewShadow, FAUNA_REVIEW_SHADOWS} from '../../src/fauna-review-lighting.ts';

const check = (condition, message) => { if (!condition) throw new Error(message); };
const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
function stats(samples) {
  check(samples.length && samples.every(Number.isFinite), 'Nonfinite performance samples');
  const ordered = [...samples].sort((a, b) => a - b), rank = q => ordered[Math.max(0, Math.ceil(q * ordered.length) - 1)];
  return {samples: samples.length, meanMs: samples.reduce((sum, v) => sum + v, 0) / samples.length,
    p50Ms: rank(.5), p95Ms: rank(.95), p99Ms: rank(.99), maxMs: ordered.at(-1)};
}
function resources(root) {
  const result = {geometries: new Set(), textures: new Set(), materials: new Set(), skeletons: new Set(), meshes: []};
  root.traverse(o => {
    if (!o.isMesh) return;
    result.meshes.push(o); result.geometries.add(o.geometry);
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) result.materials.add(m);
    if (o.isSkinnedMesh) result.skeletons.add(o.skeleton);
  });
  for (const m of result.materials) for (const value of Object.values(m)) if (value instanceof THREE.Texture) result.textures.add(value);
  return result;
}

export async function createFaunaPerformanceScene({glbUrl, sidecarUrl, expectedHash, expectedSidecarHash, width = 1440, height = 900, warmup = 60, samples = 180, shadowMapSize = FAUNA_REVIEW_SHADOWS.mapSize}) {
  check(/^[a-f0-9]{64}$/.test(expectedHash), 'A pinned expected GLB SHA-256 is required');
  check(expectedSidecarHash === undefined || /^[a-f0-9]{64}$/.test(expectedSidecarHash), 'Invalid expected sidecar hash');
  check([1024,2048].includes(shadowMapSize), 'Only measured desktop shadow map sizes are supported');
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#111b21');
  const camera = new THREE.PerspectiveCamera(45, width / height, .05, 100);
  const renderer = new THREE.WebGLRenderer({antialias: true, powerPreference: 'high-performance'});
  renderer.setPixelRatio(1); renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.info.autoReset = false;
  document.body.style.margin = '0'; document.body.appendChild(renderer.domElement);
  const hemisphere = new THREE.HemisphereLight('#d3eaff', '#28352b', 2.2); scene.add(hemisphere);
  const light = new THREE.DirectionalLight('#ffead4', 3.2); light.position.set(4, 7, 5); light.castShadow = true;
  light.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  Object.assign(light.shadow.camera, {left: -7, right: 7, top: 6, bottom: -6, near: .5, far: 25});
  light.shadow.camera.updateProjectionMatrix(); scene.add(light);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 16), new THREE.MeshStandardMaterial({color: '#334239', roughness: 1}));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.004; floor.receiveShadow = true; scene.add(floor);
  const actors = [], tracked = new Map(), sharedGeometry = new Set(), sharedTextures = new Set();
  const coatReviewBaselines = new Map();
  const shadowEnvelope = new THREE.Box3(); let shadowReview = null, shadowDepthBiasM = FAUNA_REVIEW_SHADOWS.depthBiasM;
  function fitShadow(force = false) {
    if (!actors.length) return;
    const bounds = new THREE.Box3(); for (const actor of actors) bounds.expandByObject(actor.wrapper);
    if (force || !shadowEnvelope.containsBox(bounds)) {
      shadowEnvelope.copy(bounds).expandByScalar(.1);
      shadowReview = fitFaunaReviewShadow(light, shadowEnvelope, {groundY: floor.position.y, depthBiasM: shadowDepthBiasM});
    }
  }
  let template, disposed = false;
  const memory = () => ({...renderer.info.memory, programs: renderer.info.programs?.length ?? 0});
  const renderInfo = () => ({...renderer.info.render, memory: memory()});
  function track(object, owner, kind) {
    if (tracked.has(object)) return;
    const row = {owner, kind, count: 0}; tracked.set(object, row);
    if (kind === 'skeleton') {
      const original = object.dispose;
      object.dispose = function () { row.count++; return original.call(this); };
    } else object.addEventListener('dispose', () => row.count++);
  }
  function trackUploadedBones() {
    for (const actor of actors) for (const skeleton of actor.resources.skeletons) if (skeleton.boneTexture) track(skeleton.boneTexture, 'instance', 'boneTexture');
  }
  function render() {
    renderer.info.reset(); renderer.render(scene, camera); trackUploadedBones();
  }
  function disposalSummary() {
    const result = {};
    for (const row of tracked.values()) {
      const key = `${row.owner}.${row.kind}`;
      result[key] ??= {objects: 0, disposed: 0, zero: 0, multiple: 0};
      result[key].objects++; result[key].disposed += row.count;
      if (!row.count) result[key].zero++; if (row.count > 1) result[key].multiple++;
    }
    return result;
  }
  function clearActors() {
    for (const actor of actors) {
      scene.remove(actor.wrapper); actor.instance.dispose(); actor.instance.dispose();
      for (const key of ['materials', 'skeletons']) for (const object of actor.resources[key]) check(tracked.get(object).count === 1, `${key} must dispose exactly once`);
    }
    actors.length = 0;
    for (const row of tracked.values()) if (row.owner === 'template') check(row.count === 0, 'An instance disposed shared asset resources');
  }
  const setupRows = [];
  function populate(count) {
    clearActors();
    shadowEnvelope.makeEmpty();
    for (let index = 0; index < count; index++) {
      let start = performance.now(); const instance = template.instantiate(); const instantiateMs = performance.now() - start;
      const controls = deerIndividualMorphs({seed: 'desktop-render-budget', profile: 'temperate', species: `deer/${Math.floor(index / 4)}`, variant: index % 4, growth: index === 2 || index === 5 ? 'juvenile' : 'adult'});
      start = performance.now(); instance.apply(controls); const morphApplyMs = performance.now() - start;
      start = performance.now(); const motion = createFaunaTemplateMotion(instance); const driverSetupMs = performance.now() - start;
      const own = resources(instance.root), wrapper = new THREE.Group(); wrapper.add(instance.root);
      wrapper.position.set(count === 1 ? 0 : (index % 3 - 1) * 2.7, 0, count === 1 ? 0 : (Math.floor(index / 3) - .5) * 2.3);
      instance.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
      for (const geometry of own.geometries) {
        if (!sharedGeometry.size || index === 0 && setupRows.length === 0) sharedGeometry.add(geometry);
        check(sharedGeometry.has(geometry), 'GLB geometry unexpectedly copied between instances'); track(geometry, 'template', 'geometry');
      }
      for (const texture of own.textures) {
        if (index === 0 && setupRows.length === 0) sharedTextures.add(texture);
        check(sharedTextures.has(texture), 'GLB texture unexpectedly copied between instances'); track(texture, 'template', 'texture');
      }
      for (const [key, kind] of [['materials', 'material'], ['skeletons', 'skeleton']]) for (const object of own[key]) {
        check(!tracked.has(object), `Instance ${kind} is shared`); track(object, 'instance', kind);
      }
      setupRows.push({instantiateMs, morphApplyMs, driverSetupMs});
      scene.add(wrapper); actors.push({instance, motion, resources: own, wrapper, controls});
    }
    camera.position.set(count === 1 ? 3.7 : 7.4, count === 1 ? 2.5 : 5.2, count === 1 ? 4.3 : 9.4); camera.lookAt(0, .85, 0);
  }
  function update(time, gait) {
    for (let i = 0; i < actors.length; i++) actors[i].motion.update(time + i * .137, {gait, inPlace: true});
    fitShadow();
  }
  async function measure(count) {
    check(count === 1 || count === 6, 'Only one- and six-animal scenarios are defined');
    populate(count);
    const row = {animals: count, controls: actors.map(a => a.controls), pose: {}, setupSamples: setupRows.slice(-count)};
    for (const gait of ['idle', 'walk']) {
      for (let frame = 0; frame < warmup; frame++) { await nextFrame(); update(frame / 60, gait); render(); }
      const values = {frameCpu: [], motionCpu: [], renderSubmissionCpu: [], rafInterval: []};
      let prior = await nextFrame(); const wallStart = performance.now(); let maxCalls = 0, maxTriangles = 0;
      for (let frame = 0; frame < samples; frame++) {
        const stamp = await nextFrame(); values.rafInterval.push(stamp - prior); prior = stamp;
        const start = performance.now(); update((warmup + frame) / 60, gait); const updated = performance.now();
        renderer.info.reset(); renderer.render(scene, camera); const rendered = performance.now();
        values.motionCpu.push(updated - start); values.renderSubmissionCpu.push(rendered - updated); values.frameCpu.push(rendered - start);
        maxCalls = Math.max(maxCalls, renderer.info.render.calls); maxTriangles = Math.max(maxTriangles, renderer.info.render.triangles);
      }
      trackUploadedBones();
      row.pose[gait] = {wallElapsedMs: performance.now() - wallStart, ...Object.fromEntries(Object.entries(values).map(([key, v]) => [key, stats(v)])),
        renderer: renderInfo(), maxCalls, maxTriangles};
    }
    // Interactive edits are separate from steady animation: they rebuild inverse
    // binds, bounds and the motion driver, while morph GPU evaluation is always on.
    const editing = [];
    for (let sample = 0; sample < 12; sample++) {
      await nextFrame(); const start = performance.now();
      for (const actor of actors) {
        actor.instance.root.position.set(0, 0, 0); actor.instance.resetPose();
        actor.instance.apply({...actor.controls, bodyCondition: sample % 2 ? .35 : -.35});
        actor.motion = createFaunaTemplateMotion(actor.instance);
      }
      const applied = performance.now(); update(sample / 60, 'walk'); renderer.info.reset(); renderer.render(scene, camera);
      editing.push({applyAndRebindCpuMs: applied - start, frameCpuMs: performance.now() - start});
    }
    row.interactiveMorphEdit = Object.fromEntries(['applyAndRebindCpuMs', 'frameCpuMs'].map(key => [key, stats(editing.map(v => v[key]))]));
    // Restore the labelled recipe for the evidence screenshot.
    for (const actor of actors) { actor.instance.root.position.set(0, 0, 0); actor.instance.resetPose(); actor.instance.apply(actor.controls); actor.motion = createFaunaTemplateMotion(actor.instance); }
    update(.37, 'walk'); render();
    return row;
  }
  async function churn() {
    clearActors(); render(); const cycles = [];
    for (let cycle = 0; cycle < 6; cycle++) {
      populate(6);
      for (let frame = 0; frame < 3; frame++) { await nextFrame(); update(frame / 60, 'walk'); render(); }
      const live = memory(); clearActors(); await nextFrame(); render(); const empty = memory();
      cycles.push({cycle, live, empty});
      if (cycle) {
        check(JSON.stringify(live) === JSON.stringify(cycles[0].live), 'Live renderer resource counts grew during instance churn');
        check(JSON.stringify(empty) === JSON.stringify(cycles[0].empty), 'Disposed renderer resource counts grew during instance churn');
      }
    }
    return {cycles, ownershipBeforeTemplateDisposal: disposalSummary(), instancesCreated: setupRows.length};
  }
  async function reviewCoat({detail = true, lighting = 'neutral', frame = 'body', controls = {}, shadows = true, neutralMaterial = false, depthBiasM = FAUNA_REVIEW_SHADOWS.depthBiasM} = {}) {
    check(['neutral', 'grazing'].includes(lighting) && ['body', 'head'].includes(frame), 'Unknown coat review frame');
    populate(1);
    shadowDepthBiasM = depthBiasM;
    const actor = actors[0]; actor.instance.resetPose(); actor.instance.apply(controls);
    actor.motion = createFaunaTemplateMotion(actor.instance);
    const coat = [...actor.resources.materials].filter(m => m.name === 'MAT_DeerCoat');
    check(coat.length > 0, 'Actual coat material required');
    const bindings = coat.map(material => {
      check(material.map && material.normalMap && material.roughnessMap, 'Real coat color, normal and roughness maps required');
      check(material.map.colorSpace === THREE.SRGBColorSpace, 'Coat albedo must decode as sRGB');
      check(material.normalMap.colorSpace === THREE.NoColorSpace && material.roughnessMap.colorSpace === THREE.NoColorSpace, 'Coat data maps must remain linear');
      const row = Object.fromEntries(['map', 'normalMap', 'roughnessMap'].map(key => [key, {
        name: material[key].name, colorSpace: material[key].colorSpace,
        width: material[key].image.width, height: material[key].image.height,
      }]));
      if (!detail) { material.normalMap = null; material.roughnessMap = null; material.roughness = .83; material.needsUpdate = true; }
      if (neutralMaterial) { material.map = null; material.normalMap = null; material.roughnessMap = null; material.vertexColors = false; material.color.setRGB(.5,.5,.5); material.roughness = .83; material.metalness = 0; material.needsUpdate = true; }
      return row;
    });
    for (const mesh of actor.resources.meshes) check(!mesh.geometry.attributes.tangent, 'Coat review expects morph-safe derivative tangent frames');
    hemisphere.intensity = lighting === 'grazing' ? .35 : 2.2;
    renderer.shadowMap.enabled = shadows; light.castShadow = shadows;
    light.position.set(lighting === 'grazing' ? -2 : 4, lighting === 'grazing' ? 1.25 : 7, 5);
    shadowEnvelope.makeEmpty();
    if (frame === 'head') {
      const focus = actor.instance.bones.get('head').getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(.05, 0, 0));
      camera.position.copy(focus).add(new THREE.Vector3(.47, .22, 1.05)); camera.lookAt(focus);
    }
    else { camera.position.set(.15, 1.10, 3.1); camera.lookAt(.15, .84, 0); }
    update(0, 'neutral'); await nextFrame(); render(); await nextFrame(); render();
    const gl = renderer.getContext(), pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const key = JSON.stringify({lighting, frame, controls, shadows, neutralMaterial, depthBiasM});
    let difference = null;
    if (!detail) coatReviewBaselines.set(key, pixels);
    else if (coatReviewBaselines.has(key)) {
      const baseline = coatReviewBaselines.get(key); let sum = 0, changedPixels = 0, maximumChannelDifference = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        let changed = false;
        for (let c = 0; c < 3; c++) { const delta = Math.abs(pixels[i + c] - baseline[i + c]); sum += delta; maximumChannelDifference = Math.max(maximumChannelDifference, delta); changed ||= delta > 1; }
        if (changed) changedPixels++;
      }
      difference = {changedPixels, meanAbsoluteRgbByteDifference: sum / (width * height * 3), maximumChannelDifference};
    }
    return {detail, lighting, frame, controls: actor.instance.controls(), shadows, neutralMaterial, shadowReview, bindings, difference, renderer: renderInfo()};
  }
  /** Review-only measured browsing. No public default, material, geometry or
   * skin-weight mutation: neutral inspection edits instance materials only. */
  async function reviewBrowse({frame = 'side', controls = {}, time = 0, neutralMaterial = false} = {}) {
    check(['side', 'head', 'throat'].includes(frame) && Number.isFinite(time), 'Unknown browse frame or nonfinite time');
    populate(1);
    const actor = actors[0]; actor.instance.resetPose(); actor.instance.apply(controls);
    const browse = createFaunaTemplateBrowse(actor.instance);
    if (neutralMaterial) for (const material of actor.resources.materials) {
      material.map = null; material.normalMap = null; material.roughnessMap = null;
      material.vertexColors = false; material.color.setRGB(.5, .5, .5);
      material.roughness = .83; material.metalness = 0; material.needsUpdate = true;
    }
    hemisphere.intensity = 2.2; light.position.set(4, 7, 5);
    renderer.shadowMap.enabled = true; light.castShadow = true;
    shadowDepthBiasM = FAUNA_REVIEW_SHADOWS.depthBiasM; shadowEnvelope.makeEmpty();
    const selections = [], hoofRest = [];
    const inverseRoot = actor.instance.root.matrixWorld.clone().invert();
    const joint = name => actor.instance.bones.get(name).getWorldPosition(new THREE.Vector3()).applyMatrix4(inverseRoot);
    const chestRearX = Math.min(joint('L_scapula').x, joint('R_scapula').x) - browse.measurements.neckSegmentLengthsM[0] * .35;
    const elbowHeight = Math.min(joint('L_elbow').y, joint('R_elbow').y), neckTop = joint('neck2');
    for (const mesh of actor.resources.meshes) {
      if (!mesh.isSkinnedMesh) continue;
      const ids = mesh.geometry.attributes.skinIndex, weights = mesh.geometry.attributes.skinWeight;
      for (let index = 0; index < mesh.geometry.attributes.position.count; index++) {
        let head = 0, neck = 0; const feet = {};
        for (let slot = 0; slot < 4; slot++) {
          const name = mesh.skeleton.bones[ids.getComponent(index, slot)].name, weight = weights.getComponent(index, slot);
          if (name === 'head') head += weight;
          if (name === 'neck1' || name === 'neck2') neck += weight;
          if (name.endsWith('_fetlock')) feet[name] = (feet[name] ?? 0) + weight;
        }
        const p = frame === 'throat' ? mesh.getVertexPosition(index, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverseRoot) : null;
        const upperChest = p && p.x >= chestRearX && p.x <= neckTop.x && p.y >= elbowHeight && p.y <= neckTop.y;
        if ((frame === 'head' && head >= .5) || (frame === 'throat' && (neck >= .1 || upperChest))) selections.push({mesh, index});
        for (const [foot, weight] of Object.entries(feet)) if (weight >= .5) hoofRest.push({mesh, index, foot});
      }
    }
    const actualPoint = ({mesh, index}) => mesh.getVertexPosition(index, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
    const viewBounds = new THREE.Box3();
    // One fixed camera envelope per phenotype/frame across neutral, lowered
    // and returning poses, so camera recentering cannot conceal the motion.
    for (const sampleTime of [0, browse.measurements.cycleS * .375, browse.measurements.cycleS * .85]) {
      browse.update(sampleTime);
      if (sampleTime === 0) for (const vertex of hoofRest) vertex.rest = actualPoint(vertex);
      if (frame === 'side') viewBounds.expandByObject(actor.wrapper);
      else for (const vertex of selections) viewBounds.expandByPoint(actualPoint(vertex));
      if (frame === 'throat') for (const name of ['chest', 'neck1', 'neck2', 'head']) viewBounds.expandByPoint(actor.instance.bones.get(name).getWorldPosition(new THREE.Vector3()));
    }
    check(!viewBounds.isEmpty() && hoofRest.length > 0, 'Actual weighted browse review surfaces required');
    const state = browse.update(time);
    const hoofDiagnostics = {};
    for (const vertex of hoofRest) {
      const actual = actualPoint(vertex), row = hoofDiagnostics[vertex.foot] ??= {vertices: 0, minSoleHeightM: Infinity, maxDisplacementFromGroundedNeutralM: 0};
      row.vertices++; row.minSoleHeightM = Math.min(row.minSoleHeightM, actual.y);
      row.maxDisplacementFromGroundedNeutralM = Math.max(row.maxDisplacementFromGroundedNeutralM, actual.distanceTo(vertex.rest));
    }
    const target = viewBounds.getCenter(new THREE.Vector3()), size = viewBounds.getSize(new THREE.Vector3());
    const direction = new THREE.Vector3(frame === 'side' ? 0 : .35, frame === 'side' ? 0 : .08, 1).normalize();
    const verticalFov = THREE.MathUtils.degToRad(camera.fov), horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
    const distance = Math.max(size.y / (2 * Math.tan(verticalFov / 2)), Math.hypot(size.x, size.z) / (2 * Math.tan(horizontalFov / 2))) * 1.4;
    camera.position.copy(target).addScaledVector(direction, distance); camera.lookAt(target);
    fitShadow(true); await nextFrame(); render(); await nextFrame(); render();
    return {frame, controls: actor.instance.controls(), neutralMaterial, lighting: 'shared neutral review', shadowReview,
      sourceHash: template.sourceHash, sidecarHash: template.sidecarHash, weightOverride: false,
      measurements: browse.measurements, pose: state, hoofDiagnostics,
      camera: {position: camera.position.toArray(), target: target.toArray(), fieldOfViewDegrees: camera.fov, bounds: {min: viewBounds.min.toArray(), max: viewBounds.max.toArray()}},
      renderer: renderInfo(), visualAcceptance: 'pending human review'};
  }
  function dispose() {
    if (disposed) return {alreadyDisposed: true};
    disposed = true; clearActors(); template?.dispose(); coatReviewBaselines.clear();
    const ownership = disposalSummary(), invalid = [...tracked.values()].filter(row => row.count !== 1);
    scene.remove(floor); floor.geometry.dispose(); floor.material.dispose(); renderer.shadowMap.enabled = false;
    light.shadow.map?.dispose(); light.shadow.mapPass?.dispose(); light.shadow.map = null; light.shadow.mapPass = null;
    renderer.renderLists.dispose(); renderer.info.reset(); renderer.render(scene, camera);
    const finalMemory = memory(); renderer.dispose(); renderer.domElement.remove();
    check(invalid.length === 0, 'Asset resources must be disposed exactly once at final teardown');
    return {ownership, rendererMemoryAfterAssetAndFloorDisposal: finalMemory};
  }
  try {
    const start = performance.now(); template = await loadFaunaTemplate(glbUrl, sidecarUrl); const loadAndDecodeMs = performance.now() - start;
    check(template.sourceHash === expectedHash, `GLB version mismatch: expected ${expectedHash}, got ${template.sourceHash}`);
    if (expectedSidecarHash !== undefined) check(template.sidecarHash === expectedSidecarHash, 'Sidecar version mismatch');
    const probe = template.instantiate(), textureResources = resources(probe.root), decodedTextures = [];
    for (const texture of textureResources.textures) {
      const image = texture.image; const imageWidth = image?.width ?? image?.videoWidth, imageHeight = image?.height ?? image?.videoHeight;
      check(imageWidth > 0 && imageHeight > 0, 'Texture image must really be decoded');
      decodedTextures.push({name: texture.name, width: imageWidth, height: imageHeight, sourceType: image?.constructor?.name,
        rgba8BaseLevelEstimateBytes: imageWidth * imageHeight * 4});
    }
    probe.dispose(); check(decodedTextures.length > 0, 'Expected an actual decoded coat texture');
    const gl = renderer.getContext(), debug = gl.getExtension('WEBGL_debug_renderer_info');
    const webglRenderer = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return {
      metadata: {sourceHash: template.sourceHash, sidecarHash: template.sidecarHash, sourceUrl: template.sourceUrl, id: template.sidecar.id, loadAndDecodeMs, decodedTextures,
        threeRevision: THREE.REVISION, userAgent: navigator.userAgent, hardwareConcurrency: navigator.hardwareConcurrency,
        webglRenderer, webglVendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        softwareRenderer: /swiftshader|llvmpipe|software/i.test(webglRenderer), gpuElapsedTimeMeasured: false,
        timerQueryAvailable: !!gl.getExtension('EXT_disjoint_timer_query_webgl2'),
        setup: {width, height, pixelRatio: 1, antialias: true, shadowMap: [shadowMapSize, shadowMapSize], shadowType: 'PCFSoft', warmupFrames: warmup, measuredFrames: samples,
          animation: 'idle/walk with actual hoof diagnostics; inPlace inspection', morphology: 'deer-individual-1 adult/juvenile mix', frustumCulling: false}},
      measure, churn, reviewCoat, reviewBrowse, dispose,
    };
  } catch (error) { dispose(); throw error; }
}
