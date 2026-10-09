import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FaunaFieldRenderer,FAUNA_FIELD_CAPACITY} from '../src/fauna-field-renderer.ts';
import {generateCreatureGenome,realisticIndividualCreatureGenome} from '../src/creature-model.ts';
import {MORPHOLOGY_FAMILIES} from '../src/fauna-appearance.ts';
import {createQuadrupedPlan} from '../src/fauna-body-plan.ts';
const genomes=['browser','runner','low-slung','long-neck'].map(a=>generateCreatureGenome('PROXY-BODY-1',a));
const render=(field,g,time=0,gait='idle',key,translation=0,distance=5)=>{
  field.beginFrame(new THREE.Vector3());
  assert.ok(field.submit(g,new THREE.Matrix4().makeTranslation(translation,0,0),time,gait,distance,key));
  field.endFrame();field.group.updateMatrixWorld(true);
};
const snapshot=field=>field.group.children.map(m=>({count:m.count,matrices:Array.from(m.instanceMatrix.array.slice(0,m.count*16)),colors:Array.from(m.instanceColor.array.slice(0,m.count*3))}));
function lateralThickness(field,point){
  const ray=new THREE.Raycaster(new THREE.Vector3(point.x,point.y,10),new THREE.Vector3(0,0,-1));
  const hits=ray.intersectObjects(field.group.children,false);
  // Outer silhouette from actual triangles, not a formula for muscle radii.
  if(!hits.length)return 0;
  const zs=hits.map(h=>h.point.z);return Math.max(...zs)-Math.min(...zs);
}
test('fallback thighs have load-bearing volume from the near anatomy for all four body archetypes',()=>{
  for(const g of genomes){
    const current=new FaunaFieldRenderer({bodyPlan:true}),old=new FaunaFieldRenderer(),plan=createQuadrupedPlan(g);
    try{
      render(current,g);render(old,g);
      const limbs=current.group.children[1];
      // Mid-proximal forelimb cross section from its submitted segment; this
      // remains a complete body even if all six skinned-rig slots are occupied.
      const matrix=new THREE.Matrix4();limbs.getMatrixAt(3,matrix);
      const point=new THREE.Vector3(0,-.3,0).applyMatrix4(matrix);
      const thickness=lateralThickness(current,point),legacy=lateralThickness(old,point);
      const fore=plan.legs.find(l=>!l.rear);
      assert.ok(thickness>=fore.hipRadius*1.15,`${g.archetype}: muscle silhouette ${thickness} is thinner than near load-bearing anatomy`);
      assert.ok(thickness>legacy*1.15,`${g.archetype}: old stick silhouette remains (${thickness} vs ${legacy})`);
      assert.equal(current.group.children.length,4,'same four draw batches');
    }finally{current.dispose();old.dispose();}
  }
});
test('the richer fallback preserves dated foot trajectories and per-animal population at idle and walk',()=>{
  for(const g of genomes)for(const gait of ['idle','walk'])for(const time of [0,.17,1.4]){
    const body=new FaunaFieldRenderer({bodyPlan:true}),legacy=new FaunaFieldRenderer();
    try{
      render(body,g,time,gait);render(legacy,g,time,gait);
      const feet=f=>Array.from(f.group.children[3].instanceMatrix.array.slice(0,4*16));
      assert.deepEqual(feet(body),feet(legacy),`${g.archetype} ${gait} ${time}: contacts/gait changed`);
      assert.equal(body.count,legacy.count);
    }finally{body.dispose();legacy.dispose();}
  }
});
test('maximum anatomy fills 512 animals without overflowing any primitive lane',()=>{
  const field=new FaunaFieldRenderer({bodyPlan:true}),g={...genomes[2],armor:1,earLength:.4,hornLength:.8};
  try{
    field.beginFrame(new THREE.Vector3());
    for(let i=0;i<FAUNA_FIELD_CAPACITY;i++)assert.ok(field.submit(g,new THREE.Matrix4().makeTranslation(i*4,0,0),1,'walk',5));
    field.endFrame();
    assert.equal(field.count,FAUNA_FIELD_CAPACITY);
    for(const mesh of field.group.children){
      assert.ok(mesh.count*16<=mesh.instanceMatrix.array.length,`${mesh.name}: matrix overflow`);
      assert.ok(mesh.count*3<=mesh.instanceColor.array.length,`${mesh.name}: colour overflow`);
      assert.ok(mesh.instanceMatrix.array.subarray((mesh.count-1)*16,mesh.count*16).every(Number.isFinite));
    }
    assert.ok(field.allocatedBytes<4*1024*1024,'instanced storage exceeds 4 MiB');
  }finally{field.dispose();}
});
test('paused body anatomy replay matches a fresh draw after origin-relative translation',()=>{
  const field=new FaunaFieldRenderer({bodyPlan:true}),fresh=new FaunaFieldRenderer({bodyPlan:true}),key={};
  try{
    const g=genomes[3];render(field,g,1,'walk',key);render(field,g,1,'walk',key);
    render(field,g,1,'walk',key,17.25);render(fresh,g,1,'walk',undefined,17.25);
    assert.deepEqual(snapshot(field),snapshot(fresh));
  }finally{field.dispose();fresh.dispose();}
});
test('every authored morphology retains filled proximal limbs, including juvenile proportions',()=>{
  for(const family of MORPHOLOGY_FAMILIES)for(const stage of ['adult','juvenile']){
    const g=realisticIndividualCreatureGenome(genomes[0],`proxy/${family}`,2,stage,family),field=new FaunaFieldRenderer({bodyPlan:true});
    try{
      render(field,g);const matrix=new THREE.Matrix4();field.group.children[1].getMatrixAt(3,matrix);
      const point=new THREE.Vector3(0,-.3,0).applyMatrix4(matrix),plan=createQuadrupedPlan(g);
      assert.ok(lateralThickness(field,point)>=plan.legs.find(l=>!l.rear).hipRadius*1.15,`${family}/${stage}: sparse limb silhouette`);
    }finally{field.dispose();}
  }
});
test('body detail blends out and emits exactly the legacy far lanes at 150m; cached dates track distance',()=>{
  const body=new FaunaFieldRenderer({bodyPlan:true}),fresh=new FaunaFieldRenderer({bodyPlan:true}),legacy=new FaunaFieldRenderer(),key={},g=genomes[1];
  try{
    render(body,g,1,'walk',key,0,95);render(body,g,1,'walk',key,0,95);
    for(const distance of [96,120,149.9,150,300,120,5]){
      render(body,g,1,'walk',key,0,distance);render(fresh,g,1,'walk',undefined,0,distance);
      assert.deepEqual(snapshot(body),snapshot(fresh),`${distance}m: stale detail replay`);
      if(distance>=150){render(legacy,g,1,'walk',undefined,0,distance);assert.deepEqual(snapshot(body),snapshot(legacy),'far geometry or colour changed');}
    }
    // Bounding silhouette on either side of the cut remains continuous even
    // though zero-size extra volumes stop consuming instance lanes at 150m.
    render(body,g,1,'walk',undefined,0,149.999);render(legacy,g,1,'walk',undefined,0,150);
    const extent=field=>{
      let lo=Infinity,hi=-Infinity;const matrix=new THREE.Matrix4(),point=new THREE.Vector3();
      for(const mesh of field.group.children){const a=mesh.geometry.attributes.position;for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);for(let j=0;j<a.count;j++){point.fromBufferAttribute(a,j).applyMatrix4(matrix);lo=Math.min(lo,point.y);hi=Math.max(hi,point.y);}}}
      return [lo,hi];
    };
    const a=extent(body),b=extent(legacy);assert.ok(Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]))<1e-5,'silhouette pops at detail cut');
  }finally{body.dispose();fresh.dispose();legacy.dispose();}
});
