# Sangu 928C — 2026-11 planned train record

Line `Sangu`, JR-Central (canonical station indices decreasing, 9→5).
This is a **published timetable plan**, not actual train running, GPS,
carset identity or formation evidence.

Published `JR時刻表 2026年11月号` individual train page:
https://timetable.jr-odekake.net/train-timetable/99971?date=20261023

The page explicitly shows `列車番号 928C`, `普通`, `毎日運転`,
and the following five 2026-11 scheduled stop events, normalized
to the existing canonical SQL line station IDs:

| Station | station_id | scheduled arrival | scheduled departure |
|---|---|---|---|
| 鳥羽 | JRC-Sangu-011 | null | 13:23 |
| 松下 | JRC-Sangu-009 | 13:29 | 13:30 |
| 二見浦 | JRC-Sangu-008 | 13:33 | 13:34 |
| 五十鈴ケ丘 | JRC-Sangu-007 | 13:37 | 13:38 |
| 伊勢市 | JRC-Sangu-006 | 13:42 | null |

This narrow, manually selected factual train record and the
project-specific canonical station mapping are authored for the
project, with attribution to the published source. The provider
does **not** give permission to copy or redistribute a complete
timetable database; the official page itself warns against
unauthorized reproduction. No bulk source rights are claimed.

For the existing November-2026 date-scoped importer, the daily
timetable service is represented with two disjoint date sets:
19 Weekday service days + 11 SaturdayHoliday service days,
including 11/03 and 11/23 in the latter. This describes
**planned service dates**, not verification of actual daily operation.

**Acceptance remains sampled.** No vehicle PNG mapping is invented
for train number 928C, and no actual fleet is claimed.
