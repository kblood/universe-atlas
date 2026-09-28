# Census worker review fixes

The [Opus 5.5 source review](opus-5.5-census-implementation-review-2026-09-28.md)
examined `8c5ff7f`. The following fixes precede runtime integration:

- Malformed envelopes report `phase: protocol` with no request ownership and
  cannot cancel a valid job. Old generations remain ignored. Requests for an
  unconfigured future generation receive an explicit request error.
- A newer valid request implicitly cancels the older one. A bad batch is
  attributed to the new request. Configure errors have their own phase.
- Completed results are flushed before a sampling failure; the terminal error
  names the failing address/index. The batch terminates. Failed or unreceived
  patches remain unknown, not empty. Cancel after completion is silent.
- `forest-census-2` hashes a type-tagged canonical description. Unsupported
  objects, accessors, cycles and non-finite numbers fail closed. Typed arrays
  include their type and contents. Patch version/side are included.
- A failed census step clears its partial work. Packed identity offsets are
  checked. Strict census habitat sampling rejects non-finite slope neighbours;
  valid habitat calculations and the existing near-path rules are unchanged.

Luna independently extended and ran six unit tests and the actual browser
Worker protocol test. [Evidence](../test-results/forest-census-protocol-review/report.json)
includes exact packed-identity reconstruction, cache/transfer ownership,
water/context invalidation, cancellation, concurrent protocol errors,
supersession and configure recovery. Worker slices were below the loose 50 ms
regression gate on this machine; the scheduler's 4 ms budget is soft, checked
between bounded units of work.

The browser test does not inject a sampling exception after completed patches:
there is no production fault hook. Class-level exception recovery is tested.
`estimatedBytes` is a cache accounting estimate, not measured JavaScript heap.
Host backpressure, failed-patch retention and renderer readiness remain part of
the integration work. None of this worker code is yet active on the live site.
