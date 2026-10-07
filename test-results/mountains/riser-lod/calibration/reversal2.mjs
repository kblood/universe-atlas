// Fall-line climb check on the M5 fixture (carved + rock, no background): 1 m steps up the carved gradient from
// quasi-random starts; a step counts only where the carved slope (1 m gradient) >= SLOPE_ZERO_TAN (rock active).
import {R} from './proto.mjs';
const F=await import('file:///C:/LLM/IWSDK/universe-atlas-wt/riser-lod/tests/helpers/mountain-rock-detail-fixture.mjs');
const C=R.MOUNTAIN_ROCK_DETAIL;
const spacings=(process.argv[2]??'0,15.56,31.13,62.26,124.51,249.03').split(',').map(Number);
const seeds=(process.argv[3]??'tuning')==='gate'?F.GATE:F.TUNING;
for(const s of spacings){let min=Infinity,at=null,n=0,neg=0;
  for(const seed of seeds){const rs=R.rockDetailSeed(seed);
    const h=(x,y)=>{const c=F.base(x,y,seed);return c+R.rockDetailM(x+F.offset(seed),y,c,F.base(x+125,y,seed),F.base(x,y+125,seed),rs,s);};
    for(let k=0;k<64;k++){let x=-8000+16000*((k*0.6180339887)%1),y=-26000+52000*((k*0.7548776662)%1);
      for(let step=0;step<3000;step++){const c=F.base(x,y,seed),gx=F.base(x+.5,y,seed)-F.base(x-.5,y,seed),gy=F.base(x,y+.5,seed)-F.base(x,y-.5,seed),g=Math.hypot(gx,gy);
        if(!(g>1e-9))break;const nx=x+gx/g,ny=y+gy/g,c2=F.base(nx,ny,seed),dc=c2-c;
        if(g>=C.SLOPE_ZERO_TAN&&dc>=.9*g){const r=(h(nx,ny)-h(x,y))/dc;n++;if(r<=0)neg++;if(r<min){min=r;at={seed,x:+x.toFixed(1),y:+y.toFixed(1),c:+c.toFixed(1),g:+g.toFixed(3)};}}
        x=nx;y=ny;}}}
  console.log(`spacing ${s}: steps ${n} minRatio ${min.toFixed(4)} reversals ${neg}`,JSON.stringify(at));}
