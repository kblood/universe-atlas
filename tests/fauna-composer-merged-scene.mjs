import * as THREE from 'three';
import {composerPreset} from '../src/fauna-composer-recipe.ts';
import {createComposerCreature} from '../src/fauna-composer.ts';
import {FaunaComposerPaletteWriter} from '../src/fauna-composer-palette.ts';
import {FaunaComposerInstanceBatch} from '../src/fauna-composer-instance-batch.ts';
import {FaunaComposerMergedBatch} from '../src/fauna-composer-merged-batch.ts';
import {composerRenderSkin} from '../src/fauna-composer-render-source.ts';
const renderer = new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true}); renderer.setSize(1100,760); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFShadowMap; document.body.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#263b42');scene.add(new THREE.HemisphereLight('#d8edf4','#3e4730',2));
const sun=new THREE.DirectionalLight('#ffffff',4);sun.position.set(8,16,9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-14,right:14,top:14,bottom:-14,near:.1,far:50});sun.shadow.bias=-.0002;scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(40,30),new THREE.MeshStandardMaterial({color:'#61736b',roughness:.9}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const camera=new THREE.PerspectiveCamera(42,1100/760,.1,100);camera.position.set(16,17,22);camera.lookAt(0,1,0);
const patterns=['plain','spots','rosettes','reticulated','dapple','stripes','bands','brindle'];
const creatures=patterns.map((pattern,i)=>createComposerCreature({...composerPreset(i%2?'turtle':'dinosaur'),pattern,colorSeed:9000+i,patternScale:1.8},{presentation:'realism-1'}));
const values=new Float32Array(160*16*8),texture=new THREE.DataTexture(values,640,8,THREE.RGBAFormat,THREE.FloatType);texture.needsUpdate=true;const bones={value:texture};
const skins=creatures.map(c=>composerRenderSkin(c.skin));const merged=new FaunaComposerMergedBatch({maxVertices:skins.reduce((n,s)=>n+s.positions.length/3,0),maxIndices:skins.reduce((n,s)=>n+s.index.length,0),maxActors:8,maxBytes:96*1024*1024,bones});scene.add(merged.mesh);
const baseline=new THREE.Group();scene.add(baseline);const individual=[];
for(let i=0;i<8;i++){const creature=creatures[i],pose=creature.update('walk',.31+i*.13);new FaunaComposerPaletteWriter(creature.graph).write(pose,values,i*160*16);const skin=skins[i],matrix=new THREE.Matrix4().makeTranslation((i%4-1.5)*5.5,i===7?1.4:0,(Math.floor(i/4)-.5)*7);
 const batch=new FaunaComposerInstanceBatch(skin,bones,1);batch.beginFrame();batch.submit(matrix,i);batch.endFrame();baseline.add(batch.mesh);individual.push(batch);merged.register(String(i),skin,i);}
merged.beginFrame();for(let i=0;i<8;i++)merged.submit(String(i),new THREE.Matrix4().makeTranslation((i%4-1.5)*5.5,i===7?1.4:0,(Math.floor(i/4)-.5)*7));merged.endFrame();texture.needsUpdate=true;
const render=mode=>{baseline.visible=mode==='baseline';merged.mesh.visible=mode==='merged';renderer.render(scene,camera);return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};};
const pixels=()=>{const gl=renderer.getContext(),out=new Uint8Array(1100*760*4);gl.readPixels(0,0,1100,760,gl.RGBA,gl.UNSIGNED_BYTE,out);return out;};
const baselineStats=render('baseline'),a=pixels(),mergedStats=render('merged'),b=pixels();let max=0,changed=0,sum=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);max=Math.max(max,d);sum+=d;if(d>2)changed++;}
window.__mergedReview={ready:true,comparison:{max,changedChannelsAbove2:changed,mean:sum/a.length},baselineStats,mergedStats,budget:merged.diagnostics(),patterns,render};
