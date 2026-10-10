# Cross-family bark resource candidate

`PlanetForestOptions.shareBarkTextures` opts into a pool scoped to one forest
library. It is off by default. Each current or staged family leases the authored
bark base-colour and normal maps before batches or first GPU upload. Materials,
geometry, wind/variant uniforms, foliage maps and offline mip sidecars remain
family-owned. Source GLBs and image bytes are unchanged.

The combined runtime candidate exposes `PlanetRendererOptions.forestBarkSharing`
and the main-route `?forest-bark-sharing=1` opt-in, independent of the existing
`?fauna-lod-prototype=float` option. Both remain off when omitted, allowing
balanced on/off runs on the exact same build and quality settings. World
population, IDs, dates, poses and sampler state are unchanged.

Sharing requires the encoded PNG SHA256, texture role, colour space, channel,
mapping, format/type, filtering/wrapping/anisotropy, upload flags, automatic mip
policy and complete UV transform to match. The decoded maps must be 1024px.
The pool admits at most 8 distinct entries and 16 live leases. Equivalent duplicate
decoded textures are disposed and their unused images closed immediately. Live
maps and their decoded image sources are disposed/closed only after the final
lease. Current and staged entries participate in the same scope, so cancellation
and replacement rollback keep the adopted resources alive.

The packaged branching/spire bark PNGs match exactly:

| Role | SHA256 | Dimensions |
| --- | --- | --- |
| Base colour |146e748a484106362eb768809e38167ccaf18abf4bc795e7db3b0a1d7e98fa17 |1024×1024 |
| Normal |ef4fd931e8b0a9db10a75945d1ee4fc02570151c9d181edd7b19b22a73ba5706 |1024×1024 |

Both use UV0, no texture transform, linear magnification, trilinear minification
and repeat wrapping. Base colour is sRGB; normal is unencoded linear data. LOD1
already uses the LOD0 textures through the existing texture-free geometry parse.
Foliage PNGs and mip payloads differ between families and are not shared.

For the two loaded families, the expected reduction is 8,388,608 decoded CPU
bytes plus 11,184,808 estimated GPU texture bytes, totaling 19,573,416 bytes.
This includes the automatic bark mip chains. It excludes driver/allocator
padding and shader state. Post-decode sharing still incurs transient duplicate
decoding; it reduces retained resources rather than claiming zero cold peak.
`forestTextureFootprint` already counts shared texture/image identities once.
The forest diagnostic `barkTextures` reports pool entries, leases and disposed
duplicates. This saving alone is not a whole-game budget or Quest acceptance.

Focused checks cover matching and mismatching content/state, shared image
lifetimes, last-owner disposal, atomic rollback/cancellation, packaged image
hashes and continued LOD1 descriptor stripping. Native Anitar texture-allocation,
pixel/shadow identity, canonical IDs/poses, disposal/revisit and actual combined
resource measurements remain required before enabling the candidate by default.
