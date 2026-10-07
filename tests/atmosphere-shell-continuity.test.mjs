// Transition audit F2 (docs/transition-audit-2026-10-07.md): the atmosphere
// shell's inside/outside coefficients are blended across `outer`, not switched.
// The shader text is generated from the same constants as the CPU mirror
// `shellAlpha`, so these checks evaluate the shader's formula.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  createAtmosphereShell,shellAlpha,shellAlphaGlsl,shellBlend,
  ATMOSPHERE_SHELL_BLEND_EPS,ATMOSPHERE_SHELL_EXTINCTION,ATMOSPHERE_SHELL_OPACITY,
} from '../src/sky-atmosphere.ts';

const INNER=1,OUTER=1.0157,H=OUTER-INNER;
const MAX_STEP=.01;
/** The pre-F2 shader formula, verbatim (`length(eye)<outer?..:..`). */
function legacyAlpha(density,day,eyeR,outer){
  const inside=eyeR<outer;
  const opacity=1-Math.exp(-density*(inside?2.5:.14));
  return opacity*(inside?.42*(1-day)+.995*day:.88);
}
/** Column density and day weight for a fixed ray, mirroring the shader's
 * 8-step march (day weight taken as a constant `day`; the LUT is not needed
 * for the alpha path). */
function marchDensity(eye,ray,scaleHeight){
  const b=eye[0]*ray[0]+eye[1]*ray[1]+eye[2]*ray[2],ee=eye[0]**2+eye[1]**2+eye[2]**2;
  const disc=b*b-ee+OUTER*OUTER;if(disc<=0)return 0;
  const start=Math.max(0,-b-Math.sqrt(disc));let finish=-b+Math.sqrt(disc);
  const ground=b*b-ee+INNER*INNER;if(ground>0){const hit=-b-Math.sqrt(ground);if(hit>0)finish=Math.min(finish,hit);}
  const step=Math.max(0,finish-start)/8;let density=0;
  for(let i=0;i<8;i++){const t=start+(i+.5)*step,q=eye.map((e,k)=>e+ray[k]*t),alt=Math.hypot(...q);
    density+=Math.exp(-Math.max(0,alt-INNER)/scaleHeight)*step/scaleHeight;}
  return density;
}
const unit=v=>{const l=Math.hypot(...v);return v.map(x=>x/l);};
/** Fixed rays from an eye on +z at radius r: straight down, oblique, tangent, up. */
const RAYS=[[0,0,-1],unit([1,0,-1]),unit([1,0,-.05]),[1,0,0],unit([1,0,1])];
function columnCases(eyeR){
  return RAYS.map(ray=>marchDensity([0,0,eyeR],ray,H/8));
}
const DENSITIES=[.05,.3,1,3,10];
const DAYS=[0,.5,1];

/** Largest |delta alpha| between neighbouring eye radii across a sweep that
 * brackets `outer`, for fixed densities/day weights and for the fixed rays. */
function worstStep(eps,{span=4*Math.max(eps,.01)*H,steps=4000}={}){
  let worst=0,where=null;
  for(let i=0;i<steps;i++){
    const r0=OUTER-span+2*span*i/steps,r1=OUTER-span+2*span*(i+1)/steps;
    for(const day of DAYS){
      for(const d of DENSITIES){const delta=Math.abs(shellAlpha(d,day,r1,INNER,OUTER,eps)-shellAlpha(d,day,r0,INNER,OUTER,eps));if(delta>worst){worst=delta;where={r0,d,day};}}
      const c0=columnCases(r0),c1=columnCases(r1);
      for(let k=0;k<RAYS.length;k++){const delta=Math.abs(shellAlpha(c1[k],day,r1,INNER,OUTER,eps)-shellAlpha(c0[k],day,r0,INNER,OUTER,eps));if(delta>worst){worst=delta;where={r0,ray:k,day};}}
    }
  }
  return {worst,where};
}
/** |delta alpha| straight across outer: outer - e versus outer + e. */
function acrossOuter(eps,e){
  let worst=0;
  for(const day of DAYS)for(const d of DENSITIES)worst=Math.max(worst,Math.abs(shellAlpha(d,day,OUTER-e,INNER,OUTER,eps)-shellAlpha(d,day,OUTER+e,INNER,OUTER,eps)));
  return worst;
}

