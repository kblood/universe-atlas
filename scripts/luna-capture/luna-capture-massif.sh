#!/bin/sh
# GATE-5 massif-targeted Luna sheet (quiet window 2026-10-07). Same steps as luna-capture.sh (build, then capture, each
# under ONE test-slot level; the capture takes the GPU lock itself: slot -> GPU), but the capture script is
# capture-massif.browser.mjs (view `massifAxis`, aimed at a FROZEN_MASSIF_TILE_SET axis station; see its header).
# Usage: REF=<reference checkout> CAND=<candidate checkout> OUT=<evidence dir> TILESET=<mountain-tile-set.mjs path>
#        sh scripts/luna-capture/luna-capture-massif.sh
REPO=${REPO:-$(cd "$(dirname "$0")/../.." && pwd)}
: "${REF:?set REF}" "${CAND:?set CAND}" "${OUT:?set OUT}" "${TILESET:?set TILESET}"
SLOT=$REPO/tests/helpers/test-slot.mjs
CAP=$REPO/scripts/luna-capture/capture-massif.browser.mjs
VIEWS=${VIEWS:-massifAxis}
mkdir -p "$OUT"
: > "$OUT/luna-exits.log"
for arm in refmain:$REF wired:$CAND; do
  tag=${arm%%:*}; root=${arm#*:}
  (cd "$root" && node "$SLOT" -- node node_modules/vite/bin/vite.js build > "$OUT/luna-build-$tag.log" 2>&1); echo "build $tag exit=$?" >> "$OUT/luna-exits.log"
  (cd "$root" && node "$SLOT" -- node "$CAP" --tag "$tag" --out "$OUT/luna-sheet/$tag" --views "$VIEWS" --noclouds-views "$VIEWS" --root "$root" --tileset "$TILESET" > "$OUT/luna-capture-$tag.log" 2>&1); echo "capture $tag exit=$?" >> "$OUT/luna-exits.log"
done
echo done >> "$OUT/luna-exits.log"
