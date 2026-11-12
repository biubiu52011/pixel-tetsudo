# JR-Central conventional timetable source investigation — 2026-11-12

> **Current production status (2026-11-12 afternoon): 10/13 conventional lines now contain limited SQL planned timetable samples (17 line-number records, 32 templates, 149 stops). This section supersedes the research-only, zero-train snapshot below. See the import update at the end of this document.**

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
