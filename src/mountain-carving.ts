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
