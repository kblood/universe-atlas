/**
 * Eye geometry for the modular creature composer (fauna-composer-eye-1, face round WP4; fauna-composer-eye-2, eye round EC2).
 *
 * Pure: plain number arrays, no rendering library, no randomness, no clock, so every function here can be
 * unit-tested in node. Erasable TypeScript only (Node type-strips src/*.ts). The mesh glue
 * (fauna-composer-mesh.ts) places, colours and skins what these functions return.
 *
 * All coordinates are head-local (x forward along the head bone, y up, z lateral), in metres.
 *
 * - raycastFirstHit / raycastLine / nearestExit: ray and line queries against a triangle soup (9 numbers per
 *   triangle, outward winding), used to seat an eye on the already-built skull.
 * - buildEyePatch: a lidded vertebrate eye, a 20-segment ring patch: pupil (round, horizontal bar or vertical slit),
 *   iris, limbus, an almond lid opening, a raised outer lid and an orbit ring that lies on the skull surface. A cone
 *   behind it closes the patch, so the eye part is a closed outward surface like every other part.
 * - buildCompoundEye: an arthropod compound-eye dome (12 x 5) with a facet checker and a dark pseudopupil at its apex.
 * - buildEyespot: a worm's flush pigment eyespot (8 triangles).
 *
 * fauna-composer-eye-2 (eye catalogue EC2) appends the catalogue geometry and leaves every function above untouched, so
 * the face round's build ("Earlier eye rules", eyeRules 1) stays byte-identical:
 * - catalogueEyeSpec + buildEyePatch({spec}): the same 20-segment, 7-ring patch (280 triangles) with preset pupils
 *   (slit-wide, beaded-slit, W, pinhole, dilated, rounded bar), lid shapes (round, wide-almond, spectacle, turret), brow
 *   deformers of the existing rings (shelf, raised orbit, facial disc, turret cone), a white-sclera ring layout, an
 *   in-plane roll, a nictitating-membrane role and a per-vertex iris pattern factor;
 * - buildFacetedEye: a compound eye whose cells are raised lenses on a dark lattice, so it reads as faceted (not a lump);
 * - buildOcellus: a glossy simple-eye bead (spider eyes, insect ocelli);
 * - buildEyespotBead: a domed, glossy pigment eyespot with a pale rim, closed behind;
 * - buildStalk: a tapered, closed eye stalk.
 */
export declare const COMPOSER_EYE_VERSION = "fauna-composer-eye-2";
export type Vec3 = [number, number, number];
export type LiddedEyeType = 'round' | 'horizontal' | 'vertical-slit';
/** Per-vertex roles. The mesh glue colours by role; gloss is per role too. Append-only: the first 12 are
 * fauna-composer-eye-1's; the rest belong to the eye catalogue geometry (fauna-composer-eye-2). */
