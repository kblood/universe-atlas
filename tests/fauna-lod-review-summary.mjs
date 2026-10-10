import {readFile,writeFile} from 'node:fs/promises';
const out=process.env.ATLAS_RESULTS||'test-results/fauna-lod-review',report=JSON.parse(await readFile(out+'/report.json','utf8')),groups=new Map();
for(const review of report.reviews)for(const panel of review.panels){
  const key=panel.method+'/'+panel.target;if(!groups.has(key))groups.set(key,[]);groups.get(key).push({...panel,id:review.id,pose:review.pose,view:review.view});
}
const stats=(rows,key)=>{const values=rows.map(r=>r[key]).sort((a,b)=>a-b);return {minimum:values[0],median:values[Math.floor(values.length*.5)],maximum:values.at(-1)};};
const summary={classification:'paired canonical skinning and desktop image diagnosis; no automatic perceptual acceptance threshold',errors:report.errors,cases:report.reviews.length,
  groups:[...groups].map(([method,rows])=>({method,cases:rows.length,unreached:rows.filter(r=>r.reached===false).length,
    silhouette:stats(rows,'silhouetteIoU'),feet:stats(rows,'footRegionIoU'),litRGBError:stats(rows,'colourMeanAbsoluteChannelErrorOnOverlap'),
    worstSilhouette:rows.reduce((a,b)=>a.silhouetteIoU<b.silhouetteIoU?a:b),worstFeet:rows.reduce((a,b)=>a.footRegionIoU<b.footRegionIoU?a:b)}))};
await writeFile(out+'/summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary.groups.map(g=>({method:g.method,unreached:g.unreached,silhouette:g.silhouette,feet:g.feet,color:g.litRGBError})),null,2));
