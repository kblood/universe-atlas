import {
  hash64,
  macroHeightCode,
  noise,
  type Body,
  type V3,
} from "./catalog.ts";
import { sampleRiverRegion } from './river-sample.ts';
import {regionalLandformHeight,REGIONAL_LANDFORM_VERSION} from './regional-landform.ts';

export const TERRAIN_VERSION = "terrain-1.2.0";
export {REGIONAL_LANDFORM_VERSION};
export const ELEVATION_RANGE_M = 60000;
/** Physical ground and a separately-owned water surface. `visibleHeightM` is
 * retained solely as the legacy presentation/navigation compatibility value. */
export type SurfaceSample = {
  elevationM:number; ocean:boolean; color:number[]; roughness:number;
  groundHeightM:number; waterHeightM:number|null; waterDepthM:number;
  /** @deprecated Compatibility aliases for pre-shore callers. */
  rockHeightM:number; waterLevelM:number|null; visibleHeightM:number;
  wet:boolean; waterKind:'river'|'lake'|null; bank:number; channelId:string|null;
  flow:[number,number]; influence:number;
};
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mix = (a: number[], b: number[], t: number) =>
  a.map((v, i) => v + (b[i] - v) * clamp(t));

/** Shared dry-bank tint for orbit pixels and terrain-tile colour maps. The
 * sampler's normalized bank/influence field owns both the shoreline falloff
 * and its regional extent; no renderer-local shoreline is invented here. */
function regionalBankColor(body:Body,d:V3,elevationM:number,color:number[],river:{wet:boolean;bank:number;influence:number}){
  const temperate=body.water>0&&body.temperatureK>=250&&body.temperatureK<=325&&body.type!=='Ice world'&&body.type!=='Volcanic world';
  const snow=clamp((Math.abs(d[1])-.79)*7+Math.max(0,elevationM-2600)/3300);
  // Terrain samples have no normal here; retain elevated mountain colouring
  // rather than replacing it with a river-bank biome.
  if(!temperate||river.wet||river.influence<=0||snow>.2||elevationM>1800)return color;
  const shore=clamp(river.bank)**4;
  const regional=mix([65,86,44],[115,111,85],shore);
  return mix(color,regional,river.influence);
}

/** One continuous direction-space field for orbital geometry, colour and detail.
 * Keeps the catalogue's macro-continent seed; no longitude or LOD-dependent noise. */
/** The unmodified terrain-1.1.0 field. Keep this separate from physical
 * hydrology: drainage analysis and old addresses must retain this exact field. */
export function baseTerrainSampler(body: Body) {
  const code = Number(hash64(body.seed + "/macro-v1") & 0xffffffffn);
  const n = (d: V3, f: number, seed: number) =>
    noise(d[0] * f + 13, d[1] * f + 37, d[2] * f + 19, code + seed);
  const sea = 0.37 + body.water * 0.22;
  return (d: V3) => {
    const macro = macroHeightCode(code, d);
    if (body.type === "Gas giant") {
      const turbulence = n(d, 9, 24),
        bands = 0.5 + 0.5 * Math.sin(d[1] * 75 + turbulence * 8);
      const fine = n(d, 80, 22);
      return {
        elevationM: 0,
        ocean: false,
        color: mix([135, 98, 68], [225, 197, 153], bands * 0.8 + fine * 0.2),
        roughness: 1,
      };
    }
    const coast =
      macro + (n(d, 42, 5) - 0.5) * 0.012 + (n(d, 90, 6) - 0.5) * 0.003;
    const ridges = (1 - Math.abs(n(d, 30, 7) * 2 - 1)) ** 5;
    const fine = (n(d, 80, 8) - 0.5) * 380 + (n(d, 155, 9) - 0.5) * 95;
    const landFactor = clamp((coast - sea) * 12);
    let elevationM = body.water
      ? (coast - sea) * 47000 + ridges * 2800 * landFactor + fine * landFactor
      : (macro - 0.46) * 44000 + ridges * 1800 + fine;
    elevationM =
      clamp(elevationM, -16000, 18000) * Math.min(1, body.radiusM / 2e6);
    // Metre-based wavelengths, shared by collision, orbit previews and tiles.
    // Positive land detail fades to zero at sea level, preserving every coast.
    const landDetail = body.water ? clamp(elevationM / 700) : 1;
    if (landDetail > 0) {
      const hills = (1 - Math.abs(n(d, body.radiusM / 6500, 71) * 2 - 1)) ** 3;
      const gullies = n(d, body.radiusM / 1400, 72);
      const rocks = n(d, body.radiusM / 260, 73);
      elevationM += (hills * 620 + gullies * 130 + rocks * 22) * landDetail;
    }
    const ocean = !!body.water && elevationM < 0;
    const latitude = Math.abs(d[1]);
    const snow = clamp(
      (latitude - 0.79) * 7 + Math.max(0, elevationM - 2600) / 3300,
    );
    let color: number[];
    if (ocean) {
      color = mix(
        [26, 114, 139],
        [5, 25, 58],
        Math.sqrt(clamp(-elevationM / 5500)),
      );
      if (latitude > 0.94)
        color = mix(color, [202, 225, 234], clamp((latitude - 0.94) * 25));
    } else if (body.water) {
      const moisture = n(d, 5, 30);
      const aridity = clamp(
        (0.5 - moisture) * 4 + (latitude > 0.18 && latitude < 0.52 ? 0.17 : 0),
      );
      color = mix([40, 89, 48], [173, 145, 89], aridity);
      color = mix(color, [134, 124, 107], clamp((elevationM - 1500) / 4300));
      if (elevationM < 120)
        color = mix([185, 175, 128], color, elevationM / 120);
      color = mix(color, [216, 228, 226], snow);
    } else if (body.type === "Ice world") {
      color = mix([119, 156, 178], [218, 232, 239], macro * 0.8 + ridges * 0.2);
    } else if (body.type === "Volcanic world") {
      color = mix([49, 42, 42], [131, 85, 62], macro);
    } else {
      color = mix([55, 51, 49], [168, 154, 135], macro);
    }
    const grain = 0.91 + n(d, 115, 35) * 0.18;
    const localGrain = ocean ? 1 : .88 + n(d, body.radiusM / 800, 74) * .24;
    return {
      elevationM,
      ocean,
      color: color.map((v) => clamp(v * grain * localGrain, 0, 255)),
      roughness: ocean ? 0.28 : 0.9,
    };
  };
}

