# Loaded-body LOD experiment

This implements and measures deriving low-poly bodies from loaded animal
geometry, rather than constructing unrelated primitive substitutes. The
derived arrays retain the original bone plan, source identity and surviving
colour/skin bytes. Cold reduction runs through an opt-in worker request and
a bounded loaded-source cache; source buffers are never detached.

The pooled renderer supports different exact genomes in one indexed mesh
per LOD. Per-actor bone/root textures animate it. Buffers, cache and actor
admission are bounded; default128/500vertex/1500index settings use16-bit
indices and a16MiB conservative typed-buffer limit. Full near-body IK costs
about7ms for512animals and is unsuitable for this route. A separate explicitly
approximate LOD gait keeps activity/root placement but omits fullIK/grazing.

12focused tests pass: source/attribute preservation, invalid input, cache
identity, byte-exact canonical palettes, admission/resource bounds, approximate
pose envelopes/repeated dates, and actual worker transfer ownership. TypeScript
and production build pass. Canonical models, genomes and world pins are unchanged.

Measured desktop laboratory results, including a ground plane:

|128animals,moving|currentbody2|derived500|
|---|---:|---:|
|Draws|5|2|
|Triangles|221706|64002|
|CPUupdate median/p95|.290/.385ms|.160/.350ms|
|GPU median/p95|.337/.361ms|.136/.553ms|

Paused GPU is .189/.197ms versus .081/.087ms. The128actor pooled experiment
uses about6.03MB conservative typed resources;512actors use26.75MB and need
an explicit over-budget experiment. These are local measurements, not game
frame-rate or Quest acceptance. Moving GPU p95 regresses even though the
median improves; upload synchronization is a hypothesis, not a diagnosed cause.

Quality gates remain incomplete. A same-source identity-palette gallery
separates reducer loss from gait: the detailed source already has thin runner
lower legs, but500triangles adds foot spikes/faceting and loses coat-pattern
detail.1500also softens vertex-colour marks.200is unacceptable for some
winged/cursorial specimens; unreached budgets are rejected, never concealed.
Keeping selected attribute bytes does not preserve the full rendered pattern.

The production fallback is unchanged. Rollout requires foot/joint/coat
acceptance, resolved moving GPU tails, aggregate memory accounting for flora,
fallback and near skins, and prioritized/cancellable cold generation. Useful
next experiments are protected joint silhouettes, coat representation separated
from geometry density, and texture-upload buffering. Independent Opus5.5
recommendations are recorded in opus-planet-optimization-review-2026-10-10.md.

Evidence is preserved under Assets/_assetctl/derived-fauna-20261010:
body-lod-gpu-approximate128,body-lod-gpu-approximate andbody-lod-rest-gallery.
The lab in tests/fauna-body-lod-lab.html is an opt-in development comparison,
not an enabled planet-renderer feature.
