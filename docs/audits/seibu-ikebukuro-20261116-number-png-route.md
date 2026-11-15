# Seibu Ikebukuro line / train PNG audit repair (2026-11-16)

## Corrections
- Canonical Ikebukuro line now lists Ikebukuro -> Hanno -> Higashi-Hanno -> Koma-Seibu -> Musashi-Yokote -> Higashi-Agano -> Agano; Seibu Chichibu begins at the shared Agano boundary.
- Koma-Seibu deliberately differs from historical JR Hanawa `Koma` (好摩). Do not merge the two keys. `Higashi-Hanno` is the existing shared JR Hachiko / Seibu interchange.
- Hanno coordinates corrected to 35.85101,139.31906 (previous 139.4231 was off by ~9 km). New points are approximate station-center coordinates for map display only; not survey control points.
- The map's `durations` remain schematic, NOT verified individual-train stopping times. Five newly added edges use a single published timetable example of 2/6/4/6/4 minutes; no train-run stop times have been invented.
- Remove the retired 2000 series from *current* Ikebukuro/Toshima/Sayama route candidates and avoid 9000 series Ikebukuro false eligibility; images remain in the gallery and historical sources are retained.
- 7000 series is a fleet *candidate*, only after 2026-06-27 for Sayama and 2026-09-12 for the verified western Hanno–Agano/Seibu-Chichibu corridor. An Ikebukuro local reference requires at least two independently supplied stations entirely inside the western section; it does not select a single PNG.
- Existing 001 Laview and 40000 S-TRAIN planned vehicle mappings remain authoritative. No direct numbered PNG assignments were inferred for commuter services.

## Outstanding (do not silently promote)
- SQL: 2088 Ikebukuro historical timetable records, all `undated_not_current_verified` as of audit. The source path `data/timetables/Ikebukuro-manual.js` no longer exists on main. This migration does not falsely mark them verified.
- No evidence-backed complete public numeric train-number -> physical formation/paint roster. `SII...`, `SIO...`, `SITU...` appear to be stored source/internal identifiers; do not turn them into blanket fleet-based PNG ranges.
- This repair does not overwrite historic `train_timetable_vehicle_mappings`, actual vehicle observations or source clocks.

## Evidence
- Official station order: https://www.seiburailway.jp/railway/station/higashi-hanno/ ; https://www.seiburailway.jp/railway/station/koma/ ; https://www.seiburailway.jp/railway/station/musashi-yokote/ ; https://www.seiburailway.jp/railway/station/higashi-agano/
- Seibu 2000 (2025-10-15 end on Ikebukuro system): https://www.seiburailway.jp/file.jsp?id=25843
- Official Seibu 7000 fleet info: https://www.seiburailway.jp/railway/encyclopedia/7000/
- Western service extension announcement/reports (2026-09-12): https://www.tetsudo.com/news/4202/
- Sample Hanno–Agano station arrival times: https://transit.yahoo.co.jp/search/result/%E9%A3%AF%E8%83%BD-%E5%90%BE%E9%87%8E
- Seibu 9000 4-car Tamako configuration: https://www.seiburailway.jp/railway/encyclopedia/9000/

## Verification
`node --test tests/seibu-ikebukuro-202611-audit.test.cjs`
`node data/core/generate-all.js --check`
`node scripts/sync-page-scripts.cjs --check`
