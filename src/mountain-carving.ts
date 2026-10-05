// M3: finite belt-local metres, halfWidthM > 0, uint32 seed. Unwired.
export const MOUNTAIN_CARVING_VERSION = 'mountain-carving-1';
export const MOUNTAIN_CARVING = Object.freeze({
  METHOD: 'A', JITTER: 0.45, WALL_SLOPE: 0.65, WALL_GAIN: 2.2,
  WALL_CURVE_M: 1500, WALL_LINEAR_SHARE: 0.35, CHANNEL_HALF_WIDTH_M: 62.5,
  FLOOR_BASE: 0.025, FLOOR_RISE: 0.12, HEAD_RISE: 0.3, FLOOR_EPSILON: 0.002,
  TRUNK_DIAGONAL_SHARE: 0.08, DETAIL_2KM: 0.5, DETAIL_1KM: 0.3, DETAIL_CAP_M: 20000,
  B_GAIN: 2.2, B_DECAY: 0.44, B_DAMP: 0.02, B_WIDTH: 0.25, B_LENGTH: 1.4,
});
export const CARVING_BANDS = Object.freeze([
  Object.freeze({level:0,wavelengthM:16000}),
  Object.freeze({level:1,wavelengthM:8000}),
  Object.freeze({level:2,wavelengthM:4000}),
  Object.freeze({level:3,wavelengthM:2000}),
  Object.freeze({level:4,wavelengthM:1000}),
]);
const C=MOUNTAIN_CARVING;
function hash(x: number,y: number,level: number,seed: number): number {
  let h=Math.imul(x,0x9e3779b1)^Math.imul(y,0x85ebca77)^Math.imul(level,0xc2b2ae3d)^seed^(y<0?0x68bc21eb:0x02e5be93);
  h=Math.imul(h^(h>>>16),0x85ebca6b);h=Math.imul(h^(h>>>13),0xc2b2ae35);
  return ((h^(h>>>16))>>>0)/4294967295;
}
function pointX(x: number,y: number,level: number,s: number,seed: number): number {
  return s*(x+0.5+C.JITTER*(2*hash(x,y,level,seed)-1));
}
function pointY(x: number,y: number,level: number,s: number,w: number,seed: number): number {
  return Math.max(-w,Math.min(w,s*(y+0.5+C.JITTER*(2*hash(x,y,level,seed^0xb5297a4d)-1))));
}
function floorAt(y: number,w: number,level: number): number {
  return Math.abs(y)>=w?0:C.FLOOR_BASE+C.FLOOR_RISE*(1-Math.abs(y)/w)+C.HEAD_RISE*level;
}
// Two 5x5 banks: x,y,z,receiverX,receiverY,receiverZ per segment.
// Every bank entry is overwritten before the next level reads it. No cross-call cache.
const scratch = new Float64Array(2*25*6);

