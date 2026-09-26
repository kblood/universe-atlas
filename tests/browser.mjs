import { chromium, firefox } from "playwright";
import {browserArgs} from './browser-options.mjs';
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { starLifecycle } from "../src/stellar-evolution.ts";
import { galaxies } from "../src/catalog.ts";
import { galaxyLifecycle, galaxyStateAt } from "../src/galaxy-history.ts";
import { CATALOGUE_EPOCH_NS } from "../src/world-time.ts";
const base = process.env.ATLAS_URL || "http://127.0.0.1:5186/";
const engine = process.env.ATLAS_ENGINE === "firefox" ? firefox : chromium;
const browser = await engine.launch({
  headless: true,
  args:
    engine.name() === "chromium"
      ? browserArgs
      : [],
});
const output = process.env.ATLAS_RESULTS || "test-results";
await mkdir(output, { recursive: true });
const errors = [];
const requests = [];
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
page.on("pageerror", (e) => errors.push(e.message));
page.on("requestfailed", (r) =>
  requests.push(r.url() + ": " + r.failure()?.errorText),
);
const waitLevel = async (level) => {
  await page.waitForFunction(
    (level) => window.__atlas?.ready && window.__atlas.state.level === level,
    level,
    { timeout: 60000 },
  );
  await page.waitForTimeout(850);
};
const shot = async (name) => page.screenshot({ path: `${output}/${name}.png` });
async function checkBlend(from, to, name) {
  await page.waitForFunction(() => window.__atlas.transition.phase === "blend");
  const t = await page.evaluate(() => window.__atlas.transition);
  assert.equal(t.from, from);
  assert.equal(t.to, to);
  assert.equal(t.retainedViews, 1);
  assert.equal(await page.evaluate(() => window.__atlas.ready), false);
  if (name) await shot(name);
  await waitLevel(to);
  assert.equal(
    await page.evaluate(() => window.__atlas.transition.retainedViews),
    0,
  );
}
try {
  await page.goto(base + "?seed=LETHRA-001", { waitUntil: "networkidle" });
  await waitLevel("universe");
  assert.equal(await page.locator("canvas").count(), 1);
  // The root catalogue has 32 identities, but merged galaxies are no longer
  // selectable at the reference date. Assert the exact dated identity set.
  const visibleGalaxies = galaxies('LETHRA-001').filter((_, galaxyOrdinal) =>
    galaxyStateAt(galaxyLifecycle('LETHRA-001', {
      clusterCell: [0n, 0n, 0n], groupCell: [0n, 0n, 0n], galaxyOrdinal,
    }), CATALOGUE_EPOCH_NS).stage === 'active').map(g => g.id);
  assert.deepEqual(await page.locator('[data-select]').evaluateAll(elements =>
    elements.map(el => el.dataset.select)), visibleGalaxies);
  await shot("01-universe");
  await page.locator('[data-select="G001"]').click();
  await page.locator("#explore").click();
  await checkBlend("universe", "galaxy", "01b-transition");
  assert.equal(await page.evaluate(() => window.__atlas.context.galaxies), 31);
  assert.equal(await page.locator(".location-map svg").count(), 1);
  await shot("02-galaxy");
  const before = await page.evaluate(() => window.__atlas.camera.position);
  await page.mouse.move(650, 340);
  await page.mouse.down();
  await page.mouse.move(840, 430, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => window.__atlas.camera.position);
  assert.notDeepEqual(before, after, "canvas rotation changes camera");
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(500);
  assert.notDeepEqual(
    after,
    await page.evaluate(() => window.__atlas.camera.position),
    "wheel changes distance",
  );
  await page.mouse.move(650, 340);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(700, 365, { steps: 6 });
  await page.mouse.up({ button: "right" });
  await page.waitForTimeout(350);
  const skyAlignment = await page.evaluate(() => ({
    sky: window.__atlas.context.skyPosition,
    camera: window.__atlas.camera.position,
  }));
  assert.deepEqual(
    skyAlignment.sky,
    skyAlignment.camera,
    "distant sky follows panning without false parallax",
  );
  const galaxyResources = await page.evaluate(
    () => window.__atlas.stats.geometries,
  );
  await page.locator("#toggle-context").click();
  assert.equal(
    await page.evaluate(() => window.__atlas.context.visible),
    false,
  );
  assert.equal(
    await page.evaluate(() => window.__atlas.stats.geometries),
    galaxyResources,
  );
  await page.locator("#toggle-context").click();
  await page.locator("#suggest-sector").click();
  await page.locator("#explore").click();
  await page.waitForFunction(
    () => window.__atlas.transition.phase === "flight",
  );
  const galaxyId = await page.evaluate(() => window.__atlas.space.id);
  await waitLevel("sector");
  assert.equal(
    await page.evaluate(() => window.__atlas.space.id),
    galaxyId,
    "galaxy geometry survives approach",
  );
  await page.waitForFunction(
    () => window.__atlas.space.residentChunks === 27,
    {},
    { timeout: 60000 },
  );
  const context = await page.evaluate(() => window.__atlas.context);
  assert.ok(context.nearbySystems > 0 && context.nearbySystems <= 13824);
  assert.ok(context.skyPoints > 8000 && context.skyPoints <= 10000);
  assert.equal(context.galaxies, 31);
  assert.equal(await page.locator(".location-map svg").count(), 1);
  await shot("03-sector");
  await page.locator("[data-select]").first().click();
  await page.locator("#explore").click();
  await checkBlend("sector", "system");
  assert.equal(await page.locator("#toggle-context").count(), 1);
  assert.equal(await page.locator(".location-map svg").count(), 2);
  assert.ok(
    (await page.evaluate(() => window.__atlas.context.skyPoints)) > 8000,
  );
  assert.equal(await page.evaluate(() => window.__atlas.context.galaxies), 31);
  assert.ok(
    (await page.evaluate(() => window.__atlas.context.sectorStars)) > 0,
  );
  await shot("04-system");
  const sys = await page.evaluate(() => window.__atlas.state.sys);
  const systemView = await page.evaluate(() => window.__atlas.systemView);
  assert.equal(systemView.mode, "overview");
  for (let i = 0; i < systemView.bodies.length; i++)
    for (let j = i + 1; j < systemView.bodies.length; j++) {
      const a = systemView.bodies[i],
        b = systemView.bodies[j];
      assert.ok(
        Math.hypot(...a.position.map((v, k) => v - b.position[k])) >
          a.extent + b.extent,
        "rendered body and ring envelopes must not overlap",
      );
    }
  await page.locator("#system-scale").click();
  await page.waitForFunction(
    () => window.__atlas.systemView?.mode === "physical",
  );
  await page.locator("#system-scale").click();
  await page.waitForFunction(
    () => window.__atlas.systemView?.mode === "overview",
  );
  assert.ok(sys.planets.length > 0);
  assert.equal(await page.locator(".count-grid > div").count(), 3);
  assert.equal(
    await page.locator(".count-grid [data-select]").count(),
    0,
    "body navigation must remain outside the count summary",
  );
  assert.equal(
    await page.locator("[data-select]").count(),
    sys.stars.length + sys.planets.length + sys.moons.length,
  );
  // Stellar visual evolution (proving test): starStateAt's radius/temperature/
  // luminosity used to be computed every frame and then discarded -- every
  // caller read only `.stage`. Seek the resident system's own primary star to
  // two real points on its own lifecycle (main sequence, then its remnant)
  // and assert the star's rendered scale, colour AND the scene light all
  // genuinely differ -- this must fail on the pre-fix app (nothing but
  // `.stage`-driven visibility/rotation would differ) and pass after it.
  // `starLifecycle` is imported directly from the app's own source (Node's
  // native TS type-stripping handles the `.ts` import exactly like every
  // `tests/*.test.mjs` file already does) so the seek targets are the EXACT
  // boundaries the app itself computes -- never re-derived or guessed at.
  {
    const originalEpoch = await page.evaluate(() => window.__atlas.date.offsetNs);
    const starSeed = await page.evaluate(() => window.__atlas.seed);
    const star = sys.stars[0];
    const starLc = starLifecycle(starSeed, undefined, star);
    const mainSequenceT = (starLc.formationNs + 1n).toString();
    const remnantT = (starLc.remnantNs + 1n).toString();
    await page.evaluate((t) => window.__atlas.seek(t), mainSequenceT);
    await page.waitForTimeout(200);
    const mainSequenceVisual = await page.evaluate(() => window.__atlas.starVisual);
    await page.evaluate((t) => window.__atlas.seek(t), remnantT);
    await page.waitForTimeout(200);
    const remnantVisual = await page.evaluate(() => window.__atlas.starVisual);
    await page.evaluate((t) => window.__atlas.seek(t), originalEpoch);
    await page.waitForTimeout(200);
    assert.ok(mainSequenceVisual, "starVisual must be available for the resident system's primary star");
    assert.ok(remnantVisual, "starVisual must be available at the remnant epoch too");
    assert.notEqual(
      mainSequenceVisual.radiusScale,
      remnantVisual.radiusScale,
      `star radius must visually change across its own lifecycle (main-sequence ${mainSequenceVisual.radiusScale} vs remnant ${remnantVisual.radiusScale})`,
    );
    assert.notEqual(
      mainSequenceVisual.colorHex,
      remnantVisual.colorHex,
      `star colour must visually change across its own lifecycle (main-sequence #${mainSequenceVisual.colorHex} vs remnant #${remnantVisual.colorHex})`,
    );
    assert.notEqual(
      mainSequenceVisual.lightIntensity,
      remnantVisual.lightIntensity,
      `system light intensity must change across the star's own lifecycle (main-sequence ${mainSequenceVisual.lightIntensity} vs remnant ${remnantVisual.lightIntensity})`,
    );
    console.log(
      JSON.stringify({ starVisualCheck: { mainSequence: mainSequenceVisual, remnant: remnantVisual } }),
    );
  }
  const body = sys.planets.find((p) => p.water) || sys.planets[0];
  await page.locator(`[data-select="${body.id}"]`).click();
  await page.locator("#explore").click();
  await waitLevel("body");
  await shot("05-planet");
  assert.equal(await page.evaluate(() => window.__atlas.terrain.width), 1024);
  await page.locator("#relief").click();
  assert.equal(
    await page.evaluate(() => window.__atlas.terrain.reliefScale),
    12,
  );
  await page.locator("#relief").click();
  const initialOrbitRadius = await page.evaluate(() =>
    Math.hypot(...window.__atlas.camera.position),
  );
  const farOrbitRadius = initialOrbitRadius * 11;
  await page.mouse.move(720, 500);
  for (let i = 0; i < 80; i++) {
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(35);
    const radius = await page.evaluate(() =>
      Math.hypot(...window.__atlas.camera.position),
    );
    if (radius > farOrbitRadius) break;
  }
  await page.waitForFunction(
    (minimumRadius) => Math.hypot(...window.__atlas.camera.position) > minimumRadius,
    farOrbitRadius,
    { timeout: 10000 },
  );
  const far = await page.evaluate(() => window.__atlas.camera.position);
  await page.locator("#approach").click();
  console.log(JSON.stringify({afterApproach:await page.evaluate(()=>({autopilot:window.__atlas.travel.autopilot,altitude:window.__atlas.travel.approachAltitude,ready:window.__atlas.ready}))}));
  await page.waitForFunction(
    () =>
      window.__atlas.state.level === "system" &&
      window.__atlas.travel.autopilot?.kind === "body" &&
      window.__atlas.travel.approachAltitude === 100000,
    undefined,
    { timeout: 30000 },
  );
  await page.waitForFunction(
    () =>
      window.__atlas.terrain?.tiles?.ready &&
      window.__atlas.terrain.tiles.maxLevel >= 3 &&
      !window.__atlas.travel.autopilot,
    undefined,
    { timeout: 60000 },
  );
  await page.waitForTimeout(900);
  assert.ok(
    Math.hypot(...(await page.evaluate(() => window.__atlas.camera.position))) <
      Math.hypot(...far),
  );
  const approachedSurface = await page.evaluate(() => window.__atlas.travel.surface);
  assert.ok(
    Math.abs(approachedSurface.altitude - 100000) < 1000,
    `low-orbit approach altitude is ${approachedSurface.altitude} m`,
  );
  await shot("05b-close-orbit");
  const saved = await page.evaluate(() => JSON.stringify(window.__atlas.state));
  const deepLink = page.url();
  await page.reload({ waitUntil: "networkidle" });
  await waitLevel("body");
  assert.equal(
    await page.evaluate(() => JSON.stringify(window.__atlas.state)),
    saved,
    "deep-link reload retains all records",
  );
  const digest = await page.evaluate(() => window.__atlas.verify());
  assert.match(digest, /^[a-f0-9]{64}$/);
  await page.locator("#back").click();
  const residentId = await page.evaluate(() => window.__atlas.travel.sceneId);
  await waitLevel("system");
  assert.equal(
    await page.evaluate(() => window.__atlas.travel.sceneId),
    residentId,
  );
  await page.locator("#play").click();
  await page.waitForTimeout(1000);
  await page.locator("#epoch").click();
  await page.locator('[data-level="universe"]').click();
  await waitLevel("universe");
  for (let i = 0; i < 3; i++) {
    await page.locator('[data-select="G001"]').click();
    await page.locator("#explore").click();
    await waitLevel("galaxy");
    await page.locator("#back").click();
    await waitLevel("universe");
  }
  // A newer request can supersede a running worker and an unfinished blend.
  await page.locator('[data-select="G001"]').click();
  await page.locator("#explore").click();
  await page.waitForFunction(() => window.__atlas.transition.phase === "blend");
  await page.locator("#back").click();
  await waitLevel("universe");
  assert.equal(
    await page.evaluate(() => window.__atlas.transition.retainedViews),
    0,
  );
  assert.ok((await page.evaluate(() => window.__atlas.stats.geometries)) < 120);
  await page.locator("#seed").fill("OTHER-SEED");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const completed = await page.evaluate(
    () => window.__atlas.transition.completed,
  );
  await page.locator("#generate").click();
  await page.waitForFunction(() => window.__atlas.seed === "OTHER-SEED");
  await waitLevel("universe");
  assert.equal(
    await page.evaluate(() => window.__atlas.transition.completed),
    completed,
    "reduced motion skips animated blending",
  );
  assert.notEqual(
    await page.locator('[data-select="G001"] strong').textContent(),
    "Esensara",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await shot("06-mobile");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  const report = await page.evaluate(() => ({
    stats: window.__atlas.stats,
    frames: window.__atlas.frameCount,
    renderer: (() => {
      const gl = document.querySelector("canvas").getContext("webgl2");
      const ext = gl?.getExtension("WEBGL_debug_renderer_info");
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unavailable";
    })(),
  }));
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
  assert.ok(report.frames > 60);
  assert.ok(report.stats.geometries < 120);
  assert.ok(report.stats.textures < 10);
  assert.equal(report.stats.pending, 0);
  await writeFile(
    `${output}/browser-report.json`,
    JSON.stringify(
      {
        base,
        engine: engine.name(),
        digest,
        deepLink,
        errors,
        requests,
        ...report,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      {
        ok: true,
        base,
        engine: engine.name(),
        digest,
        frames: report.frames,
        geometries: report.stats.geometries,
        textures: report.stats.textures,
        renderer: report.renderer,
      },
      null,
      2,
    ),
  );
} catch (e) {
  console.log(await page.evaluate(()=>({travel:window.__atlas.travel,terrain:window.__atlas.terrain,errors:document.querySelector('#status')?.textContent})));
  await shot("failure");
  throw e;
} finally {
  await browser.close();
}
