// Reusable before/after visual capture for recipe-sized tree families.
//
//   ATLAS_URL      served build (default http://127.0.0.1:5192/)
//   ATLAS_RESULTS  output directory
//   ATLAS_TREES    value of the `trees` URL param: '1' | '0' | '' (omit; default '1')
//   ATLAS_POSE     existing pose.json to reuse (pose, date, target ids, wide aim).
//                  Without it the script searches a forest, lands, and picks targets
//                  (this needs ATLAS_TREES=1 so the detailed-tree samples exist).
//   ATLAS_PHASES   optional comma list (wide,pine,oak,small,turn) to run only some phases
//   ATLAS_HARDWARE=1 (default here) uses the GPU via browser-options.mjs; set ATLAS_HARDWARE= (empty) for swiftshader.
//
// Camera pose, date, target individuals and per-shot diagnostics all go to
// pose.json / report.json so a second run against another bundle is a matched
// comparison. Tree positions are derived from canonical cell ids
// (src/planet-population.ts, read-only import) plus the far-canopy ground height.
import { chromium } from 'playwright';
import * as THREE from 'three';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

if (process.env.ATLAS_HARDWARE === undefined) process.env.ATLAS_HARDWARE = '1';
const { browserArgs } = await import('./browser-options.mjs');
// Node-side identity/recipe helpers come from a src tree. Default: this checkout; for a
// before/after comparison against a baseline bundle set ATLAS_SRC to an export of the
// baseline commit's src/ (git archive <sha> src) so recipe heights match that build.
const srcRoot = process.env.ATLAS_SRC ? pathToFileURL(resolve(process.env.ATLAS_SRC) + '/') : new URL('../src/', import.meta.url);
const { populationCellAt } = await import(new URL('planet-population.ts', srcRoot));
const { forestTreeCatalogue } = await import(new URL('forest-tree-catalogue.ts', srcRoot));
const { treeStructuralVariant } = await import(new URL('tree-species-recipe.ts', srcRoot));

const base = process.env.ATLAS_URL || 'http://127.0.0.1:5192/';
const out = resolve(process.env.ATLAS_RESULTS || 'test-results/opus55-trees/run');
const treesParam = process.env.ATLAS_TREES === undefined ? '1' : process.env.ATLAS_TREES;
const treesOn = treesParam === '1';
const poseFile = process.env.ATLAS_POSE ? resolve(process.env.ATLAS_POSE) : null;
const seed = 'LETHRA-001';
let popSeed = seed; // body.seed (a JSON key string) read from the page: population jitter is keyed on it
const bodyId = 'G001/C2128,0,1/0/planet/1';
const systemId = 'G001/C2128,0,1/0';
const APPROACH_M = [300, 150, 100, 75, 50, 30, 15, 8];
const RETREAT_M = [15, 50, 150];
const DATE_STEPS = [['plus1d', 86400n * 1000000000n], ['plus10y', 315576000n * 1000000000n]];
let FAMILY_MIN_H = 8; // replaced by the served build's detailedTrees.allometry.familyEnvelope.heightM[0]
const NEAR_M = 110, NEAR_HYST = 12, MIDDLE_M = 550;
await mkdir(out, { recursive: true });

const report = { ok: false, base, out, treesParam: treesParam === '' ? '(omitted)' : treesParam, seed, bodyId, viewport: [1440, 1000],
  startedAt: new Date().toISOString(), poseSource: poseFile ?? 'searched', errors: [], warnings: [], shots: [], phases: {} };
const errors = report.errors;
const t0 = Date.now();
const log = m => console.log(`[${((Date.now() - t0) / 1000).toFixed(0).padStart(4)}s] ${m}`);
const V = a => new THREE.Vector3(...a);
const r3 = x => Math.round(x * 1000) / 1000;
const stringifySafe = v => JSON.stringify(v, (k, x) => typeof x === 'bigint' ? x.toString() : x, 2);
const save = async () => { report.finishedAt = new Date().toISOString(); await writeFile(`${out}/report.json`, stringifySafe(report)); };

