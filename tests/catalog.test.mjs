import { starMap, neighbourhood } from "../src/star-map.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { sectorSurroundings, systemContext } from "../src/context.ts";
import { systemLayout, layoutPosition } from "../src/system-layout.ts";
import { terrainSampler, planetSurface } from "../src/terrain.ts";
import {
  galaxies,
  sector,
  system,
  refByAddress,
  pcg,
  orbitPosition,
  bodyPosition,
  macroHeight,
  surfaceSample,
  G,
  AU,
  overview,
  density,
} from "../src/catalog.ts";

test("galaxy previews sample sector density by volume and preserve detail prefixes", () => {
  const galaxiesBySeed = galaxies("LETHRA-001");
  for (const g of galaxiesBySeed.slice(0, 4)) {
    const coarse = overview(g, 650),
      fine = overview(g, 18000);
    assert.deepEqual(coarse.positions, fine.positions.slice(0, 650 * 3));
    assert.deepEqual(coarse.colors, fine.colors.slice(0, 650 * 3));
    for (let i = 0; i < fine.sizes.length; i += 31)
      assert.ok(
        density(g, Array.from(fine.positions.slice(i * 3, i * 3 + 3))) > 0,
      );
    if (g.type === "Elliptical") {
      let actual = 0;
      for (let i = 0; i < fine.sizes.length; i++)
        actual += Math.hypot(
          fine.positions[i * 3] / g.radiusLy,
          fine.positions[i * 3 + 1] / (g.radiusLy * 0.58),
          fine.positions[i * 3 + 2] / (g.radiusLy * 0.78),
        );
      actual /= fine.sizes.length;
      let total = 0,
        weighted = 0;
      for (let q = 0.001; q < 1.3; q += 0.002) {
        const mass = density(g, [q * g.radiusLy, 0, 0]) * q * q;
        total += mass;
        weighted += mass * q;
      }
      assert.ok(
        Math.abs(actual - weighted / total) < 0.018,
        `preview radius ${actual} must match the sector density integral ${weighted / total}`,
      );
    }
  }
});
test("system sky uses catalogue neighbours and the same parent galaxy points", () => {
  const all = galaxies("LETHRA-001"),
    g = all[0],
    coords = [266, 0, 0],
    ref = sector(g, coords).refs[0];
  const sky = systemContext(g, coords, ref, all);
  assert.equal(sky.galaxyClouds.length, 31);
  assert.equal(sky.localSky.localCount, sector(g, coords).refs.length - 1);
  assert.ok(!sky.localSky.addresses.includes(ref.id));
  assert.equal(
    new Set(sky.localSky.addresses).size,
    sky.localSky.addresses.length,
  );
  for (let i = 0; i < sky.localSky.addresses.length; i += 79) {
    const other = refByAddress(g, sky.localSky.addresses[i]);
    assert.ok(other);
    const delta = other.position.map((v, k) => v - ref.position[k]),
      length = Math.hypot(...delta);
    delta.forEach((v, k) =>
      assert.ok(
        Math.abs(sky.localSky.positions[i * 3 + k] / 132 - v / length) < 1e-6,
      ),
    );
  }
  assert.deepEqual(sky.sky.positions, starMap(g).positions);
});

test("surrounding stars belong to adjacent catalogue sectors with a fixed budget", () => {
  const g = galaxies("LETHRA-001")[0],
    coords = [266, 0, 0];
  const surroundings = sectorSurroundings(g, coords);
  assert.ok(surroundings.addresses.length > 0);
  assert.ok(surroundings.addresses.length <= 26 * 160);
  assert.equal(
    new Set(surroundings.addresses).size,
    surroundings.addresses.length,
  );
  const foreground = new Set(sector(g, coords).refs.map((r) => r.id));
  for (const id of surroundings.addresses) assert.ok(!foreground.has(id));
  for (let i = 0; i < surroundings.addresses.length; i += 37) {
    const ref = refByAddress(g, surroundings.addresses[i]);
    assert.ok(ref);
    const owner = ref.cell.map((v) => Math.floor(v / 8));
    assert.notDeepEqual(owner, coords);
    owner.forEach((v, axis) => assert.ok(Math.abs(v - coords[axis]) <= 1));
    ref.position.forEach((v, axis) =>
      assert.ok(
        Math.abs(
          surroundings.positions[i * 3 + axis] -
            (v - (coords[axis] * 32 + 16)) * 0.5,
        ) < 0.00001,
      ),
    );
  }
});

