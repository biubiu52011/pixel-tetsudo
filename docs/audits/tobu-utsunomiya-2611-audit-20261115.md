# 東武宇都宮線 — source audit and correction (2026-11-15)

## SQL and source facts
- 172 source rows, each with 11 stops, composed of 86 numbers 401N–486N in each weekday/holiday calendar; 43 outward and 43 inward per day type.
- All 86 weekday / holiday train stop-clock sequences are identical. No `source_revision_date`, `revision_id`, `operating_dates`, `physical_service_key`, `previous_timetable_ids` or `next_timetable_ids` is populated. Coverage is `unverified`.
- All 172 existing vehicle mappings label 20400型 `official_single_fleet_plan`, `actual_vehicle_confirmed=false`, no physical trainset evidence.
- 20 of 43 Inbound records per calendar carry destination `MinamiKurihashi`; current station departure schedules corroborate southbound trains, not their physical through identity.

## Applied
1. Replaced 11 x 2-minute placeholders for an 11-station railway with ten physical-segment medians `[3,3,3,4,3,2,4,3,3,3]` derived from 86 SaturdayHoliday source train directions. These are reference **running** minutes, not published current end-to-end times.
2. Synchronized `railway_data.json`, `railway_data.compact.json` and `railway-data.file.js`.
3. Declared scoped TobuUtsunomiya ⇄ TobuNikko boundary at Shin-Tochigi with `selected-local-destination-only` / `physicalContinuationVerified:false`. No automatic through-train merge; suppress generic mutual-through label for this limited scope.
4. New exact `401N–486N` 20400 model representative PNG index, guarding railway/operator/calendar/direction/type/source/date/physical assignment and using the existing centralized matcher. **Not** evidence for a current run or physical carset, not a timetable generator.
5. `SQL_POSITION_VERIFICATION_MONTHS.TobuUtsunomiya = ['*']` blocks projected CURRENT train positions from undated legacy SQL. Keeps original source records for audit. Does not block independently verified live position feeds.
6. Added targeted automated tests for number inventory, PNG source guards, geometry, through scope, date gate and lazy asset hashes.

## External sources
- 2026-03-14 timetable issue: https://www.tobu.co.jp/news/4656/
- Tobu official rolling-stock fleet catalogue: https://www.tobu.co.jp/corporation/rail/vehicles/
- 2026-11-15 departure comparison (Minami-Utsunomiya -> Shin-Tochigi / Minami-Kurihashi): https://roote.ekispert.net/timetable/train/21825/2750

## Unresolved / do not invent
- Need full officially published 2026-11 numbered stop clocks and revision certificate before enabling estimated CURRENT positions. A date-matched destination alone is not proof of every station clock.
- Need independently proven same-train identities on TobuNikko to populate canonical continuation; no heuristic same-minute merges.
- No physical 20400 formation or livery assigned from a number band.
