import { type ComposerRecipe } from './fauna-composer-recipe.ts';
import { type CoatRegion } from './fauna-coat-vocab.ts';
import { type CoatGenome } from './fauna-coat-fields.ts';
import { type ComposerIndividualTraits } from './fauna-composer-individual.ts';
import { type ComposerGraph, type Vec3 } from './fauna-composer-rig.ts';
/** Procedural, experimental skin for a composer graph. Every visible part is
 * real geometry skinned to explicit bones: chain tubes follow centripetal
 * Catmull-Rom centrelines through the joints, limb roots blend out of the body
 * through weighted transition rings, the neck blends into the head through
 * weighted rings in the head frame, and rigid parts (beaks, horns, feet, hands,
 * shells, plates, feathers) carry full weight on their bone. Vertex colours come
 * from the shared fauna coat library (fauna-coat-1), sampled at each vertex's
 * true 3D position. Output is plain arrays so it can be inspected in tests. */
/** skin-4 (eye round EC2): the eye catalogue geometry (fauna-composer-eye-2) under the current eye rules, and the blunt
 * mouth disc shaded as a mouth; the earlier eye rules (eyeRules 1) still build skin-3 byte for byte. */
/** skin-5 (coat crisp v1, docs/fauna-coat-crisp-v1.md): crisp-coat layer colours per vertex for the per-fragment coat. */
export declare const COMPOSER_SKIN_VERSION = "fauna-composer-skin-5";
/** The per-fragment ("crisp") coat: the shader that evaluates the pattern per fragment (fauna-composer.ts) and the
 * layer colours the skin carries for it. */
export declare const COMPOSER_COAT_CRISP_VERSION = "fauna-composer-coat-crisp-1";
/** Patterns the crisp coat draws per fragment (index + 1 = the shader's pattern code). Stripes, bands and brindle are
 * crisp off the limbs only (their limb rings follow the limb axis, which the shader does not know). Others (plain,
 * saddle, dorsal-stripe, piebald, roan) keep the vertex colours. */
export declare const COMPOSER_COAT_CRISP_PATTERNS: readonly ["spots", "rosettes", "reticulated", "dapple", "stripes", "bands", "brindle"];
export type ComposerCoatCrispPattern = typeof COMPOSER_COAT_CRISP_PATTERNS[number];
/** What the crisp-coat shader needs besides the per-vertex layers: the frozen pattern's parameters at the REQUESTED
 * (unclamped) scale and the coat frame that maps a bind-space position to the pattern-space sample. */
export interface ComposerCoatCrisp {
    version: typeof COMPOSER_COAT_CRISP_VERSION;
    pattern: ComposerCoatCrispPattern;
    /** 1-based pattern code of the shader (COMPOSER_COAT_CRISP_PATTERNS index + 1). */
    code: number;
    /** The coat genome at the REQUESTED scale (coatScale.requested, never the clamped one): the CPU twin of the shader
     * evaluates coatPatternProbe with it. */
    genome: CoatGenome;
    /** seedMix(genome.seed) as an unsigned 32-bit integer. */
    seed: number;
    /** COAT_CELLS_PER_BODY[pattern] x the requested scale. */
    cellsPerBody: number;
    threshold: number;
    warp: number;
    bellyLine: number;
    /** sample.x = ((p.x, p.y) - origin) . forward / scale, sample.y = ((p.y - origin.y) forward.x - (p.x - origin.x) forward.y) / scale, sample.z = p.z / scale. */
    frame: {
        origin: [number, number];
        forward: [number, number];
        scale: number;
    };
}
/** Per-vertex crisp-coat layers (linear RGB, 3 per vertex): c0 = the coat at pattern mask 0, c1 = at mask 1 (patch
 * shade 0), c2 = at mask 1 (patch shade 1). The shaded colour is c0 + m (c1 - c0) + m p (c2 - c1) for the fragment's
 * mask m and patch shade p (the coat is affine in both). A vertex that did not sample the coat itself carries its
 * vertex colour in all three, so the mask cannot change it. `sample` (4 per vertex) is the pattern-space point
 * (x, y, z in body lengths, the coat frame) and the coat dorsal value the vertex was coloured with; vertices without
 * their own sample get their position in the coat frame and dorsal 0. */
