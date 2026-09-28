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
