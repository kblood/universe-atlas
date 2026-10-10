/** Deterministic, metre-based quadruped anatomy shared by the lab data and rig. */
import { type FaunaAppearance, type FaunaMorphology, type FaunaMorphologyFamily } from './fauna-appearance.ts';
export type CreatureArchetype = 'browser' | 'runner' | 'low-slung' | 'long-neck';
export interface CreatureGenome {
    version: string;
    archetype: CreatureArchetype;
    torsoLength: number;
    torsoHeight: number;
    torsoWidth: number;
    legLength: number;
    upperLegFraction: number;
    stanceWidth: number;
    neckLength: number;
    neckRise: number;
    headLength: number;
    headWidth: number;
    tailLength: number;
    footLength: number;
    footWidth: number;
    hornLength: number;
    earLength: number;
    armor: number;
    color: string;
    accentColor: string;
    pattern: 'plain' | 'stripes' | 'spots';
    walkSpeed: number;
    runSpeed: number;
    strideLength: number;
    mutationLog: string[];
    /** Optional additive presentation contracts; absent on unchanged v1 founders. */
    appearance?: FaunaAppearance;
    morphology?: FaunaMorphology;
}
export declare const CREATURE_GENOME_VERSION = "creature-genome-1";
export declare function generateCreatureGenome(seed: string, archetype: CreatureArchetype, parent?: CreatureGenome): CreatureGenome;
export declare function individualCreatureGenome(genome: CreatureGenome, id: string, variant: number, stage?: 'adult' | 'juvenile'): CreatureGenome;
/** Opt-in phenotype. Canonical genome generation and the legacy individual
 * evaluator above remain unchanged, including their deterministic channels. */
export declare function realisticIndividualCreatureGenome(genome: CreatureGenome, id: string, variant: number, stage?: 'adult' | 'juvenile', family?: FaunaMorphologyFamily): CreatureGenome;
export declare function validateCreatureGenome(genome: CreatureGenome): string[];
