Runtime attribution candidate
=============================

The moving Anitar30 balanced captures show added CPU/GPU cost with LOD enabled;
this candidate does not claim a speed improvement or enable the production default.
It preserves the pinned Kit0.5 body, dated pose, actual ground callback and coverage.

Use `fauna-lod-prototype=float&fauna-lod-profile=1` on the initial URL. The profile
is cumulative under the runtime adapter diagnostics; subtract two snapshots over
the same moving interval. Counts and milliseconds are recorded for controller
adoption/submission/job scheduling, ground samples, pose solving, palette writing,
pool submission, streaming, ownership accounting and worker dispatch. Pose time
includes ground time; controller time includes its nested phases. Ground timers
add overhead to each sample, so whole-app performance requires a separate capture
without profiling. Profiling disabled never reads its clock.

Ground already comes from a retained per-herd 7×7 bilinear stencil, multiplied by
the current relief. The extra rigs do not construct a terrain sampler or resample
the planet field. Approximate ground, flattened slopes or altered IK are excluded.

Potential exact optimizations to measure after attribution: ownership accounting
currently constructs full diagnostics even during admission checks; per-frame trace
rows allocate; and sparse moving rows currently request full bone/root palette
uploads. `fauna-lod-upload=rows` selects the existing adaptive-row upload mode for
an independent comparison. It retains full initial/dense uploads and identical
palette bytes. Its default remains `full`; no quality policy or population changes.

The e8b9cea browser attribution measured controller mean 0.45–0.50 ms/frame,
pose 0.35–0.39 ms (including ground 0.067 ms), and ownership 0.008–0.010 ms.
Every moving window included workers, so it did not isolate steady rendering.
Adaptive rows showed no median CPU/GPU win. Keep full uploads as the default.

The followup removes report construction from admission ownership/prepared-count
reads, preserving the exact existing byte accounting for current attributes,
palette rings, pending copies and presentation parameters. Tests cover float/raw
packed, retained/atlas-owned cache and all three palette-ring sizes through each
ownership transition. This is allocation cleanup, not an explanation of the
larger whole-app CPU delta. Source definitions, poses and submitted arrays remain
unchanged. A settled-versus-streaming comparison is still required.
