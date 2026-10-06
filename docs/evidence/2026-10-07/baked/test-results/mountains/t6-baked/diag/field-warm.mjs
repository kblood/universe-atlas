// Cold vs second build of the coarse band field in one fresh process (JIT warm-up share). Coordinator diagnostic.
import {execFileSync} from 'node:child_process';
if(!process.argv[2]){
  for(let i=0;i<4;i++)process.stdout.write(execFileSync(process.execPath,[import.meta.filename,String(i)],{encoding:'utf8'}));
}else{
  const {waterWorlds}=await import('../../../../tests/terrain-climate-fixtures.mjs');
  const L=await import('../../../../src/mountain-layout.ts');
  const body=waterWorlds()[+process.argv[2]],layout=L.orogenLayout(body);layout.bandGrid(48000,32000);
  const t0=performance.now();layout.coarseBandField(48000,32000);const cold=performance.now()-t0;
  const ms=[];for(let r=0;r<3;r++){
    const again=L.buildOrogenLayout({seed:body.seed,radiusM:body.radiusM,a0:L.constructionA0(body),sampleA0:L.continentalA0(body)});
    again.bandGrid(48000,32000);const t=performance.now();again.coarseBandField(48000,32000);ms.push(performance.now()-t);}
  console.log(JSON.stringify({world:body.name,coldMs:+cold.toFixed(1),repeatMs:ms.map(x=>+x.toFixed(1))}));
}