test("PCG32 matches the official reference sequence", () => {
  const next = pcg(42n, 54n);
  assert.deepEqual(
    Array.from({ length: 6 }, () => next().toString(16)),
    ["a15c02b7", "7b47f409", "ba1d3330", "83d2f293", "bfa4784b", "cbed606e"],
  );
});

test("overview bodies and rings remain separated during orbital playback; physical scale preserves ratios", () => {
  const g = galaxies("LETHRA-001")[0],
    refs = sector(g, [266, 0, 0]).refs.slice(0, 160);
  for (const ref of refs) {
    const sys = system(ref),
      bodies = [...sys.stars, ...sys.planets];
    const overview = systemLayout(sys),
      physical = systemLayout(sys, "physical");
    for (const b of bodies) {
      const record = physical.records[b.id];
      assert.ok(
        Math.abs(record.radius / b.radiusM - record.orbitScale) < 1e-20,
      );
    }
    for (let t = 0; t < 32; t++) {
      const positions = bodies.map((b) =>
        layoutPosition(b, sys, overview.records[b.id], t * 86400 * 271),
      );
      for (let i = 0; i < bodies.length; i++)
        for (let j = i + 1; j < bodies.length; j++) {
          const separation = Math.hypot(
            ...positions[i].map((v, k) => v - positions[j][k]),
          );
          assert.ok(
            separation >
              overview.records[bodies[i].id].extent +
                overview.records[bodies[j].id].extent,
            `${ref.id}: ${bodies[i].id} overlaps ${bodies[j].id}`,
          );
        }
    }
  }
});

