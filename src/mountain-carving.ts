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
function hash(x:N,y:N,level:N,seed:N):N {
  let h=Math.imul(x,0x9e3779b1)^Math.imul(y,0x85ebca77)^Math.imul(level,0xc2b2ae3d)^seed^(y<0?0x68bc21eb:0x02e5be93);
  h=Math.imul(h^(h>>>16),0x85ebca6b);h=Math.imul(h^(h>>>13),0xc2b2ae35);
  return ((h^(h>>>16))>>>0)/4294967295;
}
function pointX(x:N,y:N,level:N,s:N,seed:N):N {
  return s*(x+0.5+C.JITTER*(2*hash(x,y,level,seed)-1));
}
function pointY(x:N,y:N,level:N,s:N,w:N,seed:N):N {
  return Math.max(-w,Math.min(w,s*(y+0.5+C.JITTER*(2*hash(x,y,level,seed^0xb5297a4d)-1))));
}
function floorAt(y:N,w:N,level:N):N {
  return Math.abs(y)>=w?0:C.FLOOR_BASE+C.FLOOR_RISE*(1-Math.abs(y)/w)+C.HEAD_RISE*level;
}
const scratch = new Float64Array(2*25*6);

function wallProfile(d:N):N {
  return d*(C.WALL_LINEAR_SHARE+(1-C.WALL_LINEAR_SHARE)*d/(d+C.WALL_CURVE_M));
}
function gullyProfile(phase:N):N {
  const u=phase-Math.floor(phase),v=u*(1-u);
  return 16*v*v;
}
function wallDetail(w:N,arc:N,jitter2:N,jitter1:N):N {
  const amplitude=C.DETAIL_CAP_M*w/(C.DETAIL_CAP_M+w);
  return -amplitude*(C.DETAIL_2KM*gullyProfile((arc+jitter2)/CARVING_BANDS[3].wavelengthM)
    +C.DETAIL_1KM*gullyProfile((arc+jitter1)/CARVING_BANDS[4].wavelengthM));
}
export function carvingAM(alongM:N,acrossM:N,halfWidthM:N,envelopeM:N,belt:N,seed:N):N {
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
  const arc=activeArc+16000*hash(activeX,activeY,activeLevel+23,seed);
  const detail=wallDetail(activeWall,arc,
    2000*hash(activeX,activeY,activeLevel+31,seed),1000*hash(activeX,activeY,activeLevel+37,seed));
  return Math.max(0,Math.min(envelopeM,height+detail))-envelopeM;
}

