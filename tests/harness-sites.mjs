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

/** SITE_A: the living inland site on Maithea at HARNESS_DATE, body-frame
 * metres (found by the search above at index 55, 11.64 km from the legacy
 * site; ground 280.2 m, ring minimum 255.4 m, forest share 1.0, moisture
 * 0.750). tests/harness-sites.test.mjs re-runs the search and fails if this
 * literal no longer matches it or no longer passes SITE_RULE. */
export const SITE_A_M=Object.freeze([4075043.7,-1510938.2,2845723.8]);
export const SITE_A=Object.freeze(unit(SITE_A_M));
