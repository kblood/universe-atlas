/**
 * Per-face head geometry numbers for the modular creature composer (fauna-composer-face-geometry-1).
 *
 * Pure: no rendering-library import, no randomness, no clock; erasable TypeScript only. The rig
 * (fauna-composer-rig.ts) and the skin (fauna-composer-mesh.ts) both read these, so a face's skull
 * proportions and the station where its face ends (the tip a trunk grows from) are defined once.
 *
 * Keyed by the FACE (the recipe's `head` value), not by the legacy skull: 'proboscis' is a real face of
 * its own here (a short, high-domed elephant/tapir face whose muzzle hands over into the trunk), where
 * fauna-composer-face-1's shim built it as a muzzle.
 */
import type {ComposerFace} from './fauna-composer-face.ts';

export const COMPOSER_FACE_GEOMETRY_VERSION = 'fauna-composer-face-geometry-1';

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
export const COMPOSER_FACE_GEOMETRY: Readonly<Record<ComposerFace, Readonly<ComposerFaceGeometry>>> = Object.freeze({
  muzzle: {headScale: 1, craniumHeight: 0.34, craniumWidth: 0.9, snout: 0.62},
  jaws: {headScale: 1.15, craniumHeight: 0.34, craniumWidth: 0.95, snout: 0.62},
  beak: {headScale: 0.9, craniumHeight: 0.34, craniumWidth: 0.9, snout: 0.62},
  'flat-face': {headScale: 0.9, craniumHeight: 0.42, craniumWidth: 0.9, snout: 0.62},
  blunt: {headScale: 0.6, craniumHeight: 0.5, craniumWidth: 0.9, snout: 0.62},
  mandibles: {headScale: 0.7, craniumHeight: 0.3, craniumWidth: 1.4, snout: 0.62},
  proboscis: {headScale: 1.05, craniumHeight: 0.40, craniumWidth: 0.9, snout: 0.62 * 0.4},
});

/** Rest head pitch (radians, before the individual's carriage) for a face on a body plan. Unchanged from graph-2
 * for the legacy faces; a proboscis face carries its head like a muzzle. */
export function composerHeadPitch(face: ComposerFace, layout: string, posture: number): number {
  if (layout === 'limbless') return -0.12;
  if (layout === 'many-legged') return -0.08;
  if (layout === 'biped' && posture > 0.6) return -0.08;
  return face === 'beak' ? -0.12 : -0.3;
}

export interface ComposerFaceDims {headLength: number; craniumWidth: number; craniumHeight: number; snoutLength: number}
/** The head-local station where the built face ends (head-bone units: x along the head, y dorsal): centre x, y and
 * the half height h and half width w of the face's last section. A proboscis trunk grows from exactly this station. */
export interface ComposerFaceTip {x: number; y: number; h: number; w: number}
export function composerFaceTip(face: ComposerFace, d: ComposerFaceDims): ComposerFaceTip {
  const H = d.headLength, cW = d.craniumWidth, cH = d.craniumHeight, sn = d.snoutLength;
  switch (face) {
    case 'muzzle': return {x: 0.4 * H + sn, y: -0.24 * cH, h: 0.52 * cH, w: 0.48 * cW};
    case 'jaws': return {x: 0.4 * H + sn, y: -0.12 * cH, h: 0.36 * cH, w: 0.5 * cW};
    case 'proboscis': return {x: 0.4 * H + Math.max(sn, PROBOSCIS_FACE.minMuzzle * H), y: PROBOSCIS_FACE.tipY * cH, h: PROBOSCIS_FACE.tipH * cH, w: PROBOSCIS_FACE.tipW * cW};
    case 'beak': { const len = Math.max(sn, 0.15 * H); return {x: 0.36 * H + len, y: -0.05 * cH, h: 0.1 * cH, w: 0.06 * cW}; }
    case 'flat-face': { const len = Math.max(0.05 * H, sn * 0.6); return {x: 0.36 * H + len, y: -0.42 * cH, h: 0.34 * cH, w: 0.42 * cW}; }
    case 'blunt': return {x: 0.6 * H + sn * 0.3 + 0.7 * cW, y: 0, h: 0.5 * cH, w: 0.75 * cW};
    case 'mandibles': { const len = Math.max(0.25 * H, sn * 1.1); return {x: 0.72 * H + len, y: -0.25 * cH, h: 0.3 * cH, w: 0.3 * cW}; }
  }
}

/** The proboscis face's muzzle: section at the tip (fractions of cH and cW), chosen so the tip section is round
 * (0.5 cH vs 0.55 x 0.9 cH = 0.495 cH) and the trunk's first ring can be that section itself; the muzzle is at least
 * minMuzzle x H long (snoutLength 0 would collapse its stations). The muzzle is short against its section, so its
 * stations stay square to the head axis (a pitched station would fold its underside onto the one before) and the
 * trunk's first bone leaves along the head axis: the trunk bends down along its own length (PROBOSCIS_TRUNK_BEND). */
export const PROBOSCIS_FACE = Object.freeze({tipY: -0.2, tipH: 0.5, tipW: 0.55, minMuzzle: 0.08});
/** Trunk bone i of 6 pitches PROBOSCIS_TRUNK_BEND x (i / 5)^1.2 radians below the head axis (the last one 1.5 rad, as in
 * graph-2, whose first bone started 0.45 rad down and kinked away from the face). */
export const PROBOSCIS_TRUNK_BEND = 1.5;
/** The trunk's base radius against the face tip: min(tip.w, tip.h), the tip section itself (round within 1%), so the
 * bone sections take over without a step and only the trunk's own taper slopes its surface at the junction. */
export const PROBOSCIS_TRUNK_BASE = 1;
