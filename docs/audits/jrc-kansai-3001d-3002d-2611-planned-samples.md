# JR-Central KansaiCentral 2611 train-number samples (3001D / 3002D)

**Scope:** only the JR-Central Kansai Main Line between Nagoya and Yokkaichi.
These are narrow selected *planned* time/number facts, not an all-day timetable.

Both limited express Nanki services are listed as **毎日運転**
in the 2026-11 JR時刻表 edition, with their official train numbers:

- `3001D` 南紀1号, planned *Outbound* along KansaiCentral
  (station index 0→11), source
  https://timetable.jr-odekake.net/train-timetable/28011?date=20261024:
  名古屋 (`Nagoya`) **08:02** departure;
  桑名 (`Kuwana`) **08:24 arrival / 08:25 departure**;
  四日市 (`Yokkaichi`) **08:36 arrival / 08:37 departure**.
  It then travels toward Ise Railway before entering the Kisei line.
- `3002D` 南紀2号, planned *Inbound* along KansaiCentral
  (station index 11→0), source
  https://timetable.jr-odekake.net/train-timetable/28031?date=20261023:
  四日市 (`Yokkaichi`) **09:02 arrival / 09:04 departure**;
  桑名 (`Kuwana`) **09:15 arrival / 09:16 departure**;
  名古屋 (`Nagoya`) **09:42 arrival**.

Both are the same *planned train numbers* as the already imported
KiseiCentral samples; the existing canonical train groups remain
`source_only` and no cross-line single physical train, actual vehicle
identity or continuous position across Ise Railway is asserted.

The 3 stops each are a small, independently normalized factual selection
made for this project. The publisher Kotsu Shimbunsha retains its
timetable rights; bulk reproduction or transformation of complete
train schedules without permission is not permitted. No publisher
licence is claimed. The user's project document is a provenance-backed
original selection, NOT an imported third-party timetable database.

Represent November 2026 each-day planned service via disjoint 19
Weekday and 11 SaturdayHoliday date sets. Partial segments only;
other intermediate or connecting stops are not fabricated. Future
edition revisions must not silently inherit these dates. Keep both
line's acceptance as **sampled / blocked_sample_not_full_schedule**.
