# Packed forest worker responses — 2026-09-28

Population selection now crosses the worker boundary as one transferable
ArrayBuffer. Twelve Float64 values per cell preserve the four numeric address
components, direction, roll, height, yaw, query distance and representative flag.
Order and all canonical doubles remain unchanged. The protocol version is
separate from world/population identity. Only a fresh response buffer transfers;
the worker retains ownership of its cached patches.

The envelope is limited to 65,536 cells / 6 MiB, comfortably above the current
roughly 18,000-cell working set. Validation checks version, length, addresses
and finite physical values before accepting the decoded selection. Excessive
or malformed messages, worker exceptions and message-deserialization failures
clear the pending state, allow one worker restart, then use the existing
synchronous selector. Stale/terminated-worker replies cannot change the world.
Existing residents remain during recovery; this does not invent an empty forest.

Main-thread objects are still reconstructed because habitat and resident queues
consume them. This is not zero allocation. Diagnostics separate selection,
worker packing, main decoding and selection-application timings, and expose
transfer bytes/cell count. Cache accounting excludes this temporary response.

## Initial measurements

The [Node worker benchmark](../test-results/forest-selection-transfer/benchmark.json)
alternates object and buffer responses, with five warmups and 25 samples each.
It uses an 18,019-cell Earth-scale corner selection and checks exact JSON
equality after every response. Transfer size is 1,729,824 bytes.

| Response path | Round-trip p50 | Round-trip p95 |
| --- | ---: | ---: |
| Previous object clone | 23.33 ms | 32.70 ms |
| Packed transfer including encode/decode | 13.79 ms | 19.42 ms |

Worker packing p50/p95 is 11.54/17.64 ms; main decoding is 1.61/2.45 ms.
Selection itself is excluded. These are Node worker_threads results on the
development machine, not browser frame or GPU performance claims. Browser
validation and independent review remain pending at this checkpoint.

Fifteen focused tests pass across selection caching, retained instances and the
new protocol. They cover real face/seam/corner selections, transfer detachment,
cache ownership, optional fields, malformed/excessive/detached packets, stale
responses, recovery and fallback. The production build passes. No new canopy
coverage, tree asset, habitat rule or visual appearance is enabled here.

## Opus 5.5 review and receiver corrections

[The independent review of a0dd78a](opus-5.5-transfer-review-2026-09-28.md)
found no merge blockers and recommended two receiver fixes. The main thread
now keeps its own copy of the requested direction, rejects a null envelope,
and only catches protocol/decode errors. A defect in selection application
surfaces as a main-thread error instead of silently consuming worker recovery.
Completed duplicate replies are ignored, and synchronous postMessage failures
also clear pending state. Tests additionally check direction length and strict
negative-zero preservation. Seventeen focused tests now pass.

The review's statement that a detached zero-length buffer decodes harmlessly
is inaccurate: creating its Float64Array throws, and the receiver recovers.
The one-restart allowance belongs to each PlanetForest instance, not the whole
browser session. Replacing a planet renderer creates a new allowance. Within
one instance, two failures do leave synchronous fallback active. A protocol cap
overflow follows the same path; larger working sets need an explicit redesign.

Follow-ups include cheaper worker packing, reason-coded failure diagnostics,
a hung-worker timeout, and browser long-task comparison with the old path.
The 25-sample p95 above is the second-worst measured sample, not a statistically
strong tail-latency guarantee. Current transport diagnostics measure explicit
decode/application; they cannot retrospectively time structured-clone work
before a message handler starts. No browser frame-speedup claim is made.
