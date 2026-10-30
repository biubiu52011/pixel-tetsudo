-- 2026-10-30: independent railfan sources are useful for discovery, NOT
-- sufficient to identify a dated formation or validate an undated timetable.
-- Four Sonic services are additionally cross-checked to official JR Kyushu
-- railway numbers AND two clocks; all exact PNG / actual IDs stay null.

CREATE TABLE IF NOT EXISTS rail_audit.community_railway_evidence_registry (
  source_url text PRIMARY KEY,
  source_title text NOT NULL,
  operator_scope text NOT NULL,
  line_scope text NOT NULL,
  source_kind text NOT NULL CHECK (source_kind IN
    ('fan_operation_table','fan_fleet_inventory','fan_service_timetable')),
  reviewed_on date NOT NULL,
  source_revision_note text NOT NULL,
  validation_status text NOT NULL CHECK (validation_status IN
    ('DISCOVERY_ONLY','PARTIAL_OFFICIAL_CORROBORATION','SPECIFIC_CLAIM_CONTRADICTED')),
  limitations text NOT NULL,
  compared_official_url text,
  exact_vehicle_authorized boolean NOT NULL DEFAULT false CHECK (exact_vehicle_authorized = false)
);

INSERT INTO rail_audit.community_railway_evidence_registry
(source_url,source_title,operator_scope,line_scope,source_kind,
 reviewed_on,source_revision_note,validation_status,limitations,compared_official_url)
VALUES
('https://www.t-take.com/jrw/index.html','T-TAKE JR West Nara and Morinomiya operation tables',
 'JR-West','OsakaLoop / Nara / Yumesaki','fan_operation_table',
 DATE '2026-10-30','2026-03-14 schedule; Nara revised 2026-10-03; Morinomiya revised 2026-05-11',
 'DISCOVERY_ONLY',
 'Fan-made 2026 train duty diagrams, not proof of individual actual formations. Exact train number and date require separate validation. Site explicitly warns of corrections.',
 NULL),
('https://tetsudouunyou.wepage.com/jrtetsudounyou',
 'Railfan JR Kyushu fleet formations and operations inventory',
 'JR-Kyushu','Chikuhi / Nippo / KagoshimaMain','fan_fleet_inventory',
 DATE '2026-10-30','JR Kyushu section has 2026-07-14 snapshot; 103 series claim conflicts with October 2026 official notice',
 'SPECIFIC_CLAIM_CONTRADICTED',
 'The specific claim that Chikuhi 103 series retired in March is contradicted by JR Kyushu announcement 2026-10-14 (five formations and October-November use). Do not promote entire source as current fleet assignment.',
 'https://www.jrkyushu.co.jp/news/notice/'),
('https://207hd.com/post-45366/','Railway Press Sonic service and vehicle summary',
 'JR-Kyushu','KagoshimaMain / Nippo','fan_service_timetable',
 DATE '2026-10-30','Article shows a 2026 Sonic vehicle/number table but initial publication is 2025-03-16',
 'PARTIAL_OFFICIAL_CORROBORATION',
 'Only specific service numbers corroborated by JR Kyushu official timetable and official fleet-series matrix may become a verified reference; fan table itself is not an operational observation.',
 'https://www.jrkyushu.co.jp/english/train/sonic.html')
ON CONFLICT (source_url) DO NOTHING;

CREATE TABLE IF NOT EXISTS rail_audit.sonic_official_timetable_anchors (
  railway_line text NOT NULL CHECK (railway_line IN ('KagoshimaMain','Nippo')),
  original_run_number text NOT NULL,
  published_service_number integer NOT NULL CHECK (published_service_number > 0),
  planned_series text NOT NULL CHECK (planned_series IN ('JR九州883系','JR九州885系')),
  evidence_date date NOT NULL,
  official_train_url text NOT NULL CHECK (official_train_url LIKE 'https://www.jrkyushu-timetable.jp/%'),
  official_series_url text NOT NULL CHECK (official_series_url = 'https://www.jrkyushu.co.jp/english/train/sonic.html'),
  station_a text NOT NULL,
  station_a_kind text NOT NULL CHECK(station_a_kind IN ('arrival','departure')),
  clock_a text NOT NULL,
  station_b text NOT NULL,
  station_b_kind text NOT NULL CHECK(station_b_kind IN ('arrival','departure')),
  clock_b text NOT NULL,
  confidence_kind text NOT NULL DEFAULT 'OFFICIAL_2_STOP_CROSSCHECK',
  PRIMARY KEY(railway_line,original_run_number),
  CHECK (station_a <> station_b),
  CHECK (original_run_number ~ '^[0-9]+M$')
);

