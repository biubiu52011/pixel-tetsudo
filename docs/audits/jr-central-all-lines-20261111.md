# JR-Central all-line SQL and train mapping remediation (2026-11-11)

## Scope

All 14 canonical JR-Central line entries: 13 conventional lines plus
`TokaidoShinkansen`. The conventional line IDs and station lengths are:
- `TokaidoCentral`: 84 stations (already SQL registered)
- `ChuoCentral`: 40 stations (already SQL registered)
- `Gotemba`: 19 stations (new SQL station-order registry)
- `Minobu`: 39 stations (new SQL station-order registry)
- `Iida`: 94 stations (new SQL station-order registry)
- `Takayama`: 45 stations (new SQL station-order registry)
- `Taita`: 8 stations (new SQL station-order registry)
- `Taketoyo`: 10 stations (new SQL station-order registry)
- `KansaiCentral`: 18 stations (new SQL station-order registry)
- `KiseiCentral`: 41 stations (new SQL station-order registry)
- `Sangu`: 11 stations (new SQL station-order registry)
- `Meisho`: 15 stations (new SQL station-order registry)
- `MinoAkasaka`: 3 stations (new SQL station-order registry)

## Changes

- Backfill 303 `line_stations` rows for the other 11 conventional lines from the
  **existing** canonical station order in `data/core/railway_data.compact.json`.
  Preserve the existing 84 TokaidoCentral, 40 ChuoCentral and 17 Shinkansen rows.
- Preserve `stations` coordinates and all existing station IDs. Missing
  coordinates remain unverified; no placeholder latitude/longitude is invented.
- Extend `import_jr_central_authorized_plan(line_key,jsonb)` to all 13 conventional
  routes, retaining invoker-only permissions, source reuse authorization, exact
  dates, stop-clock ordering, station count and sampled-not-full-coverage checks.
- For Takayama, Inotani (canonical station index 36) is the boundary with JR-West
  infrastructure. Services including stops beyond Inotani require *per-train*
  JR-Central operating-company evidence. That does not declare all cross-border
  services to belong to either operator.
- Filter the 13 conventional SQL template candidates by exact service_date,
  canonical line ID and railway identity **within the calendar-selection loop**.
  An undated or wrong-day source cannot become a dated November train.
- Strengthen TokaidoCentral fleet-illustration eligibility by checking that the
  source's own verified train number exactly matches the requested number.
- Add CI guard for all 13 canonical station orders and the SQL/read-path contract.

## Preserved limitations

- No fabricated schedules, numbered trains, operation maps, source licenses,
  live train positions or actual carset identities were added.
- The prior 132 TokaidoShinkansen SQL source templates and 50 planned-model
  links are untouched; they are not a full November timetable.
- Asset gaps, geocoding, exact-date source publication, and the all-day weekday/
  holiday acceptance require separate verified source evidence.
- The `sql_planned_fallback_enabled` capability is not proof of timetable
  completeness; `published_timetable_full_day_acceptance` remains the
  acceptance authority. Imported individual trains remain sampled until proven.
