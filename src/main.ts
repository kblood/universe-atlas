import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { AtlasVR, type VRMenu } from "./vr.ts";
import {
  LY_PER_MPC,
  systemBoundary,
  automaticSpeed,
  nearestBody,
  surfaceClearance,
} from "./travel.ts";
import { PlanetRenderer } from './planet-renderer.ts';
import { NavigationMarkers } from './navigation-markers.ts';
import { freeLook, orbitStep } from './planet-flight.ts';
import { GalaxySpace } from "./galaxy-space.ts";
import { ViewBlend } from "./view-transition.ts";
import { systemLayout, type SystemScale } from "./system-layout.ts";
import { ELEVATION_RANGE_M, terrainSampler, type planetSurface } from "./terrain.ts";
import {
  galaxies,
  overview,
  system,
  refByAddress,
  bodyPosition,
  orbitPosition,
  VERSION,
  LY,
  AU,
  type Galaxy,
  type V3,
  type SystemRef,
  type StarSystem,
  type Body,
} from "./catalog.ts";
import "./style.css";

const $ = (id: string) => document.getElementById(id)!;
const esc = (s: unknown) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const fmt = (v: number, d = 1) =>
  v.toLocaleString("en-US", { maximumFractionDigits: d });
const vec = (p: V3) => new THREE.Vector3(...p);
const facts = (entries: [string, string][]) =>
  `<dl class="facts">${entries.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join("")}</dl>`;
const distance = (m: number) =>
  m >= AU * 0.1 ? fmt(m / AU, 3) + " AU" : fmt(m / 1000, 0) + " km";
const item = (
  id: string,
  title: string,
  detail: string,
  color = "#90cfd0",
  active = false,
) =>
  `<button class="item ${active ? "active" : ""}" data-select="${esc(id)}"><span class="dot" style="--dot:${color}"></span><span><strong>${esc(title)}</strong><small>${esc(detail)}</small></span><span class="arrow">↗</span></button>`;
type Level = "universe" | "galaxy" | "sector" | "system" | "body";
type State = {
  level: Level;
  galaxy?: Galaxy;
  coords?: V3;
  ref?: SystemRef;
  sys?: StarSystem;
  body?: Body;
};
let seed =
  new URLSearchParams(location.search).get("seed") ||
  readStored("atlas-seed") ||
  "LETHRA-001";
seed = seed.slice(0, 80);
let catalogue = galaxies(seed),
  state: State = { level: "universe" },
  selected: string | null = null,
  region: V3 | null = null;
let sectorData: {
  refs: SystemRef[];
  total: number;
  coords: V3;
  aggregated: boolean;
} | null = null;
let epoch = 0,
  playing = false,
  loadId = 0,
  frameCount = 0,
  drawCount = 0,
  frameTimes: number[] = [];
let ready = false,
  frameMs = 16,
  lastStats = 0;
function readStored(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function saveStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Browsing remains usable when storage is unavailable. */
  }
}
const input = $("seed") as HTMLInputElement;
input.value = seed;
const worker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});
let jobId = 0;
const pending = new Map<
  number,
  {
    resolve: (v: any) => void;
    reject: (e: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }
>();
worker.onmessage = ({ data }) => {
  const p = pending.get(data.id);
  if (!p) return;
  clearTimeout(p.timer);
  pending.delete(data.id);
  if (data.error) p.reject(new Error(data.error));
  else p.resolve(data.result);
};
worker.onerror = () => {
  for (const p of pending.values()) {
    clearTimeout(p.timer);
    p.reject(new Error("Generation worker failed. Reload to retry."));
  }
  pending.clear();
};
function job(kind: string, args: unknown): Promise<any> {
  return new Promise((resolve, reject) => {
    if (pending.size >= 40) {
      reject(new Error("Generation queue is busy. Try again in a moment."));
      return;
    }
    const id = ++jobId,
      timer = setTimeout(() => {
        pending.delete(id);
        reject(
          new Error(
            "Generation timed out; the current view is still available.",
          ),
        );
      }, 60000);
    pending.set(id, { resolve, reject, timer });
    worker.postMessage({ id, kind, args });
  });
}
const scene = new THREE.Scene();
scene.background = new THREE.Color("#070b12");
const camera = new THREE.PerspectiveCamera(
  48,
  innerWidth / innerHeight,
  0.02,
  1000,
);
let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    logarithmicDepthBuffer: true,
    powerPreference: "high-performance",
  });
} catch (e) {
  $("status").textContent = "This atlas needs a browser with WebGL2 enabled.";
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
camera.setViewOffset(
  innerWidth,
  innerHeight,
  innerWidth > 800 ? 130 : 60,
  0,
  innerWidth,
  innerHeight,
);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
$("viewport").append(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.minDistance = 0.7;
controls.maxDistance = 160;
let root = new THREE.Group();
scene.add(root);
let contextRoot = new THREE.Group(),
  skyAnchor = new THREE.Group();
let contextVisible = true,
  locationMap = "";
let contextStats = {
  galaxies: 0,
  nearbySystems: 0,
  skyPoints: 0,
  sectorStars: 0,
};
type CloudData = ReturnType<typeof overview>;
type NamedCloud = CloudData & { id: string };
const backdrop = new THREE.BufferGeometry(),
  bgPos: number[] = [];
let bx = 1234;
const br = () => {
  bx = (Math.imul(bx, 1664525) + 1013904223) >>> 0;
  return bx / 4294967296;
};
for (let i = 0; i < 1700; i++) {
  const a = br() * Math.PI * 2,
    h = br() * 2 - 1,
    r = 180;
  bgPos.push(
    Math.sqrt(1 - h * h) * Math.cos(a) * r,
    h * r,
    Math.sqrt(1 - h * h) * Math.sin(a) * r,
  );
}
backdrop.setAttribute("position", new THREE.Float32BufferAttribute(bgPos, 3));
const genericBackdrop = new THREE.Points(
  backdrop,
  new THREE.PointsMaterial({
    size: 0.15,
    color: "#738ba6",
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  }),
);
scene.add(genericBackdrop);
scene.add(new THREE.AmbientLight("#91b3cc", 0.22));
const light = new THREE.DirectionalLight("#ffecd0", 3);
light.position.set(-12, 5, 10);
scene.add(light);
scene.add(light.target);
const glowCanvas = document.createElement("canvas");
glowCanvas.width = glowCanvas.height = 64;
const ctx = glowCanvas.getContext("2d")!;
const gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
gr.addColorStop(0, "rgba(255,255,255,1)");
gr.addColorStop(0.07, "rgba(255,255,255,0.9)");
gr.addColorStop(0.22, "rgba(255,255,255,0.22)");
gr.addColorStop(1, "rgba(255,255,255,0)");
ctx.fillStyle = gr;
ctx.fillRect(0, 0, 64, 64);
const glow = new THREE.CanvasTexture(glowCanvas);
type Pick = { object: THREE.Object3D; id: string; kind: string };
let picks: Pick[] = [];
let labels: { el: HTMLElement; object: THREE.Object3D }[] = [];
let animations: {
  obj: THREE.Object3D;
  body: Body;
  sys: StarSystem;
  scale: number;
  parent?: Body;
}[] = [];
const ray = new THREE.Raycaster();
ray.params.Points = { threshold: 0.15 };
const mouse = new THREE.Vector2();
let tween: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  targetFrom: THREE.Vector3;
  targetTo: THREE.Vector3;
  start: number;
  duration: number;
  logarithmic?: boolean;
} | null = null;
let homePos = new THREE.Vector3(15, 13, 22);
let homeTarget = new THREE.Vector3();
let systemOrigin = new THREE.Vector3(),
  systemUnit = 1 / AU;
let systemOrbits: THREE.Object3D[] = [];
let residentSystem: string | null = null;
let detailedBody: { mesh: THREE.Mesh; body: Body } | null = null;
let planetTiles: PlanetRenderer | null = null;
let systemMarkers: NavigationMarkers | null = null;
let galaxyGlyphs: {group: THREE.Group; visual: THREE.Group; pick: THREE.Mesh; radius: number}[] = [];
let flightAim: string | null = null;
let orbitAssist: {bodyId: string; axis: THREE.Vector3; clearanceM?: number} | null = null;
let surfaceJourney: {bodyId:string; direction:THREE.Vector3; up:THREE.Vector3} | null = null;
let startCruiseAfterLook = false;
let approachClearance = 3000;
let approachAltitude: number | null = null;
let planetLook: {from: THREE.Quaternion; to: THREE.Quaternion; elapsed: number} | null = null;
let bodyFocusToken = 0,
  flightThrottle = 1,
  flightDomain = "galaxy",
  flightClearance = 0;
type TravelPose = { position: V3; quaternion: THREE.Quaternion };
let crossing: {
  read: () => TravelPose;
  apply: (pose: TravelPose) => void;
} | null = null;
let crossings = 0;
const prepared = new Map<string, Promise<any>>();
function prepare(key: string, kind: string, args: any) {
  let result = prepared.get(key);
  if (!result) {
    result = job(kind, args);
    prepared.set(key, result);
    if (prepared.size > 3) prepared.delete(prepared.keys().next().value!);
    result.catch(() => prepared.delete(key));
  }
  return result;
}

let vr: AtlasVR | undefined;
let systemScale: SystemScale = "overview";
let displayLayout: ReturnType<typeof systemLayout> | null = null;
type Surface = ReturnType<typeof planetSurface>;
let surfaceMesh: THREE.Mesh<
  THREE.SphereGeometry,
  THREE.MeshStandardMaterial
> | null = null;
let surfaceInfo: Surface | null = null;
let reliefScale = 1;
let refiningSurface = false;
let space: GalaxySpace | null = null;
let spaceSelection: { object: THREE.Object3D; el: HTMLElement } | null = null;
let flight = false,
  flightSpeed = 20;
const flightKeys = new Set<string>();
let touchForwardHeld = false;
let viewBlend: ViewBlend | null = null;
let journey = {
  active: false,
  phase: "idle",
  from: "universe",
  to: "universe",
  completed: 0,
};
function disposeView(group: THREE.Group) {
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    if (m.material) {
      for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
        const textured = mat as THREE.MeshStandardMaterial;
        for (const map of new Set([
          textured.map,
          textured.bumpMap,
          textured.roughnessMap,
        ]))
          if (map && map !== glow) map.dispose();
        mat.dispose();
      }
    }
  });
}
function clearView(retain = false) {
  surfaceJourney = null; startCruiseAfterLook = false;
  systemMarkers = null; galaxyGlyphs = []; flightAim = null;
  planetTiles?.dispose(); planetTiles = null;
  orbitAssist = null; approachAltitude = null;
  planetLook = null;
  residentSystem = null;
  detailedBody = null;
  systemOrigin.set(0, 0, 0);
  systemOrbits = [];
  bodyFocusToken++;
  space?.stop();
  space = null;
  spaceSelection = null;
  if (!crossing) {
    flight = false;
    flightKeys.clear();
  }
  controls.zoomToCursor = false;
  camera.near = 0.02;
  camera.updateProjectionMatrix();
  document.getElementById("flight-hud")?.remove();
  if (!retain) {
    scene.remove(root);
    disposeView(root);
  }
  root = new THREE.Group();
  scene.add(root);
  contextRoot = new THREE.Group();
  skyAnchor = new THREE.Group();
  contextRoot.add(skyAnchor);
  contextRoot.visible = contextVisible;
  root.add(contextRoot);
  contextStats = {
    galaxies: 0,
    nearbySystems: 0,
    skyPoints: 0,
    sectorStars: 0,
  };
  locationMap = "";
  genericBackdrop.visible =
    state.level !== "galaxy" &&
    state.level !== "sector" &&
    state.level !== "system";
  picks = [];
  displayLayout = null;
  surfaceMesh = null;
  surfaceInfo = null;
  refiningSurface = false;
  light.position.set(-12, 5, 10);
  controls.minDistance = 0.7;
  controls.maxDistance = 160;
  animations = [];
  if (!retain) for (const l of labels) l.el.remove();
  labels = [];
  $("hover").hidden = true;
}
function addLabel(object: THREE.Object3D, title: string, sub = "") {
  if (labels.length >= 60) return;
  const el = document.createElement("div");
  el.className = "space-label";
  el.innerHTML = esc(title) + (sub ? `<small>${esc(sub)}</small>` : "");
  $("labels").append(el);
  labels.push({ object, el });
}
function pointCloud(
  data: { positions: Float32Array; colors: Float32Array; sizes: Float32Array },
  scale: number,
  opacity = 1,
) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(data.positions.length);
  for (let i = 0; i < pos.length; i++) pos[i] = data.positions[i] * scale;
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(data.colors, 3));
  geo.setAttribute("pointSize", new THREE.BufferAttribute(data.sizes, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      alpha: { value: opacity },
      pixelRatio: { value: renderer.getPixelRatio() },
      maxPointSize: {value:13},
    },
    vertexShader: `attribute vec3 color; attribute float pointSize; varying vec3 vColor; uniform float pixelRatio,maxPointSize; void main(){vColor=color;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;float objectScale=length(modelMatrix[0].xyz);gl_PointSize=clamp(pointSize*pixelRatio*110.*objectScale/max(.05,-mv.z),1.,maxPointSize);}`,
    fragmentShader: `varying vec3 vColor;uniform float alpha;void main(){vec2 p=gl_PointCoord-.5;float d=dot(p,p);if(d>.25)discard;float a=exp(-d*24.)*.72;gl_FragColor=vec4(vColor,a*alpha);}`,
    transparent: true,
    depthWrite: false,
    vertexColors: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, material);
}
function sprite(color: string, size: number) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glow,
      color,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  s.scale.setScalar(size);
  return s;
}
function fit(
  pos: THREE.Vector3,
  instant = false,
  target = new THREE.Vector3(),
) {
  homePos = pos.clone();
  homeTarget = target.clone();
  if (renderer.xr.isPresenting) {
    tween = null;
    vr?.reset();
    return;
  }
  if (instant || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    camera.position.copy(pos);
    controls.target.copy(target);
    controls.update();
    tween = null;
  } else {
    camera.position.copy(pos.clone().multiplyScalar(1.24));
    controls.target.copy(target);
    tween = {
      from: camera.position.clone(),
      to: pos,
      targetFrom: target.clone(),
      targetTo: target.clone(),
      start: performance.now(),
      duration: 700,
    };
  }
}
function focusPoint(p: THREE.Vector3, dist: number) {
  const dir = camera.position.clone().sub(controls.target).normalize();
  tween = {
    from: camera.position.clone(),
    to: p.clone().addScaledVector(dir, dist),
    targetFrom: controls.target.clone(),
    targetTo: p,
    start: performance.now(),
    duration: 600,
  };
}
function caption(
  k: string,
  title: string,
  description: string,
  stats: [string, string][] = [],
) {
  $("view-kicker").textContent = k;
  $("view-title").textContent = title;
  $("view-description").textContent = description;
  $("view-stats").innerHTML = stats
    .map(([v, l]) => `<span>${esc(v)}<small>${esc(l)}</small></span>`)
    .join("");
}
function announce(s: string, busy = false) {
  $("status").innerHTML =
    (busy ? '<span class="loading-indicator"></span>' : "") + esc(s);
}
function breadcrumbs() {
  const parts: { label: string; level: Level }[] = [
    { label: "Universe", level: "universe" },
  ];
  if (state.galaxy) parts.push({ label: state.galaxy.name, level: "galaxy" });
  if (state.coords)
    parts.push({
      label: "Local stars",
      level: "sector",
    });
  if (state.sys) parts.push({ label: state.sys.name, level: "system" });
  if (state.body) parts.push({ label: state.body.name, level: "body" });
  $("breadcrumbs").innerHTML = parts
    .map((p) => `<button data-level="${p.level}">${esc(p.label)}</button>`)
    .join("<span>›</span>");
  $("back").toggleAttribute("disabled", state.level === "universe");
  for (const b of $("breadcrumbs").querySelectorAll<HTMLButtonElement>(
    "button",
  ))
    b.onclick = () => {
      void navigate(b.dataset.level as Level);
    };
}
function persist() {
  const q = new URLSearchParams({ seed });
  if (state.galaxy) q.set("g", state.galaxy.id);
  if (state.coords) q.set("sector", state.coords.join(","));
  if (state.ref) q.set("system", state.ref.id);
  if (state.body) q.set("body", state.body.id);
  history.replaceState(null, "", "?" + q);
  saveStored("atlas-seed", seed);
}
function childAnchor(
  parentState: State,
  childState: State,
): THREE.Vector3 | null {
  if (
    space &&
    (parentState.level === "galaxy" || parentState.level === "sector")
  ) {
    if (childState.ref) return space.world(childState.ref.position);
    if (childState.coords)
      return space.world(childState.coords.map((v) => v * 32 + 16) as V3);
  }
  if (parentState.level === "universe" && childState.galaxy)
    return vec(childState.galaxy.position).multiplyScalar(3);
  if (parentState.level === "galaxy" && childState.coords)
    return vec(childState.coords.map((v) => v * 32 + 16) as V3).multiplyScalar(
      10 / parentState.galaxy!.radiusLy,
    );
  if (parentState.level === "sector" && childState.ref)
    return vec(
      childState.ref.position.map(
        (v, i) => (v - (parentState.coords![i] * 32 + 16)) * 0.5,
      ) as V3,
    );
  if (parentState.level === "system" && childState.body) {
    const id =
      childState.body.kind === "moon"
        ? childState.body.parentId
        : childState.body.id;
    return (
      animations.find((a) => a.body.id === id)?.obj.position.clone() || null
    );
  }
  return null;
}
function depart(next: State, animate: boolean) {
  if (!animate || renderer.xr.isPresenting || next.level === state.level)
    return Promise.resolve();
  const destination = childAnchor(state, next);
  const direction = camera.position.clone().sub(controls.target).normalize();
  const distance = camera.position.distanceTo(controls.target);
  const target = destination || controls.target.clone();
  const end = target
    .clone()
    .addScaledVector(
      direction,
      destination
        ? Math.max(space ? space.scale * 0.4 : 0.65, distance * 0.11)
        : distance * 1.45,
    );
  tween = {
    from: camera.position.clone(),
    to: end,
    targetFrom: controls.target.clone(),
    targetTo: target,
    start: performance.now(),
    duration: 650,
  };
  journey.phase = "approach";
  return new Promise<void>((resolve) => setTimeout(resolve, 660));
}
async function navigate(level: Level, options: Partial<State> = {}) {
  if (!crossing && level === "body") {
    const body = options.body || state.body;
    if (!body) return;
    if (!residentSystem || residentSystem !== (options.sys || state.sys)?.id)
      await navigate("system", { ...options, ref: options.ref || state.ref });
    return focusBody(body);
  }
  if (
    !crossing &&
    level === "system" &&
    state.level === "body" &&
    residentSystem &&
    (!options.ref || options.ref.id === residentSystem)
  )
    return unfocusBody(false);

  if (
    !crossing &&
    space &&
    (level === "galaxy" || level === "sector") &&
    (!options.galaxy || options.galaxy.id === state.galaxy?.id)
  )
    return navigateSpace(level, options);
  const token = ++loadId;
  viewBlend?.finish();
  viewBlend = null;
  const previous = { ...state },
    next = { ...state, ...options, level };
  if (
    (level === "galaxy" && !next.galaxy) ||
    (level === "sector" && (!next.galaxy || !next.coords)) ||
    (level === "system" && !next.ref) ||
    (level === "body" && (!next.body || !next.sys))
  )
    return;
  const animate =
    !crossing &&
    frameCount > 0 &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches;
  ready = false;
  playing = false;
  controls.enabled = false;
  journey = {
    ...journey,
    active: true,
    phase: "preparing",
    from: previous.level,
    to: level,
  };
  const departure = depart(next, animate);
  announce(
    "Preparing " +
      (level === "body" ? "planetary preview" : level + " view") +
      "…",
    true,
  );
  try {
    let data: any = null;
    if (level === "universe")
      data = await job("universe-view", { galaxies: catalogue });
    if (level === "galaxy") {
      if (!next.galaxy) return;
      data = await prepare("galaxy:" + next.galaxy.seed, "galaxy-view", {
        galaxy: next.galaxy,
        galaxies: catalogue,
      });
    }
    if (level === "sector") {
      if (!next.galaxy || !next.coords) return;
      data = await job("sector-view", {
        galaxy: next.galaxy,
        coords: next.coords,
        galaxies: catalogue,
      });
    }
    if (level === "system") {
      if (!next.ref) return;
      next.sys = system(next.ref);
      data = await prepare("system:" + next.ref.seed, "system-surfaces", {
        bodies: [...next.sys.planets, ...next.sys.moons],
        galaxy: next.galaxy,
        coords: next.coords,
        ref: next.ref,
        galaxies: catalogue,
      });
    }
    if (level === "body") {
      if (!next.body || !next.sys) return;
      data =
        next.body.kind === "star"
          ? null
          : await job("surface", {
              body: next.body,
              width: 1024,
              segments: 192,
            });
    }
    await departure;
    if (token !== loadId) return;
    const transfer = crossing,
      pose = transfer?.read();
    camera.updateMatrixWorld();
    const oldCameraInverse = camera.matrixWorldInverse.clone(),
      oldRoot = root,
      oldLabels = labels.map((l) => l.el);
    if (level === "universe") {
      state = { level };
      region = null;
    } else if (level === "galaxy") {
      state = { level, galaxy: next.galaxy };
      region = null;
    } else if (level === "sector") {
      state = { level, galaxy: next.galaxy, coords: next.coords };
      sectorData = data;
    } else if (level === "system") {
      state = {
        level,
        galaxy: next.galaxy,
        coords: next.coords,
        ref: next.ref,
        sys: next.sys,
      };
    } else state = next;
    selected = null;
    playing = false;
    epoch = 0;
    clearView(animate);
    if (level === "universe") drawUniverse(data);
    if (level === "galaxy") drawGalaxy(data);
    if (level === "sector") drawSector(data);
    if (level === "system") drawSystem(data);

    if (animate && !renderer.xr.isPresenting) {
      const anchor = childAnchor(state, previous);
      if (anchor) {
        const to = homePos.clone(),
          direction = to.clone().normalize();
        camera.position.copy(
          anchor
            .clone()
            .addScaledVector(
              direction,
              Math.max(space ? space.scale * 4 : 1, to.length() * 0.16),
            ),
        );
        controls.target.copy(anchor);
        camera.lookAt(anchor);
        tween = {
          from: camera.position.clone(),
          to,
          targetFrom: anchor,
          targetTo: new THREE.Vector3(),
          start: performance.now(),
          duration: 700,
        };
      }
    }
    if (transfer && pose) {
      transfer.apply(pose);
      tween = null;
      flight = true;
      controls.enabled = false;
      crossings++;
    }
    breadcrumbs();
    panel();
    persist();
    if (animate) {
      journey.phase = "blend";
      viewBlend = new ViewBlend(
        scene,
        camera,
        oldRoot,
        root,
        oldCameraInverse,
        renderer.xr.isPresenting,
        oldLabels,
        labels.map((l) => l.el),
        () => disposeView(oldRoot),
      );
    } else {
      ready = true;
      journey.active = false;
      journey.phase = "idle";
      controls.enabled = !renderer.xr.isPresenting && !flight;
    }
    announce(
      level === "universe"
        ? "Seeded catalogue · galaxy symbols enlarged; positions in Mpc"
        : level === "galaxy"
          ? "Galaxy overview · neighbouring galaxies shown in their catalogue directions"
          : level === "sector"
            ? `${fmt(data.total, 0)} actual systems${data.aggregated ? " · representative markers shown" : ""} · brighter stars inside the 32 ly boundary`
            : level === "system"
              ? systemScale === "overview"
                ? "Spaced orbital overview · distances and body sizes adjusted for readability"
                : "Physical scale · true relative distances and radii; use the catalogue to select small worlds"
              : "Shared spherical geography · orbital preview",
    );
  } catch (error) {
    if (token !== loadId) return;
    ready = true;
    journey.active = false;
    journey.phase = "idle";
    controls.enabled = !renderer.xr.isPresenting && !flight;
    fit(homePos.clone());
    announce(String(error));
    console.error(error);
  }
}
function drawUniverse(data: { galaxyClouds: NamedCloud[] }) {
  camera.near = 1e-7;
  camera.updateProjectionMatrix();
  controls.minDistance = 1e-6;
  for (const g of catalogue) {
    const group = new THREE.Group();
    group.position.copy(vec(g.position).multiplyScalar(3));
    group.rotation.set(...g.rotation);
    const size = (g.radiusLy / LY_PER_MPC) * 3;
    const visual = new THREE.Group();
    group.add(visual);
    visual.add(
      pointCloud(
        data.galaxyClouds.find((c) => c.id === g.id)!,
        size / g.radiusLy,
        0.32,
      ),
    );
    ((visual.children[0] as THREE.Points).material as THREE.ShaderMaterial).uniforms.maxPointSize.value=2.3;
    const center = sprite(
      g.type === "Elliptical" ? "#ffe0ad" : "#d7e4ff",
      size * 0.35,
    );
    (center.material as THREE.SpriteMaterial).opacity=.65;
    visual.add(center);
    root.add(group);
    const pick = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(0.06, size), 8, 6),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    group.add(pick);
    galaxyGlyphs.push({group, visual, pick, radius:size});
    picks.push({ object: pick, id: g.id, kind: "galaxy" });
    addLabel(group, g.name, g.type);
  }
  fit(new THREE.Vector3(13, 13, 24), !ready);
  caption(
    "01 / THE COSMIC NEIGHBOURHOOD",
    "A universe to discover.",
    "Thirty-two galaxies. One seed. Choose a distant glow and explore what lies within.",
    [
      ["32", "galaxies"],
      ["4", "morphologies"],
      ["20 Mpc", "region extent"],
    ],
  );
}
function drawGalaxyNeighbours(
  g: Galaxy,
  clouds: NamedCloud[],
  observer: V3 = [0, 0, 0],
) {
  // The focused view uses the galaxy's local axes. Rotate universe directions
  // into that frame before drawing an effectively infinite-distance sky.
  const inverse = new THREE.Quaternion()
    .setFromEuler(new THREE.Euler(...g.rotation))
    .invert();
  const neighbours = catalogue
    .filter((n) => n.id !== g.id)
    .sort(
      (a, b) =>
        vec(a.position).distanceToSquared(vec(g.position)) -
        vec(b.position).distanceToSquared(vec(g.position)),
    );
  for (const [i, n] of neighbours.entries()) {
    const direction = vec(n.position)
      .sub(vec(g.position))
      .applyQuaternion(inverse)
      .sub(vec(observer).multiplyScalar(1 / 3261563.777));
    const distanceMpc = direction.length();
    const group = new THREE.Group();
    group.position.copy(direction.normalize().multiplyScalar(150));
    group.quaternion
      .copy(inverse)
      .multiply(
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...n.rotation)),
      );
    // Enlarge remote silhouettes for recognition; retain their true directions.
    const radius = THREE.MathUtils.clamp(
      (n.radiusLy / (distanceMpc * 3261563.777)) * 140 * 3,
      0.9,
      3.2,
    );
    const source = clouds.find((c) => c.id === n.id)!;
    const data = { ...source, sizes: source.sizes.map((s) => s * 3) };
    group.add(pointCloud(data, radius / n.radiusLy, 0.5));
    const core = sprite(
      n.type === "Elliptical" ? "#ffe0ad" : "#9cb7df",
      radius * 1.1,
    );
    (core.material as THREE.SpriteMaterial).opacity = 0.55;
    group.add(core);
    skyAnchor.add(group);
    if (i < 8) {
      group.userData.context = true;
      addLabel(group, n.name, fmt(distanceMpc, 2) + " Mpc away");
    }
  }
  contextStats.galaxies = neighbours.length;
}

