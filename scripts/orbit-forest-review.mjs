// CPU review of actual planetSurface texture bytes, without competing for GPU.
// Explicit output directory keeps review artifacts out of source folders.
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {planetSurface,ORBIT_FOREST_COLOUR} from '../src/terrain.ts';
import {waterWorlds} from '../tests/terrain-climate-fixtures.mjs';
import {writePng} from '../tests/helpers/mountain-metrics.mjs';
const arg=process.argv.indexOf('--output');
if(arg<0||!process.argv[arg+1])throw new Error('usage: node scripts/orbit-forest-review.mjs --output <review directory>');
const out=resolve(process.argv[arg+1]);mkdirSync(out,{recursive:true});
const W=512,H=256,S=384,rows=[];
const sheet=Buffer.alloc(S*2*S*4*3,9);
function globe(data){
  const rgb=Buffer.alloc(S*S*3,9);
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){
    const dx=(x+.5-S/2)/(S*.46),dy=-(y+.5-S/2)/(S*.46),r=dx*dx+dy*dy;
    if(r>=1)continue;
    const dz=Math.sqrt(1-r),phi=Math.acos(dy),theta=Math.atan2(dx,-dz);
    const u=((theta/(2*Math.PI))%1+1)%1,v=phi/Math.PI;
    const p=(Math.min(H-1,Math.floor(v*H))*W+Math.floor(u*W))*4;
    // Same fixed projection and illumination for both maps. No cloud/haze masking.
    const light=.25+.75*Math.max(0,dx*.35+dy*.25+dz*.9028);
    for(let k=0;k<3;k++)rgb[(y*S+x)*3+k]=Math.round(data[p+k]*light);
  }
  return rgb;
}
for(const [row,body] of waterWorlds().entries()){
  const before=planetSurface(body,W,40,undefined,false,false),after=planetSurface(body,W,40);
  let changed=0,maxDelta=0;
  for(let i=0;i<before.data.length;i+=4){let differs=false;for(let k=0;k<3;k++){const delta=Math.abs(after.data[i+k]-before.data[i+k]);maxDelta=Math.max(maxDelta,delta);differs||=delta>0;}changed+=differs;}
  for(const [column,[tag,map]] of [['before',before],['after',after]].entries()){
    const rgb=globe(map.data);writePng(resolve(out,`${body.name}-${tag}.png`),S,S,rgb);
    for(let y=0;y<S;y++)rgb.copy(sheet,((row*S+y)*S*2+column*S)*3,y*S*3,(y+1)*S*3);
  }
  rows.push({body:body.name,bodyId:body.id,changedPixels:changed,totalPixels:W*H,maxChannelDelta:maxDelta,landFraction:after.landFraction});
}
writePng(resolve(out,'comparison.png'),S*2,S*4,sheet);
writeFileSync(resolve(out,'report.json'),JSON.stringify({palette:ORBIT_FOREST_COLOUR,method:'CPU orthographic projection of runtime coarse-globe texture; before left, after right; rows Maithea, Selawyn, Raiva, Lethuris; fixed lighting, no clouds; not a browser/device acceptance capture',rows},null,2)+'\n');
console.log(JSON.stringify({out,rows}));
