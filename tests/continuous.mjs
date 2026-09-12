import { chromium } from "playwright";
import {browserArgs} from './browser-options.mjs';
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.ATLAS_URL || "http://127.0.0.1:5186/";
const out = process.env.ATLAS_RESULTS || "test-results/continuous";
await mkdir(out, { recursive: true });
const b = await chromium.launch({
  headless: true,
  args: browserArgs,
});
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const ready = () =>
  p.waitForFunction(() => window.__atlas?.ready, undefined, { timeout: 60000 });
try {
  await p.goto(base + "?seed=LETHRA-001&g=G001");
  await p.waitForFunction(
    () => window.__atlas?.ready && window.__atlas.state.level === "galaxy",
  );
  await p.waitForTimeout(900);
  const initial = await p.evaluate(() => window.__atlas.space);
  let target;
  for (const t of await p.evaluate(() => window.__atlas.mapTargets)) {
    await p.mouse.click(t.x, t.y);
    if ((await p.evaluate(() => window.__atlas.selected)) === t.id) {
      target = t;
      break;
    }
  }
  assert.ok(
    target,
    "a rendered star can be selected by its exact screen position",
  );
  const beforeZoom = await p.evaluate(() => window.__atlas.space.positionLy);
  await p.mouse.move(target.x, target.y);
  await p.mouse.wheel(0, -300);
  await p.waitForTimeout(700);
  const afterZoom = await p.evaluate(() => window.__atlas.space.positionLy);
  assert.ok(
    Math.hypot(...afterZoom.map((v, i) => v - target.position[i])) <
      Math.hypot(...beforeZoom.map((v, i) => v - target.position[i])),
    "wheel zoom approaches the visible star in physical space",
  );
  assert.equal(await p.evaluate(() => window.__atlas.selected), target.id);
  await p.screenshot({ path: out + "/01-selected-map-star.png" });
  await p.locator("#approach-star").click();
  await p.waitForFunction(() => window.__atlas.transition.phase === "flight");
  assert.equal(
    await p.evaluate(() => window.__atlas.transition.retainedViews),
    0,
    "zoom uses one scene",
  );
  assert.equal(await p.evaluate(() => window.__atlas.space.id), initial.id);
  await ready();
  await p.waitForFunction(
    () => window.__atlas.space.residentChunks === 27,
    undefined,
    { timeout: 60000 },
  );
  assert.equal(await p.evaluate(() => window.__atlas.selected), target.id);
  assert.equal(
    await p.evaluate(() => window.__atlas.space.anchorId),
    initial.anchorId,
  );
  assert.ok(
    Math.hypot(
      ...(await p.evaluate(() => window.__atlas.space.positionLy)).map(
        (v, i) => v - target.position[i],
      ),
    ) < 30,
  );
  await p.screenshot({ path: out + "/02-same-star-up-close.png" });
  await p.locator("#explore").click();
  await ready();
  assert.equal(
    await p.evaluate(() => window.__atlas.state.sys.id),
    target.id,
    "the selected galaxy point opens the same physical system",
  );
  assert.deepEqual(
    await p.evaluate(() => window.__atlas.state.ref.position),
    target.position,
  );
  await p.locator("#back").click();
  await ready();
  const flightStart = await p.evaluate(() => window.__atlas.space);
  await p.locator("#toggle-flight").click();
  await p.mouse.move(700, 400);
  await p.mouse.wheel(0, 2000);
  // Measure travel, not a fixed wall-time assumption. Move laterally so the
  // route exercises galaxy chunks without aiming into the selected system.
  await p.keyboard.down("d");
  await p.waitForFunction(start=>{
    const s=window.__atlas.space;
    return s&&Math.hypot(...s.positionLy.map((v,i)=>v-start[i]))>300;
  },flightStart.positionLy,{timeout:30000});
  await p.keyboard.up("d");
  await p.keyboard.press("Escape");
  await p.waitForFunction(
    () =>
      window.__atlas.space.residentChunks === 27 &&
      !window.__atlas.space.pending,
    undefined,
    { timeout: 60000 },
  );
  const finish = await p.evaluate(() => window.__atlas.space);
  assert.ok(
    Math.hypot(
      ...finish.positionLy.map((v, i) => v - flightStart.positionLy[i]),
    ) > 260,
    "flight crosses multiple physical streaming regions",
  );
  assert.equal(
    finish.id,
    flightStart.id,
    "crossing boundaries retains the galaxy",
  );
  assert.equal(finish.anchorId, flightStart.anchorId);
  assert.ok(finish.cachedChunks <= 64 && finish.nearbyStars <= 13824);
  assert.notDeepEqual(
    finish.originLy,
    flightStart.originLy,
    "floating origin follows long travel",
  );
  await p.screenshot({ path: out + "/03-after-flight.png" });
  await p.locator('[data-level="galaxy"]').click();
  await ready();
  assert.equal(
    await p.evaluate(() => window.__atlas.space.id),
    finish.id,
    "zooming back out retains the same geometry",
  );
  assert.equal(
    await p.evaluate(() => window.__atlas.space.anchorId),
    finish.anchorId,
  );
  const stats = await p.evaluate(() => window.__atlas.stats);
  assert.ok(stats.geometries < 120);
  assert.deepEqual(errors, []);
  const report = {
    ok: true,
    base,
    target,
    travelLy: Math.hypot(
      ...finish.positionLy.map((v, i) => v - flightStart.positionLy[i]),
    ),
    cachedChunks: finish.cachedChunks,
    nearbyStars: finish.nearbyStars,
    geometries: stats.geometries,
    errors,
  };
  await writeFile(out + "/report.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} catch (e) {
  await p.screenshot({ path: out + "/failure.png" });
  throw e;
} finally {
  await b.close();
}
