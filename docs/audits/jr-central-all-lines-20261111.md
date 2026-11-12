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


## 2026-11-12 production update — scheduled train samples imported

**Supersedes the older zero-conventional-trains snapshot above.** Production
`pnupwfmgbtxqhpzsrhfn` was read back after importer calls:
**10 of 13 conventional JR-Central lines now have source-scoped samples,
17 distinct (line_key,train_number) records, 32 calendar templates and 149
schedule-stop events** (15 weekday, 17 holiday templates). The number of
actual trains and formations verified remains **zero, by design**.

| line_key | distinct numbers | templates | scheduled stop rows |
|---|---:|---:|---:|
| ChuoCentral | 4 | 8 | 40 |
| Gotemba | 1 | 2 | 12 |
| Iida | 2 | 4 | 8 |
| KansaiCentral | 2 | 4 | 12 |
| KiseiCentral | 2 | 4 | 24 |
| Meisho | 1 | 2 | 6 |
| Minobu | 1 | 2 | 12 |
| Takayama | 2 | 4 | 24 |
| Taketoyo | 1 | 1 | 5 |
| TokaidoCentral | 1 | 1 | 6 |
| MinoAkasaka / Sangu / Taita | 0 each | 0 each | 0 each |

This day’s importer run's *current* batch added 10 line-number source
samples / 18 calendar templates / 79 stops beyond the previous 7-number,
14-template, 70-stop batch. Selected numbered services: Takayama
`1722C/1728C`; Kisei `3001D/3002D`; Taketoyo `5861F` holiday-only;
Tokaido `5100F` holiday-only; Kansai `3001D/3002D`; and Iida
`23M/24M`. For Kisei/Kansai the same 3001D/3002D *planned service
number* occurs on separate line sections, never interpreted as a
physical-carset continuity proof.

Reproducible idempotent import SQL (all successfully replayed with
`inserted_trains=0`, `inserted_stops=0`):
- `supabase/queries/jrc_takayama_kisei_taketoyo_2611_sample_import.sql`
- `supabase/queries/jrc_tokaido_5100f_kisei_3001d_2611_sample_import.sql`
- `supabase/queries/jrc_kansai_3001d_3002d_2611_sample_import.sql`
- `supabase/queries/jrc_iida_23m_24m_2611_sample_import.sql`
(The four earlier lines' SQL imports are retained separately.)

Per-trip selected factual times and primary publisher URLs are documented
in `docs/audits/jrc-*2611-planned-samples.md`. Each source file is a
narrow project-authored fact selection, **not** a licence to bulk copy any
publisher's copyrighted complete timetable.

SQL quality checks: 0 duplicate `operating_dates` for any
`(line_key,train_number,service_date)` and 0 rows in
`published_timetable_chronology_issues` for all ten active conventional
lines. Existing `published_timetable_full_day_acceptance` correctly
rejects **all** 13 lines: source material remains incomplete per day
and/or direction; even the active ten lines are *sampled*, not a complete
2026-11 daily timetable.

**Still without scheduled train templates**: `MinoAkasaka` (美濃赤坂),
`Sangu` (参宮), `Taita` (太多). Continue source and train-number/stop-clock
verification before a first import on these lines. A third-party schedule
browse page by itself is not proof of redistribution rights or of 2026-11
number+clock calendar identity.

No extra runtime data layer, GPS/actual-train tracking, or guessed model/PNG
rules were added. The existing SQL `train-runs` Edge and browser
position estimator remain the consuming path.


## 2026-11-12 later supplement — four more Shinano 2611 plans

Production Supabase follow-up imported `ChuoCentral` planned-number trains
`1003M`, `1004M`, `1005M`, `1006M` from the JR-East **official**
2026-11 2611 per-train pages and Weekday/SaturdayHoliday diagrams:
- `docs/audits/jrc-chuo-shinano-1003m-1006m-2611-scheduled-stops.md`
- `supabase/queries/jrc_chuo_1003m_1006m_2611_planned_sample_import.sql`
- `supabase/queries/jrc_chuo_1003m_1006m_2611_planned_number_383_png.sql`

**Additional 4 distinct planned train numbers, 8 SQL templates, 50 timed
stop records**, with day-specific 2026-10-31 Agematsu extra-stop events
excluded from November's normal plan. Every plan is bounded to the
Nagoya–Shiojiri ChuoCentral line. Re-running the source importer gave
0 train/stop inserts.

Expanded the existing exact-number 383系 representative
`published_train_png_number_ranges` on ChuoCentral from 4 to **8**
single-number rules, `actual_vehicle_confirmed=false`. This SQL
asset evidence does not verify a real carset. No new generic range or
new PNG file was generated.

**Current verified production snapshot, superseding all above earlier
counts: 10/13 JR-Central conventional routes with planned samples,
21 line-scoped numbered train records, 40 calendar templates
(19 Weekday, 21 SaturdayHoliday), 199 scheduled stop rows**.
ChuoCentral now has 8 distinct numbers / 16 calendar templates /
90 source stop rows. Other 9 already-populated lines are unchanged.
MinoAkasaka, Sangu, Taita still have 0 templates.
All 13 full-day acceptances remain false.
0 date-overlap duplicates and 0 timetable chronology issues on all
conventional lines, confirmed by production readback.

**Known display limitation to verify**: the SQL PNG number pool is
populated, but browser display of those new ChuoCentral 383 pictures was
not checked in a live browser. Current `train-runs` Edge v374 might not
propagate conventional-rail SQL PNG evidence as it does for Shinkansen;
do not claim rendered 383 icons until that existing read path is tested.


## 2026-11-12 latest supplement — Sangu 928C and Taita 720C

This **supersedes** all earlier production line/number/stop totals recorded
above. Current production Supabase project `pnupwfmgbtxqhpzsrhfn` was
verified with read-only aggregate and integrity queries:

- **12 / 13** JR-Central conventional lines with sampled numbered plans.
- **23** distinct `(line_key,train_number)`, **43** source calendar templates,
  **211** scheduled stop rows (20 weekday / 23 SaturdayHoliday templates).
- No `(line_key,train_number,service_date)` overlaps.
- No rows in `published_timetable_chronology_issues` for JR-Central
  conventional routes.
- **0/13 full-day acceptance passes**: intentionally unverified whole-day
  timetable coverage.
- `Sangu`: 1 distinct number, 2 templates, 10 stop rows (planned `928C`
  鳥羽 13:23 → 伊勢市 13:42; daily 2026-11).
- `Taita`: 1 distinct number, 1 template, 2 timed endpoint events
  (`720C`, 多治見 09:53 → 美濃太田 10:24 on **2026-11-03 only**).
  This one-day example must **not** be expanded into weekdays or other
  weekends without documented date-specific train-number proof.
- `MinoAkasaka`: **0** numbered plans. Station timetable clocks for
  2026-11 appear in the current online timetables, but the publicly found
  `725F`, `726F`, `3710G` examples were recorded BEFORE the
  2026-03-14 annual revision, and cannot justify declaring a particular
  2026-11 train number. Do **not** manufacture one from the generic
  700F/G number-range policy.

Production additions performed:
- `supabase/queries/jrc_sangu_928c_2611_sample_import.sql`
- `supabase/queries/jrc_taita_720c_20261103_sample_import.sql`

Both imports successfully re-ran with **zero additional templates/stops**.
Source-specific evidence and narrow independently authored timetable facts:
- `docs/audits/jrc-sangu-928c-2611-planned-train.md`
- `docs/audits/jrc-taita-720c-20261103-planned-sample.md`

Current public timetable context for the missing branch:
- https://transit.yahoo.co.jp/search/result/%E7%BE%8E%E6%BF%83%E8%B5%A4%E5%9D%82-%E5%A4%A7%E5%9E%A3
- https://ekitan.com/timetable/railway/line-station/149-146/d1
- https://w.atwiki.jp/nomiyajunin/pages/12.html (2025 number-series
  guideline, **not 2026-11 exact train-number evidence**)

