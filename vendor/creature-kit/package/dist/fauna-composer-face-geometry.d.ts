/**
 * Per-face head geometry numbers for the modular creature composer (fauna-composer-face-geometry-2).
 *
 * fauna-composer-face-geometry-2 (eye round EC4, head polish) changes only the proboscis: a thicker muzzle tip (the trunk
 * base), a shorter trunk (PROBOSCIS_TRUNK_LENGTH), a hanging rest shape that tapers fast near the face and curls its tip
 * forward (a J) instead of lying on the ground (composerTrunkRestAngles). The six other faces are unchanged.
 *
 * Pure: no rendering-library import, no randomness, no clock; erasable TypeScript only. The rig
 * (fauna-composer-rig.ts) and the skin (fauna-composer-mesh.ts) both read these, so a face's skull
 * proportions and the station where its face ends (the tip a trunk grows from) are defined once.
 *
 * Keyed by the FACE (the recipe's `head` value), not by the legacy skull: 'proboscis' is a real face of
 * its own here (a short, high-domed elephant/tapir face whose muzzle hands over into the trunk), where
 * fauna-composer-face-1's shim built it as a muzzle.
 */
import type { ComposerFace } from './fauna-composer-face.ts';
export declare const COMPOSER_FACE_GEOMETRY_VERSION = "fauna-composer-face-geometry-2";
export interface ComposerFaceGeometry {
    /** Head length factor (head bone length = headSize x headScale x body scale). */
    headScale: number;
    /** Cranium height as a fraction of the head length. */
    craniumHeight: number;
    /** Cranium width as a fraction of the cranium height. */
    craniumWidth: number;
    /** Snout length as a fraction of headLength x recipe.snoutLength. */
    snout: number;
}
/** The numbers the rig used per skull before this module (rig.ts HEAD_SCALE, cranium ratios and snout factor),
 * unchanged for the six legacy faces; proboscis is new (HEAD_SCALE 1.05, cranium .40, snout 0.4 x the muzzle's). */
export declare const COMPOSER_FACE_GEOMETRY: Readonly<Record<ComposerFace, Readonly<ComposerFaceGeometry>>>;
/** Rest head pitch (radians, before the individual's carriage) for a face on a body plan. Unchanged from graph-2
 * for the legacy faces; a proboscis face carries its head like a muzzle. */
export declare function composerHeadPitch(face: ComposerFace, layout: string, posture: number): number;
export interface ComposerFaceDims {
    headLength: number;
    craniumWidth: number;
    craniumHeight: number;
    snoutLength: number;
}
/** The head-local station where the built face ends (head-bone units: x along the head, y dorsal): centre x, y and
 * the half height h and half width w of the face's last section. A proboscis trunk grows from exactly this station. */
export interface ComposerFaceTip {
    x: number;
    y: number;
    h: number;
    w: number;
}
export declare function composerFaceTip(face: ComposerFace, d: ComposerFaceDims): ComposerFaceTip;
/** The proboscis face's muzzle: section at the tip (fractions of cH and cW), chosen so the tip section is round
 * (0.92 cH vs 1.02 x 0.9 cH = 0.918 cH) and the trunk's first ring can be that section itself; the muzzle is at least
 * minMuzzle x H long (snoutLength 0 would collapse its stations). The muzzle is short against its section, so its
 * stations stay square to the head axis (a pitched station would fold its underside onto the one before) and the
 * trunk's first bone leaves along the head axis: the trunk bends down along its own length.
 * face-geometry-2 (EC4): tipH 0.5 -> 0.92 and tipW 0.55 -> 1.02. GPT Luna 6 read the face-round trunk as "a tube attached
 * to the front of the head ... its base looks pinched and narrower than the face around it", and at 0.72 / 0.8 still
 * "the base is narrow relative to the face" (2 of 4 trunks, luna/after-trunk.txt), and at 0.8 / 0.89 "narrow, tube-like base" (luna/a12-trunk-r1/r2); at
 * 0.92 / 1.02 with taper power 1.25 all 4 passed 2 of 2 runs (luna/a13-trunk-r1/r2). The base is ~1.8 x as wide. */
export declare const PROBOSCIS_FACE: Readonly<{
    tipY: -0.2;
    tipH: 0.92;
    tipW: 1.02;
    minMuzzle: 0.08;
}>;
/** The trunk's base radius against the face tip: min(tip.w, tip.h), the tip section itself (round within 1%), so the
 * bone sections take over without a step and only the trunk's own taper slopes its surface at the junction. */
export declare const PROBOSCIS_TRUNK_BASE = 1;
/** Trunk length per unit recipe trunkLength, in head lengths (graph-3: 2.1). Luna: "roughly 1.5-2 head lengths ...
 * the face is small relative to the trunk"; the default trunkLength 0.8 now builds 1.16 head lengths, 1.0 builds 1.45. */
export declare const PROBOSCIS_TRUNK_LENGTH = 1.45;
/** Trunk taper: radius at fraction u of its length = tip + (base - tip) x (1 - u)^power. A thick base that narrows
 * quickly, then a long slender hand, instead of graph-3's linear cone (base 1, tip 0.38). */
export declare const PROBOSCIS_TRUNK_TAPER: Readonly<{
    tip: 0.3;
    power: 1.25;
}>;
export declare function composerTrunkRadius(baseR: number, u: number): number;
/** The trunk's rest shape (radians of world pitch per bone, in the head's sagittal plane; 0 = horizontal, negative =
 * down). The trunk droops from the face toward `hang` (an elephant's trunk hangs from its face): bone i at fraction
 * (i + lead) / (n - 1 + lead) of the way, eased by `ease`, so bone 0 already turns down (the skin's join blend keeps the
 * surface tangent-continuous with the muzzle, which runs along the head axis) and its last bone flicks forward by `flick`. A trunk too long for the face's
 * height above the ground curls forward and up from bone `from` on (a J, as an elephant rests a long trunk): bone
 * from + k turns `curl` x (k + 1) further, never past `maxPitch`. The rig picks the latest `from` and then the smallest
 * curl (up to curlMax per bone) that keep the trunk off the ground (composerTrunkRestShape); graph-3 instead lifted the
 * lowest bone off the ground at a kink (resolveRestClearance, kept as a last resort). */
export declare const PROBOSCIS_TRUNK_SHAPE: Readonly<{
    hang: -1.45;
    ease: 0.5;
    lead: 0.4;
    flick: 0.55;
    curlMax: 0.9;
    maxPitch: 1.1;
}>;
export declare function composerTrunkRestAngles(n: number, headPitch: number, from?: number, curl?: number): number[];
/** Picks the rest shape: no curl when `clear` (a test of a candidate angle list) passes already, else the latest curl
 * start and the smallest curl there that pass (bisection, deterministic), else the fullest curl (and the rig's
 * clearance fallback lifts the rest). */
export declare function composerTrunkRestShape(n: number, headPitch: number, clear: (angles: number[]) => boolean): number[];
