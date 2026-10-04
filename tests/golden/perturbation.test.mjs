// Proves the discrete catalog/terrain/world-history decisions in the modules
// this agent owns (src/catalog.ts, the src/terrain.ts ridge/hill fields,
// src/world-history.ts) no longer depend on platform transcendental
// precision. Monkey-patches Math.sin/cos/atan2/atan/tan/pow/exp/log/cbrt/acos
// so every call returns a value nudged by roughly one ULP, then asserts a
// canonical snapshot of sector counts, system/body structure, terrain
// elevation/ocean classification and stellar-history outcomes is byte-for-
// byte identical with and without the perturbation.
//
// Scope note: galaxy `position`/`rotation` (src/catalog.ts galaxies()) still
// use plain Math.cos/Math.sin. That is deliberate: per the determinism
// contract (docs/universe-atlas-v1-spec.md §3), continuous stored positions
// fall in the same "ordinary double-precision, tolerant comparison" bucket
// as animated orbital positions, not the "counts/thresholds/sort
// keys/hashing" bucket this hardening pass targets. This test's snapshot
// deliberately excludes them so it measures exactly the decisions det-math.ts
// was built to protect.
import { test } from "node:test";
import assert from "node:assert/strict";
import { galaxies, sector, system, galaxiesInGroup, groupsInCluster } from "../../src/catalog.ts";
import { terrainSampler } from "../../src/terrain.ts";
import { stellarHistory } from "../../src/world-history.ts";

const SEED = "LETHRA-GOLDEN-001";
const SECTOR_COORDS = [
  [266, 0, 0],
  [0, 0, 0],
  [-2, -1, -2],
];
const DIRECTIONS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
  [0.57735, 0.57735, 0.57735],
];

/** A roughly-1-ULP nudge: x*(1 +- Number.EPSILON), Number.EPSILON = 2^-52 is
 * exactly 1 ULP for x in [1,2) and proportionally correct at other scales
 * because IEEE-754 doubles are binary floating point. Good enough to prove
 * insensitivity without needing exact bit-pattern nextafter arithmetic. */
function nudge(x, sign) {
  if (!Number.isFinite(x)) return x;
  if (x === 0) return sign * Number.MIN_VALUE;
  return x + sign * Math.abs(x) * Number.EPSILON;
}

const PERTURBED_NAMES = ["sin", "cos", "atan2", "atan", "tan", "pow", "exp", "log", "cbrt", "acos"];

function withPerturbedMath(fn) {
  const originals = {};
  let callParity = 0;
  for (const name of PERTURBED_NAMES) {
    originals[name] = Math[name];
    const original = originals[name];
    Math[name] = (...args) => {
      callParity++;
      return nudge(original(...args), callParity % 2 === 0 ? 1 : -1);
    };
  }
  try {
    return fn();
  } finally {
    for (const name of PERTURBED_NAMES) Math[name] = originals[name];
  }
}

/** Canonical snapshot of every discrete decision this agent hardened:
 * sector star counts, system/body structure and physical fields, terrain
 * elevation/ocean classification (non-gas-giant bodies only - the gas-giant
 * band colour is the one remaining Math.sin use in terrain.ts, outside this
 * agent's owned lines 66/78), and stellar-history lifecycle outcomes. */