const browser = await chromium.launch({ headless: true, args: browserArgs });
let page = null;
async function openPage({ freeze }) {
  if (page) await page.close().catch(() => {});
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => errors.push(`page: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !m.text().startsWith('[vite] failed to connect to websocket.')) errors.push(`console: ${m.text()}`); });
  if (typeof page.routeWebSocket === 'function') await page.routeWebSocket('**/*', s => s.close());
  if (freeze) await page.addInitScript(() => {
    const def = Object.defineProperty;
    Object.defineProperty = function (t, k, d) {
      const r = Reflect.apply(def, Object, [t, k, d]);
      if (t === window && k === '__atlas' && d?.value?.setExplorationPaused) { d.value.setExplorationPaused(true); Object.defineProperty = def; }
      return r;
    };
  });
}
const waitFor = (fn, arg, timeout = 240000) => page.waitForFunction(fn, arg, { timeout });
const HIDE_UI = 'body * { visibility: hidden !important; } #viewport canvas { visibility: visible !important; }';

// ------------------------------------------------------------------ diagnostics
async function diagnostics() {
  const d = await diagnosticsRaw();
  if (d.bodySeed) popSeed = d.bodySeed;
  const env = d.detailed?.allometry?.familyEnvelope?.heightM?.[0];
  if (Number.isFinite(env)) FAMILY_MIN_H = env;
  return d;
}
async function diagnosticsRaw() {
  return page.evaluate(() => {
    const a = window.__atlas, t = a?.terrain?.tiles, f = t?.forest, d = f?.detailedTrees, c = f?.fullCanopy;
    const trav = a?.travel, center = trav?.bodies?.find(b => b.id === a?.state?.body?.id)?.positionM;
    let species = null;
    try { species = a?.lifeGate?.treeSpecies ?? null; } catch { /* no life gate */ }
    return {
      date: a?.date?.offsetNs, level: a?.state?.level, radiusM: a?.state?.body?.radiusM, bodySeed: a?.state?.body?.seed, center,
      walker: trav?.walking ? { position: trav.walking.position, grounded: trav.walking.grounded, waiting: trav.walking.waiting } : null,
      camera: { position: trav?.position, heading: trav?.heading, fov: a?.camera?.fov, clearanceM: trav?.surface?.terrainClearance, domain: trav?.domain, landing: trav?.landing },
      forestAssets: a?.forestAssets ?? null,
      terrain: t ? { pending: t.pending, resident: t.resident, visible: t.visible, faunaTerrainPending: t.faunaTerrainPending, failures: t.failures, waterLevelM: t.waterLevelM } : null,
      forest: f ? { visible: f.visible, near: f.near, cached: f.cached, pending: f.pending, selectionPending: f.selectionPending, candidateCells: f.candidateCells,
        farOwnedSkipped: f.farOwnedSkipped, farCanonicalTrees: f.farCanonicalTrees, matrixWrites: f.matrixWrites, colorWrites: f.colorWrites, coverageWrites: f.coverageWrites,
        originVersion: f.originVersion, renderedHeightRangeM: f.renderedHeightRangeM, updateMs: f.updateMs } : null,
      canopy: c ? { enabled: c.enabled, ready: c.ready, trees: c.trees, patches: c.patches, queuedPatches: c.queuedPatches, jobsInFlight: c.jobsInFlight, selectionPending: c.selectionPending,
        selectionApplyPending: c.selectionApplyPending, reusePending: c.reusePending, failures: c.failures, capacityMisses: c.capacityMisses,
        nearPresentNotInCensus: c.nearPresentNotInCensus, nearAbsentInCensus: c.nearAbsentInCensus, farForcedClose: c.farForcedClose, presentation: c.presentation } : null,
      detailed: d ? { ready: d.ready, loading: d.loading, error: d.error, visible: d.visible, species: d.species, dateNs: d.dateNs, allometry: d.allometry,
        farRepresentation: d.farRepresentation, farAtlas: d.farAtlas, presentationKey: d.presentationKey,
        families: d.families?.map(x => ({ kind: x.kind, submitted: x.submitted, retainedSlots: x.retainedSlots, lodCoverage: x.lodCoverage, structuralVariants: x.structuralVariants })),
        samples: d.samples, handoffSamples: d.handoffSamples } : null,
      treeSpecies: species,
    };
  });
}
const trimShotDiag = (d, targetId) => {
  const copy = { ...d, treeSpecies: undefined };
  if (copy.detailed) {
    const { samples, handoffSamples, ...rest } = copy.detailed;
    copy.detailed = { ...rest, sampleCount: samples?.length ?? 0,
      targetSample: targetId ? samples?.find(s => s.id === targetId) ?? null : null,
      targetHandoff: targetId ? handoffSamples?.find(s => s.id === targetId) ?? null : null };
    if (copy.detailed.farAtlas) copy.detailed.farAtlas = { adopted: d.detailed.farAtlas.adopted, error: d.detailed.farAtlas.error };
  }
  return copy;
};

async function waitSettled({ minMs = 700, timeout = 240000 } = {}) {
  await waitFor(({ treesOn }) => {
    const a = window.__atlas, t = a?.terrain?.tiles, f = t?.forest, c = f?.fullCanopy, d = f?.detailedTrees;
    if (!a?.ready || !t || !f) return false;
    if (f.selectionPending !== false || f.pending !== 0 || t.pending !== 0 || t.faunaTerrainPending !== 0) return false;
    if (c && !(c.ready && !c.reusePending && !c.selectionApplyPending && !c.selectionPending && c.queuedPatches === 0 && c.jobsInFlight === 0)) return false;
    if (treesOn) {
      const fa = a.forestAssets;
      if (!fa?.enabled || fa.loading || !fa.ready || fa.error) return false;
      if (!d?.ready || d.loading || d.error) return false;
      const presented = (d.families ?? []).map(x => x.kind);
      if (!presented.length) return false;
      if (d.farAtlas?.error) return false;
      if (!presented.every(k => d.farAtlas?.adopted?.includes(k))) return false;
    }
    return true;
  }, { treesOn }, timeout);
  await page.waitForTimeout(minMs);
  // Require stable counts across a short interval (streaming really finished).
  const key = () => page.evaluate(() => { const f = window.__atlas.terrain.tiles.forest; return [f.visible, f.near, f.cached, f.pending, window.__atlas.terrain.tiles.pending, f.fullCanopy?.trees].join('/'); });
  for (let i = 0; i < 10; i++) { const a = await key(); await page.waitForTimeout(400); if (a === await key()) return; }
  report.warnings.push('waitSettled: counts still changing after 4 s');
}

// ------------------------------------------------------------------ navigation
function poseQuery({ walk, heading, dateNs }) {
  const q = new URLSearchParams({ seed, g: 'G001', system: systemId, body: bodyId });
  if (treesParam !== '') q.set('trees', treesParam);
  if (dateNs) q.set('date', dateNs);
  if (report.poseWv) q.set('wv', report.poseWv);
  if (walk) q.set('walk', walk.join(','));
  if (heading) q.set('heading', heading.join(','));
  return q;
}
async function loadPose(pose, overrides = {}) {
  await openPage({ freeze: true });
  const q = poseQuery({ walk: overrides.walk ?? pose.walkPosition, heading: overrides.heading ?? pose.heading, dateNs: pose.dateNs });
  await page.goto(`${base}?${q}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await waitFor(id => window.__atlas?.ready && window.__atlas.state.level === 'body' && window.__atlas.state.body?.id === id && !window.__atlas.camera.animating, bodyId);
  await waitFor(dateNs => window.__atlas.date.offsetNs === dateNs && window.__atlas.travel.walking?.grounded, pose.dateNs);
  await page.addStyleTag({ content: HIDE_UI });
  await waitSettled();
}

// ------------------------------------------------------------------ aiming
async function drag(dx, dy) {
  const box = await page.locator('#viewport canvas').boundingBox();
  const sx = box.x + box.width * .45, sy = box.y + box.height * .52;
  const chunks = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 150));
  for (let i = 0; i < chunks; i++) {
    await page.mouse.move(sx, sy); await page.mouse.down();
    await page.mouse.move(sx + dx / chunks, sy + dy / chunks, { steps: 4 });
    await page.mouse.up();
  }
}
const camProjection = async worldTarget => {
  const s = await page.evaluate(() => { const a = window.__atlas; return { p: a.travel.position, q: a.travel.heading, fov: a.camera.fov }; });
  const v = V(worldTarget).sub(V(s.p)).applyQuaternion(new THREE.Quaternion(...s.q).invert());
  const z = -v.z, hy = Math.tan(s.fov * Math.PI / 360), hx = hy * 1440 / 1000;
  return { yaw: Math.atan2(v.x, -v.z), pitch: Math.atan2(v.y, Math.hypot(v.x, v.z)), depthM: z, ndc: [v.x / (z * hx), v.y / (z * hy)], distanceM: v.length() };
};
async function aimAt(bodyLocalPoint, rounds = 3) {
  const center = (await diagnostics()).center;
  const world = V(bodyLocalPoint).add(V(center)).toArray();
  let pr;
  for (let i = 0; i < rounds; i++) {
    pr = await camProjection(world);
    if (Math.abs(pr.yaw) < .002 && Math.abs(pr.pitch) < .002) break;
    await drag(pr.yaw / .003, 0); await drag(0, -pr.pitch / .003);
    await page.waitForTimeout(120);
  }
  return camProjection(world);
}

