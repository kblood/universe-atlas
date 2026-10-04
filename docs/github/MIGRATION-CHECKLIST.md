# GitHub migration checklist

Draft, 2026-10-04. Nothing in this pack pushes, creates a remote, repository,
issue or project. Every step below that writes to GitHub needs the owner's
explicit go-ahead. Task T21 (MIGRATION-AND-PROVENANCE-PREP, in flight on
`round2/migration-prep`) produces the ref inventory and provenance gate this
checklist relies on.

## 1. Owner decisions (record answers in the T01 owner-decision sheet)

- [ ] **Account / organisation** that owns the repos, and whether agents get
      separate identities (machine users or fine-grained tokens) or share one
      account. With one shared account, every commit and PR must still carry
      the agent id in the trailer and PR body.
- [ ] **Visibility**: private or public, per repo. The proposal recommends
      private. Public requires the licence decision first.
- [ ] **Licence** for Atlas (no `LICENSE` file today) and the assets carrying
      `license: NOASSERTION` (deer manifest, forest GLBs).
- [ ] **Which repos**, in this order:
  - [ ] `universe-atlas`: primary (Pi `origin` exists; local `main` is ahead
        of Pi `main`, recheck the count).
  - [ ] `IWSDK`: shared layer only (allowlist `.gitignore`; game folders are
        not tracked). Needed for `tools/assetctl`, `schemas/`. Its `.github/`
        is ignored by the allowlist and needs an explicit re-include before
        templates or Actions can be tracked there.
  - [ ] `civilization-lab`: own repo, **no remote at all today**; decide
        whether it goes up now or after M3.
  - [ ] `creature-kit`: later, only after the seven extraction questions are
        answered (parked P01).
- [ ] **Plan tier**: verify on the owner's actual account which features are
      available for *private* repositories (protected branches / rulesets,
      required reviews, required status checks, CODEOWNERS enforcement,
      Projects limits, Actions minutes, LFS quota). GitHub documents that
      protected branches on private repos depend on the plan. **Do not promise
      enforced merge gates until this is checked**; see section 4.
- [ ] **Upload authorisation**: a dated written go-ahead per repo.

## 2. History and large-file review (per repo, before any push)

- [ ] Refresh and inventory refs: `git fetch origin`, `git branch -a`,
      `git worktree list`, ahead/behind of each branch against `main`. Atlas
      today also has held `eye-round/EC4`, `biome-round/W2-C-FOREST-C2-held`,
      nine `round2/*` worktrees and Pi-only `desktop-rendering-stage-c` and
      `opus55/render-submit-20260929`. Decide per ref: push, keep local, or
      retire by its creator. Delete nothing to tidy up.
- [ ] Largest blobs in all history:
      `git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectsize) %(rest)' | sort -k2 -n -r | head`.
      GitHub warns above 50 MiB and rejects files above 100 MiB. Snapshot
      2026-10-04: Atlas pack 333 MiB, largest blob 7.4 MB
      (`test-results/offline-foliage-mips/.../report.json`), so no LFS is
      needed today; recheck on the day.
- [ ] `test-results/`: about 1,200 files are tracked, while the main checkout's
      `test-results` is a symlink to `D:/IWSDK-review/...`. Decide what review
      evidence belongs in Git, an artifact store, or a release asset.
- [ ] Secrets scan of all history (tokens, `.env`, SSH paths, private hosts).
      `192.168.50.x` addresses in docs are harmless on a private repo; review
      before public.
- [ ] Provenance: every `public/` GLB/texture has a sidecar without
      `NOASSERTION`, or sits on a dated allowlist (T21 test). Third-party
      assets: confirm redistribution rights before upload.
- [ ] Commit the coordination docs that today live untracked in `IWSDK/docs/`
      (backlog, proposal, briefs) so issue `source:` links resolve.

## 3. Pi as one-way backup

- [ ] Controlled cutover: freeze writes (merge lock held), push all agreed
      refs to GitHub, verify `git ls-remote` tips match local, then flip.
- [ ] After cutover GitHub is the only writable authority per repo. Rename the
      Pi remote (`pi`), and mirror GitHub -> Pi on a schedule
      (`git clone --mirror` + `git remote update`, or `git push --mirror pi`
      from a trusted host). Never push from an agent worktree to Pi.
- [ ] Preserve the existing Pi refs (`desktop-rendering-stage-c`,
      `opus55/render-submit-20260929`) before any mirror run, because a
      mirror push deletes refs absent on the source.
- [ ] Issues, PRs and the Project board are **not** in Git. Back them up
      separately (for example `gh issue list --state all --json ...` and
      `gh api` exports on a schedule).

## 4. Branch-protection plan (depends on the plan tier; verify first)

If protected branches or rulesets are available for the chosen visibility:

- `main`: no direct pushes, PR required, linear history or merge commits
  (owner choice), one approving review, no force-push, no deletion.
- Required checks only once a CI job exists and has been verified green on
  the migration commit. Candidate starting set: `tsc` plus
  `npm run test:smoke`; CPU-timing caps stay out (they live in `test:perf`).
- Activate `CODEOWNERS` only with real GitHub handles (draft in
  `docs/github/CODEOWNERS.draft`).

If they are not available: keep the local merge lock and the single merger
role as the enforcement, and say so in `WORKFLOW.md`. Do not describe the gate
as enforced.

## 5. After upload

- [ ] Labels: `node scripts/github/post-issues.mjs --labels` (dry run), then
      the owner runs it with `GITHUB_REPO=<owner>/<repo> ... --confirm`.
- [ ] Issues: same script, per repo. It skips drafts whose `repo:` differs
      and skips ids already posted.
- [ ] Create the Project with the fields in `PROJECT-BOARD.md`; add issues.
- [ ] New-machine notes: clone both repos into the expected layout
      (`C:/LLM/IWSDK`, `C:/LLM/IWSDK/universe-atlas`), record the exact IWSDK
      revision Atlas tooling needs, provider configuration and asset access
      (`Assets/_assetctl/` is not in Git).
- [ ] Run one bounded cycle (two non-overlapping issues) through the full
      workflow before scaling up.
