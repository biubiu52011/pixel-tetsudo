# Pixel Tetsudo CI/CD

## Main branch: direct commit, gated deploy

Direct pushes to `main` trigger `.github/workflows/static.yml` (CI/CD - Pages).
No pull request is required and the workflow never creates one.

The workflow runs two independent validation jobs in parallel:

- `build`: verify generated static bundles and page-script hashes, run UI/data/runtime tests,
  validate the published-asset contract, then build/upload only `.pages-dist`.
- `train-contracts`: call `verify-train-png.yml` via `workflow_call`, running its
  gallery and train/PNG/SQL contract tests.

`deploy` requires **both** jobs to succeed and runs only for `refs/heads/main`.
A failed check therefore blocks GitHub Pages deployment, even when the other job passes.
The Pages concurrency group intentionally queues deployment instead of cancelling a
deployment in progress (to avoid Pages deployment locks).

## Actions menu / manual operation

| Workflow | Purpose | Automatic trigger | Manual |
| --- | --- | --- | --- |
| CI/CD - Pages (`static.yml`) | Validate + publish production Pages | Push to `main` | Yes; non-`main` dispatch validates but does not deploy |
| CI - Train/PNG contracts (`verify-train-png.yml`) | Reusable complete train-related CI gate | Called by Pages CI/CD | Yes; verification only |
| Refresh official monorail run information (`runinfo-snapshot.yml`) | Refresh source-backed monorail status JSON | Scheduled, selected source changes | Yes |
| Stage audited TokyoGTFS railway timetable (`tokyo-gtfs-stage.yml`) | Manually checksum-lock and stage feed with DB credential | None | Yes |
| Merge checksum-locked TokyoGTFS source into SQL quarantine (`tokyo-gtfs-sync.yml`) | Checksum-locked OIDC import to restricted SQL staging | Changes to its own workflow file | Yes |
| Verify Tobu dated SQL plan runtime (`verify-tobu-skytree-gtfs-runtime.yml`) | Check deployed Edge Function / dated SQL fixtures | Relevant files changed | Yes |

These data and runtime-monitoring workflows **do not** publish Pages themselves.
Do not merge the two TokyoGTFS import workflows without confirming their different
authentication and staging semantics.

## Maintenance rules

1. Modify the responsible source, script, or manifest before adding another
   specialized CI patch or test.
2. When script dependencies change, run
   `node scripts/sync-page-scripts.cjs` and commit the generated `pages/*.html`
   alongside the source; CI checks with `--check` and fails on stale hashes.
3. When generated data bundles change, regenerate them using their owning
   scripts and commit the updated artifacts before deploying.
4. Add train/PNG contract steps to `verify-train-png.yml`; do not add file-by-file
   `push.paths` entries. Every production push now executes this complete suite.
5. Keep runtime-only Pages packaging in `scripts/build-pages-site.cjs`, with
   `tests/pages-artifact-contract.test.cjs` guarding included/excluded assets.
6. The GitHub Actions `schedule` trigger is best-effort, **not** a 15-minute
   freshness SLA. The site rejects expired run-info snapshots; investigate a
   dedicated scheduler if a more reliable update interval is required.
7. Only the run-info workflow writes its snapshot back to `main`. GTFS jobs
   target quarantine/staging and must not silently alter live timetables.
