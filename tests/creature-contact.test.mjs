import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3} from 'three';
import {generateBiosphere} from '../src/biosphere-model.ts';
import {individualCreatureGenome} from '../src/creature-model.ts';
import {createCreatureRig,creatureTerrainHeight} from '../src/creature-rig.ts';

test('actual foot geometry stays above flat ground and diagnostics track solved joints',()=>{
  const world=generateBiosphere('CONTACT-CORPUS','temperate','planet/0');
  for(const species of world.species.filter(s=>s.creature))for(const stage of ['adult','juvenile']){
    const rig=createCreatureRig(individualCreatureGenome(species.creature,species.id,0,stage));
    try{for(const gait of ['idle','walk','run'])for(const time of [0,.13,.31,.59,.82,1.21]){
      const d=rig.update(time,gait,'flat');rig.group.updateMatrixWorld(true);
      const meshes=[];rig.group.traverse(o=>{if(o.isMesh&&o.name==='planted foot')meshes.push(o);});
      assert.equal(meshes.length,4);
      for(let i=0;i<4;i++){
        const foot=meshes[i],bounds=new Box3().setFromObject(foot);
        assert.ok(bounds.min.y>=-.025,`${species.name} ${stage} ${gait} actual foot below ground: ${bounds.min.y}`);
        const joint=foot.parent.getWorldPosition(new Vector3());
        assert.ok(joint.distanceTo(new Vector3(...d.feet[i].position))<1e-5,'reported position is the rendered foot joint');
      }
      assert.ok(d.maxReachError<.08,`${species.name} ${stage} ${gait} unreachable target ${d.maxReachError}`);
    }}finally{rig.dispose();}
  }
});
test('stance feet remain planted as the body progresses, including terrain transitions',()=>{
  for(const species of generateBiosphere('PLANTED','temperate','planet/0').species.filter(s=>s.creature)){
    const rig=createCreatureRig(species.creature);
    try{for(const terrain of ['flat','slope','steps'])for(const gait of ['walk','run']){
      let previous=rig.update(0,gait,terrain),comparisons=0;
      for(let k=1;k<=160;k++){
        const d=rig.update(k*.015,gait,terrain);
        assert.ok(d.maxReachError<.1,`${species.name} ${terrain} ${gait} reach ${d.maxReachError}`);
        for(let j=0;j<4;j++){
          const a=previous.feet[j],b=d.feet[j];
          if(a.stance&&b.stance){
            assert.ok(new Vector3(...a.position).distanceTo(new Vector3(...b.position))<.002,'planted foot slides');comparisons++;
          }
          assert.ok(b.position[1]>=creatureTerrainHeight(b.position[0],b.position[2],terrain)-.01);
        }
        previous=d;
      }
      assert.ok(comparisons>10);
    }}finally{rig.dispose();}
  }
});
test('disposing every rig releases every geometry actually attached to a mesh',()=>{
  const species=generateBiosphere('DISPOSE','temperate','planet/0').species.find(s=>s.creature);
  const rig=createCreatureRig(species.creature),geometries=new Set(),disposed=new Set();
  rig.group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});
  for(const g of geometries)g.addEventListener('dispose',()=>disposed.add(g));
  rig.dispose();assert.equal(disposed.size,geometries.size,'including upper/lower leg cylinder resources');
  rig.dispose();assert.equal(disposed.size,geometries.size);
});
