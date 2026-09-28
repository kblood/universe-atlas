# Normal desktop forest asset loading

Local work in progress. The byte loader is implemented; packaged assets and the
normal game setting are the next integration step. The console-only candidate
loader remains the current actual-game validation path.

`ForestAssetSource` accepts one versioned package manifest containing both
branching and spire families. Each family references its two GLBs, foliage mip
manifest and raw mip payload by relative path, exact byte length and SHA-256.
The package also retains authoring briefs, per-asset manifests and provenance;
these remain inspectable records rather than runtime geometry inputs.

The loader permits package-relative paths and rejects redirects. It bounds the
manifest to 1 MiB, each GLB/payload to 32 MiB, and the aggregate runtime resource
bytes to 64 MiB. The bounded streaming reader also rejects oversized responses
without relying on a server's Content-Length header. Every resource is verified
before the complete pair enters the cache. The tree loader separately validates
GLB structure and mip/source-PNG compatibility before replacing the active trees.

Concurrent callers share one pending load. Re-entering a planet can reuse the
verified byte pair. Clearing the source aborts pending requests, releases cached
references and prevents a stale result from repopulating the cache. An HTTP,
integrity or parse failure retains no partial cache and permits a later retry.
These input-byte limits do not represent total CPU or GPU memory: decoding,
temporary copies, geometry, texture storage and driver allocations are separate.

Five focused tests cover bounded paths/sizes, both-family requirements, shared
loading/cache reuse, same-size hash corruption, short/long payloads, cancellation
and stale completion, retry, HTTP errors and oversized streamed manifests.
Normal-control travel, cold/warm network timing and GPU-resource disposal still
require the packaged game integration and browser acceptance.
