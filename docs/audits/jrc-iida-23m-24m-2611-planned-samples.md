# JR-Central Iida 2026-11: two limited numbered `伊那路` planned source samples

**These are 2026-11 *scheduled* trains, NOT real train positions.**
This is a minimal original compilation that intentionally records ONLY
published endpoint clocks and exact official train number; no intermediate
stop arrivals, dwell times, stock assignments or live operation is inferred.

### `23M` — 特急 伊那路3号, Toyohashi → Iida
- JR-East 2026-11 Issue 2611 timetable `飯田線 下り` both weekday
  and SaturdayHoliday list `23M` and `全日`:
  https://timetables.jreast.co.jp/2611/timetable-v/112d1.html
  https://timetables.jreast.co.jp/2611/timetable-v/112d2.html
- Independently compiled regular Inaji scheduled endpoints in October 2026:
  https://jr-group.jp/inaji-timetable/
- Original two-station extract: `Toyohashi` departing **18:19**;
  `JRC-Iida-060` (飯田) arriving **21:01**.
- Canonical direction: `Outbound`, station index 0→59.

### `24M` — 特急 伊那路4号, Iida → Toyohashi
- JR-East 2026-11 Issue 2611 timetable `飯田線 上り` both weekday
  and SaturdayHoliday list `24M` and `全日`:
  https://timetables.jreast.co.jp/2611/timetable-v/112u1p.html
  https://timetables.jreast.co.jp/2611/timetable-v/112u2.html
- Independently compiled regular scheduled endpoints:
  https://jr-group.jp/inaji-timetable/
- Original two-station extract: `JRC-Iida-060` (飯田)
  departing **15:55**; `Toyohashi` arriving **18:31**.
- Canonical direction: `Inbound`, station index 59→0.

### Scope and reuse

The original fact selection and station-ID normalization only are
documented here. No bulk copying of publisher time tables and no
claim of license over third-party sources. For each 2611 train, the
existing dated importer will record 19 weekdays and 11 holiday dates,
meaning **planned service calendar**, not confirmed running on a
particular date.

**Critical:** These are 2-stop examples, not a verified full
Iida-line itinerary or full-day schedule. Time interpolation over
missing stops is only approximate; the source does not license the
project to generate artificial intermediate stop clocks. Actual fleet,
formation and live train identity are **unknown**. PNG may only be
chosen by an independently populated, line-specific **planned
train-number pool**. Do not assert full-day acceptance.