function hardenedSnapshot(seed) {
  const lines = [];
  const gs = galaxies(seed);
  for (const g of gs.slice(0, 4)) {
    lines.push([g.id, g.type, g.arms, g.pitch, g.phase, g.tint, g.radiusLy].join("|"));
    for (const coords of SECTOR_COORDS) {
      const s = sector(g, coords);
      lines.push([g.id, coords.join(","), s.total, s.refs.length, s.aggregated ? 1 : 0].join("|"));
    }
  }
  const bodies = [];
  const refs = sector(gs[0], SECTOR_COORDS[0]).refs.slice(0, 150);
  for (const ref of refs) {
    const sys = system(ref);
    lines.push([sys.id, sys.stars.length, sys.planets.length, sys.moons.length, sys.belts.length].join("|"));
    for (const b of [...sys.stars, ...sys.planets, ...sys.moons]) {
      lines.push([b.id, b.type, b.massKg, b.radiusM, b.temperatureK, b.water, b.rings ? 1 : 0].join("|"));
      bodies.push(b);
    }
  }
  for (const p of bodies.filter((b) => b.kind === "planet" && b.type !== "Gas giant").slice(0, 6)) {
    const sample = terrainSampler(p);
    for (const d of DIRECTIONS) {
      const s = sample(d);
      lines.push([p.id, d.join(","), s.elevationM, s.ocean ? 1 : 0].join("|"));
    }
  }
  for (const star of bodies.filter((b) => b.kind === "star").slice(0, 20)) {
    const h = stellarHistory(star);
    lines.push([h.id, h.outcome, h.formationNs, h.giantNs, h.remnantNs].join("|"));
  }
  // Cluster/group hierarchy (Package B, src/catalog.ts's galaxiesInGroup /
  // groupsInCluster): the discrete decision here is "how many galaxies does
  // this group hold" (groupGalaxyCount's poisson(detPow(...)) draw, already
  // routed through det-math) and each generated galaxy's field values (built
  // from plain +,-,*,/ on rng() output only, no Math.* transcendental calls
  // at all) - both must stay invariant to the perturbation below.
  // groupCell is a LOCAL offset in [0, CELLS_PER_GROUP_AXIS)^3 within
  // clusterCell (address scheme a) - only clusterCell carries "far
  // coordinates" magnitude.
  for (const [clusterCell, groupCell] of [
    [[0n, 0n, 0n], [1n, 0n, 0n]],
    [[3n, -1n, 2n], [7n, 0n, 16n]],
    [[10n ** 9n, -(10n ** 9n), 3n], [7n, 18n, 0n]],
  ]) {
    const gs2 = galaxiesInGroup(seed, clusterCell, groupCell);
    lines.push([clusterCell.join(","), groupCell.join(","), gs2.length].join("|"));
    for (const g of gs2) {
      lines.push([g.id, g.type, g.arms, g.pitch, g.phase, g.tint, g.radiusLy, g.position.join(","), g.rotation.join(",")].join("|"));
    }
  }
  const anchors = groupsInCluster(seed, [2n, -5n, 9n]).slice(0, 40);
  for (const a of anchors) lines.push([a.groupCell.join(","), a.galaxyCount, a.centerMpc.join(",")].join("|"));
  return lines.join("\n");
}

test("discrete catalog/terrain/history decisions are invariant to +-1ulp perturbation of platform transcendentals", () => {
  const baseline = hardenedSnapshot(SEED);
  assert.ok(baseline.length > 1000, "sanity: snapshot is non-trivial");
  const perturbed = withPerturbedMath(() => hardenedSnapshot(SEED));
  assert.equal(
    perturbed,
    baseline,
    "a hardened decision changed when Math.sin/cos/atan2/atan/tan/pow/exp/log/cbrt/acos were nudged by ~1 ulp - it is still reading a platform transcendental instead of det-math.ts",
  );
});

test("the perturbation harness itself actually changes platform transcendental output (negative control)", () => {
  const before = Math.pow(1.2345, 6) + Math.atan2(3, 4) + Math.cbrt(28) + Math.sin(1.7);
  const after = withPerturbedMath(
    () => Math.pow(1.2345, 6) + Math.atan2(3, 4) + Math.cbrt(28) + Math.sin(1.7),
  );
  assert.notEqual(after, before, "sanity: the monkey-patch must actually perturb Math.* output");
});

