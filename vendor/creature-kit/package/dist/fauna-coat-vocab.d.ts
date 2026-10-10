/**
 * Shared fauna coat vocabulary (fauna-coat-1 contract).
 *
 * Pure data: no `three` import, no randomness, no clock. Erasable TypeScript only
 * (Node type-strips src/*.ts), so no enums, namespaces or parameter properties.
 *
 * These strings are a cross-package contract (composer recipe, composer coat,
 * Creature Lab UI, planet appearance). Renaming or reordering an entry breaks
 * encoded recipes and determinism; append-only, and version any change.
 */
/** Coat pattern ids. 'auto' resolves per palette through AUTO_PATTERN. */
export declare const COAT_PATTERNS: readonly ["auto", "plain", "spots", "rosettes", "reticulated", "stripes", "bands", "saddle", "dorsal-stripe", "dapple", "piebald", "roan", "brindle"];
export type CoatPattern = typeof COAT_PATTERNS[number];
/** A pattern after 'auto' has been resolved. */
export type ResolvedCoatPattern = Exclude<CoatPattern, 'auto'>;
/** Region-mark bit flags; a genome's `marks` is an OR of these (0..255). */
export declare const COAT_MARK_BITS: {
    readonly socks: 1;
    readonly mask: 2;
    readonly blaze: 4;
    readonly 'tail-tip': 8;
    readonly 'tail-rings': 16;
    readonly 'ear-tips': 32;
    readonly 'rump-patch': 64;
    readonly 'juvenile-spots': 128;
};
export type CoatMarkName = keyof typeof COAT_MARK_BITS;
/** All mark names in bit order (1, 2, 4, ... 128). */
export declare const COAT_MARK_NAMES: readonly CoatMarkName[];
/** Mask of every defined mark bit. */
export declare const COAT_MARKS_ALL = 255;
/** The six palettes of the v1 composer recipe, in their original order. */
export declare const LEGACY_PALETTE_IDS: readonly ["earth", "savanna", "reptile", "plumage", "slate", "ink"];
export type LegacyPaletteId = typeof LEGACY_PALETTE_IDS[number];
/** Natural pigment families added by fauna-coat-1. */
export declare const PIGMENT_FAMILIES: readonly ["tawny", "rufous", "dun", "fawn", "grey", "sable", "olive", "ochre"];
export type PigmentFamily = typeof PIGMENT_FAMILIES[number];
/** Every palette id: legacy first (stable indices), then pigment families. */
export declare const COAT_PALETTE_IDS: readonly ["earth", "savanna", "reptile", "plumage", "slate", "ink", "tawny", "rufous", "dun", "fawn", "grey", "sable", "olive", "ochre"];
export type CoatPaletteId = typeof COAT_PALETTE_IDS[number];
/** Colour roles carried by every palette row. */
export declare const COAT_ROLES: readonly ["base", "accent", "belly", "keratin", "skin", "eye", "horn", "plate"];
export type CoatRole = typeof COAT_ROLES[number];
/**
 * sRGB hex per palette and role. The six legacy rows are copied verbatim from
 * fauna-composer-mesh.ts PALETTES (composer v1) and must never change.
 */
export declare const COAT_PALETTE_HEX: Readonly<Record<CoatPaletteId, Readonly<Record<CoatRole, string>>>>;
/** What pattern 'auto' resolves to for each palette. */
export declare const AUTO_PATTERN: Readonly<Record<CoatPaletteId, ResolvedCoatPattern>>;
/** Anatomical region a coat sample belongs to. */
export type CoatRegion = 'torso' | 'neck' | 'head' | 'muzzle' | 'ear' | 'limb-upper' | 'limb-lower' | 'foot' | 'tail' | 'tail-tip' | 'horn' | 'armor' | 'wing' | 'eye';
/** Runtime list of every CoatRegion (same members as the type). */
export declare const COAT_REGIONS: readonly ["torso", "neck", "head", "muzzle", "ear", "limb-upper", "limb-lower", "foot", "tail", "tail-tip", "horn", "armor", "wing", "eye"];
/** Type guards for untrusted strings (decoded recipes, URLs). */
export declare function isCoatPattern(value: unknown): value is CoatPattern;
export declare function isCoatPaletteId(value: unknown): value is CoatPaletteId;
export declare function isCoatRegion(value: unknown): value is CoatRegion;
/** Resolve 'auto' against a palette; any other pattern passes through. */
export declare function resolveCoatPattern(pattern: CoatPattern, paletteId: CoatPaletteId): ResolvedCoatPattern;
