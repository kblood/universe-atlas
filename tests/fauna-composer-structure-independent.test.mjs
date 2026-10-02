// Independent CPU inspection of the actual composer buffers and Three objects.
// Seeds select appearance; the two sizes are NOT juvenile growth stages.
import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import * as THREE from 'three';
import {composerPreset,COMPOSER_PRESET_IDS,COMPOSER_CHOICES,COMPOSER_RANGES,normalizeComposerRecipe,encodeComposerRecipe,decodeComposerRecipe} from '../src/fauna-composer-recipe.ts';
import {buildComposerGraph,COMPOSER_BUDGET} from '../src/fauna-composer-rig.ts';
import {buildComposerSkin} from '../src/fauna-composer-mesh.ts';
import {createComposerCreature} from '../src/fauna-composer.ts';

const digest=(...arrays)=>{const h=createHash('sha256');for(const a of arrays)h.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));return h.digest('hex');};
const build=input=>{const recipe=normalizeComposerRecipe(input).recipe,graph=buildComposerGraph(recipe);return{recipe,graph,skin:buildComposerSkin(graph)};};
const report={scope:'Experimental CPU geometry, structural diversity, deterministic replay and resource ownership; no visual, self-intersection or device acceptance.',corpusDefinition:'12 presets x 4 palette seeds x 2 explicit body sizes; no juvenile control exists',sourceHashes:Object.fromEntries(['recipe','rig','mesh',''].map(s=>{const p=`src/fauna-composer${s?'-'+s:''}.ts`;return[p,createHash('sha256').update(readFileSync(new URL('../'+p,import.meta.url))).digest('hex')];})),corpus:[],structural:[],failures:[]};
after(()=>{if(process.env.COMPOSER_STRUCTURE_REPORT)writeFileSync(process.env.COMPOSER_STRUCTURE_REPORT,JSON.stringify(report,null,2)+'\n');});
function audit({skin:s,graph:g},id,record=true){
 const errors=[];const require=(x,m)=>{if(!x&&errors.length<20)errors.push(m);};
 require(s.positions.length===s.vertexCount*3,'position count');require(s.colors.length===s.positions.length,'color count');require(s.index.length===s.triangleCount*3,'triangle count');require(s.skinIndex.length===s.vertexCount*4&&s.skinWeight.length===s.vertexCount*4,'skin counts');
 require(s.vertexCount>0&&s.vertexCount<=COMPOSER_BUDGET.maxVertices&&s.triangleCount<=COMPOSER_BUDGET.maxTriangles&&g.bones.length<=COMPOSER_BUDGET.maxBones,'actual desktop budget');
 for(const [name,buffer]of Object.entries({positions:s.positions,colors:s.colors,weights:s.skinWeight}))require(buffer.every(Number.isFinite),`finite ${name}`);
 let weightError=0,minTwiceArea=Infinity,degenerate=0;
 for(let i=0;i<s.vertexCount;i++){let total=0;for(let j=0;j<4;j++){const k=4*i+j;require(s.skinIndex[k]<g.bones.length,'bone index');require(s.skinWeight[k]>=0&&s.skinWeight[k]<=1,'weight range');total+=s.skinWeight[k];}weightError=Math.max(weightError,Math.abs(total-1));}
 require(weightError<2e-7,'normalized weights');
 const p=s.positions;for(let k=0;k<s.index.length;k+=3){const ids=[s.index[k],s.index[k+1],s.index[k+2]];require(ids.every(i=>i<s.vertexCount),'vertex index');const[a,b,c]=ids.map(i=>i*3),u=[p[b]-p[a],p[b+1]-p[a+1],p[b+2]-p[a+2]],v=[p[c]-p[a],p[c+1]-p[a+1],p[c+2]-p[a+2]],area=Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]);minTwiceArea=Math.min(minTwiceArea,area);if(area===0)degenerate++;}
 require(degenerate===0,`${degenerate} exactly zero-area triangles`);
 let next=0;for(const part of s.parts){require(part.firstTriangle===next&&part.triangles>0,'contiguous nonempty part');next+=part.triangles;require(part.bones.every(i=>i<g.bones.length),'part bones');}require(next===s.triangleCount,'all triangles belong to a part');
 const result={id,vertices:s.vertexCount,triangles:s.triangleCount,bones:g.bones.length,weightError,minTwiceArea,degenerate,geometryHash:digest(s.positions,s.index),errors};if(record)report.corpus.push(result);return errors;
}

