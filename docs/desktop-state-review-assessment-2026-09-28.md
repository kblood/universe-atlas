# Assessment of Opus's desktop state review

The user requested a broad review of current progress. Genuine Opus 5.5 reviewed
the current plan, implementation evidence and two actual-planet screenshots at
release `8e16776`. Its [full response](opus-5.5-desktop-state-review-2026-09-28.md)
is preserved separately from this implementation decision.

**Subsequent evidence:** Luna's desktop live-navigation rerun passed on clean
`8e16776`, alongside the guide and publication audit. The
[receipt](../test-results/tree-forest-live/live-publication-receipt.json)
records the scope; the earlier 320 px game-navigation failure remains
inconclusive. The first implementation priority below is therefore satisfied
for the desktop route. [Surface lighting](surface-lighting-2026-09-28.md) is now
implemented locally and undergoing actual-game validation.

## Direction adopted

The next deliverable is one coherent desktop forest area reached through normal
game controls. It needs believable lighting, nearby vegetation and a matching
distant canopy. Further isolated labs should support that deliverable directly.
The complete desktop realism and procedural life objective remains unchanged.

1. Resolve the deployed Find Life smoke failure with captured state and a
   desktop viewport. The current evidence establishes a timeout, not its cause.
2. Establish a common vegetation lighting baseline and one bounded local sun
   shadow region, including ground and fauna contact. Measure the added cost.
3. Use the existing EZ-Tree family with coverage-preserving foliage mips and
   produce a compatible conifer family through the existing asset pipeline.
   Preserve leaf dimensions and the source textures. Avoid mixed legacy and
   detailed styles in the accepted view; legacy remains a loading/error fallback.
4. Match far crown form, coverage, colour and height to the same family data.
   Evaluate the existing simpler far representation before adding more complex
   image-based reconstruction.
5. Connect physical species dimensions through shared near/far presentation
   rules, with conservative bounds and ground contact. Keep the initial mesh
   family count small while this complete route is validated.

Expose accepted detailed vegetation through normal desktop settings and asset
loading, with measured cold/warm behavior. The current console hook is only an
integration test seam. Ground cover, terrain materials, placement structure,
fauna, structural diversity and wider travel/cloud checks remain in the full
plan. Defer a separate alpha-to-coverage study, further custom tree generators,
atmosphere LUT work and WebGPU while this area is being completed.

## Qualifications to the review

- The suggested completion percentage is a subjective estimate. It is not a
  requirement audit or project completion metric.
- The screenshot HUD's p95 values are not controlled steady-state timings.
  They motivate profiling; they do not prove a current hardware floor, a
  particular CPU bottleneck, or a sustained frame rate.
- The close detailed tree reads better than its distant representation in the
  supplied image. The darkest large crowns are legacy geometry. Foliage mip
  repair and lighting therefore address different problems.
- Clouds, atmosphere and planet-local transitions already have implementations
  and earlier validation. Their final integration/realism review is unfinished;
  they are not entirely unstarted.
- Recipe dimensions cannot simply become a nonuniform whole-instance scale:
  that would also stretch physical leaves. Skeleton dimensions, leaf dimensions,
  near/far bounds and supported asset envelopes need to agree.
- Date acceptance should include valid historical species changes and lifeless
  dates. Negative universe dates cannot be assumed to contain this planet or its
  trees.

## Acceptance for the next area

Use the normal deployed orbit-to-habitat, flight, landing and walking route,
plus a surface bookmark and dated return. Compare fixed ground/low-flight/
distant views, including grazing sunlight. Check canopy continuity, foliage
retention, readable undersides, shadow contact and stable identity. Include
failure fallback and cold shader/asset loading.

Measure the complete game's frame distribution, hitches, CPU update work,
GPU passes including shadows, draws, triangles and memory on the same route
with the feature enabled and disabled. Use available weaker hardware when
possible; report hardware coverage and limitations without inventing a minimum
specification. Keep the existing deterministic tests and review the complete
area before extending to more species and biomes.
