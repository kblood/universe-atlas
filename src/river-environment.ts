import * as THREE from 'three';
import type {Body,V3} from './catalog.ts';
import type {RiverRegion} from './river-types.ts';
import {surfaceQuery} from './world-surface.ts';
import {biomeClassifier} from './surface-biomes.ts';

const CELL_M=100, RANGE_M=500, ALTITUDE_HIDE_M=1500, MAX_DRAWS=6, MAX_BYTES=12*1024*1024, ENV_VERSION='river-environment-1';
const hash=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0;};
const random=(key:string,n:number)=>((hash(key+'/'+n)>>>0)+.5)/4294967296;
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const dot=(a:V3,b:V3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a:V3,b:V3):V3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const scale=(a:V3,n:number):V3=>[a[0]*n,a[1]*n,a[2]*n];
const unit=(a:V3):V3=>{const n=Math.hypot(...a);return n?[a[0]/n,a[1]/n,a[2]/n]:[0,1,0];};
const directionAt=(region:RiverRegion,x:number,z:number):V3=>unit([region.origin[0]+(region.east[0]*x+region.north[0]*z)/region.radiusM,region.origin[1]+(region.east[1]*x+region.north[1]*z)/region.radiusM,region.origin[2]+(region.east[2]*x+region.north[2]*z)/region.radiusM]);
type Kind='trunk'|'branch'|'canopyLow'|'canopyHigh'|'stone'|'grass';
type Placement={id:string;kind:Kind;x:number;z:number;height:number;scale:number;turn:number};
type Cell={key:string;placements:Placement[]};

