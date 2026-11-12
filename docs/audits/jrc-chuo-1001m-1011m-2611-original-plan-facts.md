# JR-Central ChuoCentral — 1001M and 1011M planned-train source facts (2611)

Original, small-sample compilation for the pixel-tetsudo timetable database.

## Scope

- `ChuoCentral` = JR-Central's Nagoya → Shiojiri Chuo Main Line,
  **not** JR-East's Tokyo-region Chuo / Shinonoi lines.
- `1001M`: limited express Shinano 1, normally every day, published
  November 2026. Nagoya 07:00 dep; Tajimi 07:22 arr / 07:23 dep;
  Nakatsugawa 07:48 arr / 07:49 dep; Kiso-Fukushima 08:28 arr /
  08:29 dep; Shiojiri 08:57 arr (end of this line projection).
- `1011M`: limited express Shinano 11, normally every day, published
  November 2026. Nagoya 12:00 dep; Tajimi 12:23 arr / 12:23 dep;
  Nakatsugawa 12:48 arr / 12:49 dep; Kiso-Fukushima 13:24 arr /
  13:25 dep; Shiojiri 13:53 arr (end of JR-Central portion).
- Other stations, including the actually timed Nagoya / Chikusa and
  trans-Shiojiri continuation, are **not** imported as fabricated stop
  observations; this is a timed reference subset for an initial
  planned-position estimate. Missing stop events are not represented.

## Individually corroborated timetable fact sources

- 2026-11 JR-East published Shinano 1 / **1001M** individual table:
  https://timetables.jreast.co.jp/2611/train/000/000041.html
- 2026-11 JR-East published Shinano 11 / **1011M** individual table:
  https://timetables.jreast.co.jp/2611/train/000/000271.html
- JR-East 2026-11 Chuo/Shinonoi weekday and holiday official
  number/calendar pages; both services marked `全日`:
  https://timetables.jreast.co.jp/2611/timetable-v/116d1p.html
  https://timetables.jreast.co.jp/2611/timetable-v/116d2p.html
- Independent public overview, published Oct 23 2026:
  https://jr-group.jp/shinano-timetable/

## Publishing and quality boundaries

The five selected station-clock facts for each train and their
database normalization are an independently authored, narrow factual
compilation; this is not a mirror or bulk reproduction of the complete
JR-East/Kotsu Shimbunsha timetable database. Original publication remains
with its owners. Do **not** infer a general third-party reuse licence.
The source-document and cross-check notes constitute the reuse assertion
for this project's *original selection of facts only*.

Source edition: 2026-11. Both published trains are daily scheduled
services. The existing importer represents that plan in 19 weekday
dates and 11 holiday dates for November 2026, without implying actual
daily departures or actual carset proof.

No JR-Central PNG map exists yet for these numbers. Until an explicit
number-scoped PNG range is registered, the browser must show a neutral
planned train marker, not infer the fleet from `しなの`.

**Acceptance status remains sampled, NOT full-day / all-stop complete.**
