import * as THREE from 'three';
import { type QuadrupedBodyData } from './fauna-body-plan.ts';
import { type FaunaGround, type FaunaPoseOptions } from './fauna-locomotion.ts';
import type { CreatureGenome } from './creature-model.ts';
import type { PlanetFaunaPathMember, PlanetFaunaActivity } from './caller-contract.ts';
export interface PlanetInspectionSample {
    activity: PlanetFaunaActivity;
    rigSeconds: number;
    behaviour?: FaunaPoseOptions['behaviour'];
}
export interface PlanetInspectorDiagnostics {
    time: number;
    gait: 'idle' | 'walk';
    root: [number, number, number];
    jointCount: number;
    maxPenetration: number;
    maxReachError: number;
    feet: {
        id: string;
        position: [number, number, number];
        stance: boolean;
        target: [number, number, number];
    }[];
}
export interface PlanetInspectorOptions {
    member: PlanetFaunaPathMember;
    sample: (time: number) => PlanetInspectionSample;
    ground?: FaunaGround;
    material?: THREE.MeshStandardMaterial;
    ownsMaterial?: boolean;
    /** Presentation extension point; source position/colour/weight buffers stay
     * owned by this body. A rest-space coat can add separate attributes here. */
    prepareGeometry?: (geometry: THREE.BufferGeometry, body: QuadrupedBodyData) => void;
}
export interface PlanetAnimalInspector {
    readonly group: THREE.Group;
    readonly mesh: THREE.SkinnedMesh;
    readonly body: QuadrupedBodyData;
    update(time: number): PlanetInspectorDiagnostics;
    setSkeletonVisible(value: boolean): void;
    setNeutral(value: boolean): void;
    dispose(): void;
}
/** Shared full-body inspection. Atlas supplies its exact dated activity
 * callback; a standalone Lab supplies explicit demo activity. No world lookup,
 * reseeding, alternate anatomy or new species is performed here. */
export declare function createPlanetAnimalInspector(genome: CreatureGenome, options: PlanetInspectorOptions): PlanetAnimalInspector;
