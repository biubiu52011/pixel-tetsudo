# Sotetsu P-13: 15 PNG number-band audit — 2026-11-22

## Result

- Audited all 15 fixed P-13 PNGs.
- Added **zero** train-number ranges and **zero** first-covered PNGs.
- Thirteen images remain `no_verified_number_mapping`.
- The 20000-series and 21000-series images remain
  `quarantined_visual_identity`: the two files are byte-identical while their
  model labels conflict.
- No SQL or Supabase migration is needed. The repository already registers the
  15 gallery identities, and the published number-range tables intentionally
  contain none of them.

## Per-group decision

### 8000, 10000 and 11000 series appearance variants

- The operator's vehicle guide confirms the train families, but it does not
  publish a reusable train-number-to-livery or train-number-to-front-display
  crosswalk.
- P-13 contains five 8000-series appearances, four 10000-series appearances and
  three 11000-series appearances. A family name or a timetable train number
  cannot select one appearance without formation- and date-specific evidence.
- The 11003 formation is identified for the 2026 "Hohoemi" wrapping, including
  its operating period and line scope. The announcement does not publish a
  durable daily train-number roster, so it cannot become a number band.

### 13000 series

- The official release confirms one eight-car formation and commercial service
  from 2026-03-30 on Sotetsu internal services.
- A single formation does not prove that every internal train number uses that
  formation, and the release provides no reusable number roster. The PNG remains
  a planned/gallery identity rather than number-scoped artwork.

### 20000 and 21000 series

- The repository files have the same SHA-256 hash even though their names claim
  different models.
- The existing quarantine migration and garage map therefore reject automatic
  train assignment. Neither image may receive a number range until the artwork
  identities are corrected and separately verified.

## Official sources

- Current Sotetsu vehicle guide:
  https://www.sotetsu.co.jp/life/gallery/train/
- Current station and timetable entry point:
  https://www.sotetsu.co.jp/train/stations/
- 13000-series commercial-service announcement:
  https://www.sotetsu.co.jp/pressrelease/train/r26-42/
- 11003 formation "Hohoemi" wrapping announcement:
  https://www.sotetsu.co.jp/pressrelease/train/r26-132/

## Validation

Passed locally:

```sh
node --test tests/private-p13-sotetsu-15-png-audit.test.cjs
node tools/vehicle-garage-png-map.test.cjs
git diff --check
```

The broader `tests/png-to-train-number-index.test.cjs` suite passed 5/6. Its
only failure is the pre-existing generated-snapshot ordering drift already
present on `main`; all physical-file, quarantine, rule-bound and historical
source assertions passed. P-13 changes no mapping source and does not regenerate
or silently absorb that unrelated baseline delta.

P-13 changes no mapping input or generated data. The audit therefore preserves
the current generated snapshots rather than manufacturing a number band from a
vehicle family, livery, formation number or current-service announcement.
