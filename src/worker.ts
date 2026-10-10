import { overview, sector, surfaceTexture } from "./catalog.ts";
import { sectorView, galaxyClouds, systemContext } from "./context.ts";
import { starMap, starChunk } from "./star-map.ts";
import { planetSurface } from "./terrain.ts";
import {surfaceSurvey} from './surface-survey.ts';
import {findAnimalWorlds} from './animal-world-finder.ts';
import {buildFaunaBodyLodChain} from './fauna-body-lod.ts';
/** Derive from a cloned loaded body. Never return/transfer the source buffers. */
function animalLods(args:any){
  const chain=buildFaunaBodyLodChain(args.source,args.options);
  return {version:chain.version,provenance:chain.provenance,levels:chain.levels};
}
self.onmessage = ({ data }) => {
  const { id, kind, args } = data;
  try {
    const result =
      kind === 'fauna-derived-lods' ? animalLods(args)
      : kind === 'animal-worlds' ? findAnimalWorlds({seed:args.seed,galaxy:args.galaxy,
        refs:starMap(args.galaxy).refs,dateNs:BigInt(args.dateNs),versions:args.versions,startIndex:args.startIndex})
      : kind === 'surface-survey' ? surfaceSurvey(args.body) : kind === "space-chunk"
        ? starChunk(args.galaxy, args.coords)
        : kind === "universe-view"
          ? { galaxyClouds: galaxyClouds(args.galaxies, 650) }
          : kind === "galaxy-view"
            ? {
                focus: overview(args.galaxy, 26000),
                starMap: starMap(args.galaxy),
                galaxyClouds: galaxyClouds(
                  args.galaxies.filter((g: any) => g.id !== args.galaxy.id),
                ),
              }
            : kind === "surface"
              ? planetSurface(args.body, args.width, args.segments)
              : kind === "system-surfaces"
                ? {
                    ...systemContext(
                      args.galaxy,
                      args.coords,
                      args.ref,
                      args.galaxies,
                    ),
                    surfaces: args.bodies.map((body: any) => ({
                      id: body.id,
                      ...planetSurface(
                        body,
                        body.kind === "moon" ? 64 : 256,
                        body.kind === "moon" ? 16 : 40,
                      ),
                    })),
                  }
                : kind === "sector-view"
                  ? {
                      ...starChunk(args.galaxy, args.coords),
                      sky: overview(args.galaxy, 24000),
                      galaxyClouds: galaxyClouds(
                        args.galaxies.filter(
                          (g: any) => g.id !== args.galaxy.id,
                        ),
                      ),
                      starMap: starMap(args.galaxy),
                    }
                  : kind === "overview"
                    ? overview(args.galaxy, args.count)
                    : kind === "sector"
                      ? sector(args.galaxy, args.coords)
                      : surfaceTexture(args.body, args.width);
    const transfers = new Set<Transferable>();
    const visited = new Set<object>();
    const collect = (value: unknown) => {
      if (ArrayBuffer.isView(value)) {
        if(value.buffer instanceof ArrayBuffer)transfers.add(value.buffer);
      } else if (value && typeof value === "object" && !visited.has(value)) {
        visited.add(value);
        Object.values(value).forEach(collect);
      }
    };
    collect(result);
    self.postMessage({ id, result }, [...transfers]);
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
};
