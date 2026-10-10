import type { CreatureArchetype, CreatureGenome } from './creature-model.ts';
import { type CoatMarkName, type CoatRegion, type PigmentFamily, type ResolvedCoatPattern } from '../fauna-coat-vocab.ts';
import { type CoatGenome, type CoatRGB } from '../fauna-coat-fields.ts';
/** An additive rendering contract. A genome without this block keeps its v1
 * evaluation; a stored 'fauna-appearance-1' block keeps the v1 coat. */
export declare const FAUNA_APPEARANCE_VERSION = "fauna-appearance-2";
export declare const FAUNA_APPEARANCE_LEGACY_VERSION = "fauna-appearance-1";
export declare const MORPHOLOGY_FAMILIES: readonly ["ungulate", "cursorial", "padded", "long-neck", "proboscidean", "winged"];
export type FaunaMorphologyFamily = typeof MORPHOLOGY_FAMILIES[number];
export interface FaunaMorphology {
    version: 'fauna-morphology-1';
    family: FaunaMorphologyFamily;
    footType: 'paw' | 'hoof' | 'broad-pad';
    /** Metres at the specimen's current growth stage. */
    trunkLength: number;
    wingSpan: number;
    /** Winged specimens are grounded speculative animals; flight is not simulated. */
    wingState: 'none' | 'folded';
}
export type FaunaSex = 'female' | 'male';
export interface FaunaAppearance {
    version: typeof FAUNA_APPEARANCE_VERSION | typeof FAUNA_APPEARANCE_LEGACY_VERSION;
    individualKey: string;
    markingSeed: number;
    /** The inherited (catalogue) pattern; the rendered pattern is `coat.pattern`. */
    pattern: CreatureGenome['pattern'];
    /** sRGB hex. base = near-body area-weighted coat mean (far LOD), marking = dark role, belly = belly role. */
    palette: {
        base: string;
        marking: string;
        belly: string;
    };
    roughness: number;
    /** Species axes. dimorphism (0.15..0.7) scales the sex differences of this species. */
    profile: {
        mass: number;
        limb: number;
        neck: number;
        dimorphism: number;
        hornlessFemales: boolean;
    };
    /** coatPhase (v2, 0..1): the individual's offset of banded and striped
     * coats along the body, in pattern periods; absent in v1. */
    individual: {
        size: number;
        condition: number;
        muzzle: number;
        ears: number;
        sex: FaunaSex;
        /** fauna-appearance-2 only: band phase (0..1) and signed limb, neck and
         * tail proportion axes (-1..1); a v1 appearance has none of them. */
        coatPhase?: number;
        limb?: number;
        neck?: number;
        tail?: number;
    };
    /** maturity is 1 for adults and continuous 0.22..0.45 for juveniles.
     * lateral (v2) maps the body's z into the adult coat frame: 1 for adults,
     * adult/juvenile torso width-to-length for juveniles; absent in v1. */
    growth: {
        stage: 'adult' | 'juvenile';
        maturity: number;
        lateral?: number;
    };
    /** The individual's resolved coat at this growth stage (fauna-coat-1). */
    coat: CoatGenome;
    /** Pigment family and pattern shared by every species of one lineage. */
    lineage: {
        family: PigmentFamily;
        pattern: ResolvedCoatPattern;
    };
}
export type CoatColor = [number, number, number];
/** Linear RGB to sRGB hex. */
export declare function linearHexOf(c: readonly number[]): string;
type Weighted<T extends string> = readonly (readonly [T, number])[];
/** Pigment-family priors per archetype. Low-slung animals (padded or
 * proboscidean) also carry the olive-grey of armoured, wallowing forms, so
 * every pigment family occurs on planets. */
export declare const FAUNA_LINEAGE_FAMILIES: Readonly<Record<CreatureArchetype, Weighted<PigmentFamily>>>;
/** Coat pattern priors per inherited catalogue pattern. A small roan share
 * keeps the frosted coats of grey and sable lineages in the planet set. */
