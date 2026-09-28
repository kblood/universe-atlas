# Canopy water review assessment

The [genuine Opus 5.5 review](opus-5.5-canopy-water-review-2026-09-28.md) assessed the supplied implementation, whose core was committed as `c02ee95`. It accepted the interval proof for the supplied path and identified four concrete follow-ups.

## Changes after review

- The worker watchdog excludes selection replies already received and awaiting host application. Being outside the streaming band cannot turn queued host work into a false worker failure.
- Configuration has separate target and configured water levels. Only one configuration is outstanding; subsequent frames update the target, and the next configuration uses the latest target after ready. Incoming patch intervals validate against configured water. The immediate shader water gate still uses the target.
- Water-only messages reference the confirmed family. The worker reuses its private immutable body snapshot, skips body serialization/cloning/family hashing, and computes the new water context. Initial configuration, worker restart and changed hydrology references send the complete body. A wrong family is rejected. `canonicalRivers` and `hydrology` are immutable region objects after attachment; reference changes trigger both far-census configuration and near-habitat refresh. Arbitrary in-place edits within a region are outside this runtime contract; explicit full-body census creation still hashes all geometry.
- Once phased selection has finished decoding addresses, patch installation rejects members outside the incoming window. A late old-window patch cannot escape the completed eviction scan while retry cleanup is still running.

## Qualifications

The review's approximate maximum of 3,100 patches is incorrect for the real fixture: tested windows have about 6,684–6,690 patches. The 229,376-slot capacity is a budget, not a proof that every possible forest fits. Whole-patch capacity failure remains explicit and falls back to the existing representation.

`renderer.retire` zeros the position attribute's W component, so the rebase cursor cannot restore a retired tree. Body serialization already rejects nonfinite values and unsupported containers; existing tests exercise those cases. The supplied production fixtures hash successfully. No claim is made that every future custom body is valid.

The shared terrain ocean baseline still reports zero for some water-surface fields. The forest census uses ground height and wetness, so this does not invalidate its interval. General water-surface semantics should be audited separately before changing them across terrain, collision and river consumers.

The updated browser worker check covers water-only configuration, exact fresh-census equality, wrong-family rejection, and recovery retaining the correct selection radius. The 4.5 km host check covers reuse without slot/position changes. These checks do not draw WebGL or replace Luna's full game date-seek acceptance.
