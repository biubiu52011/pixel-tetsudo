# JR-Central 2244 complete-plan source: actual full-roster ingestion readiness (2026-11-12)

**Status: NOT IMPORTED IN FULL.** The user wants every scheduled
train number and every corresponding scheduled station time for each
calendar/direction, not a handful of sampled trains. Previous
partial samples must never be counted as successful full imports.

## Verified scope

- https://timetable.jr-odekake.net/line-timetable/2244
- Title: `東海道本線(米原～浜松) 上り`.
- Displays an extensive train-number column per service plus
  train type and across-station arrival/departure rows.
- Different dates can yield different rosters (e.g. November 3 and 7,
  2026, shown separately by date-selector parameters).
- This is **only one portion and one direction** of JR-Central
  `TokaidoCentral` (84 canonical stations Atami–Maibara).
- It does NOT include the MinoAkasaka three-station branch; using
  its displayed train numbers for that branch would be incorrect.

## Non-negotiable data rights

The JRおでかけネット timetable states its data derives from the
Kotsu Shimbunsha `JR時刻表2026年11月号` and forbids unauthorized
reproduction, copying, or conversion to electronic media.
https://timetable.jr-odekake.net/train-timetable/102371?date=20261112
https://www.jr-odekake.net/use/about.html

**The user sharing a URL does not establish a grant for mirroring
the entire publisher's timetable into a publicly consumed Supabase
database.** The bulk importer therefore requires a confirmed
full-database republication licence. Do not spoof it by setting
`original_compilation` on a mirrored copy of the publisher's table.

Rights-cleared options:
- Traffic News / Kotsu Shimbunsha's actual licensed railway CSV,
  XML or GTFS dataset:
  https://www.kotsu.co.jp/service/jikoku_solution/data_sales/
- Independently authored/published timetable source ONLY after its
  author and underlying source rights permit whole-database reuse.
  Publicly downloadable OuDia does NOT itself establish licence.
- Independently collected schedule facts where the project owns
  its publication/compilation rights, with provenance and actual
  full-roster independent reconciliation.

## Runtime / importer contract

The existing `scripts/prepare-jr-central-sql-plan.cjs` remains the
authoritative rights-aware CSV-to-source-JSON normalizer, followed by
the existing SQL function `import_jr_central_authorized_plan`.
No parallel renderer or unverified raw-web scraper is introduced.
`SectionRapid` is now recognized in the CSV converter.

New tooling:
- `scripts/build-jr-central-full-roster-sql.cjs`
- `tests/build-jr-central-full-roster-sql.test.cjs`

For a genuinely authorized, fully normalized private input file:

```bash
node scripts/build-jr-central-full-roster-sql.cjs \
  --source private/rights.json \
  --grant private/licence-grant.json \
  --csv private/tokaido-up-2611-stops.csv \
  --roster private/tokaido-up-2611-expected.json \
  --out private/tokaido-up-2611-sql \
  --batch-size 80
```

Required rights document keys:
`url`, `authorization="licensed_for_republication"`,
`authorization_evidence_url`, `edition_date="2026-11-01"`.

Required grant keys: `confirmed=true`,
`permission="scheduled_train_times_database_republication"`,
`grant_url` (must match source authorization evidence URL;
real grant must be verified separately).

Expected roster keys:
`line_key="TokaidoCentral"`, `complete_scope=true`,
`expected` indexed by
`odpt.Calendar:Weekday`/`odpt.Calendar:SaturdayHoliday`
and `odpt.RailDirection:Inbound`/`odpt.RailDirection:Outbound`,
with independently checked *column occurrence counts*, including zero
for directions outside the source section.

The CSV follows the existing ten-column
`scripts/prepare-jr-central-sql-plan.cjs` schema
(`service_key,train_number,calendar_urn,direction_urn,train_type,
operating_dates,stop_sequence,station_id,arrival,departure`).
It must contain every authorized, verified stop clock for every
covered train, with no fake time for a pass-through `レ`.
Use unambiguous `24:xx` notation for after-midnight clocks
when needed, and do not infer those dates automatically.

The builder produces reviewable `batch-001.sql` etc.
PLUS a **SELECT-only**
`preflight-existing-dated-plans.sql` reporting existing
template collisions; NEVER run write batches until preflight
overlap results have been reconciled. Older partial templates
(e.g. 5100F and 5102F) can conflict with full official data.
It never fetches the third-party timetable, never embeds
service role keys or invokes Supabase and never claims
`full_day_accepted=true`.

## Important unresolved data-model issues

- The 2244 matrix repeats a published train number such as
  `3106F` in more than one displayed train column.
  It may be a split/continuation; do not deduplicate solely
  on number. The current SQL importer rejects same-number
  overlapping-date entries until the source occurrences are
  verified, combined or otherwise represented unambiguously.
- Some station cells show after-midnight `00:xx` times.
  Source calendar and time arithmetic must be reconciled
  to monotone clocks; never fill missing times by guesswork.
- All-day acceptance requires **both calendars, both
  directions of the complete parent line, all constituent
  route segments, exception dates, and official station
  comparisons**. 2244 alone cannot provide this.
- The current production view stays `sampled`/
  `blocked_no_weekday_trains`, even when imported samples exist;
  full-day acceptance must be independently certified, never
  switched on just because the import function inserted rows.

## Actual current state

The production source lacks the full licensed 2026-11 timetable
and actual validated complete column-occurrence inventory.
No bulk import was executed in this follow-up.
The existing 12/13 line sample status is therefore unchanged
except for the previously imported individual trains.
**Do not report 2244 complete ingestion or any of the 13 lines
as all-day accepted.**