test('F2: alpha is continuous across the shell radius: |delta alpha| < .01 at outer +- epsilon and along a radial sweep',()=>{
  assert.ok(ATMOSPHERE_SHELL_BLEND_EPS>=.02&&ATMOSPHERE_SHELL_BLEND_EPS<=.03,'band half-width is 2-3% of the shell thickness');
  for(const e of [1e-9,1e-6*H,1e-5*H])assert.ok(acrossOuter(ATMOSPHERE_SHELL_BLEND_EPS,e)<MAX_STEP,`across outer +- ${e}`);
  const {worst,where}=worstStep(ATMOSPHERE_SHELL_BLEND_EPS);
  assert.ok(worst<MAX_STEP,`largest per-step |delta alpha| ${worst} at ${JSON.stringify(where)}`);
});

test('F2 negative case: the old hard switch (eps = 0) jumps by far more than .01 at outer',()=>{
  const jump=acrossOuter(0,1e-9);
  // The audit's derivation: about .115 -> .91 at D = 1, noon ((1-e^-.14)*.88 and (1-e^-2.5)*.995).
  assert.ok(jump>.7,`hard switch jump ${jump}`);
  assert.ok(Math.abs(shellAlpha(1,1,OUTER-1e-9,INNER,OUTER,0)-(1-Math.exp(-2.5))*.995)<1e-12);
  assert.ok(Math.abs(shellAlpha(1,1,OUTER+1e-9,INNER,OUTER,0)-(1-Math.exp(-.14))*.88)<1e-12);
  assert.ok(worstStep(0).worst>MAX_STEP,'the sweep check catches the step');
  // eps = 0 is exactly the pre-F2 formula on both sides.
  for(const r of [OUTER-1e-6,OUTER+1e-6,INNER+.3*H,OUTER*1.5])for(const d of DENSITIES)for(const day of DAYS)
    assert.equal(shellAlpha(d,day,r,INNER,OUTER,0),legacyAlpha(d,day,r,OUTER));
});

test('F2: outside the blend band the result equals the pre-F2 shell exactly',()=>{
  const half=ATMOSPHERE_SHELL_BLEND_EPS*H;
  for(const r of [INNER,INNER+.5*H,OUTER-half*1.0001,OUTER+half*1.0001,OUTER*2,OUTER*40])
    for(const d of DENSITIES)for(const day of DAYS){
      const a=shellAlpha(d,day,r,INNER,OUTER),b=legacyAlpha(d,day,r,OUTER);
      assert.ok(Math.abs(a-b)<=1e-15,`r=${r} d=${d} day=${day}: ${a} vs ${b}`);
    }
  assert.equal(shellBlend(OUTER-2*half,INNER,OUTER),1);assert.equal(shellBlend(OUTER+2*half,INNER,OUTER),0);
  assert.ok(Math.abs(shellBlend(OUTER,INNER,OUTER)-.5)<1e-9);
  // Monotone: the inside weight never rises as the eye climbs.
  let prev=1;for(let i=0;i<=1000;i++){const w=shellBlend(OUTER-2*half+4*half*i/1000,INNER,OUTER);assert.ok(w<=prev+1e-15);prev=w;}
});

test('F2: the shell shader uses the generated blend and no longer switches on length(eye)<outer',()=>{
  const shell=createAtmosphereShell({radius:INNER,atmosphereHeight:H});
  const source=shell.material.fragmentShader,glsl=shellAlphaGlsl();
  assert.ok(!/length\(eye\)\s*<\s*outer\s*\?/.test(source),'no inside/outside ternary left');
  for(const line of [glsl.blend,glsl.opacity])assert.ok(source.includes(line),`shader has: ${line}`);
  assert.ok(source.includes(`opacity*${glsl.multiplier}`),'alpha multiplier is the blended one');
  // The generated text carries the same constants the CPU mirror uses.
  assert.ok(glsl.blend.includes(String(ATMOSPHERE_SHELL_BLEND_EPS)));
  for(const v of [ATMOSPHERE_SHELL_EXTINCTION.inside,ATMOSPHERE_SHELL_EXTINCTION.outside])assert.ok(glsl.opacity.includes(Number.isInteger(v)?v.toFixed(1):String(v)));
  for(const v of Object.values(ATMOSPHERE_SHELL_OPACITY))assert.ok(glsl.multiplier.includes(String(v)));
  shell.dispose();
});
