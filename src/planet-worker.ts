import { buildTile } from './planet-tiles.ts';
import type {Body} from './catalog.ts';
let residentBody:Body|undefined;
self.onmessage = ({data}) => {
  try {
    // Reuse the immutable region object and its spatial index across jobs.
    if(!residentBody||residentBody.seed!==data.body.seed||residentBody.hydrology?.id!==data.body.hydrology?.id)residentBody=data.body;
    const result = buildTile(residentBody!, data.tile, data.relief);
    self.postMessage({key: data.key, result}, [result.positions.buffer, result.parents.buffer, result.normals.buffer, result.materials.buffer, result.uvs.buffer, result.indices.buffer, result.color.buffer]);
  } catch (error) { self.postMessage({key: data.key, error: String(error)}); }
};
