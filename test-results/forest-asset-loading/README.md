# Forest asset loading: production UI validation

## Latest deployed run

The deployed runtime through stage `8c03f41` passed its full production UI flow.
The exact `build-info.json` stamp matched that revision, and the ordinary
served-site probe returned the expected default state. Using the normal Trees
control, 759 detailed instances appeared on attach. After a one-day shift and
return, all 753 sampled returned identities matched. A deliberate Oak LOD0
HTTP 503 kept fallback trees available; Retry succeeded. Planet revisit reused
the package, with 20 package requests total. There were no unexpected page or
WebGL errors. This checks the deployed UI and package lifecycle, not realistic
tree appearance, continuous canopy matching or general performance.

## Earlier verified preview run

`normal-ui-ee26efa-accepted/` is the successful desktop run against the clean production preview at commit `ee26efa79c891cd914122f4b642db8efdaacf592` (`build-info.json`: `dirty=false`). The corresponding clean build and 17-resource publication audit are `build-ee26efa.log` and `publication-ee26efa/report.json`. The browser used an RTX 5090 through ANGLE D3D11.

The runner uses the visible **Trees** control and the published forest package. It does not call development-only GLB loading hooks. The flow loads both families, toggles back to basic trees, injects exactly one HTTP 503 for Oak LOD0, confirms the basic forest remains visible and uses the Retry button, then visits the system breadcrumb and returns to the same planet.

Results:

- Normal load fetched the manifest and family resources and made 765 detailed instances visible. Disabling detailed trees kept 702 basic trees visible.
- The intentional Oak LOD0 failure was exactly one HTTP 503. The Retry action then loaded the package successfully. Total forest-package requests were 20 across first load, failure/retry, and return.
- A visible +1 day / −1 day date replay returned to the same offset. All 16 common sampled tree IDs retained species, recipe, height and stable wind phase.
- Leaving and revisiting retained package version `candidate-1`; detailed trees attached automatically, with 753 visible. The package request count remained 20.
- All 16 near/far handoff samples were current and matched family and packed bark/foliage brightness. Height deltas were below 1 μm. No samples were missing or stale.
- There were no unexpected browser/page errors and `gl.getError()` returned 0. The only failed response was the deliberate 503.

The final `stationary-6s.cpuprofile` and `profile-summary.json` contain the raw CPU profile, aggregate renderer timings and top self/inclusive samples. At this fixed pose after 2 seconds of warmup, `planetUpdateMs` was 27.6 ms p50 / 41.9 ms p95; `frameWorkMs` 41.4 / 60.1 ms; instrumented GPU pass sum 11.42 / 18.16 ms. The renderer reported 239 / 240 draws and about 7.016 / 7.055 million triangles (p50 / p95). The CPU profile's largest self-sample counts were `skipPatchKeys` (492), `update` (308), `noteNear` (230), and `processLifeQueue` (137). These measurements describe this run and do not establish a speedup or general frame rate.

## Preserved earlier attempts

- `normal-ui-c2bca35/failure.json` records the actual initial asset loader failure: native `fetch` threw `Illegal invocation` before any package request. That receiver bug was fixed in a later runtime commit.
- `normal-ui-7d7c8ba/` and `normal-ui-7d7c8ba-rerun/` preserve harness mistakes around an armed failure route and the required system-page **Explore** click. They are not product failures.
- `normal-ui-ee26efa/`, `normal-ui-ee26efa-final/`, and `normal-ui-ee26efa-verified/` preserve successive harness issues: collapsed Time details, an unpassed predicate argument, and Time details intercepting a Trees click. The final run uses the corrected interactions and passed.

The earlier clean-build/publication pairs remain available for provenance: `build-7d7c8ba.log` with `publication-7d7c8ba/`, and `build-c2bca35.log` with `publication-c2bca35/`.

## Scope limits

This checks desktop package loading, fallback, retry, date identity and cache reuse on one selected world and camera path. It does not establish XR behavior, broad asset visual acceptance, performance improvement, or stable timings at other positions and hardware.
