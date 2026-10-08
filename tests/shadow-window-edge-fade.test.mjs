// Shadow-window edge fade (audit F4, docs/transition-audit-2026-10-07.md;
// docs/terrain-morph-continuity-2026-10.md). Rendering only, shader-side.
//
// The surface shadow is one orthographic window of +-160 m centred under the
// eye. three.js leaves a fragment outside it unshadowed, so shadows ended on a
// hard straight line that moved with the eye. Under presentationContinuity the
// receiver's getShadow multiplies the shadow intensity by a weight that is
// exactly 0 at the window edge and exactly 1 inside the inner +-124 m.
// Checks: the weight for a pose sweep of real SurfaceLighting frusta (units,
// rebased origins, low and polar suns), the GLSL constant, the patched chunk,
// and the option gate. Negatives: three's own chunk (no fade) and a constant
// weight both fail the edge check.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SurfaceLighting,SURFACE_SHADOW,SHADOW_WINDOW_FADE,SHADOW_WINDOW_FADE_GLSL,shadowWindowFadeWeight,fadedShadowChunk} from '../src/surface-lighting.ts';
import {rendererModule,createRenderer,maithea} from './terrain-renderer-fixture.mjs';

const HALF=SURFACE_SHADOW.widthM/2,INNER=HALF-SHADOW_WINDOW_FADE.fadeM;
const ORIGINAL=THREE.ShaderChunk.shadowmap_pars_fragment;

function frameFor(unit,offset,sun,altitudeM=10){
  const radiusM=6000000,planet=new THREE.Group();planet.scale.setScalar(radiusM*unit);planet.position.copy(offset);planet.updateMatrixWorld();
  const light=new THREE.DirectionalLight('#ffecd0',3),lighting=new SurfaceLighting(light,new THREE.AmbientLight('#91b3cc',.22));
  const up=new THREE.Vector3(.3,1,-.2).normalize();
  const frame={planet,radiusM,eye:up.clone().multiplyScalar((radiusM+altitudeM)*unit).add(offset),sun:sun.clone().normalize(),altitudeM,atmosphere:true,enabled:true,immersive:false};
  return {light,lighting,frame,unit};
}
/** Shadow coordinate (three's shadow matrix: world -> 0..1) of a point given in
 * shadow-camera metres (x right, y up, z = depth in front of the light). */
function coordAt(light,unit,xM,yM,zM){
  const camera=light.shadow.camera,p=new THREE.Vector3(xM*unit,yM*unit,-zM*unit).applyMatrix4(camera.matrixWorld);
  const c=new THREE.Vector4(p.x,p.y,p.z,1).applyMatrix4(light.shadow.matrix);
  return [c.x/c.w,c.y/c.w];
}
/** The pose sweep: renderer units, rebased origins, sun elevations down to 3 deg and the |sun.y|>.98 axis switch. */
function poses(){
  const out=[];
  for(const unit of [1e-6,.01,1,10])for(const offset of [new THREE.Vector3(),new THREE.Vector3(32120,-6100300,92652).multiplyScalar(unit)])
    for(const sun of [new THREE.Vector3(.2,1,.3),new THREE.Vector3(1,.18,0),new THREE.Vector3(.3,.12,1),new THREE.Vector3(.01,1,.02),new THREE.Vector3(-1,.05,-.4)])
      out.push(frameFor(unit,offset,sun));
  return out;
}

/** Runs the edge checks with `weight(x,y)` as the receiver fade; returns the failures. */
function edgeFailures(weight){
  const failures=[];let checked=0;
  for(const {light,lighting,frame,unit} of poses()){
    if(!lighting.update(frame))continue;
    const camera=light.shadow.camera;
    assert.ok(Math.abs((camera.right-camera.left)/unit-SURFACE_SHADOW.widthM)<1e-6);
    for(const zM of [1,SURFACE_SHADOW.depthM*.5,SURFACE_SHADOW.depthM-1])for(let s=-HALF;s<=HALF;s+=20){
      for(const [x,y] of [[-HALF,s],[HALF,s],[s,-HALF],[s,HALF]]){
        const [u,v]=coordAt(light,unit,x,y,zM);checked++;
        // The frustum edge is the window edge in shadow coordinates (float roundoff only).
        if(!(Math.min(u,1-u,v,1-v)>-1e-9&&Math.min(Math.abs(u),Math.abs(1-u),Math.abs(v),Math.abs(1-v))<1e-9)){failures.push({kind:'edge-coordinate',u,v});continue;}
        if(!(weight(u,v)<=1e-12))failures.push({kind:'edge',x,y,u,v,w:weight(u,v)});
      }
      // Exactly 1 inside the inner +-124 m; monotone from the edge inward.
      for(const [x,y] of [[0,0],[INNER,s*INNER/HALF],[-INNER,0],[s*INNER/HALF,-INNER]]){
        const [u,v]=coordAt(light,unit,x,y,zM);if(Math.abs(weight(u,v)-1)>1e-9)failures.push({kind:'inner',x,y,w:weight(u,v)});
      }
      let last=-1;
      for(let m=0;m<=SHADOW_WINDOW_FADE.fadeM+4;m+=2){
        const [u,v]=coordAt(light,unit,HALF-m,s*.5,zM),w=weight(u,v);
        if(w<last-1e-12)failures.push({kind:'monotone',m,w,last});last=w;
      }
    }
  }
  assert.ok(checked>1000,`edge points checked: ${checked}`);
  return failures;
}

