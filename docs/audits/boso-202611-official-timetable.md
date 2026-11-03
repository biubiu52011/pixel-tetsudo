# Boso Uchibo / Sotobo — JR East November 2026 timetable audit

Date checked: 2026-11-04 JST. Railway edition: `2611`.
Scope: `public.manual_timetable_templates` in the user's Pixel Tetsudo
Supabase project; this document is an audit summary, **not a copied
public timetable** or a license to bulk redistribute JR East schedules.

## Official train-number coverage

For each day-calendar and direction, the entire stored SQL `train_number`
set was cross-checked against JR East's November `2611` line-timetable
`列車番号` heading. The official column count is greater because the
public page includes through-running numbers on other lines, duplicate
number sections and dated seasonal / exceptional services. Do not
bulk-insert the differences into a Boso `line_key` without verifying
the actual source railway, valid date, and boundary.

| Route | Operating calendar | Direction | Stored SQL templates | Not found in official heading | Official page |
| --- | --- | --- | ---: | ---: | --- |
| Uchibo | Weekday | Outbound / 下り | 96 | 0 | [221d1](https://timetables.jreast.co.jp/2611/timetable-v/221d1.html) |
| Uchibo | Weekday | Inbound / 上り | 93 | 0 | [221u1](https://timetables.jreast.co.jp/2611/timetable-v/221u1.html) |
| Uchibo | SaturdayHoliday | Outbound / 下り | 91 | 0 | [221d2](https://timetables.jreast.co.jp/2611/timetable-v/221d2.html) |
| Uchibo | SaturdayHoliday | Inbound / 上り | 90 | 0 | [221u2](https://timetables.jreast.co.jp/2611/timetable-v/221u2.html) |
| Sotobo | Weekday | Outbound / 下り | 111 | 0 | [220d1](https://timetables.jreast.co.jp/2611/timetable-v/220d1.html) |
| Sotobo | Weekday | Inbound / 上り | 106 | 0 | [220u1](https://timetables.jreast.co.jp/2611/timetable-v/220u1.html) |
| Sotobo | SaturdayHoliday | Outbound / 下り | 108 | 0 | [220d2](https://timetables.jreast.co.jp/2611/timetable-v/220d2.html) |
| Sotobo | SaturdayHoliday | Inbound / 上り | 101 | 0 | [220u2](https://timetables.jreast.co.jp/2611/timetable-v/220u2.html) |
| **Total** | | | **796** | **0** | |

This check is a **train-number set coverage check only**:
- it cannot confirm scheduled operation on an arbitrary **date**;
- it does not certify per-stop `arrival_clock` or `departure_clock`;
- it does not identify physical rolling stock or joining/splitting;
- it must not set `source_revision_date` or `timetable_validity` to current
  without a complete stop-by-stop and date-condition verification.

## Individual scheduled-clock samples (cross-checked)

- Sotobo `220M`: Ohara 04:40 → Chiba 05:44. The displayed ordinary
  stop pattern in stored SQL matches the [official 2611 detailed
  train](https://timetables.jreast.co.jp/2611/train/045/046221.html).
- Uchibo `3680F`: Kimitsu 06:02 → Chiba 06:49, with Kisarazu
  06:09 arrival and 06:10 departure; source
  [2611 detailed train](https://timetables.jreast.co.jp/2611/train/110/114702.html).
  **November 7 cancellation** applies to the original numbered run.
- Sotobo `1235M`: Chiba 23:59 → Oami **24:27** on JR East's
  [2611 published train](https://timetables.jreast.co.jp/2611/train/100/102421.html).
  SQL stores its next-day arrivals as `00:xx`. The application uses a
  04:00 JST service-day cutoff and converts both forms to the same
  overnight timeline. Regression test covers 00:15 and 00:27.

## Exceptional date: 2026-11-07

The standard SaturdayHoliday SQL snapshot contains regular public
train numbers that JR East explicitly cancels on this Saturday.
The scheduler now **suppresses only these confirmed five normal
SQL timetable services on that date**:

- Uchibo: `3680F`, `3606F`.
- Sotobo: `3573F`, `3719F`, `3845F`.

Official pages:
[Uchibo 221u2](https://timetables.jreast.co.jp/2611/timetable-v/221u2p.html),
[Sotobo 220d2](https://timetables.jreast.co.jp/2611/timetable-v/220d2p.html).
The official November 7 alternatives (`9680M/9680F`,
`9606M/9606F`, `9573F/9573M`, `9887F/9887M`,
`9939F/8939M`) have **not** been inserted into SQL with complete
stop times. Never synthesize their positions or mutate the original
published train numbers. Further 11/7 and seasonal exceptions are
not yet exhaustively audited.

## 2026-11-07 verified dated Sotobo number corrections (no new files)

The existing `train-runs` Edge Function now substitutes exactly three scheduled
Sotobo *display numbers* for **2026-11-07 only**, after an all-nine-stop
clock/station signature match and an A-grade official source lookup in the
existing `evidence_sources` table. The original SQL source templates,
source numbers and canonical records are retained unchanged:

| Normal SaturdayHoliday source | Official 11/7 Sotobo section | Exact source stop clocks | Official dated train |
| --- | --- | --- | --- |
| `3573F` | `9573M` | Nine matched | [9573F / 9573M](https://timetables.jreast.co.jp/2611/train/185/185851.html) |
| `3719F` | `9887M` | Nine matched | [9887F / 9887M](https://timetables.jreast.co.jp/2611/train/185/186261.html) |
| `3845F` | `8939M` | Nine matched | [9939F / 8939M](https://timetables.jreast.co.jp/2611/train/185/186321.html) |

These are dated *published service labels*, not observed positions or actual
vehicle/carset proof. All changes fail closed if the original stops or official
source evidence differ. The two Uchibo normal train numbers `3680F` and
`3606F` are explicitly cancelled at the read boundary on 11/7, but their
replacement `9680M` and `9606M` itineraries have **not** been validated
stop-by-stop and are intentionally not synthesized.

The retired `train_runs` table is protected by the
`train_runs_legacy_write_disabled` database constraint. Its old import
function is NOT a supported way to publish current scheduled data; the
runtime fix edits the existing response adapter only.

## Remaining work / do-not-infer boundaries

1. Verify all **10,017** Boso SQL stop-clock rows against the applicable
   official train-specific published stop times, including 24:xx.
2. Source and validate remaining 11/7 replacement timetable segments (especially
   Uchibo 9680M/9606M and related rapid-line sections). Three source-matched
   Sotobo numbers are currently served as strictly dated response overrides.
3. Audit the **13 known cross-line renumbered Boso families** and
   Keiyo / Togane / Yokosuka through continuations against continuity
   evidence; do not merge same-sounding services by hour or tail digit.
4. Do not promote nominal 209 4/8-car or converted E233 6-car plans,
   or E131-0 vs E131-80 candidates, to confirmed actual trainsets.
5. Keep the SQL audit status `unverified` and historical validity
   `undated_not_current_verified` until full revision checks pass.

Regression tests:
`tests/boso-202611-number-artwork.test.cjs`,
`tests/boso-202611-schedule-fallback.test.cjs`,
`tests/boso-2611-dated-service-exceptions.test.cjs`.
