#!/bin/sh
# T6 Luna sheet captures: build + capture main 9dcb1cf (t6-refmain) and the T6 branch, each step under ONE test-slot
# level (the capture takes the GPU lock itself). Real exit codes to luna-exits.log.
D=C:/LLM/IWSDK/universe-atlas-wt/t6/test-results/mountains/t6-wiring
SLOT=C:/LLM/IWSDK/universe-atlas-wt/t6/tests/helpers/test-slot.mjs
CAP=$D/capture-sheet.browser.mjs
: > $D/luna-exits.log
for arm in refmain:C:/LLM/IWSDK/universe-atlas-wt/t6-refmain:5294 t6:C:/LLM/IWSDK/universe-atlas-wt/t6:5295; do
  tag=${arm%%:*}; rest=${arm#*:}; root=${rest%:*}; port=${rest##*:}
  (cd $root && node $SLOT -- node node_modules/vite/bin/vite.js build > $D/luna-build-$tag.log 2>&1); echo "build $tag exit=$?" >> $D/luna-exits.log
  (cd $root && node $SLOT -- node $CAP --tag $tag --out $D/luna-sheet/$tag --views mountainV3 --noclouds-views mountainV3 --port $port --root $root > $D/luna-capture-$tag.log 2>&1); echo "capture $tag exit=$?" >> $D/luna-exits.log
done
echo done >> $D/luna-exits.log
