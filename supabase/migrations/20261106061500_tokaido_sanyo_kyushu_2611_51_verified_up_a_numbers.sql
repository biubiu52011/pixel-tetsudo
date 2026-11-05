-- JR East 2026-11 2611 official 001u1p Weekday timetable:
-- 51 individually checked service name + A train number column pairs.
-- Matches Tokaido20, Sanyo24, Kyushu7 source templates exactly.
-- No SaturdayHoliday source claim; no fleet/model/PNG guess.
BEGIN;
WITH official(line_key,service_name,full_number) AS(VALUES
('TokaidoShinkansen','こだま808','808A'),
('TokaidoShinkansen','こだま816','816A'),
('TokaidoShinkansen','こだま820','820A'),
('TokaidoShinkansen','こだま824','824A'),
('TokaidoShinkansen','こだま832','832A'),
('TokaidoShinkansen','こだま836','836A'),
('TokaidoShinkansen','こだま844','844A'),
('TokaidoShinkansen','こだま848','848A'),
('TokaidoShinkansen','ひかり640','640A'),
('TokaidoShinkansen','ひかり642','642A'),
('TokaidoShinkansen','ひかり644','644A'),
('TokaidoShinkansen','ひかり648','648A'),
('TokaidoShinkansen','ひかり650','650A'),
('TokaidoShinkansen','ひかり654','654A'),
('TokaidoShinkansen','ひかり662','662A'),
('TokaidoShinkansen','ひかり664','664A'),
('TokaidoShinkansen','のぞみ14','14A'),
('TokaidoShinkansen','のぞみ28','28A'),
('TokaidoShinkansen','のぞみ44','44A'),
('TokaidoShinkansen','のぞみ56','56A'),
('SanyoShinkansen','こだま872','872A'),
('SanyoShinkansen','こだま942','942A'),
('SanyoShinkansen','こだま946','946A'),
('SanyoShinkansen','こだま948','948A'),
('SanyoShinkansen','こだま952','952A'),
('SanyoShinkansen','こだま960','960A'),
('SanyoShinkansen','こだま962','962A'),
('SanyoShinkansen','こだま964','964A'),
('SanyoShinkansen','ひかり706','706A'),
('SanyoShinkansen','ひかり710','710A'),
('SanyoShinkansen','ひかり712','712A'),
('SanyoShinkansen','ひかり716','716A'),
('SanyoShinkansen','ひかり722','722A'),
('SanyoShinkansen','さくら744','744A'),
('SanyoShinkansen','さくら750','750A'),
('SanyoShinkansen','さくら752','752A'),
('SanyoShinkansen','さくら756','756A'),
('SanyoShinkansen','さくら758','758A'),
('SanyoShinkansen','さくら760','760A'),
('SanyoShinkansen','さくら766','766A'),
('SanyoShinkansen','のぞみ14','14A'),
('SanyoShinkansen','のぞみ28','28A'),
('SanyoShinkansen','のぞみ44','44A'),
('SanyoShinkansen','のぞみ56','56A'),
('KyushuShinkansen','さくら744','744A'),
('KyushuShinkansen','さくら750','750A'),
('KyushuShinkansen','さくら752','752A'),
('KyushuShinkansen','さくら756','756A'),
('KyushuShinkansen','さくら758','758A'),
('KyushuShinkansen','さくら760','760A'),
('KyushuShinkansen','さくら766','766A')
), matching AS(
 SELECT m.id,m.line_key,m.calendar_urn,m.direction_urn,o.full_number
 FROM official o
 JOIN manual_timetable_templates m ON m.line_key=o.line_key
 AND m.train_number=o.service_name
 AND m.calendar_urn='odpt.Calendar:Weekday'
 AND m.direction_urn='odpt.RailDirection:Inbound'
 AND m.railway_urn=CASE o.line_key
 WHEN 'TokaidoShinkansen' THEN 'odpt.Railway:JR-Central.TokaidoShinkansen'
 WHEN 'SanyoShinkansen' THEN 'odpt.Railway:JR-West.SanyoShinkansen'
 ELSE 'odpt.Railway:JR-Kyushu.KyushuShinkansen' END
)
INSERT INTO published_train_number_evidence
(edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,official_source_url,verification_scope)
SELECT '2611',line_key,calendar_urn,direction_urn,full_number,id,
'https://timetables.jreast.co.jp/2611/timetable-v/001u1p.html','train_number_only'
FROM matching WHERE (SELECT count(*) FROM matching)=51
AND (SELECT count(DISTINCT id) FROM matching)=51
AND (SELECT count(*) FROM matching WHERE line_key='TokaidoShinkansen')=20
AND (SELECT count(*) FROM matching WHERE line_key='SanyoShinkansen')=24
AND (SELECT count(*) FROM matching WHERE line_key='KyushuShinkansen')=7
ON CONFLICT DO NOTHING;
COMMIT;