export function carvingBM(alongM:N,acrossM:N,halfWidthM:N,envelopeM:N,belt:N,seed:N):N {
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
export function ridgeValleyCarvingM(alongM:N,acrossM:N,halfWidthM:N,envelopeM:N,belt:N,seed:N):N {
  return carvingAM(alongM,acrossM,halfWidthM,envelopeM,belt,seed);
}

export const CARVING_C_VERSION = 'mountain-carving-c-1';
export const MOUNTAIN_CARVING_C = Object.freeze({
  ROWS: 480, COLS: 120, CACHE: 32, TILT: 1.3, NOISE_AMP: 400,
  SC: 0.9, FOOT: 1500, AC: 300000, M: 0.375, K: 37.552365026127084,
  HACK_C: 2.56, HEAD_GUARD_M: 125, REROUTE: 0,
  EPSILON: 0.000001, REFERENCE_M: 3000,
});
const CC=MOUNTAIN_CARVING_C;
type CBlock = {seed:N,w:N,id:N,h:Float64Array,left:Float64Array,right:Float64Array};
const cCache: (CBlock|undefined)[] = new Array(CC.CACHE);
function cHash(x:N,y:N,o:N,seed:N):N {
  let h=Math.imul(x,0x9e3779b1)^Math.imul(y,0x85ebca77)^Math.imul(o,0xc2b2ae3d)^Math.imul(seed,0x27d4eb2d);
  h=Math.imul(h^(h>>>16),0x85ebca6b);h=Math.imul(h^(h>>>13),0xc2b2ae35);
  return ((h^(h>>>16))>>>0)/4294967295;
}
function cNoise(x:N,y:N,o:N,seed:N):N {
  const i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j;
  const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  const a=cHash(i,j,o,seed),b=cHash(i+1,j,o,seed),c=cHash(i,j+1,o,seed),d=cHash(i+1,j+1,o,seed);
  return 2*((a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v)-1;
}
function cBoundary(id:N,y:N,w:N,seed:N):N {
  const t=y/(w/5),j=Math.floor(t),f=t-j,u=f*f*(3-2*f);
  const a=2*cHash(id,0,101,seed)-1;
  const b=2*cHash(id,j,102,seed)-1,c=2*cHash(id,j+1,102,seed)-1;
  return w/2*(id+0.10*a+0.08*(b+(c-b)*u));
}
function cBoundaryAt(id:N,row:N,t:N,w:N,seed:N):N {
  const a=cBoundary(id,-w+2*w*row/CC.ROWS,w,seed);
  return a+(cBoundary(id,-w+2*w*(row+1)/CC.ROWS,w,seed)-a)*t;
}
function cAreaExponent(a:N):N {return Math.sqrt(Math.sqrt(Math.sqrt(a*a*a)));}
function cEnvelope(y:N,w:N):N {return CC.REFERENCE_M*Math.max(0,1-Math.abs(y)/w);}
function cSlope(e:N):N {return CC.SC*Math.min(1,e/CC.FOOT);}
function cDiagonal(id:N,row:N,col:N,seed:N):boolean {
  return cHash(id*CC.COLS+col,row,103,seed)<0.5;
}
class CHeap {
  ids:Int32Array; pos:Int32Array; key:Float64Array; size=0;
  constructor(n:N,key:Float64Array){this.ids=new Int32Array(n);this.pos=new Int32Array(n).fill(-1);this.key=key;}
  less(a:N,b:N):boolean {return this.key[a]<this.key[b]||(this.key[a]===this.key[b]&&a<b);}
  push(c:N):void {
    let k=this.pos[c];if(k<0)k=this.size++;
    while(k>0){const p=(k-1)>>1,a=this.ids[p];if(!this.less(c,a))break;this.ids[k]=a;this.pos[a]=k;k=p;}
    this.ids[k]=c;this.pos[c]=k;
  }
  pop():N {
    const c=this.ids[0],a=this.ids[--this.size];this.pos[c]=-1;
    if(this.size){let k=0;for(;;){let b=2*k+1;if(b>=this.size)break;
      if(b+1<this.size&&this.less(this.ids[b+1],this.ids[b]))b++;
      if(!this.less(this.ids[b],a))break;
      this.ids[k]=this.ids[b];this.pos[this.ids[k]]=k;k=b;
    }this.ids[k]=a;this.pos[a]=k;}return c;
  }
}
function cMesh(seed:N,w:N,id:N) {
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
  const edge=(a:N,b:N)=>{
    const dx=x[b]-x[a],yy=(Math.floor(b/stride)-Math.floor(a/stride))*dy,len=Math.sqrt(dx*dx+yy*yy);
    let k=a*8+degree[a]++;nb[k]=b;length[k]=len;k=b*8+degree[b]++;nb[k]=a;length[k]=len;
  };
  const triangle=(a:N,b:N,c:N)=>{
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
function cTrunk(boundary:N,w:N,seed:N,rows:N=CC.ROWS):Float64Array {
  const h=new Float64Array(rows+1),dy=2*w/rows;
  for(const sign of [-1,1])for(let k=1;k<=rows/2;k++){
    const row=sign<0?k:rows-k,prev=row+sign;
    const y=-w+2*w*row/rows,yp=-w+2*w*prev/rows;
    const mid=(y+yp)/2,l=Math.max(CC.HEAD_GUARD_M,Math.abs(mid));
    const area=CC.HACK_C*l*Math.sqrt(l)*Math.sqrt(Math.sqrt(l));
    const dx=cBoundary(boundary,y,w,seed)-cBoundary(boundary,yp,w,seed);
    const v=h[prev]+Math.sqrt(dx*dx+dy*dy)*Math.min(cSlope(cEnvelope(mid,w)),CC.K/cAreaExponent(area));
    h[row]=row===rows/2&&sign===1?Math.min(h[row],v,cEnvelope(y,w)):Math.min(v,cEnvelope(y,w));
  }
  return h;
}
function cBuild(seed:N,w:N,id:N) {
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
  return {seed,w,id,h,left,right,mesh,receiver,acc,uncapped};
}
function cGet(seed:N,w:N,id:N):CBlock {
  const slot=(Math.imul(id,0x9e3779b1)^seed)>>>0,at=slot%CC.CACHE,b=cCache[at];
  if(b&&b.seed===seed&&b.w===w&&b.id===id)return b;
  const built=cBuild(seed,w,id),block={seed,w,id,h:built.h,left:built.left,right:built.right};
  cCache[at]=block;return block;
}
function cInterpolate(b:CBlock,x:N,row:N,t:N,CC:{ROWS:N,COLS:N}=MOUNTAIN_CARVING_C,chooseDiagonal=cDiagonal):N {
  const l=b.left[row]+(b.left[row+1]-b.left[row])*t,r=b.right[row]+(b.right[row+1]-b.right[row])*t;
  const col=Math.max(0,Math.min(CC.COLS-1,Math.floor((x-l)/(r-l)*CC.COLS)));
  const x0=b.left[row]+(b.right[row]-b.left[row])*col/CC.COLS;
  const x1=b.left[row]+(b.right[row]-b.left[row])*(col+1)/CC.COLS;
  const x2=b.left[row+1]+(b.right[row+1]-b.left[row+1])*col/CC.COLS;
  const x3=b.left[row+1]+(b.right[row+1]-b.left[row+1])*(col+1)/CC.COLS;
  const a=row*(CC.COLS+1)+col,c=a+CC.COLS+1,h=b.h;
  if(chooseDiagonal(b.id,row,col,b.seed)){
    const diagonal=x0+(x3-x0)*t;
    if(x>=diagonal){const u=(x-diagonal)/(x1-x0);return (1-t-u)*h[a]+u*h[a+1]+t*h[c+1];}
    const u=(diagonal-x)/(x3-x2);return (1-t)*h[a]+u*h[c]+(t-u)*h[c+1];
  }
  const diagonal=x1+(x2-x1)*t;
  if(x<=diagonal){const u=(diagonal-x)/(x1-x0);return u*h[a]+(1-t-u)*h[a+1]+t*h[c];}
  const u=(x-diagonal)/(x3-x2);return (1-t)*h[a+1]+(t-u)*h[c]+u*h[c+1];
}
export function carvingCM(alongM:N,acrossM:N,halfWidthM:N,envelopeM:N,belt:N,seed:N):N {
  if(belt===0||envelopeM<=0||Math.abs(acrossM)>=halfWidthM)return 0;
  const v=(acrossM+halfWidthM)/(2*halfWidthM)*CC.ROWS,row=Math.min(CC.ROWS-1,Math.floor(v)),t=v-row;
  let id=Math.floor(alongM/(halfWidthM/2));
  if(alongM<cBoundaryAt(id,row,t,halfWidthM,seed))id--;
  else if(alongM>=cBoundaryAt(id+1,row,t,halfWidthM,seed))id++;
  const href=cInterpolate(cGet(seed,halfWidthM,id),alongM,row,t);
  const retained=Math.max(0,Math.min(1,href/cEnvelope(acrossM,halfWidthM)));
  return retained===1?0:-envelopeM*(1-retained);
}

type N=number;
export const CARVING_E_VERSION='mountain-carving-e-1';
export const MOUNTAIN_CARVING_E=Object.freeze({ROWS:240,COLS:60,CACHE:32,RAW_CACHE:64,TILT:1.3,NOISE_AMP:400,SC:1.1,FOOT:1500,AC:300000,M:0.375,K:37.552365026127084,BOUNDARY:2,WANDER:2500,SPUR:800,EPSILON:0.000001,REFERENCE_M:3000});
const EE:EO & {CACHE:N,RAW_CACHE:N,BOUNDARY:N}=MOUNTAIN_CARVING_E;
type EO={ROWS:N,COLS:N,TILT:N,NOISE_AMP:N,SC:N,FOOT:N,AC:N,K:N,EPSILON:N,BOUNDARY?:N,WANDER?:N,SPUR?:N};
const en=481*121,ex=new Float64Array(en),ee=new Float64Array(en),ea=new Float64Array(en),ep=new Float64Array(en),eb=new Float64Array(en),ed=new Float64Array(en),er=new Int32Array(en),eo=new Int32Array(en),es=new Uint8Array(en),eg=new Uint8Array(en),ei=new Int32Array(8),el=new Float64Array(8),eh=new CHeap(en,ep);
const ek=new Float64Array(en);let ez=0,eu=false;
function ePush(c:N,v:N):void {
let k=eu?eh.pos[c]:-1;if(k<0)k=ez++;
while(k>0){const p=(k-1)>>2,a=eh.ids[p],b=ek[p];if(v>b||(v===b&&c>=a))break;eh.ids[k]=a;ek[k]=b;if(eu)eh.pos[a]=k;k=p;}eh.ids[k]=c;ek[k]=v;if(eu)eh.pos[c]=k;
}
function ePop():N {
const c=eh.ids[0],a=eh.ids[--ez],v=ek[ez];if(eu)eh.pos[c]=-1;
if(ez){let k=0;for(;;){let b=4*k+1;if(b>=ez)break;for(let j=b+1;j<ez&&j<=4*k+4;j++)if(ek[j]<ek[b]||(ek[j]===ek[b]&&eh.ids[j]<eh.ids[b]))b=j;
if(ek[b]>v||(ek[b]===v&&eh.ids[b]>=a))break;eh.ids[k]=eh.ids[b];ek[k]=ek[b];if(eu)eh.pos[eh.ids[k]]=k;k=b;}eh.ids[k]=a;ek[k]=v;if(eu)eh.pos[a]=k;}return c;
}
const eCache:(CBlock|undefined)[]=new Array(EE.CACHE),eRawCache:(CBlock|undefined)[]=new Array(EE.RAW_CACHE);
function eDiagonal(id:N,j:N,i:N,seed:N):boolean{return cHash(id*EE.COLS+i,j,103,seed)<0.5;}
function eBoundary(id:N,y:N,w:N,seed:N):N {
const t=y/(w/5),j=Math.floor(t),f=t-j,u=f*f*(3-2*f),a=2*cHash(id,0,101,seed)-1,b=2*cHash(id,j,102,seed)-1,c=2*cHash(id,j+1,102,seed)-1;
return w/2*(id+0.30*a+0.15*(b+(c-b)*u));
}
function eBoundaryAt(id:N,row:N,t:N,w:N,seed:N):N {
const f=EE.BOUNDARY===0?cBoundary:eBoundary,a=f(id,-w+2*w*row/EE.ROWS,w,seed);return a+(f(id,-w+2*w*(row+1)/EE.ROWS,w,seed)-a)*t;
}
function eEdges(k:N,stride:N,rows:N,cols:N,dy:N):N {
const i=k%stride,up=k>=stride,down=k<rows*stride;let n=0;
if(i)ei[n++]=k-1;if(i<cols)ei[n++]=k+1;if(up)ei[n++]=k-stride;if(down)ei[n++]=k+stride;
if(i&&up&&eg[k-stride-1])ei[n++]=k-stride-1;
if(i<cols&&up&&!eg[k-stride])ei[n++]=k-stride+1;
if(i&&down&&!eg[k-1])ei[n++]=k+stride-1;
if(i<cols&&down&&eg[k])ei[n++]=k+stride+1;
for(let a=0;a<n;a++){const r=ei[a],dx=ex[r]-ex[k],y=r===k-1||r===k+1?0:dy;el[a]=Math.sqrt(dx*dx+y*y);}return n;
}
function eTriangle(a:N,b:N,c:N,stride:N,dy:N):void {
const abY=(Math.floor(b/stride)-Math.floor(a/stride))*dy,acY=(Math.floor(c/stride)-Math.floor(a/stride))*dy,v=Math.abs((ex[b]-ex[a])*acY-(ex[c]-ex[a])*abY)/6;ea[a]+=v;ea[b]+=v;ea[c]+=v;
}
function eBuild(seed:N,w:N,id:N,o:EO=EE) {
const rows=o.ROWS,cols=o.COLS,stride=cols+1,n=(rows+1)*stride,dy=2*w/rows,wall=(o.BOUNDARY??0)>0;
const left=new Float64Array(rows+1),right=new Float64Array(rows+1),h=new Float64Array(n),boundary=wall?eBoundary:cBoundary;
ea.fill(0,0,n);es.fill(0,0,n);er.fill(-1,0,n);eb.fill(0,0,n);ez=0;eu=false;eh.pos.fill(-1);
for(let j=0;j<=rows;j++){
const y=-w+2*w*j/rows;left[j]=boundary(id,y,w,seed);right[j]=boundary(id+1,y,w,seed);
for(let i=0;i<=cols;i++){const k=j*stride+i;ex[k]=i===cols?right[j]:left[j]+(right[j]-left[j])*i/cols;ee[k]=3000*Math.max(0,1-Math.abs(y)/w);eg[k]=cHash(id*cols+i,j,103,seed)<0.5?1:0;
}}
for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*stride+i,b=a+1,c=a+stride,d=c+1;if(eg[a]){eTriangle(a,b,d,stride,dy);eTriangle(a,d,c,stride,dy);}else{eTriangle(a,b,c,stride,dy);eTriangle(b,d,c,stride,dy);}}
for(let j=0;j<=rows;j++){const y=-w+j*dy;let amp=1,lam=8000;
for(let o=1;o<=6;o++){const yy=y/lam,jj=Math.floor(yy),fy=yy-jj,v=fy*fy*(3-2*fy);let last=Infinity,a=0,b=0,c=0,d=0;
for(let i=0;i<=cols;i++){const k=j*stride+i,xx=ex[k]/lam,ii=Math.floor(xx),fx=xx-ii,u=fx*fx*(3-2*fx);if(ii!==last){a=cHash(ii,jj,o,seed);b=cHash(ii+1,jj,o,seed);c=cHash(ii,jj+1,o,seed);d=cHash(ii+1,jj+1,o,seed);last=ii;}eb[k]+=amp*(2*((a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v)-1);}amp*=0.6;lam/=2;}}
let norm=0,amp=1;for(let a=1;a<=6;a++){norm+=amp;amp*=0.6;}
for(let k=0;k<n;k++){
const j=Math.floor(k/stride),i=k%stride,y=-w+j*dy,noise=eb[k];
const wander=o.WANDER?o.WANDER*cNoise(ex[k]/24000,0,111,seed):0;
ep[k]=ee[k]===0?0:o.TILT*(wander?3000*Math.max(0,1-Math.abs(y-wander)/w):ee[k])+o.NOISE_AMP*noise/norm;
if(o.BOUNDARY===2){const d=Math.min(i,cols-i)/cols;ep[k]+=(o.SPUR??0)*Math.max(0,1-d*5)*ee[k]/3000;}
if(j===0||j===rows||i===0||i===cols){es[k]=1;if(!wall||i>0&&i<cols)ePush(k,ep[k]);}
}
let count=0;
while(ez){const c=ePop();eo[count++]=c;const len=eEdges(c,stride,rows,cols,dy);for(let a=0;a<len;a++){const k=ei[a];if(es[k])continue;es[k]=1;ep[k]=Math.max(ep[k],ep[c]+o.EPSILON);ePush(k,ep[k]);}}
for(let k=0;k<n;k++){const j=Math.floor(k/stride),i=k%stride;if(!j||j===rows||!i||i===cols)continue;
let best=0;const len=eEdges(k,stride,rows,cols,dy);for(let a=0;a<len;a++){const r=ei[a];if(wall&&(r%stride===0||r%stride===cols))continue;const v=(ep[k]-ep[r])/el[a];if(v>best||(v===best&&v>0&&r<er[k])){best=v;er[k]=r;ed[k]=el[a];}}}
for(let j=count-1;j>=0;j--){const k=eo[j],r=er[k];if(r>=0)ea[r]+=ea[k];}
const lh=wall?left:cTrunk(id,w,seed,rows),rh=wall?right:cTrunk(id+1,w,seed,rows);
h.fill(Infinity);
for(let j=0;j<count;j++){const k=eo[j],row=Math.floor(k/stride),col=k%stride;h[k]=er[k]<0?(wall?0:col===0?lh[row]:col===cols?rh[row]:0):h[er[k]]+ed[k]*Math.min(o.SC*Math.min(1,ee[k]/o.FOOT),o.K/cAreaExponent(ea[k]));}
eu=true;eb.fill(Infinity,0,n);
for(let k=0;k<n;k++){const i=k%stride,j=Math.floor(k/stride),fixed=!i||i===cols||!j||j===rows;if((!wall||i>0&&i<cols)&&(fixed||ea[k]>=o.AC)){eb[k]=h[k];ePush(k,eb[k]);}}
while(ez){const c=ePop(),len=eEdges(c,stride,rows,cols,dy);for(let a=0;a<len;a++){const k=ei[a],i=k%stride,j=Math.floor(k/stride);if(!i||i===cols||!j||j===rows)continue;const v=eb[c]+o.SC*Math.min(1,ee[k]/o.FOOT)*el[a];if(v<eb[k]){eb[k]=v;ePush(k,v);}}}
let capped=0;for(let k=0;k<n;k++){if(ee[k]>0&&Math.min(h[k],eb[k])>=ee[k])capped++;h[k]=Math.min(h[k],eb[k],ee[k]);}
return {seed,w,id,h,left,right,capped};
}
function eRaw(seed:N,w:N,id:N):CBlock {
const at=((Math.imul(id,0x9e3779b1)^seed)>>>0)%EE.RAW_CACHE,b=eRawCache[at];if(b&&b.seed===seed&&b.w===w&&b.id===id)return b;const v=eBuild(seed,w,id);eRawCache[at]=v;return v;
}
function eEdge(a:CBlock,b:CBlock,row:N):N {
const y=-a.w+2*a.w*row/EE.ROWS,x=a.right[row];let best=3000*Math.max(0,1-Math.abs(y)/a.w);
for(let side=0;side<2;side++){const v=side===0?a:b,col=side===0?EE.COLS-1:1;for(let j=Math.max(0,row-1);j<=Math.min(EE.ROWS,row+1);j++){
if(j!==row&&((side===0?j<row:j>row)!==eDiagonal(v.id,j<row?j:row,side===0?EE.COLS-1:0,v.seed)))continue;
const dx=v.left[j]+(v.right[j]-v.left[j])*col/EE.COLS-x,dy=(j-row)*2*a.w/EE.ROWS;
best=Math.min(best,v.h[j*(EE.COLS+1)+col]+EE.SC*Math.min(1,3000*Math.max(0,1-Math.abs(y)/a.w)/EE.FOOT)*Math.sqrt(dx*dx+dy*dy));}}return best;
}
function eGet(seed:N,w:N,id:N):CBlock {
const at=((Math.imul(id,0x9e3779b1)^seed)>>>0)%EE.CACHE,b=eCache[at];if(b&&b.seed===seed&&b.w===w&&b.id===id)return b;
const a=eRaw(seed,w,id);if(EE.BOUNDARY===0){eCache[at]=a;return a;}
const l=eRaw(seed,w,id-1),r=eRaw(seed,w,id+1),out={seed,w,id,h:a.h.slice(),left:a.left,right:a.right};for(let j=0;j<=EE.ROWS;j++){out.h[j*(EE.COLS+1)]=eEdge(l,a,j);out.h[j*(EE.COLS+1)+EE.COLS]=eEdge(a,r,j);}eCache[at]=out;return out;
}
export function carvingEM(x:N,y:N,w:N,envelope:N,belt:N,seed:N):N {
if(belt===0||envelope<=0||Math.abs(y)>=w)return 0;const v=(y+w)/(2*w)*EE.ROWS,row=Math.min(EE.ROWS-1,Math.floor(v)),t=v-row;let id=Math.floor(x/(w/2));const b=eCache[((Math.imul(id,0x9e3779b1)^seed)>>>0)%EE.CACHE],hit=b&&b.seed===seed&&b.w===w&&b.id===id;const l=hit?b.left[row]+(b.left[row+1]-b.left[row])*t:eBoundaryAt(id,row,t,w,seed);if(x<l)id--;else if(x>=(hit?b.right[row]+(b.right[row+1]-b.right[row])*t:eBoundaryAt(id+1,row,t,w,seed)))id++;
const h=cInterpolate(eGet(seed,w,id),x,row,t,EE,eDiagonal),retained=Math.max(0,Math.min(1,h/(3000*Math.max(0,1-Math.abs(y)/w))));return retained===1?0:-envelope*(1-retained);
}
