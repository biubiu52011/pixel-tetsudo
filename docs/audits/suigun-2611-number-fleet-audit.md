# 水郡線 2611 — main line + 常陸太田 branch number / model / calendar audit

## Official sources
- JR East 2611 [243d1 weekday down](https://timetables.jreast.co.jp/2611/timetable-v/243d1.html), [243d2 holiday down](https://timetables.jreast.co.jp/2611/timetable-v/243d2.html), [243u1 weekday up](https://timetables.jreast.co.jp/2611/timetable-v/243u1.html), [243u2 holiday up](https://timetables.jreast.co.jp/2611/timetable-v/243u2.html).
- JR East [KiHa E120 / E130](https://www.jreast.co.jp/train/local/kiha_e130.html) official network listing confirms the Suigun line; Suigun's standard passenger fleet is **キハE130系0番台**, not KiHa110, nor E130 100 (Kururi) or 500 (Hachinohe).
- JR East [maintenance notices](https://www.jreast.co.jp/suspend/): Nov 10–12 partial suspension 磐城石川–安積永盛; Nov 17–19 常陸大子–磐城石川. No replacement buses/taxis.
- [9821D official Kazekko outbound](https://timetables.jreast.co.jp/2611/train/185/188641.html) and [9822D inbound](https://timetables.jreast.co.jp/2611/train/185/188651.html): November **14–15**, 09:40 Mito→11:12 Hitachi-Daigo and 16:14 Daigo→17:46 Mito; rapid sightseeing trolley, not a regular KiHa E130 model.

## Historical sources and exact exclusions
Old SQL `public.manual_timetable_templates` preserves 218 rows:
- Main line `Suigun`: 76 Weekday + 86 SaturdayHoliday.
- Branch `SuigunBranch` (上菅谷–常陸太田): 26 Weekday + 30 SaturdayHoliday.

Both imported old generic `キハE130系 / キハ110系` even though no regular KiHa110 mapping is justified on Suigun. The new `published_suigun_2611_fleet_scope` contains **215** source rows; source keys and station clocks are not rewritten. It quarantines three obsolete duplicate train-time records:
- 9821D source ID **65703** old 09:40–11:51 (official 09:40–11:12 is ID **65702**).
- 9822D source ID **65797** old 15:05–17:21 (official 16:14–17:46 is ID **65799**).
- 341D SaturdayHoliday source ID **65727** partial 20:32 extension; official 11/22 has a different departure clock, so the 11/22 341D historic full stop estimate is also suppressed rather than plotting wrong times. All historic rows remain in SQL.

### Dated variants
- **9329D** source occurrence 0 runs November 10–12 from Iwaki-Ishikawa toward Asaka-Nagamori; occurrence 1 runs November 17–19 from Hitachi-Daigo to Iwaki-Ishikawa. Never merge those same-number, date-disjoint paths.
- **9324D** November 17–19 (maintenance supplement).
- **8325D/8326D** November 1–3, 7–8, 14–15, 21–23, 26–30 only.
- **9841D** November 21 only.
- **9821D/9822D** November 14–15 only, public type corrected to Rapid *in API projection*. Those two dated references carry NO candidate model, NO PNG, and no actual carset assertion.
- **341D** SaturdayHoliday November 22 is omitted because the manual clock lacks the official time override; no fabricated replacement timetable is invented.

## Data/architecture
- `data/timetables/jreast-suigun-2611-number-index.js` owns the exact public-number candidate list separately for main and branch, weekday/holiday, direction and date; existing `TrainNumberPngRanges.match` is reused, preserving earlier line-specific adapters.
- Existing `vehicle-garage-png-map.js` and `js/train-vehicle.js` grant the KiHa E130 0 PNG to the previously missing `SuigunBranch` scope; no changes to Kururi/E130 100 or Hachinohe/E130 500 assets.
- `scripts/page-scripts.json` remains the canonical loader authority with `Suigun|SuigunBranch` lazy scopes; the page script SHA query is synchronized with code.
- `supabase/functions/train-runs/index.ts` uses the 215 row source-template whitelist with expected 76/83 main and 26/30 branch per calendar; date scopes reject unlisted/off-day/obsolete records **before** supplying position estimates. Unknown source rows fail closed. The service name/type of real Kazekko is projected separately from physical vehicle identity.
- `tests/suigun-2611-number-fleet.test.cjs` and `tests/suigun-2611-edge-calendar.test.cjs` cover exact routing, dated extras, maintenance split, no spurious PNG and regression for other adapters.

**Limitations:** This repairs the *existing* sparse/historical manual sources and does not claim every official 2611 train, especially missing weekday 324D/329D/328D segments, is now generated. Stop clocks were not revalidated for every one of the 215 rows. A service number never identifies the day's actual vehicle formation. Separate daily operation disruption sources may still be needed.