function drawGalacticSky(data: ReturnType<typeof overview>, center: V3) {
  const positions: number[] = [],
    colors: number[] = [],
    sizes: number[] = [];
  for (let i = 0; i < data.sizes.length; i++) {
    const offset = new THREE.Vector3(
      data.positions[i * 3] - center[0],
      data.positions[i * 3 + 1] - center[1],
      data.positions[i * 3 + 2] - center[2],
    );
    if (offset.lengthSq() < 128 * 128) continue;
    positions.push(...offset.normalize().multiplyScalar(145).toArray());
    colors.push(
      data.colors[i * 3],
      data.colors[i * 3 + 1],
      data.colors[i * 3 + 2],
    );
    sizes.push(data.sizes[i] * 7);
  }
  const sky = pointCloud(
    {
      positions: new Float32Array(positions),
      colors: new Float32Array(colors),
      sizes: new Float32Array(sizes),
    },
    1,
    0.16,
  );
  skyAnchor.add(sky);
  contextStats.skyPoints = sizes.length;
  const core = new THREE.Object3D();
  core.position.copy(vec(center).negate().normalize().multiplyScalar(140));
  core.userData.context = true;
  skyAnchor.add(core);
  addLabel(
    core,
    state.galaxy!.name + " core",
    fmt(Math.hypot(...center), 0) + " ly away",
  );
}

function makeLocationMap(data?: ReturnType<typeof overview>) {
  const g = state.galaxy!;
  let dots = "",
    x: number,
    y: number,
    subtitle: string;
  if (state.level === "galaxy") {
    // Same physical X/Z positions as the universe catalogue, viewed from above.
    const extent =
      Math.max(
        ...catalogue.flatMap((n) => [
          Math.abs(n.position[0]),
          Math.abs(n.position[2]),
        ]),
      ) * 1.12;
    for (const n of catalogue)
      dots += `<circle cx="${120 + (n.position[0] / extent) * 106}" cy="${74 + (n.position[2] / extent) * 60}" r="2" fill="#728aab"/>`;
    x = 120 + (g.position[0] / extent) * 106;
    y = 74 + (g.position[2] / extent) * 60;
    subtitle = "Your galaxy in the universe · X/Z projection";
  } else {
    const overviewData = data!;
    const extent = Math.max(
      g.radiusLy * 1.3,
      Math.abs(state.coords![0] * 32 + 16),
      Math.abs(state.coords![2] * 32 + 16),
    );
    for (let i = 0; i < overviewData.sizes.length; i += 24)
      dots += `<circle cx="${120 + (overviewData.positions[i * 3] / extent) * 103}" cy="${74 + (overviewData.positions[i * 3 + 2] / extent) * 61}" r="0.7" fill="#8298b3" opacity="0.5"/>`;
    x = 120 + ((state.coords![0] * 32 + 16) / extent) * 103;
    y = 74 + ((state.coords![2] * 32 + 16) / extent) * 61;
    subtitle = "Your sector in " + g.name + " · X/Z projection";
  }
  return `<div class="location-map"><svg viewBox="0 0 240 148" role="img" aria-label="${esc(subtitle)}"><path d="M120 8V140M10 74H230" stroke="#1c3344" stroke-width="0.6"/>${dots}<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="#8fe3df"/><circle cx="${x}" cy="${y}" r="2.6" fill="#c5ffed"/><path d="M${x + 9} ${y}h12" stroke="#8fe3df"/><text x="12" y="17" fill="#98bdc9" font-size="9">YOU ARE HERE</text></svg><p class="subtle">${esc(subtitle)}</p></div>`;
}

