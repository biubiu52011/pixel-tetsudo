# Seibu P-10: 5 PNG number-band audit — 2026-11-21

## Result

- Audited all five fixed P-10 PNGs.
- Added **zero** train-number ranges and **zero** first-covered PNGs.
- All five remain `no_verified_number_mapping`. Official Seibu sources verify
  model, route and formation/livery identity, but publish no reusable public
  train-number -> physical formation/livery crosswalk for these assets.
- `第1編成` and `第2編成` are formation ordinals, not train numbers.

## L00 identity correction

1. `西武鉄道_L00系_れおけい.png`
   - The navy body matches the officially announced FY2026 second-formation
     design inspired by Seibuen Amusement Park's night sky, fireworks and
     illuminations.
   - It is therefore no longer registered as generic `西武L00系` artwork. It
     remains a planned, formation-specific review asset.
2. `西武鉄道_L00系_第1編成_埼玉西武ライオンズ.png`
   - Official Seibu material identifies the white Lions design as the first
     formation, placed in service on 2026-03-27.
   - It remains formation-specific review artwork and is not promoted from a
     bare `L00系` model label.
3. Generic `西武L00系`
   - Retains the official Yamaguchi Line model identity but now has no default
     asset. A model-only source cannot guess either formation livery.

## Other three PNGs

- `7000系`: official fleet and dated route eligibility are known, but there is
  no complete public train-number-to-formation roster.
- `8500系`: remains part of the mixed transition fleet while L00 replaces all
  three formations through FY2027; an old single-type timetable label is
  already quarantined and cannot select a PNG.
- `9000系`: official sources confirm the four-car one-man fleet on the Tamako
  Line, not a public train-number-to-formation mapping.

## Official sources

- 7000 series: https://www.seiburailway.jp/railway/encyclopedia/7000/
- 8500 series: https://www.seiburailway.jp/railway/encyclopedia/8500/index.html
- 9000 series: https://www.seiburailway.jp/railway/encyclopedia/9000/
- L00 series: https://www.seiburailway.jp/railway/encyclopedia/L00/
- L00 first-formation service start / second-formation design:
  https://www.seiburailway.jp/newsroom/news/20260305_LEOLINER/
- L00 first-formation departure ceremony:
  https://www.seiburailway.jp/newsroom/news/20260327_LEOLINER/

## Validation

```sh
node --test tests/private-p10-seibu-five-png-audit.test.cjs
node tools/vehicle-garage-png-map.test.cjs
node tools/build-png-to-train-number-index.cjs --check
node tools/build-train-number-png-catalog.cjs --check --strict
node scripts/sync-page-scripts.cjs --check
```