export declare const EYE_ROLES: readonly ["pupil", "iris-inner", "iris", "limbus", "lid", "outer-lid", "orbit", "socket", "facet-a", "facet-b", "pseudopupil", "eyespot", "sclera", "brow", "nictitans", "turret", "ocellus", "ocellus-rim", "stalk", "facet-edge", "eyespot-rim", "periocular"];
export type EyeRole = typeof EYE_ROLES[number];
export declare const EYE_ROLE: Readonly<Record<EyeRole, number>>;
/** Lidded-eye layout, in units of the eye radius er (radii in the eye plane, lifts along the gaze). */
export declare const EYE_PATCH: Readonly<{
    segments: 20;
    /** pupil edge radius (round); the bar and slit use their own half-axes below */
    pupil: 0.34;
    pupilInnerScale: 1.06;
    iris: 0.65;
    limbus: 0.92;
    horizontalPupil: {
        rx: number;
        ry: number;
        n: number;
    };
    slitPupil: {
        rx: number;
        ry: number;
        point: number;
    };
    /** vertical slit: the iris fills this fraction of the opening */
    slitIrisFill: 0.95;
    slitIrisInner: 0.85;
    /** lid opening (almond): half-width, half-height above and below */
    lid: {
        w: number;
        above: number;
        below: number;
    };
    outerLid: {
        w: number;
        above: number;
        below: number;
    };
    orbit: {
        w: number;
        above: number;
        below: number;
    };
    /** inner rings are clipped to these fractions of the lid opening (pupil edge, inner iris, iris, limbus) */
    clip: readonly number[];
    /** eye centre below the skull surface; every ring's lift above the skin under it: the eyeball (+ the cornea dome toward
     * the centre), the lid margin, the outer lid (at most outerLidDrop below the margin) and the orbit */
    recess: 0.2;
    eyeLift: 0.03;
    lidLift: 0.1;
    outerLidLift: 0.08;
    outerLidDrop: 0.06;
    orbitLift: 0.01;
    /** the exposed eyeball is a sphere cap of this radius cut at the limbus (height ~0.34 er, rim slope ~41 deg), so a
     * light within ~80 deg of the view finds a mirror normal on it: the corneal highlight */
    corneaRadius: 1.4;
    /** a rim vertex looks for the skull surface within this distance of the hit plane */
    rimSearch: 1;
    /** a rim vertex whose line misses takes the depth of the closest skull point within this distance */
    closestSearch: 2.5;
    /** the closing cone's apex behind the eye centre */
    socketDepth: 0.8;
}>;
export declare const EYE_GLOSS: Readonly<{
    cornea: 1;
    lid: 0.4;
    compound: 0.35;
}>;
/** Compound eye dome: radial segments x stations (apex excluded); facet shading amplitude. */
export declare const COMPOUND_EYE: Readonly<{
    segments: 12;
    stations: 5;
    facet: 0.08;
}>;
export declare const EYESPOT_SEGMENTS = 8;
export interface RayHit {
    /** Distance along `dir` (negative behind the origin for line queries). */
    t: number;
    point: Vec3;
    /** Unit geometric normal of the hit triangle (its winding). */
    normal: Vec3;
    /** Triangle index and barycentric weights of vertices b and c (a gets 1 - u - v). */
    tri: number;
    u: number;
    v: number;
}
export interface EyePatch {
    /** xyz per vertex, head-local */
    positions: number[];
    roles: Uint8Array;
    gloss: number[];
    /** three vertex indices per triangle, outward winding */
    index: number[];
    /** Per vertex: the skull-surface hit a rim vertex was projected onto (lid, outer lid and orbit rings), else null. */
    surface: (RayHit | null)[];
    /** Vertices that found no skull surface (neither along the gaze nor within EYE_PATCH.closestSearch) and kept the hit plane. */
    rimFallbacks: number;
    /** First vertex of each ring (centre first), for measurement. */
    rings: number[];
    /** Catalogue path only: per-vertex iris pattern factor (1 = plain), applied by the mesh to the iris colours. */
    shade?: number[];
}
declare const sub: (a: Vec3, b: Vec3) => Vec3;
declare const dot: (a: Vec3, b: Vec3) => number;
declare const cross: (a: Vec3, b: Vec3) => Vec3;
export declare const normalize3: (a: Vec3) => Vec3;
type Tris = ArrayLike<number>;
/** Every crossing of the full line origin + t dir (t of either sign), sorted by t. Shared edges may report twice. */
export declare function raycastLine(tris: Tris, origin: Vec3, dir: Vec3): RayHit[];
/** First hit in front of the origin (t > 1e-9), or null. */
export declare function raycastFirstHit(tris: Tris, origin: Vec3, dir: Vec3): RayHit | null;
/** The exit crossing (normal along dir) of the line through `point` that lies nearest to it, within |t| <= maxAbsT.
 * Choosing the crossing nearest the intended site, rather than the first hit of a ray, keeps a brow, beak or ear
 * that the line passes through from capturing the eye. */
export declare function nearestExit(tris: Tris, point: Vec3, dir: Vec3, maxAbsT?: number): RayHit | null;
/** The closest point of a triangle soup to `p` (Ericson's region test per triangle), with its triangle, barycentric
 * weights and geometric normal; t is 0 (the caller measures depth). */