test('96 actual mixed specimens have finite indexed surfaces, normalized skinning and bounded resources',()=>{
 const failures=[];for(const id of COMPOSER_PRESET_IDS)for(const colorSeed of[0,17,901,9999])for(const factor of[.75,1.25]){const base=composerPreset(id),entry=build({...base,colorSeed,bodyLength:Math.min(6,Math.max(.2,base.bodyLength*factor))}),name=`${id}/${colorSeed}/size-${factor}`,errors=audit(entry,name);if(errors.length)failures.push({name,errors});}
 report.failures.push(...failures);assert.equal(report.corpus.length,96);assert.deepEqual(failures,[]);
});

function partGeometry(skin,parts){const positions=[];for(const p of skin.parts)if(parts.includes(p.part))for(let i=p.firstTriangle*3;i<(p.firstTriangle+p.triangles)*3;i++){const v=skin.index[i]*3;positions.push(...skin.positions.subarray(v,v+3));}return new Float32Array(positions);}
test('every torso/head/surface/appendage choice changes actual geometry with fixed palette and seed',()=>{
 const base={...composerPreset('dinosaur'),palette:'earth',colorSeed:1,arms:'grasping',tailLength:1};
 for(const[key,parts]of Object.entries({torso:['torso'],head:['head','mouth'],armor:['armor'],wings:['wing'],feet:['foot'],hands:['hand'],horns:['horn'],trunk:['trunk'],tail:['torso','tail-tip']})){
  const signatures=new Set(),previous=[];for(const choice of COMPOSER_CHOICES[key]){const {skin}=build({...base,[key]:choice}),a=partGeometry(skin,parts);signatures.add(digest(a));report.structural.push({key,choice,triangles:a.length/9,hash:digest(a)});
   for(const b of previous)if(a.length===b.length){let maxDelta=0;for(let i=0;i<a.length;i++)maxDelta=Math.max(maxDelta,Math.abs(a[i]-b[i]));assert.ok(maxDelta>base.bodyLength*.001,`${key}/${choice}: equal-topology variation must exceed 0.1% of body length`);}previous.push(a);
  }
  assert.equal(signatures.size,COMPOSER_CHOICES[key].length,`${key} choices must change positions/topology, not just colors/labels`);
 }
});

test('legal numeric endpoints and maximal combinations retain finite bounded actual geometry',()=>{
 const failures=[];for(const layout of COMPOSER_CHOICES.layout)for(const endpoint of[0,1]){const recipe={...composerPreset('trunked-centipede'),layout};for(const[key,range]of Object.entries(COMPOSER_RANGES))recipe[key]=range[endpoint];const errors=audit(build(recipe),`${layout}/all-${endpoint?'maximum':'minimum'}`,false);if(errors.length)failures.push({layout,endpoint,errors});}report.endpointFailures=failures;assert.deepEqual(failures,[]);
});

test('buffer audit rejects real malformed triangle, weight and coordinate negative controls',()=>{
 const entry=build(composerPreset('worm'));
 for(const kind of['triangle','weight','coordinate']){const skin={...entry.skin,positions:entry.skin.positions.slice(),index:entry.skin.index.slice(),skinWeight:entry.skin.skinWeight.slice()};if(kind==='triangle')skin.index[1]=skin.index[0];if(kind==='weight')skin.skinWeight.fill(0,0,4);if(kind==='coordinate')skin.positions[0]=NaN;assert.ok(audit({...entry,skin},kind,false).length>0,`${kind} must fail actual buffer audit`);}
});

