// Full-body deformation gate on REQUIRED actual GLB input. CPU skinning only.
// node tests/fauna-template-deformation-asset.mjs <candidate-directory> <report.json> [--all-controls]
// Gate values below are fixed technical shape-preservation limits. They are
// independent of the contact solver and are not claims about biological tissue.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createFaunaTemplate,FAUNA_TEMPLATE_CONTROLS} from '../src/fauna-template.ts';
import {createFaunaTemplateMotion} from '../src/fauna-template-motion.ts';
const[directory,reportPath,matrixOption]=process.argv.slice(2);
if(!directory||!reportPath)throw new Error('Usage: node tests/fauna-template-deformation-asset.mjs <candidate-directory> <report.json>');
if(matrixOption!==undefined&&matrixOption!=='--all-controls')throw new Error('Unknown deformation matrix option');
const limits=Object.freeze({edgeStretchMax:1.8,edgeCompressionMin:.45,abdomenDisplacementP95TorsoFraction:.03,abdomenDisplacementMaxTorsoFraction:.05,abdomenSectionAreaMin:.85,abdomenSectionAreaMax:1.15});
const sidecar=JSON.parse(await fs.readFile(path.join(directory,'fauna-template.json'),'utf8'));
assert.equal(sidecar.id,'atlas-deer-doe-v1','regional QA boundaries are authored for this named anatomy');
const bytes=await fs.readFile(path.join(directory,sidecar.runtime));
const loader=new GLTFLoader();loader.register(()=>({name:'ATLAS_CPU_DEFORMATION_AUDIT',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const template=createFaunaTemplate(gltf.scene,sidecar,{ownsSource:true});
const report={ok:false,id:sidecar.id,source:path.resolve(directory),sourceSha256:createHash('sha256').update(bytes).digest('hex'),expandedControls:matrixOption==='--all-controls',textureReview:'not performed',limits,
  regionDefinition:'Body-local X from L/R hip mean to L/R shoulder mean. Abdomen vertices: X35..60% of span, Y65..100% of chest height above floor. All parts/triangles measured; root travel removed. X25% hind section is diagnostic (includes moving thigh); central abdomen X40/55% alone use unchanged area limits and must be closed and axial-only in every neutral/posed sample.',
  scopeCorrection:'2026-10-02 actual022 attribution proved all X25% area change came from proximal thigh while axial contributions and X40/55% were unchanged. Preserve hind-plane total and signed limb/axial contributions, gate central abdomen and fail if its scope is invalid. No numerical limits changed.',
  maxEdgeStretch:1,minEdgeCompression:1,maxAbdomenDisplacementP95TorsoFraction:0,maxAbdomenDisplacementTorsoFraction:0,minAbdomenSectionAreaRatio:1,maxAbdomenSectionAreaRatio:1,minHindSectionAreaRatio:1,maxHindSectionAreaRatio:1,samples:[],failures:[]};
const quantile=(a,p)=>a.slice().sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(p*(a.length-1)))]??0;
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
function skin(parts,root){const inverse=root.matrixWorld.clone().invert(),v=new THREE.Vector3();return parts.map(part=>Array.from({length:part.geometry.attributes.position.count},(_,i)=>part.getVertexPosition(i,v).applyMatrix4(part.matrixWorld).applyMatrix4(inverse).toArray()));}
function family(name){return /_(shoulder|elbow|carpus|front_fetlock|scapula)$/.test(name)?'forelimb':/_(hip|stifle|hock|rear_fetlock)$/.test(name)?'hindlimb':/head|neck/.test(name)?'head-neck':/tail/.test(name)?'tail':'axial';}
function influences(part,index){const ids=part.geometry.attributes.skinIndex,w=part.geometry.attributes.skinWeight;return Array.from({length:4},(_,i)=>({bone:part.skeleton.bones[ids.getComponent(index,i)]?.name,weight:w.getComponent(index,i)})).filter(v=>v.weight>.05);}
function sectionAnalysis(positions,triangles,x,limbTriangles=[]){let area=0,axialSignedArea=0,limbSignedArea=0,limbTriangleCount=0;const nodes=[],buckets=new Map();
  const endpoint=point=>{const cell=point.map(v=>Math.floor(v/1e-6));for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)for(const id of buckets.get(`${cell[0]+y}/${cell[1]+z}`)??[])if(Math.hypot(...point.map((v,i)=>v-nodes[id].point[i]))<=1e-6){nodes[id].degree++;return;}const id=nodes.length;nodes.push({point,degree:1});const key=cell.join('/');if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(id);};
  for(let p=0;p<positions.length;p++){const verts=positions[p];for(const [triangleIndex,[a,b,c]]of triangles[p].entries()){
  const v=[verts[a],verts[b],verts[c]],hits=[];
  for(let i=0;i<3;i++){const u=v[i],w=v[(i+1)%3];if((u[0]<=x&&w[0]>x)||(u[0]>x&&w[0]<=x)){const t=(x-u[0])/(w[0]-u[0]);hits.push([u[1]+t*(w[1]-u[1]),u[2]+t*(w[2]-u[2])]);}}
  if(hits.length!==2)continue;
  const e=v[1].map((n,i)=>n-v[0][i]),f=v[2].map((n,i)=>n-v[0][i]);
  const ny=e[2]*f[0]-e[0]*f[2],nz=e[0]*f[1]-e[1]*f[0];
  if((hits[1][0]-hits[0][0])*nz-(hits[1][1]-hits[0][1])*ny<0)hits.reverse();
  const contribution=(hits[0][0]*hits[1][1]-hits[1][0]*hits[0][1])*.5;area+=contribution;
  if(limbTriangles[p]?.[triangleIndex]){limbSignedArea+=contribution;limbTriangleCount++;}else axialSignedArea+=contribution;
  hits.forEach(endpoint);
}}return{area:Math.abs(area),signedArea:area,axialSignedArea,limbSignedArea,limbTriangleCount,closed:nodes.length>0&&nodes.every(n=>n.degree===2),endpointCount:nodes.length,nonDegreeTwoEndpoints:nodes.filter(n=>n.degree!==2).length};}
// Independent negative control: a closed central cube section bulges 10% in
// each transverse axis. Its 21% area growth must violate the unchanged 15% gate.
const syntheticBox=new THREE.BoxGeometry(2,2,2),syntheticPositions=[Array.from({length:syntheticBox.attributes.position.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(syntheticBox.attributes.position,i).toArray())],syntheticTriangles=[Array.from({length:syntheticBox.index.count/3},(_,i)=>Array.from(syntheticBox.index.array.slice(i*3,i*3+3)))];
const syntheticNeutral=sectionAnalysis(syntheticPositions,syntheticTriangles,0),syntheticBulge=sectionAnalysis(syntheticPositions.map(vs=>vs.map(([x,y,z])=>[x,y*1.1,z*1.1])),syntheticTriangles,0);
assert.ok(syntheticNeutral.closed&&syntheticBulge.closed,'Synthetic central section must be closed');
assert.ok(syntheticBulge.area/syntheticNeutral.area>limits.abdomenSectionAreaMax,'Actual central bulge must still fail the unchanged gate');syntheticBox.dispose();
report.centralBulgeNegativeControl={areaRatio:syntheticBulge.area/syntheticNeutral.area,rejected:true};
function orientedVolume(positions,triangles){let value=0;for(let p=0;p<positions.length;p++)for(const[ia,ib,ic]of triangles[p]){const[a,b,c]=[positions[p][ia],positions[p][ib],positions[p][ic]];value+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return value;}
try{
  const cases=[{}, {juvenile:1}, {bodyCondition:1,legLength:1}, {legLength:-1}];
  if(matrixOption==='--all-controls')for(const values of[...FAUNA_TEMPLATE_CONTROLS.flatMap(id=>[sidecar.controls[id].min,1].map(value=>({[id]:value}))),{juvenile:1,legLength:-1,neckLength:1}])if(!cases.some(c=>JSON.stringify(c)===JSON.stringify(values)))cases.push(values);
  for(const controls of cases){
    const instance=template.instantiate();instance.apply(controls);const motion=createFaunaTemplateMotion(instance);motion.update(0,{gait:'neutral'});
    const parts=[];instance.root.traverse(o=>{if(o.isSkinnedMesh)parts.push(o);});
    const neutral=skin(parts,instance.root),inverse=instance.root.matrixWorld.clone().invert();
    const joint=id=>instance.bones.get(id).getWorldPosition(new THREE.Vector3()).applyMatrix4(inverse);
    const hipX=(joint('L_hip').x+joint('R_hip').x)/2,shoulderX=(joint('L_shoulder').x+joint('R_shoulder').x)/2,span=shoulderX-hipX,chestY=joint('chest').y;
    const sections=[.25,.4,.55].map(t=>hipX+t*span);
    const triangles=parts.map(part=>{const index=part.geometry.index,values=index?Array.from(index.array):Array.from({length:part.geometry.attributes.position.count},(_,i)=>i);return Array.from({length:values.length/3},(_,i)=>values.slice(i*3,i*3+3));});
    const limbTriangles=triangles.map((ts,p)=>{const ids=parts[p].geometry.attributes.skinIndex,weights=parts[p].geometry.attributes.skinWeight;return ts.map(tri=>tri.some(i=>Array.from({length:4},(_,j)=>weights.getComponent(i,j)>1e-6&&['forelimb','hindlimb'].includes(family(parts[p].skeleton.bones[ids.getComponent(i,j)].name))).some(Boolean)));});
    const edges=triangles.map((ts,p)=>{const map=new Map();for(const tri of ts)for(let k=0;k<3;k++){const a=Math.min(tri[k],tri[(k+1)%3]),b=Math.max(tri[k],tri[(k+1)%3]),key=`${a}/${b}`;if(!map.has(key)){const length=distance(neutral[p][a],neutral[p][b]);if(length>1e-6)map.set(key,{a,b,length});}}return[...map.values()];});
    const abdomen=neutral.map(vertices=>vertices.flatMap((v,i)=>v[0]>=hipX+.35*span&&v[0]<=hipX+.60*span&&v[1]>=chestY*.65&&v[1]<=chestY?[i]:[]));
    assert.ok(abdomen.reduce((n,a)=>n+a.length,0)>20,'regional gate needs a meaningful belly surface sample');
    const restSections=sections.map(x=>sectionAnalysis(neutral,triangles,x,limbTriangles)),restAreas=restSections.map(s=>s.area);assert.ok(restAreas.every(a=>a>.005),'neutral crosssections enclose positive area');
    const checkSectionScope=(details,frame)=>{details.slice(1).forEach((s,i)=>{if(!s.closed||s.limbTriangleCount!==0)report.failures.push({metric:'centralAbdomenSectionScope',controls,frame,x:sections[i+1],closed:s.closed,limbTriangleCount:s.limbTriangleCount,nonDegreeTwoEndpoints:s.nonDegreeTwoEndpoints});});};
    checkSectionScope(restSections,'neutral');
    const restVolume=orientedVolume(neutral,triangles);
    const regionTests={dorsalTrunk:v=>v[0]>=hipX&&v[0]<=shoulderX&&v[1]>=chestY,
      forelimbs:v=>v[0]>hipX+.65*span&&v[1]<chestY*.86,hindlimbs:v=>v[0]<hipX+.25*span&&v[1]<chestY*.90,
      neckAndHead:v=>v[0]>shoulderX&&v[1]>chestY};
    const sourceLegWeights=abdomen.flatMap((indices,p)=>indices.map(i=>({vertex:i,part:parts[p].name,point:neutral[p][i],weights:influences(parts[p],i)}))).filter(v=>v.weights.some(w=>['forelimb','hindlimb'].includes(family(w.bone))));
    const result={controls,abdomenVertexCount:abdomen.reduce((n,a)=>n+a.length,0),abdomenVerticesWithLimbWeight:sourceLegWeights.length,sourceLimbWeightExamples:sourceLegWeights.slice(0,8),sections,sectionRoles:['hind-thigh-diagnostic','central-abdomen-gate','central-abdomen-gate'],restSectionAreas:restAreas,restSections,frames:[]};
    for(let frame=0;frame<24;frame++){
      const time=frame*motion.measurements.cycleS/24;motion.update(time,{gait:'walk',inPlace:true});const posed=skin(parts,instance.root);
      const ratios=[],displacements=[],extremes=[];
      for(let p=0;p<parts.length;p++){
        for(const e of edges[p]){const ratio=distance(posed[p][e.a],posed[p][e.b])/e.length;ratios.push(ratio);
          if(ratio>limits.edgeStretchMax||ratio<limits.edgeCompressionMin){const weights=[influences(parts[p],e.a),influences(parts[p],e.b)];extremes.push({part:parts[p].name,vertices:[e.a,e.b],ratio,sourceBoundaryName:weights.map(ws=>[...new Set(ws.map(w=>family(w.bone)))].sort().join('+')).join(' -> '),neutralPoints:[neutral[p][e.a],neutral[p][e.b]],weights});}}
        for(const i of abdomen[p])displacements.push(distance(neutral[p][i],posed[p][i])/span);
      }
      const sectionDetails=sections.map(x=>sectionAnalysis(posed,triangles,x,limbTriangles)),areas=sectionDetails.map((s,i)=>s.area/restAreas[i]);checkSectionScope(sectionDetails,frame);
      const regions=Object.fromEntries(Object.entries(regionTests).map(([name,accept])=>{const d=neutral.flatMap((verts,p)=>verts.flatMap((v,i)=>accept(v)?[distance(v,posed[p][i])/span]:[]));return[name,{vertices:d.length,displacementP95TorsoFraction:quantile(d,.95),displacementMaxTorsoFraction:Math.max(0,...d)}];}));
      const max=Math.max(...ratios),min=Math.min(...ratios),p95=quantile(displacements,.95),maxD=Math.max(...displacements);
      report.maxEdgeStretch=Math.max(report.maxEdgeStretch,max);report.minEdgeCompression=Math.min(report.minEdgeCompression,min);
      report.maxAbdomenDisplacementP95TorsoFraction=Math.max(report.maxAbdomenDisplacementP95TorsoFraction,p95);report.maxAbdomenDisplacementTorsoFraction=Math.max(report.maxAbdomenDisplacementTorsoFraction,maxD);
      report.minAbdomenSectionAreaRatio=Math.min(report.minAbdomenSectionAreaRatio,...areas.slice(1));report.maxAbdomenSectionAreaRatio=Math.max(report.maxAbdomenSectionAreaRatio,...areas.slice(1));
      report.minHindSectionAreaRatio=Math.min(report.minHindSectionAreaRatio,areas[0]);report.maxHindSectionAreaRatio=Math.max(report.maxHindSectionAreaRatio,areas[0]);
      extremes.sort((a,b)=>Math.abs(Math.log(b.ratio))-Math.abs(Math.log(a.ratio)));
      result.frames.push({time,edgeStretchMax:max,edgeCompressionMin:min,edgeRatioP01:quantile(ratios,.01),edgeRatioP99:quantile(ratios,.99),abdomenDisplacementP95TorsoFraction:p95,abdomenDisplacementMaxTorsoFraction:maxD,abdomenSectionAreaRatios:areas,
        sectionDetails,orientedTriangleVolumeRatio:orientedVolume(posed,triangles)/restVolume,regions,badEdgeCount:extremes.length,worstEdges:extremes.slice(0,5)});
    }
    report.samples.push(result);instance.dispose();
  }
  for(const[metric,bound,direction]of[['maxEdgeStretch',limits.edgeStretchMax,'max'],['minEdgeCompression',limits.edgeCompressionMin,'min'],['maxAbdomenDisplacementP95TorsoFraction',limits.abdomenDisplacementP95TorsoFraction,'max'],['maxAbdomenDisplacementTorsoFraction',limits.abdomenDisplacementMaxTorsoFraction,'max'],['minAbdomenSectionAreaRatio',limits.abdomenSectionAreaMin,'min'],['maxAbdomenSectionAreaRatio',limits.abdomenSectionAreaMax,'max']])if(direction==='max'?report[metric]>bound:report[metric]<bound)report.failures.push({metric,value:report[metric],limit:bound,direction});
  report.ok=report.failures.length===0;
}finally{template.dispose();await fs.mkdir(path.dirname(path.resolve(reportPath)),{recursive:true});await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({...report,samples:report.samples.map(s=>({controls:s.controls,abdomenVertexCount:s.abdomenVertexCount,abdomenVerticesWithLimbWeight:s.abdomenVerticesWithLimbWeight})),report:path.resolve(reportPath)}));
assert.ok(report.ok,`Full-body deformation failed: ${JSON.stringify(report.failures)}`);