export declare function closestPointOnSoup(tris: Tris, p: Vec3): RayHit | null;
/** The outermost exit crossing (largest t, normal along dir) of the line through `point` within |t| <= maxAbsT. A ring
 * vertex is seated on it so that no overlapping skull surface (a jaw loft, a cheek) lies outside the eye and hides it. */
export declare function outermostExit(tris: Tris, point: Vec3, dir: Vec3, maxAbsT: number): RayHit | null;
/** Unit gaze from a yaw (degrees from the forward midline toward `side`) and a pitch (degrees up), head-local. */
export declare function eyeGaze(yawDeg: number, pitchDeg: number, side: number): Vec3;
/** In-plane axis of the eye (the pupil bar and the lid opening's long axis): the head-forward projection onto the eye
 * plane blended 0.7 toward the world-horizontal projection, which counter-rolls the rest head pitch. `worldUp` is the
 * world up direction in head-local coordinates. Signed so that gaze x axis points up. */
export declare function eyeBarAxis(gaze: Vec3, worldUp: Vec3, headForward?: Vec3): Vec3;
/** Almond lid opening: in-plane point at angle th (radians) for half-width w and half-heights above/below. */
export declare function lidPoint(th: number, w: number, above: number, below: number): [number, number];
/** Pupil edge in-plane point at angle th, in er. */
export declare function pupilPoint(type: LiddedEyeType, th: number): [number, number];
export interface EyePatchOptions {
    type: LiddedEyeType;
    /** eye radius, metres */
    er: number;
    /** eye centre (recess below the skull surface), head-local */
    centre: Vec3;
    gaze: Vec3;
    /** in-plane long axis (eyeBarAxis); default: from `up` */
    barAxis?: Vec3;
    /** head-local up, used when barAxis is omitted */
    up?: Vec3;
    /** head triangles (9 numbers each) the lid and orbit rings are projected onto; omitted: the hit plane */
    surface?: Tris;
    /** fauna-composer-eye-2: a catalogue preset (catalogueEyeSpec). Omitted: the face round's exact build. */
    spec?: CatalogueEyeSpec;
    /** catalogue path: head-forward, head-local (default +x); orients the roll and the nictitating membrane */
    forward?: Vec3;
    /** catalogue path: rim vertices never cross this plane (unit normal n, minimum offset along it, metres), so two
     * frontal eyes' rims and facial discs never overlap at the midline */
    midline?: {
        n: Vec3;
        min: number;
    };
    /** catalogue turret: where the eye looks (unit, head-local) when the patch is built along the skull normal; the
     * aperture leans that way by CATALOGUE_EYE.turret.lean x its in-plane part */
    look?: Vec3;
}
/** A lidded vertebrate eye. 141 front vertices (centre + 7 rings of 20) + a 21-vertex closing cone; 280 triangles. */
export declare function buildEyePatch(o: EyePatchOptions): EyePatch;
export interface CompoundEyeOptions {
    /** dome radii: in-plane along the long axis, in-plane up, and along the gaze (dome height) */
    er3: [number, number, number];
    /** centre of the dome's base, head-local */
    centre: Vec3;
    gaze: Vec3;
    up: Vec3;
}
/** Arthropod compound eye: a closed half-ellipsoid dome on its base, 12 segments x 5 stations plus an apex (the dark
 * pseudopupil) and a base centre. 120 triangles. Facet roles alternate per station and segment (checker). */
export declare function buildCompoundEye(o: CompoundEyeOptions): EyePatch;
export interface EyespotOptions {
    /** disc radius, metres */
    r: number;
    /** disc centre, head-local */
    centre: Vec3;
    /** disc normal (outward) */
    normal: Vec3;
    up: Vec3;
    /** per-rim-vertex lift along the normal (to sit flush on a curved cap); default 0 */
    rimLift?: (k: number, p: Vec3) => number;
}
/** A worm's pigment eyespot: a flat disc of 8 segments (centre + 8 rim vertices, 8 triangles), gloss 0. */
export declare function buildEyespot(o: EyespotOptions): EyePatch;
/** Newell normal of a closed polygon (vertex ids into an xyz array): the plane normal of a ring, exact for planar or
 * mirror-symmetric rings. */
