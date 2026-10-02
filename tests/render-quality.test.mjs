import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {RENDER_QUALITY,DEFAULT_RENDER_QUALITY,renderQualityName,renderQualityMode,AdaptiveRenderQuality}=await vite.ssrLoadModule('/src/render-quality.ts');
const {CLOUD_QUALITY,VolumetricClouds}=await vite.ssrLoadModule('/src/volumetric-clouds.ts');
after(()=>vite.close());

test('high is the existing desktop rendering and the default',()=>{
  assert.equal(DEFAULT_RENDER_QUALITY,'high');
  assert.deepEqual({...RENDER_QUALITY.high.clouds},{...CLOUD_QUALITY.desktop});
  assert.equal(RENDER_QUALITY.high.sceneScale,1);
  assert.ok(Object.isFrozen(RENDER_QUALITY)&&Object.isFrozen(RENDER_QUALITY.high)&&Object.isFrozen(RENDER_QUALITY.floor.clouds));
});

test('floor is the documented 3060-class 1440p profile and strictly cheaper',()=>{
  const {floor,high}=RENDER_QUALITY;
  assert.equal(floor.clouds.resolution,.5);assert.equal(floor.clouds.steps,40);
  assert.equal(floor.sceneScale,.75);
  assert.ok(floor.clouds.steps<high.clouds.steps&&floor.clouds.lightSteps<=high.clouds.lightSteps&&floor.clouds.resolution<high.clouds.resolution);
  // Still at least the immersive cloud budget: the floor profile is a desktop profile.
  assert.ok(floor.clouds.steps>=CLOUD_QUALITY.immersive.steps&&floor.clouds.resolution>=CLOUD_QUALITY.immersive.resolution);
});

test('URL parsing only accepts known names and falls back to high',()=>{
  assert.equal(renderQualityName('floor'),'floor');assert.equal(renderQualityName('high'),'high');
  for(const v of [null,undefined,'','FLOOR','low','ultra','__proto__'])assert.equal(renderQualityName(v),'high');
});

test('clouds default to the high desktop profile and expose the applied profile',()=>{
  const clouds=new VolumetricClouds({hasAtmosphere:true,hasOcean:true,gasGiant:false,temperatureK:288,radiusM:6.4e6,spinPeriodS:86400});
  assert.deepEqual({...clouds.desktopQuality},{...CLOUD_QUALITY.desktop});assert.equal(clouds.sceneScale,1);
  clouds.desktopQuality=RENDER_QUALITY.floor.clouds;clouds.sceneScale=RENDER_QUALITY.floor.sceneScale;
  const d=clouds.diagnostics();
  assert.deepEqual(d.desktopQuality,{...RENDER_QUALITY.floor.clouds});assert.equal(d.sceneScale,.75);
  clouds.dispose?.();
});

/** CPU mirror of the resolve's 5-tap Catmull-Rom (bilinear taps, corners dropped). */
function bilinear(img,w,h,u,v){
  const x=Math.min(w-1,Math.max(0,u*w-.5)),y=Math.min(h-1,Math.max(0,v*h-.5));
  const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(w-1,x0+1),y1=Math.min(h-1,y0+1),fx=x-x0,fy=y-y0;
  const at=(i,j)=>img[j*w+i];
  return (at(x0,y0)*(1-fx)+at(x1,y0)*fx)*(1-fy)+(at(x0,y1)*(1-fx)+at(x1,y1)*fx)*fy;
}
function catmull(img,w,h,u,v){
  const px=u*w,py=v*h,cx=Math.floor(px-.5)+.5,cy=Math.floor(py-.5)+.5,fx=px-cx,fy=py-cy;
  const W=f=>[f*(-.5+f*(1-.5*f)),1+f*f*(-2.5+1.5*f),f*(.5+f*(2-1.5*f)),f*f*(-.5+.5*f)];
  const [ax0,ax1,ax2,ax3]=W(fx),[ay0,ay1,ay2,ay3]=W(fy);
  const ax12=ax1+ax2,ay12=ay1+ay2;
  const t0x=(cx-1)/w,t0y=(cy-1)/h,t3x=(cx+2)/w,t3y=(cy+2)/h,t12x=(cx+ax2/ax12)/w,t12y=(cy+ay2/ay12)/h;
  const s=(a,b)=>bilinear(img,w,h,a,b);
  const c=s(t12x,t0y)*ax12*ay0+s(t0x,t12y)*ax0*ay12+s(t12x,t12y)*ax12*ay12+s(t3x,t12y)*ax3*ay12+s(t12x,t3y)*ax12*ay3;
  return Math.max(0,c/(ax12*ay0+ax0*ay12+ax12*ay12+ax3*ay12+ax12*ay3));
}

test('scene upscale filter reproduces texel centres, constants and smooth gradients',()=>{
  const w=16,h=12,img=new Float64Array(w*h);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++)img[j*w+i]=2+Math.sin(i*.4)*.5+j*.1;
  for(let j=2;j<h-2;j++)for(let i=2;i<w-2;i++)assert.ok(Math.abs(catmull(img,w,h,(i+.5)/w,(j+.5)/h)-img[j*w+i])<1e-9);
  const flat=new Float64Array(w*h).fill(3.25);
  for(let k=0;k<50;k++)assert.ok(Math.abs(catmull(flat,w,h,.2+k*.012,.7-k*.009)-3.25)<1e-9);
  // Upscaling a smooth field by 1/0.75 stays close to the analytic value.
  let worst=0;
  for(let k=0;k<200;k++){
    const u=.2+.6*(k/199),v=.3+.4*((k*37)%199)/199,x=u*w-.5,y=v*h-.5;
    worst=Math.max(worst,Math.abs(catmull(img,w,h,u,v)-(2+Math.sin(x*.4)*.5+y*.1)));
  }
  assert.ok(worst<.01,`worst ${worst}`);
});

test('auto is opt-in and only chosen by its exact name',()=>{
  assert.equal(renderQualityMode('auto'),'auto');assert.equal(renderQualityMode(null),'high');assert.equal(renderQualityMode('floor'),'floor');
  assert.equal(renderQualityName('auto'),'high');
});

test('adaptive profile drops after a sustained overload and recovers with hysteresis',()=>{
  const a=new AdaptiveRenderQuality(1000/60,1000);
  let t=0;const run=(ms,seconds)=>{let out;for(const end=t+seconds*1000;t<end;t+=ms)out=a.sample(ms,t);return out;};
  assert.equal(run(10,3),'high');
  // Brief spikes and stalls never switch.
  assert.equal(run(22,.5),'high');assert.equal(run(10,2),'high');
  for(let i=0;i<20;i++)a.sample(400,t+=400);assert.equal(a.current,'high');
  assert.equal(run(22,2),'floor');assert.equal(a.switches,1);
  // Between 65% and 95% of budget it holds whichever profile it has.
  assert.equal(run(13,3),'floor');
  assert.equal(run(9,2),'high');assert.equal(a.switches,2);
  assert.equal(run(13,3),'high');
  a.reset();assert.equal(a.current,'high');
});
