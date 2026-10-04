// render-bounds-1, the small working subset registered in `npm test`
// (seconds). The full sample counts and the open-ocean descent run in
// tests/render-bounds-evidence.test.mjs (`npm run test:render-bounds-evidence`).
// Both files run the same suite: tests/helpers/render-bounds-suite.mjs.
import {renderBoundsSuite} from './helpers/render-bounds-suite.mjs';

renderBoundsSuite({tiles:8,ratioTiles:4,poses:16,poolLevels:[8,16],poolRepeats:1,landingEyes:256,descent:false});