// ---------------------------------------------------------------------------
// Platform sections (GOLDEN-EXT, 2026-10-04): the same 1-ULP nudge over the
// golden generator's platform sections (geophysics, climate, biomes, ocean
// volume, place-query, forest census, rocks, fauna composer).
//
// Each run happens in a FRESH worker thread, so module-level constants and the
// module caches (ocean hypsometry, climate forcing, dated place) are rebuilt
// under the perturbation instead of being reused from an unperturbed run. The
// perturbation is installed before generator.ts (and so every src module) is
// imported.
//
// Two flip counts per section, both reported:
//  - golden: records whose PINNED form (tests/golden/generator.ts "golden"
//    serialisation, 12 significant digits / float32 bits) changed. A flip here
//    means the cross-engine digest itself depends on platform libm bits.
//  - exact: records whose shortest round-trip form changed: a raw platform
//    transcendental reaches the output, even if the pinned form absorbs it.
// Sections listed in the findings tables below are recorded determinism
// findings (reported, not hidden); any OTHER section that flips fails.
//
// Differences from the catalogue test above, all deliberate:
//  - More functions are nudged (PLATFORM_PERTURBED_NAMES adds hypot, asin, the
//    log/exp variants and the hyperbolics), since platform code uses them.
//  - Results ECMA-262 fixes exactly (acos(1) = +0, cos(0) = exp(0) = 1,
//    pow(x, 0) = 1, sin/tan/atan/asin/cbrt(+-0) = +-0, ...) are not nudged:
//    every engine must return them bit-exactly, so nudging them would report
//    false findings (placeAt's default upDot = 1 gives slope acos(1) = 0).
//  - The `**` operator cannot be monkey-patched; it is not covered.
// ---------------------------------------------------------------------------
import { Worker } from "node:worker_threads";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import path from "node:path";

const GENERATOR_URL = pathToFileURL(path.join(path.dirname(fileURLToPath(import.meta.url)), "generator.ts")).href;
const PLATFORM_SECTIONS = ["geophysics", "climate", "biomes", "oceanVolume", "placeQuery", "census", "rocks", "fauna"];
const PLATFORM_PERTURBED_NAMES = [...PERTURBED_NAMES, "asin", "hypot", "log2", "log10", "log1p", "expm1", "sinh", "cosh", "tanh", "asinh", "acosh", "atanh"];

/** Recorded determinism findings: section -> why a raw platform transcendental
 * reaches it. GOLDEN: the pinned digest itself moved under a 1-ULP nudge.
 * EXACT: only the full-precision form moved (the pinned form absorbed it). */
const GOLDEN_FLIP_FINDINGS = {};
// Measured 2026-10-04 (GOLDEN-EXT) on main b7d1df3. None of these moves a
// pinned record (golden flips 0), but each is a raw libm path into platform
// output, so a different engine may disagree in the last bits:
const EXACT_FLIP_FINDINGS = {
  biomes: "surface-biomes.ts:106 slope = Math.acos(upDot) (backlog task 24 DET-TRANSCENDENTAL); every record carries slopeDeg",
  placeQuery: "the measureSlope records only: the measured upDot reaches the same surface-biomes.ts:106 Math.acos slope",
  census: "planet-tiles.ts cubeDirection normalises with Math.hypot: population-cell directions move by 1 ULP, ground heights by ~1e-10 m",
  rocks: "rock-field.ts Math.hypot normalisations (faceDirection, tangentBasis, up) and slopeGap Math.tan(Math.acos(upDot))",
  fauna: "fauna-composer-rig.ts / fauna-composer-mesh.ts build poses and rings with three.js and raw Math trig",
};

/** Runs inside the worker (serialised with Function.prototype.toString). */
function installPerturbation(names, relative) {
  const exactCase = (name, a) => {
    const [x, y] = a;
    switch (name) {
      case "acos": case "acosh": case "log": return x === 1;
      case "asin": case "atan": case "sin": case "tan": case "cbrt": case "sinh": case "tanh": case "asinh": case "atanh": case "expm1": case "log1p":
      case "cos": case "cosh": case "exp": return x === 0;
      case "atan2": return x === 0 ? false : y === 0 && x > 0;
      case "pow": return y === 0;
      case "hypot": return a.every((v) => v === 0);
      default: return false;
    }
  };
  let parity = 0, nudged = 0;
  for (const name of names) {
    const original = Math[name];
    Math[name] = (...a) => {
      const r = original(...a);
      if (!Number.isFinite(r) || exactCase(name, a)) return r;
      parity++; nudged++;
      const sign = parity % 2 === 0 ? 1 : -1;
      return r === 0 ? sign * Number.MIN_VALUE : r + sign * Math.abs(r) * relative;
    };
  }
  return () => nudged;
}

