import {execFileSync} from 'node:child_process';
if(!process.argv[2]){
  for(let i=0;i<4;i++)process.stdout.write(execFileSync(process.execPath,[import.meta.filename,String(i)],{encoding:'utf8'}));
}else{
  const {waterWorlds,orogenLayout,statistics}=await import('../../../tests/helpers/mountain-coarse-field.mjs');
  const body=waterWorlds()[+process.argv[2]],layout=orogenLayout(body);layout.bandGrid(48000,32000);
  const start=performance.now(),field=layout.coarseBandField(48000,32000),ms=performance.now()-start;
  console.log(JSON.stringify({world:body.name,ms,N:field.faceCells,bytes:field.bytes,activeCells:field.activeCells,multiBeltCells:field.multiBeltCells,delta:field.scalars[8],...statistics(body)}));
}
