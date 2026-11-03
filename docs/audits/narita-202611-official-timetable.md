# 成田線 — JR East 2026-11 / 2611 train-number and planned-position audit

Checked on: **2026-11-04 JST**. Website: `pixel-tetsudo`.
SQL source: `public.manual_timetable_templates` and `manual_timetable_template_stops`.
This is an audit of data already stored by the project, not a reproduction
of JR East's official full timetable or proof of actual train formation.

## Scope — do not merge separate operators or branch calendars

| Website line_key | Section | SQL templates | SQL stops | SQL source |
|---|---|---:|---:|---|
| `Narita` | 佐倉→成田→佐原→松岸, with Sobu through boundaries | 348 | 1,968 | `Narita-manual.js` |
| `NaritaAbikoBranch` | 我孫子↔成田 | 160 | 1,600 | `NaritaAbikoBranch-manual.js` |
| `NaritaAirportBranch` | 成田↔空港第２ビル↔成田空港 | 220 | 660 | `NaritaAirportBranch-manual.js` |
| **JR Narita total** | | **728** | **4,228** | |

`NaritaSkyAccess` is **Keisei** (310 separate templates), and MUST NOT
be included in the above JR East Narita train mapping or date admission
rules.

## 2611 official timetable reference

- [総武本線・成田線 上り・平日 213u1](https://timetables.jreast.co.jp/2611/timetable-v/213u1.html)
- [総武本線・成田線 下り・平日 213d1](https://timetables.jreast.co.jp/2611/timetable-v/213d1.html)
- [総武本線・成田線 上り・土休日 213u2](https://timetables.jreast.co.jp/2611/timetable-v/213u2.html)
- [総武本線・成田線 下り・土休日 213d2](https://timetables.jreast.co.jp/2611/timetable-v/213d2.html)
- [成田線・我孫子支線 上り 平日 215u1](https://timetables.jreast.co.jp/2611/timetable-v/215u1.html)
- [成田線・我孫子支線 上り 土休日 215u2](https://timetables.jreast.co.jp/2611/timetable-v/215u2.html)
- [成田線・我孫子支線 下り 平日 215d1](https://timetables.jreast.co.jp/2611/timetable-v/215d1.html)
- [成田線・我孫子支線 下り 土休日 215d2](https://timetables.jreast.co.jp/2611/timetable-v/215d2.html)
- [特急 成田エクスプレス・平日下り 023d1](https://timetables.jreast.co.jp/2611/timetable-v/023d1.html)
- [特急 成田エクスプレス・平日上り 023u1](https://timetables.jreast.co.jp/2611/timetable-v/023u1.html)
- [JR E259 N'EX rolling stock](https://www.jreast.co.jp/train/express/nex.html)
- [JR E231 fleet](https://www.jreast.co.jp/train/local/e231.html)

### Abiko branch: exact train-number parity DONE

Official 2611 pages explicitly enumerate **40 Inbound** trains
`820M, 822M, …, 898M` (成田→我孫子) and **40 Outbound** trains
`821M, 823M, …, 899M` (我孫子→成田), both Weekday and
SaturdayHoliday. This is 80 unique numbers, 160 stored calendar
templates, **0 missing / 0 extra numbers**.

The dedicated `jreast-narita-abiko-number-index-202611.js` verifies
number, source railway, train type, day-calendar, direction, and the
edition window 2026-11-01–2026-11-30. The plan estimator checks this
index **only for SQL planned runs**, not independent ODPT observations.

- `820M` 成田 04:47 → 我孫子 05:26.
- `821M` 我孫子 05:35 → 成田 06:15.
- `872M` 成田 16:14 → 我孫子 16:56. The official pages list
  this number in **both** calendars, while its onward Joban
  connection uses calendar-specific train sections; do not
  fabricate a continuous shared operation identifier.
- `899M` 我孫子 23:54 → 成田 **翌日00:33**. SQL stores
  `00:xx` after midnight, and the estimator's 04:00 JST
  railway-service-day boundary retains the previous service date.

All **1,600** Abiko SQL stop-clock rows are timed and were checked
for monotonic stop order, arrival/departure consistency, source
number validity and lack of duplicate positions at selected
runtime instants. This is still NOT full source revision certification.

### Vehicle artwork — identity boundaries

- Official Abiko branch scheduled fleet is E231系0番台
  (see JR E231 operation area). The site's 80 complete
  published `M` numbers now use its **representative** PNG.
  This is NOT actual carset or formation evidence.
- Narita main / NaritaAirportBranch already carry exact-reference
  E259系 (成田エクスプレス) and E235系1000番台 (Sobu rapid).
  Existing mappings remain intact and train-type-scoped.
- Narita local `M` trains have mixed 209/E233 family and
  regional E131 references; broad `M` suffix alone may not
  claim a single specific vehicle or actual assignment.
- Do not treat a Keisei NaritaSkyAccess `M` or train number
  as a JR service, even if station names overlap.

### Narita main and airport: known boundary gaps, not fabricated clocks

**Narita main**: 348 templates / 1,968 SQL stop rows.
188 rows have no arrival/departure clock; **all 188** are
the two source-boundary placeholders on **94 N'EX templates**
at 佐倉 and 成田. Ordinary and rapid train source rows
have no blank-timed stops. Without timed source evidence,
the estimator must **not invent a position** for those
untimed N'EX source segments.

**NaritaAirportBranch**: 220 templates / 660 SQL stop rows.
94 rows are unclocked source-boundary placeholders on
94 N'EX templates at 成田. They are distinct from the
*timed* airport terminal stations and must not be silently
filled. For example, existing source clocks preserve:
`1431M` 成田 08:12 → 空港第２ビル 08:22 → 成田空港 08:24
and `2002M` 成田空港 07:37 → 空港第２ビル 07:40
→ 成田 07:48.

### Website station key compatibility

The **canonical map station names remain unchanged**.
Normalize source timetable keys only at the lookup boundary:

- `NaritaAirportTerminal2and3` → `Airport-Terminal-2`;
- `NaritaAirportTerminal1` → `Narita-Airport`;
- `ShimosaKozaki` → `Shimosa-Kanzaki`;
- `NaritaAbikoBranch.Kohoku` → `Kohoku-Narita`
  **by railway scope only** (to avoid collision with the
  Nippori–Toneri Liner's 江北).

The first two airport keys already existed in
`RuntimeConfig.STATION_ALIAS`; the independent test suite
must **load real runtime config**, not a blank object, before
concluding airport services are missing. The other two fixes
were added to the runtime alias map and the scoped estimator.

The canonical Narita diagram ends at 松岸; some source
records extend to 銚子 beyond that map and are NOT relocated
to a different station just to render a marker. A verified
SobuMain through-boundary continuation is a separate task.

## Remaining work / reliability status

- The 728 SQL templates have **no source_revision_date**,
  and their coverage audits remain `unverified`.
- Full 2611 minute-by-minute verification of the **4,228**
  SQL stop rows is not yet done; neither are **all four**
  `213u/d` day-calendar number sets fully individually
  checked against source records. Only the Abiko `215`
  80-number set is exhaustive.
- Official 213 tables include **2026-11-07** conditional
  changes and additional 9xxx section numbers: do not
  blindly copy them into a normal SaturdayHoliday SQL template.
- Verify dated N'EX terminal clocks at Sakura/Narita before
  filling existing untimed placeholders.
- Verify canonical cross-line continuity (SobuMain ↔ Narita ↔
  NaritaAirportBranch / Joban) before merging numbered services.
- Preserve `undated_not_current_verified` on SQL source and
  `actual_vehicle_confirmed=false` on all nominal stock entries.

Regression: `tests/narita-2611-number-schedule.test.cjs`
(9 cases, pass in direct runtime invocation).
