# Seibu P-09: 15 PNG number-band audit — 2026-11-21

## Result

- Audited all 15 fixed P-09 PNGs.
- Added **zero** train-number ranges and **zero** first-covered PNGs.
- All 15 remain `no_verified_number_mapping`: Seibu's public timetable and
  fleet pages identify services or eligible model groups, but do not publish a
  complete train-number -> physical formation/livery crosswalk for these PNGs.
- Route fleet candidates remain references only. Internal historical IDs such
  as `SII*`, `SIO*`, `STOO*`, `SAI*` and `SAO*` are not public train numbers.

## Artwork identity corrections

1. `西武鉄道_40000系_トキイロ.png`
   - The filename is retained for the stable 601-PNG inventory.
   - Official Seibu material defines Tokiiro as a new vehicle planned for spring
     2027, replacing 10000-series service. No series number is published and it
     is not a 40000-series livery.
   - Canonical label is therefore `西武トキイロ（形式未公表・2027年春予定）`.
     It stays `asset:null`, planned-only and unselectable.
2. `西武鉄道_2000系_ツートンカラー.png`
   - The official yellow/beige two-tone design-train description applies to
     101 series, not 2000 series.
   - The legacy filename is preserved, but the asset is explicitly quarantined
     as a model-label conflict and cannot be promoted by a model match.

## Per-group decision

- Current generic model illustrations (101, 20000, yellow 2000, 30000, blue
  40000, white 4000 and Fukutoshin-ready 6000): no number-to-formation roster;
  keep number mapping empty.
- Special or livery-specific illustrations (Red Arrow Classic, two-tone,
  110th-anniversary 2000, Tokiiro, red-band 40000, 4017F E851 revival,
  green-band 40050 and standard 6000): model/livery facts do not identify a
  stable public train number. Keep them review-only or planned-only.
- Red Arrow Classic is a 10000-series one-formation service from 2026-10-04,
  but the official release points users to live app position and does not
  publish a reusable number crosswalk.
- The 4017F E851 revival source identifies the formation, not its daily train
  numbers. Do not infer numbers from the formation ID.

## Official sources

- Tokiiro new vehicle: https://www.seiburailway.jp/newsroom/news/20260219_TOKIIRO/
- Tokiiro Express service plan: https://www.seiburailway.jp/newsroom/news/20260805_TOKIIROexpress/
- 2026 Red Arrow Classic: https://www.seiburailway.jp/newsroom/news/20260925_RedArrowClassic/
- Seibu operating fleet list: https://www.seiburailway.jp/railway/encyclopedia/
- Seibu design trains / 101-series two-tone: https://www.seiburailway.jp/railway/encyclopedia/designtrain/
- 110th-anniversary 2000 train: https://www.seiburailway.jp/newsroom/news/20230119_110train/
- 4017F E851 revival: https://www.seiburailway.jp/newsroom/news/20241108_4000e851/

## Validation

```sh
node --test tests/private-p09-seibu-15-png-audit.test.cjs
node tools/vehicle-garage-png-map.test.cjs
node tools/build-png-to-train-number-index.cjs --check
node tools/build-train-number-png-catalog.cjs --check --strict
node scripts/sync-page-scripts.cjs --check
```
