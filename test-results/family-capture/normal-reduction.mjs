// CPU diagnostic of the extra normal-distribution loss from stored 64px to
// 32px captures. It cannot recover losses already incurred at capture time.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const root='C:/LLM/IWSDK/Assets/_assetctl';
const sha=b=>createHash('sha256').update(b).digest('hex');
const directions=[[-30,55,25],[1,0,0],[0,1,0]].map(v=>{const n=Math.hypot(...v);return v.map(x=>x/n)});
const luma=c=>.2126*c[0]+.7152*c[1]+.0722*c[2];
const report={scope:'CPU diagnostic of 64-to-32 capture reduction only, no parallax, specular, shadows, rasterization or browser PBR. Baseline is lighting of stored 64px normals, not original geometry. Quadratic transfer is the order-two clamped-cosine expansion, not a shipping shader. Summaries sum texel areas across the 81 sampled views, without spherical solid-angle weighting or deduplication; they are not whole-canopy lighting integrals. Per-view relative error is null when baseline energy is negligible.',
  reference:'https://graphics.stanford.edu/papers/envmap/',directions,results:[]};
for(const family of ['oak','pine']){
  const dir=join(root,`atlas-${family}-lod1-capture-16m-64-sidecar-v1`),raw=await readFile(join(dir,'capture-manifest.json')),manifest=JSON.parse(raw);
  const records=new Map(manifest.artifacts.map(r=>[r.path,r]));
  const load=async(view,mip,channel)=>{
    const path=`view-${String(view).padStart(3,'0')}/mip-${mip}.${channel}.f32`,b=await readFile(join(dir,path));
    if(sha(b)!==records.get(path)?.sha256)throw new Error(`Changed source ${path}`);
    return new Float32Array(b.buffer,b.byteOffset,b.length/4);
  };
  const views=[];
  for(const view of manifest.views){
    const [c,n,pc,pn]=await Promise.all([load(view.index,0,'colour'),load(view.index,0,'data'),load(view.index,1,'colour'),load(view.index,1,'data')]);
    const lights=directions.map(light=>{
      let source=0,normalizedMean=0,quadraticTransfer=0,negativeBlocks=0;
      for(let y=0;y<32;y++)for(let x=0;x<32;x++){
        const p=(y*32+x)*4;let transfer=0;
        for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
          const q=((2*y+dy)*64+2*x+dx)*4,a=c[q+3],rgb=luma(c.subarray(q,q+3));
          const dot=n[q]*light[0]+n[q+1]*light[1]+n[q+2]*light[2];
          source+=a*rgb*Math.max(0,dot)/4;
          transfer+=a*rgb*(3/32+dot/2+15*dot*dot/32)/4;
        }
        const dot=pn[p]*light[0]+pn[p+1]*light[1]+pn[p+2]*light[2];
        normalizedMean+=pc[p+3]*luma(pc.subarray(p,p+3))*Math.max(0,dot);
        if(transfer<0)negativeBlocks++;
        quadraticTransfer+=Math.max(0,transfer);
      }
      return {source,normalizedMean,quadraticTransfer,normalizedMeanError:source>1e-12?(normalizedMean-source)/source:null,quadraticTransferError:source>1e-12?(quadraticTransfer-source)/source:null,negativeBlocks};
    });
    views.push({index:view.index,towardCamera:view.towardCamera,lights});
  }
  const summary=directions.map((_,i)=>{
    const rows=views.map(v=>v.lights[i]),sum=key=>rows.reduce((s,r)=>s+r[key],0),source=sum('source');
    const abs=key=>rows.reduce((s,r)=>s+Math.abs(r[key]-r.source),0)/source;
    return {source,normalizedMeanRelativeError:(sum('normalizedMean')-source)/source,quadraticTransferRelativeError:(sum('quadraticTransfer')-source)/source,
      normalizedMeanAbsoluteError:abs('normalizedMean'),quadraticTransferAbsoluteError:abs('quadraticTransfer'),negativeBlocks:sum('negativeBlocks')};
  });
  report.results.push({family,manifestSha256:sha(raw),summary,views});
}
await writeFile('test-results/family-capture/normal-reduction.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.results.map(({family,summary})=>({family,summary})),null,2));
