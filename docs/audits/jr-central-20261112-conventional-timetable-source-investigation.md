# JR-Central conventional timetable source investigation — 2026-11-12

> **Current production status (2026-11-12 latest): 12/13 conventional lines have limited SQL planned timetable samples (23 line-number records, 43 templates, 211 stops).** This section supersedes the research-only, zero-train snapshot below. See the import update at the end of this document.**

**Status: research only.** No JR-Central conventional train templates, station clocks, numbers,
PNG number ranges or vehicle formations were inserted into production by this investigation.
Scope: the existing 13 JR-Central conventional canonical lines (not TokaidoShinkansen).
Project rule: SQL contains scheduled train numbers + operating calendars + scheduled stops;
train positions are timetable estimates only; PNGs are selected solely by planned train number
and the appropriate existing numbered PNG pool. Do not look up real carsets.

## Production Supabase findings (2026-11-12)

- 13/13 canonical lines registered, with 426 total line-station registrations.
- All 13 have `sql_planned_fallback_enabled=true` but **zero**
  `manual_timetable_templates`, zero calendar source trains, and zero
  `published_train_png_number_ranges` records.
- Each shows `missing_all_plans` / `blocked_no_published_trains` in
  `published_timetable_full_day_acceptance`.
- `line_data_inventory` for 11 lines describes topology only; ChuoCentral
  records a date-scoped JR-Central traininfo snapshot, and TokaidoCentral an
  official station lookup. Neither is an authorized, complete train timetable.
- Do not repurpose the **50 numbered TokaidoShinkansen PNG mappings** for these
  conventional lines, and do not backfill the unrelated `train_runs` table.

| Canonical SQL line | stations | Published March-2026 research lead |
|---|---:|---|
| TokaidoCentral | 84 | traing.o.oo7.jp 2026 OuDia Atami–Toyohashi and Hamamatsu–Maibara; beatexpress CA/CB |
| ChuoCentral | 40 | traing.o.oo7.jp Chuo/Shinonoi 2026 OuDia; beatexpress CF/ACF |
| Gotemba | 19 | beatexpress ACB Gotemba diagram |
| Minobu | 39 | beatexpress ACC Minobu diagram |
| Iida | 94 | beatexpress CD south/north of Tenryukyo |
| Takayama | 45 | traing.o.oo7.jp Takayama/Taita 2026 OuDia; beatexpress CG |
| Taita | 8 | traing.o.oo7.jp Takayama/Taita; beatexpress CG |
| Taketoyo | 10 | traing.o.oo7.jp Tokaido/Taketoyo 2026 OuDia; beatexpress CE |
| KansaiCentral | 18 | traing.o.oo7.jp Kansai/Ise Railway 2026 OuDia; beatexpress CJ |
| KiseiCentral | 41 | traing.o.oo7.jp Kisei/Meisho 2026 OuDia; beatexpress CJ2 |
| Sangu | 10 | traing.o.oo7.jp Kisei/Sangu and Kansai bundled OuDia; beatexpress CJ2 |
| Meisho | 15 | traing.o.oo7.jp Kisei/Meisho bundled OuDia; beatexpress CE/CJ2 |
| MinoAkasaka | 3 | beatexpress CA Tokaido–Minoakasaka branch, and traing.o.oo7.jp Tokaido bundles |

Research entry points:

- JR Central official station timetables:
  https://railway.jr-central.co.jp/time-schedule/search/
  (lists all 13 JR Central conventional systems, plus Tokaido Shinkansen).
- JR Central official Nagoya Chuo weekday station PDF (202603):
  https://railway.jr-central.co.jp/time-schedule/srch/_pdf/data/202603/chuo_Nagoya_A_w_d.pdf
  **Station departure times, train types and destinations exist, but ordinary
  full railway numbers and whole-journey per-stop clocks are not supplied.**
- 2026-03-14 OuDia data directory with weekday/holiday diagrams:
  https://traing.o.oo7.jp/traing/oudia/dia22.html
  Includes Tokaido, Taketoyo, Chuo, Takayama, Taita, Kansai, Kisei, Sangu
  and Meisho, as components of combined diagram datasets.
