import * as THREE from "three";
import { galaxies, type Galaxy, type SystemRef, type V3 } from "./catalog.ts";
import { referenceStarLifecycles, type StarLifecycle } from './stellar-evolution.ts';
import { CATALOGUE_EPOCH_NS,UNIVERSE_END_NS } from './world-time.ts';
import {historicalStarsForGalaxy,futureStarsForGalaxy,galaxyHostAt,type HistoricalStar} from './stellar-cohorts.ts';
import type {GalaxyAddress} from './address.ts';
import { displayLuminosity, STAR_DIAMETER_GLSL, STAR_FRAGMENT } from './star-appearance.ts';
import {
  neighbourhood,
  chunkKey,
  type starMap,
  type starChunk,
} from "./star-map.ts";
type Chunk = ReturnType<typeof starChunk>;
type MapData = ReturnType<typeof starMap>;
function rootAddress(galaxy:Galaxy):GalaxyAddress {
  const match=/^G(\d{3})$/.exec(galaxy.id);
  if(!match)throw new Error(`GalaxySpace requires a root catalogue galaxy: ${galaxy.id}`);
  return {clusterCell:[0n,0n,0n],groupCell:[0n,0n,0n],galaxyOrdinal:Number(match[1])-1};
}

/** One physical galaxy, with catalogue stars streamed around a moving observer.
 * The map survives local navigation. Chunk boundaries have no scene geometry. */
