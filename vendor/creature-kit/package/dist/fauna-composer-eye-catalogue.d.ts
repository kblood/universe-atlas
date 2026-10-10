/**
 * Eye catalogue for the modular creature composer (fauna-composer-eye-catalogue-1; eye round EC1).
 *
 * Pure: no imports at all, no rendering library, no randomness, no clock. Erasable TypeScript only (Node type-strips
 * src/*.ts), so no enums, namespaces or parameter properties.
 *
 * An eye KIND is a named, frozen preset over a small tuple of independent traits (structure, pupil, size, placement,
 * lid, brow, sclera, iris pattern, extras, count, eyeshine, iris bands). The recipe stores only the kind name
 * (`eyes`), never a trait: the owner asked for recognisable kinds, not an eye editor (no "Advanced eyes" panel).
 * The geometry code reads traits, never kind names, except to dispatch to a builder.
 *
 * Vocabulary rules (append-only; renaming or reordering breaks encoded recipes):
 * - The first five kinds are the face round's (fauna-composer-face-1). Their traits describe exactly what
 *   fauna-composer-eye-1 builds today.
 * - The thirteen kinds after them are the eye catalogue v2 (design 2026-10-03). Every number below is a design value
 *   to tune in the geometry package (EC2); only its direction (bigger, more frontal, dorsal) comes from the research.
 * - Every kind is built on every face when chosen (owner decision 2026-10-03: odd combinations such as a cuttlefish W
 *   on a horse are allowed and built). `nativeFaces` only says where a kind is at home; it never suppresses a build.
 * - Eyeshine is metadata in this round; nothing renders it.
 */
export declare const COMPOSER_EYE_CATALOGUE_VERSION = "fauna-composer-eye-catalogue-1";
/** The face round's eye kinds (fauna-composer-face-1), in their recipe order. */
export declare const FACE_ROUND_EYE_KINDS: readonly ["round", "horizontal", "vertical-slit", "compound", "eyespot"];
export type FaceRoundEyeKind = typeof FACE_ROUND_EYE_KINDS[number];
/** The eye catalogue v2 kinds, appended after the face round's. */
export declare const CATALOGUE_EYE_KINDS: readonly ["raptor", "owl", "cat", "gecko", "frog", "chameleon", "crocodile", "sclera", "nocturnal", "cephalopod", "insect", "spider", "stalk"];
export type CatalogueEyeKind = typeof CATALOGUE_EYE_KINDS[number];
/** Every buildable eye kind (18), in recipe order. */
export declare const COMPOSER_EYE_KINDS: readonly ["round", "horizontal", "vertical-slit", "compound", "eyespot", "raptor", "owl", "cat", "gecko", "frog", "chameleon", "crocodile", "sclera", "nocturnal", "cephalopod", "insect", "spider", "stalk"];
export type ComposerEyeKind = typeof COMPOSER_EYE_KINDS[number];
/** Built iris colours: the face round's nine (frozen RGB), then the catalogue's 3 (appended). */
export declare const FACE_ROUND_IRIS_IDS: readonly ["dark-brown", "brown", "amber", "gold", "yellow", "orange", "red", "green", "pale"];
export declare const CATALOGUE_IRIS_IDS: readonly ["blue", "copper", "grey-green"];
export declare const EYE_IRIS_IDS: readonly ["dark-brown", "brown", "amber", "gold", "yellow", "orange", "red", "green", "pale", "blue", "copper", "grey-green"];
export type EyeIrisId = typeof EYE_IRIS_IDS[number];
/** Linear RGB of the appended iris colours (the face round's nine stay in fauna-composer-face.ts, frozen). */
export declare const CATALOGUE_IRIS_RGB: Readonly<Record<typeof CATALOGUE_IRIS_IDS[number], readonly [number, number, number]>>;
/** The composer faces (the recipe's `head` values), duplicated here to keep this module import-free. */
export type EyeCatalogueFace = 'muzzle' | 'jaws' | 'beak' | 'flat-face' | 'blunt' | 'mandibles' | 'proboscis';
/** camera = lidded vertebrate or cephalopod eye; compound = facet dome; ocellus = simple lens bead (spider eyes, insect
 * ocelli); eyespot = flush pigment disc; stalk = an eye on a tapered stalk (until EC2 builds it, its tip stands in as an
 * eyespot on a worm head and a compound dome on any other face, see composerEyeStandIn). */
export declare const EYE_STRUCTURES: readonly ["camera", "compound", "ocellus", "eyespot", "stalk"];
export type EyeStructure = typeof EYE_STRUCTURES[number];
/** Shape of the pupil ring. The first 3 are the face round's exact shapes. */
export declare const EYE_PUPILS: readonly ["round", "horizontal", "vertical-slit", "slit-wide", "beaded-slit", "w", "pinhole", "dilated", "none"];
export type EyePupil = typeof EYE_PUPILS[number];
/** face = the face's own profile (FACE_EYE_PROFILE yaw, the mesh's default pitch); the others override yaw and/or pitch.
 * independent = the left and right eyes look different ways (chameleon); stalk = on a stalk (yaw and pitch of the stalk). */
