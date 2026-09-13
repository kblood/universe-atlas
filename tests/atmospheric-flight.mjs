import {chromium} from 'playwright';
import {browserArgs} from './browser-options.mjs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.ATLAS_URL||'http://127.0.0.1:5186/',out=process.env.ATLAS_RESULTS||'test-results/atmospheric-flight';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:browserArgs}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const wait=fn=>page.waitForFunction(fn,undefined,{timeout:180000});
const read=()=>page.evaluate(()=>({travel:window.__atlas.travel,body:window.__atlas.state.body}));
function orientation(s){
  const q=new THREE.Quaternion().fromArray(s.travel.heading),p=new THREE.Vector3(...s.travel.position),c=new THREE.Vector3(...s.travel.bodies.find(b=>b.id===s.body.id).positionM);
  const up=p.sub(c).normalize(),forward=new THREE.Vector3(0,0,-1).applyQuaternion(q),horizon=up.projectOnPlane(forward).normalize(),cameraUp=new THREE.Vector3(0,1,0).applyQuaternion(q);
  return {error:Math.acos(THREE.MathUtils.clamp(horizon.dot(cameraUp),-1,1)),forward};
}
try{
  await page.goto(base+'?seed=LETHRA-001&g=G001&system=G001%2FC2128%2C0%2C1%2F0&body=G001%2FC2128%2C0%2C1%2F0%2Fplanet%2F1');
  await wait(()=>window.__atlas?.ready&&window.__atlas.terrain?.tiles?.ready);
  await page.locator('#terrain-flight').click();await wait(()=>window.__atlas.travel.terrainCruise===600);
  // Leave cruise and create a bank using genuine camera-relative drag input.
  await page.keyboard.press('w');await page.locator('#horizon-assist').click();
  assert.equal((await read()).travel.horizonAssist,false);
  await page.mouse.move(680,450);await page.mouse.down();
  await page.mouse.move(680,620,{steps:5});await page.mouse.move(910,620,{steps:5});await page.mouse.up();
  const banked=await read(),original=orientation(banked);assert.ok(original.error>.2,'mouse flight creates a measurable bank');
  await page.waitForTimeout(1200);assert.ok(Math.abs(orientation(await read()).error-original.error)<1e-6,'off preserves bank');
  await page.screenshot({path:out+'/01-banked.png'});
  await page.locator('#horizon-assist').click();await page.waitForTimeout(6000);
  const levelled=await read(),result=orientation(levelled);
  assert.ok(result.error<.02,'atmospheric flight levels to the local horizon');
  assert.ok(result.forward.distanceTo(original.forward)<1e-8,'levelling does not steer aim');
  assert.ok(Math.hypot(...banked.travel.position.map((v,i)=>v-levelled.travel.position[i]))<.01,'levelling does not move the pilot');
  assert.ok(levelled.travel.alignment.strength>.9);await page.screenshot({path:out+'/02-levelled.png'});
  await page.locator('#horizon-assist').click();assert.ok(page.url().includes('horizon=0'));
  await page.reload();await wait(()=>window.__atlas?.ready&&window.__atlas.terrain?.tiles?.ready);assert.equal((await read()).travel.horizonAssist,false,'preference restores');
  await page.locator('#horizon-assist').click();await page.locator('#toggle-flight').click();
  await page.mouse.move(650,430);await page.mouse.down();await page.mouse.move(850,510,{steps:6});await page.mouse.up();
  const space=await read();await page.waitForTimeout(1500);const afterSpace=await read();assert.equal(afterSpace.travel.alignment,null);
  assert.deepEqual(space.travel.heading,afterSpace.travel.heading,'space flight retains bank');
  assert.deepEqual(errors,[]);
  const report={ok:true,base,bankDeg:original.error*180/Math.PI,remainingDeg:result.error*180/Math.PI,alignment:levelled.travel.alignment,errors};await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){await page.screenshot({path:out+'/failure.png'});console.log(JSON.stringify(await read()));console.log(errors);throw error;}
finally{await browser.close();}
