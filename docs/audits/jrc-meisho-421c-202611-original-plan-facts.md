# JR-Central Meisho 421C — independently collated *planned* trip facts

**Edition / applicability:** 2026-11 (JR timetable 2026-11 issue).
**Line:** `Meisho` (JR-Central, 松阪→伊勢奥津).
**Scheduled train number:** `421C` (NOT a service nickname or operation number).
**Calendar:** scheduled daily during November 2026; split into Weekday
and SaturdayHoliday source rows only for the existing SQL calendar contract.
**No actual vehicle/operation information.** No trainset identity or delay tracking.

## Limited, independently selected facts

This original summary combines only the few factual times necessary for an
initial, explicitly *sampled* railway-position estimate:
- 松阪 19:01 scheduled departure.
- 家城 19:38 scheduled arrival, 19:51 scheduled departure.
- 伊勢奥津 20:26 scheduled arrival.

The other 12 stations of this trip are intentionally NOT represented as
verified individual stop clocks. The source importer therefore creates a
3-stop **partial source journey**, not a full-day or all-stops acceptance.
Do not invent the missing station dwell or arrival times.

Cross-checks:
1. JRおでかけネット 2026-11 individual planned train page provides
   **421C**, the listed three stop events and `毎日運転`:
   https://timetable.jr-odekake.net/train-timetable/124601?date=20261107
2. Jorudan 2026-11 plan confirms 19:01 → 20:26 endpoint journey:
   https://www.jorudan.co.jp/time/to/松阪_伊勢奥津/?Ddd=14&Dym=202611&r=名松線
3. Tsu City old 2020 overview also shows 19:38/19:51 at 家城,
   useful cross-check of that stop but **not** proof that the entire
   2020 schedule remains current:
   https://www.info.city.tsu.mie.jp/_res/projects/default_project/_page_/001/004/548/meisholine_jikokuhyo.pdf

## Source integrity and authorized original compilation

This document's narrowly selected three scheduled station facts and
provenance are an original fact-checking compilation for this project,
rather than an import, redistribution, mirroring or republication of
the originating complete external timetable database. No third-party
provider's data licence is claimed; check provider terms before
acquiring or bulk publishing complete route diagrams. This project's
authored summary may be reused with citation to the individual sources.
Scheduled timestamps are predictions/route plan, not observations.

**Import intention:** two source rows for the same `421C` journey:
Weekday (19 valid Nov dates, excluding Nov 3/23) and
SaturdayHoliday (11 valid Nov dates, including Nov 3/23).
These are disjoint date arrays, using the existing
`import_jr_central_authorized_plan('Meisho', jsonb)` routine.

**Do not mark the Meisho full-day plan complete.** No PNG number
mapping is asserted for `421C`; neutral train marker is expected.