export interface ComposerCoatLayers {
    c0: Float32Array;
    c1: Float32Array;
    c2: Float32Array;
    sample: Float32Array;
}
export type ComposerSkinPart = 'torso' | 'neck' | 'tail' | 'head' | 'eyes' | 'mouth' | 'horn' | 'trunk' | 'leg' | 'foot' | 'arm' | 'hand' | 'wing' | 'armor' | 'tail-tip';
/** Radial segments and rings per bone of the lofted tubes (feet and toes keep their own tessellation). */
export declare const COMPOSER_SKIN_TESSELLATION: Readonly<{
    torsoRadial: 28;
    torsoRadialBanded: 22;
    torsoRings: 7;
    torsoRingsAnnulated: 9;
    neckRings: 6;
    tailRings: 6;
    legRadial: 16;
    legRadialArthropod: 9;
    legRings: 6;
    legRingsArthropod: 3;
    armRadial: 14;
    armRings: 4;
    /** lidded eyes (fauna-composer-eye-1): EYE_PATCH.segments around, centre + 7 rings + the closing cone */
    eyeRadial: 20;
    eyeStations: 7;
    rootRings: 4;
}>;
/** Region code for vertices that carry no coat region. */
export declare const COMPOSER_SKIN_NO_REGION = 255;
/** One lofted ring of a chain tube (bind space), reported when `debug` is requested. */
export interface ComposerSkinRing {
    /** 'axial' (tail tip -> torso -> neck -> head blend), 'leg <n><L|R>', 'arm <L|R>' or 'trunk'. */
    chain: string;
    /** 'bone': regular ring; 'joint': the extra rings at +-12% around an interior joint; 'blend': neck-to-head;
     * 'root': limb-root transition ring (the last one is the first limb ring). */
    kind: 'bone' | 'joint' | 'blend' | 'root';
    bone: number;
    part: string;
    f: number;
    centre: Vec3;
    tangent: Vec3;
    rx: number;
    ry: number;
    ryBelow: number;
    weights: [number, number][];
    region: CoatRegion;
}
export interface ComposerSkinDebug {
    rings: ComposerSkinRing[];
    /** Interior joints whose spline overshot and fell back to the polyline. */
    splineFallbacks: number;
    coat: {
        pattern: string;
        requestedScale: number;
        effectiveScale: number;
        cellsPerBody: number;
        /** Mean pattern cell diameter in metres (Infinity for patterns without cells). */
        meanCellDiameter: number;
        /** Torso median edge estimated from the torso rings before colouring (metres). */
        torsoEdgeEstimate: number;
    };
    traitsNeutral: boolean;
    /** Crisp coat (skin-5): own = 1 where the layers were sampled at the vertex itself; sample = the exact (double)
     * coat sample of those vertices, 6 per vertex (x, y, z, dorsal, along, footprint), NaN elsewhere. Null without the
     * crisp coat. */
    coatVertex: {
        own: Uint8Array;
        sample: Float64Array;
    } | null;
    /** skin-5: 1 per triangle of a cap or disc that closes a part inside another part (left out of welded seam normals). */
    hiddenTriangles: Uint8Array;
    /** skin-5: the neck-to-head blend rings still crossed after fanOutBends and were turned monotonically instead. */
    blendUnfolded: boolean;
    /** The eyes as built (fauna-composer-eye-1): one entry per eye, head-local geometry and the skin vertex range. */
    eyes: ComposerSkinEyeDebug[];
    /** The palette's eye colour and the built iris colour (null: compound eyes or eyespots), for colour audits. */
    eyeColours: {
        eye: [number, number, number];
        iris: [number, number, number] | null;
        lidFactor: number;
        compound: [number, number, number] | null;
    };
}
export interface ComposerSkinEyeDebug {
    side: number;
    type: string;
    /** eye radius (lidded) or the dome / disc radius, metres */
    er: number;
    /** head-local eye centre (lidded: recessed below the skull surface) and unit gaze */
    centre: [number, number, number];
    gaze: [number, number, number];
    /** head-local skull-surface point the eye was seated on (null: fallback) */
    surface: [number, number, number] | null;
    /** first skin vertex of the eye and the first vertex of each ring (absolute skin vertex ids) */
    firstVertex: number;
    vertexCount: number;
    rings: number[];
    triangles: number;
    rimFallbacks: number;
}
export interface ComposerSkin {
    version: typeof COMPOSER_SKIN_VERSION;
    positions: Float32Array;
    colors: Float32Array;
    skinIndex: Uint16Array;
    skinWeight: Float32Array;
    index: Uint32Array;
    /** skin-5: the shading normals (three's area-weighted vertex normals, except that every welded seam group - vertices
     * with bitwise-equal positions and equal skin indices and weights, outside the eyes - shares one normal built from
     * its visible faces). createComposerCreature and the export ship these. */
    normals: Float32Array;
    /** Per-vertex gloss in [0, 1] (0 everywhere but the eyes): the material lowers roughness toward 0.06 with it. */
    gloss: Float32Array;
    /** Eyes that found no skull surface along their gaze and kept the old fixed offset (expected 0). */
    eyeFallbacks: number;
    /** Coat region per vertex: an index into COAT_REGIONS, or COMPOSER_SKIN_NO_REGION. */
    regions: Uint8Array;
    /** Triangle ranges per anatomical part (start/count in triangles). */
    parts: {
        part: ComposerSkinPart;
        label: string;
        firstTriangle: number;
        triangles: number;
        bones: number[];
    }[];
    vertexCount: number;
    triangleCount: number;
    /** Pattern scale asked for vs drawn: the pattern clamp keeps a mean pattern cell at least four torso
     * edges across, so above `effective` a finer scale looks the same on this body (the Lab says so). */
    coatScale: {
        pattern: string;
        requested: number;
        effective: number;
    };
    /** skin-5: the crisp coat (null: the pattern is not drawn per fragment) and its per-vertex layers. */
    coatCrisp: ComposerCoatCrisp | null;
    coatLayers: ComposerCoatLayers | null;
    debug?: ComposerSkinDebug;
}
export interface ComposerSkinOptions {
    /** Individual traits to build with (default composerIndividualTraits(graph.recipe)). */
    traits?: ComposerIndividualTraits;
    /** Report ring centrelines, spline fallbacks and coat scale in `debug`. */
    debug?: boolean;
}
type RGB = [number, number, number];
/**
 * skin-5 shading normals (docs/fauna-coat-crisp-v1.md, metric c). three's computeVertexNormals (area-weighted face
 * normals) everywhere, except welded seam groups: vertices with bitwise-equal Float32 positions and equal skin indices
 * and weights, outside the eyes. Each part used to get its own normals there, so the coincident seam vertices shaded
 * differently (the dotted light line at the neck-to-head and trunk seams, EC4). A group's members now share one
 * normal: the sum of the members' unit VISIBLE normals (each member's area-weighted visible faces; faces of hidden
 * caps and discs, which close a part inside another, are left out), so each side of the seam counts once. A group
 * with no visible face uses all its faces, and a degenerate sum keeps its lowest member's own normal - always one
 * bitwise value per group.
 */
