import { CREATURE_GENOME_VERSION, validateCreatureGenome } from "./creature-model.js";
export const PLANET_ANIMAL_DEFINITION_VERSION = 'planet-animal-definition-1';
export function planetAnimalDefinition(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input))
        throw new Error('Planet animal definition must be an object');
    const record = input, genome = (record.genome ?? input);
    if (record.schema !== undefined && record.schema !== PLANET_ANIMAL_DEFINITION_VERSION)
        throw new Error('Unsupported planet animal definition version');
    if (record.kind !== undefined && record.kind !== 'planet-genome')
        throw new Error('Planet inspection requires a canonical genome, not another recipe format');
    if (genome.version !== CREATURE_GENOME_VERSION)
        throw new Error('Unsupported canonical genome version; migrate explicitly');
    const errors = validateCreatureGenome(genome);
    if (errors.length)
        throw new Error(errors.join('; '));
    const individualId = record.individualId ?? 'planet-inspection';
    if (typeof individualId !== 'string' || !individualId.trim() || individualId.length > 512)
        throw new Error('Invalid individual identity');
    if (record.speciesId !== undefined && typeof record.speciesId !== 'string')
        throw new Error('Invalid species identity');
    // Keep the loaded genome unchanged, including its individual phenotype.
    return { schema: PLANET_ANIMAL_DEFINITION_VERSION, kind: 'planet-genome', individualId, ...(record.speciesId !== undefined ? { speciesId: record.speciesId } : {}), genome };
}
