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
