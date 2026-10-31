-- JR Kyushu official recurring train timetable (effective from 2026-03-14).
-- https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf
-- This is a timetable plan; the source version is NOT an operational service date.
-- Only printed station times are stored. Intermediate arrival/departure pairs
-- are deliberately NOT interpolated, and special trains are excluded.
-- Recheck and correct the previously imported SAKURA 401 holiday timetable;
-- previous source incorrectly ended at 09:39 instead of official 09:34.
BEGIN;
CREATE TEMP TABLE kyu_batch(key text PRIMARY KEY, train_number text NOT NULL, direction text NOT NULL) ON COMMIT DROP;
INSERT INTO kyu_batch VALUES
('jrkyushu:20260314:kyushu:つばめ301','つばめ301','Outbound'),
('jrkyushu:20260314:kyushu:つばめ303','つばめ303','Outbound'),
('jrkyushu:20260314:kyushu:つばめ305','つばめ305','Outbound'),
('jrkyushu:20260314:kyushu:つばめ307','つばめ307','Outbound'),
('jrkyushu:20260314:kyushu:つばめ309','つばめ309','Outbound'),
('jrkyushu:20260314:kyushu:つばめ311','つばめ311','Outbound'),
('jrkyushu:20260314:kyushu:つばめ313','つばめ313','Outbound'),
('jrkyushu:20260314:kyushu:つばめ315','つばめ315','Outbound'),
('jrkyushu:20260314:kyushu:つばめ317','つばめ317','Outbound'),
('jrkyushu:20260314:kyushu:つばめ319','つばめ319','Outbound'),
('jrkyushu:20260314:kyushu:さくら403','さくら403','Outbound'),
('jrkyushu:20260314:kyushu:さくら740','さくら740','Inbound'),
('jrkyushu:20260314:kyushu:つばめ300','つばめ300','Inbound'),
('jrkyushu:20260314:kyushu:さくら400','さくら400','Inbound'),
('jrkyushu:20260314:kyushu:つばめ302','つばめ302','Inbound'),
('jrkyushu:20260314:kyushu:つばめ304','つばめ304','Inbound'),
('jrkyushu:20260314:kyushu:さくら742','さくら742','Inbound'),
('jrkyushu:20260314:kyushu:つばめ306','つばめ306','Inbound'),
('jrkyushu:20260314:kyushu:みずほ602','みずほ602','Inbound'),
('jrkyushu:20260314:kyushu:つばめ308','つばめ308','Inbound'),
('jrkyushu:20260314:kyushu:みずほ604','みずほ604','Inbound'),
('jrkyushu:20260314:kyushu:つばめ312','つばめ312','Inbound'),
('jrkyushu:20260314:kyushu:みずほ606','みずほ606','Inbound');
CREATE TEMP TABLE kyu_stops(key text NOT NULL,seq int NOT NULL,station text NOT NULL,clock text NOT NULL,is_last boolean NOT NULL) ON COMMIT DROP;
INSERT INTO kyu_stops VALUES
('jrkyushu:20260314:kyushu:つばめ301',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Sendai','06:19',false),
('jrkyushu:20260314:kyushu:つばめ301',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','06:31',true),
('jrkyushu:20260314:kyushu:つばめ303',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','06:11',false),
('jrkyushu:20260314:kyushu:つばめ303',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Yatsushiro','06:23',false),
('jrkyushu:20260314:kyushu:つばめ303',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Minamata','06:37',false),
('jrkyushu:20260314:kyushu:つばめ303',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Izumi','06:44',false),
('jrkyushu:20260314:kyushu:つばめ303',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Sendai','06:56',false),
('jrkyushu:20260314:kyushu:つばめ303',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','07:08',true),
('jrkyushu:20260314:kyushu:つばめ305',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','06:35',false),
('jrkyushu:20260314:kyushu:つばめ305',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Yatsushiro','06:46',false),
('jrkyushu:20260314:kyushu:つばめ305',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Minamata','07:00',false),
('jrkyushu:20260314:kyushu:つばめ305',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Izumi','07:08',false),
('jrkyushu:20260314:kyushu:つばめ305',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Sendai','07:19',false),
('jrkyushu:20260314:kyushu:つばめ305',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','07:31',true),
('jrkyushu:20260314:kyushu:つばめ307',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','06:10',false),
('jrkyushu:20260314:kyushu:つばめ307',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tosu','06:24',false),
('jrkyushu:20260314:kyushu:つばめ307',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','06:29',false),
('jrkyushu:20260314:kyushu:つばめ307',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Chikugo-Funagoya','06:36',false),
('jrkyushu:20260314:kyushu:つばめ307',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Omuta','06:43',false),
('jrkyushu:20260314:kyushu:つばめ307',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tamana','06:51',false),
('jrkyushu:20260314:kyushu:つばめ307',6,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','07:01',false),
('jrkyushu:20260314:kyushu:つばめ307',7,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Yatsushiro','07:13',false),
('jrkyushu:20260314:kyushu:つばめ307',8,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Minamata','07:27',false),
('jrkyushu:20260314:kyushu:つばめ307',9,'odpt.Station:JR-Kyushu.KyushuShinkansen.Izumi','07:34',false),
('jrkyushu:20260314:kyushu:つばめ307',10,'odpt.Station:JR-Kyushu.KyushuShinkansen.Sendai','07:46',false),
('jrkyushu:20260314:kyushu:つばめ307',11,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','07:58',true),
('jrkyushu:20260314:kyushu:つばめ309',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','06:42',false),
('jrkyushu:20260314:kyushu:つばめ309',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tosu','06:55',false),
('jrkyushu:20260314:kyushu:つばめ309',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','07:00',false),
('jrkyushu:20260314:kyushu:つばめ309',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Chikugo-Funagoya','07:07',false),
('jrkyushu:20260314:kyushu:つばめ309',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Omuta','07:13',false),
('jrkyushu:20260314:kyushu:つばめ309',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tamana','07:21',false),
('jrkyushu:20260314:kyushu:つばめ309',6,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','07:31',false),
('jrkyushu:20260314:kyushu:つばめ309',7,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Yatsushiro','07:43',false),
('jrkyushu:20260314:kyushu:つばめ309',8,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Minamata','07:57',false),
('jrkyushu:20260314:kyushu:つばめ309',9,'odpt.Station:JR-Kyushu.KyushuShinkansen.Izumi','08:04',false),
('jrkyushu:20260314:kyushu:つばめ309',10,'odpt.Station:JR-Kyushu.KyushuShinkansen.Sendai','08:16',false),
('jrkyushu:20260314:kyushu:つばめ309',11,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','08:28',true),
('jrkyushu:20260314:kyushu:つばめ311',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','07:24',false),
('jrkyushu:20260314:kyushu:つばめ311',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tosu','07:37',false),
('jrkyushu:20260314:kyushu:つばめ311',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','07:42',false),
('jrkyushu:20260314:kyushu:つばめ311',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Chikugo-Funagoya','07:49',false),
('jrkyushu:20260314:kyushu:つばめ311',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Omuta','07:56',false),
('jrkyushu:20260314:kyushu:つばめ311',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tamana','08:03',false),
('jrkyushu:20260314:kyushu:つばめ311',6,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','08:13',false),
('jrkyushu:20260314:kyushu:つばめ311',7,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Yatsushiro','08:25',false),
('jrkyushu:20260314:kyushu:つばめ311',8,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Minamata','08:39',false),
('jrkyushu:20260314:kyushu:つばめ311',9,'odpt.Station:JR-Kyushu.KyushuShinkansen.Izumi','08:47',false),
('jrkyushu:20260314:kyushu:つばめ311',10,'odpt.Station:JR-Kyushu.KyushuShinkansen.Sendai','08:59',false),
('jrkyushu:20260314:kyushu:つばめ311',11,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','09:10',true),
('jrkyushu:20260314:kyushu:つばめ313',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','08:10',false),
('jrkyushu:20260314:kyushu:つばめ313',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tosu','08:24',false),
('jrkyushu:20260314:kyushu:つばめ313',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','08:28',false),
('jrkyushu:20260314:kyushu:つばめ313',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Chikugo-Funagoya','08:36',false),
('jrkyushu:20260314:kyushu:つばめ313',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Omuta','08:42',false),
('jrkyushu:20260314:kyushu:つばめ313',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tamana','08:50',false),
('jrkyushu:20260314:kyushu:つばめ313',6,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','08:59',true),
('jrkyushu:20260314:kyushu:つばめ315',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','08:51',false),
('jrkyushu:20260314:kyushu:つばめ315',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tosu','09:05',false),
('jrkyushu:20260314:kyushu:つばめ315',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','09:09',false),
('jrkyushu:20260314:kyushu:つばめ315',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Chikugo-Funagoya','09:17',false),
('jrkyushu:20260314:kyushu:つばめ315',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Omuta','09:23',false),
('jrkyushu:20260314:kyushu:つばめ315',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tamana','09:31',false),
('jrkyushu:20260314:kyushu:つばめ315',6,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','09:40',true),
('jrkyushu:20260314:kyushu:つばめ317',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','09:36',false),
('jrkyushu:20260314:kyushu:つばめ317',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tosu','09:49',false),
('jrkyushu:20260314:kyushu:つばめ317',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','09:54',false),
('jrkyushu:20260314:kyushu:つばめ317',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Chikugo-Funagoya','10:01',false),
('jrkyushu:20260314:kyushu:つばめ317',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Omuta','10:08',false),
('jrkyushu:20260314:kyushu:つばめ317',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tamana','10:15',false),
('jrkyushu:20260314:kyushu:つばめ317',6,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','10:24',true),
('jrkyushu:20260314:kyushu:つばめ319',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','10:47',false),
('jrkyushu:20260314:kyushu:つばめ319',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tosu','11:00',false),
('jrkyushu:20260314:kyushu:つばめ319',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','11:05',false),
('jrkyushu:20260314:kyushu:つばめ319',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Chikugo-Funagoya','11:12',false),
('jrkyushu:20260314:kyushu:つばめ319',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Omuta','11:19',false),
('jrkyushu:20260314:kyushu:つばめ319',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tamana','11:26',false),
('jrkyushu:20260314:kyushu:つばめ319',6,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','11:35',true),
('jrkyushu:20260314:kyushu:さくら403',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','08:40',false),
('jrkyushu:20260314:kyushu:さくら403',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tosu','08:53',false),
('jrkyushu:20260314:kyushu:さくら403',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','08:58',false),
('jrkyushu:20260314:kyushu:さくら403',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','09:19',false),
('jrkyushu:20260314:kyushu:さくら403',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Yatsushiro','09:31',false),
('jrkyushu:20260314:kyushu:さくら403',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Minamata','09:45',false),
('jrkyushu:20260314:kyushu:さくら403',6,'odpt.Station:JR-Kyushu.KyushuShinkansen.Izumi','09:52',false),
('jrkyushu:20260314:kyushu:さくら403',7,'odpt.Station:JR-Kyushu.KyushuShinkansen.Sendai','10:04',false),
('jrkyushu:20260314:kyushu:さくら403',8,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','10:16',true),
('jrkyushu:20260314:kyushu:さくら740',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','06:08',false),
('jrkyushu:20260314:kyushu:さくら740',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tamana','06:18',false),
('jrkyushu:20260314:kyushu:さくら740',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Omuta','06:26',false),
('jrkyushu:20260314:kyushu:さくら740',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Chikugo-Funagoya','06:32',false),
('jrkyushu:20260314:kyushu:さくら740',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','06:39',false),
('jrkyushu:20260314:kyushu:さくら740',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tosu','06:44',false),
('jrkyushu:20260314:kyushu:さくら740',6,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','06:59',true),
('jrkyushu:20260314:kyushu:つばめ300',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','06:30',false),
('jrkyushu:20260314:kyushu:つばめ300',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tamana','06:40',false),
('jrkyushu:20260314:kyushu:つばめ300',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Omuta','06:48',false),
('jrkyushu:20260314:kyushu:つばめ300',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Chikugo-Funagoya','06:54',false),
('jrkyushu:20260314:kyushu:つばめ300',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','07:02',false),
('jrkyushu:20260314:kyushu:つばめ300',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tosu','07:06',false),
('jrkyushu:20260314:kyushu:つばめ300',6,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','07:19',true),
('jrkyushu:20260314:kyushu:さくら400',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','06:04',false),
('jrkyushu:20260314:kyushu:さくら400',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Sendai','06:17',false),
('jrkyushu:20260314:kyushu:さくら400',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Izumi','06:29',false),
('jrkyushu:20260314:kyushu:さくら400',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Minamata','06:36',false),
('jrkyushu:20260314:kyushu:さくら400',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Yatsushiro','06:50',false),
('jrkyushu:20260314:kyushu:さくら400',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','07:02',false),
('jrkyushu:20260314:kyushu:さくら400',6,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','07:23',false),
('jrkyushu:20260314:kyushu:さくら400',7,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tosu','07:28',false),
('jrkyushu:20260314:kyushu:さくら400',8,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','07:41',true),
('jrkyushu:20260314:kyushu:つばめ302',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','07:07',false),
('jrkyushu:20260314:kyushu:つばめ302',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tamana','07:17',false),
('jrkyushu:20260314:kyushu:つばめ302',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Omuta','07:24',false),
('jrkyushu:20260314:kyushu:つばめ302',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Chikugo-Funagoya','07:35',false),
('jrkyushu:20260314:kyushu:つばめ302',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','07:44',false),
('jrkyushu:20260314:kyushu:つばめ302',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tosu','07:48',false),
('jrkyushu:20260314:kyushu:つばめ302',6,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','08:03',true),
('jrkyushu:20260314:kyushu:つばめ304',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','07:28',false),
('jrkyushu:20260314:kyushu:つばめ304',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tamana','07:38',false),
('jrkyushu:20260314:kyushu:つばめ304',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Omuta','07:46',false),
('jrkyushu:20260314:kyushu:つばめ304',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Chikugo-Funagoya','07:52',false),
('jrkyushu:20260314:kyushu:つばめ304',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','07:59',false),
('jrkyushu:20260314:kyushu:つばめ304',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tosu','08:04',false),
('jrkyushu:20260314:kyushu:つばめ304',6,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','08:18',true),
('jrkyushu:20260314:kyushu:さくら742',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','06:56',false),
('jrkyushu:20260314:kyushu:さくら742',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Sendai','07:08',false),
('jrkyushu:20260314:kyushu:さくら742',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','07:42',false),
('jrkyushu:20260314:kyushu:さくら742',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','08:04',false),
('jrkyushu:20260314:kyushu:さくら742',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tosu','08:09',false),
('jrkyushu:20260314:kyushu:さくら742',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','08:23',true),
('jrkyushu:20260314:kyushu:つばめ306',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','06:42',false),
('jrkyushu:20260314:kyushu:つばめ306',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Sendai','06:54',false),
('jrkyushu:20260314:kyushu:つばめ306',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Izumi','07:06',false),
('jrkyushu:20260314:kyushu:つばめ306',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Minamata','07:13',false),
('jrkyushu:20260314:kyushu:つばめ306',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Yatsushiro','07:27',false),
('jrkyushu:20260314:kyushu:つばめ306',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','07:45',false),
('jrkyushu:20260314:kyushu:つばめ306',6,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tamana','07:55',false),
('jrkyushu:20260314:kyushu:つばめ306',7,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Omuta','08:03',false),
('jrkyushu:20260314:kyushu:つばめ306',8,'odpt.Station:JR-Kyushu.KyushuShinkansen.Chikugo-Funagoya','08:09',false),
('jrkyushu:20260314:kyushu:つばめ306',9,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','08:16',false),
('jrkyushu:20260314:kyushu:つばめ306',10,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tosu','08:21',false),
('jrkyushu:20260314:kyushu:つばめ306',11,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','08:33',true),
('jrkyushu:20260314:kyushu:みずほ602',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','07:32',false),
('jrkyushu:20260314:kyushu:みずほ602',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','08:19',false),
('jrkyushu:20260314:kyushu:みずほ602',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','08:53',true),
('jrkyushu:20260314:kyushu:つばめ308',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','07:09',false),
('jrkyushu:20260314:kyushu:つばめ308',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Sendai','07:21',false),
('jrkyushu:20260314:kyushu:つばめ308',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Izumi','07:33',false),
('jrkyushu:20260314:kyushu:つばめ308',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Minamata','07:41',false),
('jrkyushu:20260314:kyushu:つばめ308',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Yatsushiro','07:55',false),
('jrkyushu:20260314:kyushu:つばめ308',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','08:06',false),
('jrkyushu:20260314:kyushu:つばめ308',6,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tamana','08:16',false),
('jrkyushu:20260314:kyushu:つばめ308',7,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Omuta','08:24',false),
('jrkyushu:20260314:kyushu:つばめ308',8,'odpt.Station:JR-Kyushu.KyushuShinkansen.Chikugo-Funagoya','08:36',false),
('jrkyushu:20260314:kyushu:つばめ308',9,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','08:44',false),
('jrkyushu:20260314:kyushu:つばめ308',10,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tosu','08:48',false),
('jrkyushu:20260314:kyushu:つばめ308',11,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','09:01',true),
('jrkyushu:20260314:kyushu:みずほ604',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','08:32',false),
('jrkyushu:20260314:kyushu:みずほ604',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','09:16',false),
('jrkyushu:20260314:kyushu:みずほ604',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','09:37',false),
('jrkyushu:20260314:kyushu:みずほ604',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','09:53',true),
('jrkyushu:20260314:kyushu:つばめ312',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','10:20',false),
('jrkyushu:20260314:kyushu:つばめ312',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tamana','10:30',false),
('jrkyushu:20260314:kyushu:つばめ312',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Omuta','10:38',false),
('jrkyushu:20260314:kyushu:つばめ312',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Chikugo-Funagoya','10:44',false),
('jrkyushu:20260314:kyushu:つばめ312',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','10:52',false),
('jrkyushu:20260314:kyushu:つばめ312',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tosu','10:56',false),
('jrkyushu:20260314:kyushu:つばめ312',6,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','11:09',true),
('jrkyushu:20260314:kyushu:みずほ606',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','10:32',false),
('jrkyushu:20260314:kyushu:みずほ606',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','11:16',false),
('jrkyushu:20260314:kyushu:みずほ606',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','11:37',false),
('jrkyushu:20260314:kyushu:みずほ606',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','11:53',true);
DO $$BEGIN
IF (SELECT count(*) FROM kyu_batch)<>23 OR
 EXISTS(SELECT 1 FROM kyu_batch b WHERE (SELECT count(*) FROM kyu_stops s WHERE s.key=b.key)<2)
THEN RAISE EXCEPTION 'Imported JR Kyushu timetable source count mismatch'; END IF;END$$;
-- Insert by source identity rather than by reserved numeric identity.
INSERT INTO public.manual_timetable_templates
(line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,destination_urns,source_path,source_trip_id)
SELECT 'KyushuShinkansen','odpt.Calendar:SaturdayHoliday',b.train_number,
 'odpt.Railway:JR-Kyushu.KyushuShinkansen','odpt.RailDirection:'||b.direction,
 'odpt.TrainType:JR-Kyushu.Shinkansen',
 ARRAY[(SELECT station FROM kyu_stops s WHERE s.key=b.key ORDER BY s.seq DESC LIMIT 1)],
 'official-sampled:holiday:https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf',b.key
FROM kyu_batch b
WHERE NOT EXISTS (SELECT 1 FROM public.manual_timetable_templates m WHERE m.source_trip_id=b.key AND m.calendar_urn='odpt.Calendar:SaturdayHoliday');
CREATE TEMP TABLE kyu_mapping ON COMMIT DROP AS SELECT b.key,m.id template_id FROM kyu_batch b
JOIN manual_timetable_templates m ON m.source_trip_id=b.key AND m.calendar_urn='odpt.Calendar:SaturdayHoliday' AND m.line_key='KyushuShinkansen';
DO $$BEGIN IF (SELECT count(*) FROM kyu_mapping)<>23 THEN RAISE EXCEPTION 'JR Kyushu mapping mismatch'; END IF;END$$;
INSERT INTO public.manual_timetable_template_stops
(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
SELECT m.template_id,s.seq,
 CASE WHEN s.is_last THEN s.station END,
 CASE WHEN NOT s.is_last THEN s.station END,
 CASE WHEN s.is_last THEN s.clock END,
 CASE WHEN NOT s.is_last THEN s.clock END
FROM kyu_mapping m JOIN kyu_stops s ON s.key=m.key
WHERE NOT EXISTS(SELECT 1 FROM manual_timetable_template_stops prior WHERE prior.template_id=m.template_id AND prior.stop_sequence=s.seq);
INSERT INTO public.train_timetables
(canonical_key,calendar_urn,primary_train_number,lead_source_template_id,group_evidence,timetable_validity)
SELECT 'source:'||m.template_id,'odpt.Calendar:SaturdayHoliday',t.train_number,m.template_id,'source_only','undated_not_current_verified'
FROM kyu_mapping m JOIN manual_timetable_templates t ON t.id=m.template_id
WHERE NOT EXISTS(SELECT 1 FROM train_timetables prev WHERE prev.lead_source_template_id=m.template_id);
INSERT INTO public.train_timetable_members
(source_template_id,timetable_id,segment_order,member_role,first_stop_sequence,last_stop_sequence,stop_offset,merge_first_stop)
SELECT m.template_id,canonical.id,0,'primary',0,(SELECT max(stop_sequence) FROM manual_timetable_template_stops s WHERE s.template_id=m.template_id),0,false
FROM kyu_mapping m JOIN train_timetables canonical ON canonical.lead_source_template_id=m.template_id
WHERE NOT EXISTS(SELECT 1 FROM train_timetable_members old WHERE old.source_template_id=m.template_id);
DO $$ BEGIN
IF EXISTS(SELECT 1 FROM kyu_mapping m
 WHERE (SELECT count(*) FROM manual_timetable_template_stops s WHERE s.template_id=m.template_id) <>
 (SELECT count(*) FROM kyu_stops s WHERE s.key=m.key)
 OR NOT EXISTS(SELECT 1 FROM train_timetable_members mm WHERE mm.source_template_id=m.template_id))
THEN RAISE EXCEPTION 'Incomplete JR Kyushu stop chain'; END IF; END$$;
-- Restore the nine official calling stations of SAKURA 401 on the holiday
-- plan ONLY. The older weekday source remains unchanged pending revision review.
CREATE TEMP TABLE official_fix401(key text,seq int,station text,clock text,is_last boolean) ON COMMIT DROP;
INSERT INTO official_fix401 VALUES
('fix401',0,'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata','07:58',false),
('fix401',1,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Tosu','08:12',false),
('fix401',2,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kurume','08:16',false),
('fix401',3,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kumamoto','08:37',false),
('fix401',4,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Yatsushiro','08:49',false),
('fix401',5,'odpt.Station:JR-Kyushu.KyushuShinkansen.Shin-Minamata','09:03',false),
('fix401',6,'odpt.Station:JR-Kyushu.KyushuShinkansen.Izumi','09:10',false),
('fix401',7,'odpt.Station:JR-Kyushu.KyushuShinkansen.Sendai','09:22',false),
('fix401',8,'odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo','09:34',true);
DO $$BEGIN IF (SELECT count(*) FROM official_fix401)<>9 OR
(SELECT count(*) FROM manual_timetable_templates WHERE id=128893 AND line_key='KyushuShinkansen'
 AND calendar_urn='odpt.Calendar:SaturdayHoliday' AND train_number='さくら401' AND source_trip_id='verified-holiday-from:652')<>1
THEN RAISE EXCEPTION 'Expected 401 template missing or changed';END IF;END$$;
DELETE FROM public.manual_timetable_template_stops WHERE template_id=128893;
INSERT INTO public.manual_timetable_template_stops
(template_id,stop_sequence,arrival_station_urn,departure_station_urn,arrival_clock,departure_clock)
SELECT 128893,s.seq,
 CASE WHEN s.is_last THEN s.station END,
 CASE WHEN NOT s.is_last THEN s.station END,
 CASE WHEN s.is_last THEN s.clock END,
 CASE WHEN NOT s.is_last THEN s.clock END
FROM official_fix401 s;
UPDATE public.manual_timetable_templates
SET source_path='official-sampled:holiday:https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf',
destination_urns=ARRAY['odpt.Station:JR-Kyushu.KyushuShinkansen.Kagoshima-Chuo']::text[]
WHERE id=128893;
UPDATE public.train_timetable_members
SET first_stop_sequence=0,last_stop_sequence=8
WHERE source_template_id=128893 AND member_role='primary';
WITH c AS (
SELECT line_key,count(*)::integer n,count(DISTINCT calendar_urn)::integer cal,
count(DISTINCT direction_urn)::integer dir,count(*) FILTER(WHERE source_path LIKE 'official-sampled:%')::integer sampled
FROM manual_timetable_templates WHERE line_key='KyushuShinkansen' GROUP BY 1)
UPDATE published_timetable_coverage_audit a SET template_count=c.n,calendar_count=c.cal,direction_count=c.dir,sampled_count=c.sampled,
issues=(SELECT array_agg(DISTINCT f ORDER BY f) FROM unnest(a.issues ||
 ARRAY['KYUSHU_2026_PUBLISHED_REGULAR_HOLIDAY_P1_VERIFIED','KYUSHU_SAKURA401_OLD_TIME_CORRECTED','HOLIDAY_TRAIN_BY_TRAIN_COVERAGE_INCOMPLETE']::text[]) f),
checked_at=now() FROM c WHERE c.line_key=a.line_key;
COMMIT;
