import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
const root='test-results/mountains/t6-baked/r2/astra';
const median=a=>[...a].sort((a,b)=>a-b)[a.length>>1];
const result={field:{},c1:{}};
for(const row of readFileSync(`${root}/field.jsonl`,'utf8').trim().split(/\r?\n/).map(JSON.parse))(result.field[row.world]??=[]).push(row);
for(const [world,rows] of Object.entries(result.field))result.field[world]={n:rows.length,coldMs:median(rows.map(r=>r.coldMs)),materialiseAllMs:median(rows.map(r=>r.materialiseAllMs)),totalMs:median(rows.map(r=>r.coldMs+r.materialiseAllMs)),bytes:rows[0].bytes,activeCells:rows[0].activeCells};
for(const variant of ['before','dispatch','early','final']){
 const rows=readdirSync(`${root}/${variant}`).filter(x=>x.endsWith('.json')).flatMap(f=>Object.values(JSON.parse(readFileSync(`${root}/${variant}/${f}`,'utf8'))));
 result.c1[variant]={};
 for(const world of ['Maithea','Selawyn','Raiva','Lethuris']){
  const r=rows.filter(r=>r.world===world);if(!r.length)continue;
  result.c1[variant][world]={n:r.length,outsidePct:100*median(r.map(r=>r.outsideOverhead)),weightedPct:100*median(r.map(r=>r.weightedResidentOverhead)),weightedRange:r.map(r=>100*r.weightedResidentOverhead).sort((a,b)=>a-b)};
 }
}
writeFileSync(`${root}/summary.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
