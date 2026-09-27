import * as THREE from 'three';
import { cloudCoverAt, createCloudShell, type CloudParams } from '../src/planet-clouds.ts';
import { VolumetricClouds } from '../src/volumetric-clouds.ts';

const params: CloudParams = { hasAtmosphere: true, hasOcean: true, temperatureK: 285, radiusM: 6_200_000, spinPeriodS: 86_400 };
const seed = 'LETHRA-CLOUD-LAB';
const address = 'G001/C2128,0,1/0/planet/1';
const radius = params.radiusM;
const view = document.querySelector<HTMLDivElement>('#view')!;
const stamp = document.querySelector<HTMLSpanElement>('#stamp')!;
const status = document.querySelector<HTMLDivElement>('#status')!;
const mode = document.querySelector<HTMLSelectElement>('#mode')!;
const viewpoint = document.querySelector<HTMLSelectElement>('#viewpoint')!;
const coverage = document.querySelector<HTMLInputElement>('#coverage')!;
const coverageValue = document.querySelector<HTMLOutputElement>('#coverageValue')!;
const date = document.querySelector<HTMLInputElement>('#date')!;

const renderer = new THREE.WebGLRenderer({ antialias: false, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.setSize(view.clientWidth, view.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
view.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#7693ad');
const camera = new THREE.PerspectiveCamera(60, view.clientWidth / view.clientHeight, .1, 1e8);
const planet = new THREE.Group();
planet.scale.setScalar(radius);
scene.add(planet);
const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 160, 96), new THREE.MeshStandardMaterial({ color: '#55705c', roughness: .95, metalness: 0 }));
globe.name = 'cloud lab terrain globe';
planet.add(globe);
planet.add(new THREE.AmbientLight(0xffffff, .48));
const sunLight = new THREE.DirectionalLight(0xffffff, 3.0);
sunLight.position.set(1, .32, .18);
planet.add(sunLight);

const shell = createCloudShell(params, 384, 192);
planet.add(shell.mesh);
const volume = new VolumetricClouds(params, planet);
const sunDirection = new THREE.Vector3(1, .32, .18).normalize();

function setCamera() {
  const point = viewpoint.value;
  let pos: THREE.Vector3, target: THREE.Vector3;
  if (point === 'orbit') {
    pos = new THREE.Vector3(.18, .2, 2.55).multiplyScalar(radius);
    target = new THREE.Vector3(0, 0, 0);
  } else if (point === 'nightside') {
    pos = new THREE.Vector3(-.18, .1, -2.55).multiplyScalar(radius);
    target = new THREE.Vector3(0, 0, 0);
  } else if (point === 'flight') {
    pos = new THREE.Vector3(0, 0, radius + 10_500);
    // Skim toward the horizon through the upper/low deck boundary, rather
    // than pointing the whole frame straight through one cloud column.
    target = new THREE.Vector3(120_000, 0, radius + 4_500);
  } else if (point === 'inside') {
    pos = new THREE.Vector3(0, 0, radius + 3_500);
    target = new THREE.Vector3(80_000, 0, radius + 1_500);
  } else {
    pos = new THREE.Vector3(0, radius + 8, 0);
    target = new THREE.Vector3(1_200, radius + 3_000, 7_000);
  }
  camera.position.copy(pos);
  camera.up.copy(point === 'orbit' || point === 'nightside' ? new THREE.Vector3(0, 1, 0) : pos.clone().normalize());
  camera.lookAt(target);
  camera.updateMatrixWorld(true);
}

let lastTime = -1;
function update() {
  const t = BigInt(Math.round(Number(date.value) * 1e9));
  if (lastTime !== Number(date.value)) {
    shell.update(seed, address, t);
    volume.update(seed, address, t, sunDirection);
    lastTime = Number(date.value);
  }
  volume.coverageScale = Number(coverage.value);
  coverageValue.value = Number(coverage.value).toFixed(2);
  shell.mesh.visible = mode.value === 'shell';
  volume.enabled = mode.value === 'volume';
  stamp.textContent = `${mode.options[mode.selectedIndex].text} · ${viewpoint.options[viewpoint.selectedIndex].text}`;
  setCamera();
  if (mode.value === 'volume') volume.render(renderer, scene, camera);
  else renderer.render(scene, camera);
}

mode.addEventListener('change', () => { status.textContent = JSON.stringify(volume.diagnostics(), null, 2); });
viewpoint.addEventListener('change', setCamera);
coverage.addEventListener('input', () => { volume.coverageScale = Number(coverage.value); });
date.addEventListener('input', () => { lastTime = -1; });
document.querySelector<HTMLButtonElement>('#replay')!.addEventListener('click', () => { lastTime = -1; });
new ResizeObserver(() => {
  renderer.setSize(view.clientWidth, view.clientHeight);
  camera.aspect = view.clientWidth / view.clientHeight;
  camera.updateProjectionMatrix();
}).observe(view);

const sample = cloudCoverAt(seed, address, params, [0, 0, 1], BigInt(Number(date.value) * 1e9));
status.textContent = JSON.stringify({ params, fieldSample: sample, diagnostics: volume.diagnostics(), webgl2: renderer.capabilities.isWebGL2, renderer: renderer.getContext().getParameter(renderer.getContext().RENDERER) }, null, 2);
(window as any).__cloudLab = { renderer, scene, camera, planet, shell, volume, params, seed, address, status };
renderer.setAnimationLoop(update);
