import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {execFileSync} from 'node:child_process';
import {waterWorlds} from '../../../tests/terrain-climate-fixtures.mjs';
if(!process.argv[3]){for(let i=0;i<4;i++)process.stdout.write(execFileSync(process.execPath,[import.meta.filename,process.argv[2],String(i)],{encoding:'utf8'}));}
else {
 let s=readFileSync(new URL(process.argv[2]==='before'?'./fix-before-layout.txt':'../../../src/mountain-layout.ts',import.meta.url),'utf8');
 s=s.replace('const values=new Float32Array(candidates.length*81);','const nodeStart=performance.now();let nodeCount=0;const values=new Float32Array(candidates.length*81);')
 .replace('transverse(b,d,R,u,x,z,py,py*R-offset(b,u)<0?-1:1);','nodeCount++;transverse(b,d,R,u,x,z,py,py*R-offset(b,u)<0?-1:1);')
 .replace('const field={faceCells:N,','globalThis.fieldProfile={nodeCount,nodeMs:performance.now()-nodeStart};const field={faceCells:N,')
 .replace(/from (['"])(\.\/[^'"]+)\1/g,(_,q,p)=>`from ${q}${new URL('../../../src/'+p.slice(2),import.meta.url).href}${q}`);
 const {orogenLayout}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(s)).toString('base64'));
 const body=waterWorlds()[+process.argv[3]],l=orogenLayout(body);l.bandGrid(48000,32000);
 const start=performance.now(),f=l.coarseBandField(48000,32000),ms=performance.now()-start,p=globalThis.fieldProfile;
 console.log(JSON.stringify({world:body.name,ms,...p,nsPerNode:p.nodeMs*1e6/p.nodeCount,otherMs:ms-p.nodeMs,allocatedNodes:f.distances.length}));
}
