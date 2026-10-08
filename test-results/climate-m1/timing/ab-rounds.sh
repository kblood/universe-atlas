# decision-5 gate 4: interleaved A/B, 3 rounds (processes) x 25 interleaved passes; A = fixed 3ab2eab, B = fixed 688129c.
# ab-harness labels A "main" and B "branch" in its output. Then cold build (fresh process) of both, 3 each, alternating.
P=/c/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-3ab2eab; N=/c/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/br-688129c; H=C:/LLM/IWSDK/universe-atlas-wt/climate-m1/test-results/climate-m1/timing/ab-harness.mjs
for r in 1 2 3; do echo "ab round $r"; node --expose-gc $H ab $P $N 25; done
for r in 1 2 3; do for d in $P $N; do echo "cold round $r"; node --expose-gc $H cold $d $N 9; done; done
