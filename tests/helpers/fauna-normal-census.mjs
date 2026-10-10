/** Inspect only indexed vertices belonging to uploaded active root rows. */
export async function captureFaunaNormalAndCensus(page,path){
 const census=await page.evaluate(async()=>{
  const a=window.__atlas,d=a.renderDebug(),meshes=[];
  d.planet.faunaLod.group.traverse(o=>{if(o.isMesh)meshes.push(o);});
  const rows=meshes.map(mesh=>{
   const g=mesh.geometry,u=d.renderer.properties.get(mesh.material).uniforms,roots=u.faunaRoots.value.image.data;
   const index=g.index.array,actors=g.attributes.faunaActor.array,skin=g.attributes.skinIndex.array;
   const vertices=new Set(),activeSlots=new Set(),distribution=[0,0,0,0,0];
   const end=Math.min(index.length,g.drawRange.start+g.drawRange.count);
   for(let i=g.drawRange.start;i<end;i+=3){const x=index[i],y=index[i+1],z=index[i+2];if(x===y||y===z||z===x)continue;for(const v of [x,y,z]){const slot=actors[v];if(roots[slot*20+16]>=.5){vertices.add(v);activeSlots.add(slot);}}}
   for(const v of vertices)distribution[new Set(skin.slice(v*4,v*4+4)).size]++;
   const baselineFetches=vertices.size*4,reusedFetches=distribution.reduce((sum,count,n)=>sum+count*n,0);
   return {vertices:vertices.size,activeSlots:[...activeSlots],distribution,baselineFetches,reusedFetches,savedFraction:1-reusedFetches/baselineFetches};
  });
  window.__faunaNormalMaterials=meshes.map(mesh=>{const material=mesh.material,hook=material.onBeforeCompile,key=material.customProgramCacheKey;
   material.onBeforeCompile=function(shader,renderer){hook.call(this,shader,renderer);const end=shader.fragmentShader.lastIndexOf('}');shader.fragmentShader=shader.fragmentShader.slice(0,end)+'gl_FragColor=vec4(normal*0.5+0.5,1.0);\n'+shader.fragmentShader.slice(end);};
   material.customProgramCacheKey=()=>key.call(material)+'/test-posed-normal';material.needsUpdate=true;return {material,hook,key};});
  await new Promise(resolve=>{let n=8;const tick=()=>--n?requestAnimationFrame(tick):resolve();requestAnimationFrame(tick);});
  return rows;
 });
 try{await page.locator('canvas').first().screenshot({path});}
 finally{await page.evaluate(async()=>{for(const {material,hook,key} of window.__faunaNormalMaterials){material.onBeforeCompile=hook;material.customProgramCacheKey=key;material.needsUpdate=true;}delete window.__faunaNormalMaterials;await new Promise(resolve=>{let n=8;const tick=()=>--n?requestAnimationFrame(tick):resolve();requestAnimationFrame(tick);});});}
 return census;
}
