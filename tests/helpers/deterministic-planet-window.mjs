/** Exact simulation inputs, real profiler clocks. Recorder runs after the app
 * callback; its external CPU overhead is reported separately. */
export async function sampleDeterministicPlanetWindow(page,{frames=180,stepNs='1000000'}={}){
 return page.evaluate(({frames,stepNs})=>new Promise((resolve,reject)=>{
  const a=window.__atlas,d=a.renderDebug(),p=d.planet,r=d.renderer;
  const wasEnabled=a.renderProfile.enabled,history=a.renderProfile.historyLimit,autoReset=r.info.autoReset;
  const ids=p.faunaDrawnItems.slice(0,p.faunaDrawnCount).map(x=>x.member.id).sort(),idMap=new Map(ids.map((id,i)=>[id,i]));
  const lanes=17,poses=new Float64Array(frames*ids.length*lanes),present=new Uint8Array(frames*ids.length);
  const camera=new Float64Array(frames*48),worker=new Uint32Array(frames*4),recorderMs=new Float64Array(frames),dates=[];
  const nearSlots=p.faunaNear.slots.filter(x=>x.memberId&&x.mesh.visible).sort((x,y)=>x.memberId.localeCompare(y.memberId));
  const nearIds=nearSlots.map(x=>x.memberId),nearBoneFloats=(nearSlots[0]?.skeleton.bones.length??0)*16;
  if(nearSlots.some(x=>x.skeleton.bones.length*16!==nearBoneFloats)){reject(new Error('Inconsistent near skeleton size'));return;}
  // Three pads boneMatrices to a square GPU texture. Only actual bones are
  // authoritative; trailing texture padding is not another skeleton pose.
  const near=new Float32Array(frames*nearSlots.length*nearBoneFloats),nearWorld=new Float64Array(frames*nearSlots.length*16);
  const pools=[];p.faunaLod?.group.traverse(o=>{if(o.isMesh){const u=r.properties.get(o.material).uniforms,roots=u.faunaRoots.value.image.data,slots=[];for(let slot=0;slot<roots.length/20;slot++)if(roots[slot*20+16]>=.5)slots.push(slot);pools.push({mesh:o,slots});}});
  const poolRows=pools.reduce((n,pool)=>n+pool.slots.length,0),palettes=new Float32Array(frames*poolRows*372);
  const initialGenotypes=p.faunaDrawnItems.slice(0,p.faunaDrawnCount).map((item,i)=>[item.member.id,JSON.stringify(p.faunaDrawnGenomes[i])]).sort((x,y)=>x[0].localeCompare(y[0]));
  let recorded=0,previousTick=0,failed=false;
  const rawNames=['cpu/frameWorkMs','gpu/framePassSumMs','gpu/sceneCaptureMs','frameIntervalMs','cpu/system/faunaMs','cpu/system/shadowMs','cpu/system/otherMs','drawCalls','triangles'];
  const restore=()=>{a.setExplorationPaused(true);a.setExplorationStepNs(null);a.setProfiling(wasEnabled);a.setProfileHistory(history);r.info.autoReset=autoReset;if(!wasEnabled)r.info.reset();};
  const base64=array=>{const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);let string='';for(let i=0;i<bytes.length;i+=32768)string+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(string);};
  const fail=error=>{failed=true;restore();reject(error);};
  const finish=()=>{const clock=a.explorationStep,profile=a.renderProfile,raw=a.renderProfileSamples(rawNames);for(const name of rawNames)raw[name]=raw[name].slice(0,frames);
   if(profile.skippedQueries||profile.disjointQueries||raw['cpu/frameWorkMs'].length!==frames||raw['gpu/framePassSumMs'].length!==frames){fail(new Error('Incomplete deterministic profiler samples'));return;}
   const result={scope:'180 exact simulation ticks; real CPU/GPU clocks; raw first180 complete native profiler samples, then query drain with simulation held',clock,dates,ids,nearIds,nearBoneFloats,initialGenotypes,poolSlots:pools.map(pool=>pool.slots),profile,raw,
    buffers:{poses:base64(poses),present:base64(present),camera:base64(camera),worker:base64(worker),near:base64(near),nearWorld:base64(nearWorld),palettes:base64(palettes),recorderMs:base64(recorderMs)}};
   restore();resolve(result);
  };
  let drainFrames=0;
  const drain=()=>{if(a.renderProfileSamples(['gpu/framePassSumMs'])['gpu/framePassSumMs'].length>=frames){finish();return;}if(++drainFrames>60){fail(new Error('GPU drain timed out'));return;}requestAnimationFrame(drain);};
  const tick=()=>{if(failed)return;try{
   const clock=a.explorationStep;if(clock.ticks===previousTick){requestAnimationFrame(tick);return;}
   if(clock.ticks!==previousTick+1||recorded>=frames)throw new Error('Missed or duplicate simulation frame');previousTick=clock.ticks;
   const start=performance.now(),f=recorded++;dates.push(a.date.offsetNs);
   camera.set(d.camera.matrixWorld.elements,f*48);camera.set(p.group.matrixWorld.elements,f*48+16);camera.set(p.faunaRenderer.group.matrixWorld.elements,f*48+32);
   for(let i=0;i<p.faunaDrawnCount;i++){const item=p.faunaDrawnItems[i],ordinal=idMap.get(item.member.id);if(ordinal===undefined)throw new Error('New canonical member in steady diagnostic');present[f*ids.length+ordinal]=1;
    const n=(f*ids.length+ordinal)*lanes,b=item.activity,pose=b.pose,q=item.quaternion,v=item.position;
    poses[n]=v.x;poses[n+1]=v.y;poses[n+2]=v.z;poses[n+3]=q.x;poses[n+4]=q.y;poses[n+5]=q.z;poses[n+6]=q.w;
    poses[n+7]=pose.x;poses[n+8]=pose.z;poses[n+9]=pose.yaw;poses[n+10]=pose.gait==='idle'?0:pose.gait==='walk'?1:2;
    poses[n+11]=b.stateS;poses[n+12]=b.travel;poses[n+13]=b.revolutionS;poses[n+14]=item.distance;poses[n+15]=item.cameraVisible?1:0;poses[n+16]=p.faunaRigged.has(item.member.id)?1:0;
   }
   for(let i=0;i<nearSlots.length;i++){const slot=nearSlots[i];if(slot.memberId!==nearIds[i])throw new Error('Near owner changed during steady diagnostic');near.set(slot.skeleton.boneMatrices.subarray(0,nearBoneFloats),(f*nearSlots.length+i)*nearBoneFloats);nearWorld.set(slot.mesh.matrixWorld.elements,(f*nearSlots.length+i)*16);}
   let actor=0;for(const pool of pools){const u=r.properties.get(pool.mesh.material).uniforms,roots=u.faunaRoots.value.image.data,bones=u.faunaBones.value.image.data;for(const slot of pool.slots){const n=(f*poolRows+actor++)*372;palettes.set(roots.subarray(slot*20,(slot+1)*20),n);palettes.set(bones.subarray(slot*352,(slot+1)*352),n+20);}}
   const c=p.faunaLod;worker[f*4]=c?.running?1:0;worker[f*4+1]=c?.pending?1:0;worker[f*4+2]=c?.desired.size??0;worker[f*4+3]=c?.submitted.size??0;
   recorderMs[f]=performance.now()-start;
   if(recorded===frames){if(!clock.held)throw new Error('Simulation failed to hold after exact tick limit');requestAnimationFrame(drain);return;}requestAnimationFrame(tick);
  }catch(error){fail(error);}};
  a.setProfiling(true);a.resetProfile();a.setProfileHistory(frames+64);a.setExplorationStepNs(stepNs,frames);a.setExplorationPaused(false);requestAnimationFrame(tick);
 }),{frames,stepNs});
}
