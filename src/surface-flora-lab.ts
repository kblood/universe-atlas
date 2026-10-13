import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createFloraReplay, DEFAULT_FLORA_REPLAY, floraGeometrySeed, floraReplayFromUrl, floraReplayUrl,
  validateFloraReplay, type FloraReplay} from './surface-flora-replay.ts';
import {dateYears, yearsToDate} from './world-time.ts';
import {compatibilityNoticeFromUrl} from './time-nav.ts';
import { biomeClassifier, BIOME_VERSION } from './surface-biomes.ts';
import { terrainSampler, TERRAIN_VERSION } from './terrain.ts';
import {
  buildFloraGeometryData,
  floraAt,
  floraGeometryToBufferGeometry,
  FLORA_KIND_NAMES,
  FLORA_LOD_COUNT,
  toMyr,
  type FloraBiomeSample,
  type FloraKind,
  type FloraStage,
  type FloraInstance,
} from './flora-field.ts';
import { BIOSPHERE_VERSION } from './biosphere-model.ts';
import './surface-flora-lab.css';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const profile = $<HTMLSelectElement>('profile');
const seed = $<HTMLInputElement>('seed');
const sea = $<HTMLInputElement>('sea');
const slope = $<HTMLInputElement>('slope');
const stage = $<HTMLSelectElement>('stage');
const age = $<HTMLInputElement>('age');
const kind = $<HTMLSelectElement>('kind');
const lod = $<HTMLSelectElement>('lod');
const mode = $<HTMLSelectElement>('mode');
const candidate = $<HTMLSelectElement>('candidate');
const previewSource = $<HTMLSelectElement>('preview-source');
const map = $<HTMLCanvasElement>('map');
const context = map.getContext('2d')!;
const MAP_WIDTH = 36;
const MAP_HEIGHT = 18;
const mapColors: Record<string, string> = {
  Ocean: '#286f88',
  'Coastal sand': '#baa16a',
  'Temperate ground': '#648348',
  'Dry upland': '#9b8959',
  'Mountain meadow': '#76966a',
  'Rock escarpment': '#77776c',
  'Alpine / polar snow': '#d1ded8',
  'Ice field': '#bbc9d0',
  'Volcanic rock': '#724b43',
  'Regolith plain': '#887f68',
};
const profiles = {
  temperate: { type: 'Terrestrial', temperatureK: 288, water: 0.72 },
  arid: { type: 'Terrestrial', temperatureK: 310, water: 0.08 },
  ice: { type: 'Ice world', temperatureK: 225, water: 0.82 },
  volcanic: { type: 'Volcanic world', temperatureK: 480, water: 0 },
} as const;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#09130e');
const camera = new THREE.PerspectiveCamera(36, 320 / 220, 0.1, 80);
camera.position.set(3.2, 2.4, 4.2);
camera.lookAt(0, 0.65, 0);
const renderer = new THREE.WebGLRenderer({
  canvas: $<HTMLCanvasElement>('specimen'),
  antialias: true,
  alpha: false,
  powerPreference: 'low-power',
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(320, 220, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
scene.add(new THREE.HemisphereLight('#d7e8da', '#28372d', 2.2));
const sun = new THREE.DirectionalLight('#fff0d2', 3);
sun.position.set(-3, 5, 4);
scene.add(sun);
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.addEventListener('change', () => renderer.render(scene, camera));
let specimens: THREE.Mesh[] = [];
let replayContext: ReturnType<typeof createFloraReplay> | null = null;
type ReplaySite = ReturnType<ReturnType<typeof createFloraReplay>['inspect']>;
let replaySites: ReplaySite[] = [];
let selectedInstance: FloraInstance = {present: false};
let geometrySeed = 0x41544c;
let generationId = 0;
let mapPoints: {x: number; y: number; site: ReplaySite}[] = [];
const escape = (value: unknown) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]!));