function makeSectorLocationMap(refs: SystemRef[], current: SystemRef) {
  const coords = state.coords!,
    stride = Math.max(1, Math.ceil(refs.length / 180));
  const project = (p: V3) => [
    16 + ((p[0] - coords[0] * 32) / 32) * 208,
    14 + ((p[2] - coords[2] * 32) / 32) * 116,
  ];
  let dots = "";
  for (let i = 0; i < refs.length; i += stride) {
    const [x, y] = project(refs[i].position);
    dots += `<circle cx="${x}" cy="${y}" r="1.3" fill="${esc(refs[i].color)}" opacity=".55"/>`;
  }
  const [x, y] = project(current.position),
    title = current.name + " within " + nameSector(coords) + " · X/Z";
  return `<div class="location-map"><svg viewBox="0 0 240 148" role="img" aria-label="${esc(title)}"><path d="M16 14H224V130H16Z" fill="none" stroke="#385e6f"/>${dots}<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="#9affe4"/><circle cx="${x}" cy="${y}" r="2.5" fill="#caffec"/></svg><p class="subtle">${esc(title)}</p></div>`;
}
function contextPanel() {
  return (
    locationMap +
    `<button id="toggle-context" class="context-toggle" aria-pressed="${contextVisible}">${contextVisible ? "Hide" : "Show"} surroundings</button><p class="subtle">${state.level === "galaxy" ? "Every mapped point is an addressable star. The galaxy stays in place as you approach. Remote galaxy silhouettes are enlarged." : state.level === "system" ? `${contextStats.sectorStars} nearby catalogue stars in this sector, plus neighbouring sectors, the parent galaxy and 31 distant galaxies. Sky directions follow this system’s physical position.` : "These stars occupy the same physical galaxy you saw from outside. Nearby stars stream around you as you move; distant mapped stars stay in place."}</p>`
  );
}

function setupSpace(data: any) {
  const g = state.galaxy!;
  const current = new GalaxySpace(
    g,
    data.starMap,
    (c) => job("space-chunk", { galaxy: g, coords: c }),
    (chunk) => {
      if (space !== current || journey.active) return;
      if (
        flight ||
        camera.position.distanceTo(controls.target) < current.scale * 256
      ) {
        const changed =
          state.level !== "sector" ||
          state.coords?.join(",") !== chunk.coords.join(",");
        if (changed) {
          state = { level: "sector", galaxy: g, coords: chunk.coords };
          sectorData = chunk;
          locationMap = makeLocationMap(data.focus || data.sky);
          localCaption();
          breadcrumbs();
          panel();
          persist();
        }
      }
    },
    announce,
  );
  space = current;
  root.add(current.group);
  const marker = new THREE.Object3D();
  marker.visible = false;
  root.add(marker);
  addLabel(marker, "");
  spaceSelection = labels[labels.length - 1];
  picks.push(
    { object: current.anchors, id: "map-stars", kind: "catalogue-star" },
    { object: current.nearby, id: "nearby-stars", kind: "catalogue-star" },
  );
  drawGalaxyNeighbours(g, data.galaxyClouds);
  camera.near = current.scale * 0.02;
  camera.updateProjectionMatrix();
  controls.minDistance = current.scale * 0.3;
  controls.maxDistance = 160;
  controls.zoomToCursor = true;
  root.userData.space = true;
  const hud = document.createElement("div");
  hud.id = "flight-hud";
  document.body.append(hud);
}
function drawGalaxy(data: any) {
  setupSpace(data);
  locationMap = makeLocationMap();
  fit(new THREE.Vector3(3, 16, 20));
  caption(
    "02 / " + state.galaxy!.type.toUpperCase() + " GALAXY",
    state.galaxy!.name,
    "Every visible star has a catalogue address. Select one and approach it, or fly through the galaxy.",
    [
      [fmt(state.galaxy!.radiusLy * 2, 0) + " ly", "diameter"],
      [fmt(space!.refs.length, 0), "mapped systems"],
    ],
  );
}
function drawSector(data: any) {
  setupSpace(data);
  sectorData = data;
  space!.seed(data);
  const center = state.coords!.map((v) => v * 32 + 16) as V3;
  space!.rebase(center);
  locationMap = makeLocationMap(data.sky);
  root.userData.viewRadius = space!.scale * 32;
  fit(new THREE.Vector3(0, 8, 24).multiplyScalar(space!.scale));
  localCaption();
}
function localCaption() {
  caption(
    "03 / " + state.galaxy!.name.toUpperCase(),
    "Among the stars",
    "Move through the galaxy. Nearby systems appear at their physical positions as you travel.",
    [
      [fmt(sectorData?.total || 0, 0), "systems in this region"],
      ["W A S D", "fly · Q / E descend / ascend"],
    ],
  );
}
async function navigateSpace(
  level: "galaxy" | "sector",
  options: Partial<State>,
) {
  const current = space!,
    token = ++loadId,
    from = state.level;
  viewBlend?.finish();
  viewBlend = null;
  flight = false;
  flightKeys.clear();
  tween = null;
  ready = false;
  controls.enabled = false;
  journey = { ...journey, active: true, phase: "flight", from, to: level };
  const coords = options.coords || state.coords;
  const physical: V3 =
    level === "galaxy"
      ? [0, 0, 0]
      : options.ref?.position || (coords!.map((v) => v * 32 + 16) as V3);
  const target = current.world(physical),
    to = target
      .clone()
      .add(
        level === "galaxy"
          ? new THREE.Vector3(3, 16, 20)
          : new THREE.Vector3(0, 8, 24).multiplyScalar(current.scale),
      );
  const animate =
    !matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !renderer.xr.isPresenting;
  const duration = animate ? 2400 : 0;
  tween = duration
    ? {
        from: camera.position.clone(),
        to,
        targetFrom: controls.target.clone(),
        targetTo: target,
        start: performance.now(),
        duration,
        logarithmic: true,
      }
    : null;
  const travel = new Promise<void>((r) => setTimeout(r, duration));
  try {
    const chunk =
      level === "sector"
        ? await job("space-chunk", { galaxy: state.galaxy, coords })
        : null;
    if (token !== loadId || space !== current) return;
    if (chunk) current.seed(chunk);
    await travel;
    if (token !== loadId || space !== current) return;
    if (!renderer.xr.isPresenting) {
      camera.position.copy(to);
      controls.target.copy(target);
      camera.lookAt(target);
    }
    tween = null;
    const delta = current.rebase(physical);
    homeTarget.set(0, 0, 0);
    if (!renderer.xr.isPresenting) {
      camera.position.sub(delta);
      controls.target.sub(delta);
      homePos = camera.position.clone();
    } else {
      controls.target.set(0, 0, 0);
      homePos = to.clone().sub(target);
    }
    state =
      level === "galaxy"
        ? { level, galaxy: state.galaxy }
        : { level, galaxy: state.galaxy, coords };
    if (chunk) sectorData = chunk;
    selected = options.ref?.id || null;
    root.userData.viewRadius = level === "galaxy" ? 16 : current.scale * 32;
    if (renderer.xr.isPresenting) vr?.reset();
    locationMap =
      level === "galaxy"
        ? makeLocationMap()
        : makeLocationMap({
            positions: new Float32Array(
              current.refs.flatMap((r) => r.position),
            ),
            colors: new Float32Array(),
            sizes: new Float32Array(current.refs.length),
          });
    if (level === "sector") localCaption();
    else
      caption(
        "02 / GALAXY",
        state.galaxy!.name,
        "Zoom toward any mapped star or fly freely through the galaxy.",
        [],
      );
    breadcrumbs();
    panel();
    persist();
    journey.active = false;
    journey.phase = "idle";
    if (duration) journey.completed++;
    ready = true;
    controls.enabled = !renderer.xr.isPresenting && !flight;
    announce("One continuous galaxy · select a star or use Fly");
  } catch (e) {
    if (token === loadId) {
      tween = null;
      ready = true;
      journey.active = false;
      journey.phase = "idle";
      controls.enabled = !renderer.xr.isPresenting && !flight;
      announce(String(e));
    }
  }
}
let autopilot: {
  kind: "galaxy" | "star" | "body" | "exit";
  id: string;
} | null = null;
function flightUnit() {
  return space ? space.scale : residentSystem ? systemUnit : 3;
}
function localPose(): V3 {
  return space
    ? space.physical(camera.position)
    : residentSystem
      ? (camera.position
          .clone()
          .divideScalar(systemUnit)
          .add(systemOrigin)
          .toArray() as V3)
      : (camera.position.clone().divideScalar(3).toArray() as V3);
}
function finishTravel() {
  crossing = null;
}
async function crossScale(
  level: Level,
  options: Partial<State>,
  read: () => TravelPose,
  apply: (pose: TravelPose) => void,
) {
  if (crossing) return;
  crossing = { read, apply };
  try {
    await navigate(level, options);
  } finally {
    finishTravel();
  }
}
function applyPose(pose: TravelPose) {
  if (space) {
    space.rebase(pose.position.map((v) => Math.floor(v / 32) * 32) as V3);
    camera.position.copy(space.world(pose.position));
  } else if (residentSystem) {
    systemOrigin.set(...pose.position);
    positionSystem();
    camera.position.set(0, 0, 0);
  } else camera.position.copy(vec(pose.position).multiplyScalar(3));
  camera.quaternion.copy(pose.quaternion);
  controls.target
    .copy(camera.position)
    .add(
      camera
        .getWorldDirection(new THREE.Vector3())
        .multiplyScalar(flightUnit()),
    );
}
function toggleFlight() {
  surfaceJourney = null; startCruiseAfterLook = false;
  if (renderer.xr.isPresenting) return;
  flight = !flight;
  updateCameraViewport();
  flightAim = null;
  tween = null;
  flightKeys.clear();
  autopilot = null;
  orbitAssist = null; approachAltitude = null;
  planetLook = null;
  if (flight) {
    if (reliefScale !== 1 && state.body && surfaceMesh && surfaceInfo) {
      reliefScale = 1;
      restartPlanetTiles();
    }
    if (residentSystem) physicalSystem();
    playing = false;
    controls.target
      .copy(camera.position)
      .add(
        camera
          .getWorldDirection(new THREE.Vector3())
          .multiplyScalar(flightUnit()),
      );
  }
  // Free look targets a point one local unit ahead. Keep OrbitControls from
  // pushing the camera backwards to a planet-sized minimum when flight stops.
  if (!flight)
    controls.minDistance = Math.min(controls.minDistance, flightUnit() * 0.1);
  if (!flight) camera.up.set(0,1,0).applyQuaternion(camera.quaternion);
  controls.enabled = !flight;
  panel();
}
function beginTargetFlight() {
  surfaceJourney = null; startCruiseAfterLook = false;
  planetLook = null;
  if (!selected) return;
  const kind = state.level === "universe" ? "galaxy" : space ? "star" : "body";
  if (!flight) toggleFlight();
  orbitAssist = null; approachAltitude = null;
  autopilot = { kind, id: selected };
}
function flyOutward() {
  surfaceJourney = null; startCruiseAfterLook = false;
  planetLook = null;
  if (!flight) toggleFlight();
  orbitAssist = null; approachAltitude = null;
  const domain = space ? "galaxy" : residentSystem ? "system" : "universe";
  const direction = vec(localPose()).normalize();
  if (residentSystem) {
    const p = localPose(),
      near = nearestBody(state.sys!, p, epoch);
    direction.set(0, p[1] >= near.center[1] ? 1 : -1, 0);
  }
  if (direction.lengthSq() < 0.1) direction.set(0, 1, 0);
  camera.lookAt(camera.position.clone().add(direction));
  controls.target
    .copy(camera.position)
    .addScaledVector(direction, flightUnit());
  autopilot = { kind: "exit", id: domain };
}
function aimedDistance(
  points: { position: V3 }[],
  p: V3,
  direction: THREE.Vector3,
  limit: number,
) {
  let best = limit;
  for (const n of points) {
    const x = n.position[0] - p[0],
      y = n.position[1] - p[1],
      z = n.position[2] - p[2],
      d = Math.hypot(x, y, z),
      along = x * direction.x + y * direction.y + z * direction.z;
    if (d < 0.05) best = Math.min(best, d);
    else if (
      along > 0 &&
      d * d - along * along < Math.max(0.01, d * 0.035) ** 2
    )
      best = Math.min(best, d);
  }
  return best;
}
function updateFlight(dt: number) {
  if (!flight || !ready || renderer.xr.isPresenting) return;
  if (surfaceJourney && residentSystem) {
    const body=bodyById(surfaceJourney.bodyId)!, center=vec(bodyPosition(body,state.sys!,epoch));
    const relative=vec(localPose()).sub(center), radius=relative.length(), radial=relative.clone().normalize();
    const angle=radial.angleTo(surfaceJourney.direction);
    const safeHeight=Math.max(80000,body.radiusM*.04);
    const nextRadius=radius+(body.radiusM+safeHeight-radius)*Math.min(1,dt*2);
    if(radius>body.radiusM+30000 && angle>.002) {
      const rotation=new THREE.Quaternion().setFromUnitVectors(radial,surfaceJourney.direction);
      rotation.slerp(new THREE.Quaternion(),1-Math.min(1,dt*.35/angle));
      radial.applyQuaternion(rotation);
      surfaceJourney.up.applyQuaternion(rotation);
    }
    const next=radial.multiplyScalar(nextRadius).add(center);
    flightSpeed=next.distanceTo(vec(localPose()))/Math.max(dt,.001); flightDomain='system';
    camera.position.copy(next.sub(systemOrigin).multiplyScalar(systemUnit));
    camera.up.copy(surfaceJourney.up);
    camera.lookAt(center.clone().sub(systemOrigin).multiplyScalar(systemUnit));
    controls.target.copy(center.clone().sub(systemOrigin).multiplyScalar(systemUnit));
    if(angle<.002 && radius>body.radiusM+30000) {
      surfaceJourney=null; approachAltitude=0; approachClearance=480;
      startCruiseAfterLook=true; autopilot={kind:'body',id:body.id};
    }
    return;
  }
  if (planetLook) {
    planetLook.elapsed += dt;
    const t = Math.min(1, planetLook.elapsed / 1.1), s = t * t * (3 - 2 * t);
    camera.quaternion.slerpQuaternions(planetLook.from, planetLook.to, s);
    controls.target.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(flightUnit()));
    if (t === 1) {
      planetLook = null;
      if (startCruiseAfterLook) {startCruiseAfterLook=false; startTerrainCruise();}
    }
  }
  if (orbitAssist && residentSystem) {
    const body = bodyById(orbitAssist.bodyId)!;
    const center = vec(bodyPosition(body, state.sys!, epoch));
    const relative = vec(localPose()).sub(center);
    const angle = orbitAssist.clearanceM ? dt * 250 * flightThrottle / relative.length() : dt * .045 * flightThrottle;
    orbitStep(relative, camera.quaternion, orbitAssist.axis, angle);
    if (orbitAssist.clearanceM) {
      const ground=surfaceClearance(body,relative.toArray() as V3).terrainElevation;
      relative.setLength(body.radiusM+ground+orbitAssist.clearanceM);
    }
    camera.position.copy(relative.clone().add(center).sub(systemOrigin).multiplyScalar(systemUnit));
    controls.target.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(flightUnit()));
    flightDomain = 'system';
    flightSpeed = angle / Math.max(dt, .00001) * relative.length();
    flightClearance = nearestBody(state.sys!, localPose(), epoch).clearance;
    return;
  }
  const domain = space ? "galaxy" : residentSystem ? "system" : "universe";
  flightDomain = domain;
  if (autopilot?.kind === "exit" && autopilot.id !== domain) autopilot = null;
  const p = localPose(),
    quaternion = camera.quaternion.clone();
  if (space && !autopilot && flightKeys.has('w')) {
    const heading = camera.getWorldDirection(new THREE.Vector3());
    const ref = space.find(flightAim || selected || '');
    if (ref) {
      const toward = vec(ref.position).sub(vec(p)).normalize();
      if (heading.dot(toward) > Math.cos(.035)) {
        flightAim = ref.id;
        const desired = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(),toward,camera.up));
        camera.quaternion.rotateTowards(desired, dt * .8);
      } else flightAim = null;
    }
  } else flightAim = null;
  let target: V3 | undefined;
  if (autopilot?.kind === "galaxy") {
    if (space && state.galaxy?.id === autopilot.id) autopilot = null;
    else target = catalogue.find((g) => g.id === autopilot!.id)?.position;
  } else if (autopilot?.kind === "star") {
    if (residentSystem === autopilot.id) autopilot = null;
    else target = space?.find(autopilot.id)?.position;
  } else if (autopilot?.kind === "body") {
    const body = bodyById(autopilot.id);
    if (body) {
      target = bodyPosition(body, state.sys!, epoch);
      const relative = p.map((v,i) => v - target![i]) as V3;
      const stopDistance = approachAltitude === null ? body.radiusM * 4.2
        : Math.max(body.radiusM + approachAltitude, surfaceClearance(body, relative).minimum + approachClearance);
      if (Math.hypot(...relative) < stopDistance + 200) {
        if (approachAltitude !== null) {
          const up = vec(relative).normalize();
          const forward = new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion).projectOnPlane(up).normalize().multiplyScalar(.99).addScaledVector(up,-.14).normalize();
          const to = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(), forward, up));
          planetLook = {from: camera.quaternion.clone(), to, elapsed: 0};
        }
        autopilot = null;
        approachAltitude = null;
        if (state.body?.id !== body.id) void focusBody(body, true);
        target = undefined;
      }
    }
  }
  if (target) {
    const delta = vec(target).sub(vec(p));
    camera.lookAt(camera.position.clone().add(delta.normalize()));
    controls.target
      .copy(camera.position)
      .add(
        camera
          .getWorldDirection(new THREE.Vector3())
          .multiplyScalar(flightUnit()),
      );
  }
  const motion = new THREE.Vector3(
    +flightKeys.has("d") - +flightKeys.has("a"),
    +flightKeys.has("e") - +flightKeys.has("q"),
    +flightKeys.has("s") - +(flightKeys.has("w") || !!autopilot),
  );
  const direction = motion.lengthSq()
    ? motion.clone().normalize().applyQuaternion(camera.quaternion)
    : camera.getWorldDirection(new THREE.Vector3());
  let clearance = 1,
    nearest: any = null;
  if (domain === "universe") {
    nearest = catalogue
      .map((g) => ({ g, d: vec(g.position).distanceTo(vec(p)) }))
      .sort((a, b) => a.d - b.d)[0];
    clearance = nearest.d;
    const g = nearest.g as Galaxy;
    if (nearest.d < (g.radiusLy / LY_PER_MPC) * 8)
      void prepare("galaxy:" + g.seed, "galaxy-view", {
        galaxy: g,
        galaxies: catalogue,
      }).catch(() => {});
    if (nearest.d < (g.radiusLy / LY_PER_MPC) * 2) {
      const inverse = new THREE.Quaternion()
        .setFromEuler(new THREE.Euler(...g.rotation))
        .invert();
      void crossScale(
        "galaxy",
        { galaxy: g },
        () => ({
          position: vec(localPose())
            .sub(vec(g.position))
            .applyQuaternion(inverse)
            .multiplyScalar(LY_PER_MPC)
            .toArray() as V3,
          quaternion: inverse.clone().multiply(camera.quaternion),
        }),
        applyPose,
      );
      return;
    }
  } else if (space) {
    const g = state.galaxy!;
    clearance = target
      ? vec(target).distanceTo(vec(p))
      : aimedDistance(
          [...space.refs, ...space.nearbyRefs],
          p,
          direction,
          g.radiusLy * 0.5,
        );
    let closest: any = null;
    for (const ref of [...space.refs, ...space.nearbyRefs]) {
      const d = vec(ref.position).distanceTo(vec(p));
      if (!closest || d < closest.d) closest = { ref, d };
    }
    if (closest) {
      // The old fixed 0.02 ly near plane erased stars before the 300 AU entry
      // boundary. Keep the point visible all the way into its system.
      camera.near = space.scale * Math.max(1e-9, Math.min(.02, closest.d * .015));
      camera.updateProjectionMatrix();
      // Always bound a step by the nearest physical destination, including
      // outside the narrow aiming cone. Boost can no longer skip a system.
      if (closest.d < .1) clearance = Math.min(clearance, Math.max(closest.d, 1e-9));
    }
    if (closest && closest.d < 0.1) {
      const ref = closest.ref as SystemRef,
        sys = system(ref),
        coords = ref.cell.map((v) => Math.floor(v / 8)) as V3;
      void prepare("system:" + ref.seed, "system-surfaces", {
        bodies: [...sys.planets, ...sys.moons],
        galaxy: g,
        coords,
        ref,
        galaxies: catalogue,
      }).catch(() => {});
      if (closest.d < systemBoundary(sys) / LY) {
        systemScale = "physical";
        void crossScale(
          "system",
          { ref, coords },
          () => ({
            position: vec(localPose())
              .sub(vec(ref.position))
              .multiplyScalar(LY)
              .toArray() as V3,
            quaternion: camera.quaternion.clone(),
          }),
          applyPose,
        );
        return;
      }
    }
    if (vec(p).length() > g.radiusLy * 2.6) {
      const rotation = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(...g.rotation),
      );
      void crossScale(
        "universe",
        {},
        () => ({
          position: vec(localPose())
            .divideScalar(LY_PER_MPC)
            .applyQuaternion(rotation)
            .add(vec(g.position))
            .toArray() as V3,
          quaternion: rotation.clone().multiply(camera.quaternion),
        }),
        applyPose,
      );
      return;
    }
  } else if (residentSystem) {
    const sys = state.sys!;
    nearest = nearestBody(sys, p, epoch);
    clearance = nearest.clearance;
    if (approachAltitude !== null && target) {
      const body = bodyById(autopilot!.id)!;
      const stop = Math.max(body.radiusM + approachAltitude,
        surfaceClearance(body, p.map((v,i) => v - target![i]) as V3).minimum + approachClearance);
      clearance = Math.min(clearance, Math.max(0, vec(p).distanceTo(vec(target)) - stop));
    }
    if (vec(p).length() > systemBoundary(sys) * 2) {
      const ref = sys.ref;
      void crossScale(
        "galaxy",
        { galaxy: state.galaxy },
        () => ({
          position: vec(localPose())
            .divideScalar(LY)
            .add(vec(ref.position))
            .toArray() as V3,
          quaternion: camera.quaternion.clone(),
        }),
        applyPose,
      );
      return;
    }
    if ((state.level !== "body" || state.body?.id !== nearest.body.id) && nearest.distance < nearest.body.radiusM * 12)
      void focusBody(nearest.body, true);
    else if (
      state.level === "body" &&
      vec(p).distanceTo(vec(bodyPosition(state.body!, sys, epoch))) >
        state.body!.radiusM * 30
    )
      unfocusBody(true);
  }
  flightClearance = clearance;
  flightSpeed =
    automaticSpeed(domain, clearance) *
    flightThrottle *
    (flightKeys.has("shift") ? 8 : 1);
  if (motion.lengthSq()) {
    let step = Math.min(
      flightSpeed * dt,
      Math.max(clearance, domain === "system" ? 1000 : 0.0000001) * 0.24,
    );
    if (space) {
      // Swept proximity check: a fast frame must not tunnel past a system
      // before the next frame can prepare it and change coordinate scale.
      for (const ref of [...space.refs,...space.nearbyRefs]) {
        const delta=vec(ref.position).sub(vec(p)), along=delta.dot(direction);
        if (along > .03 && along < step + .03 && delta.lengthSq()-along*along < .02*.02)
          step=Math.min(step,along-.03);
      }
    }
    motion
      .normalize()
      .applyQuaternion(camera.quaternion)
      .multiplyScalar(step * flightUnit());
    camera.position.add(motion);
    controls.target.add(motion);
    if (residentSystem) {
      const near = nearestBody(state.sys!, localPose(), epoch),
        minimum = near.minimum;
      if (near.distance < minimum) {
        const safe = vec(localPose()).sub(vec(near.center));
        if (safe.lengthSq() < 1) safe.set(0, 1, 0);
        safe.normalize().multiplyScalar(minimum).add(vec(near.center));
        const corrected = safe.sub(systemOrigin).multiplyScalar(systemUnit);
        controls.target.add(corrected.clone().sub(camera.position));
        camera.position.copy(corrected);
      }
      if (
        camera.position.length() >
        Math.max(focusRadius() * 100, systemUnit * 1e8)
      ) {
        const center = vec(localPose());
        rebaseSystem(center);
      }
    }
  }
}
function updateFlightHud() {
  let hud = document.getElementById("flight-hud");
  if (!hud) {
    hud = document.createElement("div");
    hud.id = "flight-hud";
    document.body.append(hud);
  }
  const unit =
    flightDomain === "universe"
      ? "Mpc/s"
      : flightDomain === "galaxy"
        ? "ly/s"
        : flightSpeed > AU * 0.01
          ? "AU/s"
          : flightSpeed < 1000 ? 'm/s' : "km/s";
  const rate =
    flightDomain === "system"
      ? flightSpeed / (unit === "AU/s" ? AU : unit==='m/s'?1:1000)
      : flightSpeed;
  hud.textContent = flight
    ? `${flightDomain.toUpperCase()} · ${fmt(rate, 3)} ${unit} · auto speed ×${fmt(flightThrottle, 2)}${autopilot ? " · travelling to selection" : ""}`
    : "Fly at any scale · select a destination or use WASD";
  let reticle = document.getElementById('flight-reticle');
  if (!reticle) {reticle=document.createElement('div');reticle.id='flight-reticle';reticle.textContent='+';document.body.append(reticle);}
  reticle.hidden = !flight || renderer.xr.isPresenting;
  if (flightAim) hud.textContent += ' · selected star aligned';
  if (residentSystem && state.body) {
    const body = state.body, center = bodyPosition(body, state.sys!, epoch);
    const relative = localPose().map((v,i) => v - center[i]) as V3;
    const info = surfaceClearance(body, relative);
    const latitude = Math.asin(THREE.MathUtils.clamp(relative[1] / Math.hypot(...relative), -1, 1)) * 180 / Math.PI;
    hud.textContent += ` · altitude ${fmt(info.altitude / 1000, 1)} km · clearance ${fmt(info.terrainClearance / 1000, 1)} km · latitude ${fmt(latitude, 1)}°${orbitAssist?.clearanceM ? ' · terrain following' : orbitAssist ? ' · orbit assist' : ''}`;
    if(flight && body.kind!=='star' && body.type!=='Gas giant') {
      const low=info.terrainClearance<20000, label=low?'05 / TERRAIN FLIGHT':'05 / PLANETARY ORBIT';
      if($('view-kicker').textContent!==label){$('view-kicker').textContent=label;$('view-description').textContent=low?'Flying over this world. Drag to look, use WASD to steer, and the wheel to adjust speed.':'Your planet, moons and star system remain connected. Fly toward a destination or choose a terrain site.';}
    }
  }
}

