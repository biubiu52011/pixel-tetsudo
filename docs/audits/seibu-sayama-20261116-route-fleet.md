# Seibu Sayama Line — route / 2026 fleet / historical SQL correction (2026-11-16)

## Canonical route and handover
- Canonical `Seibu_Sayama` is SI18 Nishi-Tokorozawa → SI40 Shimoyamaguchi → SI41 Seibu-Kyujō-mae, 4.2 km, official SI orange family.
- Three stations have two edges. Remove the third orphan `2`; `durations=[2,2]`, `durationTotalMin=4`, and `durationBasis=schematic_not_official_timetable`. **4 minutes is not a verified whole-line public timetable or per-train position measurement.**
- The verified junction is Nishi-Tokorozawa with the Ikebukuro Line. Add symmetric `throughServices` and `serviceBoundaries`, scoped to **source-correlated** through runs. Never join all source rows just because the two lines share a station.
- At Seibu-Kyujō-mae the Leo Liner (Yamaguchi Line) is a transfer, **not a shared track/through-operated train**.

## Single authority for car-family references
- The former `js/train-vehicle.js` `Seibu_Sayama` fallback copied four model families and dropped 101 entirely, bypassing the dated 7000 filter. Removed this duplicate so `MajorVehicleFleetPresets.lookup` is the sole reference-fleet authority.
- 101 series is an active official fleet in **Sayama and Tamagawa** as of 2026-10-01 (four-car roster), so restore the route candidate. Do NOT promote `西武鉄道_101系.png` from `plannedAsset` to canonical; the gallery currently does not approve the appearance.
- 7000 four-car series entered Sayama **2026-06-27**; earlier or undated service evidence must not admit it.
- 20000/30000/40000 50 subseries are route candidates for 8-car event/through service; 10-car evidence narrows to 20000/30000 only. When the count is absent, the *fleet reference* stays an ambiguous set and selects **no vehicle PNG**. Do not infer count from the internal train ID or train class.
- For SQL fallback, only `timetableDateVerified === true` can forward a date to the 7000 reference filter. Historical “today” projections are not actual dated source proof. This rule does not certify an individual formation.
- Images: allow the existing **model** artwork on Sayama for 7000, 20000, 30000, and Laview 001 on sourced specials; preserve 101 as planned-only and 40050 green band as pending review. Do not create train-number PNG ranges.

## Special Dome 92 (not an ordinary SQL train)
- Official Seibu bulletin: on **2026-11-28**, LIONS THANKS FESTA `ドーム92号`, Laview 001-series planned model, Seibu-Kyujō-mae **17:32** → Tokorozawa **17:42** → Ikebukuro **18:09**.
- These are three published departure/arrival anchors, not a complete station-by-station timetable. Do not synthesize Nishi-Tokorozawa or Shimoyamaguchi clock values, train run records, per-minute positions, or a verified physical carset. The Laview model PNG scope is granted only when a verified train-specific source resolves the model.
- Other 2026-11-28 temporary express/rapid trains have departure times posted on event screens only; no fabricated clock entries.

## Historical SQL preserved (not promoted)
- 262 `manual_timetable_templates`, 130 SAI and 132 SAO IDs; all 262 associated `train_timetables` have `timetable_validity=undated_not_current_verified`.
- 258 candidate-label rows `7000系 / 101系 / その他の西武通勤車（直通・イベント列車）`; four Saturday/holiday inbound SemiExpress records have no model label.
- Every one of 262 templates has 3 stop records but the final record's clock is a `departure_clock`, **not** a verified terminal `arrival_clock`; none has a final arrival clock. Do not automatically promote those times as final-arrival or individual-train current running times.
- `SAI...` / `SAO...` are original internal identifiers, not official Seibu public train numbers. No new actual formation/PNG, running dates, or claimed 2026-11 timetable coverage is authorized.
- The SQL data remains unchanged; all fixes here are canonical route data, fleet scope and UI/runtime guards.

## Official evidence
- Seibu official 101 roster (2026-10-01): https://www.seiburailway.jp/railway/encyclopedia/101/
- Seibu 7000 start 2026-06-27: https://www.seiburailway.jp/railway/encyclopedia/7000/
- Seibu Sayama one-man notice (4-car vs 8/10-car): https://www.seiburailway.jp/file.jsp?id=27516
- Stations/through destination: https://www.seiburailway.jp/railway/station/seibukyujo-mae/
- Nishi-Tokorozawa interchange: https://www.seiburailway.jp/railway/station/nishi-tokorozawa/
- Official Dome92 notice: https://www.seiburailway.jp/railway/reservedtrain/temporarytrain/13228/
- Official extra 2026-11-28 trains (times unconfirmed until event): https://www.seiburailway.jp/railway/reservedtrain/temporarytrain/23111/

## Regression
```sh
node --test tests/seibu-sayama-202611-route-fleet.test.cjs
node --test tests/seibu-ikebukuro-202611-audit.test.cjs
node tools/train-major-fleet-presets.test.cjs
node data/core/generate-all.js --check
node scripts/sync-page-scripts.cjs --check
```