export declare function composerSeamNormals(positions: Float32Array, index: Uint32Array, skinIndex: Uint16Array, skinWeight: Float32Array, hidden: Uint8Array, excluded: Uint8Array): Float32Array;
export declare function buildComposerSkin(graph: ComposerGraph, options?: ComposerSkinOptions): ComposerSkin;
/** The species' body length behind an individual's effective recipe: the individual derivation scales bodyLength by
 * size, sex and maturity (fauna-composer-individual.ts), and 'auto' eyes must not change pupil with them (a kitten
 * keeps its species' pupil, a herd shares one). Rounded to the recipe's 0.01 m step. */
export declare function composerSpeciesBodyLength(r: ComposerRecipe, traits: ComposerIndividualTraits): number;
/** Iris luminance floors: at least 10x the pupil, and at least 1.8x the lid rim (eyes stay readable on dark coats). */
/** Compound-eye facet floor: at least `min` luminance and `overSkin` x the head skin under the eye, reached by blending
 * the palette eye colour toward `tint`. */
export declare const COMPOUND_EYE_FLOOR: Readonly<{
    min: 0.03;
    overSkin: 2;
    tint: RGB;
}>;
export declare const COMPOSER_EYE_CONTRAST: Readonly<{
    overPupil: 10;
    overLid: 1.8;
    maxIrisGain: 4;
    lid: 0.35;
    outerLid: 0.7;
}>;
/** The trunk's section and orientation ease from the muzzle's last station over this many station radii. */
export declare const TRUNK_JOIN_BLEND = 1.2;
/** skin-5: the join curve's start tangent length (x its chord): above 1 the curve holds the muzzle axis a little longer,
 * so its turn peaks mid-join instead of at the muzzle (max ring turn 8.3 -> 7.4 deg on the trunked centipede). */
