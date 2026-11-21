# Fujikyu P-11: 15 PNG number-band audit — 2026-11-22

## Result

- Audited all 15 fixed P-11 PNGs.
- Added **zero** train-number ranges and **zero** first-covered PNGs.
- All 15 remain `no_verified_number_mapping`: the available official sources
  identify model families, formations, liveries or named services, but do not
  publish a reusable train-number -> physical formation/livery crosswalk for
  these exact PNGs.
- Formation numbers such as 1001, 1202, 1205, 2001, 2002 and 6501 are vehicle
  formation identities, not passenger train numbers. They must not be inserted
  into `published_train_png_number_ranges`.
- The existing mapped Fujikyu references outside this batch remain unchanged:
  ordinary 1-52 uses the generic 6000-series standard reference, while the
  current Fujisan Express scope uses the existing 8000-series face-A reference.

## Per-group decision

### 1000 series (5 PNGs)

- Official releases identify individual formations and retirement dates. The
  1001 formation ended regular service on 2024-12-15; the 1202 revival-colour
  formation retired on 2020-10-28. Those formation identities are not train
  numbers.
- The official Fujitozan Train page identifies the two-car special train and
  states that it may be used in ordinary operation, but publishes no stable
  number roster. Its two front illustrations therefore remain unmapped.
- Generic blue, red/white and old-light-blue livery illustrations cannot inherit
  the ordinary 1-52 range: the operator does not publish which physical
  formation/livery works each number, and operations can change.

### 2000 series Fujisan Express (4 PNGs)

- The official retirement release says the two three-car formations were 2001
  and 2002; 2002 retired in 2015 and 2001 on 2016-02-07.
- The repository's face-A/face-B labels only distinguish artwork variants and
  intentionally do not infer 2001/2002 formation identity. Panorama and
  non-panorama ends belong to a consist, so a service number cannot select one
  exact front PNG without additional directional and formation evidence.
- These historical illustrations remain review references with no number band.

### 5000 series (2 PNGs)

- The official Shimoyoshida preservation page states that the 5000-series
  Thomas Land train retired on 2019-02-23 and is preserved at the station.
- Neither the Thomas Land nor standard-colour historical illustration has an
  official train-number crosswalk. Both remain unmapped.

### 6000 series special liveries (4 PNGs)

- Official material identifies the Matterhorn train as 6000 series formation
  6501 and describes it as operating mainly on local services. That formation
  number is not a train number.
- The official Lisa and Gaspard page explicitly says vehicle operation varies
  with operating conditions. Current station timetables also warn that named
  services may use ordinary rolling stock during inspections.
- The Matterhorn, Lisa and Gaspard, purple-wrap and red-livery PNGs therefore
  cannot inherit the generic 6000-series 1-52 scope. They remain unmapped until
  a dated, exact train-number-to-formation source is available.

## Official sources

- 1001 formation regular-service retirement:
  https://www.fujikyu.co.jp/data/news_pdf/pdf_file2_1727685992.pdf
- 1202 formation retirement:
  https://www.fujikyu.co.jp/data/news_pdf/pdf_file1_1602807647.pdf
- Fujitozan Train operation notice:
  https://www.fujikyu-railway.jp/train/fujitozandensha.php
- 2000-series Fujisan Express retirement:
  https://www.fujikyu-railway.jp/upload/file/098-2015_12_9%20%EF%BE%8C%EF%BD%BC%EF%BE%9E%EF%BD%BB%EF%BE%9D%E7%89%B9%E6%80%A52000%E7%B3%BB%E5%BC%95%E9%80%80%E3%81%95%E3%82%88%E3%81%AA%E3%82%89%E3%82%AD%E3%83%A3%E3%83%B3%E3%83%9A%E3%83%BC%E3%83%B3.pdf
- Shimoyoshida preserved 5000-series Thomas Land train:
  https://www.fujikyu-railway.jp/en/station/timetable_kari.php?no=14
- Matterhorn 6000-series formation 6501:
  https://www.fujikyu-railway.jp/upload/file/210923%E3%80%90%E5%A0%B1%E9%81%93%E3%80%91%E5%A7%89%E5%A6%B9%E9%89%84%E9%81%9330%E5%91%A8%E5%B9%B4%E3%83%AA%E3%83%AA%E3%83%BC%E3%82%B9.pdf
- Lisa and Gaspard Train operation caveat:
  https://www.fujikyu-railway.jp/train/lisagas.php
- Current Fujikyu station timetable and substitution caveat:
  https://www.fujikyu-railway.jp/station/timetable.php?no=16

## Validation

Passed locally:

```sh
node --test tests/private-p11-fujikyu-15-png-audit.test.cjs tests/fujikyu-png-number-ranges.test.cjs
node tools/vehicle-garage-png-map.test.cjs
git diff --check
```

The following pre-existing generated-artifact checks still report that the
committed index/catalog on `main` is stale. P-11 changes no mapping input or
generated data, so this audit does not regenerate or silently absorb that
unrelated baseline delta:

```sh
node tools/build-png-to-train-number-index.cjs --check
node tools/build-train-number-png-catalog.cjs --check --strict
```
