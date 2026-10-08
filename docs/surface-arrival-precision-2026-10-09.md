# Named surface arrival precision

The surface acceptance run reached Gale Shore at a residual 9,112.324 metres.
The journey had finished, the walker was grounded at the new coast vicinity,
and its post-landing movement was only 0.010 metres. This was not a stale wait.
`main.ts` was identical to pre-round main `f2f2c62`: the old completion rule
accepted an angle below 0.002 radians, about 10,389.814 metres on Maithea.
The existing surface test requires arrival within two kilometres.

Both rotation and completion now use a shared physical arrival predicate,
bounded at 100 metres. Existing bounded quaternion stepping remains unchanged
and converges at the tighter bound. Invalid angles/radii cannot announce
arrival. Four tests cover small/large bodies, the saved 9.1 km counterexample,
convergence at different frame steps, and production wiring; TypeScript passes.
The two-kilometre acceptance tolerance is unchanged.

The surface harness also resolves its unchanged 200,000-sample lit landing
search before browser launch and GPU acquisition, under the shared CPU slot.
An inherited parent GPU holder remains untouched. Progress is emitted every
10,000 samples. The analytic old/new oracle preserves candidate count,
coordinates, illumination, slope and heights in three cases, with 21 progress
events each. This refactor changes resource ownership, not selection criteria.

The failure capture is preserved under
`Assets/_assetctl/atlas-continuation-2026-10-08/surface-final/` at IWSDK root.
The final real browser receipt is the coordinator's remaining regression gate.
No terrain, climate, population, model seed or acceptance pin is changed.