export declare const TRUNK_JOIN_LEAD = 1.3;
/** skin-5: past the join reach, trunk rings are spread by arc length plus turn (one TRUNK_RESPACE_TURN of turn
 * counts like a mean ring spacing of length), so a curled trunk end gets rings from its straight run, same count. */
export declare const TRUNK_RESPACE_TURN: number;
/** skin-5: in that respacing a section radius change by this log ratio counts at least like one mean spacing, so the
 * rings leaving a straight but tapering run keep consecutive radius steps small. */
export declare const TRUNK_RESPACE_TAPER: number;
/** The trunk keeps the muzzle's radial count for this many join radii before it zips down to 12 segments. */
export declare const TRUNK_ZIP_LENGTH = 0.5;
/** Trunk radial segments (skin EC4; 12 before: Luna saw "visible flat facets on the trunk"). */
export declare const TRUNK_RADIAL = 16;
/** Rim inset of the two hidden discs closing the muzzle and the trunk at their shared junction ring (skin EC4). */
export declare const HIDDEN_DISC_INSET = 0.96;
/** Trunk wrinkle shading: [accent mix, wrinkles along the trunk] (skin EC4; face round 0.18 x 4 bands). */
export declare const TRUNK_WRINKLE: readonly [0.08, 6];
/** Proboscis flap ears (skin EC4; the face round built a 14 x 4 ellipsoid flared 30 degrees): `flare` degrees out from
 * the head axis, `length` back from the root, the sheet's upper and lower edge (`top`, `lobe`: a deeper lower lobe toward
 * the back), its half thickness from `root` at the front to `rim`, the outward bow, and the tessellation (`segments`
 * around the thin section, `stations` along the ear). Units: head length x earScale. */
export declare const PROBOSCIS_EAR: Readonly<{
    flare: 22;
    length: 0.44;
    top: 0.15;
    lobe: 0.3;
    root: 0.05;
    rim: 0.012;
    bow: 0.035;
    segments: 12;
    stations: 10;
}>;
/** The trunk's nostril end (skin EC4), in units of the last trunk ring's radius r, along the last bone's axis from the
 * ring: a bulbous lip (`bulb`: [forward, radius] stations, widest `flare`) mottled pale pink, rolling in to the end face
 * at `faceAt` (its radius `face` x r),
 * two nostrils (half axes `nostril` x r, `nostrilTall` taller than wide, `nostrilZ` x r either side of the middle) on
 * that face, and a dorsal finger (an elephant's prehensile lip; `finger` = [forward, up, half length, half height,
 * half width]). Everything stays within COMPOSER_TRUNK_TIP_CLEARANCE end radii of the bone end, which the rig keeps
 * above the ground. GPT Luna 6 on the face-round tip: "The tip looks blunt and capped. A nostril or lip detail is too
 * small to make out." A pale pink lip (lipMix 0.4) then read as "a small, plain-looking cap" (luna/after-trunk.txt): the lip is
 * now the plain coat, the end swells gently (a steep flare caught the light as a pale ring), the end face is darkened by
 * `faceDark` and the nostrils are larger. skin-5 (coat crisp v1, metric d3): the end rolls in over two rings past the
 * widest (1.04 and 0.9 r) to a flat face of 0.62 r (was 0.86 r behind a 1.06 r ring, a flat-cap ratio of 0.78 that read
 * as a cap); the nostrils sit closer together (0.3 r, half width 0.22 r) to stay on the smaller face. */
