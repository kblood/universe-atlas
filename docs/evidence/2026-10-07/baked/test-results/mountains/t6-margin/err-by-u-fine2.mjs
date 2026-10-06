// Diagnostic: bilinear signed-distance interpolation error of the coarse field, binned by |u/U| of the tap.
// Usage: node err-by-u.mjs <worldIndex> [steps]
import {waterWorlds,orogenLayout,referenceDistance,nodeDirection} from '../../../tests/helpers/mountain-coarse-field.mjs';
const body=waterWorlds()[+process.argv[2]],steps=+(process.argv[3]??8),BINS=400;
const layout=orogenLayout(body),f=layout.coarseBandField(48000,32000),N=f.faceCells,B=N/8;
const binMax=new Float64Array(BINS),binCount=new Float64Array(BINS);let worst=null,max=0;
// also: error in the "relevant" region only (|exact|<1.2)
for(let q=0;q<f.blockTable.length;q++){
  const block=f.blockTable[q]-1;if(block<0)continue;
  const face=Math.floor(q/(B*B)),i0=q%B*8,j0=Math.floor(q/B)%B*8;
  for(let j=0;j<8;j++)for(let i=0;i<8;i++){
    const bit=j*8+i;if(!(f.masks[block*2+(bit>>>5)]&(1<<(bit&31))))continue;
    for(let c=f.offsets[block];c<f.offsets[block+1];c++){
      const b=layout.belts[f.candidates[c]],p=c*81+j*9+i,H=Math.min(b.halfWidthM,48000);
      for(let y=0;y<=steps;y++)for(let x=0;x<=steps;x++){
        const wx=x/steps,wy=y/steps,d=nodeDirection(face,i0+i+wx,j0+j+wy,N);
        const z=d[0]*b.centre[0]+d[1]*b.centre[1]+d[2]*b.centre[2],xx=d[0]*b.tangent[0]+d[1]*b.tangent[1]+d[2]*b.tangent[2],u=xx/(Math.sqrt(xx*xx+z*z)+z);
        const uf=Math.abs(u/b.uLimit);if(uf>=1||uf<+(process.argv[4]??0))continue;
        const exact=referenceDistance(b,d,body.radiusM)/H;if(Math.abs(exact)>1.25)continue;
        const a=f.distances,sd=(a[p]*(1-wx)+a[p+1]*wx)*(1-wy)+(a[p+9]*(1-wx)+a[p+10]*wx)*wy,e=Math.abs(sd-exact);
        const k=Math.min(BINS-1,Math.floor(uf*BINS));binCount[k]++;if(e>binMax[k])binMax[k]=e;
        if(e>max){max=e;worst={belt:f.candidates[c],face,i:i0+i,j:j0+j,uf,exact,sd};}
      }
    }
  }
}
console.log(JSON.stringify({world:body.name,steps,max,worst,interior:Math.max(...binMax.slice(0,360)),bins:Array.from(binMax,(m,k)=>({lo:k/BINS,max:+m.toFixed(6),n:binCount[k]})).slice(360)}));

