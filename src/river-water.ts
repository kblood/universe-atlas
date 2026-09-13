import * as THREE from 'three';
import type {Body, V3} from './catalog.ts';
import type {RiverChannel, RiverLake, RiverRegion} from './river-types.ts';

/** The regional water renderer treats RiverPoint.widthM as the full water width.
 * Geometry is kept in planet-radius units so it can live beneath PlanetRenderer.group. */
// Logarithmic depth needs a decimetre-scale separation from the wet terrain
// proxy at eye height.  This remains a surface bias, never a raised shell.
const MAX_DRAWS=64, MAX_BYTES=16*1024*1024, WATER_BIAS_M=.1, LAKE_EDGE_M=16;
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const dot=(a:V3,b:V3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const add=(a:V3,b:V3):V3=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const scale=(a:V3,s:number):V3=>[a[0]*s,a[1]*s,a[2]*s];
const unit=(a:V3):V3=>{const n=Math.hypot(...a);return n>0?[a[0]/n,a[1]/n,a[2]/n]:[0,1,0];};

type RawVertex={direction:V3;height:number;u:number;v:number;flow:number;flowX:number;flowZ:number;x:number;z:number;depth:number;shore:number};
type ChunkData={vertices:RawVertex[];indices:number[];flow:number;kind:'river'|'lake';sourceId:string};
type Chunk={mesh:THREE.Mesh;center:V3;radius:number;bytes:number;visible:boolean;material:THREE.ShaderMaterial};

function directionAt(region:RiverRegion,x:number,z:number):V3 {
  return unit(add(region.origin,add(scale(region.east,x/region.radiusM),scale(region.north,z/region.radiusM))));
}

function channelChunk(channel:RiverChannel,start:number,end:number,region:RiverRegion):ChunkData {
  const vertices:RawVertex[]=[]; const indices:number[]=[];
  for(let i=start;i<=end;i++){
    const p=channel.points[i], before=channel.points[Math.max(0,i-1)], after=channel.points[Math.min(channel.points.length-1,i+1)];
    const dx=after.x-before.x,dz=after.z-before.z, length=Math.hypot(dx,dz)||1;
    // left/right are defined in the local east/north frame.  The index order
    // below makes their surface winding point away from the planet centre.
    const lx=-dz/length*(Math.max(0,p.widthM)/2), lz=dx/length*(Math.max(0,p.widthM)/2);
    const u=p.distanceM*.018;
    // A centreline gives the fragment shader real shallow/deep interpolation.
    // The two edge values are zero-depth, exactly matching the shared bowl at
    // its wet boundary, while the centre carries the authored channel depth.
    vertices.push({direction:directionAt(region,p.x+lx,p.z+lz),height:p.waterM,u,v:0,flow:1,flowX:dx/length,flowZ:dz/length,x:p.x+lx,z:p.z+lz,depth:0,shore:1});
    vertices.push({direction:directionAt(region,p.x,p.z),height:p.waterM,u,v:.5,flow:1,flowX:dx/length,flowZ:dz/length,x:p.x,z:p.z,depth:p.depthM,shore:0});
    vertices.push({direction:directionAt(region,p.x-lx,p.z-lz),height:p.waterM,u,v:1,flow:1,flowX:dx/length,flowZ:dz/length,x:p.x-lx,z:p.z-lz,depth:0,shore:1});
  }
  for(let i=0;i<end-start;i++){const a=i*3;
    for(let band=0;band<2;band++)indices.push(a+band,a+band+1,a+band+3,a+band+1,a+band+4,a+band+3);
  }
  return {vertices,indices,flow:1,kind:'river',sourceId:channel.id};
}

function lakeChunk(lake:RiverLake,region:RiverRegion):ChunkData {
  // Every lake edge is at most 16 m. A fan's long chords visibly sink below
  // a curved water level on kilometre lakes, so use stable concentric rings.
  const outer=Math.max(lake.radiusXM,lake.radiusZM), rings=Math.max(1,Math.ceil(outer/LAKE_EDGE_M));
  const sides=Math.max(12,Math.ceil(Math.PI*2*outer/LAKE_EDGE_M));
  const vertices:RawVertex[]=[{direction:directionAt(region,lake.x,lake.z),height:lake.waterM,u:.5,v:.5,flow:0,flowX:0,flowZ:0,x:lake.x,z:lake.z,depth:lake.depthM,shore:0}];
  const indices:number[]=[];
  const c=Math.cos(lake.angle),s=Math.sin(lake.angle);
  for(let ring=1;ring<=rings;ring++)for(let i=0;i<sides;i++){
    const t=i*Math.PI*2/sides,k=ring/rings,x=Math.cos(t)*lake.radiusXM*k,z=Math.sin(t)*lake.radiusZM*k;
    const px=lake.x+x*c-z*s,pz=lake.z+x*s+z*c;
    vertices.push({direction:directionAt(region,px,pz),height:lake.waterM,u:.5+.5*k*Math.cos(t),v:.5+.5*k*Math.sin(t),flow:0,flowX:0,flowZ:0,x:px,z:pz,depth:lake.depthM*(1-k*k),shore:k});
  }
  for(let i=0;i<sides;i++)indices.push(0,i+1,(i+1)%sides+1);
  for(let ring=1;ring<rings;ring++)for(let i=0;i<sides;i++){const a=1+(ring-1)*sides+i,b=1+(ring-1)*sides+(i+1)%sides,c0=1+ring*sides+i,d=1+ring*sides+(i+1)%sides;indices.push(a,c0,b,b,c0,d);}
  return {vertices,indices,flow:0,kind:'lake',sourceId:lake.id};
}

function lakeBytes(lake:RiverLake){
  const outer=Math.max(lake.radiusXM,lake.radiusZM),rings=Math.max(1,Math.ceil(outer/LAKE_EDGE_M)),sides=Math.max(12,Math.ceil(Math.PI*2*outer/LAKE_EDGE_M)),vertices=1+rings*sides,indices=3*sides*(2*rings-1),indexBytes=(vertices>65535?4:2)*indices;
  // riverWaterGeometry stores sixteen Float32 components per vertex.
  return vertices*16*4+indexBytes;
}

/** Exposed for numerical tests; all values are in normalized planet coordinates. */
export function riverWaterGeometry(data:ChunkData,body:Body,relief=1){
  const meanHeight=data.vertices.reduce((n,v)=>n+v.height,0)/Math.max(1,data.vertices.length);
  // Keep the anchor at the mean water height.  The Float32 position is then a
  // small local delta, never a planet-radius coordinate reconstructed in GLSL.
  const anchor=scale(unit(data.vertices.reduce<V3>((a,v)=>add(a,v.direction),[0,0,0])),1+meanHeight*relief/body.radiusM);
  const positions=new Float32Array(data.vertices.length*3),directions=new Float32Array(data.vertices.length*3),heights=new Float32Array(data.vertices.length),uvs=new Float32Array(data.vertices.length*2),flows=new Float32Array(data.vertices.length),coords=new Float32Array(data.vertices.length*2),depths=new Float32Array(data.vertices.length),shores=new Float32Array(data.vertices.length),flowVectors=new Float32Array(data.vertices.length*2);
  data.vertices.forEach((v,i)=>{const r=1+v.height*relief/body.radiusM,p=scale(v.direction,r);positions.set([p[0]-anchor[0],p[1]-anchor[1],p[2]-anchor[2]],i*3);directions.set(v.direction,i*3);heights[i]=v.height;uvs.set([v.u,v.v],i*2);flows[i]=v.flow;coords.set([v.x,v.z],i*2);depths[i]=Math.max(0,v.depth);shores[i]=v.shore;flowVectors.set([v.flowX,v.flowZ],i*2);});
  const index=data.vertices.length>65535?new Uint32Array(data.indices):new Uint16Array(data.indices);
  return {anchor,positions,directions,heights,uvs,flows,coords,depths,shores,flowVectors,index,bytes:positions.byteLength+directions.byteLength+heights.byteLength+uvs.byteLength+flows.byteLength+coords.byteLength+depths.byteLength+shores.byteLength+flowVectors.byteLength+index.byteLength};
}

function material(body:Body,flow:number,region:RiverRegion,riverSurface:boolean){
  // The shader only reserves uniforms for actual local lakes.  Reserving the
  // global draw limit here would waste scarce mobile fragment uniforms.
  const lakeSlots=Math.max(1,region.lakes.length),lakeEllipse=Array.from({length:lakeSlots},(_,i)=>{const l=region.lakes[i];return new THREE.Vector4(l?.x||0,l?.z||0,l?.radiusXM||1,l?.radiusZM||1);}),lakeRotation=Array.from({length:lakeSlots},(_,i)=>{const a=region.lakes[i]?.angle||0;return new THREE.Vector2(Math.cos(a),Math.sin(a));});
  return new THREE.ShaderMaterial({
    uniforms:{waterRadius:{value:body.radiusM},waterRelief:{value:1},waterBias:{value:WATER_BIAS_M},waterTime:{value:0},sunDirection:{value:new THREE.Vector3(1,0,0)},eyeRelative:{value:new THREE.Vector3()},waterEast:{value:new THREE.Vector3(...region.east)},waterNorth:{value:new THREE.Vector3(...region.north)},riverSurface:{value:riverSurface?1:0},lakeEllipse:{value:lakeEllipse},lakeRotation:{value:lakeRotation}},
    vertexShader:`#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 surfaceDirection; attribute float waterHeight; attribute vec2 waterCoord; attribute float waterDepth,shoreDistance; attribute vec2 flowVector; varying vec3 waterNormal,waterLocalPosition; varying vec2 waterCoordV,waterFlowV; varying float waterDepthV,shoreDistanceV; uniform float waterRadius,waterRelief,waterBias;
void main(){
  vec3 transformed=position+surfaceDirection*((waterHeight*(waterRelief-1.0)+waterBias)/waterRadius);
  waterNormal=surfaceDirection; waterLocalPosition=transformed; waterCoordV=waterCoord; waterFlowV=flowVector; waterDepthV=waterDepth; shoreDistanceV=shoreDistance;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(transformed,1.0);
  #include <logdepthbuf_vertex>
}`,
    fragmentShader:`#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 sunDirection,eyeRelative,waterEast,waterNorth; uniform float waterTime,riverSurface; const int LAKE_COUNT=${region.lakes.length}; uniform vec4 lakeEllipse[${lakeSlots}]; uniform vec2 lakeRotation[${lakeSlots}]; varying vec3 waterNormal,waterLocalPosition; varying vec2 waterCoordV,waterFlowV; varying float waterDepthV,shoreDistanceV;
void main(){
  // All vectors below are in the planet's local frame.  The ripple is only a
  // normal perturbation, evaluated in metre coordinates, so it cannot form a
  // kilometre-wide animated stripe or destabilise the physical water level.
  if(riverSurface>.5){for(int i=0;i<LAKE_COUNT;i++){vec2 d=waterCoordV-lakeEllipse[i].xy, r=lakeRotation[i]; vec2 q=vec2(d.x*r.x+d.y*r.y,-d.x*r.y+d.y*r.x)/lakeEllipse[i].zw; if(dot(q,q)<=1.0)discard;}}
  vec3 base=normalize(waterNormal),east=normalize(waterEast-base*dot(waterEast,base)),north=normalize(waterNorth-base*dot(waterNorth,base));
  vec2 flow=length(waterFlowV)>.01?normalize(waterFlowV):vec2(.72,.69); float drift=dot(waterCoordV,flow)*.42-waterTime*(length(waterFlowV)>.01?.75:.13);
  float footprint=max(length(dFdx(waterCoordV)),length(dFdy(waterCoordV))),rippleFade=1.0-smoothstep(.20,1.0,footprint),microFade=1.0-smoothstep(.035,.16,footprint);
  float a=sin(drift+waterCoordV.y*.71)*.035*rippleFade, b=sin(waterCoordV.x*1.27-waterCoordV.y*.91+waterTime*.19)*.022*rippleFade;
  // Sub-metre, differently directed wind ripples remain normal-only.  Their
  // derivative footprint fade removes them before they can alias at distance.
  float microEast=(sin(dot(waterCoordV,vec2(15.7,8.3))-waterTime*.85)*.018+sin(dot(waterCoordV,vec2(-6.4,12.1))+waterTime*.47)*.011)*microFade, microNorth=(sin(dot(waterCoordV,vec2(11.2,-14.6))+waterTime*.63)*.016+sin(dot(waterCoordV,vec2(5.1,18.3))-waterTime*.38)*.009)*microFade;
  vec3 n=normalize(base+east*(a+b+microEast)+north*(a*.65-b*.8+microNorth)); vec3 view=normalize(eyeRelative-waterLocalPosition); vec3 sun=normalize(sunDirection);
  float daylight=smoothstep(-.14,.08,dot(base,sun)),fresnel=pow(1.0-max(0.0,dot(n,view)),5.0);
  float absorption=1.0-exp(-max(0.,waterDepthV)*.32),skyUp=smoothstep(-.12,.78,dot(reflect(-view,n),base)); vec3 shallow=vec3(.055,.16,.17),deep=vec3(.012,.055,.075),nightSky=mix(vec3(.009,.018,.040),vec3(.002,.006,.017),skyUp),daySky=mix(vec3(.22,.34,.44),vec3(.04,.12,.27),skyUp),sky=mix(nightSky,daySky,daylight);
  vec3 color=mix(mix(shallow,deep,absorption),sky,.025+.72*fresnel);
  float glint=pow(max(0.,dot(reflect(-sun,n),view)),180.)*(.08+.22*fresnel)*daylight;
  float foam=smoothstep(.91,1.0,shoreDistanceV)*(1.0-smoothstep(.02,.55,waterDepthV))*(.035+.025*sin(waterCoordV.x*2.7+waterCoordV.y*1.9));
  color+=vec3(glint+foam*.45,glint+foam*.5,glint+foam*.45); color*=mix(.38,1.,daylight);
  gl_FragColor=vec4(color,1.0);
  #include <logdepthbuf_fragment>
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
    side:THREE.FrontSide,depthWrite:true,transparent:false,toneMapped:true
  });
}

export class RiverWater {
  readonly group=new THREE.Group();
  readonly body:Body;
  readonly region:RiverRegion;
  private chunks:Chunk[]=[];
  private disposed=false;
  private lastVisible=0;
  private rejected:string|null=null;
  constructor(body:Body,region:RiverRegion){
    this.body=body;this.region=region;
    this.group.name='Physical river and lake water';
    const active=region.channels.filter(c=>c.points.length>1), slots=MAX_DRAWS-region.lakes.length;
    if(region.lakes.length>MAX_DRAWS||active.length>slots){this.rejected='configured water needs more than 64 complete chunks';return;}
    // Reserve a slot for every lake and every channel first, then distribute
    // the remaining channel slots by segment count.  This covers every feature.
    const counts=new Map(active.map(c=>[c,1]));
    for(let free=slots-active.length;free>0;free--){const next=active.slice().sort((a,b)=>(b.points.length-1)/(counts.get(b)??1)-(a.points.length-1)/(counts.get(a)??1))[0];counts.set(next,(counts.get(next)??0)+1);}
    // Reject oversized procedural lakes before their concentric-ring arrays are
    // allocated.  The regular preflight below still accounts for every river
    // and lake as CPU+GPU geometry.
    if(region.lakes.some(l=>lakeBytes(l)*2>MAX_BYTES)){this.rejected='configured lake exceeds the 16 MiB CPU+GPU geometry budget';return;}
    const proposed:ChunkData[]=[];
    for(const channel of active){const chunks=counts.get(channel)!,step=Math.ceil((channel.points.length-1)/chunks);for(let start=0;start+1<channel.points.length;start+=step)proposed.push(channelChunk(channel,start,Math.min(channel.points.length-1,start+step),region));}
    for(const lake of region.lakes)proposed.push(lakeChunk(lake,region));
    const bytes=proposed.reduce((n,d)=>n+riverWaterGeometry(d,body).bytes*2,0);
    if(bytes>MAX_BYTES){this.rejected='configured water exceeds the 16 MiB CPU+GPU geometry budget';return;}
    for(const data of proposed)this.install(data);
  }
  private install(data:ChunkData){
    if(this.chunks.length>=MAX_DRAWS)throw new Error('RiverWater preflight lost chunk coverage');
    const d=riverWaterGeometry(data,this.body);
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(d.positions,3));geometry.setAttribute('surfaceDirection',new THREE.BufferAttribute(d.directions,3));geometry.setAttribute('waterHeight',new THREE.BufferAttribute(d.heights,1));geometry.setAttribute('waterCoord',new THREE.BufferAttribute(d.coords,2));geometry.setAttribute('waterDepth',new THREE.BufferAttribute(d.depths,1));geometry.setAttribute('shoreDistance',new THREE.BufferAttribute(d.shores,1));geometry.setAttribute('flowVector',new THREE.BufferAttribute(d.flowVectors,2));geometry.setAttribute('uv',new THREE.BufferAttribute(d.uvs,2));geometry.setIndex(new THREE.BufferAttribute(d.index,1));geometry.computeBoundingSphere();
    const m=material(this.body,data.flow,this.region,data.kind==='river'),mesh=new THREE.Mesh(geometry,m);mesh.position.set(...d.anchor);mesh.frustumCulled=false;mesh.userData.water={kind:data.kind,sourceId:data.sourceId};this.group.add(mesh);
    let radius=0;for(let i=0;i<d.directions.length;i+=3)radius=Math.max(radius,Math.acos(clamp(dot(d.anchor,[d.directions[i],d.directions[i+1],d.directions[i+2]]),-1,1)));
    this.chunks.push({mesh,center:unit(d.anchor),radius,bytes:d.bytes*2,visible:false,material:m});
  }
  update(eye:V3,sun:V3,timeSeconds:number,relief:number){
    if(this.disposed)return; const distance=Math.hypot(...eye),look=distance?scale(eye,1/distance):[0,1,0] as V3;let visible=0;
    for(const c of this.chunks){
      const horizon=distance<1.0001||dot(look,c.center)+Math.sin(c.radius)>=1/distance;
      const altitude=Math.max(0,distance-1)*this.body.radiusM;
      const nearby=Math.acos(clamp(dot(look,c.center),-1,1))*this.body.radiusM-c.radius*this.body.radiusM<=Math.max(18000,altitude*4+12000);
      c.visible=horizon&&nearby&&visible<MAX_DRAWS;c.mesh.visible=c.visible;if(c.visible)visible++;
      c.material.uniforms.waterTime.value=timeSeconds;c.material.uniforms.waterRelief.value=relief;c.material.uniforms.sunDirection.value.set(...sun);c.material.uniforms.eyeRelative.value.set(eye[0]-c.mesh.position.x,eye[1]-c.mesh.position.y,eye[2]-c.mesh.position.z);
    }this.lastVisible=visible;
  }
  diagnostics(){const bytes=this.chunks.reduce((n,c)=>n+c.bytes,0);return {draws:this.lastVisible,resident:this.chunks.length,accountedBytes:bytes,budgetBytes:MAX_BYTES,withinBudget:!this.rejected&&bytes<=MAX_BYTES&&this.chunks.length<=MAX_DRAWS,rejected:this.rejected,geometryAccounting:'CPU+GPU x2'};}
  /** Terrain may discard its wet proxy only when every authored water feature installed. */
  completeCoverage(){return !this.disposed&&!this.rejected&&this.chunks.length>0;}
  dispose(){if(this.disposed)return;this.disposed=true;for(const c of this.chunks){this.group.remove(c.mesh);c.mesh.geometry.dispose();c.material.dispose();}this.chunks=[];this.group.clear();}
}
