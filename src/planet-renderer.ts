import * as THREE from 'three';
import { type Body, type V3 } from './catalog.ts';
import { children, tileDirection, closestTileDirection, tileKey, directionTile, tileNeighbour, PATCH_SEGMENTS, type Tile, type buildTile } from './planet-tiles.ts';
import {terrainSampler} from './terrain.ts';
import { PlanetAtmosphere } from './planet-atmosphere.ts';
import {contactGeometry,type ContactPatch} from './terrain-contact.ts';

type Patch = { tile: Tile; mesh: THREE.Mesh; map: THREE.DataTexture; material: THREE.MeshStandardMaterial; morph: {value: number}; edge:{value:THREE.Vector4}; data:ReturnType<typeof buildTile>; bytes:number; touched: number };
const ROOTS: Tile[] = Array.from({length: 6}, (_,face) => ({face, level: 0, x: 0, y: 0}));
export const TILE_CACHE_LIMIT = 256;
export const TILE_DRAW_LIMIT = 150;

/** One resident planet, a bounded cache, and one dedicated CPU worker. */
export class PlanetRenderer {
  readonly group = new THREE.Group();
  private worker!:Worker;
  private workerGeneration=0;
  private workerRestarts=0;
  private retryAfter=new Map<string,number>();
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
  private contactFocus:V3|null=null;
  private sample:ReturnType<typeof terrainSampler>;
  private leafIndex=new Map<string,Tile>();
  private retries=new Map<string,number>();
  private failuresTotal=0;
  private contactGeometryCache=new Map<string,ContactPatch>();
  private contactOrigin='';
  private selectionEye=new THREE.Vector3(Infinity,Infinity,Infinity);
  private selectionContact=false;
  private selectionFrame=0;
  private updateMs=0;
  readonly contactLevel:number;
  setContactFocus(point:V3|null) { this.contactFocus=point; }
  constructor(readonly body: Body, private host: THREE.Mesh, radius: number, readonly relief = 1) {
    this.sample=terrainSampler(body);
    this.contactLevel=Math.max(14,Math.min(20,Math.ceil(Math.log2(2*body.radiusM/(PATCH_SEGMENTS*1.4)))));
    this.group.name = 'Planet terrain patches';
    this.group.scale.setScalar(radius);
    this.group.visible = false;
    host.add(this.group);
    this.originalMaterial = host.material;
    if (body.kind === 'planet' && body.water > 0) {
      this.atmosphere = new PlanetAtmosphere(body);
      this.group.add(this.atmosphere.mesh);
    }
    this.startWorker();
  }
  private startWorker(){
    const generation=++this.workerGeneration;
    this.worker=new Worker(new URL('./planet-worker.ts',import.meta.url),{type:'module'});
    this.worker.onmessage=({data})=>{if(!this.disposed&&generation===this.workerGeneration)this.inbox.push(data);};
    this.worker.onerror=(event)=>{
      event.preventDefault();if(this.disposed||generation!==this.workerGeneration)return;
      this.worker.terminate();for(const key of this.pending)this.failed(key);this.pending.clear();this.inbox=[];
      if(this.workerRestarts++<3)this.startWorker();
      else for(const t of ROOTS)this.failures.add(tileKey(t));
    };
  }
  private failed(key:string) {
    this.failuresTotal++;
    const attempt=(this.retries.get(key)||0)+1;this.retries.set(key,attempt);
    this.retryAfter.set(key,this.frame+30*2**attempt);
    if(attempt>=3)this.failures.add(key);
  }
  private materialVisible(visible: boolean) {
    for (const m of Array.isArray(this.originalMaterial) ? this.originalMaterial : [this.originalMaterial]) m.visible = visible;
  }
  private install(key: string, d: ReturnType<typeof buildTile>) {
    this.retries.delete(key);this.retryAfter.delete(key);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(d.positions, 3));
    geometry.setAttribute('parentPosition', new THREE.BufferAttribute(d.parents, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(d.normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(d.uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(d.indices, 1));
    geometry.computeBoundingSphere();
    const map = new THREE.DataTexture(d.color, d.width, d.width);
    map.colorSpace = THREE.SRGBColorSpace;
    map.minFilter = THREE.LinearMipmapLinearFilter;map.magFilter = THREE.LinearFilter;
    map.generateMipmaps = true;
    map.needsUpdate = true;
    const material = new THREE.MeshStandardMaterial({map, roughness: this.body.water ? .72 : .95});
    const morph = {value: 0};
    const edge={value:new THREE.Vector4()};
    material.onBeforeCompile = shader => {
      shader.uniforms.patchMorph = morph;
      shader.uniforms.patchEdges=edge;
      shader.uniforms.patchTexels={value:d.width-2};
      shader.uniforms.tileAnchor={value:new THREE.Vector3(...d.anchor)};
      shader.uniforms.atlasEye=this.eyeUniform;shader.uniforms.atlasSun=this.sunUniform;
      shader.uniforms.atlasRadius={value:this.body.radiusM};
      shader.uniforms.atlasAir={value:this.atmosphere?1:0};
      shader.vertexShader = 'attribute vec3 parentPosition; uniform float patchMorph,patchTexels; uniform vec4 patchEdges; uniform vec3 tileAnchor; varying vec3 atlasSurface;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `vec2 gridUV=(uv*(patchTexels+2.0)-1.0)/patchTexels;
        float lockEdge=max(max((1.0-step(.00001,gridUV.x))*patchEdges.x,step(.99999,gridUV.x)*patchEdges.y),max((1.0-step(.00001,gridUV.y))*patchEdges.z,step(.99999,gridUV.y)*patchEdges.w));
        vec3 transformed = mix(parentPosition, position, patchMorph*(1.0-lockEdge)); atlasSurface=transformed+tileAnchor;`);
      shader.fragmentShader='uniform vec3 atlasEye,atlasSun;uniform float atlasRadius,atlasAir;varying vec3 atlasSurface;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>', `
        float airHeight=max(0.0,((length(atlasEye)+length(atlasSurface))*.5-1.0)*atlasRadius);
        float airDistance=length(atlasEye-atlasSurface)*atlasRadius;
        float airFog=atlasAir*min(.97,1.0-exp(-airDistance/65000.0*exp(-airHeight/14000.0)));
        float daylight=smoothstep(-.15,.15,dot(normalize(atlasSurface),atlasSun));
        outgoingLight=mix(outgoingLight,mix(vec3(.008,.016,.035),vec3(.23,.43,.64),daylight),airFog);
        #include <opaque_fragment>`);
    };
    material.customProgramCacheKey = () => 'planet-patch-stitched-v3';
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...d.anchor);
    mesh.visible = false;
    mesh.userData.planetTile = key;
    // CPU culling below uses a conservative bound covering both morph endpoints.
    mesh.frustumCulled = false;
    this.group.add(mesh);
    const bufferBytes=d.positions.byteLength+d.parents.byteLength+d.normals.byteLength+d.uvs.byteLength+d.indices.byteLength;
    const bytes=bufferBytes*2+Math.ceil(d.color.byteLength*(1+4/3));
    this.patches.set(key, {tile: d.tile, mesh, map, material, morph, edge,data:d,bytes,touched: this.frame});
  }
  update(observer: V3, height: number, fov: number, dt: number, immersive = false, sun: V3 = [1,0,0], frusta: THREE.Frustum[] = []) {
    if (this.disposed) return;
    const started=performance.now();
    this.frame++;
    // At most two completions become GPU resources per animation frame.
    const completions=this.inbox.splice(0,2);
    for (const message of completions) {
      this.pending.delete(message.key);
      if (message.result) this.install(message.key, message.result);
      else this.failed(message.key);
    }
    const wanted: Tile[] = [], protectedKeys = new Set<string>();
    const request = (t: Tile) => {
      const key = tileKey(t);
      protectedKeys.add(key);
      if (!this.patches.has(key) && !this.pending.has(key) && !this.failures.has(key)&&(this.retryAfter.get(key)||0)<=this.frame) wanted.push(t);
    };
    for (const t of ROOTS) request(t);
    this.rootsReady = ROOTS.every(t => this.patches.has(tileKey(t)));
    this.group.visible = this.rootsReady;
    this.materialVisible(!this.rootsReady);
    const eye = new THREE.Vector3(...observer), distance = eye.length();
    const contact=this.contactFocus?new THREE.Vector3(...this.contactFocus).divideScalar(this.body.radiusM):null;
    const cacheLimit=contact?768:TILE_CACHE_LIMIT,drawLimit=contact?512:(immersive?102:TILE_DRAW_LIMIT);
    this.eyeUniform.value.copy(eye);this.sunUniform.value.set(...sun);
    this.atmosphere?.update(eye, new THREE.Vector3(...sun));
    const direction = eye.clone().normalize();
    const pixels = height / (2 * Math.tan(fov * Math.PI / 360));
    const projectionCache=new Map<string,{visible:boolean;score:number}>();
    const changed=completions.length>0||!this.leafIndex.size||this.selectionContact!==!!contact||this.frame-this.selectionFrame>=15||eye.distanceTo(this.selectionEye)*this.body.radiusM>(contact?.distanceTo(eye)||0)*this.body.radiusM*.02+.5;
    const projected = (t: Tile) => {
      const key=tileKey(t),cached=projectionCache.get(key);if(cached)return cached;
      const center = new THREE.Vector3(...tileDirection(t, .5, .5));
      const span = 2 / 2 ** t.level, bound = Math.min(1.8, span * 1.42);
      // Conservative horizon test, expanded for the highest possible terrain.
      const margin = 20000 * this.relief / this.body.radiusM;
      const horizon = distance < 1 + margin || direction.dot(center) + bound >= (1 - margin) / distance;
      const sphere = new THREE.Sphere(center, bound + margin);
      const visible = horizon && (!frusta.length || frusta.some(f => f.intersectsSphere(sphere)));
      if(!changed)return {visible,score:0};
      const nearest = closestTileDirection(t,observer);
      const elevation=this.sample(nearest).elevationM;
      const ground=new THREE.Vector3(...nearest).multiplyScalar(1+Math.max(this.body.water?0:-Infinity,elevation)*this.relief/this.body.radiusM);
      const near = Math.max(1e-9, eye.distanceTo(ground));
      let contactNear=Infinity;
      if(contact){const d=closestTileDirection(t,contact.toArray() as V3),h=this.sample(d).elevationM;contactNear=contact.distanceTo(new THREE.Vector3(...d).multiplyScalar(1+Math.max(this.body.water?0:-Infinity,h)/this.body.radiusM))*this.body.radiusM;}
      // Projected patch span also budgets texture resolution. It deliberately
      // overestimates error instead of claiming a measured terrain error bound.
      const result={visible, score: contactNear<28&&t.level<this.contactLevel?1e10/(t.level+1):visible ? span * pixels / near : 0};
      projectionCache.set(key,result);return result;
    };
    const leaves = changed?[...ROOTS]:[...this.leafIndex.values()];
    if (this.rootsReady&&changed) {
      this.selectionEye.copy(eye);this.selectionContact=!!contact;this.selectionFrame=this.frame;
      for (let iteration = 0; iteration < 360; iteration++) {
        const index=new Map(leaves.map(t=>[tileKey(t),t]));
        const neighbour=(t:Tile,e:number)=>{let n=tileNeighbour(t,e);while(n.level>0&&!index.has(tileKey(n)))n={face:n.face,level:n.level-1,x:Math.floor(n.x/2),y:Math.floor(n.y/2)};return index.get(tileKey(n));};
        const candidates = leaves.map(t => ({t, ...projected(t)})).filter(p => p.t.level < (contact?this.contactLevel:16) && p.score > (immersive ? 360 : 260));
        candidates.sort((a, b) => b.score - a.score);
        let split = false;
        for (const candidate of candidates) {
          if(contact&&candidate.score<1e8&&leaves.length>=90)continue;
          let t=candidate.t;
          if(contact){for(let pass=0;pass<20;pass++){const lower=[0,1,2,3].map(e=>neighbour(t,e)).find(n=>n&&n.level<t.level);if(!lower)break;t=lower;}}
          if (leaves.length + 3 > drawLimit) break;
          const kids = children(t);
          kids.forEach(request);
          if (leaves.length + 3 <= drawLimit && kids.every(k => this.patches.has(tileKey(k)))) {
            leaves.splice(leaves.indexOf(t), 1, ...kids);
            split = true;
            break;
          }
        }
        if (!split) break;
      }
    }
    this.active.clear();
    this.leafIndex=new Map(leaves.map(t=>[tileKey(t),t]));
    for (const p of this.patches.values()) p.mesh.visible = false;
    for (const t of leaves) {
      const key = tileKey(t), p = this.patches.get(key);
      protectedKeys.add(key);
      let ancestor=t;while(ancestor.level>0){ancestor={face:ancestor.face,level:ancestor.level-1,x:Math.floor(ancestor.x/2),y:Math.floor(ancestor.y/2)};protectedKeys.add(tileKey(ancestor));}
      if (!p) continue;
      p.touched = this.frame;
      p.mesh.visible = projected(t).visible && this.rootsReady;
      if (p.mesh.visible) this.active.add(key);
      if (!this.previous.has(key)) p.morph.value = t.level ? 0 : 1;
      p.morph.value = Math.min(1, p.morph.value + dt / .22);
      const edges=[0,1,2,3].map(e=>{const n=tileNeighbour(t,e);return this.leafIndex.has(tileKey({face:n.face,level:n.level-1,x:Math.floor(n.x/2),y:Math.floor(n.y/2)}))?1:0;});
      p.edge.value.set(edges[0],edges[1],edges[2],edges[3]);
      // Contact hand-off is enabled only after fine coverage has finished morphing.
    }
    this.previous = new Set(leaves.map(tileKey));
    // Retain ancestor fallback meshes; evict unused children first. Bound also
    // includes pending work, so late completions cannot grow the cache forever.
    for (const p of [...this.patches.values()].sort((a,b) => a.touched - b.touched)) {
      if (this.patches.size + this.pending.size < cacheLimit - 2) break;
      const key = tileKey(p.tile);
      if (!protectedKeys.has(key)) { this.release(p); this.patches.delete(key); }
    }
    const unique = new Map(wanted.map(t => [tileKey(t), t]));
    for (const [key, tile] of unique) {
      if (this.pending.size >= 2 || this.patches.size + this.pending.size >= cacheLimit) break;
      this.pending.add(key);
      this.worker.postMessage({key, tile, body: this.body, relief: this.relief});
    }
    this.updateMs=performance.now()-started;
  }
  contactPatches(point:V3,origin:V3):ContactPatch[]|null {
    const originKey=origin.join(',');if(originKey!==this.contactOrigin){this.contactGeometryCache.clear();this.contactOrigin=originKey;}
    const radial=new THREE.Vector3(...point).normalize(),up=new THREE.Vector3(0,1,0);
    if(Math.abs(radial.dot(up))>.9)up.set(1,0,0);
    const east=new THREE.Vector3().crossVectors(up,radial).normalize(),north=new THREE.Vector3().crossVectors(radial,east).normalize();
    const selected=new Map<string,Patch>();
    for(const x of [-12,0,12])for(const y of [-12,0,12]){
      const d=new THREE.Vector3(...point).addScaledVector(east,x).addScaledVector(north,y).toArray() as V3;
      const key=tileKey(directionTile(d,this.contactLevel)),p=this.patches.get(key);
      if(!this.leafIndex.has(key)||!p||p.morph.value<1)return null;
      selected.set(key,p);
    }
    return [...selected].map(([key,p])=>{
      const mask=p.edge.value.toArray();
      const signature=key+'/'+mask.join(''),cached=this.contactGeometryCache.get(signature);if(cached)return cached;
      const result=contactGeometry(p.data,mask,this.body.radiusM,origin,signature);
      this.contactGeometryCache.set(signature,result);
      if(this.contactGeometryCache.size>32)this.contactGeometryCache.delete(this.contactGeometryCache.keys().next().value!);
      return result;
    });
  }
  diagnostics() {
    return {projection: 'cube-sphere', ready: this.rootsReady, resident: this.patches.size, pending: this.pending.size, visible: this.active.size,
      maxLevel: Math.max(0, ...[...this.active].map(k => this.patches.get(k)!.tile.level)), cacheLimit: this.contactFocus?768:TILE_CACHE_LIMIT,
      contactLevel:this.contactFocus?this.contactLevel:null,accountedBytes:[...this.patches.values()].reduce((n,p)=>n+p.bytes,0),budgetBytes:256*1024*1024,failuresTotal:this.failuresTotal,updateMs:this.updateMs,
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
