# Seibu line symbols, route colors and Akitsu identity — 2026-11-16

## Canonical fixes
- All twelve Seibu routes now have consistent `line.color` and `line.presentation.color`. These HEX values are the **site palette**, not a claim that the operator has officially published the exact CSS hex values.
- Official **station-number family symbols**, not unique per-route IDs, are used in both `code` and `presentation.code`: SI (Ikebukuro, Seibu Chichibu, Yurakucho, Toshima, Sayama), SS (Shinjuku, Haijima), SK (Kokubunji, Seibuen), ST (Tamako), SY (Yamaguchi), SW (Tamagawa). Underlying `lineId` still disambiguates routes. Source ODPT route IDs are unchanged.
- Ikebukuro route facts: `routeLengthKm: 57.8`, `operatingPrefectures: ['Tokyo','Saitama']`. `region: 'Saitama Area'` remains an existing **UI filter grouping**, not a claim that the route only serves Saitama; replacing the grouping string would break the stable area taxonomy.
- Existing map durations are schematic. `durationTotalMin` is corrected to their 72-minute sum from 77, with `durationBasis: 'schematic_not_official_timetable'`. **Do not present that as an official travel time.**
- Source URNs such as `odpt.Station:JR-West.Kure.Akitsu` are translated only when scoped to `Kure` via `RuntimeConfig.STATION_ALIAS_BY_RAILWAY`; both route search and timetable-position normalization consume that existing ownership table. The raw source URN remains unchanged.
- Original Seibu Ikebukuro `Akitsu` retains its Tokyo coordinates and route membership. JR West Kure Line **安芸津** now has independent canonical key `Akitsu-Kure`, its own Hiroshima coordinates and i18n. `name_map['安芸津']` and Kure station index 8 point to the new key. Existing original JR-West Kure timetable station URNs are source-qualified and intentionally unchanged.
- Seibu 秋津 ↔ JR 武蔵野線 新秋津 is an **out-of-gate** physical transfer: approximately 400 m between gates / 8 minutes including platform walking. Represented symmetrically in transferStations with distinct station IDs; neither line merges stations.
- Nishi-Tokorozawa / Sayama Line reciprocal line transfer declarations are now explicit.

## Sources
- Official station navigation and SI route family: https://www.seiburailway.jp/railway/station/
- Tokyo's station-numbering guide groups Seibu Ikebukuro/Chichibu/Yurakucho/Toshima/Sayama as orange SI, Shinjuku/Haijima as SS and Kokubunji/Seibuen as SK: https://www.sangyo-rodo.metro.tokyo.lg.jp/documents/d/sangyo-rodo/df0cd6e03f9dbb7e80d2f37a30eb4eb3_2
- Seibu official route kilometers (Ikebukuro 57.8 km, Chichibu 19.0, Yurakucho 2.6, Toshima 1.0, Sayama 4.2): https://www.seiburailway.jp/file.jsp?company%2Fyouran%2Ffile%2Fyouran2022_gaiyo_230401.pdf=
- JR East / Seibu 2026-05-19 Akitsu/Shin-Akitsu out-of-gate transfer distance and minutes: https://www.jreast.co.jp/press/2026/20260519_ho01.pdf
- JR West Kure-line 安芸津 station coordinate approximate station point: https://mapfan.com/spots/SCH%2CJ%2CF1W

## Test scope
`node --test tests/seibu-ikebukuro-202611-audit.test.cjs`
`node --test tests/station-identity-ambiguity.test.cjs`
`node data/core/generate-all.js --check`
`node scripts/sync-page-scripts.cjs --check`

No guessed train-number -> PNG mapping, no historical timetable validity promotion, no modification to published ODPT station URNs.
