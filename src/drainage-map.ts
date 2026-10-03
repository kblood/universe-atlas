import * as THREE from 'three';
import {hash64,type Body} from './catalog.ts';
import {drainageBytes,type Drainage,type Catchment} from './drainage.ts';
import {renderHeightBoundM} from './planet-renderer.ts';

/** An explicitly cartographic overlay. It neither renders water surfaces nor
 * participates in collision. A dedicated disposable worker owns its one job. */
export class DrainageMap{
  readonly group=new THREE.Group();
  data:Drainage|null=null;
  status:'building'|'ready'|'error'='building';
  error='';enabled=true;selected:string|null=null;buildMs=0;
  private worker:Worker;
  private disposed=false;
  private timeout:ReturnType<typeof setTimeout>;
  private surface:THREE.Mesh|undefined;
  private mainStem:THREE.LineSegments|undefined;
  private markers:THREE.Points|undefined;
  private materials:THREE.Material[]=[];
  private geometries:THREE.BufferGeometry[]=[];
  private disposedResources=false;
  constructor(readonly body:Body,private changed:()=>void){
    this.group.name='Drainage analysis map';this.group.matrixAutoUpdate=false;this.group.visible=false;
    this.worker=new Worker(new URL('./drainage-worker.ts',import.meta.url),{type:'module'});
    this.worker.onmessage=({data})=>{
      if(this.disposed||this.status!=='building')return;clearTimeout(this.timeout);this.worker.terminate();
      if(data.error){this.fail(data.error);return;}
      try{this.data=data.result;this.buildMs=data.buildMs;this.install();this.status='ready';this.changed();}
      catch(error){this.fail(String(error));}
    };
    this.worker.onerror=event=>{event.preventDefault();this.fail(event.message||'Drainage worker failed');};
    this.timeout=setTimeout(()=>this.fail('Drainage analysis timed out. Retry when ready.'),30000);
    this.worker.postMessage({body});
  }
  private fail(error:string){if(this.disposed)return;clearTimeout(this.timeout);this.worker.terminate();this.error=error;this.status='error';this.group.visible=false;this.changed();}
  private geometry(positions:number[]|Float32Array){
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));this.geometries.push(g);return g;
  }
  private line(a:number,b:number,target:number[],lift=1.0001){
    const dirs=this.data!.directions,va=new THREE.Vector3().fromArray(dirs,a*3),vb=new THREE.Vector3().fromArray(dirs,b*3);
    for(let k=0;k<4;k++)for(const t of [k/4,(k+1)/4])target.push(...va.clone().lerp(vb,t).normalize().multiplyScalar(lift).toArray());
  }
  private install(){
    const d=this.data!,positions=new Float32Array(d.directions),geometry=this.geometry(positions);
    geometry.setIndex(new THREE.BufferAttribute(d.triangles,1));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(positions.length),3));
    const paint=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.32,depthWrite:false,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
    this.surface=new THREE.Mesh(geometry,paint);this.surface.renderOrder=5;this.group.add(this.surface);this.materials.push(paint);
    const paths:number[]=[],pits:number[]=[];
    const threshold=4*Math.PI/2500;
    for(let i=0;i<d.height.length;i++){
      const r=d.receiver[i];if(!d.wet[i]&&r>=0&&d.accumulated[i]>=threshold)this.line(i,r,paths);
      if(!d.wet[i]&&d.filled[i]-d.height[i]>5)pits.push(d.directions[i*3]*1.0002,d.directions[i*3+1]*1.0002,d.directions[i*3+2]*1.0002);
    }
    const networkMat=new THREE.LineBasicMaterial({color:0x7df4ec,transparent:true,opacity:.9,depthWrite:false});
    const network=new THREE.LineSegments(this.geometry(paths),networkMat);network.renderOrder=6;this.group.add(network);this.materials.push(networkMat);
    const pitMat=new THREE.PointsMaterial({color:0xffbf66,size:2.5,sizeAttenuation:false,transparent:true,opacity:.8,depthWrite:false});
    const depressions=new THREE.Points(this.geometry(pits),pitMat);depressions.renderOrder=7;this.group.add(depressions);this.materials.push(pitMat);
    const stemMat=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:1,depthWrite:false});
    this.mainStem=new THREE.LineSegments(this.geometry([]),stemMat);this.mainStem.renderOrder=8;this.group.add(this.mainStem);this.materials.push(stemMat);
    const markerMat=new THREE.PointsMaterial({color:0xffffff,size:8,sizeAttenuation:false,depthWrite:false,transparent:true});
    this.markers=new THREE.Points(this.geometry([]),markerMat);this.markers.renderOrder=9;this.group.add(this.markers);this.materials.push(markerMat);
    this.select(d.catchments[0]?.id||null,false);
  }
  select(id:string|null,notify=true){
    const d=this.data;if(!d||!this.surface)return;
    this.selected=id;const selection=this.catchment(),colors=this.surface.geometry.getAttribute('color') as THREE.BufferAttribute;
    const palette=new Map<number,THREE.Color>();
    for(let i=0;i<d.height.length;i++){
      const outlet=d.outlet[i];let c=palette.get(outlet);
      if(!c){const h=Number(hash64(d.bodySeed+'/catchment/'+outlet)%65536n)/65536;c=outlet<0?new THREE.Color(.025,.08,.16):new THREE.Color().setHSL(h,.55,.5);palette.set(outlet,c);}
      const gain=(selection && outlet !== selection.outlet) ? 0.45 : 1;
      colors.setXYZ(i,c.r*gain,c.g*gain,c.b*gain);
    }
    colors.needsUpdate=true;
    const line:number[]=[],markers:number[]=[];
    if(selection){
      let i=selection.head;
      while(d.receiver[i]>=0&&!d.wet[i]){this.line(i,d.receiver[i],line,1.0004);i=d.receiver[i];}
      for(const site of [selection.headwater,selection.mouth])markers.push(...site.direction.map(v=>v*1.0005));
    }
    // Release the previous GPU buffers before installing a differently sized
    // selection; repeated inspection cannot retain obsolete line buffers.
    this.mainStem!.geometry.dispose();this.markers!.geometry.dispose();
    this.mainStem!.geometry.setAttribute('position',new THREE.Float32BufferAttribute(line,3));this.mainStem!.geometry.computeBoundingSphere();
    this.markers!.geometry.setAttribute('position',new THREE.Float32BufferAttribute(markers,3));this.markers!.geometry.computeBoundingSphere();
    if(notify)this.changed();
  }
  catchment():Catchment|undefined{return this.data?.catchments.find(c=>c.id===this.selected);}
  update(matrix:THREE.Matrix4,altitudeM:number,relief:number){
    const fade=THREE.MathUtils.smoothstep(altitudeM,50000,120000);
    this.group.visible=this.enabled&&this.status==='ready'&&fade>0;
    // Above the body's highest terrain (render-bounds-1 height bound) + 1.5 km.
    this.group.matrix.copy(matrix).scale(new THREE.Vector3().setScalar(1+(Math.max(0,renderHeightBoundM(this.body).maxM)*relief+1500)/this.body.radiusM));
    for(const m of this.materials)m.opacity=fade*((m===this.surface?.material) ? 0.32 : 1);
  }
  diagnostics(){
    const geometryBytes=this.geometries.reduce((sum,g)=>sum+Object.values(g.attributes).reduce((n,a)=>n+a.array.byteLength,0)+(g.index?.array.byteLength||0),0);
    return {status:this.status,enabled:this.enabled,visible:this.group.visible,bodyId:this.body.id,version:this.data?.version||null,buildMs:this.buildMs,
      selected:this.selected,stats:this.data?.stats||null,catchments:this.data?.catchments||[],modelBytes:this.data?drainageBytes(this.data):0,
      accountedBytes:(this.data?drainageBytes(this.data):0)+geometryBytes*2,budgetBytes:16*1024*1024,draws:this.group.visible?5:0,error:this.error};
  }
  export(){const d=this.data;return d?{version:d.version,geologyVersion:d.geologyVersion,gridSize:d.gridSize,bodyId:d.bodyId,bodySeed:d.bodySeed,radiusM:d.radiusM,stats:d.stats,catchments:d.catchments,
    directions:Array.from(d.directions),heightM:Array.from(d.height),conditionedHeightM:Array.from(d.filled),receiver:Array.from(d.receiver),outlet:Array.from(d.outlet),areaSteradians:Array.from(d.areas),accumulatedSteradians:Array.from(d.accumulated)}:null;}
  dispose(){
    if(this.disposed)return;this.disposed=true;clearTimeout(this.timeout);this.worker.terminate();this.group.removeFromParent();
    if(!this.disposedResources){for(const g of this.geometries)g.dispose();for(const m of this.materials)m.dispose();this.disposedResources=true;}this.data=null;
  }
}
