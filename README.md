# Pixel Tetsudo

Pixel Tetsudo is a static, multilingual railway-information site. It combines
canonical railway topology, planned timetables, available realtime observations,
and evidence-scoped vehicle artwork without treating plans as actual operations.

## Pages

| Page | Entry point | Purpose |
| --- | --- | --- |
| Home | `pages/home.html` | Route search, planned connections, nearby tourism |
| Realtime | `pages/realtime.html` | Line status and available realtime observations |
| Trains | `pages/trains.html` | Line diagrams, observed or estimated positions, vehicle references |
| History | `pages/history.html` | Locally stored search history |
| Tourism | `pages/tourism-{event,shop,spot}.html` | Shared tourism detail views |

Serve the repository root with a static HTTP server and open
`/pages/home.html`. Direct `file://` loading is retained for offline use, but an
HTTP server is the normal development path.

## Architecture at a glance

```text
canonical JSON -> generated compact/file bundles -> DataLoader / RailwayDB
ODPT observations + SQL plans -> ODPTClient -> DataFusion / estimator
scoped vehicle evidence -> TrainVehicle -> trains renderer
shared UI components -> page controllers -> seven pages
```

The browser application currently uses ordered classic scripts and explicit
`window.*` public facades. Script ownership and load order are documented in
[`docs/COMPONENTS.md`](docs/COMPONENTS.md); do not infer dependencies only from
file names.

## Source-of-truth rules

- `data/core/railway_data.json`: railway identity, topology, stations and presentation metadata.
- `data/core/station_i18n.json`: canonical station translations.
- `data/core/tourism_data.json`: tourism facts.
- Supabase timetable rows are plans, not proof of actual operation or formation.
- Realtime observations, timetable estimates and vehicle evidence retain separate provenance.
- Generated `.compact.json` and `.file.js` files are artifacts, not editing entry points.

## Development checks

```powershell
node data/core/generate-all.js --check
node --test tests/railway-browser-contract.test.cjs
node --test tests/train-position-service-day.test.cjs
git diff --check
```

Run additional tests selected by the changed component. A local test, hash
comparison or screenshot is not production acceptance.

## Documentation

- [`AGENTS.md`](AGENTS.md): repository delivery rules for coding agents.
- [`ENGINEERING.md`](ENGINEERING.md): durable architecture, data and validation rules.
- [`docs/COMPONENTS.md`](docs/COMPONENTS.md): current module ownership and load relationships.
- [`PROGRESS.md`](PROGRESS.md): current and historical execution evidence.
- [`docs/README.md`](docs/README.md): active versus historical documentation index.

Direct commits to `main` are the default authorized delivery path. A push runs
CI but does not authorize a Pages production release, Supabase write, migration,
or Edge deployment.
