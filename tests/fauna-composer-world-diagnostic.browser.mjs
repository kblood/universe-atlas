/** Actual-world visibility evidence. Reads a saved habitat replay and a built
 * app; it never moves canonical roots or disables terrain in the normal view.
 * The second image deliberately disables animal depth testing to distinguish
 * an occluded GPU draw from a missing draw. This is not a performance test. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {withGpuLock} from './helpers/gpu-lock.mjs';
import {startDistPreview,stopServer} from './helpers/free-port.mjs';
const root=process.env.ATLAS_ROOT??process.cwd();
const out=process.env.ATLAS_RESULTS??'test-results/composer-world-depth';
if(!process.env.HABITAT_REPLAY)throw new Error('HABITAT_REPLAY must name the preserved actual-world replay');
const fixture=JSON.parse(await readFile(process.env.HABITAT_REPLAY,'utf8')).worlds[Number(process.env.HABITAT_WORLD_INDEX??0)];
await mkdir(out,{recursive:true});
await withGpuLock({owner:'Composer actual planet visibility diagnostic',capture:true},async()=>{
 const server=await startDistPreview({root,dist:root+'/dist'}),browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(server.base+'?'+new URLSearchParams({seed:'LETHRA-001',g:'G001',system:fixture.bodyId.split('/planet/')[0],body:fixture.bodyId,date:fixture.date}));
 await page.waitForFunction(id=>window.__atlas?.ready&&window.__atlas.state.body?.id===id&&window.__atlas.terrain?.tiles?.ready,fixture.bodyId,{timeout:180000});
 await page.evaluate(({fixture})=>{const a=window.__atlas,p=fixture.views.find(p=>p.clearance===20);a.setExplorationPaused(true);a.seek(fixture.date);a.setPose(p.p,p.q,p.clearance);},{fixture});
 await page.waitForFunction(id=>window.__atlas?.renderDebug().planet?.faunaComposer?.snapshotOf(id),fixture.target.id,{timeout:180000});
 await page.waitForTimeout(3000);
 const report=await page.evaluate(id=>{
  const a=window.__atlas,d=a.renderDebug(),p=d.planet,r=p.faunaComposer,c=r.desired.get(id),s=r.snapshotOf(id),actor=r.actors.get(id),pool=r.merged.get(actor.tier),mesh=pool?.mesh??r.entries.get(actor.key).batches[actor.tier].mesh;
  const Vec=d.camera.position.constructor,Mat=d.camera.matrixWorld.constructor,clip=new Mat().multiplyMatrices(d.camera.projectionMatrix,d.camera.matrixWorldInverse),bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]},worldBounds=structuredClone(bounds);
  const vertices=[],groundSamples=[],skin=s.skin,packed=!!skin.storage;
  for(let v=0;v<skin.positions.length/3;v++){
   const point=new Vec().fromArray(skin.positions,v*3),posed=new Vec(),tmp=new Vec();let sum=0;
   for(let k=0;k<4;k++)sum+=skin.skinWeight[v*4+k]/(packed?65535:1);
   for(let k=0;k<4;k++){const weight=skin.skinWeight[v*4+k]/(packed?65535*sum:1),bone=skin.skinIndex[v*4+k];tmp.copy(point).applyMatrix4(new Mat().fromArray(s.palette,bone*16));posed.addScaledVector(tmp,weight);}
   posed.applyMatrix4(c.matrix);if(v%20===0){const planet=posed.clone().add(r.group.position),h=(planet.length()-1)*p.body.radiusM,dir=planet.normalize().toArray(),ground=p.renderedGroundHeightM(dir);groundSamples.push({v,h,ground,canonical:p.sample(dir).groundHeightM});}posed.applyMatrix4(mesh.matrixWorld);const world=posed.toArray();posed.applyMatrix4(clip);const ndc=posed.toArray();
   for(let k=0;k<3;k++){bounds.min[k]=Math.min(bounds.min[k],ndc[k]);bounds.max[k]=Math.max(bounds.max[k],ndc[k]);worldBounds.min[k]=Math.min(worldBounds.min[k],world[k]);worldBounds.max[k]=Math.max(worldBounds.max[k],world[k]);}if(v<4)vertices.push({world,ndc});
  }
  const chain=[];for(let o=mesh;o;o=o.parent)chain.push({name:o.name,type:o.type,visible:o.visible,layers:o.layers.mask,position:o.position.toArray(),scale:o.scale.toArray()});
  window.__composerProbe={mesh,draws:0};const before=mesh.onAfterRender;mesh.onAfterRender=function(...args){before.apply(this,args);if(args[2]===d.camera)window.__composerProbe.draws++;};
  const gl=d.renderer.getContext(),shaders=[];for(const object of [mesh,[...p.patches.values()].find(x=>x.mesh.visible)?.mesh]){if(!object)continue;const prop=d.renderer.properties.get(object.material),program=prop.currentProgram?.program;if(program)shaders.push({name:object.name,uniforms:gl.getUniform(program,gl.getUniformLocation(program,'logDepthBufFC')),source:gl.getAttachedShaders(program).map(sh=>gl.getShaderSource(sh))});}
  return {id,diag:r.diagnostics(),tier:s.tier,vertices:skin.positions.length/3,bounds,worldBounds,samples:vertices,groundSamples,shaders,posePlanet:s.pose.planet,root:c.matrix.toArray(),matrixWorld:mesh.matrixWorld.toArray(),chain,roots:pool?[...pool.roots.subarray(actor.row*28,actor.row*28+28)]:null,row:actor.row,cameraLayers:d.camera.layers.mask,cameraWorld:d.camera.matrixWorld.toArray(),errors:[]};
 },fixture.target.id);
 await page.waitForTimeout(500);report.draws=await page.evaluate(()=>window.__composerProbe.draws);
 await page.screenshot({path:out+'/normal.png'});
 await page.evaluate(()=>{const m=window.__composerProbe.mesh;m.material.depthTest=false;m.material.depthWrite=false;m.renderOrder=999;});
 await page.waitForTimeout(500);await page.screenshot({path:out+'/no-depth.png'});
 const gaps=report.groundSamples.filter(x=>x.ground).map(x=>x.h-x.ground.heightM);
 report.renderedGroundGapM={min:Math.min(...gaps),max:Math.max(...gaps)};
 report.whollyBelowRenderedGround=gaps.length>0&&Math.max(...gaps)<0;
 report.errors=errors;await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({bounds:report.bounds,renderedGroundGapM:report.renderedGroundGapM,whollyBelowRenderedGround:report.whollyBelowRenderedGround,draws:report.draws,errors}));
 assert.equal(errors.length,0);assert.ok(report.draws>0,'selected Composer mesh actually reaches the main camera');
 if(process.env.COMPOSER_REQUIRE_ABOVE_TERRAIN==='1')assert.equal(report.whollyBelowRenderedGround,false,'canonical animal is wholly occluded by the drawn terrain approximation');
 }finally{await browser.close();await stopServer(server.child);}
});
