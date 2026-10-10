import { type CoatPaletteId, type CoatPattern } from './fauna-coat-vocab.ts';
/** Versioned, bounded recipe for the experimental modular creature composer.
 * Every part is chosen independently. The recipe never names an asset path:
 * all geometry is procedural, so a shared link cannot load arbitrary files.
 * Units are metres; the creature faces +X with +Y up.
 *
 * Version 2 appends coat keys (pattern .. countershade), species variation keys
 * (dimorphism, variability, allometry) and individual keys (individualSeed, sex,
 * maturity, condition). Version 1 text still decodes: its 26 fields are kept and
 * the new keys take neutral defaults, so a v1 animal builds exactly as before.
 *
 * Version 3 (fauna-composer-face-1) appends 'proboscis' to the face (head) choices and the
 * keys eyes and iris. The `trunk` key stays in its encoded position but is DERIVED: a trunk
 * exists exactly on a proboscis face. v1/v2 text and objects are migrated (migrateLegacyFace):
 * muzzle + trunk becomes proboscis, a trunk on any other face is removed.
 *
 * Version 4 (fauna-composer-face-2, eye catalogue EC1) appends 13 eye kinds and 3 iris colours (values, encoded by name)
 * and ONE key, eyeRules: the eye-rules epoch (2 = current, 1 = the face round's "Earlier eye rules"). Owner decision
 * 2026-10-03: every v1-v3 link UPGRADES to the current rules (it reads eyeRules 2); decodeComposerRecipe lists an
 * 'Eyes: upgraded ...' issue when that changes the eyes it built, and eyeRules 1 restores them. */
