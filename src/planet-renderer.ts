import * as THREE from 'three';
import { type Body, type V3 } from './catalog.ts';
import { children, tileDirection, closestTileDirection, tileKey, type Tile, type buildTile } from './planet-tiles.ts';
import { PlanetAtmosphere } from './planet-atmosphere.ts';

type Patch = { tile: Tile; mesh: THREE.Mesh; map: THREE.DataTexture; material: THREE.MeshStandardMaterial; morph: {value: number}; touched: number };
const ROOTS: Tile[] = Array.from({length: 6}, (_,face) => ({face, level: 0, x: 0, y: 0}));
export const TILE_CACHE_LIMIT = 256;
export const TILE_DRAW_LIMIT = 150;

/** One resident planet, a bounded cache, and one dedicated CPU worker. */
export class PlanetRenderer {
  readonly group = new THREE.Group();
  private worker = new Worker(new URL('./planet-worker.ts', import.meta.url), {type: 'module'});
  private patches = new Map<string, Patch>();
  private pending = new Set<string>();
  private inbox: {key: string; result?: ReturnType<typeof buildTile>; error?: string}[] = [];
  private frame = 0;
  private disposed = false;
  private active = new Set<string>();
  private rootsReady = false;
  private failures = new Set<string>();
  private previous = new Set<string>();
  private originalMaterial: THREE.Material | THREE.Material[];
  private atmosphere: PlanetAtmosphere | null = null;
  private eyeUniform = {value:new THREE.Vector3()};
  private sunUniform = {value:new THREE.Vector3(1,0,0)};
  constructor(readonly body: Body, private host: THREE.Mesh, radius: number, readonly relief = 1) {
    this.group.name = 'Planet terrain patches';
    this.group.scale.setScalar(radius);
    this.group.visible = false;
    host.add(this.group);
    this.originalMaterial = host.material;
    if (body.kind === 'planet' && body.water > 0) {
      this.atmosphere = new PlanetAtmosphere(body);
      this.group.add(this.atmosphere.mesh);
    }
    this.worker.onmessage = ({data}) => { if (!this.disposed) this.inbox.push(data); };
    this.worker.onerror = () => {
      for (const key of this.pending) this.failures.add(key);
      this.pending.clear();
    };
  }
  private materialVisible(visible: boolean) {
    for (const m of Array.isArray(this.originalMaterial) ? this.originalMaterial : [this.originalMaterial]) m.visible = visible;
  }
  private install(key: string, d: ReturnType<typeof buildTile>) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(d.positions, 3));
    geometry.setAttribute('parentPosition', new THREE.BufferAttribute(d.parents, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(d.normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(d.uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(d.indices, 1));
    geometry.computeBoundingSphere();
    const map = new THREE.DataTexture(d.color, d.width, d.width);
    map.colorSpace = THREE.SRGBColorSpace;
    map.minFilter = map.magFilter = THREE.LinearFilter;
    map.generateMipmaps = false;
    map.needsUpdate = true;
    const material = new THREE.MeshStandardMaterial({map, roughness: this.body.water ? .72 : .95});
    const morph = {value: 0};
    material.onBeforeCompile = shader => {
      shader.uniforms.patchMorph = morph;
      shader.uniforms.tileAnchor={value:new THREE.Vector3(...d.anchor)};
      shader.uniforms.atlasEye=this.eyeUniform;shader.uniforms.atlasSun=this.sunUniform;
      shader.uniforms.atlasRadius={value:this.body.radiusM};
      shader.uniforms.atlasAir={value:this.atmosphere?1:0};
      shader.vertexShader = 'attribute vec3 parentPosition; uniform float patchMorph; uniform vec3 tileAnchor; varying vec3 atlasSurface;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = mix(parentPosition, position, patchMorph); atlasSurface=transformed+tileAnchor;');
      shader.fragmentShader='uniform vec3 atlasEye,atlasSun;uniform float atlasRadius,atlasAir;varying vec3 atlasSurface;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>', `
        float airHeight=max(0.0,((length(atlasEye)+length(atlasSurface))*.5-1.0)*atlasRadius);
        float airDistance=length(atlasEye-atlasSurface)*atlasRadius;
        float airFog=atlasAir*min(.97,1.0-exp(-airDistance/65000.0*exp(-airHeight/14000.0)));
        float daylight=smoothstep(-.15,.15,dot(normalize(atlasSurface),atlasSun));
        outgoingLight=mix(outgoingLight,mix(vec3(.008,.016,.035),vec3(.23,.43,.64),daylight),airFog);
        #include <opaque_fragment>`);
    };
    material.customProgramCacheKey = () => 'planet-patch-morph-haze-v2';
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...d.anchor);
    mesh.visible = false;
    mesh.userData.planetTile = key;
    // CPU culling below uses a conservative bound covering both morph endpoints.
    mesh.frustumCulled = false;
    this.group.add(mesh);
    this.patches.set(key, {tile: d.tile, mesh, map, material, morph, touched: this.frame});
  }
  update(observer: V3, height: number, fov: number, dt: number, immersive = false, sun: V3 = [1,0,0], frusta: THREE.Frustum[] = []) {
    if (this.disposed) return;
    this.frame++;
    // At most two completions become GPU resources per animation frame.
    for (const message of this.inbox.splice(0, 2)) {
      this.pending.delete(message.key);
      if (message.result) this.install(message.key, message.result);
      else this.failures.add(message.key);
    }
    const wanted: Tile[] = [], protectedKeys = new Set<string>();
    const request = (t: Tile) => {
      const key = tileKey(t);
      protectedKeys.add(key);
      if (!this.patches.has(key) && !this.pending.has(key) && !this.failures.has(key)) wanted.push(t);
    };
    for (const t of ROOTS) request(t);
    this.rootsReady = ROOTS.every(t => this.patches.has(tileKey(t)));
    this.group.visible = this.rootsReady;
    this.materialVisible(!this.rootsReady);
    const eye = new THREE.Vector3(...observer), distance = eye.length();
    this.eyeUniform.value.copy(eye);this.sunUniform.value.set(...sun);
    this.atmosphere?.update(eye, new THREE.Vector3(...sun));
    const direction = eye.clone().normalize();
    const pixels = height / (2 * Math.tan(fov * Math.PI / 360));
    const projected = (t: Tile) => {
      const center = new THREE.Vector3(...tileDirection(t, .5, .5));
      const span = 2 / 2 ** t.level, bound = Math.min(1.8, span * 1.42);
      // Conservative horizon test, expanded for the highest possible terrain.
      const margin = 20000 * this.relief / this.body.radiusM;
      const horizon = distance < 1 + margin || direction.dot(center) + bound >= (1 - margin) / distance;
      const sphere = new THREE.Sphere(center, bound + margin);
      const visible = horizon && (!frusta.length || frusta.some(f => f.intersectsSphere(sphere)));
      const near = Math.max(.000001, eye.distanceTo(new THREE.Vector3(...closestTileDirection(t,observer))));
      // Projected patch span also budgets texture resolution. It deliberately
      // overestimates error instead of claiming a measured terrain error bound.
      return {visible, score: visible ? span * pixels / near : 0};
    };
    const leaves = [...ROOTS];
    if (this.rootsReady) {
      for (let iteration = 0; iteration < 180; iteration++) {
        const candidates = leaves.map(t => ({t, ...projected(t)})).filter(p => p.t.level < 16 && p.score > (immersive ? 360 : 260));
        candidates.sort((a, b) => b.score - a.score);
        let split = false;
        for (const {t} of candidates) {
          if (leaves.length + 3 > (immersive ? 102 : TILE_DRAW_LIMIT)) break;
          const kids = children(t);
          kids.forEach(request);
          if (leaves.length + 3 <= (immersive ? 102 : TILE_DRAW_LIMIT) && kids.every(k => this.patches.has(tileKey(k)))) {
            leaves.splice(leaves.indexOf(t), 1, ...kids);
            split = true;
            break;
          }
        }
        if (!split) break;
      }
    }
    this.active.clear();
    for (const p of this.patches.values()) p.mesh.visible = false;
    for (const t of leaves) {
      const key = tileKey(t), p = this.patches.get(key);
      protectedKeys.add(key);
      if (!p) continue;
      p.touched = this.frame;
      p.mesh.visible = projected(t).visible && this.rootsReady;
      if (p.mesh.visible) this.active.add(key);
      if (!this.previous.has(key)) p.morph.value = t.level ? 0 : 1;
      p.morph.value = Math.min(1, p.morph.value + dt / .22);
    }
    this.previous = new Set(leaves.map(tileKey));
    // Retain ancestor fallback meshes; evict unused children first. Bound also
    // includes pending work, so late completions cannot grow the cache forever.
    for (const p of [...this.patches.values()].sort((a,b) => a.touched - b.touched)) {
      if (this.patches.size + this.pending.size < TILE_CACHE_LIMIT - 2) break;
      const key = tileKey(p.tile);
      if (!protectedKeys.has(key)) { this.release(p); this.patches.delete(key); }
    }
    const unique = new Map(wanted.map(t => [tileKey(t), t]));
    for (const [key, tile] of unique) {
      if (this.pending.size >= 2 || this.patches.size + this.pending.size >= TILE_CACHE_LIMIT) break;
      this.pending.add(key);
      this.worker.postMessage({key, tile, body: this.body, relief: this.relief});
    }
  }
  diagnostics() {
    return {projection: 'cube-sphere', ready: this.rootsReady, resident: this.patches.size, pending: this.pending.size, visible: this.active.size,
      maxLevel: Math.max(0, ...[...this.active].map(k => this.patches.get(k)!.tile.level)), cacheLimit: TILE_CACHE_LIMIT,
      failures: this.failures.size, faces: [...new Set([...this.active].map(k => Number(k.split('/')[0])))],
      vertices: [...this.active].reduce((n,k) => n + this.patches.get(k)!.mesh.geometry.attributes.position.count, 0)};
  }
  private release(p: Patch) { this.group.remove(p.mesh); p.mesh.geometry.dispose(); p.map.dispose(); p.material.dispose(); }
  dispose() {
    this.disposed = true;
    this.worker.terminate();
    this.atmosphere?.dispose();
    this.materialVisible(true);
    for (const p of this.patches.values()) this.release(p);
    this.patches.clear(); this.pending.clear(); this.inbox = [];
    this.host.remove(this.group);
  }
}