export class GalaxySpace {
  readonly group = new THREE.Group();
  readonly anchors: THREE.Points;
  readonly nearby: THREE.Points;
  readonly historical:THREE.Points;
  readonly populationBeacon:THREE.Points;
  readonly scale: number;
  readonly origin = new THREE.Vector3();
  readonly refs: SystemRef[];
  nearbyRefs: SystemRef[] = [];
  private ids: Set<string>;
  private cache = new Map<string, { chunk: Chunk; born: number }>();
  private wanted: V3[] = [];
  private pending = false;
  private stopped = false;
  private cell = "";
  private observer = new THREE.Vector3();
  private dirty = true;
  private failures = 0;
  private retryAt = 0;
  private readonly lifecycles=new Map<string,readonly StarLifecycle[]>();
  private lastWorldNs:bigint|null=null;
  private focusedPopulationId:string|null=null;
  private readonly historicalStars:readonly HistoricalStar[];
  private readonly populationSources:ReadonlyMap<string,Galaxy>;
  constructor(
    readonly galaxy: Galaxy,
    data: MapData,
    private request: (coords: V3) => Promise<Chunk>,
    private arrived: (chunk: Chunk) => void,
    private failed: (message: string) => void,
    private readonly universeSeed:string=galaxy.seed,
  ) {
    this.scale = 10 / galaxy.radiusLy;
    this.refs = data.refs;
    this.ids = new Set(this.refs.map((r) => r.id));
    this.anchors = this.cloud(
      data.positions,
      data.colors,
      data.sizes,
      data.refs,
      false,
    );
    this.anchors.userData.refs = data.refs;
    this.nearby = this.cloud(
      new Float32Array(),
      new Float32Array(),
      new Float32Array(),
      [],
      true,
    );
    // A merger redirects surviving population IDs into the successor's
    // display without regenerating either source cohort. Placement in the
    // successor is illustrative; identity and dated host are authoritative.
    const sources=[galaxy,...galaxies(universeSeed).filter(other=>other.id!==galaxy.id&&
      galaxyHostAt(universeSeed,other,UNIVERSE_END_NS,rootAddress(other)).hostGalaxyId===galaxy.id)];
    this.populationSources=new Map(sources.map(source=>[source.id,source]));
    this.historicalStars=sources.flatMap(source=>[
      ...historicalStarsForGalaxy(universeSeed,source,rootAddress(source)),...futureStarsForGalaxy(universeSeed,source,rootAddress(source))]);
    const historicalGeometry=new THREE.BufferGeometry();
    historicalGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(this.historicalStars.length*3),3));
    const colors=new Float32Array(this.historicalStars.length*3);
    this.historicalStars.forEach((star,i)=>new THREE.Color(star.color).toArray(colors,i*3));
    historicalGeometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
    this.historical=new THREE.Points(historicalGeometry,new THREE.PointsMaterial({size:2.5,sizeAttenuation:false,vertexColors:true,
      transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending}));
    this.historical.frustumCulled=false;
    this.populationBeacon=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',
      new THREE.Float32BufferAttribute([0,0,0],3)),new THREE.PointsMaterial({size:22,sizeAttenuation:false,
      color:'#e7efff',transparent:true,opacity:.85,depthWrite:false}));
    this.populationBeacon.visible=false;
    this.group.add(this.anchors, this.nearby,this.historical,this.populationBeacon);
  }
  private cloud(
    positions: Float32Array,
    colors: Float32Array,
    sizes: Float32Array,
    refs: SystemRef[],
    near: boolean,
  ) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array(refs.flatMap(r => r.position.map(v => v * this.scale))),
        3,
      ),
    );
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("pointSize", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("luminosity",new THREE.BufferAttribute(Float32Array.from(refs,displayLuminosity),1));
    const starColors = new Float32Array(positions.length);
    refs.forEach((r, i) => new THREE.Color(r.color).toArray(starColors, i * 3));
    geometry.setAttribute(
      "starColor",
      new THREE.BufferAttribute(starColors, 3),
    );
    geometry.setAttribute(
      "born",
      new THREE.BufferAttribute(new Float32Array(sizes.length), 1),
    );
    geometry.setAttribute('alive',new THREE.BufferAttribute(new Float32Array(refs.length).fill(1),1));
    const material = new THREE.ShaderMaterial({
      uniforms: {
        alpha: { value: 1 },
        observer: { value: new THREE.Vector3() },
        unit: { value: this.scale },
        nearLayer: { value: near ? 1 : 0 },
        now: { value: 0 },
        immersive: { value: 0 },
        pixelRatio: { value: 1 },
      },
      vertexShader: `attribute vec3 color;attribute vec3 starColor;attribute float pointSize;attribute float luminosity;attribute float born;attribute float alive;
        uniform vec3 observer;uniform float unit,nearLayer,now,immersive,pixelRatio;
        varying vec3 tint;varying float visibility;
        ${STAR_DIAMETER_GLSL}
        void main(){float d=length(position-observer)/unit;
          float farMix=smoothstep(32.,256.,d);
          tint=mix(starColor,color,farMix);
          visibility=(nearLayer>.5?(1.-smoothstep(24.,32.,d))*smoothstep(0.,.45,now-born):1.)*alive;
          vec4 world=modelMatrix*vec4(position,1.);vec4 original=viewMatrix*world;
          if(immersive>.5){vec3 delta=world.xyz-cameraPosition;world.xyz=cameraPosition+delta*min(1.,140./max(.001,length(delta)));}
          gl_Position=projectionMatrix*viewMatrix*world;
          float mapSize=clamp(pointSize*1.5*110.*length(modelMatrix[0].xyz)/max(.00001,-original.z),1.5,3.);
          float closeSize=starPointDiameter(d,luminosity);
          gl_PointSize=mix(closeSize,mapSize,nearLayer>.5?0.:farMix)*pixelRatio;
        }`,
      fragmentShader: STAR_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    return points;
  }
  world(p: V3) {
    return new THREE.Vector3(...p).sub(this.origin).multiplyScalar(this.scale);
  }
  physical(p: THREE.Vector3): V3 {
    return p.clone().divideScalar(this.scale).add(this.origin).toArray() as V3;
  }
  seed(chunk: Chunk) {
    this.cache.set(chunkKey(chunk.coords), {
      chunk,
      born: performance.now() / 1000 - 0.5,
    });
    this.dirty = true;
  }
  rebase(origin: V3) {
    const delta = new THREE.Vector3(...origin)
      .sub(this.origin)
      .multiplyScalar(this.scale);
    this.origin.set(...origin);
    const coordinates = this.anchors.geometry.attributes.position as THREE.BufferAttribute;
    this.refs.forEach((r,i) => coordinates.setXYZ(i,
      (r.position[0]-origin[0])*this.scale,
      (r.position[1]-origin[1])*this.scale,
      (r.position[2]-origin[2])*this.scale));
    coordinates.needsUpdate = true;
    if(this.lastWorldNs!==null)this.updateHistoricalDate(this.lastWorldNs);
    this.dirty = true;
    return delta;
  }
  update(
    cameraLocal: THREE.Vector3,
    immersive: boolean,
    pixelRatio: number,
    stream: boolean,
    worldNs:bigint=CATALOGUE_EPOCH_NS,
  ) {
    this.observer.copy(cameraLocal);
    const physical = this.physical(cameraLocal),
      key = chunkKey(physical.map((v) => Math.floor(v / 32)) as V3);
    if (stream && key !== this.cell) {
      this.cell = key;
      this.wanted = neighbourhood(physical);
      this.dirty = true;
      const c = this.cache.get(key);
      if (c) this.arrived(c.chunk);
    }
    for (const cloud of [this.anchors, this.nearby]) {
      const u = (cloud.material as THREE.ShaderMaterial).uniforms;
      u.observer.value.copy(cameraLocal);
      u.now.value = performance.now() / 1000;
      u.immersive.value = +immersive;
      u.pixelRatio.value = pixelRatio;
    }
    if (this.dirty) this.rebuild();
    if(this.lastWorldNs!==worldNs)this.updateDate(worldNs);
    if (stream && !this.pending && performance.now() > this.retryAt)
      void this.fill();
  }
  private async fill() {
    const next = this.wanted.find((c) => !this.cache.has(chunkKey(c)));
    if (!next || this.stopped) return;
    this.pending = true;
    try {
      const chunk = await this.request(next);
      if (this.stopped) return;
      this.cache.set(chunkKey(next), { chunk, born: performance.now() / 1000 });
      this.failures = 0;
      if (this.cache.size > 64) {
        const keep = new Set(this.wanted.map(chunkKey));
        const evict = [...this.cache.keys()].find((k) => !keep.has(k));
        if (evict) this.cache.delete(evict);
      }
      this.dirty = true;
      if (chunkKey(next) === this.cell) this.arrived(chunk);
    } catch (e) {
      this.retryAt = performance.now() + 5000;
      if (this.failures++ === 0) this.failed(String(e));
    } finally {
      this.pending = false;
    }
  }
  private rebuild() {
    this.dirty = false;
    const refs: SystemRef[] = [],
      birth: number[] = [];
    for (const coords of this.wanted) {
      const cached = this.cache.get(chunkKey(coords));
      if (!cached) continue;
      for (const ref of cached.chunk.refs) {
        if (this.ids.has(ref.id)) continue;
        refs.push(ref);
        birth.push(cached.born);
      }
    }
    const p = new Float32Array(refs.length * 3),
      c = new Float32Array(p.length);
    refs.forEach((r, i) => {
      p.set(this.world(r.position).toArray(), i * 3);
      new THREE.Color(r.color).toArray(c, i * 3);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(p, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(c, 3));
    geometry.setAttribute("starColor", new THREE.BufferAttribute(c, 3));
    geometry.setAttribute(
      "pointSize",
      new THREE.BufferAttribute(new Float32Array(refs.length).fill(2), 1),
    );
    geometry.setAttribute("luminosity",new THREE.BufferAttribute(Float32Array.from(refs,displayLuminosity),1));
    geometry.setAttribute(
      "born",
      new THREE.BufferAttribute(new Float32Array(birth), 1),
    );
    geometry.setAttribute('alive',new THREE.BufferAttribute(new Float32Array(refs.length).fill(1),1));
    this.nearby.geometry.dispose();
    this.nearby.geometry = geometry;
    this.nearbyRefs = refs;
    this.nearby.userData.refs = refs;
    this.lastWorldNs=null;
  }
  private updateDate(t:bigint) {
    this.lastWorldNs=t;
    for(const [cloud,refs] of [[this.anchors,this.refs],[this.nearby,this.nearbyRefs]] as const){
      const alive=cloud.geometry.getAttribute('alive') as THREE.BufferAttribute;
      for(let i=0;i<refs.length;i++){
        const ref=refs[i];
        let lc=this.lifecycles.get(ref.id);
        if(!lc){lc=referenceStarLifecycles(ref);this.lifecycles.set(ref.id,lc);}
        alive.setX(i,lc.some(star=>t>=star.formationNs&&t<star.remnantNs)?1:0);
      }
      alive.needsUpdate=true;
    }
    this.updateHistoricalDate(t);
  }
  private updateHistoricalDate(t:bigint) {
    const positions=this.historical.geometry.getAttribute('position') as THREE.BufferAttribute;
    const activeHosts=new Map([...this.populationSources].map(([id,source])=>
      [id,galaxyHostAt(this.universeSeed,source,t,rootAddress(source)).hostGalaxyId]));
    for(let i=0;i<this.historicalStars.length;i++){
      const star=this.historicalStars[i];
      if(star.birthNs<=t&&t<star.deathNs&&activeHosts.get(star.hostGalaxyId)===this.galaxy.id){
        const p=this.world(star.positionLy);positions.setXYZ(i,p.x,p.y,p.z);
      }else positions.setXYZ(i,1e9,1e9,1e9);
    }
    positions.needsUpdate=true;
    this.focusPopulation(this.focusedPopulationId,t);
  }
  focusPopulation(id:string|null,t:bigint){
    this.focusedPopulationId=id;
    const star=id?this.findPopulation(id,t):undefined;
    this.populationBeacon.visible=!!star;
    if(star)this.populationBeacon.position.copy(this.world(star.positionLy));
  }
  /** Dated cohort points are visitable locations, but not generated planetary systems. */
  populationAt(t:bigint):readonly HistoricalStar[] {
    const hosts=new Map([...this.populationSources].map(([id,source])=>
      [id,galaxyHostAt(this.universeSeed,source,t,rootAddress(source)).hostGalaxyId]));
    return this.historicalStars.filter(star=>star.birthNs<=t&&t<star.deathNs&&
      hosts.get(star.hostGalaxyId)===this.galaxy.id);
  }
  populationAtIndex(index:number,t:bigint):HistoricalStar|null {
    const star=this.historicalStars[index];
    if(!star||this.lastWorldNs!==t)return null;
    const positions=this.historical.geometry.getAttribute('position') as THREE.BufferAttribute;
    return positions.getX(index)<1e8?star:null;
  }
  findPopulation(id:string,t:bigint):HistoricalStar|undefined {
    const star=this.historicalStars.find(item=>item.id===id);
    if(!star||star.birthNs>t||star.deathNs<=t)return undefined;
    const source=this.populationSources.get(star.hostGalaxyId);
    return source&&galaxyHostAt(this.universeSeed,source,t,rootAddress(source)).hostGalaxyId===this.galaxy.id?star:undefined;
  }
  nextPopulationBirthAfter(t:bigint):HistoricalStar|undefined {
    return this.historicalStars.filter(star=>star.birthNs>t&&
      this.populationSources.has(star.hostGalaxyId)&&
      galaxyHostAt(this.universeSeed,this.populationSources.get(star.hostGalaxyId)!,star.birthNs,
        rootAddress(this.populationSources.get(star.hostGalaxyId)!)).hostGalaxyId===this.galaxy.id)
      .reduce<HistoricalStar|undefined>((best,star)=>!best||star.birthNs<best.birthNs?star:best,undefined);
  }
  find(id: string) {
    return (
      this.refs.find((r) => r.id === id) ||
      this.nearbyRefs.find((r) => r.id === id)
    );
  }
  stop() {
    this.stopped = true;
  }
  diagnostics() {
    return {
      id: this.group.uuid,
      anchorId: this.anchors.uuid,
      originLy: this.origin.toArray(),
      positionLy: this.physical(this.observer),
      mapStars: this.refs.length,
      nearbyStars: this.nearbyRefs.length,
      cachedChunks: this.cache.size,
      pending: this.pending,
      residentChunks: this.wanted.filter((c) => this.cache.has(chunkKey(c)))
        .length,
      visibleBudget: 27 * 512,
      anchorSample: this.refs.slice(0, 4),
    };
  }
}
