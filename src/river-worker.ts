import {buildCanonicalHydrology} from './hydrology-registry.ts';

/**
 * Builds the complete canonical hydrology set for one body address in a
 * single round trip, off the main thread. buildCanonicalHydrology (pure —
 * see hydrology-registry.ts) is the one implementation shared with the test
 * suite's in-process path, so there is nothing to keep in sync between a
 * worker-side and a test-side copy. Both the drainage graph and every
 * region are a pure function of body.seed/body address alone, so the result
 * never depends on when this was requested, in what order, or by what UI
 * action — hydrology-registry.ts, the sole caller, caches and attaches it to
 * the resident Body object.
 */
self.onmessage = ({data}) => {
  try {
    const started = performance.now();
    const canonical = buildCanonicalHydrology(data.body);
    self.postMessage({canonical, buildMs: performance.now() - started});
  } catch (error) { self.postMessage({error: String(error)}); }
};