// ------------------------------------------------------------------ tree geometry (Node side)
const bodyRadius = () => report.radiusM;
function parseId(id) { const [face, n, x, y] = id.split('/').map(Number); return { face, n, x, y }; }
function cellDirection(id) {
  const { face, n, x, y } = parseId(id);
  const cell = populationCellAt(popSeed, face, n, x, y);
  return cell ? V(cell.direction) : null;
}
const treeGroundPoint = t => V(t.direction).multiplyScalar(bodyRadius() + t.groundHeightM);
function tangentFrame(dir, hint) {
  const up = V(dir).normalize();
  let e1 = hint ? V(hint).sub(up.clone().multiplyScalar(V(hint).dot(up))) : new THREE.Vector3();
  if (e1.lengthSq() < 1e-9) { const ref = Math.abs(up.y) > .92 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0); e1 = new THREE.Vector3().crossVectors(ref, up); }
  e1.normalize();
  return { up, e1, e2: new THREE.Vector3().crossVectors(up, e1).normalize() };
}
const midPoint = t => { const g = treeGroundPoint(t); return g.clone().add(g.clone().normalize().multiplyScalar(Math.max(2, (t.heightM ?? 10) / 2))).toArray(); };
const horizDist = (a, b) => { const up = V(b).normalize(), d = V(a).sub(V(b)); return d.sub(up.multiplyScalar(d.dot(up))).length(); };
function bindingFor(treeSpecies, id) {
  const cat = forestTreeCatalogue(treeSpecies ?? []);
  const b = cat.resolve(id); if (!b) return null;
  const v = treeStructuralVariant(b.recipe, b.appearance.variant);
  return { speciesId: b.recipe.speciesId, family: b.recipe.family, recipeHeightM: v.heightM, recipeCrownWidthM: v.crownWidthM, recipeTrunkDiameterM: v.trunkDiameterM };
}
/** Expected drawn representation from the runtime rules in planet-forest.ts:
 * LOD0 when eye distance < 110-12 (fresh) / < 110+12 (retained), LOD1 out to the
 * paired canopy hand-off at 550 m, far atlas beyond; family draw only when the
 * individual is inside the family height envelope and detailed trees are on. */
function expectedRepresentation(target, distance3D, wasNear) {
  const family = treesOn && target.family !== 'legacy-under-envelope' && target.recipeHeightM >= FAMILY_MIN_H;
  const near = distance3D < (wasNear ? NEAR_M + NEAR_HYST : NEAR_M - NEAR_HYST);
  if (distance3D >= MIDDLE_M) return { representation: 'far-atlas-canopy', near: false };
  return { representation: family ? (near ? 'detailed-LOD0' : 'detailed-LOD1') : (near ? 'legacy-primitive-near-mesh' : 'legacy-primitive-mid-mesh'), near };
}

// ------------------------------------------------------------------ screenshots
function projectPoint(diag, bodyLocal) {
  const p = V(diag.camera.position), q = new THREE.Quaternion(...diag.camera.heading);
  const v = V(bodyLocal).add(V(diag.center)).sub(p).applyQuaternion(q.invert());
  const z = -v.z; if (z < .05) return null;
  const hy = Math.tan(diag.camera.fov * Math.PI / 360), hx = hy * 1440 / 1000;
  return [(v.x / (z * hx) + 1) * 720, (1 - v.y / (z * hy)) * 500];
}
/** Thin SVG gauges for a target: recipe height (magenta), recipe crown width (cyan, at 60% height)
 * and drawn crown width (yellow, at 45% height), in true metres perpendicular to the view. */
