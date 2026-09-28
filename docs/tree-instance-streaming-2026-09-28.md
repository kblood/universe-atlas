# Detailed tree instance updates — 2026-09-28

This stage prepares the detailed tree adapter for the existing planetary
forest. It does not attach family F to the game or claim realistic species
geometry, seamless LOD changes, or a desktop frame budget.

## Shared partial uploads

`InstanceUpdateRanges` extracts the current forest's range accumulator. Ranges
are measured in attribute components, merge adjacent/overlapping edits, and
retain at most eight ranges by joining the smallest gaps. Pending ranges on an
attribute survive hidden frames. A flush with no new work does not increment
the attribute version.

The detailed adapter now compares Float32 matrix, height and wind-phase values
before writing. Repeated identical values schedule no update. Each material
part has its own matrix and color buffer; the height/phase attribute is shared.
The helper bounds pending ranges; Three submits the buffer updates during
rendering. CPU range counts are not measured driver upload bytes.

Three's initial `bufferData` uploads the full allocation but does not itself
clear `updateRanges`. Newly owned tree and forest instance attributes now clear
their ranges in `onUpload`, after either initial or partial GPU consumption.
This prevents initialization ranges from contaminating the next sparse edit.
It does not remove the unavoidable first full allocation/upload.

## Appearance without per-tree materials

`setAppearance(index, bark, foliage)` accepts two linear RGB multipliers, each
component in `[0,2]`. Both tuples are validated before either buffer changes.
Invalid, sparse and non-finite values are rejected. The two material parts keep
their shared PBR materials and textures. Both preallocate white instance colors
before shader compilation, so changing a tint does not require a new material
or a shader variant per tree.

Fresh slots and slots appended after truncation start white. Transform/rebase
updates to an existing slot preserve its tint. A caller assigning a different
canonical tree to an existing slot must set its appearance explicitly; the
batch does not infer tree identity from transforms. Species binding must use
the existing dated catalogue and `treeInstanceAppearance`, with palette
calibration against the authored texture. Multipliers above one require care
to avoid implausibly bright albedo; arbitrary species colors over the current
green leaf image are not a calibrated species palette.

Wind still uses the shared BigInt date, the same seven-second period, and a
per-instance phase. The matrix contains rotation, origin-relative translation
and metres-to-scene scale; the height shader preserves physical leaf size.

## Review and validation

A genuine Opus 5.5 source review is retained in
`test-results/tree-instance-updates/opus/`. It found no blocking error in range
merging or Float32 comparisons, highlighted slot tint reuse and initial upload
ranges, and requested actual GPU checks. The reset and upload callbacks were
added after that source review; the review input hashes identify its scope.

All 33 focused CPU cases pass, including eight accumulator cases and a
CPU simulation of the actual forest's initial-upload callbacks. TypeScript
checking and the production build pass.

The [first corrected GPU report](../test-results/tree-instance-updates/run-1790591510207/report.json)
uses the actual family F on RTX 5090/D3D11. It verifies initial-range cleanup,
unchanged attribute versions, sparse updates to slots 0 and 191, hidden/visible
range lifetime, atomic invalid-input rejection, white tint on slot regrowth,
and batch disposal guards. Changing the tint changes the framebuffer hash;
restoring white returns the same 32-bit hash. This is a hash replay check, not
a byte-by-byte comparison or cross-device pixel identity.

The two changed slots schedule 320 bytes of distinct Float32 attribute ranges
across two matrices, two colors and the shared height/phase buffer. This counts
pending range payload, not instrumented WebGL upload bytes. First allocation,
geometry, shadows and full-scene frame cost are excluded.

The first attempt is preserved separately; its five failed assertions read
slot 1 instead of slot 191 and applied foliage alpha rules to bark. The
corrected run passes without changing runtime source. A follow-up checks tint
replay on both LODs across MASK/HASH and transmission off/0.35; it is still in
progress. No realistic-tree adoption or forest-scale performance is established.

## Next planetary integration

Pass the already dated tree catalogue and the existing world date through
`LifeGateContext`; consume canonical forest residents and stable slots. Keep
habitat, water, origin rebasing and same-frame canopy ownership authoritative.
The fixed Oak GLB is only one presentation family. Catalogue tree heights can
fall outside its validated 10–22 m envelope, and its simplified crown does not
yet match the near model. Resolving species dimensions consistently in near
and far rendering, coverage/shadow handoff, and full-forest cost remains work.
