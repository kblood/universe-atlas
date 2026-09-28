/** Shared procedural rock meshes for the canonical rock field.
 *
 * One small mesh per (RockFamily, shape variant, LOD). Every LOD evaluates the
 * same analytic shape, so silhouettes agree across distance bands. Units are
 * relative: horizontal diameter 1, base on y=0; instances apply the physical
 * diameter, aspect and embedding. Output is plain typed arrays so the shapes
 * can be verified without WebGL. No external assets or textures. */
import type {RockFamily} from './biosphere-model.ts';
import {ROCK_VARIANTS} from './rock-field.ts';

export const ROCK_GEOMETRY_VERSION='atlas-rock-geometry-1';
export const ROCK_LOD_COUNT=3;
export type RockLod=0|1|2;
export type RockMeshData={
  positions:Float32Array;normals:Float32Array;colors:Float32Array;
  triangles:number;height:number;boundCenterY:number;boundRadius:number;
};
type P=[number,number,number];

function fnv(text:string){let h=2166136261>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(key:string){let s=fnv(key)||1;return ()=>{s=(s+0x6d2b79f5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:a));
const smooth=(e0:number,e1:number,x:number)=>{const t=clamp((x-e0)/(e1-e0),0,1);return t*t*(3-2*t);};
const sub=(a:P,b:P):P=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a:P,b:P):P=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a:P,b:P)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const norm=(a:P):P=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];};
function unitVector(r:()=>number):P{const z=r()*2-1,a=r()*Math.PI*2,s=Math.sqrt(1-z*z);return [Math.cos(a)*s,z,Math.sin(a)*s];}

/** Unit icosphere; level 0/1/2 gives 20/80/320 triangles. */
export function icosphere(level:number):{vertices:P[];faces:[number,number,number][]}{
  const t=(1+Math.sqrt(5))/2;
  const vertices:P[]=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(v=>norm(v as P));
  let faces:[number,number,number][]=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
  for(let l=0;l<level;l++){
    const cache=new Map<string,number>(),mid=(a:number,b:number)=>{const k=a<b?`${a}_${b}`:`${b}_${a}`;let i=cache.get(k);if(i===undefined){const p=vertices[a],q=vertices[b];i=vertices.push(norm([(p[0]+q[0])/2,(p[1]+q[1])/2,(p[2]+q[2])/2]))-1;cache.set(k,i);}return i;};
    const next:[number,number,number][]=[];
    for(const [a,b,c] of faces){const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);next.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]);}
    faces=next;
  }
  return {vertices,faces};
}

class Builder {
  readonly p:number[]=[];readonly n:number[]=[];readonly c:number[]=[];
  /** Flat triangle, wound so its normal faces away from `inside`. */
  tri(a:P,b:P,d:P,inside:P,shade:number){
    let normal=cross(sub(b,a),sub(d,a));const len=Math.hypot(...normal);if(len<1e-12)return;
    normal=[normal[0]/len,normal[1]/len,normal[2]/len];
    const centre:P=[(a[0]+b[0]+d[0])/3,(a[1]+b[1]+d[1])/3,(a[2]+b[2]+d[2])/3];
    if(dot(normal,sub(centre,inside))<0){const s=b;b=d;d=s;normal=[-normal[0],-normal[1],-normal[2]];}
    for(const v of [a,b,d]){this.p.push(...v);this.n.push(...normal);this.c.push(shade,shade,shade);}
  }
  /** Smooth triangle with supplied vertex normals (already outward). */
  smoothTri(v:[P,P,P],normals:[P,P,P],shade:[number,number,number]){
    const face=cross(sub(v[1],v[0]),sub(v[2],v[0]));
    const avg:P=[normals[0][0]+normals[1][0]+normals[2][0],normals[0][1]+normals[1][1]+normals[2][1],normals[0][2]+normals[1][2]+normals[2][2]];
    const order=dot(face,avg)<0?[0,2,1]:[0,1,2];
    for(const i of order){this.p.push(...v[i]!);this.n.push(...normals[i]!);this.c.push(shade[i]!,shade[i]!,shade[i]!);}
  }
  finish():RockMeshData{
    const positions=new Float32Array(this.p),normals=new Float32Array(this.n),colors=new Float32Array(this.c);
    // Normalise: horizontal diameter 1, base on y=0.
    let minY=Infinity,maxY=-Infinity,maxR=0;
    for(let i=0;i<positions.length;i+=3){minY=Math.min(minY,positions[i+1]);maxY=Math.max(maxY,positions[i+1]);maxR=Math.max(maxR,Math.hypot(positions[i],positions[i+2]));}
    const k=.5/Math.max(1e-6,maxR);
    for(let i=0;i<positions.length;i+=3){positions[i]*=k;positions[i+1]=(positions[i+1]-minY)*k;positions[i+2]*=k;}
    const height=(maxY-minY)*k,cy=height/2;let radius=0;
    // Ground-contact occlusion: darker toward the buried base.
    for(let i=0;i<positions.length;i+=3){
      const y=positions[i+1],ao=.58+.42*smooth(0,.42*height,y),up=normals[i+1]>.72?1.03:1;
      for(let j=0;j<3;j++)colors[i+j]=Math.min(1,colors[i+j]*ao*up);
      radius=Math.max(radius,Math.hypot(positions[i],y-cy,positions[i+2]));
    }
    return {positions,normals,colors,triangles:positions.length/9,height,boundCenterY:cy,boundRadius:radius};
  }
}

