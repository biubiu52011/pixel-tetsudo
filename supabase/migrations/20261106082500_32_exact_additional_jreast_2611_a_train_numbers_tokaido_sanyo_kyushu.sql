-- 2026-11 JR-East published A-suffix Shinkansen name/number pairs:
-- 001d1p/001u1p list 32 inspected names with exact number columns.
-- 44 existing weekday SQL train source templates: Tokaido 20,
-- Sanyo 20, Kyushu 4. Day/clock and true carset remain independent.
-- The JR-East official weekday timetable is not proof of holiday
-- running days: this migration deliberately excludes holiday templates.
-- No model PNG is guessed from A suffix or train-name ordinal.
BEGIN;
WITH official(service_name,number_full,direction,source_url) AS (VALUES
('ひかり733','733A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('ひかり735','735A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('こだま943','943A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('こだま947','947A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('こだま949','949A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('こだま805','805A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('のぞみ11','11A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('ひかり633','633A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('のぞみ13','13A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('さくら751','751A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('こだま807','807A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('こだま811','811A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('ひかり705','705A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('こだま813','813A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('ひかり637','637A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('ひかり643','643A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('さくら761','761A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('ひかり713','713A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('のぞみ35','35A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('こだま827','827A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('ひかり645','645A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('のぞみ73','73A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('さくら763','763A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('こだま831','831A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('ひかり715','715A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('こだま829','829A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('ひかり652','652A','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/001u1p.html'),
('さくら748','748A','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/001u1p.html'),
('こだま950','950A','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/001u1p.html'),
('こだま938','938A','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/001u1p.html'),
('こだま940','940A','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/001u1p.html'),
('のぞみ4','4A','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/001u1p.html')
), matched AS (
 SELECT m.id,m.line_key,m.calendar_urn,m.direction_urn,o.number_full,o.source_url
 FROM official o
 JOIN manual_timetable_templates m ON m.train_number=o.service_name
 AND m.line_key IN ('TokaidoShinkansen','SanyoShinkansen','KyushuShinkansen')
 AND m.calendar_urn='odpt.Calendar:Weekday'
 AND m.railway_urn='odpt.Railway:'||
 CASE m.line_key WHEN 'TokaidoShinkansen' THEN 'JR-Central.TokaidoShinkansen'
 WHEN 'SanyoShinkansen' THEN 'JR-West.SanyoShinkansen'
 ELSE 'JR-Kyushu.KyushuShinkansen' END
 AND m.direction_urn='odpt.RailDirection:'||o.direction
)
INSERT INTO public.published_train_number_evidence
 (edition,line_key,calendar_urn,direction_urn,train_number,
 source_template_id,official_source_url,verification_scope)
SELECT '2611',m.line_key,m.calendar_urn,m.direction_urn,m.number_full,
 m.id,m.source_url,'train_number_only' FROM matched m
WHERE (SELECT COUNT(*) FROM official)=32
 AND (SELECT COUNT(*) FROM matched)=44
 AND (SELECT COUNT(DISTINCT id) FROM matched)=44
 AND (SELECT COUNT(*) FROM matched WHERE line_key='TokaidoShinkansen')=20
 AND (SELECT COUNT(*) FROM matched WHERE line_key='SanyoShinkansen')=20
 AND (SELECT COUNT(*) FROM matched WHERE line_key='KyushuShinkansen')=4
ON CONFLICT DO NOTHING;
COMMIT;