export declare const TRUNK_TIP: Readonly<{
    bulb: readonly (readonly number[])[];
    flare: 1.1;
    faceAt: 0.56;
    face: 0.62;
    nostril: 0.22;
    nostrilTall: 1.35;
    nostrilZ: 0.3;
    nostrilY: 0.02;
    finger: readonly number[];
    lipTone: readonly number[];
    lipMix: 0;
    faceDark: 0.35;
}>;
/** Muzzle nostrils stand this far (x H) proud of the muzzle cap; the worm's mouth disc lies this far (x H) off its cap. */
export declare const NOSTRIL_PROUD = 0.012;
export declare const MOUTH_DISC_LIFT = 0.0035;
/** Jaws crest fin: half thickness (x cW) and how far its base sinks into the skull (x H). */
export declare const CREST_HALF_THICKNESS = 0.09;
/** The blunt face's mouth under the current eye rules (fauna-composer-eye-2): a CLOSED mouth drawn on the cap, a
 * lens-shaped patch of `columns` columns (two end points) x `rows`, draped on the cap like the old disc. The face
 * round's flat dark disc, a dark-centred radial gradient, a pale-lipped radial pucker and a slit painted on the radial
 * disc all read as a hole or a sucker (GPT Luna 6, face round: "a large dark circular ... opening ... hole"; EC2
 * review: "nearly black center and heavy circular rim suggest an opening"; EC2 r21: "a recessed hole or sucker ...
 * thick raised rim ... radial pattern"; r22/r23: a dark-red line on the lens read as "a slit or shallow hole"). The
 * patch's edge is the cap's own colour (it melts into the cap); inside, pale pink lips either side of a pink lip line
 * that tapers to the corners. Nothing in it is darker than the cap (`floor`), and the lips are paler (`lipFloor`). Sizes: x craniumWidth (half width) and x craniumHeight (centre y, droop, half height). */
export declare const MOUTH_SLIT: Readonly<{
    halfWidth: 0.3;
    y: -0.04;
    droop: 0.06;
    halfHeight: 0.07;
    columns: 12;
    rows: readonly number[];
    slit: RGB;
    toSlit: 0.6;
    lip: RGB;
    toLip: 0.55;
    /** luminance floors relative to the cap: the line at least 0.85 x the cap, the lips at least the cap */
    floor: 0.85;
    lipFloor: 1;
}>;
/** Gaze pitch above the head's long axis for lidded and compound eyes, degrees. */
export declare const COMPOSER_EYE_PITCH_DEG = 5;
/** Eyespots sit on the upper front of a worm's cap. */
export declare const COMPOSER_EYESPOT_PITCH_DEG = 35;
/** Catalogue-path eye numbers (fauna-composer-eye-2, eye round EC2). Design values tuned in review at normal viewing
 * size; colours are linear RGB, luminances Rec.709. */
