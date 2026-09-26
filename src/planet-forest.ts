import * as THREE from 'three';
import {type Body,type V3} from './catalog.ts';
import {terrainSampler} from './terrain.ts';
import {biomeClassifier} from './surface-biomes.ts';
import {populationCells,type PopulationCell} from './planet-population.ts';
import {PLANET_DETAIL as B,forestLod} from './planet-detail.ts';

type Resident={cell:PopulationCell;height:number;present:boolean};

/** Matched metre-normalized silhouettes for near branches and distant crowns.
 * All geometry is authored here; no textures or external generated assets. */
function treeGeometry(detail:number){
  const positions:number[]=[],normals:number[]=[],colors:number[]=[];
  const add=(g:THREE.BufferGeometry,scale:V3,position:V3,color:V3)=>{
    g.scale(...scale);g.translate(...position);
    const flat=g.index?g.toNonIndexed():g;
    positions.push(...flat.attributes.position.array);normals.push(...flat.attributes.normal.array);
    for(let i=0;i<flat.attributes.position.count;i++)colors.push(...color);
    flat.dispose();if(flat!==g)g.dispose();
  };
  add(new THREE.CylinderGeometry(.018,.031,.64,detail?7:4),[1,1,1],[0,.32,0],[.25,.17,.10]);
  if(detail)for(const side of [-1,1]){
    const branch=new THREE.CylinderGeometry(.005,.012,.30,6);branch.rotateZ(side*.7);
    add(branch,[1,1,1],[side*.075,.55,.02],[.25,.17,.10]);
  }
  for(const [x,y,z,s] of [[-.13,.65,.02,.23],[.13,.72,.03,.24],[0,.81,-.10,.23],[.015,.89,.035,.16]]){
    add(new THREE.IcosahedronGeometry(1,detail),[s,s*.85,s],[x,y,z],[.16+y*.06,.29+y*.04,.08]);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeBoundingSphere();return geometry;
}

/** A stand silhouette for distant coverage; horizontal footprint represents
 * many crowns, while vertical scale remains in physical metres. */
function canopyGeometry(){
  const positions:number[]=[],normals:number[]=[];
  let state=57219;const random=()=>((state=Math.imul(state,1664525)+1013904223>>>0)/4294967296);
  for(let i=0;i<16;i++){
    const g=new THREE.IcosahedronGeometry(1,0);
    const angle=random()*Math.PI*2,distance=Math.sqrt(random())*.45,size=.065+random()*.035;
    g.scale(size,.26+random()*.12,size);g.translate(Math.cos(angle)*distance,.62+random()*.18,Math.sin(angle)*distance);
    positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);g.dispose();
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.computeBoundingSphere();return g;
}

/** Bounded placement queue + retained habitat cache. Flight and walking call
 * the same update. Work begins above visible range; no landing flag exists. */
export class PlanetForest {
  readonly group=new THREE.Group();
  private meshes:THREE.InstancedMesh[];
  private canopy:THREE.InstancedMesh;
  private cache=new Map<string,Resident>();
  private wanted:PopulationCell[]=[];
  private queue:PopulationCell[]=[];
  private center=new THREE.Vector3(Infinity,Infinity,Infinity);
  private origin=new THREE.Vector3();
  private sample:ReturnType<typeof terrainSampler>;
  private classify:ReturnType<typeof biomeClassifier>;
  private water=NaN;
  private matrix=new THREE.Matrix4();
  private position=new THREE.Vector3();
  private scale=new THREE.Vector3();
  private quaternion=new THREE.Quaternion();
  private yaw=new THREE.Quaternion();
  private up=new THREE.Vector3(0,1,0);
  private direction=new THREE.Vector3();
  private color=new THREE.Color();
  private bounds=new THREE.Sphere();
  private worker:Worker|null=null;
  private selecting=false;
  private applySelection(direction:V3,cells:PopulationCell[],selectionMs:number){
    this.center.set(...direction);this.wanted=cells;
    this.queue=this.wanted.filter(cell=>!this.cache.has(cell.id));
    if(this.cache.size+this.queue.length>B.populationCacheLimit){
      const keep=new Set(this.wanted.map(c=>c.id));
      for(const id of this.cache.keys())if(!keep.has(id))this.cache.delete(id);
    }
    this.selectionMs=selectionMs;this.selecting=false;
  }
  visibleTrees=0;nearTrees=0;placementMs=0;selectionMs=0;
  constructor(private body:Body){
    this.sample=terrainSampler(body);this.classify=biomeClassifier(body);
    this.meshes=[B.forestNearCapacity,B.forestCapacity].map((capacity,i)=>{
      const mesh=new THREE.InstancedMesh(treeGeometry(i===0?1:0),
        new THREE.MeshLambertMaterial({vertexColors:true}),capacity);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.count=0;
      this.group.add(mesh);return mesh;
    });
    this.canopy=new THREE.InstancedMesh(canopyGeometry(),new THREE.MeshLambertMaterial({color:0x456c28}),B.canopyCapacity);
    this.canopy.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.canopy.frustumCulled=false;this.canopy.count=0;
    this.group.add(this.canopy);this.group.name='Continuous planetary forest';
    if(typeof Worker!=='undefined'){
      this.worker=new Worker(new URL('./planet-population-worker.ts',import.meta.url),{type:'module'});
      this.worker.onmessage=({data})=>this.applySelection(data.direction,data.cells,data.selectionMs);
      this.worker.onerror=()=>{this.worker?.terminate();this.worker=null;this.selecting=false;};
    }
  }
  update(eye:THREE.Vector3,groundDirection:V3,altitudeM:number,enabled:boolean,water:number,immersive:boolean,frusta:THREE.Frustum[]=[]){
    this.group.visible=enabled&&altitudeM<B.forestPrepareAltitudeM;
    this.visibleTrees=0;this.nearTrees=0;this.placementMs=0;this.selectionMs=0;
    if(!this.group.visible)return;
    if(water!==this.water){
      this.water=water;this.sample=terrainSampler(this.body,undefined,undefined,undefined,water);
      this.classify=biomeClassifier(this.body,water);this.cache.clear();this.center.setScalar(Infinity);
    }
    const r=this.body.radiusM,ground=this.direction.set(...groundDirection);
    if(ground.distanceTo(this.center)*r>40&&!this.selecting){
      if(this.worker){
        this.selecting=true;this.worker.postMessage({seed:this.body.seed,direction:groundDirection,radiusM:r});
      }else{
      const started=performance.now();
      const cells=populationCells(this.body.seed,groundDirection,r,B.forestFootprintM,B.forestCellM);
      cells.push(...populationCells(this.body.seed,groundDirection,r,B.canopyFootprintM,B.canopyCellM)
        .map(cell=>({...cell,id:'canopy/'+cell.id})));
      this.applySelection(groundDirection,cells,performance.now()-started);
      }
    }
    const started=performance.now();
    for(let count=0;this.queue.length&&count<B.placementSamplesPerFrame&&performance.now()-started<B.placementBudgetMs;count++){
      const cell=this.queue.shift()!,s=this.sample(cell.direction);
      const biome=this.classify(cell.direction,s.groundHeightM);
      let present=!s.wet&&biome.forestPotential&&cell.roll<.76;
      if(present){
        const d=new THREE.Vector3(...cell.direction),right=new THREE.Vector3().crossVectors(Math.abs(d.y)>.9?new THREE.Vector3(1,0,0):this.up,d).normalize();
        const a=d.clone().addScaledVector(right,5/r).normalize(),b=d.clone().addScaledVector(right,-5/r).normalize();
        const slope=Math.abs(this.sample(a.toArray() as V3).groundHeightM-this.sample(b.toArray() as V3).groundHeightM)/10;
        present=slope<.55;
      }
      this.cache.set(cell.id,{cell,height:s.groundHeightM,present});
    }
    this.placementMs=performance.now()-started;
    // A local origin keeps centimetre-scale matrices precise on large worlds.
    this.origin.copy(eye);this.group.position.copy(this.origin);
    const counts=[0,0],capacities=immersive?[64,1024]:[B.forestNearCapacity,B.forestCapacity];let canopyCount=0;
    const altitudeFade=1-THREE.MathUtils.smoothstep(altitudeM,B.forestPrepareAltitudeM-500,B.forestPrepareAltitudeM);
    for(const cell of this.wanted){
      const resident=this.cache.get(cell.id);if(!resident?.present)continue;
      this.direction.set(...cell.direction);
      this.position.copy(this.direction).multiplyScalar(1+resident.height/r);
      this.bounds.center.copy(this.position);this.bounds.radius=(cell.id.startsWith('canopy/')?B.canopyCellM:cell.heightM)/r;
      if(frusta.length&&!frusta.some(f=>f.intersectsSphere(this.bounds)))continue;
      const distance=this.position.distanceTo(eye)*r;
      const horizontal=this.direction.distanceTo(this.center)*r;
      if(cell.id.startsWith('canopy/')){
        if(canopyCount>=(immersive?768:B.canopyCapacity))continue;
        const fade=altitudeFade*THREE.MathUtils.smoothstep(horizontal,B.forestFootprintM-200,B.forestFootprintM)*
          (1-THREE.MathUtils.smoothstep(horizontal,B.canopyFootprintM-700,B.canopyFootprintM));
        if(fade<=0)continue;
        this.position.sub(this.origin);this.quaternion.setFromUnitVectors(this.up,this.direction);
        this.yaw.setFromAxisAngle(this.direction,cell.yaw);this.quaternion.premultiply(this.yaw);
        this.scale.set(B.canopyCellM/r*fade,cell.heightM/r*fade,B.canopyCellM/r*fade);
        this.matrix.compose(this.position,this.quaternion,this.scale);this.canopy.setMatrixAt(canopyCount++,this.matrix);continue;
      }
      let lod=forestLod(distance);if(lod<0)continue;
      if(counts[lod]>=capacities[lod]){if(lod===0)lod=1;else continue;}
      if(counts[lod]>=capacities[lod])continue;
      // A narrow growth fade at the outer visibility edge avoids hard popping.
      const fade=altitudeFade*(1-THREE.MathUtils.smoothstep(distance,B.forestRadiusM-160,B.forestRadiusM))*
        (1-THREE.MathUtils.smoothstep(horizontal,B.forestFootprintM-100,B.forestFootprintM));
      this.position.sub(this.origin);
      this.quaternion.setFromUnitVectors(this.up,this.direction);
      this.yaw.setFromAxisAngle(this.direction,cell.yaw);this.quaternion.premultiply(this.yaw);
      this.scale.setScalar(cell.heightM/r*fade);
      this.matrix.compose(this.position,this.quaternion,this.scale);
      const mesh=this.meshes[lod],index=counts[lod]++;
      mesh.setMatrixAt(index,this.matrix);
      this.color.setRGB(.8+cell.roll*.2,.85+cell.roll*.15,.75+cell.roll*.25);mesh.setColorAt(index,this.color);
    }
    for(let i=0;i<2;i++){
      const mesh=this.meshes[i];mesh.count=counts[i];mesh.instanceMatrix.needsUpdate=true;
      if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    }
    this.canopy.count=canopyCount;this.canopy.instanceMatrix.needsUpdate=true;
    this.nearTrees=counts[0];this.visibleTrees=counts[0]+counts[1];
  }
  diagnostics(){return {visible:this.visibleTrees,near:this.nearTrees,cached:this.cache.size,pending:this.queue.length,
    candidateCells:this.wanted.length,canopyStands:this.group.visible?this.canopy.count:0,placementMs:this.placementMs,selectionMs:this.selectionMs,selectionPending:this.selecting,selectionWorker:!!this.worker,
    radiusM:B.forestRadiusM,heightRangeM:[10,22],cellSizeM:B.forestCellM,
    allocatedBytes:[...this.meshes,this.canopy].reduce((s,m)=>s+m.instanceMatrix.array.byteLength+(m.instanceColor?.array.byteLength??0)+
      Object.values(m.geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0),0)*2};}
  dispose(){this.worker?.terminate();for(const mesh of [...this.meshes,this.canopy]){mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();}this.cache.clear();this.group.removeFromParent();}
}
