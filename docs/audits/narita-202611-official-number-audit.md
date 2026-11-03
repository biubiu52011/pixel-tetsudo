# JR成田線 — JR East 2026-11 (`2611`) official train-number audit

Checked: 2026-11-04 JST. This audits the existing Supabase
`public.manual_timetable_templates` number fields for the *three JR-East*
`line_key` values below. It deliberately excludes `NaritaSkyAccess`
(Keisei operator). It is **not** an authorization to copy JR East
timetable content into SQL, and it does **not** certify per-stop clocks,
actual operation on any date, or real fleet assignment.

## Official published number-heading membership

Each full SQL `train_number` was checked for membership in the matching
JR East official `列車番号` columns for route, calendar and direction:

| SQL line key | Calendar | JR timetable direction | SQL | Number exists in edition `2611` | Absent |
| --- | --- | --- | ---: | ---: | ---: |
| Narita | Weekday | Inbound/上り | 85 | 85 | 0 |
| Narita | Weekday | Outbound/下り | 89 | 89 | 0 |
| Narita | SaturdayHoliday | Inbound/上り | 85 | 85 | 0 |
| Narita | SaturdayHoliday | Outbound/下り | 89 | 89 | 0 |
| NaritaAirportBranch | Weekday | Inbound/上り | 55 | 55 | 0 |
| NaritaAirportBranch | Weekday | Outbound/下り | 55 | 55 | 0 |
| NaritaAirportBranch | SaturdayHoliday | Inbound/上り | 55 | 55 | 0 |
| NaritaAirportBranch | SaturdayHoliday | Outbound/下り | 55 | 55 | 0 |
| NaritaAbikoBranch | Weekday | Inbound/上り | 40 | 40 | 0 |
| NaritaAbikoBranch | Weekday | Outbound/下り | 40 | 40 | 0 |
| NaritaAbikoBranch | SaturdayHoliday | Inbound/上り | 40 | 40 | 0 |
| NaritaAbikoBranch | SaturdayHoliday | Outbound/下り | 40 | 40 | 0 |
| **TOTAL** | | | **728** | **728** | **0** |

Official sources:

- Main and Narita airport through services,
  [weekday 213u1](https://timetables.jreast.co.jp/2611/timetable-v/213u1.html),
  [weekday 213d1](https://timetables.jreast.co.jp/2611/timetable-v/213d1.html),
  [holiday 213u2](https://timetables.jreast.co.jp/2611/timetable-v/213u2.html),
  [holiday 213d2](https://timetables.jreast.co.jp/2611/timetable-v/213d2.html).
  This joint published table includes through-running sections and
  other-route numbers: table membership does not alone prove the correct
  line boundaries or physical running-chain identity.
- Abiko branch,
  [weekday 215u1](https://timetables.jreast.co.jp/2611/timetable-v/215u1.html),
  [weekday 215d1](https://timetables.jreast.co.jp/2611/timetable-v/215d1.html),
  [holiday 215u2](https://timetables.jreast.co.jp/2611/timetable-v/215u2.html),
  [holiday 215d2](https://timetables.jreast.co.jp/2611/timetable-v/215d2.html).

## SQL structural consistency

- All 728 template numbers have the `[0-9]{3,4}[MF]` form.
- Every inbound group uses even-numbered trains and every outbound
  group odd-numbered trains; **0** contrary entries.
- No duplicates within `(line_key,calendar_urn,direction_urn,train_number)`.
- All **220** NaritaAirportBranch templates have exactly matching
  Narita templates for the same number, calendar, direction and train
  type. **0** counterpart omissions or type disagreements.
- The duplicate appearances in the Narita and Airport branch tables
  are *segments of the service*, not an invitation to deduplicate across
  branches or rewrite the public train number.
- All 160 Abiko branch templates follow **820M..898M even inbound**
  and **821M..899M odd outbound**, matching both public calendars.

## Important separate limitations

1. All 728 SQL templates have **no verified `source_revision_date`**.
   An exact official *number* cannot certify the SQL *stop times* or
   an arbitrary November date's service.
2. Existing N'EX segments contain **188 untimed station-stop rows**
   on `Narita` and **94** on `NaritaAirportBranch`. These are
   missing/untimed pass-through or segment placeholders, not wrong
   public numbers; never synthesize stop clocks or render a position
   from an all-untimed train template.
3. JR East explicitly announces **Nov 10, 11 and 12 2026**, roughly
   09:10–15:00, **12 train cancellations per day (both directions
   combined) between Sawara and Choshi**, with substitute buses.
   [Official Narita operations notice](https://traininfo.jreast.co.jp/train_info/line.aspx?gid=1&lineid=naritaline).
   Public `2452M`, for example, is listed as **not operating Nov
   10–12** in the official
   [train detail](https://timetable.jr-odekake.net/train-timetable/230491?date=20261031).
   It is a *valid* number but cannot be treated as operating on those
   dates without a date-scoped operation overlay.
4. The four joint main/airport timetable headings contain renumbering
   by section (e.g. `3565F` vs `565F`, N'EX
   `2001M` vs `2201M`). Only the actual section's
   original full number can be shown for that segment.
5. No SQL changes, source revision promotion, or per-train model
   assignments are warranted by this number membership result alone.

**Decision:** Number membership passes **728/728**. The next audit
must address per-stop clocks, service-day exceptions, segment
continuity and missing N'EX timing rather than inventing new numbers.
