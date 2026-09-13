import {chromium} from 'playwright';
import * as THREE from 'three';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {buildDrainage} from '../src/drainage.ts';
import {buildRiverRegion} from '../src/river-generation.ts';
import {surfaceQuery} from '../src/world-surface.ts';
import {browserArgs} from './browser-options.mjs';

const out=process.env.ATLAS_RESULTS||'test-results/shore-stability',base=process.env.ATLAS_URL||'http://127.0.0.1:5186/';
await mkdir(out,{recursive:true});
const body=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];
const kind=process.env.ATLAS_SHORE_KIND||'lake-shore';let site;
if(kind==='ocean'){
 const query=surfaceQuery(body),axis=t=>[Math.cos(t),.2,Math.sin(t)].map(v=>v/Math.sqrt(1.04));let land,wet;
 for(let i=0;i<128;i++){const a=axis(i*Math.PI/64),b=axis((i+1)*Math.PI/64);if(!query(a).wet&&query(b).wet){land=a;wet=b;break;}}
 assert.ok(land&&wet,'ocean fixture brackets an actual coastline');
 for(let i=0;i<42;i++){const mid=new THREE.Vector3(...land).add(new THREE.Vector3(...wet)).normalize().toArray();if(query(mid).groundHeightM>.1)land=mid;else wet=mid;}
 const up=new THREE.Vector3(...land),toward=new THREE.Vector3(...wet).projectOnPlane(up).normalize();
 site={direction:land,lookDirection:up.clone().addScaledVector(toward,200/body.radiusM).normalize().toArray()};
}else{body.hydrology=buildRiverRegion(body,buildDrainage(body).catchments.find(c=>c.outlet===23165));site=body.hydrology.sites.find(s=>s.kind===kind);}
const sample=surfaceQuery(body);
const position=new THREE.Vector3(...site.direction).multiplyScalar(body.radiusM+sample(site.direction).visibleHeightM+2);
const target=new THREE.Vector3(...site.lookDirection).multiplyScalar(body.radiusM+sample(site.lookDirection).visibleHeightM);
const heading=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(position,target,new THREE.Vector3(...site.direction)));
const query=new URLSearchParams({seed:'LETHRA-001',g:'G001',system:'G001/C2128,0,1/0',body:body.id,walk:position.toArray().join(','),heading:heading.toArray().join(',')});
if(body.hydrology)query.set('river',body.hydrology.parentCatchmentId);
const browser=await chromium.launch({headless:true,args:browserArgs});
const context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1440,height:1000}}});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
// Browser-only GL diagnostics work on both baseline and replacement, and never
// ship in the app. Freeze known animation uniforms and classify actual draws.
await page.addInitScript(()=>{
 const state=window.__shoreAudit={mode:'all',flat:false,freezeWater:false,freezeMorph:false,capture:null,reflectionFramebuffer:null};
 const proto=WebGL2RenderingContext.prototype,sources=new WeakMap(),attached=new WeakMap(),programs=new WeakMap(),uniforms=new WeakMap(),lastValues=new WeakMap();let current=null,draws=0,lastGL=null;
 const shaderSource=proto.shaderSource;proto.shaderSource=function(shader,source){
  const kind=source.includes('uniform sampler2D groundAtlas')?'ground':source.includes('waterCoordV')||source.includes('oceanWater')?'water':null;
  if(kind&&source.includes('gl_FragColor')){
   source=source.replace(/void main\s*\(\s*\)/,'uniform int shoreAuditView;\nvoid main()').replace(/}\s*$/,`if(shoreAuditView==1)gl_FragColor=vec4(${kind==='ground'?'0.5,0.45,0.3':'0.1,0.35,0.8'},1.0);\nif(shoreAuditView==2)gl_FragColor=vec4(vec3(gl_FragDepth),1.0);\n}`);
  }sources.set(shader,kind);return shaderSource.call(this,shader,source);
 };
 const attach=proto.attachShader;proto.attachShader=function(p,s){if(sources.get(s))attached.set(p,sources.get(s));return attach.call(this,p,s);};
 const link=proto.linkProgram;proto.linkProgram=function(p){link.call(this,p);if(attached.has(p))programs.set(p,{kind:attached.get(p),view:this.getUniformLocation(p,'shoreAuditView')});};
 const use=proto.useProgram;proto.useProgram=function(p){current=p;lastGL=this;return use.call(this,p);};
 const viewport=proto.viewport;proto.viewport=function(x,y,w,h){if(w===256&&h===256){const fb=this.getParameter(this.FRAMEBUFFER_BINDING);if(fb)state.reflectionFramebuffer=fb;}return viewport.call(this,x,y,w,h);};
 window.__shoreReflectionPNG=()=>{const gl=lastGL,fb=state.reflectionFramebuffer;if(!gl||!fb)return null;const old=gl.getParameter(gl.READ_FRAMEBUFFER_BINDING),pixels=new Uint8Array(256*256*4);try{gl.bindFramebuffer(gl.READ_FRAMEBUFFER,fb);gl.readPixels(0,0,256,256,gl.RGBA,gl.UNSIGNED_BYTE,pixels);}finally{gl.bindFramebuffer(gl.READ_FRAMEBUFFER,old);}const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d'),data=ctx.createImageData(256,256);for(let y=0;y<256;y++)for(let x=0;x<256;x++){const a=(y*256+x)*4,b=((255-y)*256+x)*4;for(let c=0;c<3;c++){const v=pixels[a+c]/255;data.data[b+c]=Math.round(255*(v<=.0031308?v*12.92:1.055*Math.pow(v,1/2.4)-.055));}data.data[b+3]=255;}ctx.putImageData(data,0,0);return canvas.toDataURL();};
 const get=proto.getUniformLocation;proto.getUniformLocation=function(p,n){const l=get.call(this,p,n);if(l)uniforms.set(l,n);return l;};
 const uf=proto.uniform1f;proto.uniform1f=function(l,v){const n=uniforms.get(l);if(state.freezeWater&&(n==='waterTime'||n==='oceanTime'))v=0;if(state.freezeMorph&&n==='patchMorph')v=lastValues.get(l)??v;else if(l)lastValues.set(l,v);return uf.call(this,l,v);};
 for(const name of ['drawElements','drawElementsInstanced','drawArrays','drawArraysInstanced']){const original=proto[name];proto[name]=function(...args){const p=programs.get(current),kind=p?.kind,mode=state.mode;
  if(mode==='ground'&&kind!=='ground'||mode==='water'&&kind!=='water'||mode==='coverage'&&!kind||mode==='skirts'&&kind!=='ground')return;
  if(mode==='skirts'){if(name!=='drawElements'||args[1]<=6144)return;args[3]+=6144*(args[2]===this.UNSIGNED_INT?4:2);args[1]-=6144;}
  if(p?.view)this.uniform1i(p.view,mode==='depth'?2:state.flat||mode==='coverage'||mode==='skirts'?1:0);
  draws++;return original.apply(this,args);
 };}
 const clearColor=proto.clearColor,clear=proto.clear;let background=[0,0,0,1];
 proto.clearColor=function(...rgba){background=rgba;return clearColor.apply(this,rgba);};
 proto.clear=function(mask){clearColor.apply(this,state.mode==='coverage'?[1,0,1,1]:background);return clear.call(this,mask);};
 const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>raf(t=>{const before=draws;fn(t);const c=state.capture;if(c&&draws>before&&lastGL){const gl=lastGL,[x,top,w,h]=c.roi,pixels=new Uint8Array(w*h*4);gl.readPixels(x,gl.drawingBufferHeight-top-h,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let changed=0,max=0,magenta=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i]>245&&pixels[i+1]<10&&pixels[i+2]>245)magenta++;if(c.previous){const d=Math.max(Math.abs(pixels[i]-c.previous[i]),Math.abs(pixels[i+1]-c.previous[i+1]),Math.abs(pixels[i+2]-c.previous[i+2]));if(d>2)changed++;max=Math.max(max,d);}}
   c.rows.push({changedPixels:changed,maxChannelDelta:max,backgroundPixels:magenta,camera:window.__atlas?.camera,walking:window.__atlas?.travel.walking,terrain:window.__atlas?.terrain?.tiles});c.previous=pixels;if(c.rows.length===c.count){state.capture=null;c.resolve(c.rows);}
  }});
 window.__shoreFrames=(count=120,roi=[560,740,500,180])=>new Promise(resolve=>{state.capture={count,roi,rows:[],previous:null,resolve};});
});
const debug=options=>page.evaluate(options=>Object.assign(window.__shoreAudit,options),options);
const snapshot=()=>page.evaluate(()=>({url:location.href,terrain:window.__atlas?.terrain?.tiles,walk:window.__atlas?.travel.walking}));
try{
 const started=Date.now();await page.goto(base+'?'+query);
 await page.waitForFunction(()=>window.__atlas?.travel.walking?.grounded&&!window.__atlas.travel.walking.waiting,undefined,{timeout:240000});
 const landingMs=Date.now()-started;console.log('shore: landed '+landingMs+'ms');await page.waitForTimeout(8000);
 await page.screenshot({path:out+'/01-shore.png'});
 const reflectionPNG=await page.evaluate(()=>window.__shoreReflectionPNG());if(reflectionPNG)await writeFile(out+'/reflection-target.png',Buffer.from(reflectionPNG.split(',')[1],'base64'));
 // Preserve the last ordinary lake reflection before GL draw-isolation modes
 // hide terrain. Diagnostic-only captures must never replace its cached image.
 await page.evaluate(()=>window.__atlas?.shoreDebug?.({freezeWater:true}));
 for(const mode of ['ground','water','skirts','depth','coverage']){await debug({mode,flat:true});await page.waitForTimeout(150);await page.screenshot({path:out+'/debug-'+mode+'.png'});}
 const coverage=await page.evaluate(()=>window.__shoreFrames(2));
 await debug({mode:'all',flat:false,freezeWater:true,freezeMorph:true});
 await page.evaluate(()=>window.__atlas?.shoreDebug?.({freezeSelection:true,freezeMorph:true,freezeWater:true}));
 await page.waitForTimeout(300);
 const frames=await page.evaluate(()=>window.__shoreFrames(120));console.log('shore: static max changed '+Math.max(...frames.map(f=>f.changedPixels)));
 await writeFile(out+'/static-frames.json',JSON.stringify(frames,null,2));
 const isolated={};for(const mode of ['ground','water']){await debug({mode,flat:true});await page.waitForTimeout(300);isolated[mode]=await page.evaluate(()=>window.__shoreFrames(120));}await writeFile(out+'/isolated-frames.json',JSON.stringify(isolated,null,2));await debug({mode:'all',flat:false});
 await debug({freezeMorph:false,freezeWater:false});await page.evaluate(()=>window.__atlas?.shoreDebug?.({freezeSelection:false,freezeMorph:false,freezeWater:false}));
 const start=await snapshot();await page.keyboard.down('d');await page.waitForFunction(n=>window.__atlas.travel.walking.travelledM>=n+10,start.walk.travelledM,{timeout:45000});await page.keyboard.up('d');
 await page.screenshot({path:out+'/02-walk.png'});
 await page.mouse.move(700,500);await page.mouse.down();await page.mouse.move(810,510,{steps:90});await page.mouse.up();await page.waitForTimeout(1500);await page.screenshot({path:out+'/03-pan.png'});
 let rebase=null;
 if(process.env.ATLAS_SHORE_LONG){
   await page.keyboard.down('w');await page.waitForTimeout(3500);await page.keyboard.up('w');await page.screenshot({path:out+'/04-boundary.png'});
   const before=await snapshot();await page.keyboard.down('Shift');await page.keyboard.down('s');
   await page.waitForFunction(n=>window.__atlas.travel.walking.travelledM>=n+90,before.walk.travelledM,{timeout:150000});
   await page.keyboard.up('s');await page.keyboard.up('Shift');await page.waitForTimeout(1000);
   const after=await snapshot();rebase={before,after};assert.ok(Math.hypot(...after.walk.originM.map((v,i)=>v-before.walk.originM[i]))>60,'motion recording crosses physics origin');
   await page.screenshot({path:out+'/05-rebased.png'});
 }
 if(process.env.ATLAS_SHORE_INLAND){
   // Turn from the water toward the ground cover without changing the saved
   // landing fixture; these views expose crown shape and human-scale plants.
   for(let i=0;i<3;i++){await page.mouse.move(600,500);await page.mouse.down();await page.mouse.move(950,500,{steps:45});await page.mouse.up();}
   await page.waitForTimeout(1200);await page.screenshot({path:out+'/06-inland.png'});
   await page.mouse.move(600,450);await page.mouse.down();await page.mouse.move(600,570,{steps:45});await page.mouse.up();
   await page.waitForTimeout(500);await page.screenshot({path:out+'/07-ground-cover.png'});
 }
 assert.deepEqual(errors,[]);
 const report={ok:true,base,kind,landingMs,roi:[560,740,500,180],toleranceChannel:2,staticMaximumChangedPixels:Math.max(...frames.slice(1).map(f=>f.changedPixels)),staticFrames:frames,coverageFrames:coverage,start,end:await snapshot(),rebase,errors};
 await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log('shore: review complete');
 if(process.env.ATLAS_SHORE_ASSERT){assert.equal(report.staticMaximumChangedPixels,0,'frozen shore pixels must remain stable');assert.equal(Math.max(...coverage.map(f=>f.backgroundPixels)),0,'shore ROI must have full ground/water coverage');}
}catch(e){await writeFile(out+'/failure.json',JSON.stringify({error:String(e),state:await snapshot(),errors},null,2));await page.screenshot({path:out+'/failure.png'});throw e;}
finally{await context.close();await browser.close();}
