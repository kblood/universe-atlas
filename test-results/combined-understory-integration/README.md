# Combined understory integration

This local candidate merges the rivers-disabled runtime, contact-focus
invalidation (`611e5dc`), corrected forest resource estimates (`8b89b90`),
procedural grass/shrub geometry and its guide updates (`a23f180`), and
per-animal near-rig diagnostics (`984c0ec`). The preceding visual evidence is
recorded in [the c9 review](../combined-visual-acceptance-c9ba64f/README.md).

The package-script conflict was resolved by retaining both the forest resource
accounting and understory geometry test registrations. An additional call-site
fix uses GPU attribute upload estimates for atlas capture batches instead of
copying CPU backing-store sizes.

Combined focused check: **45 tests passed, zero failures**:

```powershell
node --test tests/forest-resource-accounting.test.mjs tests/forest-far-atlas.test.mjs tests/fauna-near-rig.test.mjs tests/inland-rivers-disabled.test.mjs tests/flora-understory-geometry.test.mjs tests/flora-cache-ownership.test.mjs
```

Memory figures are estimates, excluding driver overhead and ordinary JS heap;
reported allocation limits are not new admission controls. Geometry tests do
not establish appearance, animation quality, or performance. The `a755f1b`
GPU frame shows the new tufted grass and branched shrubs, with a sparse/stylized
landscape; detailed tree canopy obscures some of the selected animal in its
rear-facing view. Luna's subsequent flora winding fix (`286e9ed`) is merged
into source after `a755f1b`, passed a separate focused 26-test selection, and is
not yet built. Individual rig pose/handoff acceptance remains incomplete. The
published runtime remains `4796b1a`.

## Guide publication follow-up

The guide and current plan now distinguish the live runtime from `a755f1b`.
Recent evidence links were missing from the explicit Vite publication list;
the rivers-off live/local receipts and current understory/combined summaries
are now included. A CPU check invoked the actual `generateBundle` plugin and
resolved all 319 relative guide links against its 809 emitted files, HTML
entry points and public files: zero missing destinations. The first check
misnormalised the root link as `./index.html`; normalising the final path fixed
that checker error. This verifies publication wiring, not deployed HTTP
responses or browser layout. The existing browser guide check still applies
before release. No runtime rebuild occurred during the active visual review.
