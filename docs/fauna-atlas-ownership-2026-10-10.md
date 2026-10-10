# Animal atlas ownership

`FaunaSkinnedBatch` has an opt-in `cacheMode: 'atlas-owned'`. Its default
`retain-source` behavior is unchanged. This removes duplicate CPU geometry
arrays after admission, instead of collapsing different genomes into a few
representative types.

Call `registerGeometry(key, data)` followed by `prepareAnimal(memberId, key)`.
Only one newly registered source can await preparation at a time; callers can
cancel it with `releaseGeometry`. Prepared positions, normals, colours, weights
and indices live in the existing fixed atlas. Metadata retains the exact plan,
vertex/index counts and a live owner slot. Repeated identical keys are compared
byte-for-byte against that slot, and additional owners copy its atlas section.
Owner removal selects another live owner; the last removal evicts the key.
Source inputs are copied, never mutated or detached. Mesh attributes are owned
by the batch and must not be edited outside its admission API.

The budget reserves one pending source's worst-case typed arrays rather than
one duplicate per prepared genotype. All actor metadata remains bounded by the
configured capacity/cache count; JS plan/key objects and external input/worker
lifetimes remain separate from the typed-buffer estimate.

Ten focused tests and TypeScript pass, including 128 distinct generated genome
definitions with distinct test geometry, pending cancellation, exact duplicate
reuse, owner migration after slot overwrite, last-owner eviction, colour-change
rejection and unchanged default cache behavior. These minimal-triangle tests
prove ownership/admission, not visual quality or performance for 128 production
animals. Actual unique-genome renderer and coat acceptance remain required.
