-- Official JR Kyushu regularly scheduled trains, effective 2026-03-14. Re-runnable, with no date-scoped rows.
-- Source: https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf
-- The original PDF indicates '' for stations passed without stopping; these are intentionally omitted.

BEGIN;
CREATE TEMP TABLE official_extra_holiday(key text PRIMARY KEY,train_number text,direction text) ON COMMIT DROP;
INSERT INTO official_extra_holiday VALUES ('20260314:NishiKyushuShinkansen:かもめ17号','かもめ17号','Outbound'),
('20260314:NishiKyushuShinkansen:かもめ25号','かもめ25号','Outbound'),
('20260314:NishiKyushuShinkansen:かもめ29号','かもめ29号','Outbound'),
('20260314:NishiKyushuShinkansen:かもめ33号','かもめ33号','Outbound'),
('20260314:NishiKyushuShinkansen:かもめ41号','かもめ41号','Outbound'),
('20260314:NishiKyushuShinkansen:かもめ47号','かもめ47号','Outbound'),
('20260314:NishiKyushuShinkansen:かもめ49号','かもめ49号','Outbound'),
('20260314:NishiKyushuShinkansen:かもめ51号','かもめ51号','Outbound'),
('20260314:NishiKyushuShinkansen:かもめ53号','かもめ53号','Outbound'),
('20260314:NishiKyushuShinkansen:かもめ55号','かもめ55号','Outbound'),
('20260314:NishiKyushuShinkansen:かもめ57号','かもめ57号','Outbound'),
('20260314:NishiKyushuShinkansen:かもめ59号','かもめ59号','Outbound'),
('20260314:NishiKyushuShinkansen:かもめ63号','かもめ63号','Outbound'),
('20260314:NishiKyushuShinkansen:かもめ67号','かもめ67号','Outbound'),
('20260314:NishiKyushuShinkansen:かもめ34号','かもめ34号','Inbound'),
('20260314:NishiKyushuShinkansen:かもめ46号','かもめ46号','Inbound'),
('20260314:NishiKyushuShinkansen:かもめ48号','かもめ48号','Inbound'),
('20260314:NishiKyushuShinkansen:かもめ50号','かもめ50号','Inbound'),
('20260314:NishiKyushuShinkansen:かもめ52号','かもめ52号','Inbound'),
('20260314:NishiKyushuShinkansen:かもめ54号','かもめ54号','Inbound'),
('20260314:NishiKyushuShinkansen:かもめ56号','かもめ56号','Inbound'),
('20260314:NishiKyushuShinkansen:かもめ58号','かもめ58号','Inbound'),
('20260314:NishiKyushuShinkansen:かもめ60号','かもめ60号','Inbound'),
('20260314:NishiKyushuShinkansen:かもめ64号','かもめ64号','Inbound'),
('20260314:NishiKyushuShinkansen:かもめ66号','かもめ66号','Inbound');
CREATE TEMP TABLE official_extra_stops(key text,seq int,station text,clock text,last_stop bool) ON COMMIT DROP;
INSERT INTO official_extra_stops VALUES ('20260314:NishiKyushuShinkansen:かもめ17号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','11:03',FALSE),
('20260314:NishiKyushuShinkansen:かもめ17号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','11:19',FALSE),
('20260314:NishiKyushuShinkansen:かもめ17号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','11:28',TRUE),
('20260314:NishiKyushuShinkansen:かもめ25号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','12:56',FALSE),
('20260314:NishiKyushuShinkansen:かもめ25号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','13:09',FALSE),
('20260314:NishiKyushuShinkansen:かもめ25号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','13:15',FALSE),
('20260314:NishiKyushuShinkansen:かもめ25号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','13:24',TRUE),
('20260314:NishiKyushuShinkansen:かもめ29号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','13:58',FALSE),
('20260314:NishiKyushuShinkansen:かもめ29号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Ureshino-Onsen','14:04',FALSE),
('20260314:NishiKyushuShinkansen:かもめ29号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','14:13',FALSE),
('20260314:NishiKyushuShinkansen:かもめ29号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','14:20',FALSE),
('20260314:NishiKyushuShinkansen:かもめ29号',4,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','14:28',TRUE),
('20260314:NishiKyushuShinkansen:かもめ33号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','14:57',FALSE),
('20260314:NishiKyushuShinkansen:かもめ33号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','15:09',FALSE),
('20260314:NishiKyushuShinkansen:かもめ33号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','15:16',FALSE),
('20260314:NishiKyushuShinkansen:かもめ33号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','15:24',TRUE),
('20260314:NishiKyushuShinkansen:かもめ41号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','16:58',FALSE),
('20260314:NishiKyushuShinkansen:かもめ41号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','17:14',FALSE),
('20260314:NishiKyushuShinkansen:かもめ41号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','17:22',TRUE),
('20260314:NishiKyushuShinkansen:かもめ47号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','18:01',FALSE),
('20260314:NishiKyushuShinkansen:かもめ47号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','18:17',FALSE),
('20260314:NishiKyushuShinkansen:かもめ47号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','18:25',TRUE),
('20260314:NishiKyushuShinkansen:かもめ49号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','18:38',FALSE),
('20260314:NishiKyushuShinkansen:かもめ49号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Ureshino-Onsen','18:45',FALSE),
('20260314:NishiKyushuShinkansen:かもめ49号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','18:54',FALSE),
('20260314:NishiKyushuShinkansen:かもめ49号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','19:01',FALSE),
('20260314:NishiKyushuShinkansen:かもめ49号',4,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','19:09',TRUE),
('20260314:NishiKyushuShinkansen:かもめ51号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','19:04',FALSE),
('20260314:NishiKyushuShinkansen:かもめ51号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','19:20',FALSE),
('20260314:NishiKyushuShinkansen:かもめ51号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','19:28',TRUE),
('20260314:NishiKyushuShinkansen:かもめ53号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','19:27',FALSE),
('20260314:NishiKyushuShinkansen:かもめ53号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Ureshino-Onsen','19:33',FALSE),
('20260314:NishiKyushuShinkansen:かもめ53号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','19:42',FALSE),
('20260314:NishiKyushuShinkansen:かもめ53号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','19:49',FALSE),
('20260314:NishiKyushuShinkansen:かもめ53号',4,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','19:57',TRUE),
('20260314:NishiKyushuShinkansen:かもめ55号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','20:05',FALSE),
('20260314:NishiKyushuShinkansen:かもめ55号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','20:21',FALSE),
('20260314:NishiKyushuShinkansen:かもめ55号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','20:29',TRUE),
('20260314:NishiKyushuShinkansen:かもめ57号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','20:31',FALSE),
('20260314:NishiKyushuShinkansen:かもめ57号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Ureshino-Onsen','20:37',FALSE),
('20260314:NishiKyushuShinkansen:かもめ57号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','20:46',FALSE),
('20260314:NishiKyushuShinkansen:かもめ57号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','20:53',FALSE),
('20260314:NishiKyushuShinkansen:かもめ57号',4,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','21:01',TRUE),
('20260314:NishiKyushuShinkansen:かもめ59号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','21:06',FALSE),
('20260314:NishiKyushuShinkansen:かもめ59号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','21:19',FALSE),
('20260314:NishiKyushuShinkansen:かもめ59号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','21:25',FALSE),
('20260314:NishiKyushuShinkansen:かもめ59号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','21:34',TRUE),
('20260314:NishiKyushuShinkansen:かもめ63号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','22:04',FALSE),
('20260314:NishiKyushuShinkansen:かもめ63号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Ureshino-Onsen','22:11',FALSE),
('20260314:NishiKyushuShinkansen:かもめ63号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','22:20',FALSE),
('20260314:NishiKyushuShinkansen:かもめ63号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','22:26',FALSE),
('20260314:NishiKyushuShinkansen:かもめ63号',4,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','22:35',TRUE),
('20260314:NishiKyushuShinkansen:かもめ67号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','23:17',FALSE),
('20260314:NishiKyushuShinkansen:かもめ67号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','23:29',FALSE),
('20260314:NishiKyushuShinkansen:かもめ67号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','23:36',FALSE),
('20260314:NishiKyushuShinkansen:かもめ67号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','23:44',TRUE),
('20260314:NishiKyushuShinkansen:かもめ34号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','13:45',FALSE),
('20260314:NishiKyushuShinkansen:かもめ34号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','13:55',FALSE),
('20260314:NishiKyushuShinkansen:かもめ34号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','14:01',FALSE),
('20260314:NishiKyushuShinkansen:かもめ34号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Ureshino-Onsen','14:08',FALSE),
('20260314:NishiKyushuShinkansen:かもめ34号',4,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','14:13',TRUE),
('20260314:NishiKyushuShinkansen:かもめ46号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','16:42',FALSE),
('20260314:NishiKyushuShinkansen:かもめ46号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','16:52',FALSE),
('20260314:NishiKyushuShinkansen:かもめ46号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','16:58',FALSE),
('20260314:NishiKyushuShinkansen:かもめ46号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','17:10',TRUE),
('20260314:NishiKyushuShinkansen:かもめ48号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','17:13',FALSE),
('20260314:NishiKyushuShinkansen:かもめ48号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','17:23',FALSE),
('20260314:NishiKyushuShinkansen:かもめ48号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','17:30',FALSE),
('20260314:NishiKyushuShinkansen:かもめ48号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Ureshino-Onsen','17:38',FALSE),
('20260314:NishiKyushuShinkansen:かもめ48号',4,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','17:44',TRUE),
('20260314:NishiKyushuShinkansen:かもめ50号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','17:44',FALSE),
('20260314:NishiKyushuShinkansen:かもめ50号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','17:54',FALSE),
('20260314:NishiKyushuShinkansen:かもめ50号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','18:00',FALSE),
('20260314:NishiKyushuShinkansen:かもめ50号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','18:12',TRUE),
('20260314:NishiKyushuShinkansen:かもめ52号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','18:19',FALSE),
('20260314:NishiKyushuShinkansen:かもめ52号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','18:28',FALSE),
('20260314:NishiKyushuShinkansen:かもめ52号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','18:35',FALSE),
('20260314:NishiKyushuShinkansen:かもめ52号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Ureshino-Onsen','18:44',FALSE),
('20260314:NishiKyushuShinkansen:かもめ52号',4,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','18:50',TRUE),
('20260314:NishiKyushuShinkansen:かもめ54号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','18:47',FALSE),
('20260314:NishiKyushuShinkansen:かもめ54号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','18:57',FALSE),
('20260314:NishiKyushuShinkansen:かもめ54号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','19:03',FALSE),
('20260314:NishiKyushuShinkansen:かもめ54号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','19:15',TRUE),
('20260314:NishiKyushuShinkansen:かもめ56号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','19:22',FALSE),
('20260314:NishiKyushuShinkansen:かもめ56号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','19:31',FALSE),
('20260314:NishiKyushuShinkansen:かもめ56号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','19:38',FALSE),
('20260314:NishiKyushuShinkansen:かもめ56号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Ureshino-Onsen','19:47',FALSE),
('20260314:NishiKyushuShinkansen:かもめ56号',4,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','19:52',TRUE),
('20260314:NishiKyushuShinkansen:かもめ58号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','19:48',FALSE),
('20260314:NishiKyushuShinkansen:かもめ58号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','19:58',FALSE),
('20260314:NishiKyushuShinkansen:かもめ58号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','20:04',FALSE),
('20260314:NishiKyushuShinkansen:かもめ58号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','20:16',TRUE),
('20260314:NishiKyushuShinkansen:かもめ60号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','20:20',FALSE),
('20260314:NishiKyushuShinkansen:かもめ60号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','20:30',FALSE),
('20260314:NishiKyushuShinkansen:かもめ60号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','20:36',FALSE),
('20260314:NishiKyushuShinkansen:かもめ60号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Ureshino-Onsen','20:45',FALSE),
('20260314:NishiKyushuShinkansen:かもめ60号',4,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','20:51',TRUE),
('20260314:NishiKyushuShinkansen:かもめ64号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','21:18',FALSE),
('20260314:NishiKyushuShinkansen:かもめ64号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','21:27',FALSE),
('20260314:NishiKyushuShinkansen:かもめ64号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','21:34',FALSE),
('20260314:NishiKyushuShinkansen:かもめ64号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','21:45',TRUE),
('20260314:NishiKyushuShinkansen:かもめ66号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','22:10',FALSE),
('20260314:NishiKyushuShinkansen:かもめ66号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','22:19',FALSE),
('20260314:NishiKyushuShinkansen:かもめ66号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','22:26',FALSE),
('20260314:NishiKyushuShinkansen:かもめ66号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Ureshino-Onsen','22:34',FALSE),
('20260314:NishiKyushuShinkansen:かもめ66号',4,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','22:40',TRUE);
DO $$BEGIN IF (SELECT count(*) FROM official_extra_holiday)<>25
 OR EXISTS(SELECT 1 FROM official_extra_holiday x WHERE (SELECT count(*) FROM official_extra_stops s WHERE s.key=x.key)<2)
 THEN RAISE EXCEPTION 'Incomplete 25-car table';END IF;END$$;
INSERT INTO manual_timetable_templates(line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,destination_urns,source_path,source_trip_id)
SELECT 'NishiKyushuShinkansen','odpt.Calendar:SaturdayHoliday',x.train_number,
'odpt.Railway:JR-Kyushu.NishiKyushuShinkansen','odpt.RailDirection:'||x.direction,'odpt.TrainType:JR-Kyushu.Shinkansen',
ARRAY[(SELECT s.station FROM official_extra_stops s WHERE s.key=x.key ORDER BY s.seq DESC LIMIT 1)],
'official-sampled:holiday:https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf',x.key
FROM official_extra_holiday x
WHERE NOT EXISTS(SELECT 1 FROM manual_timetable_templates m WHERE m.source_trip_id=x.key AND m.calendar_urn='odpt.Calendar:SaturdayHoliday');
CREATE TEMP TABLE official_extra_map ON COMMIT DROP AS
SELECT x.key,m.id FROM official_extra_holiday x JOIN manual_timetable_templates m ON m.source_trip_id=x.key AND m.calendar_urn='odpt.Calendar:SaturdayHoliday' AND m.line_key='NishiKyushuShinkansen';
DO $$BEGIN IF (SELECT count(*) FROM official_extra_map)<>25 THEN RAISE EXCEPTION 'Source mapping incomplete';END IF;END$$;
INSERT INTO manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
SELECT m.id,s.seq,CASE WHEN s.last_stop THEN s.station END,CASE WHEN NOT s.last_stop THEN s.station END,
CASE WHEN s.last_stop THEN s.clock END,CASE WHEN NOT s.last_stop THEN s.clock END
FROM official_extra_map m JOIN official_extra_stops s ON s.key=m.key
WHERE NOT EXISTS(SELECT 1 FROM manual_timetable_template_stops prior WHERE prior.template_id=m.id AND prior.stop_sequence=s.seq);
INSERT INTO train_timetables(canonical_key,calendar_urn,primary_train_number,lead_source_template_id,group_evidence,timetable_validity)
SELECT 'source:'||m.id,'odpt.Calendar:SaturdayHoliday',t.train_number,m.id,'source_only','undated_not_current_verified'
FROM official_extra_map m JOIN manual_timetable_templates t ON t.id=m.id
WHERE NOT EXISTS(SELECT 1 FROM train_timetables tt WHERE tt.lead_source_template_id=m.id);
INSERT INTO train_timetable_members(source_template_id,timetable_id,segment_order,member_role,first_stop_sequence,last_stop_sequence,stop_offset,merge_first_stop)
SELECT m.id,t.id,0,'primary',0,(SELECT max(stop_sequence) FROM manual_timetable_template_stops s WHERE s.template_id=m.id),0,false
FROM official_extra_map m JOIN train_timetables t ON t.lead_source_template_id=m.id
WHERE NOT EXISTS(SELECT 1 FROM train_timetable_members mm WHERE mm.source_template_id=m.id);
DO $$BEGIN IF EXISTS(SELECT 1 FROM official_extra_map m WHERE
 (SELECT count(*) FROM manual_timetable_template_stops s WHERE s.template_id=m.id) <>
 (SELECT count(*) FROM official_extra_stops x WHERE x.key=m.key)
 OR NOT EXISTS(SELECT 1 FROM train_timetable_members mm WHERE mm.source_template_id=m.id))
 THEN RAISE EXCEPTION 'Unmapped or incomplete timetable';END IF;END$$;
WITH c AS (SELECT line_key,count(*)::int n,count(distinct calendar_urn)::int cal,count(distinct direction_urn)::int dirs,count(*) filter(where source_path LIKE 'official-sampled:%')::int sampled
FROM manual_timetable_templates WHERE line_key='NishiKyushuShinkansen' GROUP BY line_key)
UPDATE published_timetable_coverage_audit a SET template_count=c.n,calendar_count=c.cal,direction_count=c.dirs,sampled_count=c.sampled,checked_at=now()
FROM c WHERE a.line_key=c.line_key;
COMMIT;
