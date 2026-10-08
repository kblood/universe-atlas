// Shared harness sites (relief round 2026-10-03, P6-HARNESS-REPIN).
// Constants only: no terrain or renderer import, so browser harnesses can
// import this from their Node side for free. The search that produced
// SITE_A and the robustness checks it must keep passing live in
// tests/helpers/harness-site-search.mjs and tests/harness-sites.test.mjs.
//
// Users: tests/life-scenario.mjs, tests/forest-frame-fixture.mjs,
// tests/desktop-perf.browser.mjs, tests/rock-acceptance.browser.mjs,
// scripts/render-probe.browser.mjs, scripts/climate-calibration-report.mjs.

/** The living harness world: LETHRA-001, galaxy G001, Maithea (planet 1). */
export const HARNESS_SEED='LETHRA-001';
export const HARNESS_SYSTEM_ID='G001/C2128,0,1/0';
export const HARNESS_BODY_ID='G001/C2128,0,1/0/planet/1';
/** The harness date (the catalogue epoch; the dated sea is exactly 0 here). */
export const HARNESS_DATE=435084631200000032044300000n;

const unit=v=>{const l=Math.hypot(...v);return v.map(x=>x/l);};

/** Pre-relief SITE_A (the rock-acceptance "Find life" close-view site,
 * body-frame metres). Under terrain-1.8.0-relief its ground is 188.7 m, only
 * 28.7 m above the 160 m forest coast gate, so it failed the robustness rule
 * (h - sea >= 250 m). Kept for history and as the search origin. */
export const SITE_A_LEGACY_M=Object.freeze([4068880.8,-1511750.9,2855601.0]);
export const SITE_A_LEGACY=Object.freeze(unit(SITE_A_LEGACY_M));

/** Robustness rule for the living inland site (relief-plan P6 (A), plus a
 * whole-disc margin): at the centre forestPotential, h - sea >= 250 m and
 * effectiveMoisture >= 0.6; over rings of 500/1000/2000 m (32 samples each)
 * forestPotential on >= 80% of samples and every sample >= 250 m above the
 * sea (90 m above the 160 m forest gate). Never retune physics to meet it:
 * move the site with the deterministic search instead. */
export const SITE_RULE=Object.freeze({minAboveSeaM:250,minMoisture:.6,minRingForestShare:.8,ringsM:Object.freeze([500,1000,2000]),ringSamples:32});
/** Search: a sunflower (golden-angle) disc of 4096 points, radius 100 km, in
 * the tangent plane of SITE_A_LEGACY; the first index that passes SITE_RULE
 * is the nearest passing site (radius grows with the index). */
export const SITE_SEARCH=Object.freeze({points:4096,radiusM:100000});

/** Eco-class clauses for SITE_A (surface-climate-2 resume, climate-m1-decision 2026-10-08 decision 1; Opus-decided on
 * Kasper's instruction, overrulable). On top of SITE_RULE (unchanged), the site must keep increment-1 life behaviour:
 * (2) the centre and the SITE_RULE rings are in LEGACY_BEHAVIOUR_CLASSES {4,5,6} at the live values AND with the
 * seasonal half-range shifted by +-halfShiftK (Tw and the datum warmest month move by +-1 K, Tc by -+1 K, Ta fixed),
 * which covers the "Tc margin >= 1 K" clause of Q2(a) and the boreal edge; (3) the extraRingsM rings of
 * extraRingSamples points are in {4,5,6}; (4) groundLookOf is all zeros at the centre. Clauses 3 and 4 are what
 * tests/eco-identity-site.test.mjs asserts; the rings use that test's tangent basis. */
export const SITE_CLASS_RULE=Object.freeze({halfShiftK:1,extraRingsM:Object.freeze([5000,10000]),extraRingSamples:64});
/** Whole-planet search (decision 1): 65,536 Fibonacci directions over the harness body, visited in great-circle order
 * from SITE_A_LEGACY (ties by index); the first that passes SITE_RULE and SITE_CLASS_RULE is SITE_A. Used because the
 * SITE_SEARCH disc has no forest under surface-climate-2 (0 of 4096 points with effM >= 0.6). */
export const SITE_PLANET_SEARCH=Object.freeze({points:65536});

/** SITE_A: the living inland site on Maithea at HARNESS_DATE, body-frame
 * metres (direction x body radius). surface-climate-2 (climate-m1 resume,
 * decision 1): found by the whole-planet search (SITE_PLANET_SEARCH) at
 * Fibonacci index 35760, visiting rank 708, 1083.1 km from the legacy site:
 * lat -5.24 deg, ground 3064.3 m, ring minimum 2971.5 m, forest share 1.0,
 * effM 0.644, eco class 4 live and at +-1 K, Tc 284.51 K (6.64 K below the
 * tropical edge, 14.36 K above the boreal edge),
 * ground look all zeros. tests/harness-sites.test.mjs re-runs the search and
 * fails if this literal no longer matches it or no longer passes the rules. */
export const SITE_A_M=Object.freeze([4096333.3,-474418.9,3159436.6]);
/** SITE_A under surface-climate-1.1 (found by the SITE_SEARCH disc at index
 * 55, 11.64 km from the legacy site; ground 280.2 m, effM 0.750, class 6).
 * Under surface-climate-2 it is 'Dry upland' (effM 0.380, class 5, no
 * forest) on the flank of the subtropical dry band. History only. */
export const SITE_A_CLIMATE1_M=Object.freeze([4075043.7,-1510938.2,2845723.8]);
export const SITE_A=Object.freeze(unit(SITE_A_M));
