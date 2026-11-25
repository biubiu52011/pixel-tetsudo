# JR-Central planned timetable sample selection — Gotemba and Minobu (2611)

These are a narrow independently selected fact compilation, NOT a republished
or mirrored original full copyrighted timetable feed. All values below describe
*scheduled* trains; they are not observed trains or carset evidence. Attribution
to source edition remains required.

## Gotemba (御殿場線): plan 2570M, ordinary every day

- Source: JR West external individual train page (JR Times 2026 Nov edition):
  https://timetable.jr-odekake.net/train-timetable/155741?date=20261105
- The page lists the continuation of train 2257M Mishima–Numazu as **2570M**
  for **Numazu–Kozu**. Do not mix the two official train numbers or include
  the Mishima part of the trip in Gotemba.
- Selected normalized JR-Central Gotemba stations:
  - `Numazu` (line index 18), 19:19 dep
  - `JRC-Gotemba-015` (裾野, 14), 19:35 arr / 19:36 dep
  - `JRC-Gotemba-011` (御殿場, 10), 19:58 arr / 20:01 dep
  - `JRC-Gotemba-007` (山北, 6), 20:26 arr / 20:29 dep
  - `JRC-Gotemba-005` (松田, 4), 20:36 arr / 20:38 dep
  - `Kozu` (0), 20:54 arr
- Direction: `odpt.RailDirection:Inbound` in this project's canonical
  order (station_index decreases). `train_type=Local`.

## Minobu (身延線): plan 3642G, ordinary every day

- Source: JR West external individual train page (JR Times 2026 Nov edition):
  https://timetable.jr-odekake.net/train-timetable/266031?date=20261107
- Selected normalized JR-Central Minobu stations:
  - `Kofu` (line index 38), 18:46 dep
  - `JRC-Minobu-031` (東花輪, 30), 19:10 arr / 19:10 dep
  - `JRC-Minobu-026` (鰍沢口, 25), 19:32 arr / 19:38 dep
  - `JRC-Minobu-017` (身延, 16), 20:13 arr / 20:15 dep
  - `JRC-Minobu-008` (西富士宮, 7), 21:11 arr / 21:14 dep
  - `JRC-TokaidoCentral-009` (富士, 0), 21:36 arr
- Direction: `odpt.RailDirection:Inbound` in this project's canonical
  order (station_index decreases). `train_type=Local`.

## Rights and expected SQL state

The linked commercial publisher's 2026-11 timetable explicitly prohibits
unauthorized wholesale republication/copying/reformatting. This project only
independently selects a **very small** set of planned facts relevant to an
individual sample trip, labels original publisher/edition, and does not ingest
an entire line or route. This document's selected normalization, verification
notes and commentary are its original compilation; it does *not* assert a
licence to reproduce the publisher's full timetable.

Represent each `毎日運転` planned service with two disjoint finite
`operating_dates` sets: 19 Weekday days and 11 SaturdayHoliday days
during 2026-11, including 11/03 and 11/23 in holidays. Both sample trains
have six selected scheduled stop events, no invented intermediate events.
No model/PVG number range or actual vehicle/formation is inferred.

Current acceptance must remain **sampled**, not full-day verified or
all-stops complete. Sources are individual 2026-Nov planned services.

## Minobu follow-up — 2026-11-25

The November JR East published line tables show these aggregate train-column counts
(not a republished timetable or an assertion of actual operation):

| Calendar | Inbound (Kofu to Fuji) | Outbound (Fuji to Kofu) | Total | Fujikawa |
|---|---:|---:|---:|---:|
| Weekday | 70 | 71 | 141 | 14 |
| SaturdayHoliday | 67 | 68 | 135 | 14 |

Source tables: https://timetables.jreast.co.jp/2611/timetable-v/109u1.html,
https://timetables.jreast.co.jp/2611/timetable-v/109u2.html,
https://timetables.jreast.co.jp/2611/timetable-v/109d1.html,
https://timetables.jreast.co.jp/2611/timetable-v/109d2.html.

- SQL currently has one inbound sample per calendar (3642G), no outbound or
  limited-express plan. Two exact November train-number-only evidence rows were
  registered in `published_train_number_evidence`, without changing stop clocks
  or calendar scope. The source itinerary remains six selected stops.