export declare const COMPOSER_RECIPE_VERSION = 4;
export declare const COMPOSER_RECIPE_MAX_TEXT = 1200;
export declare const COMPOSER_LAYOUTS: readonly ["limbless", "biped", "quadruped", "sprawled", "many-legged"];
export declare const COMPOSER_CHOICES: {
    readonly layout: readonly ["limbless", "biped", "quadruped", "sprawled", "many-legged"];
    readonly torso: readonly ["slim", "barrel", "deep-chest", "flat", "annulated", "segmented"];
    /** The face. 'proboscis' (v3) is the trunk face. */
    readonly head: readonly ["muzzle", "jaws", "beak", "flat-face", "blunt", "mandibles", "proboscis"];
    readonly horns: readonly ["none", "nasal", "paired", "ossicones", "crest"];
    readonly legs: readonly ["pillar", "plantigrade", "digitigrade", "unguligrade", "arthropod"];
    readonly feet: readonly ["hoof", "paw", "claw", "pad", "hand", "spike"];
    readonly arms: readonly ["none", "small", "grasping"];
    readonly hands: readonly ["hand", "claw", "pincer"];
    readonly tail: readonly ["none", "stub", "reptile", "tufted", "feather-fan", "club"];
    readonly armor: readonly ["none", "dome", "plates", "osteoderms", "bands"];
    readonly wings: readonly ["none", "feathered", "membrane"];
    /** Derived from the face since v3: 'trunk' exactly when head is 'proboscis'. */
    readonly trunk: readonly ["none", "trunk"];
    /** Legacy six first (v1 indices), then the fauna-coat-1 pigment families. */
    readonly palette: readonly ["earth", "savanna", "reptile", "plumage", "slate", "ink", "tawny", "rufous", "dun", "fawn", "grey", "sable", "olive", "ochre"];
    readonly pattern: readonly ["auto", "plain", "spots", "rosettes", "reticulated", "stripes", "bands", "saddle", "dorsal-stripe", "dapple", "piebald", "roan", "brindle"];
    readonly sex: readonly ["auto", "female", "male"];
    readonly eyes: readonly ["auto", "round", "horizontal", "vertical-slit", "compound", "eyespot", "raptor", "owl", "cat", "gecko", "frog", "chameleon", "crocodile", "sclera", "nocturnal", "cephalopod", "insect", "spider", "stalk"];
    readonly iris: readonly ["auto", "dark-brown", "brown", "amber", "gold", "yellow", "orange", "red", "green", "pale", "blue", "copper", "grey-green"];
};
export type ComposerLayout = typeof COMPOSER_LAYOUTS[number];
type Choices = typeof COMPOSER_CHOICES;
export type ComposerChoiceKey = keyof Choices;
/** Numeric ranges: [min, max, step]. Lengths other than bodyLength are ratios of bodyLength. */
export declare const COMPOSER_RANGES: {
    readonly legPairs: readonly [0, 12, 1];
    readonly bodyLength: readonly [0.2, 6, 0.01];
    readonly girth: readonly [0.5, 1.6, 0.01];
    readonly posture: readonly [0, 1, 0.01];
    readonly neckLength: readonly [0, 1.5, 0.01];
    readonly headSize: readonly [0.5, 1.6, 0.01];
    readonly snoutLength: readonly [0, 1.5, 0.01];
    readonly legLength: readonly [0.1, 1.8, 0.01];
    readonly armLength: readonly [0.2, 1.4, 0.01];
    readonly tailLength: readonly [0, 2, 0.01];
    readonly wingSpan: readonly [0.5, 4, 0.01];
    readonly trunkLength: readonly [0.2, 1.4, 0.01];
    readonly colorSeed: readonly [0, 9999, 1];
    /** Region-mark bit flags (COAT_MARK_BITS). */
    readonly marks: readonly [0, 255, 1];
    readonly patternScale: readonly [0.5, 2, 0.05];
    readonly patternContrast: readonly [0, 1.5, 0.05];
    /** Pale-belly mix; 0.8 is the v1 belly blend. */
    readonly countershade: readonly [0, 1, 0.05];
    /** Sexual dimorphism strength (0 = none). */
    readonly dimorphism: readonly [0, 1, 0.05];
    /** Individual variation strength (0 = clones, 1 = natural herd, 2 = exaggerated). */
    readonly variability: readonly [0, 2, 0.05];
    /** Allometry strength (0 = off): larger bodies get relatively smaller heads and eyes and sturdier limbs. */
    readonly allometry: readonly [0, 1, 0.05];
    /** 0 is the species type specimen; any other value is one deterministic individual. */
    readonly individualSeed: readonly [0, 9999, 1];
    /** 1 adult .. 0.2 neonate. */
    readonly maturity: readonly [0.2, 1, 0.01];
    /** Body condition: -1 lean .. +1 heavy. */
    readonly condition: readonly [-1, 1, 0.05];
    /** v4: eye-rules epoch (1 = the face round's rules, 2 = current). Appended last; never drawn by a generator. */
    readonly eyeRules: readonly [1, 2, 1];
};
export type ComposerNumberKey = keyof typeof COMPOSER_RANGES;
/** The numeric keys of recipe v3, in COMPOSER_RANGES order (frozen): the coherent generator draws one latent per key
 * in exactly this order, so a key appended to COMPOSER_RANGES must never enter that loop. */