test("orbital terrain shares coastlines across resolutions with seam-safe geometry and flat oceans", () => {
  const g = galaxies("LETHRA-001")[0],
    sys = system(sector(g, [266, 0, 0]).refs[0]);
  const body = sys.planets.find((p) => p.water),
    sample = terrainSampler(body);
  const low = planetSurface(body, 128, 40),
    high = planetSurface(body, 256, 80);
  let ocean = 0,
    land = 0;
  for (let y = 0; y <= 20; y++)
    for (let x = 0; x <= 40; x++) {
      const a = low.elevations[y * 41 + x],
        b = high.elevations[y * 2 * 81 + x * 2];
      assert.ok(
        Math.abs(a - b) < 0.01,
        "LOD shares exactly the same height field",
      );
      const theta = (x / 40) * Math.PI * 2,
        phi = (y / 20) * Math.PI;
      const s = sample([
        -Math.cos(theta) * Math.sin(phi),
        Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
      ]);
      if (s.ocean) {
        ocean++;
        assert.equal(a, 0);
      } else land++;
    }
  assert.ok(ocean > 0 && land > 0);
  for (let y = 0; y <= 20; y++)
    assert.ok(
      Math.abs(low.elevations[y * 41] - low.elevations[y * 41 + 40]) < 0.01,
    );
  const a = sample([-1, 0, 1e-10]),
    b = sample([-1, 0, -1e-10]);
  assert.ok(Math.abs(a.elevationM - b.elevationM) < 0.01);
  assert.equal(sample([0, 1, 0]).elevationM, sample([0, 1, 0]).elevationM);
  assert.ok(Math.abs(low.landFraction - high.landFraction) < 0.01);
});
test("catalogue is seed-specific and independent of query order", () => {
  const first = galaxies("LETHRA-001");
  assert.deepEqual(first, galaxies("LETHRA-001"));
  assert.notDeepEqual(first, galaxies("ANOTHER-UNIVERSE"));
  assert.equal(new Set(first.map((g) => g.id)).size, 32);
  assert.equal(new Set(first.map((g) => g.type)).size, 4);
  const coords = [
    [266, 0, 0],
    [0, 0, 0],
    [-2, -1, -2],
  ];
  const before = coords.map((c) => sector(first[0], c));
  coords
    .slice()
    .reverse()
    .forEach((c) => sector(first[0], c));
  assert.deepEqual(
    coords.map((c) => sector(first[0], c)),
    before,
  );
  assert.equal(first[0].name, "Esensara");
});
test("sector ownership and direct address lookup work across signed boundaries", () => {
  const g = galaxies("boundary")[0],
    seen = new Set();
  for (const c of [
    [0, 0, 0],
    [-1, 0, 0],
    [0, -1, 0],
    [0, 0, -1],
  ]) {
    const s = sector(g, c);
    assert.ok(s.total >= s.refs.length);
    for (const r of s.refs) {
      assert.ok(!seen.has(r.id));
      seen.add(r.id);
      r.position.forEach((p, i) =>
        assert.ok(p >= c[i] * 32 && p < (c[i] + 1) * 32),
      );
      assert.deepEqual(refByAddress(g, r.id), r);
    }
  }
  assert.equal(refByAddress(g, "G001/C99999999,0,0/0"), null);
  assert.equal(refByAddress(g, "G002/C0,0,0/0"), null);
});
test("system records have stable names, valid parents, orbits, and bounded moons", () => {
  const g = galaxies("LETHRA-001")[0],
    refs = sector(g, [266, 0, 0]).refs.slice(0, 80);
  let binaries = 0,
    wet = 0;
  for (const ref of refs) {
    const s = system(ref);
    assert.deepEqual(s, system(ref));
    const bodies = [...s.stars, ...s.planets, ...s.moons],
      ids = new Set([s.id, ...bodies.map((b) => b.id)]);
    assert.equal(ids.size, bodies.length + 1);
    binaries += s.stars.length === 2 ? 1 : 0;
    for (const b of bodies) {
      assert.match(b.name, /^[A-Z][a-z]+$/);
      assert.ok(ids.has(b.parentId));
      assert.ok(b.massKg > 0 && b.radiusM > 0);
      if (b.water) wet++;
      if (b.orbit) {
        assert.ok(b.orbit.e >= 0 && b.orbit.e < 1);
        assert.ok(b.orbit.a > 0);
      }
      for (const t of [0, 86400, 86400 * 365])
        assert.ok(bodyPosition(b, s, t).every(Number.isFinite));
      if (b.kind === "moon") {
        const parent = s.planets.find((p) => p.id === b.parentId);
        assert.ok(b.orbit.a * (1 - b.orbit.e) > parent.radiusM + b.radiusM);
      }
    }
    for (let i = 1; i < s.planets.length; i++)
      assert.ok(
        s.planets[i].orbit.a * (1 - s.planets[i].orbit.e) >
          s.planets[i - 1].orbit.a * (1 + s.planets[i - 1].orbit.e),
      );
    if (s.stars.length === 2)
      for (const t of [0, 1e7]) {
        const p = s.stars.map((b) => bodyPosition(b, s, t));
        for (let k = 0; k < 3; k++)
          assert.ok(
            Math.abs(
              (p[0][k] * s.stars[0].massKg + p[1][k] * s.stars[1].massKg) /
                (s.stars[0].massKg + s.stars[1].massKg),
            ) < 0.001,
          );
      }
  }
  assert.ok(
    binaries > 0 && wet > 0,
    "corpus must exercise binaries and oceanic worlds",
  );
});
test("Kepler solver returns an orbit after one period", () => {
  const o = {
    a: AU,
    e: 0.3,
    inclination: 0.2,
    node: 0.4,
    periapsis: 0.1,
    anomaly: 0.8,
    mu: G * 1.98847e30,
  };
  const a = orbitPosition(o, 0),
    b = orbitPosition(o, 2 * Math.PI * Math.sqrt(o.a ** 3 / o.mu));
  a.forEach((p, i) => assert.ok(Math.abs(p - b[i]) < 0.01));
});
test("macro surface has stable spherical geography independent of texture resolution", () => {
  const g = galaxies("LETHRA-001")[0],
    s = system(sector(g, [266, 0, 0]).refs[0]);
  const b = s.planets[0];
  for (const d of [
    [1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, -1],
  ]) {
    assert.equal(macroHeight(b.seed, d), macroHeight(b.seed, d));
    assert.deepEqual(surfaceSample(b, d), surfaceSample(b, d));
  }
  assert.notEqual(macroHeight("a", [1, 0, 0]), macroHeight("b", [1, 0, 0]));
  const a = macroHeight(b.seed, [-1, 0, 1e-9]),
    c = macroHeight(b.seed, [-1, 0, -1e-9]);
  assert.ok(Math.abs(a - c) < 1e-7, "longitude wrap is a continuous field");
});

test("galaxy map points are unique real catalogue stars across detail levels", () => {
  const g = galaxies("LETHRA-001")[0],
    coarse = starMap(g, 1000),
    fine = starMap(g, 2000);
  assert.equal(new Set(fine.refs.map((r) => r.id)).size, fine.refs.length);
  assert.deepEqual(fine.refs.slice(0, coarse.refs.length), coarse.refs);
  for (const ref of fine.refs) assert.deepEqual(refByAddress(g, ref.id), ref);
  assert.equal(neighbourhood([-32, 0, -0.01]).length, 27);
  assert.ok(
    neighbourhood([-32, 0, -0.01]).some((c) => c.join(",") === "-1,0,-1"),
  );
});
