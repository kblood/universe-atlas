import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const root='C:/LLM/IWSDK/Assets/_assetctl/tree-impostor-v7-color-a-v2-full-a',source='C:/LLM/IWSDK/Assets/_assetctl/atlas-tree-v7-color-a',out='test-results/tree-alpha-experiment';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']});const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.route('**/__capture/**',async route=>{const path=new URL(route.request().url()).pathname.slice('/__capture/'.length);let file;if(path==='source0')file=join(source,'atlas-branching-v1.glb');else if(path==='source1')file=join(source,'atlas-branching-v1.lod1.glb');else if(path==='capture-manifest.json'||/^view-\d+\/mip-\d+\.(colour|data|classification)\.f32$/.test(path))file=join(root,path);else throw new Error('Invalid fixture path');await route.fulfill({status:200,body:await readFile(file),contentType:path.endsWith('.json')?'application/json':'application/octet-stream'});});
 await page.goto('http://127.0.0.1:5197/tree-impostor-lab.html');
 await page.waitForFunction(()=>window.__treeImpostorLab);
 await page.evaluate(async()=>{const read=async path=>(await fetch('/__capture/'+path)).arrayBuffer();const [a,b,m]=await Promise.all([read('source0'),read('source1'),fetch('/__capture/capture-manifest.json').then(r=>r.json())]);await window.__treeImpostorLab.load(a,b,m,read);});
 for(const mode of ['mesh','capture']){await page.evaluate(m=>window.__treeImpostorLab.setMode(m),mode);await page.waitForTimeout(300);await page.screenshot({path:join(out,mode+'.png')});}
 const probes=[];
 for(const direction of [[0,0,1],[1,.3,1]])for(const pixels of [32,64,128,256,512]){
 const values=await page.evaluate(({direction,pixels})=>{
 const lab=window.__treeImpostorLab,leaf=lab.family.lods[0][1].material;
 const area=data=>data.reduce((a,v,i)=>a+(i%4===3?v/255:0),0);
 leaf.alphaHash=false;leaf.alphaTest=.5;leaf.needsUpdate=true;
 const native=area(lab.probe(direction,'mesh',pixels));
 const reference=area(lab.probe(direction,'mesh',pixels,4));
 leaf.alphaHash=true;leaf.alphaTest=0;leaf.needsUpdate=true;
 const hash=area(lab.probe(direction,'mesh',pixels));
 leaf.alphaHash=false;leaf.alphaTest=.5;leaf.needsUpdate=true;
 return{native,reference,hash,nativeRatio:native/reference,hashRatio:hash/reference};
 },{direction,pixels});probes.push({direction,pixels,...values});
 } const diagnostics=await page.evaluate(()=>({bytes:window.__treeImpostorLab.capture.bytes,renderer:window.__treeImpostorLab.renderer.info,views:window.__treeImpostorLab.capture.views.length}));
 await writeFile(join(out,'smoke.json'),JSON.stringify({probes,diagnostics,errors},null,2));console.log(JSON.stringify({probes,bytes:diagnostics.bytes,errors}));
}finally{await browser.close();}


