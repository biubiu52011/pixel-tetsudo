# JR-Central Tokaido 5102F: individually scoped November 2026 plan

**Source page provided for this audit:**
https://timetable.jr-odekake.net/line-timetable/2244

That page is **東海道本線(米原～浜松) 上り**, NOT the
大垣～美濃赤坂 branch. Selecting November 7, 2026 gives
https://timetable.jr-odekake.net/line-timetable/2244?arv_node=&day=7&dep_node=&hour=&index=&min=&month=11&year=2026

The November 7 source timetable contains train **5102F** and its
corresponding official station clocks for the section:
- `JRC-TokaidoCentral-078` 大垣 (index 77): **08:09 departure**.
- `Toyohashi` 豊橋 (index 42): **09:37 arrival**.
- `odpt.RailDirection:Inbound` (decreasing line index).
- `SpecialRapid` (特別快速).
- SaturdayHoliday calendar, **November 7 only**; an individual
  date-limited planned source record, not an entire November calendar.

Additional public published planned train page for the same
`5102F` service (dated 2026-08-01, NOT itself proof of November
intermediate stop clocks):
https://timetable.jr-odekake.net/train-timetable/38631?date=20260801

No intermediate stop times were copied from the older edition into
the November source. The existing SQL plan importer will record
only the two time-verified endpoints as a **sample**, rather than
pretending the unverified intermediate station clocks exist. This
source is public timetable reference only: there is no authorization
to mirror or copy its full copyrighted timetable. The original
selection and canonical normalization here is project-authored;
the timetable publisher's rights remain unchanged.

In particular, **MinoAkasaka stays empty** until 2026-11
source-backed *branch* planned-number and time records are available.
Do not confuse the 2244 main line train number list with the 3-stop
Mino-Akasaka branch. No observed trains/formation IDs/actual vehicle
identity or unverified PNG series is assigned.
