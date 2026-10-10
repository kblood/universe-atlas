/**
 * Face, headgear and eye contract for the modular creature composer (fauna-composer-face-2).
 *
 * Pure: no rendering-library import, no randomness, no clock. Erasable TypeScript only (Node
 * type-strips src/*.ts), so no enums, namespaces or parameter properties. Its only runtime import is the pure,
 * import-free eye catalogue (fauna-composer-eye-catalogue.ts). It does not import the recipe module at runtime (the
 * recipe module imports this one), so it carries its own copy of the composer hash (faceHash === composerHash, tested).
 *
 * Vocabulary rules (append-only; renaming or reordering breaks encoded recipes):
 * - A face is the recipe's `head` value. 'proboscis' is the trunk face (elephant, tapir):
 *   a trunk is a nose, so it grows only from a proboscis face, and the recipe's `trunk`
 *   key is derived from the face.
 * - Headgear is built only where real animals carry it. FACE_HEADGEAR says, per face and
 *   chosen horn kind, what is built. The chosen kind stays in the recipe; a 'Horns'
 *   compatibility entry explains when the built kind differs.
 * - Eye kinds (the eye catalogue: 5 face-round kinds + 13 appended) and iris colours (9 + 3 appended) resolve per face
 *   under an eye-rules epoch (recipe key eyeRules, v4):
 *   - eyeRules 2 (current, the default for every recipe and link, also v1-v3 links): 'auto' picks the kind from the
 *     anatomy (never from colour), and every explicit kind is built on every face (odd combinations are allowed).
 *   - eyeRules 1 ("Earlier eye rules", fauna-composer-face-1, frozen): the face round's auto table and iris hash, and
 *     its face table for the five face-round kinds (a face-round kind the face could not have is built as auto and
 *     disclosed). A catalogue kind chosen explicitly is built as chosen under both epochs.
 *   The iris band comes from a hash of colorSeed and face (and kind, for catalogue kinds).
 *
 * fauna-composer-face-2 changes only eye resolution (eye catalogue EC1): headgear and the trunk rules are unchanged.
 */
import { type ComposerEyeKind, type EyeTraits, type FaceRoundEyeKind } from './fauna-composer-eye-catalogue.ts';
export declare const COMPOSER_FACE_VERSION = "fauna-composer-face-2";
/** Eye choices: 'auto' (resolved per face) then the 18 catalogue kinds. */
export declare const COMPOSER_EYE_TYPES: readonly ["auto", "round", "horizontal", "vertical-slit", "compound", "eyespot", "raptor", "owl", "cat", "gecko", "frog", "chameleon", "crocodile", "sclera", "nocturnal", "cephalopod", "insect", "spider", "stalk"];
export type ComposerEyeType = typeof COMPOSER_EYE_TYPES[number];
/** An eye kind that is built (every catalogue kind). */
export type BuiltEyeType = ComposerEyeKind;
export type { ComposerEyeKind, FaceRoundEyeKind, EyeTraits };
/** Eye-rules epochs (recipe key eyeRules). 2 is current; 1 is the face round's, kept selectable as "Earlier eye rules". */
export declare const COMPOSER_EYE_RULES: readonly [1, 2];
export type ComposerEyeRules = typeof COMPOSER_EYE_RULES[number];
export declare const COMPOSER_EYE_RULES_CURRENT: ComposerEyeRules;
/** The epoch a recipe resolves with: 1 only when it says 1, otherwise the current rules. */
export declare function composerEyeRulesOf(r: {
    eyeRules?: number;
}): ComposerEyeRules;
/** Iris colours. 'auto' resolves to one of the face's (or kind's) bands. */
export declare const COMPOSER_IRIS: readonly ["auto", "dark-brown", "brown", "amber", "gold", "yellow", "orange", "red", "green", "pale", "blue", "copper", "grey-green"];
export type IrisId = typeof COMPOSER_IRIS[number];
export type BuiltIrisId = Exclude<IrisId, 'auto'>;
/** Linear-RGB iris table. The first nine are the face round's (frozen, pinned by skin-3); 3 appended. */
export declare const COMPOSER_IRIS_RGB: Readonly<Record<BuiltIrisId, readonly [number, number, number]>>;
/** Every face, in the recipe's head-choice order ('proboscis' appended). */
export declare const COMPOSER_FACES: readonly ["muzzle", "jaws", "beak", "flat-face", "blunt", "mandibles", "proboscis"];
export type ComposerFace = typeof COMPOSER_FACES[number];
export declare const COMPOSER_HORNS: readonly ["none", "nasal", "paired", "ossicones", "crest"];
export type ComposerHorn = typeof COMPOSER_HORNS[number];
/** The skull the rig and mesh build. Until WP5 builds a real proboscis face, it builds the muzzle skull. */
export type ComposerSkull = 'muzzle' | 'jaws' | 'beak' | 'flat-face' | 'blunt' | 'mandibles';
export declare function composerSkullOf(face: ComposerFace): ComposerSkull;
/** The recipe fields this module reads (a full ComposerRecipe satisfies it). */
export interface ComposerFaceInput {
    head: ComposerFace;
    horns: ComposerHorn;
    layout: string;
    legs: string;
    feet: string;
    bodyLength: number;
    colorSeed: number;
    eyes: ComposerEyeType;
    iris: IrisId;
    /** Walking leg pairs (eyeRules 2 tells spiders and insects apart by it). */
    legPairs: number;
    /** Eye-rules epoch (recipe v4); absent = current (2). */
    eyeRules?: number;
}
export interface ComposerFaceConstraint {
    part: string;
    chosen: string;
    effect: string;
}
export type BuiltHeadgear = 'none' | 'nasal' | 'paired' | 'ossicones' | 'crest';
export interface HeadgearBuild {
    built: BuiltHeadgear;
    effect: string | null;
}
/** What is built for each face and chosen horn kind. `effect` is null exactly when built === chosen
 * (beak + crest builds the crest as a casque; the UI labels that option 'Crest or casque'). */
