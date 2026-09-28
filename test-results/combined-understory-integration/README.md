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
not establish appearance, animation quality, or performance. Browser review of
this merged candidate and its individual fauna handoff remains pending. The
published runtime remains `4796b1a`.
