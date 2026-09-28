# Normal desktop forest asset loading

Local work in progress. The byte loader and normal Trees control are implemented.
Detailed trees remain opt-in while the combined forest scene is under review.
The normal-control path still needs browser acceptance before publication.

## Candidate package

The [package manifest](../assets/forest/desktop-v1/forest-bundle-manifest.json)
records the existing Oak F and Pine v1e geometry plus their verified level-7
foliage sidecars. The runtime loader requests 25,858,788 bytes; additional
briefs, provenance and notices bring the 17 listed resources to 25,933,495 bytes.
The manifest itself is additional. Its SHA-256 is
`21925ae3e5d5a38aefdde2df0901c1325ed80aae18640254eb62ba39e23545da`.
The root toolchain packaging record is commit `8cef066`; mip baking and real
asset parity are recorded by `d6bcb19` and `8da6143`.

The exact upstream EZ-Tree MIT notice is included. Atlas texture/material
licensing remains recorded as `NOASSERTION`; packaging does not relabel it MIT.
The app preserves every package byte with Git attributes and Vite's public-file
copy path. A local HTTP load through the real source loader verified the entire
pair and its hashes; that check does not instantiate GPU assets.

## Loader and lifecycle

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
Four additional attachment checks cover planet departure during transfer,
disabling during parsing, repeated updates and explicit retry. Main starts the
transfer below 6 km terrain clearance, preserves adopted assets while climbing,
and clears the planet's detailed trees when leaving it or choosing basic trees.
The shared input-byte cache survives planet departure; choosing basic trees
also releases that cache. XR uses the existing basic renderer. The setting is
stored in shared URLs as `trees=1`.

Two package checks bring this stage to 11 passing tests: all 17 resource hashes
and sizes, the exact package/notice and retained license state, and real loading
of both GLB pairs with source-bound sidecar validation. The
[CPU log](../test-results/forest-asset-loading/cpu.log) records this scope.

Normal-control travel, cold/warm network timing and GPU-resource disposal still
require browser acceptance. Matching distant family shapes, lighter shadows
and the remaining landscape content are separate unfinished parts of the plan.

The first normal-control browser run found a native-fetch receiver error before
any asset request. The source loader now calls fetch with the browser global
receiver. A regression check reproduces the receiver requirement; the focused
loading/package suite now has 12 passing tests. Browser rerun is pending. This
failure left the basic forest visible and exposed the retry control.

## Publication byte audit

`tests/forest-asset-publication.mjs` checks the served build revision and all 17
package resources against the committed local manifest. It rejects a dirty build,
redirects, missing resources, size/hash differences and inconsistent references.
Set `ATLAS_URL` to the preview or deployed directory URL, `ATLAS_EXPECT_COMMIT`
to its full 40-character commit and `ATLAS_RESULTS` to a fresh evidence folder,
then run `node tests/forest-asset-publication.mjs`. The resulting JSON receipt
does not replace normal-control browser, visual or performance checks.
