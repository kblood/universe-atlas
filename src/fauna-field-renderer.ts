import * as THREE from 'three';
import type {CreatureGenome,CreatureGait} from './fauna-runtime.ts';
import {createFaunaMaterial} from './fauna-material.ts';

/** Animals drawn through the instanced anatomy per frame. Sized from the
 * measured ground-level population at LETHRA-001 G001/C2128,0,1/0/planet/1
 * (224 camera-visible plus ~65 shadow casters inside 600 m): the former 128
 * dropped 96 in-view animals by distance rank, so which distant animals were
 * drawn depended on how many nearer ones the camera happened to face. */
export const FAUNA_FIELD_CAPACITY=512;
/** Eyes (~5 cm) fall below one 1440p pixel beyond this range at the 48 degree
 * desktop field of view; skipping them there is a fixed distance rule, not a
 * count-dependent budget, so it cannot pop an animal in view. */
export const FAUNA_FIELD_EYE_DETAIL_M=60;
/** Forward-looking low flight needs more than the old 280 m proxy range. */
export const FAUNA_FIELD_VISIBLE_M=600;
const UP=new THREE.Vector3(0,1,0);
/** Parsed genome colours. `Color.set(string)` runs a regex parse and an
 * sRGB-to-linear conversion; it was a third of the fauna frame (512 animals
 * × ~30 parts). The cached Color holds exactly what `set` produced. Genome
 * colours are a small, stable palette; the bound only guards pathological
 * content. */
const colorCache=new Map<string,THREE.Color>();
function faunaColor(style:string):THREE.Color {
  let color=colorCache.get(style);
  if(!color){if(colorCache.size>=4096)colorCache.clear();color=new THREE.Color().set(style);colorCache.set(style,color);}
  return color;
}

/** Instanced fallback for specimens outside the near rig pool. Anatomy is
 * drawn as four primitive batches using the same genome and base coat lighting
 * as the near body. This simpler pose does not reproduce the near rig's IK or
 * grazing, so it is not yet a continuous representation handoff.
 * Geometry is in metres; instance translations are relative to a double-
 * precision local origin before they reach the Float32 instance buffers. */