No real-carset tracking, guessed intermediate stop clock, unsupported
number-PNG mapping or full-day acceptance was introduced. Some plan
samples are intentionally valid only on historic individual dates and
should not be interpreted as current-day map-visible trains.


## 2026-11-12 JR Odekake 2244 official numbered-line source follow-up

The user supplied https://timetable.jr-odekake.net/line-timetable/2244 .
The rendered document explicitly names **東海道本線(米原～浜松) 上り**,
and displays a large official 2026-11 line-specific train-number matrix
with separate arrival/departure station clock rows, not the 3-station
`MinoAkasaka` branch. This official source is suitable for validating
individual scheduled train numbers on `TokaidoCentral` but cannot prove
MinoAkasaka's 2026-11 numbered trips.

Production import completed:
- `5102F` 2026-11-07 SaturdayHoliday train;
  Ogaki (`JRC-TokaidoCentral-078`) 08:09 → Toyohashi 09:37.
- Exactly one date-scoped SQL template and two original selected stop
  clock facts, source evidence:
  `docs/audits/jrc-tokaido-5102f-20261107-official-2244.md`.
- SQL `supabase/queries/jrc_tokaido_5102f_20261107_official_2244_sample_import.sql`.
  Source import replay inserted 0 additional trains and 0 stops.
- Cross-checked 5102F service numbering and the endpoints against an
  earlier individual JR timetable (2026-08); no older intermediate
  stop clock times were transplanted to November.

**Current confirmed production snapshot superseding earlier totals:
12/13 conventional lines, 24 distinct (line_key,train_number),
44 calendar templates, 213 scheduled stop rows.** MinoAkasaka
still has zero train-number-backed SQL plan templates.

2026-03 JR-Central branch station posters have valid clock times
but no actual train NUMBER (e.g.
https://railway.jr-central.co.jp/time-schedule/srch/_pdf/data/202603/tokaido_Mino-akasaka_B_wh_u.pdf );
do not create fictional branch train numbers from 2244 mainline
number columns. Publisher timetable database redistribution is
restricted: this import represents an independently selected handful
of published schedule facts, not mirroring the entire provider table.

The TokaidoCentral acceptance status remains
`blocked_no_weekday_trains`; the small source-sample import
must not be presented as full-day coverage or a current-date train.
