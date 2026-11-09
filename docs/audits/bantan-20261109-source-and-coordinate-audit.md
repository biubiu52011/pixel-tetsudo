# 播但線 Bantan data and timetable audit — 2026-11-09

## Fixed in `main`
- Canonical `data/core/railway_data.json`: incorrect coordinates of 京口, 野里, 新野, 長谷, 新井. Online `public.stations` had the same values and needs synchronized correction.
- J line color: brown -> approximate wine-red `#b1184b` in `color` and `presentation.color`. This is a screen approximation, NOT a verified official RGB specification.
- Preserve all 18 station IDs and order. Railway distance is 65.7 km; sum of straight-line station distances after correction is about 61.6 km.
- Replace uniformly 5-minute segment **display fallbacks** by representative real source intervals: 姫路→寺前 from historical SQL 5601M stop clocks, 寺前→和田山 from published Nov 2026 ordinary-train itinerary. Fallbacks are NOT a current train timetable, service proof, or schedule identity.
- Add missing interchange metadata at 姫路 (姫新線) and 和田山 (山陰本線).
- Keep `serviceBoundaries` empty. The electrification break at 寺前 is a physical line segment change, NOT a cross-line handover.
- English station labels: 砥堀=T​ohori (without hidden characters; actual `Tohori`), 甘地=`Amaji`. Keep canonical station IDs unchanged.
- Fleet candidate list now describes operating segment scope. Extend only verified relevant image eligibility: generic キハ41 and キハ189. Do not use an unrelated キハ40 livery, fabricate 223-series PNGs, or auto-assign physical trainsets.

## Sources
- JR West route and official train-guide: https://www.jr-odekake.net/route/ and https://www.train-guide.westjr.co.jp/bantan.html
- JR West inbound train-number timetable: https://timetable.jr-odekake.net/line-timetable/2443 (5600M, 5602M, ...). It must be rechecked for the actual revision/date BEFORE importing complete stop clocks.
- Wine-red screen color approximation: https://ayaito.net/webtips/color_code/164/ (lists `#b1184b`)
- 18 station order and distances: https://railway.sidearrow.net/line/detail/0ec8239d
- Coordinate sources: 京口 https://postcode.teraren.com/stations/4406 ; 野里 https://mapfan.com/spots/SCH%2CJ%2C55E ; 新野 https://zh.wikipedia.org/wiki/新野站_(兵庫縣) ; 長谷 https://zh.wikipedia.org/wiki/長谷站_(兵庫縣) ; 新井 https://mapfan.com/spots/SCH%2CJ%2CP5E
- Fleet review: https://note.com/tc221_25/n/ne3e1710b7a1f ; https://kansai-jruser.com/archives/himeji-223-for-teramae.html

## SQL evidence as of 2026-11-09
`railway_lines.id='Bantan'`: `timetable_api_enabled=false`, `realtime_position_api_enabled=false`, `sql_planned_fallback_enabled=true`.
`manual_timetable_templates`: 119 undated historical sources / 1,120 timed stop rows. `published_timetable_coverage_audit.coverage_status='unverified'`.
Weekday outbound 44/inbound 16; holiday outbound 43/inbound 16. Electric up-direction 5600M, 5602M, etc are missing. Never mirror odd-number down-direction rows or infer times.
Some JR West train-guide segments cannot show exact observed position. Do not present these sources as physical live positions or current verified carsets.

## Remaining work
Reconcile `public.stations` SQL geodata to canonical values (matching station IDs only, no other rows).
For inbound electric services, ingest complete train-stop clock data from a current official source with correct calendar and verified operating rules. Number evidence alone must remain nonpositional. Historical records are NOT automatically certified as November 2026.

## Follow-up: November source safety gate (2026-11-09)
- Confirmed SQL by joining `manual_timetable_templates` to `train_timetable_source_resolution`: **all 119** Bantan source templates have `timetable_validity='undated_not_current_verified'`. Both inbound calendar sets have **zero** electric `M` trains.
- JR West's 2026-11-05 published up-direction table lists 5600M, 5602M, 5604M etc., so the legacy SQL is incomplete. This **does not** validate every stop clock, present operating date or formation; never mirror the outbound 5601M etc. into an inbound timetable.
- The November 2026 JR timetable page expressly forbids unauthorized reproduction/reformatting of its timetable data. No bulk copying of the restricted published clocks into SQL or the static site was performed. A licensed/reuse-permitted machine-readable dataset or permission is required before full ingest.
- `RuntimeConfig.SQL_POSITION_VERIFICATION_MONTHS.Bantan=['*']` now uses the shared `train-position-estimator` date-proof gate. Undated legacy SQL positions are hidden for any month, while independently dated/verified SQL and realtime sources remain eligible. All historical SQL rows remain intact for audit.
- `trains-page.js` supplies direct outbound/inbound official timetable and official train position links, and expressly states that **no displayed train** does not mean a service cancellation. The JR West guide itself warns that some positions/trains are incomplete or inaccurate.
- No new paid API, local server, manual train-number guess, unverified train PNG, duplicate route table or PR is introduced.

Official reference URLs:
- Published upper-direction timetable: https://timetable.jr-odekake.net/line-timetable/2443
- Published lower-direction timetable: https://timetable.jr-odekake.net/line-timetable/2442
- JR West train guide: https://www.train-guide.westjr.co.jp/bantan.html
- Timetable copyright/conditions: https://timetable.jr-odekake.net/train-timetable/240631?date=20261101

### Remaining requirement
To populate actual two-way time-based map positions, import a dataset for which the site owner has reuse permission or a documented API license, mapping each row to an exact public train number, station order, service calendar, effective date, publication revision and stop arrival/departure. Mark `timetable_date_verified` only when these facts are validated. The current source records do not meet this requirement.
