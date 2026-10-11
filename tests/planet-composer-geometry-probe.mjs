/** Focused shared-Kit source/terrain/transition gate, separate from actual
 * production binding evidence. Explicitly run only after core+pose merge. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
assert.equal(process.env.PLANET_COMPOSER_GEOMETRY_START,'1','NOT RUN: frozen merged core/pose and approved geometry pins required');
assert(process.env.PLANET_COMPOSER_KIT&&process.env.PLANET_COMPOSER_GEOMETRY_POLICY);
const kit=resolve(process.env.PLANET_COMPOSER_KIT),policy=JSON.parse(await readFile(process.env.PLANET_COMPOSER_GEOMETRY_POLICY,'utf8'));assert.equal(policy.ownerApproved,true);
for(const k of ['maxPenetrationM','maxStanceGapM','maxStanceDriftM','maxBoundaryVertexJumpM'])assert(Number.isFinite(policy[k])&&policy[k]>=0,'missing owner geometry pin: '+k);
const require=createRequire(resolve(kit,'package.json')),THREE=require('three');
const [core,poser]=await Promise.all([import(pathToFileURL(resolve(kit,'src/planet-composer.ts')).href),import(pathToFileURL(resolve(kit,'src/planet-composer-pose.ts')).href)]);
const fixtures=JSON.parse(await readFile(new URL('./fixtures/planet-composer-migration-scenarios.json',import.meta.url),'utf8'));
const out=resolve(process.env.ATLAS_RESULTS||'C:/LLM/IWSDK/Assets/_assetctl/planet-composer-migration-20261011/independent-geometry');await mkdir(out,{recursive:true});
const member={id:'controlled-reference',anchorOffsetX:1,anchorOffsetZ:-2,orbitRadiusM:6,orbitAngularSpeed:.1,orbitPhase:.37,gaitPeriodS:1},revolutionS=2*Math.PI/.1;
const activity=(travel,gait='walk',stateS=.7)=>{const angle=member.orbitPhase+travel*2*Math.PI;return {pose:{x:1+Math.cos(angle)*6,z:-2+Math.sin(angle)*6,yaw:angle+Math.PI/2,gait},travel,revolutionS:gait==='walk'?revolutionS:Infinity,stateS};};
const terrain={ramp:(x,z)=>.08*x-.06*z,nonlinear:(x,z)=>.07*x+.05*z+.035*Math.sin(x*1.2)*Math.cos(z*.9)};
function palette(graph,pose){return graph.bones.map((b,i)=>new THREE.Matrix4().compose(new THREE.Vector3().fromArray(pose.positions,i*3),new THREE.Quaternion().fromArray(pose.quaternions,i*4),new THREE.Vector3(1,pose.radialScale[i],pose.radialScale[i]*pose.chordScale[i])).multiply(new THREE.Matrix4().compose(new THREE.Vector3(...b.restPosition),new THREE.Quaternion(...b.restQuaternion),new THREE.Vector3(1,1,1)).invert()));}
function vertex(skin,v,matrices){const p=new THREE.Vector3().fromArray(skin.positions,v*3),q=new THREE.Vector3(),out=new THREE.Vector3();for(let k=0;k<4;k++){const w=skin.skinWeight[v*4+k];if(w)out.addScaledVector(q.copy(p).applyMatrix4(matrices[skin.skinIndex[v*4+k]]),w);}return out;}
// Caller-defined world frame, used for measuring actual transformed vertices;
// does not reuse the solver's contact/ground implementation.
function world(p,a,ground){const c=Math.cos(a.pose.yaw),s=Math.sin(a.pose.yaw);return [a.pose.x+c*p.x+s*p.z,ground(a.pose.x,a.pose.z)+p.y,a.pose.z+s*p.x-c*p.z];}
const idsOf=(skin,part)=>[...new Set(skin.index.slice(part.firstTriangle*3,(part.firstTriangle+part.triangles)*3))];
const report={scope:'four preserved mapped phenotypes; shared Kit actual source vertices on nonlinear terrain and boundaries; not production renderer/device/performance acceptance',kit,policy,rows:[],ok:false};
try{
 for(const index of fixtures.initialControlledIndices){
  const row=fixtures.controlledSourceInputs.find(r=>r.index===index),original=structuredClone(row.genome),definition=core.planetComposerDefinition(row.genome,{individualId:row.id}),source=core.buildPlanetComposerSource(definition),actor=core.createPlanetComposerAnimal(definition);
  try{
   assert.deepEqual(row.genome,original);assert.deepEqual(definition.genome,original);assert.deepEqual(core.parsePlanetComposerDefinition(core.serializePlanetComposerDefinition(definition)),definition);
   assert.equal(definition.recipe.maturity,1);assert.equal(definition.recipe.individualSeed,0);assert.equal(definition.recipe.variability,0);assert.equal(definition.ledger.growth,'already-resolved-no-additional-growth');
   assert.throws(()=>core.parsePlanetComposerDefinition({...definition,recipe:{...definition.recipe,maturity:.35}}),'no second young growth');
   for(const name of ['positions','normals','colors','skinIndex','skinWeight','index'])assert.deepEqual(source.skin[name],actor.skin[name],'shared source/actor '+name);
   const feet=source.skin.parts.filter(p=>p.part==='foot').map(p=>({part:p,ids:idsOf(source.skin,p),limb:source.graph.limbs.find(l=>l.kind==='leg'&&p.label.endsWith(String(l.pair+1)+(l.side<0?'L':'R')))}));assert(feet.length>0);
   const result={id:row.id,stage:row.stage,family:row.family,bones:source.graph.bones.length,triangles:source.skin.triangleCount,terrain:[]};
   for(const [name,ground] of Object.entries(terrain)){
    let observations=0,stance=0,swing=0,minGround=Infinity,maxStanceGap=0,maxDrift=0,maxBoundaryJump=0;
    const measure=(a,t)=>{const pose=poser.posePlanetComposer(source.graph,{...member,id:row.id},a,ground,t),matrices=palette(source.graph,pose);return {pose,matrices};};
    for(let frame=0;frame<32;frame++){
     const a=activity(.18+frame*.0012),b=activity(a.travel+1e-6),p=measure(a,1000+frame*.02),q=measure(b,1000+frame*.02+.001);
     for(const foot of feet){const contact=p.pose.contacts.find(c=>c.limb===foot.limb.index),next=q.pose.contacts.find(c=>c.limb===foot.limb.index);let low=Infinity,lowest;
      for(const v of foot.ids){const w=world(vertex(source.skin,v,p.matrices),a,ground),gap=w[1]-ground(w[0],w[2]);if(gap<low){low=gap;lowest={v,w};}}
      assert(low>=-policy.maxPenetrationM,`${row.id}/${name}: actual source sole penetrates ${low}`);minGround=Math.min(minGround,low);if(contact.stance){stance++;maxStanceGap=Math.max(maxStanceGap,low);assert(low<=policy.maxStanceGapM,`${row.id}/${name}: source sole floats ${low}`);}else swing++;
      if(contact.stance&&next.stance){const nextWorld=world(vertex(source.skin,lowest.v,q.matrices),b,ground),drift=Math.hypot(...nextWorld.map((x,k)=>x-lowest.w[k]));maxDrift=Math.max(maxDrift,drift);assert(drift<=policy.maxStanceDriftM,`${row.id}/${name}: actual stance vertex drifts ${drift}`);}
      observations++;
     }
    }
    const at=.321,first=measure(activity(at),19000).pose;measure(activity(.8),900000);assert.deepEqual(measure(activity(at),19000).pose,first,'exact A-B-A pose');
    // Same root at each side of the gait boundary isolates representation
    // changes from canonical travel. Measure actual foot vertices, not labels.
    for(const [left,right] of [[activity(at,'idle',1),activity(at,'walk',1e-9)],[activity(at,'walk',1),activity(at,'idle',1e-9)]]){const p=measure(left,1000),q=measure(right,1000+1e-9);for(const foot of feet)for(const v of foot.ids){const a=world(vertex(source.skin,v,p.matrices),left,ground),b=world(vertex(source.skin,v,q.matrices),right,ground);maxBoundaryJump=Math.max(maxBoundaryJump,Math.hypot(...b.map((x,k)=>x-a[k])));}}
    assert(maxBoundaryJump<=policy.maxBoundaryVertexJumpM,`${row.id}/${name}: idle/walk vertex jump ${maxBoundaryJump}`);assert(stance>0&&swing>0);result.terrain.push({name,observations,stance,swing,minGround,maxStanceGap,maxDrift,maxBoundaryJump});
   }
   report.rows.push(result);
  }finally{actor.dispose();}
 }
 report.ok=true;
}catch(error){report.failure=String(error.stack||error);throw error;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));}