function validate(family:RockFamily,variant:number,lod:number){
  if(!family||typeof family.id!=='string'||!['angular','layered','rounded'].includes(family.form))throw new Error('Invalid rock family');
  if(!Number.isInteger(variant)||variant<0||variant>=ROCK_VARIANTS)throw new Error(`variant must be an integer from 0 to ${ROCK_VARIANTS-1}`);
  if(lod!==0&&lod!==1&&lod!==2)throw new Error('lod must be 0, 1 or 2');
}
const ICO_LEVEL=[2,1,0] as const;

/** Water-worn/exfoliated boulder: smooth low-frequency lobes, flat underside. */
function rounded(b:Builder,family:RockFamily,r:()=>number,lod:RockLod){
  const amp=.05+.15*clamp(family.roughness,0,1),lobes=Array.from({length:6},()=>({d:unitVector(r),a:(r()<.3?-1:1)*amp*(.5+r()*.5),k:3+r()*3}));
  const hRatio=.55+.17*r(),floor=-.62*hRatio;
  const shape=(n:P):P=>{let rad=1;for(const l of lobes)rad+=l.a*Math.exp((dot(n,l.d)-1)*l.k);return [n[0]*rad,Math.max(floor,n[1]*rad*hRatio),n[2]*rad];};
  const {vertices,faces}=icosphere(ICO_LEVEL[lod]),moved=vertices.map(shape),acc=moved.map(():P=>[0,0,0]);
  for(const [a,c,d] of faces){const f=cross(sub(moved[c],moved[a]),sub(moved[d],moved[a])),centre=moved[a];const s=dot(f,centre)<0?-1:1;for(const i of [a,c,d])for(let j=0;j<3;j++)acc[i][j]+=f[j]*s;}
  const normals=acc.map(norm);
  for(const [a,c,d] of faces)b.smoothTri([moved[a],moved[c],moved[d]],[normals[a],normals[c],normals[d]],[1,1,1]);
}
/** Exact convex polytope: a box clipped by half-spaces n.x <= d. Faces stay
 * planar polygons (outward CCW), so fracture facets and edges are crisp. */
export function clipConvex(faces:P[][],n:P,d:number):P[][]{
  const eps=1e-9,out:P[][]=[],cut:P[]=[];
  for(const face of faces){
    const kept:P[]=[];
    for(let i=0;i<face.length;i++){
      const a=face[i]!,b=face[(i+1)%face.length]!,da=dot(n,a)-d,db=dot(n,b)-d;
      if(da<=eps)kept.push(a);
      if(Math.abs(da)<=eps)cut.push(a);
      if((da<-eps&&db>eps)||(da>eps&&db<-eps)){const t=da/(da-db),q:P=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];kept.push(q);cut.push(q);}
    }
    const clean=kept.filter((q,i)=>Math.hypot(...sub(q,kept[(i+1)%kept.length]!))>1e-7);
    if(clean.length>=3)out.push(clean);
  }
  const cap:P[]=[];for(const q of cut)if(!cap.some(c=>Math.hypot(...sub(c,q))<1e-7))cap.push(q);
  if(cap.length>=3){
    const c=cap.reduce((a,q):P=>[a[0]+q[0]/cap.length,a[1]+q[1]/cap.length,a[2]+q[2]/cap.length],[0,0,0] as P);
    const u=norm(Math.abs(n[1])<.9?cross(n,[0,1,0]):cross(n,[1,0,0])),v=cross(n,u);
    cap.sort((a,b)=>Math.atan2(dot(sub(a,c),v),dot(sub(a,c),u))-Math.atan2(dot(sub(b,c),v),dot(sub(b,c),u)));
    out.push(cap);
  }
  return out;
}
function box(h:number):P[][]{
  const v=(x:number,y:number,z:number):P=>[x*h,y*h,z*h];
  return [[v(1,-1,-1),v(1,1,-1),v(1,1,1),v(1,-1,1)],[v(-1,-1,1),v(-1,1,1),v(-1,1,-1),v(-1,-1,-1)],
    [v(-1,1,1),v(1,1,1),v(1,1,-1),v(-1,1,-1)],[v(-1,-1,-1),v(1,-1,-1),v(1,-1,1),v(-1,-1,1)],
    [v(-1,-1,1),v(1,-1,1),v(1,1,1),v(-1,1,1)],[v(-1,1,-1),v(1,1,-1),v(1,-1,-1),v(-1,-1,-1)]];
}
/** Fractured block: primary fracture planes, plus small corner chips at
 * LOD0. LOD2 keeps only the first fractures (fewer, larger facets). */