function markerSvg(diag, t) {
  const g = treeGroundPoint(t), up = g.clone().normalize(), cp = V(diag.camera.position).sub(V(diag.center));
  const view = g.clone().sub(cp); view.sub(up.clone().multiplyScalar(view.dot(up))); if (view.lengthSq() < 1e-6) return null;
  const right = new THREE.Vector3().crossVectors(view.normalize(), up).normalize();
  const H = t.recipe?.heightM ?? t.heightM, at = f => g.clone().addScaledVector(up, H * f);
  const style = 'style="visibility:visible!important"';
  const line = (a, b, col, w = 2) => { const A = projectPoint(diag, a.toArray()), B = projectPoint(diag, b.toArray()); return A && B ? `<line ${style} x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" stroke="${col}" stroke-width="${w}"/>` : ''; };
  const bar = (f, width, col) => width ? line(at(f).addScaledVector(right, -width / 2), at(f).addScaledVector(right, width / 2), col, 3) : '';
  const nearTop = projectPoint(diag, at(1).toArray());
  const label = `${t.label} ${t.id.split('/').slice(2).join('/')} ${t.speciesId?.split('/').slice(-2).join('/') ?? ''} H ${H.toFixed(1)} m | recipe crown ${t.recipe?.crownWidthM?.toFixed(1) ?? '?'} m (cyan) | drawn crown ${t.drawn?.crownWidthM?.toFixed(1) ?? '?'} m (yellow)`;
  return `<svg ${style} xmlns="http://www.w3.org/2000/svg" width="1440" height="1000" viewBox="0 0 1440 1000">` +
    line(at(0), at(1), '#ff2bd6') + bar(.6, t.recipe?.crownWidthM, '#00e5ff') + bar(.45, t.drawn?.crownWidthM, '#ffe000') +
    (nearTop ? `<circle ${style} cx="${nearTop[0]}" cy="${nearTop[1]}" r="5" fill="none" stroke="#ff2bd6" stroke-width="2"/>` : '') +
    `<rect ${style} x="8" y="8" width="${label.length * 7.2 + 12}" height="22" fill="rgba(0,0,0,.6)"/><text ${style} x="14" y="24" font-family="monospace" font-size="13" fill="#fff">${label}</text></svg>`;
}
async function shot(name, meta = {}, mark = null) {
  const diag = await diagnostics();
  const file = `${name}.png`;
  await page.screenshot({ path: `${out}/${file}` });
  let markedFile = null;
  const svg = mark ? markerSvg(diag, mark) : null;
  if (svg) {
    markedFile = `${name}-marked.png`;
    await page.evaluate(html => { const d = document.createElement('div'); d.id = 'tf-overlay'; d.setAttribute('style', 'position:fixed;left:0;top:0;width:1440px;height:1000px;pointer-events:none;z-index:2147483647;visibility:visible!important'); d.innerHTML = html; document.body.appendChild(d); }, svg);
    await page.screenshot({ path: `${out}/${markedFile}` });
    await page.evaluate(() => document.getElementById('tf-overlay')?.remove());
  }
  const rec = { name, file, markedFile, ...meta, diagnostics: trimShotDiag(diag, meta.targetId) };
  report.shots.push(rec);
  return { rec, diag };
}

