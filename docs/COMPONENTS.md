# Pixel Tetsudo component index

Status: current source-level ownership. Verified against source at pre-change
HEAD `2117c424` on 2026-11-26. Deployment versions and production health do not
belong in this file; record time-sensitive evidence in `PROGRESS.md`.

Use this index to find the existing owner before changing a consumer. Public
entries below are selected facades, not a promise that every internal function
is stable.

## 1. Canonical data and loading

| Capability | Owner | Boundary |
| --- | --- | --- |
| Railway identity/topology/presentation | `data/core/railway_data.json` | Canonical editable source |
| Station translations | `data/core/station_i18n.json` | Canonical editable source |
| Tourism facts | `data/core/tourism_data.json` | Canonical editable source |
| Core artifact generation | `data/core/generate-all.js` | Generates/checks active `.compact.json`, `.file.js` and config artifacts |
| Core data loading | `data/core/db-loader.js` / `DataLoader`, `RailwayDB` | HTTP compact JSON, `file://` script bundles, indexes and realtime cache |
| Runtime configuration | `data/core/data-config-bundle.js` | Generated bundle; edit its source modules instead |
| ODPT and SQL-plan client | `data/api/odpt-unified.js` / `ODPTClient` | Requests, caching, identity adaptation and train-runs access |
| SQL plan endpoint | `supabase/functions/train-runs/index.ts` | Service-day plan selection; no actual-operation claim |

The readable JSON files are the only editing sources. Compact JSON serves HTTP;
`.file.js` serves offline `file://`. Their duplicate payload is intentional and
must remain generator-synchronized.

## 2. Business owners

| Capability | Owner / selected facade | Main consumers |
| --- | --- | --- |
| Route topology | `js/route-search.js` / `RouteSearch` | `SearchUI` |
| Planned connections | `js/route-timetable.js` / `RouteTimetable` | `SearchUI`, transfer display |
| Search interaction | `js/search-ui.js` / `SearchUI` | Home page |
| Through-running identity | `js/running-chain-resolver.js` / `RunningChainResolver` | Fusion, estimation and trains views |
| Observation/plan fusion | `js/data-fusion.js` / `DataFusion` | Realtime and trains controllers |
| Plan-based position estimation | `js/train-position-estimator.js` / `TrainPositionEstimator` | `DataFusion` and trains details |
| Vehicle evidence and artwork | `js/train-vehicle.js` / `TrainOperationEvidence`, `TrainVehicle`, `TrainIcons` | Estimator, fusion and renderer |
| Train-number artwork rules | `data/timetables/train-number-png-ranges.js` / `TrainNumberPngRanges` | `TrainVehicle` |
| Line presentation | `js/line-presentation-service.js` / `LinePresentationService` | Cards, state and trains views |
| Station identity resolution | `js/station-resolver.js` / `StationResolver` | Search and display services |
| Run-information semantics | `js/runinfo-evaluator.js`, `js/runinfo-web.js` | Fusion and status views |
| Offline run-information translation | `js/delay-translator.js` / `DelayTranslator` | Realtime page |

`DataFusion` and `RouteTimetable` consume plans through `ODPTClient`; pages do
not construct competing timetable requests. `TrainVehicle` is the single public
vehicle/artwork facade even though its current implementation remains a large
compatibility file.

## 3. Shared UI owners

| Capability | Owner | Pages |
| --- | --- | --- |
| Header/navigation/language/footer | `js/site-shell.js` / `SiteShell` | All seven pages |
| Line and system cards | `js/line-card.js` / `LineCard` | Realtime, trains |
| List/page data state | `js/data-state.js` / `DataState` | Realtime, trains |
| Operator filtering | `js/operator-filter-bar.js` / `OperatorFilterBar` | Realtime, trains |
| Transfer result badge | `js/transfer-badge.js` / `TransferBadge` | Home search results |
| Tourism type classification | `js/tourism-type.js` / `TourismType` | Tourism entry/detail flows |
| Tourism detail foundation | `js/tourism-core.js` / `TourismDetailCore` | Event, shop and spot details |
| Tourism proximity | `js/tourism-proximity.js` | Home and tourism views |

