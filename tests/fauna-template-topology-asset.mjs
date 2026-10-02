// Independent static audit of a REQUIRED actual exported GLB. CPU only.
// node tests/fauna-template-topology-asset.mjs <candidate-directory> <report.json> [--all-controls] [--walk|--browse]
// Scope: largest connected skin component; neutral default, optional poses. Separate eyes,
// eyelids, hooves and other shells are enumerated, not silently called watertight.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createFaunaTemplate,FAUNA_TEMPLATE_CONTROLS} from '../src/fauna-template.ts';
import {createFaunaTemplateMotion} from '../src/fauna-template-motion.ts';
import {createFaunaTemplateBrowse} from '../src/fauna-template-browse.ts';

const [directory,reportPath,...options]=process.argv.slice(2);
if(!directory||!reportPath)throw new Error('Usage: node tests/fauna-template-topology-asset.mjs <candidate-directory> <report.json>');
if(options.some(v=>!['--all-controls','--walk','--browse'].includes(v)))throw new Error('Unknown topology matrix option');
if(options.includes('--walk')&&options.includes('--browse'))throw new Error('Choose either --walk or --browse for a topology matrix');
const EPS=1e-6,CELL=.04;
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length=v=>Math.hypot(...v);
const distance=(a,b)=>length(sub(a,b));
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const cross2=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const area2=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-a[1]*b[0];},0))/2;
function coplanarOverlap(a,b,normal){
  const axis=normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs)));
  const project=p=>p.filter((_,i)=>i!==axis),clip=b.map(project);
  const sign=Math.sign(cross2(...clip));let polygon=a.map(project);
  for(let i=0;i<3&&polygon.length;i++){
    const u=clip[i],v=clip[(i+1)%3],next=[];
    for(let j=0;j<polygon.length;j++){
      const p=polygon[j],q=polygon[(j+1)%polygon.length];
      const dp=sign*cross2(u,v,p),dq=sign*cross2(u,v,q);
      if(dp>=0)next.push(p);
      if((dp<0&&dq>0)||(dp>0&&dq<0))next.push(lerp(p,q,dp/(dp-dq)));
    }
    polygon=next;
  }
  return polygon.length>=3&&area2(polygon)>EPS*EPS;
}
function planeSegment(vertices,distances){
  const points=[];const add=p=>{if(!points.some(q=>distance(p,q)<=EPS))points.push(p);};
  // Roundoff only: the physical 1 micrometre overlap gate remains EPS. Snapping
  // every near-plane vertex to the plane fabricated long overlap intervals
  // between almost coplanar triangles that only touch at a shared vertex.
  const roundoff=1e-12;
  for(let i=0;i<3;i++){
    const j=(i+1)%3,d=distances[i],e=distances[j];
    if(Math.abs(d)<=roundoff)add(vertices[i]);
    if((d< -roundoff&&e>roundoff)||(d>roundoff&&e< -roundoff))add(lerp(vertices[i],vertices[j],d/(d-e)));
  }
  return points;
}
// Positive-length noncoplanar crossing or positive-area coplanar overlap.
// A shared vertex is not sufficient to exempt a pair: they can cross elsewhere.
function intersection(a,b,shared=0){
  let na=cross(sub(a[1],a[0]),sub(a[2],a[0])),nb=cross(sub(b[1],b[0]),sub(b[2],b[0]));
  const la=length(na),lb=length(nb);if(la<EPS*EPS||lb<EPS*EPS)return null;
  na=na.map(v=>v/la);nb=nb.map(v=>v/lb);
  const da=a.map(p=>dot(nb,sub(p,b[0]))),db=b.map(p=>dot(na,sub(p,a[0])));
  const separated=d=>d.every(v=>v>EPS)||d.every(v=>v<-EPS);
  if(separated(da)||separated(db))return null;
  const direction=cross(na,nb),norm=length(direction);
  if(norm<1e-7){
    if(db.some(d=>Math.abs(d)>EPS))return null;
    return coplanarOverlap(a,b,na)?{kind:'coplanar-overlap'}:null;
  }
  // Noncoplanar triangles sharing an edge intersect precisely on that edge.
  if(shared>=2)return null;
  const pa=planeSegment(a,da),pb=planeSegment(b,db);if(pa.length<2||pb.length<2)return null;
  const axis=direction.map(v=>v/norm),aa=pa.map(p=>dot(p,axis)),bb=pb.map(p=>dot(p,axis));
  const low=Math.max(Math.min(...aa),Math.min(...bb)),high=Math.min(Math.max(...aa),Math.max(...bb));
  return high-low>EPS?{kind:'proper-crossing',intersectionLengthM:high-low}:null;
}
// Independent Three ray/triangle implementation confirms each reported proper
// crossing with actual edge hits, rather than reusing plane interval arithmetic.
function confirmCrossing(a,b){
  const hits=[];
  for(const [from,to]of [[a,b],[b,a]]){
    const vertices=from.map(p=>new THREE.Vector3(...p)),triangle=to.map(p=>new THREE.Vector3(...p));
    for(let i=0;i<3;i++){
      const direction=new THREE.Vector3().subVectors(vertices[(i+1)%3],vertices[i]),extent=direction.length();
      const hit=new THREE.Ray(vertices[i],direction.normalize()).intersectTriangle(...triangle,false,new THREE.Vector3());
      if(hit&&hit.distanceTo(vertices[i])<=extent+EPS*.01&&!hits.some(p=>p.distanceTo(hit)<EPS*.01))hits.push(hit);
    }
  }
  return hits.some(p=>hits.some(q=>p.distanceTo(q)>EPS));
}
// Narrow-phase checks are independent known geometry, not manufactured GLB passes.
assert.ok(intersection([[0,0,0],[1,0,0],[0,1,0]],[[.2,.2,-1],[.2,.2,1],[.8,.2,0]]));
assert.equal(intersection([[0,0,0],[1,0,0],[0,1,0]],[[0,0,1],[1,0,1],[0,1,1]]),null);
assert.equal(intersection([[0,0,0],[1,0,0],[0,1,0]],[[1,0,0],[1,1,0],[0,1,0]],2),null);
assert.ok(intersection([[0,0,0],[1,0,0],[0,1,0]],[[0,0,0],[1,0,0],[.5,.5,0]],2));
assert.equal(intersection([[0,0,0],[1,0,0],[0,1,0]],[[0,0,0],[-1,0,1],[0,-1,1]],1),null);
assert.ok(intersection([[0,0,0],[1,0,0],[0,1,0]],[[0,0,0],[.5,.5,-1],[.5,.5,1]],1));
const intersectionFixtures=JSON.parse(await fs.readFile(new URL('./fixtures/fauna-topology-intersections.json',import.meta.url),'utf8'));
for(const fixture of intersectionFixtures.fixtures){
  const actual=intersection(...fixture.points,fixture.sharedVertices);
  assert.equal(actual?.kind??null,fixture.expected,`Actual ${fixture.candidate} triangles ${fixture.triangles} narrow-phase regression`);
  assert.equal(confirmCrossing(...fixture.points),fixture.expected==='proper-crossing','Independent ray confirmation must agree with actual fixture classification');
}

