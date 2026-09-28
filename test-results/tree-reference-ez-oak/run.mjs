import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { browserArgs } from '../../tests/browser-options.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '../..');
const workspace = path.resolve(appRoot, '..');
const sharp = createRequire(path.join(workspace, 'tools/assetctl/package.json'))('sharp');
const atlasRoot = path.join(workspace, 'Assets/_assetctl/atlas-tree-v7-color-a');
const referenceRoot = path.join(workspace, 'Assets/_assetctl/ez-tree-oak-reference-a');
const atlasFiles = [path.join(atlasRoot, 'atlas-branching-v1.glb'), path.join(atlasRoot, 'atlas-branching-v1.lod1.glb')];
const referenceFiles = ['reference-manifest.json', 'full.json', 'wood-reduced.json', 'upstream-lod1.json', 'upstream-lod2.json'].map(name => path.join(referenceRoot, name));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
await mkdir(here, { recursive: true });
const inputHashes = {};
for (const file of [...atlasFiles, ...referenceFiles]) inputHashes[path.relative(workspace, file).replaceAll(path.sep, '/')] = sha(await readFile(file));

const browser = await chromium.launch({ headless: true, args: browserArgs });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const pageErrors = [], failedResponses = [], consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`); });
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto('http://127.0.0.1:5197/tree-reference-lab.html');
  await page.waitForFunction(() => !!window.__treeReferenceLab && typeof window.__treeReferenceLab.load === 'function');
  await page.locator('#lod0').setInputFiles(atlasFiles[0]);
  await page.locator('#lod1').setInputFiles(atlasFiles[1]);
  await page.locator('#reference').setInputFiles(referenceRoot);
  await page.locator('#load').click();
  await page.waitForFunction(() => window.__treeReferenceLab?.ready, null, { timeout: 120000 });

  const closeCamera = async () => page.evaluate(() => {
    const x = window.__treeReferenceLab;
    x.camera.position.set(9, 9, 24);
    x.controls.target.set(0, 8, 0);
    x.controls.update();
  });
  const frame = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const take = async (name) => {
    await frame();
    await page.screenshot({ path: path.join(here, name), fullPage: true });
  };
  const state = async () => page.evaluate(() => ({
    ready: window.__treeReferenceLab.ready,
    manifest: window.__treeReferenceLab.manifest,
    memory: { ...window.__treeReferenceLab.renderer.info.memory },
    render: { ...window.__treeReferenceLab.renderer.info.render },
    glRenderer: window.__treeReferenceLab.renderer.getContext().getParameter(window.__treeReferenceLab.renderer.getContext().RENDERER),
    glVendor: window.__treeReferenceLab.renderer.getContext().getParameter(window.__treeReferenceLab.renderer.getContext().VENDOR),
    unmaskedRenderer: (() => { const gl=window.__treeReferenceLab.renderer.getContext(), ext=gl.getExtension('WEBGL_debug_renderer_info'); return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null; })(),
    unmaskedVendor: (() => { const gl=window.__treeReferenceLab.renderer.getContext(), ext=gl.getExtension('WEBGL_debug_renderer_info'); return ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):null; })(),
    webglVersion: window.__treeReferenceLab.renderer.getContext().getParameter(window.__treeReferenceLab.renderer.getContext().VERSION),
    shadingLanguage: window.__treeReferenceLab.renderer.getContext().getParameter(window.__treeReferenceLab.renderer.getContext().SHADING_LANGUAGE_VERSION),
    gpuTimerQuery: !!window.__treeReferenceLab.renderer.getContext().getExtension('EXT_disjoint_timer_query_webgl2'),
  }));

  const initialState = await state();
  assert.equal(initialState.ready, true);
  assert.match(initialState.unmaskedRenderer ?? initialState.glRenderer, /NVIDIA/i, `must use hardware renderer, got ${initialState.unmaskedRenderer ?? initialState.glRenderer}`);
  const mappingAudit = await page.evaluate(() => {
    const found = [];
    window.__treeReferenceLab.scene.traverse(object => {
      if (!object.isInstancedMesh) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) for (const key of ['map', 'normalMap']) {
        const texture = material[key];
        if (texture && Math.abs(texture.repeat.x - .25) < 1e-8 && Math.abs(texture.repeat.y + .25) < 1e-8 && Math.abs(texture.offset.y - .25) < 1e-8)
          found.push({ material: material.name, key, repeat: texture.repeat.toArray(), offset: texture.offset.toArray() });
      }
    });
    return { statusText: document.querySelector('#status').textContent, flippedTextures: found };
  });
  assert.ok(mappingAudit.flippedTextures.length >= 2, 'reference map and normal map clones have top-left tile V flip');
  assert.match(mappingAudit.statusText, /V flipped so the sprig stem meets the attachment/);
  await page.evaluate(() => { const x = window.__treeReferenceLab; x.setPopulation(1); x.setDetail('full'); x.setMode('atlas'); x.setNormals('source'); });
  await closeCamera();
  await take('atlas-full-close.png');
  await page.evaluate(() => window.__treeReferenceLab.setMode('reference'));
  await closeCamera();
  await take('ez-full-source-normals-close.png');
  await page.evaluate(() => window.__treeReferenceLab.setMode('atlas'));
  await closeCamera();
  await take('atlas-full-close.png');
  await page.evaluate(() => window.__treeReferenceLab.setMode('reference'));
  await page.evaluate(() => window.__treeReferenceLab.setNormals('geometric'));
  await closeCamera();
  await take('ez-full-geometric-normals-close.png');
  await page.evaluate(() => { const x = window.__treeReferenceLab; x.setNormals('source'); x.setDetail('wood-reduced'); });
  await closeCamera();
  await take('ez-wood-reduced-close.png');
  await page.evaluate(() => window.__treeReferenceLab.setDetail('upstream-lod1'));
  await closeCamera();
  await take('ez-upstream-lod1-close.png');
  await page.evaluate(() => window.__treeReferenceLab.setDetail('upstream-lod2'));
  await closeCamera();
  await take('ez-upstream-lod2-close.png');
  const writeComparison = async (rightFile, output) => {
    const [left, right] = await Promise.all([
      sharp(path.join(here, 'atlas-full-close.png')).extract({ left: 320, top: 30, width: 800, height: 900 }).resize(600, 675).png().toBuffer(),
      sharp(path.join(here, rightFile)).extract({ left: 320, top: 30, width: 800, height: 900 }).resize(600, 675).png().toBuffer(),
    ]);
    await sharp({ create: { width: 1200, height: 675, channels: 3, background: '#111820' } })
      .composite([{ input: left, left: 0, top: 0 }, { input: right, left: 600, top: 0 }])
      .png().toFile(path.join(here, output));
  };
  await writeComparison('ez-full-source-normals-close.png', 'comparison.png');

  // The API receives only the two selected Atlas GLBs and the manifest-listed LOD JSON files.
  const badManifest = structuredClone(initialState.manifest);
  badManifest.artifacts.find(item => item.path === 'full.json').sha256 = '0'.repeat(64);
  const failureBefore = await state();
  const failedLoad = await page.evaluate(async bad => {
    const x = window.__treeReferenceLab;
    const lod0 = document.querySelector('#lod0').files[0], lod1 = document.querySelector('#lod1').files[0];
    const files = new Map(Array.from(document.querySelector('#reference').files).map(file => [file.webkitRelativePath.split('/').slice(1).join('/'), file]));
    try {
      await x.load(await lod0.arrayBuffer(), await lod1.arrayBuffer(), bad, async p => {
        const file = files.get(p); if (!file) throw new Error(`Missing ${p}`); return file.arrayBuffer();
      });
      return { rejected: false };
    } catch (error) { return { rejected: true, message: String(error) }; }
  }, badManifest);
  assert.equal(failedLoad.rejected, true, 'bad artifact hash rejected');
  assert.match(failedLoad.message, /Reference LOD hash mismatch/);
  await page.waitForFunction(() => window.__treeReferenceLab?.ready);
  const failureAfter = await state();
  assert.equal(failureAfter.ready, true, 'failed replacement load preserves active family');
  assert.equal(failureAfter.manifest.preset, failureBefore.manifest.preset);
  assert.deepEqual(failureAfter.memory, failureBefore.memory, 'failed replacement leaves no net geometry/texture allocation');

  const renderTimings = [];
  let concurrentMutationGuard = null;
  for (const mode of ['atlas', 'reference']) {
    await page.evaluate(value => { const x = window.__treeReferenceLab; x.setMode(value); x.setDetail('full'); x.setNormals('source'); }, mode);
    for (const population of [3, 64, 192]) {
      await page.evaluate(n => window.__treeReferenceLab.setPopulation(n), population);
      await frame();
      const pendingMeasurement = page.evaluate(() => window.__treeReferenceLab.measure(60));
      if (!concurrentMutationGuard) {
        await page.waitForTimeout(40);
        concurrentMutationGuard = await page.evaluate(() => {
          try { window.__treeReferenceLab.setDetail('wood-reduced'); return 'unexpectedly accepted'; }
          catch (error) { return String(error); }
        });
        assert.match(concurrentMutationGuard, /Measurement already in progress/);
      }
      const measurement = await pendingMeasurement;
      assert.equal(measurement.glError, 0, `${mode} population ${population}: clean WebGL error state`);
      assert.equal(measurement.render.calls, 2, `${mode} population ${population}: two instanced material draws`);
      renderTimings.push(measurement);
    }
  }

  // Verify successful replacement disposes the prior active family without accumulating GPU objects.
  const memoryBeforeReload = await page.evaluate(() => ({ ...window.__treeReferenceLab.renderer.info.memory }));
  const reloadManifest = initialState.manifest;
  const reload = await page.evaluate(async manifest => {
    const x = window.__treeReferenceLab;
    const lod0 = document.querySelector('#lod0').files[0], lod1 = document.querySelector('#lod1').files[0];
    const files = new Map(Array.from(document.querySelector('#reference').files).map(file => [file.webkitRelativePath.split('/').slice(1).join('/'), file]));
    await x.load(await lod0.arrayBuffer(), await lod1.arrayBuffer(), manifest, async p => {
      const file = files.get(p); if (!file) throw new Error(`Missing ${p}`); return file.arrayBuffer();
    });
    return true;
  }, reloadManifest);
  assert.equal(reload, true);
  await frame();
  const memoryAfterReload = await page.evaluate(() => ({ ...window.__treeReferenceLab.renderer.info.memory }));
  assert.ok(memoryAfterReload.geometries <= memoryBeforeReload.geometries, 'successful family replacement does not increase renderer.info uploaded-geometry count');
  assert.ok(memoryAfterReload.textures <= memoryBeforeReload.textures, 'successful family replacement does not increase renderer.info uploaded-texture count');

  const supplementalReferences = [
    { name: 'ash16m', root: path.join(workspace, 'Assets/_assetctl/ez-tree-reference-test-1790579495486-71808-ash'), preset: 'ash_medium', heightM: 16 },
    { name: 'oak10m', root: path.join(workspace, 'Assets/_assetctl/ez-tree-oak-reference-10m'), preset: 'oak_medium', heightM: 10 },
    { name: 'oak22m', root: path.join(workspace, 'Assets/_assetctl/ez-tree-oak-reference-22m'), preset: 'oak_medium', heightM: 22 },
  ];
  const supplementalReports = [];
  for (const sample of supplementalReferences) {
    const mf = JSON.parse(await readFile(path.join(sample.root, 'reference-manifest.json'), 'utf8'));
    assert.equal(mf.preset, sample.preset); assert.equal(mf.height, sample.heightM);
    const sampleFiles = ['reference-manifest.json', 'full.json', 'wood-reduced.json', 'upstream-lod1.json', 'upstream-lod2.json'].map(name => path.join(sample.root, name));
    await page.locator('#reference').setInputFiles(sample.root);
    await page.locator('#load').click();
    await page.waitForFunction(preset => window.__treeReferenceLab?.manifest?.preset === preset, sample.preset, { timeout: 120000 });
    await page.waitForFunction(height => window.__treeReferenceLab?.manifest?.height === height, sample.heightM);
    await page.evaluate(() => { const x = window.__treeReferenceLab; x.setMode('atlas'); x.setDetail('full'); x.setPopulation(1, false); });
    await page.evaluate(height => {
      const x = window.__treeReferenceLab, k = height / 16;
      x.camera.position.set(9 * k, height / 2 + k, 24 * k);
      x.controls.target.set(0, height / 2, 0); x.controls.update();
    }, sample.heightM);
    const atlasScreenshot = `atlas-${sample.name}-scaled.png`;
    await take(atlasScreenshot);
    await page.evaluate(() => { const x = window.__treeReferenceLab; x.setMode('reference'); x.setNormals('geometric'); });
    const screenshot = `ez-${sample.name}-full-geometric-normals.png`;
    await take(screenshot);
    const atlasShot = path.join(here, atlasScreenshot), sampleShot = path.join(here, screenshot);
    const [left, right] = await Promise.all([
      sharp(atlasShot).extract({ left: 320, top: 30, width: 800, height: 900 }).resize(600, 675).png().toBuffer(),
      sharp(sampleShot).extract({ left: 320, top: 30, width: 800, height: 900 }).resize(600, 675).png().toBuffer(),
    ]);
    await sharp({ create: { width: 1200, height: 675, channels: 3, background: '#111820' } })
      .composite([{ input: left, left: 0, top: 0 }, { input: right, left: 600, top: 0 }])
      .png().toFile(path.join(here, `comparison-${sample.name}.png`));
    const full = mf.metrics.lods.find(lod => lod.id === 'full');
    supplementalReports.push({ ...sample, inputHashes: Object.fromEntries(await Promise.all(sampleFiles.map(async file => [path.basename(file), sha(await readFile(file))]))), triangles: full?.triangles, vertices: full?.vertices, atlasScreenshot, screenshot, comparison: `comparison-${sample.name}.png`, cameraScale: sample.heightM / 16, note: 'Atlas and reference are instantiated at the same requested height and camera is scaled proportionally; visual shape/card-density comparison only, no population timing matrix.' });
  }

  const finalState = await state();
  assert.deepEqual(pageErrors, [], 'no uncaught browser errors');
  assert.deepEqual(failedResponses, [], 'no failed network responses');
  assert.deepEqual(consoleErrors, [], 'no browser console errors');
  const report = {
    schemaVersion: 1,
    checkedAt: new Date().toISOString(),
    appUrl: 'http://127.0.0.1:5197/tree-reference-lab.html',
    renderer: {
      vendor: initialState.glVendor,
      renderer: initialState.glRenderer,
      unmaskedVendor: initialState.unmaskedVendor,
      unmaskedRenderer: initialState.unmaskedRenderer,
      webglVersion: initialState.webglVersion,
      shadingLanguage: initialState.shadingLanguage,
      timerQueryAvailable: initialState.gpuTimerQuery,
      playwright: JSON.parse(await readFile(path.join(appRoot, 'node_modules/playwright/package.json'), 'utf8')).version,
      userAgent: await page.evaluate(() => navigator.userAgent),
      viewport: { width: 1440, height: 1000, deviceScaleFactor: 1 },
      hardwareFlag: !!process.env.ATLAS_HARDWARE,
    },
    inputs: inputHashes,
    labSourceHashes: Object.fromEntries(await Promise.all(['tree-reference-lab.html', 'src/tree-reference-lab.ts', 'src/tree-asset.ts'].map(async file => [file, sha(await readFile(path.join(appRoot, file)))]))),
    manifestSummary: { preset: initialState.manifest.preset, revision: initialState.manifest.source.revision, heightM: initialState.manifest.height, lods: initialState.manifest.metrics.lods.map(lod => ({ id: lod.id, triangles: lod.triangles, vertices: lod.vertices, heightM: lod.bounds.max[1] })) },
    foliageMapping: mappingAudit,
    visualComparisons: {
      matchedView: { cameraPosition: [9, 9, 24], target: [0, 8, 0], directionalLight: [-30, 55, 25], hemisphere: true },
      screenshots: ['comparison.png', 'atlas-full-close.png', 'ez-full-source-normals-close.png', 'ez-full-geometric-normals-close.png', 'ez-wood-reduced-close.png', 'ez-upstream-lod1-close.png', 'ez-upstream-lod2-close.png'],
      limits: ['Static geometry comparison only. No wind, shadows or game integration.', 'Reference cards retain the brief-defined 1.2m square size; Atlas native cards are 1x1.2m.', 'Both use Atlas bark and foliage texture images, but reference geometry uses foliage tile (0,0), reference UVs and source/geometric normals rather than native Atlas UVs and tangents.'],
    },
    measurements: { framesPerSample: 60, renderTimings, drawCallsExpected: 2, allSamplesTwoInstancedDraws: renderTimings.every(item => item.render.calls === 2), noFullGameClaim: true },
    supplementalReferences: supplementalReports,
    guards: { badArtifactHashRejected: failedLoad, activeFamilyPreserved: failureAfter.ready && failureAfter.manifest.preset === failureBefore.manifest.preset, measurementBlocksMutation: concurrentMutationGuard, memoryBeforeFailedLoad: failureBefore.memory, memoryAfterFailedLoad: failureAfter.memory, memoryBeforeSuccessfulReplacement: memoryBeforeReload, memoryAfterSuccessfulReplacement: memoryAfterReload, rendererInfoCountsNotHigherAfterReplacement: memoryAfterReload.geometries <= memoryBeforeReload.geometries && memoryAfterReload.textures <= memoryBeforeReload.textures },
    errors: { pageErrors, failedResponses, consoleErrors, finalMemory: finalState.memory },
    resourceCounterLimit: 'renderer.info.memory reflects currently GPU-uploaded objects; the successful replacement changed geometries 10→2 because hidden detail groups were lazily uploaded. This is not a WebGL buffer-deletion or disposal proof.',
  };
  await writeFile(path.join(here, 'browser-report.json'), JSON.stringify(report, null, 2));
  console.log(`Reference lab passed: ${renderTimings.length} hardware samples, 2 draws each. Screenshots and report: ${here}`);
} finally {
  await browser.close();
}
