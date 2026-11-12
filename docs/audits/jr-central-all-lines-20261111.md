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

## 2026-11-12 update: planned train-number PNG pool (Supabase + main)

- **Responsibility split**: SQL owns the timetable (scheduled train number, calendar,
  stations, arrival/departure clocks); the native PNG is only a map illustration
  selected by an exact **published planned train number** and source line. No
  actual carset, formation ID, live positioning or daily vehicle tracing is
  required to select an icon.
- Registered existing generic 313, 315 and 373 JR-Central PNG assets in
  `vehicle_image_assets`; the existing 383 and N700 catalog entries were retained.
- Reused 50 *existing*, source-scoped 2611 `published_train_number_evidence`
  records (50 unique numbers, all with existing A-grade official planned vehicle
  links). Stored **50 single-number, min=max, suffix=A** entries under
  `published_train_png_number_ranges` for `TokaidoShinkansen`. This is an
  N700 **family** illustration pool, not evidence of the actual N700/N700S
  subvariant; the 19 N700S and 31 N700 planned-model records remain untouched.
  11 of those source templates include `2026-11-12` in operating_dates.
- `supabase/functions/train-runs/index.ts` now selects that JR-Central
  Shinkansen reference path from the exact SQL number pool alone. The older
  vehicle-model equality gate remains in place for **other** operators.
  Deployed to production `train-runs` **v374 ACTIVE** with original
  `verify_jwt=false` configuration; deployed source equals `main`.
- `js/train-position-estimator.js` forwards the number-matched server artwork
  for exact `official-2611-sql-exact-roster` source records; the existing
  `TrainVehicle.selectMarkerArtwork` renderer displays it as an estimated,
  representative PNG. Service nickname `のぞみ1` never substitutes for official
  `1A` in this lookup. Updated `pages/trains.html` cache hashes.
- SQL committed and executed:
  `supabase/queries/jr_central_2611_plan_number_png_pool.sql`.
  Regression test: `tests/jr-central-2611-number-png-contract.test.cjs`.
  Smoke tests confirmed numbered 1A -> gallery PNG, nickname/blank/external
  paths rejected, plus unrelated Sanyo model logic unchanged.
- **Remaining blockers**: each of the **13 JR-Central conventional routes
  still has zero** `manual_timetable_templates` rows. All-day accepted
  2026-11 timetable sources have not been imported; the importer deliberately
  requires independently authorized train and stop-clock evidence. The 132
  Tokaido Shinkansen source templates are still an incomplete historical/sampled
  plan, NOT a complete verified November all-day timetable.
- Validation limits: production SQL join reported 50 matching numbers, 11
  dated 2026-11-12, zero conflicting PNG paths; deployed Edge v374 source was
  read back and matched GitHub. Browser/Safari map visual verification and a
  direct HTTP response from the public Edge endpoint were unavailable.
