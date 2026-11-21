# Fujikyu P-12: 3 PNG number-band audit — 2026-11-22

## Result

- Audited all three fixed P-12 PNGs.
- Added **zero** train-number ranges and **zero** first-covered PNGs.
- The 8000-series face-B image and both 8500-series end/appearance images
  remain `no_verified_number_mapping`.
- No SQL or Supabase migration is needed: the repository already registers all
  three as review assets, while the published number-range tables intentionally
  contain none of them.

## Per-image decision

### 8000 series Fujisan Express — face B

- The operator's introduction release identifies the 8000 series as one
  three-car formation used for Fujisan Express. It does not publish separate
  train-number rosters for the two cab faces.
- The current official timetable publishes Fujisan Express service numbers but
  warns that the planned vehicle may change without notice.
- The repository's existing 701-705 and 793-794 scopes use face A only as an
  illustrative representative. The runtime comment explicitly says that this
  does not select face A/B, a formation number or the actual vehicle.
- Adding face B to those same numbers would create two exact PNG candidates for
  one service number. Face B therefore remains a gallery reference with no
  number band.

### 8500 series Fujisan View Express — red and brown ends

- The official service page publishes Fujisan View Express 11-14 service
  numbers and describes a single three-car train with cars 1-3. It does not
  provide a reusable train-number-to-cab-end or train-number-to-livery
  crosswalk.
- The two repository PNGs depict different ends/appearances of the same service
  family. A train number alone cannot choose which end should face the viewer;
  the current number-range contract has no direction or camera-facing-end
  evidence for these assets.
- The official page also warns that the planned vehicle may change without
  notice, and the current public timetable says these named trains may use an
  ordinary vehicle during inspection.
- Neither the red nor brown image may inherit 11-14. Both remain review-only
  assets until an exact, direction-aware source and runtime contract exist.

## Official sources

- Current Fujisan Express timetable and vehicle-substitution caveat:
  https://www.fujikyu-railway.jp/train/fujisan_express.php
- 8000-series introduction release (one three-car formation):
  https://www.fujikyu-railway.jp/upload/file/pdf/20140620_8000_debutpress.pdf
- Current Fujisan View Express service, car layout, timetable and substitution
  caveat:
  https://www.fujikyu-railway.jp/train/fujisan_view_express.php
- Current full timetable, including ordinary-vehicle substitution notice:
  https://www.fujikyu-railway.jp/pdf/timetable20260314.pdf

## Validation

Passed locally:

```sh
node --test tests/private-p12-fujikyu-three-png-audit.test.cjs tests/fujikyu-png-number-ranges.test.cjs
node tools/vehicle-garage-png-map.test.cjs
git diff --check
```

The committed PNG-first index/catalog are pre-existing generated snapshots and
remain stale on `main`. P-12 changes no mapping input or generated data, so this
audit does not regenerate or silently absorb that unrelated baseline delta.
