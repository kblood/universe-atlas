/** Independent receipt audits. Collectors must read actual production buffers,
 * poses, ground samples and counters; these functions do not build a renderer. */
import assert from 'node:assert/strict';

/** Late results may be correctly discarded. A disposed owner must neither
 * regain resources nor admit another source after its disposal receipt. */
export function auditDisposedComposer(receipt){
 assert.equal(receipt.after.disposed,true,'actual owner disposed');
 for(const field of ['entries','actors','mergedBindings','levelOwners','ready','desired','ownedBytes','ownedLiveWorkers'])assert.equal(receipt.after[field],0,`disposed owner retains ${field}`);
 assert.equal(receipt.after.running,false,'disposed worker transaction settled');
 assert.equal(receipt.after.groupAttached,false,'disposed draw group detached');
 assert.equal(receipt.after.acceptedBuilds,receipt.atDispose.acceptedBuilds,'source admitted after disposal');
 assert(receipt.after.staleDiscarded>=receipt.atDispose.staleDiscarded,'discard counter monotonic');
 return {postDisposeAdoptions:0,staleDiscarded:receipt.after.staleDiscarded-receipt.atDispose.staleDiscarded,ownedBytes:0,scope:'actual disposed owner after cancelled/late transaction settlement'};
}

export function requirePlanetComposerPins(policy){
 assert.equal(policy?.schema,'planet-composer-acceptance-policy-1');
 assert.equal(policy.ownerApproved,true,'coordinator-approved numeric pins required');
 assert(typeof policy.approvedBy==='string'&&policy.approvedBy.trim());
 assert(Array.isArray(policy.approvedLayouts)&&policy.approvedLayouts.length>0);
 for(const field of ['maxActors','maxBonesPerActor','maxFrameTriangles','maxFrameDrawCalls','maxResidentTypedBytes','maxTransientTypedBytes','maxWorkerTypedBytes','maxGpuAllocatedBytes','maxConcurrentWorkers','maxFaunaResidentCombinedBytes','maxCoreReservedBytes'])assert(Number.isFinite(policy[field])&&policy[field]>0,`missing numeric pin: ${field}`);
 for(const field of ['maxPenetrationM','maxStanceGapM','maxDecodedPositionErrorM'])assert(Number.isFinite(policy[field])&&policy[field]>=0,`missing error pin: ${field}`);
 assert(Number.isFinite(policy.minGroundReliefM)&&policy.minGroundReliefM>0,'nonflat ground evidence needs an approved relief pin');
 return policy;
}

export function auditPlanetCanonicalCensus(control,candidate){
 assert.equal(candidate.bodyId,control.bodyId);assert.equal(candidate.worldNs,control.worldNs);
 const a=new Map(control.members.map(m=>[m.id,m])),b=new Map(candidate.members.map(m=>[m.id,m]));
 assert.equal(a.size,control.members.length,'unique baseline canonical IDs');assert.equal(b.size,candidate.members.length,'unique candidate canonical IDs');
 assert.deepEqual([...b.keys()].sort(),[...a.keys()].sort(),'resident canonical census, not visibility-selected list');
 let adults=0,young=0,walking=0,productionPoses=0,retainedUnposed=0;
 for(const [id,x] of a){const y=b.get(id);assert.deepEqual(y.member,x.member,`${id}: seed/species/variant/stage/anchor member preserved`);if(y.activityEvidence==='not-submitted'){assert.equal(y.position,null);assert.equal(y.activity,null);retainedUnposed++;}else{assert.deepEqual(y.position,x.position,`${id}: dated canonical root position`);assert.deepEqual(y.activity,x.activity,`${id}: dated canonical activity`);productionPoses++;}if(y.member.stage==='adult')adults++;if(y.member.stage==='juvenile')young++;if(y.activity?.pose.gait==='walk'){assert(Number.isFinite(y.activity.revolutionS)&&y.activity.revolutionS>0,`${id}: real walking revolution`);walking++;}}
 return {ids:a.size,adults,young,walking,productionPoses,retainedUnposed,scope:'all resident identity; production dated activity only where pose-cache receipt exists; no source/visibility/quality conclusion'};
}

export function auditPlanetComposerSource(runtime,independentKitSource,policy){
 requirePlanetComposerPins(policy);
 assert.equal(runtime.generator,'composer','no silent quadruped generator');
 assert(policy.approvedLayouts.includes(runtime.layout),'layout not generated/approved by the versioned fauna definition');
 assert.equal(runtime.id,independentKitSource.id);assert.equal(runtime.recipeText,independentKitSource.recipeText);
 assert.deepEqual(runtime.definition,independentKitSource.definition,'complete source genome/resolved phenotype/coat/metres, not recipe-only replay');
 assert.deepEqual(runtime.individual,independentKitSource.individual);
 assert.equal(runtime.resolutionPolicy,'resolved-phenotype-neutral-recipe');
 assert.equal(runtime.newVariationApplications,0,'resolved input is not varied again');
 assert.equal(runtime.newGrowthApplications,0,'resolved young input is not scaled again');
 assert.deepEqual(runtime.versions,independentKitSource.versions,'actual recipe/graph/skin/pose versions');
 assert.deepEqual(runtime.sourceBufferDigests,independentKitSource.sourceBufferDigests,'independently built Kit source buffers');
 assert.deepEqual(runtime.boundBoneNames,independentKitSource.boundBoneNames,'actual bound graph bones, not a version label');
 assert.equal(runtime.palette.boneCount,runtime.boundBoneNames.length);assert(runtime.palette.boneStride>=runtime.palette.boneCount,'palette must address variable graph bones');
 assert(runtime.palette.maxJointIndex<runtime.palette.boneCount,'actual JOINT index must fit bound palette');
 assert(runtime.palette.boneCount<=policy.maxBonesPerActor);assert(runtime.decodedPositionErrorM<=policy.maxDecodedPositionErrorM,'actual packed decode error');
 assert(runtime.actualMainCameraDraws>0,'current source must execute a real main-camera draw');assert(runtime.actualChangedPixels>0,'source must contribute viewport pixels');
 return {id:runtime.id,layout:runtime.layout,bones:runtime.palette.boneCount,sourceParity:true,scope:'source bytes/actual bindings; hashes are not visual-quality scores'};
}