export declare function ringNormal(positions: ArrayLike<number>, ids: readonly number[]): Vec3;
export { sub as eyeSub, dot as eyeDot, cross as eyeCross };
export type CataloguePupil = 'round' | 'horizontal' | 'vertical-slit' | 'slit-wide' | 'beaded-slit' | 'w' | 'pinhole' | 'dilated';
export interface CataloguePupilSpec {
    kind: CataloguePupil;
    /** round, pinhole, dilated: radius */
    r: number;
    /** bar and slits: half-axes; bar: superellipse exponent n; slits: tip sharpness `point` */
    rx: number;
    ry: number;
    n: number;
    point: number;
    /** beaded slit: half-width of a bead and of a pinch between beads */
    bead: number;
    pinch: number;
}
export type CatalogueBrow = 'none' | 'shelf' | 'raised-orbit' | 'raised-orbit-shelf' | 'disc' | 'turret';
/** Everything the catalogue patch needs, in eye radii (er). Built from a preset's traits by catalogueEyeSpec; plain
 * data, so the mesh glue may adjust it (the legibility rules for the face round's kinds under the current eye rules). */
export interface CatalogueEyeSpec {
    pupil: CataloguePupilSpec;
    /** iris and limbus ring radii; null: the iris fills the lid opening (rings at `fill` fractions of it, the slit look) */
    iris: number | null;
    limbus: number | null;
    fill: readonly [number, number];
    /** lid opening: almond (the face round's formula) or round (an ellipse) */
    lid: {
        shape: 'almond' | 'round';
        w: number;
        above: number;
        below: number;
    };
    /** outer-lid and orbit rings: the lid opening grown by these margins (w, above, below) */
    outerMargin: readonly [number, number, number];
    orbitMargin: readonly [number, number, number];
    /** in-plane roll of the whole eye in degrees, positive = the rear (temporal) corner up (the cat's upswept almond) */
    rollDeg: number;
    brow: CatalogueBrow;
    /** raised orbit: the eyeball, lid and outer lid stand this far proud of the skull (the orbit ring stays on it) */
    raise: number;
    /** extra lift of the upper outer lid (shelf, palpebral bump), how far it is pulled down toward the lid, and the
     * orbit ring's lift in the same arc */
    shelfLift: number;
    shelfDrop: number;
    shelfOrbitLift: number;
    /** owl facial disc: the orbit ring's opening (replaces orbitMargin) */
    disc: {
        w: number;
        above: number;
        below: number;
    } | null;
    /** chameleon turret: the outer-lid ring's radius and lift, and the aperture rim's lift above the skull */
    turret: {
        w: number;
        lift: number;
        aperture: number;
    } | null;
    /** white sclera ring layout (human-like): iris, a sclera ring at the opening, no separate orbit ring */
    sclera: boolean;
    /** lidless spectacle (brille): the lid ring sits at cornea height, glossy, and the outer lid is flush */
    spectacle: boolean;
    corneaRadius: number;
    /** the cornea dome stops rising beyond this radius (null: the limbus) */
    domeLimit: number | null;
    pattern: 'plain' | 'radial' | 'reticulated' | 'reticulated-faint';
    nictitating: 'none' | 'front' | 'lower';
}
/** Catalogue-path numbers (er). */
export declare const CATALOGUE_EYE: Readonly<{
    /** default outer-lid and orbit margins over the lid opening: they reproduce the face round's rings for its almond */
    outerMargin: readonly number[];
    orbitMargin: readonly number[];
    shelf: {
        lift: number;
        drop: number;
        orbitLift: number;
        from: number;
        to: number;
    };
    raised: {
        raise: number;
        cornea: number;
    };
    crocodile: {
        raise: number;
        palpebral: number;
    };
    /** owl facial disc: the orbit ring (the disc's dark rim, the ruff) at w/above/below, and the outer-lid ring (the
     * disc's pale band) `outer` er beyond the lid opening, so a pale ring stands between the dark lid and the ruff (the
     * face round's 0.2 er outer lid left only pale strips beside the beak at normal size, GPT Luna 6, EC2 review); the
     * lid and the pale band stand at least `plate` er above the eyeball's rim, so the disc is a raised plate the eye sits in */
    disc: {
        w: number;
        above: number;
        below: number;
        lift: number;
        outer: number;
        plate: number;
    };
    turret: {
        lift: number;
        aperture: number;
        orbit: number;
        lean: number;
        rimGloss: number;
    };
    sclera: {
        gap: number;
        opening: number;
    };
    nictitatingDeg: 40;
    spectacleLift: 0.02;
    spectacleOuterLift: 0.01;
    /** an outer-lid or orbit vertex whose line along the gaze misses the skull (beyond its silhouette) and whose closest
     * skull point lies more than wrapOff er off its line is wrapped onto that point (lifted along its normal), so the rim
     * hugs a skull that curves away instead of standing in the air as a flap */
    wrapOff: 0.15;
    /** see unair in buildCataloguePatch: an outer-lid vertex more than airOff er above its lift off the skull is pulled onto it */
    airOff: 0.15;
    /** the eyeball stands at most this far (er) above the depth its pupil and inner iris need: a large eye at a skull
     * corner (a lateral eye beside a flat face) otherwise rises to the highest skull point under its rim, a slab */
    domeRiseMax: 0.2;
    pattern: {
        radial: number;
        reticulated: number;
        faint: number;
    };
    /** the W pupil polygon (er) and the point it is sampled from: deep lobes, a raised cusp, a shallow dip on top, wide
     * arms (the first W read as a flat dark band with a notch at normal size) */
    w: readonly (readonly [number, number])[];
    wOrigin: readonly [number, number];
}>;
/** The trait subset catalogueEyeSpec reads (a full EyeTraits satisfies it). */
export interface CatalogueEyeTraits {
    pupil: string;
    pupilShape: Readonly<Record<string, number>> | null;
    lid: string;
    lidShape: Readonly<Record<string, number>> | null;
    brow: string;
    sclera: string;
    irisPattern: string;
    extras: string;
}
/** The catalogue patch spec of a camera-eye preset (its traits). Pure; the numbers are design values tuned in review. */
export declare function catalogueEyeSpec(t: CatalogueEyeTraits): CatalogueEyeSpec;
/** Pupil edge (er) of a catalogue pupil at ring angle th; i/N are the ring index and segment count (the beaded slit is
 * index-aware: two tips plus N/2 - 1 vertices per side, evenly spaced in y, alternating bead and pinch widths). */