const sidecar=JSON.parse(await fs.readFile(path.join(directory,'fauna-template.json'),'utf8'));
const bytes=await fs.readFile(path.join(directory,sidecar.runtime));
const loader=new GLTFLoader();loader.register(()=>({name:'ATLAS_CPU_STATIC_TOPOLOGY_AUDIT',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const template=createFaunaTemplate(gltf.scene,sidecar,{ownsSource:true});
const report={ok:false,id:sidecar.id,source:path.resolve(directory),sourceSha256:createHash('sha256').update(bytes).digest('hex'),
  scope:'Exported largest connected skin component only; separate shells enumerated and excluded from intersection gate. Only listed control/pose samples audited. No texture, external-shell penetration or full watertightness claim.',
  expandedControls:options.includes('--all-controls'),walkPoses:options.includes('--walk'),
  browsePoses:options.includes('--browse'),gait:options.includes('--browse')?'browse':options.includes('--walk')?'walk':'neutral',
  limits:{weldDistanceM:EPS,intersectionLengthToleranceM:EPS,coplanarProjectedAreaToleranceM2:EPS*EPS,properIntersectionCount:0,inconsistentSharedEdgeCount:0,degenerateTriangleCount:0,nonmanifoldEdgeCount:0},
  components:[],mainComponent:null,intersections:[],samples:[],failures:[]};
function auditSurface(instance){
  const report={ok:false,components:[],mainComponent:null,intersections:[],failures:[]};
  instance.root.updateMatrixWorld(true);const inverse=instance.root.matrixWorld.clone().invert();
  const parts=[];instance.root.traverse(o=>{if(o.isSkinnedMesh)parts.push(o);});
  const components=[];
  for(const part of parts){
    const point=new THREE.Vector3();const positions=Array.from({length:part.geometry.attributes.position.count},(_,i)=>part.getVertexPosition(i,point).applyMatrix4(part.matrixWorld).applyMatrix4(inverse).toArray());
    const topologyPositions=Array.from({length:part.geometry.attributes.position.count},(_,i)=>point.fromBufferAttribute(part.geometry.attributes.position,i).toArray());
    // Weld source bind positions only for topology classification. Morphs/poses
    // must not turn a collision into a newly shared edge or join separate shells.
    const buckets=new Map(),canonical=[],welded=[];
    for(const p of topologyPositions){
      const cell=p.map(v=>Math.floor(v/EPS));let found=-1;
      search:for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)for(const id of buckets.get(`${cell[0]+x}/${cell[1]+y}/${cell[2]+z}`)??[])if(distance(p,canonical[id])<=EPS){found=id;break search;}
      if(found<0){found=canonical.length;canonical.push(p);const key=cell.join('/');if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(found);}
      welded.push(found);
    }
    const parent=canonical.map((_,i)=>i);const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
    const join=(a,b)=>{parent[find(a)]=find(b);};
    const index=part.geometry.index?.array??positions.map((_,i)=>i),triangles=[];
    for(let i=0;i<index.length;i+=3){
      const ids=Array.from(index.slice(i,i+3)),w=ids.map(id=>welded[id]);join(w[0],w[1]);join(w[1],w[2]);
      const points=ids.map(id=>positions[id]);triangles.push({index:i/3,ids,w,points,min:[0,1,2].map(a=>Math.min(...points.map(p=>p[a]))),max:[0,1,2].map(a=>Math.max(...points.map(p=>p[a])))});
    }
    const groups=new Map();for(const t of triangles){const root=find(t.w[0]);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(t);}
    for(const ts of groups.values())components.push({part,triangles:ts,min:[0,1,2].map(a=>Math.min(...ts.map(t=>t.min[a]))),max:[0,1,2].map(a=>Math.max(...ts.map(t=>t.max[a])))});
  }
  components.sort((a,b)=>b.triangles.length-a.triangles.length);
  report.components=components.map((c,i)=>({id:i,part:c.part.name,triangles:c.triangles.length,bounds:{min:c.min,max:c.max},intersectionAudited:i===0}));
  const main=components[0];assert.ok(main&&main.triangles.length>100,'actual skin component must contain meaningful surface geometry');
  const edges=new Map();let degenerate=0;const slivers=[];
  for(const t of main.triangles){
    const twiceArea=length(cross(sub(t.points[1],t.points[0]),sub(t.points[2],t.points[0])));
    const longest=Math.max(...[0,1,2].map(i=>distance(t.points[i],t.points[(i+1)%3])));
    if(twiceArea<=EPS*EPS||new Set(t.w).size<3)degenerate++;
    const aspect=longest*longest/Math.max(twiceArea,1e-30);if(aspect>30)slivers.push({triangle:t.index,aspectRatio:aspect,points:t.points});
    for(let i=0;i<3;i++){const a=t.w[i],b=t.w[(i+1)%3],key=`${Math.min(a,b)}/${Math.max(a,b)}`;if(!edges.has(key))edges.set(key,[]);edges.get(key).push({triangle:t.index,sign:a<b?1:-1});}
  }
  const boundary=[...edges.values()].filter(e=>e.length===1),nonmanifold=[...edges.values()].filter(e=>e.length>2),inconsistent=[...edges.values()].filter(e=>e.length===2&&e[0].sign===e[1].sign);
  const grid=new Map(),pairs=new Set();let checked=0;
  const weightDescription=t=>t.ids.map(vertex=>{const ids=main.part.geometry.attributes.skinIndex,w=main.part.geometry.attributes.skinWeight;return Array.from({length:4},(_,i)=>({bone:main.part.skeleton.bones[ids.getComponent(vertex,i)]?.name,weight:w.getComponent(vertex,i)})).filter(v=>v.weight>.05);});
  for(let i=0;i<main.triangles.length;i++){
    const t=main.triangles[i],lo=t.min.map(v=>Math.floor((v-EPS)/CELL)),hi=t.max.map(v=>Math.floor((v+EPS)/CELL));
    for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++){
      const key=`${x}/${y}/${z}`;if(!grid.has(key))grid.set(key,[]);const candidates=grid.get(key);
      for(const j of candidates){const pair=i*main.triangles.length+j;if(pairs.has(pair))continue;pairs.add(pair);const u=main.triangles[j];
        if(t.min.some((v,a)=>v>u.max[a]+EPS||t.max[a]<u.min[a]-EPS))continue;
        checked++;const shared=t.w.filter(id=>u.w.includes(id)).length,hit=intersection(t.points,u.points,shared);
        if(hit)report.intersections.push({...hit,independentRayConfirmation:hit.kind==='proper-crossing'?confirmCrossing(t.points,u.points):null,triangles:[u.index,t.index],sharedVertices:shared,points:[u.points,t.points],weights:[weightDescription(u),weightDescription(t)]});
      }
      candidates.push(i);
    }
  }
  const rootNames=['L_hip','R_hip','L_shoulder','R_shoulder'];
  const roots=rootNames.map(name=>({name,point:instance.bones.get(name)?.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverse).toArray()})).filter(r=>r.point);
  const intersectionsByNearestRoot={};
  for(const hit of report.intersections){
    const center=hit.points.flat().reduce((sum,p)=>sum.map((v,a)=>v+p[a]/6),[0,0,0]);
    hit.nearestRoot=roots.slice().sort((a,b)=>distance(center,a.point)-distance(center,b.point))[0]?.name??'unknown';
    intersectionsByNearestRoot[hit.nearestRoot]=(intersectionsByNearestRoot[hit.nearestRoot]??0)+1;
  }
  report.mainComponent={...report.components[0],degenerateTriangleCount:degenerate,boundaryEdgeCount:boundary.length,nonmanifoldEdgeCount:nonmanifold.length,inconsistentSharedEdgeCount:inconsistent.length,inconsistentSharedEdges:inconsistent.slice(0,20),
    sliverTriangleCount:slivers.length,worstSlivers:slivers.sort((a,b)=>b.aspectRatio-a.aspectRatio).slice(0,10),broadPhasePairs:pairs.size,narrowPhasePairs:checked,properIntersectionCount:report.intersections.length,intersectionsByNearestRoot,
    independentlyConfirmedCrossingCount:report.intersections.filter(h=>h.independentRayConfirmation===true).length,independentConfirmationDisagreementCount:report.intersections.filter(h=>h.independentRayConfirmation===false).length};
  if(degenerate)report.failures.push(`Continuous skin has ${degenerate} degenerate triangles`);
  if(inconsistent.length)report.failures.push(`Continuous skin has ${inconsistent.length} inconsistent shared-edge orientations`);
  if(nonmanifold.length)report.failures.push(`Continuous skin has ${nonmanifold.length} nonmanifold edges`);
  if(report.intersections.length)report.failures.push(`Continuous skin has ${report.intersections.length} proper static triangle intersections`);
  report.ok=report.failures.length===0;
  return report;
}
try{
  const cases=options.includes('--all-controls')?[{}, {juvenile:1}, {bodyCondition:1,legLength:1}, {legLength:-1}]:[{}];
  if(options.includes('--all-controls'))for(const values of[...FAUNA_TEMPLATE_CONTROLS.flatMap(id=>[sidecar.controls[id].min,1].map(value=>({[id]:value}))),{juvenile:1,legLength:-1,neckLength:1}])if(!cases.some(c=>JSON.stringify(c)===JSON.stringify(values)))cases.push(values);
  for(const controls of cases){
    const instance=template.instantiate();
    try{
      instance.apply(controls);
      const motion=options.includes('--walk')?createFaunaTemplateMotion(instance):null;
      const browse=options.includes('--browse')?createFaunaTemplateBrowse(instance):null;
      const driver=motion??browse;
      const poses=[{gait:'neutral',phase:0},...(driver?Array.from({length:8},(_,i)=>({gait:browse?'browse':'walk',phase:i/8})):[])];
      for(const pose of poses){
        const time=pose.phase*(driver?.measurements.cycleS??0);
        if(pose.gait==='browse')browse.update(time);
        else motion?.update(time,{gait:pose.gait,inPlace:true});
        const result=auditSurface(instance);
        report.samples.push({controls,pose:{...pose,time},...result});
        for(const reason of result.failures)report.failures.push({controls,pose:{...pose,time},reason});
      }
    }finally{instance.dispose();}
  }
  // Keep the original top-level neutral result fields for existing report readers.
  const neutral=report.samples[0];report.components=neutral.components;report.mainComponent=neutral.mainComponent;report.intersections=neutral.intersections;
  report.maximumIntersectionCount=Math.max(...report.samples.map(s=>s.mainComponent.properIntersectionCount));
  report.ok=report.failures.length===0;
}finally{
  template.dispose();await fs.mkdir(path.dirname(path.resolve(reportPath)),{recursive:true});await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({...report,components:report.components.map(({bounds,...c})=>c),intersections:report.intersections.slice(0,2),samples:report.samples.map(s=>({controls:s.controls,pose:s.pose,ok:s.ok,crossings:s.mainComponent.properIntersectionCount})),report:path.resolve(reportPath)}));
assert.ok(report.ok,`Skin topology failed in ${report.failures.length} checks; see ${reportPath}`);
