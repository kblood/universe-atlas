import { buildTile } from './planet-tiles.ts';
import type {Body} from './catalog.ts';
let residentBody:Body|undefined;
self.onmessage = ({data}) => {
  try {
    // Reuse the immutable region object and its spatial index across jobs.
    if(!residentBody||residentBody.seed!==data.body.seed||residentBody.hydrology?.id!==data.body.hydrology?.id)residentBody=data.body;
    // `data.waterLevelM`/`data.waterBucket`: planet-renderer.ts's `update()`
    // already snapped these to its `WATER_LEVEL_BUCKET_M` bucket before
    // dispatching this job, so every tile built while that bucket is current
    // gets the exact same value (see that module's own doc for why this
    // matters at tile edges). `waterBucket` is not used here -- only echoed
    // back unchanged alongside the result -- so `install()` can stamp the
    // finished patch with the bucket it was actually built at without the
    // renderer having to recompute it from a float round-trip.
    const result = buildTile(residentBody!, data.tile, data.relief, data.waterLevelM ?? 0);
    const transfer=[result.positions.buffer,result.parents.buffer,result.surfaceHeight.buffer,result.parentHeight.buffer,result.normals.buffer,result.materials.buffer,result.uvs.buffer,result.indices.buffer,result.color.buffer];
    if(result.oceanPositions&&result.oceanParents)transfer.push(result.oceanPositions.buffer,result.oceanParents.buffer);
    self.postMessage({key: data.key, result, waterBucket: data.waterBucket}, transfer);
  } catch (error) { self.postMessage({key: data.key, error: String(error)}); }
};