INSERT INTO rail_audit.sonic_official_timetable_anchors
(railway_line,original_run_number,published_service_number,planned_series,evidence_date,
official_train_url,official_series_url,station_a,station_a_kind,clock_a,
station_b,station_b_kind,clock_b)
VALUES
-- JR Kyushu 2026-10-17 Sonic 1, 3001M, 883 series; split rail corridor in legacy SQL.
('KagoshimaMain','3001M',1,'JR九州883系','2026-10-17',
 'https://www.jrkyushu-timetable.jp/sp/2610/0001/00013201.html?d=20261017&t=2815503e',
 'https://www.jrkyushu.co.jp/english/train/sonic.html',
 'Hakata','departure','06:21','Kokura','arrival','07:11'),
('Nippo','3001M',1,'JR九州883系','2026-10-17',
 'https://www.jrkyushu-timetable.jp/sp/2610/0001/00013201.html?d=20261017&t=2815503e',
 'https://www.jrkyushu.co.jp/english/train/sonic.html',
 'Kokura','departure','07:14','Beppu','arrival','08:33'),
-- JR Kyushu 2026-10-08 Sonic 5, 3005M, 885 series.
('KagoshimaMain','3005M',5,'JR九州885系','2026-10-08',
 'https://www.jrkyushu-timetable.jp/sp/2610/0001/00013601.html?d=20261008&t=2809800e',
 'https://www.jrkyushu.co.jp/english/train/sonic.html',
 'Hakata','departure','08:02','Kokura','arrival','08:56'),
('Nippo','3005M',5,'JR九州885系','2026-10-08',
 'https://www.jrkyushu-timetable.jp/sp/2610/0001/00013601.html?d=20261008&t=2809800e',
 'https://www.jrkyushu.co.jp/english/train/sonic.html',
 'Kokura','departure','08:58','Beppu','arrival','10:15'),
-- JR Kyushu 2026-10-29 Sonic 10, 3010M, 885 series.
('Nippo','3010M',10,'JR九州885系','2026-10-29',
 'https://www.jrkyushu-timetable.jp/sp/2611/0007/00070101.html?d=20261029&t=2880500e',
 'https://www.jrkyushu.co.jp/english/train/sonic.html',
 'Beppu','departure','07:55','Kokura','arrival','09:15'),
-- JR Kyushu 2026-10-17 Sonic 31, 3031M, 883 series.
('KagoshimaMain','3031M',31,'JR九州883系','2026-10-17',
 'https://www.jrkyushu-timetable.jp/sp/2610/0001/00015001.html?d=20261017&t=2815503e',
 'https://www.jrkyushu.co.jp/english/train/sonic.html',
 'Hakata','departure','14:20','Kokura','arrival','15:07'),
('Nippo','3031M',31,'JR九州883系','2026-10-17',
 'https://www.jrkyushu-timetable.jp/sp/2610/0001/00015001.html?d=20261017&t=2815503e',
 'https://www.jrkyushu.co.jp/english/train/sonic.html',
 'Kokura','departure','15:09','Beppu','arrival','16:27')
ON CONFLICT (railway_line,original_run_number) DO NOTHING;

CREATE OR REPLACE VIEW rail_audit.sonic_legacy_official_time_crosscheck
WITH (security_invoker = true) AS
SELECT t.id timetable_id,l.line_key,t.primary_train_number,t.calendar_urn,
 t.timetable_validity,
 'ソニック' || a.published_service_number::text || '号' AS official_service_name,
 a.original_run_number,a.planned_series AS official_series_plan,
 a.evidence_date,a.official_train_url,a.official_series_url,
 'TWO_STOPS_AND_RUN_NUMBER_MATCH_UNDATED'::text AS link_status,
 false AS actual_vehicle_confirmed,
 NULL::text AS actual_formation_id,
 NULL::text AS exact_png_path
FROM rail_audit.sonic_official_timetable_anchors a
JOIN public.train_timetable_lines l ON l.line_key=a.railway_line
JOIN public.train_timetables t ON t.id=l.timetable_id
WHERE t.timetable_validity='undated_not_current_verified'
 AND t.primary_train_number IN (
   (CASE a.railway_line WHEN 'KagoshimaMain' THEN 'Kag-' ELSE 'Nip-' END)
       || a.original_run_number || '-WD',
   (CASE a.railway_line WHEN 'KagoshimaMain' THEN 'Kag-' ELSE 'Nip-' END)
       || a.original_run_number || '-WE')
 AND EXISTS (
   SELECT 1 FROM public.train_timetable_stops s
   WHERE s.timetable_id=t.id AND s.station_urn=a.station_a
     AND (CASE a.station_a_kind WHEN 'departure' THEN s.departure_clock
              ELSE s.arrival_clock END)=a.clock_a)
 AND EXISTS (
   SELECT 1 FROM public.train_timetable_stops s
   WHERE s.timetable_id=t.id AND s.station_urn=a.station_b
     AND (CASE a.station_b_kind WHEN 'departure' THEN s.departure_clock
              ELSE s.arrival_clock END)=a.clock_b);

REVOKE ALL ON rail_audit.community_railway_evidence_registry,
 rail_audit.sonic_official_timetable_anchors,
 rail_audit.sonic_legacy_official_time_crosscheck
 FROM PUBLIC,anon,authenticated;