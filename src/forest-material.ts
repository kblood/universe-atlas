import * as THREE from 'three';
import {forestCoverageGLSL} from './forest-coverage.ts';

/** Identical canonical ownership in color and the sun's depth pass. Hidden
 * legacy slots must not cast a second tree underneath their detailed asset. */
export function installLegacyForestCoverage(material:THREE.Material){
  const prior=material.onBeforeCompile,key=material.customProgramCacheKey();
  material.onBeforeCompile=function(shader,renderer){
    prior.call(this,shader,renderer);
    shader.vertexShader='attribute float instanceCoverage,instanceForestSeed;\nflat varying float vForestCoverage,vForestSeed;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvForestCoverage=instanceCoverage;vForestSeed=instanceForestSeed;');
    shader.fragmentShader='flat varying float vForestCoverage,vForestSeed;\n'+forestCoverageGLSL+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <alphahash_fragment>',`#ifdef USE_ALPHAHASH
      diffuseColor.a *= vForestCoverage;
      #include <alphahash_fragment>
      #else
      if(atlasForestHash(uint(vForestSeed+.5))>=atlasForestLevel(vForestCoverage))discard;
      #endif`);
  };
  material.customProgramCacheKey=()=>`${key}/legacy-forest-coverage-3`;
}
export function forestMaterial(vertexColors:boolean){
  const material=new THREE.MeshLambertMaterial({vertexColors,color:vertexColors?0xffffff:0x456c28});
  installLegacyForestCoverage(material);return material;
}
export function forestDepthMaterial(){
  const material=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
  installLegacyForestCoverage(material);return material;
}