function approachPlanet(altitude: number) {
  surfaceJourney = null; startCruiseAfterLook = false; approachClearance=3000;
  planetLook = null;
  if (!state.body || renderer.xr.isPresenting) return;
  if (!flight) toggleFlight();
  orbitAssist = null;
  approachAltitude = altitude;
  autopilot = {kind: 'body', id: state.body.id};
}
function exploreTerrain() {
  const body=state.body;
  if(!body || body.kind==='star' || body.type==='Gas giant' || renderer.xr.isPresenting) return;
  if(!flight) toggleFlight();
  autopilot=null; orbitAssist=null; planetLook=null; startCruiseAfterLook=false;
  const center=vec(bodyPosition(body,state.sys!,epoch)), eye=vec(localPose()).sub(center).normalize();
  const sample=terrainSampler(body), sun=vec(bodyPosition(state.sys!.stars[0],state.sys!,epoch)).sub(center).normalize();
  let destination=eye.clone(), best=-Infinity;
  for(let i=0;i<384;i++) {
    const y=1-2*(i+.5)/384, phi=i*2.399963229728653, r=Math.sqrt(1-y*y);
    const d=new THREE.Vector3(Math.cos(phi)*r,y,Math.sin(phi)*r), s=sample(d.toArray() as V3);
    if(s.ocean || s.elevationM>10000)continue;
    const score=d.dot(eye)*2+Math.max(-.5,d.dot(sun))*.7+Math.min(1,s.elevationM/3500)*.12;
    if(score>best){best=score;destination=d;}
  }
  const up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion).projectOnPlane(eye);
  if(up.lengthSq()<.0001)up.set(1,0,0).applyQuaternion(camera.quaternion).projectOnPlane(eye);
  surfaceJourney={bodyId:body.id,direction:destination,up:up.normalize()};
  announce('Approaching a terrain site, then flying 600 m above the ground. Movement keys release assistance.');
}
function startTerrainCruise() {
  const body=state.body!;
  const radial=vec(localPose()).sub(vec(bodyPosition(body,state.sys!,epoch))).normalize();
  const tangent=camera.getWorldDirection(new THREE.Vector3()).projectOnPlane(radial);
  if(tangent.lengthSq()<.0001)tangent.set(0,1,0).applyQuaternion(camera.quaternion).projectOnPlane(radial);
  orbitAssist={bodyId:body.id,axis:new THREE.Vector3().crossVectors(radial,tangent.normalize()).normalize(),clearanceM:600};
  panel();
}
function holdPlanetOrbit() {
  if (!state.body || renderer.xr.isPresenting) return;
  if (orbitAssist) { orbitAssist = null; panel(); return; }
  if (!flight) toggleFlight();
  autopilot = null; approachAltitude = null;
  planetLook = null;
  const center = vec(bodyPosition(state.body, state.sys!, epoch));
  const relative = vec(localPose()).sub(center);
  // Keep the entire assisted circle above the generator's maximum elevation.
  const safeRadius = state.body.radiusM + 20000 * Math.min(1, state.body.radiusM / 2e6) + 5000;
  if (relative.length() < safeRadius) {
    announce('Climb above the highest terrain before holding orbit.');
    return;
  }
  const radial = relative.clone().normalize();
  const tangent = new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion).projectOnPlane(radial);
  if (tangent.lengthSq() < .0001) tangent.set(1,0,0).applyQuaternion(camera.quaternion).projectOnPlane(radial);
  orbitAssist = {bodyId: state.body.id, axis: new THREE.Vector3().crossVectors(radial, tangent.normalize()).normalize()};
  panel();
}
function restartPlanetTiles() {
  planetTiles?.dispose(); planetTiles = null;
  if (!state.body || !surfaceMesh || state.body.type === 'Gas giant') return;
  planetTiles = new PlanetRenderer(state.body, surfaceMesh, focusRadius(), reliefScale);
}
function updatePlanetTiles(dt: number) {
  if (!planetTiles || !surfaceMesh) return;
  root.updateMatrixWorld(true);
  const eye = renderer.xr.isPresenting ? renderer.xr.getCamera().getWorldPosition(new THREE.Vector3()) : camera.position.clone();
  const local = planetTiles.group.worldToLocal(eye).toArray() as V3;
  const sun = vec(bodyPosition(state.sys!.stars[0], state.sys!, epoch))
    .sub(vec(bodyPosition(state.body!, state.sys!, epoch))).normalize().toArray() as V3;
  const views = renderer.xr.isPresenting ? renderer.xr.getCamera().cameras : [camera];
  const frusta = views.map(view => {
    view.updateMatrixWorld();
    return new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(view.projectionMatrix, view.matrixWorldInverse).multiply(planetTiles!.group.matrixWorld));
  });
  planetTiles.update(local, innerHeight, camera.fov, dt, renderer.xr.isPresenting, sun, frusta);
  if (!renderer.xr.isPresenting && state.body) {
    // Keep metre-scale depth precision without clipping the distant system.
    const center = bodyPosition(state.body, state.sys!, epoch);
    const info = surfaceClearance(state.body, localPose().map((v,i) => v - center[i]) as V3);
    const near = Math.max(1, Math.min(1000, info.terrainClearance * .005)) * systemUnit;
    if (Math.abs(camera.near - near) > near * .1) { camera.near = near; camera.updateProjectionMatrix(); }
  }
}
function updateSpace() {
  if (!space) return;
  const immersive = renderer.xr.isPresenting;
  const observer = immersive ? new THREE.Vector3() : camera.position.clone();
  if (
    !immersive &&
    !journey.active &&
    camera.position.length() > space.scale * 256 &&
    camera.position.distanceTo(controls.target) < space.scale * 256
  ) {
    const physical = space
      .physical(camera.position)
      .map((v) => Math.floor(v / 32) * 32) as V3;
    const delta = space.rebase(physical);
    camera.position.sub(delta);
    controls.target.sub(delta);
    homePos.sub(delta);
    homeTarget.sub(delta);
    observer.sub(delta);
  }
  space.update(
    observer,
    immersive,
    renderer.getPixelRatio(),
    Math.hypot(...space.physical(observer)) < space.galaxy.radiusLy * 1.4,
  );
  const stats = space.diagnostics();
  contextStats.nearbySystems = stats.nearbyStars;
  contextStats.skyPoints = stats.mapStars;
  if (spaceSelection) {
    const ref =
      space.find(selected || "") ||
      sectorData?.refs.find((r) => r.id === selected);
    spaceSelection.object.visible = !!ref;
    if (ref) {
      spaceSelection.object.position.copy(space.world(ref.position));
      spaceSelection.el.textContent = ref.name + " · selected";
    }
  }
}
function nameSector(c: V3) {
  return `Local stars · ${c.join(" · ")}`;
}
function orbitLine(b: Body, scale: number, sys: StarSystem, parent?: Body) {
  if (!b.orbit) return;
  const ps: THREE.Vector3[] = [];
  for (let i = 0; i <= 128; i++) {
    const p = orbitPosition(
      { ...b.orbit, anomaly: (i / 128) * Math.PI * 2 },
      0,
    );
    const origin = parent ? bodyPosition(parent, sys, 0) : [0, 0, 0];
    ps.push(
      new THREE.Vector3(...(p.map((v, j) => (v + origin[j]) * scale) as V3)),
    );
  }
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(ps),
    new THREE.LineBasicMaterial({
      color: b.kind === "moon" ? "#455d6b" : "#426071",
      transparent: true,
      opacity: 0.36,
    }),
  );
  line.userData.parent = parent;
  root.add(line);
  systemOrbits.push(line);
}
function sphere(b: Body, size: number) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(size, 40, 24),
    b.kind === "star"
      ? new THREE.MeshBasicMaterial({ color: b.color })
      : new THREE.MeshStandardMaterial({
          color: b.color,
          roughness: 0.83,
          metalness: 0,
        }),
  );
}
function surfaceMap(bytes: Uint8Array, data: Surface, color = false) {
  const texture = new THREE.DataTexture(
    bytes,
    data.width,
    data.height,
    THREE.RGBAFormat,
  );
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.flipY = true;
  texture.needsUpdate = true;
  return texture;
}
function applyRelief(
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>,
  body: Body,
  radius: number,
  data: Surface,
  multiplier: number,
) {
  const pos = mesh.geometry.attributes.position;
  let directions = mesh.geometry.userData.directions as
    | Float32Array
    | undefined;
  if (!directions) {
    directions = new Float32Array(pos.count * 3);
    for (let i = 0; i < directions.length; i++)
      directions[i] = (pos.array[i] as number) / radius;
    mesh.geometry.userData.directions = directions;
  }
  for (let i = 0; i < pos.count; i++) {
    const r = radius * (1 + (data.elevations[i] / body.radiusM) * multiplier);
    pos.setXYZ(
      i,
      directions[i * 3] * r,
      directions[i * 3 + 1] * r,
      directions[i * 3 + 2] * r,
    );
  }
  pos.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
  mesh.geometry.computeBoundingSphere();
  mesh.material.bumpScale =
    ((radius * ELEVATION_RANGE_M) / body.radiusM) * multiplier;
  if (mesh === surfaceMesh)
    controls.minDistance = mesh.geometry.boundingSphere!.radius * 1.025;
}
function terrainMesh(
  body: Body,
  radius: number,
  data: Surface,
  multiplier: number,
) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, data.segments, data.segments / 2),
    new THREE.MeshStandardMaterial({
      map: surfaceMap(data.data, data, true),
      bumpMap: surfaceMap(data.relief, data),
      roughnessMap: surfaceMap(data.roughness, data),
      roughness: 1,
      metalness: 0,
      color: "#ffffff",
    }),
  );
  applyRelief(mesh, body, radius, data, multiplier);
  return mesh;
}
async function refineSurface() {
  if (
    planetTiles ||
    journey.active ||
    refiningSurface ||
    !surfaceInfo ||
    surfaceInfo.width >= 2048 ||
    state.level !== "body"
  )
    return;
  const token = loadId,
    detailToken = bodyFocusToken,
    body = state.body!;
  refiningSurface = true;
  try {
    const data: Surface = await job("surface", {
      body,
      width: 2048,
      segments: 256,
    });
    if (
      token !== loadId ||
      detailToken !== bodyFocusToken ||
      state.body?.id !== body.id ||
      !surfaceMesh
    )
      return;
    const old = surfaceMesh;
    replaceTerrain(old, body, data, reliefScale);
    const next = old;
    surfaceMesh = next;
    surfaceInfo = data;
    controls.minDistance = next.geometry.boundingSphere!.radius * 1.025;
  } catch (error) {
    if (token === loadId)
      announce(
        "Orbital preview retained; higher detail could not be generated.",
      );
  } finally {
    if (token === loadId && detailToken === bodyFocusToken)
      refiningSurface = false;
  }
}

