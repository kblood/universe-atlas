# Published guide and tree-authoring evidence — 2026-09-28

Live release: `b36a398b34d78b46a3eaf201e7fef68901a7c80a`, `dirty:false`.
Publication completed through the normal build, staging upload and atomic swap.

Luna 6's [browser receipt](live-guide-deployment.json) records nine guide
chapters at 1440, 390 and 320 px, 77 internal destinations, no-JavaScript
reading, exact era bookmarks and the in-game guide link. All checks passed.
The new tree-authoring documents and their review images loaded successfully.

The independent [HTTP/hash audit](http-audit.json) checked all nine built guide
pages and 154 linked resources against local distribution bytes and expected
content types. All passed with zero broken links or application-shell fallbacks.
All 22 served JavaScript bundles match the local release and the earlier
`580936f` release, whose flight, walking, dated water/terrain refresh and graphics
checks are recorded in [its deployed evidence](../deploy-580936f/live-deployment.json).

This publication adds guide/documentation and review evidence. The candidate
tree geometry remains outside the game. Root asset-tool commits `1fc7de6` and
`2a585b2` preserve the new skeleton authoring and the fixes from the genuine
Opus 5.5 source review. See [v4 technical and visual status](../../docs/tree-authoring-v4-2026-09-28.md).
The full desktop realism goal remains active: crown and material refinement,
matching LODs, structural variants, species/runtime binding and remaining
landscape/fauna work are unfinished.

This receipt was committed after deployment and is not part of the live
`b36a398` build. It will accompany a subsequent publication.