export declare const COMPOSER_V3_RANGE_KEYS: readonly ["legPairs", "bodyLength", "girth", "posture", "neckLength", "headSize", "snoutLength", "legLength", "armLength", "tailLength", "wingSpan", "trunkLength", "colorSeed", "marks", "patternScale", "patternContrast", "countershade", "dimorphism", "variability", "allometry", "individualSeed", "maturity", "condition"];
export interface ComposerRecipe {
    version: typeof COMPOSER_RECIPE_VERSION;
    layout: ComposerLayout;
    /** Walking leg pairs. Fixed by layout except many-legged (3..12). */
    legPairs: number;
    /** Metres: torso length for legged plans; whole body length for limbless/many-legged. */
    bodyLength: number;
    girth: number;
    /** Bipeds: 0 horizontal (theropod) .. 1 upright (ape). Quadrupeds: shoulder rise. */
    posture: number;
    torso: Choices['torso'][number];
    neckLength: number;
    head: Choices['head'][number];
    headSize: number;
    snoutLength: number;
    horns: Choices['horns'][number];
    legs: Choices['legs'][number];
    legLength: number;
    feet: Choices['feet'][number];
    arms: Choices['arms'][number];
    armLength: number;
    hands: Choices['hands'][number];
    tail: Choices['tail'][number];
    tailLength: number;
    armor: Choices['armor'][number];
    wings: Choices['wings'][number];
    wingSpan: number;
    trunk: Choices['trunk'][number];
    trunkLength: number;
    palette: CoatPaletteId;
    colorSeed: number;
    pattern: CoatPattern;
    marks: number;
    patternScale: number;
    patternContrast: number;
    countershade: number;
    dimorphism: number;
    variability: number;
    allometry: number;
    individualSeed: number;
    sex: Choices['sex'][number];
    maturity: number;
    condition: number;
    eyes: Choices['eyes'][number];
    iris: Choices['iris'][number];
    /** Eye-rules epoch: 2 current, 1 the face round's (fauna-composer-face-1). */
    eyeRules: number;
}
/** The 26 version-1 keys, in their v1 encoding order. */
export declare const COMPOSER_V1_KEYS: readonly ["layout", "legPairs", "bodyLength", "girth", "posture", "torso", "neckLength", "head", "headSize", "snoutLength", "horns", "legs", "legLength", "feet", "arms", "armLength", "hands", "tail", "tailLength", "armor", "wings", "wingSpan", "trunk", "trunkLength", "palette", "colorSeed"];
/** The 38 version-2 keys, in their v2 encoding order (frozen). */
export declare const COMPOSER_V2_KEYS: readonly ["layout", "legPairs", "bodyLength", "girth", "posture", "torso", "neckLength", "head", "headSize", "snoutLength", "horns", "legs", "legLength", "feet", "arms", "armLength", "hands", "tail", "tailLength", "armor", "wings", "wingSpan", "trunk", "trunkLength", "palette", "colorSeed", "pattern", "marks", "patternScale", "patternContrast", "countershade", "dimorphism", "variability", "allometry", "individualSeed", "sex", "maturity", "condition"];
/** The 40 version-3 keys, in their v3 encoding order (frozen). */
export declare const COMPOSER_V3_KEYS: readonly ["layout", "legPairs", "bodyLength", "girth", "posture", "torso", "neckLength", "head", "headSize", "snoutLength", "horns", "legs", "legLength", "feet", "arms", "armLength", "hands", "tail", "tailLength", "armor", "wings", "wingSpan", "trunk", "trunkLength", "palette", "colorSeed", "pattern", "marks", "patternScale", "patternContrast", "countershade", "dimorphism", "variability", "allometry", "individualSeed", "sex", "maturity", "condition", "eyes", "iris"];
/** Encoding order: v3 keys, then the v4 key appended (append-only). */
export declare const COMPOSER_RECIPE_KEYS: readonly ["layout", "legPairs", "bodyLength", "girth", "posture", "torso", "neckLength", "head", "headSize", "snoutLength", "horns", "legs", "legLength", "feet", "arms", "armLength", "hands", "tail", "tailLength", "armor", "wings", "wingSpan", "trunk", "trunkLength", "palette", "colorSeed", "pattern", "marks", "patternScale", "patternContrast", "countershade", "dimorphism", "variability", "allometry", "individualSeed", "sex", "maturity", "condition", "eyes", "iris", "eyeRules"];
export type ComposerRecipeKey = typeof COMPOSER_RECIPE_KEYS[number];
/** What makes the species: anatomy, coat, variation strengths and eyes (with their rules epoch). Equal species keys =
 * same species. composerSpeciesKey (the herd hash) still reads the anatomy only. */
export declare const COMPOSER_SPECIES_KEYS: readonly ["layout", "legPairs", "bodyLength", "girth", "posture", "torso", "neckLength", "head", "headSize", "snoutLength", "horns", "legs", "legLength", "feet", "arms", "armLength", "hands", "tail", "tailLength", "armor", "wings", "wingSpan", "trunk", "trunkLength", "palette", "colorSeed", "pattern", "marks", "patternScale", "patternContrast", "countershade", "dimorphism", "variability", "allometry", "eyes", "iris", "eyeRules"];
/** What makes one animal of that species. */
export declare const COMPOSER_INDIVIDUAL_KEYS: readonly ["individualSeed", "sex", "maturity", "condition"];
/** A compatibility adjustment the composer applied. The chosen part stays in the
 * recipe; `effect` says what is actually built from it. */
