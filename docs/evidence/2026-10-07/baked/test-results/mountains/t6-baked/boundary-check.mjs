import {waterWorlds,orogenLayout,nodeDirection,lookup,sampler} from '../../../tests/helpers/mountain-coarse-field.mjs';
for(const body of waterWorlds()){
 const field=orogenLayout(body).coarseBandField(48000,32000),N=field.faceCells,B=N/8,coarse=sampler(body,{mountains:true,lodLevel:0}),plain=sampler(body,{mountains:false});let max=0,count=0,worst;
 for(let q=0;q<field.blockTable.length;q++){
  const block=field.blockTable[q]-1;if(block<0)continue;const face=Math.floor(q/(B*B)),i0=q%B*8,j0=Math.floor(q/B)%B*8;
  for(let j=0;j<8;j++)for(let i=0;i<8;i++){
   const bit=j*8+i;if(!(field.masks[2*block+(bit>>>5)]&(1<<(bit&31))))continue;
   for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
    if(lookup(field,nodeDirection(face,i0+i+.5+dx,j0+j+.5+dy,N)).length)continue;
    for(const step of [0,.25,.5,.75,1]){
     const x=i0+i+(dx?(.5+.5*dx):step),y=j0+j+(dy?(.5+.5*dy):step),d=nodeDirection(face,x,y,N),h=Math.abs(coarse(d).floorM-plain(d).floorM);count++;
     if(h>max){max=h;worst={face,x,y};}
    }
   }
  }
 }
 console.log(JSON.stringify({world:body.name,count,max,worst}));
}
