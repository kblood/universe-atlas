/** fauna-appearance-2 (fauna round WP6): lineage and species coat genomes,
 * individual drift, signed-lateral markings, sex dimorphism, continuous
 * neonatal juveniles, family envelopes and the far-LOD mean colour. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateBiosphere } from '../src/biosphere-model.ts';
import { generateCreatureGenome, realisticIndividualCreatureGenome, validateCreatureGenome } from '../src/creature-model.ts';
import {
  FAUNA_APPEARANCE_LEGACY_VERSION, FAUNA_APPEARANCE_VERSION, MORPHOLOGY_FAMILIES, createFaunaAppearance, faunaArmorShare, faunaCoatMark, faunaCoatMaxScale,
  faunaFarCoatMean, faunaLineageCoat, faunaSpeciesCoat, faunaSpeciesDimorphism, inheritedFaunaFamily, sampleFaunaCoat,
} from '../src/fauna-appearance.ts';
import { coatMeanColor, coatMinFeature, hexToLinear } from '../src/fauna-coat-fields.ts';
import { PIGMENT_FAMILIES } from '../src/fauna-coat-vocab.ts';
import { buildQuadrupedBody, primitiveDistance, quadrupedBodyBuildSteps, QUADRUPED_BODY_VERSION, QUADRUPED_GRID_POINT_BUDGET } from '../src/fauna-body-plan.ts';

const ARCHETYPES = ['browser', 'runner', 'low-slung', 'long-neck'];
const PROFILES = ['temperate', 'arid', 'cold'];
const median = values => { const s = [...values].sort((a, b) => a - b); return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

/** Linear sRGB (D65) to CIELAB. */
function lab([r, g, b]) {
  const X = (.4124564 * r + .3575761 * g + .1804375 * b) / .95047, Y = .2126729 * r + .7151522 * g + .072175 * b, Z = (.0193339 * r + .119192 * g + .9503041 * b) / 1.08883;
  const f = t => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
const deltaE = (a, b) => { const p = lab(a), q = lab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };

const planets = Array.from({ length: 200 }, (_, i) => generateBiosphere(`WP6-COAT-VARIETY-${i}`, PROFILES[i % 3], `planet/${i}`).species.filter(s => s.creature));

test('appearance and body versions; v1 and v2 appearance blocks both validate', () => {
  assert.equal(FAUNA_APPEARANCE_VERSION, 'fauna-appearance-2');
  assert.equal(QUADRUPED_BODY_VERSION, 'quadruped-body-4');
  const founder = generateCreatureGenome('WP6-VALIDATE', 'browser');
  const g = realisticIndividualCreatureGenome(founder, 'WP6-VALIDATE/member', 1, 'juvenile');
  assert.deepEqual(validateCreatureGenome(g), []);
  assert.equal(g.appearance.version, 'fauna-appearance-2');
  assert.ok(['female', 'male'].includes(g.appearance.individual.sex));
  assert.ok(g.appearance.growth.maturity >= .22 && g.appearance.growth.maturity <= .45);
  assert.ok(g.appearance.growth.lateral > .5 && g.appearance.growth.lateral < 2);
  // A stored v1 block (no coat) still validates and keeps its v1 coat.
  const { coat, lineage, ...rest } = g.appearance;
  const v1 = { ...g, appearance: { ...rest, version: FAUNA_APPEARANCE_LEGACY_VERSION, profile: { mass: rest.profile.mass, limb: rest.profile.limb, neck: rest.profile.neck }, individual: { size: 0, condition: 0, muzzle: 0, ears: 0 }, growth: { stage: 'juvenile', maturity: .28 } } };
  assert.deepEqual(validateCreatureGenome(v1), []);
  const c = sampleFaunaCoat(v1, .2, .1, .1, 0);
  assert.ok(c.every(v => Number.isFinite(v) && v >= 0 && v <= 1));
  assert.equal(faunaCoatMark(v1, .2, .1, .1, 0), 0);
  // Broken v2 blocks are rejected.
  for (const broken of [
    { ...g.appearance, coat: { ...coat, pattern: 'checkerboard' } },
    { ...g.appearance, individual: { ...g.appearance.individual, sex: 'other' } },
    { ...g.appearance, lineage: { ...lineage, family: 'teal' } },
    { ...g.appearance, profile: { ...g.appearance.profile, dimorphism: 3 } },
    { ...g.appearance, coat: { ...coat, scale: 99 } },
  ]) assert.ok(validateCreatureGenome({ ...g, appearance: broken }).length > 0);
  // Deep copy: the realistic genome owns its coat.
  const again = realisticIndividualCreatureGenome(founder, 'WP6-VALIDATE/member', 1, 'juvenile');
  again.appearance.coat.colours.base[0] = .99;
  assert.notEqual(realisticIndividualCreatureGenome(founder, 'WP6-VALIDATE/member', 1, 'juvenile').appearance.coat.colours.base[0], .99);
});

test('variety over 200 planets x 12 species: schemes, families, patterns and lineage colour distances', t => {
  const schemeCounts = [], families = new Set(), patterns = new Set(), within = [], across = [];
  for (const species of planets) {
    assert.equal(species.length, 12);
    const schemes = new Set(), means = [];
    for (const s of species) {
      const { lineage, coat } = faunaSpeciesCoat(s.creature);
      // Descendants inherit archetype, colour and catalogue pattern, so a clade shares a lineage.
      schemes.add(`${lineage.family}/${coat.pattern}/${coat.marks}`); families.add(lineage.family); patterns.add(coat.pattern);
      means.push({ lineage: `${s.creature.archetype}/${s.creature.color}/${s.creature.pattern}`, mean: coatMeanColor(coat) });
    }
    schemeCounts.push(schemes.size);
    for (let i = 0; i < means.length; i++) for (let j = i + 1; j < means.length; j++) (means[i].lineage === means[j].lineage ? within : across).push(deltaE(means[i].mean, means[j].mean));
  }
  const report = { medianSchemes: median(schemeCounts), families: [...families].sort(), patterns: [...patterns].sort(), medianWithin: median(within), medianAcross: median(across), withinPairs: within.length, acrossPairs: across.length };
  t.diagnostic(JSON.stringify(report));
  assert.ok(report.medianSchemes >= 8, `median schemes ${report.medianSchemes}`);
  assert.deepEqual(report.families, [...PIGMENT_FAMILIES].sort());
  assert.ok(patterns.size >= 10, `patterns ${report.patterns}`);
  assert.ok(report.medianWithin >= 4, `within-lineage dE ${report.medianWithin}`);
  assert.ok(report.medianAcross >= 12, `across-lineage dE ${report.medianAcross}`);
});

test('lineage coat and juvenile-spot inheritance follow the archetype priors', () => {
  let spotted = 0, eligible = 0;
  for (const species of planets.slice(0, 80)) for (const s of species) {
    const lineage = faunaLineageCoat(s.creature);
    if (s.creature.archetype === 'browser' || s.creature.archetype === 'long-neck') { eligible++; if (lineage.juvenileSpots) spotted++; }
    else assert.equal(lineage.juvenileSpots, false);
    if (s.creature.archetype === 'long-neck') assert.ok(['ochre', 'tawny', 'fawn'].includes(lineage.family));
  }
  assert.ok(spotted / eligible > .45 && spotted / eligible < .75, `juvenile-spot lineages ${spotted}/${eligible}`);
});

test('individuals: sex ratio, dimorphic horns and continuous neonatal juveniles', t => {
  const ratios = [], heads = [];
  let males = 0, total = 0;
  for (const species of planets.slice(0, 60)) for (const s of species) {
    const { dimorphism, hornlessFemales } = faunaSpeciesDimorphism(s.creature);
    assert.ok(dimorphism >= .15 && dimorphism <= .7);
    const horns = { male: [], female: [] };
    for (let n = 0; n < 12; n++) {
      const id = `${s.id}/member-${n}`, variant = n % 4;
      const adult = realisticIndividualCreatureGenome(s.creature, id, variant, 'adult');
      total++; if (adult.appearance.individual.sex === 'male') males++;
      horns[adult.appearance.individual.sex].push(adult.hornLength);
      if (hornlessFemales && adult.appearance.individual.sex === 'female') assert.equal(adult.hornLength, 0);
      const young = realisticIndividualCreatureGenome(s.creature, id, variant, 'juvenile');
      assert.equal(young.appearance.individual.sex, adult.appearance.individual.sex);
      const m = young.appearance.growth.maturity;
      if (m <= .28) heads.push({ m, ratio: (young.headLength / young.torsoLength) / (adult.headLength / adult.torsoLength) });
      assert.ok(young.hornLength <= adult.hornLength * Math.min(m * m, .2) + .0015, 'horn buds scale with maturity squared');
    }
    const mean = v => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
    if (dimorphism >= .4 && s.creature.hornLength > 0 && horns.male.length && horns.female.length) ratios.push(mean(horns.female) > 0 ? mean(horns.male) / mean(horns.female) : Infinity);
  }
  const atQuarter = heads.filter(h => Math.abs(h.m - .25) <= .03);
  t.diagnostic(JSON.stringify({ maleShare: males / total, dimorphicHornedSpecies: ratios.length, minHornRatio: Math.min(...ratios), medianHornRatio: median(ratios), juvenilesNearQuarter: atQuarter.length, minHeadRatio: Math.min(...atQuarter.map(h => h.ratio)) }));
  assert.ok(Math.abs(males / total - .5) < .06);
  assert.ok(ratios.length >= 10);
  assert.ok(ratios.every(r => r >= 1.6), `male/female horn ratio ${Math.min(...ratios)}`);
  assert.ok(atQuarter.length >= 20 && atQuarter.every(h => h.ratio >= 1.2), 'juvenile head/torso at maturity 0.25 is at least 1.2x adult');
});

test('family envelopes: long necks stay long and padded legs stay short at every stage', () => {
  for (const species of planets.slice(0, 40)) for (const s of species) for (const stage of ['adult', 'juvenile']) for (let v = 0; v < 4; v++) {
    const g = realisticIndividualCreatureGenome(s.creature, `${s.id}/env`, v, stage);
    if (g.morphology.family === 'long-neck' && stage === 'adult') assert.ok(g.neckLength / g.torsoLength >= .6 - 1e-3, `${s.id} neck ${g.neckLength / g.torsoLength}`);
    // The absolute genome bound (legLength >= 0.35 m) wins for the smallest neonates.
    if (g.morphology.family === 'padded') assert.ok(g.legLength / g.torsoLength <= .45 || g.legLength <= .35 + 1e-9, `${s.id} legs ${g.legLength / g.torsoLength}`);
  }
});

test('the far-LOD palette base is the body-weighted mean of the adult coat, close to coatMeanColor', t => {
  let worst = 0, canonical = [];
  for (const species of planets.slice(0, 25)) for (const s of species) for (let v = 0; v < 4; v++) {
    const a = createFaunaAppearance(s.creature, `${s.id}/mean`, v, 'adult'), juvenile = createFaunaAppearance(s.creature, `${s.id}/mean`, v, 'juvenile');
    assert.deepEqual(juvenile.palette, a.palette, 'the far colour never depends on growth stage');
    const exact = faunaFarCoatMean(a.coat, inheritedFaunaFamily(s.creature), faunaArmorShare(s.creature)), base = hexToLinear(a.palette.base);
    worst = Math.max(worst, ...exact.map((c, i) => Math.abs(c - base[i])));
    canonical.push(Math.max(...coatMeanColor(a.coat).map((c, i) => Math.abs(c - base[i]))));
  }
  t.diagnostic(`max |palette.base - farMean| ${worst.toFixed(4)} (sRGB hex quantisation); median |palette.base - coatMeanColor| ${median(canonical).toFixed(4)}`);
  assert.ok(worst <= .006, `palette mean error ${worst}`);
  assert.ok(median(canonical) <= .04, 'the body weighting is a small correction to the canonical coat mean');
});

/** Max channel |area-weighted near-body mean linear RGB - linear(g.color)|. */
function nearFarError(body, g, skinOnly = false) {
  const sum = [0, 0, 0]; let area = 0;
  for (let i = 0; i < body.index.length; i += 3) {
    if (skinOnly && body.index[i] >= body.bodyVertexCount) continue;
    const a = body.index[i] * 3, b = body.index[i + 1] * 3, c = body.index[i + 2] * 3, P = body.positions;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const w = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
    area += w;
    for (let k = 0; k < 3; k++) sum[k] += w * (body.colors[a + k] + body.colors[b + k] + body.colors[c + k]) / 3 / 255;
  }
  const far = hexToLinear(g.color);
  return Math.max(...sum.map((s, k) => Math.abs(s / area - far[k])));
}

/** Region of each body vertex: the nearest primitive, exactly as the body plan colours it. */
function vertexRegions(body) {
  const regions = new Array(body.bodyVertexCount);
  for (let v = 0; v < body.bodyVertexCount; v++) {
    const x = body.positions[v * 3], y = body.positions[v * 3 + 1], z = body.positions[v * 3 + 2];
    let best = Infinity, region = 'torso';
    for (const p of body.plan.primitives) { const d = primitiveDistance(p, x, y, z); if (d < best) { best = d; region = p.region; } }
    regions[v] = region;
  }
  return regions;
}
function speciesWithPattern(wanted, count) {
  const found = [];
  for (const species of planets) for (const s of species) {
    if (found.length >= count) return found;
    const { coat } = faunaSpeciesCoat(s.creature);
    if (coat.pattern === wanted) found.push(s);
  }
  return found;
}

test('near bodies: markings are bilateral-asymmetric and continue onto the neck', t => {
  const rows = [];
  for (const pattern of ['spots', 'rosettes', 'reticulated']) for (const s of speciesWithPattern(pattern, 3)) {
    const g = realisticIndividualCreatureGenome(s.creature, `${s.id}/symmetry`, 0, 'adult');
    const body = buildQuadrupedBody(g), regions = vertexRegions(body);
    // Mirror pairs: nearest vertex to (x, y, -z) through a hashed grid.
    const cell = body.cellM, key = (x, y, z) => `${Math.round(x / cell)},${Math.round(y / cell)},${Math.round(z / cell)}`, grid = new Map();
    for (let v = 0; v < body.bodyVertexCount; v++) grid.set(key(body.positions[v * 3], body.positions[v * 3 + 1], body.positions[v * 3 + 2]), v);
    let asymmetry = 0, pairs = 0;
    for (let v = 0; v < body.bodyVertexCount; v++) {
      const x = body.positions[v * 3], y = body.positions[v * 3 + 1], z = body.positions[v * 3 + 2];
      if (z < cell * 2 || regions[v] !== 'torso') continue;
      const m = grid.get(key(x, y, -z));
      if (m === undefined) continue;
      pairs++;
      for (let c = 0; c < 3; c++) asymmetry = Math.max(asymmetry, Math.abs(body.colors[v * 3 + c] - body.colors[m * 3 + c]) / 255);
    }
    // Mark coverage on neck vs torso vertices, with the body's own sampling footprint.
    const share = { torso: [0, 0], neck: [0, 0] };
    for (let v = 0; v < body.bodyVertexCount; v++) {
      const region = regions[v];
      if (region !== 'torso' && region !== 'neck') continue;
      const mark = faunaCoatMark(g, body.positions[v * 3], body.positions[v * 3 + 1], body.positions[v * 3 + 2], body.plan.torsoY, region, { dorsal: body.normals[v * 3 + 1], cellM: body.cellM });
      share[region][1]++; if (mark > .3) share[region][0]++;
    }
    const torso = share.torso[0] / share.torso[1], neck = share.neck[0] / share.neck[1];
    rows.push({ species: s.id, pattern, pairs, asymmetry, torso, neck, neckShare: neck / torso });
  }
  t.diagnostic(JSON.stringify(rows.map(r => ({ ...r, asymmetry: +r.asymmetry.toFixed(3), torso: +r.torso.toFixed(3), neck: +r.neck.toFixed(3), neckShare: +r.neckShare.toFixed(2) }))));
  assert.equal(rows.length, 9);
  for (const r of rows) {
    assert.ok(r.pairs > 100, `${r.species} mirror pairs`);
    assert.ok(r.asymmetry >= .05, `${r.species} ${r.pattern} L/R difference ${r.asymmetry}`);
    assert.ok(r.torso > 0 && r.neckShare >= .3, `${r.species} ${r.pattern} neck mark share ${r.neckShare}`);
  }
});

test('96 corpus bodies: the far colour is the near-body mean; budgets and bounded yields hold', t => {
  let worst = 0, longestStep = 0, minYields = Infinity, maxTriangles = 0, maxGrid = 0, maxCoatMs = 0, sumCoatMs = 0, n = 0;
  for (const archetype of ARCHETYPES) for (let species = 0; species < 3; species++) for (let individual = 0; individual < 4; individual++) for (const stage of ['adult', 'juvenile']) {
    const seed = `FAUNA-CORPUS/${archetype}/${species}`;
    const g = realisticIndividualCreatureGenome(generateCreatureGenome(seed, archetype), `${seed}/member`, individual, stage);
    const steps = quadrupedBodyBuildSteps(g);
    let body, yields = 0, last = performance.now();
    for (;;) {
      const next = steps.next(), now = performance.now();
      longestStep = Math.max(longestStep, now - last); last = now;
      if (next.done) { body = next.value; break; }
      yields++;
    }
    minYields = Math.min(minYields, yields);
    maxTriangles = Math.max(maxTriangles, body.triangleCount);
    maxGrid = Math.max(maxGrid, body.grid.reduce((a, b) => a * b, 1));
    assert.equal(body.faceFeatures.length, 6);
    assert.ok(body.faceFeatures.length === 6 && body.structuralTriangleCount >= 0);
    worst = Math.max(worst, nearFarError(body, g));
    // Added coat CPU: one full per-vertex coat evaluation pass over this body.
    const start = performance.now(), surface = { dorsal: 0, along: .5, cellM: body.cellM };
    for (let v = 0; v < body.vertexCount; v++) { surface.dorsal = body.normals[v * 3 + 1]; sampleFaunaCoat(g, body.positions[v * 3], body.positions[v * 3 + 1], body.positions[v * 3 + 2], body.plan.torsoY, 'torso', surface); }
    const coatMs = performance.now() - start;
    maxCoatMs = Math.max(maxCoatMs, coatMs); sumCoatMs += coatMs; n++;
  }
  t.diagnostic(JSON.stringify({ specimens: n, maxFarNearChannelError: +worst.toFixed(4), longestStepMs: +longestStep.toFixed(1), minYields, maxTriangles, maxGrid, maxCoatMs: +maxCoatMs.toFixed(2), meanCoatMs: +(sumCoatMs / n).toFixed(2) }));
  assert.equal(n, 96);
  assert.ok(worst <= .04, `near/far mean colour ${worst}`);
  assert.ok(maxTriangles <= 40000);
  assert.ok(maxGrid <= QUADRUPED_GRID_POINT_BUDGET);
  assert.ok(minYields > 20, `yields ${minYields}`);
  assert.ok(longestStep < 250, `longest step ${longestStep} ms`);
  assert.ok(maxCoatMs <= 20, `coat CPU ${maxCoatMs} ms`);
});

// Structural parts (wings, trunk) are tinted from g.color itself in both LODs,
// so the coat continuity is measured on the continuous skin for these.
test('explicit morphology families keep the far colour at the near skin mean', t => {
  let worst = 0;
  for (const archetype of ARCHETYPES) for (const family of MORPHOLOGY_FAMILIES) {
    const g = realisticIndividualCreatureGenome(generateCreatureGenome(`WP6-FAR/${archetype}`, archetype), 'WP6-FAR/member', 1, 'adult', family);
    worst = Math.max(worst, nearFarError(buildQuadrupedBody(g), g, true));
  }
  t.diagnostic(`max near-skin/far channel error over 24 explicit-family adults ${worst.toFixed(4)}`);
  assert.ok(worst <= .04, `explicit family near/far ${worst}`);
});

test('scale clamp: spots and cellular marks span at least four mesh cells', () => {
  for (const s of speciesWithPattern('spots', 4)) for (const stage of ['adult', 'juvenile']) {
    const g = realisticIndividualCreatureGenome(s.creature, `${s.id}/clamp`, 2, stage);
    const body = buildQuadrupedBody(g), cell = body.cellM / g.torsoLength;
    const max = faunaCoatMaxScale(g.appearance.coat, cell), scale = Math.min(g.appearance.coat.scale, max);
    assert.ok(coatMinFeature({ ...g.appearance.coat, marks: 0, scale }) * g.torsoLength >= 4 * body.cellM - 1e-9);
  }
});

test('evaluation is pure and deterministic, with signed lateral coordinates', () => {
  const [s] = speciesWithPattern('rosettes', 1);
  const g = realisticIndividualCreatureGenome(s.creature, `${s.id}/pure`, 3, 'adult');
  const a = sampleFaunaCoat(g, .3, .1, .2, 0, 'torso', { dorsal: .4 }), b = sampleFaunaCoat(g, .3, .1, .2, 0, 'torso', { dorsal: .4 });
  assert.deepEqual(a, b);
  let differs = 0;
  for (let i = 0; i < 40; i++) {
    const x = -.6 + i * .03, l = sampleFaunaCoat(g, x, .05, .22, 0, 'torso', { dorsal: .3 }), r = sampleFaunaCoat(g, x, .05, -.22, 0, 'torso', { dorsal: .3 });
    if (l.some((v, k) => Math.abs(v - r[k]) > .02)) differs++;
  }
  assert.ok(differs > 5, 'left and right flanks carry different markings');
});
