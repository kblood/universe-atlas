// Attempt 2 CPU diagnostic: does the captured far atlas reproduce the packaged
// LOD1 silhouettes at held-out views, per structural member and height?
// Engineering hypothesis only; not browser acceptance.
import {writeFileSync,mkdirSync} from 'node:fs';
import {loadRasterTree,encodePng} from '../../../../tests/helpers/tree-raster.mjs';
import {captureSphere,captureTile,reconstruct,direct,compare,neededViews} from '../../../../tests/helpers/far-atlas-emulation.mjs';
import {calibrateTreeLodCardScale} from '../../../../src/tree-lod-coverage.ts';
import {forestStructuralVariants} from '../../../../src/tree-structural-variant.ts';
import {forestFarAtlasHeightCoverage} from '../../../../src/forest-far-atlas.ts';

const out='test-results/forest-visual-followup-opus/resume-2/cpu/';mkdirSync(out,{recursive:true});
const FAR=[24,12];
const directions=[[.8,.25,.55],[-.3,.12,.95],[-.7,.55,-.45],[.2,.95,.24]].map(d=>{const l=Math.hypot(...d);return d.map(x=>x/l);});
// Candidate height models: optical-depth exponent (k) and mip bias beta*log2(16/h).
const models={raw:{exponent:false,beta:0},exponent:{exponent:true,beta:0},exponentBias05:{exponent:true,beta:.5},exponentBias1:{exponent:true,beta:1}};
const result={method:'CPU raster emulation; 64px ss4 tiles with box mips, trilinear 3-view hemi blend + one parallax step, sampled at the far pixel footprint',
  farPixelsAcrossSphere:FAR,models,families:{}};
const strip=[];
for(const kind of ['branching','spire']){
  const lod0=await loadRasterTree(kind,0),lod1=await loadRasterTree(kind,1);
  const alpha={width:lod0.atlas.width,height:lod0.atlas.height,rgba:lod0.atlas.data,cutoffByte:128};
  const cardScale=calibrateTreeLodCardScale(lod0,lod1,alpha,kind==='branching'?2:2.83).cardScale;
  const variants=forestStructuralVariants(kind),sphere=captureSphere(lod1,variants,cardScale);
  const rows=[],controls=[];
  for(const member of [0,3,6]){
    const variant=variants[member],tiles=new Map();
    for(const direction of directions){
      for(const index of neededViews(direction))if(!tiles.has(index))tiles.set(index,captureTile(lod1,{variant,cardScale,sphere,index}));
      for(const size of FAR)for(const heightM of [10,13,16,19,22]){
        const truth=direct(lod1,{variant,cardScale,sphere,direction,heightM,size});
        const row={member,size,heightM};
        for(const [name,model] of Object.entries(models)){
          const base=Math.log2(64/size),bias=model.beta*Math.log2(16/heightM);
          const atlas=reconstruct(tiles,{direction,sphere,size,lod:Math.max(0,base+bias)});
          const a=model.exponent?atlas.coverage.map((x,i)=>x>0?forestFarAtlasHeightCoverage(x,atlas.leaf[i]/x,heightM):0):atlas.coverage;
          row[name]=compare(a,truth.coverage);
          if(name==='raw'&&heightM===16&&member===0&&size===24)strip.push({a:atlas.coverage,b:truth.coverage,size});
        }
        rows.push(row);
      }
    }
    // Wrong-member control: member m's atlas against member (m+4)'s mesh.
    const other=(member+4)%8,direction=directions[0];
    const truth=direct(lod1,{variant:variants[other],cardScale,sphere,direction,size:24}),own=direct(lod1,{variant,cardScale,sphere,direction,size:24});
    const atlas=reconstruct(tiles,{direction,sphere,size:24});
    controls.push({member,other,own:+compare(atlas.coverage,own.coverage).l1.toFixed(3),wrong:+compare(atlas.coverage,truth.coverage).l1.toFixed(3)});
  }
  const summary={};
  for(const heightM of [10,13,16,19,22])for(const name of Object.keys(models)){
    const r=rows.filter(x=>x.heightM===heightM).map(x=>x[name]);
    (summary[name]??={})[heightM]={area:[Math.min(...r.map(x=>x.areaRatio)),Math.max(...r.map(x=>x.areaRatio))].map(x=>+x.toFixed(3)),l1Max:+Math.max(...r.map(x=>x.l1)).toFixed(3)};
  }
  result.families[kind]={cardScale:+cardScale.toFixed(3),sphereM:sphere,summary,controls,rows};
}
writeFileSync(out+'far-atlas-emulation.json',JSON.stringify(result,null,1)+'\n');
// Evidence strip: reconstruction (top) vs direct LOD1 (bottom), member 0, 16 m, 24 px enlarged 4x.
const S=24,Z=4,W=S*Z*strip.length,H=S*Z*2,rgb=new Uint8Array(W*H*3).fill(255);
strip.forEach(({a,b},k)=>{for(const [row,map] of [[0,a],[1,b]])for(let y=0;y<S*Z;y++)for(let x=0;x<S*Z;x++){
  const v=Math.round(255*(1-Math.min(1,map[Math.floor(y/Z)*S+Math.floor(x/Z)]))),o=((row*S*Z+y)*W+k*S*Z+x)*3;rgb[o]=v;rgb[o+1]=Math.round(v*.6+102);rgb[o+2]=v;}});
writeFileSync(out+'far-atlas-vs-lod1.png',encodePng(W,H,rgb));
for(const [kind,v] of Object.entries(result.families)){
  console.log(kind,'cardScale',v.cardScale,'controls',JSON.stringify(v.controls));
  for(const [name,s] of Object.entries(v.summary))console.log(' ',name.padEnd(15),Object.entries(s).map(([h,x])=>`${h}m ${x.area.join('-')} L1<=${x.l1Max}`).join(' | '));
}
