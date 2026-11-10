-- JR-Central ChuoCentral (Nagoya - Shiojiri): 40 physical station registry.
-- Source: repo canonical station order, Okuwa Village official station scope,
-- MapFan JR Okuwa / Nagoya station coordinates (independently cross-checked).
-- This is topology evidence ONLY, NOT 2026-11 train clock data.
BEGIN;
SELECT pg_advisory_xact_lock(2026111109);

DO $precheck$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.railway_lines
     WHERE id='ChuoCentral' AND timetable_operator='JR-Central'
       AND sql_planned_fallback_enabled AND NOT timetable_api_enabled
       AND NOT realtime_position_api_enabled)
  THEN RAISE EXCEPTION 'CHUOCENTRAL_ROUTE_CAPABILITIES_CHANGED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.stations WHERE id='Nagoya'
    AND ((latitude=35.1815 AND longitude=136.9066)
         OR (latitude=35.1706431 AND longitude=136.8816945)))
  THEN RAISE EXCEPTION 'NAGOYA_CANONICAL_COORDINATE_CONFLICT'; END IF;
  IF EXISTS (SELECT 1 FROM public.stations WHERE id='JRC-ChuoCentral-027'
    AND (latitude<>35.6843755 OR longitude<>137.6643629))
  THEN RAISE EXCEPTION 'JRC_OKUWA_COORDINATE_CONFLICT'; END IF;
END
$precheck$;

-- Do not overwrite Tobu's physical Okuwa; only JR-Central gets a scoped ID.
INSERT INTO public.stations(id,name,latitude,longitude)
VALUES ('JRC-ChuoCentral-027','大桑',35.6843755,137.6643629)
ON CONFLICT(id) DO NOTHING;

-- Nagoya is one shared physical JR station; correct the single authoritative row.
UPDATE public.stations SET latitude=35.1706431,longitude=136.8816945
WHERE id='Nagoya'
  AND latitude=35.1815 AND longitude=136.9066;

WITH expected(station_index,station_name,station_label) AS (VALUES
  (0, 'Nagoya', '名古屋'),
  (1, 'JRC-TokaidoCentral-067', '金山'),
  (2, 'JRC-ChuoCentral-003', '鶴舞'),
  (3, 'JRC-ChuoCentral-004', '千種'),
  (4, 'JRC-ChuoCentral-005', '大曽根'),
  (5, 'JRC-ChuoCentral-006', '新守山'),
  (6, 'JRC-ChuoCentral-007', '勝川'),
  (7, 'JRC-ChuoCentral-008', '春日井'),
  (8, 'JRC-ChuoCentral-009', '神領'),
  (9, 'JRC-ChuoCentral-010', '高蔵寺'),
  (10, 'JRC-ChuoCentral-011', '定光寺'),
  (11, 'JRC-ChuoCentral-012', '古虎渓'),
  (12, 'JRC-ChuoCentral-013', '多治見'),
  (13, 'JRC-ChuoCentral-014', '土岐市'),
  (14, 'JRC-ChuoCentral-015', '瑞浪'),
  (15, 'JRC-ChuoCentral-016', '釜戸'),
  (16, 'JRC-ChuoCentral-017', '武並'),
  (17, 'JRC-ChuoCentral-018', '恵那'),
  (18, 'JRC-ChuoCentral-019', '美乃坂本'),
  (19, 'JRC-ChuoCentral-020', '中津川'),
  (20, 'JRC-ChuoCentral-021', '落合川'),
  (21, 'JRC-ChuoCentral-022', '坂下'),
  (22, 'JRC-ChuoCentral-023', '田立'),
  (23, 'JRC-ChuoCentral-024', '南木曽'),
  (24, 'JRC-ChuoCentral-025', '十二兼'),
  (25, 'JRC-ChuoCentral-026', '野尻'),
  (26, 'JRC-ChuoCentral-027', '大桑'),
  (27, 'JRC-ChuoCentral-028', '須原'),
  (28, 'JRC-ChuoCentral-029', '倉本'),
  (29, 'JRC-ChuoCentral-030', '上松'),
  (30, 'JRC-ChuoCentral-031', '木曽福島'),
  (31, 'JRC-ChuoCentral-032', '原野'),
  (32, 'JRC-ChuoCentral-033', '宮ノ越'),
  (33, 'JRC-ChuoCentral-034', '藪原'),
  (34, 'JRC-ChuoCentral-035', '奈良井'),
  (35, 'JRC-ChuoCentral-036', '木曽平沢'),
  (36, 'JRC-ChuoCentral-037', '贄川'),
  (37, 'JRC-ChuoCentral-038', '日出塩'),
  (38, 'JRC-ChuoCentral-039', '洗馬'),
  (39, 'Shiojiri', '塩尻')
)
INSERT INTO public.line_stations(line_id,station_index,station_name)
SELECT 'ChuoCentral',e.station_index,e.station_name
FROM expected e
WHERE NOT EXISTS (SELECT 1 FROM public.line_stations existing
 WHERE existing.line_id='ChuoCentral' AND existing.station_index=e.station_index);

