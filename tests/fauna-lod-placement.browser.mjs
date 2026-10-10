/** Actual uploaded roots/palettes and current scene matrices, then isolated pixels. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {startDistPreview,stopServer} from './helpers/free-port.mjs';
import {acquireGpuLock} from './helpers/gpu-lock.mjs';
import {CURRENT_VERSIONS,MODEL_MANIFEST_ID,encodeVersions} from '../src/time-nav.ts';
const out=process.env.ATLAS_RESULTS||'test-results/fauna-lod-placement';await mkdir(out,{recursive:true});const fixture=JSON.parse(await readFile('C:/LLM/IWSDK/Assets/_assetctl/life-presentation-20261009/baseline-flight/replay.json','utf8'));
let server,lock,browser;const report={ok:false,errors:[],scenes:[],scope:'world placement and nonzero isolated actual main-camera LOD fragments; isolation removes occluders, screenshots remain full scene'};
try{server=await startDistPreview({dist:process.env.ATLAS_DIST});report.build=server.build;lock=await acquireGpuLock({owner:'actual LOD world placement and pixel proof',capture:true,retryMs:30000});browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']});
 for(const world of fixture.worlds.filter(w=>!process.env.FAUNA_WORLD_INDICES||process.env.FAUNA_WORLD_INDICES.split(',').map(Number).includes(w.index))){const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  const params=new URLSearchParams({seed:'LETHRA-001',g:'G001',system:world.bodyId.split('/planet/')[0],body:world.bodyId,date:world.date,wv:encodeVersions(CURRENT_VERSIONS),mv:MODEL_MANIFEST_ID,'fauna-lod-prototype':process.env.FAUNA_LOD_MODE||'float'});
  await page.goto(server.base+'?'+params);await page.waitForFunction(id=>window.__atlas?.ready&&window.__atlas.state.body?.id===id&&window.__atlas.terrain.tiles.ready,world.bodyId,{timeout:180000});
  for(const pose of [{...world.arrival,clearance:80},...world.views].filter(v=>!process.env.FAUNA_CLEARANCES||process.env.FAUNA_CLEARANCES.split(',').map(Number).includes(v.clearance))){
   await page.evaluate(({pose,date})=>{const a=window.__atlas;a.setExplorationPaused(true);a.seek(date);a.setPose(pose.p,pose.q,pose.clearance);},{pose,date:world.date});
   await page.waitForTimeout(6000);await page.waitForFunction(()=>{const p=window.__atlas.renderDebug().planet,d=p.faunaLod.diagnostics();return d.coldJobs===0&&d.pendingResults===0&&p.faunaLod.idle&&window.__atlas.terrain.tiles.pending===0;},undefined,{timeout:180000});
   const proof=await page.evaluate(()=>{
    const a=window.__atlas,debug=a.renderDebug(),p=debug.planet,renderer=debug.renderer,scene=debug.scene,camera=debug.camera,lod=p.faunaLod,THREEType=p.faunaRenderer.group.position.constructor,Matrix=p.faunaRenderer.group.matrix.constructor;
    scene.updateMatrixWorld(true);const parent=p.faunaRenderer.group.parent.matrixWorld,inverse=parent.clone().invert(),candidates=p.faunaLodList,rows=[];
    lod.group.traverse(mesh=>{if(!mesh.isMesh)return;const uniforms=renderer.properties.get(mesh.material).uniforms,roots=uniforms?.faunaRoots?.value?.image?.data,bones=uniforms?.faunaBones?.value?.image?.data;if(!roots||!bones)return;
     const position=mesh.geometry.attributes.position,weights=mesh.geometry.attributes.skinWeight,indices=mesh.geometry.attributes.skinIndex,actors=mesh.geometry.attributes.faunaActor;
     for(let slot=0;slot<roots.length/20;slot++){if(roots[slot*20+16]<.5||roots[slot*20+18]<=roots[slot*20+19])continue;
      const root=new Matrix().fromArray(roots,slot*20),translation=new THREEType().setFromMatrixPosition(root);let chosen=null,best=Infinity;
      for(const c of candidates){const distance=translation.distanceTo(new THREEType().setFromMatrixPosition(c.matrix));if(distance<best){chosen=c;best=distance;}}if(!chosen)throw new Error('Active GPU root without candidate');
      const canonical=p.faunaDrawn.find(x=>x.id===chosen.id).position,gpuRoot=translation.clone().applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse),anchorErrorM=gpuRoot.distanceTo(new THREEType(...canonical))*p.body.radiusM;
      let vertex=0;while(vertex<actors.count&&actors.getX(vertex)!==slot)vertex++;if(vertex===actors.count)throw new Error('Actor vertex atlas missing');
      const original=new THREEType(position.getX(vertex),position.getY(vertex),position.getZ(vertex)),deformed=new THREEType();
      for(let lane=0;lane<4;lane++){const bone=indices.array[vertex*4+lane],weight=weights.array[vertex*4+lane]/255;if(weight)deformed.addScaledVector(original.clone().applyMatrix4(new Matrix().fromArray(bones,slot*352+bone*16)),weight);}
      const actual=deformed.clone().applyMatrix4(root).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse),expected=deformed.clone().applyMatrix4(chosen.matrix).add(p.lifeOrigin),vertexErrorM=actual.distanceTo(expected)*p.body.radiusM;
      const wrongMatrix=mesh.matrixWorld.clone().multiply(new Matrix().makeTranslation(p.lifeOrigin.x,p.lifeOrigin.y,p.lifeOrigin.z)),negativeControlDoubleOriginErrorM=translation.clone().applyMatrix4(wrongMatrix).applyMatrix4(inverse).distanceTo(new THREEType(...canonical))*p.body.radiusM;
      rows.push({id:chosen.id,slot,anchorErrorM,vertexErrorM,negativeControlDoubleOriginErrorM,rootMatchLocalError:best,poolOrigin:mesh.parent.position.toArray()});
     }});
    const ancestors=new Set();for(let o=lod.group;o;o=o.parent)ancestors.add(o);const hidden=[],ranges=[];
    scene.traverse(object=>{if(!object.isMesh&&!object.isPoints&&!object.isSprite&&!object.isLine)return;let inLod=false;for(let o=object;o;o=o.parent)if(o===lod.group)inLod=true;if(inLod)return;
     if(ancestors.has(object)){ranges.push([object.geometry,{...object.geometry.drawRange}]);object.geometry.setDrawRange(0,0);}else{hidden.push([object,object.visible]);object.visible=false;}});
    const oldTarget=renderer.getRenderTarget(),background=scene.background,color=renderer.getClearColor({copy:c=>c.clone()}),alpha=renderer.getClearAlpha(),shadowAuto=renderer.shadowMap.autoUpdate,shadowNeeds=renderer.shadowMap.needsUpdate;
    let nonzeroRgbPixels=0;
    try{scene.background=null;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;renderer.setRenderTarget(null);renderer.setClearColor(0,0);renderer.clear();renderer.render(scene,camera);
     const gl=renderer.getContext(),width=gl.drawingBufferWidth,height=gl.drawingBufferHeight,bytes=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,bytes);
     for(let i=0;i<bytes.length;i+=4)if(bytes[i]>2||bytes[i+1]>2||bytes[i+2]>2)nonzeroRgbPixels++;
    }finally{scene.background=background;renderer.setClearColor(color,alpha);renderer.setRenderTarget(oldTarget);renderer.shadowMap.autoUpdate=shadowAuto;renderer.shadowMap.needsUpdate=shadowNeeds;for(const [object,visible]of hidden)object.visible=visible;for(const [geometry,range]of ranges)geometry.setDrawRange(range.start,range.count);}
    return {rows,nonzeroRgbPixels,scope:'current full scene/camera, all non-LOD geometry hidden temporarily; ordinary actual shaders/palettes/roots, direct main framebuffer synchronous RGB readback'};
   });
   for(const row of proof.rows){assert(row.anchorErrorM<=.01,`${row.id} uploaded root world placement`);assert(row.vertexErrorM<=.01,`${row.id} uploaded skinned vertex world placement`);assert(row.negativeControlDoubleOriginErrorM>1000,'negative control catches original double-origin placement');}
   if(proof.rows.length)assert(proof.nonzeroRgbPixels>10,'actual camera LOD renders nonzero isolated RGB fragments');
   report.scenes.push({world:world.bodyId,clearance:pose.clearance,...proof});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.screenshot({path:out+`/world${world.index}-${pose.clearance}.png`});await writeFile(out+'/report.json',JSON.stringify(report,null,2));
  }await page.close();}
 assert.deepEqual(report.errors,[]);report.ok=true;
}finally{await browser?.close();await lock?.release();if(server)await stopServer(server.child);await writeFile(out+'/report.json',JSON.stringify(report,null,2));}
