import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, realpath, stat } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { browserArgs } from './browser-options.mjs';
import { withGpuLock } from './helpers/gpu-lock.mjs';
import { createHash } from 'node:crypto';
import { buildGlb, parseGlb } from '../../tools/assetctl/third-party/charactercreator/glbpack.js';

const url = process.env.ATLAS_URL || 'http://127.0.0.1:5193/creature-lab.html?mode=skin&source=blender-reference';
const output = process.env.ATLAS_RESULTS || 'test-results/fauna-blender-2026-10-02/browser';
assert.equal(process.argv.length, 2, 'No positional arguments; configure ATLAS_URL, ATLAS_RESULTS and optional FAUNA_TEMPLATE_FIXTURE');
// Optional local directory, resolved against cwd. Never fetch fixture bytes from a URL.
const fixtureInput = process.env.FAUNA_TEMPLATE_FIXTURE;
if (fixtureInput !== undefined) {
  assert.ok(fixtureInput.length > 0 && fixtureInput === fixtureInput.trim(), 'FAUNA_TEMPLATE_FIXTURE must be a nonempty directory path without surrounding whitespace');
  assert.ok(!/[\x00-\x1f]/.test(fixtureInput) && !/^[a-z][a-z0-9+.-]*:\/\//i.test(fixtureInput), 'FAUNA_TEMPLATE_FIXTURE must be a local directory path, not a URL');
}
const fixtureDirectory = await realpath(fixtureInput === undefined
  ? fileURLToPath(new URL('../public/assets/fauna/deer-doe-v1/', import.meta.url))
  : resolve(fixtureInput));
assert.ok((await stat(fixtureDirectory)).isDirectory(), 'FAUNA_TEMPLATE_FIXTURE must be a directory');
const fixturePaths = await Promise.all(['deer-doe.glb', 'fauna-template.json'].map(async name => {
  const path = await realpath(join(fixtureDirectory, name));
  assert.equal(dirname(path), fixtureDirectory, `Fixture ${name} must resolve inside the selected directory`);
  assert.ok((await stat(path)).isFile(), `Fixture ${name} must be a regular file`);
  return path;
}));
const [fixtureGlb, fixtureSidecarBytes] = await Promise.all(fixturePaths.map(path => readFile(path)));
const fixtureSidecar = JSON.parse(fixtureSidecarBytes.toString('utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const runtimeRoute = /\/assets\/fauna\/deer-doe-v1\/(?:revisions\/[a-f0-9]{64}\/[a-f0-9]{64}\/)?deer-doe\.glb$/;
const sidecarRoute = /\/assets\/fauna\/deer-doe-v1\/(?:revisions\/[a-f0-9]{64}\/[a-f0-9]{64}\/)?fauna-template\.json$/;
const identityTargets = ['bodyCondition_min','bodyCondition_max','neckLength_min','neckLength_max','legLength_min','legLength_max','muzzleLength_min','muzzleLength_max','earSize_min','earSize_max','juvenile','bodyCondition_max__legLength_max'];
const poseTargets = (fixtureSidecar.poseCorrectives ?? []).map(recipe => recipe.target).sort();
assert.ok(poseTargets.length === 0 || JSON.stringify(poseTargets) === JSON.stringify(['L_hip_flexion_groin','R_hip_flexion_groin']), 'Only the explicitly reviewed optional hip pair is valid in this deer fixture');
const expectedTargets = [...identityTargets, ...poseTargets].sort();
assert.deepEqual(fixtureSidecar.targets.map(target => target.name).sort(), expectedTargets, 'Fixture must retain all twelve identity targets and only declared pose additions');
await mkdir(output, { recursive: true });
const errors = [], samples = [];
await withGpuLock({ owner: 'fauna-template-browser', timeoutMs: 60000, staleMs: Infinity }, async () => {
  const browser = await chromium.launch({ headless: true, args: browserArgs });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    const settle = async () => {
      await page.waitForFunction(() => window.__creatureLab?.ready || window.__creatureLab?.error);
      assert.equal(await page.evaluate(() => window.__creatureLab.error), null);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      return page.evaluate(() => { const d = window.__creatureLab; return {
        actorCount: d.actorCount, authored: d.authoredDetails, state: d.specimenState,
        url: d.specimenUrl, renderer: d.renderer, individuals: d.individuals,
      }; });
    };
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.selectOption('#mode', 'skin');
    await page.selectOption('#skin-source', 'blender-reference');
    const initial = await settle();
    assert.equal(initial.actorCount, 1);
    assert.equal(initial.authored.length, 1);
    assert.equal(initial.authored[0].bones.length, 27);
    assert.deepEqual(Object.keys(initial.authored[0].influences).sort(), expectedTargets, 'Runtime morph catalogue must exactly match the staged reviewed fixture');
    assert.match(initial.authored[0].sourceHash, /^[a-f0-9]{64}$/);
    assert.match(initial.authored[0].sidecarHash, /^[a-f0-9]{64}$/);
    assert.equal(initial.authored[0].sourceHash, hash(fixtureGlb), 'Served GLB must match the selected local fixture');
    assert.equal(initial.authored[0].sidecarHash, hash(fixtureSidecarBytes), 'Served sidecar must match the selected local fixture');
    assert.equal(initial.state.replayVersion, 2);
    assert.equal(initial.state.sidecarHash, initial.authored[0].sidecarHash);
    assert.equal(new URL(initial.url).searchParams.get('sidecarHash'), initial.authored[0].sidecarHash);
    assert.equal(initial.authored[0].bounds.finite, true);
    await page.screenshot({ path: join(output, 'neutral-body.png') });
    await page.selectOption('#skin-focus', 'head'); await settle();
    await page.screenshot({ path: join(output, 'neutral-face.png') });
    await page.selectOption('#skin-focus', 'body');
    await page.selectOption('#skin-view', 'side');
    for (const id of ['bodyCondition', 'neckLength', 'legLength', 'muzzleLength', 'earSize', 'juvenile']) {
      for (const value of id === 'juvenile' ? [1] : [-1, 1]) {
        await page.click('#template-reset');
        await page.locator(`#morph-${id}`).fill(String(value));
        const state = await settle();
        assert.equal(state.authored[0].controls[id], value);
        assert.equal(state.authored[0].influences[id === 'juvenile' ? id : `${id}_${value > 0 ? 'max' : 'min'}`], 1);
        await page.screenshot({ path: join(output, `${id}-${value}.png`) });
        samples.push({ id, value, state });
      }
    }
    await page.locator('#morph-legLength').fill('0.6');
    await page.locator('#morph-bodyCondition').fill('0.4');
    const altered = await settle();
    assert.equal(altered.authored[0].influences.bodyCondition_max__legLength_max, 0.24);
    await page.goto(altered.url, { waitUntil: 'networkidle' });
    const replay = await settle();
    assert.deepEqual(replay.authored[0].controls, altered.authored[0].controls);
    assert.deepEqual(replay.authored[0].influences, altered.authored[0].influences);
    await page.click('#template-reset');
    await page.locator('#morph-bodyCondition').fill('0.4');
    await page.locator('#lock-bodyCondition').check();
    await page.click('#template-apply-recipe');
    const recipe = await settle();
    assert.equal(recipe.state.templateRecipe, 'deer-individual-1');
    assert.equal(recipe.state.morphLocks, 'bodyCondition');
    assert.equal(recipe.authored[0].controls.bodyCondition, .4);
    assert.equal(recipe.state.assetHash, initial.authored[0].sourceHash);
    assert.equal(recipe.state.sidecarHash, initial.authored[0].sidecarHash);
    await page.selectOption('#variant', '1');
    const individual = await settle();
    assert.equal(individual.authored[0].controls.bodyCondition, .4, 'locked trait survives new individual');
    assert.notDeepEqual(individual.authored[0].controls, recipe.authored[0].controls, 'unlocked individual traits vary');
    await page.selectOption('#growth', 'juvenile');
    const young = await settle();
    assert.equal(young.authored[0].controls.juvenile, 1);
    for (const id of ['bodyCondition', 'neckLength', 'legLength', 'muzzleLength', 'earSize'])
      assert.equal(young.authored[0].controls[id], individual.authored[0].controls[id], 'growth preserves individual proportions');
    await page.screenshot({ path: join(output, 'individual-juvenile.png') });
    await page.goto(young.url, { waitUntil: 'networkidle' });
    const recipeReplay = await settle();
    assert.deepEqual(recipeReplay.authored[0].controls, young.authored[0].controls);
    assert.equal(recipeReplay.state.morphLocks, 'bodyCondition');
    assert.equal(recipeReplay.state.templateRecipe, 'deer-individual-1');
    assert.equal(recipeReplay.state.assetHash, young.state.assetHash);
    await page.selectOption('#growth', 'adult');
    assert.deepEqual((await settle()).authored[0].controls, individual.authored[0].controls);
    await page.locator('#morph-neckLength').fill('0.3');
    const manual = await settle();
    assert.equal(manual.state.templateRecipe, 'manual');
    assert.equal(manual.state.morphLocks, 'bodyCondition', 'manual edits retain locks');
    await page.selectOption('#variant', '2');
    assert.deepEqual((await settle()).authored[0].controls, manual.authored[0].controls, 'manual shape does not reroll');
    await page.click('#template-reset');
    const reset = await settle();
    assert.equal(reset.state.morphLocks, '');
    assert.equal(reset.state.templateRecipe, 'manual');
    assert.ok(Object.values(reset.authored[0].controls).every(value => value === 0));
    await page.locator('#skin-compare').check();
    const comparison = await settle();
    assert.equal(comparison.actorCount, 2);
    assert.deepEqual(comparison.individuals.map(item => item.source), ['blender-reference', 'procedural']);
    await page.screenshot({ path: join(output, 'baseline-comparison.png') });
    await page.locator('#skin-compare').uncheck();
    await page.locator('#skeleton').check(); await settle();
    await page.screenshot({ path: join(output, 'skeleton.png') });
    await page.locator('#skeleton').uncheck();
    await page.selectOption('#skin-pose', 'walk');
    const motionSamples = [];
    for (const time of [0, .17, .34, .51, .68, .85, 1.02]) {
      await page.locator('#skin-time').fill(String(time));
      const state = await settle(), motion = state.authored[0].motion;
      assert.equal(motion.gait, 'walk');
      assert.equal(motion.inPlace, true, 'centred inspection is explicitly identified');
      assert.equal(motion.feet.length, 4);
      assert.ok(motion.maxContactErrorM < .005, 'actual skinned hoof stays within 5mm of target');
      assert.ok(motion.feet.every(foot => foot.minSoleHeightM >= -.002), 'whole hoof stays within 2mm of floor');
      assert.ok(motion.maxReachErrorM < 1e-5, 'walk targets remain reachable');
      motionSamples.push({ time, motion });
      await page.screenshot({ path: join(output, `walk-${String(time).replace('.', '-')}.png`) });
      if (time === .85) {
        await page.locator('#neutral').check(); await settle();
        await page.screenshot({ path: join(output, 'neutral-material-walk-085.png') });
        await page.locator('#neutral').uncheck(); await settle();
      }
    }
    await page.locator('#skin-time').fill('0.17');
    assert.deepEqual((await settle()).authored[0].motion, motionSamples[1].motion, 'pose seek is history independent');
    await page.selectOption('#skin-pose', 'neutral');
    const memoryBefore = (await settle()).renderer.memory;
    for (let i = 0; i < 5; i++) {
      await page.selectOption('#skin-source', 'procedural'); await settle();
      await page.selectOption('#skin-source', 'blender-reference'); await settle();
    }
    const memoryAfter = (await settle()).renderer.memory;
    assert.deepEqual(memoryAfter, memoryBefore, 'repeated asset load/disposal has stable resident geometry and textures');
    await page.setViewportSize({ width: 390, height: 844 }); await settle();
    await page.screenshot({ path: join(output, 'mobile.png'), fullPage: true });
    assert.deepEqual(errors, []);
    const failedPage = await browser.newPage();
    await failedPage.route('**/assets/fauna/deer-doe-v1/deer-doe.glb', route => route.fulfill({ status: 503, body: 'Intentional fixture: asset unavailable' }));
    await failedPage.goto(url, { waitUntil: 'networkidle' });
    await failedPage.waitForFunction(() => Boolean(window.__creatureLab?.error));
    const failedState = await failedPage.evaluate(() => ({ ready: window.__creatureLab.ready, actors: window.__creatureLab.actorCount, authored: window.__creatureLab.authoredDetails, error: window.__creatureLab.error }));
    assert.equal(failedState.ready, false);
    assert.equal(failedState.actors, 0, 'failed asset never silently substitutes a procedural animal');
    assert.deepEqual(failedState.authored, []);
    await failedPage.close();
    const pinnedPage = await browser.newPage();
    const wrongRevision = new URL(altered.url);
    wrongRevision.searchParams.set('assetHash', '0'.repeat(64));
    // Serve valid, wrong bytes at the requested immutable path to exercise the
    // GLB hash guard independently of missing-revision HTTP handling below.
    await pinnedPage.route(runtimeRoute,route=>route.fulfill({status:200,contentType:'model/gltf-binary',body:fixtureGlb}));
    await pinnedPage.route(sidecarRoute,route=>route.fulfill({status:200,contentType:'application/json',body:fixtureSidecarBytes}));
    await pinnedPage.goto(wrongRevision.href, { waitUntil: 'networkidle' });
    await pinnedPage.waitForFunction(() => Boolean(window.__creatureLab?.error));
    const mismatchState = await pinnedPage.evaluate(() => ({ ready: window.__creatureLab.ready, actors: window.__creatureLab.actorCount, error: window.__creatureLab.error }));
    assert.equal(mismatchState.ready, false);
    assert.equal(mismatchState.actors, 0);
    assert.match(mismatchState.error, /version.*mismatch/i);
    await pinnedPage.close();
    const sidecarFailures=[];
    for(const kind of ['wrong-hash','changed-bytes','unavailable','malformed-json','invalid-hash','missing-v2-pin']){
      const p=await browser.newPage(),requestedUrl=new URL(altered.url);
      if(kind==='wrong-hash')requestedUrl.searchParams.set('sidecarHash','0'.repeat(64));
      if(kind==='invalid-hash')requestedUrl.searchParams.set('sidecarHash','invalid');
      if(kind==='missing-v2-pin')requestedUrl.searchParams.delete('sidecarHash');
      if(kind==='wrong-hash'){
        await p.route(runtimeRoute,route=>route.fulfill({status:200,contentType:'model/gltf-binary',body:fixtureGlb}));
        await p.route(sidecarRoute,route=>route.fulfill({status:200,contentType:'application/json',body:fixtureSidecarBytes}));
      }
      if(['changed-bytes','unavailable','malformed-json'].includes(kind))await p.route(sidecarRoute,async route=>{
        if(kind==='unavailable')return route.fulfill({status:503,body:'Intentional sidecar failure'});
        if(kind==='malformed-json')return route.fulfill({status:200,contentType:'application/json',body:'invalid JSON'});
        const response=await route.fetch(),data=await response.json(),target=data.targets.find(t=>t.name==='bodyCondition_max'),joint=Object.keys(target.jointDeltas)[0];
        target.jointDeltas[joint][0]+=.001; // Valid data; the exact same GLB now has different joint correction.
        await route.fulfill({response,body:JSON.stringify(data),contentType:'application/json'});
      });
      await p.goto(requestedUrl.href,{waitUntil:'networkidle'});await p.waitForFunction(()=>Boolean(window.__creatureLab?.error));
      const state=await p.evaluate(()=>({ready:window.__creatureLab.ready,actors:window.__creatureLab.actorCount,authored:window.__creatureLab.authoredDetails,error:window.__creatureLab.error}));
      assert.equal(state.ready,false);assert.equal(state.actors,0);assert.deepEqual(state.authored,[],'Sidecar failure cannot display an animal or substitute a fallback');
      if(['wrong-hash','changed-bytes'].includes(kind))assert.match(state.error,/sidecar revision/);
      sidecarFailures.push({kind,...state});await p.close();
    }
    const legacyPage=await browser.newPage(),legacyUrl=new URL(altered.url);legacyUrl.searchParams.delete('sidecarHash');legacyUrl.searchParams.delete('replayVersion');
    await legacyPage.goto(legacyUrl.href,{waitUntil:'networkidle'});await legacyPage.waitForFunction(()=>window.__creatureLab?.ready||window.__creatureLab?.error);
    const legacyState=await legacyPage.evaluate(()=>({error:window.__creatureLab.error,actors:window.__creatureLab.actorCount,state:window.__creatureLab.specimenState}));
    assert.equal(legacyState.error,null);assert.equal(legacyState.actors,1);assert.equal(legacyState.state.assetHash,altered.state.assetHash);
    assert.equal(legacyState.state.sidecarHash,initial.authored[0].sidecarHash,'A newly copied link pins the sidecar actually loaded by a legacy link');assert.equal(legacyState.state.replayVersion,2);await legacyPage.close();
    // Simulate a valid default-byte upgrade while retaining the old archived
    // revision on the actual server. This is asset replay, not app-version replay.
    const upgraded=parseGlb(fixtureGlb);upgraded.json.asset.generator=(upgraded.json.asset.generator||'fixture')+' retained-replay-upgrade';
    const upgradedGlb=Buffer.from(buildGlb(upgraded.json,upgraded.bin)),upgradedSidecar=Buffer.from('\n'+fixtureSidecarBytes.toString('utf8'));
    const upgradeContext=await browser.newContext(),defaultRequests=[];
    await upgradeContext.route('**/assets/fauna/deer-doe-v1/deer-doe.glb',route=>{defaultRequests.push('glb');return route.fulfill({status:200,contentType:'model/gltf-binary',body:upgradedGlb});});
    await upgradeContext.route('**/assets/fauna/deer-doe-v1/fauna-template.json',route=>{defaultRequests.push('sidecar');return route.fulfill({status:200,contentType:'application/json',body:upgradedSidecar});});
    const upgradedPage=await upgradeContext.newPage(),unpin=new URL(url);for(const key of ['assetHash','sidecarHash','replayVersion'])unpin.searchParams.delete(key);
    await upgradedPage.goto(unpin.href,{waitUntil:'networkidle'});await upgradedPage.waitForFunction(()=>window.__creatureLab?.ready||window.__creatureLab?.error);
    const upgradedState=await upgradedPage.evaluate(()=>({error:window.__creatureLab.error,state:window.__creatureLab.specimenState}));
    assert.equal(upgradedState.error,null);assert.equal(upgradedState.state.assetHash,hash(upgradedGlb));assert.equal(upgradedState.state.sidecarHash,hash(upgradedSidecar));
    assert.notEqual(upgradedState.state.assetHash,altered.state.assetHash);assert.notEqual(upgradedState.state.sidecarHash,altered.state.sidecarHash);
    defaultRequests.length=0;
    const retainedPage=await upgradeContext.newPage();await retainedPage.goto(altered.url,{waitUntil:'networkidle'});await retainedPage.waitForFunction(()=>window.__creatureLab?.ready||window.__creatureLab?.error);
    const retainedState=await retainedPage.evaluate(()=>({error:window.__creatureLab.error,actors:window.__creatureLab.actorCount,state:window.__creatureLab.specimenState,authored:window.__creatureLab.authoredDetails}));
    assert.equal(retainedState.error,null);assert.equal(retainedState.actors,1);assert.equal(retainedState.state.assetHash,altered.state.assetHash);assert.equal(retainedState.state.sidecarHash,altered.state.sidecarHash);
    assert.deepEqual(retainedState.authored[0].controls,altered.authored[0].controls);assert.deepEqual(retainedState.authored[0].influences,altered.authored[0].influences);
    assert.ok(retainedState.authored[0].sourceUrl.includes(`/revisions/${altered.state.assetHash}/${altered.state.sidecarHash}/`));
    assert.deepEqual(defaultRequests,[],'Pinned old specimen must never load replacement defaults');
    const missingPage=await upgradeContext.newPage(),missingUrl=new URL(altered.url);missingUrl.searchParams.set('sidecarHash','f'.repeat(64));
    await missingPage.route(/\/revisions\//,route=>route.fulfill({status:404,body:'Missing retained revision fixture'}));
    await missingPage.goto(missingUrl.href,{waitUntil:'networkidle'});await missingPage.waitForFunction(()=>Boolean(window.__creatureLab?.error));
    const missingState=await missingPage.evaluate(()=>({ready:window.__creatureLab.ready,error:window.__creatureLab.error,actors:window.__creatureLab.actorCount,authored:window.__creatureLab.authoredDetails}));
    assert.equal(missingState.ready,false);assert.equal(missingState.actors,0);assert.deepEqual(missingState.authored,[]);assert.deepEqual(defaultRequests,[],'Missing retained revision must fail without default fallback');
    await upgradeContext.close();
    const racePage = await browser.newPage();
    let releaseAsset;
    const heldAsset = new Promise(resolve => { releaseAsset = resolve; });
    let observeRequest;
    const requested = new Promise(resolve => { observeRequest = resolve; });
    await racePage.route('**/assets/fauna/deer-doe-v1/deer-doe.glb', async route => {
      observeRequest(); await heldAsset; await route.continue();
    });
    await racePage.goto(url, { waitUntil: 'domcontentloaded' });
    await requested;
    await racePage.selectOption('#skin-source', 'procedural');
    await racePage.waitForFunction(() => window.__creatureLab?.ready);
    const completion = racePage.waitForResponse(response => response.url().endsWith('/deer-doe.glb'));
    releaseAsset(); await completion; await racePage.waitForLoadState('networkidle');
    await racePage.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const raceState = await racePage.evaluate(() => ({ source: window.__creatureLab.specimenState.source, actors: window.__creatureLab.actorCount, authored: window.__creatureLab.authoredDetails, error: window.__creatureLab.error }));
    assert.equal(raceState.source, 'procedural');
    assert.equal(raceState.actors, 1);
    assert.deepEqual(raceState.authored, [], 'late asset completion cannot resurrect a discarded specimen');
    assert.equal(raceState.error, null);
    await racePage.close();
    await writeFile(join(output, 'report.json'), JSON.stringify({ passed: true, fixture: { directory: fixtureDirectory, assetHash: hash(fixtureGlb), sidecarHash: hash(fixtureSidecarBytes) }, initial, recipe, individual, young, recipeReplay, manual, reset, comparison, memoryBefore, memoryAfter, samples, motionSamples, failedState, mismatchState, sidecarFailures, legacyState, upgradedState, retainedState, missingState, raceState, errors, visualAcceptance: 'requires separate inspection' }, null, 2));
    console.log(JSON.stringify({ passed: true, specimens: samples.length, memoryBefore, memoryAfter, output }));
  } catch (error) {
    await writeFile(join(output, 'failure.json'), JSON.stringify({ message: error.message, stack: error.stack, errors, samples }, null, 2));
    throw error;
  } finally { await browser.close(); }
});
