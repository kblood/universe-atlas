/** Locator screenshots include overlapping HTML. Hide that overlay temporarily
 * so pixel comparisons measure the WebGL image, including pixels behind panels. */
export async function captureRenderCanvas(page,path){
 await page.evaluate(()=>{const style=document.createElement('style');style.id='test-render-canvas-only';style.textContent='body > :not(#viewport) { visibility: hidden !important; }';document.head.append(style);});
 try{await page.locator('canvas').first().screenshot({path});}
 finally{await page.evaluate(()=>document.querySelector('#test-render-canvas-only')?.remove());}
}
/** Inspect only indexed vertices belonging to uploaded active root rows. */
export async function captureFaunaNormalAndCensus(page,path){
 const census=await page.evaluate(async()=>{
  const a=window.__atlas,d=a.renderDebug(),meshes=[];
  d.planet.faunaLod.group.traverse(o=>{if(o.isMesh)meshes.push(o);});
  const hash=async arrays=>{const joined=new Uint8Array(arrays.reduce((n,a)=>n+a.byteLength,0));let offset=0;for(const array of arrays){joined.set(new Uint8Array(array.buffer,array.byteOffset,array.byteLength),offset);offset+=array.byteLength;}return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',joined))).map(v=>v.toString(16).padStart(2,'0')).join('');};
  const rows=await Promise.all(meshes.map(async mesh=>{
   const g=mesh.geometry,u=d.renderer.properties.get(mesh.material).uniforms,roots=u.faunaRoots.value.image.data;
   const index=g.index.array,actors=g.attributes.faunaActor.array,skin=g.attributes.skinIndex.array;
   const vertices=new Set(),activeSlots=new Set(),distribution=[0,0,0,0,0];
   const end=Math.min(index.length,g.drawRange.start+g.drawRange.count);
   for(let i=g.drawRange.start;i<end;i+=3){const x=index[i],y=index[i+1],z=index[i+2];if(x===y||y===z||z===x)continue;for(const v of [x,y,z]){const slot=actors[v];if(roots[slot*20+16]>=.5){vertices.add(v);activeSlots.add(slot);}}}
   for(const v of vertices)distribution[new Set(skin.slice(v*4,v*4+4)).size]++;
   const baselineFetches=vertices.size*4,reusedFetches=distribution.reduce((sum,count,n)=>sum+count*n,0);
   const bones=u.faunaBones.value.image.data,inputs=[];
   for(const slot of activeSlots){const vs=[...vertices].filter(v=>actors[v]===slot).sort((a,b)=>a-b),arrays=[];
    for(const name of ['position','normal','color','skinIndex','skinWeight']){const attr=g.attributes[name],array=new attr.array.constructor(vs.length*attr.itemSize);for(let i=0;i<vs.length;i++)array.set(attr.array.subarray(vs[i]*attr.itemSize,(vs[i]+1)*attr.itemSize),i*attr.itemSize);arrays.push(array);}
    inputs.push({root:await hash([roots.slice(slot*20,(slot+1)*20)]),bones:await hash([bones.slice(slot*352,(slot+1)*352)]),indexedAttributes:await hash(arrays)});
   }
   inputs.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
   return {vertices:vertices.size,activeSlots:[...activeSlots],distribution,baselineFetches,reusedFetches,savedFraction:1-reusedFetches/baselineFetches,inputs};
  }));
  window.__faunaNormalMaterials=meshes.map(mesh=>{const material=mesh.material,hook=material.onBeforeCompile,key=material.customProgramCacheKey;
   material.onBeforeCompile=function(shader,renderer){hook.call(this,shader,renderer);const end=shader.fragmentShader.lastIndexOf('}');shader.fragmentShader=shader.fragmentShader.slice(0,end)+'gl_FragColor=vec4(normal*0.5+0.5,1.0);\n'+shader.fragmentShader.slice(end);};
   material.customProgramCacheKey=()=>key.call(material)+'/test-posed-normal';material.needsUpdate=true;return {material,hook,key};});
  await new Promise(resolve=>{let n=8;const tick=()=>--n?requestAnimationFrame(tick):resolve();requestAnimationFrame(tick);});
  return rows;
 });
 try{await captureRenderCanvas(page,path);}
 finally{await page.evaluate(async()=>{for(const {material,hook,key} of window.__faunaNormalMaterials){material.onBeforeCompile=hook;material.customProgramCacheKey=key;material.needsUpdate=true;}delete window.__faunaNormalMaterials;await new Promise(resolve=>{let n=8;const tick=()=>--n?requestAnimationFrame(tick):resolve();requestAnimationFrame(tick);});});}
 return census;
}