function drawSystem(data: {
  surfaces: (Surface & { id: string })[];
  sky: CloudData;
  galaxyClouds: NamedCloud[];
  localSky: CloudData & { localCount: number };
  sectorRefs: SystemRef[];
}) {
  const sys = state.sys!;
  residentSystem = sys.id;
  systemOrigin.set(0, 0, 0);
  systemUnit = systemLayout(sys, "physical").records[sys.stars[0].id]
    .orbitScale;
  camera.far = Math.max(1000, systemBoundary(sys)*systemUnit*4);
  camera.updateProjectionMatrix();
  drawGalacticSky(data.sky, sys.ref.position);
  drawGalaxyNeighbours(state.galaxy!, data.galaxyClouds, sys.ref.position);
  skyAnchor.add(pointCloud(data.localSky, 1, 0.65));
  contextStats.nearbySystems = data.localSky.sizes.length;
  contextStats.sectorStars = data.localSky.localCount;
  locationMap =
    makeLocationMap(data.sky) + makeSectorLocationMap(data.sectorRefs, sys.ref);
  displayLayout = systemLayout(sys, systemScale);
  for (const b of [...sys.stars, ...sys.planets, ...sys.moons]) {
    if (b.kind === "moon" && systemScale !== "physical") continue;
    const size =
      b.kind === "moon"
        ? b.radiusM * systemUnit
        : displayLayout.records[b.id].radius;
    const scale =
      b.kind === "moon" ? systemUnit : displayLayout.records[b.id].orbitScale;
    const surface = data.surfaces.find((s) => s.id === b.id);
    const mesh = surface ? terrainMesh(b, size, surface, 1) : sphere(b, size);
    mesh.position.copy(vec(bodyPosition(b, sys)).multiplyScalar(scale));
    mesh.userData.radius = size;
    mesh.userData.preview = surface;
    root.add(mesh);
    picks.push({ object: mesh, id: b.id, kind: "body" });
    animations.push({ obj: mesh, body: b, sys, scale });
    orbitLine(
      b,
      scale,
      sys,
      b.kind === "moon"
        ? sys.planets.find((p) => p.id === b.parentId)
        : undefined,
    );
    if (b.kind === "star") {
      const halo = sprite(b.color, size * 4);
      mesh.add(halo);
    }
    addLabel(
      mesh,
      b.name,
      b.kind === "star"
        ? "STAR"
        : `${sys.moons.filter((m) => m.parentId === b.id).length} moons`,
    );
    if (b.rings) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(size * 1.5, size * 2.3, 48),
        new THREE.MeshBasicMaterial({
          color: "#b8a284",
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      mesh.add(ring);
    }
  }
  for (const belt of sys.belts) {
    const mapRadius = (radius: number) => {
      const planets = sys.planets;
      const i = Math.max(
        1,
        planets.findIndex((p) => p.orbit!.a >= radius),
      );
      const a = planets[i - 1],
        b = planets[i];
      const t = (radius - a.orbit!.a) / (b.orbit!.a - a.orbit!.a);
      const low = a.orbit!.a * displayLayout!.records[a.id].orbitScale;
      const high = b.orbit!.a * displayLayout!.records[b.id].orbitScale;
      return low + (high - low) * t;
    };
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(
        mapRadius(belt.innerM),
        mapRadius(belt.outerM),
        128,
      ),
      new THREE.MeshBasicMaterial({
        color: "#6c7c87",
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    root.add(mesh);
    systemOrbits.push(mesh);
  }
  if (systemScale === "physical") {
    camera.near =
      Math.min(
        ...[...sys.stars, ...sys.planets, ...sys.moons].map((b) => b.radiusM * systemUnit),
      ) * 0.001;
    camera.updateProjectionMatrix();
    controls.minDistance = camera.near * 10;
  }
  const radius = displayLayout.radius;
  root.userData.viewRadius = radius;
  controls.maxDistance = Math.max(160, radius * 5);
  const outward = vec(sys.ref.position);
  outward.y = 0;
  if (outward.lengthSq() < 1) outward.set(1, 0, 0);
  outward.normalize();
  fit(
    outward
      .clone()
      .multiplyScalar(radius * 2.1)
      .add(
        new THREE.Vector3(-outward.z, 0, outward.x).multiplyScalar(
          radius * 0.6,
        ),
      )
      .add(new THREE.Vector3(0, radius * 0.65, 0)),
  );
  caption(
    "04 / STELLAR SYSTEM",
    sys.name,
    systemScale === "overview"
      ? "A spaced map of the system. Orbital phases are preserved; select a planet to approach its world."
      : "True relative distances and body radii. Use the catalogue to approach a small world.",
    [
      [String(sys.stars.length), "stars"],
      [String(sys.planets.length), "planets"],
      [String(sys.moons.length), "major moons"],
    ],
  );
  createSystemMarkers();
}
function createSystemMarkers() {
  if (systemMarkers) {
    root.remove(systemMarkers.points);
    systemMarkers.points.geometry.dispose();
    (systemMarkers.points.material as THREE.Material).dispose();
  }
  systemMarkers = new NavigationMarkers(animations.map(a => ({object:a.obj,
    radius:()=>a.obj.userData.radius * a.obj.scale.x,
    color:a.body.kind==='star'?a.body.color:a.body.kind==='moon'?'#bdcfdf':'#92d9ec',
    pixels:a.body.kind==='star'?18:a.body.kind==='moon'?7:10})));
  root.add(systemMarkers.points);
}
function updateNavigationVisibility() {
  systemMarkers?.update(innerHeight,renderer.getPixelRatio());
  if (state.level === 'universe' && !renderer.xr.isPresenting) {
    const focal=innerHeight/(2*Math.tan(camera.fov*Math.PI/360));
    for (const g of galaxyGlyphs) {
      const distance=g.group.position.distanceTo(camera.position);
      const visibleRadius=Math.max(g.radius,distance*22/focal);
      g.visual.scale.setScalar(visibleRadius/g.radius);
      g.pick.scale.setScalar(visibleRadius/(g.pick.geometry as THREE.SphereGeometry).parameters.radius);
    }
  }
}
function physicalSystem() {
  if (!residentSystem || systemScale === "physical") return;
  const before = camera.position.clone(),
    sys = state.sys!;
  systemScale = "physical";
  displayLayout = systemLayout(sys, "physical");
  for (const a of animations) {
    const mesh = a.obj as THREE.Mesh;
    const r = a.body.radiusM * systemUnit;
    mesh.scale.setScalar(r / mesh.userData.radius);
    a.scale = systemUnit;
  }
  for (const orbit of systemOrbits) {
    root.remove(orbit);
    (orbit as THREE.Line).geometry?.dispose();
    ((orbit as THREE.Line).material as THREE.Material)?.dispose();
  }
  systemOrbits = [];
  for (const a of animations) orbitLine(a.body, systemUnit, sys);
  for (const moon of sys.moons) {
    if (animations.some((a) => a.body.id === moon.id)) continue;
    const r = moon.radiusM * systemUnit,
      mesh = sphere(moon, r);
    mesh.userData.radius = r;
    root.add(mesh);
    picks.push({ object: mesh, id: moon.id, kind: "body" });
    animations.push({ obj: mesh, body: moon, sys, scale: systemUnit });
    addLabel(mesh, moon.name, "MOON");
    orbitLine(
      moon,
      systemUnit,
      sys,
      sys.planets.find((p) => p.id === moon.parentId),
    );
  }
  for (const belt of sys.belts) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(
        belt.innerM * systemUnit,
        belt.outerM * systemUnit,
        128,
      ),
      new THREE.MeshBasicMaterial({
        color: "#6c7c87",
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    root.add(mesh);
    systemOrbits.push(mesh);
  }
  positionSystem();
  camera.position.copy(before);
  camera.near =
    Math.min(...[...sys.stars,...sys.planets].map((b) => b.radiusM * systemUnit)) * 0.001;
  camera.far = Math.max(1000,(systemBoundary(sys)+systemOrigin.length())*systemUnit*4);
  camera.updateProjectionMatrix();
  createSystemMarkers();
}
function positionSystem() {
  for (const a of animations)
    a.obj.position.copy(
      vec(bodyPosition(a.body, a.sys, epoch))
        .sub(systemOrigin)
        .multiplyScalar(a.scale),
    );
  for (const orbit of systemOrbits) {
    const parent = orbit.userData.parent as Body | undefined;
    orbit.position
      .copy(
        parent
          ? vec(bodyPosition(parent, state.sys!, epoch)).sub(
              vec(bodyPosition(parent, state.sys!, 0)),
            )
          : new THREE.Vector3(),
      )
      .sub(systemOrigin)
      .multiplyScalar(systemUnit);
  }
}
function rebaseSystem(origin: THREE.Vector3) {
  const delta = origin.clone().sub(systemOrigin).multiplyScalar(systemUnit);
  systemOrigin.copy(origin);
  camera.position.sub(delta);
  controls.target.sub(delta);
  homePos.sub(delta);
  homeTarget.sub(delta);
  positionSystem();
}
function rescaleSystem(unit: number) {
  // Logarithmic depth loses local precision when an entire planet is much
  // smaller than one render unit. Preserve physical poses while using km-scale
  // render units near a world. Every system object keeps its identity.
  const ratio = unit / systemUnit;
  if (Math.abs(ratio - 1) < 1e-10) return;
  systemUnit = unit;
  for (const a of animations) { a.obj.scale.multiplyScalar(ratio); a.scale = unit; }
  for (const orbit of systemOrbits) orbit.scale.multiplyScalar(ratio);
  for (const p of [camera.position, controls.target, homePos, homeTarget]) p.multiplyScalar(ratio);
  controls.minDistance *= ratio; controls.maxDistance *= ratio;
  camera.near *= ratio;
  camera.far = Math.max(1000, (systemBoundary(state.sys!) + systemOrigin.length()) * unit * 4);
  camera.updateProjectionMatrix();
  if (displayLayout) {
    displayLayout.radius *= ratio;
    for (const r of Object.values(displayLayout.records)) { r.radius *= ratio; r.extent *= ratio; r.orbitScale *= ratio; }
  }
  positionSystem();
}
function focusRadius() {
  return state.body ? state.body.radiusM * systemUnit : 1;
}
function replaceTerrain(
  mesh: THREE.Mesh,
  body: Body,
  data: Surface,
  multiplier = 1,
) {
  const radius = body.radiusM * systemUnit,
    next = terrainMesh(body, radius, data, multiplier);
  const old = mesh.material as THREE.MeshStandardMaterial;
  for (const t of [old.map, old.bumpMap, old.roughnessMap]) t?.dispose();
  old.dispose();
  mesh.geometry.dispose();
  const ratio = radius / mesh.userData.radius;
  for (const child of mesh.children) child.scale.multiplyScalar(ratio);
  mesh.geometry = next.geometry;
  mesh.material = next.material;
  mesh.scale.setScalar(1);
  mesh.userData.radius = radius;
}
async function focusBody(body: Body, keepPose = false) {
  surfaceJourney=null;startCruiseAfterLook=false;
  planetTiles?.dispose(); planetTiles = null;
  orbitAssist = null;
  const token = ++bodyFocusToken,
    sys = state.sys!;
  if (!residentSystem) return;
  const started = performance.now(),
    focusDuration =
      renderer.xr.isPresenting ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 1800;
  if (!keepPose) {
    ready = false;
    journey = {
      ...journey,
      active: true,
      phase: "focus",
      from: state.level,
      to: "body",
    };
  }
  if (detailedBody && detailedBody.body.id !== body.id) {
    const old = detailedBody;
    if (old.mesh.userData.preview)
      replaceTerrain(old.mesh, old.body, old.mesh.userData.preview);
    else {
      const m = old.mesh.material as THREE.MeshStandardMaterial;
      [m.map, m.bumpMap, m.roughnessMap].forEach((t) => t?.dispose());
      m.dispose();
      old.mesh.geometry.dispose();
      old.mesh.geometry = new THREE.SphereGeometry(
        old.body.radiusM * systemUnit,
        40,
        20,
      );
      old.mesh.material = new THREE.MeshStandardMaterial({
        color: old.body.color,
      });
    }
  }
  physicalSystem();
  rescaleSystem(1 / 1e6);
  playing = false;
  // Retain every body, orbit and surrounding star in the same scene.
  rebaseSystem(vec(bodyPosition(body, sys, epoch)));
  state = { ...state, level: "body", body };
  selected = body.id;
  reliefScale = 1;
  const mesh = animations.find((a) => a.body.id === body.id)!.obj as THREE.Mesh;
  surfaceMesh = body.kind === "star" ? null : (mesh as typeof surfaceMesh);
  surfaceInfo = null;
  refiningSurface = false;
  const radius = focusRadius();
  controls.minDistance = radius * 1.025;
  controls.maxDistance = Math.max(160, systemBoundary(sys) * systemUnit * 3);
  root.userData.viewRadius = radius * 5;
  root.userData.focusRadius = radius;
  root.userData.space = true;
  light.position.copy(
    vec(bodyPosition(sys.stars[0], sys, epoch))
      .sub(systemOrigin)
      .normalize()
      .multiplyScalar(12),
  );
  light.target.position.set(0, 0, 0);
  if (!keepPose) {
    camera.up.set(0,1,0);
    const direction = light.position
      .clone()
      .normalize()
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.5)
      .add(new THREE.Vector3(0, 0.15, 0))
      .normalize();
    const to = direction.multiplyScalar(radius * 3.9);
    if (renderer.xr.isPresenting) {
      homePos.copy(to);
      homeTarget.set(0, 0, 0);
      vr?.reset();
    } else if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      camera.position.copy(to);
      controls.target.set(0, 0, 0);
      camera.lookAt(controls.target);
    } else
      tween = {
        from: camera.position.clone(),
        to,
        targetFrom: controls.target.clone(),
        targetTo: new THREE.Vector3(),
        start: performance.now(),
        duration: 1800,
        logarithmic: true,
      };
    homePos.copy(to);
    homeTarget.set(0, 0, 0);
  }
  caption(
    "05 / PLANETARY ORBIT",
    body.name,
    "Camera focused on this world. Its star system remains around you; fly away to continue your journey.",
    [
      [fmt(body.radiusM / 1000, 0) + " km", "radius"],
      [sys.name, "parent system"],
    ],
  );
  announce('Physical scale · continuous planetary terrain and system flight');
  breadcrumbs();
  panel();
  persist();
  if (body.kind !== "star")
    try {
      const data = await job("surface", { body, width: 1024, segments: 192 });
      if (
        token !== bodyFocusToken ||
        state.body?.id !== body.id ||
        !residentSystem
      )
        return;
      replaceTerrain(mesh, body, data);
      surfaceInfo = data;
      surfaceMesh = mesh as typeof surfaceMesh;
      detailedBody = { mesh, body };
      restartPlanetTiles();
    } catch (e) {
      announce(
        "The system remains available; terrain detail could not be prepared.",
      );
    }
  if (!keepPose) {
    await new Promise((r) =>
      setTimeout(r, Math.max(0, focusDuration - (performance.now() - started))),
    );
    if (token === bodyFocusToken) {
      ready = true;
      journey.active = false;
      journey.phase = "idle";
      journey.completed++;
      controls.enabled = !flight && !renderer.xr.isPresenting;
    }
  }
}
function unfocusBody(keepPose: boolean) {
  surfaceJourney=null;startCruiseAfterLook=false;
  planetLook = null;
  planetTiles?.dispose(); planetTiles = null;
  orbitAssist = null; approachAltitude = null;
  bodyFocusToken++;
  const sys = state.sys!;
  rescaleSystem(systemLayout(sys, 'physical').records[sys.stars[0].id].orbitScale);
  state = {
    level: "system",
    galaxy: state.galaxy,
    coords: state.coords,
    ref: state.ref,
    sys,
  };
  surfaceInfo = null;
  surfaceMesh = null;
  refiningSurface = false;
  selected = null;
  delete root.userData.focusRadius;
  controls.minDistance = systemUnit * 1000;
  root.userData.viewRadius = 15;
  if (!keepPose) {
    rebaseSystem(new THREE.Vector3());
    const to = new THREE.Vector3(15, 12, 25);
    homePos.copy(to);
    homeTarget.set(0, 0, 0);
    if (renderer.xr.isPresenting) vr?.reset();
    else
      tween = {
        from: camera.position.clone(),
        to,
        targetFrom: controls.target.clone(),
        targetTo: new THREE.Vector3(),
        start: performance.now(),
        duration: 1800,
        logarithmic: true,
      };
  }
  caption(
    "04 / STELLAR SYSTEM",
    sys.name,
    "Fly between worlds or focus a planet while keeping the surrounding system.",
    [],
  );
  breadcrumbs();
  panel();
  persist();
}

function bodyById(id: string) {
  return state.sys
    ? [...state.sys.stars, ...state.sys.planets, ...state.sys.moons].find(
        (b) => b.id === id,
      )
    : undefined;
}
function panel() {
  const content = $("panel-content");
  $("panel-kicker").textContent =
    state.level === "body" ? "WORLD INSPECTOR" : "EXPLORER";
  let html = "";
  if (state.level === "universe") {
    const g = catalogue.find((g) => g.id === selected);
    html = g
      ? `<span class="kicker">${g.type.toUpperCase()}</span><h2>${esc(g.name)}</h2><div class="code">${g.id}</div>${facts(
          [
            ["Diameter", fmt(g.radiusLy * 2, 0) + " ly"],
            ["Centre X", fmt(g.position[0], 3) + " Mpc"],
            ["Centre Y", fmt(g.position[1], 3) + " Mpc"],
            ["Centre Z", fmt(g.position[2], 3) + " Mpc"],
          ],
        )}<button class="explore" id="explore">Explore galaxy ↗</button>`
      : "<h2>The neighbourhood</h2><p>Pick a galaxy in the sky or the catalogue below. Every destination comes from your universe seed.</p>";
    html +=
      "<h3>Galaxies · 32</h3>" +
      catalogue
        .map((g) => item(g.id, g.name, g.type, "#b4d5ef", g.id === selected))
        .join("");
  }
  if (state.level === "galaxy") {
    const g = state.galaxy!;
    html = `<span class="kicker">${g.type.toUpperCase()}</span><h2>${esc(g.name)}</h2><p>Select a named star and approach it. Scroll over a star to zoom toward it, or switch to flight.</p>`;
    if (region) {
      html += `<div class="code">S(${region.join(", ")})</div>${facts([
        ["Sector width", "32 light-years"],
        ["X centre", fmt(region[0] * 32 + 16, 0) + " ly"],
        ["Y centre", fmt(region[1] * 32 + 16, 0) + " ly"],
        ["Z centre", fmt(region[2] * 32 + 16, 0) + " ly"],
      ])}<div class="layer-control"><button id="layer-down">−</button><span>Vertical layer ${region[1]}</span><button id="layer-up">+</button></div><button id="explore" class="explore">Approach this region ↗</button>`;
    } else
      html +=
        '<button class="explore" id="suggest-sector">Approach a populated region ↗</button>';
    html += contextPanel();
    html +=
      "<h3>Physical structure</h3>" +
      facts([
        ["Diameter", fmt(g.radiusLy * 2, 0) + " ly"],
        ["Structure", g.type],
        [
          "Arms",
          g.type.includes("spiral") || g.type === "Spiral"
            ? String(g.arms)
            : "—",
        ],
      ]) +
      '<p class="subtle">Mapped points are real catalogue systems. More stars stream into view as you approach; the whole galaxy stays in place.</p>';
  }
  if (state.level === "sector") {
    const ref =
      space?.find(selected || "") ||
      sectorData?.refs.find((r) => r.id === selected);
    html = `<span class="kicker">${esc(state.galaxy!.name)}</span><h2>Nearby star systems</h2><p>Fly freely through this part of the galaxy. Nearby stars are streamed around your position.</p>`;
    if (ref) {
      const s = system(ref);
      html += `<h2>${esc(ref.name)}</h2><div class="code">${esc(ref.id)}</div><div class="count-grid"><div>${s.stars.length}<small>stars</small></div><div>${s.planets.length}<small>planets</small></div><div>${s.moons.length}<small>moons</small></div></div><button class="explore" id="explore">Explore system ↗</button>`;
    }
    html +=
      contextPanel() +
      "<h3>Systems · " +
      fmt(sectorData!.refs.length, 0) +
      " resolved</h3>";
    if (!sectorData!.refs.length)
      html +=
        '<p class="empty">No catalogued stars in this immediate region. Keep flying or zoom out to find a denser part of the galaxy.</p>';
    html += sectorData!.refs
      .slice(0, 120)
      .map((r) =>
        item(r.id, r.name, "Stellar system", r.color, r.id === selected),
      )
      .join("");
    if (sectorData!.refs.length > 120)
      html +=
        '<p class="subtle">First 120 listed. Select other systems directly in the spatial view.</p>';
  }
  if (state.level === "system") {
    const sys = state.sys!,
      b = selected ? bodyById(selected) : null;
    html = `<span class="kicker">STELLAR SYSTEM</span><h2>${esc(sys.name)}</h2><div class="code">${esc(sys.id)}</div><div class="count-grid"><div>${sys.stars.length}<small>stars</small></div><div>${sys.planets.length}<small>planets</small></div><div>${sys.moons.length}<small>moons</small></div></div>`;
    if (b) {
      html += `<h2>${esc(b.name)}</h2><p>${esc(b.type)} · ${distance(b.radiusM)} radius</p><button class="explore" id="explore">View from orbit ↗</button>`;
    }
    html +=
      `<div class="mini-buttons"><button id="system-scale">${systemScale === "overview" ? "Physical scale" : "Spaced overview"}</button><button id="play">${playing ? "Ⅱ Pause" : "▷ Orbit playback"}</button><button id="epoch">Reset epoch</button><button id="bookmark">☆ Bookmark</button><button id="export">↓ Export</button></div>` +
      contextPanel() +
      "<h3>Stars</h3>" +
      sys.stars
        .map((b) => item(b.id, b.name, b.type, b.color, b.id === selected))
        .join("") +
      "<h3>Planets & moons</h3>" +
      sys.planets
        .map(
          (p) =>
            item(
              p.id,
              p.name,
              p.type + " · " + distance(p.orbit!.a),
              p.color,
              p.id === selected,
            ) +
            sys.moons
              .filter((m) => m.parentId === p.id)
              .map(
                (m) =>
                  `<div style="padding-left:14px">${item(m.id, m.name, "Moon of " + p.name, m.color, m.id === selected)}</div>`,
              )
              .join(""),
        )
        .join("");
    if (sys.belts.length)
      html +=
        "<h3>Belts</h3>" +
        sys.belts
          .map(
            (b) =>
              `<p>${esc(b.name)}<br><span class="subtle">${distance(b.innerM)} – ${distance(b.outerM)}</span></p>`,
          )
          .join("");
    html +=
      '<p class="subtle">The spaced overview separates orbital envelopes, including rings. Physical scale restores true relative positions and radii. Playback: 30 simulated days per second.</p>';
  }
  if (state.level === "body") {
    const b = state.body!,
      sys = state.sys!,
      parent = bodyById(b.parentId);
    html = `<span class="kicker">${b.kind.toUpperCase()}</span><h2>${esc(b.name)}</h2><p>${esc(b.type)}</p><div class="code">${esc(b.id)}</div>${facts(
      [
        ["Radius", distance(b.radiusM)],
        ["Mass", b.massKg.toExponential(3) + " kg"],
        ["Parent", parent?.name || sys.name],
        ["Orbit semi-major axis", b.orbit ? distance(b.orbit.a) : "Barycentre"],
        ["Eccentricity", b.orbit ? fmt(b.orbit.e, 3) : "—"],
      ],
    )}<div class="mini-buttons"><button id="export">↓ Export</button><button id="bookmark">☆ Bookmark</button></div>`;
    const moons = sys.moons.filter((m) => m.parentId === b.id);
    if (moons.length)
      html +=
        "<h3>Moons · " +
        moons.length +
        "</h3>" +
        moons.map((m) => item(m.id, m.name, "View moon", m.color)).join("");
    if (b.rings) html += `<p>${esc(b.name)}'s Pale Ring · ring system</p>`;
    html +=
      '<p class="subtle">Terrain flight approaches land and follows the ground at 600 m. Drag to look around; WASD or Q/E releases assistance. Free flight permits approach to 120 m over the terrain.</p>';
    if (b.kind !== "star" && b.type !== "Gas giant")
      html += `<div class="mini-buttons"><button id="approach">Approach low orbit</button><button id="descend">Descend to 10 km</button><button id="hold-orbit">${orbitAssist ? 'Release orbit' : 'Hold orbit'}</button><button id="relief">Terrain relief ×${reliefScale}</button></div><p class="subtle">The wheel adjusts flight speed. Low orbit and terrain flight retain the surrounding system. VR retains stationary model controls.</p>`;
  }
  {
    const mapped = space?.find(selected || "");
    const surfaceNav = state.level==='body' && state.body!.kind!=='star' && state.body!.type!=='Gas giant' ? '<button id="terrain-flight" class="explore">Fly over terrain</button>' : '';
    const nav = `<div class="mini-buttons"><button id="fly-target" ${selected ? "" : "disabled"}>Fly to selection</button><button id="fly-outward">Fly outward</button><button id="toggle-flight">${flight ? "Stop flight" : "Fly freely"}</button>${mapped ? '<button id="approach-star">Approach selected star</button>' : ""}</div><p class="subtle">Flight: drag to look · WASD move · Q/E down/up · wheel adjusts speed · Shift boosts · Esc stops. Touch: hold Fly forward below.</p><div class="mini-buttons"><button id="fly-forward">Hold: fly forward</button></div>`;
    if (state.level === "galaxy" && mapped)
      html =
        `<h2>${esc(mapped.name)}</h2><div class="code">${esc(mapped.id)}</div><button id="explore" class="explore">Visit this system ↗</button>` +
        html;
    html = surfaceNav + nav + html;
  }
  html +=
    '<details><summary>Seed & catalogue tools</summary><p class="code">' +
    esc(seed) +
    "<br>" +
    VERSION +
    '</p><div class="mini-buttons"><button id="verify">Verify seed</button><button id="copy">Copy view link</button></div><input id="address" placeholder="System address: G001/C…/0" aria-label="System catalogue address" style="width:100%"><button id="find-address" style="width:100%;margin-top:7px">Go to address</button><div id="bookmarks"></div></details>';
  content.innerHTML = html;
  content.scrollTop = 0;
  for (const btn of content.querySelectorAll<HTMLButtonElement>(
    "[data-select]",
  )) {
    btn.onclick = () => select(btn.dataset.select!);
    btn.ondblclick = () => {
      select(btn.dataset.select!);
      void explore();
    };
  }
  bind("explore", () => void explore());
  bind("toggle-flight", toggleFlight);
  bind("fly-target", beginTargetFlight);
  bind("fly-outward", flyOutward);
  bind("approach-star", () => {
    const ref =
      space?.find(selected || "") ||
      sectorData?.refs.find((r) => r.id === selected);
    if (ref)
      void navigateSpace("sector", {
        ref,
        coords: ref.cell.map((v) => Math.floor(v / 8)) as V3,
      });
  });
  const forward = document.getElementById("fly-forward");
  if (forward) {
    forward.onpointerdown = (e) => {
      if (!flight) toggleFlight();
      touchForwardHeld = true;
      flightKeys.add("w");
    };
    forward.onpointerup = () => flightKeys.delete("w");
    forward.onpointercancel = () => flightKeys.delete("w");
  }

  bind("toggle-context", () => {
    contextVisible = !contextVisible;
    contextRoot.visible = contextVisible;
    panel();
  });
  bind("suggest-sector", () => {
    region = [Math.floor((state.galaxy!.radiusLy * 0.16) / 32), 0, 0];
    panel();
  });
  bind("layer-down", () => {
    region![1]--;
    panel();
  });
  bind("layer-up", () => {
    region![1]++;
    panel();
  });
  bind("play", () => {
    playing = !playing;
    panel();
  });
  bind("system-scale", () => {
    systemScale = systemScale === "overview" ? "physical" : "overview";
    void navigate("system");
  });
  bind("approach", () => {
    if (renderer.xr.isPresenting) root.scale.multiplyScalar(1.35);
    else approachPlanet(Math.max(30000, Math.min(100000, state.body!.radiusM * .03)));
  });
  bind('descend', () => approachPlanet(10000));
  bind('terrain-flight', exploreTerrain);
  bind('hold-orbit', holdPlanetOrbit);
  bind("relief", () => {
    if (flight) toggleFlight();
    reliefScale = reliefScale === 1 ? 12 : 1;
    if (surfaceMesh && surfaceInfo) {
      applyRelief(
        surfaceMesh,
        state.body!,
        focusRadius(),
        surfaceInfo,
        reliefScale,
      );
      restartPlanetTiles();
      panel();
    }
  });
  bind("epoch", () => {
    playing = false;
    epoch = 0;
    panel();
  });
  bind("export", exportData);
  bind("bookmark", bookmark);
  bind("copy", () => {
    navigator.clipboard
      ?.writeText(location.href)
      .then(() => announce("View link copied."))
      .catch(() => announce("Copy the current address from your browser."));
  });
  bind("verify", () => void verify());
  bind("find-address", () => void findAddress());
  showBookmarks();
}
function bind(id: string, f: () => void) {
  const el = document.getElementById(id);
  if (el) el.onclick = f;
}
function select(id: string) {
  selected = id;
  panel();
  if (state.level === "universe") {
    const g = catalogue.find((x) => x.id === id);
    if (g) announce(g.name + " selected · double-click or press F to explore");
  } else
    announce(
      (bodyById(id)?.name ||
        sectorData?.refs.find((r) => r.id === id)?.name ||
        id) + " selected · press F to explore",
    );
}
async function explore() {
  const mapped = space?.find(selected || "");
  if (mapped) {
    await navigate("system", {
      ref: mapped,
      coords: mapped.cell.map((v) => Math.floor(v / 8)) as V3,
    });
    return;
  }

  if (state.level === "universe") {
    const galaxy = catalogue.find((g) => g.id === selected);
    if (galaxy) await navigate("galaxy", { galaxy });
  } else if (state.level === "galaxy" && region)
    await navigate("sector", { coords: [...region] });
  else if (state.level === "sector") {
    const ref =
      space?.find(selected || "") ||
      sectorData?.refs.find((r) => r.id === selected);
    if (ref) await navigate("system", { ref });
  } else {
    const body = selected ? bodyById(selected) : null;
    if (body) await navigate("body", { body });
  }
}
function parent() {
  if (state.level === "body") void navigate("system");
  else if (state.level === "system") void navigate("sector");
  else if (state.level === "sector") void navigate("galaxy");
  else if (state.level === "galaxy") void navigate("universe");
}
function exportData() {
  const data = {
    seed,
    version: VERSION,
    epochSeconds: epoch,
    galaxy: state.galaxy || null,
    sector: state.coords || null,
    system: state.sys || null,
    body: state.body || null,
    galaxies: state.level === "universe" ? catalogue : undefined,
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download =
    "universe-atlas-" +
    (state.body?.name || state.sys?.name || state.galaxy?.name || "catalogue") +
    ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function bookmark() {
  let bs: any[] = [];
  try {
    bs = JSON.parse(readStored("atlas-bookmarks") || "[]");
  } catch {}
  const url = location.search;
  const title =
    state.body?.name || state.sys?.name || state.galaxy?.name || "Universe";
  bs = bs.filter((b) => b.url !== url);
  bs.unshift({ title, url });
  saveStored("atlas-bookmarks", JSON.stringify(bs.slice(0, 20)));
  showBookmarks();
  announce(title + " bookmarked.");
}
function showBookmarks() {
  const el = document.getElementById("bookmarks");
  if (!el) return;
  try {
    const bs = JSON.parse(readStored("atlas-bookmarks") || "[]");
    el.innerHTML = bs.length
      ? "<h3>Bookmarks</h3>" +
        bs
          .filter(
            (b: any) => typeof b.url === "string" && b.url.startsWith("?seed="),
          )
          .map(
            (b: any) =>
              `<p><a style="color:#9fdcd8" href="${esc(b.url)}">${esc(b.title)}</a></p>`,
          )
          .join("")
      : "";
  } catch {
    el.textContent = "";
  }
}
async function verify() {
  announce("Verifying regenerated catalogue and worker output…", true);
  try {
    const a = JSON.stringify(galaxies(seed)),
      b = JSON.stringify(galaxies(seed));
    if (a !== b) throw Error("Galaxy mismatch");
    const g = state.galaxy || catalogue[0],
      coords = state.coords || [Math.floor((g.radiusLy * 0.16) / 32), 0, 0];
    const s1 = await job("sector", { galaxy: g, coords }),
      s2 = await job("sector", { galaxy: g, coords });
    if (JSON.stringify(s1) !== JSON.stringify(s2))
      throw Error("Sector mismatch");
    if (
      s1.refs[0] &&
      JSON.stringify(system(s1.refs[0])) !== JSON.stringify(system(s2.refs[0]))
    )
      throw Error("System mismatch");
    const bytes = new TextEncoder().encode(a + JSON.stringify(s1));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hex = Array.from(new Uint8Array(digest))
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
    announce(
      "Verified · same seed, positions, names and bodies · SHA-256 " +
        hex.slice(0, 16),
    );
    return hex;
  } catch (e) {
    announce("Verification failed: " + String(e));
    throw e;
  }
}
async function findAddress() {
  const value = (
    document.getElementById("address") as HTMLInputElement
  ).value.trim();
  const g = catalogue.find((x) => value.startsWith(x.id + "/"));
  const ref = g ? refByAddress(g, value) : null;
  if (!ref) {
    announce("No system at that address in this universe seed.");
    return;
  }
  await navigate("system", {
    galaxy: g,
    coords: ref.cell.map((v) => Math.floor(v / 8)) as V3,
    ref,
  });
}
function hitTest(x: number, y: number) {
  mouse.set((x / innerWidth) * 2 - 1, (-y / innerHeight) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  ray.params.Points!.threshold = state.level === "galaxy" ? 0.17 : 0.18;
  return pickRay(ray);
}
function pickRay(picker: THREE.Raycaster) {
  if (residentSystem && !renderer.xr.isPresenting) {
    let best: {object:THREE.Object3D;id:string;kind:string;title:string;score:number}|null=null;
    for (const a of animations) {
      const delta=a.obj.getWorldPosition(new THREE.Vector3()).sub(picker.ray.origin);
      const d=delta.length(), along=delta.dot(picker.ray.direction);
      if (along<=0) continue;
      const angle=delta.normalize().angleTo(picker.ray.direction);
      const tolerance=Math.max(a.obj.userData.radius*a.obj.scale.x/d, .014);
      if (angle<tolerance && (!best || angle<best.score)) best={object:a.obj,id:a.body.id,kind:'body',title:a.body.name,score:angle};
    }
    if (best) return best;
  }
  if (space) {
    root.updateMatrixWorld(true);
    let best: any = null,
      score = 0.007;
    const physical = space.diagnostics().positionLy;
    const point = new THREE.Vector3(),
      delta = new THREE.Vector3();
    for (const object of [space.anchors, space.nearby]) {
      const positions = object.geometry.attributes.position,
        refs = object.userData.refs as SystemRef[];
      for (let i = 0; i < positions.count; i++) {
        if (
          object === space.nearby &&
          Math.hypot(...refs[i].position.map((v, a) => v - physical[a])) > 31
        )
          continue;
        point
          .fromBufferAttribute(positions, i)
          .applyMatrix4(object.matrixWorld);
        delta.copy(point).sub(picker.ray.origin);
        const distance = delta.length(),
          forward = delta.dot(picker.ray.direction);
        if (forward <= 0) continue;
        const angle =
          delta.addScaledVector(picker.ray.direction, -forward).length() /
          distance;
        if (angle < score) {
          score = angle;
          best = {
            object,
            id: refs[i].id,
            kind: "catalogue-star",
            title: refs[i].name,
          };
        }
      }
    }
    return best;
  }
  const hits = picker.intersectObjects(
    picks.map((p) => p.object),
    false,
  );
  if (!hits.length) return null;
  const h = hits[0],
    p = picks.find((p) => p.object === h.object)!;
  if (p.kind === "catalogue-star") {
    const ref = (h.object.userData.refs as SystemRef[])[h.index!];
    return { ...p, id: ref.id, title: ref.name };
  }
  if (p.kind === "region") {
    const v = h.object.userData.physical as Float32Array;
    const i = h.index! * 3;
    return {
      ...p,
      coords: [
        Math.floor(v[i] / 32),
        Math.floor(v[i + 1] / 32),
        Math.floor(v[i + 2] / 32),
      ] as V3,
      title: "Explore this 32 ly sector",
    };
  }
  if (p.kind === "systems") {
    const ref = sectorData!.refs[h.index!];
    return { ...p, id: ref.id, title: ref.name };
  }
  return {
    ...p,
    title:
      catalogue.find((g) => g.id === p.id)?.name ||
      bodyById(p.id)?.name ||
      p.id,
  };
}
let down = { x: 0, y: 0 },
  hoverTime = 0;
let lookDragged = false;
renderer.domElement.addEventListener("pointerdown", (e) => {
  lookDragged = false;
  down = { x: e.clientX, y: e.clientY };
  tween = null;
});
renderer.domElement.addEventListener("pointermove", (e) => {
  if (!flight || !e.buttons) return;
  lookDragged = true;
  autopilot = null;
  planetLook = null;
  freeLook(camera.quaternion, e.movementX * .003, e.movementY * .003);
  controls.target
    .copy(camera.position)
    .add(
      camera
        .getWorldDirection(new THREE.Vector3())
        .multiplyScalar(flightUnit()),
    );
});
renderer.domElement.addEventListener(
  "wheel",
  (e) => {
    if (!flight) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    flightThrottle = THREE.MathUtils.clamp(
      flightThrottle * Math.exp(-e.deltaY * 0.003),
      0.1,
      64,
    );
  },
  { capture: true, passive: false },
);
window.addEventListener("keydown", (e) => {
  if (
    !flight ||
    (e.target as HTMLElement).matches("input,textarea") ||
    ($("help-dialog") as HTMLDialogElement).open
  )
    return;
  if (e.key === "Escape") {
    toggleFlight();
    return;
  }
  if (["w", "a", "s", "d", "q", "e", "shift"].includes(e.key.toLowerCase())) {
    e.preventDefault();
    autopilot = null;
    orbitAssist = null; approachAltitude = null;
    surfaceJourney=null;startCruiseAfterLook=false;
    planetLook = null;
    flightKeys.add(e.key.toLowerCase());
  }
});
window.addEventListener("keyup", (e) => flightKeys.delete(e.key.toLowerCase()));
window.addEventListener("pointerup", () => {if(touchForwardHeld){flightKeys.delete('w');touchForwardHeld=false;}});
window.addEventListener("blur", () => flightKeys.clear());
renderer.domElement.addEventListener("click", (e) => {
  if (flight && lookDragged) return;
  if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
  const h = hitTest(e.clientX, e.clientY);
  if (!h) return;
  if (h.kind === "region") {
    region = (h as any).coords;
    selected = null;
    panel();
    announce("Sector selected · double-click or Explore to resolve systems");
  } else select(h.id);
});
renderer.domElement.addEventListener("dblclick", (e) => {
  const h = hitTest(e.clientX, e.clientY);
  if (!h) return;
  if (h.kind === "region") region = (h as any).coords;
  else selected = h.id;
  void explore();
});
renderer.domElement.addEventListener("pointermove", (e) => {
  if (e.buttons || performance.now() - hoverTime < 100) return;
  hoverTime = performance.now();
  const h = hitTest(e.clientX, e.clientY);
  const el = $("hover");
  el.hidden = !h;
  if (h) {
    el.textContent = h.title;
    el.style.left = Math.min(e.clientX + 15, innerWidth - 220) + "px";
    el.style.top = e.clientY + 15 + "px";
    renderer.domElement.style.cursor = "pointer";
  } else renderer.domElement.style.cursor = "grab";
});
renderer.domElement.addEventListener("pointerleave", () => {
  $("hover").hidden = true;
});
$("generate").onclick = () => {
  const value = input.value.trim();
  if (!value) {
    announce("Enter a universe seed first.");
    return;
  }
  seed = value;
  catalogue = galaxies(seed);
  void navigate("universe");
};
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("generate").click();
});
$("back").onclick = parent;
$("reset").onclick = () => {
  if (flight) toggleFlight();
  fit(homePos.clone(), false, homeTarget.clone());
};
$("collapse").onclick = () => $("panel").classList.toggle("collapsed");
$("help").onclick = () => ($("help-dialog") as HTMLDialogElement).showModal();
$("close-help").onclick = () => ($("help-dialog") as HTMLDialogElement).close();
window.addEventListener("keydown", (e) => {
  if (
    (e.target as HTMLElement).matches("input,textarea") ||
    ($("help-dialog") as HTMLDialogElement).open
  )
    return;
  if (e.key === "Backspace") {
    e.preventDefault();
    parent();
  }
  if (e.key.toLowerCase() === "f") void explore();
  if (e.key === "Home") {
    e.preventDefault();
    if (flight) toggleFlight();
    fit(homePos.clone(), false, homeTarget.clone());
  }
});
addEventListener("resize", () => {
  if (renderer.xr.isPresenting) return;
  camera.aspect = innerWidth / innerHeight;
  updateCameraViewport();
  renderer.setSize(innerWidth, innerHeight);
});
function updateCameraViewport() {
  if (flight) camera.clearViewOffset();
  else camera.setViewOffset(
    innerWidth,
    innerHeight,
    innerWidth > 800 ? 130 : 60,
    0,
    innerWidth,
    innerHeight,
  );
  camera.updateProjectionMatrix();
}
renderer.domElement.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  ready = false;
  announce("Graphics context lost. Reload to restore the atlas.");
});
let last = performance.now();
const projected = new THREE.Vector3();
renderer.setAnimationLoop(() => {
  const now = performance.now(),
    dt = Math.min((now - last) / 1000, 0.1);
  frameMs = now - last;
  last = now;
  if (ready) {
    frameCount++;
    frameTimes.push(frameMs);
    if (frameTimes.length > 600) frameTimes.shift();
  }
  if (tween && !renderer.xr.isPresenting) {
    const t = Math.min(1, (now - tween.start) / tween.duration),
      s = t * t * (3 - 2 * t);
    controls.target.lerpVectors(tween.targetFrom, tween.targetTo, s);
    if (tween.logarithmic) {
      const a = tween.from.clone().sub(tween.targetFrom),
        b = tween.to.clone().sub(tween.targetTo);
      const d = Math.exp(
        THREE.MathUtils.lerp(Math.log(a.length()), Math.log(b.length()), s),
      );
      camera.position
        .copy(controls.target)
        .add(
          a.normalize().lerp(b.normalize(), s).normalize().multiplyScalar(d),
        );
    } else camera.position.lerpVectors(tween.from, tween.to, s);
    if (t === 1) tween = null;
  }
  if (!renderer.xr.isPresenting && !flight) controls.update();
  updateFlight(dt);
  if (!renderer.xr.isPresenting && (flight ? camera.view?.enabled : !camera.view?.enabled)) updateCameraViewport();
  vr?.update(dt);
  updatePlanetTiles(dt);
  updateSpace();
  updateNavigationVisibility();
  updateFlightHud();
  if (renderer.xr.isPresenting) {
    if (residentSystem) {
      const far = Math.max(
        1000,
        (systemBoundary(state.sys!) + systemOrigin.length()) *
          systemUnit *
          root.scale.x *
          2,
      );
      if (camera.far !== far) {
        camera.far = far;
        camera.updateProjectionMatrix();
      }
    }
    light.position.set(-8, 12, 14);
  } else if (
    state.level === "body" &&
    surfaceInfo &&
    camera.position.distanceTo(controls.target) < focusRadius() * 2.85
  )
    void refineSurface();
  if (renderer.xr.isPresenting) {
    skyAnchor.scale.setScalar(1 / root.scale.x);
    root.updateMatrixWorld(true);
    skyAnchor.position.copy(
      root.worldToLocal(
        renderer.xr.getCamera().getWorldPosition(new THREE.Vector3()),
      ),
    );
  } else {
    skyAnchor.scale.setScalar(1);
    skyAnchor.position.copy(camera.position);
  }
  root.updateMatrixWorld(true);
  if (viewBlend?.update(now)) {
    viewBlend = null;
    ready = true;
    journey.active = false;
    journey.phase = "idle";
    journey.completed++;
    controls.enabled = !renderer.xr.isPresenting && !flight;
  }
  if (playing) epoch += dt * 86400 * 30;
  positionSystem();
  const occluder = surfaceMesh?.getWorldPosition(new THREE.Vector3());
  const occupiedLabels: {x:number;y:number}[]=[];
  for (const l of labels) {
    l.object.getWorldPosition(projected);
    let occluded = l.object === surfaceMesh;
    if (occluder && l.object !== surfaceMesh) {
      const toLabel = projected.clone().sub(camera.position), length = toLabel.length();
      const toPlanet = occluder.clone().sub(camera.position), along = toPlanet.dot(toLabel.normalize());
      const radius = focusRadius() * .995;
      occluded = along > 0 && along < length && toPlanet.lengthSq() - along * along < radius * radius;
    }
    projected.project(camera);
    const x = (projected.x * 0.5 + 0.5) * innerWidth,
      y = (-projected.y * 0.5 + 0.5) * innerHeight;
    let visible =
      !renderer.xr.isPresenting &&
      !occluded &&
      l.object.visible &&
      !(l.object.userData.context && !contextVisible) &&
      projected.z < 1 &&
      projected.z > -1 &&
      x > 12 &&
      x < innerWidth - 320 &&
      y > 132 &&
      y < innerHeight - 210;
    if(visible && occupiedLabels.some(p=>Math.abs(p.x-x)<125&&Math.abs(p.y-y)<32))visible=false;
    if(visible)occupiedLabels.push({x,y});
    l.el.style.display = visible ? "block" : "none";
    if (visible) l.el.style.transform = `translate(${x + 9}px,${y - 6}px)`;
  }
  renderer.render(scene, camera);
  drawCount = renderer.info.render.calls;
  if (now - lastStats > 900) {
    lastStats = now;
    const sorted = [...frameTimes].sort((a, b) => a - b),
      p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    $("performance").textContent =
      `${state.level.toUpperCase()} · ${drawCount} draws · p95 ${p95.toFixed(0)} ms`;
  }
});
async function boot() {
  const q = new URLSearchParams(location.search);
  const g = catalogue.find((x) => x.id === q.get("g"));
  await navigate("universe");
  if (!g) return;
  const sc = q.get("sector")?.split(",").map(Number);
  const coords =
    sc?.length === 3 &&
    sc.every(
      (v) => Number.isSafeInteger(v) && Math.abs(v) * 32 < g.radiusLy * 1.5,
    )
      ? (sc as V3)
      : undefined;
  const ref = q.get("system") ? refByAddress(g, q.get("system")!) : null;
  if (ref) {
    const sys = system(ref),
      b = [...sys.stars, ...sys.planets, ...sys.moons].find(
        (b) => b.id === q.get("body"),
      );
    await navigate(b ? "body" : "system", {
      galaxy: g,
      coords: coords || (ref.cell.map((v) => Math.floor(v / 8)) as V3),
      ref,
      sys,
      body: b,
    });
  } else if (coords) await navigate("sector", { galaxy: g, coords });
  else await navigate("galaxy", { galaxy: g });
}
// Small, read-only diagnostics surface used by real browser acceptance tests.
Object.defineProperty(window, "__atlas", {
  value: {
    get state() {
      return state;
    },
    get seed() {
      return seed;
    },
    get ready() {
      return ready;
    },
    get transition() {
      return {
        ...journey,
        progress: viewBlend?.progress || 0,
        retainedViews: viewBlend ? 1 : 0,
      };
    },
    get travel() {
      return {
        active: flight,
        domain: flightDomain,
        speed: flightSpeed,
        throttle: flightThrottle,
        clearance: flightClearance,
        position: localPose(),
        heading: camera.quaternion.toArray(),
        crossings,
        crossing: !!crossing,
        autopilot,
        orbitAssist: orbitAssist ? {bodyId: orbitAssist.bodyId, axis: orbitAssist.axis.toArray()} : null,
        terrainCruise: orbitAssist?.clearanceM || null,
        surfaceJourney: !!surfaceJourney,
        approachAltitude,
        flightAim,
        surface: state.body ? surfaceClearance(state.body, localPose().map((v,i)=>v-bodyPosition(state.body!,state.sys!,epoch)[i]) as V3) : null,
        sceneId: root.uuid,
        residentSystem,
        bodies: animations.map((a) => ({
          id: a.body.id,
          objectId: a.obj.uuid,
          positionM: bodyPosition(a.body, a.sys, epoch),
        })),
      };
    },
    get space() {
      return space
        ? { ...space.diagnostics(), flight, speedLyPerSecond: flightSpeed }
        : null;
    },
    get mapTargets() {
      if (!space) return [];
      return space.refs
        .slice(0, 500)
        .map((ref) => {
          const p = space!
            .world(ref.position)
            .applyMatrix4(root.matrixWorld)
            .project(camera);
          return {
            id: ref.id,
            name: ref.name,
            position: ref.position,
            x: (p.x * 0.5 + 0.5) * innerWidth,
            y: (0.5 - p.y * 0.5) * innerHeight,
            z: p.z,
          };
        })
        .filter(
          (p) =>
            p.z > 0 &&
            p.z < 1 &&
            p.x > 200 &&
            p.x < innerWidth - 350 &&
            p.y > 180 &&
            p.y < innerHeight - 280,
        );
    },
    get navigationTargets() {
      const list = state.level==='universe'
        ? galaxyGlyphs.map((g,i)=>({id:catalogue[i].id,kind:'galaxy',object:g.group,pixels:44}))
        : animations.map(a=>({id:a.body.id,kind:a.body.kind,object:a.obj,pixels:a.body.kind==='star'?18:a.body.kind==='moon'?7:10}));
      return list.map(t=>{const p=t.object.getWorldPosition(new THREE.Vector3()).project(camera);return {id:t.id,kind:t.kind,pixels:t.pixels,x:(p.x*.5+.5)*innerWidth,y:(.5-p.y*.5)*innerHeight,z:p.z};});
    },
    get selected() {
      return selected;
    },
    get frameCount() {
      return frameCount;
    },
    get stats() {
      return {
        draws: drawCount,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        pending: pending.size,
        frameTimes: [...frameTimes],
      };
    },
    get context() {
      return {
        ...contextStats,
        visible: contextRoot.visible,
        skyPosition: skyAnchor.position.toArray(),
      };
    },
    get vr() {
      return vr?.diagnostics();
    },
    get systemView() {
      return displayLayout
        ? {
            mode: systemScale,
            epoch,
            bodies: animations.map((a) => ({
              position: a.obj.position.toArray(),
              ...displayLayout!.records[a.body.id],
            })),
          }
        : null;
    },
    get terrain() {
      return surfaceInfo
        ? {
            version: surfaceInfo.version,
            width: surfaceInfo.width,
            segments: surfaceInfo.segments,
            reliefScale,
            landFraction: surfaceInfo.landFraction,
            vertices: surfaceMesh?.geometry.attributes.position.count,
            refining: refiningSurface,
            tiles: planetTiles?.diagnostics() || null,
          }
        : null;
    },
    get camera() {
      return {
        fov: camera.fov,
        near: camera.near,
        far: camera.far,
        viewOffset: camera.view?.enabled ? camera.view.offsetX : 0,
        position: camera.position.toArray(),
        target: controls.target.toArray(),
      };
    },
    verify,
  },
  writable: false,
});
function vrMenu(): VRMenu {
  const title = $("view-title").textContent || "Universe Atlas";
  const detail = selected
    ? (space?.find(selected)?.name ||
        bodyById(selected)?.name ||
        sectorData?.refs.find((r) => r.id === selected)?.name ||
        catalogue.find((g) => g.id === selected)?.name ||
        "") + " selected"
    : state.level.toUpperCase() + " · " + seed;
  let rows: VRMenu["rows"] = [];
  if (state.level === "universe")
    rows = catalogue.map((g) => ({
      title: g.name,
      detail: g.type,
      action: () => select(g.id),
    }));
  if (state.level === "galaxy")
    rows = [
      {
        title: region ? nameSector(region) : "Approach a populated region",
        detail: "Or select a named star below or in the model",
        action: () => {
          region ||= [Math.floor((state.galaxy!.radiusLy * 0.16) / 32), 0, 0];
          selected = null;
          void explore();
        },
      },
      ...(space?.refs.slice(0, 120) || []).map((ref) => ({
        title: ref.name,
        detail: ref.id,
        action: () => select(ref.id),
      })),
    ];
  if (state.level === "sector")
    rows = (sectorData?.refs || []).slice(0, 120).map((r) => ({
      title: r.name,
      detail: r.id,
      action: () => select(r.id),
    }));
  if (state.level === "system")
    rows = [
      ...state.sys!.stars,
      ...state.sys!.planets,
      ...state.sys!.moons,
    ].map((b) => ({
      title: b.name,
      detail: b.type,
      action: () => select(b.id),
    }));
  if (state.level === "body")
    rows = [
      {
        title: state.body!.name,
        detail:
          state.body!.type + " · " + distance(state.body!.radiusM) + " radius",
        action: () => vr?.reset(),
      },
      ...state
        .sys!.moons.filter((m) => m.parentId === state.body!.id)
        .map((m) => ({
          title: m.name,
          detail: "Explore moon",
          action: () => void navigate("body", { body: m }),
        })),
    ];
  if (state.level === "system")
    rows.push(
      {
        title:
          systemScale === "overview"
            ? "Switch to physical scale"
            : "Switch to spaced overview",
        detail: "Change distance and radius presentation",
        action: () => document.getElementById("system-scale")?.click(),
      },
      {
        title: playing ? "Pause orbits" : "Play orbits",
        detail: "30 simulated days per second",
        action: () => document.getElementById("play")?.click(),
      },
    );
  if (
    state.level === "body" &&
    state.body!.kind !== "star" &&
    state.body!.type !== "Gas giant"
  )
    rows.unshift(
      {
        title: "Approach orbit",
        detail: "Bring the planet closer for terrain inspection",
        action: () => document.getElementById("approach")?.click(),
      },
      {
        title: "Terrain relief ×" + reliefScale,
        detail: "Toggle physical / exaggerated elevation",
        action: () => document.getElementById("relief")?.click(),
      },
    );
  return {
    key:
      state.level +
      ":" +
      (state.body?.id ||
        state.sys?.id ||
        state.coords?.join(",") ||
        state.galaxy?.id ||
        seed),
    title,
    detail,
    rows,
    actions: [
      { title: "← Back", action: parent },
      { title: "Fit model", action: () => vr?.reset() },
      { title: "Explore selection", action: () => void explore() },
      { title: "Exit VR", action: () => void renderer.xr.getSession()?.end() },
    ],
  };
}
vr = new AtlasVR(renderer, scene, camera, {
  root: () => root,
  menu: vrMenu,
  start: () => {
    flight = false;
    orbitAssist = null; approachAltitude = null; planetLook = null; autopilot = null;
    surfaceJourney=null;startCruiseAfterLook=false;
    flightKeys.clear();
    camera.near = 0.02;
    camera.updateProjectionMatrix();
    if (viewBlend) {
      viewBlend.finish();
      viewBlend = null;
      ready = true;
      journey.active = false;
      journey.phase = "idle";
    }
    tween = null;
    controls.enabled = false;
    playing = false;
    announce("VR · use the in-world panel and controller triggers");
  },
  end: () => {
    camera.far = residentSystem
      ? Math.max(1000, (systemBoundary(state.sys!) + systemOrigin.length()) * systemUnit * 4)
      : 1000;
    camera.near = residentSystem
      ? focusRadius() * 0.0001
      : space
        ? space.scale * 0.02
        : 0.02;
    camera.updateProjectionMatrix();
    if (viewBlend) {
      viewBlend.finish();
      viewBlend = null;
      ready = true;
      journey.active = false;
      journey.phase = "idle";
    }
    controls.enabled = ready;
    fit(homePos.clone(), true, homeTarget.clone());
    if (state.level === "body" && state.body!.kind !== "star")
      light.position.copy(
        vec(bodyPosition(state.sys!.stars[0], state.sys!))
          .sub(vec(bodyPosition(state.body!, state.sys!)))
          .normalize()
          .multiplyScalar(12),
      );
    else light.position.set(-12, 5, 10);
    announce("Returned to desktop view");
  },
  status: announce,
  pick: (picker, activate) => {
    const h = pickRay(picker);
    if (!h) return "";
    if (activate) {
      if (h.kind === "region") {
        region = (h as any).coords;
        panel();
      } else if (selected === h.id) void explore();
      else select(h.id);
    }
    return h.title;
  },
});
void boot();
