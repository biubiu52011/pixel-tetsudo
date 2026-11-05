-- 2611 JR-Kyushu published Kamome G numbers, source-clock checked.
-- Source references: JR Kyushu official individual train-detail pages.
-- No N700S PNG substitution and no H-number relay confusion.
BEGIN;
WITH official(label,number,origin,clock,url) AS (
VALUES ('かもめ41号','2041G','Takeo-Onsen','16:58','https://www.jrkyushu-timetable.jp/sp/2611/0019/00191601.html?d=20261102&t=2838901e'),
('かもめ47号','2047G','Takeo-Onsen','18:01','https://www.jrkyushu-timetable.jp/sp/2611/0019/00191801.html?d=20261103&t=2838901e'),
('かもめ63号','2063G','Takeo-Onsen','22:04','https://www.jrkyushu-timetable.jp/sp/2611/0029/00290201.html?d=20261102&t=1122701'),
('かもめ64号','2064G','Nagasaki','21:18','https://www.jrkyushu-timetable.jp/sp/2611/0019/00193601.html?d=20261030&t=2853300l'),
('かもめ101号','2101G','Shin-Omura','06:20','https://www.jrkyushu-timetable.jp/sp/2611/0019/00193701.html?d=20261104&t=2844301')
), matched AS (
SELECT m.id,m.line_key,m.calendar_urn,m.direction_urn,o.number,o.url
FROM official o
JOIN manual_timetable_templates m ON m.train_number=o.label
AND m.line_key='NishiKyushuShinkansen'
AND m.railway_urn='odpt.Railway:JR-Kyushu.NishiKyushuShinkansen'
AND m.calendar_urn IN ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
AND m.direction_urn='odpt.RailDirection:'||
(CASE WHEN right(o.number,1)='G' AND substring(o.number from '^[0-9]+')::int%2=1 THEN 'Outbound' ELSE 'Inbound' END)
AND EXISTS(SELECT 1 FROM manual_timetable_template_stops s
 WHERE s.template_id=m.id AND s.departure_clock=o.clock
 AND s.departure_station_urn='odpt.Station:JR-Kyushu.NishiKyushuShinkansen.'||o.origin)
)
INSERT INTO published_train_number_evidence
(edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,official_source_url,verification_scope)
SELECT '2611',line_key,calendar_urn,direction_urn,number,id,url,'train_number_only'
FROM matched WHERE (SELECT count(*) FROM matched)=9 AND (SELECT count(DISTINCT id) FROM matched)=9
ON CONFLICT DO NOTHING;
COMMIT;