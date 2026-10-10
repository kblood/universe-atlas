export const COMPOSER_FACE_GEOMETRY_VERSION = 'fauna-composer-face-geometry-2';
/** The numbers the rig used per skull before this module (rig.ts HEAD_SCALE, cranium ratios and snout factor),
 * unchanged for the six legacy faces; proboscis is new (HEAD_SCALE 1.05, cranium .40, snout 0.4 x the muzzle's). */
export const COMPOSER_FACE_GEOMETRY = Object.freeze({
    muzzle: { headScale: 1, craniumHeight: 0.34, craniumWidth: 0.9, snout: 0.62 },
    jaws: { headScale: 1.15, craniumHeight: 0.34, craniumWidth: 0.95, snout: 0.62 },
    beak: { headScale: 0.9, craniumHeight: 0.34, craniumWidth: 0.9, snout: 0.62 },
    'flat-face': { headScale: 0.9, craniumHeight: 0.42, craniumWidth: 0.9, snout: 0.62 },
    blunt: { headScale: 0.6, craniumHeight: 0.5, craniumWidth: 0.9, snout: 0.62 },
    mandibles: { headScale: 0.7, craniumHeight: 0.3, craniumWidth: 1.4, snout: 0.62 },
    proboscis: { headScale: 1.05, craniumHeight: 0.40, craniumWidth: 0.9, snout: 0.62 * 0.4 },
});
/** Rest head pitch (radians, before the individual's carriage) for a face on a body plan. Unchanged from graph-2
 * for the legacy faces; a proboscis face carries its head like a muzzle. */
export function composerHeadPitch(face, layout, posture) {
    if (layout === 'limbless')
        return -0.12;
    if (layout === 'many-legged')
        return -0.08;
    if (layout === 'biped' && posture > 0.6)
        return -0.08;
    return face === 'beak' ? -0.12 : -0.3;
}
export function composerFaceTip(face, d) {
    const H = d.headLength, cW = d.craniumWidth, cH = d.craniumHeight, sn = d.snoutLength;
    switch (face) {
        case 'muzzle': return { x: 0.4 * H + sn, y: -0.24 * cH, h: 0.52 * cH, w: 0.48 * cW };
        case 'jaws': return { x: 0.4 * H + sn, y: -0.12 * cH, h: 0.36 * cH, w: 0.5 * cW };
        case 'proboscis': return { x: 0.4 * H + Math.max(sn, PROBOSCIS_FACE.minMuzzle * H), y: PROBOSCIS_FACE.tipY * cH, h: PROBOSCIS_FACE.tipH * cH, w: PROBOSCIS_FACE.tipW * cW };
        case 'beak': {
            const len = Math.max(sn, 0.15 * H);
            return { x: 0.36 * H + len, y: -0.05 * cH, h: 0.1 * cH, w: 0.06 * cW };
        }
        case 'flat-face': {
            const len = Math.max(0.05 * H, sn * 0.6);
            return { x: 0.36 * H + len, y: -0.42 * cH, h: 0.34 * cH, w: 0.42 * cW };
        }
        case 'blunt': return { x: 0.6 * H + sn * 0.3 + 0.7 * cW, y: 0, h: 0.5 * cH, w: 0.75 * cW };
        case 'mandibles': {
            const len = Math.max(0.25 * H, sn * 1.1);
            return { x: 0.72 * H + len, y: -0.25 * cH, h: 0.3 * cH, w: 0.3 * cW };
        }
    }
}
/** The proboscis face's muzzle: section at the tip (fractions of cH and cW), chosen so the tip section is round
 * (0.92 cH vs 1.02 x 0.9 cH = 0.918 cH) and the trunk's first ring can be that section itself; the muzzle is at least
 * minMuzzle x H long (snoutLength 0 would collapse its stations). The muzzle is short against its section, so its
 * stations stay square to the head axis (a pitched station would fold its underside onto the one before) and the
 * trunk's first bone leaves along the head axis: the trunk bends down along its own length.
 * face-geometry-2 (EC4): tipH 0.5 -> 0.92 and tipW 0.55 -> 1.02. GPT Luna 6 read the face-round trunk as "a tube attached
 * to the front of the head ... its base looks pinched and narrower than the face around it", and at 0.72 / 0.8 still
 * "the base is narrow relative to the face" (2 of 4 trunks, luna/after-trunk.txt), and at 0.8 / 0.89 "narrow, tube-like base" (luna/a12-trunk-r1/r2); at
 * 0.92 / 1.02 with taper power 1.25 all 4 passed 2 of 2 runs (luna/a13-trunk-r1/r2). The base is ~1.8 x as wide. */