Components own their internal DOM. Page code supplies mounts, data and events;
it must not query private classes to patch a shared component.

## 4. Trains page ownership and load order

The trains page has a small controller shell and a line-scoped cold-detail
bundle. The active ownership is:

| Module | Current responsibility |
| --- | --- |
| `js/trains-data.js` | View-data assembly, geometry inputs, static network signature and shared geometry helpers |
| `js/through-chip.js` / `ThroughChip` | Through-label measurement, layout, direction and SVG rendering |
| `js/trains-detail-loader.js` / `TrainsDetailLoader` | Validated, ordered dynamic loading of line-scoped detail scripts |
| `js/train-position-estimator.js` | Plan-based train positions after detail load |
| `js/train-track-layout.js` / `TrainTrackLayout` | Direction-aware train marker coordinates and collision lanes |
| `js/trains-render.js` / `TrainsRender` | SVG/DOM layers, markers, details and incremental updates |
| `js/trains-page.js` | Page lifecycle, selection, events and assembly |

`pages/trains.html` loads `trains-data.js`, `through-chip.js`,
`trains-detail-loader.js`, and `trains-page.js` initially. Its
`#pt-trains-detail-assets` template then loads shared vehicle/range data,
line-scoped timetable indexes, `train-position-estimator.js`,
`train-track-layout.js`, and `trains-render.js` in dependency order.

Therefore `through-chip.js` and `train-track-layout.js` are active owners, not
removed forwarding shells. Do not fold their algorithms into the page or claim
that the trains page loads only `trains-data.js` and `trains-render.js`.

## 5. Page script chains

- `home.html`: loader/config -> identity and translations -> ODPT/run information
  -> fusion -> route/timetable/search -> tourism/history.
- `realtime.html`: loader/config -> ODPT/run information -> fusion -> presentation
  and state -> delay translation -> realtime controller.
- `trains.html`: the same shared data/status foundation -> presentation/state ->
  trains shell -> line-scoped cold detail bundle.
- Tourism detail pages: language/site shell -> core loader -> tourism detail
  foundation -> type-specific controller.

The ordered classic-script model means a public `window.*` facade must exist
before its consumer executes. Update `scripts/page-scripts.json`, generated page
tags and relevant cache fingerprints through existing tooling rather than hand
maintaining a second script list.

## 6. Generated and evidence data

The following are derived or evidence-scoped and must not become competing
canonical sources:

- `data/audits/*.json`: generated catalogs, snapshots and review evidence;
- `data/timetables/*-index.js`: line/source scoped timetable indexes;
- `data/timetables/vehicle-operation-evidence*`: exported vehicle evidence;
- SQL migrations: immutable historical database changes, not editable current
  configuration;
- dated audit Markdown: conclusions for the recorded source/commit only.

Representative PNG mappings remain scoped by line, date, service, source and
evidence level. A gallery association does not authorize a train-number mapping
or actual formation claim.

## 7. Validation entry points

| Area | Entry point |
| --- | --- |
| Core generated artifacts | `node data/core/generate-all.js --check` |
| Browser data contract | `node --test tests/railway-browser-contract.test.cjs` |
| Service-day/position semantics | `node --test tests/train-position-service-day.test.cjs` |
| Train-number artwork runtime | `node --test tests/train-number-png-runtime.test.cjs` |
| Run-information semantics | `node tools/runinfo-evaluator.test.js` and related scope tests |
| Page script synchronization | Existing page-script tests and sync checker under `scripts/` |

Select additional tests from the changed owner and all affected consumers. A
local check does not establish current Supabase, Edge, Pages, browser or device
state.

## 8. Known structural debt

The current public facades are authoritative, but several implementations are
large and high-churn: `train-vehicle.js`, `train-number-png-ranges.js`,
`train-runs/index.ts`, `trains-render.js`, and `train-position-estimator.js`.
Refactoring should split internal responsibility behind the existing facade,
one owner at a time, with consumer and regression coverage. Do not introduce a
parallel v2 chain or move rules into page code.