/**
 * Terrain plus an optional immutable physical-water region.  Capturing the
 * region in this closure is deliberate: an existing renderer or flight query
 * cannot observe a later body-model replacement halfway through a frame.
 */
export function terrainSampler(body: Body) {
  const base = baseTerrainSampler(body), region = body.hydrology;
  return (d: V3) => {
    const sample = base(d);
    const ocean = sample.ocean;
    const baseline:SurfaceSample = {
      // Keep the common no-region path to one result allocation. Do not spread
      // a sampler result for every tile vertex: this is the hot terrain loop.
      elevationM: sample.elevationM,
      ocean,
      color: sample.color,
      roughness: sample.roughness,
      rockHeightM: sample.elevationM,
      waterLevelM: ocean ? 0 : null,
      visibleHeightM: ocean ? 0 : sample.elevationM,
      groundHeightM: sample.elevationM,
      waterHeightM: ocean ? 0 : null,
      waterDepthM: ocean ? Math.max(0,-sample.elevationM) : 0,
      wet: ocean,
      waterKind: null as 'river'|'lake'|null,
      bank: 0,
      channelId: null as string|null,
      flow: [0, 0] as [number, number],
      influence: 0,
    };
    if (!region || ocean) return baseline;
    // This versioned physical surface drives tiles and collision. River
    // construction still uses baseTerrainSampler + sampleLegacyRiverRegion,
    // preserving exports and canonical drainage inputs.
    const landform=regionalLandformHeight(region,d,sample.elevationM);
    const river = sampleRiverRegion(region, d, landform);
    if (!river.influence) return baseline;
    const rockHeightM = river.rockHeightM;
    const wet = river.wet;
    const waterLevelM = river.waterLevelM;
    // Inland water shares the water palette used by orbit previews. River
    // material selection is carried in bank/waterKind for nearby terrain.
    const color = wet ? [24, 105, 132] : regionalBankColor(body,d,landform,sample.color,river);
    const waterHeightM=waterLevelM;
    return {
      elevationM: rockHeightM,
      ocean,
      color,
      roughness: wet ? .28 : sample.roughness,
      rockHeightM,
      waterLevelM,
      visibleHeightM: wet && waterLevelM !== null ? Math.max(rockHeightM, waterLevelM) : rockHeightM,
      groundHeightM:rockHeightM,
      waterHeightM,
      waterDepthM:waterHeightM===null?0:Math.max(0,waterHeightM-rockHeightM),
      wet,
      waterKind: river.waterKind,
      bank: river.bank,
      channelId: river.channelId,
      flow: river.flow,
      influence: river.influence,
    };
  };
}

export function planetSurface(body: Body, width = 1024, segments = 192) {
  const sample = terrainSampler(body),
    height = width / 2;
  const data = new Uint8Array(width * height * 4),
    relief = new Uint8Array(width * height * 4),
    roughness = new Uint8Array(width * height * 4);
  let landPixels = 0,
    totalWeight = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const theta = ((x + 0.5) / width) * Math.PI * 2,
        phi = ((y + 0.5) / height) * Math.PI;
      const d: V3 = [
        -Math.cos(theta) * Math.sin(phi),
        Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
      ];
      const s = sample(d),
        i = (y * width + x) * 4;
      data.set([...s.color, 255], i);
      // Visible ocean is a constant-radius sea surface. Seafloor remains in the sampler.
      const visible = s.visibleHeightM;
      const h = clamp(0.5 + visible / ELEVATION_RANGE_M) * 255;
      relief.set([h, h, h, 255], i);
      const r = s.roughness * 255;
      roughness.set([r, r, r, 255], i);
      const weight = Math.sin(phi);
      totalWeight += weight;
      if (!s.ocean) landPixels += weight;
    }
  const rows = segments / 2;
  const elevations = new Float32Array((segments + 1) * (rows + 1));
  for (let y = 0; y <= rows; y++)
    for (let x = 0; x <= segments; x++) {
      const theta = (x / segments) * Math.PI * 2,
        phi = (y / rows) * Math.PI;
      const s = sample([
        -Math.cos(theta) * Math.sin(phi),
        Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
      ]);
      elevations[y * (segments + 1) + x] = s.visibleHeightM;
    }
  return {
    data,
    relief,
    roughness,
    width,
    height,
    elevations,
    segments,
    version: TERRAIN_VERSION,
    landFraction: landPixels / totalWeight,
  };
}