export declare function cataloguePupilPoint(p: CataloguePupilSpec, th: number, i: number, N: number): [number, number];
/** The cuttlefish W: the star-shaped polygon CATALOGUE_EYE.w sampled by a ray from CATALOGUE_EYE.wOrigin at angle th. */
export declare function wPupilPoint(th: number): [number, number];
export interface FacetedEyeOptions {
    /** dome radii: in-plane along the long axis, in-plane up, and along the gaze (dome height), metres */
    er3: [number, number, number];
    centre: Vec3;
    gaze: Vec3;
    up: Vec3;
    segments?: number;
    stations?: number;
}
/** Compound-eye numbers: lattice segments x stations, the lens bulge (fraction of the dome radius) and gloss.
 * 12 x 3 = 120 triangles per dome: the design cap (eye-catalogue-v2 budgets: insect set <= 280 = 2 x 120 + 3 x 12 = 276;
 * the face round's compound pair 240). EC2's first passes used 14 x 5 = 252 without disclosure; the EC2 review cut it
 * back. Legibility does not justify the larger lattice: across GPT Luna 6 runs on the same eight specimens the 120 dome
 * (r28: 2 of 4 compound sheets PASS) did no worse than the 252 one (r32, r33: 1 of 5), and a flat-faceted 120 variant
 * did worse (r30: 0 of 4). What fails at normal size on centipede heads is the eye's SIZE (deferred), not the lattice. */
