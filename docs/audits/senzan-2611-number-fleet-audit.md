# 仙山線 2611 — full public number and planned fleet review

Official evidence:
- JR 265 down weekday/holiday: https://timetables.jreast.co.jp/2611/timetable-v/265d1.html and 265d2.html
- JR 265 up weekday/holiday: https://timetables.jreast.co.jp/2611/timetable-v/265u1.html and 265u2.html
- JR East E721 official fleet: https://www.jreast.co.jp/train/local/e721.html
- November 2026 SATONO dates: https://media.jreast.co.jp/articles/6686
- 9821D/9822D December only: https://timetables.jreast.co.jp/2611/train/175/177811.html

## Scope
Historical SQL: 214 records across two service calendars, 108 distinct public train numbers; original labels were all `E721系 / 701系` even on HB-E300 SATONO and December-only KiHa110 special.

The new `published_senzan_2611_fleet_scope` lists 212 source rows: 208 regular M records (104 distinct M numbers per calendar), plus 4 SATONO D records (8821D/8822D in two calendars). Two December-only Omoide numbers, 9821D/9822D, have no November reference picture. A separate audit table records the corrected four old SATONO `Local` → official `Rapid` labels.

Senzan now uses the existing `TrainNumberPngRanges.match` entry point, extended by `jreast-senzan-2611-number-index.js` with exact month/number/source/line/direction/type checks. The map returns planned-reference PNGs for E721 and on published dates HB-E300 SATONO. The E721 reference does not identify 0/1000 subseries and the SATONO image does not identify today's physical set.

## Date-scoped backend projection
`supabase/functions/train-runs/index.ts` now looks up the 106 scoped source records for the requested service calendar before publishing Senzan positions. It rejects historical 9821D/9822D entries on all November dates, rejects 8821D/8822D SATONO on unlisted operating dates, and removes unknown number/source/direction rows rather than publishing neutral phantom train markers. The service calendar and original run ID remain intact; the backend marks all fleet candidates as unconfirmed. A failed or incomplete roster causes the API to fail closed rather than fall back to historical trains.

The 104 regular M numbers per calendar remain **planned train references** based on the imported stop clock sequence; stop clocks have not been independently certified for November 2026. Only the operating date/number scope is checked, not actual same-day running status. `tests/senzan-2611-edge-calendar.test.cjs` exercises the branch with representative records, wrong dates and missing scope.

No timetable clock or actual physical train identity was certified by this change. `actual_vehicle_confirmed=false` is retained throughout.