test('the fade weight is exactly 0 at the frustum edge for a pose sweep (negative: no fade)',()=>{
  assert.equal(shadowWindowFadeWeight(0,.5),0);assert.equal(shadowWindowFadeWeight(1,.5),0);
  assert.equal(shadowWindowFadeWeight(.5,0),0);assert.equal(shadowWindowFadeWeight(.5,1),0);
  assert.equal(shadowWindowFadeWeight(.5,.5),1);
  const failures=edgeFailures(shadowWindowFadeWeight);
  assert.equal(failures.length,0,JSON.stringify(failures.slice(0,4)));
  // Negative: the former receiver (three's unpatched getShadow) applies the full intensity everywhere.
  const former=edgeFailures(()=>1);
  assert.ok(former.some(f=>f.kind==='edge'),'a constant weight leaves the hard edge');
});

test('the fade band is the outer 22.5 % of the +-160 m half-width and the GLSL uses the CPU constant',()=>{
  assert.equal(SHADOW_WINDOW_FADE.fadeM,36);assert.equal(SHADOW_WINDOW_FADE.fraction,.225);
  assert.ok(SHADOW_WINDOW_FADE.fraction>=.2&&SHADOW_WINDOW_FADE.fraction<=.25);
  const band=Number(/smoothstep\( 0\.0, ([0-9.]+), d \)/.exec(SHADOW_WINDOW_FADE_GLSL)?.[1]);
  assert.equal(band,Number((36/320).toFixed(6)));
  // GLSL transliteration on a grid equals the CPU mirror.
  const smooth=(e0,e1,x)=>{const t=Math.min(1,Math.max(0,(x-e0)/(e1-e0)));return t*t*(3-2*t);};
  for(let x=0;x<=1;x+=1/64)for(let y=0;y<=1;y+=1/64){
    const d=Math.min(Math.min(x,1-x),Math.min(y,1-y));
    assert.equal(shadowWindowFadeWeight(x,y),smooth(0,band,d));
  }
});

test('the patched chunk fades getShadow only and is idempotent (negative: three\'s own chunk)',()=>{
  const patched=fadedShadowChunk(ORIGINAL);
  const getShadow=src=>{const a=src.indexOf('float getShadow(');return src.slice(a,src.indexOf('float getPointShadow(',a));};
  const fades=src=>/return mix\( 1\.0, shadow, shadowIntensity \* atlasShadowWindowFade\( shadowCoord\.xy \) \);/.test(getShadow(src));
  assert.ok(fades(patched));
  assert.ok(patched.includes(SHADOW_WINDOW_FADE_GLSL));
  assert.equal(patched.split('atlasShadowWindowFade(').length-1,2,'one definition, one call');
  // getPointShadow keeps its own return.
  const point=patched.slice(patched.indexOf('float getPointShadow('));
  assert.ok(point.includes('return mix( 1.0, shadow, shadowIntensity );'));
  assert.equal(fadedShadowChunk(patched),patched);
  // Negative: three's chunk has no fade (the hard edge this replaces).
  assert.equal(fades(ORIGINAL),false);
  assert.throws(()=>fadedShadowChunk('float other(){}'),/getShadow shape changed/);
});

test('PlanetRenderer installs the fade only with presentationContinuity on',async()=>{
  const fixture=await rendererModule({prefix:'atlas-shadow-fade-'});
  try{
    const {module}=fixture,chunk=()=>module.THREE.ShaderChunk.shadowmap_pars_fragment,body=maithea();
    const before=chunk();assert.equal(before.includes('atlasShadowWindowFade'),false);
    const off=createRenderer(module,body,{rendererOptions:{presentationContinuity:false}});off.dispose?.();
    assert.equal(chunk(),before,'option off: three\'s chunk unchanged');
    const on=createRenderer(module,body,{rendererOptions:{presentationContinuity:true}});on.dispose?.();
    assert.equal(chunk(),fadedShadowChunk(before));
  }finally{await fixture.cleanup();}
});