test('geometry and skinning reproduce exactly through recipe replay and palette changes preserve structure',()=>{
 for(const id of COMPOSER_PRESET_IDS){const recipe=composerPreset(id),a=build(recipe).skin,b=build(decodeComposerRecipe(encodeComposerRecipe(recipe)).recipe).skin,c=build({...recipe,palette:recipe.palette==='earth'?'slate':'earth',colorSeed:1234}).skin;
  assert.equal(digest(a.positions,a.index,a.skinIndex,a.skinWeight,a.colors),digest(b.positions,b.index,b.skinIndex,b.skinWeight,b.colors),id);
  assert.equal(digest(a.positions,a.index,a.skinIndex,a.skinWeight),digest(c.positions,c.index,c.skinIndex,c.skinWeight),`${id}: palette cannot alter anatomy`);
 }
});

function posedVertices(c){c.group.updateMatrixWorld(true);const p=new THREE.Vector3(),out=new Float64Array(c.skin.vertexCount*3);for(let i=0;i<c.skin.vertexCount;i++){c.mesh.getVertexPosition(i,p).applyMatrix4(c.mesh.matrixWorld);p.toArray(out,i*3);}return out;}
test('actual skinned vertices replay without history and world bounds enclose every posed vertex',()=>{
 const p=new THREE.Vector3();for(const id of COMPOSER_PRESET_IDS){const c=createComposerCreature(composerPreset(id));try{c.group.position.set(2,.4,-3);c.group.rotation.set(.1,.4,-.2);c.group.scale.set(1.1,.9,1.2);
  for(const motion of['neutral','idle','walk','display']){c.update(motion,.731);const first=posedVertices(c),box=c.bounds();assert.ok(first.every(Number.isFinite));for(let i=0;i<first.length;i+=3){p.fromArray(first,i);assert.ok(box.clone().expandByScalar(1e-7).containsPoint(p),`${id}/${motion}: world bounds`);}c.update('walk',12345);c.update('idle',-.8);c.update(motion,.731);assert.equal(digest(first),digest(posedVertices(c)),`${id}/${motion}: seek history`);}
 }finally{c.dispose();}}
});

test('independent instances dispose every owned resource exactly once without damaging a survivor',()=>{
 const a=createComposerCreature(composerPreset('winged-ape-rhino')),b=createComposerCreature(composerPreset('winged-ape-rhino')),parent=new THREE.Group();parent.add(a.group,b.group);
 const coloured=a.mesh.material;a.setNeutral(true);const neutral=a.mesh.material,lines=a.group.getObjectByName('composer-skeleton'),owned=[a.mesh.geometry,coloured,neutral,lines.geometry,lines.material],counts=new Map(owned.map(x=>[x,0]));for(const x of owned)x.addEventListener('dispose',()=>counts.set(x,counts.get(x)+1));
 let skeletonDisposals=0;const disposeSkeleton=a.mesh.skeleton.dispose.bind(a.mesh.skeleton);a.mesh.skeleton.dispose=()=>{skeletonDisposals++;disposeSkeleton();};
 assert.notEqual(a.mesh.geometry,b.mesh.geometry);assert.notEqual(a.mesh.skeleton,b.mesh.skeleton);assert.notEqual(coloured,b.mesh.material);b.update('display',.7);const before=digest(posedVertices(b));a.setSkeletonVisible(true);assert.equal(a.details().drawCalls,2);a.dispose();a.dispose();assert.deepEqual([...counts.values()],[1,1,1,1,1]);assert.equal(skeletonDisposals,1);assert.equal(a.group.parent,null);assert.equal(b.group.parent,parent);assert.equal(digest(posedVertices(b)),before);assert.throws(()=>a.update('walk',0),/disposed/);b.dispose();
});
