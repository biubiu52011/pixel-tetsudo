# Tobu Kinugawa line and PNG mapping audit — 2026-11-15

## Canonical identity
- `Nikkoku` is the existing internal ID of **東武鬼怒川線 / Kinugawa Line**, not `TobuNikko`.
- Official passenger code **TN**; unified canonical/display color **#ffa600**.
- Nine stations, eight edges, 16.2 km from 下今市 (TN23) to 新藤原 (TN58).
- 下今市 has a timetable-limited `TobuNikko` service boundary. 新藤原 physically connects to 野岩鉄道会津鬼怒川線, but no Yagan line object exists in this repository. Do not create a false `throughServices` line ID.

Official sources: https://www.tobu.co.jp/railway/guide/line/kinugawa_line.html and https://www.tobu.co.jp/corporation/rail/route/

## Timings
Previous `durations` were nine uniform two-minute values for only eight adjacent edges. Replaced with [3,5,5,5,1,4,4,4] (31 minutes) based on **one** publicly listed local trip with 2026-11-14 20:06 departure from 下今市. These are arrival-clock deltas, including dwell, **representative only**. They are *not* validated against every train in an official November 2026 local timetable, and do not identify a live train's actual position. Canonical `sourceQuality` flags the estimate.

Trip reference: https://transit.yahoo.co.jp/search/result/%E4%B8%8B%E4%BB%8A%E5%B8%82-%E6%96%B0%E8%97%A4%E5%8E%9F

## Vehicle references
- **20400型**: actual regular-service line fleet; one existing PNG added to `Nikkoku` canonical and garage scopes. A strict `Nikkoku` / `odpt.Railway:Tobu.Kinugawa` / Tobu / Local / November 2026 / scheduled-estimate gate allows it only as **fleet illustration**, never the physical identified carset. Synthetic test numbers are *not* timetable observations.
- **500系**, **100系**, **N100系**: gallery permits these on Kinugawa where separately evidenced. No generic express number range was added; no borrowing a TobuNikko service simply because the train number matches. **JR253系1000番台** retains its existing scoped permission.
- The inherited Kinugawa regular-fleet candidate list no longer includes unsupported **10000/10030**; `TobuNikko` and other line scopes remain as they were.
- Wrong date, operator, source railway, position/display line, type, physical-identity flag, or conflicting vehicle plan fails closed.
- No implicit handling of SL大樹 carset/operating dates: those need their own evidence.

Vehicle references: https://www.tobu.co.jp/corporation/rail/vehicles/ ; https://www.tobu.co.jp/railway/special_express/vehicle/ ; https://www.tobu.co.jp/pdf/timetable/2026/time-table_01_kudari.pdf

## Repro
```sh
node data/core/generate-all.js --check
node --test tests/tobu-nikko-2611-number-png.test.cjs
```

Generated JSON + `railway-data.file.js` synchronized with canonical source; four changed JS script hashes updated in `pages/trains.html`.

### Follow-up
Official local timetable edition import, Yagan route modeling and true physical formation identification remain separate tasks and must not be invented from topology alone.