export const PROBOSCIS_FACE = Object.freeze({ tipY: -0.2, tipH: 0.92, tipW: 1.02, minMuzzle: 0.08 });
/** The trunk's base radius against the face tip: min(tip.w, tip.h), the tip section itself (round within 1%), so the
 * bone sections take over without a step and only the trunk's own taper slopes its surface at the junction. */
export const PROBOSCIS_TRUNK_BASE = 1;
/** Trunk length per unit recipe trunkLength, in head lengths (graph-3: 2.1). Luna: "roughly 1.5-2 head lengths ...
 * the face is small relative to the trunk"; the default trunkLength 0.8 now builds 1.16 head lengths, 1.0 builds 1.45. */
export const PROBOSCIS_TRUNK_LENGTH = 1.45;
/** Trunk taper: radius at fraction u of its length = tip + (base - tip) x (1 - u)^power. A thick base that narrows
 * quickly, then a long slender hand, instead of graph-3's linear cone (base 1, tip 0.38). */
export const PROBOSCIS_TRUNK_TAPER = Object.freeze({ tip: 0.3, power: 1.25 }); // power 1.6 -> 1.25 at a13 (less pinched base)
export function composerTrunkRadius(baseR, u) {
    const T = PROBOSCIS_TRUNK_TAPER;
    return baseR * (T.tip + (1 - T.tip) * Math.pow(1 - Math.min(1, Math.max(0, u)), T.power));
}
/** The trunk's rest shape (radians of world pitch per bone, in the head's sagittal plane; 0 = horizontal, negative =
 * down). The trunk droops from the face toward `hang` (an elephant's trunk hangs from its face): bone i at fraction
 * (i + lead) / (n - 1 + lead) of the way, eased by `ease`, so bone 0 already turns down (the skin's join blend keeps the
 * surface tangent-continuous with the muzzle, which runs along the head axis) and its last bone flicks forward by `flick`. A trunk too long for the face's
 * height above the ground curls forward and up from bone `from` on (a J, as an elephant rests a long trunk): bone
 * from + k turns `curl` x (k + 1) further, never past `maxPitch`. The rig picks the latest `from` and then the smallest
 * curl (up to curlMax per bone) that keep the trunk off the ground (composerTrunkRestShape); graph-3 instead lifted the
 * lowest bone off the ground at a kink (resolveRestClearance, kept as a last resort). */
export const PROBOSCIS_TRUNK_SHAPE = Object.freeze({ hang: -1.45, ease: 0.5, lead: 0.4, flick: 0.55, curlMax: 0.9, maxPitch: 1.1 });
export function composerTrunkRestAngles(n, headPitch, from = n, curl = 0) {
    const S = PROBOSCIS_TRUNK_SHAPE, out = [];
    for (let i = 0; i < n; i++) {
        const u = n > 1 ? Math.min(1, (i + S.lead) / (n - 1 + S.lead)) : 0;
        let a = headPitch + (S.hang - headPitch) * Math.pow(u, S.ease) + (i === n - 1 && n > 1 ? S.flick : 0);
        if (i >= from)
            a = Math.min(Math.max(a, S.maxPitch), a + curl * (i - from + 1));
        out.push(a);
    }
    return out;
}
/** Picks the rest shape: no curl when `clear` (a test of a candidate angle list) passes already, else the latest curl
 * start and the smallest curl there that pass (bisection, deterministic), else the fullest curl (and the rig's
 * clearance fallback lifts the rest). */
export function composerTrunkRestShape(n, headPitch, clear) {
    if (clear(composerTrunkRestAngles(n, headPitch)))
        return composerTrunkRestAngles(n, headPitch);
    const cm = PROBOSCIS_TRUNK_SHAPE.curlMax;
    for (let from = n - 1; from >= 1; from--) {
        if (!clear(composerTrunkRestAngles(n, headPitch, from, cm)))
            continue;
        let lo = 0, hi = cm;
        for (let k = 0; k < 24; k++) {
            const mid = (lo + hi) / 2;
            if (clear(composerTrunkRestAngles(n, headPitch, from, mid)))
                hi = mid;
            else
                lo = mid;
        }
        return composerTrunkRestAngles(n, headPitch, from, hi);
    }
    return composerTrunkRestAngles(n, headPitch, 1, cm);
}
