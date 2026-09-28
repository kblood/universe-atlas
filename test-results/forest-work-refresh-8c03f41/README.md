# Forest work refresh acceptance: 8c03f41

This acceptance snapshot was built from clean commit
`8c03f410d4d0a0627f02d2a820dc432bdb73b411`. The detached acceptance checkout
and preview at `http://127.0.0.1:5199/` both reported that exact SHA with
`dirty: false`. Browser: RTX 5090 through ANGLE D3D11.

`ordinary-defaults.json` and `00-ordinary-url-default.png` record the ordinary
URL with a fresh browser context: detailed trees were disabled, surface
lighting was enabled, and no forest package requests occurred. The full normal
UI fixture then verified basic-tree fallback, opt-in package loading, date
identity replay, disable behavior, one deliberately injected HTTP 503 and
successful retry, departure/revisit cache reuse, handoff diagnostics, and zero
unexpected browser or WebGL errors. The expected 503 is retained in the report.

The existing fixture also wrote `stationary-6s.cpuprofile` and profile
statistics. They are preserved for diagnosis only; this run makes no
performance-improvement claim. Detailed tree visuals remain unaccepted, and
surface lighting is enabled by default in this build. No deployment was
performed as part of this acceptance run.
