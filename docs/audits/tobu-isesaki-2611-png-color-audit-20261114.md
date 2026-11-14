# 東武伊勢崎線 TI：2026年11月 列車番号・車両PNG・ラインカラー監査
**実施日:** 2026-11-14 / **対象:** `pages/trains.html#TobuIsesaki`

## 既存システム
- `TobuSkytree` (TS) already has its own exact 2611 service-family number list; it is **not** valid for `TobuIsesaki`.
- `TobuIsesaki` has SQL source timetables (weekday 354, holiday 344) but most train-specific vehicle model mappings are unresolved. The source revision in `manual_timetable_templates` is NULL.
- Existing TI `color` was #002D62 and `presentation.color` was #0F6CC3; official TI station numbering is **red**, TS **blue**.
- Related TI-coded `Sano`, `Kiryu`, `Koizumi` canonical `color` contradicted their red presentation color.

## New rule – scoped references only
- Tobu **2026-03-14** Tatebayashi–Isesaki local timetable: **95 explicit train numbers** (48 down, 47 up), each with verified 2/3-car operating length. Source applies to weekday and holiday.
- 2-car reference image: 10030-series (family candidates 10000/10030). 3-car reference image: 8000-series (family candidates 800/850). **Neither identifies the actual numbered formation**.
- Tobu **2026-03-14** Ryomo express down/up timetable: **50 exact train numbers**, with timetable-listed 200/500-series type. Livery and set identity remain unknown.
- For unknown trains (including unreviewed other local/rapid numbers), render no artificial vehicle assignment.
- Scope: `TobuIsesaki` source and render line, November 2026 dates, local or limited express type, weekday/holiday, approved PNG; reject confirmed or conflicting realtime/vehicle identity.
- `TH-LINER` is not altered; existing separate verified 70090-type rule remains primary.
- Do not extend this northern TI rule to `TobuSkytree`, `Sano`, `Kiryu`, `Koizumi`, `Hibiya`, `Hanzomon`.

## Color
Canonical TI `#FF0000` for `TobuIsesaki`, `Sano`, `Kiryu`, `Koizumi`; TS `#0F6CC3`. `railway_data.json`, `railway_data.compact.json` and `railway-data.file.js` remain generated-equivalent. Official map and station numbering show TI red, TS blue; hex follows preexisting red TI presentation and TS presentation.

## Source links
- Official local train roster (numbers + carriage counts): https://www.tobu.co.jp/cms-pdf/news/20260210134344bOudukqdpHQTk7q2T0hikA.pdf
- Official Ryomo down 200/500: https://www.tobu.co.jp/pdf/timetable/time-table_02_kudari.pdf?202603=
- Official Ryomo up 200/500: https://www.tobu.co.jp/pdf/timetable/time-table_02_nobori.pdf?202603=
- Official route map: https://www.tobu.co.jp/pdf/guide/tobumap.pdf?20251030=
- MLIT station numbering TS/TI: https://www.mlit.go.jp/common/000209459.pdf
- Tobu fleet catalogue: https://www.tobu.co.jp/corporation/rail/vehicles/

## Data quality
Timetable-source model (200/500) is distinct from physical carset confirmation. Ordinary 2- and 3-car service cannot be mapped to one exact car model based only on the length: the PNG is a **representative** to depict a candidate family. The SQL audit table is service-role only (RLS + revoked `anon` and `authenticated`).
