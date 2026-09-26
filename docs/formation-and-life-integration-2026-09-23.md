# Formation and life integration — 2026-09-23

The main Atlas now presents the existing dated planet and biosphere records as
one inspectable sequence. Select a planet or moon and open **Formation & life**
to jump between accretion, the molten stage, solid ground, ocean onset, first
microbes, first plants, first animals, and the catalogue reference date. The
system and focused body views use an accretion proxy and a molten appearance;
they do not generate walkable terrain until the body is solid. Before star
birth and after engulfment, focus returns to the system view.

The nearby life renderer was already connected to real catalogue bodies.
`lifeGateContext` reads the dated `biosphereStateAt` query and sends living plant
kinds and quadruped archetypes to `PlanetRenderer`. The renderer scatters
vegetation and sparse herds in a bounded area around the walking contact point.
**Find living habitat** now chooses a dry region with strong vegetation
potential so the existing life layer is easier to find. Herds are still sparse;
the species count in the inspector describes the planet's current biosphere,
not a guarantee of an animal at every landing site.

Landing, walking, terrain selection and flight clearance now use the same
dated sea-level bucket as the terrain renderer. Before the planet's ocean
onset, the global sea is absent. Changing the universe seed clears cached
hydrology and life context so rivers cannot carry into another generated
universe. Pending hydrology jobs settle when the cache is reset.

## Local review

- `npm run build` passed after integration.
- Focused river, surface and fauna checks passed: 36 tests, 0 failures.
- The browser travel route passed five scale crossings after dated flight
  clearance was connected, with no browser errors.
- A browser route on `LETHRA-001`, `G001/C2128,0,1/0/planet/1` moved from
  accretion to the first-animal date, landed, and reported no page errors.
  At ground contact the life renderer reported 130 present flora instances,
  27 submitted flora instances, 3 nearby herds and 12 visible animal members.
  They were distant proxy forms at this viewpoint; no close skinned rig was
  active. Review captures are under `Assets/_assetctl/` at the repository root.

Formation times, ocean loss, biosphere stages and creature populations are
procedural scenarios. The accretion disc and molten colouring are visual
proxies, not a simulation of collisional growth or cooling geology. The
animals have simple kinematic motion and local habitat placement; there is no
planet-wide population dynamics or behavior simulation. The browser review
used headless software WebGL; physical Quest performance remains unmeasured.
