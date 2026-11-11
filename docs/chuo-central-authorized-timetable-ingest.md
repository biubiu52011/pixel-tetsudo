# ChuoCentral: planned-train timetable intake (2026-11)

**Goal:** render date-valid, estimated trains on the **existing SVG route**.
This is not a link-based fallback or a live train-position feed. A number
by itself does not establish a train's location. Station stop clocks do.

## Current evidence boundary

- The 40 physical station IDs between Nagoya and Shiojiri are registered
  in `line_stations` (see
  `supabase/migrations/20261111090000_chuo_central_canonical_40_stations.sql`).
- The current `2026-11` train-plan catalog is **not loaded**. Do not turn
  historical or third-party snapshots into confirmed 2026-11 service.
- Public JR timetables often restrict copying and republication. A publicly
  viewable site is **not** authorization to republish its entire timetable.
- The project does not have a verified, reusable full-day weekday **and**
  Saturday/holiday source for train numbers + per-stop clocks as of this
  audit. Do not fabricate any times, trains, operating days, or vehicle sets.

## One existing SQL import path

Use the already deployed `public.import_jr_central_authorized_plan`, not
another importer/table or a custom browser timetable renderer. Its
validation includes station registry, strict station sequence by direction,
running clocks, 2026-11 service dates, Japan holidays, calendar, exact
number and source rights evidence. It writes both source rows and
canonical `train_timetables` / `train_timetable_members`.

For an authorized original compilation or licensed republication:

1. Record `rights.json` containing the actual source URL,
   `authorization` (only `original_compilation` or
   `licensed_for_republication`), a concrete `authorization_evidence_url`,
   and the dated `edition_date`. Never fabricate a grant or use the
   publisher's homepage as proof of permission.
2. Prepare an independently verified UTF-8 `stops.csv` with **this exact
   header**:

   ```csv
   service_key,train_number,calendar_urn,direction_urn,train_type,operating_dates,stop_sequence,station_id,arrival,departure
   ```

   Each row is a stop. `service_key` is a local import-only grouping key
   for **contiguous rows of one physical train's service**. Repeat its
   metadata on every row. `stop_sequence` begins at 0 and increases by 1.
   `operating_dates` is a semicolon-delimited list of exact YYYY-MM-DD
   dates; do not silently assume a calendar recurs through November. Leave
   unknown arrival/departure fields blank; the first row must have a
   departure and final row an arrival. Times may extend past midnight as
   24:xx, 25:xx, etc. Use **physical** station IDs, not labels.
3. Convert without accessing or mutating production:

   ```bash
   node scripts/prepare-jr-central-sql-plan.cjs \\
     --source rights.json --csv stops.csv --out authorized-plan.json
   ```

4. Independently review `authorized-plan.json` and source rights, then
   import into the existing SQL function in a transaction, using a bound
   JSONB parameter:

   ```sql
   SELECT * FROM public.import_jr_central_authorized_plan(
     'ChuoCentral', :reviewed_document_jsonb
   );
   ```

   Here `:reviewed_document_jsonb` means a bound JSONB parameter in an
   approved SQL client; it is **not** a runnable placeholder in the
   Supabase SQL editor. The restricted importer is for trusted
   administration only. Never expose its execution to `anon` clients.
5. Verify with `supabase/queries/chuo_central_plan_status.sql`,
   `train-runs` Edge Function results for the **matching date**, and the
   website's existing ChuoCentral SVG. A partial import can be labeled
   sampled, **never** full-day complete.

## Trains and PNGs

- Train-number identity is derived from its SQL canonical timetable,
  date and correct `odpt.Railway:JR-Central.Chuo` provenance.
- The 315系 gallery mapping for Nagoya–Nakatsugawa is a
  **reference-only illustration**, not an observed carset assignment.
- Missing stop clocks / station boundaries / permissions do not authorize
  projecting a vehicle icon. Do not linear-interpolate from only the
  start and end of a 20-station commuter corridor and claim precision.
- Do not put an external operator site link in place of an on-site
  timetable-derived train position.

## Source checks

- JR Central officially publishes central-line station timetables:
  https://railway.jr-central.co.jp/time-schedule/search/
- JR East's 2026-11 timetable site restricts unapproved
  reproduction of its time data: https://timetables.jreast.co.jp/
- A timetable-data vendor exists but provides licensed datasets
  mainly to organizations: https://www.kotsu.co.jp/service/jikoku_solution/data_sales/

The above sites are **research references only**, not a recorded
republication authorization or proof that all November trains were imported.