export class FaunaFieldRenderer {
  readonly group=new THREE.Group();
  private meshes:THREE.InstancedMesh[];
  private counts=[0,0,0,0];
  private animalCount=0;
  private quaternion=new THREE.Quaternion();
  private direction=new THREE.Vector3();
  private a=new THREE.Vector3();
  private b=new THREE.Vector3();
  constructor(){
    const geometries=[new THREE.SphereGeometry(1,10,7),new THREE.CylinderGeometry(1,1,1,7),new THREE.ConeGeometry(1,1,6),new THREE.BoxGeometry(1,1,1)];
    this.meshes=geometries.map((g,i)=>{
      const m=new THREE.InstancedMesh(g,createFaunaMaterial(),FAUNA_FIELD_CAPACITY*[4,10,4,10][i]);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;m.count=0;
      m.castShadow=true;m.receiveShadow=true;
      m.name=['Fauna bodies and eyes','Fauna limbs necks tails','Fauna ears and horns','Fauna feet and armour'][i];
      this.group.add(m);return m;
    });
    this.group.name='Stable dated fauna';
  }
  beginFrame(origin:THREE.Vector3){this.group.position.copy(origin);this.counts.fill(0);this.animalCount=0;}
  /** Writes `parent × compose((x,y,z), rotation ?? identity, (sx,sy,sz))`
   * straight into instance `counts[kind]`. The arithmetic is exactly
   * three.js `Matrix4.compose` followed by `multiplyMatrices`, term for
   * term and in the same order (zero terms included), so every Float32 lane
   * is bit-identical to the former `setMatrixAt(multiplyMatrices(...))`; it
   * only skips two Matrix4 round trips per part. */
  private part(kind:number,parent:THREE.Matrix4,x:number,y:number,z:number,sx:number,sy:number,sz:number,color:string,rotation?:THREE.Quaternion){
    let b11:number,b21:number,b31:number,b12:number,b22:number,b32:number,b13:number,b23:number,b33:number;
    if(rotation){
      const qx=rotation.x,qy=rotation.y,qz=rotation.z,qw=rotation.w;
      const x2=qx+qx,y2=qy+qy,z2=qz+qz,xx=qx*x2,xy=qx*y2,xz=qx*z2,yy=qy*y2,yz=qy*z2,zz=qz*z2,wx=qw*x2,wy=qw*y2,wz=qw*z2;
      b11=(1-(yy+zz))*sx;b21=(xy+wz)*sx;b31=(xz-wy)*sx;
      b12=(xy-wz)*sy;b22=(1-(xx+zz))*sy;b32=(yz+wx)*sy;
      b13=(xz+wy)*sz;b23=(yz-wx)*sz;b33=(1-(xx+yy))*sz;
    }else{
      // compose() with the identity quaternion (0,0,0,1): every product term is exactly 0 or 1.
      b11=(1-(0+0))*sx;b21=(0+0)*sx;b31=(0-0)*sx;
      b12=(0-0)*sy;b22=(1-(0+0))*sy;b32=(0+0)*sy;
      b13=(0+0)*sz;b23=(0-0)*sz;b33=(1-(0+0))*sz;
    }
    const ae=parent.elements;
    const a11=ae[0],a12=ae[4],a13=ae[8],a14=ae[12],a21=ae[1],a22=ae[5],a23=ae[9],a24=ae[13];
    const a31=ae[2],a32=ae[6],a33=ae[10],a34=ae[14],a41=ae[3],a42=ae[7],a43=ae[11],a44=ae[15];
    const mesh=this.meshes[kind],index=this.counts[kind]++,te=mesh.instanceMatrix.array as Float32Array,o=index*16;
    te[o]=a11*b11+a12*b21+a13*b31+a14*0;te[o+4]=a11*b12+a12*b22+a13*b32+a14*0;te[o+8]=a11*b13+a12*b23+a13*b33+a14*0;te[o+12]=a11*x+a12*y+a13*z+a14*1;
    te[o+1]=a21*b11+a22*b21+a23*b31+a24*0;te[o+5]=a21*b12+a22*b22+a23*b32+a24*0;te[o+9]=a21*b13+a22*b23+a23*b33+a24*0;te[o+13]=a21*x+a22*y+a23*z+a24*1;
    te[o+2]=a31*b11+a32*b21+a33*b31+a34*0;te[o+6]=a31*b12+a32*b22+a33*b32+a34*0;te[o+10]=a31*b13+a32*b23+a33*b33+a34*0;te[o+14]=a31*x+a32*y+a33*z+a34*1;
    te[o+3]=a41*b11+a42*b21+a43*b31+a44*0;te[o+7]=a41*b12+a42*b22+a43*b32+a44*0;te[o+11]=a41*b13+a42*b23+a43*b33+a44*0;te[o+15]=a41*x+a42*y+a43*z+a44*1;
    mesh.setColorAt(index,faunaColor(color));
  }
  private segment(parent:THREE.Matrix4,a:THREE.Vector3,b:THREE.Vector3,radius:number,color:string){
    this.direction.subVectors(b,a);const length=this.direction.length();
    this.quaternion.setFromUnitVectors(UP,this.direction.normalize());
    this.part(1,parent,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,radius,length,radius,color,this.quaternion);
  }
  /** parent is a metre-to-radius-normalized transform with LOCAL translation. */
  submit(g:CreatureGenome,parent:THREE.Matrix4,timeS:number,gait:CreatureGait,distanceM=0):boolean{
    if(this.animalCount>=FAUNA_FIELD_CAPACITY)return false;this.animalCount++;
    const moving=gait!=='idle',phase=timeS*g.walkSpeed/Math.max(.2,g.strideLength)*Math.PI*2;
    const bob=moving?Math.sin(phase*2)*g.legLength*.012:Math.sin(timeS*1.8)*.006;
    const torsoY=g.legLength+g.torsoHeight*.36+bob;
    this.part(0,parent,0,torsoY,0,g.torsoLength*.52,g.torsoHeight*.42,g.torsoWidth*.52,g.color);
    const nx=g.torsoLength*.42,ny=torsoY+g.torsoHeight*.12;
    const hx=nx+g.neckLength*.35,hy=ny+g.neckRise+g.neckLength*.66;
    this.segment(parent,this.a.set(nx,ny,0),this.b.set(hx,hy,0),g.headWidth*.27,g.color);
    this.part(0,parent,hx+g.headLength*.3,hy,0,g.headLength*.52,g.headWidth*.48,g.headWidth*.52,g.color);
    this.segment(parent,this.a.set(-g.torsoLength*.43,torsoY,0),this.b.set(-g.torsoLength*.43-g.tailLength*.84,torsoY+g.tailLength*.12,Math.sin(phase*.5)*g.tailLength*.08),Math.max(.006,g.torsoWidth*.04),g.accentColor);
    for(const side of [-1,1]){
      if(distanceM<=FAUNA_FIELD_EYE_DETAIL_M)this.part(0,parent,hx+g.headLength*.57,hy+g.headWidth*.12,side*g.headWidth*.43,.025,.025,.025,'#151a12');
      if(g.earLength>.01)this.part(2,parent,hx+g.headLength*.15,hy+g.headWidth*.42,side*g.headWidth*.32,g.headWidth*.1,g.earLength,g.headWidth*.1,g.accentColor);
      if(g.hornLength>.01)this.part(2,parent,hx+g.headLength*.35,hy+g.headWidth*.48+g.hornLength*.42,side*g.headWidth*.25,g.headWidth*.09,g.hornLength,g.headWidth*.09,g.accentColor);
      for(const rear of [false,true]){
        const hipX=(rear?-.3:.3)*g.torsoLength,z=side*g.stanceWidth*.5;
        const legPhase=phase+(rear?Math.PI:0)+(side<0?Math.PI:0);
        const stride=moving?Math.sin(legPhase)*g.strideLength*.24:0;
        const lift=moving?Math.max(0,Math.cos(legPhase))*g.legLength*.12:0;
        const footX=hipX+stride,footY=g.footWidth*.18+lift;
        const kneeX=hipX+(rear?.12:-.12)*g.legLength+stride*.45,kneeY=g.legLength*.48+lift*.5;
        this.segment(parent,this.a.set(hipX,g.legLength+bob,z*.82),this.b.set(kneeX,kneeY,z),g.footWidth*.27,g.color);
        this.segment(parent,this.a.set(kneeX,kneeY,z),this.b.set(footX,footY,z),g.footWidth*.2,g.accentColor);
        this.part(3,parent,footX+g.footLength*.15,footY,z,g.footLength,g.footWidth*.36,g.footWidth,g.accentColor);
      }
    }
    if(g.armor>.05){const plates=Math.max(2,Math.min(6,Math.round(2+g.armor*4)));
      for(let i=0;i<plates;i++)this.part(3,parent,-g.torsoLength*.3+i*g.torsoLength*.6/Math.max(1,plates-1),torsoY+g.torsoHeight*.38,0,g.torsoLength/plates*.75,g.torsoHeight*.09,g.torsoWidth*1.02,g.accentColor);
    }
    return true;
  }
  endFrame(){for(let i=0;i<this.meshes.length;i++){const m=this.meshes[i];m.count=this.counts[i];m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}}
  get count(){return this.animalCount;}
  get allocatedBytes(){return this.meshes.reduce((sum,m)=>sum+m.instanceMatrix.array.byteLength+(m.instanceColor?.array.byteLength??0)+Object.values(m.geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0),0)*2;}
  dispose(){for(const m of this.meshes){m.geometry.dispose();(m.material as THREE.Material).dispose();}this.group.removeFromParent();}
}