export declare const FACE_HEADGEAR: Readonly<Record<ComposerFace, Readonly<Record<ComposerHorn, HeadgearBuild>>>>;
export declare function composerHeadgearBuild(recipe: Pick<ComposerFaceInput, 'head' | 'horns'>): HeadgearBuild;
/** The face round's table (eyeRules 1): the face-round kinds each face could build ('auto' is always allowed). Under
 * eyeRules 1 a face-round kind outside it is built as the auto kind and disclosed. Under eyeRules 2 every kind is built
 * on every face; this table is then only history. */
export declare const FACE_EYES: Readonly<Record<ComposerFace, readonly FaceRoundEyeKind[]>>;
/** Eye placement profile per face (or face sub-case): gaze yaw from the midline in degrees, and the eye
 * radius factor k (er = k x craniumHeight x eyeScale x eyeRel). The mesh reads these.
 * Compound eyes and eyespots take their size from their own face geometry: k 0 means "not k-sized".
 * The face round's nine entries are frozen; 'mandibles-camera' and 'blunt-camera' (appended, eyeRules 2) size a
 * lidded camera eye chosen on an arthropod or worm head. They are larger than the vertebrate profiles (k 0.15/0.14 read
 * as "a tiny dark point" on the ink centipede, GPT Luna 6 FAIL, EC1 review round 3): an arthropod or worm head is small
 * and dark, and the camera eye there is an odd combination that must read at normal size. */
export declare const FACE_EYE_PROFILE: Readonly<{
    readonly 'flat-face': {
        readonly gazeYawDeg: 15;
        readonly k: 0.13;
    };
    readonly 'muzzle-carnivore': {
        readonly gazeYawDeg: 35;
        readonly k: 0.13;
    };
    readonly 'muzzle-grazer': {
        readonly gazeYawDeg: 65;
        readonly k: 0.14;
    };
    readonly 'jaws-upright': {
        readonly gazeYawDeg: 45;
        readonly k: 0.13;
    };
    readonly 'jaws-sprawled': {
        readonly gazeYawDeg: 70;
        readonly k: 0.13;
    };
    readonly proboscis: {
        readonly gazeYawDeg: 70;
        readonly k: 0.07;
    };
    readonly beak: {
        readonly gazeYawDeg: 75;
        readonly k: 0.16;
    };
    readonly mandibles: {
        readonly gazeYawDeg: 90;
        readonly k: 0;
    };
    readonly blunt: {
        readonly gazeYawDeg: 20;
        readonly k: 0;
    };
    readonly 'mandibles-camera': {
        readonly gazeYawDeg: 70;
        readonly k: 0.21;
    };
    readonly 'blunt-camera': {
        readonly gazeYawDeg: 35;
        readonly k: 0.19;
    };
}>;
export type ComposerEyeProfileId = keyof typeof FACE_EYE_PROFILE;
/** The face's own profile (the face round's choice). With `built` (the face-round stand-in the mesh builds), a camera
 * eye on an arthropod or worm head takes the appended camera profiles, and a compound dome or eyespot on any other
 * face takes the mandibles or blunt profile; without it, exactly the face round's table. */
