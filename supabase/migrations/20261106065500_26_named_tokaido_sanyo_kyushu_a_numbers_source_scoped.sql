-- Official 2026-Nov A-suffix Shinkansen railway train numbers:
-- 26 individually paired service NAME / FULL TRAIN NUMBER statements
-- from JR East 2611, JR West November train-detail and JR Kyushu 2611.
-- 67 SQL template rows: Kyushu 38 (both calendars), Sanyo 21,
-- Tokaido 8 (Hikari631 weekday+holiday). No parity or suffix guessing.
-- In particular Mizuho613, though a verified 613A, may terminate in
-- Kumamoto under 2026-11 planned suspension; original stop clocks are
-- NOT thereby upgraded to a verified November operating itinerary.
-- This is NUMBER evidence only, not trainset formation/dispatch stock.
BEGIN;
WITH official(service_name,formal_number,direction,source_url) AS (VALUES
('みずほ600','600A','Inbound','https://www.jrkyushu-timetable.jp/sp/2611/0009/00091301.html?d=20261101&t=2862600'),
('みずほ601','601A','Outbound','https://www.jrkyushu-timetable.jp/sp/2611/0009/00090901.html?d=20261103&t=2815506'),
('みずほ602','602A','Inbound','https://timetable.jr-odekake.net/train-timetable/278191?date=20261105'),
('みずほ603','603A','Outbound','https://www.jrkyushu-timetable.jp/sp/2611/0026/00263501.html?d=20261103&t=2815506'),
('みずほ604','604A','Inbound','https://timetable.jr-odekake.net/train-timetable/278201?date=20261119'),
('みずほ605','605A','Outbound','https://timetable.jr-odekake.net/train-timetable/90861?date=20261123'),
('みずほ606','606A','Inbound','https://www.jrkyushu-timetable.jp/sp/2611/0026/00264201.html?d=20261103&t=2828304'),
('みずほ607','607A','Outbound','https://timetable.jr-odekake.net/train-timetable/90871?date=20261113'),
('みずほ608','608A','Inbound','https://timetable.jr-odekake.net/train-timetable/94341?date=20261119'),
('みずほ609','609A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('みずほ610','610A','Inbound','https://timetable.jr-odekake.net/train-timetable/104201?date=20261114'),
('みずほ611','611A','Outbound','https://timetable.jr-odekake.net/train-timetable/278161?date=20261105'),
('みずほ612','612A','Inbound','https://timetable.jr-odekake.net/train-timetable/278221?date=20261119'),
('みずほ613','613A','Outbound','https://timetable.jr-odekake.net/train-timetable/278171?date=20261121'),
('みずほ614','614A','Inbound','https://timetable.jr-odekake.net/train-timetable/162971?date=20261105'),
('みずほ615','615A','Outbound','https://www.jrkyushu-timetable.jp/sp/2611/0026/00263901.html?d=20261106&t=2862601'),
('さくら401','401A','Outbound','https://timetable.jr-odekake.net/train-timetable/178201?date=20261107'),
('さくら740','740A','Inbound','https://timetable.jr-odekake.net/train-timetable/317251?date=20261101'),
('さくら747','747A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('のぞみ1','1A','Outbound','https://timetables.jreast.co.jp/2611/train/005/008031.html'),
('ひかり631','631A','Outbound','https://timetable.jr-odekake.net/train-timetable/162581?date=20261103'),
('ひかり638','638A','Inbound','https://timetable.jr-odekake.net/train-timetable/82111?date=20261103'),
('ひかり636','636A','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/001u1p.html'),
('ひかり700','700A','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/001u1p.html'),
('こだま801','801A','Outbound','https://timetables.jreast.co.jp/2611/timetable-v/001d1p.html'),
('こだま812','812A','Inbound','https://timetables.jreast.co.jp/2611/timetable-v/001u1p.html')
), matched AS (
 SELECT m.id,m.line_key,m.calendar_urn,m.direction_urn,o.formal_number,o.source_url
 FROM official o
 JOIN public.manual_timetable_templates m ON m.train_number=o.service_name
 AND m.line_key IN ('KyushuShinkansen','SanyoShinkansen','TokaidoShinkansen')
 AND m.railway_urn='odpt.Railway:'||
 (CASE m.line_key WHEN 'KyushuShinkansen' THEN 'JR-Kyushu'
 WHEN 'SanyoShinkansen' THEN 'JR-West' ELSE 'JR-Central' END)||'.'||m.line_key
 AND m.calendar_urn IN ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
 AND m.direction_urn='odpt.RailDirection:'||o.direction
)
INSERT INTO public.published_train_number_evidence
(edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,
 official_source_url,verification_scope)
SELECT '2611',m.line_key,m.calendar_urn,m.direction_urn,
 m.formal_number,m.id,m.source_url,'train_number_only'
FROM matched m
WHERE (SELECT COUNT(*) FROM official)=26
AND (SELECT COUNT(*) FROM matched)=67
AND (SELECT COUNT(DISTINCT id) FROM matched)=67
AND (SELECT COUNT(*) FROM matched WHERE line_key='KyushuShinkansen')=38
AND (SELECT COUNT(*) FROM matched WHERE line_key='SanyoShinkansen')=21
AND (SELECT COUNT(*) FROM matched WHERE line_key='TokaidoShinkansen')=8
ON CONFLICT DO NOTHING;
COMMIT;