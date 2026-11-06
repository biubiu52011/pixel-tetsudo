# 篠ノ井線 2611 — historical train-number and planned-fleet references

## Sources and evidence boundaries
- JR East shared Chuo–Shinonoi 2611 timetable: [u1](https://timetables.jreast.co.jp/2611/timetable-v/116u1.html), [u2](https://timetables.jreast.co.jp/2611/timetable-v/116u2.html), [d1](https://timetables.jreast.co.jp/2611/timetable-v/116d1.html), [d2](https://timetables.jreast.co.jp/2611/timetable-v/116d2.html).
- JR East [211](https://www.jreast.co.jp/train/local/211.html) and [E127](https://www.jreast.co.jp/train/local/e127.html) are officially documented as Shinonoi rolling stock.
- JR Central [383](https://company.jr-central.co.jp/sustainability/social/conventional-line/) is used for regular Shinano; its 385 successor was still a prototype testing program in 2026.
- JR East [E131 May 2026 introduction announcement](https://www.jreast.co.jp/press/2026/nagano/20260507_na01.pdf) planned autumn service. A particular November train-number-to-E131 assignment is NOT independently verified.

## Existing ownership first
Original `public.manual_timetable_templates` contains **288 source records**, 144 per Weekday/SaturdayHoliday. This is an imported historical manual timetable with unverified 2026-11 stop clocks and source revision date. The DB ALREADY had **52 official_service_vehicle_plan** mappings for 1001M–1026M (383系; both calendars, `actual_vehicle_confirmed=false`). This change retains all those mappings and corrects the obsolete source text which paired Shinano with unrelated E353/Azusa.

`published_shinonoi_2611_fleet_scope` records (source-template FK):
- 228 Local rows / 114 numbers per calendar: historical roster only. Models are `211系（長野地区）` and `E127系100番台`; no per-train assignment, so the 211 PNG is **illustrative route art**, not evidence 211 actually operated that number. A compatible independent single-model plan may select the existing E127 PNG.
- 8 Rapid rows / 4 numbers per calendar: imported 211 fleet reference, **not** a formation guarantee.
- 52 Shinano limited express rows / 26 numbers per calendar: existing verified **service vehicle plan** `383系`; planned approved image, **not** the actual carset.

This is **not** a claim that the historical source has every published 2611 train or accurate current clocks. JR edition 116 also contains 8230D/8231D Resort View, seasonal Shinshu, overnight/date changes and other services absent from our historical Shinonoi source. Do not synthesize missing trains or assign their images by inferred number ranges.

## Runtime and regression rules
- The immutable read-only number resolver `data/timetables/jreast-shinonoi-2611-number-index.js` admits only exact source train numbers, railway, rendered line, direction, type, calendar, and service month (2026-11). It extends the existing `TrainNumberPngRanges.match` entry point, preserving Senzan and other railroad adapters.
- `vehicle-garage-png-map.js` and `js/train-vehicle.js` promote the existing `JR東海_383系.png` from unassigned pending art to a **Shinonoi-only planned reference**. No global JR Central stock or actual formation is created. The E127 planned-image registry remains unchanged.
- `supabase/functions/train-runs/index.ts` checks 144 source FK rows per requested calendar, verifies type/number/direction/railway, preserves the original canonical schedule IDs and does not certify stop clocks. Unknown/unscoped source rows are excluded. Failure to retrieve full scope fails closed. For Shinano, keep `vehicle_plan_confirmed` true because the **service plan** is official, but `actualVehicleConfirmed` remains false.
- The manifest `scripts/page-scripts.json` owns lazy loading, with a Shinonoi line-only scope. Tests: `tests/shinonoi-2611-number-fleet.test.cjs`, `tests/shinonoi-2611-edge-scope.test.cjs`.

Any new E131 operation or date-specific extra needs fresh number/formation evidence. Never downgrade existing actual realtime vehicle evidence to an inferred plan, invent a source clock, or treat 211/E127 candidate families as physical trainsets.
