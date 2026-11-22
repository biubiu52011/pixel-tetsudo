# Pixel Tetsudo CI/CD

## Single Pages deployment entrypoint

Commit directly to main (no PR). Only static.yml deploys GitHub Pages.
Build and the reusable verify-train-png.yml suite must both pass before deploy.

- Build validates generated static bundles and the canonical page-script hashes.
  Never silently rewrite generated HTML during CI to hide stale committed data.
- Shared UI, translation, and page presentation tests run in Pages build.
  Train/SQL/PNG/canonical metadata tests are owned by the reusable train suite.
- The CI test registry (scripts/ci-test-registry.cjs) checks every test file.
  Historical gaps are explicitly listed in scripts/ci-test-legacy.json; new
  tests with no YAML owner are automatically executed in Pages CI.
  Gradually migrate historical gaps into the responsible test suites.
- Older build jobs can be canceled when a new push arrives. Only deploy
  holds the serial Pages deployment lock, never canceling an active deploy.
- The deployment job alone receives pages:write and id-token:write.

## Other workflows

| Workflow | Trigger | Responsibility |
| --- | --- | --- |
| static.yml | Every push to main; manual | Single CI/CD + Pages publication |
| verify-train-png.yml | Reusable call; manual | Rail metadata, train/SQL/PNG and canonical contract checks |
| audit-external-rail.yml | Relevant file push; manual selection | Read-only external observations for live trains, Tobu, Toei and dated GTFS |
| runinfo-snapshot.yml | Schedule; relevant source changes; manual | Refresh verified official monorail status snapshot |
| tokyo-gtfs-stage.yml | Manual | SHA-256 locked, credentialed SQL staging |
| tokyo-gtfs-sync.yml | Manual | SHA-256 locked, OIDC-protected SQL quarantine |

The runinfo snapshot bot commit contains [skip ci] to avoid ordinary push
trigger loops. Since GITHUB_TOKEN pushes do not start other push workflows,
runinfo-snapshot.yml explicitly dispatches static.yml only AFTER a changed
snapshot was successfully pushed. GITHUB_TOKEN requires actions:write only
in this updater; Pages build and external probes remain read-only.

External API reachability must not block normal Pages releases. The two GTFS
import workflows keep different authentication and staging semantics, and
must not silently promote staged trip numbers or PNG mappings into live data.

## Maintenance

1. Modify the owner script or data table, not duplicate patches in workflows.
2. After JS edits, run node scripts/sync-page-scripts.cjs and commit all
   generated pages/*.html version changes. Pages CI checks with --check.
3. Regenerate canonical data bundles before publishing any data changes.
4. Add all train/PNG/SQL regression commands to verify-train-png.yml.
5. Keep the Pages asset whitelist in scripts/build-pages-site.cjs and its tests.
6. GitHub schedule is best effort and cannot guarantee 15-minute freshness.
7. Never commit database credentials. GTFS imports remain manual and isolated.