export function auditPlanetComposerOwnership(rows,submittedIds){
 const expected=new Set(submittedIds);assert.equal(expected.size,submittedIds.length);const byId=new Map(),tiers={};
 for(const row of rows){assert(expected.has(row.id),'ownership only for submitted canonical IDs');assert.equal(row.generator,'composer','all near/LOD/temporary fallback must remain Composer-derived');assert(typeof row.sourceDigest==='string'&&row.sourceDigest.length>0,'same-source receipt required');assert(Number.isFinite(row.low)&&Number.isFinite(row.high)&&row.low>=0&&row.high<=1&&row.high>=row.low);if(row.high===row.low)continue;const list=byId.get(row.id)||[];list.push(row);byId.set(row.id,list);}
 for(const id of submittedIds){const list=byId.get(id);assert(list?.length,`${id}: missing representation`);assert.equal(new Set(list.map(r=>r.sourceDigest)).size,1,`${id}: source identity crosses ownership handoff`);list.sort((a,b)=>a.low-b.low);let end=0;for(const row of list){assert.equal(row.low,end,`${id}: coverage hole/overlap`);end=row.high;tiers[row.tier]=(tiers[row.tier]||0)+1;}assert.equal(end,1,`${id}: incomplete ownership`);}
 return {represented:byId.size,tiers,scope:'ownership intervals only; current draw/pixel proof is separate'};
}

export function auditPlanetComposerFeet(evidence,policy){
 requirePlanetComposerPins(policy);assert.equal(evidence.kind,'deformed-production-mesh-vertices','solver markers are not mesh soles');
 assert(evidence.samples.length>0);let stance=0,swing=0,min=Infinity,maxStanceGap=-Infinity;const ground=[];
 for(const s of evidence.samples){assert(s.vertexIndices.length>=3&&s.vertexIndices.every(Number.isInteger));assert.equal(s.signedGroundDistancesM.length,s.vertexIndices.length);assert.equal(s.groundHeightsM.length,s.vertexIndices.length);assert(s.signedGroundDistancesM.every(Number.isFinite)&&s.groundHeightsM.every(Number.isFinite));const low=Math.min(...s.signedGroundDistancesM);assert(low>=-policy.maxPenetrationM,`${s.id}/${s.foot}: actual sole penetrates ground`);if(s.stance){stance++;maxStanceGap=Math.max(maxStanceGap,low);assert(low<=policy.maxStanceGapM,`${s.id}/${s.foot}: planted sole floats ${low}m > ${policy.maxStanceGapM}m at ${s.worldNs??'unrecorded date'} tier ${s.tier??'unknown'}`);}else swing++;min=Math.min(min,low);ground.push(...s.groundHeightsM);}
 const relief=Math.max(...ground)-Math.min(...ground);assert(relief>=policy.minGroundReliefM,'fixture must actually exercise nonflat ground');assert(stance>0&&swing>0,'actual samples include stance and swing');
 return {samples:evidence.samples.length,stance,swing,groundReliefM:relief,minSignedGroundDistanceM:min,maxStanceGapM:maxStanceGap};
}

export function auditPlanetComposerBudgets(measured,policy){
 requirePlanetComposerPins(policy);assert.equal(measured.geometryScope,'actual-main-camera-submissions');assert.equal(measured.memoryScope,'owned-typed-and-gpu-allocations-with-transients');
 for(const [value,pin] of [['actors','maxActors'],['frameTriangles','maxFrameTriangles'],['frameDrawCalls','maxFrameDrawCalls'],['residentTypedBytes','maxResidentTypedBytes'],['transientTypedBytes','maxTransientTypedBytes'],['workerTypedBytes','maxWorkerTypedBytes'],['gpuAllocatedBytes','maxGpuAllocatedBytes'],['concurrentWorkers','maxConcurrentWorkers']]){assert(Number.isFinite(measured[value])&&measured[value]>=0,`missing measurement: ${value}`);assert(measured[value]<=policy[pin],`${value}: owner pin exceeded`);}
 assert(measured.residentTypedBytes+measured.gpuAllocatedBytes<=policy.maxFaunaResidentCombinedBytes,'combined fauna CPU+GPU resident ceiling');assert(Number.isFinite(measured.coreReservedBytes)&&measured.coreReservedBytes>=0&&measured.coreReservedBytes<=policy.maxCoreReservedBytes,'whole core reserved ceiling');assert.equal(measured.coreBudgetBytes,policy.maxCoreReservedBytes,'whole core budget must not increase');assert(Number.isFinite(measured.cloudAllocatedBytes)&&measured.cloudAllocatedBytes>=0,'separate actual cloud allocation');return {withinPins:true,scope:'geometry/owned allocation contracts; no frame-time or physical device conclusion'};
}
