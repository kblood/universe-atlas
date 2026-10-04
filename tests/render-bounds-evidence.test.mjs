// render-bounds-1 evidence run: the plan's full sample counts (2000 containment
// children, 200 ratio tiles per level, 125 false-cull poses per world over the
// full tile pool) and the two-renderer open-ocean descent. Several minutes, so
// it is not in `npm test`: run `npm run test:render-bounds-evidence`
// (RENDER_BOUNDS_REPORT=1 prints the measured numbers; RENDER_BOUNDS_SEED picks
// an out-of-sample stream). The fast subset is tests/render-bounds.test.mjs.
import {renderBoundsSuite} from './helpers/render-bounds-suite.mjs';

const n=(k,d)=>Number(process.env[k]||d);
renderBoundsSuite({tiles:n('RENDER_BOUNDS_TILES',2000),ratioTiles:n('RENDER_BOUNDS_RATIO_TILES',200),poses:n('RENDER_BOUNDS_POSES',125),
  poolLevels:[4,6,8,10,12,14,16,18],poolRepeats:3,landingEyes:256,descent:true});