export declare const FAUNA_LINEAGE_PATTERNS: Readonly<Record<CreatureGenome['pattern'], Weighted<ResolvedCoatPattern>>>;
/** Region marks a species may toggle on or off its lineage's marks. */
export declare const FAUNA_SPECIES_MARKS: Readonly<Record<CreatureArchetype, readonly CoatMarkName[]>>;
/** The catalogue identity of a lineage: inherited unchanged by descendants. */
export declare function faunaLineageKey(genome: CreatureGenome): string;
/** The species channel of the v1 appearance (descendants change anatomy, so it differs per species). */
export declare function faunaSpeciesKey(genome: CreatureGenome): string;
export interface FaunaLineageCoat {
    family: PigmentFamily;
    pattern: ResolvedCoatPattern;
    marks: number;
    juvenileSpots: boolean;
}
/** Lineage family, pattern, base marks and juvenile-spot inheritance. */
export declare function faunaLineageCoat(genome: CreatureGenome): FaunaLineageCoat;
/** Species dimorphism (0.15..0.7): stronger in horned ungulates and long-necked browsers. */
export declare function faunaSpeciesDimorphism(genome: CreatureGenome): {
    dimorphism: number;
    hornlessFemales: boolean;
};
/** Species coat (adult, no individual drift), from stream `<speciesKey>/coat-v2`:
 * colour seed (hue +-0.04 via coatSpeciesColours), scale +-25%, contrast +-20%,
 * countershade 0.35..0.9, belly line +-0.1, a 0.25 toggle per archetype mark,
 * light marks with p 0.3, then warp and coverage. The draw order is append-only. */
export declare function faunaSpeciesCoat(genome: CreatureGenome): {
    lineage: FaunaLineageCoat;
    coat: CoatGenome;
};
/** Area shares of the near body's coat regions per morphology family
 * (quadruped-body-4 skins, the mean of the normalised adult and juvenile
 * shares measured over 4 archetypes x 4 specimens each, so the one
 * stage-invariant far colour serves both stages;
 * ears, horns and structural parts excluded, as they follow the far colour),
 * and the mean hoof/pad darkening of the feet. */
export declare const FAUNA_FAR_REGION_SHARES: Readonly<Record<FaunaMorphologyFamily, {
    torso: number;
    neck: number;
    head: number;
    tail: number;
    upper: number;
    lower: number;
    foot: number;
    footHoof: number;
}>>;
/** Area share of dorsal armour plates (low-slung bodies only). */
export declare function faunaArmorShare(genome: Pick<CreatureGenome, 'archetype' | 'armor'>, family: FaunaMorphologyFamily): number;
/** Far-LOD colour of a coat (linear): the canonical coat evaluated per
 * region, weighted by the family's near-body region shares, with hoof
 * darkening on the feet and the plate role on armour. This is coatMeanColor
 * re-weighted to the body the near LOD actually draws, so the far colour
 * stays within 0.04 of the near-body mean (tested). */
export declare function faunaFarCoatMean(coat: CoatGenome, family: FaunaMorphologyFamily, armorShare?: number): CoatRGB;
/** Far-LOD colour (linear) of one individual's adult coat, without
 * evaluating its whole canonical body. The species model (memoised per
 * `speciesId`, about 2 ms once per species) is exact in the individual's
 * colours, socks/blaze flips and greying, and first-order in its contrast,
 * countershade, threshold and belly line; layout-dependent patterns
 * (FAR_LAYOUT_PATTERNS) also evaluate the individual's own coat on every
 * fourth canonical sample. About 3 us per individual (about 0.1 ms for
 * layout-dependent patterns) against 0.45 ms for faunaFarCoatMean; the
 * near/far bound is tested on the 96 corpus bodies. A coat that is not an
 * individual of this species falls back to the exact mean. */
