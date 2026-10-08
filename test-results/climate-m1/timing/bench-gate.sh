# decision-5 section 3 gate: the fixed tests/surface-climate.bench.mjs (copied unchanged as tests/surface-climate.bench.fixed.mjs
# into the 3ab2eab and main c6526d0 exports) must fail on 3ab2eab and pass on the inlined branch. 2 alternating rounds.
S=/c/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad; B=C:/LLM/IWSDK/universe-atlas-wt/climate-m1
for r in 1 2; do
 echo "== round $r 3ab2eab (fixed bench)"; (cd $S/br-3ab2eab && node --expose-gc tests/surface-climate.bench.fixed.mjs; echo "exit=$?")
 echo "== round $r branch (fixed bench)"; (cd $B && node --expose-gc tests/surface-climate.bench.mjs; echo "exit=$?")
 echo "== round $r main c6526d0 (fixed bench, reference)"; (cd $S/main-c6526d0 && node --expose-gc tests/surface-climate.bench.fixed.mjs; echo "exit=$?")
done
