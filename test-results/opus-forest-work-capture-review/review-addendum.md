# Evidence addendum: report source hashes

The Opus response correctly flagged a mismatch between relight report SHA-256 and the Git blob SHA. We checked the exact bytes after that review. The 21,848-byte mixed-newline source snapshot at source-snapshots/tree-captured-impostor-reported.raw.bin has SHA-256 57473086a71728337ff8ce1598c86649397c8da0e603a0183fc76023066d8fd2, matching both sidecar-relight-v1 and sidecar-grid17-relight-v1 reports. Git attribute-clean object for the same working file is 51f57379ec10d4bc80fe2c12ae468ddd27cefe8e, matching the source object at 96997ec. Its LF-normalized SHA-256 is 338dc15b66ed6e47b5c093bcdfea5e7dd21f2d6add97dbe5be45312b2fa629da, also matching the target source content. The relight and grid17 runs therefore map to the reviewed source; the mismatch was caused by mixed newline bytes in the worktree hash.

The earlier sidecar-surface-v1 report records SHA-256 e775c66afe5230f90f9456b823fa8a6d1025aed49187e5b8353c06b5be41719e, while its named d2223c3 source blob hashes to 400321981fa316ebf5b49248e7cc4aef9c83e26a4597df341fe8193fd85ea3f7. The exact earlier raw source file was not available in this follow-up packet, so that report remains unverified against the commit.

The no-canopy epoch issue found by the review was fixed in 98d8ff0 and tested there. It is a supplemental follow-up, not a change to the immutable 96997ec review target.
