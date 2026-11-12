# JR-Central 2026-11: limited planned-train samples (research selection)

**Purpose:** tightly selected published scheduled train-number / arrival /
departure facts for existing `manual_timetable_templates` importer. This is
not a complete train timetable, not an assertion of operating reality, and
not a physical carset or model assignment.

## Takayama (高山本線, JR-Central source line)

Both ordinary services are marked **毎日運転** in the November 2026 published
JR timetables and are distinct from their through-running incoming source
numbers north of Takayama (which do not belong in the same train-number
record). Only the section 高山→美濃太田 (station indices 25→7) is imported.

- `1722C` (source:
  https://timetable.jr-odekake.net/train-timetable/232811?date=20261027;
  text explicitly cites the **JR時刻表 2026年11月号**):
  高山 16:39 departure; 飛騨小坂 17:17 / 17:18;
  下呂 17:45 / 17:47; 飛騨金山 18:19 / 18:20;
  白川口 18:35 / 18:35; 美濃太田 19:08 arrival.
- `1728C` (source:
  https://timetable.jr-odekake.net/train-timetable/75361?date=20261104):
  高山 18:53 departure; 飛騨小坂 19:28 / 19:29;
  下呂 19:53 / 19:54; 飛騨金山 20:24 / 20:25;
  白川口 20:40 / 20:40; 美濃太田 21:18 arrival.

Both have **Inbound** SQL direction (decreasing station indices).
No JR-West-owned north-of-Inotani route is added and no earlier 830D /
1832D source train number is conflated with the new southbound numbers.

## KiseiCentral (紀勢本線)

- `3002D` (特急 南紀2号), **毎日運転**, November 2026 JR timetable:
  https://timetable.jr-odekake.net/train-timetable/28031?date=20261023
- Selected JR-Central Kisei portion (station indices 40→9):
  新宮 06:20 departure; 熊野市 06:39 / 06:40;
  尾鷲 07:07 / 07:07; 紀伊長島 07:28 / 07:29;
  三瀬谷 07:55 / 07:56; 多気 08:18 / 08:19.
- **Inbound** SQL direction. The full train later takes the
  Ise Railway / Kansai route to Nagoya. That continuation is *not*
  stored under KiseiCentral as invented in-line stops. No Taki
  terminus is asserted for the physical service.

## Taketoyo (武豊線)

- `5861F` (区間快速 名古屋行), **土曜・休日運転** source:
  https://timetable.jr-odekake.net/train-timetable/111801?date=20260915
- 2026-Nov source-number and departure cross-check:
  https://timetable.jr-odekake.net/line-timetable/2248?arv_node=&day=1&dep_node=&hour=&index=&min=&month=11&year=2026
  (number `5861F`, 武豊 20:26, Sunday 2026-11-01).
- Selected segment on Taketoyo only (canonical station 9→0):
  武豊 20:26 departure; 半田 20:32 / 20:32;
  亀崎 20:39 / 20:40; 東浦 20:44 / 20:44;
  大府 20:56 / 20:59.
- **Inbound** SQL direction, `Rapid` train type. After Obu
  the train continues to Nagoya on another railway line; do not mix
  that continuation into Taketoyo. November 2026 Saturdays, Sundays
  and 11/03 + 11/23 public holidays only (11 days), not Weekday.

## Limits and rights

This text contains a few independently selected factual observations,
station-ID normalization and verification commentary, not a copy of the
publisher's complete line timetable. The original publisher of timetable
data is Kotsu Shimbunsha (交通新聞社); JRおでかけネット forbids unauthorized
wholesale redistribution, copying, or transformation of its timetable.
No blanket licence from that publisher is claimed. This project's
narrow original fact selection is recorded here for audit, and source
attribution must remain. Do not bulk copy the train-timetable pages.

The data imported into SQL will contain **only these selected stops**;
missing intermediate timetable events are not invented. SQL stores
planned train numbers, station times, date sets and provenance, not
observed train positions or actual formations. This is **sampled** data,
not full-day/full-route acceptance. Do not auto-assign a PNG based on
service name, engine class or real train number without a matching
number-scoped PNG pool.