// ------------------------------------------------------------------ pose search
async function searchPose() {
  if (!treesOn) throw new Error('Pose search needs ATLAS_TREES=1 (detailed-tree samples supply target ids). Reuse a pose with ATLAS_POSE for other modes.');
  await openPage({ freeze: false });
  const q = new URLSearchParams({ seed, g: 'G001', system: systemId, body: bodyId, trees: '1' });
  await page.goto(`${base}?${q}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await waitFor(id => window.__atlas?.ready && window.__atlas.state.level === 'body' && window.__atlas.state.body?.id === id && !window.__atlas.camera.animating, bodyId);
  await page.locator('#find-life').click();
  await waitFor(() => window.__atlas.travel.terrainCruise !== null);
  await page.keyboard.down('q');
  await waitFor(() => window.__atlas.travel.surface?.terrainClearance < 100);
  await page.keyboard.up('q');
  await waitFor(() => window.__atlas.terrain?.tiles?.forest?.visible > 200);
  await page.evaluate(() => window.__atlas.setExplorationPaused(true));
  await waitSettled({ minMs: 1500 });
  log('forest found in flight; landing');
  await page.locator('#walk-surface').click();
  await waitFor(() => window.__atlas.travel.walking?.grounded);
  await page.waitForTimeout(1500);
  await waitSettled({ minMs: 2500 });
  const d = await diagnostics();
  const params = new URL(await page.evaluate(() => location.href)).searchParams;
  report.poseWv = params.get('wv');
  return { walkPosition: d.walker.position, heading: d.camera.heading, dateNs: d.date, wv: params.get('wv'), diag: d };
}

function pickTargets(d, pose) {
  report.radiusM = d.radiusM;
  const walker = V(d.walker.position);
  const samples = d.detailed.samples, hand = new Map(d.detailed.handoffSamples.map(h => [h.id, h.far]));
  const known = samples.map(s => {
    const direction = cellDirection(s.id), far = hand.get(s.id);
    if (!direction || !far) return null;
    return { ...s, direction: direction.toArray(), groundHeightM: far.groundHeightM };
  }).filter(Boolean);
  if (!known.length) throw new Error('No detailed samples with positions available');
  const distTo = t => horizDist(treeGroundPoint(t).toArray(), walker.toArray());
  const choose = fam => {
    const list = known.filter(s => s.family === fam && distTo(s) >= 20).sort((a, b) => distTo(a) - distTo(b));
    return list[0] ?? known.filter(s => s.family === fam).sort((a, b) => distTo(a) - distTo(b))[0] ?? null;
  };
  const describe = (label, s) => s && ({ recipe: (() => { const b = bindingFor(d.treeSpecies, s.id); return b && { heightM: b.recipeHeightM, crownWidthM: b.recipeCrownWidthM, trunkDiameterM: b.recipeTrunkDiameterM }; })(),
    drawn: { heightM: s.heightM, crownWidthM: s.crownWidthM, trunkDiameterM: s.trunkDiameterM }, label, id: s.id, speciesId: s.speciesId, family: s.family, direction: s.direction, groundHeightM: s.groundHeightM,
    positionBodyLocalM: treeGroundPoint(s).toArray(), horizontalDistanceFromPoseM: r3(distTo(s)),
    heightM: s.heightM, crownWidthM: s.crownWidthM, trunkDiameterM: s.trunkDiameterM, crownRatio: s.crownRatio, trunkRatio: s.trunkRatio, canonicalHeightM: s.canonicalHeightM,
    reasons: s.allometryReasons, batchAtDiscovery: s.batch, recipeHeightM: s.heightM });
  const targets = { pine: describe('pine', choose('spire')), oak: describe('oak', choose('branching')) };
  // Small legacy-drawn trees: enumerate canonical cells around known detailed samples,
  // bind them against the dated catalogue and keep those below the family envelope.
  const seen = new Set(), candidates = [];
  const nearestKnown = (face, n, x, y) => known.map(s => ({ s, k: parseId(s.id) })).filter(o => o.k.face === face && o.k.n === n)
    .sort((a, b) => Math.hypot(a.k.x - x, a.k.y - y) - Math.hypot(b.k.x - x, b.k.y - y))[0];
  for (const s of known) {
    const { face, n, x, y } = parseId(s.id);
    for (let dx = -12; dx <= 12; dx++) for (let dy = -12; dy <= 12; dy++) {
      const ix = x + dx, iy = y + dy, id = `${face}/${n}/${ix}/${iy}`;
      if (seen.has(id) || ix < 0 || iy < 0 || ix >= n || iy >= n) continue; seen.add(id);
      const cell = populationCellAt(popSeed, face, n, ix, iy); if (!cell) continue;
      const b = bindingFor(d.treeSpecies, id); if (!b || b.recipeHeightM >= FAMILY_MIN_H) continue;
      const nk = nearestKnown(face, n, ix, iy).s;
      const t = { id, direction: cell.direction, groundHeightM: nk.groundHeightM, ...b };
      t.horizontalDistanceFromPoseM = r3(distTo(t)); candidates.push(t);
    }
  }
  candidates.sort((a, b) => a.horizontalDistanceFromPoseM - b.horizontalDistanceFromPoseM);
  const legacyList = candidates.filter(c => c.horizontalDistanceFromPoseM >= 15).slice(0, 4).map((c, i) => ({ label: `small${i}`, id: c.id, speciesId: c.speciesId, family: 'legacy-under-envelope',
    recipeFamily: c.family, direction: c.direction, groundHeightM: c.groundHeightM, groundHeightEstimated: true, positionBodyLocalM: treeGroundPoint(c).toArray(),
    horizontalDistanceFromPoseM: c.horizontalDistanceFromPoseM, heightM: c.recipeHeightM, recipeHeightM: c.recipeHeightM, crownWidthM: c.recipeCrownWidthM,
    trunkDiameterM: c.recipeTrunkDiameterM, recipe: { heightM: c.recipeHeightM, crownWidthM: c.recipeCrownWidthM, trunkDiameterM: c.recipeTrunkDiameterM }, drawn: null,
    reasons: ['height-below-family-envelope'], presenceVerified: false }));
  return { targets, legacyCandidates: legacyList, candidateCounts: { known: known.length, belowEnvelope: candidates.length } };
}

// ------------------------------------------------------------------ phases
async function widePhase(pose) {
  await loadPose(pose);
  const before = await diagnostics();
  await page.evaluate(() => document.querySelector('#walk-surface').click()); // "Return to flight": launch to ~160 m above terrain
  await waitFor(() => !window.__atlas.travel.walking && !window.__atlas.travel.landing && (window.__atlas.travel.surface?.terrainClearance ?? 0) > 100, undefined, 120000);
  await page.waitForTimeout(600);
  const dl = await diagnostics();
  // Aim obliquely down toward a ground point 400 m ahead along the saved heading (horizontal component).
  const center = V(dl.center), cam = V(dl.camera.position).sub(center);
  const { up } = tangentFrame(cam.clone().normalize());
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion(...pose.heading));
  fwd.sub(up.clone().multiplyScalar(fwd.dot(up))).normalize();
  const groundR = V(before.walker.position).length();
  const aimPoint = V(before.walker.position).add(fwd.clone().multiplyScalar(pose.wideAimDistanceM ?? 400));
  aimPoint.normalize().multiplyScalar(groundR);
  await aimAt(aimPoint.toArray());
  await waitSettled({ minMs: 1500 });
  const aimed = await aimAt(aimPoint.toArray(), 2);
  await waitSettled({ minMs: 800 });
  const { rec, diag } = await shot('wide', { kind: 'wide', aimPointBodyLocalM: aimPoint.toArray(), aimResidual: aimed, altitudeM: dl.camera.clearanceM });
  pose.wide = { aimDistanceM: pose.wideAimDistanceM ?? 400, altitudeM: dl.camera.clearanceM, cameraPosition: diag.camera.position, heading: diag.camera.heading };
  report.phases.wide = { altitudeM: dl.camera.clearanceM, cameraPositionBodyLocal: cam.toArray(), aimResidual: aimed, savedWide: pose.wide };
  log(`wide: altitude ${dl.camera.clearanceM?.toFixed(1)} m`);
}

async function walkTo(target, wantM, { label }) {
  // Hold W/S (Shift when far) until the horizontal distance to the tree base is within tolerance.
  const tree = treeGroundPoint(target).toArray();
  const read = async () => { const d = await page.evaluate(() => window.__atlas.travel.walking); return d ? { dist: horizDist(d.position, tree), pos: d.position, grounded: d.grounded, waiting: d.waiting } : null; };
  await aimAt(midPoint(target), 2); // W/S move along the view heading, so face the tree first
  let stall = 0, last = (await read()).dist;
  for (let iter = 0; iter < 400; iter++) {
    const cur = await read(); if (!cur) throw new Error('walker vanished');
    const err = cur.dist - wantM;
    if (Math.abs(err) <= (wantM >= 30 ? 1.2 : .5)) return cur;
    const key = err > 0 ? 'w' : 's', run = Math.abs(err) > 20;
    if (run) await page.keyboard.down('Shift');
    await page.keyboard.down(key);
    const started = Date.now();
    let pos = cur;
    while (Date.now() - started < (Math.abs(err) > 3 ? 20000 : 400)) {
      pos = await read();
      const lead = (run ? 8 : 4) * .05;
      if ((key === 'w' && pos.dist - wantM <= lead) || (key === 's' && wantM - pos.dist <= lead)) break;
      await page.waitForTimeout(15);
    }
    await page.keyboard.up(key); if (run) await page.keyboard.up('Shift');
    await page.waitForTimeout(150);
    const now = await read();
    stall = Math.abs(now.dist - last) < .05 ? stall + 1 : 0; last = now.dist;
    if (stall >= 4) throw new Error(`${label}: walker stalled at ${now.dist.toFixed(1)} m (wanted ${wantM})`);
  }
  throw new Error(`${label}: could not reach ${wantM} m`);
}

/** Pick the approach bearing whose 8-300 m corridor crosses the fewest canonical tree cells
 * (presence is unknown, so every populated cell counts) and stays closest to the pose. */
function chooseBearing(target, poseGround, excludedDeg = []) {
  const tree = treeGroundPoint(target), { up, e1, e2 } = tangentFrame(tree.clone().normalize());
  const { face, n, x, y } = parseId(target.id), R = bodyRadius(), treeDir = tree.clone().normalize();
  const cells = [];
  for (let dx = -20; dx <= 20; dx++) for (let dy = -20; dy <= 20; dy++) {
    const ix = x + dx, iy = y + dy; if ((!dx && !dy) || ix < 0 || iy < 0 || ix >= n || iy >= n) continue;
    const c = populationCellAt(popSeed, face, n, ix, iy); if (!c) continue;
    const off = V(c.direction).sub(treeDir).multiplyScalar(R);
    cells.push([off.dot(e1), off.dot(e2)]);
  }
  const p0 = poseGround.clone().sub(tree); p0.sub(up.clone().multiplyScalar(p0.dot(up)));
  let best = null;
  for (let deg = 0; deg < 360; deg += 7.5) {
    if (excludedDeg.some(e => Math.min(Math.abs(e - deg), 360 - Math.abs(e - deg)) < 40)) continue;
    const th = deg * Math.PI / 180, ux = Math.cos(th), uy = Math.sin(th);
    let occ = 0;
    for (const [cx, cy] of cells) { const along = cx * ux + cy * uy, perp = Math.abs(-cx * uy + cy * ux); if (along > 4 && along < 305 && perp < (along < 60 ? 5 : 3.5)) occ += along < 60 ? 3 : 1; }
    const start = e1.clone().multiplyScalar(ux * 300).addScaledVector(e2, uy * 300);
    const cost = occ * 100 + start.distanceTo(p0);
    if (!best || cost < best.cost) best = { deg, occ, cost, u: e1.clone().multiplyScalar(ux).addScaledVector(e2, uy), startDistanceFromPoseM: start.distanceTo(p0) };
  }
  return best;
}
async function walkToPoint(bodyLocalPoint, { label, tolM = 3 }) {
  const read = async () => page.evaluate(() => window.__atlas.travel.walking?.position);
  let stall = 0, lastD = Infinity;
  for (let iter = 0; iter < 60; iter++) {
    let pos = await read(); if (!pos) throw new Error(`${label}: walker vanished`);
    const dist = horizDist(pos, bodyLocalPoint);
    if (dist <= tolM) return dist;
    stall = lastD - dist < .5 ? stall + 1 : 0; lastD = dist;
    if (stall >= 3) { if (dist < 30) return dist; throw new Error(`${label}: walker stalled ${dist.toFixed(0)} m from the start point`); }
    await aimAt(bodyLocalPoint, 2);
    await page.keyboard.down('Shift'); await page.keyboard.down('w');
    const budgetM = Math.min(dist, 70), started = Date.now();
    const startPos = V(pos);
    while (Date.now() - started < 15000) { pos = await read(); if (!pos || V(pos).distanceTo(startPos) >= budgetM - 1) break; await page.waitForTimeout(20); }
    await page.keyboard.up('w'); await page.keyboard.up('Shift');
    await page.waitForTimeout(150);
  }
  throw new Error(`${label}: start point not reached`);
}

async function targetPhase(pose, target) {
  const name = target.label, phase = report.phases[`target-${name}`] = { target, shots: [], date: [], notes: [], attempts: [] };
  const failed = [];
  for (let attempt = 0; attempt < 5; attempt++) {
    try { await targetAttempt(pose, target, phase, failed); return; }
    catch (error) {
      // A stalled walker means this bearing crosses water/steep ground: drop its shots and retry another bearing.
      if (!/stalled|could not reach|not reached|vanished/.test(error.message) || attempt === 4) throw error;
      phase.notes.push(`attempt ${attempt} (bearing ${failed.at(-1)} deg) abandoned: ${error.message}`);
      log(`${name}: bearing ${failed.at(-1)} deg abandoned (${error.message}); trying another`);
      report.shots = report.shots.filter(x => x.targetLabel !== name);
      Object.assign(phase, { shots: [], date: [] });
    }
  }
}
async function targetAttempt(pose, target, phase, failed) {
  const name = target.label;
  const tree = treeGroundPoint(target);
  await loadPose(pose);
  const poseGround = V((await diagnostics()).walker.position);
  const d0 = horizDist(poseGround.toArray(), tree.toArray());
  const bearing = chooseBearing(target, poseGround, failed);
  failed.push(bearing.deg); // removed again below on success
  phase.bearing = { deg: bearing.deg, weightedOccluderCells: bearing.occ, startDistanceFromPoseM: r3(bearing.startDistanceFromPoseM), poseToTreeM: r3(d0), failedBearingsDeg: failed.slice(0, -1) };
  const startPoint = tree.clone().addScaledVector(bearing.u, APPROACH_M[0]).normalize().multiplyScalar(poseGround.length());
  await walkToPoint(startPoint.toArray(), { label: `${name} walk-out` });
  await walkTo(target, APPROACH_M[0], { label: `${name} walk-out fine` });
  log(`${name}: at ${APPROACH_M[0]} m on bearing ${bearing.deg} deg (occluder score ${bearing.occ}, pose was ${d0.toFixed(0)} m from tree)`);
  const aimMid = rounds => aimAt(midPoint(target), rounds);
  await aimMid();
  let wasNear = false;
  const capture = async (stage, distM) => {
    const at = await walkTo(target, distM, { label: `${name} ${stage}` });
    await aimMid();
    await waitSettled({ minMs: 600 });
    const framing = await aimMid(2);
    await page.waitForTimeout(250);
    const d = await diagnostics();
    const eye = V(d.camera.position).sub(V(d.center)), dist3 = eye.distanceTo(tree);
    const exp = expectedRepresentation(target, dist3, wasNear); wasNear = exp.near;
    const fileName = `${stage}-${name}-d${String(distM).padStart(3, '0')}`;
    const inSamples = d.detailed?.samples?.find(s => s.id === target.id) ?? null;
    const { rec } = await shot(fileName, { kind: stage, targetLabel: name, targetId: target.id, speciesId: target.speciesId, requestedDistanceM: distM,
      horizontalDistanceM: r3(at.dist), eyeToBaseDistanceM: r3(dist3), eyeHeightAboveTreeBaseM: r3(eye.length() - tree.length()),
      expected: exp, framing: { ndc: framing.ndc, depthM: r3(framing.depthM), pitchDeg: r3(framing.pitch * 180 / Math.PI) },
      targetInDetailedSamples: !!inSamples, observedBatch: inSamples ? inSamples.batch : null }, target);
    phase.shots.push({ file: rec.file, marked: rec.markedFile, distM, stage, eyeToBaseDistanceM: rec.eyeToBaseDistanceM, expected: exp.representation, observedBatch: rec.observedBatch });
    log(`${name} ${stage} ${distM} m: ${exp.representation}${inSamples ? ` (sample batch ${inSamples.batch})` : ''}`);
    return d;
  };
  for (const distM of APPROACH_M) {
    await capture('approach', distM);
    if (distM === 30) { await datePhase(pose, target, phase); await aimMid(); }
  }
  for (const distM of RETREAT_M) await capture('retreat', distM);
  failed.pop();
}

/** Seeking while grounded clears the walker and hovers ~160 m up at the same place ("Land again when ready"),
 * so each seek is followed by the normal Land-and-walk button; the horizontal position is checked. */
async function datePhase(pose, target, phase) {
  const name = target.label, baseNs = BigInt(pose.dateNs), tree = treeGroundPoint(target);
  const snapshot = async label => {
    const d = await diagnostics();
    const fine = d.detailed?.samples?.find(s => s.id === target.id) ?? null;
    const hand = d.detailed?.handoffSamples?.find(s => s.id === target.id)?.far ?? null;
    const binding = bindingFor(d.treeSpecies, target.id);
    return { label, date: d.date, speciesFromCatalogue: binding?.speciesId ?? null, familyFromCatalogue: binding?.family ?? null, recipeHeightM: binding?.recipeHeightM ?? null,
      sample: fine && { batch: fine.batch, speciesId: fine.speciesId, heightM: fine.heightM, crownWidthM: fine.crownWidthM, reasons: fine.allometryReasons },
      groundHeightM: hand?.groundHeightM ?? null, canonicalHeightM: hand?.canonicalHeightM ?? null,
      positionBodyLocalM: (() => { const dir = cellDirection(target.id); return dir ? dir.multiplyScalar(bodyRadius() + target.groundHeightM).toArray() : null; })(),
      observerBodyLocalM: V(d.camera.position).sub(V(d.center)).toArray(), waterLevelM: d.terrain?.waterLevelM };
  };
  const seekTo = async ns => {
    const before = await diagnostics();
    const eyeBefore = V(before.camera.position).sub(V(before.center));
    await page.evaluate(t => window.__atlas.seek(t), ns.toString());
    await waitFor(t => window.__atlas.date.offsetNs === t && !window.__atlas.travel.walking && !window.__atlas.travel.landing, ns.toString(), 60000);
    await waitFor(() => window.__atlas.terrain?.tiles?.pending === 0 && window.__atlas.travel.surface?.terrainClearance != null, undefined, 120000);
    await page.waitForTimeout(800);
    await page.evaluate(() => document.querySelector('#walk-surface').click()); // Land and walk
    await waitFor(() => window.__atlas.travel.walking?.grounded, undefined, 120000);
    await waitSettled({ minMs: 900 });
    await aimAt(midPoint(target), 3);
    await page.waitForTimeout(250);
    const after = await diagnostics();
    const eyeAfter = V(after.camera.position).sub(V(after.center));
    return { horizontalShiftM: r3(horizDist(eyeAfter.toArray(), eyeBefore.toArray())), distToTreeM: r3(horizDist(eyeAfter.toArray(), tree.toArray())) };
  };
  phase.date.push(await snapshot('base'));
  for (const [label, delta] of DATE_STEPS) {
    const relanded = await seekTo(baseNs + delta);
    await shot(`date-${name}-d030-${label}`, { kind: 'date', targetLabel: name, targetId: target.id, dateLabel: label, requestedDistanceM: 30, relanded }, target);
    phase.date.push({ ...(await snapshot(label)), relanded });
  }
  const relanded = await seekTo(baseNs);
  await shot(`date-${name}-d030-return`, { kind: 'date', targetLabel: name, targetId: target.id, dateLabel: 'return', requestedDistanceM: 30, relanded }, target);
  const back = { ...(await snapshot('return')), relanded }; phase.date.push(back);
  const b0 = phase.date[0], same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const grounds = phase.date.map(d => d.groundHeightM).filter(v => v !== null);
  const bothSamples = b0.sample && back.sample;
  phase.dateRoundTrip = { idUnchanged: true, dateRestored: back.date === pose.dateNs,
    speciesUnchanged: b0.speciesFromCatalogue === back.speciesFromCatalogue && (!bothSamples || b0.sample.speciesId === back.sample.speciesId),
    speciesAtEachDate: phase.date.map(d => d.speciesFromCatalogue?.split('/').slice(-2).join('/') ?? null),
    // Position = canonical cell direction (a pure function of the id) + far-canopy ground height wherever the
    // bounded diagnostic sample exposes it; the sample is only a 8-per-batch window, so it may not list the target at every date.
    cellDirectionUnchanged: phase.date.every(d => same(d.positionBodyLocalM && V(d.positionBodyLocalM).normalize().toArray().map(r3), phase.date[0].positionBodyLocalM && V(phase.date[0].positionBodyLocalM).normalize().toArray().map(r3))),
    groundHeightsSeenM: grounds, groundHeightUnchanged: grounds.every(v => v === grounds[0]),
    sampleUnchanged: bothSamples ? same(b0.sample, back.sample) : 'n/a: target not in the bounded diagnostic sample at both dates',
    samplePresentAt: phase.date.map(d => !!d.sample),
    relandHorizontalShiftM: [1, 2, 3].map(i => phase.date[i].relanded?.horizontalShiftM) };
  log(`${name} date round trip: ${JSON.stringify(phase.dateRoundTrip)}`);
}

async function warmedTurnPhase(pose) {
  await loadPose(pose);
  const snap = async () => { const d = await diagnostics(); return { forest: d.forest, walker: d.walker, heading: d.camera.heading, position: d.camera.position, detailedVisible: d.detailed?.visible }; };
  await waitSettled({ minMs: 1500 });
  const warmed = await snap();
  await shot('warm-01-warmed', { kind: 'warmed' });
  await page.waitForTimeout(1500);
  const stationary = await snap();
  await shot('warm-02-stationary', { kind: 'stationary' });
  await drag(Math.PI / 2 / .003, 0); await page.waitForTimeout(1000); await waitSettled({ minMs: 500 });
  const turned = await snap();
  await shot('warm-03-turned-90', { kind: 'turned' });
  await drag(-Math.PI / 2 / .003, 0); await page.waitForTimeout(1000); await waitSettled({ minMs: 500 });
  const back = await snap();
  await shot('warm-04-turned-back', { kind: 'turned-back' });
  const dist = (a, b) => Math.hypot(...a.position.map((v, i) => v - b.position[i]));
  const dq = (a, b) => Math.hypot(...a.heading.map((v, i) => v - b.heading[i]));
  report.phases.warmedTurn = { warmed, stationary, turned, back,
    stationaryWrites: { matrix: stationary.forest.matrixWrites, color: stationary.forest.colorWrites, coverage: stationary.forest.coverageWrites, warmedMatrix: warmed.forest.matrixWrites },
    originVersions: [warmed, stationary, turned, back].map(s => s.forest.originVersion), positionDeltaM: r3(dist(turned, stationary)),
    headingDelta: { turned: r3(dq(turned, stationary)), back: r3(dq(back, stationary)) } };
}

// ------------------------------------------------------------------ main
let pose;
try {
  if (poseFile) {
    pose = JSON.parse(await readFile(poseFile, 'utf8'));
    report.poseWv = pose.wv; report.radiusM = pose.radiusM;
    log(`reusing pose ${poseFile}`);
  } else {
    const found = await searchPose();
    report.radiusM = found.diag.radiusM;
    const picks = pickTargets(found.diag, found);
    pose = { version: 'tree-families-visual-1', createdAt: new Date().toISOString(), base, seed, bodyId, wv: found.wv, dateNs: found.dateNs, walkPosition: found.walkPosition, heading: found.heading,
      radiusM: found.diag.radiusM, wideAimDistanceM: 400, targets: picks.targets, legacyCandidates: picks.legacyCandidates, legacyTargetIndex: 0, candidateCounts: picks.candidateCounts };
    await writeFile(`${out}/pose.json`, stringifySafe(pose));
    report.forestAtDiscovery = { forest: found.diag.forest, detailed: { allometry: found.diag.detailed.allometry, visible: found.diag.detailed.visible, families: found.diag.detailed.families }, canopy: found.diag.canopy };
    log(`pose saved: pine ${pose.targets.pine?.id}, oak ${pose.targets.oak?.id}, small ${pose.legacyCandidates[0]?.id}`);
  }
  report.pose = pose;
  report.legacyTargetIndex = pose.legacyTargetIndex ?? 0;
  const legacyTarget = pose.legacyCandidates?.[report.legacyTargetIndex] ?? null;
  const targets = [pose.targets.pine, pose.targets.oak, legacyTarget].filter(Boolean);
  if (!legacyTarget) report.warnings.push('no legacy (below-envelope) target candidate available');

  // ATLAS_PHASES (comma list of wide, pine, oak, small, turn) restricts a debugging run; default is everything.
  const only = process.env.ATLAS_PHASES ? new Set(process.env.ATLAS_PHASES.split(',')) : null;
  const want = k => !only || only.has(k);
  if (want('wide')) { await widePhase(pose); await save(); }
  for (const t of targets) { if (want(t.label.replace(/\d+$/, ''))) { await targetPhase(pose, t); await save(); } }
  if (want('turn')) await warmedTurnPhase(pose);
  // Final whole-population/allometry/asset/far-atlas state for before/after comparison.
  const fin = await diagnostics();
  report.final = { forestAssets: fin.forestAssets, detailedTrees: fin.detailed && { allometry: fin.detailed.allometry, visible: fin.detailed.visible, families: fin.detailed.families, farRepresentation: fin.detailed.farRepresentation, farAtlas: fin.detailed.farAtlas, presentationKey: fin.detailed.presentationKey },
    canopy: fin.canopy, forest: fin.forest,
    farAtlasFull: await page.evaluate(() => window.__atlas.terrain?.tiles?.forest?.detailedTrees?.farAtlas ?? null),
    presentationCensus: await page.evaluate(() => { try { return window.__atlas.forestPresentationCensus(); } catch (e) { return String(e); } }) };
  report.renderer = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'); const e = gl?.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unavailable'; });
  await writeFile(`${out}/pose.json`, stringifySafe(pose)); // includes wide pose
  report.ok = errors.length === 0;
  await save();
  log(`done ok=${report.ok} shots=${report.shots.length} errors=${errors.length}`);
} catch (error) {
  report.ok = false; report.failure = String(error?.stack ?? error);
  if (pose) await writeFile(`${out}/pose.json`, stringifySafe(pose)).catch(() => {});
  await page?.screenshot({ path: `${out}/failure.png` }).catch(() => {});
  await save();
  console.error(error);
  process.exitCode = 1;
} finally {
  await page?.keyboard.up('w').catch(() => {}); await page?.keyboard.up('s').catch(() => {}); await page?.keyboard.up('Shift').catch(() => {});
  await browser.close();
}