function disposeSpecimens() {
  for (const specimen of specimens) {
    scene.remove(specimen);
    specimen.geometry.dispose();
    (specimen.material as THREE.Material).dispose();
  }
  specimens = [];
}

function updateGeometry() {
  disposeSpecimens();
  const sample = mode.value === 'atlas' && previewSource.value === 'sample';
  kind.disabled = sample;
  if (sample && (!selectedInstance.present || selectedInstance.kind === 'tree')) {
    $('geometry').textContent = selectedInstance.present
      ? 'This tree candidate belongs to Atlas’ continuous forest. Choose a ground-cover cell to inspect the flora-field LODs.'
      : 'No living flora at this candidate and date. Select another cell, or choose a kind template experiment.';
    renderer.render(scene, camera);
    return;
  }
  const selectedKind = sample && selectedInstance.present ? selectedInstance.kind : kind.value as FloraKind;
  if (sample) kind.value = selectedKind;
  geometrySeed = replayContext && mode.value === 'atlas' ? floraGeometrySeed(replayContext.body.seed, selectedKind) : 0x41544c;
  const levels = lod.value === 'all' ? [0, 1, 2] : [Number(lod.value)];
  const data = levels.map(level => buildFloraGeometryData(selectedKind, level, geometrySeed));
  const geometries = data.map(floraGeometryToBufferGeometry);
  const plantScale = sample && selectedInstance.present ? selectedInstance.scale : 1;
  let width = 0;
  for (const geometry of geometries) {
    geometry.computeBoundingBox();
    width = Math.max(width, geometry.boundingBox!.getSize(new THREE.Vector3()).x * plantScale);
  }
  // One common scale and yaw for the whole LOD comparison.
  for (let i = 0; i < data.length; i++) {
    const geometry = geometries[i];
    const material = new THREE.MeshLambertMaterial({vertexColors: true, side: THREE.FrontSide});
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = sample && selectedInstance.present ? selectedInstance.rotationY : 0.45;
    mesh.scale.setScalar(plantScale);
    mesh.position.x = (i - (data.length - 1) / 2) * Math.max(width * 1.3, .35);
    specimens.push(mesh);
    scene.add(mesh);
  }
  const bounds = new THREE.Box3();
  for (const mesh of specimens) bounds.expandByObject(mesh);
  const center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
  const distance = Math.max(size.y, size.x / camera.aspect, size.z, .25) / Math.tan(camera.fov * Math.PI / 360) * .7;
  camera.far = Math.max(80, distance * 20);
  camera.near = Math.max(.001, distance / 1000);
  camera.updateProjectionMatrix();
  camera.position.copy(center).add(new THREE.Vector3(.25, .2, 1).normalize().multiplyScalar(distance));
  orbit.target.copy(center);
  orbit.update();
  renderer.render(scene, camera);
  const triangleCounts = Array.from({ length: FLORA_LOD_COUNT }, (_, level) =>
    buildFloraGeometryData(selectedKind, level, geometrySeed).triangleCount,
  );
  const geometryBytes = data.reduce((total, d) => total + d.positions.byteLength + d.normals.byteLength + d.uvs.byteLength +
    d.colors.byteLength + d.windStiffness.byteLength + d.indices.byteLength, 0);
  $('geometry').innerHTML =
    `<p>Selected: <b>${selectedKind} · ${lod.value === 'all' ? 'L0 → L1 → L2' : 'LOD ' + lod.value}</b></p>` +
    `<p>Geometry seed: ${geometrySeed} · scale ${plantScale.toFixed(3)}</p>` +
    `<p>Triangles by LOD: ${triangleCounts.map((count, level) => `L${level} ${count.toLocaleString()}`).join(' · ')}</p>` +
    `<p>Displayed geometry: ${data.reduce((sum, d) => sum + d.positions.length / 3, 0)} vertices · ${geometryBytes.toLocaleString('en-US')} bytes</p>`;
}