export declare const EYE_PLACEMENTS: readonly ["face", "frontal", "forward", "lateral", "dorsal", "independent", "stalk"];
export type EyePlacementKind = typeof EYE_PLACEMENTS[number];
export declare const EYE_LIDS: readonly ["almond", "round", "wide-almond", "spectacle", "turret", "none"];
export type EyeLid = typeof EYE_LIDS[number];
/** Deformations of the existing outer-lid and orbit rings (no new triangles). */
export declare const EYE_BROWS: readonly ["none", "shelf", "raised-orbit", "raised-orbit-shelf", "disc"];
export type EyeBrow = typeof EYE_BROWS[number];
export declare const EYE_SCLERAS: readonly ["hidden", "white"];
export type EyeSclera = typeof EYE_SCLERAS[number];
export declare const EYE_IRIS_PATTERNS: readonly ["plain", "radial", "reticulated", "reticulated-faint"];
export type EyeIrisPattern = typeof EYE_IRIS_PATTERNS[number];
export declare const EYE_EXTRAS: readonly ["none", "nictitating", "nictitating-lower", "ocelli", "stalk"];
export type EyeExtra = typeof EYE_EXTRAS[number];
export declare const EYE_COUNTS: readonly ["pair", "pair+3", "8"];
export type EyeCount = typeof EYE_COUNTS[number];
/** Metadata only in this round (a later planet-lighting round may render it). */
export declare const EYE_SHINES: readonly ["none", "green-gold", "silver-white", "red-orange"];
export type EyeShine = typeof EYE_SHINES[number];
/** The Lab groups its Eyes select by these. */
export declare const EYE_GROUPS: readonly ["pupil", "animal", "arthropod"];
export type EyeGroup = typeof EYE_GROUPS[number];
export interface EyePlacement {
    kind: EyePlacementKind;
    /** Gaze yaw from the forward midline in degrees; null = the face profile's yaw. */
    yawDeg: number | null;
    /** Gaze pitch above the head's long axis in degrees; null = the mesh's default pitch for this structure. */
    pitchDeg: number | null;
    /** 'independent' only: the right eye's own yaw and pitch (the fields above are the left eye's). */
    right?: {
        yawDeg: number;
        pitchDeg: number;
    };
    /** Per-face yaw overrides (nocturnal: frontal on a flat face, less so on a muzzle). */
    yawByFace?: Partial<Record<EyeCatalogueFace, number>>;
}
export interface EyeTraits {
    kind: ComposerEyeKind;
    /** Lab option label. */
    label: string;
    group: EyeGroup;
    structure: EyeStructure;
    pupil: EyePupil;
    /** Pupil shape numbers in eye radii (er); null = the face round's EYE_PATCH constants. */
    pupilShape: Readonly<Record<string, number>> | null;
    /** Size multiplier m on the face's k (er = k x m x craniumHeight x eyeScale x eyeRel). 1 = the face round. */
    size: number;
    placement: EyePlacement;
    lid: EyeLid;
    /** Lid opening numbers in er; null = the face round's almond (w 1, above .72, below .62). */
    lidShape: Readonly<Record<string, number>> | null;
    brow: EyeBrow;
    sclera: EyeSclera;
    irisPattern: EyeIrisPattern;
    extras: EyeExtra;
    count: EyeCount;
    eyeshine: EyeShine;
    /** Per-face eyeshine overrides (nocturnal: silver-white on a muzzle, none on a flat face). */
    eyeshineByFace?: Partial<Record<EyeCatalogueFace, EyeShine>>;
    /** Iris colours an 'auto' iris picks from when this kind is chosen explicitly. null: the face round's per-face bands
     * (composerIrisBands); an empty list: the eye has no iris. An automatic eye keeps the face round's bands and hash
     * (composerIrisKind in fauna-composer-face.ts), so an upgraded link never changes iris colour. */
    irisBands: readonly EyeIrisId[] | null;
    /** Where real animals carry this kind; a hint only, never a build restriction. */
    nativeFaces: readonly EyeCatalogueFace[];
    /** The face round's kind that fauna-composer-eye-1 builds for it until the catalogue geometry lands (stalk: see
     * composerEyeStandIn, it depends on the face). Face-round kinds are their own stand-in. */
    standIn: FaceRoundEyeKind;
}
/** The frozen preset table: kind -> traits. */
export declare const EYE_PRESETS: Readonly<Record<ComposerEyeKind, Readonly<EyeTraits>>>;
export declare function isComposerEyeKind(value: unknown): value is ComposerEyeKind;
export declare function isFaceRoundEyeKind(value: unknown): value is FaceRoundEyeKind;
/** True when the kind has an iris that an iris colour can tint (camera eyes). */
export declare function eyeKindHasIris(kind: ComposerEyeKind): boolean;
/** The face round's kind that fauna-composer-eye-1 builds for `kind` on `face` until the catalogue geometry lands
 * (a bridge, never a restriction: the recipe keeps the kind). The face round's mesh casts an eyespot from inside a
 * worm's cap, which misses every other head, so off a blunt face an eyespot is stood in by an iris-less round eye
 * (resolveComposerEyes gives it the face's own camera-eye size) and a stalk's tip by a compound dome; on a blunt face both are eyespots. Every other
 * kind builds its preset's standIn. */
export declare function composerEyeStandIn(kind: ComposerEyeKind, face: EyeCatalogueFace): FaceRoundEyeKind;
/** True when real animals carry `kind` on `face` (a hint for the Lab and the generators; never a build restriction). */
export declare function composerEyeNative(kind: ComposerEyeKind, face: EyeCatalogueFace): boolean;
/** The eyeshine a kind carries on a face (metadata only). */
export declare function composerEyeShine(kind: ComposerEyeKind, face: EyeCatalogueFace): EyeShine;