export declare const COMPOSER_EYE_CATALOGUE: Readonly<{
    /** camera eyes: er = max(profile k, minK) x sizeBoost x preset size x craniumHeight x eyeScale x eyeRel. The face
     * round's eyes read "tiny" or vanished on large dark heads (proboscis k 0.07); the floor and the boost fix the size. */
    minK: 0.14;
    sizeBoost: 1.12;
    /** iris: an absolute luminance floor on top of the face round's floors (10x the pupil, 1.8x the lid rim), and a
     * larger gain limit, so a dark-brown iris reads as brown, not as a hole */
    irisMin: 0.1;
    maxIrisGain: 8;
    /** a bare periocular ring: the outer lid blends toward this pale skin until its luminance reaches periocularLum or
     * periocularOverSkin x the skin under it, whichever is higher (never past the ring colour itself): a halo a little
     * paler than the face around the dark eye (the face round's eyes vanished into dark and mid-grey faces) */
    periocular: RGB;
    periocularLum: 0.18;
    periocularOverSkin: 1.3;
    periocularSkinGain: 2.5;
    periocularOwnLum: 0.08;
    sclera: RGB;
    nictitans: RGB;
    nictitansMix: 0.6;
    brow: 0.85;
    /** owl facial disc: its pale band (the outer-lid ring) mixes discMix toward `disc` and is lifted to at least discLum,
     * and its edge (the orbit ring) mixes discEdge toward it, so the whole disc is pale out to a crisp edge on the skin (EC2
     * review: at mix 0.3 the disc read only as pale strips beside the beak, "the facial-disc ring is missing or unclear",
     * and a dark ruff read as "heavy dark brows", GPT Luna 6) */
    disc: RGB;
    discMix: 1;
    discLum: 0.4;
    discEdge: 0.6;
    /** compound eyes: facet floor (luminance, and a multiple of the head skin), lens shades (a, b), lattice and pseudopupil */
    facetMin: 0.15;
    facetOverSkin: 3;
    lens: readonly number[];
    lattice: 0.55;
    pseudopupil: 0.12;
    /** compound domes are this much larger than the face round's (they vanished at normal size) */
    compoundScale: 1.45;
    /** compound eyes on a mandibles head are larger again: there they read as small bumps */
    mandibleScale: 1.3;
    /** how deep (x the dome's depth radius) a compound dome's centre sits under the skin along its gaze */
    compoundSink: 0.5;
    /** eyespot bead: radius on a worm cap (x craniumHeight) and on any other face (x the camera er); pigment tint (never
     * black), the rim (the skin under it; rimGain 1: not brightened) and the cap's own eyespot gaze */
    eyespotR: 0.09;
    eyespotOnFace: 0.75;
    pigment: RGB;
    pigmentMix: 0.85;
    rimGain: 1;
    eyespotEdgeToSkin: 0.3;
    eyespotLum: 0.9;
    /** a worm cap's eyespots sit higher and wider than the face round's discs, clear of the mouth disc */
    eyespotYawDeg: 24;
    eyespotPitchDeg: 42;
    /** simple eyes (spider eyes, ocelli, a snail's stalk tip): near-black glossy lenses with a slightly paler socket rim */
    ocellus: RGB;
    ocellusRim: RGB;
    ocellusRimMix: 0.6;
    /** a spider bead's centre stays this many flange radii off the midline */
    ocellusClear: 1.35;
    /** chameleon turret skin: a little paler than the coat under it; the aperture (pupil, iris, limbus and opening) this
     * much wider than the preset's pinhole, ringed with a pale rim, and the cone's shoulder and aperture rim (er) set so
     * the turret reads as a cone with a hole at normal size, not as a smooth knob */
    turretGain: 1.2;
    turretOpen: 2;
    turretRim: RGB;
    turretRimMix: 0.5;
    turretShape: {
        w: number;
        lift: number;
        aperture: number;
    };
    turretSize: 1.3;
    turretStripe: 0.6;
    /** a lidless (spectacle) eye: the skin up to the brille edge is the coat a little darkened, no periocular halo */
    brilleEdge: 0.8;
    /** a horizontal bar pupil is at least barMin wide and at most barMax tall (er), with square-ish ends (superellipse
     * exponent at least barSquare): the frog's fat oval read as round, then as an oval */
    barMin: 0.62;
    barMax: 0.17;
    barSquare: 5;
    /** a vertical slit pupil is at least slitMin (er) half-wide: the 0.08 hairline vanished at normal size */
    slitMin: 0.12;
    /** a vertical-slit, wide-slit or W-pupil eye is this much larger: at the preset size the slit was unreadable on a
     * big crocodilian head, the cat's iris on a long muzzle and the cuttlefish W on a horse */
    slitSize: 1.25;
    /** the cat kind is up to `size` larger again, but never past maxEr x craniumHeight by the boost (the preset size on a
     * long muzzle read as "eyes too small and side-set" at normal size, GPT Luna 6, EC2 review), and it turns toward a
     * skull leaning away from its look like a lidless eye, by the excess over tiltDeg (at the full size and the preset's
     * yaw it stood 0.7 er proud of the skull on its muzzle side, read as "rim flaps" and "layered protrusions") */
    cat: {
        size: number;
        tiltDeg: number;
        maxEr: number;
    };
    /** the owl kind is a little smaller than its preset, so its facial disc shows around the eye (at 1.6 the eyes filled
     * the face and the disc showed only as pale strips; "the eyes look very large and protruding", GPT Luna 6, EC2 review),
     * sits `up` x craniumHeight higher (off the beak's base), and its two discs meet `midline` x craniumWidth off the
     * midline (at 0.03 a blue stripe split the face, "a sharp blue wedge cuts down the forehead") */
    owl: {
        size: number;
        up: number;
        midline: number;
    };
    /** chameleon turret axis = look + turretNormal x the skull normal (normalised): nearly the normal */
    turretNormal: 4;
    /** camera-eye seat: when the skull under the eye (the mean normal of five exits, the site and `reach` er either way
     * along both in-plane axes) leans more than `deg` from the look, or the eye would overhang the skull (an exit
     * missing), the site moves on a grid (x head length, x craniumHeight) to the one that faces the look best, less
     * `move` per unit of offset: a big eye at a skull corner or on a narrow head top otherwise stands out as a slab. An
     * lidless spectacle eye (its brille edge sits at cornea height, so no lid hides the skull falling away under a big
     * eye) whose seat still leans more than `tiltLidless` degrees from the look turns toward the skull by the excess. */
    seat: {
        deg: number;
        tiltLidless: number;
        reach: number;
        dx: readonly number[];
        dy: readonly number[];
        step: number;
        move: number;
    };
    /** eye stalks: length x craniumHeight (worm cap, any other face), males x (1 + dimorphism x stalkDimorphism) */
    stalkLength: {
        blunt: number;
        other: number;
    };
    stalkDimorphism: 0.6;
    stalkR: readonly number[];
    stalkBulb: 0.13;
    stalkBead: 0.09;
}>;
/** The eight spider eyes per pair (anterior median, anterior lateral, posterior median, posterior lateral): radius
 * (x craniumHeight), gaze yaw and pitch (degrees), lateral offset (x craniumWidth), site offsets (x head length, x
 * craniumHeight) from the face's eye site, and the bead's tessellation; every bead has a pale rim so it reads on a
 * black head: a dark dome in a pale flange ring on the skin (the stations-only pale rim of an earlier cut read as
 * "hard to count", GPT Luna 6, EC2 r29). 2 x (40 + 3 x 20) = 200 triangles: the design cap (eye-catalogue-v2 budgets,
 * spider <= 200), with the side pairs as pentagonal beads; the beads are larger than the first passes' (main 0.32, was
 * 0.26; sides 0.14-0.15, were 0.10-0.11) since at the cap's tessellation size is the legibility lever. EC2's first passes used
 * 2 x (72 + 3 x 48) = 432 without disclosure; cut back to the cap after the EC2 review. */
export declare const SPIDER_EYES: readonly {
    r: number;
    yaw: number;
    pitch: number;
    z: number;
    dx: number;
    dy: number;
    segments: number;
    stations: number;
    rim: boolean;
}[];
export {};