function createBody() {
  const selected = profiles[profile.value as keyof typeof profiles];
  return {
    id: `lab:${seed.value}`,
    name: 'Lab sample',
    kind: 'planet' as const,
    type: selected.type,
    parentId: 'lab-star',
    massKg: 5.972e24,
    radiusM: 6_371_000,
    temperatureK: selected.temperatureK,
    color: '#779977',
    orbit: null,
    seed: seed.value || 'ATLAS-FLORA-01',
    water: selected.water,
    rings: false,
  };
}

function createGate() {
  const selectedStage = stage.value as FloraStage;
  const availableKinds = selectedStage === 'microbial'
    ? ['grass'] as const
    : selectedStage === 'complex' ? FLORA_KIND_NAMES : [];
  return { stage: selectedStage, availableKinds };
}

function updateSurface() {
  const body = createBody();
  const waterLevel = Number(sea.value) || 0;
  const siteSlope = Math.max(0, Math.min(80, Number(slope.value) || 0));
  const classify = biomeClassifier(body, waterLevel);
  const terrain = terrainSampler(body, [], 3500, false, waterLevel);
  const gate = createGate();
  const biomeCounts = new Map<string, number>();
  const floraCounts = new Map<string, number>();
  let presentCount = 0;

  context.clearRect(0, 0, map.width, map.height);
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const longitude = (x + 0.5) / MAP_WIDTH * Math.PI * 2 - Math.PI;
      const latitude = Math.PI / 2 - (y + 0.5) / MAP_HEIGHT * Math.PI;
      const direction: [number, number, number] = [
        Math.cos(latitude) * Math.cos(longitude),
        Math.sin(latitude),
        Math.cos(latitude) * Math.sin(longitude),
      ];
      const surface = terrain(direction);
      const biome = classify(
        direction,
        surface.elevationM,
        Math.cos(siteSlope * Math.PI / 180),
      ) as unknown as FloraBiomeSample & { name: string };
      biomeCounts.set(biome.name, (biomeCounts.get(biome.name) ?? 0) + 1);

      const instance = floraAt(body.seed, body.id, direction, biome, gate, toMyr(Number(age.value) || 0));
      if (instance.present) {
        presentCount++;
        floraCounts.set(instance.kind, (floraCounts.get(instance.kind) ?? 0) + 1);
      }

      const cellWidth = map.width / MAP_WIDTH;
      const cellHeight = map.height / MAP_HEIGHT;
      context.fillStyle = mapColors[biome.name] ?? '#60705f';
      context.fillRect(x * cellWidth, y * cellHeight, cellWidth + 1, cellHeight + 1);
      if (instance.present) {
        context.fillStyle = instance.kind === 'tree' ? '#fff27b'
          : instance.kind === 'shrub' ? '#e9ffa2'
            : instance.kind === 'flower' ? '#ffb4de' : '#d9f0b0';
        context.beginPath();
        context.arc((x + 0.5) * cellWidth, (y + 0.5) * cellHeight,
          instance.kind === 'tree' ? 2.2 : 1.4, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  $('versions').innerHTML = [
    ['Terrain', TERRAIN_VERSION],
    ['Biome classifier', BIOME_VERSION],
    ['Biosphere gate', BIOSPHERE_VERSION],
    ['Flora recipe / geometry', `flora-field · ${FLORA_LOD_COUNT} LODs`],
  ].map(([label, version]) => `<div><span>${label}</span><code>${version}</code></div>`).join('');
  $('classes').innerHTML = [...biomeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `<div><span>${name}</span><b>${count} cells · ${(count * 100 / (MAP_WIDTH * MAP_HEIGHT)).toFixed(1)}%</b></div>`)
    .join('') || '<div>No sampled terrain cells</div>';
  $('flora').innerHTML = `<div><span>Present candidates</span><b>${presentCount} / ${MAP_WIDTH * MAP_HEIGHT}</b></div>` +
    [...floraCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([floraKind, count]) => `<div><span>${floraKind}</span><b>${count}</b></div>`).join('');
  $('flora-note').textContent =
    `Gate: ${gate.stage}; ${gate.availableKinds.length ? gate.availableKinds.join(', ') : 'no vegetation kinds'}. ` +
    'Placement shares the production presence, kind and instance-seed recipe; sphere sampling is a lab grid, not the renderer’s streamed candidate lattice.';
  $('status').textContent = `${MAP_WIDTH * MAP_HEIGHT} samples · ${presentCount} flora`;
}

function readReplay(): FloraReplay {
  return validateFloraReplay({seed: $<HTMLInputElement>('universe-seed').value,
    body: $<HTMLInputElement>('body-address').value,
    dateNs: yearsToDate($<HTMLInputElement>('date-years').value).toString(),
    direction: $<HTMLInputElement>('direction').value.split(',').map(Number),
    cellSizeM: Number($<HTMLSelectElement>('cell-size').value)});
}
function fillReplay(replay: FloraReplay) {
  $<HTMLInputElement>('universe-seed').value = replay.seed;
  $<HTMLInputElement>('body-address').value = replay.body;
  $<HTMLInputElement>('date-years').value = dateYears(BigInt(replay.dateNs));
  $<HTMLInputElement>('direction').value = replay.direction.join(',');
  $<HTMLSelectElement>('cell-size').value = String(replay.cellSizeM);
}
function updateMode() {
  $('replay-controls').hidden = mode.value !== 'atlas';
  $('experiment-controls').hidden = mode.value === 'atlas';
  $('copy-replay').hidden = $('open-atlas').hidden = mode.value !== 'atlas';
  candidate.disabled = mode.value !== 'atlas';
  previewSource.disabled = mode.value !== 'atlas';
  map.setAttribute('aria-label', mode.value === 'atlas' ? 'Local canonical surface biome and flora candidate map' : 'Equirectangular surface biome and flora sample map');
  $('map-note').textContent = mode.value === 'atlas'
    ? 'A local patch of real canonical candidates (bounded to 80 cells). Click a cell to inspect it. Slope, date, sea and living species come from Atlas; the patch shows presence before visibility/culling budgets.'
    : 'Synthetic global preview. Stage and slope are experiment controls; these sampled directions are not Atlas’ streamed candidate lattice.';
}
function drawReplayMap() {
  if (!replayContext) return;
  const {replay, body} = replayContext;
  const up = new THREE.Vector3(...replay.direction), ref = Math.abs(up.y) > .92 ? new THREE.Vector3(1,0,0) : new THREE.Vector3(0,1,0);
  const right = new THREE.Vector3().crossVectors(ref,up).normalize(), forward = new THREE.Vector3().crossVectors(up,right).normalize();
  const range = replay.cellSizeM * 4.5, factor = Math.min(map.width, map.height) / (2 * range);
  context.fillStyle = '#08110d';
  context.fillRect(0, 0, map.width, map.height);
  mapPoints = [];
  const delta = new THREE.Vector3();
  for (const site of replaySites) {
    delta.set(...site.cell.direction).sub(up).multiplyScalar(body.radiusM);
    const x = map.width / 2 + delta.dot(right) * factor, y = map.height / 2 - delta.dot(forward) * factor;
    const radius = replay.cellSizeM * factor * .42;
    mapPoints.push({x, y, site});
    context.fillStyle = site.biome ? mapColors[site.biome.name] ?? '#60705f' : '#44383a';
    context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2); context.fill();
    if (site.instance.present) {
      context.fillStyle = site.instance.kind === 'tree' ? '#fff27b' : site.instance.kind === 'flower' ? '#ffb4de' : '#e9ffa2';
      context.beginPath(); context.arc(x, y, radius * .28, 0, Math.PI * 2); context.fill();
    }
    if (site.cell.id === candidate.value) {
      context.strokeStyle = '#fff'; context.lineWidth = 3;
      context.beginPath(); context.arc(x, y, radius + 3, 0, Math.PI * 2); context.stroke();
    }
  }
  context.fillStyle = '#ccd9cf'; context.font = '16px system-ui';
  context.fillText(`Local tangent patch · ${range * 2} m across · ${replay.cellSizeM} m grid`, 18, 27);
}
function selectReplaySite() {
  const site = replaySites.find(s => s.cell.id === candidate.value);
  if (!site || !replayContext) return;
  selectedInstance = site.instance;
  const instance = site.instance, ctx = replayContext;
  $('selected-site').innerHTML = [
    ['Body', ctx.body.name], ['Life stage', ctx.bio.stage], ['Planet age', `${ctx.ageMyr} Myr`],
    ['Direction', site.cell.direction.map(v => v.toPrecision(8)).join(', ')],
    ['Ground', site.heightM === null ? 'No surface' : `${site.heightM.toFixed(2)} m`],
    ['Biome / slope', site.biome ? `${site.biome.name} · ${site.biome.slopeDeg.toFixed(2)}°` : 'Unavailable'],
    ['Flora', instance.present ? instance.kind : 'Absent'],
    ['Instance seed', instance.present ? instance.instanceSeed : '—'],
    ['Render sea bucket', `${ctx.waterLevelM} m`],
  ].map(([label, value]) => `<div><span>${escape(label)}</span><b>${escape(value)}</b></div>`).join('');
  if (instance.present) kind.value = instance.kind;
  // Share the selected cell, not an earlier camera centre. Preserve exact lattice direction.
  const selectedReplay = {...ctx.replay, direction: site.cell.direction};
  fillReplay(selectedReplay);
  $('open-atlas').setAttribute('href', floraReplayUrl(selectedReplay, './'));
  history.replaceState(null, '', floraReplayUrl(selectedReplay));
  drawReplayMap();
  updateGeometry();
}
async function updateAtlas(id: number) {
  replayContext = createFloraReplay(readReplay());
  const ctx = replayContext;
  replaySites = [];
  candidate.replaceChildren();
  for (const cell of ctx.candidates) {
    if (id !== generationId) return;
    replaySites.push(ctx.inspect(cell.direction));
    if (replaySites.length % 8 === 0) {
      $('status').textContent = `Inspecting ${replaySites.length} / ${ctx.candidates.length} cells…`;
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }
  }
  if (id !== generationId) return;
  for (const site of replaySites) {
    const option = document.createElement('option'); option.value = site.cell.id;
    option.textContent = `${site.cell.id} · ${site.instance.present ? site.instance.kind : 'absent'} · ${site.biome?.name ?? ctx.snapshot.state.stage}`;
    candidate.append(option);
  }
  candidate.value = (replaySites.find(s => s.instance.present && s.instance.kind !== 'tree') ?? replaySites[0])?.cell.id ?? '';
  const biomeCounts = new Map<string, number>(), floraCounts = new Map<string, number>();
  for (const site of replaySites) {
    const name = site.biome?.name ?? ctx.snapshot.state.stage;
    biomeCounts.set(name, (biomeCounts.get(name) ?? 0) + 1);
    if (site.instance.present) floraCounts.set(site.instance.kind, (floraCounts.get(site.instance.kind) ?? 0) + 1);
  }
  $('classes').innerHTML = [...biomeCounts].map(([name, count]) => `<div><span>${escape(name)}</span><b>${count} candidates</b></div>`).join('');
  $('flora').innerHTML = [...floraCounts].map(([name, count]) => `<div><span>${name}</span><b>${count}</b></div>`).join('') || '<div>No living flora in this patch</div>';
  $('flora-note').textContent = `Dated gate: ${ctx.bio.stage}; living kinds: ${ctx.gate.availableKinds.join(', ') || 'none'}. ` +
    'Recipes use Atlas’ Float32 habitat inputs and canonical directions. Geometry uses its shared body/kind seed; trees belong to the continuous forest.';
  $('status').textContent = `${replaySites.length} canonical cells · ${[...floraCounts.values()].reduce((a,b) => a+b,0)} present`;
  if (replaySites.length) selectReplaySite();
  else { selectedInstance = {present: false}; updateGeometry(); }
}
async function generate() {
  const id = ++generationId;
  $<HTMLButtonElement>('generate').disabled = true;
  updateMode();
  $('status').textContent = 'Resolving planet…';
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  if (id !== generationId) return;
  try {
    if (mode.value === 'atlas') await updateAtlas(id);
    else {
      replayContext = null; replaySites = []; mapPoints = [];
      candidate.replaceChildren(); $('selected-site').textContent = 'Synthetic experiment';
      updateSurface(); updateGeometry();
    }
    if (id !== generationId) return;
    $('versions').innerHTML = [
      ['Terrain', TERRAIN_VERSION], ['Biome classifier', BIOME_VERSION],
      ['Biosphere gate', BIOSPHERE_VERSION], ['Flora recipe / geometry', `flora-field · ${FLORA_LOD_COUNT} LODs`],
    ].map(([label, version]) => `<div><span>${label}</span><code>${version}</code></div>`).join('');
  } catch (error) {
    $('status').textContent = error instanceof Error ? error.message : String(error);
    // Invalid input must not leave an old planet's specimen presented as a new replay.
    replayContext = null; replaySites = []; mapPoints = [];
    candidate.replaceChildren(); selectedInstance = {present: false};
    $('selected-site').textContent = 'Replay unavailable'; $('classes').replaceChildren(); $('flora').replaceChildren();
    $('flora-note').textContent = ''; context.clearRect(0, 0, map.width, map.height);
    disposeSpecimens(); renderer.render(scene, camera);
  } finally {
    if (id === generationId) $<HTMLButtonElement>('generate').disabled = false;
  }
}

$('generate').addEventListener('click', generate);
kind.addEventListener('change', updateGeometry);
lod.addEventListener('change', updateGeometry);
previewSource.addEventListener('change', updateGeometry);
candidate.addEventListener('change', selectReplaySite);
mode.addEventListener('change', generate);
map.addEventListener('click', event => {
  if (!mapPoints.length || mode.value !== 'atlas') return;
  const rect = map.getBoundingClientRect(), x = (event.clientX - rect.left) * map.width / rect.width,
    y = (event.clientY - rect.top) * map.height / rect.height;
  const hit = [...mapPoints].sort((a,b) => Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
  candidate.value = hit.site.cell.id; selectReplaySite();
});
$('import-replay').addEventListener('click', () => {
  try {
    const link = $<HTMLInputElement>('import-link').value;
    if (!link.trim()) throw new Error('Paste an Atlas planet bookmark or a lab replay link');
    const q = new URL(link, location.href).searchParams;
    if (!q.has('body')) throw new Error('The link must include a planet or moon body');
    fillReplay(floraReplayFromUrl(link)); mode.value = 'atlas';
    $('replay-status').textContent = compatibilityNoticeFromUrl(q) ?? 'Link imported';
    void generate();
  } catch (error) { $('replay-status').textContent = error instanceof Error ? error.message : String(error); }
});
$('copy-replay').addEventListener('click', async () => {
  try {
    const url = new URL(floraReplayUrl(readReplay()), location.href).href;
    await navigator.clipboard.writeText(url); $('replay-status').textContent = 'Replay link copied';
  } catch (error) { $('replay-status').textContent = `Could not copy replay: ${error instanceof Error ? error.message : String(error)}`; }
});
try {
  const q = new URLSearchParams(location.search);
  fillReplay(q.has('body') ? floraReplayFromUrl(location.href) : DEFAULT_FLORA_REPLAY);
  mode.value = q.get('mode') === 'experiment' ? 'experiment' : 'atlas';
  $('replay-status').textContent = q.has('body') ? compatibilityNoticeFromUrl(q) ?? '' : '';
  void generate();
} catch (error) { $('status').textContent = error instanceof Error ? error.message : String(error); }