function angular(b:Builder,family:RockFamily,r:()=>number,lod:RockLod){
  const count=8+Math.round(clamp(family.roughness,0,1)*6);
  const planes=Array.from({length:count},()=>({n:unitVector(r),d:.62+.3*r()}));
  const chips=Array.from({length:6},()=>({n:unitVector(r),f:.86+.08*r()}));
  const hRatio=.9+.25*r(),shade=Array.from({length:count+7},()=>.94+.06*r());
  let solid=box(1.3);
  solid=clipConvex(solid,[0,-1,0],.45);
  for(const pl of lod===2?planes.slice(0,6):planes)solid=clipConvex(solid,pl.n,pl.d);
  if(lod===0)for(const chip of chips){
    let support=-Infinity;for(const f of solid)for(const q of f)support=Math.max(support,dot(chip.n,q));
    solid=clipConvex(solid,chip.n,support*chip.f);
  }
  solid.forEach((face,i)=>{
    const scaled=face.map((q):P=>[q[0],q[1]*hRatio,q[2]]),tone=shade[i%shade.length]!;
    for(let k=1;k+1<scaled.length;k++)b.tri(scaled[0]!,scaled[k]!,scaled[k+1]!,[0,0,0],tone);
  });
}
/** Sedimentary slab stack: family.layers strata with bevelled ledges, per
 * layer shear and alternating band tone. Lower LODs merge strata. */
function layered(b:Builder,family:RockFamily,r:()=>number,lod:RockLod){
  const layers=Math.max(2,Math.min(8,Math.round(family.layers)||3)),irr=.05+.12*clamp(family.roughness,0,1),height=.5+.1*r();
  const raw=Array.from({length:layers},()=>.7+.6*r()),sum=raw.reduce((a,x)=>a+x,0);
  const bounds=[0];for(const t of raw)bounds.push(bounds[bounds.length-1]!+t/sum*height);
  const strata=Array.from({length:layers},(_,j)=>({radius:.5*(1-.32*j/layers)*(.9+.15*r()),ox:(r()-.5)*.08,oz:(r()-.5)*.08,bevel:.9+.06*r(),tone:(j&1?.84:1)*(.95+.08*r()),
    harmonics:[1,2,3].map(m=>({m,a:(r()-.5)*2*irr/m,phase:r()*Math.PI*2}))}));
  const step=lod===0?1:lod===1?2:layers,sides=lod===0?9:lod===1?6:5;
  for(let j=0;j<layers;j+=step){
    const s=strata[j]!,y0=bounds[j]!,y1=bounds[Math.min(layers,j+step)]!;
    const ring=(y:number,scale:number)=>Array.from({length:sides},(_,i):P=>{const a=i/sides*Math.PI*2;let rad=s.radius*scale;for(const h of s.harmonics)rad*=1+h.a*Math.sin(h.m*a+h.phase);return [s.ox+Math.cos(a)*rad,y,s.oz+Math.sin(a)*rad];});
    const bottom=ring(y0,1),top=ring(y1,s.bevel),axis:P=[s.ox,(y0+y1)/2,s.oz],cap:P=[s.ox,y1,s.oz];
    for(let i=0;i<sides;i++){const k=(i+1)%sides;b.tri(bottom[i]!,bottom[k]!,top[k]!,axis,s.tone);b.tri(bottom[i]!,top[k]!,top[i]!,axis,s.tone);b.tri(top[i]!,top[k]!,cap,[s.ox,y1-1,s.oz],Math.min(1,s.tone*1.06));}
  }
}

/** Deterministic mesh for one family, variant and LOD. Never reads the
 * camera, date or life; the same inputs always give byte-identical arrays. */
export function buildRockMesh(family:RockFamily,variant:number,lod:RockLod):RockMeshData{
  validate(family,variant,lod);
  const r=rng(`${ROCK_GEOMETRY_VERSION}|${family.id}|${family.form}|${variant}`),b=new Builder();
  if(family.form==='rounded')rounded(b,family,r,lod);else if(family.form==='angular')angular(b,family,r,lod);else layered(b,family,r,lod);
  return b.finish();
}
/** Upper bound of triangles for any family at a LOD (used for budgets). */
export const ROCK_MAX_TRIANGLES=Object.freeze([320,80,40] as const);
export function rockMeshBytes(mesh:RockMeshData){return mesh.positions.byteLength+mesh.normals.byteLength+mesh.colors.byteLength;}