/** A tiny deterministic cutout atlas: opaque leaf sprays over transparent gaps. */
export function leafSprayTexture(){const size=16,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const dx=(x+0.5-size/2)/(size/2),dy=(y+0.5-size/2)/(size/2),vein=Math.abs(dx)<.12&&dy<.72,leaf=(dx*dx/.7+dy*dy<.78)||(Math.abs(dx-.28)<.22&&Math.abs(dy+.1)<.52)||(Math.abs(dx+.28)<.22&&Math.abs(dy+.1)<.52);const i=(y*size+x)*4;data[i]=61;data[i+1]=128;data[i+2]=62;data[i+3]=leaf||vein?255:0;}const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;texture.needsUpdate=true;return texture;}
/** 24 crossed, offset leaf cards make an irregular crown without a sphere shell. */
export function leafClusterGeometry(cards=24){const p:number[]=[],uv:number[]=[],idx:number[]=[];for(let i=0;i<cards;i++){const a=i*2.3999632297,r=.18+.62*((i*17)%19)/19,y=-.45+.9*((i*11)%23)/23,w=.32+.2*((i*7)%13)/13,h=.4+.25*((i*5)%17)/17,cx=Math.cos(a)*r,cz=Math.sin(a)*r,ex=Math.cos(a+Math.PI/2)*w,ez=Math.sin(a+Math.PI/2)*w,n=p.length/3;p.push(cx-ex,y-h*.5,cz-ez,cx+ex,y-h*.5,cz+ez,cx+ex,y+h*.5,cz+ez,cx-ex,y+h*.5,cz-ez);uv.push(0,0,1,0,1,1,0,1);idx.push(n,n+1,n+2,n,n+2,n+3);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
function grassClumpGeometry(){const p:number[]=[],idx:number[]=[];for(let i=0;i<3;i++){const a=i*2.0944,w=.035,h=.32+i*.09,x=Math.cos(a)*.05,z=Math.sin(a)*.05,n=p.length/3;p.push(x-w,0,z,x+w,0,z,x,h,z);idx.push(n,n+1,n+2,n+2,n+1,n);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g;}

/** Deterministic visual dressing only: no instance has a physics collider. */
export class RiverEnvironment {
  readonly group=new THREE.Group();
  readonly body:Body; readonly region:RiverRegion;
  private readonly sample:ReturnType<typeof surfaceQuery>;
  private readonly biome:ReturnType<typeof biomeClassifier>;
  private readonly leafTextures:THREE.DataTexture[]=[];
  private readonly meshes:Record<Kind,THREE.InstancedMesh>;
  private readonly cells=new Map<string,Cell>();
  private readonly wanted=new Set<string>();
  private readonly pending:string[]=[];
  private readonly matrix=new THREE.Matrix4(); private readonly basis=new THREE.Matrix4(); private readonly rotation=new THREE.Matrix4();
  private readonly position=new THREE.Vector3(); private readonly sx=new THREE.Vector3(); private readonly sy=new THREE.Vector3(); private readonly sz=new THREE.Vector3();
  private anchor:V3=[0,1,0]; private observerDirection:V3=[0,1,0]; private centerKey=''; private changed=false; private disposed=false; private generated=0; private visible=false; private focusX=0; private focusZ=0; private updateMs=0;
  constructor(body:Body,region:RiverRegion){
    this.body=body;this.region=region;
    this.group.name='River bank environment (visual only)';this.sample=surfaceQuery({...body,hydrology:region});this.biome=biomeClassifier(body);
    const mat=(color:number)=>new THREE.MeshStandardMaterial({color,roughness:.9});
    const make=(geometry:THREE.BufferGeometry,material:THREE.Material,count:number,kind:Kind)=>{const m=new THREE.InstancedMesh(geometry,material,count);m.name='River environment '+kind;m.count=0;m.frustumCulled=false;this.group.add(m);return m;};
    const trunk=new THREE.CylinderGeometry(.18,.28,1,6);trunk.translate(0,.5,0);const branch=new THREE.CylinderGeometry(.055,.09,1,5);branch.translate(0,.5,0);const leafA=leafSprayTexture(),leafB=leafSprayTexture();this.leafTextures.push(leafA,leafB);const leaves=(map:THREE.Texture,color:number)=>new THREE.MeshStandardMaterial({map,color,roughness:.86,alphaTest:.45,side:THREE.DoubleSide,transparent:false,depthWrite:true});
    this.meshes={trunk:make(trunk,mat(0x5a3820),384,'trunk'),branch:make(branch,mat(0x674125),1152,'branch'),canopyLow:make(leafClusterGeometry(26),leaves(leafA,0x356f3a),384,'canopyLow'),canopyHigh:make(leafClusterGeometry(18),leaves(leafB,0x5c9645),384,'canopyHigh'),stone:make(new THREE.DodecahedronGeometry(.55,0),mat(0x666158),520,'stone'),grass:make(grassClumpGeometry(),mat(0x6c8d49),4000,'grass')};
  }
  private key(x:number,z:number){return x+','+z;}
  private qualifies(x:number,z:number){const d=directionAt(this.region,x,z),s=this.sample(d);if(s.wet||s.influence<=.02||this.biome(d,s.visibleHeightM,1).weights[3]>.3)return null;const step=4,px=this.sample(directionAt(this.region,x+step,z)).visibleHeightM,nx=this.sample(directionAt(this.region,x-step,z)).visibleHeightM,pz=this.sample(directionAt(this.region,x,z+step)).visibleHeightM,nz=this.sample(directionAt(this.region,x,z-step)).visibleHeightM;const slope=Math.atan(Math.hypot((px-nx)/(2*step),(pz-nz)/(2*step)))*180/Math.PI;return slope<26?{height:s.visibleHeightM,slope}:null;}
  private buildCell(key:string){const [cx,cz]=key.split(',').map(Number),baseX=cx*CELL_M,baseZ=cz*CELL_M,placements:Placement[]=[];const temperate=this.body.water>0&&this.body.temperatureK>=250&&this.body.temperatureK<=325&&this.body.type!=='Ice world'&&this.body.type!=='Gas giant';
    const seed=this.body.seed+'/'+this.region.id+'/'+ENV_VERSION+'/'+key;
    for(let i=0;i<24;i++){const x=baseX+(random(seed,i)*.82+.09)*CELL_M,z=baseZ+(random(seed,i+20)*.82+.09)*CELL_M,q=this.qualifies(x,z);if(!q)continue;const id=this.region.id+'/'+ENV_VERSION+'/'+key+'/'+i,bank=this.sample(directionAt(this.region,x,z)).bank;
      if(temperate&&bank>.06&&random(seed,i+40)<.44){const h=4+random(seed,i+60)*8,sc=.72+random(seed,i+80)*.55;placements.push({id:id+'/trunk',kind:'trunk',x,z,height:q.height,scale:h,turn:random(seed,i+100)*Math.PI*2});placements.push({id:id+'/low',kind:'canopyLow',x,z,height:q.height+h*.73,scale:sc*h*.30,turn:0});placements.push({id:id+'/high',kind:'canopyHigh',x,z,height:q.height+h*.86,scale:sc*h*.22,turn:random(seed,i+120)*Math.PI});for(let b=0;b<3;b++)placements.push({id:id+'/branch/'+b,kind:'branch',x,z,height:q.height+h*(.45+b*.11),scale:h*(.28+b*.035),turn:random(seed,i*7+b)*Math.PI*2});}
      else if(random(seed,i+140)<.38)placements.push({id:id+'/stone',kind:'stone',x,z,height:q.height,scale:.35+random(seed,i+160)*.9,turn:random(seed,i+180)*6.28});
      if(random(seed,i+200)<.86)placements.push({id:id+'/grass',kind:'grass',x,z,height:q.height+.02,scale:.55+random(seed,i+220)*.75,turn:random(seed,i+240)*6.28});
    }return {key,placements};
  }
  private compose(p:Placement){const d=directionAt(this.region,p.x,p.z),world=scale(d,1+p.height/this.body.radiusM),local=sub(world,this.anchor),up=new THREE.Vector3(...d);this.sy.copy(up);this.sx.set(...this.region.east).addScaledVector(up,-dot(this.region.east,d)).normalize();this.sz.crossVectors(this.sx,this.sy).normalize();this.basis.makeBasis(this.sx,this.sy,this.sz);this.position.set(...local);this.basis.setPosition(this.position);
    const r=1/this.body.radiusM;let x=p.scale*r,y=p.scale*r,z=p.scale*r;if(p.turn)this.basis.multiply(this.rotation.makeRotationY(p.turn));if(p.kind==='trunk'){x=.25*p.scale*r;z=x;y=p.scale*r;}if(p.kind==='branch'){x=.08*p.scale*r;z=x;y=p.scale*r;this.basis.multiply(this.rotation.makeRotationZ(.72));}if(p.kind==='stone'){y*=.58;x*=1.15;}if(p.kind==='grass'){x=p.scale*r;y=p.scale*r;z=p.scale*r*.24;}this.matrix.copy(this.basis).scale(new THREE.Vector3(x,y,z));return this.matrix;
  }
  private flush(){const lists:Record<Kind,Placement[]>={trunk:[],branch:[],canopyLow:[],canopyHigh:[],stone:[],grass:[]};for(const c of this.cells.values())for(const p of c.placements)lists[p.kind].push(p);for(const kind of Object.keys(this.meshes) as Kind[]){const mesh=this.meshes[kind],items=lists[kind];items.sort((a,b)=>Math.hypot(a.x-this.focusX,a.z-this.focusZ)-Math.hypot(b.x-this.focusX,b.z-this.focusZ)||a.id.localeCompare(b.id));mesh.count=Math.min(mesh.instanceMatrix.count,items.length);for(let i=0;i<mesh.count;i++)mesh.setMatrixAt(i,this.compose(items[i]));mesh.instanceMatrix.needsUpdate=true;}this.changed=false;}
  update(observer:V3,_dt:number){if(this.disposed)return;const started=performance.now(),radius=Math.hypot(observer[0],observer[1],observer[2]),d=this.observerDirection;d[0]=observer[0]/radius;d[1]=observer[1]/radius;d[2]=observer[2]/radius;const projection=dot(d,this.region.origin);if(projection<=.5){this.group.visible=false;this.visible=false;this.updateMs=performance.now()-started;return;}const groundHere=this.sample(d).visibleHeightM,clearance=(radius-1)*this.body.radiusM-groundHere;if(clearance>ALTITUDE_HIDE_M){this.group.visible=false;this.visible=false;this.updateMs=performance.now()-started;return;}this.group.visible=true;this.visible=true;const x=dot(d,this.region.east)*this.body.radiusM/projection,z=dot(d,this.region.north)*this.body.radiusM/projection,cx=Math.floor(x/CELL_M),cz=Math.floor(z/CELL_M),center=this.key(cx,cz);
    if(center!==this.centerKey){this.centerKey=center;this.focusX=x;this.focusZ=z;const ground=this.sample(d).visibleHeightM;this.anchor=[d[0]*(1+ground/this.body.radiusM),d[1]*(1+ground/this.body.radiusM),d[2]*(1+ground/this.body.radiusM)];this.group.position.set(...this.anchor);this.wanted.clear();for(let dz=-5;dz<=5;dz++)for(let dx=-5;dx<=5;dx++)if(Math.hypot(dx,dz)*CELL_M<=RANGE_M)this.wanted.add(this.key(cx+dx,cz+dz));for(const key of [...this.cells.keys()])if(!this.wanted.has(key)){this.cells.delete(key);this.changed=true;}for(const key of this.wanted)if(!this.cells.has(key)&&!this.pending.includes(key))this.pending.push(key);}
    for(let n=0;n<1&&this.pending.length;n++){const key=this.pending.shift()!;if(this.wanted.has(key)){this.cells.set(key,this.buildCell(key));this.generated++;this.changed=true;}}
    if(this.changed)this.flush();this.updateMs=performance.now()-started;
  }
  diagnostics(){const meshes=Object.values(this.meshes) as THREE.InstancedMesh[],instances=meshes.reduce((n,m)=>n+m.count,0),textureBytes=this.leafTextures.reduce((n,t)=>n+(t.image.data?.byteLength||0)*2,0),bytes=meshes.reduce((n,m)=>{let g=0;for(const a of Object.values(m.geometry.attributes))g+=(a as THREE.BufferAttribute).array.byteLength;g+=m.geometry.index?.array.byteLength||0;return n+(m.instanceMatrix.array.byteLength+g)*2;},textureBytes),counts=Object.fromEntries((Object.entries(this.meshes) as [Kind,THREE.InstancedMesh][]).map(([k,m])=>[k,m.count]));return {draws:this.visible?MAX_DRAWS:0,residentCells:this.cells.size,pendingCells:this.pending.length,instances,counts,accountedBytes:bytes,textureBytes,budgetBytes:MAX_BYTES,withinBudget:bytes<=MAX_BYTES,placementVersion:ENV_VERSION,generatedCells:this.generated,updateMs:this.updateMs,individualColliders:false};}
  dispose(){if(this.disposed)return;this.disposed=true;for(const mesh of Object.values(this.meshes)){this.group.remove(mesh);mesh.dispose();mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();}for(const texture of this.leafTextures)texture.dispose();this.cells.clear();this.pending.length=0;this.group.clear();}
}
