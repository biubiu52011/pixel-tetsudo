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