function wallProfile(d: number): number {
  return d*(C.WALL_LINEAR_SHARE+(1-C.WALL_LINEAR_SHARE)*d/(d+C.WALL_CURVE_M));
}
function gullyProfile(phase: number): number {
  const u=phase-Math.floor(phase),v=u*(1-u);
  return 16*v*v;
}
// For wall height w(d), amp_k = weight_k * cap*w/(cap+w).
// Sum |amp'_k profile_k| <= (DETAIL_2KM+DETAIL_1KM)*w' < w'.
function wallDetail(w: number,arc: number,jitter2: number,jitter1: number): number {
  const amplitude=C.DETAIL_CAP_M*w/(C.DETAIL_CAP_M+w);
  return -amplitude*(C.DETAIL_2KM*gullyProfile((arc+jitter2)/CARVING_BANDS[3].wavelengthM)
    +C.DETAIL_1KM*gullyProfile((arc+jitter1)/CARVING_BANDS[4].wavelengthM));
}
export function carvingAM(alongM: number,acrossM: number,halfWidthM: number,envelopeM: number,belt: number,seed: number): number {
  if(belt===0||envelopeM<=0)return 0;
  let height=1e100,wall=C.WALL_SLOPE,previousX=0,previousY=0,previousBank=0;
  let activeWall=0,activeArc=0,activeX=0,activeY=0,activeLevel=0;
  for(let level=0;level<3;level++){
    const s=CARVING_BANDS[level].wavelengthM,cx=Math.floor(alongM/s),cy=Math.floor(acrossM/s);
    const bank=level===1?150:0;
    for(let oy=-2;oy<=2;oy++)for(let ox=-2;ox<=2;ox++){
      const ix=cx+ox,iy=cy+oy;
      const x=pointX(ix,iy,level,s,seed);
      const rawY=s*(iy+0.5+C.JITTER*(2*hash(ix,iy,level,seed^0xb5297a4d)-1));
      const y=Math.max(-halfWidthM,Math.min(halfWidthM,rawY));
      let ex=x,ey=y,z=floorAt(y,halfWidthM,level),ez=0;
      if(Math.abs(y)<halfWidthM){
        if(level===0){
          const direction=iy<0?-1:1,r=hash(ix,iy,17,seed);
          // 92% straight-outward cell, 4% each diagonal. Jitter supplies sinuosity.
          const dx=r<C.TRUNK_DIAGONAL_SHARE/2?-1:r>1-C.TRUNK_DIAGONAL_SHARE/2?1:0;
          ex=pointX(ix+dx,iy+direction,0,s,seed);
          ey=pointY(ix+dx,iy+direction,0,s,halfWidthM,seed);
          ez=floorAt(ey,halfWidthM,0);
        }else{
          const pcx=Math.floor(x/(2*s)-0.5),pcy=Math.floor(rawY/(2*s)-0.5);
          let best=1e100;
          for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
            const rx=pcx+dx-previousX+2,ry=pcy+dy-previousY+2;
            const k=previousBank+(ry*5+rx)*6;
            const ax=scratch[k],ay=scratch[k+1],az=scratch[k+2];
            const vx=scratch[k+3]-ax,vy=scratch[k+4]-ay,len=vx*vx+vy*vy;
            const t=len>0?Math.max(0,Math.min(1,((x-ax)*vx+(y-ay)*vy)/len)):0;
            const qx=ax+t*vx,qy=ay+t*vy,ddx=x-qx,ddy=y-qy,dist=ddx*ddx+ddy*ddy;
            if(dist<best){best=dist;ex=qx;ey=qy;ez=az+t*(scratch[k+5]-az);}
          }
          z=Math.max(z,ez+C.FLOOR_EPSILON);
        }
      }
      // Final level is never read as a parent, so does not need scratch writes.
      if(level<2){
        const k=bank+((oy+2)*5+ox+2)*6;
        scratch[k]=x;scratch[k+1]=y;scratch[k+2]=z;
        scratch[k+3]=ex;scratch[k+4]=ey;scratch[k+5]=ez;
      }
      const vx=ex-x,vy=ey-y,len=vx*vx+vy*vy;
      const t=len>0?Math.max(0,Math.min(1,((alongM-x)*vx+(acrossM-y)*vy)/len)):0;
      const dx=alongM-x-t*vx,dy=acrossM-y-t*vy;
      const d=Math.max(0,Math.sqrt(dx*dx+dy*dy)-C.CHANNEL_HALF_WIDTH_M);
      const w=wall*wallProfile(d),h=envelopeM*(z+t*(ez-z))+w;
      if(h<height){
        height=h;activeWall=w;activeArc=t*Math.sqrt(len);
        activeX=ix;activeY=iy;activeLevel=level;
      }
    }
    previousX=cx;previousY=cy;previousBank=bank;wall*=C.WALL_GAIN;
  }
  // Only the active coarse cone gets fine detail. Arc is constant on each normal ray.
  const arc=activeArc+16000*hash(activeX,activeY,activeLevel+23,seed);
  const detail=wallDetail(activeWall,arc,
    2000*hash(activeX,activeY,activeLevel+31,seed),1000*hash(activeX,activeY,activeLevel+37,seed));
  return Math.max(0,Math.min(envelopeM,height+detail))-envelopeM;
}

