import * as THREE from 'three';
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
let specimen: THREE.Mesh | null = null;

function updateGeometry() {
  const selectedKind = kind.value as FloraKind;
  const selectedLod = Number(lod.value);
  const data = buildFloraGeometryData(selectedKind, selectedLod, 0x41544c);
  if (specimen) {
    scene.remove(specimen);
    specimen.geometry.dispose();
    (specimen.material as THREE.Material).dispose();
  }
  const geometry = floraGeometryToBufferGeometry(data);
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.9,
    flatShading: true,
  });
  specimen = new THREE.Mesh(geometry, material);
  specimen.rotation.y = 0.45;
  scene.add(specimen);
  renderer.render(scene, camera);

  const triangleCounts = Array.from({ length: FLORA_LOD_COUNT }, (_, level) =>
    buildFloraGeometryData(selectedKind, level, 0x41544c).triangleCount,
  );
  const geometryBytes =
    data.positions.byteLength + data.normals.byteLength + data.uvs.byteLength +
    data.colors.byteLength + data.windStiffness.byteLength + data.indices.byteLength;
  $('geometry').innerHTML =
    `<p>Selected: <b>${selectedKind} · LOD ${selectedLod}</b></p>` +
    `<p>Triangles by LOD: ${triangleCounts.map((count, level) => `L${level} ${count.toLocaleString()}`).join(' · ')}</p>` +
    `<p>Geometry: ${data.positions.length / 3} vertices · ${geometryBytes.toLocaleString('en-US')} bytes</p>`;
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

function generate() {
  try {
    updateSurface();
  } catch (error) {
    $('status').textContent = error instanceof Error ? error.message : String(error);
  }
}

$('generate').addEventListener('click', generate);
kind.addEventListener('change', updateGeometry);
lod.addEventListener('change', updateGeometry);
updateGeometry();
generate();