export declare function composerEyeProfileId(r: Pick<ComposerFaceInput, 'head' | 'layout' | 'legs' | 'feet'>, built?: FaceRoundEyeKind): ComposerEyeProfileId;
type AutoInput = Pick<ComposerFaceInput, 'head' | 'layout' | 'legs' | 'feet' | 'bodyLength'> & {
    legPairs?: number;
    eyeRules?: number;
};
/** The eye kind 'auto' builds. Depends on anatomy only (face, layout, leg pairs, legs, feet, body length) and the
 * rules epoch (default: the recipe's eyeRules, else current), never on colour. */
export declare function composerAutoEyeType(r: AutoInput, rules?: ComposerEyeRules): ComposerEyeKind;
/** Iris bands 'auto' chooses from, per face and built kind. Empty: the eye has no iris. A face-round kind takes the
 * face round's per-face bands (frozen); a catalogue camera kind its preset's bands. */
export declare function composerIrisBands(r: Pick<ComposerFaceInput, 'head' | 'layout'>, built: ComposerEyeKind): readonly BuiltIrisId[];
/** The kind whose iris bands and hash an 'auto' iris uses. An automatic catalogue camera eye is always the eyeRules-2
 * refinement of the face round's automatic kind (cat for vertical-slit on a small carnivore muzzle, crocodile for
 * vertical-slit on large sprawled jaws), so it keeps the face round's bands and hash (face-eye-v1): an upgraded link's
 * iris colour never changes. Rehashing over the preset bands moved 8 legacy links to a darker band (cat gold -> amber,
 * crocodile amber -> grey-green), which GPT Luna 6 judged less readable at normal size (EC1 review, 2026-10-03). An
 * explicitly chosen kind uses its preset's own bands. */
export declare function composerIrisKind(r: AutoInput & Pick<ComposerFaceInput, 'eyes'>, kind: ComposerEyeKind): ComposerEyeKind;
/** Same algorithm as composerHash (fauna-composer-recipe.ts); duplicated to keep this module free of the recipe module. */
export declare function faceHash(text: string): number;
export interface ResolvedComposerEyes {
    /** The recipe's eye choice ('auto' or an explicit kind). */
    chosen: ComposerEyeType;
    /** The eye-rules epoch the choice resolved with. */
    rules: ComposerEyeRules;
    /** The catalogue kind built. */
    kind: ComposerEyeKind;
    /** Its frozen traits (EYE_PRESETS[kind]). */
    traits: Readonly<EyeTraits>;
    /** The face round's kind that fauna-composer-eye-1 builds for `kind` on this face (composerEyeStandIn): equal to
     * `kind` for the five face-round kinds. The current mesh builds this; the catalogue geometry (EC2) reads kind/traits. */
    built: FaceRoundEyeKind;
    /** True when the choice was 'auto'. */
    auto: boolean;
    /** The recipe's iris choice ('auto' or an explicit colour). */
    iris: IrisId;
    /** The iris colour actually built; null for eyes without an iris (compound, simple eyes, eyespots, stalks). */
    irisBuilt: BuiltIrisId | null;
    /** The face profile of the built stand-in (composerEyeProfileId(r, built)); a kind's own placement is in traits. */
    gazeYawDeg: number;
    k: number;
    /** Why the built eye differs from an explicit choice; null when it does not (always null under eyeRules 2). */
    effect: string | null;
}
/** Resolves the eye kind and iris actually built. Pure; colorSeed only picks the iris band. */
export declare function resolveComposerEyes(r: ComposerFaceInput): ResolvedComposerEyes;
/** Face compatibility entries: horns not built (or built as another kind), an eye type the face cannot have,
 * and an iris colour on an eye without an iris. Under eyeRules 2 every eye kind is built, so only
 * eyeRules 1 links can carry an 'Eyes' entry. */
export declare function composerFaceConstraints(r: ComposerFaceInput): ComposerFaceConstraint[];
/** Legacy (recipe v1/v2) migration of the trunk into the face. Mutates `source` (pass a copy) and appends
 * the explanation to `issues`. A trunk on a muzzle (or on a missing/unknown head, which built a muzzle)
 * becomes Face = Proboscis; a trunk on any other face is removed and the face kept. */
export declare function migrateLegacyFace(source: Record<string, unknown>, issues: string[]): void;
/** The anatomy the species key hashes: a proboscis face projects to the legacy muzzle (+ derived trunk),
 * so migrated muzzle+trunk links keep their species key and herds. */
export declare function composerAnatomyProjection<T extends {
    head: string;
}>(recipe: T): T;
