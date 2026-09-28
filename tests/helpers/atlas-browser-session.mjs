/** Persistent, named-command Atlas visual-review session.
 * Run with a PTY, then send one JSON command per line. A failed command saves
 * evidence and leaves the browser open. No arbitrary JavaScript evaluator.
 * Examples: {"op":"load","url":"http://127.0.0.1:5217/?..."}
 * {"op":"aim","pointM":[x,y,z],"heightM":2}
 * {"op":"move","key":"s","ms":1200}, {"op":"snapshot","name":"side"}
 * {"op":"advance","ms":1000}, {"op":"close"}
 */
import {chromium} from 'playwright';
import * as THREE from 'three';
import {createInterface} from 'node:readline';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {browserArgs} from '../browser-options.mjs';

const output=resolve(process.env.ATLAS_RESULTS||'test-results/interactive-visual-review');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:browserArgs});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',error=>errors.push(String(error)));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
// Freeze exploration when the app installs its diagnostic API, before its
// first RAF can advance a saved epoch. The hook is restored immediately.
await page.addInitScript(()=>{
  const define=Object.defineProperty;
  Object.defineProperty=function(target,key,descriptor){
    const result=Reflect.apply(define,Object,[target,key,descriptor]);
    if(target===window&&key==='__atlas'&&descriptor?.value?.setExplorationPaused){
      descriptor.value.setExplorationPaused(true);Object.defineProperty=define;
    }
    return result;
  };
});

