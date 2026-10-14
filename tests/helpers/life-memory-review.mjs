/** Test-only ownership receipt. Estimates typed storage, never driver VRAM. */
import {forestMeshBufferFootprint} from '#tree-kit/v1/metrics';
export function lifeMemoryReview({floraMeshes=[],faunaMeshes=[],faunaCachedGeometry=[],hostArrays=[],skeletons=[],forestAccounting,
  reportedFaunaBytes=0,lifeReserveBytes=0,coreAccountedBytes=0,coreReservedCombinedBytes,candidateTypedBytes=0}={}){
  const flora=forestMeshBufferFootprint(floraMeshes),fauna=forestMeshBufferFootprint(faunaMeshes,faunaCachedGeometry);
  const shared=forestMeshBufferFootprint([...floraMeshes,...faunaMeshes],faunaCachedGeometry);
  const buffers=new Set();
  const retain=array=>{if(!ArrayBuffer.isView(array)||buffers.has(array.buffer))return 0;buffers.add(array.buffer);return array.buffer.byteLength;};
  // Deduplicate host allocations against mesh/cache allocations as well.
  for(const geometry of new Set([...floraMeshes,...faunaMeshes].map(m=>m.geometry).concat(faunaCachedGeometry))){
    for(const a of Object.values(geometry.attributes||{}))retain(a.data?.array??a.array);retain(geometry.index?.array);
  }
  for(const m of [...floraMeshes,...faunaMeshes]){retain(m.instanceMatrix?.array);retain(m.instanceColor?.array);}
  let extraCpu=0,boneGpu=0;const palettes=new Set();
  for(const array of hostArrays)extraCpu+=retain(array);
  for(const skeleton of skeletons){
    extraCpu+=retain(skeleton.boneMatrices);extraCpu+=retain(skeleton.boneTexture?.image?.data);
    if(!palettes.has(skeleton)){palettes.add(skeleton);boneGpu+=skeleton.boneTexture?.image?.data?.byteLength??skeleton.boneMatrices?.byteLength??0;}
  }
  const forestCpu=forestAccounting?.retainedCpuBytes??0,forestGpu=forestAccounting?.estimatedGpuBytes??0;
  const lifeCpu=shared.geometryBytes+shared.instanceBytes+extraCpu+forestCpu;
  const lifeGpu=shared.geometryGpuEstimateBytes+shared.instanceGpuEstimateBytes+boneGpu+forestGpu;
  return {basis:'typed backing allocations plus estimated GPU buffer/texture storage; excludes JS objects, workers, driver padding, shaders and allocator overhead',
    flora,fauna,sharedLifeBuffers:shared,extraHostCpuBytes:extraCpu,boneGpuEstimateBytes:boneGpu,forest:forestAccounting??null,
    reportedFaunaBytes,lifeRetainedCpuBytes:lifeCpu,lifeGpuEstimateBytes:lifeGpu,lifeCombinedEstimateBytes:lifeCpu+lifeGpu,
    lifeReserveBytes,existingLifeExcessOverReserveBytes:Math.max(0,lifeCpu+lifeGpu-lifeReserveBytes),
    coreAccountedBytes,coreAccountedPlusMeasuredLifeEstimateBytes:coreAccountedBytes+lifeCpu+lifeGpu,
    ...(coreReservedCombinedBytes===undefined?{}:{coreReservedCombinedBytes,
      coreReservedWithMeasuredLifeEstimateBytes:coreReservedCombinedBytes-lifeReserveBytes+lifeCpu+lifeGpu}),
    candidate:{incrementalTypedCpuGpuEstimateBytes:candidateTypedBytes,combinedLifeAfterAdditionEstimateBytes:lifeCpu+lifeGpu+candidateTypedBytes,
      scope:'addition estimate only; replacing an existing renderer requires subtracting that renderer actual ownership first'},
    exclusions:['forest estimate uses its own ownership scope; shared resources across forest/life owners require a global ownership registry',
      'hostArrays must enumerate retained typed caches; JS recipes/genomes and source objects are not byte-estimated',
      'accounted core excludes life reserve; adding measured life is only a partial allocated-core estimate and still excludes clouds/environment not in accountedBytes',
      'only reservedCombinedBytes includes the fixed life reserve; replacing it preserves all other admission reserves',
      'neither combined core estimate is a GPU-only VRAM measurement']};
}
