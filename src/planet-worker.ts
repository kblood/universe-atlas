import { buildTile } from './planet-tiles.ts';
self.onmessage = ({data}) => {
  try {
    const result = buildTile(data.body, data.tile, data.relief);
    self.postMessage({key: data.key, result}, [result.positions.buffer, result.parents.buffer, result.normals.buffer, result.materials.buffer, result.uvs.buffer, result.indices.buffer, result.color.buffer]);
  } catch (error) { self.postMessage({key: data.key, error: String(error)}); }
};
