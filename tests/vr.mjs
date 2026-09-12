import { chromium } from "playwright";
import {browserArgs} from './browser-options.mjs';
import { readFile, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.ATLAS_URL || "http://127.0.0.1:5186/";
const output = process.env.ATLAS_RESULTS || "test-results/vr";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: browserArgs,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const iwer = await readFile("node_modules/iwer/build/iwer.min.js", "utf8");
await page.addInitScript({
  content:
    iwer +
    ";window.xrDevice=new IWER.XRDevice(IWER.metaQuest3);window.xrDevice.installRuntime({forceInstall:true});window.xrDevice.stereoEnabled=true;",
});
// Aim an actual emulated controller ray at a panel button, then pull its trigger.
async function press(x, y) {
  await page.evaluate(
    ({ x, y }) => {
      const m = window.__atlas.vr.panelMatrix;
      const px = (x / 768 - 0.5) * 1.05,
        py = (0.5 - y / 1024) * 1.4;
      const target = [
        m[0] * px + m[4] * py + m[12],
        m[1] * px + m[5] * py + m[13],
        m[2] * px + m[6] * py + m[14],
      ];
      const controller = window.xrDevice.controllers.right;
      // A -Z ray is guaranteed to meet this world point.
      controller.position.set(target[0], target[1], target[2] + 0.6);
      controller.quaternion.set(0, 0, 0, 1);
    },
    { x, y },
  );
  await page.waitForTimeout(180);
  await page.evaluate(() =>
    window.xrDevice.controllers.right.updateButtonValue("trigger", 1),
  );
  await page.waitForTimeout(180);
  await page.evaluate(() =>
    window.xrDevice.controllers.right.updateButtonValue("trigger", 0),
  );
  await page.waitForTimeout(250);
}
const level = async (l) => {
  await page.waitForFunction(
    (l) =>
      window.__atlas?.state.level === l &&
      window.__atlas.ready &&
      window.__atlas.vr.menuKey.startsWith(l + ":"),
    l,
    { timeout: 60000 },
  );
  await page.waitForTimeout(350);
};
try {
  await page.goto(base + "?seed=LETHRA-001");
  await page.waitForFunction(() => window.__atlas?.ready);
  await page.locator("#enter-vr").click();
  await page.waitForFunction(
    () => window.__atlas.vr.active && window.__atlas.vr.frames > 8,
  );
  await level("universe");
  const headsetPosition = await page.evaluate(
    () => window.__atlas.camera.position,
  );
  assert.equal(await page.evaluate(() => window.__atlas.vr.controllers), 2);
  const beforeScale = await page.evaluate(() => window.__atlas.vr.modelScale);
  await page.evaluate(() =>
    window.xrDevice.controllers.left.updateAxis("thumbstick", "y-axis", -0.8),
  );
  await page.waitForTimeout(600);
  await page.evaluate(() =>
    window.xrDevice.controllers.left.updateAxis("thumbstick", "y-axis", 0),
  );
  assert.ok(
    (await page.evaluate(() => window.__atlas.vr.modelScale)) > beforeScale,
  );
  const beforeRotation = await page.evaluate(
    () => window.__atlas.vr.modelRotation,
  );
  await page.evaluate(() =>
    window.xrDevice.controllers.right.updateAxis("thumbstick", "x-axis", 0.8),
  );
  await page.waitForTimeout(600);
  await page.evaluate(() =>
    window.xrDevice.controllers.right.updateAxis("thumbstick", "x-axis", 0),
  );
  assert.notDeepEqual(
    await page.evaluate(() => window.__atlas.vr.modelRotation),
    beforeRotation,
  );
  const stereoImage = await page.screenshot({
    path: output + "/01-vr-universe.png",
  });
  assert.ok(
    stereoImage.byteLength > 30000,
    "stereo screenshot must contain rendered content, not a hidden emulator surface",
  );
  await press(300, 230); // first galaxy
  await press(160, 880); // Explore
  await level("galaxy");
  const galaxySpace = await page.evaluate(() => window.__atlas.space.id);
  await press(300, 230); // populated sector
  await level("sector");
  assert.equal(await page.evaluate(() => window.__atlas.space.id), galaxySpace);
  await press(300, 230); // first system
  await press(160, 880);
  await level("system");
  assert.deepEqual(
    await page.evaluate(() => window.__atlas.camera.position),
    headsetPosition,
    "level transitions preserve headset position",
  );
  assert.ok(
    (await page.evaluate(() => window.__atlas.transition.completed)) >= 2,
  );
  assert.equal(
    await page.evaluate(() => window.__atlas.transition.retainedViews),
    0,
  );
  assert.equal(await page.evaluate(() => window.__atlas.context.galaxies), 31);
  assert.ok(
    (await page.evaluate(() => window.__atlas.context.sectorStars)) > 0,
  );
  await page.screenshot({ path: output + "/02-vr-system.png" });
  await press(300, 410); // oceanic second planet after single star
  await press(160, 880);
  await level("body");
  assert.equal(await page.evaluate(() => window.__atlas.terrain.width), 1024);
  await press(300, 320); // relief toggle
  assert.equal(
    await page.evaluate(() => window.__atlas.terrain.reliefScale),
    12,
  );
  await press(300, 320);
  const farScale = await page.evaluate(() => window.__atlas.vr.modelScale);
  await press(300, 230); // approach
  assert.ok(
    (await page.evaluate(() => window.__atlas.vr.modelScale)) > farScale,
  );
  await page.screenshot({ path: output + "/03-vr-planet.png" });
  await press(560, 880); // Exit
  await page.waitForFunction(() => !window.__atlas.vr.active);
  assert.equal(await page.evaluate(() => window.__atlas.vr.modelScale), 1);
  assert.equal(await page.evaluate(() => window.__atlas.camera.fov), 48);
  assert.ok(await page.evaluate(() => {
    const a = window.__atlas;
    return a.systemView.bodies.every(b => Math.hypot(...b.position.map((v,i) => v - a.camera.position[i])) < a.camera.far);
  }), 'exiting VR retains a far plane covering the surrounding physical system');
  assert.equal(
    await page.locator("body").evaluate((el) => el.classList.contains("in-vr")),
    false,
  );
  await page.locator("#back").click();
  await page.waitForFunction(() => window.__atlas.state.level === "system");
  await page.locator("#enter-vr").click();
  await page.waitForFunction(() => window.__atlas.vr.active);
  await page.waitForTimeout(500);
  await press(560, 880);
  await page.waitForFunction(() => !window.__atlas.vr.active);
  assert.deepEqual(errors, []);
  const report = {
    base,
    ok: true,
    emulator: "IWER 2.4.0 / Meta Quest 3 stereo",
    errors,
    diagnostics: await page.evaluate(() => window.__atlas.vr),
  };
  await writeFile(output + "/report.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} catch (e) {
  await page.screenshot({ path: output + "/failure.png" });
  console.log(
    await page.evaluate(() => ({
      vr: window.__atlas?.vr,
      state: window.__atlas?.state,
      status: document.querySelector("#status")?.textContent,
    })),
  );
  throw e;
} finally {
  await browser.close();
}
