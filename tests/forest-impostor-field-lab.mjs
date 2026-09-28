import * as THREE from 'three';
import {ForestImpostors} from '../src/forest-impostor.ts';
import {treeQuaternion,createLegacyTreeGeometry} from '../src/tree-shape.ts';
const worker=new Worker(new URL('./forest-impostor-field-worker.mjs',import.meta.url),{type:'module'});
const data=await new Promise((resolve,reject)=>{worker.onmessage=({data})=>data.error?reject(Error(data.error)):resolve(data);worker.onerror=reject;});worker.terminate();
// super-three requests an alpha canvas even when its alpha option is false.
// The game composites through its postprocess target. This isolated lab uses
// an explicitly opaque context so A2C alpha is not composited over page white.
const canvas=document.createElement('canvas'),context=canvas.getContext('webgl2',{alpha:false,antialias:true,preserveDrawingBuffer:true});
const renderer=new THREE.WebGLRenderer({canvas,context,logarithmicDepthBuffer:true});
renderer.setSize(1440,900);renderer.setClearColor(0x91acc3);renderer.outputColorSpace=THREE.SRGBColorSpace;document.body.append(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(55,1440/900,.1,20000);
const sun=new THREE.DirectionalLight(0xfff4de,2.5);sun.position.set(1000,1800,800);scene.add(sun,new THREE.AmbientLight(0xb2c7e0,.8));
const count=data.records.length/9,far=new ForestImpostors(count),geometry=createLegacyTreeGeometry(0);
const reference=new THREE.InstancedMesh(geometry,new THREE.MeshLambertMaterial({vertexColors:true}),count);reference.frustumCulled=false;
const frame=new THREE.Matrix4().makeBasis(new THREE.Vector3(...data.east),new THREE.Vector3(...data.center),new THREE.Vector3(...data.north));
const inverseFrame=frame.clone().invert(),frameRotation=new THREE.Quaternion().setFromRotationMatrix(inverseFrame);
const origin=new THREE.Vector3(...data.center).multiplyScalar(data.radiusM+data.ground);
const direction=new THREE.Vector3(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scratch=new THREE.Quaternion(),matrix=new THREE.Matrix4(),scale=new THREE.Vector3(),color=new THREE.Color();
for(let i=0;i<count;i++){
  const p=data.records.subarray(i*9,i*9+9);direction.set(p[1],p[2],p[3]);position.copy(direction).multiplyScalar(data.radiusM+p[7]).sub(origin).applyMatrix4(inverseFrame);
  treeQuaternion(direction,p[6],rotation,scratch);rotation.premultiply(frameRotation);
  far.write(i,position,p[5],rotation,p[4],p[7]);matrix.compose(position,rotation,scale.setScalar(p[5]));reference.setMatrixAt(i,matrix);reference.setColorAt(i,color.setRGB(.8+p[4]*.2,.85+p[4]*.15,.75+p[4]*.25));
}
far.commit();scene.add(far.mesh,reference);
const groundGeometry=new THREE.BufferGeometry(),indices=[];groundGeometry.setAttribute('position',new THREE.BufferAttribute(data.terrain,3));
for(let y=0;y<data.size-1;y++)for(let x=0;x<data.size-1;x++){const a=y*data.size+x,b=a+1,c=a+data.size,d=c+1;indices.push(a,c,b,b,c,d);}
groundGeometry.setIndex(indices);groundGeometry.computeVertexNormals();const ground=new THREE.Mesh(groundGeometry,new THREE.MeshLambertMaterial({color:0x6a7543,side:THREE.DoubleSide}));scene.add(ground);
const gl=renderer.getContext(),timer=gl.getExtension('EXT_disjoint_timer_query_webgl2');
const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
const percentile=(a,p)=>[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*p))];
function show(useFar,height=120){reference.visible=!useFar;far.mesh.visible=useFar;camera.position.set(0,height,0);camera.lookAt(0,height*.15,-2000);camera.updateMatrixWorld();renderer.render(scene,camera);}
async function benchmark(useFar,height){
  const cpu=[],gpu=[],frames=[];show(useFar,height);for(let i=0;i<10;i++){await nextFrame();renderer.render(scene,camera);}
  for(let i=0;i<40;i++){
    await nextFrame();const query=timer?gl.createQuery():null;if(query)gl.beginQuery(timer.TIME_ELAPSED_EXT,query);
    const start=performance.now();renderer.render(scene,camera);cpu.push(performance.now()-start);
    if(query){gl.endQuery(timer.TIME_ELAPSED_EXT);gl.flush();let available=false;
      for(let poll=0;poll<120&&!available;poll++){await nextFrame();available=gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE);}
      if(available&&!gl.getParameter(timer.GPU_DISJOINT_EXT))gpu.push(gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6);gl.deleteQuery(query);
    }
    frames.push(performance.now()-start);
  }
  return {useFar,height,samples:cpu.length,cpuSubmitMs:{p50:percentile(cpu,.5),p95:percentile(cpu,.95)},gpuMs:gpu.length?{samples:gpu.length,p50:percentile(gpu,.5),p95:percentile(gpu,.95)}:null,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
}
const ext=gl.getExtension('WEBGL_debug_renderer_info');
window.fieldLab={renderer,scene,camera,far,reference,show,benchmark,summary:{bodyId:data.bodyId,trees:count,patches:data.patches,workerMs:data.workerMs,cache:data.cache,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable',instanceBytes:count*48},dispose(){far.dispose();geometry.dispose();reference.material.dispose();groundGeometry.dispose();ground.material.dispose();renderer.dispose();}};
show(true);window.fieldReady=true;