export interface ComposerConstraint {
    part: string;
    chosen: string;
    effect: string;
}
type V2Key = Exclude<typeof COMPOSER_V2_KEYS[number], typeof COMPOSER_V1_KEYS[number]>;
type V3Key = Exclude<typeof COMPOSER_V3_KEYS[number], typeof COMPOSER_V2_KEYS[number]>;
type V4Key = Exclude<ComposerRecipeKey, typeof COMPOSER_V3_KEYS[number]>;
/** Neutral values of the keys version 2 added; a v1 recipe gets exactly these. */
export declare const COMPOSER_V2_DEFAULTS: Readonly<Pick<ComposerRecipe, V2Key>>;
/** Neutral values of the keys version 3 added; a v1 or v2 recipe gets exactly these. */
export declare const COMPOSER_V3_DEFAULTS: Readonly<Pick<ComposerRecipe, V3Key>>;
/** Value of the key version 4 added for any recipe that lacks it, v1-v3 links included (owner decision: old links
 * upgrade to the current eye rules). */
export declare const COMPOSER_V4_DEFAULTS: Readonly<Pick<ComposerRecipe, V4Key>>;
/** Starting points inspired by real animals. Every field stays editable. */
export declare const COMPOSER_PRESETS: {
    dinosaur: Readonly<ComposerRecipe>;
    turtle: Readonly<ComposerRecipe>;
    giraffe: Readonly<ComposerRecipe>;
    bird: Readonly<ComposerRecipe>;
    ostrich: Readonly<ComposerRecipe>;
    rhinoceros: Readonly<ComposerRecipe>;
    ape: Readonly<ComposerRecipe>;
    worm: Readonly<ComposerRecipe>;
    centipede: Readonly<ComposerRecipe>;
    'shelled-giraffe-bird': Readonly<ComposerRecipe>;
    'trunked-centipede': Readonly<ComposerRecipe>;
    'winged-ape-rhino': Readonly<ComposerRecipe>;
};
export type ComposerPresetId = keyof typeof COMPOSER_PRESETS;
export declare const COMPOSER_PRESET_IDS: ComposerPresetId[];
export declare const COMPOSER_PRESET_LABELS: Record<ComposerPresetId, string>;
export declare function composerPreset(id: ComposerPresetId): ComposerRecipe;
export declare function isComposerPresetId(id: unknown): id is ComposerPresetId;
/** The preset a (migrated) v1 recipe was encoded from: all 26 v1 fields equal that preset's v1 values. */
export declare function composerLegacyPresetId(recipe: ComposerRecipe): ComposerPresetId | undefined;
/** Layout-fixed leg pair counts. */
export declare function composerLegPairRange(layout: ComposerLayout): [number, number];
/** Bounds every field. Out-of-range or unknown values are replaced and listed in `issues`.
 * Version 1, 2, 3 and 4 objects are accepted (keys an older version lacks take their neutral defaults; eyeRules the
 * current epoch); the output is always version 4. A version 1 or 2 object is migrated first (migrateLegacyFace: muzzle + trunk becomes the
 * proboscis face, a trunk on another face is removed, each with an issue). Then the trunk is always derived from the
 * face; for version 3 or version-less objects a stale `trunk` field is ignored silently, so editing a proboscis back to
 * a muzzle never re-promotes it. */
export declare function normalizeComposerRecipe(input: unknown): {
    recipe: ComposerRecipe;
    issues: string[];
};
/** Compatibility rules applied when building. Chosen parts are kept in the
 * recipe; each entry reports how the builder adapts a combination. */
