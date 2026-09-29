import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {forestFoliageLobeCosine,forestFoliageLobeGLSL,installForestFoliageLobe,FOREST_FOLIAGE_LOBE_EXPONENT} from '../src/forest-foliage-lobe.ts';
import {loadRasterTree} from './helpers/tree-raster.mjs';
import {normalRaster} from './helpers/tree-mip-raster.mjs';

const LOD1_CARD_SCALE={branching:1.3315,spire:2.0357},ALLOMETRY_CARD=.6;
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],unit=a=>{const l=Math.hypot(...a);return a.map(x=>x/l);};

test('the closed form is the expected clamped cosine of a cos^2 normal lobe',()=>{
  const k=FOREST_FOLIAGE_LOBE_EXPONENT,M=240;
  for(const c of [-1,-.6,-.2,0,.3,.7,1]){
    const s=Math.sqrt(1-c*c);let num=0,den=0,mean=0;
    for(let i=0;i<M;i++){const t=(i+.5)/M*Math.PI/2;for(let j=0;j<2*M;j++){const p=(j+.5)/(2*M)*2*Math.PI;
      const w=Math.cos(t)**k*Math.sin(t),nx=Math.sin(t)*Math.cos(p),ny=Math.cos(t);num+=w*Math.max(0,nx*s+ny*c);den+=w;mean+=w*ny;}}
    assert.ok(Math.abs(num/den-forestFoliageLobeCosine(c))<2e-3,`c=${c}: ${num/den} vs ${forestFoliageLobeCosine(c)}`);
    assert.ok(Math.abs(mean/den-.75)<2e-3);
  }
  assert.equal(forestFoliageLobeCosine(-2),0);assert.equal(forestFoliageLobeCosine(3),.75);
  assert.match(forestFoliageLobeGLSL,/0\.1875\*x\*x/);
});

test('on the packaged LOD1 crowns the lobe predicts per-card Lambert where the mean normal does not',async()=>{
  const frame={centerM:[0,8.5,0],halfSizeM:11},N=384,B=9,report={};
  for(const kind of ['branching','spire']){
    const tree=await loadRasterTree(kind,1);let lobeSq=0,meanSq=0,count=0,lobeMax=0,lengthSum=0,lengthCount=0;
    for(const elevation of [10,30]){
      const e=elevation*Math.PI/180,v=unit([Math.cos(e)*.8,Math.sin(e),Math.cos(e)*.6]);
      const r=normalRaster(tree,{direction:v,frame,N,cardScale:LOD1_CARD_SCALE[kind]*ALLOMETRY_CARD});
      const vh=unit([v[0],0,v[2]]),side=[-vh[2],0,vh[0]];
      for(const sun of [20,45,70])for(const azimuth of [0,60,120,180]){
        const se=sun*Math.PI/180,a=azimuth*Math.PI/180;
        const l=unit([Math.cos(se)*(Math.cos(a)*vh[0]+Math.sin(a)*side[0]),Math.sin(se),Math.cos(se)*(Math.cos(a)*vh[2]+Math.sin(a)*side[2])]);
        let near=0,leaves=0,lobe=0,mean=0;
        for(let by=0;by<N;by+=B)for(let bx=0;bx<N;bx+=B){const sum=[0,0,0];let k=0;
          for(let y=by;y<by+B;y++)for(let x=bx;x<bx+B;x++){const o=y*N+x;if(r.kind[o]!==2)continue;
            const n=[r.normal[o*3],r.normal[o*3+1],r.normal[o*3+2]];near+=Math.max(0,dot(n,l));sum[0]+=n[0];sum[1]+=n[1];sum[2]+=n[2];k++;}
          if(!k)continue;const c=dot(unit(sum),l);lobe+=forestFoliageLobeCosine(c)*k;mean+=Math.max(0,c)*k;leaves+=k;
          if(azimuth===0&&sun===20){lengthSum+=Math.hypot(...sum);lengthCount+=k;}}
        near/=leaves;lobe/=leaves;mean/=leaves;
        lobeSq+=(lobe-near)**2;meanSq+=(mean-near)**2;lobeMax=Math.max(lobeMax,Math.abs(lobe-near));count++;
      }
    }
    report[kind]={meanNormalLength:+(lengthSum/lengthCount).toFixed(3),lobeRms:+Math.sqrt(lobeSq/count).toFixed(3),meanNormalRms:+Math.sqrt(meanSq/count).toFixed(3),lobeMax:+lobeMax.toFixed(3)};
    const x=report[kind];
    assert.ok(x.meanNormalLength>.68&&x.meanNormalLength<.82,JSON.stringify(report));
    assert.ok(x.lobeRms<.035&&x.lobeMax<.07,JSON.stringify(report));
    assert.ok(x.meanNormalRms>.1&&x.meanNormalRms>3*x.lobeRms,JSON.stringify(report));
  }
});

test('the lobe hook swaps only the Lambert direct cosine',()=>{
  const out=installForestFoliageLobe(THREE.ShaderLib.lambert.fragmentShader);
  assert.equal(out.includes('#include <lights_lambert_pars_fragment>'),false);
  assert.equal(out.split('treeFoliageDirect( dot( geometryNormal, directLight.direction ) )').length,2);
  assert.ok(out.includes('RE_IndirectDiffuse_Lambert'),'indirect (hemisphere) lighting is untouched');
  assert.throws(()=>installForestFoliageLobe('void main(){}'),/anchor/);
});
