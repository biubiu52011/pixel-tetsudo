# 中央線・総武線各駅停車 — 2611 train-number-only mapping

## Authority: actual public train number, NOT 運用番号

The JR-East ODPT live position entity is keyed by its complete train number:
`odpt.Train:JR-East.ChuoSobuLocal.662B`. The user-facing number is
`662B`, not the 63B working-number label from a separate operations roster.

JR-East official November 2026 timetable (659u1) lists 662B among the
weekday Chuo-Sobu local trains:
https://timetables.jreast.co.jp/2611/timetable-v/659u1.html

For the timetable's B/C local trains the existing historical SQL has
- Weekday: **483** full B/C source train numbers.
- SaturdayHoliday: **429** full B/C source train numbers.
- Numeric min/max: **402..2499** in both calendars.

These source totals are historical **not** an independently certified
edition-2611 train-by-train roster. The numeric interval is only a
realtime-source input bound; it **does not** assert that every number in the
interval runs or exists. Actual live train existence comes from the exact
JR-East ODPT entity plus train number, direction, date and source railway.

## Single source of truth (frontend)

- `data/timetables/train-number-png-ranges.js` now owns the
  `matchChuoSobuLocalBCLiveNumber(position)` admission rule.
- `js/train-vehicle.js` consumes that result and **only** selects an
  `illustrative: true` SVG train-front marker; it contains no duplicate
  B/C or working-number parsing logic.
- The output expressly carries `authorizesPNG: false`,
  `actualVehicleConfirmed: false`, `model: null`, `formationId: null`,
  and `referenceOnly: true`.
- The yellow E231-500 image is **only the line fleet illustration**; it
  must not appear as an actual trainset assignment. The candidate mixed
  fleet is E231-500, E231-0, and E235-0 (the latter not a claim of daily
  passenger-service assignment).
- `data/timetables/train-number-png-ranges.js` exact number -> PNG
  matching remains separate and fails closed for B/C actual-car claims.
- Existing Y/A/K/S Tozai exact train-number crosswalk remains separate.
- `js/trains-render.js` marks illustrative SVG images with
  `data-marker-illustrative="mixed-line-fleet"` and retains
  `data-vehicle-unresolved="true"`.

## Deprecated historical provider

The old `63B`-style operating-number/vehicle snapshot formerly in
`js/train-vehicle.js` has been archived at
`docs/audits/chuo-sobu-2026-legacy-operation-snapshots.txt`.
Its historical day and calendar-majority model labels **must never be
attached to today's 662B/663B as observed actual rolling stock**.

To make a model-specific E231-500 number->PNG mapping in future, require a
dated, independently traceable record that explicitly identifies the
same JR train number and actual model/formation, within the same service
date and line. The working number is optional research metadata, not a
join key for ODPT's real-time train identity.

## Regression tests

`tests/chuo-sobu-local-2611-source-scope-and-e235-fleet.test.cjs` checks
- Live 662B enters number-scope as a reference-only illustration.
- No operation-only 63B snapshot may produce an actual model.
- A date-specific, full-number 662B evidence record can be resolved.
- Out-of-range, wrong-source, wrong-date, wrong-direction, and wrong-line
  B/C-like numbers are rejected.
- The actual 662B entity and existing JR/Sobu/Tozai ownership are
  unaffected by the reference-image display.