// Compact anisotropic gully kernels, with a carried analytic kernel gradient.
// Orientation is held fixed during each octave's derivative evaluation (erosion
// filter convention); this is not the total derivative through orientation feedback.
export function carvingBM(alongM: number,acrossM: number,halfWidthM: number,envelopeM: number,belt: number,seed: number): number {
  if(belt===0||envelopeM<=0)return 0;
  const envelopeY=(acrossM<0?1:-1)*envelopeM/Math.max(1,halfWidthM-Math.abs(acrossM));
  let gx=0,gy=envelopeY,cut=0,cutX=0,cutY=0,amp=C.B_GAIN;
  for(let level=0;level<5;level++){
    const s=CARVING_BANDS[level].wavelengthM,slope=Math.sqrt(gx*gx+gy*gy);
    const ux=slope>0?-gx/slope:0,uy=slope>0?-gy/slope:1;
    const cx=Math.floor(alongM/s-0.5),cy=Math.floor(acrossM/s-0.5),a=amp*slope/(slope+C.B_DAMP);
    let v=0,vx=0,vy=0;
    for(let j=-1;j<=2;j++)for(let i=-1;i<=2;i++){
      const ix=cx+i,iy=cy+j;
      const x=pointX(ix,iy,level,s,seed),y=s*(iy+0.5+C.JITTER*(2*hash(ix,iy,level,seed^0xb5297a4d)-1));
      const dx=(alongM-x)/s,dy=(acrossM-y)/s;
      const across=(-uy*dx+ux*dy)/C.B_WIDTH,along=(ux*dx+uy*dy)/C.B_LENGTH;
      const r2=across*across+along*along;if(r2>=1)continue;
      const t=1-r2,k=t*t*t;
      v+=k;
      const g=-6*t*t/s;
      vx+=g*(-across*uy/C.B_WIDTH+along*ux/C.B_LENGTH);
      vy+=g*(across*ux/C.B_WIDTH+along*uy/C.B_LENGTH);
    }
    cut+=a*v;cutX+=a*vx;cutY+=a*vy;
    const inv=1/(1+cut);
    gx=-envelopeM*cutX*inv*inv;gy=envelopeY*inv-envelopeM*cutY*inv*inv;
    amp*=C.B_DECAY;
  }
  return -envelopeM*(cut/(1+cut));
}
export function ridgeValleyCarvingM(alongM: number,acrossM: number,halfWidthM: number,envelopeM: number,belt: number,seed: number): number {
  return carvingAM(alongM,acrossM,halfWidthM,envelopeM,belt,seed);
}