const WORKER_SOURCE = `
const { parentPort, workerData } = require("node:worker_threads");
${installPerturbation.toString()}
(async () => {
  try {
    const nudged = workerData.relative ? installPerturbation(workerData.names, workerData.relative) : () => 0;
    const { platformSectionLines } = await import(workerData.generator);
    const golden = await platformSectionLines("golden");
    const exact = workerData.exact ? await platformSectionLines("exact") : null;
    parentPort.postMessage({ golden, exact, nudged: nudged() });
  } catch (error) {
    parentPort.postMessage({ error: String((error && error.stack) || error) });
  }
})();
`;

function platformRun({ relative = 0, exact = true } = {}) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_SOURCE, {
      eval: true,
      workerData: { generator: GENERATOR_URL, names: PLATFORM_PERTURBED_NAMES, relative, exact },
    });
    worker.once("message", (m) => (m.error ? reject(new Error(m.error)) : resolve(m)));
    worker.once("error", reject);
    worker.once("exit", (code) => code !== 0 && reject(new Error(`perturbation worker exited ${code}`)));
  });
}

function flips(a, b) {
  let n = Math.abs(a.length - b.length);
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) n++;
  return n;
}

test("platform sections: 1-ULP perturbation flip counts (fresh worker per run; findings reported, unlisted flips fail)", async (t) => {
  const [base, perturbed] = await Promise.all([platformRun(), platformRun({ relative: Number.EPSILON })]);
  assert.ok(perturbed.nudged > 1000, `sanity: the perturbation reached platform code (${perturbed.nudged} nudged calls)`);
  const report = PLATFORM_SECTIONS.map((name) => ({
    section: name,
    records: base.golden[name].length,
    goldenFlips: flips(base.golden[name], perturbed.golden[name]),
    exactFlips: flips(base.exact[name], perturbed.exact[name]),
  }));
  t.diagnostic(`nudged platform transcendental calls: ${perturbed.nudged}`);
  for (const r of report) t.diagnostic(`${r.section}: ${r.records} records, golden flips ${r.goldenFlips}, exact flips ${r.exactFlips}`);
  console.log(JSON.stringify({ perturbationReport: report, nudged: perturbed.nudged, names: PLATFORM_PERTURBED_NAMES }));
  for (const r of report) {
    assert.ok(r.records > 1, `${r.section}: section is non-trivial`);
    if (r.goldenFlips && !(r.section in GOLDEN_FLIP_FINDINGS))
      assert.fail(`${r.section}: ${r.goldenFlips} PINNED records changed under a 1-ULP Math.* nudge - the cross-engine digest depends on platform libm bits (record it in GOLDEN_FLIP_FINDINGS with the cause, or route the decision through det-math.ts)`);
    if (r.exactFlips && !(r.section in EXACT_FLIP_FINDINGS))
      assert.fail(`${r.section}: ${r.exactFlips} records changed at full precision under a 1-ULP Math.* nudge - a raw platform transcendental now reaches this section (record it in EXACT_FLIP_FINDINGS with the cause)`);
    if (!r.goldenFlips && r.section in GOLDEN_FLIP_FINDINGS) t.diagnostic(`${r.section}: GOLDEN finding no longer reproduces - remove it from GOLDEN_FLIP_FINDINGS`);
    if (!r.exactFlips && r.section in EXACT_FLIP_FINDINGS) t.diagnostic(`${r.section}: EXACT finding no longer reproduces - remove it from EXACT_FLIP_FINDINGS`);
  }
});

test("platform sections: a coarse nudge flips the raw-Math sections (negative control for the worker harness)", async () => {
  // 2^-20 relative: far above 1 ULP. Biome slope (Math.acos) and the composer
  // rig (THREE trig) read raw Math, so their PINNED records must move; if they
  // do not, the worker installation is not reaching module code.
  const [base, coarse] = await Promise.all([platformRun({ exact: false }), platformRun({ relative: 2 ** -20, exact: false })]);
  for (const name of ["biomes", "fauna"]) {
    assert.ok(flips(base.golden[name], coarse.golden[name]) > 0, `${name}: a 2^-20 nudge must change pinned records`);
  }
});
