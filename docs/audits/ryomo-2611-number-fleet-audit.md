# 両毛線 2611 列車番号 → 車両参考図

## Authority and classification
JR East official 2026-11 両毛線 public-number tables:
- Weekday upward: https://timetables.jreast.co.jp/2611/timetable-v/237u1.html
- Holiday upward: https://timetables.jreast.co.jp/2611/timetable-v/237u2.html
- Weekday downward: https://timetables.jreast.co.jp/2611/timetable-v/237d1.html
- Holiday downward: https://timetables.jreast.co.jp/2611/timetable-v/237d2.html
- JR East 211 fleet line: https://www.jreast.co.jp/train/local/211.html

The original `Ryomo` manual source had 234 template records / 123 distinct public train numbers; all 234 source candidate labels incorrectly said `E231系1000番台 / E233系`.

Verified roster scope (including repeated source segments):
- 206 records / 101 regular M numbers for each calendar: planned 211 (Takasaki district) *line fleet illustration*, not a carset claim.
- 25 records for E/Y through trains and the green-car M exceptions 1621M, 832M (weekday only), 852M: mixed E231-1000 / E233-3000, display one explicitly illustrative E233-3000 image.
- 3 historical holiday records 9482M, 9484M, 9486M remain in manual source but are omitted by November 2611 Edge projection. Their labels are cleared; no invented 2026-11 service.
- The official 9046M/9049M special limited expresses are NOT November regular trains, never admitted by this index.

No conversion of public train number into working number, no 211 by M suffix alone, no physical vehicle identity upgrade. All output images are referenceOnly and illustrative, even for model-specific regular 211.

## Ownership and dependencies
- `data/timetables/jreast-ryomo-2611-number-index.js` owns exact public number, calendar, direction and train type admission.
- `js/train-vehicle.js` consumes the index and verifies model PNG belongs to the `Ryomo` garage scope.
- `supabase/migrations/20261106200000_ryomo_2611_official_train_number_fleet_scope.sql` owns exact source-template/calendar role and fixes candidate labels without editing clocks, IDs or original source paths.
- `supabase/functions/train-runs/index.ts` enforces the same DB source scope for 2611 planned positions and rejects three historical rows.
- `tests/ryomo-2611-number-fleet.test.cjs` covers 211/mixed, old rows, scope, model honesty and HTML asset fingerprints.

JR official printed tables also contain day-specific timetable amendments; this mapping verifies *train number and illustrative fleet role*, not all imported stop clocks. DO NOT set `timetable_date_verified=true` without separate stop-time evidence.