const finitePoint=point=>Array.isArray(point)&&point.length===3&&point.every(Number.isFinite);
const duration=ms=>{if(!Number.isFinite(ms)||ms<0||ms>10000)throw Error('ms must be between 0 and 10000');return ms;};
const state=()=>page.evaluate(()=>{
  const a=window.__atlas;if(!a)return {url:location.href,ready:false};
  const t=a.travel,tiles=a.terrain?.tiles,body=a.state?.body;
  return {url:location.href,ready:a.ready,date:a.date?.offsetNs,level:a.state?.level,
    body:body?{id:body.id,radiusM:body.radiusM,centerM:t?.bodies?.find(x=>x.id===body.id)?.positionM}:null,
    camera:{...a.camera,positionM:t?.position,heading:t?.heading},walking:t?.walking,
    surface:t?.surface,tiles,river:a.river,drainage:a.drainage};
});
function summary(s,targetId){
  const fauna=s.tiles?.faunaDrawn??[];
  return {ready:s.ready,date:s.date,body:s.body?.id,grounded:s.walking?.grounded,
    surfaceReady:s.tiles?.surfaceReady,contact:s.tiles?.contactReadiness,
    fauna:fauna.length,nearRigs:s.tiles?.faunaNear,lifePending:s.tiles?.lifePending,
    faunaTerrainPending:s.tiles?.faunaTerrainPending,
    target:targetId?fauna.find(x=>x.id===targetId)??null:undefined,errors:[...errors]};
}
async function snapshot(name,hideUI=false,targetId){
  if(typeof name!=='string'||!name||!/^[-a-zA-Z0-9_]+$/.test(name))throw Error('Use a simple snapshot name');
  const s=await state();
  // Save diagnostics before any cosmetic operation or screenshot can fail.
  await writeFile(join(output,`${name}.json`),JSON.stringify({state:s,errors},null,2));
  let style;
  try{
    if(hideUI)style=await page.addStyleTag({content:'body * { visibility: hidden !important; } #viewport canvas { visibility: visible !important; }'});
    await page.screenshot({path:join(output,`${name}.png`)});
  }finally{if(style)await style.evaluate(node=>node.remove()).catch(()=>{});}
  return {files:[`${name}.json`,`${name}.png`],...summary(s,targetId)};
}
async function dragAxis(pixels,axis){
  let remaining=pixels;
  while(Math.abs(remaining)>.1){
    const step=Math.sign(remaining)*Math.min(60,Math.abs(remaining));
    const start=await page.evaluate(({step,axis})=>{
      const canvas=document.querySelector('#viewport canvas');
      if(!canvas)throw Error('Atlas canvas not found');
      const rect=canvas.getBoundingClientRect();
      for(const fx of [.5,.35,.65,.2])for(const fy of [.5,.35,.65]){
        const x=rect.x+rect.width*fx,y=rect.y+rect.height*fy;
        if(document.elementFromPoint(x,y)===canvas&&document.elementFromPoint(x+(axis==='x'?step:0),y+(axis==='y'?step:0))===canvas)return {x,y};
      }
      throw Error('No unobstructed canvas drag path; collapse the panel first');
    },{step,axis});
    await page.mouse.move(start.x,start.y);
    await page.mouse.down();
    try{await page.mouse.move(start.x+(axis==='x'?step:0),start.y+(axis==='y'?step:0));}
    finally{await page.mouse.up();}
    remaining-=step;
  }
}
function projection(s,pointM,heightM){
  if(!s.body?.centerM||!s.camera?.positionM||!s.camera?.heading)throw Error('A planetary camera pose is required');
  const target=new THREE.Vector3(...pointM);
  target.addScaledVector(target.clone().normalize(),heightM).add(new THREE.Vector3(...s.body.centerM));
  const local=target.sub(new THREE.Vector3(...s.camera.positionM)).applyQuaternion(new THREE.Quaternion(...s.camera.heading).invert());
  const depthM=-local.z,tan=Math.tan(s.camera.fov*Math.PI/360);
  return {depthM,yaw:Math.atan2(local.x,-local.z),pitch:Math.atan2(local.y,Math.hypot(local.x,local.z)),
    ndc:[local.x/(depthM*tan*1.44),local.y/(depthM*tan)]};
}
async function command(c){
  switch(c.op){
    case 'load':{
      const url=new URL(c.url);if(!['http:','https:'].includes(url.protocol))throw Error('Only HTTP(S) Atlas URLs');
      await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:60000});
      await page.waitForFunction(()=>window.__atlas?.ready,null,{timeout:180000});
      return summary(await state(),c.targetId);
    }
    case 'wait':{
      if(c.for==='grounded')await page.waitForFunction(()=>window.__atlas?.travel?.walking?.grounded,null,{timeout:180000});
      else if(c.for==='life')await page.waitForFunction(()=>{const t=window.__atlas?.terrain?.tiles;return t&&t.lifePending===0&&t.faunaTerrainPending===0;},null,{timeout:180000});
      else await page.waitForTimeout(duration(c.ms??500));
      return summary(await state(),c.targetId);
    }
    case 'state':return summary(await state(),c.targetId);
    case 'snapshot':return snapshot(c.name,!!c.hideUI,c.targetId);
    case 'click':await page.locator(c.selector).click({timeout:3000});return summary(await state(),c.targetId);
    case 'freeze':await page.evaluate(value=>window.__atlas.setExplorationPaused(value),c.value!==false);return summary(await state(),c.targetId);
    case 'advance':{
      const ms=duration(c.ms);await page.evaluate(()=>window.__atlas.setExplorationPaused(false));
      try{await page.waitForTimeout(ms);}finally{await page.evaluate(()=>window.__atlas.setExplorationPaused(true));}
      return summary(await state(),c.targetId);
    }
    case 'move':{
      if(!['w','a','s','d','q','e','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(c.key))throw Error('Unsupported movement key');
      const ms=duration(c.ms);await page.keyboard.down(c.key);
      try{await page.waitForTimeout(ms);}finally{await page.keyboard.up(c.key);}
      return summary(await state(),c.targetId);
    }
    case 'aim':{
      if(!finitePoint(c.pointM)||!Number.isFinite(c.heightM??0))throw Error('Expected finite body-local pointM and heightM');
      // Sequential camera-local rotations: positive dx turns toward +local X;
      // negative dy looks upward. Split drags stay on unobstructed canvas.
      const before=projection(await state(),c.pointM,c.heightM??0);
      await dragAxis(before.yaw/.003,'x');
      const afterYaw=projection(await state(),c.pointM,c.heightM??0);
      await dragAxis(-afterYaw.pitch/.003,'y');await page.waitForTimeout(100);
      return {before,after:projection(await state(),c.pointM,c.heightM??0),...summary(await state(),c.targetId)};
    }
    case 'close':await browser.close();return {closed:true};
    default:throw Error('Unknown named operation');
  }
}
const input=createInterface({input:process.stdin,crlfDelay:Infinity});
console.log(JSON.stringify({ready:true,pid:process.pid,output,hardware:!!process.env.ATLAS_HARDWARE}));
let sequence=0;
try{
  for await(const line of input){
    if(!line.trim())continue;
    let c;
    try{c=JSON.parse(line);const result=await command(c);console.log(JSON.stringify({sequence:++sequence,op:c.op,result}));if(c.op==='close')break;}
    catch(error){
      const name=`command-error-${++sequence}`;
      await snapshot(name).catch(()=>{});
      console.log(JSON.stringify({sequence,op:c?.op,error:String(error),evidence:name,browserRemainsOpen:browser.isConnected()}));
    }
  }
}finally{input.close();await browser.close();}