export declare const FACETED_EYE: Readonly<{
    segments: 12;
    stations: 3;
    lens: 0.07;
    gloss: {
        lens: number;
        edge: number;
        pupil: number;
    };
}>;
/** A compound eye that reads as faceted: a half-ellipsoid lattice (dark 'facet-edge' vertices) whose every cell carries
 * its own raised lens centre ('facet-a'/'facet-b', glossy), so the dome breaks the light into many small highlights.
 * The apex vertex is the dark pseudopupil (a small spot fading into the lattice); a base fan closes it. segments x (4 x stations - 2) triangles (12 x 3: 120; 8 x 2: 48). */
export declare function buildFacetedEye(o: FacetedEyeOptions): EyePatch;
export interface OcellusOptions {
    /** base radius and dome height, metres */
    r: number;
    height: number;
    /** base centre, outward normal and an up hint, head-local */
    centre: Vec3;
    normal: Vec3;
    up: Vec3;
    segments: number;
    stations: number;
    /** a pale rim ('ocellus-rim'): without `flange`, the lowest station (no extra triangles) */
    rim?: boolean;
    /** with `rim`, the pale rim is instead a flange ring around a fully dark dome, on the skin (2 x segments more
     * triangles): a dark bead in a pale ring */
    flange?: boolean;
}
/** Simple-eye numbers: the rim flange's radius (x r). */
export declare const OCELLUS: Readonly<{
    flange: 1.4;
}>;
/** A simple eye: a glossy dome of `segments` x `stations` plus an apex and a closing base fan; 2 x segments x stations
 * triangles (5 x 1: 10, 6 x 1: 12, 8 x 1: 16, 12 x 2: 48), plus 2 x segments with a rim flange. */
export declare function buildOcellus(o: OcellusOptions): EyePatch;
export interface EyespotBeadOptions {
    /** pigment radius, metres; the pale rim reaches EYESPOT_BEAD.rim x r and the skin blend ring EYESPOT_BEAD.blend x r */
    r: number;
    centre: Vec3;
    normal: Vec3;
    up: Vec3;
    /** per-vertex lift along the normal so the rim rings sit flush on a curved cap (default 0) */
    rimLift?: (p: Vec3) => number;
}
/** Eyespot bead numbers: segments; ring radii (x r) pigment, pigment edge, rim, skin blend; dome heights (x r). */
/** (fauna-composer-eye-2, EC2 review and r21: the 0.5 r dome read as "dark raised buttons, not subtle pigment"; now a
 * near-flush 0.04 r film with a faint sheen, and the skin-coloured rim and blend rings hug the pigment (0.95 and 1.05 r,
 * were 1.0 and 1.35 r): the bead's flat-draped normals never quite match the cap's smooth ones, so a wide skin ring
 * showed as a grey halo around a button.) */
export declare const EYESPOT_BEAD: Readonly<{
    segments: 12;
    rings: readonly number[];
    heights: readonly number[];
    socketDepth: 0.6;
}>;
/** A worm's pigment eyespot that reads at normal size: a low glossy dome of tinted pigment (apex + 2 rings), a pale rim
 * ring and a ring blending into the skin, closed behind by a cone. 12 x 8 = 96 triangles. */
export declare function buildEyespotBead(o: EyespotBeadOptions): EyePatch;
export interface StalkOptions {
    /** root on the skull, unit direction, length and radii at the root and the tip, metres */
    base: Vec3;
    dir: Vec3;
    up: Vec3;
    length: number;
    r0: number;
    r1: number;
    segments: number;
    rings: number;
    /** how far the root is sunk into the skull (fraction of r0) */
    sink?: number;
}
/** An eye stalk: a tapered tube of `segments` x `rings`, closed at the root (sunk into the skull) and at the tip (hidden
 * inside the eye bulb). segments x 2 x rings triangles. Returns the patch and the tip centre. */
export declare function buildStalk(o: StalkOptions): {
    patch: EyePatch;
    tip: Vec3;
};
