# Three.ez comparison: Opus 5.5 review assessment

Date: 2026-09-28. Source review of a research fixture, not game acceptance.

The genuine Claude CLI response identifies `claude-opus-5-5`, provider
`firstParty`, and a successful result. The [raw response](../test-results/opus-three-ez-impostor-review/response.json)
and [input hashes](../test-results/opus-three-ez-impostor-review/inputs.json)
preserve the reviewed versions. Opus read supplied source without execution;
Luna's subsequent browser measurements are separate evidence.

## Findings and actions

| Finding | Action |
| --- | --- |
| Supersampling both representations hides native minification failures | Add native 8–128 px impostor probes against a 4× mesh reference, alongside mesh-native sampling error |
| Ground observers can be below a tree's centre | Keep negative elevations in the matrix and label them outside upstream hemisphere support |
| Near-mesh fidelity does not establish a middle-to-far handoff | Add the actual middle mesh and measure it separately |
| String-based shader hooks can silently fail | Audit live GLSL after upstream hooks, ignoring comments; isolate the colour-include repair described below |
| A revision string does not prove bundle identity | Hash the raw imported bundle in the browser and compare the pinned manifest |
| Bundling depends on ambient cwd/tsconfig | Set explicit workspace cwd and empty tsconfig; validate every bundled input against pinned hashes before output creation |
| Capture wall time is not completed GPU time | Label it CPU submission and cleanup with no completion fence |
| A one-tree profile cannot predict forest cost | Keep fixture-only claims; forest instancing, shadows and full-game budgets remain open |
| Scaling a captured tree also scales its leaves | Preserve the need for physical height-class captures before integration |

The review also requested synthetic sphere, asymmetric-marker and alpha-card
calibration. Those fixtures are not yet implemented. Lighting cannot be
accepted solely from the tree's silhouette scores. The proxy mixes normals
from adjacent capture frames, uses one roughness value and has unfinished
full-sphere reconstruction. It is not a drop-in planetary forest renderer.

## Concrete colour-include defect

The pinned upstream map fragment begins with the comment
`//#include <map_fragment>`. Its later JavaScript `String.replace` matches
that comment before the live standard map include. This leaves the standard
shader sampling the entire texture atlas across the billboard, while the
earlier custom code still discards pixels using reconstructed tree coverage.
The initial browser images show that repeating atlas grid inside a plausible
tree silhouette.

The vendor source and bundle remain unchanged. An optional Atlas lab adapter
replaces exactly one **live** map include with `diffuseColor *= blendedColor;`.
It refuses changed or ambiguous hook states and records before/after audits.
The initial unmodified images and metrics are preserved separately. This fixes
colour application only; it does not repair hemisphere coverage, normal-space
blending, mip coverage, shadows, depth or physical leaf scaling.

## Measurement interpretation

The source alpha cutoff thresholds the leaf texture during capture. The proxy
alpha clamp thresholds reconstructed, filtered coverage. They are different
operations, so their numeric values are not directly comparable. Binary-mask
IoU alone can also conceal colour artifacts and distant coverage loss. Native
coverage, view continuity and lit images must accompany it.

Current source changes after this review, including the minimal include repair,
receive independent CPU and browser tests; they have not received another Opus
source review. This record does not imply that Opus executed or approved them.
