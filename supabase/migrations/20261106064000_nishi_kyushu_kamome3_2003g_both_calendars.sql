-- JR Kyushu official November 2611 individual Kamome 3 train details:
-- Shin-Takeo-Onsen 07:42 -> Nagasaki 08:12, 2003G N700S.
-- The 2003H Relay Kamome is a different, non-Shinkansen train.
-- Proof is a G-number only; missing N700S native PNG stays unresolved.
BEGIN;
WITH matched AS(
 SELECT m.id,m.line_key,m.calendar_urn,m.direction_urn
 FROM manual_timetable_templates m
 WHERE m.line_key='NishiKyushuShinkansen'
 AND m.train_number='かもめ3号'
 AND m.railway_urn='odpt.Railway:JR-Kyushu.NishiKyushuShinkansen'
 AND m.direction_urn='odpt.RailDirection:Outbound'
 AND m.calendar_urn IN ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
 AND EXISTS(SELECT 1 FROM manual_timetable_template_stops s
   WHERE s.template_id=m.id AND s.departure_clock='07:42'
   AND s.departure_station_urn='odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen')
)
INSERT INTO published_train_number_evidence
(edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,official_source_url,verification_scope)
SELECT '2611',line_key,calendar_urn,direction_urn,'2003G',id,
'https://www.jrkyushu-timetable.jp/sp/2611/0019/00190601.html?d=20261102&t=0829103e',
'train_number_only' FROM matched WHERE (SELECT count(*) FROM matched)=2
ON CONFLICT DO NOTHING;
COMMIT;