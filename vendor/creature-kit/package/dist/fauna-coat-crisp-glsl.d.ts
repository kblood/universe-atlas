/** Shared pattern shader; caller supplies its own planetary or composer colour context. */
export declare const COAT_PATTERN_CRISP_GLSL_VERSION = "coat-pattern-crisp-glsl-1";
/** GLSL ES 3.00 re-implementation of fauna-coat-1's patternMask for the crisp patterns (COMPOSER_COAT_CRISP_PATTERNS,
 * off the limbs), with the frozen lattice hash (pcg3 over uint, which wraps exactly like Math.imul), value noise,
 * fBm and Worley noise, and the same salts and constants (COAT_PATTERN_SALTS, COAT_WORLEY_JITTER). Floats are 32-bit
 * on the GPU, so the mask matches coatPatternProbe up to float rounding (cell boundaries may move by an ulp), not bit
 * for bit; the CPU twin of the crisp coat (tests/fauna-composer-coat-crisp.test.mjs) uses coatPatternProbe itself.
 * Selected by `#define COAT_PATTERN <code>` (COMPOSER_COAT_CRISP_PATTERNS index + 1). */
export declare const COAT_PATTERN_CRISP_GLSL: string;
