# decision-5 gate 3: alloc-diag.mjs, 3 alternating rounds (main c6526d0 / fixed 3ab2eab / inlined branch), real + no-op control.
M=/c/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/main-c6526d0; P=/c/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-3ab2eab; B=C:/LLM/IWSDK/universe-atlas-wt/climate-m1; A=C:/LLM/IWSDK/universe-atlas-wt/climate-m1/test-results/climate-m1/timing/alloc-diag.mjs
for r in 1 2 3; do
 for d in $M $P $B; do echo "round $r"; node --expose-gc $A $d real; done
 for d in $M $B; do echo "round $r"; node --expose-gc $A $d control; done
done
