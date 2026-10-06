#!/bin/sh
# Luna sheet captures: build + capture a reference checkout and a candidate checkout, each step under ONE test-slot
# level (capture-sheet.browser.mjs takes the GPU lock itself: lock order is slot -> GPU, never nested slots).
# COPY of test-results/mountains/t6-wiring/luna-capture.sh (t6 worktree) preserved on 2026-10-07, changes:
#   - paths come from env instead of the t6 worktree; no fixed ports (the capture picks a free ephemeral port, see
#     docs/test-fixes-2026-10-07.md section 3). The earlier "build t6 exit=127" was a shell command-not-found, not a port problem.
# Usage: REF=<checkout of the reference build> CAND=<checkout of the candidate> OUT=<evidence dir> sh scripts/luna-capture/luna-capture.sh
# Real exit codes go to $OUT/luna-exits.log. Run it only while the machine GPU lock and the test slot are free.
REPO=${REPO:-$(cd "$(dirname "$0")/../.." && pwd)}
: "${REF:?set REF to the reference checkout}" "${CAND:?set CAND to the candidate checkout}" "${OUT:?set OUT}"
SLOT=$REPO/tests/helpers/test-slot.mjs
CAP=$REPO/scripts/luna-capture/capture-sheet.browser.mjs
VIEWS=${VIEWS:-mountainV3}
mkdir -p "$OUT"
: > "$OUT/luna-exits.log"
for arm in refmain:$REF t6:$CAND; do
  tag=${arm%%:*}; root=${arm#*:}
  (cd "$root" && node "$SLOT" -- node node_modules/vite/bin/vite.js build > "$OUT/luna-build-$tag.log" 2>&1); echo "build $tag exit=$?" >> "$OUT/luna-exits.log"
  (cd "$root" && node "$SLOT" -- node "$CAP" --tag "$tag" --out "$OUT/luna-sheet/$tag" --views "$VIEWS" --noclouds-views "$VIEWS" --root "$root" > "$OUT/luna-capture-$tag.log" 2>&1); echo "capture $tag exit=$?" >> "$OUT/luna-exits.log"
done
echo done >> "$OUT/luna-exits.log"
