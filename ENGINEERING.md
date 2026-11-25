# Pixel Tetsudo engineering rules

This document defines durable architecture, data and validation rules. Read it
together with [`AGENTS.md`](AGENTS.md), [`PROGRESS.md`](PROGRESS.md), and
[`docs/COMPONENTS.md`](docs/COMPONENTS.md) before making a change. Current code
is evidence of local implementation; only live-system readback is evidence of
current deployment.

## 1. Document ownership

| Document | Responsibility |
| --- | --- |
| `README.md` | Project entry point and supported development commands |
| `AGENTS.md` | Delivery procedure and authorization boundaries |
| `ENGINEERING.md` | Durable architecture, data and validation policy |
| `docs/COMPONENTS.md` | Current source-level module ownership and dependencies |
| `PROGRESS.md` | Task status, evidence, deployment state and remaining work |
| `docs/README.md` | Active versus historical documentation classification |

Dated audits and reports are immutable evidence snapshots. They do not override
current source or the active documents.

## 2. Product and architecture boundaries

The seven product pages are `home`, `history`, `realtime`, `trains`, and the
three tourism detail pages. Shared behavior is fixed in its owner rather than by
page-specific patches.

```text
canonical railway/tourism data -> generated artifacts -> DataLoader / RailwayDB
ODPT observations + SQL timetable plans -> ODPTClient -> DataFusion / estimator
vehicle evidence -> TrainOperationEvidence / TrainVehicle -> renderer
shared UI component -> page controller -> page
```

The current browser runtime uses ordered classic scripts and `window.*` public
facades. This is an explicit compatibility model, not permission to add another
global owner. New work must use the existing owner and public facade. A future
module migration must preserve behavior, enumerate consumers, and remove the
replaced path after verification.

## 3. Canonical data and generated artifacts

- `data/core/railway_data.json` owns railway identity, stations, coordinates,
  order, transfers, service boundaries and presentation metadata.
- `data/core/station_i18n.json` owns canonical station translations.
- `data/core/tourism_data.json` owns tourism facts.
- `.compact.json`, `.file.js`, `data-config-bundle.js`, catalogs and audit
  indexes are generated artifacts. Do not edit them as independent facts.
- External aliases adapt known external identifiers to existing canonical
  entities. They must not create stations, reorder topology or hide bad source
  data.

When a canonical source changes, run its existing generator and commit the
required artifacts together. `node data/core/generate-all.js --check` must work
on supported Windows and CI checkouts; newline style alone is not data drift.

## 4. Plans, observations and evidence

Supabase timetable data represents published plans: revision, effective dates,
service calendar, exceptions, train number, stops and planned times. It is not
proof that a train ran, where it is, how late it is, or which physical formation
operated it.

Use each source for its own question:

| Source state | Position behavior | Timetable behavior |
| --- | --- | --- |
| Valid realtime observation | Prefer the observation for the same train/segment | A valid plan remains queryable |
| Partial realtime coverage | Use observations where covered; scoped plan estimates may fill gaps | Preserve plan date and revision |
| No realtime observation | Estimate only from a valid plan and label it as estimated | Return the valid plan if available |
| Stale or failed realtime | Mark stale/unavailable; do not present it as current | Do not destroy the plan |

Vehicle artwork follows the same separation. An evidence-backed unique planned
model may be shown as a plan reference. Multiple candidates stay unresolved; do
not pick the first drawable image. Representative artwork is never proof of the
actual formation.

## 5. Unique responsibility and root-cause repair

A reported line, station, train or page is a symptom sample, not the default
repair boundary. Determine the cause, owner and triggering conditions, then
inspect other consumers and inputs with those conditions.

Repair the original owner. Do not add `fix.js`, `patch.js`, a v2 renderer,
runtime canonical-data correction, HTML hotfix scripts, page CSS overrides,
shadow tables, or a second timetable/fusion chain. If a real railway difference
requires special data, express it in the canonical source or the existing
evidence-scoped rule system and cite its boundary.

The owner matrix is maintained in `docs/COMPONENTS.md`. Before deleting or
splitting an owner, search all direct and indirect consumers, including dynamic
script templates and tests.

## 6. UI and runtime rules

- `SiteShell` owns shared header, navigation, language entry and footer.
- `LineCard`, `DataState`, `OperatorFilterBar`, `ThroughChip`, `TransferBadge`
  and `TourismDetailCore` own their internal DOM and behavior.
- Page controllers assemble capabilities; they do not duplicate business
  algorithms or patch component internals.
- `RouteSearch` owns topology search, `RouteTimetable` owns planned connection
  timing, and `SearchUI` owns interaction.
- `DataFusion` owns source fusion, `TrainPositionEstimator` owns plan-based
  position estimation, `RunningChainResolver` owns evidenced through-running,
  and `TrainVehicle` owns vehicle/artwork resolution.
- Renderers consume resolved results; they do not infer vehicle identity,
  timetable truth or canonical topology.

Preserve mobile layout, language changes, online/offline recovery, BFCache,
late-data and stale-data behavior when changing shared runtime code.

## 7. Implementation workflow

1. Check the actual Git root, branch, upstream, status and recent history.
2. Preserve unrelated and untracked user work.
3. Record the known symptom, owner, affected consumers and authorization scope.
4. Modify the canonical owner and required generated artifacts only.
5. Verify the known symptom, equivalent inputs and normal boundary cases.
6. Update the existing `PROGRESS.md` task entry with local, commit/push, CI and
   production states kept separate.
7. Commit and push directly to `main` when authorized. Do not create a PR unless
   the user explicitly requests one.

If a normal push is rejected, report the exact error. Do not force-push, rewrite
history, weaken protections or create a fallback branch/PR without direction.

## 8. Validation by change type

| Change | Required local evidence |
| --- | --- |
| Markdown | Links, anchors, paths, API/module claims, active versus historical status |
| Generator | Syntax, check mode, content-drift negative test, Windows/CI newline behavior |
| JS/HTML/CSS | Syntax, owner tests, affected pages, mobile/language/lifecycle behavior |
| Canonical data | Source evidence, identity/relationship integrity, artifact synchronization, guards |
| Timetable/fusion | Revision, calendar, cross-day, exceptions, realtime priority, stale recovery, provenance |
| Production release | All applicable local evidence plus deployment and public-resource/browser readback |

Never weaken tests or refresh a baseline merely to turn a failure green. A hash,
unit test, simulation, local screenshot or API replay is not live production or
device acceptance. State unverified boundaries explicitly.

## 9. Delivery and production authorization

An authorized ordinary change uses a normal commit and push to `main`. A push
may run CI, but it does not authorize any of the following:

- Pages production publication or rollback;
- Supabase writes or migrations;
- Edge Function deployment;
- release/version registration;
- changes to branch protection or workflow authorization gates.

Those actions require separate explicit authorization and current-system
verification. Scheduled evidence jobs remain read-only and deliver reviewable
artifacts; they do not create branches, PRs or production facts.

## 10. Completion language

Report implementation, local validation, commit/push, CI, deployment and live
acceptance separately. `DONE` means the declared scope and required validation
are complete; it does not imply deployment. If equivalent affected inputs or a
required environment remain unverified, use `PARTIAL`, `REVIEW`, or an explicit
limitation instead of claiming a universal fix.