// C changes the original no-stored-state architecture: a bounded, direct-mapped
// memo stores complete canonical blocks. Exact keys and rebuild-on-collision
// make its contents observationally irrelevant. No tile or LOD enters a key.
export const CARVING_C_VERSION = 'mountain-carving-c-1';
export const MOUNTAIN_CARVING_C = Object.freeze({
  ROWS: 480, COLS: 120, CACHE: 32, TILT: 1.3, NOISE_AMP: 400,
  SC: 0.9, FOOT: 1500, AC: 300000, M: 0.375, K: 37.552365026127084,
  HACK_C: 2.56, HEAD_GUARD_M: 125, REROUTE: 0,
  EPSILON: 0.000001, REFERENCE_M: 3000,
});
const CC=MOUNTAIN_CARVING_C;
type CBlock = {seed:number,w:number,id:number,h:Float64Array,left:Float64Array,right:Float64Array};
const cCache: (CBlock|undefined)[] = new Array(CC.CACHE);
function cHash(x:number,y:number,o:number,seed:number):number {
  let h=Math.imul(x,0x9e3779b1)^Math.imul(y,0x85ebca77)^Math.imul(o,0xc2b2ae3d)^Math.imul(seed,0x27d4eb2d);
  h=Math.imul(h^(h>>>16),0x85ebca6b);h=Math.imul(h^(h>>>13),0xc2b2ae35);
  return ((h^(h>>>16))>>>0)/4294967295;
}
function cNoise(x:number,y:number,o:number,seed:number):number {
  const i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j;
  const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  const a=cHash(i,j,o,seed),b=cHash(i+1,j,o,seed),c=cHash(i,j+1,o,seed),d=cHash(i+1,j+1,o,seed);
  return 2*((a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v)-1;
}
function cBoundary(id:number,y:number,w:number,seed:number):number {
  const t=y/(w/5),j=Math.floor(t),f=t-j,u=f*f*(3-2*f);
  const a=2*cHash(id,0,101,seed)-1;
  const b=2*cHash(id,j,102,seed)-1,c=2*cHash(id,j+1,102,seed)-1;
  return w/2*(id+0.10*a+0.08*(b+(c-b)*u));
}
// Actual mesh boundary is linear between canonical curve samples, including
// during ownership lookup. Equality belongs to the block on the right.
function cBoundaryAt(id:number,row:number,t:number,w:number,seed:number):number {
  const a=cBoundary(id,-w+2*w*row/CC.ROWS,w,seed);
  return a+(cBoundary(id,-w+2*w*(row+1)/CC.ROWS,w,seed)-a)*t;
}
function cAreaExponent(a:number):number {return Math.sqrt(Math.sqrt(Math.sqrt(a*a*a)));}
function cEnvelope(y:number,w:number):number {return CC.REFERENCE_M*Math.max(0,1-Math.abs(y)/w);}
function cSlope(e:number):number {return CC.SC*Math.min(1,e/CC.FOOT);}
function cDiagonal(id:number,row:number,col:number,seed:number):boolean {
  return cHash(id*CC.COLS+col,row,103,seed)<0.5;
}
// Indexed binary heap: one entry per vertex, deterministic value/index ties.
// The caller only decreases keys of entries already present.
class CHeap {
  ids:Int32Array; pos:Int32Array; key:Float64Array; size=0;
  constructor(n:number,key:Float64Array){this.ids=new Int32Array(n);this.pos=new Int32Array(n).fill(-1);this.key=key;}
  less(a:number,b:number):boolean {return this.key[a]<this.key[b]||(this.key[a]===this.key[b]&&a<b);}
  push(c:number):void {
    let k=this.pos[c];if(k<0)k=this.size++;
    while(k>0){const p=(k-1)>>1,a=this.ids[p];if(!this.less(c,a))break;this.ids[k]=a;this.pos[a]=k;k=p;}
    this.ids[k]=c;this.pos[c]=k;
  }
  pop():number {
    const c=this.ids[0],a=this.ids[--this.size];this.pos[c]=-1;
    if(this.size){let k=0;for(;;){let b=2*k+1;if(b>=this.size)break;
      if(b+1<this.size&&this.less(this.ids[b+1],this.ids[b]))b++;
      if(!this.less(this.ids[b],a))break;
      this.ids[k]=this.ids[b];this.pos[this.ids[k]]=k;k=b;
    }this.ids[k]=a;this.pos[a]=k;}return c;
  }
}
function cMesh(seed:number,w:number,id:number) {
  const stride=CC.COLS+1,n=(CC.ROWS+1)*stride,dy=2*w/CC.ROWS;
  const x=new Float64Array(n),e=new Float64Array(n),fixed=new Uint8Array(n);
  const left=new Float64Array(CC.ROWS+1),right=new Float64Array(CC.ROWS+1);
  const degree=new Uint8Array(n),nb=new Int32Array(n*8).fill(-1),length=new Float64Array(n*8),area=new Float64Array(n);
  for(let j=0;j<=CC.ROWS;j++){
    const y=-w+2*w*j/CC.ROWS;left[j]=cBoundary(id,y,w,seed);right[j]=cBoundary(id+1,y,w,seed);
    for(let i=0;i<=CC.COLS;i++){const k=j*stride+i;
      x[k]=i===CC.COLS?right[j]:left[j]+(right[j]-left[j])*i/CC.COLS;
      e[k]=cEnvelope(y,w);fixed[k]=i===0||i===CC.COLS||j===0||j===CC.ROWS?1:0;
    }
  }
  const edge=(a:number,b:number)=>{
    const dx=x[b]-x[a],yy=(Math.floor(b/stride)-Math.floor(a/stride))*dy,len=Math.sqrt(dx*dx+yy*yy);
    let k=a*8+degree[a]++;nb[k]=b;length[k]=len;k=b*8+degree[b]++;nb[k]=a;length[k]=len;
  };
  const triangle=(a:number,b:number,c:number)=>{
    const abY=(Math.floor(b/stride)-Math.floor(a/stride))*dy,acY=(Math.floor(c/stride)-Math.floor(a/stride))*dy;
    const share=Math.abs((x[b]-x[a])*acY-(x[c]-x[a])*abY)/6;
    area[a]+=share;area[b]+=share;area[c]+=share;
  };
  for(let j=0;j<=CC.ROWS;j++)for(let i=0;i<=CC.COLS;i++){
    const a=j*stride+i;if(i<CC.COLS)edge(a,a+1);if(j<CC.ROWS)edge(a,a+stride);
    if(i<CC.COLS&&j<CC.ROWS){const b=a+1,c=a+stride,d=c+1;
      if(cDiagonal(id,j,i,seed)){edge(a,d);triangle(a,b,d);triangle(a,d,c);}
      else{edge(b,c);triangle(a,b,c);triangle(b,d,c);}
    }
  }
  return {stride,n,dy,x,e,fixed,left,right,degree,nb,length,area};
}
// Prescribed shared trunk, not a globally self-consistent discharge solution.
// HACK_C gives 175.07 km2 at l=30 km. Midpoint integration goes margin to
// head, using actual polyline segment lengths and guarded Hack head distance.
function cTrunk(boundary:number,w:number,seed:number):Float64Array {
  const h=new Float64Array(CC.ROWS+1),dy=2*w/CC.ROWS;
  for(const sign of [-1,1])for(let k=1;k<=CC.ROWS/2;k++){
    const row=sign<0?k:CC.ROWS-k,prev=row+sign;
    const y=-w+2*w*row/CC.ROWS,yp=-w+2*w*prev/CC.ROWS;
    const mid=(y+yp)/2,l=Math.max(CC.HEAD_GUARD_M,Math.abs(mid));
    const area=CC.HACK_C*l*Math.sqrt(l)*Math.sqrt(Math.sqrt(l));
    const dx=cBoundary(boundary,y,w,seed)-cBoundary(boundary,yp,w,seed);
    const v=h[prev]+Math.sqrt(dx*dx+dy*dy)*Math.min(cSlope(cEnvelope(mid,w)),CC.K/cAreaExponent(area));
    // Both flanks reach the head; the lower head retains a descending edge.
    h[row]=row===CC.ROWS/2&&sign===1?Math.min(h[row],v,cEnvelope(y,w)):Math.min(v,cEnvelope(y,w));
  }
  return h;
}
function cBuild(seed:number,w:number,id:number) {
  const mesh=cMesh(seed,w,id),{n,stride,dy,x,e,fixed,left,right,degree,nb,length,area}=mesh;
  const filled=new Float64Array(n),seen=new Uint8Array(n),order=new Int32Array(n);
  const receiver=new Int32Array(n).fill(-1),distance=new Float64Array(n),acc=area.slice();
  const heap=new CHeap(n,filled);
  for(let k=0;k<n;k++){
    const y=-w+Math.floor(k/stride)*dy;let noise=0,amp=1,norm=0,lam=8000;
    for(let o=1;o<=6;o++){noise+=amp*cNoise(x[k]/lam,y/lam,o,seed);norm+=amp;amp*=0.6;lam/=2;}
    filled[k]=e[k]===0?0:CC.TILT*e[k]+CC.NOISE_AMP*noise/norm;
    if(fixed[k]){seen[k]=1;heap.push(k);}
  }
  let count=0;
  while(heap.size){const c=heap.pop();order[count++]=c;
    for(let a=c*8;a<c*8+degree[c];a++){const k=nb[a];if(seen[k])continue;
      seen[k]=1;filled[k]=Math.max(filled[k],filled[c]+CC.EPSILON);heap.push(k);
    }
  }
  for(let k=0;k<n;k++)if(!fixed[k]){
    let best=0;for(let a=k*8;a<k*8+degree[k];a++){
      const r=nb[a],s=(filled[k]-filled[r])/length[a];
      if(s>best||(s===best&&s>0&&r<receiver[k])){best=s;receiver[k]=r;distance[k]=length[a];}
    }
  }
  for(let j=n-1;j>=0;j--){const c=order[j],r=receiver[c];if(r>=0)acc[r]+=acc[c];}
  const h=new Float64Array(n),lh=cTrunk(id,w,seed),rh=cTrunk(id+1,w,seed);
  for(let j=0;j<n;j++){const k=order[j],row=Math.floor(k/stride),col=k%stride;
    h[k]=fixed[k]?(col===0?lh[row]:col===CC.COLS?rh[row]:0):
      h[receiver[k]]+distance[k]*Math.min(cSlope(e[k]),CC.K/cAreaExponent(acc[k]));
  }
  const best=new Float64Array(n).fill(Infinity),dh=new CHeap(n,best);
  for(let k=0;k<n;k++)if(fixed[k]||acc[k]>=CC.AC){best[k]=h[k];dh.push(k);}
  while(dh.size){const c=dh.pop();for(let a=c*8;a<c*8+degree[c];a++){
    const k=nb[a];if(fixed[k])continue;const v=best[c]+cSlope(e[k])*length[a];
    if(v<best[k]){best[k]=v;dh.push(k);}
  }}
  const uncapped=new Float64Array(n);
  for(let k=0;k<n;k++){uncapped[k]=Math.min(h[k],best[k]);h[k]=Math.min(uncapped[k],e[k]);}
  // Each positive interior vertex has a lower edge before clipping: its
  // receiver or its Dijkstra predecessor. The ramp also has a lower edge.
  // Taking their minimum preserves this property. Linear triangles introduce
  // no strict interior minima. This certifies construction-mesh drainage on
  // the reference ramp, NOT D8 resampling or arbitrary supplied envelopes.
  // Rich build data is private and temporary; only compact block data is cached.
  return {seed,w,id,h,left,right,mesh,receiver,acc,uncapped};
}
function cGet(seed:number,w:number,id:number):CBlock {
  const slot=(Math.imul(id,0x9e3779b1)^seed)>>>0,at=slot%CC.CACHE,b=cCache[at];
  if(b&&b.seed===seed&&b.w===w&&b.id===id)return b;
  const built=cBuild(seed,w,id),block={seed,w,id,h:built.h,left:built.left,right:built.right};
  cCache[at]=block;return block;
}
function cInterpolate(b:CBlock,x:number,row:number,t:number):number {
  const l=b.left[row]+(b.left[row+1]-b.left[row])*t,r=b.right[row]+(b.right[row+1]-b.right[row])*t;
  const col=Math.max(0,Math.min(CC.COLS-1,Math.floor((x-l)/(r-l)*CC.COLS)));
  const x0=b.left[row]+(b.right[row]-b.left[row])*col/CC.COLS;
  const x1=b.left[row]+(b.right[row]-b.left[row])*(col+1)/CC.COLS;
  const x2=b.left[row+1]+(b.right[row+1]-b.left[row+1])*col/CC.COLS;
  const x3=b.left[row+1]+(b.right[row+1]-b.left[row+1])*(col+1)/CC.COLS;
  const a=row*(CC.COLS+1)+col,c=a+CC.COLS+1,h=b.h;
  if(cDiagonal(b.id,row,col,b.seed)){
    const diagonal=x0+(x3-x0)*t;
    if(x>=diagonal){const u=(x-diagonal)/(x1-x0);return (1-t-u)*h[a]+u*h[a+1]+t*h[c+1];}
    const u=(diagonal-x)/(x3-x2);return (1-t)*h[a]+u*h[c]+(t-u)*h[c+1];
  }
  const diagonal=x1+(x2-x1)*t;
  if(x<=diagonal){const u=(diagonal-x)/(x1-x0);return u*h[a]+(1-t-u)*h[a+1]+t*h[c];}
  const u=(x-diagonal)/(x3-x2);return (1-t)*h[a+1]+(t-u)*h[c]+u*h[c+1];
}
export function carvingCM(alongM:number,acrossM:number,halfWidthM:number,envelopeM:number,belt:number,seed:number):number {
  if(belt===0||envelopeM<=0||Math.abs(acrossM)>=halfWidthM)return 0;
  const v=(acrossM+halfWidthM)/(2*halfWidthM)*CC.ROWS,row=Math.min(CC.ROWS-1,Math.floor(v)),t=v-row;
  let id=Math.floor(alongM/(halfWidthM/2));
  if(alongM<cBoundaryAt(id,row,t,halfWidthM,seed))id--;
  else if(alongM>=cBoundaryAt(id+1,row,t,halfWidthM,seed))id++;
  const href=cInterpolate(cGet(seed,halfWidthM,id),alongM,row,t);
  const retained=Math.max(0,Math.min(1,href/cEnvelope(acrossM,halfWidthM)));
  return retained===1?0:-envelopeM*(1-retained);
}