export declare function composerConstraints(recipe: ComposerRecipe): ComposerConstraint[];
/** Folded wings must clear the ground: span is bounded by body height. */
export declare function composerWingSpanLimit(recipe: ComposerRecipe): number;
/** Deterministic string hash and PRNG shared by seeding and colours. */
export declare function composerHash(text: string): number;
export declare function composerRandom(seed: string): () => number;
/** The frozen wild draw: stream 'composer-random-v1/' with its fixed draw order, byte-identical to the v1/v2
 * generator. The v2 and v3 keys keep their neutral defaults and take no draws. The result is the raw draw (it may
 * carry a trunk or horns the face cannot have); randomComposerRecipe applies the face rules to it. */
export declare function drawComposerRandomV1(seed: string): ComposerRecipe;
/** Wild specimens that get an unusual eye kind, per mille (owner decision 2026-10-03: rarely, about 5-10 %). */
export declare const COMPOSER_WILD_UNUSUAL_EYES_PER_MILLE = 75;
/** The wild generator's eye choice: a pure hash post-pass on its own stream name ('composer-wild-eyes-1/<seed>'), no
 * draw from the frozen 'composer-random-v1/' stream. About 7.5 % of seeds get an explicit kind drawn uniformly from
 * the 17 catalogue kinds other than the one 'auto' builds on that body (so it always shows); the rest stay 'auto'. */
export declare function composerWildEyes(seed: string, r: Pick<ComposerRecipe, 'head' | 'layout' | 'legPairs' | 'legs' | 'feet' | 'bodyLength'>): ComposerRecipe['eyes'];
/** Seeded structural combination ("wild"): each part is drawn independently, so the
 * result mixes anatomy from different presets rather than choosing one. The draw is
 * drawComposerRandomV1 (frozen); a post-pass then obeys the face rules without any new
 * draw: a trunk on a muzzle becomes the proboscis face, a trunk on another face is
 * dropped, the horns become the kind the face builds, the iris is 'auto', and the eyes
 * are 'auto' except for a rare unusual kind (composerWildEyes, a pure hash), under the
 * current eye rules. For plausible animals use randomCoherentComposerRecipe (fauna-composer-species.ts). */
export declare function randomComposerRecipe(seed: string): ComposerRecipe;
/** Compact, URL-safe text: `v4*layout_biped*bodyLength_1.6*...` (form-encoding leaves `*`, `_`, `.`, `-` intact). Always writes version 4. */
export declare function encodeComposerRecipe(recipe: ComposerRecipe): string;
/** Decodes shared text. An unsupported version or oversized text is an error
 * (nothing is built); unknown or out-of-range fields are bounded and listed.
 * 'v1*' text reads only the 26 v1 fields and 'v2*' text the 38 v2 fields; neither raises an
 * issue for the keys it lacks: they take neutral defaults, except that a v1 text whose 26
 * fields equal a preset's adopts that preset's later species values (so an old preset link
 * still names the preset). v1 and v2 text is face-migrated (migrateLegacyFace), and the
 * migration is reported in `issues`. In v3 and v4 text the trunk follows the face. 'v3*' text reads the 40 v3 fields.
 * v1-v3 text takes the current eye rules (eyeRules 2); when that changes the eyes the link built (kind or iris), an
 * 'Eyes: upgraded ...' issue says what it built before (eyeRules 1 restores it). 'v5*' and anything else is an error. */
export declare function decodeComposerRecipe(text: string): {
    recipe: ComposerRecipe | null;
    issues: string[];
    error: string | null;
};
/** The disclosure for an old (v1-v3) link whose eyes the current rules build differently from the face round's
 * rules (kind or iris), else null. The recipe keeps eyeRules 2; setting eyeRules 1 restores the earlier eyes. */
export declare function composerEyeUpgradeIssue(recipe: ComposerRecipe): string | null;
/** Every key (species and individual) is equal. */
export declare function composerRecipesEqual(a: ComposerRecipe, b: ComposerRecipe): boolean;
/** Same species: every species key is equal; individual keys (seed, sex, maturity, condition) are ignored. */
export declare function composerSpeciesEqual(a: ComposerRecipe, b: ComposerRecipe): boolean;
export {};
