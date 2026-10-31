-- JR Kyushu's recurring published timetable, revised 2026-03-14.
-- Operator-approved public timetable: https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf
-- 22 representative regularly scheduled weekend services, not 22 daily observations.
-- All times refer to clock times, not an operating date; no formation numbers.
-- Date 20260314 inside the source_trip_id is a SOURCE REVISION identifier only.
-- Each station has the published time, no arrival minute is invented when the
-- source only prints one time at intermediate stations. This does not claim
-- complete holiday coverage for either railway.
BEGIN;
CREATE TEMP TABLE jrkyushu_holiday_seed
(line_key text,train_number text,direction text,source_trip_id text PRIMARY KEY,source_url text) ON COMMIT DROP;
INSERT INTO jrkyushu_holiday_seed VALUES
('NishiKyushuShinkansen','かもめ3号','Outbound','20260314:NishiKyushuShinkansen:かもめ3号','https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf'),
('NishiKyushuShinkansen','かもめ5号','Outbound','20260314:NishiKyushuShinkansen:かもめ5号','https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf'),
('NishiKyushuShinkansen','かもめ9号','Outbound','20260314:NishiKyushuShinkansen:かもめ9号','https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf'),
('NishiKyushuShinkansen','かもめ13号','Outbound','20260314:NishiKyushuShinkansen:かもめ13号','https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf'),
('NishiKyushuShinkansen','かもめ21号','Outbound','20260314:NishiKyushuShinkansen:かもめ21号','https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf'),
('NishiKyushuShinkansen','かもめ37号','Outbound','20260314:NishiKyushuShinkansen:かもめ37号','https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf'),
('NishiKyushuShinkansen','かもめ43号','Outbound','20260314:NishiKyushuShinkansen:かもめ43号','https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf'),
('NishiKyushuShinkansen','かもめ2号','Inbound','20260314:NishiKyushuShinkansen:かもめ2号','https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf'),
('NishiKyushuShinkansen','かもめ4号','Inbound','20260314:NishiKyushuShinkansen:かもめ4号','https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf'),
('NishiKyushuShinkansen','かもめ8号','Inbound','20260314:NishiKyushuShinkansen:かもめ8号','https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf'),
('NishiKyushuShinkansen','かもめ14号','Inbound','20260314:NishiKyushuShinkansen:かもめ14号','https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf'),
('NishiKyushuShinkansen','かもめ22号','Inbound','20260314:NishiKyushuShinkansen:かもめ22号','https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf'),
('NishiKyushuShinkansen','かもめ30号','Inbound','20260314:NishiKyushuShinkansen:かもめ30号','https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf'),
('NishiKyushuShinkansen','かもめ38号','Inbound','20260314:NishiKyushuShinkansen:かもめ38号','https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf'),
('NishiKyushuShinkansen','かもめ42号','Inbound','20260314:NishiKyushuShinkansen:かもめ42号','https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf'),
('KyushuShinkansen','みずほ601','Outbound','20260314:KyushuShinkansen:みずほ601','https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf'),
('KyushuShinkansen','みずほ603','Outbound','20260314:KyushuShinkansen:みずほ603','https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf'),
('KyushuShinkansen','みずほ605','Outbound','20260314:KyushuShinkansen:みずほ605','https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf'),
('KyushuShinkansen','さくら741','Outbound','20260314:KyushuShinkansen:さくら741','https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf'),
('KyushuShinkansen','さくら743','Outbound','20260314:KyushuShinkansen:さくら743','https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf'),
('KyushuShinkansen','さくら745','Outbound','20260314:KyushuShinkansen:さくら745','https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf'),
('KyushuShinkansen','みずほ600','Inbound','20260314:KyushuShinkansen:みずほ600','https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf');
CREATE TEMP TABLE jrkyushu_holiday_stops
(source_trip_id text,seq int,station text,clock text,is_last boolean) ON COMMIT DROP;
INSERT INTO jrkyushu_holiday_stops VALUES
('20260314:NishiKyushuShinkansen:かもめ3号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','07:42',FALSE),
('20260314:NishiKyushuShinkansen:かもめ3号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Ureshino-Onsen','07:49',FALSE),
('20260314:NishiKyushuShinkansen:かもめ3号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','07:58',FALSE),
('20260314:NishiKyushuShinkansen:かもめ3号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','08:04',FALSE),
('20260314:NishiKyushuShinkansen:かもめ3号',4,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','08:12',TRUE),
('20260314:NishiKyushuShinkansen:かもめ5号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','08:28',FALSE),
('20260314:NishiKyushuShinkansen:かもめ5号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Ureshino-Onsen','08:35',FALSE),
('20260314:NishiKyushuShinkansen:かもめ5号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','08:44',FALSE),
('20260314:NishiKyushuShinkansen:かもめ5号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','08:50',FALSE),
('20260314:NishiKyushuShinkansen:かもめ5号',4,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','08:59',TRUE),
('20260314:NishiKyushuShinkansen:かもめ9号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','09:23',FALSE),
('20260314:NishiKyushuShinkansen:かもめ9号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Ureshino-Onsen','09:30',FALSE),
('20260314:NishiKyushuShinkansen:かもめ9号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','09:39',FALSE),
('20260314:NishiKyushuShinkansen:かもめ9号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','09:45',FALSE),
('20260314:NishiKyushuShinkansen:かもめ9号',4,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','09:54',TRUE),
('20260314:NishiKyushuShinkansen:かもめ13号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','10:01',FALSE),
('20260314:NishiKyushuShinkansen:かもめ13号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Ureshino-Onsen','10:08',FALSE),
('20260314:NishiKyushuShinkansen:かもめ13号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','10:17',FALSE),
('20260314:NishiKyushuShinkansen:かもめ13号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','10:23',FALSE),
('20260314:NishiKyushuShinkansen:かもめ13号',4,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','10:32',TRUE),
('20260314:NishiKyushuShinkansen:かもめ21号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','11:58',FALSE),
('20260314:NishiKyushuShinkansen:かもめ21号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Ureshino-Onsen','12:05',FALSE),
('20260314:NishiKyushuShinkansen:かもめ21号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','12:14',FALSE),
('20260314:NishiKyushuShinkansen:かもめ21号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','12:21',FALSE),
('20260314:NishiKyushuShinkansen:かもめ21号',4,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','12:29',TRUE),
('20260314:NishiKyushuShinkansen:かもめ37号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','15:57',FALSE),
('20260314:NishiKyushuShinkansen:かもめ37号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Ureshino-Onsen','16:04',FALSE),
('20260314:NishiKyushuShinkansen:かもめ37号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','16:13',FALSE),
('20260314:NishiKyushuShinkansen:かもめ37号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','16:20',FALSE),
('20260314:NishiKyushuShinkansen:かもめ37号',4,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','16:28',TRUE),
('20260314:NishiKyushuShinkansen:かもめ43号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','17:22',FALSE),
('20260314:NishiKyushuShinkansen:かもめ43号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Ureshino-Onsen','17:29',FALSE),
('20260314:NishiKyushuShinkansen:かもめ43号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','17:38',FALSE),
('20260314:NishiKyushuShinkansen:かもめ43号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','17:44',FALSE),
('20260314:NishiKyushuShinkansen:かもめ43号',4,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','17:53',TRUE),
('20260314:NishiKyushuShinkansen:かもめ2号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','06:17',FALSE),
('20260314:NishiKyushuShinkansen:かもめ2号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','06:26',FALSE),
('20260314:NishiKyushuShinkansen:かもめ2号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','06:33',FALSE),
('20260314:NishiKyushuShinkansen:かもめ2号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Ureshino-Onsen','06:42',FALSE),
('20260314:NishiKyushuShinkansen:かもめ2号',4,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','06:48',TRUE),
('20260314:NishiKyushuShinkansen:かもめ4号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','06:58',FALSE),
('20260314:NishiKyushuShinkansen:かもめ4号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','07:07',FALSE),
('20260314:NishiKyushuShinkansen:かもめ4号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','07:14',FALSE),
('20260314:NishiKyushuShinkansen:かもめ4号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Ureshino-Onsen','07:23',FALSE),
('20260314:NishiKyushuShinkansen:かもめ4号',4,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','07:28',TRUE),
('20260314:NishiKyushuShinkansen:かもめ8号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','07:46',FALSE),
('20260314:NishiKyushuShinkansen:かもめ8号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','07:55',FALSE),
('20260314:NishiKyushuShinkansen:かもめ8号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','08:02',FALSE),
('20260314:NishiKyushuShinkansen:かもめ8号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Ureshino-Onsen','08:11',FALSE),
('20260314:NishiKyushuShinkansen:かもめ8号',4,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','08:16',TRUE),
('20260314:NishiKyushuShinkansen:かもめ14号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','09:08',FALSE),
('20260314:NishiKyushuShinkansen:かもめ14号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','09:18',FALSE),
('20260314:NishiKyushuShinkansen:かもめ14号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','09:25',FALSE),
('20260314:NishiKyushuShinkansen:かもめ14号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Ureshino-Onsen','09:33',FALSE),
('20260314:NishiKyushuShinkansen:かもめ14号',4,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','09:39',TRUE),
('20260314:NishiKyushuShinkansen:かもめ22号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','10:44',FALSE),
('20260314:NishiKyushuShinkansen:かもめ22号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','10:54',FALSE),
('20260314:NishiKyushuShinkansen:かもめ22号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','11:00',FALSE),
('20260314:NishiKyushuShinkansen:かもめ22号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Ureshino-Onsen','11:09',FALSE),
('20260314:NishiKyushuShinkansen:かもめ22号',4,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','11:15',TRUE),
('20260314:NishiKyushuShinkansen:かもめ30号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','12:42',FALSE),
('20260314:NishiKyushuShinkansen:かもめ30号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','12:51',FALSE),
('20260314:NishiKyushuShinkansen:かもめ30号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','12:58',FALSE),
('20260314:NishiKyushuShinkansen:かもめ30号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Ureshino-Onsen','13:07',FALSE),
('20260314:NishiKyushuShinkansen:かもめ30号',4,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','13:12',TRUE),
('20260314:NishiKyushuShinkansen:かもめ38号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','14:43',FALSE),
('20260314:NishiKyushuShinkansen:かもめ38号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','14:52',FALSE),
('20260314:NishiKyushuShinkansen:かもめ38号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','14:59',FALSE),
('20260314:NishiKyushuShinkansen:かもめ38号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Ureshino-Onsen','15:07',FALSE),
('20260314:NishiKyushuShinkansen:かもめ38号',4,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','15:13',TRUE),
('20260314:NishiKyushuShinkansen:かもめ42号',0,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Nagasaki','15:42',FALSE),
('20260314:NishiKyushuShinkansen:かもめ42号',1,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Isahaya','15:51',FALSE),
('20260314:NishiKyushuShinkansen:かもめ42号',2,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Shin-Omura','15:58',FALSE),
('20260314:NishiKyushuShinkansen:かもめ42号',3,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Ureshino-Onsen','16:06',FALSE),
('20260314:NishiKyushuShinkansen:かもめ42号',4,'odpt.Station:JR-Kyushu.NishiKyushuShinkansen.Takeo-Onsen','16:12',TRUE),
('20260314:KyushuShinkansen:みずほ601',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','08:30',FALSE),
('20260314:KyushuShinkansen:みずほ601',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','09:03',FALSE),
('20260314:KyushuShinkansen:みずほ601',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','09:46',TRUE),
('20260314:KyushuShinkansen:みずほ603',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','09:53',FALSE),
('20260314:KyushuShinkansen:みずほ603',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','10:08',FALSE),
('20260314:KyushuShinkansen:みずほ603',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','10:29',FALSE),
('20260314:KyushuShinkansen:みずほ603',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','11:11',TRUE),
('20260314:KyushuShinkansen:みずほ605',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','10:20',FALSE),
('20260314:KyushuShinkansen:みずほ605',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','10:53',FALSE),
('20260314:KyushuShinkansen:みずほ605',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','11:36',TRUE),
('20260314:KyushuShinkansen:さくら741',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','09:06',FALSE),
('20260314:KyushuShinkansen:さくら741',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tosu','09:20',FALSE),
('20260314:KyushuShinkansen:さくら741',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','09:24',FALSE),
('20260314:KyushuShinkansen:さくら741',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','09:45',FALSE),
('20260314:KyushuShinkansen:さくら741',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Sendai','10:20',FALSE),
('20260314:KyushuShinkansen:さくら741',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','10:31',TRUE),
('20260314:KyushuShinkansen:さくら743',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','09:28',FALSE),
('20260314:KyushuShinkansen:さくら743',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tosu','09:41',FALSE),
('20260314:KyushuShinkansen:さくら743',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','09:46',FALSE),
('20260314:KyushuShinkansen:さくら743',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','10:07',FALSE),
('20260314:KyushuShinkansen:さくら743',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Yatsushiro','10:19',FALSE),
('20260314:KyushuShinkansen:さくら743',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Minamata','10:33',FALSE),
('20260314:KyushuShinkansen:さくら743',6,'odpt.Station:JR-Kyushu.KyushuShinkansen.Izumi','10:40',FALSE),
('20260314:KyushuShinkansen:さくら743',7,'odpt.Station:JR-Kyushu.KyushuShinkansen.Sendai','10:52',FALSE),
('20260314:KyushuShinkansen:さくら743',8,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','11:04',TRUE),
('20260314:KyushuShinkansen:さくら745',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','10:38',FALSE),
('20260314:KyushuShinkansen:さくら745',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tosu','10:51',FALSE),
('20260314:KyushuShinkansen:さくら745',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','10:56',FALSE),
('20260314:KyushuShinkansen:さくら745',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','11:17',FALSE),
('20260314:KyushuShinkansen:さくら745',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Yatsushiro','11:29',FALSE),
('20260314:KyushuShinkansen:さくら745',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Minamata','11:43',FALSE),
('20260314:KyushuShinkansen:さくら745',6,'odpt.Station:JR-Kyushu.KyushuShinkansen.Izumi','11:50',FALSE),
('20260314:KyushuShinkansen:さくら745',7,'odpt.Station:JR-Kyushu.KyushuShinkansen.Sendai','12:02',FALSE),
('20260314:KyushuShinkansen:さくら745',8,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','12:14',TRUE),
('20260314:KyushuShinkansen:みずほ600',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','06:35',FALSE),
('20260314:KyushuShinkansen:みずほ600',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','07:19',FALSE),
('20260314:KyushuShinkansen:みずほ600',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','07:53',TRUE);
DO $$ BEGIN
 IF (SELECT count(*) FROM jrkyushu_holiday_seed)<>22 OR
 EXISTS (SELECT 1 FROM jrkyushu_holiday_seed t WHERE
   (SELECT count(*) FROM jrkyushu_holiday_stops s WHERE s.source_trip_id=t.source_trip_id)<2)
 THEN RAISE EXCEPTION 'Holiday import source count changed'; END IF;
END $$;
INSERT INTO public.manual_timetable_templates
(line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,destination_urns,source_path,source_trip_id)
SELECT t.line_key,'odpt.Calendar:SaturdayHoliday',t.train_number,
 'odpt.Railway:JR-Kyushu.'||t.line_key,'odpt.RailDirection:'||t.direction,
 'odpt.TrainType:JR-Kyushu.Shinkansen',
 ARRAY[(SELECT station FROM jrkyushu_holiday_stops s WHERE s.source_trip_id=t.source_trip_id ORDER BY seq DESC LIMIT 1)],
 'official-sampled:holiday:'||t.source_url,t.source_trip_id
FROM jrkyushu_holiday_seed t
WHERE NOT EXISTS(SELECT 1 FROM public.manual_timetable_templates m
 WHERE m.source_trip_id=t.source_trip_id AND m.calendar_urn='odpt.Calendar:SaturdayHoliday');
CREATE TEMP TABLE jrkyushu_holiday_mapping ON COMMIT DROP AS
SELECT t.source_trip_id,t.line_key,m.id template_id
FROM jrkyushu_holiday_seed t
JOIN public.manual_timetable_templates m ON m.source_trip_id=t.source_trip_id
 AND m.calendar_urn='odpt.Calendar:SaturdayHoliday' AND m.line_key=t.line_key;
DO $$ BEGIN IF (SELECT count(*) FROM jrkyushu_holiday_mapping)<>22
 THEN RAISE EXCEPTION 'Unexpected holiday template mapping'; END IF;END $$;
INSERT INTO public.manual_timetable_template_stops(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
SELECT m.template_id,s.seq,CASE WHEN s.is_last THEN s.station END,
 CASE WHEN NOT s.is_last THEN s.station END,
 CASE WHEN s.is_last THEN s.clock END,
 CASE WHEN NOT s.is_last THEN s.clock END
FROM jrkyushu_holiday_mapping m JOIN jrkyushu_holiday_stops s ON s.source_trip_id=m.source_trip_id
WHERE NOT EXISTS(SELECT 1 FROM manual_timetable_template_stops x WHERE x.template_id=m.template_id AND x.stop_sequence=s.seq);
INSERT INTO public.train_timetables(canonical_key,calendar_urn,primary_train_number,lead_source_template_id,group_evidence,timetable_validity)
SELECT 'source:'||m.template_id,'odpt.Calendar:SaturdayHoliday',t.train_number,m.template_id,'source_only','undated_not_current_verified'
FROM jrkyushu_holiday_mapping m JOIN jrkyushu_holiday_seed t ON t.source_trip_id=m.source_trip_id
WHERE NOT EXISTS(SELECT 1 FROM train_timetables c WHERE c.lead_source_template_id=m.template_id);
INSERT INTO public.train_timetable_members(source_template_id,timetable_id,segment_order,member_role,first_stop_sequence,last_stop_sequence,stop_offset,merge_first_stop)
SELECT m.template_id,c.id,0,'primary',0,(SELECT max(stop_sequence) FROM manual_timetable_template_stops s WHERE s.template_id=m.template_id),0,false
FROM jrkyushu_holiday_mapping m JOIN train_timetables c ON c.lead_source_template_id=m.template_id
WHERE NOT EXISTS(SELECT 1 FROM train_timetable_members x WHERE x.source_template_id=m.template_id);
DO $$ BEGIN IF EXISTS(
 SELECT 1 FROM jrkyushu_holiday_mapping m WHERE
 (SELECT count(*) FROM manual_timetable_template_stops s WHERE s.template_id=m.template_id) <>
 (SELECT count(*) FROM jrkyushu_holiday_stops h WHERE h.source_trip_id=m.source_trip_id)
 OR NOT EXISTS(SELECT 1 FROM train_timetable_members x WHERE x.source_template_id=m.template_id))
 THEN RAISE EXCEPTION 'Holiday stop chain incomplete'; END IF;END $$;
WITH counts AS (
 SELECT line_key,count(*)::int templates,count(distinct calendar_urn)::int calendars,
 count(distinct direction_urn)::int directions,count(*) filter(where source_path like 'official-sampled:%')::int sampled
 FROM manual_timetable_templates WHERE line_key IN ('KyushuShinkansen','NishiKyushuShinkansen')
 GROUP BY 1)
UPDATE published_timetable_coverage_audit a
SET template_count=c.templates,calendar_count=c.calendars,direction_count=c.directions,
 sampled_count=c.sampled,checked_at=now()
FROM counts c WHERE a.line_key=c.line_key;
COMMIT;
