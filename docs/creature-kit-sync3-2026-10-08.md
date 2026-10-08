# Creature-kit sync 3

Source: creature-kit `5e4265f` (kit/coat-alloc), following `2e34b6b` with a
benchmark-only correction that rejects missing/malformed GC profiler output.
The sync script writes all 47 vendor files and the manifest; no vendor file is
edited directly. The contract now includes the GC-counted coat allocation bench.

Coat output is frozen and bit-identical (2.64 million Object.is comparisons,
unchanged lineage-B guard). GC count: about 1947 to 0.027 B/call; no-op control
0.15 B/call. `node --expose-gc tests/fauna-coat-allocation.bench.mjs` enforces
20 B/call with a control below 1 B/call. The old code fails this gate.

FAUNA-NUDGE-STABLE-2 fixes deterministic mouth cap crossings/midline vertices and
the cephalopod iris/lid luminance-floor equality. Only three current-rule blunt
links (14,22,23), odd-earlier-rules-worm and odd-cephalopod-horse skins change.
The fixture ledger keeps all five old pins. Historical neutral earlier-rule
skin-3 geometry retains its compatibility path. V1_PINS, all 32 CLI GLBs,
gloss/counts/bones and unrelated skins remain unchanged. CLI sidecars differ
only in the generator source hash. The full identity and negative-control
captures are under the shared workspace `Assets/_assetctl/kit-nudge-evidence/`.

Kit validation: typecheck clean; nudge/head/fixture/coat 46/46; historical neutral
guard and unconditional V1 pins 2/2. The empty known-unstable list now gates all
74 specimens under six modes. Atlas vendor files match the committed kit.
Atlas handoff checks: 14 tests, 13 pass, one optional kit-checkout skip, zero
failures (vendor, nudge, life digest); typecheck clean. The fail-closed benchmark
followup measures coat 0.025 B/call and control 0.189 B/call, zero GC events.

The golden fauna corpus adds the exact catalogue texts for the earlier-rule
worm mouth and cephalopod horse. The merger must run the combined strict
four-engine golden gate and re-pin only the intended fauna/forest sections.
This branch does not re-pin golden.json or add mismatch exceptions.

Registration for the coordinator: add the new allocation bench to the perf
runner/package entry point. Existing all-tier discovery already includes the
changed composer tests. No package/tier registry is changed in this branch.
