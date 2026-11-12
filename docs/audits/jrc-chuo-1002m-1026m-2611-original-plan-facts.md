# ChuoCentral 2611 independently collated inbound timetable samples

Limited selected facts (planned numbers and five scheduled station clocks
per service, not a redistribution of any provider's complete 2026-11 database).

Two published **daily scheduled** Limited Express Shinano services:
- **1002M** (しなの2号), JR-Central Chuo portion Shiojiri 07:14 departure,
  Kiso-Fukushima 07:42 arrival / 07:43 departure,
  Nakatsugawa 08:21 arrival / 08:22 departure,
  Tajimi 08:50 arrival / 08:51 departure,
  Nagoya 09:18 arrival.
- **1026M** (しなの26号), JR-Central Chuo portion Shiojiri 20:43 departure,
  Kiso-Fukushima 21:10 arrival / 21:11 departure,
  Nakatsugawa 21:47 arrival / 21:48 departure,
  Tajimi 22:16 arrival / 22:17 departure,
  Nagoya 22:42 arrival.

The original trains begin at Nagano, but their earlier JR-East stations
are intentionally excluded from ChuoCentral's source. `Inbound` means
decreasing canonical station_index (Shiojiri index 39 → Nagoya index 0).

Official 2026-11 November timetable individual train pages:
- JR East 1002M: https://timetables.jreast.co.jp/2611/train/000/000071.html
- JR East 1026M: https://timetables.jreast.co.jp/2611/train/000/000461.html
- 2026-11 official source page, weekday Chuo/Shinonoi inbound:
  https://timetables.jreast.co.jp/2611/timetable-v/116u1p.html
- 2026-11 official source page, holiday Chuo/Shinonoi inbound:
  https://timetables.jreast.co.jp/2611/timetable-v/116u2.html

Original compilation scope: the project's independently selected
narrow factual subset and its station-ID/line-calendar normalization
only. No provider rights for wholesale copying or transformation
are claimed. This note may be cited as evidence of the authored subset,
not a general licence from JR East or the timetable publisher.

`manual_timetable_templates` owner is `ChuoCentral`;
train numbers `1002M` and `1026M`, `LimitedExpress`,
`odpt.RailDirection:Inbound`, daily schedule represented in
2026-11 by Weekday (19) and SaturdayHoliday (11) source date sets.
This is partial representative data only; no complete line/fleet/all-day
assertion, no real carset, no interpolated missing station arrival clocks.