- 2026-03-14 independently compiled reference diagrams:
  https://beatexpress.seesaa.net/article/458268868.html
  Includes Iida (two sections), Gotemba, Minobu, and broader routes.
  The author explicitly says these are reference-only, primarily weekday-based,
  omit some services and may lag timetable revisions.
- JR Central March 2026 general change notice:
  https://jr-central.co.jp/news/release/_pdf/000044803.pdf
- Commercial operator-complete feeds (CSV / XML / GTFS) only offered
  to organizations by Kotsu Shimbunsha, with a commercial licence:
  https://www.kotsu.co.jp/service/jikoku_solution/data_sales/
- JR Central site use policy:
  https://jr-central.co.jp/policy/

### Evidence and reuse boundaries

The two enthusiast diagram sites are **data discovery candidates**, not
proven grants for republishing their full diagram databases. Their actual
download files were not programmatically parsed or checksummed in this
research. Investigate each compiler's redistribution licence (or request
permission) before copying wholesale diagrams to public Supabase/GitHub.
The JR Central official station website likewise carries restrictions on
republication. A schedule is a **planned** schedule, not GPS/observed position:
do not require a carset or realtime feed. But the official station PDF alone
cannot establish the individual train number and end-to-end stop list.

### Existing script and importer audit

Canonical owner already exists:
`scripts/prepare-jr-central-sql-plan.cjs` converts independently authored,
authorized flat CSV into `import_jr_central_authorized_plan(line_key,jsonb)`.
The function covers all 13 station orders and checks source URL,
`original_compilation` or `licensed_for_republication`, source rights evidence
URL, route/line ownership, station order, stop clocks, and calendar.
`supabase/functions/train-runs/index.ts` already reads this SQL and
`js/train-position-estimator.js` can project scheduled locations.

**Important unimplemented requirement for a recurring timetable**:
the current importer restricts `operating_dates` to 1–62 explicit dates
inside 2026-11-01 through 2026-11-30. The Edge SQL selector also requires an
explicit `operating_dates` match for all JR-Central conventional lines.
That is a finite-date source importer, not a general recurring weekday/holiday
timetable. A 2026-03-14 baseline should instead be versioned by timetable
edition + weekday/SaturdayHoliday, with optional date exceptions and special
services; it should not require inventing daily observation proofs. Preserve
source evidence and prevent overlapping revision validity. No database schema
or code modifications were made for this audit.

Current `tests/jr-central-shared-plan-import.test.cjs` tests the original
two-line migration and should be reconciled with the newer all-13 importer,
rather than duplicated in a new parallel path.

### Prioritized extraction / acceptance protocol

1. **Pilot Taketoyo or Taita**: ten/eight-station lines, included in existing
   2026-03-14 combined OuDia source material. Obtain a redistributable input,
   verify its weekday and SaturdayHoliday editions independently, record
   original archive version/hashes and responsible publisher.
2. Parse original train numbers (not service nicknames/operation codes), ordered
   canonical stations, direction, scheduled arrival/departure, exceptions.
   Two adjacent stops can define a short source sample, but full-day acceptance
   needs all applicable trains and both calendars. No default 2-min/station.
3. Compare a limited sample of each calendar against the official station
   departure PDF, correct cross-operator boundaries and split short branches.
   At TokaidoCentral reconcile Atami–Toyohashi versus Hamamatsu–Maibara
   overlap by actual planned trip ID, never by equal train number alone.
   At Takayama exclude JR-West-owned continuation past Inotani absent proof.
4. Refactor the existing importer and Edge calendar gating from the fixed
   November-only whitelist to source edition + standard service calendar with
   optional explicit exceptions. Add unit tests; do not add a parallel renderer.
5. Import ONLY the rights-cleared and independently corroborated baseline into
   `manual_timetable_templates` / `manual_timetable_template_stops`, then
   verify via the existing `train-runs` API and browser estimator.
6. Build new line-scoped, non-overlapping PNG number pool **only from
   published planned numbers**, not observed formations. If no numbered mapping
   exists, keep the neutral planned marker. Expand remaining lines once the
   pilot validates both direction and calendar.

**No full-day acceptance is claimed for any of the 13 conventional routes.**


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

The present investigation's *current* batch added 10 line-number source
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
