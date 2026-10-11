import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {COMPOSER_PRESET_IDS,composerPreset} from '../src/fauna-composer-recipe.ts';
import {createComposerCreature} from '../src/fauna-composer.ts';
import {FaunaComposerMergedBatch,patchComposerMergedShader} from '../src/fauna-composer-merged-batch.ts';
import {FaunaComposerPaletteWriter} from '../src/fauna-composer-palette.ts';
import {composerRenderSkin,buildFaunaComposerRequestedLevels,validateComposerRenderLod} from '../src/fauna-composer-render-source.ts';
import {COMPOSER_PACKED_STORAGE_VERSION,validatePackedComposerSkin} from '../src/fauna-composer-storage.ts';

function arenaFor(skin,actors=1) {const texture=new THREE.DataTexture(new Float32Array(160*16*actors),640,actors);
  return {texture,arena:new FaunaComposerMergedBatch({storage:'packed-1',maxActors:actors,maxVertices:skin.positions.length/3*actors,maxIndices:skin.index.length*actors,maxBytes:40e6,bones:{value:texture}})};}
function deformed(skin,palette,v,packed) {const out=[0,0,0],p=skin.positions.subarray(v*3,v*3+3);let sum=0;
  for(let k=0;k<4;k++)sum+=skin.skinWeight[v*4+k]/(packed?65535:1);
  for(let k=0;k<4;k++){const w=skin.skinWeight[v*4+k]/(packed?65535*sum:1),m=skin.skinIndex[v*4+k]*16;
    for(let a=0;a<3;a++)out[a]+=w*(palette[m+a]*p[0]+palette[m+4+a]*p[1]+palette[m+8+a]*p[2]+palette[m+12+a]);}
  return out;
}
test('packed arena has explicit storage and bounded error across every preset, preserving exact source fields',()=>{
  let worstDisplacement=0,worstFootY=0,footSamples=0;
  for(const name of COMPOSER_PRESET_IDS){const creature=createComposerCreature({...composerPreset(name),pattern:'rosettes',colorSeed:9000+COMPOSER_PRESET_IDS.indexOf(name),patternScale:1.8},{presentation:'realism-1'});
    const source=composerRenderSkin(creature.skin),{arena,texture}=arenaFor(source);
    try{const originalPositions=source.positions.slice(),originalWeights=source.skinWeight.slice();assert.ok(arena.register(name,source,0));const packed=arena.residentSkin(name,source);
      assert.equal(packed.storage.version,COMPOSER_PACKED_STORAGE_VERSION);const proof=validatePackedComposerSkin(source,packed);assert.equal(proof.checkedVertices,source.positions.length/3);
      assert.ok(packed.normals instanceof Int16Array);assert.ok(packed.colors instanceof Uint16Array);assert.ok(packed.skinIndex instanceof Uint8Array);assert.ok(packed.skinWeight instanceof Uint16Array);assert.ok(packed.gloss instanceof Uint8Array);assert.ok(packed.coatLayers.sample instanceof Float32Array);
      for(const name of ['normal','color','skinWeight','composerGloss','coatL0','coatL1','coatL2'])assert.equal(arena.mesh.geometry.getAttribute(name).normalized,true);
      assert.equal(arena.mesh.geometry.getAttribute('skinIndex').normalized,false);assert.equal(arena.mesh.geometry.getAttribute('composerActor').array.BYTES_PER_ELEMENT,2);
      assert.equal(arena.ownedBytes,(source.positions.length/3*73+source.index.length*4+112)*2);
      assert.deepEqual(source.positions,originalPositions);assert.deepEqual(source.skinWeight,originalWeights);
      for(const time of [0,.23,.61,1.17]){const pose=creature.update('walk',time),palette=new Float32Array(creature.graph.bones.length*16);new FaunaComposerPaletteWriter(creature.graph).write(pose,palette);
        for(let v=0;v<source.positions.length/3;v++){const a=deformed(source,palette,v,false),b=deformed(packed,palette,v,true),distance=Math.hypot(...a.map((x,k)=>x-b[k]));worstDisplacement=Math.max(worstDisplacement,distance);
          if(creature.graph.bones[source.skinIndex[v*4]].part==='foot'){footSamples++;worstFootY=Math.max(worstFootY,Math.abs(a[1]-b[1]));}}
      }
    }finally{arena.dispose();texture.dispose();creature.dispose();}
  }
  assert.ok(footSamples>1000);assert.ok(worstDisplacement<.00015,`max packed displacement ${worstDisplacement}m`);assert.ok(worstFootY<.00005,`max packed foot vertical change ${worstFootY}m`);
});
test('reduced source proof stays raw and packed-to-packed reuse never requantizes or mutates it',()=>{
  const creature=createComposerCreature({...composerPreset('trunked-centipede'),pattern:'bands'},{presentation:'realism-1'}),source=buildFaunaComposerRequestedLevels({graph:creature.graph,skin:creature.skin},['far']).far,{arena,texture}=arenaFor(source,2);
  try{validateComposerRenderLod(creature.skin,source);assert.ok(arena.register('a',source,0));const packed=arena.residentSkin('a',source);assert.ok(arena.register('b',packed,1));const copy=arena.residentSkin('b',packed);
    assert.deepEqual(copy.normals,packed.normals);assert.deepEqual(copy.skinWeight,packed.skinWeight);assert.deepEqual(copy.coatLayers.c0,packed.coatLayers.c0);validatePackedComposerSkin(source,copy);
    arena.release('a');validatePackedComposerSkin(source,copy);validateComposerRenderLod(creature.skin,source);
  }finally{arena.dispose();texture.dispose();creature.dispose();}
});
test('lit and every shadow shader decode normalized packed weights identically',()=>{
  for(const name of ['standard','depth','distanceRGBA']){const shader={vertexShader:THREE.ShaderLib[name].vertexShader,fragmentShader:THREE.ShaderLib[name].fragmentShader};patchComposerMergedShader(shader,name==='standard','packed-1');
    assert.match(shader.vertexShader,/composerPackedWeight=skinWeight\/max\(dot\(skinWeight,vec4\(1.0\)\)/);assert.match(shader.vertexShader,/composerPackedWeight.x\*composerBone/);}
});