- `published_railway_planned_fleet_model_scope` now records Fujikawa 373 series,
  representative three cars, as a route/service fleet model candidate, not a
  train-specific PNG mapping or actual formation. Model/route references:
  https://www.n-sharyo.co.jp/business/tetsudo/pages/jrc373.htm,
  https://www.jr-plus.co.jp/news/2026/04/000711/,
  https://www.jr-plus.co.jp/news/2025/10/000563/.
- Existing TokyoGTFS railway feed explicitly covers JR Central only on Gotemba
  and Tokaido up to Numazu (https://mkuran.pl/gtfs/); it cannot supply Minobu.
- Full-day acceptance remains blocked. Neither date-verified sample nor exact
  number evidence establishes a complete timetable or individual vehicle identity.
  Do not bulk-import the commercial published table or assign a generic 313-series
  image based solely on a G suffix. The existing authorized importer is the
  intended route for an independently licensed complete dataset.

## Minobu additional independent sample — Fujikawa 3 (4003M), 2026-11

This is a narrowly selected three-anchor factual sample, not a copy of a full
commercial timetable or a complete stopping pattern. The public number 4003M
and limited-express service appear on both November regular line diagrams:
https://timetables.jreast.co.jp/2611/timetable-v/109d1.html and
https://timetables.jreast.co.jp/2611/timetable-v/109d2.html.
Independent journey cross-checks:
- Fuji departure 10:15 and Minobu arrival 11:09:
  https://wwwjp.jorudan.com.cn/time/to/%E5%AF%8C%E5%A3%AB_%E8%BA%AB%E5%BB%B6/?r=%E3%81%B5%E3%81%98%E3%81%8B%E3%82%8F
- Minobu departure 11:10 and Kofu arrival 12:05:
  https://www.jorudan.co.jp/time/to/%E8%BA%AB%E5%BB%B6_%E7%94%B2%E5%BA%9C/?r=%E3%81%B5%E3%81%98%E3%81%8B%E3%82%8F
- Date-edition cross-check of regular October 2026 service:
  https://jr-group.jp/fujikawa-timetable/ (regular service, not actual dispatch).
- SQL scope: Fuji (index 0) to Kofu (38), Outbound; only the Minobu segment,
  no invented Shizuoka–Fuji continuation or intermediate stop clocks.
- The weekday/holiday November dates represent the published regular plan,
  not observed operation. Model is a 373-series representative reference only.
- This original selection of factual anchors does not claim permission to
  reproduce a full line timetable. Coverage remains sampled and must not be
  accepted as a complete daily or all-stops schedule.

### 4003M follow-up: single-service stopping-pattern reconciliation

The 4003M sample is expanded in place from three anchors to the eleven passenger
stops on Minobu between Fuji and Kofu, using independently cross-checked
scheduled facts from the November weekday/holiday diagrams and journey
references. The original three anchors and 30 explicit operating dates are
preserved; intermediate arrival clocks not separately confirmed remain null.
West Fujinomiya is a passing station on this service. No through segment,
actual dispatch, individual formation, or full-day roster is inferred.

Cross-checks: https://timetables.jreast.co.jp/2611/timetable-v/109d1p.html,
https://timetables.jreast.co.jp/2611/timetable-v/109d2p.html,
https://jr-group.jp/fujikawa-timetable/,
https://transit.yahoo.co.jp/search/result/%E4%B8%8B%E9%83%A8%E6%B8%A9%E6%B3%89-%E9%9D%99.
The last two are third-party journey references, not operator publications.
This is a single train-specific factual verification, not a reproduction of
all daily timetable columns. The complete line remains unaccepted.

### Full-day source availability recheck (2026-11-25)

- The Yamanashi regional GTFS and Minobu municipal feeds describe bus routes,
  not JR Central Minobu rail: https://gtfs-data.jp/search?target_feed=org1%2Arosenbus.
- JR Central's March 7, 2026 update publishes date-specific station schedules
  and scheduled clocks for individual trains: https://jr-central.co.jp/news/release/_pdf/000044764.pdf.
  Access to the historical JSON endpoint referenced by the earlier October
  evidence was not verified on this date; no recurring plan or reuse license
  is inferred from the official website's availability.
- Transit API advertises a public CORS-enabled API and a license catalog
  (https://api.transit.ls8h.com/), but its feed list and JR data acquisition
  statement could not be retrieved in this audit. Minobu coverage and
  republication rights are unverified; do not activate it as a data provider.
- Commercial timetable licensing route: https://www.kotsu.co.jp/service/jikoku_solution/data_sales/.
