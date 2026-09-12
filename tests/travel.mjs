import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.ATLAS_URL || "http://127.0.0.1:5186/";
const out = process.env.ATLAS_RESULTS || "test-results/travel";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const p = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const wait = async (fn) => p.waitForFunction(fn, undefined, { timeout: 90000 });
try {
  await p.goto(base + "?seed=LETHRA-001");
  await wait(() => window.__atlas?.ready);
  await p.locator('[data-select="G001"]').click();
  await p.locator("#fly-target").click();
  await wait(
    () =>
      window.__atlas.travel.crossings === 1 &&
      !window.__atlas.travel.crossing &&
      !window.__atlas.travel.autopilot,
  );
  assert.equal(await p.evaluate(() => window.__atlas.state.galaxy.id), "G001");
  assert.equal(await p.evaluate(() => window.__atlas.travel.active), true);
  await p.screenshot({ path: out + "/01-galaxy-arrival.png" });
  const targets = await p.evaluate(() => window.__atlas.mapTargets);
  let star;
  for (const t of targets) {
    await p.mouse.click(t.x, t.y);
    if ((await p.evaluate(() => window.__atlas.selected)) === t.id) {
      star = t;
      break;
    }
  }
  assert.ok(star);
  await p.locator("#fly-target").click();
  await wait(
    () =>
      window.__atlas.travel.crossings === 2 &&
      !window.__atlas.travel.crossing &&
      !window.__atlas.travel.autopilot,
  );
  const arrival = await p.evaluate(() => ({
    travel: window.__atlas.travel,
    sys: window.__atlas.state.sys,
  }));
  assert.equal(
    arrival.sys.id,
    star.id,
    "flight enters the aimed-at catalogue system",
  );
  assert.ok(
    Math.hypot(...arrival.travel.position) > 1e10,
    "arrival retains an approach position, not a reset at the barycentre",
  );
  assert.equal(await p.locator("#toggle-flight").count(), 1);
  const planet = arrival.sys.planets[0];
  assert.ok(planet);
  await p.keyboard.press("Escape");
  const resident = await p.evaluate(() => window.__atlas.travel);
  await p.locator(`[data-select="${planet.id}"]`).click();
  await p.locator("#explore").click();
  await wait(
    () =>
      window.__atlas.ready &&
      window.__atlas.state.level === "body" &&
      window.__atlas.terrain?.width === 1024,
  );
  const focused = await p.evaluate(() => window.__atlas.travel);
  assert.equal(
    focused.sceneId,
    resident.sceneId,
    "planet orbit focus keeps the system scene",
  );
  for (const body of resident.bodies)
    assert.equal(
      focused.bodies.find((b) => b.id === body.id)?.objectId,
      body.objectId,
      "every existing system body remains resident",
    );
  assert.equal(
    focused.bodies.length,
    arrival.sys.stars.length +
      arrival.sys.planets.length +
      arrival.sys.moons.length,
  );
  await p.screenshot({ path: out + "/02-connected-planet-orbit.png" });
  await p.locator("#toggle-flight").click();
  await p.waitForTimeout(150);
  const slow = await p.evaluate(() => window.__atlas.travel.speed);
  assert.equal(await p.evaluate(() => window.__atlas.travel.domain), "system");
  assert.ok(
    slow < arrival.travel.speed * 0.001,
    "automatic speed slows by orders of magnitude for planetary approach",
  );
  const beforeStop = await p.evaluate(() => window.__atlas.travel.position);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(250);
  const afterStop = await p.evaluate(() => window.__atlas.travel.position);
  assert.ok(
    Math.hypot(...afterStop.map((v, i) => v - beforeStop[i])) < 10,
    "stopping flight retains camera position",
  );
  await p.locator("#fly-outward").click();
  await wait(
    () =>
      window.__atlas.travel.crossings === 3 &&
      !window.__atlas.travel.crossing &&
      !window.__atlas.travel.autopilot,
  );
  assert.ok(await p.evaluate(() => window.__atlas.space));
  await p.locator("#fly-outward").click();
  await wait(
    () =>
      window.__atlas.travel.crossings === 4 &&
      !window.__atlas.travel.crossing &&
      !window.__atlas.travel.autopilot,
  );
  assert.equal(await p.evaluate(() => window.__atlas.state.level), "universe");
  // Cross to another galaxy through intergalactic space, using the same controls.
  await p.locator('[data-select="G002"]').click();
  await p.locator("#fly-target").click();
  await wait(
    () =>
      window.__atlas.travel.crossings === 5 &&
      !window.__atlas.travel.crossing &&
      !window.__atlas.travel.autopilot,
  );
  assert.equal(await p.evaluate(() => window.__atlas.state.galaxy.id), "G002");
  await p.screenshot({ path: out + "/03-another-galaxy.png" });
  assert.deepEqual(errors, []);
  const report = {
    ok: true,
    base,
    star: star.id,
    planet: planet.id,
    crossings: 5,
    planetSpeedMetersPerSecond: slow,
    residentBodies: focused.bodies.length,
    errors,
  };
  await writeFile(out + "/report.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} catch (e) {
  await p.screenshot({ path: out + "/failure.png" });
  console.log(
    await p.evaluate(() => ({
      state: window.__atlas.state,
      travel: window.__atlas.travel,
      status: document.querySelector("#status")?.textContent,
    })),
  );
  throw e;
} finally {
  await browser.close();
}
