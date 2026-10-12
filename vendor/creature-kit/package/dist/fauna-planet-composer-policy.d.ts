export declare const FAUNA_PLANET_COMPOSER_VERSION = "fauna-planet-composer-1";
/** Provisional integration ceilings; real habitat/combined-budget gates apply. */
export declare const FAUNA_PLANET_COMPOSER_POLICY: Readonly<{
    capacity: 512;
    maxBones: 160;
    nearSources: 6;
    middleSources: 6;
    nearM: 35;
    middleM: 140;
    visibleM: 600;
    residentBytes: number;
    workerReserveBytes: number;
    resultBytes: number;
    middleVertices: 16000;
    middleIndices: 96000;
    farVertices: 320000;
    farIndices: 1536000;
    middleTargetTriangles: 4500;
    farTargetTriangles: 1000;
}>;