export declare function faunaFarMean(speciesId: string, species: CoatGenome, archetype: CreatureArchetype, coat: CoatGenome, family: FaunaMorphologyFamily, armorShare?: number): CoatRGB;
/** Memo key of a species' far-LOD model (species and lineage channels). */
export declare function faunaFarSpeciesId(genome: CreatureGenome): string;
/** An individual's adult coat: the species coat with its individual drift. */
export declare function faunaAdultCoat(archetype: CreatureArchetype, speciesCoat: CoatGenome, individualKey: string): CoatGenome;
/** Juvenile-spot strength: full up to maturity 0.3, gone by 0.7. */
export declare function faunaJuvenileSpotStrength(maturity: number): number;
export declare function createFaunaAppearance(genome: CreatureGenome, id: string, variant: number, stage: 'adult' | 'juvenile'): FaunaAppearance;
/** Errors in a stored v2 coat genome (shape and ranges only). */
export declare function faunaCoatErrors(coat: CoatGenome | undefined): string[];
export declare function isPigmentFamily(value: unknown): value is PigmentFamily;
/** A species keeps one morphology regardless of specimen, life stage or camera. */
export declare function inheritedFaunaFamily(genome: CreatureGenome): FaunaMorphologyFamily;
/** Relative growth scales at the reviewed juvenile stage (maturity 0.28, not
 * years or world date). Precocial browsers retain long legs; young long-necked
 * animals have a shorter neck. Heads and feet develop ahead of the trunk.
 * fauna-appearance-2 interpolates these by (1 - maturity) / 0.72. */
export declare const FAUNA_JUVENILE_PROPORTIONS: Record<CreatureArchetype, {
    trunk: number;
    width: number;
    limb: number;
    neck: number;
    head: number;
    foot: number;
    ear: number;
}>;
/** The maturity at which FAUNA_JUVENILE_PROPORTIONS were authored. */
export declare const FAUNA_REFERENCE_JUVENILE_MATURITY = 0.28;
/** Body-plan region names accepted by sampleFaunaCoat (coat regions pass through). */
export type FaunaBodyRegion = 'torso' | 'neck' | 'head' | 'tail' | 'upper' | 'lower' | 'foot' | 'armor';
/** Optional surface detail for one sample. dorsal: the surface normal's
 * vertical component (default from height); along: 0..1 within the region,
 * proximal to distal; cellM: the mesh's vertex spacing in metres, which widens
 * mark edges and bounds the pattern scale so marks span several vertices. */
export interface FaunaCoatSurface {
    dorsal?: number;
    along?: number;
    cellM?: number;
}
/** Largest pattern scale whose marks span 4 cells of `cell` torso lengths. */
export declare function faunaCoatMaxScale(coat: CoatGenome, cell: number): number;
export interface FaunaFawnSpotLayout {
    radius: number;
    spacing: number;
    rowGap: number;
    rows: readonly number[];
}
/** Spot layout in torso lengths for a near body whose vertex cell is
 * `cell` torso lengths. */
export declare function faunaFawnSpotLayout(cell: number): FaunaFawnSpotLayout;
/** Vertex coat in linear light. Torso-normalised bind-space coordinates keep
 * the same markings on adult and juvenile bodies; z is signed, so the flanks
 * differ. No maps, GPU resources, random state or added draw calls. The
 * undefined branch preserves legacy coats; a v1 appearance keeps its v1 coat. */
export declare function sampleFaunaCoat(genome: CreatureGenome, x: number, y: number, z: number, torsoY: number, region?: FaunaBodyRegion | CoatRegion, surface?: FaunaCoatSurface): CoatColor | undefined;
/** Stocking strength of a juvenile (0.4 at maturity 0.2, 0.7 at 0.45, 1 by
 * 0.7). Leg stockings darken and sharpen with age: gaur and banteng calves
 * are near body-coloured below the knee, and bear cubs and young tapirs lack
 * the adults' dark legs. The young's lower legs also take a larger share of
 * the skin (by about half), so full-strength stockings would make juveniles
 * read darker than their stage-invariant far colour. */
export declare function faunaJuvenileStockingStrength(maturity: number): number;
/** Review/test probe: the raw pattern mark (0..1) the coat draws at a point,
 * before region strength and colour; 0 for legacy appearances. */
export declare function faunaCoatMark(genome: CreatureGenome, x: number, y: number, z: number, torsoY: number, region?: FaunaBodyRegion | CoatRegion, surface?: FaunaCoatSurface): number;
export {};
