/** Actual Kit source/planet-pose quantization probe, CPU only. The optional Kit
 * URL permits testing an accepted core before the integration branch vendors it. */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import * as THREE from 'three';
import {generateCreatureGenome,realisticIndividualCreatureGenome} from '../src/creature-model.ts';
import {MORPHOLOGY_FAMILIES} from '../src/fauna-appearance.ts';
import {FaunaComposerMergedBatch} from '../src/fauna-composer-merged-batch.ts';
import {FaunaComposerPaletteWriter} from '../src/fauna-composer-palette.ts';
import {composerRenderSkin} from '../src/fauna-composer-render-source.ts';
import {validatePackedComposerSkin} from '../src/fauna-composer-storage.ts';
const kit=await import(process.env.PLANET_COMPOSER_KIT_URL??'#creature-kit/planet');
const output=process.env.COMPOSER_PACKED_OUTPUT??'C:/LLM/IWSDK/Assets/_assetctl/planet-composer-packed-20261011/world-feet';
const plane=(x,z)=>.07*x-.04*z,member={id:'packed-world-proof',anchorOffsetX:1,anchorOffsetZ:-2,orbitRadiusM:6,orbitAngularSpeed:.1,orbitPhase:.37,gaitPeriodS:1};
const activity=travel=>{const angle=member.orbitPhase+travel*Math.PI*2;return {pose:{x:1+Math.cos(angle)*6,z:-2+Math.sin(angle)*6,yaw:angle+Math.PI/2,gait:'walk'},travel,revolutionS:Math.PI*2/.1,stateS:.7};};
function point(skin,palette,v,packed){const p=skin.positions.subarray(v*3,v*3+3),out=[0,0,0];let sum=0;for(let k=0;k<4;k++)sum+=skin.skinWeight[v*4+k]/(packed?65535:1);
 for(let k=0;k<4;k++){const w=skin.skinWeight[v*4+k]/(packed?65535*sum:1),at=skin.skinIndex[v*4+k]*16;for(let axis=0;axis<3;axis++)out[axis]+=w*(palette[at+axis]*p[0]+palette[at+axis+4]*p[1]+palette[at+axis+8]*p[2]+palette[at+axis+12]);}return out;}
const rows=[];
for(let i=0;i<24;i++){
 const family=MORPHOLOGY_FAMILIES[i%MORPHOLOGY_FAMILIES.length],genome=realisticIndividualCreatureGenome(generateCreatureGenome(`renderer-profile/${i}`,['browser','runner','low-slung','long-neck'][i%4]),`individual/${i}`,i%4,i%3?'adult':'juvenile',family),definition=kit.planetComposerDefinition(genome,{individualId:`id/${i}`,speciesId:`species/${family}`}),source=kit.buildPlanetComposerSource(definition),skin=composerRenderSkin(source.skin);
 const texture=new THREE.DataTexture(new Float32Array(160*16),640,1),arena=new FaunaComposerMergedBatch({storage:'packed-1',maxActors:1,maxVertices:skin.positions.length/3,maxIndices:skin.index.length,maxBytes:16e6,bones:{value:texture}});
 try{arena.register('a',skin,0);const packed=arena.residentSkin('a',skin),proof=validatePackedComposerSkin(skin,packed),graph=source.graph,writer=new FaunaComposerPaletteWriter(graph),palette=new Float32Array(graph.bones.length*16);
  const soleVertices=new Map();
  for(const limb of graph.limbs.filter(l=>l.kind==='leg')){const bone=graph.bones[limb.bones.at(-1)],inverse=new THREE.Matrix4().compose(new THREE.Vector3().fromArray(bone.restPosition),new THREE.Quaternion().fromArray(bone.restQuaternion),new THREE.Vector3(1,1,1)).invert(),vertices=[];let minY=Infinity;
   for(let v=0;v<skin.positions.length/3;v++){let w=0;for(let k=0;k<4;k++)if(skin.skinIndex[v*4+k]===bone.index)w+=skin.skinWeight[v*4+k];if(w<.999999)continue;const local=new THREE.Vector3().fromArray(skin.positions,v*3).applyMatrix4(inverse);vertices.push({v,y:local.y});minY=Math.min(minY,local.y);}soleVertices.set(limb.index,vertices.filter(p=>p.y<minY+2e-5).map(p=>p.v));}
  let maxDisplacementM=0,maxFootHeightChangeM=0,maxBaselineStanceGapM=0,maxPackedStanceGapM=0,stanceSoleSamples=0,swingContacts=0;
  for(let step=0;step<12;step++){const a=activity(.25+step*.002),pose=kit.posePlanetComposer(graph,member,a,plane,1600+step*.1);writer.write(pose,palette);
   for(let v=0;v<skin.positions.length/3;v++){const raw=point(skin,palette,v,false),q=point(packed,palette,v,true);maxDisplacementM=Math.max(maxDisplacementM,Math.hypot(...raw.map((x,k)=>x-q[k])));}
   const cos=Math.cos(a.pose.yaw),sin=Math.sin(a.pose.yaw),gap=p=>plane(a.pose.x,a.pose.z)+p[1]-plane(a.pose.x+cos*p[0]+sin*p[2],a.pose.z+sin*p[0]-cos*p[2]);
   for(const contact of pose.contacts){if(!contact.stance){swingContacts++;continue;}for(const v of soleVertices.get(contact.limb)??[]){const raw=point(skin,palette,v,false),q=point(packed,palette,v,true);stanceSoleSamples++;maxFootHeightChangeM=Math.max(maxFootHeightChangeM,Math.abs(raw[1]-q[1]));maxBaselineStanceGapM=Math.max(maxBaselineStanceGapM,Math.abs(gap(raw)));maxPackedStanceGapM=Math.max(maxPackedStanceGapM,Math.abs(gap(q)));}}
  }
  assert.ok(stanceSoleSamples>0,`actual sole vertices ${family}`);assert.ok(swingContacts>0);assert.ok(maxDisplacementM<.0002);assert.ok(maxFootHeightChangeM<.00005);assert.ok(maxPackedStanceGapM<=maxBaselineStanceGapM+.00005);
  rows.push({id:`id/${i}`,family,bones:graph.bones.length,triangles:skin.index.length/3,stanceSoleSamples,swingContacts,maxDisplacementM,maxFootHeightChangeM,maxBaselineStanceGapM,maxPackedStanceGapM,proof});
 }finally{arena.dispose();texture.dispose();}
}
const report={sourceVersion:kit.PLANET_COMPOSER_SOURCE_VERSION,poseVersion:kit.PLANET_COMPOSER_POSE_VERSION,storage:'composer-arena-packed-1',rows,maxDisplacementM:Math.max(...rows.map(r=>r.maxDisplacementM)),maxFootHeightChangeM:Math.max(...rows.map(r=>r.maxFootHeightChangeM)),maxStanceGapM:Math.max(...rows.map(r=>r.maxPackedStanceGapM)),stanceSoleSamples:rows.reduce((n,r)=>n+r.stanceSoleSamples,0)};
await mkdir(output,{recursive:true});await writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,rows:rows.length},null,2));
