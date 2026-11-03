# 東金線 — JR East 2026-11 / 2611 number and timetable audit

Checked: 2026-11-04 JST. Scope: website `pixel-tetsudo`, SQL
`public.manual_timetable_templates`, `line_key='Togane'`.
Track stations: 大網 — 福俵 — 東金 — 求名 — 成東.
This file records an audit, not a copy of JR East's published timetable.

## Official November 2611 number sets

All **122** existing SQL templates match the *public train number
sets* for their respective day and direction (61 per calendar).
The late-date conditional duplicate columns in the official pages
are **not** additional recurring services for November.

| Operating calendar | Direction | Stored SQL | Official set matches | Extra/missing |
| --- | --- | ---: | ---: | ---: |
| Weekday | 成東→大網・上り | 30 | 30 | 0 |
| Weekday | 大網→成東・下り | 31 | 31 | 0 |
| SaturdayHoliday | 成東→大網・上り | 30 | 30 | 0 |
| SaturdayHoliday | 大網→成東・下り | 31 | 31 | 0 |
| **Total** | | **122** | **122** | **0** |

Sources:
- [216u1 — 平日・上り](https://timetables.jreast.co.jp/2611/timetable-v/216u1.html)
- [216d1 — 平日・下り](https://timetables.jreast.co.jp/2611/timetable-v/216d1.html)
- [216u2 — 土曜休日・上り](https://timetables.jreast.co.jp/2611/timetable-v/216u2.html)
- [216d2 — 土曜休日・下り](https://timetables.jreast.co.jp/2611/timetable-v/216d2.html)

The source-number sets were read from existing Supabase templates,
cross-checked with the above JR East pages, and installed as a
**2026-11-01 through 2026-11-30** number-admission guard:
`data/timetables/jreast-togane-number-index-202611.js`.
The estimator applies it **only to SQL planned positions**.
Realtime observations and other independent timetable sources are
not filtered. This is not a claim that the published train times have
been reproduced or independently verified.

## Stored SQL and runtime integrity

- **598** stored stop-clock records across 122 templates.
- First rows have departures, terminal rows have arrivals; no
  blank-timed stops, fictitious terminal departures, or origin arrivals.
- Station order is monotonic and correct for the source direction.
- Inter-stop time never decreases; arrival is never after departure
  at the same stop in the SQL snapshots.
- Full SQL input was run through the site's
  `TrainPositionEstimator.estimateAllPositions` for
  Nov 3 (holiday) and Nov 4 (weekday) at multiple times.
  No duplicate public numbers or invalid station positions were seen.
- Partial runs `1674M` (東金→大網) and `1675M` (大網→東金)
  have three stops, correctly **not** five fabricated whole-line stops.

Sample officially cross-checked clocks:
- `620M`: 成東 04:56 → 大網 05:14.
- `621M`: 大網 05:25 → 成東 05:42.
- `5680Y`: 成東 06:51 → 大網 07:16;
  東金 07:01 arrival, 07:08 departure.
- `5983Y`: 大網 19:47 → 成東 20:05.
- `1674M`: 東金 22:12 → 大網 22:20.
- `1675M`: 大網 21:59 → 東金 22:06.

These examples do **not** constitute a full minute-by-minute official
comparison of all 598 arrival/departure fields.

## Vehicle number mapping and through-service boundaries

- `5680Y` and `5983Y` are numbered Keiyo-through 東金線
  services, shown with an E233系5000番台 **reference image**
  only, not as certified on-the-day trainset evidence.
- Official pages show `5680Y` joins `3680Y` between 誉田 and 東京,
  and `5983Y` joins `4883Y` between 東京 and 誉田.
  These different section numbers must not be rewritten, aliased
  or merged solely because of their coupling note.
- Ordinary `M` family includes mixed / transitional 209 and E233
  duties; do not infer a single fleet or subseries from `M`.
- The SQL fleet labels on some `M` trains are nominal, not
  confirmed operating carsets. The site's display remains neutral
  when no safe one-model evidence is available.

## Published date adjustments outside November

The same 2611 public pages also describe modified clock columns
for **2026-12-30–2027-01-03**, **2027-01-31** and
**2027-02-20/21/27/28**. They must not replace the November
basic timetable. Later editions and date-specific overrides require
fresh confirmation.

## Verification status and remaining work

Database currently records all 122 canonical Togane services as
`undated_not_current_verified`, all `source_only`, with no
`source_revision_date`. Published coverage audit also remains
`unverified`. None of these fields was promoted or silently changed.

Open work:
1. Verify **all 598** SQL stop-clock rows with 2611 official
   train detail for both calendars and all turnback boundaries.
2. Verify exact date-specific changes, 2026-11 exceptions (if any),
   and date conditions independently.
3. Independently verify which `M` duties use 209, converted E233,
   or other stock before authorizing any new type-specific PNG.
4. Establish verified cross-line canonical continuity before merging
   the Togane Y units with their Keiyo/Sotobo counterpart numbers.

Regression:
`tests/togane-2611-number-schedule.test.cjs` (7 cases).