DO $verify$
DECLARE
  v_expected jsonb := jsonb_build_array(
    jsonb_build_array(0,'Nagoya'),
    jsonb_build_array(1,'JRC-TokaidoCentral-067'),
    jsonb_build_array(2,'JRC-ChuoCentral-003'),
    jsonb_build_array(3,'JRC-ChuoCentral-004'),
    jsonb_build_array(4,'JRC-ChuoCentral-005'),
    jsonb_build_array(5,'JRC-ChuoCentral-006'),
    jsonb_build_array(6,'JRC-ChuoCentral-007'),
    jsonb_build_array(7,'JRC-ChuoCentral-008'),
    jsonb_build_array(8,'JRC-ChuoCentral-009'),
    jsonb_build_array(9,'JRC-ChuoCentral-010'),
    jsonb_build_array(10,'JRC-ChuoCentral-011'),
    jsonb_build_array(11,'JRC-ChuoCentral-012'),
    jsonb_build_array(12,'JRC-ChuoCentral-013'),
    jsonb_build_array(13,'JRC-ChuoCentral-014'),
    jsonb_build_array(14,'JRC-ChuoCentral-015'),
    jsonb_build_array(15,'JRC-ChuoCentral-016'),
    jsonb_build_array(16,'JRC-ChuoCentral-017'),
    jsonb_build_array(17,'JRC-ChuoCentral-018'),
    jsonb_build_array(18,'JRC-ChuoCentral-019'),
    jsonb_build_array(19,'JRC-ChuoCentral-020'),
    jsonb_build_array(20,'JRC-ChuoCentral-021'),
    jsonb_build_array(21,'JRC-ChuoCentral-022'),
    jsonb_build_array(22,'JRC-ChuoCentral-023'),
    jsonb_build_array(23,'JRC-ChuoCentral-024'),
    jsonb_build_array(24,'JRC-ChuoCentral-025'),
    jsonb_build_array(25,'JRC-ChuoCentral-026'),
    jsonb_build_array(26,'JRC-ChuoCentral-027'),
    jsonb_build_array(27,'JRC-ChuoCentral-028'),
    jsonb_build_array(28,'JRC-ChuoCentral-029'),
    jsonb_build_array(29,'JRC-ChuoCentral-030'),
    jsonb_build_array(30,'JRC-ChuoCentral-031'),
    jsonb_build_array(31,'JRC-ChuoCentral-032'),
    jsonb_build_array(32,'JRC-ChuoCentral-033'),
    jsonb_build_array(33,'JRC-ChuoCentral-034'),
    jsonb_build_array(34,'JRC-ChuoCentral-035'),
    jsonb_build_array(35,'JRC-ChuoCentral-036'),
    jsonb_build_array(36,'JRC-ChuoCentral-037'),
    jsonb_build_array(37,'JRC-ChuoCentral-038'),
    jsonb_build_array(38,'JRC-ChuoCentral-039'),
    jsonb_build_array(39,'Shiojiri')
  );
  v_actual jsonb;
BEGIN
  SELECT jsonb_agg(jsonb_build_array(station_index,station_name)
                   ORDER BY station_index)
    INTO v_actual FROM public.line_stations WHERE line_id='ChuoCentral';
  IF v_actual IS DISTINCT FROM v_expected
  THEN RAISE EXCEPTION 'CHUOCENTRAL_CANONICAL_40_STATION_REGISTRY_MISMATCH'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.stations
       WHERE id='Okuwa' AND latitude=36.76082 AND longitude=139.71358)
  THEN RAISE EXCEPTION 'TOBU_OKUWA_MUST_REMAIN_UNCHANGED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.stations
       WHERE id='JRC-ChuoCentral-027'
         AND latitude=35.6843755 AND longitude=137.6643629)
  THEN RAISE EXCEPTION 'JR_OKUWA_MUST_BE_SCOPED'; END IF;
END
$verify$;

-- Remove outdated station-registry defect only; no timetable-plan acceptance.
UPDATE public.published_timetable_coverage_audit
 SET issues=array_remove(issues,'NO_STATION_REGISTRY'),checked_at=now()
 WHERE line_key='ChuoCentral';
UPDATE public.published_timetable_coverage_audit
 SET issues=array_remove(issues,'NO_STATION_REGISTRY'),checked_at=now()
 WHERE line_key='TokaidoCentral' AND
   (SELECT count(*) FROM public.line_stations WHERE line_id='TokaidoCentral')=84;

INSERT INTO public.line_data_inventory
 (line_key,source_path,data_kind,migration_status,notes)
SELECT 'ChuoCentral',
 'https://traininfo.jr-central.co.jp/zairaisen/data/kobetsujikoku.json',
 'official_date_scoped_snapshot_not_full_timetable','discovered',
 '2026-11-11: JR Central 2026-10-20 evidence registration is NOT a November full-day schedule. 40 source-verified canonical stations are now SQL-registered. No train numbers, scheduled stop clocks or fleet proof have been imported.'
WHERE NOT EXISTS (SELECT 1 FROM public.line_data_inventory WHERE line_key='ChuoCentral');

COMMIT;